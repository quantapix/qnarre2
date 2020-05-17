import './common/extensions';

import * as fs from 'fs';
import {
  CancellationToken,
  CancellationTokenSource,
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  Command,
  CompletionTriggerKind,
  ConfigurationItem,
  ConnectionOptions,
  createConnection,
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  DiagnosticTag,
  DidChangeWatchedFilesNotification,
  DocumentSymbol,
  ExecuteCommandParams,
  IConnection,
  InitializeResult,
  Location,
  ParameterInformation,
  SignatureInformation,
  SymbolInformation,
  TextDocumentSyncKind,
  WatchKind,
  WorkDoneProgressReporter,
  WorkspaceEdit,
} from 'vscode-languageserver';

import { AnalysisResults } from './analyzer/analysis';
import { ImportResolver } from './analyzer/importResolver';
import { MaxAnalysisTime } from './analyzer/program';
import { AnalyzerService, configFileNames } from './analyzer/service';
import { BackgroundAnalysisBase } from './backgroundAnalysisBase';
import { CancelAfter, getCancellationStrategyFromArgv } from './common/cancellationUtils';
import { getNestedProperty } from './common/collectionUtils';
import { ConfigOptions } from './common/configOptions';
import { ConsoleInterface } from './common/console';
import { createDeferred, Deferred } from './common/deferred';
import {
  Diagnostic as AnalyzerDiagnostic,
  DiagnosticCategory,
} from './common/diagnostic';
import { LanguageServiceExtension } from './common/extensibility';
import {
  createFromRealFileSystem,
  FileSystem,
  FileWatcher,
  FileWatcherEventHandler,
  FileWatcherEventType,
} from './common/fileSystem';
import { containsPath, pathToUri, uriToPath } from './common/pathUtils';
import { convertWorkspaceEdits } from './common/textEditUtils';
import { Position } from './common/textRange';
import { AnalyzerServiceExecutor } from './languageService/analyzerServiceExecutor';
import { CompletionItemData } from './languageService/completionProvider';
import { convertHoverResults } from './languageService/hoverProvider';
import { WorkspaceMap } from './langServer';

export interface ServerSettings {
  venvPath?: string;
  pythonPath?: string;
  typeshedPath?: string;
  stubPath?: string;
  openFilesOnly?: boolean;
  typeCheckingMode?: string;
  useLibraryCodeForTypes?: boolean;
  disableServices?: boolean;
  disableOrganizeImports?: boolean;
  autoSearchPaths?: boolean;
  extraPaths?: string[];
  watchForSourceChanges?: boolean;
  watchForLibraryChanges?: boolean;
}

export interface WorkspaceServiceInstance {
  name: string;
  rootUri: string;
  rootPath: string;
  service: AnalyzerService;
  disableServices?: boolean;
  disableOrganizeImports: boolean;
  isInitialized: Deferred<boolean>;
}

export interface WindowInterface {
  showErrorMessage(message: string): void;
  showWarningMessage(message: string): void;
  showInformationMessage(message: string): void;
}

export interface LanguageServerInterface {
  workspaceFor(f: string): Promise<WorkspaceServiceInstance>;
  getSettings(ws: WorkspaceServiceInstance): Promise<ServerSettings>;
  createBackgroundAnalysis(): BackgroundAnalysisBase | undefined;
  reanalyze(): void;
  restart(): void;

  readonly rootPath: string;
  readonly console: ConsoleInterface;
  readonly window: WindowInterface;
  readonly fs: FileSystem;
}

interface InternalFileWatcher extends FileWatcher {
  // Paths that are being watched within the workspace
  workspacePaths: string[];

  // Event handler to call
  eventHandler: FileWatcherEventHandler;
}

export abstract class LanguageServerBase implements LanguageServerInterface {
  protected _conn: IConnection = createConnection(this._GetConnectionOptions());
  protected _wsMap: WorkspaceMap;
  protected _hasConfig = false;
  protected _hasWatch = false;
  protected _defaultClientConfig: any;

  // Tracks whether we're currently displaying prog.
  private _isDisplayingProgress = false;

  // Tracks active file system watchers.
  private _fileWatchers: InternalFileWatcher[] = [];

  // We support running only one "find all reference" at a time.
  private _pendingFindAllRefsCancellationSource: CancellationTokenSource | undefined;

  // We support running only one command at a time.
  private _pendingCommandCancellationSource: CancellationTokenSource | undefined;

  // Global root path - the basis for all global settings.
  rootPath = '';

  // File system abstraction.
  fs: FileSystem;

