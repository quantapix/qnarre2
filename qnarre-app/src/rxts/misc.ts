import * as qt from './types';
import * as qs from './source';
import * as qj from './subject';
import * as qh from './scheduler';
import * as qr from './subscriber';

export enum NoteKind {
  NEXT = 'N',
  FAIL = 'F',
  DONE = 'D'
}

export class Note<N> {
  hasN?: boolean;

  constructor(kind: 'N', n: N);
  constructor(kind: 'F', n: undefined, e: any);
  constructor(kind: 'D');
  constructor(public kind: 'N' | 'F' | 'D', public n?: N, public e?: any) {
    this.hasN = kind === 'N';
  }

  observe(t?: qt.Target<N>) {
    switch (this.kind) {
      case 'N':
        return t?.next?.(this.n!);
      case 'F':
        return t?.fail?.(this.e);
      case 'D':
        return t?.done?.();
    }
  }

  act(next?: qt.Fun<N>, fail?: qt.Fun<any>, done?: qt.Fvoid) {
    switch (this.kind) {
      case 'N':
        return next?.(this.n!);
      case 'F':
        return fail?.(this.e);
      case 'D':
        return done?.();
    }
  }

  accept(t?: qt.Target<N> | qt.Fun<N>, fail?: qt.Fun<any>, done?: qt.Fvoid) {
    if (typeof t === 'function') return this.act(t, fail, done);
    return this.observe(t);
  }

  toSource(): qt.Source<N> {
    switch (this.kind) {
      case 'N':
        return of(this.n);
      case 'F':
        return throwError(this.f);
      case 'D':
        return qs.EMPTY;
    }
  }
}

const undef = new Note<any>('N', undefined);

export function nextNote<N>(n?: N): Note<N> {
  if (n === undefined) return undef;
  return new Note('N', n);
}

export function failNote<N>(e: any): Note<N> {
  return new Note('F', undefined, e);
}

const done = new Note<any>('D');

export function doneNote<N>(): Note<N> {
  return done;
}

interface Message<N> extends qt.Nstate<N> {
  note: Note<N>;
  time?: number;
  tgt?: qt.Target<N>;
}

export function delay<N>(
  delay: number | Date,
  h: qt.Scheduler = qh.async
): qt.Shifter<N> {
  const abs = qt.isDate(delay);
  const d = abs ? +delay - h.now() : Math.abs(delay as number);
  return x => x.lift(new DelayO(d, h));
}

class DelayO<N> implements qt.Operator<N, N> {
  constructor(private delay: number, private h: qt.Scheduler) {}
  call(r: qt.Subscriber<N>, s: qt.Source<N>) {
    return s.subscribe(new DelayR(r, this.delay, this.h));
  }
}

export class DelayR<N> extends qr.Subscriber<N> {
  private queue = [] as Message<N>[];
  private active?: boolean;
  private failed?: boolean;

  constructor(t: qt.Subscriber<N>, private delay: number, private h: qt.Scheduler) {
    super(t);
  }

  protected _next(n: N) {
    this.scheduleNote(nextNote(n));
  }

  protected _fail(e: any) {
    this.failed = true;
    this.queue = [];
    this.tgt.fail(e);
    this.unsubscribe();
  }

  protected _done() {
    if (this.queue.length === 0) this.tgt.done();
    this.unsubscribe();
  }

  private scheduleNote(note: Note<N>) {
    if (this.failed) return;
    const s = this.h;
    const m = {note, time: s.now() + this.delay} as Message<N>;
    this.queue.push(m);
    if (!this.active) this._schedule(s);
  }

  private _schedule(h: qt.Scheduler): void {
    this.active = true;
    const tgt = this.tgt as qt.Subscription;
    interface Delay extends qt.Nstate<N> {
      tgt: qt.Target<N>;
      h: qt.Scheduler;
    }
    function work(this: qt.Action<Delay>, s?: Delay) {
      const {tgt, h} = s!;
      const r = s!.r as DelayR<N>;
      const q = r.queue;
      while (q.length > 0 && q[0].time! - h.now() <= 0) {
        q.shift()!.note.observe(tgt);
      }
      if (q.length > 0) {
        const delay = Math.max(0, q[0].time! - h.now());
        this.schedule(s, delay);
      } else if (r.stopped) {
        r.tgt.done();
        r.active = false;
      } else {
        this.unsubscribe();
        r.active = false;
      }
    }
    tgt.add(
      h.schedule<Delay>(
        work,
        {r: this as qt.Subscriber<N>, tgt: this.tgt, h} as Delay,
        this.delay
      )
    );
  }
}

