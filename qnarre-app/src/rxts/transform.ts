import * as qt from './types';
import * as qj from './subject';
import * as qh from './scheduler';
import * as qr from './subscriber';
import * as qs from './source';

export function buffer<N>(close: qt.Source<any>): qt.Lifter<N, N[]> {
  return x => x.lift(new BufferO(close));
}

class BufferO<N> implements qt.Operator<N, N[]> {
  constructor(private close: qt.Source<any>) {}
  call(r: qr.Subscriber<N[]>, s: qt.Source<N>) {
    return s.subscribe(new BufferR(r, this.close));
  }
}

class BufferR<N> extends qr.Reactor<N, any> {
  private buf = [] as N[];

  constructor(t: qr.Subscriber<N[]>, close: qt.Source<any>) {
    super(t);
    this.add(this.subscribeTo(close));
  }

  protected _next(n: N) {
    this.buf.push(n);
  }

  reactNext() {
    this.tgt.next(this.buf);
    this.buf = [];
  }
}

export function bufferCount<N>(size: number, every?: number): qt.Lifter<N, N[]> {
  return x => x.lift(new BufferCountO(size, every));
}

class BufferCountO<N> implements qt.Operator<N, N[]> {
  private cls: any;
  constructor(private size: number, private every?: number) {
    if (!every || size === every) this.cls = BufferCountR;
    else this.cls = BufferSkipR;
  }
  call(r: qr.Subscriber<N[]>, s: qt.Source<N>) {
    return s.subscribe(new this.cls(r, this.size, this.every));
  }
}

class BufferCountR<N> extends qr.Subscriber<N> {
  private buf = [] as N[];

  constructor(t: qr.Subscriber<N[]>, private size: number) {
    super(t);
  }

  protected _next(n: N) {
    const b = this.buf;
    b.push(n);
    if (b.length == this.size) {
      this.tgt.next(b);
      this.buf = [];
    }
  }

  protected _done() {
    if (this.buf.length) {
      this.tgt.next(this.buf);
      this.buf = [];
    }
    super._done();
  }
}

class BufferSkipR<N> extends qr.Subscriber<N> {
  private bufs = [] as N[][];
  private count = 0;

  constructor(t: qr.Subscriber<N[]>, private size: number, private every: number) {
    super(t);
  }

  protected _next(n: N) {
    this.count++;
    const bs = this.bufs;
    if (this.count % this.every === 0) bs.push([]);
    for (let i = bs.length; i--; ) {
      const b = bs[i];
      b.push(n);
      if (b.length === this.size) {
        bs.splice(i, 1);
        this.tgt.next(b);
      }
    }
  }

  protected _done() {
    const bs = this.bufs;
    while (bs.length) {
      const b = bs.shift();
      if (b.length) this.tgt.next(b);
    }
    super._done();
  }
}

interface Buffer<N> {
  ns: N[];
  close?: qt.Subscription;
}

export function bufferTime<N>(
  span: number,
  h: qt.Scheduler = qh.async,
  interval?: number,
  max?: number
): qt.Lifter<N, N[]> {
  return x => x.lift(new BufferTimeO(span, h, interval, max));
}

class BufferTimeO<N> implements qt.Operator<N, N[]> {
  constructor(
    private span: number,
    private h: qt.Scheduler,
    private interval?: number,
    private max?: number
  ) {}
  call(r: qr.Subscriber<N[]>, s: qt.Source<N>) {
    return s.subscribe(new BufferTimeR(r, this.h, this.span, this.interval, this.max));
  }
}

interface SpanOnly<N> extends qt.Nstate<N> {
  buf: Buffer<N>;
  span: number;
}

function spanOnly<N>(this: qt.Action<SpanOnly<N>>, s?: SpanOnly<N>) {
  if (s) {
    const r = s.r as BufferTimeR<N>;
    const b = s.buf;
    if (b) r.closeBuf(b);
    if (!r.closed) {
      s.buf = r.openBuf();
      s.buf.close = this.schedule(s, s.span);
    }
  }
}

class BufferTimeR<N> extends qr.Subscriber<N> {
  private bufs = [] as Buffer<N>[];
  private spanOnly: boolean;

  constructor(
    t: qr.Subscriber<N[]>,
    private h: qt.Scheduler,
    private span: number,
    interval?: number,
    private max = Number.POSITIVE_INFINITY
  ) {
    super(t);
    const b = this.openBuf();
    this.spanOnly = interval === undefined || interval < 0;
    if (this.spanOnly) {
      const s = {r: this as qt.Subscriber<N>, buf: b, span} as SpanOnly<N>;
      this.add((b.close = h.schedule<SpanOnly<N>>(spanOnly, s, span)));
    } else {
      interface Close extends qt.Nstate<N> {
        buf: Buffer<N>;
      }
      function close(s?: Close) {
        const {r, buf} = s!;
        (r as BufferTimeR<N>).closeBuf(buf);
      }
      const s1 = {r: this as qt.Subscriber<N>, buf: b} as Close;
      this.add((b.close = h.schedule<Close>(close, s1, span)));
      interface Create extends qt.Nstate<N> {
        span: number;
        interval?: number;
        h: qt.Scheduler;
      }
      function create(this: qt.Action<Create>, s?: Create) {
        const {r, h, span, interval} = s!;
        const b = (r as BufferTimeR<N>).openBuf();
        if (!r.closed) {
          r.add((b.close = h.schedule<Close>(close, {r, buf: b} as Close, span)));
          this.schedule(s, interval!);
        }
      }
      const s2 = {
        span,
        interval,
        r: this as qt.Subscriber<N>,
        h
      } as Create;
      this.add(h.schedule<Create>(create, s2, interval));
    }
  }

  protected _next(n: N) {
    let full: Buffer<N> | undefined;
    const bs = this.bufs;
    const len = bs.length;
    for (let i = 0; i < len; i++) {
      const b = bs[i];
      const ns = b.ns;
      ns.push(n);
      if (ns.length == this.max) full = b;
    }
    if (full) this.onFull(full);
  }

