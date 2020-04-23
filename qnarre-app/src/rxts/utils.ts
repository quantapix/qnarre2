import * as qj from './subject';
import * as qt from './types';
import * as qs from './source';

export function identity<N>(x: N): N {
  return x;
}

export function isDate(x: any): x is Date {
  return x instanceof Date && !isNaN(+x);
}

export function isObject(x: any): x is Object {
  return !!x && typeof x === 'object';
}

export function isFunction(x: any): x is Function {
  return !!x && typeof x === 'function';
}

export function isNumeric(x: any): x is number | string {
  return !Array.isArray(x) && x - parseFloat(x) + 1 >= 0;
}

export function isArrayLike<N>(x: any): x is ArrayLike<N> {
  return !!x && typeof x !== 'function' && typeof x.length === 'number';
}

export function isIter<N>(x: any): x is Iterable<N> {
  return !!x && typeof x[Symbol.iterator] === 'function';
}

export function isAsyncIter<N>(x: any): x is AsyncIterable<N> {
  return !!x && typeof x[Symbol.asyncIterator] === 'function';
}

export function isInterop<N>(x: any): x is qt.Interop<N> {
  return !!x && typeof x[Symbol.rxSource] === 'function';
}

export function isPromise<N>(x: any): x is PromiseLike<N> {
  return !!x && typeof x.subscribe !== 'function' && typeof x.then === 'function';
}

export function isSource<N>(x: any): x is qs.Source<N> {
  return (
    !!x &&
    (x instanceof qs.Source ||
      (typeof x.lift === 'function' && typeof x.subscribe === 'function'))
  );
}

export function isScheduler(x: any): x is qt.Scheduler {
  return !!x && typeof x.schedule === 'function';
}

export function noop() {}

export function not(pred: Function, thisArg: any): Function {
  function notPred(): any {
    return !(<any>notPred).pred.apply((<any>notPred).thisArg, arguments);
  }
  (<any>notPred).pred = pred;
  (<any>notPred).thisArg = thisArg;
  return notPred;
}

export function pipe<N>(): qt.Mapper<N, N>;
export function pipe<N, A>(_1: qt.Mapper<N, A>): qt.Mapper<N, A>;
export function pipe<N, A, B>(_1: qt.Mapper<N, A>, _2: qt.Mapper<A, B>): qt.Mapper<N, B>;
export function pipe<N, A, B, C>(
  _1: qt.Mapper<N, A>,
  _2: qt.Mapper<A, B>,
  _3: qt.Mapper<B, C>
): qt.Mapper<N, C>;
export function pipe<N, A, B, C, D>(
  _1: qt.Mapper<N, A>,
  _2: qt.Mapper<A, B>,
  _3: qt.Mapper<B, C>,
  _4: qt.Mapper<C, D>
): qt.Mapper<N, D>;
export function pipe<N, A, B, C, D, E>(
  _1: qt.Mapper<N, A>,
  _2: qt.Mapper<A, B>,
  _3: qt.Mapper<B, C>,
  _4: qt.Mapper<C, D>,
  _5: qt.Mapper<D, E>
): qt.Mapper<N, E>;
export function pipe<N, A, B, C, D, E, F>(
  _1: qt.Mapper<N, A>,
  _2: qt.Mapper<A, B>,
  _3: qt.Mapper<B, C>,
  _4: qt.Mapper<C, D>,
  _5: qt.Mapper<D, E>,
  _6: qt.Mapper<E, F>
): qt.Mapper<N, F>;
export function pipe<N, A, B, C, D, E, F, G>(
  _1: qt.Mapper<N, A>,
  _2: qt.Mapper<A, B>,
  _3: qt.Mapper<B, C>,
  _4: qt.Mapper<C, D>,
  _5: qt.Mapper<D, E>,
  _6: qt.Mapper<E, F>,
  _7: qt.Mapper<F, G>
): qt.Mapper<N, G>;
export function pipe<N, A, B, C, D, E, F, G, H>(
  _1: qt.Mapper<N, A>,
  _2: qt.Mapper<A, B>,
  _3: qt.Mapper<B, C>,
  _4: qt.Mapper<C, D>,
  _5: qt.Mapper<D, E>,
  _6: qt.Mapper<E, F>,
  _7: qt.Mapper<F, G>,
  _8: qt.Mapper<G, H>
): qt.Mapper<N, H>;
export function pipe<N, A, B, C, D, E, F, G, H, I>(
  _1: qt.Mapper<N, A>,
  _2: qt.Mapper<A, B>,
  _3: qt.Mapper<B, C>,
  _4: qt.Mapper<C, D>,
  _5: qt.Mapper<D, E>,
  _6: qt.Mapper<E, F>,
  _7: qt.Mapper<F, G>,
  _8: qt.Mapper<G, H>,
  _9: qt.Mapper<H, I>
): qt.Mapper<N, I>;
export function pipe<N, A, B, C, D, E, F, G, H, I>(
  _1: qt.Mapper<N, A>,
  _2: qt.Mapper<A, B>,
  _3: qt.Mapper<B, C>,
  _4: qt.Mapper<C, D>,
  _5: qt.Mapper<D, E>,
  _6: qt.Mapper<E, F>,
  _7: qt.Mapper<F, G>,
  _8: qt.Mapper<G, H>,
  _9: qt.Mapper<H, I>,
  ..._: qt.Mapper<any, any>[]
): qt.Mapper<N, {}>;
export function pipe(...fs: qt.Mapper<any, any>[]): qt.Mapper<any, any> {
  return pipeFromArray(fs);
}

