import * as qr from './subscriber';
import * as qt from './types';
import * as qu from './utils';

export class Source<N> implements qt.Source<N> {
  [Symbol.rxSource]() {
    return this;
  }
  [Symbol.asyncIterator](): AsyncIterableIterator<N | undefined> {
    return asyncIterFrom(this);
  }
  base?: Source<any>;
  oper?: qt.Operator<any, N>;

  constructor(s?: (this: Source<N>, _: qt.Subscriber<N>) => qt.Closer) {
    if (s) this._subscribe = s;
  }

  _subscribe(r: qt.Subscriber<N>): qt.Closer {
    return this.base?.subscribe(r);
  }

  _trySubscribe(r: qt.Subscriber<N>) {
    try {
      return this._subscribe(r);
    } catch (e) {
      if (qu.canReportError(r)) r.fail(e);
      else console.warn(e);
    }
  }

  lift<R>(o?: qt.Operator<N, R>) {
    const s = new Source<R>();
    s.base = this;
    s.oper = o;
    return s;
  }

  subscribe(t?: qt.Target<N>): qt.Subscription;
  subscribe(next?: qt.Fun<N>, fail?: qt.Fun<any>, done?: qt.Fvoid): qt.Subscription;
  subscribe(
    t?: qt.Target<N> | qt.Fun<N>,
    fail?: qt.Fun<any>,
    done?: qt.Fvoid
  ): qt.Subscription {
    const s = qr.toSubscriber(t, fail, done);
    const o = this.oper;
    if (o) s.add(o.call(s, this.base!));
    else s.add(this.base ? this._subscribe(s) : this._trySubscribe(s));
    return s;
  }

  toPromise(): Promise<N | undefined>;
  toPromise(c: typeof Promise): Promise<N | undefined>;
  toPromise(c?: PromiseConstructorLike): Promise<N | undefined> {
    c = c ?? Promise;
    return new c((res, rej) => {
      let cache: N | undefined;
      this.subscribe(
        (n: N) => (cache = n),
        (e: any) => rej(e),
        () => res(cache)
      );
    }) as Promise<N | undefined>;
  }

  first() {
    return new Promise<N>((res, rej) => {
      const s = new qr.Subscription();
      s.add(
        this.subscribe(
          n => {
            res(n);
            s.unsubscribe();
          },
          rej,
          () => rej(new qu.EmptyError())
        )
      );
    });
  }

  last() {
    return new Promise<N>((res, rej) => {
      let hasN = false;
      let cache: N | undefined;
      this.subscribe(
        n => {
          cache = n;
          hasN = true;
        },
        rej,
        () => {
          if (hasN) res(cache);
          else rej(new qu.EmptyError());
        }
      );
    });
  }

  forEach(next?: qt.Fun<N>, c?: PromiseConstructorLike) {
    c = c ?? Promise;
    return new c<void>((res, rej) => {
      let s: qt.Subscription;
      s = this.subscribe(
        (n: N) => {
          try {
            next?.(n);
          } catch (e) {
            rej(e);
            if (s) s.unsubscribe();
          }
        },
        rej,
        res
      );
    }) as Promise<void>;
  }

