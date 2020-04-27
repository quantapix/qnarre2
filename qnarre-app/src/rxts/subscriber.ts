import * as qt from './types';
import * as qu from './utils';

export class Subscription implements qt.Subscription {
  static fake = ((s: Subscription) => {
    s.closed = true;
    return s;
  })(new Subscription());

  closed?: boolean;
  parents?: Subscription[] | Subscription;
  private subs?: qt.Subscription[];

  constructor(u?: qt.Fvoid) {
    if (u) this._unsubscribe = u;
  }

  _unsubscribe() {}

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
          s.subs = [c as qt.Subscription];
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
    if (this.subs) this.subs.push(s);
    else this.subs = [s];
    return s;
  }

  remove(s: qt.Subscription) {
    const ss = this.subs;
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
      this._unsubscribe.call(this);
    } catch (e) {
      if (e instanceof qu.UnsubscribeError) es = es.concat(flatten(e.errors));
      else es.push(e);
    }
    this.subs?.forEach(s => {
      try {
        s.unsubscribe();
      } catch (e) {
        if (e instanceof qu.UnsubscribeError) es = es.concat(flatten(e.errors));
        else es.push(e);
      }
    });
    this.parents = this.subs = undefined;
    if (es.length) throw new qu.UnsubscribeError(es);
  }
}

function flatten(es: any[]) {
  return es.reduce(
    (a, e) => a.concat(e instanceof qu.UnsubscribeError ? e.errors : e),
    []
  );
}

export class RefCounted extends Subscription implements qt.RefCounted {
  unsubscribing?: boolean;
  count = 0;

  constructor(private parent?: qt.RefCounted) {
    super();
    if (parent) parent.count++;
  }

  unsubscribe() {
    if (!this.closed) {
      const p = this.parent;
      if (p && !p.closed) {
        super.unsubscribe();
        p.count -= 1;
        if (!p.count && p.unsubscribing) p.unsubscribe();
      }
    }
  }
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
  stopped?: boolean;
  tgt: Subscriber<any> | qt.Observer<any>;

  constructor(t?: qt.Target<any> | qt.Fun<any>) {
    super();
    if (!t) this.tgt = fake;
    else {
      if (t instanceof Subscriber) {
        this.tgt = t;
        t.add(this);
      } else {
        this.tgt = new Safe<N>(this, t);
      }
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
    this.closed = this.stopped = undefined;
    this.parents = ps;
    return this;
  }
}

export class Safe<N> extends Subscriber<N> {
  private ctx?: any;

  constructor(
    private parent: Subscriber<N> | undefined,
    t?: qt.Target<any> | qt.Fun<any>
  ) {
    super();
    if (qt.isFunction(t)) {
      this._next = t;
    } else if (t) {
      this._next = t.next ?? this._next;
      this._fail = t.fail as qt.Fun<any>;
      this._done = t.done ?? this.done;
      if (t !== fake) {
        const c = Object.create(t);
        if (qt.isFunction(c.unsubscribe)) this.add(c.unsubscribe.bind(c));
        c.unsubscribe = this.unsubscribe.bind(this);
        this.ctx = c;
      }
    }
  }

  next(n: N) {
    if (!this.stopped) this._call(this._next, n);
  }

  fail(e: any) {
    if (!this.stopped) {
      if (this._fail) this._call(this._fail, e);
      else qu.delayedThrow(e);
      this.unsubscribe();
    }
  }

  done() {
    if (!this.stopped) {
      this._call(this._done);
      this.unsubscribe();
    }
  }

  _call(f?: Function, x?: N | any) {
    try {
      f?.call(this.ctx, x);
    } catch (e) {
      this.unsubscribe();
      qu.delayedThrow(e);
    }
  }

