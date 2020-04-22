import * as qj from './subject';
import * as qt from './types';
import * as qu from './utils';
import * as qx from './context';

export class Action<N> extends qj.Subscription implements qt.Action<N> {
  constructor(
    public h: Scheduler,
    public work: (this: qt.Action<N>, _: qt.State<N>) => void
  ) {
    super();
  }

  schedule(_: qt.State<N>, _delay?: number): qt.Subscription {
    return this;
  }
}

export class Scheduler implements qt.Scheduler {
  constructor(private A: typeof Action, public now = () => Date.now()) {}

  schedule<N>(
    work: (this: qt.Action<N>, _: qt.State<N>) => void,
    state: qt.State<N>,
    delay?: number
  ): qt.Subscription {
    return new this.A(this, work).schedule(state, delay);
  }
}

export function nextAndDone<N>(t: qt.State<N>) {
  t.s!.next(t.n);
  t.s!.done();
}

export function fail<N>(t: qt.State<N>) {
  t.s!.fail(t.f);
}

export class AsyncAction<N> extends Action<N> {
  id?: any;
  state?: qt.State<N>;
  delay?: number;
  pending = false;

  constructor(h: Async, w: (this: qt.Action<N>, _: qt.State<N>) => void) {
    super(h, w);
  }

  schedule(s: qt.State<N>, d?: number): qj.Subscription {
    if (this.closed) return this;
    this.state = s;
    const i = this.id;
    const h = this.h as Async;
    if (i) this.id = this.recycleId(h, i, d);
    this.pending = true;
    this.delay = d;
    this.id = this.id || this.asyncId(h, this.id, d);
    return this;
  }

  protected asyncId(h: Async, _?: any, d?: number): any {
    return setInterval(h.flush.bind(h, this), d);
  }

  protected recycleId(_: Scheduler, id: any, d?: number) {
    if (d && this.delay === d && !this.pending) return id;
    clearInterval(id);
  }

  execute(s: qt.State<N>, d?: number) {
    if (this.closed) return new Error('executing cancelled action');
    this.pending = false;
    const e = this._execute(s, d);
    if (e) return e;
    if (!this.pending && this.id) this.id = this.recycleId(this.h, this.id);
  }

  protected _execute(s: qt.State<N>, _?: number): any {
    let failed = false;
    let e: any = undefined;
    try {
      this.work(s);
    } catch (e) {
      failed = true;
      e = e ? e : new Error(e);
    }
    if (failed) {
      this.unsubscribe();
      return e;
    }
  }

  _unsubscribe() {
    const h = this.h as Async;
    const acts = h.acts;
    const i = acts.indexOf(this);
    if (i !== -1) acts.splice(i, 1);
    const id = this.id;
    if (id) this.id = this.recycleId(h, id);
    this.state = undefined;
    this.delay = undefined;
    this.pending = false;
  }
}

export class Async extends Scheduler {
  static del?: Scheduler;

  active = false;
  scheduled?: any;
  acts = [] as AsyncAction<any>[];

  constructor(act: typeof Action, now?: () => number) {
    super(act, Async.del ? Async.del.now : now);
  }

  schedule<N>(
    work: (this: qt.Action<N>, _: qt.State<N>) => void,
    state: qt.State<N>,
    delay?: number
  ): qt.Subscription {
    if (Async.del && Async.del !== this) return Async.del.schedule(work, state, delay);
    return super.schedule(work, state, delay);
  }

  flush(a: AsyncAction<any>) {
    if (this.active) this.acts.push(a);
    else {
      this.active = true;
      let e: any;
      const {acts} = this;
      do {
        if ((e = a.execute(a.state!, a.delay))) break;
      } while ((a = acts.shift()!));
      this.active = false;
      if (e) {
        while ((a = acts.shift()!)) {
          a.unsubscribe();
        }
        throw e;
      }
    }
  }
}

export const async = new Async(AsyncAction);

export class FrameAction<N> extends AsyncAction<N> {
  constructor(h: Frame, w: (this: qt.Action<N>, _: qt.State<N>) => void) {
    super(h, w);
  }

  protected asyncId(h: Frame, id?: any, d?: number) {
    if (d && d > 0) return super.asyncId(h, id, d);
    h.acts.push(this);
    return h.scheduled || (h.scheduled = requestAnimationFrame(() => h.flush(undefined)));
  }

