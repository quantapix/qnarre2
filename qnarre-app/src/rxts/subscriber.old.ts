
import * as qt from './types';

import {Inner, Outer, Subscription, Subscriber} from './subject';

export function audit<N, F, D>(
  durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>
): qt.MonoOper<N, F, D> {
  return function auditLifter(source: qt.Source<N, F, D>) {
    return source.lift(new AuditOperator(durationSelector));
  };
}

class AuditOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new AuditSubscriber<N, N, F, D>(subscriber, this.durationSelector)
    );
  }
}

export function auditTime<N, F, D>(
  duration: number,
  scheduler: qt.SchedulerLike = async
): qt.MonoOper<N, F, D> {
  return audit(() => timer(duration, scheduler));
}

export function buffer<N, F, D>(
  closingNotifier: qt.Source<any, F, D>
): qt.Lifter<N, N[], F, D> {
  return function bufferLifter(source: qt.Source<N, F, D>) {
    return source.lift(new BufferOperator<N, F, D>(closingNotifier));
  };
}

class BufferOperator<N, F, D> implements qt.Operator<N, N[], F, D> {
  constructor(private closingNotifier: qt.Source<any, F, D>) {}

  call(subscriber: Subscriber<N[], F, D>, source: any): any {
    return source.subscribe(
      new BufferSubscriber(subscriber, this.closingNotifier)
    );
  }
}


export function bufferCount<N, F, D>(
  bufferSize: number,
  startBufferEvery: number | null = null
): qt.Lifter<N, N[], F, D> {
  return function bufferCountLifter(source: qt.Source<N, F, D>) {
    return source.lift(
      new BufferCountOperator<N, F, D>(bufferSize, startBufferEvery)
    );
  };
}

class BufferCountOperator<N, F, D> implements qt.Operator<N, N[], F, D> {
  private subscriberClass: any;

  constructor(
    private bufferSize: number,
    private startBufferEvery: number | null
  ) {
    if (!startBufferEvery || bufferSize === startBufferEvery) {
      this.subscriberClass = BufferCountSubscriber;
    } else {
      this.subscriberClass = BufferSkipCountSubscriber;
    }
  }

  call(subscriber: Subscriber<N[], F, D>, source: any): qt.Closer {
    return source.subscribe(
      new this.subscriberClass(
        subscriber,
        this.bufferSize,
        this.startBufferEvery
      )
    );
  }
}

export function bufferTime<N, F, D>(
  bufferTimeSpan: number,
  scheduler?: qt.SchedulerLike
): qt.Lifter<N, N[], F, D>;
export function bufferTime<N, F, D>(
  bufferTimeSpan: number,
  bufferCreationInterval: number | null | undefined,
  scheduler?: qt.SchedulerLike
): qt.Lifter<N, N[], F, D>;
export function bufferTime<N, F, D>(
  bufferTimeSpan: number,
  bufferCreationInterval: number | null | undefined,
  maxBufferSize: number,
  scheduler?: qt.SchedulerLike
): qt.Lifter<N, N[], F, D>;
export function bufferTime<N, F, D>(
  bufferTimeSpan: number
): qt.Lifter<N, N[], F, D> {
  let length: number = arguments.length;
  let scheduler: qt.SchedulerLike = async;
  if (isScheduler(arguments[arguments.length - 1])) {
    scheduler = arguments[arguments.length - 1];
    length--;
  }
  let bufferCreationInterval: number | null = null;
  if (length >= 2) bufferCreationInterval = arguments[1];
  let maxBufferSize: number = Number.POSITIVE_INFINITY;
  if (length >= 3) maxBufferSize = arguments[2];
  return function bufferTimeLifter(source: qt.Source<N, F, D>) {
    return source.lift(
      new BufferTimeOperator<N, F, D>(
        bufferTimeSpan,
        bufferCreationInterval,
        maxBufferSize,
        scheduler
      )
    );
  };
}

class BufferTimeOperator<N, F, D> implements qt.Operator<T, T[]> {
  constructor(
    private bufferTimeSpan: number,
    private bufferCreationInterval: number | null,
    private maxBufferSize: number,
    private scheduler: qt.SchedulerLike
  ) {}

  call(subscriber: Subscriber<N[], F, D>, source: any): any {
    return source.subscribe(
      new BufferTimeSubscriber(
        subscriber,
        this.bufferTimeSpan,
        this.bufferCreationInterval,
        this.maxBufferSize,
        this.scheduler
      )
    );
  }
}



export function bufferToggle<N, M, F, D>(
  openings: qt.SourceOrPromise<M, F, D>,
  closingSelector: (value: M) => qt.SourceOrPromise<any, F, D>
): qt.Lifter<N, N[], F, D> {
  return function bufferToggleLifter(source: qt.Source<N, F, D>) {
    return source.lift(
      new BufferToggleOperator<N, M>(openings, closingSelector)
    );
  };
}

class BufferToggleOperator<N, M, F, D> implements qt.Operator<N, N[]> {
  constructor(
    private openings: qt.SourceOrPromise<O>,
    private closingSelector: (value: O) => qt.SourceOrPromise<any, F, D>
  ) {}

  call(subscriber: Subscriber<N[], F, D>, source: any): any {
    return source.subscribe(
      new BufferToggleSubscriber(
        subscriber,
        this.openings,
        this.closingSelector
      )
    );
  }
}


export function bufferWhen<N, F, D>(
  closingSelector: () => qt.Source<any, F, D>
): qt.Lifter<N, N[], F, D> {
  return function (source: qt.Source<N, F, D>) {
    return source.lift(new BufferWhenOperator(closingSelector));
  };
}

class BufferWhenOperator<N, F, D> implements qt.Operator<T, T[]> {
  constructor(private closingSelector: () => qt.Source<any, F, D>) {}
  call(subscriber: Subscriber<N[], F, D>, source: any): any {
    return source.subscribe(
      new BufferWhenSubscriber(subscriber, this.closingSelector)
    );
  }
}

export function catchError<T, O extends ObservableInput<any>>(
  selector: (err: any, caught: qt.Source<N, F, D>) => O
): Lifter<T, T | ObservedValueOf<O>>;
export function catchError<T, O extends ObservableInput<any>>(
  selector: (err: any, caught: qt.Source<N, F, D>) => O
): Lifter<T, T | ObservedValueOf<O>> {
  return function catchErrorLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<T | ObservedValueOf<O>> {
    const operator = new CatchOperator(selector);
    const caught = source.lift(operator);
    return (operator.caught = caught as qt.Source<N, F, D>);
  };
}

class CatchOperator<T, R> implements qt.Operator<T, T | R> {
  caught: qt.Source<N, F, D> | undefined;

  constructor(
    private selector: (
      err: any,
      caught: qt.Source<N, F, D>
    ) => ObservableInput<T | R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new CatchSubscriber(subscriber, this.selector, this.caught!)
    );
  }
}


export function combineAll<N, F, D>(): Lifter<ObservableInput<N, F, D>, T[]>;
export function combineAll<N, F, D>(): Lifter<any, T[]>;
export function combineAll<T, R>(
  project: (...values: T[]) => R
): Lifter<ObservableInput<N, F, D>, R>;
export function combineAll<R>(
  project: (...values: Array<any>) => R
): Lifter<any, R>;
export function combineAll<T, R>(
  project?: (...values: Array<any>) => R
): Lifter<T, R> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new CombineLatestOperator(project));
}

export function combineLatest<T, R>(
  ...observables: Array<
    | ObservableInput<any>
    | Array<ObservableInput<any>>
    | ((...values: Array<any>) => R)
  >
): Lifter<T, R> {
  let project: ((...values: Array<any>) => R) | undefined = undefined;
  if (typeof observables[observables.length - 1] === 'function') {
    project = <(...values: Array<any>) => R>observables.pop();
  }
  if (observables.length === 1 && isArray(observables[0])) {
    observables = (<any>observables[0]).slice();
  }

  return (source: qt.Source<N, F, D>) =>
    source.lift.call(
      from([source, ...observables]),
      new CombineLatestOperator(project)
    ) as qt.Source<R>;
}

export function combineLatestWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): Lifter<T, Unshift<ObservedTupleFrom<A>, T>> {
  return combineLatest(...otherSources);
}

export function concatAll<N, F, D>(): Lifter<ObservableInput<N, F, D>, T>;
export function concatAll<R>(): Lifter<any, R>;
export function concatAll<N, F, D>(): Lifter<ObservableInput<N, F, D>, T> {
  return mergeAll<N, F, D>(1);
}

export function concatMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O
): Lifter<T, ObservedValueOf<O>>;
export function concatMap<T, R, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?: (
    outerN: T,
    innerValue: ObservedValueOf<O>,
    outerX: number,
    innerIndex: number
  ) => R
): Lifter<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return mergeMap(project, resultSelector, 1);
  }
  return mergeMap(project, 1);
}
export function concatMapTo<T, O extends ObservableInput<any>>(
  observable: O
): Lifter<T, ObservedValueOf<O>>;
export function concatMapTo<T, R, O extends ObservableInput<any>>(
  innerObservable: O,
  resultSelector?: (
    outerN: T,
    innerValue: ObservedValueOf<O>,
    outerX: number,
    innerIndex: number
  ) => R
): Lifter<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return concatMap(() => innerObservable, resultSelector);
  }
  return concatMap(() => innerObservable);
}

export function concatWith<N, F, D>(): Lifter<T, T>;
export function concatWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): Lifter<T, ObservedUnionFrom<A> | T>;
export function concatWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): Lifter<T, ObservedUnionFrom<A> | T> {
  return (source: qt.Source<N, F, D>) =>
    source.lift.call(
      concatStatic(source, ...otherSources),
      undefined
    ) as qt.Source<ObservedUnionFrom<A> | T>;
}

export function count<N, F, D>(
  predicate?: (value: T, index: number, source: qt.Source<N, F, D>) => boolean
): Lifter<T, number> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new CountOperator(predicate, source));
}

class CountOperator<N, F, D> implements qt.Operator<T, number> {
  constructor(
    private predicate:
      | ((value: T, index: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<number>, source: any): any {
    return source.subscribe(
      new CountSubscriber(subscriber, this.predicate, this.source)
    );
  }
}


export function debounce<N, F, D>(
  durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DebounceOperator(durationSelector));
}

class DebounceOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DebounceSubscriber(subscriber, this.durationSelector)
    );
  }
}


export function debounceTime<N, F, D>(
  dueTime: number,
  scheduler: qt.SchedulerLike = async
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DebounceTimeOperator(dueTime, scheduler));
}

class DebounceTimeOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private dueTime: number, private scheduler: qt.SchedulerLike) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DebounceTimeSubscriber(subscriber, this.dueTime, this.scheduler)
    );
  }
}

function dispatchNext(subscriber: DebounceTimeSubscriber<any>) {
  subscriber.debouncedNext();
}