  _unsubscribe() {
    const p = this.parent;
    this.ctx = this.parent = undefined;
    p?.unsubscribe();
  }
}

export function toSubscriber<N>(
  t?: qt.Target<N> | qt.Fun<N>,
  fail?: qt.Fun<any>,
  done?: qt.Fvoid
): Subscriber<N> {
  if (t instanceof Subscriber) return t;
  if (typeof t === 'function') t = {next: t, fail, done};
  else {
    const s = t ? (t as Subscriber<N>)[Symbol.rxSubscriber] : undefined;
    if (s) return s();
  }
  if (!t && !fail && !done) return new Subscriber<N>(fake);
  return new Subscriber(t);
}

export function subscribeToArray<N>(a: ArrayLike<N>) {
  return (r: qt.Subscriber<N>) => {
    for (let i = 0, len = a.length; i < len && !r.closed; i++) {
      r.next(a[i]);
    }
    r.done();
    return r;
  };
}

export function subscribeToIter<N>(b: Iterable<N>) {
  return (r: qt.Subscriber<N>) => {
    const i = b[Symbol.iterator]();
    do {
      const y = i.next();
      if (y.done) {
        r.done();
        break;
      }
      r.next(y.value);
      if (r.closed) break;
    } while (true);
    if (typeof i.return === 'function') r.add(() => i.return!());
    return r;
  };
}

export function subscribeToAsyncIter<N>(b: AsyncIterable<N>) {
  async function process(r: qt.Subscriber<N>) {
    for await (const n of b) {
      r.next(n);
    }
    r.done();
  }
  return (r: qt.Subscriber<N>) => {
    process(r).catch(e => r.fail(e));
    return r;
  };
}

export function subscribeToSource<N>(i: qt.Interop<N>) {
  return (r: qt.Subscriber<N>) => {
    i[Symbol.rxSource]().subscribe(r);
    return r;
  };
}

export function subscribeToPromise<N>(p: PromiseLike<N>) {
  return (r: qt.Subscriber<N>) => {
    p.then(
      n => {
        if (!r.closed) {
          r.next(n);
          r.done();
        }
      },
      f => r.fail(f)
    ).then(null, qu.delayedThrow);
    return r;
  };
}

export function subscribeTo<N>(i: qt.Input<N>) {
  if (qt.isInterop<N>(i)) return subscribeToSource(i);
  if (qt.isArrayLike<N>(i)) return subscribeToArray(i);
  if (qt.isPromise<N>(i)) return subscribeToPromise(i);
  if (qt.isIter<N>(i)) return subscribeToIter(i);
  if (qt.isAsyncIter<N>(i)) return subscribeToAsyncIter(i);
  throw new TypeError(((i && typeof i) || i) + ' not source input');
}

export class Actor<N, R> extends Subscriber<N> {
  private ni = 0;

  constructor(private dst: Reactor<R, N>, public r?: R, public ri?: number) {
    super();
  }

  protected _next(n: N) {
    this.dst.reactNext(this.r, n, this.ri, this.ni++, this);
  }

  protected _fail(e: any) {
    this.dst.reactFail(e, this);
    this.unsubscribe();
  }

  protected _done() {
    this.dst.reactDone(this);
    this.unsubscribe();
  }
}

export class Reactor<R, N> extends Subscriber<R> {
  reactNext(_r: R | undefined, n: N, _ri?: number, _ni?: number, _?: Actor<N, R>) {
    this.tgt.next((n as unknown) as R);
  }

  reactFail(e: any, _?: Actor<N, R>) {
    this.tgt.fail(e);
  }

  reactDone(_?: Actor<N, R>) {
    this.tgt.done();
  }

  subscribeTo(
    s: any,
    r?: R,
    i?: number,
    a: Subscriber<N> = new Actor<N, R>(this, r, i)
  ): qt.Subscription | undefined {
    if (a.closed) return;
    if (qt.isSource<N>(s)) return s.subscribe(a);
    return subscribeTo<N>(s)(a) as qt.Subscription;
  }
}
