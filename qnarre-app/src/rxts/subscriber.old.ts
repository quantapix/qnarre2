import * as qt from './types';

import {Actor, Reactor, Subscription, Subscriber} from './subject';

export function catchError<T, O extends SourceInput<any>>(
  selector: (err: any, caught: qt.Source<N, F, D>) => O
): Lifter<T, T | Sourced<O>>;
export function catchError<T, O extends SourceInput<any>>(
  selector: (err: any, caught: qt.Source<N, F, D>) => O
): Lifter<T, T | Sourced<O>> {
  return function catchErrorLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<T | Sourced<O>> {
    const operator = new CatchOperator(selector);
    const caught = source.lift(operator);
    return (operator.caught = caught as qt.Source<N, F, D>);
  };
}

class CatchOperator<T, R> implements qt.Operator<T, T | R> {
  caught: qt.Source<N, F, D> | undefined;

  constructor(
    private selector: (
      err: any,
      caught: qt.Source<N, F, D>
    ) => SourceInput<T | R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new CatchSubscriber(subscriber, this.selector, this.caught!)
    );
  }
}

export function defaultIfEmpty<T, R = T>(defaultValue?: R): Lifter<T, T | R>;
export function defaultIfEmpty<T, R>(
  defaultValue: R | null = null
): Lifter<T, T | R> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DefaultIfEmptyOperator(defaultValue)) as qt.Source<T | R>;
}

class DefaultIfEmptyOperator<T, R> implements qt.Operator<T, T | R> {
  constructor(private defaultValue: R) {}

  call(subscriber: Subscriber<T | R>, source: any): any {
    return source.subscribe(
      new DefaultIfEmptySubscriber(subscriber, this.defaultValue)
    );
  }
}

export function delay<N, F, D>(
  delay: number | Date,
  scheduler: qt.Scheduler = async
): qt.MonoOper<N, F, D> {
  const absoluteDelay = isDate(delay);
  const delayFor = absoluteDelay
    ? +delay - scheduler.now()
    : Math.abs(<number>delay);
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DelayOperator(delayFor, scheduler));
}

class DelayOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private delay: number, private scheduler: qt.Scheduler) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DelaySubscriber(subscriber, this.delay, this.scheduler)
    );
  }
}

export function delayWhen<N, F, D>(
  delayDurationSelector: (value: T, index: number) => qt.Source<any, F, D>,
  subscriptionDelay?: qt.Source<any, F, D>
): qt.MonoOper<N, F, D>;
export function delayWhen<N, F, D>(
  delayDurationSelector: (value: T, index: number) => qt.Source<any, F, D>,
  subscriptionDelay?: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  if (subscriptionDelay) {
    return (source: qt.Source<N, F, D>) =>
      new SubscriptionDelayObservable(source, subscriptionDelay).lift(
        new DelayWhenOperator(delayDurationSelector)
      );
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DelayWhenOperator(delayDurationSelector));
}

class DelayWhenOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private delayDurationSelector: (
      value: T,
      index: number
    ) => qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DelayWhenSubscriber(subscriber, this.delayDurationSelector)
    );
  }
}

class SubscriptionDelayObservable<N, F, D> extends qt.Source<N, F, D> {
  constructor(
    public source: qt.Source<N, F, D>,
    private subscriptionDelay: qt.Source<any, F, D>
  ) {
    super();
  }

  _subscribe(subscriber: Subscriber<N, F, D>) {
    this.subscriptionDelay.subscribe(
      new SubscriptionDelaySubscriber(subscriber, this.source)
    );
  }
}

export function dematerialize<N, F, D>(): Lifter<Notification<N, F, D>, T> {
  return function dematerializeLifter(
    source: qt.Source<Notification<N, F, D>>
  ) {
    return source.lift(new DeMaterializeOperator());
  };
}

class DeMaterializeOperator<T extends Notification<any>, R>
  implements qt.Operator<T, R> {
  call(subscriber: Subscriber<any>, source: any): any {
    return source.subscribe(new DeMaterializeSubscriber(subscriber));
  }
}

export function every<N, F, D>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, boolean> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new EveryOperator(predicate, thisArg, source));
}

class EveryOperator<N, F, D> implements qt.Operator<T, boolean> {
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
      new EverySubscriber(observer, this.predicate, this.thisArg, this.source)
    );
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
    source.lift(new ExpandOperator(project, concurrent, scheduler));
}

export class ExpandOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => SourceInput<R>,
    private concurrent: number,
    private scheduler?: qt.Scheduler
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new ExpandSubscriber(
        subscriber,
        this.project,
        this.concurrent,
        this.scheduler
      )
    );
  }
}

export function finalize<N, F, D>(callback: () => void): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new FinallyOperator(callback));
}

class FinallyOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private callback: () => void) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new FinallySubscriber(subscriber, this.callback));
  }
}

class FinallySubscriber<N, F, D> extends Subscriber<N, F, D> {
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
    source.lift(
      new FindValueOperator(predicate, source, false, thisArg)
    ) as qt.Source<T | undefined>;
}

export class FindValueOperator<N, F, D>
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
      new FindValueSubscriber(
        observer,
        this.predicate,
        this.source,
        this.yieldIndex,
        this.thisArg
      )
    );
  }
}

export function findIndex<N, F, D>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  thisArg?: any
): Lifter<T, number> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new FindValueOperator(predicate, source, true, thisArg)
    ) as qt.Source<any, F, D>;
}

export function groupBy<T, K>(
  keySelector: (value: N) => K
): Lifter<T, GroupedObservable<K, T>>;
export function groupBy<T, K>(
  keySelector: (value: N) => K,
  elementSelector: void,
  durationSelector: (grouped: GroupedObservable<K, T>) => qt.Source<any, F, D>
): Lifter<T, GroupedObservable<K, T>>;
export function groupBy<T, K, R>(
  keySelector: (value: N) => K,
  elementSelector?: (value: N) => R,
  durationSelector?: (grouped: GroupedObservable<K, R>) => qt.Source<any, F, D>
): Lifter<T, GroupedObservable<K, R>>;
export function groupBy<T, K, R>(
  keySelector: (value: N) => K,
  elementSelector?: (value: N) => R,
  durationSelector?: (grouped: GroupedObservable<K, R>) => qt.Source<any, F, D>,
  subjectSelector?: () => Subject<R>
): Lifter<T, GroupedObservable<K, R>>;
export function groupBy<T, K, R>(
  keySelector: (value: N) => K,
  elementSelector?: ((value: N) => R) | void,
  durationSelector?: (grouped: GroupedObservable<K, R>) => qt.Source<any, F, D>,
  subjectSelector?: () => Subject<R>
): Lifter<T, GroupedObservable<K, R>> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new GroupByOperator(
        keySelector,
        elementSelector,
        durationSelector,
        subjectSelector
      )
    );
}

class GroupByOperator<T, K, R>
  implements qt.Operator<T, GroupedObservable<K, R>> {
  constructor(
    private keySelector: (value: N) => K,
    private elementSelector?: ((value: N) => R) | void,
    private durationSelector?: (
      grouped: GroupedObservable<K, R>
    ) => qt.Source<any, F, D>,
    private subjectSelector?: () => Subject<R>
  ) {}

  call(subscriber: Subscriber<GroupedObservable<K, R>>, source: any): any {
    return source.subscribe(
      new GroupBySubscriber(
        subscriber,
        this.keySelector,
        this.elementSelector,
        this.durationSelector,
        this.subjectSelector
      )
    );
  }
}

export class GroupedObservable<K, T> extends qt.Source<N, F, D> {
  constructor(
    public key: K,
    private groupSubject: Subject<N, F, D>,
    private refCountSubscription?: RefCountSubscription
  ) {
    super();
  }

  _subscribe(subscriber: Subscriber<N, F, D>) {
    const subscription = new Subscription();
    const {refCountSubscription, groupSubject} = this;
    if (refCountSubscription && !refCountSubscription.closed) {
      subscription.add(new ActorRefCountSubscription(refCountSubscription));
    }
    subscription.add(groupSubject.subscribe(subscriber));
    return subscription;
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

export function isEmpty<N, F, D>(): Lifter<T, boolean> {
  return (source: qt.Source<N, F, D>) => source.lift(new IsEmptyOperator());
}

class IsEmptyOperator implements qt.Operator<any, boolean> {
  call(observer: Subscriber<boolean>, source: any): any {
    return source.subscribe(new IsEmptySubscriber(observer));
  }
}

export function map<T, R>(
  project: (value: T, index: number) => R,
  thisArg?: any
): Lifter<T, R> {
  return function mapOperation(source: qt.Source<N, F, D>): qt.Source<R> {
    if (typeof project !== 'function') {
      throw new TypeError(
        'argument is not a function. Are you looking for `mapTo()`?'
      );
    }
    return source.lift(new MapOperator(project, thisArg));
  };
}

export class MapOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => R,
    private thisArg: any
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new MapSubscriber(subscriber, this.project, this.thisArg)
    );
  }
}

export function mapTo<R>(value: R): Lifter<any, R>;
export function mapTo<R>(value: R): Lifter<any, R> {
  return (source: qt.Source<any, F, D>) =>
    source.lift(new MapToOperator(value));
}

class MapToOperator<T, R> implements qt.Operator<T, R> {
  value: R;

  constructor(value: R) {
    this.value = value;
  }

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new MapToSubscriber(subscriber, this.value));
  }
}

