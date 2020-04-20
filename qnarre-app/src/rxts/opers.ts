import * as qt from './types';
import * as qu from './utils';

export function audit<N, R, F, D>(
  d: (_?: R) => qt.SourceOrPromise<N, F, D>
): qt.MonoOper<N, F, D> {
  return (s: qt.Source<N, F, D>) => s.lift(new AuditO<N, R, F, D>(d));
}

class AuditO<N, R, F, D> implements qt.Operator<N, R, F, D> {
  constructor(private dur: (_?: R) => qt.SourceOrPromise<N, F, D>) {}

  call(r: qj.Subscriber<R, F, D>, s: qt.Source<N, F, D>) {
    return s.subscribe(new AuditR(r, this.dur));
  }
}

export class AuditR<N, R, F, D> extends Reactor<N, R, F, D> {
  private r?: R;
  private hasR = false;
  private act?: qt.Subscription;

  constructor(
    tgt: Subscriber<R, F, D>,
    private duration: (_?: R) => qt.SourceOrPromise<N, F, D>
  ) {
    super(tgt);
  }

  protected _next(r?: R) {
    this.r = r;
    this.hasR = true;
    if (!this.act) {
      let d: qt.SourceOrPromise<N, F, D>;
      try {
        d = this.duration(r);
      } catch (e) {
        return this.tgt.fail(e);
      }
      const a = qu.subscribeToResult(this, d);
      if (!a || a.closed) this.clear();
      else this.add((this.act = a));
    }
  }

  clear() {
    const {r, hasR, act} = this;
    if (act) {
      this.remove(act);
      this.act = undefined;
      act.unsubscribe();
    }
    if (hasR) {
      this.r = undefined;
      this.hasR = false;
      this.tgt.next(r);
    }
  }

  reactNext() {
    this.clear();
  }

  reactDone() {
    this.clear();
  }
}

export function auditTime<N, F, D>(
  duration: number,
  s: qt.Scheduler = async
): qt.MonoOper<N, F, D> {
  return audit(() => timer(duration, s));
}

export function defaultIfEmpty<T, R = T>(defaultValue?: R): Lifter<T, T | R>;
export function defaultIfEmpty<T, R>(
  defaultValue: R | null = null
): Lifter<T, T | R> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DefaultIfEmptyO(defaultValue)) as qt.Source<T | R>;
}

class DefaultIfEmptyO<T, R> implements qt.Operator<T, T | R> {
  constructor(private defaultValue: R) {}

  call(subscriber: Subscriber<T | R>, source: any): any {
    return source.subscribe(new DefaultIfEmptyR(subscriber, this.defaultValue));
  }
}

export class DefaultIfEmptyR<N, M, F, D> extends Subscriber<N, F, D> {
  private isEmpty = true;

  constructor(tgt: Subscriber<N | M, F, D>, private defaultValue: M) {
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
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, boolean> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new EveryO(predicate, thisArg, source));
}

class EveryO<N, F, D> implements qt.Operator<T, boolean> {
  constructor(
    private predicate: (
      value: T,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private thisArg: any,
    private source: qt.Source<N, F, D>
  ) {}

  call(observer: Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new EveryR(observer, this.predicate, this.thisArg, this.source)
    );
  }
}

export class EveryR<N, F, D> extends Subscriber<N, F, D> {
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

export function expand<T, R>(
  project: (value: T, index: number) => SourceInput<R>,
  concurrent?: number,
  scheduler?: qt.Scheduler
): Lifter<T, R>;
export function expand<N, F, D>(
  project: (value: T, index: number) => SourceInput<N, F, D>,
  concurrent?: number,
  scheduler?: qt.Scheduler
): qt.MonoOper<N, F, D>;
export function expand<T, R>(
  project: (value: T, index: number) => SourceInput<R>,
  concurrent: number = Number.POSITIVE_INFINITY,
  scheduler?: qt.Scheduler
): Lifter<T, R> {
  concurrent = (concurrent || 0) < 1 ? Number.POSITIVE_INFINITY : concurrent;

  return (source: qt.Source<N, F, D>) =>
    source.lift(new ExpandO(project, concurrent, scheduler));
}

export class ExpandO<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => SourceInput<R>,
    private concurrent: number,
    private scheduler?: qt.Scheduler
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new ExpandR(subscriber, this.project, this.concurrent, this.scheduler)
    );
  }
}

