//import {Observable} from './observe';

export class SubjectSubscriber<N, F, D> extends Subscriber<N, F, D> {
  constructor(tgt: Subject<N, F, D>) {
    super(tgt);
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
    return Subscription.fake;
  }
}

export class AsyncSubject<T> extends Subject<T> {
  private ready = false;
  private done = false;
  private value?: T;

  _subscribe(s: Subscriber<any>) {
    if (this.failed) {
      s.error(this.thrown);
      return Subscription.fake;
    } else if (this.done && this.ready) {
      s.next(this.value);
      s.complete();
      return Subscription.fake;
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
    if (this.stopped || this.failed) t = Subscription.fake;
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
