import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';
import * as qh from './scheduler';
import {F} from './spec/helpers';

export function buffer<N, F = any, D = any>(
  s: qt.Source<any, F, D>
): qt.Lifter<N, (N | undefined)[], F, D> {
  return x => x.lift(new BufferO(s));
}

class BufferO<N, F, D> implements qt.Operator<N, (N | undefined)[], F, D> {
  constructor(private src: qt.Source<any, F, D>) {}
  call(r: qj.Subscriber<(N | undefined)[], F, D>, s: qt.Source<N, F, D>) {
    return s.subscribe(new BufferR(r, this.src));
  }
}

class BufferR<N, F, D> extends qj.Reactor<any, N, F, D> {
  private buf = [] as (N | undefined)[];

  constructor(
    private tgt2: qj.Subscriber<(N | undefined)[], F, D>,
    s: qt.Source<any, F, D>
  ) {
    super();
    this.add(qu.subscribeToResult(this, s));
  }

  protected _next(n?: N) {
    this.buf.push(n);
  }

  reactNext() {
    this.tgt2.next(this.buf);
    this.buf = [];
  }
}

export function bufferCount<N, F = any, D = any>(
  size: number,
  every?: number
): qt.Lifter<N, (N | undefined)[], F, D> {
  return x => x.lift(new BufferCountO(size, every));
}

class BufferCountO<N, F, D> implements qt.Operator<N, (N | undefined)[], F, D> {
  private cls: any;
  constructor(private size: number, private every?: number) {
    if (!every || size === every) this.cls = BufferCountR;
    else this.cls = BufferSkipCountR;
  }
  call(r: qj.Subscriber<(N | undefined)[], F, D>, s: qt.Source<N, F, D>) {
    return s.subscribe(new this.cls(r, this.size, this.every));
  }
}

class BufferCountR<N, F, D> extends qj.Subscriber<N, F, D> {
  private buf = [] as (N | undefined)[];

  constructor(
    private tgt2: qj.Subscriber<(N | undefined)[], F, D>,
    private size: number
  ) {
    super();
  }

  protected _next(n?: N) {
    const b = this.buf;
    b.push(n);
    if (b.length == this.size) {
      this.tgt2.next(b);
      this.buf = [];
    }
  }

  protected _done(d?: D) {
    if (this.buf.length) {
      this.tgt2.next(this.buf);
      this.buf = [];
    }
    super._done(d);
  }
}

export class BufferSkipCountR<N, F, D> extends qj.Subscriber<N, F, D> {
  private bufs = [] as (N | undefined)[][];
  private count = 0;

  constructor(
    private tgt2: qj.Subscriber<(N | undefined)[], F, D>,
    private size: number,
    private every: number
  ) {
    super();
  }

  protected _next(n?: N) {
    this.count++;
    const bs = this.bufs;
    if (this.count % this.every === 0) bs.push([]);
    for (let i = bs.length; i--; ) {
      const b = bs[i];
      b.push(n);
      if (b.length === this.size) {
        bs.splice(i, 1);
        this.tgt2.next(b);
      }
    }
  }

  protected _done(d?: D) {
    const bs = this.bufs;
    while (bs.length) {
      const b = bs.shift();
      if (b.length) this.tgt2.next(b);
    }
    super._done(d);
  }
}

export function bufferTime<N, F, D>(
  span: number
): qt.Lifter<N, (N | undefined)[], F, D>;
export function bufferTime<N, F, D>(
  span: number,
  h?: qt.Scheduler
): qt.Lifter<N, (N | undefined)[], F, D>;
export function bufferTime<N, F, D>(
  span: number,
  h?: qt.Scheduler,
  interval?: number
): qt.Lifter<N, (N | undefined)[], F, D>;
export function bufferTime<N, F, D>(
  span: number,
  h: qt.Scheduler = qh.async,
  interval?: number,
  max?: number
): qt.Lifter<N, (N | undefined)[], F, D> {
  return x => x.lift(new BufferTimeO(span, h, interval, max));
}

export class BufferTimeO<N, F, D>
  implements qt.Operator<N, (N | undefined)[], F, D> {
  constructor(
    private span: number,
    private h: qt.Scheduler,
    private interval?: number,
    private max?: number
  ) {}
  call(r: qj.Subscriber<(N | undefined)[], F, D>, s: qt.Source<N, F, D>): any {
    return s.subscribe(
      new BufferTimeR(r, this.h, this.span, this.interval, this.max)
    );
  }
}

class Context<N> {
  buf = [] as (N | undefined)[];
  close?: qt.Subscription;
}

interface DispatchCreateArg<N, F, D> {
  span: number;
  interval?: number;
  r: BufferTimeR<N, F, D>;
  h: qt.Scheduler;
}

interface DispatchCloseArg<N, F, D> {
  r: BufferTimeR<N, F, D>;
  c: Context<N>;
}

export class BufferTimeR<N, F, D> extends qj.Subscriber<N, F, D> {
  private ctxs = [] as Context<N>[];
  private timespanOnly: boolean;

  constructor(
    private tgt2: qj.Subscriber<(N | undefined)[], F, D>,
    private h: qt.Scheduler,
    private span: number,
    private interval?: number,
    private max = Number.POSITIVE_INFINITY
  ) {
    super();
    const c = this.open();
    this.timespanOnly = interval == null || interval < 0;
    if (this.timespanOnly) {
      const timeSpanOnlyState = {r: this, c, span};
      this.add(
        (c.close = h.schedule(
          dispatchBufferTimeSpanOnly,
          span,
          timeSpanOnlyState
        ))
      );
    } else {
      const closeState = {r: this, c};
      const creationState: DispatchCreateArg<N, F, D> = {
        span,
        interval,
        subscriber: this,
        h
      };
      this.add(
        (c.close = h.schedule<DispatchCloseArg<N, F, D>>(
          dispatchBufferClose as any,
          span,
          closeState
        ))
      );
      this.add(
        h.schedule<DispatchCreateArg<N, F, D>>(
          dispatchBufferCreation as any,
          interval,
          creationState
        )
      );
    }
  }

  protected _next(n?: N) {
    let filled: Context<N> | undefined;
    const cs = this.ctxs;
    const len = cs.length;
    for (let i = 0; i < len; i++) {
      const c = cs[i];
      const b = c.buf;
      b.push(n);
      if (b.length == this.max) filled = c;
    }
    if (filled) this.onFull(filled);
  }

  protected _fail(f?: F) {
    this.ctxs.length = 0;
    super._fail(f);
  }

