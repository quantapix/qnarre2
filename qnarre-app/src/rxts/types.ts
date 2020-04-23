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

export interface Unsubscriber {
  unsubscribe(): void;
}

export type Closer = Unsubscriber | Fun<void> | void;

export interface Subscription extends Closed, Unsubscriber {
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

export type Input<N> =
  | Iterable<N>
  | ArrayLike<N>
  | SourceOrPromise<N>
  | AsyncIterableIterator<N>;

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

export interface State<N> {
  r: Subscriber<N>;
  cb: Function;
  ctx: any;
  args: any[];
  s?: Subject<N>;
  n: N;
  f: any;
}

export interface Action<N> extends Subscription {
  schedule(_?: State<N>, delay?: number): Subscription;
}

export interface Scheduler extends Stamper {
  schedule<N>(
    work: (this: Action<N>, _?: State<N>) => void,
    state?: State<N>,
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
