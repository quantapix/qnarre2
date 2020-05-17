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
import { CancelAfter } from './common/cancellationUtils';
import { containsPath, pathToUri, uriToPath } from './common/pathUtils';
import { LangServer, WorkspaceServiceInstance, getCapability } from './langServer';
import { Position } from './common/textRange';
import { CompletionItemData } from './languageService/completionProvider';
import { convertHoverResults } from './languageService/hoverProvider';
import { convertWorkspaceEdits } from './common/textEditUtils';

export class PyServer extends LangServer {
  constructor(name = 'PyServer', rootDir: string) {
    super(name, rootDir);
  }

  protected _prepConn(cmds: string[]) {
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
              commands: cmds,
              workDoneProgress: true,
            },
          },
        };
      }
    );

    this._conn.onDidChangeConfiguration((ps) => {
      this._conn.console.log(`Received updated settings`);
      if (ps?.settings) this._defaultClientConfig = ps?.settings;
      this.updateSettingsForAll();
    });

    this._conn.onCodeAction((ps, token) => this.executeCodeAction(ps, token));

    this._conn.onDefinition(async (ps, token) => {
      this.recordTime();
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
      const prog = await this.progReporter(
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
      this.recordTime();
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
      async () => {
        const f = uriToPath(ps.textDocument.uri);
        const ws = await this.workspaceFor(f);
        ws.service.setFileOpened(f, ps.textDocument.version, ps.textDocument.text);
      };
    });

    this._conn.onDidChangeTextDocument((ps) => {
      async () => {
        this.recordTime();
        const f = uriToPath(ps.textDocument.uri);
        const ws = await this.workspaceFor(f);
        ws.service.updateOpenFileContents(
          f,
          ps.textDocument.version,
          ps.contentChanges[0].text
        );
      };
    });

    this._conn.onDidCloseTextDocument((ps) => {
      async () => {
        const f = uriToPath(ps.textDocument.uri);
        const ws = await this.workspaceFor(f);
        ws.service.setFileClosed(f);
      };
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
      this._conn.workspace.onDidChangeWorkspaceFolders(async (e) => {
        e.removed.forEach((ws) => {
          const p = uriToPath(ws.uri);
          this._wsMap.delete(p);
        });
        await Promise.all(
          e.added.map(async (ws) => {
            const rootPath = uriToPath(ws.uri);
            const ws2: WorkspaceServiceInstance = {
              name: ws.name,
              rootPath,
              rootUri: ws.uri,
              service: this.createAnalyzerService(ws.name),
              disableOrganizeImports: false,
              isInitialized: createDeferred<boolean>(),
            };
            this._wsMap.set(rootPath, ws2);
            await this.updateSettingsFor(ws2);
          })
        );
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
      if (this.isLongRunning(ps.command)) {
        const prog = await this.progReporter(
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
}
