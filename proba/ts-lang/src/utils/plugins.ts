import * as vscode from 'vscode';
import * as qu from './misc';

export interface TSServerPlugin {
  readonly path: string;
  readonly name: string;
  readonly enableForWorkspaceTypeScriptVersions: boolean;
  readonly languages: ReadonlyArray<string>;
  readonly configNamespace?: string;
}

namespace TSServerPlugin {
  export function equals(a: TSServerPlugin, b: TSServerPlugin) {
    return (
      a.path === b.path &&
      a.name === b.name &&
      a.enableForWorkspaceTypeScriptVersions === b.enableForWorkspaceTypeScriptVersions &&
      qu.equals(a.languages, b.languages)
    );
  }
}

export class PluginManager extends qu.Disposable {
  private readonly _configs = new Map<string, {}>();
  private _plugins?: Map<string, ReadonlyArray<TSServerPlugin>>;

  constructor() {
    super();
    vscode.extensions.onDidChange(
      () => {
        if (!this._plugins) return;
        const ps = this.readPlugins();
        if (
          !qu.equals(
            qu.flatten(Array.from(this._plugins.values())),
            qu.flatten(Array.from(ps.values())),
            TSServerPlugin.equals
          )
        ) {
          this._plugins = ps;
          this._onDidUpdatePlugins.fire(this);
        }
      },
      undefined,
      this._disposables
    );
  }

  public get plugins(): ReadonlyArray<TSServerPlugin> {
    if (!this._plugins) this._plugins = this.readPlugins();
    return qu.flatten(Array.from(this._plugins.values()));
  }

  private readonly _onDidUpdatePlugins = this._register(new vscode.EventEmitter<this>());
  public readonly onDidChangePlugins = this._onDidUpdatePlugins.event;

  private readonly _onDidUpdateConfig = this._register(
    new vscode.EventEmitter<{ pluginId: string; config: {} }>()
  );
  public readonly onDidUpdateConfig = this._onDidUpdateConfig.event;

  public setConfiguration(pluginId: string, config: {}) {
    this._configs.set(pluginId, config);
    this._onDidUpdateConfig.fire({ pluginId, config });
  }

  public configurations() {
    return this._configs.entries();
  }

  private readPlugins() {
    const m = new Map<string, ReadonlyArray<TSServerPlugin>>();
    for (const e of vscode.extensions.all) {
      const j = e.packageJSON;
      if (j.contributes && Array.isArray(j.contributes.typescriptServerPlugins)) {
        const ps: TSServerPlugin[] = [];
        for (const p of j.contributes.typescriptServerPlugins) {
          ps.push({
            name: p.name,
            enableForWorkspaceTypeScriptVersions: !!p.enableForWorkspaceTypeScriptVersions,
            path: e.extensionPath,
            languages: Array.isArray(p.languages) ? p.languages : [],
            configNamespace: p.configNamespace,
          });
        }
        if (ps.length) m.set(e.id, ps);
      }
    }
    return m;
  }
}
