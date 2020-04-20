import * as qt from './types';
import * as qu from './utils';
import * as qr from './opers';
import * as qj from './subject';

interface DelayState<N, F, D> {
  source: DelaySubscriber<N, F, D>;
  tgt: qt.Target<N, F, D>;
  scheduler: qt.Scheduler;
}

class DelayMessage<N, F, D> {
  constructor(
    public readonly time: number,
    public readonly notification: qt.Notification<N, F, D>
  ) {}
}

export function delay<N, F, D>(
  delay: number | Date,
  scheduler: qt.Scheduler = async
): qt.MonoOper<N, F, D> {
  const absoluteDelay = qu.isDate(delay);
  const delayFor = absoluteDelay
    ? +delay - scheduler.now()
    : Math.abs(<number>delay);
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DelayO(delayFor, scheduler));
}

class DelayO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private delay: number, private scheduler: qt.Scheduler) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new DelayR(subscriber, this.delay, this.scheduler));
  }
}

export class Delay<N, F, D> extends Subscriber<N, F, D> {
  private queue: Array<DelayMessage<N, F, D>> = [];
  private active = false;
  private errored = false;

  private static dispatch<N, F, D>(
    this: qt.Action<DelayState<N, F, D>>,
    state: DelayState<N, F, D>
  ): void {
    const source = state.source;
    const q = source.queue;
    const scheduler = state.scheduler;
    const tgt = state.tgt;
    while (q.length > 0 && q[0].time - scheduler.now() <= 0) {
      q.shift()!.notification.observe(tgt);
    }
    if (q.length > 0) {
      const delay = Math.max(0, q[0].time - scheduler.now());
      this.schedule(state, delay);
    } else if (source.stopped) {
      source.tgt.done();
      source.active = false;
    } else {
      this.unsubscribe();
      source.active = false;
    }
  }

  constructor(
    tgt: Subscriber<N, F, D>,
    private delay: number,
    private scheduler: qt.Scheduler
  ) {
    super(tgt);
  }

  private _schedule(s: qt.Scheduler): void {
    this.active = true;
    const tgt = this.tgt as Subscription;
    tgt.add(
      s.schedule<DelayState<N, F, D>>(Delay.dispatch as any, this.delay, {
        source: this,
        tgt: this.tgt,
        scheduler: s
      })
    );
  }

  private scheduleNotification(n: qt.Notification<N, F, D>): void {
    if (this.errored === true) return;
    const s = this.scheduler;
    const m = new DelayMessage(s.now() + this.delay, n);
    this.queue.push(m);
    if (!this.active) this._schedule(s);
  }

  protected _next(n?: N) {
    this.scheduleNotification(Notification.createNext(value));
  }

  protected _fail(f?: F) {
    this.errored = true;
    this.queue = [];
    this.tgt.fail(f);
    this.unsubscribe();
  }

  protected _done(d?: D) {
    if (this.queue.length === 0) this.tgt.done(d);
    this.unsubscribe();
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
        new DelayWhenO(delayDurationSelector)
      );
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DelayWhenO(delayDurationSelector));
}

class DelayWhenO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private delayDurationSelector: (
      value: T,
      index: number
    ) => qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DelayWhenR(subscriber, this.delayDurationSelector)
    );
  }
}

export class DelayWhenR<N, M, F, D> extends Reactor<N, M, F, D> {
  private completed = false;
  private delayNotifierSubscriptions = [] as Subscription[];
  private index = 0;

  constructor(
    tgt: Subscriber<N, F, D>,
    private delayDurationSelector: (
      value: N,
      index: number
    ) => qt.Source<any, F, D>
  ) {
    super(tgt);
  }

  reactNext(
    outerN: N,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ) {
    this.tgt.next(outerN);
    this.removeSubscription(innerSub);
    this.tryComplete();
  }

  reactFail(error: any, innerSub: Actor<N, M, F, D>) {
    this._fail(error);
  }

  reactDone(innerSub: Actor<N, M, F, D>) {
    const value = this.removeSubscription(innerSub);
    if (value) this.tgt.next(value);
    this.tryComplete();
  }

