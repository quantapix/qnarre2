import * as vsc from 'vscode';

import { Api, getExtensionApi } from './api';
import { registerCommands } from './commands';
import { LanguageConfigurationManager } from './providers/languageConfiguration';
import { ServiceClientHost } from './clientHost';
import * as qu from './utils';
import * as electron from './utils/electron';
import * as rimraf from 'rimraf';
import { standardLangDescs } from './utils/language';
import * as qx from './utils/extras';
import { LogDirectory } from './utils/providers';
import { ManagedFileContextManager } from './utils/managedFileContext';
import { Plugins } from './utils/plugin';
import { ProjectStatus } from './utils/largeProjectStatus';
import { Task } from './providers/task';

export function activate(context: vsc.ExtensionContext): Api {
  const plugins = new Plugins();
  context.subscriptions.push(plugins);

  const commandManager = new qx.Commands();
  context.subscriptions.push(commandManager);

  const onCompletionAccepted = new vsc.EventEmitter<vsc.CompletionItem>();
  context.subscriptions.push(onCompletionAccepted);

  const lazyClientHost = createLazyClientHost(
    context,
    plugins,
    commandManager,
    (item) => {
      onCompletionAccepted.fire(item);
    }
  );

  registerCommands(commandManager, lazyClientHost, plugins);
  context.subscriptions.push(
    vsc.tasks.registerTaskProvider(
      'typescript',
      new Task(lazyClientHost.map((x) => x.serviceClient))
    )
  );
  context.subscriptions.push(new LanguageConfigurationManager());

  import('./providers/tsconfig').then((module) => {
    context.subscriptions.push(module.register());
  });

  context.subscriptions.push(lazilyActivateClient(lazyClientHost, plugins));

  return getExtensionApi(onCompletionAccepted.event, plugins);
}

function createLazyClientHost(
  context: vsc.ExtensionContext,
  plugins: Plugins,
  commandManager: qx.Commands,
  onCompletionAccepted: (item: vsc.CompletionItem) => void
): qx.Lazy<ServiceClientHost> {
  return qx.lazy(() => {
    const logDirectoryProvider = new LogDirectory(context);
    const clientHost = new ServiceClientHost(
      standardLangDescs,
      context.workspaceState,
      plugins,
      commandManager,
      logDirectoryProvider,
      onCompletionAccepted
    );
    context.subscriptions.push(clientHost);
    clientHost.serviceClient.onReady(() => {
      context.subscriptions.push(
        ProjectStatus.create(clientHost.serviceClient, clientHost.serviceClient.telemetry)
      );
    });
    return clientHost;
  });
}

function lazilyActivateClient(
  lazyClientHost: qx.Lazy<ServiceClientHost>,
  plugins: Plugins
) {
  const disposables: vsc.Disposable[] = [];

  const supportedLanguage = qu.flatten([
    ...standardLangDescs.map((x) => x.modes),
    ...plugins.all.map((x) => x.languages),
  ]);

  let hasActivated = false;
  const maybeActivate = (textDocument: vsc.TextDocument): boolean => {
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

  const didActivate = vsc.workspace.textDocuments.some(maybeActivate);
  if (!didActivate) {
    const openListener = vsc.workspace.onDidOpenTextDocument(
      (doc) => {
        if (maybeActivate(doc)) {
          openListener.dispose();
        }
      },
      undefined,
      disposables
    );
  }

  return vsc.Disposable.from(...disposables);
}

function isSupportedDocument(
  supportedLanguage: string[],
  document: vsc.TextDocument
): boolean {
  if (!supportedLanguage.includes(document.languageId)) {
    return false;
  }
  return qx.isSupportedScheme(document.uri.scheme);
}

export function deactivate() {
  rimraf.sync(electron.getInstanceDir());
}
