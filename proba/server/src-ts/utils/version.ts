/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as semver from 'semver';
import * as nls from 'vscode-nls';
import { ITypeScriptServiceClient } from '../typescriptService';
import { coalesce } from './misc';
import { Command, CommandManager } from './misc';
import { isTypeScriptDocument } from './misc';
import {
  isImplicitProjectConfigFile,
  openOrCreateConfig,
  openProjectConfigOrPromptToCreate,
  openProjectConfigForFile,
  ProjectType,
} from './tsconfig';
import { Disposable } from './misc';

import * as fs from 'fs';
import { TypeScriptServiceConfiguration } from './misc';
import { RelativeWorkspacePathResolver } from './relativePathResolver';

const localize = nls.loadMessageBundle();

export class API {
  private static fromSimpleString(value: string): API {
    return new API(value, value, value);
  }

  public static readonly defaultVersion = API.fromSimpleString('1.0.0');
  public static readonly v240 = API.fromSimpleString('2.4.0');
  public static readonly v250 = API.fromSimpleString('2.5.0');
  public static readonly v260 = API.fromSimpleString('2.6.0');
  public static readonly v270 = API.fromSimpleString('2.7.0');
  public static readonly v280 = API.fromSimpleString('2.8.0');
  public static readonly v290 = API.fromSimpleString('2.9.0');
  public static readonly v291 = API.fromSimpleString('2.9.1');
  public static readonly v292 = API.fromSimpleString('2.9.2');
  public static readonly v300 = API.fromSimpleString('3.0.0');
  public static readonly v310 = API.fromSimpleString('3.1.0');
  public static readonly v314 = API.fromSimpleString('3.1.4');
  public static readonly v320 = API.fromSimpleString('3.2.0');
  public static readonly v330 = API.fromSimpleString('3.3.0');
  public static readonly v333 = API.fromSimpleString('3.3.3');
  public static readonly v340 = API.fromSimpleString('3.4.0');
  public static readonly v345 = API.fromSimpleString('3.4.5');
  public static readonly v350 = API.fromSimpleString('3.5.0');
  public static readonly v380 = API.fromSimpleString('3.8.0');
  public static readonly v381 = API.fromSimpleString('3.8.1');
  public static readonly v390 = API.fromSimpleString('3.9.0');

  public static fromVersionString(versionString: string): API {
    let v = semver.valid(versionString);
    if (!v)
      return new API(localize('invalidVersion', 'invalid version'), '1.0.0', '1.0.0');
    const i = versionString.indexOf('-');
    if (i >= 0) v = v.substr(0, i);
    return new API(versionString, v, versionString);
  }

  private constructor(
    public readonly displayName: string,
    public readonly version: string,
    public readonly fullVersionString: string
  ) {}

  public eq(other: API): boolean {
    return semver.eq(this.version, other.version);
  }

  public gte(other: API): boolean {
    return semver.gte(this.version, other.version);
  }

  public lt(other: API): boolean {
    return !this.gte(other);
  }
}

namespace ProjectInfoState {
  export const enum Type {
    None,
    Pending,
    Resolved,
  }

  export const None = Object.freeze({ type: Type.None } as const);

  export class Pending {
    public readonly type = Type.Pending;

    public readonly cancellation = new vscode.CancellationTokenSource();

    constructor(public readonly resource: vscode.Uri) {}
  }

  export class Resolved {
    public readonly type = Type.Resolved;

    constructor(
      public readonly resource: vscode.Uri,
      public readonly configFile: string
    ) {}
  }

  export type State = typeof None | Pending | Resolved;
}

interface QuickPickItem extends vscode.QuickPickItem {
  run(): void;
}

class ProjectStatusCommand implements Command {
  public readonly id = '_typescript.projectStatus';

  public constructor(
    private readonly _client: ITypeScriptServiceClient,
    private readonly _delegate: () => ProjectInfoState.State
  ) {}

  public async execute(): Promise<void> {
    const info = this._delegate();

    const result = await vscode.window.showQuickPick<QuickPickItem>(
      coalesce([this.getProjectItem(info), this.getVersionItem(), this.getHelpItem()]),
      {
        placeHolder: localize('projectQuickPick.placeholder', 'TypeScript Project Info'),
      }
    );

    return result?.run();
  }

