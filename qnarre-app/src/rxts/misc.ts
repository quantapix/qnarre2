import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';
import * as qh from './scheduler';

interface DelayState<N> {
  source: DelaySubscriber<N>;
  tgt: qt.Target<N>;
  scheduler: qt.Scheduler;
}

class DelayMessage<N> {
  constructor(
    public readonly time: number,
    public readonly notification: qt.Notification<N>
  ) {}
}

export function delay<N>(
  delay: number | Date,
  scheduler: qt.Scheduler = qh.async
): qt.Shifter<N> {
  const absoluteDelay = qu.isDate(delay);
  const delayFor = absoluteDelay ? +delay - scheduler.now() : Math.abs(<number>delay);
  return x => x.lift(new DelayO(delayFor, scheduler));
}

class DelayO<N> implements qt.Operator<N, N> {
  constructor(private delay: number, private scheduler: qt.Scheduler) {}

  call(r: qt.Subscriber<N>, s: any): qt.Closer {
    return s.subscribe(new DelayR(r, this.delay, this.scheduler));
  }
}

export class Delay<N> extends qj.Subscriber<N> {
  private queue: Array<DelayMessage<N>> = [];
  private active = false;
  private errored = false;

  private static dispatch<N>(this: qt.Action<DelayState<N>>, state: DelayState<N>): void {
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
    tgt: qt.Subscriber<N>,
    private delay: number,
    private scheduler: qt.Scheduler
  ) {
    super(tgt);
  }

  private _schedule(s: qt.Scheduler): void {
    this.active = true;
    const tgt = this.tgt as qt.Subscription;
    tgt.add(
      s.schedule<DelayState<N>>(Delay.dispatch as any, this.delay, {
        source: this,
        tgt: this.tgt,
        scheduler: s
      })
    );
  }

  private scheduleNotification(n: qt.Notification<N>): void {
    if (this.errored === true) return;
    const s = this.scheduler;
    const m = new DelayMessage(s.now() + this.delay, n);
    this.queue.push(m);
    if (!this.active) this._schedule(s);
  }

  protected _next(n?: N) {
    this.scheduleNotification(Notification.createNext(n));
  }

  protected _fail(e: any) {
    this.errored = true;
    this.queue = [];
    this.tgt.fail(e);
    this.unsubscribe();
  }

  protected _done() {
    if (this.queue.length === 0) this.tgt.done();
    this.unsubscribe();
  }
}

export function delayWhen<N>(
  delayDurationSelector: (n: N, index: number) => qt.Source<any>,
  subscriptionDelay?: qt.Source<any>
): qt.Shifter<N>;
export function delayWhen<N>(
  delayDurationSelector: (n: N, index: number) => qt.Source<any>,
  subscriptionDelay?: qt.Source<any>
): qt.Shifter<N> {
  if (subscriptionDelay) {
    return x =>
      new SubscriptionDelayObservable(x, subscriptionDelay).lift(
        new DelayWhenO(delayDurationSelector)
      );
  }
  return x => x.lift(new DelayWhenO(delayDurationSelector));
}

class DelayWhenO<N> implements qt.Operator<N, N> {
  constructor(private delayDurationSelector: (n: N, index: number) => qt.Source<any>) {}

  call(r: qt.Subscriber<N>, s: any): qt.Closer {
    return s.subscribe(new DelayWhenR(r, this.delayDurationSelector));
  }
}

export class DelayWhenR<N, M> extends qj.Reactor<N, M> {
  private completed = false;
  private delayNotifierSubscriptions = [] as qt.Subscription[];
  private index = 0;

  constructor(
    tgt: qt.Subscriber<N>,
    private delayDurationSelector: (value: N, index: number) => qt.Source<any>
  ) {
    super(tgt);
  }

  reactNext(
    outerN: N,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: qj.Actor<N, M>
  ) {
    this.tgt.next(outerN);
    this.removeSubscription(innerSub);
    this.tryComplete();
  }

  reactFail(f?: F) {
    this._fail(e);
  }

  reactDone(innerSub: qj.Actor<N, M>) {
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

  protected _done() {
    this.completed = true;
    this.tryComplete();
    this.unsubscribe();
  }

  private removeSubscription(s: qj.Actor<N, M>): NavigationEvent {
    s.unsubscribe();
    const i = this.delayNotifierSubscriptions.indexOf(s);
    if (i !== -1) this.delayNotifierSubscriptions.splice(i, 1);
    return s.outerN;
  }

  private tryDelay(delayNotifier: qt.Source<any>, value: N) {
    const s = qu.subscribeToResult(this, delayNotifier, value);
    if (s && !s.closed) {
      const tgt = this.tgt as qt.Subscription;
      tgt.add(s);
      this.delayNotifierSubscriptions.push(s);
    }
  }

  private tryComplete() {
    if (this.completed && this.delayNotifierSubscriptions.length === 0) this.tgt.done();
  }
}

class SubscriptionDelayObservable<N> extends qs.Source<N> {
  constructor(public source: qt.Source<N>, private subscriptionDelay: qt.Source<any>) {
    super();
  }

