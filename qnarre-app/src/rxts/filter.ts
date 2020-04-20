import * as qt from './types';
import * as qu from './utils';
import * as qr from './opers';
import * as qj from './subject';

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

export function debounce<N, F, D>(
  durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DebounceO(durationSelector));
}

class DebounceO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new DebounceR(subscriber, this.durationSelector));
  }
}

export class DebounceR<O, I, F, D> extends Reactor<O, I, F, D> {
  private value?: N;
  private hasValue = false;
  private durationSubscription?: Subscription;

  constructor(
    tgt: Subscriber<M, F, D>,
    private durationSelector: (value: N) => qt.SourceOrPromise<any, F, D>
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    try {
      const result = this.durationSelector.call(this, n);
      if (result) this._tryNext(value, result);
    } catch (e) {
      this.tgt.fail(e);
    }
  }

  protected _done(d?: D) {
    this.emitValue();
    this.tgt.done();
  }

  private _tryNext(value: N, duration: qt.SourceOrPromise<any, F, D>) {
    let s = this.durationSubscription;
    this.value = value;
    this.hasValue = true;
    if (s) {
      s.unsubscribe();
      this.remove(s);
    }
    s = qu.subscribeToResult(this, duration);
    if (s && !s.closed) this.add((this.durationSubscription = s));
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<O, I, F, D>
  ) {
    this.emitValue();
  }

  reactDone() {
    this.emitValue();
  }

  emitValue() {
    if (this.hasValue) {
      const value = this.value;
      const s = this.durationSubscription;
      if (s) {
        this.durationSubscription = undefined;
        s.unsubscribe();
        this.remove(s);
      }
      this.value = undefined;
      this.hasValue = false;
      super._next(value!);
    }
  }
}

export function debounceTime<N, F, D>(
  dueTime: number,
  scheduler: qt.Scheduler = async
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DebounceTimeO(dueTime, scheduler));
}

class DebounceTimeO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private dueTime: number, private scheduler: qt.Scheduler) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DebounceTimeR(subscriber, this.dueTime, this.scheduler)
    );
  }
}

export class DebounceTimeR<N, F, D> extends Subscriber<N, F, D> {
  private debouncedSubscription?: Subscription;
  private lastValue?: N;
  private hasValue = false;

  constructor(
    tgt: Subscriber<N, F, D>,
    private dueTime: number,
    private scheduler: qt.Scheduler
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    this.clearDebounce();
    this.lastValue = value;
    this.hasValue = true;
    this.add(
      (this.debouncedSubscription = this.scheduler.schedule(
        dispatchNext as any,
        this.dueTime,
        this
      ))
    );
  }

  protected _done(d?: D) {
    this.debouncedNext();
    this.tgt.done();
  }

  debouncedNext(): void {
    this.clearDebounce();
    if (this.hasValue) {
      const {lastValue} = this;
      this.lastValue = undefined;
      this.hasValue = false;
      this.tgt.next(lastValue);
    }
  }

  private clearDebounce(): void {
    const s = this.debouncedSubscription;
    if (s) {
      this.remove(s);
      s.unsubscribe();
      this.debouncedSubscription = undefined;
    }
  }
}

function dispatchNext(subscriber: DebounceTimeR<any>) {
  subscriber.debouncedNext();
}

export function distinct<T, K>(
  keySelector?: (value: N) => K,
  flushes?: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DistinctO(keySelector, flushes));
}

class DistinctO<T, K> implements qt.Operator<N, N, F, D> {
  constructor(
    private keySelector?: (value: N) => K,
    private flushes?: qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DistinctR(subscriber, this.keySelector, this.flushes)
    );
  }
}

export class DistinctR<N, M, F, D> extends Reactor<N, N, F, D> {
  private values = new Set<M>();

  constructor(
    tgt: Subscriber<N, F, D>,
    private keySelector?: (value: N) => K,
    flushes?: qt.Source<any, F, D>
  ) {
    super(tgt);
    if (flushes) this.add(subscribeToResult(this, flushes));
  }

  reactNext(
    outerN: N,
    innerValue: N,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, N, F, D>
  ) {
    this.values.clear();
  }

