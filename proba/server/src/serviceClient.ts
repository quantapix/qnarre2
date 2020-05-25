import * as fs from 'fs';
import * as nls from 'vscode-nls';
import * as path from 'path';
import * as proto from './protocol';
import * as vsc from 'vscode';

import { Buffer } from './utils/buffer';
import { Kind, Diags } from './utils/diagnostic';
import { IServer, ExecInfo } from './server';
import { ServerError } from './server';
import { Spawner } from './spawner';
import {
  ExecConfig,
  IServiceClient,
  ServerResponse,
  TypeScriptRequests,
} from './service';
import { API } from './utils/api';
import { TsServerLogLevel, ServiceConfig } from './utils/configs';
import * as qx from './utils/extras';
import * as qu from './utils';
import { LogDirectory, PluginPaths } from './utils/providers';
import { Plugins } from './utils/plugin';
import {
  TelemetryReporter,
  VSCodeTelemetryReporter,
  TelemetryProperties,
} from './utils/telemetry';
import { inferredProjectCompilerOptions, ProjectType } from './utils/tsconfig';
import { Versions } from './utils/versionManager';
import { TypeScriptVersion, TypeScriptVersionProvider } from './utils/versionProvider';

const localize = nls.loadMessageBundle();

export interface TsDiagnostics {
  readonly uri: vsc.Uri;
  readonly kind: Kind;
  readonly diags: proto.Diagnostic[];
}

interface ToCancel {
  readonly uri: vsc.Uri;
  cancel(): void;
}

namespace ServerState {
  export const enum Type {
    None,
    Running,
    Errored,
  }
  export const None = { type: Type.None } as const;
  export class Running {
    readonly type = Type.Running;
    readonly toCancels = new Set<ToCancel>();
    constructor(
      public readonly server: IServer,
      public readonly api: API,
      public version: string | undefined,
      public serviceEnabled: boolean
    ) {}
    updateVersion(v: string) {
      this.version = v;
    }
    updateServiceEnabled(enabled: boolean) {
      this.serviceEnabled = enabled;
    }
  }
  export class Errored {
    readonly type = Type.Errored;
    constructor(public readonly error: Error) {}
  }
  export type State = typeof None | Running | Errored;
}

export class ServiceClient extends qx.Disposable implements IServiceClient {
  private static readonly WALK_THROUGH_SNIPPET_SCHEME_COLON = `${qx.walkThroughSnippet}:`;

  private readonly pathSeparator: string;
  private readonly inMemoryResourcePrefix = '^';

  private _onReady?: { promise: Promise<void>; resolve: () => void; reject: () => void };
  private _configuration: ServiceConfig;
  private versionProvider: TypeScriptVersionProvider;
  private pluginPathsProvider: PluginPaths;
  private readonly _versionManager: Versions;

  private readonly logger = new qx.Logger();
  private readonly tracer = new qx.Tracer(this.logger);

  private readonly spawner: Spawner;
  private serverState: ServerState.State = ServerState.None;
  private lastStart: number;
  private numberRestarts: number;
  private _isPromptingAfterCrash = false;
  private isRestarting = false;
  private hasServerFatallyCrashedTooManyTimes = false;
  private readonly loadingIndicator = new ServerInitializingIndicator();

  readonly telemetry: TelemetryReporter;

  readonly buffer: Buffer;
  readonly diagnosticsManager: Diags;

