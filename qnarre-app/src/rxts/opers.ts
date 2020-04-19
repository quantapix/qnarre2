import * as qt from './types';
import * as qu from './utils';
import * as qr from './subscriber';
import * as qj from './subject';

export function audit<N, R, F, D>(
  d: (_?: R) => qt.SourceOrPromise<N, F, D>
): qt.MonoOper<N, F, D> {
  return (s: qt.Source<N, F, D>) => s.lift(new Audit<N, R, F, D>(d));
}

export class Audit<N, R, F, D> implements qt.Operator<N, R, F, D> {
  constructor(private dur: (_?: R) => qt.SourceOrPromise<N, F, D>) {}

  call(r: qj.Subscriber<R, F, D>, s: qt.Source<N, F, D>) {
    return s.subscribe(new qr.Audit(r, this.dur));
  }
}

export function auditTime<N, F, D>(
  duration: number,
  s: qt.Scheduler = async
): qt.MonoOper<N, F, D> {
  return audit(() => timer(duration, s));
}

export function catchError<T, O extends SourceInput<any>>(
  selector: (err: any, caught: Observable<T>) => O
): Lifter<T, T | Sourced<O>>;
export function catchError<T, O extends SourceInput<any>>(
  selector: (err: any, caught: Observable<T>) => O
): Lifter<T, T | Sourced<O>> {
  return function catchErrorLifter(
    source: Observable<T>
  ): Observable<T | Sourced<O>> {
    const operator = new CatchOperator(selector);
    const caught = source.lift(operator);
    return (operator.caught = caught as Observable<T>);
  };
}

class CatchOperator<T, R> implements Operator<T, T | R> {
  caught: Observable<T> | undefined;

  constructor(
    private selector: (err: any, caught: Observable<T>) => SourceInput<T | R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new CatchSubscriber(subscriber, this.selector, this.caught!)
    );
  }
}

class CatchSubscriber<T, R> extends ReactorSubscriber<T, T | R> {
  constructor(
    destination: Subscriber<any>,
    private selector: (err: any, caught: Observable<T>) => SourceInput<T | R>,
    private caught: Observable<T>
  ) {
    super(destination);
  }

  error(err: any) {
    if (!this.stopped) {
      let result: any;
      try {
        result = this.selector(err, this.caught);
      } catch (err2) {
        super.error(err2);
        return;
      }
      this._recycle();
      const innerSubscriber = new ActorSubscriber(this, undefined, undefined!);
      this.add(innerSubscriber);
      const innerSubscription = subscribeToResult(
        this,
        result,
        undefined,
        undefined,
        innerSubscriber
      );
      if (innerSubscription !== innerSubscriber) {
        this.add(innerSubscription);
      }
    }
  }
}

export function defaultIfEmpty<T, R = T>(defaultValue?: R): Lifter<T, T | R>;
export function defaultIfEmpty<T, R>(
  defaultValue: R | null = null
): Lifter<T, T | R> {
  return (source: Observable<T>) =>
    source.lift(new DefaultIfEmptyOperator(defaultValue)) as Observable<T | R>;
}

class DefaultIfEmptyOperator<T, R> implements Operator<T, T | R> {
  constructor(private defaultValue: R) {}

  call(subscriber: Subscriber<T | R>, source: any): any {
    return source.subscribe(
      new DefaultIfEmptySubscriber(subscriber, this.defaultValue)
    );
  }
}

class DefaultIfEmptySubscriber<T, R> extends Subscriber<T> {
  private isEmpty: boolean = true;

  constructor(destination: Subscriber<T | R>, private defaultValue: R) {
    super(destination);
  }

  protected _next(v: T) {
    this.isEmpty = false;
    this.dst.next(value);
  }

  protected _complete() {
    if (this.isEmpty) {
      this.dst.next(this.defaultValue);
    }
    this.dst.complete();
  }
}

export function delay<T>(
  delay: number | Date,
  scheduler: Scheduler = async
): MonoOper<T> {
  const absoluteDelay = isDate(delay);
  const delayFor = absoluteDelay
    ? +delay - scheduler.now()
    : Math.abs(<number>delay);
  return (source: Observable<T>) =>
    source.lift(new DelayOperator(delayFor, scheduler));
}

class DelayOperator<T> implements Operator<T, T> {
  constructor(private delay: number, private scheduler: Scheduler) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new DelaySubscriber(subscriber, this.delay, this.scheduler)
    );
  }
}

interface DelayState<T> {
  source: DelaySubscriber<T>;
  destination: Target<T>;
  scheduler: Scheduler;
}

class DelaySubscriber<T> extends Subscriber<T> {
  private queue: Array<DelayMessage<T>> = [];
  private active: boolean = false;
  private errored: boolean = false;

  private static dispatch<T>(
    this: Action<DelayState<T>>,
    state: DelayState<T>
  ): void {
    const source = state.source;
    const queue = source.queue;
    const scheduler = state.scheduler;
    const destination = state.destination;

    while (queue.length > 0 && queue[0].time - scheduler.now() <= 0) {
      queue.shift()!.notification.observe(destination);
    }

    if (queue.length > 0) {
      const delay = Math.max(0, queue[0].time - scheduler.now());
      this.schedule(state, delay);
    } else if (source.stopped) {
      source.destination.complete();
      source.active = false;
    } else {
      this.unsubscribe();
      source.active = false;
    }
  }

