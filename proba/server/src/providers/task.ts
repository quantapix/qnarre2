import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { IServiceClient, ServerResponse } from '../service';
import { isTsConfigName } from '../utils/language';
import { Lazy } from '../utils/extras';
import { isImplicitConfig } from '../utils/tsconfig';
import { Config, TsConfig } from '../utils/providers';

const localize = nls.loadMessageBundle();

type AutoDetect = 'on' | 'off' | 'build' | 'watch';

const exists = async (r: vscode.Uri): Promise<boolean> => {
  try {
    const s = await vscode.workspace.fs.stat(r);
    return !!(s.type & vscode.FileType.File);
  } catch {
    return false;
  }
};

interface TaskDef extends vscode.TaskDefinition {
  tsconfig: string;
  option?: string;
}

export class Task implements vscode.TaskProvider {
  private readonly timeout = 2000;
  private autoDetect: AutoDetect = 'on';
  private readonly tsconfig = new TsConfig();
  private readonly dispos: vscode.Disposable[] = [];

  constructor(private readonly client: Lazy<IServiceClient>) {
    vscode.workspace.onDidChangeConfiguration(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      this.onConfigurationChanged,
      this,
      this.dispos
    );
    this.onConfigurationChanged();
  }

  dispose() {
    this.dispos.forEach((x) => x.dispose());
  }

  async provideTasks(ct: vscode.CancellationToken): Promise<vscode.Task[]> {
    const fs = vscode.workspace.workspaceFolders;
    if (this.autoDetect === 'off' || !fs || !fs.length) return [];
    const ps: Set<string> = new Set();
    const ts: vscode.Task[] = [];
    for (const p of await this.allConfigs(ct)) {
      if (!ps.has(p.fsPath)) {
        ps.add(p.fsPath);
        ts.push(...(await this.tasksFor(p)));
      }
    }
    return ts;
  }

  async resolveTask(t: vscode.Task): Promise<vscode.Task | undefined> {
    const d = t.definition as TaskDef;
    if (/\\tsconfig.*\.json/.test(d.tsconfig)) {
      vscode.window.showWarningMessage(
        localize(
          'badTsConfig',
          'TypeScript Task in tasks.json contains "\\\\". TypeScript tasks tsconfig must use "/"'
        )
      );
      return;
    }
    const p = d.tsconfig;
    if (!p) return;
    if (
      t.scope === undefined ||
      t.scope === vscode.TaskScope.Global ||
      t.scope === vscode.TaskScope.Workspace
    ) {
      return;
    }
    const r = t.scope.uri.with({ path: t.scope.uri.path + '/' + p });
    const c: Config = { uri: r, fsPath: r.fsPath, posix: r.path, folder: t.scope };
    return this.tasksForAndDefinition(c, d);
  }

  private async allConfigs(ct: vscode.CancellationToken): Promise<Config[]> {
    const cs = [
      ...(await this.configForActive(ct)),
      ...(await this.configsForWorkspace()),
    ];
    const s = new Set<Config>();
    for (const c of cs) {
      if (await exists(c.uri)) {
        s.add(c);
      }
    }
    return Array.from(s);
  }

  private async configForActive(ct: vscode.CancellationToken): Promise<Config[]> {
    const e = vscode.window.activeTextEditor;
    if (e) {
      if (isTsConfigName(e.document.fileName)) {
        const uri = e.document.uri;
        return [
          {
            uri,
            fsPath: uri.fsPath,
            posix: uri.path,
            folder: vscode.workspace.getWorkspaceFolder(uri),
          },
        ];
      }
    }
    const file = this.activeFile();
    if (!file) return [];
    const r = await Promise.race([
      this.client.value.execute('projectInfo', { file, needFileNameList: false }, ct),
      new Promise<typeof ServerResponse.NoContent>((res) =>
        setTimeout(() => res(ServerResponse.NoContent), this.timeout)
      ),
    ]);
    if (r.type !== 'response' || !r.body) return [];
    const { configFileName } = r.body;
    if (configFileName && !isImplicitConfig(configFileName)) {
      const p = path.normalize(configFileName);
      const uri = vscode.Uri.file(p);
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      return [{ uri, fsPath: p, posix: uri.path, folder }];
    }
    return [];
  }

  private async configsForWorkspace(): Promise<Config[]> {
    return Array.from(await this.tsconfig.configsForWorkspace());
  }

