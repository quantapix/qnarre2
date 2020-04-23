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

export function from<X extends qt.Input<any>>(x: X): qs.Source<qt.Sourced<X>>;
export function from<N>(i: qt.Input<N>, h?: qh.Scheduler): qs.Source<N> {
  if (h) return h.scheduled(i);
  else {
    if (qu.isSource<N>(i)) return i;
    return new qs.Source<N>(qu.subscribeTo(i));
  }
}

export function fromArray<N>(a: ArrayLike<N>, h?: qh.Scheduler) {
  if (h) return h.scheduleArray(a);
  return new qs.Source<N>(qu.subscribeToArray<N>(a));
}

export function fromIter<N>(b: Iterable<N>, h?: qh.Scheduler) {
  if (h) return h.scheduleIter<N>(b);
  return new qs.Source<N>(qu.subscribeToIter<N>(b));
}

export function fromSource<N>(i: qt.Interop<N>, h?: qh.Scheduler) {
  if (h) return h.scheduleSource<N>(i);
  return new qs.Source<N>(qu.subscribeToSource<N>(i));
}

export function fromPromise<N>(p: PromiseLike<N>, h?: qh.Scheduler) {
  if (h) return h.schedulePromise<N>(p);
  return new qs.Source<N>(qu.subscribeToPromise<N>(p));
}

function setupSubscription<T>(
  t: qt.FromEventTarget<T>,
  event: string,
  handler: (..._: any[]) => void,
  r: qt.Subscriber<T>,
  os?: qt.ListenerOptions
) {
  let unsub: qt.Fun<void> | undefined;
  if (qu.isEventTarget(t)) {
    const s = t;
    t.addEventListener(event, handler, os);
    unsub = () => s.removeEventListener(event, handler, os);
  } else if (qu.isJQueryEventEmitter(t)) {
    const s = t;
    t.on(event, handler);
    unsub = () => s.off(event, handler);
  } else if (qu.isNodeEventEmitter(t)) {
    const s = t;
    t.addListener(event, handler as qt.NodeEventHandler);
    unsub = () => s.removeListener(event, handler as qt.NodeEventHandler);
  } else if (t && (t as any).length) {
    for (let i = 0, len = (t as any).length; i < len; i++) {
      setupSubscription((t as any)[i], event, handler, r, os);
    }
  } else throw new TypeError('Invalid event target');
  r.add(unsub);
}

export function fromEvent<N>(t: qt.FromEventTarget<N>, event: string): qs.Source<N>;
export function fromEvent<N>(
  t: qt.FromEventTarget<N>,
  event: string,
  os?: qt.ListenerOptions
): qs.Source<N> {
  return new qs.Source<N>(r => {
    function handler(e: N) {
      if (arguments.length > 1) r.next(Array.prototype.slice.call(arguments) as any);
      else r.next(e);
    }
    setupSubscription(t, event, handler, r, os as qt.ListenerOptions);
  });
}

export function fromEventPattern<N>(
  addHandler: (_: qt.NodeEventHandler) => any,
  removeHandler?: (_: qt.NodeEventHandler, _signal?: any) => void
): qs.Source<N | N[]> {
  return new qs.Source<N | N[]>(r => {
    const handler = (...e: N[]) => r.next(e.length === 1 ? e[0] : e);
    let v: any;
    try {
      v = addHandler(handler);
    } catch (e) {
      r.fail(e);
      return;
    }
    if (!qu.isFunction(removeHandler)) return;
    return () => removeHandler(handler, v);
  });
}

type ConditionFun<S> = (_: S) => boolean;
type IterFun<S> = (_: S) => S;
type ResultFun<S, N> = (_: S) => N;

interface SchedulerState<N, S> {
  r: qt.Subscriber<any>;
  needIterate?: boolean;
  s: S;
  c?: ConditionFun<S>;
  i: IterFun<S>;
  rf: ResultFun<S, N>;
}

interface GenerateOptions<N, S> {
  init: S;
  c?: ConditionFun<S>;
  i: IterFun<S>;
  rf: ResultFun<S, N>;
  h?: qh.Scheduler;
}

