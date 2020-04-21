import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';
import * as qh from './scheduler';

export function combineLatest<O1 extends qt.Input<any>>(
  sources: [O1]
): qs.Source<[qt.Sourced<O1>]>;
export function combineLatest<
  O1 extends qt.Input<any>,
  O2 extends qt.Input<any>
>(sources: [O1, O2]): qs.Source<[qt.Sourced<O1>, qt.Sourced<O2>]>;
export function combineLatest<
  O1 extends qt.Input<any>,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>
>(
  sources: [O1, O2, O3]
): qs.Source<[qt.Sourced<O1>, qt.Sourced<O2>, qt.Sourced<O3>]>;
export function combineLatest<
  O1 extends qt.Input<any>,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>
>(
  sources: [O1, O2, O3, O4]
): qs.Source<[qt.Sourced<O1>, qt.Sourced<O2>, qt.Sourced<O3>, qt.Sourced<O4>]>;
export function combineLatest<
  O1 extends qt.Input<any>,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>,
  O5 extends qt.Input<any>
>(
  sources: [O1, O2, O3, O4, O5]
): qs.Source<
  [
    qt.Sourced<O1>,
    qt.Sourced<O2>,
    qt.Sourced<O3>,
    qt.Sourced<O4>,
    qt.Sourced<O5>
  ]
>;
export function combineLatest<
  O1 extends qt.Input<any>,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>,
  O5 extends qt.Input<any>,
  O6 extends qt.Input<any>
>(
  sources: [O1, O2, O3, O4, O5, O6]
): qs.Source<
  [
    qt.Sourced<O1>,
    qt.Sourced<O2>,
    qt.Sourced<O3>,
    qt.Sourced<O4>,
    qt.Sourced<O5>,
    qt.Sourced<O6>
  ]
>;
export function combineLatest<O extends qt.Input<any>>(
  sources: O[]
): qs.Source<qt.Sourced<O>[]>;
export function combineLatest<O extends qt.Input<any>, R>(
  ...observables: (O | ((...values: qt.Sourced<O>[]) => R) | qh.Scheduler)[]
): qs.Source<R> {
  let resultSelector: ((...values: Array<any>) => R) | undefined = undefined;
  let scheduler: qh.Scheduler | undefined = undefined;
  if (qu.isScheduler(observables[observables.length - 1])) {
    scheduler = observables.pop() as qh.Scheduler;
  }
  if (typeof observables[observables.length - 1] === 'function') {
    resultSelector = observables.pop() as (...values: Array<any>) => R;
  }
  if (observables.length === 1 && Array.isArray(observables[0])) {
    observables = observables[0] as any;
  }
  return fromArray(observables, scheduler).lift(
    new CombineLatestO<qt.Sourced<O>, R>(resultSelector)
  );
}

export class CombineLatestO<T, R> implements qt.Operator<T, R> {
  constructor(private resultSelector?: (...values: Array<any>) => R) {}

  call(r: qj.Subscriber<R>, s: any): any {
    return s.subscribe(new CombineLatestR(r, this.resultSelector));
  }
}

export class CombineLatestR<T, R> extends qj.Reactor<T, R> {
  private active: number = 0;
  private values: any[] = [];
  private observables: any[] = [];
  private toRespond: number | undefined;

  constructor(
    destination: qj.Subscriber<R>,
    private resultSelector?: (...values: Array<any>) => R
  ) {
    super(destination);
  }

  protected _next(observable: any) {
    this.values.push(NONE);
    this.observables.push(observable);
  }

  protected _done() {
    const observables = this.observables;
    const len = observables.length;
    if (len === 0) {
      this.destination.done();
    } else {
      this.active = len;
      this.toRespond = len;
      for (let i = 0; i < len; i++) {
        const observable = observables[i];
        this.add(qu.subscribeToResult(this, observable, observable, i));
      }
    }
  }

  reactDone(unused: qj.Subscriber<R>) {
    if ((this.active -= 1) === 0) {
      this.destination.done();
    }
  }

