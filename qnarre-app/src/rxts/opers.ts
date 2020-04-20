import * as qt from './types';
import * as qu from './utils';

export function finalize<N, F, D>(callback: () => void): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new FinallyO(callback));
}

class FinallyO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private callback: () => void) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new FinallyR(subscriber, this.callback));
  }
}

class FinallyR<N, F, D> extends Subscriber<N, F, D> {
  constructor(tgt: Subscriber<N, F, D>, callback: () => void) {
    super(tgt);
    this.add(new Subscription(callback));
  }
}

export class GroupDuration<K, N, F, D> extends Subscriber<N, F, D> {
  constructor(
    private key: K,
    private group: Subject<N, F, D>,
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

export class IgnoreElements<N, F, D> extends Subscriber<N, F, D> {
  protected _next(_?: N) {
    // Do nothing
  }
}

export function onErrorResumeNext<N, F, D>(): Lifter<T, T>;
export function onErrorResumeNext<T, T2>(v: SourceInput<T2>): Lifter<T, T | T2>;
export function onErrorResumeNext<T, T2, T3>(
  v: SourceInput<T2>,
  v2: SourceInput<T3>
): Lifter<T, T | T2 | T3>;
export function onErrorResumeNext<T, T2, T3, T4>(
  v: SourceInput<T2>,
  v2: SourceInput<T3>,
  v3: SourceInput<T4>
): Lifter<T, T | T2 | T3 | T4>;
export function onErrorResumeNext<T, T2, T3, T4, T5>(
  v: SourceInput<T2>,
  v2: SourceInput<T3>,
  v3: SourceInput<T4>,
  v4: SourceInput<T5>
): Lifter<T, T | T2 | T3 | T4 | T5>;
export function onErrorResumeNext<T, T2, T3, T4, T5, T6>(
  v: SourceInput<T2>,
  v2: SourceInput<T3>,
  v3: SourceInput<T4>,
  v4: SourceInput<T5>,
  v5: SourceInput<T6>
): Lifter<T, T | T2 | T3 | T4 | T5 | T6>;
export function onErrorResumeNext<T, T2, T3, T4, T5, T6, T7>(
  v: SourceInput<T2>,
  v2: SourceInput<T3>,
  v3: SourceInput<T4>,
  v4: SourceInput<T5>,
  v5: SourceInput<T6>,
  v6: SourceInput<T7>
): Lifter<T, T | T2 | T3 | T4 | T5 | T6 | T7>;
export function onErrorResumeNext<T, R>(
  ...observables: Array<SourceInput<any>>
): Lifter<T, T | R>;
export function onErrorResumeNext<T, R>(
  array: SourceInput<any>[]
): Lifter<T, T | R>;
export function onErrorResumeNext<T, R>(
  ...nextSources: Array<SourceInput<any> | Array<SourceInput<any>>>
): Lifter<T, R> {
  if (nextSources.length === 1 && isArray(nextSources[0])) {
    nextSources = <Array<Observable<any>>>nextSources[0];
  }

  return (source: qt.Source<N, F, D>) =>
    source.lift(new OnErrorResumeNextO<T, R>(nextSources));
}

export function onErrorResumeNextStatic<R>(v: SourceInput<R>): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, R>(
  v2: SourceInput<T2>,
  v3: SourceInput<T3>
): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, T4, R>(
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>
): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, T4, T5, R>(
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>,
  v5: SourceInput<T5>
): qt.Source<R>;
export function onErrorResumeNextStatic<T2, T3, T4, T5, T6, R>(
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>,
  v5: SourceInput<T5>,
  v6: SourceInput<T6>
): qt.Source<R>;
export function onErrorResumeNextStatic<R>(
  ...observables: Array<SourceInput<any> | ((...values: Array<any>) => R)>
): qt.Source<R>;
export function onErrorResumeNextStatic<R>(
  array: SourceInput<any>[]
): qt.Source<R>;
export function onErrorResumeNextStatic<T, R>(
  ...nextSources: Array<
    SourceInput<any> | Array<SourceInput<any>> | ((...values: Array<any>) => R)
  >
): qt.Source<R> {
  let source: SourceInput<any> | null = null;

  if (nextSources.length === 1 && isArray(nextSources[0])) {
    nextSources = <Array<SourceInput<any>>>nextSources[0];
  }
  source = nextSources.shift()!;

  return from(source, null!).lift(new OnErrorResumeNextO<T, R>(nextSources));
}

class OnErrorResumeNextO<T, R> implements qt.Operator<T, R> {
  constructor(private nextSources: Array<SourceInput<any>>) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new OnErrorResumeNextR(subscriber, this.nextSources)
    );
  }
}