  protected _done(d?: D) {
    const cs = this.ctxs;
    while (cs.length > 0) {
      const c = cs.shift()!;
      this.tgt2.next(c.buf);
    }
    super._done(d);
  }

  _unsubscribe() {
    this.ctxs = [];
  }

  protected onFull(c: Context<N>) {
    this.close(c);
    const closeAction = c.close;
    closeAction!.unsubscribe();
    this.remove(closeAction!);
    if (!this.closed && this.timespanOnly) {
      c = this.open();
      const span = this.span;
      const timeSpanOnlyState = {subscriber: this, c, span};
      this.add(
        (c.close = this.h.schedule(
          dispatchBufferTimeSpanOnly,
          span,
          timeSpanOnlyState
        ))
      );
    }
  }

  open() {
    const c = new Context<N>();
    this.ctxs.push(c);
    return c;
  }

  close(c: Context<N>) {
    this.tgt2.next(c.buf);
    const cs = this.ctxs;
    const i = cs ? cs.indexOf(c) : -1;
    if (i >= 0) cs.splice(cs.indexOf(c), 1);
  }
}

function dispatchBufferTimeSpanOnly(this: qt.Action<any>, state: any) {
  const subscriber: BufferTimeR<any> = state.subscriber;
  const prevContext = state.context;
  if (prevContext) subscriber.closeContext(prevContext);
  if (!subscriber.closed) {
    state.context = subscriber.openContext();
    state.context.closeAction = this.schedule(state, state.span);
  }
}

function dispatchBufferCreation<N, F, D>(
  this: qt.Action<DispatchCreateArg<N, F, D>>,
  state: DispatchCreateArg<N, F, D>
) {
  const {interval, span, subscriber, h} = state;
  const context = subscriber.openContext();
  const action = <Action<DispatchCreateArg<N, F, D>>>this;
  if (!subscriber.closed) {
    subscriber.add(
      (context.closeAction = h.schedule<DispatchCloseArg<N, F, D>>(
        dispatchBufferClose as any,
        span,
        {subscriber, context}
      ))
    );
    action.schedule(state, interval!);
  }
}

function dispatchBufferClose<N, F, D>(arg: DispatchCloseArg<N, F, D>) {
  const {subscriber, context} = arg;
  subscriber.closeContext(context);
}

export function bufferToggle<N, R, F, D>(
  openings: qt.SourceOrPromise<R, F, D>,
  closingSelector: (value: M) => qt.SourceOrPromise<any, F, D>
): qt.Lifter<N, N[], F, D> {
  return x => x.lift(new BufferToggleO<N, M>(openings, closingSelector));
}

export class BufferToggleO<N, R, F, D> implements qt.Operator<N, N[]> {
  constructor(
    private openings: qt.SourceOrPromise<R>,
    private closingSelector: (value: R) => qt.SourceOrPromise<any, F, D>
  ) {}

  call(r: qj.Subscriber<N[], F, D>, source: any): any {
    return source.subscribe(
      new BufferToggleR(r, this.openings, this.closingSelector)
    );
  }
}

interface BufferContext<N> {
  buffer?: N[];
  subscription?: qj.Subscription;
}

export class BufferToggleR<O, I, F, D> extends qj.Reactor<N[], M, F, D> {
  private contexts = [] as BufferContext<N>[];

  constructor(
    tgt: qj.Subscriber<N[], F, D>,
    private openings: qt.SourceOrPromise<R, F, D>,
    private closingSelector: (value: M) => qt.SourceOrPromise<any, F, D> | void
  ) {
    super(tgt);
    this.add(qu.subscribeToResult(this, openings));
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
    super._done(d);
  }

  reactNext(
    outerN: any,
    innerValue: O,
    outerX: number,
    innerIndex: number,
    innerSub: qj.Actor<O, I, F, D>
  ) {
    outerN ? this.closeBuffer(outerN) : this.openBuffer(innerValue);
  }

  reactDone(innerSub: qj.Actor<O, I, F, D>) {
    this.closeBuffer((<any>innerSub).context);
  }

  private openBuffer(n: N) {
    try {
      const closingSelector = this.closingSelector;
      const closingNotifier = closingSelector.call(this, value);
      if (closingNotifier) this.trySubscribe(closingNotifier);
    } catch (err) {
      this._fail(f);
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
    const subscription = new qj.Subscription();
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
  return x => x.lift(new BufferWhenO(closingSelector));
}

class BufferWhenO<N, F, D> implements qt.Operator<N, T[]> {
  constructor(private closingSelector: () => qt.Source<any, F, D>) {}
  call(r: qj.Subscriber<N[], F, D>, source: any): any {
    return source.subscribe(new BufferWhenR(r, this.closingSelector));
  }
}

export class BufferWhenR<N, F, D> extends qj.Reactor<N, any, F, D> {
  private buffer?: N[];
  private subscribing = false;
  private closingSubscription?: qj.Subscription;

  constructor(
    tgt: qj.Subscriber<N, F, D>,
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
    super._done(d);
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
    innerSub: qj.Actor<N, any, F, D>
  ) {
    this.openBuffer();
  }

  reactDone() {
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
    closingSubscription = new qj.Subscription();
    this.closingSubscription = closingSubscription;
    this.add(closingSubscription);
    this.subscribing = true;
    closingSubscription.add(qu.subscribeToResult(this, closingNotifier));
    this.subscribing = false;
  }
}

export function concatMap<N, O extends qt.Input<any>>(
  project: (n: N, index: number) => O
): qt.Lifter<N, qt.Sourced<R>>;
export function concatMap<N, R, O extends qt.Input<any>>(
  project: (n: N, index: number) => O,
  resultSelector?: (
    outerN: T,
    innerValue: qt.Sourced<R>,
    outerX: number,
    innerIndex: number
  ) => R
): qt.Lifter<N, qt.Sourced<R> | R> {
  if (typeof resultSelector === 'function')
    return mergeMap(project, resultSelector, 1);
  return mergeMap(project, 1);
}

export function concatMapTo<N, O extends qt.Input<any>>(
  observable: O
): qt.Lifter<N, qt.Sourced<R>>;
export function concatMapTo<N, R, O extends qt.Input<any>>(
  innerObservable: O,
  resultSelector?: (
    outerN: T,
    innerValue: qt.Sourced<R>,
    outerX: number,
    innerIndex: number
  ) => R
): qt.Lifter<N, qt.Sourced<R> | R> {
  if (typeof resultSelector === 'function')
    return concatMap(() => innerObservable, resultSelector);
  return concatMap(() => innerObservable);
}

export function exhaust<N, F, D>(): qt.Lifter<Input<N, F, D>, T>;
export function exhaust<R>(): qt.Lifter<any, R>;
export function exhaust<N, F, D>(): qt.Lifter<any, T> {
  return x => x.lift(new ExhaustO<N, F, D>());
}

class ExhaustO<N, F, D> implements qt.Operator<N, N, F, D> {
  call(r: qj.Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new ExhaustR(r));
  }
}

export class ExhaustR<N, F, D> extends qj.Reactor<N, N, F, D> {
  private hasCompleted = false;
  private hasSubscription = false;