export function defaultIfEmpty<T, R = T>(defaultValue?: R): Lifter<T, T | R>;
export function defaultIfEmpty<T, R>(
  defaultValue: R | null = null
): Lifter<T, T | R> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DefaultIfEmptyOperator(defaultValue)) as qt.Source<T | R>;
}

class DefaultIfEmptyOperator<T, R> implements qt.Operator<T, T | R> {
  constructor(private defaultValue: R) {}

  call(subscriber: Subscriber<T | R>, source: any): any {
    return source.subscribe(
      new DefaultIfEmptySubscriber(subscriber, this.defaultValue)
    );
  }
}


export function delay<N, F, D>(
  delay: number | Date,
  scheduler: qt.SchedulerLike = async
): qt.MonoOper<N, F, D> {
  const absoluteDelay = isDate(delay);
  const delayFor = absoluteDelay
    ? +delay - scheduler.now()
    : Math.abs(<number>delay);
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DelayOperator(delayFor, scheduler));
}

class DelayOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private delay: number, private scheduler: qt.SchedulerLike) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DelaySubscriber(subscriber, this.delay, this.scheduler)
    );
  }
}



export function delayWhen<N, F, D>(
  delayDurationSelector: (value: T, index: number) => qt.Source<any, F, D>,
  subscriptionDelay?: qt.Source<any, F, D>
): qt.MonoOper<N, F, D>;
export function delayWhen<N, F, D>(
  delayDurationSelector: (value: T, index: number) => qt.Source<any, F, D>,
  subscriptionDelay?: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  if (subscriptionDelay) {
    return (source: qt.Source<N, F, D>) =>
      new SubscriptionDelayObservable(source, subscriptionDelay).lift(
        new DelayWhenOperator(delayDurationSelector)
      );
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DelayWhenOperator(delayDurationSelector));
}

class DelayWhenOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private delayDurationSelector: (
      value: T,
      index: number
    ) => qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DelayWhenSubscriber(subscriber, this.delayDurationSelector)
    );
  }
}


class SubscriptionDelayObservable<N, F, D> extends qt.Source<N, F, D> {
  constructor(
    public source: qt.Source<N, F, D>,
    private subscriptionDelay: qt.Source<any, F, D>
  ) {
    super();
  }

  _subscribe(subscriber: Subscriber<N, F, D>) {
    this.subscriptionDelay.subscribe(
      new SubscriptionDelaySubscriber(subscriber, this.source)
    );
  }
}


export function dematerialize<N, F, D>(): Lifter<Notification<N, F, D>, T> {
  return function dematerializeLifter(
    source: qt.Source<Notification<N, F, D>>
  ) {
    return source.lift(new DeMaterializeOperator());
  };
}

class DeMaterializeOperator<T extends Notification<any>, R>
  implements qt.Operator<T, R> {
  call(subscriber: Subscriber<any>, source: any): any {
    return source.subscribe(new DeMaterializeSubscriber(subscriber));
  }
}


export function distinct<T, K>(
  keySelector?: (value: N) => K,
  flushes?: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DistinctOperator(keySelector, flushes));
}

class DistinctOperator<T, K> implements qt.Operator<N, N, F, D> {
  constructor(
    private keySelector?: (value: N) => K,
    private flushes?: qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DistinctSubscriber(subscriber, this.keySelector, this.flushes)
    );
  }
}


export function distinctUntilChanged<N, F, D>(
  compare?: (x: T, y: N) => boolean
): qt.MonoOper<N, F, D>;
export function distinctUntilChanged<T, K>(
  compare?: (x: K, y: K) => boolean,
  keySelector?: (x: N) => K
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DistinctUntilChangedOperator<T, K>(compare, keySelector));
}

class DistinctUntilChangedOperator<T, K> implements qt.Operator<N, N, F, D> {
  constructor(
    private compare?: (x: K, y: K) => boolean,
    private keySelector?: (x: N) => K
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DistinctUntilChangedSubscriber(
        subscriber,
        this.compare,
        this.keySelector
      )
    );
  }
}


export function distinctUntilKeyChanged<N, F, D>(
  key: keyof T
): qt.MonoOper<N, F, D>;
export function distinctUntilKeyChanged<T, K extends keyof T>(
  key: K,
  compare: (x: T[K], y: T[K]) => boolean
): qt.MonoOper<N, F, D>;
export function distinctUntilKeyChanged<T, K extends keyof T>(
  key: K,
  compare?: (x: T[K], y: T[K]) => boolean
): qt.MonoOper<N, F, D> {
  return distinctUntilChanged((x: T, y: N) =>
    compare ? compare(x[key], y[key]) : x[key] === y[key]
  );
}

export function elementAt<N, F, D>(
  index: number,
  defaultValue?: N
): qt.MonoOper<N, F, D> {
  if (index < 0) {
    throw new OutOfRangeError();
  }
  const hasDefaultValue = arguments.length >= 2;
  return (source: qt.Source<N, F, D>) =>
    source.pipe(
      filter((v, i) => i === index),
      take(1),
      hasDefaultValue
        ? defaultIfEmpty(defaultValue)
        : throwIfEmpty(() => new OutOfRangeError())
    );
}

export function endWith<T, A extends any[]>(
  ...args: A
): Lifter<T, T | ValueFromArray<A>>;
export function endWith<N, F, D>(
  ...values: Array<T | qt.SchedulerLike>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    concatStatic(source, of(...values)) as qt.Source<N, F, D>;
}

export function every<N, F, D>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, boolean> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new EveryOperator(predicate, thisArg, source));
}

class EveryOperator<N, F, D> implements qt.Operator<T, boolean> {
  constructor(
    private predicate: (
      value: T,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private thisArg: any,
    private source: qt.Source<N, F, D>
  ) {}

  call(observer: Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new EverySubscriber(observer, this.predicate, this.thisArg, this.source)
    );
  }
}


export function exhaust<N, F, D>(): Lifter<ObservableInput<N, F, D>, T>;
export function exhaust<R>(): Lifter<any, R>;
export function exhaust<N, F, D>(): Lifter<any, T> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SwitchFirstOperator<N, F, D>());
}

class SwitchFirstOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new SwitchFirstSubscriber(subscriber));
  }
}


export function exhaustMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O
): Lifter<T, ObservedValueOf<O>>;
export function exhaustMap<T, R, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?: (
    outerN: T,
    innerValue: ObservedValueOf<O>,
    outerX: number,
    innerIndex: number
  ) => R
): Lifter<T, ObservedValueOf<O> | R> {
  if (resultSelector) {
    // DEPRECATED PATH
    return (source: qt.Source<N, F, D>) =>
      source.pipe(
        exhaustMap((a, i) =>
          from(project(a, i)).pipe(
            map((b: any, ii: any) => resultSelector(a, b, i, ii))
          )
        )
      );
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(new ExhaustMapOperator(project));
}

class ExhaustMapOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => ObservableInput<R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new ExhaustMapSubscriber(subscriber, this.project));
  }
}


export function expand<T, R>(
  project: (value: T, index: number) => ObservableInput<R>,
  concurrent?: number,
  scheduler?: qt.SchedulerLike
): Lifter<T, R>;
export function expand<N, F, D>(
  project: (value: T, index: number) => ObservableInput<N, F, D>,
  concurrent?: number,
  scheduler?: qt.SchedulerLike
): qt.MonoOper<N, F, D>;
export function expand<T, R>(
  project: (value: T, index: number) => ObservableInput<R>,
  concurrent: number = Number.POSITIVE_INFINITY,
  scheduler?: qt.SchedulerLike
): Lifter<T, R> {
  concurrent = (concurrent || 0) < 1 ? Number.POSITIVE_INFINITY : concurrent;

  return (source: qt.Source<N, F, D>) =>
    source.lift(new ExpandOperator(project, concurrent, scheduler));
}

export class ExpandOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => ObservableInput<R>,
    private concurrent: number,
    private scheduler?: qt.SchedulerLike
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new ExpandSubscriber(
        subscriber,
        this.project,
        this.concurrent,
        this.scheduler
      )
    );
  }
}


export function filter<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
  thisArg?: any
): Lifter<T, S>;
export function filter<N, F, D>(
  predicate: BooleanConstructor
): Lifter<T | null | undefined, NonNullable<N, F, D>>;
export function filter<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): qt.MonoOper<N, F, D>;
export function filter<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): qt.MonoOper<N, F, D> {
  return function filterLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    return source.lift(new FilterOperator(predicate, thisArg));
  };
}

class FilterOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private predicate: (value: T, index: number) => boolean,
    private thisArg?: any
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new FilterSubscriber(subscriber, this.predicate, this.thisArg)
    );
  }
}


export function finalize<N, F, D>(callback: () => void): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new FinallyOperator(callback));
}

class FinallyOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private callback: () => void) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new FinallySubscriber(subscriber, this.callback));
  }
}

class FinallySubscriber<N, F, D> extends Subscriber<N, F, D> {
  constructor(tgt: Subscriber<N, F, D>, callback: () => void) {
    super(tgt);
    this.add(new Subscription(callback));
  }
}

export function find<T, S extends T>(
  predicate: (
    value: T,
    index: number,
    source: qt.Source<N, F, D>
  ) => value is S,
  thisArg?: any
): Lifter<T, S | undefined>;
export function find<N, F, D>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, T | undefined>;
export function find<N, F, D>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, T | undefined> {
  if (typeof predicate !== 'function') {
    throw new TypeError('predicate is not a function');
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new FindValueOperator(predicate, source, false, thisArg)
    ) as qt.Source<T | undefined>;
}

export class FindValueOperator<N, F, D>
  implements qt.Operator<T, T | number | undefined> {
  constructor(
    private predicate: (
      value: T,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private source: qt.Source<N, F, D>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {}

  call(observer: Subscriber<N, F, D>, source: any): any {
    return source.subscribe(
      new FindValueSubscriber(
        observer,
        this.predicate,
        this.source,
        this.yieldIndex,
        this.thisArg
      )
    );
  }
}


export function findIndex<N, F, D>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, number> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new FindValueOperator(predicate, source, true, thisArg)
    ) as qt.Source<any, F, D>;
}

export function first<T, D = T>(
  predicate?: null,
  defaultValue?: D
): Lifter<T, T | D>;
export function first<T, S extends T>(
  predicate: (
    value: T,
    index: number,
    source: qt.Source<N, F, D>
  ) => value is S,
  defaultValue?: S
): Lifter<T, S>;
export function first<T, D = T>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  defaultValue?: D
): Lifter<T, T | D>;
export function first<T, D>(
  predicate?:
    | ((value: T, index: number, source: qt.Source<N, F, D>) => boolean)
    | null,
  defaultValue?: D
): Lifter<T, T | D> {
  const hasDefaultValue = arguments.length >= 2;
  return (source: qt.Source<N, F, D>) =>
    source.pipe(
      predicate ? filter((v, i) => predicate(v, i, source)) : identity,
      take(1),
      hasDefaultValue
        ? defaultIfEmpty<T, D>(defaultValue)
        : throwIfEmpty(() => new EmptyError())
    );
}

