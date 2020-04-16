import * as qt from './types';
import * as qu from './utils';
import * as qr from './source';
import * as qs from './subject';

export class Connectable<N, F, D> extends qr.Source<N, F, D> {
  sub?: qs.Subscription;
  _subj?: qt.Subject<N, F, D>;
  done = false;
  count = 0;

  constructor(
    public src: qr.Source<N, F, D>,
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

  connect(): qs.Subscription {
    let s = this.sub;
    if (!s) {
      this.done = false;
      s = this.sub = new qs.Subscription();
      s.add(this.src.subscribe(new ConnectableSubscriber(this.subj, this)));
      if (s.closed) {
        this.sub = undefined;
        s = qs.Subscription.fake;
      }
    }
    return s;
  }

  refCount() {
    return higherOrderRefCount()(this) as qr.Source<N, F, D>;
  }
}

export const connectableObservableDescriptor: PropertyDescriptorMap = (() => {
  const p = <any>Connectable.prototype;
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

class ConnectableSubscriber<T> extends SubjectSubscriber<T> {
  constructor(obs: Subject<T>, private con?: Connectable<T>) {
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

class RefCountOperator<T> implements qt.Operator<T, T> {
  constructor(private con: Connectable<T>) {}

  call(s: Subscriber<T>, source: any): Closer {
    const c = this.con;
    c.count++;
    const refCounter = new RefCountSubscriber(s, c);
    const s = source.subscribe(refCounter);
    if (!refCounter.closed) {
      (<any>refCounter).connection = c.connect();
    }
    return s;
  }
}

class RefCountSubscriber<T> extends Subscriber<T> {
  private subs?: Subscription;

  constructor(obs: Subscriber<T>, private con?: Connectable<T>) {
    super(obs);
  }

  protected _unsubscribe() {
    const c = this.con;
    if (!c) {
      this.subs = undefined;
      return;
    }
    this.con = undefined;
    const refCount = c.count;
    if (refCount <= 0) {
      this.subs = undefined;
      return;
    }
    c.count = refCount - 1;
    if (refCount > 1) {
      this.subs = undefined;
      return;
    }
    const s = this.subs;
    const shared = c.subs;
    this.subs = undefined;
    if (shared && (!s || shared === s)) shared.unsubscribe();
  }
}

export interface DispatchArg<T> {
  source: Observable<T>;
  subscriber: Subscriber<T>;
}

export class SubscribeOnObservable<T> extends Observable<T> {
  static create<T>(
    source: Observable<T>,
    delay: number = 0,
    scheduler: SchedulerLike = asap
  ): Observable<T> {
    return new SubscribeOnObservable(source, delay, scheduler);
  }

  static dispatch<T>(
    this: SchedulerAction<T>,
    arg: DispatchArg<T>
  ): Subscription {
    const {source, subscriber} = arg;
    return this.add(source.subscribe(subscriber));
  }

  constructor(
    public source: Observable<T>,
    private delayTime: number = 0,
    private scheduler: SchedulerLike = asap
  ) {
    super();
    if (!isNumeric(delayTime) || delayTime < 0) {
      this.delayTime = 0;
    }
    if (!scheduler || typeof scheduler.schedule !== 'function') {
      this.scheduler = asap;
    }
  }

  _subscribe(subscriber: Subscriber<T>) {
    const delay = this.delayTime;
    const source = this.source;
    const scheduler = this.scheduler;
    return scheduler.schedule<DispatchArg<any>>(
      SubscribeOnObservable.dispatch as any,
      delay,
      {
        source,
        subscriber
      }
    );
  }
}

export function bindCallback<R1, R2, R3, R4>(
  callbackFunc: (
    callback: (res1: R1, res2: R2, res3: R3, res4: R4, ...args: any[]) => any
  ) => any,
  scheduler?: SchedulerLike
): () => Observable<any[]>;
export function bindCallback<R1, R2, R3>(
  callbackFunc: (callback: (res1: R1, res2: R2, res3: R3) => any) => any,
  scheduler?: SchedulerLike
): () => Observable<[R1, R2, R3]>;
export function bindCallback<R1, R2>(
  callbackFunc: (callback: (res1: R1, res2: R2) => any) => any,
  scheduler?: SchedulerLike
): () => Observable<[R1, R2]>;
export function bindCallback<R1>(
  callbackFunc: (callback: (res1: R1) => any) => any,
  scheduler?: SchedulerLike
): () => Observable<R1>;
export function bindCallback(
  callbackFunc: (callback: () => any) => any,
  scheduler?: SchedulerLike
): () => Observable<void>;
export function bindCallback<A1, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    callback: (res1: R1, res2: R2, res3: R3, res4: R4, ...args: any[]) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1) => Observable<any[]>;
export function bindCallback<A1, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    callback: (res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1) => Observable<[R1, R2, R3]>;
export function bindCallback<A1, R1, R2>(
  callbackFunc: (arg1: A1, callback: (res1: R1, res2: R2) => any) => any,
  scheduler?: SchedulerLike
): (arg1: A1) => Observable<[R1, R2]>;
export function bindCallback<A1, R1>(
  callbackFunc: (arg1: A1, callback: (res1: R1) => any) => any,
  scheduler?: SchedulerLike
): (arg1: A1) => Observable<R1>;
export function bindCallback<A1>(
  callbackFunc: (arg1: A1, callback: () => any) => any,
  scheduler?: SchedulerLike
): (arg1: A1) => Observable<void>;
export function bindCallback<A1, A2, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    callback: (res1: R1, res2: R2, res3: R3, res4: R4, ...args: any[]) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2) => Observable<any[]>;
export function bindCallback<A1, A2, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    callback: (res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2) => Observable<[R1, R2, R3]>;
export function bindCallback<A1, A2, R1, R2>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    callback: (res1: R1, res2: R2) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2) => Observable<[R1, R2]>;
export function bindCallback<A1, A2, R1>(
  callbackFunc: (arg1: A1, arg2: A2, callback: (res1: R1) => any) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2) => Observable<R1>;
export function bindCallback<A1, A2>(
  callbackFunc: (arg1: A1, arg2: A2, callback: () => any) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2) => Observable<void>;
export function bindCallback<A1, A2, A3, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    callback: (res1: R1, res2: R2, res3: R3, res4: R4, ...args: any[]) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3) => Observable<any[]>;
export function bindCallback<A1, A2, A3, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    callback: (res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3) => Observable<[R1, R2, R3]>;
export function bindCallback<A1, A2, A3, R1, R2>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    callback: (res1: R1, res2: R2) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3) => Observable<[R1, R2]>;
export function bindCallback<A1, A2, A3, R1>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    callback: (res1: R1) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3) => Observable<R1>;
export function bindCallback<A1, A2, A3>(
  callbackFunc: (arg1: A1, arg2: A2, arg3: A3, callback: () => any) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3) => Observable<void>;
