import * as path from 'path';
import * as vscode from 'vscode';
import {
  commands,
  CompletionList,
  Disposable,
  ExtensionContext,
  languages,
  OutputChannel,
  StatusBarAlignment,
  StatusBarItem,
  TextDocument,
  Uri,
  window,
  workspace,
  WorkspaceFolder,
  Position,
  Range,
  TextEditor,
  TextEditorEdit,
} from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  ServerOptions,
  TextEdit,
  TransportKind,
} from 'vscode-languageclient';
import { getLanguageService } from 'vscode-html-languageservice';
import * as WebSocket from 'ws';

import { getCSSVirtualContent, isInsideStyleRegion } from './embedded';
import { FoodPyramidHierarchyProvider } from './FoodPyramidHierarchyProvider';
import { TextDecoder } from 'util';
import { Codelens } from './codelens';
import { Cancel } from './cancel';
import { Commands } from '../../server/src/commands';
import { Reporting } from './progress';

let client: LanguageClient;
let cancel: Cancel | undefined;

const htmlLanguageService = getLanguageService();
let disposables = [] as Disposable[];

export function activate(ctx: vscode.ExtensionContext) {
  console.log('Extension "proba" is now active!');

  cancel = new Cancel();
  const p = ctx.asAbsolutePath(path.join('out', 'server', 'server.js'));
  const dOpts = { execArgv: ['--nolazy', '--inspect=6009'], cwd: process.cwd() };
  const sOpts: ServerOptions = {
    run: {
      module: p,
      transport: TransportKind.ipc,
      args: cancel.args(),
      options: { cwd: process.cwd() },
    },
    debug: {
      module: p,
      transport: TransportKind.ipc,
      args: cancel.args(),
      options: dOpts,
    },
  };
  let cOpts: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'python' }],
    synchronize: { configurationSection: ['python', 'pyright'] },
    connectionOptions: { cancellationStrategy: cancel },
  };

  client = new LanguageClient('python', 'Qpx', sOpts, cOpts);
  ctx.subscriptions.push(client.start());
  ctx.subscriptions.push(new Reporting(client));

  let cmds = [Commands.orderImports, Commands.addMissingOptionalToParam];
  cmds.forEach((n) => {
    ctx.subscriptions.push(
      commands.registerTextEditorCommand(
        n,
        (editor: TextEditor, _: TextEditorEdit, ...args: any[]) => {
          const cmd = {
            command: n,
            arguments: [editor.document.uri.toString(), ...args],
          };
          client
            .sendRequest<TextEdit[] | undefined>('workspace/executeCommand', cmd)
            .then((es) => {
              if (es && es.length > 0) {
                editor.edit((b) => {
                  es.forEach((e) => {
                    const s = new Position(e.range.start.line, e.range.start.character);
                    const f = new Position(e.range.end.line, e.range.end.character);
                    b.replace(new Range(s, f), e.newText);
                  });
                });
              }
            });
        },
        () => {}
      )
    );
  });

  cmds = [Commands.createTypeStub, Commands.restartServer];
  cmds.forEach((n) => {
    ctx.subscriptions.push(
      commands.registerCommand(n, (...args: any[]) => {
        client.sendRequest('workspace/executeCommand', {
          n,
          arguments: args,
        });
      })
    );
  });

  cOpts = {
    documentSelector: [{ scheme: 'file', language: 'html1' }],
  };
  client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    sOpts,
    cOpts
  );
  client.start();

  cOpts = {
    documentSelector: [{ scheme: 'file', language: 'html1' }],
    middleware: {
      provideCompletionItem: async (d, p, c, t, next) => {
        if (!isInsideStyleRegion(htmlLanguageService, d.getText(), d.offsetAt(p))) {
          return await next(d, p, c, t);
        }
        const u = d.uri.toString();
        vDocs.set(u, getCSSVirtualContent(htmlLanguageService, d.getText()));
        const n = `embedded-content://css/${encodeURIComponent(u)}.css`;
        const v = Uri.parse(n);
        return await commands.executeCommand<CompletionList>(
          'vscode.executeCompletionItemProvider',
          v,
          p,
          c.triggerCharacter
        );
      },
    },
  };
  client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    sOpts,
    cOpts
  );
  client.start();

  let x = vscode.commands.registerCommand('extension.proba', () => {
    vscode.window.showInformationMessage('Proba, proba, proba...');
  });
  disposables.push(x);
  ctx.subscriptions.push(x);

  x = vscode.languages.registerCallHierarchyProvider(
    'plaintext',
    new FoodPyramidHierarchyProvider()
  );
  disposables.push(x);
  ctx.subscriptions.push(x);
  showSampleText(ctx);

  const socketPort = workspace
    .getConfiguration('languageServerExample')
    .get('port', 7000);
  let socket: WebSocket | null = null;
  x = vscode.commands.registerCommand('languageServerExample.startStreaming', () => {
    socket = new WebSocket(`ws://localhost:${socketPort}`);
  });
  disposables.push(x);

  const stat = window.createStatusBarItem(StatusBarAlignment.Left, 1000000);
  ctx.subscriptions.push(stat);
  ctx.subscriptions.push(workspace.onDidChangeWorkspaceFolders(() => updateStatus(stat)));
  ctx.subscriptions.push(workspace.onDidChangeConfiguration(() => updateStatus(stat)));
  ctx.subscriptions.push(window.onDidChangeActiveTextEditor(() => updateStatus(stat)));
  ctx.subscriptions.push(
    window.onDidChangeTextEditorViewColumn(() => updateStatus(stat))
  );
  ctx.subscriptions.push(workspace.onDidOpenTextDocument(() => updateStatus(stat)));
  ctx.subscriptions.push(workspace.onDidCloseTextDocument(() => updateStatus(stat)));
  updateStatus(stat);

  const codelens = new Codelens();
  x = languages.registerCodeLensProvider('*', codelens);
  disposables.push(x);
  x = commands.registerCommand('codelens-sample.enableCodeLens', () => {
    workspace.getConfiguration('codelens-sample').update('enableCodeLens', true, true);
  });
  disposables.push(x);
  x = commands.registerCommand('codelens-sample.disableCodeLens', () => {
    workspace.getConfiguration('codelens-sample').update('enableCodeLens', false, true);
  });
  x = commands.registerCommand('codelens-sample.codelensAction', (args) => {
    window.showInformationMessage(`CodeLens action clicked with args=${args}`);
  });
  disposables.push(x);

  x = vscode.languages.registerDocumentSemanticTokensProvider(
    { language: 'semanticLanguage' },
    new DocumentSemanticTokensProvider(),
    legend
  );
  disposables.push(x);
  ctx.subscriptions.push(x);

  const vDocs = new Map<string, string>();

  workspace.registerTextDocumentContentProvider('embedded-content', {
    provideTextDocumentContent: (uri) => {
      const u = uri.path.slice(1).slice(0, -4);
      const d = decodeURIComponent(u);
      return vDocs.get(d);
    },
  });

  let log = '';
  const websocketOutputChannel: OutputChannel = {
    name: 'websocket',
    append(v: string) {
      log += v;
      console.log(v);
    },
    appendLine(v: string) {
      log += v;
      if (socket && socket.readyState === WebSocket.OPEN) socket.send(log);
      log = '';
    },
    clear() {},
    show() {},
    hide() {},
    dispose() {},
  };

  cOpts = {
    documentSelector: [{ scheme: 'file', language: 'plaintext' }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
    },
    outputChannel: websocketOutputChannel,
  };
  client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    sOpts,
    cOpts
  );
  client.start();

  cOpts = {
    documentSelector: [{ scheme: 'file', language: 'plaintext' }],
    diagnosticCollectionName: 'sample',
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    progressOnInitialization: true,
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc'),
    },
    middleware: {
      executeCommand: async (cmd, args, next) => {
        const selected = await vscode.window.showQuickPick([
          'Visual Studio',
          'Visual Studio Code',
        ]);
        if (selected === undefined) return next(cmd, args);
        args = args.slice(0);
        args.push(selected);
        return next(cmd, args);
      },
    },
  };
  try {
    client = new LanguageClient(
      'languageServerExample',
      'Language Server Example',
      sOpts,
      cOpts
    );
  } catch (e) {
    vscode.window.showErrorMessage(`Extension not started. See output channel.`);
    return;
  }

  client.registerProposedFeatures();
  ctx.subscriptions.push(client.start());
}