  private static async command(p: Config): Promise<string> {
    if (p.folder) {
      let tsc = await Task.localTscAtPath(path.dirname(p.fsPath));
      if (tsc) return tsc;
      tsc = await Task.localTscAtPath(p.folder.uri.fsPath);
      if (tsc) return tsc;
    }
    return 'tsc';
  }

  private static async localTscAtPath(p: string): Promise<string | undefined> {
    const platform = process.platform;
    const bin = path.join(p, 'node_modules', '.bin');
    if (
      platform === 'win32' &&
      (await exists(vscode.Uri.file(path.join(bin, 'tsc.cmd'))))
    ) {
      return path.join(bin, 'tsc.cmd');
    } else if (
      (platform === 'linux' || platform === 'darwin') &&
      (await exists(vscode.Uri.file(path.join(bin, 'tsc'))))
    ) {
      return path.join(bin, 'tsc');
    }
    return;
  }

  private activeFile(): string | undefined {
    const e = vscode.window.activeTextEditor;
    if (e) {
      const d = e.document;
      if (d && (d.languageId === 'typescript' || d.languageId === 'typescriptreact')) {
        return this.client.value.toPath(d.uri);
      }
    }
    return;
  }

  private buildTask(
    f: vscode.WorkspaceFolder | undefined,
    label: string,
    cmd: string,
    args: string[],
    d: TaskDef
  ): vscode.Task {
    const t = new vscode.Task(
      d,
      f || vscode.TaskScope.Workspace,
      localize('buildTscLabel', 'build - {0}', label),
      'tsc',
      new vscode.ShellExecution(cmd, args),
      '$tsc'
    );
    t.group = vscode.TaskGroup.Build;
    t.isBackground = false;
    return t;
  }

  private watchTask(
    f: vscode.WorkspaceFolder | undefined,
    label: string,
    cmd: string,
    args: string[],
    d: TaskDef
  ) {
    const t = new vscode.Task(
      d,
      f || vscode.TaskScope.Workspace,
      localize('buildAndWatchTscLabel', 'watch - {0}', label),
      'tsc',
      new vscode.ShellExecution(cmd, [...args, '--watch']),
      '$tsc-watch'
    );
    t.group = vscode.TaskGroup.Build;
    t.isBackground = true;
    return t;
  }

  private async tasksFor(p: Config): Promise<vscode.Task[]> {
    const cmd = await Task.command(p);
    const args = await this.buildShellArgs(p);
    const label = this.labelForTasks(p);
    const ts: vscode.Task[] = [];
    if (this.autoDetect === 'build' || this.autoDetect === 'on') {
      ts.push(
        this.buildTask(p.folder, label, cmd, args, {
          type: 'typescript',
          tsconfig: label,
        })
      );
    }
    if (this.autoDetect === 'watch' || this.autoDetect === 'on') {
      ts.push(
        this.watchTask(p.folder, label, cmd, args, {
          type: 'typescript',
          tsconfig: label,
          option: 'watch',
        })
      );
    }
    return ts;
  }

  private async tasksForAndDefinition(
    p: Config,
    d: TaskDef
  ): Promise<vscode.Task | undefined> {
    const cmd = await Task.command(p);
    const args = await this.buildShellArgs(p);
    const label = this.labelForTasks(p);
    let t: vscode.Task | undefined;
    if (d.option === undefined) {
      t = this.buildTask(p.folder, label, cmd, args, d);
    } else if (d.option === 'watch') {
      t = this.watchTask(p.folder, label, cmd, args, d);
    }
    return t;
  }

  private async buildShellArgs(p: Config): Promise<Array<string>> {
    const defaultArgs = ['-p', p.fsPath];
    try {
      const bytes = await vscode.workspace.fs.readFile(p.uri);
      const text = Buffer.from(bytes).toString('utf-8');
      const tsconfig = jsonc.parse(text);
      if (tsconfig?.references) return ['-b', p.fsPath];
    } catch {}
    return defaultArgs;
  }

  private labelForTasks(p: Config) {
    if (p.folder) {
      const r = vscode.Uri.file(path.normalize(p.folder.uri.fsPath));
      return path.posix.relative(r.path, p.posix);
    }
    return p.posix;
  }

  private onConfigurationChanged() {
    const type = vscode.workspace
      .getConfiguration('typescript.tsc')
      .get<AutoDetect>('autoDetect');
    this.autoDetect = typeof type === 'undefined' ? 'on' : type;
  }
}
