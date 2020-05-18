export interface Lazy<T> {
  readonly value: T;
  readonly hasValue: boolean;
  map<R>(f: (x: T) => R): Lazy<R>;
}

class LazyValue<T> implements Lazy<T> {
  private _hasValue = false;
  private _value?: T;

  constructor(private readonly _getValue: () => T) {}

  get value(): T {
    if (!this._hasValue) {
      this._hasValue = true;
      this._value = this._getValue();
    }
    return this._value!;
  }

  get hasValue(): boolean {
    return this._hasValue;
  }

  public map<R>(f: (x: T) => R): Lazy<R> {
    return new LazyValue(() => f(this.value));
  }
}

export function lazy<T>(getValue: () => T): Lazy<T> {
  return new LazyValue<T>(getValue);
}

export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolved: boolean;
  readonly rejected: boolean;
  readonly completed: boolean;
  resolve(_?: T | PromiseLike<T>): void;
  reject(_?: any): void;
}

class DeferredImpl<T> implements Deferred<T> {
  private _res!: (_?: T | PromiseLike<T>) => void;
  private _rej!: (_?: any) => void;
  private _resolved = false;
  private _rejected = false;
  private _promise: Promise<T>;

  constructor(private scope: any = null) {
    this._promise = new Promise<T>((res, rej) => {
      this._res = res;
      this._rej = rej;
    });
  }

  public resolve(_?: T | PromiseLike<T>) {
    this._res.apply(this.scope ? this.scope : this, arguments as any);
    this._resolved = true;
  }

  public reject(_?: any) {
    this._rej.apply(this.scope ? this.scope : this, arguments as any);
    this._rejected = true;
  }

  get promise(): Promise<T> {
    return this._promise;
  }

  get resolved() {
    return this._resolved;
  }

  get rejected() {
    return this._rejected;
  }

  get completed() {
    return this._rejected || this._resolved;
  }
}

export function createDeferred<T>(scope: any = null): Deferred<T> {
  return new DeferredImpl<T>(scope);
}

export function deferredFrom<T>(...ps: Promise<T>[]) {
  const d = createDeferred<T>();
  Promise.all<T>(ps)
    .then(d.resolve.bind(d) as any)
    .catch(d.reject.bind(d) as any);
  return d;
}

export function deferredFromPromise<T>(p: Promise<T>) {
  const d = createDeferred<T>();
  p.then(d.resolve.bind(d)).catch(d.reject.bind(d));
  return d;
}
