import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';
import * as qh from './scheduler';

export class SubscribeOnObservable<T> extends qs.Source<T> {
  static create<T>(
    source: qs.Source<T>,
    delay: number = 0,
    scheduler: qh.Scheduler = asap
  ): qs.Source<T> {
    return new SubscribeOnObservable(source, delay, scheduler);
  }

  static dispatch<T>(this: qh.Action<T>, arg: DispatchArg<T>): qj.Subscription {
    const {source, subscriber} = arg;
    return this.add(source.subscribe(subscriber));
  }

  constructor(
    public source: qs.Source<T>,
    private delayTime: number = 0,
    private scheduler: qh.Scheduler = asap
  ) {
    super();
    if (!isNumeric(delayTime) || delayTime < 0) {
      this.delayTime = 0;
    }
    if (!scheduler || typeof scheduler.schedule !== 'function') {
      this.scheduler = asap;
    }
  }

  _subscribe(subscriber: qj.Subscriber<T>) {
    const delay = this.delayTime;
    const source = this.source;
    const scheduler = this.scheduler;
    return scheduler.schedule<DispatchArg<any>>(
      SubscribeOnObservable.dispatch as any,
      delay,
      {
        source,
        subscriber
      }
    );
  }
}

interface DispatchState<T> {
  subscriber: qj.Subscriber<T>;
  context: any;
  params: ParamsState<T>;
}

interface ParamsState<T> {
  cb: Function;
  args: any[];
  scheduler: qh.Scheduler;
  subject: qj.Async<T>;
  context: any;
}

function dispatch<T>(
  this: qh.Action<DispatchState<T>>,
  state: DispatchState<T>
) {
  const {params, subscriber, context} = state;
  const {cb, args, scheduler} = params;
  let subject = params.subject;

  if (!subject) {
    subject = params.subject = new qj.Async<T>();

    const handler = (...innerArgs: any[]) => {
      const err = innerArgs.shift();
      if (err) {
        this.add(
          scheduler.schedule<DispatchErrorArg<T>>(dispatchError as any, 0, {
            err,
            subject
          })
        );
      } else {
        const value = innerArgs.length <= 1 ? innerArgs[0] : innerArgs;
        this.add(
          scheduler.schedule<DispatchNextArg<T>>(dispatchNext as any, 0, {
            value,
            subject
          })
        );
      }
    };
    try {
      cb.apply(context, [...args, handler]);
    } catch (err) {
      this.add(
        scheduler.schedule<DispatchErrorArg<T>>(dispatchError as any, 0, {
          err,
          subject
        })
      );
    }
  }

  this.add(subject.subscribe(subscriber));
}

interface DispatchNextArg<T> {
  subject: qj.Async<T>;
  value: T;
}

function dispatchNext<T>(arg: DispatchNextArg<T>) {
  const {value, subject} = arg;
  subject.next(value);
  subject.done();
}

interface DispatchErrorArg<T> {
  subject: qj.Async<T>;
  e: any;
}

function dispatchError<T>(arg: DispatchErrorArg<T>) {
  const {err, subject} = arg;
  subject.error(err);
}

const NONE = {};

function emptyScheduled(scheduler: qh.Scheduler) {
  return new qs.Source<never>(subscriber =>
    scheduler.schedule(() => subscriber.done())
  );
}

