//import {Observable} from './observe';

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
