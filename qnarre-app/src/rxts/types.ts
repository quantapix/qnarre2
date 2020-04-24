declare global {
  interface SymbolConstructor {
    readonly rxSource: symbol;
    readonly rxSubscriber: symbol;
  }
}

export const rxSource = Symbol('rxSource');
export const rxSubscriber = Symbol('rxSubscriber');

export interface Closed {
  readonly closed?: boolean;
}

export type Fun<T> = (_: T) => void;

export interface Observer<N> extends Closed {
  next: Fun<N>;
  fail: Fun<any>;
  done: Fun<void>;
}

export interface Nobs<N> extends Closed {
  next: Fun<N>;
  fail?: Fun<any>;
  done?: Fun<void>;
}

export interface Fobs<N> extends Closed {
  next?: Fun<N>;
  fail: Fun<any>;
  done?: Fun<void>;
}

export interface Dobs<N> extends Closed {
  next?: Fun<N>;
  fail?: Fun<any>;
  done: Fun<void>;
}

export type Target<N> = Nobs<N> | Fobs<N> | Dobs<N>;

export interface Unsubscriber extends Closed {
  unsubscribe(): void;
}

export type Closer = Unsubscriber | Fun<void> | void;

export interface Subscription extends Unsubscriber {
  add(c?: Closer): Subscription;
}

export interface RefCounted extends Subscription {
  unsubscribing?: boolean;
  count: number;
}

export interface Subscriber<N> extends Observer<N>, Subscription {}

export interface Source<N> {
  orig?: Source<any>;
  oper?: Operator<any, N>;
  subscribe(_?: Target<N>): Subscription;
  lift<R>(_?: Operator<N, R>): Source<R>;
}

export interface Subject<N> extends Source<N>, Observer<N> {
  readonly stopped?: boolean;
}

export interface Mapper<N, R> {
  (_: N): R;
}

export interface Lifter<N, R> extends Mapper<Source<N>, Source<R>> {}

export interface Shifter<N> extends Lifter<N, N> {}

export interface Operator<N, R> {
  call(r: Subscriber<R>, s: Source<N>): Subscription;
}

export type Interop<N> = {
  [Symbol.rxSource]: () => Source<N>;
};

export type SourceOrPromise<N> = Source<N> | Source<never> | PromiseLike<N> | Interop<N>;

export type Input<N> = ArrayLike<N> | Iterable<N> | AsyncIterable<N> | SourceOrPromise<N>;

export type Sourced<X> = X extends Input<infer N> ? N : never;

export type ValueOf<X> = X extends Array<infer T> ? T : never;

export type SourcedOf<X> = X extends Array<Input<infer T>> ? T : never;

export type SourcedTuple<X> = X extends Array<Input<any>>
  ? {[K in keyof X]: Sourced<X[K]>}
  : never;

export type Unshift<X extends any[], Y> = ((y: Y, ...x: X) => any) extends (
  ..._: infer U
) => any
  ? U
  : never;

export type FactoryOrValue<T> = (() => T) | T;

export interface Stamp<T> {
  time: number;
  value: T;
}

export interface Interval<T> {
  interval: number;
  value: T;
}

export interface Stamper {
  now(): number;
}

export interface State {
  ctx: any;
  cb: Function;
  args: any[];
}

export interface Nstate<N> extends State {
  r: Subscriber<N>;
  s?: Subject<N>;
  n: N;
  f: any;
}

export type Nof<X> = X extends Nstate<infer N> ? N : never;

export interface Action<S extends State> extends Subscription {
  schedule(_?: S, delay?: number): Subscription;
}

export interface Scheduler extends Stamper {
  schedule<S extends State>(
    work: (this: Action<S>, _?: S) => void,
    state?: S,
    delay?: number
  ): Subscription;
}

export type NodeEventHandler = (..._: any[]) => void;

export interface NodeEventEmitter {
  addListener: (n: string | symbol, h: NodeEventHandler) => this;
  removeListener: (n: string | symbol, h: NodeEventHandler) => this;
}

export interface CompatEventEmitter {
  addListener: (n: string, h: NodeEventHandler) => void | {};
  removeListener: (n: string, h: NodeEventHandler) => void | {};
}

export interface JQueryEventEmitter {
  on: (n: string, h: Function) => void;
  off: (n: string, h: Function) => void;
}

export interface ListenerOptions {
  capture?: boolean;
  passive?: boolean;
  once?: boolean;
}

export interface HasAddRemove<E> {
  addEventListener(t: string, l: (_: E) => void, _?: ListenerOptions | boolean): void;
  removeEventListener(t: string, l?: (_: E) => void, _?: ListenerOptions | boolean): void;
}

export type EventTargetLike<T> =
  | HasAddRemove<T>
  | NodeEventEmitter
  | CompatEventEmitter
  | JQueryEventEmitter;

export type FromEventTarget<T> = EventTargetLike<T> | ArrayLike<EventTargetLike<T>>;

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

export function isInterop<N>(x: any): x is Interop<N> {
  return !!x && typeof x[Symbol.rxSource] === 'function';
}

export function isPromise<N>(x: any): x is PromiseLike<N> {
  return !!x && typeof x.subscribe !== 'function' && typeof x.then === 'function';
}

export function isSource<N>(x: any): x is Source<N> {
  return !!x && typeof x.lift === 'function' && typeof x.subscribe === 'function';
}

export function isScheduler(x: any): x is Scheduler {
  return !!x && typeof x.schedule === 'function';
}

export function isNodeEventEmitter(o: any): o is NodeEventEmitter {
  return (
    o && typeof o.addListener === 'function' && typeof o.removeListener === 'function'
  );
}

export function isJQueryEventEmitter(o: any): o is JQueryEventEmitter {
  return o && typeof o.on === 'function' && typeof o.off === 'function';
}

export function isEventTarget(o: any): o is HasAddRemove<any> {
  return (
    o &&
    typeof o.addEventListener === 'function' &&
    typeof o.removeEventListener === 'function'
  );
}

export function noop() {}

export function not(pred: Function, ctx: any): Function {
  return function (): any {
    return !pred.apply(ctx, arguments);
  };
}