export class ExpandR<N, M, F, D> extends Reactor<N, M, F, D> {
  private index = 0;
  private active = 0;
  private hasCompleted = false;
  private buffer?: any[];

  constructor(
    tgt: Subscriber<M, F, D>,
    private project: (value: T, index: number) => SourceInput<R>,
    private concurrent: number,
    private scheduler?: qt.Scheduler
  ) {
    super(tgt);
    if (concurrent < Number.POSITIVE_INFINITY) this.buffer = [];
  }

  private static dispatch<N, M>(arg: DispatchArg<N, M>) {
    const {subscriber, result, value, index} = arg;
    subscriber.subscribeToProjection(result, value, index);
  }

  protected _next(n?: N) {
    const tgt = this.tgt;
    if (tgt.closed) {
      this._done();
      return;
    }
    const index = this.index++;
    if (this.active < this.concurrent) {
      tgt.next(n);
      try {
        const {project} = this;
        const result = project(n, index);
        if (!this.scheduler) {
          this.subscribeToProjection(result, n, index);
        } else {
          const state: DispatchArg<N, M> = {
            subscriber: this,
            result,
            n,
            index
          };
          const tgt = this.tgt as Subscription;
          tgt.add(
            this.scheduler.schedule<DispatchArg<N, M>>(
              Expand.dispatch as any,
              0,
              state
            )
          );
        }
      } catch (e) {
        tgt.fail(e);
      }
    } else this.buffer!.push(n);
  }

  private subscribeToProjection(result: any, value: N, index: number) {
    this.active++;
    const tgt = this.tgt as Subscription;
    tgt.add(subscribeToResult<T, R>(this, result, value, index));
  }

  protected _done(d?: D) {
    this.hasCompleted = true;
    if (this.hasCompleted && this.active === 0) this.tgt.done(d);

    this.unsubscribe();
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ) {
    this._next(innerValue);
  }

  reactDone(innerSub: Subscription) {
    const buffer = this.buffer;
    const tgt = this.tgt as Subscription;
    tgt.remove(innerSub);
    this.active--;
    if (buffer && buffer.length > 0) this._next(buffer.shift());
    if (this.hasCompleted && this.active === 0) this.tgt.done();
  }
}

interface DispatchArg<T, R> {
  subscriber: Expand<T, R>;
  result: qt.SourceInput<R>;
  value: any;
  index: number;
}

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

export function find<T, S extends T>(
  predicate: (
    value: T,
    index: number,
    source: qt.Source<N, F, D>
  ) => value is S,
  thisArg?: any
): Lifter<T, S | undefined>;
export function find<N, F, D>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, T | undefined>;
export function find<N, F, D>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, T | undefined> {
  if (typeof predicate !== 'function') {
    throw new TypeError('predicate is not a function');
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(new FindValueO(predicate, source, false, thisArg)) as qt.Source<
      T | undefined
    >;
}

export function findIndex<N, F, D>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, number> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new FindValueO(predicate, source, true, thisArg)) as qt.Source<
      any,
      F,
      D
    >;
}