  constructor(
    destination: Subscriber<T>,
    private delay: number,
    private scheduler: Scheduler
  ) {
    super(destination);
  }

  private _schedule(scheduler: Scheduler): void {
    this.active = true;
    const destination = this.destination as Subscription;
    destination.add(
      scheduler.schedule<DelayState<T>>(
        DelaySubscriber.dispatch as any,
        this.delay,
        {
          source: this,
          destination: this.destination,
          scheduler: scheduler
        }
      )
    );
  }

  private scheduleNotification(notification: Notification<T>): void {
    if (this.errored === true) {
      return;
    }

    const scheduler = this.scheduler;
    const message = new DelayMessage(
      scheduler.now() + this.delay,
      notification
    );
    this.queue.push(message);

    if (this.active === false) {
      this._schedule(scheduler);
    }
  }

  protected _next(value: T) {
    this.scheduleNotification(Notification.createNext(value));
  }

  protected _error(err: any) {
    this.errored = true;
    this.queue = [];
    this.dst.error(err);
    this.unsubscribe();
  }

  protected _complete() {
    if (this.queue.length === 0) {
      this.dst.complete();
    }
    this.unsubscribe();
  }
}

class DelayMessage<T> {
  constructor(
    public readonly time: number,
    public readonly notification: Notification<T>
  ) {}
}

export function delayWhen<T>(
  delayDurationSelector: (value: T, index: number) => Observable<any>,
  subscriptionDelay?: Observable<any>
): MonoOper<T>;
export function delayWhen<T>(
  delayDurationSelector: (value: T, index: number) => Observable<any>,
  subscriptionDelay?: Observable<any>
): MonoOper<T> {
  if (subscriptionDelay) {
    return (source: Observable<T>) =>
      new SubscriptionDelayObservable(source, subscriptionDelay).lift(
        new DelayWhenOperator(delayDurationSelector)
      );
  }
  return (source: Observable<T>) =>
    source.lift(new DelayWhenOperator(delayDurationSelector));
}

class DelayWhenOperator<T> implements Operator<T, T> {
  constructor(
    private delayDurationSelector: (value: T, index: number) => Observable<any>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new DelayWhenSubscriber(subscriber, this.delayDurationSelector)
    );
  }
}

class DelayWhenSubscriber<T, R> extends ReactorSubscriber<T, R> {
  private completed: boolean = false;
  private delayNotifierSubscriptions: Array<Subscription> = [];
  private index: number = 0;

  constructor(
    destination: Subscriber<T>,
    private delayDurationSelector: (value: T, index: number) => Observable<any>
  ) {
    super(destination);
  }

  reactNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    this.dst.next(outerN);
    this.removeSubscription(innerSub);
    this.tryComplete();
  }

  notifyError(error: any, innerSub: ActorSubscriber<T, R>): void {
    this._error(error);
  }

  notifyComplete(innerSub: ActorSubscriber<T, R>): void {
    const value = this.removeSubscription(innerSub);
    if (value) {
      this.dst.next(value);
    }
    this.tryComplete();
  }

  protected _next(v: T) {
    const index = this.index++;
    try {
      const delayNotifier = this.delayDurationSelector(value, index);
      if (delayNotifier) {
        this.tryDelay(delayNotifier, value);
      }
    } catch (err) {
      this.dst.error(err);
    }
  }

  protected _complete() {
    this.completed = true;
    this.tryComplete();
    this.unsubscribe();
  }

  private removeSubscription(subscription: ActorSubscriber<T, R>): T {
    subscription.unsubscribe();

    const subscriptionIdx = this.delayNotifierSubscriptions.indexOf(
      subscription
    );
    if (subscriptionIdx !== -1) {
      this.delayNotifierSubscriptions.splice(subscriptionIdx, 1);
    }

    return subscription.outerN;
  }

  private tryDelay(delayNotifier: Observable<any>, value: T): void {
    const notifierSubscription = subscribeToResult(this, delayNotifier, value);

    if (notifierSubscription && !notifierSubscription.closed) {
      const destination = this.destination as Subscription;
      destination.add(notifierSubscription);
      this.delayNotifierSubscriptions.push(notifierSubscription);
    }
  }

  private tryComplete(): void {
    if (this.completed && this.delayNotifierSubscriptions.length === 0) {
      this.dst.complete();
    }
  }
}

class SubscriptionDelayObservable<T> extends Observable<T> {
  constructor(
    public source: Observable<T>,
    private subscriptionDelay: Observable<any>
  ) {
    super();
  }

  _subscribe(subscriber: Subscriber<T>) {
    this.subscriptionDelay.subscribe(
      new SubscriptionDelaySubscriber(subscriber, this.source)
    );
  }
}

class SubscriptionDelaySubscriber<T> extends Subscriber<T> {
  private sourceSubscribed: boolean = false;

