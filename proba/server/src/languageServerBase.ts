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
  RemoteConsole,
  RemoteWindow,
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
import { containsPath, convertPathToUri, convertUriToPath } from './common/pathUtils';
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
  disableLanguageServices?: boolean;
  disableOrganizeImports?: boolean;
  autoSearchPaths?: boolean;
  extraPaths?: string[];
  watchForSourceChanges?: boolean;
  watchForLibraryChanges?: boolean;
}

export interface WorkspaceServiceInstance {
  workspaceName: string;
  rootPath: string;
  rootUri: string;
  serviceInstance: AnalyzerService;
  disableLanguageServices: boolean;
  disableOrganizeImports: boolean;
  isInitialized: Deferred<boolean>;
}

export interface WindowInterface {
  showErrorMessage(message: string): void;
  showWarningMessage(message: string): void;
  showInformationMessage(message: string): void;
}

export interface LanguageServerInterface {
  getWorkspaceForFile(filePath: string): Promise<WorkspaceServiceInstance>;
  getSettings(workspace: WorkspaceServiceInstance): Promise<ServerSettings>;
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

  // Tracks whether we're currently displaying progress.
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

    // Set the working directory to a known location within
    // the extension directory. Otherwise the execution of
    // python can have unintended and surprising results.
    const moduleDirectory = this.fs.getModulePath();
    if (moduleDirectory) {
      this.fs.chdir(moduleDirectory);
    }

    // Stash the base directory into a global variable.
    (global as any).__rootDirectory = rootDirectory;
    this._conn.console.log(`Server root directory: ${rootDirectory}`);

    // Create workspace map.
    this._wsMap = new WorkspaceMap(this);

    // Set up callbacks.
    this._setupConnection(supportedCommands ?? []);

