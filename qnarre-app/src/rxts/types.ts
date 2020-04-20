declare global {
  interface SymbolConstructor {
    readonly rxSource: symbol;
    readonly rxSubscriber: symbol;
  }
}

export const rxSubscriber = Symbol('rxSubscriber');

export type Cfun = () => void;
export type Ofun<T> = (_?: T) => void;

export interface Observer<N, F = any, D = any> {
  readonly closed?: boolean;
  next: Ofun<N>;
  fail: Ofun<F>;
  done: Ofun<D>;
}

export interface Nobs<N, F = any, D = any> {
  readonly closed?: boolean;
  next: Ofun<N>;
  fail?: Ofun<F>;
  done?: Ofun<D>;
}

export interface Fobs<N, F = any, D = any> {
  readonly closed?: boolean;
  next?: Ofun<N>;
  fail: Ofun<F>;
  done?: Ofun<D>;
}

export interface Dobs<N, F = any, D = any> {
  readonly closed?: boolean;
  next?: Ofun<N>;
  fail?: Ofun<F>;
  done: Ofun<D>;
}

export type Target<N, F = any, D = any> =
  | Nobs<N, F, D>
  | Fobs<N, F, D>
  | Dobs<N, F, D>;

export interface Unsubscriber {
  unsubscribe(): void;
}

export type Closer = Unsubscriber | Cfun | void;

export interface Subscription extends Unsubscriber {
  readonly closed?: boolean;
  add(c?: Closer): Subscription;
}

export interface RefCountSubscription extends Subscription {
  attempted?: boolean;
  count: number;
}

export interface Subscriber<N, F = any, D = any>
  extends Observer<N, F, D>,
    Subscription {}

export interface Source<N, F = any, D = any> {
  src?: Source<any, F, D>;
  oper?: Operator<any, N, F, D>;
  subscribe(_?: Target<N, F, D>): Subscription;
  lift<R>(o?: Operator<N, R, F, D>): Source<R, F, D>;
}

export interface Subject<N, F = any, D = any>
  extends Source<N, F, D>,
    Observer<N, F, D> {
  readonly stopped?: boolean;
}

export interface Operator<N, R, F = any, D = any> {
  call(r: Subscriber<R, F, D>, s: Source<N, F, D>): Subscription;
}

export type InteropSource<N, F = any, D = any> = {
  [Symbol.rxSource]: () => Source<N, F, D>;
};

export type SourceOrPromise<N, F = any, D = any> =
  | Source<N, F, D>
  | Source<never, F, D>
  | PromiseLike<N>
  | InteropSource<N, F, D>;

export type SourceInput<N, F = any, D = any> =
  | SourceOrPromise<N, F, D>
  | ArrayLike<N>
  | Iterable<N>
  | AsyncIterableIterator<N>;

export type Sourced<X> = X extends SourceInput<infer N> ? N : never;

export type SourcedFrom<X> = X extends Array<SourceInput<infer T>> ? T : never;

export type SourcedTuple<X> = X extends Array<SourceInput<any>>
  ? {[K in keyof X]: Sourced<X[K]>}
  : never;

export type Unshift<X extends any[], Y> = ((y: Y, ...x: X) => any) extends (
  ..._: infer U
) => any
  ? U
  : never;

export type ValueFromArray<A> = A extends Array<infer T> ? T : never;

export type FactoryOrValue<T> = T | (() => T);

export interface Stamp<V> {
  value: V;
  time: number;
}

export interface Interval<V> {
  value: V;
  interval: number;
}

export interface Stamper {
  now(): number;
}

export interface Scheduler extends Stamper {
  schedule<S>(
    work: (this: Action<S>, state?: S) => void,
    state?: S,
    delay?: number
  ): Subscription;
}

export interface DArg<N> {
  src: Source<N>;
  r: Subscriber<N>;
}

export interface Params<N, F = any, D = any> {
  ctx: any;
  cb: Function;
  h: Scheduler;
  s?: Subject<N, F, D>;
}

export interface State<N, F = any, D = any> {
  args: any[];
  ps: Params<N, F, D>;
  r: Subscriber<N, F, D>;
}

export interface Step<N, F = any, D = any> {
  s: Subject<N, F, D>;
  n?: N;
  f?: F;
  d?: D;
}

export interface Action<N, F = any, D = any> extends Subscription {
  schedule(_?: State<N, F, D>, delay?: number): Subscription;
}

export interface UnaryFun<N, R> {
  (_: N): R;
}

export interface Lifter<N, R, F, D>
  extends UnaryFun<Source<N, F, D>, Source<R, F, D>> {}

export interface MonoOper<N, F, D> extends Lifter<N, N, F, D> {}

export abstract class Context<N, F = any, D = any> {
  abstract createSource<R = N>(
    _?: (_: Subscriber<R, F, D>) => Subscription
  ): Source<R, F, D>;
  abstract createSubscriber(_?: Target<N, F, D>): Subscriber<N, F, D>;
  abstract toSubscriber(
    t?: Target<N, F, D> | Ofun<N>,
    fail?: Ofun<F>,
    done?: Ofun<D>
  ): Subscriber<N, F, D>;
  abstract createSubject<R = N>(
    o?: Observer<any, F, D>,
    s?: Source<any, F, D>
  ): Subject<R, F, D>;
  abstract createAsync<R = N>(
    o?: Observer<any, F, D>,
    s?: Source<any, F, D>
  ): Subject<R, F, D>;
}
