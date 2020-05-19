import * as vscode from 'vscode';
import * as arrays from './arrays';
import { Disposable } from './dispose';

export interface Plugin {
  readonly path: string;
  readonly name: string;
  readonly enableForVersions: boolean;
  readonly languages: ReadonlyArray<string>;
  readonly configNamespace?: string;
}

namespace Plugin {
  export function equals(a: Plugin, b: Plugin) {
    return (
      a.path === b.path &&
      a.name === b.name &&
      a.enableForVersions === b.enableForVersions &&
      arrays.equals(a.languages, b.languages)
    );
  }
}

export class Plugins extends Disposable {
  private readonly configs = new Map<string, {}>();
  private plugs?: Map<string, ReadonlyArray<Plugin>>;

  constructor(private name: string) {
    super();
    vscode.extensions.onDidChange(
      () => {
        if (!this.plugs) return;
        const ps = this.readPlugins();
        if (
          !arrays.equals(
            arrays.flatten(Array.from(this.plugs.values())),
            arrays.flatten(Array.from(ps.values())),
            Plugin.equals
          )
        ) {
          this.plugs = ps;
          this._onDidUpdatePlugins.fire(this);
        }
      },
      undefined,
      this.disps
    );
  }

  public configurations() {
    return this.configs.entries();
  }

  public setConfiguration(pluginId: string, config: {}) {
    this.configs.set(pluginId, config);
    this._onDidUpdateConfig.fire({ pluginId, config });
  }

  public get plugins(): ReadonlyArray<Plugin> {
    if (!this.plugs) this.plugs = this.readPlugins();
    return arrays.flatten(Array.from(this.plugs.values()));
  }

  private readonly _onDidUpdatePlugins = this.register(new vscode.EventEmitter<this>());
  public readonly onDidChangePlugins = this._onDidUpdatePlugins.event;

  private readonly _onDidUpdateConfig = this.register(
    new vscode.EventEmitter<{ pluginId: string; config: {} }>()
  );
  public readonly onDidUpdateConfig = this._onDidUpdateConfig.event;

  private readPlugins() {
    const n = this.name;
    const plugs = new Map<string, ReadonlyArray<Plugin>>();
    for (const e of vscode.extensions.all) {
      const j = e.packageJSON;
      if (j.contributes && Array.isArray(j.contributes[`{n}Plugins`])) {
        const ps: Plugin[] = [];
        for (const p of j.contributes[`{n}Plugins`]) {
          ps.push({
            name: p.name,
            enableForVersions: !!p.enableForVersions,
            path: e.extensionPath,
            languages: Array.isArray(p.languages) ? p.languages : [],
            configNamespace: p.configNamespace,
          });
        }
        if (ps.length) plugs.set(e.id, ps);
      }
    }
    return plugs;
  }
}
