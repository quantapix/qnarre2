import {Operator} from './Operator';
import {Subscriber} from './Subscriber';
import {Observable} from './observe';
import {Subscription} from './subscribe';
import {MonoOper, SubscribableOrPromise, Closer} from './types';
import {InnerSubscriber} from './InnerSubscriber';
import {OperFun} from './types';
import {OuterSubscriber} from './OuterSubscriber';
import {subscribeToResult} from './utils';
import {async} from './schedule';
import {timer} from './observe';
import {SchedulerAction, SchedulerLike} from './types';
import {isScheduler} from './utils';
import {ObservableInput, ObservedValueOf} from './types';
import {CombineLatestOperator} from './observe';
import {isArray} from './utils';
import {from} from './observe';
import {ObservedUnionFrom, ObservedTupleFrom, Unshift} from './types';
import {concat as concatStatic} from './observe';
import {Observer} from './types';
import {isDate} from './utils';
import {Notification} from './Notification';
import {Target} from './types';
import {OutOfRangeError} from './utils';
import {of} from './observe';
import {ValueFromArray} from './types';
import {EmptyError} from './utils';
import {identity} from './utils';
import {Subject} from './Subject';
import {merge as mergeStatic} from './observe';
import {Connectable, connectableObservableDescriptor} from './observe';
import {UnaryFun} from './types';
import {not} from './utils';
import {BehaviorSubject} from './BehaviorSubject';
import {AsyncSubject} from './AsyncSubject';
import {ReplaySubject} from './ReplaySubject';
import {race as raceStatic} from './observe';
import {pipe} from './utils';
import {EMPTY} from './observe';
import {SubscribeOnObservable} from './observe';
import {noop} from './utils';
import {isFunction} from './utils';
import {defer} from './observe';
import {TimeoutError} from './utils';
import {throwError} from './observe';
import {
  Timestamp as TimestampInterface,
  TimestampProvider,
  Timestamp
} from './types';
import {isNumeric} from './utils';
import {ZipOperator} from './observe';
import {zip as zipStatic} from './observe';

export function audit<T>(
  durationSelector: (value: T) => SubscribableOrPromise<any>
): MonoOper<T> {
  return function auditOperFun(source: Observable<T>) {
    return source.lift(new AuditOperator(durationSelector));
  };
}

class AuditOperator<T> implements Operator<T, T> {
  constructor(
    private durationSelector: (value: T) => SubscribableOrPromise<any>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new AuditSubscriber<T, T>(subscriber, this.durationSelector)
    );
  }
}

class AuditSubscriber<T, R> extends OuterSubscriber<T, R> {
  private value: T | null = null;
  private hasValue: boolean = false;
  private throttled: Subscription | null = null;

  constructor(
    destination: Subscriber<T>,
    private durationSelector: (value: T) => SubscribableOrPromise<any>
  ) {
    super(destination);
  }

  protected _next(v: T) {
    this.value = v;
    this.hasValue = true;
    if (!this.throttled) {
      let duration;
      try {
        const {durationSelector} = this;
        duration = durationSelector(v);
      } catch (err) {
        return this.dst.error(err);
      }
      const innerSubscription = subscribeToResult(this, duration);
      if (!innerSubscription || innerSubscription.closed) {
        this.clearThrottle();
      } else {
        this.add((this.throttled = innerSubscription));
      }
    }
  }

  clearThrottle() {
    const {value, hasValue, throttled} = this;
    if (throttled) {
      this.remove(throttled);
      this.throttled = null;
      throttled.unsubscribe();
    }
    if (hasValue) {
      this.value = null;
      this.hasValue = false;
      this.dst.next(value);
    }
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number
  ): void {
    this.clearThrottle();
  }

  notifyComplete(): void {
    this.clearThrottle();
  }
}

export function auditTime<T>(
  duration: number,
  scheduler: SchedulerLike = async
): MonoOper<T> {
  return audit(() => timer(duration, scheduler));
}

export function buffer<T>(closingNotifier: Observable<any>): OperFun<T, T[]> {
  return function bufferOperFun(source: Observable<T>) {
    return source.lift(new BufferOperator<T>(closingNotifier));
  };
}

class BufferOperator<T> implements Operator<T, T[]> {
  constructor(private closingNotifier: Observable<any>) {}

  call(subscriber: Subscriber<T[]>, source: any): any {
    return source.subscribe(
      new BufferSubscriber(subscriber, this.closingNotifier)
    );
  }
}

class BufferSubscriber<T> extends OuterSubscriber<T, any> {
  private buffer: T[] = [];

  constructor(destination: Subscriber<T[]>, closingNotifier: Observable<any>) {
    super(destination);
    this.add(subscribeToResult(this, closingNotifier));
  }

  protected _next(value: T) {
    this.buffer.push(value);
  }

  notifyNext(
    outerValue: T,
    innerValue: any,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, any>
  ): void {
    const buffer = this.buffer;
    this.buffer = [];
    this.dst.next(buffer);
  }
}

export function bufferCount<T>(
  bufferSize: number,
  startBufferEvery: number | null = null
): OperFun<T, T[]> {
  return function bufferCountOperFun(source: Observable<T>) {
    return source.lift(
      new BufferCountOperator<T>(bufferSize, startBufferEvery)
    );
  };
}

class BufferCountOperator<T> implements Operator<T, T[]> {
  private subscriberClass: any;

  constructor(
    private bufferSize: number,
    private startBufferEvery: number | null
  ) {
    if (!startBufferEvery || bufferSize === startBufferEvery) {
      this.subscriberClass = BufferCountSubscriber;
    } else {
      this.subscriberClass = BufferSkipCountSubscriber;
    }
  }

  call(subscriber: Subscriber<T[]>, source: any): Closer {
    return source.subscribe(
      new this.subscriberClass(
        subscriber,
        this.bufferSize,
        this.startBufferEvery
      )
    );
  }
}

class BufferCountSubscriber<T> extends Subscriber<T> {
  private buffer: T[] = [];

  constructor(destination: Subscriber<T[]>, private bufferSize: number) {
    super(destination);
  }

  protected _next(v: T) {
    const buffer = this.buffer;

    buffer.push(value);

    if (buffer.length == this.bufferSize) {
      this.dst.next(buffer);
      this.buffer = [];
    }
  }

  protected _complete() {
    const buffer = this.buffer;
    if (buffer.length > 0) {
      this.dst.next(buffer);
    }
    super._complete();
  }
}

class BufferSkipCountSubscriber<T> extends Subscriber<T> {
  private buffers: Array<T[]> = [];
  private count: number = 0;

  constructor(
    destination: Subscriber<T[]>,
    private bufferSize: number,
    private startBufferEvery: number
  ) {
    super(destination);
  }

  protected _next(v: T) {
    const {bufferSize, startBufferEvery, buffers, count} = this;

    this.count++;
    if (count % startBufferEvery === 0) {
      buffers.push([]);
    }

    for (let i = buffers.length; i--; ) {
      const buffer = buffers[i];
      buffer.push(value);
      if (buffer.length === bufferSize) {
        buffers.splice(i, 1);
        this.dst.next(buffer);
      }
    }
  }

  protected _complete() {
    const {buffers, destination} = this;

    while (buffers.length > 0) {
      let buffer = buffers.shift()!;
      if (buffer.length > 0) {
        destination.next(buffer);
      }
    }
    super._complete();
  }
}

export function bufferTime<T>(
  bufferTimeSpan: number,
  scheduler?: SchedulerLike
): OperFun<T, T[]>;
export function bufferTime<T>(
  bufferTimeSpan: number,
  bufferCreationInterval: number | null | undefined,
  scheduler?: SchedulerLike
): OperFun<T, T[]>;
export function bufferTime<T>(
  bufferTimeSpan: number,
  bufferCreationInterval: number | null | undefined,
  maxBufferSize: number,
  scheduler?: SchedulerLike
): OperFun<T, T[]>;
export function bufferTime<T>(bufferTimeSpan: number): OperFun<T, T[]> {
  let length: number = arguments.length;

  let scheduler: SchedulerLike = async;
  if (isScheduler(arguments[arguments.length - 1])) {
    scheduler = arguments[arguments.length - 1];
    length--;
  }

  let bufferCreationInterval: number | null = null;
  if (length >= 2) {
    bufferCreationInterval = arguments[1];
  }

  let maxBufferSize: number = Number.POSITIVE_INFINITY;
  if (length >= 3) {
    maxBufferSize = arguments[2];
  }

  return function bufferTimeOperFun(source: Observable<T>) {
    return source.lift(
      new BufferTimeOperator<T>(
        bufferTimeSpan,
        bufferCreationInterval,
        maxBufferSize,
        scheduler
      )
    );
  };
}

class BufferTimeOperator<T> implements Operator<T, T[]> {
  constructor(
    private bufferTimeSpan: number,
    private bufferCreationInterval: number | null,
    private maxBufferSize: number,
    private scheduler: SchedulerLike
  ) {}

  call(subscriber: Subscriber<T[]>, source: any): any {
    return source.subscribe(
      new BufferTimeSubscriber(
        subscriber,
        this.bufferTimeSpan,
        this.bufferCreationInterval,
        this.maxBufferSize,
        this.scheduler
      )
    );
  }
}

class Context<T> {
  buffer: T[] = [];
  closeAction: Subscription | undefined;
}

interface DispatchCreateArg<T> {
  bufferTimeSpan: number;
  bufferCreationInterval: number | null;
  subscriber: BufferTimeSubscriber<T>;
  scheduler: SchedulerLike;
}

interface DispatchCloseArg<T> {
  subscriber: BufferTimeSubscriber<T>;
  context: Context<T>;
}

class BufferTimeSubscriber<T> extends Subscriber<T> {
  private contexts: Array<Context<T>> = [];
  private timespanOnly: boolean;

  constructor(
    destination: Subscriber<T[]>,
    private bufferTimeSpan: number,
    private bufferCreationInterval: number | null,
    private maxBufferSize: number,
    private scheduler: SchedulerLike
  ) {
    super(destination);
    const context = this.openContext();
    this.timespanOnly =
      bufferCreationInterval == null || bufferCreationInterval < 0;
    if (this.timespanOnly) {
      const timeSpanOnlyState = {subscriber: this, context, bufferTimeSpan};
      this.add(
        (context.closeAction = scheduler.schedule(
          dispatchBufferTimeSpanOnly,
          bufferTimeSpan,
          timeSpanOnlyState
        ))
      );
    } else {
      const closeState = {subscriber: this, context};
      const creationState: DispatchCreateArg<T> = {
        bufferTimeSpan,
        bufferCreationInterval,
        subscriber: this,
        scheduler
      };
      this.add(
        (context.closeAction = scheduler.schedule<DispatchCloseArg<T>>(
          dispatchBufferClose as any,
          bufferTimeSpan,
          closeState
        ))
      );
      this.add(
        scheduler.schedule<DispatchCreateArg<T>>(
          dispatchBufferCreation as any,
          bufferCreationInterval!,
          creationState
        )
      );
    }
  }

  protected _next(value: T) {
    const contexts = this.contexts;
    const len = contexts.length;
    let filledBufferContext: Context<T> | undefined;
    for (let i = 0; i < len; i++) {
      const context = contexts[i];
      const buffer = context.buffer;
      buffer.push(value);
      if (buffer.length == this.maxBufferSize) {
        filledBufferContext = context;
      }
    }

    if (filledBufferContext) {
      this.onBufferFull(filledBufferContext);
    }
  }

  protected _error(err: any) {
    this.contexts.length = 0;
    super._error(err);
  }

  protected _complete() {
    const {contexts, destination} = this;
    while (contexts.length > 0) {
      const context = contexts.shift()!;
      destination.next(context.buffer);
    }
    super._complete();
  }

  _unsubscribe() {
    this.contexts = null!;
  }

  protected onBufferFull(context: Context<T>) {
    this.closeContext(context);
    const closeAction = context.closeAction;
    closeAction!.unsubscribe();
    this.remove(closeAction!);

    if (!this.closed && this.timespanOnly) {
      context = this.openContext();
      const bufferTimeSpan = this.bufferTimeSpan;
      const timeSpanOnlyState = {subscriber: this, context, bufferTimeSpan};
      this.add(
        (context.closeAction = this.scheduler.schedule(
          dispatchBufferTimeSpanOnly,
          bufferTimeSpan,
          timeSpanOnlyState
        ))
      );
    }
  }

  openContext(): Context<T> {
    const context: Context<T> = new Context<T>();
    this.contexts.push(context);
    return context;
  }

  closeContext(context: Context<T>) {
    this.dst.next(context.buffer);
    const contexts = this.contexts;

    const spliceIndex = contexts ? contexts.indexOf(context) : -1;
    if (spliceIndex >= 0) {
      contexts.splice(contexts.indexOf(context), 1);
    }
  }
}

function dispatchBufferTimeSpanOnly(this: SchedulerAction<any>, state: any) {
  const subscriber: BufferTimeSubscriber<any> = state.subscriber;

  const prevContext = state.context;
  if (prevContext) {
    subscriber.closeContext(prevContext);
  }

  if (!subscriber.closed) {
    state.context = subscriber.openContext();
    state.context.closeAction = this.schedule(state, state.bufferTimeSpan);
  }
}

function dispatchBufferCreation<T>(
  this: SchedulerAction<DispatchCreateArg<T>>,
  state: DispatchCreateArg<T>
) {
  const {bufferCreationInterval, bufferTimeSpan, subscriber, scheduler} = state;
  const context = subscriber.openContext();
  const action = <SchedulerAction<DispatchCreateArg<T>>>this;
  if (!subscriber.closed) {
    subscriber.add(
      (context.closeAction = scheduler.schedule<DispatchCloseArg<T>>(
        dispatchBufferClose as any,
        bufferTimeSpan,
        {subscriber, context}
      ))
    );
    action.schedule(state, bufferCreationInterval!);
  }
}

function dispatchBufferClose<T>(arg: DispatchCloseArg<T>) {
  const {subscriber, context} = arg;
  subscriber.closeContext(context);
}

export function bufferToggle<T, O>(
  openings: SubscribableOrPromise<O>,
  closingSelector: (value: O) => SubscribableOrPromise<any>
): OperFun<T, T[]> {
  return function bufferToggleOperFun(source: Observable<T>) {
    return source.lift(
      new BufferToggleOperator<T, O>(openings, closingSelector)
    );
  };
}

class BufferToggleOperator<T, O> implements Operator<T, T[]> {
  constructor(
    private openings: SubscribableOrPromise<O>,
    private closingSelector: (value: O) => SubscribableOrPromise<any>
  ) {}

  call(subscriber: Subscriber<T[]>, source: any): any {
    return source.subscribe(
      new BufferToggleSubscriber(
        subscriber,
        this.openings,
        this.closingSelector
      )
    );
  }
}

interface BufferContext<T> {
  buffer: T[];
  subscription: Subscription;
}

class BufferToggleSubscriber<T, O> extends OuterSubscriber<T, O> {
  private contexts: Array<BufferContext<T>> = [];

  constructor(
    destination: Subscriber<T[]>,
    private openings: SubscribableOrPromise<O>,
    private closingSelector: (value: O) => SubscribableOrPromise<any> | void
  ) {
    super(destination);
    this.add(subscribeToResult(this, openings));
  }

  protected _next(v: T) {
    const contexts = this.contexts;
    const len = contexts.length;
    for (let i = 0; i < len; i++) {
      contexts[i].buffer.push(value);
    }
  }

  protected _error(e: any) {
    const contexts = this.contexts;
    while (contexts.length > 0) {
      const context = contexts.shift()!;
      context.subscription.unsubscribe();
      context.buffer = null!;
      context.subscription = null!;
    }
    this.contexts = null!;
    super._error(err);
  }

  protected _complete() {
    const contexts = this.contexts;
    while (contexts.length > 0) {
      const context = contexts.shift()!;
      this.dst.next(context.buffer);
      context.subscription.unsubscribe();
      context.buffer = null!;
      context.subscription = null!;
    }
    this.contexts = null!;
    super._complete();
  }

  notifyNext(
    outerValue: any,
    innerValue: O,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, O>
  ): void {
    outerValue ? this.closeBuffer(outerValue) : this.openBuffer(innerValue);
  }

  notifyComplete(innerSub: InnerSubscriber<T, O>): void {
    this.closeBuffer((<any>innerSub).context);
  }

  private openBuffer(value: O): void {
    try {
      const closingSelector = this.closingSelector;
      const closingNotifier = closingSelector.call(this, value);
      if (closingNotifier) {
        this.trySubscribe(closingNotifier);
      }
    } catch (err) {
      this._error(err);
    }
  }

  private closeBuffer(context: BufferContext<T>): void {
    const contexts = this.contexts;

    if (contexts && context) {
      const {buffer, subscription} = context;
      this.dst.next(buffer);
      contexts.splice(contexts.indexOf(context), 1);
      this.remove(subscription);
      subscription.unsubscribe();
    }
  }

  private trySubscribe(closingNotifier: any): void {
    const contexts = this.contexts;

    const buffer: Array<T> = [];
    const subscription = new Subscription();
    const context = {buffer, subscription};
    contexts.push(context);

    const innerSubscription = subscribeToResult(
      this,
      closingNotifier,
      <any>context
    );

    if (!innerSubscription || innerSubscription.closed) {
      this.closeBuffer(context);
    } else {
      (<any>innerSubscription).context = context;

      this.add(innerSubscription);
      subscription.add(innerSubscription);
    }
  }
}

export function bufferWhen<T>(
  closingSelector: () => Observable<any>
): OperFun<T, T[]> {
  return function (source: Observable<T>) {
    return source.lift(new BufferWhenOperator(closingSelector));
  };
}

class BufferWhenOperator<T> implements Operator<T, T[]> {
  constructor(private closingSelector: () => Observable<any>) {}

