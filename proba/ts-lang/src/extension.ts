import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { LanguageConfigurationManager } from './features/languageConfiguration';
import TypeScriptServiceClientHost from './typeScriptServiceClientHost';
import { flatten } from './utils/misc';
import * as electron from './utils/electron';
import * as rimraf from 'rimraf';
import { CommandManager } from './utils/misc';
import * as fileSchemes from './utils/misc';
import { standardLanguageDescriptions } from './utils/misc';
import { lazy, Lazy } from './utils/misc';
import LogDirectoryProvider from './utils/logDirectoryProvider';
import ManagedFileContextManager from './utils/misc';
import { PluginManager } from './utils/plugins';
import * as ProjectStatus from './utils/largeProjectStatus';
import TscTaskProvider from './features/task';

class ApiV0 {
  public constructor(
    public readonly onCompletionAccepted: vscode.Event<
      vscode.CompletionItem & { metadata?: any }
    >,
    private readonly _pluginManager: PluginManager
  ) {}

  configurePlugin(pluginId: string, configuration: {}): void {
    this._pluginManager.setConfiguration(pluginId, configuration);
  }
}

export interface Api {
  getAPI(version: 0): ApiV0 | undefined;
}

export function getExtensionApi(
  onCompletionAccepted: vscode.Event<vscode.CompletionItem>,
  pluginManager: PluginManager
): Api {
  return {
    getAPI(version) {
      if (version === 0) {
        return new ApiV0(onCompletionAccepted, pluginManager);
      }
      return undefined;
    },
  };
}

export function activate(context: vscode.ExtensionContext): Api {
  const pluginManager = new PluginManager();
  context.subscriptions.push(pluginManager);

  const commandManager = new CommandManager();
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
  pluginManager: PluginManager,
  commandManager: CommandManager,
  onCompletionAccepted: (item: vscode.CompletionItem) => void
): Lazy<TypeScriptServiceClientHost> {
  return lazy(() => {
    const logDirectoryProvider = new LogDirectoryProvider(context);

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
  pluginManager: PluginManager
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