  constructor(private parent: Subscriber<T>, private source: Observable<T>) {
    super();
  }

  protected _next(unused: any) {
    this.subscribeToSource();
  }

  protected _error(err: any) {
    this.unsubscribe();
    this.parent.error(err);
  }

  protected _complete() {
    this.unsubscribe();
    this.subscribeToSource();
  }

  private subscribeToSource(): void {
    if (!this.sourceSubscribed) {
      this.sourceSubscribed = true;
      this.unsubscribe();
      this.source.subscribe(this.parent);
    }
  }
}

export function dematerialize<T>(): Lifter<Notification<T>, T> {
  return function dematerializeLifter(source: Observable<Notification<T>>) {
    return source.lift(new DeMaterializeOperator());
  };
}

class DeMaterializeOperator<T extends Notification<any>, R>
  implements Operator<T, R> {
  call(subscriber: Subscriber<any>, source: any): any {
    return source.subscribe(new DeMaterializeSubscriber(subscriber));
  }
}

class DeMaterializeSubscriber<T extends Notification<any>> extends Subscriber<
  T
> {
  constructor(destination: Subscriber<any>) {
    super(destination);
  }

  protected _next(value: T) {
    value.observe(this.destination);
  }
}

export function every<T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  thisArg?: any
): Lifter<T, boolean> {
  return (source: Observable<T>) =>
    source.lift(new EveryOperator(predicate, thisArg, source));
}

class EveryOperator<T> implements Operator<T, boolean> {
  constructor(
    private predicate: (
      value: T,
      index: number,
      source: Observable<T>
    ) => boolean,
    private thisArg: any,
    private source: Observable<T>
  ) {}

  call(observer: Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new EverySubscriber(observer, this.predicate, this.thisArg, this.source)
    );
  }
}

class EverySubscriber<T> extends Subscriber<T> {
  private index: number = 0;

  constructor(
    destination: Observer<boolean>,
    private predicate: (
      value: T,
      index: number,
      source: Observable<T>
    ) => boolean,
    private thisArg: any,
    private source: Observable<T>
  ) {
    super(destination);
    this.thisArg = thisArg || this;
  }

  private notifyComplete(everyValueMatch: boolean): void {
    this.dst.next(everyValueMatch);
    this.dst.complete();
  }

  protected _next(v: T) {
    let result = false;
    try {
      result = this.predicate.call(
        this.thisArg,
        value,
        this.index++,
        this.source
      );
    } catch (err) {
      this.dst.error(err);
      return;
    }

    if (!result) {
      this.notifyComplete(false);
    }
  }

  protected _complete() {
    this.notifyComplete(true);
  }
}

export function expand<T, R>(
  project: (value: T, index: number) => SourceInput<R>,
  concurrent?: number,
  scheduler?: Scheduler
): Lifter<T, R>;
export function expand<T>(
  project: (value: T, index: number) => SourceInput<T>,
  concurrent?: number,
  scheduler?: Scheduler
): MonoOper<T>;
export function expand<T, R>(
  project: (value: T, index: number) => SourceInput<R>,
  concurrent: number = Number.POSITIVE_INFINITY,
  scheduler?: Scheduler
): Lifter<T, R> {
  concurrent = (concurrent || 0) < 1 ? Number.POSITIVE_INFINITY : concurrent;

  return (source: Observable<T>) =>
    source.lift(new ExpandOperator(project, concurrent, scheduler));
}

export class ExpandOperator<T, R> implements Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => SourceInput<R>,
    private concurrent: number,
    private scheduler?: Scheduler
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

interface DispatchArg<T, R> {
  subscriber: ExpandSubscriber<T, R>;
  result: SourceInput<R>;
  value: any;
  index: number;
}

export class ExpandSubscriber<T, R> extends ReactorSubscriber<T, R> {
  private index: number = 0;
  private active: number = 0;
  private hasCompleted: boolean = false;
  private buffer: any[] | undefined;

  constructor(
    destination: Subscriber<R>,
    private project: (value: T, index: number) => SourceInput<R>,
    private concurrent: number,
    private scheduler?: Scheduler
  ) {
    super(destination);
    if (concurrent < Number.POSITIVE_INFINITY) {
      this.buffer = [];
    }
  }

  private static dispatch<T, R>(arg: DispatchArg<T, R>): void {
    const {subscriber, result, value, index} = arg;
    subscriber.subscribeToProjection(result, value, index);
  }

  protected _next(value: any): void {
    const destination = this.destination;

    if (destination.closed) {
      this._complete();
      return;
    }

    const index = this.index++;
    if (this.active < this.concurrent) {
      destination.next(value);
      try {
        const {project} = this;
        const result = project(value, index);
        if (!this.scheduler) {
          this.subscribeToProjection(result, value, index);
        } else {
          const state: DispatchArg<T, R> = {
            subscriber: this,
            result,
            value,
            index
          };
          const destination = this.destination as Subscription;
          destination.add(
            this.scheduler.schedule<DispatchArg<T, R>>(
              ExpandSubscriber.dispatch as any,
              0,
              state
            )
          );
        }
      } catch (e) {
        destination.error(e);
      }
    } else {
      this.buffer!.push(value);
    }
  }