  call(subscriber: Subscriber<T[]>, source: any): any {
    return source.subscribe(
      new BufferWhenSubscriber(subscriber, this.closingSelector)
    );
  }
}

class BufferWhenSubscriber<T> extends OuterSubscriber<T, any> {
  private buffer: T[] | undefined;
  private subscribing: boolean = false;
  private closingSubscription: Subscription | undefined;

  constructor(
    destination: Subscriber<T[]>,
    private closingSelector: () => Observable<any>
  ) {
    super(destination);
    this.openBuffer();
  }

  protected _next(value: T) {
    this.buffer!.push(value);
  }

  protected _complete() {
    const buffer = this.buffer;
    if (buffer) {
      this.dst.next(buffer);
    }
    super._complete();
  }

  _unsubscribe() {
    this.buffer = null!;
    this.subscribing = false;
  }

  notifyNext(
    outerValue: T,
    innerValue: any,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, any>
  ): void {
    this.openBuffer();
  }

  notifyComplete(): void {
    if (this.subscribing) {
      this.complete();
    } else {
      this.openBuffer();
    }
  }

  openBuffer() {
    let {closingSubscription} = this;

    if (closingSubscription) {
      this.remove(closingSubscription);
      closingSubscription.unsubscribe();
    }

    const buffer = this.buffer;
    if (this.buffer) {
      this.dst.next(buffer);
    }

    this.buffer = [];

    let closingNotifier;
    try {
      const {closingSelector} = this;
      closingNotifier = closingSelector();
    } catch (err) {
      return this.error(err);
    }
    closingSubscription = new Subscription();
    this.closingSubscription = closingSubscription;
    this.add(closingSubscription);
    this.subscribing = true;
    closingSubscription.add(subscribeToResult(this, closingNotifier));
    this.subscribing = false;
  }
}

export function catchError<T, O extends ObservableInput<any>>(
  selector: (err: any, caught: Observable<T>) => O
): OperFun<T, T | ObservedValueOf<O>>;
export function catchError<T, O extends ObservableInput<any>>(
  selector: (err: any, caught: Observable<T>) => O
): OperFun<T, T | ObservedValueOf<O>> {
  return function catchErrorOperFun(
    source: Observable<T>
  ): Observable<T | ObservedValueOf<O>> {
    const operator = new CatchOperator(selector);
    const caught = source.lift(operator);
    return (operator.caught = caught as Observable<T>);
  };
}

class CatchOperator<T, R> implements Operator<T, T | R> {
  caught: Observable<T> | undefined;

  constructor(
    private selector: (
      err: any,
      caught: Observable<T>
    ) => ObservableInput<T | R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new CatchSubscriber(subscriber, this.selector, this.caught!)
    );
  }
}

class CatchSubscriber<T, R> extends OuterSubscriber<T, T | R> {
  constructor(
    destination: Subscriber<any>,
    private selector: (
      err: any,
      caught: Observable<T>
    ) => ObservableInput<T | R>,
    private caught: Observable<T>
  ) {
    super(destination);
  }

  error(err: any) {
    if (!this.stopped) {
      let result: any;
      try {
        result = this.selector(err, this.caught);
      } catch (err2) {
        super.error(err2);
        return;
      }
      this._recycle();
      const innerSubscriber = new InnerSubscriber(this, undefined, undefined!);
      this.add(innerSubscriber);
      const innerSubscription = subscribeToResult(
        this,
        result,
        undefined,
        undefined,
        innerSubscriber
      );
      if (innerSubscription !== innerSubscriber) {
        this.add(innerSubscription);
      }
    }
  }
}

export function combineAll<T>(): OperFun<ObservableInput<T>, T[]>;
export function combineAll<T>(): OperFun<any, T[]>;
export function combineAll<T, R>(
  project: (...values: T[]) => R
): OperFun<ObservableInput<T>, R>;
export function combineAll<R>(
  project: (...values: Array<any>) => R
): OperFun<any, R>;
export function combineAll<T, R>(
  project?: (...values: Array<any>) => R
): OperFun<T, R> {
  return (source: Observable<T>) =>
    source.lift(new CombineLatestOperator(project));
}

export function combineLatest<T, R>(
  ...observables: Array<
    | ObservableInput<any>
    | Array<ObservableInput<any>>
    | ((...values: Array<any>) => R)
  >
): OperFun<T, R> {
  let project: ((...values: Array<any>) => R) | undefined = undefined;
  if (typeof observables[observables.length - 1] === 'function') {
    project = <(...values: Array<any>) => R>observables.pop();
  }
  if (observables.length === 1 && isArray(observables[0])) {
    observables = (<any>observables[0]).slice();
  }

  return (source: Observable<T>) =>
    source.lift.call(
      from([source, ...observables]),
      new CombineLatestOperator(project)
    ) as Observable<R>;
}

export function combineLatestWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): OperFun<T, Unshift<ObservedTupleFrom<A>, T>> {
  return combineLatest(...otherSources);
}

export function concatAll<T>(): OperFun<ObservableInput<T>, T>;
export function concatAll<R>(): OperFun<any, R>;
export function concatAll<T>(): OperFun<ObservableInput<T>, T> {
  return mergeAll<T>(1);
}

export function concatMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O
): OperFun<T, ObservedValueOf<O>>;
export function concatMap<T, R, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?: (
    outerValue: T,
    innerValue: ObservedValueOf<O>,
    outerIndex: number,
    innerIndex: number
  ) => R
): OperFun<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return mergeMap(project, resultSelector, 1);
  }
  return mergeMap(project, 1);
}

export function concatMapTo<T, O extends ObservableInput<any>>(
  observable: O
): OperFun<T, ObservedValueOf<O>>;
export function concatMapTo<T, R, O extends ObservableInput<any>>(
  innerObservable: O,
  resultSelector?: (
    outerValue: T,
    innerValue: ObservedValueOf<O>,
    outerIndex: number,
    innerIndex: number
  ) => R
): OperFun<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return concatMap(() => innerObservable, resultSelector);
  }
  return concatMap(() => innerObservable);
}

export function concatWith<T>(): OperFun<T, T>;
export function concatWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): OperFun<T, ObservedUnionFrom<A> | T>;
export function concatWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): OperFun<T, ObservedUnionFrom<A> | T> {
  return (source: Observable<T>) =>
    source.lift.call(
      concatStatic(source, ...otherSources),
      undefined
    ) as Observable<ObservedUnionFrom<A> | T>;
}

export function count<T>(
  predicate?: (value: T, index: number, source: Observable<T>) => boolean
): OperFun<T, number> {
  return (source: Observable<T>) =>
    source.lift(new CountOperator(predicate, source));
}

class CountOperator<T> implements Operator<T, number> {
  constructor(
    private predicate:
      | ((value: T, index: number, source: Observable<T>) => boolean)
      | undefined,
    private source: Observable<T>
  ) {}

  call(subscriber: Subscriber<number>, source: any): any {
    return source.subscribe(
      new CountSubscriber(subscriber, this.predicate, this.source)
    );
  }
}

class CountSubscriber<T> extends Subscriber<T> {
  private count: number = 0;
  private index: number = 0;

  constructor(
    destination: Observer<number>,
    private predicate:
      | ((value: T, index: number, source: Observable<T>) => boolean)
      | undefined,
    private source: Observable<T>
  ) {
    super(destination);
  }

  protected _next(v: T) {
    if (this.predicate) {
      this._tryPredicate(v);
    } else {
      this.count++;
    }
  }

  private _tryPredicate(value: T) {
    let result: any;

    try {
      result = this.predicate!(value, this.index++, this.source);
    } catch (err) {
      this.dst.error(err);
      return;
    }

    if (result) {
      this.count++;
    }
  }

  protected _complete() {
    this.dst.next(this.count);
    this.dst.complete();
  }
}

export function debounce<T>(
  durationSelector: (value: T) => SubscribableOrPromise<any>
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new DebounceOperator(durationSelector));
}

class DebounceOperator<T> implements Operator<T, T> {
  constructor(
    private durationSelector: (value: T) => SubscribableOrPromise<any>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new DebounceSubscriber(subscriber, this.durationSelector)
    );
  }
}

class DebounceSubscriber<T, R> extends OuterSubscriber<T, R> {
  private value: T | null = null;
  private hasValue: boolean = false;
  private durationSubscription: Subscription | null | undefined = null;

  constructor(
    destination: Subscriber<R>,
    private durationSelector: (value: T) => SubscribableOrPromise<any>
  ) {
    super(destination);
  }

  protected _next(v: T) {
    try {
      const result = this.durationSelector.call(this, value);

      if (result) {
        this._tryNext(value, result);
      }
    } catch (err) {
      this.dst.error(err);
    }
  }

  protected _complete() {
    this.emitValue();
    this.dst.complete();
  }

  private _tryNext(value: T, duration: SubscribableOrPromise<any>): void {
    let subscription = this.durationSubscription;
    this.value = value;
    this.hasValue = true;
    if (subscription) {
      subscription.unsubscribe();
      this.remove(subscription);
    }

    subscription = subscribeToResult(this, duration);
    if (subscription && !subscription.closed) {
      this.add((this.durationSubscription = subscription));
    }
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.emitValue();
  }

  notifyComplete(): void {
    this.emitValue();
  }

  emitValue(): void {
    if (this.hasValue) {
      const value = this.value;
      const subscription = this.durationSubscription;
      if (subscription) {
        this.durationSubscription = null;
        subscription.unsubscribe();
        this.remove(subscription);
      }
      this.value = null;
      this.hasValue = false;
      super._next(value!);
    }
  }
}

export function debounceTime<T>(
  dueTime: number,
  scheduler: SchedulerLike = async
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new DebounceTimeOperator(dueTime, scheduler));
}

class DebounceTimeOperator<T> implements Operator<T, T> {
  constructor(private dueTime: number, private scheduler: SchedulerLike) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new DebounceTimeSubscriber(subscriber, this.dueTime, this.scheduler)
    );
  }
}

class DebounceTimeSubscriber<T> extends Subscriber<T> {
  private debouncedSubscription: Subscription | null = null;
  private lastValue: T | null = null;
  private hasValue: boolean = false;

  constructor(
    destination: Subscriber<T>,
    private dueTime: number,
    private scheduler: SchedulerLike
  ) {
    super(destination);
  }

  protected _next(value: T) {
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

  protected _complete() {
    this.debouncedNext();
    this.dst.complete();
  }

  debouncedNext(): void {
    this.clearDebounce();

    if (this.hasValue) {
      const {lastValue} = this;
      this.lastValue = null;
      this.hasValue = false;
      this.dst.next(lastValue);
    }
  }

  private clearDebounce(): void {
    const debouncedSubscription = this.debouncedSubscription;

    if (debouncedSubscription !== null) {
      this.remove(debouncedSubscription);
      debouncedSubscription.unsubscribe();
      this.debouncedSubscription = null;
    }
  }
}

function dispatchNext(subscriber: DebounceTimeSubscriber<any>) {
  subscriber.debouncedNext();
}

export function defaultIfEmpty<T, R = T>(defaultValue?: R): OperFun<T, T | R>;
export function defaultIfEmpty<T, R>(
  defaultValue: R | null = null
): OperFun<T, T | R> {
  return (source: Observable<T>) =>
    source.lift(new DefaultIfEmptyOperator(defaultValue)) as Observable<T | R>;
}

class DefaultIfEmptyOperator<T, R> implements Operator<T, T | R> {
  constructor(private defaultValue: R) {}

  call(subscriber: Subscriber<T | R>, source: any): any {
    return source.subscribe(
      new DefaultIfEmptySubscriber(subscriber, this.defaultValue)
    );
  }
}

class DefaultIfEmptySubscriber<T, R> extends Subscriber<T> {
  private isEmpty: boolean = true;

  constructor(destination: Subscriber<T | R>, private defaultValue: R) {
    super(destination);
  }

  protected _next(v: T) {
    this.isEmpty = false;
    this.dst.next(value);
  }

  protected _complete() {
    if (this.isEmpty) {
      this.dst.next(this.defaultValue);
    }
    this.dst.complete();
  }
}

export function delay<T>(
  delay: number | Date,
  scheduler: SchedulerLike = async
): MonoOper<T> {
  const absoluteDelay = isDate(delay);
  const delayFor = absoluteDelay
    ? +delay - scheduler.now()
    : Math.abs(<number>delay);
  return (source: Observable<T>) =>
    source.lift(new DelayOperator(delayFor, scheduler));
}

class DelayOperator<T> implements Operator<T, T> {
  constructor(private delay: number, private scheduler: SchedulerLike) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new DelaySubscriber(subscriber, this.delay, this.scheduler)
    );
  }
}

interface DelayState<T> {
  source: DelaySubscriber<T>;
  destination: Target<T>;
  scheduler: SchedulerLike;
}

class DelaySubscriber<T> extends Subscriber<T> {
  private queue: Array<DelayMessage<T>> = [];
  private active: boolean = false;
  private errored: boolean = false;

  private static dispatch<T>(
    this: SchedulerAction<DelayState<T>>,
    state: DelayState<T>
  ): void {
    const source = state.source;
    const queue = source.queue;
    const scheduler = state.scheduler;
    const destination = state.destination;

    while (queue.length > 0 && queue[0].time - scheduler.now() <= 0) {
      queue.shift()!.notification.observe(destination);
    }

    if (queue.length > 0) {
      const delay = Math.max(0, queue[0].time - scheduler.now());
      this.schedule(state, delay);
    } else if (source.stopped) {
      source.destination.complete();
      source.active = false;
    } else {
      this.unsubscribe();
      source.active = false;
    }
  }

  constructor(
    destination: Subscriber<T>,
    private delay: number,
    private scheduler: SchedulerLike
  ) {
    super(destination);
  }

  private _schedule(scheduler: SchedulerLike): void {
    this.active = true;
    const destination = this.destination as Subscription;
    destination.add(
      scheduler.schedule<DelayState<T>>(
        DelaySubscriber.dispatch as any,
        this.delay,
        {
          source: this,
          destination: this.destination,
          scheduler: scheduler
        }
      )
    );
  }

  private scheduleNotification(notification: Notification<T>): void {
    if (this.errored === true) {
      return;
    }

    const scheduler = this.scheduler;
    const message = new DelayMessage(
      scheduler.now() + this.delay,
      notification
    );
    this.queue.push(message);

    if (this.active === false) {
      this._schedule(scheduler);
    }
  }

  protected _next(value: T) {
    this.scheduleNotification(Notification.createNext(value));
  }

  protected _error(err: any) {
    this.errored = true;
    this.queue = [];
    this.dst.error(err);
    this.unsubscribe();
  }

  protected _complete() {
    if (this.queue.length === 0) {
      this.dst.complete();
    }
    this.unsubscribe();
  }
}

class DelayMessage<T> {
  constructor(
    public readonly time: number,
    public readonly notification: Notification<T>
  ) {}
}

export function delayWhen<T>(
  delayDurationSelector: (value: T, index: number) => Observable<any>,
  subscriptionDelay?: Observable<any>
): MonoOper<T>;
export function delayWhen<T>(
  delayDurationSelector: (value: T, index: number) => Observable<any>,
  subscriptionDelay?: Observable<any>
): MonoOper<T> {
  if (subscriptionDelay) {
    return (source: Observable<T>) =>
      new SubscriptionDelayObservable(source, subscriptionDelay).lift(
        new DelayWhenOperator(delayDurationSelector)
      );
  }
  return (source: Observable<T>) =>
    source.lift(new DelayWhenOperator(delayDurationSelector));
}

class DelayWhenOperator<T> implements Operator<T, T> {
  constructor(
    private delayDurationSelector: (value: T, index: number) => Observable<any>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new DelayWhenSubscriber(subscriber, this.delayDurationSelector)
    );
  }
}

class DelayWhenSubscriber<T, R> extends OuterSubscriber<T, R> {
  private completed: boolean = false;
  private delayNotifierSubscriptions: Array<Subscription> = [];
  private index: number = 0;

  constructor(
    destination: Subscriber<T>,
    private delayDurationSelector: (value: T, index: number) => Observable<any>
  ) {
    super(destination);
  }

  notifyNext(
    outerValue: T,
    innerValue: any,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.dst.next(outerValue);
    this.removeSubscription(innerSub);
    this.tryComplete();
  }

  notifyError(error: any, innerSub: InnerSubscriber<T, R>): void {
    this._error(error);
  }

  notifyComplete(innerSub: InnerSubscriber<T, R>): void {
    const value = this.removeSubscription(innerSub);
    if (value) {
      this.dst.next(value);
    }
    this.tryComplete();
  }

  protected _next(v: T) {
    const index = this.index++;
    try {
      const delayNotifier = this.delayDurationSelector(value, index);
      if (delayNotifier) {
        this.tryDelay(delayNotifier, value);
      }
    } catch (err) {
      this.dst.error(err);
    }
  }

  protected _complete() {
    this.completed = true;
    this.tryComplete();
    this.unsubscribe();
  }

  private removeSubscription(subscription: InnerSubscriber<T, R>): T {
    subscription.unsubscribe();

    const subscriptionIdx = this.delayNotifierSubscriptions.indexOf(
      subscription
    );
    if (subscriptionIdx !== -1) {
      this.delayNotifierSubscriptions.splice(subscriptionIdx, 1);
    }

    return subscription.outerValue;
  }

  private tryDelay(delayNotifier: Observable<any>, value: T): void {
    const notifierSubscription = subscribeToResult(this, delayNotifier, value);

    if (notifierSubscription && !notifierSubscription.closed) {
      const destination = this.destination as Subscription;
      destination.add(notifierSubscription);
      this.delayNotifierSubscriptions.push(notifierSubscription);
    }
  }

  private tryComplete(): void {
    if (this.completed && this.delayNotifierSubscriptions.length === 0) {
      this.dst.complete();
    }
  }
}