export function materialize<N, F, D>(): Lifter<T, Notification<N, F, D>> {
  return function materializeLifter(source: qt.Source<N, F, D>) {
    return source.lift(new MaterializeOperator());
  };
}

class MaterializeOperator<N, F, D>
  implements qt.Operator<T, Notification<N, F, D>> {
  call(subscriber: Subscriber<Notification<N, F, D>>, source: any): any {
    return source.subscribe(new MaterializeSubscriber(subscriber));
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
      return source.lift(new MulticastOperator(subjectFactory, selector));
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

export class MulticastOperator<T, R> implements qt.Operator<T, R> {
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

export function observeOn<N, F, D>(
  scheduler: qt.Scheduler,
  delay: number = 0
): qt.MonoOper<N, F, D> {
  return function observeOnLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    return source.lift(new ObserveOnOperator(scheduler, delay));
  };
}

export class ObserveOnOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private scheduler: qt.Scheduler, private delay: number = 0) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ObserveOnSubscriber(subscriber, this.scheduler, this.delay)
    );
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
    source.lift(new OnErrorResumeNextOperator<T, R>(nextSources));
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

  return from(source, null!).lift(
    new OnErrorResumeNextOperator<T, R>(nextSources)
  );
}

class OnErrorResumeNextOperator<T, R> implements qt.Operator<T, R> {
  constructor(private nextSources: Array<SourceInput<any>>) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new OnErrorResumeNextSubscriber(subscriber, this.nextSources)
    );
  }
}

export function pairwise<N, F, D>(): Lifter<T, [T, T]> {
  return (source: qt.Source<N, F, D>) => source.lift(new PairwiseOperator());
}

class PairwiseOperator<N, F, D> implements qt.Operator<T, [T, T]> {
  call(subscriber: Subscriber<[T, T]>, source: any): any {
    return source.subscribe(new PairwiseSubscriber(subscriber));
  }
}

class PairwiseSubscriber<N, F, D> extends Subscriber<N, F, D> {
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

export function repeat<N, F, D>(count: number = -1): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    if (count === 0) {
      return EMPTY;
    } else if (count < 0) {
      return source.lift(new RepeatOperator(-1, source));
    } else {
      return source.lift(new RepeatOperator(count - 1, source));
    }
  };
}

class RepeatOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private count: number, private source: qt.Source<N, F, D>) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RepeatSubscriber(subscriber, this.count, this.source)
    );
  }
}

export function repeatWhen<N, F, D>(
  notifier: (notifications: qt.Source<any, F, D>) => qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new RepeatWhenOperator(notifier));
}

class RepeatWhenOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    protected notifier: (
      notifications: qt.Source<any, F, D>
    ) => qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RepeatWhenSubscriber(subscriber, this.notifier, source)
    );
  }
}

export interface RetryConfig {
  count: number;
  resetOnSuccess?: boolean;
}

export function retry<N, F, D>(count?: number): qt.MonoOper<N, F, D>;
export function retry<N, F, D>(config: RetryConfig): qt.MonoOper<N, F, D>;
export function retry<N, F, D>(
  configOrCount: number | RetryConfig = -1
): qt.MonoOper<N, F, D> {
  let config: RetryConfig;
  if (configOrCount && typeof configOrCount === 'object') {
    config = configOrCount as RetryConfig;
  } else {
    config = {
      count: configOrCount as number
    };
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new RetryOperator(config.count, !!config.resetOnSuccess, source)
    );
}

class RetryOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private count: number,
    private resetOnSuccess: boolean,
    private source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RetrySubscriber(
        subscriber,
        this.count,
        this.resetOnSuccess,
        this.source
      )
    );
  }
}

export function retryWhen<N, F, D>(
  notifier: (errors: qt.Source<any, F, D>) => qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new RetryWhenOperator(notifier, source));
}

class RetryWhenOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    protected notifier: (errors: qt.Source<any, F, D>) => qt.Source<any, F, D>,
    protected source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RetryWhenSubscriber(subscriber, this.notifier, this.source)
    );
  }
}

function dispatchNotification<N, F, D>(this: qt.Action<any>, state: any) {
  let {subscriber, period} = state;
  subscriber.reactNext();
  this.schedule(state, period);
}

export function scan<V, A = V>(
  accumulator: (acc: A | V, value: V, index: number) => A
): Lifter<V, V | A>;
export function scan<V, A>(
  accumulator: (acc: A, value: V, index: number) => A,
  seed: A
): Lifter<V, A>;
export function scan<V, A, S>(
  accumulator: (acc: A | S, value: V, index: number) => A,
  seed: S
): Lifter<V, A>;
export function scan<V, A, S>(
  accumulator: (acc: V | A | S, value: V, index: number) => A,
  seed?: S
): Lifter<V, V | A> {
  let hasSeed = false;
  if (arguments.length >= 2) {
    hasSeed = true;
  }

  return function scanLifter(source: qt.Source<V>) {
    return source.lift(new ScanOperator(accumulator, seed, hasSeed));
  };
}

