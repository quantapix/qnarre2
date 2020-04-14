import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';

export class Subscription implements qt.Subscription {
  static fake = ((s: Subscription) => {
    s.closed = true;
    return s;
  })(new Subscription());

  closed = false;
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
    (a, e) => a.concat(e instanceof qu.UnsubscribeError ? e.errors : e),
    []
  );
}

const fakeObs = {
  closed: true,
  next(_?: any) {
    /* noop */
  },
  fail(e?: any) {
    qu.delayedThrow(e);
  },
  done(_?: any) {
    /* noop */
  }
} as qt.Observer<any, any, any>;

export class Subscriber<N, F, D> extends Subscription
  implements qt.Subscriber<N, F, D> {
  static create<N, F, D>(tgt?: qt.Target<N, F, D>) {
    return new Subscriber<N, F, D>(tgt);
  }

  [Symbol.rxSubscriber]() {
    return this;
  }
  protected stopped = false;
  protected tgt: Subscriber<N, F, D> | qt.Observer<N, F, D>;

  constructor(tgt?: qt.Target<N, F, D>) {
    super();
    if (!tgt) this.tgt = fakeObs;
    else {
      if (tgt instanceof Subscriber) {
        this.tgt = tgt;
        tgt.add(this);
      } else this.tgt = new Proxy<N, F, D>(this, tgt);
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

export class Proxy<N, F, D> extends Subscriber<N, F, D> {
  private ctx?: any;

  constructor(
    private parent: Subscriber<N, F, D> | undefined,
    private del: qt.Target<N, F, D>
  ) {
    super();
    if (this.del !== fakeObs) this.ctx = Object.create(this.del);
  }

  next(n?: N) {
    if (!this.stopped) this._call(this.del.next, n);
  }

  fail(f?: F) {
    if (!this.stopped) {
      if (this.del.fail) this._call(this.del.fail, f);
      else qu.delayedThrow(f);
      this.unsubscribe();
    }
  }

  done(d?: D) {
    if (!this.stopped) {
      this._call(this.del.done, d);
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
      qu.delayedThrow(e);
    }
  }
}

export class Reactor<N, R, F, D> extends Subscriber<R, F, D> {
  reactNext(_r?: R, n?: N, _ri?: number, _i?: number, _?: Actor<N, R, F, D>) {
    this.tgt.next((n as unknown) as R);
  }

  reactFail(f?: F, _?: Actor<N, R, F, D>) {
    this.tgt.fail(f);
  }

  reactDone(d?: D, _?: Actor<N, R, F, D>) {
    this.tgt.done(d);
  }
}

export class Actor<N, R, F, D> extends Subscriber<N, F, D> {
  private idx = 0;

  constructor(
    private del: Reactor<N, R, F, D>,
    public r?: R,
    public ri?: number
  ) {
    super();
  }

  protected _next(n?: N) {
    this.del.reactNext(this.r, n, this.ri, this.idx++, this);
  }

  protected _fail(f?: F) {
    this.del.reactFail(f, this);
    this.unsubscribe();
  }

  protected _done(d?: D) {
    this.del.reactDone(d, this);
    this.unsubscribe();
  }
}

export function toSubscriber<N, F, D>(
  t?: qt.Target<N, F, D> | qt.Ofun<N>,
  fail?: qt.Ofun<F>,
  done?: qt.Ofun<D>
): Subscriber<N, F, D> {
  if (t instanceof Subscriber) return t;
  if (typeof t === 'function') t = {next: t, fail, done};
  else {
    const s = t ? (t as Subscriber<N, F, D>)[Symbol.rxSubscriber] : undefined;
    if (s) return s();
  }
  if (!t && !fail && !done) return new Subscriber(fakeObs);
  return new Subscriber(t);
}

export class SSubject<N, F, D> extends Subscription {
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
    if (s?.closed || s?.stopped || !ts?.length) return;
    const i = ts.indexOf(this.tgt);
    if (i !== -1) ts.splice(i, 1);
  }
}

export class RSubject<N, F, D> extends Subscriber<N, F, D> {
  constructor(tgt: Subject<N, F, D>) {
    super(tgt);
  }
}

export class Subject<N, F, D> extends qs.Source<N, F, D>
  implements qt.Subject<N, F, D> {
  static createSubject<N, F, D>(
    o: qt.Observer<N, F, D>,
    s: qs.Source<N, F, D>
  ) {
    return new Anonymous<N, F, D>(o, s);
  }

  [Symbol.rxSubscriber](): RSubject<N, F, D> {
    return new RSubject(this);
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
      return new SSubject(this, s);
    }
  }

  _trySubscribe(s: qt.Subscriber<N, F, D>) {
    if (this.closed) throw new qu.UnsubscribedError();
    return super._trySubscribe(s);
  }

  lift<R>(o?: qt.Operator<N, R, F, D>): qs.Source<R, F, D> {
    const s = new Anonymous<R, F, D>(this, this);
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
  constructor(t?: qt.Observer<N, F, D>, public src?: qs.Source<N, F, D>) {
    super();
    if (t) this.tgts.push(t);
  }

  _subscribe(s: qt.Subscriber<N, F, D>) {
    if (this.src) return this.src.subscribe(s);
    return Subscription.fake;
  }
}

export class Async<N, F, D> extends Subject<N, F, D> {
  private ready = false;
  private ended = false;
  private n?: N;

  _subscribe(s: qt.Subscriber<N, F, D>) {
    if (this.failed) {
      s.fail(this.thrown);
      return Subscription.fake;
    } else if (this.ready && this.ended) {
      s.next(this.n);
      s.done();
      return Subscription.fake;
    }
    return super._subscribe(s);
  }

  next(n?: N) {
    if (!this.ended) {
      this.n = n;
      this.ready = true;
    }
  }

  fail(f?: F) {
    if (!this.ended) super.fail(f);
  }

  done(d?: D) {
    this.ended = true;
    if (this.ready) super.next(this.n);
    super.done(d);
  }
}

export class Behavior<N, F, D> extends Subject<N, F, D> {
  constructor(private n?: N) {
    super();
  }

  _subscribe(s: qt.Subscriber<N, F, D>) {
    const t = super._subscribe(s);
    if (!t.closed) s.next(this.n);
    return t;
  }

  getN() {
    if (this.failed) throw this.thrown;
    if (this.closed) throw new qu.UnsubscribedError();
    return this.n;
  }

  next(n?: N) {
    this.n = n;
    super.next(n);
  }
}

interface Event<N> {
  time: number;
  n?: N;
}

export class Replay<N, F, D> extends Subject<N, F, D> {
  private size: number;
  private time: number;
  private events = [] as (N | undefined)[];

  constructor(
    size = Number.POSITIVE_INFINITY,
    time = Number.POSITIVE_INFINITY,
    private stamper: qt.Stamper = Date
  ) {
    super();
    this.size = size < 1 ? 1 : size;
    this.time = time < 1 ? 1 : time;
    if (time !== Number.POSITIVE_INFINITY) this.next = this.nextFiltered;
  }

  _subscribe(s: qt.Subscriber<N, F, D>): Subscription {
    if (this.closed) throw new qu.UnsubscribedError();
    let t: Subscription;
    if (this.stopped || this.failed) t = Subscription.fake;
    else {
      this.tgts.push(s);
      t = new SSubject(this, s);
    }
    if (this.time === Number.POSITIVE_INFINITY) {
      this.events.forEach(e => {
        if (!s.closed) s.next(e);
      });
    } else {
      this.filterEvents().forEach(e => {
        if (!s.closed) s.next(e.n);
      });
    }
    if (this.failed) s.fail(this.thrown);
    else if (this.stopped) s.done();
    return t;
  }

  next(n?: N) {
    const es = this.events;
    es.push(n);
    if (es.length > this.size) es.shift();
    super.next(n);
  }

  private nextFiltered(n?: N) {
    this.filterEvents({time: this.stamper.now(), n});
    super.next(n);
  }

  private filterEvents(e?: Event<N>) {
    const now = this.stamper.now();
    const s = this.size;
    const t = this.time;
    const es = (this.events as unknown) as Event<N>[];
    if (e) es.push(e);
    let i = 0;
    const c = es.length;
    const inf = this.time === Number.POSITIVE_INFINITY;
    while (i < c) {
      if (now - (inf ? 0 : es[i].time) < t) break;
      i++;
    }
    if (c > s) i = Math.max(i, c - s);
    if (i > 0) es.splice(0, i);
    return es;
  }
}
