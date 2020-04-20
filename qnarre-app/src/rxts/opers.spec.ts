/** @test {catch} */
describe('catchError', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('catch')(
    'should catch error and replace with a cold Observable',
    () => {
      testScheduler.run(({hot, cold, expectSource}) => {
        const e1 = hot('  --a--b--#       ');
        const e2 = cold('         -1-2-3-|');
        const expected = '--a--b---1-2-3-|';

        const result = e1.pipe(catchError((err: any) => e2));

        expectSource(result).toBe(expected);
      });
    }
  );

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

      const result = e1.pipe(catchError(() => asInteropSource(e2)));

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
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).to.deep.equal([1, 2]);
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
        () => {
          //noop
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
  });

  it('should accept selector returns any SourceInput', (done: MochaDone) => {
    const input$ = createSourceInputs(42);

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
        expect(values).to.deep.equal(['delayed']);
        done();
      }
    );
  });
  */
});

describe('defaultIfEmpty', () => {
  asDiagram('defaultIfEmpty(42)')(
    'should return the Observable if not empty with a default value',
    () => {
      const e1 = hot('--------|');
      const expected = '--------(x|)';

      // TODO: Fix `defaultIfEmpty` typings
      expectSource(e1.pipe(defaultIfEmpty(42) as any)).toBe(expected, {
        x: 42
      });
    }
  );

  it('should return the argument if Observable is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(x|)';

    expectSource(e1.pipe(defaultIfEmpty('x'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return null if the Observable is empty and no arguments', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(x|)';

    expectSource(e1.pipe(defaultIfEmpty())).toBe(expected, {x: null});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return the Observable if not empty with a default value', () => {
    const e1 = hot('--a--b--|');
    const e1subs = '^       !';
    const expected = '--a--b--|';

    expectSource(e1.pipe(defaultIfEmpty('x'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return the Observable if not empty with no default value', () => {
    const e1 = hot('--a--b--|');
    const e1subs = '^       !';
    const expected = '--a--b--|';

    expectSource(e1.pipe(defaultIfEmpty())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--b--|');
    const e1subs = '^   !    ';
    const expected = '--a--    ';
    const unsub = '    !    ';

    const result = e1.pipe(defaultIfEmpty('x'));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const e1 = hot('--a--b--|');
    const e1subs = '^   !    ';
    const expected = '--a--    ';
    const unsub = '    !    ';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      defaultIfEmpty('x'),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should error if the Observable errors', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(defaultIfEmpty('x'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

/** @test {delay} */
describe('delay', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('delay(20)')('should delay by specified timeframe', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---a--b--|');
      const t = 2; //      --|
      const expected = '-----a--b|';
      const subs = '^--------!';

      const result = e1.pipe(delay(t, testScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should delay by absolute time period', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--|   ');
      const t = 3; //     ---|
      const expected = '-----a--(b|)';
      const subs = '    ^-------!   ';

      const absoluteDelay = new Date(testScheduler.now() + t);
      const result = e1.pipe(delay(absoluteDelay, testScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should delay by absolute time period after subscription', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---^--a--b--|   ');
      const t = 3; //         ---|
      const expected = '   ------a--(b|)';
      const subs = '       ^--------!   ';

      const absoluteDelay = new Date(testScheduler.now() + t);
      const result = e1.pipe(delay(absoluteDelay, testScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should raise error when source raises error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a---b---#');
      const t = 3; //      ---|
      const expected = '------a---b#';
      const subs = '    ^----------!';

      const result = e1.pipe(delay(t, testScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should raise error when source raises error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--#');
      const t = 3; //     ---|
      const expected = '-----a--#';
      const subs = '    ^-------!';

      const absoluteDelay = new Date(testScheduler.now() + t);
      const result = e1.pipe(delay(absoluteDelay, testScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should raise error when source raises error after subscription', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---^---a---b---#');
      const t = 3; //          ---|
      const expected = '   -------a---b#';
      const e1Sub = '      ^-----------!';

      const absoluteDelay = new Date(testScheduler.now() + t);
      const result = e1.pipe(delay(absoluteDelay, testScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1Sub);
    });
  });

  it('should delay when source does not emits', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ----|   ');
      const t = 3; //       ---|
      const expected = '----|';
      const subs = '    ^---!   ';

      const result = e1.pipe(delay(t, testScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should not delay when source is empty', () => {
    testScheduler.run(({cold, expectSource}) => {
      const e1 = cold('|');
      const t = 3; // ---|
      const expected = '|';

      const result = e1.pipe(delay(t, testScheduler));

      expectSource(result).toBe(expected);
    });
  });

  it('should delay complete when a value is scheduled', () => {
    testScheduler.run(({cold, expectSource}) => {
      const e1 = cold('-a-|');
      const t = 3; //    ---|
      const expected = '----(a|)';

      const result = e1.pipe(delay(t, testScheduler));

      expectSource(result).toBe(expected);
    });
  });

  it('should not complete when source does not completes', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a---b---------');
      const t = 3; //      ---|
      const expected = '------a---b------';
      const unsub = '   ----------------!';
      const subs = '    ^---------------!';

      const result = e1.pipe(delay(t, testScheduler));

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a---b----');
      const t = 3; //      ---|
      const e1subs = '  ^-------!   ';
      const expected = '------a--   ';
      const unsub = '   --------!   ';

      const result = e1.pipe(
        mergeMap((x: any) => of(x)),
        delay(t, testScheduler),
        mergeMap((x: any) => of(x))
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should not complete when source never completes', () => {
    testScheduler.run(({cold, expectSource}) => {
      const e1 = cold(' -');
      const t = 3; //   ---|
      const expected = '-';

      const result = e1.pipe(delay(t, testScheduler));

      expectSource(result).toBe(expected);
    });
  });

  it('should unsubscribe scheduled actions after execution', () => {
    testScheduler.run(({cold, expectSource}) => {
      let subscribeSpy: any = null;
      const counts: number[] = [];

      const e1 = cold('      a|');
      const expected = '     --a-(a|)';
      const duration = 1; // -|
      const result = e1.pipe(
        repeatWhen(notifications => {
          const delayed = notifications.pipe(delay(duration, testScheduler));
          subscribeSpy = sinon.spy((delayed as any)['source'], 'subscribe');
          return delayed;
        }),
        skip(1),
        take(2),
        tap({
          next() {
            const [[subscriber]] = subscribeSpy.args;
            counts.push(subscriber._subscriptions.length);
          },
          complete() {
            expect(counts).to.deep.equal([1, 1]);
          }
        })
      );

      expectSource(result).toBe(expected);
    });
  });

  it('should be possible to delay complete by composition', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---a--b--|');
      const t = 2; //      --|--|
      const expected = '-----a--b--|';
      const subs = '    ^--------!';

      const result = concat(
        e1.pipe(delay(t, testScheduler)),
        of(undefined).pipe(delay(t, testScheduler), ignoreElements())
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });
});

/** @test {delayWhen} */
describe('delayWhen', () => {
  asDiagram('delayWhen(durationSelector)')(
    'should delay by duration selector',
    () => {
      const e1 = hot('---a---b---c--|');
      const expected = '-----a------c----(b|)';
      const subs = '^             !';
      const selector = [cold('--x--|'), cold('----------(x|)'), cold('-x--|')];
      const selectorSubs = [
        '   ^ !            ',
        '       ^         !',
        '           ^!     '
      ];

      let idx = 0;
      function durationSelector(x: any) {
        return selector[idx++];
      }

      const result = e1.pipe(delayWhen(durationSelector));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(selector[0].subscriptions).toBe(selectorSubs[0]);
      expectSubscriptions(selector[1].subscriptions).toBe(selectorSubs[1]);
      expectSubscriptions(selector[2].subscriptions).toBe(selectorSubs[2]);
    }
  );

  it('should delay by selector', () => {
    const e1 = hot('--a--b--|');
    const expected = '---a--b-|';
    const subs = '^       !';
    const selector = cold('-x--|');
    const selectorSubs = ['  ^!     ', '     ^!  '];

    const result = e1.pipe(delayWhen((x: any) => selector));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
  });

  it('should raise error if source raises error', () => {
    const e1 = hot('--a--#');
    const expected = '---a-#';
    const subs = '^    !';
    const selector = cold('-x--|');
    const selectorSubs = '  ^!     ';

    const result = e1.pipe(delayWhen((x: any) => selector));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
  });

  it('should raise error if selector raises error', () => {
    const e1 = hot('--a--b--|');
    const expected = '---#';
    const subs = '^  !';
    const selector = cold('-#');
    const selectorSubs = '  ^!     ';

    const result = e1.pipe(delayWhen((x: any) => selector));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
  });

  it('should delay by selector and completes after value emits', () => {
    const e1 = hot('--a--b--|');
    const expected = '---------a--(b|)';
    const subs = '^       !';
    const selector = cold('-------x--|');
    const selectorSubs = ['  ^      !', '     ^      !'];

    const result = e1.pipe(delayWhen((x: any) => selector));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
  });

  it('should delay by selector completes if selector does not emits', () => {
    const e1 = hot('--a--b--|');
    const expected = '------a--(b|)';
    const subs = '^       !';
    const selector = cold('----|');
    const selectorSubs = ['  ^   !', '     ^   !'];

    const result = e1.pipe(delayWhen((x: any) => selector));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
  });

  it('should emit if the selector completes synchronously', () => {
    const e1 = hot('a--|');
    const expected = 'a--|';
    const subs = '^  !';

    const result = e1.pipe(delayWhen((x: any) => EMPTY));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should emit if the source completes synchronously and the selector completes synchronously', () => {
    const e1 = hot('(a|)');
    const expected = '(a|)';
    const subs = '(^!)';

    const result = e1.pipe(delayWhen((x: any) => EMPTY));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should not emit if selector never emits', () => {
    const e1 = hot('--a--b--|');
    const expected = '-';
    const subs = '^       !';
    const selector = cold('-');
    const selectorSubs = ['  ^      ', '     ^   '];

    const result = e1.pipe(delayWhen((x: any) => selector));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
  });

  it('should delay by first value from selector', () => {
    const e1 = hot('--a--b--|');
    const expected = '------a--(b|)';
    const subs = '^       !';
    const selector = cold('----x--y--|');
    const selectorSubs = ['  ^   !', '     ^   !'];

    const result = e1.pipe(delayWhen((x: any) => selector));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
  });

  it('should delay by selector does not completes', () => {
    const e1 = hot('--a--b--|');
    const expected = '------a--(b|)';
    const subs = '^       !';
    const selector = cold('----x-----y---');
    const selectorSubs = ['  ^   !', '     ^   !'];

    const result = e1.pipe(delayWhen((x: any) => selector));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
  });

  it('should raise error if selector throws', () => {
    const e1 = hot('--a--b--|');
    const expected = '--#';
    const subs = '^ !';

    const err = new Error('error');
    const result = e1.pipe(
      delayWhen(<any>((x: any) => {
        throw err;
      }))
    );

    expectSource(result).toBe(expected, null, err);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should start subscription when subscription delay emits', () => {
    const e1 = hot('-----a---b---|');
    const expected = '  -----a---b-|';
    const subs = '  ^          !';
    const selector = cold('--x--|');
    const selectorSubs = ['     ^ !', '         ^ !'];
    const subDelay = cold('--x--|');
    const subDelaySub = '^ !';

    const result = e1.pipe(delayWhen((x: any) => selector, subDelay));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    expectSubscriptions(subDelay.subscriptions).toBe(subDelaySub);
  });

  it('should start subscription when subscription delay completes without emit value', () => {
    const e1 = hot('-----a---b---|');
    const expected = '  -----a---b-|';
    const subs = '  ^          !';
    const selector = cold('--x--|');
    const selectorSubs = ['     ^ !', '         ^ !'];
    const subDelay = cold('--|');
    const subDelaySub = '^ !';

    const result = e1.pipe(delayWhen((x: any) => selector, subDelay));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
    expectSubscriptions(subDelay.subscriptions).toBe(subDelaySub);
  });

  it('should raise error when subscription delay raises error', () => {
    const e1 = hot('-----a---b---|');
    const expected = '   #          ';
    const selector = cold('--x--|');
    const subDelay = cold('---#');
    const subDelaySub = '^  !';

    const result = e1.pipe(delayWhen((x: any) => selector, subDelay));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe([]);
    expectSubscriptions(selector.subscriptions).toBe([]);
    expectSubscriptions(subDelay.subscriptions).toBe(subDelaySub);
  });

  it('should complete when duration selector returns synchronous observable', () => {
    let next: boolean = false;
    let complete: boolean = false;

    of(1)
      .pipe(delayWhen(() => of(2)))
      .subscribe(
        () => (next = true),
        null,
        () => (complete = true)
      );

    expect(next).to.be.true;
    expect(complete).to.be.true;
  });

  it('should call predicate with indices starting at 0', () => {
    const e1 = hot('--a--b--c--|');
    const expected = '--a--b--c--|';
    const selector = cold('(x|)');

    let indices: number[] = [];
    const predicate = (value: string, index: number) => {
      indices.push(index);
      return selector;
    };

    const result = e1.pipe(delayWhen(predicate));

    expectSource(
      result.pipe(
        tap(null, null, () => {
          expect(indices).to.deep.equal([0, 1, 2]);
        })
      )
    ).toBe(expected);
  });
});

/** @test {dematerialize} */
describe('dematerialize', () => {
  asDiagram('dematerialize')('should dematerialize an Observable', () => {
    const values = {
      a: '{x}',
      b: '{y}',
      c: '{z}',
      d: '|'
    };

    const e1 = hot('--a--b--c--d-|', values);
    const expected = '--x--y--z--|';

    const result = e1.pipe(
      map((x: string) => {
        if (x === '|') {
          return Notification.createDone();
        } else {
          return Notification.createNext(x.replace('{', '').replace('}', ''));
        }
      }),
      dematerialize()
    );

    expectSource(result).toBe(expected);
  });

  it('should dematerialize a happy stream', () => {
    const values = {
      a: Notification.createNext('w'),
      b: Notification.createNext('x'),
      c: Notification.createNext('y'),
      d: Notification.createDone()
    };

    const e1 = hot('--a--b--c--d--|', values);
    const e1subs = '^          !';
    const expected = '--w--x--y--|';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize a sad stream', () => {
    const values = {
      a: Notification.createNext('w'),
      b: Notification.createNext('x'),
      c: Notification.createNext('y'),
      d: Notification.createFail('error')
    };

    const e1 = hot('--a--b--c--d--|', values);
    const e1subs = '^          !';
    const expected = '--w--x--y--#';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize stream does not completes', () => {
    const e1 = hot('------', NO_VALUES);
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize stream never completes', () => {
    const e1 = cold('-', NO_VALUES);
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize stream does not emit', () => {
    const e1 = hot('----|', NO_VALUES);
    const e1subs = '^   !';
    const expected = '----|';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize empty stream', () => {
    const e1 = cold('|', NO_VALUES);
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize stream throws', () => {
    const error = 'error';
    const e1 = hot('(x|)', {x: Notification.createFail(error)});
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(dematerialize())).toBe(expected, null, error);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const values = {
      a: Notification.createNext('w'),
      b: Notification.createNext('x')
    };

    const e1 = hot('--a--b--c--d--|', values);
    const e1subs = '^      !       ';
    const expected = '--w--x--       ';
    const unsub = '       !       ';

    const result = e1.pipe(dematerialize());

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const values = {
      a: Notification.createNext('w'),
      b: Notification.createNext('x')
    };

    const e1 = hot('--a--b--c--d--|', values);
    const e1subs = '^      !       ';
    const expected = '--w--x--       ';
    const unsub = '       !       ';

    const result = e1.pipe(
      mergeMap((x: any) => of(x)),
      dematerialize(),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize and completes when stream compltes with complete notification', () => {
    const e1 = hot('----(a|)', {a: Notification.createDone()});
    const e1subs = '^   !';
    const expected = '----|';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize and completes when stream emits complete notification', () => {
    const e1 = hot('----a--|', {a: Notification.createDone()});
    const e1subs = '^   !';
    const expected = '----|';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

/** @test {every} */
describe('every', () => {
  function truePredicate(x: number | string) {
    return true;
  }

  function predicate(x: number | string) {
    return +x % 5 === 0;
  }

  asDiagram('every(x => x % 5 === 0)')(
    'should return false if only some of element matches with predicate',
    () => {
      const source = hot('--a--b--c--d--e--|', {
        a: 5,
        b: 10,
        c: 15,
        d: 18,
        e: 20
      });
      const sourceSubs = '^          !      ';
      const expected = '-----------(F|)   ';

      expectSource(source.pipe(every(predicate))).toBe(expected, {
        F: false
      });
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    }
  );

  it('should accept thisArg with scalar observables', () => {
    const thisArg = {};

    of(1)
      .pipe(
        every(function (this: any, value: number, index: number) {
          expect(this).to.deep.equal(thisArg);
          return true;
        }, thisArg)
      )
      .subscribe();
  });

  it('should accept thisArg with array observables', () => {
    const thisArg = {};

    of(1, 2, 3, 4)
      .pipe(
        every(function (this: any, value: number, index: number) {
          expect(this).to.deep.equal(thisArg);
          return true;
        }, thisArg)
      )
      .subscribe();
  });

  it('should accept thisArg with ordinary observables', () => {
    const thisArg = {};

    Observable.create((observer: Observer<number>) => {
      observer.next(1);
      observer.complete();
    })
      .pipe(
        every(function (this: any, value: number, index: number) {
          expect(this).to.deep.equal(thisArg);
          return true;
        }, thisArg)
      )
      .subscribe();
  });

  it('should emit true if source is empty', () => {
    const source = hot('-----|');
    const sourceSubs = '^    !';
    const expected = '-----(x|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {x: true});
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit false if single source of element does not match with predicate', () => {
    const source = hot('--a--|');
    const sourceSubs = '^ !';
    const expected = '--(x|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {x: false});
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit false if none of element does not match with predicate', () => {
    const source = hot('--a--b--c--d--e--|');
    const sourceSubs = '^ !';
    const expected = '--(x|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {x: false});
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should return false if only some of element matches with predicate', () => {
    const source = hot('--a--b--c--d--e--|', {a: 5, b: 10, c: 15});
    const sourceSubs = '^          !';
    const expected = '-----------(x|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {x: false});
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const source = hot('--a--b--c--d--e--|', {a: 5, b: 10, c: 15});
    const sourceSubs = '^      !          ';
    const expected = '--------          ';
    const unsub = '       !          ';

    const result = source.pipe(every(predicate));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not break unsubscription chains when result Observable is unsubscribed', () => {
    const source = hot('--a--b--c--d--e--|', {a: 5, b: 10, c: 15});
    const sourceSubs = '^      !          ';
    const expected = '--------          ';
    const unsub = '       !          ';

    const result = source.pipe(
      mergeMap((x: any) => of(x)),
      every(predicate),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should propagate error if predicate eventually throws', () => {
    const source = hot('--a--b--c--d--e--|');
    const sourceSubs = '^       !';
    const expected = '--------#';

    function faultyPredicate(x: string) {
      if (x === 'c') {
        throw 'error';
      } else {
        return true;
      }
    }

    expectSource(source.pipe(every(faultyPredicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit true if single source element match with predicate', () => {
    const source = hot('--a--|', {a: 5});
    const sourceSubs = '^    !';
    const expected = '-----(x|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {x: true});
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit true if Scalar source matches with predicate', () => {
    const source = of(5);
    const expected = '(T|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {T: true});
  });

  it('should emit false if Scalar source does not match with predicate', () => {
    const source = of(3);
    const expected = '(F|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {F: false});
  });

  it('should propagate error if predicate throws on Scalar source', () => {
    const source = of(3);
    const expected = '#';

    function faultyPredicate(x: number) {
      throw 'error';
    }

    expectSource(source.pipe(every(<any>faultyPredicate))).toBe(expected);
  });

  it('should emit true if Array source matches with predicate', () => {
    const source = of(5, 10, 15, 20);
    const expected = '(T|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {T: true});
  });

  it('should emit false if Array source does not match with predicate', () => {
    const source = of(5, 9, 15, 20);
    const expected = '(F|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {F: false});
  });

  it('should propagate error if predicate eventually throws on Array source', () => {
    const source = of(5, 10, 15, 20);
    const expected = '#';

    function faultyPredicate(x: number) {
      if (x === 15) {
        throw 'error';
      }
      return true;
    }

    expectSource(source.pipe(every(faultyPredicate))).toBe(expected);
  });

  it('should emit true if all source element matches with predicate', () => {
    const source = hot('--a--b--c--d--e--|', {
      a: 5,
      b: 10,
      c: 15,
      d: 20,
      e: 25
    });
    const sourceSubs = '^                !';
    const expected = '-----------------(x|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {x: true});
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should raise error if source raises error', () => {
    const source = hot('--#');
    const sourceSubs = '^ !';
    const expected = '--#';

    expectSource(source.pipe(every(truePredicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not completes if source never emits', () => {
    const source = cold('-');
    const sourceSubs = '^';
    const expected = '-';

    expectSource(source.pipe(every(truePredicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit true if source element matches with predicate after subscription', () => {
    const source = hot('--z--^--a--b--c--d--e--|', {
      a: 5,
      b: 10,
      c: 15,
      d: 20,
      e: 25
    });
    const sourceSubs = '^                 !';
    const expected = '------------------(x|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {x: true});
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit false if source element does not match with predicate after subscription', () => {
    const source = hot('--z--^--b--c--z--d--|', {a: 5, b: 10, c: 15, d: 20});
    const sourceSubs = '^        !';
    const expected = '---------(x|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {x: false});
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should raise error if source raises error after subscription', () => {
    const source = hot('--z--^--#');
    const sourceSubs = '^  !';
    const expected = '---#';

    expectSource(source.pipe(every(truePredicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit true if source does not emit after subscription', () => {
    const source = hot('--z--^-----|');
    const sourceSubs = '^     !';
    const expected = '------(x|)';

    expectSource(source.pipe(every(predicate))).toBe(expected, {x: true});
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });
});

/** @test {finalize} */
describe('finalize', () => {
  it('should call finalize after complete', (done: MochaDone) => {
    let completed = false;
    of(1, 2, 3)
      .pipe(
        finalize(() => {
          expect(completed).to.be.true;
          done();
        })
      )
      .subscribe(null, null, () => {
        completed = true;
      });
  });

  it('should call finalize after error', (done: MochaDone) => {
    let thrown = false;
    of(1, 2, 3)
      .pipe(
        map(function (x) {
          if (x === 3) {
            throw x;
          }
          return x;
        }),
        finalize(() => {
          expect(thrown).to.be.true;
          done();
        })
      )
      .subscribe(null, () => {
        thrown = true;
      });
  });

  it('should call finalize upon disposal', (done: MochaDone) => {
    let disposed = false;
    const subscription = timer(100)
      .pipe(
        finalize(() => {
          expect(disposed).to.be.true;
          done();
        })
      )
      .subscribe();
    disposed = true;
    subscription.unsubscribe();
  });

  it(
    'should call finalize when synchronously subscribing to and unsubscribing ' +
      'from a shared Observable',
    (done: MochaDone) => {
      interval(50).pipe(finalize(done), share()).subscribe().unsubscribe();
    }
  );

  it('should call two finalize instances in succession on a shared Observable', (done: MochaDone) => {
    let invoked = 0;
    function checkFinally() {
      invoked += 1;
      if (invoked === 2) {
        done();
      }
    }

    of(1, 2, 3)
      .pipe(finalize(checkFinally), finalize(checkFinally), share())
      .subscribe();
  });

  it('should handle empty', () => {
    let executed = false;
    let s1 = hot('|');
    let result = s1.pipe(finalize(() => (executed = true)));
    let expected = '|';
    expectSource(result).toBe(expected);
    // manually flush so `finalize()` has chance to execute before the test is over.
    rxTestScheduler.flush();
    expect(executed).to.be.true;
  });

  it('should handle never', () => {
    let executed = false;
    let s1 = hot('-');
    let result = s1.pipe(finalize(() => (executed = true)));
    let expected = '-';
    expectSource(result).toBe(expected);
    // manually flush so `finalize()` has chance to execute before the test is over.
    rxTestScheduler.flush();
    expect(executed).to.be.false;
  });

  it('should handle throw', () => {
    let executed = false;
    let s1 = hot('#');
    let result = s1.pipe(finalize(() => (executed = true)));
    let expected = '#';
    expectSource(result).toBe(expected);
    // manually flush so `finalize()` has chance to execute before the test is over.
    rxTestScheduler.flush();
    expect(executed).to.be.true;
  });

  it('should handle basic hot observable', () => {
    let executed = false;
    let s1 = hot('--a--b--c--|');
    let subs = '^          !';
    let expected = '--a--b--c--|';
    let result = s1.pipe(finalize(() => (executed = true)));
    expectSource(result).toBe(expected);
    expectSubscriptions(s1.subscriptions).toBe(subs);
    // manually flush so `finalize()` has chance to execute before the test is over.
    rxTestScheduler.flush();
    expect(executed).to.be.true;
  });

  it('should handle basic cold observable', () => {
    let executed = false;
    let s1 = cold('--a--b--c--|');
    let subs = '^          !';
    let expected = '--a--b--c--|';
    let result = s1.pipe(finalize(() => (executed = true)));
    expectSource(result).toBe(expected);
    expectSubscriptions(s1.subscriptions).toBe(subs);
    // manually flush so `finalize()` has chance to execute before the test is over.
    rxTestScheduler.flush();
    expect(executed).to.be.true;
  });

  it('should handle basic error', () => {
    let executed = false;
    let s1 = hot('--a--b--c--#');
    let subs = '^          !';
    let expected = '--a--b--c--#';
    let result = s1.pipe(finalize(() => (executed = true)));
    expectSource(result).toBe(expected);
    expectSubscriptions(s1.subscriptions).toBe(subs);
    // manually flush so `finalize()` has chance to execute before the test is over.
    rxTestScheduler.flush();
    expect(executed).to.be.true;
  });

  it('should handle unsubscription', () => {
    let executed = false;
    let s1 = hot('--a--b--c--|');
    let subs = '^     !     ';
    let expected = '--a--b-';
    let unsub = '      !';
    let result = s1.pipe(finalize(() => (executed = true)));
    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(s1.subscriptions).toBe(subs);
    // manually flush so `finalize()` has chance to execute before the test is over.
    rxTestScheduler.flush();
    expect(executed).to.be.true;
  });
});

/** @test {find} */
describe('find', () => {
  function truePredicate(x: any) {
    return true;
  }

  asDiagram('find(x => x % 5 === 0)')(
    'should return matching element from source emits single element',
    () => {
      const values = {a: 3, b: 9, c: 15, d: 20};
      const source = hot('---a--b--c--d---|', values);
      const subs = '^        !       ';
      const expected = '---------(c|)    ';

      const predicate = function (x: number) {
        return x % 5 === 0;
      };

      expectSource(source.pipe(find(predicate))).toBe(expected, values);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should throw if not provided a function', () => {
    expect(() => {
      of('yut', 'yee', 'sam').pipe(find('yee' as any));
    }).to.throw(TypeError, 'predicate is not a function');
  });

  it('should not emit if source does not emit', () => {
    const source = hot('-');
    const subs = '^';
    const expected = '-';

    expectSource(source.pipe(find(truePredicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return undefined if source is empty to match predicate', () => {
    const source = cold('|');
    const subs = '(^!)';
    const expected = '(x|)';

    const result = source.pipe(find(truePredicate));

    expectSource(result).toBe(expected, {x: undefined});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return matching element from source emits single element', () => {
    const source = hot('--a--|');
    const subs = '^ !';
    const expected = '--(a|)';

    const predicate = function (value: string) {
      return value === 'a';
    };

    expectSource(source.pipe(find(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return matching element from source emits multiple elements', () => {
    const source = hot('--a--b---c-|');
    const subs = '^    !';
    const expected = '-----(b|)';

    const predicate = function (value: string) {
      return value === 'b';
    };

    expectSource(source.pipe(find(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should work with a custom thisArg', () => {
    const source = hot('--a--b---c-|');
    const subs = '^    !';
    const expected = '-----(b|)';

    const finder = {
      target: 'b'
    };
    const predicate = function (this: typeof finder, value: string) {
      return value === this.target;
    };

    expectSource(source.pipe(find(predicate, finder))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return undefined if element does not match with predicate', () => {
    const source = hot('--a--b--c--|');
    const subs = '^          !';
    const expected = '-----------(x|)';

    const predicate = function (value: string) {
      return value === 'z';
    };

    expectSource(source.pipe(find(predicate))).toBe(expected, {
      x: undefined
    });
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const source = hot('--a--b--c--|');
    const subs = '^     !     ';
    const expected = '-------     ';
    const unsub = '      !     ';

    const result = source.pipe(find((value: string) => value === 'z'));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = hot('--a--b--c--|');
    const subs = '^     !     ';
    const expected = '-------     ';
    const unsub = '      !     ';

    const result = source.pipe(
      mergeMap(x => of(x)),
      find(value => value === 'z'),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should unsubscribe when the predicate is matched', () => {
    const source = hot('--a--b---c-|');
    const subs = '^    !';
    const expected = '-------(b|)';

    const duration = rxTestScheduler.createTime('--|');

    expectSource(
      source.pipe(
        find((value: string) => value === 'b'),
        delay(duration, rxTestScheduler)
      )
    ).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should raise if source raise error while element does not match with predicate', () => {
    const source = hot('--a--b--#');
    const subs = '^       !';
    const expected = '--------#';

    const predicate = function (value: string) {
      return value === 'z';
    };

    expectSource(source.pipe(find(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should raise error if predicate throws error', () => {
    const source = hot('--a--b--c--|');
    const subs = '^ !';
    const expected = '--#';

    const predicate = function (value: string) {
      throw 'error';
    };

    expectSource(source.pipe(find(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should support type guards without breaking previous behavior', () => {
    // tslint:disable no-unused-variable

    // type guards with interfaces and classes
    {
      interface Bar {
        bar?: string;
      }
      interface Baz {
        baz?: number;
      }
      class Foo implements Bar, Baz {
        constructor(public bar: string = 'name', public baz: number = 42) {}
      }

      const isBar = (x: any): x is Bar => x && (<Bar>x).bar !== undefined;
      const isBaz = (x: any): x is Baz => x && (<Baz>x).baz !== undefined;

      const foo: Foo = new Foo();
      of(foo)
        .pipe(find(foo => foo.baz === 42))
        .subscribe(x => x!.baz); // x is still Foo
      of(foo)
        .pipe(find(isBar))
        .subscribe(x => x!.bar); // x is Bar!

      const foobar: Bar = new Foo(); // type is interface, not the class
      of(foobar)
        .pipe(find(foobar => foobar.bar === 'name'))
        .subscribe(x => x!.bar); // <-- x is still Bar
      of(foobar)
        .pipe(find(isBar))
        .subscribe(x => x!.bar); // <--- x is Bar!

      const barish = {bar: 'quack', baz: 42}; // type can quack like a Bar
      of(barish)
        .pipe(find(x => x.bar === 'quack'))
        .subscribe(x => x!.bar); // x is still { bar: string; baz: number; }
      of(barish)
        .pipe(find(isBar))
        .subscribe(bar => bar!.bar); // x is Bar!
    }

    // type guards with primitive types
    {
      const xs: Observable<string | number> = from([1, 'aaa', 3, 'bb']);

      // This type guard will narrow a `string | number` to a string in the examples below
      const isString = (x: string | number): x is string =>
        typeof x === 'string';

      xs.pipe(find(isString)).subscribe(s => s!.length); // s is string

      // In contrast, this type of regular boolean predicate still maintains the original type
      xs.pipe(find(x => typeof x === 'number')).subscribe(x => x); // x is still string | number
      xs.pipe(find((x, i) => typeof x === 'number' && x > i)).subscribe(x => x); // x is still string | number
    }

    // tslint:disable enable
  });
});

/** @test {findIndex} */
describe('findIndex', () => {
  function truePredicate(x: any) {
    return true;
  }

  asDiagram('findIndex(x => x % 5 === 0)')(
    'should return matching element from source emits single element',
    () => {
      const values = {a: 3, b: 9, c: 15, d: 20};
      const source = hot('---a--b--c--d---|', values);
      const subs = '^        !       ';
      const expected = '---------(x|)    ';

      const predicate = function (x: number) {
        return x % 5 === 0;
      };

      expectSource(source.pipe(findIndex(predicate))).toBe(expected, {
        x: 2
      });
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should not emit if source does not emit', () => {
    const source = hot('-');
    const subs = '^';
    const expected = '-';

    expectSource(source.pipe(findIndex(truePredicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return negative index if source is empty to match predicate', () => {
    const source = cold('|');
    const subs = '(^!)';
    const expected = '(x|)';

    const result = source.pipe(findIndex(truePredicate));

    expectSource(result).toBe(expected, {x: -1});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return index of element from source emits single element', () => {
    const sourceValue = 1;
    const source = hot('--a--|', {a: sourceValue});
    const subs = '^ !   ';
    const expected = '--(x|)';

    const predicate = function (value: number) {
      return value === sourceValue;
    };

    expectSource(source.pipe(findIndex(predicate))).toBe(expected, {x: 0});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return index of matching element from source emits multiple elements', () => {
    const source = hot('--a--b---c-|', {b: 7});
    const subs = '^    !';
    const expected = '-----(x|)';

    const predicate = function (value: number) {
      return value === 7;
    };

    expectSource(source.pipe(findIndex(predicate))).toBe(expected, {x: 1});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should work with a custom thisArg', () => {
    const sourceValues = {b: 7};
    const source = hot('--a--b---c-|', sourceValues);
    const subs = '^    !';
    const expected = '-----(x|)';

    const predicate = function (this: typeof sourceValues, value: number) {
      return value === this.b;
    };
    const result = source.pipe(findIndex(predicate, sourceValues));

    expectSource(result).toBe(expected, {x: 1});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return negative index if element does not match with predicate', () => {
    const source = hot('--a--b--c--|');
    const subs = '^          !';
    const expected = '-----------(x|)';

    const predicate = function (value: string) {
      return value === 'z';
    };

    expectSource(source.pipe(findIndex(predicate))).toBe(expected, {x: -1});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const source = hot('--a--b--c--|');
    const subs = '^     !     ';
    const expected = '-------     ';
    const unsub = '      !     ';

    const result = source.pipe(findIndex((value: string) => value === 'z'));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = hot('--a--b--c--|');
    const subs = '^     !     ';
    const expected = '-------     ';
    const unsub = '      !     ';

    const result = source.pipe(
      mergeMap((x: string) => of(x)),
      findIndex((value: string) => value === 'z'),
      mergeMap((x: number) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should unsubscribe when the predicate is matched', () => {
    const source = hot('--a--b---c-|');
    const subs = '^    !';
    const expected = '-------(x|)';

    const duration = rxTestScheduler.createTime('--|');

    expectSource(
      source.pipe(
        findIndex((value: string) => value === 'b'),
        delay(duration, rxTestScheduler)
      )
    ).toBe(expected, {x: 1});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should raise if source raise error while element does not match with predicate', () => {
    const source = hot('--a--b--#');
    const subs = '^       !';
    const expected = '--------#';

    const predicate = function (value: string) {
      return value === 'z';
    };

    expectSource(source.pipe(findIndex(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should raise error if predicate throws error', () => {
    const source = hot('--a--b--c--|');
    const subs = '^ !';
    const expected = '--#';

    const predicate = function (value: string) {
      throw 'error';
    };

    expectSource(source.pipe(findIndex(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});

/** @test {isEmpty} */
describe('isEmpty', () => {
  asDiagram('isEmpty')('should return true if source is empty', () => {
    const source = hot('-----|');
    const subs = '^    !';
    const expected = '-----(T|)';

    expectSource((<any>source).pipe(isEmpty())).toBe(expected, {T: true});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return false if source emits element', () => {
    const source = hot('--a--^--b--|');
    const subs = '^  !';
    const expected = '---(F|)';

    expectSource((<any>source).pipe(isEmpty())).toBe(expected, {F: false});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should raise error if source raise error', () => {
    const source = hot('--#');
    const subs = '^ !';
    const expected = '--#';

    expectSource((<any>source).pipe(isEmpty())).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not completes if source never emits', () => {
    const source = cold('-');
    const subs = '^';
    const expected = '-';

    expectSource((<any>source).pipe(isEmpty())).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return true if source is Observable.empty()', () => {
    const source = cold('|');
    const subs = '(^!)';
    const expected = '(T|)';

    expectSource((<any>source).pipe(isEmpty())).toBe(expected, {T: true});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const source = cold('-----------a--b--|');
    const unsub = '      !           ';
    const subs = '^     !           ';
    const expected = '-------           ';

    expectSource((<any>source).pipe(isEmpty()), unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = cold('-----------a--b--|');
    const subs = '^     !           ';
    const expected = '-------           ';
    const unsub = '      !           ';

    const result = (<any>source).pipe(
      mergeMap((x: string) => of(x)),
      isEmpty(),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});

// function shortcuts
const addDrama = function (x: number | string) {
  return x + '!';
};
const identity = function <T>(x: T) {
  return x;
};

/** @test {materialize} */
describe('materialize', () => {
  asDiagram('materialize')('should materialize an Observable', () => {
    const e1 = hot('--x--y--z--|');
    const expected = '--a--b--c--(d|)';
    const values = {a: '{x}', b: '{y}', c: '{z}', d: '|'};

    const result = e1.pipe(
      materialize(),
      map((x: Notification<any>) => {
        if (x.kind === 'C') {
          return '|';
        } else {
          return '{' + x.value + '}';
        }
      })
    );

    expectSource(result).toBe(expected, values);
  });

  it('should materialize a happy stream', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';
    const expected = '--w--x--y--(z|)';

    const expectedValue = {
      w: Notification.createNext('a'),
      x: Notification.createNext('b'),
      y: Notification.createNext('c'),
      z: Notification.createDone()
    };

    expectSource(e1.pipe(materialize())).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should materialize a sad stream', () => {
    const e1 = hot('--a--b--c--#');
    const e1subs = '^          !';
    const expected = '--w--x--y--(z|)';

    const expectedValue = {
      w: Notification.createNext('a'),
      x: Notification.createNext('b'),
      y: Notification.createNext('c'),
      z: Notification.createFail('error')
    };

    expectSource(e1.pipe(materialize())).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--b--c--|');
    const unsub = '      !     ';
    const e1subs = '^     !     ';
    const expected = '--w--x-     ';

    const expectedValue = {
      w: Notification.createNext('a'),
      x: Notification.createNext('b')
    };

    expectSource(e1.pipe(materialize()), unsub).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^     !     ';
    const expected = '--w--x-     ';
    const unsub = '      !     ';

    const expectedValue = {
      w: Notification.createNext('a'),
      x: Notification.createNext('b')
    };

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      materialize(),
      mergeMap((x: Notification<any>) => of(x))
    );

    expectSource(result, unsub).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should materialize stream does not completes', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(materialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should materialize stream never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(materialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should materialize stream does not emit', () => {
    const e1 = hot('----|');
    const e1subs = '^   !';
    const expected = '----(x|)';

    expectSource(e1.pipe(materialize())).toBe(expected, {
      x: Notification.createDone()
    });
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should materialize empty stream', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(x|)';

    expectSource(e1.pipe(materialize())).toBe(expected, {
      x: Notification.createDone()
    });
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should materialize stream throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '(x|)';

    expectSource(e1.pipe(materialize())).toBe(expected, {
      x: Notification.createFail('error')
    });
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

/** @test {multicast} */
describe('multicast', () => {
  asDiagram('multicast(() => new Subject<string>())')(
    'should mirror a simple source Observable',
    () => {
      const source = cold('--1-2---3-4--5-|');
      const sourceSubs = '^              !';
      const multicasted = source.pipe(
        multicast(() => new Subject<string>())
      ) as Connect<string>;
      const expected = '--1-2---3-4--5-|';

      expectSource(multicasted).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);

      multicasted.connect();
    }
  );

  it('should accept Subjects', done => {
    const expected = [1, 2, 3, 4];

    const connectable = of(1, 2, 3, 4).pipe(
      multicast(new Subject<number>())
    ) as Connect<number>;

    connectable.subscribe(
      x => {
        expect(x).to.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );

    connectable.connect();
  });

  it('should multicast a Connect', done => {
    const expected = [1, 2, 3, 4];

    const source = new Subject<number>();
    const connectable = source.pipe(
      multicast(new Subject<number>())
    ) as Connect<number>;
    const replayed = connectable.pipe(
      multicast(new Replay<number>())
    ) as Connect<number>;

    connectable.connect();
    replayed.connect();

    source.next(1);
    source.next(2);
    source.next(3);
    source.next(4);
    source.complete();

    replayed
      .pipe(
        tap({
          next(x) {
            expect(x).to.equal(expected.shift());
          },
          complete() {
            expect(expected.length).to.equal(0);
          }
        })
      )
      .subscribe(null, done, done);
  });

  it('should accept Subject factory functions', done => {
    const expected = [1, 2, 3, 4];

    const connectable = of(1, 2, 3, 4).pipe(
      multicast(() => new Subject<number>())
    ) as Connect<number>;

    connectable.subscribe(
      x => {
        expect(x).to.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );

    connectable.connect();
  });

  it('should accept a multicast selector and connect to a hot source for each subscriber', () => {
    const source = hot('-1-2-3----4-|');
    const sourceSubs = ['^           !', '    ^       !', '        ^   !'];
    const multicasted = source.pipe(
      multicast(
        () => new Subject<string>(),
        x =>
          zip(x, x, (a: any, b: any) => (parseInt(a) + parseInt(b)).toString())
      )
    );
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(multicasted));
    const expected1 = '-2-4-6----8-|';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(multicasted));
    const expected2 = '    -6----8-|';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(multicasted));
    const expected3 = '        --8-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should accept a multicast selector and connect to a cold source for each subscriber', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = [
      '^           !',
      '    ^           !',
      '        ^           !'
    ];
    const multicasted = source.pipe(
      multicast(
        () => new Subject<string>(),
        x =>
          zip(x, x, (a: any, b: any) => (parseInt(a) + parseInt(b)).toString())
      )
    );
    const expected1 = '-2-4-6----8-|';
    const expected2 = '    -2-4-6----8-|';
    const expected3 = '        -2-4-6----8-|';
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(multicasted));
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(multicasted));
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(multicasted));

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it("should accept a multicast selector and respect the subject's messaging semantics", () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = [
      '^           !',
      '    ^           !',
      '        ^           !'
    ];
    const multicasted = source.pipe(
      multicast(
        () => new Replay<string>(1),
        x => concat(x, x.pipe(takeLast(1)))
      )
    );
    const expected1 = '-1-2-3----4-(4|)';
    const expected2 = '    -1-2-3----4-(4|)';
    const expected3 = '        -1-2-3----4-(4|)';
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(multicasted));
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(multicasted));
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(multicasted));

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should do nothing if connect is not called, despite subscriptions', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs: string[] = [];
    const multicasted = source.pipe(multicast(() => new Subject<string>()));
    const expected = '-';

    expectSource(multicasted).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast the same values to multiple observers', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^           !';
    const multicasted = source.pipe(
      multicast(() => new Subject<string>())
    ) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(multicasted));
    const expected1 = '-1-2-3----4-|';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(multicasted));
    const expected2 = '    -3----4-|';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(multicasted));
    const expected3 = '        --4-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    multicasted.connect();
  });

  it('should multicast an error from the source to multiple observers', () => {
    const source = cold('-1-2-3----4-#');
    const sourceSubs = '^           !';
    const multicasted = source.pipe(
      multicast(() => new Subject<string>())
    ) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(multicasted));
    const expected1 = '-1-2-3----4-#';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(multicasted));
    const expected2 = '    -3----4-#';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(multicasted));
    const expected3 = '        --4-#';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    multicasted.connect();
  });

  it(
    'should multicast the same values to multiple observers, ' +
      'but is unsubscribed explicitly and early',
    () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '^        !   ';
      const multicasted = source.pipe(
        multicast(() => new Subject<string>())
      ) as Connect<string>;
      const unsub = '         u   ';
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(multicasted));
      const expected1 = '-1-2-3----   ';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(multicasted));
      const expected2 = '    -3----   ';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(multicasted));
      const expected3 = '        --   ';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);

      // Set up unsubscription action
      let connection: Subscription;
      expectSource(
        hot(unsub).pipe(
          tap(() => {
            connection.unsubscribe();
          })
        )
      ).toBe(unsub);

      connection = multicasted.connect();
    }
  );

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^        !   ';
    const multicasted = source.pipe(
      mergeMap(x => of(x)),
      multicast(() => new Subject<string>())
    ) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(multicasted));
    const expected1 = '-1-2-3----   ';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(multicasted));
    const expected2 = '    -3----   ';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(multicasted));
    const expected3 = '        --   ';
    const unsub = '         u   ';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    // Set up unsubscription action
    let connection: Subscription;
    expectSource(
      hot(unsub).pipe(
        tap(() => {
          connection.unsubscribe();
        })
      )
    ).toBe(unsub);

    connection = multicasted.connect();
  });

  it('should multicast an empty source', () => {
    const source = cold('|');
    const sourceSubs = '(^!)';
    const multicasted = source.pipe(
      multicast(() => new Subject<string>())
    ) as Connect<string>;
    const expected = '|';

    expectSource(multicasted).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    multicasted.connect();
  });

  it('should multicast a never source', () => {
    const source = cold('-');
    const sourceSubs = '^';
    const multicasted = source.pipe(
      multicast(() => new Subject<string>())
    ) as Connect<string>;
    const expected = '-';

    expectSource(multicasted).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    multicasted.connect();
  });

  it('should multicast a throw source', () => {
    const source = cold('#');
    const sourceSubs = '(^!)';
    const multicasted = source.pipe(
      multicast(() => new Subject<string>())
    ) as Connect<string>;
    const expected = '#';

    expectSource(multicasted).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    multicasted.connect();
  });

  describe('with refCount() and subject factory', () => {
    it('should connect when first subscriber subscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^           !';
      const multicasted = source.pipe(
        multicast(() => new Subject<string>()),
        refCount()
      );
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(multicasted));
      const expected1 = '   -1-2-3----4-|';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(multicasted));
      const expected2 = '       -3----4-|';
      const subscriber3 = hot('           c|   ').pipe(mergeMapTo(multicasted));
      const expected3 = '           --4-|';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should disconnect when last subscriber unsubscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^        !   ';
      const multicasted = source.pipe(
        multicast(() => new Subject<string>()),
        refCount()
      );
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(multicasted));
      const unsub1 = '          !     ';
      const expected1 = '   -1-2-3--     ';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(multicasted));
      const unsub2 = '            !   ';
      const expected2 = '       -3----   ';

      expectSource(subscriber1, unsub1).toBe(expected1);
      expectSource(subscriber2, unsub2).toBe(expected2);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should be retryable when cold source is synchronous', () => {
      function subjectFactory() {
        return new Subject<string>();
      }
      const source = cold('(123#)');
      const multicasted = source.pipe(multicast(subjectFactory), refCount());
      const subscribe1 = 's               ';
      const expected1 = '(123123123123#) ';
      const subscribe2 = ' s              ';
      const expected2 = ' (123123123123#)';
      const sourceSubs = [
        '(^!)',
        '(^!)',
        '(^!)',
        '(^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)'
      ];

      expectSource(
        hot(subscribe1).pipe(
          tap(() => {
            expectSource(multicasted.pipe(retry(3))).toBe(expected1);
          })
        )
      ).toBe(subscribe1);

      expectSource(
        hot(subscribe2).pipe(
          tap(() => {
            expectSource(multicasted.pipe(retry(3))).toBe(expected2);
          })
        )
      ).toBe(subscribe2);

      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should be retryable with Replay and cold source is synchronous', () => {
      function subjectFactory() {
        return new Replay(1);
      }
      const source = cold('(123#)');
      const multicasted = source.pipe(multicast(subjectFactory), refCount());
      const subscribe1 = 's               ';
      const expected1 = '(123123123123#) ';
      const subscribe2 = ' s              ';
      const expected2 = ' (123123123123#)';
      const sourceSubs = [
        '(^!)',
        '(^!)',
        '(^!)',
        '(^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)'
      ];

      expectSource(
        hot(subscribe1).pipe(
          tap(() => {
            expectSource(multicasted.pipe(retry(3))).toBe(expected1);
          })
        )
      ).toBe(subscribe1);

      expectSource(
        hot(subscribe2).pipe(
          tap(() => {
            expectSource(multicasted.pipe(retry(3))).toBe(expected2);
          })
        )
      ).toBe(subscribe2);

      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should be repeatable when cold source is synchronous', () => {
      function subjectFactory() {
        return new Subject<string>();
      }
      const source = cold('(123|)');
      const multicasted = source.pipe(multicast(subjectFactory), refCount());
      const subscribe1 = 's                  ';
      const expected1 = '(123123123123123|) ';
      const subscribe2 = ' s                 ';
      const expected2 = ' (123123123123123|)';
      const sourceSubs = [
        '(^!)',
        '(^!)',
        '(^!)',
        '(^!)',
        '(^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)'
      ];

      expectSource(
        hot(subscribe1).pipe(
          tap(() => {
            expectSource(multicasted.pipe(repeat(5))).toBe(expected1);
          })
        )
      ).toBe(subscribe1);

      expectSource(
        hot(subscribe2).pipe(
          tap(() => {
            expectSource(multicasted.pipe(repeat(5))).toBe(expected2);
          })
        )
      ).toBe(subscribe2);

      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should be repeatable with Replay and cold source is synchronous', () => {
      function subjectFactory() {
        return new Replay(1);
      }
      const source = cold('(123|)');
      const multicasted = source.pipe(multicast(subjectFactory), refCount());
      const subscribe1 = 's                  ';
      const expected1 = '(123123123123123|) ';
      const subscribe2 = ' s                 ';
      const expected2 = ' (123123123123123|)';
      const sourceSubs = [
        '(^!)',
        '(^!)',
        '(^!)',
        '(^!)',
        '(^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)',
        ' (^!)'
      ];

      expectSource(
        hot(subscribe1).pipe(
          tap(() => {
            expectSource(multicasted.pipe(repeat(5))).toBe(expected1);
          })
        )
      ).toBe(subscribe1);

      expectSource(
        hot(subscribe2).pipe(
          tap(() => {
            expectSource(multicasted.pipe(repeat(5))).toBe(expected2);
          })
        )
      ).toBe(subscribe2);

      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should be retryable', () => {
      function subjectFactory() {
        return new Subject<string>();
      }
      const source = cold('-1-2-3----4-#                        ');
      const sourceSubs = [
        '^           !                        ',
        '            ^           !            ',
        '                        ^           !'
      ];
      const multicasted = source.pipe(multicast(subjectFactory), refCount());
      const subscribe1 = 's                                    ';
      const expected1 = '-1-2-3----4--1-2-3----4--1-2-3----4-#';
      const subscribe2 = '    s                                ';
      const expected2 = '    -3----4--1-2-3----4--1-2-3----4-#';

      expectSource(
        hot(subscribe1).pipe(
          tap(() => {
            expectSource(multicasted.pipe(retry(2))).toBe(expected1);
          })
        )
      ).toBe(subscribe1);

      expectSource(
        hot(subscribe2).pipe(
          tap(() => {
            expectSource(multicasted.pipe(retry(2))).toBe(expected2);
          })
        )
      ).toBe(subscribe2);

      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should be retryable using a Replay', () => {
      function subjectFactory() {
        return new Replay(1);
      }
      const source = cold('-1-2-3----4-#                        ');
      const sourceSubs = [
        '^           !                        ',
        '            ^           !            ',
        '                        ^           !'
      ];
      const multicasted = source.pipe(multicast(subjectFactory), refCount());
      const expected1 = '-1-2-3----4--1-2-3----4--1-2-3----4-#';
      const subscribe2 = time('----|                                ');
      const expected2 = '    23----4--1-2-3----4--1-2-3----4-#';

      expectSource(multicasted.pipe(retry(2))).toBe(expected1);

      rxTestScheduler.schedule(
        () => expectSource(multicasted.pipe(retry(2))).toBe(expected2),
        subscribe2
      );

      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should be repeatable', () => {
      function subjectFactory() {
        return new Subject<string>();
      }
      const source = cold('-1-2-3----4-|                        ');
      const sourceSubs = [
        '^           !                        ',
        '            ^           !            ',
        '                        ^           !'
      ];
      const multicasted = source.pipe(multicast(subjectFactory), refCount());
      const subscribe1 = 's                                    ';
      const expected1 = '-1-2-3----4--1-2-3----4--1-2-3----4-|';
      const subscribe2 = '    s                                ';
      const expected2 = '    -3----4--1-2-3----4--1-2-3----4-|';

      expectSource(
        hot(subscribe1).pipe(
          tap(() => {
            expectSource(multicasted.pipe(repeat(3))).toBe(expected1);
          })
        )
      ).toBe(subscribe1);

      expectSource(
        hot(subscribe2).pipe(
          tap(() => {
            expectSource(multicasted.pipe(repeat(3))).toBe(expected2);
          })
        )
      ).toBe(subscribe2);

      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should be repeatable using a Replay', () => {
      function subjectFactory() {
        return new Replay(1);
      }
      const source = cold('-1-2-3----4-|                        ');
      const sourceSubs = [
        '^           !                        ',
        '            ^           !            ',
        '                        ^           !'
      ];
      const multicasted = source.pipe(multicast(subjectFactory), refCount());
      const subscribe1 = 's                                    ';
      const expected1 = '-1-2-3----4--1-2-3----4--1-2-3----4-|';
      const subscribe2 = '    s                                ';
      const expected2 = '    23----4--1-2-3----4--1-2-3----4-|';

      expectSource(
        hot(subscribe1).pipe(
          tap(() => {
            expectSource(multicasted.pipe(repeat(3))).toBe(expected1);
          })
        )
      ).toBe(subscribe1);

      expectSource(
        hot(subscribe2).pipe(
          tap(() => {
            expectSource(multicasted.pipe(repeat(3))).toBe(expected2);
          })
        )
      ).toBe(subscribe2);

      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });
  });

  it('should multicast one observable to multiple observers', done => {
    const results1: number[] = [];
    const results2: number[] = [];
    let subscriptions = 0;

    const source = new Observable<number>(observer => {
      subscriptions++;
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.next(4);
      observer.complete();
    });

    const connectable = source.pipe(
      multicast(() => {
        return new Subject<number>();
      })
    ) as Connect<number>;

    connectable.subscribe(x => {
      results1.push(x);
    });

    connectable.subscribe(x => {
      results2.push(x);
    });

    expect(results1).to.deep.equal([]);
    expect(results2).to.deep.equal([]);

    connectable.connect();

    expect(results1).to.deep.equal([1, 2, 3, 4]);
    expect(results2).to.deep.equal([1, 2, 3, 4]);
    expect(subscriptions).to.equal(1);
    done();
  });

  it('should remove all subscribers from the subject when disconnected', () => {
    const subject = new Subject<number>();
    const expected = [1, 2, 3, 4];
    let i = 0;

    const source = from([1, 2, 3, 4]).pipe(multicast(subject)) as Connect<
      number
    >;

    source.subscribe(x => {
      expect(x).to.equal(expected[i++]);
    });

    source.connect();
    expect(subject.observers.length).to.equal(0);
  });

  describe('when given a subject factory', () => {
    it('should allow you to reconnect by subscribing again', done => {
      const expected = [1, 2, 3, 4];
      let i = 0;

      const source = of(1, 2, 3, 4).pipe(
        multicast(() => new Subject<number>())
      ) as Connect<number>;

      source.subscribe(
        x => {
          expect(x).to.equal(expected[i++]);
        },
        null,
        () => {
          i = 0;

          source.subscribe(
            x => {
              expect(x).to.equal(expected[i++]);
            },
            null,
            done
          );

          source.connect();
        }
      );

      source.connect();
    });

    it(
      'should not throw UnsubscribedError when used in ' + 'a switchMap',
      done => {
        const source = of(1, 2, 3).pipe(
          multicast(() => new Subject<number>()),
          refCount()
        );

        const expected = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'c1', 'c2', 'c3'];

        of('a', 'b', 'c')
          .pipe(switchMap(letter => source.pipe(map(n => String(letter + n)))))
          .subscribe(
            x => {
              expect(x).to.equal(expected.shift());
            },
            x => {
              done(new Error('should not be called'));
            },
            () => {
              expect(expected.length).to.equal(0);
              done();
            }
          );
      }
    );
  });

  describe('when given a subject', () => {
    it(
      'should not throw UnsubscribedError when used in ' + 'a switchMap',
      done => {
        const source = of(1, 2, 3).pipe(
          multicast(new Subject<number>()),
          refCount()
        );

        const expected = ['a1', 'a2', 'a3'];

        of('a', 'b', 'c')
          .pipe(switchMap(letter => source.pipe(map(n => String(letter + n)))))
          .subscribe(
            x => {
              expect(x).to.equal(expected.shift());
            },
            x => {
              done(new Error('should not be called'));
            },
            () => {
              expect(expected.length).to.equal(0);
              done();
            }
          );
      }
    );
  });

  describe('typings', () => {
    type('should infer the type', () => {
      /* tslint:disable:no-unused-variable */
      const source = of(1, 2, 3);
      const result: Connect<number> = source.pipe(
        multicast(() => new Subject<number>())
      ) as Connect<number>;
      /* tslint:enable:no-unused-variable */
    });

    type('should infer the type with a selector', () => {
      /* tslint:disable:no-unused-variable */
      const source = of(1, 2, 3);
      const result: Observable<number> = source.pipe(
        multicast(
          () => new Subject<number>(),
          s => s.pipe(map(x => x))
        )
      );
      /* tslint:enable:no-unused-variable */
    });

    type('should infer the type with a type-changing selector', () => {
      /* tslint:disable:no-unused-variable */
      const source = of(1, 2, 3);
      const result: Observable<string> = source.pipe(
        multicast(
          () => new Subject<number>(),
          s => s.pipe(map(x => x + '!'))
        )
      );
      /* tslint:enable:no-unused-variable */
    });

    type('should infer the type for the pipeable', () => {
      /* tslint:disable:no-unused-variable */
      const source = of(1, 2, 3);
      // TODO: https://github.com/ReactiveX/rxjs/issues/2972
      const result: Connect<number> = multicast(() => new Subject<number>())(
        source
      );
      /* tslint:enable:no-unused-variable */
    });

    type(
      'should infer the type for the pipeable operator with a selector',
      () => {
        /* tslint:disable:no-unused-variable */
        const source = of(1, 2, 3);
        const result: Observable<number> = source.pipe(
          multicast(
            () => new Subject<number>(),
            s => s.pipe(map(x => x))
          )
        );
        /* tslint:enable:no-unused-variable */
      }
    );

    type(
      'should infer the type for the pipeable operator with a type-changing selector',
      () => {
        /* tslint:disable:no-unused-variable */
        const source = of(1, 2, 3);
        const result: Observable<string> = source.pipe(
          multicast(
            () => new Subject<number>(),
            s => s.pipe(map(x => x + '!'))
          )
        );
        /* tslint:enable:no-unused-variable */
      }
    );
  });
});

/** @test {observeOn} */
describe('observeOn', () => {
  asDiagram('observeOn(scheduler)')(
    'should observe on specified scheduler',
    () => {
      const e1 = hot('--a--b--|');
      const expected = '--a--b--|';
      const sub = '^       !';

      expectSource(e1.pipe(observeOn(rxTestScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(sub);
    }
  );

  it('should observe after specified delay', () => {
    const e1 = hot('--a--b--|   ');
    const expected = '-----a--b--|';
    const sub = '^       !   ';

    expectSource(e1.pipe(observeOn(rxTestScheduler, 30))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should observe when source raises error', () => {
    const e1 = hot('--a--#');
    const expected = '--a--#';
    const sub = '^    !';

    expectSource(e1.pipe(observeOn(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should observe when source is empty', () => {
    const e1 = hot('-----|');
    const expected = '-----|';
    const sub = '^    !';

    expectSource(e1.pipe(observeOn(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should observe when source does not complete', () => {
    const e1 = hot('-----');
    const expected = '-----';
    const sub = '^    ';

    expectSource(e1.pipe(observeOn(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--b--|');
    const sub = '^   !    ';
    const expected = '--a--    ';
    const unsub = '    !    ';

    const result = e1.pipe(observeOn(rxTestScheduler));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should not break unsubscription chains when the result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b--|');
    const sub = '^   !    ';
    const expected = '--a--    ';
    const unsub = '    !    ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      observeOn(rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should clean up subscriptions created by async scheduling (prevent memory leaks #2244)', done => {
    //HACK: Deep introspection to make sure we're cleaning up notifications in scheduling.
    // as the architecture changes, this test may become brittle.
    const results: number[] = [];
    // This is to build a scheduled observable with a slightly more stable
    // subscription structure, since we're going to hack in to analyze it in this test.
    const subscription: any = new Observable<number>(observer => {
      let i = 1;
      return asapScheduler.schedule(function () {
        if (i > 3) {
          observer.complete();
        } else {
          observer.next(i++);
          this.schedule();
        }
      });
    })
      .pipe(observeOn(asapScheduler))
      .subscribe(
        x => {
          // see #4106 - inner subscriptions are now added to destinations
          // so the subscription will contain an ObserveOnSubscriber and a subscription for the scheduled action
          expect(subscription._subscriptions.length).to.equal(2);
          const actionSubscription = subscription._subscriptions[1];
          expect(actionSubscription.state.notification.kind).to.equal('N');
          expect(actionSubscription.state.notification.value).to.equal(x);
          results.push(x);
        },
        err => done(err),
        () => {
          // now that the last nexted value is done, there should only be a complete notification scheduled
          // the consumer will have been unsubscribed via Subscriber#_parentSubscription
          expect(subscription._subscriptions.length).to.equal(1);
          const actionSubscription = subscription._subscriptions[0];
          expect(actionSubscription.state.notification.kind).to.equal('C');
          // After completion, the entire _subscriptions list is nulled out anyhow, so we can't test much further than this.
          expect(results).to.deep.equal([1, 2, 3]);
          done();
        }
      );
  });
});

describe('onErrorResumeNext', () => {
  asDiagram('onErrorResumeNext')(
    'should continue observable sequence with next observable',
    () => {
      const source = hot('--a--b--#');
      const next = cold('--c--d--|');
      const subs = '^       !';
      const expected = '--a--b----c--d--|';

      expectSource(source.pipe(onErrorResumeNext(next))).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should continue with hot observables', () => {
    const source = hot('--a--b--#');
    const next = hot('-----x----c--d--|');
    const subs = '^       !';
    const expected = '--a--b----c--d--|';

    expectSource(source.pipe(onErrorResumeNext(next))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should continue with array of multiple observables throw error', () => {
    const source = hot('--a--b--#');
    const next = [cold('--c--d--#'), cold('--e--#'), cold('--f--g--|')];
    const subs = '^       !';
    const expected = '--a--b----c--d----e----f--g--|';

    expectSource(source.pipe(onErrorResumeNext(next))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should continue with multiple observables throw error', () => {
    const source = hot('--a--b--#');
    const next1 = cold('--c--d--#');
    const next2 = cold('--e--#');
    const next3 = cold('--f--g--|');
    const subs = '^       !';
    const expected = '--a--b----c--d----e----f--g--|';

    expectSource(source.pipe(onErrorResumeNext(next1, next2, next3))).toBe(
      expected
    );
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should continue with multiple observables does not throw error', () => {
    const source = hot('--a--b--|');
    const next1 = cold('--c--d--|');
    const next2 = cold('--e--|');
    const next3 = cold('--f--g--|');
    const subs = '^       !';
    const expected = '--a--b----c--d----e----f--g--|';

    expectSource(source.pipe(onErrorResumeNext(next1, next2, next3))).toBe(
      expected
    );
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should continue after empty observable', () => {
    const source = hot('|');
    const next1 = cold('--c--d--|');
    const next2 = cold('--e--#');
    const next3 = cold('--f--g--|');
    const subs = '(^!)';
    const expected = '--c--d----e----f--g--|';

    expectSource(source.pipe(onErrorResumeNext(next1, next2, next3))).toBe(
      expected
    );
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not complete with observble does not ends', () => {
    const source = hot('--a--b--|');
    const next1 = cold('--');
    const subs = '^       !';
    const expected = '--a--b----';

    expectSource(source.pipe(onErrorResumeNext(next1))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not continue with observble does not ends', () => {
    const source = hot('--');
    const next1 = cold('-a--b-');
    const subs = '^       ';
    const expected = '-';

    expectSource(source.pipe(onErrorResumeNext(next1))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should complete observable with next observable throws', () => {
    const source = hot('--a--b--#');
    const next = cold('--c--d--#');
    const subs = '^       !';
    const expected = '--a--b----c--d--|';

    expectSource(source.pipe(onErrorResumeNext(next))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
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
        onErrorResumeNext(synchronousObservable),
        takeWhile(x => x != 2) // unsubscribe at the second side-effect
      )
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).to.deep.equal([1, 2]);
  });

  it('should unsubscribe from an interop observble upon explicit unsubscription', () => {
    const source = hot('--a--b--#');
    const next = cold('--c--d--');
    const nextSubs = '        ^   !';
    const subs = '^           !';
    const expected = '--a--b----c--';

    // This test manipulates the observable to make it look like an interop
    // observable - an observable from a foreign library. Interop subscribers
    // are treated differently: they are wrapped in a safe subscriber. This
    // test ensures that unsubscriptions are chained all the way to the
    // interop subscriber.

    expectSource(
      source.pipe(onErrorResumeNext(asInteropSource(next))),
      subs
    ).toBe(expected);
    expectSubscriptions(next.subscriptions).toBe(nextSubs);
  });

  it('should work with promise', (done: MochaDone) => {
    const expected = [1, 2];
    const source = concat(of(1), throwError('meh'));

    source.pipe(onErrorResumeNext(Promise.resolve(2))).subscribe(
      x => {
        expect(expected.shift()).to.equal(x);
      },
      (err: any) => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected).to.be.empty;
        done();
      }
    );
  });
});

/** @test {race} */
describe('race', () => {
  it('should race cold and cold', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b-----c----|';

    const result = e1.pipe(race(e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race cold and cold and accept an Array of Observable argument', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b-----c----|';

    const result = e1.pipe(race([e2]));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race hot and hot', () => {
    const e1 = hot('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = hot('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b-----c----|';

    const result = e1.pipe(race(e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race hot and cold', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = hot('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b-----c----|';

    const result = e1.pipe(race(e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race 2nd and 1st', () => {
    const e1 = cold('------x-----y-----z----|');
    const e1subs = '^  !';
    const e2 = cold('---a-----b-----c----|');
    const e2subs = '^                   !';
    const expected = '---a-----b-----c----|';

    const result = e1.pipe(race(e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should race emit and complete', () => {
    const e1 = cold('-----|');
    const e1subs = '^    !';
    const e2 = hot('------x-----y-----z----|');
    const e2subs = '^    !';
    const expected = '-----|';

    const result = e1.pipe(race(e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^           !';
    const e2 = hot('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----b---';
    const unsub = '            !';

    const result = e1.pipe(race(e2));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const e1 = hot('--a--^--b--c---d-| ');
    const e1subs = '^        !    ';
    const e2 = hot('---e-^---f--g---h-|');
    const e2subs = '^  !    ';
    const expected = '---b--c---    ';
    const unsub = '         !    ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      race(e2),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should never emit when given non emitting sources', () => {
    const e1 = cold('---|');
    const e2 = cold('---|');
    const e1subs = '^  !';
    const expected = '---|';

    const source = e1.pipe(race(e2));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should throw when error occurs mid stream', () => {
    const e1 = cold('---a-----#');
    const e1subs = '^        !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---a-----#';

    const result = e1.pipe(race(e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should throw when error occurs before a winner is found', () => {
    const e1 = cold('---#');
    const e1subs = '^  !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^  !';
    const expected = '---#';

    const result = e1.pipe(race(e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should allow observable emits immediately', (done: MochaDone) => {
    const e1 = of(true);
    const e2 = timer(200).pipe(map(_ => false));

    staticRace(e1, e2).subscribe(
      x => {
        expect(x).to.be.true;
      },
      done,
      done
    );
  });

  it('should ignore latter observables if a former one emits immediately', () => {
    const onNext = sinon.spy();
    const onSubscribe = sinon.spy();
    const e1 = of('a'); // Wins the race
    const e2 = defer(onSubscribe); // Should be ignored

    e1.pipe(race(e2)).subscribe(onNext);
    expect(onNext.calledWithExactly('a')).to.be.true;
    expect(onSubscribe.called).to.be.false;
  });

  it('should ignore latter observables if a former one completes immediately', () => {
    const onComplete = sinon.spy();
    const onSubscribe = sinon.spy();
    const e1 = EMPTY; // Wins the race
    const e2 = defer(onSubscribe); // Should be ignored

    e1.pipe(race(e2)).subscribe({complete: onComplete});
    expect(onComplete.calledWithExactly()).to.be.true;
    expect(onSubscribe.called).to.be.false;
  });

  it('should ignore latter observables if a former one errors immediately', () => {
    const onError = sinon.spy();
    const onSubscribe = sinon.spy();
    const e1 = throwError('kaboom'); // Wins the race
    const e2 = defer(onSubscribe); // Should be ignored

    e1.pipe(race(e2)).subscribe({error: onError});
    expect(onError.calledWithExactly('kaboom')).to.be.true;
    expect(onSubscribe.called).to.be.false;
  });

  it('should unsubscribe former observables if a latter one emits immediately', () => {
    const onNext = sinon.spy();
    const onUnsubscribe = sinon.spy();
    const e1 = NEVER.pipe(finalize(onUnsubscribe)); // Should be unsubscribed
    const e2 = of('b'); // Wins the race

    e1.pipe(race(e2)).subscribe(onNext);
    expect(onNext.calledWithExactly('b')).to.be.true;
    expect(onUnsubscribe.calledOnce).to.be.true;
  });

  it('should unsubscribe from immediately emitting observable on unsubscription', () => {
    const onNext = sinon.spy();
    const onUnsubscribe = sinon.spy();
    const e1 = <Observable<never>>(
      NEVER.pipe(startWith('a'), finalize(onUnsubscribe))
    ); // Wins the race
    const e2 = NEVER; // Loses the race

    const subscription = e1.pipe(race(e2)).subscribe(onNext);
    expect(onNext.calledWithExactly('a')).to.be.true;
    expect(onUnsubscribe.called).to.be.false;
    subscription.unsubscribe();
    expect(onUnsubscribe.calledOnce).to.be.true;
  });
});

/** @test {repeat} */
describe('repeat', () => {
  asDiagram('repeat(3)')('should resubscribe count number of times', () => {
    const e1 = cold('--a--b--|                ');
    const subs = [
      '^       !                ',
      '        ^       !        ',
      '                ^       !'
    ];
    const expected = '--a--b----a--b----a--b--|';

    expectSource(e1.pipe(repeat(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should resubscribe multiple times', () => {
    const e1 = cold('--a--b--|                        ');
    const subs = [
      '^       !                        ',
      '        ^       !                ',
      '                ^       !        ',
      '                        ^       !'
    ];
    const expected = '--a--b----a--b----a--b----a--b--|';

    expectSource(e1.pipe(repeat(2), repeat(2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should complete without emit when count is zero', () => {
    const e1 = cold('--a--b--|');
    const subs: string[] = [];
    const expected = '|';

    expectSource(e1.pipe(repeat(0))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should emit source once when count is one', () => {
    const e1 = cold('--a--b--|');
    const subs = '^       !';
    const expected = '--a--b--|';

    expectSource(e1.pipe(repeat(1))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should repeat until gets unsubscribed', () => {
    const e1 = cold('--a--b--|      ');
    const subs = ['^       !      ', '        ^     !'];
    const unsub = '              !';
    const expected = '--a--b----a--b-';

    expectSource(e1.pipe(repeat(10)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should be able to repeat indefinitely until unsubscribed', () => {
    const e1 = cold('--a--b--|                                    ');
    const subs = [
      '^       !                                    ',
      '        ^       !                            ',
      '                ^       !                    ',
      '                        ^       !            ',
      '                                ^       !    ',
      '                                        ^   !'
    ];
    const unsub = '                                            !';
    const expected = '--a--b----a--b----a--b----a--b----a--b----a--';

    expectSource(e1.pipe(repeat()), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const e1 = cold('--a--b--|                                    ');
    const subs = [
      '^       !                                    ',
      '        ^       !                            ',
      '                ^       !                    ',
      '                        ^       !            ',
      '                                ^       !    ',
      '                                        ^   !'
    ];
    const unsub = '                                            !';
    const expected = '--a--b----a--b----a--b----a--b----a--b----a--';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      repeat(),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should consider negative count as repeat indefinitely', () => {
    const e1 = cold('--a--b--|                                    ');
    const subs = [
      '^       !                                    ',
      '        ^       !                            ',
      '                ^       !                    ',
      '                        ^       !            ',
      '                                ^       !    ',
      '                                        ^   !'
    ];
    const unsub = '                                            !';
    const expected = '--a--b----a--b----a--b----a--b----a--b----a--';

    expectSource(e1.pipe(repeat(-1)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should not complete when source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(repeat(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not complete when source does not completes', () => {
    const e1 = cold('-');
    const unsub = '                              !';
    const subs = '^                             !';
    const expected = '-';

    expectSource(e1.pipe(repeat(3)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should complete immediately when source does not complete without emit but count is zero', () => {
    const e1 = cold('-');
    const subs: string[] = [];
    const expected = '|';

    expectSource(e1.pipe(repeat(0))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should complete immediately when source does not complete but count is zero', () => {
    const e1 = cold('--a--b--');
    const subs: string[] = [];
    const expected = '|';

    expectSource(e1.pipe(repeat(0))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should emit source once and does not complete when source emits but does not complete', () => {
    const e1 = cold('--a--b--');
    const subs = ['^       '];
    const expected = '--a--b--';

    expectSource(e1.pipe(repeat(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should complete when source is empty', () => {
    const e1 = cold('|');
    const e1subs = ['(^!)', '(^!)', '(^!)'];
    const expected = '|';

    expectSource(e1.pipe(repeat(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete when source does not emit', () => {
    const e1 = cold('----|        ');
    const subs = ['^   !        ', '    ^   !    ', '        ^   !'];
    const expected = '------------|';

    expectSource(e1.pipe(repeat(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should complete immediately when source does not emit but count is zero', () => {
    const e1 = cold('----|');
    const subs: string[] = [];
    const expected = '|';

    expectSource(e1.pipe(repeat(0))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should raise error when source raises error', () => {
    const e1 = cold('--a--b--#');
    const subs = '^       !';
    const expected = '--a--b--#';

    expectSource(e1.pipe(repeat(2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should raises error if source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(repeat(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raises error if source throws when repeating infinitely', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(repeat())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error after first emit succeed', () => {
    let repeated = false;

    const e1 = cold('--a--|').pipe(
      map((x: string) => {
        if (repeated) {
          throw 'error';
        } else {
          repeated = true;
          return x;
        }
      })
    );
    const expected = '--a----#';

    expectSource(e1.pipe(repeat(2))).toBe(expected);
  });

  it('should repeat a synchronous source (multicasted and refCounted) multiple times', (done: MochaDone) => {
    const expected = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3];

    of(1, 2, 3)
      .pipe(
        multicast(() => new Subject<number>()),
        refCount(),
        repeat(5)
      )
      .subscribe(
        (x: number) => {
          expect(x).to.equal(expected.shift());
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          expect(expected.length).to.equal(0);
          done();
        }
      );
  });
});

/** @test {repeatWhen} */
describe('repeatWhen', () => {
  asDiagram('repeatWhen')(
    'should handle a source with eventual complete using a hot notifier',
    () => {
      const source = cold('-1--2--|');
      const subs = [
        '^      !                     ',
        '             ^      !        ',
        '                          ^      !'
      ];
      const notifier = hot('-------------r------------r-|');
      const expected = '-1--2---------1--2---------1--2--|';

      const result = source.pipe(repeatWhen((notifications: any) => notifier));

      expectSource(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should handle a source with eventual complete using a hot notifier that raises error', () => {
    const source = cold('-1--2--|');
    const subs = [
      '^      !                    ',
      '           ^      !           ',
      '                   ^      !   '
    ];
    const notifier = hot('-----------r-------r---------#');
    const expected = '-1--2-------1--2----1--2-----#';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should repeat when notified via returned notifier on complete', (done: MochaDone) => {
    let retried = false;
    const expected = [1, 2, 1, 2];
    let i = 0;
    try {
      of(1, 2)
        .pipe(
          map((n: number) => {
            return n;
          }),
          repeatWhen((notifications: any) =>
            notifications.pipe(
              map((x: any) => {
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
    } catch (err) {
      done(err);
    }
  });

  it('should not repeat when applying an empty notifier', (done: MochaDone) => {
    const expected = [1, 2];
    const nexted: number[] = [];
    of(1, 2)
      .pipe(
        map((n: number) => {
          return n;
        }),
        repeatWhen((notifications: any) => EMPTY)
      )
      .subscribe(
        (n: number) => {
          expect(n).to.equal(expected.shift());
          nexted.push(n);
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          expect(nexted).to.deep.equal([1, 2]);
          done();
        }
      );
  });

  it('should not error when applying an empty synchronous notifier', () => {
    const errors: any[] = [];
    // The current Subscriber.prototype.error implementation does nothing for
    // stopped subscribers. This test was written to fail and expose a problem
    // with synchronous notifiers. However, by the time the error occurs the
    // subscriber is stopped, so the test logs errors by both patching the
    // prototype and by using an error callback (for when/if the do-nothing-if-
    // stopped behaviour is fixed).
    const originalSubscribe = Observable.prototype.subscribe;
    Observable.prototype.subscribe = function (...args: any[]): any {
      let [subscriber] = args;
      if (!(subscriber instanceof Subscriber)) {
        subscriber = new Subscriber<any>(...args);
      }
      subscriber.error = function (err: any): void {
        errors.push(err);
        Subscriber.prototype.error.call(this, err);
      };
      return originalSubscribe.call(this, subscriber);
    };
    of(1, 2)
      .pipe(repeatWhen((notifications: any) => EMPTY))
      .subscribe(undefined, err => errors.push(err));
    Observable.prototype.subscribe = originalSubscribe;
    expect(errors).to.deep.equal([]);
  });

  it('should not error when applying a non-empty synchronous notifier', () => {
    const errors: any[] = [];
    // The current Subscriber.prototype.error implementation does nothing for
    // stopped subscribers. This test was written to fail and expose a problem
    // with synchronous notifiers. However, by the time the error occurs the
    // subscriber is stopped, so the test logs errors by both patching the
    // prototype and by using an error callback (for when/if the do-nothing-if-
    // stopped behaviour is fixed).
    const originalSubscribe = Observable.prototype.subscribe;
    Observable.prototype.subscribe = function (...args: any[]): any {
      let [subscriber] = args;
      if (!(subscriber instanceof Subscriber)) {
        subscriber = new Subscriber<any>(...args);
      }
      subscriber.error = function (err: any): void {
        errors.push(err);
        Subscriber.prototype.error.call(this, err);
      };
      return originalSubscribe.call(this, subscriber);
    };
    of(1, 2)
      .pipe(repeatWhen((notifications: any) => of(1)))
      .subscribe(undefined, err => errors.push(err));
    Observable.prototype.subscribe = originalSubscribe;
    expect(errors).to.deep.equal([]);
  });

  it('should apply an empty notifier on an empty source', () => {
    const source = cold('|');
    const subs = '(^!)';
    const notifier = cold('|');
    const expected = '|';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should apply a never notifier on an empty source', () => {
    const source = cold('|');
    const subs = '(^!)';
    const notifier = cold('-');
    const expected = '-';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should apply an empty notifier on a never source', () => {
    const source = cold('-');
    const unsub = '                                         !';
    const subs = '^                                        !';
    const notifier = cold('|');
    const expected = '-';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should apply a never notifier on a never source', () => {
    const source = cold('-');
    const unsub = '                                         !';
    const subs = '^                                        !';
    const notifier = cold('-');
    const expected = '-';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return an empty observable given a just-throw source and empty notifier', () => {
    const source = cold('#');
    const notifier = cold('|');
    const expected = '#';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result).toBe(expected);
  });

  it('should return a error observable given a just-throw source and never notifier', () => {
    const source = cold('#');
    const notifier = cold('-');
    const expected = '#';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result).toBe(expected);
  });

  xit('should hide errors using a never notifier on a source with eventual error', () => {
    const source = cold('--a--b--c--#');
    const subs = '^          !';
    const notifier = cold('-');
    const expected = '--a--b--c---------------------------------';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  xit('should propagate error thrown from notifierSelector function', () => {
    const source = cold('--a--b--c--|');
    const subs = '^          !';
    const expected = '--a--b--c--#';

    const result = source.pipe(
      repeatWhen(<any>(() => {
        throw 'bad!';
      }))
    );

    expectSource(result).toBe(expected, undefined, 'bad!');
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  xit(
    'should replace error with complete using an empty notifier on a source ' +
      'with eventual error',
    () => {
      const source = cold('--a--b--c--#');
      const subs = '^          !';
      const notifier = cold('|');
      const expected = '--a--b--c--|';

      const result = source.pipe(repeatWhen((notifications: any) => notifier));

      expectSource(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should mirror a basic cold source with complete, given a never notifier', () => {
    const source = cold('--a--b--c--|');
    const subs = '^          !';
    const notifier = cold('|');
    const expected = '--a--b--c--|';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should mirror a basic cold source with no termination, given a never notifier', () => {
    const source = cold('--a--b--c---');
    const subs = '^           ';
    const notifier = cold('|');
    const expected = '--a--b--c---';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should mirror a basic hot source with complete, given a never notifier', () => {
    const source = hot('-a-^--b--c--|');
    const subs = '^        !';
    const notifier = cold('|');
    const expected = '---b--c--|';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  xit('should handle a hot source that raises error but eventually completes', () => {
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
      repeatWhen(() => notifier)
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(ssubs);
    expectSubscriptions(notifier.subscriptions).toBe(nsubs);
  });

  it('should tear down resources when result is unsubscribed early', () => {
    const source = cold('-1--2--|');
    const unsub = '                    !       ';
    const subs = [
      '^      !                    ',
      '         ^      !           ',
      '                 ^  !       '
    ];
    const notifier = hot('---------r-------r---------#');
    const nsubs = '       ^            !       ';
    const expected = '-1--2-----1--2----1--       ';

    const result = source.pipe(repeatWhen((notifications: any) => notifier));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
    expectSubscriptions(notifier.subscriptions).toBe(nsubs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const source = cold('-1--2--|');
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
      repeatWhen((notifications: any) => notifier),
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
      const source = cold('-1--2--|');
      const subs = [
        '^      !              ',
        '       ^      !       ',
        '              ^      !'
      ];
      const expected = '-1--2---1--2---1--2--#';

      let invoked = 0;
      const result = source.pipe(
        repeatWhen((notifications: any) =>
          notifications.pipe(
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
      const source = cold('-1--2--|');
      const subs = [
        '^      !              ',
        '       ^      !       ',
        '              ^      !'
      ];
      const expected = '-1--2---1--2---1--2--|';

      let invoked = 0;
      const result = source.pipe(
        repeatWhen((notifications: any) =>
          notifications.pipe(
            map(() => 'x'),
            takeUntil(
              notifications.pipe(
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

/** @test {retry} */
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

/** @test {retryWhen} */
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

/** @test {sequenceEqual} */
describe('sequenceEqual', () => {
  asDiagram('sequenceEqual(observable)')(
    'should return true for two equal sequences',
    () => {
      const s1 = hot('--a--^--b--c--d--e--f--g--|');
      const s1subs = '^                    !';
      const s2 = hot('-----^-----b--c--d-e-f------g-|');
      const s2subs = '^                        !';
      const expected = '-------------------------(T|)';

      const source = s1.pipe(sequenceEqual(s2));

      expectSource(source).toBe(expected, booleans);
      expectSubscriptions(s1.subscriptions).toBe(s1subs);
      expectSubscriptions(s2.subscriptions).toBe(s2subs);
    }
  );

  it('should return false for two sync observables that are unequal in length', () => {
    const s1 = cold('(abcdefg|)');
    const s2 = cold('(abc|)');
    const expected = '(F|)';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
  });

  it('should return true for two sync observables that match', () => {
    const s1 = cold('(abcdefg|)');
    const s2 = cold('(abcdefg|)');
    const expected = '(T|)';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
  });

  it('should return true for two observables that match when the last one emits and completes in the same frame', () => {
    const s1 = hot('--a--^--b--c--d--e--f--g--|');
    const s1subs = '^                    !';
    const s2 = hot('-----^--b--c--d--e--f--g------|');
    const s2subs = '^                        !';
    const expected = '-------------------------(T|)';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should return true for two observables that match when the last one emits and completes in the same frame', () => {
    const s1 = hot('--a--^--b--c--d--e--f--g--|');
    const s1subs = '^                    !';
    const s2 = hot('-----^--b--c--d--e--f---------(g|)');
    const s2subs = '^                        !';
    const expected = '-------------------------(T|)';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should error with an errored source', () => {
    const s1 = hot('--a--^--b---c---#');
    const s2 = hot('--a--^--b---c-----|');
    const expected = '-----------#';
    const sub = '^          !';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(sub);
    expectSubscriptions(s2.subscriptions).toBe(sub);
  });

  it('should error with an errored compareTo', () => {
    const s1 = hot('--a--^--b---c-----|');
    const s2 = hot('--a--^--b---c---#');
    const expected = '-----------#';
    const sub = '^          !';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(sub);
    expectSubscriptions(s2.subscriptions).toBe(sub);
  });

  it('should error if the source is a throw', () => {
    const s1 = cold('#'); // throw
    const s2 = cold('---a--b--c--|');
    const expected = '#'; // throw

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected);
  });

  it('should never return if source is a never', () => {
    const s1 = cold('------------'); // never
    const s2 = cold('--a--b--c--|');
    const expected = '------------'; // never

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected);
  });

  it('should never return if compareTo is a never', () => {
    const s1 = cold('--a--b--c--|');
    const s2 = cold('------------'); // never
    const expected = '------------'; // never

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected);
  });

  it('should return false if source is empty and compareTo is not', () => {
    const s1 = cold('|'); // empty
    const s2 = cold('------a------');
    const expected = '------(F|)';
    const s1subs = '(^!)';
    const s2subs = '^     !';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should return false if compareTo is empty and source is not', () => {
    const s1 = cold('------a------');
    const s2 = cold('|'); // empty
    const expected = '------(F|)';
    const s1subs = '^     !';
    const s2subs = '(^!)';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should return never if compareTo is empty and source is never', () => {
    const s1 = cold('-');
    const s2 = cold('|');
    const expected = '-';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected);
  });

  it('should return never if source is empty and compareTo is never', () => {
    const s1 = cold('|');
    const s2 = cold('-');
    const expected = '-';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected);
  });

  it('should error if the comparor errors', () => {
    const s1 = hot('--a--^--b-----c------d--|');
    const s1subs = '^            !';
    const s2 = hot('-----^--------x---y---z-------|');
    const s2subs = '^            !';
    const expected = '-------------#';

    let i = 0;
    const source = s1.pipe(
      sequenceEqual(s2, (a: any, b: any) => {
        if (++i === 2) {
          throw new Error('shazbot');
        }
        return a.value === b.value;
      })
    );

    const values: {[key: string]: any} = {
      a: null,
      b: {value: 'bees knees'},
      c: {value: 'carpy dumb'},
      d: {value: 'derp'},
      x: {value: 'bees knees', foo: 'lol'},
      y: {value: 'carpy dumb', scooby: 'doo'},
      z: {value: 'derp', weCouldBe: 'dancin, yeah'}
    };

    expectSource(source).toBe(
      expected,
      _.assign(booleans, values),
      new Error('shazbot')
    );
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should use the provided comparor', () => {
    const s1 = hot('--a--^--b-----c------d--|');
    const s1subs = '^                  !';
    const s2 = hot('-----^--------x---y---z-------|');
    const s2subs = '^                        !';
    const expected = '-------------------------(T|)';

    const source = s1.pipe(
      sequenceEqual(s2, (a: any, b: any) => a.value === b.value)
    );

    const values: {[key: string]: any} = {
      a: null,
      b: {value: 'bees knees'},
      c: {value: 'carpy dumb'},
      d: {value: 'derp'},
      x: {value: 'bees knees', foo: 'lol'},
      y: {value: 'carpy dumb', scooby: 'doo'},
      z: {value: 'derp', weCouldBe: 'dancin, yeah'}
    };

    expectSource(source).toBe(expected, _.assign(booleans, values));
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should return false for two unequal sequences, compareTo finishing last', () => {
    const s1 = hot('--a--^--b--c--d--e--f--g--|');
    const s1subs = '^                    !';
    const s2 = hot('-----^-----b--c--d-e-f------z-|');
    const s2subs = '^                      !';
    const expected = '-----------------------(F|)';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should return false for two unequal sequences, early wrong value from source', () => {
    const s1 = hot('--a--^--b--c---x-----------|');
    const s1subs = '^         !';
    const s2 = hot('-----^--b--c--d--e--f--|');
    const s2subs = '^         !';
    const expected = '----------(F|)';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should return false when the source emits an extra value after the compareTo completes', () => {
    const s1 = hot('--a--^--b--c--d--e--f--g--h--|');
    const s1subs = '^           !';
    const s2 = hot('-----^--b--c--d-|');
    const s2subs = '^          !';
    const expected = '------------(F|)';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should return false when the compareTo emits an extra value after the source completes', () => {
    const s1 = hot('--a--^--b--c--d-|');
    const s1subs = '^          !';
    const s2 = hot('-----^--b--c--d--e--f--g--h--|');
    const s2subs = '^           !';
    const expected = '------------(F|)';

    const source = s1.pipe(sequenceEqual(s2));

    expectSource(source).toBe(expected, booleans);
    expectSubscriptions(s1.subscriptions).toBe(s1subs);
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
  });

  it('should return true for two empty observables', () => {
    const s1 = cold('|');
    const s2 = cold('|');
    const expected = '(T|)';

    const source = s1.pipe(sequenceEqual(s2));
    expectSource(source).toBe(expected, booleans);
  });

  it('should return false for an empty observable and an observable that emits', () => {
    const s1 = cold('|');
    const s2 = cold('---a--|');
    const expected = '---(F|)';

    const source = s1.pipe(sequenceEqual(s2));
    expectSource(source).toBe(expected, booleans);
  });

  it('should return compare hot and cold observables', () => {
    const s1 = hot('---a--^---b---c---d---e---f---g---h---i---j---|');
    const s2 = cold('----b---c-|');
    const expected1 = '------------(F|)';
    const s2subs = '^         !';
    const delay = '-------------------|';
    const s3 = cold('-f---g---h---i---j---|');
    const expected2 = '                   ---------------------(T|)';
    const s3subs = '                   ^                    !';

    const test1 = s1.pipe(sequenceEqual(s2));
    const test2 = s1.pipe(sequenceEqual(s3));

    expectSource(test1).toBe(expected1, booleans);
    rxTestScheduler.schedule(
      () => expectSource(test2).toBe(expected2, booleans),
      time(delay)
    );
    expectSubscriptions(s2.subscriptions).toBe(s2subs);
    expectSubscriptions(s3.subscriptions).toBe(s3subs);
  });
});

/** @test {share} */
describe('share', () => {
  asDiagram('share')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = '^              !';
    const expected = '--1-2---3-4--5-|';

    const shared = source.pipe(share());

    expectSource(shared).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should share a single subscription', () => {
    let subscriptionCount = 0;
    const obs = new Observable<never>(observer => {
      subscriptionCount++;
    });

    const source = obs.pipe(share());

    expect(subscriptionCount).to.equal(0);

    source.subscribe();
    source.subscribe();

    expect(subscriptionCount).to.equal(1);
  });

  it('should not change the output of the observable when error', () => {
    const e1 = hot('---a--^--b--c--d--e--#');
    const e1subs = '^              !';
    const expected = '---b--c--d--e--#';

    expectSource(e1.pipe(share())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not change the output of the observable when successful with cold observable', () => {
    const e1 = cold('---a--b--c--d--e--|');
    const e1subs = '^                 !';
    const expected = '---a--b--c--d--e--|';

    expectSource(e1.pipe(share())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not change the output of the observable when error with cold observable', () => {
    const e1 = cold('---a--b--c--d--e--#');
    const e1subs = '^                 !';
    const expected = '---a--b--c--d--e--#';

    expectSource(e1.pipe(share())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should retry just fine', () => {
    const e1 = cold('---a--b--c--d--e--#');
    const e1subs = [
      '^                 !                  ',
      '                  ^                 !'
    ];
    const expected = '---a--b--c--d--e-----a--b--c--d--e--#';

    expectSource(e1.pipe(share(), retry(1))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should share the same values to multiple observers', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^           !';
    const shared = source.pipe(share());
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(shared));
    const expected1 = '-1-2-3----4-|';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(shared));
    const expected2 = '    -3----4-|';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(shared));
    const expected3 = '        --4-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should share an error from the source to multiple observers', () => {
    const source = cold('-1-2-3----4-#');
    const sourceSubs = '^           !';
    const shared = source.pipe(share());
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(shared));
    const expected1 = '-1-2-3----4-#';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(shared));
    const expected2 = '    -3----4-#';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(shared));
    const expected3 = '        --4-#';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it(
    'should share the same values to multiple observers, ' +
      'but is unsubscribed explicitly and early',
    () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '^        !   ';
      const shared = source.pipe(share());
      const unsub = '         !   ';
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(shared));
      const expected1 = '-1-2-3----   ';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(shared));
      const expected2 = '    -3----   ';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(shared));
      const expected3 = '        --   ';

      expectSource(subscriber1, unsub).toBe(expected1);
      expectSource(subscriber2, unsub).toBe(expected2);
      expectSource(subscriber3, unsub).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    }
  );

  it('should share an empty source', () => {
    const source = cold('|');
    const sourceSubs = '(^!)';
    const shared = source.pipe(share());
    const expected = '|';

    expectSource(shared).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should share a never source', () => {
    const source = cold('-');
    const sourceSubs = '^';
    const shared = source.pipe(share());
    const expected = '-';

    expectSource(shared).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should share a throw source', () => {
    const source = cold('#');
    const sourceSubs = '(^!)';
    const shared = source.pipe(share());
    const expected = '#';

    expectSource(shared).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should connect when first subscriber subscribes', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '   ^           !';
    const shared = source.pipe(share());
    const subscriber1 = hot('   a|           ').pipe(mergeMapTo(shared));
    const expected1 = '   -1-2-3----4-|';
    const subscriber2 = hot('       b|       ').pipe(mergeMapTo(shared));
    const expected2 = '       -3----4-|';
    const subscriber3 = hot('           c|   ').pipe(mergeMapTo(shared));
    const expected3 = '           --4-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should disconnect when last subscriber unsubscribes', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '   ^        !   ';
    const shared = source.pipe(share());
    const subscriber1 = hot('   a|           ').pipe(mergeMapTo(shared));
    const unsub1 = '          !     ';
    const expected1 = '   -1-2-3--     ';
    const subscriber2 = hot('       b|       ').pipe(mergeMapTo(shared));
    const unsub2 = '            !   ';
    const expected2 = '       -3----   ';

    expectSource(subscriber1, unsub1).toBe(expected1);
    expectSource(subscriber2, unsub2).toBe(expected2);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not break unsubscription chain when last subscriber unsubscribes', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '   ^        !   ';
    const shared = source.pipe(
      mergeMap((x: string) => of(x)),
      share(),
      mergeMap((x: string) => of(x))
    );
    const subscriber1 = hot('   a|           ').pipe(mergeMapTo(shared));
    const unsub1 = '          !     ';
    const expected1 = '   -1-2-3--     ';
    const subscriber2 = hot('       b|       ').pipe(mergeMapTo(shared));
    const unsub2 = '            !   ';
    const expected2 = '       -3----   ';

    expectSource(subscriber1, unsub1).toBe(expected1);
    expectSource(subscriber2, unsub2).toBe(expected2);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should be retryable when cold source is synchronous', () => {
    const source = cold('(123#)');
    const shared = source.pipe(share());
    const subscribe1 = 's         ';
    const expected1 = '(123123#) ';
    const subscribe2 = ' s        ';
    const expected2 = ' (123123#)';
    const sourceSubs = ['(^!)', '(^!)', ' (^!)', ' (^!)'];

    expectSource(
      hot(subscribe1).pipe(
        tap(() => {
          expectSource(shared.pipe(retry(1))).toBe(expected1);
        })
      )
    ).toBe(subscribe1);

    expectSource(
      hot(subscribe2).pipe(
        tap(() => {
          expectSource(shared.pipe(retry(1))).toBe(expected2);
        })
      )
    ).toBe(subscribe2);

    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should be repeatable when cold source is synchronous', () => {
    const source = cold('(123|)');
    const shared = source.pipe(share());
    const subscribe1 = 's         ';
    const expected1 = '(123123|) ';
    const subscribe2 = ' s        ';
    const expected2 = ' (123123|)';
    const sourceSubs = ['(^!)', '(^!)', ' (^!)', ' (^!)'];

    expectSource(
      hot(subscribe1).pipe(
        tap(() => {
          expectSource(shared.pipe(repeat(2))).toBe(expected1);
        })
      )
    ).toBe(subscribe1);

    expectSource(
      hot(subscribe2).pipe(
        tap(() => {
          expectSource(shared.pipe(repeat(2))).toBe(expected2);
        })
      )
    ).toBe(subscribe2);

    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should be retryable', () => {
    const source = cold('-1-2-3----4-#                        ');
    const sourceSubs = [
      '^           !                        ',
      '            ^           !            ',
      '                        ^           !'
    ];
    const shared = source.pipe(share());
    const subscribe1 = 's                                    ';
    const expected1 = '-1-2-3----4--1-2-3----4--1-2-3----4-#';
    const subscribe2 = '    s                                ';
    const expected2 = '    -3----4--1-2-3----4--1-2-3----4-#';

    expectSource(
      hot(subscribe1).pipe(
        tap(() => {
          expectSource(shared.pipe(retry(2))).toBe(expected1);
        })
      )
    ).toBe(subscribe1);

    expectSource(
      hot(subscribe2).pipe(
        tap(() => {
          expectSource(shared.pipe(retry(2))).toBe(expected2);
        })
      )
    ).toBe(subscribe2);

    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should be repeatable', () => {
    const source = cold('-1-2-3----4-|                        ');
    const sourceSubs = [
      '^           !                        ',
      '            ^           !            ',
      '                        ^           !'
    ];
    const shared = source.pipe(share());
    const subscribe1 = 's                                    ';
    const expected1 = '-1-2-3----4--1-2-3----4--1-2-3----4-|';
    const subscribe2 = '    s                                ';
    const expected2 = '    -3----4--1-2-3----4--1-2-3----4-|';

    expectSource(
      hot(subscribe1).pipe(
        tap(() => {
          expectSource(shared.pipe(repeat(3))).toBe(expected1);
        })
      )
    ).toBe(subscribe1);

    expectSource(
      hot(subscribe2).pipe(
        tap(() => {
          expectSource(shared.pipe(repeat(3))).toBe(expected2);
        })
      )
    ).toBe(subscribe2);

    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not change the output of the observable when never', () => {
    const e1 = NEVER;
    const expected = '-';

    expectSource(e1.pipe(share())).toBe(expected);
  });

  it('should not change the output of the observable when empty', () => {
    const e1 = EMPTY;
    const expected = '|';

    expectSource(e1.pipe(share())).toBe(expected);
  });
});

/** @test {shareReplay} */
describe('shareReplay', () => {
  it('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = '^              !';
    const published = source.pipe(shareReplay());
    const expected = '--1-2---3-4--5-|';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should do nothing if result is not subscribed', () => {
    let subscribed = false;
    const source = new Observable(() => {
      subscribed = true;
    });
    source.pipe(shareReplay());
    expect(subscribed).to.be.false;
  });

  it('should multicast the same values to multiple observers, bufferSize=1', () => {
    const source = cold('-1-2-3----4-|');
    const shared = source.pipe(shareReplay(1));
    const sourceSubs = '^           !';
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(shared));
    const expected1 = '-1-2-3----4-|';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(shared));
    const expected2 = '    23----4-|';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(shared));
    const expected3 = '        3-4-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast the same values to multiple observers, bufferSize=2', () => {
    const source = cold('-1-2-----3------4-|');
    const shared = source.pipe(shareReplay(2));
    const sourceSubs = '^                 !';
    const subscriber1 = hot('a|                 ').pipe(mergeMapTo(shared));
    const expected1 = '-1-2-----3------4-|';
    const subscriber2 = hot('    b|             ').pipe(mergeMapTo(shared));
    const expected2 = '    (12)-3------4-|';
    const subscriber3 = hot('           c|       ').pipe(mergeMapTo(shared));
    const expected3 = '           (23)-4-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast an error from the source to multiple observers', () => {
    const source = cold('-1-2-3----4-#');
    const shared = source.pipe(shareReplay(1));
    const sourceSubs = '^           !';
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(shared));
    const expected1 = '-1-2-3----4-#';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(shared));
    const expected2 = '    23----4-#';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(shared));
    const expected3 = '        3-4-#';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast an empty source', () => {
    const source = cold('|');
    const sourceSubs = '(^!)';
    const shared = source.pipe(shareReplay(1));
    const expected = '|';

    expectSource(shared).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast a never source', () => {
    const source = cold('-');
    const sourceSubs = '^';

    const shared = source.pipe(shareReplay(1));
    const expected = '-';

    expectSource(shared).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast a throw source', () => {
    const source = cold('#');
    const sourceSubs = '(^!)';
    const shared = source.pipe(shareReplay(1));
    const expected = '#';

    expectSource(shared).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should replay results to subsequent subscriptions if source completes, bufferSize=2', () => {
    const source = cold('-1-2-----3-|        ');
    const shared = source.pipe(shareReplay(2));
    const sourceSubs = '^          !        ';
    const subscriber1 = hot('a|                  ').pipe(mergeMapTo(shared));
    const expected1 = '-1-2-----3-|        ';
    const subscriber2 = hot('    b|              ').pipe(mergeMapTo(shared));
    const expected2 = '    (12)-3-|        ';
    const subscriber3 = hot('               (c|) ').pipe(mergeMapTo(shared));
    const expected3 = '               (23|)';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should completely restart for subsequent subscriptions if source errors, bufferSize=2', () => {
    const source = cold('-1-2-----3-#               ');
    const shared = source.pipe(shareReplay(2));
    const sourceSubs1 = '^          !               ';
    const subscriber1 = hot('a|                         ').pipe(
      mergeMapTo(shared)
    );
    const expected1 = '-1-2-----3-#               ';
    const subscriber2 = hot('    b|                     ').pipe(
      mergeMapTo(shared)
    );
    const expected2 = '    (12)-3-#               ';
    const subscriber3 = hot('               (c|)        ').pipe(
      mergeMapTo(shared)
    );
    const expected3 = '               -1-2-----3-#';
    const sourceSubs2 = '               ^          !';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe([sourceSubs1, sourceSubs2]);
  });

  it('should be retryable, bufferSize=2', () => {
    const subs = [];
    const source = cold('-1-2-----3-#                      ');
    const shared = source.pipe(shareReplay(2), retry(1));
    subs.push('^          !                      ');
    subs.push('           ^          !           ');
    subs.push('                      ^          !');
    const subscriber1 = hot('a|                                ').pipe(
      mergeMapTo(shared)
    );
    const expected1 = '-1-2-----3--1-2-----3-#           ';
    const subscriber2 = hot('    b|                            ').pipe(
      mergeMapTo(shared)
    );
    const expected2 = '    (12)-3--1-2-----3-#           ';
    const subscriber3 = hot('               (c|)               ').pipe(
      mergeMapTo(shared)
    );
    const expected3 = '               (12)-3--1-2-----3-#';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('when no windowTime is given Replay should be in _infiniteTimeWindow mode', () => {
    const spy = sinon.spy(rxTestScheduler, 'now');

    of(1).pipe(shareReplay(1, undefined, rxTestScheduler)).subscribe();
    spy.restore();
    expect(
      spy,
      'Replay should not call scheduler.now() when no windowTime is given'
    ).to.be.not.called;
  });

  it('should not restart due to unsubscriptions if refCount is false', () => {
    const source = cold('a-b-c-d-e-f-g-h-i-j');
    const sub1 = '^------!';
    const expected1 = 'a-b-c-d-';
    const sub2 = '-----------^-------';
    const expected2 = '-----------fg-h-i-j';

    const shared = source.pipe(shareReplay({bufferSize: 1, refCount: false}));

    expectSource(shared, sub1).toBe(expected1);
    expectSource(shared, sub2).toBe(expected2);
  });

  it('should restart due to unsubscriptions if refCount is true', () => {
    const source = cold('a-b-c-d-e-f-g-h-i-j');
    const sub1 = '^------!';
    const expected1 = 'a-b-c-d-';
    const sub2 = '-----------^------------------';
    const expected2 = '-----------a-b-c-d-e-f-g-h-i-j';

    const shared = source.pipe(shareReplay({bufferSize: 1, refCount: true}));

    expectSource(shared, sub1).toBe(expected1);
    expectSource(shared, sub2).toBe(expected2);
  });

  it('should default to refCount being false', () => {
    const source = cold('a-b-c-d-e-f-g-h-i-j');
    const sub1 = '^------!';
    const expected1 = 'a-b-c-d-';
    const sub2 = '-----------^-------';
    const expected2 = '-----------fg-h-i-j';

    const shared = source.pipe(shareReplay(1));

    expectSource(shared, sub1).toBe(expected1);
    expectSource(shared, sub2).toBe(expected2);
  });

  it('should not break lift() composability', (done: MochaDone) => {
    class MyCustomObservable<T> extends Observable<T> {
      lift<R>(operator: Operator<T, R>): Observable<R> {
        const observable = new MyCustomObservable<R>();
        (<any>observable).source = this;
        (<any>observable).operator = operator;
        return observable;
      }
    }

    const result = new MyCustomObservable((observer: Observer<number>) => {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    }).pipe(shareReplay());

    expect(result instanceof MyCustomObservable).to.be.true;

    const expected = [1, 2, 3];

    result.subscribe(
      (n: any) => {
        expect(expected.length).to.be.greaterThan(0);
        expect(n).to.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });
});

/** @test {subscribeOn} */
describe('subscribeOn', () => {
  asDiagram('subscribeOn(scheduler)')(
    'should subscribe on specified scheduler',
    () => {
      const e1 = hot('--a--b--|');
      const expected = '--a--b--|';
      const sub = '^       !';

      expectSource(e1.pipe(subscribeOn(rxTestScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(sub);
    }
  );

  it('should start subscribe after specified delay', () => {
    const e1 = hot('--a--b--|');
    const expected = '-----b--|';
    const sub = '   ^    !';

    expectSource(e1.pipe(subscribeOn(rxTestScheduler, 30))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should subscribe when source raises error', () => {
    const e1 = hot('--a--#');
    const expected = '--a--#';
    const sub = '^    !';

    expectSource(e1.pipe(subscribeOn(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should subscribe when source is empty', () => {
    const e1 = hot('----|');
    const expected = '----|';
    const sub = '^   !';

    expectSource(e1.pipe(subscribeOn(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should subscribe when source does not complete', () => {
    const e1 = hot('----');
    const expected = '----';
    const sub = '^   ';

    expectSource(e1.pipe(subscribeOn(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--b--|');
    const sub = '^   !    ';
    const expected = '--a--    ';
    const unsub = '    !    ';

    const result = e1.pipe(subscribeOn(rxTestScheduler));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should not break unsubscription chains when the result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b--|');
    const sub = '^   !    ';
    const expected = '--a--    ';
    const unsub = '    !    ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      subscribeOn(rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });
});

/** @test {tap} */
describe('tap', () => {
  asDiagram('tap(x => console.log(x))')(
    'should mirror multiple values and complete',
    () => {
      const e1 = cold('--1--2--3--|');
      const e1subs = '^          !';
      const expected = '--1--2--3--|';

      const result = e1.pipe(
        tap(() => {
          //noop
        })
      );
      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should next with a callback', () => {
    let value = null;
    of(42)
      .pipe(
        tap(function (x) {
          value = x;
        })
      )
      .subscribe();

    expect(value).to.equal(42);
  });

  it('should error with a callback', () => {
    let err = null;
    throwError('bad')
      .pipe(
        tap(null, function (x) {
          err = x;
        })
      )
      .subscribe(null, function (ex) {
        expect(ex).to.equal('bad');
      });

    expect(err).to.equal('bad');
  });

  it('should handle everything with an observer', (done: MochaDone) => {
    const expected = [1, 2, 3];
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(
        tap(<Observer<number>>{
          next: (x: number) => {
            results.push(x);
          },
          error: (err: any) => {
            done(new Error('should not be called'));
          },
          complete: () => {
            expect(results).to.deep.equal(expected);
            done();
          }
        })
      )
      .subscribe();
  });

  it('should handle everything with a Subject', (done: MochaDone) => {
    const expected = [1, 2, 3];
    const results: number[] = [];
    const subject = new Subject<number>();

    subject.subscribe({
      next: (x: any) => {
        results.push(x);
      },
      error: (err: any) => {
        done(new Error('should not be called'));
      },
      complete: () => {
        expect(results).to.deep.equal(expected);
        done();
      }
    });

    of(1, 2, 3).pipe(tap(subject)).subscribe();
  });

  it('should handle an error with a callback', () => {
    let errored = false;
    throwError('bad')
      .pipe(
        tap(null, (err: any) => {
          expect(err).to.equal('bad');
        })
      )
      .subscribe(null, (err: any) => {
        errored = true;
        expect(err).to.equal('bad');
      });

    expect(errored).to.be.true;
  });

  it('should handle an error with observer', () => {
    let errored = false;
    throwError('bad')
      .pipe(
        tap(<any>{
          error: function (err: string) {
            expect(err).to.equal('bad');
          }
        })
      )
      .subscribe(null, function (err) {
        errored = true;
        expect(err).to.equal('bad');
      });

    expect(errored).to.be.true;
  });

  it('should handle complete with observer', () => {
    let completed = false;

    EMPTY.pipe(
      tap(<any>{
        complete: () => {
          completed = true;
        }
      })
    ).subscribe();

    expect(completed).to.be.true;
  });

  it('should handle next with observer', () => {
    let value = null;

    of('hi')
      .pipe(
        tap(<any>{
          next: (x: string) => {
            value = x;
          }
        })
      )
      .subscribe();

    expect(value).to.equal('hi');
  });

  it('should raise error if next handler raises error', () => {
    of('hi')
      .pipe(
        tap(<any>{
          next: (x: string) => {
            throw new Error('bad');
          }
        })
      )
      .subscribe(null, (err: any) => {
        expect(err.message).to.equal('bad');
      });
  });

  it('should raise error if error handler raises error', () => {
    throwError('ops')
      .pipe(
        tap(<any>{
          error: (x: any) => {
            throw new Error('bad');
          }
        })
      )
      .subscribe(null, (err: any) => {
        expect(err.message).to.equal('bad');
      });
  });

  it('should raise error if complete handler raises error', () => {
    EMPTY.pipe(
      tap(<any>{
        complete: () => {
          throw new Error('bad');
        }
      })
    ).subscribe(null, (err: any) => {
      expect(err.message).to.equal('bad');
    });
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--1--2--3--#');
    const unsub = '       !    ';
    const e1subs = '^      !    ';
    const expected = '--1--2--    ';

    const result = e1.pipe(
      tap(() => {
        //noop
      })
    );
    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--1--2--3--#');
    const e1subs = '^      !    ';
    const expected = '--1--2--    ';
    const unsub = '       !    ';

    const result = e1.pipe(
      mergeMap((x: any) => of(x)),
      tap(() => {
        //noop
      }),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mirror multiple values and complete', () => {
    const e1 = cold('--1--2--3--|');
    const e1subs = '^          !';
    const expected = '--1--2--3--|';

    const result = e1.pipe(
      tap(() => {
        //noop
      })
    );
    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mirror multiple values and terminate with error', () => {
    const e1 = cold('--1--2--3--#');
    const e1subs = '^          !';
    const expected = '--1--2--3--#';

    const result = e1.pipe(
      tap(() => {
        //noop
      })
    );
    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

/** @test {timeout} */
describe('throwIfEmpty', () => {
  describe('with errorFactory', () => {
    asDiagram('throwIfEmpty')('should error when empty', () => {
      const source = cold('----|');
      const expected = '----#';
      expectSource(source.pipe(throwIfEmpty(() => new Error('test')))).toBe(
        expected,
        undefined,
        new Error('test')
      );
    });

    it('should throw if empty', () => {
      const error = new Error('So empty inside');
      let thrown: any;

      EMPTY.pipe(throwIfEmpty(() => error)).subscribe({
        error(err) {
          thrown = err;
        }
      });

      expect(thrown).to.equal(error);
    });

    it('should NOT throw if NOT empty', () => {
      const error = new Error('So empty inside');
      let thrown: any;

      of('test')
        .pipe(throwIfEmpty(() => error))
        .subscribe({
          error(err) {
            thrown = err;
          }
        });

      expect(thrown).to.be.undefined;
    });

    it('should pass values through', () => {
      const source = cold('----a---b---c---|');
      const sub1 = '^               !';
      const expected = '----a---b---c---|';
      expectSource(source.pipe(throwIfEmpty(() => new Error('test')))).toBe(
        expected
      );
      expectSubscriptions(source.subscriptions).toBe([sub1]);
    });

    it('should never when never', () => {
      const source = cold('-');
      const sub1 = '^';
      const expected = '-';
      expectSource(source.pipe(throwIfEmpty(() => new Error('test')))).toBe(
        expected
      );
      expectSubscriptions(source.subscriptions).toBe([sub1]);
    });

    it('should error when empty', () => {
      const source = cold('----|');
      const sub1 = '^   !';
      const expected = '----#';
      expectSource(source.pipe(throwIfEmpty(() => new Error('test')))).toBe(
        expected,
        undefined,
        new Error('test')
      );
      expectSubscriptions(source.subscriptions).toBe([sub1]);
    });

    it('should throw if empty after retry', () => {
      const error = new Error('So empty inside');
      let thrown: any;
      let sourceIsEmpty = false;

      const source = defer(() => {
        if (sourceIsEmpty) {
          return EMPTY;
        }
        sourceIsEmpty = true;
        return of(1, 2);
      });

      source
        .pipe(
          throwIfEmpty(() => error),
          mergeMap(value => {
            if (value > 1) {
              return throwError(new Error());
            }

            return of(value);
          }),
          retry(1)
        )
        .subscribe({
          error(err) {
            thrown = err;
          }
        });

      expect(thrown).to.equal(error);
    });
  });

  describe('without errorFactory', () => {
    it('should throw EmptyError if empty', () => {
      let thrown: any;

      EMPTY.pipe(throwIfEmpty()).subscribe({
        error(err) {
          thrown = err;
        }
      });

      expect(thrown).to.be.instanceof(EmptyError);
    });

    it('should NOT throw if NOT empty', () => {
      let thrown: any;

      of('test')
        .pipe(throwIfEmpty())
        .subscribe({
          error(err) {
            thrown = err;
          }
        });

      expect(thrown).to.be.undefined;
    });

    it('should pass values through', () => {
      const source = cold('----a---b---c---|');
      const sub1 = '^               !';
      const expected = '----a---b---c---|';
      expectSource(source.pipe(throwIfEmpty())).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe([sub1]);
    });

    it('should never when never', () => {
      const source = cold('-');
      const sub1 = '^';
      const expected = '-';
      expectSource(source.pipe(throwIfEmpty())).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe([sub1]);
    });

    it('should error when empty', () => {
      const source = cold('----|');
      const sub1 = '^   !';
      const expected = '----#';
      expectSource(source.pipe(throwIfEmpty())).toBe(
        expected,
        undefined,
        new EmptyError()
      );
      expectSubscriptions(source.subscriptions).toBe([sub1]);
    });

    it('should throw if empty after retry', () => {
      let thrown: any;
      let sourceIsEmpty = false;

      const source = defer(() => {
        if (sourceIsEmpty) {
          return EMPTY;
        }
        sourceIsEmpty = true;
        return of(1, 2);
      });

      source
        .pipe(
          throwIfEmpty(),
          mergeMap(value => {
            if (value > 1) {
              return throwError(new Error());
            }

            return of(value);
          }),
          retry(1)
        )
        .subscribe({
          error(err) {
            thrown = err;
          }
        });

      expect(thrown).to.be.instanceof(EmptyError);
    });
  });
});

/** @test {timeInterval} */
describe('timeInterval', () => {
  asDiagram('timeInterval')(
    'should record the time interval between source elements',
    () => {
      const e1 = hot('--a--^b-c-----d--e--|');
      const e1subs = '^              !';
      const expected = '-w-x-----y--z--|';
      const expectedValue = {w: 10, x: 20, y: 60, z: 30};

      const result = (<any>e1).pipe(
        timeInterval(rxTestScheduler),
        map((x: any) => x.interval)
      );

      expectSource(result).toBe(expected, expectedValue);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should record interval if source emit elements', () => {
    const e1 = hot('--a--^b--c----d---e--|');
    const e1subs = '^               !';
    const expected = '-w--x----y---z--|';

    const expectedValue = {
      w: new TimeInterval('b', 10),
      x: new TimeInterval('c', 30),
      y: new TimeInterval('d', 50),
      z: new TimeInterval('e', 40)
    };

    expectSource((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(
      expected,
      expectedValue
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should completes without record interval if source does not emits', () => {
    const e1 = hot('---------|');
    const e1subs = '^        !';
    const expected = '---------|';

    expectSource((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete immediately if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should record interval then does not completes if source emits but not completes', () => {
    const e1 = hot('-a--b--');
    const e1subs = '^      ';
    const expected = '-y--z--';

    const expectedValue = {
      y: new TimeInterval('a', 10),
      z: new TimeInterval('b', 30)
    };

    expectSource((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(
      expected,
      expectedValue
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('-a--b-----c---d---|');
    const unsub = '       !           ';
    const e1subs = '^      !           ';
    const expected = '-y--z---           ';

    const expectedValue = {
      y: new TimeInterval('a', 10),
      z: new TimeInterval('b', 30)
    };

    const result = (<any>e1).pipe(timeInterval(rxTestScheduler));

    expectSource(result, unsub).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('-a--b-----c---d---|');
    const e1subs = '^      !           ';
    const expected = '-y--z---           ';
    const unsub = '       !           ';

    const expectedValue = {
      y: new TimeInterval('a', 10),
      z: new TimeInterval('b', 30)
    };

    const result = (<any>e1).pipe(
      mergeMap((x: string) => of(x)),
      timeInterval(rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('raise error if source raises error', () => {
    const e1 = hot('---#');
    const e1subs = '^  !';
    const expected = '---#';

    expectSource((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should record interval then raise error if source raises error after emit', () => {
    const e1 = hot('-a--b--#');
    const e1subs = '^      !';
    const expected = '-y--z--#';

    const expectedValue = {
      y: new TimeInterval('a', 10),
      z: new TimeInterval('b', 30)
    };

    expectSource((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(
      expected,
      expectedValue
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source immediately throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource((<any>e1).pipe(timeInterval(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

/** @test {timeout} */
describe('timeout', () => {
  const defaultTimeoutError = new TimeoutError();

  asDiagram('timeout(50)')(
    'should timeout after a specified timeout period',
    () => {
      const e1 = cold('-------a--b--|');
      const e1subs = '^    !        ';
      const expected = '-----#        ';

      const result = e1.pipe(timeout(50, rxTestScheduler));

      expectSource(result).toBe(expected, null, defaultTimeoutError);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should emit and error of an instanceof TimeoutError on timeout', () => {
    const e1 = cold('-------a--b--|');
    const result = e1.pipe(timeout(50, rxTestScheduler));
    let error;
    result.subscribe(
      () => {
        throw new Error('this should not next');
      },
      err => {
        error = err;
      },
      () => {
        throw new Error('this should not complete');
      }
    );
    rxTestScheduler.flush();
    expect(error).to.be.an.instanceof(TimeoutError);
    expect(error).to.have.property('name', 'TimeoutError');
  });

  it('should not timeout if source completes within absolute timeout period', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^                !';
    const expected = '--a--b--c--d--e--|';

    const timeoutValue = new Date(
      rxTestScheduler.now() + (expected.length + 2) * 10
    );

    expectSource(e1.pipe(timeout(timeoutValue, rxTestScheduler))).toBe(
      expected
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not timeout if source emits within timeout period', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^                !';
    const expected = '--a--b--c--d--e--|';

    expectSource(e1.pipe(timeout(50, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--b--c---d--e--|');
    const unsub = '          !        ';
    const e1subs = '^         !        ';
    const expected = '--a--b--c--        ';

    const result = e1.pipe(timeout(50, rxTestScheduler));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b--c---d--e--|');
    const e1subs = '^         !        ';
    const expected = '--a--b--c--        ';
    const unsub = '          !        ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      timeout(50, rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it(
    'should timeout after a specified timeout period between emit with default ' +
      'error while source emits',
    () => {
      const e1 = hot('---a---b---c------d---e---|');
      const e1subs = '^               !          ';
      const expected = '---a---b---c----#          ';
      const values = {a: 'a', b: 'b', c: 'c'};

      const result = e1.pipe(timeout(50, rxTestScheduler));

      expectSource(result).toBe(expected, values, defaultTimeoutError);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should timeout at a specified Date', () => {
    const e1 = cold('-');
    const e1subs = '^         !';
    const expected = '----------#';

    const result = e1.pipe(
      timeout(new Date(rxTestScheduler.now() + 100), rxTestScheduler)
    );

    expectSource(result).toBe(expected, null, defaultTimeoutError);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should timeout specified Date with default error while source emits', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^         !       ';
    const expected = '--a--b--c-#       ';
    const values = {a: 'a', b: 'b', c: 'c'};

    const result = e1.pipe(
      timeout(new Date(rxTestScheduler.now() + 100), rxTestScheduler)
    );

    expectSource(result).toBe(expected, values, defaultTimeoutError);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should unsubscribe from the scheduled timeout action when timeout is unsubscribed early', () => {
    const e1 = hot('--a--b--c---d--e--|');
    const e1subs = '^         !        ';
    const expected = '--a--b--c--        ';
    const unsub = '          !        ';

    const result = e1
      .lift({
        call: (timeoutSubscriber, source) => {
          const {action} = <any>timeoutSubscriber; // get a ref to the action here
          timeoutSubscriber.add(() => {
            // because it'll be null by the
            if (!action.closed) {
              // time we get into this function.
              throw new Error(
                "TimeoutSubscriber scheduled action wasn't canceled"
              );
            }
          });
          return source.subscribe(timeoutSubscriber);
        }
      })
      .pipe(timeout(50, rxTestScheduler));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

/** @test {timeoutWith} */
describe('timeoutWith', () => {
  asDiagram('timeoutWith(50)')(
    'should timeout after a specified period then subscribe to the passed observable',
    () => {
      const e1 = cold('-------a--b--|');
      const e1subs = '^    !        ';
      const e2 = cold('x-y-z-|  ');
      const e2subs = '     ^     !  ';
      const expected = '-----x-y-z-|  ';

      const result = e1.pipe(timeoutWith(50, e2, rxTestScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should timeout at a specified date then subscribe to the passed observable', () => {
    const e1 = cold('-');
    const e1subs = '^         !           ';
    const e2 = cold('--x--y--z--|');
    const e2subs = '          ^          !';
    const expected = '------------x--y--z--|';

    const result = e1.pipe(
      timeoutWith(new Date(rxTestScheduler.now() + 100), e2, rxTestScheduler)
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it(
    'should timeout after a specified period between emit then subscribe ' +
      'to the passed observable when source emits',
    () => {
      const e1 = hot('---a---b------c---|');
      const e1subs = '^          !       ';
      const e2 = cold('-x-y-|  ');
      const e2subs = '           ^    !  ';
      const expected = '---a---b----x-y-|  ';

      const result = e1.pipe(timeoutWith(40, e2, rxTestScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('---a---b-----c----|');
    const e1subs = '^          !       ';
    const e2 = cold('-x---y| ');
    const e2subs = '           ^  !    ';
    const expected = '---a---b----x--    ';
    const unsub = '              !    ';

    const result = e1.pipe(timeoutWith(40, e2, rxTestScheduler));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const e1 = hot('---a---b-----c----|');
    const e1subs = '^          !       ';
    const e2 = cold('-x---y| ');
    const e2subs = '           ^  !    ';
    const expected = '---a---b----x--    ';
    const unsub = '              !    ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      timeoutWith(40, e2, rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not subscribe to withObservable after explicit unsubscription', () => {
    const e1 = cold('---a------b------');
    const e1subs = '^    !           ';
    const e2 = cold('i---j---|');
    const e2subs: string[] = [];
    const expected = '---a--           ';
    const unsub = '     !           ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      timeoutWith(50, e2, rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it(
    'should timeout after a specified period then subscribe to the ' +
      'passed observable when source is empty',
    () => {
      const e1 = hot('-------------|      ');
      const e1subs = '^         !         ';
      const e2 = cold('----x----|');
      const e2subs = '          ^        !';
      const expected = '--------------x----|';

      const result = e1.pipe(timeoutWith(100, e2, rxTestScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it(
    'should timeout after a specified period between emit then never completes ' +
      'if other source does not complete',
    () => {
      const e1 = hot('--a--b--------c--d--|');
      const e1subs = '^        !           ';
      const e2 = cold('-');
      const e2subs = '         ^           ';
      const expected = '--a--b----           ';

      const result = e1.pipe(timeoutWith(40, e2, rxTestScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it(
    'should timeout after a specified period then subscribe to the ' +
      'passed observable when source raises error after timeout',
    () => {
      const e1 = hot('-------------#      ');
      const e1subs = '^         !         ';
      const e2 = cold('----x----|');
      const e2subs = '          ^        !';
      const expected = '--------------x----|';

      const result = e1.pipe(timeoutWith(100, e2, rxTestScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it(
    'should timeout after a specified period between emit then never completes ' +
      'if other source emits but not complete',
    () => {
      const e1 = hot('-------------|     ');
      const e1subs = '^         !        ';
      const e2 = cold('----x----');
      const e2subs = '          ^        ';
      const expected = '--------------x----';

      const result = e1.pipe(timeoutWith(100, e2, rxTestScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should not timeout if source completes within timeout period', () => {
    const e1 = hot('-----|');
    const e1subs = '^    !';
    const e2 = cold('----x----');
    const e2subs: string[] = [];
    const expected = '-----|';

    const result = e1.pipe(timeoutWith(100, e2, rxTestScheduler));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not timeout if source raises error within timeout period', () => {
    const e1 = hot('-----#');
    const e1subs = '^    !';
    const e2 = cold('----x----|');
    const e2subs: string[] = [];
    const expected = '-----#';

    const result = e1.pipe(timeoutWith(100, e2, rxTestScheduler));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not timeout if source emits within timeout period', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^                !';
    const e2 = cold('----x----|');
    const e2subs: string[] = [];
    const expected = '--a--b--c--d--e--|';

    const result = e1.pipe(timeoutWith(50, e2, rxTestScheduler));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should timeout after specified Date then subscribe to the passed observable', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^      !          ';
    const e2 = cold('--z--|     ');
    const e2subs = '       ^    !     ';
    const expected = '--a--b---z--|     ';

    const result = e1.pipe(
      timeoutWith(new Date(rxTestScheduler.now() + 70), e2, rxTestScheduler)
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not timeout if source completes within specified Date', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^                !';
    const e2 = cold('--x--|');
    const e2subs: string[] = [];
    const expected = '--a--b--c--d--e--|';

    const timeoutValue = new Date(Date.now() + (expected.length + 2) * 10);

    const result = e1.pipe(timeoutWith(timeoutValue, e2, rxTestScheduler));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not timeout if source raises error within specified Date', () => {
    const e1 = hot('---a---#');
    const e1subs = '^      !';
    const e2 = cold('--x--|');
    const e2subs: string[] = [];
    const expected = '---a---#';

    const result = e1.pipe(
      timeoutWith(new Date(Date.now() + 100), e2, rxTestScheduler)
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it(
    'should timeout specified Date after specified Date then never completes ' +
      'if other source does not complete',
    () => {
      const e1 = hot('---a---b---c---d---e---|');
      const e1subs = '^         !             ';
      const e2 = cold('-');
      const e2subs = '          ^             ';
      const expected = '---a---b---             ';

      const result = e1.pipe(
        timeoutWith(new Date(rxTestScheduler.now() + 100), e2, rxTestScheduler)
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should unsubscribe from the scheduled timeout action when timeout is unsubscribed early', () => {
    const e1 = hot('---a---b-----c----|');
    const e1subs = '^          !       ';
    const e2 = cold('-x---y| ');
    const e2subs = '           ^  !    ';
    const expected = '---a---b----x--    ';
    const unsub = '              !    ';

    const result = e1
      .lift({
        call: (timeoutSubscriber, source) => {
          const {action} = <any>timeoutSubscriber; // get a ref to the action here
          timeoutSubscriber.add(() => {
            // because it'll be null by the
            if (!action.closed) {
              // time we get into this function.
              throw new Error(
                "TimeoutSubscriber scheduled action wasn't canceled"
              );
            }
          });
          return source.subscribe(timeoutSubscriber);
        }
      })
      .pipe(timeoutWith(40, e2, rxTestScheduler));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
});

/** @test {time} */
describe('time', () => {
  asDiagram('time')(
    'should record the time stamp per each source elements',
    () => {
      const e1 = hot('-b-c-----d--e--|');
      const e1subs = '^              !';
      const expected = '-w-x-----y--z--|';
      const expectedValue = {w: 10, x: 30, y: 90, z: 120};

      const result = e1.pipe(
        time(rxTestScheduler),
        map(x => x.time)
      );

      expectSource(result).toBe(expected, expectedValue);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should record stamp if source emit elements', () => {
    const e1 = hot('--a--^b--c----d---e--|');
    const e1subs = '^               !';
    const expected = '-w--x----y---z--|';

    const expectedValue = {
      w: {value: 'b', time: 10},
      x: {value: 'c', time: 40},
      y: {value: 'd', time: 90},
      z: {value: 'e', time: 130}
    };

    expectSource(e1.pipe(time(rxTestScheduler))).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should completes without record stamp if source does not emits', () => {
    const e1 = hot('---------|');
    const e1subs = '^        !';
    const expected = '---------|';

    expectSource(e1.pipe(time(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete immediately if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(time(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should record stamp then does not completes if source emits but not completes', () => {
    const e1 = hot('-a--b--');
    const e1subs = '^      ';
    const expected = '-y--z--';

    const expectedValue = {
      y: {value: 'a', time: 10},
      z: {value: 'b', time: 40}
    };

    expectSource(e1.pipe(time(rxTestScheduler))).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('-a--b-----c---d---|');
    const unsub = '       !           ';
    const e1subs = '^      !           ';
    const expected = '-y--z---           ';

    const expectedValue = {
      y: {value: 'a', time: 10},
      z: {value: 'b', time: 40}
    };

    const result = e1.pipe(time(rxTestScheduler));

    expectSource(result, unsub).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('-a--b-----c---d---|');
    const e1subs = '^      !           ';
    const expected = '-y--z---           ';
    const unsub = '       !           ';

    const expectedValue = {
      y: {value: 'a', time: 10},
      z: {value: 'b', time: 40}
    };

    const result = e1.pipe(
      mergeMap(x => of(x)),
      time(rxTestScheduler),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(time(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('raise error if source raises error', () => {
    const e1 = hot('---#');
    const e1subs = '^  !';
    const expected = '---#';

    expectSource(e1.pipe(time(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should record stamp then raise error if source raises error after emit', () => {
    const e1 = hot('-a--b--#');
    const e1subs = '^      !';
    const expected = '-y--z--#';

    const expectedValue = {
      y: {value: 'a', time: 10},
      z: {value: 'b', time: 40}
    };

    expectSource(e1.pipe(time(rxTestScheduler))).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source immediately throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(time(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

/** @test {toArray} */
describe('toArray', () => {
  asDiagram('toArray')(
    'should reduce the values of an observable into an array',
    () => {
      const e1 = hot('---a--b--|');
      const e1subs = '^        !';
      const expected = '---------(w|)';

      expectSource(e1.pipe(toArray())).toBe(expected, {w: ['a', 'b']});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should be never when source is never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(toArray())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should be never when source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(w|)';

    expectSource(e1.pipe(toArray())).toBe(expected, {w: []});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it("should be never when source doesn't complete", () => {
    const e1 = hot('--x--^--y--');
    const e1subs = '^     ';
    const expected = '------';

    expectSource(e1.pipe(toArray())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should reduce observable without values into an array of length zero', () => {
    const e1 = hot('-x-^---|');
    const e1subs = '^   !';
    const expected = '----(w|)';

    expectSource(e1.pipe(toArray())).toBe(expected, {w: []});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should reduce the a single value of an observable into an array', () => {
    const e1 = hot('-x-^--y--|');
    const e1subs = '^     !';
    const expected = '------(w|)';

    expectSource(e1.pipe(toArray())).toBe(expected, {w: ['y']});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow multiple subscriptions', () => {
    const e1 = hot('-x-^--y--|');
    const e1subs = '^     !';
    const expected = '------(w|)';

    const result = e1.pipe(toArray());
    expectSource(result).toBe(expected, {w: ['y']});
    expectSource(result).toBe(expected, {w: ['y']});
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--b----c-----d----e---|');
    const unsub = '        !                 ';
    const e1subs = '^       !                 ';
    const expected = '---------                 ';

    expectSource(e1.pipe(toArray()), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b----c-----d----e---|');
    const e1subs = '^       !                 ';
    const expected = '---------                 ';
    const unsub = '        !                 ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      toArray(),
      mergeMap((x: Array<string>) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with error', () => {
    const e1 = hot('-x-^--y--z--#', {x: 1, y: 2, z: 3}, 'too bad');
    const e1subs = '^        !';
    const expected = '---------#';

    expectSource(e1.pipe(toArray())).toBe(expected, null, 'too bad');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(toArray())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  type('should infer the element type', () => {
    const typeValue = {
      val: 3
    };

    of(typeValue)
      .pipe(toArray())
      .subscribe(x => {
        x[0].val.toString();
      });
  });
});

/** @test {toPromise} */
describe('toPromise', () => {
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

/** @test {withLatestFrom} */
describe('withLatestFrom', () => {
  asDiagram('withLatestFrom')(
    'should combine events from cold observables',
    () => {
      const e1 = cold('-a--b-----c-d-e-|');
      const e2 = cold('--1--2-3-4---|   ');
      const expected = '----B-----C-D-E-|';

      const result = e1.pipe(
        withLatestFrom(e2, (a: string, b: string) => String(a) + String(b))
      );

      expectSource(result).toBe(expected, {
        B: 'b1',
        C: 'c4',
        D: 'd4',
        E: 'e4'
      });
    }
  );

  it('should merge the value with the latest values from the other observables into arrays', () => {
    const e1 = hot('--a--^---b---c---d-|');
    const e1subs = '^             !';
    const e2 = hot('--e--^-f---g---h------|');
    const e2subs = '^             !';
    const e3 = hot('--i--^-j---k---l------|');
    const e3subs = '^             !';
    const expected = '----x---y---z-|';
    const values = {
      x: ['b', 'f', 'j'],
      y: ['c', 'g', 'k'],
      z: ['d', 'h', 'l']
    };

    const result = e1.pipe(withLatestFrom(e2, e3));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it(
    'should merge the value with the latest values from the other observables into ' +
      'arrays and a project argument',
    () => {
      const e1 = hot('--a--^---b---c---d-|');
      const e1subs = '^             !';
      const e2 = hot('--e--^-f---g---h------|');
      const e2subs = '^             !';
      const e3 = hot('--i--^-j---k---l------|');
      const e3subs = '^             !';
      const expected = '----x---y---z-|';
      const values = {
        x: 'bfj',
        y: 'cgk',
        z: 'dhl'
      };
      const project = function (a: string, b: string, c: string) {
        return a + b + c;
      };

      const result = e1.pipe(withLatestFrom(e2, e3, project));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    }
  );

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--^---b---c---d-|');
    const e1subs = '^          !   ';
    const e2 = hot('--e--^-f---g---h------|');
    const e2subs = '^          !   ';
    const e3 = hot('--i--^-j---k---l------|');
    const e3subs = '^          !   ';
    const expected = '----x---y---   ';
    const unsub = '           !   ';
    const values = {
      x: 'bfj',
      y: 'cgk',
      z: 'dhl'
    };
    const project = function (a: string, b: string, c: string) {
      return a + b + c;
    };

    const result = e1.pipe(withLatestFrom(e2, e3, project));

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--^---b---c---d-|');
    const e1subs = '^          !   ';
    const e2 = hot('--e--^-f---g---h------|');
    const e2subs = '^          !   ';
    const e3 = hot('--i--^-j---k---l------|');
    const e3subs = '^          !   ';
    const expected = '----x---y---   ';
    const unsub = '           !   ';
    const values = {
      x: 'bfj',
      y: 'cgk',
      z: 'dhl'
    };
    const project = function (a: string, b: string, c: string) {
      return a + b + c;
    };

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      withLatestFrom(e2, e3, project),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should handle empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = hot('--e--^-f---g---h----|');
    const e2subs = '(^!)';
    const e3 = hot('--i--^-j---k---l----|');
    const e3subs = '(^!)';
    const expected = '|'; // empty

    const result = e1.pipe(withLatestFrom(e2, e3));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should handle never', () => {
    const e1 = cold('-');
    const e1subs = '^               ';
    const e2 = hot('--e--^-f---g---h----|');
    const e2subs = '^              !';
    const e3 = hot('--i--^-j---k---l----|');
    const e3subs = '^              !';
    const expected = '--------------------'; // never

    const result = e1.pipe(withLatestFrom(e2, e3));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should handle throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const e2 = hot('--e--^-f---g---h----|');
    const e2subs = '(^!)';
    const e3 = hot('--i--^-j---k---l----|');
    const e3subs = '(^!)';
    const expected = '#'; // throw

    const result = e1.pipe(withLatestFrom(e2, e3));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should handle error', () => {
    const e1 = hot('--a--^---b---#', undefined, new Error('boo-hoo'));
    const e1subs = '^       !';
    const e2 = hot('--e--^-f---g---h----|');
    const e2subs = '^       !';
    const e3 = hot('--i--^-j---k---l----|');
    const e3subs = '^       !';
    const expected = '----x---#'; // throw
    const values = {
      x: ['b', 'f', 'j']
    };

    const result = e1.pipe(withLatestFrom(e2, e3));

    expectSource(result).toBe(expected, values, new Error('boo-hoo'));
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should handle error with project argument', () => {
    const e1 = hot('--a--^---b---#', undefined, new Error('boo-hoo'));
    const e1subs = '^       !';
    const e2 = hot('--e--^-f---g---h----|');
    const e2subs = '^       !';
    const e3 = hot('--i--^-j---k---l----|');
    const e3subs = '^       !';
    const expected = '----x---#'; // throw
    const values = {
      x: 'bfj'
    };
    const project = function (a: string, b: string, c: string) {
      return a + b + c;
    };

    const result = e1.pipe(withLatestFrom(e2, e3, project));

    expectSource(result).toBe(expected, values, new Error('boo-hoo'));
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should handle merging with empty', () => {
    const e1 = hot('--a--^---b---c---d-|   ');
    const e1subs = '^             !   ';
    const e2 = cold('|');
    const e2subs = '(^!)';
    const e3 = hot('--i--^-j---k---l------|');
    const e3subs = '^             !   ';
    const expected = '--------------|   ';

    const result = e1.pipe(withLatestFrom(e2, e3));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should handle merging with never', () => {
    const e1 = hot('--a--^---b---c---d-|   ');
    const e1subs = '^             !   ';
    const e2 = cold('-');
    const e2subs = '^             !   ';
    const e3 = hot('--i--^-j---k---l------|');
    const e3subs = '^             !   ';
    const expected = '--------------|   ';

    const result = e1.pipe(withLatestFrom(e2, e3));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should handle promises', (done: MochaDone) => {
    of(1)
      .pipe(delay(1), withLatestFrom(Promise.resolve(2), Promise.resolve(3)))
      .subscribe(
        (x: any) => {
          expect(x).to.deep.equal([1, 2, 3]);
        },
        null,
        done
      );
  });

  it('should handle arrays', () => {
    of(1)
      .pipe(delay(1), withLatestFrom([2, 3, 4], [4, 5, 6]))
      .subscribe((x: any) => {
        expect(x).to.deep.equal([1, 4, 6]);
      });
  });

  it('should handle lowercase-o observables', () => {
    of(1)
      .pipe(delay(1), withLatestFrom(lowerCaseO(2, 3, 4), lowerCaseO(4, 5, 6)))
      .subscribe((x: any) => {
        expect(x).to.deep.equal([1, 4, 6]);
      });
  });
});
