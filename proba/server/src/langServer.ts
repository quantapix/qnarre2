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
  InitializeParams,
  Location,
  ParameterInformation,
  SignatureInformation,
  SymbolInformation,
  TextDocumentSyncKind,
  WatchKind,
  WorkDoneProgressReporter,
  WorkspaceEdit,
} from 'vscode-languageserver';

import { createDeferred } from './common/deferred';
import { CancelAfter, connOptions } from './common/cancellationUtils';
import { containsPath, pathToUri, uriToPath } from './common/pathUtils';

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
  disableOrganizeImports?: boolean;
  isInitialized: Deferred<boolean>;
}

export function getCapability<T>(ps: InitializeParams, n: string, d: T) {
  const ks = n.split('.');
  let c: any = ps.capabilities;
  for (let i = 0; c && i < ks.length; i++) {
    if (!c.hasOwnProperty(ks[i])) return d;
    c = c[ks[i]];
  }
  return c;
}

export abstract class LangServer {
  protected _conn: IConnection = createConnection(connOptions());
  protected _wsMap = new WorkspaceMap(this);
  protected _hasConfig = false;
  protected _hasWatch = false;
  protected _hasSnippets = false;
  protected _hasFoldLimit = false;
  protected _hasHierSymbols = false;
  protected _hasDynRegistry = false;
  rootPath = '';

  constructor(
    protected _name: string,
    rootDir: string,
    protected _cmds = [] as string[]
  ) {
    this._conn.console.log(`${this._name} language server starting`);
    this._conn.console.log(`Server root directory: ${rootDir}`);

    process.on('unhandledRejection', (e: any) => {
      console.error(formatError(`Unhandled exception`, e));
    });
    process.on('uncaughtException', (e: any) => {
      console.error(formatError(`Unhandled exception`, e));
    });

    this._prepConn();
    this._conn.listen();
  }

  get console() {
    return this._conn.console;
  }

  get window() {
    return this._conn.window;
  }

  async workspaceFor(path: string) {
    const ws = this._wsMap.workspaceFor(path);
    await ws.isInitialized.promise;
    return ws;
  }

  protected isLongRunning(_: string) {
    return true;
  }

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

  abstract async getSettings(ws: WorkspaceServiceInstance): Promise<ServerSettings>;

  async updateSettingsFor(ws: WorkspaceServiceInstance) {
    const ss = await this.getSettings(ws);
    this.updateOptionsAndRestartService(ws, ss);
    ws.disableServices = ss.disableServices;
    ws.disableOrganizeImports = ss.disableOrganizeImports;
    ws.isInitialized.resolve(true);
  }

  updateSettingsForAll() {
    this._wsMap.forEach((ws) => {
      this.updateSettingsFor(ws).ignoreErrors();
    });
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

  protected abstract _prepConn(_cmds: string[]): void;

  protected async progReporter(
    done: string | number | undefined,
    reporter: WorkDoneProgressReporter,
    title: string
  ) {
    if (done) return reporter;
    const p = await this._conn.window.createWorkDoneProgress();
    p.begin(title, undefined, undefined, true);
    return p;
  }

  protected recordTime() {
    this._wsMap.forEach((ws) => {
      ws.service.recordUserInteractionTime();
    });
  }

  protected initialize(ps: InitializeParams): InitializeResult {
    this.rootPath = ps.rootPath || '';
    const cs = ps.capabilities;
    this._hasConfig = getCapability(ps, 'workspace.configuration', false);
    this._hasWatch = !!cs.workspace?.didChangeWatchedFiles?.dynamicRegistration;
    this._hasSnippets = getCapability(
      ps,
      'textDocument.completion.completionItem.snippetSupport',
      false
    );
    this._hasFoldLimit = getCapability(
      ps,
      'textDocument.foldingRange.rangeLimit',
      Number.MAX_VALUE
    );
    this._hasHierSymbols = getCapability(
      ps,
      'textDocument.documentSymbol.hierarchicalDocumentSymbolSupport',
      false
    );
    this._hasDynRegistry =
      getCapability(ps, 'textDocument.rangeFormatting.dynamicRegistration', false) &&
      typeof ps.initializationOptions?.provideFormatter !== 'boolean';

    if (ps.workspaceFolders) {
      ps.workspaceFolders.forEach((f) => {
        const p = uriToPath(f.uri);
        this._wsMap.set(p, {
          name: f.name,
          rootPath: p,
          rootUri: f.uri,
          service: this.createAnalyzerService(f.name),
          disableServices: false,
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
          commands: this._cmds,
          workDoneProgress: true,
        },
      },
    };
  }
}

export class WorkspaceMap extends Map<string, WorkspaceServiceInstance> {
  private _default = '<default>';

  constructor(private _server: LangServer) {
    super();
  }

  nonDefaults(): WorkspaceServiceInstance[] {
    const ws: WorkspaceServiceInstance[] = [];
    this.forEach((w) => {
      if (w.rootPath) ws.push(w);
    });
    return ws;
  }

  workspaceFor(path: string): WorkspaceServiceInstance {
    let p: string | undefined;
    let ws: WorkspaceServiceInstance | undefined;
    this.forEach((w) => {
      if (w.rootPath) {
        if (path.startsWith(w.rootPath)) {
          if (p === undefined || w.rootPath.startsWith(p)) {
            p = w.rootPath;
            ws = w;
          }
        }
      }
    });
    if (!ws) {
      let d = this.get(this._default);
      if (!d) {
        const ns = [...this.keys()];
        if (ns.length === 1) return this.get(ns[0])!;
        d = {
          name: '',
          rootPath: '',
          rootUri: '',
          service: this._server.createAnalyzerService(this._default),
          disableServices: false,
          disableOrganizeImports: false,
          isInitialized: createDeferred<boolean>(),
        };
        this.set(this._default, d);
        this._server.updateSettingsFor(d).ignoreErrors();
      }
      return d;
    }
    return ws;
  }
}
