import * as qt from './types';
import * as qu from './utils';
import * as qr from './opers';
import * as qj from './subject';

export function repeat<N, F, D>(count: number = -1): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    if (count === 0) {
      return EMPTY;
    } else if (count < 0) {
      return source.lift(new RepeatOperator(-1, source));
    } else {
      return source.lift(new RepeatO(count - 1, source));
    }
  };
}

class RepeatO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private count: number, private source: qt.Source<N, F, D>) {}
  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new RepeatR(subscriber, this.count, this.source));
  }
}

export class RepeatR<N, F, D> extends Subscriber<N, F, D> {
  constructor(
    tgt: Subscriber<any>,
    private count: number,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  done(d?: D) {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) return super.done(d);
      else if (count > -1) this.count = count - 1;
      source.subscribe(this._recycle());
    }
  }
}

export function repeatWhen<N, F, D>(
  notifier: (notifications: qt.Source<any, F, D>) => qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => source.lift(new RepeatWhenO(notifier));
}

class RepeatWhenO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    protected notifier: (
      notifications: qt.Source<any, F, D>
    ) => qt.Source<any, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new RepeatWhenR(subscriber, this.notifier, source));
  }
}

export class RepeatWhenR<N, M, F, D> extends Reactor<N, M, F, D> {
  private notifications: Subject<void> | null = null;
  private retries: qt.Source<any, F, D> | null = null;
  private retriesSubscription: Subscription | null | undefined = null;
  private sourceIsBeingSubscribedTo = true;

  constructor(
    tgt: Subscriber<R>,
    private notifier: (
      notifications: qt.Source<any, F, D>
    ) => qt.Source<any, F, D>,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ): void {
    this.sourceIsBeingSubscribedTo = true;
    this.source.subscribe(this);
  }

  reactDone(innerSub: Actor<N, M, F, D>): void {
    if (this.sourceIsBeingSubscribedTo === false) {
      return super.complete();
    }
  }

  complete() {
    this.sourceIsBeingSubscribedTo = false;

    if (!this.stopped) {
      if (!this.retries) {
        this.subscribeToRetries();
      }
      if (!this.retriesSubscription || this.retriesSubscription.closed) {
        return super.complete();
      }

      this._recycle();
      this.notifications!.next();
    }
  }

  _unsubscribe() {
    const {notifications, retriesSubscription} = this;
    if (notifications) {
      notifications.unsubscribe();
      this.notifications = null;
    }
    if (retriesSubscription) {
      retriesSubscription.unsubscribe();
      this.retriesSubscription = null;
    }
    this.retries = null;
  }

  _recycle(): Subscriber<N, F, D> {
    const {_unsubscribe} = this;

    this._unsubscribe = null!;
    super._recycle();
    this._unsubscribe = _unsubscribe;

    return this;
  }

  private subscribeToRetries() {
    this.notifications = new Subject();
    let retries;
    try {
      const {notifier} = this;
      retries = notifier(this.notifications);
    } catch (e) {
      return super.complete();
    }
    this.retries = retries;
    this.retriesSubscription = qu.subscribeToResult(this, retries);
  }
}

export function throwIfEmpty<N, F, D>(
  errorFactory: () => any = defaultErrorFactory
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) => {
    return source.lift(new ThrowIfEmptyO(errorFactory));
  };
}

class ThrowIfEmptyO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(private errorFactory: () => any) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(new ThrowIfEmptyR(subscriber, this.errorFactory));
  }
}

export class ThrowIfEmptyR<N, F, D> extends Subscriber<N, F, D> {
  private hasValue = false;

  constructor(tgt: Subscriber<N, F, D>, private errorFactory: () => any) {
    super(tgt);
  }

  protected _next(n?: N) {
    this.hasValue = true;
    this.tgt.next(n);
  }

  protected _done(d?: D) {
    if (!this.hasValue) {
      let err: any;
      try {
        err = this.errorFactory();
      } catch (e) {
        err = e;
      }
      this.tgt.fail(err);
    } else return this.tgt.done(d);
  }
}

function defaultErrorFactory() {
  return new EmptyError();
}
