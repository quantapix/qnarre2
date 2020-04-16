import * as qs from './source';
import * as qj from './subject';
import * as qt from './types';
import * as qu from './utils';

export class ColdSource<N> extends qs.Source<N>
  implements SubscriptionLoggable {
  public subscriptions: SubscriptionLog[] = [];
  scheduler: Scheduler;
  // @ts-ignore: Property has no initializer and is not definitely assigned
  logSubscribedFrame: () => number;
  // @ts-ignore: Property has no initializer and is not definitely assigned
  logUnsubscribedFrame: (index: number) => void;

  constructor(public messages: TestMessage[], scheduler: Scheduler) {
    super(function (this: qs.Source<N>, subscriber: qj.Subscriber<any>) {
      const observable: ColdSource<N> = this as any;
      const index = observable.logSubscribedFrame();
      const subscription = new qj.Subscription();
      subscription.add(
        new qj.Subscription(() => {
          observable.logUnsubscribedFrame(index);
        })
      );
      observable.scheduleMessages(subscriber);
      return subscription;
    });
    this.scheduler = scheduler;
  }

  scheduleMessages(subscriber: qj.Subscriber<any>) {
    const messagesLength = this.messages.length;
    for (let i = 0; i < messagesLength; i++) {
      const message = this.messages[i];
      subscriber.add(
        this.scheduler.schedule(
          state => {
            const {message, subscriber} = state!;
            message.notification.observe(subscriber);
          },
          message.frame,
          {message, subscriber}
        )
      );
    }
  }
}
applyMixins(ColdSource, [SubscriptionLoggable]);

export class HotSource<N> extends qj.Subject<N>
  implements SubscriptionLoggable {
  public subscriptions: SubscriptionLog[] = [];
  scheduler: Scheduler;
  // @ts-ignore: Property has no initializer and is not definitely assigned
  logSubscribedFrame: () => number;
  // @ts-ignore: Property has no initializer and is not definitely assigned
  logUnsubscribedFrame: (index: number) => void;

  constructor(public messages: TestMessage[], scheduler: Scheduler) {
    super();
    this.scheduler = scheduler;
  }

  _subscribe(subscriber: qj.Subscriber<any>): qj.Subscription {
    const subject: HotSource<N> = this;
    const index = subject.logSubscribedFrame();
    const subscription = new qj.Subscription();
    subscription.add(
      new qj.Subscription(() => {
        subject.logUnsubscribedFrame(index);
      })
    );
    subscription.add(super._subscribe(subscriber));
    return subscription;
  }

  setup() {
    const subject = this;
    const messagesLength = subject.messages.length;
    /* tslint:disable:no-var-keyword */
    for (var i = 0; i < messagesLength; i++) {
      (() => {
        var message = subject.messages[i];
        /* tslint:enable */
        subject.scheduler.schedule(() => {
          message.notification.observe(subject);
        }, message.frame);
      })();
    }
  }
}
applyMixins(HotSource, [SubscriptionLoggable]);

export class SubscriptionLog {
  constructor(
    public subscribedFrame: number,
    public unsubscribedFrame: number = Number.POSITIVE_INFINITY
  ) {}
}

export class SubscriptionLoggable {
  public subscriptions: SubscriptionLog[] = [];
  // @ts-ignore: Property has no initializer and is not definitely assigned
  scheduler: Scheduler;

  logSubscribedFrame(): number {
    this.subscriptions.push(new SubscriptionLog(this.scheduler.now()));
    return this.subscriptions.length - 1;
  }

  logUnsubscribedFrame(index: number) {
    const subscriptionLogs = this.subscriptions;
    const oldSubscriptionLog = subscriptionLogs[index];
    subscriptionLogs[index] = new SubscriptionLog(
      oldSubscriptionLog.subscribedFrame,
      this.scheduler.now()
    );
  }
}

export interface TestMessage {
  frame: number;
  notification: qs.Notification<any>;
  isGhost?: boolean;
}

const defaultMaxFrame: number = 750;

export interface RunHelpers {
  cold: typeof TestScheduler.prototype.createColdSource;
  hot: typeof TestScheduler.prototype.createHotSource;
  flush: typeof TestScheduler.prototype.flush;
  time: typeof TestScheduler.prototype.createTime;
  expectSource: typeof TestScheduler.prototype.expectSource;
  expectSubscriptions: typeof TestScheduler.prototype.expectSubscriptions;
}