  constructor(
    private readonly workspaceState: vsc.Memento,
    private readonly onDidChangeTypeScriptVersion: (_: TypeScriptVersion) => void,
    public readonly plugins: Plugins,
    private readonly logDirectoryProvider: LogDirectory,
    allModeIds: readonly string[]
  ) {
    super();
    this.pathSeparator = path.sep;
    this.lastStart = Date.now();
    // eslint-disable-next-line no-var
    var p = new Promise<void>((resolve, reject) => {
      this._onReady = { promise: p, resolve, reject };
    });
    this._onReady!.promise = p;
    this.numberRestarts = 0;
    this._configuration = ServiceConfig.loadFromWorkspace();
    this.versionProvider = new TypeScriptVersionProvider(this._configuration);
    this.pluginPathsProvider = new PluginPaths(this._configuration);
    this._versionManager = this.register(
      new Versions(this._configuration, this.versionProvider, this.workspaceState)
    );
    this.register(
      this._versionManager.onDidPickNewVersion(() => {
        this.restartTsServer();
      })
    );
    this.buffer = new Buffer(this, allModeIds);
    this.onReady(() => {
      this.buffer.listen();
    });
    this.diagnosticsManager = new Diags('typescript');
    this.buffer.onDelete(
      (resource) => {
        this.cancelInflightRequestsForResource(resource);
        this.diagnosticsManager.delete(resource);
      },
      null,
      this.dispos
    );
    this.buffer.onWillChange((resource) => {
      this.cancelInflightRequestsForResource(resource);
    });

    vsc.workspace.onDidChangeConfiguration(
      () => {
        const oldConfiguration = this._configuration;
        this._configuration = ServiceConfig.loadFromWorkspace();
        this.versionProvider.updateConfig(this._configuration);
        this._versionManager.updateConfig(this._configuration);
        this.pluginPathsProvider.updateConfig(this._configuration);
        this.tracer.updateConfig();
        if (this.serverState.type === ServerState.Type.Running) {
          if (
            this._configuration.checkJs !== oldConfiguration.checkJs ||
            this._configuration.experimentalDecorators !==
              oldConfiguration.experimentalDecorators
          ) {
            this.setCompilerOptionsForInferredProjects(this._configuration);
          }
          if (!this._configuration.isEqualTo(oldConfiguration)) {
            this.restartTsServer();
          }
        }
      },
      this,
      this.dispos
    );
    this.telemetry = this.register(
      new VSCodeTelemetryReporter(() => {
        if (this.serverState.type === ServerState.Type.Running) {
          if (this.serverState.version) {
            return this.serverState.version;
          }
        }
        return this.api.fullVersion;
      })
    );
    this.spawner = new Spawner(
      this.versionProvider,
      this.logDirectoryProvider,
      this.pluginPathsProvider,
      this.logger,
      this.telemetry,
      this.tracer
    );

    this.register(
      this.plugins.onDidUpdateConfig((update) => {
        this.configurePlugin(update.pluginId, update.config);
      })
    );

    this.register(
      this.plugins.onDidChangePlugins(() => {
        this.restartTsServer();
      })
    );
  }

  private cancelInflightRequestsForResource(resource: vsc.Uri): void {
    if (this.serverState.type !== ServerState.Type.Running) {
      return;
    }

    for (const request of this.serverState.toCancels) {
      if (request.uri.toString() === resource.toString()) {
        request.cancel();
      }
    }
  }

  get configuration() {
    return this._configuration;
  }

  dispose() {
    super.dispose();
    this.buffer.dispose();
    if (this.serverState.type === ServerState.Type.Running) {
      this.serverState.server.kill();
    }
    this.loadingIndicator.reset();
  }

  restartTsServer(): void {
    if (this.serverState.type === ServerState.Type.Running) {
      this.info('Killing TS Server');
      this.isRestarting = true;
      this.serverState.server.kill();
    }
    this.serverState = this.startService(true);
  }

  private readonly _onServerStarted = this.register(new vsc.EventEmitter<API>());
  readonly onServerStarted = this._onServerStarted.event;

  private readonly _onDiagnosticsReceived = this.register(
    new vsc.EventEmitter<TsDiagnostics>()
  );
  readonly onDiagnosticsReceived = this._onDiagnosticsReceived.event;

  private readonly _onConfigDiagnosticsReceived = this.register(
    new vsc.EventEmitter<proto.ConfigFileDiagnosticEvent>()
  );
  readonly onConfigDiagnosticsReceived = this._onConfigDiagnosticsReceived.event;

  private readonly _onResendModelsRequested = this.register(new vsc.EventEmitter<void>());
  readonly onResendModelsRequested = this._onResendModelsRequested.event;

  private readonly _onServiceStateChanged = this.register(
    new vsc.EventEmitter<proto.ProjectLanguageServiceStateEventBody>()
  );
  readonly onServiceStateChanged = this._onServiceStateChanged.event;

