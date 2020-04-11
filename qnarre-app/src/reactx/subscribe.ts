import {Observable} from './observe';
import * as qt from './types';
import * as qu from './utils';

export class Subscription implements qt.Subscription {
  public static EMPTY = ((s: Subscription) => {
    s.closed = true;
    return s;
  })(new Subscription());

  public closed = false;
  protected parents?: Subscription | Subscription[];
  private subs?: qt.Subscription[];

  constructor(private unsub?: () => void) {}

  unsubscribe() {
    if (this.closed) return;
    this.closed = true;
    if (Array.isArray(this.parents)) this.parents.forEach(p => p.remove(this));
    else this.parents?.remove(this);
    let es = [] as any[];
    try {
      this.unsub?.call(this);
    } catch (e) {
      if (e instanceof qu.UnsubscriptionError)
        es = es.concat(flatten(e.errors));
      else es.push(e);
    }
    this.subs?.forEach(s => {
      try {
        s.unsubscribe();
      } catch (e) {
        if (e instanceof qu.UnsubscriptionError)
          es = es.concat(flatten(e.errors));
        else es.push(e);
      }
    });
    this.parents = this.subs = undefined;
    if (es.length) throw new qu.UnsubscriptionError(es);
  }

  add(t?: qt.Teardown) {
    if (!t) return Subscription.EMPTY;
    let s = t as Subscription;
    switch (typeof t) {
      case 'function':
        s = new Subscription(t as () => void);
        break;
      case 'object':
        if (s === this || s.closed || typeof s.unsubscribe !== 'function') {
          return s;
        } else if (this.closed) {
          s.unsubscribe();
          return s;
        } else if (!(t instanceof Subscription)) {
          const s2 = t as qt.Subscription;
          s = new Subscription();
          s.subs = [s2];
        }
        break;
      default:
        throw new Error(`invalid teardown ${t}`);
    }
    if (!s.parents) s.parents = this;
    else if (Array.isArray(s.parents)) {
      if (s.parents.indexOf(this) !== -1) return s;
      s.parents.push(this);
    } else {
      if (s.parents === this) return s;
      s.parents = [s.parents, this];
    }
    if (this.subs) this.subs.push(s);
    else this.subs = [s];
    return s;
  }

  remove(s: qt.Subscription) {
    const ss = this.subs;
    if (ss) {
      const i = ss.indexOf(s);
      if (i !== -1) ss.splice(i, 1);
    }
  }
}

function flatten(es: any[]) {
  return es.reduce(
    (es, e) => es.concat(e instanceof qu.UnsubscriptionError ? e.errors : e),
    []
  );
}

export class Subscriber<T> extends Subscription implements qt.Subscriber<T> {
  [Symbol.rxSubscriber]() {
    return this;
  }

  static create<T>(obs?: qt.PartialObserver<any>) {
    return new Subscriber<T>(obs);
  }

  protected stopped = false;
  protected obs: qt.Observer<any> | Subscriber<any>;

  constructor(obs?: qt.PartialObserver<any>) {
    super();
    if (!obs) this.obs = qu.emptyObserver;
    else {
      if (obs instanceof Subscriber) {
        this.obs = obs;
        obs.add(this);
      } else {
        this.obs = new SafeSubscriber<T>(this, obs);
      }
    }
  }

  next(v: T) {
    if (!this.stopped) this._next(v);
  }

  error(e: any) {
    if (!this.stopped) {
      this.stopped = true;
      this._error(e);
    }
  }

  complete() {
    if (!this.stopped) {
      this.stopped = true;
      this._complete();
    }
  }

  unsubscribe() {
    if (!this.closed) {
      this.stopped = true;
      super.unsubscribe();
    }
  }

  protected _next(v: T) {
    this.obs.next(v);
  }

  protected _error(e: any) {
    this.obs.error(e);
    this.unsubscribe();
  }

  protected _complete() {
    this.obs.complete();
    this.unsubscribe();
  }

  _recycle() {
    const ps = this.parents;
    this.parents = undefined;
    this.unsubscribe();
    this.closed = this.stopped = false;
    this.parents = ps;
    return this;
  }
}

export class SafeSubscriber<T> extends Subscriber<T> {
  private ctxt?: any;

  constructor(
    private psub: Subscriber<T> | undefined,
    private pobs: qt.PartialObserver<T>
  ) {
    super();
    if (this.pobs !== qu.emptyObserver) this.ctxt = Object.create(this.pobs);
  }

  next(v: T) {
    if (!this.stopped) this._tryCall(this.pobs.next, v);
  }

