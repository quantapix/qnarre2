import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';
//import {hot, expectSource} from '../helpers/marble-testing';
//import {asInteropSubject} from '../helpers/interop-helper';
//import {TestScheduler} from '../../testing/TestScheduler';

describe('Subscription', () => {
  describe('Subscription.add()', () => {
    it('Should return self if the self is passed', () => {
      const sub = new qj.Subscription();
      const ret = sub.add(sub);
      expect(ret).toBe(sub);
    });
    it('Should return qj.Subscription.fake if it is passed', () => {
      const sub = new qj.Subscription();
      const ret = sub.add(qj.Subscription.fake);
      expect(ret).toBe(qj.Subscription.fake);
    });
    it('Should return qj.Subscription.fake if it is called with `void` value', () => {
      const sub = new qj.Subscription();
      const ret = sub.add(undefined);
      expect(ret).toBe(qj.Subscription.fake);
    });
    it('Should return a new qj.Subscription created with teardown function if it is passed a function', () => {
      const sub = new qj.Subscription();
      let isCalled = false;
      const ret = sub.add(function () {
        isCalled = true;
      });
      ret.unsubscribe();
      expect(isCalled).toBe(true);
    });
    it('Should wrap the Anonymousqj.Subscription and return a subscription that unsubscribes and removes it when unsubbed', () => {
      const sub: any = new qj.Subscription();
      let called = false;
      const arg = {
        unsubscribe: () => (called = true)
      };
      const ret = sub.add(arg);
      expect(called).toBe(false);
      expect(sub._subscriptions.length).toBe(1);
      ret.unsubscribe();
      expect(called).toBe(true);
      expect(sub._subscriptions.length).toBe(0);
    });
    it('Should return the passed one if passed a Anonymousqj.Subscription having not function `unsubscribe` member', () => {
      const sub = new qj.Subscription();
      const arg = {
        isUnsubscribed: false,
        unsubscribe: undefined as any
      };
      const ret = sub.add(arg as any);
      expect(ret).toBe(arg);
    });
    it('Should return the passed one if the self has been unsubscribed', () => {
      const main = new qj.Subscription();
      main.unsubscribe();
      const child = new qj.Subscription();
      const ret = main.add(child);
      expect(ret).toBe(child);
    });
    it('Should unsubscribe the passed one if the self has been unsubscribed', () => {
      const main = new qj.Subscription();
      main.unsubscribe();
      let isCalled = false;
      const child = new qj.Subscription(() => {
        isCalled = true;
      });
      main.add(child);
      expect(isCalled).toBe(true);
    });
  });
  describe('Subscription.unsubscribe()', () => {
    it('Should unsubscribe from all subscriptions, when some of them throw', done => {
      const tearDowns: number[] = [];
      const source1 = new qs.Source(() => {
        return () => {
          tearDowns.push(1);
        };
      });
      const source2 = new qs.Source(() => {
        return () => {
          tearDowns.push(2);
          throw new Error('oops, I am a bad unsubscribe!');
        };
      });
      const source3 = new qs.Source(() => {
        return () => {
          tearDowns.push(3);
        };
      });
      const subscription = merge(source1, source2, source3).subscribe();
      setTimeout(() => {
        expect(() => {
          subscription.unsubscribe();
        }).toThrow(qu.UnsubscribeError);
        expect(tearDowns).toEqual([1, 2, 3]);
        done();
      });
    });
    it('Should unsubscribe from all subscriptions, when adding a bad custom subscription to a subscription', done => {
      const tearDowns: number[] = [];
      const sub = new qj.Subscription();
      const source1 = new qs.Source(() => {
        return () => {
          tearDowns.push(1);
        };
      });
      const source2 = new qs.Source(() => {
        return () => {
          tearDowns.push(2);
          sub.add(<any>{
            unsubscribe: () => {
              expect(sub.closed).toBeTrue;
              throw new Error('Who is your daddy, and what does he do?');
            }
          });
        };
      });
      const source3 = new qs.Source(() => {
        return () => {
          tearDowns.push(3);
        };
      });
      sub.add(merge(source1, source2, source3).subscribe());
      setTimeout(() => {
        expect(() => {
          sub.unsubscribe();
        }).toThrow(qu.UnsubscribeError);
        expect(tearDowns).toEqual([1, 2, 3]);
        done();
      });
    });
  });
});