export function groupBy<T, K>(
  keySelector: (value: N) => K
): Lifter<T, GroupedObservable<K, T>>;
export function groupBy<T, K>(
  keySelector: (value: N) => K,
  elementSelector: void,
  durationSelector: (grouped: GroupedObservable<K, T>) => qt.Source<any, F, D>
): Lifter<T, GroupedObservable<K, T>>;
export function groupBy<T, K, R>(
  keySelector: (value: N) => K,
  elementSelector?: (value: N) => R,
  durationSelector?: (grouped: GroupedObservable<K, R>) => qt.Source<any, F, D>
): Lifter<T, GroupedObservable<K, R>>;
export function groupBy<T, K, R>(
  keySelector: (value: N) => K,
  elementSelector?: (value: N) => R,
  durationSelector?: (grouped: GroupedObservable<K, R>) => qt.Source<any, F, D>,
  subjectSelector?: () => Subject<R>
): Lifter<T, GroupedObservable<K, R>>;
export function groupBy<T, K, R>(
  keySelector: (value: N) => K,
  elementSelector?: ((value: N) => R) | void,
  durationSelector?: (grouped: GroupedObservable<K, R>) => qt.Source<any, F, D>,
  subjectSelector?: () => Subject<R>
): Lifter<T, GroupedObservable<K, R>> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new GroupByOperator(
        keySelector,
        elementSelector,
        durationSelector,
        subjectSelector
      )
    );
}


class GroupByOperator<T, K, R>
  implements qt.Operator<T, GroupedObservable<K, R>> {
  constructor(
    private keySelector: (value: N) => K,
    private elementSelector?: ((value: N) => R) | void,
    private durationSelector?: (
      grouped: GroupedObservable<K, R>
    ) => qt.Source<any, F, D>,
    private subjectSelector?: () => Subject<R>
  ) {}

  call(subscriber: Subscriber<GroupedObservable<K, R>>, source: any): any {
    return source.subscribe(
      new GroupBySubscriber(
        subscriber,
        this.keySelector,
        this.elementSelector,
        this.durationSelector,
        this.subjectSelector
      )
    );
  }
}



export class GroupedObservable<K, T> extends qt.Source<N, F, D> {
  constructor(
    public key: K,
    private groupSubject: Subject<N, F, D>,
    private refCountSubscription?: RefCountSubscription
  ) {
    super();
  }

  _subscribe(subscriber: Subscriber<N, F, D>) {
    const subscription = new Subscription();
    const {refCountSubscription, groupSubject} = this;
    if (refCountSubscription && !refCountSubscription.closed) {
      subscription.add(new InnerRefCountSubscription(refCountSubscription));
    }
    subscription.add(groupSubject.subscribe(subscriber));
    return subscription;
  }
}

class InnerRefCountSubscription extends Subscription {
  constructor(private parent: RefCountSubscription) {
    super();
    parent.count++;
  }

  unsubscribe() {
    const parent = this.parent;
    if (!parent.closed && !this.closed) {
      super.unsubscribe();
      parent.count -= 1;
      if (parent.count === 0 && parent.attemptedToUnsubscribe) {
        parent.unsubscribe();
      }
    }
  }
}

export function ignoreElements(): Lifter<any, never> {
  return function ignoreElementsLifter(source: qt.Source<any, F, D>) {
    return source.lift(new IgnoreElementsOperator());
  };
}

class IgnoreElementsOperator<T, R> implements qt.Operator<T, R> {
  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new IgnoreElementsSubscriber(subscriber));
  }
}


export function isEmpty<N, F, D>(): Lifter<T, boolean> {
  return (source: qt.Source<N, F, D>) => source.lift(new IsEmptyOperator());
}

class IsEmptyOperator implements qt.Operator<any, boolean> {
  call(observer: Subscriber<boolean>, source: any): any {
    return source.subscribe(new IsEmptySubscriber(observer));
  }
}


export function last<T, D = T>(
  predicate?: null,
  defaultValue?: D
): Lifter<T, T | D>;
export function last<T, S extends T>(
  predicate: (
    value: T,
    index: number,
    source: qt.Source<N, F, D>
  ) => value is S,
  defaultValue?: S
): Lifter<T, S>;
export function last<T, D = T>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  defaultValue?: D
): Lifter<T, T | D>;
export function last<T, D>(
  predicate?:
    | ((value: T, index: number, source: qt.Source<N, F, D>) => boolean)
    | null,
  defaultValue?: D
): Lifter<T, T | D> {
  const hasDefaultValue = arguments.length >= 2;
  return (source: qt.Source<N, F, D>) =>
    source.pipe(
      predicate ? filter((v, i) => predicate(v, i, source)) : identity,
      takeLast(1),
      hasDefaultValue
        ? defaultIfEmpty<T, D>(defaultValue)
        : throwIfEmpty(() => new EmptyError())
    );
}

export function map<T, R>(
  project: (value: T, index: number) => R,
  thisArg?: any
): Lifter<T, R> {
  return function mapOperation(source: qt.Source<N, F, D>): qt.Source<R> {
    if (typeof project !== 'function') {
      throw new TypeError(
        'argument is not a function. Are you looking for `mapTo()`?'
      );
    }
    return source.lift(new MapOperator(project, thisArg));
  };
}

export class MapOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => R,
    private thisArg: any
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new MapSubscriber(subscriber, this.project, this.thisArg)
    );
  }
}


export function mapTo<R>(value: R): Lifter<any, R>;
export function mapTo<R>(value: R): Lifter<any, R> {
  return (source: qt.Source<any, F, D>) =>
    source.lift(new MapToOperator(value));
}

class MapToOperator<T, R> implements qt.Operator<T, R> {
  value: R;

  constructor(value: R) {
    this.value = value;
  }

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new MapToSubscriber(subscriber, this.value));
  }
}


export function materialize<N, F, D>(): Lifter<T, Notification<N, F, D>> {
  return function materializeLifter(source: qt.Source<N, F, D>) {
    return source.lift(new MaterializeOperator());
  };
}

class MaterializeOperator<N, F, D>
  implements qt.Operator<T, Notification<N, F, D>> {
  call(subscriber: Subscriber<Notification<N, F, D>>, source: any): any {
    return source.subscribe(new MaterializeSubscriber(subscriber));
  }
}


export function max<N, F, D>(
  comparer?: (x: T, y: N) => number
): qt.MonoOper<N, F, D> {
  const max: (x: T, y: N) => T =
    typeof comparer === 'function'
      ? (x, y) => (comparer(x, y) > 0 ? x : y)
      : (x, y) => (x > y ? x : y);

  return reduce(max);
}

export function mergeAll<N, F, D>(
  concurrent: number = Number.POSITIVE_INFINITY
): Lifter<ObservableInput<N, F, D>, T> {
  return mergeMap(identity, concurrent);
}

export function mergeMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  concurrent?: number
): Lifter<T, ObservedValueOf<O>>;
export function mergeMap<T, R, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?:
    | ((
        outerN: T,
        innerValue: ObservedValueOf<O>,
        outerX: number,
        innerIndex: number
      ) => R)
    | number,
  concurrent: number = Number.POSITIVE_INFINITY
): Lifter<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return (source: qt.Source<N, F, D>) =>
      source.pipe(
        mergeMap(
          (a, i) =>
            from(project(a, i)).pipe(
              map((b: any, ii: number) => resultSelector(a, b, i, ii))
            ),
          concurrent
        )
      );
  } else if (typeof resultSelector === 'number') {
    concurrent = resultSelector;
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(new MergeMapOperator(project, concurrent));
}

export class MergeMapOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => ObservableInput<R>,
    private concurrent: number = Number.POSITIVE_INFINITY
  ) {}

  call(observer: Subscriber<R>, source: any): any {
    return source.subscribe(
      new MergeMapSubscriber(observer, this.project, this.concurrent)
    );
  }
}


export function mergeMapTo<O extends ObservableInput<any>>(
  innerObservable: O,
  concurrent?: number
): Lifter<any, ObservedValueOf<O>>;
export function mergeMapTo<T, R, O extends ObservableInput<any>>(
  innerObservable: O,
  resultSelector?:
    | ((
        outerN: T,
        innerValue: ObservedValueOf<O>,
        outerX: number,
        innerIndex: number
      ) => R)
    | number,
  concurrent: number = Number.POSITIVE_INFINITY
): Lifter<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return mergeMap(() => innerObservable, resultSelector, concurrent);
  }
  if (typeof resultSelector === 'number') {
    concurrent = resultSelector;
  }
  return mergeMap(() => innerObservable, concurrent);
}

export function mergeScan<T, R>(
  accumulator: (acc: R, value: T, index: number) => ObservableInput<R>,
  seed: R,
  concurrent: number = Number.POSITIVE_INFINITY
): Lifter<T, R> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new MergeScanOperator(accumulator, seed, concurrent));
}

export class MergeScanOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private accumulator: (
      acc: R,
      value: T,
      index: number
    ) => ObservableInput<R>,
    private seed: R,
    private concurrent: number
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new MergeScanSubscriber(
        subscriber,
        this.accumulator,
        this.seed,
        this.concurrent
      )
    );
  }
}


export function mergeWith<N, F, D>(): Lifter<T, T>;
export function mergeWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): Lifter<T, T | ObservedUnionFrom<A>>;
export function mergeWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): Lifter<T, T | ObservedUnionFrom<A>> {
  return merge(...otherSources);
}

export function min<N, F, D>(
  comparer?: (x: T, y: N) => number
): qt.MonoOper<N, F, D> {
  const min: (x: T, y: N) => T =
    typeof comparer === 'function'
      ? (x, y) => (comparer(x, y) < 0 ? x : y)
      : (x, y) => (x < y ? x : y);
  return reduce(min);
}

