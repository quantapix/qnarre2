import {Subscriber} from './Subscriber';
import {Subscription} from './Subscription';
import {
  Teardown,
  OperatorFunction,
  PartialObserver,
  Subscribable
} from './types';
import {canReportError} from './util';
import {toSubscriber} from './util';
//import {iif} from './observable/iif';
//import {throwError} from './observable/throwError';
import {pipeFromArray} from './util';
import {asyncIteratorFrom} from './asyncIteratorFrom';

export class Observable<T> implements Subscribable<T> {
  public _isScalar = false;
  source: Observable<any> | undefined;
  operator: Operator<any, T> | undefined;

  constructor(
    subscribe?: (this: Observable<T>, subscriber: Subscriber<T>) => Teardown
  ) {
    if (subscribe) {
      this._subscribe = subscribe;
    }
  }

  static create: Function = <T>(
    subscribe?: (subscriber: Subscriber<T>) => Teardown
  ) => {
    return new Observable<T>(subscribe);
  };

  lift<R>(operator?: Operator<T, R>): Observable<R> {
    const observable = new Observable<R>();
    observable.source = this;
    observable.operator = operator;
    return observable;
  }

  subscribe(observer?: PartialObserver<T>): Subscription;
  subscribe(
    next?: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription;
  subscribe(
    observerOrNext?: PartialObserver<T> | ((value: T) => void) | null,
    error?: ((error: any) => void) | null,
    complete?: (() => void) | null
  ): Subscription {
    const {operator} = this;
    const sink = toSubscriber(observerOrNext, error, complete);
    if (operator) {
      sink.add(operator.call(sink, this.source));
    } else {
      sink.add(this.source ? this._subscribe(sink) : this._trySubscribe(sink));
    }
    return sink;
  }

  _trySubscribe(sink: Subscriber<T>): Teardown {
    try {
      return this._subscribe(sink);
    } catch (err) {
      if (canReportError(sink)) {
        sink.error(err);
      } else {
        console.warn(err);
      }
    }
  }
  forEach(
    next: (value: T) => void,
    ctor?: PromiseConstructorLike
  ): Promise<void> {
    ctor = getPromiseCtor(ctor);
    return new ctor<void>((resolve, reject) => {
      let subscription: Subscription;
      subscription = this.subscribe(
        value => {
          try {
            next(value);
          } catch (err) {
            reject(err);
            if (subscription) {
              subscription.unsubscribe();
            }
          }
        },
        reject,
        resolve
      );
    }) as Promise<void>;
  }

  _subscribe(subscriber: Subscriber<any>): Teardown {
    const {source} = this;
    return source && source.subscribe(subscriber);
  }

  // static if: typeof iif;
  // static throw: typeof throwError;

  [Symbol.observable]() {
    return this;
  }

  pipe(): Observable<T>;
  pipe<A>(op1: OperatorFunction<T, A>): Observable<A>;
  pipe<A, B>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>
  ): Observable<B>;
  pipe<A, B, C>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>
  ): Observable<C>;
  pipe<A, B, C, D>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>
  ): Observable<D>;
  pipe<A, B, C, D, E>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>
  ): Observable<E>;
  pipe<A, B, C, D, E, F>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>
  ): Observable<F>;
  pipe<A, B, C, D, E, F, G>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>
  ): Observable<G>;
  pipe<A, B, C, D, E, F, G, H>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>
  ): Observable<H>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>
  ): Observable<I>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>,
    ...ops: OperatorFunction<any, any>[]
  ): Observable<unknown>;
  pipe(...ops: OperatorFunction<any, any>[]): Observable<any> {
    if (ops.length === 0) return this as any;
    return pipeFromArray(ops)(this);
  }

  toPromise<T>(this: Observable<T>): Promise<T | undefined>;
  toPromise<T>(
    this: Observable<T>,
    PromiseCtor: typeof Promise
  ): Promise<T | undefined>;
  toPromise<T>(
    this: Observable<T>,
    PromiseCtor: PromiseConstructorLike
  ): Promise<T | undefined>;
  toPromise(ctor?: PromiseConstructorLike): Promise<T | undefined> {
    ctor = getPromiseCtor(ctor);
    return new ctor((r, j) => {
      let value: T | undefined;
      this.subscribe(
        (v: T) => (value = v),
        (e: any) => j(e),
        () => r(value)
      );
    }) as Promise<T | undefined>;
  }
}

function getPromiseCtor(ctor: PromiseConstructorLike | undefined) {
  if (!ctor) ctor = Promise;
  if (!ctor) throw new Error('no Promise impl found');
  return ctor;
}

export interface Observable<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}

(function () {
  if (Symbol && Symbol.asyncIterator) {
    Observable.prototype[Symbol.asyncIterator] = function () {
      return asyncIteratorFrom(this);
    };
  }
})();
