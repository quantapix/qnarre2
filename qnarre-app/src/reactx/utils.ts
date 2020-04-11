import {Subject} from './Subject';
import {Observer, ObservableInput, InteropObservable} from './types';
import {Observable} from './observe';
import {SchedulerLike} from './types';
import {UnaryFunction} from './types';
import {Subscription} from './subscribe';

import {InnerSubscriber} from './InnerSubscriber';
import {OuterSubscriber} from './OuterSubscriber';

import * as qt from './types';

export interface OutOfRangeError extends Error {}

export interface OutOfRangeErrorCtor {
  new (): OutOfRangeError;
}

const OutOfRangeErrorImpl = (() => {
  function OutOfRangeErrorImpl(this: Error) {
    Error.call(this);
    this.message = 'argument out of range';
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
  setImmediate(cb: () => void): number {
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

export const emptyObserver: Observer<any> = {
  closed: true,
  next(_: any): void {
    /* noop */
  },
  error(e: any): void {
    hostReportError(e);
  },
  complete(): void {
    /*noop*/
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

export interface UnsubscriptionError extends Error {
  readonly errors: any[];
}

export interface UnsubscriptionErrorCtor {
  new (es: any[]): UnsubscriptionError;
}

const UnsubscriptionErrorImpl = (() => {
  function UnsubscriptionErrorImpl(this: Error, es: (Error | string)[]) {
    Error.call(this);
    this.message = es
      ? `${es.length} errors occurred during unsubscription:
${es.map((err, i) => `${i + 1}) ${err.toString()}`).join('\n  ')}`
      : '';
    this.name = 'UnsubscriptionError';
    (this as any).errors = es;
    return this;
  }

  UnsubscriptionErrorImpl.prototype = Object.create(Error.prototype);

  return UnsubscriptionErrorImpl;
})();

export const UnsubscriptionError: UnsubscriptionErrorCtor = UnsubscriptionErrorImpl as any;
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

export function canReportError(s: qt.Subscriber<any> | Subject<any>): boolean {
  while (s) {
    const {closed, destination, stopped} = s as any;
    if (closed || stopped) {
      return false;
    } else if (destination && destination instanceof Subscriber) {
      s = destination;
    } else {
      s = null!;
    }
  }
  return true;
}

export class Deferred<T> {
  resolve: (_?: T | PromiseLike<T> | undefined) => void = null!;
  reject: (_: any) => void = null!;
  promise = new Promise<T>((a, b) => {
    this.resolve = a;
    this.reject = b;
  });
}

export const errorObject: any = {e: {}};

export function hostReportError(e: any) {
  setTimeout(() => {
    throw e;
  }, 0);
}

export function identity<T>(x: T): T {
  return x;
}

export const isArrayLike = <T>(x: any): x is ArrayLike<T> =>
  x && typeof x.length === 'number' && typeof x !== 'function';

export function isDate(x: any): x is Date {
  return x instanceof Date && !isNaN(+x);
}

export function isFunction(x: any): x is Function {
  return typeof x === 'function';
}

export function isInteropObservable(x: any): x is InteropObservable<any> {
  return x && typeof x[Symbol.observable] === 'function';
}

export function isIterable(x: any): x is Iterable<any> {
  return x && typeof x[Symbol.iterator] === 'function';
}

export function isNumeric(x: any): x is number | string {
  return !Array.isArray(x) && x - parseFloat(x) + 1 >= 0;
}

export function isObject(x: any): x is Object {
  return x !== null && typeof x === 'object';
}

export function isObservable<T>(x: any): x is Observable<T> {
  return (
    !!x &&
    (x instanceof Observable ||
      (typeof x.lift === 'function' && typeof x.subscribe === 'function'))
  );
}

export function isPromise(x: any): x is PromiseLike<any> {
  return (
    !!x && typeof x.subscribe !== 'function' && typeof x.then === 'function'
  );
}

export function isScheduler(x: any): x is SchedulerLike {
  return x && typeof (<any>x).schedule === 'function';
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

export function pipe<T>(): UnaryFunction<T, T>;
export function pipe<T, A>(fn1: UnaryFunction<T, A>): UnaryFunction<T, A>;
export function pipe<T, A, B>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>
): UnaryFunction<T, B>;
export function pipe<T, A, B, C>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>
): UnaryFunction<T, C>;
export function pipe<T, A, B, C, D>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>
): UnaryFunction<T, D>;
export function pipe<T, A, B, C, D, E>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>
): UnaryFunction<T, E>;
export function pipe<T, A, B, C, D, E, F>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>
): UnaryFunction<T, F>;
export function pipe<T, A, B, C, D, E, F, G>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>
): UnaryFunction<T, G>;
export function pipe<T, A, B, C, D, E, F, G, H>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>
): UnaryFunction<T, H>;
export function pipe<T, A, B, C, D, E, F, G, H, I>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>
): UnaryFunction<T, I>;
export function pipe<T, A, B, C, D, E, F, G, H, I>(
  fn1: UnaryFunction<T, A>,
  fn2: UnaryFunction<A, B>,
  fn3: UnaryFunction<B, C>,
  fn4: UnaryFunction<C, D>,
  fn5: UnaryFunction<D, E>,
  fn6: UnaryFunction<E, F>,
  fn7: UnaryFunction<F, G>,
  fn8: UnaryFunction<G, H>,
  fn9: UnaryFunction<H, I>,
  ...fns: UnaryFunction<any, any>[]
): UnaryFunction<T, {}>;

