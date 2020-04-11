import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';

export class Subscription implements qt.Subscription {
  public static fake = ((s: Subscription) => {
    s.closed = true;
    return s;
  })(new Subscription());

  public closed = false;
  protected parents?: Subscription[] | Subscription;
  private children?: qt.Subscription[];

  constructor(private close?: qt.Cfun) {}

  add(c?: qt.Closer) {
    if (!c) return Subscription.fake;
    let s = c as Subscription;
    switch (typeof c) {
      case 'function':
        s = new Subscription(c);
        break;
      case 'object':
        if (s === this || s.closed || typeof s.unsubscribe !== 'function') {
          return s;
        } else if (this.closed) {
          s.unsubscribe();
          return s;
        } else if (!(c instanceof Subscription)) {
          s = new Subscription();
          s.children = [c as qt.Subscription];
        }
        break;
      default:
        throw new Error(`invalid closer ${c}`);
    }
    if (!s.parents) s.parents = this;
    else if (Array.isArray(s.parents)) {
      if (s.parents.indexOf(this) !== -1) return s;
      s.parents.push(this);
    } else {
      if (s.parents === this) return s;
      s.parents = [s.parents, this];
    }
    if (this.children) this.children.push(s);
    else this.children = [s];
    return s;
  }

  remove(s: qt.Subscription) {
    const ss = this.children;
    if (ss) {
      const i = ss.indexOf(s);
      if (i !== -1) ss.splice(i, 1);
    }
  }

  unsubscribe() {
    if (this.closed) return;
    this.closed = true;
    if (Array.isArray(this.parents)) this.parents.forEach(p => p.remove(this));
    else this.parents?.remove(this);
    let es = [] as any[];
    try {
      this.close?.call(this);
    } catch (e) {
      if (e instanceof qu.UnsubscribeError) es = es.concat(flatten(e.errors));
      else es.push(e);
    }
    this.children?.forEach(c => {
      try {
        c.unsubscribe();
      } catch (e) {
        if (e instanceof qu.UnsubscribeError) es = es.concat(flatten(e.errors));
        else es.push(e);
      }
    });
    this.parents = this.children = undefined;
    if (es.length) throw new qu.UnsubscribeError(es);
  }
}

function flatten(es: any[]) {
  return es.reduce(
    (es, e) => es.concat(e instanceof qu.UnsubscribeError ? e.errors : e),
    []
  );
}

export class Subscriber<N, F, D> extends Subscription
  implements qt.Subscriber<N, F, D> {
  [Symbol.rxSubscriber]() {
    return this;
  }

  static create<N, F, D>(tgt?: qt.Target<N, F, D>) {
    return new Subscriber<N, F, D>(tgt);
  }

  protected stopped = false;
  protected tgt: Subscriber<N, F, D> | qt.Observer<N, F, D>;

  constructor(tgt?: qt.Target<N, F, D>) {
    super();
    if (!tgt) this.tgt = qu.fakeObserver;
    else {
      if (tgt instanceof Subscriber) {
        this.tgt = tgt;
        tgt.add(this);
      } else {
        this.tgt = new Proxy<N, F, D>(this, tgt);
      }
    }
  }

  next(n?: N) {
    if (!this.stopped) this._next(n);
  }

  fail(f?: F) {
    if (!this.stopped) {
      this.stopped = true;
      this._fail(f);
    }
  }

  done(d?: D) {
    if (!this.stopped) {
      this.stopped = true;
      this._done(d);
    }
  }

  unsubscribe() {
    if (!this.closed) {
      this.stopped = true;
      super.unsubscribe();
    }
  }

  protected _next(n?: N) {
    this.tgt.next(n);
  }

  protected _fail(f?: F) {
    this.tgt.fail(f);
    this.unsubscribe();
  }

  protected _done(d?: D) {
    this.tgt.done(d);
    this.unsubscribe();
  }

  _recycle() {
    const ps = this.parents;
    this.parents = undefined;
    this.unsubscribe();
    this.closed = this.stopped = false;
    this.parents = ps;
    return this;
  }
}

export function toSubscriber<N, F, D>(
  t?: qt.Target<N, F, D> | qt.Ofun<N>,
  fail?: qt.Ofun<F>,
  done?: qt.Ofun<D>
): Subscriber<N, F, D> {
  if (t instanceof Subscriber) return t;
  if (typeof t === 'function') t = {next: t, fail, done};
  else if (t && (t as any)[Symbol.rxSubscriber]) {
    return (t as any)[Symbol.rxSubscriber]();
  }
  if (!t && !fail && !done) return new Subscriber(qu.fakeObserver);
  return new Subscriber(t);
}