  protected _fail(e: any) {
    this.bufs.length = 0;
    super._fail(e);
  }

  protected _done() {
    const bs = this.bufs;
    while (bs.length) {
      const b = bs.shift()!;
      this.tgt.next(b.ns);
    }
    super._done();
  }

  _unsubscribe() {
    this.bufs = [];
  }

  onFull(b: Buffer<N>) {
    this.closeBuf(b);
    const s = b.close;
    if (s) {
      s.unsubscribe();
      this.remove(s);
    }
    if (!this.closed && this.spanOnly) {
      b = this.openBuf();
      const span = this.span;
      const s = {r: this as qt.Subscriber<N>, buf: b, span} as SpanOnly<N>;
      this.add((b.close = this.h.schedule<SpanOnly<N>>(spanOnly, s, span)));
    }
  }

  openBuf() {
    const b = {ns: []} as Buffer<N>;
    this.bufs.push(b);
    return b;
  }

  closeBuf(b: Buffer<N>) {
    this.tgt.next(b.ns);
    const bs = this.bufs;
    const i = bs ? bs.indexOf(b) : -1;
    if (i >= 0) bs.splice(bs.indexOf(b), 1);
  }
}

export function bufferToggle<N, O>(
  open: qt.SourceOrPromise<O>,
  close: (_: O) => qt.SourceOrPromise<any>
): qt.Lifter<N, N[]> {
  return x => x.lift(new BufferToggleO<N, O>(open, close));
}

class BufferToggleO<N, O> implements qt.Operator<N, N[]> {
  constructor(
    private open: qt.SourceOrPromise<O>,
    private close: (_: O) => qt.SourceOrPromise<any>
  ) {}
  call(r: qr.Subscriber<N[]>, s: qt.Source<N>) {
    return s.subscribe(new BufferToggleR(r, this.open, this.close));
  }
}

class BufferToggleR<N, O> extends qr.Reactor<N, O> {
  private bufs = [] as Buffer<N>[];

  constructor(
    t: qr.Subscriber<N[]>,
    open: qt.SourceOrPromise<O>,
    private close: (_: O) => qt.SourceOrPromise<any> | void
  ) {
    super(t);
    this.add(this.subscribeTo(open));
  }

  protected _next(n: N) {
    const bs = this.bufs;
    const len = bs.length;
    for (let i = 0; i < len; i++) {
      bs[i].ns.push(n);
    }
  }

  protected _fail(e: any) {
    const bs = this.bufs;
    while (bs.length > 0) {
      const b = bs.shift()!;
      b.close?.unsubscribe();
      b.ns = [];
      b.close = undefined;
    }
    this.bufs = [];
    super._fail(e);
  }

  protected _done() {
    const bs = this.bufs;
    while (bs.length > 0) {
      const b = bs.shift()!;
      if (b.ns.length) this.tgt.next(b.ns);
      b.close?.unsubscribe();
      b.ns = [];
      b.close = undefined;
    }
    this.bufs = [];
    super._done();
  }

  reactNext(n: N, o: O) {
    n ? this.closeBuf(n as any) : this.openBuf(o);
  }

  reactDone(a: qr.Actor<O, N>) {
    this.closeBuf((a as any).buffer);
  }

  private openBuf(o: O) {
    try {
      const s = this.close.call(this, o);
      if (s) this.trySubscribe(s);
    } catch (e) {
      this._fail(e);
    }
  }

  private closeBuf(b: Buffer<N>) {
    const bs = this.bufs;
    if (bs.length) {
      this.tgt.next(b.ns);
      bs.splice(bs.indexOf(b), 1);
      this.remove(b.close!);
      b.close?.unsubscribe();
    }
  }

  private trySubscribe(closer: any) {
    const ns = [] as N[];
    const close = new qr.Subscription();
    const b = {ns, close} as Buffer<N>;
    this.bufs.push(b);
    const s = this.subscribeTo(closer, b as any);
    if (!s || s.closed) this.closeBuf(b);
    else {
      (s as any).buffer = b;
      this.add(s);
      close.add(s);
    }
  }
}

export function bufferWhen<N>(close: () => qt.Source<any>): qt.Lifter<N, N[]> {
  return x => x.lift(new BufferWhenO(close));
}

class BufferWhenO<N> implements qt.Operator<N, N[]> {
  constructor(private close: () => qt.Source<any>) {}
  call(r: qr.Subscriber<N[]>, s: qt.Source<N>) {
    return s.subscribe(new BufferWhenR(r, this.close));
  }
}

class BufferWhenR<N> extends qr.Reactor<N, any> {
  private busy?: boolean;
  private buf = [] as N[];
  private closing?: qr.Subscription;

  constructor(t: qr.Subscriber<N[]>, private close: () => qt.Source<any>) {
    super(t);
    this.openBuf();
  }

  protected _next(n: N) {
    this.buf.push(n);
  }

  protected _done() {
    const b = this.buf;
    if (b) this.tgt.next(b);
    super._done();
  }

  _unsubscribe() {
    this.buf = [];
    this.busy = false;
  }

  reactNext() {
    this.openBuf();
  }

  reactDone() {
    if (this.busy) this.done();
    else this.openBuf();
  }

  openBuf() {
    let s = this.closing;
    if (s) {
      this.remove(s);
      s.unsubscribe();
    }
    const b = this.buf;
    if (b.length) this.tgt.next(b);
    this.buf = [];
    let closer;
    try {
      closer = this.close();
    } catch (e) {
      return this.fail(e);
    }
    this.closing = s = new qr.Subscription();
    this.add(s);
    this.busy = true;
    s.add(this.subscribeTo(closer));
    this.busy = false;
  }
}

export function concatMap<N, R extends qt.Input<any>>(
  project: (n: N, index: number) => R
): qt.Lifter<N, qt.Sourced<R>> {
  return mergeMap(project, 1);
}

export function concatMapTo<N, R extends qt.Input<any>>(
  to: R
): qt.Lifter<N, qt.Sourced<R>> {
  return concatMap(() => to);
}