function setupSubscription<T>(
  sourceObj: FromEventTarget<T>,
  eventName: string,
  handler: (...args: any[]) => void,
  subscriber: qj.Subscriber<T>,
  options?: EventListenerOptions
) {
  let unsubscribe: (() => void) | undefined;
  if (isEventTarget(sourceObj)) {
    const source = sourceObj;
    sourceObj.addEventListener(eventName, handler, options);
    unsubscribe = () => source.removeEventListener(eventName, handler, options);
  } else if (isJQueryStyleEventEmitter(sourceObj)) {
    const source = sourceObj;
    sourceObj.on(eventName, handler);
    unsubscribe = () => source.off(eventName, handler);
  } else if (isNodeStyleEventEmitter(sourceObj)) {
    const source = sourceObj;
    sourceObj.addListener(eventName, handler as NodeEventHandler);
    unsubscribe = () =>
      source.removeListener(eventName, handler as NodeEventHandler);
  } else if (sourceObj && (sourceObj as any).length) {
    for (let i = 0, len = (sourceObj as any).length; i < len; i++) {
      setupSubscription(
        (sourceObj as any)[i],
        eventName,
        handler,
        subscriber,
        options
      );
    }
  } else {
    throw new TypeError('Invalid event target');
  }

  subscriber.add(unsubscribe);
}
function dispatch<T, S>(
  this: qh.Action<SchedulerState<T, S>>,
  state: SchedulerState<T, S>
) {
  const {subscriber, condition} = state;
  if (subscriber.closed) {
    return undefined;
  }
  if (state.needIterate) {
    try {
      state.state = state.iterate(state.state);
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }
  } else {
    state.needIterate = true;
  }
  if (condition) {
    let conditionResult: boolean;
    try {
      conditionResult = condition(state.state);
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }
    if (!conditionResult) {
      subscriber.done();
      return undefined;
    }
    if (subscriber.closed) {
      return undefined;
    }
  }
  let value: T;
  try {
    value = state.resultSelector(state.state);
  } catch (err) {
    subscriber.error(err);
    return undefined;
  }
  if (subscriber.closed) {
    return undefined;
  }
  subscriber.next(value);
  if (subscriber.closed) {
    return undefined;
  }
  return this.schedule(state);
}

export function onErrorResumeNext<R>(v: qt.SourceInput<R>): qs.Source<R>;
export function onErrorResumeNext<T2, T3, R>(
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>
): qs.Source<R>;
export function onErrorResumeNext<T2, T3, T4, R>(
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  v4: qt.SourceInput<T4>
): qs.Source<R>;
export function onErrorResumeNext<T2, T3, T4, T5, R>(
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  v4: qt.SourceInput<T4>,
  v5: qt.SourceInput<T5>
): qs.Source<R>;
export function onErrorResumeNext<T2, T3, T4, T5, T6, R>(
  v2: qt.SourceInput<T2>,
  v3: qt.SourceInput<T3>,
  v4: qt.SourceInput<T4>,
  v5: qt.SourceInput<T5>,
  v6: qt.SourceInput<T6>
): qs.Source<R>;
export function onErrorResumeNext<R>(
  ...observables: Array<qt.SourceInput<any> | ((...values: Array<any>) => R)>
): qs.Source<R>;
export function onErrorResumeNext<R>(
  array: qt.SourceInput<any>[]
): qs.Source<R>;
export function onErrorResumeNext<T, R>(
  ...sources: Array<
    | qt.SourceInput<any>
    | Array<qt.SourceInput<any>>
    | ((...values: Array<any>) => R)
  >
): qs.Source<R> {
  if (sources.length === 0) {
    return EMPTY;
  }

  const [first, ...remainder] = sources;

  if (sources.length === 1 && isArray(first)) {
    return onErrorResumeNext(...first);
  }

  return new qs.Source(subscriber => {
    const subNext = () =>
      subscriber.add(onErrorResumeNext(...remainder).subscribe(subscriber));

    return from(first).subscribe({
      next(value) {
        subscriber.next(value);
      },
      error: subNext,
      complete: subNext
    });
  });
}

export function dispatch<T>(
  this: qh.Action<any>,
  state: {
    keys: string[];
    index: number;
    subscriber: qj.Subscriber<[string, T]>;
    subscription: qj.Subscription;
    obj: Object;
  }
) {
  const {keys, index, subscriber, subscription, obj} = state;
  if (!subscriber.closed) {
    if (index < keys.length) {
      const key = keys[index];
      subscriber.next([key, (obj as any)[key]]);
      subscription.add(
        this.schedule({keys, index: index + 1, subscriber, subscription, obj})
      );
    } else {
      subscriber.done();
    }
  }
}

export function dispatch(this: qh.Action<any>, state: any) {
  const {start, index, count, subscriber} = state;

  if (index >= count) {
    subscriber.done();
    return;
  }

  subscriber.next(start);

  if (subscriber.closed) {
    return;
  }

  state.index = index + 1;
  state.start = start + 1;

  this.schedule(state);
}

interface DispatchArg {
  error: any;
  subscriber: qj.Subscriber<any>;
}

function dispatch({error, subscriber}: DispatchArg) {
  subscriber.error(error);
}
