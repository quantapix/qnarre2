import * as qt from './types';
import * as qu from './utils';
import * as qs from './source';
import * as qj from './subject';
import * as qh from './scheduler';

export class SubscribeOnObservable<T> extends qs.Source<T> {
  static create<T>(
    source: qs.Source<T>,
    delay: number = 0,
    h: qh.Scheduler = qh.asap
  ): qs.Source<T> {
    return new SubscribeOnObservable(source, delay, h);
  }

  constructor(
    public source: qs.Source<T>,
    private delayTime: number = 0,
    private h: qh.Scheduler = qh.asap
  ) {
    super();
    if (!qu.isNumeric(delayTime) || delayTime < 0) this.delayTime = 0;
    if (!h || typeof h.schedule !== 'function') this.h = qh.asap;
  }

  _subscribe(r: qj.Subscriber<T>) {
    const delay = this.delayTime;
    function dispatch(this: qh.Action<T>, arg: DispatchArg<T>): qj.Subscription {
      const {s, r} = arg;
      return this.add(s.subscribe(r));
    }
    return this.h.schedule<DispatchArg<any>>(
      dispatch as any,
      {
        s: this.source,
        r
      },
      delay
    );
  }
}

interface DispatchState<T> {
  subscriber: qj.Subscriber<T>;
  context: any;
  params: ParamsState<T>;
}

interface ParamsState<T> {
  cb: Function;
  args: any[];
  scheduler: qh.Scheduler;
  subject: qj.Async<T>;
  context: any;
}

function dispatch<T>(this: qh.Action<DispatchState<T>>, state: DispatchState<T>) {
  const {params, subscriber, context} = state;
  const {cb, args, h} = params;
  let subject = params.subject;
  if (!subject) {
    subject = params.subject = new qj.Async<T>();
    const handler = (...innerArgs: any[]) => {
      const err = innerArgs.shift();
      if (err) {
        this.add(
          h.schedule<DispatchErrorArg<T>>(dispatchError as any, 0, {
            err,
            subject
          })
        );
      } else {
        const value = innerArgs.length <= 1 ? innerArgs[0] : innerArgs;
        this.add(
          h.schedule<DispatchNextArg<T>>(dispatchNext as any, 0, {
            value,
            subject
          })
        );
      }
    };
    try {
      cb.apply(context, [...args, handler]);
    } catch (err) {
      this.add(
        h.schedule<DispatchErrorArg<T>>(dispatchError as any, 0, {
          err,
          subject
        })
      );
    }
  }
  this.add(subject.subscribe(subscriber));
}

export function onErrorResumeNext<R>(v: qt.Input<R>): qs.Source<R>;
export function onErrorResumeNext<T2, T3, R>(
  v2: qt.Input<T2>,
  v3: qt.Input<T3>
): qs.Source<R>;
export function onErrorResumeNext<T2, T3, T4, R>(
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>
): qs.Source<R>;
export function onErrorResumeNext<T2, T3, T4, T5, R>(
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>,
  v5: qt.Input<T5>
): qs.Source<R>;
export function onErrorResumeNext<T2, T3, T4, T5, T6, R>(
  v2: qt.Input<T2>,
  v3: qt.Input<T3>,
  v4: qt.Input<T4>,
  v5: qt.Input<T5>,
  v6: qt.Input<T6>
): qs.Source<R>;
export function onErrorResumeNext<R>(
  ...observables: Array<qt.Input<any> | ((...values: Array<any>) => R)>
): qs.Source<R>;
export function onErrorResumeNext<R>(array: qt.Input<any>[]): qs.Source<R>;
export function onErrorResumeNext<T, R>(
  ...sources: Array<qt.Input<any> | Array<qt.Input<any>> | ((...values: Array<any>) => R)>
): qs.Source<R> {
  if (sources.length === 0) return EMPTY;
  const [first, ...remainder] = sources;
  if (sources.length === 1 && isArray(first)) return onErrorResumeNext(...first);
  return new qs.Source(subscriber => {
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
