import {AsyncSubject, Observer} from 'rxjs';
import {Proxy} from 'rxjs/internal/Subscriber';
import {Subscriber} from 'rxjs';
import {Observable, UnsubscribeError, Subscription, merge} from 'rxjs';

/** @test {Subscriber} */
describe('Subscriber', () => {
  it('should ignore next messages after unsubscription', () => {
    let times = 0;

    const sub = new Subscriber({
      next() {
        times += 1;
      }
    });

    sub.next();
    sub.next();
    sub.unsubscribe();
    sub.next();

    expect(times).to.equal(2);
  });

  it('should wrap unsafe observers in a safe subscriber', () => {
    const observer = {
      next(x: any) {
        /* noop */
      },
      error(err: any) {
        /* noop */
      },
      complete() {
        /* noop */
      }
    };

    const subscriber = new Subscriber(observer);
    expect((subscriber as any).destination).not.to.equal(observer);
    expect((subscriber as any).destination).to.be.an.instanceof(Proxy);
  });

  it('should ignore error messages after unsubscription', () => {
    let times = 0;
    let errorCalled = false;

    const sub = new Subscriber({
      next() {
        times += 1;
      },
      error() {
        errorCalled = true;
      }
    });

    sub.next();
    sub.next();
    sub.unsubscribe();
    sub.next();
    sub.error();

    expect(times).to.equal(2);
    expect(errorCalled).to.be.false;
  });

  it('should ignore complete messages after unsubscription', () => {
    let times = 0;
    let completeCalled = false;

    const sub = new Subscriber({
      next() {
        times += 1;
      },
      complete() {
        completeCalled = true;
      }
    });

    sub.next();
    sub.next();
    sub.unsubscribe();
    sub.next();
    sub.complete();

    expect(times).to.equal(2);
    expect(completeCalled).to.be.false;
  });

  it('should not be closed when other subscriber with same observer instance completes', () => {
    const observer = {
      next: function () {
        /*noop*/
      }
    };

    const sub1 = new Subscriber(observer);
    const sub2 = new Subscriber(observer);

    sub2.complete();

    expect(sub1.closed).to.be.false;
    expect(sub2.closed).to.be.true;
  });

  it('should call complete observer without any arguments', () => {
    let argument: Array<any> | null = null;

    const observer = {
      complete: (...args: Array<any>) => {
        argument = args;
      }
    };

    const sub1 = new Subscriber(observer);
    sub1.complete();

    expect(argument).to.have.lengthOf(0);
  });
});

class TestObserver implements Observer<number> {
  results: (number | string)[] = [];

  next(value: number): void {
    this.results.push(value);
  }

  error(err: any): void {
    this.results.push(err);
  }

  complete(): void {
    this.results.push('done');
  }
}