  private subscribeToProjection(result: any, value: T, index: number): void {
    this.active++;
    const destination = this.destination as Subscription;
    destination.add(subscribeToResult<T, R>(this, result, value, index));
  }

  protected _complete() {
    this.hasCompleted = true;
    if (this.hasCompleted && this.active === 0) {
      this.dst.complete();
    }
    this.unsubscribe();
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    this._next(innerValue);
  }

  notifyComplete(innerSub: Subscription): void {
    const buffer = this.buffer;
    const destination = this.destination as Subscription;
    destination.remove(innerSub);
    this.active--;
    if (buffer && buffer.length > 0) {
      this._next(buffer.shift());
    }
    if (this.hasCompleted && this.active === 0) {
      this.dst.complete();
    }
  }
}

export function finalize<T>(callback: () => void): MonoOper<T> {
  return (source: Observable<T>) => source.lift(new FinallyOperator(callback));
}

class FinallyOperator<T> implements Operator<T, T> {
  constructor(private callback: () => void) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(new FinallySubscriber(subscriber, this.callback));
  }
}

class FinallySubscriber<T> extends Subscriber<T> {
  constructor(destination: Subscriber<T>, callback: () => void) {
    super(destination);
    this.add(new Subscription(callback));
  }
}

export function find<T, S extends T>(
  predicate: (value: T, index: number, source: Observable<T>) => value is S,
  thisArg?: any
): Lifter<T, S | undefined>;
export function find<T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  thisArg?: any
): Lifter<T, T | undefined>;
export function find<T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  thisArg?: any
): Lifter<T, T | undefined> {
  if (typeof predicate !== 'function') {
    throw new TypeError('predicate is not a function');
  }
  return (source: Observable<T>) =>
    source.lift(
      new FindValueOperator(predicate, source, false, thisArg)
    ) as Observable<T | undefined>;
}

export class FindValueOperator<T>
  implements Operator<T, T | number | undefined> {
  constructor(
    private predicate: (
      value: T,
      index: number,
      source: Observable<T>
    ) => boolean,
    private source: Observable<T>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {}

  call(observer: Subscriber<T>, source: any): any {
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

export class FindValueSubscriber<T> extends Subscriber<T> {
  private index: number = 0;

  constructor(
    destination: Subscriber<T>,
    private predicate: (
      value: T,
      index: number,
      source: Observable<T>
    ) => boolean,
    private source: Observable<T>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {
    super(destination);
  }

  private notifyComplete(value: any): void {
    const destination = this.destination;

    destination.next(value);
    destination.complete();
    this.unsubscribe();
  }

  protected _next(v: T) {
    const {predicate, thisArg} = this;
    const index = this.index++;
    try {
      const result = predicate.call(thisArg || this, value, index, this.source);
      if (result) {
        this.notifyComplete(this.yieldIndex ? index : value);
      }
    } catch (err) {
      this.dst.error(err);
    }
  }

  protected _complete() {
    this.notifyComplete(this.yieldIndex ? -1 : undefined);
  }
}

export function findIndex<T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  thisArg?: any
): Lifter<T, number> {
  return (source: Observable<T>) =>
    source.lift(
      new FindValueOperator(predicate, source, true, thisArg)
    ) as Observable<any>;
}

export interface RefCountSubscription {
  count: number;
  unsubscribe: () => void;
  closed: boolean;
  attemptedToUnsubscribe: boolean;
}

class GroupDurationSubscriber<K, T> extends Subscriber<T> {
  constructor(
    private key: K,
    private group: Subject<T>,
    private parent: GroupBySubscriber<any, K, T | any>
  ) {
    super(group);
  }

  protected _next(v: T) {
    this.complete();
  }

  _unsubscribe() {
    const {parent, key} = this;
    this.key = this.parent = null!;
    if (parent) {
      parent.removeGroup(key);
    }
  }
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

export function race<T>(
  ...observables: (Observable<T> | Observable<T>[])[]
): MonoOper<T> {
  return function raceLifter(source: Observable<T>) {
    if (observables.length === 1 && isArray(observables[0])) {
      observables = observables[0] as Observable<T>[];
    }

    return source.lift.call(
      raceStatic(source, ...(observables as Observable<T>[])),
      undefined
    ) as Observable<T>;
  };
}

export function repeat<T>(count: number = -1): MonoOper<T> {
  return (source: Observable<T>) => {
    if (count === 0) {
      return EMPTY;
    } else if (count < 0) {
      return source.lift(new RepeatOperator(-1, source));
    } else {
      return source.lift(new RepeatOperator(count - 1, source));
    }
  };
}

class RepeatOperator<T> implements Operator<T, T> {
  constructor(private count: number, private source: Observable<T>) {}
  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new RepeatSubscriber(subscriber, this.count, this.source)
    );
  }
}

class RepeatSubscriber<T> extends Subscriber<T> {
  constructor(
    destination: Subscriber<any>,
    private count: number,
    private source: Observable<T>
  ) {
    super(destination);
  }
  complete() {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) {
        return super.complete();
      } else if (count > -1) {
        this.count = count - 1;
      }
      source.subscribe(this._recycle());
    }
  }
}