async function showSampleText(ctx: vscode.ExtensionContext): Promise<void> {
  const f = await vscode.workspace.fs.readFile(
    vscode.Uri.file(ctx.asAbsolutePath('sample.txt'))
  );
  const t = new TextDecoder('utf-8').decode(f);
  const d = await vscode.workspace.openTextDocument({
    language: 'plaintext',
    content: t,
  });
  vscode.window.showTextDocument(d);
}

function updateStatus(s: StatusBarItem) {
  const i = getEditorInfo();
  s.text = i?.text ?? '';
  s.tooltip = i?.tooltip;
  s.color = i?.color;
  if (i) s.show();
  else s.hide();
}

function getEditorInfo():
  | { text?: string; tooltip?: string; color?: string }
  | undefined {
  const e = window.activeTextEditor;
  if (!e || !workspace.workspaceFolders || workspace.workspaceFolders.length < 2) return;
  let text: string | undefined;
  let tooltip: string | undefined;
  let color: string | undefined;
  const r = e.document.uri;
  if (r.scheme === 'file') {
    const f = workspace.getWorkspaceFolder(r);
    if (!f) {
      text = `$(alert) <outside workspace> → ${path.basename(r.fsPath)}`;
    } else {
      text = `$(file-submodule) ${path.basename(f.uri.fsPath)} (${f.index + 1} of ${
        workspace.workspaceFolders.length
      }) → $(file-code) ${path.basename(r.fsPath)}`;
      tooltip = r.fsPath;
      const m = workspace.getConfiguration('multiRootSample', r);
      color = m.get('statusColor');
    }
  }
  return { text, tooltip, color };
}