  constructor(tgt: qj.Subscriber<N, F, D>) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (!this.hasSubscription) {
      this.hasSubscription = true;
      this.add(qu.subscribeToResult(this, n));
    }
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (!this.hasSubscription) this.tgt.done();
  }

  reactDone(innerSub: qj.Subscription) {
    this.remove(innerSub);
    this.hasSubscription = false;
    if (this.hasCompleted) this.tgt.done();
  }
}

export function exhaustMap<N, O extends qt.Input<any>>(
  project: (n: N, index: number) => O
): qt.Lifter<N, qt.Sourced<R>>;
export function exhaustMap<N, R, O extends qt.Input<any>>(
  project: (n: N, index: number) => O,
  resultSelector?: (
    outerN: T,
    innerValue: qt.Sourced<R>,
    outerX: number,
    innerIndex: number
  ) => R
): qt.Lifter<N, qt.Sourced<R> | R> {
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
  return x => x.lift(new ExhaustMapO(project));
}

class ExhaustMapO<N, R, F, D> implements qt.Operator<N, R, F, D> {
  constructor(private project: (n: N, index: number) => qt.Input<R>) {}

  call(r: qj.Subscriber<R>, source: any): any {
    return source.subscribe(new ExhaustMapR(r, this.project));
  }
}

export class ExhaustMapR<N, R, F, D> extends qj.Reactor<N, R, F, D> {
  private hasSubscription = false;
  private hasCompleted = false;
  private index = 0;

  constructor(
    tgt: qj.Subscriber<R, F, D>,
    private project: (n: N, index: number) => qt.Input<R>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (!this.hasSubscription) this.tryNext(n);
  }

