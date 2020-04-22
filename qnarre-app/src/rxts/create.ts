import * as qt from './types';
import * as qu from './utils';
import * as qh from './scheduler';
import * as qs from './source';
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
  const c = this;
  let s: qt.Subject<N> | undefined;
  function dispatch(this: qt.Action<N>, t: qt.State<N>) {
    if (!s) {
      s = c.createAsync();
      const f = (...ns: any[]) => {
        const n = ns.length <= 1 ? ns[0] : ns;
        this.add(h!.schedule(qh.nextAndDone, {s, n} as qt.State<N>));
      };
      try {
        cb.apply(t.ctx, [...t.args, f]);
      } catch (e) {
        s!.fail(e);
      }
    }
    this.add(s.subscribe(t.r));
  }
  return function (this: any, ...args: any[]): qt.Source<N> {
    const ctx = this;
    return c.createSource(r => {
      if (h) return h.schedule<N>(dispatch, {r, cb, ctx, args} as qt.State<N>);
      if (!s) {
        s = c.createAsync();
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
  const c = this;
  let s: qt.Subject<N> | undefined;
  function dispatch(this: qt.Action<N>, t: qt.State<N>) {
    if (!s) {
      s = c.createAsync();
      const f = (...ns: any[]) => {
        const n = ns.length <= 1 ? ns[0] : ns;
        this.add(h!.schedule(qh.nextAndDone, {s, n} as qt.State<N>));
      };
      try {
        cb.apply(t.ctx, [...t.args, f]);
      } catch (e) {
        s!.fail(e);
      }
    }
    this.add(s.subscribe(t.r));
  }
  return function (this: any, ...args: any[]): qt.Source<N> {
    const ctx = this;
    return c.createSource(r => {
      if (h) return h.schedule<N>(dispatch, {r, cb, ctx, args} as qt.State<N>);
      if (!s) {
        s = c.createAsync();
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

export function defer<R extends qt.Input<any> | void>(
  fac: () => R
): qt.Source<qt.Sourced<R>> {
  return this.createSource<qt.Sourced<R>>(r => {
    let inp: R | void;
    try {
      inp = fac();
    } catch (e) {
      r.fail(e);
      return;
    }
    const s = inp ? from(inp as qt.Input<qt.Sourced<R>>) : EMPTY;
    return s.subscribe(r);
  });
}

export function empty(h?: qh.Scheduler) {
  return h
    ? this.createSource<never>(r => h.schedule(() => r.done()))
    : this.createSource<never>(r => r.done());
}

export function from<T extends qt.Input<T>>(inp: T): qs.Source<qt.Sourced<T>>;
export function from<N>(inp: qt.Input<N>, h?: qh.Scheduler): qs.Source<N> {
  if (h) return qh.scheduled(inp, h);
  else {
    //if (inp instanceof qs.Source<N>) return inp;
    return this.createSource<N>(qu.subscribeTo(inp));
  }
}

export function fromArray<N>(inp: ArrayLike<N>, h?: qh.Scheduler) {
  if (h) return qh.scheduleArray(inp, h);
  else return this.createSource<N>(qu.subscribeToArray(inp));
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
      map(args => (isArray(args) ? resultSelector!(...args) : resultSelector!(args)))
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
      map(args => (isArray(args) ? resultSelector(...args) : resultSelector(args)))
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

export function interval(period = 0, scheduler: qh.Scheduler = async): qs.Source<number> {
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
export function of<T, U, V>(value1: T, value2: U, value3: V): qs.Source<T | U | V>;
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
    const due = isNumeric(dueTime) ? (dueTime as number) : +dueTime - scheduler!.now();

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

export function repeat<N>(count: number = -1): qt.Shifter<N> {
  return (source: qt.Source<N>) => {
    if (count === 0) {
      return EMPTY;
    } else if (count < 0) {
      return source.lift(new RepeatOperator(-1, source));
    } else {
      return source.lift(new RepeatO(count - 1, source));
    }
  };
}

class RepeatO<N> implements qt.Operator<N, N> {
  constructor(private count: number, private source: qt.Source<N>) {}
  call(subscriber: Subscriber<N>, source: any): qt.Closer {
    return source.subscribe(new RepeatR(subscriber, this.count, this.source));
  }
}

export class RepeatR<N> extends Subscriber<N> {
  constructor(tgt: Subscriber<any>, private count: number, private source: qt.Source<N>) {
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

  call(subscriber: Subscriber<N>, source: any): qt.Closer {
    return source.subscribe(new RepeatWhenR(subscriber, this.notifier, source));
  }
}

export class RepeatWhenR<N, M> extends Reactor<N, M> {
  private notifications: Subject<void> = null;
  private retries: qt.Source<any> = null;
  private retriesSubscription: Subscription | undefined = null;
  private sourceIsBeingSubscribedTo = true;

  constructor(
    tgt: Subscriber<R>,
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

  _recycle(): Subscriber<N> {
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

  call(subscriber: Subscriber<N>, source: any): qt.Closer {
    return source.subscribe(new ThrowIfEmptyR(subscriber, this.errorFactory));
  }
}

export class ThrowIfEmptyR<N> extends Subscriber<N> {
  private hasValue = false;

  constructor(tgt: Subscriber<N>, private errorFactory: () => any) {
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
