import * as qs from './source';
import * as qt from './types';
import * as qu from './utils';
import * as qj from './subject';
import {a$} from 'helpers';

import {cold, expectSource, expectSubscriptions} from './spec/helpers/marble-testing';

declare const asDiagram: any, rxTestScheduler: any;

function expectFullObserver(val: any) {
  expect(val).to.be.a('object');
  expect(val.next).to.be.a('function');
  expect(val.error).to.be.a('function');
  expect(val.complete).to.be.a('function');
  expect(val.closed).toBe('boolean');
}

describe('Observable', () => {
  let originalConfigPromise: any;
  before(() => (originalConfigPromise = config.Promise));

  after(() => {
    config.Promise = originalConfigPromise;
    originalConfigPromise = null;
  });

  it('should be constructed with a subscriber function', done => {
    const source = new Observable<number>(function (observer) {
      expectFullObserver(observer);
      observer.next(1);
      observer.complete();
    });

    source.subscribe(
      function (x) {
        expect(x).to.equal(1);
      },
      null,
      done
    );
  });

  it('should send errors thrown in the constructor down the error path', done => {
    new Observable<number>(observer => {
      throw new Error('this should be handled');
    }).subscribe({
      error(err) {
        expect(err)
          .to.exist.and.be.instanceof(Error)
          .and.have.property('message', 'this should be handled');
        done();
      }
    });
  });

  it('should allow empty ctor, which is effectively a never-observable', () => {
    const result = new Observable<any>();
    expectSource(result).toBe('-');
  });

  describe('forEach', () => {
    it('should iterate and return a Promise', done => {
      const expected = [1, 2, 3];
      const result = of(1, 2, 3)
        .forEach(function (x) {
          expect(x).to.equal(expected.shift());
        }, Promise)
        .then(() => {
          done();
        });

      expect(result.then).to.be.a('function');
    });

    it('should reject promise when in error', done => {
      throwError('bad')
        .forEach(x => {
          done(new Error('should not be called'));
        }, Promise)
        .then(
          () => {
            done(new Error('should not complete'));
          },
          err => {
            expect(err).to.equal('bad');
            done();
          }
        );
    });

    it('should allow Promise to be globally configured', done => {
      let wasCalled = false;

      config.Promise = function MyPromise(callback: any) {
        wasCalled = true;
        return new Promise<number>(callback);
      } as any;

      of(42)
        .forEach(x => {
          expect(x).to.equal(42);
        })
        .then(() => {
          expect(wasCalled).to.be.true;
          done();
        });
    });

    it('should reject promise if nextHandler throws', done => {
      const results: number[] = [];

      of(1, 2, 3)
        .forEach(x => {
          if (x === 3) {
            throw new Error('NO THREES!');
          }
          results.push(x);
        }, Promise)
        .then(
          () => {
            done(new Error('should not be called'));
          },
          err => {
            expect(err).to.be.an('error', 'NO THREES!');
            expect(results).toEqual([1, 2]);
          }
        )
        .then(() => {
          done();
        });
    });

    it('should handle a synchronous throw from the next handler', () => {
      const expected = new Error('I told, you Bobby Boucher, threes are the debil!');
      const syncObservable = new Observable<number>(observer => {
        observer.next(1);
        observer.next(2);
        observer.next(3);
        observer.next(4);
      });

      const results: Array<number | Error> = [];

      return syncObservable
        .forEach(x => {
          results.push(x);
          if (x === 3) {
            throw expected;
          }
        })
        .then(
          () => {
            throw new Error('should not be called');
          },
          err => {
            results.push(err);
            // Since the consuming code can no longer interfere with the synchronous
            // producer, the remaining results are nexted.
            expect(results).toEqual([1, 2, 3, 4, expected]);
          }
        );
    });

    it('should handle an asynchronous throw from the next handler and tear down', () => {
      const expected = new Error('I told, you Bobby Boucher, twos are the debil!');
      const asyncObservable = new Observable<number>(observer => {
        let i = 1;
        const id = setInterval(() => observer.next(i++), 1);

        return () => {
          clearInterval(id);
        };
      });

      const results: Array<number | Error> = [];

      return asyncObservable
        .forEach(x => {
          results.push(x);
          if (x === 2) {
            throw expected;
          }
        })
        .then(
          () => {
            throw new Error('should not be called');
          },
          err => {
            results.push(err);
            expect(results).toEqual([1, 2, expected]);
          }
        );
    });
  });

  describe('subscribe', () => {
    it('should be synchronous', () => {
      let subscribed = false;
      let nexted: string;
      let completed: boolean;
      const source = new Observable<string>(observer => {
        subscribed = true;
        observer.next('wee');
        expect(nexted).to.equal('wee');
        observer.complete();
        expect(completed).to.be.true;
      });

      expect(subscribed).to.be.false;

      let mutatedByNext = false;
      let mutatedByComplete = false;

      source.subscribe(
        x => {
          nexted = x;
          mutatedByNext = true;
        },
        null,
        () => {
          completed = true;
          mutatedByComplete = true;
        }
      );

      expect(mutatedByNext).to.be.true;
      expect(mutatedByComplete).to.be.true;
    });

    it('should work when subscribe is called with no arguments', () => {
      const source = new Observable<string>(subscriber => {
        subscriber.next('foo');
        subscriber.complete();
      });

      source.subscribe();
    });

    it('should not be unsubscribed when other empty subscription completes', () => {
      let unsubscribeCalled = false;
      const source = new Observable<number>(() => {
        return () => {
          unsubscribeCalled = true;
        };
      });

      source.subscribe();

      expect(unsubscribeCalled).to.be.false;

      empty().subscribe();

      expect(unsubscribeCalled).to.be.false;
    });

    it('should not be unsubscribed when other subscription with same observer completes', () => {
      let unsubscribeCalled = false;
      const source = new Observable<number>(() => {
        return () => {
          unsubscribeCalled = true;
        };
      });

      let observer = {
        next: function () {
          /*noop*/
        }
      };

      source.subscribe(observer);

      expect(unsubscribeCalled).to.be.false;

      empty().subscribe(observer);

      expect(unsubscribeCalled).to.be.false;
    });

    it('should run unsubscription logic when an error is sent asynchronously and subscribe is called with no arguments', done => {
      const sandbox = sinon.createSandbox();
      const fakeTimer = sandbox.useFakeTimers();

      let unsubscribeCalled = false;
      const source = new Observable<number>(observer => {
        const id = setInterval(() => {
          observer.error(0);
        }, 1);
        return () => {
          clearInterval(id);
          unsubscribeCalled = true;
        };
      });

      source.subscribe({
        error(err) {
          /* noop: expected error */
        }
      });

      setTimeout(() => {
        let err;
        let errHappened = false;
        try {
          expect(unsubscribeCalled).to.be.true;
        } catch (e) {
          err = e;
          errHappened = true;
        } finally {
          if (!errHappened) {
            done();
          } else {
            done(err);
          }
        }
      }, 100);

      fakeTimer.tick(110);
      sandbox.restore();
    });

    it('should return a Subscription that calls the unsubscribe function returned by the subscriber', () => {
      let unsubscribeCalled = false;

      const source = new Observable<number>(() => {
        return () => {
          unsubscribeCalled = true;
        };
      });

      const sub = source.subscribe(() => {});
      expect(sub instanceof Subscription).to.be.true;
      expect(unsubscribeCalled).to.be.false;
      expect(sub.unsubscribe).to.be.a('function');

      sub.unsubscribe();
      expect(unsubscribeCalled).to.be.true;
    });

    it('should ignore next messages after unsubscription', done => {
      let times = 0;

      const subscription = new Observable<number>(observer => {
        let i = 0;
        const id = setInterval(() => {
          observer.next(i++);
        });

        return () => {
          clearInterval(id);
          expect(times).to.equal(2);
          done();
        };
      })
        .pipe(tap(() => (times += 1)))
        .subscribe(function () {
          if (times === 2) {
            subscription.unsubscribe();
          }
        });
    });

    it('should ignore error messages after unsubscription', done => {
      let times = 0;
      let errorCalled = false;

      const subscription = new Observable<number>(observer => {
        let i = 0;
        const id = setInterval(() => {
          observer.next(i++);
          if (i === 3) {
            observer.error(new Error());
          }
        });

        return () => {
          clearInterval(id);
          expect(times).to.equal(2);
          expect(errorCalled).to.be.false;
          done();
        };
      })
        .pipe(tap(() => (times += 1)))
        .subscribe(
          function () {
            if (times === 2) {
              subscription.unsubscribe();
            }
          },
          function () {
            errorCalled = true;
          }
        );
    });

    it('should ignore complete messages after unsubscription', done => {
      let times = 0;
      let completeCalled = false;

      const subscription = new Observable<number>(observer => {
        let i = 0;
        const id = setInterval(() => {
          observer.next(i++);
          if (i === 3) {
            observer.complete();
          }
        });

        return () => {
          clearInterval(id);
          expect(times).to.equal(2);
          expect(completeCalled).to.be.false;
          done();
        };
      })
        .pipe(tap(() => (times += 1)))
        .subscribe(
          function () {
            if (times === 2) {
              subscription.unsubscribe();
            }
          },
          null,
          function () {
            completeCalled = true;
          }
        );
    });

    describe('when called with an anonymous observer', () => {
      it(
        'should accept an anonymous observer with just a next function and call the next function in the context' +
          ' of the anonymous observer',
        done => {
          //intentionally not using lambda to avoid typescript's this context capture
          const o = {
            myValue: 'foo',
            next(x: any) {
              expect(this.myValue).to.equal('foo');
              expect(x).to.equal(1);
              done();
            }
          };

          of(1).subscribe(o);
        }
      );

      it(
        'should accept an anonymous observer with just an error function and call the error function in the context' +
          ' of the anonymous observer',
        done => {
          //intentionally not using lambda to avoid typescript's this context capture
          const o = {
            myValue: 'foo',
            error(err: any) {
              expect(this.myValue).to.equal('foo');
              expect(err).to.equal('bad');
              done();
            }
          };

          throwError('bad').subscribe(o);
        }
      );

      it(
        'should accept an anonymous observer with just a complete function and call the complete function in the' +
          ' context of the anonymous observer',
        done => {
          //intentionally not using lambda to avoid typescript's this context capture
          const o = {
            myValue: 'foo',
            complete: function complete() {
              expect(this.myValue).to.equal('foo');
              done();
            }
          };

          empty().subscribe(o);
        }
      );

      it('should accept an anonymous observer with no functions at all', () => {
        expect(() => {
          empty().subscribe(<any>{});
        }).not.to.throw();
      });

      it('should ignore next messages after unsubscription', done => {
        let times = 0;

        const subscription = new Observable<number>(observer => {
          let i = 0;
          const id = setInterval(() => {
            observer.next(i++);
          });

          return () => {
            clearInterval(id);
            expect(times).to.equal(2);
            done();
          };
        })
          .pipe(tap(() => (times += 1)))
          .subscribe({
            next() {
              if (times === 2) {
                subscription.unsubscribe();
              }
            }
          });
      });

      it('should ignore error messages after unsubscription', done => {
        let times = 0;
        let errorCalled = false;

        const subscription = new Observable<number>(observer => {
          let i = 0;
          const id = setInterval(() => {
            observer.next(i++);
            if (i === 3) {
              observer.error(new Error());
            }
          });
          return () => {
            clearInterval(id);
            expect(times).to.equal(2);
            expect(errorCalled).to.be.false;
            done();
          };
        })
          .pipe(tap(() => (times += 1)))
          .subscribe({
            next() {
              if (times === 2) {
                subscription.unsubscribe();
              }
            },
            error() {
              errorCalled = true;
            }
          });
      });

      it('should ignore complete messages after unsubscription', done => {
        let times = 0;
        let completeCalled = false;

        const subscription = new Observable<number>(observer => {
          let i = 0;
          const id = setInterval(() => {
            observer.next(i++);
            if (i === 3) {
              observer.complete();
            }
          });

          return () => {
            clearInterval(id);
            expect(times).to.equal(2);
            expect(completeCalled).to.be.false;
            done();
          };
        })
          .pipe(tap(() => (times += 1)))
          .subscribe({
            next() {
              if (times === 2) {
                subscription.unsubscribe();
              }
            },
            complete() {
              completeCalled = true;
            }
          });
      });
    });

    describe('config.useDeprecatedSynchronousErrorHandling', () => {
      it('should log when it is set and unset', () => {
        const _log = console.log;
        const logCalledWith: any[][] = [];
        console.log = (...args: any[]) => {
          logCalledWith.push(args);
        };

        const _warn = console.warn;
        const warnCalledWith: any[][] = [];
        console.warn = (...args: any[]) => {
          warnCalledWith.push(args);
        };

        config.useDeprecatedSynchronousErrorHandling = true;
        expect(warnCalledWith.length).to.equal(1);

        config.useDeprecatedSynchronousErrorHandling = false;
        expect(logCalledWith.length).to.equal(1);

        console.log = _log;
        console.warn = _warn;
      });
    });

    describe('if config.useDeprecatedSynchronousErrorHandling === true', () => {
      beforeEach(() => {
        const _warn = console.warn;
        console.warn = noop;
        config.useDeprecatedSynchronousErrorHandling = true;
        console.warn = _warn;
      });

      it('should throw synchronously', () => {
        expect(() => throwError(new Error()).subscribe()).to.throw();
      });

      it('should rethrow if sink has syncErrorThrowable = false', () => {
        const observable = new Observable(observer => {
          observer.next(1);
        });

        const sink = Subscriber.create(() => {
          throw 'error!';
        });

        expect(() => {
          observable.subscribe(sink);
        }).to.throw('error!');
      });

      afterEach(() => {
        const _log = console.log;
        console.log = noop;
        config.useDeprecatedSynchronousErrorHandling = false;
        console.log = _log;
      });
    });
  });

  describe('pipe', () => {
    it('should exist', () => {
      const source = of('test');
      expect(source.pipe).to.be.a('function');
    });

    it('should pipe multiple operations', done => {
      of('test')
        .pipe(
          map(x => x + x),
          map(x => x + '!!!')
        )
        .subscribe(
          x => {
            expect(x).to.equal('testtest!!!');
          },
          null,
          done
        );
    });

    it('should return the same observable if there are no arguments', () => {
      const source = of('test');
      const result = source.pipe();
      expect(result).to.equal(source);
    });
  });
});