export function deactivate() {
  if (cancel) {
    cancel.dispose();
    cancel = undefined;
  }
  let r: Thenable<void>;
  if (client) r = client.stop();
  else {
    const ps: Thenable<void>[] = [];
    if (defaultClient) ps.push(defaultClient.stop());
    for (const c of clients.values()) {
      ps.push(c.stop());
    }
    r = Promise.all(ps).then(() => undefined);
  }
  if (disposables) disposables.forEach((d) => d.dispose());
  disposables = [];
  return r;
}

// ==================== //

let defaultClient: LanguageClient;
const clients: Map<string, LanguageClient> = new Map();

let _sortedWorkspaceFolders: string[] | undefined;

function sortedWorkspaceFolders(): string[] {
  if (_sortedWorkspaceFolders === void 0) {
    _sortedWorkspaceFolders = workspace.workspaceFolders
      ? workspace.workspaceFolders
          .map((folder) => {
            let result = folder.uri.toString();
            if (!result.endsWith('/')) {
              result = result + '/';
            }
            return result;
          })
          .sort((a, b) => {
            return a.length - b.length;
          })
      : [];
  }
  return _sortedWorkspaceFolders;
}
workspace.onDidChangeWorkspaceFolders(() => (_sortedWorkspaceFolders = undefined));

function getOuterMostWorkspaceFolder(f: WorkspaceFolder): WorkspaceFolder {
  const sorted = sortedWorkspaceFolders();
  for (const element of sorted) {
    let uri = f.uri.toString();
    if (!uri.endsWith('/')) uri = uri + '/';
    if (uri.startsWith(element)) return workspace.getWorkspaceFolder(Uri.parse(element))!;
  }
  return f;
}

