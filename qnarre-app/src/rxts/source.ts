import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';

export class Source<N, F = any, D = any> implements qt.Source<N, F, D> {
  static createSource<N, F, D>(
    s?: (_: qt.Subscriber<N, F, D>) => qt.Subscription
  ) {
    return new Source<N, F, D>(s);
  }

  [Symbol.observable]() {
    return this;
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<N> {
    return asyncIterFrom<N, F, D>(this);
  }

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

  lift<R>(o?: qt.Operator<N, R, F, D>) {
    const s = new Source<R, F, D>();
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
  pipe<A>(op1: qt.Lifter<N, A, F, D>): Source<A, F, D>;
  pipe<A, B>(
    op1: qt.Lifter<N, A, F, D>,
    op2: qt.Lifter<A, B, F, D>
  ): Source<B, F, D>;
  pipe<A, B, C>(
    op1: qt.Lifter<N, A, F, D>,
    op2: qt.Lifter<A, B, F, D>,
    op3: qt.Lifter<B, C, F, D>
  ): Source<C, F, D>;
  pipe<A, B, C, D>(
    op1: qt.Lifter<N, A, F, D>,
    op2: qt.Lifter<A, B, F, D>,
    op3: qt.Lifter<B, C, F, D>,
    op4: qt.Lifter<C, D, F, D>
  ): Source<D, F, D>;
  pipe<A, B, C, D, E>(
    op1: qt.Lifter<N, A, F, D>,
    op2: qt.Lifter<A, B, F, D>,
    op3: qt.Lifter<B, C, F, D>,
    op4: qt.Lifter<C, D, F, D>,
    op5: qt.Lifter<D, E, F, D>
  ): Source<E, F, D>;
  pipe<A, B, C, D, E, F>(
    op1: qt.Lifter<N, A, F, D>,
    op2: qt.Lifter<A, B, F, D>,
    op3: qt.Lifter<B, C, F, D>,
    op4: qt.Lifter<C, D, F, D>,
    op5: qt.Lifter<D, E, F, D>,
    op6: qt.Lifter<E, F, F, D>
  ): Source<F, F, D>;
  pipe<A, B, C, D, E, F, G>(
    op1: qt.Lifter<N, A, F, D>,
    op2: qt.Lifter<A, B, F, D>,
    op3: qt.Lifter<B, C, F, D>,
    op4: qt.Lifter<C, D, F, D>,
    op5: qt.Lifter<D, E, F, D>,
    op6: qt.Lifter<E, F, F, D>,
    op7: qt.Lifter<F, G, F, D>
  ): Source<G, F, D>;
  pipe<A, B, C, D, E, F, G, H>(
    op1: qt.Lifter<N, A, F, D>,
    op2: qt.Lifter<A, B, F, D>,
    op3: qt.Lifter<B, C, F, D>,
    op4: qt.Lifter<C, D, F, D>,
    op5: qt.Lifter<D, E, F, D>,
    op6: qt.Lifter<E, F, F, D>,
    op7: qt.Lifter<F, G, F, D>,
    op8: qt.Lifter<G, H, F, D>
  ): Source<H, F, D>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: qt.Lifter<N, A, F, D>,
    op2: qt.Lifter<A, B, F, D>,
    op3: qt.Lifter<B, C, F, D>,
    op4: qt.Lifter<C, D, F, D>,
    op5: qt.Lifter<D, E, F, D>,
    op6: qt.Lifter<E, F, F, D>,
    op7: qt.Lifter<F, G, F, D>,
    op8: qt.Lifter<G, H, F, D>,
    op9: qt.Lifter<H, I, F, D>
  ): Source<I, F, D>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: qt.Lifter<N, A, F, D>,
    op2: qt.Lifter<A, B, F, D>,
    op3: qt.Lifter<B, C, F, D>,
    op4: qt.Lifter<C, D, F, D>,
    op5: qt.Lifter<D, E, F, D>,
    op6: qt.Lifter<E, F, F, D>,
    op7: qt.Lifter<F, G, F, D>,
    op8: qt.Lifter<G, H, F, D>,
    op9: qt.Lifter<H, I, F, D>,
    ...ops: qt.Lifter<any, any, F, D>[]
  ): Source<unknown, F, D>;
  pipe(...ops: qt.Lifter<any, any, F, D>[]): Source<any, F, D> {
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

export enum NotificationKind {
  NEXT = 'N',
  FAIL = 'F',
  DONE = 'D'
}

export class Notification<N, F = any, D = any> {
  hasN: boolean;

  constructor(kind: 'N', n?: N);
  constructor(kind: 'F', n: undefined, f?: F);
  constructor(kind: 'D', d?: D);
  constructor(
    public kind: 'N' | 'F' | 'D',
    public n?: N,
    public f?: F,
    public d?: D
  ) {
    this.hasN = kind === 'N';
  }

  observe(t?: qt.Target<N, F, D>) {
    switch (this.kind) {
      case 'N':
        return t?.next && t.next(this.n);
      case 'F':
        return t?.fail && t.fail(this.f);
      case 'D':
        return t?.done && t.done(this.d);
    }
  }

  do(next?: qt.Ofun<N>, fail?: qt.Ofun<F>, done?: qt.Ofun<D>) {
    switch (this.kind) {
      case 'N':
        return next && next(this.n);
      case 'F':
        return fail && fail(this.f);
      case 'D':
        return done && done(this.d);
    }
  }

  accept(
    t?: qt.Target<N, F, D> | qt.Ofun<N>,
    fail?: qt.Ofun<F>,
    done?: qt.Ofun<D>
  ) {
    if (typeof t === 'function') return this.do(t, fail, done);
    return this.observe(t);
  }

  toSource(): Source<N, F, D> {
    switch (this.kind) {
      case 'N':
        return of(this.n);
      case 'F':
        return throwError(this.f);
      case 'D':
        return EMPTY;
    }
  }

  private static doneNote: Notification<any> = new Notification('D');
  private static undefineNote: Notification<any> = new Notification(
    'N',
    undefined
  );

  static createNext<N, F = any, D = any>(n?: N): Notification<N, F, D> {
    if (n !== undefined) return new Notification('N', n);
    return Notification.undefineNote;
  }

  static createFail<N, F = any, D = any>(f?: F): Notification<N, F, D> {
    return new Notification('F', undefined, f);
  }

  static createDone<N = any, F = any, D = any>(): Notification<N, F, D> {
    return Notification.doneNote;
  }
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

export function firstFrom<T>(s$: Source<T>) {
  return new Promise<T>((res, rej) => {
    const subs = new qj.Subscription();
    subs.add(
      s$.subscribe({
        next: n => {
          res(n);
          subs.unsubscribe();
        },
        fail: rej,
        done: () => {
          rej(new qu.EmptyError());
        }
      })
    );
  });
}

export function lastFrom<T>(s: Source<T>) {
  return new Promise<T>((res, rej) => {
    let hasN = false;
    let value: T | undefined;
    s.subscribe({
      next: n => {
        value = n;
        hasN = true;
      },
      fail: rej,
      done: () => {
        if (hasN) {
          res(value);
        } else {
          rej(new qu.EmptyError());
        }
      }
    });
  });
}