describe('Subscriber', () => {
  it('should ignore next messages after unsubscription', () => {
    let times = 0;
    const sub = new qj.Subscriber({
      next() {
        times += 1;
      }
    });
    sub.next();
    sub.next();
    sub.unsubscribe();
    sub.next();
    expect(times).toBe(2);
  });
  it('should wrap unsafe observers in a safe subscriber', () => {
    const observer = {
      next(x: any) {
        /* noop */
      },
      fail(err: any) {
        /* noop */
      },
      done() {
        /* noop */
      }
    };
    const subscriber = new qj.Subscriber(observer);
    expect((subscriber as any).destination).not.toBe(observer);
    expect((subscriber as any).destination).to.be.an.instanceof(qj.Proxy);
  });
  it('should ignore error messages after unsubscription', () => {
    let times = 0;
    let errorCalled = false;
    const sub = new qj.Subscriber({
      next() {
        times += 1;
      },
      fail() {
        errorCalled = true;
      }
    });
    sub.next();
    sub.next();
    sub.unsubscribe();
    sub.next();
    sub.fail();
    expect(times).toBe(2);
    expect(errorCalled).toBeFalse;
  });
  it('should ignore complete messages after unsubscription', () => {
    let times = 0;
    let completeCalled = false;
    const sub = new qj.Subscriber({
      next() {
        times += 1;
      },
      done() {
        completeCalled = true;
      }
    });
    sub.next();
    sub.next();
    sub.unsubscribe();
    sub.next();
    sub.done();
    expect(times).toBe(2);
    expect(completeCalled).toBeFalse;
  });
  it('should not be closed when other subscriber with same observer instance completes', () => {
    const observer = {
      next: function () {
        /*noop*/
      }
    };
    const sub1 = new qj.Subscriber(observer);
    const sub2 = new qj.Subscriber(observer);
    sub2.done();
    expect(sub1.closed).toBeFalse;
    expect(sub2.closed).toBeTrue;
  });
  it('should call complete observer without any arguments', () => {
    let argument: Array<any> | null = null;
    const observer = {
      complete: (...args: Array<any>) => {
        argument = args;
      }
    };
    const sub1 = new qj.Subscriber(observer);
    sub1.done();
    expect(argument).to.have.lengthOf(0);
  });
});