export function activate2(ctx: ExtensionContext) {
  const module = ctx.asAbsolutePath(path.join('server', 'out', 'server.js'));
  const outputChannel: OutputChannel = window.createOutputChannel(
    'lsp-multi-server-example'
  );

  function didOpenTextDocument(d: TextDocument): void {
    if (
      d.languageId !== 'plaintext' ||
      (d.uri.scheme !== 'file' && d.uri.scheme !== 'untitled')
    ) {
      return;
    }
    const uri = d.uri;
    if (uri.scheme === 'untitled' && !defaultClient) {
      const debugOptions = { execArgv: ['--nolazy', '--inspect=6010'] };
      const serverOptions = {
        run: { module, transport: TransportKind.ipc },
        debug: { module, transport: TransportKind.ipc, options: debugOptions },
      };
      const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'untitled', language: 'plaintext' }],
        diagnosticCollectionName: 'lsp-multi-server-example',
        outputChannel: outputChannel,
      };
      defaultClient = new LanguageClient(
        'lsp-multi-server-example',
        'LSP Multi Server Example',
        serverOptions,
        clientOptions
      );
      defaultClient.start();
      return;
    }
    let folder = workspace.getWorkspaceFolder(uri);
    if (!folder) return;
    folder = getOuterMostWorkspaceFolder(folder);
    if (!clients.has(folder.uri.toString())) {
      const debugOptions = { execArgv: ['--nolazy', `--inspect=${6011 + clients.size}`] };
      const serverOptions = {
        run: { module, transport: TransportKind.ipc },
        debug: { module, transport: TransportKind.ipc, options: debugOptions },
      };
      const clientOptions: LanguageClientOptions = {
        documentSelector: [
          { scheme: 'file', language: 'plaintext', pattern: `${folder.uri.fsPath}/**/*` },
        ],
        diagnosticCollectionName: 'lsp-multi-server-example',
        workspaceFolder: folder,
        outputChannel: outputChannel,
      };
      const client = new LanguageClient(
        'lsp-multi-server-example',
        'LSP Multi Server Example',
        serverOptions,
        clientOptions
      );
      client.start();
      clients.set(folder.uri.toString(), client);
    }
  }

  workspace.onDidOpenTextDocument(didOpenTextDocument);
  workspace.textDocuments.forEach(didOpenTextDocument);
  workspace.onDidChangeWorkspaceFolders((e) => {
    for (const f of e.removed) {
      const c = clients.get(f.uri.toString());
      if (c) {
        clients.delete(f.uri.toString());
        c.stop();
      }
    }
  });
}

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

const legend = (function () {
  const ts = [
    'comment',
    'string',
    'keyword',
    'number',
    'regexp',
    'operator',
    'namespace',
    'type',
    'struct',
    'class',
    'interface',
    'enum',
    'typeParameter',
    'function',
    'member',
    'macro',
    'variable',
    'parameter',
    'property',
    'label',
  ];
  ts.forEach((t, i) => tokenTypes.set(t, i));
  const ms = [
    'declaration',
    'documentation',
    'readonly',
    'static',
    'abstract',
    'deprecated',
    'modification',
    'async',
  ];
  ms.forEach((m, i) => tokenModifiers.set(m, i));
  return new vscode.SemanticTokensLegend(ts, ms);
})();

interface IParsedToken {
  line: number;
  startCharacter: number;
  length: number;
  tokenType: string;
  tokenModifiers: string[];
}

class DocumentSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  async provideDocumentSemanticTokens(
    d: vscode.TextDocument,
    _c: vscode.CancellationToken
  ) {
    const ts = this._parseText(d.getText());
    const b = new vscode.SemanticTokensBuilder();
    ts.forEach((t) => {
      b.push(
        t.line,
        t.startCharacter,
        t.length,
        this._encodeTokenType(t.tokenType),
        this._encodeTokenModifiers(t.tokenModifiers)
      );
    });
    return b.build();
  }

  private _encodeTokenType(t: string) {
    if (tokenTypes.has(t)) return tokenTypes.get(t)!;
    else if (t === 'notInLegend') return tokenTypes.size + 2;
    return 0;
  }

  private _encodeTokenModifiers(ms: string[]) {
    let r = 0;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (tokenModifiers.has(m)) r = r | (1 << tokenModifiers.get(m)!);
      else if (m === 'notInLegend') r = r | (1 << (tokenModifiers.size + 2));
    }
    return r;
  }

  private _parseText(t: string) {
    const r = [] as IParsedToken[];
    const ls = t.split(/\r\n|\r|\n/);
    for (let i = 0; i < ls.length; i++) {
      const ln = ls[i];
      let off = 0;
      do {
        const open = ln.indexOf('[', off);
        if (open === -1) break;
        const close = ln.indexOf(']', open);
        if (close === -1) break;
        const d = this._parseTextToken(ln.substring(open + 1, close));
        r.push({
          line: i,
          startCharacter: open + 1,
          length: close - open - 1,
          tokenType: d.tokenType,
          tokenModifiers: d.tokenModifiers,
        });
        off = close;
      } while (true);
    }
    return r;
  }

  private _parseTextToken(t: string): { tokenType: string; tokenModifiers: string[] } {
    const ps = t.split('.');
    return { tokenType: ps[0], tokenModifiers: ps.slice(1) };
  }
}
