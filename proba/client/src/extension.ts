import * as path from 'path';
import * as vscode from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient';

let client: LanguageClient;

export function activate(ctx: vscode.ExtensionContext) {
  console.log('Extension "proba" is now active!');

  const disposable = vscode.commands.registerCommand('extension.proba', () => {
    vscode.window.showInformationMessage('Proba, proba, proba...');
  });
  ctx.subscriptions.push(disposable);

  const s = ctx.asAbsolutePath(path.join('out', 'server', 'server.js'));
  const dOpts = { execArgv: ['--nolazy', '--inspect=6009'], cwd: process.cwd() };
  const sOpts: ServerOptions = {
    run: { module: s, transport: TransportKind.ipc, options: { cwd: process.cwd() } },
    debug: { module: s, transport: TransportKind.ipc, options: dOpts },
  };
  const cOpts: LanguageClientOptions = {
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
  let client: LanguageClient;
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

export function deactivate(): Thenable<void> | undefined {
  if (client) return client.stop();
  return;
}

import * as path from 'path';
import {
  workspace as Workspace,
  window as Window,
  ExtensionContext,
  TextDocument,
  OutputChannel,
  WorkspaceFolder,
  Uri,
} from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  TransportKind,
} from 'vscode-languageclient';

let defaultClient: LanguageClient;
const clients: Map<string, LanguageClient> = new Map();

let _sortedWorkspaceFolders: string[] | undefined;
function sortedWorkspaceFolders(): string[] {
  if (_sortedWorkspaceFolders === void 0) {
    _sortedWorkspaceFolders = Workspace.workspaceFolders
      ? Workspace.workspaceFolders
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
Workspace.onDidChangeWorkspaceFolders(() => (_sortedWorkspaceFolders = undefined));

function getOuterMostWorkspaceFolder(folder: WorkspaceFolder): WorkspaceFolder {
  const sorted = sortedWorkspaceFolders();
  for (const element of sorted) {
    let uri = folder.uri.toString();
    if (!uri.endsWith('/')) {
      uri = uri + '/';
    }
    if (uri.startsWith(element)) {
      return Workspace.getWorkspaceFolder(Uri.parse(element))!;
    }
  }
  return folder;
}

export function activate(context: ExtensionContext) {
  const module = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
  const outputChannel: OutputChannel = Window.createOutputChannel(
    'lsp-multi-server-example'
  );

  function didOpenTextDocument(document: TextDocument): void {
    // We are only interested in language mode text
    if (
      document.languageId !== 'plaintext' ||
      (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled')
    ) {
      return;
    }

    const uri = document.uri;
    // Untitled files go to a default client.
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
    let folder = Workspace.getWorkspaceFolder(uri);
    // Files outside a folder can't be handled. This might depend on the language.
    // Single file languages like JSON might handle files outside the workspace folders.
    if (!folder) {
      return;
    }
    // If we have nested workspace folders we only start a server on the outer most workspace folder.
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

  Workspace.onDidOpenTextDocument(didOpenTextDocument);
  Workspace.textDocuments.forEach(didOpenTextDocument);
  Workspace.onDidChangeWorkspaceFolders((event) => {
    for (const folder of event.removed) {
      const client = clients.get(folder.uri.toString());
      if (client) {
        clients.delete(folder.uri.toString());
        client.stop();
      }
    }
  });
}

export function deactivate(): Thenable<void> {
  const promises: Thenable<void>[] = [];
  if (defaultClient) {
    promises.push(defaultClient.stop());
  }
  for (const client of clients.values()) {
    promises.push(client.stop());
  }
  return Promise.all(promises).then(() => undefined);
}

import * as path from 'path';
import { ExtensionContext } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'html1' }],
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { commands, CompletionList, ExtensionContext, Uri, workspace } from 'vscode';
import { getLanguageService } from 'vscode-html-languageservice';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient';
import { getCSSVirtualContent, isInsideStyleRegion } from './embeddedSupport';

let client: LanguageClient;

const htmlLanguageService = getLanguageService();

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  let serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const virtualDocumentContents = new Map<string, string>();

  workspace.registerTextDocumentContentProvider('embedded-content', {
    provideTextDocumentContent: (uri) => {
      const originalUri = uri.path.slice(1).slice(0, -4);
      const decodedUri = decodeURIComponent(originalUri);
      return virtualDocumentContents.get(decodedUri);
    },
  });

  let clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'html1' }],
    middleware: {
      provideCompletionItem: async (document, position, context, token, next) => {
        // If not in `<style>`, do not perform request forwarding
        if (
          !isInsideStyleRegion(
            htmlLanguageService,
            document.getText(),
            document.offsetAt(position)
          )
        ) {
          return await next(document, position, context, token);
        }

        const originalUri = document.uri.toString();
        virtualDocumentContents.set(
          originalUri,
          getCSSVirtualContent(htmlLanguageService, document.getText())
        );

        const vdocUriString = `embedded-content://css/${encodeURIComponent(
          originalUri
        )}.css`;
        const vdocUri = Uri.parse(vdocUriString);
        return await commands.executeCommand<CompletionList>(
          'vscode.executeCompletionItemProvider',
          vdocUri,
          position,
          context.triggerCharacter
        );
      },
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, commands, ExtensionContext, OutputChannel } from 'vscode';
import * as WebSocket from 'ws';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  const socketPort = workspace
    .getConfiguration('languageServerExample')
    .get('port', 7000);
  let socket: WebSocket | null = null;

  commands.registerCommand('languageServerExample.startStreaming', () => {
    // Establish websocket connection
    socket = new WebSocket(`ws://localhost:${socketPort}`);
  });

  // The server is implemented in node
  let serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // The log to send
  let log = '';
  const websocketOutputChannel: OutputChannel = {
    name: 'websocket',
    // Only append the logs but send them later
    append(value: string) {
      log += value;
      console.log(value);
    },
    appendLine(value: string) {
      log += value;
      // Don't send logs until WebSocket initialization
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(log);
      }
      log = '';
    },
    clear() {},
    show() {},
    hide() {},
    dispose() {},
  };

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'plaintext' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc'),
    },
    // Hijacks all LSP logs and redirect them to a specific port through WebSocket connection
    outputChannel: websocketOutputChannel,
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { FoodPyramidHierarchyProvider } from './FoodPyramidHierarchyProvider';
import { TextDecoder } from 'util';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "call-hierarchy-sample" is now active!');

  let disposable = vscode.languages.registerCallHierarchyProvider(
    'plaintext',
    new FoodPyramidHierarchyProvider()
  );

  context.subscriptions.push(disposable);

  showSampleText(context);
}

async function showSampleText(context: vscode.ExtensionContext): Promise<void> {
  let sampleTextEncoded = await vscode.workspace.fs.readFile(
    vscode.Uri.file(context.asAbsolutePath('sample.txt'))
  );
  let sampleText = new TextDecoder('utf-8').decode(sampleTextEncoded);
  let doc = await vscode.workspace.openTextDocument({
    language: 'plaintext',
    content: sampleText,
  });
  vscode.window.showTextDocument(doc);
}

// this method is called when your extension is deactivated
export function deactivate() {}