export function exhaust<N>(): qt.Lifter<qt.Input<N>, N>;
export function exhaust<N>(): qt.Lifter<any, N> {
  return x => x.lift(new ExhaustO<N>());
}

class ExhaustO<N> implements qt.Operator<N, N> {
  call(r: qr.Subscriber<N>, s: qt.Source<N>) {
    return s.subscribe(new ExhaustR(r));
  }
}

class ExhaustR<N> extends qr.Reactor<N, N> {
  private ready?: boolean;
  private busy?: boolean;

  constructor(t: qr.Subscriber<N>) {
    super(t);
  }

  protected _next(n: N) {
    if (!this.busy) {
      this.busy = true;
      this.add(this.subscribeTo(n));
    }
  }

  protected _done() {
    this.ready = true;
    if (!this.busy) this.tgt.done();
  }

  reactDone(s?: qr.Subscription) {
    if (s) {
      this.remove(s);
      this.busy = false;
      if (this.ready) this.tgt.done();
    }
  }
}

export function exhaustMap<N, R extends qt.Input<any>>(
  project: (n: N, index: number) => R
): qt.Lifter<N, qt.Sourced<R>> {
  return x => x.lift(new ExhaustMapO(project));
}

class ExhaustMapO<N, R> implements qt.Operator<N, R> {
  constructor(private project: (n: N, index: number) => qt.Input<R>) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new ExhaustMapR(r, this.project));
  }
}

class ExhaustMapR<N, R> extends qr.Reactor<N, R> {
  private ready?: boolean;
  private busy?: boolean;
  private i = 0;

  constructor(
    t: qr.Subscriber<R>,
    private project: (n: N, index: number) => qt.Input<R>
  ) {
    super(t);
  }

  protected _next(n: N) {
    if (!this.busy) this.tryNext(n);
  }

  protected _done() {
    this.ready = true;
    if (!this.busy) this.tgt.done();
    this.unsubscribe();
  }

  reactNext(_: N, r: R) {
    this.tgt.next(r);
  }

  reactFail(e: any) {
    this.tgt.fail(e);
  }

  reactDone(s: qr.Actor<R, N>) {
    (this.tgt as qr.Subscriber<R>).remove(s);
    this.busy = false;
    if (this.ready) this.tgt.done();
  }

  private tryNext(n: N) {
    let x: qt.Input<R>;
    const i = this.i++;
    try {
      x = this.project(n, i);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.busy = true;
    const a = new qr.Actor(this, n, i);
    const r = this.tgt as qr.Subscriber<R>;
    r.add(a);
    const s = this.subscribeTo(x, undefined, undefined, a);
    if (s !== a) r.add(s);
  }
}

export function expand<N>(
  project: (n: N, index: number) => qt.Input<N>,
  max?: number,
  h?: qt.Scheduler
): qt.Shifter<N>;
export function expand<N, R>(
  project: (n: N, index: number) => qt.Input<R>,
  max = Number.POSITIVE_INFINITY,
  h?: qt.Scheduler
): qt.Lifter<N, R> {
  max = (max ?? 0) < 1 ? Number.POSITIVE_INFINITY : max;
  return x => x.lift(new ExpandO(project, max, h));
}

class ExpandO<N, R> implements qt.Operator<N, R> {
  constructor(
    private project: (n: N, index: number) => qt.Input<R>,
    private max: number,
    private h?: qt.Scheduler
  ) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new ExpandR(r, this.project, this.max, this.h));
  }
}

class ExpandR<N, R> extends qr.Reactor<N, R> {
  private idx = 0;
  private active = 0;
  private ready?: boolean;
  private buf?: any[];

  constructor(
    t: qr.Subscriber<R>,
    private project: (n: N, i: number) => qt.Input<R>,
    private max: number,
    private h?: qt.Scheduler
  ) {
    super(t);
    if (max < Number.POSITIVE_INFINITY) this.buf = [];
  }

  protected _next(n: N) {
    const t = this.tgt as qr.Subscriber<R>;
    if (t.closed) {
      this._done();
      return;
    }
    const i = this.idx++;
    interface Expand<N, R> extends qt.Nstate<N> {
      res: qt.Input<R>;
      n: N;
      i: number;
    }
    function dispatch(s?: Expand<N, R>) {
      const {r, res, n, i} = s!;
      (r as ExpandR<N, R>).subscribeToProj(res, n, i);
    }
    if (this.active < this.max) {
      t.next(n);
      try {
        const res = this.project(n, i);
        if (this.h) {
          const s = {r: this as qt.Subscriber<N>, res, n, i} as Expand<N, R>;
          t.add(this.h.schedule<Expand<N, R>>(dispatch, s));
        } else this.subscribeToProj(res, n, i);
      } catch (e) {
        t.fail(e);
      }
    } else this.buf!.push(n);
  }

  protected _done() {
    this.ready = true;
    if (this.ready && this.active === 0) this.tgt.done();
    this.unsubscribe();
  }

  reactNext(_: N, r: R) {
    this._next(r);
  }

  reactDone(a: qr.Actor<R, N>) {
    const t = this.tgt as qr.Subscriber<R>;
    t.remove(a);
    this.active--;
    const b = this.buf;
    if (b && b.length) this._next(b.shift());
    if (this.ready && this.active === 0) t.done();
  }

  private subscribeToProj(res: any, n: N, i: number) {
    this.active++;
    (this.tgt as qr.Subscriber<R>).add(this.subscribeTo(res, n, i));
  }
}

