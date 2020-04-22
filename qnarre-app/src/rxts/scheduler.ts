import * as qs from './source';
import * as qj from './subject';
import * as qu from './utils';
import * as qt from './types';

export class Action<N, F = any, D = any> extends qj.Subscription implements qt.Action<N, F, D> {
  constructor(public h: Scheduler<F, D>, public work: (this: qt.Action<N, F, D>, _: qt.State<N, F, D>) => void) {
    super();
  }

  schedule(_?: qt.State<N, F, D>, _delay = 0): qt.Subscription {
    return this;
  }
}

export class Scheduler<F, D> implements qt.Scheduler<F, D> {
  constructor(private A: typeof Action, public now = () => Date.now()) {}

  schedule<N>(
    work: (this: qt.Action<N, F, D>, _: qt.State<N, F, D>) => void,
    state?: qt.State<N, F, D>,
    delay = 0
  ): qt.Subscription {
    return new this.A(this, work).schedule(state, delay);
  }
}

export function nextAndDone<N, F, D>(t: qt.State<N, F, D>) {
  t.s!.next(t.n);
  t.s!.done(t.d);
}

export function fail<N, F, D>(t: qt.State<N, F, D>) {
  t.s!.fail(t.f);
}

export class AsyncAction<S> extends Action<S> {
  id?: any;
  state?: S;
  delay?: number;
  pending = false;

  constructor(public sched: Async, work: (this: Action<S>, state?: S) => void) {
    super(sched, work);
  }

  schedule(state?: S, delay = 0): qj.Subscription {
    if (this.closed) return this;
    this.state = state;
    const i = this.id;
    const s = this.sched;
    if (i) this.id = this.recycleId(s, i, delay);
    this.pending = true;
    this.delay = delay;
    this.id = this.id || this.asyncId(s, this.id, delay);
    return this;
  }

  protected asyncId(s: Async, _?: any, delay = 0): any {
    return setInterval(s.flush.bind(s, this), delay);
  }

  protected recycleId(_: Async, id: any, delay = 0) {
    if (delay && this.delay === delay && !this.pending) return id;
    clearInterval(id);
  }

  public execute(state: S, delay?: number): any {
    if (this.closed) return new Error('executing cancelled action');
    this.pending = false;
    const e = this._execute(state, delay);
    if (e) return e;
    if (!this.pending && this.id) {
      this.id = this.recycleId(this.sched, this.id);
    }
  }

  protected _execute(state: S, _?: number): any {
    let failed = false;
    let e: any = undefined;
    try {
      this.work(state);
    } catch (e) {
      failed = true;
      e = (!!e && e) || new Error(e);
    }
    if (failed) {
      this.unsubscribe();
      return e;
    }
  }