  private getVersionItem(): QuickPickItem {
    return {
      label: localize('projectQuickPick.version.label', 'Select TypeScript Version...'),
      description: this._client.apiVersion.displayName,
      run: () => {
        this._client.showVersionPicker();
      },
    };
  }

  private getProjectItem(info: ProjectInfoState.State): QuickPickItem | undefined {
    const rootPath =
      info.type === ProjectInfoState.Type.Resolved
        ? this._client.getWorkspaceRootForResource(info.resource)
        : undefined;
    if (!rootPath) {
      return undefined;
    }

    if (info.type === ProjectInfoState.Type.Resolved) {
      if (isImplicitProjectConfigFile(info.configFile)) {
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
              this._client.configuration
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
            this._client,
            rootPath,
            info.configFile
          );
        } else if (info.type === ProjectInfoState.Type.Pending) {
          openProjectConfigForFile(ProjectType.TypeScript, this._client, info.resource);
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
        ); // TODO:
      },
    };
  }
}

export default class VersionStatus extends Disposable {
  private readonly _statusBarEntry: vscode.StatusBarItem;

  private _ready = false;
  private _state: ProjectInfoState.State = ProjectInfoState.None;

  constructor(
    private readonly _client: ITypeScriptServiceClient,
    commandManager: CommandManager
  ) {
    super();

    this._statusBarEntry = this._register(
      vscode.window.createStatusBarItem({
        id: 'status.typescript',
        name: localize('projectInfo.name', 'TypeScript: Project Info'),
        alignment: vscode.StatusBarAlignment.Right,
        priority: 99 /* to the right of editor status (100) */,
      })
    );

    const command = new ProjectStatusCommand(this._client, () => this._state);
    commandManager.register(command);
    this._statusBarEntry.command = command.id;

    vscode.window.onDidChangeActiveTextEditor(this.updateStatus, this, this._disposables);

    this._client.onReady(() => {
      this._ready = true;
      this.updateStatus();
    });
  }

  public onDidChangeTypeScriptVersion(version: TypeScriptVersion) {
    this._statusBarEntry.text = version.displayName;
    this._statusBarEntry.tooltip = version.path;
    this.updateStatus();
  }

  private async updateStatus() {
    if (!vscode.window.activeTextEditor) {
      this.hide();
      return;
    }

    const doc = vscode.window.activeTextEditor.document;
    if (isTypeScriptDocument(doc)) {
      const file = this._client.normalizedPath(doc.uri);
      if (file) {
        this._statusBarEntry.show();
        if (!this._ready) {
          return;
        }

        const pendingState = new ProjectInfoState.Pending(doc.uri);
        this.updateState(pendingState);

        const response = await this._client.execute(
          'projectInfo',
          { file, needFileNameList: false },
          pendingState.cancellation.token
        );
        if (response.type === 'response' && response.body) {
          if (this._state === pendingState) {
            this.updateState(
              new ProjectInfoState.Resolved(doc.uri, response.body.configFileName)
            );
            this._statusBarEntry.show();
          }
        }

        return;
      }
    }

    if (!vscode.window.activeTextEditor.viewColumn) {
      // viewColumn is undefined for the debug/output panel, but we still want
      // to show the version info in the existing editor
      return;
    }

    this.hide();
  }

  private hide(): void {
    this._statusBarEntry.hide();
    this.updateState(ProjectInfoState.None);
  }

  private updateState(newState: ProjectInfoState.State): void {
    if (this._state === newState) {
      return;
    }

    if (this._state.type === ProjectInfoState.Type.Pending) {
      this._state.cancellation.cancel();
      this._state.cancellation.dispose();
    }

    this._state = newState;
  }
}

const useWorkspaceTsdkStorageKey = 'typescript.useWorkspaceTsdk';
const suppressPromptWorkspaceTsdkStorageKey = 'typescript.suppressPromptWorkspaceTsdk';

interface QuickPickItem extends vscode.QuickPickItem {
  run(): void;
}

export class TypeScriptVersionManager extends Disposable {
  private _currentVersion: TypeScriptVersion;