  constructor(
    private _productName: string,
    rootDirectory: string,
    private _extension?: LanguageServiceExtension,
    private _maxAnalysisTimeInForeground?: MaxAnalysisTime,
    supportedCommands?: string[]
  ) {
    this._conn.console.log(`${_productName} language server starting`);
    this.fs = createFromRealFileSystem(this._conn.console, this);

    const moduleDirectory = this.fs.getModulePath();
    if (moduleDirectory) {
      this.fs.chdir(moduleDirectory);
    }

    (global as any).__rootDirectory = rootDirectory;
    this._conn.console.log(`Server root directory: ${rootDirectory}`);

    this._wsMap = new WorkspaceMap(this);

    this._setupConnection(supportedCommands ?? []);

    this._conn.listen();
  }

  abstract createBackgroundAnalysis(): BackgroundAnalysisBase | undefined;

  protected abstract async executeCommand(
    ps: ExecuteCommandParams,
    token: CancellationToken
  ): Promise<any>;

  protected isLongRunningCommand(_: string) {
    return true;
  }

  protected abstract async executeCodeAction(
    ps: CodeActionParams,
    token: CancellationToken
  ): Promise<(Command | CodeAction)[] | undefined | null>;

  abstract async getSettings(ws: WorkspaceServiceInstance): Promise<ServerSettings>;

  protected getConfiguration(ws: WorkspaceServiceInstance, section: string) {
    if (this._hasConfig) {
      const scopeUri = ws.rootUri ? ws.rootUri : undefined;
      const item: ConfigurationItem = {
        scopeUri,
        section,
      };
      return this._conn.workspace.getConfiguration(item);
    }
    if (this._defaultClientConfig)
      return getNestedProperty(this._defaultClientConfig, section);
    return;
  }

  protected isOpenFilesOnly(diagnosticMode: string) {
    return diagnosticMode !== 'workspace';
  }