describe('Subject', () => {
  it('should allow next with empty, undefined or any when created with no type', (done: MochaDone) => {
    const subject = new Subject();
    subject.subscribe(
      x => {
        expect(x).to.be.a('undefined');
      },
      null,
      done
    );

    const data: any = undefined;
    subject.next();
    subject.next(undefined);
    subject.next(data);
    subject.complete();
  });

  it('should allow empty next when created with void type', (done: MochaDone) => {
    const subject = new Subject<void>();
    subject.subscribe(
      x => {
        expect(x).to.be.a('undefined');
      },
      null,
      done
    );

    subject.next();
    subject.complete();
  });

  it('should pump values right on through itself', (done: MochaDone) => {
    const subject = new Subject<string>();
    const expected = ['foo', 'bar'];

    subject.subscribe(
      (x: string) => {
        expect(x).to.equal(expected.shift());
      },
      null,
      done
    );

    subject.next('foo');
    subject.next('bar');
    subject.complete();
  });

  it('should pump values to multiple subscribers', (done: MochaDone) => {
    const subject = new Subject<string>();
    const expected = ['foo', 'bar'];

    let i = 0;
    let j = 0;

    subject.subscribe(function (x) {
      expect(x).to.equal(expected[i++]);
    });

    subject.subscribe(
      function (x) {
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

  it(
    'should handle subscribers that arrive and leave at different times, ' +
      'subject does not complete',
    () => {
      const subject = new Subject<number>();
      const results1: (number | string)[] = [];
      const results2: (number | string)[] = [];
      const results3: (number | string)[] = [];

      subject.next(1);
      subject.next(2);
      subject.next(3);
      subject.next(4);

      const subscription1 = subject.subscribe(
        function (x) {
          results1.push(x);
        },
        function (e) {
          results1.push('E');
        },
        () => {
          results1.push('C');
        }
      );

      subject.next(5);

      const subscription2 = subject.subscribe(
        function (x) {
          results2.push(x);
        },
        function (e) {
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
        function (x) {
          results3.push(x);
        },
        function (e) {
          results3.push('E');
        },
        () => {
          results3.push('C');
        }
      );

      subject.next(11);

      subscription3.unsubscribe();

      expect(results1).to.deep.equal([5, 6, 7]);
      expect(results2).to.deep.equal([6, 7, 8]);
      expect(results3).to.deep.equal([11]);
    }
  );

  it(
    'should handle subscribers that arrive and leave at different times, ' +
      'subject completes',
    () => {
      const subject = new Subject<number>();
      const results1: (number | string)[] = [];
      const results2: (number | string)[] = [];
      const results3: (number | string)[] = [];

      subject.next(1);
      subject.next(2);
      subject.next(3);
      subject.next(4);

      const subscription1 = subject.subscribe(
        function (x) {
          results1.push(x);
        },
        function (e) {
          results1.push('E');
        },
        () => {
          results1.push('C');
        }
      );

      subject.next(5);

      const subscription2 = subject.subscribe(
        function (x) {
          results2.push(x);
        },
        function (e) {
          results2.push('E');
        },
        () => {
          results2.push('C');
        }
      );

      subject.next(6);
      subject.next(7);

      subscription1.unsubscribe();

      subject.complete();

      subscription2.unsubscribe();

      const subscription3 = subject.subscribe(
        function (x) {
          results3.push(x);
        },
        function (e) {
          results3.push('E');
        },
        () => {
          results3.push('C');
        }
      );

      subscription3.unsubscribe();

      expect(results1).to.deep.equal([5, 6, 7]);
      expect(results2).to.deep.equal([6, 7, 'C']);
      expect(results3).to.deep.equal(['C']);
    }
  );

  it(
    'should handle subscribers that arrive and leave at different times, ' +
      'subject terminates with an error',
    () => {
      const subject = new Subject<number>();
      const results1: (number | string)[] = [];
      const results2: (number | string)[] = [];
      const results3: (number | string)[] = [];

      subject.next(1);
      subject.next(2);
      subject.next(3);
      subject.next(4);

      const subscription1 = subject.subscribe(
        function (x) {
          results1.push(x);
        },
        function (e) {
          results1.push('E');
        },
        () => {
          results1.push('C');
        }
      );

      subject.next(5);

      const subscription2 = subject.subscribe(
        function (x) {
          results2.push(x);
        },
        function (e) {
          results2.push('E');
        },
        () => {
          results2.push('C');
        }
      );

      subject.next(6);
      subject.next(7);

      subscription1.unsubscribe();

      subject.error(new Error('err'));

      subscription2.unsubscribe();

      const subscription3 = subject.subscribe(
        function (x) {
          results3.push(x);
        },
        function (e) {
          results3.push('E');
        },
        () => {
          results3.push('C');
        }
      );

      subscription3.unsubscribe();

      expect(results1).to.deep.equal([5, 6, 7]);
      expect(results2).to.deep.equal([6, 7, 'E']);
      expect(results3).to.deep.equal(['E']);
    }
  );

  it(
    'should handle subscribers that arrive and leave at different times, ' +
      'subject completes before nexting any value',
    () => {
      const subject = new Subject<number>();
      const results1: (number | string)[] = [];
      const results2: (number | string)[] = [];
      const results3: (number | string)[] = [];

      const subscription1 = subject.subscribe(
        function (x) {
          results1.push(x);
        },
        function (e) {
          results1.push('E');
        },
        () => {
          results1.push('C');
        }
      );

      const subscription2 = subject.subscribe(
        function (x) {
          results2.push(x);
        },
        function (e) {
          results2.push('E');
        },
        () => {
          results2.push('C');
        }
      );

      subscription1.unsubscribe();

      subject.complete();

      subscription2.unsubscribe();

      const subscription3 = subject.subscribe(
        function (x) {
          results3.push(x);
        },
        function (e) {
          results3.push('E');
        },
        () => {
          results3.push('C');
        }
      );

      subscription3.unsubscribe();

      expect(results1).to.deep.equal([]);
      expect(results2).to.deep.equal(['C']);
      expect(results3).to.deep.equal(['C']);
    }
  );

  it('should disallow new subscriber once subject has been disposed', () => {
    const subject = new Subject<number>();
    const results1: (number | string)[] = [];
    const results2: (number | string)[] = [];
    const results3: (number | string)[] = [];

    const subscription1 = subject.subscribe(
      function (x) {
        results1.push(x);
      },
      function (e) {
        results1.push('E');
      },
      () => {
        results1.push('C');
      }
    );

    subject.next(1);
    subject.next(2);

    const subscription2 = subject.subscribe(
      function (x) {
        results2.push(x);
      },
      function (e) {
        results2.push('E');
      },
      () => {
        results2.push('C');
      }
    );

    subject.next(3);
    subject.next(4);
    subject.next(5);

    subscription1.unsubscribe();
    subscription2.unsubscribe();
    subject.unsubscribe();

    expect(() => {
      subject.subscribe(
        function (x) {
          results3.push(x);
        },
        function (err) {
          expect(false).to.equal('should not throw error: ' + err.toString());
        }
      );
    }).to.throw(UnsubscribedError);

    expect(results1).to.deep.equal([1, 2, 3, 4, 5]);
    expect(results2).to.deep.equal([3, 4, 5]);
    expect(results3).to.deep.equal([]);
  });

  it('should not allow values to be nexted after it is unsubscribed', (done: MochaDone) => {
    const subject = new Subject<string>();
    const expected = ['foo'];

    subject.subscribe(function (x) {
      expect(x).to.equal(expected.shift());
    });

    subject.next('foo');
    subject.unsubscribe();
    expect(() => subject.next('bar')).to.throw(UnsubscribedError);
    done();
  });

  it('should clean out unsubscribed subscribers', (done: MochaDone) => {
    const subject = new Subject();

    const sub1 = subject.subscribe(function (x) {
      //noop
    });

    const sub2 = subject.subscribe(function (x) {
      //noop
    });

    expect(subject.observers.length).to.equal(2);
    sub1.unsubscribe();
    expect(subject.observers.length).to.equal(1);
    sub2.unsubscribe();
    expect(subject.observers.length).to.equal(0);
    done();
  });

  it('should have a static create function that works', () => {
    expect(Subject.create).to.be.a('function');
    const source = of(1, 2, 3, 4, 5);
    const nexts: number[] = [];
    const output: number[] = [];

    let error: any;
    let complete = false;
    let outputComplete = false;

    const destination = {
      closed: false,
      next: function (x: number) {
        nexts.push(x);
      },
      error: function (err: any) {
        error = err;
        this.closed = true;
      },
      complete: function () {
        complete = true;
        this.closed = true;
      }
    };

    const sub = Subject.create(destination, source);

    sub.subscribe(
      function (x: number) {
        output.push(x);
      },
      null,
      () => {
        outputComplete = true;
      }
    );

    sub.next('a');
    sub.next('b');
    sub.next('c');
    sub.complete();

    expect(nexts).to.deep.equal(['a', 'b', 'c']);
    expect(complete).to.be.true;
    expect(error).to.be.a('undefined');

    expect(output).to.deep.equal([1, 2, 3, 4, 5]);
    expect(outputComplete).to.be.true;
  });

  it('should have a static create function that works also to raise errors', () => {
    expect(Subject.create).to.be.a('function');
    const source = of(1, 2, 3, 4, 5);
    const nexts: number[] = [];
    const output: number[] = [];

    let error: any;
    let complete = false;
    let outputComplete = false;

    const destination = {
      closed: false,
      next: function (x: number) {
        nexts.push(x);
      },
      error: function (err: any) {
        error = err;
        this.closed = true;
      },
      complete: function () {
        complete = true;
        this.closed = true;
      }
    };

    const sub = Subject.create(destination, source);

    sub.subscribe(
      function (x: number) {
        output.push(x);
      },
      null,
      () => {
        outputComplete = true;
      }
    );

    sub.next('a');
    sub.next('b');
    sub.next('c');
    sub.error('boom');

    expect(nexts).to.deep.equal(['a', 'b', 'c']);
    expect(complete).to.be.false;
    expect(error).to.equal('boom');

    expect(output).to.deep.equal([1, 2, 3, 4, 5]);
    expect(outputComplete).to.be.true;
  });

  it('should be an Observer which can be given to Observable.subscribe', (done: MochaDone) => {
    const source = of(1, 2, 3, 4, 5);
    const subject = new Subject<number>();
    const expected = [1, 2, 3, 4, 5];

    subject.subscribe(
      function (x) {
        expect(x).to.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );

    source.subscribe(subject);
  });

  it('should be usable as an Observer of a finite delayed Observable', (done: MochaDone) => {
    const source = of(1, 2, 3).pipe(delay(50));
    const subject = new Subject<number>();

    const expected = [1, 2, 3];

    subject.subscribe(
      function (x) {
        expect(x).to.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );

    source.subscribe(subject);
  });

  it('should throw UnsubscribedError when emit after unsubscribed', () => {
    const subject = new Subject<string>();
    subject.unsubscribe();

    expect(() => {
      subject.next('a');
    }).to.throw(UnsubscribedError);

    expect(() => {
      subject.error('a');
    }).to.throw(UnsubscribedError);

    expect(() => {
      subject.complete();
    }).to.throw(UnsubscribedError);
  });

  it('should not next after completed', () => {
    const subject = new Subject<string>();
    const results: string[] = [];
    subject.subscribe(
      x => results.push(x),
      null,
      () => results.push('C')
    );
    subject.next('a');
    subject.complete();
    subject.next('b');
    expect(results).to.deep.equal(['a', 'C']);
  });

  it('should not next after error', () => {
    const error = new Error('wut?');
    const subject = new Subject<string>();
    const results: string[] = [];
    subject.subscribe(
      x => results.push(x),
      err => results.push(err)
    );
    subject.next('a');
    subject.error(error);
    subject.next('b');
    expect(results).to.deep.equal(['a', error]);
  });

  describe('asObservable', () => {
    it('should hide subject', () => {
      const subject = new Subject();
      const observable = subject.asObservable();

      expect(subject).not.to.equal(observable);

      expect(observable instanceof Observable).to.be.true;
      expect(observable instanceof Subject).to.be.false;
    });

    it('should handle subject never emits', () => {
      const observable = hot('-').asObservable();

      expectObservable(observable).toBe(<any>[]);
    });

    it('should handle subject completes without emits', () => {
      const observable = hot('--^--|').asObservable();
      const expected = '---|';

      expectObservable(observable).toBe(expected);
    });

    it('should handle subject throws', () => {
      const observable = hot('--^--#').asObservable();
      const expected = '---#';

      expectObservable(observable).toBe(expected);
    });

    it('should handle subject emits', () => {
      const observable = hot('--^--x--|').asObservable();
      const expected = '---x--|';

      expectObservable(observable).toBe(expected);
    });

    it('should work with inherited subject', () => {
      const results: (number | string)[] = [];
      const subject = new Async<number>();

      subject.next(42);
      subject.complete();

      const observable = subject.asObservable();

      observable.subscribe(
        x => results.push(x),
        null,
        () => results.push('done')
      );

      expect(results).to.deep.equal([42, 'done']);
    });
  });
});

describe('Anonymous', () => {
  it('should be exposed', () => {
    expect(Anonymous).to.be.a('function');
  });

  it('should not eager', () => {
    let subscribed = false;

    const subject = Subject.create(
      null,
      new Observable((observer: Observer<any>) => {
        subscribed = true;
        const subscription = of('x').subscribe(observer);
        return () => {
          subscription.unsubscribe();
        };
      })
    );

    const observable = subject.asObservable();
    expect(subscribed).to.be.false;

    observable.subscribe();
    expect(subscribed).to.be.true;
  });
});

describe('Async', () => {
  it('should emit the last value when complete', () => {
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);
    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.next(2);
    expect(observer.results).toEqual([]);
    subject.done();
    expect(observer.results).toEqual([2, 'done']);
  });
  it('should emit the last value when subscribing after complete', () => {
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    subject.next(1);
    subject.next(2);
    subject.done();
    subject.subscribe(observer);
    expect(observer.results).toEqual([2, 'done']);
  });
  it('should keep emitting the last value to subsequent subscriptions', () => {
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);
    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.next(2);
    expect(observer.results).toEqual([]);
    subject.done();
    expect(observer.results).toEqual([2, 'done']);
    subscription.unsubscribe();
    observer.results = [];
    subject.subscribe(observer);
    expect(observer.results).toEqual([2, 'done']);
  });
  it('should not emit values after complete', () => {
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);
    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.next(2);
    expect(observer.results).toEqual([]);
    subject.done();
    subject.next(3);
    expect(observer.results).toEqual([2, 'done']);
  });
  it('should not allow change value after complete', () => {
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    const otherObserver = new TestObserver();
    subject.subscribe(observer);
    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.done();
    expect(observer.results).toEqual([1, 'done']);
    subject.next(2);
    subject.subscribe(otherObserver);
    expect(otherObserver.results).toEqual([1, 'done']);
  });
  it('should not emit values if unsubscribed before complete', () => {
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);
    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.next(2);
    expect(observer.results).toEqual([]);
    subscription.unsubscribe();
    subject.next(3);
    expect(observer.results).toEqual([]);
    subject.done();
    expect(observer.results).toEqual([]);
  });
  it('should just complete if no value has been nexted into it', () => {
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);
    expect(observer.results).toEqual([]);
    subject.done();
    expect(observer.results).toEqual(['done']);
  });
  it('should keep emitting complete to subsequent subscriptions', () => {
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);
    expect(observer.results).toEqual([]);
    subject.done();
    expect(observer.results).toEqual(['done']);
    subscription.unsubscribe();
    observer.results = [];
    subject.fail(new Error(''));
    subject.subscribe(observer);
    expect(observer.results).toEqual(['done']);
  });
  it('should only error if an error is passed into it', () => {
    const expected = new Error('bad');
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    subject.subscribe(observer);
    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.fail(expected);
    expect(observer.results).toEqual([expected]);
  });
  it('should keep emitting error to subsequent subscriptions', () => {
    const expected = new Error('bad');
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);
    subject.next(1);
    expect(observer.results).toEqual([]);
    subject.fail(expected);
    expect(observer.results).toEqual([expected]);
    subscription.unsubscribe();
    observer.results = [];
    subject.subscribe(observer);
    expect(observer.results).toEqual([expected]);
  });
  it('should not allow send complete after error', () => {
    const expected = new Error('bad');
    const subject = new qj.Async<number>();
    const observer = new TestObserver();
    const subscription = subject.subscribe(observer);

    subject.next(1);
    expect(observer.results).toEqual([]);

    subject.fail(expected);
    expect(observer.results).toEqual([expected]);

    subscription.unsubscribe();

    observer.results = [];

    subject.done();
    subject.subscribe(observer);
    expect(observer.results).toEqual([expected]);
  });
});

