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
  max?: number,
  h?: qt.Scheduler
): qt.Lifter<N, R> {
  return x => x.lift(new ExpandO(project, max, h));
}

class ExpandO<N, R> implements qt.Operator<N, R> {
  constructor(
    private project: (n: N, index: number) => qt.Input<R>,
    private max?: number,
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
  private max: number;

  constructor(
    t: qr.Subscriber<R>,
    private project: (n: N, i: number) => qt.Input<R>,
    max?: number,
    private h?: qt.Scheduler
  ) {
    super(t);
    max = max ?? 0;
    max = max < 1 ? Number.POSITIVE_INFINITY : max;
    this.max = max;
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
  project: (n: N, i: number) => R,
  thisArg?: any
): qt.Lifter<N, R> {
  return x => x.lift(new MapO(project, thisArg));
}

class MapO<N, R> implements qt.Operator<N, R> {
  constructor(private project: (n: N, i: number) => R, private thisArg: any) {}
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

export function mergeMap<N, R extends qt.Input<any>>(
  project: (n: N, i: number) => R,
  max?: number
): qt.Lifter<N, qt.Sourced<R>> {
  return x => x.lift(new MergeMapO(project, max));
}

class MergeMapO<N, R> implements qt.Operator<N, R> {
  constructor(
    private project: (n: N, index: number) => qt.Input<R>,
    private max?: number
  ) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new MergeMapR(r, this.project, this.max));
  }
}

class MergeMapR<N, R> extends qr.Reactor<N, R> {
  private ready?: boolean;
  private buf = [] as N[];
  private active = 0;
  protected i = 0;

  constructor(
    t: qr.Subscriber<R>,
    private project: (n: N, index: number) => qt.Input<R>,
    private max = Number.POSITIVE_INFINITY
  ) {
    super(t);
  }

  protected _next(n: N) {
    if (this.active < this.max) this._tryNext(n);
    else this.buf.push(n);
  }

  protected _tryNext(n: N) {
    const i = this.i++;
    let r: qt.Input<R>;
    try {
      r = this.project(n, i);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.active++;
    this.openSub(r, n, i);
  }

  private openSub(res: qt.Input<R>, n: N, i: number) {
    const r = new qr.Actor(this, n, i);
    const t = this.tgt as qr.Subscription;
    t.add(r);
    const s = this.subscribeTo(res, undefined, undefined, r);
    if (s !== r) t.add(s);
  }

  protected _done() {
    this.ready = true;
    if (!this.active && !this.buf.length) this.tgt.done();
    this.unsubscribe();
  }

  reactNext(_: N | undefined, r: R) {
    this.tgt.next(r);
  }

  reactDone(s?: qr.Subscription) {
    if (s) this.remove(s);
    this.active--;
    const b = this.buf;
    if (b.length) this._next(b.shift()!);
    else if (!this.active && this.ready) this.tgt.done();
  }
}

export function mergeMapTo<R extends qt.Input<any>>(
  src: R,
  max?: number
): qt.Lifter<any, qt.Sourced<R>> {
  return mergeMap(() => src, max);
}

export function mergeScan<N, R>(
  acc: (acc: R, n: N, i: number) => qt.Input<R>,
  seed: R,
  max?: number
): qt.Lifter<N, R> {
  return x => x.lift(new MergeScanO(acc, seed, max));
}

class MergeScanO<N, R> implements qt.Operator<N, R> {
  constructor(
    private acc: (acc: R, n: N, i: number) => qt.Input<R>,
    private seed: R,
    private max?: number
  ) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new MergeScanR(r, this.acc, this.seed, this.max));
  }
}

class MergeScanR<N, R> extends qr.Reactor<N, R> {
  private hasR?: boolean;
  private ready?: boolean;
  private bufs = [] as qt.Source<any>[];
  private active = 0;
  protected i = 0;

  constructor(
    t: qr.Subscriber<R>,
    private acc: (acc: R, n: N, i: number) => qt.Input<R>,
    private seed: R,
    private max = Number.POSITIVE_INFINITY
  ) {
    super(t);
  }