export class FindValueO<N, F, D>
  implements qt.Operator<T, T | number | undefined> {
  constructor(
    private predicate: (
      value: T,
      index: number,
      source: qt.Source<N, F, D>
    ) => boolean,
    private source: qt.Source<N, F, D>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {}

  call(observer: Subscriber<N, F, D>, source: any): any {
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

export class FindValueR<N, F, D> extends Subscriber<N, F, D> {
  private index = 0;

  constructor(
    tgt: Subscriber<N, F, D>,
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

export function isEmpty<N, F, D>(): Lifter<T, boolean> {
  return (source: qt.Source<N, F, D>) => source.lift(new IsEmptyO());
}

class IsEmptyO implements qt.Operator<any, boolean> {
  call(observer: Subscriber<boolean>, source: any): any {
    return source.subscribe(new IsEmptyR(observer));
  }
}

export class IsEmptyR<N extends boolean, F, D> extends Subscriber<N, F, D> {
  constructor(tgt: Subscriber<N, F, D>) {
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

export function multicast<N, F, D>(
  subject: Subject<N, F, D>
): UnaryFun<Observable<N, F, D>, Connect<N, F, D>>;
export function multicast<T, O extends SourceInput<any>>(
  subject: Subject<N, F, D>,
  selector: (shared: qt.Source<N, F, D>) => O
): UnaryFun<Observable<N, F, D>, Connect<Sourced<O>>>;
export function multicast<N, F, D>(
  subjectFactory: (this: qt.Source<N, F, D>) => Subject<N, F, D>
): UnaryFun<Observable<N, F, D>, Connect<N, F, D>>;
export function multicast<T, O extends SourceInput<any>>(
  SubjectFactory: (this: qt.Source<N, F, D>) => Subject<N, F, D>,
  selector: (shared: qt.Source<N, F, D>) => O
): Lifter<T, Sourced<O>>;
export function multicast<T, R>(
  subjectOrSubjectFactory: Subject<N, F, D> | (() => Subject<N, F, D>),
  selector?: (source: qt.Source<N, F, D>) => qt.Source<R>
): Lifter<T, R> {
  return function multicastLifter(source: qt.Source<N, F, D>): qt.Source<R> {
    let subjectFactory: () => Subject<N, F, D>;
    if (typeof subjectOrSubjectFactory === 'function') {
      subjectFactory = <() => Subject<N, F, D>>subjectOrSubjectFactory;
    } else {
      subjectFactory = function subjectFactory() {
        return <Subject<N, F, D>>subjectOrSubjectFactory;
      };
    }

    if (typeof selector === 'function') {
      return source.lift(new MulticastO(subjectFactory, selector));
    }

    const connectable: any = Object.create(
      source,
      connectableObservableDescriptor
    );
    connectable.source = source;
    connectable.subjectFactory = subjectFactory;

    return <Connect<R>>connectable;
  };
}

export class MulticastO<T, R> implements qt.Operator<T, R> {
  constructor(
    private subjectFactory: () => Subject<N, F, D>,
    private selector: (source: qt.Source<N, F, D>) => qt.Source<R>
  ) {}
  call(subscriber: Subscriber<R>, source: any): any {
    const {selector} = this;
    const subject = this.subjectFactory();
    const subscription = selector(subject).subscribe(subscriber);
    subscription.add(source.subscribe(subject));
    return subscription;
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

export function pairwise<N, F, D>(): Lifter<T, [T, T]> {
  return (source: qt.Source<N, F, D>) => source.lift(new PairwiseO());
}

class PairwiseO<N, F, D> implements qt.Operator<T, [T, T]> {
  call(subscriber: Subscriber<[T, T]>, source: any): any {
    return source.subscribe(new PairwiseR(subscriber));
  }
}

class PairwiseR<N, F, D> extends Subscriber<N, F, D> {
  private prev: T | undefined;
  private hasPrev = false;

  constructor(tgt: Subscriber<[T, T]>) {
    super(tgt);
  }

  _next(value: N): void {
    let pair: [T, T] | undefined;

    if (this.hasPrev) {
      pair = [this.prev!, value];
    } else {
      this.hasPrev = true;
    }

    this.prev = value;

    if (pair) {
      this.tgt.next(pair);
    }
  }
}

export function partition<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): UnaryFun<Observable<N, F, D>, [Observable<N, F, D>, qt.Source<N, F, D>]> {
  return (source: qt.Source<N, F, D>) =>
    [
      filter(predicate, thisArg)(source),
      filter(not(predicate, thisArg) as any)(source)
    ] as [Observable<N, F, D>, qt.Source<N, F, D>];
}

export function pluck<T, K1 extends keyof T>(k1: K1): Lifter<T, T[K1]>;
export function pluck<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  k1: K1,
  k2: K2
): Lifter<T, T[K1][K2]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2]
>(k1: K1, k2: K2, k3: K3): Lifter<T, T[K1][K2][K3]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3]
>(k1: K1, k2: K2, k3: K3, k4: K4): Lifter<T, T[K1][K2][K3][K4]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4]
>(k1: K1, k2: K2, k3: K3, k4: K4, k5: K5): Lifter<T, T[K1][K2][K3][K4][K5]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5]
>(
  k1: K1,
  k2: K2,
  k3: K3,
  k4: K4,
  k5: K5,
  k6: K6
): Lifter<T, T[K1][K2][K3][K4][K5][K6]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5]
>(
  k1: K1,
  k2: K2,
  k3: K3,
  k4: K4,
  k5: K5,
  k6: K6,
  ...rest: string[]
): Lifter<T, unknown>;
export function pluck<N, F, D>(...properties: string[]): Lifter<T, unknown>;
export function pluck<T, R>(
  ...properties: Array<string | number | symbol>
): Lifter<T, R> {
  const length = properties.length;
  if (length === 0) {
    throw new Error('list of properties cannot be empty.');
  }
  return map(x => {
    let currentProp: any = x;
    for (let i = 0; i < length; i++) {
      const p = currentProp[properties[i]];
      if (typeof p !== 'undefined') {
        currentProp = p;
      } else {
        return undefined;
      }
    }
    return currentProp;
  });
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

function shareSubjectFactory() {
  return new Subject<any>();
}

export function share<N, F, D>(): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    refCount()(multicast(shareSubjectFactory)(source)) as qt.Source<N, F, D>;
}

export interface ShareReplayConfig {
  bufferSize?: number;
  windowTime?: number;
  refCount: boolean;
  scheduler?: qt.Scheduler;
}

export function shareReplay<N, F, D>(
  config: ShareReplayConfig
): qt.MonoOper<N, F, D>;
export function shareReplay<N, F, D>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.MonoOper<N, F, D>;
export function shareReplay<N, F, D>(
  configOrBufferSize?: ShareReplayConfig | number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.MonoOper<N, F, D> {
  let config: ShareReplayConfig;
  if (configOrBufferSize && typeof configOrBufferSize === 'object') {
    config = configOrBufferSize as ShareReplayConfig;
  } else {
    config = {
      bufferSize: configOrBufferSize as number | undefined,
      windowTime,
      refCount: false,
      scheduler
    };
  }
  return (source: qt.Source<N, F, D>) => source.lift(shareReplayO(config));
}

function shareReplayO<N, F, D>({
  bufferSize = Number.POSITIVE_INFINITY,
  windowTime = Number.POSITIVE_INFINITY,
  refCount: useRefCount,
  scheduler
}: ShareReplayConfig) {
  let subject: Replay<N, F, D> | undefined;
  let refCount = 0;
  let subscription: Subscription;
  let hasError = false;
  let isComplete = false;

  return function shareReplayOperation(
    this: Subscriber<N, F, D>,
    source: qt.Source<N, F, D>
  ) {
    refCount++;
    if (!subject || hasError) {
      hasError = false;
      subject = new Replay<N, F, D>(bufferSize, windowTime, scheduler);
      subscription = source.subscribe({
        next(value) {
          subject!.next(value);
        },
        error(err) {
          hasError = true;
          subject!.error(err);
        },
        complete() {
          isComplete = true;
          subscription = undefined;
          subject!.complete();
        }
      });
    }

    const innerSub = subject.subscribe(this);
    this.add(() => {
      refCount--;
      innerSub.unsubscribe();
      if (subscription && !isComplete && useRefCount && refCount === 0) {
        subscription.unsubscribe();
        subscription = undefined;
        subject = undefined;
      }
    });
  };
}

export function single<N, F, D>(
  predicate?: (value: T, index: number, source: qt.Source<N, F, D>) => boolean
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SingleO(predicate, source));
}

class SingleO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private predicate:
      | ((value: T, index: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new SingleR(subscriber, this.predicate, this.source)
    );
  }
}

export class SingleR<N, F, D> extends Subscriber<N, F, D> {
  private seenValue = false;
  private singleValue?: N;
  private index = 0;

  constructor(
    tgt: qt.Observer<N, F, D>,
    private predicate:
      | ((n: N | undefined, i: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  private applySingleValue(n?: N) {
    if (this.seenValue)
      this.tgt.fail('Sequence contains more than one element');
    else {
      this.seenValue = true;
      this.singleValue = n;
    }
  }

  protected _next(n?: N) {
    const i = this.index++;
    if (this.predicate) this.tryNext(n, i);
    else this.applySingleValue(n);
  }

  private tryNext(n: N | undefined, i: number) {
    try {
      if (this.predicate!(n, i, this.source)) this.applySingleValue(n);
    } catch (e) {
      this.tgt.fail(e);
    }
  }

  protected _done(d?: D) {
    const tgt = this.tgt;
    if (this.index > 0) {
      tgt.next(this.seenValue ? this.singleValue : undefined);
      tgt.done();
    } else tgt.fail(new EmptyError());
  }
}

export function tap<N, F, D>(
  next?: (x: N) => void,
  error?: (e: any) => void,
  complete?: () => void
): qt.MonoOper<N, F, D>;
export function tap<N, F, D>(observer: Target<N, F, D>): qt.MonoOper<N, F, D>;
export function tap<N, F, D>(
  nextOrObserver?: Target<N, F, D> | ((x: N) => void) | null,
  error?: ((e: any) => void) | null,
  complete?: (() => void) | null
): qt.MonoOper<N, F, D> {
  return function tapLifter(source: qt.Source<N, F, D>): qt.Source<N, F, D> {
    return source.lift(new TapO(nextOrObserver, error, complete));
  };
}

class TapO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private nextOrObserver?: Target<N, F, D> | ((x: N) => void) | null,
    private error?: ((e: any) => void) | null,
    private complete?: (() => void) | null
  ) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new TapR(subscriber, this.nextOrObserver, this.error, this.complete)
    );
  }
}

