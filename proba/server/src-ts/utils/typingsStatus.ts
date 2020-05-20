import * as vscode from 'vscode';
import { loadMessageBundle } from 'vscode-nls';
import { IServiceClient } from '../service';
import { Disposable } from './extras';

const localize = loadMessageBundle();
const timeout = 30 * 1000;

export class TypingsStatus extends Disposable {
  private readonly acquiring = new Map<number, NodeJS.Timer>();

  constructor(private readonly client: IServiceClient) {
    super();
    this.register(this.client.onDidBeginInstallTypes((e) => this.onBegin(e.eventId)));
    this.register(this.client.onDidEndInstallTypes((e) => this.onEnd(e.eventId)));
  }

  dispose() {
    super.dispose();
    for (const t of this.acquiring.values()) {
      clearTimeout(t);
    }
  }

  get isAcquiring() {
    return Object.keys(this.acquiring).length > 0;
  }

  private onBegin(e: number) {
    if (this.acquiring.has(e)) return;
    this.acquiring.set(
      e,
      setTimeout(() => {
        this.onEnd(e);
      }, timeout)
    );
  }

  private onEnd(e: number) {
    const timer = this.acquiring.get(e);
    if (timer) clearTimeout(timer);
    this.acquiring.delete(e);
  }
}

export class ProgressReporter extends Disposable {
  private readonly promises = new Map<number, Function>();

  constructor(client: IServiceClient) {
    super();
    this.register(client.onDidBeginInstallTypes((e) => this.onBegin(e.eventId)));
    this.register(client.onDidEndInstallTypes((e) => this.onEndOrTimeout(e.eventId)));
    this.register(client.onTypesInstallerInitFailed((_) => this.onInitFailed()));
  }

  dispose() {
    super.dispose();
    this.promises.forEach((v) => v());
  }

  private onBegin(e: number) {
    const h = setTimeout(() => this.onEndOrTimeout(e), timeout);
    const p = new Promise((res) => {
      this.promises.set(e, () => {
        clearTimeout(h);
        res();
      });
    });
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: localize('installingPackages', 'Fetching data for IntelliSense'),
      },
      () => p
    );
  }

  private onEndOrTimeout(e: number) {
    const res = this.promises.get(e);
    if (res) {
      this.promises.delete(e);
      res();
    }
  }

  private async onInitFailed() {
    const c = vscode.workspace.getConfiguration('typescript');
    if (c.get<boolean>('check.npmIsInstalled', true)) {
      const noMore: vscode.MessageItem = {
        title: localize(
          'typesInstallerInitializationFailed.doNotCheckAgain',
          "Don't Show Again"
        ),
      };
      const s = await vscode.window.showWarningMessage(
        localize(
          'typesInstallerInitializationFailed.title',
          "Could not install typings files for JavaScript language features. Please ensure that NPM is installed or configure 'typescript.npm' in your user settings. Click [here]({0}) to learn more.",
          'https://go.microsoft.com/fwlink/?linkid=847635'
        ),
        noMore
      );
      if (s === noMore) c.update('check.npmIsInstalled', false, true);
    }
  }
}
