import * as qt from './types';
import * as qu from './utils';

export function toSubscriber<N, F, D>(
  t?: qt.Target<N, F, D> | qt.Ofun<N>,
  fail?: qt.Ofun<F>,
  done?: qt.Ofun<D>
): Subscriber<N, F, D> {
  if (t) {
    if (t instanceof Subscriber) return t;
    if ((t as any)[Symbol.rxSubscriber]) {
      return (t as any)[Symbol.rxSubscriber]();
    }
  }
  if (!t && !fail && !done) return new Subscriber(qu.fakeObserver);
  return new Subscriber(t);
}

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
    s?: (this: Source<N, F, D>, _: qt.Subscriber<N, F, D>) => qt.Closer
  ) {
    if (s) this._subscribe = s;
  }

  //static create<T>(s?: (_: qt.Subscriber<T>) => qt.Closer) {
  //  return new Observable<T>(s);
  //}

  lift<R>(op?: qt.Operator<N, R, F, D>) {
    const o = new Source<R, F, D>();
    o.src = this;
    o.oper = op;
    return o;
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
    const s = toSubscriber(t, fail, done);
    const op = this.oper;
    if (op) s.add(op.call(s, this.src));
    else s.add(this.src ? this._subscribe(s) : this._trySubscribe(s));
    return s;
  }

  forEach(next?: qt.Ofun<N>, c?: PromiseConstructorLike) {
    c = promiseCtor(c);
    return new c<void>((res, rej) => {
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
    }) as Promise<void>;
  }

  _trySubscribe(s: qt.Subscriber<N, F, D>) {
    try {
      return this._subscribe(s);
    } catch (e) {
      if (qu.canReportError(s)) s.fail(e);
      else console.warn(e);
    }
  }

  _subscribe(s: qt.Subscriber<N, F, D>): qt.Closer {
    return this.src?.subscribe(s);
  }

  pipe(): Observable<T>;
  pipe<A>(op1: qt.OperatorFunction<T, A>): Observable<A>;
  pipe<A, B>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>
  ): Observable<B>;
  pipe<A, B, C>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>
  ): Observable<C>;
  pipe<A, B, C, D>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>
  ): Observable<D>;
  pipe<A, B, C, D, E>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>
  ): Observable<E>;
  pipe<A, B, C, D, E, F>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>
  ): Observable<F>;
  pipe<A, B, C, D, E, F, G>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>,
    op7: qt.OperatorFunction<F, G>
  ): Observable<G>;
  pipe<A, B, C, D, E, F, G, H>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>,
    op7: qt.OperatorFunction<F, G>,
    op8: qt.OperatorFunction<G, H>
  ): Observable<H>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>,
    op7: qt.OperatorFunction<F, G>,
    op8: qt.OperatorFunction<G, H>,
    op9: qt.OperatorFunction<H, I>
  ): Observable<I>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: qt.OperatorFunction<T, A>,
    op2: qt.OperatorFunction<A, B>,
    op3: qt.OperatorFunction<B, C>,
    op4: qt.OperatorFunction<C, D>,
    op5: qt.OperatorFunction<D, E>,
    op6: qt.OperatorFunction<E, F>,
    op7: qt.OperatorFunction<F, G>,
    op8: qt.OperatorFunction<G, H>,
    op9: qt.OperatorFunction<H, I>,
    ...ops: qt.OperatorFunction<any, any>[]
  ): Observable<unknown>;
  pipe(...ops: qt.OperatorFunction<any, any>[]): Observable<any> {
    if (ops.length === 0) return this as any;
    return qu.pipeFromArray(ops)(this);
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