  private tryNext(n: N) {
    let result: qt.Input<R>;
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

  private _innerSub(result: qt.Input<R>, n: N, index: number) {
    const innerSubscriber = new qj.Actor(this, value, index);
    const tgt = this.tgt as qj.Subscription;
    tgt.add(innerSubscriber);
    const s = qu.subscribeToResult<N, R, F, D>(
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

  reactNext(outerN: N, innerValue: M) {
    this.tgt.next(innerValue);
  }

  reactFail(f?: F) {
    this.tgt.fail(f);
  }

  reactDone(innerSub: qj.Subscription) {
    const tgt = this.tgt as qj.Subscription;
    tgt.remove(innerSub);
    this.hasSubscription = false;
    if (this.hasCompleted) this.tgt.done();
  }
}

export function expand<N, R, F = any, D = any>(
  project: (n: N, index: number) => qt.Input<R>,
  concurrent?: number,
  scheduler?: qt.Scheduler
): qt.Lifter<N, R, F, D>;
export function expand<N, F, D>(
  project: (n: N, index: number) => qt.Input<N, F, D>,
  concurrent?: number,
  scheduler?: qt.Scheduler
): qt.Shifter<N, F, D>;
export function expand<N, R, F = any, D = any>(
  project: (n: N, index: number) => qt.Input<R>,
  concurrent: number = Number.POSITIVE_INFINITY,
  scheduler?: qt.Scheduler
): qt.Lifter<N, R, F, D> {
  concurrent = (concurrent || 0) < 1 ? Number.POSITIVE_INFINITY : concurrent;
  return x => x.lift(new ExpandO(project, concurrent, scheduler));
}

export class ExpandO<N, R, F, D> implements qt.Operator<N, R, F, D> {
  constructor(
    private project: (n: N, index: number) => qt.Input<R>,
    private concurrent: number,
    private scheduler?: qt.Scheduler
  ) {}

  call(r: qj.Subscriber<R>, source: any): any {
    return source.subscribe(
      new ExpandR(r, this.project, this.concurrent, this.scheduler)
    );
  }
}

export class ExpandR<N, R, F, D> extends qj.Reactor<N, R, F, D> {
  private index = 0;
  private active = 0;
  private hasCompleted = false;
  private buffer?: any[];

  constructor(
    tgt: qj.Subscriber<R, F, D>,
    private project: (n: N, index: number) => qt.Input<R>,
    private concurrent: number,
    private scheduler?: qt.Scheduler
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
          const tgt = this.tgt as qj.Subscription;
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

  private subscribeToProjection(result: any, n: N, index: number) {
    this.active++;
    const tgt = this.tgt as qj.Subscription;
    tgt.add(qu.subscribeToResult<N, R, F, D>(this, result, value, index));
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (this.hasCompleted && this.active === 0) this.tgt.done(d);
    this.unsubscribe();
  }

  reactNext(outerN: T, innerValue: R) {
    this._next(innerValue);
  }

  reactDone(innerSub: qj.Subscription) {
    const buffer = this.buffer;
    const tgt = this.tgt as qj.Subscription;
    tgt.remove(innerSub);
    this.active--;
    if (buffer && buffer.length > 0) this._next(buffer.shift());
    if (this.hasCompleted && this.active === 0) this.tgt.done();
  }
}

interface DispatchArg<N, R, F, D> {
  subscriber: Expand<N, R, F, D>;
  result: qt.Input<R>;
  value: any;
  index: number;
}

export function groupBy<N, K>(
  keySelector: (n: N) => K
): qt.Lifter<N, GroupedSource<K, T>>;
export function groupBy<N, K>(
  keySelector: (n: N) => K,
  elementSelector: void,
  durationSelector: (grouped: GroupedSource<K, T>) => qt.Source<any, F, D>
): qt.Lifter<N, GroupedSource<K, T>>;
export function groupBy<N, K, R>(
  keySelector: (n: N) => K,
  elementSelector?: (n: N) => R,
  durationSelector?: (grouped: GroupedSource<K, R>) => qt.Source<any, F, D>
): qt.Lifter<N, GroupedSource<K, R>>;
export function groupBy<N, K, R>(
  keySelector: (n: N) => K,
  elementSelector?: (n: N) => R,
  durationSelector?: (grouped: GroupedSource<K, R>) => qt.Source<any, F, D>,
  subjectSelector?: () => qj.Subject<R>
): qt.Lifter<N, GroupedSource<K, R>>;
export function groupBy<N, K, R>(
  keySelector: (n: N) => K,
  elementSelector?: ((n: N) => R) | void,
  durationSelector?: (grouped: GroupedSource<K, R>) => qt.Source<any, F, D>,
  subjectSelector?: () => qj.Subject<R>
): qt.Lifter<N, GroupedSource<K, R>> {
  return x =>
    x.lift(
      new GroupByO(
        keySelector,
        elementSelector,
        durationSelector,
        subjectSelector
      )
    );
}

class GroupByO<N, K, R> implements qt.Operator<N, GroupedSource<K, R>> {
  constructor(
    private keySelector: (n: N) => K,
    private elementSelector?: ((n: N) => R) | void,
    private durationSelector?: (
      grouped: GroupedSource<K, R>
    ) => qt.Source<any, F, D>,
    private subjectSelector?: () => qj.Subject<R>
  ) {}

  call(r: qj.Subscriber<GroupedSource<K, R>>, source: any): any {
    return source.subscribe(
      new GroupByR(
        r,
        this.keySelector,
        this.elementSelector,
        this.durationSelector,
        this.subjectSelector
      )
    );
  }
}

export class GroupByR<N, K, M, F, D> extends qj.Subscriber<N, F, D>
  implements qt.RefCounted {
  private groups?: Map<K, qj.Subject<N | M>>;
  public attempted = false;
  public count = 0;

  constructor(
    tgt: qj.Subscriber<GroupedSource<K, R>>,
    private keySelector: (n: N) => K,
    private elementSelector?: ((n: N) => R) | void,
    private durationSelector?: (
      grouped: GroupedSource<K, R>
    ) => qt.Source<any, F, D>,
    private subjectSelector?: () => qj.Subject<R>
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

  private _group(n: N, key: K) {
    let groups = this.groups;
    if (!groups) groups = this.groups = new Map<K, qj.Subject<T | R>>();
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
        : new qj.Subject<R>()) as qj.Subject<T | R>;
      groups.set(key, group);
      const groupedObservable = new GroupedSource(key, group, this);
      this.tgt.next(groupedObservable);
      if (this.durationSelector) {
        let duration: any;
        try {
          duration = this.durationSelector(
            new GroupedSource<K, R>(key, <qj.Subject<R>>group)
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
      groups.forEach(g => g.fail(f));
      groups.clear();
    }
    this.tgt.fail(f);
  }

  protected _done(d?: D) {
    const groups = this.groups;
    if (groups) {
      groups.forEach(group => group.done());
      groups.clear();
    }
    this.tgt.done(d);
  }

  removeGroup(key: K) {
    this.groups!.delete(key);
  }

  unsubscribe() {
    if (!this.closed) {
      this.unsubscribing = true;
      if (!this.count) super.unsubscribe();
    }
  }
}

export function map<N, R, F, D>(
  project: (n: N, index: number) => R,
  thisArg?: any
): qt.Lifter<N, R, F, D> {
  return function mapOperation(source: qt.Source<N, F, D>): qt.Source<R> {
    if (typeof project !== 'function') {
      throw new TypeError(
        'argument is not a function. Are you looking for `mapTo()`?'
      );
    }
    return source.lift(new MapO(project, thisArg));
  };
}

export class MapO<N, R, F, D> implements qt.Operator<N, R, F, D> {
  constructor(
    private project: (n: N, index: number) => R,
    private thisArg: any
  ) {}

  call(r: qj.Subscriber<R>, source: any): any {
    return source.subscribe(new MapR(r, this.project, this.thisArg));
  }
}

export class MapR<N, R, F, D> extends qj.Subscriber<N, F, D> {
  count = 0;
  private thisArg: any;

  constructor(
    tgt: qj.Subscriber<R, F, D>,
    private project: (n: N, i: number) => R,
    thisArg: any
  ) {
    super(tgt);
    this.thisArg = thisArg || this;
  }

  protected _next(n?: N) {
    let result: R;
    try {
      result = this.project.call(this.thisArg, n, this.count++);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.next(result);
  }
}

export function mapTo<R>(value: R): qt.Lifter<any, R>;
export function mapTo<R>(value: R): qt.Lifter<any, R> {
  return x => x.lift(new MapToO(value));
}

class MapToO<N, R, F, D> implements qt.Operator<N, R, F, D> {
  value: R;

  constructor(value: R) {
    this.value = value;
  }

  call(r: qj.Subscriber<R>, source: any): any {
    return source.subscribe(new MapToR(r, this.value));
  }
}

export class MapToR<N, R, F, D> extends qj.Subscriber<N, F, D> {
  value: R;

  constructor(tgt: qj.Subscriber<R, F, D>, value: R) {
    super(tgt);
    this.value = value;
  }

  protected _next(_n?: N) {
    this.tgt.next(this.value);
  }
}

export function mergeMap<N, O extends qt.Input<any>>(
  project: (n: N, index: number) => O,
  concurrent?: number
): qt.Lifter<N, qt.Sourced<R>>;
export function mergeMap<N, R, O extends qt.Input<any>>(
  project: (n: N, index: number) => O,
  resultSelector?:
    | ((
        outerN: T,
        innerValue: qt.Sourced<R>,
        outerX: number,
        innerIndex: number
      ) => R)
    | number,
  concurrent: number = Number.POSITIVE_INFINITY
): qt.Lifter<N, qt.Sourced<R> | R> {
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
  return x => x.lift(new MergeMapO(project, concurrent));
}

export class MergeMapO<N, R, F, D> implements qt.Operator<N, R, F, D> {
  constructor(
    private project: (n: N, index: number) => qt.Input<R>,
    private concurrent: number = Number.POSITIVE_INFINITY
  ) {}

  call(observer: qj.Subscriber<R>, source: any): any {
    return source.subscribe(
      new MergeMapR(observer, this.project, this.concurrent)
    );
  }
}

export class MergeMapR<N, R, F, D> extends qj.Reactor<N, R, F, D> {
  private hasCompleted = false;
  private buffer: N[] = [];
  private active = 0;
  protected index = 0;

  constructor(
    tgt: qj.Subscriber<R>,
    private project: (n: N, index: number) => qt.Input<R>,
    private concurrent = Number.POSITIVE_INFINITY
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (this.active < this.concurrent) this._tryNext(n);
    else this.buffer.push(n);
  }

  protected _tryNext(n: N) {
    let result: qt.Input<R>;
    const index = this.index++;
    try {
      result = this.project(value, index);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.active++;
    this._innerSub(result, value, index);
  }

  private _innerSub(ish: qt.Input<R>, n: N, index: number) {
    const innerSubscriber = new ActorSubscriber(this, value, index);
    const tgt = this.tgt as qj.Subscription;
    tgt.add(innerSubscriber);
    const innerSubscription = qu.subscribeToResult<N, R, F, D>(
      this,
      ish,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) tgt.add(innerSubscription);
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (this.active === 0 && this.buffer.length === 0) this.tgt.done(d);
    this.unsubscribe();
  }

  reactNext(outerN: T, innerValue: R) {
    this.tgt.next(innerValue);
  }

  reactDone(innerSub: qj.Subscription) {
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

export function mergeMapTo<O extends qt.Input<any>>(
  innerObservable: O,
  concurrent?: number
): qt.Lifter<any, qt.Sourced<R>>;
export function mergeMapTo<N, R, O extends qt.Input<any>>(
  innerObservable: O,
  resultSelector?:
    | ((
        outerN: T,
        innerValue: qt.Sourced<R>,
        outerX: number,
        innerIndex: number
      ) => R)
    | number,
  concurrent: number = Number.POSITIVE_INFINITY
): qt.Lifter<N, qt.Sourced<R> | R> {
  if (typeof resultSelector === 'function') {
    return mergeMap(() => innerObservable, resultSelector, concurrent);
  }
  if (typeof resultSelector === 'number') concurrent = resultSelector;
  return mergeMap(() => innerObservable, concurrent);
}

export function mergeScan<N, R, F, D>(
  acc: (acc: R, n: N, index: number) => qt.Input<R>,
  seed: R,
  concurrent: number = Number.POSITIVE_INFINITY
): qt.Lifter<N, R, F, D> {
  return x => x.lift(new MergeScanO(acc, seed, concurrent));
}

export class MergeScanO<N, R, F, D> implements qt.Operator<N, R, F, D> {
  constructor(
    private acc: (acc: R, n: N, index: number) => qt.Input<R>,
    private seed: R,
    private concurrent: number
  ) {}

  call(r: qj.Subscriber<R>, s: any) {
    return s.subscribe(new MergeScanR(r, this.acc, this.seed, this.concurrent));
  }
}

export class MergeScanR<N, R, F, D> extends qj.Reactor<N, R, F, D> {
  private hasValue = false;
  private hasCompleted = false;
  private buffer: qt.Source<any, F, D>[] = [];
  private active = 0;
  protected index = 0;

  constructor(
    tgt: qj.Subscriber<R, F, D>,
    private acc: (acc: R, n: N, index: number) => qt.Input<R>,
    private acc: R,
    private concurrent: number
  ) {
    super(tgt);
  }

  protected _next(value: any) {
    if (this.active < this.concurrent) {
      const index = this.index++;
      const tgt = this.tgt;
      let ish;
      try {
        const {acc} = this;
        ish = acc(this.acc, value, index);
      } catch (e) {
        return tgt.fail(e);
      }
      this.active++;
      this._innerSub(ish, value, index);
    } else this.buffer.push(value);
  }

  private _innerSub(ish: any, n: N, index: number) {
    const innerSubscriber = new ActorSubscriber(this, value, index);
    const tgt = this.tgt as qj.Subscription;
    tgt.add(innerSubscriber);
    const innerSubscription = qu.subscribeToResult<N, R, F, D>(
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

  reactNext(outerN: N, innerValue: R) {
    const {tgt} = this;
    this.acc = innerValue;
    this.hasValue = true;
    tgt.next(innerValue);
  }

  reactDone(innerSub: qj.Subscription) {
    const buffer = this.buffer;
    const tgt = this.tgt as qj.Subscription;
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

export function pairs<T>(
  obj: Object,
  h?: qh.Scheduler
): qs.Source<[string, T]> {
  if (!h) {
    return new qs.Source<[string, T]>(r => {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length && !r.closed; i++) {
        const key = keys[i];
        if (obj.hasOwnProperty(key)) {
          r.next([key, (obj as any)[key]]);
        }
      }
      r.done();
    });
  } else {
    return new qs.Source<[string, T]>(r => {
      const keys = Object.keys(obj);
      const subscription = new qj.Subscription();
      subscription.add(
        h.schedule<{
          keys: string[];
          index: number;
          r: qj.Subscriber<[string, T]>;
          subscription: qj.Subscription;
          obj: Object;
        }>(dispatch as any, 0, {keys, index: 0, r, subscription, obj})
      );
      return subscription;
    });
  }
}

export function pairwise<N, F = any, D = any>(): qt.Lifter<N, [N, N], F, D> {
  return x => x.lift(new PairwiseO());
}

class PairwiseO<N, F, D> implements qt.Operator<N, [N, N], F, D> {
  call(r: qj.Subscriber<[N, N], F, D>, s: any): any {
    return s.subscribe(new PairwiseR(r));
  }
}

class PairwiseR<N, F, D> extends qj.Subscriber<N, F, D> {
  private prev: N | undefined;
  private hasPrev = false;

  constructor(tgt: qj.Subscriber<[N, N]>) {
    super(tgt);
  }

  _next(n?: N) {
    let pair: [N, N] | undefined;
    if (this.hasPrev) pair = [this.prev!, n];
    else this.hasPrev = true;
    this.prev = n;
    if (pair) this.tgt.next(pair);
  }
}

export function partition<N, F, D>(
  predicate: (n: N, index: number) => boolean,
  thisArg?: any
): Mapper<qt.Source<N, F, D>, [qt.Source<N, F, D>, qt.Source<N, F, D>]> {
  return (source: qt.Source<N, F, D>) =>
    [
      filter(predicate, thisArg)(source),
      filter(not(predicate, thisArg) as any)(source)
    ] as [qt.Source<N, F, D>, qt.Source<N, F, D>];
}

export function partition<T>(
  source: qt.Input<T>,
  predicate: (n: N, index: number) => boolean,
  thisArg?: any
): [qt.Source<T>, qt.Source<T>] {
  return [
    filter(predicate, thisArg)(new qs.Source<T>(qu.subscribeTo(source))),
    filter(not(predicate, thisArg) as any)(
      new qs.Source<T>(qu.subscribeTo(source))
    )
  ] as [qt.Source<T>, qt.Source<T>];
}

export function pluck<N, K1 extends keyof T>(k1: K1): qt.Lifter<N, T[K1]>;
export function pluck<N, K1 extends keyof T, K2 extends keyof T[K1]>(
  k1: K1,
  k2: K2
): qt.Lifter<N, T[K1][K2]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2]
>(k1: K1, k2: K2, k3: K3): qt.Lifter<N, T[K1][K2][K3]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3]
>(k1: K1, k2: K2, k3: K3, k4: K4): qt.Lifter<N, T[K1][K2][K3][K4]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4]
>(k1: K1, k2: K2, k3: K3, k4: K4, k5: K5): qt.Lifter<N, T[K1][K2][K3][K4][K5]>;
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
): qt.Lifter<N, T[K1][K2][K3][K4][K5][K6]>;
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
): qt.Lifter<N, unknown>;
export function pluck<N, F, D>(...properties: string[]): qt.Lifter<N, unknown>;
export function pluck<N, R, F, D>(
  ...properties: Array<string | number | symbol>
): qt.Lifter<N, R, F, D> {
  const length = properties.length;
  if (length === 0) throw new Error('list of properties cannot be empty.');
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

export function scan<V, A = V>(
  acc: (acc: A | V, value: V, index: number) => A
): qt.Lifter<V, V | A>;
export function scan<V, A>(
  acc: (acc: A, value: V, index: number) => A,
  seed: A
): qt.Lifter<V, A>;
export function scan<V, A, S>(
  acc: (acc: A | S, value: V, index: number) => A,
  seed: S
): qt.Lifter<V, A>;
export function scan<V, A, S>(
  acc: (acc: V | A | S, value: V, index: number) => A,
  seed?: S
): qt.Lifter<V, V | A> {
  let hasSeed = false;
  if (arguments.length >= 2) hasSeed = true;
  return x => x.lift(new ScanO(acc, seed, hasSeed));
}

class ScanO<V, A, S> implements qt.Operator<V, A> {
  constructor(
    private acc: (acc: V | A | S, value: V, index: number) => A,
    private seed?: S,
    private hasSeed: boolean = false
  ) {}

  call(r: qj.Subscriber<A>, s: any): qt.Closer {
    return s.subscribe(new ScanR(r, this.acc, this.seed, this.hasSeed));
  }
}

export class ScanR<N, R, F, D> extends qj.Subscriber<N, F, D> {
  private index = 0;

  constructor(
    tgt: qj.Subscriber<R, F, D>,
    private acc: (acc: N | R, n: N | undefined, i: number) => R,
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
      let result: R;
      try {
        result = this.acc(this._state, n, index);
      } catch (e) {
        this.tgt.fail(e);
        return;
      }
      this._state = result;
      this.tgt.next(result);
    }
  }
}

export function switchMap<N, O extends qt.Input<any>>(
  project: (n: N, index: number) => O
): qt.Lifter<N, qt.Sourced<R>>;
export function switchMap<N, R, O extends qt.Input<any>>(
  project: (n: N, index: number) => O,
  resultSelector?: (
    outerN: T,
    innerValue: qt.Sourced<R>,
    outerX: number,
    innerIndex: number
  ) => R
): qt.Lifter<N, qt.Sourced<R> | R> {
  if (typeof resultSelector === 'function') {
    return (source: qt.Source<N, F, D>) =>
      source.pipe(
        switchMap((a, i) =>
          from(project(a, i)).pipe(map((b, ii) => resultSelector(a, b, i, ii)))
        )
      );
  }
  return x => x.lift(new SwitchMapO(project));
}

class SwitchMapO<N, R, F, D> implements qt.Operator<N, R, F, D> {
  constructor(private project: (n: N, index: number) => qt.Input<R>) {}
  call(r: qj.Subscriber<R>, s: any): any {
    return s.subscribe(new SwitchMapR(r, this.project));
  }
}

export class SwitchMapR<N, R, F, D> extends qj.Reactor<N, R, F, D> {
  private index = 0;
  private innerSubscription?: qj.Subscription;

  constructor(
    tgt: qj.Subscriber<R, F, D>,
    private project: (n: N | undefined, i: number) => qt.Input<R>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    let result: qt.Input<R>;
    const index = this.index++;
    try {
      result = this.project(n, index);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this._innerSub(result, n, index);
  }

  private _innerSub(result: qt.Input<R>, n: N, index: number) {
    const innerSubscription = this.innerSubscription;
    if (innerSubscription) innerSubscription.unsubscribe();

    const innerSubscriber = new qj.Actor(this, value, index);
    const tgt = this.tgt as qj.Subscription;
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
    if (!innerSubscription || innerSubscription.closed) super._done(d);
    this.unsubscribe();
  }

  protected _unsubscribe() {
    this.innerSubscription = null!;
  }

  reactDone(innerSub: qj.Subscription) {
    const tgt = this.tgt as qj.Subscription;
    tgt.remove(innerSub);
    this.innerSubscription = null!;
    if (this.stopped) super._done();
  }

  reactNext(outerN: N, innerValue: M) {
    this.tgt.next(innerValue);
  }
}

export function switchMapTo<R>(observable: qt.Input<R>): qt.Lifter<any, R>;
export function switchMapTo<N, I, R>(
  innerObservable: qt.Input<I>,
  resultSelector?: (
    outerN: T,
    innerValue: I,
    outerX: number,
    innerIndex: number
  ) => R
): qt.Lifter<N, I | R> {
  return resultSelector
    ? switchMap(() => innerObservable, resultSelector)
    : switchMap(() => innerObservable);
}

export function switchAll<N, F, D>(): qt.Lifter<Input<N, F, D>, T>;
export function switchAll<R>(): qt.Lifter<any, R>;
export function switchAll<N, F, D>(): qt.Lifter<Input<N, F, D>, T> {
  return switchMap(identity);
}

export function window<N, F = any, D = any>(
  windowBoundaries: qt.Source<any, F, D>
): qt.Lifter<N, qt.Source<N, F, D>, F, D> {
  return x => x.lift(new WindowO(windowBoundaries));
}

class WindowO<N, F, D> implements qt.Operator<N, qt.Source<N, F, D>> {
  constructor(private windowBoundaries: qt.Source<any, F, D>) {}

  call(r: qj.Subscriber<qt.Source<N, F, D>>, source: any): any {
    const windowSubscriber = new WindowR(r);
    const sourceSubscription = source.subscribe(windowSubscriber);
    if (!sourceSubscription.closed) {
      windowSubscriber.add(
        qu.subscribeToResult(windowSubscriber, this.windowBoundaries)
      );
    }
    return sourceSubscription;
  }
}

class WindowR<N, F, D> extends qj.Reactor<N, any> {
  private window: qj.Subject<N, F, D> = new qj.Subject<N, F, D>();

  constructor(tgt: qj.Subscriber<qt.Source<N, F, D>>) {
    super(tgt);
    tgt.next(this.window);
  }

  reactNext() {
    this.openWindow();
  }

  notifyError(error: any) {
    this._fail(error);
  }

  reactDone() {
    this._done();
  }

  protected _next(n?: N) {
    this.window.next(n);
  }

  protected _fail(f?: F) {
    this.window.fail(f);
    this.tgt.fail(f);
  }

  protected _done(d?: D) {
    this.window.done(d);
    this.tgt.done(d);
  }

  _unsubscribe() {
    this.window = null!;
  }

  private openWindow() {
    const prevWindow = this.window;
    if (prevWindow) {
      prevWindow.done();
    }
    const tgt = this.tgt;
    const newWindow = (this.window = new qj.Subject<N, F, D>());
    tgt.next(newWindow);
  }
}

export function windowCount<N, F = any, D = any>(
  windowSize: number,
  startWindowEvery: number = 0
): qt.Lifter<N, qt.Source<N, F, D>, F, D> {
  return x => x.lift(new WindowCountO<N, F, D>(windowSize, startWindowEvery));
}

class WindowCountO<N, F, D> implements qt.Operator<N, qt.Source<N, F, D>> {
  constructor(private windowSize: number, private startWindowEvery: number) {}
  call(r: qj.Subscriber<qt.Source<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowCountR(r, this.windowSize, this.startWindowEvery)
    );
  }
}

class WindowCountR<N, F, D> extends qj.Subscriber<N, F, D> {
  private windows: qj.Subject<N, F, D>[] = [new qj.Subject<N, F, D>()];
  private count: number = 0;

  constructor(
    protected tgt: qj.Subscriber<qt.Source<N, F, D>>,
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
      windows[i].next(n);
    }
    const c = this.count - windowSize + 1;
    if (c >= 0 && c % startWindowEvery === 0 && !this.closed) {
      windows.shift()!.done();
    }
    if (++this.count % startWindowEvery === 0 && !this.closed) {
      const window = new qj.Subject<N, F, D>();
      windows.push(window);
      tgt.next(window);
    }
  }

  protected _fail(f?: F) {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.fail(f);
      }
    }
    this.tgt.fail(f);
  }

  protected _done(d?: D) {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.done(d);
      }
    }
    this.tgt.done(d);
  }

  protected _unsubscribe() {
    this.count = 0;
    this.windows = null!;
  }
}

export function windowTime<N, F = any, D = any>(
  windowTimeSpan: number,
  scheduler?: qt.Scheduler
): qt.Lifter<N, qt.Source<N, F, D>, F, D>;
export function windowTime<N, F = any, D = any>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  scheduler?: qt.Scheduler
): qt.Lifter<N, qt.Source<N, F, D>, F, D>;
export function windowTime<N, F = any, D = any>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  maxWindowSize: number,
  scheduler?: qt.Scheduler
): qt.Lifter<N, qt.Source<N, F, D>, F, D>;
export function windowTime<N, F = any, D = any>(
  windowTimeSpan: number
): qt.Lifter<N, qt.Source<N, F, D>, F, D> {
  let scheduler: qt.Scheduler = qh.async;
  let windowCreationInterval: number | null = null;
  let maxWindowSize: number = Number.POSITIVE_INFINITY;
  if (qu.isScheduler(arguments[3])) {
    scheduler = arguments[3];
  }
  if (qu.isScheduler(arguments[2])) {
    scheduler = arguments[2];
  } else if (qu.isNumeric(arguments[2])) {
    maxWindowSize = Number(arguments[2]);
  }
  if (qu.isScheduler(arguments[1])) {
    scheduler = arguments[1];
  } else if (qu.isNumeric(arguments[1])) {
    windowCreationInterval = Number(arguments[1]);
  }
  return x =>
    x.lift(
      new WindowTimeO<N, F, D>(
        windowTimeSpan,
        windowCreationInterval,
        maxWindowSize,
        scheduler
      )
    );
}

class WindowTimeO<N, F, D> implements qt.Operator<N, qt.Source<N, F, D>> {
  constructor(
    private windowTimeSpan: number,
    private windowCreationInterval: number | null,
    private maxWindowSize: number,
    private scheduler: qt.Scheduler
  ) {}

