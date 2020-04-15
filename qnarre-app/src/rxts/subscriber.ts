import * as qt from './types';
import * as qu from './utils';

import {Actor, Reactor, RSubject, Subscription, Subscriber} from './subject';

export {Actor, Reactor, RSubject as Subject};

export class Audit<N, R, F, D> extends Reactor<N, R, F, D> {
  private r?: R;
  private hasR = false;
  private act?: qt.Subscription;

  constructor(
    tgt: Subscriber<R, F, D>,
    private duration: (_?: R) => qt.SourceOrPromise<N, F, D>
  ) {
    super(tgt);
  }

  protected _next(r?: R) {
    this.r = r;
    this.hasR = true;
    if (!this.act) {
      let d: qt.SourceOrPromise<N, F, D>;
      try {
        d = this.duration(r);
      } catch (e) {
        return this.tgt.fail(e);
      }
      const a = qu.subscribeToResult(this, d);
      if (!a || a.closed) this.clear();
      else this.add((this.act = a));
    }
  }

  clear() {
    const {r, hasR, act} = this;
    if (act) {
      this.remove(act);
      this.act = undefined;
      act.unsubscribe();
    }
    if (hasR) {
      this.r = undefined;
      this.hasR = false;
      this.tgt.next(r);
    }
  }

  reactNext() {
    this.clear();
  }

  reactDone() {
    this.clear();
  }
}

export class Buffer<N, F, D> extends Reactor<any, N, F, D> {
  private buf?: (N | undefined)[];

  constructor(
    public tgt2: Subscriber<(N | undefined)[], F, D>,
    act: qt.Source<any, F, D>
  ) {
    super();
    this.add(qu.subscribeToResult(this, act));
  }

  protected _next(n?: N) {
    if (!this.buf) this.buf = [];
    this.buf.push(n);
  }

  reactNext() {
    const b = this.buf;
    this.buf = undefined;
    this.tgt2.next(b);
  }
}

export class BufferCount<N, F, D> extends Subscriber<N[], F, D> {
  private buf?: (N[] | undefined)[];

  constructor(tgt: Subscriber<N[], F, D>, private size: number) {
    super(tgt);
  }

  protected _next(n?: N[]) {
    const buffer = this.buf;
    buffer.push(n);
    if (buffer.length == this.size) {
      this.tgt.next(buf);
      this.buf = [];
    }
  }

  protected _done(d?: D) {
    if (this.buf?.length) this.tgt.next(this.buf);
    super._done(d);
  }
}

export class BufferSkipCount<N, F, D> extends Subscriber<N, F, D> {
  private buffers: Array<T[]> = [];
  private count = 0;

  constructor(
    tgt: Subscriber<N[], F, D>,
    private bufferSize: number,
    private startBufferEvery: number
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    const {bufferSize, startBufferEvery, buffers, count} = this;

    this.count++;
    if (count % startBufferEvery === 0) {
      buffers.push([]);
    }

    for (let i = buffers.length; i--; ) {
      const buffer = buffers[i];
      buffer.push(value);
      if (buffer.length === bufferSize) {
        buffers.splice(i, 1);
        this.tgt.next(buffer);
      }
    }
  }

  protected _done(d?: D) {
    const {buffers, tgt} = this;

    while (buffers.length > 0) {
      let buffer = buffers.shift()!;
      if (buffer.length > 0) {
        tgt.next(buffer);
      }
    }
    super._done();
  }
}

class Context<N> {
  buffer = [] as N[];
  closeAction?: qt.Subscription;
}

interface DispatchCreateArg<N, F, D> {
  bufferTimeSpan: number;
  bufferCreationInterval: number | null;
  subscriber: BufferTime<N, F, D>;
  scheduler: qt.SchedulerLike;
}

interface DispatchCloseArg<N, F, D> {
  subscriber: BufferTime<N, F, D>;
  context: Context<N>;
}

export class BufferTime<N, F, D> extends Subscriber<N, F, D> {
  private contexts: Array<Context<N>> = [];
  private timespanOnly: boolean;

  constructor(
    tgt: Subscriber<N[], F, D>,
    private bufferTimeSpan: number,
    private bufferCreationInterval: number | null,
    private maxBufferSize: number,
    private scheduler: qt.SchedulerLike
  ) {
    super(tgt);
    const context = this.openContext();
    this.timespanOnly =
      bufferCreationInterval == null || bufferCreationInterval < 0;
    if (this.timespanOnly) {
      const timeSpanOnlyState = {subscriber: this, context, bufferTimeSpan};
      this.add(
        (context.closeAction = scheduler.schedule(
          dispatchBufferTimeSpanOnly,
          bufferTimeSpan,
          timeSpanOnlyState
        ))
      );
    } else {
      const closeState = {subscriber: this, context};
      const creationState: DispatchCreateArg<N, F, D> = {
        bufferTimeSpan,
        bufferCreationInterval,
        subscriber: this,
        scheduler
      };
      this.add(
        (context.closeAction = scheduler.schedule<DispatchCloseArg<N, F, D>>(
          dispatchBufferClose as any,
          bufferTimeSpan,
          closeState
        ))
      );
      this.add(
        scheduler.schedule<DispatchCreateArg<N, F, D>>(
          dispatchBufferCreation as any,
          bufferCreationInterval!,
          creationState
        )
      );
    }
  }

  protected _next(n?: N) {
    const contexts = this.contexts;
    const len = contexts.length;
    let filledBufferContext: Context<N> | undefined;
    for (let i = 0; i < len; i++) {
      const context = contexts[i];
      const buffer = context.buffer;
      buffer.push(value);
      if (buffer.length == this.maxBufferSize) filledBufferContext = context;
    }
    if (filledBufferContext) this.onBufferFull(filledBufferContext);
  }

  protected _fail(f?: F) {
    this.contexts.length = 0;
    super._fail(err);
  }

  protected _done(d?: D) {
    const {contexts, tgt} = this;
    while (contexts.length > 0) {
      const context = contexts.shift()!;
      tgt.next(context.buffer);
    }
    super._done();
  }

  _unsubscribe() {
    this.contexts = null!;
  }

  protected onBufferFull(context: Context<N>) {
    this.closeContext(context);
    const closeAction = context.closeAction;
    closeAction!.unsubscribe();
    this.remove(closeAction!);

    if (!this.closed && this.timespanOnly) {
      context = this.openContext();
      const bufferTimeSpan = this.bufferTimeSpan;
      const timeSpanOnlyState = {subscriber: this, context, bufferTimeSpan};
      this.add(
        (context.closeAction = this.scheduler.schedule(
          dispatchBufferTimeSpanOnly,
          bufferTimeSpan,
          timeSpanOnlyState
        ))
      );
    }
  }