export class TapR<N, F, D> extends Subscriber<N, F, D> {
  private _context: any;
  private _tapNext: (value: N) => void = noop;
  private _tapError: (err: any) => void = noop;
  private _tapComplete: () => void = noop;

  constructor(
    tgt: Subscriber<N, F, D>,
    observerOrNext?: Target<N, F, D> | ((value: N) => void) | null,
    error?: (e?: any) => void,
    complete?: () => void
  ) {
    super(tgt);
    this._tapError = error || noop;
    this._tapComplete = complete || noop;
    if (isFunction(observerOrNext)) {
      this._context = this;
      this._tapNext = observerOrNext;
    } else if (observerOrNext) {
      this._context = observerOrNext;
      this._tapNext = observerOrNext.next || noop;
      this._tapError = observerOrNext.error || noop;
      this._tapComplete = observerOrNext.complete || noop;
    }
  }

  _next(n?: N) {
    try {
      this._tapNext.call(this._context, n);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.next(n);
  }

  _fail(f?: F) {
    try {
      this._tapError.call(this._context, f);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.fail(f);
  }

  _done(d?: D) {
    try {
      this._tapComplete.call(this._context);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    return this.tgt.done(d);
  }
}

export interface ThrottleConfig {
  leading?: boolean;
  trailing?: boolean;
}

export const defaultThrottleConfig: ThrottleConfig = {
  leading: true,
  trailing: false
};

export function throttle<N, F, D>(
  durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>,
  config: ThrottleConfig = defaultThrottleConfig
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new ThrottleO(durationSelector, !!config.leading, !!config.trailing)
    );
}

class ThrottleO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ThrottleR(
        subscriber,
        this.durationSelector,
        this.leading,
        this.trailing
      )
    );
  }
}