describe('Source.create', () => {
  asDiagram('create(obs => { obs.next(1); })')(
    'should create a cold observable that emits just 1',
    () => {
      const e1 = Observable.create((obs: Observer<number>) => {
        obs.next(1);
      });
      const expected = 'x';
      expectSource(e1).toBe(expected, {x: 1});
    }
  );

  it('should create an Observable', () => {
    const result = Observable.create(() => {});
    expect(result instanceof Observable).to.be.true;
  });

  it('should provide an observer to the function', () => {
    let called = false;
    const result = Observable.create((observer: Observer<any>) => {
      called = true;
      expectFullObserver(observer);
      observer.complete();
    });

    expect(called).to.be.false;
    result.subscribe(() => {});
    expect(called).to.be.true;
  });

  it('should send errors thrown in the passed function down the error path', done => {
    Observable.create((observer: Observer<any>) => {
      throw new Error('this should be handled');
    }).subscribe({
      error(err: Error) {
        expect(err)
          .to.exist.and.be.instanceof(Error)
          .and.have.property('message', 'this should be handled');
        done();
      }
    });
  });
});

describe('Source.lift', () => {
  class MyCustomObservable<T> extends Observable<T> {
    static from<T>(source: any) {
      const observable = new MyCustomObservable<T>();
      observable.source = <Observable<T>>source;
      return observable;
    }
    lift<R>(operator: Operator<T, R>): Observable<R> {
      const observable = new MyCustomObservable<R>();
      (<any>observable).source = this;
      (<any>observable).operator = operator;
      return observable;
    }
  }

  it('should return Observable which calls Closer of operator on unsubscription', done => {
    const myOperator: Operator<any, any> = {
      call: (subscriber: Subscriber<any>, source: any) => {
        const subscription = source.subscribe((x: any) => subscriber.next(x));
        return () => {
          subscription.unsubscribe();
          done();
        };
      }
    };

    NEVER.lift(myOperator).subscribe().unsubscribe();
  });

  it('should be overrideable in a custom Observable type that composes', done => {
    const result = new MyCustomObservable<number>(observer => {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      map(x => {
        return 10 * x;
      })
    );

    expect(result instanceof MyCustomObservable).to.be.true;

    const expected = [10, 20, 30];

    result.subscribe(
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
  });

  it('should compose through multicast and refCount', done => {
    const result = new MyCustomObservable<number>(observer => {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      multicast(() => new Subject<number>()),
      refCount(),
      map(x => 10 * x)
    );

    expect(result instanceof MyCustomObservable).to.be.true;

    const expected = [10, 20, 30];

    result.subscribe(
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
  });

  it('should compose through multicast with selector function', done => {
    const result = new MyCustomObservable<number>(observer => {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(
      multicast(
        () => new Subject<number>(),
        shared => shared.pipe(map(x => 10 * x))
      )
    );

    expect(result instanceof MyCustomObservable).to.be.true;

    const expected = [10, 20, 30];

    result.subscribe(
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
  });

  it('should compose through combineLatest', () => {
    const e1 = cold('-a--b-----c-d-e-|');
    const e2 = cold('--1--2-3-4---|   ');
    const expected = '--A-BC-D-EF-G-H-|';

    const result = MyCustomObservable.from(e1).pipe(
      combineLatest(e2, (a, b) => String(a) + String(b))
    );

    expect(result instanceof MyCustomObservable).to.be.true;

    expectSource(result).toBe(expected, {
      A: 'a1',
      B: 'b1',
      C: 'b2',
      D: 'b3',
      E: 'b4',
      F: 'c4',
      G: 'd4',
      H: 'e4'
    });
  });

  it('should compose through concat', () => {
    const e1 = cold('--a--b-|');
    const e2 = cold('--x---y--|');
    const expected = '--a--b---x---y--|';

    const result = MyCustomObservable.from(e1).pipe(concat(e2, rxTestScheduler));

    expect(result instanceof MyCustomObservable).to.be.true;

    expectSource(result).toBe(expected);
  });

  it('should compose through merge', () => {
    const e1 = cold('-a--b-| ');
    const e2 = cold('--x--y-|');
    const expected = '-ax-by-|';

    const result = MyCustomObservable.from(e1).pipe(merge(e2, rxTestScheduler));

    expect(result instanceof MyCustomObservable).to.be.true;

    expectSource(result).toBe(expected);
  });

  it('should compose through race', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b-----c----|';

    const result = MyCustomObservable.from(e1).pipe(
      // TODO: remove after race typings are fixed.
      race(e2) as any
    );

    expect(result instanceof MyCustomObservable).to.be.true;

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should compose through zip', () => {
    const e1 = cold('-a--b-----c-d-e-|');
    const e2 = cold('--1--2-3-4---|   ');
    const expected = '--A--B----C-D|   ';

    const result = MyCustomObservable.from(e1).pipe(
      zip(e2, (a, b) => String(a) + String(b))
    );

    expect(result instanceof MyCustomObservable).to.be.true;

    expectSource(result).toBe(expected, {
      A: 'a1',
      B: 'b2',
      C: 'c3',
      D: 'd4'
    });
  });

  it(
    'should allow injecting behaviors into all subscribers in an operator ' +
      'chain when overridden',
    done => {
      // The custom Subscriber
      const log: Array<string> = [];

      class LogSubscriber<T> extends Subscriber<T> {
        next(value?: T): void {
          log.push('next ' + value);
          if (!this.stopped) {
            this._next(value!);
          }
        }
      }

      // The custom Operator
      class LogOperator<T, R> implements Operator<T, R> {
        constructor(private childOperator: Operator<T, R>) {}

        call(subscriber: Subscriber<R>, source: any): Closer {
          return this.childOperator.call(new LogSubscriber<R>(subscriber), source);
        }
      }

      // The custom Observable
      class LogObservable<T> extends Observable<T> {
        lift<R>(operator: Operator<T, R>): Observable<R> {
          const observable = new LogObservable<R>();
          (<any>observable).source = this;
          (<any>observable).operator = new LogOperator(operator);
          return observable;
        }
      }

      // Use the LogObservable
      const result = new LogObservable<number>(observer => {
        observer.next(1);
        observer.next(2);
        observer.next(3);
        observer.complete();
      }).pipe(
        map(x => 10 * x),
        filter(x => x > 15),
        count()
      );

      expect(result instanceof LogObservable).to.be.true;

      const expected = [2];

      result.subscribe(
        function (x) {
          expect(x).to.equal(expected.shift());
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          expect(log).toEqual([
            'next 10', // map
            'next 20', // map
            'next 20', // filter
            'next 30', // map
            'next 30', // filter
            'next 2' // count
          ]);
          done();
        }
      );
    }
  );

  it('should not swallow internal errors', () => {
    const consoleStub = sinon.stub(console, 'warn');
    try {
      let source = new Observable<number>(observer => observer.next(42));
      for (let i = 0; i < 10000; ++i) {
        let base = source;
        source = new Observable<number>(observer => base.subscribe(observer));
      }
      source.subscribe();
      expect(consoleStub).to.have.property('called', true);
    } finally {
      consoleStub.restore();
    }
  });
});

describe('Source.pipe', () => {
  it('should infer for no arguments', () => {
    const o = of('foo').pipe(); // $ExpectType Observable<string>
  });

  it('should infer for 1 argument', () => {
    const o = of('foo').pipe(a('1')); // $ExpectType Observable<"1">
  });

  it('should infer for 2 arguments', () => {
    const o = of('foo').pipe(a('1'), a('2')); // $ExpectType Observable<"2">
  });

  it('should infer for 3 arguments', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('3')); // $ExpectType Observable<"3">
  });

  it('should infer for 4 arguments', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('3'), a('4')); // $ExpectType Observable<"4">
  });

  it('should infer for 5 arguments', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('3'), a('4'), a('5')); // $ExpectType Observable<"5">
  });

  it('should infer for 6 arguments', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('3'), a('4'), a('5'), a('6')); // $ExpectType Observable<"6">
  });

  it('should infer for 7 arguments', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('3'), a('4'), a('5'), a('6'), a('7')); // $ExpectType Observable<"7">
  });

  it('should infer for 8 arguments', () => {
    const o = of('foo').pipe(
      a('1'),
      a('2'),
      a('3'),
      a('4'),
      a('5'),
      a('6'),
      a('7'),
      a('8')
    ); // $ExpectType Observable<"8">
  });

  it('should infer for 9 arguments', () => {
    const o = of('foo').pipe(
      a('1'),
      a('2'),
      a('3'),
      a('4'),
      a('5'),
      a('6'),
      a('7'),
      a('8'),
      a('9')
    ); // $ExpectType Observable<"9">
  });

  it('should infer unknown for more than 9 arguments', () => {
    const o = of('foo').pipe(
      a('1'),
      a('2'),
      a('3'),
      a('4'),
      a('5'),
      a('6'),
      a('7'),
      a('8'),
      a('9'),
      a('10')
    ); // $ExpectType Observable<unknown>
  });

  it('should require a type assertion for more than 9 arguments', () => {
    const o: Observable<'10'> = of('foo').pipe(
      a('1'),
      a('2'),
      a('3'),
      a('4'),
      a('5'),
      a('6'),
      a('7'),
      a('8'),
      a('9'),
      a('10')
    ); // $ExpectError
  });

  it('should enforce types for the 1st argument', () => {
    const o = of('foo').pipe(a('#', '1')); // $ExpectError
  });

  it('should enforce types for the 2nd argument', () => {
    const o = of('foo').pipe(a('1'), a('#', '2')); // $ExpectError
  });

  it('should enforce types for the 3rd argument', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('#', '3')); // $ExpectError
  });

  it('should enforce types for the 4th argument', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('3'), a('#', '4')); // $ExpectError
  });

  it('should enforce types for the 5th argument', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('3'), a('4'), a('#', '5')); // $ExpectError
  });

  it('should enforce types for the 6th argument', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('3'), a('4'), a('5'), a('#', '6')); // $ExpectError
  });

  it('should enforce types for the 7th argument', () => {
    const o = of('foo').pipe(a('1'), a('2'), a('3'), a('4'), a('5'), a('6'), a('#', '7')); // $ExpectError
  });

  it('should enforce types for the 8th argument', () => {
    const o = of('foo').pipe(
      a('1'),
      a('2'),
      a('3'),
      a('4'),
      a('5'),
      a('6'),
      a('7'),
      a('#', '8')
    ); // $ExpectError
  });

  it('should enforce types for the 9th argument', () => {
    const o = of('foo').pipe(
      a('1'),
      a('2'),
      a('3'),
      a('4'),
      a('5'),
      a('6'),
      a('7'),
      a('8'),
      a('#', '9')
    ); // $ExpectError
  });

  it('should not enforce types beyond the 9th argument', () => {
    const o = of('foo').pipe(
      a('1'),
      a('2'),
      a('3'),
      a('4'),
      a('5'),
      a('6'),
      a('7'),
      a('8'),
      a('9'),
      a('#', '10')
    ); // $ExpectType Observable<unknown>
  });

  it('should support operators that return generics', () => {
    const customOperator = () => <T>(a: Observable<T>) => a;
    const o = of('foo').pipe(customOperator()); // $ExpectType Observable<string>
  });

  it('should have proper return type for toPromise', () => {
    const o = of('foo').toPromise(); // $ExpectType Promise<string | undefined>
  });

  it('should infer unknown for no arguments', () => {
    const o = pipe(); // $ExpectType Mapper<unknown, unknown>
  });

  it('should infer for 1 argument', () => {
    const o = pipe(a('0', '1')); // $ExpectType Mapper<"0", "1">
  });

  it('should infer for 2 arguments', () => {
    const o = pipe(a('0', '1'), a('1', '2')); // $ExpectType Mapper<"0", "2">
  });

  it('should infer for 3 arguments', () => {
    const o = pipe(a('0', '1'), a('1', '2'), a('2', '3')); // $ExpectType Mapper<"0", "3">
  });

  it('should infer for 4 arguments', () => {
    const o = pipe(a('0', '1'), a('1', '2'), a('2', '3'), a('3', '4')); // $ExpectType Mapper<"0", "4">
  });

  it('should infer for 5 arguments', () => {
    const o = pipe(a('0', '1'), a('1', '2'), a('2', '3'), a('3', '4'), a('4', '5')); // $ExpectType Mapper<"0", "5">
  });

  it('should infer for 6 arguments', () => {
    const o = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('5', '6')
    ); // $ExpectType Mapper<"0", "6">
  });

  it('should infer for 7 arguments', () => {
    const o = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('5', '6'),
      a('6', '7')
    ); // $ExpectType Mapper<"0", "7">
  });

  it('should infer for 8 arguments', () => {
    const o = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('5', '6'),
      a('6', '7'),
      a('7', '8')
    ); // $ExpectType Mapper<"0", "8">
  });

  it('should infer for 9 arguments', () => {
    const o = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('5', '6'),
      a('6', '7'),
      a('7', '8'),
      a('8', '9')
    ); // $ExpectType Mapper<"0", "9">
  });

  it('should infer {} for more than 9 arguments', () => {
    const o = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('5', '6'),
      a('6', '7'),
      a('7', '8'),
      a('8', '9'),
      a('9', '10')
    ); // $ExpectType Mapper<"0", {}>
  });

  it('should require a type assertion for more than 9 arguments', () => {
    const o: Mapper<'0', '10'> = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('5', '6'),
      a('6', '7'),
      a('7', '8'),
      a('8', '9'),
      a('9', '10')
    ); // $ExpectError
  });

  it('should enforce types for the 2nd argument', () => {
    const o = pipe(a('0', '1'), a('#', '2')); // $ExpectError
  });

  it('should enforce types for the 3rd argument', () => {
    const o = pipe(a('0', '1'), a('1', '2'), a('#', '3')); // $ExpectError
  });

  it('should enforce types for the 4th argument', () => {
    const o = pipe(a('0', '1'), a('1', '2'), a('2', '3'), a('#', '4')); // $ExpectError
  });

  it('should enforce types for the 5th argument', () => {
    const o = pipe(a('0', '1'), a('1', '2'), a('2', '3'), a('3', '4'), a('#', '5')); // $ExpectError
  });

  it('should enforce types for the 6th argument', () => {
    const o = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('#', '6')
    ); // $ExpectError
  });

  it('should enforce types for the 7th argument', () => {
    const o = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('5', '6'),
      a('#', '7')
    ); // $ExpectError
  });

  it('should enforce types for the 8th argument', () => {
    const o = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('5', '6'),
      a('6', '7'),
      a('#', '8')
    ); // $ExpectError
  });

  it('should enforce types for the 9th argument', () => {
    const o = pipe(
      a('0', '1'),
      a('1', '2'),
      a('2', '3'),
      a('3', '4'),
      a('4', '5'),
      a('5', '6'),
      a('6', '7'),
      a('7', '8'),
      a('#', '9')
    ); // $ExpectError
  });

  it('should return a non-narrowed Observable type', () => {
    const customOperator = <T>(p: T) => (a: Observable<T>) => a;

    const staticPipe = pipe(customOperator('infer'));
    const o = of('foo').pipe(staticPipe); // $ExpectType Observable<string>
  });

  it('should return an explicit Observable type', () => {
    const customOperator = <T>() => (a: Observable<T>) => a;

    const staticPipe = pipe(customOperator<string>());
    const o = of('foo').pipe(staticPipe); // $ExpectType Observable<string>
  });

  it('should return Observable<unknown> when T cannot be inferred', () => {
    const customOperator = <T>() => (a: Observable<T>) => a;

    // type can't be possibly be inferred here
    const staticPipe = pipe(customOperator());
    const o = of('foo').pipe(staticPipe); // $ExpectType Observable<unknown>
  });

  it('should return a non-narrowed type', () => {
    const func = pipe(
      (value: string) => value,
      (value: string) => value + value
    );
    const value = func('foo'); // $ExpectType string
  });
});