  protected createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
    return new ImportResolver(fs, options);
  }

  protected setExtension(extension: any) {
    this._extension = extension;
  }

  get console() {
    return this._conn.console;
  }

  get window() {
    return this._conn.window;
  }

  createAnalyzerService(name: string): AnalyzerService {
    this._conn.console.log(`Starting service instance "${name}"`);
    const s = new AnalyzerService(
      name,
      this.fs,
      this._conn.console,
      this.createImportResolver.bind(this),
      undefined,
      this._extension,
      this.createBackgroundAnalysis(),
      this._maxAnalysisTimeInForeground
    );
    s.setCompletionCallback((rs) => this.onAnalysisCompletedHandler(rs));
    return s;
  }

  async workspaceFor(p: string) {
    const ws = this._wsMap.workspaceFor(p);
    await ws.isInitialized.promise;
    return ws;
  }

  reanalyze() {
    this._wsMap.forEach((ws) => {
      ws.service.invalidateAndForceReanalysis();
    });
  }

  restart() {
    this._wsMap.forEach((ws) => {
      ws.service.restart();
    });
  }

  createFileWatcher(paths: string[], listener: FileWatcherEventHandler): FileWatcher {
    const lsBase = this;
    const ps: string[] = [];
    const nps: string[] = [];
    const wss = this._wsMap.nonDefaults();
    paths.forEach((p) => {
      if (wss.some((ws) => containsPath(ws.rootPath, p))) ps.push(p);
      else nps.push(p);
    });
    const nodeWatchers = nps.map((p) => {
      return fs.watch(p, { recursive: true }, listener);
    });
    const fileWatcher: InternalFileWatcher = {
      close() {
        lsBase._fileWatchers = lsBase._fileWatchers.filter((w) => w !== fileWatcher);
        nodeWatchers.forEach((w) => {
          w.close();
        });
      },
      workspacePaths: ps,
      eventHandler: listener,
    };
    this._fileWatchers.push(fileWatcher);
    return fileWatcher;
  }

  private _setupConnection(supportedCommands: string[]): void {
    this._conn.onInitialize(
      (ps): InitializeResult => {
        this.rootPath = ps.rootPath || '';
        const capabilities = ps.capabilities;
        this._hasConfig = !!capabilities.workspace?.configuration;
        this._hasWatch = !!capabilities.workspace?.didChangeWatchedFiles
          ?.dynamicRegistration;
        if (ps.workspaceFolders) {
          ps.workspaceFolders.forEach((folder) => {
            const path = uriToPath(folder.uri);
            this._wsMap.set(path, {
              name: folder.name,
              rootPath: path,
              rootUri: folder.uri,
              service: this.createAnalyzerService(folder.name),
              disableOrganizeImports: false,
              isInitialized: createDeferred<boolean>(),
            });
          });
        } else if (ps.rootPath) {
          this._wsMap.set(ps.rootPath, {
            name: '',
            rootPath: ps.rootPath,
            rootUri: '',
            service: this.createAnalyzerService(ps.rootPath),
            disableServices: false,
            disableOrganizeImports: false,
            isInitialized: createDeferred<boolean>(),
          });
        }
        return {
          capabilities: {
            textDocumentSync: TextDocumentSyncKind.Full,
            definitionProvider: { workDoneProgress: true },
            referencesProvider: { workDoneProgress: true },
            documentSymbolProvider: { workDoneProgress: true },
            workspaceSymbolProvider: { workDoneProgress: true },
            hoverProvider: { workDoneProgress: true },
            renameProvider: { workDoneProgress: true },
            completionProvider: {
              triggerCharacters: ['.', '['],
              resolveProvider: true,
              workDoneProgress: true,
            },
            signatureHelpProvider: {
              triggerCharacters: ['(', ',', ')'],
              workDoneProgress: true,
            },
            codeActionProvider: {
              codeActionKinds: [
                CodeActionKind.QuickFix,
                CodeActionKind.SourceOrganizeImports,
              ],
              workDoneProgress: true,
            },
            executeCommandProvider: {
              commands: supportedCommands,
              workDoneProgress: true,
            },
          },
        };
      }
    );

    this._conn.onDidChangeConfiguration((ps) => {
      this._conn.console.log(`Received updated settings`);
      if (ps?.settings) this._defaultClientConfig = ps?.settings;
      this.updateSettingsForAllWorkspaces();
    });

    this._conn.onCodeAction((ps, token) => this.executeCodeAction(ps, token));

    this._conn.onDefinition(async (ps, token) => {
      this.recordUserInteractionTime();
      const f = uriToPath(ps.textDocument.uri);
      const p: Position = {
        line: ps.position.line,
        character: ps.position.character,
      };
      const ws = await this.workspaceFor(f);
      if (ws.disableServices) return;
      const ls = ws.service.getDefinitionForPosition(f, p, token);
      if (!ls) return;
      return ls.map((l) => Location.create(pathToUri(l.path), l.range));
    });

    this._conn.onReferences(async (ps, token, reporter) => {
      if (this._pendingFindAllRefsCancellationSource) {
        this._pendingFindAllRefsCancellationSource.cancel();
        this._pendingFindAllRefsCancellationSource = undefined;
      }
      const prog = await this._getProgressReporter(
        ps.workDoneToken,
        reporter,
        'finding references'
      );
      const src = CancelAfter(token, prog.token);
      this._pendingFindAllRefsCancellationSource = src;
      try {
        const f = uriToPath(ps.textDocument.uri);
        const p: Position = {
          line: ps.position.line,
          character: ps.position.character,
        };
        const ws = await this.workspaceFor(f);
        if (ws.disableServices) return;
        const ls = ws.service.getReferencesForPosition(
          f,
          p,
          ps.context.includeDeclaration,
          src.token
        );
        if (!ls) return;
        return ls.map((l) => Location.create(pathToUri(l.path), l.range));
      } finally {
        prog.done();
        src.dispose();
      }
    });

    this._conn.onDocumentSymbol(async (ps, token) => {
      this.recordUserInteractionTime();
      const f = uriToPath(ps.textDocument.uri);
      const ws = await this.workspaceFor(f);
      if (ws.disableServices) return;
      const ss: DocumentSymbol[] = [];
      ws.service.addSymbolsForDocument(f, ss, token);
      return ss;
    });

    this._conn.onWorkspaceSymbol(async (ps, token) => {
      const ss: SymbolInformation[] = [];
      await Promise.all(
        Array.from(this._wsMap.values()).map(async (w) => {
          await w.isInitialized.promise;
          if (!w.disableServices) {
            w.service.addSymbolsForWorkspace(ss, ps.query, token);
          }
        })
      );
      return ss;
    });

    this._conn.onHover(async (ps, token) => {
      const f = uriToPath(ps.textDocument.uri);
      const p: Position = {
        line: ps.position.line,
        character: ps.position.character,
      };
      const ws = await this.workspaceFor(f);
      const rs = ws.service.getHoverForPosition(f, p, token);
      return convertHoverResults(rs);
    });

    this._conn.onSignatureHelp(async (ps, token) => {
      const f = uriToPath(ps.textDocument.uri);
      const p: Position = {
        line: ps.position.line,
        character: ps.position.character,
      };
      const ws = await this.workspaceFor(f);
      if (ws.disableServices) return;
      const rs = ws.service.getSignatureHelpForPosition(f, p, token);
      if (!rs) return;
      return {
        signatures: rs.signatures.map((s) => {
          let i: ParameterInformation[] = [];
          if (s.parameters) {
            i = s.parameters.map((p) => {
              return ParameterInformation.create(
                [p.startOffset, p.endOffset],
                p.documentation
              );
            });
          }
          return SignatureInformation.create(s.label, s.documentation, ...i);
        }),
        activeSignature: rs.activeSignature !== undefined ? rs.activeSignature : null,
        activeParameter: rs.activeParameter !== undefined ? rs.activeParameter : -1,
      };
    });

    let lastTriggerKind: CompletionTriggerKind | undefined =
      CompletionTriggerKind.Invoked;

    this._conn.onCompletion(async (ps, token) => {
      const c =
        lastTriggerKind !== CompletionTriggerKind.TriggerForIncompleteCompletions ||
        ps.context?.triggerKind !== CompletionTriggerKind.TriggerForIncompleteCompletions;
      lastTriggerKind = ps.context?.triggerKind;
      const f = uriToPath(ps.textDocument.uri);
      const p: Position = {
        line: ps.position.line,
        character: ps.position.character,
      };
      const ws = await this.workspaceFor(f);
      if (ws.disableServices) return;
      const cs = await ws.service.getCompletionsForPosition(f, p, ws.rootPath, token);
      if (cs) cs.isIncomplete = c;
      return cs;
    });

    this._conn.onCompletionResolve(async (ps, token) => {
      const d = ps.data as CompletionItemData;
      if (d && d.filePath) {
        const ws = await this.workspaceFor(d.workspacePath);
        ws.service.resolveCompletionItem(d.filePath, ps, token);
      }
      return ps;
    });

    this._conn.onRenameRequest(async (ps, token) => {
      const f = uriToPath(ps.textDocument.uri);
      const p: Position = {
        line: ps.position.line,
        character: ps.position.character,
      };
      const ws = await this.workspaceFor(f);
      if (ws.disableServices) return;
      const es = ws.service.renameSymbolAtPosition(f, p, ps.newName, token);
      if (!es) return;
      return convertWorkspaceEdits(es);
    });

    this._conn.onDidOpenTextDocument((ps) => {
      const f = uriToPath(ps.textDocument.uri);
      const ws = await this.workspaceFor(f).resolve();
      ws.service.setFileOpened(f, ps.textDocument.version, ps.textDocument.text);
    });

    this._conn.onDidOpenTextDocument(async (ps) => {
      const f = uriToPath(ps.textDocument.uri);
      const ws = await this.workspaceFor(f);
      ws.service.setFileOpened(f, ps.textDocument.version, ps.textDocument.text);
    });

    this._conn.onDidChangeTextDocument(async (ps) => {
      this.recordUserInteractionTime();
      const f = uriToPath(ps.textDocument.uri);
      const ws = await this.workspaceFor(f);
      ws.service.updateOpenFileContents(
        f,
        ps.textDocument.version,
        ps.contentChanges[0].text
      );
    });

    this._conn.onDidCloseTextDocument(async (ps) => {
      const f = uriToPath(ps.textDocument.uri);
      const ws = await this.workspaceFor(f);
      ws.service.setFileClosed(f);
    });

    this._conn.onDidChangeWatchedFiles((ps) => {
      ps.changes.forEach((e) => {
        const p = uriToPath(e.uri);
        const t: FileWatcherEventType = e.type === 1 ? 'add' : 'change';
        this._fileWatchers.forEach((w) => {
          if (w.workspacePaths.some((d) => containsPath(d, p))) w.eventHandler(t, p);
        });
      });
    });

    this._conn.onInitialized(() => {
      this._conn.workspace.onDidChangeWorkspaceFolders((e) => {
        e.removed.forEach((ws) => {
          const p = uriToPath(ws.uri);
          this._wsMap.delete(p);
        });
        e.added.forEach(async (ws) => {
          const rootPath = uriToPath(ws.uri);
          const newWorkspace: WorkspaceServiceInstance = {
            name: ws.name,
            rootPath,
            rootUri: ws.uri,
            service: this.createAnalyzerService(ws.name),
            disableOrganizeImports: false,
            isInitialized: createDeferred<boolean>(),
          };
          this._wsMap.set(rootPath, newWorkspace);
          await this.updateSettingsForWorkspace(newWorkspace);
        });
      });
      if (this._hasWatch) {
        this._conn.client.register(DidChangeWatchedFilesNotification.type, {
          watchers: [
            ...configFileNames.map((f) => {
              return {
                globPattern: `**/${f}`,
                kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete,
              };
            }),
            {
              globPattern: '**/*.{py,pyi}',
              kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete,
            },
          ],
        });
      }
    });

    this._conn.onExecuteCommand(async (ps, token, reporter) => {
      if (this._pendingCommandCancellationSource) {
        this._pendingCommandCancellationSource.cancel();
        this._pendingCommandCancellationSource = undefined;
      }
      const cmd = async (t: CancellationToken) => {
        const r = await this.executeCommand(ps, t);
        if (WorkspaceEdit.is(r)) this._conn.workspace.applyEdit(r);
      };
      if (this.isLongRunningCommand(ps.command)) {
        const prog = await this._getProgressReporter(
          ps.workDoneToken,
          reporter,
          'Executing command'
        );
        const s = CancelAfter(token, prog.token);
        this._pendingCommandCancellationSource = s;
        try {
          cmd(s.token);
        } finally {
          prog.done();
          s.dispose();
        }
      } else cmd(token);
    });
  }

  updateSettingsForAllWorkspaces(): void {
    this._wsMap.forEach((ws) => {
      this.updateSettingsForWorkspace(ws).ignoreErrors();
    });
  }

  protected onAnalysisCompletedHandler(rs: AnalysisResults): void {
    rs.diagnostics.forEach((f) => {
      const diagnostics = this._convertDiagnostics(f.diagnostics);
      this._conn.sendDiagnostics({
        uri: pathToUri(f.filePath),
        diagnostics,
      });
      if (rs.filesRequiringAnalysis > 0) {
        if (!rs.checkingOnlyOpenFiles) {
          if (!this._isDisplayingProgress) {
            this._isDisplayingProgress = true;
            this._conn.sendNotification('pyright/beginProgress');
          }
          const fs = rs.filesRequiringAnalysis !== 1 ? 'files' : 'file';
          this._conn.sendNotification(
            'pyright/reportProgress',
            `${rs.filesRequiringAnalysis} ${fs} to analyze`
          );
        }
      } else {
        if (this._isDisplayingProgress) {
          this._isDisplayingProgress = false;
          this._conn.sendNotification('pyright/endProgress');
        }
      }
    });
  }

  async updateSettingsForWorkspace(ws: WorkspaceServiceInstance) {
    const ss = await this.getSettings(ws);
    this.updateOptionsAndRestartService(ws, ss);
    ws.disableServices = !!ss.disableServices;
    ws.disableOrganizeImports = !!ss.disableOrganizeImports;
    ws.isInitialized.resolve(true);
  }

  updateOptionsAndRestartService(
    ws: WorkspaceServiceInstance,
    ss: ServerSettings,
    n?: string
  ) {
    AnalyzerServiceExecutor.runWithOptions(this.rootPath, ws, ss, n);
  }

  private async _getProgressReporter(
    workDoneToken: string | number | undefined,
    reporter: WorkDoneProgressReporter,
    title: string
  ) {
    if (workDoneToken) return reporter;
    const p = await this._conn.window.createWorkDoneProgress();
    p.begin(title, undefined, undefined, true);
    return p;
  }

  private _GetConnectionOptions(): ConnectionOptions {
    return { cancellationStrategy: getCancellationStrategyFromArgv(process.argv) };
  }

  private _convertDiagnostics(ds: AnalyzerDiagnostic[]): Diagnostic[] {
    return ds.map((d) => {
      const severity =
        d.category === DiagnosticCategory.Error
          ? DiagnosticSeverity.Error
          : DiagnosticSeverity.Warning;
      let src = this._productName;
      const rule = d.getRule();
      if (rule) src = `${src} (${rule})`;
      const vsDiag = Diagnostic.create(d.range, d.message, severity, undefined, src);
      if (d.category === DiagnosticCategory.UnusedCode) {
        vsDiag.tags = [DiagnosticTag.Unnecessary];
        vsDiag.severity = DiagnosticSeverity.Hint;
      }
      const ii = d.getRelatedInfo();
      if (ii.length) {
        vsDiag.relatedInformation = ii.map((i) => {
          return DiagnosticRelatedInformation.create(
            Location.create(pathToUri(i.filePath), i.range),
            i.message
          );
        });
      }
      return vsDiag;
    });
  }

  protected recordUserInteractionTime() {
    this._wsMap.forEach((ws) => {
      ws.service.recordUserInteractionTime();
    });
  }
}