class ScanOperator<V, A, S> implements qt.Operator<V, A> {
  constructor(
    private accumulator: (acc: V | A | S, value: V, index: number) => A,
    private seed?: S,
    private hasSeed: boolean = false
  ) {}

  call(subscriber: Subscriber<A>, source: any): qt.Closer {
    return source.subscribe(
      new ScanSubscriber(subscriber, this.accumulator, this.seed, this.hasSeed)
    );
  }
}

export function sequenceEqual<N, F, D>(
  compareTo: qt.Source<N, F, D>,
  comparator?: (a: T, b: N) => boolean
): Lifter<T, boolean> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SequenceEqualOperator(compareTo, comparator));
}

export class SequenceEqualOperator<N, F, D> implements qt.Operator<T, boolean> {
  constructor(
    private compareTo: qt.Source<N, F, D>,
    private comparator?: (a: T, b: N) => boolean
  ) {}

  call(subscriber: Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new SequenceEqualSubscriber(subscriber, this.compareTo, this.comparator)
    );
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
  return (source: qt.Source<N, F, D>) =>
    source.lift(shareReplayOperator(config));
}

function shareReplayOperator<N, F, D>({
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
    source.lift(new SingleOperator(predicate, source));
}

class SingleOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private predicate:
      | ((value: T, index: number, source: qt.Source<N, F, D>) => boolean)
      | undefined,
    private source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new SingleSubscriber(subscriber, this.predicate, this.source)
    );
  }
}

export function subscribeOn<N, F, D>(
  scheduler: qt.Scheduler,
  delay: number = 0
): qt.MonoOper<N, F, D> {
  return function subscribeOnLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    return source.lift(new SubscribeOnOperator<N, F, D>(scheduler, delay));
  };
}

class SubscribeOnOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private scheduler: qt.Scheduler, private delay: number) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return new SubscribeOnObservable<N, F, D>(
      source,
      this.delay,
      this.scheduler
    ).subscribe(subscriber);
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
    return source.lift(new DoOperator(nextOrObserver, error, complete));
  };
}

class DoOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private nextOrObserver?: Target<N, F, D> | ((x: N) => void) | null,
    private error?: ((e: any) => void) | null,
    private complete?: (() => void) | null
  ) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new TapSubscriber(
        subscriber,
        this.nextOrObserver,
        this.error,
        this.complete
      )
    );
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
      new ThrottleOperator(
        durationSelector,
        !!config.leading,
        !!config.trailing
      )
    );
}

class ThrottleOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ThrottleSubscriber(
        subscriber,
        this.durationSelector,
        this.leading,
        this.trailing
      )
    );
  }
}

export function throttleTime<N, F, D>(
  duration: number,
  scheduler: qt.Scheduler = async,
  config: ThrottleConfig = defaultThrottleConfig
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(
      new ThrottleTimeOperator(
        duration,
        scheduler,
        !!config.leading,
        !!config.trailing
      )
    );
}

class ThrottleTimeOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private duration: number,
    private scheduler: qt.Scheduler,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ThrottleTimeSubscriber(
        subscriber,
        this.duration,
        this.scheduler,
        this.leading,
        this.trailing
      )
    );
  }
}

interface DispatchArg<N, F, D> {
  subscriber: ThrottleTimeSubscriber<N, F, D>;
}

function dispatchNext<N, F, D>(arg: DispatchArg<N, F, D>) {
  const {subscriber} = arg;
  subscriber.clearThrottle();
}

export function throwIfEmpty<N, F, D>(
  errorFactory: () => any = defaultErrorFactory
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    return source.lift(new ThrowIfEmptyOperator(errorFactory));
  };
}

class ThrowIfEmptyOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private errorFactory: () => any) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new ThrowIfEmptySubscriber(subscriber, this.errorFactory)
    );
  }
}

function defaultErrorFactory() {
  return new EmptyError();
}

export function timeInterval<N, F, D>(
  scheduler: qt.Scheduler = async
): Lifter<T, TimeInterval<N, F, D>> {
  return (source: qt.Source<N, F, D>) =>
    defer(() => {
      return source.pipe(
        // TODO(benlesh): correct these typings.
        scan(
          ({current}, value) => ({
            value,
            current: scheduler.now(),
            last: current
          }),
          {current: scheduler.now(), value: undefined, last: undefined} as any
        ) as Lifter<T, any>,
        map<any, TimeInterval<N, F, D>>(
          ({current, last, value}) => new TimeInterval(value, current - last)
        )
      );
    });
}