  public constructor(
    private configuration: TypeScriptServiceConfiguration,
    private readonly versionProvider: TypeScriptVersionProvider,
    private readonly workspaceState: vscode.Memento
  ) {
    super();

    this._currentVersion = this.versionProvider.defaultVersion;

    if (this.useWorkspaceTsdkSetting) {
      const localVersion = this.versionProvider.localVersion;
      if (localVersion) {
        this._currentVersion = localVersion;
      }
    }

    if (this.isInPromptWorkspaceTsdkState(configuration)) {
      setImmediate(() => {
        this.promptUseWorkspaceTsdk();
      });
    }
  }

  private readonly _onDidPickNewVersion = this._register(new vscode.EventEmitter<void>());
  public readonly onDidPickNewVersion = this._onDidPickNewVersion.event;

  public updateConfiguration(nextConfiguration: TypeScriptServiceConfiguration) {
    const lastConfiguration = this.configuration;
    this.configuration = nextConfiguration;

    if (
      !this.isInPromptWorkspaceTsdkState(lastConfiguration) &&
      this.isInPromptWorkspaceTsdkState(nextConfiguration)
    ) {
      this.promptUseWorkspaceTsdk();
    }
  }

  public get currentVersion(): TypeScriptVersion {
    return this._currentVersion;
  }

  public reset(): void {
    this._currentVersion = this.versionProvider.bundledVersion;
  }

  public async promptUserForVersion(): Promise<void> {
    const selected = await vscode.window.showQuickPick<QuickPickItem>(
      [this.getBundledPickItem(), ...this.getLocalPickItems(), LearnMorePickItem],
      {
        placeHolder: localize(
          'selectTsVersion',
          'Select the TypeScript version used for JavaScript and TypeScript language features'
        ),
      }
    );

    return selected?.run();
  }

  private getBundledPickItem(): QuickPickItem {
    const bundledVersion = this.versionProvider.defaultVersion;
    return {
      label:
        (!this.useWorkspaceTsdkSetting ? '• ' : '') +
        localize('useVSCodeVersionOption', "Use VS Code's Version"),
      description: bundledVersion.displayName,
      detail: bundledVersion.pathLabel,
      run: async () => {
        await this.workspaceState.update(useWorkspaceTsdkStorageKey, false);
        this.updateActiveVersion(bundledVersion);
      },
    };
  }

  private getLocalPickItems(): QuickPickItem[] {
    return this.versionProvider.localVersions.map((version) => {
      return {
        label:
          (this.useWorkspaceTsdkSetting && this.currentVersion.eq(version) ? '• ' : '') +
          localize('useWorkspaceVersionOption', 'Use Workspace Version'),
        description: version.displayName,
        detail: version.pathLabel,
        run: async () => {
          await this.workspaceState.update(useWorkspaceTsdkStorageKey, true);
          const tsConfig = vscode.workspace.getConfiguration('typescript');
          await tsConfig.update('tsdk', version.pathLabel, false);
          this.updateActiveVersion(version);
        },
      };
    });
  }

  private async promptUseWorkspaceTsdk(): Promise<void> {
    const workspaceVersion = this.versionProvider.localVersion;

    if (workspaceVersion === undefined) {
      throw new Error(
        'Could not prompt to use workspace TypeScript version because no workspace version is specified'
      );
    }

    const allowIt = localize('allow', 'Allow');
    const dismissPrompt = localize('dismiss', 'Dismiss');
    const suppressPrompt = localize('suppress prompt', 'Never in this Workspace');

    const result = await vscode.window.showInformationMessage(
      localize(
        'promptUseWorkspaceTsdk',
        'This workspace contains a TypeScript version. Would you like to use the workspace TypeScript version for TypeScript and JavaScript language features?'
      ),
      allowIt,
      dismissPrompt,
      suppressPrompt
    );

    if (result === allowIt) {
      await this.workspaceState.update(useWorkspaceTsdkStorageKey, true);
      this.updateActiveVersion(workspaceVersion);
    } else if (result === suppressPrompt) {
      await this.workspaceState.update(suppressPromptWorkspaceTsdkStorageKey, true);
    }
  }

  private updateActiveVersion(pickedVersion: TypeScriptVersion) {
    const oldVersion = this.currentVersion;
    this._currentVersion = pickedVersion;
    if (!oldVersion.eq(pickedVersion)) {
      this._onDidPickNewVersion.fire();
    }
  }