export function bindCallback<A1, A2, A3, A4, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: (res1: R1, res2: R2, res3: R3, res4: R4, ...args: any[]) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Observable<any[]>;
export function bindCallback<A1, A2, A3, A4, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: (res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Observable<[R1, R2, R3]>;
export function bindCallback<A1, A2, A3, A4, R1, R2>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: (res1: R1, res2: R2) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Observable<[R1, R2]>;
export function bindCallback<A1, A2, A3, A4, R1>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: (res1: R1) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Observable<R1>;
export function bindCallback<A1, A2, A3, A4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: () => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Observable<void>;
export function bindCallback<A1, A2, A3, A4, A5, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: (res1: R1, res2: R2, res3: R3, res4: R4, ...args: any[]) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Observable<any[]>;
export function bindCallback<A1, A2, A3, A4, A5, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: (res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (
  arg1: A1,
  arg2: A2,
  arg3: A3,
  arg4: A4,
  arg5: A5
) => Observable<[R1, R2, R3]>;
export function bindCallback<A1, A2, A3, A4, A5, R1, R2>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: (res1: R1, res2: R2) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Observable<[R1, R2]>;
export function bindCallback<A1, A2, A3, A4, A5, R1>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: (res1: R1) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Observable<R1>;
export function bindCallback<A1, A2, A3, A4, A5>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: () => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Observable<void>;
export function bindCallback<A, R>(
  callbackFunc: (...args: Array<A | ((result: R) => any)>) => any,
  scheduler?: SchedulerLike
): (...args: A[]) => Observable<R>;
export function bindCallback<A, R>(
  callbackFunc: (...args: Array<A | ((...results: R[]) => any)>) => any,
  scheduler?: SchedulerLike
): (...args: A[]) => Observable<R[]>;
export function bindCallback(
  callbackFunc: Function,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<any>;
export function bindCallback<T>(
  callbackFunc: Function,
  resultSelector?: Function | SchedulerLike,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<T> {
  if (resultSelector) {
    if (isScheduler(resultSelector)) {
      scheduler = resultSelector;
    } else {
      // DEPRECATED PATH
      return (...args: any[]) =>
        bindCallback(
          callbackFunc,
          scheduler
        )(...args).pipe(
          map(args =>
            isArray(args) ? resultSelector(...args) : resultSelector(args)
          )
        );
    }
  }
  return function (this: any, ...args: any[]): Observable<T> {
    const context = this;
    let subject: Async<T> | undefined;
    const params = {
      context,
      subject: undefined,
      callbackFunc,
      scheduler: scheduler!
    };
    return new Observable<T>(subscriber => {
      if (!scheduler) {
        if (!subject) {
          subject = new Async<T>();
          const handler = (...innerArgs: any[]) => {
            subject!.next(innerArgs.length <= 1 ? innerArgs[0] : innerArgs);
            subject!.complete();
          };

          try {
            callbackFunc.apply(context, [...args, handler]);
          } catch (err) {
            if (canReportError(subject)) {
              subject.error(err);
            } else {
              console.warn(err);
            }
          }
        }
        return subject.subscribe(subscriber);
      } else {
        const state: DispatchState<T> = {
          args,
          subscriber,
          params
        };
        return scheduler.schedule<DispatchState<T>>(dispatch as any, 0, state);
      }
    });
  };
}

interface DispatchState<T> {
  args: any[];
  subscriber: Subscriber<T>;
  params: ParamsContext<T>;
}

interface ParamsContext<T> {
  callbackFunc: Function;
  scheduler: SchedulerLike;
  context: any;
  subject?: Async<T>;
}

function dispatch<T>(
  this: SchedulerAction<DispatchState<T>>,
  state: DispatchState<T>
) {
  const self = this;
  const {args, subscriber, params} = state;
  const {callbackFunc, context, scheduler} = params;
  let {subject} = params;
  if (!subject) {
    subject = params.subject = new Async<T>();

    const handler = (...innerArgs: any[]) => {
      const value = innerArgs.length <= 1 ? innerArgs[0] : innerArgs;
      this.add(
        scheduler.schedule<NextState<T>>(dispatchNext as any, 0, {
          value,
          subject: subject!
        })
      );
    };

    try {
      callbackFunc.apply(context, [...args, handler]);
    } catch (err) {
      subject.error(err);
    }
  }

  this.add(subject.subscribe(subscriber));
}

interface NextState<T> {
  subject: Async<T>;
  value: T;
}

function dispatchNext<T>(
  this: SchedulerAction<NextState<T>>,
  state: NextState<T>
) {
  const {value, subject} = state;
  subject.next(value);
  subject.complete();
}

interface ErrorState<T> {
  subject: Async<T>;
  err: any;
}

function dispatchError<T>(
  this: SchedulerAction<ErrorState<T>>,
  state: ErrorState<T>
) {
  const {err, subject} = state;
  subject.error(err);
}

export function bindNodeCallback<R1, R2, R3, R4>(
  callbackFunc: (
    callback: (
      err: any,
      res1: R1,
      res2: R2,
      res3: R3,
      res4: R4,
      ...args: any[]
    ) => any
  ) => any,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<any[]>;
export function bindNodeCallback<R1, R2, R3>(
  callbackFunc: (
    callback: (err: any, res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): () => Observable<[R1, R2, R3]>;
export function bindNodeCallback<R1, R2>(
  callbackFunc: (callback: (err: any, res1: R1, res2: R2) => any) => any,
  scheduler?: SchedulerLike
): () => Observable<[R1, R2]>;
export function bindNodeCallback<R1>(
  callbackFunc: (callback: (err: any, res1: R1) => any) => any,
  scheduler?: SchedulerLike
): () => Observable<R1>;
export function bindNodeCallback(
  callbackFunc: (callback: (err: any) => any) => any,
  scheduler?: SchedulerLike
): () => Observable<void>;
export function bindNodeCallback<A1, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    callback: (
      err: any,
      res1: R1,
      res2: R2,
      res3: R3,
      res4: R4,
      ...args: any[]
    ) => any
  ) => any,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<any[]>;
export function bindNodeCallback<A1, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    callback: (err: any, res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1) => Observable<[R1, R2, R3]>;
export function bindNodeCallback<A1, R1, R2>(
  callbackFunc: (
    arg1: A1,
    callback: (err: any, res1: R1, res2: R2) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1) => Observable<[R1, R2]>;
export function bindNodeCallback<A1, R1>(
  callbackFunc: (arg1: A1, callback: (err: any, res1: R1) => any) => any,
  scheduler?: SchedulerLike
): (arg1: A1) => Observable<R1>;
export function bindNodeCallback<A1>(
  callbackFunc: (arg1: A1, callback: (err: any) => any) => any,
  scheduler?: SchedulerLike
): (arg1: A1) => Observable<void>;
export function bindNodeCallback<A1, A2, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    callback: (
      err: any,
      res1: R1,
      res2: R2,
      res3: R3,
      res4: R4,
      ...args: any[]
    ) => any
  ) => any,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<any[]>;
export function bindNodeCallback<A1, A2, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    callback: (err: any, res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2) => Observable<[R1, R2, R3]>;
export function bindNodeCallback<A1, A2, R1, R2>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    callback: (err: any, res1: R1, res2: R2) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2) => Observable<[R1, R2]>;
export function bindNodeCallback<A1, A2, R1>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    callback: (err: any, res1: R1) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2) => Observable<R1>;
export function bindNodeCallback<A1, A2>(
  callbackFunc: (arg1: A1, arg2: A2, callback: (err: any) => any) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2) => Observable<void>;
export function bindNodeCallback<A1, A2, A3, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    callback: (
      err: any,
      res1: R1,
      res2: R2,
      res3: R3,
      res4: R4,
      ...args: any[]
    ) => any
  ) => any,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<any[]>;
export function bindNodeCallback<A1, A2, A3, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    callback: (err: any, res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3) => Observable<[R1, R2, R3]>;
export function bindNodeCallback<A1, A2, A3, R1, R2>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    callback: (err: any, res1: R1, res2: R2) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3) => Observable<[R1, R2]>;
export function bindNodeCallback<A1, A2, A3, R1>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    callback: (err: any, res1: R1) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3) => Observable<R1>;
export function bindNodeCallback<A1, A2, A3>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    callback: (err: any) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3) => Observable<void>;
export function bindNodeCallback<A1, A2, A3, A4, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: (
      err: any,
      res1: R1,
      res2: R2,
      res3: R3,
      res4: R4,
      ...args: any[]
    ) => any
  ) => any,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<any[]>;