  protected recycleId(h: Frame, id?: any, d?: number) {
    if ((d && d > 0) || (!d && this.delay && this.delay > 0)) {
      return super.recycleId(h, id, d);
    }
    if (h.acts.length === 0) {
      cancelAnimationFrame(id);
      h.scheduled = undefined;
    }
    return;
  }
}

export class Frame extends Async {
  flush(a?: AsyncAction<any>) {
    this.active = true;
    this.scheduled = undefined;
    let e: any;
    let i = -1;
    const {acts} = this;
    let lim = acts.length;
    a = a || acts.shift();
    do {
      if ((e = a?.execute(a.state!, a.delay))) break;
    } while (++i < lim && (a = acts.shift()));
    this.active = false;
    if (e) {
      while (++i < lim && (a = acts.shift())) {
        a.unsubscribe();
      }
      throw e;
    }
  }
}

export const frame = new Frame(FrameAction);

export class AsapAction<N> extends AsyncAction<N> {
  constructor(h: Asap, w: (this: qt.Action<N>, _: qt.State<N>) => void) {
    super(h, w);
  }

  protected asyncId(h: Asap, id?: any, d?: number) {
    if (d && d > 0) return super.asyncId(h, id, d);
    h.acts.push(this);
    return (
      h.scheduled || (h.scheduled = qu.Immediate.setImmediate(h.flush.bind(h, undefined)))
    );
  }

  protected recycleId(h: Asap, id?: any, d?: number) {
    if ((d && d > 0) || (!d && this.delay && this.delay > 0)) {
      return super.recycleId(h, id, d);
    }
    if (h.acts.length === 0) {
      qu.Immediate.clearImmediate(id);
      h.scheduled = undefined;
    }
    return undefined;
  }
}

export class Asap extends Async {
  flush(a?: AsyncAction<any>) {
    this.active = true;
    this.scheduled = undefined;
    let e: any;
    let i = -1;
    const {acts} = this;
    let lim = acts.length;
    a = a || acts.shift();
    do {
      if ((e = a?.execute(a.state!, a.delay))) break;
    } while (++i < lim && (a = acts.shift()));
    this.active = false;
    if (e) {
      while (++i < lim && (a = acts.shift())) {
        a.unsubscribe();
      }
      throw e;
    }
  }
}

export const asap = new Asap(AsapAction);

export class QueueAction<N> extends AsyncAction<N> {
  constructor(h: Queue, w: (this: qt.Action<N>, _: qt.State<N>) => void) {
    super(h, w);
  }

  schedule(s: qt.State<N>, d?: number): qj.Subscription {
    if (d && d > 0) return super.schedule(s, d);
    this.delay = d;
    this.state = s;
    (this.h as Async).flush(this);
    return this;
  }

  execute(s: qt.State<N>, d?: number) {
    return (d && d > 0) || this.closed ? super.execute(s, d) : this._execute(s, d);
  }

  protected asyncId(s: Queue, id?: any, delay?: number): any {
    if ((delay && delay > 0) || (delay === null && this.delay! > 0)) {
      return super.asyncId(s, id, delay);
    }
    return s.flush(this);
  }
}

export class Queue extends Async {}

export const queue = new Queue(QueueAction);

export class VirtualAction<N> extends AsyncAction<N> {
  protected active = true;

  constructor(
    h: Virtual,
    w: (this: qt.Action<N>, _: qt.State<N>) => void,
    public index = (h.index += 1)
  ) {
    super(h, w);
    h.index = index;
  }

  schedule(s: qt.State<N>, d?: number): qj.Subscription {
    if (!this.id) return super.schedule(s, d);
    this.active = false;
    const a = new VirtualAction(this.h as Virtual, this.work);
    this.add(a);
    return a.schedule(s, d);
  }

  protected asyncId(h: Virtual, _?: any, d?: number) {
    this.delay = h.frame + (d ?? 0);
    const {acts} = h;
    acts.push(this);
    (acts as VirtualAction<N>[]).sort(cmp);
    return true;
  }

  protected recycleId(_h: Scheduler, _?: any, _d?: number) {
    return;
  }

  protected _execute(s: qt.State<N>, d?: number) {
    if (this.active === true) return super._execute(s, d);
  }
}