  protected _next(n?: N) {
    const index = this.index++;
    try {
      const delayNotifier = this.delayDurationSelector(n, index);
      if (delayNotifier) this.tryDelay(delayNotifier, n);
    } catch (e) {
      this.tgt.fail(e);
    }
  }

  protected _done(d?: D) {
    this.completed = true;
    this.tryComplete();
    this.unsubscribe();
  }

  private removeSubscription(s: Actor<N, M, F, D>): NavigationEvent {
    s.unsubscribe();
    const i = this.delayNotifierSubscriptions.indexOf(s);
    if (i !== -1) {
      this.delayNotifierSubscriptions.splice(i, 1);
    }
    return s.outerN;
  }

  private tryDelay(delayNotifier: qt.Source<any, F, D>, value: N) {
    const s = qu.subscribeToResult(this, delayNotifier, value);
    if (s && !s.closed) {
      const tgt = this.tgt as Subscription;
      tgt.add(s);
      this.delayNotifierSubscriptions.push(s);
    }
  }

  private tryComplete() {
    if (this.completed && this.delayNotifierSubscriptions.length === 0)
      this.tgt.done();
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
      new SubscriptionDelayR(subscriber, this.source)
    );
  }
}

export class SubscriptionDelayR<N, F, D> extends Subscriber<N, F, D> {
  private sourceSubscribed = false;

  constructor(
    private parent: Subscriber<N, F, D>,
    private source: qt.Source<N, F, D>
  ) {
    super();
  }

  protected _next(_n?: N) {
    this.subscribeToSource();
  }

  protected _fail(f?: F) {
    this.unsubscribe();
    this.parent.fail(f);
  }

  protected _done(_d?: D) {
    this.unsubscribe();
    this.subscribeToSource();
  }

  private subscribeToSource() {
    if (!this.sourceSubscribed) {
      this.sourceSubscribed = true;
      this.unsubscribe();
      this.source.subscribe(this.parent);
    }
  }
}

export function dematerialize<N, F, D>(): Lifter<Notification<N, F, D>, T> {
  return function dematerializeLifter(
    source: qt.Source<Notification<N, F, D>>
  ) {
    return source.lift(new DeMaterializeO());
  };
}

class DeMaterializeO<T extends Notification<any>, R>
  implements qt.Operator<T, R> {
  call(subscriber: Subscriber<any>, source: any): any {
    return source.subscribe(new DeMaterializeR(subscriber));
  }
}

export class DeMaterializeR<
  N extends qt.Notification<any>,
  F,
  D
> extends Subscriber<N, F, D> {
  constructor(tgt: Subscriber<any, F, D>) {
    super(tgt);
  }

  protected _next(n?: N) {
    n?.observe(this.tgt);
  }
}

export function materialize<N, F, D>(): Lifter<T, Notification<N, F, D>> {
  return function materializeLifter(source: qt.Source<N, F, D>) {
    return source.lift(new MaterializeO());
  };
}

class MaterializeO<N, F, D> implements qt.Operator<T, Notification<N, F, D>> {
  call(subscriber: Subscriber<Notification<N, F, D>>, source: any): any {
    return source.subscribe(new MaterializeR(subscriber));
  }
}

export class MaterializeR<N, F, D> extends Subscriber<N, F, D> {
  constructor(tgt: Subscriber<Notification<N, F, D>>) {
    super(tgt);
  }

  protected _next(n?: N) {
    this.tgt.next(Notification.createNext(n));
  }

  protected _fail(f?: F) {
    const tgt = this.tgt;
    tgt.next(Notification.createFail(f));
    tgt.done();
  }

  protected _done(d?: D) {
    const tgt = this.tgt;
    tgt.next(Notification.createDone(d));
    tgt.done(d);
  }
}

export class ObserveOnMessage {
  constructor(
    public notification: qt.Notification<any>,
    public tgt: qt.Target<any>
  ) {}
}