  protected _next(value: any) {
    if (this.active < this.max) {
      const i = this.i++;
      let r;
      try {
        r = this.acc(this.seed, value, i);
      } catch (e) {
        return this.tgt.fail(e);
      }
      this.active++;
      this.openSub(r, value, i);
    } else this.bufs.push(value);
  }

  protected _done() {
    this.ready = true;
    if (!this.active && !this.bufs.length) {
      if (!this.hasR) this.tgt.next(this.acc);
      this.tgt.done();
    }
    this.unsubscribe();
  }

  reactNext(_: N, r: R) {
    this.seed = r;
    this.hasR = true;
    this.tgt.next(r);
  }

  reactDone(s?: qr.Subscription) {
    const t = this.tgt as qr.Subscription;
    if (s) t.remove(s);
    this.active--;
    const bs = this.bufs;
    if (bs.length) this._next(bs.shift());
    else if (!this.active && this.ready) {
      if (!this.hasR) this.tgt.next(this.acc);
      this.tgt.done();
    }
  }

  private openSub(res: any, n: N, i: number) {
    const r = new qr.Actor(this, n, i);
    const t = this.tgt as qr.Subscription;
    t.add(r);
    const s = this.subscribeTo(res, undefined, undefined, r);
    if (s !== r) t.add(s);
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

export function scan<N, R = N, S = R>(
  acc: (a: N | R | S | undefined, n: N, i: number) => R,
  seed?: S
): qt.Lifter<N, N | R> {
  const hasSeed = arguments.length >= 2 ? true : false;
  return x => x.lift(new ScanO(acc, seed, hasSeed));
}

class ScanO<N, R, S> implements qt.Operator<N, R> {
  constructor(
    private acc: (acc: N | R | S | undefined, n: N, i: number) => R,
    private seed?: S,
    private hasSeed?: boolean
  ) {}
  call(r: qr.Subscriber<R>, s: qt.Source<N>) {
    return s.subscribe(new ScanR(r, this.acc, this.seed, this.hasSeed));
  }
}

class ScanR<N, R, S> extends qr.Subscriber<N> {
  private i = 0;

  constructor(
    t: qr.Subscriber<R>,
    private acc: (acc: N | R | S | undefined, n: N, i: number) => R,
    private seed?: S,
    private hasSeed = false
  ) {
    super(t);
  }

  protected _next(n: N) {
    if (!this.hasSeed) {
      this.seed = (n as unknown) as S;
      this.hasSeed = true;
      this.tgt.next(n);
    } else {
      const i = this.i++;
      let r: R;
      try {
        r = this.acc(this.seed, n, i);
      } catch (e) {
        this.tgt.fail(e);
        return;
      }
      this.seed = (r as unknown) as S;
      this.tgt.next(r);
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
  private i = 0;
  private sub?: qt.Subscription;

  constructor(t: qr.Subscriber<R>, private project: (n: N, i: number) => qt.Input<R>) {
    super(t);
  }

  protected _next(n: N) {
    let r: qt.Input<R>;
    const i = this.i++;
    try {
      r = this.project(n, i);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.openSub(r, n, i);
  }

  protected _done() {
    const s = this.sub;
    if (!s || s.closed) super._done();
    this.unsubscribe();
  }

  _unsubscribe() {
    this.sub = undefined;
  }

  reactNext(_: N, r: R) {
    this.tgt.next(r);
  }

  reactDone(s?: qr.Subscription) {
    if (s) (this.tgt as qr.Subscription).remove(s);
    this.sub = undefined;
    if (this.stopped) super._done();
  }

  private openSub(res: qt.Input<R>, n: N, i: number) {
    this.sub?.unsubscribe();
    const s = new qr.Actor(this, n, i);
    const t = this.tgt as qr.Subscription;
    t.add(s);
    this.sub = this.subscribeTo(res, undefined, undefined, s);
    if (this.sub !== s) t.add(this.sub);
  }
}

export function switchMapTo<R>(observable: qt.Input<R>): qt.Lifter<any, R> {
  return switchMap(() => observable);
}

export function switchAll<R>(): qt.Lifter<any, R>;
export function switchAll<N>(): qt.Lifter<qt.Input<N>, N> {
  return switchMap(identity);
}

export function window<N>(bounds: qt.Source<any>): qt.Lifter<N, qt.Source<N>> {
  return x => x.lift(new WindowO(bounds));
}

class WindowO<N> implements qt.Operator<N, qt.Source<N>> {
  constructor(private bounds: qt.Source<any>) {}
  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>) {
    const wr = new WindowR(r);
    const ws = s.subscribe(wr);
    if (!ws.closed) wr.add(wr.subscribeTo(this.bounds));
    return ws;
  }
}

class WindowR<N> extends qr.Reactor<N, any> {
  private win?: qj.Subject<N> = new qj.Subject<N>();

  constructor(t: qr.Subscriber<qt.Source<N>>) {
    super(t);
    t.next(this.win!);
  }

  reactNext() {
    this.openWin();
  }

  notifyError(e: any) {
    this._fail(e);
  }

  reactDone() {
    this._done();
  }

  protected _next(n: N) {
    this.win?.next(n);
  }

  protected _fail(e: any) {
    this.win?.fail(e);
    this.tgt.fail(e);
  }

  protected _done() {
    this.win?.done();
    this.tgt.done();
  }

  _unsubscribe() {
    this.win = undefined;
  }

  private openWin() {
    this.win?.done();
    const w = (this.win = new qj.Subject<N>());
    this.tgt.next(w);
  }
}

export function windowCount<N>(size: number, every?: number): qt.Lifter<N, qt.Source<N>> {
  return x => x.lift(new WindowCountO<N>(size, every));
}

class WindowCountO<N> implements qt.Operator<N, qt.Source<N>> {
  constructor(private size: number, private every?: number) {}
  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>) {
    return s.subscribe(new WindowCountR(r, this.size, this.every));
  }
}

class WindowCountR<N> extends qr.Subscriber<N> {
  private wins = [new qj.Subject<N>()] as qj.Subject<N>[];
  private count = 0;

  constructor(t: qr.Subscriber<qt.Source<N>>, private size: number, private every = 0) {
    super(t);
    t.next(this.wins[0]);
  }

  protected _next(n: N) {
    const s = this.size;
    const e = this.every > 0 ? this.every : s;
    const ws = this.wins;
    for (let i = 0; i < ws.length && !this.closed; i++) {
      ws[i].next(n);
    }
    const c = this.count - s + 1;
    if (c >= 0 && c % e === 0 && !this.closed) ws.shift()!.done();
    if (++this.count % e === 0 && !this.closed) {
      const w = new qj.Subject<N>();
      ws.push(w);
      this.tgt.next(w);
    }
  }

  protected _fail(e: any) {
    const ws = this.wins;
    while (ws.length > 0 && !this.closed) {
      ws.shift()!.fail(e);
    }
    this.tgt.fail(e);
  }

  protected _done() {
    const ws = this.wins;
    while (ws.length > 0 && !this.closed) {
      ws.shift()!.done();
    }
    this.tgt.done();
  }

  _unsubscribe() {
    this.wins = [];
    this.count = 0;
  }
}

export function windowTime<N>(
  span: number,
  h: qt.Scheduler = qh.async,
  interval?: number,
  max?: number
): qt.Lifter<N, qt.Source<N>> {
  return x => x.lift(new WindowTimeO<N>(span, h, interval, max));
}

class WindowTimeO<N> implements qt.Operator<N, qt.Source<N>> {
  constructor(
    private span: number,
    private h: qt.Scheduler,
    private interval?: number,
    private max?: number
  ) {}
  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>) {
    return s.subscribe(new WindowTimeR(r, this.h, this.span, this.interval, this.max));
  }
}

class Counted<N> extends qj.Subject<N> {
  private _nCount = 0;
  next(n: N) {
    this._nCount++;
    super.next(n);
  }
  get nCount() {
    return this._nCount;
  }
}

class WindowTimeR<N> extends qr.Subscriber<N> {
  private wins = [] as Counted<N>[];

  constructor(
    t: qr.Subscriber<qt.Source<N>>,
    h: qt.Scheduler,
    span: number,
    interval?: number,
    private max = Number.POSITIVE_INFINITY
  ) {
    super(t);
    const w = this.openWin();
    if (interval && interval >= 0) {
      interface Create extends qt.Nstate<N> {
        span: number;
        interval?: number;
        h: qt.Scheduler;
      }
      interface Pair {
        a: qh.Action<Create>;
        s?: qt.Subscription;
      }
      interface Close extends qt.Nstate<N> {
        w: Counted<N>;
        p?: Pair;
      }
      function close(s?: Close) {
        const {r, w, p} = s!;
        if (p?.a && p.s) p.a.remove(p.s);
        (r as WindowTimeR<N>).closeWin(w);
      }
      const s1 = {r: this as qt.Subscriber<N>, w} as Close;
      this.add(h.schedule<Close>(close, s1, span));
      function create(this: qt.Action<Create>, s?: Create) {
        const {r, span, interval, h} = s!;
        const w = (r as WindowTimeR<N>).openWin();
        const a = this;
        let p = {a} as Pair;
        const t = {r, w, p} as Close;
        p.s = h.schedule<Close>(close, t, span);
        a.add(p.s);
        a.schedule(s, interval);
      }
      const s2 = {r: this as qt.Subscriber<N>, span, interval, h} as Create;
      this.add(h.schedule<Create>(create, s2, interval));
    } else {
      interface SpanOnly extends qt.Nstate<N> {
        w: Counted<N>;
        span: number;
      }
      function spanOnly(this: qt.Action<SpanOnly>, s?: SpanOnly) {
        const {w, span} = s!;
        const r = s!.r as WindowTimeR<N>;
        if (w) r.closeWin(w);
        s!.w = r.openWin();
        this.schedule(s, span);
      }
      const s = {r: this as qt.Subscriber<N>, w, span} as SpanOnly;
      this.add(h.schedule<SpanOnly>(spanOnly, s, span));
    }
  }

  protected _next(n: N) {
    const ws = this.max < Number.POSITIVE_INFINITY ? this.wins.slice() : this.wins;
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      if (!w.closed) {
        w.next(n);
        if (this.max <= w.nCount) this.closeWin(w);
      }
    }
  }

  protected _fail(e: any) {
    const ws = this.wins;
    while (ws.length) {
      ws.shift()!.fail(e);
    }
    this.tgt.fail(e);
  }

  protected _done() {
    const ws = this.wins;
    while (ws.length) {
      ws.shift()!.done();
    }
    this.tgt.done();
  }

  public openWin(): Counted<N> {
    const w = new Counted<N>();
    this.wins.push(w);
    this.tgt.next(w);
    return w;
  }

  public closeWin(w: Counted<N>) {
    const i = this.wins.indexOf(w);
    if (i >= 0) {
      w.done();
      this.wins.splice(i, 1);
    }
  }
}

export function windowToggle<N, R>(
  open: qt.Source<R>,
  close: (_: R) => qt.Source<any>
): qt.Lifter<N, qt.Source<N>> {
  return x => x.lift(new WindowToggleO<N, R>(open, close));
}

class WindowToggleO<N, R> implements qt.Operator<N, qt.Source<N>> {
  constructor(private open: qt.Source<R>, private close: (_: R) => qt.Source<any>) {}
  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>) {
    return s.subscribe(new WindowToggleR(r, this.open, this.close));
  }
}