export function bindNodeCallback<A1, A2, A3, A4, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: (err: any, res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Observable<[R1, R2, R3]>;
export function bindNodeCallback<A1, A2, A3, A4, R1, R2>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: (err: any, res1: R1, res2: R2) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Observable<[R1, R2]>;
export function bindNodeCallback<A1, A2, A3, A4, R1>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: (err: any, res1: R1) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Observable<R1>;
export function bindNodeCallback<A1, A2, A3, A4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    callback: (err: any) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4) => Observable<void>;
export function bindNodeCallback<A1, A2, A3, A4, A5, R1, R2, R3, R4>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: (
      err: any,
      res1: R1,
      res2: R2,
      res3: R3,
      res4: R4,
      ...args: any[]
    ) => any
  ) => any,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<any[]>;
export function bindNodeCallback<A1, A2, A3, A4, A5, R1, R2, R3>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: (err: any, res1: R1, res2: R2, res3: R3) => any
  ) => any,
  scheduler?: SchedulerLike
): (
  arg1: A1,
  arg2: A2,
  arg3: A3,
  arg4: A4,
  arg5: A5
) => Observable<[R1, R2, R3]>;
export function bindNodeCallback<A1, A2, A3, A4, A5, R1, R2>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: (err: any, res1: R1, res2: R2) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Observable<[R1, R2]>;
export function bindNodeCallback<A1, A2, A3, A4, A5, R1>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: (err: any, res1: R1) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Observable<R1>;
export function bindNodeCallback<A1, A2, A3, A4, A5>(
  callbackFunc: (
    arg1: A1,
    arg2: A2,
    arg3: A3,
    arg4: A4,
    arg5: A5,
    callback: (err: any) => any
  ) => any,
  scheduler?: SchedulerLike
): (arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => Observable<void>;
export function bindNodeCallback(
  callbackFunc: Function,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<any[]>;
export function bindNodeCallback<T>(
  callbackFunc: Function,
  resultSelector?: Function | SchedulerLike,
  scheduler?: SchedulerLike
): (...args: any[]) => Observable<T> {
  if (resultSelector) {
    if (isScheduler(resultSelector)) {
      scheduler = resultSelector;
    } else {
      // DEPRECATED PATH
      return (...args: any[]) =>
        bindNodeCallback(
          callbackFunc,
          scheduler
        )(...args).pipe(
          map(args =>
            isArray(args) ? resultSelector(...args) : resultSelector(args)
          )
        );
    }
  }
  return function (this: any, ...args: any[]): Observable<T> {
    const params: ParamsState<T> = {
      subject: undefined!,
      args,
      callbackFunc,
      scheduler: scheduler!,
      context: this
    };
    return new Observable<T>(subscriber => {
      const {context} = params;
      let {subject} = params;
      if (!scheduler) {
        if (!subject) {
          subject = params.subject = new Async<T>();
          const handler = (...innerArgs: any[]) => {
            const err = innerArgs.shift();

            if (err) {
              subject.error(err);
              return;
            }

            subject.next(innerArgs.length <= 1 ? innerArgs[0] : innerArgs);
            subject.complete();
          };

          try {
            callbackFunc.apply(context, [...args, handler]);
          } catch (err) {
            if (canReportError(subject)) {
              subject.error(err);
            } else {
              console.warn(err);
            }
          }
        }
        return subject.subscribe(subscriber);
      } else {
        return scheduler.schedule<DispatchState<T>>(dispatch as any, 0, {
          params,
          subscriber,
          context
        });
      }
    });
  };
}

interface DispatchState<T> {
  subscriber: Subscriber<T>;
  context: any;
  params: ParamsState<T>;
}

interface ParamsState<T> {
  callbackFunc: Function;
  args: any[];
  scheduler: SchedulerLike;
  subject: Async<T>;
  context: any;
}

function dispatch<T>(
  this: SchedulerAction<DispatchState<T>>,
  state: DispatchState<T>
) {
  const {params, subscriber, context} = state;
  const {callbackFunc, args, scheduler} = params;
  let subject = params.subject;

  if (!subject) {
    subject = params.subject = new Async<T>();

    const handler = (...innerArgs: any[]) => {
      const err = innerArgs.shift();
      if (err) {
        this.add(
          scheduler.schedule<DispatchErrorArg<T>>(dispatchError as any, 0, {
            err,
            subject
          })
        );
      } else {
        const value = innerArgs.length <= 1 ? innerArgs[0] : innerArgs;
        this.add(
          scheduler.schedule<DispatchNextArg<T>>(dispatchNext as any, 0, {
            value,
            subject
          })
        );
      }
    };

    try {
      callbackFunc.apply(context, [...args, handler]);
    } catch (err) {
      this.add(
        scheduler.schedule<DispatchErrorArg<T>>(dispatchError as any, 0, {
          err,
          subject
        })
      );
    }
  }

  this.add(subject.subscribe(subscriber));
}

interface DispatchNextArg<T> {
  subject: Async<T>;
  value: T;
}

function dispatchNext<T>(arg: DispatchNextArg<T>) {
  const {value, subject} = arg;
  subject.next(value);
  subject.complete();
}

interface DispatchErrorArg<T> {
  subject: Async<T>;
  err: any;
}

function dispatchError<T>(arg: DispatchErrorArg<T>) {
  const {err, subject} = arg;
  subject.error(err);
}

const NONE = {};

export function combineLatest<O1 extends SourceInput<any>>(
  sources: [O1]
): Observable<[Sourced<O1>]>;
export function combineLatest<
  O1 extends SourceInput<any>,
  O2 extends SourceInput<any>
>(sources: [O1, O2]): Observable<[Sourced<O1>, Sourced<O2>]>;
export function combineLatest<
  O1 extends SourceInput<any>,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>
>(sources: [O1, O2, O3]): Observable<[Sourced<O1>, Sourced<O2>, Sourced<O3>]>;
export function combineLatest<
  O1 extends SourceInput<any>,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>
>(
  sources: [O1, O2, O3, O4]
): Observable<[Sourced<O1>, Sourced<O2>, Sourced<O3>, Sourced<O4>]>;
export function combineLatest<
  O1 extends SourceInput<any>,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>
>(
  sources: [O1, O2, O3, O4, O5]
): Observable<
  [Sourced<O1>, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>]
>;
export function combineLatest<
  O1 extends SourceInput<any>,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>,
  O6 extends SourceInput<any>
>(
  sources: [O1, O2, O3, O4, O5, O6]
): Observable<
  [Sourced<O1>, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>, Sourced<O6>]
>;
export function combineLatest<O extends SourceInput<any>>(
  sources: O[]
): Observable<Sourced<O>[]>;
export function combineLatest<O extends SourceInput<any>, R>(
  ...observables: (O | ((...values: Sourced<O>[]) => R) | SchedulerLike)[]
): Observable<R> {
  let resultSelector: ((...values: Array<any>) => R) | undefined = undefined;
  let scheduler: SchedulerLike | undefined = undefined;

  if (isScheduler(observables[observables.length - 1])) {
    scheduler = observables.pop() as SchedulerLike;
  }

  if (typeof observables[observables.length - 1] === 'function') {
    resultSelector = observables.pop() as (...values: Array<any>) => R;
  }
  if (observables.length === 1 && isArray(observables[0])) {
    observables = observables[0] as any;
  }

  return fromArray(observables, scheduler).lift(
    new CombineLatestOperator<Sourced<O>, R>(resultSelector)
  );
}

export class CombineLatestOperator<T, R> implements Operator<T, R> {
  constructor(private resultSelector?: (...values: Array<any>) => R) {}

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(
      new CombineLatestSubscriber(subscriber, this.resultSelector)
    );
  }
}

export class CombineLatestSubscriber<T, R> extends ReactorSubscriber<T, R> {
  private active: number = 0;
  private values: any[] = [];
  private observables: any[] = [];
  private toRespond: number | undefined;

  constructor(
    destination: Subscriber<R>,
    private resultSelector?: (...values: Array<any>) => R
  ) {
    super(destination);
  }

  protected _next(observable: any) {
    this.values.push(NONE);
    this.observables.push(observable);
  }

  protected _complete() {
    const observables = this.observables;
    const len = observables.length;
    if (len === 0) {
      this.destination.complete();
    } else {
      this.active = len;
      this.toRespond = len;
      for (let i = 0; i < len; i++) {
        const observable = observables[i];
        this.add(subscribeToResult(this, observable, observable, i));
      }
    }
  }

  notifyComplete(unused: Subscriber<R>): void {
    if ((this.active -= 1) === 0) {
      this.destination.complete();
    }
  }

  reactNext(
    outerN: T,
    innerValue: R,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    const values = this.values;
    const oldVal = values[outerX];
    const toRespond = !this.toRespond
      ? 0
      : oldVal === NONE
      ? --this.toRespond
      : this.toRespond;
    values[outerX] = innerValue;

    if (toRespond === 0) {
      if (this.resultSelector) {
        this._tryResultSelector(values);
      } else {
        this.destination.next(values.slice());
      }
    }
  }

  private _tryResultSelector(values: any[]) {
    let result: any;
    try {
      result = this.resultSelector!.apply(this, values);
    } catch (err) {
      this.destination.error(err);
      return;
    }
    this.destination.next(result);
  }
}

export function concat<A extends SourceInput<any>[]>(
  ...observables: A
): Observable<SourcedFrom<A>>;
export function concat<O extends SourceInput<any>>(
  ...observables: Array<O | SchedulerLike>
): Observable<Sourced<O>> {
  // The cast with `as` below is due to the SchedulerLike, once this is removed, it will no longer be a problem.
  return concatAll<Sourced<O>>()(of(...observables) as Observable<Sourced<O>>);
}

export function defer<R extends SourceInput<any> | void>(
  observableFactory: () => R
): Observable<Sourced<R>> {
  return new Observable<Sourced<R>>(subscriber => {
    let input: R | void;
    try {
      input = observableFactory();
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }
    const source = input ? from(input as SourceInput<Sourced<R>>) : EMPTY;
    return source.subscribe(subscriber);
  });
}

export const EMPTY = new Observable<never>(subscriber => subscriber.complete());

export function empty(scheduler?: SchedulerLike) {
  return scheduler ? emptyScheduled(scheduler) : EMPTY;
}

function emptyScheduled(scheduler: SchedulerLike) {
  return new Observable<never>(subscriber =>
    scheduler.schedule(() => subscriber.complete())
  );
}

export function forkJoin<A>(sources: [SourceInput<A>]): Observable<[A]>;
export function forkJoin<A, B>(
  sources: [SourceInput<A>, SourceInput<B>]
): Observable<[A, B]>;
export function forkJoin<A, B, C>(
  sources: [SourceInput<A>, SourceInput<B>, SourceInput<C>]
): Observable<[A, B, C]>;
export function forkJoin<A, B, C, D>(
  sources: [SourceInput<A>, SourceInput<B>, SourceInput<C>, SourceInput<D>]
): Observable<[A, B, C, D]>;
export function forkJoin<A, B, C, D, E>(
  sources: [
    SourceInput<A>,
    SourceInput<B>,
    SourceInput<C>,
    SourceInput<D>,
    SourceInput<E>
  ]
): Observable<[A, B, C, D, E]>;
export function forkJoin<A, B, C, D, E, F>(
  sources: [
    SourceInput<A>,
    SourceInput<B>,
    SourceInput<C>,
    SourceInput<D>,
    SourceInput<E>,
    SourceInput<F>
  ]
): Observable<[A, B, C, D, E, F]>;
export function forkJoin<A extends SourceInput<any>[]>(
  sources: A
): Observable<SourcedFrom<A>[]>;
export function forkJoin(sourcesObject: {}): Observable<never>;
export function forkJoin<T, K extends keyof T>(
  sourcesObject: T
): Observable<{[K in keyof T]: Sourced<T[K]>}>;
export function forkJoin(...sources: any[]): Observable<any> {
  if (sources.length === 1) {
    const first = sources[0];
    if (isArray(first)) {
      return forkJoinInternal(first, null);
    }
    if (isObject(first) && Object.getPrototypeOf(first) === Object.prototype) {
      const keys = Object.keys(first);
      return forkJoinInternal(
        keys.map(key => first[key]),
        keys
      );
    }
  }
  if (typeof sources[sources.length - 1] === 'function') {
    const resultSelector = sources.pop() as Function;
    sources =
      sources.length === 1 && isArray(sources[0]) ? sources[0] : sources;
    return forkJoinInternal(sources, null).pipe(
      map((args: any[]) => resultSelector(...args))
    );
  }
  return forkJoinInternal(sources, null);
}

function forkJoinInternal(
  sources: SourceInput<any>[],
  keys: string[] | null
): Observable<any> {
  return new Observable(subscriber => {
    const len = sources.length;
    if (len === 0) {
      subscriber.complete();
      return;
    }
    const values = new Array(len);
    let completed = 0;
    let emitted = 0;
    for (let i = 0; i < len; i++) {
      const source = from(sources[i]);
      let hasValue = false;
      subscriber.add(
        source.subscribe({
          next: value => {
            if (!hasValue) {
              hasValue = true;
              emitted++;
            }
            values[i] = value;
          },
          error: err => subscriber.error(err),
          complete: () => {
            completed++;
            if (completed === len || !hasValue) {
              if (emitted === len) {
                subscriber.next(
                  keys
                    ? keys.reduce(
                        (result, key, i) => (
                          ((result as any)[key] = values[i]), result
                        ),
                        {}
                      )
                    : values
                );
              }
              subscriber.complete();
            }
          }
        })
      );
    }
  });
}

export function from<O extends SourceInput<any>>(
  input: O
): Observable<Sourced<O>>;
export function from<T>(
  input: SourceInput<T>,
  scheduler?: SchedulerLike
): Observable<T> {
  if (!scheduler) {
    if (input instanceof Observable) {
      return input;
    }
    return new Observable<T>(subscribeTo(input));
  } else {
    return scheduled(input, scheduler);
  }
}

export function fromArray<T>(input: ArrayLike<T>, scheduler?: SchedulerLike) {
  if (!scheduler) {
    return new Observable<T>(subscribeToArray(input));
  } else {
    return scheduleArray(input, scheduler);
  }
}

export interface NodeStyleEventEmitter {
  addListener: (eventName: string | symbol, handler: NodeEventHandler) => this;
  removeListener: (
    eventName: string | symbol,
    handler: NodeEventHandler
  ) => this;
}

export type NodeEventHandler = (...args: any[]) => void;

export interface NodeCompatibleEventEmitter {
  addListener: (eventName: string, handler: NodeEventHandler) => void | {};
  removeListener: (eventName: string, handler: NodeEventHandler) => void | {};
}

export interface JQueryStyleEventEmitter {
  on: (eventName: string, handler: Function) => void;
  off: (eventName: string, handler: Function) => void;
}

export interface HasEventTargetAddRemove<E> {
  addEventListener(
    type: string,
    listener: ((evt: E) => void) | null,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener?: ((evt: E) => void) | null,
    options?: EventListenerOptions | boolean
  ): void;
}

export type EventTargetLike<T> =
  | HasEventTargetAddRemove<T>
  | NodeStyleEventEmitter
  | NodeCompatibleEventEmitter
  | JQueryStyleEventEmitter;

export type FromEventTarget<T> =
  | EventTargetLike<T>
  | ArrayLike<EventTargetLike<T>>;

export interface EventListenerOptions {
  capture?: boolean;
  passive?: boolean;
  once?: boolean;
}

export interface AddEventListenerOptions extends EventListenerOptions {
  once?: boolean;
  passive?: boolean;
}

export function fromEvent<T>(
  target: FromEventTarget<T>,
  eventName: string
): Observable<T>;
export function fromEvent<T>(
  target: FromEventTarget<T>,
  eventName: string,
  options?: EventListenerOptions
): Observable<T>;
export function fromEvent<T>(
  target: FromEventTarget<T>,
  eventName: string,
  options?: EventListenerOptions | ((...args: any[]) => T),
  resultSelector?: (...args: any[]) => T
): Observable<T> {
  if (isFunction(options)) {
    resultSelector = options;
    options = undefined;
  }
  if (resultSelector) {
    return fromEvent<T>(
      target,
      eventName,
      options as EventListenerOptions | undefined
    ).pipe(
      map(args =>
        isArray(args) ? resultSelector!(...args) : resultSelector!(args)
      )
    );
  }

  return new Observable<T>(subscriber => {
    function handler(e: T) {
      if (arguments.length > 1) {
        subscriber.next(Array.prototype.slice.call(arguments) as any);
      } else {
        subscriber.next(e);
      }
    }
    setupSubscription(
      target,
      eventName,
      handler,
      subscriber,
      options as EventListenerOptions
    );
  });
}

function setupSubscription<T>(
  sourceObj: FromEventTarget<T>,
  eventName: string,
  handler: (...args: any[]) => void,
  subscriber: Subscriber<T>,
  options?: EventListenerOptions
) {
  let unsubscribe: (() => void) | undefined;
  if (isEventTarget(sourceObj)) {
    const source = sourceObj;
    sourceObj.addEventListener(eventName, handler, options);
    unsubscribe = () => source.removeEventListener(eventName, handler, options);
  } else if (isJQueryStyleEventEmitter(sourceObj)) {
    const source = sourceObj;
    sourceObj.on(eventName, handler);
    unsubscribe = () => source.off(eventName, handler);
  } else if (isNodeStyleEventEmitter(sourceObj)) {
    const source = sourceObj;
    sourceObj.addListener(eventName, handler as NodeEventHandler);
    unsubscribe = () =>
      source.removeListener(eventName, handler as NodeEventHandler);
  } else if (sourceObj && (sourceObj as any).length) {
    for (let i = 0, len = (sourceObj as any).length; i < len; i++) {
      setupSubscription(
        (sourceObj as any)[i],
        eventName,
        handler,
        subscriber,
        options
      );
    }
  } else {
    throw new TypeError('Invalid event target');
  }

  subscriber.add(unsubscribe);
}

function isNodeStyleEventEmitter(
  sourceObj: any
): sourceObj is NodeStyleEventEmitter {
  return (
    sourceObj &&
    typeof sourceObj.addListener === 'function' &&
    typeof sourceObj.removeListener === 'function'
  );
}

function isJQueryStyleEventEmitter(
  sourceObj: any
): sourceObj is JQueryStyleEventEmitter {
  return (
    sourceObj &&
    typeof sourceObj.on === 'function' &&
    typeof sourceObj.off === 'function'
  );
}

function isEventTarget(
  sourceObj: any
): sourceObj is HasEventTargetAddRemove<any> {
  return (
    sourceObj &&
    typeof sourceObj.addEventListener === 'function' &&
    typeof sourceObj.removeEventListener === 'function'
  );
}

export function fromEventPattern<T>(
  addHandler: (handler: NodeEventHandler) => any,
  removeHandler?: (handler: NodeEventHandler, signal?: any) => void
): Observable<T>;
export function fromEventPattern<T>(
  addHandler: (handler: NodeEventHandler) => any,
  removeHandler?: (handler: NodeEventHandler, signal?: any) => void,
  resultSelector?: (...args: any[]) => T
): Observable<T | T[]> {
  if (resultSelector) {
    // DEPRECATED PATH
    return fromEventPattern<T>(addHandler, removeHandler).pipe(
      map(args =>
        isArray(args) ? resultSelector(...args) : resultSelector(args)
      )
    );
  }
  return new Observable<T | T[]>(subscriber => {
    const handler = (...e: T[]) => subscriber.next(e.length === 1 ? e[0] : e);
    let retValue: any;
    try {
      retValue = addHandler(handler);
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }

    if (!isFunction(removeHandler)) {
      return undefined;
    }

    return () => removeHandler(handler, retValue);
  });
}

export function fromIterable<T>(input: Iterable<T>, scheduler?: SchedulerLike) {
  if (!input) {
    throw new Error('Iterable cannot be null');
  }
  if (!scheduler) {
    return new Observable<T>(subscribeToIterable(input));
  } else {
    return scheduleIterable(input, scheduler);
  }
}

export function fromObservable<T>(
  input: InteropObservable<T>,
  scheduler?: SchedulerLike
) {
  if (!scheduler) {
    return new Observable<T>(subscribeToObservable(input));
  } else {
    return scheduleObservable(input, scheduler);
  }
}

export function fromPromise<T>(
  input: PromiseLike<T>,
  scheduler?: SchedulerLike
) {
  if (!scheduler) {
    return new Observable<T>(subscribeToPromise(input));
  } else {
    return schedulePromise(input, scheduler);
  }
}

export type ConditionFunc<S> = (state: S) => boolean;
export type IterateFunc<S> = (state: S) => S;
export type ResultFunc<S, T> = (state: S) => T;

interface SchedulerState<T, S> {
  needIterate?: boolean;
  state: S;
  subscriber: Subscriber<T>;
  condition?: ConditionFunc<S>;
  iterate: IterateFunc<S>;
  resultSelector: ResultFunc<S, T>;
}

export interface GenerateBaseOptions<S> {
  initialState: S;
  condition?: ConditionFunc<S>;
  iterate: IterateFunc<S>;
  scheduler?: SchedulerLike;
}

export interface GenerateOptions<T, S> extends GenerateBaseOptions<S> {
  resultSelector: ResultFunc<S, T>;
}

export function generate<T, S>(
  initialState: S,
  condition: ConditionFunc<S>,
  iterate: IterateFunc<S>,
  resultSelector: ResultFunc<S, T>,
  scheduler?: SchedulerLike
): Observable<T>;
export function generate<S>(
  initialState: S,
  condition: ConditionFunc<S>,
  iterate: IterateFunc<S>,
  scheduler?: SchedulerLike
): Observable<S>;
export function generate<S>(options: GenerateBaseOptions<S>): Observable<S>;
export function generate<T, S>(options: GenerateOptions<T, S>): Observable<T>;
export function generate<T, S>(
  initialStateOrOptions: S | GenerateOptions<T, S>,
  condition?: ConditionFunc<S>,
  iterate?: IterateFunc<S>,
  resultSelectorOrScheduler?: ResultFunc<S, T> | SchedulerLike,
  scheduler?: SchedulerLike
): Observable<T> {
  let resultSelector: ResultFunc<S, T>;
  let initialState: S;

  if (arguments.length == 1) {
    const options = initialStateOrOptions as GenerateOptions<T, S>;
    initialState = options.initialState;
    condition = options.condition;
    iterate = options.iterate;
    resultSelector = options.resultSelector || (identity as ResultFunc<S, T>);
    scheduler = options.scheduler;
  } else if (
    resultSelectorOrScheduler === undefined ||
    isScheduler(resultSelectorOrScheduler)
  ) {
    initialState = initialStateOrOptions as S;
    resultSelector = identity as ResultFunc<S, T>;
    scheduler = resultSelectorOrScheduler as SchedulerLike;
  } else {
    initialState = initialStateOrOptions as S;
    resultSelector = resultSelectorOrScheduler as ResultFunc<S, T>;
  }

  return new Observable<T>(subscriber => {
    let state = initialState;
    if (scheduler) {
      return scheduler.schedule<SchedulerState<T, S>>(dispatch as any, 0, {
        subscriber,
        iterate: iterate!,
        condition,
        resultSelector,
        state
      });
    }

    do {
      if (condition) {
        let conditionResult: boolean;
        try {
          conditionResult = condition(state);
        } catch (err) {
          subscriber.error(err);
          return undefined;
        }
        if (!conditionResult) {
          subscriber.complete();
          break;
        }
      }
      let value: T;
      try {
        value = resultSelector(state);
      } catch (err) {
        subscriber.error(err);
        return undefined;
      }
      subscriber.next(value);
      if (subscriber.closed) {
        break;
      }
      try {
        state = iterate!(state);
      } catch (err) {
        subscriber.error(err);
        return undefined;
      }
    } while (true);

    return undefined;
  });
}

function dispatch<T, S>(
  this: SchedulerAction<SchedulerState<T, S>>,
  state: SchedulerState<T, S>
) {
  const {subscriber, condition} = state;
  if (subscriber.closed) {
    return undefined;
  }
  if (state.needIterate) {
    try {
      state.state = state.iterate(state.state);
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }
  } else {
    state.needIterate = true;
  }
  if (condition) {
    let conditionResult: boolean;
    try {
      conditionResult = condition(state.state);
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }
    if (!conditionResult) {
      subscriber.complete();
      return undefined;
    }
    if (subscriber.closed) {
      return undefined;
    }
  }
  let value: T;
  try {
    value = state.resultSelector(state.state);
  } catch (err) {
    subscriber.error(err);
    return undefined;
  }
  if (subscriber.closed) {
    return undefined;
  }
  subscriber.next(value);
  if (subscriber.closed) {
    return undefined;
  }
  return this.schedule(state);
}

export function iif<T = never, F = never>(
  condition: () => boolean,
  trueResult: SubscribableOrPromise<T> = EMPTY,
  falseResult: SubscribableOrPromise<F> = EMPTY
): Observable<T | F> {
  return defer(() => (condition() ? trueResult : falseResult));
}

export function interval(
  period = 0,
  scheduler: SchedulerLike = async
): Observable<number> {
  if (!isNumeric(period) || period < 0) {
    period = 0;
  }

  if (!scheduler || typeof scheduler.schedule !== 'function') {
    scheduler = async;
  }

  return new Observable<number>(subscriber => {
    subscriber.add(
      scheduler.schedule(dispatch as any, period, {
        subscriber,
        counter: 0,
        period
      })
    );
    return subscriber;
  });
}

function dispatch(this: SchedulerAction<IntervalState>, state: IntervalState) {
  const {subscriber, counter, period} = state;
  subscriber.next(counter);
  this.schedule({subscriber, counter: counter + 1, period}, period);
}

interface IntervalState {
  subscriber: Subscriber<number>;
  counter: number;
  period: number;
}

export function merge<T>(v1: SourceInput<T>): Observable<T>;
export function merge<T>(
  v1: SourceInput<T>,
  concurrent?: number
): Observable<T>;
export function merge<T, T2>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>
): Observable<T | T2>;
export function merge<T, T2>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>,
  concurrent?: number
): Observable<T | T2>;
export function merge<T, T2, T3>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>,
  v3: SourceInput<T3>
): Observable<T | T2 | T3>;
export function merge<T, T2, T3>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  concurrent?: number
): Observable<T | T2 | T3>;
export function merge<T, T2, T3, T4>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>
): Observable<T | T2 | T3 | T4>;
export function merge<T, T2, T3, T4>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>,
  concurrent?: number
): Observable<T | T2 | T3 | T4>;
export function merge<T, T2, T3, T4, T5>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>,
  v5: SourceInput<T5>
): Observable<T | T2 | T3 | T4 | T5>;
export function merge<T, T2, T3, T4, T5>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>,
  v5: SourceInput<T5>,
  concurrent?: number
): Observable<T | T2 | T3 | T4 | T5>;
export function merge<T, T2, T3, T4, T5, T6>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>,
  v5: SourceInput<T5>,
  v6: SourceInput<T6>
): Observable<T | T2 | T3 | T4 | T5 | T6>;
export function merge<T, T2, T3, T4, T5, T6>(
  v1: SourceInput<T>,
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>,
  v5: SourceInput<T5>,
  v6: SourceInput<T6>,
  concurrent?: number
): Observable<T | T2 | T3 | T4 | T5 | T6>;
export function merge<T>(
  ...observables: (SourceInput<T> | number)[]
): Observable<T>;
export function merge<T, R>(
  ...observables: (SourceInput<any> | number)[]
): Observable<R>;
export function merge<T, R>(
  ...observables: Array<SourceInput<any> | SchedulerLike | number | undefined>
): Observable<R> {
  let concurrent = Number.POSITIVE_INFINITY;
  let scheduler: SchedulerLike | undefined = undefined;
  let last: any = observables[observables.length - 1];
  if (isScheduler(last)) {
    scheduler = <SchedulerLike>observables.pop();
    if (
      observables.length > 1 &&
      typeof observables[observables.length - 1] === 'number'
    ) {
      concurrent = <number>observables.pop();
    }
  } else if (typeof last === 'number') {
    concurrent = <number>observables.pop();
  }

  if (
    !scheduler &&
    observables.length === 1 &&
    observables[0] instanceof Observable
  ) {
    return <Observable<R>>observables[0];
  }

  return mergeAll<R>(concurrent)(fromArray<any>(observables, scheduler));
}

