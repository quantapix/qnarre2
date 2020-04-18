import * as qt from './types';
import * as qu from './utils';
import * as qr from './subscriber';
import * as qj from './subject';

export function buffer<N, F, D>(
  a: qt.Source<any, F, D>
): qt.Lifter<N, (N | undefined)[], F, D> {
  return (s: qt.Source<N, F, D>) => s.lift(new BufferO<N, F, D>(a));
}

export class BufferO<N, F, D>
  implements qt.Operator<N, (N | undefined)[], F, D> {
  constructor(private act: qt.Source<any, F, D>) {}

  call(r: qj.Subscriber<(N | undefined)[], F, D>, s: qt.Source<N, F, D>) {
    return s.subscribe(new BufferR(r, this.act));
  }
}

export class BufferR<N, F, D> extends qj.Reactor<any, N, F, D> {
  private buf?: (N | undefined)[];

  constructor(
    public tgt2: qj.Subscriber<(N | undefined)[], F, D>,
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

export function bufferCount<N, F, D>(
  size: number,
  every?: number
): qt.Lifter<N, N[], F, D> {
  return (s: qt.Source<N, F, D>) =>
    s.lift(new BufferCountO<N, F, D>(size, every));
}

export class BufferCountO<N, F, D> implements qt.Operator<N, N[], F, D> {
  private cls: any;

  constructor(private size: number, private every?: number) {
    if (!every || size === every) this.cls = BufferCountR;
    else this.cls = BufferSkipCountR;
  }

  call(r: qj.Subscriber<N[], F, D>, s: qt.Source<N, F, D>) {
    return s.subscribe(new this.cls(r, this.size, this.every));
  }
}

export class BufferCountR<N, F, D> extends qj.Subscriber<N[], F, D> {
  private buf?: (N[] | undefined)[];

  constructor(tgt: qj.Subscriber<N[], F, D>, private size: number) {
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

export class BufferSkipCountR<N, F, D> extends qj.Subscriber<N, F, D> {
  private buffers: Array<T[]> = [];
  private count = 0;

  constructor(
    tgt: qj.Subscriber<N[], F, D>,
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

export function bufferTime<N, F, D>(
  bufferTimeSpan: number,
  scheduler?: qt.Scheduler
): qt.Lifter<N, N[], F, D>;
export function bufferTime<N, F, D>(
  bufferTimeSpan: number,
  bufferCreationInterval: number | null | undefined,
  scheduler?: qt.Scheduler
): qt.Lifter<N, N[], F, D>;
export function bufferTime<N, F, D>(
  bufferTimeSpan: number,
  bufferCreationInterval: number | null | undefined,
  maxBufferSize: number,
  scheduler?: qt.Scheduler
): qt.Lifter<N, N[], F, D>;
export function bufferTime<N, F, D>(
  bufferTimeSpan: number
): qt.Lifter<N, N[], F, D> {
  let length: number = arguments.length;
  let scheduler: qt.Scheduler = async;
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
      new BufferTimeO<N, F, D>(
        bufferTimeSpan,
        bufferCreationInterval,
        maxBufferSize,
        scheduler
      )
    );
  };
}

export class BufferTimeO<N, F, D> implements qt.Operator<N, N[], F, D> {
  constructor(
    private bufferTimeSpan: number,
    private bufferCreationInterval: number | null,
    private maxBufferSize: number,
    private scheduler: qt.Scheduler
  ) {}

  call(subscriber: qj.Subscriber<N[], F, D>, source: any): any {
    return source.subscribe(
      new BufferTimeR(
        subscriber,
        this.bufferTimeSpan,
        this.bufferCreationInterval,
        this.maxBufferSize,
        this.scheduler
      )
    );
  }
}

class Context<N> {
  buffer = [] as N[];
  closeAction?: qt.Subscription;
}

interface DispatchCreateArg<N, F, D> {
  bufferTimeSpan: number;
  bufferCreationInterval: number | null;
  subscriber: BufferTimeR<N, F, D>;
  scheduler: qt.Scheduler;
}

interface DispatchCloseArg<N, F, D> {
  subscriber: BufferTimeR<N, F, D>;
  context: Context<N>;
}

export class BufferTimeR<N, F, D> extends qj.Subscriber<N, F, D> {
  private contexts: Array<Context<N>> = [];
  private timespanOnly: boolean;

  constructor(
    tgt: qj.Subscriber<N[], F, D>,
    private bufferTimeSpan: number,
    private bufferCreationInterval: number | null,
    private maxBufferSize: number,
    private scheduler: qt.Scheduler
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

function dispatchBufferTimeSpanOnly(this: qt.Action<any>, state: any) {
  const subscriber: BufferTime<any> = state.subscriber;
  const prevContext = state.context;
  if (prevContext) subscriber.closeContext(prevContext);
  if (!subscriber.closed) {
    state.context = subscriber.openContext();
    state.context.closeAction = this.schedule(state, state.bufferTimeSpan);
  }
}

function dispatchBufferCreation<N, F, D>(
  this: qt.Action<DispatchCreateArg<N, F, D>>,
  state: DispatchCreateArg<N, F, D>
) {
  const {bufferCreationInterval, bufferTimeSpan, subscriber, scheduler} = state;
  const context = subscriber.openContext();
  const action = <Action<DispatchCreateArg<N, F, D>>>this;
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

export function bufferToggle<N, M, F, D>(
  openings: qt.SourceOrPromise<M, F, D>,
  closingSelector: (value: M) => qt.SourceOrPromise<any, F, D>
): qt.Lifter<N, N[], F, D> {
  return function bufferToggleLifter(source: qt.Source<N, F, D>) {
    return source.lift(new BufferToggleO<N, M>(openings, closingSelector));
  };
}

export class BufferToggleO<N, M, F, D> implements qt.Operator<N, N[]> {
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

interface BufferContext<N> {
  buffer?: N[];
  subscription?: Subscription;
}

export class BufferToggleR<O, I, F, D> extends Reactor<N[], M, F, D> {
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

export function bufferWhen<N, F, D>(
  closingSelector: () => qt.Source<any, F, D>
): qt.Lifter<N, N[], F, D> {
  return function (source: qt.Source<N, F, D>) {
    return source.lift(new BufferWhenO(closingSelector));
  };
}

class BufferWhenO<N, F, D> implements qt.Operator<T, T[]> {
  constructor(private closingSelector: () => qt.Source<any, F, D>) {}
  call(subscriber: Subscriber<N[], F, D>, source: any): any {
    return source.subscribe(
      new BufferWhenSubscriber(subscriber, this.closingSelector)
    );
  }
}

export class BufferWhenR<N, F, D> extends Reactor<N, any, F, D> {
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