  pipe(): Source<N>;
  pipe<A>(_1: qt.Lifter<N, A>): Source<A>;
  pipe<A, B>(_1: qt.Lifter<N, A>, _2: qt.Lifter<A, B>): Source<B>;
  pipe<A, B, C>(_1: qt.Lifter<N, A>, _2: qt.Lifter<A, B>, _3: qt.Lifter<B, C>): Source<C>;
  pipe<A, B, C, D>(
    _1: qt.Lifter<N, A>,
    _2: qt.Lifter<A, B>,
    _3: qt.Lifter<B, C>,
    _4: qt.Lifter<C, D>
  ): Source<D>;
  pipe<A, B, C, D, E>(
    _1: qt.Lifter<N, A>,
    _2: qt.Lifter<A, B>,
    _3: qt.Lifter<B, C>,
    _4: qt.Lifter<C, D>,
    _5: qt.Lifter<D, E>
  ): Source<E>;
  pipe<A, B, C, D, E, F>(
    _1: qt.Lifter<N, A>,
    _2: qt.Lifter<A, B>,
    _3: qt.Lifter<B, C>,
    _4: qt.Lifter<C, D>,
    _5: qt.Lifter<D, E>,
    _6: qt.Lifter<E, F>
  ): Source<F>;
  pipe<A, B, C, D, E, F, G>(
    _1: qt.Lifter<N, A>,
    _2: qt.Lifter<A, B>,
    _3: qt.Lifter<B, C>,
    _4: qt.Lifter<C, D>,
    _5: qt.Lifter<D, E>,
    _6: qt.Lifter<E, F>,
    _7: qt.Lifter<F, G>
  ): Source<G>;
  pipe<A, B, C, D, E, F, G, H>(
    _1: qt.Lifter<N, A>,
    _2: qt.Lifter<A, B>,
    _3: qt.Lifter<B, C>,
    _4: qt.Lifter<C, D>,
    _5: qt.Lifter<D, E>,
    _6: qt.Lifter<E, F>,
    _7: qt.Lifter<F, G>,
    _8: qt.Lifter<G, H>
  ): Source<H>;
  pipe<A, B, C, D, E, F, G, H, I>(
    _1: qt.Lifter<N, A>,
    _2: qt.Lifter<A, B>,
    _3: qt.Lifter<B, C>,
    _4: qt.Lifter<C, D>,
    _5: qt.Lifter<D, E>,
    _6: qt.Lifter<E, F>,
    _7: qt.Lifter<F, G>,
    _8: qt.Lifter<G, H>,
    _9: qt.Lifter<H, I>
  ): Source<I>;
  pipe<A, B, C, D, E, F, G, H, I>(
    _1: qt.Lifter<N, A>,
    _2: qt.Lifter<A, B>,
    _3: qt.Lifter<B, C>,
    _4: qt.Lifter<C, D>,
    _5: qt.Lifter<D, E>,
    _6: qt.Lifter<E, F>,
    _7: qt.Lifter<F, G>,
    _8: qt.Lifter<G, H>,
    _9: qt.Lifter<H, I>,
    ..._: qt.Lifter<any, any>[]
  ): Source<unknown>;
  pipe(...os: qt.Lifter<any, any>[]): Source<any> {
    if (os.length === 0) return this;
    return qu.pipeFromArray(os)(this) as this;
  }
}

export const EMPTY = new Source<never>(r => r.done());
export const NEVER = new Source<never>(qt.noop);

function asyncIterFrom<N>(s: Source<N>) {
  return coroutine(s);
}

class Deferred<N> {
  res?: qt.Fun<N | PromiseLike<N>>;
  rej?: qt.Fun<any>;
  p = new Promise<N>((res, rej) => {
    this.res = res;
    this.rej = rej;
  });
}

async function* coroutine<N>(s: Source<N>) {
  const ds = [] as Deferred<IteratorResult<N>>[];
  const ns = [] as N[];
  let done = false;
  let failed = false;
  let err: any;
  const ss = s.subscribe({
    next: (n: N) => {
      if (ds.length > 0) ds.shift()!.res?.({value: n, done: false});
      else ns.push(n);
    },
    fail: (e: any) => {
      failed = true;
      err = e;
      while (ds.length > 0) {
        ds.shift()!.rej?.(e);
      }
    },
    done: () => {
      done = true;
      while (ds.length > 0) {
        ds.shift()!.res?.({value: undefined, done: true});
      }
    }
  });
  try {
    while (true) {
      if (ns.length > 0) yield ns.shift()!;
      else if (done) return;
      else if (failed) throw err;
      else {
        const d = new Deferred<IteratorResult<N>>();
        ds.push(d);
        const r = await d.p;
        if (r.done) return;
        else yield r.value;
      }
    }
  } catch (e) {
    throw e;
  } finally {
    ss.unsubscribe();
  }
}

export class Grouped<N, K> extends Source<N> {
  constructor(public key: K, private g: qt.Subject<N>, private counter?: qt.RefCounted) {
    super();
  }

  _subscribe(r: qt.Subscriber<N>) {
    const s = new qr.Subscription();
    const c = this.counter;
    if (c && !c.closed) s.add(new qr.RefCounted(c));
    s.add(this.g.subscribe(r));
    return s;
  }
}
