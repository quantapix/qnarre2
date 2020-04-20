import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';

export function combineLatest<O1 extends qt.SourceInput<any>>(
  sources: [O1]
): qs.Source<[Sourced<O1>]>;
export function combineLatest<
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>
>(sources: [O1, O2]): qs.Source<[Sourced<O1>, Sourced<O2>]>;
export function combineLatest<
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>,
  O3 extends qt.SourceInput<any>
>(sources: [O1, O2, O3]): qs.Source<[Sourced<O1>, Sourced<O2>, Sourced<O3>]>;
export function combineLatest<
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>,
  O3 extends qt.SourceInput<any>,
  O4 extends qt.SourceInput<any>
>(
  sources: [O1, O2, O3, O4]
): qs.Source<[Sourced<O1>, Sourced<O2>, Sourced<O3>, Sourced<O4>]>;
export function combineLatest<
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>,
  O3 extends qt.SourceInput<any>,
  O4 extends qt.SourceInput<any>,
  O5 extends qt.SourceInput<any>
>(
  sources: [O1, O2, O3, O4, O5]
): qs.Source<[Sourced<O1>, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>]>;
export function combineLatest<
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>,
  O3 extends qt.SourceInput<any>,
  O4 extends qt.SourceInput<any>,
  O5 extends qt.SourceInput<any>,
  O6 extends qt.SourceInput<any>
>(
  sources: [O1, O2, O3, O4, O5, O6]
): qs.Source<
  [Sourced<O1>, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>, Sourced<O6>]
>;
export function combineLatest<O extends qt.SourceInput<any>>(
  sources: O[]
): qs.Source<Sourced<O>[]>;
export function combineLatest<O extends qt.SourceInput<any>, R>(
  ...observables: (O | ((...values: Sourced<O>[]) => R) | qh.Scheduler)[]
): qs.Source<R> {
  let resultSelector: ((...values: Array<any>) => R) | undefined = undefined;
  let scheduler: qh.Scheduler | undefined = undefined;

  if (isScheduler(observables[observables.length - 1])) {
    scheduler = observables.pop() as qh.Scheduler;
  }

  if (typeof observables[observables.length - 1] === 'function') {
    resultSelector = observables.pop() as (...values: Array<any>) => R;
  }
  if (observables.length === 1 && isArray(observables[0])) {
    observables = observables[0] as any;
  }

  return fromArray(observables, scheduler).lift(
    new CombineLatestO<Sourced<O>, R>(resultSelector)
  );
}

export class CombineLatestO<T, R> implements qt.Operator<T, R> {
  constructor(private resultSelector?: (...values: Array<any>) => R) {}

  call(subscriber: qj.Subscriber<R>, source: any): any {
    return source.subscribe(
      new CombineLatestR(subscriber, this.resultSelector)
    );
  }
}

export class CombineLatestR<T, R> extends ReactorSubscriber<T, R> {
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
        this.add(subscribeToResult(this, observable, observable, i));
      }
    }
  }

  notifyComplete(unused: qj.Subscriber<R>): void {
    if ((this.active -= 1) === 0) {
      this.destination.done();
    }
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    const values = this.values;
    const oldVal = values[outerX];
    const toRespond = !this.toRespond
      ? 0
      : oldVal === NONE
      ? --this.toRespond
      : this.toRespond;
    values[outerX] = innerValue;

    if (toRespond === 0) {
      if (this.resultSelector) {
        this._tryResultSelector(values);
      } else {
        this.destination.next(values.slice());
      }
    }
  }

  private _tryResultSelector(values: any[]) {
    let result: any;
    try {
      result = this.resultSelector!.apply(this, values);
    } catch (err) {
      this.destination.error(err);
      return;
    }
    this.destination.next(result);
  }
}

export function combineLatest<T, R>(
  ...observables: Array<
    SourceInput<any> | Array<SourceInput<any>> | ((...values: Array<any>) => R)
  >
): Lifter<T, R> {
  let project: ((...values: Array<any>) => R) | undefined = undefined;
  if (typeof observables[observables.length - 1] === 'function') {
    project = <(...values: Array<any>) => R>observables.pop();
  }
  if (observables.length === 1 && isArray(observables[0])) {
    observables = (<any>observables[0]).slice();
  }

  return (source: qt.Source<N, F, D>) =>
    source.lift.call(
      from([source, ...observables]),
      new CombineLatestO(project)
    ) as qt.Source<R>;
}

export function combineLatestWith<T, A extends SourceInput<any>[]>(
  ...otherSources: A
): Lifter<T, Unshift<SourcedTuple<A>, T>> {
  return combineLatest(...otherSources);
}

