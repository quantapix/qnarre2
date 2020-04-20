import * as qt from './types';
import * as qu from './utils';
import * as qr from './opers';
import * as qj from './subject';

export function catchError<T, O extends SourceInput<any>>(
  selector: (err: any, caught: qt.Source<N, F, D>) => O
): Lifter<T, T | Sourced<O>>;
export function catchError<T, O extends SourceInput<any>>(
  selector: (err: any, caught: qt.Source<N, F, D>) => O
): Lifter<T, T | Sourced<O>> {
  return function catchErrorLifter(
    source: qt.Source<N, F, D>
  ): qt.Source<T | Sourced<O>> {
    const operator = new CatchO(selector);
    const caught = source.lift(operator);
    return (operator.caught = caught as qt.Source<N, F, D>);
  };
}

class CatchO<T, R> implements qt.Operator<T, T | R> {
  caught: qt.Source<N, F, D> | undefined;

  constructor(
    private selector: (
      err: any,
      caught: qt.Source<N, F, D>
    ) => SourceInput<T | R>
  ) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new CatchR(subscriber, this.selector, this.caught!)
    );
  }
}

export class CatchR<O, I, F, D> extends Reactor<N, N | M, F, D> {
  constructor(
    tgt: Subscriber<any, F, D>,
    private selector: (
      err: any,
      caught: qt.Source<N, F, D>
    ) => qt.SourceInput<N | M, F, D>,
    private caught: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  fail(f?: F) {
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

export function retry<N, F, D>(count?: number): qt.MonoOper<N, F, D>;
export function retry<N, F, D>(config: RetryConfig): qt.MonoOper<N, F, D>;
export function retry<N, F, D>(
  configOrCount: number | RetryConfig = -1
): qt.MonoOper<N, F, D> {
  let config: RetryConfig;
  if (configOrCount && typeof configOrCount === 'object') {
    config = configOrCount as RetryConfig;
  } else {
    config = {
      count: configOrCount as number
    };
  }
  return (source: qt.Source<N, F, D>) =>
    source.lift(new RetryO(config.count, !!config.resetOnSuccess, source));
}

class RetryO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    private count: number,
    private resetOnSuccess: boolean,
    private source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RetryR(subscriber, this.count, this.resetOnSuccess, this.source)
    );
  }
}

export class RetryR<N, F, D> extends Subscriber<N, F, D> {
  private readonly initialCount: number;

  constructor(
    tgt: Subscriber<any>,
    private count: number,
    private resetOnSuccess: boolean,
    private source: qt.Source<N, F, D>
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

  fail(f?: F) {
    if (!this.stopped) {
      const {source, count} = this;
      if (count === 0) return super.fail(f);
      else if (count > -1) this.count = count - 1;
      source.subscribe(this._recycle());
    }
  }
}

export function retryWhen<N, F, D>(
  notifier: (errors: qt.Source<any, F, D>) => qt.Source<any, F, D>
): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    source.lift(new RetryWhenO(notifier, source));
}

class RetryWhenO<N, F, D> implements qt.Operator<N, N, F, D> {
  constructor(
    protected notifier: (errors: qt.Source<any, F, D>) => qt.Source<any, F, D>,
    protected source: qt.Source<N, F, D>
  ) {}

  call(subscriber: Subscriber<N, F, D>, source: any): qt.Closer {
    return source.subscribe(
      new RetryWhenR(subscriber, this.notifier, this.source)
    );
  }
}

export class RetryWhenR<N, M, F, D> extends Reactor<N, M, F, D> {
  private errors?: Subject<any>;
  private retries?: qt.Source<any, F, D>;
  private retriesSubscription?: Subscription;

  constructor(
    tgt: Subscriber<M, F, D>,
    private notifier: (errors: qt.Source<any, F, D>) => qt.Source<any, F, D>,
    private source: qt.Source<N, F, D>
  ) {
    super(tgt);
  }

  fail(f?: F) {
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

  reactNext(
    outerN: N,
    innerValue: M,
    outerX: number,
    innerIndex: number,
    innerSub: Actor<N, M, F, D>
  ) {
    const {_unsubscribe} = this;
    this._unsubscribe = null!;
    this._recycle();
    this._unsubscribe = _unsubscribe;
    this.source.subscribe(this);
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
