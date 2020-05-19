/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Api, getExtensionApi } from './api';
import { registerCommands } from './commands';
import { LanguageConfigurationManager } from './features/languageConfiguration';
import TypeScriptServiceClientHost from './clientHost';
import { flatten } from './utils/arrays';
import * as electron from './utils/electron';
import * as rimraf from 'rimraf';
import { Commands } from './utils/extras';
import * as fileSchemes from './utils/fileSchemes';
import { standardLanguageDescriptions } from './utils/language';
import { lazy, Lazy } from './utils/lazy';
import LogDirectory from './utils/providers';
import ManagedFileContextManager from './utils/managedFileContext';
import { Plugins } from './utils/plugin';
import * as ProjectStatus from './utils/largeProjectStatus';
import TscTaskProvider from './features/task';

export function activate(context: vscode.ExtensionContext): Api {
  const pluginManager = new Plugins();
  context.subscriptions.push(pluginManager);

  const commandManager = new Commands();
  context.subscriptions.push(commandManager);

  const onCompletionAccepted = new vscode.EventEmitter<vscode.CompletionItem>();
  context.subscriptions.push(onCompletionAccepted);

  const lazyClientHost = createLazyClientHost(
    context,
    pluginManager,
    commandManager,
    (item) => {
      onCompletionAccepted.fire(item);
    }
  );

  registerCommands(commandManager, lazyClientHost, pluginManager);
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      'typescript',
      new TscTaskProvider(lazyClientHost.map((x) => x.serviceClient))
    )
  );
  context.subscriptions.push(new LanguageConfigurationManager());

  import('./features/tsconfig').then((module) => {
    context.subscriptions.push(module.register());
  });

  context.subscriptions.push(lazilyActivateClient(lazyClientHost, pluginManager));

  return getExtensionApi(onCompletionAccepted.event, pluginManager);
}

function createLazyClientHost(
  context: vscode.ExtensionContext,
  pluginManager: Plugins,
  commandManager: Commands,
  onCompletionAccepted: (item: vscode.CompletionItem) => void
): Lazy<TypeScriptServiceClientHost> {
  return lazy(() => {
    const logDirectoryProvider = new LogDirectory(context);

    const clientHost = new TypeScriptServiceClientHost(
      standardLanguageDescriptions,
      context.workspaceState,
      pluginManager,
      commandManager,
      logDirectoryProvider,
      onCompletionAccepted
    );

    context.subscriptions.push(clientHost);

    clientHost.serviceClient.onReady(() => {
      context.subscriptions.push(
        ProjectStatus.create(
          clientHost.serviceClient,
          clientHost.serviceClient.telemetryReporter
        )
      );
    });

    return clientHost;
  });
}

function lazilyActivateClient(
  lazyClientHost: Lazy<TypeScriptServiceClientHost>,
  pluginManager: Plugins
) {
  const disposables: vscode.Disposable[] = [];

  const supportedLanguage = flatten([
    ...standardLanguageDescriptions.map((x) => x.modeIds),
    ...pluginManager.plugins.map((x) => x.languages),
  ]);

  let hasActivated = false;
  const maybeActivate = (textDocument: vscode.TextDocument): boolean => {
    if (!hasActivated && isSupportedDocument(supportedLanguage, textDocument)) {
      hasActivated = true;
      // Force activation
      void lazyClientHost.value;

      disposables.push(
        new ManagedFileContextManager((resource) => {
          return lazyClientHost.value.serviceClient.toPath(resource);
        })
      );
      return true;
    }
    return false;
  };

  const didActivate = vscode.workspace.textDocuments.some(maybeActivate);
  if (!didActivate) {
    const openListener = vscode.workspace.onDidOpenTextDocument(
      (doc) => {
        if (maybeActivate(doc)) {
          openListener.dispose();
        }
      },
      undefined,
      disposables
    );
  }

  return vscode.Disposable.from(...disposables);
}

function isSupportedDocument(
  supportedLanguage: string[],
  document: vscode.TextDocument
): boolean {
  if (!supportedLanguage.includes(document.languageId)) {
    return false;
  }
  return fileSchemes.isSupportedScheme(document.uri.scheme);
}

export function deactivate() {
  rimraf.sync(electron.getInstanceDir());
}