export function groupBy<N, K>(keySelector: (n: N) => K): qt.Lifter<N, qs.Grouped<K, T>>;
export function groupBy<N, K>(
  keySelector: (n: N) => K,
  elementSelector: void,
  durationSelector: (grouped: qs.Grouped<K, T>) => qt.Source<any>
): qt.Lifter<N, qs.Grouped<K, T>>;
export function groupBy<N, K, R>(
  keySelector: (n: N) => K,
  elementSelector?: (n: N) => R,
  durationSelector?: (grouped: qs.Grouped<K, R>) => qt.Source<any>
): qt.Lifter<N, qs.Grouped<K, R>>;
export function groupBy<N, K, R>(
  keySelector: (n: N) => K,
  elementSelector?: (n: N) => R,
  durationSelector?: (grouped: qs.Grouped<K, R>) => qt.Source<any>,
  subjectSelector?: () => qj.Subject<R>
): qt.Lifter<N, qs.Grouped<K, R>>;
export function groupBy<N, K, R>(
  keySelector: (n: N) => K,
  elementSelector?: ((n: N) => R) | void,
  durationSelector?: (grouped: qs.Grouped<K, R>) => qt.Source<any>,
  subjectSelector?: () => qj.Subject<R>
): qt.Lifter<N, qs.Grouped<K, R>> {
  return x =>
    x.lift(new GroupByO(keySelector, elementSelector, durationSelector, subjectSelector));
}

class GroupByO<N, K, R> implements qt.Operator<N, qs.Grouped<K, R>> {
  constructor(
    private keySelector: (n: N) => K,
    private elementSelector?: ((n: N) => R) | void,
    private durationSelector?: (grouped: qs.Grouped<K, R>) => qt.Source<any>,
    private subjectSelector?: () => qj.Subject<R>
  ) {}
  call(r: qr.Subscriber<qs.Grouped<K, R>>, s: qt.Source<N>): any {
    return s.subscribe(
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

class GroupByR<N, K, M> extends qr.Subscriber<N> implements qt.RefCounted {
  private groups?: Map<K, qj.Subject<N | M>>;
  public attempted = false;
  public count = 0;

  constructor(
    t: qr.Subscriber<qs.Grouped<K, R>>,
    private keySelector: (n: N) => K,
    private elementSelector?: ((n: N) => R) | void,
    private durationSelector?: (grouped: qs.Grouped<K, R>) => qt.Source<any>,
    private subjectSelector?: () => qj.Subject<R>
  ) {
    super(t);
  }

  protected _next(n: N) {
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
        element = this.elementSelector(n);
      } catch (e) {
        this.fail(e);
      }
    } else element = n as any;
    if (!group) {
      group = (this.subjectSelector
        ? this.subjectSelector()
        : new qj.Subject<R>()) as qj.Subject<T | R>;
      groups.set(key, group);
      const groupedObservable = new qs.Grouped(key, group, this);
      this.tgt.next(groupedObservable);
      if (this.durationSelector) {
        let duration: any;
        try {
          duration = this.durationSelector(
            new qs.Grouped<K, R>(key, <qj.Subject<R>>group)
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

  protected _fail(e: any) {
    const groups = this.groups;
    if (groups) {
      groups.forEach(g => g.fail(f));
      groups.clear();
    }
    this.tgt.fail(e);
  }

  protected _done() {
    const groups = this.groups;
    if (groups) {
      groups.forEach(group => group.done());
      groups.clear();
    }
    this.tgt.done();
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

export function map<N, R>(
  project: (n: N, index: number) => R,
  thisArg?: any
): qt.Lifter<N, R> {
  return x => x.lift(new MapO(project, thisArg));
}

class MapO<N, R> implements qt.Operator<N, R> {
  constructor(private project: (n: N, index: number) => R, private thisArg: any) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>): any {
    return s.subscribe(new MapR(r, this.project, this.thisArg));
  }
}

class MapR<N, R> extends qr.Subscriber<N> {
  count = 0;
  private thisArg: any;

  constructor(
    t: qr.Subscriber<R>,
    private project: (n: N, i: number) => R,
    thisArg: any
  ) {
    super(t);
    this.thisArg = thisArg || this;
  }

  protected _next(n: N) {
    let r: R;
    try {
      r = this.project.call(this.thisArg, n, this.count++);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.next(r);
  }
}

export function mapTo<R>(r: R): qt.Lifter<any, R> {
  return x => x.lift(new MapToO(r));
}

class MapToO<N, R> implements qt.Operator<N, R> {
  constructor(public r: R) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new MapToR(r, this.r));
  }
}

class MapToR<N, R> extends qr.Subscriber<N> {
  constructor(t: qr.Subscriber<R>, public r: R) {
    super(t);
  }
  protected _next(_n: N) {
    this.tgt.next(this.r);
  }
}

export function mergeMap<N, O extends qt.Input<any>>(
  project: (n: N, index: number) => O,
  concurrent?: number
): qt.Lifter<N, qt.Sourced<R>> {
  return x => x.lift(new MergeMapO(project, concurrent));
}

class MergeMapO<N, R> implements qt.Operator<N, R> {
  constructor(
    private project: (n: N, index: number) => qt.Input<R>,
    private concurrent: number = Number.POSITIVE_INFINITY
  ) {}

  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new MergeMapR(r, this.project, this.concurrent));
  }
}

class MergeMapR<N, R> extends qr.Reactor<N, R> {
  private ready = false;
  private buffer: N[] = [];
  private active = 0;
  protected index = 0;

  constructor(
    t: qr.Subscriber<R>,
    private project: (n: N, index: number) => qt.Input<R>,
    private concurrent = Number.POSITIVE_INFINITY
  ) {
    super(t);
  }

  protected _next(n: N) {
    if (this.active < this.concurrent) this._tryNext(n);
    else this.buffer.push(n);
  }

  protected _tryNext(n: N) {
    let result: qt.Input<R>;
    const index = this.index++;
    try {
      result = this.project(n, index);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.active++;
    this._innerSub(result, n, index);
  }

  private _innerSub(ish: qt.Input<R>, n: N, index: number) {
    const innerSubscriber = new ActorSubscriber(this, value, index);
    const tgt = this.tgt as qr.Subscription;
    tgt.add(innerSubscriber);
    const innerSubscription = this.subscribeTo(
      ish,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) tgt.add(innerSubscription);
  }

  protected _done() {
    this.ready = true;
    if (this.active === 0 && this.buffer.length === 0) this.tgt.done();
    this.unsubscribe();
  }

  reactNext(outerN: T, innerValue: R) {
    this.tgt.next(innerValue);
  }

  reactDone(innerSub: qr.Subscription) {
    const buffer = this.buffer;
    this.remove(innerSub);
    this.active--;
    if (buffer.length > 0) {
      this._next(buffer.shift()!);
    } else if (this.active === 0 && this.ready) {
      this.tgt.done();
    }
  }
}

export function mergeMapTo<O extends qt.Input<any>>(
  innerObservable: O,
  concurrent?: number
): qt.Lifter<any, qt.Sourced<R>> {
  return mergeMap(() => innerObservable, concurrent);
}

export function mergeScan<N, R>(
  acc: (acc: R, n: N, index: number) => qt.Input<R>,
  seed: R,
  concurrent: number = Number.POSITIVE_INFINITY
): qt.Lifter<N, R> {
  return x => x.lift(new MergeScanO(acc, seed, concurrent));
}

class MergeScanO<N, R> implements qt.Operator<N, R> {
  constructor(
    private acc: (acc: R, n: N, index: number) => qt.Input<R>,
    private seed: R,
    private concurrent: number
  ) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new MergeScanR(r, this.acc, this.seed, this.concurrent));
  }
}

class MergeScanR<N, R> extends qr.Reactor<N, R> {
  private hasValue = false;
  private ready = false;
  private buffer: qt.Source<any>[] = [];
  private active = 0;
  protected index = 0;

  constructor(
    t: qr.Subscriber<R>,
    private acc: (acc: R, n: N, index: number) => qt.Input<R>,
    private acc: R,
    private concurrent: number
  ) {
    super(t);
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
    const tgt = this.tgt as qr.Subscription;
    tgt.add(innerSubscriber);
    const innerSubscription = this.subscribeTo(
      ish,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      tgt.add(innerSubscription);
    }
  }

  protected _done() {
    this.ready = true;
    if (this.active === 0 && this.buffer.length === 0) {
      if (this.hasValue === false) {
        this.tgt.next(this.acc);
      }
      this.tgt.done();
    }
    this.unsubscribe();
  }

  reactNext(outerN: N, innerValue: R) {
    const {tgt} = this;
    this.acc = innerValue;
    this.hasValue = true;
    tgt.next(innerValue);
  }

  reactDone(innerSub: qr.Subscription) {
    const buffer = this.buffer;
    const tgt = this.tgt as qr.Subscription;
    tgt.remove(innerSub);
    this.active--;
    if (buffer.length > 0) {
      this._next(buffer.shift());
    } else if (this.active === 0 && this.ready) {
      if (this.hasValue === false) {
        this.tgt.next(this.acc);
      }
      this.tgt.done();
    }
  }
}

export function pairs<T>(obj: Object, h?: qh.Scheduler): qs.Source<[string, T]> {
  function dispatch(
    this: qh.Action<any>,
    state: {
      keys: string[];
      index: number;
      subscriber: qr.Subscriber<[string, T]>;
      subscription: qr.Subscription;
      obj: Object;
    }
  ) {
    const {keys, index, subscriber, subscription, obj} = state;
    if (!subscriber.closed) {
      if (index < keys.length) {
        const key = keys[index];
        subscriber.next([key, (obj as any)[key]]);
        subscription.add(
          this.schedule({keys, index: index + 1, subscriber, subscription, obj})
        );
      } else {
        subscriber.done();
      }
    }
  }
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
      const subscription = new qr.Subscription();
      subscription.add(
        h.schedule<{
          keys: string[];
          index: number;
          r: qr.Subscriber<[string, T]>;
          subscription: qr.Subscription;
          obj: Object;
        }>(dispatch as any, {keys, index: 0, r, subscription, obj})
      );
      return subscription;
    });
  }
}