export class ThrottleR<N, M, F, D> extends Reactor<N, M, F, D> {
  private _throttled?: Subscription;
  private _sendValue?: N;
  private _hasValue = false;

  constructor(
    protected tgt: Subscriber<N, F, D>,
    private durationSelector: (value: N) => qt.SourceOrPromise<number>,
    private _leading: boolean,
    private _trailing: boolean
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    this._hasValue = true;
    this._sendValue = n;
    if (!this._throttled) {
      if (this._leading) this.send();
      else this.throttle(n);
    }
  }

  private send() {
    const {_hasValue, _sendValue} = this;
    if (_hasValue) {
      this.tgt.next(_sendValue!);
      this.throttle(_sendValue!);
    }
    this._hasValue = false;
    this._sendValue = undefined;
  }

  private throttle(value: N): void {
    const duration = this.tryDurationSelector(value);
    if (!!duration)
      this.add((this._throttled = qu.subscribeToResult(this, duration)));
  }

  private tryDurationSelector(value: N): qt.SourceOrPromise<any, F, D> | null {
    try {
      return this.durationSelector(value);
    } catch (e) {
      this.tgt.fail(e);
      return null;
    }
  }

  private throttlingDone() {
    const {_throttled, _trailing} = this;
    if (_throttled) _throttled.unsubscribe();
    this._throttled = undefined;
    if (_trailing) this.send();
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.throttlingDone();
  }

