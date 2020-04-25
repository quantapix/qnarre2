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
      this.close?.call(this);
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

const fake = {
  closed: true,
  next(_: any) {},
  fail(e: any) {
    qu.delayedThrow(e);
  },
  done() {}
} as qt.Observer<any>;

export class RefCounted extends Subscription {
  constructor(private parent: qt.RefCounted) {
    super();
    parent.count++;
  }

  unsubscribe() {
    const p = this.parent;
    if (!p.closed && !this.closed) {
      super.unsubscribe();
      p.count -= 1;
      if (p.count === 0 && p.unsubscribing) p.unsubscribe();
    }
  }
}

export class Subscriber<N> extends Subscription implements qt.Subscriber<N> {
  [Symbol.rxSubscriber]() {
    return this;
  }
  stopped?: boolean;
  tgt: Subscriber<N> | qt.Observer<N>;

  constructor(t?: qt.Target<N>) {
    super();
    if (!t) this.tgt = fake;
    else {
      if (t instanceof Subscriber) {
        this.tgt = t;
        t.add(this);
      } else {
        this.tgt = new Proxy<N>(this, t);
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

export class Proxy<N> extends Subscriber<N> {
  private ctx?: any;

  constructor(private parent: Subscriber<N> | undefined, private tgt2: qt.Target<N>) {
    super();
    if (this.tgt2 !== fake) this.ctx = Object.create(this.tgt2);
  }

  next(n: N) {
    if (!this.stopped) this._call(this.tgt2.next, n);
  }

  fail(e: any) {
    if (!this.stopped) {
      if (this.tgt2.fail) this._call(this.tgt2.fail, e);
      else qu.delayedThrow(e);
      this.unsubscribe();
    }
  }

  done() {
    if (!this.stopped) {
      this._call(this.tgt2.done);
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

export class Actor<N, R> extends Subscriber<N> {
  private idx = 0;

  constructor(private react: Reactor<N, R>, public r: R, public ri?: number) {
    super();
  }

  protected _next(n: N) {
    this.react.reactNext(this.r, n, this.ri, this.idx++, this);
  }

  protected _fail(e: any) {
    this.react.reactFail(e, this);
    this.unsubscribe();
  }

  protected _done() {
    this.react.reactDone(this);
    this.unsubscribe();
  }
}

export class Reactor<A, N> extends Subscriber<N> {
  reactNext(_n: N, a: A, _ni?: number, _i?: number, _?: Actor<A, N>) {
    this.tgt.next((a as unknown) as N);
  }

  reactFail(e: any, _?: Actor<A, N>) {
    this.tgt.fail(e);
  }

  reactDone(_?: Actor<A, N>) {
    this.tgt.done();
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

export function subscribeToResult<N, R>(
  r: Reactor<N, R>,
  result: any,
  rn: undefined,
  ri: undefined,
  a: Actor<N, R>
): qt.Subscription | undefined;
export function subscribeToResult<N, R>(
  r: Reactor<N, R>,
  result: any,
  rn?: R,
  ri?: number
): qt.Subscription | undefined;
export function subscribeToResult<N, R>(
  r: Reactor<N, R>,
  result: any,
  rn?: R,
  ri?: number,
  a: Subscriber<N> = new Actor<N, R>(r, rn!, ri)
): qt.Subscription | undefined {
  if (a.closed) return;
  if (qt.isSource<N>(result)) return result.subscribe(a);
  return subscribeTo<N>(result)(a) as qt.Subscription;
}
