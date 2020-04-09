import {Observable} from './Observable';
import {Subscription} from './Subscription';

export interface UnaryFunction<T, R> {
  (source: T): R;
}

export interface OperatorFunction<T, R>
  extends UnaryFunction<Observable<T>, Observable<R>> {}

export type FactoryOrValue<T> = T | (() => T);

export interface MonoTypeOperatorFunction<T> extends OperatorFunction<T, T> {}

export interface Timestamp<T> {
  value: T;
  timestamp: number;
}

export interface TimeInterval<T> {
  value: T;
  interval: number;
}

export interface Unsubscribable {
  unsubscribe(): void;
}

export type TeardownLogic = Unsubscribable | Function | void;

export interface SubscriptionLike extends Unsubscribable {
  unsubscribe(): void;
  readonly closed: boolean;
}

export type SubscribableOrPromise<T> =
  | Subscribable<T>
  | Subscribable<never>
  | PromiseLike<T>
  | InteropObservable<T>;

export interface Subscribable<T> {
  subscribe(observer?: PartialObserver<T>): Unsubscribable;
  subscribe(
    next?: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): Unsubscribable;
}

export type ObservableInput<T> =
  | SubscribableOrPromise<T>
  | ArrayLike<T>
  | Iterable<T>
  | AsyncIterableIterator<T>;

export type InteropObservable<T> = {[Symbol.observable]: () => Subscribable<T>};

export interface NextObserver<T> {
  closed?: boolean;
  next: (value: T) => void;
  error?: (err: any) => void;
  complete?: () => void;
}

export interface ErrorObserver<T> {
  closed?: boolean;
  next?: (value: T) => void;
  error: (err: any) => void;
  complete?: () => void;
}

export interface CompletionObserver<T> {
  closed?: boolean;
  next?: (value: T) => void;
  error?: (err: any) => void;
  complete: () => void;
}

export type PartialObserver<T> =
  | NextObserver<T>
  | ErrorObserver<T>
  | CompletionObserver<T>;

export interface Observer<T> {
  closed?: boolean;
  next: (value: T) => void;
  error: (err: any) => void;
  complete: () => void;
}

export interface SchedulerLike extends TimestampProvider {
  schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay?: number,
    state?: T
  ): Subscription;
}

export interface SchedulerAction<T> extends Subscription {
  schedule(state?: T, delay?: number): Subscription;
}

export interface TimestampProvider {
  now(): number;
}

export type ObservedValueOf<O> = O extends ObservableInput<infer T> ? T : never;

export type ObservedValueUnionFromArray<X> = X extends Array<
  ObservableInput<infer T>
>
  ? T
  : never;

export type ObservedValueTupleFromArray<X> = X extends Array<
  ObservableInput<any>
>
  ? {[K in keyof X]: ObservedValueOf<X[K]>}
  : never;

export type Unshift<X extends any[], Y> = ((
  arg: Y,
  ...rest: X
) => any) extends (...args: infer U) => any
  ? U
  : never;

export type ValueFromArray<A> = A extends Array<infer T> ? T : never;