describe('Source.toPromise', () => {
  it('should convert an Observable to a promise of its last value', (done: MochaDone) => {
    of(1, 2, 3)
      .toPromise(Promise)
      .then(x => {
        expect(x).to.equal(3);
        done();
      });
  });

  it('should convert an empty Observable to a promise of undefined', (done: MochaDone) => {
    EMPTY.toPromise(Promise).then(x => {
      expect(x).to.be.undefined;
      done();
    });
  });

  it('should handle errors properly', (done: MochaDone) => {
    throwError('bad')
      .toPromise(Promise)
      .then(
        () => {
          done(new Error('should not be called'));
        },
        (err: any) => {
          expect(err).to.equal('bad');
          done();
        }
      );
  });

  it('should allow for global config via config.Promise', (done: MochaDone) => {
    let wasCalled = false;
    config.Promise = function MyPromise(callback: Function) {
      wasCalled = true;
      return new Promise(callback as any);
    } as any;

    of(42)
      .toPromise()
      .then(x => {
        expect(wasCalled).to.be.true;
        expect(x).to.equal(42);
        done();
      });
  });
});

/**
 * Used to keep the tests uncluttered.
 *
 * Returns a `Mapper` with the
 * specified literal type parameters.
 * That is, `a('0', '1')` returns `Mapper<'0', '1'>`.
 * That means that the `a` function can be used to create consecutive
 * arguments that are either compatible or incompatible.
 *
 * ```js
 * a('0', '1'), a('1', '2') // OK
 * a('0', '1'), a('#', '2') // Error '1' is not compatible with '#'
 * ```
 *
 * @param {string} input The `Mapper` input type parameter
 * @param {string} output The `Mapper` output type parameter
 */
