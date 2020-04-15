import * as qt from './types';
import * as qu from './utils';

export class Source<N, F, D> implements qt.Source<N, F, D> {
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
  ERROR = 'E',
  COMPLETE = 'C'
}

export class Notification<T> {
  hasValue: boolean;

  constructor(kind: 'N', value?: T);
  constructor(kind: 'E', value: undefined, error: any);
  constructor(kind: 'C');
  constructor(
    public kind: 'N' | 'E' | 'C',
    public value?: T,
    public error?: any
  ) {
    this.hasValue = kind === 'N';
  }

  observe(observer: Target<T>): any {
    switch (this.kind) {
      case 'N':
        return observer.next && observer.next(this.value!);
      case 'E':
        return observer.error && observer.error(this.error);
      case 'C':
        return observer.complete && observer.complete();
    }
  }

  do(
    next: (value: T) => void,
    error?: (err: any) => void,
    complete?: () => void
  ): any {
    const kind = this.kind;
    switch (kind) {
      case 'N':
        return next && next(this.value!);
      case 'E':
        return error && error(this.error);
      case 'C':
        return complete && complete();
    }
  }

  accept(
    nextOrObserver: Target<T> | ((value: T) => void),
    error?: (err: any) => void,
    complete?: () => void
  ) {
    if (
      nextOrObserver &&
      typeof (<Target<T>>nextOrObserver).next === 'function'
    ) {
      return this.observe(<Target<T>>nextOrObserver);
    } else {
      return this.do(<(value: T) => void>nextOrObserver, error, complete);
    }
  }

  toObservable(): Observable<T> {
    const kind = this.kind;
    switch (kind) {
      case 'N':
        return of(this.value!);
      case 'E':
        return throwError(this.error);
      case 'C':
        return EMPTY;
    }
    throw new Error('unexpected notification kind value');
  }

  private static completeNotification: Notification<any> = new Notification(
    'C'
  );
  private static undefinedValueNotification: Notification<
    any
  > = new Notification('N', undefined);

  static createNext<T>(value: T): Notification<T> {
    if (typeof value !== 'undefined') {
      return new Notification('N', value);
    }
    return Notification.undefinedValueNotification;
  }

  static createError<T>(err?: any): Notification<T> {
    return new Notification('E', undefined, err);
  }

  static createComplete(): Notification<any> {
    return Notification.completeNotification;
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

export function firstValueFrom<T>(source$: Observable<T>) {
  return new Promise<T>((resolve, reject) => {
    const subs = new Subscription();
    subs.add(
      source$.subscribe({
        next: value => {
          resolve(value);
          subs.unsubscribe();
        },
        error: reject,
        complete: () => {
          reject(new EmptyError());
        }
      })
    );
  });
}

export function lastValueFrom<T>(source: Observable<T>) {
  return new Promise<T>((resolve, reject) => {
    let _hasValue = false;
    let _value: T;
    source.subscribe({
      next: value => {
        _value = value;
        _hasValue = true;
      },
      error: reject,
      complete: () => {
        if (_hasValue) {
          resolve(_value);
        } else {
          reject(new EmptyError());
        }
      }
    });
  });
}