describe('Behavior', () => {
  it('should extend Subject', () => {
    const subject = new Behavior(null);
    expect(subject).to.be.instanceof(Subject);
  });

  it('should throw if it has received an error and getValue() is called', () => {
    const subject = new Behavior(null);
    subject.fail(new Error('derp'));
    expect(() => {
      subject.getValue();
    }).toThrow(Error, 'derp');
  });

  it(
    'should throw an UnsubscribedError if getValue() is called ' +
      'and the Behavior has been unsubscribed',
    () => {
      const subject = new Behavior('hi there');
      subject.unsubscribe();
      expect(() => {
        subject.getValue();
      }).toThrow(UnsubscribedError);
    }
  );

  it('should have a getValue() method to retrieve the current value', () => {
    const subject = new Behavior('staltz');
    expect(subject.getValue()).toBe('staltz');

    subject.next('oj');

    expect(subject.getValue()).toBe('oj');
  });

  it('should not allow you to set `value` directly', () => {
    const subject = new Behavior('flibberty');

    try {
      // XXX: escape from readonly restriction for testing.
      (subject as any).value = 'jibbets';
    } catch (e) {
      //noop
    }

    expect(subject.getValue()).toBe('flibberty');
    expect(subject.value).toBe('flibberty');
  });

  it('should still allow you to retrieve the value from the value property', () => {
    const subject = new Behavior('fuzzy');
    expect(subject.value).toBe('fuzzy');
    subject.next('bunny');
    expect(subject.value).toBe('bunny');
  });

  it('should start with an initialization value', (done: MochaDone) => {
    const subject = new Behavior('foo');
    const expected = ['foo', 'bar'];
    let i = 0;

    subject.subscribe(
      (x: string) => {
        expect(x).toBe(expected[i++]);
      },
      null,
      done
    );

    subject.next('bar');
    subject.done();
  });

  it('should pump values to multiple subscribers', (done: MochaDone) => {
    const subject = new Behavior('init');
    const expected = ['init', 'foo', 'bar'];
    let i = 0;
    let j = 0;

    subject.subscribe((x: string) => {
      expect(x).toBe(expected[i++]);
    });

    subject.subscribe(
      (x: string) => {
        expect(x).toBe(expected[j++]);
      },
      null,
      done
    );

    expect(subject.observers.length).toBe(2);
    subject.next('foo');
    subject.next('bar');
    subject.done();
  });

  it('should not pass values nexted after a complete', () => {
    const subject = new Behavior('init');
    const results: string[] = [];

    subject.subscribe((x: string) => {
      results.push(x);
    });
    expect(results).toEqual(['init']);

    subject.next('foo');
    expect(results).toEqual(['init', 'foo']);

    subject.done();
    expect(results).toEqual(['init', 'foo']);

    subject.next('bar');
    expect(results).toEqual(['init', 'foo']);
  });

  it('should clean out unsubscribed subscribers', (done: MochaDone) => {
    const subject = new Behavior('init');

    const sub1 = subject.subscribe((x: string) => {
      expect(x).toBe('init');
    });

    const sub2 = subject.subscribe((x: string) => {
      expect(x).toBe('init');
    });

    expect(subject.observers.length).toBe(2);
    sub1.unsubscribe();
    expect(subject.observers.length).toBe(1);
    sub2.unsubscribe();
    expect(subject.observers.length).toBe(0);
    done();
  });

  it('should replay the previous value when subscribed', () => {
    const behaviorSubject = new Behavior('0');
    function feedNextIntoSubject(x: string) {
      behaviorSubject.next(x);
    }
    function feedErrorIntoSubject(err: any) {
      behaviorSubject.fail(err);
    }
    function feedCompleteIntoSubject() {
      behaviorSubject.done();
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

    expectqs
      .Source(
        hot(sourceTemplate).pipe(
          tap(
            feedNextIntoSubject,
            feedErrorIntoSubject,
            feedCompleteIntoSubject
          )
        )
      )
      .toBe(sourceTemplate);
    expectqs.Source(subscriber1, unsub1).toBe(expected1);
    expectqs.Source(subscriber2, unsub2).toBe(expected2);
    expectqs.Source(subscriber3).toBe(expected3);
  });

  it('should emit complete when subscribed after completed', () => {
    const behaviorSubject = new Behavior('0');
    function feedNextIntoSubject(x: string) {
      behaviorSubject.next(x);
    }
    function feedErrorIntoSubject(err: any) {
      behaviorSubject.fail(err);
    }
    function feedCompleteIntoSubject() {
      behaviorSubject.done();
    }

    const sourceTemplate = '-1-2-3--4--|';
    const subscriber1 = hot('               (a|)').pipe(
      mergeMapTo(behaviorSubject)
    );
    const expected1 = '               |   ';

    expectqs
      .Source(
        hot(sourceTemplate).pipe(
          tap(
            feedNextIntoSubject,
            feedErrorIntoSubject,
            feedCompleteIntoSubject
          )
        )
      )
      .toBe(sourceTemplate);
    expectqs.Source(subscriber1).toBe(expected1);
  });

  it('should be an qt.Observer which can be given to qs.Source.subscribe', (done: MochaDone) => {
    const source = of(1, 2, 3, 4, 5);
    const subject = new Behavior(0);
    const expected = [0, 1, 2, 3, 4, 5];

    subject.subscribe(
      (x: number) => {
        expect(x).toBe(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(subject.value).toBe(5);
        done();
      }
    );

    source.subscribe(subject);
  });

  it.skip('should be an qt.Observer which can be given to an interop source', (done: MochaDone) => {
    // This test reproduces a bug reported in this issue:
    // https://github.com/ReactiveX/rxjs/issues/5105
    // However, it cannot easily be fixed. See this comment:
    // https://github.com/ReactiveX/rxjs/issues/5105#issuecomment-578405446
    const source = of(1, 2, 3, 4, 5);
    const subject = new Behavior(0);
    const expected = [0, 1, 2, 3, 4, 5];

    subject.subscribe(
      (x: number) => {
        expect(x).toBe(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(subject.value).toBe(5);
        done();
      }
    );

    source.subscribe(asInteropSubject(subject));
  });
});

describe('Replay', () => {
  it('should extend Subject', () => {
    const subject = new qj.Replay();
    expect(subject).to.be.instanceof(Subject);
  });

  it('should add the observer before running subscription code', () => {
    const subject = new qj.Replay<number>();
    subject.next(1);
    const results: number[] = [];

    subject.subscribe(value => {
      results.push(value);
      if (value < 3) {
        subject.next(value + 1);
      }
    });

    expect(results).toEqual([1, 2, 3]);
  });

  it('should replay values upon subscription', (done: MochaDone) => {
    const subject = new qj.Replay<number>();
    const expects = [1, 2, 3];
    let i = 0;
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.subscribe(
      (x: number) => {
        expect(x).toBe(expects[i++]);
        if (i === 3) {
          subject.done();
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
    const subject = new qj.Replay<number>();
    const expects = [1, 2, 3];
    let i = 0;
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.done();
    subject.subscribe(
      (x: number) => {
        expect(x).toBe(expects[i++]);
      },
      null,
      done
    );
  });

  it('should replay values and error', (done: MochaDone) => {
    const subject = new qj.Replay<number>();
    const expects = [1, 2, 3];
    let i = 0;
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.fail('fooey');
    subject.subscribe(
      (x: number) => {
        expect(x).toBe(expects[i++]);
      },
      (err: any) => {
        expect(err).toBe('fooey');
        done();
      }
    );
  });

  it('should only replay values within its buffer size', (done: MochaDone) => {
    const subject = new qj.Replay<number>(2);
    const expects = [2, 3];
    let i = 0;
    subject.next(1);
    subject.next(2);
    subject.next(3);
    subject.subscribe(
      (x: number) => {
        expect(x).toBe(expects[i++]);
        if (i === 2) {
          subject.done();
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
      const replaySubject = new qj.Replay<string>(2);
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: string) {
        replaySubject.fail(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.done();
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

      expectqs
        .Source(
          hot(sourceTemplate).pipe(
            tap(
              feedNextIntoSubject,
              feedErrorIntoSubject,
              feedCompleteIntoSubject
            )
          )
        )
        .toBe(sourceTemplate);
      expectqs.Source(subscriber1, unsub1).toBe(expected1);
      expectqs.Source(subscriber2, unsub2).toBe(expected2);
      expectqs.Source(subscriber3).toBe(expected3);
    });

    it('should replay 2 last values for when subscribed after completed', () => {
      const replaySubject = new qj.Replay<string>(2);
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: string) {
        replaySubject.fail(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.done();
      }

      const sourceTemplate = '-1-2-3--4--|';
      const subscriber1 = hot('               (a|) ').pipe(
        mergeMapTo(replaySubject)
      );
      const expected1 = '               (34|)';

      expectqs
        .Source(
          hot(sourceTemplate).pipe(
            tap(
              feedNextIntoSubject,
              feedErrorIntoSubject,
              feedCompleteIntoSubject
            )
          )
        )
        .toBe(sourceTemplate);
      expectqs.Source(subscriber1).toBe(expected1);
    });

    it(
      'should handle subscribers that arrive and leave at different times, ' +
        'subject does not complete',
      () => {
        const subject = new qj.Replay<number>(2);
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

        expect(results1).toEqual([3, 4, 5, 6, 7]);
        expect(results2).toEqual([4, 5, 6, 7, 8]);
        expect(results3).toEqual([9, 10, 11]);

        subject.done();
      }
    );
  });

  describe('with windowTime=40', () => {
    it('should replay previous values since 40 time units ago when subscribed', () => {
      const replaySubject = new qj.Replay<string>(
        Number.POSITIVE_INFINITY,
        40,
        rxTestScheduler
      );
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: any) {
        replaySubject.fail(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.done();
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

      expectqs
        .Source(
          hot(sourceTemplate).pipe(
            tap(
              feedNextIntoSubject,
              feedErrorIntoSubject,
              feedCompleteIntoSubject
            )
          )
        )
        .toBe(sourceTemplate);
      expectqs.Source(subscriber1, unsub1).toBe(expected1);
      expectqs.Source(subscriber2, unsub2).toBe(expected2);
      expectqs.Source(subscriber3).toBe(expected3);
    });

    it('should replay last values since 40 time units ago when subscribed', () => {
      const replaySubject = new qj.Replay<string>(
        Number.POSITIVE_INFINITY,
        40,
        rxTestScheduler
      );
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: any) {
        replaySubject.fail(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.done();
      }

      const sourceTemplate = '-1-2-3----4|';
      const subscriber1 = hot('             (a|)').pipe(
        mergeMapTo(replaySubject)
      );
      const expected1 = '             (4|)';

      expectqs
        .Source(
          hot(sourceTemplate).pipe(
            tap(
              feedNextIntoSubject,
              feedErrorIntoSubject,
              feedCompleteIntoSubject
            )
          )
        )
        .toBe(sourceTemplate);
      expectqs.Source(subscriber1).toBe(expected1);
    });

    it('should only replay bufferSize items when 40 time units ago more were emited', () => {
      const replaySubject = new qj.Replay<string>(2, 40, rxTestScheduler);
      function feedNextIntoSubject(x: string) {
        replaySubject.next(x);
      }
      function feedErrorIntoSubject(err: any) {
        replaySubject.fail(err);
      }
      function feedCompleteIntoSubject() {
        replaySubject.done();
      }

      const sourceTemplate = '1234     |';
      const subscriber1 = hot('    (a|)').pipe(mergeMapTo(replaySubject));
      const expected1 = '    (34) |';

      expectqs
        .Source(
          hot(sourceTemplate).pipe(
            tap(
              feedNextIntoSubject,
              feedErrorIntoSubject,
              feedCompleteIntoSubject
            )
          )
        )
        .toBe(sourceTemplate);
      expectqs.Source(subscriber1).toBe(expected1);
    });
  });

  it('should be an qt.Observer which can be given to qs.Source.subscribe', () => {
    const source = of(1, 2, 3, 4, 5);
    const subject = new qj.Replay<number>(3);
    let results: (number | string)[] = [];

    subject.subscribe(
      x => results.push(x),
      null,
      () => results.push('done')
    );

    source.subscribe(subject);

    expect(results).toEqual([1, 2, 3, 4, 5, 'done']);

    results = [];

    subject.subscribe(
      x => results.push(x),
      null,
      () => results.push('done')
    );

    expect(results).toEqual([3, 4, 5, 'done']);
  });
});

class TestObserver implements qt.Observer<number> {
  results: (number | string)[] = [];

  next(value: number) {
    this.results.push(value);
  }

  fail(err: any) {
    this.results.push(err);
  }

  done() {
    this.results.push('done');
  }
}

declare const rxTestScheduler: TestScheduler;