/** @test {Subscription} */
describe('Subscription', () => {
  describe('Subscription.add()', () => {
    it('Should return self if the self is passed', () => {
      const sub = new Subscription();
      const ret = sub.add(sub);

      expect(ret).to.equal(sub);
    });

    it('Should return Subscription.EMPTY if it is passed', () => {
      const sub = new Subscription();
      const ret = sub.add(Subscription.EMPTY);

      expect(ret).to.equal(Subscription.EMPTY);
    });

    it('Should return Subscription.EMPTY if it is called with `void` value', () => {
      const sub = new Subscription();
      const ret = sub.add(undefined);
      expect(ret).to.equal(Subscription.EMPTY);
    });

    it('Should return a new Subscription created with teardown function if it is passed a function', () => {
      const sub = new Subscription();

      let isCalled = false;
      const ret = sub.add(function () {
        isCalled = true;
      });
      ret.unsubscribe();

      expect(isCalled).to.equal(true);
    });

    it('Should wrap the AnonymousSubscription and return a subscription that unsubscribes and removes it when unsubbed', () => {
      const sub: any = new Subscription();
      let called = false;
      const arg = {
        unsubscribe: () => (called = true)
      };
      const ret = sub.add(arg);

      expect(called).to.equal(false);
      expect(sub._subscriptions.length).to.equal(1);
      ret.unsubscribe();
      expect(called).to.equal(true);
      expect(sub._subscriptions.length).to.equal(0);
    });

    it('Should return the passed one if passed a AnonymousSubscription having not function `unsubscribe` member', () => {
      const sub = new Subscription();
      const arg = {
        isUnsubscribed: false,
        unsubscribe: undefined as any
      };
      const ret = sub.add(arg as any);

      expect(ret).to.equal(arg);
    });

    it('Should return the passed one if the self has been unsubscribed', () => {
      const main = new Subscription();
      main.unsubscribe();

      const child = new Subscription();
      const ret = main.add(child);

      expect(ret).to.equal(child);
    });

    it('Should unsubscribe the passed one if the self has been unsubscribed', () => {
      const main = new Subscription();
      main.unsubscribe();

      let isCalled = false;
      const child = new Subscription(() => {
        isCalled = true;
      });
      main.add(child);

      expect(isCalled).to.equal(true);
    });
  });

  describe('Subscription.unsubscribe()', () => {
    it('Should unsubscribe from all subscriptions, when some of them throw', done => {
      const tearDowns: number[] = [];

      const source1 = new Observable(() => {
        return () => {
          tearDowns.push(1);
        };
      });

      const source2 = new Observable(() => {
        return () => {
          tearDowns.push(2);
          throw new Error('oops, I am a bad unsubscribe!');
        };
      });

      const source3 = new Observable(() => {
        return () => {
          tearDowns.push(3);
        };
      });

      const subscription = merge(source1, source2, source3).subscribe();

      setTimeout(() => {
        expect(() => {
          subscription.unsubscribe();
        }).to.throw(UnsubscribeError);
        expect(tearDowns).to.deep.equal([1, 2, 3]);
        done();
      });
    });

    it('Should unsubscribe from all subscriptions, when adding a bad custom subscription to a subscription', done => {
      const tearDowns: number[] = [];

      const sub = new Subscription();

      const source1 = new Observable(() => {
        return () => {
          tearDowns.push(1);
        };
      });

      const source2 = new Observable(() => {
        return () => {
          tearDowns.push(2);
          sub.add(<any>{
            unsubscribe: () => {
              expect(sub.closed).to.be.true;
              throw new Error('Who is your daddy, and what does he do?');
            }
          });
        };
      });

      const source3 = new Observable(() => {
        return () => {
          tearDowns.push(3);
        };
      });

      sub.add(merge(source1, source2, source3).subscribe());

      setTimeout(() => {
        expect(() => {
          sub.unsubscribe();
        }).to.throw(UnsubscribeError);
        expect(tearDowns).to.deep.equal([1, 2, 3]);
        done();
      });
    });
  });
});

/** @test {AsyncSubject} */
describe('AsyncSubject', () => {
  it('should emit the last value when complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).to.deep.equal([]);
    subject.next(2);
    expect(observer.results).to.deep.equal([]);
    subject.complete();
    expect(observer.results).to.deep.equal([2, 'done']);
  });

  it('should emit the last value when subscribing after complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();

    subject.next(1);
    subject.next(2);
    subject.complete();

    subject.subscribe(observer);
    expect(observer.results).to.deep.equal([2, 'done']);
  });

  it('should keep emitting the last value to subsequent subscriptions', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).to.deep.equal([]);
    subject.next(2);
    expect(observer.results).to.deep.equal([]);
    subject.complete();
    expect(observer.results).to.deep.equal([2, 'done']);

    subscription.unsubscribe();

    observer.results = [];
    subject.subscribe(observer);
    expect(observer.results).to.deep.equal([2, 'done']);
  });

  it('should not emit values after complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();

    subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).to.deep.equal([]);
    subject.next(2);
    expect(observer.results).to.deep.equal([]);
    subject.complete();
    subject.next(3);
    expect(observer.results).to.deep.equal([2, 'done']);
  });

  it('should not allow change value after complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const otherObserver = new TestObserver();
    subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).to.deep.equal([]);
    subject.complete();
    expect(observer.results).to.deep.equal([1, 'done']);
    subject.next(2);
    subject.subscribe(otherObserver);
    expect(otherObserver.results).to.deep.equal([1, 'done']);
  });

  it('should not emit values if unsubscribed before complete', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).to.deep.equal([]);
    subject.next(2);
    expect(observer.results).to.deep.equal([]);

    subscription.unsubscribe();

    subject.next(3);
    expect(observer.results).to.deep.equal([]);
    subject.complete();
    expect(observer.results).to.deep.equal([]);
  });

  it('should just complete if no value has been nexted into it', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);

    expect(observer.results).to.deep.equal([]);
    subject.complete();
    expect(observer.results).to.deep.equal(['done']);
  });

  it('should keep emitting complete to subsequent subscriptions', () => {
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    expect(observer.results).to.deep.equal([]);
    subject.complete();
    expect(observer.results).to.deep.equal(['done']);

    subscription.unsubscribe();
    observer.results = [];

    subject.error(new Error(''));

    subject.subscribe(observer);
    expect(observer.results).to.deep.equal(['done']);
  });

  it('should only error if an error is passed into it', () => {
    const expected = new Error('bad');
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).to.deep.equal([]);

    subject.error(expected);
    expect(observer.results).to.deep.equal([expected]);
  });

  it('should keep emitting error to subsequent subscriptions', () => {
    const expected = new Error('bad');
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).to.deep.equal([]);

    subject.error(expected);
    expect(observer.results).to.deep.equal([expected]);

    subscription.unsubscribe();

    observer.results = [];
    subject.subscribe(observer);
    expect(observer.results).to.deep.equal([expected]);
  });

  it('should not allow send complete after error', () => {
    const expected = new Error('bad');
    const subject = new AsyncSubject<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).to.deep.equal([]);

    subject.error(expected);
    expect(observer.results).to.deep.equal([expected]);

    subscription.unsubscribe();

    observer.results = [];

    subject.complete();
    subject.subscribe(observer);
    expect(observer.results).to.deep.equal([expected]);
  });
});
import {expect} from 'chai';
import {hot, expectObservable} from '../helpers/marble-testing';
import {
  BehaviorSubject,
  Subject,
  UnsubscribedError,
  Observable,
  of
} from 'rxjs';
import {tap, mergeMapTo} from 'rxjs/operators';
import {asInteropSubject} from '../helpers/interop-helper';

