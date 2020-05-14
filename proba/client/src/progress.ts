import { Progress, ProgressLocation, window } from 'vscode';
import { Disposable, LanguageClient } from 'vscode-languageclient';

const timeout = 60000;

export class Reporting implements Disposable {
  private _progress: Progress<{ message?: string; increment?: number }> | undefined;
  private _timeout: NodeJS.Timer | undefined;
  private _resolve?: (_?: void | PromiseLike<void>) => void;

  constructor(c: LanguageClient) {
    c.onReady().then(() => {
      c.onNotification('qpx/beginProgress', () => {
        const r = new Promise<void>((res) => {
          this._resolve = res;
        });
        window.withProgress(
          {
            location: ProgressLocation.Window,
            title: '',
          },
          (p) => {
            this._progress = p;
            return r;
          }
        );
        this._prime();
      });
      c.onNotification('qpx/reportProgress', (message: string) => {
        if (this._progress) {
          this._progress.report({ message });
          this._prime();
        }
      });
      c.onNotification('qpx/endProgress', () => {
        this._clear();
      });
    });
  }

  public dispose() {
    this._clear();
  }

  private _prime() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
    }
    this._timeout = setTimeout(() => this._clear(), timeout);
  }

  private _clear() {
    if (this._resolve) {
      this._resolve();
      this._resolve = undefined;
    }
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }
}
