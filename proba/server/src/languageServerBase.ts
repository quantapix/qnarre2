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
import { getNestedProperty } from './utils/collection';
import { ConfigOptions } from './utils/options';
import { QConsole } from './utils/misc';
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
import { AnalyzerServiceExecutor } from './languageService/analyzerServiceExecutor';
import { WorkspaceMap } from './langServer';

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
  readonly console: QConsole;
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

  protected abstract async executeCodeAction(
    ps: CodeActionParams,
    token: CancellationToken
  ): Promise<(Command | CodeAction)[] | undefined | null>;

  protected isOpenFilesOnly(diagnosticMode: string) {
    return diagnosticMode !== 'workspace';
  }

  protected createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
    return new ImportResolver(fs, options);
  }

  protected setExtension(extension: any) {
    this._extension = extension;
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

  updateOptionsAndRestartService(
    ws: WorkspaceServiceInstance,
    ss: ServerSettings,
    n?: string
  ) {
    AnalyzerServiceExecutor.runWithOptions(this.rootPath, ws, ss, n);
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
}