/** @test {BehaviorSubject} */
describe('BehaviorSubject', () => {
  it('should extend Subject', () => {
    const subject = new BehaviorSubject(null);
    expect(subject).to.be.instanceof(Subject);
  });

  it('should throw if it has received an error and getValue() is called', () => {
    const subject = new BehaviorSubject(null);
    subject.error(new Error('derp'));
    expect(() => {
      subject.getValue();
    }).to.throw(Error, 'derp');
  });

  it(
    'should throw an UnsubscribedError if getValue() is called ' +
      'and the BehaviorSubject has been unsubscribed',
    () => {
      const subject = new BehaviorSubject('hi there');
      subject.unsubscribe();
      expect(() => {
        subject.getValue();
      }).to.throw(UnsubscribedError);
    }
  );

  it('should have a getValue() method to retrieve the current value', () => {
    const subject = new BehaviorSubject('staltz');
    expect(subject.getValue()).to.equal('staltz');

    subject.next('oj');

    expect(subject.getValue()).to.equal('oj');
  });

  it('should not allow you to set `value` directly', () => {
    const subject = new BehaviorSubject('flibberty');

    try {
      // XXX: escape from readonly restriction for testing.
      (subject as any).value = 'jibbets';
    } catch (e) {
      //noop
    }

    expect(subject.getValue()).to.equal('flibberty');
    expect(subject.value).to.equal('flibberty');
  });

  it('should still allow you to retrieve the value from the value property', () => {
    const subject = new BehaviorSubject('fuzzy');
    expect(subject.value).to.equal('fuzzy');
    subject.next('bunny');
    expect(subject.value).to.equal('bunny');
  });

  it('should start with an initialization value', (done: MochaDone) => {
    const subject = new BehaviorSubject('foo');
    const expected = ['foo', 'bar'];
    let i = 0;

    subject.subscribe(
      (x: string) => {
        expect(x).to.equal(expected[i++]);
      },
      null,
      done
    );

    subject.next('bar');
    subject.complete();
  });

  it('should pump values to multiple subscribers', (done: MochaDone) => {
    const subject = new BehaviorSubject('init');
    const expected = ['init', 'foo', 'bar'];
    let i = 0;
    let j = 0;

    subject.subscribe((x: string) => {
      expect(x).to.equal(expected[i++]);
    });

    subject.subscribe(
      (x: string) => {
        expect(x).to.equal(expected[j++]);
      },
      null,
      done
    );

    expect(subject.observers.length).to.equal(2);
    subject.next('foo');
    subject.next('bar');
    subject.complete();
  });

  it('should not pass values nexted after a complete', () => {
    const subject = new BehaviorSubject('init');
    const results: string[] = [];

    subject.subscribe((x: string) => {
      results.push(x);
    });
    expect(results).to.deep.equal(['init']);

    subject.next('foo');
    expect(results).to.deep.equal(['init', 'foo']);

    subject.complete();
    expect(results).to.deep.equal(['init', 'foo']);

    subject.next('bar');
    expect(results).to.deep.equal(['init', 'foo']);
  });

  it('should clean out unsubscribed subscribers', (done: MochaDone) => {
    const subject = new BehaviorSubject('init');

    const sub1 = subject.subscribe((x: string) => {
      expect(x).to.equal('init');
    });

    const sub2 = subject.subscribe((x: string) => {
      expect(x).to.equal('init');
    });

    expect(subject.observers.length).to.equal(2);
    sub1.unsubscribe();
    expect(subject.observers.length).to.equal(1);
    sub2.unsubscribe();
    expect(subject.observers.length).to.equal(0);
    done();
  });

  it('should replay the previous value when subscribed', () => {
    const behaviorSubject = new BehaviorSubject('0');
    function feedNextIntoSubject(x: string) {
      behaviorSubject.next(x);
    }
    function feedErrorIntoSubject(err: any) {
      behaviorSubject.error(err);
    }
    function feedCompleteIntoSubject() {
      behaviorSubject.complete();
    }

    const sourceTemplate = '-1-2-3----4------5-6---7--8----9--|';
    const subscriber1 = hot('      (a|)                         ').pipe(
      mergeMapTo(behaviorSubject)
    );
    const unsub1 = '                     !             ';
    const expected1 = '      3---4------5-6--             ';
    const subscriber2 = hot('            (b|)                   ').pipe(
      mergeMapTo(behaviorSubject)
    );
    const unsub2 = '                         !         ';
    const expected2 = '            4----5-6---7--         ';
    const subscriber3 = hot('                           (c|)    ').pipe(
      mergeMapTo(behaviorSubject)
    );
    const expected3 = '                           8---9--|';

    expectObservable(
      hot(sourceTemplate).pipe(
        tap(feedNextIntoSubject, feedErrorIntoSubject, feedCompleteIntoSubject)
      )
    ).toBe(sourceTemplate);
    expectObservable(subscriber1, unsub1).toBe(expected1);
    expectObservable(subscriber2, unsub2).toBe(expected2);
    expectObservable(subscriber3).toBe(expected3);
  });

  it('should emit complete when subscribed after completed', () => {
    const behaviorSubject = new BehaviorSubject('0');
    function feedNextIntoSubject(x: string) {
      behaviorSubject.next(x);
    }
    function feedErrorIntoSubject(err: any) {
      behaviorSubject.error(err);
    }
    function feedCompleteIntoSubject() {
      behaviorSubject.complete();
    }

    const sourceTemplate = '-1-2-3--4--|';
    const subscriber1 = hot('               (a|)').pipe(
      mergeMapTo(behaviorSubject)
    );
    const expected1 = '               |   ';

    expectObservable(
      hot(sourceTemplate).pipe(
        tap(feedNextIntoSubject, feedErrorIntoSubject, feedCompleteIntoSubject)
      )
    ).toBe(sourceTemplate);
    expectObservable(subscriber1).toBe(expected1);
  });

  it('should be an Observer which can be given to Observable.subscribe', (done: MochaDone) => {
    const source = of(1, 2, 3, 4, 5);
    const subject = new BehaviorSubject(0);
    const expected = [0, 1, 2, 3, 4, 5];

    subject.subscribe(
      (x: number) => {
        expect(x).to.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(subject.value).to.equal(5);
        done();
      }
    );

    source.subscribe(subject);
  });

  it.skip('should be an Observer which can be given to an interop source', (done: MochaDone) => {
    // This test reproduces a bug reported in this issue:
    // https://github.com/ReactiveX/rxjs/issues/5105
    // However, it cannot easily be fixed. See this comment:
    // https://github.com/ReactiveX/rxjs/issues/5105#issuecomment-578405446
    const source = of(1, 2, 3, 4, 5);
    const subject = new BehaviorSubject(0);
    const expected = [0, 1, 2, 3, 4, 5];

    subject.subscribe(
      (x: number) => {
        expect(x).to.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(subject.value).to.equal(5);
        done();
      }
    );

    source.subscribe(asInteropSubject(subject));
  });
});
import {expect} from 'chai';
import {TestScheduler} from '../../testing/TestScheduler';
import {hot, expectObservable} from '../helpers/marble-testing';
import {ReplaySubject, Subject, of} from 'rxjs';
import {mergeMapTo, tap} from 'rxjs/operators';