  reactFail(f: F | undefined, _: Actor<N, N, F, D>) {
    this._fail(f);
  }

  protected _next(n?: N) {
    if (this.keySelector) this._useKeySelector(n);
    else this._finalizeNext(n, n);
  }

  private _useKeySelector(value: N) {
    let key: M;
    const {tgt} = this;
    try {
      key = this.keySelector!(value);
    } catch (e) {
      tgt.fail(e);
      return;
    }
    this._finalizeNext(key, value);
  }

  private _finalizeNext(key: N | M, value: N) {
    const {values} = this;
    if (!values.has(<M>key)) {
      values.add(<M>key);
      this.tgt.next(value);
    }
  }
}

export function distinctUntilChanged<N, F, D>(
  compare?: (x: T, y: N) => boolean
): qt.MonoOper<N, F, D>;
export function distinctUntilChanged<T, K>(
  compare?: (x: K, y: K) => boolean,
  keySelector?: (x: N) => K
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new DistinctUntilChangedO<T, K>(compare, keySelector));
}

class DistinctUntilChangedO<T, K> implements qt.Operator<N, N, F, D> {
  constructor(
    private compare?: (x: K, y: K) => boolean,
    private keySelector?: (x: N) => K
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new DistinctUntilChangedR(subscriber, this.compare, this.keySelector)
    );
  }
}

export class DistinctUntilChangedR<T, K> extends Subscriber<N, F, D> {
  private key: K | undefined;
  private hasKey = false;

  constructor(
    tgt: Subscriber<N, F, D>,
    compare?: (x: K, y: K) => boolean,
    private keySelector?: (x: N) => K
  ) {
    super(tgt);
    if (typeof compare === 'function') this.compare = compare;
  }

  private compare(x: any, y: any) {
    return x === y;
  }

  protected _next(n?: N) {
    let key: any;
    try {
      const {keySelector} = this;
      key = keySelector ? keySelector(value) : value;
    } catch (e) {
      return this.tgt.fail(e);
    }
    let result = false;
    if (this.hasKey) {
      try {
        const {compare} = this;
        result = compare(this.key, key);
      } catch (e) {
        return this.tgt.fail(e);
      }
    } else this.hasKey = true;
    if (!result) {
      this.key = key;
      this.tgt.next(value);
    }
  }
}

export function distinctUntilKeyChanged<N, F, D>(
  key: keyof T
): qt.MonoOper<N, F, D>;
export function distinctUntilKeyChanged<T, K extends keyof T>(
  key: K,
  compare: (x: T[K], y: T[K]) => boolean
): qt.MonoOper<N, F, D>;
export function distinctUntilKeyChanged<T, K extends keyof T>(
  key: K,
  compare?: (x: T[K], y: T[K]) => boolean
): qt.MonoOper<N, F, D> {
  return distinctUntilChanged((x: T, y: N) =>
    compare ? compare(x[key], y[key]) : x[key] === y[key]
  );
}

export function elementAt<N, F, D>(
  index: number,
  defaultValue?: N
): qt.MonoOper<N, F, D> {
  if (index < 0) {
    throw new OutOfRangeError();
  }
  const hasDefaultValue = arguments.length >= 2;
  return (source: qt.Source<N, F, D>) =>
    source.pipe(
      filter((v, i) => i === index),
      take(1),
      hasDefaultValue
        ? defaultIfEmpty(defaultValue)
        : throwIfEmpty(() => new OutOfRangeError())
    );
}

export function filter<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
  thisArg?: any
): Lifter<T, S>;
export function filter<N, F, D>(
  predicate: BooleanConstructor
): Lifter<T | null | undefined, NonNullable<N, F, D>>;
export function filter<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): qt.MonoOper<N, F, D>;
export function filter<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): qt.MonoOper<N, F, D> {
  return function filterLifter(source: qt.Source<N, F, D>): qt.Source<N, F, D> {
    return source.lift(new FilterO(predicate, thisArg));
  };
}

class FilterO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private predicate: (value: T, index: number) => boolean,
    private thisArg?: any
  ) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new FilterR(subscriber, this.predicate, this.thisArg)
    );
  }
}

export class FilterR<N, F, D> extends Subscriber<N, F, D> {
  count = 0;