  private readonly _onDidBeginInstallTypes = this.register(
    new vsc.EventEmitter<proto.BeginInstallTypesEventBody>()
  );
  readonly onDidBeginInstallTypes = this._onDidBeginInstallTypes.event;

  private readonly _onDidEndInstallTypes = this.register(
    new vsc.EventEmitter<proto.EndInstallTypesEventBody>()
  );
  readonly onDidEndInstallTypes = this._onDidEndInstallTypes.event;

  private readonly _onTypesInstallerInitFailed = this.register(
    new vsc.EventEmitter<proto.TypesInstallerInitializationFailedEventBody>()
  );
  readonly onTypesInstallerInitFailed = this._onTypesInstallerInitFailed.event;

  private readonly _onSurveyReady = this.register(
    new vsc.EventEmitter<proto.SurveyReadyEventBody>()
  );
  readonly onSurveyReady = this._onSurveyReady.event;

  get api(): API {
    if (this.serverState.type === ServerState.Type.Running) {
      return this.serverState.api;
    }
    return API.defaultVersion;
  }

  onReady(f: () => void): Promise<void> {
    return this._onReady!.promise.then(f);
  }

  private info(message: string, data?: any): void {
    this.logger.info(message, data);
  }

  private error(message: string, data?: any): void {
    this.logger.error(message, data);
  }

  private logTelemetry(eventName: string, properties?: TelemetryProperties) {
    this.telemetry.logTelemetry(eventName, properties);
  }

  private service(): ServerState.Running {
    if (this.serverState.type === ServerState.Type.Running) {
      return this.serverState;
    }
    if (this.serverState.type === ServerState.Type.Errored) {
      throw this.serverState.error;
    }
    const newState = this.startService();
    if (newState.type === ServerState.Type.Running) {
      return newState;
    }
    throw new Error(
      `Could not create TS service. Service state:${JSON.stringify(newState)}`
    );
  }

  ensureServiceStarted() {
    if (this.serverState.type !== ServerState.Type.Running) {
      this.startService();
    }
  }

  private token = 0;
  private startService(resendModels = false): ServerState.State {
    this.info(`Starting TS Server `);
    if (this.isDisposed) {
      this.info(`Not starting server. Disposed `);
      return ServerState.None;
    }
    if (this.hasServerFatallyCrashedTooManyTimes) {
      this.info(`Not starting server. Too many crashes.`);
      return ServerState.None;
    }
    let version = this._versionManager.currentVersion;
    this.info(`Using tsserver from: ${version.path}`);
    if (!fs.existsSync(version.tsServerPath)) {
      vsc.window.showWarningMessage(
        localize(
          'noServerFound',
          "The path {0} doesn't point to a valid tsserver install. Falling back to bundled TypeScript version.",
          version.path
        )
      );
      this._versionManager.reset();
      version = this._versionManager.currentVersion;
    }

    const api = version.api || API.defaultVersion;
    const mytoken = ++this.token;
    const handle = this.spawner.spawn(version, this.configuration, this.plugins, {
      onFatalError: (command, err) => this.fatalError(command, err),
    });
    this.serverState = new ServerState.Running(handle, api, undefined, true);
    this.onDidChangeTypeScriptVersion(version);
    this.lastStart = Date.now();
    this.logTelemetry('tsserver.spawned', {
      localTypeScriptVersion: this.versionProvider.localVersion
        ? this.versionProvider.localVersion.displayName
        : '',
      typeScriptVersionSource: version.source,
    });
    handle.onError((err: Error) => {
      if (this.token !== mytoken) return;
      if (err) {
        vsc.window.showErrorMessage(
          localize(
            'serverExitedWithError',
            'TypeScript language server exited with error. Error message is: {0}',
            err.message || err.name
          )
        );
      }
      this.serverState = new ServerState.Errored(err);
      this.error('TSServer errored with error.', err);
      if (handle.logFile) {
        this.error(`TSServer log file: ${handle.logFile}`);
      }
      this.logTelemetry('tsserver.error');
      this.serviceExited(false);
    });

    handle.onExit((code: any) => {
      if (this.token !== mytoken) return;
      if (code === null || typeof code === 'undefined') {
        this.info('TSServer exited');
      } else {
        this.error(`TSServer exited with code: ${code}`);
        this.logTelemetry('tsserver.exitWithCode', { code: code });
      }
      if (handle.logFile) {
        this.info(`TSServer log file: ${handle.logFile}`);
      }
      this.serviceExited(!this.isRestarting);
      this.isRestarting = false;
    });

    handle.onReaderError((error) => this.error('ReaderError', error));
    handle.onEvent((event) => this.dispatchEvent(event));

    this._onReady!.resolve();
    this._onServerStarted.fire(api);
    this.loadingIndicator.startedLoadingProject(undefined /* projectName */);

    this.serviceStarted(resendModels);

    return this.serverState;
  }

