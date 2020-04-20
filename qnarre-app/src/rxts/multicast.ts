export function multicast<N, F, D>(
  subject: Subject<N, F, D>
): UnaryFun<Observable<N, F, D>, Connect<N, F, D>>;
export function multicast<T, O extends SourceInput<any>>(
  subject: Subject<N, F, D>,
  selector: (shared: qt.Source<N, F, D>) => O
): UnaryFun<Observable<N, F, D>, Connect<Sourced<O>>>;
export function multicast<N, F, D>(
  subjectFactory: (this: qt.Source<N, F, D>) => Subject<N, F, D>
): UnaryFun<Observable<N, F, D>, Connect<N, F, D>>;
export function multicast<T, O extends SourceInput<any>>(
  SubjectFactory: (this: qt.Source<N, F, D>) => Subject<N, F, D>,
  selector: (shared: qt.Source<N, F, D>) => O
): Lifter<T, Sourced<O>>;
export function multicast<T, R>(
  subjectOrSubjectFactory: Subject<N, F, D> | (() => Subject<N, F, D>),
  selector?: (source: qt.Source<N, F, D>) => qt.Source<R>
): Lifter<T, R> {
  return function multicastLifter(source: qt.Source<N, F, D>): qt.Source<R> {
    let subjectFactory: () => Subject<N, F, D>;
    if (typeof subjectOrSubjectFactory === 'function') {
      subjectFactory = <() => Subject<N, F, D>>subjectOrSubjectFactory;
    } else {
      subjectFactory = function subjectFactory() {
        return <Subject<N, F, D>>subjectOrSubjectFactory;
      };
    }
    if (typeof selector === 'function') {
      return source.lift(new MulticastO(subjectFactory, selector));
    }
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
    private subjectFactory: () => Subject<N, F, D>,
    private selector: (source: qt.Source<N, F, D>) => qt.Source<R>
  ) {}
  call(subscriber: Subscriber<R>, source: any): any {
    const {selector} = this;
    const subject = this.subjectFactory();
    const subscription = selector(subject).subscribe(subscriber);
    subscription.add(source.subscribe(subject));
    return subscription;
  }
}

export function publish<N, F, D>(): UnaryFun<
  qt.Source<N, F, D>,
  Connect<N, F, D>
>;
export function publish<T, O extends SourceInput<any>>(
  selector: (shared: qt.Source<N, F, D>) => O
): Lifter<T, Sourced<O>>;
export function publish<N, F, D>(
  selector: qt.MonoOper<N, F, D>
): qt.MonoOper<N, F, D>;
export function publish<T, R>(
  selector?: Lifter<T, R>
): qt.MonoOper<N, F, D> | Lifter<T, R> {
  return selector
    ? multicast(() => new Subject<N, F, D>(), selector)
    : multicast(new Subject<N, F, D>());
}

export function publishBehavior<N, F, D>(
  value: T
): UnaryFun<qt.Source<N, F, D>, Connect<N, F, D>> {
  return (source: qt.Source<N, F, D>) =>
    multicast(new Behavior<N, F, D>(value))(source) as Connect<N, F, D>;
}

export function publishLast<N, F, D>(): UnaryFun<
  qt.Source<N, F, D>,
  Connect<N, F, D>
> {
  return (source: qt.Source<N, F, D>) =>
    multicast(new Async<N, F, D>())(source);
}

export function publishReplay<N, F, D>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.MonoOper<N, F, D>;
export function publishReplay<T, O extends SourceInput<any>>(
  bufferSize?: number,
  windowTime?: number,
  selector?: (shared: qt.Source<N, F, D>) => O,
  scheduler?: qt.Scheduler
): Lifter<T, Sourced<O>>;
export function publishReplay<T, R>(
  bufferSize?: number,
  windowTime?: number,
  selectorOrScheduler?: qt.Scheduler | Lifter<T, R>,
  scheduler?: qt.Scheduler
): UnaryFun<qt.Source<N, F, D>, Connect<R>> {
  if (selectorOrScheduler && typeof selectorOrScheduler !== 'function') {
    scheduler = selectorOrScheduler;
  }
  const selector =
    typeof selectorOrScheduler === 'function' ? selectorOrScheduler : undefined;
  const subject = new Replay<N, F, D>(bufferSize, windowTime, scheduler);
  return (source: qt.Source<N, F, D>) =>
    multicast(() => subject, selector!)(source) as Connect<R>;
}

function shareSubjectFactory() {
  return new Subject<any>();
}

export function share<N, F, D>(): qt.MonoOper<N, F, D> {
  return (source: qt.Source<N, F, D>) =>
    refCount()(multicast(shareSubjectFactory)(source)) as qt.Source<N, F, D>;
}

export interface ShareReplayConfig {
  bufferSize?: number;
  windowTime?: number;
  refCount: boolean;
  scheduler?: qt.Scheduler;
}

export function shareReplay<N, F, D>(
  config: ShareReplayConfig
): qt.MonoOper<N, F, D>;
export function shareReplay<N, F, D>(
  bufferSize?: number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.MonoOper<N, F, D>;
export function shareReplay<N, F, D>(
  configOrBufferSize?: ShareReplayConfig | number,
  windowTime?: number,
  scheduler?: qt.Scheduler
): qt.MonoOper<N, F, D> {
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
  return (source: qt.Source<N, F, D>) => source.lift(shareReplayO(config));
}

function shareReplayO<N, F, D>({
  bufferSize = Number.POSITIVE_INFINITY,
  windowTime = Number.POSITIVE_INFINITY,
  refCount: useRefCount,
  scheduler
}: ShareReplayConfig) {
  let subject: Replay<N, F, D> | undefined;
  let refCount = 0;
  let subscription: Subscription;
  let hasError = false;
  let isComplete = false;

  return function shareReplayOperation(
    this: Subscriber<N, F, D>,
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
        error(err) {
          hasError = true;
          subject!.error(err);
        },
        complete() {
          isComplete = true;
          subscription = undefined;
          subject!.complete();
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