export function generate<N, S>(
  init: S,
  c: ConditionFun<S>,
  i: IterFun<S>,
  rf: ResultFun<S, N>,
  h?: qh.Scheduler
): qs.Source<N>;
export function generate<S>(
  init: S,
  c: ConditionFun<S>,
  i: IterFun<S>,
  h?: qh.Scheduler
): qs.Source<S>;
export function generate<N, S>(os: GenerateOptions<N, S>): qs.Source<N>;
export function generate<N, S>(
  init: S | GenerateOptions<N, S>,
  c?: ConditionFun<S>,
  i?: IterFun<S>,
  rf?: ResultFun<S, N> | qh.Scheduler,
  h?: qh.Scheduler
): qs.Source<N> {
  if (arguments.length == 1) {
    const os = init as GenerateOptions<N, S>;
    init = os.init;
    c = os.c;
    i = os.i;
    rf = os.rf || (identity as ResultFun<S, N>);
    h = os.h;
  } else if (!rf || qu.isScheduler(rf)) {
    init = init as S;
    h = rf as qh.Scheduler;
    rf = identity as ResultFun<S, N>;
  }
  function dispatch(this: qh.Action<SchedulerState<N, S>>, state: SchedulerState<N, S>) {
    const {r, c} = state;
    if (r.closed) return;
    if (state.needIterate) {
      try {
        state.state = state.iterate(state.state);
      } catch (e) {
        r.fail(e);
        return;
      }
    } else state.needIterate = true;
    if (c) {
      let ok: boolean;
      try {
        ok = c(state.state);
      } catch (e) {
        r.fail(e);
        return;
      }
      if (!ok) {
        r.done();
        return;
      }
      if (r.closed) return;
    }
    let n: N;
    try {
      n = state.rf(state.state);
    } catch (e) {
      r.fail(e);
      return;
    }
    if (r.closed) return;
    r.next(n);
    if (r.closed) return;
    return this.schedule(state);
  }
  return new qs.Source<N>(r => {
    let s = init as S;
    if (h) {
      return h.schedule<SchedulerState<N, S>>(
        dispatch as any,
        {
          r,
          i,
          c,
          rf,
          s
        } as SchedulerState<N, S>
      );
    }
    do {
      if (c) {
        let ok: boolean;
        try {
          ok = c(s);
        } catch (e) {
          r.fail(e);
          return;
        }
        if (!ok) {
          r.done();
          break;
        }
      }
      let n: N;
      try {
        n = (rf as ResultFun<S, N>)(s);
      } catch (e) {
        r.fail(e);
        return;
      }
      r.next(n);
      if (r.closed) break;
      try {
        s = i!(s);
      } catch (e) {
        r.fail(e);
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

interface IntervalState {
  r: qt.Subscriber<number>;
  count: number;
  period: number;
}

export function interval(period = 0, h: qh.Scheduler = qh.async): qs.Source<number> {
  if (!qu.isNumeric(period) || period < 0) period = 0;
  if (!h || typeof h.schedule !== 'function') h = qh.async;
  function dispatch(this: qh.Action<IntervalState>, state: IntervalState) {
    const {r, count, period} = state;
    r.next(count);
    this.schedule({r, counter: count + 1, period}, period);
  }
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

export const NEVER = new qs.Source<never>(qu.noop);

export function of(): qs.Source<never>;
export function of<N>(_: N): qs.Source<N>;
export function of<N, M>(_1: N, _2: M): qs.Source<N | M>;
export function of<N, M, O>(_1: N, _2: M, _3: O): qs.Source<N | M | O>;
export function of<A extends Array<any>>(..._: A): qs.Source<qt.ValueOf<A>>;
export function of<N>(...args: Array<N | qh.Scheduler>): qs.Source<N> {
  let h = args[args.length - 1] as qh.Scheduler;
  if (qu.isScheduler(h)) {
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
  function dispatch(this: qh.Action<any>, state?: any) {
    const {start, index, count, r} = state;
    if (index >= count) {
      r.done();
      return;
    }
    r.next(start);
    if (r.closed) return;
    state.index = index + 1;
    state.start = start + 1;
    this.schedule(state);
  }
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

interface TimerState {
  index: number;
  period: number;
  r: qt.Subscriber<number>;
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
  function dispatch(this: qh.Action<TimerState>, state: TimerState) {
    const {index, period, r} = state;
    r.next(index);
    if (r.closed) return;
    if (period === -1) return r.done();
    state.index = index + 1;
    this.schedule(state, period);
  }
  return new qs.Source(r => {
    const due = qu.isNumeric(dueTime) ? (dueTime as number) : +dueTime - h!.now();
    return h!.schedule(dispatch as any, due, {
      index: 0,
      period,
      r
    });
  });
}

interface ThrowState {
  error: any;
  r: qt.Subscriber<any>;
}

export function throwError(error: any, h?: qh.Scheduler): qs.Source<never> {
  function dispatch({error, r}: ThrowState) {
    r.fail(error);
  }
  if (h) return new qs.Source(r => h.schedule(dispatch as any, {error, r}));
  return new qs.Source(r => r.fail(error));
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