  async showVersionPicker(): Promise<void> {
    this._versionManager.promptUserForVersion();
  }

  async openTsServerLogFile(): Promise<boolean> {
    if (this._configuration.tsServerLogLevel === TsServerLogLevel.Off) {
      vsc.window
        .showErrorMessage<vsc.MessageItem>(
          localize(
            'typescript.openTsServerLog.loggingNotEnabled',
            'TS Server logging is off. Please set `typescript.tsserver.log` and restart the TS server to enable logging'
          ),
          {
            title: localize(
              'typescript.openTsServerLog.enableAndReloadOption',
              'Enable logging and restart TS server'
            ),
          }
        )
        .then((selection) => {
          if (selection) {
            return vsc.workspace
              .getConfiguration()
              .update('typescript.tsserver.log', 'verbose', true)
              .then(() => {
                this.restartTsServer();
              });
          }
          return;
        });
      return false;
    }
    if (
      this.serverState.type !== ServerState.Type.Running ||
      !this.serverState.server.logFile
    ) {
      vsc.window.showWarningMessage(
        localize(
          'typescript.openTsServerLog.noLogFile',
          'TS Server has not started logging.'
        )
      );
      return false;
    }
    try {
      const doc = await vsc.workspace.openTextDocument(
        vsc.Uri.file(this.serverState.server.logFile)
      );
      await vsc.window.showTextDocument(doc);
      return true;
    } catch {}
    try {
      await vsc.commands.executeCommand(
        'revealFileInOS',
        vsc.Uri.file(this.serverState.server.logFile)
      );
      return true;
    } catch {
      vsc.window.showWarningMessage(
        localize(
          'openTsServerLog.openFileFailedFailed',
          'Could not open TS Server log file'
        )
      );
      return false;
    }
  }

  private serviceStarted(resendModels: boolean): void {
    this.buffer.reset();
    const watchOptions = this.configuration.watchOptions;
    const configureOptions: proto.ConfigureRequestArguments = {
      hostInfo: 'vscode',
      preferences: {
        providePrefixAndSuffixTextForRename: true,
        allowRenameOfImportPath: true,
      },
      watchOptions,
    };
    this.executeNoResponse('configure', configureOptions);
    this.setCompilerOptionsForInferredProjects(this._configuration);
    if (resendModels) {
      this._onResendModelsRequested.fire();
      this.buffer.reinitialize();
      this.buffer.requestAllDiags();
    }
    for (const [config, pluginName] of this.plugins.configs()) {
      this.configurePlugin(config, pluginName);
    }
  }

  private setCompilerOptionsForInferredProjects(configuration: ServiceConfig): void {
    const args: proto.SetCompilerOptionsForInferredProjectsArgs = {
      options: this.getCompilerOptionsForInferredProjects(configuration),
    };
    this.executeNoResponse('compilerOptionsForInferredProjects', args);
  }

  private getCompilerOptionsForInferredProjects(
    configuration: ServiceConfig
  ): proto.ExternalProjectCompilerOptions {
    return {
      ...inferredProjectCompilerOptions(ProjectType.TypeScript, configuration),
      allowJs: true,
      allowSyntheticDefaultImports: true,
      allowNonTsExtensions: true,
      resolveJsonModule: true,
    };
  }

