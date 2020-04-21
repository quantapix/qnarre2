import * as qt from './types';
import * as qu from './utils';
import * as qh from './scheduler';
import * as qs from './source';
import * as qj from './subject';

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
  cb: (...args: Array<A | ((r: R) => any)>) => any,
  h?: qh.Scheduler
): (...args: A[]) => qs.Source<R>;
export function bindCallback<A, R>(
  cb: (...args: Array<A | ((...rs: R[]) => any)>) => any,
  h?: qh.Scheduler
): (...args: A[]) => qs.Source<R[]>;
export function bindCallback(
  cb: Function,
  h?: qh.Scheduler
): (...args: any[]) => qs.Source<any>;
export function bindCallback<N>(
  cb: Function,
  h?: qh.Scheduler,
  c?: qt.Context<N>
): (...args: any[]) => qt.Source<N> {
  return function (this: any, ...args: any[]): qt.Source<N> {
    const context = this;
    let s: qj.Async<N> | undefined;
    const ps = {
      context,
      subject: undefined,
      cb,
      scheduler: h
    };
    return c!.createSource(r => {
      if (h) {
        const state: DispatchState<N> = {
          args,
          subscriber: r,
          ps
        };
        return h.schedule<DispatchState<N>>(dispatch as any, 0, state);
      } else {
        if (!s) {
          s = new qj.Async<N>();
          const handler = (...innerArgs: any[]) => {
            s!.next(innerArgs.length <= 1 ? innerArgs[0] : innerArgs);
            s!.done();
          };
          try {
            cb.apply(context, [...args, handler]);
          } catch (e) {
            if (qu.canReportError(s)) s.fail(e);
            else console.warn(e);
          }
        }
        return s.subscribe(r);
      }
    });
  };
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

export const EMPTY = new qs.Source<never>(subscriber => subscriber.done());

export function defer<R extends qt.Input<any> | void>(
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
    const source = input ? from(input as qt.Input<Sourced<R>>) : EMPTY;
    return source.subscribe(subscriber);
  });
}

export function empty(h?: qh.Scheduler) {
  return scheduler ? emptyScheduled(scheduler) : EMPTY;
}

export function from<O extends qt.Input<any>>(input: O): qs.Source<Sourced<O>>;
export function from<T>(input: qt.Input<T>, h?: qh.Scheduler): qs.Source<T> {
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

export function fromObservable<T>(input: qt.Interop<T>, h?: qh.Scheduler) {
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
export function of<A extends Array<any>>(...args: A): qs.Source<ValueOf<A>>;
export function of<T>(...args: Array<T | qh.Scheduler>): qs.Source<T> {
  let scheduler = args[args.length - 1] as qh.Scheduler;
  if (isScheduler(scheduler)) {
    args.pop();
    return scheduleArray(args as T[], scheduler);
  } else {
    return fromArray(args as T[]);
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

export function throwError(error: any, h?: qh.Scheduler): qs.Source<never> {
  if (!scheduler) {
    return new qs.Source(subscriber => subscriber.error(error));
  } else {
    return new qs.Source(subscriber =>
      scheduler.schedule(dispatch as any, 0, {error, subscriber})
    );
  }
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

/* ** */

export function repeat<N, F, D>(count: number = -1): qt.Shifter<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    if (count === 0) {
      return EMPTY;
    } else if (count < 0) {
      return source.lift(new RepeatOperator(-1, source));
    } else {
      return source.lift(new RepeatO(count - 1, source));
    }
  };
}

class RepeatO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private count: number, private source: qt.Source<N, F, D>) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new RepeatR(subscriber, this.count, this.source));
  }
}

export class RepeatR<N, F, D> extends Subscriber<N, F, D> {
  constructor(
    tgt: Subscriber<any>,
    private count: number,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  done(d?: D) {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) return super.done(d);
      else if (count > -1) this.count = count - 1;
      source.subscribe(this._recycle());
    }
  }
}

export function repeatWhen<N, F, D>(
  notifier: (notifications: qt.Source<any, F, D>) => qt.Source<any, F, D>
): qt.Shifter<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new RepeatWhenO(notifier));
}

class RepeatWhenO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    protected notifier: (
      notifications: qt.Source<any, F, D>
    ) => qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new RepeatWhenR(subscriber, this.notifier, source));
  }
}

export class RepeatWhenR<N, M, F, D> extends Reactor<N, M, F, D> {
  private notifications: Subject<void> | null = null;
  private retries: qt.Source<any, F, D> | null = null;
  private retriesSubscription: Subscription | null | undefined = null;
  private sourceIsBeingSubscribedTo = true;

  constructor(
    tgt: Subscriber<R>,
    private notifier: (
      notifications: qt.Source<any, F, D>
    ) => qt.Source<any, F, D>,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.sourceIsBeingSubscribedTo = true;
    this.source.subscribe(this);
  }

  reactDone(innerSub: Actor<N, M, F, D>): void {
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

  _recycle(): Subscriber<N, F, D> {
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
    this.retriesSubscription = qu.subscribeToResult(this, retries);
  }
}

export function throwIfEmpty<N, F, D>(
  errorFactory: () => any = defaultErrorFactory
): qt.Shifter<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    return source.lift(new ThrowIfEmptyO(errorFactory));
  };
}

class ThrowIfEmptyO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private errorFactory: () => any) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new ThrowIfEmptyR(subscriber, this.errorFactory));
  }
}

export class ThrowIfEmptyR<N, F, D> extends Subscriber<N, F, D> {
  private hasValue = false;

  constructor(tgt: Subscriber<N, F, D>, private errorFactory: () => any) {
    super(tgt);
  }

  protected _next(n?: N) {
    this.hasValue = true;
    this.tgt.next(n);
  }

  protected _done(d?: D) {
    if (!this.hasValue) {
      let err: any;
      try {
        err = this.errorFactory();
      } catch (e) {
        err = e;
      }
      this.tgt.fail(err);
    } else return this.tgt.done(d);
  }
}

function defaultErrorFactory() {
  return new EmptyError();
}
