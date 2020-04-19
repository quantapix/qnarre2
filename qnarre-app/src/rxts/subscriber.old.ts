import * as qt from './types';

import {Actor, Reactor, Subscription, Subscriber} from './subject';

export function catchError<T, O extends SourceInput<any>>(
  selector: (err: any, caught: qt.Source<N, F, D>) => O
): Lifter<T, T | Sourced<O>>;
export function catchError<T, O extends SourceInput<any>>(
  selector: (err: any, caught: qt.Source<N, F, D>) => O
): Lifter<T, T | Sourced<O>> {
  return function catchErrorLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<T | Sourced<O>> {
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
    ) => SourceInput<T | R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new CatchSubscriber(subscriber, this.selector, this.caught!)
    );
  }
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
  scheduler: qt.Scheduler = async
): qt.MonoOper<N, F, D> {
  const absoluteDelay = isDate(delay);
  const delayFor = absoluteDelay
    ? +delay - scheduler.now()
    : Math.abs(<number>delay);
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DelayOperator(delayFor, scheduler));
}

class DelayOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private delay: number, private scheduler: qt.Scheduler) {}

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

export function expand<T, R>(
  project: (value: T, index: number) => SourceInput<R>,
  concurrent?: number,
  scheduler?: qt.Scheduler
): Lifter<T, R>;
export function expand<N, F, D>(
  project: (value: T, index: number) => SourceInput<N, F, D>,
  concurrent?: number,
  scheduler?: qt.Scheduler
): qt.MonoOper<N, F, D>;
export function expand<T, R>(
  project: (value: T, index: number) => SourceInput<R>,
  concurrent: number = Number.POSITIVE_INFINITY,
  scheduler?: qt.Scheduler
): Lifter<T, R> {
  concurrent = (concurrent || 0) < 1 ? Number.POSITIVE_INFINITY : concurrent;

  return (source: qt.Source<N, F, D>) =>
    source.lift(new ExpandOperator(project, concurrent, scheduler));
}

export class ExpandOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => SourceInput<R>,
    private concurrent: number,
    private scheduler?: qt.Scheduler
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

class ActorRefCountSubscription extends Subscription {
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

function dispatchNotification<N, F, D>(this: qt.Action<any>, state: any) {
  let {subscriber, period} = state;
  subscriber.reactNext();
  this.schedule(state, period);
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
  scheduler?: qt.Scheduler;
}

export function shareReplay<N, F, D>(
  config: ShareReplayConfig
): qt.MonoOper<N, F, D>;
export function shareReplay<N, F, D>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.MonoOper<N, F, D>;
export function shareReplay<N, F, D>(
  configOrBufferSize?: ShareReplayConfig | number,
  windowTime?: number,
  scheduler?: qt.Scheduler
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
  let subscription: Subscription;
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

export function subscribeOn<N, F, D>(
  scheduler: qt.Scheduler,
  delay: number = 0
): qt.MonoOper<N, F, D> {
  return function subscribeOnLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    return source.lift(new SubscribeOnOperator<N, F, D>(scheduler, delay));
  };
}

class SubscribeOnOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private scheduler: qt.Scheduler, private delay: number) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return new SubscribeOnObservable<N, F, D>(
      source,
      this.delay,
      this.scheduler
    ).subscribe(subscriber);
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
  scheduler: qt.Scheduler = async,
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
    private scheduler: qt.Scheduler,
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
  scheduler: qt.Scheduler = async
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
  scheduler: qt.Scheduler = async
): qt.MonoOper<N, F, D> {
  return timeoutWith(due, throwError(new TimeoutError()), scheduler);
}

export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: SourceInput<R>,
  scheduler?: qt.Scheduler
): Lifter<T, T | R>;
export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: SourceInput<R>,
  scheduler: qt.Scheduler = async
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
    private withObservable: SourceInput<any>,
    private scheduler: qt.Scheduler
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

export function time<N, F, D>(
  timeProvider: Stamper = Date
): Lifter<T, Stamp<N, F, D>> {
  return map((value: N) => ({value, time: timeProvider.now()}));
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

export function withLatestFrom<T, R>(project: (v1: N) => R): Lifter<T, R>;
export function withLatestFrom<T, O2 extends SourceInput<any>, R>(
  source2: O2,
  project: (v1: T, v2: Sourced<O2>) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  project: (v1: T, v2: Sourced<O2>, v3: Sourced<O3>) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  project: (v1: T, v2: Sourced<O2>, v3: Sourced<O3>, v4: Sourced<O4>) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  project: (
    v1: T,
    v2: Sourced<O2>,
    v3: Sourced<O3>,
    v4: Sourced<O4>,
    v5: Sourced<O5>
  ) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>,
  O6 extends SourceInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6,
  project: (
    v1: T,
    v2: Sourced<O2>,
    v3: Sourced<O3>,
    v4: Sourced<O4>,
    v5: Sourced<O5>,
    v6: Sourced<O6>
  ) => R
): Lifter<T, R>;
export function withLatestFrom<T, O2 extends SourceInput<any>>(
  source2: O2
): Lifter<T, [T, Sourced<O2>]>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>
>(v2: O2, v3: O3): Lifter<T, [T, Sourced<O2>, Sourced<O3>]>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4
): Lifter<T, [T, Sourced<O2>, Sourced<O3>, Sourced<O4>]>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5
): Lifter<T, [T, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>]>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>,
  O6 extends SourceInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6
): Lifter<
  T,
  [T, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>, Sourced<O6>]
>;
export function withLatestFrom<T, R>(
  ...observables: Array<SourceInput<any> | ((...values: Array<any>) => R)>
): Lifter<T, R>;
export function withLatestFrom<T, R>(array: SourceInput<any>[]): Lifter<T, R>;
export function withLatestFrom<T, R>(
  array: SourceInput<any>[],
  project: (...values: Array<any>) => R
): Lifter<T, R>;
export function withLatestFrom<T, R>(
  ...args: Array<SourceInput<any> | ((...values: Array<any>) => R)>
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

class WithLatestFromSubscriber<T, R> extends Reactor<N, M, F, D> {
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

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
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

  reactDone() {
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
