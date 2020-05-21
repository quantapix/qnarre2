import * as nls from 'vscode-nls';
import * as semver from 'semver';
import * as vsc from 'vscode';

import * as qs from '../service';
import * as qx from './extras';

const localize = nls.loadMessageBundle();

export class API {
  static readonly default = API.fromString('4.0.0');
  static readonly v400 = API.fromString('4.0.0');

  private static fromString(v: string) {
    return new API(v, v, v);
  }

  static fromVersionString(s: string) {
    let v = semver.valid(s);
    if (!v) return new API(localize('invalid', 'invalid'), '0.0.0', '0.0.0');
    const i = s.indexOf('-');
    if (i >= 0) v = v.substr(0, i);
    return new API(s, v, s);
  }

  private constructor(
    public readonly display: string,
    public readonly version: string,
    public readonly fullVersion: string
  ) {}

  eq(o: API) {
    return semver.eq(this.version, o.version);
  }

  gte(o: API) {
    return semver.gte(this.version, o.version);
  }

  lt(o: API) {
    return !this.gte(o);
  }
}

export class Conditional {
  private reg?: vsc.Disposable;

  constructor(private readonly register: () => vsc.Disposable) {}

  dispose() {
    if (this.reg) {
      this.reg.dispose();
      this.reg = undefined;
    }
  }

  update(on: boolean) {
    if (on) {
      if (!this.reg) this.reg = this.register();
    } else {
      if (this.reg) {
        this.reg.dispose();
        this.reg = undefined;
      }
    }
  }
}

export class VersionDependent extends qx.Disposable {
  private readonly reg: Conditional;

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly min: API,
    register: () => vsc.Disposable
  ) {
    super();
    this.reg = new Conditional(register);
    this.update(client.api);
    this.client.onServerStarted(
      () => {
        this.update(this.client.api);
      },
      null,
      this.dispos
    );
  }

  dispose() {
    super.dispose();
    this.reg.dispose();
  }

  private update(api: API) {
    this.reg.update(api.gte(this.min));
  }
}

export class ConfigDependent extends qx.Disposable {
  private readonly reg: Conditional;

  constructor(
    private readonly lang: string,
    private readonly cfg: string,
    register: () => vsc.Disposable
  ) {
    super();
    this.reg = new Conditional(register);
    this.update();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vsc.workspace.onDidChangeConfiguration(this.update, this, this.dispos);
  }

  dispose() {
    super.dispose();
    this.reg.dispose();
  }

  private update() {
    const c = vsc.workspace.getConfiguration(this.lang);
    this.reg.update(!!c.get<boolean>(this.cfg));
  }
}
