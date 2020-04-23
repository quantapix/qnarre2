import * as qt from './types';
import * as qu from './utils';
import * as qh from './scheduler';
import * as qs from './source';
import * as qx from './context';
//import * as qj from './subject';

export function bindCB<R1, R2, R3, R4>(
  cb: (_: (r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any) => any,
  h?: qh.Scheduler
): () => qt.Source<any[]>;
export function bindCB<R1, R2, R3>(
  cb: (_: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): () => qt.Source<[R1, R2, R3]>;
export function bindCB<R1, R2>(
  cb: (_: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): () => qt.Source<[R1, R2]>;
export function bindCB<R1>(
  cb: (_: (r1: R1) => any) => any,
  h?: qh.Scheduler
): () => qt.Source<R1>;

export function bindCB<A1, R1, R2, R3, R4>(
  cb: (a1: A1, _: (r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qt.Source<any[]>;
export function bindCB<A1, R1, R2, R3>(
  cb: (a1: A1, _: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qt.Source<[R1, R2, R3]>;
export function bindCB<A1, R1, R2>(
  cb: (a1: A1, _: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qt.Source<[R1, R2]>;
export function bindCB<A1, R1>(
  cb: (a1: A1, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qt.Source<R1>;

export function bindCB<A1, A2, R1, R2, R3, R4>(
  cb: (a1: A1, a2: A2, _: (r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qt.Source<any[]>;
export function bindCB<A1, A2, R1, R2, R3>(
  cb: (a1: A1, a2: A2, _: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qt.Source<[R1, R2, R3]>;
export function bindCB<A1, A2, R1, R2>(
  cb: (a1: A1, a2: A2, _: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qt.Source<[R1, R2]>;
export function bindCB<A1, A2, R1>(
  cb: (a1: A1, a2: A2, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qt.Source<R1>;

export function bindCB<A1, A2, A3, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    _: (r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qt.Source<any[]>;
export function bindCB<A1, A2, A3, R1, R2, R3>(
  cb: (a1: A1, a2: A2, a3: A3, _: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qt.Source<[R1, R2, R3]>;
export function bindCB<A1, A2, A3, R1, R2>(
  cb: (a1: A1, a2: A2, a3: A3, _: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qt.Source<[R1, R2]>;
export function bindCB<A1, A2, A3, R1>(
  cb: (a1: A1, a2: A2, a3: A3, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qt.Source<R1>;

export function bindCB<A1, A2, A3, A4, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    _: (r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qt.Source<any[]>;
export function bindCB<A1, A2, A3, A4, R1, R2, R3>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qt.Source<[R1, R2, R3]>;
export function bindCB<A1, A2, A3, A4, R1, R2>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qt.Source<[R1, R2]>;
export function bindCB<A1, A2, A3, A4, R1>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qt.Source<R1>;

export function bindCB<A1, A2, A3, A4, A5, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qt.Source<any[]>;
export function bindCB<A1, A2, A3, A4, A5, R1, R2, R3>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, _: (r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qt.Source<[R1, R2, R3]>;
export function bindCB<A1, A2, A3, A4, A5, R1, R2>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, _: (r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qt.Source<[R1, R2]>;
export function bindCB<A1, A2, A3, A4, A5, R1>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, _: (r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qt.Source<R1>;

export function bindCB<A, R>(
  cb: (..._: Array<A | ((r: R) => any)>) => any,
  h?: qh.Scheduler
): (..._: A[]) => qt.Source<R>;
export function bindCB<A, R>(
  cb: (..._: Array<A | ((..._: R[]) => any)>) => any,
  h?: qh.Scheduler
): (..._: A[]) => qt.Source<R[]>;
export function bindCB<N>(cb: Function, h?: qh.Scheduler): (..._: any[]) => qt.Source<N> {
  let s: qt.Subject<N> | undefined;
  function dispatch(this: qt.Action<N>, t?: qt.State<N>) {
    if (!s) {
      s = qx.createAsync();
      const f = (...ns: any[]) => {
        const n = ns.length <= 1 ? ns[0] : ns;
        this.add(h!.schedule(qh.nextAndDone, {s, n} as qt.State<N>));
      };
      try {
        cb.apply(t!.ctx, [...t!.args, f]);
      } catch (e) {
        s!.fail(e);
      }
    }
    this.add(s.subscribe(t!.r));
  }
  return function (this: any, ...args: any[]): qt.Source<N> {
    const ctx = this;
    return qx.createSource(r => {
      if (h) return h.schedule<N>(dispatch, {r, cb, ctx, args} as qt.State<N>);
      if (!s) {
        s = qx.createAsync();
        const f = (...ns: any[]) => {
          s!.next(ns.length <= 1 ? ns[0] : ns);
          s!.done();
        };
        try {
          cb.apply(ctx, [...args, f]);
        } catch (e) {
          if (qu.canReportError(s)) s.fail(e);
          else console.warn(e);
        }
      }
      return s.subscribe(r);
    });
  };
}

export function bindNodeCB<R1, R2, R3, R4>(
  cb: (_: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any) => any,
  h?: qh.Scheduler
): (..._: any[]) => qt.Source<any[]>;
export function bindNodeCB<R1, R2, R3>(
  cb: (_: (e: any, r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): () => qt.Source<[R1, R2, R3]>;
export function bindNodeCB<R1, R2>(
  cb: (_: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): () => qt.Source<[R1, R2]>;
export function bindNodeCB<R1>(
  cb: (_: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): () => qt.Source<R1>;

export function bindNodeCB<A1, R1, R2, R3, R4>(
  cb: (a1: A1, _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any) => any,
  h?: qh.Scheduler
): (..._: any[]) => qt.Source<any[]>;
export function bindNodeCB<A1, R1, R2, R3>(
  cb: (a1: A1, _: (e: any, r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qt.Source<[R1, R2, R3]>;
export function bindNodeCB<A1, R1, R2>(
  cb: (a1: A1, _: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qt.Source<[R1, R2]>;
export function bindNodeCB<A1, R1>(
  cb: (a1: A1, _: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1) => qt.Source<R1>;

export function bindNodeCB<A1, A2, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (..._: any[]) => qt.Source<any[]>;
export function bindNodeCB<A1, A2, R1, R2, R3>(
  cb: (a1: A1, a2: A2, _: (e: any, r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qt.Source<[R1, R2, R3]>;
export function bindNodeCB<A1, A2, R1, R2>(
  cb: (a1: A1, a2: A2, _: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qt.Source<[R1, R2]>;
export function bindNodeCB<A1, A2, R1>(
  cb: (a1: A1, a2: A2, _: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2) => qt.Source<R1>;

export function bindNodeCB<A1, A2, A3, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (..._: any[]) => qt.Source<any[]>;
export function bindNodeCB<A1, A2, A3, R1, R2, R3>(
  cb: (a1: A1, a2: A2, a3: A3, _: (e: any, r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qt.Source<[R1, R2, R3]>;
export function bindNodeCB<A1, A2, A3, R1, R2>(
  cb: (a1: A1, a2: A2, a3: A3, _: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qt.Source<[R1, R2]>;
export function bindNodeCB<A1, A2, A3, R1>(
  cb: (a1: A1, a2: A2, a3: A3, _: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3) => qt.Source<R1>;

export function bindNodeCB<A1, A2, A3, A4, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (..._: any[]) => qt.Source<any[]>;
export function bindNodeCB<A1, A2, A3, A4, R1, R2, R3>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (e: any, r1: R1, r2: R2, r3: R3) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qt.Source<[R1, R2, R3]>;
export function bindNodeCB<A1, A2, A3, A4, R1, R2>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qt.Source<[R1, R2]>;
export function bindNodeCB<A1, A2, A3, A4, R1>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, _: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4) => qt.Source<R1>;

export function bindNodeCB<A1, A2, A3, A4, A5, R1, R2, R3, R4>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (e: any, r1: R1, r2: R2, r3: R3, r4: R4, ..._: any[]) => any
  ) => any,
  h?: qh.Scheduler
): (..._: any[]) => qt.Source<any[]>;
export function bindNodeCB<A1, A2, A3, A4, A5, R1, R2, R3>(
  cb: (
    a1: A1,
    a2: A2,
    a3: A3,
    a4: A4,
    a5: A5,
    _: (e: any, r1: R1, r2: R2, r3: R3) => any
  ) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qt.Source<[R1, R2, R3]>;
export function bindNodeCB<A1, A2, A3, A4, A5, R1, R2>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, _: (e: any, r1: R1, r2: R2) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qt.Source<[R1, R2]>;
export function bindNodeCB<A1, A2, A3, A4, A5, R1>(
  cb: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, _: (e: any, r1: R1) => any) => any,
  h?: qh.Scheduler
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => qt.Source<R1>;

export function bindNodeCB<N>(
  cb: Function,
  h?: qh.Scheduler
): (..._: any[]) => qt.Source<N> {
  let s: qt.Subject<N> | undefined;
  function dispatch(this: qt.Action<N>, t?: qt.State<N>) {
    if (!s) {
      s = qx.createAsync();
      const f = (...ns: any[]) => {
        const n = ns.length <= 1 ? ns[0] : ns;
        this.add(h!.schedule(qh.nextAndDone, {s, n} as qt.State<N>));
      };
      try {
        cb.apply(t!.ctx, [...t!.args, f]);
      } catch (e) {
        s!.fail(e);
      }
    }
    this.add(s.subscribe(t!.r));
  }
  return function (this: any, ...args: any[]): qt.Source<N> {
    const ctx = this;
    return qx.createSource(r => {
      if (h) return h.schedule<N>(dispatch, {r, cb, ctx, args} as qt.State<N>);
      if (!s) {
        s = qx.createAsync();
        const f = (...ns: any[]) => {
          const e = ns.shift();
          if (e) {
            s!.fail(e);
            return;
          }
          s!.next(ns.length <= 1 ? ns[0] : ns);
          s!.done();
        };
        try {
          cb.apply(ctx, [...args, f]);
        } catch (e) {
          if (qu.canReportError(s)) s.fail(e);
          else console.warn(e);
        }
      }
      return s.subscribe(r);
    });
  };
}

export function defer<X extends qt.Input<any> | void>(
  fac: () => X
): qt.Source<qt.Sourced<X>> {
  return new qs.Source<qt.Sourced<X>>(r => {
    let inp: X | void;
    try {
      inp = fac();
    } catch (e) {
      r.fail(e);
      return;
    }
    const s = inp ? from(inp as qt.Input<qt.Sourced<X>>) : EMPTY;
    return s.subscribe(r);
  });
}

export function empty(h?: qh.Scheduler) {
  return h
    ? new qs.Source<never>(r => h.schedule<never>(() => r.done()))
    : new qs.Source<never>(r => r.done());
}

export function from<X extends qt.Input<any>>(inp: X): qs.Source<qt.Sourced<X>>;
export function from<N>(inp: qt.Input<N>, h?: qh.Scheduler): qs.Source<N> {
  if (h) return h.scheduled(inp);
  else {
    if (qu.isSource<N>(inp)) return inp;
    return new qs.Source<N>(qu.subscribeTo(inp));
  }
}

export function fromArray<N>(inp: ArrayLike<N>, h?: qh.Scheduler) {
  if (h) return h.scheduleArray(inp);
  return new qs.Source<N>(qu.subscribeToArray(inp));
}

export interface NodeStyleEventEmitter {
  addListener: (n: string | symbol, h: NodeEventHandler) => this;
  removeListener: (n: string | symbol, h: NodeEventHandler) => this;
}

export type NodeEventHandler = (..._: any[]) => void;

export interface NodeCompatibleEventEmitter {
  addListener: (n: string, h: NodeEventHandler) => void | {};
  removeListener: (n: string, h: NodeEventHandler) => void | {};
}

export interface JQueryStyleEventEmitter {
  on: (n: string, h: Function) => void;
  off: (n: string, h: Function) => void;
}

export interface HasEventTargetAddRemove<E> {
  addEventListener(
    t: string,
    l: (_: E) => void,
    os?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    t: string,
    l?: (_: E) => void,
    os?: EventListenerOptions | boolean
  ): void;
}

export type EventTargetLike<T> =
  | HasEventTargetAddRemove<T>
  | NodeStyleEventEmitter
  | NodeCompatibleEventEmitter
  | JQueryStyleEventEmitter;

export type FromEventTarget<T> = EventTargetLike<T> | ArrayLike<EventTargetLike<T>>;

export interface EventListenerOptions {
  capture?: boolean;
  passive?: boolean;
  once?: boolean;
}

export interface AddEventListenerOptions extends EventListenerOptions {
  once?: boolean;
  passive?: boolean;
}

export function fromEvent<T>(target: FromEventTarget<T>, eventName: string): qs.Source<T>;
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
  if (qu.isFunction(options)) {
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
        Array.isArray(args) ? resultSelector!(...args) : resultSelector!(args)
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

function isNodeStyleEventEmitter(sourceObj: any): sourceObj is NodeStyleEventEmitter {
  return (
    sourceObj &&
    typeof sourceObj.addListener === 'function' &&
    typeof sourceObj.removeListener === 'function'
  );
}

function isJQueryStyleEventEmitter(sourceObj: any): sourceObj is JQueryStyleEventEmitter {
  return (
    sourceObj && typeof sourceObj.on === 'function' && typeof sourceObj.off === 'function'
  );
}

function isEventTarget(sourceObj: any): sourceObj is HasEventTargetAddRemove<any> {
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
      map(args => (Array.isArray(args) ? resultSelector(...args) : resultSelector(args)))
    );
  }
  return new qs.Source<T | T[]>(subscriber => {
    const handler = (...e: T[]) => subscriber.next(e.length === 1 ? e[0] : e);
    let retValue: any;
    try {
      retValue = addHandler(handler);
    } catch (e) {
      subscriber.fail(e);
      return;
    }

    if (!qu.isFunction(removeHandler)) {
      return;
    }

    return () => removeHandler(handler, retValue);
  });
}

export function fromIter<N>(b: Iterable<N>, h?: qh.Scheduler) {
  if (!h) return new qs.Source<N>(qu.subscribeToIter<N>(b));
  return h.scheduleIter<N>(b);
}

export function fromSource<N>(i: qt.Interop<N>, h?: qh.Scheduler) {
  if (!h) return new qs.Source<N>(qu.subscribeToSource<N>(i));
  return h.scheduleSource<N>(i);
}

export function fromPromise<N>(p: PromiseLike<N>, h?: qh.Scheduler) {
  if (!h) return new qs.Source<N>(qu.subscribeToPromise<N>(p));
  return h.schedulePromise<N>(p);
}

export type ConditionFunc<S> = (state: S) => boolean;
export type IterateFunc<S> = (state: S) => S;
export type ResultFunc<S, T> = (state: S) => T;

interface SchedulerState<T, S> {
  needIterate?: boolean;
  state: S;
  subscriber: qt.Subscriber<T>;
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
    h = options.h;
  } else if (
    resultSelectorOrScheduler === undefined ||
    qu.isScheduler(resultSelectorOrScheduler)
  ) {
    initialState = initialStateOrOptions as S;
    resultSelector = identity as ResultFunc<S, T>;
    h = resultSelectorOrScheduler as qh.Scheduler;
  } else {
    initialState = initialStateOrOptions as S;
    resultSelector = resultSelectorOrScheduler as ResultFunc<S, T>;
  }
  return new qs.Source<T>(subscriber => {
    let state = initialState;
    if (h) {
      return h.schedule<SchedulerState<T, S>>(dispatch as any, {
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
        } catch (e) {
          subscriber.fail(e);
          return;
        }
        if (!conditionResult) {
          subscriber.done();
          break;
        }
      }
      let value: T;
      try {
        value = resultSelector(state);
      } catch (e) {
        subscriber.fail(e);
        return;
      }
      subscriber.next(value);
      if (subscriber.closed) {
        break;
      }
      try {
        state = iterate!(state);
      } catch (e) {
        subscriber.fail(e);
        return;
      }
    } while (true);
    return;
  });
}

export function iif<T = never, F = never>(
  condition: () => boolean,
  trueResult: qt.SourceOrPromise<T> = EMPTY,
  falseResult: qt.SourceOrPromise<F> = EMPTY
): qs.Source<T | F> {
  return defer(() => (condition() ? trueResult : falseResult));
}

export function interval(period = 0, h: qh.Scheduler = qh.async): qs.Source<number> {
  if (!qu.isNumeric(period) || period < 0) period = 0;
  if (!h || typeof h.schedule !== 'function') h = qh.async;
  return new qs.Source<number>(r => {
    r.add(
      h.schedule(
        dispatch as any,
        {
          r,
          counter: 0,
          period
        },
        period
      )
    );
    return r;
  });
}

function dispatch(this: qh.Action<IntervalState>, state: IntervalState) {
  const {subscriber, counter, period} = state;
  subscriber.next(counter);
  this.schedule({subscriber, counter: counter + 1, period}, period);
}

interface IntervalState {
  subscriber: qt.Subscriber<number>;
  counter: number;
  period: number;
}

export const NEVER = new qs.Source<never>(qu.noop);

export function of(): qs.Source<never>;
export function of<N>(_: N): qs.Source<N>;
export function of<N, M>(_1: N, _2: M): qs.Source<N | M>;
export function of<N, M, O>(_1: N, _2: M, _3: O): qs.Source<N | M | O>;
export function of<A extends Array<any>>(..._: A): qs.Source<qt.ValueOf<A>>;
export function of<N>(...args: Array<N | qh.Scheduler>): qs.Source<N> {
  let h = args[args.length - 1] as qh.Scheduler;
  if (qu.qu.isScheduler(h)) {
    args.pop();
    return h.scheduleArray(args as N[]);
  }
  return fromArray(args as N[]);
}

export function range(
  start: number = 0,
  count?: number,
  h?: qh.Scheduler
): qs.Source<number> {
  return new qs.Source<number>(r => {
    if (count === undefined) {
      count = start;
      start = 0;
    }
    let index = 0;
    let current = start;
    if (h) {
      return h.schedule(dispatch, 0, {
        index,
        count,
        start,
        r
      });
    } else {
      do {
        if (index++ >= count) {
          r.done();
          break;
        }
        r.next(current++);
        if (r.closed) break;
      } while (true);
    }
    return;
  });
}

export function timer(
  dueTime: number | Date = 0,
  periodOrScheduler?: number | qh.Scheduler,
  h?: qh.Scheduler
): qs.Source<number> {
  let period = -1;
  if (qu.isNumeric(periodOrScheduler)) {
    period = (Number(periodOrScheduler) < 1 && 1) || Number(periodOrScheduler);
  } else if (qu.isScheduler(periodOrScheduler)) h = periodOrScheduler as any;
  if (!qu.isScheduler(h)) h = qh.async;
  return new qs.Source(r => {
    const due = qu.isNumeric(dueTime) ? (dueTime as number) : +dueTime - h!.now();
    return h!.schedule(dispatch as any, due, {
      index: 0,
      period,
      r
    });
  });
}

export function throwError(error: any, h?: qh.Scheduler): qs.Source<never> {
  if (!h) return new qs.Source(r => r.fail(error));
  return new qs.Source(r => h.schedule(dispatch as any, {error, r}));
}

interface TimerState {
  index: number;
  period: number;
  subscriber: qj.Subscriber<number>;
}

function dispatch(this: qh.Action<TimerState>, state: TimerState) {
  const {index, period, subscriber} = state;
  subscriber.next(index);
  if (subscriber.closed) return;
  if (period === -1) return subscriber.done();
  state.index = index + 1;
  this.schedule(state, period);
}

/* ** */

export function repeat<N>(count: number = -1): qt.Shifter<N> {
  return x => {
    if (count === 0) return EMPTY;
    if (count < 0) return x.lift(new RepeatOperator(-1, x));
    return x.lift(new RepeatO(count - 1, x));
  };
}

class RepeatO<N> implements qt.Operator<N, N> {
  constructor(private count: number, private source: qt.Source<N>) {}
  call(subscriber: qt.Subscriber<N>, source: any): qt.Closer {
    return source.subscribe(new RepeatR(subscriber, this.count, this.source));
  }
}

export class RepeatR<N> extends qt.Subscriber<N> {
  constructor(
    tgt: qt.Subscriber<any>,
    private count: number,
    private source: qt.Source<N>
  ) {
    super(tgt);
  }

  done() {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) return super.done();
      else if (count > -1) this.count = count - 1;
      source.subscribe(this._recycle());
    }
  }
}

export function repeatWhen<N>(
  notifier: (notifications: qt.Source<any>) => qt.Source<any>
): qt.Shifter<N> {
  return (source: qt.Source<N>) => source.lift(new RepeatWhenO(notifier));
}

class RepeatWhenO<N> implements qt.Operator<N, N> {
  constructor(protected notifier: (notifications: qt.Source<any>) => qt.Source<any>) {}

  call(subscriber: qt.Subscriber<N>, source: any): qt.Closer {
    return source.subscribe(new RepeatWhenR(subscriber, this.notifier, source));
  }
}

export class RepeatWhenR<N, M> extends Reactor<N, M> {
  private notifications: Subject<void> = null;
  private retries: qt.Source<any> = null;
  private retriesSubscription: Subscription | undefined = null;
  private sourceIsBeingSubscribedTo = true;

  constructor(
    tgt: qt.Subscriber<R>,
    private notifier: (notifications: qt.Source<any>) => qt.Source<any>,
    private source: qt.Source<N>
  ) {
    super(tgt);
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M>
  ): void {
    this.sourceIsBeingSubscribedTo = true;
    this.source.subscribe(this);
  }

  reactDone(innerSub: Actor<N, M>): void {
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

  _recycle(): qt.Subscriber<N> {
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

export function throwIfEmpty<N>(
  errorFactory: () => any = defaultErrorFactory
): qt.Shifter<N> {
  return (source: qt.Source<N>) => {
    return source.lift(new ThrowIfEmptyO(errorFactory));
  };
}

class ThrowIfEmptyO<N> implements qt.Operator<N, N> {
  constructor(private errorFactory: () => any) {}

  call(subscriber: qt.Subscriber<N>, source: any): qt.Closer {
    return source.subscribe(new ThrowIfEmptyR(subscriber, this.errorFactory));
  }
}

export class ThrowIfEmptyR<N> extends qt.Subscriber<N> {
  private hasValue = false;

  constructor(tgt: qt.Subscriber<N>, private errorFactory: () => any) {
    super(tgt);
  }

  protected _next(n: N) {
    this.hasValue = true;
    this.tgt.next(n);
  }

  protected _done() {
    if (!this.hasValue) {
      let err: any;
      try {
        err = this.errorFactory();
      } catch (e) {
        err = e;
      }
      this.tgt.fail(err);
    } else return this.tgt.done();
  }
}

function defaultErrorFactory() {
  return new EmptyError();
}