export const NEVER = new Observable<never>(noop);

export function of(): Observable<never>;
export function of<T>(value: T): Observable<T>;
export function of<T, U>(value1: T, value2: U): Observable<T | U>;
export function of<T, U, V>(
  value1: T,
  value2: U,
  value3: V
): Observable<T | U | V>;
export function of<A extends Array<any>>(
  ...args: A
): Observable<ValueFromArray<A>>;
export function of<T>(...args: Array<T | SchedulerLike>): Observable<T> {
  let scheduler = args[args.length - 1] as SchedulerLike;
  if (isScheduler(scheduler)) {
    args.pop();
    return scheduleArray(args as T[], scheduler);
  } else {
    return fromArray(args as T[]);
  }
}

export function onErrorResumeNext<R>(v: SourceInput<R>): Observable<R>;
export function onErrorResumeNext<T2, T3, R>(
  v2: SourceInput<T2>,
  v3: SourceInput<T3>
): Observable<R>;
export function onErrorResumeNext<T2, T3, T4, R>(
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>
): Observable<R>;
export function onErrorResumeNext<T2, T3, T4, T5, R>(
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>,
  v5: SourceInput<T5>
): Observable<R>;
export function onErrorResumeNext<T2, T3, T4, T5, T6, R>(
  v2: SourceInput<T2>,
  v3: SourceInput<T3>,
  v4: SourceInput<T4>,
  v5: SourceInput<T5>,
  v6: SourceInput<T6>
): Observable<R>;