  _subscribe(subscriber: qt.Subscriber<N>) {
    this.subscriptionDelay.subscribe(new SubscriptionDelayR(r, this.source));
  }
}

export class SubscriptionDelayR<N> extends qj.Subscriber<N> {
  private sourceSubscribed = false;

  constructor(private parent: qt.Subscriber<N>, private source: qt.Source<N>) {
    super();
  }

  protected _next(_n?: N) {
    this.subscribeToSource();
  }

  protected _fail(e: any) {
    this.unsubscribe();
    this.parent.fail(e);
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

export function dematerialize<N>(): qt.Lifter<Notification<N>, T> {
  return x => x.lift(new DeMaterializeO());
}

class DeMaterializeO<T extends Notification<any>, R> implements qt.Operator<T, R> {
  call(r: qt.Subscriber<any>, s: any): any {
    return s.subscribe(new DeMaterializeR(r));
  }
}

export class DeMaterializeR<N extends qt.Notification<any>, F, D> extends qj.Subscriber<
  N
> {
  constructor(tgt: qt.Subscriber<any>) {
    super(tgt);
  }

  protected _next(n?: N) {
    n?.observe(this.tgt);
  }
}

export function materialize<N>(): qt.Lifter<T, Notification<N>> {
  return x => x.lift(new MaterializeO());
}

class MaterializeO<N> implements qt.Operator<T, Notification<N>> {
  call(r: qt.Subscriber<Notification<N>>, s: any): any {
    return s.subscribe(new MaterializeR(r));
  }
}

export class MaterializeR<N> extends qt.Subscriber<N> {
  constructor(tgt: qt.Subscriber<Notification<N>>) {
    super(tgt);
  }

  protected _next(n?: N) {
    this.tgt.next(Notification.createNext(n));
  }

  protected _fail(e: any) {
    const tgt = this.tgt;
    tgt.next(Notification.createFail(f));
    tgt.done();
  }

  protected _done() {
    const tgt = this.tgt;
    tgt.next(Notification.createDone(d));
    tgt.done();
  }
}

export class ObserveOnMessage {
  constructor(public notification: qt.Notification<any>, public tgt: qt.Target<any>) {}
}

export function observeOn<N>(scheduler: qt.Scheduler, delay: number = 0): qt.Shifter<N> {
  return function observeOnLifter(source: qt.Source<N>): qt.Source<N> {
    return x.lift(new ObserveOnO(scheduler, delay));
  };
}

export class ObserveOnO<N> implements qt.Operator<N, N> {
  constructor(private scheduler: qt.Scheduler, private delay: number = 0) {}

  call(r: qt.Subscriber<N>, s: any): qt.Closer {
    return s.subscribe(new ObserveOnR(r, this.scheduler, this.delay));
  }
}

export class ObserveOnR<N> extends qj.Subscriber<N> {
  static dispatch(this: qt.Action<ObserveOnMessage>, arg: ObserveOnMessage) {
    const {notification, tgt} = arg;
    notification.observe(tgt);
    this.unsubscribe();
  }

  constructor(tgt: qt.Subscriber<N>, private scheduler: qt.Scheduler, private delay = 0) {
    super(tgt);
  }

  private scheduleMessage(n: Notification<any>) {
    const tgt = this.tgt as qt.Subscription;
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

  protected _fail(e: any) {
    this.scheduleMessage(Notification.createFail(f));
    this.unsubscribe();
  }

  protected _done() {
    this.scheduleMessage(Notification.createDone(d));
    this.unsubscribe();
  }
}

export function subscribeOn<N>(
  scheduler: qt.Scheduler,
  delay: number = 0
): qt.Shifter<N> {
  return function subscribeOnLifter(source: qt.Source<N>): qt.Source<N> {
    return x.lift(new SubscribeOnO<N>(scheduler, delay));
  };
}

class SubscribeOnO<N> implements qt.Operator<N, N> {
  constructor(private scheduler: qt.Scheduler, private delay: number) {}
  call(r: qt.Subscriber<N>, s: any): qt.Closer {
    return new SubscribeOnO<N>(s, this.delay, this.scheduler).subscribe(r);
  }
}

export function tap<N>(
  next?: qt.Fun<N>,
  fail?: qt.Fun<any>,
  done?: qt.Fun<void>
): qt.Shifter<N>;
export function tap<N>(observer: qt.Target<N>): qt.Shifter<N>;
export function tap<N>(
  nextOrObserver?: qt.Target<N> | qt.Fun<N>,
  fail?: qt.Fun<any>,
  done?: qt.Fun<void>
): qt.Shifter<N> {
  return function tapLifter(source: qt.Source<N>): qt.Source<N> {
    return x.lift(new TapO(nextOrObserver, error, complete));
  };
}

class TapO<N> implements qt.Operator<N, N> {
  constructor(
    private nextOrObserver?: qt.Target<N> | qt.Fun<N>,
    private fail?: qt.Fun<any>,
    private done?: qt.Fun<void>
  ) {}
  call(r: qt.Subscriber<N>, s: any): qt.Closer {
    return s.subscribe(new TapR(r, this.nextOrObserver, this.error, this.complete));
  }
}

export class TapR<N> extends qt.Subscriber<N> {
  private _context: any;
  private _tapNext: (value: N) => void = noop;
  private _tapError: (err: any) => void = noop;
  private _tapComplete: qt.Fun<void> = noop;

  constructor(
    tgt: qt.Subscriber<N>,
    observerOrNext?: qt.Target<N> | ((value: N) => void),
    fail?: (e?: any) => void,
    done?: qt.Fun<void>
  ) {
    super(tgt);
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

  _next(n?: N) {
    try {
      this._tapNext.call(this._context, n);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.next(n);
  }

  _fail(e: any) {
    try {
      this._tapError.call(this._context, f);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.fail(e);
  }

  _done() {
    try {
      this._tapComplete.call(this._context);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    return this.tgt.done();
  }
}

export function time<N>(timeProvider: Stamper = Date): qt.Lifter<T, Stamp<N>> {
  return map((value: N) => ({value, time: timeProvider.now()}));
}

export function timeInterval<N>(
  scheduler: qt.Scheduler = qh.async
): qt.Lifter<T, TimeInterval<N>> {
  return x =>
    defer(() => {
      return x.pipe(
        scan(
          ({current}, value) => ({
            value,
            current: scheduler.now(),
            last: current
          }),
          {current: scheduler.now(), value: undefined, last: undefined} as any
        ) as qt.Lifter<T, any>,
        map<any, TimeInterval<N>>(
          ({current, last, value}) => new TimeInterval(value, current - last)
        )
      );
    });
}

export class TimeInterval<N> {
  constructor(public n: N, public interval: number) {}
}

export function timeout<N>(
  due: number | Date,
  scheduler: qt.Scheduler = qh.async
): qt.Shifter<N> {
  return timeoutWith(due, throwError(new TimeoutError()), scheduler);
}

export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: qt.Input<R>,
  scheduler?: qt.Scheduler
): qt.Lifter<T, T | R>;
export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: qt.Input<R>,
  scheduler: qt.Scheduler = qh.async
): qt.Lifter<T, T | R> {
  return x => {
    let absoluteTimeout = isDate(due);
    let waitFor = absoluteTimeout ? +due - scheduler.now() : Math.abs(<number>due);
    return x.lift(new TimeoutWithO(waitFor, absoluteTimeout, withObservable, scheduler));
  };
}

class TimeoutWithO<N> implements qt.Operator<N, N> {
  constructor(
    private waitFor: number,
    private absoluteTimeout: boolean,
    private withObservable: qt.Input<any>,
    private scheduler: qt.Scheduler
  ) {}

  call(r: qt.Subscriber<N>, s: any): qt.Closer {
    return s.subscribe(
      new TimeoutWithR(
        r,
        this.absoluteTimeout,
        this.waitFor,
        this.withObservable,
        this.scheduler
      )
    );
  }
}

export class TimeoutWithR<T, R> extends qj.Reactor<N, M> {
  private action: qt.Action<TimeoutWith<T, R>> = null;

  constructor(
    tgt: qt.Subscriber<N>,
    private absoluteTimeout: boolean,
    private waitFor: number,
    private withObservable: qt.Input<any>,
    private scheduler: qt.Scheduler
  ) {
    super(tgt);
    this.scheduleTimeout();
  }

  private static dispatchTimeout<T, R>(subscriber: TimeoutWith<T, R>): void {
    const {withObservable} = subscriber;
    (<any>subscriber)._recycle();
    subscriber.add(subscribeToResult(r, withObservable));
  }

  private scheduleTimeout() {
    const {action} = this;
    if (action) {
      this.action = <Action<TimeoutWith<T, R>>>action.schedule(this, this.waitFor);
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
    if (!this.absoluteTimeout) this.scheduleTimeout();
    super._next(n);
  }

  _unsubscribe() {
    this.action = null;
    this.scheduler = null!;
    this.withObservable = null!;
  }
}

function toArrayReducer<N>(arr: T[], item: T, index: number): T[] {
  if (index === 0) return [item];
  arr.push(item);
  return arr;
}

export function toArray<N>(): qt.Lifter<N, N[]> {
  return reduce(toArrayReducer, [] as T[]);
}

export function using<T>(
  resourceFactory: () => qt.Unsubscriber | void,
  observableFactory: (resource: qt.Unsubscriber | void) => qt.Input<T> | void
): qs.Source<T> {
  return new qs.Source<T>(subscriber => {
    let resource: qt.Unsubscriber | void;
    try {
      resource = resourceFactory();
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }
    let result: qt.Input<T> | void;
    try {
      result = observableFactory(resource);
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }
    const source = result ? from(result) : EMPTY;
    const subscription = source.subscribe(r);
    return () => {
      subscription.unsubscribe();
      if (resource) {
        resource.unsubscribe();
      }
    };
  });
}
