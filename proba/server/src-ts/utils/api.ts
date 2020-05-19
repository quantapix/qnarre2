import * as semver from 'semver';
import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();

export class API {
  private static fromSimpleString(v: string) {
    return new API(v, v, v);
  }

  public static readonly defaultVersion = API.fromSimpleString('3.8.1');
  public static readonly v381 = API.fromSimpleString('3.8.1');
  public static readonly v390 = API.fromSimpleString('3.9.0');

  public static fromVersionString(s: string): API {
    let v = semver.valid(s);
    if (!v) return new API(localize('invalid', 'invalid'), '1.0.0', '1.0.0');
    const i = s.indexOf('-');
    if (i >= 0) v = v.substr(0, i);
    return new API(s, v, s);
  }

  private constructor(
    public readonly display: string,
    public readonly version: string,
    public readonly fullVersion: string
  ) {}

  public eq(o: API) {
    return semver.eq(this.version, o.version);
  }

  public gte(o: API) {
    return semver.gte(this.version, o.version);
  }

  public lt(o: API) {
    return !this.gte(o);
  }
}