interface FlushableTest {
  ready: boolean;
  actual?: any[];
  expected?: any[];
}

export type observableToBeFn = (
  marbles: string,
  values?: any,
  errorValue?: any
) => void;
export type subscriptionLogsToBeFn = (marbles: string | string[]) => void;

export class TestScheduler extends VirtualTimeScheduler {
  static frameTimeFactor = 10;
  public readonly hotSources: HotSource<any>[] = [];
  public readonly coldSources: ColdSource<any>[] = [];
  private flushTests: FlushableTest[] = [];
  private runMode = false;
  constructor(
    public assertDeepEqual: (actual: any, expected: any) => boolean | void
  ) {
    super(VirtualAction, defaultMaxFrame);
  }

  createTime(marbles: string): number {
    const indexOf = marbles.trim().indexOf('|');
    if (indexOf === -1) {
      throw new Error(
        'marble diagram for time should have a completion marker "|"'
      );
    }
    return indexOf * TestScheduler.frameTimeFactor;
  }

  createColdSource<T = string>(
    marbles: string,
    values?: {[marble: string]: T},
    error?: any
  ): ColdSource<N> {
    if (marbles.indexOf('^') !== -1) {
      throw new Error('cold observable cannot have subscription offset "^"');
    }
    if (marbles.indexOf('!') !== -1) {
      throw new Error('cold observable cannot have unsubscription marker "!"');
    }
    const messages = TestScheduler.parseMarbles(
      marbles,
      values,
      error,
      undefined,
      this.runMode
    );
    const cold = new ColdSource<N>(messages, this);
    this.coldSources.push(cold);
    return cold;
  }
  createHotSource<N = string>(
    marbles: string,
    values?: {[marble: string]: N},
    error?: any
  ): HotSource<N> {
    if (marbles.indexOf('!') !== -1) {
      throw new Error('hot observable cannot have unsubscription marker "!"');
    }
    const messages = TestScheduler.parseMarbles(
      marbles,
      values,
      error,
      undefined,
      this.runMode
    );
    const subject = new HotSource<N>(messages, this);
    this.hotSources.push(subject);
    return subject;
  }

  private materializeActorSource(
    observable: qs.Source<any>,
    outerFrame: number
  ): TestMessage[] {
    const messages: TestMessage[] = [];
    observable.subscribe(
      value => {
        messages.push({
          frame: this.frame - outerFrame,
          notification: qs.Notification.createNext(value)
        });
      },
      err => {
        messages.push({
          frame: this.frame - outerFrame,
          notification: qs.Notification.createError(err)
        });
      },
      () => {
        messages.push({
          frame: this.frame - outerFrame,
          notification: qs.Notification.createComplete()
        });
      }
    );
    return messages;
  }

  expectSource(
    observable: qs.Source<any>,
    subscriptionMarbles: string | null = null
  ): {toBe: observableToBeFn} {
    const actual: TestMessage[] = [];
    const flushTest: FlushableTest = {actual, ready: false};
    const subscriptionParsed = TestScheduler.parseMarblesAsSubscriptions(
      subscriptionMarbles,
      this.runMode
    );
    const subscriptionFrame =
      subscriptionParsed.subscribedFrame === Number.POSITIVE_INFINITY
        ? 0
        : subscriptionParsed.subscribedFrame;
    const unsubscriptionFrame = subscriptionParsed.unsubscribedFrame;
    let subscription: qj.Subscription;

    this.schedule(() => {
      subscription = observable.subscribe(
        x => {
          let value = x;
          // Support Source-of-Sources
          if (x instanceof qs.Source) {
            value = this.materializeActorSource(value, this.frame);
          }
          actual.push({
            frame: this.frame,
            notification: qs.Notification.createNext(value)
          });
        },
        err => {
          actual.push({
            frame: this.frame,
            notification: qs.Notification.createError(err)
          });
        },
        () => {
          actual.push({
            frame: this.frame,
            notification: qs.Notification.createComplete()
          });
        }
      );
    }, subscriptionFrame);

    if (unsubscriptionFrame !== Number.POSITIVE_INFINITY) {
      this.schedule(() => subscription.unsubscribe(), unsubscriptionFrame);
    }

    this.flushTests.push(flushTest);
    const {runMode} = this;

    return {
      toBe(marbles: string, values?: any, errorValue?: any) {
        flushTest.ready = true;
        flushTest.expected = TestScheduler.parseMarbles(
          marbles,
          values,
          errorValue,
          true,
          runMode
        );
      }
    };
  }

