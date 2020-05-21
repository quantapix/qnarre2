import * as vscode from 'vscode';
import { Disposable } from './extras';
import { isJsConfigOrTsConfigFileName } from './language';
import { isSupportedLanguageMode } from './language';

export class ManagedFileContextManager extends Disposable {
  private static readonly contextName = 'typescript.isManagedFile';

  private isInManagedFileContext = false;

  constructor(
    private readonly normalizePath: (resource: vscode.Uri) => string | undefined
  ) {
    super();
    vscode.window.onDidChangeActiveTextEditor(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      this.onDidChangeActiveTextEditor,
      this,
      this.dispos
    );
    this.onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
  }

  private onDidChangeActiveTextEditor(e?: vscode.TextEditor) {
    if (e) this.updateContext(this.isManagedFile(e));
  }

  private updateContext(newValue: boolean) {
    if (newValue === this.isInManagedFileContext) return;
    vscode.commands.executeCommand(
      'setContext',
      ManagedFileContextManager.contextName,
      newValue
    );
    this.isInManagedFileContext = newValue;
  }

  private isManagedFile(e: vscode.TextEditor) {
    return this.isManagedScriptFile(e) || this.isManagedConfigFile(e);
  }

  private isManagedScriptFile(e: vscode.TextEditor) {
    return (
      isSupportedLanguageMode(e.document) && this.normalizePath(e.document.uri) !== null
    );
  }

  private isManagedConfigFile(e: vscode.TextEditor) {
    return isJsConfigOrTsConfigFileName(e.document.fileName);
  }
}