export class Proxy<N, F, D> extends Subscriber<N, F, D> {
  private ctx?: any;

  constructor(
    private parent: Subscriber<N, F, D> | undefined,
    private ptgt: qt.Target<N, F, D>
  ) {
    super();
    if (this.ptgt !== qu.fakeObserver) this.ctx = Object.create(this.ptgt);
  }

  next(n?: N) {
    if (!this.stopped) this._call(this.ptgt.next, n);
  }

  fail(f?: F) {
    if (!this.stopped) {
      if (this.ptgt.fail) this._call(this.ptgt.fail, f);
      else qu.hostReportError(f);
      this.unsubscribe();
    }
  }

  done(d?: D) {
    if (!this.stopped) {
      this._call(this.ptgt.done, d);
      this.unsubscribe();
    }
  }

  unsubscribe() {
    const p = this.parent;
    this.ctx = this.parent = undefined;
    p?.unsubscribe();
  }

  private _call(f?: Function, x?: N | F | D) {
    try {
      f?.call(this.ctx, x);
    } catch (e) {
      this.unsubscribe();
      qu.hostReportError(e);
    }
  }
}

export class Inner<N, M, F, D> extends Subscriber<M, F, D> {
  private idx = 0;

  constructor(
    private outer: Outer<N, M, F, D>,
    public outerValue: N,
    public outerIndex: number
  ) {
    super();
  }

  protected _next(m?: M) {
    this.outer.notifyNext(
      this.outerValue,
      m,
      this.outerIndex,
      this.idx++,
      this
    );
  }

  protected _fail(f?: F) {
    this.outer.notifyFail(f, this);
    this.unsubscribe();
  }

  protected _done(d?: D) {
    this.outer.notifyDone(d, this);
    this.unsubscribe();
  }
}

export class Outer<N, M, F, D> extends Subscriber<N, F, D> {
  notifyNext(
    _ov: N,
    n: M | undefined,
    _oi: number,
    _ii: number,
    _is: Inner<N, M, F, D>
  ) {
    this.tgt.next(n);
  }

  notifyFail(f: F | undefined, _: Inner<N, M, F, D>) {
    this.tgt.fail(f);
  }

  notifyDone(d: D | undefined, _: Inner<N, M, F, D>) {
    this.tgt.done(d);
  }
}

export class SubjSubscription<N, F, D> extends Subscription {
  constructor(
    public subj: Subject<N, F, D> | undefined,
    public tgt: qt.Observer<N, F, D>
  ) {
    super();
  }

  unsubscribe() {
    if (this.closed) return;
    this.closed = true;
    const s = this.subj;
    this.subj = undefined;
    const ts = s?.tgts;
    if (!ts || !ts.length || s?.stopped || s?.closed) return;
    const i = ts.indexOf(this.tgt);
    if (i !== -1) ts.splice(i, 1);
  }
}

export class SubjSubscriber<N, F, D> extends Subscriber<N, F, D> {
  constructor(tgt: Subject<N, F, D>) {
    super(tgt);
  }
}

export class Subject<N, F, D> extends qs.Source<N, F, D>
  implements qt.Subject<N, F, D> {
  [Symbol.rxSubscriber](): SubjSubscriber<N, F, D> {
    return new SubjSubscriber(this);
  }

  closed = false;
  stopped = false;
  failed = false;
  thrown?: F;
  tgts = [] as qt.Observer<N, F, D>[];

  _subscribe(s: qt.Subscriber<N, F, D>): qt.Subscription {
    if (this.closed) throw new qu.UnsubscribedError();
    else if (this.failed) {
      s.fail(this.thrown);
      return Subscription.fake;
    } else if (this.stopped) {
      s.done();
      return Subscription.fake;
    } else {
      this.tgts.push(s);
      return new SubjSubscription(this, s);
    }
  }

  _trySubscribe(s: qt.Subscriber<N, F, D>) {
    if (this.closed) throw new qu.UnsubscribedError();
    return super._trySubscribe(s);
  }

  //static create<T>(obs: qt.Observer<T>, src: Observable<T>) {
  //  return new Anonymous<T>(obs, src);
  //}

  lift<M>(o?: qt.Operator<N, M, F, D>): qs.Source<M, F, D> {
    const s = new Anonymous<M, F, D>(this, this);
    s.oper = o;
    return s;
  }

  next(n?: N) {
    if (this.closed) throw new qu.UnsubscribedError();
    if (!this.stopped) this.tgts.slice().forEach(s => s.next(n));
  }

  fail(f?: F) {
    if (this.closed) throw new qu.UnsubscribedError();
    this.failed = true;
    this.thrown = f;
    this.stopped = true;
    this.tgts.slice().forEach(s => s.fail(f));
    this.tgts = [];
  }

  done(d?: D) {
    if (this.closed) throw new qu.UnsubscribedError();
    this.stopped = true;
    this.tgts.slice().forEach(s => s.done(d));
    this.tgts = [];
  }

  unsubscribe() {
    this.stopped = true;
    this.closed = true;
    this.tgts = [];
  }

  asSource() {
    const s = new qs.Source<N, F, D>();
    s.src = this;
    return s;
  }
}