export function repeatWhen<T>(
  notifier: (notifications: Observable<any>) => Observable<any>
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new RepeatWhenOperator(notifier));
}

class RepeatWhenOperator<T> implements Operator<T, T> {
  constructor(
    protected notifier: (notifications: Observable<any>) => Observable<any>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new RepeatWhenSubscriber(subscriber, this.notifier, source)
    );
  }
}

class RepeatWhenSubscriber<T, R> extends ReactorSubscriber<T, R> {
  private notifications: Subject<void> | null = null;
  private retries: Observable<any> | null = null;
  private retriesSubscription: Subscription | null | undefined = null;
  private sourceIsBeingSubscribedTo: boolean = true;

  constructor(
    destination: Subscriber<R>,
    private notifier: (notifications: Observable<any>) => Observable<any>,
    private source: Observable<T>
  ) {
    super(destination);
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    this.sourceIsBeingSubscribedTo = true;
    this.source.subscribe(this);
  }

  notifyComplete(innerSub: ActorSubscriber<T, R>): void {
    if (this.sourceIsBeingSubscribedTo === false) {
      return super.complete();
    }
  }

  complete() {
    this.sourceIsBeingSubscribedTo = false;

    if (!this.stopped) {
      if (!this.retries) {
        this.subscribeToRetries();
      }
      if (!this.retriesSubscription || this.retriesSubscription.closed) {
        return super.complete();
      }

      this._recycle();
      this.notifications!.next();
    }
  }

  _unsubscribe() {
    const {notifications, retriesSubscription} = this;
    if (notifications) {
      notifications.unsubscribe();
      this.notifications = null;
    }
    if (retriesSubscription) {
      retriesSubscription.unsubscribe();
      this.retriesSubscription = null;
    }
    this.retries = null;
  }

  _recycle(): Subscriber<T> {
    const {_unsubscribe} = this;

    this._unsubscribe = null!;
    super._recycle();
    this._unsubscribe = _unsubscribe;

    return this;
  }

  private subscribeToRetries() {
    this.notifications = new Subject();
    let retries;
    try {
      const {notifier} = this;
      retries = notifier(this.notifications);
    } catch (e) {
      return super.complete();
    }
    this.retries = retries;
    this.retriesSubscription = subscribeToResult(this, retries);
  }
}

function dispatchNotification<T>(this: Action<any>, state: any) {
  let {subscriber, period} = state;
  subscriber.reactNext();
  this.schedule(state, period);
}

export function sequenceEqual<T>(
  compareTo: Observable<T>,
  comparator?: (a: T, b: T) => boolean
): Lifter<T, boolean> {
  return (source: Observable<T>) =>
    source.lift(new SequenceEqualOperator(compareTo, comparator));
}

export class SequenceEqualOperator<T> implements Operator<T, boolean> {
  constructor(
    private compareTo: Observable<T>,
    private comparator?: (a: T, b: T) => boolean
  ) {}

  call(subscriber: Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new SequenceEqualSubscriber(subscriber, this.compareTo, this.comparator)
    );
  }
}

export class SequenceEqualSubscriber<T, R> extends Subscriber<T> {
  private _a: T[] = [];
  private _b: T[] = [];
  private _oneComplete = false;

  constructor(
    destination: Observer<R>,
    private compareTo: Observable<T>,
    private comparator?: (a: T, b: T) => boolean
  ) {
    super(destination);
    (this.destination as Subscription).add(
      compareTo.subscribe(
        new SequenceEqualCompareToSubscriber(destination, this)
      )
    );
  }

  protected _next(v: T) {
    if (this._oneComplete && this._b.length === 0) {
      this.emit(false);
    } else {
      this._a.push(value);
      this.checkValues();
    }
  }

  public _complete(): void {
    if (this._oneComplete) {
      this.emit(this._a.length === 0 && this._b.length === 0);
    } else {
      this._oneComplete = true;
    }
    this.unsubscribe();
  }

  checkValues() {
    const {_a, _b, comparator} = this;
    while (_a.length > 0 && _b.length > 0) {
      let a = _a.shift()!;
      let b = _b.shift()!;
      let areEqual = false;
      try {
        areEqual = comparator ? comparator(a, b) : a === b;
      } catch (e) {
        this.dst.error(e);
      }
      if (!areEqual) {
        this.emit(false);
      }
    }
  }

  emit(value: boolean) {
    const {destination} = this;
    destination.next(value);
    destination.complete();
  }

  nextB(value: T) {
    if (this._oneComplete && this._a.length === 0) {
      this.emit(false);
    } else {
      this._b.push(value);
      this.checkValues();
    }
  }

  completeB() {
    if (this._oneComplete) {
      this.emit(this._a.length === 0 && this._b.length === 0);
    } else {
      this._oneComplete = true;
    }
  }
}