export function combineAll<N, F, D>(): Lifter<SourceInput<N, F, D>, T[]>;
export function combineAll<N, F, D>(): Lifter<any, T[]>;
export function combineAll<T, R>(
  project: (...values: T[]) => R
): Lifter<SourceInput<N, F, D>, R>;
export function combineAll<R>(
  project: (...values: Array<any>) => R
): Lifter<any, R>;
export function combineAll<T, R>(
  project?: (...values: Array<any>) => R
): Lifter<T, R> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new CombineLatestO(project));
}

export function endWith<T, A extends any[]>(
  ...args: A
): Lifter<T, T | ValueFromArray<A>>;
export function endWith<N, F, D>(
  ...values: Array<T | qt.Scheduler>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    concatStatic(source, of(...values)) as qt.Source<N, F, D>;
}

export function merge<T>(v1: qt.SourceInput<T>): qs.Source<T>;
export function merge<T>(
  v1: qt.SourceInput<T>,
  concurrent?: number
): qs.Source<T>;
export function merge<T, T2>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>
): qs.Source<T | T2>;
export function merge<T, T2>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>,
  concurrent?: number
): qs.Source<T | T2>;
export function merge<T, T2, T3>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>
): qs.Source<T | T2 | T3>;
export function merge<T, T2, T3>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  concurrent?: number
): qs.Source<T | T2 | T3>;
export function merge<T, T2, T3, T4>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  v4: qt.SourceInput<T4>
): qs.Source<T | T2 | T3 | T4>;
export function merge<T, T2, T3, T4>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  v4: qt.SourceInput<T4>,
  concurrent?: number
): qs.Source<T | T2 | T3 | T4>;
export function merge<T, T2, T3, T4, T5>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  v4: qt.SourceInput<T4>,
  v5: qt.SourceInput<T5>
): qs.Source<T | T2 | T3 | T4 | T5>;
export function merge<T, T2, T3, T4, T5>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  v4: qt.SourceInput<T4>,
  v5: qt.SourceInput<T5>,
  concurrent?: number
): qs.Source<T | T2 | T3 | T4 | T5>;
export function merge<T, T2, T3, T4, T5, T6>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  v4: qt.SourceInput<T4>,
  v5: qt.SourceInput<T5>,
  v6: qt.SourceInput<T6>
): qs.Source<T | T2 | T3 | T4 | T5 | T6>;
export function merge<T, T2, T3, T4, T5, T6>(
  v1: qt.SourceInput<T>,
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  v4: qt.SourceInput<T4>,
  v5: qt.SourceInput<T5>,
  v6: qt.SourceInput<T6>,
  concurrent?: number
): qs.Source<T | T2 | T3 | T4 | T5 | T6>;
export function merge<T>(
  ...observables: (SourceInput<T> | number)[]
): qs.Source<T>;
export function merge<T, R>(
  ...observables: (SourceInput<any> | number)[]
): qs.Source<R>;
export function merge<T, R>(
  ...observables: Array<qt.SourceInput<any> | qh.Scheduler | number | undefined>
): qs.Source<R> {
  let concurrent = Number.POSITIVE_INFINITY;
  let scheduler: qh.Scheduler | undefined = undefined;
  let last: any = observables[observables.length - 1];
  if (isScheduler(last)) {
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
    observables[0] instanceof Observable
  ) {
    return <Observable<R>>observables[0];
  }

  return mergeAll<R>(concurrent)(fromArray<any>(observables, scheduler));
}

export function mergeAll<N, F, D>(
  concurrent: number = Number.POSITIVE_INFINITY
): Lifter<SourceInput<N, F, D>, T> {
  return mergeMap(identity, concurrent);
}

export function mergeWith<N, F, D>(): Lifter<T, T>;
export function mergeWith<T, A extends SourceInput<any>[]>(
  ...otherSources: A
): Lifter<T, T | SourcedFrom<A>>;
export function mergeWith<T, A extends SourceInput<any>[]>(
  ...otherSources: A
): Lifter<T, T | SourcedFrom<A>> {
  return merge(...otherSources);
}

export function startWith<T, A extends any[]>(
  ...values: A
): Lifter<T, T | ValueFromArray<A>>;
export function startWith<T, D>(...values: D[]): Lifter<T, T | D> {
  const scheduler = values[values.length - 1];
  if (isScheduler(scheduler)) {
    values.pop();
    return (source: qt.Source<N, F, D>) =>
      concatStatic(values, source, scheduler);
  } else {
    return (source: qt.Source<N, F, D>) => concatStatic(values, source);
  }
}