export function pairwise<N>(): qt.Lifter<N, [N, N]> {
  return x => x.lift(new PairwiseO());
}

class PairwiseO<N> implements qt.Operator<N, [N, N]> {
  call(r: qr.Subscriber<[N, N]>, s: qt.Source<N>) {
    return s.subscribe(new PairwiseR(r));
  }
}

class PairwiseR<N> extends qr.Subscriber<N> {
  private prev: N | undefined;
  private hasPrev = false;

  constructor(t: qr.Subscriber<[N, N]>) {
    super(t);
  }

  _next(n: N) {
    let pair: [N, N] | undefined;
    if (this.hasPrev) pair = [this.prev!, n];
    else this.hasPrev = true;
    this.prev = n;
    if (pair) this.tgt.next(pair);
  }
}

export function partition<N>(
  pred: (n: N, index: number) => boolean,
  thisArg?: any
): qt.Mapper<qt.Source<N>, [qt.Source<N>, qt.Source<N>]> {
  return x =>
    [filter(pred, thisArg)(x), filter(qt.not(pred, thisArg) as any)(x)] as [
      qt.Source<N>,
      qt.Source<N>
    ];
}

export function partition<N>(
  source: qt.Input<N>,
  pred: (n: N, index: number) => boolean,
  thisArg?: any
): [qt.Source<N>, qt.Source<N>] {
  return [
    filter(pred, thisArg)(new qs.Source<N>(qr.subscribeTo(source))),
    filter(qt.not(pred, thisArg) as any)(new qs.Source<N>(qr.subscribeTo(source)))
  ] as [qt.Source<N>, qt.Source<N>];
}

export function pluck<N, K1 extends keyof N>(k1: K1): qt.Lifter<N, N[K1]>;
export function pluck<N, K1 extends keyof N, K2 extends keyof N[K1]>(
  k1: K1,
  k2: K2
): qt.Lifter<N, N[K1][K2]>;
export function pluck<
  N,
  K1 extends keyof N,
  K2 extends keyof N[K1],
  K3 extends keyof N[K1][K2]
>(k1: K1, k2: K2, k3: K3): qt.Lifter<N, N[K1][K2][K3]>;
export function pluck<
  N,
  K1 extends keyof N,
  K2 extends keyof N[K1],
  K3 extends keyof N[K1][K2],
  K4 extends keyof N[K1][K2][K3]
