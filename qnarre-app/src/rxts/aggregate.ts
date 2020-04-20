import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';

export function concat<A extends qt.SourceInput<any>[]>(
  ...observables: A
): qs.Source<SourcedFrom<A>>;
export function concat<O extends qt.SourceInput<any>>(
  ...observables: Array<O | qh.Scheduler>
): qs.Source<Sourced<O>> {
  return concatAll<Sourced<O>>()(of(...observables) as qs.Source<Sourced<O>>);
}

export function concatAll<N, F, D>(): Lifter<SourceInput<N, F, D>, T>;
export function concatAll<R>(): Lifter<any, R>;
export function concatAll<N, F, D>(): Lifter<SourceInput<N, F, D>, T> {
  return mergeAll<N, F, D>(1);
}

export function concatWith<N, F, D>(): Lifter<T, T>;
export function concatWith<T, A extends SourceInput<any>[]>(
  ...otherSources: A
): Lifter<T, SourcedFrom<A> | T>;
export function concatWith<T, A extends SourceInput<any>[]>(
  ...otherSources: A
): Lifter<T, SourcedFrom<A> | T> {
  return (source: qt.Source<N, F, D>) =>
    source.lift.call(
      concatStatic(source, ...otherSources),
      undefined
    ) as qt.Source<SourcedFrom<A> | T>;
}

export function count<N, F, D>(
  predicate?: (value: T, index: number, source: qt.Source<N, F, D>) => boolean
): Lifter<T, number> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new CountO(predicate, source));
}

class CountO<N, F, D> implements qt.Operator<T, number> {
  constructor(
    private predicate:
      | ((value: T, index: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<number>, source: any): any {
    return source.subscribe(
      new CountR(subscriber, this.predicate, this.source)
    );
  }
}

export class CountR<N, F, D> extends Subscriber<N, F, D> {
  private count = 0;
  private index = 0;

  constructor(
    tgt: qt.Observer<number, F, D>,
    private predicate:
      | ((value: N, index: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (this.predicate) this._tryPredicate(v);
    else this.count++;
  }

  private _tryPredicate(value: N) {
    let result: any;
    try {
      result = this.predicate!(value, this.index++, this.source);
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
  comparer?: (x: T, y: N) => number
): qt.MonoOper<N, F, D> {
  const max: (x: T, y: N) => T =
    typeof comparer === 'function'
      ? (x, y) => (comparer(x, y) > 0 ? x : y)
      : (x, y) => (x > y ? x : y);

  return reduce(max);
}

export function min<N, F, D>(
  comparer?: (x: T, y: N) => number
): qt.MonoOper<N, F, D> {
  const min: (x: T, y: N) => T =
    typeof comparer === 'function'
      ? (x, y) => (comparer(x, y) < 0 ? x : y)
      : (x, y) => (x < y ? x : y);
  return reduce(min);
}

export function reduce<V, A = V>(
  accumulator: (acc: A | V, value: V, index: number) => A
): Lifter<V, V | A>;
export function reduce<V, A>(
  accumulator: (acc: A, value: V, index: number) => A,
  seed: A
): Lifter<V, A>;
export function reduce<V, A, S = A>(
  accumulator: (acc: A | S, value: V, index: number) => A,
  seed: S
): Lifter<V, A>;
export function reduce<V, A>(
  accumulator: (acc: V | A, value: V, index: number) => A,
  seed?: any
): Lifter<V, V | A> {
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