function a<I extends string, O extends string>(input: I, output: O): Mapper<I, O> {
  return i => output;
}

function a<I extends string, O extends string>(input: I, output: O): Lifter<I, O>;
function a<I, O extends string>(output: O): Lifter<I, O>;

/**
 * Used to keep the tests uncluttered.
 *
 * Returns an `Lifter` with the specified literal type parameters.
 * That is, `a('0', '1')` returns `Lifter<'0', '1'>`.
 * That means that the `a` function can be used to create consecutive
 * arguments that are either compatible or incompatible.
 *
 * ```javascript
 * a('0', '1'), a('1', '2') // OK
 * a('0', '1'), a('#', '2') // Error '1' is not compatible with '#'
 * ```
 *
 * If passed only one argument, that argument is used for the output
 * type parameter and the input type parameters is inferred.
 *
 * ```javascript
 * of('foo').pipe(
 *   a('1') // Lifter<'foo', '1'>
 * );
 * ```
 *
 * @param {string} input The `Lifter` input type parameter
 * @param {string} output The `Lifter` output type parameter
 */
function a<I, O extends string>(inputOrOutput: I | O, output?: O): Lifter<I, O> {
  return mapTo<I, O>(output === undefined ? (inputOrOutput as O) : output);
}

describe('Note', () => {
  it('should exist', () => {
    expect(Note).exist;
    expect(Note).to.be.a('function');
  });

  it('should not allow convert to observable if given kind is unknown', () => {
    const n = new Note('x' as any);
    expect(() => n.toObservable()).to.throw();
  });

  describe('createNext', () => {
    it('should return a Note', () => {
      const n = Note.createNext('test');
      expect(n instanceof Note).to.be.true;
      expect(n.value).to.equal('test');
      expect(n.kind).to.equal('N');
      expect(n.error).to.be.a('undefined');
      expect(n.hasValue).to.be.true;
    });
  });

  describe('createFail', () => {
    it('should return a Note', () => {
      const n = Note.createFail('test');
      expect(n instanceof Note).to.be.true;
      expect(n.value).to.be.a('undefined');
      expect(n.kind).to.equal('E');
      expect(n.error).to.equal('test');
      expect(n.hasValue).to.be.false;
    });
  });

  describe('createDone', () => {
    it('should return a Note', () => {
      const n = Note.createDone();
      expect(n instanceof Note).to.be.true;
      expect(n.value).to.be.a('undefined');
      expect(n.kind).to.equal('C');
      expect(n.error).to.be.a('undefined');
      expect(n.hasValue).to.be.false;
    });
  });

  describe('toObservable', () => {
    it('should create observable from a next Note', () => {
      const value = 'a';
      const next = Note.createNext(value);
      expectSource(next.toObservable()).toBe('(a|)');
    });

    it('should create observable from a complete Note', () => {
      const complete = Note.createDone();
      expectSource(complete.toObservable()).toBe('|');
    });

    it('should create observable from a error Note', () => {
      const error = Note.createFail('error');
      expectSource(error.toObservable()).toBe('#');
    });
  });

  describe('static reference', () => {
    it('should create new next Note with value', () => {
      const value = 'a';
      const first = Note.createNext(value);
      const second = Note.createNext(value);

      expect(first).not.to.equal(second);
    });

    it('should create new error Note', () => {
      const first = Note.createFail();
      const second = Note.createFail();

      expect(first).not.to.equal(second);
    });

    it('should return static next Note reference without value', () => {
      const first = Note.createNext(undefined);
      const second = Note.createNext(undefined);

      expect(first).to.equal(second);
    });

    it('should return static complete Note reference', () => {
      const first = Note.createDone();
      const second = Note.createDone();

      expect(first).to.equal(second);
    });
  });

  describe('do', () => {
    it('should invoke on next', () => {
      const n = Note.createNext('a');
      let invoked = false;
      n.do(
        (x: string) => {
          invoked = true;
        },
        (err: any) => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        }
      );

      expect(invoked).to.be.true;
    });

    it('should invoke on error', () => {
      const n = Note.createFail();
      let invoked = false;
      n.do(
        (x: any) => {
          throw 'should not be called';
        },
        (err: any) => {
          invoked = true;
        },
        () => {
          throw 'should not be called';
        }
      );

      expect(invoked).to.be.true;
    });

    it('should invoke on complete', () => {
      const n = Note.createDone();
      let invoked = false;
      n.do(
        (x: any) => {
          throw 'should not be called';
        },
        (err: any) => {
          throw 'should not be called';
        },
        () => {
          invoked = true;
        }
      );

      expect(invoked).to.be.true;
    });
  });

  describe('accept', () => {
    it('should accept observer for next Note', () => {
      const value = 'a';
      let observed = false;
      const n = Note.createNext(value);
      const observer = Subscriber.create(
        (x?: string) => {
          expect(x).to.equal(value);
          observed = true;
        },
        (err: any) => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        }
      );

      n.accept(observer);
      expect(observed).to.be.true;
    });

    it('should accept observer for error Note', () => {
      let observed = false;
      const n = Note.createFail<string>();
      const observer = Subscriber.create(
        (x?: string) => {
          throw 'should not be called';
        },
        (err: any) => {
          observed = true;
        },
        () => {
          throw 'should not be called';
        }
      );

      n.accept(observer);
      expect(observed).to.be.true;
    });

    it('should accept observer for complete Note', () => {
      let observed = false;
      const n = Note.createDone();
      const observer = Subscriber.create(
        (x?: string) => {
          throw 'should not be called';
        },
        (err: any) => {
          throw 'should not be called';
        },
        () => {
          observed = true;
        }
      );

      n.accept(observer);
      expect(observed).to.be.true;
    });

    it('should accept function for next Note', () => {
      const value = 'a';
      let observed = false;
      const n = Note.createNext(value);

      n.accept(
        (x: string) => {
          expect(x).to.equal(value);
          observed = true;
        },
        (err: any) => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        }
      );
      expect(observed).to.be.true;
    });

    it('should accept function for error Note', () => {
      let observed = false;
      const error = 'error';
      const n = Note.createFail(error);

      n.accept(
        (x: any) => {
          throw 'should not be called';
        },
        (err: any) => {
          expect(err).to.equal(error);
          observed = true;
        },
        () => {
          throw 'should not be called';
        }
      );
      expect(observed).to.be.true;
    });

    it('should accept function for complete Note', () => {
      let observed = false;
      const n = Note.createDone();

      n.accept(
        (x: any) => {
          throw 'should not be called';
        },
        (err: any) => {
          throw 'should not be called';
        },
        () => {
          observed = true;
        }
      );
      expect(observed).to.be.true;
    });
  });

  describe('observe', () => {
    it('should observe for next Note', () => {
      const value = 'a';
      let observed = false;
      const n = Note.createNext(value);
      const observer = Subscriber.create(
        (x?: string) => {
          expect(x).to.equal(value);
          observed = true;
        },
        (err: any) => {
          throw 'should not be called';
        },
        () => {
          throw 'should not be called';
        }
      );

      n.observe(observer);
      expect(observed).to.be.true;
    });

    it('should observe for error Note', () => {
      let observed = false;
      const n = Note.createFail();
      const observer = Subscriber.create(
        (x: any) => {
          throw 'should not be called';
        },
        (err: any) => {
          observed = true;
        },
        () => {
          throw 'should not be called';
        }
      );

      n.observe(observer);
      expect(observed).to.be.true;
    });

    it('should observe for complete Note', () => {
      let observed = false;
      const n = Note.createDone();
      const observer = Subscriber.create(
        (x: any) => {
          throw 'should not be called';
        },
        (err: any) => {
          throw 'should not be called';
        },
        () => {
          observed = true;
        }
      );

      n.observe(observer);
      expect(observed).to.be.true;
    });
  });
});

