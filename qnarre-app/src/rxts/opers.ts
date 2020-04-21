import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';
import * as qh from './scheduler';

export function finalize<N, F, D>(callback: () => void): qt.Shifter<N, F, D> {
  return x => source.lift(new FinallyO(callback));
}

class FinallyO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private callback: () => void) {}

  call(r: qt.Subscriber<N, F, D>, s: any): qt.Closer {
    return s.subscribe(new FinallyR(r, this.callback));
  }
}

class FinallyR<N, F, D> extends qj.Subscriber<N, F, D> {
  constructor(tgt: qt.Subscriber<N, F, D>, callback: () => void) {
    super(tgt);
    this.add(new qt.Subscription(callback));
  }
}

export class GroupDuration<K, N, F, D> extends qj.Subscriber<N, F, D> {
  constructor(
    private key: K,
    private group: qt.Subject<N, F, D>,
    private parent: GroupBy<any, K, N | any, F, D>
  ) {
    super(group);
  }

  protected _next(_n?: N) {
    this.done();
  }

  _unsubscribe() {
    const {parent, key} = this;
    this.key = this.parent = null!;
    if (parent) parent.removeGroup(key);
  }
}

export class IgnoreElements<N, F, D> extends qj.Subscriber<N, F, D> {
  protected _next(_?: N) {
    // Do nothing
  }
}

export function onErrorResumeNext<N, F, D>(): qt.Lifter<T, T>;
export function onErrorResumeNext<T, T2>(v: qt.Input<T2>): qt.Lifter<T, T | T2>;
export function onErrorResumeNext<T, T2, T3>(
  v: qt.Input<T2>,
  v2: qt.Input<T3>
): qt.Lifter<T, T | T2 | T3>;
export function onErrorResumeNext<T, T2, T3, T4>(
  v: qt.Input<T2>,
  v2: qt.Input<T3>,
  v3: qt.Input<T4>
): qt.Lifter<T, T | T2 | T3 | T4>;
export function onErrorResumeNext<T, T2, T3, T4, T5>(
  v: qt.Input<T2>,
  v2: qt.Input<T3>,
  v3: qt.Input<T4>,
  v4: qt.Input<T5>
): qt.Lifter<T, T | T2 | T3 | T4 | T5>;
export function onErrorResumeNext<T, T2, T3, T4, T5, T6>(
  v: qt.Input<T2>,
  v2: qt.Input<T3>,
  v3: qt.Input<T4>,
  v4: qt.Input<T5>,
  v5: qt.Input<T6>
): qt.Lifter<T, T | T2 | T3 | T4 | T5 | T6>;
export function onErrorResumeNext<T, T2, T3, T4, T5, T6, T7>(
  v: qt.Input<T2>,
  v2: qt.Input<T3>,
  v3: qt.Input<T4>,
  v4: qt.Input<T5>,
  v5: qt.Input<T6>,
  v6: qt.Input<T7>
): qt.Lifter<T, T | T2 | T3 | T4 | T5 | T6 | T7>;
export function onErrorResumeNext<T, R>(
  ...observables: Array<qt.Input<any>>
): qt.Lifter<T, T | R>;
export function onErrorResumeNext<T, R>(
  array: qt.Input<any>[]
): qt.Lifter<T, T | R>;
export function onErrorResumeNext<T, R>(
  ...nextSources: Array<qt.Input<any> | Array<qt.Input<any>>>
): qt.Lifter<T, R> {
  if (nextSources.length === 1 && Array.isArray(nextSources[0])) {
    nextSources = <Array<qt.Source<any>>>nextSources[0];
  }

  return x => source.lift(new OnErrorResumeNextO<T, R>(nextSources));
}

