import * as vscode from 'vscode';

export function isMarkdownFile(d: vscode.TextDocument) {
  return d.languageId === 'markdown';
}

export function disposeAll(ds: vscode.Disposable[]) {
  while (ds.length) {
    const d = ds.pop();
    if (d) d.dispose();
  }
}

export abstract class Disposable {
  protected _disposables: vscode.Disposable[] = [];
  private _isDisposed = false;

  public dispose() {
    if (!this._isDisposed) {
      this._isDisposed = true;
      disposeAll(this._disposables);
    }
  }

  protected _register<T extends vscode.Disposable>(d: T): T {
    if (this._isDisposed) d.dispose();
    else this._disposables.push(d);
    return d;
  }

  protected get isDisposed() {
    return this._isDisposed;
  }
}

export const Schemes = {
  http: 'http:',
  https: 'https:',
  file: 'file:',
  mailto: 'mailto:',
  data: 'data:',
  vscode: 'vscode:',
  'vscode-insiders': 'vscode-insiders:',
  'vscode-resource': 'vscode-resource:',
};

const schemes = [...Object.values(Schemes), `${vscode.env.uriScheme}:`];

export function getUriForLinkWithKnownExternalScheme(l: string): vscode.Uri | undefined {
  if (schemes.some((s) => isOfScheme(s, l))) return vscode.Uri.parse(l);
  return;
}

export function isOfScheme(s: string, l: string) {
  return l.toLowerCase().startsWith(s);
}

export const MarkdownFileExtensions: readonly string[] = [
  '.md',
  '.mkd',
  '.mdwn',
  '.mdown',
  '.markdown',
  '.markdn',
  '.mdtxt',
  '.mdtext',
  '.workbook',
];
