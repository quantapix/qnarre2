import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';
import * as qh from './scheduler';

export function multicast<N, F, D>(
  subject: qt.Subject<N, F, D>
): qt.Mapper<qt.Source<N, F, D>, Connect<N, F, D>>;
export function multicast<T, O extends qt.Input<any>>(
  subject: qt.Subject<N, F, D>,
  selector: (shared: qt.Source<N, F, D>) => O
): qt.Mapper<qt.Source<N, F, D>, Connect<Sourced<O>>>;
export function multicast<N, F, D>(
  subjectFactory: (this: qt.Source<N, F, D>) => qt.Subject<N, F, D>
): qt.Mapper<qt.Source<N, F, D>, Connect<N, F, D>>;
export function multicast<T, O extends qt.Input<any>>(
  SubjectFactory: (this: qt.Source<N, F, D>) => qt.Subject<N, F, D>,
  selector: (shared: qt.Source<N, F, D>) => O
): qt.Lifter<T, Sourced<O>>;
export function multicast<T, R>(
  subjectOrSubjectFactory: qt.Subject<N, F, D> | (() => qt.Subject<N, F, D>),
  selector?: (source: qt.Source<N, F, D>) => qt.Source<R>
): qt.Lifter<T, R> {
  return function multicastLifter(source: qt.Source<N, F, D>): qt.Source<R> {
    let subjectFactory: () => qt.Subject<N, F, D>;
    if (typeof subjectOrSubjectFactory === 'function') {
      subjectFactory = <() => qt.Subject<N, F, D>>subjectOrSubjectFactory;
    } else {
      subjectFactory = function subjectFactory() {
        return <qt.Subject<N, F, D>>subjectOrSubjectFactory;
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
    private subjectFactory: () => qt.Subject<N, F, D>,
    private selector: (source: qt.Source<N, F, D>) => qt.Source<R>
  ) {}
  call(r: qt.Subscriber<R>, s: any): any {
    const {selector} = this;
    const subject = this.subjectFactory();
    const subscription = selector(subject).subscribe(r);
    subscription.add(s.subscribe(subject));
    return subscription;
  }
}

export function publish<N, F, D>(): qt.Mapper<
  qt.Source<N, F, D>,
  Connect<N, F, D>
>;
export function publish<T, O extends qt.Input<any>>(
  selector: (shared: qt.Source<N, F, D>) => O
): qt.Lifter<T, Sourced<O>>;
export function publish<N, F, D>(
  selector: qt.Shifter<N, F, D>
): qt.Shifter<N, F, D>;
export function publish<T, R>(
  selector?: qt.Lifter<T, R>
): qt.Shifter<N, F, D> | qt.Lifter<T, R> {
  return selector
    ? multicast(() => new qt.Subject<N, F, D>(), selector)
    : multicast(new qt.Subject<N, F, D>());
}

export function publishBehavior<N, F, D>(
  value: T
): qt.Mapper<qt.Source<N, F, D>, Connect<N, F, D>> {
  return x => multicast(new Behavior<N, F, D>(value))(x) as Connect<N, F, D>;
}

export function publishLast<N, F, D>(): qt.Mapper<
  qt.Source<N, F, D>,
  Connect<N, F, D>
> {
  return x => multicast(new Async<N, F, D>())(x);
}

export function publishReplay<N, F, D>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.Shifter<N, F, D>;
export function publishReplay<T, O extends qt.Input<any>>(
  bufferSize?: number,
  windowTime?: number,
  selector?: (shared: qt.Source<N, F, D>) => O,
  scheduler?: qt.Scheduler
): qt.Lifter<T, Sourced<O>>;
export function publishReplay<T, R>(
  bufferSize?: number,
  windowTime?: number,
  selectorOrScheduler?: qt.Scheduler | qt.Lifter<T, R>,
  scheduler?: qt.Scheduler
): qt.Mapper<qt.Source<N, F, D>, Connect<R>> {
  if (selectorOrScheduler && typeof selectorOrScheduler !== 'function') {
    scheduler = selectorOrScheduler;
  }
  const selector =
    typeof selectorOrScheduler === 'function' ? selectorOrScheduler : undefined;
  const subject = new Replay<N, F, D>(bufferSize, windowTime, scheduler);
  return x => multicast(() => subject, selector!)(x) as Connect<R>;
}

function shareSubjectFactory() {
  return new qt.Subject<any>();
}

export function share<N, F, D>(): qt.Shifter<N, F, D> {
  return x =>
    refCount()(multicast(shareSubjectFactory)(x)) as qt.Source<N, F, D>;
}

export interface ShareReplayConfig {
  bufferSize?: number;
  windowTime?: number;
  refCount: boolean;
  scheduler?: qt.Scheduler;
}

export function shareReplay<N, F, D>(
  config: ShareReplayConfig
): qt.Shifter<N, F, D>;
export function shareReplay<N, F, D>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.Shifter<N, F, D>;
export function shareReplay<N, F, D>(
  configOrBufferSize?: ShareReplayConfig | number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.Shifter<N, F, D> {
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

function shareReplayO<N, F, D>({
  bufferSize = Number.POSITIVE_INFINITY,
  windowTime = Number.POSITIVE_INFINITY,
  refCount: useRefCount,
  scheduler
}: ShareReplayConfig) {
  let subject: Replay<N, F, D> | undefined;
  let refCount = 0;
  let subscription: qt.Subscription;
  let hasError = false;
  let isComplete = false;

  return function shareReplayOperation(
    this: qt.Subscriber<N, F, D>,
    source: qt.Source<N, F, D>
  ) {
    refCount++;
    if (!subject || hasError) {
      hasError = false;
      subject = new Replay<N, F, D>(bufferSize, windowTime, scheduler);
      subscription = source.subscribe({
        next(value) {
          subject!.next(value);
        },
        fail(f) {
          hasError = true;
          subject!.fail(f);
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