export function onErrorResumeNextStatic<R>(v: qt.Input<R>): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, R>(
  v2: qt.Input<T2>,
  v3: qt.Input<T3>
): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, T4, R>(
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>
): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, T4, T5, R>(
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>,
  v5: qt.Input<T5>
): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, T4, T5, T6, R>(
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>,
  v5: qt.Input<T5>,
  v6: qt.Input<T6>
): qt.Source<R>;
export function onErrorResumeNextStatic<R>(
  ...observables: Array<qt.Input<any> | ((...values: Array<any>) => R)>
): qt.Source<R>;
export function onErrorResumeNextStatic<R>(
  array: qt.Input<any>[]
): qt.Source<R>;
export function onErrorResumeNextStatic<T, R>(
  ...nextSources: Array<
    qt.Input<any> | Array<qt.Input<any>> | ((...values: Array<any>) => R)
  >
): qt.Source<R> {
  let source: qt.Input<any> | null = null;

  if (nextSources.length === 1 && Array.isArray(nextSources[0])) {
    nextSources = <Array<qt.Input<any>>>nextSources[0];
  }
  source = nextSources.shift()!;

  return from(source, null!).lift(new OnErrorResumeNextO<T, R>(nextSources));
}

class OnErrorResumeNextO<T, R> implements qt.Operator<T, R> {
  constructor(private nextSources: Array<qt.Input<any>>) {}

  call(r: qt.Subscriber<R>, s: any): any {
    return s.subscribe(new OnErrorResumeNextR(r, this.nextSources));
  }
}

class OnErrorResumeNextR<N, M, F, D> extends qj.Reactor<N, M, F, D> {
  constructor(
    protected tgt: qt.Subscriber<N, F, D>,
    private nextSources: Array<qt.Input<any>>
  ) {
    super(tgt);
  }

  reactFail(error: any, innerSub: Actor<N, any, F, D>) {
    this.subscribeToNextSource();
  }

  reactDone(innerSub: Actor<N, any, F, D>) {
    this.subscribeToNextSource();
  }

  protected _fail(_f?: F) {
    this.subscribeToNextSource();
    this.unsubscribe();
  }

  protected _done(_d?: D) {
    this.subscribeToNextSource();
    this.unsubscribe();
  }

  private subscribeToNextSource() {
    const next = this.nextSources.shift();
    if (!!next) {
      const innerSubscriber = new Actor(this, undefined, undefined!);
      const tgt = this.tgt as qt.Subscription;
      tgt.add(innerSubscriber);
      const innerSubscription = qu.subscribeToResult(
        this,
        next,
        undefined,
        undefined,
        innerSubscriber
      );
      if (innerSubscription !== innerSubscriber) tgt.add(innerSubscription);
    } else this.tgt.done(d);
  }
}

export function race<N, F, D>(
  ...observables: (qt.Source<N, F, D> | qt.Source<N, F, D>[])[]
): qt.Shifter<N, F, D> {
  return function raceLifter(source: qt.Source<N, F, D>) {
    if (observables.length === 1 && Array.isArray(observables[0])) {
      observables = observables[0] as qt.Source<N, F, D>[];
    }
    return source.lift.call(
      raceStatic(source, ...(observables as qt.Source<N, F, D>[])),
      undefined
    ) as qt.Source<N, F, D>;
  };
}

export function sequenceEqual<N, F, D>(
  compareTo: qt.Source<N, F, D>,
  comparator?: (a: T, b: N) => boolean
): qt.Lifter<T, boolean> {
  return x => source.lift(new SequenceEqualO(compareTo, comparator));
}

export class SequenceEqualO<N, F, D> implements qt.Operator<T, boolean> {
  constructor(
    private compareTo: qt.Source<N, F, D>,
    private comparator?: (a: T, b: N) => boolean
  ) {}

  call(r: qt.Subscriber<boolean>, s: any): any {
    return s.subscribe(new SequenceEqualR(r, this.compareTo, this.comparator));
  }
}

export class SequenceEqualR<N, M, F, D> extends qj.Subscriber<N, F, D> {
  private _a = [] as (N | undefined)[];
  private _b = [] as N[];
  private _oneComplete = false;