  error(e: any) {
    if (!this.stopped) {
      if (this.pobs.error) this._tryCall(this.pobs.error, e);
      else qu.hostReportError(e);
      this.unsubscribe();
    }
  }

  complete() {
    if (!this.stopped) {
      this._tryCall(this.pobs.complete);
      this.unsubscribe();
    }
  }

  private _tryCall(f?: Function, v?: any) {
    try {
      f?.call(this.ctxt, v);
    } catch (e) {
      this.unsubscribe();
      qu.hostReportError(e);
    }
  }

  _unsubscribe() {
    const s = this.psub;
    this.ctxt = this.psub = undefined;
    s?.unsubscribe();
  }
}

export class InnerSubscriber<T, R> extends Subscriber<R> {
  private idx = 0;

  constructor(
    private outer: OuterSubscriber<T, R>,
    public outerValue: T,
    public outerIndex: number
  ) {
    super();
  }

  protected _next(v: R) {
    this.outer.notifyNext(
      this.outerValue,
      v,
      this.outerIndex,
      this.idx++,
      this
    );
  }

  protected _error(e: any) {
    this.outer.notifyError(e, this);
    this.unsubscribe();
  }

  protected _complete() {
    this.outer.notifyComplete(this);
    this.unsubscribe();
  }
}

export class OuterSubscriber<T, R> extends Subscriber<T> {
  notifyNext(
    _ov: T,
    v: R,
    _oi: number,
    _ii: number,
    _is: InnerSubscriber<T, R>
  ): void {
    this.obs.next(v);
  }

  notifyError(e: any, _: InnerSubscriber<T, R>) {
    this.obs.error(e);
  }

  notifyComplete(_: InnerSubscriber<T, R>) {
    this.obs.complete();
  }
}

export class SubjectSubscriber<T> extends Subscriber<T> {
  constructor(obs: Subject<T>) {
    super(obs);
  }
}

export class SubjectSubscription<T> extends Subscription {
  closed = false;

  constructor(public subj: Subject<T> | undefined, public obs: qt.Observer<T>) {
    super();
  }

  unsubscribe() {
    if (this.closed) return;
    this.closed = true;
    const s = this.subj;
    const os = s?.obss;
    this.subj = undefined;
    if (!os || !os.length || s?.stopped || s?.closed) return;
    const i = os.indexOf(this.obs);
    if (i !== -1) os.splice(i, 1);
  }
}

export class Subject<T> extends Observable<T> implements qt.Subscription {
  [Symbol.rxSubscriber](): SubjectSubscriber<T> {
    return new SubjectSubscriber(this);
  }

  closed = false;
  stopped = false;
  failed = false;
  thrown?: any;
  obss = [] as qt.Observer<T>[];

  constructor() {
    super();
  }

  //static create<T>(obs: qt.Observer<T>, src: Observable<T>) {
  //  return new AnonymousSubject<T>(obs, src);
  //}

  lift<R>(o: qt.Operator<T, R>): Observable<R> {
    const s = new AnonymousSubject(this, this);
    s.oper = o;
    return s as Observable<R>;
  }

  next(v: T) {
    if (this.closed) throw new qu.UnsubscribedError();
    if (!this.stopped) this.obss.slice().forEach(o => o.next(v));
  }

  error(e: any) {
    if (this.closed) throw new qu.UnsubscribedError();
    this.failed = true;
    this.thrown = e;
    this.stopped = true;
    this.obss.slice().forEach(o => o.error(e));
    this.obss = [];
  }

  complete() {
    if (this.closed) throw new qu.UnsubscribedError();
    this.stopped = true;
    this.obss.slice().forEach(o => o.complete());
    this.obss = [];
  }

  unsubscribe() {
    this.stopped = true;
    this.closed = true;
    this.obss = [];
  }

  _trySubscribe(s: Subscriber<T>) {
    if (this.closed) throw new qu.UnsubscribedError();
    return super._trySubscribe(s);
  }

  _subscribe(s: Subscriber<T>): Subscription {
    if (this.closed) throw new qu.UnsubscribedError();
    else if (this.failed) {
      s.error(this.thrown);
      return Subscription.EMPTY;
    } else if (this.stopped) {
      s.complete();
      return Subscription.EMPTY;
    } else {
      this.obss.push(s);
      return new SubjectSubscription(this, s);
    }
  }

  asObservable(): Observable<T> {
    const o = new Observable<T>();
    o.src = this;
    return o;
  }
}

