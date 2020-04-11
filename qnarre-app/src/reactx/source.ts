import * as qt from './types';
import * as qu from './utils';

export class Source<N, F, D> implements qt.Source<N, F, D> {
  [Symbol.observable]() {
    return this;
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<N> {
    return asyncIterFrom<N, F, D>(this);
  }

  //public _isScalar = false;
  src?: Source<any, F, D>;
  oper?: qt.Operator<any, N, F, D>;

  constructor(
    s?: (this: Source<N, F, D>, _: qt.Subscriber<N, F, D>) => qt.Subscription
  ) {
    if (s) this._subscribe = s;
  }

  _subscribe(s: qt.Subscriber<N, F, D>) {
    return this.src?.subscribe(s);
  }

  _trySubscribe(s: qt.Subscriber<N, F, D>) {
    try {
      return this._subscribe(s);
    } catch (e) {
      if (qu.canReportError(s)) s.fail(e);
      else console.warn(e);
    }
    return;
  }

  //static create<T>(s?: (_: qt.Subscriber<T>) => qt.Closer) {
  //  return new Observable<T>(s);
  //}

  lift<M>(o?: qt.Operator<N, M, F, D>) {
    const s = new Source<M, F, D>();
    s.src = this;
    s.oper = o;
    return s;
  }

  subscribe(t?: qt.Target<N, F, D>): qt.Subscription;
  subscribe(
    next?: qt.Ofun<N>,
    fail?: qt.Ofun<F>,
    done?: qt.Ofun<D>
  ): qt.Subscription;
  subscribe(
    t?: qt.Target<N, F, D> | qt.Ofun<N>,
    fail?: qt.Ofun<F>,
    done?: qt.Ofun<D>
  ): qt.Subscription {
    const s = qt.context.toSubscriber(t, fail, done);
    const o = this.oper;
    if (o) s.add(o.call(s, this.src));
    else s.add(this.src ? this._subscribe(s) : this._trySubscribe(s));
    return s;
  }

  forEach(next?: qt.Ofun<N>, c?: PromiseConstructorLike) {
    c = promiseCtor(c);
    return new c<D>((res, rej) => {
      let s: qt.Subscription;
      s = this.subscribe(
        (n?: N) => {
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
    }) as Promise<D>;
  }

  pipe(): Source<N, F, D>;
  pipe<A>(op1: qt.OperFun<N, A, F, D>): Source<A, F, D>;
  pipe<A, B>(
    op1: qt.OperFun<N, A, F, D>,
    op2: qt.OperFun<A, B, F, D>
  ): Source<B, F, D>;
  pipe<A, B, C>(
    op1: qt.OperFun<N, A, F, D>,
    op2: qt.OperFun<A, B, F, D>,
    op3: qt.OperFun<B, C, F, D>
  ): Source<C, F, D>;
  pipe<A, B, C, D>(
    op1: qt.OperFun<N, A, F, D>,
    op2: qt.OperFun<A, B, F, D>,
    op3: qt.OperFun<B, C, F, D>,
    op4: qt.OperFun<C, D, F, D>
  ): Source<D, F, D>;
  pipe<A, B, C, D, E>(
    op1: qt.OperFun<N, A, F, D>,
    op2: qt.OperFun<A, B, F, D>,
    op3: qt.OperFun<B, C, F, D>,
    op4: qt.OperFun<C, D, F, D>,
    op5: qt.OperFun<D, E, F, D>
  ): Source<E, F, D>;
  pipe<A, B, C, D, E, F>(
    op1: qt.OperFun<N, A, F, D>,
    op2: qt.OperFun<A, B, F, D>,
    op3: qt.OperFun<B, C, F, D>,
    op4: qt.OperFun<C, D, F, D>,
    op5: qt.OperFun<D, E, F, D>,
    op6: qt.OperFun<E, F, F, D>
  ): Source<F, F, D>;
  pipe<A, B, C, D, E, F, G>(
    op1: qt.OperFun<N, A, F, D>,
    op2: qt.OperFun<A, B, F, D>,
    op3: qt.OperFun<B, C, F, D>,
    op4: qt.OperFun<C, D, F, D>,
    op5: qt.OperFun<D, E, F, D>,
    op6: qt.OperFun<E, F, F, D>,
    op7: qt.OperFun<F, G, F, D>
  ): Source<G, F, D>;
  pipe<A, B, C, D, E, F, G, H>(
    op1: qt.OperFun<N, A, F, D>,
    op2: qt.OperFun<A, B, F, D>,
    op3: qt.OperFun<B, C, F, D>,
    op4: qt.OperFun<C, D, F, D>,
    op5: qt.OperFun<D, E, F, D>,
    op6: qt.OperFun<E, F, F, D>,
    op7: qt.OperFun<F, G, F, D>,
    op8: qt.OperFun<G, H, F, D>
  ): Source<H, F, D>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: qt.OperFun<N, A, F, D>,
    op2: qt.OperFun<A, B, F, D>,
    op3: qt.OperFun<B, C, F, D>,
    op4: qt.OperFun<C, D, F, D>,
    op5: qt.OperFun<D, E, F, D>,
    op6: qt.OperFun<E, F, F, D>,
    op7: qt.OperFun<F, G, F, D>,
    op8: qt.OperFun<G, H, F, D>,
    op9: qt.OperFun<H, I, F, D>
  ): Source<I, F, D>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: qt.OperFun<N, A, F, D>,
    op2: qt.OperFun<A, B, F, D>,
    op3: qt.OperFun<B, C, F, D>,
    op4: qt.OperFun<C, D, F, D>,
    op5: qt.OperFun<D, E, F, D>,
    op6: qt.OperFun<E, F, F, D>,
    op7: qt.OperFun<F, G, F, D>,
    op8: qt.OperFun<G, H, F, D>,
    op9: qt.OperFun<H, I, F, D>,
    ...ops: qt.OperFun<any, any, F, D>[]
  ): Source<unknown, F, D>;
  pipe(...ops: qt.OperFun<any, any, F, D>[]): Source<any, F, D> {
    if (ops.length === 0) return this;
    return qu.pipeFromArray(ops)(this) as this;
  }

  toPromise<T>(this: Source<T, F, D>): Promise<T | undefined>;
  toPromise<T>(
    this: Source<T, F, D>,
    c: typeof Promise
  ): Promise<T | undefined>;
  toPromise<T>(
    this: Source<T, F, D>,
    c: PromiseConstructorLike
  ): Promise<T | undefined>;
  toPromise(c?: PromiseConstructorLike): Promise<N | undefined> {
    c = promiseCtor(c);
    return new c((res, rej) => {
      let value: N | undefined;
      this.subscribe(
        (n?: N) => (value = n),
        (f?: F) => rej(f),
        (_?: D) => res(value)
      );
    }) as Promise<N | undefined>;
  }
}

function promiseCtor(c?: PromiseConstructorLike) {
  if (!c) c = Promise;
  if (!c) throw new Error('no Promise impl found');
  return c;
}

function asyncIterFrom<N, F, D>(s: Source<N, F, D>) {
  return coroutine(s);
}

class Deferred<N, F> {
  resolve?: (_?: N | PromiseLike<N>) => void;
  reject?: (_?: F) => void;
  promise = new Promise<N>((res, rej) => {
    this.resolve = res;
    this.reject = rej;
  });
}

async function* coroutine<N, F, D>(s: Source<N, F, D>) {
  const ds = [] as Deferred<IteratorResult<N | undefined>, F>[];
  const ns = [] as (N | undefined)[];
  let done = false;
  let failed = false;
  let err: F | undefined;
  const ss = s.subscribe({
    next: (n?: N) => {
      if (ds.length > 0) ds.shift()!.resolve?.({value: n, done: false});
      else ns.push(n);
    },
    fail: (f?: F) => {
      failed = true;
      err = f;
      while (ds.length > 0) {
        ds.shift()!.reject?.(f);
      }
    },
    done: (_?: D) => {
      done = true;
      while (ds.length > 0) {
        ds.shift()!.resolve?.({value: undefined, done: true});
      }
    }
  });
  try {
    while (true) {
      if (ns.length > 0) yield ns.shift()!;
      else if (done) return;
      else if (failed) throw err;
      else {
        const d = new Deferred<IteratorResult<N | undefined>, F>();
        ds.push(d);
        const r = await d.promise;
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