>(k1: K1, k2: K2, k3: K3, k4: K4): qt.Lifter<N, N[K1][K2][K3][K4]>;
export function pluck<
  N,
  K1 extends keyof N,
  K2 extends keyof N[K1],
  K3 extends keyof N[K1][K2],
  K4 extends keyof N[K1][K2][K3],
  K5 extends keyof N[K1][K2][K3][K4]
>(k1: K1, k2: K2, k3: K3, k4: K4, k5: K5): qt.Lifter<N, N[K1][K2][K3][K4][K5]>;
export function pluck<
  N,
  K1 extends keyof N,
  K2 extends keyof N[K1],
  K3 extends keyof N[K1][K2],
  K4 extends keyof N[K1][K2][K3],
  K5 extends keyof N[K1][K2][K3][K4],
  K6 extends keyof N[K1][K2][K3][K4][K5]
>(
  k1: K1,
  k2: K2,
  k3: K3,
  k4: K4,
  k5: K5,
  k6: K6
): qt.Lifter<N, N[K1][K2][K3][K4][K5][K6]>;
export function pluck<
  N,
  K1 extends keyof N,
  K2 extends keyof N[K1],
  K3 extends keyof N[K1][K2],
  K4 extends keyof N[K1][K2][K3],
  K5 extends keyof N[K1][K2][K3][K4],
  K6 extends keyof N[K1][K2][K3][K4][K5]
>(k1: K1, k2: K2, k3: K3, k4: K4, k5: K5, k6: K6, ..._: string[]): qt.Lifter<N, unknown>;
export function pluck<N>(..._: string[]): qt.Lifter<N, unknown>;
export function pluck<N, R>(...args: Array<string | number | symbol>): qt.Lifter<N, R> {
  const length = args.length;
  if (length === 0) throw new Error('properties needed');
  return map((x: any) => {
    for (let i = 0; i < length; i++) {
      const p = x[args[i]];
      if (typeof p !== 'undefined') x = p;
      else return;
    }
    return x;
  });
}

export function scan<N, R = N>(
  acc: (a: N | R, n: N, i: number) => R
): qt.Lifter<N, N | R>;
export function scan<N, R>(acc: (a: R, n: N, i: number) => R, seed: R): qt.Lifter<N, R>;
export function scan<N, R, S>(
  acc: (a: R | S, n: N, i: number) => R,
  seed: S
): qt.Lifter<N, R>;
export function scan<N, R, S>(
  acc: (a: N | R | S, n: N, i: number) => R,
  seed?: S
): qt.Lifter<N, N | R> {
  let hasSeed = false;
  if (arguments.length >= 2) hasSeed = true;
  return x => x.lift(new ScanO(acc, seed, hasSeed));
}

class ScanO<N, R, S> implements qt.Operator<N, R> {
  constructor(
    private acc: (acc: N | R | S, n: N, i: number) => R,
    private seed?: S,
    private hasSeed = false
  ) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new ScanR(r, this.acc, this.seed, this.hasSeed));
  }
}

class ScanR<N, R, S> extends qr.Subscriber<N> {
  private index = 0;

  constructor(
    tgt: qr.Subscriber<R>,
    private acc: (acc: N | R | S, n: N | undefined, i: number) => R,
    private _state: any,
    private _hasState: boolean
  ) {
    super(tgt);
  }

  protected _next(n: N) {
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

export function switchMap<N, R extends qt.Input<any>>(
  project: (n: N, i: number) => R
): qt.Lifter<N, qt.Sourced<R>> {
  return x => x.lift(new SwitchMapO(project));
}

class SwitchMapO<N, R> implements qt.Operator<N, R> {
  constructor(private project: (n: N, i: number) => qt.Input<R>) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new SwitchMapR(r, this.project));
  }
}

class SwitchMapR<N, R> extends qr.Reactor<N, R> {
  private index = 0;
  private innerSubscription?: qr.Subscription;

  constructor(
    t: qr.Subscriber<R>,
    private project: (n: N | undefined, i: number) => qt.Input<R>
  ) {
    super(t);
  }

  protected _next(n: N) {
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

  private _innerSub(result: qt.Input<R>, n: N, i: number) {
    const innerSubscription = this.innerSubscription;
    if (innerSubscription) innerSubscription.unsubscribe();
    const innerSubscriber = new qr.Actor(this, n, i);
    const tgt = this.tgt as qr.Subscription;
    tgt.add(innerSubscriber);
    this.innerSubscription = this.subscribeTo(
      result,
      undefined,
      undefined,
      innerSubscriber
    );
    if (this.innerSubscription !== innerSubscriber) tgt.add(this.innerSubscription);
  }

  protected _done() {
    const {innerSubscription} = this;
    if (!innerSubscription || innerSubscription.closed) super._done();
    this.unsubscribe();
  }

  protected _unsubscribe() {
    this.innerSubscription = null!;
  }

  reactDone(innerSub: qr.Subscription) {
    const tgt = this.tgt as qr.Subscription;
    tgt.remove(innerSub);
    this.innerSubscription = null!;
    if (this.stopped) super._done();
  }

  reactNext(outerN: N, innerValue: R) {
    this.tgt.next(innerValue);
  }
}

export function switchMapTo<R>(observable: qt.Input<R>): qt.Lifter<any, R> {
  return switchMap(() => observable);
}

export function switchAll<N>(): qt.Lifter<qt.Input<N>, T>;
export function switchAll<R>(): qt.Lifter<any, R>;
export function switchAll<N>(): qt.Lifter<qt.Input<N>, T> {
  return switchMap(identity);
}

export function window<N>(windowBoundaries: qt.Source<any>): qt.Lifter<N, qt.Source<N>> {
  return x => x.lift(new WindowO(windowBoundaries));
}

class WindowO<N> implements qt.Operator<N, qt.Source<N>> {
  constructor(private windowBoundaries: qt.Source<any>) {}

  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>) {
    const windowSubscriber = new WindowR(r);
    const sourceSubscription = s.subscribe(windowSubscriber);
    if (!sourceSubscription.closed) {
      windowSubscriber.add(windowSubscriber.subscribeTo(this.windowBoundaries));
    }
    return sourceSubscription;
  }
}

