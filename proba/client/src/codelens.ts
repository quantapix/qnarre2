import * as vscode from 'vscode';

export class Codelens implements vscode.CodeLensProvider {
  private lenses = [] as vscode.CodeLens[];
  private regex: RegExp;
  private _onDidChange: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChange.event;

  constructor() {
    this.regex = /(.+)/g;
    vscode.workspace.onDidChangeConfiguration(() => {
      this._onDidChange.fire();
    });
  }

  public provideCodeLenses(
    d: vscode.TextDocument,
    _: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (
      vscode.workspace.getConfiguration('codelens-sample').get('enableCodeLens', true)
    ) {
      this.lenses = [];
      const r = new RegExp(this.regex);
      const t = d.getText();
      let ms;
      while ((ms = r.exec(t)) !== null) {
        const ln = d.lineAt(d.positionAt(ms.index).line);
        const i = ln.text.indexOf(ms[0]);
        const p = new vscode.Position(ln.lineNumber, i);
        const range = d.getWordRangeAtPosition(p, new RegExp(this.regex));
        if (range) this.lenses.push(new vscode.CodeLens(range));
      }
      return this.lenses;
    }
    return [];
  }

  public resolveCodeLens(cl: vscode.CodeLens, _: vscode.CancellationToken) {
    if (
      vscode.workspace.getConfiguration('codelens-sample').get('enableCodeLens', true)
    ) {
      cl.command = {
        title: 'Codelens provided by sample extension',
        tooltip: 'Tooltip provided by sample extension',
        command: 'codelens-sample.codelensAction',
        arguments: ['Argument 1', false],
      };
      return cl;
    }
    return null;
  }
}