export function onErrorResumeNext<R>(
  ...observables: Array<SourceInput<any> | ((...values: Array<any>) => R)>
): Observable<R>;
export function onErrorResumeNext<R>(array: SourceInput<any>[]): Observable<R>;
export function onErrorResumeNext<T, R>(
  ...sources: Array<
    SourceInput<any> | Array<SourceInput<any>> | ((...values: Array<any>) => R)
  >
): Observable<R> {
  if (sources.length === 0) {
    return EMPTY;
  }

  const [first, ...remainder] = sources;

  if (sources.length === 1 && isArray(first)) {
    return onErrorResumeNext(...first);
  }

  return new Observable(subscriber => {
    const subNext = () =>
      subscriber.add(onErrorResumeNext(...remainder).subscribe(subscriber));

    return from(first).subscribe({
      next(value) {
        subscriber.next(value);
      },
      error: subNext,
      complete: subNext
    });
  });
}

export function pairs<T>(
  obj: Object,
  scheduler?: SchedulerLike
): Observable<[string, T]> {
  if (!scheduler) {
    return new Observable<[string, T]>(subscriber => {
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length && !subscriber.closed; i++) {
        const key = keys[i];
        if (obj.hasOwnProperty(key)) {
          subscriber.next([key, (obj as any)[key]]);
        }
      }
      subscriber.complete();
    });
  } else {
    return new Observable<[string, T]>(subscriber => {
      const keys = Object.keys(obj);
      const subscription = new Subscription();
      subscription.add(
        scheduler.schedule<{
          keys: string[];
          index: number;
          subscriber: Subscriber<[string, T]>;
          subscription: Subscription;
          obj: Object;
        }>(dispatch as any, 0, {keys, index: 0, subscriber, subscription, obj})
      );
      return subscription;
    });
  }
}

