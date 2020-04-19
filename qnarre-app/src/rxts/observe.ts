import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';
import * as qh from './scheduler';

export interface DispatchArg<T> {
  source: qs.Source<T>;
  subscriber: qj.Subscriber<T>;
}

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

export function bindCallback<R1, R2, R3, R4>(
  cb: (_: (r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any) => any,
  h?: qh.Scheduler
): () => qs.Source<any[]>;
export function bindCallback<R1, R2, R3>(
  cb: (_: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): () => qs.Source<[R1, R2, R3]>;
export function bindCallback<R1, R2>(
  cb: (_: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): () => qs.Source<[R1, R2]>;
export function bindCallback<R1>(
  cb: (_: (r1: R1) => any) => any,
  h?: qh.Scheduler
): () => qs.Source<R1>;
export function bindCallback(
  cb: (_: () => any) => any,
  h?: qh.Scheduler
): () => qs.Source<void>;
export function bindCallback<A1, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    _: (r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1) => qs.Source<any[]>;
export function bindCallback<A1, R1, R2, R3>(
  cb: (a1: A1, _: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qs.Source<[R1, R2, R3]>;
export function bindCallback<A1, R1, R2>(
  cb: (a1: A1, _: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qs.Source<[R1, R2]>;
export function bindCallback<A1, R1>(
  cb: (a1: A1, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qs.Source<R1>;
export function bindCallback<A1>(
  cb: (a1: A1, _: () => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qs.Source<void>;
export function bindCallback<A1, A2, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    _: (r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qs.Source<any[]>;
export function bindCallback<A1, A2, R1, R2, R3>(
  cb: (a1: A1, a2: A2, _: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qs.Source<[R1, R2, R3]>;
export function bindCallback<A1, A2, R1, R2>(
  cb: (a1: A1, a2: A2, _: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qs.Source<[R1, R2]>;
export function bindCallback<A1, A2, R1>(
  cb: (a1: A1, a2: A2, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qs.Source<R1>;
export function bindCallback<A1, A2>(
  cb: (a1: A1, a2: A2, _: () => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qs.Source<void>;
export function bindCallback<A1, A2, A3, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    _: (r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qs.Source<any[]>;
export function bindCallback<A1, A2, A3, R1, R2, R3>(
  cb: (a1: A1, a2: A2, a3: A3, _: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qs.Source<[R1, R2, R3]>;
export function bindCallback<A1, A2, A3, R1, R2>(
  cb: (a1: A1, a2: A2, a3: A3, _: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qs.Source<[R1, R2]>;
export function bindCallback<A1, A2, A3, R1>(
  cb: (a1: A1, a2: A2, a3: A3, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qs.Source<R1>;
export function bindCallback<A1, A2, A3>(
  cb: (a1: A1, a2: A2, a3: A3, _: () => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qs.Source<void>;
export function bindCallback<A1, A2, A3, A4, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    _: (r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qs.Source<any[]>;
export function bindCallback<A1, A2, A3, A4, R1, R2, R3>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    _: (r1: R1, r2: R2, r3: R3) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qs.Source<[R1, R2, R3]>;
export function bindCallback<A1, A2, A3, A4, R1, R2>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qs.Source<[R1, R2]>;
export function bindCallback<A1, A2, A3, A4, R1>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qs.Source<R1>;
export function bindCallback<A1, A2, A3, A4>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: () => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qs.Source<void>;
export function bindCallback<A1, A2, A3, A4, A5, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qs.Source<any[]>;
export function bindCallback<A1, A2, A3, A4, A5, R1, R2, R3>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (r1: R1, r2: R2, r3: R3) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qs.Source<[R1, R2, R3]>;
export function bindCallback<A1, A2, A3, A4, A5, R1, R2>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (r1: R1, r2: R2) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qs.Source<[R1, R2]>;
export function bindCallback<A1, A2, A3, A4, A5, R1>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qs.Source<R1>;
export function bindCallback<A1, A2, A3, A4, A5>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, _: () => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qs.Source<void>;
export function bindCallback<A, R>(
  cb: (...args: Array<A | ((result: R) => any)>) => any,
  h?: qh.Scheduler
): (...args: A[]) => qs.Source<R>;
export function bindCallback<A, R>(
  cb: (...args: Array<A | ((...results: R[]) => any)>) => any,
  h?: qh.Scheduler
): (...args: A[]) => qs.Source<R[]>;
export function bindCallback(
  cb: Function,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<any>;
export function bindCallback<T>(
  cb: Function,
  resultSelector?: Function | qh.Scheduler,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<T> {
  if (resultSelector) {
    if (isScheduler(resultSelector)) {
      scheduler = resultSelector;
    } else {
      // DEPRECATED PATH
      return (...args: any[]) =>
        bindCallback(
          cb,
          scheduler
        )(...args).pipe(
          map(args =>
            isArray(args) ? resultSelector(...args) : resultSelector(args)
          )
        );
    }
  }
  return function (this: any, ...args: any[]): qs.Source<T> {
    const context = this;
    let subject: qj.Async<T> | undefined;
    const params = {
      context,
      subject: undefined,
      cb,
      scheduler: scheduler!
    };
    return new qs.Source<T>(subscriber => {
      if (!scheduler) {
        if (!subject) {
          subject = new qj.Async<T>();
          const handler = (...innerArgs: any[]) => {
            subject!.next(innerArgs.length <= 1 ? innerArgs[0] : innerArgs);
            subject!.done();
          };

          try {
            cb.apply(context, [...args, handler]);
          } catch (err) {
            if (canReportError(subject)) {
              subject.error(err);
            } else {
              console.warn(err);
            }
          }
        }
        return subject.subscribe(subscriber);
      } else {
        const state: DispatchState<T> = {
          args,
          subscriber,
          params
        };
        return scheduler.schedule<DispatchState<T>>(dispatch as any, 0, state);
      }
    });
  };
}

interface DispatchState<T> {
  args: any[];
  subscriber: qj.Subscriber<T>;
  params: ParamsContext<T>;
}

interface ParamsContext<T> {
  cb: Function;
  scheduler: qh.Scheduler;
  context: any;
  subject?: qj.Async<T>;
}

function dispatch<T>(
  this: qh.Action<DispatchState<T>>,
  state: DispatchState<T>
) {
  const self = this;
  const {args, subscriber, params} = state;
  const {cb, context, scheduler} = params;
  let {subject} = params;
  if (!subject) {
    subject = params.subject = new qj.Async<T>();

    const handler = (...innerArgs: any[]) => {
      const value = innerArgs.length <= 1 ? innerArgs[0] : innerArgs;
      this.add(
        scheduler.schedule<NextState<T>>(dispatchNext as any, 0, {
          value,
          subject: subject!
        })
      );
    };

    try {
      cb.apply(context, [...args, handler]);
    } catch (err) {
      subject.error(err);
    }
  }

  this.add(subject.subscribe(subscriber));
}

interface NextState<T> {
  subject: qj.Async<T>;
  value: T;
}

function dispatchNext<T>(this: qh.Action<NextState<T>>, state: NextState<T>) {
  const {value, subject} = state;
  subject.next(value);
  subject.done();
}

interface ErrorState<T> {
  subject: qj.Async<T>;
  e: any;
}

function dispatchError<T>(
  this: qh.Action<ErrorState<T>>,
  state: ErrorState<T>
) {
  const {err, subject} = state;
  subject.error(err);
}

export function bindNodeCallback<R1, R2, R3, R4>(
  cb: (
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<any[]>;
export function bindNodeCallback<R1, R2, R3>(
  cb: (_: (e: any, r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): () => qs.Source<[R1, R2, R3]>;
export function bindNodeCallback<R1, R2>(
  cb: (_: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): () => qs.Source<[R1, R2]>;
export function bindNodeCallback<R1>(
  cb: (_: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): () => qs.Source<R1>;
export function bindNodeCallback(
  cb: (_: (e: any) => any) => any,
  h?: qh.Scheduler
): () => qs.Source<void>;
export function bindNodeCallback<A1, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<any[]>;
export function bindNodeCallback<A1, R1, R2, R3>(
  cb: (a1: A1, _: (e: any, r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qs.Source<[R1, R2, R3]>;
export function bindNodeCallback<A1, R1, R2>(
  cb: (a1: A1, _: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qs.Source<[R1, R2]>;
export function bindNodeCallback<A1, R1>(
  cb: (a1: A1, _: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qs.Source<R1>;
export function bindNodeCallback<A1>(
  cb: (a1: A1, _: (e: any) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qs.Source<void>;
export function bindNodeCallback<A1, A2, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<any[]>;
export function bindNodeCallback<A1, A2, R1, R2, R3>(
  cb: (a1: A1, a2: A2, _: (e: any, r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qs.Source<[R1, R2, R3]>;
export function bindNodeCallback<A1, A2, R1, R2>(
  cb: (a1: A1, a2: A2, _: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qs.Source<[R1, R2]>;
export function bindNodeCallback<A1, A2, R1>(
  cb: (a1: A1, a2: A2, _: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qs.Source<R1>;
export function bindNodeCallback<A1, A2>(
  cb: (a1: A1, a2: A2, _: (e: any) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qs.Source<void>;
export function bindNodeCallback<A1, A2, A3, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<any[]>;
export function bindNodeCallback<A1, A2, A3, R1, R2, R3>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    _: (e: any, r1: R1, r2: R2, r3: R3) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qs.Source<[R1, R2, R3]>;
export function bindNodeCallback<A1, A2, A3, R1, R2>(
  cb: (a1: A1, a2: A2, a3: A3, _: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qs.Source<[R1, R2]>;
export function bindNodeCallback<A1, A2, A3, R1>(
  cb: (a1: A1, a2: A2, a3: A3, _: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qs.Source<R1>;
export function bindNodeCallback<A1, A2, A3>(
  cb: (a1: A1, a2: A2, a3: A3, _: (e: any) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qs.Source<void>;
export function bindNodeCallback<A1, A2, A3, A4, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<any[]>;
export function bindNodeCallback<A1, A2, A3, A4, R1, R2, R3>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    _: (e: any, r1: R1, r2: R2, r3: R3) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qs.Source<[R1, R2, R3]>;
export function bindNodeCallback<A1, A2, A3, A4, R1, R2>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    _: (e: any, r1: R1, r2: R2) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qs.Source<[R1, R2]>;
export function bindNodeCallback<A1, A2, A3, A4, R1>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qs.Source<R1>;
export function bindNodeCallback<A1, A2, A3, A4>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (e: any) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qs.Source<void>;
export function bindNodeCallback<A1, A2, A3, A4, A5, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ...args: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<any[]>;
export function bindNodeCallback<A1, A2, A3, A4, A5, R1, R2, R3>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (e: any, r1: R1, r2: R2, r3: R3) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qs.Source<[R1, R2, R3]>;
export function bindNodeCallback<A1, A2, A3, A4, A5, R1, R2>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (e: any, r1: R1, r2: R2) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qs.Source<[R1, R2]>;
export function bindNodeCallback<A1, A2, A3, A4, A5, R1>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (e: any, r1: R1) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qs.Source<R1>;
export function bindNodeCallback<A1, A2, A3, A4, A5>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, _: (e: any) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qs.Source<void>;
export function bindNodeCallback(
  cb: Function,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<any[]>;
export function bindNodeCallback<T>(
  cb: Function,
  resultSelector?: Function | qh.Scheduler,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<T> {
  if (resultSelector) {
    if (isScheduler(resultSelector)) {
      h = resultSelector;
    } else {
      // DEPRECATED PATH
      return (...args: any[]) =>
        bindNodeCallback(
          cb,
          h
        )(...args).pipe(
          map(args =>
            isArray(args) ? resultSelector(...args) : resultSelector(args)
          )
        );
    }
  }
  return function (this: any, ...args: any[]): qs.Source<T> {
    const params: ParamsState<T> = {
      subject: undefined!,
      args,
      cb,
      scheduler: h!,
      context: this
    };
    return new qs.Source<T>(subscriber => {
      const {context} = params;
      let {subject} = params;
      if (!h) {
        if (!subject) {
          subject = params.subject = new qj.Async<T>();
          const handler = (...innerArgs: any[]) => {
            const err = innerArgs.shift();

            if (err) {
              subject.error(err);
              return;
            }

            subject.next(innerArgs.length <= 1 ? innerArgs[0] : innerArgs);
            subject.done();
          };

          try {
            cb.apply(context, [...args, handler]);
          } catch (err) {
            if (canReportError(subject)) {
              subject.error(err);
            } else {
              console.warn(err);
            }
          }
        }
        return subject.subscribe(subscriber);
      } else {
        return h.schedule<DispatchState<T>>(dispatch as any, 0, {
          params,
          subscriber,
          context
        });
      }
    });
  };
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
    new CombineLatestOperator<Sourced<O>, R>(resultSelector)
  );
}

export class CombineLatestOperator<T, R> implements qt.Operator<T, R> {
  constructor(private resultSelector?: (...values: Array<any>) => R) {}

  call(subscriber: qj.Subscriber<R>, source: any): any {
    return source.subscribe(
      new CombineLatestSubscriber(subscriber, this.resultSelector)
    );
  }
}

export class CombineLatestSubscriber<T, R> extends ReactorSubscriber<T, R> {
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

export function defer<R extends qt.SourceInput<any> | void>(
  observableFactory: () => R
): qs.Source<Sourced<R>> {
  return new qs.Source<Sourced<R>>(subscriber => {
    let input: R | void;
    try {
      input = observableFactory();
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }
    const source = input ? from(input as qt.SourceInput<Sourced<R>>) : EMPTY;
    return source.subscribe(subscriber);
  });
}

export const EMPTY = new qs.Source<never>(subscriber => subscriber.done());

export function empty(h?: qh.Scheduler) {
  return scheduler ? emptyScheduled(scheduler) : EMPTY;
}

function emptyScheduled(scheduler: qh.Scheduler) {
  return new qs.Source<never>(subscriber =>
    scheduler.schedule(() => subscriber.done())
  );
}

export function forkJoin<A>(sources: [SourceInput<A>]): qs.Source<[A]>;
export function forkJoin<A, B>(
  sources: [SourceInput<A>, qt.SourceInput<B>]
): qs.Source<[A, B]>;
export function forkJoin<A, B, C>(
  sources: [SourceInput<A>, qt.SourceInput<B>, qt.SourceInput<C>]
): qs.Source<[A, B, C]>;
export function forkJoin<A, B, C, D>(
  sources: [
    SourceInput<A>,
    qt.SourceInput<B>,
    qt.SourceInput<C>,
    qt.SourceInput<D>
  ]
): qs.Source<[A, B, C, D]>;
export function forkJoin<A, B, C, D, E>(
  sources: [
    qt.SourceInput<A>,
    qt.SourceInput<B>,
    qt.SourceInput<C>,
    qt.SourceInput<D>,
    qt.SourceInput<E>
  ]
): qs.Source<[A, B, C, D, E]>;
export function forkJoin<A, B, C, D, E, F>(
  sources: [
    qt.SourceInput<A>,
    qt.SourceInput<B>,
    qt.SourceInput<C>,
    qt.SourceInput<D>,
    qt.SourceInput<E>,
    qt.SourceInput<F>
  ]
): qs.Source<[A, B, C, D, E, F]>;
export function forkJoin<A extends qt.SourceInput<any>[]>(
  sources: A
): qs.Source<SourcedFrom<A>[]>;
export function forkJoin(sourcesObject: {}): qs.Source<never>;
export function forkJoin<T, K extends keyof T>(
  sourcesObject: T
): qs.Source<{[K in keyof T]: Sourced<T[K]>}>;
export function forkJoin(...sources: any[]): qs.Source<any> {
  if (sources.length === 1) {
    const first = sources[0];
    if (isArray(first)) {
      return forkJoinInternal(first, null);
    }
    if (isObject(first) && Object.getPrototypeOf(first) === Object.prototype) {
      const keys = Object.keys(first);
      return forkJoinInternal(
        keys.map(key => first[key]),
        keys
      );
    }
  }
  if (typeof sources[sources.length - 1] === 'function') {
    const resultSelector = sources.pop() as Function;
    sources =
      sources.length === 1 && isArray(sources[0]) ? sources[0] : sources;
    return forkJoinInternal(sources, null).pipe(
      map((args: any[]) => resultSelector(...args))
    );
  }
  return forkJoinInternal(sources, null);
}

function forkJoinInternal(
  sources: qt.SourceInput<any>[],
  keys: string[] | null
): qs.Source<any> {
  return new qs.Source(subscriber => {
    const len = sources.length;
    if (len === 0) {
      subscriber.done();
      return;
    }
    const values = new Array(len);
    let completed = 0;
    let emitted = 0;
    for (let i = 0; i < len; i++) {
      const source = from(sources[i]);
      let hasValue = false;
      subscriber.add(
        source.subscribe({
          next: value => {
            if (!hasValue) {
              hasValue = true;
              emitted++;
            }
            values[i] = value;
          },
          error: err => subscriber.error(err),
          complete: () => {
            completed++;
            if (completed === len || !hasValue) {
              if (emitted === len) {
                subscriber.next(
                  keys
                    ? keys.reduce(
                        (result, key, i) => (
                          ((result as any)[key] = values[i]), result
                        ),
                        {}
                      )
                    : values
                );
              }
              subscriber.done();
            }
          }
        })
      );
    }
  });
}

export function from<O extends qt.SourceInput<any>>(
  input: O
): qs.Source<Sourced<O>>;
export function from<T>(
  input: qt.SourceInput<T>,
  h?: qh.Scheduler
): qs.Source<T> {
  if (!scheduler) {
    if (input instanceof Observable) {
      return input;
    }
    return new qs.Source<T>(subscribeTo(input));
  } else {
    return scheduled(input, scheduler);
  }
}

export function fromArray<T>(input: ArrayLike<T>, h?: qh.Scheduler) {
  if (!scheduler) {
    return new qs.Source<T>(subscribeToArray(input));
  } else {
    return scheduleArray(input, scheduler);
  }
}

export interface NodeStyleEventEmitter {
  addListener: (eventName: string | symbol, handler: NodeEventHandler) => this;
  removeListener: (
    eventName: string | symbol,
    handler: NodeEventHandler
  ) => this;
}

export type NodeEventHandler = (...args: any[]) => void;

export interface NodeCompatibleEventEmitter {
  addListener: (eventName: string, handler: NodeEventHandler) => void | {};
  removeListener: (eventName: string, handler: NodeEventHandler) => void | {};
}

export interface JQueryStyleEventEmitter {
  on: (eventName: string, handler: Function) => void;
  off: (eventName: string, handler: Function) => void;
}

export interface HasEventTargetAddRemove<E> {
  addEventListener(
    type: string,
    listener: ((evt: E) => void) | null,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener?: ((evt: E) => void) | null,
    options?: EventListenerOptions | boolean
  ): void;
}

export type EventTargetLike<T> =
  | HasEventTargetAddRemove<T>
  | NodeStyleEventEmitter
  | NodeCompatibleEventEmitter
  | JQueryStyleEventEmitter;

export type FromEventTarget<T> =
  | EventTargetLike<T>
  | ArrayLike<EventTargetLike<T>>;

export interface EventListenerOptions {
  capture?: boolean;
  passive?: boolean;
  once?: boolean;
}

export interface AddEventListenerOptions extends EventListenerOptions {
  once?: boolean;
  passive?: boolean;
}

export function fromEvent<T>(
  target: FromEventTarget<T>,
  eventName: string
): qs.Source<T>;
export function fromEvent<T>(
  target: FromEventTarget<T>,
  eventName: string,
  options?: EventListenerOptions
): qs.Source<T>;
export function fromEvent<T>(
  target: FromEventTarget<T>,
  eventName: string,
  options?: EventListenerOptions | ((...args: any[]) => T),
  resultSelector?: (...args: any[]) => T
): qs.Source<T> {
  if (isFunction(options)) {
    resultSelector = options;
    options = undefined;
  }
  if (resultSelector) {
    return fromEvent<T>(
      target,
      eventName,
      options as EventListenerOptions | undefined
    ).pipe(
      map(args =>
        isArray(args) ? resultSelector!(...args) : resultSelector!(args)
      )
    );
  }

  return new qs.Source<T>(subscriber => {
    function handler(e: T) {
      if (arguments.length > 1) {
        subscriber.next(Array.prototype.slice.call(arguments) as any);
      } else {
        subscriber.next(e);
      }
    }
    setupSubscription(
      target,
      eventName,
      handler,
      subscriber,
      options as EventListenerOptions
    );
  });
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

function isNodeStyleEventEmitter(
  sourceObj: any
): sourceObj is NodeStyleEventEmitter {
  return (
    sourceObj &&
    typeof sourceObj.addListener === 'function' &&
    typeof sourceObj.removeListener === 'function'
  );
}

function isJQueryStyleEventEmitter(
  sourceObj: any
): sourceObj is JQueryStyleEventEmitter {
  return (
    sourceObj &&
    typeof sourceObj.on === 'function' &&
    typeof sourceObj.off === 'function'
  );
}

function isEventTarget(
  sourceObj: any
): sourceObj is HasEventTargetAddRemove<any> {
  return (
    sourceObj &&
    typeof sourceObj.addEventListener === 'function' &&
    typeof sourceObj.removeEventListener === 'function'
  );
}

export function fromEventPattern<T>(
  addHandler: (handler: NodeEventHandler) => any,
  removeHandler?: (handler: NodeEventHandler, signal?: any) => void
): qs.Source<T>;
export function fromEventPattern<T>(
  addHandler: (handler: NodeEventHandler) => any,
  removeHandler?: (handler: NodeEventHandler, signal?: any) => void,
  resultSelector?: (...args: any[]) => T
): qs.Source<T | T[]> {
  if (resultSelector) {
    // DEPRECATED PATH
    return fromEventPattern<T>(addHandler, removeHandler).pipe(
      map(args =>
        isArray(args) ? resultSelector(...args) : resultSelector(args)
      )
    );
  }
  return new qs.Source<T | T[]>(subscriber => {
    const handler = (...e: T[]) => subscriber.next(e.length === 1 ? e[0] : e);
    let retValue: any;
    try {
      retValue = addHandler(handler);
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }

    if (!isFunction(removeHandler)) {
      return undefined;
    }

    return () => removeHandler(handler, retValue);
  });
}

export function fromIterable<T>(input: Iterable<T>, h?: qh.Scheduler) {
  if (!input) {
    throw new Error('Iterable cannot be null');
  }
  if (!scheduler) {
    return new qs.Source<T>(subscribeToIterable(input));
  } else {
    return scheduleIterable(input, scheduler);
  }
}

export function fromObservable<T>(
  input: qt.InteropSource<T>,
  h?: qh.Scheduler
) {
  if (!scheduler) {
    return new qs.Source<T>(subscribeToObservable(input));
  } else {
    return scheduleSource(input, scheduler);
  }
}

export function fromPromise<T>(input: PromiseLike<T>, h?: qh.Scheduler) {
  if (!scheduler) {
    return new qs.Source<T>(subscribeToPromise(input));
  } else {
    return schedulePromise(input, scheduler);
  }
}

export type ConditionFunc<S> = (state: S) => boolean;
export type IterateFunc<S> = (state: S) => S;
export type ResultFunc<S, T> = (state: S) => T;

interface SchedulerState<T, S> {
  needIterate?: boolean;
  state: S;
  subscriber: qj.Subscriber<T>;
  condition?: ConditionFunc<S>;
  iterate: IterateFunc<S>;
  resultSelector: ResultFunc<S, T>;
}

export interface GenerateBaseOptions<S> {
  initialState: S;
  condition?: ConditionFunc<S>;
  iterate: IterateFunc<S>;
  h?: qh.Scheduler;
}

export interface GenerateOptions<T, S> extends GenerateBaseOptions<S> {
  resultSelector: ResultFunc<S, T>;
}

export function generate<T, S>(
  initialState: S,
  condition: ConditionFunc<S>,
  iterate: IterateFunc<S>,
  resultSelector: ResultFunc<S, T>,
  h?: qh.Scheduler
): qs.Source<T>;
export function generate<S>(
  initialState: S,
  condition: ConditionFunc<S>,
  iterate: IterateFunc<S>,
  h?: qh.Scheduler
): qs.Source<S>;
export function generate<S>(options: GenerateBaseOptions<S>): qs.Source<S>;
export function generate<T, S>(options: GenerateOptions<T, S>): qs.Source<T>;
export function generate<T, S>(
  initialStateOrOptions: S | GenerateOptions<T, S>,
  condition?: ConditionFunc<S>,
  iterate?: IterateFunc<S>,
  resultSelectorOrScheduler?: ResultFunc<S, T> | qh.Scheduler,
  h?: qh.Scheduler
): qs.Source<T> {
  let resultSelector: ResultFunc<S, T>;
  let initialState: S;

  if (arguments.length == 1) {
    const options = initialStateOrOptions as GenerateOptions<T, S>;
    initialState = options.initialState;
    condition = options.condition;
    iterate = options.iterate;
    resultSelector = options.resultSelector || (identity as ResultFunc<S, T>);
    scheduler = options.scheduler;
  } else if (
    resultSelectorOrScheduler === undefined ||
    isScheduler(resultSelectorOrScheduler)
  ) {
    initialState = initialStateOrOptions as S;
    resultSelector = identity as ResultFunc<S, T>;
    scheduler = resultSelectorOrScheduler as qh.Scheduler;
  } else {
    initialState = initialStateOrOptions as S;
    resultSelector = resultSelectorOrScheduler as ResultFunc<S, T>;
  }

  return new qs.Source<T>(subscriber => {
    let state = initialState;
    if (scheduler) {
      return scheduler.schedule<SchedulerState<T, S>>(dispatch as any, 0, {
        subscriber,
        iterate: iterate!,
        condition,
        resultSelector,
        state
      });
    }

    do {
      if (condition) {
        let conditionResult: boolean;
        try {
          conditionResult = condition(state);
        } catch (err) {
          subscriber.error(err);
          return undefined;
        }
        if (!conditionResult) {
          subscriber.done();
          break;
        }
      }
      let value: T;
      try {
        value = resultSelector(state);
      } catch (err) {
        subscriber.error(err);
        return undefined;
      }
      subscriber.next(value);
      if (subscriber.closed) {
        break;
      }
      try {
        state = iterate!(state);
      } catch (err) {
        subscriber.error(err);
        return undefined;
      }
    } while (true);

    return undefined;
  });
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

export function iif<T = never, F = never>(
  condition: () => boolean,
  trueResult: qt.SourceOrPromise<T> = EMPTY,
  falseResult: qt.SourceOrPromise<F> = EMPTY
): qs.Source<T | F> {
  return defer(() => (condition() ? trueResult : falseResult));
}

export function interval(
  period = 0,
  scheduler: qh.Scheduler = async
): qs.Source<number> {
  if (!isNumeric(period) || period < 0) {
    period = 0;
  }

  if (!scheduler || typeof scheduler.schedule !== 'function') {
    scheduler = async;
  }

  return new qs.Source<number>(subscriber => {
    subscriber.add(
      scheduler.schedule(dispatch as any, period, {
        subscriber,
        counter: 0,
        period
      })
    );
    return subscriber;
  });
}

function dispatch(this: qh.Action<IntervalState>, state: IntervalState) {
  const {subscriber, counter, period} = state;
  subscriber.next(counter);
  this.schedule({subscriber, counter: counter + 1, period}, period);
}

interface IntervalState {
  subscriber: qj.Subscriber<number>;
  counter: number;
  period: number;
}

export const NEVER = new qs.Source<never>(noop);

export function of(): qs.Source<never>;
export function of<T>(value: T): qs.Source<T>;
export function of<T, U>(value1: T, value2: U): qs.Source<T | U>;
export function of<T, U, V>(
  value1: T,
  value2: U,
  value3: V
): qs.Source<T | U | V>;
export function of<A extends Array<any>>(
  ...args: A
): qs.Source<ValueFromArray<A>>;
export function of<T>(...args: Array<T | qh.Scheduler>): qs.Source<T> {
  let scheduler = args[args.length - 1] as qh.Scheduler;
  if (isScheduler(scheduler)) {
    args.pop();
    return scheduleArray(args as T[], scheduler);
  } else {
    return fromArray(args as T[]);
  }
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

export function pairs<T>(
  obj: Object,
  h?: qh.Scheduler
): qs.Source<[string, T]> {
  if (!scheduler) {
    return new qs.Source<[string, T]>(subscriber => {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length && !subscriber.closed; i++) {
        const key = keys[i];
        if (obj.hasOwnProperty(key)) {
          subscriber.next([key, (obj as any)[key]]);
        }
      }
      subscriber.done();
    });
  } else {
    return new qs.Source<[string, T]>(subscriber => {
      const keys = Object.keys(obj);
      const subscription = new qj.Subscription();
      subscription.add(
        scheduler.schedule<{
          keys: string[];
          index: number;
          subscriber: qj.Subscriber<[string, T]>;
          subscription: qj.Subscription;
          obj: Object;
        }>(dispatch as any, 0, {keys, index: 0, subscriber, subscription, obj})
      );
      return subscription;
    });
  }
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

export function partition<T>(
  source: qt.SourceInput<T>,
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): [Observable<T>, qs.Source<T>] {
  return [
    filter(predicate, thisArg)(new qs.Source<T>(subscribeTo(source))),
    filter(not(predicate, thisArg) as any)(
      new qs.Source<T>(subscribeTo(source))
    )
  ] as [Observable<T>, qs.Source<T>];
}

export function race<A extends qt.SourceInput<any>[]>(
  observables: A
): qs.Source<SourcedFrom<A>>;
export function race<A extends qt.SourceInput<any>[]>(
  ...observables: A
): qs.Source<SourcedFrom<A>>;
export function race<T>(
  ...observables: (SourceInput<T> | qt.SourceInput<T>[])[]
): qs.Source<any> {
  if (observables.length === 1) {
    if (isArray(observables[0])) {
      observables = observables[0] as qt.SourceInput<T>[];
    } else {
      return from(observables[0] as qt.SourceInput<T>);
    }
  }

  return fromArray(observables, undefined).lift(new RaceOperator<T>());
}

export class RaceOperator<T> implements qt.Operator<T, T> {
  call(subscriber: qj.Subscriber<T>, source: any): qt.Closer {
    return source.subscribe(new RaceSubscriber(subscriber));
  }
}

export class RaceSubscriber<T> extends ReactorSubscriber<T, T> {
  private hasFirst: boolean = false;
  private observables: qs.Source<any>[] = [];
  private subscriptions: qj.Subscription[] = [];

  constructor(destination: qj.Subscriber<T>) {
    super(destination);
  }

  protected _next(observable: any): void {
    this.observables.push(observable);
  }

  protected _done() {
    const observables = this.observables;
    const len = observables.length;

    if (len === 0) {
      this.destination.done();
    } else {
      for (let i = 0; i < len && !this.hasFirst; i++) {
        let observable = observables[i];
        let subscription = subscribeToResult(
          this,
          observable,
          observable as any,
          i
        );

        if (this.subscriptions) {
          this.subscriptions.push(subscription!);
        }
        this.add(subscription);
      }
      this.observables = null!;
    }
  }

  reactNext(
    outerN: T,
    innerValue: T,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, T>
  ): void {
    if (!this.hasFirst) {
      this.hasFirst = true;

      for (let i = 0; i < this.subscriptions.length; i++) {
        if (i !== outerX) {
          let subscription = this.subscriptions[i];

          subscription.unsubscribe();
          this.remove(subscription);
        }
      }

      this.subscriptions = null!;
    }

    this.destination.next(innerValue);
  }

  notifyComplete(innerSub: ActorSubscriber<T, T>): void {
    this.hasFirst = true;
    super.notifyComplete(innerSub);
  }

  notifyError(error: any, innerSub: ActorSubscriber<T, T>): void {
    this.hasFirst = true;
    super.notifyError(error, innerSub);
  }
}

export function range(
  start: number = 0,
  count?: number,
  h?: qh.Scheduler
): qs.Source<number> {
  return new qs.Source<number>(subscriber => {
    if (count === undefined) {
      count = start;
      start = 0;
    }

    let index = 0;
    let current = start;

    if (scheduler) {
      return scheduler.schedule(dispatch, 0, {
        index,
        count,
        start,
        subscriber
      });
    } else {
      do {
        if (index++ >= count) {
          subscriber.done();
          break;
        }
        subscriber.next(current++);
        if (subscriber.closed) {
          break;
        }
      } while (true);
    }

    return undefined;
  });
}

/** @internal */
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

export function throwError(error: any, h?: qh.Scheduler): qs.Source<never> {
  if (!scheduler) {
    return new qs.Source(subscriber => subscriber.error(error));
  } else {
    return new qs.Source(subscriber =>
      scheduler.schedule(dispatch as any, 0, {error, subscriber})
    );
  }
}

interface DispatchArg {
  error: any;
  subscriber: qj.Subscriber<any>;
}

function dispatch({error, subscriber}: DispatchArg) {
  subscriber.error(error);
}

export function timer(
  dueTime: number | Date = 0,
  periodOrScheduler?: number | qh.Scheduler,
  h?: qh.Scheduler
): qs.Source<number> {
  let period = -1;
  if (isNumeric(periodOrScheduler)) {
    period = (Number(periodOrScheduler) < 1 && 1) || Number(periodOrScheduler);
  } else if (isScheduler(periodOrScheduler)) {
    scheduler = periodOrScheduler as any;
  }

  if (!isScheduler(scheduler)) {
    scheduler = async;
  }

  return new qs.Source(subscriber => {
    const due = isNumeric(dueTime)
      ? (dueTime as number)
      : +dueTime - scheduler!.now();

    return scheduler!.schedule(dispatch as any, due, {
      index: 0,
      period,
      subscriber
    });
  });
}

interface TimerState {
  index: number;
  period: number;
  subscriber: qj.Subscriber<number>;
}

function dispatch(this: qh.Action<TimerState>, state: TimerState) {
  const {index, period, subscriber} = state;
  subscriber.next(index);

  if (subscriber.closed) {
    return;
  } else if (period === -1) {
    return subscriber.done();
  }

  state.index = index + 1;
  this.schedule(state, period);
}

export function using<T>(
  resourceFactory: () => qt.Unsubscriber | void,
  observableFactory: (
    resource: qt.Unsubscriber | void
  ) => qt.SourceInput<T> | void
): qs.Source<T> {
  return new qs.Source<T>(subscriber => {
    let resource: qt.Unsubscriber | void;

    try {
      resource = resourceFactory();
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }

    let result: qt.SourceInput<T> | void;
    try {
      result = observableFactory(resource);
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }

    const source = result ? from(result) : EMPTY;
    const subscription = source.subscribe(subscriber);
    return () => {
      subscription.unsubscribe();
      if (resource) {
        resource.unsubscribe();
      }
    };
  });
}
