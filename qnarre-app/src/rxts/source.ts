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

  orig?: Source<any>;
  oper?: qt.Operator<any, N>;

  constructor(s?: (this: Source<N>, _: qt.Subscriber<N>) => qt.Closer) {
    if (s) this._subscribe = s;
  }

  _subscribe(s: qt.Subscriber<N>): qt.Closer {
    return this.orig!.subscribe(s);
  }

  _trySubscribe(s: qt.Subscriber<N>) {
    try {
      return this._subscribe(s);
    } catch (e) {
      if (qu.canReportError(s)) s.fail(e);
      else console.warn(e);
    }
  }

  lift<R>(o?: qt.Operator<N, R>) {
    const s = new Source<R>();
    s.orig = this;
    s.oper = o;
    return s;
  }

  subscribe(t?: qt.Target<N>): qt.Subscription;
  subscribe(next?: qt.Fun<N>, fail?: qt.Fun<any>, done?: qt.Fun<void>): qt.Subscription;
  subscribe(
    t?: qt.Target<N> | qt.Fun<N>,
    fail?: qt.Fun<any>,
    done?: qt.Fun<void>
  ): qt.Subscription {
    const s = qr.toSubscriber(t, fail, done);
    const o = this.oper;
    if (o) s.add(o.call(s, this.orig!));
    else s.add(this.orig ? this._subscribe(s) : this._trySubscribe(s));
    return s;
  }

  forEach(next?: qt.Fun<N>, c?: PromiseConstructorLike) {
    c = promiseCtor(c);
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

  toPromise<T>(this: Source<T>): Promise<T | undefined>;
  toPromise<T>(this: Source<T>, c: typeof Promise): Promise<T | undefined>;
  toPromise<T>(this: Source<T>, c: PromiseConstructorLike): Promise<T | undefined>;
  toPromise(c?: PromiseConstructorLike): Promise<N | undefined> {
    c = promiseCtor(c);
    return new c((res, rej) => {
      let value: N | undefined;
      this.subscribe(
        (n: N) => (value = n),
        (e: any) => rej(e),
        () => res(value)
      );
    }) as Promise<N | undefined>;
  }
}

function promiseCtor(c?: PromiseConstructorLike) {
  if (!c) c = Promise;
  if (!c) throw new Error('no Promise impl found');
  return c;
}

function asyncIterFrom<N>(s: Source<N>) {
  return coroutine(s);
}

class Deferred<N> {
  resolve?: qt.Fun<N | PromiseLike<N>>;
  reject?: qt.Fun<any>;
  promise = new Promise<N>((res, rej) => {
    this.resolve = res;
    this.reject = rej;
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
      if (ds.length > 0) ds.shift()!.resolve?.({value: n, done: false});
      else ns.push(n);
    },
    fail: (e: any) => {
      failed = true;
      err = e;
      while (ds.length > 0) {
        ds.shift()!.reject?.(e);
      }
    },
    done: () => {
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
        const d = new Deferred<IteratorResult<N>>();
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

export class Grouped<K, N> extends Source<N> {
  constructor(public key: K, private group: qt.Subject<N>, private ref?: qt.RefCounted) {
    super();
  }

  _subscribe(r: qt.Subscriber<N>) {
    const s = new qr.Subscription();
    const {ref, group} = this;
    if (ref && !ref.closed) s.add(new ActorRefCounted(ref));
    s.add(group.subscribe(r));
    return s;
  }
}

export enum NoteKind {
  NEXT = 'N',
  FAIL = 'F',
  DONE = 'D'
}

export class Note<N> {
  static createNext<N>(n?: N): Note<N> {
    if (n === undefined) return Note.undefNote;
    return new Note('N', n);
  }

  static createFail<N>(e: any): Note<N> {
    return new Note('F', undefined, e);
  }

  static createDone<N>(): Note<N> {
    return Note.doneNote;
  }

  private static doneNote: Note<any> = new Note('D');
  private static undefNote: Note<any> = new Note('N', undefined);

  hasN: boolean;

  constructor(kind: 'N', n: N);
  constructor(kind: 'F', n: undefined, e: any);
  constructor(kind: 'D');
  constructor(public kind: 'N' | 'F' | 'D', public n?: N, public e?: any) {
    this.hasN = kind === 'N';
  }

  observe(t?: qt.Target<N>) {
    switch (this.kind) {
      case 'N':
        return t?.next && t.next(this.n!);
      case 'F':
        return t?.fail && t.fail(this.e);
      case 'D':
        return t?.done && t.done();
    }
  }

  act(next?: qt.Fun<N>, fail?: qt.Fun<any>, done?: qt.Fun<void>) {
    switch (this.kind) {
      case 'N':
        return next && next(this.n!);
      case 'F':
        return fail && fail(this.e);
      case 'D':
        return done && done();
    }
  }

  accept(t?: qt.Target<N> | qt.Fun<N>, fail?: qt.Fun<any>, done?: qt.Fun<void>) {
    if (typeof t === 'function') return this.act(t, fail, done);
    return this.observe(t);
  }

  toSource(): Source<N> {
    switch (this.kind) {
      case 'N':
        return of(this.n);
      case 'F':
        return throwError(this.f);
      case 'D':
        return EMPTY;
    }
  }
}

export function firstFrom<N>(s$: Source<N>) {
  return new Promise<N>((res, rej) => {
    const subs = new qr.Subscription();
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

export function lastFrom<N>(s: Source<N>) {
  return new Promise<N>((res, rej) => {
    let hasN = false;
    let value: N | undefined;
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