export function dispatch<T>(
  this: SchedulerAction<any>,
  state: {
    keys: string[];
    index: number;
    subscriber: Subscriber<[string, T]>;
    subscription: Subscription;
    obj: Object;
  }
) {
  const {keys, index, subscriber, subscription, obj} = state;
  if (!subscriber.closed) {
    if (index < keys.length) {
      const key = keys[index];
      subscriber.next([key, (obj as any)[key]]);
      subscription.add(
        this.schedule({keys, index: index + 1, subscriber, subscription, obj})
      );
    } else {
      subscriber.complete();
    }
  }
}

export function partition<T>(
  source: SourceInput<T>,
  predicate: (value: T, index: number) => boolean,
  thisArg?: any
): [Observable<T>, Observable<T>] {
  return [
    filter(predicate, thisArg)(new Observable<T>(subscribeTo(source))),
    filter(not(predicate, thisArg) as any)(
      new Observable<T>(subscribeTo(source))
    )
  ] as [Observable<T>, Observable<T>];
}

export function race<A extends SourceInput<any>[]>(
  observables: A
): Observable<SourcedFrom<A>>;
export function race<A extends SourceInput<any>[]>(
  ...observables: A
): Observable<SourcedFrom<A>>;
export function race<T>(
  ...observables: (SourceInput<T> | SourceInput<T>[])[]
): Observable<any> {
  if (observables.length === 1) {
    if (isArray(observables[0])) {
      observables = observables[0] as SourceInput<T>[];
    } else {
      return from(observables[0] as SourceInput<T>);
    }
  }

  return fromArray(observables, undefined).lift(new RaceOperator<T>());
}

