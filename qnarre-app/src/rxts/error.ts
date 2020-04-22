import * as qt from './types';
import * as qu from './utils';
import * as qr from './opers';
import * as qj from './subject';

export function catchError<N, O extends qt.Input<any>>(
  selector: (err: any, caught: qt.Source<N>) => O
): qt.Lifter<N, T | qt.Sourced<O>>;
export function catchError<N, O extends qt.Input<any>>(
  selector: (err: any, caught: qt.Source<N>) => O
): qt.Lifter<N, T | qt.Sourced<O>> {
  return function catchErrorLifter(
    source: qt.Source<N>
  ): qt.Source<N | qt.Sourced<O>> {
    const operator = new CatchO(selector);
    const caught = source.lift(operator);
    return (operator.caught = caught as qt.Source<N>);
  };
}

class CatchO<N, R> implements qt.Operator<N, T | R> {
  caught: qt.Source<N> | undefined;

  constructor(
    private selector: (err: any, caught: qt.Source<N>) => qt.Input<N | R>
  ) {}

  call(subscriber: qt.Subscriber<R>, source: any): any {
    return source.subscribe(
      new CatchR(subscriber, this.selector, this.caught!)
    );
  }
}

export class CatchR<O, I> extends qj.Reactor<N, N | M> {
  constructor(
    tgt: qt.Subscriber<any>,
    private selector: (err: any, caught: qt.Source<N>) => qt.Input<N | M>,
    private caught: qt.Source<N>
  ) {
    super(tgt);
  }

  fail(e: any) {
    if (!this.stopped) {
      let result: any;
      try {
        result = this.selector(f, this.caught);
      } catch (f2) {
        super.fail(f2);
        return;
      }
      this._recycle();
      const i = new Actor(this, undefined, undefined!);
      this.add(i);
      const s = qu.subscribeToResult(this, result, undefined, undefined, i);
      if (s !== i) this.add(s);
    }
  }
}

export interface RetryConfig {
  count: number;
  resetOnSuccess?: boolean;
}

export function retry<N>(count?: number): qt.Shifter<N>;
export function retry<N>(config: RetryConfig): qt.Shifter<N>;
export function retry<N>(
  configOrCount: number | RetryConfig = -1
): qt.Shifter<N> {
  let config: RetryConfig;
  if (configOrCount && typeof configOrCount === 'object') {
    config = configOrCount as RetryConfig;
  } else {
    config = {
      count: configOrCount as number
    };
  }
  return x => x.lift(new RetryO(config.count, !!config.resetOnSuccess, source));
}

class RetryO<N> implements qt.Operator<N, N> {
  constructor(
    private count: number,
    private resetOnSuccess: boolean,
    private source: qt.Source<N>
  ) {}

  call(subscriber: qt.Subscriber<N>, source: any): qt.Closer {
    return source.subscribe(
      new RetryR(subscriber, this.count, this.resetOnSuccess, this.source)
    );
  }
}

export class RetryR<N> extends qj.Subscriber<N> {
  private readonly initialCount: number;

  constructor(
    tgt: qt.Subscriber<any>,
    private count: number,
    private resetOnSuccess: boolean,
    private source: qt.Source<N>
  ) {
    super(tgt);
    this.initialCount = this.count;
  }

  next(value?: N) {
    super.next(value);
    if (this.resetOnSuccess) {
      this.count = this.initialCount;
    }
  }

  fail(e: any) {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) return super.fail(e);
      else if (count > -1) this.count = count - 1;
      source.subscribe(this._recycle());
    }
  }
}

export function retryWhen<N>(
  notifier: (errors: qt.Source<any>) => qt.Source<any>
): qt.Shifter<N> {
  return x => x.lift(new RetryWhenO(notifier, source));
}

class RetryWhenO<N> implements qt.Operator<N, N> {
  constructor(
    protected notifier: (errors: qt.Source<any>) => qt.Source<any>,
    protected source: qt.Source<N>
  ) {}

  call(subscriber: qt.Subscriber<N>, source: any): qt.Closer {
    return source.subscribe(
      new RetryWhenR(subscriber, this.notifier, this.source)
    );
  }
}

export class RetryWhenR<N, M> extends qj.Reactor<N, M> {
  private errors?: qj.Subject<any>;
  private retries?: qt.Source<any>;
  private retriesSubscription?: qj.Subscription;

  constructor(
    tgt: qt.Subscriber<M>,
    private notifier: (errors: qt.Source<any>) => qt.Source<any>,
    private source: qt.Source<N>
  ) {
    super(tgt);
  }

  fail(e: any) {
    if (!this.stopped) {
      let errors = this.errors;
      let retries = this.retries;
      let retriesSubscription = this.retriesSubscription;
      if (!retries) {
        errors = new Subject();
        try {
          const {notifier} = this;
          retries = notifier(errors);
        } catch (e) {
          return super.fail(e);
        }
        retriesSubscription = qu.subscribeToResult(this, retries);
      } else {
        this.errors = undefined;
        this.retriesSubscription = undefined;
      }
      this._recycle();
      this.errors = errors;
      this.retries = retries;
      this.retriesSubscription = retriesSubscription;
      errors!.next(err);
    }
  }

  _unsubscribe() {
    const {errors, retriesSubscription} = this;
    if (errors) {
      errors.unsubscribe();
      this.errors = null;
    }
    if (retriesSubscription) {
      retriesSubscription.unsubscribe();
      this.retriesSubscription = undefined;
    }
    this.retries = undefined;
  }

  reactNext() {
    const {_unsubscribe} = this;
    this._unsubscribe = null!;
    this._recycle();
    this._unsubscribe = _unsubscribe;
    this.source.subscribe(this);
  }
}
