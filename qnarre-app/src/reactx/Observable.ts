import * as qt from './types';
import * as qu from './util';

//import {Subscription} from './sub';
//import {iif} from './observable/iif';
//import {throwError} from './observable/throwError';

export class Observable<T> implements qt.Subscribable<T> {
  public _isScalar = false;
  source: Observable<any> | undefined;
  operator: qt.Operator<any, T> | undefined;

  constructor(
    subscribe?: (
      this: Observable<T>,
      subscriber: qt.Subscriber<T>
    ) => qt.Teardown
  ) {
    if (subscribe) {
      this._subscribe = subscribe;
    }
  }

  static create: Function = <T>(
    subscribe?: (subscriber: qt.Subscriber<T>) => qt.Teardown
  ) => {
    return new Observable<T>(subscribe);
  };

  lift<R>(operator?: qt.Operator<T, R>): Observable<R> {
    const observable = new Observable<R>();
    observable.source = this;
    observable.operator = operator;
    return observable;
  }

  subscribe(observer?: qt.PartialObserver<T>): Subscription;
  subscribe(
    next?: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription;
  subscribe(
    observerOrNext?: qt.PartialObserver<T> | ((value: T) => void) | null,
    error?: ((error: any) => void) | null,
    complete?: (() => void) | null
  ): Subscription {
    const {operator} = this;
    const sink = qu.toqt.Subscriber(observerOrNext, error, complete);
    if (operator) {
      sink.add(operator.call(sink, this.source));
    } else {
      sink.add(this.source ? this._subscribe(sink) : this._trySubscribe(sink));
    }
    return sink;
  }

  _trySubscribe(sink: qt.Subscriber<T>): qt.Teardown {
    try {
      return this._subscribe(sink);
    } catch (err) {
      if (qu.canReportError(sink)) {
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

  _subscribe(subscriber: qt.Subscriber<any>): qt.Teardown {
    const {source} = this;
    return source && source.subscribe(subscriber);
  }

  // static if: typeof iif;
  // static throw: typeof throwError;

  [Symbol.observable]() {
    return this;
  }

  pipe(): Observable<T>;
  pipe<A>(op1: qt.OperatorFunction<T, A>): Observable<A>;
  pipe<A, B>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>
  ): Observable<B>;
  pipe<A, B, C>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>
  ): Observable<C>;
  pipe<A, B, C, D>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>
  ): Observable<D>;
  pipe<A, B, C, D, E>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>
  ): Observable<E>;
  pipe<A, B, C, D, E, F>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>
  ): Observable<F>;
  pipe<A, B, C, D, E, F, G>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>,
    op7: qt.OperatorFunction<F, G>
  ): Observable<G>;
  pipe<A, B, C, D, E, F, G, H>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>,
    op7: qt.OperatorFunction<F, G>,
    op8: qt.OperatorFunction<G, H>
  ): Observable<H>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>,
    op7: qt.OperatorFunction<F, G>,
    op8: qt.OperatorFunction<G, H>,
    op9: qt.OperatorFunction<H, I>
  ): Observable<I>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>,
    op7: qt.OperatorFunction<F, G>,
    op8: qt.OperatorFunction<G, H>,
    op9: qt.OperatorFunction<H, I>,
    ...ops: qt.OperatorFunction<any, any>[]
  ): Observable<unknown>;
  pipe(...ops: qt.OperatorFunction<any, any>[]): Observable<any> {
    if (ops.length === 0) return this as any;
    return qu.pipeFromArray(ops)(this);
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

export function asyncIteratorFrom<T>(source: Observable<T>) {
  return coroutine(source);
}

async function* coroutine<T>(source: Observable<T>) {
  const deferreds: qu.Deferred<IteratorResult<T>>[] = [];
  const values: T[] = [];
  let hasError = false;
  let error: any = null;
  let completed = false;

  const subs = source.subscribe({
    next: value => {
      if (deferreds.length > 0) {
        deferreds.shift()!.resolve({value, done: false});
      } else {
        values.push(value);
      }
    },
    error: err => {
      hasError = true;
      error = err;
      while (deferreds.length > 0) {
        deferreds.shift()!.reject(err);
      }
    },
    complete: () => {
      completed = true;
      while (deferreds.length > 0) {
        deferreds.shift()!.resolve({value: undefined, done: true});
      }
    }
  });

  try {
    while (true) {
      if (values.length > 0) {
        yield values.shift();
      } else if (completed) {
        return;
      } else if (hasError) {
        throw error;
      } else {
        const d = new qu.Deferred<IteratorResult<T>>();
        deferreds.push(d);
        const result = await d.promise;
        if (result.done) {
          return;
        } else {
          yield result.value;
        }
      }
    }
  } catch (err) {
    throw err;
  } finally {
    subs.unsubscribe();
  }
}