export class RaceOperator<T> implements Operator<T, T> {
  call(subscriber: Subscriber<T>, source: any): Closer {
    return source.subscribe(new RaceSubscriber(subscriber));
  }
}

export class RaceSubscriber<T> extends ReactorSubscriber<T, T> {
  private hasFirst: boolean = false;
  private observables: Observable<any>[] = [];
  private subscriptions: Subscription[] = [];

  constructor(destination: Subscriber<T>) {
    super(destination);
  }

  protected _next(observable: any): void {
    this.observables.push(observable);
  }

  protected _complete() {
    const observables = this.observables;
    const len = observables.length;

    if (len === 0) {
      this.destination.complete();
    } else {
      for (let i = 0; i < len && !this.hasFirst; i++) {
        let observable = observables[i];
        let subscription = subscribeToResult(
          this,
          observable,
          observable as any,
          i
        );

        if (this.subscriptions) {
          this.subscriptions.push(subscription!);
        }
        this.add(subscription);
      }
      this.observables = null!;
    }
  }

  reactNext(
    outerN: T,
    innerValue: T,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, T>
  ): void {
    if (!this.hasFirst) {
      this.hasFirst = true;

      for (let i = 0; i < this.subscriptions.length; i++) {
        if (i !== outerX) {
          let subscription = this.subscriptions[i];

          subscription.unsubscribe();
          this.remove(subscription);
        }
      }

      this.subscriptions = null!;
    }

    this.destination.next(innerValue);
  }

  notifyComplete(innerSub: ActorSubscriber<T, T>): void {
    this.hasFirst = true;
    super.notifyComplete(innerSub);
  }

  notifyError(error: any, innerSub: ActorSubscriber<T, T>): void {
    this.hasFirst = true;
    super.notifyError(error, innerSub);
  }
}

export function range(
  start: number = 0,
  count?: number,
  scheduler?: SchedulerLike
): Observable<number> {
  return new Observable<number>(subscriber => {
    if (count === undefined) {
      count = start;
      start = 0;
    }

    let index = 0;
    let current = start;

    if (scheduler) {
      return scheduler.schedule(dispatch, 0, {
        index,
        count,
        start,
        subscriber
      });
    } else {
      do {
        if (index++ >= count) {
          subscriber.complete();
          break;
        }
        subscriber.next(current++);
        if (subscriber.closed) {
          break;
        }
      } while (true);
    }

    return undefined;
  });
}

/** @internal */
export function dispatch(this: SchedulerAction<any>, state: any) {
  const {start, index, count, subscriber} = state;

  if (index >= count) {
    subscriber.complete();
    return;
  }

  subscriber.next(start);

  if (subscriber.closed) {
    return;
  }

  state.index = index + 1;
  state.start = start + 1;

  this.schedule(state);
}

export function throwError(
  error: any,
  scheduler?: SchedulerLike
): Observable<never> {
  if (!scheduler) {
    return new Observable(subscriber => subscriber.error(error));
  } else {
    return new Observable(subscriber =>
      scheduler.schedule(dispatch as any, 0, {error, subscriber})
    );
  }
}

interface DispatchArg {
  error: any;
  subscriber: Subscriber<any>;
}

function dispatch({error, subscriber}: DispatchArg) {
  subscriber.error(error);
}

export function timer(
  dueTime: number | Date = 0,
  periodOrScheduler?: number | SchedulerLike,
  scheduler?: SchedulerLike
): Observable<number> {
  let period = -1;
  if (isNumeric(periodOrScheduler)) {
    period = (Number(periodOrScheduler) < 1 && 1) || Number(periodOrScheduler);
  } else if (isScheduler(periodOrScheduler)) {
    scheduler = periodOrScheduler as any;
  }

  if (!isScheduler(scheduler)) {
    scheduler = async;
  }

  return new Observable(subscriber => {
    const due = isNumeric(dueTime)
      ? (dueTime as number)
      : +dueTime - scheduler!.now();

    return scheduler!.schedule(dispatch as any, due, {
      index: 0,
      period,
      subscriber
    });
  });
}

interface TimerState {
  index: number;
  period: number;
  subscriber: Subscriber<number>;
}

function dispatch(this: SchedulerAction<TimerState>, state: TimerState) {
  const {index, period, subscriber} = state;
  subscriber.next(index);

  if (subscriber.closed) {
    return;
  } else if (period === -1) {
    return subscriber.complete();
  }

  state.index = index + 1;
  this.schedule(state, period);
}

export function using<T>(
  resourceFactory: () => Unsubscriber | void,
  observableFactory: (resource: Unsubscriber | void) => SourceInput<T> | void
): Observable<T> {
  return new Observable<T>(subscriber => {
    let resource: Unsubscriber | void;

    try {
      resource = resourceFactory();
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }

    let result: SourceInput<T> | void;
    try {
      result = observableFactory(resource);
    } catch (err) {
      subscriber.error(err);
      return undefined;
    }

    const source = result ? from(result) : EMPTY;
    const subscription = source.subscribe(subscriber);
    return () => {
      subscription.unsubscribe();
      if (resource) {
        resource.unsubscribe();
      }
    };
  });
}

