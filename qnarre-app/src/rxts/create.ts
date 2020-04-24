import * as qt from './types';
import * as qu from './utils';
import * as qh from './scheduler';
import * as qs from './source';
import * as qx from './context';
import * as qr from './subscriber';
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
  type S = qt.Nstate<N>;
  let s: qt.Subject<N> | undefined;
  function dispatch(this: qt.Action<S>, t?: S) {
    if (!s) {
      s = qx.createAsync();
      const w = (t?: S) => {
        t?.s?.next(t.n);
        t?.s?.done();
      };
      const f = (...ns: any[]) => {
        const n = ns.length <= 1 ? ns[0] : ns;
        this.add(h!.schedule(w, {s, n} as S));
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
      if (h) return h.schedule<S>(dispatch, {r, cb, ctx, args} as S);
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
  type S = qt.Nstate<N>;
  let s: qt.Subject<N> | undefined;
  function dispatch(this: qt.Action<S>, t?: S) {
    if (!s) {
      s = qx.createAsync();
      const w = (t?: S) => {
        t?.s?.next(t.n);
        t?.s?.done();
      };
      const f = (...ns: any[]) => {
        const n = ns.length <= 1 ? ns[0] : ns;
        this.add(h!.schedule(w, {s, n} as S));
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
      if (h) return h.schedule<S>(dispatch, {r, cb, ctx, args} as S);
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
  type N = qt.Sourced<X>;
  return new qs.Source<N>(r => {
    let inp: X | void;
    try {
      inp = fac();
    } catch (e) {
      r.fail(e);
      return;
    }
    const s = inp ? from(inp as qt.Input<N>) : EMPTY;
    return s.subscribe(r);
  });
}

export const EMPTY = new qs.Source<never>(r => r.done());

export function empty(h?: qh.Scheduler) {
  return h
    ? new qs.Source<never>(r => h.schedule<never>(() => r.done()))
    : EMPTY;
}

//export function from<X extends qt.Input<any>>(x: X): qt.Source<qt.Sourced<X>>;
export function from<N>(i: qt.Input<N>, h?: qh.Scheduler) {
  if (h) return h.scheduled<qt.Nstate<N>>(i);
  else {
    if (qt.isSource<N>(i)) return i as qs.Source<N>;
    return new qs.Source<N>(qr.subscribeTo(i));
  }
}

export function fromArray<N>(a: ArrayLike<N>, h?: qh.Scheduler) {
  if (h) return h.scheduleArray<qt.Nstate<N>>(a);
  return new qs.Source<N>(qr.subscribeToArray(a));
}

export function fromIter<N>(b: Iterable<N>, h?: qh.Scheduler) {
  if (h) return h.scheduleIter<qt.Nstate<N>>(b);
  return new qs.Source<N>(qr.subscribeToIter(b));
}

export function fromSource<N>(i: qt.Interop<N>, h?: qh.Scheduler) {
  if (h) return h.scheduleSource<qt.Nstate<N>>(i);
  return new qs.Source<N>(qr.subscribeToSource(i));
}

export function fromPromise<N>(p: PromiseLike<N>, h?: qh.Scheduler) {
  if (h) return h.schedulePromise<qt.Nstate<N>>(p);
  return new qs.Source<N>(qr.subscribeToPromise(p));
}

function setupSubscription<T>(
  t: qt.FromEventTarget<T>,
  event: string,
  handler: (..._: any[]) => void,
  r: qt.Subscriber<T>,
  os?: qt.ListenerOptions
) {
  let unsub: qt.Fun<void> | undefined;
  if (qt.isEventTarget(t)) {
    const s = t;
    t.addEventListener(event, handler, os);
    unsub = () => s.removeEventListener(event, handler, os);
  } else if (qt.isJQueryEventEmitter(t)) {
    const s = t;
    t.on(event, handler);
    unsub = () => s.off(event, handler);
  } else if (qt.isNodeEventEmitter(t)) {
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
  add: (_: qt.NodeEventHandler) => any,
  del?: (_: qt.NodeEventHandler, _signal?: any) => void
): qs.Source<N | N[]> {
  return new qs.Source<N | N[]>(r => {
    const handler = (...e: N[]) => r.next(e.length === 1 ? e[0] : e);
    let v: any;
    try {
      v = add(handler);
    } catch (e) {
      r.fail(e);
      return;
    }
    if (qt.isFunction(del)) r.add(() => del(handler, v));
  });
}

type Check<S> = (_: S) => boolean;
type Step<S> = (_: S) => S;
type Result<S, N> = (_: S) => N;

interface Gen<N, S> extends qt.Nstate<N> {
  state: S;
  more?: boolean;
  check?: Check<S>;
  step: Step<S>;
  res: Result<S, N>;
}

interface Gops<N, S> {
  init: S;
  check?: Check<S>;
  step: Step<S>;
  res: Result<S, N>;
  h?: qh.Scheduler;
}

export function generate<N, S>(
  init: S,
  check: Check<S>,
  step: Step<S>,
  r: Result<S, N>,
  h?: qh.Scheduler
): qs.Source<N>;
export function generate<S>(
  init: S,
  check: Check<S>,
  step: Step<S>,
  h?: qh.Scheduler
): qs.Source<S>;
export function generate<N, S>(os: Gops<N, S>): qs.Source<N>;
export function generate<N, S>(
  init: S | Gops<N, S>,
  check?: Check<S>,
  step?: Step<S>,
  res?: Result<S, N> | qh.Scheduler,
  h?: qh.Scheduler
): qs.Source<N> {
  if (arguments.length == 1) {
    const os = init as Gops<N, S>;
    init = os.init;
    check = os.check;
    step = os.step;
    res = os.res || (identity as Result<S, N>);
    h = os.h;
  } else if (!res || qt.isScheduler(res)) {
    init = init as S;
    h = res as qh.Scheduler;
    res = identity as Result<S, N>;
  }
  function dispatch(this: qh.Action<Gen<N, S>>, g?: Gen<N, S>) {
    if (g) {
      const {r, check} = g;
      if (r.closed) return;
      if (g.more) {
        try {
          g.state = g.step(g.state);
        } catch (e) {
          r.fail(e);
          return;
        }
      } else g.more = true;
      if (check) {
        let ok: boolean;
        try {
          ok = check(g.state);
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
        n = g.res(g.state);
      } catch (e) {
        r.fail(e);
        return;
      }
      if (r.closed) return;
      r.next(n);
      if (r.closed) return;
      return this.schedule(g);
    }
    return;
  }
  return new qs.Source<N>(r => {
    let s = init as S;
    if (h) {
      return h.schedule<Gen<N, S>>(dispatch, {
        r,
        step,
        check,
        res,
        state: s
      } as Gen<N, S>);
    }
    do {
      if (check) {
        let ok: boolean;
        try {
          ok = check(s);
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
        n = (res as Result<S, N>)?.(s);
      } catch (e) {
        r.fail(e);
        return;
      }
      r.next(n);
      if (r.closed) break;
      try {
        s = step!(s);
      } catch (e) {
        r.fail(e);
        return;
      }
    } while (true);
    return;
  });
}

export function iif<T = never, F = never>(
  c: () => boolean,
  t: qt.SourceOrPromise<T> = EMPTY,
  f: qt.SourceOrPromise<F> = EMPTY
) {
  return defer<qt.Input<T | F>>(() => (c() ? t : f));
}

interface Interval extends qt.Nstate<number> {
  period: number;
  count: number;
}

export function interval(period = 0, h: qh.Scheduler = qh.async) {
  if (period < 0) period = 0;
  if (!qt.isScheduler(h)) h = qh.async;
  function dispatch(this: qh.Action<Interval>, s?: Interval) {
    const {r, count, period} = s!;
    r.next(count);
    if (r.closed) return;
    s!.count = count + 1;
    this.schedule(s!, period);
  }
  return new qs.Source<qt.Nof<Interval>>(r => {
    r.add(h.schedule(dispatch, {r, count: 0, period} as Interval, period));
  });
}

export const NEVER = new qs.Source<never>(qt.noop);

export function of(): qs.Source<never>;
export function of<N>(_: N): qs.Source<N>;
export function of<N, M>(_1: N, _2: M): qs.Source<N | M>;
export function of<N, M, O>(_1: N, _2: M, _3: O): qs.Source<N | M | O>;
export function of<A extends Array<any>>(..._: A): qs.Source<qt.ValueOf<A>>;
export function of<N>(...args: Array<N | qh.Scheduler>): qs.Source<N> {
  let h = args[args.length - 1] as qh.Scheduler;
  if (qt.isScheduler(h)) {
    args.pop();
    return h.scheduleArray<qt.Nstate<N>>(args as N[]);
  }
  return fromArray(args as N[]);
}

interface Range extends qt.Nstate<number> {
  count: number;
  index: number;
  start: number;
}

export function range(start = 0, count?: number, h?: qh.Scheduler): qs.Source<number> {
  function dispatch(this: qh.Action<Range>, s?: Range) {
    const {r, count, index, start} = s!;
    if (index >= count) {
      r.done();
      return;
    }
    r.next(start);
    if (r.closed) return;
    s!.index = index + 1;
    s!.start = start + 1;
    this.schedule(s!);
  }
  return new qs.Source<qt.Nof<Range>>(r => {
    if (count === undefined) {
      count = start;
      start = 0;
    }
    let index = 0;
    let i = start;
    if (h) return h.schedule(dispatch, {r, count, index, start} as Range);
    do {
      if (index++ >= count) {
        r.done();
        break;
      }
      r.next(i++);
      if (r.closed) break;
    } while (true);
    return;
  });
}

interface Timer extends qt.Nstate<number> {
  index: number;
  period: number;
}

export function timer(due: number | Date = 0, period = -1, h?: qh.Scheduler) {
  if (!qt.isScheduler(h)) h = qh.async;
  function dispatch(this: qh.Action<Timer>, s?: Timer) {
    const {r, index, period} = s!;
    r.next(index);
    if (r.closed) return;
    if (period === -1) return r.done();
    s!.index = index + 1;
    this.schedule(s!, period);
  }
  return new qs.Source<qt.Nof<Range>>(r => {
    const d = qt.isNumeric(due) ? (due as number) : +due - h!.now();
    return h!.schedule(dispatch, {r, index: 0, period} as Timer, d);
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
    if (count < 0) return x.lift(new RepeatO<N>(-1, x));
    return x.lift(new RepeatO(count - 1, x));
  };
}

class RepeatO<N> implements qt.Operator<N, N> {
  constructor(private count: number, private source: qt.Source<N>) {}
  call(r: qt.Subscriber<N>, s: any): qt.Closer {
    return s.subscribe(new RepeatR(r, this.count, this.source));
  }
}

export class RepeatR<N> extends qr.Subscriber<N> {
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
  notifier: (notes: qt.Source<any>) => qt.Source<any>
): qt.Shifter<N> {
  return (source: qt.Source<N>) => source.lift(new RepeatWhenO(notifier));
}

class RepeatWhenO<N> implements qt.Operator<N, N> {
  constructor(protected notifier: (notes: qt.Source<any>) => qt.Source<any>) {}
  call(r: qt.Subscriber<N>, s: any): qt.Closer {
    return s.subscribe(new RepeatWhenR(r, this.notifier, s));
  }
}

export class RepeatWhenR<N, R> extends qr.Reactor<N, R> {
  private notes?: qt.Subject<void>;
  private retries?: qt.Source<any>;
  private s?: qt.Subscription;
  private busy = true;

  constructor(
    tgt: qt.Subscriber<R>,
    private notifier: (notes: qt.Source<any>) => qt.Source<any>,
    private source: qt.Source<N>
  ) {
    super(tgt);
  }

  reactNext() {
    this.busy = true;
    this.source.subscribe(this);
  }

  reactDone() {
    if (this.busy === false) return super.done();
  }

  done() {
    this.busy = false;
    if (!this.stopped) {
      if (!this.retries) this.subscribeToRetries();
      if (!this.s || this.s.closed) return super.done();
      this._recycle();
      this.notes!.next();
    }
  }

  _unsubscribe() {
    const {notes, s} = this;
    if (notes) {
      notes.unsubscribe();
      this.notes = undefined;
    }
    if (s) {
      s.unsubscribe();
      this.s = undefined;
    }
    this.retries = undefined;
  }

  _recycle(): qt.Subscriber<N> {
    const {_unsubscribe} = this;
    this._unsubscribe = undefined;
    super._recycle();
    this._unsubscribe = _unsubscribe;
    return this;
  }

  private subscribeToRetries() {
    this.notes = new qs.Subject();
    let rs;
    try {
      const {notifier} = this;
      rs = notifier(this.notes);
    } catch (e) {
      return super.done();
    }
    this.retries = rs;
    this.s = qr.subscribeToResult(this, rs);
  }
}

export function throwIfEmpty<N>(
  fac: () => any = () => new qu.EmptyError()
): qt.Shifter<N> {
  return x => x.lift(new ThrowIfEmptyO(fac));
}

class ThrowIfEmptyO<N> implements qt.Operator<N, N> {
  constructor(private fac: () => any) {}
  call(r: qt.Subscriber<N>, s: any): qt.Closer {
    return s.subscribe(new ThrowIfEmptyR(r, this.fac));
  }
}

export class ThrowIfEmptyR<N> extends qr.Subscriber<N> {
  private hasN = false;

  constructor(tgt: qt.Subscriber<N>, private fac: () => any) {
    super(tgt);
  }

  protected _next(n: N) {
    this.hasN = true;
    this.tgt.next(n);
  }

  protected _done() {
    if (!this.hasN) {
      let err: any;
      try {
        err = this.fac();
      } catch (e) {
        err = e;
      }
      this.tgt.fail(err);
    } else return this.tgt.done();
  }
}
