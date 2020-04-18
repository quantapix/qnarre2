import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';

export class ZipOperator<T, R> implements qt.Operator<T, R> {
  resultSelector?: (...values: Array<any>) => R;

  constructor(resultSelector?: (...values: Array<any>) => R) {
    this.resultSelector = resultSelector;
  }

  call(subscriber: qj.Subscriber<R>, source: any): any {
    return source.subscribe(new ZipSubscriber(subscriber, this.resultSelector));
  }
}

export class ZipSubscriber<T, R> extends qj.Subscriber<T> {
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
    private parent: ZipSubscriber<T, R>,
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
  return fromArray(observables, undefined).lift(
    new ZipOperator(resultSelector)
  );
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
      zipStatic<R>(source, ...observables),
      undefined
    ) as qt.Source<R>;
  };
}

export function zipWith<T, A extends qt.SourceInput<any>[]>(
  ...otherInputs: A
): qt.Lifter<T, Unshift<SourcedTuple<A>, T>> {
  return zip(...otherInputs);
}
