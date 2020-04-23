import * as qr from './subscriber';
import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';

export class Action<N> extends qr.Subscription implements qt.Action<N> {
  constructor(
    public h: Scheduler,
    public work: (this: Action<N>, _?: qt.State<N>) => void
  ) {
    super();
  }

  schedule(_?: qt.State<N>, _delay?: number): qt.Subscription {
    return this;
  }
}

export function nextAndDone<N>(t?: qt.State<N>) {
  t?.s?.next(t.n);
  t?.s?.done();
}

export function fail<N>(t?: qt.State<N>) {
  t?.s?.fail(t.f);
}

export class Scheduler implements qt.Scheduler {
  constructor(private A: typeof Action, public now = () => Date.now()) {}

  schedule<N>(
    work: (this: Action<N>, _?: qt.State<N>) => void,
    state?: qt.State<N>,
    delay?: number
  ): qt.Subscription {
    return new this.A(this, work).schedule(state, delay);
  }

  scheduleArray<N>(a: ArrayLike<N>) {
    return new qs.Source<N>(r => {
      const s = new qr.Subscription();
      let i = 0;
      s.add(
        this.schedule<N>(function () {
          if (i === a.length) r.done();
          else {
            r.next(a[i++]);
            if (!r.closed) s.add(this.schedule());
          }
        })
      );
      return s;
    });
  }

  scheduleIter<N>(b: Iterable<N>) {
    return new qs.Source<N>(r => {
      const s = new qr.Subscription();
      let i: Iterator<N>;
      s.add(() => {
        if (i && typeof i.return === 'function') i.return();
      });
      s.add(
        this.schedule<N>(() => {
          i = b[Symbol.iterator]();
          s.add(
            this.schedule<N>(function () {
              if (!r.closed) {
                let y: IteratorResult<N>;
                try {
                  y = i.next();
                } catch (e) {
                  r.fail(e);
                  return;
                }
                if (y.done) r.done();
                else {
                  r.next(y.value);
                  this.schedule();
                }
              }
            })
          );
        })
      );
      return s;
    });
  }