  constructor(
    tgt: qt.Observer<M, F, D>,
    private compareTo: qt.Source<N, F, D>,
    private comparator?: (a: N, b: N) => boolean
  ) {
    super(tgt);
    (this.tgt as qt.Subscription).add(
      compareTo.subscribe(new SequenceEqualCompareToSubscriber(tgt, this))
    );
  }

  protected _next(n?: N) {
    if (this._oneComplete && this._b.length === 0) this.emit(false);
    else {
      this._a.push(n);
      this.checkValues();
    }
  }

  public _done() {
    if (this._oneComplete) this.emit(!this._a.length && !this._b.length);
    else this._oneComplete = true;
    this.unsubscribe();
  }

  checkValues() {
    const {_a, _b, comparator} = this;
    while (_a.length > 0 && _b.length > 0) {
      let a = _a.shift()!;
      let b = _b.shift()!;
      let areEqual = false;
      try {
        areEqual = comparator ? comparator(a, b) : a === b;
      } catch (e) {
        this.tgt.fail(e);
      }
      if (!areEqual) this.emit(false);
    }
  }

  emit(n: boolean) {
    this.tgt.next(n);
    this.tgt.done();
  }

  nextB(n: N) {
    if (this._oneComplete && !this._a.length) this.emit(false);
    else {
      this._b.push(n);
      this.checkValues();
    }
  }

  completeB() {
    if (this._oneComplete) this.emit(!this._a.length && !this._b.length);
    else this._oneComplete = true;
  }
}

class SequenceEqualCompareToSubscriber<T, R> extends qj.Subscriber<N, F, D> {
  constructor(
    tgt: qt.Observer<R>,
    private parent: SequenceEqualSubscriber<T, R>
  ) {
    super(tgt);
  }

  protected _next(v: N) {
    this.parent.nextB(value);
  }

  protected _fail(f?: F) {
    this.parent.fail(e);
    this.unsubscribe();
  }

  protected _done(d?: D) {
    this.parent.completeB();
    this.unsubscribe();
  }
}

export function withLatestFrom<T, R>(project: (v1: N) => R): qt.Lifter<T, R>;
export function withLatestFrom<T, O2 extends qt.Input<any>, R>(
  source2: O2,
  project: (v1: T, v2: qt.Sourced<O2>) => R
): qt.Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  R
>(
  v2: O2,
  v3: O3,
  project: (v1: T, v2: qt.Sourced<O2>, v3: qt.Sourced<O3>) => R
): qt.Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  project: (
    v1: T,
    v2: qt.Sourced<O2>,
    v3: qt.Sourced<O3>,
    v4: qt.Sourced<O4>
  ) => R
): qt.Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>,
  O5 extends qt.Input<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  project: (
    v1: T,
    v2: qt.Sourced<O2>,
    v3: qt.Sourced<O3>,
    v4: qt.Sourced<O4>,
    v5: qt.Sourced<O5>
  ) => R
): qt.Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>,
  O5 extends qt.Input<any>,
  O6 extends qt.Input<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6,
  project: (
    v1: T,
    v2: qt.Sourced<O2>,
    v3: qt.Sourced<O3>,
    v4: qt.Sourced<O4>,
    v5: qt.Sourced<O5>,
    v6: qt.Sourced<O6>
  ) => R
): qt.Lifter<T, R>;
export function withLatestFrom<T, O2 extends qt.Input<any>>(
  source2: O2
): qt.Lifter<T, [T, qt.Sourced<O2>]>;
export function withLatestFrom<
  T,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>
>(v2: O2, v3: O3): qt.Lifter<T, [T, qt.Sourced<O2>, qt.Sourced<O3>]>;
export function withLatestFrom<
  T,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>
>(
  v2: O2,
  v3: O3,
  v4: O4
): qt.Lifter<T, [T, qt.Sourced<O2>, qt.Sourced<O3>, qt.Sourced<O4>]>;
export function withLatestFrom<
  T,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>,
  O5 extends qt.Input<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5
): qt.Lifter<
  T,
  [T, qt.Sourced<O2>, qt.Sourced<O3>, qt.Sourced<O4>, qt.Sourced<O5>]