interface Window<N> extends qt.Nstate<N> {
  win: qj.Subject<N>;
  sub: qr.Subscription;
}

class WindowToggleR<N, R> extends qr.Reactor<N, any> {
  private wins = [] as Window<N>[];
  private openSub?: qt.Subscription;

  constructor(
    t: qr.Subscriber<qt.Source<N>>,
    private open: qt.Source<R>,
    private close: (_: R) => qt.Source<any>
  ) {
    super(t);
    this.add((this.openSub = this.subscribeTo(open, open as any)));
  }

  _next(n: N) {
    const ws = this.wins;
    for (let i = 0; i < ws.length; i++) {
      ws[i].win.next(n);
    }
  }

  _fail(e: any) {
    const ws = this.wins;
    this.wins = [];
    let i = -1;
    while (++i < ws.length) {
      const w = ws[i];
      w.win.fail(e);
      w.sub.unsubscribe();
    }
    super._fail(e);
  }

  _done() {
    const ws = this.wins;
    this.wins = [];
    let i = -1;
    while (++i < ws.length) {
      const w = ws[i];
      w.win.done();
      w.sub.unsubscribe();
    }
    super._done();
  }

  _unsubscribe() {
    const ws = this.wins;
    this.wins = [];
    let i = -1;
    while (++i < ws.length) {
      const w = ws[i];
      w.win.unsubscribe();
      w.sub.unsubscribe();
    }
  }

