import * as qh from './scheduler';
import * as qj from './subject';
import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';

export function concat<A extends qt.SourceInput<any>[]>(
  ...observables: A
): qs.Source<qt.SourcedFrom<A>>;
export function concat<O extends qt.SourceInput<any>>(
  ...observables: Array<O | qh.Scheduler>
): qs.Source<qt.Sourced<O>> {
  return concatAll<qt.Sourced<O>>()(
    of(...observables) as qs.Source<qt.Sourced<O>>
  );
}

export function concatAll<N, F, D>(): qt.Lifter<SourceInput<N, F, D>, T>;
export function concatAll<R>(): qt.Lifter<any, R>;
export function concatAll<N, F, D>(): qt.Lifter<SourceInput<N, F, D>, T> {
  return mergeAll<N, F, D>(1);
}

export function concatWith<N, F, D>(): qt.Lifter<N, T>;
export function concatWith<N, A extends qt.SourceInput<any>[]>(
  ...otherSources: A
): qt.Lifter<N, SourcedFrom<A> | N>;
export function concatWith<N, A extends qt.SourceInput<any>[]>(
  ...otherSources: A
): qt.Lifter<N, SourcedFrom<A> | N> {
  return (source: qt.Source<N, F, D>) =>
    source.lift.call(
      concatStatic(source, ...otherSources),
      undefined
    ) as qt.Source<qt.SourcedFrom<A> | N>;
}

export function count<N, F, D>(
  predicate?: (n: N, index: number, source: qt.Source<N, F, D>) => boolean
): qt.Lifter<N, number> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new CountO(predicate, source));
}

class CountO<N, F, D> implements qt.Operator<N, number> {
  constructor(
    private predicate:
      | ((n: N, index: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {}

  call(subscriber: qj.Subscriber<number>, source: any): any {
    return source.subscribe(
      new CountR(subscriber, this.predicate, this.source)
    );
  }
}

export class CountR<N, F, D> extends qj.Subscriber<N, F, D> {
  private count = 0;
  private index = 0;

  constructor(
    tgt: qt.Observer<number, F, D>,
    private predicate:
      | ((n: N, index: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (this.predicate) this._tryPredicate(n);
    else this.count++;
  }

  private _tryPredicate(n: N) {
    let result: any;
    try {
      result = this.predicate!(n, this.index++, this.source);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    if (result) this.count++;
  }

  protected _done(d?: D) {
    this.tgt.next(this.count);
    this.tgt.done();
  }
}

export function max<N, F, D>(
  comparer?: (x: N, y: N) => number
): qt.MonoOper<N, F, D> {
  const max: (x: N, y: N) => N =
    typeof comparer === 'function'
      ? (x, y) => (comparer(x, y) > 0 ? x : y)
      : (x, y) => (x > y ? x : y);
  return reduce(max);
}

export function min<N, F, D>(
  comparer?: (x: N, y: N) => number
): qt.MonoOper<N, F, D> {
  const min: (x: N, y: N) => N =
    typeof comparer === 'function'
      ? (x, y) => (comparer(x, y) < 0 ? x : y)
      : (x, y) => (x < y ? x : y);
  return reduce(min);
}

export function reduce<V, A = V>(
  accumulator: (acc: A | V, value: V, index: number) => A
): qt.Lifter<V, V | A>;
export function reduce<V, A>(
  accumulator: (acc: A, value: V, index: number) => A,
  seed: A
): qt.Lifter<V, A>;
export function reduce<V, A, S = A>(
  accumulator: (acc: A | S, value: V, index: number) => A,
  seed: S
): qt.Lifter<V, A>;
export function reduce<V, A>(
  accumulator: (acc: V | A, value: V, index: number) => A,
  seed?: any
): qt.Lifter<V, V | A> {
  if (arguments.length >= 2) {
    return function reduceLifterWithSeed(
      source: qt.Source<V>
    ): qt.Source<V | A> {
      return pipe(
        scan(accumulator, seed),
        takeLast(1),
        defaultIfEmpty(seed)
      )(source);
    };
  }
  return function reduceLifter(source: qt.Source<V>): qt.Source<V | A> {
    return pipe(
      scan<V, V | A>((acc, value, index) => accumulator(acc, value, index + 1)),
      takeLast(1)
    )(source);
  };
}