class WindowR<N> extends qr.Reactor<N, any> {
  private window: qj.Subject<N> = new qj.Subject<N>();

  constructor(tgt: qr.Subscriber<qt.Source<N>>) {
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

  protected _next(n: N) {
    this.window.next(n);
  }

  protected _fail(e: any) {
    this.window.fail(e);
    this.tgt.fail(e);
  }

  protected _done() {
    this.window.done();
    this.tgt.done();
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
    const newWindow = (this.window = new qj.Subject<N>());
    tgt.next(newWindow);
  }
}

export function windowCount<N>(
  windowSize: number,
  startWindowEvery: number = 0
): qt.Lifter<N, qt.Source<N>> {
  return x => x.lift(new WindowCountO<N>(windowSize, startWindowEvery));
}

class WindowCountO<N> implements qt.Operator<N, qt.Source<N>> {
  constructor(private windowSize: number, private startWindowEvery: number) {}
  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>) {
    return s.subscribe(new WindowCountR(r, this.windowSize, this.startWindowEvery));
  }
}

class WindowCountR<N> extends qr.Subscriber<N> {
  private windows: qj.Subject<N>[] = [new qj.Subject<N>()];
  private count: number = 0;

  constructor(
    protected t: qr.Subscriber<qt.Source<N>>,
    private windowSize: number,
    private startWindowEvery: number
  ) {
    super(t);
    t.next(this.windows[0]);
  }

  protected _next(n: N) {
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
      const window = new qj.Subject<N>();
      windows.push(window);
      tgt.next(window);
    }
  }

  protected _fail(e: any) {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.fail(e);
      }
    }
    this.tgt.fail(e);
  }

  protected _done() {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.done();
      }
    }
    this.tgt.done();
  }

  _unsubscribe() {
    this.count = 0;
    this.windows = null!;
  }
}

export function windowTime<N>(
  windowTimeSpan: number,
  scheduler?: qt.Scheduler
): qt.Lifter<N, qt.Source<N>>;
export function windowTime<N>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  scheduler?: qt.Scheduler
): qt.Lifter<N, qt.Source<N>>;
export function windowTime<N>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  maxWindowSize: number,
  scheduler?: qt.Scheduler
): qt.Lifter<N, qt.Source<N>>;
export function windowTime<N>(windowTimeSpan: number): qt.Lifter<N, qt.Source<N>> {
  let scheduler: qt.Scheduler = qh.async;
  let windowCreationInterval: number = null;
  let maxWindowSize: number = Number.POSITIVE_INFINITY;
  if (qt.isScheduler(arguments[3])) {
    scheduler = arguments[3];
  }
  if (qt.isScheduler(arguments[2])) {
    scheduler = arguments[2];
  } else if (qt.isNumeric(arguments[2])) {
    maxWindowSize = Number(arguments[2]);
  }
  if (qt.isScheduler(arguments[1])) {
    scheduler = arguments[1];
  } else if (qt.isNumeric(arguments[1])) {
    windowCreationInterval = Number(arguments[1]);
  }
  return x =>
    x.lift(
      new WindowTimeO<N>(windowTimeSpan, windowCreationInterval, maxWindowSize, scheduler)
    );
}