class SubscriptionDelayObservable<T> extends Observable<T> {
  constructor(
    public source: Observable<T>,
    private subscriptionDelay: Observable<any>
  ) {
    super();
  }

  _subscribe(subscriber: Subscriber<T>) {
    this.subscriptionDelay.subscribe(
      new SubscriptionDelaySubscriber(subscriber, this.source)
    );
  }
}

class SubscriptionDelaySubscriber<T> extends Subscriber<T> {
  private sourceSubscribed: boolean = false;

  constructor(private parent: Subscriber<T>, private source: Observable<T>) {
    super();
  }

  protected _next(unused: any) {
    this.subscribeToSource();
  }

  protected _error(err: any) {
    this.unsubscribe();
    this.parent.error(err);
  }

  protected _complete() {
    this.unsubscribe();
    this.subscribeToSource();
  }

  private subscribeToSource(): void {
    if (!this.sourceSubscribed) {
      this.sourceSubscribed = true;
      this.unsubscribe();
      this.source.subscribe(this.parent);
    }
  }
}

export function dematerialize<T>(): OperFun<Notification<T>, T> {
  return function dematerializeOperFun(source: Observable<Notification<T>>) {
    return source.lift(new DeMaterializeOperator());
  };
}

class DeMaterializeOperator<T extends Notification<any>, R>
  implements Operator<T, R> {
  call(subscriber: Subscriber<any>, source: any): any {
    return source.subscribe(new DeMaterializeSubscriber(subscriber));
  }
}

class DeMaterializeSubscriber<T extends Notification<any>> extends Subscriber<
  T
> {
  constructor(destination: Subscriber<any>) {
    super(destination);
  }

  protected _next(value: T) {
    value.observe(this.destination);
  }
}

export function distinct<T, K>(
  keySelector?: (value: T) => K,
  flushes?: Observable<any>
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new DistinctOperator(keySelector, flushes));
}

class DistinctOperator<T, K> implements Operator<T, T> {
  constructor(
    private keySelector?: (value: T) => K,
    private flushes?: Observable<any>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new DistinctSubscriber(subscriber, this.keySelector, this.flushes)
    );
  }
}

export class DistinctSubscriber<T, K> extends OuterSubscriber<T, T> {
  private values = new Set<K>();

  constructor(
    destination: Subscriber<T>,
    private keySelector?: (value: T) => K,
    flushes?: Observable<any>
  ) {
    super(destination);

    if (flushes) {
      this.add(subscribeToResult(this, flushes));
    }
  }

  notifyNext(
    outerValue: T,
    innerValue: T,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, T>
  ): void {
    this.values.clear();
  }

  notifyError(error: any, innerSub: InnerSubscriber<T, T>): void {
    this._error(error);
  }

  protected _next(v: T) {
    if (this.keySelector) {
      this._useKeySelector(value);
    } else {
      this._finalizeNext(value, value);
    }
  }

  private _useKeySelector(value: T): void {
    let key: K;
    const {destination} = this;
    try {
      key = this.keySelector!(value);
    } catch (err) {
      destination.error(err);
      return;
    }
    this._finalizeNext(key, value);
  }

  private _finalizeNext(key: K | T, value: T) {
    const {values} = this;
    if (!values.has(<K>key)) {
      values.add(<K>key);
      this.dst.next(value);
    }
  }
}

export function distinctUntilChanged<T>(
  compare?: (x: T, y: T) => boolean
): MonoOper<T>;
export function distinctUntilChanged<T, K>(
  compare?: (x: K, y: K) => boolean,
  keySelector?: (x: T) => K
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new DistinctUntilChangedOperator<T, K>(compare, keySelector));
}

class DistinctUntilChangedOperator<T, K> implements Operator<T, T> {
  constructor(
    private compare?: (x: K, y: K) => boolean,
    private keySelector?: (x: T) => K
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new DistinctUntilChangedSubscriber(
        subscriber,
        this.compare,
        this.keySelector
      )
    );
  }
}

class DistinctUntilChangedSubscriber<T, K> extends Subscriber<T> {
  private key: K | undefined;
  private hasKey: boolean = false;

  constructor(
    destination: Subscriber<T>,
    compare?: (x: K, y: K) => boolean,
    private keySelector?: (x: T) => K
  ) {
    super(destination);
    if (typeof compare === 'function') {
      this.compare = compare;
    }
  }

  private compare(x: any, y: any): boolean {
    return x === y;
  }

  protected _next(v: T) {
    let key: any;
    try {
      const {keySelector} = this;
      key = keySelector ? keySelector(value) : value;
    } catch (err) {
      return this.dst.error(err);
    }
    let result = false;
    if (this.hasKey) {
      try {
        const {compare} = this;
        result = compare(this.key, key);
      } catch (err) {
        return this.dst.error(err);
      }
    } else {
      this.hasKey = true;
    }
    if (!result) {
      this.key = key;
      this.dst.next(value);
    }
  }
}

export function distinctUntilKeyChanged<T>(key: keyof T): MonoOper<T>;
export function distinctUntilKeyChanged<T, K extends keyof T>(
  key: K,
  compare: (x: T[K], y: T[K]) => boolean
): MonoOper<T>;
export function distinctUntilKeyChanged<T, K extends keyof T>(
  key: K,
  compare?: (x: T[K], y: T[K]) => boolean
): MonoOper<T> {
  return distinctUntilChanged((x: T, y: T) =>
    compare ? compare(x[key], y[key]) : x[key] === y[key]
  );
}

export function elementAt<T>(index: number, defaultValue?: T): MonoOper<T> {
  if (index < 0) {
    throw new OutOfRangeError();
  }
  const hasDefaultValue = arguments.length >= 2;
  return (source: Observable<T>) =>
    source.pipe(
      filter((v, i) => i === index),
      take(1),
      hasDefaultValue
        ? defaultIfEmpty(defaultValue)
        : throwIfEmpty(() => new OutOfRangeError())
    );
}

export function endWith<T, A extends any[]>(
  ...args: A
): OperFun<T, T | ValueFromArray<A>>;
export function endWith<T>(...values: Array<T | SchedulerLike>): MonoOper<T> {
  return (source: Observable<T>) =>
    concatStatic(source, of(...values)) as Observable<T>;
}

export function every<T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  thisArg?: any
): OperFun<T, boolean> {
  return (source: Observable<T>) =>
    source.lift(new EveryOperator(predicate, thisArg, source));
}

class EveryOperator<T> implements Operator<T, boolean> {
  constructor(
    private predicate: (
      value: T,
      index: number,
      source: Observable<T>
    ) => boolean,
    private thisArg: any,
    private source: Observable<T>
  ) {}

  call(observer: Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new EverySubscriber(observer, this.predicate, this.thisArg, this.source)
    );
  }
}

class EverySubscriber<T> extends Subscriber<T> {
  private index: number = 0;

  constructor(
    destination: Observer<boolean>,
    private predicate: (
      value: T,
      index: number,
      source: Observable<T>
    ) => boolean,
    private thisArg: any,
    private source: Observable<T>
  ) {
    super(destination);
    this.thisArg = thisArg || this;
  }

  private notifyComplete(everyValueMatch: boolean): void {
    this.dst.next(everyValueMatch);
    this.dst.complete();
  }

  protected _next(v: T) {
    let result = false;
    try {
      result = this.predicate.call(
        this.thisArg,
        value,
        this.index++,
        this.source
      );
    } catch (err) {
      this.dst.error(err);
      return;
    }

    if (!result) {
      this.notifyComplete(false);
    }
  }

  protected _complete() {
    this.notifyComplete(true);
  }
}

export function exhaust<T>(): OperFun<ObservableInput<T>, T>;
export function exhaust<R>(): OperFun<any, R>;
export function exhaust<T>(): OperFun<any, T> {
  return (source: Observable<T>) => source.lift(new SwitchFirstOperator<T>());
}

class SwitchFirstOperator<T> implements Operator<T, T> {
  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(new SwitchFirstSubscriber(subscriber));
  }
}

class SwitchFirstSubscriber<T> extends OuterSubscriber<T, T> {
  private hasCompleted: boolean = false;
  private hasSubscription: boolean = false;

  constructor(destination: Subscriber<T>) {
    super(destination);
  }

  protected _next(v: T) {
    if (!this.hasSubscription) {
      this.hasSubscription = true;
      this.add(subscribeToResult(this, value));
    }
  }

  protected _complete() {
    this.hasCompleted = true;
    if (!this.hasSubscription) {
      this.dst.complete();
    }
  }

  notifyComplete(innerSub: Subscription): void {
    this.remove(innerSub);
    this.hasSubscription = false;
    if (this.hasCompleted) {
      this.dst.complete();
    }
  }
}

export function exhaustMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O
): OperFun<T, ObservedValueOf<O>>;
export function exhaustMap<T, R, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?: (
    outerValue: T,
    innerValue: ObservedValueOf<O>,
    outerIndex: number,
    innerIndex: number
  ) => R
): OperFun<T, ObservedValueOf<O> | R> {
  if (resultSelector) {
    // DEPRECATED PATH
    return (source: Observable<T>) =>
      source.pipe(
        exhaustMap((a, i) =>
          from(project(a, i)).pipe(
            map((b: any, ii: any) => resultSelector(a, b, i, ii))
          )
        )
      );
  }
  return (source: Observable<T>) =>
    source.lift(new ExhaustMapOperator(project));
}

class ExhaustMapOperator<T, R> implements Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => ObservableInput<R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new ExhaustMapSubscriber(subscriber, this.project));
  }
}

class ExhaustMapSubscriber<T, R> extends OuterSubscriber<T, R> {
  private hasSubscription = false;
  private hasCompleted = false;
  private index = 0;

  constructor(
    destination: Subscriber<R>,
    private project: (value: T, index: number) => ObservableInput<R>
  ) {
    super(destination);
  }

  protected _next(v: T) {
    if (!this.hasSubscription) {
      this.tryNext(value);
    }
  }

  private tryNext(value: T): void {
    let result: ObservableInput<R>;
    const index = this.index++;
    try {
      result = this.project(value, index);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    this.hasSubscription = true;
    this._innerSub(result, value, index);
  }

  private _innerSub(result: ObservableInput<R>, value: T, index: number): void {
    const innerSubscriber = new InnerSubscriber(this, value, index);
    const destination = this.destination as Subscription;
    destination.add(innerSubscriber);
    const innerSubscription = subscribeToResult<T, R>(
      this,
      result,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      destination.add(innerSubscription);
    }
  }

  protected _complete() {
    this.hasCompleted = true;
    if (!this.hasSubscription) {
      this.dst.complete();
    }
    this.unsubscribe();
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.dst.next(innerValue);
  }

  notifyError(err: any): void {
    this.dst.error(err);
  }

  notifyComplete(innerSub: Subscription): void {
    const destination = this.destination as Subscription;
    destination.remove(innerSub);

    this.hasSubscription = false;
    if (this.hasCompleted) {
      this.dst.complete();
    }
  }
}

export function expand<T, R>(
  project: (value: T, index: number) => ObservableInput<R>,
  concurrent?: number,
  scheduler?: SchedulerLike
): OperFun<T, R>;
export function expand<T>(
  project: (value: T, index: number) => ObservableInput<T>,
  concurrent?: number,
  scheduler?: SchedulerLike
): MonoOper<T>;
export function expand<T, R>(
  project: (value: T, index: number) => ObservableInput<R>,
  concurrent: number = Number.POSITIVE_INFINITY,
  scheduler?: SchedulerLike
): OperFun<T, R> {
  concurrent = (concurrent || 0) < 1 ? Number.POSITIVE_INFINITY : concurrent;

  return (source: Observable<T>) =>
    source.lift(new ExpandOperator(project, concurrent, scheduler));
}

export class ExpandOperator<T, R> implements Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => ObservableInput<R>,
    private concurrent: number,
    private scheduler?: SchedulerLike
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

interface DispatchArg<T, R> {
  subscriber: ExpandSubscriber<T, R>;
  result: ObservableInput<R>;
  value: any;
  index: number;
}

export class ExpandSubscriber<T, R> extends OuterSubscriber<T, R> {
  private index: number = 0;
  private active: number = 0;
  private hasCompleted: boolean = false;
  private buffer: any[] | undefined;

  constructor(
    destination: Subscriber<R>,
    private project: (value: T, index: number) => ObservableInput<R>,
    private concurrent: number,
    private scheduler?: SchedulerLike
  ) {
    super(destination);
    if (concurrent < Number.POSITIVE_INFINITY) {
      this.buffer = [];
    }
  }

  private static dispatch<T, R>(arg: DispatchArg<T, R>): void {
    const {subscriber, result, value, index} = arg;
    subscriber.subscribeToProjection(result, value, index);
  }

  protected _next(value: any): void {
    const destination = this.destination;

    if (destination.closed) {
      this._complete();
      return;
    }

    const index = this.index++;
    if (this.active < this.concurrent) {
      destination.next(value);
      try {
        const {project} = this;
        const result = project(value, index);
        if (!this.scheduler) {
          this.subscribeToProjection(result, value, index);
        } else {
          const state: DispatchArg<T, R> = {
            subscriber: this,
            result,
            value,
            index
          };
          const destination = this.destination as Subscription;
          destination.add(
            this.scheduler.schedule<DispatchArg<T, R>>(
              ExpandSubscriber.dispatch as any,
              0,
              state
            )
          );
        }
      } catch (e) {
        destination.error(e);
      }
    } else {
      this.buffer!.push(value);
    }
  }

  private subscribeToProjection(result: any, value: T, index: number): void {
    this.active++;
    const destination = this.destination as Subscription;
    destination.add(subscribeToResult<T, R>(this, result, value, index));
  }

  protected _complete() {
    this.hasCompleted = true;
    if (this.hasCompleted && this.active === 0) {
      this.dst.complete();
    }
    this.unsubscribe();
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this._next(innerValue);
  }

  notifyComplete(innerSub: Subscription): void {
    const buffer = this.buffer;
    const destination = this.destination as Subscription;
    destination.remove(innerSub);
    this.active--;
    if (buffer && buffer.length > 0) {
      this._next(buffer.shift());
    }
    if (this.hasCompleted && this.active === 0) {
      this.dst.complete();
    }
  }
}

export function filter<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
  thisArg?: any
): OperFun<T, S>;
export function filter<T>(
  predicate: BooleanConstructor
): OperFun<T | null | undefined, NonNullable<T>>;
export function filter<T>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): MonoOper<T>;
export function filter<T>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): MonoOper<T> {
  return function filterOperFun(source: Observable<T>): Observable<T> {
    return source.lift(new FilterOperator(predicate, thisArg));
  };
}

class FilterOperator<T> implements Operator<T, T> {
  constructor(
    private predicate: (value: T, index: number) => boolean,
    private thisArg?: any
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new FilterSubscriber(subscriber, this.predicate, this.thisArg)
    );
  }
}

class FilterSubscriber<T> extends Subscriber<T> {
  count: number = 0;

  constructor(
    destination: Subscriber<T>,
    private predicate: (value: T, index: number) => boolean,
    private thisArg: any
  ) {
    super(destination);
  }

  protected _next(value: T) {
    let result: any;
    try {
      result = this.predicate.call(this.thisArg, value, this.count++);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    if (result) {
      this.dst.next(value);
    }
  }
}

export function finalize<T>(callback: () => void): MonoOper<T> {
  return (source: Observable<T>) => source.lift(new FinallyOperator(callback));
}

class FinallyOperator<T> implements Operator<T, T> {
  constructor(private callback: () => void) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(new FinallySubscriber(subscriber, this.callback));
  }
}

class FinallySubscriber<T> extends Subscriber<T> {
  constructor(destination: Subscriber<T>, callback: () => void) {
    super(destination);
    this.add(new Subscription(callback));
  }
}

export function find<T, S extends T>(
  predicate: (value: T, index: number, source: Observable<T>) => value is S,
  thisArg?: any
): OperFun<T, S | undefined>;
export function find<T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  thisArg?: any
): OperFun<T, T | undefined>;
export function find<T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  thisArg?: any
): OperFun<T, T | undefined> {
  if (typeof predicate !== 'function') {
    throw new TypeError('predicate is not a function');
  }
  return (source: Observable<T>) =>
    source.lift(
      new FindValueOperator(predicate, source, false, thisArg)
    ) as Observable<T | undefined>;
}

