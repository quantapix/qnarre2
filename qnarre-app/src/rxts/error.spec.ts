describe('catchError', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('catch')('should catch error and replace with a cold Observable', () => {
    testScheduler.run(({hot, cold, expectSource}) => {
      const e1 = hot('  --a--b--#       ');
      const e2 = cold('         -1-2-3-|');
      const expected = '--a--b---1-2-3-|';

      const result = e1.pipe(catchError((err: any) => e2));

      expectSource(result).toBe(expected);
    });
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(catchError(() => of(4, 5, 6))); // $ExpectType Observable<number>
  });

  it('should handle empty (never) appropriately', () => {
    const o = of(1, 2, 3).pipe(catchError(() => EMPTY)); // $ExpectType Observable<number>
  });

  it('should handle a throw', () => {
    const f: () => never = () => {
      throw new Error('test');
    };
    const o = of(1, 2, 3).pipe(catchError(f)); // $ExpectType Observable<number>
  });

  it('should infer correctly when not returning', () => {
    const o = of(1, 2, 3).pipe(
      catchError(() => {
        throw new Error('your hands in the air');
      })
    ); // $ExpectType Observable<number>
  });

  it('should infer correctly when returning another type', () => {
    const o = of(1, 2, 3).pipe(catchError(() => of('a', 'b', 'c'))); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(catchError()); // $ExpectError
  });

  it('should enforce that selector returns an Observable', () => {
    const o = of(1, 2, 3).pipe(catchError(err => {})); // $ExpectError
  });

  it('should enforce type of caught', () => {
    const o = of(1, 2, 3).pipe(
      catchError((err, caught: Observable<string>) => of('a', 'b', 'c'))
    ); // $ExpectError
  });

  it('should handle union types', () => {
    const o = of(1, 2, 3).pipe(
      catchError(err => (err.message === 'wee' ? of('fun') : of(123)))
    ); // $ExpectType Observable<string | number>
  });

  it('should catch error and replace it with Observable.of()', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--c--------|');
      const subs = '    ^-------!';
      const expected = '--a--b--(XYZ|)';

      const result = e1.pipe(
        map((n: string) => {
          if (n === 'c') {
            throw 'bad';
          }
          return n;
        }),
        catchError((err: any) => {
          return of('X', 'Y', 'Z');
        })
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should catch error and replace it with a cold Observable', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--#          ');
      const e1subs = '  ^-------!          ';
      const e2 = cold('         1-2-3-4-5-|');
      const e2subs = '  --------^---------!';
      const expected = '--a--b--1-2-3-4-5-|';

      const result = e1.pipe(catchError((err: any) => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should allow unsubscribing explicitly and early', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --1-2-3-4-5-6---#');
      const e1subs = '  ^------!         ';
      const expected = '--1-2-3-         ';
      const unsub = '   -------!         ';

      const result = e1.pipe(
        catchError(() => {
          return of('X', 'Y', 'Z');
        })
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --1-2-3-4-5-6---#');
      const e1subs = '  ^------!         ';
      const expected = '--1-2-3-         ';
      const unsub = '   -------!         ';

      const result = e1.pipe(
        mergeMap((x: any) => of(x)),
        catchError(() => {
          return of('X', 'Y', 'Z');
        }),
        mergeMap((x: any) => of(x))
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should unsubscribe from a caught hot caught observable when unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -1-2-3-#          ');
      const e1subs = '  ^------!          ';
      const e2 = hot('  ---3-4-5-6-7-8-9-|');
      const e2subs = '  -------^----!     ';
      const expected = '-1-2-3-5-6-7-     ';
      const unsub = '   ------------!     ';

      const result = e1.pipe(catchError(() => e2));

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should unsubscribe from a caught cold caught observable when unsubscribed explicitly', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -1-2-3-#          ');
      const e1subs = '  ^------!          ';
      const e2 = cold('       5-6-7-8-9-|');
      const e2subs = '  -------^----!     ';
      const expected = '-1-2-3-5-6-7-     ';
      const unsub = '   ------------!     ';

      const result = e1.pipe(catchError(() => e2));

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should unsubscribe from a caught cold caught interop observable when unsubscribed explicitly', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -1-2-3-#          ');
      const e1subs = '  ^------!          ';
      const e2 = cold('       5-6-7-8-9-|');
      const e2subs = '  -------^----!     ';
      const expected = '-1-2-3-5-6-7-     ';
      const unsub = '   ------------!     ';

      // This test is the same as the previous test, but the observable is
      // manipulated to make it look like an interop observable - an observable
      // from a foreign library. Interop subscribers are treated differently:
      // they are wrapped in a safe subscriber. This test ensures that
      // unsubscriptions are chained all the way to the interop subscriber.

      const result = e1.pipe(catchError(() => asInterop(e2)));

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should stop listening to a synchronous observable when unsubscribed', () => {
    const sideEffects: number[] = [];
    const synchronousObservable = concat(
      defer(() => {
        sideEffects.push(1);
        return of(1);
      }),
      defer(() => {
        sideEffects.push(2);
        return of(2);
      }),
      defer(() => {
        sideEffects.push(3);
        return of(3);
      })
    );

    throwError(new Error('Some error'))
      .pipe(
        catchError(() => synchronousObservable),
        takeWhile(x => x != 2) // unsubscribe at the second side-effect
      )
      .subscribe(() => {});

    expect(sideEffects).toEqual([1, 2]);
  });

  it('should catch error and replace it with a hot Observable', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--#          ');
      const e1subs = '  ^-------!          ';
      const e2 = hot('  1-2-3-4-5-6-7-8-9-|');
      const e2subs = '  --------^---------!';
      const expected = '--a--b--5-6-7-8-9-|';

      const result = e1.pipe(catchError((err: any) => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it(
    'should catch and allow the cold observable to be repeated with the third ' +
      '(caught) argument',
    () => {
      testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
        const e1 = cold('--a--b--c--------|       ');
        const subs = [
          '               ^-------!                ',
          '              --------^-------!         ',
          '              ----------------^-------! '
        ];
        const expected = '--a--b----a--b----a--b--#';

        let retries = 0;
        const result = e1.pipe(
          map((n: any) => {
            if (n === 'c') {
              throw 'bad';
            }
            return n;
          }),
          catchError((err: any, caught: any) => {
            if (retries++ === 2) {
              throw 'done';
            }
            return caught;
          })
        );

        expectSource(result).toBe(expected, undefined, 'done');
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    }
  );

  it(
    'should catch and allow the hot observable to proceed with the third ' +
      '(caught) argument',
    () => {
      testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const e1 = hot('  --a--b--c----d---|');
        const subs = [
          '               ^-------!         ',
          '              --------^--------! '
        ];
        const expected = '--a--b-------d---|';

        let retries = 0;
        const result = e1.pipe(
          map((n: any) => {
            if (n === 'c') {
              throw 'bad';
            }
            return n;
          }),
          catchError((err: any, caught: any) => {
            if (retries++ === 2) {
              throw 'done';
            }
            return caught;
          })
        );

        expectSource(result).toBe(expected, undefined, 'done');
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    }
  );

  it('should catch and replace a Observable.throw() as the source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' #');
      const subs = '    (^!)';
      const expected = '(abc|)';

      const result = e1.pipe(catchError((err: any) => of('a', 'b', 'c')));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should mirror the source if it does not raise errors', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' --a--b--c--|');
      const subs = '    ^----------!';
      const expected = '--a--b--c--|';

      const result = e1.pipe(catchError((err: any) => of('x', 'y', 'z')));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should complete if you return Observable.empty()', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--#');
      const e1subs = '  ^-------!';
      const e2 = cold('         |');
      const e2subs = '  --------(^!)';
      const expected = '--a--b--|';

      const result = e1.pipe(catchError(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error if you return Observable.throw()', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--#');
      const e1subs = '  ^-------!';
      const e2 = cold('         #');
      const e2subs = '  --------(^!)';
      const expected = '--a--b--#';

      const result = e1.pipe(catchError(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should never terminate if you return NEVER', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--#');
      const e1subs = '  ^-------!';
      const e2 = cold('         -');
      const e2subs = '  --------^';
      const expected = '--a--b---';

      const result = e1.pipe(catchError(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should pass the error as the first argument', (done: MochaDone) => {
    throwError('bad')
      .pipe(
        catchError((err: any) => {
          expect(err).to.equal('bad');
          return EMPTY;
        })
      )
      .subscribe(
        () => {},
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
  });

  it('should accept selector returns any Input', (done: MochaDone) => {
    const input$ = createInputs(42);

    input$
      .pipe(mergeMap(input => throwError('bad').pipe(catchError(err => input))))
      .subscribe(
        x => {
          expect(x).to.be.equal(42);
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
  });

  it('should catch errors throw from within the constructor', () => {
    // See https://github.com/ReactiveX/rxjs/issues/3740
    testScheduler.run(({expectSource}) => {
      const source = concat(
        new Observable<string>(o => {
          o.next('a');
          throw 'kaboom';
        }).pipe(catchError(_ => of('b'))),
        of('c')
      );
      const expected = '(abc|)';
      expectSource(source).toBe(expected);
    });
  });

  context('fromPromise', () => {
    type SetTimeout = (
      callback: (...args: any[]) => void,
      ms: number,
      ...args: any[]
    ) => NodeJS.Timer;

    let trueSetTimeout: SetTimeout;
    let sandbox: sinon.SinonSandbox;
    let timers: sinon.SinonFakeTimers;

    beforeEach(() => {
      trueSetTimeout = global.setTimeout;
      sandbox = sinon.createSandbox();
      timers = sandbox.useFakeTimers();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should chain a throw from a promise using Observable.throw', (done: MochaDone) => {
      const subscribeSpy = sinon.spy();
      const errorSpy = sinon.spy();
      const thrownError = new Error('BROKEN THROW');
      const testError = new Error('BROKEN PROMISE');
      from(Promise.reject(testError))
        .pipe(catchError(err => throwError(thrownError)))
        .subscribe(subscribeSpy, errorSpy);

      trueSetTimeout(() => {
        try {
          timers.tick(1);
        } catch (e) {
          return done(new Error('This should not have thrown an error'));
        }
        expect(subscribeSpy).not.to.be.called;
        expect(errorSpy).to.have.been.called;
        expect(errorSpy).to.have.been.calledWith(thrownError);
        done();
      }, 0);
    });
  });

  // TODO(v8): see https://github.com/ReactiveX/rxjs/issues/5115
  // The re-implementation in version 8 should fix the problem in the
  // referenced issue. Closed subscribers should remain closed.
  /*
  it('issue #5115', (done: MochaDone) => {
    const source = new Observable<string>(observer => {
      observer.error(new Error('kaboom!'));
      observer.complete();
    });

    const sourceWithDelay = new Observable<string>(observer => {
      observer.next('delayed');
      observer.complete();
    }).pipe(delay(0));

    const values: string[] = [];
    source.pipe(
      catchError(err => sourceWithDelay)
    )
    .subscribe(
      value => values.push(value),
      err => done(err),
      () => {
        expect(values).toEqual(['delayed']);
        done();
      }
    );
  });
  */
});

describe('retry', () => {
  asDiagram('retry(2)')(
    'should handle a basic source that emits next then errors, count=3',
    () => {
      const source = cold('--1-2-3-#');
      const subs = [
        '^       !                ',
        '        ^       !        ',
        '                ^       !'
      ];
      const expected = '--1-2-3---1-2-3---1-2-3-#';

      const result = source.pipe(retry(2));

      expectSource(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(retry()); // $ExpectType Observable<number>
  });

  it('should accept a count parameter', () => {
    const o = of(1, 2, 3).pipe(retry(47)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(retry('aa')); // $ExpectError
  });

  it('should retry a number of times, without error, then complete', (done: MochaDone) => {
    let errors = 0;
    const retries = 2;
    Observable.create((observer: Observer<number>) => {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          if (++errors < retries) {
            throw 'bad';
          }
          errors = 0;
          return x;
        }),
        retry(retries)
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(42);
        },
        (err: any) => {
          expect('this was called').to.be.true;
        },
        done
      );
  });

  it('should retry a number of times, then call error handler', (done: MochaDone) => {
    let errors = 0;
    const retries = 2;
    Observable.create((observer: Observer<number>) => {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          errors += 1;
          throw 'bad';
        }),
        retry(retries - 1)
      )
      .subscribe(
        (x: number) => {
          done("shouldn't next");
        },
        (err: any) => {
          expect(errors).to.equal(2);
          done();
        },
        () => {
          done("shouldn't complete");
        }
      );
  });

  it('should retry a number of times, then call error handler (with resetOnSuccess)', (done: MochaDone) => {
    let errors = 0;
    const retries = 2;
    Observable.create((observer: Observer<number>) => {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          errors += 1;
          throw 'bad';
        }),
        retry({count: retries - 1, resetOnSuccess: true})
      )
      .subscribe(
        (x: number) => {
          done("shouldn't next");
        },
        (err: any) => {
          expect(errors).to.equal(2);
          done();
        },
        () => {
          done("shouldn't complete");
        }
      );
  });

  it('should retry a number of times, then call next handler without error, then retry and complete', (done: MochaDone) => {
    let index = 0;
    let errors = 0;
    const retries = 2;
    defer(() => range(0, 4 - index))
      .pipe(
        mergeMap(() => {
          index++;
          if (index === 1 || index === 3) {
            errors++;
            return throwError('bad');
          } else {
            return of(42);
          }
        }),
        retry({count: retries - 1, resetOnSuccess: true})
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(42);
        },
        (err: any) => {
          done("shouldn't error");
        },
        () => {
          expect(errors).to.equal(retries);
          done();
        }
      );
  });

  it('should retry a number of times, then call next handler without error, then retry and error', (done: MochaDone) => {
    let index = 0;
    let errors = 0;
    const retries = 2;
    defer(() => range(0, 4 - index))
      .pipe(
        mergeMap(() => {
          index++;
          if (index === 1 || index === 3) {
            errors++;
            return throwError('bad');
          } else {
            return of(42);
          }
        }),
        retry({count: retries - 1, resetOnSuccess: false})
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(42);
        },
        (err: any) => {
          expect(errors).to.equal(retries);
          done();
        },
        () => {
          done("shouldn't complete");
        }
      );
  });

  it('should retry until successful completion', (done: MochaDone) => {
    let errors = 0;
    const retries = 10;
    Observable.create((observer: Observer<number>) => {
      observer.next(42);
      observer.complete();
    })
      .pipe(
        map((x: any) => {
          if (++errors < retries) {
            throw 'bad';
          }
          errors = 0;
          return x;
        }),
        retry(),
        take(retries)
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(42);
        },
        (err: any) => {
          expect('this was called').to.be.true;
        },
        done
      );
  });

  it('should handle an empty source', () => {
    const source = cold('|');
    const subs = '(^!)';
    const expected = '|';

    const result = source.pipe(retry());

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should handle a never source', () => {
    const source = cold('-');
    const subs = '^';
    const expected = '-';

    const result = source.pipe(retry());

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return a never observable given an async just-throw source and no count', () => {
    const source = cold('-#'); // important that it's not a sync error
    const unsub = '                                     !';
    const expected = '--------------------------------------';

    const result = source.pipe(retry());

    expectSource(result, unsub).toBe(expected);
  });

  it('should handle a basic source that emits next then completes', () => {
    const source = hot('--1--2--^--3--4--5---|');
    const subs = '^            !';
    const expected = '---3--4--5---|';

    const result = source.pipe(retry());

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should handle a basic source that emits next but does not complete', () => {
    const source = hot('--1--2--^--3--4--5---');
    const subs = '^            ';
    const expected = '---3--4--5---';

    const result = source.pipe(retry());

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should handle a basic source that emits next then errors, no count', () => {
    const source = cold('--1-2-3-#');
    const unsub = '                                     !';
    const subs = [
      '^       !                             ',
      '        ^       !                     ',
      '                ^       !             ',
      '                        ^       !     ',
      '                                ^    !'
    ];
    const expected = '--1-2-3---1-2-3---1-2-3---1-2-3---1-2-';

    const result = source.pipe(retry());

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it(
    'should handle a source which eventually throws, count=3, and result is ' +
      'unsubscribed early',
    () => {
      const source = cold('--1-2-3-#');
      const unsub = '             !           ';
      const subs = ['^       !                ', '        ^    !           '];
      const expected = '--1-2-3---1-2-';

      const result = source.pipe(retry(3));

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const source = cold('--1-2-3-#');
    const subs = ['^       !                ', '        ^    !           '];
    const expected = '--1-2-3---1-2-';
    const unsub = '             !           ';

    const result = source.pipe(
      mergeMap((x: string) => of(x)),
      retry(100),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should retry a synchronous source (multicasted and refCounted) multiple times', (done: MochaDone) => {
    const expected = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3];

    of(1, 2, 3)
      .pipe(
        concat(throwError('bad!')),
        multicast(() => new Subject<number>()),
        refCount(),
        retry(4)
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(expected.shift());
        },
        (err: any) => {
          expect(err).to.equal('bad!');
          expect(expected.length).to.equal(0);
          done();
        },
        () => {
          done(new Error('should not be called'));
        }
      );
  });
});

describe('retryWhen', () => {
  asDiagram('retryWhen')(
    'should handle a source with eventual error using a hot notifier',
    () => {
      const source = cold('-1--2--#');
      const subs = [
        '^      !                     ',
        '             ^      !        ',
        '                          ^ !'
      ];
      const notifier = hot('-------------r------------r-|');
      const expected = '-1--2---------1--2---------1|';

      const result = source.pipe(retryWhen((errors: any) => notifier));

      expectSource(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(retryWhen(errors => errors)); // $ExpectType Observable<number>
  });

  it('should infer correctly when the error observable has a different type', () => {
    const o = of(1, 2, 3).pipe(retryWhen(retryWhen(errors => of('a', 'b', 'c')))); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(retryWhen()); // $ExpectError
  });

  it('should enforce types of the notifier', () => {
    const o = of(1, 2, 3).pipe(retryWhen(() => 8)); // $ExpectError
  });

  it('should handle a source with eventual error using a hot notifier that raises error', () => {
    const source = cold('-1--2--#');
    const subs = [
      '^      !                    ',
      '           ^      !           ',
      '                   ^      !   '
    ];
    const notifier = hot('-----------r-------r---------#');
    const expected = '-1--2-------1--2----1--2-----#';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should retry when notified via returned notifier on thrown error', (done: MochaDone) => {
    let retried = false;
    const expected = [1, 2, 1, 2];
    let i = 0;
    of(1, 2, 3)
      .pipe(
        map((n: number) => {
          if (n === 3) {
            throw 'bad';
          }
          return n;
        }),
        retryWhen((errors: any) =>
          errors.pipe(
            map((x: any) => {
              expect(x).to.equal('bad');
              if (retried) {
                throw new Error('done');
              }
              retried = true;
              return x;
            })
          )
        )
      )
      .subscribe(
        (x: any) => {
          expect(x).to.equal(expected[i++]);
        },
        (err: any) => {
          expect(err).to.be.an('error', 'done');
          done();
        }
      );
  });

  it('should retry when notified and complete on returned completion', (done: MochaDone) => {
    const expected = [1, 2, 1, 2];
    of(1, 2, 3)
      .pipe(
        map((n: number) => {
          if (n === 3) {
            throw 'bad';
          }
          return n;
        }),
        retryWhen((errors: any) => EMPTY)
      )
      .subscribe(
        (n: number) => {
          expect(n).to.equal(expected.shift());
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
  });

  it('should apply an empty notifier on an empty source', () => {
    const source = cold('|');
    const subs = '(^!)';
    const notifier = cold('|');
    const expected = '|';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should apply a never notifier on an empty source', () => {
    const source = cold('|');
    const subs = '(^!)';
    const notifier = cold('-');
    const expected = '|';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should apply an empty notifier on a never source', () => {
    const source = cold('-');
    const unsub = '                                         !';
    const subs = '^                                        !';
    const notifier = cold('|');
    const expected = '-';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should apply a never notifier on a never source', () => {
    const source = cold('-');
    const unsub = '                                         !';
    const subs = '^                                        !';
    const notifier = cold('-');
    const expected = '-';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return an empty observable given a just-throw source and empty notifier', () => {
    const source = cold('#');
    const notifier = cold('|');
    const expected = '|';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result).toBe(expected);
  });

  it('should return a never observable given a just-throw source and never notifier', () => {
    const source = cold('#');
    const notifier = cold('-');
    const expected = '-';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result).toBe(expected);
  });

  it('should hide errors using a never notifier on a source with eventual error', () => {
    const source = cold('--a--b--c--#');
    const subs = '^          !';
    const notifier = cold('-');
    const expected = '--a--b--c---------------------------------';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should propagate error thrown from notifierSelector function', () => {
    const source = cold('--a--b--c--#');
    const subs = '^          !';
    const expected = '--a--b--c--#';

    const result = source.pipe(
      retryWhen(<any>(() => {
        throw 'bad!';
      }))
    );

    expectSource(result).toBe(expected, undefined, 'bad!');
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it(
    'should replace error with complete using an empty notifier on a source ' +
      'with eventual error',
    () => {
      const source = cold('--a--b--c--#');
      const subs = '^          !';
      const notifier = cold('|');
      const expected = '--a--b--c--|';

      const result = source.pipe(retryWhen((errors: any) => notifier));

      expectSource(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should mirror a basic cold source with complete, given a never notifier', () => {
    const source = cold('--a--b--c--|');
    const subs = '^          !';
    const notifier = cold('|');
    const expected = '--a--b--c--|';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should mirror a basic cold source with no termination, given a never notifier', () => {
    const source = cold('--a--b--c---');
    const subs = '^           ';
    const notifier = cold('|');
    const expected = '--a--b--c---';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should mirror a basic hot source with complete, given a never notifier', () => {
    const source = hot('-a-^--b--c--|');
    const subs = '^        !';
    const notifier = cold('|');
    const expected = '---b--c--|';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should handle a hot source that raises error but eventually completes', () => {
    const source = hot('-1--2--3----4--5---|');
    const ssubs = ['^      !            ', '              ^    !'];
    const notifier = hot('--------------r--------r---r--r--r---|');
    const nsubs = '       ^           !';
    const expected = '-1--2---      -5---|';

    const result = source.pipe(
      map((x: string) => {
        if (x === '3') {
          throw 'error';
        }
        return x;
      }),
      retryWhen(() => notifier)
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(ssubs);
    expectSubscriptions(notifier.subscriptions).toBe(nsubs);
  });

  it('should tear down resources when result is unsubscribed early', () => {
    const source = cold('-1--2--#');
    const unsub = '                    !       ';
    const subs = [
      '^      !                    ',
      '         ^      !           ',
      '                 ^  !       '
    ];
    const notifier = hot('---------r-------r---------#');
    const nsubs = '       ^            !       ';
    const expected = '-1--2-----1--2----1--       ';

    const result = source.pipe(retryWhen((errors: any) => notifier));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
    expectSubscriptions(notifier.subscriptions).toBe(nsubs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const source = cold('-1--2--#');
    const subs = [
      '^      !                    ',
      '         ^      !           ',
      '                 ^  !       '
    ];
    const notifier = hot('---------r-------r-------r-#');
    const nsubs = '       ^            !       ';
    const expected = '-1--2-----1--2----1--       ';
    const unsub = '                    !       ';

    const result = source.pipe(
      mergeMap((x: string) => of(x)),
      retryWhen((errors: any) => notifier),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
    expectSubscriptions(notifier.subscriptions).toBe(nsubs);
  });

  it(
    'should handle a source with eventual error using a dynamic notifier ' +
      'selector which eventually throws',
    () => {
      const source = cold('-1--2--#');
      const subs = [
        '^      !              ',
        '       ^      !       ',
        '              ^      !'
      ];
      const expected = '-1--2---1--2---1--2--#';

      let invoked = 0;
      const result = source.pipe(
        retryWhen((errors: any) =>
          errors.pipe(
            map((err: any) => {
              if (++invoked === 3) {
                throw 'error';
              } else {
                return 'x';
              }
            })
          )
        )
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it(
    'should handle a source with eventual error using a dynamic notifier ' +
      'selector which eventually completes',
    () => {
      const source = cold('-1--2--#');
      const subs = [
        '^      !              ',
        '       ^      !       ',
        '              ^      !'
      ];
      const expected = '-1--2---1--2---1--2--|';

      let invoked = 0;
      const result = source.pipe(
        retryWhen((errors: any) =>
          errors.pipe(
            map(() => 'x'),
            takeUntil(
              errors.pipe(
                mergeMap(() => {
                  if (++invoked < 3) {
                    return EMPTY;
                  } else {
                    return of('stop!');
                  }
                })
              )
            )
          )
        )
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );
});