export function pipeFromArray<S, T>(fs: qt.Mapper<S, T>[]): qt.Mapper<S, T> {
  if (fs.length === 0) return identity as qt.Mapper<any, any>;
  if (fs.length === 1) return fs[0];
  return (x: S): T => fs.reduce((p: any, f: qt.Mapper<S, T>) => f(p), x as any);
}

export function subscribeToArray<N>(a: ArrayLike<N>) {
  return (r: qt.Subscriber<N>) => {
    for (let i = 0, len = a.length; i < len && !r.closed; i++) {
      r.next(a[i]);
    }
    r.done();
  };
}

export const subscribeToIter = <N>(it: Iterable<N>) => (s: qt.Subscriber<N>) => {
  const i = (it as any)[Symbol.iterator]();
  do {
    const item = i.next();
    if (item.done) {
      s.done();
      break;
    }
    s.next(item.value);
    if (s.closed) break;
  } while (true);
  if (typeof i.return === 'function') {
    s.add(() => {
      if (i.return) i.return();
    });
  }
  return s;
};

export function subscribeToAsyncIterable<N>(i: AsyncIterable<N>) {
  return (s: qt.Subscriber<N>) => {
    process(i, s).catch(e => s.fail(e));
  };
}

async function process<N>(i: AsyncIterable<N>, s: qt.Subscriber<N>) {
  for await (const n of i) {
    s.next(n);
  }
  s.done();
}

export const subscribeToSource = <N>(o: any) => (s: qt.Subscriber<N>) => {
  const obs = (o as any)[Symbol.rxSource]();
  if (typeof obs.subscribe !== 'function') {
    throw new TypeError('Provided object does not correctly implement Symbol.rxSource');
  }
  return obs.subscribe(s);
};

export const subscribeToPromise = <N>(p: PromiseLike<N>) => (s: qt.Subscriber<N>) => {
  p.then(
    n => {
      if (!s.closed) {
        s.next(n);
        s.done();
      }
    },
    f => s.fail(f)
  ).then(null, delayedThrow);
  return s;
};

export function subscribeToResult<N, R>(
  r: qj.Reactor<N, R>,
  result: any,
  rn: undefined,
  ri: undefined,
  a: qj.Actor<N, R>
): qt.Subscription | undefined;
export function subscribeToResult<N, R>(
  r: qj.Reactor<N, R>,
  result: any,
  rn?: R,
  ri?: number
): qt.Subscription | undefined;
export function subscribeToResult<N, R>(
  r: qj.Reactor<N, R>,
  result: any,
  rn?: R,
  ri?: number,
  a: qj.Subscriber<N> = new qj.Actor(r, rn, ri)
): qt.Subscription | undefined {
  if (a.closed) return;
  if (result instanceof qs.Source) return result.subscribe(a);
  return subscribeTo(result)(a) as qt.Subscription;
}

export const subscribeTo = <N>(
  r: qt.Input<N>
): ((_: qj.Subscriber<N>) => qt.Subscription) => {
  if (!!r && typeof (r as any)[Symbol.rxSource] === 'function') {
    return subscribeToSource(r as any);
  } else if (isArrayLike(r)) {
    return subscribeToArray(r);
  } else if (isPromise(r)) {
    return subscribeToPromise(r);
  } else if (!!r && typeof (r as any)[Symbol.iterator] === 'function') {
    return subscribeToIterable(r as any);
  } else if (
    Symbol &&
    Symbol.asyncIterator &&
    !!r &&
    typeof (r as any)[Symbol.asyncIterator] === 'function'
  ) {
    return subscribeToAsyncIterable(r as any);
  } else {
    const value = isObject(r) ? 'an invalid object' : `'${r}'`;
    const msg =
      `You provided ${value} where a stream was expected.` +
      ' You can provide an Source, Promise, Array, or Iterable.';
    throw new TypeError(msg);
  }
};

export interface OutOfRangeError extends Error {}

export interface OutOfRangeErrorCtor {
  new (): OutOfRangeError;
}

const OutOfRangeErrorImpl = (() => {
  function OutOfRangeErrorImpl(this: Error) {
    Error.call(this);
    this.message = 'out of range';
    this.name = 'OutOfRangeError';
    return this;
  }

  OutOfRangeErrorImpl.prototype = Object.create(Error.prototype);

  return OutOfRangeErrorImpl;
})();

export const OutOfRangeError: OutOfRangeErrorCtor = OutOfRangeErrorImpl as any;

export interface EmptyError extends Error {}