export class FindValueOperator<T>
  implements Operator<T, T | number | undefined> {
  constructor(
    private predicate: (
      value: T,
      index: number,
      source: Observable<T>
    ) => boolean,
    private source: Observable<T>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {}

  call(observer: Subscriber<T>, source: any): any {
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

export class FindValueSubscriber<T> extends Subscriber<T> {
  private index: number = 0;

  constructor(
    destination: Subscriber<T>,
    private predicate: (
      value: T,
      index: number,
      source: Observable<T>
    ) => boolean,
    private source: Observable<T>,
    private yieldIndex: boolean,
    private thisArg?: any
  ) {
    super(destination);
  }

  private notifyComplete(value: any): void {
    const destination = this.destination;

    destination.next(value);
    destination.complete();
    this.unsubscribe();
  }

  protected _next(v: T) {
    const {predicate, thisArg} = this;
    const index = this.index++;
    try {
      const result = predicate.call(thisArg || this, value, index, this.source);
      if (result) {
        this.notifyComplete(this.yieldIndex ? index : value);
      }
    } catch (err) {
      this.dst.error(err);
    }
  }

  protected _complete() {
    this.notifyComplete(this.yieldIndex ? -1 : undefined);
  }
}

export function findIndex<T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  thisArg?: any
): OperFun<T, number> {
  return (source: Observable<T>) =>
    source.lift(
      new FindValueOperator(predicate, source, true, thisArg)
    ) as Observable<any>;
}

export function first<T, D = T>(
  predicate?: null,
  defaultValue?: D
): OperFun<T, T | D>;
export function first<T, S extends T>(
  predicate: (value: T, index: number, source: Observable<T>) => value is S,
  defaultValue?: S
): OperFun<T, S>;
export function first<T, D = T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  defaultValue?: D
): OperFun<T, T | D>;
export function first<T, D>(
  predicate?:
    | ((value: T, index: number, source: Observable<T>) => boolean)
    | null,
  defaultValue?: D
): OperFun<T, T | D> {
  const hasDefaultValue = arguments.length >= 2;
  return (source: Observable<T>) =>
    source.pipe(
      predicate ? filter((v, i) => predicate(v, i, source)) : identity,
      take(1),
      hasDefaultValue
        ? defaultIfEmpty<T, D>(defaultValue)
        : throwIfEmpty(() => new EmptyError())
    );
}

export function groupBy<T, K>(
  keySelector: (value: T) => K
): OperFun<T, GroupedObservable<K, T>>;
export function groupBy<T, K>(
  keySelector: (value: T) => K,
  elementSelector: void,
  durationSelector: (grouped: GroupedObservable<K, T>) => Observable<any>
): OperFun<T, GroupedObservable<K, T>>;
export function groupBy<T, K, R>(
  keySelector: (value: T) => K,
  elementSelector?: (value: T) => R,
  durationSelector?: (grouped: GroupedObservable<K, R>) => Observable<any>
): OperFun<T, GroupedObservable<K, R>>;
export function groupBy<T, K, R>(
  keySelector: (value: T) => K,
  elementSelector?: (value: T) => R,
  durationSelector?: (grouped: GroupedObservable<K, R>) => Observable<any>,
  subjectSelector?: () => Subject<R>
): OperFun<T, GroupedObservable<K, R>>;
export function groupBy<T, K, R>(
  keySelector: (value: T) => K,
  elementSelector?: ((value: T) => R) | void,
  durationSelector?: (grouped: GroupedObservable<K, R>) => Observable<any>,
  subjectSelector?: () => Subject<R>
): OperFun<T, GroupedObservable<K, R>> {
  return (source: Observable<T>) =>
    source.lift(
      new GroupByOperator(
        keySelector,
        elementSelector,
        durationSelector,
        subjectSelector
      )
    );
}

export interface RefCountSubscription {
  count: number;
  unsubscribe: () => void;
  closed: boolean;
  attemptedToUnsubscribe: boolean;
}

class GroupByOperator<T, K, R> implements Operator<T, GroupedObservable<K, R>> {
  constructor(
    private keySelector: (value: T) => K,
    private elementSelector?: ((value: T) => R) | void,
    private durationSelector?: (
      grouped: GroupedObservable<K, R>
    ) => Observable<any>,
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

class GroupBySubscriber<T, K, R> extends Subscriber<T>
  implements RefCountSubscription {
  private groups: Map<K, Subject<T | R>> | null = null;
  public attemptedToUnsubscribe: boolean = false;
  public count: number = 0;

  constructor(
    destination: Subscriber<GroupedObservable<K, R>>,
    private keySelector: (value: T) => K,
    private elementSelector?: ((value: T) => R) | void,
    private durationSelector?: (
      grouped: GroupedObservable<K, R>
    ) => Observable<any>,
    private subjectSelector?: () => Subject<R>
  ) {
    super(destination);
  }

  protected _next(v: T) {
    let key: K;
    try {
      key = this.keySelector(value);
    } catch (err) {
      this.error(err);
      return;
    }

    this._group(value, key);
  }

  private _group(value: T, key: K) {
    let groups = this.groups;

    if (!groups) {
      groups = this.groups = new Map<K, Subject<T | R>>();
    }

    let group = groups.get(key);

    let element: R;
    if (this.elementSelector) {
      try {
        element = this.elementSelector(value);
      } catch (err) {
        this.error(err);
      }
    } else {
      element = value as any;
    }

    if (!group) {
      group = (this.subjectSelector
        ? this.subjectSelector()
        : new Subject<R>()) as Subject<T | R>;
      groups.set(key, group);
      const groupedObservable = new GroupedObservable(key, group, this);
      this.dst.next(groupedObservable);
      if (this.durationSelector) {
        let duration: any;
        try {
          duration = this.durationSelector(
            new GroupedObservable<K, R>(key, <Subject<R>>group)
          );
        } catch (err) {
          this.error(err);
          return;
        }
        this.add(
          duration.subscribe(new GroupDurationSubscriber(key, group, this))
        );
      }
    }

    if (!group.closed) {
      group.next(element!);
    }
  }

  protected _error(e: any) {
    const groups = this.groups;
    if (groups) {
      groups.forEach((group, key) => {
        group.error(err);
      });

      groups.clear();
    }
    this.dst.error(err);
  }

  protected _complete() {
    const groups = this.groups;
    if (groups) {
      groups.forEach((group, key) => {
        group.complete();
      });

      groups.clear();
    }
    this.dst.complete();
  }

  removeGroup(key: K): void {
    this.groups!.delete(key);
  }

  unsubscribe() {
    if (!this.closed) {
      this.attemptedToUnsubscribe = true;
      if (this.count === 0) {
        super.unsubscribe();
      }
    }
  }
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

export class GroupedObservable<K, T> extends Observable<T> {
  constructor(
    public key: K,
    private groupSubject: Subject<T>,
    private refCountSubscription?: RefCountSubscription
  ) {
    super();
  }

  _subscribe(subscriber: Subscriber<T>) {
    const subscription = new Subscription();
    const {refCountSubscription, groupSubject} = this;
    if (refCountSubscription && !refCountSubscription.closed) {
      subscription.add(new InnerRefCountSubscription(refCountSubscription));
    }
    subscription.add(groupSubject.subscribe(subscriber));
    return subscription;
  }
}

class InnerRefCountSubscription extends Subscription {
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

export function ignoreElements(): OperFun<any, never> {
  return function ignoreElementsOperFun(source: Observable<any>) {
    return source.lift(new IgnoreElementsOperator());
  };
}

class IgnoreElementsOperator<T, R> implements Operator<T, R> {
  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new IgnoreElementsSubscriber(subscriber));
  }
}

class IgnoreElementsSubscriber<T> extends Subscriber<T> {
  protected _next(unused: T): void {
    // Do nothing
  }
}

export function isEmpty<T>(): OperFun<T, boolean> {
  return (source: Observable<T>) => source.lift(new IsEmptyOperator());
}

class IsEmptyOperator implements Operator<any, boolean> {
  call(observer: Subscriber<boolean>, source: any): any {
    return source.subscribe(new IsEmptySubscriber(observer));
  }
}

class IsEmptySubscriber extends Subscriber<any> {
  constructor(destination: Subscriber<boolean>) {
    super(destination);
  }

  private notifyComplete(isEmpty: boolean): void {
    const destination = this.destination;

    destination.next(isEmpty);
    destination.complete();
  }

  protected _next(value: boolean) {
    this.notifyComplete(false);
  }

  protected _complete() {
    this.notifyComplete(true);
  }
}

export function last<T, D = T>(
  predicate?: null,
  defaultValue?: D
): OperFun<T, T | D>;
export function last<T, S extends T>(
  predicate: (value: T, index: number, source: Observable<T>) => value is S,
  defaultValue?: S
): OperFun<T, S>;
export function last<T, D = T>(
  predicate: (value: T, index: number, source: Observable<T>) => boolean,
  defaultValue?: D
): OperFun<T, T | D>;
export function last<T, D>(
  predicate?:
    | ((value: T, index: number, source: Observable<T>) => boolean)
    | null,
  defaultValue?: D
): OperFun<T, T | D> {
  const hasDefaultValue = arguments.length >= 2;
  return (source: Observable<T>) =>
    source.pipe(
      predicate ? filter((v, i) => predicate(v, i, source)) : identity,
      takeLast(1),
      hasDefaultValue
        ? defaultIfEmpty<T, D>(defaultValue)
        : throwIfEmpty(() => new EmptyError())
    );
}

export function map<T, R>(
  project: (value: T, index: number) => R,
  thisArg?: any
): OperFun<T, R> {
  return function mapOperation(source: Observable<T>): Observable<R> {
    if (typeof project !== 'function') {
      throw new TypeError(
        'argument is not a function. Are you looking for `mapTo()`?'
      );
    }
    return source.lift(new MapOperator(project, thisArg));
  };
}

export class MapOperator<T, R> implements Operator<T, R> {
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

class MapSubscriber<T, R> extends Subscriber<T> {
  count: number = 0;
  private thisArg: any;

  constructor(
    destination: Subscriber<R>,
    private project: (value: T, index: number) => R,
    thisArg: any
  ) {
    super(destination);
    this.thisArg = thisArg || this;
  }

  protected _next(value: T) {
    let result: R;
    try {
      result = this.project.call(this.thisArg, value, this.count++);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    this.dst.next(result);
  }
}

export function mapTo<R>(value: R): OperFun<any, R>;
export function mapTo<R>(value: R): OperFun<any, R> {
  return (source: Observable<any>) => source.lift(new MapToOperator(value));
}

class MapToOperator<T, R> implements Operator<T, R> {
  value: R;

  constructor(value: R) {
    this.value = value;
  }

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new MapToSubscriber(subscriber, this.value));
  }
}

class MapToSubscriber<T, R> extends Subscriber<T> {
  value: R;

  constructor(destination: Subscriber<R>, value: R) {
    super(destination);
    this.value = value;
  }

  protected _next(x: T) {
    this.dst.next(this.value);
  }
}

export function materialize<T>(): OperFun<T, Notification<T>> {
  return function materializeOperFun(source: Observable<T>) {
    return source.lift(new MaterializeOperator());
  };
}

class MaterializeOperator<T> implements Operator<T, Notification<T>> {
  call(subscriber: Subscriber<Notification<T>>, source: any): any {
    return source.subscribe(new MaterializeSubscriber(subscriber));
  }
}

class MaterializeSubscriber<T> extends Subscriber<T> {
  constructor(destination: Subscriber<Notification<T>>) {
    super(destination);
  }

  protected _next(value: T) {
    this.dst.next(Notification.createNext(value));
  }

  protected _error(err: any) {
    const destination = this.destination;
    destination.next(Notification.createError(err));
    destination.complete();
  }

  protected _complete() {
    const destination = this.destination;
    destination.next(Notification.createComplete());
    destination.complete();
  }
}

export function max<T>(comparer?: (x: T, y: T) => number): MonoOper<T> {
  const max: (x: T, y: T) => T =
    typeof comparer === 'function'
      ? (x, y) => (comparer(x, y) > 0 ? x : y)
      : (x, y) => (x > y ? x : y);

  return reduce(max);
}

export function mergeAll<T>(
  concurrent: number = Number.POSITIVE_INFINITY
): OperFun<ObservableInput<T>, T> {
  return mergeMap(identity, concurrent);
}

export function mergeMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  concurrent?: number
): OperFun<T, ObservedValueOf<O>>;
export function mergeMap<T, R, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?:
    | ((
        outerValue: T,
        innerValue: ObservedValueOf<O>,
        outerIndex: number,
        innerIndex: number
      ) => R)
    | number,
  concurrent: number = Number.POSITIVE_INFINITY
): OperFun<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return (source: Observable<T>) =>
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
  return (source: Observable<T>) =>
    source.lift(new MergeMapOperator(project, concurrent));
}

export class MergeMapOperator<T, R> implements Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => ObservableInput<R>,
    private concurrent: number = Number.POSITIVE_INFINITY
  ) {}

  call(observer: Subscriber<R>, source: any): any {
    return source.subscribe(
      new MergeMapSubscriber(observer, this.project, this.concurrent)
    );
  }
}

export class MergeMapSubscriber<T, R> extends OuterSubscriber<T, R> {
  private hasCompleted: boolean = false;
  private buffer: T[] = [];
  private active: number = 0;
  protected index: number = 0;

  constructor(
    destination: Subscriber<R>,
    private project: (value: T, index: number) => ObservableInput<R>,
    private concurrent: number = Number.POSITIVE_INFINITY
  ) {
    super(destination);
  }

  protected _next(v: T) {
    if (this.active < this.concurrent) {
      this._tryNext(value);
    } else {
      this.buffer.push(value);
    }
  }

  protected _tryNext(value: T) {
    let result: ObservableInput<R>;
    const index = this.index++;
    try {
      result = this.project(value, index);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    this.active++;
    this._innerSub(result, value, index);
  }

  private _innerSub(ish: ObservableInput<R>, value: T, index: number): void {
    const innerSubscriber = new InnerSubscriber(this, value, index);
    const destination = this.destination as Subscription;
    destination.add(innerSubscriber);
    const innerSubscription = subscribeToResult<T, R>(
      this,
      ish,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      destination.add(innerSubscription);
    }
  }

  protected _complete() {
    this.hasCompleted = true;
    if (this.active === 0 && this.buffer.length === 0) {
      this.dst.complete();
    }
    this.unsubscribe();
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.dst.next(innerValue);
  }

  notifyComplete(innerSub: Subscription): void {
    const buffer = this.buffer;
    this.remove(innerSub);
    this.active--;
    if (buffer.length > 0) {
      this._next(buffer.shift()!);
    } else if (this.active === 0 && this.hasCompleted) {
      this.dst.complete();
    }
  }
}

export function mergeMapTo<O extends ObservableInput<any>>(
  innerObservable: O,
  concurrent?: number
): OperFun<any, ObservedValueOf<O>>;
export function mergeMapTo<T, R, O extends ObservableInput<any>>(
  innerObservable: O,
  resultSelector?:
    | ((
        outerValue: T,
        innerValue: ObservedValueOf<O>,
        outerIndex: number,
        innerIndex: number
      ) => R)
    | number,
  concurrent: number = Number.POSITIVE_INFINITY
): OperFun<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return mergeMap(() => innerObservable, resultSelector, concurrent);
  }
  if (typeof resultSelector === 'number') {
    concurrent = resultSelector;
  }
  return mergeMap(() => innerObservable, concurrent);
}

export function mergeScan<T, R>(
  accumulator: (acc: R, value: T, index: number) => ObservableInput<R>,
  seed: R,
  concurrent: number = Number.POSITIVE_INFINITY
): OperFun<T, R> {
  return (source: Observable<T>) =>
    source.lift(new MergeScanOperator(accumulator, seed, concurrent));
}

export class MergeScanOperator<T, R> implements Operator<T, R> {
  constructor(
    private accumulator: (
      acc: R,
      value: T,
      index: number
    ) => ObservableInput<R>,
    private seed: R,
    private concurrent: number
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new MergeScanSubscriber(
        subscriber,
        this.accumulator,
        this.seed,
        this.concurrent
      )
    );
  }
}

export class MergeScanSubscriber<T, R> extends OuterSubscriber<T, R> {
  private hasValue: boolean = false;
  private hasCompleted: boolean = false;
  private buffer: Observable<any>[] = [];
  private active: number = 0;
  protected index: number = 0;

  constructor(
    destination: Subscriber<R>,
    private accumulator: (
      acc: R,
      value: T,
      index: number
    ) => ObservableInput<R>,
    private acc: R,
    private concurrent: number
  ) {
    super(destination);
  }

  protected _next(value: any): void {
    if (this.active < this.concurrent) {
      const index = this.index++;
      const destination = this.destination;
      let ish;
      try {
        const {accumulator} = this;
        ish = accumulator(this.acc, value, index);
      } catch (e) {
        return destination.error(e);
      }
      this.active++;
      this._innerSub(ish, value, index);
    } else {
      this.buffer.push(value);
    }
  }

  private _innerSub(ish: any, value: T, index: number): void {
    const innerSubscriber = new InnerSubscriber(this, value, index);
    const destination = this.destination as Subscription;
    destination.add(innerSubscriber);
    const innerSubscription = subscribeToResult<T, R>(
      this,
      ish,
      undefined,
      undefined,
      innerSubscriber
    );
    if (innerSubscription !== innerSubscriber) {
      destination.add(innerSubscription);
    }
  }

  protected _complete() {
    this.hasCompleted = true;
    if (this.active === 0 && this.buffer.length === 0) {
      if (this.hasValue === false) {
        this.dst.next(this.acc);
      }
      this.dst.complete();
    }
    this.unsubscribe();
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    const {destination} = this;
    this.acc = innerValue;
    this.hasValue = true;
    destination.next(innerValue);
  }

  notifyComplete(innerSub: Subscription): void {
    const buffer = this.buffer;
    const destination = this.destination as Subscription;
    destination.remove(innerSub);
    this.active--;
    if (buffer.length > 0) {
      this._next(buffer.shift());
    } else if (this.active === 0 && this.hasCompleted) {
      if (this.hasValue === false) {
        this.dst.next(this.acc);
      }
      this.dst.complete();
    }
  }
}

export function mergeWith<T>(): OperFun<T, T>;
export function mergeWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): OperFun<T, T | ObservedUnionFrom<A>>;
export function mergeWith<T, A extends ObservableInput<any>[]>(
  ...otherSources: A
): OperFun<T, T | ObservedUnionFrom<A>> {
  return merge(...otherSources);
}

export function min<T>(comparer?: (x: T, y: T) => number): MonoOper<T> {
  const min: (x: T, y: T) => T =
    typeof comparer === 'function'
      ? (x, y) => (comparer(x, y) < 0 ? x : y)
      : (x, y) => (x < y ? x : y);
  return reduce(min);
}