  constructor(
    tgt: Subscriber<N, F, D>,
    private predicate: (value: N, index: number) => boolean,
    private thisArg: any
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    let result: any;
    try {
      result = this.predicate.call(this.thisArg, n, this.count++);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    if (result) this.tgt.next(n);
  }
}

export function first<T, D = T>(
  predicate?: null,
  defaultValue?: D
): Lifter<T, T | D>;
export function first<T, S extends T>(
  predicate: (
    value: T,
    index: number,
    source: qt.Source<N, F, D>
  ) => value is S,
  defaultValue?: S
): Lifter<T, S>;
export function first<T, D = T>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  defaultValue?: D
): Lifter<T, T | D>;
export function first<T, D>(
  predicate?:
    | ((value: T, index: number, source: qt.Source<N, F, D>) => boolean)
    | null,
  defaultValue?: D
): Lifter<T, T | D> {
  const hasDefaultValue = arguments.length >= 2;
  return (source: qt.Source<N, F, D>) =>
    source.pipe(
      predicate ? filter((v, i) => predicate(v, i, source)) : identity,
      take(1),
      hasDefaultValue
        ? defaultIfEmpty<T, D>(defaultValue)
        : throwIfEmpty(() => new EmptyError())
    );
}

export function ignoreElements(): Lifter<any, never> {
  return function ignoreElementsLifter(source: qt.Source<any, F, D>) {
    return source.lift(new IgnoreElementsO());
  };
}

class IgnoreElementsO<T, R> implements qt.Operator<T, R> {
  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new IgnoreElementsR(subscriber));
  }
}

class IgnoreElementsR<T> extends Subscriber<T> {
  protected _next(unused: T): void {}
}

export function last<T, D = T>(
  predicate?: null,
  defaultValue?: D
): Lifter<T, T | D>;
export function last<T, S extends T>(
  predicate: (
    value: T,
    index: number,
    source: qt.Source<N, F, D>
  ) => value is S,
  defaultValue?: S
): Lifter<T, S>;
export function last<T, D = T>(
  predicate: (value: T, index: number, source: qt.Source<N, F, D>) => boolean,
  defaultValue?: D
): Lifter<T, T | D>;
export function last<T, D>(
  predicate?:
    | ((value: T, index: number, source: qt.Source<N, F, D>) => boolean)
    | null,
  defaultValue?: D
): Lifter<T, T | D> {
  const hasDefaultValue = arguments.length >= 2;
  return (source: qt.Source<N, F, D>) =>
    source.pipe(
      predicate ? filter((v, i) => predicate(v, i, source)) : identity,
      takeLast(1),
      hasDefaultValue
        ? defaultIfEmpty<T, D>(defaultValue)
        : throwIfEmpty(() => new EmptyError())
    );
}

export function sample<N, F, D>(
  notifier: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new SampleO(notifier));
}

class SampleO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private notifier: qt.Source<any, F, D>) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    const sampleSubscriber = new SampleR(subscriber);
    const subscription = source.subscribe(sampleSubscriber);
    subscription.add(subscribeToResult(sampleSubscriber, this.notifier));
    return subscription;
  }
}

class SampleR<T, R> extends Reactor<N, M, F, D> {
  private value: T | undefined;
  private hasValue = false;

  protected _next(n?: N) {
    this.value = value;
    this.hasValue = true;
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    this.emitValue();
  }

  reactDone(): void {
    this.emitValue();
  }

  emitValue() {
    if (this.hasValue) {
      this.hasValue = false;
      this.tgt.next(this.value);
    }
  }
}

export function sampleTime<N, F, D>(
  period: number,
  scheduler: qt.Scheduler = async
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new SampleTimeO(period, scheduler));
}

class SampleTimeO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private period: number, private scheduler: qt.Scheduler) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new SampleTimeR(subscriber, this.period, this.scheduler)
    );
  }
}

export class SampleTimeR<N, F, D> extends Subscriber<N, F, D> {
  lastValue?: N;
  hasValue = false;

  constructor(
    tgt: Subscriber<N, F, D>,
    private period: number,
    private scheduler: qt.Scheduler
  ) {
    super(tgt);
    this.add(
      scheduler.schedule(dispatchNotification, period, {
        subscriber: this,
        period
      })
    );
  }