export function zip<
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>
>(v1: O1, v2: O2): qs.Source<[qt.Sourced<O1>, qt.Sourced<O2>]>;
export function zip<
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>,
  O3 extends qt.SourceInput<any>
>(
  v1: O1,
  v2: O2,
  v3: O3
): qs.Source<[qt.Sourced<O1>, qt.Sourced<O2>, qt.Sourced<O3>]>;
export function zip<
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>,
  O3 extends qt.SourceInput<any>,
  O4 extends qt.SourceInput<any>
>(
  v1: O1,
  v2: O2,
  v3: O3,
  v4: O4
): qs.Source<[qt.Sourced<O1>, qt.Sourced<O2>, qt.Sourced<O3>, qt.Sourced<O4>]>;
export function zip<
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>,
  O3 extends qt.SourceInput<any>,
  O4 extends qt.SourceInput<any>,
  O5 extends qt.SourceInput<any>
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
  O1 extends qt.SourceInput<any>,
  O2 extends qt.SourceInput<any>,
  O3 extends qt.SourceInput<any>,
  O4 extends qt.SourceInput<any>,
  O5 extends qt.SourceInput<any>,
  O6 extends qt.SourceInput<any>
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
export function zip<O extends qt.SourceInput<any>>(
  array: O[]
): qs.Source<qt.Sourced<O>[]>;
export function zip<R>(array: qt.SourceInput<any>[]): qs.Source<R>;
export function zip<O extends qt.SourceInput<any>>(
  ...observables: O[]
): qs.Source<qt.Sourced<O>[]>;
export function zip<O extends qt.SourceInput<any>, R>(
  ...observables: Array<O | ((...values: qt.Sourced<O>[]) => R)>
): qs.Source<R>;
export function zip<R>(
  ...observables: Array<qt.SourceInput<any> | ((...values: Array<any>) => R)>
): qs.Source<R>;
export function zip<O extends qt.SourceInput<any>, R>(
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

  call(subscriber: qj.Subscriber<R>, source: any): any {
    return source.subscribe(new ZipR(subscriber, this.resultSelector));
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
    if (isArray(value)) {
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
      } else {
        this.active--; // not an observable
      }
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
      if (typeof iterator.hasValue === 'function' && !iterator.hasValue()) {
        return;
      }
    }

    let shouldComplete = false;
    const args: any[] = [];
    for (let i = 0; i < len; i++) {
      let iterator = iterators[i];
      let result = iterator.next();
      if (iterator.hasCompleted()) {
        shouldComplete = true;
      }

      if (result.done) {
        destination.done();
        return;
      }

      args.push(result.value);
    }

    if (this.resultSelector) {
      this._tryresultSelector(args);
    } else {
      destination.next(args);
    }

    if (shouldComplete) {
      destination.done();
    }
  }

  protected _tryresultSelector(args: any[]) {
    let result: any;
    try {
      result = this.resultSelector!.apply(this, args);
    } catch (err) {
      this.destination.error(err);
      return;
    }
    this.destination.next(result);
  }
}

export function zipAll<T>(): qt.Lifter<qt.SourceInput<T>, T[]>;
export function zipAll<T>(): qt.Lifter<any, T[]>;
export function zipAll<T, R>(
  project: (...values: T[]) => R
): qt.Lifter<qt.SourceInput<T>, R>;
export function zipAll<R>(
  project: (...values: Array<any>) => R
): qt.Lifter<any, R>;
export function zipAll<T, R>(
  project?: (...values: Array<any>) => R
): qt.Lifter<T, R> {
  return (source: qt.Source<T>) => source.lift(new ZipOperator(project));
}
export function zipAll<T, R>(
  ...observables: Array<qt.SourceInput<any> | ((...values: Array<any>) => R)>
): qt.Lifter<T, R> {
  return function zipLifter(source: qt.Source<T>) {
    return source.lift.call(
      zip<R>(source, ...observables),
      undefined
    ) as qt.Source<R>;
  };
}

export function zipWith<T, A extends qt.SourceInput<any>[]>(
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

  next(value?: any): IteratorResult<T> {
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

class ZipBufferIterator<T, R> extends ReactorSubscriber<T, R>
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

  notifyComplete() {
    if (this.buffer.length > 0) {
      this.isComplete = true;
      this.parent.notifyInactive();
    } else {
      this.destination.done();
    }
  }

  reactNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    this.buffer.push(innerValue);
    this.parent.checkIterators();
  }

  subscribe(value: any, index: number) {
    return subscribeToResult<any, any>(this, this.observable, this, index);
  }
}