export function delayWhen<N>(
  duration: (n: N, i: number) => qt.Source<any>,
  delay?: qt.Source<any>
): qt.Shifter<N>;
export function delayWhen<N>(
  duration: (n: N, index: number) => qt.Source<any>,
  delay?: qt.Source<any>
): qt.Shifter<N> {
  if (delay) {
    return x => new SubDelay(x, delay).lift(new DelayWhenO(duration));
  }
  return x => x.lift(new DelayWhenO(duration));
}

class DelayWhenO<N> implements qt.Operator<N, N> {
  constructor(private duration: (n: N, i: number) => qt.Source<any>) {}
  call(r: qt.Subscriber<N>, s: qt.Source<N>) {
    return s.subscribe(new DelayWhenR(r, this.duration));
  }
}

export class DelayWhenR<N, R> extends qr.Reactor<N, R> {
  private completed?: boolean;
  private delays = [] as qt.Subscription[];
  private i = 0;

  constructor(
    t: qt.Subscriber<N>,
    private duration: (n: N, i: number) => qt.Source<any>
  ) {
    super(t);
  }

  protected _next(n: N) {
    const i = this.i++;
    try {
      const s = this.duration(n, i);
      if (s) this.tryDelay(s, n);
    } catch (e) {
      this.tgt.fail(e);
    }
  }

  protected _done() {
    this.completed = true;
    this.tryComplete();
    this.unsubscribe();
  }

  reactNext(n: N, _r: any, _ni?: number, _ri?: number, s?: qr.Actor<R, N>) {
    this.tgt.next(n);
    this.removeSubscription(s);
    this.tryComplete();
  }

  reactFail(e: any) {
    this._fail(e);
  }

  reactDone(innerSub: qr.Actor<R, N>) {
    const v = this.removeSubscription(innerSub);
    if (v) this.tgt.next(v);
    this.tryComplete();
  }

  private removeSubscription(s: qr.Actor<R, N>): NavigationEvent {
    s.unsubscribe();
    const i = this.delays.indexOf(s);
    if (i !== -1) this.delays.splice(i, 1);
    return s.r;
  }

  private tryDelay(delay: qt.Source<any>, n: N) {
    const s = this.subscribeTo(delay, n);
    if (s && !s.closed) {
      const t = this.tgt as qt.Subscription;
      t.add(s);
      this.delays.push(s);
    }
  }

  private tryComplete() {
    if (this.completed && !this.delays.length) this.tgt.done();
  }
}

class SubDelay<N> extends qs.Source<N> {
  constructor(public s: qt.Source<N>, private delay: qt.Source<any>) {
    super();
  }
  _subscribe(r: qt.Subscriber<N>) {
    this.delay.subscribe(new SubDelayR(r, this.s));
  }
}

class SubDelayR<N> extends qr.Subscriber<N> {
  private active?: boolean;

  constructor(private parent: qt.Subscriber<N>, private s: qt.Source<N>) {
    super();
  }

  protected _next(_n: N) {
    this.openSource();
  }

  protected _fail(e: any) {
    this.unsubscribe();
    this.parent.fail(e);
  }

  protected _done() {
    this.unsubscribe();
    this.openSource();
  }

  private openSource() {
    if (!this.active) {
      this.active = true;
      this.unsubscribe();
      this.s.subscribe(this.parent);
    }
  }
}

export function dematerialize<N>(): qt.Lifter<Note<N>, N> {
  return x => x.lift(new DeMaterializeO());
}

class DeMaterializeO<N extends Note<any>, R> implements qt.Operator<N, R> {
  call(r: qt.Subscriber<any>, s: qt.Source<N>) {
    return s.subscribe(new DeMaterializeR(r));
  }
}

export class DeMaterializeR<N extends Note<any>> extends qr.Subscriber<N> {
  constructor(t: qt.Subscriber<any>) {
    super(t);
  }

  protected _next(n: N) {
    n.observe(this.tgt);
  }
}

export function materialize<N>(): qt.Lifter<N, Note<N>> {
  return x => x.lift(new MaterializeO());
}

class MaterializeO<N> implements qt.Operator<N, Note<N>> {
  call(r: qt.Subscriber<Note<N>>, s: qt.Source<N>): any {
    return s.subscribe(new MaterializeR(r));
  }
}

export class MaterializeR<N> extends qr.Subscriber<N> {
  constructor(t: qt.Subscriber<Note<N>>) {
    super(t);
  }

  protected _next(n: N) {
    this.tgt.next(nextNote(n));
  }

  protected _fail(e: any) {
    const t = this.tgt;
    t.next(failNote(e));
    t.done();
  }

  protected _done() {
    const t = this.tgt;
    t.next(doneNote());
    t.done();
  }
}

