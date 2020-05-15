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
    private readonly _m: PluginManager
  ) {}

  configurePlugin(id: string, c: {}) {
    this._m.setConfiguration(id, c);
  }
}

export interface Api {
  getAPI(version: 0): ApiV0 | undefined;
}

export function getExtensionApi(
  e: vscode.Event<vscode.CompletionItem>,
  m: PluginManager
): Api {
  return {
    getAPI(version) {
      if (version === 0) return new ApiV0(e, m);
      return;
    },
  };
}

export function activate(ctx: vscode.ExtensionContext) {
  const pm = new PluginManager();
  ctx.subscriptions.push(pm);
  const cm = new CommandManager();
  ctx.subscriptions.push(cm);
  const emitter = new vscode.EventEmitter<vscode.CompletionItem>();
  ctx.subscriptions.push(emitter);
  const h = createHost(ctx, pm, cm, (item) => {
    emitter.fire(item);
  });
  registerCommands(cm, h, pm);
  ctx.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      'typescript',
      new TscTaskProvider(h.map((x) => x.serviceClient))
    )
  );
  ctx.subscriptions.push(new LanguageConfigurationManager());
  import('./features/tsconfig').then((m) => {
    ctx.subscriptions.push(m.register());
  });
  ctx.subscriptions.push(lazilyActivate(h, pm));
  return getExtensionApi(emitter.event, pm);
}

function createHost(
  ctx: vscode.ExtensionContext,
  pm: PluginManager,
  cm: CommandManager,
  emit: (_: vscode.CompletionItem) => void
) {
  return lazy(() => {
    const p = new LogDirectoryProvider(ctx);
    const h = new TypeScriptServiceClientHost(
      standardLanguageDescriptions,
      ctx.workspaceState,
      pm,
      cm,
      p,
      emit
    );
    ctx.subscriptions.push(h);
    h.serviceClient.onReady(() => {
      ctx.subscriptions.push(
        ProjectStatus.create(h.serviceClient, h.serviceClient.telemetryReporter)
      );
    });
    return h;
  });
}

function lazilyActivate(h: Lazy<TypeScriptServiceClientHost>, m: PluginManager) {
  const ds: vscode.Disposable[] = [];
  const l = flatten([
    ...standardLanguageDescriptions.map((x) => x.modeIds),
    ...m.plugins.map((x) => x.languages),
  ]);
  let done = false;
  const activate = (d: vscode.TextDocument): boolean => {
    if (!done && isSupported(l, d)) {
      done = true;
      void h.value;
      ds.push(
        new ManagedFileContextManager((r) => {
          return h.value.serviceClient.toPath(r);
        })
      );
      return true;
    }
    return false;
  };
  const didActivate = vscode.workspace.textDocuments.some(activate);
  if (!didActivate) {
    const openListener = vscode.workspace.onDidOpenTextDocument(
      (d) => {
        if (activate(d)) openListener.dispose();
      },
      undefined,
      ds
    );
  }
  return vscode.Disposable.from(...ds);
}

function isSupported(ls: string[], d: vscode.TextDocument) {
  if (!ls.includes(d.languageId)) return false;
  return fileSchemes.isSupportedScheme(d.uri.scheme);
}

export function deactivate() {
  rimraf.sync(electron.getInstanceDir());
}