    // Listen on the connection.
    this._conn.listen();
  }

  abstract createBackgroundAnalysis(): BackgroundAnalysisBase | undefined;

  protected abstract async executeCommand(
    params: ExecuteCommandParams,
    token: CancellationToken
  ): Promise<any>;

  protected isLongRunningCommand(command: string): boolean {
    // By default, all commands are considered "long-running" and should
    // display a cancelable progress dialog. Servers can override this
    // to avoid showing the progress dialog for commands that are
    // guaranteed to be quick.
    return true;
  }

  protected abstract async executeCodeAction(
    params: CodeActionParams,
    token: CancellationToken
  ): Promise<(Command | CodeAction)[] | undefined | null>;

  abstract async getSettings(
    workspace: WorkspaceServiceInstance
  ): Promise<ServerSettings>;

  protected getConfiguration(workspace: WorkspaceServiceInstance, section: string) {
    if (this._hasConfig) {
      const scopeUri = workspace.rootUri ? workspace.rootUri : undefined;
      const item: ConfigurationItem = {
        scopeUri,
        section,
      };
      return this._conn.workspace.getConfiguration(item);
    }

    if (this._defaultClientConfig) {
      return getNestedProperty(this._defaultClientConfig, section);
    }

    return undefined;
  }

  protected isOpenFilesOnly(diagnosticMode: string): boolean {
    return diagnosticMode !== 'workspace';
  }

  protected createImportResolver(fs: FileSystem, options: ConfigOptions): ImportResolver {
    return new ImportResolver(fs, options);
  }

  protected setExtension(extension: any): void {
    this._extension = extension;
  }

  // Provides access to logging to the client output window.
  get console(): RemoteConsole {
    return this._conn.console;
  }

  // Provides access to the client's window.
  get window(): RemoteWindow {
    return this._conn.window;
  }

  // Creates a service instance that's used for analyzing a
  // program within a workspace.
  createAnalyzerService(name: string): AnalyzerService {
    this._conn.console.log(`Starting service instance "${name}"`);
    const service = new AnalyzerService(
      name,
      this.fs,
      this._conn.console,
      this.createImportResolver.bind(this),
      undefined,
      this._extension,
      this.createBackgroundAnalysis(),
      this._maxAnalysisTimeInForeground
    );

    service.setCompletionCallback((results) => this.onAnalysisCompletedHandler(results));

    return service;
  }

  async getWorkspaceForFile(filePath: string): Promise<WorkspaceServiceInstance> {
    const workspace = this._wsMap.getWorkspaceForFile(filePath);
    await workspace.isInitialized.promise;
    return workspace;
  }

  reanalyze() {
    this._wsMap.forEach((workspace) => {
      workspace.serviceInstance.invalidateAndForceReanalysis();
    });
  }

  restart() {
    this._wsMap.forEach((workspace) => {
      workspace.serviceInstance.restart();
    });
  }

  createFileWatcher(paths: string[], listener: FileWatcherEventHandler): FileWatcher {
    // Capture "this" so we can reference it within the "close" method below.
    const lsBase = this;

    // Determine which paths are located within one or more workspaces.
    // Those are already covered by existing file watchers handled by
    // the client.
    const workspacePaths: string[] = [];
    const nonWorkspacePaths: string[] = [];
    const workspaces = this._wsMap.getNonDefaultWorkspaces();

    paths.forEach((path) => {
      if (workspaces.some((workspace) => containsPath(workspace.rootPath, path))) {
        workspacePaths.push(path);
      } else {
        nonWorkspacePaths.push(path);
      }
    });

    // For any non-workspace paths, use the node file watcher.
    const nodeWatchers = nonWorkspacePaths.map((path) => {
      return fs.watch(path, { recursive: true }, listener);
    });

    const fileWatcher: InternalFileWatcher = {
      close() {
        // Stop listening for workspace paths.
        lsBase._fileWatchers = lsBase._fileWatchers.filter(
          (watcher) => watcher !== fileWatcher
        );

        // Close the node watchers.
        nodeWatchers.forEach((watcher) => {
          watcher.close();
        });
      },
      workspacePaths,
      eventHandler: listener,
    };

    // Record the file watcher.
    this._fileWatchers.push(fileWatcher);

    return fileWatcher;
  }

  private _setupConnection(supportedCommands: string[]): void {
    // After the server has started the client sends an initialize request. The server receives
    // in the passed params the rootPath of the workspace plus the client capabilities.
    this._conn.onInitialize(
      (params): InitializeResult => {
        this.rootPath = params.rootPath || '';

        // Does the client support the `workspace/configuration` request?
        const capabilities = params.capabilities;
        this._hasConfig = !!capabilities.workspace?.configuration;
        this._hasWatch = !!capabilities.workspace?.didChangeWatchedFiles
          ?.dynamicRegistration;

        // Create a service instance for each of the workspace folders.
        if (params.workspaceFolders) {
          params.workspaceFolders.forEach((folder) => {
            const path = convertUriToPath(folder.uri);
            this._wsMap.set(path, {
              workspaceName: folder.name,
              rootPath: path,
              rootUri: folder.uri,
              serviceInstance: this.createAnalyzerService(folder.name),
              disableLanguageServices: false,
              disableOrganizeImports: false,
              isInitialized: createDeferred<boolean>(),
            });
          });
        } else if (params.rootPath) {
          this._wsMap.set(params.rootPath, {
            workspaceName: '',
            rootPath: params.rootPath,
            rootUri: '',
            serviceInstance: this.createAnalyzerService(params.rootPath),
            disableLanguageServices: false,
            disableOrganizeImports: false,
            isInitialized: createDeferred<boolean>(),
          });
        }

        return {
          capabilities: {
            // Tell the client that the server works in FULL text document
            // sync mode (as opposed to incremental).
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

    this._conn.onDidChangeConfiguration((params) => {
      this._conn.console.log(`Received updated settings`);
      if (params?.settings) {
        this._defaultClientConfig = params?.settings;
      }
      this.updateSettingsForAllWorkspaces();
    });

    this._conn.onCodeAction((params, token) => this.executeCodeAction(params, token));

    this._conn.onDefinition(async (params, token) => {
      this.recordUserInteractionTime();

      const filePath = convertUriToPath(params.textDocument.uri);

      const position: Position = {
        line: params.position.line,
        character: params.position.character,
      };

      const workspace = await this.getWorkspaceForFile(filePath);
      if (workspace.disableLanguageServices) {
        return;
      }
      const locations = workspace.serviceInstance.getDefinitionForPosition(
        filePath,
        position,
        token
      );
      if (!locations) {
        return undefined;
      }
      return locations.map((loc) =>
        Location.create(convertPathToUri(loc.path), loc.range)
      );
    });

    this._conn.onReferences(async (params, token, reporter) => {
      if (this._pendingFindAllRefsCancellationSource) {
        this._pendingFindAllRefsCancellationSource.cancel();
        this._pendingFindAllRefsCancellationSource = undefined;
      }

      // VS Code doesn't support cancellation of "final all references".
      // We provide a progress bar a cancellation button so the user can cancel
      // any long-running actions.
      const progress = await this._getProgressReporter(
        params.workDoneToken,
        reporter,
        'finding references'
      );
      const source = CancelAfter(token, progress.token);
      this._pendingFindAllRefsCancellationSource = source;

      try {
        const filePath = convertUriToPath(params.textDocument.uri);
        const position: Position = {
          line: params.position.line,
          character: params.position.character,
        };

        const workspace = await this.getWorkspaceForFile(filePath);
        if (workspace.disableLanguageServices) {
          return;
        }

        const locations = workspace.serviceInstance.getReferencesForPosition(
          filePath,
          position,
          params.context.includeDeclaration,
          source.token
        );

        if (!locations) {
          return undefined;
        }

        return locations.map((loc) =>
          Location.create(convertPathToUri(loc.path), loc.range)
        );
      } finally {
        progress.done();
        source.dispose();
      }
    });

    this._conn.onDocumentSymbol(async (params, token) => {
      this.recordUserInteractionTime();

      const filePath = convertUriToPath(params.textDocument.uri);

      const workspace = await this.getWorkspaceForFile(filePath);
      if (workspace.disableLanguageServices) {
        return undefined;
      }

      const symbolList: DocumentSymbol[] = [];
      workspace.serviceInstance.addSymbolsForDocument(filePath, symbolList, token);
      return symbolList;
    });

    this._conn.onWorkspaceSymbol(async (params, token) => {
      const symbolList: SymbolInformation[] = [];

      this._wsMap.forEach(async (workspace) => {
        await workspace.isInitialized.promise;
        if (!workspace.disableLanguageServices) {
          workspace.serviceInstance.addSymbolsForWorkspace(
            symbolList,
            params.query,
            token
          );
        }
      });

      return symbolList;
    });

    this._conn.onHover(async (params, token) => {
      const filePath = convertUriToPath(params.textDocument.uri);

      const position: Position = {
        line: params.position.line,
        character: params.position.character,
      };

      const workspace = await this.getWorkspaceForFile(filePath);
      const hoverResults = workspace.serviceInstance.getHoverForPosition(
        filePath,
        position,
        token
      );
      return convertHoverResults(hoverResults);
    });

    this._conn.onSignatureHelp(async (params, token) => {
      const filePath = convertUriToPath(params.textDocument.uri);

      const position: Position = {
        line: params.position.line,
        character: params.position.character,
      };

      const workspace = await this.getWorkspaceForFile(filePath);
      if (workspace.disableLanguageServices) {
        return;
      }
      const signatureHelpResults = workspace.serviceInstance.getSignatureHelpForPosition(
        filePath,
        position,
        token
      );
      if (!signatureHelpResults) {
        return undefined;
      }

      return {
        signatures: signatureHelpResults.signatures.map((sig) => {
          let paramInfo: ParameterInformation[] = [];
          if (sig.parameters) {
            paramInfo = sig.parameters.map((param) => {
              return ParameterInformation.create(
                [param.startOffset, param.endOffset],
                param.documentation
              );
            });
          }
          return SignatureInformation.create(sig.label, sig.documentation, ...paramInfo);
        }),
        activeSignature:
          signatureHelpResults.activeSignature !== undefined
            ? signatureHelpResults.activeSignature
            : null,
        // A value of -1 is out of bounds but is legal within the LSP (should be treated
        // as undefined). It produces a better result in VS Code by preventing it from
        // highlighting the first parameter when no parameter works, since the LSP client
        // converts null into zero.
        activeParameter:
          signatureHelpResults.activeParameter !== undefined
            ? signatureHelpResults.activeParameter
            : -1,
      };
    });

    let lastTriggerKind: CompletionTriggerKind | undefined =
      CompletionTriggerKind.Invoked;
    this._conn.onCompletion(async (params, token) => {
      // We set completion incomplete for the first invocation and next consecutive call,
      // but after that we mark it as completed so the client doesn't repeatedly call back.
      // We mark the first one as incomplete because completion could be invoked without
      // any meaningful character provided, such as an explicit completion invocation (ctrl+space)
      // or a period. That might cause us to not include some items (e.g., auto-imports).
      // The next consecutive call provides some characters to help us to pick
      // better completion items. After that, we are not going to introduce new items,
      // so we can let the client to do the filtering and caching.
      const completionIncomplete =
        lastTriggerKind !== CompletionTriggerKind.TriggerForIncompleteCompletions ||
        params.context?.triggerKind !==
          CompletionTriggerKind.TriggerForIncompleteCompletions;

      lastTriggerKind = params.context?.triggerKind;

      const filePath = convertUriToPath(params.textDocument.uri);

      const position: Position = {
        line: params.position.line,
        character: params.position.character,
      };

      const workspace = await this.getWorkspaceForFile(filePath);
      if (workspace.disableLanguageServices) {
        return;
      }

      const completions = await workspace.serviceInstance.getCompletionsForPosition(
        filePath,
        position,
        workspace.rootPath,
        token
      );

      if (completions) {
        completions.isIncomplete = completionIncomplete;
      }

      return completions;
    });

    this._conn.onCompletionResolve(async (params, token) => {
      // Cancellation bugs in vscode and LSP:
      // https://github.com/microsoft/vscode-languageserver-node/issues/615
      // https://github.com/microsoft/vscode/issues/95485
      //
      // If resolver throws cancellation exception, LSP and VSCode
      // cache that result and never call us back.
      const completionItemData = params.data as CompletionItemData;
      if (completionItemData && completionItemData.filePath) {
        const workspace = await this.getWorkspaceForFile(
          completionItemData.workspacePath
        );
        workspace.serviceInstance.resolveCompletionItem(
          completionItemData.filePath,
          params,
          token
        );
      }
      return params;
    });

    this._conn.onRenameRequest(async (params, token) => {
      const filePath = convertUriToPath(params.textDocument.uri);

      const position: Position = {
        line: params.position.line,
        character: params.position.character,
      };

      const workspace = await this.getWorkspaceForFile(filePath);
      if (workspace.disableLanguageServices) {
        return;
      }

      const editActions = workspace.serviceInstance.renameSymbolAtPosition(
        filePath,
        position,
        params.newName,
        token
      );

      if (!editActions) {
        return undefined;
      }

      return convertWorkspaceEdits(editActions);
    });

    this._conn.onDidOpenTextDocument(async (params) => {
      const filePath = convertUriToPath(params.textDocument.uri);
      const workspace = await this.getWorkspaceForFile(filePath);
      workspace.serviceInstance.setFileOpened(
        filePath,
        params.textDocument.version,
        params.textDocument.text
      );
    });

    this._conn.onDidChangeTextDocument(async (params) => {
      this.recordUserInteractionTime();

      const filePath = convertUriToPath(params.textDocument.uri);
      const workspace = await this.getWorkspaceForFile(filePath);
      workspace.serviceInstance.updateOpenFileContents(
        filePath,
        params.textDocument.version,
        params.contentChanges[0].text
      );
    });

    this._conn.onDidCloseTextDocument(async (params) => {
      const filePath = convertUriToPath(params.textDocument.uri);
      const workspace = await this.getWorkspaceForFile(filePath);
      workspace.serviceInstance.setFileClosed(filePath);
    });

    this._conn.onDidChangeWatchedFiles((params) => {
      params.changes.forEach((change) => {
        const filePath = convertUriToPath(change.uri);
        const eventType: FileWatcherEventType = change.type === 1 ? 'add' : 'change';
        this._fileWatchers.forEach((watcher) => {
          if (watcher.workspacePaths.some((dirPath) => containsPath(dirPath, filePath))) {
            watcher.eventHandler(eventType, filePath);
          }
        });
      });
    });

    this._conn.onInitialized(() => {
      this._conn.workspace.onDidChangeWorkspaceFolders((event) => {
        event.removed.forEach((workspace) => {
          const rootPath = convertUriToPath(workspace.uri);
          this._wsMap.delete(rootPath);
        });

        event.added.forEach(async (workspace) => {
          const rootPath = convertUriToPath(workspace.uri);
          const newWorkspace: WorkspaceServiceInstance = {
            workspaceName: workspace.name,
            rootPath,
            rootUri: workspace.uri,
            serviceInstance: this.createAnalyzerService(workspace.name),
            disableLanguageServices: false,
            disableOrganizeImports: false,
            isInitialized: createDeferred<boolean>(),
          };
          this._wsMap.set(rootPath, newWorkspace);
          await this.updateSettingsForWorkspace(newWorkspace);
        });
      });

      // Set up our file watchers.
      if (this._hasWatch) {
        this._conn.client.register(DidChangeWatchedFilesNotification.type, {
          watchers: [
            ...configFileNames.map((fileName) => {
              return {
                globPattern: `**/${fileName}`,
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

    this._conn.onExecuteCommand(async (params, token, reporter) => {
      // Cancel running command if there is one.
      if (this._pendingCommandCancellationSource) {
        this._pendingCommandCancellationSource.cancel();
        this._pendingCommandCancellationSource = undefined;
      }

      const executeCommand = async (token: CancellationToken) => {
        const result = await this.executeCommand(params, token);
        if (WorkspaceEdit.is(result)) {
          // Tell client to apply edits.
          this._conn.workspace.applyEdit(result);
        }
      };

      if (this.isLongRunningCommand(params.command)) {
        // Create a progress dialog for long-running commands.
        const progress = await this._getProgressReporter(
          params.workDoneToken,
          reporter,
          'Executing command'
        );
        const source = CancelAfter(token, progress.token);
        this._pendingCommandCancellationSource = source;

        try {
          executeCommand(source.token);
        } finally {
          progress.done();
          source.dispose();
        }
      } else {
        executeCommand(token);
      }
    });
  }

  updateSettingsForAllWorkspaces(): void {
    this._wsMap.forEach((workspace) => {
      this.updateSettingsForWorkspace(workspace).ignoreErrors();
    });
  }

  protected onAnalysisCompletedHandler(results: AnalysisResults): void {
    results.diagnostics.forEach((fileDiag) => {
      const diagnostics = this._convertDiagnostics(fileDiag.diagnostics);

      // Send the computed diagnostics to the client.
      this._conn.sendDiagnostics({
        uri: convertPathToUri(fileDiag.filePath),
        diagnostics,
      });

      if (results.filesRequiringAnalysis > 0) {
        if (!results.checkingOnlyOpenFiles) {
          // Display a progress spinner if we're checking the entire program.
          if (!this._isDisplayingProgress) {
            this._isDisplayingProgress = true;
            this._conn.sendNotification('pyright/beginProgress');
          }

          const fileOrFiles = results.filesRequiringAnalysis !== 1 ? 'files' : 'file';
          this._conn.sendNotification(
            'pyright/reportProgress',
            `${results.filesRequiringAnalysis} ${fileOrFiles} to analyze`
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

  async updateSettingsForWorkspace(workspace: WorkspaceServiceInstance): Promise<void> {
    const serverSettings = await this.getSettings(workspace);
    this.updateOptionsAndRestartService(workspace, serverSettings);
    workspace.disableLanguageServices = !!serverSettings.disableLanguageServices;
    workspace.disableOrganizeImports = !!serverSettings.disableOrganizeImports;

    // The workspace is now open for business.
    workspace.isInitialized.resolve(true);
  }

  updateOptionsAndRestartService(
    workspace: WorkspaceServiceInstance,
    serverSettings: ServerSettings,
    typeStubTargetImportName?: string
  ) {
    AnalyzerServiceExecutor.runWithOptions(
      this.rootPath,
      workspace,
      serverSettings,
      typeStubTargetImportName
    );
  }

  private async _getProgressReporter(
    workDoneToken: string | number | undefined,
    reporter: WorkDoneProgressReporter,
    title: string
  ) {
    if (workDoneToken) {
      return reporter;
    }

    const serverInitiatedReporter = await this._conn.window.createWorkDoneProgress();
    serverInitiatedReporter.begin(title, undefined, undefined, true);

    return serverInitiatedReporter;
  }

  private _GetConnectionOptions(): ConnectionOptions {
    return { cancellationStrategy: getCancellationStrategyFromArgv(process.argv) };
  }

  private _convertDiagnostics(diags: AnalyzerDiagnostic[]): Diagnostic[] {
    return diags.map((diag) => {
      const severity =
        diag.category === DiagnosticCategory.Error
          ? DiagnosticSeverity.Error
          : DiagnosticSeverity.Warning;

      let source = this._productName;
      const rule = diag.getRule();
      if (rule) {
        source = `${source} (${rule})`;
      }

      const vsDiag = Diagnostic.create(
        diag.range,
        diag.message,
        severity,
        undefined,
        source
      );

      if (diag.category === DiagnosticCategory.UnusedCode) {
        vsDiag.tags = [DiagnosticTag.Unnecessary];
        vsDiag.severity = DiagnosticSeverity.Hint;
      }

      const relatedInfo = diag.getRelatedInfo();
      if (relatedInfo.length > 0) {
        vsDiag.relatedInformation = relatedInfo.map((info) => {
          return DiagnosticRelatedInformation.create(
            Location.create(convertPathToUri(info.filePath), info.range),
            info.message
          );
        });
      }

      return vsDiag;
    });
  }

  protected recordUserInteractionTime() {
    // Tell all of the services that the user is actively
    // interacting with one or more editors, so they should
    // back off from performing any work.
    this._wsMap.forEach((workspace) => {
      workspace.serviceInstance.recordUserInteractionTime();
    });
  }
}