describe('firstFrom', () => {
  const r0 = firstFrom(a$); // $ExpectType Promise<A>
  const r1 = firstFrom(); // $ExpectError
  const r2 = firstFrom(Promise.resolve(42)); // $ExpectError

  it('should emit the first value as a promise', async () => {
    let finalized = false;
    const source = interval(10).pipe(finalize(() => (finalized = true)));
    const result = await firstFrom(source);
    expect(result).to.equal(0);
    expect(finalized).to.be.true;
  });

  it('should error for empty observables', async () => {
    const source = EMPTY;
    let error: any = null;
    try {
      await firstFrom(source);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an.instanceOf(EmptyError);
  });

  it('should error for errored observables', async () => {
    const source = throwError(new Error('blorp!'));
    let error: any = null;
    try {
      await firstFrom(source);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an.instanceOf(Error);
    expect(error.message).to.equal('blorp!');
  });

  it('should work with a synchronous observable', async () => {
    let finalized = false;
    const source = of('apples', 'bananas').pipe(finalize(() => (finalized = true)));
    const result = await firstFrom(source);
    expect(result).to.equal('apples');
    expect(finalized).to.be.true;
  });
});

describe('lastFrom', () => {
  const r0 = lastFrom(a$); // $ExpectType Promise<A>
  const r1 = lastFrom(); // $ExpectError
  const r2 = lastFrom(Promise.resolve(42)); // $ExpectError

  it('should emit the last value as a promise', async () => {
    let finalized = false;
    const source = interval(2).pipe(
      take(10),
      finalize(() => (finalized = true))
    );
    const result = await lastFrom(source);
    expect(result).to.equal(9);
    expect(finalized).to.be.true;
  });

  it('should error for empty observables', async () => {
    const source = EMPTY;
    let error: any = null;
    try {
      await lastFrom(source);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an.instanceOf(EmptyError);
  });

  it('should error for errored observables', async () => {
    const source = throwError(new Error('blorp!'));
    let error: any = null;
    try {
      await lastFrom(source);
    } catch (err) {
      error = err;
    }
    expect(error).to.be.an.instanceOf(Error);
    expect(error.message).to.equal('blorp!');
  });

  it('should work with a synchronous observable', async () => {
    let finalized = false;
    const source = of('apples', 'bananas').pipe(finalize(() => (finalized = true)));
    const result = await lastFrom(source);
    expect(result).to.equal('bananas');
    expect(finalized).to.be.true;
  });
});

if (Symbol && Symbol.asyncIterator) {
  describe('async iterator support', () => {
    it('should work for sync observables', async () => {
      const source = of(1, 2, 3);
      const results: number[] = [];
      for await (const value of source) {
        results.push(value);
      }
      expect(results).toEqual([1, 2, 3]);
    });

    it('should throw if the observable errors', async () => {
      const source = throwError(new Error('bad'));
      let error: any;
      try {
        for await (const _ of source) {
          // do nothing
        }
      } catch (err) {
        error = err;
      }
      expect(error).to.be.an.instanceOf(Error);
      expect(error.message).to.equal('bad');
    });

    it('should support async observables', async () => {
      const source = interval(10).pipe(take(3));
      const results: number[] = [];
      for await (const value of source) {
        results.push(value);
      }
      expect(results).toEqual([0, 1, 2]);
    });

    it('should do something clever if the loop exits', async () => {
      let finalized = false;
      const source = interval(10).pipe(
        take(10),
        finalize(() => (finalized = true))
      );
      const results: number[] = [];
      try {
        for await (const value of source) {
          results.push(value);
          if (value === 1) {
            throw new Error('bad');
          }
        }
      } catch (err) {
        // ignore
      }
      expect(results).toEqual([0, 1]);
      expect(finalized).to.be.true;
    });
  });
}