  protected _next(n?: N) {
    this.lastValue = n;
    this.hasValue = true;
  }

  reactNext() {
    if (this.hasValue) {
      this.hasValue = false;
      this.tgt.next(this.lastValue);
    }
  }
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

export function skip<N, F, D>(count: number): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new SkipO(count));
}

class SkipO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private total: number) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new SkipR(subscriber, this.total));
  }
}

class SkipR<N, F, D> extends Subscriber<N, F, D> {
  count: number = 0;

  constructor(tgt: Subscriber<N, F, D>, private total: number) {
    super(tgt);
  }
  protected _next(x: N) {
    if (++this.count > this.total) {
      this.tgt.next(x);
    }
  }
}

export function skipLast<N, F, D>(count: number): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new SkipLastO(count));
}

class SkipLastO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private _skipCount: number) {
    if (this._skipCount < 0) {
      throw new OutOfRangeError();
    }
  }
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    if (this._skipCount === 0) {
      return source.subscribe(new Subscriber(subscriber));
    } else {
      return source.subscribe(new SkipLastR(subscriber, this._skipCount));
    }
  }
}

export class SkipLastR<N, F, D> extends Subscriber<N, F, D> {
  private _ring: (N | undefined)[];
  private _count = 0;

  constructor(tgt: Subscriber<N, F, D>, private _skipCount: number) {
    super(tgt);
    this._ring = new Array<N | undefined>(_skipCount);
  }

  protected _next(n?: N) {
    const skipCount = this._skipCount;
    const count = this._count++;
    if (count < skipCount) this._ring[count] = n;
    else {
      const currentIndex = count % skipCount;
      const ring = this._ring;
      const oldValue = ring[currentIndex];
      ring[currentIndex] = n;
      this.tgt.next(oldValue);
    }
  }
}

export function skipUntil<N, F, D>(
  notifier: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new SkipUntilO(notifier));
}

class SkipUntilO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private notifier: qt.Source<any, F, D>) {}

  call(tgt: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new SkipUntilR(tgt, this.notifier));
  }
}

export class SkipUntilR<N, M, F, D> extends Reactor<N, M, F, D> {
  private hasValue = false;
  private innerSubscription?: Subscription;

  constructor(tgt: Subscriber<M, F, D>, notifier: SourceInput<any>) {
    super(tgt);
    const innerSubscriber = new Actor(this, undefined, undefined!);
    this.add(innerSubscriber);
    this.innerSubscription = innerSubscriber;
    const innerSubscription = qu.subscribeToResult(
      this,
      notifier,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      this.add(innerSubscription);
      this.innerSubscription = innerSubscription;
    }
  }

  protected _next(n?: N) {
    if (this.hasValue) super._next(n);
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ) {
    this.hasValue = true;
    if (this.innerSubscription) this.innerSubscription.unsubscribe();
  }

  reactDone() {
    /* do nothing */
  }
}

export function skipWhile<N, F, D>(
  predicate: (value: T, index: number) => boolean
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new SkipWhileO(predicate));
}

class SkipWhileO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private predicate: (value: T, index: number) => boolean) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new SkipWhileR(subscriber, this.predicate));
  }
}

export class SkipWhileR<N, F, D> extends Subscriber<N, F, D> {
  private skipping = true;
  private index = 0;

  constructor(
    tgt: Subscriber<N, F, D>,
    private predicate: (n: N | undefined, i: number) => boolean
  ) {
    super(tgt);
  }
  protected _next(n?: N) {
    const tgt = this.tgt;
    if (this.skipping) this.tryCallPredicate(n);
    if (!this.skipping) tgt.next(n);
  }

  private tryCallPredicate(value: N) {
    try {
      const result = this.predicate(value, this.index++);
      this.skipping = Boolean(result);
    } catch (err) {
      this.tgt.fail(err);
    }
  }
}

export function take<N, F, D>(count: number): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    if (count === 0) {
      return EMPTY;
    } else {
      return source.lift(new TakeO(count));
    }
  };
}

class TakeO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private total: number) {
    if (this.total < 0) {
      throw new OutOfRangeError();
    }
  }

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new TakeR(subscriber, this.total));
  }
}