export interface EmptyErrorCtor {
  new (): EmptyError;
}

const EmptyErrorImpl = (() => {
  function EmptyErrorImpl(this: Error) {
    Error.call(this);
    this.message = 'no elements in sequence';
    this.name = 'EmptyError';
    return this;
  }

  EmptyErrorImpl.prototype = Object.create(Error.prototype);

  return EmptyErrorImpl;
})();

export const EmptyError: EmptyErrorCtor = EmptyErrorImpl as any;

let nextHandle = 1;
let resolved: Promise<any>;
const activeHandles: {[key: number]: any} = {};

function findAndClearHandle(handle: number): boolean {
  if (handle in activeHandles) {
    delete activeHandles[handle];
    return true;
  }
  return false;
}

export const Immediate = {
  setImmediate(cb: qt.Fun<void>): number {
    const handle = nextHandle++;
    activeHandles[handle] = true;
    if (!resolved) resolved = Promise.resolve();
    resolved.then(() => findAndClearHandle(handle) && cb());
    return handle;
  },

  clearImmediate(handle: number): void {
    findAndClearHandle(handle);
  }
};

export const TestTools = {
  pending() {
    return Object.keys(activeHandles).length;
  }
};

export interface UnsubscribedError extends Error {}

export interface UnsubscribedErrorCtor {
  new (): UnsubscribedError;
}

const UnsubscribedErrorImpl = (() => {
  function UnsubscribedErrorImpl(this: Error) {
    Error.call(this);
    this.message = 'object unsubscribed';
    this.name = 'UnsubscribedError';
    return this;
  }

  UnsubscribedErrorImpl.prototype = Object.create(Error.prototype);

  return UnsubscribedErrorImpl;
})();

export const UnsubscribedError: UnsubscribedErrorCtor = UnsubscribedErrorImpl as any;

export interface TimeoutError extends Error {}

export interface TimeoutErrorCtor {
  new (): TimeoutError;
}

const TimeoutErrorImpl = (() => {
  function TimeoutErrorImpl(this: Error) {
    Error.call(this);
    this.message = 'Timeout has occurred';
    this.name = 'TimeoutError';
    return this;
  }

  TimeoutErrorImpl.prototype = Object.create(Error.prototype);

  return TimeoutErrorImpl;
})();

export const TimeoutError: TimeoutErrorCtor = TimeoutErrorImpl as any;

export interface UnsubscribeError extends Error {
  readonly errors: any[];
}

export interface UnsubscribeErrorCtor {
  new (es: any[]): UnsubscribeError;
}

const UnsubscribeErrorImpl = (() => {
  function UnsubscribeErrorImpl(this: Error, es: (Error | string)[]) {
    Error.call(this);
    this.message = es
      ? `${es.length} errors occurred during unsubscription:
${es.map((err, i) => `${i + 1}) ${err.toString()}`).join('\n  ')}`
      : '';
    this.name = 'UnsubscribeError';
    (this as any).errors = es;
    return this;
  }

  UnsubscribeErrorImpl.prototype = Object.create(Error.prototype);

  return UnsubscribeErrorImpl;
})();

export const UnsubscribeError: UnsubscribeErrorCtor = UnsubscribeErrorImpl as any;
export function applyMixins(derivedCtor: any, baseCtors: any[]) {
  for (let i = 0, len = baseCtors.length; i < len; i++) {
    const baseCtor = baseCtors[i];
    const propertyKeys = Object.getOwnPropertyNames(baseCtor.prototype);
    for (let j = 0, len2 = propertyKeys.length; j < len2; j++) {
      const name = propertyKeys[j];
      derivedCtor.prototype[name] = baseCtor.prototype[name];
    }
  }
}

export function canReportError<N>(s: qt.Subscriber<N> | qt.Subject<N>) {
  while (s) {
    const {closed, tgt, stopped} = s as any;
    if (closed || stopped) return false;
    else if (tgt && tgt instanceof qj.Subscriber) s = tgt;
    else break;
  }
  return true;
}

export const errorObject: any = {e: {}};

export function delayedThrow(e: any) {
  setTimeout(() => {
    throw e;
  }, 0);
}

declare let global: any;

declare var WorkerGlobalScope: any;

const __window = typeof window !== 'undefined' && window;
const __self =
  typeof self !== 'undefined' &&
  typeof WorkerGlobalScope !== 'undefined' &&
  self instanceof WorkerGlobalScope &&
  self;
const __global = typeof global !== 'undefined' && global;
const _root: any = __window || __global || __self;

(function () {
  if (!_root) {
    throw new Error('RxJS could not find any global context (window, self, global)');
  }
})();

let tryCatchTarget: Function | undefined;

function tryCatcher(this: any): any {
  errorObject.e = undefined;
  try {
    return tryCatchTarget!.apply(this, arguments);
  } catch (e) {
    errorObject.e = e;
    return errorObject;
  } finally {
    tryCatchTarget = undefined;
  }
}

export function tryCatch<N extends Function>(fn: T): T {
  tryCatchTarget = _;
  return (tryCatcher as Function) as T;
}