  reactNext(n: N | undefined, v: any) {
    if (n === this.open) {
      let closer;
      try {
        closer = this.close(v);
      } catch (e) {
        return this.fail(e);
      }
      const win = new qj.Subject<N>();
      const sub = new qr.Subscription();
      const w = {win, sub} as Window<N>;
      this.wins.push(w);
      const s = this.subscribeTo(closer, w as any);
      if (s?.closed) {
        (s as any).window = w;
        sub.add(s);
      } else this.closeWin(this.wins.length - 1);
      this.tgt.next(window);
    } else {
      this.closeWin(this.wins.indexOf(n));
    }
  }

  reactFail(e: any) {
    this.fail(e);
  }

  reactDone(s?: qt.Subscriber<N>) {
    if (s !== this.openSub) {
      this.closeWin(this.wins.indexOf((s as any).window));
    }
  }

  private closeWin(i: number) {
    if (i === -1) return;
    const ws = this.wins;
    const w = ws[i];
    ws.splice(i, 1);
    w.win.done();
    w.sub.unsubscribe();
  }
}

export function windowWhen<N>(close: () => qt.Source<any>): qt.Lifter<N, qt.Source<N>> {
  return x => x.lift(new WindowWhenO<N>(close));
}

class WindowWhenO<N> implements qt.Operator<N, qt.Source<N>> {
  constructor(private close: () => qt.Source<any>) {}
  call(r: qr.Subscriber<qt.Source<N>>, s: qt.Source<N>) {
    return s.subscribe(new WindowWhenR(r, this.close));
  }
}