  expectSubscriptions(
    actualSubscriptionLogs: SubscriptionLog[]
  ): {toBe: subscriptionLogsToBeFn} {
    const flushTest: FlushableTest = {
      actual: actualSubscriptionLogs,
      ready: false
    };
    this.flushTests.push(flushTest);
    const {runMode} = this;
    return {
      toBe(marbles: string | string[]) {
        const marblesArray: string[] =
          typeof marbles === 'string' ? [marbles] : marbles;
        flushTest.ready = true;
        flushTest.expected = marblesArray.map(marbles =>
          TestScheduler.parseMarblesAsSubscriptions(marbles, runMode)
        );
      }
    };
  }

  flush() {
    const hotSources = this.hotSources;
    while (hotSources.length > 0) {
      hotSources.shift()!.setup();
    }

    super.flush();

    this.flushTests = this.flushTests.filter(test => {
      if (test.ready) {
        this.assertDeepEqual(test.actual, test.expected);
        return false;
      }
      return true;
    });
  }

  static parseMarblesAsSubscriptions(
    marbles: string | null,
    runMode = false
  ): SubscriptionLog {
    if (typeof marbles !== 'string') {
      return new SubscriptionLog(Number.POSITIVE_INFINITY);
    }
    const len = marbles.length;
    let groupStart = -1;
    let subscriptionFrame = Number.POSITIVE_INFINITY;
    let unsubscriptionFrame = Number.POSITIVE_INFINITY;
    let frame = 0;

    for (let i = 0; i < len; i++) {
      let nextFrame = frame;
      const advanceFrameBy = (count: number) => {
        nextFrame += count * this.frameTimeFactor;
      };
      const c = marbles[i];
      switch (c) {
        case ' ':
          // Whitespace no longer advances time
          if (!runMode) {
            advanceFrameBy(1);
          }
          break;
        case '-':
          advanceFrameBy(1);
          break;
        case '(':
          groupStart = frame;
          advanceFrameBy(1);
          break;
        case ')':
          groupStart = -1;
          advanceFrameBy(1);
          break;
        case '^':
          if (subscriptionFrame !== Number.POSITIVE_INFINITY) {
            throw new Error(
              "found a second subscription point '^' in a " +
                'subscription marble diagram. There can only be one.'
            );
          }
          subscriptionFrame = groupStart > -1 ? groupStart : frame;
          advanceFrameBy(1);
          break;
        case '!':
          if (unsubscriptionFrame !== Number.POSITIVE_INFINITY) {
            throw new Error(
              "found a second subscription point '^' in a " +
                'subscription marble diagram. There can only be one.'
            );
          }
          unsubscriptionFrame = groupStart > -1 ? groupStart : frame;
          break;
        default:
          // time progression syntax
          if (runMode && c.match(/^[0-9]$/)) {
            // Time progression must be preceeded by at least one space
            // if it's not at the beginning of the diagram
            if (i === 0 || marbles[i - 1] === ' ') {
              const buffer = marbles.slice(i);
              const match = buffer.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m) /);
              if (match) {
                i += match[0].length - 1;
                const duration = parseFloat(match[1]);
                const unit = match[2];
                let durationInMs: number;

                switch (unit) {
                  case 'ms':
                    durationInMs = duration;
                    break;
                  case 's':
                    durationInMs = duration * 1000;
                    break;
                  case 'm':
                    durationInMs = duration * 1000 * 60;
                    break;
                  default:
                    break;
                }

                advanceFrameBy(durationInMs! / this.frameTimeFactor);
                break;
              }
            }
          }

          throw new Error(
            "there can only be '^' and '!' markers in a " +
              "subscription marble diagram. Found instead '" +
              c +
              "'."
          );
      }

