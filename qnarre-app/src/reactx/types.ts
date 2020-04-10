export const rxSubscriber = Symbol('rxSubscriber');

declare global {
  interface SymbolConstructor {
    readonly observable: symbol;
    readonly rxSubscriber: symbol;
  }
}

export interface Observer<T> {
  closed?: boolean;
  next: (_: T) => void;
  error: (_: any) => void;
  complete: () => void;
}

export interface NextObserver<T> {
  closed?: boolean;
  next: (_: T) => void;
  error?: (_: any) => void;
  complete?: () => void;
}

export interface ErrorObserver<T> {
  closed?: boolean;
  next?: (_: T) => void;
  error: (_: any) => void;
  complete?: () => void;
}

export interface CompletionObserver<T> {
  closed?: boolean;
  next?: (_: T) => void;
  error?: (_T: any) => void;
  complete: () => void;
}

export type PartialObserver<T> =
  | NextObserver<T>
  | ErrorObserver<T>
  | CompletionObserver<T>;

export interface Subscribable<T> {
  subscribe(_?: PartialObserver<T>): Unsubscribable;
  subscribe(
    next?: (_: T) => void,
    error?: (_: any) => void,
    complete?: () => void
  ): Unsubscribable;
}

export type InteropObservable<T> = {[Symbol.observable]: () => Subscribable<T>};

export type SubscribableOrPromise<T> =
  | Subscribable<T>
  | Subscribable<never>
  | PromiseLike<T>
  | InteropObservable<T>;

export type ObservableInput<T> =
  | SubscribableOrPromise<T>
  | ArrayLike<T>
  | Iterable<T>
  | AsyncIterableIterator<T>;

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

export interface Unsubscribable {
  unsubscribe(): void;
}

export interface SubscriptionLike extends Unsubscribable {
  unsubscribe(): void;
  readonly closed: boolean;
}

export type TeardownLogic = Unsubscribable | Function | void;

export type FactoryOrValue<T> = T | (() => T);

export interface Timestamp<T> {
  value: T;
  timestamp: number;
}

export interface TimeInterval<T> {
  value: T;
  interval: number;
}

export interface TimestampProvider {
  now(): number;
}

export interface SchedulerLike extends TimestampProvider {
  schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay?: number,
    state?: T
  ): SubscriptionLike;
}

export interface SchedulerAction<T> extends SubscriptionLike {
  schedule(state?: T, delay?: number): SubscriptionLike;
}

export interface Operator<_T, R> {
  call(s: Subscriber<R>, _: any): TeardownLogic;
}

export interface UnaryFunction<T, R> {
  (_: T): R;
}

export interface OperatorFunction<T, R>
  extends UnaryFunction<Observable<T>, Observable<R>> {}

export interface MonoTypeOperatorFunction<T> extends OperatorFunction<T, T> {}
