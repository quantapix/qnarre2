import {Operator} from './Operator';
import {Observable} from './Observable';
import {Subscriber} from './Subscriber';
import {Subscription} from './Subscription';
import {Observer, SubscriptionLike, Teardown} from './types';
import {ObjectUnsubscribedError} from './util';
import {SubjectSubscription} from './SubjectSubscription';

export class SubjectSubscriber<T> extends Subscriber<T> {
  constructor(protected destination: Subject<T>) {
    super(destination);
  }
}

export class Subject<T = void> extends Observable<T>
  implements SubscriptionLike {
  [Symbol.rxSubscriber]() {
    return new SubjectSubscriber(this);
  }

  observers: Observer<T>[] = [];
  closed = false;
  isStopped = false;
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

  next(value: T) {
    if (this.closed) throw new ObjectUnsubscribedError();
    if (!this.isStopped) {
      const {observers} = this;
      const len = observers.length;
      const copy = observers.slice();
      for (let i = 0; i < len; i++) {
        copy[i].next(value!);
      }
    }
  }

  error(err: any) {
    if (this.closed) throw new ObjectUnsubscribedError();
    this.hasError = true;
    this.thrownError = err;
    this.isStopped = true;
    const {observers} = this;
    const len = observers.length;
    const copy = observers.slice();
    for (let i = 0; i < len; i++) {
      copy[i].error(err);
    }
    this.observers.length = 0;
  }

  complete() {
    if (this.closed) throw new ObjectUnsubscribedError();
    this.isStopped = true;
    const {observers} = this;
    const len = observers.length;
    const copy = observers.slice();
    for (let i = 0; i < len; i++) {
      copy[i].complete();
    }
    this.observers.length = 0;
  }

  unsubscribe() {
    this.isStopped = true;
    this.closed = true;
    this.observers = null!;
  }

  _trySubscribe(subscriber: Subscriber<T>): Teardown {
    if (this.closed) throw new ObjectUnsubscribedError();
    return super._trySubscribe(subscriber);
  }

  _subscribe(subscriber: Subscriber<T>): Subscription {
    if (this.closed) throw new ObjectUnsubscribedError();
    else if (this.hasError) {
      subscriber.error(this.thrownError);
      return Subscription.EMPTY;
    } else if (this.isStopped) {
      subscriber.complete();
      return Subscription.EMPTY;
    } else {
      this.observers.push(subscriber);
      return new SubjectSubscription(this, subscriber);
    }
  }

  asObservable(): Observable<T> {
    const observable = new Observable<T>();
    (<any>observable).source = this;
    return observable;
  }
}

export class AnonymousSubject<T> extends Subject<T> {
  constructor(protected destination?: Observer<T>, source?: Observable<T>) {
    super();
    this.source = source;
  }

  next(value: T) {
    const {destination} = this;
    if (destination && destination.next) destination.next(value);
  }

  error(err: any) {
    const {destination} = this;
    if (destination && destination.error) this.destination!.error(err);
  }

  complete() {
    const {destination} = this;
    if (destination && destination.complete) this.destination!.complete();
  }

  _subscribe(subscriber: Subscriber<T>): Subscription {
    const {source} = this;
    if (source) return this.source!.subscribe(subscriber);
    return Subscription.EMPTY;
  }
}
