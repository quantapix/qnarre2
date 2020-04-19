import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';

export function endWith<T, A extends any[]>(
  ...args: A
): Lifter<T, T | ValueFromArray<A>>;
export function endWith<N, F, D>(
  ...values: Array<T | qt.Scheduler>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    concatStatic(source, of(...values)) as qt.Source<N, F, D>;
}

export function exhaust<N, F, D>(): Lifter<SourceInput<N, F, D>, T>;
export function exhaust<R>(): Lifter<any, R>;
export function exhaust<N, F, D>(): Lifter<any, T> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SwitchFirstO<N, F, D>());
}

export function exhaustMap<T, O extends SourceInput<any>>(
  project: (value: T, index: number) => O
): Lifter<T, Sourced<O>>;
export function exhaustMap<T, R, O extends SourceInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?: (
    outerN: T,
    innerValue: Sourced<O>,
    outerX: number,
    innerIndex: number
  ) => R
): Lifter<T, Sourced<O> | R> {
  if (resultSelector) {
    // DEPRECATED PATH
    return (source: qt.Source<N, F, D>) =>
      source.pipe(
        exhaustMap((a, i) =>
          from(project(a, i)).pipe(
            map((b: any, ii: any) => resultSelector(a, b, i, ii))
          )
        )
      );
  }
  return (source: qt.Source<N, F, D>) => source.lift(new ExhaustMapO(project));
}

class ExhaustMapO<T, R> implements qt.Operator<T, R> {
  constructor(private project: (value: T, index: number) => SourceInput<R>) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new ExhaustMapR(subscriber, this.project));
  }
}

export class ExhaustMapR<N, M, F, D> extends Reactor<N, M, F, D> {
  private hasSubscription = false;
  private hasCompleted = false;
  private index = 0;

  constructor(
    tgt: Subscriber<M, F, D>,
    private project: (value: T, index: number) => qt.SourceInput<R>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (!this.hasSubscription) this.tryNext(n);
  }

  private tryNext(value: N) {
    let result: SourceInput<R>;
    const index = this.index++;
    try {
      result = this.project(value, index);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.hasSubscription = true;
    this._innerSub(result, value, index);
  }

  private _innerSub(result: SourceInput<R>, value: T, index: number): void {
    const innerSubscriber = new Actor(this, value, index);
    const tgt = this.tgt as Subscription;
    tgt.add(innerSubscriber);
    const s = qu.subscribeToResult<T, R>(
      this,
      result,
      undefined,
      undefined,
      innerSubscriber
    );
    if (s !== innerSubscriber) tgt.add(s);
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (!this.hasSubscription) this.tgt.done(d);
    this.unsubscribe();
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actorr<N, M, F, D>
  ): void {
    this.tgt.next(innerValue);
  }

  reactFail(f?: F) {
    this.tgt.fail(f);
  }

  reactDone(innerSub: Subscription) {
    const tgt = this.tgt as Subscription;
    tgt.remove(innerSub);
    this.hasSubscription = false;
    if (this.hasCompleted) this.tgt.done();
  }
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

export function mergeMap<T, O extends SourceInput<any>>(
  project: (value: T, index: number) => O,
  concurrent?: number
): Lifter<T, Sourced<O>>;
export function mergeMap<T, R, O extends SourceInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?:
    | ((
        outerN: T,
        innerValue: Sourced<O>,
        outerX: number,
        innerIndex: number
      ) => R)
    | number,
  concurrent: number = Number.POSITIVE_INFINITY
): Lifter<T, Sourced<O> | R> {
  if (typeof resultSelector === 'function') {
    return (source: qt.Source<N, F, D>) =>
      source.pipe(
        mergeMap(
          (a, i) =>
            from(project(a, i)).pipe(
              map((b: any, ii: number) => resultSelector(a, b, i, ii))
            ),
          concurrent
        )
      );
  } else if (typeof resultSelector === 'number') {
    concurrent = resultSelector;
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(new MergeMapO(project, concurrent));
}

export class MergeMapO<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => SourceInput<R>,
    private concurrent: number = Number.POSITIVE_INFINITY
  ) {}

  call(observer: Subscriber<R>, source: any): any {
    return source.subscribe(
      new MergeMapR(observer, this.project, this.concurrent)
    );
  }
}

export class MergeMapR<N, M, F, D> extends Reactor<N, M, F, D> {
  private hasCompleted = false;
  private buffer: T[] = [];
  private active = 0;
  protected index = 0;

