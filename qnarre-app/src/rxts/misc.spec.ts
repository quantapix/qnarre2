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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(delay(100)); // $ExpectType Observable<number>
  });

  it('should support date parameter', () => {
    const o = of(1, 2, 3).pipe(delay(new Date(2018, 09, 18))); // $ExpectType Observable<number>
  });

  it('should support a scheduler', () => {
    const o = of(1, 2, 3).pipe(delay(100, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(delay()); // $ExpectError
    const p = of(1, 2, 3).pipe(delay('foo')); // $ExpectError
    const q = of(1, 2, 3).pipe(delay(47, 'foo')); // $ExpectError
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
            expect(counts).toEqual([1, 1]);
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

describe('delayWhen', () => {
  asDiagram('delayWhen(durationSelector)')('should delay by duration selector', () => {
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
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(delayWhen(() => of('a', 'b', 'c'))); // $ExpectType Observable<number>
    const p = of(1, 2, 3).pipe(
      delayWhen((value: number, index: number) => of('a', 'b', 'c'))
    ); // $ExpectType Observable<number>
  });

  it('should support an empty notifier', () => {
    const o = of(1, 2, 3).pipe(delayWhen(() => NEVER)); // $ExpectType Observable<number>
  });

  it('should support a subscriptiondelayWhen parameter', () => {
    const o = of(1, 2, 3).pipe(delayWhen(() => of('a', 'b', 'c'), of(new Date()))); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(delayWhen()); // $ExpectError
  });

  it('should enforce types of delayWhenDurationSelector', () => {
    const o = of(1, 2, 3).pipe(delayWhen(of('a', 'b', 'c'))); // $ExpectError
    const p = of(1, 2, 3).pipe(delayWhen((value: string, index) => of('a', 'b', 'c'))); // $ExpectError
    const q = of(1, 2, 3).pipe(delayWhen((value, index: string) => of('a', 'b', 'c'))); // $ExpectError
  });

  it('should enforce types of subscriptiondelayWhen', () => {
    const o = of(1, 2, 3).pipe(delayWhen(() => of('a', 'b', 'c'), 'a')); // $ExpectError
  });

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
          expect(indices).toEqual([0, 1, 2]);
        })
      )
    ).toBe(expected);
  });
});

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
          return Note.createDone();
        } else {
          return Note.createNext(x.replace('{', '').replace('}', ''));
        }
      }),
      dematerialize()
    );

    expectSource(result).toBe(expected);
  });

  it('should infer correctly', () => {
    const o = of(Note.createNext('foo')).pipe(dematerialize()); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of(Note.createNext('foo')).pipe(dematerialize(() => {})); // $ExpectError
  });

  it('should enforce Note source', () => {
    const o = of('foo').pipe(dematerialize()); // $ExpectError
  });

  it('should dematerialize a happy stream', () => {
    const values = {
      a: Note.createNext('w'),
      b: Note.createNext('x'),
      c: Note.createNext('y'),
      d: Note.createDone()
    };

    const e1 = hot('--a--b--c--d--|', values);
    const e1subs = '^          !';
    const expected = '--w--x--y--|';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize a sad stream', () => {
    const values = {
      a: Note.createNext('w'),
      b: Note.createNext('x'),
      c: Note.createNext('y'),
      d: Note.createFail('error')
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
    const e1 = hot('(x|)', {x: Note.createFail(error)});
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(dematerialize())).toBe(expected, null, error);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const values = {
      a: Note.createNext('w'),
      b: Note.createNext('x')
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
      a: Note.createNext('w'),
      b: Note.createNext('x')
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
    const e1 = hot('----(a|)', {a: Note.createDone()});
    const e1subs = '^   !';
    const expected = '----|';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should dematerialize and completes when stream emits complete notification', () => {
    const e1 = hot('----a--|', {a: Note.createDone()});
    const e1subs = '^   !';
    const expected = '----|';

    expectSource(e1.pipe(dematerialize())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

describe('materialize', () => {
  asDiagram('materialize')('should materialize an Observable', () => {
    const e1 = hot('--x--y--z--|');
    const expected = '--a--b--c--(d|)';
    const values = {a: '{x}', b: '{y}', c: '{z}', d: '|'};

    const result = e1.pipe(
      materialize(),
      map((x: Note<any>) => {
        if (x.kind === 'C') {
          return '|';
        } else {
          return '{' + x.value + '}';
        }
      })
    );

    expectSource(result).toBe(expected, values);
  });

  it('should infer correctly', () => {
    const o = of('foo').pipe(materialize()); // $ExpectType Observable<Note<string>>
  });

  it('should enforce types', () => {
    const o = of('foo').pipe(materialize(() => {})); // $ExpectError
  });

  it('should materialize a happy stream', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';
    const expected = '--w--x--y--(z|)';

    const expectedValue = {
      w: Note.createNext('a'),
      x: Note.createNext('b'),
      y: Note.createNext('c'),
      z: Note.createDone()
    };

    expectSource(e1.pipe(materialize())).toBe(expected, expectedValue);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should materialize a sad stream', () => {
    const e1 = hot('--a--b--c--#');
    const e1subs = '^          !';
    const expected = '--w--x--y--(z|)';

    const expectedValue = {
      w: Note.createNext('a'),
      x: Note.createNext('b'),
      y: Note.createNext('c'),
      z: Note.createFail('error')
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
      w: Note.createNext('a'),
      x: Note.createNext('b')
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
      w: Note.createNext('a'),
      x: Note.createNext('b')
    };

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      materialize(),
      mergeMap((x: Note<any>) => of(x))
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
      x: Note.createDone()
    });
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should materialize empty stream', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(x|)';

    expectSource(e1.pipe(materialize())).toBe(expected, {
      x: Note.createDone()
    });
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should materialize stream throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '(x|)';

    expectSource(e1.pipe(materialize())).toBe(expected, {
      x: Note.createFail('error')
    });
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

describe('observeOn', () => {
  asDiagram('observeOn(scheduler)')('should observe on specified scheduler', () => {
    const e1 = hot('--a--b--|');
    const expected = '--a--b--|';
    const sub = '^       !';

    expectSource(e1.pipe(observeOn(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should infer correctly', () => {
    const o = of('apple', 'banana', 'peach').pipe(observeOn(asyncScheduler)); // $ExpectType Observable<string>
  });

  it('should support a delay', () => {
    const o = of('apple', 'banana', 'peach').pipe(observeOn(asyncScheduler, 47)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const p = of('apple', 'banana', 'peach').pipe(observeOn()); // $ExpectError
  });

  it('should enforce scheduler type', () => {
    const p = of('apple', 'banana', 'peach').pipe(observeOn('fruit')); // $ExpectError
  });

  it('should enforce delay type', () => {
    const p = of('apple', 'banana', 'peach').pipe(observeOn(asyncScheduler, '47')); // $ExpectError
  });

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
          expect(results).toEqual([1, 2, 3]);
          done();
        }
      );
  });
});

describe('subscribeOn', () => {
  asDiagram('subscribeOn(scheduler)')('should subscribe on specified scheduler', () => {
    const e1 = hot('--a--b--|');
    const expected = '--a--b--|';
    const sub = '^       !';

    expectSource(e1.pipe(subscribeOn(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn(asyncScheduler)); // $ExpectType Observable<string>
  });

  it('should support a delay ', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn(asyncScheduler, 7)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn()); // $ExpectError
  });

  it('should enforce scheduler type', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn('nope')); // $ExpectError
  });

  it('should enforce delay type', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn(asyncScheduler, 'nope')); // $ExpectError
  });

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

describe('tap', () => {
  asDiagram('tap(x => console.log(x))')(
    'should mirror multiple values and complete',
    () => {
      const e1 = cold('--1--2--3--|');
      const e1subs = '^          !';
      const expected = '--1--2--3--|';

      const result = e1.pipe(tap(() => {}));
      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should infer correctly', () => {
    const a = of(1, 2, 3).pipe(tap()); // $ExpectType Observable<number>
  });

  it('should accept partial observer', () => {
    const a = of(1, 2, 3).pipe(tap({next: (x: number) => {}})); // $ExpectType Observable<number>
    const b = of(1, 2, 3).pipe(tap({error: (x: any) => {}})); // $ExpectType Observable<number>
    const c = of(1, 2, 3).pipe(tap({complete: () => {}})); // $ExpectType Observable<number>
  });

  it('should not accept empty observer', () => {
    const a = of(1, 2, 3).pipe(tap({})); // $ExpectError
  });

  it('should enforce type for next observer function', () => {
    const a = of(1, 2, 3).pipe(tap({next: (x: string) => {}})); // $ExpectError
  });

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
            expect(results).toEqual(expected);
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
        expect(results).toEqual(expected);
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

    const result = e1.pipe(tap(() => {}));
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
      tap(() => {}),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mirror multiple values and complete', () => {
    const e1 = cold('--1--2--3--|');
    const e1subs = '^          !';
    const expected = '--1--2--3--|';

    const result = e1.pipe(tap(() => {}));
    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mirror multiple values and terminate with error', () => {
    const e1 = cold('--1--2--3--#');
    const e1subs = '^          !';
    const expected = '--1--2--3--#';

    const result = e1.pipe(tap(() => {}));
    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

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

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(timeInterval()); // $ExpectType Observable<TimeInterval<string>>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(timeInterval(asyncScheduler)); // $ExpectType Observable<TimeInterval<string>>
  });

  it('should enforce scheduler type', () => {
    const o = of('a', 'b', 'c').pipe(timeInterval('nope')); // $ExpectError
  });

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

describe('timeout', () => {
  const defaultTimeoutError = new TimeoutError();

  asDiagram('timeout(50)')('should timeout after a specified timeout period', () => {
    const e1 = cold('-------a--b--|');
    const e1subs = '^    !        ';
    const expected = '-----#        ';

    const result = e1.pipe(timeout(50, rxTestScheduler));

    expectSource(result).toBe(expected, null, defaultTimeoutError);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(timeout(10)); // $ExpectType Observable<string>
  });

  it('should support a date', () => {
    const o = of('a', 'b', 'c').pipe(timeout(new Date())); // $ExpectType Observable<string>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(timeout(10, asyncScheduler)); // $ExpectType Observable<string>
    const p = of('a', 'b', 'c').pipe(timeout(new Date(), asyncScheduler)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(timeout()); // $ExpectError
  });

  it('should enforce types of due', () => {
    const o = of('a', 'b', 'c').pipe(timeout('foo')); // $ExpectError
  });

  it('should enforce types of scheduler', () => {
    const o = of('a', 'b', 'c').pipe(timeout(5, 'foo')); // $ExpectError
  });

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

    const timeoutValue = new Date(rxTestScheduler.now() + (expected.length + 2) * 10);

    expectSource(e1.pipe(timeout(timeoutValue, rxTestScheduler))).toBe(expected);
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
              throw new Error("TimeoutSubscriber scheduled action wasn't canceled");
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
  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(10, of(1, 2, 3))); // $ExpectType Observable<string | number>
    const p = of('a', 'b', 'c').pipe(timeoutWith(10, [1, 2, 3])); // $ExpectType Observable<string | number>
    const q = of('a', 'b', 'c').pipe(timeoutWith(10, Promise.resolve(5))); // $ExpectType Observable<string | number>
    const r = of('a', 'b', 'c').pipe(timeoutWith(10, new Set([1, 2, 3]))); // $ExpectType Observable<string | number>
    const s = of('a', 'b', 'c').pipe(timeoutWith(10, 'foo')); // $ExpectType Observable<string>
  });

  it('should infer correctly while having the same types', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(10, of('x', 'y', 'z'))); // $ExpectType Observable<string>
  });

  it('should support a date', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(new Date(), of(1, 2, 3))); // $ExpectType Observable<string | number>
    const p = of('a', 'b', 'c').pipe(timeoutWith(new Date(), [1, 2, 3])); // $ExpectType Observable<string | number>
    const q = of('a', 'b', 'c').pipe(timeoutWith(new Date(), Promise.resolve(5))); // $ExpectType Observable<string | number>
    const r = of('a', 'b', 'c').pipe(timeoutWith(new Date(), new Set([1, 2, 3]))); // $ExpectType Observable<string | number>
    const s = of('a', 'b', 'c').pipe(timeoutWith(new Date(), 'foo')); // $ExpectType Observable<string>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(10, of(1, 2, 3), asyncScheduler)); // $ExpectType Observable<string | number>
    const p = of('a', 'b', 'c').pipe(
      timeoutWith(new Date(), of(1, 2, 3), asyncScheduler)
    ); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith()); // $ExpectError
  });

  it('should enforce types of due', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith('foo')); // $ExpectError
  });

  it('should enforce types of withObservable', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(10, 10)); // $ExpectError
  });

  it('should enforce types of scheduler', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(5, of(1, 2, 3), 'foo')); // $ExpectError
  });

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

    const result = e1.pipe(timeoutWith(new Date(Date.now() + 100), e2, rxTestScheduler));

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
              throw new Error("TimeoutSubscriber scheduled action wasn't canceled");
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