  private serviceExited(restart: boolean) {
    this.loadingIndicator.reset();
    const previousState = this.serverState;
    this.serverState = ServerState.None;
    if (restart) {
      const diff = Date.now() - this.lastStart;
      this.numberRestarts++;
      let startService = true;
      const reportIssueItem: vsc.MessageItem = {
        title: localize('serverDiedReportIssue', 'Report Issue'),
      };
      let prompt: Thenable<undefined | vsc.MessageItem> | undefined = undefined;
      if (this.numberRestarts > 5) {
        this.numberRestarts = 0;
        if (diff < 10 * 1000 /* 10 seconds */) {
          this.lastStart = Date.now();
          startService = false;
          this.hasServerFatallyCrashedTooManyTimes = true;
          prompt = vsc.window.showErrorMessage(
            localize(
              'serverDiedAfterStart',
              'The TypeScript language service died 5 times right after it got started. The service will not be restarted.'
            ),
            reportIssueItem
          );
          this.logTelemetry('serviceExited');
        } else if (diff < 60 * 1000 * 5 /* 5 Minutes */) {
          this.lastStart = Date.now();
          prompt = vsc.window.showWarningMessage(
            localize(
              'serverDied',
              'The TypeScript language service died unexpectedly 5 times in the last 5 Minutes.'
            ),
            reportIssueItem
          );
        }
      } else if (['vscode-insiders', 'code-oss'].includes(vsc.env.uriScheme)) {
        if (
          !this._isPromptingAfterCrash &&
          previousState.type === ServerState.Type.Errored &&
          previousState.error instanceof ServerError
        ) {
          this.numberRestarts = 0;
          this._isPromptingAfterCrash = true;
          prompt = vsc.window.showWarningMessage(
            localize(
              'serverDiedOnce',
              'The TypeScript language service died unexpectedly.'
            ),
            reportIssueItem
          );
        }
      }
      prompt?.then((item) => {
        this._isPromptingAfterCrash = false;
        if (item === reportIssueItem) {
          const args =
            previousState.type === ServerState.Type.Errored &&
            previousState.error instanceof ServerError
              ? getReportIssueArgsForError(previousState.error)
              : undefined;
          vsc.commands.executeCommand('workbench.action.openIssueReporter', args);
        }
      });
      if (startService) this.startService(true);
    }
  }

  toPath(r: vsc.Uri): string | undefined {
    return this.toNormPath(r);
  }

  toNormPath(r: vsc.Uri): string | undefined {
    if (r.scheme === qx.walkThroughSnippet || r.scheme === qx.untitled) {
      const d = path.dirname(r.path);
      const f = this.inMemoryResourcePrefix + path.basename(r.path);
      return r.with({ path: path.posix.join(d, f), query: '' }).toString(true);
    }
    if (r.scheme !== qx.file) return;
    let p = r.fsPath;
    if (!p) return;
    if (r.scheme === qx.file) p = path.normalize(p);
    return p.replace(new RegExp('\\' + this.pathSeparator, 'g'), '/');
  }

  toOpenedPath(d: vsc.TextDocument): string | undefined {
    if (!this.buffer.ensureHasBuffer(d.uri)) {
      console.error(`Unexpected resource ${d.uri}`);
      return;
    }
    return this.toPath(d.uri) || undefined;
  }

  toResource(filepath: string): vsc.Uri {
    if (
      filepath.startsWith(ServiceClient.WALK_THROUGH_SNIPPET_SCHEME_COLON) ||
      filepath.startsWith(qx.untitled + ':')
    ) {
      let r = vsc.Uri.parse(filepath);
      const d = path.dirname(r.path);
      const f = path.basename(r.path);
      if (f.startsWith(this.inMemoryResourcePrefix)) {
        r = r.with({
          path: path.posix.join(d, f.slice(this.inMemoryResourcePrefix.length)),
        });
      }
      return this.buffer.toVsCodeResource(r);
    }
    return this.buffer.toResource(filepath);
  }

  workspaceRootFor(r: vsc.Uri): string | undefined {
    const fs = vsc.workspace.workspaceFolders
      ? Array.from(vsc.workspace.workspaceFolders)
      : undefined;
    if (!fs || !fs.length) return;
    if (r.scheme === qx.file || r.scheme === qx.untitled) {
      for (const f of fs.sort((a, b) => a.uri.fsPath.length - b.uri.fsPath.length)) {
        if (r.fsPath.startsWith(f.uri.fsPath + path.sep)) return f.uri.fsPath;
      }
      return fs[0].uri.fsPath;
    }
    return;
  }