export function multicast<N, F, D>(
  subject: Subject<N, F, D>
): UnaryFun<Observable<N, F, D>, Connectable<N, F, D>>;
export function multicast<T, O extends ObservableInput<any>>(
  subject: Subject<N, F, D>,
  selector: (shared: qt.Source<N, F, D>) => O
): UnaryFun<Observable<N, F, D>, Connectable<ObservedValueOf<O>>>;
export function multicast<N, F, D>(
  subjectFactory: (this: qt.Source<N, F, D>) => Subject<N, F, D>
): UnaryFun<Observable<N, F, D>, Connectable<N, F, D>>;
export function multicast<T, O extends ObservableInput<any>>(
  SubjectFactory: (this: qt.Source<N, F, D>) => Subject<N, F, D>,
  selector: (shared: qt.Source<N, F, D>) => O
): Lifter<T, ObservedValueOf<O>>;
export function multicast<T, R>(
  subjectOrSubjectFactory: Subject<N, F, D> | (() => Subject<N, F, D>),
  selector?: (source: qt.Source<N, F, D>) => qt.Source<R>
): Lifter<T, R> {
  return function multicastLifter(source: qt.Source<N, F, D>): qt.Source<R> {
    let subjectFactory: () => Subject<N, F, D>;
    if (typeof subjectOrSubjectFactory === 'function') {
      subjectFactory = <() => Subject<N, F, D>>subjectOrSubjectFactory;
    } else {
      subjectFactory = function subjectFactory() {
        return <Subject<N, F, D>>subjectOrSubjectFactory;
      };
    }

    if (typeof selector === 'function') {
      return source.lift(new MulticastOperator(subjectFactory, selector));
    }

    const connectable: any = Object.create(
      source,
      connectableObservableDescriptor
    );
    connectable.source = source;
    connectable.subjectFactory = subjectFactory;

    return <Connectable<R>>connectable;
  };
}

export class MulticastOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private subjectFactory: () => Subject<N, F, D>,
    private selector: (source: qt.Source<N, F, D>) => qt.Source<R>
  ) {}
  call(subscriber: Subscriber<R>, source: any): any {
    const {selector} = this;
    const subject = this.subjectFactory();
    const subscription = selector(subject).subscribe(subscriber);
    subscription.add(source.subscribe(subject));
    return subscription;
  }
}

export function observeOn<N, F, D>(
  scheduler: qt.SchedulerLike,
  delay: number = 0
): qt.MonoOper<N, F, D> {
  return function observeOnLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    return source.lift(new ObserveOnOperator(scheduler, delay));
  };
}

export class ObserveOnOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private scheduler: qt.SchedulerLike, private delay: number = 0) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ObserveOnSubscriber(subscriber, this.scheduler, this.delay)
    );
  }
}



export function onErrorResumeNext<N, F, D>(): Lifter<T, T>;
export function onErrorResumeNext<T, T2>(
  v: ObservableInput<T2>
): Lifter<T, T | T2>;
export function onErrorResumeNext<T, T2, T3>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>
): Lifter<T, T | T2 | T3>;
export function onErrorResumeNext<T, T2, T3, T4>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>,
  v3: ObservableInput<T4>
): Lifter<T, T | T2 | T3 | T4>;
export function onErrorResumeNext<T, T2, T3, T4, T5>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>,
  v3: ObservableInput<T4>,
  v4: ObservableInput<T5>
): Lifter<T, T | T2 | T3 | T4 | T5>;
export function onErrorResumeNext<T, T2, T3, T4, T5, T6>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>,
  v3: ObservableInput<T4>,
  v4: ObservableInput<T5>,
  v5: ObservableInput<T6>
): Lifter<T, T | T2 | T3 | T4 | T5 | T6>;
export function onErrorResumeNext<T, T2, T3, T4, T5, T6, T7>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>,
  v3: ObservableInput<T4>,
  v4: ObservableInput<T5>,
  v5: ObservableInput<T6>,
  v6: ObservableInput<T7>
): Lifter<T, T | T2 | T3 | T4 | T5 | T6 | T7>;
export function onErrorResumeNext<T, R>(
  ...observables: Array<ObservableInput<any>>
): Lifter<T, T | R>;
export function onErrorResumeNext<T, R>(
  array: ObservableInput<any>[]
): Lifter<T, T | R>;
export function onErrorResumeNext<T, R>(
  ...nextSources: Array<ObservableInput<any> | Array<ObservableInput<any>>>
): Lifter<T, R> {
  if (nextSources.length === 1 && isArray(nextSources[0])) {
    nextSources = <Array<Observable<any>>>nextSources[0];
  }

  return (source: qt.Source<N, F, D>) =>
    source.lift(new OnErrorResumeNextOperator<T, R>(nextSources));
}

export function onErrorResumeNextStatic<R>(v: ObservableInput<R>): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, R>(
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>
): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, T4, R>(
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>,
  v4: ObservableInput<T4>
): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, T4, T5, R>(
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>,
  v4: ObservableInput<T4>,
  v5: ObservableInput<T5>
): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, T4, T5, T6, R>(
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>,
  v4: ObservableInput<T4>,
  v5: ObservableInput<T5>,
  v6: ObservableInput<T6>
): qt.Source<R>;
export function onErrorResumeNextStatic<R>(
  ...observables: Array<ObservableInput<any> | ((...values: Array<any>) => R)>
): qt.Source<R>;
export function onErrorResumeNextStatic<R>(
  array: ObservableInput<any>[]
): qt.Source<R>;
export function onErrorResumeNextStatic<T, R>(
  ...nextSources: Array<
    | ObservableInput<any>
    | Array<ObservableInput<any>>
    | ((...values: Array<any>) => R)
  >
): qt.Source<R> {
  let source: ObservableInput<any> | null = null;

  if (nextSources.length === 1 && isArray(nextSources[0])) {
    nextSources = <Array<ObservableInput<any>>>nextSources[0];
  }
  source = nextSources.shift()!;

  return from(source, null!).lift(
    new OnErrorResumeNextOperator<T, R>(nextSources)
  );
}

class OnErrorResumeNextOperator<T, R> implements qt.Operator<T, R> {
  constructor(private nextSources: Array<ObservableInput<any>>) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new OnErrorResumeNextSubscriber(subscriber, this.nextSources)
    );
  }
}


export function pairwise<N, F, D>(): Lifter<T, [T, T]> {
  return (source: qt.Source<N, F, D>) => source.lift(new PairwiseOperator());
}

class PairwiseOperator<N, F, D> implements qt.Operator<T, [T, T]> {
  call(subscriber: Subscriber<[T, T]>, source: any): any {
    return source.subscribe(new PairwiseSubscriber(subscriber));
  }
}

class PairwiseSubscriber<N, F, D> extends Subscriber<N, F, D> {
  private prev: T | undefined;
  private hasPrev = false;

  constructor(tgt: Subscriber<[T, T]>) {
    super(tgt);
  }

  _next(value: N): void {
    let pair: [T, T] | undefined;

    if (this.hasPrev) {
      pair = [this.prev!, value];
    } else {
      this.hasPrev = true;
    }

    this.prev = value;

    if (pair) {
      this.tgt.next(pair);
    }
  }
}

export function partition<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): UnaryFun<Observable<N, F, D>, [Observable<N, F, D>, qt.Source<N, F, D>]> {
  return (source: qt.Source<N, F, D>) =>
    [
      filter(predicate, thisArg)(source),
      filter(not(predicate, thisArg) as any)(source)
    ] as [Observable<N, F, D>, qt.Source<N, F, D>];
}

export function pluck<T, K1 extends keyof T>(k1: K1): Lifter<T, T[K1]>;
export function pluck<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  k1: K1,
  k2: K2
): Lifter<T, T[K1][K2]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2]
>(k1: K1, k2: K2, k3: K3): Lifter<T, T[K1][K2][K3]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3]
>(k1: K1, k2: K2, k3: K3, k4: K4): Lifter<T, T[K1][K2][K3][K4]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4]
>(k1: K1, k2: K2, k3: K3, k4: K4, k5: K5): Lifter<T, T[K1][K2][K3][K4][K5]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5]
>(
  k1: K1,
  k2: K2,
  k3: K3,
  k4: K4,
  k5: K5,
  k6: K6
): Lifter<T, T[K1][K2][K3][K4][K5][K6]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5]
>(
  k1: K1,
  k2: K2,
  k3: K3,
  k4: K4,
  k5: K5,
  k6: K6,
  ...rest: string[]
): Lifter<T, unknown>;
export function pluck<N, F, D>(...properties: string[]): Lifter<T, unknown>;
export function pluck<T, R>(
  ...properties: Array<string | number | symbol>
): Lifter<T, R> {
  const length = properties.length;
  if (length === 0) {
    throw new Error('list of properties cannot be empty.');
  }
  return map(x => {
    let currentProp: any = x;
    for (let i = 0; i < length; i++) {
      const p = currentProp[properties[i]];
      if (typeof p !== 'undefined') {
        currentProp = p;
      } else {
        return undefined;
      }
    }
    return currentProp;
  });
}

export function publish<N, F, D>(): UnaryFun<
  Observable<N, F, D>,
  Connectable<N, F, D>
>;
export function publish<T, O extends ObservableInput<any>>(
  selector: (shared: qt.Source<N, F, D>) => O
): Lifter<T, ObservedValueOf<O>>;
export function publish<N, F, D>(
  selector: qt.MonoOper<N, F, D>
): qt.MonoOper<N, F, D>;
export function publish<T, R>(
  selector?: Lifter<T, R>
): qt.MonoOper<N, F, D> | Lifter<T, R> {
  return selector
    ? multicast(() => new Subject<N, F, D>(), selector)
    : multicast(new Subject<N, F, D>());
}

export function publishBehavior<N, F, D>(
  value: T
): UnaryFun<Observable<N, F, D>, Connectable<N, F, D>> {
  return (source: qt.Source<N, F, D>) =>
    multicast(new Behavior<N, F, D>(value))(source) as Connectable<N, F, D>;
}

export function publishLast<N, F, D>(): UnaryFun<
  Observable<N, F, D>,
  Connectable<N, F, D>
> {
  return (source: qt.Source<N, F, D>) =>
    multicast(new Async<N, F, D>())(source);
}

export function publishReplay<N, F, D>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.SchedulerLike
): qt.MonoOper<N, F, D>;
export function publishReplay<T, O extends ObservableInput<any>>(
  bufferSize?: number,
  windowTime?: number,
  selector?: (shared: qt.Source<N, F, D>) => O,
  scheduler?: qt.SchedulerLike
): Lifter<T, ObservedValueOf<O>>;
export function publishReplay<T, R>(
  bufferSize?: number,
  windowTime?: number,
  selectorOrScheduler?: qt.SchedulerLike | Lifter<T, R>,
  scheduler?: qt.SchedulerLike
): UnaryFun<Observable<N, F, D>, Connectable<R>> {
  if (selectorOrScheduler && typeof selectorOrScheduler !== 'function') {
    scheduler = selectorOrScheduler;
  }

  const selector =
    typeof selectorOrScheduler === 'function' ? selectorOrScheduler : undefined;
  const subject = new Replay<N, F, D>(bufferSize, windowTime, scheduler);

  return (source: qt.Source<N, F, D>) =>
    multicast(() => subject, selector!)(source) as Connectable<R>;
}

export function race<N, F, D>(
  ...observables: (Observable<N, F, D> | qt.Source<N, F, D>[])[]
): qt.MonoOper<N, F, D> {
  return function raceLifter(source: qt.Source<N, F, D>) {
    if (observables.length === 1 && isArray(observables[0])) {
      observables = observables[0] as qt.Source<N, F, D>[];
    }

    return source.lift.call(
      raceStatic(source, ...(observables as qt.Source<N, F, D>[])),
      undefined
    ) as qt.Source<N, F, D>;
  };
}

