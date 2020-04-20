describe('finalize', () => {
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(finalize(() => {})); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(finalize()); // $ExpectError
    const p = of(1, 2, 3).pipe(finalize(value => {})); // $ExpectError
  });

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

// function shortcuts
const addDrama = function (x: number | string) {
  return x + '!';
};
const identity = function <T>(x: T) {
  return x;
};

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
  it('should infer correctly', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext()); // $ExpectType Observable<string>
  });

  it('should accept one input', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext(of(1))); // $ExpectType Observable<string | number>
    const p = of('apple', 'banana', 'peach').pipe(onErrorResumeNext(of('5'))); // $ExpectType Observable<string>
  });

  it('should accept promises', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(Promise.resolve(5))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept iterables', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext('foo')); // $ExpectType Observable<string>
  });

  it('should accept arrays', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext([5])); // $ExpectType Observable<string | number>
  });

  it('should accept two inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept three inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept four inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'), of('4'))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept five inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'), of('4'), of(5))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept six inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'), of('4'), of(5), of('6'))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept seven and more inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'), of('4'), of(5), of('6'), of(7))
    ); // $ExpectType Observable<unknown>
    const p = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext<string, string | number>(
        of(1),
        of(2),
        of('3'),
        of('4'),
        of(5),
        of('6'),
        of(7)
      )
    ); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext(5)); // $ExpectError
  });

  it('should enforce source types', () => {
    const p = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext<number, number>(of(5))
    ); // $ExpectError
  });

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

describe('race', () => {
  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(race()); // $ExpectType Observable<string>
  });

  it('should allow observables', () => {
    const o = of('a', 'b', 'c').pipe(race(of('x', 'y', 'z'))); // $ExpectType Observable<string>
    const p = of('a', 'b', 'c').pipe(
      race(of('x', 'y', 'z'), of('t', 'i', 'm'))
    ); // $ExpectType Observable<string>
  });

  it('should allow an array of observables', () => {
    const o = of('a', 'b', 'c').pipe(race([of('x', 'y', 'z')])); // $ExpectType Observable<string>
    const p = of('a', 'b', 'c').pipe(
      race([of('x', 'y', 'z'), of('t', 'i', 'm')])
    ); // $ExpectType Observable<string>
  });

  it('should be possible to provide a return type', () => {
    const o = of('a', 'b', 'c').pipe(
      race<string, number>([of(1, 2, 3)])
    ); // $ExpectType Observable<number>
    const p = of('a', 'b', 'c').pipe(
      race<string, number>([of(1, 2, 3), of('t', 'i', 'm')])
    ); // $ExpectType Observable<number>
    const q = of('a', 'b', 'c').pipe(
      race<string, number>(of(1, 2, 3), [of(1, 2, 3)])
    ); // $ExpectType Observable<number>
    const r = of('a', 'b', 'c').pipe(
      race<string, number>([of(1, 2, 3)], of('t', 'i', 'm'))
    ); // $ExpectType Observable<number>
  });

  it('should be possible to use nested arrays', () => {
    const o = of('a', 'b', 'c').pipe(race([of('x', 'y', 'z')])); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(race('aa')); // $ExpectError
  });

  it('should enforce argument types when not provided ', () => {
    const o = of('a', 'b', 'c').pipe(race(of(1, 2, 3))); // $ExpectError
    const p = of('a', 'b', 'c').pipe(race([of(1, 2, 3)])); // $ExpectError
  });

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
  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(repeat()); // $ExpectType Observable<string>
  });

  it('should accept a count parameter', () => {
    const o = of('a', 'b', 'c').pipe(repeat(47)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(repeat('aa')); // $ExpectError
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
  it('should enforce compareTo Observable', () => {
    const a = of(1, 2, 3).pipe(sequenceEqual()); // $ExpectError
  });

  it('should infer correctly give compareTo Observable', () => {
    const a = of(1, 2, 3).pipe(sequenceEqual(of(1))); // $ExpectType Observable<boolean>
  });

  it('should enforce compareTo to be the same type of Observable', () => {
    const a = of(1, 2, 3).pipe(sequenceEqual(of('a'))); // $ExpectError
  });

  it('should infer correcly given comparor parameter', () => {
    const a = of(1, 2, 3).pipe(
      sequenceEqual(of(1), (val1, val2) => val1 === val2)
    ); // $ExpectType Observable<boolean>
  });

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

describe('throwIfEmpty', () => {
  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(throwIfEmpty()); // $ExpectType Observable<string>
  });

  it('should support an errorFactory', () => {
    const o = of('a', 'b', 'c').pipe(throwIfEmpty(() => 47)); // $ExpectType Observable<string>
  });

  it('should enforce errorFactory type', () => {
    const o = of('a', 'b', 'c').pipe(throwIfEmpty('nope')); // $ExpectError
    const p = of('a', 'b', 'c').pipe(throwIfEmpty(x => 47)); // $ExpectError
  });

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
  describe('without project parameter', () => {
    it('should infer correctly with 1 param', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const res = a.pipe(withLatestFrom(b)); // $ExpectType Observable<[number, string]>
    });

    it('should infer correctly with 2 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const res = a.pipe(withLatestFrom(b, c)); // $ExpectType Observable<[number, string, string]>
    });

    it('should infer correctly with 3 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const res = a.pipe(withLatestFrom(b, c, d)); // $ExpectType Observable<[number, string, string, string]>
    });

    it('should infer correctly with 4 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const res = a.pipe(withLatestFrom(b, c, d, e)); // $ExpectType Observable<[number, string, string, string, string]>
    });

    it('should infer correctly with 5 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const f = of('m', 'n', 'o');
      const res = a.pipe(withLatestFrom(b, c, d, e, f)); // $ExpectType Observable<[number, string, string, string, string, string]>
    });

    it('should only accept maximum params of 5', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const f = of('m', 'n', 'o');
      const g = of('p', 'q', 'r');
      const res = a.pipe(withLatestFrom(b, c, d, e, f, g)); // $ExpectType Observable<unknown>
    });
  });

  describe('with project parameter', () => {
    it('should infer correctly with project param', () => {
      const a = of(1, 2, 3);
      const res = a.pipe(withLatestFrom(v1 => 'b')); // $ExpectType Observable<string>
    });

    it('should infer correctly with 1 param', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const res = a.pipe(withLatestFrom(b, (a, b) => b)); // $ExpectType Observable<string>
    });

    it('should infer correctly with 2 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const res = a.pipe(withLatestFrom(b, c, (a, b, c) => b + c)); // $ExpectType Observable<string>
    });

    it('should infer correctly with 3 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const ref = a.pipe(withLatestFrom(b, c, d, (a, b, c, d) => b + c)); // $ExpectType Observable<string>
    });

    it('should infer correctly with 4 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const res = a.pipe(withLatestFrom(b, c, d, e, (a, b, c, d, e) => b + c)); // $ExpectType Observable<string>
    });

    it('should infer correctly with 5 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const f = of('m', 'n', 'o');
      const res = a.pipe(
        withLatestFrom(b, c, d, e, f, (a, b, c, d, e, f) => b + c)
      ); // $ExpectType Observable<string>
    });
  });

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