export function multicast<T>(
  subject: Subject<T>
): UnaryFun<Observable<T>, Connectable<T>>;
export function multicast<T, O extends ObservableInput<any>>(
  subject: Subject<T>,
  selector: (shared: Observable<T>) => O
): UnaryFun<Observable<T>, Connectable<ObservedValueOf<O>>>;
export function multicast<T>(
  subjectFactory: (this: Observable<T>) => Subject<T>
): UnaryFun<Observable<T>, Connectable<T>>;
export function multicast<T, O extends ObservableInput<any>>(
  SubjectFactory: (this: Observable<T>) => Subject<T>,
  selector: (shared: Observable<T>) => O
): OperFun<T, ObservedValueOf<O>>;
export function multicast<T, R>(
  subjectOrSubjectFactory: Subject<T> | (() => Subject<T>),
  selector?: (source: Observable<T>) => Observable<R>
): OperFun<T, R> {
  return function multicastOperFun(source: Observable<T>): Observable<R> {
    let subjectFactory: () => Subject<T>;
    if (typeof subjectOrSubjectFactory === 'function') {
      subjectFactory = <() => Subject<T>>subjectOrSubjectFactory;
    } else {
      subjectFactory = function subjectFactory() {
        return <Subject<T>>subjectOrSubjectFactory;
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

    return <Connectable<R>>connectable;
  };
}

export class MulticastOperator<T, R> implements Operator<T, R> {
  constructor(
    private subjectFactory: () => Subject<T>,
    private selector: (source: Observable<T>) => Observable<R>
  ) {}
  call(subscriber: Subscriber<R>, source: any): any {
    const {selector} = this;
    const subject = this.subjectFactory();
    const subscription = selector(subject).subscribe(subscriber);
    subscription.add(source.subscribe(subject));
    return subscription;
  }
}

export function observeOn<T>(
  scheduler: SchedulerLike,
  delay: number = 0
): MonoOper<T> {
  return function observeOnOperFun(source: Observable<T>): Observable<T> {
    return source.lift(new ObserveOnOperator(scheduler, delay));
  };
}

export class ObserveOnOperator<T> implements Operator<T, T> {
  constructor(private scheduler: SchedulerLike, private delay: number = 0) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new ObserveOnSubscriber(subscriber, this.scheduler, this.delay)
    );
  }
}

export class ObserveOnSubscriber<T> extends Subscriber<T> {
  /** @nocollapse */
  static dispatch(
    this: SchedulerAction<ObserveOnMessage>,
    arg: ObserveOnMessage
  ) {
    const {notification, destination} = arg;
    notification.observe(destination);
    this.unsubscribe();
  }

  constructor(
    destination: Subscriber<T>,
    private scheduler: SchedulerLike,
    private delay: number = 0
  ) {
    super(destination);
  }

  private scheduleMessage(notification: Notification<any>): void {
    const destination = this.destination as Subscription;
    destination.add(
      this.scheduler.schedule(
        ObserveOnSubscriber.dispatch as any,
        this.delay,
        new ObserveOnMessage(notification, this.destination)
      )
    );
  }

  protected _next(v: T) {
    this.scheduleMessage(Notification.createNext(value));
  }

  protected _error(e: any) {
    this.scheduleMessage(Notification.createError(err));
    this.unsubscribe();
  }

  protected _complete() {
    this.scheduleMessage(Notification.createComplete());
    this.unsubscribe();
  }
}

export class ObserveOnMessage {
  constructor(
    public notification: Notification<any>,
    public destination: Target<any>
  ) {}
}

export function onErrorResumeNext<T>(): OperFun<T, T>;
export function onErrorResumeNext<T, T2>(
  v: ObservableInput<T2>
): OperFun<T, T | T2>;
export function onErrorResumeNext<T, T2, T3>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>
): OperFun<T, T | T2 | T3>;
export function onErrorResumeNext<T, T2, T3, T4>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>,
  v3: ObservableInput<T4>
): OperFun<T, T | T2 | T3 | T4>;
export function onErrorResumeNext<T, T2, T3, T4, T5>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>,
  v3: ObservableInput<T4>,
  v4: ObservableInput<T5>
): OperFun<T, T | T2 | T3 | T4 | T5>;
export function onErrorResumeNext<T, T2, T3, T4, T5, T6>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>,
  v3: ObservableInput<T4>,
  v4: ObservableInput<T5>,
  v5: ObservableInput<T6>
): OperFun<T, T | T2 | T3 | T4 | T5 | T6>;
export function onErrorResumeNext<T, T2, T3, T4, T5, T6, T7>(
  v: ObservableInput<T2>,
  v2: ObservableInput<T3>,
  v3: ObservableInput<T4>,
  v4: ObservableInput<T5>,
  v5: ObservableInput<T6>,
  v6: ObservableInput<T7>
): OperFun<T, T | T2 | T3 | T4 | T5 | T6 | T7>;
export function onErrorResumeNext<T, R>(
  ...observables: Array<ObservableInput<any>>
): OperFun<T, T | R>;
export function onErrorResumeNext<T, R>(
  array: ObservableInput<any>[]
): OperFun<T, T | R>;
export function onErrorResumeNext<T, R>(
  ...nextSources: Array<ObservableInput<any> | Array<ObservableInput<any>>>
): OperFun<T, R> {
  if (nextSources.length === 1 && isArray(nextSources[0])) {
    nextSources = <Array<Observable<any>>>nextSources[0];
  }

  return (source: Observable<T>) =>
    source.lift(new OnErrorResumeNextOperator<T, R>(nextSources));
}

export function onErrorResumeNextStatic<R>(
  v: ObservableInput<R>
): Observable<R>;
export function onErrorResumeNextStatic<T2, T3, R>(
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>
): Observable<R>;
export function onErrorResumeNextStatic<T2, T3, T4, R>(
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>,
  v4: ObservableInput<T4>
): Observable<R>;
export function onErrorResumeNextStatic<T2, T3, T4, T5, R>(
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>,
  v4: ObservableInput<T4>,
  v5: ObservableInput<T5>
): Observable<R>;
export function onErrorResumeNextStatic<T2, T3, T4, T5, T6, R>(
  v2: ObservableInput<T2>,
  v3: ObservableInput<T3>,
  v4: ObservableInput<T4>,
  v5: ObservableInput<T5>,
  v6: ObservableInput<T6>
): Observable<R>;
export function onErrorResumeNextStatic<R>(
  ...observables: Array<ObservableInput<any> | ((...values: Array<any>) => R)>
): Observable<R>;
export function onErrorResumeNextStatic<R>(
  array: ObservableInput<any>[]
): Observable<R>;
export function onErrorResumeNextStatic<T, R>(
  ...nextSources: Array<
    | ObservableInput<any>
    | Array<ObservableInput<any>>
    | ((...values: Array<any>) => R)
  >
): Observable<R> {
  let source: ObservableInput<any> | null = null;

  if (nextSources.length === 1 && isArray(nextSources[0])) {
    nextSources = <Array<ObservableInput<any>>>nextSources[0];
  }
  source = nextSources.shift()!;

  return from(source, null!).lift(
    new OnErrorResumeNextOperator<T, R>(nextSources)
  );
}

class OnErrorResumeNextOperator<T, R> implements Operator<T, R> {
  constructor(private nextSources: Array<ObservableInput<any>>) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new OnErrorResumeNextSubscriber(subscriber, this.nextSources)
    );
  }
}

class OnErrorResumeNextSubscriber<T, R> extends OuterSubscriber<T, R> {
  constructor(
    protected destination: Subscriber<T>,
    private nextSources: Array<ObservableInput<any>>
  ) {
    super(destination);
  }

  notifyError(error: any, innerSub: InnerSubscriber<T, any>): void {
    this.subscribeToNextSource();
  }

  notifyComplete(innerSub: InnerSubscriber<T, any>): void {
    this.subscribeToNextSource();
  }

  protected _error(e: any) {
    this.subscribeToNextSource();
    this.unsubscribe();
  }

  protected _complete() {
    this.subscribeToNextSource();
    this.unsubscribe();
  }

  private subscribeToNextSource(): void {
    const next = this.nextSources.shift();
    if (!!next) {
      const innerSubscriber = new InnerSubscriber(this, undefined, undefined!);
      const destination = this.destination as Subscription;
      destination.add(innerSubscriber);
      const innerSubscription = subscribeToResult(
        this,
        next,
        undefined,
        undefined,
        innerSubscriber
      );
      if (innerSubscription !== innerSubscriber) {
        destination.add(innerSubscription);
      }
    } else {
      this.dst.complete();
    }
  }
}

export function pairwise<T>(): OperFun<T, [T, T]> {
  return (source: Observable<T>) => source.lift(new PairwiseOperator());
}

class PairwiseOperator<T> implements Operator<T, [T, T]> {
  call(subscriber: Subscriber<[T, T]>, source: any): any {
    return source.subscribe(new PairwiseSubscriber(subscriber));
  }
}

class PairwiseSubscriber<T> extends Subscriber<T> {
  private prev: T | undefined;
  private hasPrev: boolean = false;

  constructor(destination: Subscriber<[T, T]>) {
    super(destination);
  }

  _next(value: T): void {
    let pair: [T, T] | undefined;

    if (this.hasPrev) {
      pair = [this.prev!, value];
    } else {
      this.hasPrev = true;
    }

    this.prev = value;

    if (pair) {
      this.dst.next(pair);
    }
  }
}

export function partition<T>(
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): UnaryFun<Observable<T>, [Observable<T>, Observable<T>]> {
  return (source: Observable<T>) =>
    [
      filter(predicate, thisArg)(source),
      filter(not(predicate, thisArg) as any)(source)
    ] as [Observable<T>, Observable<T>];
}

export function pluck<T, K1 extends keyof T>(k1: K1): OperFun<T, T[K1]>;
export function pluck<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  k1: K1,
  k2: K2
): OperFun<T, T[K1][K2]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2]
>(k1: K1, k2: K2, k3: K3): OperFun<T, T[K1][K2][K3]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3]
>(k1: K1, k2: K2, k3: K3, k4: K4): OperFun<T, T[K1][K2][K3][K4]>;
export function pluck<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4]
>(k1: K1, k2: K2, k3: K3, k4: K4, k5: K5): OperFun<T, T[K1][K2][K3][K4][K5]>;
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
): OperFun<T, T[K1][K2][K3][K4][K5][K6]>;
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
): OperFun<T, unknown>;
export function pluck<T>(...properties: string[]): OperFun<T, unknown>;
export function pluck<T, R>(
  ...properties: Array<string | number | symbol>
): OperFun<T, R> {
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

export function publish<T>(): UnaryFun<Observable<T>, Connectable<T>>;
export function publish<T, O extends ObservableInput<any>>(
  selector: (shared: Observable<T>) => O
): OperFun<T, ObservedValueOf<O>>;
export function publish<T>(selector: MonoOper<T>): MonoOper<T>;
export function publish<T, R>(
  selector?: OperFun<T, R>
): MonoOper<T> | OperFun<T, R> {
  return selector
    ? multicast(() => new Subject<T>(), selector)
    : multicast(new Subject<T>());
}

export function publishBehavior<T>(
  value: T
): UnaryFun<Observable<T>, Connectable<T>> {
  return (source: Observable<T>) =>
    multicast(new BehaviorSubject<T>(value))(source) as Connectable<T>;
}

export function publishLast<T>(): UnaryFun<Observable<T>, Connectable<T>> {
  return (source: Observable<T>) => multicast(new AsyncSubject<T>())(source);
}

export function publishReplay<T>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: SchedulerLike
): MonoOper<T>;
export function publishReplay<T, O extends ObservableInput<any>>(
  bufferSize?: number,
  windowTime?: number,
  selector?: (shared: Observable<T>) => O,
  scheduler?: SchedulerLike
): OperFun<T, ObservedValueOf<O>>;
export function publishReplay<T, R>(
  bufferSize?: number,
  windowTime?: number,
  selectorOrScheduler?: SchedulerLike | OperFun<T, R>,
  scheduler?: SchedulerLike
): UnaryFun<Observable<T>, Connectable<R>> {
  if (selectorOrScheduler && typeof selectorOrScheduler !== 'function') {
    scheduler = selectorOrScheduler;
  }

  const selector =
    typeof selectorOrScheduler === 'function' ? selectorOrScheduler : undefined;
  const subject = new ReplaySubject<T>(bufferSize, windowTime, scheduler);

  return (source: Observable<T>) =>
    multicast(() => subject, selector!)(source) as Connectable<R>;
}

export function race<T>(
  ...observables: (Observable<T> | Observable<T>[])[]
): MonoOper<T> {
  return function raceOperFun(source: Observable<T>) {
    if (observables.length === 1 && isArray(observables[0])) {
      observables = observables[0] as Observable<T>[];
    }

    return source.lift.call(
      raceStatic(source, ...(observables as Observable<T>[])),
      undefined
    ) as Observable<T>;
  };
}

export function reduce<V, A = V>(
  accumulator: (acc: A | V, value: V, index: number) => A
): OperFun<V, V | A>;
export function reduce<V, A>(
  accumulator: (acc: A, value: V, index: number) => A,
  seed: A
): OperFun<V, A>;
export function reduce<V, A, S = A>(
  accumulator: (acc: A | S, value: V, index: number) => A,
  seed: S
): OperFun<V, A>;
export function reduce<V, A>(
  accumulator: (acc: V | A, value: V, index: number) => A,
  seed?: any
): OperFun<V, V | A> {
  if (arguments.length >= 2) {
    return function reduceOperFunWithSeed(
      source: Observable<V>
    ): Observable<V | A> {
      return pipe(
        scan(accumulator, seed),
        takeLast(1),
        defaultIfEmpty(seed)
      )(source);
    };
  }
  return function reduceOperFun(source: Observable<V>): Observable<V | A> {
    return pipe(
      scan<V, V | A>((acc, value, index) => accumulator(acc, value, index + 1)),
      takeLast(1)
    )(source);
  };
}

export function refCount<T>(): MonoOper<T> {
  return function refCountOperFun(source: Connectable<T>): Observable<T> {
    return source.lift(new RefCountOperator(source));
  } as MonoOper<T>;
}

class RefCountOperator<T> implements Operator<T, T> {
  constructor(private connectable: Connectable<T>) {}
  call(subscriber: Subscriber<T>, source: any): Closer {
    const {connectable} = this;
    (<any>connectable)._refCount++;

    const refCounter = new RefCountSubscriber(subscriber, connectable);
    const subscription = source.subscribe(refCounter);

    if (!refCounter.closed) {
      (<any>refCounter).connection = connectable.connect();
    }

    return subscription;
  }
}

class RefCountSubscriber<T> extends Subscriber<T> {
  private connection: Subscription | null = null;

  constructor(destination: Subscriber<T>, private connectable: Connectable<T>) {
    super(destination);
  }

  protected _unsubscribe() {
    const {connectable} = this;
    if (!connectable) {
      this.connection = null;
      return;
    }

    this.connectable = null!;
    const refCount = (connectable as any)._refCount;
    if (refCount <= 0) {
      this.connection = null;
      return;
    }

    (connectable as any)._refCount = refCount - 1;
    if (refCount > 1) {
      this.connection = null;
      return;
    }
    const {connection} = this;
    const sharedConnection = (<any>connectable)._connection;
    this.connection = null;

    if (sharedConnection && (!connection || sharedConnection === connection)) {
      sharedConnection.unsubscribe();
    }
  }
}

export function repeat<T>(count: number = -1): MonoOper<T> {
  return (source: Observable<T>) => {
    if (count === 0) {
      return EMPTY;
    } else if (count < 0) {
      return source.lift(new RepeatOperator(-1, source));
    } else {
      return source.lift(new RepeatOperator(count - 1, source));
    }
  };
}

class RepeatOperator<T> implements Operator<T, T> {
  constructor(private count: number, private source: Observable<T>) {}
  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new RepeatSubscriber(subscriber, this.count, this.source)
    );
  }
}

class RepeatSubscriber<T> extends Subscriber<T> {
  constructor(
    destination: Subscriber<any>,
    private count: number,
    private source: Observable<T>
  ) {
    super(destination);
  }
  complete() {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) {
        return super.complete();
      } else if (count > -1) {
        this.count = count - 1;
      }
      source.subscribe(this._recycle());
    }
  }
}

export function repeatWhen<T>(
  notifier: (notifications: Observable<any>) => Observable<any>
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new RepeatWhenOperator(notifier));
}

class RepeatWhenOperator<T> implements Operator<T, T> {
  constructor(
    protected notifier: (notifications: Observable<any>) => Observable<any>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new RepeatWhenSubscriber(subscriber, this.notifier, source)
    );
  }
}

class RepeatWhenSubscriber<T, R> extends OuterSubscriber<T, R> {
  private notifications: Subject<void> | null = null;
  private retries: Observable<any> | null = null;
  private retriesSubscription: Subscription | null | undefined = null;
  private sourceIsBeingSubscribedTo: boolean = true;

  constructor(
    destination: Subscriber<R>,
    private notifier: (notifications: Observable<any>) => Observable<any>,
    private source: Observable<T>
  ) {
    super(destination);
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.sourceIsBeingSubscribedTo = true;
    this.source.subscribe(this);
  }

  notifyComplete(innerSub: InnerSubscriber<T, R>): void {
    if (this.sourceIsBeingSubscribedTo === false) {
      return super.complete();
    }
  }

  complete() {
    this.sourceIsBeingSubscribedTo = false;

    if (!this.stopped) {
      if (!this.retries) {
        this.subscribeToRetries();
      }
      if (!this.retriesSubscription || this.retriesSubscription.closed) {
        return super.complete();
      }

      this._recycle();
      this.notifications!.next();
    }
  }

  _unsubscribe() {
    const {notifications, retriesSubscription} = this;
    if (notifications) {
      notifications.unsubscribe();
      this.notifications = null;
    }
    if (retriesSubscription) {
      retriesSubscription.unsubscribe();
      this.retriesSubscription = null;
    }
    this.retries = null;
  }

  _recycle(): Subscriber<T> {
    const {_unsubscribe} = this;

    this._unsubscribe = null!;
    super._recycle();
    this._unsubscribe = _unsubscribe;

    return this;
  }

