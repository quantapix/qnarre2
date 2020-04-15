export const rxSubscriber = Symbol('rxSubscriber');

declare global {
  interface SymbolConstructor {
    readonly observable: symbol;
    readonly rxSubscriber: symbol;
  }
}

export type Cfun = () => void;
export type Ofun<T> = (_?: T) => void;

export interface Observer<N, F, D> {
  readonly closed?: boolean;
  next: Ofun<N>;
  fail: Ofun<F>;
  done: Ofun<D>;
}

export interface Nobs<N, F, D> {
  readonly closed?: boolean;
  next: Ofun<N>;
  fail?: Ofun<F>;
  done?: Ofun<D>;
}

export interface Fobs<N, F, D> {
  readonly closed?: boolean;
  next?: Ofun<N>;
  fail: Ofun<F>;
  done?: Ofun<D>;
}

export interface Dobs<N, F, D> {
  readonly closed?: boolean;
  next?: Ofun<N>;
  fail?: Ofun<F>;
  done: Ofun<D>;
}

export type Target<N, F, D> = Nobs<N, F, D> | Fobs<N, F, D> | Dobs<N, F, D>;

export interface Unsubscriber {
  unsubscribe(): void;
}

export type Closer = Unsubscriber | Cfun | void;

export interface Subscription extends Unsubscriber {
  readonly closed?: boolean;
}

export interface RefCountSubscription extends Subscription {
  attempted?: boolean;
  count: number;
}

export interface Subscriber<N, F, D> extends Observer<N, F, D>, Subscription {}

export interface Source<N, F, D> {
  subscribe(_?: Target<N, F, D>): Subscription;
  lift<R>(o?: Operator<N, R, F, D>): Source<R, F, D>;
}

export interface Subject<N, F, D>
  extends Source<N, F, D>,
    Observer<N, F, D>,
    Subscription {
  readonly stopped?: boolean;
}

export interface Operator<N, R, F, D> {
  call(r: Subscriber<R, F, D>, s: Source<N, F, D>): Subscription;
}

export type InteropObservable<N, F, D> = {
  [Symbol.observable]: () => Source<N, F, D>;
};

export type SourceOrPromise<N, F, D> =
  | Source<N, F, D>
  | Source<never, F, D>
  | PromiseLike<N>
  | InteropObservable<N, F, D>;

export type ObservableInput<N, F, D> =
  | SourceOrPromise<N, F, D>
  | ArrayLike<N>
  | Iterable<N>
  | AsyncIterableIterator<N>;

export type ObservedValueOf<O> = O extends ObservableInput<infer T> ? T : never;

export type ObservedUnionFrom<X> = X extends Array<ObservableInput<infer T>>
  ? T
  : never;

export type ObservedTupleFrom<X> = X extends Array<ObservableInput<any>>
  ? {[K in keyof X]: ObservedValueOf<X[K]>}
  : never;

export type Unshift<X extends any[], Y> = ((y: Y, ...x: X) => any) extends (
  ..._: infer U
) => any
  ? U
  : never;

export type ValueFromArray<A> = A extends Array<infer T> ? T : never;

export type FactoryOrValue<T> = T | (() => T);

export interface Timestamp<T> {
  value: T;
  timestamp: number;
}

export interface TimeInterval<T> {
  value: T;
  interval: number;
}

export interface Stamper {
  now(): number;
}

export interface SchedulerLike extends Stamper {
  schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay?: number,
    state?: T
  ): Subscription;
}

export interface SchedulerAction<T> extends Subscription {
  schedule(state?: T, delay?: number): Subscription;
}

export interface UnaryFun<N, R> {
  (_: N): R;
}

export interface Lifter<N, R, F, D>
  extends UnaryFun<Source<N, F, D>, Source<R, F, D>> {}

export interface MonoOper<N, F, D> extends Lifter<N, N, F, D> {}