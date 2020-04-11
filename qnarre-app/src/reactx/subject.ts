import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';

export class Subscription implements qt.Subscription {
  public static fake = ((s: Subscription) => {
    s.closed = true;
    return s;
  })(new Subscription());

  public closed = false;
  protected parents?: qt.Subscription[] | qt.Subscription;
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

export class Subject<N, F, D> implements qt.Source<N, F, D>, qt.Subscription {
  [Symbol.rxSubscriber](): SubjectSubscriber<N, F, D> {
    return new SubjectSubscriber(this);
  }

  closed = false;
  stopped = false;
  failed = false;
  thrown?: any;
  obss = [] as qt.Observer<T>[];

  constructor() {
    super();
  }

  //static create<T>(obs: qt.Observer<T>, src: Observable<T>) {
  //  return new AnonymousSubject<T>(obs, src);
  //}

  lift<R>(o: qt.Operator<T, R>): Observable<R> {
    const s = new AnonymousSubject(this, this);
    s.oper = o;
    return s as Observable<R>;
  }

  next(n?: N) {
    if (this.closed) throw new qu.UnsubscribedError();
    if (!this.stopped) this.obss.slice().forEach(s => s.next(n));
  }

  fail(f?: F) {
    if (this.closed) throw new qu.UnsubscribedError();
    this.failed = true;
    this.thrown = f;
    this.stopped = true;
    this.obss.slice().forEach(s => s.fail(f));
    this.obss = [];
  }

  done(d?: D) {
    if (this.closed) throw new qu.UnsubscribedError();
    this.stopped = true;
    this.obss.slice().forEach(s => s.done(d));
    this.obss = [];
  }

  unsubscribe() {
    this.stopped = true;
    this.closed = true;
    this.obss = [];
  }

  _trySubscribe(s: qt.Subscriber<N, F, D>) {
    if (this.closed) throw new qu.UnsubscribedError();
    return super._trySubscribe(s);
  }

  _subscribe(s: Subscriber<T>): Subscription {
    if (this.closed) throw new qu.UnsubscribedError();
    else if (this.failed) {
      s.error(this.thrown);
      return Subscription.fake;
    } else if (this.stopped) {
      s.complete();
      return Subscription.fake;
    } else {
      this.obss.push(s);
      return new SubjectSubscription(this, s);
    }
  }

  asObservable(): Observable<T> {
    const o = new Observable<T>();
    o.src = this;
    return o;
  }
}
