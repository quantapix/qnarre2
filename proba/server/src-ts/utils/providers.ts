import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { memoize } from '.';
import { ServiceConfig } from './configuration';
import { PathResolver } from './extras';

export const file = 'file';
export const untitled = 'untitled';
export const git = 'git';
export const walkThroughSnippet = 'walkThroughSnippet';

export const supportedSchemes = [file, untitled, walkThroughSnippet];

export function isSupportedScheme(s: string) {
  return supportedSchemes.includes(s);
}

export class LogDirectory {
  public constructor(private readonly context: vscode.ExtensionContext) {}

  public getNewLogDirectory(): string | undefined {
    const root = this.logDirectory();
    if (root) {
      try {
        return fs.mkdtempSync(path.join(root, `tsserver-log-`));
      } catch (e) {}
    }
    return;
  }

  @memoize
  private logDirectory(): string | undefined {
    try {
      const p = this.context.logPath;
      if (!fs.existsSync(p)) fs.mkdirSync(p);
      return this.context.logPath;
    } catch {}
    return undefined;
  }
}

export class PluginPaths {
  public constructor(private config: ServiceConfig) {}

  public updateConfiguration(c: ServiceConfig) {
    this.config = c;
  }

  public getPluginPaths() {
    const ps: string[] = [];
    for (const p of this.config[`${n}PluginPaths`]) {
      ps.push(...this.resolvePluginPath(p));
    }
    return ps;
  }

  private resolvePluginPath(p: string) {
    if (path.isAbsolute(p)) return [p];
    const w = PathResolver.asWorkspacePath(p);
    if (w !== undefined) return [w];
    return (vscode.workspace.workspaceFolders || []).map((f) =>
      path.join(f.uri.fsPath, p)
    );
  }
}

export interface TSConfig {
  readonly uri: vscode.Uri;
  readonly fsPath: string;
  readonly posixPath: string;
  readonly workspaceFolder?: vscode.WorkspaceFolder;
}

export class TsConfig {
  public async getConfigsForWorkspace(): Promise<Iterable<TSConfig>> {
    if (!vscode.workspace.workspaceFolders) return [];
    const cs = new Map<string, TSConfig>();
    for (const c of await vscode.workspace.findFiles(
      '**/tsconfig*.json',
      '**/{node_modules,.*}/**'
    )) {
      const r = vscode.workspace.getWorkspaceFolder(c);
      if (r) {
        cs.set(c.fsPath, {
          uri: c,
          fsPath: c.fsPath,
          posixPath: c.path,
          workspaceFolder: r,
        });
      }
    }
    return cs.values();
  }
}
