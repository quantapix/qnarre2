import * as vscode from 'vscode';
import { IServiceClient } from '../service';
import API from './api';
import { Disposable } from './extras';

export class ConditionalRegistration {
  private registration: vscode.Disposable | undefined = undefined;

  constructor(private readonly _doRegister: () => vscode.Disposable) {}

  dispose() {
    if (this.registration) {
      this.registration.dispose();
      this.registration = undefined;
    }
  }

  update(enabled: boolean) {
    if (enabled) {
      if (!this.registration) this.registration = this._doRegister();
    } else {
      if (this.registration) {
        this.registration.dispose();
        this.registration = undefined;
      }
    }
  }
}

export class VersionDependentRegistration extends Disposable {
  private readonly _registration: ConditionalRegistration;

  constructor(
    private readonly client: IServiceClient,
    private readonly minVersion: API,
    register: () => vscode.Disposable
  ) {
    super();
    this._registration = new ConditionalRegistration(register);
    this.update(client.apiVersion);
    this.client.onServerStarted(
      () => {
        this.update(this.client.apiVersion);
      },
      null,
      this.dispos
    );
  }

  dispose() {
    super.dispose();
    this._registration.dispose();
  }

  private update(api: API) {
    this._registration.update(api.gte(this.minVersion));
  }
}

export class ConfigurationDependentRegistration extends Disposable {
  private readonly _registration: ConditionalRegistration;

  constructor(
    private readonly language: string,
    private readonly configValue: string,
    register: () => vscode.Disposable
  ) {
    super();
    this._registration = new ConditionalRegistration(register);
    this.update();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vscode.workspace.onDidChangeConfiguration(this.update, this, this.dispos);
  }

  dispose() {
    super.dispose();
    this._registration.dispose();
  }

  private update() {
    const c = vscode.workspace.getConfiguration(this.language, null);
    this._registration.update(!!c.get<boolean>(this.configValue));
  }
}