class WindowTimeO<N> implements qt.Operator<N, qt.Source<N>> {
  constructor(
    private windowTimeSpan: number,
    private windowCreationInterval: number,
    private maxWindowSize: number,
    private scheduler: qt.Scheduler
  ) {}

  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>): any {
    return s.subscribe(
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

interface CreationState<N> {
  windowTimeSpan: number;
  windowCreationInterval: number;
  subscriber: WindowTimeR<N>;
  scheduler: qt.Scheduler;
}

interface TimeSpanOnlyState<N> {
  window: CountedSubject<N>;
  windowTimeSpan: number;
  subscriber: WindowTimeR<N>;
}

interface CloseWindowContext<N> {
  action: qt.Action<CreationState<N>>;
  subscription: qr.Subscription;
}

interface CloseState<N> {
  subscriber: WindowTimeR<N>;
  window: CountedSubject<N>;
  context: CloseWindowContext<N>;
}

class CountedSubject<N> extends qj.Subject<N> {
  private _numberOfNextedValues: number = 0;
  next(n: N) {
    this._numberOfNextedValues++;
    super.next(n);
  }
  get numberOfNextedValues(): number {
    return this._numberOfNextedValues;
  }
}

class WindowTimeR<N> extends qr.Subscriber<N> {
  private windows: CountedSubject<N>[] = [];

  constructor(
    protected t: qr.Subscriber<qt.Source<N>>,
    windowTimeSpan: number,
    windowCreationInterval: number,
    private maxWindowSize: number,
    scheduler: qt.Scheduler
  ) {
    super(t);

    const window = this.openWindow();
    if (windowCreationInterval !== null && windowCreationInterval >= 0) {
      const closeState: CloseState<N> = {
        subscriber: this,
        window,
        context: null!
      };
      const creationState: CreationState<N> = {
        windowTimeSpan,
        windowCreationInterval,
        subscriber: this,
        scheduler
      };
      this.add(
        scheduler.schedule<CloseState<N>>(
          dispatchWindowClose as any,
          windowTimeSpan,
          closeState
        )
      );
      this.add(
        scheduler.schedule<CreationState<N>>(
          dispatchWindowCreation as any,
          windowCreationInterval,
          creationState
        )
      );
    } else {
      const timeSpanOnlyState: TimeSpanOnlyState<N> = {
        subscriber: this,
        window,
        windowTimeSpan
      };
      this.add(
        scheduler.schedule<TimeSpanOnlyState<N>>(
          dispatchWindowTimeSpanOnly as any,
          windowTimeSpan,
          timeSpanOnlyState
        )
      );
    }
  }

  protected _next(n: N) {
    const windows =
      this.maxWindowSize < Number.POSITIVE_INFINITY ? this.windows.slice() : this.windows;
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

  protected _fail(e: any) {
    const ws = this.windows;
    while (ws.length) {
      ws.shift()!.fail(e);
    }
    this.tgt.fail(e);
  }

  protected _done() {
    const ws = this.windows;
    while (ws.length) {
      ws.shift()!.done();
    }
    this.tgt.done();
  }

  public openWindow(): CountedSubject<N> {
    const w = new CountedSubject<N>();
    this.windows.push(w);
    const tgt = this.tgt;
    tgt.next(w);
    return w;
  }

  public closeWindow(w: CountedSubject<N>) {
    const i = this.windows.indexOf(w);
    if (i >= 0) {
      w.done();
      this.windows.splice(i, 1);
    }
  }
}

function dispatchWindowTimeSpanOnly<N>(
  this: qt.Action<TimeSpanOnlyState<N>>,
  state: TimeSpanOnlyState<N>
) {
  const {subscriber, windowTimeSpan, window} = state;
  if (window) subscriber.closeWindow(window);
  state.window = subscriber.openWindow();
  this.schedule(state, windowTimeSpan);
}

function dispatchWindowCreation<N>(
  this: qt.Action<CreationState<N>>,
  state: CreationState<N>
) {
  const {windowTimeSpan, subscriber, scheduler, windowCreationInterval} = state;
  const window = subscriber.openWindow();
  const action = this;
  let context: CloseWindowContext<N> = {action, subscription: null!};
  const timeSpanState: CloseState<N> = {subscriber, window, context};
  context.subscription = scheduler.schedule<CloseState<N>>(
    dispatchWindowClose as any,
    windowTimeSpan,
    timeSpanState
  );
  action.add(context.subscription);
  action.schedule(state, windowCreationInterval);
}

function dispatchWindowClose<N>(this: qt.Action<CloseState<N>>, state: CloseState<N>) {
  const {subscriber, window, context} = state;
  if (context && context.action && context.subscription) {
    context.action.remove(context.subscription);
  }
  subscriber.closeWindow(window);
}

export function windowToggle<N, R>(
  open: qt.Source<R>,
  closing: (openValue: R) => qt.Source<any>
): qt.Lifter<N, qt.Source<N>> {
  return x => x.lift(new WindowToggleO<N, R>(open, closing));
}

class WindowToggleO<N, R> implements qt.Operator<N, qt.Source<N>> {
  constructor(
    private open: qt.Source<R>,
    private closing: (openValue: R) => qt.Source<any>
  ) {}

  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>) {
    return s.subscribe(new WindowToggleR(r, this.open, this.closing));
  }
}

interface WindowContext<N> {
  window: qj.Subject<N>;
  subscription: qr.Subscription;
}

class WindowToggleR<N, R> extends qr.Reactor<N, any> {
  private contexts: WindowContext<N>[] = [];
  private openSubscription?: qr.Subscription;

  constructor(
    t: qr.Subscriber<qt.Source<N>>,
    private open: qt.Source<R>,
    private closing: (openValue: R) => qt.Source<any>
  ) {
    super(t);
    this.add((this.openSubscription = this.subscribeTo(open, open as any)));
  }

  _next(n: N) {
    const {contexts} = this;
    if (contexts) {
      const len = contexts.length;
      for (let i = 0; i < len; i++) {
        contexts[i].window.next(n);
      }
    }
  }

  _fail(e: any) {
    const {contexts} = this;
    this.contexts = null!;
    if (contexts) {
      const len = contexts.length;
      let index = -1;
      while (++index < len) {
        const context = contexts[index];
        context.window.fail(e);
        context.subscription.unsubscribe();
      }
    }
    super._fail(e);
  }

  _done() {
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

  reactNext(outerN: any, innerValue: any) {
    if (outerN === this.open) {
      let closingNotifier;
      try {
        const {closing} = this;
        closingNotifier = closing(innerValue);
      } catch (e) {
        return this.fail(e);
      }
      const window = new qj.Subject<N>();
      const subscription = new qr.Subscription();
      const context = {window, subscription};
      this.contexts.push(context);
      const innerSubscription = qr.subscribeToResult(
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
    this.fail(e);
  }

  reactDone(inner: qr.Subscription) {
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

export function windowWhen<N>(closing: () => qt.Source<any>): qt.Lifter<N, qt.Source<N>> {
  return x => x.lift(new WindowWhenO<N>(closing));
}

class WindowWhenO<N> implements qt.Operator<N, qt.Source<N>> {
  constructor(private closing: () => qt.Source<any>) {}
  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>) {
    return s.subscribe(new WindowWhenR(r, this.closing));
  }
}

class WindowWhenR<N> extends qr.Reactor<N, any> {
  private window: qj.Subject<N> | undefined;
  private closingNote?: qr.Subscription;

  constructor(
    protected tgt: qr.Subscriber<qt.Source<N>>,
    private closing: () => qt.Source<any>
  ) {
    super(tgt);
    this.openWindow();
  }

  reactNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: qr.Actor<N, any>
  ) {
    this.openWindow(innerSub);
  }

  notifyError(error: any, innerSub: qr.Actor<N, any>) {
    this._fail(error);
  }

  reactDone(innerSub: qr.Actor<N, any>) {
    this.openWindow(innerSub);
  }

  protected _next(n: N) {
    this.window!.next(n);
  }

  protected _fail(e: any) {
    this.window!.fail(e);
    this.tgt.fail(e);
    this.unsubscribeClosingNote();
  }

  protected _done() {
    this.window!.done();
    this.tgt.done();
    this.unsubscribeClosingNote();
  }

  private unsubscribeClosingNote() {
    if (this.closingNote) {
      this.closingNote.unsubscribe();
    }
  }

  private openWindow(innerSub: qr.Actor<N, any> = null) {
    if (innerSub) {
      this.remove(innerSub);
      innerSub.unsubscribe();
    }
    const prevWindow = this.window;
    if (prevWindow) prevWindow.done();
    const window = (this.window = new qj.Subject<N>());
    this.tgt.next(window);
    let closingNotifier;
    try {
      const {closing} = this;
      closingNotifier = closing();
    } catch (e) {
      this.tgt.fail(e);
      this.window.fail(e);
      return;
    }
    this.add((this.closingNote = this.subscribeTo(closingNotifier)));
  }
}
