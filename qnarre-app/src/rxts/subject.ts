import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';
import * as qx from './context';

export class Subscription implements qt.Subscription {
  static fake = ((s: Subscription) => {
    s.closed = true;
    return s;
  })(new Subscription());

  closed = false;
  protected parents?: Subscription[] | Subscription;
  private children?: qt.Subscription[];

  constructor(private close?: qt.Fun<void>) {}

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

const fake = {
  closed: true,
  next(_: any) {},
  fail(e: any) {
    qu.delayedThrow(e);
  },
  done() {}
} as qt.Observer<any>;

export class Subscriber<N> extends Subscription implements qt.Subscriber<N> {
  [Symbol.rxSubscriber]() {
    return this;
  }
  protected stopped = false;
  protected tgt: Subscriber<N> | qt.Observer<N>;

  constructor(tgt?: qt.Target<N>) {
    super();
    if (!tgt) this.tgt = fake;
    else {
      if (tgt instanceof Subscriber) {
        this.tgt = tgt;
        tgt.add(this);
      } else this.tgt = new Proxy<N>(this, tgt);
    }
  }

  next(n: N) {
    if (!this.stopped) this._next(n);
  }

  fail(e: any) {
    if (!this.stopped) {
      this.stopped = true;
      this._fail(e);
    }
  }

  done() {
    if (!this.stopped) {
      this.stopped = true;
      this._done();
    }
  }

  unsubscribe() {
    if (!this.closed) {
      this.stopped = true;
      super.unsubscribe();
    }
  }

  protected _next(n: N) {
    this.tgt.next(n);
  }

  protected _fail(e: any) {
    this.tgt.fail(e);
    this.unsubscribe();
  }