  execute(
    cmd: keyof TypeScriptRequests,
    args: any,
    ct: vsc.CancellationToken,
    cfg?: ExecConfig
  ): Promise<ServerResponse.Response<proto.Response>> {
    let p: Promise<ServerResponse.Response<proto.Response>>;
    const uri = cfg?.cancelOnResourceChange;
    if (uri) {
      const s = new vsc.CancellationTokenSource();
      ct.onCancellationRequested(() => s.cancel());
      const c: ToCancel = { uri, cancel: () => s.cancel() };
      const state = this.service();
      state.toCancels.add(c);
      p = this.exec(cmd, args, { ct: s.token, respond: true, ...cfg }).finally(() => {
        state.toCancels.delete(c);
        s.dispose();
      });
    } else {
      p = this.exec(cmd, args, { ct, respond: true, ...cfg });
    }
    if (cfg?.nonRecoverable) p.catch((e) => this.fatalError(cmd, e));
    return p;
  }

  executeNoResponse(cmd: keyof TypeScriptRequests, args: any) {
    this.exec(cmd, args, {});
  }

  executeAsync(
    cmd: keyof TypeScriptRequests,
    args: proto.GeterrRequestArgs,
    ct: vsc.CancellationToken
  ): Promise<ServerResponse.Response<proto.Response>> {
    return this.exec(cmd, args, { isAsync: true, ct, respond: true });
  }

  private exec(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync?: boolean;
      ct?: vsc.CancellationToken;
      respond?: false;
      slow?: boolean;
    }
  ): undefined;
  private exec(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: ExecInfo
  ): Promise<ServerResponse.Response<proto.Response>>;
  private exec(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: ExecInfo
  ): Promise<ServerResponse.Response<proto.Response>> | undefined {
    this.buffer.beforeCommand(cmd);
    const state = this.service();
    return state.server.exec(cmd, args, info);
  }

  interruptGetErr<R>(f: () => R): R {
    return this.buffer.interuptGetErr(f);
  }

  private fatalError(command: string, error: unknown): void {
    this.logTelemetry('fatalError', {
      ...(error instanceof ServerError ? error.telemetry : { command }),
    });
    console.error(
      `A non-recoverable error occured while executing tsserver command: ${command}`
    );
    if (error instanceof ServerError && error.errorText) {
      console.error(error.errorText);
    }

    if (this.serverState.type === ServerState.Type.Running) {
      this.info('Killing TS Server');
      this.serverState.server.kill();
      if (error instanceof ServerError) {
        this.serverState = new ServerState.Errored(error);
      }
    }
  }

  private dispatchEvent(event: proto.Event) {
    const diagnosticEvent = event as proto.DiagnosticEvent;
    const body = (event as proto.ProjectsUpdatedInBackgroundEvent).body;
    const resources = body.openFiles.map((file) => this.toResource(file));
    switch (event.event) {
      case 'syntaxDiag':
      case 'semanticDiag':
      case 'suggestionDiag':
        this.loadingIndicator.reset();
        if (diagnosticEvent.body && diagnosticEvent.body.diagnostics) {
          this._onDiagnosticsReceived.fire({
            kind: getDignosticsKind(event),
            uri: this.toResource(diagnosticEvent.body.file),
            diags: diagnosticEvent.body.diagnostics,
          });
        }
        break;
      case 'configFileDiag':
        this._onConfigDiagnosticsReceived.fire(event as proto.ConfigFileDiagnosticEvent);
        break;
      case 'telemetry': {
        const body = (event as proto.TelemetryEvent).body;
        this.dispatchTelemetryEvent(body);
        break;
      }
      case 'projectLanguageServiceState': {
        const body = (event as proto.ProjectLanguageServiceStateEvent).body!;
        if (this.serverState.type === ServerState.Type.Running) {
          this.serverState.updateServiceEnabled(body.languageServiceEnabled);
        }
        this._onServiceStateChanged.fire(body);
        break;
      }
      case 'projectsUpdatedInBackground':
        this.buffer.getErr(resources);
        break;
      case 'beginInstallTypes':
        this._onDidBeginInstallTypes.fire((event as proto.BeginInstallTypesEvent).body);
        break;
      case 'endInstallTypes':
        this._onDidEndInstallTypes.fire((event as proto.EndInstallTypesEvent).body);
        break;
      case 'typesInstallerInitializationFailed':
        this._onTypesInstallerInitFailed.fire(
          (event as proto.TypesInstallerInitializationFailedEvent).body
        );
        break;
      case 'surveyReady':
        this._onSurveyReady.fire((event as proto.SurveyReadyEvent).body);
        break;
      case 'projectLoadingStart':
        this.loadingIndicator.startedLoadingProject(
          (event as proto.ProjectLoadingStartEvent).body.projectName
        );
        break;
      case 'projectLoadingFinish':
        this.loadingIndicator.finishedLoadingProject(
          (event as proto.ProjectLoadingFinishEvent).body.projectName
        );
        break;
    }
  }

  private dispatchTelemetryEvent(telemetryData: proto.TelemetryEventBody): void {
    const properties: qu.Dict<string> = Object.create(null);
    const typingsInstalledPayload: proto.TypingsInstalledTelemetryEventPayload = telemetryData.payload as proto.TypingsInstalledTelemetryEventPayload;
    const payload = telemetryData.payload;
    switch (telemetryData.telemetryEventName) {
      case 'typingsInstalled':
        properties['installedPackages'] = typingsInstalledPayload.installedPackages;
        if (typeof typingsInstalledPayload.installSuccess === 'boolean') {
          properties[
            'installSuccess'
          ] = typingsInstalledPayload.installSuccess.toString();
        }
        if (typeof typingsInstalledPayload.typingsInstallerVersion === 'string') {
          properties['typingsInstallerVersion'] =
            typingsInstalledPayload.typingsInstallerVersion;
        }
        break;
      default:
        if (payload) {
          Object.keys(payload).forEach((key) => {
            try {
              if (payload.hasOwnProperty(key)) {
                properties[key] =
                  typeof payload[key] === 'string'
                    ? payload[key]
                    : JSON.stringify(payload[key]);
              }
            } catch (e) {}
          });
        }
        break;
    }
    if (telemetryData.telemetryEventName === 'projectInfo') {
      if (this.serverState.type === ServerState.Type.Running) {
        this.serverState.updateVersion(properties['version']);
      }
    }
    this.logTelemetry(telemetryData.telemetryEventName, properties);
  }

  private configurePlugin(pluginName: string, configuration: {}): any {
    this.executeNoResponse('configurePlugin', {
      pluginName,
      configuration,
    });
  }
}