export function observeOn<N>(h: qt.Scheduler, delay?: number): qt.Shifter<N> {
  return x => x.lift(new ObserveOnO(h, delay));
}

export class ObserveOnO<N> implements qt.Operator<N, N> {
  constructor(private h: qt.Scheduler, private delay?: number) {}
  call(r: qt.Subscriber<N>, s: qt.Source<N>) {
    return s.subscribe(new ObserveOnR(r, this.h, this.delay));
  }
}

export class ObserveOnR<N> extends qr.Subscriber<N> {
  constructor(t: qt.Subscriber<N>, private h: qt.Scheduler, private delay = 0) {
    super(t);
  }

  protected _next(n: N) {
    this.scheduleMessage(nextNote(n));
  }

  protected _fail(e: any) {
    this.scheduleMessage(failNote(e));
    this.unsubscribe();
  }

  protected _done() {
    this.scheduleMessage(doneNote());
    this.unsubscribe();
  }

  private scheduleMessage(note: Note<any>) {
    const t = this.tgt as qt.Subscription;
    function dispatch(this: qt.Action<Message<any>>, s?: Message<any>) {
      const {note, tgt} = s!;
      note.observe(tgt);
      this.unsubscribe();
    }
    t.add(this.h.schedule(dispatch, {note, tgt: this.tgt} as Message<N>, this.delay));
  }
}

export function subscribeOn<N>(h: qt.Scheduler, delay?: number): qt.Shifter<N> {
  return x => x.lift(new SubscribeOnO<N>(h, delay));
}

class SubscribeOnO<N> implements qt.Operator<N, N> {
  constructor(private h: qt.Scheduler, private delay?: number) {}
  call(r: qt.Subscriber<N>, s: qt.Source<N>) {
    return new SubscribeOn<N>(s, this.delay, this.h).subscribe(r);
  }
}
class SubscribeOn<N> extends qs.Source<N> {
  constructor(
    public src: qt.Source<N>,
    private delay: number = 0,
    private h: qt.Scheduler = qh.asap
  ) {
    super();
    if (delay < 0) this.delay = 0;
  }

  _subscribe(r: qr.Subscriber<N>) {
    const delay = this.delay;
    function dispatch(this: qt.Action<qt.Nstate<N>>, s?: qt.Nstate<N>) {
      if (s && s.s) this.add(s.s.subscribe(s.r));
    }
    return this.h.schedule(dispatch, {r, s: this.src} as qt.Nstate<N>, delay);
  }
}

function dispatch<N>(this: qh.Action<qt.Nstate<N>>, t?: qt.Nstate<N>) {
  const {r, ctx, cb, args, h} = t!;
  let s: qt.Subject<N> | undefined;
  if (!s) {
    s = new qj.Async<N>();
    const f = (...ns: any[]) => {
      const e = ns.shift();
      if (e) this.add(h.schedule(error, {e, s}));
      else {
        const n = ns.length <= 1 ? ns[0] : ns;
        this.add(h.schedule(next, {n, s}));
      }
    };
    try {
      cb.apply(ctx, [...args, f]);
    } catch (e) {
      this.add(h.schedule(error, {e, s}));
    }
  }
  this.add(s.subscribe(r));
}

export function tap<N>(
  next?: qt.Target<N> | qt.Fun<N>,
  fail?: qt.Fun<any>,
  done?: qt.Fvoid
): qt.Shifter<N> {
  return x => x.lift(new TapO(next, fail, done));
}

class TapO<N> implements qt.Operator<N, N> {
  constructor(
    private next?: qt.Target<N> | qt.Fun<N>,
    private fail?: qt.Fun<any>,
    private done?: qt.Fvoid
  ) {}
  call(r: qt.Subscriber<N>, s: qt.Source<N>) {
    return s.subscribe(new TapR(r, this.next, this.fail, this.done));
  }
}

export class TapR<N> extends qr.Subscriber<N> {
  private ctx?: any;
  private tapNext = qt.noop as qt.Fun<N>;

  constructor(
    t: qt.Subscriber<N>,
    next?: qt.Target<N> | qt.Fun<N>,
    private tapFail: qt.Fun<any> = qt.noop,
    private tapDone: qt.Fvoid = qt.noop
  ) {
    super(t);
    if (qt.isFunction(next)) {
      this.ctx = this;
      this.tapNext = next;
    } else if (next) {
      this.ctx = next;
      this.tapNext = next.next ?? qt.noop;
      this.tapFail = next.fail ?? qt.noop;
      this.tapDone = next.done ?? qt.noop;
    }
  }