export class OnErrorResumeNextR<N, M, F, D> extends Reactor<N, M, F, D> {
  constructor(
    protected tgt: Subscriber<N, F, D>,
    private nextSources: Array<SourceInput<any>>
  ) {
    super(tgt);
  }

  notifyError(error: any, innerSub: Actor<N, any, F, D>): void {
    this.subscribeToNextSource();
  }

  reactDone(innerSub: Actor<N, any, F, D>): void {
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

  private subscribeToNextSource(): void {
    const next = this.nextSources.shift();
    if (!!next) {
      const innerSubscriber = new Actor(this, undefined, undefined!);
      const tgt = this.tgt as Subscription;
      tgt.add(innerSubscriber);
      const innerSubscription = qu.subscribeToResult(
        this,
        next,
        undefined,
        undefined,
        innerSubscriber
      );
      if (innerSubscription !== innerSubscriber) {
        tgt.add(innerSubscription);
      }
    } else this.tgt.done(d);
  }
}

export function race<N, F, D>(
  ...observables: (Observable<N, F, D> | qt.Source<N, F, D>[])[]
): qt.MonoOper<N, F, D> {
  return function raceLifter(source: qt.Source<N, F, D>) {
    if (observables.length === 1 && isArray(observables[0])) {
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
): Lifter<T, boolean> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SequenceEqualO(compareTo, comparator));
}

export class SequenceEqualO<N, F, D> implements qt.Operator<T, boolean> {
  constructor(
    private compareTo: qt.Source<N, F, D>,
    private comparator?: (a: T, b: N) => boolean
  ) {}

  call(subscriber: Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new SequenceEqualR(subscriber, this.compareTo, this.comparator)
    );
  }
}

export class SequenceEqualR<N, M, F, D> extends Subscriber<N, F, D> {
  private _a = [] as (N | undefined)[];
  private _b = [] as N[];
  private _oneComplete = false;

  constructor(
    tgt: qt.Observer<M, F, D>,
    private compareTo: qt.Source<N, F, D>,
    private comparator?: (a: N, b: N) => boolean
  ) {
    super(tgt);
    (this.tgt as Subscription).add(
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

  public _done(): void {
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

class SequenceEqualCompareToSubscriber<T, R> extends Subscriber<N, F, D> {
  constructor(tgt: Observer<R>, private parent: SequenceEqualSubscriber<T, R>) {
    super(tgt);
  }

  protected _next(v: N) {
    this.parent.nextB(value);
  }

  protected _fail(f?: F) {
    this.parent.error(err);
    this.unsubscribe();
  }

  protected _done(d?: D) {
    this.parent.completeB();
    this.unsubscribe();
  }
}

export function withLatestFrom<T, R>(project: (v1: N) => R): Lifter<T, R>;
export function withLatestFrom<T, O2 extends SourceInput<any>, R>(
  source2: O2,
  project: (v1: T, v2: Sourced<O2>) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  project: (v1: T, v2: Sourced<O2>, v3: Sourced<O3>) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  project: (v1: T, v2: Sourced<O2>, v3: Sourced<O3>, v4: Sourced<O4>) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  project: (
    v1: T,
    v2: Sourced<O2>,
    v3: Sourced<O3>,
    v4: Sourced<O4>,
    v5: Sourced<O5>
  ) => R
): Lifter<T, R>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>,
  O6 extends SourceInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6,
  project: (
    v1: T,
    v2: Sourced<O2>,
    v3: Sourced<O3>,
    v4: Sourced<O4>,
    v5: Sourced<O5>,
    v6: Sourced<O6>
  ) => R
): Lifter<T, R>;
export function withLatestFrom<T, O2 extends SourceInput<any>>(
  source2: O2
): Lifter<T, [T, Sourced<O2>]>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>
>(v2: O2, v3: O3): Lifter<T, [T, Sourced<O2>, Sourced<O3>]>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4
): Lifter<T, [T, Sourced<O2>, Sourced<O3>, Sourced<O4>]>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5
): Lifter<T, [T, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>]>;
export function withLatestFrom<
  T,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>,
  O6 extends SourceInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6
): Lifter<
  T,
  [T, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>, Sourced<O6>]