  constructor(
    tgt: Subscriber<R>,
    private project: (value: T, index: number) => SourceInput<R>,
    private concurrent = Number.POSITIVE_INFINITY
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (this.active < this.concurrent) this._tryNext(n);
    else this.buffer.push(n);
  }

  protected _tryNext(value: N) {
    let result: SourceInput<R>;
    const index = this.index++;
    try {
      result = this.project(value, index);
    } catch (err) {
      this.tgt.fail(err);
      return;
    }
    this.active++;
    this._innerSub(result, value, index);
  }

  private _innerSub(ish: SourceInput<R>, value: T, index: number): void {
    const innerSubscriber = new ActorSubscriber(this, value, index);
    const tgt = this.tgt as Subscription;
    tgt.add(innerSubscriber);
    const innerSubscription = qu.subscribeToResult<T, R>(
      this,
      ish,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      tgt.add(innerSubscription);
    }
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (this.active === 0 && this.buffer.length === 0) {
      this.tgt.done(d);
    }
    this.unsubscribe();
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.tgt.next(innerValue);
  }

  reactDone(innerSub: Subscription): void {
    const buffer = this.buffer;
    this.remove(innerSub);
    this.active--;
    if (buffer.length > 0) {
      this._next(buffer.shift()!);
    } else if (this.active === 0 && this.hasCompleted) {
      this.tgt.done(d);
    }
  }
}

export function mergeMapTo<O extends SourceInput<any>>(
  innerObservable: O,
  concurrent?: number
): Lifter<any, Sourced<O>>;
export function mergeMapTo<T, R, O extends SourceInput<any>>(
  innerObservable: O,
  resultSelector?:
    | ((
        outerN: T,
        innerValue: Sourced<O>,
        outerX: number,
        innerIndex: number
      ) => R)
    | number,
  concurrent: number = Number.POSITIVE_INFINITY
): Lifter<T, Sourced<O> | R> {
  if (typeof resultSelector === 'function') {
    return mergeMap(() => innerObservable, resultSelector, concurrent);
  }
  if (typeof resultSelector === 'number') {
    concurrent = resultSelector;
  }
  return mergeMap(() => innerObservable, concurrent);
}

export function mergeScan<T, R>(
  accumulator: (acc: R, value: T, index: number) => SourceInput<R>,
  seed: R,
  concurrent: number = Number.POSITIVE_INFINITY
): Lifter<T, R> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new MergeScanO(accumulator, seed, concurrent));
}

export class MergeScanO<T, R> implements qt.Operator<T, R> {
  constructor(
    private accumulator: (acc: R, value: T, index: number) => SourceInput<R>,
    private seed: R,
    private concurrent: number
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new MergeScanR(subscriber, this.accumulator, this.seed, this.concurrent)
    );
  }
}

export class MergeScanR<N, M, F, D> extends Reactor<N, M, F, D> {
  private hasValue = false;
  private hasCompleted = false;
  private buffer: qt.Source<any, F, D>[] = [];
  private active = 0;
  protected index = 0;

  constructor(
    tgt: Subscriber<M, F, D>,
    private accumulator: (acc: M, value: N, index: number) => SourceInput<R>,
    private acc: M,
    private concurrent: number
  ) {
    super(tgt);
  }

  protected _next(value: any): void {
    if (this.active < this.concurrent) {
      const index = this.index++;
      const tgt = this.tgt;
      let ish;
      try {
        const {accumulator} = this;
        ish = accumulator(this.acc, value, index);
      } catch (e) {
        return tgt.fail(e);
      }
      this.active++;
      this._innerSub(ish, value, index);
    } else {
      this.buffer.push(value);
    }
  }

  private _innerSub(ish: any, value: T, index: number): void {
    const innerSubscriber = new ActorSubscriber(this, value, index);
    const tgt = this.tgt as Subscription;
    tgt.add(innerSubscriber);
    const innerSubscription = qu.subscribeToResult<T, R>(
      this,
      ish,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      tgt.add(innerSubscription);
    }
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (this.active === 0 && this.buffer.length === 0) {
      if (this.hasValue === false) {
        this.tgt.next(this.acc);
      }
      this.tgt.done(d);
    }
    this.unsubscribe();
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    const {tgt} = this;
    this.acc = innerValue;
    this.hasValue = true;
    tgt.next(innerValue);
  }

