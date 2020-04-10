import {Observer, PartialObserver, SubscriptionLike, Teardown} from './types';
import {emptyObserver, hostReportError, UnsubscriptionError} from './util';
import {Operator} from './types';
import {Observable} from './Observable';
import {ObjectUnsubscribedError} from './util';
import {TimestampProvider} from './types';

export class Subscription implements SubscriptionLike {
  public static EMPTY = ((s: Subscription) => {
    s.closed = true;
    return s;
  })(new Subscription());

  public closed = false;
  protected parents?: Subscription | Subscription[];
  private subs?: SubscriptionLike[];

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
      if (e instanceof UnsubscriptionError) es = es.concat(flatten(e.errors));
      else es.push(e);
    }
    this.subs?.forEach(s => {
      try {
        s.unsubscribe();
      } catch (e) {
        if (e instanceof UnsubscriptionError) es = es.concat(flatten(e.errors));
        else es.push(e);
      }
    });
    this.parents = this.subs = undefined;
    if (es.length) throw new UnsubscriptionError(es);
  }

  add(t?: Teardown): Subscription {
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
          const s2 = t as SubscriptionLike;
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

  remove(s: SubscriptionLike) {
    const ss = this.subs;
    if (ss) {
      const i = ss.indexOf(s);
      if (i !== -1) ss.splice(i, 1);
    }
  }
}

function flatten(es: any[]) {
  return es.reduce(
    (es, e) => es.concat(e instanceof UnsubscriptionError ? e.errors : e),
    []
  );
}

export class Subscriber<T> extends Subscription implements Observer<T> {
  [Symbol.rxSubscriber]() {
    return this;
  }

  static create<T>(dst?: PartialObserver<any>) {
    return new Subscriber<T>(dst);
  }

  protected stopped = false;
  protected dst: Observer<any> | Subscriber<any>;