function cmp<N>(a: VirtualAction<N>, b: VirtualAction<N>) {
  if (a.delay === b.delay) {
    if (a.index === b.index) return 0;
    if (a.index > b.index) return 1;
    return -1;
  }
  if (a.delay! > b.delay!) return 1;
  return -1;
}

export class Virtual extends Async {
  static frameTimeFactor = 10;
  frame = 0;
  index = -1;

  constructor(act = VirtualAction, public max = Number.POSITIVE_INFINITY) {
    super(act, () => this.frame);
  }

  flush(a?: AsyncAction<any>) {
    const {acts, max} = this;
    let e: any;
    while ((a = acts[0]) && a.delay! <= max) {
      acts.shift();
      this.frame = a.delay ?? 0;
      if ((e = a.execute(a.state!, a.delay))) break;
    }
    if (e) {
      while ((a = acts.shift())) {
        a.unsubscribe();
      }
      throw e;
    }
  }
}

export function scheduleArray<N>(i: ArrayLike<N>, h: qt.Scheduler) {
  return qx.createSource(r => {
    const s = new qj.Subscription();
    let j = 0;
    s.add(
      h.schedule(function () {
        if (j === i.length) {
          r.done();
          return;
        }
        r.next(i[j++]);
        if (!r.closed) s.add(this.schedule());
      })
    );
    return s;
  });
}

export function scheduleAsyncIter<N>(i: AsyncIterable<N>, h: qt.Scheduler) {
  if (!i) throw new Error('Iterable needed');
  return qx.createSource(r => {
    const s = new qj.Subscription();
    s.add(
      h.schedule(() => {
        const iter = i[Symbol.asyncIterator]();
        s.add(
          h.schedule(function () {
            iter.next().then(res => {
              if (res.done) r.done();
              else {
                r.next(res.value);
                this.schedule();
              }
            });
          })
        );
      })
    );
    return s;
  });
}

export function scheduleIter<N>(i: Iterable<N>, h: qt.Scheduler) {
  if (!i) throw new Error('Iterable needed');
  return qx.createSource(r => {
    const s = new qj.Subscription();
    let iter: Iterator<N>;
    s.add(() => {
      if (iter && typeof iter.return === 'function') iter.return();
    });
    s.add(
      h.schedule(() => {
        iter = (i as any)[Symbol.iterator]();
        s.add(
          h.schedule(function () {
            if (r.closed) return;
            let n: N;
            let done: boolean | undefined;
            try {
              const res = iter.next();
              n = res.value;
              done = res.done;
            } catch (e) {
              r.fail(e);
              return;
            }
            if (done) r.done();
            else r.next(n);
            this.schedule();
          })
        );
      })
    );
    return s;
  });
}

export function scheduleSource<N>(i: qt.Interop<N>, h: qt.Scheduler) {
  return qx.createSource(r => {
    const s = new qj.Subscription();
    s.add(
      h.schedule(() => {
        const x = (i as any)[Symbol.rxSource]() as qt.Source<N>;
        s.add(
          x.subscribe({
            next(n: N) {
              s.add(h.schedule(() => r.next(n)));
            },
            fail(e: any) {
              s.add(h.schedule(() => r.fail(e)));
            },
            done() {
              s.add(h.schedule(() => r.done()));
            }
          })
        );
      })
    );
    return s;
  });
}

export function schedulePromise<N>(p: PromiseLike<N>, h: qt.Scheduler) {
  return qx.createSource(r => {
    const s = new qj.Subscription();
    s.add(
      h.schedule(() =>
        p.then(
          n => {
            s.add(
              h.schedule(() => {
                r.next(n);
                s.add(h.schedule(() => r.done()));
              })
            );
          },
          f => {
            s.add(h.schedule(() => r.fail(f)));
          }
        )
      )
    );
    return s;
  });
}

export function scheduled<N>(i: qt.Input<N>, h: qt.Scheduler): qt.Source<N> {
  if (i) {
    if (qu.isInterop(i)) return scheduleSource(i, h);
    if (qu.isPromise(i)) return schedulePromise(i, h);
    if (qu.isArrayLike(i)) return scheduleArray(i, h);
    if (qu.isIterable(i) || typeof i === 'string') return scheduleIter(i, h);
    if (Symbol.asyncIterator && typeof (i as any)[Symbol.asyncIterator] === 'function') {
      return scheduleAsyncIter(i as any, h);
    }
  }
  throw new TypeError(((i && typeof i) || i) + ' is not observable');
}
