import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';

export class Connect<N, F, D> extends qs.Source<N, F, D> {
  sub?: qj.Subscription;
  _subj?: qt.Subject<N, F, D>;
  done = false;
  count = 0;

  constructor(
    public src: qs.Source<N, F, D>,
    protected fac: () => qt.Subject<N, F, D>
  ) {
    super();
  }

  _subscribe(s: qt.Subscriber<N, F, D>) {
    return this.subj.subscribe(s);
  }

  get subj() {
    const s = this._subj;
    if (!s || s.stopped) this._subj = this.fac();
    return this._subj!;
  }

  connect(): qj.Subscription {
    let s = this.sub;
    if (!s) {
      this.done = false;
      s = this.sub = new qj.Subscription();
      s.add(this.src.subscribe(new ConnectSubscriber(this.subj, this)));
      if (s.closed) {
        this.sub = undefined;
        s = qj.Subscription.fake;
      }
    }
    return s;
  }

  refCount() {
    return higherOrderRefCount()(this) as qs.Source<N, F, D>;
  }
}

class ConnectSubscriber<T> extends SubjectSubscriber<T> {
  constructor(obs: qj.Subject<T>, private con?: Connect<T>) {
    super(obs);
  }

  protected _error(e: any) {
    this._unsubscribe();
    super._error(e);
  }

  protected _complete() {
    this.con!.done = true;
    this._unsubscribe();
    super._complete();
  }

  protected _unsubscribe() {
    const c = this.con;
    if (c) {
      this.con = undefined;
      const s = c.subs;
      c.count = 0;
      c.subs = c.subj = undefined;
      s?.unsubscribe();
    }
  }
}

export const connectableObservableDescriptor: PropertyDescriptorMap = (() => {
  const p = <any>Connect.prototype;
  return {
    operator: {value: null as null},
    _refCount: {value: 0, writable: true},
    _subject: {value: null as null, writable: true},
    _connection: {value: null as null, writable: true},
    _subscribe: {value: p._subscribe},
    _isComplete: {value: p._isComplete, writable: true},
    getSubject: {value: p.getSubject},
    connect: {value: p.connect},
    refCount: {value: p.refCount}
  };
})();

export function publish<N, F, D>(): UnaryFun<
  qt.Source<N, F, D>,
  Connect<N, F, D>
>;
export function publish<T, O extends SourceInput<any>>(
  selector: (shared: qt.Source<N, F, D>) => O
): Lifter<T, Sourced<O>>;
export function publish<N, F, D>(
  selector: qt.MonoOper<N, F, D>
): qt.MonoOper<N, F, D>;
export function publish<T, R>(
  selector?: Lifter<T, R>
): qt.MonoOper<N, F, D> | Lifter<T, R> {
  return selector
    ? multicast(() => new Subject<N, F, D>(), selector)
    : multicast(new Subject<N, F, D>());
}

export function publishBehavior<N, F, D>(
  value: T
): UnaryFun<qt.Source<N, F, D>, Connect<N, F, D>> {
  return (source: qt.Source<N, F, D>) =>
    multicast(new Behavior<N, F, D>(value))(source) as Connect<N, F, D>;
}

export function publishLast<N, F, D>(): UnaryFun<
  qt.Source<N, F, D>,
  Connect<N, F, D>
> {
  return (source: qt.Source<N, F, D>) =>
    multicast(new Async<N, F, D>())(source);
}

export function publishReplay<N, F, D>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.MonoOper<N, F, D>;
export function publishReplay<T, O extends SourceInput<any>>(
  bufferSize?: number,
  windowTime?: number,
  selector?: (shared: qt.Source<N, F, D>) => O,
  scheduler?: qt.Scheduler
): Lifter<T, Sourced<O>>;
export function publishReplay<T, R>(
  bufferSize?: number,
  windowTime?: number,
  selectorOrScheduler?: qt.Scheduler | Lifter<T, R>,
  scheduler?: qt.Scheduler
): UnaryFun<qt.Source<N, F, D>, Connect<R>> {
  if (selectorOrScheduler && typeof selectorOrScheduler !== 'function') {
    scheduler = selectorOrScheduler;
  }
  const selector =
    typeof selectorOrScheduler === 'function' ? selectorOrScheduler : undefined;
  const subject = new Replay<N, F, D>(bufferSize, windowTime, scheduler);
  return (source: qt.Source<N, F, D>) =>
    multicast(() => subject, selector!)(source) as Connect<R>;
}

export function refCount<N, F, D>(): qt.MonoOper<N, F, D> {
  return function refCountLifter(source: Connect<N, F, D>): qt.Source<N, F, D> {
    return source.lift(new RefCountO(source));
  } as qt.MonoOper<N, F, D>;
}

export class RefCountO<T> implements qt.Operator<T, T> {
  constructor(private con: Connect<T>) {}

  call(s: Subscriber<T>, source: any): Closer {
    const c = this.con;
    c.count++;
    const refCounter = new RefCountR(s, c);
    const s = source.subscribe(refCounter);
    if (!refCounter.closed) {
      (<any>refCounter).connection = c.connect();
    }
    return s;
  }
}

export class RefCountR<N, F, D> extends Subscriber<N, F, D> {
  private connection?: Subscription;

  constructor(
    tgt: Subscriber<N, F, D>,
    private connectable?: Connect<N, F, D>
  ) {
    super(tgt);
  }

  protected _unsubscribe() {
    const {connectable} = this;
    if (!connectable) {
      this.connection = undefined;
      return;
    }
    this.connectable = undefined;
    const refCount = (connectable as any)._refCount;
    if (refCount <= 0) {
      this.connection = undefined;
      return;
    }
    (connectable as any)._refCount = refCount - 1;
    if (refCount > 1) {
      this.connection = undefined;
      return;
    }
    const {connection} = this;
    const c = (<any>connectable)._connection;
    this.connection = undefined;
    if (c && (!connection || c === connection)) c.unsubscribe();
  }
}