export class Anonymous<N, F, D> extends Subject<N, F, D> {
  constructor(tgt?: qt.Observer<N, F, D>, public src?: qs.Source<N, F, D>) {
    super();
    if (tgt) this.tgts.push(tgt);
  }

  _subscribe(s: qt.Subscriber<N, F, D>) {
    if (this.src) return this.src.subscribe(s);
    return Subscription.fake;
  }
}

export class Async<N, F, D> extends Subject<N, F, D> {
  private ready = false;
  private ended = false;
  private value?: N;

  _subscribe(s: qt.Subscriber<N, F, D>) {
    if (this.failed) {
      s.fail(this.thrown);
      return Subscription.fake;
    } else if (this.ready && this.ended) {
      s.next(this.value);
      s.done();
      return Subscription.fake;
    }
    return super._subscribe(s);
  }

  next(n?: N) {
    if (!this.ended) {
      this.value = n;
      this.ready = true;
    }
  }

  fail(f?: F) {
    if (!this.ended) super.fail(f);
  }

  done(d?: D) {
    this.ended = true;
    if (this.ready) super.next(this.value!);
    super.done(d);
  }
}

export class Behavior<N, F, D> extends Subject<N, F, D> {
  constructor(private value?: N) {
    super();
  }

  _subscribe(s: qt.Subscriber<N, F, D>) {
    const t = super._subscribe(s);
    if (!t.closed) s.next(this.value);
    return t;
  }

  getValue() {
    if (this.failed) throw this.thrown;
    if (this.closed) throw new qu.UnsubscribedError();
    return this.value;
  }

  next(n?: N) {
    this.value = n;
    super.next(n);
  }
}

interface ReplayEvent<T> {
  time: number;
  value?: T;
}

export class Replay<N, F, D> extends Subject<N, F, D> {
  private size: number;
  private time: number;
  private infin = false;
  private events = [] as (ReplayEvent<N> | N | undefined)[];

  constructor(
    size = Number.POSITIVE_INFINITY,
    time = Number.POSITIVE_INFINITY,
    private stamper: qt.TimestampProvider = Date
  ) {
    super();
    this.size = size < 1 ? 1 : size;
    this.time = time < 1 ? 1 : time;
    if (time === Number.POSITIVE_INFINITY) {
      this.infin = true;
      this.next = this.nextInfin;
    } else {
      this.next = this.nextTime;
    }
  }

  _subscribe(s: qt.Subscriber<N, F, D>): Subscription {
    if (this.closed) throw new qu.UnsubscribedError();
    let t: Subscription;
    if (this.stopped || this.failed) t = Subscription.fake;
    else {
      this.tgts.push(s);
      t = new SubjSubscription(this, s);
    }
    const inf = this.infin;
    const es = inf ? this.events : this.trimmedEvents();
    if (inf) {
      es.forEach(e => {
        if (!s.closed) s.next(e as N);
      });
    } else {
      es.forEach(e => {
        if (!s.closed) s.next((e as ReplayEvent<N>).value);
      });
    }
    if (this.failed) s.fail(this.thrown);
    else if (this.stopped) s.done();
    return t;
  }

  private nextInfin(n?: N) {
    const es = this.events;
    es.push(n);
    if (es.length > this.size) es.shift();
    super.next(n);
  }

  private nextTime(value?: N) {
    this.events.push({time: this.now(), value});
    this.trimmedEvents();
    super.next(value);
  }

  private trimmedEvents() {
    const now = this.now();
    const s = this.size;
    const t = this.time;
    const es = this.events;
    const c = es.length;
    let i = 0;
    while (i < c) {
      const d = this.infin ? 0 : (es[i] as any).time;
      if (now - d < t) break;
      i++;
    }
    if (c > s) i = Math.max(i, c - s);
    if (i > 0) es.splice(0, i);
    return es;
  }

  private now() {
    const s = this.stamper;
    return s ? s.now() : Date.now();
  }
}
