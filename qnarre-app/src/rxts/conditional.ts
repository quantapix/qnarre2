import * as qh from './scheduler';
import * as qj from './subject';
import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';

export function defaultIfEmpty<N, R = N>(defaultValue?: R): qt.Lifter<N, T | R>;
export function defaultIfEmpty<N, R>(defaultValue: R = null): qt.Lifter<N, T | R> {
  return x => x.lift(new DefaultIfEmptyO(defaultValue)) as qt.Source<N | R>;
}

class DefaultIfEmptyO<N, R> implements qt.Operator<N, T | R> {
  constructor(private defaultValue: R) {}

  call(subscriber: qj.Subscriber<N | R>, source: any): any {
    return source.subscribe(new DefaultIfEmptyR(subscriber, this.defaultValue));
  }
}

export class DefaultIfEmptyR<N, M> extends qj.Subscriber<N> {
  private isEmpty = true;

  constructor(tgt: qj.Subscriber<N | M>, private defaultValue: M) {
    super(tgt);
  }

  protected _next(n?: N | M) {
    this.isEmpty = false;
    this.tgt.next(n);
  }

  protected _done() {
    if (this.isEmpty) this.tgt.next(this.defaultValue);
    this.tgt.done();
  }
}

export function every<N>(
  predicate: (n: N, index: number, source: qt.Source<N>) => boolean,
  thisArg?: any
): qt.Lifter<N, boolean> {
  return x => x.lift(new EveryO(predicate, thisArg, source));
}

class EveryO<N> implements qt.Operator<N, boolean> {
  constructor(
    private predicate: (n: N, index: number, source: qt.Source<N>) => boolean,
    private thisArg: any,
    private source: qt.Source<N>
  ) {}

  call(observer: qj.Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new EveryR(observer, this.predicate, this.thisArg, this.source)
    );
  }
}

export class EveryR<N> extends qj.Subscriber<N> {
  private index = 0;

  constructor(
    tgt: qt.Observer<boolean>,
    private predicate: (value: N, index: number, source: qt.Source<N>) => boolean,
    private thisArg: any,
    private source: qt.Source<N>
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

  protected _done() {
    this.reactDone(true);
  }
}

export function find<N, S extends N>(
  predicate: (n: N, index: number, source: qt.Source<N>) => value is S,
  thisArg?: any
): qt.Lifter<N, S | undefined>;
export function find<N>(
  predicate: (n: N, index: number, source: qt.Source<N>) => boolean,
  thisArg?: any
): qt.Lifter<N, T | undefined>;
export function find<N>(
  predicate: (n: N, index: number, source: qt.Source<N>) => boolean,
  thisArg?: any
): qt.Lifter<N, T | undefined> {
  if (typeof predicate !== 'function') {
    throw new TypeError('predicate is not a function');
  }
  return x =>
    x.lift(new FindValueO(predicate, source, false, thisArg)) as qt.Source<N | undefined>;
}

export function findIndex<N>(
  predicate: (n: N, index: number, source: qt.Source<N>) => boolean,
  thisArg?: any
): qt.Lifter<N, number> {
  return x =>
    x.lift(new FindValueO(predicate, source, true, thisArg)) as qt.Source<any, F, D>;
}

export class FindValueO<N> implements qt.Operator<N, N | number | undefined> {
  constructor(
    private predicate: (n: N, index: number, source: qt.Source<N>) => boolean,
    private source: qt.Source<N>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {}

  call(observer: qj.Subscriber<N>, source: any): any {
    return source.subscribe(
      new FindValueR(observer, this.predicate, this.source, this.yieldIndex, this.thisArg)
    );
  }
}

export class FindValueR<N> extends qj.Subscriber<N> {
  private index = 0;

  constructor(
    tgt: qj.Subscriber<N>,
    private predicate: (value: N, index: number, source: qt.Source<N>) => boolean,
    private source: qt.Source<N>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {
    super(tgt);
  }

  private reactDone(d?: D) {
    const tgt = this.tgt;
    tgt.next(d);
    tgt.done();
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

  protected _done() {
    this.reactDone(this.yieldIndex ? -1 : undefined);
  }
}

export function isEmpty<N>(): qt.Lifter<N, boolean> {
  return x => x.lift(new IsEmptyO());
}

class IsEmptyO implements qt.Operator<any, boolean> {
  call(observer: qj.Subscriber<boolean>, source: any): any {
    return source.subscribe(new IsEmptyR(observer));
  }
}

export class IsEmptyR<N extends boolean> extends qj.Subscriber<N> {
  constructor(tgt: qj.Subscriber<N>) {
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

  protected _done() {
    this.reactDone(true as N);
  }
}