export function reduce<V, A = V>(
  accumulator: (acc: A | V, value: V, index: number) => A
): Lifter<V, V | A>;
export function reduce<V, A>(
  accumulator: (acc: A, value: V, index: number) => A,
  seed: A
): Lifter<V, A>;
export function reduce<V, A, S = A>(
  accumulator: (acc: A | S, value: V, index: number) => A,
  seed: S
): Lifter<V, A>;
export function reduce<V, A>(
  accumulator: (acc: V | A, value: V, index: number) => A,
  seed?: any
): Lifter<V, V | A> {
  if (arguments.length >= 2) {
    return function reduceLifterWithSeed(
      source: qt.Source<V>
    ): qt.Source<V | A> {
      return pipe(
        scan(accumulator, seed),
        takeLast(1),
        defaultIfEmpty(seed)
      )(source);
    };
  }
  return function reduceLifter(source: qt.Source<V>): qt.Source<V | A> {
    return pipe(
      scan<V, V | A>((acc, value, index) => accumulator(acc, value, index + 1)),
      takeLast(1)
    )(source);
  };
}

export function refCount<N, F, D>(): qt.MonoOper<N, F, D> {
  return function refCountLifter(
    source: Connectable<N, F, D>
  ): qt.Source<N, F, D> {
    return source.lift(new RefCountOperator(source));
  } as qt.MonoOper<N, F, D>;
}

class RefCountOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private connectable: Connectable<N, F, D>) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    const {connectable} = this;
    (<any>connectable)._refCount++;

    const refCounter = new RefCountSubscriber(subscriber, connectable);
    const subscription = source.subscribe(refCounter);

    if (!refCounter.closed) {
      (<any>refCounter).connection = connectable.connect();
    }

    return subscription;
  }
}


export function repeat<N, F, D>(count: number = -1): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    if (count === 0) {
      return EMPTY;
    } else if (count < 0) {
      return source.lift(new RepeatOperator(-1, source));
    } else {
      return source.lift(new RepeatOperator(count - 1, source));
    }
  };
}

class RepeatOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private count: number, private source: qt.Source<N, F, D>) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RepeatSubscriber(subscriber, this.count, this.source)
    );
  }
}


export function repeatWhen<N, F, D>(
  notifier: (notifications: qt.Source<any, F, D>) => qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new RepeatWhenOperator(notifier));
}

class RepeatWhenOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    protected notifier: (
      notifications: qt.Source<any, F, D>
    ) => qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RepeatWhenSubscriber(subscriber, this.notifier, source)
    );
  }
}


export interface RetryConfig {
  count: number;
  resetOnSuccess?: boolean;
}

export function retry<N, F, D>(count?: number): qt.MonoOper<N, F, D>;
export function retry<N, F, D>(config: RetryConfig): qt.MonoOper<N, F, D>;
export function retry<N, F, D>(
  configOrCount: number | RetryConfig = -1
): qt.MonoOper<N, F, D> {
  let config: RetryConfig;
  if (configOrCount && typeof configOrCount === 'object') {
    config = configOrCount as RetryConfig;
  } else {
    config = {
      count: configOrCount as number
    };
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new RetryOperator(config.count, !!config.resetOnSuccess, source)
    );
}

class RetryOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private count: number,
    private resetOnSuccess: boolean,
    private source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RetrySubscriber(
        subscriber,
        this.count,
        this.resetOnSuccess,
        this.source
      )
    );
  }
}


export function retryWhen<N, F, D>(
  notifier: (errors: qt.Source<any, F, D>) => qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new RetryWhenOperator(notifier, source));
}

class RetryWhenOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    protected notifier: (errors: qt.Source<any, F, D>) => qt.Source<any, F, D>,
    protected source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RetryWhenSubscriber(subscriber, this.notifier, this.source)
    );
  }
}


export function sample<N, F, D>(
  notifier: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SampleOperator(notifier));
}

class SampleOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private notifier: qt.Source<any, F, D>) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    const sampleSubscriber = new SampleSubscriber(subscriber);
    const subscription = source.subscribe(sampleSubscriber);
    subscription.add(subscribeToResult(sampleSubscriber, this.notifier));
    return subscription;
  }
}

class SampleSubscriber<T, R> extends Outer<N, M, F, D> {
  private value: T | undefined;
  private hasValue = false;

  protected _next(n?: N) {
    this.value = value;
    this.hasValue = true;
  }

  notifyNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.emitValue();
  }

  notifyDone(): void {
    this.emitValue();
  }

  emitValue() {
    if (this.hasValue) {
      this.hasValue = false;
      this.tgt.next(this.value);
    }
  }
}

export function sampleTime<N, F, D>(
  period: number,
  scheduler: qt.SchedulerLike = async
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SampleTimeOperator(period, scheduler));
}

class SampleTimeOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private period: number, private scheduler: qt.SchedulerLike) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new SampleTimeSubscriber(subscriber, this.period, this.scheduler)
    );
  }
}


function dispatchNotification<N, F, D>(
  this: qt.SchedulerAction<any>,
  state: any
) {
  let {subscriber, period} = state;
  subscriber.notifyNext();
  this.schedule(state, period);
}

export function scan<V, A = V>(
  accumulator: (acc: A | V, value: V, index: number) => A
): Lifter<V, V | A>;
export function scan<V, A>(
  accumulator: (acc: A, value: V, index: number) => A,
  seed: A
): Lifter<V, A>;
export function scan<V, A, S>(
  accumulator: (acc: A | S, value: V, index: number) => A,
  seed: S
): Lifter<V, A>;
export function scan<V, A, S>(
  accumulator: (acc: V | A | S, value: V, index: number) => A,
  seed?: S
): Lifter<V, V | A> {
  let hasSeed = false;
  if (arguments.length >= 2) {
    hasSeed = true;
  }

  return function scanLifter(source: qt.Source<V>) {
    return source.lift(new ScanOperator(accumulator, seed, hasSeed));
  };
}

class ScanOperator<V, A, S> implements qt.Operator<V, A> {
  constructor(
    private accumulator: (acc: V | A | S, value: V, index: number) => A,
    private seed?: S,
    private hasSeed: boolean = false
  ) {}

  call(subscriber: Subscriber<A>, source: any): qt.Closer {
    return source.subscribe(
      new ScanSubscriber(subscriber, this.accumulator, this.seed, this.hasSeed)
    );
  }
}


export function sequenceEqual<N, F, D>(
  compareTo: qt.Source<N, F, D>,
  comparator?: (a: T, b: N) => boolean
): Lifter<T, boolean> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SequenceEqualOperator(compareTo, comparator));
}

export class SequenceEqualOperator<N, F, D> implements qt.Operator<T, boolean> {
  constructor(
    private compareTo: qt.Source<N, F, D>,
    private comparator?: (a: T, b: N) => boolean
  ) {}

  call(subscriber: Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new SequenceEqualSubscriber(subscriber, this.compareTo, this.comparator)
    );
  }
}


class SequenceEqualCompareToSubscriber<T, R> extends Subscriber<N, F, D> {
  constructor(tgt: Observer<R>, private parent: SequenceEqualSubscriber<T, R>) {
    super(tgt);
  }

  protected _next(v: N) {
    this.parent.nextB(value);
  }

  protected _fail(f?: F) {
    this.parent.error(err);
    this.unsubscribe();
  }

  protected _done(d?: D) {
    this.parent.completeB();
    this.unsubscribe();
  }
}

function shareSubjectFactory() {
  return new Subject<any>();
}

export function share<N, F, D>(): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    refCount()(multicast(shareSubjectFactory)(source)) as qt.Source<N, F, D>;
}

export interface ShareReplayConfig {
  bufferSize?: number;
  windowTime?: number;
  refCount: boolean;
  scheduler?: qt.SchedulerLike;
}

export function shareReplay<N, F, D>(
  config: ShareReplayConfig
): qt.MonoOper<N, F, D>;
export function shareReplay<N, F, D>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.SchedulerLike
): qt.MonoOper<N, F, D>;
export function shareReplay<N, F, D>(
  configOrBufferSize?: ShareReplayConfig | number,
  windowTime?: number,
  scheduler?: qt.SchedulerLike
): qt.MonoOper<N, F, D> {
  let config: ShareReplayConfig;
  if (configOrBufferSize && typeof configOrBufferSize === 'object') {
    config = configOrBufferSize as ShareReplayConfig;
  } else {
    config = {
      bufferSize: configOrBufferSize as number | undefined,
      windowTime,
      refCount: false,
      scheduler
    };
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(shareReplayOperator(config));
}

function shareReplayOperator<N, F, D>({
  bufferSize = Number.POSITIVE_INFINITY,
  windowTime = Number.POSITIVE_INFINITY,
  refCount: useRefCount,
  scheduler
}: ShareReplayConfig) {
  let subject: Replay<N, F, D> | undefined;
  let refCount = 0;
  let subscription?: Subscription;
  let hasError = false;
  let isComplete = false;

  return function shareReplayOperation(
    this: Subscriber<N, F, D>,
    source: qt.Source<N, F, D>
  ) {
    refCount++;
    if (!subject || hasError) {
      hasError = false;
      subject = new Replay<N, F, D>(bufferSize, windowTime, scheduler);
      subscription = source.subscribe({
        next(value) {
          subject!.next(value);
        },
        error(err) {
          hasError = true;
          subject!.error(err);
        },
        complete() {
          isComplete = true;
          subscription = undefined;
          subject!.complete();
        }
      });
    }

    const innerSub = subject.subscribe(this);
    this.add(() => {
      refCount--;
      innerSub.unsubscribe();
      if (subscription && !isComplete && useRefCount && refCount === 0) {
        subscription.unsubscribe();
        subscription = undefined;
        subject = undefined;
      }
    });
  };
}

export function single<N, F, D>(
  predicate?: (value: T, index: number, source: qt.Source<N, F, D>) => boolean
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SingleOperator(predicate, source));
}

class SingleOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private predicate:
      | ((value: T, index: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new SingleSubscriber(subscriber, this.predicate, this.source)
    );
  }
}


export function skip<N, F, D>(count: number): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new SkipOperator(count));
}

class SkipOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private total: number) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new SkipSubscriber(subscriber, this.total));
  }
}

class SkipSubscriber<N, F, D> extends Subscriber<N, F, D> {
  count: number = 0;

  constructor(tgt: Subscriber<N, F, D>, private total: number) {
    super(tgt);
  }
  protected _next(x: N) {
    if (++this.count > this.total) {
      this.tgt.next(x);
    }
  }
}

export function skipLast<N, F, D>(count: number): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SkipLastOperator(count));
}

class SkipLastOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private _skipCount: number) {
    if (this._skipCount < 0) {
      throw new OutOfRangeError();
    }
  }

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    if (this._skipCount === 0) {
      return source.subscribe(new Subscriber(subscriber));
    } else {
      return source.subscribe(
        new SkipLastSubscriber(subscriber, this._skipCount)
      );
    }
  }
}


export function skipUntil<N, F, D>(
  notifier: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SkipUntilOperator(notifier));
}

class SkipUntilOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private notifier: qt.Source<any, F, D>) {}

  call(tgt: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new SkipUntilSubscriber(tgt, this.notifier));
  }
}


export function skipWhile<N, F, D>(
  predicate: (value: T, index: number) => boolean
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SkipWhileOperator(predicate));
}

class SkipWhileOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private predicate: (value: T, index: number) => boolean) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new SkipWhileSubscriber(subscriber, this.predicate)
    );
  }
}


export function startWith<T, A extends any[]>(
  ...values: A
): Lifter<T, T | ValueFromArray<A>>;
export function startWith<T, D>(...values: D[]): Lifter<T, T | D> {
  const scheduler = values[values.length - 1];
  if (isScheduler(scheduler)) {
    values.pop();
    return (source: qt.Source<N, F, D>) =>
      concatStatic(values, source, scheduler);
  } else {
    return (source: qt.Source<N, F, D>) => concatStatic(values, source);
  }
}

export function subscribeOn<N, F, D>(
  scheduler: qt.SchedulerLike,
  delay: number = 0
): qt.MonoOper<N, F, D> {
  return function subscribeOnLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    return source.lift(new SubscribeOnOperator<N, F, D>(scheduler, delay));
  };
}

class SubscribeOnOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private scheduler: qt.SchedulerLike, private delay: number) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return new SubscribeOnObservable<N, F, D>(
      source,
      this.delay,
      this.scheduler
    ).subscribe(subscriber);
  }
}

export function switchAll<N, F, D>(): Lifter<ObservableInput<N, F, D>, T>;
export function switchAll<R>(): Lifter<any, R>;
export function switchAll<N, F, D>(): Lifter<ObservableInput<N, F, D>, T> {
  return switchMap(identity);
}

export function switchMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O
): Lifter<T, ObservedValueOf<O>>;
export function switchMap<T, R, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?: (
    outerN: T,
    innerValue: ObservedValueOf<O>,
    outerX: number,
    innerIndex: number
  ) => R
): Lifter<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return (source: qt.Source<N, F, D>) =>
      source.pipe(
        switchMap((a, i) =>
          from(project(a, i)).pipe(map((b, ii) => resultSelector(a, b, i, ii)))
        )
      );
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SwitchMapOperator(project));
}

class SwitchMapOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => ObservableInput<R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new SwitchMapSubscriber(subscriber, this.project));
  }
}


export function switchMapTo<R>(observable: ObservableInput<R>): Lifter<any, R>;
export function switchMapTo<T, I, R>(
  innerObservable: ObservableInput<I>,
  resultSelector?: (
    outerN: T,
    innerValue: I,
    outerX: number,
    innerIndex: number
  ) => R
): Lifter<T, I | R> {
  return resultSelector
    ? switchMap(() => innerObservable, resultSelector)
    : switchMap(() => innerObservable);
}

export function take<N, F, D>(count: number): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    if (count === 0) {
      return EMPTY;
    } else {
      return source.lift(new TakeOperator(count));
    }
  };
}

class TakeOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private total: number) {
    if (this.total < 0) {
      throw new OutOfRangeError();
    }
  }

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new TakeSubscriber(subscriber, this.total));
  }
}


export function takeLast<N, F, D>(count: number): qt.MonoOper<N, F, D> {
  return function takeLastLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    if (count === 0) {
      return EMPTY;
    } else {
      return source.lift(new TakeLastOperator(count));
    }
  };
}

class TakeLastOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private total: number) {
    if (this.total < 0) {
      throw new OutOfRangeError();
    }
  }

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new TakeLastSubscriber(subscriber, this.total));
  }
}


export function takeUntil<N, F, D>(
  notifier: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new TakeUntilOperator(notifier));
}

class TakeUntilOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private notifier: qt.Source<any, F, D>) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    const takeUntilSubscriber = new TakeUntilSubscriber(subscriber);
    const notifierSubscription = subscribeToResult(
      takeUntilSubscriber,
      this.notifier
    );
    if (notifierSubscription && !takeUntilSubscriber.seenValue) {
      takeUntilSubscriber.add(notifierSubscription);
      return source.subscribe(takeUntilSubscriber);
    }
    return takeUntilSubscriber;
  }
}


export function takeWhile<T, S extends T>(
  predicate: (value: T, index: number) => value is S
): Lifter<T, S>;
export function takeWhile<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
  inclusive: false
): Lifter<T, S>;
export function takeWhile<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  inclusive?: boolean
): qt.MonoOper<N, F, D>;
export function takeWhile<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  inclusive = false
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new TakeWhileOperator(predicate, inclusive));
}

class TakeWhileOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private predicate: (value: T, index: number) => boolean,
    private inclusive: boolean
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new TakeWhileSubscriber(subscriber, this.predicate, this.inclusive)
    );
  }
}


export function tap<N, F, D>(
  next?: (x: N) => void,
  error?: (e: any) => void,
  complete?: () => void
): qt.MonoOper<N, F, D>;
export function tap<N, F, D>(observer: Target<N, F, D>): qt.MonoOper<N, F, D>;
export function tap<N, F, D>(
  nextOrObserver?: Target<N, F, D> | ((x: N) => void) | null,
  error?: ((e: any) => void) | null,
  complete?: (() => void) | null
): qt.MonoOper<N, F, D> {
  return function tapLifter(source: qt.Source<N, F, D>): qt.Source<N, F, D> {
    return source.lift(new DoOperator(nextOrObserver, error, complete));
  };
}

class DoOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private nextOrObserver?: Target<N, F, D> | ((x: N) => void) | null,
    private error?: ((e: any) => void) | null,
    private complete?: (() => void) | null
  ) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new TapSubscriber(
        subscriber,
        this.nextOrObserver,
        this.error,
        this.complete
      )
    );
  }
}


export interface ThrottleConfig {
  leading?: boolean;
  trailing?: boolean;
}

export const defaultThrottleConfig: ThrottleConfig = {
  leading: true,
  trailing: false
};

export function throttle<N, F, D>(
  durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>,
  config: ThrottleConfig = defaultThrottleConfig
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new ThrottleOperator(
        durationSelector,
        !!config.leading,
        !!config.trailing
      )
    );
}

class ThrottleOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ThrottleSubscriber(
        subscriber,
        this.durationSelector,
        this.leading,
        this.trailing
      )
    );
  }
}


export function throttleTime<N, F, D>(
  duration: number,
  scheduler: qt.SchedulerLike = async,
  config: ThrottleConfig = defaultThrottleConfig
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new ThrottleTimeOperator(
        duration,
        scheduler,
        !!config.leading,
        !!config.trailing
      )
    );
}

class ThrottleTimeOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private duration: number,
    private scheduler: qt.SchedulerLike,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ThrottleTimeSubscriber(
        subscriber,
        this.duration,
        this.scheduler,
        this.leading,
        this.trailing
      )
    );
  }
}


interface DispatchArg<N, F, D> {
  subscriber: ThrottleTimeSubscriber<N, F, D>;
}

function dispatchNext<N, F, D>(arg: DispatchArg<N, F, D>) {
  const {subscriber} = arg;
  subscriber.clearThrottle();
}

export function throwIfEmpty<N, F, D>(
  errorFactory: () => any = defaultErrorFactory
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    return source.lift(new ThrowIfEmptyOperator(errorFactory));
  };
}

class ThrowIfEmptyOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private errorFactory: () => any) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ThrowIfEmptySubscriber(subscriber, this.errorFactory)
    );
  }
}


function defaultErrorFactory() {
  return new EmptyError();
}

export function timeInterval<N, F, D>(
  scheduler: qt.SchedulerLike = async
): Lifter<T, TimeInterval<N, F, D>> {
  return (source: qt.Source<N, F, D>) =>
    defer(() => {
      return source.pipe(
        // TODO(benlesh): correct these typings.
        scan(
          ({current}, value) => ({
            value,
            current: scheduler.now(),
            last: current
          }),
          {current: scheduler.now(), value: undefined, last: undefined} as any
        ) as Lifter<T, any>,
        map<any, TimeInterval<N, F, D>>(
          ({current, last, value}) => new TimeInterval(value, current - last)
        )
      );
    });
}

export class TimeInterval<N, F, D> {
  constructor(public value: T, public interval: number) {}
}

export function timeout<N, F, D>(
  due: number | Date,
  scheduler: qt.SchedulerLike = async
): qt.MonoOper<N, F, D> {
  return timeoutWith(due, throwError(new TimeoutError()), scheduler);
}

export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: ObservableInput<R>,
  scheduler?: qt.SchedulerLike
): Lifter<T, T | R>;
export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: ObservableInput<R>,
  scheduler: qt.SchedulerLike = async
): Lifter<T, T | R> {
  return (source: qt.Source<N, F, D>) => {
    let absoluteTimeout = isDate(due);
    let waitFor = absoluteTimeout
      ? +due - scheduler.now()
      : Math.abs(<number>due);
    return source.lift(
      new TimeoutWithOperator(
        waitFor,
        absoluteTimeout,
        withObservable,
        scheduler
      )
    );
  };
}

class TimeoutWithOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private waitFor: number,
    private absoluteTimeout: boolean,
    private withObservable: ObservableInput<any>,
    private scheduler: qt.SchedulerLike
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new TimeoutWithSubscriber(
        subscriber,
        this.absoluteTimeout,
        this.waitFor,
        this.withObservable,
        this.scheduler
      )
    );
  }
}


export function timestamp<N, F, D>(
  timestampProvider: Stamper = Date
): Lifter<T, Timestamp<N, F, D>> {
  return map((value: N) => ({value, timestamp: timestampProvider.now()}));
}

function toArrayReducer<N, F, D>(arr: T[], item: T, index: number): T[] {
  if (index === 0) {
    return [item];
  }
  arr.push(item);
  return arr;
}

export function toArray<N, F, D>(): qt.Lifter<N, N[], F, D> {
  return reduce(toArrayReducer, [] as T[]);
}

export function window<N, F, D>(
  windowBoundaries: qt.Source<any, F, D>
): Lifter<T, qt.Source<N, F, D>> {
  return function windowLifter(source: qt.Source<N, F, D>) {
    return source.lift(new WindowOperator(windowBoundaries));
  };
}

class WindowOperator<N, F, D> implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(private windowBoundaries: qt.Source<any, F, D>) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    const windowSubscriber = new WindowSubscriber(subscriber);
    const sourceSubscription = source.subscribe(windowSubscriber);
    if (!sourceSubscription.closed) {
      windowSubscriber.add(
        subscribeToResult(windowSubscriber, this.windowBoundaries)
      );
    }
    return sourceSubscription;
  }
}