  reactNext(outerN: T, innerValue: R, outerX: number) {
    const values = this.values;
    const oldVal = values[outerX];
    const toRespond = !this.toRespond
      ? 0
      : oldVal === NONE
      ? --this.toRespond
      : this.toRespond;
    values[outerX] = innerValue;
    if (toRespond === 0) {
      if (this.resultSelector) this._tryResultSelector(values);
      else this.destination.next(values.slice());
    }
  }

  private _tryResultSelector(values: any[]) {
    let result: any;
    try {
      result = this.resultSelector!.apply(this, values);
    } catch (e) {
      this.destination.fail(e);
      return;
    }
    this.destination.next(result);
  }
}

export function combineLatest<T, R>(
  ...observables: Array<
    qt.Input<any> | Array<qt.Input<any>> | ((...values: Array<any>) => R)
  >
): qt.Lifter<T, R> {
  let project: ((...values: Array<any>) => R) | undefined = undefined;
  if (typeof observables[observables.length - 1] === 'function') {
    project = <(...values: Array<any>) => R>observables.pop();
  }
  if (observables.length === 1 && Array.isArray(observables[0])) {
    observables = (<any>observables[0]).slice();
  }
  return x =>
    x.lift.call(
      from([x, ...observables]),
      new CombineLatestO(project)
    ) as qt.Source<R>;
}

export function combineLatestWith<T, A extends qt.Input<any>[]>(
  ...otherSources: A
): qt.Lifter<T, Unshift<SourcedTuple<A>, T>> {
  return combineLatest(...otherSources);
}

export function combineAll<N, F, D>(): qt.Lifter<qt.Input<N, F, D>, T[]>;
export function combineAll<N, F, D>(): qt.Lifter<any, T[]>;
export function combineAll<T, R>(
  project: (...values: T[]) => R
): qt.Lifter<qt.Input<N, F, D>, R>;
export function combineAll<R>(
  project: (...values: Array<any>) => R
): qt.Lifter<any, R>;
export function combineAll<T, R>(
  project?: (...values: Array<any>) => R
): qt.Lifter<T, R> {
  return x => x.lift(new CombineLatestO(project));
}

export function endWith<T, A extends any[]>(
  ...args: A
): qt.Lifter<T, T | ValueOf<A>>;
export function endWith<N, F, D>(
  ...values: Array<T | qt.Scheduler>
): qt.Shifter<N, F, D> {
  return x => concatStatic(x, of(...values)) as qt.Source<N, F, D>;
}

export function forkJoin<A>(sources: [qt.Input<A>]): qs.Source<[A]>;
export function forkJoin<A, B>(
  sources: [qt.Input<A>, qt.Input<B>]
): qs.Source<[A, B]>;
export function forkJoin<A, B, C>(
  sources: [qt.Input<A>, qt.Input<B>, qt.Input<C>]
): qs.Source<[A, B, C]>;
export function forkJoin<A, B, C, D>(
  sources: [qt.Input<A>, qt.Input<B>, qt.Input<C>, qt.Input<D>]
): qs.Source<[A, B, C, D]>;
export function forkJoin<A, B, C, D, E>(
  sources: [qt.Input<A>, qt.Input<B>, qt.Input<C>, qt.Input<D>, qt.Input<E>]
): qs.Source<[A, B, C, D, E]>;
export function forkJoin<A, B, C, D, E, F>(
  sources: [
    qt.Input<A>,
    qt.Input<B>,
    qt.Input<C>,
    qt.Input<D>,
    qt.Input<E>,
    qt.Input<F>
  ]
): qs.Source<[A, B, C, D, E, F]>;
export function forkJoin<A extends qt.Input<any>[]>(
  sources: A
): qs.Source<qt.SourcedOf<A>[]>;
export function forkJoin(sourcesObject: {}): qs.Source<never>;
export function forkJoin<T, K extends keyof T>(
  sourcesObject: T
): qs.Source<{[K in keyof T]: qt.Sourced<T[K]>}>;
export function forkJoin(...sources: any[]): qs.Source<any> {
  if (sources.length === 1) {
    const first = sources[0];
    if (Array.isArray(first)) {
      return forkJoinInternal(first, null);
    }
    if (
      qu.isObject(first) &&
      Object.getPrototypeOf(first) === Object.prototype
    ) {
      const keys = Object.keys(first);
      return forkJoinInternal(
        keys.map(key => first[key]),
        keys
      );
    }
  }
  if (typeof sources[sources.length - 1] === 'function') {
    const resultSelector = sources.pop() as Function;
    sources =
      sources.length === 1 && Array.isArray(sources[0]) ? sources[0] : sources;
    return forkJoinInternal(sources, null).pipe(
      map((args: any[]) => resultSelector(...args))
    );
  }
  return forkJoinInternal(sources, null);
}