  _unsubscribe() {
    const s = this.sched;
    const acts = s.acts;
    const i = acts.indexOf(this);
    if (i !== -1) acts.splice(i, 1);
    const id = this.id;
    if (id) this.id = this.recycleId(s, id);
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

  constructor(act: typeof Action, now = Scheduler.now) {
    super(act, () => {
      if (Async.del && Async.del !== this) return Async.del.now();
      else return now();
    });
  }

  schedule<S>(work: (this: Action<S>, state?: S) => void, state?: S, delay = 0): qj.Subscription {
    if (Async.del && Async.del !== this) return Async.del.schedule(work, state, delay);
    return super.schedule(work, state, delay);
  }

  flush(a: AsyncAction<any>) {
    if (this.active) this.acts.push(a);
    else {
      let e: any;
      this.active = true;
      const {acts} = this;
      do {
        if ((e = a.execute(a.state, a.delay))) break;
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

export class FrameAction<S> extends AsyncAction<S> {
  constructor(public sched: Frame, public work: (this: Action<S>, state?: S) => void) {
    super(sched, work);
  }

  protected asyncId(s: Frame, id?: any, delay = 0): any {
    if (delay && delay > 0) return super.asyncId(s, id, delay);
    s.acts.push(this);
    return s.scheduled || (s.scheduled = requestAnimationFrame(() => s.flush(undefined)));
  }

  protected recycleId(s: Frame, id?: any, delay = 0): any {
    if ((delay && delay > 0) || (!delay && this.delay! > 0)) {
      return super.recycleId(s, id, delay);
    }
    if (s.acts.length === 0) {
      cancelAnimationFrame(id);
      s.scheduled = undefined;
    }
    return undefined;
  }
}

export class Frame extends Async {
  public flush(action?: AsyncAction<any>): void {
    this.active = true;
    this.scheduled = undefined;
    const {acts} = this;
    let error: any;
    let index: number = -1;
    let count: number = acts.length;
    action = action || acts.shift()!;
    do {
      if ((error = action.execute(action.state, action.delay))) {
        break;
      }
    } while (++index < count && (action = acts.shift()));
    this.active = false;
    if (error) {
      while (++index < count && (action = acts.shift())) {
        action.unsubscribe();
      }
      throw error;
    }
  }
}

export const frame = new Frame(FrameAction);

export class AsapAction<S> extends AsyncAction<S> {
  constructor(public sched: Asap, public work: (this: Action<S>, state?: S) => void) {
    super(sched, work);
  }

  protected asyncId(s: Asap, id?: any, delay = 0): any {
    if (delay && delay > 0) return super.asyncId(s, id, delay);
    s.acts.push(this);
    return s.scheduled || (s.scheduled = Immediate.setImmediate(s.flush.bind(s, undefined)));
  }

  protected recycleId(s: Asap, id?: any, delay: number = 0): any {
    if ((delay && delay > 0) || (delay === null && this.delay! > 0)) {
      return super.recycleId(s, id, delay);
    }
    if (s.acts.length === 0) {
      Immediate.clearImmediate(id);
      s.scheduled = undefined;
    }
    return undefined;
  }
}

export class Asap extends Async {
  public flush(action?: AsyncAction<any>): void {
    this.active = true;
    this.scheduled = undefined;
    const {acts} = this;
    let error: any;
    let index: number = -1;
    let count: number = acts.length;
    action = action || acts.shift()!;
    do {
      if ((error = action.execute(action.state, action.delay))) {
        break;
      }
    } while (++index < count && (action = acts.shift()));
    this.active = false;
    if (error) {
      while (++index < count && (action = acts.shift())) {
        action.unsubscribe();
      }
      throw error;
    }
  }
}

export const asap = new Asap(AsapAction);

export class QueueAction<T> extends AsyncAction<T> {
  constructor(public sched: Queue, public work: (this: Action<T>, state?: T) => void) {
    super(sched, work);
  }

  public schedule(state?: T, delay: number = 0): qj.Subscription {
    if (delay > 0) return super.schedule(state, delay);
    this.delay = delay;
    this.state = state;
    this.sched.flush(this);
    return this;
  }

  public execute(state: T, delay: number): any {
    return delay > 0 || this.closed ? super.execute(state, delay) : this._execute(state, delay);
  }

  protected asyncId(s: Queue, id?: any, delay = 0): any {
    if ((delay && delay > 0) || (delay === null && this.delay! > 0)) {
      return super.asyncId(s, id, delay);
    }
    return s.flush(this);
  }
}

export class Queue extends Async {}

export const queue = new Queue(QueueAction);

export class VirtualAction<T> extends AsyncAction<T> {
  protected active: boolean = true;

  constructor(
    public sched: Virtual,
    public work: (this: Action<T>, state?: T) => void,
    protected index: number = (sched.index += 1)
  ) {
    super(sched, work);
    this.index = sched.index = index;
  }

  public schedule(state?: T, delay: number = 0): qj.Subscription {
    if (!this.id) return super.schedule(state, delay);
    this.active = false;
    const action = new VirtualAction(this.sched, this.work);
    this.add(action);
    return action.schedule(state, delay);
  }

  protected asyncId(s: Virtual, id?: any, delay: number = 0): any {
    this.delay = s.frame + delay;
    const {acts} = s;
    acts.push(this);
    (acts as Array<VirtualAction<T>>).sort(VirtualAction.sortActions);
    return true;
  }

  protected recycleId(_s: Virtual, _?: any, _delay = 0): any {
    return undefined;
  }

  protected _execute(state: T, delay: number): any {
    if (this.active === true) {
      return super._execute(state, delay);
    }
  }

  public static sortActions<T>(a: VirtualAction<T>, b: VirtualAction<T>) {
    if (a.delay === b.delay) {
      if (a.index === b.index) {
        return 0;
      } else if (a.index > b.index) {
        return 1;
      } else {
        return -1;
      }
    } else if (a.delay! > b.delay!) {
      return 1;
    } else {
      return -1;
    }
  }
}

export class Virtual extends Async {
  static frameTimeFactor = 10;
  public frame = 0;
  public index = -1;
  constructor(Action: typeof AsyncAction = VirtualAction as any, public maxFrames = Number.POSITIVE_INFINITY) {
    super(Action, () => this.frame);
  }

  public flush(): void {
    const {acts, maxFrames} = this;
    let e: any, action: AsyncAction<any> | undefined;
    while ((action = acts[0]) && action.delay! <= maxFrames) {
      acts.shift();
      this.frame = action.delay ?? 0;
      if ((e = action.execute(action.state, action.delay))) break;
    }
    if (e) {
      while ((action = acts.shift())) {
        action.unsubscribe();
      }
      throw e;
    }
  }
}

export function scheduleArray<N, F = any, D = any>(i: ArrayLike<N>, h: qt.Scheduler, c: qt.Context<N, F, D>) {
  return c.createSource(r => {
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

export function scheduleAsyncIter<N, F = any, D = any>(i: AsyncIterable<N>, h: qt.Scheduler, c: qt.Context<N, F, D>) {
  if (!i) throw new Error('Iterable needed');
  return c.createSource(r => {
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

export function scheduleIter<N, F = any, D = any>(i: Iterable<N>, h: qt.Scheduler, c: qt.Context<N, F, D>) {
  if (!i) throw new Error('Iterable needed');
  return c.createSource(r => {
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

export function scheduleSource<N, F = any, D = any>(i: qt.Interop<N>, h: qt.Scheduler, c: qt.Context<N, F, D>) {
  return c.createSource(r => {
    const s = new qj.Subscription();
    s.add(
      h.schedule(() => {
        const x = (i as any)[Symbol.rxSource]() as qt.Source<N, F, D>;
        s.add(
          x.subscribe({
            next(n?: N) {
              s.add(h.schedule(() => r.next(n)));
            },
            fail(f?: F) {
              s.add(h.schedule(() => r.fail(f)));
            },
            done(d?: D) {
              s.add(h.schedule(() => r.done(d)));
            }
          })
        );
      })
    );
    return s;
  });
}

export function schedulePromise<N, F = any, D = any>(p: PromiseLike<N>, h: qt.Scheduler, c: qt.Context<N, F, D>) {
  return c.createSource(r => {
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

export function scheduled<N, F = any, D = any>(
  i: qt.Input<N>,
  h: qt.Scheduler,
  c: qt.Context<N, F, D>
): qt.Source<N, F, D> {
  if (i) {
    if (qu.isInterop(i)) return scheduleSource(i, h, c);
    if (qu.isPromise(i)) return schedulePromise(i, h, c);
    if (qu.isArrayLike(i)) return scheduleArray(i, h, c);
    if (qu.isIterable(i) || typeof i === 'string') return scheduleIter(i, h, c);
    if (Symbol.asyncIterator && typeof (i as any)[Symbol.asyncIterator] === 'function') {
      return scheduleAsyncIter(i as any, h, c);
    }
  }
  throw new TypeError(((i && typeof i) || i) + ' is not observable');
}