>;
export function withLatestFrom<
  T,
  O2 extends qt.Input<any>,
  O3 extends qt.Input<any>,
  O4 extends qt.Input<any>,
  O5 extends qt.Input<any>,
  O6 extends qt.Input<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6
): qt.Lifter<
  T,
  [
    T,
    qt.Sourced<O2>,
    qt.Sourced<O3>,
    qt.Sourced<O4>,
    qt.Sourced<O5>,
    qt.Sourced<O6>
  ]
>;
export function withLatestFrom<T, R>(
  ...observables: Array<qt.Input<any> | ((...values: Array<any>) => R)>
): qt.Lifter<T, R>;
export function withLatestFrom<T, R>(array: qt.Input<any>[]): qt.Lifter<T, R>;
export function withLatestFrom<T, R>(
  array: qt.Input<any>[],
  project: (...values: Array<any>) => R
): qt.Lifter<T, R>;
export function withLatestFrom<T, R>(
  ...args: Array<qt.Input<any> | ((...values: Array<any>) => R)>
): qt.Lifter<T, R> {
  return x => {
    let project: any;
    if (typeof args[args.length - 1] === 'function') project = args.pop();
    const observables = <qt.Source<any>[]>args;
    return x.lift(new WithLatestFromO(observables, project));
  };
}

class WithLatestFromO<T, R> implements qt.Operator<T, R> {
  constructor(
    private observables: qt.Source<any, F, D>[],
    private project?: (...values: any[]) => qt.Source<R>
  ) {}

  call(r: qt.Subscriber<R>, s: any): any {
    return s.subscribe(new WithLatestFromR(r, this.observables, this.project));
  }
}

class WithLatestFromR<T, R> extends qj.Reactor<N, M, F, D> {
  private values: any[];
  private toRespond: number[] = [];

  constructor(
    tgt: qt.Subscriber<R>,
    private observables: qt.Source<any, F, D>[],
    private project?: (...values: any[]) => qt.Source<R>
  ) {
    super(tgt);
    const len = observables.length;
    this.values = new Array(len);

    for (let i = 0; i < len; i++) {
      this.toRespond.push(i);
    }

    for (let i = 0; i < len; i++) {
      let observable = observables[i];
      this.add(
        qu.subscribeToResult<T, R>(this, observable, <any>observable, i)
      );
    }
  }

  reactNext(outerN: T, innerValue: R, outerX: number) {
    this.values[outerX] = innerValue;
    const toRespond = this.toRespond;
    if (toRespond.length > 0) {
      const found = toRespond.indexOf(outerX);
      if (found !== -1) toRespond.splice(found, 1);
    }
  }

  reactDone() {}

  protected _next(n?: N) {
    if (this.toRespond.length === 0) {
      const args = [n, ...this.values];
      if (this.project) this._tryProject(args);
      else this.tgt.next(args);
    }
  }

  private _tryProject(args: any[]) {
    let result: any;
    try {
      result = this.project!.apply(this, args);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.next(result);
  }
}

function dispatchNotification<N, F, D>(this: qt.Action<any>, state: any) {
  let {subscriber, period} = state;
  subscriber.reactNext();
  this.schedule(state, period);
}

class GroupDurationSubscriber<K, T> extends qj.Subscriber<T> {
  constructor(
    private key: K,
    private group: qt.Subject<T>,
    private parent: GroupBySubscriber<any, K, T | any>
  ) {
    super(group);
  }

  protected _next(v: T) {
    this.done();
  }

  _unsubscribe() {
    const {parent, key} = this;
    this.key = this.parent = null!;
    if (parent) {
      parent.removeGroup(key);
    }
  }
}

class ActorRefCounted extends qj.Subscription {
  constructor(private parent: RefCounted) {
    super();
    parent.count++;
  }

  unsubscribe() {
    const parent = this.parent;
    if (!parent.closed && !this.closed) {
      super.unsubscribe();
      parent.count -= 1;
      if (parent.count === 0 && parent.unsubscribing) {
        parent.unsubscribe();
      }
    }
  }
}
