import * as vscode from 'vscode';
import { loadMessageBundle } from 'vscode-nls';
import { IServiceClient } from '../typescriptService';
import { Disposable } from './disposable';

const localize = loadMessageBundle();

const typingsInstallTimeout = 30 * 1000;

export class TypingsStatus extends Disposable {
  private readonly _acquiringTypings = new Map<number, NodeJS.Timer>();
  private readonly _client: IServiceClient;

  constructor(client: IServiceClient) {
    super();
    this._client = client;

    this.register(
      this._client.onDidBeginInstallTypes((event) =>
        this.onBeginInstallTypings(event.eventId)
      )
    );

    this.register(
      this._client.onDidEndInstallTypes((event) =>
        this.onEndInstallTypings(event.eventId)
      )
    );
  }

  public dispose(): void {
    super.dispose();

    for (const timeout of this._acquiringTypings.values()) {
      clearTimeout(timeout);
    }
  }

  public get isAcquiringTypings(): boolean {
    return Object.keys(this._acquiringTypings).length > 0;
  }

  private onBeginInstallTypings(eventId: number): void {
    if (this._acquiringTypings.has(eventId)) {
      return;
    }
    this._acquiringTypings.set(
      eventId,
      setTimeout(() => {
        this.onEndInstallTypings(eventId);
      }, typingsInstallTimeout)
    );
  }

  private onEndInstallTypings(eventId: number): void {
    const timer = this._acquiringTypings.get(eventId);
    if (timer) {
      clearTimeout(timer);
    }
    this._acquiringTypings.delete(eventId);
  }
}

export class AtaProgressReporter extends Disposable {
  private readonly _promises = new Map<number, Function>();

  constructor(client: IServiceClient) {
    super();
    this.register(client.onDidBeginInstallTypes((e) => this._onBegin(e.eventId)));
    this.register(client.onDidEndInstallTypes((e) => this._onEndOrTimeout(e.eventId)));
    this.register(
      client.onTypesInstallerInitFailed((_) => this.onTypesInstallerInitFailed())
    );
  }

  dispose(): void {
    super.dispose();
    this._promises.forEach((value) => value());
  }

  private _onBegin(eventId: number): void {
    const handle = setTimeout(() => this._onEndOrTimeout(eventId), typingsInstallTimeout);
    const promise = new Promise((resolve) => {
      this._promises.set(eventId, () => {
        clearTimeout(handle);
        resolve();
      });
    });

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: localize(
          'installingPackages',
          'Fetching data for better TypeScript IntelliSense'
        ),
      },
      () => promise
    );
  }

  private _onEndOrTimeout(eventId: number): void {
    const resolve = this._promises.get(eventId);
    if (resolve) {
      this._promises.delete(eventId);
      resolve();
    }
  }

  private async onTypesInstallerInitFailed() {
    const config = vscode.workspace.getConfiguration('typescript');

    if (config.get<boolean>('check.npmIsInstalled', true)) {
      const dontShowAgain: vscode.MessageItem = {
        title: localize(
          'typesInstallerInitializationFailed.doNotCheckAgain',
          "Don't Show Again"
        ),
      };
      const selected = await vscode.window.showWarningMessage(
        localize(
          'typesInstallerInitializationFailed.title',
          "Could not install typings files for JavaScript language features. Please ensure that NPM is installed or configure 'typescript.npm' in your user settings. Click [here]({0}) to learn more.",
          'https://go.microsoft.com/fwlink/?linkid=847635'
        ),
        dontShowAgain
      );

      if (selected === dontShowAgain) {
        config.update('check.npmIsInstalled', false, true);
      }
    }
  }
}