  private subscribeToRetries() {
    this.notifications = new Subject();
    let retries;
    try {
      const {notifier} = this;
      retries = notifier(this.notifications);
    } catch (e) {
      return super.complete();
    }
    this.retries = retries;
    this.retriesSubscription = subscribeToResult(this, retries);
  }
}

export interface RetryConfig {
  count: number;
  resetOnSuccess?: boolean;
}

export function retry<T>(count?: number): MonoOper<T>;
export function retry<T>(config: RetryConfig): MonoOper<T>;
export function retry<T>(
  configOrCount: number | RetryConfig = -1
): MonoOper<T> {
  let config: RetryConfig;
  if (configOrCount && typeof configOrCount === 'object') {
    config = configOrCount as RetryConfig;
  } else {
    config = {
      count: configOrCount as number
    };
  }
  return (source: Observable<T>) =>
    source.lift(
      new RetryOperator(config.count, !!config.resetOnSuccess, source)
    );
}

class RetryOperator<T> implements Operator<T, T> {
  constructor(
    private count: number,
    private resetOnSuccess: boolean,
    private source: Observable<T>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
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

class RetrySubscriber<T> extends Subscriber<T> {
  private readonly initialCount: number;

  constructor(
    destination: Subscriber<any>,
    private count: number,
    private resetOnSuccess: boolean,
    private source: Observable<T>
  ) {
    super(destination);
    this.initialCount = this.count;
  }

  next(value?: T): void {
    super.next(value);
    if (this.resetOnSuccess) {
      this.count = this.initialCount;
    }
  }

  error(err: any) {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) {
        return super.error(err);
      } else if (count > -1) {
        this.count = count - 1;
      }
      source.subscribe(this._recycle());
    }
  }
}

export function retryWhen<T>(
  notifier: (errors: Observable<any>) => Observable<any>
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new RetryWhenOperator(notifier, source));
}

class RetryWhenOperator<T> implements Operator<T, T> {
  constructor(
    protected notifier: (errors: Observable<any>) => Observable<any>,
    protected source: Observable<T>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new RetryWhenSubscriber(subscriber, this.notifier, this.source)
    );
  }
}

class RetryWhenSubscriber<T, R> extends OuterSubscriber<T, R> {
  private errors: Subject<any> | null = null;
  private retries: Observable<any> | null = null;
  private retriesSubscription: Subscription | null | undefined = null;

  constructor(
    destination: Subscriber<R>,
    private notifier: (errors: Observable<any>) => Observable<any>,
    private source: Observable<T>
  ) {
    super(destination);
  }

  error(err: any) {
    if (!this.stopped) {
      let errors = this.errors;
      let retries = this.retries;
      let retriesSubscription = this.retriesSubscription;

      if (!retries) {
        errors = new Subject();
        try {
          const {notifier} = this;
          retries = notifier(errors);
        } catch (e) {
          return super.error(e);
        }
        retriesSubscription = subscribeToResult(this, retries);
      } else {
        this.errors = null;
        this.retriesSubscription = null;
      }

      this._recycle();

      this.errors = errors;
      this.retries = retries;
      this.retriesSubscription = retriesSubscription;

      errors!.next(err);
    }
  }

  _unsubscribe() {
    const {errors, retriesSubscription} = this;
    if (errors) {
      errors.unsubscribe();
      this.errors = null;
    }
    if (retriesSubscription) {
      retriesSubscription.unsubscribe();
      this.retriesSubscription = null;
    }
    this.retries = null;
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    const {_unsubscribe} = this;

    this._unsubscribe = null!;
    this._recycle();
    this._unsubscribe = _unsubscribe;

    this.source.subscribe(this);
  }
}

export function sample<T>(notifier: Observable<any>): MonoOper<T> {
  return (source: Observable<T>) => source.lift(new SampleOperator(notifier));
}

class SampleOperator<T> implements Operator<T, T> {
  constructor(private notifier: Observable<any>) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    const sampleSubscriber = new SampleSubscriber(subscriber);
    const subscription = source.subscribe(sampleSubscriber);
    subscription.add(subscribeToResult(sampleSubscriber, this.notifier));
    return subscription;
  }
}

class SampleSubscriber<T, R> extends OuterSubscriber<T, R> {
  private value: T | undefined;
  private hasValue: boolean = false;

  protected _next(value: T) {
    this.value = value;
    this.hasValue = true;
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.emitValue();
  }

  notifyComplete(): void {
    this.emitValue();
  }

  emitValue() {
    if (this.hasValue) {
      this.hasValue = false;
      this.dst.next(this.value);
    }
  }
}

export function sampleTime<T>(
  period: number,
  scheduler: SchedulerLike = async
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new SampleTimeOperator(period, scheduler));
}

class SampleTimeOperator<T> implements Operator<T, T> {
  constructor(private period: number, private scheduler: SchedulerLike) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new SampleTimeSubscriber(subscriber, this.period, this.scheduler)
    );
  }
}

class SampleTimeSubscriber<T> extends Subscriber<T> {
  lastValue: T | undefined;
  hasValue: boolean = false;

  constructor(
    destination: Subscriber<T>,
    private period: number,
    private scheduler: SchedulerLike
  ) {
    super(destination);
    this.add(
      scheduler.schedule(dispatchNotification, period, {
        subscriber: this,
        period
      })
    );
  }

  protected _next(value: T) {
    this.lastValue = value;
    this.hasValue = true;
  }

  notifyNext() {
    if (this.hasValue) {
      this.hasValue = false;
      this.dst.next(this.lastValue);
    }
  }
}

function dispatchNotification<T>(this: SchedulerAction<any>, state: any) {
  let {subscriber, period} = state;
  subscriber.notifyNext();
  this.schedule(state, period);
}

export function scan<V, A = V>(
  accumulator: (acc: A | V, value: V, index: number) => A
): OperFun<V, V | A>;
export function scan<V, A>(
  accumulator: (acc: A, value: V, index: number) => A,
  seed: A
): OperFun<V, A>;
export function scan<V, A, S>(
  accumulator: (acc: A | S, value: V, index: number) => A,
  seed: S
): OperFun<V, A>;
export function scan<V, A, S>(
  accumulator: (acc: V | A | S, value: V, index: number) => A,
  seed?: S
): OperFun<V, V | A> {
  let hasSeed = false;
  if (arguments.length >= 2) {
    hasSeed = true;
  }

  return function scanOperFun(source: Observable<V>) {
    return source.lift(new ScanOperator(accumulator, seed, hasSeed));
  };
}

class ScanOperator<V, A, S> implements Operator<V, A> {
  constructor(
    private accumulator: (acc: V | A | S, value: V, index: number) => A,
    private seed?: S,
    private hasSeed: boolean = false
  ) {}

  call(subscriber: Subscriber<A>, source: any): Closer {
    return source.subscribe(
      new ScanSubscriber(subscriber, this.accumulator, this.seed, this.hasSeed)
    );
  }
}

class ScanSubscriber<V, A> extends Subscriber<V> {
  private index: number = 0;

  constructor(
    destination: Subscriber<A>,
    private accumulator: (acc: V | A, value: V, index: number) => A,
    private _state: any,
    private _hasState: boolean
  ) {
    super(destination);
  }

  protected _next(value: V): void {
    const {destination} = this;
    if (!this._hasState) {
      this._state = value;
      this._hasState = true;
      destination.next(value);
    } else {
      const index = this.index++;
      let result: A;
      try {
        result = this.accumulator(this._state, value, index);
      } catch (err) {
        destination.error(err);
        return;
      }
      this._state = result;
      destination.next(result);
    }
  }
}

export function sequenceEqual<T>(
  compareTo: Observable<T>,
  comparator?: (a: T, b: T) => boolean
): OperFun<T, boolean> {
  return (source: Observable<T>) =>
    source.lift(new SequenceEqualOperator(compareTo, comparator));
}

export class SequenceEqualOperator<T> implements Operator<T, boolean> {
  constructor(
    private compareTo: Observable<T>,
    private comparator?: (a: T, b: T) => boolean
  ) {}

  call(subscriber: Subscriber<boolean>, source: any): any {
    return source.subscribe(
      new SequenceEqualSubscriber(subscriber, this.compareTo, this.comparator)
    );
  }
}

export class SequenceEqualSubscriber<T, R> extends Subscriber<T> {
  private _a: T[] = [];
  private _b: T[] = [];
  private _oneComplete = false;

  constructor(
    destination: Observer<R>,
    private compareTo: Observable<T>,
    private comparator?: (a: T, b: T) => boolean
  ) {
    super(destination);
    (this.destination as Subscription).add(
      compareTo.subscribe(
        new SequenceEqualCompareToSubscriber(destination, this)
      )
    );
  }

  protected _next(v: T) {
    if (this._oneComplete && this._b.length === 0) {
      this.emit(false);
    } else {
      this._a.push(value);
      this.checkValues();
    }
  }

  public _complete(): void {
    if (this._oneComplete) {
      this.emit(this._a.length === 0 && this._b.length === 0);
    } else {
      this._oneComplete = true;
    }
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
        this.dst.error(e);
      }
      if (!areEqual) {
        this.emit(false);
      }
    }
  }

  emit(value: boolean) {
    const {destination} = this;
    destination.next(value);
    destination.complete();
  }

  nextB(value: T) {
    if (this._oneComplete && this._a.length === 0) {
      this.emit(false);
    } else {
      this._b.push(value);
      this.checkValues();
    }
  }

  completeB() {
    if (this._oneComplete) {
      this.emit(this._a.length === 0 && this._b.length === 0);
    } else {
      this._oneComplete = true;
    }
  }
}

class SequenceEqualCompareToSubscriber<T, R> extends Subscriber<T> {
  constructor(
    destination: Observer<R>,
    private parent: SequenceEqualSubscriber<T, R>
  ) {
    super(destination);
  }

  protected _next(v: T) {
    this.parent.nextB(value);
  }

  protected _error(e: any) {
    this.parent.error(err);
    this.unsubscribe();
  }

  protected _complete() {
    this.parent.completeB();
    this.unsubscribe();
  }
}

function shareSubjectFactory() {
  return new Subject<any>();
}

export function share<T>(): MonoOper<T> {
  return (source: Observable<T>) =>
    refCount()(multicast(shareSubjectFactory)(source)) as Observable<T>;
}

export interface ShareReplayConfig {
  bufferSize?: number;
  windowTime?: number;
  refCount: boolean;
  scheduler?: SchedulerLike;
}

export function shareReplay<T>(config: ShareReplayConfig): MonoOper<T>;
export function shareReplay<T>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: SchedulerLike
): MonoOper<T>;
export function shareReplay<T>(
  configOrBufferSize?: ShareReplayConfig | number,
  windowTime?: number,
  scheduler?: SchedulerLike
): MonoOper<T> {
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
  return (source: Observable<T>) => source.lift(shareReplayOperator(config));
}

function shareReplayOperator<T>({
  bufferSize = Number.POSITIVE_INFINITY,
  windowTime = Number.POSITIVE_INFINITY,
  refCount: useRefCount,
  scheduler
}: ShareReplayConfig) {
  let subject: ReplaySubject<T> | undefined;
  let refCount = 0;
  let subscription: Subscription | undefined;
  let hasError = false;
  let isComplete = false;

  return function shareReplayOperation(
    this: Subscriber<T>,
    source: Observable<T>
  ) {
    refCount++;
    if (!subject || hasError) {
      hasError = false;
      subject = new ReplaySubject<T>(bufferSize, windowTime, scheduler);
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

export function single<T>(
  predicate?: (value: T, index: number, source: Observable<T>) => boolean
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new SingleOperator(predicate, source));
}

class SingleOperator<T> implements Operator<T, T> {
  constructor(
    private predicate:
      | ((value: T, index: number, source: Observable<T>) => boolean)
      | undefined,
    private source: Observable<T>
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new SingleSubscriber(subscriber, this.predicate, this.source)
    );
  }
}

class SingleSubscriber<T> extends Subscriber<T> {
  private seenValue: boolean = false;
  private singleValue: T | undefined;
  private index: number = 0;

  constructor(
    destination: Observer<T>,
    private predicate:
      | ((value: T, index: number, source: Observable<T>) => boolean)
      | undefined,
    private source: Observable<T>
  ) {
    super(destination);
  }

  private applySingleValue(value: T): void {
    if (this.seenValue) {
      this.dst.error('Sequence contains more than one element');
    } else {
      this.seenValue = true;
      this.singleValue = value;
    }
  }

  protected _next(v: T) {
    const index = this.index++;

    if (this.predicate) {
      this.tryNext(value, index);
    } else {
      this.applySingleValue(value);
    }
  }

  private tryNext(value: T, index: number): void {
    try {
      if (this.predicate!(value, index, this.source)) {
        this.applySingleValue(value);
      }
    } catch (err) {
      this.dst.error(err);
    }
  }

  protected _complete() {
    const destination = this.destination;

    if (this.index > 0) {
      destination.next(this.seenValue ? this.singleValue : undefined);
      destination.complete();
    } else {
      destination.error(new EmptyError());
    }
  }
}

export function skip<T>(count: number): MonoOper<T> {
  return (source: Observable<T>) => source.lift(new SkipOperator(count));
}

class SkipOperator<T> implements Operator<T, T> {
  constructor(private total: number) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(new SkipSubscriber(subscriber, this.total));
  }
}

class SkipSubscriber<T> extends Subscriber<T> {
  count: number = 0;

  constructor(destination: Subscriber<T>, private total: number) {
    super(destination);
  }
  protected _next(x: T) {
    if (++this.count > this.total) {
      this.dst.next(x);
    }
  }
}

export function skipLast<T>(count: number): MonoOper<T> {
  return (source: Observable<T>) => source.lift(new SkipLastOperator(count));
}

class SkipLastOperator<T> implements Operator<T, T> {
  constructor(private _skipCount: number) {
    if (this._skipCount < 0) {
      throw new OutOfRangeError();
    }
  }

  call(subscriber: Subscriber<T>, source: any): Closer {
    if (this._skipCount === 0) {
      return source.subscribe(new Subscriber(subscriber));
    } else {
      return source.subscribe(
        new SkipLastSubscriber(subscriber, this._skipCount)
      );
    }
  }
}

class SkipLastSubscriber<T> extends Subscriber<T> {
  private _ring: T[];
  private _count: number = 0;

  constructor(destination: Subscriber<T>, private _skipCount: number) {
    super(destination);
    this._ring = new Array<T>(_skipCount);
  }

  protected _next(v: T) {
    const skipCount = this._skipCount;
    const count = this._count++;

    if (count < skipCount) {
      this._ring[count] = value;
    } else {
      const currentIndex = count % skipCount;
      const ring = this._ring;
      const oldValue = ring[currentIndex];

      ring[currentIndex] = value;
      this.dst.next(oldValue);
    }
  }
}

export function skipUntil<T>(notifier: Observable<any>): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new SkipUntilOperator(notifier));
}

class SkipUntilOperator<T> implements Operator<T, T> {
  constructor(private notifier: Observable<any>) {}

  call(destination: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new SkipUntilSubscriber(destination, this.notifier)
    );
  }
}

class SkipUntilSubscriber<T, R> extends OuterSubscriber<T, R> {
  private hasValue: boolean = false;
  private innerSubscription: Subscription | undefined;

  constructor(destination: Subscriber<R>, notifier: ObservableInput<any>) {
    super(destination);
    const innerSubscriber = new InnerSubscriber(this, undefined, undefined!);
    this.add(innerSubscriber);
    this.innerSubscription = innerSubscriber;
    const innerSubscription = subscribeToResult(
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

  protected _next(value: T) {
    if (this.hasValue) {
      super._next(value);
    }
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.hasValue = true;
    if (this.innerSubscription) {
      this.innerSubscription.unsubscribe();
    }
  }

  notifyComplete() {
    /* do nothing */
  }
}

export function skipWhile<T>(
  predicate: (value: T, index: number) => boolean
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new SkipWhileOperator(predicate));
}

class SkipWhileOperator<T> implements Operator<T, T> {
  constructor(private predicate: (value: T, index: number) => boolean) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new SkipWhileSubscriber(subscriber, this.predicate)
    );
  }
}

class SkipWhileSubscriber<T> extends Subscriber<T> {
  private skipping: boolean = true;
  private index: number = 0;

  constructor(
    destination: Subscriber<T>,
    private predicate: (value: T, index: number) => boolean
  ) {
    super(destination);
  }
  protected _next(v: T) {
    const destination = this.destination;
    if (this.skipping) {
      this.tryCallPredicate(value);
    }

    if (!this.skipping) {
      destination.next(value);
    }
  }

  private tryCallPredicate(value: T): void {
    try {
      const result = this.predicate(value, this.index++);
      this.skipping = Boolean(result);
    } catch (err) {
      this.dst.error(err);
    }
  }
}

export function startWith<T, A extends any[]>(
  ...values: A
): OperFun<T, T | ValueFromArray<A>>;
export function startWith<T, D>(...values: D[]): OperFun<T, T | D> {
  const scheduler = values[values.length - 1];
  if (isScheduler(scheduler)) {
    values.pop();
    return (source: Observable<T>) => concatStatic(values, source, scheduler);
  } else {
    return (source: Observable<T>) => concatStatic(values, source);
  }
}

export function subscribeOn<T>(
  scheduler: SchedulerLike,
  delay: number = 0
): MonoOper<T> {
  return function subscribeOnOperFun(source: Observable<T>): Observable<T> {
    return source.lift(new SubscribeOnOperator<T>(scheduler, delay));
  };
}

class SubscribeOnOperator<T> implements Operator<T, T> {
  constructor(private scheduler: SchedulerLike, private delay: number) {}
  call(subscriber: Subscriber<T>, source: any): Closer {
    return new SubscribeOnObservable<T>(
      source,
      this.delay,
      this.scheduler
    ).subscribe(subscriber);
  }
}

