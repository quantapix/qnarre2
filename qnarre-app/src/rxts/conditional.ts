import * as qh from './scheduler';
import * as qj from './subject';
import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';

export function defaultIfEmpty<N, R = N>(defaultValue?: R): qt.Lifter<N, T | R>;
export function defaultIfEmpty<N, R>(
  defaultValue: R | null = null
): qt.Lifter<N, T | R> {
  return x => x.lift(new DefaultIfEmptyO(defaultValue)) as qt.Source<N | R>;
}

class DefaultIfEmptyO<N, R> implements qt.Operator<N, T | R> {
  constructor(private defaultValue: R) {}

  call(subscriber: qj.Subscriber<N | R>, source: any): any {
    return source.subscribe(new DefaultIfEmptyR(subscriber, this.defaultValue));
  }
}

export class DefaultIfEmptyR<N, M, F, D> extends qj.Subscriber<N, F, D> {
  private isEmpty = true;

  constructor(tgt: qj.Subscriber<N | M, F, D>, private defaultValue: M) {
    super(tgt);
  }

  protected _next(n?: N | M) {
    this.isEmpty = false;
    this.tgt.next(n);
  }

  protected _done(d?: D) {
    if (this.isEmpty) this.tgt.next(this.defaultValue);
    this.tgt.done();
  }
}

export function every<N, F, D>(
  predicate: (n: N, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): qt.Lifter<N, boolean> {
  return x => x.lift(new EveryO(predicate, thisArg, source));
}

class EveryO<N, F, D> implements qt.Operator<N, boolean> {
  constructor(
    private predicate: (
      n: N,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private thisArg: any,
    private source: qt.Source<N, F, D>
  ) {}

  call(observer: qj.Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new EveryR(observer, this.predicate, this.thisArg, this.source)
    );
  }
}

export class EveryR<N, F, D> extends qj.Subscriber<N, F, D> {
  private index = 0;

  constructor(
    tgt: qt.Observer<boolean, F, D>,
    private predicate: (
      value: N,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private thisArg: any,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
    this.thisArg = thisArg || this;
  }

  private reactDone(everyValueMatch: boolean) {
    this.tgt.next(everyValueMatch);
    this.tgt.done();
  }

  protected _next(n?: N) {
    let result = false;
    try {
      result = this.predicate.call(this.thisArg, n, this.index++, this.source);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    if (!result) this.reactDone(false);
  }

  protected _done(d?: D) {
    this.reactDone(true);
  }
}

export function find<N, S extends N>(
  predicate: (n: N, index: number, source: qt.Source<N, F, D>) => value is S,
  thisArg?: any
): qt.Lifter<N, S | undefined>;
export function find<N, F, D>(
  predicate: (n: N, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): qt.Lifter<N, T | undefined>;
export function find<N, F, D>(
  predicate: (n: N, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): qt.Lifter<N, T | undefined> {
  if (typeof predicate !== 'function') {
    throw new TypeError('predicate is not a function');
  }
  return x =>
    x.lift(new FindValueO(predicate, source, false, thisArg)) as qt.Source<
      N | undefined
    >;
}

export function findIndex<N, F, D>(
  predicate: (n: N, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): qt.Lifter<N, number> {
  return x =>
    x.lift(new FindValueO(predicate, source, true, thisArg)) as qt.Source<
      any,
      F,
      D
    >;
}

export class FindValueO<N, F, D>
  implements qt.Operator<N, N | number | undefined> {
  constructor(
    private predicate: (
      n: N,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private source: qt.Source<N, F, D>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {}

  call(observer: qj.Subscriber<N, F, D>, source: any): any {
    return source.subscribe(
      new FindValueR(
        observer,
        this.predicate,
        this.source,
        this.yieldIndex,
        this.thisArg
      )
    );
  }
}

export class FindValueR<N, F, D> extends qj.Subscriber<N, F, D> {
  private index = 0;

  constructor(
    tgt: qj.Subscriber<N, F, D>,
    private predicate: (
      value: N,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private source: qt.Source<N, F, D>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {
    super(tgt);
  }

  private reactDone(d?: D) {
    const tgt = this.tgt;
    tgt.next(d);
    tgt.done(d);
    this.unsubscribe();
  }

  protected _next(n?: N) {
    const {predicate, thisArg} = this;
    const index = this.index++;
    try {
      const result = predicate.call(thisArg || this, n, index, this.source);
      if (result) this.reactDone(this.yieldIndex ? index : n);
    } catch (e) {
      this.tgt.fail(e);
    }
  }

  protected _done(d?: D) {
    this.reactDone(this.yieldIndex ? -1 : undefined);
  }
}

export function isEmpty<N, F, D>(): qt.Lifter<N, boolean> {
  return x => x.lift(new IsEmptyO());
}

class IsEmptyO implements qt.Operator<any, boolean> {
  call(observer: qj.Subscriber<boolean>, source: any): any {
    return source.subscribe(new IsEmptyR(observer));
  }
}

export class IsEmptyR<N extends boolean, F, D> extends qj.Subscriber<N, F, D> {
  constructor(tgt: qj.Subscriber<N, F, D>) {
    super(tgt);
  }

  private reactDone(empty: N) {
    const tgt = this.tgt;
    tgt.next(empty);
    tgt.done();
  }

  protected _next(_n?: N) {
    this.reactDone(false as N);
  }

  protected _done(d?: D) {
    this.reactDone(true as N);
  }
}