  openContext(): Context<N> {
    const context = new Context<N>();
    this.contexts.push(context);
    return context;
  }

  closeContext(context: Context<N>) {
    this.tgt.next(context.buffer);
    const contexts = this.contexts;
    const spliceIndex = contexts ? contexts.indexOf(context) : -1;
    if (spliceIndex >= 0) contexts.splice(contexts.indexOf(context), 1);
  }
}

function dispatchBufferTimeSpanOnly(this: qt.SchedulerAction<any>, state: any) {
  const subscriber: BufferTime<any> = state.subscriber;
  const prevContext = state.context;
  if (prevContext) subscriber.closeContext(prevContext);
  if (!subscriber.closed) {
    state.context = subscriber.openContext();
    state.context.closeAction = this.schedule(state, state.bufferTimeSpan);
  }
}

function dispatchBufferCreation<N, F, D>(
  this: qt.SchedulerAction<DispatchCreateArg<N, F, D>>,
  state: DispatchCreateArg<N, F, D>
) {
  const {bufferCreationInterval, bufferTimeSpan, subscriber, scheduler} = state;
  const context = subscriber.openContext();
  const action = <SchedulerAction<DispatchCreateArg<N, F, D>>>this;
  if (!subscriber.closed) {
    subscriber.add(
      (context.closeAction = scheduler.schedule<DispatchCloseArg<N, F, D>>(
        dispatchBufferClose as any,
        bufferTimeSpan,
        {subscriber, context}
      ))
    );
    action.schedule(state, bufferCreationInterval!);
  }
}

function dispatchBufferClose<N, F, D>(arg: DispatchCloseArg<N, F, D>) {
  const {subscriber, context} = arg;
  subscriber.closeContext(context);
}

interface BufferContext<N> {
  buffer?: N[];
  subscription?: Subscription;
}

export class BufferToggle<O, I, F, D> extends Reactor<N[], M, F, D> {
  private contexts = [] as BufferContext<N>[];

  constructor(
    tgt: Subscriber<N[], F, D>,
    private openings: qt.SourceOrPromise<M, F, D>,
    private closingSelector: (value: M) => qt.SourceOrPromise<any, F, D> | void
  ) {
    super(tgt);
    this.add(subscribeToResult(this, openings));
  }

  protected _next(n?: N[]) {
    const contexts = this.contexts;
    const len = contexts.length;
    for (let i = 0; i < len; i++) {
      contexts[i].buffer?.push(n);
    }
  }

  protected _fail(f?: F) {
    const contexts = this.contexts;
    while (contexts.length > 0) {
      const context = contexts.shift()!;
      context.subscription?.unsubscribe();
      context.buffer = undefined;
      context.subscription = undefined;
    }
    this.contexts = null!;
    super._fail(f);
  }

  protected _done(d?: D) {
    const contexts = this.contexts;
    while (contexts.length > 0) {
      const context = contexts.shift()!;
      this.tgt.next(context.buffer);
      context.subscription?.unsubscribe();
      context.buffer = undefined;
      context.subscription = undefined;
    }
    this.contexts = null!;
    super._done();
  }

  reactNext(
    outerN: any,
    innerValue: O,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<O, I, F, D>
  ) {
    outerN ? this.closeBuffer(outerN) : this.openBuffer(innerValue);
  }

  reactDone(innerSub: Actor<O, I, F, D>) {
    this.closeBuffer((<any>innerSub).context);
  }

  private openBuffer(value: N) {
    try {
      const closingSelector = this.closingSelector;
      const closingNotifier = closingSelector.call(this, value);
      if (closingNotifier) this.trySubscribe(closingNotifier);
    } catch (err) {
      this._fail(err);
    }
  }

  private closeBuffer(context: BufferContext<N>) {
    const contexts = this.contexts;
    if (contexts && context) {
      const {buffer, subscription} = context;
      this.tgt.next(buffer);
      contexts.splice(contexts.indexOf(context), 1);
      this.remove(subscription);
      subscription.unsubscribe();
    }
  }

  private trySubscribe(closingNotifier: any) {
    const contexts = this.contexts;
    const buffer: Array<N> = [];
    const subscription = new Subscription();
    const context = {buffer, subscription};
    contexts.push(context);
    const s = qu.subscribeToResult(this, closingNotifier, <any>context);
    if (!s || s.closed) this.closeBuffer(context);
    else {
      (<any>s).context = context;
      this.add(s);
      subscription.add(s);
    }
  }
}

export class BufferWhen<N, F, D> extends Reactor<N, any, F, D> {
  private buffer?: N[];
  private subscribing = false;
  private closingSubscription?: Subscription;

  constructor(
    tgt: Subscriber<N, F, D>,
    private closingSelector: () => qt.Source<any, F, D>
  ) {
    super(tgt);
    this.openBuffer();
  }

  protected _next(n?: N) {
    this.buffer!.push(value);
  }

  protected _done(d?: D) {
    const buffer = this.buffer;
    if (buffer) this.tgt.next(buffer);
    super._done();
  }

  _unsubscribe() {
    this.buffer = null!;
    this.subscribing = false;
  }

  reactNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, any, F, D>
  ): void {
    this.openBuffer();
  }

  reactDone(): void {
    if (this.subscribing) this.done();
    else this.openBuffer();
  }

  openBuffer() {
    let {closingSubscription} = this;
    if (closingSubscription) {
      this.remove(closingSubscription);
      closingSubscription.unsubscribe();
    }
    const buffer = this.buffer;
    if (this.buffer) this.tgt.next(buffer);
    this.buffer = [];
    let closingNotifier;
    try {
      const {closingSelector} = this;
      closingNotifier = closingSelector();
    } catch (e) {
      return this.fail(e);
    }
    closingSubscription = new Subscription();
    this.closingSubscription = closingSubscription;
    this.add(closingSubscription);
    this.subscribing = true;
    closingSubscription.add(subscribeToResult(this, closingNotifier));
    this.subscribing = false;
  }
}

export class Catch<O, I, F, D> extends Reactor<N, N | M, F, D> {
  constructor(
    tgt: Subscriber<any, F, D>,
    private selector: (
      err: any,
      caught: qt.Source<N, F, D>
    ) => qt.ObservableInput<N | M, F, D>,
    private caught: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  fail(f?: F) {
    if (!this.stopped) {
      let result: any;
      try {
        result = this.selector(f, this.caught);
      } catch (f2) {
        super.fail(f2);
        return;
      }
      this._recycle();
      const i = new Actor(this, undefined, undefined!);
      this.add(i);
      const s = qu.subscribeToResult(this, result, undefined, undefined, i);
      if (s !== i) this.add(s);
    }
  }
}

export class Count<N, F, D> extends Subscriber<N, F, D> {
  private count = 0;
  private index = 0;