export class TakeR<N, F, D> extends Subscriber<N, F, D> {
  private count = 0;

  constructor(tgt: Subscriber<N, F, D>, private total: number) {
    super(tgt);
  }

  protected _next(n?: N) {
    const total = this.total;
    const count = ++this.count;
    if (count <= total) {
      this.tgt.next(n);
      if (count === total) {
        this.tgt.done(d);
        this.unsubscribe();
      }
    }
  }
}

export function takeLast<N, F, D>(count: number): qt.MonoOper<N, F, D> {
  return function takeLastLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<N, F, D> {
    if (count === 0) {
      return EMPTY;
    } else {
      return source.lift(new TakeLastO(count));
    }
  };
}

class TakeLastO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private total: number) {
    if (this.total < 0) {
      throw new OutOfRangeError();
    }
  }
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new TakeLastR(subscriber, this.total));
  }
}

export class TakeLastR<N, F, D> extends Subscriber<N, F, D> {
  private ring = [] as N[];
  private count = 0;

  constructor(tgt: Subscriber<N, F, D>, private total: number) {
    super(tgt);
  }

  protected _next(n?: N) {
    const ring = this.ring;
    const total = this.total;
    const count = this.count++;

    if (ring.length < total) {
      ring.push(v);
    } else {
      const index = count % total;
      ring[index] = v;
    }
  }

  protected _done(d?: D) {
    const tgt = this.tgt;
    let count = this.count;
    if (count > 0) {
      const total = this.count >= this.total ? this.total : this.count;
      const ring = this.ring;
      for (let i = 0; i < total; i++) {
        const idx = count++ % total;
        tgt.next(ring[idx]);
      }
    }
    tgt.done();
  }
}

export function takeUntil<N, F, D>(
  notifier: qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new TakeUntilO(notifier));
}

class TakeUntilO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private notifier: qt.Source<any, F, D>) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    const takeUntilSubscriber = new TakeUntilR(subscriber);
    const notifierSubscription = subscribeToResult(
      takeUntilSubscriber,
      this.notifier
    );
    if (notifierSubscription && !takeUntilSubscriber.seenValue) {
      takeUntilSubscriber.add(notifierSubscription);
      return source.subscribe(takeUntilSubscriber);
    }
    return takeUntilSubscriber;
  }
}

export class TakeUntilR<N, M, F, D> extends Reactor<N, M, F, D> {
  seenValue = false;

  constructor(tgt: Subscriber<any, F, D>) {
    super(tgt);
  }

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.seenValue = true;
    this.done();
  }

  reactDone() {}
}

export function takeWhile<T, S extends T>(
  predicate: (value: T, index: number) => value is S
): Lifter<T, S>;
export function takeWhile<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
  inclusive: false
): Lifter<T, S>;
export function takeWhile<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  inclusive?: boolean
): qt.MonoOper<N, F, D>;
export function takeWhile<N, F, D>(
  predicate: (value: T, index: number) => boolean,
  inclusive = false
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new TakeWhileO(predicate, inclusive));
}

class TakeWhileO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private predicate: (value: T, index: number) => boolean,
    private inclusive: boolean
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new TakeWhileR(subscriber, this.predicate, this.inclusive)
    );
  }
}

export class TakeWhileR<N, F, D> extends Subscriber<N, F, D> {
  private index = 0;

  constructor(
    tgt: Subscriber<N, F, D>,
    private predicate: (n: N | undefined, i: number) => boolean,
    private inclusive: boolean
  ) {
    super(tgt);
  }

  protected _next(n?: N) {
    const tgt = this.tgt;
    let result: boolean;
    try {
      result = this.predicate(n, this.index++);
    } catch (e) {
      tgt.fail(e);
      return;
    }
    this.nextOrComplete(n, result);
  }

  private nextOrComplete(n?: N, predicateResult: boolean) {
    const tgt = this.tgt;
    if (Boolean(predicateResult)) tgt.next(n);
    else {
      if (this.inclusive) tgt.next(n);
      tgt.done();
    }
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

export class ThrottleTimeR<N, F, D> extends Subscriber<N, F, D> {
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
  subscriber: ThrottleTimeR<N, F, D>;
}