  protected _done() {
    this.tgt.done();
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

export function toSubscriber<N>(
  t?: qt.Target<N> | qt.Fun<N>,
  fail?: qt.Fun<any>,
  done?: qt.Fun<void>
): Subscriber<N> {
  if (t instanceof Subscriber) return t;
  if (typeof t === 'function') t = {next: t, fail, done};
  else {
    const s = t ? (t as Subscriber<N>)[Symbol.rxSubscriber] : undefined;
    if (s) return s();
  }
  if (!t && !fail && !done) return new Subscriber(fake);
  return new Subscriber(t);
}

export class Proxy<N> extends Subscriber<N> {
  private ctx?: any;

  constructor(private parent: Subscriber<N> | undefined, private del: qt.Target<N>) {
    super();
    if (this.del !== fake) this.ctx = Object.create(this.del);
  }

  next(n: N) {
    if (!this.stopped) this._call(this.del.next, n);
  }

  fail(e: any) {
    if (!this.stopped) {
      if (this.del.fail) this._call(this.del.fail, e);
      else qu.delayedThrow(e);
      this.unsubscribe();
    }
  }

  done() {
    if (!this.stopped) {
      this._call(this.del.done);
      this.unsubscribe();
    }
  }

  unsubscribe() {
    const p = this.parent;
    this.ctx = this.parent = undefined;
    p?.unsubscribe();
  }

  private _call(f?: Function, x?: N | any) {
    try {
      f?.call(this.ctx, x);
    } catch (e) {
      this.unsubscribe();
      qu.delayedThrow(e);
    }
  }
}

export class Reactor<N, R> extends Subscriber<R> {
  reactNext(_r: R, n: N, _ri?: number, _i?: number, _?: Actor<N, R>) {
    this.tgt.next((n as unknown) as R);
  }

  reactFail(e: any, _?: Actor<N, R>) {
    this.tgt.fail(e);
  }

  reactDone(_?: Actor<N, R>) {
    this.tgt.done();
  }
}

export class Actor<N, R> extends Subscriber<N> {
  private idx = 0;

  constructor(private del: Reactor<N, R>, public r: R, public ri?: number) {
    super();
  }

  protected _next(n: N) {
    this.del.reactNext(this.r, n, this.ri, this.idx++, this);
  }

  protected _fail(e: any) {
    this.del.reactFail(e, this);
    this.unsubscribe();
  }

  protected _done() {
    this.del.reactDone(this);
    this.unsubscribe();
  }
}

export class SSubject<N> extends Subscription {
  constructor(public subj: Subject<N> | undefined, public tgt: qt.Observer<N>) {
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

export class RSubject<N> extends Subscriber<N> {
  constructor(tgt: Subject<N>) {
    super(tgt);
  }
}

export class Subject<N> extends qs.Source<N> implements qt.Subject<N> {
  [Symbol.rxSubscriber](): RSubject<N> {
    return new RSubject(this);
  }
  closed = false;
  stopped = false;
  failed = false;
  thrown?: any;
  tgts = [] as qt.Observer<N>[];

  constructor(
    t?: qt.Observer<N>,
    public src?: qs.Source<N>,
    s?: (this: qs.Source<N>, _: qt.Subscriber<N>) => qt.Subscription
  ) {
    super(s);
    if (t) this.tgts.push(t);
  }

  _subscribe(s: qt.Subscriber<N>): qt.Subscription {
    if (this.src) return this.src.subscribe(s);
    if (this.closed) throw new qu.UnsubscribedError();
    if (this.failed) {
      s.fail(this.thrown);
      return Subscription.fake;
    } else if (this.stopped) {
      s.done();
      return Subscription.fake;
    }
    this.tgts.push(s);
    return new SSubject(this, s);
  }

  _trySubscribe(s: qt.Subscriber<N>) {
    if (this.closed) throw new qu.UnsubscribedError();
    return super._trySubscribe(s);
  }

  lift<R>(o?: qt.Operator<N, R>) {
    const s = new Subject<R>(this, this);
    s.oper = o;
    return s;
  }

  next(n: N) {
    if (this.closed) throw new qu.UnsubscribedError();
    if (!this.stopped) this.tgts.slice().forEach(s => s.next(n));
  }

  fail(e: any) {
    if (this.closed) throw new qu.UnsubscribedError();
    this.failed = true;
    this.thrown = e;
    this.stopped = true;
    this.tgts.slice().forEach(s => s.fail(e));
    this.tgts = [];
  }

  done() {
    if (this.closed) throw new qu.UnsubscribedError();
    this.stopped = true;
    this.tgts.slice().forEach(s => s.done());
    this.tgts = [];
  }

  unsubscribe() {
    this.stopped = true;
    this.closed = true;
    this.tgts = [];
  }

  asSource() {
    const s = qx.createSource<N>();
    s.orig = this;
    return s;
  }
}

export class Async<N> extends Subject<N> {
  private ready = false;
  private ended = false;
  private n?: N;

  _subscribe(s: qt.Subscriber<N>) {
    if (this.failed) {
      s.fail(this.thrown);
      return Subscription.fake;
    } else if (this.ready && this.ended) {
      s.next(this.n!);
      s.done();
      return Subscription.fake;
    }
    return super._subscribe(s);
  }

  next(n: N) {
    if (!this.ended) {
      this.n = n;
      this.ready = true;
    }
  }

  fail(e: any) {
    if (!this.ended) super.fail(e);
  }

  done() {
    this.ended = true;
    if (this.ready) super.next(this.n!);
    super.done();
  }
}

export class Behavior<N> extends Subject<N> {
  constructor(public n: N) {
    super();
  }

  _subscribe(s: qt.Subscriber<N>) {
    const t = super._subscribe(s);
    if (!t.closed) s.next(this.n);
    return t;
  }

  getN() {
    if (this.failed) throw this.thrown;
    if (this.closed) throw new qu.UnsubscribedError();
    return this.n;
  }

  next(n: N) {
    this.n = n;
    super.next(n);
  }
}

interface Event<N> {
  time: number;
  n: N;
}

export abstract class Replay<N> extends Subject<N> {
  private size: number;
  private time: number;
  private events = [] as N[];

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

  _subscribe(s: qt.Subscriber<N>): Subscription {
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

  next(n: N) {
    const es = this.events;
    es.push(n);
    if (es.length > this.size) es.shift();
    super.next(n);
  }

  private nextFiltered(n: N) {
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