>;
export function withLatestFrom<T, R>(
  ...observables: Array<SourceInput<any> | ((...values: Array<any>) => R)>
): Lifter<T, R>;
export function withLatestFrom<T, R>(array: SourceInput<any>[]): Lifter<T, R>;
export function withLatestFrom<T, R>(
  array: SourceInput<any>[],
  project: (...values: Array<any>) => R
): Lifter<T, R>;
export function withLatestFrom<T, R>(
  ...args: Array<SourceInput<any> | ((...values: Array<any>) => R)>
): Lifter<T, R> {
  return (source: qt.Source<N, F, D>) => {
    let project: any;
    if (typeof args[args.length - 1] === 'function') {
      project = args.pop();
    }
    const observables = <Observable<any>[]>args;
    return source.lift(new WithLatestFromO(observables, project));
  };
}

class WithLatestFromO<T, R> implements qt.Operator<T, R> {
  constructor(
    private observables: qt.Source<any, F, D>[],
    private project?: (...values: any[]) => qt.Source<R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new WithLatestFromR(subscriber, this.observables, this.project)
    );
  }
}

class WithLatestFromR<T, R> extends Reactor<N, M, F, D> {
  private values: any[];
  private toRespond: number[] = [];

  constructor(
    tgt: Subscriber<R>,
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
      this.add(subscribeToResult<T, R>(this, observable, <any>observable, i));
    }
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    this.values[outerX] = innerValue;
    const toRespond = this.toRespond;
    if (toRespond.length > 0) {
      const found = toRespond.indexOf(outerX);
      if (found !== -1) {
        toRespond.splice(found, 1);
      }
    }
  }

  reactDone() {
    // noop
  }

  protected _next(n?: N) {
    if (this.toRespond.length === 0) {
      const args = [value, ...this.values];
      if (this.project) {
        this._tryProject(args);
      } else {
        this.tgt.next(args);
      }
    }
  }

  private _tryProject(args: any[]) {
    let result: any;
    try {
      result = this.project!.apply(this, args);
    } catch (err) {
      this.tgt.error(err);
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

export interface RefCountSubscription {
  count: number;
  unsubscribe: () => void;
  closed: boolean;
  attemptedToUnsubscribe: boolean;
}

class GroupDurationSubscriber<K, T> extends Subscriber<T> {
  constructor(
    private key: K,
    private group: Subject<T>,
    private parent: GroupBySubscriber<any, K, T | any>
  ) {
    super(group);
  }

  protected _next(v: T) {
    this.complete();
  }

  _unsubscribe() {
    const {parent, key} = this;
    this.key = this.parent = null!;
    if (parent) {
      parent.removeGroup(key);
    }
  }
}

class ActorRefCountSubscription extends Subscription {
  constructor(private parent: RefCountSubscription) {
    super();
    parent.count++;
  }

  unsubscribe() {
    const parent = this.parent;
    if (!parent.closed && !this.closed) {
      super.unsubscribe();
      parent.count -= 1;
      if (parent.count === 0 && parent.attemptedToUnsubscribe) {
        parent.unsubscribe();
      }
    }
  }
}