  reactDone(): void {
    this.throttlingDone();
  }
}

export function throttleTime<N, F, D>(
  duration: number,
  scheduler: qt.Scheduler = async,
  config: ThrottleConfig = defaultThrottleConfig
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new ThrottleTimeO(
        duration,
        scheduler,
        !!config.leading,
        !!config.trailing
      )
    );
}

class ThrottleTimeO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private duration: number,
    private scheduler: qt.Scheduler,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ThrottleTimeR(
        subscriber,
        this.duration,
        this.scheduler,
        this.leading,
        this.trailing
      )
    );
  }
}

export class ThrottleTime<N, F, D> extends Subscriber<N, F, D> {
  private throttled?: Subscription;
  private _hasTrailingValue = false;
  private _trailingValue?: N;

  constructor(
    tgt: Subscriber<N, F, D>,
    private duration: number,
    private scheduler: qt.Scheduler,
    private leading: boolean,
    private trailing: boolean
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    if (this.throttled) {
      if (this.trailing) {
        this._trailingValue = n;
        this._hasTrailingValue = true;
      }
    } else {
      this.add(
        (this.throttled = this.scheduler.schedule<DispatchArg<N, F, D>>(
          dispatchNext as any,
          this.duration,
          {subscriber: this}
        ))
      );
      if (this.leading) this.tgt.next(n);
      else if (this.trailing) {
        this._trailingValue = n;
        this._hasTrailingValue = true;
      }
    }
  }

  protected _done(d?: D) {
    if (this._hasTrailingValue) this.tgt.next(this._trailingValue);
    this.tgt.done(d);
  }

  clearThrottle() {
    const throttled = this.throttled;
    if (throttled) {
      if (this.trailing && this._hasTrailingValue) {
        this.tgt.next(this._trailingValue);
        this._trailingValue = null;
        this._hasTrailingValue = false;
      }
      throttled.unsubscribe();
      this.remove(throttled);
      this.throttled = null!;
    }
  }
}

interface DispatchArg<N, F, D> {
  subscriber: ThrottleTimeSubscriber<N, F, D>;
}

function dispatchNext<N, F, D>(arg: DispatchArg<N, F, D>) {
  const {subscriber} = arg;
  subscriber.clearThrottle();
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

function toArrayReducer<N, F, D>(arr: T[], item: T, index: number): T[] {
  if (index === 0) {
    return [item];
  }
  arr.push(item);
  return arr;
}

export function toArray<N, F, D>(): qt.Lifter<N, N[], F, D> {
  return reduce(toArrayReducer, [] as T[]);
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