export function switchAll<T>(): OperFun<ObservableInput<T>, T>;
export function switchAll<R>(): OperFun<any, R>;
export function switchAll<T>(): OperFun<ObservableInput<T>, T> {
  return switchMap(identity);
}

export function switchMap<T, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O
): OperFun<T, ObservedValueOf<O>>;
export function switchMap<T, R, O extends ObservableInput<any>>(
  project: (value: T, index: number) => O,
  resultSelector?: (
    outerValue: T,
    innerValue: ObservedValueOf<O>,
    outerIndex: number,
    innerIndex: number
  ) => R
): OperFun<T, ObservedValueOf<O> | R> {
  if (typeof resultSelector === 'function') {
    return (source: Observable<T>) =>
      source.pipe(
        switchMap((a, i) =>
          from(project(a, i)).pipe(map((b, ii) => resultSelector(a, b, i, ii)))
        )
      );
  }
  return (source: Observable<T>) => source.lift(new SwitchMapOperator(project));
}

class SwitchMapOperator<T, R> implements Operator<T, R> {
  constructor(
    private project: (value: T, index: number) => ObservableInput<R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new SwitchMapSubscriber(subscriber, this.project));
  }
}

class SwitchMapSubscriber<T, R> extends OuterSubscriber<T, R> {
  private index: number = 0;
  private innerSubscription: Subscription | null | undefined;

  constructor(
    destination: Subscriber<R>,
    private project: (value: T, index: number) => ObservableInput<R>
  ) {
    super(destination);
  }

  protected _next(value: T) {
    let result: ObservableInput<R>;
    const index = this.index++;
    try {
      result = this.project(value, index);
    } catch (error) {
      this.dst.error(error);
      return;
    }
    this._innerSub(result, value, index);
  }

  private _innerSub(result: ObservableInput<R>, value: T, index: number) {
    const innerSubscription = this.innerSubscription;
    if (innerSubscription) {
      innerSubscription.unsubscribe();
    }
    const innerSubscriber = new InnerSubscriber(this, value, index);
    const destination = this.destination as Subscription;
    destination.add(innerSubscriber);
    this.innerSubscription = subscribeToResult(
      this,
      result,
      undefined,
      undefined,
      innerSubscriber
    );
    if (this.innerSubscription !== innerSubscriber) {
      destination.add(this.innerSubscription);
    }
  }

  protected _complete() {
    const {innerSubscription} = this;
    if (!innerSubscription || innerSubscription.closed) {
      super._complete();
    }
    this.unsubscribe();
  }

  protected _unsubscribe() {
    this.innerSubscription = null!;
  }

  notifyComplete(innerSub: Subscription): void {
    const destination = this.destination as Subscription;
    destination.remove(innerSub);
    this.innerSubscription = null!;
    if (this.stopped) {
      super._complete();
    }
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.dst.next(innerValue);
  }
}

export function switchMapTo<R>(observable: ObservableInput<R>): OperFun<any, R>;
export function switchMapTo<T, I, R>(
  innerObservable: ObservableInput<I>,
  resultSelector?: (
    outerValue: T,
    innerValue: I,
    outerIndex: number,
    innerIndex: number
  ) => R
): OperFun<T, I | R> {
  return resultSelector
    ? switchMap(() => innerObservable, resultSelector)
    : switchMap(() => innerObservable);
}

export function take<T>(count: number): MonoOper<T> {
  return (source: Observable<T>) => {
    if (count === 0) {
      return EMPTY;
    } else {
      return source.lift(new TakeOperator(count));
    }
  };
}

class TakeOperator<T> implements Operator<T, T> {
  constructor(private total: number) {
    if (this.total < 0) {
      throw new OutOfRangeError();
    }
  }

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(new TakeSubscriber(subscriber, this.total));
  }
}

class TakeSubscriber<T> extends Subscriber<T> {
  private count: number = 0;

  constructor(destination: Subscriber<T>, private total: number) {
    super(destination);
  }

  protected _next(v: T) {
    const total = this.total;
    const count = ++this.count;
    if (count <= total) {
      this.dst.next(value);
      if (count === total) {
        this.dst.complete();
        this.unsubscribe();
      }
    }
  }
}

export function takeLast<T>(count: number): MonoOper<T> {
  return function takeLastOperFun(source: Observable<T>): Observable<T> {
    if (count === 0) {
      return EMPTY;
    } else {
      return source.lift(new TakeLastOperator(count));
    }
  };
}

class TakeLastOperator<T> implements Operator<T, T> {
  constructor(private total: number) {
    if (this.total < 0) {
      throw new OutOfRangeError();
    }
  }

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(new TakeLastSubscriber(subscriber, this.total));
  }
}

class TakeLastSubscriber<T> extends Subscriber<T> {
  private ring: Array<T> = new Array();
  private count: number = 0;

  constructor(destination: Subscriber<T>, private total: number) {
    super(destination);
  }

  protected _next(v: T) {
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

  protected _complete() {
    const destination = this.destination;
    let count = this.count;

    if (count > 0) {
      const total = this.count >= this.total ? this.total : this.count;
      const ring = this.ring;

      for (let i = 0; i < total; i++) {
        const idx = count++ % total;
        destination.next(ring[idx]);
      }
    }

    destination.complete();
  }
}

export function takeUntil<T>(notifier: Observable<any>): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new TakeUntilOperator(notifier));
}

class TakeUntilOperator<T> implements Operator<T, T> {
  constructor(private notifier: Observable<any>) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    const takeUntilSubscriber = new TakeUntilSubscriber(subscriber);
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

class TakeUntilSubscriber<T, R> extends OuterSubscriber<T, R> {
  seenValue = false;

  constructor(destination: Subscriber<any>) {
    super(destination);
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.seenValue = true;
    this.complete();
  }

  notifyComplete(): void {
    // noop
  }
}

export function takeWhile<T, S extends T>(
  predicate: (value: T, index: number) => value is S
): OperFun<T, S>;
export function takeWhile<T, S extends T>(
  predicate: (value: T, index: number) => value is S,
  inclusive: false
): OperFun<T, S>;
export function takeWhile<T>(
  predicate: (value: T, index: number) => boolean,
  inclusive?: boolean
): MonoOper<T>;
export function takeWhile<T>(
  predicate: (value: T, index: number) => boolean,
  inclusive = false
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(new TakeWhileOperator(predicate, inclusive));
}

class TakeWhileOperator<T> implements Operator<T, T> {
  constructor(
    private predicate: (value: T, index: number) => boolean,
    private inclusive: boolean
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new TakeWhileSubscriber(subscriber, this.predicate, this.inclusive)
    );
  }
}

class TakeWhileSubscriber<T> extends Subscriber<T> {
  private index: number = 0;

  constructor(
    destination: Subscriber<T>,
    private predicate: (value: T, index: number) => boolean,
    private inclusive: boolean
  ) {
    super(destination);
  }

  protected _next(v: T) {
    const destination = this.destination;
    let result: boolean;
    try {
      result = this.predicate(value, this.index++);
    } catch (err) {
      destination.error(err);
      return;
    }
    this.nextOrComplete(value, result);
  }

  private nextOrComplete(value: T, predicateResult: boolean): void {
    const destination = this.destination;
    if (Boolean(predicateResult)) {
      destination.next(value);
    } else {
      if (this.inclusive) {
        destination.next(value);
      }
      destination.complete();
    }
  }
}

export function tap<T>(
  next?: (x: T) => void,
  error?: (e: any) => void,
  complete?: () => void
): MonoOper<T>;
export function tap<T>(observer: Target<T>): MonoOper<T>;
export function tap<T>(
  nextOrObserver?: Target<T> | ((x: T) => void) | null,
  error?: ((e: any) => void) | null,
  complete?: (() => void) | null
): MonoOper<T> {
  return function tapOperFun(source: Observable<T>): Observable<T> {
    return source.lift(new DoOperator(nextOrObserver, error, complete));
  };
}