describe('time', () => {
  asDiagram('time')('should record the time stamp per each source elements', () => {
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
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(time()); // $ExpectType Observable<Stamp<string>>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(time(asyncScheduler)); // $ExpectType Observable<Stamp<string>>
  });

  it('should enforce scheduler type', () => {
    const o = of('a', 'b', 'c').pipe(time('nope')); // $ExpectError
  });

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

describe('toArray', () => {
  asDiagram('toArray')('should reduce the values of an observable into an array', () => {
    const e1 = hot('---a--b--|');
    const e1subs = '^        !';
    const expected = '---------(w|)';

    expectSource(e1.pipe(toArray())).toBe(expected, {w: ['a', 'b']});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(toArray()); // $ExpectType Observable<number[]>
  });

  it('should enforce types', () => {
    const o = of(1).pipe(toArray('')); // $ExpectError
  });

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

describe('using', () => {
  it('should dispose of the resource when the subscription is disposed', done => {
    let disposed = false;
    const source = using(
      () => new Subscription(() => (disposed = true)),
      resource => range(0, 3)
    ).pipe(take(2));

    source.subscribe();

    if (disposed) {
      done();
    } else {
      done(new Error('disposed should be true but was false'));
    }
  });

  it('should accept factory returns promise resolves', (done: MochaDone) => {
    const expected = 42;

    let disposed = false;
    const e1 = using(
      () => new Subscription(() => (disposed = true)),
      resource =>
        new Promise((resolve: any) => {
          resolve(expected);
        })
    );

    e1.subscribe(
      x => {
        expect(x).to.equal(expected);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should accept factory returns promise rejects', (done: MochaDone) => {
    const expected = 42;

    let disposed = false;
    const e1 = using(
      () => new Subscription(() => (disposed = true)),
      resource =>
        new Promise((resolve: any, reject: any) => {
          reject(expected);
        })
    );

    e1.subscribe(
      x => {
        done(new Error('should not be called'));
      },
      x => {
        expect(x).to.equal(expected);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should raise error when resource factory throws', (done: MochaDone) => {
    const expectedError = 'expected';
    const error = 'error';

    const source = using(
      () => {
        throw expectedError;
      },
      resource => {
        throw error;
      }
    );

    source.subscribe(
      x => {
        done(new Error('should not be called'));
      },
      x => {
        expect(x).to.equal(expectedError);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should raise error when observable factory throws', (done: MochaDone) => {
    const error = 'error';
    let disposed = false;

    const source = using(
      () => new Subscription(() => (disposed = true)),
      resource => {
        throw error;
      }
    );

    source.subscribe(
      x => {
        done(new Error('should not be called'));
      },
      x => {
        expect(x).to.equal(error);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });
});