export class AnonymousSubject<T> extends Subject<T> {
  constructor(protected obs?: qt.Observer<T>, public src?: Observable<T>) {
    super();
  }

  next(v: T) {
    this.obs?.next?.(v);
  }

  error(e: any) {
    this.obs?.error?.(e);
  }

  complete() {
    this.obs?.complete?.();
  }

  _subscribe(s: Subscriber<T>) {
    if (this.src) return this.src.subscribe(s);
    return Subscription.EMPTY;
  }
}

export class AsyncSubject<T> extends Subject<T> {
  private ready = false;
  private done = false;
  private value?: T;

  _subscribe(s: Subscriber<any>) {
    if (this.failed) {
      s.error(this.thrown);
      return Subscription.EMPTY;
    } else if (this.done && this.ready) {
      s.next(this.value);
      s.complete();
      return Subscription.EMPTY;
    }
    return super._subscribe(s);
  }

  next(v: T) {
    if (!this.done) {
      this.value = v;
      this.ready = true;
    }
  }

  error(e: any) {
    if (!this.done) super.error(e);
  }

  complete() {
    this.done = true;
    if (this.ready) super.next(this.value!);
    super.complete();
  }
}

export class BehaviorSubject<T> extends Subject<T> {
  constructor(private _value: T) {
    super();
  }

  get value() {
    return this.getValue();
  }

  _subscribe(s: Subscriber<T>) {
    const t = super._subscribe(s);
    if (!t.closed) s.next(this._value);
    return t;
  }

  getValue() {
    if (this.failed) throw this.thrown;
    if (this.closed) throw new qu.UnsubscribedError();
    return this._value;
  }

  next(v: T) {
    this._value = v;
    super.next(v);
  }
}

interface ReplayEvent<T> {
  time: number;
  value: T;
}

export class ReplaySubject<T> extends Subject<T> {
  private _events: (ReplayEvent<T> | T)[] = [];
  private _bufferSize: number;
  private _windowTime: number;
  private _infiniteTimeWindow: boolean = false;

  constructor(
    bufferSize = Number.POSITIVE_INFINITY,
    windowTime = Number.POSITIVE_INFINITY,
    private timestampProvider: qt.TimestampProvider = Date
  ) {
    super();
    this._bufferSize = bufferSize < 1 ? 1 : bufferSize;
    this._windowTime = windowTime < 1 ? 1 : windowTime;

    if (windowTime === Number.POSITIVE_INFINITY) {
      this._infiniteTimeWindow = true;
      this.next = this.nextInfiniteTimeWindow;
    } else {
      this.next = this.nextTimeWindow;
    }
  }

  private nextInfiniteTimeWindow(v: T) {
    const es = this._events;
    es.push(v);
    if (es.length > this._bufferSize) es.shift();
    super.next(v);
  }

  private nextTimeWindow(value: T) {
    this._events.push({time: this._getNow(), value});
    this._trimBufferThenGetEvents();
    super.next(value);
  }

  _subscribe(s: Subscriber<T>): Subscription {
    if (this.closed) throw new qu.UnsubscribedError();
    let t: Subscription;
    if (this.stopped || this.failed) t = Subscription.EMPTY;
    else {
      this.obss.push(s);
      t = new SubjectSubscription(this, s);
    }
    const inf = this._infiniteTimeWindow;
    const es = inf ? this._events : this._trimBufferThenGetEvents();
    if (inf) {
      es.forEach(e => {
        if (!s.closed) s.next(e as T);
      });
    } else {
      es.forEach(e => {
        if (!s.closed) s.next((e as ReplayEvent<T>).value);
      });
    }
    if (this.failed) s.error(this.thrown);
    else if (this.stopped) s.complete();
    return t;
  }

  private _getNow(): number {
    const {timestampProvider: scheduler} = this;
    return scheduler ? scheduler.now() : Date.now();
  }

  private _trimBufferThenGetEvents(): ReplayEvent<T>[] {
    const now = this._getNow();
    const _bufferSize = this._bufferSize;
    const _windowTime = this._windowTime;
    const _events = <ReplayEvent<T>[]>this._events;
    const eventsCount = _events.length;
    let spliceCount = 0;
    while (spliceCount < eventsCount) {
      if (now - _events[spliceCount].time < _windowTime) {
        break;
      }
      spliceCount++;
    }
    if (eventsCount > _bufferSize) {
      spliceCount = Math.max(spliceCount, eventsCount - _bufferSize);
    }
    if (spliceCount > 0) _events.splice(0, spliceCount);

    return _events;
  }
}