class WindowSubscriber<N, F, D> extends Outer<T, any> {
  private window: Subject<N, F, D> = new Subject<N, F, D>();

  constructor(tgt: Subscriber<Observable<N, F, D>>) {
    super(tgt);
    tgt.next(this.window);
  }

  notifyNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: Inner<N, any, F, D>
  ): void {
    this.openWindow();
  }

  notifyError(error: any, innerSub: Inner<N, any, F, D>): void {
    this._fail(error);
  }

  notifyDone(innerSub: Inner<N, any, F, D>): void {
    this._done();
  }

  protected _next(v: N) {
    this.window.next(value);
  }

  protected _fail(f?: F) {
    this.window.error(err);
    this.tgt.error(err);
  }

  protected _done(d?: D) {
    this.window.complete();
    this.tgt.complete();
  }

  _unsubscribe() {
    this.window = null!;
  }

  private openWindow(): void {
    const prevWindow = this.window;
    if (prevWindow) {
      prevWindow.complete();
    }
    const tgt = this.tgt;
    const newWindow = (this.window = new Subject<N, F, D>());
    tgt.next(newWindow);
  }
}

export function windowCount<N, F, D>(
  windowSize: number,
  startWindowEvery: number = 0
): Lifter<T, qt.Source<N, F, D>> {
  return function windowCountLifter(source: qt.Source<N, F, D>) {
    return source.lift(
      new WindowCountOperator<N, F, D>(windowSize, startWindowEvery)
    );
  };
}

class WindowCountOperator<N, F, D>
  implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(private windowSize: number, private startWindowEvery: number) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowCountSubscriber(
        subscriber,
        this.windowSize,
        this.startWindowEvery
      )
    );
  }
}

class WindowCountSubscriber<N, F, D> extends Subscriber<N, F, D> {
  private windows: Subject<N, F, D>[] = [new Subject<N, F, D>()];
  private count: number = 0;

  constructor(
    protected tgt: Subscriber<Observable<N, F, D>>,
    private windowSize: number,
    private startWindowEvery: number
  ) {
    super(tgt);
    tgt.next(this.windows[0]);
  }

  protected _next(n?: N) {
    const startWindowEvery =
      this.startWindowEvery > 0 ? this.startWindowEvery : this.windowSize;
    const tgt = this.tgt;
    const windowSize = this.windowSize;
    const windows = this.windows;
    const len = windows.length;

    for (let i = 0; i < len && !this.closed; i++) {
      windows[i].next(value);
    }
    const c = this.count - windowSize + 1;
    if (c >= 0 && c % startWindowEvery === 0 && !this.closed) {
      windows.shift()!.complete();
    }
    if (++this.count % startWindowEvery === 0 && !this.closed) {
      const window = new Subject<N, F, D>();
      windows.push(window);
      tgt.next(window);
    }
  }

  protected _fail(f?: F) {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.error(err);
      }
    }
    this.tgt.error(err);
  }

  protected _done(d?: D) {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.complete();
      }
    }
    this.tgt.complete();
  }

  protected _unsubscribe() {
    this.count = 0;
    this.windows = null!;
  }
}

export function windowTime<N, F, D>(
  windowTimeSpan: number,
  scheduler?: qt.SchedulerLike
): Lifter<T, qt.Source<N, F, D>>;
export function windowTime<N, F, D>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  scheduler?: qt.SchedulerLike
): Lifter<T, qt.Source<N, F, D>>;
export function windowTime<N, F, D>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  maxWindowSize: number,
  scheduler?: qt.SchedulerLike
): Lifter<T, qt.Source<N, F, D>>;

export function windowTime<N, F, D>(
  windowTimeSpan: number
): Lifter<T, qt.Source<N, F, D>> {
  let scheduler: qt.SchedulerLike = async;
  let windowCreationInterval: number | null = null;
  let maxWindowSize: number = Number.POSITIVE_INFINITY;

  if (isScheduler(arguments[3])) {
    scheduler = arguments[3];
  }

  if (isScheduler(arguments[2])) {
    scheduler = arguments[2];
  } else if (isNumeric(arguments[2])) {
    maxWindowSize = Number(arguments[2]);
  }

  if (isScheduler(arguments[1])) {
    scheduler = arguments[1];
  } else if (isNumeric(arguments[1])) {
    windowCreationInterval = Number(arguments[1]);
  }

  return function windowTimeLifter(source: qt.Source<N, F, D>) {
    return source.lift(
      new WindowTimeOperator<N, F, D>(
        windowTimeSpan,
        windowCreationInterval,
        maxWindowSize,
        scheduler
      )
    );
  };
}

class WindowTimeOperator<N, F, D>
  implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(
    private windowTimeSpan: number,
    private windowCreationInterval: number | null,
    private maxWindowSize: number,
    private scheduler: qt.SchedulerLike
  ) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowTimeSubscriber(
        subscriber,
        this.windowTimeSpan,
        this.windowCreationInterval,
        this.maxWindowSize,
        this.scheduler
      )
    );
  }
}

interface CreationState<N, F, D> {
  windowTimeSpan: number;
  windowCreationInterval: number;
  subscriber: WindowTimeSubscriber<N, F, D>;
  scheduler: qt.SchedulerLike;
}

interface TimeSpanOnlyState<N, F, D> {
  window: CountedSubject<N, F, D>;
  windowTimeSpan: number;
  subscriber: WindowTimeSubscriber<N, F, D>;
}

interface CloseWindowContext<N, F, D> {
  action: qt.SchedulerAction<CreationState<N, F, D>>;
  subscription: Subscription;
}

interface CloseState<N, F, D> {
  subscriber: WindowTimeSubscriber<N, F, D>;
  window: CountedSubject<N, F, D>;
  context: CloseWindowContext<N, F, D>;
}

class CountedSubject<N, F, D> extends Subject<N, F, D> {
  private _numberOfNextedValues: number = 0;

  next(value: N): void {
    this._numberOfNextedValues++;
    super.next(value);
  }

  get numberOfNextedValues(): number {
    return this._numberOfNextedValues;
  }
}

class WindowTimeSubscriber<N, F, D> extends Subscriber<N, F, D> {
  private windows: CountedSubject<N, F, D>[] = [];

  constructor(
    protected tgt: Subscriber<Observable<N, F, D>>,
    windowTimeSpan: number,
    windowCreationInterval: number | null,
    private maxWindowSize: number,
    scheduler: qt.SchedulerLike
  ) {
    super(tgt);

    const window = this.openWindow();
    if (windowCreationInterval !== null && windowCreationInterval >= 0) {
      const closeState: CloseState<N, F, D> = {
        subscriber: this,
        window,
        context: null!
      };
      const creationState: CreationState<N, F, D> = {
        windowTimeSpan,
        windowCreationInterval,
        subscriber: this,
        scheduler
      };
      this.add(
        scheduler.schedule<CloseState<N, F, D>>(
          dispatchWindowClose as any,
          windowTimeSpan,
          closeState
        )
      );
      this.add(
        scheduler.schedule<CreationState<N, F, D>>(
          dispatchWindowCreation as any,
          windowCreationInterval,
          creationState
        )
      );
    } else {
      const timeSpanOnlyState: TimeSpanOnlyState<N, F, D> = {
        subscriber: this,
        window,
        windowTimeSpan
      };
      this.add(
        scheduler.schedule<TimeSpanOnlyState<N, F, D>>(
          dispatchWindowTimeSpanOnly as any,
          windowTimeSpan,
          timeSpanOnlyState
        )
      );
    }
  }

  protected _next(v: N) {
    const windows =
      this.maxWindowSize < Number.POSITIVE_INFINITY
        ? this.windows.slice()
        : this.windows;
    const len = windows.length;
    for (let i = 0; i < len; i++) {
      const window = windows[i];
      if (!window.closed) {
        window.next(value);
        if (this.maxWindowSize <= window.numberOfNextedValues) {
          this.closeWindow(window);
        }
      }
    }
  }

  protected _fail(f?: F) {
    const windows = this.windows;
    while (windows.length > 0) {
      windows.shift()!.error(err);
    }
    this.tgt.error(err);
  }

  protected _done(d?: D) {
    const windows = this.windows;
    while (windows.length > 0) {
      windows.shift()!.complete();
    }
    this.tgt.complete();
  }

  public openWindow(): CountedSubject<N, F, D> {
    const window = new CountedSubject<N, F, D>();
    this.windows.push(window);
    const tgt = this.tgt;
    tgt.next(window);
    return window;
  }

  public closeWindow(window: CountedSubject<N, F, D>): void {
    const index = this.windows.indexOf(window);
    if (index >= 0) {
      window.complete();
      this.windows.splice(index, 1);
    }
  }
}

function dispatchWindowTimeSpanOnly<N, F, D>(
  this: qt.SchedulerAction<TimeSpanOnlyState<N, F, D>>,
  state: TimeSpanOnlyState<N, F, D>
): void {
  const {subscriber, windowTimeSpan, window} = state;
  if (window) {
    subscriber.closeWindow(window);
  }
  state.window = subscriber.openWindow();
  this.schedule(state, windowTimeSpan);
}

function dispatchWindowCreation<N, F, D>(
  this: qt.SchedulerAction<CreationState<N, F, D>>,
  state: CreationState<N, F, D>
): void {
  const {windowTimeSpan, subscriber, scheduler, windowCreationInterval} = state;
  const window = subscriber.openWindow();
  const action = this;
  let context: CloseWindowContext<N, F, D> = {action, subscription: null!};
  const timeSpanState: CloseState<N, F, D> = {subscriber, window, context};
  context.subscription = scheduler.schedule<CloseState<N, F, D>>(
    dispatchWindowClose as any,
    windowTimeSpan,
    timeSpanState
  );
  action.add(context.subscription);
  action.schedule(state, windowCreationInterval);
}

function dispatchWindowClose<N, F, D>(
  this: qt.SchedulerAction<CloseState<N, F, D>>,
  state: CloseState<N, F, D>
): void {
  const {subscriber, window, context} = state;
  if (context && context.action && context.subscription) {
    context.action.remove(context.subscription);
  }
  subscriber.closeWindow(window);
}

export function windowToggle<T, O>(
  openings: qt.Source<O>,
  closingSelector: (openValue: O) => qt.Source<any, F, D>
): Lifter<T, qt.Source<N, F, D>> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new WindowToggleOperator<T, O>(openings, closingSelector));
}

class WindowToggleOperator<T, O> implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(
    private openings: qt.Source<O>,
    private closingSelector: (openValue: O) => qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowToggleSubscriber(
        subscriber,
        this.openings,
        this.closingSelector
      )
    );
  }
}

interface WindowContext<N, F, D> {
  window: Subject<N, F, D>;
  subscription: Subscription;
}