  private get useWorkspaceTsdkSetting(): boolean {
    return this.workspaceState.get<boolean>(useWorkspaceTsdkStorageKey, false);
  }

  private get suppressPromptWorkspaceTsdkSetting(): boolean {
    return this.workspaceState.get<boolean>(suppressPromptWorkspaceTsdkStorageKey, false);
  }

  private isInPromptWorkspaceTsdkState(configuration: TypeScriptServiceConfiguration) {
    return (
      configuration.localTsdk !== null &&
      configuration.enablePromptUseWorkspaceTsdk === true &&
      this.suppressPromptWorkspaceTsdkSetting === false &&
      this.useWorkspaceTsdkSetting === false
    );
  }
}

const LearnMorePickItem: QuickPickItem = {
  label: localize('learnMore', 'Learn more about managing TypeScript versions'),
  description: '',
  run: () => {
    vscode.env.openExternal(
      vscode.Uri.parse('https://go.microsoft.com/fwlink/?linkid=839919')
    );
  },
};

const enum TypeScriptVersionSource {
  Bundled = 'bundled',
  TsNightlyExtension = 'ts-nightly-extension',
  NodeModules = 'node-modules',
  UserSetting = 'user-setting',
  WorkspaceSetting = 'workspace-setting',
}

export class TypeScriptVersion {
  public readonly apiVersion: API | undefined;

  constructor(
    public readonly source: TypeScriptVersionSource,
    public readonly path: string,
    private readonly _pathLabel?: string
  ) {
    this.apiVersion = TypeScriptVersion.getApiVersion(this.tsServerPath);
  }

  public get tsServerPath(): string {
    return path.join(this.path, 'tsserver.js');
  }

  public get pathLabel(): string {
    return this._pathLabel ?? this.path;
  }

  public get isValid(): boolean {
    return this.apiVersion !== undefined;
  }

  public eq(other: TypeScriptVersion): boolean {
    if (this.path !== other.path) {
      return false;
    }

    if (this.apiVersion === other.apiVersion) {
      return true;
    }
    if (!this.apiVersion || !other.apiVersion) {
      return false;
    }
    return this.apiVersion.eq(other.apiVersion);
  }

  public get displayName(): string {
    const version = this.apiVersion;
    return version
      ? version.displayName
      : localize(
          'couldNotLoadTsVersion',
          'Could not load the TypeScript version at this path'
        );
  }

  public static getApiVersion(serverPath: string): API | undefined {
    const version = TypeScriptVersion.getTypeScriptVersion(serverPath);
    if (version) {
      return version;
    }

    // Allow TS developers to provide custom version
    const tsdkVersion = vscode.workspace
      .getConfiguration()
      .get<string | undefined>('typescript.tsdk_version', undefined);
    if (tsdkVersion) {
      return API.fromVersionString(tsdkVersion);
    }

    return undefined;
  }

  private static getTypeScriptVersion(serverPath: string): API | undefined {
    if (!fs.existsSync(serverPath)) {
      return undefined;
    }

    const p = serverPath.split(path.sep);
    if (p.length <= 2) {
      return undefined;
    }
    const p2 = p.slice(0, -2);
    const modulePath = p2.join(path.sep);
    let fileName = path.join(modulePath, 'package.json');
    if (!fs.existsSync(fileName)) {
      // Special case for ts dev versions
      if (path.basename(modulePath) === 'built') {
        fileName = path.join(modulePath, '..', 'package.json');
      }
    }
    if (!fs.existsSync(fileName)) {
      return undefined;
    }

    const contents = fs.readFileSync(fileName).toString();
    let desc: any = null;
    try {
      desc = JSON.parse(contents);
    } catch (err) {
      return undefined;
    }
    if (!desc || !desc.version) {
      return undefined;
    }
    return desc.version ? API.fromVersionString(desc.version) : undefined;
  }
}

export class TypeScriptVersionProvider {
  public constructor(private configuration: TypeScriptServiceConfiguration) {}

  public updateConfiguration(configuration: TypeScriptServiceConfiguration): void {
    this.configuration = configuration;
  }

  public get defaultVersion(): TypeScriptVersion {
    return this.globalVersion || this.bundledVersion;
  }