function getReportIssueArgsForError(
  e: ServerError
): { extensionId: string; issueTitle: string; issueBody: string } | undefined {
  if (!e.stack || !e.message) return;
  return {
    extensionId: 'vsc.typescript-language-features',
    issueTitle: `TS Server fatal error:  ${e.message}`,

    issueBody: `**TypeScript Version:** ${e.version.api?.fullVersion}

**Steps to reproduce crash**

1.
2.
3.

**TS Server Error Stack**

\`\`\`
${e.stack}
\`\`\``,
  };
}

function getDignosticsKind(event: proto.Event) {
  switch (event.event) {
    case 'syntaxDiag':
      return Kind.Syntax;
    case 'semanticDiag':
      return Kind.Semantic;
    case 'suggestionDiag':
      return Kind.Suggestion;
  }
  throw new Error('Unknown dignostics kind');
}

class ServerInitializingIndicator extends qx.Disposable {
  private _task?: {
    project: string | undefined;
    resolve: () => void;
    reject: () => void;
  };

  reset(): void {
    if (this._task) {
      this._task.reject();
      this._task = undefined;
    }
  }

  startedLoadingProject(projectName: string | undefined): void {
    this.reset();
    vsc.window.withProgress(
      {
        location: vsc.ProgressLocation.Window,
        title: localize('serverLoading.progress', 'Initializing JS/TS language features'),
      },
      () =>
        new Promise((resolve, reject) => {
          this._task = { project: projectName, resolve, reject };
        })
    );
  }

  finishedLoadingProject(projectName: string | undefined): void {
    if (this._task && this._task.project === projectName) {
      this._task.resolve();
      this._task = undefined;
    }
  }
}