      frame = nextFrame;
    }

    if (unsubscriptionFrame < 0) {
      return new SubscriptionLog(subscriptionFrame);
    } else {
      return new SubscriptionLog(subscriptionFrame, unsubscriptionFrame);
    }
  }

  static parseMarbles(
    marbles: string,
    values?: any,
    errorValue?: any,
    materializeActorSources: boolean = false,
    runMode = false
  ): TestMessage[] {
    if (marbles.indexOf('!') !== -1) {
      throw new Error(
        'conventional marble diagrams cannot have the ' +
          'unsubscription marker "!"'
      );
    }
    const len = marbles.length;
    const testMessages: TestMessage[] = [];
    const subIndex = runMode
      ? marbles.replace(/^[ ]+/, '').indexOf('^')
      : marbles.indexOf('^');
    let frame = subIndex === -1 ? 0 : subIndex * -this.frameTimeFactor;
    const getValue =
      typeof values !== 'object'
        ? (x: any) => x
        : (x: any) => {
            // Support Source-of-Sources
            if (materializeActorSources && values[x] instanceof ColdSource) {
              return values[x].messages;
            }
            return values[x];
          };
    let groupStart = -1;

    for (let i = 0; i < len; i++) {
      let nextFrame = frame;
      const advanceFrameBy = (count: number) => {
        nextFrame += count * this.frameTimeFactor;
      };

      let notification: qs.Notification<any> | undefined;
      const c = marbles[i];
      switch (c) {
        case ' ':
          // Whitespace no longer advances time
          if (!runMode) {
            advanceFrameBy(1);
          }
          break;
        case '-':
          advanceFrameBy(1);
          break;
        case '(':
          groupStart = frame;
          advanceFrameBy(1);
          break;
        case ')':
          groupStart = -1;
          advanceFrameBy(1);
          break;
        case '|':
          notification = qs.Notification.createComplete();
          advanceFrameBy(1);
          break;
        case '^':
          advanceFrameBy(1);
          break;
        case '#':
          notification = qs.Notification.createError(errorValue || 'error');
          advanceFrameBy(1);
          break;
        default:
          // Might be time progression syntax, or a value literal
          if (runMode && c.match(/^[0-9]$/)) {
            // Time progression must be preceeded by at least one space
            // if it's not at the beginning of the diagram
            if (i === 0 || marbles[i - 1] === ' ') {
              const buffer = marbles.slice(i);
              const match = buffer.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m) /);
              if (match) {
                i += match[0].length - 1;
                const duration = parseFloat(match[1]);
                const unit = match[2];
                let durationInMs: number;

                switch (unit) {
                  case 'ms':
                    durationInMs = duration;
                    break;
                  case 's':
                    durationInMs = duration * 1000;
                    break;
                  case 'm':
                    durationInMs = duration * 1000 * 60;
                    break;
                  default:
                    break;
                }

                advanceFrameBy(durationInMs! / this.frameTimeFactor);
                break;
              }
            }
          }

          notification = qs.Notification.createNext(getValue(c));
          advanceFrameBy(1);
          break;
      }

      if (notification) {
        testMessages.push({
          frame: groupStart > -1 ? groupStart : frame,
          notification
        });
      }

      frame = nextFrame;
    }
    return testMessages;
  }

  run<N>(callback: (helpers: RunHelpers) => N): N {
    const prevFrameTimeFactor = TestScheduler.frameTimeFactor;
    const prevMaxFrames = this.maxFrames;

    TestScheduler.frameTimeFactor = 1;
    this.maxFrames = Number.POSITIVE_INFINITY;
    this.runMode = true;
    AsyncScheduler.delegate = this;

    const helpers = {
      cold: this.createColdSource.bind(this),
      hot: this.createHotSource.bind(this),
      flush: this.flush.bind(this),
      time: this.createTime.bind(this),
      expectSource: this.expectSource.bind(this),
      expectSubscriptions: this.expectSubscriptions.bind(this)
    };
    try {
      const ret = callback(helpers);
      this.flush();
      return ret;
    } finally {
      TestScheduler.frameTimeFactor = prevFrameTimeFactor;
      this.maxFrames = prevMaxFrames;
      this.runMode = false;
      AsyncScheduler.delegate = undefined;
    }
  }
}