  public get globalVersion(): TypeScriptVersion | undefined {
    if (this.configuration.globalTsdk) {
      const globals = this.loadVersionsFromSetting(
        TypeScriptVersionSource.UserSetting,
        this.configuration.globalTsdk
      );
      if (globals && globals.length) {
        return globals[0];
      }
    }
    return this.contributedTsNextVersion;
  }

  public get localVersion(): TypeScriptVersion | undefined {
    const tsdkVersions = this.localTsdkVersions;
    if (tsdkVersions && tsdkVersions.length) {
      return tsdkVersions[0];
    }

    const nodeVersions = this.localNodeModulesVersions;
    if (nodeVersions && nodeVersions.length === 1) {
      return nodeVersions[0];
    }
    return undefined;
  }

  public get localVersions(): TypeScriptVersion[] {
    const allVersions = this.localTsdkVersions.concat(this.localNodeModulesVersions);
    const paths = new Set<string>();
    return allVersions.filter((x) => {
      if (paths.has(x.path)) {
        return false;
      }
      paths.add(x.path);
      return true;
    });
  }

  public get bundledVersion(): TypeScriptVersion {
    const version = this.getContributedVersion(
      TypeScriptVersionSource.Bundled,
      'vscode.typescript-language-features',
      ['..', 'node_modules']
    );
    if (version) {
      return version;
    }

    vscode.window.showErrorMessage(
      localize(
        'noBundledServerFound',
        "VS Code's tsserver was deleted by another application such as a misbehaving virus detection tool. Please reinstall VS Code."
      )
    );
    throw new Error('Could not find bundled tsserver.js');
  }

  private get contributedTsNextVersion(): TypeScriptVersion | undefined {
    return this.getContributedVersion(
      TypeScriptVersionSource.TsNightlyExtension,
      'ms-vscode.vscode-typescript-next',
      ['node_modules']
    );
  }

  private getContributedVersion(
    source: TypeScriptVersionSource,
    extensionId: string,
    pathToTs: readonly string[]
  ): TypeScriptVersion | undefined {
    try {
      const extension = vscode.extensions.getExtension(extensionId);
      if (extension) {
        const typescriptPath = path.join(
          extension.extensionPath,
          ...pathToTs,
          'typescript',
          'lib'
        );
        const bundledVersion = new TypeScriptVersion(source, typescriptPath, '');
        if (bundledVersion.isValid) {
          return bundledVersion;
        }
      }
    } catch {
      // noop
    }
    return undefined;
  }

  private get localTsdkVersions(): TypeScriptVersion[] {
    const localTsdk = this.configuration.localTsdk;
    return localTsdk
      ? this.loadVersionsFromSetting(TypeScriptVersionSource.WorkspaceSetting, localTsdk)
      : [];
  }

  private loadVersionsFromSetting(
    source: TypeScriptVersionSource,
    tsdkPathSetting: string
  ): TypeScriptVersion[] {
    if (path.isAbsolute(tsdkPathSetting)) {
      return [new TypeScriptVersion(source, tsdkPathSetting)];
    }

    const workspacePath = RelativeWorkspacePathResolver.asAbsoluteWorkspacePath(
      tsdkPathSetting
    );
    if (workspacePath !== undefined) {
      return [new TypeScriptVersion(source, workspacePath, tsdkPathSetting)];
    }

    return this.loadTypeScriptVersionsFromPath(source, tsdkPathSetting);
  }

  private get localNodeModulesVersions(): TypeScriptVersion[] {
    return this.loadTypeScriptVersionsFromPath(
      TypeScriptVersionSource.NodeModules,
      path.join('node_modules', 'typescript', 'lib')
    ).filter((x) => x.isValid);
  }

  private loadTypeScriptVersionsFromPath(
    source: TypeScriptVersionSource,
    relativePath: string
  ): TypeScriptVersion[] {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }

    const versions: TypeScriptVersion[] = [];
    for (const root of vscode.workspace.workspaceFolders) {
      let label: string = relativePath;
      if (vscode.workspace.workspaceFolders.length > 1) {
        label = path.join(root.name, relativePath);
      }

      versions.push(
        new TypeScriptVersion(source, path.join(root.uri.fsPath, relativePath), label)
      );
    }
    return versions;
  }
}