class DoOperator<T> implements Operator<T, T> {
  constructor(
    private nextOrObserver?: Target<T> | ((x: T) => void) | null,
    private error?: ((e: any) => void) | null,
    private complete?: (() => void) | null
  ) {}
  call(subscriber: Subscriber<T>, source: any): Closer {
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

class TapSubscriber<T> extends Subscriber<T> {
  private _context: any;

  private _tapNext: (value: T) => void = noop;

  private _tapError: (err: any) => void = noop;

  private _tapComplete: () => void = noop;

  constructor(
    destination: Subscriber<T>,
    observerOrNext?: Target<T> | ((value: T) => void) | null,
    error?: ((e?: any) => void) | null,
    complete?: (() => void) | null
  ) {
    super(destination);
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

  _next(value: T) {
    try {
      this._tapNext.call(this._context, value);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    this.dst.next(value);
  }

  _error(err: any) {
    try {
      this._tapError.call(this._context, err);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    this.dst.error(err);
  }

  _complete() {
    try {
      this._tapComplete.call(this._context);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    return this.dst.complete();
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

export function throttle<T>(
  durationSelector: (value: T) => SubscribableOrPromise<any>,
  config: ThrottleConfig = defaultThrottleConfig
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(
      new ThrottleOperator(
        durationSelector,
        !!config.leading,
        !!config.trailing
      )
    );
}

class ThrottleOperator<T> implements Operator<T, T> {
  constructor(
    private durationSelector: (value: T) => SubscribableOrPromise<any>,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
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

class ThrottleSubscriber<T, R> extends OuterSubscriber<T, R> {
  private _throttled: Subscription | null | undefined;
  private _sendValue: T | null = null;
  private _hasValue = false;

  constructor(
    protected destination: Subscriber<T>,
    private durationSelector: (value: T) => SubscribableOrPromise<number>,
    private _leading: boolean,
    private _trailing: boolean
  ) {
    super(destination);
  }

  protected _next(v: T) {
    this._hasValue = true;
    this._sendValue = value;

    if (!this._throttled) {
      if (this._leading) {
        this.send();
      } else {
        this.throttle(value);
      }
    }
  }

  private send() {
    const {_hasValue, _sendValue} = this;
    if (_hasValue) {
      this.dst.next(_sendValue!);
      this.throttle(_sendValue!);
    }
    this._hasValue = false;
    this._sendValue = null;
  }

  private throttle(value: T): void {
    const duration = this.tryDurationSelector(value);
    if (!!duration) {
      this.add((this._throttled = subscribeToResult(this, duration)));
    }
  }

  private tryDurationSelector(value: T): SubscribableOrPromise<any> | null {
    try {
      return this.durationSelector(value);
    } catch (err) {
      this.dst.error(err);
      return null;
    }
  }

  private throttlingDone() {
    const {_throttled, _trailing} = this;
    if (_throttled) {
      _throttled.unsubscribe();
    }
    this._throttled = null;

    if (_trailing) {
      this.send();
    }
  }

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.throttlingDone();
  }

  notifyComplete(): void {
    this.throttlingDone();
  }
}

export function throttleTime<T>(
  duration: number,
  scheduler: SchedulerLike = async,
  config: ThrottleConfig = defaultThrottleConfig
): MonoOper<T> {
  return (source: Observable<T>) =>
    source.lift(
      new ThrottleTimeOperator(
        duration,
        scheduler,
        !!config.leading,
        !!config.trailing
      )
    );
}

class ThrottleTimeOperator<T> implements Operator<T, T> {
  constructor(
    private duration: number,
    private scheduler: SchedulerLike,
    private leading: boolean,
    private trailing: boolean
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
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

class ThrottleTimeSubscriber<T> extends Subscriber<T> {
  private throttled: Subscription | null = null;
  private _hasTrailingValue: boolean = false;
  private _trailingValue: T | null = null;

  constructor(
    destination: Subscriber<T>,
    private duration: number,
    private scheduler: SchedulerLike,
    private leading: boolean,
    private trailing: boolean
  ) {
    super(destination);
  }

  protected _next(value: T) {
    if (this.throttled) {
      if (this.trailing) {
        this._trailingValue = value;
        this._hasTrailingValue = true;
      }
    } else {
      this.add(
        (this.throttled = this.scheduler.schedule<DispatchArg<T>>(
          dispatchNext as any,
          this.duration,
          {subscriber: this}
        ))
      );
      if (this.leading) {
        this.dst.next(value);
      } else if (this.trailing) {
        this._trailingValue = value;
        this._hasTrailingValue = true;
      }
    }
  }

  protected _complete() {
    if (this._hasTrailingValue) {
      this.dst.next(this._trailingValue);
      this.dst.complete();
    } else {
      this.dst.complete();
    }
  }

  clearThrottle() {
    const throttled = this.throttled;
    if (throttled) {
      if (this.trailing && this._hasTrailingValue) {
        this.dst.next(this._trailingValue);
        this._trailingValue = null;
        this._hasTrailingValue = false;
      }
      throttled.unsubscribe();
      this.remove(throttled);
      this.throttled = null!;
    }
  }
}

interface DispatchArg<T> {
  subscriber: ThrottleTimeSubscriber<T>;
}

function dispatchNext<T>(arg: DispatchArg<T>) {
  const {subscriber} = arg;
  subscriber.clearThrottle();
}

export function throwIfEmpty<T>(
  errorFactory: () => any = defaultErrorFactory
): MonoOper<T> {
  return (source: Observable<T>) => {
    return source.lift(new ThrowIfEmptyOperator(errorFactory));
  };
}

class ThrowIfEmptyOperator<T> implements Operator<T, T> {
  constructor(private errorFactory: () => any) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(
      new ThrowIfEmptySubscriber(subscriber, this.errorFactory)
    );
  }
}

class ThrowIfEmptySubscriber<T> extends Subscriber<T> {
  private hasValue: boolean = false;

  constructor(destination: Subscriber<T>, private errorFactory: () => any) {
    super(destination);
  }

  protected _next(v: T) {
    this.hasValue = true;
    this.dst.next(value);
  }

  protected _complete() {
    if (!this.hasValue) {
      let err: any;
      try {
        err = this.errorFactory();
      } catch (e) {
        err = e;
      }
      this.dst.error(err);
    } else {
      return this.dst.complete();
    }
  }
}

function defaultErrorFactory() {
  return new EmptyError();
}

export function timeInterval<T>(
  scheduler: SchedulerLike = async
): OperFun<T, TimeInterval<T>> {
  return (source: Observable<T>) =>
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
        ) as OperFun<T, any>,
        map<any, TimeInterval<T>>(
          ({current, last, value}) => new TimeInterval(value, current - last)
        )
      );
    });
}

export class TimeInterval<T> {
  constructor(public value: T, public interval: number) {}
}

export function timeout<T>(
  due: number | Date,
  scheduler: SchedulerLike = async
): MonoOper<T> {
  return timeoutWith(due, throwError(new TimeoutError()), scheduler);
}

export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: ObservableInput<R>,
  scheduler?: SchedulerLike
): OperFun<T, T | R>;
export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: ObservableInput<R>,
  scheduler: SchedulerLike = async
): OperFun<T, T | R> {
  return (source: Observable<T>) => {
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

class TimeoutWithOperator<T> implements Operator<T, T> {
  constructor(
    private waitFor: number,
    private absoluteTimeout: boolean,
    private withObservable: ObservableInput<any>,
    private scheduler: SchedulerLike
  ) {}

  call(subscriber: Subscriber<T>, source: any): Closer {
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

class TimeoutWithSubscriber<T, R> extends OuterSubscriber<T, R> {
  private action: SchedulerAction<TimeoutWithSubscriber<T, R>> | null = null;

  constructor(
    destination: Subscriber<T>,
    private absoluteTimeout: boolean,
    private waitFor: number,
    private withObservable: ObservableInput<any>,
    private scheduler: SchedulerLike
  ) {
    super(destination);
    this.scheduleTimeout();
  }

  private static dispatchTimeout<T, R>(
    subscriber: TimeoutWithSubscriber<T, R>
  ): void {
    const {withObservable} = subscriber;
    (<any>subscriber)._recycle();
    subscriber.add(subscribeToResult(subscriber, withObservable));
  }

  private scheduleTimeout(): void {
    const {action} = this;
    if (action) {
      this.action = <SchedulerAction<TimeoutWithSubscriber<T, R>>>(
        action.schedule(this, this.waitFor)
      );
    } else {
      this.add(
        (this.action = <SchedulerAction<TimeoutWithSubscriber<T, R>>>(
          this.scheduler.schedule<TimeoutWithSubscriber<T, R>>(
            TimeoutWithSubscriber.dispatchTimeout as any,
            this.waitFor,
            this
          )
        ))
      );
    }
  }

  protected _next(v: T) {
    if (!this.absoluteTimeout) {
      this.scheduleTimeout();
    }
    super._next(value);
  }

  _unsubscribe() {
    this.action = null;
    this.scheduler = null!;
    this.withObservable = null!;
  }
}

export function timestamp<T>(
  timestampProvider: TimestampProvider = Date
): OperFun<T, Timestamp<T>> {
  return map((value: T) => ({value, timestamp: timestampProvider.now()}));
}

function toArrayReducer<T>(arr: T[], item: T, index: number): T[] {
  if (index === 0) {
    return [item];
  }
  arr.push(item);
  return arr;
}

export function toArray<T>(): OperFun<T, T[]> {
  return reduce(toArrayReducer, [] as T[]);
}

export function window<T>(
  windowBoundaries: Observable<any>
): OperFun<T, Observable<T>> {
  return function windowOperFun(source: Observable<T>) {
    return source.lift(new WindowOperator(windowBoundaries));
  };
}

class WindowOperator<T> implements Operator<T, Observable<T>> {
  constructor(private windowBoundaries: Observable<any>) {}

  call(subscriber: Subscriber<Observable<T>>, source: any): any {
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

class WindowSubscriber<T> extends OuterSubscriber<T, any> {
  private window: Subject<T> = new Subject<T>();

  constructor(destination: Subscriber<Observable<T>>) {
    super(destination);
    destination.next(this.window);
  }

  notifyNext(
    outerValue: T,
    innerValue: any,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, any>
  ): void {
    this.openWindow();
  }

  notifyError(error: any, innerSub: InnerSubscriber<T, any>): void {
    this._error(error);
  }

  notifyComplete(innerSub: InnerSubscriber<T, any>): void {
    this._complete();
  }

  protected _next(v: T) {
    this.window.next(value);
  }

  protected _error(e: any) {
    this.window.error(err);
    this.dst.error(err);
  }

  protected _complete() {
    this.window.complete();
    this.dst.complete();
  }

  _unsubscribe() {
    this.window = null!;
  }

  private openWindow(): void {
    const prevWindow = this.window;
    if (prevWindow) {
      prevWindow.complete();
    }
    const destination = this.destination;
    const newWindow = (this.window = new Subject<T>());
    destination.next(newWindow);
  }
}

export function windowCount<T>(
  windowSize: number,
  startWindowEvery: number = 0
): OperFun<T, Observable<T>> {
  return function windowCountOperFun(source: Observable<T>) {
    return source.lift(
      new WindowCountOperator<T>(windowSize, startWindowEvery)
    );
  };
}

class WindowCountOperator<T> implements Operator<T, Observable<T>> {
  constructor(private windowSize: number, private startWindowEvery: number) {}

  call(subscriber: Subscriber<Observable<T>>, source: any): any {
    return source.subscribe(
      new WindowCountSubscriber(
        subscriber,
        this.windowSize,
        this.startWindowEvery
      )
    );
  }
}

class WindowCountSubscriber<T> extends Subscriber<T> {
  private windows: Subject<T>[] = [new Subject<T>()];
  private count: number = 0;

  constructor(
    protected destination: Subscriber<Observable<T>>,
    private windowSize: number,
    private startWindowEvery: number
  ) {
    super(destination);
    destination.next(this.windows[0]);
  }

  protected _next(value: T) {
    const startWindowEvery =
      this.startWindowEvery > 0 ? this.startWindowEvery : this.windowSize;
    const destination = this.destination;
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
      const window = new Subject<T>();
      windows.push(window);
      destination.next(window);
    }
  }

  protected _error(err: any) {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.error(err);
      }
    }
    this.dst.error(err);
  }

  protected _complete() {
    const windows = this.windows;
    if (windows) {
      while (windows.length > 0 && !this.closed) {
        windows.shift()!.complete();
      }
    }
    this.dst.complete();
  }

  protected _unsubscribe() {
    this.count = 0;
    this.windows = null!;
  }
}

export function windowTime<T>(
  windowTimeSpan: number,
  scheduler?: SchedulerLike
): OperFun<T, Observable<T>>;
export function windowTime<T>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  scheduler?: SchedulerLike
): OperFun<T, Observable<T>>;
export function windowTime<T>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  maxWindowSize: number,
  scheduler?: SchedulerLike
): OperFun<T, Observable<T>>;

export function windowTime<T>(
  windowTimeSpan: number
): OperFun<T, Observable<T>> {
  let scheduler: SchedulerLike = async;
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

  return function windowTimeOperFun(source: Observable<T>) {
    return source.lift(
      new WindowTimeOperator<T>(
        windowTimeSpan,
        windowCreationInterval,
        maxWindowSize,
        scheduler
      )
    );
  };
}

class WindowTimeOperator<T> implements Operator<T, Observable<T>> {
  constructor(
    private windowTimeSpan: number,
    private windowCreationInterval: number | null,
    private maxWindowSize: number,
    private scheduler: SchedulerLike
  ) {}

  call(subscriber: Subscriber<Observable<T>>, source: any): any {
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

interface CreationState<T> {
  windowTimeSpan: number;
  windowCreationInterval: number;
  subscriber: WindowTimeSubscriber<T>;
  scheduler: SchedulerLike;
}

interface TimeSpanOnlyState<T> {
  window: CountedSubject<T>;
  windowTimeSpan: number;
  subscriber: WindowTimeSubscriber<T>;
}

interface CloseWindowContext<T> {
  action: SchedulerAction<CreationState<T>>;
  subscription: Subscription;
}

interface CloseState<T> {
  subscriber: WindowTimeSubscriber<T>;
  window: CountedSubject<T>;
  context: CloseWindowContext<T>;
}

class CountedSubject<T> extends Subject<T> {
  private _numberOfNextedValues: number = 0;

  next(value: T): void {
    this._numberOfNextedValues++;
    super.next(value);
  }

  get numberOfNextedValues(): number {
    return this._numberOfNextedValues;
  }
}

class WindowTimeSubscriber<T> extends Subscriber<T> {
  private windows: CountedSubject<T>[] = [];

  constructor(
    protected destination: Subscriber<Observable<T>>,
    windowTimeSpan: number,
    windowCreationInterval: number | null,
    private maxWindowSize: number,
    scheduler: SchedulerLike
  ) {
    super(destination);

    const window = this.openWindow();
    if (windowCreationInterval !== null && windowCreationInterval >= 0) {
      const closeState: CloseState<T> = {
        subscriber: this,
        window,
        context: null!
      };
      const creationState: CreationState<T> = {
        windowTimeSpan,
        windowCreationInterval,
        subscriber: this,
        scheduler
      };
      this.add(
        scheduler.schedule<CloseState<T>>(
          dispatchWindowClose as any,
          windowTimeSpan,
          closeState
        )
      );
      this.add(
        scheduler.schedule<CreationState<T>>(
          dispatchWindowCreation as any,
          windowCreationInterval,
          creationState
        )
      );
    } else {
      const timeSpanOnlyState: TimeSpanOnlyState<T> = {
        subscriber: this,
        window,
        windowTimeSpan
      };
      this.add(
        scheduler.schedule<TimeSpanOnlyState<T>>(
          dispatchWindowTimeSpanOnly as any,
          windowTimeSpan,
          timeSpanOnlyState
        )
      );
    }
  }

  protected _next(v: T) {
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

  protected _error(e: any) {
    const windows = this.windows;
    while (windows.length > 0) {
      windows.shift()!.error(err);
    }
    this.dst.error(err);
  }

  protected _complete() {
    const windows = this.windows;
    while (windows.length > 0) {
      windows.shift()!.complete();
    }
    this.dst.complete();
  }

  public openWindow(): CountedSubject<T> {
    const window = new CountedSubject<T>();
    this.windows.push(window);
    const destination = this.destination;
    destination.next(window);
    return window;
  }

  public closeWindow(window: CountedSubject<T>): void {
    const index = this.windows.indexOf(window);
    if (index >= 0) {
      window.complete();
      this.windows.splice(index, 1);
    }
  }
}

function dispatchWindowTimeSpanOnly<T>(
  this: SchedulerAction<TimeSpanOnlyState<T>>,
  state: TimeSpanOnlyState<T>
): void {
  const {subscriber, windowTimeSpan, window} = state;
  if (window) {
    subscriber.closeWindow(window);
  }
  state.window = subscriber.openWindow();
  this.schedule(state, windowTimeSpan);
}

function dispatchWindowCreation<T>(
  this: SchedulerAction<CreationState<T>>,
  state: CreationState<T>
): void {
  const {windowTimeSpan, subscriber, scheduler, windowCreationInterval} = state;
  const window = subscriber.openWindow();
  const action = this;
  let context: CloseWindowContext<T> = {action, subscription: null!};
  const timeSpanState: CloseState<T> = {subscriber, window, context};
  context.subscription = scheduler.schedule<CloseState<T>>(
    dispatchWindowClose as any,
    windowTimeSpan,
    timeSpanState
  );
  action.add(context.subscription);
  action.schedule(state, windowCreationInterval);
}

function dispatchWindowClose<T>(
  this: SchedulerAction<CloseState<T>>,
  state: CloseState<T>
): void {
  const {subscriber, window, context} = state;
  if (context && context.action && context.subscription) {
    context.action.remove(context.subscription);
  }
  subscriber.closeWindow(window);
}

export function windowToggle<T, O>(
  openings: Observable<O>,
  closingSelector: (openValue: O) => Observable<any>
): OperFun<T, Observable<T>> {
  return (source: Observable<T>) =>
    source.lift(new WindowToggleOperator<T, O>(openings, closingSelector));
}

class WindowToggleOperator<T, O> implements Operator<T, Observable<T>> {
  constructor(
    private openings: Observable<O>,
    private closingSelector: (openValue: O) => Observable<any>
  ) {}

  call(subscriber: Subscriber<Observable<T>>, source: any): any {
    return source.subscribe(
      new WindowToggleSubscriber(
        subscriber,
        this.openings,
        this.closingSelector
      )
    );
  }
}

interface WindowContext<T> {
  window: Subject<T>;
  subscription: Subscription;
}

class WindowToggleSubscriber<T, O> extends OuterSubscriber<T, any> {
  private contexts: WindowContext<T>[] = [];
  private openSubscription: Subscription | undefined;

  constructor(
    destination: Subscriber<Observable<T>>,
    private openings: Observable<O>,
    private closingSelector: (openValue: O) => Observable<any>
  ) {
    super(destination);
    this.add(
      (this.openSubscription = subscribeToResult(
        this,
        openings,
        openings as any
      ))
    );
  }

  protected _next(value: T) {
    const {contexts} = this;
    if (contexts) {
      const len = contexts.length;
      for (let i = 0; i < len; i++) {
        contexts[i].window.next(value);
      }
    }
  }

  protected _error(err: any) {
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

    super._error(err);
  }

  protected _complete() {
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
    super._complete();
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

  notifyNext(
    outerValue: any,
    innerValue: any,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, any>
  ): void {
    if (outerValue === this.openings) {
      let closingNotifier;
      try {
        const {closingSelector} = this;
        closingNotifier = closingSelector(innerValue);
      } catch (e) {
        return this.error(e);
      }

      const window = new Subject<T>();
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

      this.dst.next(window);
    } else {
      this.closeWindow(this.contexts.indexOf(outerValue));
    }
  }

  notifyError(err: any): void {
    this.error(err);
  }

  notifyComplete(inner: Subscription): void {
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

export function windowWhen<T>(
  closingSelector: () => Observable<any>
): OperFun<T, Observable<T>> {
  return function windowWhenOperFun(source: Observable<T>) {
    return source.lift(new WindowOperator<T>(closingSelector));
  };
}

class WindowOperator<T> implements Operator<T, Observable<T>> {
  constructor(private closingSelector: () => Observable<any>) {}

  call(subscriber: Subscriber<Observable<T>>, source: any): any {
    return source.subscribe(
      new WindowSubscriber(subscriber, this.closingSelector)
    );
  }
}

class WindowSubscriber<T> extends OuterSubscriber<T, any> {
  private window: Subject<T> | undefined;
  private closingNotification: Subscription | undefined;

  constructor(
    protected destination: Subscriber<Observable<T>>,
    private closingSelector: () => Observable<any>
  ) {
    super(destination);
    this.openWindow();
  }

  notifyNext(
    outerValue: T,
    innerValue: any,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, any>
  ): void {
    this.openWindow(innerSub);
  }

  notifyError(error: any, innerSub: InnerSubscriber<T, any>): void {
    this._error(error);
  }

  notifyComplete(innerSub: InnerSubscriber<T, any>): void {
    this.openWindow(innerSub);
  }

  protected _next(v: T) {
    this.window!.next(value);
  }

  protected _error(e: any) {
    this.window!.error(e);
    this.dst.error(e);
    this.unsubscribeClosingNotification();
  }

  protected _complete() {
    this.window!.complete();
    this.dst.complete();
    this.unsubscribeClosingNotification();
  }

  private unsubscribeClosingNotification(): void {
    if (this.closingNotification) {
      this.closingNotification.unsubscribe();
    }
  }

  private openWindow(innerSub: InnerSubscriber<T, any> | null = null): void {
    if (innerSub) {
      this.remove(innerSub);
      innerSub.unsubscribe();
    }

    const prevWindow = this.window;
    if (prevWindow) {
      prevWindow.complete();
    }

    const window = (this.window = new Subject<T>());
    this.dst.next(window);

    let closingNotifier;
    try {
      const {closingSelector} = this;
      closingNotifier = closingSelector();
    } catch (e) {
      this.dst.error(e);
      this.window.error(e);
      return;
    }
    this.add(
      (this.closingNotification = subscribeToResult(this, closingNotifier))
    );
  }
}

export function withLatestFrom<T, R>(project: (v1: T) => R): OperFun<T, R>;
export function withLatestFrom<T, O2 extends ObservableInput<any>, R>(
  source2: O2,
  project: (v1: T, v2: ObservedValueOf<O2>) => R
): OperFun<T, R>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  project: (v1: T, v2: ObservedValueOf<O2>, v3: ObservedValueOf<O3>) => R
): OperFun<T, R>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  project: (
    v1: T,
    v2: ObservedValueOf<O2>,
    v3: ObservedValueOf<O3>,
    v4: ObservedValueOf<O4>
  ) => R
): OperFun<T, R>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  O5 extends ObservableInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  project: (
    v1: T,
    v2: ObservedValueOf<O2>,
    v3: ObservedValueOf<O3>,
    v4: ObservedValueOf<O4>,
    v5: ObservedValueOf<O5>
  ) => R
): OperFun<T, R>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  O5 extends ObservableInput<any>,
  O6 extends ObservableInput<any>,
  R
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6,
  project: (
    v1: T,
    v2: ObservedValueOf<O2>,
    v3: ObservedValueOf<O3>,
    v4: ObservedValueOf<O4>,
    v5: ObservedValueOf<O5>,
    v6: ObservedValueOf<O6>
  ) => R
): OperFun<T, R>;
export function withLatestFrom<T, O2 extends ObservableInput<any>>(
  source2: O2
): OperFun<T, [T, ObservedValueOf<O2>]>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>
>(v2: O2, v3: O3): OperFun<T, [T, ObservedValueOf<O2>, ObservedValueOf<O3>]>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4
): OperFun<
  T,
  [T, ObservedValueOf<O2>, ObservedValueOf<O3>, ObservedValueOf<O4>]
>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  O5 extends ObservableInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5
): OperFun<
  T,
  [
    T,
    ObservedValueOf<O2>,
    ObservedValueOf<O3>,
    ObservedValueOf<O4>,
    ObservedValueOf<O5>
  ]
>;
export function withLatestFrom<
  T,
  O2 extends ObservableInput<any>,
  O3 extends ObservableInput<any>,
  O4 extends ObservableInput<any>,
  O5 extends ObservableInput<any>,
  O6 extends ObservableInput<any>
>(
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6
): OperFun<
  T,
  [
    T,
    ObservedValueOf<O2>,
    ObservedValueOf<O3>,
    ObservedValueOf<O4>,
    ObservedValueOf<O5>,
    ObservedValueOf<O6>
  ]
>;
export function withLatestFrom<T, R>(
  ...observables: Array<ObservableInput<any> | ((...values: Array<any>) => R)>
): OperFun<T, R>;
export function withLatestFrom<T, R>(
  array: ObservableInput<any>[]
): OperFun<T, R>;
export function withLatestFrom<T, R>(
  array: ObservableInput<any>[],
  project: (...values: Array<any>) => R
): OperFun<T, R>;
export function withLatestFrom<T, R>(
  ...args: Array<ObservableInput<any> | ((...values: Array<any>) => R)>
): OperFun<T, R> {
  return (source: Observable<T>) => {
    let project: any;
    if (typeof args[args.length - 1] === 'function') {
      project = args.pop();
    }
    const observables = <Observable<any>[]>args;
    return source.lift(new WithLatestFromOperator(observables, project));
  };
}

class WithLatestFromOperator<T, R> implements Operator<T, R> {
  constructor(
    private observables: Observable<any>[],
    private project?: (...values: any[]) => Observable<R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new WithLatestFromSubscriber(subscriber, this.observables, this.project)
    );
  }
}

class WithLatestFromSubscriber<T, R> extends OuterSubscriber<T, R> {
  private values: any[];
  private toRespond: number[] = [];

  constructor(
    destination: Subscriber<R>,
    private observables: Observable<any>[],
    private project?: (...values: any[]) => Observable<R>
  ) {
    super(destination);
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

  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.values[outerIndex] = innerValue;
    const toRespond = this.toRespond;
    if (toRespond.length > 0) {
      const found = toRespond.indexOf(outerIndex);
      if (found !== -1) {
        toRespond.splice(found, 1);
      }
    }
  }

  notifyComplete() {
    // noop
  }

  protected _next(value: T) {
    if (this.toRespond.length === 0) {
      const args = [value, ...this.values];
      if (this.project) {
        this._tryProject(args);
      } else {
        this.dst.next(args);
      }
    }
  }

  private _tryProject(args: any[]) {
    let result: any;
    try {
      result = this.project!.apply(this, args);
    } catch (err) {
      this.dst.error(err);
      return;
    }
    this.dst.next(result);
  }
}

export function zipAll<T>(): OperFun<ObservableInput<T>, T[]>;
export function zipAll<T>(): OperFun<any, T[]>;
export function zipAll<T, R>(
  project: (...values: T[]) => R
): OperFun<ObservableInput<T>, R>;
export function zipAll<R>(
  project: (...values: Array<any>) => R
): OperFun<any, R>;
export function zipAll<T, R>(
  project?: (...values: Array<any>) => R
): OperFun<T, R> {
  return (source: Observable<T>) => source.lift(new ZipOperator(project));
}
export function zip<T, R>(
  ...observables: Array<ObservableInput<any> | ((...values: Array<any>) => R)>
): OperFun<T, R> {
  return function zipOperFun(source: Observable<T>) {
    return source.lift.call(
      zipStatic<R>(source, ...observables),
      undefined
    ) as Observable<R>;
  };
}
export function zipWith<T, A extends ObservableInput<any>[]>(
  ...otherInputs: A
): OperFun<T, Unshift<ObservedTupleFrom<A>, T>> {
  return zip(...otherInputs);
}