  constructor(dst?: PartialObserver<any>) {
    super();
    if (!dst) this.dst = emptyObserver;
    else {
      if (dst instanceof Subscriber) {
        this.dst = dst;
        dst.add(this);
      } else {
        this.dst = new SafeSubscriber<T>(this, dst);
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
    this.dst.next(v);
  }

  protected _error(e: any) {
    this.dst.error(e);
    this.unsubscribe();
  }

  protected _complete() {
    this.dst.complete();
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
    dst: PartialObserver<T>
  ) {
    super();
    this._next = dst.next!;
    this._error = dst.error!;
    this._complete = dst.complete!;
    if (dst !== emptyObserver) this.ctxt = Object.create(dst);
  }

  next(v: T) {
    if (!this.stopped && this._next) this._tryCall(this._next, v);
  }

  error(e: any) {
    if (!this.stopped) {
      if (this._error) this._tryCall(this._error, e);
      else hostReportError(e);
      this.unsubscribe();
    }
  }

  complete() {
    if (!this.stopped) {
      if (this._complete) this._tryCall(this._complete);
      this.unsubscribe();
    }
  }

  private _tryCall(f: Function, v?: any) {
    try {
      f.call(this.ctxt, v);
    } catch (e) {
      this.unsubscribe();
      hostReportError(e);
    }
  }

  _unsubscribe() {
    const s = this.psub;
    this.ctxt = this.psub = undefined;
    s?.unsubscribe();
  }
}

export class InnerSubscriber<T, R> extends Subscriber<R> {
  private index = 0;

  constructor(
    private parent: OuterSubscriber<T, R>,
    public outerValue: T,
    public outerIndex: number
  ) {
    super();
  }

  protected _next(value: R): void {
    this.parent.notifyNext(
      this.outerValue,
      value,
      this.outerIndex,
      this.index++,
      this
    );
  }

  protected _error(error: any): void {
    this.parent.notifyError(error, this);
    this.unsubscribe();
  }

  protected _complete(): void {
    this.parent.notifyComplete(this);
    this.unsubscribe();
  }
}

export class OuterSubscriber<T, R> extends Subscriber<T> {
  notifyNext(
    outerValue: T,
    innerValue: R,
    outerIndex: number,
    innerIndex: number,
    innerSub: InnerSubscriber<T, R>
  ): void {
    this.destination.next(innerValue);
  }

  notifyError(error: any, innerSub: InnerSubscriber<T, R>): void {
    this.destination.error(error);
  }

  notifyComplete(innerSub: InnerSubscriber<T, R>): void {
    this.destination.complete();
  }
}

export class SubjectSubscriber<T> extends Subscriber<T> {
  constructor(dst: Subject<T>) {
    super(dst);
  }
}

export class SubjectSubscription<T> extends Subscription {
  closed = false;

  constructor(public subject: Subject<T>, public subscriber: Observer<T>) {
    super();
  }

  unsubscribe() {
    if (this.closed) return;
    this.closed = true;
    const subject = this.subject;
    const observers = subject.observers;
    this.subject = null!;
    if (
      !observers ||
      observers.length === 0 ||
      subject.stopped ||
      subject.closed
    )
      return;
    const i = observers.indexOf(this.subscriber);
    if (i !== -1) observers.splice(i, 1);
  }
}

export class Subject<T> extends Observable<T> implements SubscriptionLike {
  [Symbol.rxSubscriber](): SubjectSubscriber<T> {
    return new SubjectSubscriber(this);
  }

  observers: Observer<T>[] = [];
  closed = false;
  stopped = false;
  hasError = false;
  thrownError: any = null;

  constructor() {
    super();
  }

  static create: Function = <T>(
    destination: Observer<T>,
    source: Observable<T>
  ): AnonymousSubject<T> => {
    return new AnonymousSubject<T>(destination, source);
  };

  lift<R>(operator: Operator<T, R>): Observable<R> {
    const subject = new AnonymousSubject(this, this);
    subject.operator = <any>operator;
    return <any>subject;
  }

  next(v: T) {
    if (this.closed) throw new ObjectUnsubscribedError();
    if (!this.stopped) {
      const {observers} = this;
      const len = observers.length;
      const copy = observers.slice();
      for (let i = 0; i < len; i++) {
        copy[i].next(v);
      }
    }
  }

  error(e: any) {
    if (this.closed) throw new ObjectUnsubscribedError();
    this.hasError = true;
    this.thrownError = e;
    this.stopped = true;
    const {observers} = this;
    const len = observers.length;
    const copy = observers.slice();
    for (let i = 0; i < len; i++) {
      copy[i].error(e);
    }
    this.observers.length = 0;
  }

  complete() {
    if (this.closed) throw new ObjectUnsubscribedError();
    this.stopped = true;
    const {observers} = this;
    const len = observers.length;
    const copy = observers.slice();
    for (let i = 0; i < len; i++) {
      copy[i].complete();
    }
    this.observers.length = 0;
  }

  unsubscribe() {
    this.stopped = true;
    this.closed = true;
    this.observers = null!;
  }

  _trySubscribe(s: Subscriber<T>) {
    if (this.closed) throw new ObjectUnsubscribedError();
    return super._trySubscribe(s);
  }

  _subscribe(s: Subscriber<T>): Subscription {
    if (this.closed) throw new ObjectUnsubscribedError();
    else if (this.hasError) {
      s.error(this.thrownError);
      return Subscription.EMPTY;
    } else if (this.stopped) {
      s.complete();
      return Subscription.EMPTY;
    } else {
      this.observers.push(s);
      return new SubjectSubscription(this, s);
    }
  }

  asObservable(): Observable<T> {
    const o = new Observable<T>();
    (<any>o).source = this;
    return o;
  }
}

export class AnonymousSubject<T> extends Subject<T> {
  constructor(protected dst?: Observer<T>, src?: Observable<T>) {
    super();
    this.source = src;
  }

  next(v: T) {
    this.dst?.next?.(v);
  }

  error(e: any) {
    this.dst?.error?.(e);
  }

  complete() {
    this.dst?.complete?.();
  }

  _subscribe(s: Subscriber<T>) {
    const {source} = this;
    if (source) return this.source!.subscribe(s);
    return Subscription.EMPTY;
  }
}

export class AsyncSubject<T> extends Subject<T> {
  private value: T | null = null;
  private hasNext: boolean = false;
  private hasCompleted: boolean = false;

  _subscribe(subscriber: Subscriber<any>): Subscription {
    if (this.hasError) {
      subscriber.error(this.thrownError);
      return Subscription.EMPTY;
    } else if (this.hasCompleted && this.hasNext) {
      subscriber.next(this.value);
      subscriber.complete();
      return Subscription.EMPTY;
    }
    return super._subscribe(subscriber);
  }

  next(value: T): void {
    if (!this.hasCompleted) {
      this.value = value;
      this.hasNext = true;
    }
  }

  error(error: any): void {
    if (!this.hasCompleted) {
      super.error(error);
    }
  }

  complete(): void {
    this.hasCompleted = true;
    if (this.hasNext) {
      super.next(this.value!);
    }
    super.complete();
  }
}

export class BehaviorSubject<T> extends Subject<T> {
  constructor(private _value: T) {
    super();
  }

  get value(): T {
    return this.getValue();
  }

  _subscribe(subscriber: Subscriber<T>): Subscription {
    const subscription = super._subscribe(subscriber);
    if (subscription && !(<SubscriptionLike>subscription).closed) {
      subscriber.next(this._value);
    }
    return subscription;
  }

  getValue(): T {
    if (this.hasError) {
      throw this.thrownError;
    } else if (this.closed) {
      throw new ObjectUnsubscribedError();
    } else {
      return this._value;
    }
  }

  next(value: T): void {
    super.next((this._value = value));
  }
}

export class ReplaySubject<T> extends Subject<T> {
  private _events: (ReplayEvent<T> | T)[] = [];
  private _bufferSize: number;
  private _windowTime: number;
  private _infiniteTimeWindow: boolean = false;

  constructor(
    bufferSize: number = Number.POSITIVE_INFINITY,
    windowTime: number = Number.POSITIVE_INFINITY,
    private timestampProvider: TimestampProvider = Date
  ) {
    super();
    this._bufferSize = bufferSize < 1 ? 1 : bufferSize;
    this._windowTime = windowTime < 1 ? 1 : windowTime;

    if (windowTime === Number.POSITIVE_INFINITY) {
      this._infiniteTimeWindow = true;
      /** @override */
      this.next = this.nextInfiniteTimeWindow;
    } else {
      this.next = this.nextTimeWindow;
    }
  }

  private nextInfiniteTimeWindow(value: T): void {
    const _events = this._events;
    _events.push(value);
    // Since this method is invoked in every next() call than the buffer
    // can overgrow the max size only by one item
    if (_events.length > this._bufferSize) {
      _events.shift();
    }

    super.next(value);
  }

  private nextTimeWindow(value: T): void {
    this._events.push({time: this._getNow(), value});
    this._trimBufferThenGetEvents();

    super.next(value);
  }

  _subscribe(subscriber: Subscriber<T>): Subscription {
    // When `_infiniteTimeWindow === true` then the buffer is already trimmed
    const _infiniteTimeWindow = this._infiniteTimeWindow;
    const _events = _infiniteTimeWindow
      ? this._events
      : this._trimBufferThenGetEvents();
    const len = _events.length;
    let subscription: Subscription;

    if (this.closed) {
      throw new ObjectUnsubscribedError();
    } else if (this.stopped || this.hasError) {
      subscription = Subscription.EMPTY;
    } else {
      this.observers.push(subscriber);
      subscription = new SubjectSubscription(this, subscriber);
    }

    if (_infiniteTimeWindow) {
      for (let i = 0; i < len && !subscriber.closed; i++) {
        subscriber.next(<T>_events[i]);
      }
    } else {
      for (let i = 0; i < len && !subscriber.closed; i++) {
        subscriber.next((<ReplayEvent<T>>_events[i]).value);
      }
    }

    if (this.hasError) {
      subscriber.error(this.thrownError);
    } else if (this.stopped) {
      subscriber.complete();
    }

    return subscription;
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

    if (spliceCount > 0) {
      _events.splice(0, spliceCount);
    }

    return _events;
  }
}

interface ReplayEvent<T> {
  time: number;
  value: T;
}