export function pipe(
  ...fns: Array<UnaryFunction<any, any>>
): UnaryFunction<any, any> {
  return pipeFromArray(fns);
}

export function pipeFromArray<T, R>(
  fns: Array<UnaryFunction<T, R>>
): UnaryFunction<T, R> {
  if (fns.length === 0) {
    return identity as UnaryFunction<any, any>;
  }

  if (fns.length === 1) {
    return fns[0];
  }

  return function piped(input: T): R {
    return fns.reduce(
      (prev: any, fn: UnaryFunction<T, R>) => fn(prev),
      input as any
    );
  };
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
    throw new Error(
      'RxJS could not find any global context (window, self, global)'
    );
  }
})();

export const subscribeTo = <T>(
  result: ObservableInput<T>
): ((subscriber: qt.Subscriber<T>) => Subscription | void) => {
  if (!!result && typeof (result as any)[Symbol.observable] === 'function') {
    return subscribeToObservable(result as any);
  } else if (isArrayLike(result)) {
    return subscribeToArray(result);
  } else if (isPromise(result)) {
    return subscribeToPromise(result);
  } else if (
    !!result &&
    typeof (result as any)[Symbol.iterator] === 'function'
  ) {
    return subscribeToIterable(result as any);
  } else if (
    Symbol &&
    Symbol.asyncIterator &&
    !!result &&
    typeof (result as any)[Symbol.asyncIterator] === 'function'
  ) {
    return subscribeToAsyncIterable(result as any);
  } else {
    const value = isObject(result) ? 'an invalid object' : `'${result}'`;
    const msg =
      `You provided ${value} where a stream was expected.` +
      ' You can provide an Observable, Promise, Array, or Iterable.';
    throw new TypeError(msg);
  }
};

export const subscribeToArray = <T>(array: ArrayLike<T>) => (
  subscriber: qt.Subscriber<T>
) => {
  for (let i = 0, len = array.length; i < len && !subscriber.closed; i++) {
    subscriber.next(array[i]);
  }
  subscriber.complete();
};

export function subscribeToAsyncIterable<T>(asyncIterable: AsyncIterable<T>) {
  return (subscriber: qt.Subscriber<T>) => {
    process(asyncIterable, subscriber).catch(err => subscriber.error(err));
  };
}

async function process<T>(
  asyncIterable: AsyncIterable<T>,
  subscriber: qt.Subscriber<T>
) {
  for await (const value of asyncIterable) {
    subscriber.next(value);
  }
  subscriber.complete();
}

export const subscribeToIterable = <T>(iterable: Iterable<T>) => (
  subscriber: qt.Subscriber<T>
) => {
  const iterator = (iterable as any)[Symbol.iterator]();
  do {
    const item = iterator.next();
    if (item.done) {
      subscriber.complete();
      break;
    }
    subscriber.next(item.value);
    if (subscriber.closed) {
      break;
    }
  } while (true);
  if (typeof iterator.return === 'function') {
    subscriber.add(() => {
      if (iterator.return) {
        iterator.return();
      }
    });
  }
  return subscriber;
};

export const subscribeToObservable = <T>(obj: any) => (
  subscriber: qt.Subscriber<T>
) => {
  const obs = (obj as any)[Symbol.observable]();
  if (typeof obs.subscribe !== 'function') {
    throw new TypeError(
      'Provided object does not correctly implement Symbol.observable'
    );
  } else {
    return obs.subscribe(subscriber);
  }
};

export const subscribeToPromise = <T>(promise: PromiseLike<T>) => (
  subscriber: qt.Subscriber<T>
) => {
  promise
    .then(
      value => {
        if (!subscriber.closed) {
          subscriber.next(value);
          subscriber.complete();
        }
      },
      (err: any) => subscriber.error(err)
    )
    .then(null, hostReportError);
  return subscriber;
};

export function subscribeToResult<T, R>(
  outerSubscriber: OuterSubscriber<T, R>,
  result: any,
  outerValue: undefined,
  outerIndex: undefined,
  innerSubscriber: InnerSubscriber<T, R>
): Subscription | undefined;

export function subscribeToResult<T, R>(
  outerSubscriber: OuterSubscriber<T, R>,
  result: any,
  outerValue?: T,
  outerIndex?: number
): Subscription | undefined;

export function subscribeToResult<T, R>(
  outerSubscriber: OuterSubscriber<T, R>,
  result: any,
  outerValue?: T,
  outerIndex?: number,
  innerSubscriber: Subscriber<R> = new InnerSubscriber(
    outerSubscriber,
    outerValue,
    outerIndex!
  )
): Subscription | undefined {
  if (innerSubscriber.closed) return undefined;
  if (result instanceof Observable) return result.subscribe(innerSubscriber);
  return subscribeTo(result)(innerSubscriber) as Subscription;
}

export function toSubscriber<T>(
  o?: qt.PartialObserver<T> | ((_: T) => void),
  e?: ((_: any) => void) | null,
  c?: (() => void) | null
): Subscriber<T> {
  if (o) {
    if (o instanceof Subscriber) return o;
    if ((o as any)[Symbol.rxSubscriber]) {
      return (o as any)[Symbol.rxSubscriber]();
    }
  }
  if (!o && !e && !c) return new Subscriber(qu.emptyObserver);
  return new Subscriber(o);
}

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

export function tryCatch<T extends Function>(fn: T): T {
  tryCatchTarget = fn;
  return (tryCatcher as Function) as T;
}