class SequenceEqualCompareToSubscriber<T, R> extends Subscriber<T> {
  constructor(
    destination: Observer<R>,
    private parent: SequenceEqualSubscriber<T, R>
  ) {
    super(destination);
  }

  protected _next(v: T) {
    this.parent.nextB(value);
  }

  protected _error(e: any) {
    this.parent.error(err);
    this.unsubscribe();
  }

  protected _complete() {
    this.parent.completeB();
    this.unsubscribe();
  }
}

function shareSubjectFactory() {
  return new Subject<any>();
}

export function share<T>(): MonoOper<T> {
  return (source: Observable<T>) =>
    refCount()(multicast(shareSubjectFactory)(source)) as Observable<T>;
}

export interface ShareReplayConfig {
  bufferSize?: number;
  windowTime?: number;
  refCount: boolean;
  scheduler?: Scheduler;
}

export function shareReplay<T>(config: ShareReplayConfig): MonoOper<T>;
export function shareReplay<T>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: Scheduler
): MonoOper<T>;
export function shareReplay<T>(
  configOrBufferSize?: ShareReplayConfig | number,
  windowTime?: number,
  scheduler?: Scheduler
): MonoOper<T> {
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
  return (source: Observable<T>) => source.lift(shareReplayOperator(config));
}