  scheduleAsyncIter<N>(b: AsyncIterable<N>) {
    return new qs.Source<N>(r => {
      const s = new qr.Subscription();
      s.add(
        this.schedule<N>(() => {
          s.add(
            this.schedule<N>(function () {
              b[Symbol.asyncIterator]()
                .next()
                .then(y => {
                  if (y.done) r.done();
                  else {
                    r.next(y.value);
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

  scheduleSource<N>(i: qt.Interop<N>) {
    return new qs.Source<N>(r => {
      const s = new qr.Subscription();
      s.add(
        this.schedule<N>(() => {
          s.add(
            i[Symbol.rxSource]().subscribe({
              next: (n: N) => s.add(this.schedule(() => r.next(n))),
              fail: (e: any) => s.add(this.schedule(() => r.fail(e))),
              done: () => s.add(this.schedule(() => r.done()))
            })
          );
        })
      );
      return s;
    });
  }

  schedulePromise<N>(p: PromiseLike<N>) {
    return new qs.Source<N>(r => {
      const s = new qr.Subscription();
      s.add(
        this.schedule<N>(() =>
          p.then(
            n => {
              s.add(
                this.schedule<N>(() => {
                  r.next(n);
                  s.add(
                    this.schedule<N>(() => r.done())
                  );
                })
              );
            },
            f => {
              s.add(
                this.schedule<N>(() => r.fail(f))
              );
            }
          )
        )
      );
      return s;
    });
  }

  scheduled<N>(i: qt.Input<N>) {
    if (qt.isInterop<N>(i)) return this.scheduleSource<N>(i);
    if (qt.isArrayLike<N>(i)) return this.scheduleArray<N>(i);
    if (qt.isPromise<N>(i)) return this.schedulePromise<N>(i);
    if (qt.isIter<N>(i) || typeof i === 'string') return this.scheduleIter<N>(i);
    if (qt.isAsyncIter<N>(i)) return this.scheduleAsyncIter<N>(i as any);
    throw new TypeError(((i && typeof i) || i) + ' not source input');
  }
}

export class AsyncAction<N> extends Action<N> {
  id?: any;
  state?: qt.State<N>;
  delay?: number;
  pending = false;

  constructor(h: Async, w: (this: Action<N>, _?: qt.State<N>) => void) {
    super(h, w);
  }

  schedule(s?: qt.State<N>, d?: number): qt.Subscription {
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

  protected asyncId(h: Async, _id?: any, d?: number): any {
    return setInterval(h.flush.bind(h, this), d);
  }

  protected recycleId(_: Scheduler, id: any, d?: number) {
    if (d && this.delay === d && !this.pending) return id;
    clearInterval(id);
  }

  execute(s?: qt.State<N>, d?: number) {
    if (this.closed) return new Error('executing cancelled action');
    this.pending = false;
    const e = this._execute(s, d);
    if (e) return e;
    if (!this.pending && this.id) this.id = this.recycleId(this.h, this.id);
  }

  protected _execute(s?: qt.State<N>, _?: number): any {
    try {
      this.work(s);
    } catch (e) {
      this.unsubscribe();
      return e ? e : new Error(e);
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
  busy?: any;
  acts = [] as AsyncAction<any>[];

  constructor(A: typeof Action, now?: () => number) {
    super(A, Async.del ? Async.del.now : now);
  }

  schedule<N>(
    work: (this: Action<N>, _?: qt.State<N>) => void,
    state?: qt.State<N>,
    delay?: number
  ): qt.Subscription {
    if (Async.del && Async.del !== this) return Async.del.schedule(work, state, delay);
    return super.schedule(work, state, delay);
  }

  flush(a?: AsyncAction<any>) {
    if (this.active && a) this.acts.push(a);
    else {
      this.active = true;
      const {acts} = this;
      let e: any;
      do {
        if ((e = a?.execute(a.state, a.delay))) break;
      } while ((a = acts.shift()));
      this.active = false;
      if (e) {
        while ((a = acts.shift())) {
          a.unsubscribe();
        }
        throw e;
      }
    }
  }
}

export const async = new Async(AsyncAction);

export class FrameAction<N> extends AsyncAction<N> {
  constructor(h: Frame, w: (this: Action<N>, _?: qt.State<N>) => void) {
    super(h, w);
  }

  protected asyncId(h: Frame, id?: any, d?: number) {
    if (d && d > 0) return super.asyncId(h, id, d);
    h.acts.push(this);
    return h.busy || (h.busy = requestAnimationFrame(() => h.flush()));
  }

  protected recycleId(h: Frame, id?: any, d?: number) {
    if ((d && d > 0) || (!d && this.delay && this.delay > 0)) {
      return super.recycleId(h, id, d);
    }
    if (h.acts.length === 0) {
      cancelAnimationFrame(id);
      h.busy = undefined;
    }
    return;
  }
}

export class Frame extends Async {
  flush(a?: AsyncAction<any>) {
    this.active = true;
    this.busy = undefined;
    let e: any;
    let i = -1;
    const {acts} = this;
    let lim = acts.length;
    a = a || acts.shift();
    do {
      if ((e = a?.execute(a.state, a.delay))) break;
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
  constructor(h: Asap, w: (this: Action<N>, _?: qt.State<N>) => void) {
    super(h, w);
  }

  protected asyncId(h: Asap, id?: any, d?: number) {
    if (d && d > 0) return super.asyncId(h, id, d);
    h.acts.push(this);
    return h.busy || (h.busy = qu.Immediate.setImmediate(h.flush.bind(h, undefined)));
  }

  protected recycleId(h: Asap, id?: any, d?: number) {
    if ((d && d > 0) || (!d && this.delay && this.delay > 0)) {
      return super.recycleId(h, id, d);
    }
    if (h.acts.length === 0) {
      qu.Immediate.clearImmediate(id);
      h.busy = undefined;
    }
    return undefined;
  }
}

export class Asap extends Async {
  flush(a?: AsyncAction<any>) {
    this.active = true;
    this.busy = undefined;
    let e: any;
    let i = -1;
    const {acts} = this;
    let lim = acts.length;
    a = a || acts.shift();
    do {
      if ((e = a?.execute(a.state, a.delay))) break;
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
  constructor(h: Queue, w: (this: Action<N>, _?: qt.State<N>) => void) {
    super(h, w);
  }

  schedule(s?: qt.State<N>, d?: number): qt.Subscription {
    if (d && d > 0) return super.schedule(s, d);
    this.delay = d;
    this.state = s;
    (this.h as Async).flush(this);
    return this;
  }

  execute(s?: qt.State<N>, d?: number) {
    return (d && d > 0) || this.closed ? super.execute(s, d) : this._execute(s, d);
  }

  protected asyncId(h: Queue, id?: any, delay?: number): any {
    if ((delay && delay > 0) || (delay === null && this.delay! > 0)) {
      return super.asyncId(h, id, delay);
    }
    return h.flush(this);
  }
}

export class Queue extends Async {}

export const queue = new Queue(QueueAction);

export class VirtualAction<N> extends AsyncAction<N> {
  protected active = true;

  constructor(
    h: Virtual,
    w: (this: Action<N>, _?: qt.State<N>) => void,
    public index = (h.index += 1)
  ) {
    super(h, w);
    h.index = index;
  }

  schedule(s?: qt.State<N>, d?: number): qt.Subscription {
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

  protected _execute(s?: qt.State<N>, d?: number) {
    if (this.active) return super._execute(s, d);
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

  constructor(A = VirtualAction, public max = Number.POSITIVE_INFINITY) {
    super(A, () => this.frame);
  }

  flush(a?: AsyncAction<any>) {
    const {acts, max} = this;
    let e: any;
    while ((a = acts[0]) && a.delay! <= max) {
      acts.shift();
      this.frame = a.delay ?? 0;
      if ((e = a.execute(a.state, a.delay))) break;
    }
    if (e) {
      while ((a = acts.shift())) {
        a.unsubscribe();
      }
      throw e;
    }
  }
}