declare const rxTestScheduler: TestScheduler;

/** @test {ReplaySubject} */
describe('ReplaySubject', () => {
  it('should extend Subject', () => {
    const subject = new ReplaySubject();
    expect(subject).to.be.instanceof(Subject);
  });

  it('should add the observer before running subscription code', () => {
    const subject = new ReplaySubject<number>();
    subject.next(1);
    const results: number[] = [];

    subject.subscribe(value => {
      results.push(value);
      if (value < 3) {
        subject.next(value + 1);
      }
    });

    expect(results).to.deep.equal([1, 2, 3]);
  });

  it('should replay values upon subscription', (done: MochaDone) => {
    const subject = new ReplaySubject<number>();
    const expects = [1, 2, 3];
    let i = 0;
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.subscribe(
      (x: number) => {
        expect(x).to.equal(expects[i++]);
        if (i === 3) {
          subject.complete();
        }
      },
      (err: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should replay values and complete', (done: MochaDone) => {
    const subject = new ReplaySubject<number>();
    const expects = [1, 2, 3];
    let i = 0;
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.complete();
    subject.subscribe(
      (x: number) => {
        expect(x).to.equal(expects[i++]);
      },
      null,
      done
    );
  });

  it('should replay values and error', (done: MochaDone) => {
    const subject = new ReplaySubject<number>();
    const expects = [1, 2, 3];
    let i = 0;
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.error('fooey');
    subject.subscribe(
      (x: number) => {
        expect(x).to.equal(expects[i++]);
      },
      (err: any) => {
        expect(err).to.equal('fooey');
        done();
      }
    );
  });

  it('should only replay values within its buffer size', (done: MochaDone) => {
    const subject = new ReplaySubject<number>(2);
    const expects = [2, 3];
    let i = 0;
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.subscribe(
      (x: number) => {
        expect(x).to.equal(expects[i++]);
        if (i === 2) {
          subject.complete();
        }
      },
      (err: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  describe('with bufferSize=2', () => {
    it('should replay 2 previous values when subscribed', () => {
      const replaySubject = new ReplaySubject<string>(2);
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: string) {
        replaySubject.error(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.complete();
      }

      const sourceTemplate = '-1-2-3----4------5-6---7--8----9--|';
      const subscriber1 = hot('      (a|)                         ').pipe(
        mergeMapTo(replaySubject)
      );
      const unsub1 = '                     !             ';
      const expected1 = '      (23)4------5-6--             ';
      const subscriber2 = hot('            (b|)                   ').pipe(
        mergeMapTo(replaySubject)
      );
      const unsub2 = '                         !         ';
      const expected2 = '            (34)-5-6---7--         ';
      const subscriber3 = hot('                           (c|)    ').pipe(
        mergeMapTo(replaySubject)
      );
      const expected3 = '                           (78)9--|';

      expectObservable(
        hot(sourceTemplate).pipe(
          tap(
            feedNextIntoSubject,
            feedErrorIntoSubject,
            feedCompleteIntoSubject
          )
        )
      ).toBe(sourceTemplate);
      expectObservable(subscriber1, unsub1).toBe(expected1);
      expectObservable(subscriber2, unsub2).toBe(expected2);
      expectObservable(subscriber3).toBe(expected3);
    });

    it('should replay 2 last values for when subscribed after completed', () => {
      const replaySubject = new ReplaySubject<string>(2);
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: string) {
        replaySubject.error(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.complete();
      }

      const sourceTemplate = '-1-2-3--4--|';
      const subscriber1 = hot('               (a|) ').pipe(
        mergeMapTo(replaySubject)
      );
      const expected1 = '               (34|)';

      expectObservable(
        hot(sourceTemplate).pipe(
          tap(
            feedNextIntoSubject,
            feedErrorIntoSubject,
            feedCompleteIntoSubject
          )
        )
      ).toBe(sourceTemplate);
      expectObservable(subscriber1).toBe(expected1);
    });

    it(
      'should handle subscribers that arrive and leave at different times, ' +
        'subject does not complete',
      () => {
        const subject = new ReplaySubject<number>(2);
        const results1: (number | string)[] = [];
        const results2: (number | string)[] = [];
        const results3: (number | string)[] = [];

        subject.next(1);
        subject.next(2);
        subject.next(3);
        subject.next(4);

        const subscription1 = subject.subscribe(
          (x: number) => {
            results1.push(x);
          },
          (err: any) => {
            results1.push('E');
          },
          () => {
            results1.push('C');
          }
        );

        subject.next(5);

        const subscription2 = subject.subscribe(
          (x: number) => {
            results2.push(x);
          },
          (err: any) => {
            results2.push('E');
          },
          () => {
            results2.push('C');
          }
        );

        subject.next(6);
        subject.next(7);

        subscription1.unsubscribe();

        subject.next(8);

        subscription2.unsubscribe();

        subject.next(9);
        subject.next(10);

        const subscription3 = subject.subscribe(
          (x: number) => {
            results3.push(x);
          },
          (err: any) => {
            results3.push('E');
          },
          () => {
            results3.push('C');
          }
        );

        subject.next(11);

        subscription3.unsubscribe();

        expect(results1).to.deep.equal([3, 4, 5, 6, 7]);
        expect(results2).to.deep.equal([4, 5, 6, 7, 8]);
        expect(results3).to.deep.equal([9, 10, 11]);

        subject.complete();
      }
    );
  });

  describe('with windowTime=40', () => {
    it('should replay previous values since 40 time units ago when subscribed', () => {
      const replaySubject = new ReplaySubject<string>(
        Number.POSITIVE_INFINITY,
        40,
        rxTestScheduler
      );
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: any) {
        replaySubject.error(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.complete();
      }

      const sourceTemplate = '-1-2-3----4------5-6----7-8----9--|';
      const subscriber1 = hot('      (a|)                         ').pipe(
        mergeMapTo(replaySubject)
      );
      const unsub1 = '                     !             ';
      const expected1 = '      (23)4------5-6--             ';
      const subscriber2 = hot('            (b|)                   ').pipe(
        mergeMapTo(replaySubject)
      );
      const unsub2 = '                         !         ';
      const expected2 = '            4----5-6----7-         ';
      const subscriber3 = hot('                           (c|)    ').pipe(
        mergeMapTo(replaySubject)
      );
      const expected3 = '                           (78)9--|';

      expectObservable(
        hot(sourceTemplate).pipe(
          tap(
            feedNextIntoSubject,
            feedErrorIntoSubject,
            feedCompleteIntoSubject
          )
        )
      ).toBe(sourceTemplate);
      expectObservable(subscriber1, unsub1).toBe(expected1);
      expectObservable(subscriber2, unsub2).toBe(expected2);
      expectObservable(subscriber3).toBe(expected3);
    });

    it('should replay last values since 40 time units ago when subscribed', () => {
      const replaySubject = new ReplaySubject<string>(
        Number.POSITIVE_INFINITY,
        40,
        rxTestScheduler
      );
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: any) {
        replaySubject.error(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.complete();
      }

      const sourceTemplate = '-1-2-3----4|';
      const subscriber1 = hot('             (a|)').pipe(
        mergeMapTo(replaySubject)
      );
      const expected1 = '             (4|)';

      expectObservable(
        hot(sourceTemplate).pipe(
          tap(
            feedNextIntoSubject,
            feedErrorIntoSubject,
            feedCompleteIntoSubject
          )
        )
      ).toBe(sourceTemplate);
      expectObservable(subscriber1).toBe(expected1);
    });

    it('should only replay bufferSize items when 40 time units ago more were emited', () => {
      const replaySubject = new ReplaySubject<string>(2, 40, rxTestScheduler);
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: any) {
        replaySubject.error(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.complete();
      }

      const sourceTemplate = '1234     |';
      const subscriber1 = hot('    (a|)').pipe(mergeMapTo(replaySubject));
      const expected1 = '    (34) |';

      expectObservable(
        hot(sourceTemplate).pipe(
          tap(
            feedNextIntoSubject,
            feedErrorIntoSubject,
            feedCompleteIntoSubject
          )
        )
      ).toBe(sourceTemplate);
      expectObservable(subscriber1).toBe(expected1);
    });
  });

  it('should be an Observer which can be given to Observable.subscribe', () => {
    const source = of(1, 2, 3, 4, 5);
    const subject = new ReplaySubject<number>(3);
    let results: (number | string)[] = [];

    subject.subscribe(
      x => results.push(x),
      null,
      () => results.push('done')
    );

    source.subscribe(subject);

    expect(results).to.deep.equal([1, 2, 3, 4, 5, 'done']);

    results = [];

    subject.subscribe(
      x => results.push(x),
      null,
      () => results.push('done')
    );

    expect(results).to.deep.equal([3, 4, 5, 'done']);
  });
});
