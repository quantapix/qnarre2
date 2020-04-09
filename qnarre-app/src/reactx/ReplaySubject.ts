import {Subject} from './Subject';
import {TimestampProvider} from './types';
import {Subscriber} from './Subscriber';
import {Subscription} from './Subscription';
import {ObjectUnsubscribedError} from './util';
import {SubjectSubscription} from './SubjectSubscription';

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
    } else if (this.isStopped || this.hasError) {
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
    } else if (this.isStopped) {
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