export class TimeInterval<N, F, D> {
  constructor(public value: T, public interval: number) {}
}

export function timeout<N, F, D>(
  due: number | Date,
  scheduler: qt.Scheduler = async
): qt.MonoOper<N, F, D> {
  return timeoutWith(due, throwError(new TimeoutError()), scheduler);
}

export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: SourceInput<R>,
  scheduler?: qt.Scheduler
): Lifter<T, T | R>;
export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: SourceInput<R>,
  scheduler: qt.Scheduler = async
): Lifter<T, T | R> {
  return (source: qt.Source<N, F, D>) => {
    let absoluteTimeout = isDate(due);
    let waitFor = absoluteTimeout
      ? +due - scheduler.now()
      : Math.abs(<number>due);
    return source.lift(
      new TimeoutWithOperator(
        waitFor,
        absoluteTimeout,
        withObservable,
        scheduler
      )
    );
  };
}

class TimeoutWithOperator<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private waitFor: number,
    private absoluteTimeout: boolean,
    private withObservable: SourceInput<any>,
    private scheduler: qt.Scheduler
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new TimeoutWithSubscriber(
        subscriber,
        this.absoluteTimeout,
        this.waitFor,
        this.withObservable,
        this.scheduler
      )
    );
  }
}

export function time<N, F, D>(
  timeProvider: Stamper = Date
): Lifter<T, Stamp<N, F, D>> {
  return map((value: N) => ({value, time: timeProvider.now()}));
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

export function window<N, F, D>(
  windowBoundaries: qt.Source<any, F, D>
): Lifter<T, qt.Source<N, F, D>> {
  return function windowLifter(source: qt.Source<N, F, D>) {
    return source.lift(new WindowOperator(windowBoundaries));
  };
}

class WindowOperator<N, F, D> implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(private windowBoundaries: qt.Source<any, F, D>) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    const windowSubscriber = new WindowSubscriber(subscriber);
    const sourceSubscription = source.subscribe(windowSubscriber);
    if (!sourceSubscription.closed) {
      windowSubscriber.add(
        subscribeToResult(windowSubscriber, this.windowBoundaries)
      );
    }
    return sourceSubscription;
  }
}

class WindowSubscriber<N, F, D> extends Reactor<T, any> {
  private window: Subject<N, F, D> = new Subject<N, F, D>();

  constructor(tgt: Subscriber<Observable<N, F, D>>) {
    super(tgt);
    tgt.next(this.window);
  }

  reactNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, any, F, D>
  ): void {
    this.openWindow();
  }

  notifyError(error: any, innerSub: Actor<N, any, F, D>): void {
    this._fail(error);
  }

  reactDone(innerSub: Actor<N, any, F, D>): void {
    this._done();
  }

  protected _next(v: N) {
    this.window.next(value);
  }

  protected _fail(f?: F) {
    this.window.error(err);
    this.tgt.error(err);
  }

  protected _done(d?: D) {
    this.window.complete();
    this.tgt.complete();
  }

  _unsubscribe() {
    this.window = null!;
  }

  private openWindow(): void {
    const prevWindow = this.window;
    if (prevWindow) {
      prevWindow.complete();
    }
    const tgt = this.tgt;
    const newWindow = (this.window = new Subject<N, F, D>());
    tgt.next(newWindow);
  }
}

export function windowCount<N, F, D>(
  windowSize: number,
  startWindowEvery: number = 0
): Lifter<T, qt.Source<N, F, D>> {
  return function windowCountLifter(source: qt.Source<N, F, D>) {
    return source.lift(
      new WindowCountOperator<N, F, D>(windowSize, startWindowEvery)
    );
  };
}

class WindowCountOperator<N, F, D>
  implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(private windowSize: number, private startWindowEvery: number) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowCountSubscriber(
        subscriber,
        this.windowSize,
        this.startWindowEvery
      )
    );
  }
}

class WindowCountSubscriber<N, F, D> extends Subscriber<N, F, D> {
  private windows: Subject<N, F, D>[] = [new Subject<N, F, D>()];
  private count: number = 0;

  constructor(
    protected tgt: Subscriber<Observable<N, F, D>>,
    private windowSize: number,
    private startWindowEvery: number
  ) {
    super(tgt);
    tgt.next(this.windows[0]);
  }

  protected _next(n?: N) {
    const startWindowEvery =
      this.startWindowEvery > 0 ? this.startWindowEvery : this.windowSize;
    const tgt = this.tgt;
    const windowSize = this.windowSize;
    const windows = this.windows;
    const len = windows.length;

    for (let i = 0; i < len && !this.closed; i++) {
      windows[i].next(value);
    }
    const c = this.count - windowSize + 1;
    if (c >= 0 && c % startWindowEvery === 0 && !this.closed) {
      windows.shift()!.complete();
    }
    if (++this.count % startWindowEvery === 0 && !this.closed) {
      const window = new Subject<N, F, D>();
      windows.push(window);
      tgt.next(window);
    }
  }