function forkJoinInternal(
  sources: qt.Input<any>[],
  keys: string[] | null
): qs.Source<any> {
  return new qs.Source(subscriber => {
    const len = sources.length;
    if (len === 0) {
      subscriber.done();
      return;
    }
    const values = new Array(len);
    let completed = 0;
    let emitted = 0;
    for (let i = 0; i < len; i++) {
      const source = from(sources[i]);
      let hasValue = false;
      subscriber.add(
        source.subscribe({
          next: value => {
            if (!hasValue) {
              hasValue = true;
              emitted++;
            }
            values[i] = value;
          },
          error: err => subscriber.fail(e),
          complete: () => {
            completed++;
            if (completed === len || !hasValue) {
              if (emitted === len) {
                subscriber.next(
                  keys
                    ? keys.reduce(
                        (result, key, i) => (
                          ((result as any)[key] = values[i]), result
                        ),
                        {}
                      )
                    : values
                );
              }
              subscriber.done();
            }
          }
        })
      );
    }
  });
}

export function merge<T>(v1: qt.Input<T>): qs.Source<T>;
export function merge<T>(v1: qt.Input<T>, concurrent?: number): qs.Source<T>;
export function merge<T, T2>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>
): qs.Source<T | T2>;
export function merge<T, T2>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>,
  concurrent?: number
): qs.Source<T | T2>;
export function merge<T, T2, T3>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>,
  v3: qt.Input<T3>
): qs.Source<T | T2 | T3>;
export function merge<T, T2, T3>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  concurrent?: number
): qs.Source<T | T2 | T3>;
export function merge<T, T2, T3, T4>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>
): qs.Source<T | T2 | T3 | T4>;
export function merge<T, T2, T3, T4>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>,
  concurrent?: number
): qs.Source<T | T2 | T3 | T4>;
export function merge<T, T2, T3, T4, T5>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>,
  v5: qt.Input<T5>
): qs.Source<T | T2 | T3 | T4 | T5>;
export function merge<T, T2, T3, T4, T5>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>,
  v5: qt.Input<T5>,
  concurrent?: number
): qs.Source<T | T2 | T3 | T4 | T5>;
export function merge<T, T2, T3, T4, T5, T6>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>,
  v5: qt.Input<T5>,
  v6: qt.Input<T6>
): qs.Source<T | T2 | T3 | T4 | T5 | T6>;
export function merge<T, T2, T3, T4, T5, T6>(
  v1: qt.Input<T>,
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>,
  v5: qt.Input<T5>,
  v6: qt.Input<T6>,
  concurrent?: number
): qs.Source<T | T2 | T3 | T4 | T5 | T6>;
export function merge<T>(
  ...observables: (qt.Input<T> | number)[]
): qs.Source<T>;
export function merge<T, R>(
  ...observables: (qt.Input<any> | number)[]
): qs.Source<R>;
export function merge<T, R>(
  ...observables: Array<qt.Input<any> | qh.Scheduler | number | undefined>
): qs.Source<R> {
  let concurrent = Number.POSITIVE_INFINITY;
  let scheduler: qh.Scheduler | undefined = undefined;
  let last: any = observables[observables.length - 1];
  if (qu.isScheduler(last)) {
    scheduler = <Scheduler>observables.pop();
    if (
      observables.length > 1 &&
      typeof observables[observables.length - 1] === 'number'
    ) {
      concurrent = <number>observables.pop();
    }
  } else if (typeof last === 'number') {
    concurrent = <number>observables.pop();
  }

  if (
    !scheduler &&
    observables.length === 1 &&
    observables[0] instanceof qt.Source
  ) {
    return <qt.Source<R>>observables[0];
  }

  return mergeAll<R>(concurrent)(fromArray<any>(observables, scheduler));
}

