declare global {
  interface SymbolConstructor {
    readonly rxSource: symbol;
    readonly rxSubscriber: symbol;
  }
}

export const rxSource = Symbol('rxSource');
export const rxSubscriber = Symbol('rxSubscriber');

export type Cfun = () => void;
export type Ofun<T> = (_?: T) => void;

export interface Closed {
  readonly closed?: boolean;
}

export interface Observer<N, F, D> extends Closed {
  next: Ofun<N>;
  fail: Ofun<F>;
  done: Ofun<D>;
}

export interface Nobs<N, F, D> extends Closed {
  next: Ofun<N>;
  fail?: Ofun<F>;
  done?: Ofun<D>;
}

export interface Fobs<N, F, D> extends Closed {
  next?: Ofun<N>;
  fail: Ofun<F>;
  done?: Ofun<D>;
}

export interface Dobs<N, F, D> extends Closed {
  next?: Ofun<N>;
  fail?: Ofun<F>;
  done: Ofun<D>;
}

export type Target<N, F, D> = Nobs<N, F, D> | Fobs<N, F, D> | Dobs<N, F, D>;

export interface Unsubscriber {
  unsubscribe(): void;
}

export type Closer = Unsubscriber | Cfun | void;

export interface Subscription extends Closed, Unsubscriber {
  add(c?: Closer): Subscription;
}

export interface RefCounted extends Subscription {
  unsubscribing?: boolean;
  count: number;
}

export interface Subscriber<N, F, D> extends Observer<N, F, D>, Subscription {}

export interface Source<N, F, D> {
  orig?: Source<any, F, D>;
  oper?: Operator<any, N, F, D>;
  subscribe(_?: Target<N, F, D>): Subscription;
  lift<R>(_?: Operator<N, R, F, D>): Source<R, F, D>;
}

export interface Subject<N, F, D> extends Source<N, F, D>, Observer<N, F, D> {
  readonly stopped?: boolean;
}

export interface Mapper<N, R> {
  (_: N): R;
}

export interface Lifter<N, R, F, D>
  extends Mapper<Source<N, F, D>, Source<R, F, D>> {}

export interface Shifter<N, F, D> extends Lifter<N, N, F, D> {}

export interface Operator<N, R, F, D> {
  call(r: Subscriber<R, F, D>, s: Source<N, F, D>): Subscription;
}

export type Interop<N, F, D> = {
  [Symbol.rxSource]: () => Source<N, F, D>;
};

export type SourceOrPromise<N, F, D> =
  | Source<N, F, D>
  | Source<never, F, D>
  | PromiseLike<N>
  | Interop<N, F, D>;

export type Input<N, F, D> =
  | Iterable<N>
  | ArrayLike<N>
  | SourceOrPromise<N, F, D>
  | AsyncIterableIterator<N>;

export type Sourced<X> = X extends Input<infer N, any, any> ? N : never;

export type ValueOf<X> = X extends Array<infer T> ? T : never;

export type SourcedOf<X> = X extends Array<Input<infer T, any, any>>
  ? T
  : never;

export type SourcedTuple<X> = X extends Array<Input<any, any, any>>
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

export interface DArg<N> {
  src: Source<N>;
  r: Subscriber<N>;
}

export interface Step<N, F, D> {
  s: Subject<N, F, D>;
  n?: N;
  f?: F;
  d?: D;
}

export interface Action<N, F, D> extends Subscription {
  schedule(_?: Step<N, F, D>, delay?: number): Subscription;
}

export interface Scheduler<F, D> extends Stamper {
  schedule<N>(
    work: (this: Action<N, F, D>, _?: Step<N, F, D>) => void,
    step?: Step<N, F, D>,
    delay?: number
  ): Subscription;
}

export interface State<N, F, D> {
  h: Scheduler<F, D>;
  s?: Subject<N, F, D>;
  ctx: any;
  cb: Function;
  args: any[];
  r: Subscriber<N, F, D>;
}

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