  protected _fail(f?: F) {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.error(err);
      }
    }
    this.tgt.error(err);
  }

  protected _done(d?: D) {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.complete();
      }
    }
    this.tgt.complete();
  }

  protected _unsubscribe() {
    this.count = 0;
    this.windows = null!;
  }
}

export function windowTime<N, F, D>(
  windowTimeSpan: number,
  scheduler?: qt.Scheduler
): Lifter<T, qt.Source<N, F, D>>;
export function windowTime<N, F, D>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  scheduler?: qt.Scheduler
): Lifter<T, qt.Source<N, F, D>>;
export function windowTime<N, F, D>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  maxWindowSize: number,
  scheduler?: qt.Scheduler
): Lifter<T, qt.Source<N, F, D>>;

export function windowTime<N, F, D>(
  windowTimeSpan: number
): Lifter<T, qt.Source<N, F, D>> {
  let scheduler: qt.Scheduler = async;
  let windowCreationInterval: number | null = null;
  let maxWindowSize: number = Number.POSITIVE_INFINITY;

  if (isScheduler(arguments[3])) {
    scheduler = arguments[3];
  }

  if (isScheduler(arguments[2])) {
    scheduler = arguments[2];
  } else if (isNumeric(arguments[2])) {
    maxWindowSize = Number(arguments[2]);
  }

  if (isScheduler(arguments[1])) {
    scheduler = arguments[1];
  } else if (isNumeric(arguments[1])) {
    windowCreationInterval = Number(arguments[1]);
  }

  return function windowTimeLifter(source: qt.Source<N, F, D>) {
    return source.lift(
      new WindowTimeOperator<N, F, D>(
        windowTimeSpan,
        windowCreationInterval,
        maxWindowSize,
        scheduler
      )
    );
  };
}

class WindowTimeOperator<N, F, D>
  implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(
    private windowTimeSpan: number,
    private windowCreationInterval: number | null,
    private maxWindowSize: number,
    private scheduler: qt.Scheduler
  ) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowTimeSubscriber(
        subscriber,
        this.windowTimeSpan,
        this.windowCreationInterval,
        this.maxWindowSize,
        this.scheduler
      )
    );
  }
}

interface CreationState<N, F, D> {
  windowTimeSpan: number;
  windowCreationInterval: number;
  subscriber: WindowTimeSubscriber<N, F, D>;
  scheduler: qt.Scheduler;
}

interface TimeSpanOnlyState<N, F, D> {
  window: CountedSubject<N, F, D>;
  windowTimeSpan: number;
  subscriber: WindowTimeSubscriber<N, F, D>;
}

interface CloseWindowContext<N, F, D> {
  action: qt.Action<CreationState<N, F, D>>;
  subscription: Subscription;
}

interface CloseState<N, F, D> {
  subscriber: WindowTimeSubscriber<N, F, D>;
  window: CountedSubject<N, F, D>;
  context: CloseWindowContext<N, F, D>;
}

class CountedSubject<N, F, D> extends Subject<N, F, D> {
  private _numberOfNextedValues: number = 0;

  next(value: N): void {
    this._numberOfNextedValues++;
    super.next(value);
  }

  get numberOfNextedValues(): number {
    return this._numberOfNextedValues;
  }
}

class WindowTimeSubscriber<N, F, D> extends Subscriber<N, F, D> {
  private windows: CountedSubject<N, F, D>[] = [];

  constructor(
    protected tgt: Subscriber<Observable<N, F, D>>,
    windowTimeSpan: number,
    windowCreationInterval: number | null,
    private maxWindowSize: number,
    scheduler: qt.Scheduler
  ) {
    super(tgt);

    const window = this.openWindow();
    if (windowCreationInterval !== null && windowCreationInterval >= 0) {
      const closeState: CloseState<N, F, D> = {
        subscriber: this,
        window,
        context: null!
      };
      const creationState: CreationState<N, F, D> = {
        windowTimeSpan,
        windowCreationInterval,
        subscriber: this,
        scheduler
      };
      this.add(
        scheduler.schedule<CloseState<N, F, D>>(
          dispatchWindowClose as any,
          windowTimeSpan,
          closeState
        )
      );
      this.add(
        scheduler.schedule<CreationState<N, F, D>>(
          dispatchWindowCreation as any,
          windowCreationInterval,
          creationState
        )
      );
    } else {
      const timeSpanOnlyState: TimeSpanOnlyState<N, F, D> = {
        subscriber: this,
        window,
        windowTimeSpan
      };
      this.add(
        scheduler.schedule<TimeSpanOnlyState<N, F, D>>(
          dispatchWindowTimeSpanOnly as any,
          windowTimeSpan,
          timeSpanOnlyState
        )
      );
    }
  }