export function mergeAll<N, F, D>(
  concurrent: number = Number.POSITIVE_INFINITY
): qt.Lifter<qt.Input<N, F, D>, T> {
  return mergeMap(identity, concurrent);
}

export function mergeWith<N, F, D>(): qt.Lifter<T, T>;
export function mergeWith<T, A extends qt.Input<any>[]>(
  ...otherSources: A
): qt.Lifter<T, T | qt.SourcedOf<A>>;
export function mergeWith<T, A extends qt.Input<any>[]>(
  ...otherSources: A
): qt.Lifter<T, T | qt.SourcedOf<A>> {
  return merge(...otherSources);
}

export function race<A extends qt.Input<any>[]>(
  observables: A
): qs.Source<qt.SourcedOf<A>>;
export function race<A extends qt.Input<any>[]>(
  ...observables: A
): qs.Source<qt.SourcedOf<A>>;
export function race<T>(
  ...observables: (qt.Input<T> | qt.Input<T>[])[]
): qs.Source<any> {
  if (observables.length === 1) {
    if (Array.isArray(observables[0])) {
      observables = observables[0] as qt.Input<T>[];
    } else {
      return from(observables[0] as qt.Input<T>);
    }
  }
  return fromArray(observables, undefined).lift(new RaceOperator<T>());
}

export class RaceOperator<T> implements qt.Operator<T, T> {
  call(r: qj.Subscriber<T>, s: any): qt.Closer {
    return s.subscribe(new RaceSubscriber(r));
  }
}

export class RaceSubscriber<T> extends qj.Reactor<T, T> {
  private hasFirst: boolean = false;
  private observables: qs.Source<any>[] = [];
  private subscriptions: qj.Subscription[] = [];

  constructor(destination: qj.Subscriber<T>) {
    super(destination);
  }

  protected _next(observable: any) {
    this.observables.push(observable);
  }

  protected _done() {
    const observables = this.observables;
    const len = observables.length;

    if (len === 0) this.destination.done();
    else {
      for (let i = 0; i < len && !this.hasFirst; i++) {
        let observable = observables[i];
        let subscription = qu.subscribeToResult(
          this,
          observable,
          observable as any,
          i
        );
        if (this.subscriptions) this.subscriptions.push(subscription!);
        this.add(subscription);
      }
      this.observables = null!;
    }
  }

  reactNext(outerN: T, innerValue: T, outerX: number) {
    if (!this.hasFirst) {
      this.hasFirst = true;
      for (let i = 0; i < this.subscriptions.length; i++) {
        if (i !== outerX) {
          let subscription = this.subscriptions[i];
          subscription.unsubscribe();
          this.remove(subscription);
        }
      }
      this.subscriptions = null!;
    }
    this.destination.next(innerValue);
  }

  reactDone(innerSub: ActorSubscriber<T, T>) {
    this.hasFirst = true;
    super.reactDone(innerSub);
  }

  reactFail(error: any, innerSub: ActorSubscriber<T, T>) {
    this.hasFirst = true;
    super.reactFail(error, innerSub);
  }
}

export function startWith<T, A extends any[]>(
  ...values: A
): qt.Lifter<T, T | ValueOf<A>>;
export function startWith<T, D>(...values: D[]): qt.Lifter<T, T | D> {
  const scheduler = values[values.length - 1];
  if (qu.isScheduler(scheduler)) {
    values.pop();
    return x => concatStatic(values, x, scheduler);
  } else {
    return x => concatStatic(values, x);
  }
}

export function zip<O1 extends qt.Input<any>, O2 extends qt.Input<any>>(
  v1: O1,
  v2: O2
): qs.Source<[qt.Sourced<O1>, qt.Sourced<O2>]>;
export function zip<
  O1 extends qt.Input<any>,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>
>(
  v1: O1,
  v2: O2,
  v3: O3
): qs.Source<[qt.Sourced<O1>, qt.Sourced<O2>, qt.Sourced<O3>]>;
export function zip<
  O1 extends qt.Input<any>,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>
