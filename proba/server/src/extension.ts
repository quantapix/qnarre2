import * as vsc from 'vscode';
import * as rimraf from 'rimraf';

import { Api, getExtensionApi } from './api';
import { registerCommands } from './commands';
import { Languages } from './providers/languages';
import { ServiceClientHost } from './clientHost';
import * as qu from './utils';
import * as ql from './utils/language';
import * as qx from './utils/extras';
import { LogDirectory } from './utils/providers';
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
  context.subscriptions.push(new Languages());
  import('./providers/tsconfig').then((m) => {
    context.subscriptions.push(m.register());
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
      ql.stdLanguages,
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
    ...ql.stdLanguages.map((x) => x.modes),
    ...plugins.all.map((x) => x.languages),
  ]);

  let hasActivated = false;
  const maybeActivate = (d: vsc.TextDocument): boolean => {
    if (!hasActivated && isSupportedDocument(supportedLanguage, d)) {
      hasActivated = true;
      void lazyClientHost.value;
      disposables.push(
        new ql.ManagedFileContextManager((r) => {
          return lazyClientHost.value.serviceClient.toPath(r);
        })
      );
      return true;
    }
    return false;
  };
  const didActivate = vsc.workspace.textDocuments.some(maybeActivate);
  if (!didActivate) {
    const open = vsc.workspace.onDidOpenTextDocument(
      (d) => {
        if (maybeActivate(d)) open.dispose();
      },
      undefined,
      disposables
    );
  }
  return vsc.Disposable.from(...disposables);
}

function isSupportedDocument(l: string[], d: vsc.TextDocument) {
  if (!l.includes(d.languageId)) return false;
  return qx.isSupportedScheme(d.uri.scheme);
}

export function deactivate() {
  rimraf.sync(qu.instanceDir());
}