  protected _next(v: N) {
    const windows =
      this.maxWindowSize < Number.POSITIVE_INFINITY
        ? this.windows.slice()
        : this.windows;
    const len = windows.length;
    for (let i = 0; i < len; i++) {
      const window = windows[i];
      if (!window.closed) {
        window.next(value);
        if (this.maxWindowSize <= window.numberOfNextedValues) {
          this.closeWindow(window);
        }
      }
    }
  }

  protected _fail(f?: F) {
    const windows = this.windows;
    while (windows.length > 0) {
      windows.shift()!.error(err);
    }
    this.tgt.error(err);
  }

  protected _done(d?: D) {
    const windows = this.windows;
    while (windows.length > 0) {
      windows.shift()!.complete();
    }
    this.tgt.complete();
  }

  public openWindow(): CountedSubject<N, F, D> {
    const window = new CountedSubject<N, F, D>();
    this.windows.push(window);
    const tgt = this.tgt;
    tgt.next(window);
    return window;
  }

  public closeWindow(window: CountedSubject<N, F, D>): void {
    const index = this.windows.indexOf(window);
    if (index >= 0) {
      window.complete();
      this.windows.splice(index, 1);
    }
  }
}

function dispatchWindowTimeSpanOnly<N, F, D>(
  this: qt.Action<TimeSpanOnlyState<N, F, D>>,
  state: TimeSpanOnlyState<N, F, D>
): void {
  const {subscriber, windowTimeSpan, window} = state;
  if (window) {
    subscriber.closeWindow(window);
  }
  state.window = subscriber.openWindow();
  this.schedule(state, windowTimeSpan);
}

function dispatchWindowCreation<N, F, D>(
  this: qt.Action<CreationState<N, F, D>>,
  state: CreationState<N, F, D>
): void {
  const {windowTimeSpan, subscriber, scheduler, windowCreationInterval} = state;
  const window = subscriber.openWindow();
  const action = this;
  let context: CloseWindowContext<N, F, D> = {action, subscription: null!};
  const timeSpanState: CloseState<N, F, D> = {subscriber, window, context};
  context.subscription = scheduler.schedule<CloseState<N, F, D>>(
    dispatchWindowClose as any,
    windowTimeSpan,
    timeSpanState
  );
  action.add(context.subscription);
  action.schedule(state, windowCreationInterval);
}

function dispatchWindowClose<N, F, D>(
  this: qt.Action<CloseState<N, F, D>>,
  state: CloseState<N, F, D>
): void {
  const {subscriber, window, context} = state;
  if (context && context.action && context.subscription) {
    context.action.remove(context.subscription);
  }
  subscriber.closeWindow(window);
}

export function windowToggle<T, O>(
  openings: qt.Source<O>,
  closingSelector: (openValue: O) => qt.Source<any, F, D>
): Lifter<T, qt.Source<N, F, D>> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new WindowToggleOperator<T, O>(openings, closingSelector));
}

class WindowToggleOperator<T, O> implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(
    private openings: qt.Source<O>,
    private closingSelector: (openValue: O) => qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowToggleSubscriber(
        subscriber,
        this.openings,
        this.closingSelector
      )
    );
  }
}

interface WindowContext<N, F, D> {
  window: Subject<N, F, D>;
  subscription: Subscription;
}

class WindowToggleSubscriber<T, O> extends Reactor<T, any> {
  private contexts: WindowContext<N, F, D>[] = [];
  private openSubscription?: Subscription;

  constructor(
    tgt: Subscriber<Observable<N, F, D>>,
    private openings: qt.Source<O>,
    private closingSelector: (openValue: O) => qt.Source<any, F, D>
  ) {
    super(tgt);
    this.add(
      (this.openSubscription = subscribeToResult(
        this,
        openings,
        openings as any
      ))
    );
  }

  protected _next(n?: N) {
    const {contexts} = this;
    if (contexts) {
      const len = contexts.length;
      for (let i = 0; i < len; i++) {
        contexts[i].window.next(value);
      }
    }
  }

  protected _fail(f?: F) {
    const {contexts} = this;
    this.contexts = null!;

    if (contexts) {
      const len = contexts.length;
      let index = -1;

      while (++index < len) {
        const context = contexts[index];
        context.window.error(err);
        context.subscription.unsubscribe();
      }
    }

    super._fail(err);
  }