class WindowToggleSubscriber<T, O> extends Outer<T, any> {
  private contexts: WindowContext<N, F, D>[] = [];
  private openSubscription?: Subscription;

  constructor(
    tgt: Subscriber<Observable<N, F, D>>,
    private openings: qt.Source<O>,
    private closingSelector: (openValue: O) => qt.Source<any, F, D>
  ) {
    super(tgt);
    this.add(
      (this.openSubscription = subscribeToResult(
        this,
        openings,
        openings as any
      ))
    );
  }

  protected _next(n?: N) {
    const {contexts} = this;
    if (contexts) {
      const len = contexts.length;
      for (let i = 0; i < len; i++) {
        contexts[i].window.next(value);
      }
    }
  }

  protected _fail(f?: F) {
    const {contexts} = this;
    this.contexts = null!;

    if (contexts) {
      const len = contexts.length;
      let index = -1;

      while (++index < len) {
        const context = contexts[index];
        context.window.error(err);
        context.subscription.unsubscribe();
      }
    }

    super._fail(err);
  }

  protected _done(d?: D) {
    const {contexts} = this;
    this.contexts = null!;
    if (contexts) {
      const len = contexts.length;
      let index = -1;
      while (++index < len) {
        const context = contexts[index];
        context.window.complete();
        context.subscription.unsubscribe();
      }
    }
    super._done();
  }

  _unsubscribe() {
    const {contexts} = this;
    this.contexts = null!;
    if (contexts) {
      const len = contexts.length;
      let index = -1;
      while (++index < len) {
        const context = contexts[index];
        context.window.unsubscribe();
        context.subscription.unsubscribe();
      }
    }
  }

  notifyNext(
    outerN: any,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: Inner<N, any, F, D>
  ): void {
    if (outerN === this.openings) {
      let closingNotifier;
      try {
        const {closingSelector} = this;
        closingNotifier = closingSelector(innerValue);
      } catch (e) {
        return this.error(e);
      }

      const window = new Subject<N, F, D>();
      const subscription = new Subscription();
      const context = {window, subscription};
      this.contexts.push(context);
      const innerSubscription = subscribeToResult(
        this,
        closingNotifier,
        context as any
      );

      if (innerSubscription!.closed) {
        this.closeWindow(this.contexts.length - 1);
      } else {
        (<any>innerSubscription).context = context;
        subscription.add(innerSubscription);
      }

      this.tgt.next(window);
    } else {
      this.closeWindow(this.contexts.indexOf(outerN));
    }
  }

  notifyFail(f?: F) {
    this.error(err);
  }

  notifyDone(inner: Subscription): void {
    if (inner !== this.openSubscription) {
      this.closeWindow(this.contexts.indexOf((<any>inner).context));
    }
  }

  private closeWindow(index: number): void {
    if (index === -1) return;
    const {contexts} = this;
    const context = contexts[index];
    const {window, subscription} = context;
    contexts.splice(index, 1);
    window.complete();
    subscription.unsubscribe();
  }
}

export function windowWhen<N, F, D>(
  closingSelector: () => qt.Source<any, F, D>
): Lifter<T, qt.Source<N, F, D>> {
  return function windowWhenLifter(source: qt.Source<N, F, D>) {
    return source.lift(new WindowOperator<N, F, D>(closingSelector));
  };
}

class WindowOperator<N, F, D> implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(private closingSelector: () => qt.Source<any, F, D>) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowSubscriber(subscriber, this.closingSelector)
    );
  }
}

class WindowSubscriber<N, F, D> extends Outer<T, any> {
  private window: Subject<N, F, D> | undefined;
  private closingNotification?: Subscription;

  constructor(
    protected tgt: Subscriber<Observable<N, F, D>>,
    private closingSelector: () => qt.Source<any, F, D>
  ) {
    super(tgt);
    this.openWindow();
  }

  notifyNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: Inner<N, any, F, D>
  ): void {
    this.openWindow(innerSub);
  }

  notifyError(error: any, innerSub: Inner<N, any, F, D>): void {
    this._fail(error);
  }

  notifyDone(innerSub: Inner<N, any, F, D>): void {
    this.openWindow(innerSub);
  }

  protected _next(v: N) {
    this.window!.next(value);
  }

  protected _fail(f?: F) {
    this.window!.error(e);
    this.tgt.error(e);
    this.unsubscribeClosingNotification();
  }

  protected _done(d?: D) {
    this.window!.complete();
    this.tgt.complete();
    this.unsubscribeClosingNotification();
  }

  private unsubscribeClosingNotification(): void {
    if (this.closingNotification) {
      this.closingNotification.unsubscribe();
    }
  }

  private openWindow(innerSub: Inner<N, any, F, D> | null = null): void {
    if (innerSub) {
      this.remove(innerSub);
      innerSub.unsubscribe();
    }

    const prevWindow = this.window;
    if (prevWindow) {
      prevWindow.complete();
    }

    const window = (this.window = new Subject<N, F, D>());
    this.tgt.next(window);

    let closingNotifier;
    try {
      const {closingSelector} = this;
      closingNotifier = closingSelector();
    } catch (e) {
      this.tgt.error(e);
      this.window.error(e);
      return;
    }
    this.add(
      (this.closingNotification = subscribeToResult(this, closingNotifier))
    );
  }
}

export function withLatestFrom<T, R>(project: (v1: N) => R): Lifter<T, R>;
export function withLatestFrom<T, O2 extends ObservableInput<any>, R>(
  source2: O2,
  project: (v1: T, v2: ObservedValueOf<O2>) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  project: (v1: T, v2: ObservedValueOf<O2>, v3: ObservedValueOf<O3>) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  project: (
    v1: T,
    v2: ObservedValueOf<O2>,
    v3: ObservedValueOf<O3>,
    v4: ObservedValueOf<O4>
  ) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  O5 extends ObservableInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  project: (
    v1: T,
    v2: ObservedValueOf<O2>,
    v3: ObservedValueOf<O3>,
    v4: ObservedValueOf<O4>,
    v5: ObservedValueOf<O5>
  ) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  O5 extends ObservableInput<any>,
  O6 extends ObservableInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6,
  project: (
    v1: T,
    v2: ObservedValueOf<O2>,
    v3: ObservedValueOf<O3>,
    v4: ObservedValueOf<O4>,
    v5: ObservedValueOf<O5>,
    v6: ObservedValueOf<O6>
  ) => R
): Lifter<T, R>;
export function withLatestFrom<T, O2 extends ObservableInput<any>>(
  source2: O2
): Lifter<T, [T, ObservedValueOf<O2>]>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>
>(v2: O2, v3: O3): Lifter<T, [T, ObservedValueOf<O2>, ObservedValueOf<O3>]>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4
): Lifter<
  T,
  [T, ObservedValueOf<O2>, ObservedValueOf<O3>, ObservedValueOf<O4>]
>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  O5 extends ObservableInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5
): Lifter<
  T,
  [
    T,
    ObservedValueOf<O2>,
    ObservedValueOf<O3>,
    ObservedValueOf<O4>,
    ObservedValueOf<O5>
  ]
>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  O5 extends ObservableInput<any>,
  O6 extends ObservableInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6
): Lifter<
  T,
  [
    T,
    ObservedValueOf<O2>,
    ObservedValueOf<O3>,
    ObservedValueOf<O4>,
    ObservedValueOf<O5>,
    ObservedValueOf<O6>
  ]
>;
export function withLatestFrom<T, R>(
  ...observables: Array<ObservableInput<any> | ((...values: Array<any>) => R)>
): Lifter<T, R>;
export function withLatestFrom<T, R>(
  array: ObservableInput<any>[]
): Lifter<T, R>;
export function withLatestFrom<T, R>(
  array: ObservableInput<any>[],
  project: (...values: Array<any>) => R
): Lifter<T, R>;
export function withLatestFrom<T, R>(
  ...args: Array<ObservableInput<any> | ((...values: Array<any>) => R)>
): Lifter<T, R> {
  return (source: qt.Source<N, F, D>) => {
    let project: any;
    if (typeof args[args.length - 1] === 'function') {
      project = args.pop();
    }
    const observables = <Observable<any>[]>args;
    return source.lift(new WithLatestFromOperator(observables, project));
  };
}

class WithLatestFromOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private observables: qt.Source<any, F, D>[],
    private project?: (...values: any[]) => qt.Source<R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new WithLatestFromSubscriber(subscriber, this.observables, this.project)
    );
  }
}

class WithLatestFromSubscriber<T, R> extends Outer<N, M, F, D> {
  private values: any[];
  private toRespond: number[] = [];

  constructor(
    tgt: Subscriber<R>,
    private observables: qt.Source<any, F, D>[],
    private project?: (...values: any[]) => qt.Source<R>
  ) {
    super(tgt);
    const len = observables.length;
    this.values = new Array(len);

    for (let i = 0; i < len; i++) {
      this.toRespond.push(i);
    }

    for (let i = 0; i < len; i++) {
      let observable = observables[i];
      this.add(subscribeToResult<T, R>(this, observable, <any>observable, i));
    }
  }

  notifyNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.values[outerX] = innerValue;
    const toRespond = this.toRespond;
    if (toRespond.length > 0) {
      const found = toRespond.indexOf(outerX);
      if (found !== -1) {
        toRespond.splice(found, 1);
      }
    }
  }

  notifyDone() {
    // noop
  }

  protected _next(n?: N) {
    if (this.toRespond.length === 0) {
      const args = [value, ...this.values];
      if (this.project) {
        this._tryProject(args);
      } else {
        this.tgt.next(args);
      }
    }
  }

  private _tryProject(args: any[]) {
    let result: any;
    try {
      result = this.project!.apply(this, args);
    } catch (err) {
      this.tgt.error(err);
      return;
    }
    this.tgt.next(result);
  }
}

export function zipAll<N, F, D>(): Lifter<ObservableInput<N, F, D>, T[]>;
export function zipAll<N, F, D>(): Lifter<any, T[]>;
export function zipAll<T, R>(
  project: (...values: T[]) => R
): Lifter<ObservableInput<N, F, D>, R>;
export function zipAll<R>(
  project: (...values: Array<any>) => R
): Lifter<any, R>;
export function zipAll<T, R>(
  project?: (...values: Array<any>) => R
): Lifter<T, R> {
  return (source: qt.Source<N, F, D>) => source.lift(new ZipOperator(project));
}
export function zip<T, R>(
  ...observables: Array<ObservableInput<any> | ((...values: Array<any>) => R)>
): Lifter<T, R> {
  return function zipLifter(source: qt.Source<N, F, D>) {
    return source.lift.call(
      zipStatic<R>(source, ...observables),
      undefined
    ) as qt.Source<R>;
  };
}
export function zipWith<T, A extends ObservableInput<any>[]>(
  ...otherInputs: A
): Lifter<T, Unshift<ObservedTupleFrom<A>, T>> {
  return zip(...otherInputs);
}