>(
  v1: O1,
  v2: O2,
  v3: O3,
  v4: O4
): qs.Source<[qt.Sourced<O1>, qt.Sourced<O2>, qt.Sourced<O3>, qt.Sourced<O4>]>;
export function zip<
  O1 extends qt.Input<any>,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>,
  O5 extends qt.Input<any>
>(
  v1: O1,
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5
): qs.Source<
  [
    qt.Sourced<O1>,
    qt.Sourced<O2>,
    qt.Sourced<O3>,
    qt.Sourced<O4>,
    qt.Sourced<O5>
  ]
>;
export function zip<
  O1 extends qt.Input<any>,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>,
  O5 extends qt.Input<any>,
  O6 extends qt.Input<any>
>(
  v1: O1,
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6
): qs.Source<
  [
    qt.Sourced<O1>,
    qt.Sourced<O2>,
    qt.Sourced<O3>,
    qt.Sourced<O4>,
    qt.Sourced<O5>,
    qt.Sourced<O6>
  ]
>;
export function zip<O extends qt.Input<any>>(
  array: O[]
): qs.Source<qt.Sourced<O>[]>;
export function zip<R>(array: qt.Input<any>[]): qs.Source<R>;
export function zip<O extends qt.Input<any>>(
  ...observables: O[]
): qs.Source<qt.Sourced<O>[]>;
export function zip<O extends qt.Input<any>, R>(
  ...observables: Array<O | ((...values: qt.Sourced<O>[]) => R)>
): qs.Source<R>;
export function zip<R>(
  ...observables: Array<qt.Input<any> | ((...values: Array<any>) => R)>
): qs.Source<R>;
export function zip<O extends qt.Input<any>, R>(
  ...observables: Array<O | ((...values: qt.Sourced<O>[]) => R)>
): qs.Source<qt.Sourced<O>[] | R> {
  const last = observables[observables.length - 1];
  let resultSelector: ((...ys: Array<any>) => R) | undefined = undefined;
  if (typeof last === 'function') {
    resultSelector = observables.pop() as typeof resultSelector;
  }
  return fromArray(observables, undefined).lift(new ZipO(resultSelector));
}

export class ZipO<T, R> implements qt.Operator<T, R> {
  resultSelector?: (...values: Array<any>) => R;

  constructor(resultSelector?: (...values: Array<any>) => R) {
    this.resultSelector = resultSelector;
  }

  call(r: qj.Subscriber<R>, s: any): any {
    return s.subscribe(new ZipR(r, this.resultSelector));
  }
}

export class ZipR<T, R> extends qj.Subscriber<T> {
  private values: any;
  private resultSelector?: (...values: Array<any>) => R;
  private iterators: LookAheadIterator<any>[] = [];
  private active = 0;

  constructor(
    destination: qj.Subscriber<R>,
    resultSelector?: (...values: Array<any>) => R,
    values: any = Object.create(null)
  ) {
    super(destination);
    this.resultSelector = resultSelector;
    this.values = values;
  }

  protected _next(value: any) {
    const iterators = this.iterators;
    if (Array.isArray(value)) {
      iterators.push(new StaticArrayIterator(value));
    } else if (typeof value[Symbol.iterator] === 'function') {
      iterators.push(new StaticIterator(value[Symbol.iterator]()));
    } else {
      iterators.push(new ZipBufferIterator(this.destination, this, value));
    }
  }

  protected _done() {
    const iterators = this.iterators;
    const len = iterators.length;
    this.unsubscribe();
    if (len === 0) {
      this.destination.done();
      return;
    }
    this.active = len;
    for (let i = 0; i < len; i++) {
      let iterator: ZipBufferIterator<any, any> = <any>iterators[i];
      if (iterator.stillUnsubscribed) {
        const destination = this.destination as qj.Subscription;
        destination.add(iterator.subscribe(iterator, i));
      } else this.active--;
    }
  }

  notifyInactive() {
    this.active--;
    if (this.active === 0) {
      this.destination.done();
    }
  }

