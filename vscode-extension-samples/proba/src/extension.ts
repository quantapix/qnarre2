import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "proba" is now active!');

  let disposable = vscode.commands.registerCommand("extension.proba", () => {
    vscode.window.showInformationMessage("Proba, proba, proba...");
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