export function observeOn<N, F, D>(
  scheduler: qt.Scheduler,
  delay: number = 0
): qt.MonoOper<N, F, D> {
  return function observeOnLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    return source.lift(new ObserveOnO(scheduler, delay));
  };
}

export class ObserveOnO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private scheduler: qt.Scheduler, private delay: number = 0) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ObserveOnR(subscriber, this.scheduler, this.delay)
    );
  }
}

export class ObserveOnR<N, F, D> extends Subscriber<N, F, D> {
  static dispatch(this: qt.Action<ObserveOnMessage>, arg: ObserveOnMessage) {
    const {notification, tgt} = arg;
    notification.observe(tgt);
    this.unsubscribe();
  }

  constructor(
    tgt: Subscriber<N, F, D>,
    private scheduler: qt.Scheduler,
    private delay = 0
  ) {
    super(tgt);
  }

  private scheduleMessage(n: Notification<any>) {
    const tgt = this.tgt as Subscription;
    tgt.add(
      this.scheduler.schedule(
        ObserveOn.dispatch as any,
        this.delay,
        new ObserveOnMessage(n, this.tgt)
      )
    );
  }

  protected _next(n?: N) {
    this.scheduleMessage(Notification.createNext(n));
  }

  protected _fail(f?: F) {
    this.scheduleMessage(Notification.createFail(f));
    this.unsubscribe();
  }

  protected _done(d?: D) {
    this.scheduleMessage(Notification.createDone(d));
    this.unsubscribe();
  }
}

export function subscribeOn<N, F, D>(
  scheduler: qt.Scheduler,
  delay: number = 0
): qt.MonoOper<N, F, D> {
  return function subscribeOnLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    return source.lift(new SubscribeOnO<N, F, D>(scheduler, delay));
  };
}

class SubscribeOnO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private scheduler: qt.Scheduler, private delay: number) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return new SubscribeOnO<N, F, D>(
      source,
      this.delay,
      this.scheduler
    ).subscribe(subscriber);
  }
}

export function time<N, F, D>(
  timeProvider: Stamper = Date
): Lifter<T, Stamp<N, F, D>> {
  return map((value: N) => ({value, time: timeProvider.now()}));
}

export function timeInterval<N, F, D>(
  scheduler: qt.Scheduler = async
): Lifter<T, TimeInterval<N, F, D>> {
  return (source: qt.Source<N, F, D>) =>
    defer(() => {
      return source.pipe(
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
      new TimeoutWithO(waitFor, absoluteTimeout, withObservable, scheduler)
    );
  };
}

class TimeoutWithO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private waitFor: number,
    private absoluteTimeout: boolean,
    private withObservable: SourceInput<any>,
    private scheduler: qt.Scheduler
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new TimeoutWithR(
        subscriber,
        this.absoluteTimeout,
        this.waitFor,
        this.withObservable,
        this.scheduler
      )
    );
  }
}

export class TimeoutWithR<T, R> extends Reactor<N, M, F, D> {
  private action: qt.Action<TimeoutWith<T, R>> | null = null;

  constructor(
    tgt: Subscriber<N, F, D>,
    private absoluteTimeout: boolean,
    private waitFor: number,
    private withObservable: SourceInput<any>,
    private scheduler: qt.Scheduler
  ) {
    super(tgt);
    this.scheduleTimeout();
  }

  private static dispatchTimeout<T, R>(subscriber: TimeoutWith<T, R>): void {
    const {withObservable} = subscriber;
    (<any>subscriber)._recycle();
    subscriber.add(subscribeToResult(subscriber, withObservable));
  }

  private scheduleTimeout() {
    const {action} = this;
    if (action) {
      this.action = <Action<TimeoutWith<T, R>>>(
        action.schedule(this, this.waitFor)
      );
    } else {
      this.add(
        (this.action = <Action<TimeoutWith<T, R>>>(
          this.scheduler.schedule<TimeoutWith<T, R>>(
            TimeoutWith.dispatchTimeout as any,
            this.waitFor,
            this
          )
        ))
      );
    }
  }

  protected _next(n?: N) {
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
