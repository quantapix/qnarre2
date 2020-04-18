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
