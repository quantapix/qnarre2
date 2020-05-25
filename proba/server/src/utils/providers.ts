import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import * as qu from '.';
import { ServiceConfig } from './configs';
import * as qx from './extras';

export class LogDirectory {
  constructor(private readonly ctx: vscode.ExtensionContext) {}

  newDirectory(): string | undefined {
    const root = this.directory();
    if (root) {
      try {
        return fs.mkdtempSync(path.join(root, `tsserver-log-`));
      } catch (e) {}
    }
    return;
  }

  @qu.memoize
  private directory(): string | undefined {
    try {
      const p = this.ctx.logPath;
      if (!fs.existsSync(p)) fs.mkdirSync(p);
      return this.ctx.logPath;
    } catch {}
    return;
  }
}

export class PluginPaths {
  constructor(private cfg: ServiceConfig) {}

  updateConfig(c: ServiceConfig) {
    this.cfg = c;
  }

  pluginPaths() {
    const ps: string[] = [];
    for (const p of this.cfg[`${n}PluginPaths`]) {
      ps.push(...this.resolvePath(p));
    }
    return ps;
  }

  private resolvePath(p: string) {
    if (path.isAbsolute(p)) return [p];
    const w = qx.PathResolver.asWorkspacePath(p);
    if (w !== undefined) return [w];
    return (vscode.workspace.workspaceFolders || []).map((f) =>
      path.join(f.uri.fsPath, p)
    );
  }
}

export interface Config {
  readonly uri: vscode.Uri;
  readonly fsPath: string;
  readonly posix: string;
  readonly folder?: vscode.WorkspaceFolder;
}

export class TsConfig {
  async configsForWorkspace(): Promise<Iterable<Config>> {
    if (!vscode.workspace.workspaceFolders) return [];
    const cs = new Map<string, Config>();
    for (const c of await vscode.workspace.findFiles(
      '**/tscfg*.json',
      '**/{node_modules,.*}/**'
    )) {
      const r = vscode.workspace.getWorkspaceFolder(c);
      if (r) {
        cs.set(c.fsPath, {
          uri: c,
          fsPath: c.fsPath,
          posix: c.path,
          folder: r,
        });
      }
    }
    return cs.values();
  }
}
