import * as path from 'path';
import * as vscode from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
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

  let s = ctx.asAbsolutePath(path.join('server', 'out', 'server.js'));
  const dOpts = { execArgv: ['--nolazy', '--inspect=6009'] };
  const sOpts: ServerOptions = {
    run: { module: s, transport: TransportKind.ipc },
    debug: { module: s, transport: TransportKind.ipc, options: dOpts },
  };
  const cOpts: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'plaintext' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc'),
    },
  };
  client = new LanguageClient(
    'languageServerExample',
    'Language Server Example',
    sOpts,
    cOpts
  );
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (client) return client.stop();
  return;
}