  checkIterators() {
    const iterators = this.iterators;
    const len = iterators.length;
    const destination = this.destination;
    for (let i = 0; i < len; i++) {
      let iterator = iterators[i];
      if (typeof iterator.hasValue === 'function' && !iterator.hasValue())
        return;
    }

    let shouldComplete = false;
    const args: any[] = [];
    for (let i = 0; i < len; i++) {
      let iterator = iterators[i];
      let result = iterator.next();
      if (iterator.hasCompleted()) shouldComplete = true;
      if (result.done) {
        destination.done();
        return;
      }
      args.push(result.value);
    }
    if (this.resultSelector) this._tryresultSelector(args);
    else destination.next(args);
    if (shouldComplete) destination.done();
  }

  protected _tryresultSelector(args: any[]) {
    let result: any;
    try {
      result = this.resultSelector!.apply(this, args);
    } catch (e) {
      this.destination.fail(e);
      return;
    }
    this.destination.next(result);
  }
}

export function zipAll<T>(): qt.Lifter<qt.Input<T>, T[]>;
export function zipAll<T>(): qt.Lifter<any, T[]>;
export function zipAll<T, R>(
  project: (...values: T[]) => R
): qt.Lifter<qt.Input<T>, R>;
export function zipAll<R>(
  project: (...values: Array<any>) => R
): qt.Lifter<any, R>;
export function zipAll<T, R>(
  project?: (...values: Array<any>) => R
): qt.Lifter<T, R> {
  return (source: qt.Source<T>) => x.lift(new ZipOperator(project));
}
export function zipAll<T, R>(
  ...observables: Array<qt.Input<any> | ((...values: Array<any>) => R)>
): qt.Lifter<T, R> {
  return x => x.lift.call(zip<R>(x, ...observables), undefined) as qt.Source<R>;
}

export function zipWith<T, A extends qt.Input<any>[]>(
  ...otherInputs: A
): qt.Lifter<T, Unshift<SourcedTuple<A>, T>> {
  return zip(...otherInputs);
}

interface LookAheadIterator<T> extends Iterator<T> {
  hasValue(): boolean;
  hasCompleted(): boolean;
}

class StaticIterator<T> implements LookAheadIterator<T> {
  private nextResult: IteratorResult<T>;

  constructor(private iterator: Iterator<T>) {
    this.nextResult = iterator.next();
  }

  hasValue() {
    return true;
  }

  next(): IteratorResult<T> {
    const result = this.nextResult;
    this.nextResult = this.iterator.next();
    return result;
  }

  hasCompleted() {
    const nextResult = this.nextResult;
    return nextResult && !!nextResult.done;
  }
}

class StaticArrayIterator<T> implements LookAheadIterator<T> {
  private index = 0;
  private length = 0;

  constructor(private array: T[]) {
    this.length = array.length;
  }

  [Symbol.iterator]() {
    return this;
  }

  next(n?: N): IteratorResult<T> {
    const i = this.index++;
    const array = this.array;
    return i < this.length
      ? {value: array[i], done: false}
      : {value: null, done: true};
  }

  hasValue() {
    return this.array.length > this.index;
  }

  hasCompleted() {
    return this.array.length === this.index;
  }
}

class ZipBufferIterator<T, R> extends qj.Reactor<T, R>
  implements LookAheadIterator<T> {
  stillUnsubscribed = true;
  buffer: T[] = [];
  isComplete = false;

  constructor(
    destination: qt.Target<T>,
    private parent: ZipR<T, R>,
    private observable: qs.Source<T>
  ) {
    super(destination);
  }

  [Symbol.iterator]() {
    return this;
  }

  next(): IteratorResult<T> {
    const buffer = this.buffer;
    if (buffer.length === 0 && this.isComplete) {
      return {value: null, done: true};
    } else {
      return {value: buffer.shift()!, done: false};
    }
  }

  hasValue() {
    return this.buffer.length > 0;
  }

  hasCompleted() {
    return this.buffer.length === 0 && this.isComplete;
  }

  reactDone() {
    if (this.buffer.length > 0) {
      this.isComplete = true;
      this.parent.notifyInactive();
    } else {
      this.destination.done();
    }
  }

  reactNext(outerN: T, innerValue: any) {
    this.buffer.push(innerValue);
    this.parent.checkIterators();
  }

  subscribe(value: any, index: number) {
    return subscribeToResult<any, any>(this, this.observable, this, index);
  }
}