  constructor(
    tgt: qt.Observer<number, F, D>,
    private predicate:
      | ((value: N, index: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (this.predicate) this._tryPredicate(v);
    else this.count++;
  }

  private _tryPredicate(value: N) {
    let result: any;
    try {
      result = this.predicate!(value, this.index++, this.source);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    if (result) this.count++;
  }

  protected _done(d?: D) {
    this.tgt.next(this.count);
    this.tgt.done();
  }
}

export class Debounce<O, I, F, D> extends Reactor<O, I, F, D> {
  private value?: N;
  private hasValue = false;
  private durationSubscription?: Subscription;

  constructor(
    tgt: Subscriber<M, F, D>,
    private durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    try {
      const result = this.durationSelector.call(this, n);
      if (result) this._tryNext(value, result);
    } catch (e) {
      this.tgt.fail(e);
    }
  }

  protected _done(d?: D) {
    this.emitValue();
    this.tgt.done();
  }

  private _tryNext(value: N, duration: qt.SourceOrPromise<any, F, D>) {
    let s = this.durationSubscription;
    this.value = value;
    this.hasValue = true;
    if (s) {
      s.unsubscribe();
      this.remove(s);
    }
    s = qu.subscribeToResult(this, duration);
    if (s && !s.closed) this.add((this.durationSubscription = s));
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<O, I, F, D>
  ) {
    this.emitValue();
  }

  reactDone() {
    this.emitValue();
  }

  emitValue() {
    if (this.hasValue) {
      const value = this.value;
      const s = this.durationSubscription;
      if (s) {
        this.durationSubscription = undefined;
        s.unsubscribe();
        this.remove(s);
      }
      this.value = undefined;
      this.hasValue = false;
      super._next(value!);
    }
  }
}

export class DebounceTime<N, F, D> extends Subscriber<N, F, D> {
  private debouncedSubscription?: Subscription;
  private lastValue?: N;
  private hasValue = false;

  constructor(
    tgt: Subscriber<N, F, D>,
    private dueTime: number,
    private scheduler: qt.SchedulerLike
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    this.clearDebounce();
    this.lastValue = value;
    this.hasValue = true;
    this.add(
      (this.debouncedSubscription = this.scheduler.schedule(
        dispatchNext as any,
        this.dueTime,
        this
      ))
    );
  }

  protected _done(d?: D) {
    this.debouncedNext();
    this.tgt.done();
  }

  debouncedNext(): void {
    this.clearDebounce();
    if (this.hasValue) {
      const {lastValue} = this;
      this.lastValue = undefined;
      this.hasValue = false;
      this.tgt.next(lastValue);
    }
  }

  private clearDebounce(): void {
    const s = this.debouncedSubscription;
    if (s) {
      this.remove(s);
      s.unsubscribe();
      this.debouncedSubscription = undefined;
    }
  }
}

export class DefaultIfEmpty<N, M, F, D> extends Subscriber<N, F, D> {
  private isEmpty = true;

  constructor(tgt: Subscriber<N | M, F, D>, private defaultValue: M) {
    super(tgt);
  }

  protected _next(n?: N | M) {
    this.isEmpty = false;
    this.tgt.next(n);
  }

  protected _done(d?: D) {
    if (this.isEmpty) this.tgt.next(this.defaultValue);
    this.tgt.done();
  }
}

interface DelayState<N, F, D> {
  source: DelaySubscriber<N, F, D>;
  tgt: qt.Target<N, F, D>;
  scheduler: qt.SchedulerLike;
}

class DelayMessage<N, F, D> {
  constructor(
    public readonly time: number,
    public readonly notification: qt.Notification<N, F, D>
  ) {}
}

export class Delay<N, F, D> extends Subscriber<N, F, D> {
  private queue: Array<DelayMessage<N, F, D>> = [];
  private active = false;
  private errored = false;

  private static dispatch<N, F, D>(
    this: qt.SchedulerAction<DelayState<N, F, D>>,
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
    private scheduler: qt.SchedulerLike
  ) {
    super(tgt);
  }

  private _schedule(s: qt.SchedulerLike): void {
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

export class DelayWhen<N, M, F, D> extends Reactor<N, M, F, D> {
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

export class SubscriptionDelay<N, F, D> extends Subscriber<N, F, D> {
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

export class DeMaterialize<
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

export class Distinct<N, M, F, D> extends Reactor<N, N, F, D> {
  private values = new Set<M>();

  constructor(
    tgt: Subscriber<N, F, D>,
    private keySelector?: (value: N) => K,
    flushes?: qt.Source<any, F, D>
  ) {
    super(tgt);
    if (flushes) this.add(subscribeToResult(this, flushes));
  }

  reactNext(
    outerN: N,
    innerValue: N,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, N, F, D>
  ) {
    this.values.clear();
  }

  reactFail(f: F | undefined, _: Actor<N, N, F, D>) {
    this._fail(f);
  }

  protected _next(n?: N) {
    if (this.keySelector) this._useKeySelector(n);
    else this._finalizeNext(n, n);
  }

  private _useKeySelector(value: N) {
    let key: M;
    const {tgt} = this;
    try {
      key = this.keySelector!(value);
    } catch (e) {
      tgt.fail(e);
      return;
    }
    this._finalizeNext(key, value);
  }

  private _finalizeNext(key: N | M, value: N) {
    const {values} = this;
    if (!values.has(<M>key)) {
      values.add(<M>key);
      this.tgt.next(value);
    }
  }
}

export class DistinctUntilChanged<T, K> extends Subscriber<N, F, D> {
  private key: K | undefined;
  private hasKey = false;

  constructor(
    tgt: Subscriber<N, F, D>,
    compare?: (x: K, y: K) => boolean,
    private keySelector?: (x: N) => K
  ) {
    super(tgt);
    if (typeof compare === 'function') this.compare = compare;
  }

  private compare(x: any, y: any) {
    return x === y;
  }

  protected _next(n?: N) {
    let key: any;
    try {
      const {keySelector} = this;
      key = keySelector ? keySelector(value) : value;
    } catch (e) {
      return this.tgt.fail(e);
    }
    let result = false;
    if (this.hasKey) {
      try {
        const {compare} = this;
        result = compare(this.key, key);
      } catch (e) {
        return this.tgt.fail(e);
      }
    } else this.hasKey = true;
    if (!result) {
      this.key = key;
      this.tgt.next(value);
    }
  }
}

export class Every<N, F, D> extends Subscriber<N, F, D> {
  private index = 0;

  constructor(
    tgt: qt.Observer<boolean, F, D>,
    private predicate: (
      value: N,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private thisArg: any,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
    this.thisArg = thisArg || this;
  }

  private reactDone(everyValueMatch: boolean) {
    this.tgt.next(everyValueMatch);
    this.tgt.done();
  }

  protected _next(n?: N) {
    let result = false;
    try {
      result = this.predicate.call(this.thisArg, n, this.index++, this.source);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    if (!result) this.reactDone(false);
  }

  protected _done(d?: D) {
    this.reactDone(true);
  }
}

export class SwitchFirst<N, F, D> extends Reactor<N, N, F, D> {
  private hasCompleted = false;
  private hasSubscription = false;

  constructor(tgt: Subscriber<N, F, D>) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (!this.hasSubscription) {
      this.hasSubscription = true;
      this.add(subscribeToResult(this, n));
    }
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (!this.hasSubscription) this.tgt.done();
  }

  reactDone(innerSub: Subscription) {
    this.remove(innerSub);
    this.hasSubscription = false;
    if (this.hasCompleted) this.tgt.done();
  }
}

export class ExhaustMap<N, M, F, D> extends Reactor<N, M, F, D> {
  private hasSubscription = false;
  private hasCompleted = false;
  private index = 0;

  constructor(
    tgt: Subscriber<M, F, D>,
    private project: (value: T, index: number) => qt.ObservableInput<R>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (!this.hasSubscription) this.tryNext(n);
  }

  private tryNext(value: N) {
    let result: ObservableInput<R>;
    const index = this.index++;
    try {
      result = this.project(value, index);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.hasSubscription = true;
    this._innerSub(result, value, index);
  }

  private _innerSub(result: ObservableInput<R>, value: T, index: number): void {
    const innerSubscriber = new Actor(this, value, index);
    const tgt = this.tgt as Subscription;
    tgt.add(innerSubscriber);
    const s = qu.subscribeToResult<T, R>(
      this,
      result,
      undefined,
      undefined,
      innerSubscriber
    );
    if (s !== innerSubscriber) tgt.add(s);
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (!this.hasSubscription) this.tgt.done(d);
    this.unsubscribe();
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actorr<N, M, F, D>
  ): void {
    this.tgt.next(innerValue);
  }

  reactFail(f?: F) {
    this.tgt.fail(f);
  }

  reactDone(innerSub: Subscription) {
    const tgt = this.tgt as Subscription;
    tgt.remove(innerSub);
    this.hasSubscription = false;
    if (this.hasCompleted) this.tgt.done();
  }
}

interface DispatchArg<T, R> {
  subscriber: Expand<T, R>;
  result: qt.ObservableInput<R>;
  value: any;
  index: number;
}

export class Expand<N, M, F, D> extends Reactor<N, M, F, D> {
  private index = 0;
  private active = 0;
  private hasCompleted = false;
  private buffer?: any[];

  constructor(
    tgt: Subscriber<M, F, D>,
    private project: (value: T, index: number) => ObservableInput<R>,
    private concurrent: number,
    private scheduler?: qt.SchedulerLike
  ) {
    super(tgt);
    if (concurrent < Number.POSITIVE_INFINITY) this.buffer = [];
  }

  private static dispatch<N, M>(arg: DispatchArg<N, M>) {
    const {subscriber, result, value, index} = arg;
    subscriber.subscribeToProjection(result, value, index);
  }

  protected _next(n?: N) {
    const tgt = this.tgt;
    if (tgt.closed) {
      this._done();
      return;
    }
    const index = this.index++;
    if (this.active < this.concurrent) {
      tgt.next(n);
      try {
        const {project} = this;
        const result = project(n, index);
        if (!this.scheduler) {
          this.subscribeToProjection(result, n, index);
        } else {
          const state: DispatchArg<N, M> = {
            subscriber: this,
            result,
            n,
            index
          };
          const tgt = this.tgt as Subscription;
          tgt.add(
            this.scheduler.schedule<DispatchArg<N, M>>(
              Expand.dispatch as any,
              0,
              state
            )
          );
        }
      } catch (e) {
        tgt.fail(e);
      }
    } else this.buffer!.push(n);
  }

  private subscribeToProjection(result: any, value: N, index: number) {
    this.active++;
    const tgt = this.tgt as Subscription;
    tgt.add(subscribeToResult<T, R>(this, result, value, index));
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (this.hasCompleted && this.active === 0) this.tgt.done(d);

    this.unsubscribe();
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ) {
    this._next(innerValue);
  }

  reactDone(innerSub: Subscription) {
    const buffer = this.buffer;
    const tgt = this.tgt as Subscription;
    tgt.remove(innerSub);
    this.active--;
    if (buffer && buffer.length > 0) this._next(buffer.shift());
    if (this.hasCompleted && this.active === 0) this.tgt.done();
  }
}

export class Filter<N, F, D> extends Subscriber<N, F, D> {
  count = 0;

  constructor(
    tgt: Subscriber<N, F, D>,
    private predicate: (value: N, index: number) => boolean,
    private thisArg: any
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    let result: any;
    try {
      result = this.predicate.call(this.thisArg, n, this.count++);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    if (result) this.tgt.next(n);
  }
}

export class FindValue<N, F, D> extends Subscriber<N, F, D> {
  private index = 0;

  constructor(
    tgt: Subscriber<N, F, D>,
    private predicate: (
      value: N,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private source: qt.Source<N, F, D>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {
    super(tgt);
  }

  private reactDone(d?: D) {
    const tgt = this.tgt;
    tgt.next(d);
    tgt.done(d);
    this.unsubscribe();
  }

  protected _next(n?: N) {
    const {predicate, thisArg} = this;
    const index = this.index++;
    try {
      const result = predicate.call(thisArg || this, n, index, this.source);
      if (result) this.reactDone(this.yieldIndex ? index : n);
    } catch (e) {
      this.tgt.fail(e);
    }
  }

  protected _done(d?: D) {
    this.reactDone(this.yieldIndex ? -1 : undefined);
  }
}

export class GroupBy<N, K, M, F, D> extends Subscriber<N, F, D>
  implements qt.RefCountSubscription {
  private groups?: Map<K, Subject<N | M>>;
  public attempted = false;
  public count = 0;

  constructor(
    tgt: Subscriber<GroupedObservable<K, R>>,
    private keySelector: (value: N) => K,
    private elementSelector?: ((value: N) => R) | void,
    private durationSelector?: (
      grouped: GroupedObservable<K, R>
    ) => qt.Source<any, F, D>,
    private subjectSelector?: () => Subject<R>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    let key: K;
    try {
      key = this.keySelector(n);
    } catch (e) {
      this.fail(e);
      return;
    }
    this._group(n, key);
  }

  private _group(value: T, key: K) {
    let groups = this.groups;
    if (!groups) groups = this.groups = new Map<K, Subject<T | R>>();
    let group = groups.get(key);
    let element: R;
    if (this.elementSelector) {
      try {
        element = this.elementSelector(value);
      } catch (e) {
        this.fail(e);
      }
    } else element = value as any;
    if (!group) {
      group = (this.subjectSelector
        ? this.subjectSelector()
        : new Subject<R>()) as Subject<T | R>;
      groups.set(key, group);
      const groupedObservable = new GroupedObservable(key, group, this);
      this.tgt.next(groupedObservable);
      if (this.durationSelector) {
        let duration: any;
        try {
          duration = this.durationSelector(
            new GroupedObservable<K, R>(key, <Subject<R>>group)
          );
        } catch (e) {
          this.fail(e);
          return;
        }
        this.add(duration.subscribe(new GroupDuration(key, group, this)));
      }
    }
    if (!group.closed) group.next(element!);
  }

  protected _fail(f?: F) {
    const groups = this.groups;
    if (groups) {
      groups.forEach((group, key) => group.error(f));
      groups.clear();
    }
    this.tgt.fail(f);
  }

  protected _done(d?: D) {
    const groups = this.groups;
    if (groups) {
      groups.forEach(group => group.complete());
      groups.clear();
    }
    this.tgt.done(d);
  }

  removeGroup(key: K) {
    this.groups!.delete(key);
  }

  unsubscribe() {
    if (!this.closed) {
      this.attemptedToUnsubscribe = true;
      if (!this.count) super.unsubscribe();
    }
  }
}

export class GroupDuration<K, N, F, D> extends Subscriber<N, F, D> {
  constructor(
    private key: K,
    private group: Subject<N, F, D>,
    private parent: GroupBy<any, K, N | any, F, D>
  ) {
    super(group);
  }

  protected _next(_n?: N) {
    this.done();
  }

  _unsubscribe() {
    const {parent, key} = this;
    this.key = this.parent = null!;
    if (parent) parent.removeGroup(key);
  }
}

export class IgnoreElements<N, F, D> extends Subscriber<N, F, D> {
  protected _next(_?: N) {
    // Do nothing
  }
}

export class IsEmpty<N extends boolean, F, D> extends Subscriber<N, F, D> {
  constructor(tgt: Subscriber<N, F, D>) {
    super(tgt);
  }

  private reactDone(empty: N) {
    const tgt = this.tgt;
    tgt.next(empty);
    tgt.done();
  }

  protected _next(_n?: N) {
    this.reactDone(false as N);
  }

  protected _done(d?: D) {
    this.reactDone(true as N);
  }
}

export class Map<N, M, F, D> extends Subscriber<N, F, D> {
  count = 0;
  private thisArg: any;

  constructor(
    tgt: Subscriber<M, F, D>,
    private project: (value: N, i: number) => M,
    thisArg: any
  ) {
    super(tgt);
    this.thisArg = thisArg || this;
  }

  protected _next(n?: N) {
    let result: M;
    try {
      result = this.project.call(this.thisArg, n, this.count++);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.next(result);
  }
}

export class MapTo<N, M, F, D> extends Subscriber<N, F, D> {
  value: M;

  constructor(tgt: Subscriber<M, F, D>, value: M) {
    super(tgt);
    this.value = value;
  }

  protected _next(_n?: N) {
    this.tgt.next(this.value);
  }
}

export class Materialize<N, F, D> extends Subscriber<N, F, D> {
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

export class MergeMap<N, M, F, D> extends Reactor<N, M, F, D> {
  private hasCompleted = false;
  private buffer: T[] = [];
  private active = 0;
  protected index = 0;

  constructor(
    tgt: Subscriber<R>,
    private project: (value: T, index: number) => ObservableInput<R>,
    private concurrent = Number.POSITIVE_INFINITY
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (this.active < this.concurrent) this._tryNext(n);
    else this.buffer.push(n);
  }

  protected _tryNext(value: N) {
    let result: ObservableInput<R>;
    const index = this.index++;
    try {
      result = this.project(value, index);
    } catch (err) {
      this.tgt.fail(err);
      return;
    }
    this.active++;
    this._innerSub(result, value, index);
  }

  private _innerSub(ish: ObservableInput<R>, value: T, index: number): void {
    const innerSubscriber = new ActorSubscriber(this, value, index);
    const tgt = this.tgt as Subscription;
    tgt.add(innerSubscriber);
    const innerSubscription = qu.subscribeToResult<T, R>(
      this,
      ish,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      tgt.add(innerSubscription);
    }
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (this.active === 0 && this.buffer.length === 0) {
      this.tgt.done(d);
    }
    this.unsubscribe();
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.tgt.next(innerValue);
  }

  reactDone(innerSub: Subscription): void {
    const buffer = this.buffer;
    this.remove(innerSub);
    this.active--;
    if (buffer.length > 0) {
      this._next(buffer.shift()!);
    } else if (this.active === 0 && this.hasCompleted) {
      this.tgt.done(d);
    }
  }
}

export class MergeScan<N, M, F, D> extends Reactor<N, M, F, D> {
  private hasValue = false;
  private hasCompleted = false;
  private buffer: qt.Source<any, F, D>[] = [];
  private active = 0;
  protected index = 0;

  constructor(
    tgt: Subscriber<M, F, D>,
    private accumulator: (
      acc: M,
      value: N,
      index: number
    ) => ObservableInput<R>,
    private acc: M,
    private concurrent: number
  ) {
    super(tgt);
  }

  protected _next(value: any): void {
    if (this.active < this.concurrent) {
      const index = this.index++;
      const tgt = this.tgt;
      let ish;
      try {
        const {accumulator} = this;
        ish = accumulator(this.acc, value, index);
      } catch (e) {
        return tgt.fail(e);
      }
      this.active++;
      this._innerSub(ish, value, index);
    } else {
      this.buffer.push(value);
    }
  }

  private _innerSub(ish: any, value: T, index: number): void {
    const innerSubscriber = new ActorSubscriber(this, value, index);
    const tgt = this.tgt as Subscription;
    tgt.add(innerSubscriber);
    const innerSubscription = qu.subscribeToResult<T, R>(
      this,
      ish,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      tgt.add(innerSubscription);
    }
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (this.active === 0 && this.buffer.length === 0) {
      if (this.hasValue === false) {
        this.tgt.next(this.acc);
      }
      this.tgt.done(d);
    }
    this.unsubscribe();
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    const {tgt} = this;
    this.acc = innerValue;
    this.hasValue = true;
    tgt.next(innerValue);
  }

  reactDone(innerSub: Subscription): void {
    const buffer = this.buffer;
    const tgt = this.tgt as Subscription;
    tgt.remove(innerSub);
    this.active--;
    if (buffer.length > 0) {
      this._next(buffer.shift());
    } else if (this.active === 0 && this.hasCompleted) {
      if (this.hasValue === false) {
        this.tgt.next(this.acc);
      }
      this.tgt.done(d);
    }
  }
}

export class ObserveOnMessage {
  constructor(
    public notification: qt.Notification<any>,
    public tgt: qt.Target<any>
  ) {}
}

export class ObserveOn<N, F, D> extends Subscriber<N, F, D> {
  static dispatch(
    this: qt.SchedulerAction<ObserveOnMessage>,
    arg: ObserveOnMessage
  ) {
    const {notification, tgt} = arg;
    notification.observe(tgt);
    this.unsubscribe();
  }

  constructor(
    tgt: Subscriber<N, F, D>,
    private scheduler: qt.SchedulerLike,
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

export class OnErrorResumeNext<N, M, F, D> extends Reactor<N, M, F, D> {
  constructor(
    protected tgt: Subscriber<N, F, D>,
    private nextSources: Array<ObservableInput<any>>
  ) {
    super(tgt);
  }

  notifyError(error: any, innerSub: Actor<N, any, F, D>): void {
    this.subscribeToNextSource();
  }

  reactDone(innerSub: Actor<N, any, F, D>): void {
    this.subscribeToNextSource();
  }

  protected _fail(_f?: F) {
    this.subscribeToNextSource();
    this.unsubscribe();
  }

  protected _done(_d?: D) {
    this.subscribeToNextSource();
    this.unsubscribe();
  }

  private subscribeToNextSource(): void {
    const next = this.nextSources.shift();
    if (!!next) {
      const innerSubscriber = new Actor(this, undefined, undefined!);
      const tgt = this.tgt as Subscription;
      tgt.add(innerSubscriber);
      const innerSubscription = qu.subscribeToResult(
        this,
        next,
        undefined,
        undefined,
        innerSubscriber
      );
      if (innerSubscription !== innerSubscriber) {
        tgt.add(innerSubscription);
      }
    } else this.tgt.done(d);
  }
}

export class RefCount<N, F, D> extends Subscriber<N, F, D> {
  private connection?: Subscription;

  constructor(
    tgt: Subscriber<N, F, D>,
    private connectable?: Connectable<N, F, D>
  ) {
    super(tgt);
  }

  protected _unsubscribe() {
    const {connectable} = this;
    if (!connectable) {
      this.connection = undefined;
      return;
    }
    this.connectable = undefined;
    const refCount = (connectable as any)._refCount;
    if (refCount <= 0) {
      this.connection = undefined;
      return;
    }
    (connectable as any)._refCount = refCount - 1;
    if (refCount > 1) {
      this.connection = undefined;
      return;
    }
    const {connection} = this;
    const c = (<any>connectable)._connection;
    this.connection = undefined;
    if (c && (!connection || c === connection)) c.unsubscribe();
  }
}

export class Repeat<N, F, D> extends Subscriber<N, F, D> {
  constructor(
    tgt: Subscriber<any>,
    private count: number,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  done(d?: D) {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) return super.done(d);
      else if (count > -1) this.count = count - 1;
      source.subscribe(this._recycle());
    }
  }
}

export class RepeatWhen<N, M, F, D> extends Reactor<N, M, F, D> {
  private notifications: Subject<void> | null = null;
  private retries: qt.Source<any, F, D> | null = null;
  private retriesSubscription: Subscription | null | undefined = null;
  private sourceIsBeingSubscribedTo = true;

  constructor(
    tgt: Subscriber<R>,
    private notifier: (
      notifications: qt.Source<any, F, D>
    ) => qt.Source<any, F, D>,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.sourceIsBeingSubscribedTo = true;
    this.source.subscribe(this);
  }

  reactDone(innerSub: Actor<N, M, F, D>): void {
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

  _recycle(): Subscriber<N, F, D> {
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
    this.retriesSubscription = qu.subscribeToResult(this, retries);
  }
}

export class Retry<N, F, D> extends Subscriber<N, F, D> {
  private readonly initialCount: number;

  constructor(
    tgt: Subscriber<any>,
    private count: number,
    private resetOnSuccess: boolean,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
    this.initialCount = this.count;
  }

  next(value?: N) {
    super.next(value);
    if (this.resetOnSuccess) {
      this.count = this.initialCount;
    }
  }

  fail(f?: F) {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) return super.fail(f);
      else if (count > -1) this.count = count - 1;
      source.subscribe(this._recycle());
    }
  }
}

export class RetryWhen<N, M, F, D> extends Reactor<N, M, F, D> {
  private errors?: Subject<any>;
  private retries?: qt.Source<any, F, D>;
  private retriesSubscription?: Subscription;

  constructor(
    tgt: Subscriber<M, F, D>,
    private notifier: (errors: qt.Source<any, F, D>) => qt.Source<any, F, D>,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  fail(f?: F) {
    if (!this.stopped) {
      let errors = this.errors;
      let retries = this.retries;
      let retriesSubscription = this.retriesSubscription;
      if (!retries) {
        errors = new Subject();
        try {
          const {notifier} = this;
          retries = notifier(errors);
        } catch (e) {
          return super.fail(e);
        }
        retriesSubscription = qu.subscribeToResult(this, retries);
      } else {
        this.errors = undefined;
        this.retriesSubscription = undefined;
      }
      this._recycle();
      this.errors = errors;
      this.retries = retries;
      this.retriesSubscription = retriesSubscription;
      errors!.next(err);
    }
  }

  _unsubscribe() {
    const {errors, retriesSubscription} = this;
    if (errors) {
      errors.unsubscribe();
      this.errors = null;
    }
    if (retriesSubscription) {
      retriesSubscription.unsubscribe();
      this.retriesSubscription = undefined;
    }
    this.retries = undefined;
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ) {
    const {_unsubscribe} = this;
    this._unsubscribe = null!;
    this._recycle();
    this._unsubscribe = _unsubscribe;
    this.source.subscribe(this);
  }
}

export class SampleTime<N, F, D> extends Subscriber<N, F, D> {
  lastValue?: N;
  hasValue = false;

  constructor(
    tgt: Subscriber<N, F, D>,
    private period: number,
    private scheduler: qt.SchedulerLike
  ) {
    super(tgt);
    this.add(
      scheduler.schedule(dispatchNotification, period, {
        subscriber: this,
        period
      })
    );
  }

  protected _next(n?: N) {
    this.lastValue = n;
    this.hasValue = true;
  }

  reactNext() {
    if (this.hasValue) {
      this.hasValue = false;
      this.tgt.next(this.lastValue);
    }
  }
}

export class Scan<N, M, F, D> extends Subscriber<N, F, D> {
  private index = 0;

  constructor(
    tgt: Subscriber<M, F, D>,
    private accumulator: (acc: N | M, n: N | undefined, i: number) => M,
    private _state: any,
    private _hasState: boolean
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (!this._hasState) {
      this._state = n;
      this._hasState = true;
      this.tgt.next(n);
    } else {
      const index = this.index++;
      let result: M;
      try {
        result = this.accumulator(this._state, n, index);
      } catch (e) {
        this.tgt.fail(e);
        return;
      }
      this._state = result;
      this.tgt.next(result);
    }
  }
}

export class SequenceEqual<N, M, F, D> extends Subscriber<N, F, D> {
  private _a = [] as (N | undefined)[];
  private _b = [] as N[];
  private _oneComplete = false;

  constructor(
    tgt: qt.Observer<M, F, D>,
    private compareTo: qt.Source<N, F, D>,
    private comparator?: (a: N, b: N) => boolean
  ) {
    super(tgt);
    (this.tgt as Subscription).add(
      compareTo.subscribe(new SequenceEqualCompareToSubscriber(tgt, this))
    );
  }

  protected _next(n?: N) {
    if (this._oneComplete && this._b.length === 0) this.emit(false);
    else {
      this._a.push(n);
      this.checkValues();
    }
  }

  public _done(): void {
    if (this._oneComplete) this.emit(!this._a.length && !this._b.length);
    else this._oneComplete = true;
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
        this.tgt.fail(e);
      }
      if (!areEqual) this.emit(false);
    }
  }

  emit(n: boolean) {
    this.tgt.next(n);
    this.tgt.done();
  }

  nextB(n: N) {
    if (this._oneComplete && !this._a.length) this.emit(false);
    else {
      this._b.push(n);
      this.checkValues();
    }
  }

  completeB() {
    if (this._oneComplete) this.emit(!this._a.length && !this._b.length);
    else this._oneComplete = true;
  }
}

export class Single<N, F, D> extends Subscriber<N, F, D> {
  private seenValue = false;
  private singleValue?: N;
  private index = 0;

  constructor(
    tgt: qt.Observer<N, F, D>,
    private predicate:
      | ((n: N | undefined, i: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  private applySingleValue(n?: N) {
    if (this.seenValue)
      this.tgt.fail('Sequence contains more than one element');
    else {
      this.seenValue = true;
      this.singleValue = n;
    }
  }

  protected _next(n?: N) {
    const i = this.index++;
    if (this.predicate) this.tryNext(n, i);
    else this.applySingleValue(n);
  }

  private tryNext(n: N | undefined, i: number) {
    try {
      if (this.predicate!(n, i, this.source)) this.applySingleValue(n);
    } catch (e) {
      this.tgt.fail(e);
    }
  }

  protected _done(d?: D) {
    const tgt = this.tgt;
    if (this.index > 0) {
      tgt.next(this.seenValue ? this.singleValue : undefined);
      tgt.done();
    } else tgt.fail(new EmptyError());
  }
}

export class SkipLast<N, F, D> extends Subscriber<N, F, D> {
  private _ring: (N | undefined)[];
  private _count = 0;

  constructor(tgt: Subscriber<N, F, D>, private _skipCount: number) {
    super(tgt);
    this._ring = new Array<N | undefined>(_skipCount);
  }

  protected _next(n?: N) {
    const skipCount = this._skipCount;
    const count = this._count++;
    if (count < skipCount) this._ring[count] = n;
    else {
      const currentIndex = count % skipCount;
      const ring = this._ring;
      const oldValue = ring[currentIndex];
      ring[currentIndex] = n;
      this.tgt.next(oldValue);
    }
  }
}

export class SkipUntil<N, M, F, D> extends Reactor<N, M, F, D> {
  private hasValue = false;
  private innerSubscription?: Subscription;

  constructor(tgt: Subscriber<M, F, D>, notifier: ObservableInput<any>) {
    super(tgt);
    const innerSubscriber = new Actor(this, undefined, undefined!);
    this.add(innerSubscriber);
    this.innerSubscription = innerSubscriber;
    const innerSubscription = qu.subscribeToResult(
      this,
      notifier,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      this.add(innerSubscription);
      this.innerSubscription = innerSubscription;
    }
  }

  protected _next(n?: N) {
    if (this.hasValue) super._next(n);
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ) {
    this.hasValue = true;
    if (this.innerSubscription) this.innerSubscription.unsubscribe();
  }

  reactDone() {
    /* do nothing */
  }
}

export class SkipWhile<N, F, D> extends Subscriber<N, F, D> {
  private skipping = true;
  private index = 0;

  constructor(
    tgt: Subscriber<N, F, D>,
    private predicate: (n: N | undefined, i: number) => boolean
  ) {
    super(tgt);
  }
  protected _next(n?: N) {
    const tgt = this.tgt;
    if (this.skipping) this.tryCallPredicate(n);
    if (!this.skipping) tgt.next(n);
  }

  private tryCallPredicate(value: N) {
    try {
      const result = this.predicate(value, this.index++);
      this.skipping = Boolean(result);
    } catch (err) {
      this.tgt.fail(err);
    }
  }
}

export class SwitchMap<N, M, F, D> extends Reactor<N, M, F, D> {
  private index = 0;
  private innerSubscription?: Subscription;

  constructor(
    tgt: Subscriber<M, F, D>,
    private project: (n: N | undefined, i: number) => ObservableInput<R>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    let result: ObservableInput<R>;
    const index = this.index++;
    try {
      result = this.project(n, index);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this._innerSub(result, n, index);
  }

  private _innerSub(result: ObservableInput<R>, value: T, index: number) {
    const innerSubscription = this.innerSubscription;
    if (innerSubscription) {
      innerSubscription.unsubscribe();
    }
    const innerSubscriber = new Actor(this, value, index);
    const tgt = this.tgt as Subscription;
    tgt.add(innerSubscriber);
    this.innerSubscription = qu.subscribeToResult(
      this,
      result,
      undefined,
      undefined,
      innerSubscriber
    );
    if (this.innerSubscription !== innerSubscriber) {
      tgt.add(this.innerSubscription);
    }
  }

  protected _done(d?: D) {
    const {innerSubscription} = this;
    if (!innerSubscription || innerSubscription.closed) super._done();
    this.unsubscribe();
  }

  protected _unsubscribe() {
    this.innerSubscription = null!;
  }

  reactDone(innerSub: Subscription) {
    const tgt = this.tgt as Subscription;
    tgt.remove(innerSub);
    this.innerSubscription = null!;
    if (this.stopped) {
      super._done();
    }
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.tgt.next(innerValue);
  }
}

export class Take<N, F, D> extends Subscriber<N, F, D> {
  private count = 0;

  constructor(tgt: Subscriber<N, F, D>, private total: number) {
    super(tgt);
  }

  protected _next(n?: N) {
    const total = this.total;
    const count = ++this.count;
    if (count <= total) {
      this.tgt.next(n);
      if (count === total) {
        this.tgt.done(d);
        this.unsubscribe();
      }
    }
  }
}

export class TakeLast<N, F, D> extends Subscriber<N, F, D> {
  private ring = [] as N[];
  private count = 0;

  constructor(tgt: Subscriber<N, F, D>, private total: number) {
    super(tgt);
  }

  protected _next(n?: N) {
    const ring = this.ring;
    const total = this.total;
    const count = this.count++;

    if (ring.length < total) {
      ring.push(v);
    } else {
      const index = count % total;
      ring[index] = v;
    }
  }

  protected _done(d?: D) {
    const tgt = this.tgt;
    let count = this.count;

    if (count > 0) {
      const total = this.count >= this.total ? this.total : this.count;
      const ring = this.ring;

      for (let i = 0; i < total; i++) {
        const idx = count++ % total;
        tgt.next(ring[idx]);
      }
    }

    tgt.done();
  }
}

export class TakeUntil<N, M, F, D> extends Reactor<N, M, F, D> {
  seenValue = false;

  constructor(tgt: Subscriber<any, F, D>) {
    super(tgt);
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.seenValue = true;
    this.done();
  }

  reactDone() {
    // noop
  }
}

export class TakeWhile<N, F, D> extends Subscriber<N, F, D> {
  private index = 0;

  constructor(
    tgt: Subscriber<N, F, D>,
    private predicate: (n: N | undefined, i: number) => boolean,
    private inclusive: boolean
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    const tgt = this.tgt;
    let result: boolean;
    try {
      result = this.predicate(n, this.index++);
    } catch (e) {
      tgt.fail(e);
      return;
    }
    this.nextOrComplete(n, result);
  }

  private nextOrComplete(n?: N, predicateResult: boolean) {
    const tgt = this.tgt;
    if (Boolean(predicateResult)) tgt.next(n);
    else {
      if (this.inclusive) tgt.next(n);
      tgt.done();
    }
  }
}

export class Tap<N, F, D> extends Subscriber<N, F, D> {
  private _context: any;
  private _tapNext: (value: N) => void = noop;
  private _tapError: (err: any) => void = noop;
  private _tapComplete: () => void = noop;

  constructor(
    tgt: Subscriber<N, F, D>,
    observerOrNext?: Target<N, F, D> | ((value: N) => void) | null,
    error?: (e?: any) => void,
    complete?: () => void
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

  _fail(f?: F) {
    try {
      this._tapError.call(this._context, f);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.fail(f);
  }

  _done(d?: D) {
    try {
      this._tapComplete.call(this._context);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    return this.tgt.done(d);
  }
}

export class Throttle<N, M, F, D> extends Reactor<N, M, F, D> {
  private _throttled?: Subscription;
  private _sendValue?: N;
  private _hasValue = false;

  constructor(
    protected tgt: Subscriber<N, F, D>,
    private durationSelector: (value: N) => qt.SourceOrPromise<number>,
    private _leading: boolean,
    private _trailing: boolean
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    this._hasValue = true;
    this._sendValue = n;
    if (!this._throttled) {
      if (this._leading) this.send();
      else this.throttle(n);
    }
  }

  private send() {
    const {_hasValue, _sendValue} = this;
    if (_hasValue) {
      this.tgt.next(_sendValue!);
      this.throttle(_sendValue!);
    }
    this._hasValue = false;
    this._sendValue = undefined;
  }

  private throttle(value: N): void {
    const duration = this.tryDurationSelector(value);
    if (!!duration)
      this.add((this._throttled = qu.subscribeToResult(this, duration)));
  }

  private tryDurationSelector(value: N): qt.SourceOrPromise<any, F, D> | null {
    try {
      return this.durationSelector(value);
    } catch (e) {
      this.tgt.fail(e);
      return null;
    }
  }

  private throttlingDone() {
    const {_throttled, _trailing} = this;
    if (_throttled) _throttled.unsubscribe();
    this._throttled = undefined;
    if (_trailing) this.send();
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.throttlingDone();
  }

  reactDone(): void {
    this.throttlingDone();
  }
}

export class ThrottleTime<N, F, D> extends Subscriber<N, F, D> {
  private throttled?: Subscription;
  private _hasTrailingValue = false;
  private _trailingValue?: N;

  constructor(
    tgt: Subscriber<N, F, D>,
    private duration: number,
    private scheduler: qt.SchedulerLike,
    private leading: boolean,
    private trailing: boolean
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (this.throttled) {
      if (this.trailing) {
        this._trailingValue = n;
        this._hasTrailingValue = true;
      }
    } else {
      this.add(
        (this.throttled = this.scheduler.schedule<DispatchArg<N, F, D>>(
          dispatchNext as any,
          this.duration,
          {subscriber: this}
        ))
      );
      if (this.leading) this.tgt.next(n);
      else if (this.trailing) {
        this._trailingValue = n;
        this._hasTrailingValue = true;
      }
    }
  }

  protected _done(d?: D) {
    if (this._hasTrailingValue) this.tgt.next(this._trailingValue);
    this.tgt.done(d);
  }

  clearThrottle() {
    const throttled = this.throttled;
    if (throttled) {
      if (this.trailing && this._hasTrailingValue) {
        this.tgt.next(this._trailingValue);
        this._trailingValue = null;
        this._hasTrailingValue = false;
      }
      throttled.unsubscribe();
      this.remove(throttled);
      this.throttled = null!;
    }
  }
}

export class ThrowIfEmpty<N, F, D> extends Subscriber<N, F, D> {
  private hasValue = false;

  constructor(tgt: Subscriber<N, F, D>, private errorFactory: () => any) {
    super(tgt);
  }

  protected _next(n?: N) {
    this.hasValue = true;
    this.tgt.next(n);
  }

  protected _done(d?: D) {
    if (!this.hasValue) {
      let err: any;
      try {
        err = this.errorFactory();
      } catch (e) {
        err = e;
      }
      this.tgt.fail(err);
    } else return this.tgt.done(d);
  }
}

export class TimeoutWith<T, R> extends Reactor<N, M, F, D> {
  private action: qt.SchedulerAction<TimeoutWith<T, R>> | null = null;

  constructor(
    tgt: Subscriber<N, F, D>,
    private absoluteTimeout: boolean,
    private waitFor: number,
    private withObservable: ObservableInput<any>,
    private scheduler: qt.SchedulerLike
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
      this.action = <SchedulerAction<TimeoutWith<T, R>>>(
        action.schedule(this, this.waitFor)
      );
    } else {
      this.add(
        (this.action = <SchedulerAction<TimeoutWith<T, R>>>(
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