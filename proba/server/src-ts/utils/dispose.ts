import * as vscode from 'vscode';

export function disposeAll(ds: vscode.Disposable[]) {
  while (ds.length) {
    const d = ds.pop();
    if (d) d.dispose();
  }
}

export abstract class Disposable {
  protected disps?: vscode.Disposable[] = [];

  protected get isDisposed() {
    return !!this.disps;
  }

  protected register<T extends vscode.Disposable>(d: T) {
    if (this.disps) this.disps.push(d);
    else d.dispose();
    return d;
  }

  public dispose() {
    if (this.disps) {
      disposeAll(this.disps);
      this.disps = undefined;
    }
  }
}
