import {Observable} from './Observable';
import {SchedulerLike} from './types';
import {Subscription} from './Subscription';
import {iterator as Symbol_iterator} from './symbol';
import {observable as Symbol_observable} from './symbol';
import {InteropObservable, Subscribable} from './types';
import {isInteropObservable} from './util';
import {isPromise} from './util';
import {isArrayLike} from './util';
import {isIterable} from './util';
import {ObservableInput} from './types';

export function scheduleArray<T>(
  input: ArrayLike<T>,
  scheduler: SchedulerLike
) {
  return new Observable<T>(subscriber => {
    const sub = new Subscription();
    let i = 0;
    sub.add(
      scheduler.schedule(function () {
        if (i === input.length) {
          subscriber.complete();
          return;
        }
        subscriber.next(input[i++]);
        if (!subscriber.closed) {
          sub.add(this.schedule());
        }
      })
    );
    return sub;
  });
}

export function scheduleAsyncIterable<T>(
  input: AsyncIterable<T>,
  scheduler: SchedulerLike
) {
  if (!input) {
    throw new Error('Iterable cannot be null');
  }
  return new Observable<T>(subscriber => {
    const sub = new Subscription();
    sub.add(
      scheduler.schedule(() => {
        const iterator = input[Symbol.asyncIterator]();
        sub.add(
          scheduler.schedule(function () {
            iterator.next().then(result => {
              if (result.done) {
                subscriber.complete();
              } else {
                subscriber.next(result.value);
                this.schedule();
              }
            });
          })
        );
      })
    );
    return sub;
  });
}

export function scheduleIterable<T>(
  input: Iterable<T>,
  scheduler: SchedulerLike
) {
  if (!input) {
    throw new Error('Iterable cannot be null');
  }
  return new Observable<T>(subscriber => {
    const sub = new Subscription();
    let iterator: Iterator<T>;
    sub.add(() => {
      // Finalize generators
      if (iterator && typeof iterator.return === 'function') {
        iterator.return();
      }
    });
    sub.add(
      scheduler.schedule(() => {
        iterator = (input as any)[Symbol_iterator]();
        sub.add(
          scheduler.schedule(function () {
            if (subscriber.closed) {
              return;
            }
            let value: T;
            let done: boolean | undefined;
            try {
              const result = iterator.next();
              value = result.value;
              done = result.done;
            } catch (err) {
              subscriber.error(err);
              return;
            }
            if (done) {
              subscriber.complete();
            } else {
              subscriber.next(value);
              this.schedule();
            }
          })
        );
      })
    );
    return sub;
  });
}

export function scheduleObservable<T>(
  input: InteropObservable<T>,
  scheduler: SchedulerLike
) {
  return new Observable<T>(subscriber => {
    const sub = new Subscription();
    sub.add(
      scheduler.schedule(() => {
        const observable: Subscribable<T> = (input as any)[Symbol_observable]();
        sub.add(
          observable.subscribe({
            next(value) {
              sub.add(scheduler.schedule(() => subscriber.next(value)));
            },
            error(err) {
              sub.add(scheduler.schedule(() => subscriber.error(err)));
            },
            complete() {
              sub.add(scheduler.schedule(() => subscriber.complete()));
            }
          })
        );
      })
    );
    return sub;
  });
}

export function schedulePromise<T>(
  input: PromiseLike<T>,
  scheduler: SchedulerLike
) {
  return new Observable<T>(subscriber => {
    const sub = new Subscription();
    sub.add(
      scheduler.schedule(() =>
        input.then(
          value => {
            sub.add(
              scheduler.schedule(() => {
                subscriber.next(value);
                sub.add(scheduler.schedule(() => subscriber.complete()));
              })
            );
          },
          err => {
            sub.add(scheduler.schedule(() => subscriber.error(err)));
          }
        )
      )
    );
    return sub;
  });
}

export function scheduled<T>(
  input: ObservableInput<T>,
  scheduler: SchedulerLike
): Observable<T> {
  if (input != null) {
    if (isInteropObservable(input)) {
      return scheduleObservable(input, scheduler);
    } else if (isPromise(input)) {
      return schedulePromise(input, scheduler);
    } else if (isArrayLike(input)) {
      return scheduleArray(input, scheduler);
    } else if (isIterable(input) || typeof input === 'string') {
      return scheduleIterable(input, scheduler);
    } else if (
      Symbol &&
      Symbol.asyncIterator &&
      typeof (input as any)[Symbol.asyncIterator] === 'function'
    ) {
      return scheduleAsyncIterable(input as any, scheduler);
    }
  }
  throw new TypeError(
    ((input !== null && typeof input) || input) + ' is not observable'
  );
}
