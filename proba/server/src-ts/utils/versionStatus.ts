import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { IServiceClient } from '../service';
import { coalesce } from '.';
import { Command, Commands } from './extras';
import { isTypeScriptDocument } from './language';
import {
  isImplicitConfig,
  openOrCreateConfig,
  openProjectConfigOrPromptToCreate,
  openProjectConfigForFile,
  ProjectType,
} from './tsconfig';
import { Disposable } from './extras';
import { TypeScriptVersion } from './versionProvider';

const localize = nls.loadMessageBundle();

namespace ProjectInfoState {
  export const enum Type {
    None,
    Pending,
    Resolved,
  }

  export const None = Object.freeze({ type: Type.None } as const);

  export class Pending {
    public readonly type = Type.Pending;
    public readonly cancel = new vscode.CancellationTokenSource();
    constructor(public readonly uri: vscode.Uri) {}
  }

  export class Resolved {
    public readonly type = Type.Resolved;
    constructor(public readonly uri: vscode.Uri, public readonly configFile: string) {}
  }

  export type State = typeof None | Pending | Resolved;
}

interface QuickPickItem extends vscode.QuickPickItem {
  run(): void;
}

class ProjectStatusCommand implements Command {
  public readonly id = '_typescript.projectStatus';

  public constructor(
    private readonly client: IServiceClient,
    private readonly delegate: () => ProjectInfoState.State
  ) {}

  public async execute(): Promise<void> {
    const info = this.delegate();
    const r = await vscode.window.showQuickPick<QuickPickItem>(
      coalesce([this.getProjectItem(info), this.getVersionItem(), this.getHelpItem()]),
      {
        placeHolder: localize('projectQuickPick.placeholder', 'TypeScript Project Info'),
      }
    );
    return r?.run();
  }

  private getVersionItem(): QuickPickItem {
    return {
      label: localize('projectQuickPick.version.label', 'Select TypeScript Version...'),
      description: this.client.apiVersion.display,
      run: () => {
        this.client.showVersionPicker();
      },
    };
  }

  private getProjectItem(info: ProjectInfoState.State): QuickPickItem | undefined {
    const rootPath =
      info.type === ProjectInfoState.Type.Resolved
        ? this.client.workspaceRootFor(info.uri)
        : undefined;
    if (!rootPath) {
      return;
    }
    if (info.type === ProjectInfoState.Type.Resolved) {
      if (isImplicitConfig(info.configFile)) {
        return {
          label: localize('projectQuickPick.project.create', 'Create tsconfig'),
          detail: localize(
            'projectQuickPick.project.create.description',
            'This file is currently not part of a tsconfig/jsconfig project'
          ),
          run: () => {
            openOrCreateConfig(
              ProjectType.TypeScript,
              rootPath,
              this.client.configuration
            );
          },
        };
      }
    }
    return {
      label: localize('projectQuickPick.version.goProjectConfig', 'Open tsconfig'),
      description:
        info.type === ProjectInfoState.Type.Resolved
          ? vscode.workspace.asRelativePath(info.configFile)
          : undefined,
      run: () => {
        if (info.type === ProjectInfoState.Type.Resolved) {
          openProjectConfigOrPromptToCreate(
            ProjectType.TypeScript,
            this.client,
            rootPath,
            info.configFile
          );
        } else if (info.type === ProjectInfoState.Type.Pending) {
          openProjectConfigForFile(ProjectType.TypeScript, this.client, info.resource);
        }
      },
    };
  }

  private getHelpItem(): QuickPickItem {
    return {
      label: localize('projectQuickPick.help', 'TypeScript help'),
      run: () => {
        vscode.env.openExternal(
          vscode.Uri.parse('https://go.microsoft.com/fwlink/?linkid=839919')
        );
      },
    };
  }
}

export class VersionStatus extends Disposable {
  private readonly _statusBarEntry: vscode.StatusBarItem;
  private _ready = false;
  private _state: ProjectInfoState.State = ProjectInfoState.None;

  constructor(private readonly client: IServiceClient, cmds: Commands) {
    super();
    this._statusBarEntry = this.register(
      vscode.window.createStatusBarItem({
        id: 'status.typescript',
        name: localize('projectInfo.name', 'TypeScript: Project Info'),
        alignment: vscode.StatusBarAlignment.Right,
        priority: 99,
      })
    );
    const c = new ProjectStatusCommand(this.client, () => this._state);
    cmds.register(c);
    this._statusBarEntry.command = c.id;
    vscode.window.onDidChangeActiveTextEditor(this.updateStatus, this, this.dispos);
    this.client.onReady(() => {
      this._ready = true;
      this.updateStatus();
    });
  }

  public onDidChangeTypeScriptVersion(v: TypeScriptVersion) {
    this._statusBarEntry.text = v.displayName;
    this._statusBarEntry.tooltip = v.path;
    this.updateStatus();
  }

  private async updateStatus() {
    if (!vscode.window.activeTextEditor) {
      this.hide();
      return;
    }
    const d = vscode.window.activeTextEditor.document;
    if (isTypeScriptDocument(d)) {
      const file = this.client.toNormPath(d.uri);
      if (file) {
        this._statusBarEntry.show();
        if (!this._ready) return;
        const pendingState = new ProjectInfoState.Pending(d.uri);
        this.updateState(pendingState);
        const response = await this.client.execute(
          'projectInfo',
          { file, needFileNameList: false },
          pendingState.cancel.token
        );
        if (response.type === 'response' && response.body) {
          if (this._state === pendingState) {
            this.updateState(
              new ProjectInfoState.Resolved(d.uri, response.body.configFileName)
            );
            this._statusBarEntry.show();
          }
        }
        return;
      }
    }
    if (!vscode.window.activeTextEditor.viewColumn) return;
    this.hide();
  }

  private hide() {
    this._statusBarEntry.hide();
    this.updateState(ProjectInfoState.None);
  }

  private updateState(s: ProjectInfoState.State) {
    if (this._state === s) return;
    if (this._state.type === ProjectInfoState.Type.Pending) {
      this._state.cancel.cancel();
      this._state.cancel.dispose();
    }
    this._state = s;
  }
}
