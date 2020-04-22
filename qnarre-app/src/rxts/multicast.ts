import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';
import * as qh from './scheduler';

export function multicast<N>(
  subject: qt.Subject<N>
): qt.Mapper<qt.Source<N>, Connect<N>>;
export function multicast<T, O extends qt.Input<any>>(
  subject: qt.Subject<N>,
  selector: (shared: qt.Source<N>) => O
): qt.Mapper<qt.Source<N>, Connect<Sourced<O>>>;
export function multicast<N>(
  subjectFactory: (this: qt.Source<N>) => qt.Subject<N>
): qt.Mapper<qt.Source<N>, Connect<N>>;
export function multicast<T, O extends qt.Input<any>>(
  SubjectFactory: (this: qt.Source<N>) => qt.Subject<N>,
  selector: (shared: qt.Source<N>) => O
): qt.Lifter<T, Sourced<O>>;
export function multicast<T, R>(
  subjectOrSubjectFactory: qt.Subject<N> | (() => qt.Subject<N>),
  selector?: (source: qt.Source<N>) => qt.Source<R>
): qt.Lifter<T, R> {
  return function multicastLifter(source: qt.Source<N>): qt.Source<R> {
    let subjectFactory: () => qt.Subject<N>;
    if (typeof subjectOrSubjectFactory === 'function') {
      subjectFactory = <() => qt.Subject<N>>subjectOrSubjectFactory;
    } else {
      subjectFactory = function subjectFactory() {
        return <qt.Subject<N>>subjectOrSubjectFactory;
      };
    }
    if (typeof selector === 'function')
      return x.lift(new MulticastO(subjectFactory, selector));
    const connectable: any = Object.create(
      source,
      connectableObservableDescriptor
    );
    connectable.source = source;
    connectable.subjectFactory = subjectFactory;
    return <Connect<R>>connectable;
  };
}

export class MulticastO<T, R> implements qt.Operator<T, R> {
  constructor(
    private subjectFactory: () => qt.Subject<N>,
    private selector: (source: qt.Source<N>) => qt.Source<R>
  ) {}
  call(r: qt.Subscriber<R>, s: any): any {
    const {selector} = this;
    const subject = this.subjectFactory();
    const subscription = selector(subject).subscribe(r);
    subscription.add(s.subscribe(subject));
    return subscription;
  }
}

export function publish<N>(): qt.Mapper<qt.Source<N>, Connect<N>>;
export function publish<T, O extends qt.Input<any>>(
  selector: (shared: qt.Source<N>) => O
): qt.Lifter<T, Sourced<O>>;
export function publish<N>(selector: qt.Shifter<N>): qt.Shifter<N>;
export function publish<T, R>(
  selector?: qt.Lifter<T, R>
): qt.Shifter<N> | qt.Lifter<T, R> {
  return selector
    ? multicast(() => new qt.Subject<N>(), selector)
    : multicast(new qt.Subject<N>());
}

export function publishBehavior<N>(
  value: T
): qt.Mapper<qt.Source<N>, Connect<N>> {
  return x => multicast(new Behavior<N>(value))(x) as Connect<N>;
}

export function publishLast<N>(): qt.Mapper<qt.Source<N>, Connect<N>> {
  return x => multicast(new Async<N>())(x);
}

export function publishReplay<N>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.Shifter<N>;
export function publishReplay<T, O extends qt.Input<any>>(
  bufferSize?: number,
  windowTime?: number,
  selector?: (shared: qt.Source<N>) => O,
  scheduler?: qt.Scheduler
): qt.Lifter<T, Sourced<O>>;
export function publishReplay<T, R>(
  bufferSize?: number,
  windowTime?: number,
  selectorOrScheduler?: qt.Scheduler | qt.Lifter<T, R>,
  scheduler?: qt.Scheduler
): qt.Mapper<qt.Source<N>, Connect<R>> {
  if (selectorOrScheduler && typeof selectorOrScheduler !== 'function') {
    scheduler = selectorOrScheduler;
  }
  const selector =
    typeof selectorOrScheduler === 'function' ? selectorOrScheduler : undefined;
  const subject = new Replay<N>(bufferSize, windowTime, scheduler);
  return x => multicast(() => subject, selector!)(x) as Connect<R>;
}

function shareSubjectFactory() {
  return new qt.Subject<any>();
}

export function share<N>(): qt.Shifter<N> {
  return x => refCount()(multicast(shareSubjectFactory)(x)) as qt.Source<N>;
}

export interface ShareReplayConfig {
  bufferSize?: number;
  windowTime?: number;
  refCount: boolean;
  scheduler?: qt.Scheduler;
}

export function shareReplay<N>(config: ShareReplayConfig): qt.Shifter<N>;
export function shareReplay<N>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.Shifter<N>;
export function shareReplay<N>(
  configOrBufferSize?: ShareReplayConfig | number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.Shifter<N> {
  let config: ShareReplayConfig;
  if (configOrBufferSize && typeof configOrBufferSize === 'object') {
    config = configOrBufferSize as ShareReplayConfig;
  } else {
    config = {
      bufferSize: configOrBufferSize as number | undefined,
      windowTime,
      refCount: false,
      scheduler
    };
  }
  return x => x.lift(shareReplayO(config));
}

function shareReplayO<N>({
  bufferSize = Number.POSITIVE_INFINITY,
  windowTime = Number.POSITIVE_INFINITY,
  refCount: useRefCount,
  scheduler
}: ShareReplayConfig) {
  let subject: Replay<N> | undefined;
  let refCount = 0;
  let subscription: qt.Subscription;
  let hasError = false;
  let isComplete = false;

  return function shareReplayOperation(
    this: qt.Subscriber<N>,
    source: qt.Source<N>
  ) {
    refCount++;
    if (!subject || hasError) {
      hasError = false;
      subject = new Replay<N>(bufferSize, windowTime, scheduler);
      subscription = source.subscribe({
        next(value) {
          subject!.next(value);
        },
        fail(f) {
          hasError = true;
          subject!.fail(e);
        },
        done() {
          isComplete = true;
          subscription = undefined;
          subject!.done();
        }
      });
    }

    const innerSub = subject.subscribe(this);
    this.add(() => {
      refCount--;
      innerSub.unsubscribe();
      if (subscription && !isComplete && useRefCount && refCount === 0) {
        subscription.unsubscribe();
        subscription = undefined;
        subject = undefined;
      }
    });
  };
}