  protected _done(d?: D) {
    const {contexts} = this;
    this.contexts = null!;
    if (contexts) {
      const len = contexts.length;
      let index = -1;
      while (++index < len) {
        const context = contexts[index];
        context.window.complete();
        context.subscription.unsubscribe();
      }
    }
    super._done();
  }

  _unsubscribe() {
    const {contexts} = this;
    this.contexts = null!;
    if (contexts) {
      const len = contexts.length;
      let index = -1;
      while (++index < len) {
        const context = contexts[index];
        context.window.unsubscribe();
        context.subscription.unsubscribe();
      }
    }
  }

  reactNext(
    outerN: any,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, any, F, D>
  ): void {
    if (outerN === this.openings) {
      let closingNotifier;
      try {
        const {closingSelector} = this;
        closingNotifier = closingSelector(innerValue);
      } catch (e) {
        return this.error(e);
      }

      const window = new Subject<N, F, D>();
      const subscription = new Subscription();
      const context = {window, subscription};
      this.contexts.push(context);
      const innerSubscription = subscribeToResult(
        this,
        closingNotifier,
        context as any
      );

      if (innerSubscription!.closed) {
        this.closeWindow(this.contexts.length - 1);
      } else {
        (<any>innerSubscription).context = context;
        subscription.add(innerSubscription);
      }

      this.tgt.next(window);
    } else {
      this.closeWindow(this.contexts.indexOf(outerN));
    }
  }

  reactFail(f?: F) {
    this.error(err);
  }

  reactDone(inner: Subscription): void {
    if (inner !== this.openSubscription) {
      this.closeWindow(this.contexts.indexOf((<any>inner).context));
    }
  }

  private closeWindow(index: number): void {
    if (index === -1) return;
    const {contexts} = this;
    const context = contexts[index];
    const {window, subscription} = context;
    contexts.splice(index, 1);
    window.complete();
    subscription.unsubscribe();
  }
}

export function windowWhen<N, F, D>(
  closingSelector: () => qt.Source<any, F, D>
): Lifter<T, qt.Source<N, F, D>> {
  return function windowWhenLifter(source: qt.Source<N, F, D>) {
    return source.lift(new WindowOperator<N, F, D>(closingSelector));
  };
}

class WindowOperator<N, F, D> implements qt.Operator<T, qt.Source<N, F, D>> {
  constructor(private closingSelector: () => qt.Source<any, F, D>) {}

  call(subscriber: Subscriber<Observable<N, F, D>>, source: any): any {
    return source.subscribe(
      new WindowSubscriber(subscriber, this.closingSelector)
    );
  }
}

class WindowSubscriber<N, F, D> extends Reactor<T, any> {
  private window: Subject<N, F, D> | undefined;
  private closingNotification?: Subscription;

  constructor(
    protected tgt: Subscriber<Observable<N, F, D>>,
    private closingSelector: () => qt.Source<any, F, D>
  ) {
    super(tgt);
    this.openWindow();
  }

  reactNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, any, F, D>
  ): void {
    this.openWindow(innerSub);
  }

  notifyError(error: any, innerSub: Actor<N, any, F, D>): void {
    this._fail(error);
  }

  reactDone(innerSub: Actor<N, any, F, D>): void {
    this.openWindow(innerSub);
  }

  protected _next(v: N) {
    this.window!.next(value);
  }

  protected _fail(f?: F) {
    this.window!.error(e);
    this.tgt.error(e);
    this.unsubscribeClosingNotification();
  }

  protected _done(d?: D) {
    this.window!.complete();
    this.tgt.complete();
    this.unsubscribeClosingNotification();
  }

  private unsubscribeClosingNotification(): void {
    if (this.closingNotification) {
      this.closingNotification.unsubscribe();
    }
  }

  private openWindow(innerSub: Actor<N, any, F, D> | null = null): void {
    if (innerSub) {
      this.remove(innerSub);
      innerSub.unsubscribe();
    }

    const prevWindow = this.window;
    if (prevWindow) {
      prevWindow.complete();
    }

    const window = (this.window = new Subject<N, F, D>());
    this.tgt.next(window);

    let closingNotifier;
    try {
      const {closingSelector} = this;
      closingNotifier = closingSelector();
    } catch (e) {
      this.tgt.error(e);
      this.window.error(e);
      return;
    }
    this.add(
      (this.closingNotification = subscribeToResult(this, closingNotifier))
    );
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
    return source.lift(new WithLatestFromOperator(observables, project));
  };
}

class WithLatestFromOperator<T, R> implements qt.Operator<T, R> {
  constructor(
    private observables: qt.Source<any, F, D>[],
    private project?: (...values: any[]) => qt.Source<R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new WithLatestFromSubscriber(subscriber, this.observables, this.project)
    );
  }
}

class WithLatestFromSubscriber<T, R> extends Reactor<N, M, F, D> {
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