  call(r: qj.Subscriber<qt.Source<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowTimeR(
        r,
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
  subscriber: WindowTimeR<N, F, D>;
  scheduler: qt.Scheduler;
}

interface TimeSpanOnlyState<N, F, D> {
  window: CountedSubject<N, F, D>;
  windowTimeSpan: number;
  subscriber: WindowTimeR<N, F, D>;
}

interface CloseWindowContext<N, F, D> {
  action: qt.Action<CreationState<N, F, D>>;
  subscription: qj.Subscription;
}

interface CloseState<N, F, D> {
  subscriber: WindowTimeR<N, F, D>;
  window: CountedSubject<N, F, D>;
  context: CloseWindowContext<N, F, D>;
}

class CountedSubject<N, F, D> extends qj.Subject<N, F, D> {
  private _numberOfNextedValues: number = 0;
  next(n?: N) {
    this._numberOfNextedValues++;
    super.next(n);
  }
  get numberOfNextedValues(): number {
    return this._numberOfNextedValues;
  }
}

class WindowTimeR<N, F, D> extends qj.Subscriber<N, F, D> {
  private windows: CountedSubject<N, F, D>[] = [];

  constructor(
    protected tgt: qj.Subscriber<qt.Source<N, F, D>>,
    windowTimeSpan: number,
    windowCreationInterval: number | null,
    private maxWindowSize: number,
    scheduler: qt.Scheduler
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

  protected _next(n?: N) {
    const windows =
      this.maxWindowSize < Number.POSITIVE_INFINITY
        ? this.windows.slice()
        : this.windows;
    const len = windows.length;
    for (let i = 0; i < len; i++) {
      const window = windows[i];
      if (!window.closed) {
        window.next(n);
        if (this.maxWindowSize <= window.numberOfNextedValues) {
          this.closeWindow(window);
        }
      }
    }
  }

  protected _fail(f?: F) {
    const ws = this.windows;
    while (ws.length) {
      ws.shift()!.fail(f);
    }
    this.tgt.fail(f);
  }

  protected _done(d?: D) {
    const ws = this.windows;
    while (ws.length) {
      ws.shift()!.done();
    }
    this.tgt.done(d);
  }

  public openWindow(): CountedSubject<N, F, D> {
    const w = new CountedSubject<N, F, D>();
    this.windows.push(w);
    const tgt = this.tgt;
    tgt.next(w);
    return w;
  }

  public closeWindow(w: CountedSubject<N, F, D>) {
    const i = this.windows.indexOf(w);
    if (i >= 0) {
      w.done();
      this.windows.splice(i, 1);
    }
  }
}

function dispatchWindowTimeSpanOnly<N, F, D>(
  this: qt.Action<TimeSpanOnlyState<N, F, D>>,
  state: TimeSpanOnlyState<N, F, D>
) {
  const {subscriber, windowTimeSpan, window} = state;
  if (window) subscriber.closeWindow(window);
  state.window = subscriber.openWindow();
  this.schedule(state, windowTimeSpan);
}

function dispatchWindowCreation<N, F, D>(
  this: qt.Action<CreationState<N, F, D>>,
  state: CreationState<N, F, D>
) {
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
  this: qt.Action<CloseState<N, F, D>>,
  state: CloseState<N, F, D>
) {
  const {subscriber, window, context} = state;
  if (context && context.action && context.subscription) {
    context.action.remove(context.subscription);
  }
  subscriber.closeWindow(window);
}

export function windowToggle<N, R, F = any, D = any>(
  openings: qt.Source<R>,
  closingSelector: (openValue: R) => qt.Source<any, F, D>
): qt.Lifter<N, qt.Source<N, F, D>, F, D> {
  return x => x.lift(new WindowToggleO<N, R, F, D>(openings, closingSelector));
}

class WindowToggleO<N, R, F, D> implements qt.Operator<N, qt.Source<N, F, D>> {
  constructor(
    private openings: qt.Source<R>,
    private closingSelector: (openValue: R) => qt.Source<any, F, D>
  ) {}

  call(r: qj.Subscriber<qt.Source<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowToggleR(r, this.openings, this.closingSelector)
    );
  }
}

interface WindowContext<N, F, D> {
  window: qj.Subject<N, F, D>;
  subscription: qj.Subscription;
}

class WindowToggleR<N, R, F, D> extends qj.Reactor<N, any> {
  private contexts: WindowContext<N, F, D>[] = [];
  private openSubscription?: qj.Subscription;

  constructor(
    tgt: qj.Subscriber<qt.Source<N, F, D>>,
    private openings: qt.Source<R>,
    private closingSelector: (openValue: R) => qt.Source<any, F, D>
  ) {
    super(tgt);
    this.add(
      (this.openSubscription = qu.subscribeToResult(
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
        contexts[i].window.next(n);
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
        context.window.fail(f);
        context.subscription.unsubscribe();
      }
    }
    super._fail(f);
  }

  protected _done(d?: D) {
    const {contexts} = this;
    this.contexts = null!;
    if (contexts) {
      const len = contexts.length;
      let index = -1;
      while (++index < len) {
        const context = contexts[index];
        context.window.done();
        context.subscription.unsubscribe();
      }
    }
    super._done(d);
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

  reactNext(outerN: any, innerValue: any) {
    if (outerN === this.openings) {
      let closingNotifier;
      try {
        const {closingSelector} = this;
        closingNotifier = closingSelector(innerValue);
      } catch (e) {
        return this.fail(e);
      }
      const window = new qj.Subject<N, F, D>();
      const subscription = new qj.Subscription();
      const context = {window, subscription};
      this.contexts.push(context);
      const innerSubscription = qu.subscribeToResult(
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

  reactFail(f?: F) {
    this.fail(f);
  }

  reactDone(inner: qj.Subscription) {
    if (inner !== this.openSubscription) {
      this.closeWindow(this.contexts.indexOf((<any>inner).context));
    }
  }

  private closeWindow(index: number) {
    if (index === -1) return;
    const {contexts} = this;
    const context = contexts[index];
    const {window, subscription} = context;
    contexts.splice(index, 1);
    window.done();
    subscription.unsubscribe();
  }
}

export function windowWhen<N, F = any, D = any>(
  closingSelector: () => qt.Source<any, F, D>
): qt.Lifter<N, qt.Source<N, F, D>, F, D> {
  return x => x.lift(new WindowWhenO<N, F, D>(closingSelector));
}

class WindowWhenO<N, F, D> implements qt.Operator<N, qt.Source<N, F, D>> {
  constructor(private closingSelector: () => qt.Source<any, F, D>) {}

  call(r: qj.Subscriber<qt.Source<N, F, D>>, source: any): any {
    return source.subscribe(new WindowWhenR(r, this.closingSelector));
  }
}

class WindowWhenR<N, F, D> extends qj.Reactor<N, any> {
  private window: qj.Subject<N, F, D> | undefined;
  private closingNotification?: qj.Subscription;

  constructor(
    protected tgt: qj.Subscriber<qt.Source<N, F, D>>,
    private closingSelector: () => qt.Source<any, F, D>
  ) {
    super(tgt);
    this.openWindow();
  }

  reactNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: qj.Actor<N, any, F, D>
  ) {
    this.openWindow(innerSub);
  }

  notifyError(error: any, innerSub: qj.Actor<N, any, F, D>) {
    this._fail(error);
  }

  reactDone(innerSub: qj.Actor<N, any, F, D>) {
    this.openWindow(innerSub);
  }

  protected _next(n?: N) {
    this.window!.next(n);
  }

  protected _fail(f?: F) {
    this.window!.fail(f);
    this.tgt.fail(f);
    this.unsubscribeClosingNotification();
  }

  protected _done(d?: D) {
    this.window!.done(d);
    this.tgt.done(d);
    this.unsubscribeClosingNotification();
  }

  private unsubscribeClosingNotification() {
    if (this.closingNotification) {
      this.closingNotification.unsubscribe();
    }
  }

  private openWindow(innerSub: qj.Actor<N, any, F, D> | null = null) {
    if (innerSub) {
      this.remove(innerSub);
      innerSub.unsubscribe();
    }
    const prevWindow = this.window;
    if (prevWindow) prevWindow.done();
    const window = (this.window = new qj.Subject<N, F, D>());
    this.tgt.next(window);
    let closingNotifier;
    try {
      const {closingSelector} = this;
      closingNotifier = closingSelector();
    } catch (e) {
      this.tgt.fail(e);
      this.window.fail(e);
      return;
    }
    this.add(
      (this.closingNotification = qu.subscribeToResult(this, closingNotifier))
    );
  }
}