  _next(n: N) {
    try {
      this.tapNext.call(this.ctx, n);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.next(n);
  }

  _fail(e: any) {
    try {
      this.tapFail.call(this.ctx, e);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    this.tgt.fail(e);
  }

  _done() {
    try {
      this.tapDone.call(this.ctx);
    } catch (e) {
      this.tgt.fail(e);
      return;
    }
    return this.tgt.done();
  }
}

export function time<N>(timeProvider: qt.Stamper = Date): qt.Lifter<N, qt.Stamp<N>> {
  return map((value: N) => ({value, time: timeProvider.now()}));
}

export function timeInterval<N>(
  h: qt.Scheduler = qh.async
): qt.Lifter<N, TimeInterval<N>> {
  return x =>
    defer(() => {
      return x.pipe(
        scan(
          ({current}, value) => ({
            value,
            current: h.now(),
            last: current
          }),
          {current: h.now(), value: undefined, last: undefined} as any
        ) as qt.Lifter<T, any>,
        map<any, TimeInterval<N>>(
          ({current, last, value}) => new TimeInterval(value, current - last)
        )
      );
    });
}

export class TimeInterval<N> {
  constructor(public n: N, public interval: number) {}
}

export function timeout<N>(
  due: number | Date,
  h: qt.Scheduler = qh.async
): qt.Shifter<N> {
  return timeoutWith(due, throwError(new TimeoutError()), h);
}

export function timeoutWith<N, R>(
  due: number | Date,
  withObservable: qt.Input<R>,
  h?: qt.Scheduler
): qt.Lifter<N, N | R>;
export function timeoutWith<N, R>(
  due: number | Date,
  withObservable: qt.Input<R>,
  h: qt.Scheduler = qh.async
): qt.Lifter<N, N | R> {
  return x => {
    let absoluteTimeout = qt.isDate(due);
    let waitFor = absoluteTimeout ? +due - h.now() : Math.abs(<number>due);
    return x.lift(new TimeoutWithO(waitFor, absoluteTimeout, withObservable, h));
  };
}

class TimeoutWithO<N> implements qt.Operator<N, N> {
  constructor(
    private waitFor: number,
    private absoluteTimeout: boolean,
    private withObservable: qt.Input<any>,
    private h: qt.Scheduler
  ) {}
  call(r: qt.Subscriber<N>, s: qt.Source<N>) {
    return s.subscribe(
      new TimeoutWithR(r, this.absoluteTimeout, this.waitFor, this.withObservable, this.h)
    );
  }
}

export class TimeoutWithR<N, R> extends qr.Reactor<N, R> {
  private action?: qt.Action<TimeoutWithR<N, R>>;

  constructor(
    tgt: qt.Subscriber<N>,
    private absoluteTimeout: boolean,
    private waitFor: number,
    private withObservable: qt.Input<any>,
    private h: qt.Scheduler
  ) {
    super(tgt);
    this.scheduleTimeout();
  }

  private scheduleTimeout() {
    const {action} = this;
    if (action) {
      this.action = <Action<TimeoutWithR<N, R>>>action.schedule(this, this.waitFor);
    } else {
      function dispatch(r: TimeoutWithR<N, R>) {
        const {withObservable} = r;
        (<any>r)._recycle();
        r.add(r.subscribeTo(withObservable));
      }
      this.add(
        (this.action = <Action<TimeoutWithR<N, R>>>(
          this.h.schedule<TimeoutWithR<N, R>>(dispatch as any, this, this.waitFor)
        ))
      );
    }
  }

  protected _next(n: N) {
    if (!this.absoluteTimeout) this.scheduleTimeout();
    super._next(n);
  }

  _unsubscribe() {
    this.action = undefined;
    this.withObservable = null!;
  }
}

function toArrayReducer<N>(arr: N[], item: N, index: number): N[] {
  if (index === 0) return [item];
  arr.push(item);
  return arr;
}

export function toArray<N>(): qt.Lifter<N, N[]> {
  return reduce(toArrayReducer, [] as N[]);
}

export function using<T>(
  resourceFactory: () => qt.Unsubscriber | void,
  observableFactory: (resource: qt.Unsubscriber | void) => qt.Input<T> | void
): qs.Source<T> {
  return new qs.Source<T>(r => {
    let resource: qt.Unsubscriber | void;
    try {
      resource = resourceFactory();
    } catch (e) {
      r.fail(e);
      return;
    }
    let result: qt.Input<T> | void;
    try {
      result = observableFactory(resource);
    } catch (e) {
      r.fail(e);
      return;
    }
    const source = result ? from(result) : qs.EMPTY;
    const subscription = source.subscribe(r);
    return () => {
      subscription.unsubscribe();
      if (resource) resource.unsubscribe();
    };
  });
}