export function zip<O1 extends SourceInput<any>, O2 extends SourceInput<any>>(
  v1: O1,
  v2: O2
): Observable<[Sourced<O1>, Sourced<O2>]>;
export function zip<
  O1 extends SourceInput<any>,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>
>(v1: O1, v2: O2, v3: O3): Observable<[Sourced<O1>, Sourced<O2>, Sourced<O3>]>;
export function zip<
  O1 extends SourceInput<any>,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>
>(
  v1: O1,
  v2: O2,
  v3: O3,
  v4: O4
): Observable<[Sourced<O1>, Sourced<O2>, Sourced<O3>, Sourced<O4>]>;
export function zip<
  O1 extends SourceInput<any>,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>
>(
  v1: O1,
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5
): Observable<
  [Sourced<O1>, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>]
>;
export function zip<
  O1 extends SourceInput<any>,
  O2 extends SourceInput<any>,
  O3 extends SourceInput<any>,
  O4 extends SourceInput<any>,
  O5 extends SourceInput<any>,
  O6 extends SourceInput<any>
>(
  v1: O1,
  v2: O2,
  v3: O3,
  v4: O4,
  v5: O5,
  v6: O6
): Observable<
  [Sourced<O1>, Sourced<O2>, Sourced<O3>, Sourced<O4>, Sourced<O5>, Sourced<O6>]
>;
export function zip<O extends SourceInput<any>>(
  array: O[]
): Observable<Sourced<O>[]>;
export function zip<R>(array: SourceInput<any>[]): Observable<R>;
export function zip<O extends SourceInput<any>>(
  ...observables: O[]
): Observable<Sourced<O>[]>;
export function zip<O extends SourceInput<any>, R>(
  ...observables: Array<O | ((...values: Sourced<O>[]) => R)>
): Observable<R>;
export function zip<R>(
  ...observables: Array<SourceInput<any> | ((...values: Array<any>) => R)>
): Observable<R>;
export function zip<O extends SourceInput<any>, R>(
  ...observables: Array<O | ((...values: Sourced<O>[]) => R)>
): Observable<Sourced<O>[] | R> {
  const last = observables[observables.length - 1];
  let resultSelector: ((...ys: Array<any>) => R) | undefined = undefined;
  if (typeof last === 'function') {
    resultSelector = observables.pop() as typeof resultSelector;
  }
  return fromArray(observables, undefined).lift(
    new ZipOperator(resultSelector)
  );
}

export class ZipOperator<T, R> implements Operator<T, R> {
  resultSelector?: (...values: Array<any>) => R;

  constructor(resultSelector?: (...values: Array<any>) => R) {
    this.resultSelector = resultSelector;
  }

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new ZipSubscriber(subscriber, this.resultSelector));
  }
}

export class ZipSubscriber<T, R> extends Subscriber<T> {
  private values: any;
  private resultSelector?: (...values: Array<any>) => R;
  private iterators: LookAheadIterator<any>[] = [];
  private active = 0;

  constructor(
    destination: Subscriber<R>,
    resultSelector?: (...values: Array<any>) => R,
    values: any = Object.create(null)
  ) {
    super(destination);
    this.resultSelector = resultSelector;
    this.values = values;
  }

  protected _next(value: any) {
    const iterators = this.iterators;
    if (isArray(value)) {
      iterators.push(new StaticArrayIterator(value));
    } else if (typeof value[Symbol.iterator] === 'function') {
      iterators.push(new StaticIterator(value[Symbol.iterator]()));
    } else {
      iterators.push(new ZipBufferIterator(this.destination, this, value));
    }
  }

  protected _complete() {
    const iterators = this.iterators;
    const len = iterators.length;

    this.unsubscribe();

    if (len === 0) {
      this.destination.complete();
      return;
    }

    this.active = len;
    for (let i = 0; i < len; i++) {
      let iterator: ZipBufferIterator<any, any> = <any>iterators[i];
      if (iterator.stillUnsubscribed) {
        const destination = this.destination as Subscription;
        destination.add(iterator.subscribe(iterator, i));
      } else {
        this.active--; // not an observable
      }
    }
  }

  notifyInactive() {
    this.active--;
    if (this.active === 0) {
      this.destination.complete();
    }
  }

  checkIterators() {
    const iterators = this.iterators;
    const len = iterators.length;
    const destination = this.destination;
    for (let i = 0; i < len; i++) {
      let iterator = iterators[i];
      if (typeof iterator.hasValue === 'function' && !iterator.hasValue()) {
        return;
      }
    }

    let shouldComplete = false;
    const args: any[] = [];
    for (let i = 0; i < len; i++) {
      let iterator = iterators[i];
      let result = iterator.next();
      if (iterator.hasCompleted()) {
        shouldComplete = true;
      }

      if (result.done) {
        destination.complete();
        return;
      }

      args.push(result.value);
    }

    if (this.resultSelector) {
      this._tryresultSelector(args);
    } else {
      destination.next(args);
    }

    if (shouldComplete) {
      destination.complete();
    }
  }

  protected _tryresultSelector(args: any[]) {
    let result: any;
    try {
      result = this.resultSelector!.apply(this, args);
    } catch (err) {
      this.destination.error(err);
      return;
    }
    this.destination.next(result);
  }
}

interface LookAheadIterator<T> extends Iterator<T> {
  hasValue(): boolean;
  hasCompleted(): boolean;
}

class StaticIterator<T> implements LookAheadIterator<T> {
  private nextResult: IteratorResult<T>;

  constructor(private iterator: Iterator<T>) {
    this.nextResult = iterator.next();
  }

  hasValue() {
    return true;
  }

  next(): IteratorResult<T> {
    const result = this.nextResult;
    this.nextResult = this.iterator.next();
    return result;
  }

  hasCompleted() {
    const nextResult = this.nextResult;
    return nextResult && !!nextResult.done;
  }
}

class StaticArrayIterator<T> implements LookAheadIterator<T> {
  private index = 0;
  private length = 0;

  constructor(private array: T[]) {
    this.length = array.length;
  }

  [Symbol.iterator]() {
    return this;
  }

  next(value?: any): IteratorResult<T> {
    const i = this.index++;
    const array = this.array;
    return i < this.length
      ? {value: array[i], done: false}
      : {value: null, done: true};
  }

  hasValue() {
    return this.array.length > this.index;
  }

  hasCompleted() {
    return this.array.length === this.index;
  }
}

class ZipBufferIterator<T, R> extends ReactorSubscriber<T, R>
  implements LookAheadIterator<T> {
  stillUnsubscribed = true;
  buffer: T[] = [];
  isComplete = false;

  constructor(
    destination: Target<T>,
    private parent: ZipSubscriber<T, R>,
    private observable: Observable<T>
  ) {
    super(destination);
  }

  [Symbol.iterator]() {
    return this;
  }
  // NOTE: there is actually a name collision here with Subscriber.next and Iterator.next
  //    this is legit because `next()` will never be called by a subscription in this case.
  next(): IteratorResult<T> {
    const buffer = this.buffer;
    if (buffer.length === 0 && this.isComplete) {
      return {value: null, done: true};
    } else {
      return {value: buffer.shift()!, done: false};
    }
  }

  hasValue() {
    return this.buffer.length > 0;
  }

  hasCompleted() {
    return this.buffer.length === 0 && this.isComplete;
  }

  notifyComplete() {
    if (this.buffer.length > 0) {
      this.isComplete = true;
      this.parent.notifyInactive();
    } else {
      this.destination.complete();
    }
  }

  reactNext(
    outerN: T,
    innerValue: any,
    outerX: number,
    innerIndex: number,
    innerSub: ActorSubscriber<T, R>
  ): void {
    this.buffer.push(innerValue);
    this.parent.checkIterators();
  }

  subscribe(value: any, index: number) {
    return subscribeToResult<any, any>(this, this.observable, this, index);
  }
}