class WindowWhenR<N> extends qr.Reactor<N, any> {
  private win?: qj.Subject<N>;
  private closer?: qt.Subscription;

  constructor(t: qr.Subscriber<qt.Source<N>>, private close: () => qt.Source<any>) {
    super(t);
    this.openWin();
  }

  protected _next(n: N) {
    this.win?.next(n);
  }

  protected _fail(e: any) {
    this.win?.fail(e);
    this.tgt.fail(e);
    this.unsubCloser();
  }

  protected _done() {
    this.win?.done();
    this.tgt.done();
    this.unsubCloser();
  }

  reactNext(_n: N, _v: any, _ni: number, _vi: number, a: qr.Actor<N, any>) {
    this.openWin(a);
  }

  reactFail(e: any) {
    this._fail(e);
  }

  reactDone(s?: qt.Subscriber<N>) {
    this.openWin(s);
  }

  private unsubCloser() {
    if (this.closer) this.closer.unsubscribe();
  }

  private openWin(s?: qt.Subscriber<N>) {
    if (s) {
      this.remove(s);
      s.unsubscribe();
    }
    this.win?.done();
    const w = (this.win = new qj.Subject<N>());
    this.tgt.next(w);
    let c;
    try {
      c = this.close();
    } catch (e) {
      this.tgt.fail(e);
      this.win.fail(e);
      return;
    }
    this.add((this.closer = this.subscribeTo(c)));
  }
}
