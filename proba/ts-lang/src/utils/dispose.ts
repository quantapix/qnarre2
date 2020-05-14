import * as vscode from 'vscode';

export const variableDeclaredButNeverUsed = 6133;
export const propertyDeclaretedButNeverUsed = 6138;
export const allImportsAreUnused = 6192;
export const unreachableCode = 7027;
export const unusedLabel = 7028;
export const fallThroughCaseInSwitch = 7029;
export const notAllCodePathsReturnAValue = 7030;

const noopDisposable = vscode.Disposable.from();

export const nulToken: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => noopDisposable,
};

export function escapeRegExp(t: string) {
  return t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
export const empty = Object.freeze([]);

export function equals<T>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>,
  eq: (a: T, b: T) => boolean = (a, b) => a === b
) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((x, i) => eq(x, b[i]));
}

export function equals2(a: any, b: any) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return equals(a, b, equals);
  const aKeys: string[] = [];
  for (const k in a) {
    aKeys.push(k);
  }
  aKeys.sort();
  const bKeys: string[] = [];
  for (const k in b) {
    bKeys.push(k);
  }
  bKeys.sort();
  if (!equals(aKeys, bKeys)) return false;
  return aKeys.every((k) => equals(a[k], b[k]));
}

export function flatten<T>(a: ReadonlyArray<T>[]) {
  return Array.prototype.concat.apply([], a) as T[];
}

export function coalesce<T>(a: ReadonlyArray<T | undefined>) {
  return a.filter((e) => !!e) as T[];
}

export function memoize(_target: any, key: string, desc: any) {
  let fk: string | undefined;
  let f: Function | undefined;
  if (typeof desc.value === 'function') {
    fk = 'value';
    f = desc.value;
  } else if (typeof desc.get === 'function') {
    fk = 'get';
    f = desc.get;
  } else throw new Error('not supported');
  const k = `$memoize$${key}`;
  desc[fk] = function (...args: any[]) {
    // eslint-disable-next-line no-prototype-builtins
    if (!this.hasOwnProperty(k)) {
      Object.defineProperty(this, k, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: f!.apply(this, args),
      });
    }
    return this[k];
  };
}

export interface Lazy<T> {
  value: T;
  hasValue: boolean;
  map<R>(f: (x: T) => R): Lazy<R>;
}

class LazyValue<T> implements Lazy<T> {
  private _value?: T;
  private _hasValue = false;

  constructor(private readonly _getValue: () => T) {}

  get hasValue() {
    return this._hasValue;
  }

  get value(): T {
    if (!this._hasValue) {
      this._hasValue = true;
      this._value = this._getValue();
    }
    return this._value!;
  }

  public map<R>(f: (x: T) => R): Lazy<R> {
    return new LazyValue(() => f(this.value));
  }
}

export function lazy<T>(getValue: () => T): Lazy<T> {
  return new LazyValue<T>(getValue);
}

export class ResourceMap<T> {
  private readonly _map = new Map<string, { uri: vscode.Uri; value: T }>();

  constructor(
    private readonly _normalizePath: (_: vscode.Uri) => string | undefined = (uri) =>
      uri.fsPath
  ) {}

  public get size() {
    return this._map.size;
  }

  public has(uri: vscode.Uri) {
    const k = this.toKey(uri);
    return !!k && this._map.has(k);
  }

  public get(uri: vscode.Uri) {
    const k = this.toKey(uri);
    if (!k) return undefined;
    const v = this._map.get(k);
    return v?.value;
  }

  public set(uri: vscode.Uri, value: T) {
    const k = this.toKey(uri);
    if (!k) return;
    const v = this._map.get(k);
    if (v) v.value = value;
    else this._map.set(k, { uri, value });
  }

  public delete(uri: vscode.Uri) {
    const k = this.toKey(uri);
    if (k) this._map.delete(k);
  }

  public clear() {
    this._map.clear();
  }

  public get values() {
    return Array.from(this._map.values()).map((x) => x.value);
  }

  public get entries() {
    return this._map.values();
  }

  private toKey(uri: vscode.Uri) {
    const k = this._normalizePath(uri);
    if (!k) return k;
    return this.isCaseInsensitivePath(k) ? k.toLowerCase() : k;
  }

  private isCaseInsensitivePath(p: string) {
    if (isWindowsPath(p)) return true;
    return p.startsWith('/');
  }
}

export function isWindowsPath(p: string) {
  return /^[a-zA-Z]:[/\\]/.test(p);
}

export interface Command {
  readonly id: string | string[];
  execute(..._: any[]): void;
}

export class CommandManager {
  private readonly cs = new Map<string, vscode.Disposable>();

  public dispose() {
    for (const c of this.cs.values()) {
      c.dispose();
    }
    this.cs.clear();
  }

  public register<T extends Command>(c: T) {
    for (const id of Array.isArray(c.id) ? c.id : [c.id]) {
      this.registerCommand(id, c.execute, c);
    }
    return c;
  }

  private registerCommand(id: string, c: (..._: any[]) => void, thisArg?: any) {
    if (this.cs.has(id)) return;
    this.cs.set(id, vscode.commands.registerCommand(id, c, thisArg));
  }
}

export interface Task<T> {
  (): T;
}

export class Delayer<T> {
  private task?: Task<T>;
  private done?: Promise<T | undefined>;
  private timeout?: number;
  private onSuccess?: (v?: T | Thenable<T>) => void;

  constructor(public defaultDelay: number) {}

  public trigger(t: Task<T>, delay = this.defaultDelay) {
    this.task = t;
    if (delay >= 0) this.cancelTimeout();
    if (!this.done) {
      this.done = new Promise<T>((res) => {
        this.onSuccess = res;
      }).then(() => {
        this.done = undefined;
        this.onSuccess = undefined;
        const r = this.task?.();
        this.task = undefined;
        return r;
      });
    }
    if (delay >= 0 || !this.timeout) {
      this.timeout = setTimeout(
        () => {
          this.timeout = undefined;
          if (this.onSuccess) this.onSuccess(undefined);
        },
        delay >= 0 ? delay : this.defaultDelay
      );
    }
    return this.done;
  }

  private cancelTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}

export function disposeAll(ds: vscode.Disposable[]) {
  while (ds.length) {
    const d = ds.pop();
    d?.dispose();
  }
}

export abstract class Disposable {
  private _isDisposed = false;
  protected _disposables: vscode.Disposable[] = [];

  protected get isDisposed() {
    return this._isDisposed;
  }

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
}