function shareReplayOperator<T>({
  bufferSize = Number.POSITIVE_INFINITY,
  windowTime = Number.POSITIVE_INFINITY,
  refCount: useRefCount,
  scheduler
}: ShareReplayConfig) {
  let subject: Replay<T> | undefined;
  let refCount = 0;
  let subscription: Subscription | undefined;
  let hasError = false;
  let isComplete = false;

  return function shareReplayOperation(
    this: Subscriber<T>,
    source: Observable<T>
  ) {
    refCount++;
    if (!subject || hasError) {
      hasError = false;
      subject = new Replay<T>(bufferSize, windowTime, scheduler);
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

export function single<T>(
  predicate?: (value: T, index: number, source: Observable<T>) => boolean
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new SingleOperator(predicate, source));
}

class SingleOperator<T> implements Operator<T, T> {
  constructor(
    private predicate:
      | ((value: T, index: number, source: Observable<T>) => boolean)
      | undefined,
    private source: Observable<T>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new SingleSubscriber(subscriber, this.predicate, this.source)
    );
  }
}

class SingleSubscriber<T> extends Subscriber<T> {
  private seenValue: boolean = false;
  private singleValue: T | undefined;
  private index: number = 0;

  constructor(
    destination: Observer<T>,
    private predicate:
      | ((value: T, index: number, source: Observable<T>) => boolean)
      | undefined,
    private source: Observable<T>
  ) {
    super(destination);
  }

  private applySingleValue(value: T): void {
    if (this.seenValue) {
      this.dst.error('Sequence contains more than one element');
    } else {
      this.seenValue = true;
      this.singleValue = value;
    }
  }

  protected _next(v: T) {
    const index = this.index++;

    if (this.predicate) {
      this.tryNext(value, index);
    } else {
      this.applySingleValue(value);
    }
  }

  private tryNext(value: T, index: number): void {
    try {
      if (this.predicate!(value, index, this.source)) {
        this.applySingleValue(value);
      }
    } catch (err) {
      this.dst.error(err);
    }
  }

  protected _complete() {
    const destination = this.destination;

    if (this.index > 0) {
      destination.next(this.seenValue ? this.singleValue : undefined);
      destination.complete();
    } else {
      destination.error(new EmptyError());
    }
  }
}

export function subscribeOn<T>(
  scheduler: Scheduler,
  delay: number = 0
): MonoOper<T> {
  return function subscribeOnLifter(source: Observable<T>): Observable<T> {
    return source.lift(new SubscribeOnOperator<T>(scheduler, delay));
  };
}

class SubscribeOnOperator<T> implements Operator<T, T> {
  constructor(private scheduler: Scheduler, private delay: number) {}
  call(subscriber: Subscriber<T>, source: any): Closer {
    return new SubscribeOnObservable<T>(
      source,
      this.delay,
      this.scheduler
    ).subscribe(subscriber);
  }
}

class DoOperator<T> implements Operator<T, T> {
  constructor(
    private nextOrObserver?: Target<T> | ((x: T) => void) | null,
    private error?: ((e: any) => void) | null,
    private complete?: (() => void) | null
  ) {}
  call(subscriber: Subscriber<T>, source: any): Closer {
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

class TapSubscriber<T> extends Subscriber<T> {
  private _context: any;

  private _tapNext: (value: T) => void = noop;

  private _tapError: (err: any) => void = noop;

  private _tapComplete: () => void = noop;

  constructor(
    destination: Subscriber<T>,
    observerOrNext?: Target<T> | ((value: T) => void) | null,
    error?: ((e?: any) => void) | null,
    complete?: (() => void) | null
  ) {
    super(destination);
    this._tapError = error || noop;
    this._tapComplete = complete || noop;
    if (isFunction(observerOrNext)) {
      this._context = this;
      this._tapNext = observerOrNext;
    } else if (observerOrNext) {
      this._context = observerOrNext;
      this._tapNext = observerOrNext.next || noop;
      this._tapError = observerOrNext.error || noop;
      this._tapComplete = observerOrNext.complete || noop;
    }
  }

  _next(value: T) {
    try {
      this._tapNext.call(this._context, value);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    this.dst.next(value);
  }

  _error(err: any) {
    try {
      this._tapError.call(this._context, err);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    this.dst.error(err);
  }

  _complete() {
    try {
      this._tapComplete.call(this._context);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    return this.dst.complete();
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

export function throttle<T>(
  durationSelector: (value: T) => qt.SourceOrPromise<any>,
  config: ThrottleConfig = defaultThrottleConfig
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(
      new ThrottleOperator(
        durationSelector,
        !!config.leading,
        !!config.trailing
      )
    );
}

class ThrottleOperator<T> implements Operator<T, T> {
  constructor(
    private durationSelector: (value: T) => qt.SourceOrPromise<any>,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
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

class ThrottleSubscriber<T, R> extends ReactorSubscriber<T, R> {
  private _throttled: Subscription | null | undefined;
  private _sendValue: T | null = null;
  private _hasValue = false;

  constructor(
    protected destination: Subscriber<T>,
    private durationSelector: (value: T) => qt.SourceOrPromise<number>,
    private _leading: boolean,
    private _trailing: boolean
  ) {
    super(destination);
  }

  protected _next(v: T) {
    this._hasValue = true;
    this._sendValue = value;

    if (!this._throttled) {
      if (this._leading) {
        this.send();
      } else {
        this.throttle(value);
      }
    }
  }

  private send() {
    const {_hasValue, _sendValue} = this;
    if (_hasValue) {
      this.dst.next(_sendValue!);
      this.throttle(_sendValue!);
    }
    this._hasValue = false;
    this._sendValue = null;
  }

  private throttle(value: T): void {
    const duration = this.tryDurationSelector(value);
    if (!!duration) {
      this.add((this._throttled = subscribeToResult(this, duration)));
    }
  }

  private tryDurationSelector(value: T): qt.SourceOrPromise<any> | null {
    try {
      return this.durationSelector(value);
    } catch (err) {
      this.dst.error(err);
      return null;
    }
  }

  private throttlingDone() {
    const {_throttled, _trailing} = this;
    if (_throttled) {
      _throttled.unsubscribe();
    }
    this._throttled = null;

    if (_trailing) {
      this.send();
    }
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    this.throttlingDone();
  }

  notifyComplete(): void {
    this.throttlingDone();
  }
}

export function throttleTime<T>(
  duration: number,
  scheduler: Scheduler = async,
  config: ThrottleConfig = defaultThrottleConfig
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(
      new ThrottleTimeOperator(
        duration,
        scheduler,
        !!config.leading,
        !!config.trailing
      )
    );
}

class ThrottleTimeOperator<T> implements Operator<T, T> {
  constructor(
    private duration: number,
    private scheduler: Scheduler,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
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

class ThrottleTimeSubscriber<T> extends Subscriber<T> {
  private throttled: Subscription | null = null;
  private _hasTrailingValue: boolean = false;
  private _trailingValue: T | null = null;

  constructor(
    destination: Subscriber<T>,
    private duration: number,
    private scheduler: Scheduler,
    private leading: boolean,
    private trailing: boolean
  ) {
    super(destination);
  }

  protected _next(value: T) {
    if (this.throttled) {
      if (this.trailing) {
        this._trailingValue = value;
        this._hasTrailingValue = true;
      }
    } else {
      this.add(
        (this.throttled = this.scheduler.schedule<DispatchArg<T>>(
          dispatchNext as any,
          this.duration,
          {subscriber: this}
        ))
      );
      if (this.leading) {
        this.dst.next(value);
      } else if (this.trailing) {
        this._trailingValue = value;
        this._hasTrailingValue = true;
      }
    }
  }

  protected _complete() {
    if (this._hasTrailingValue) {
      this.dst.next(this._trailingValue);
      this.dst.complete();
    } else {
      this.dst.complete();
    }
  }

  clearThrottle() {
    const throttled = this.throttled;
    if (throttled) {
      if (this.trailing && this._hasTrailingValue) {
        this.dst.next(this._trailingValue);
        this._trailingValue = null;
        this._hasTrailingValue = false;
      }
      throttled.unsubscribe();
      this.remove(throttled);
      this.throttled = null!;
    }
  }
}

interface DispatchArg<T> {
  subscriber: ThrottleTimeSubscriber<T>;
}

function dispatchNext<T>(arg: DispatchArg<T>) {
  const {subscriber} = arg;
  subscriber.clearThrottle();
}

export function throwIfEmpty<T>(
  errorFactory: () => any = defaultErrorFactory
): MonoOper<T> {
  return (source: Observable<T>) => {
    return source.lift(new ThrowIfEmptyOperator(errorFactory));
  };
}

class ThrowIfEmptyOperator<T> implements Operator<T, T> {
  constructor(private errorFactory: () => any) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new ThrowIfEmptySubscriber(subscriber, this.errorFactory)
    );
  }
}

class ThrowIfEmptySubscriber<T> extends Subscriber<T> {
  private hasValue: boolean = false;

  constructor(destination: Subscriber<T>, private errorFactory: () => any) {
    super(destination);
  }

  protected _next(v: T) {
    this.hasValue = true;
    this.dst.next(value);
  }

  protected _complete() {
    if (!this.hasValue) {
      let err: any;
      try {
        err = this.errorFactory();
      } catch (e) {
        err = e;
      }
      this.dst.error(err);
    } else {
      return this.dst.complete();
    }
  }
}

function defaultErrorFactory() {
  return new EmptyError();
}

export function timeInterval<T>(
  scheduler: Scheduler = async
): Lifter<T, TimeInterval<T>> {
  return (source: Observable<T>) =>
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
        map<any, TimeInterval<T>>(
          ({current, last, value}) => new TimeInterval(value, current - last)
        )
      );
    });
}

export class TimeInterval<T> {
  constructor(public value: T, public interval: number) {}
}

export function timeout<T>(
  due: number | Date,
  scheduler: Scheduler = async
): MonoOper<T> {
  return timeoutWith(due, throwError(new TimeoutError()), scheduler);
}

export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: SourceInput<R>,
  scheduler?: Scheduler
): Lifter<T, T | R>;
export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: SourceInput<R>,
  scheduler: Scheduler = async
): Lifter<T, T | R> {
  return (source: Observable<T>) => {
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

class TimeoutWithOperator<T> implements Operator<T, T> {
  constructor(
    private waitFor: number,
    private absoluteTimeout: boolean,
    private withObservable: SourceInput<any>,
    private scheduler: Scheduler
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
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

class TimeoutWithSubscriber<T, R> extends ReactorSubscriber<T, R> {
  private action: Action<TimeoutWithSubscriber<T, R>> | null = null;

  constructor(
    destination: Subscriber<T>,
    private absoluteTimeout: boolean,
    private waitFor: number,
    private withObservable: SourceInput<any>,
    private scheduler: Scheduler
  ) {
    super(destination);
    this.scheduleTimeout();
  }

  private static dispatchTimeout<T, R>(
    subscriber: TimeoutWithSubscriber<T, R>
  ): void {
    const {withObservable} = subscriber;
    (<any>subscriber)._recycle();
    subscriber.add(subscribeToResult(subscriber, withObservable));
  }

  private scheduleTimeout(): void {
    const {action} = this;
    if (action) {
      this.action = <Action<TimeoutWithSubscriber<T, R>>>(
        action.schedule(this, this.waitFor)
      );
    } else {
      this.add(
        (this.action = <Action<TimeoutWithSubscriber<T, R>>>(
          this.scheduler.schedule<TimeoutWithSubscriber<T, R>>(
            TimeoutWithSubscriber.dispatchTimeout as any,
            this.waitFor,
            this
          )
        ))
      );
    }
  }

  protected _next(v: T) {
    if (!this.absoluteTimeout) {
      this.scheduleTimeout();
    }
    super._next(value);
  }

  _unsubscribe() {
    this.action = null;
    this.scheduler = null!;
    this.withObservable = null!;
  }
}

export function time<T>(timeProvider: Stamper = Date): Lifter<T, Stamp<T>> {
  return map((value: T) => ({value, time: timeProvider.now()}));
}

function toArrayReducer<T>(arr: T[], item: T, index: number): T[] {
  if (index === 0) {
    return [item];
  }
  arr.push(item);
  return arr;
}

export function toArray<T>(): Lifter<T, T[]> {
  return reduce(toArrayReducer, [] as T[]);
}

export function withLatestFrom<T, R>(project: (v1: T) => R): Lifter<T, R>;
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
  return (source: Observable<T>) => {
    let project: any;
    if (typeof args[args.length - 1] === 'function') {
      project = args.pop();
    }
    const observables = <Observable<any>[]>args;
    return source.lift(new WithLatestFromOperator(observables, project));
  };
}

class WithLatestFromOperator<T, R> implements Operator<T, R> {
  constructor(
    private observables: Observable<any>[],
    private project?: (...values: any[]) => Observable<R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new WithLatestFromSubscriber(subscriber, this.observables, this.project)
    );
  }
}

class WithLatestFromSubscriber<T, R> extends ReactorSubscriber<T, R> {
  private values: any[];
  private toRespond: number[] = [];

  constructor(
    destination: Subscriber<R>,
    private observables: Observable<any>[],
    private project?: (...values: any[]) => Observable<R>
  ) {
    super(destination);
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

  notifyComplete() {
    // noop
  }

  protected _next(value: T) {
    if (this.toRespond.length === 0) {
      const args = [value, ...this.values];
      if (this.project) {
        this._tryProject(args);
      } else {
        this.dst.next(args);
      }
    }
  }

  private _tryProject(args: any[]) {
    let result: any;
    try {
      result = this.project!.apply(this, args);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    this.dst.next(result);
  }
}