  reactDone(innerSub: Subscription): void {
    const buffer = this.buffer;
    const tgt = this.tgt as Subscription;
    tgt.remove(innerSub);
    this.active--;
    if (buffer.length > 0) {
      this._next(buffer.shift());
    } else if (this.active === 0 && this.hasCompleted) {
      if (this.hasValue === false) {
        this.tgt.next(this.acc);
      }
      this.tgt.done(d);
    }
  }
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

class SwitchFirstO<N, F, D> implements qt.Operator<N, N, F, D> {
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new SwitchFirstR(subscriber));
  }
}

export class SwitchFirstR<N, F, D> extends Reactor<N, N, F, D> {
  private hasCompleted = false;
  private hasSubscription = false;

  constructor(tgt: Subscriber<N, F, D>) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (!this.hasSubscription) {
      this.hasSubscription = true;
      this.add(subscribeToResult(this, n));
    }
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (!this.hasSubscription) this.tgt.done();
  }

  reactDone(innerSub: Subscription) {
    this.remove(innerSub);
    this.hasSubscription = false;
    if (this.hasCompleted) this.tgt.done();
  }
}

export function switchAll<N, F, D>(): Lifter<SourceInput<N, F, D>, T>;
export function switchAll<R>(): Lifter<any, R>;
export function switchAll<N, F, D>(): Lifter<SourceInput<N, F, D>, T> {
  return switchMap(identity);
}

export function switchMap<T, O extends SourceInput<any>>(
  project: (value: T, index: number) => O
): Lifter<T, Sourced<O>>;
export function switchMap<T, R, O extends SourceInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?: (
    outerN: T,
    innerValue: Sourced<O>,
    outerX: number,
    innerIndex: number
  ) => R
): Lifter<T, Sourced<O> | R> {
  if (typeof resultSelector === 'function') {
    return (source: qt.Source<N, F, D>) =>
      source.pipe(
        switchMap((a, i) =>
          from(project(a, i)).pipe(map((b, ii) => resultSelector(a, b, i, ii)))
        )
      );
  }
  return (source: qt.Source<N, F, D>) => source.lift(new SwitchMapO(project));
}

class SwitchMapO<T, R> implements qt.Operator<T, R> {
  constructor(private project: (value: T, index: number) => SourceInput<R>) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new SwitchMapR(subscriber, this.project));
  }
}

export class SwitchMapR<N, M, F, D> extends Reactor<N, M, F, D> {
  private index = 0;
  private innerSubscription?: Subscription;

  constructor(
    tgt: Subscriber<M, F, D>,
    private project: (n: N | undefined, i: number) => SourceInput<R>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    let result: SourceInput<R>;
    const index = this.index++;
    try {
      result = this.project(n, index);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this._innerSub(result, n, index);
  }

  private _innerSub(result: SourceInput<R>, value: T, index: number) {
    const innerSubscription = this.innerSubscription;
    if (innerSubscription) {
      innerSubscription.unsubscribe();
    }
    const innerSubscriber = new Actor(this, value, index);
    const tgt = this.tgt as Subscription;
    tgt.add(innerSubscriber);
    this.innerSubscription = qu.subscribeToResult(
      this,
      result,
      undefined,
      undefined,
      innerSubscriber
    );
    if (this.innerSubscription !== innerSubscriber) {
      tgt.add(this.innerSubscription);
    }
  }

  protected _done(d?: D) {
    const {innerSubscription} = this;
    if (!innerSubscription || innerSubscription.closed) super._done();
    this.unsubscribe();
  }

  protected _unsubscribe() {
    this.innerSubscription = null!;
  }

  reactDone(innerSub: Subscription) {
    const tgt = this.tgt as Subscription;
    tgt.remove(innerSub);
    this.innerSubscription = null!;
    if (this.stopped) {
      super._done();
    }
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.tgt.next(innerValue);
  }
}

export function switchMapTo<R>(observable: SourceInput<R>): Lifter<any, R>;
export function switchMapTo<T, I, R>(
  innerObservable: SourceInput<I>,
  resultSelector?: (
    outerN: T,
    innerValue: I,
    outerX: number,
    innerIndex: number
  ) => R
): Lifter<T, I | R> {
  return resultSelector
    ? switchMap(() => innerObservable, resultSelector)
    : switchMap(() => innerObservable);
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
