import {hot, cold, expectSource, expectSubscriptions} from './testing';

declare function asDiagram(arg: string): Function;

describe('audit', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('audit')('should emit the last value in each time window', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('    -a-xy-----b--x--cxxx-|');
      const e1subs = '    ^--------------------!';
      const e2 = cold('    ----|                ');
      const e2subs = [
        '                 -^---!                ',
        '                 ----------^---!        ',
        '                 ----------------^---!  '
      ];
      const expected = '  -----y--------x-----x|';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(audit(() => of('foo'))); // $ExpectType Observable<number>
    const p = of(1, 2, 3).pipe(audit(() => NEVER)); // $ExpectType Observable<number>
  });

  it('should infer correctly with a Promise', () => {
    const o = of(1, 2, 3).pipe(
      audit(
        () => new Promise<string>(() => {})
      )
    ); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(audit()); // $ExpectError
    const p = of(1, 2, 3).pipe(audit((p: string) => of('foo'))); // $ExpectError
  });

  it('should delay the source if values are not emitted often enough', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -a--------b-----c----|');
      const e1subs = '  ^--------------------!';
      const e2 = cold('  ----|                ');
      const e2subs = [
        '               -^---!                ',
        '               ----------^---!       ',
        '               ----------------^---! '
      ];
      const expected = '-----a--------b-----c|';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should audit with duration Observable using next to close the duration', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('   -a-xy-----b--x--cxxx-|');
      const e1subs = '   ^--------------------!';
      const e2 = cold('   ----x-y-z            ');
      const e2subs = [
        '                -^---!                ',
        '                ----------^---!       ',
        '                ----------------^---! '
      ];
      const expected = ' -----y--------x-----x|';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should interrupt source and duration when result is unsubscribed early', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -a-x-y-z-xyz-x-y-z----b--x-x-|');
      const unsub = '   --------------!               ';
      const e1subs = '  ^-------------!               ';
      const e2 = cold('  -----x------------|          ');
      const e2subs = [
        '               -^----!                       ',
        '               -------^----!                 ',
        '               -------------^!               '
      ];
      const expected = '------y-----z--               ';

      const result = e1.pipe(audit(() => e2));

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -a-x-y-z-xyz-x-y-z----b--x-x-|');
      const e1subs = '  ^-------------!               ';
      const e2 = cold('  -----x------------|          ');
      const e2subs = [
        '               -^----!                       ',
        '               -------^----!                 ',
        '               -------------^!               '
      ];
      const expected = '------y-----z--               ';
      const unsub = '   --------------!               ';

      const result = e1.pipe(
        mergeMap((x: string) => of(x)),
        audit(() => e2),
        mergeMap((x: string) => of(x))
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle a busy producer emitting a regular repeating sequence', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^------------------------!';
      const e2 = cold(' -----|                    ');
      const e2subs = [
        '               ^----!                    ',
        '               ------^----!              ',
        '               ------------^----!        ',
        '               ------------------^----!  ',
        '               ------------------------^!'
      ];
      const expected = '-----f-----f-----f-----f-|';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should mirror source if durations are always empty', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^------------------------!';
      const e2 = cold(' |');
      const expected = 'abcdefabcdefabcdefabcdefa|';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should mirror source if durations are EMPTY', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('abcdefabcdefabcdefabcdefa|');
      const e1subs = '^------------------------!';
      const e2 = EMPTY;
      const expected = 'abcdefabcdefabcdefabcdefa|';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should emit no values if duration is a never', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ----abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^----------------------------!';
      const e2 = cold(' -');
      const e2subs = '  ----^------------------------!';
      const expected = '-----------------------------|';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should unsubscribe duration Observable when source raise error', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ----abcdefabcdefabcdefabcdefa#');
      const e1subs = '  ^----------------------------!';
      const e2 = cold(' -');
      const e2subs = '  ----^------------------------!';
      const expected = '-----------------------------#';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should mirror source if durations are synchronous observables', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^------------------------!';
      const e2 = of('one single value');
      const expected = 'abcdefabcdefabcdefabcdefa|';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should raise error as soon as just-throw duration is used', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ----abcdefabcdefabcdefabcdefa|');
      const e1subs = '  ^---!                         ';
      const e2 = cold(' #');
      const e2subs = '  ----(^!)                      ';
      const expected = '----(-#)                      ';

      const result = e1.pipe(audit(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should audit using durations of varying lengths', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  abcdefabcdabcdefghabca|');
      const e1subs = '  ^---------------------!';
      const e2 = [
        cold('          -----|                 '),
        cold('              ---|               '),
        cold('                  -------|       '),
        cold('                        --|      '),
        cold('                           ----| ')
      ];
      const e2subs = [
        '               ^----!                  ',
        '               ------^--!              ',
        '               ----------^------!      ',
        '               ------------------^-!   ',
        '               ---------------------^! '
      ];
      const expected = '-----f---d-------h--c-| ';

      let i = 0;
      const result = e1.pipe(audit(() => e2[i++]));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      for (let j = 0; j < e2.length; j++) {
        expectSubscriptions(e2[j].subscriptions).toBe(e2subs[j]);
      }
    });
  });

  it('should propagate error from duration Observable', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  abcdefabcdabcdefghabca|');
      const e1subs = '  ^----------------!     ';
      const e2 = [
        cold('          -----|                 '),
        cold('              ---|               '),
        cold('                  -------#       ')
      ];
      const e2subs = [
        '               ^----!                 ',
        '               ------^--!             ',
        '               ----------^------!     '
      ];
      const expected = '-----f---d-------#     ';

      let i = 0;
      const result = e1.pipe(audit(() => e2[i++]));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      for (let j = 0; j < e2.length; j++) {
        expectSubscriptions(e2[j].subscriptions).toBe(e2subs[j]);
      }
    });
  });

  it('should propagate error thrown from durationSelector function', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('abcdefabcdabcdefghabca|   ');
      const e1subs = '^---------!               ';
      const e2 = [
        cold('          -----|                    '),
        cold('              ---|                  '),
        cold('                  -------|          ')
      ];
      const e2subs = [
        '               ^----!                     ',
        '               ------^--!                   '
      ];
      const expected = '-----f---d#                ';

      let i = 0;
      const result = e1.pipe(
        audit(() => {
          if (i === 2) {
            throw 'error';
          }
          return e2[i++];
        })
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      for (let j = 0; j < e2subs.length; j++) {
        expectSubscriptions(e2[j].subscriptions).toBe(e2subs[j]);
      }
    });
  });

  it('should complete when source does not emit', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -----|');
      const subs = '    ^----!';
      const expected = '-----|';
      function durationSelector() {
        return cold('-----|');
      }

      expectSource(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should raise error when source does not emit and raises error', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -----#');
      const subs = '    ^----!';
      const expected = '-----#';
      function durationSelector() {
        return cold('   -----|');
      }

      expectSource(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle an empty source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const subs = '    (^!)';
      const expected = '|';
      function durationSelector() {
        return cold('   -----|');
      }

      expectSource(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle a never source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' -');
      const subs = '    ^';
      const expected = '-';
      function durationSelector() {
        return cold('   -----|');
      }

      expectSource(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle a throw source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' #');
      const subs = '    (^!)';
      const expected = '#';
      function durationSelector() {
        return cold('   -----|');
      }

      expectSource(e1.pipe(audit(durationSelector))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should audit by promise resolves', (done: MochaDone) => {
    const e1 = interval(10).pipe(take(5));
    const expected = [0, 1, 2, 3];

    e1.pipe(
      audit(() => {
        return new Promise((resolve: any) => {
          resolve(42);
        });
      })
    ).subscribe(
      (x: number) => {
        expect(x).to.equal(expected.shift());
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected.length).to.equal(0);
        done();
      }
    );
  });

  it('should raise error when promise rejects', (done: MochaDone) => {
    const e1 = interval(10).pipe(take(10));
    const expected = [0, 1, 2];
    const error = new Error('error');

    e1.pipe(
      audit((x: number) => {
        if (x === 3) {
          return new Promise((resolve: any, reject: any) => {
            reject(error);
          });
        } else {
          return new Promise((resolve: any) => {
            resolve(42);
          });
        }
      })
    ).subscribe(
      (x: number) => {
        expect(x).to.equal(expected.shift());
      },
      (err: any) => {
        expect(err).to.be.an('error', 'error');
        expect(expected.length).to.equal(0);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });
});

describe('auditTime', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('auditTime(5)')('should emit the last value in each time window', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -a-x-y----b---x-cx---|');
      const subs = '    ^--------------------!';
      const expected = '------y--------x-----|';

      const result = e1.pipe(auditTime(5, testScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });
  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(auditTime(47)); // $ExpectType Observable<string>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(auditTime(47, asyncScheduler)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(auditTime()); // $ExpectError
    const p = of('a', 'b', 'c').pipe(auditTime('47')); // $ExpectError
    const q = of('a', 'b', 'c').pipe(auditTime(47, 'foo')); // $ExpectError
  });

  it('should auditTime events by 5 time units', (done: MochaDone) => {
    of(1, 2, 3)
      .pipe(auditTime(5))
      .subscribe(
        (x: number) => {
          done(new Error('should not be called'));
        },
        null,
        () => {
          done();
        }
      );
  });

  it('should auditTime events multiple times', () => {
    const expected = ['1-2', '2-2'];
    concat(
      timer(0, 10, testScheduler).pipe(
        take(3),
        map((x: number) => '1-' + x)
      ),
      timer(80, 10, testScheduler).pipe(
        take(5),
        map((x: number) => '2-' + x)
      )
    )
      .pipe(auditTime(50, testScheduler))
      .subscribe((x: string) => {
        expect(x).to.equal(expected.shift());
      });

    testScheduler.flush();
  });

  it('should delay the source if values are not emitted often enough', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -a--------b-----c----|');
      const subs = '    ^--------------------!';
      const expected = '------a--------b-----|';

      expectSource(e1.pipe(auditTime(5, testScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle a busy producer emitting a regular repeating sequence', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  abcdefabcdefabcdefabcdefa|');
      const subs = '    ^------------------------!';
      const expected = '-----f-----f-----f-----f-|';

      expectSource(e1.pipe(auditTime(5, testScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should complete when source does not emit', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -----|');
      const subs = '    ^----!';
      const expected = '-----|';

      expectSource(e1.pipe(auditTime(5, testScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should raise error when source does not emit and raises error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -----#');
      const subs = '    ^----!';
      const expected = '-----#';

      expectSource(e1.pipe(auditTime(1, testScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle an empty source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const subs = '    (^!)';
      const expected = '|';

      expectSource(e1.pipe(auditTime(3, testScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle a never source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' -');
      const subs = '    ^';
      const expected = '-';

      expectSource(e1.pipe(auditTime(3, testScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle a throw source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' #');
      const subs = '    (^!)';
      const expected = '#';

      expectSource(e1.pipe(auditTime(3, testScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should not complete when source does not complete', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -a--(bc)-------d----------------');
      const unsub = '   -------------------------------!';
      const subs = '    ^------------------------------!';
      const expected = '------c-------------d-----------';

      expectSource(e1.pipe(auditTime(5, testScheduler)), unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -a--(bc)-------d----------------');
      const subs = '    ^------------------------------!';
      const expected = '------c-------------d-----------';
      const unsub = '   -------------------------------!';

      const result = e1.pipe(
        mergeMap((x: string) => of(x)),
        auditTime(5, testScheduler),
        mergeMap((x: string) => of(x))
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should auditTime values until source raises error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -a--(bc)-------d---------------#');
      const subs = '    ^------------------------------!';
      const expected = '------c-------------d----------#';

      expectSource(e1.pipe(auditTime(5, testScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });
});

describe('debounce', () => {
  function getTimerSelector(x: number) {
    return () => timer(x, rxTestScheduler);
  }

  asDiagram('debounce')('should debounce values by a specified cold Observable', () => {
    const e1 = hot('-a--bc--d---|');
    const e2 = cold('--|          ');
    const expected = '---a---c--d-|';

    const result = e1.pipe(debounce(() => e2));

    expectSource(result).toBe(expected);
  });
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(debounce(() => timer(47))); // $ExpectType Observable<number>
  });

  it('should infer correctly with a Promise', () => {
    const o = of(1, 2, 3).pipe(
      debounce(
        () => new Promise<boolean>(() => {})
      )
    ); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(debounce()); // $ExpectError
    const p = of(1, 2, 3).pipe(debounce(() => {})); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(debounceTime(47)); // $ExpectType Observable<number>
  });

  it('should support a scheduler', () => {
    const o = of(1, 2, 3).pipe(debounceTime(47, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(debounceTime()); // $ExpectError
    const p = of(1, 2, 3).pipe(debounceTime('foo')); // $ExpectError
    const q = of(1, 2, 3).pipe(debounceTime(47, 'foo')); // $ExpectError
  });

  it('should delay all element by selector observable', () => {
    const e1 = hot('--a--b--c--d---------|');
    const e1subs = '^                    !';
    const expected = '----a--b--c--d-------|';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should debounce by selector observable', () => {
    const e1 = hot('--a--bc--d----|');
    const e1subs = '^             !';
    const expected = '----a---c--d--|';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should support a scalar selector observable', () => {
    // If the selector returns a scalar observable, the debounce operator
    // should emit the value immediately.

    const e1 = hot('--a--bc--d----|');
    const e1subs = '^             !';
    const expected = '--a--bc--d----|';

    expectSource(e1.pipe(debounce(() => of(0)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete when source does not emit', () => {
    const e1 = hot('-----|');
    const e1subs = '^    !';
    const expected = '-----|';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete when source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error when source does not emit and raises error', () => {
    const e1 = hot('-----#');
    const e1subs = '^    !';
    const expected = '-----#';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error when source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--bc--d----|');
    const e1subs = '^      !       ';
    const expected = '----a---       ';
    const unsub = '       !       ';

    const result = e1.pipe(debounce(getTimerSelector(20)));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const e1 = hot('--a--bc--d----|');
    const e1subs = '^      !       ';
    const expected = '----a---       ';
    const unsub = '       !       ';

    const result = e1.pipe(
      mergeMap((x: any) => of(x)),
      debounce(getTimerSelector(20)),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should debounce and does not complete when source does not completes', () => {
    const e1 = hot('--a--bc--d---');
    const e1subs = '^            ';
    const expected = '----a---c--d-';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes when source does not completes', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes when source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should delay all element until source raises error', () => {
    const e1 = hot('--a--b--c--d---------#');
    const e1subs = '^                    !';
    const expected = '----a--b--c--d-------#';

    expectSource(e1.pipe(debounce(getTimerSelector(20)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should debounce all elements while source emits by selector observable', () => {
    const e1 = hot('---a---b---c---d---e|');
    const e1subs = '^                   !';
    const expected = '--------------------(e|)';

    expectSource(e1.pipe(debounce(getTimerSelector(40)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should debounce all element while source emits by selector observable until raises error', () => {
    const e1 = hot('--a--b--c--d-#');
    const e1subs = '^            !';
    const expected = '-------------#';

    expectSource(e1.pipe(debounce(getTimerSelector(50)))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should delay element by same selector observable emits multiple', () => {
    const e1 = hot('----a--b--c----d----e-------|');
    const e1subs = '^                           !';
    const expected = '------a--b--c----d----e-----|';
    const selector = cold('--x-y-');
    const selectorSubs = [
      '    ^ !                      ',
      '       ^ !                   ',
      '          ^ !                ',
      '               ^ !           ',
      '                    ^ !      '
    ];

    expectSource(e1.pipe(debounce(() => selector))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(selector.subscriptions).toBe(selectorSubs);
  });

  it('should debounce by selector observable emits multiple', () => {
    const e1 = hot('----a--b--c----d----e-------|');
    const e1subs = '^                           !';
    const expected = '------a-----c---------e-----|';
    const selector = [
      cold('--x-y-'),
      cold('----x-y-'),
      cold('--x-y-'),
      cold('------x-y-'),
      cold('--x-y-')
    ];
    const selectorSubs = [
      '    ^ !                      ',
      '       ^  !                  ',
      '          ^ !                ',
      '               ^    !        ',
      '                    ^ !      '
    ];

    expectSource(e1.pipe(debounce(() => selector.shift()!))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    for (let i = 0; i < selectorSubs.length; i++) {
      expectSubscriptions(selector[i].subscriptions).toBe(selectorSubs[i]);
    }
  });

  it('should debounce by selector observable until source completes', () => {
    const e1 = hot('----a--b--c----d----e|');
    const e1subs = '^                    !';
    const expected = '------a-----c--------(e|)';
    const selector = [
      cold('--x-y-'),
      cold('----x-y-'),
      cold('--x-y-'),
      cold('------x-y-'),
      cold('--x-y-')
    ];
    const selectorSubs = [
      '    ^ !               ',
      '       ^  !           ',
      '          ^ !         ',
      '               ^    ! ',
      '                    ^!'
    ];

    expectSource(e1.pipe(debounce(() => selector.shift()!))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    for (let i = 0; i < selectorSubs.length; i++) {
      expectSubscriptions(selector[i].subscriptions).toBe(selectorSubs[i]);
    }
  });

  it('should raise error when selector observable raises error', () => {
    const e1 = hot('--------a--------b--------c---------|');
    const e1subs = '^                            !';
    const expected = '---------a---------b---------#';
    const selector = [cold('-x-y-'), cold('--x-y-'), cold('---#')];
    const selectorSubs = [
      '        ^!                    ',
      '                 ^ !          ',
      '                          ^  !'
    ];

    expectSource(e1.pipe(debounce(() => selector.shift()!))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    for (let i = 0; i < selectorSubs.length; i++) {
      expectSubscriptions(selector[i].subscriptions).toBe(selectorSubs[i]);
    }
  });

  it('should raise error when source raises error with selector observable', () => {
    const e1 = hot('--------a--------b--------c---------d#');
    const e1subs = '^                                    !';
    const expected = '---------a---------b---------c-------#';
    const selector = [cold('-x-y-'), cold('--x-y-'), cold('---x-y-'), cold('----x-y-')];
    const selectorSubs = [
      '        ^!                            ',
      '                 ^ !                  ',
      '                          ^  !        ',
      '                                    ^!'
    ];

    expectSource(e1.pipe(debounce(() => selector.shift()!))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    for (let i = 0; i < selectorSubs.length; i++) {
      expectSubscriptions(selector[i].subscriptions).toBe(selectorSubs[i]);
    }
  });

  it('should raise error when selector function throws', () => {
    const e1 = hot('--------a--------b--------c---------|');
    const e1subs = '^                         !';
    const expected = '---------a---------b------#';
    const selector = [cold('-x-y-'), cold('--x-y-')];
    const selectorSubs = [
      '        ^!                            ',
      '                 ^ !                  '
    ];

    function selectorFunction(x: string) {
      if (x !== 'c') {
        return selector.shift();
      } else {
        throw 'error';
      }
    }

    expectSource(e1.pipe(debounce(selectorFunction as any))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    for (let i = 0; i < selectorSubs.length; i++) {
      expectSubscriptions(selector[i].subscriptions).toBe(selectorSubs[i]);
    }
  });

  it('should mirror the source when given an empty selector Observable', () => {
    const e1 = hot('--------a-x-yz---bxy---z--c--x--y--z|');
    const e1subs = '^                                   !';
    const expected = '--------a-x-yz---bxy---z--c--x--y--z|';

    function selectorFunction(x: string) {
      return EMPTY;
    }

    expectSource(e1.pipe(debounce(selectorFunction))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should ignore all values except last, when given a never selector Observable', () => {
    const e1 = hot('--------a-x-yz---bxy---z--c--x--y--z|');
    const e1subs = '^                                   !';
    const expected = '------------------------------------(z|)';

    function selectorFunction() {
      return NEVER;
    }

    expectSource(e1.pipe(debounce(selectorFunction))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should delay element by selector observable completes when it does not emits', () => {
    const e1 = hot('--------a--------b--------c---------|');
    const e1subs = '^                                   !';
    const expected = '---------a---------b---------c------|';
    const selector = [cold('-|'), cold('--|'), cold('---|')];
    const selectorSubs = [
      '        ^!                           ',
      '                 ^ !                 ',
      '                          ^  !       '
    ];

    expectSource(e1.pipe(debounce(() => selector.shift()!))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    for (let i = 0; i < selectorSubs.length; i++) {
      expectSubscriptions(selector[i].subscriptions).toBe(selectorSubs[i]);
    }
  });

  it('should debounce by selector observable completes when it does not emits', () => {
    const e1 = hot('----a--b-c---------de-------------|');
    const e1subs = '^                                 !';
    const expected = '-----a------c------------e--------|';
    const selector = [
      cold('-|'),
      cold('--|'),
      cold('---|'),
      cold('----|'),
      cold('-----|')
    ];
    const selectorSubs = [
      '    ^!                             ',
      '       ^ !                         ',
      '         ^  !                      ',
      '                   ^!              ',
      '                    ^    !         '
    ];

    expectSource(e1.pipe(debounce(() => selector.shift()!))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    for (let i = 0; i < selectorSubs.length; i++) {
      expectSubscriptions(selector[i].subscriptions).toBe(selectorSubs[i]);
    }
  });

  it('should delay by promise resolves', (done: MochaDone) => {
    const e1 = concat(
      of(1),
      timer(10).pipe(mapTo(2)),
      timer(10).pipe(mapTo(3)),
      timer(100).pipe(mapTo(4))
    );
    const expected = [1, 2, 3, 4];

    e1.pipe(
      debounce(() => {
        return new Promise((resolve: any) => {
          resolve(42);
        });
      })
    ).subscribe(
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

  it('should raises error when promise rejects', (done: MochaDone) => {
    const e1 = concat(
      of(1),
      timer(10).pipe(mapTo(2)),
      timer(10).pipe(mapTo(3)),
      timer(100).pipe(mapTo(4))
    );
    const expected = [1, 2];
    const error = new Error('error');

    e1.pipe(
      debounce((x: number) => {
        if (x === 3) {
          return new Promise((resolve: any, reject: any) => {
            reject(error);
          });
        } else {
          return new Promise((resolve: any) => {
            resolve(42);
          });
        }
      })
    ).subscribe(
      (x: number) => {
        expect(x).to.equal(expected.shift());
      },
      (err: any) => {
        expect(err).to.be.an('error', 'error');
        expect(expected.length).to.equal(0);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should debounce correctly when synchronously reentered', () => {
    const results: number[] = [];
    const source = new Subject<number>();

    source.pipe(debounce(() => of(null))).subscribe(value => {
      results.push(value);

      if (value === 1) {
        source.next(2);
      }
    });
    source.next(1);

    expect(results).toEqual([1, 2]);
  });

  type('should support selectors of the same type', () => {
    /* tslint:disable:no-unused-variable */
    let o: Observable<number>;
    let s: Observable<number>;
    let r: Observable<number> = o!.pipe(debounce(n => s));
    /* tslint:enable:no-unused-variable */
  });

  type('should support selectors of a different type', () => {
    /* tslint:disable:no-unused-variable */
    let o: Observable<number>;
    let s: Observable<string>;
    let r: Observable<number> = o!.pipe(debounce(n => s));
    /* tslint:enable:no-unused-variable */
  });
});

describe('debounceTime', () => {
  asDiagram('debounceTime(20)')('should debounce values by 20 time units', () => {
    const e1 = hot('-a--bc--d---|');
    const expected = '---a---c--d-|';

    expectSource(e1.pipe(debounceTime(20, rxTestScheduler))).toBe(expected);
  });

  it('should delay all element by the specified time', () => {
    const e1 = hot('-a--------b------c----|');
    const e1subs = '^                     !';
    const expected = '------a--------b------(c|)';

    expectSource(e1.pipe(debounceTime(50, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should debounce and delay element by the specified time', () => {
    const e1 = hot('-a--(bc)-----------d-------|');
    const e1subs = '^                          !';
    const expected = '---------c--------------d--|';

    expectSource(e1.pipe(debounceTime(50, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete when source does not emit', () => {
    const e1 = hot('-----|');
    const e1subs = '^    !';
    const expected = '-----|';

    expectSource(e1.pipe(debounceTime(10, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete when source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(debounceTime(10, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error when source does not emit and raises error', () => {
    const e1 = hot('-----#');
    const e1subs = '^    !';
    const expected = '-----#';

    expectSource(e1.pipe(debounceTime(10, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error when source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(debounceTime(10, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--bc--d----|');
    const e1subs = '^      !       ';
    const expected = '----a---       ';
    const unsub = '       !       ';

    const result = e1.pipe(debounceTime(20, rxTestScheduler));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const e1 = hot('--a--bc--d----|');
    const e1subs = '^      !       ';
    const expected = '----a---       ';
    const unsub = '       !       ';

    const result = e1.pipe(
      mergeMap((x: any) => of(x)),
      debounceTime(20, rxTestScheduler),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should debounce and does not complete when source does not completes', () => {
    const e1 = hot('-a--(bc)-----------d-------');
    const e1subs = '^                          ';
    const expected = '---------c--------------d--';

    expectSource(e1.pipe(debounceTime(50, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes when source does not completes', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(debounceTime(10, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes when source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(debounceTime(10, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should delay all element until source raises error', () => {
    const e1 = hot('-a--------b------c----#');
    const e1subs = '^                     !';
    const expected = '------a--------b------#';

    expectSource(e1.pipe(debounceTime(50, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should debounce all elements while source emits within given time', () => {
    const e1 = hot('--a--b--c--d--e--f--g--h-|');
    const e1subs = '^                        !';
    const expected = '-------------------------(h|)';

    expectSource(e1.pipe(debounceTime(40, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should debounce all element while source emits within given time until raises error', () => {
    const e1 = hot('--a--b--c--d--e--f--g--h-#');
    const e1subs = '^                        !';
    const expected = '-------------------------#';

    expectSource(e1.pipe(debounceTime(40, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should debounce correctly when synchronously reentered', () => {
    const results: number[] = [];
    const source = new Subject<number>();
    const scheduler = new Virtual();

    source.pipe(debounceTime(0, scheduler)).subscribe(value => {
      results.push(value);

      if (value === 1) {
        source.next(2);
      }
    });
    source.next(1);
    scheduler.flush();

    expect(results).toEqual([1, 2]);
  });
});

describe('distinct', () => {
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(distinct()); // $ExpectType Observable<number>
  });

  it('should accept a keySelector', () => {
    interface Person {
      name: string;
    }
    const o = of({name: 'Tim'} as Person).pipe(distinct(person => person.name)); // $ExpectType Observable<Person>
  });

  it('should accept flushes', () => {
    const o = of(1, 2, 3).pipe(distinct(n => n, of('t', 'i', 'm'))); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(distinct('F00D')); // $ExpectError
  });

  it('should enforce types of keySelector', () => {
    const o = of<{id: string}>({id: 'F00D'}).pipe(distinct(item => item.foo)); // $ExpectError
  });

  it('should distinguish between values', () => {
    const e1 = hot('--a--a--a--b--b--a--|');
    const e1subs = '^                   !';
    const expected = '--a--------b--------|';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should distinguish between values and does not completes', () => {
    const e1 = hot('--a--a--a--b--b--a-');
    const e1subs = '^                  ';
    const expected = '--a--------b-------';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source does not completes', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const expected = '-';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete if source does not emit', () => {
    const e1 = hot('------|');
    const e1subs = '^     !';
    const expected = '------|';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit if source emits single element only', () => {
    const e1 = hot('--a--|');
    const e1subs = '^    !';
    const expected = '--a--|';
    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit if source is scalar', () => {
    const e1 = of('a');
    const expected = '(a|)';
    expectSource((<any>e1).pipe(distinct())).toBe(expected);
  });

  it('should raises error if source raises error', () => {
    const e1 = hot('--a--a--#');
    const e1subs = '^       !';
    const expected = '--a-----#';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raises error if source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not omit if source elements are all different', () => {
    const e1 = hot('--a--b--c--d--e--f--|');
    const e1subs = '^                   !';
    const expected = '--a--b--c--d--e--f--|';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--b--b--d--a--f--|');
    const e1subs = '^         !          ';
    const expected = '--a--b-----          ';
    const unsub = '          !          ';

    const result = (<any>e1).pipe(distinct());

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const e1 = hot('--a--b--b--d--a--f--|');
    const e1subs = '^         !          ';
    const expected = '--a--b-----          ';
    const unsub = '          !          ';

    const result = (<any>e1).pipe(
      mergeMap((x: any) => of(x)),
      distinct(),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit once if source elements are all same', () => {
    const e1 = hot('--a--a--a--a--a--a--|');
    const e1subs = '^                   !';
    const expected = '--a-----------------|';

    expectSource((<any>e1).pipe(distinct())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should distinguish values by key', () => {
    const values = {a: 1, b: 2, c: 3, d: 4, e: 5, f: 6};
    const e1 = hot('--a--b--c--d--e--f--|', values);
    const e1subs = '^                   !';
    const expected = '--a--b--c-----------|';
    const selector = (value: number) => value % 3;

    expectSource((<any>e1).pipe(distinct(selector))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raises error when selector throws', () => {
    const e1 = hot('--a--b--c--d--e--f--|');
    const e1subs = '^          !         ';
    const expected = '--a--b--c--#         ';
    const selector = (value: string) => {
      if (value === 'd') {
        throw new Error('d is for dumb');
      }
      return value;
    };

    expectSource((<any>e1).pipe(distinct(selector))).toBe(
      expected,
      undefined,
      new Error('d is for dumb')
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should support a flushing stream', () => {
    const e1 = hot('--a--b--a--b--a--b--|');
    const e1subs = '^                   !';
    const e2 = hot('-----------x--------|');
    const e2subs = '^                   !';
    const expected = '--a--b--------a--b--|';

    expectSource((<any>e1).pipe(distinct(null as any, e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error if flush raises error', () => {
    const e1 = hot('--a--b--a--b--a--b--|');
    const e1subs = '^            !';
    const e2 = hot('-----------x-#');
    const e2subs = '^            !';
    const expected = '--a--b-------#';

    expectSource((<any>e1).pipe(distinct(null as any, e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should unsubscribe from the flushing stream when the main stream is unsubbed', () => {
    const e1 = hot('--a--b--a--b--a--b--|');
    const e1subs = '^          !         ';
    const e2 = hot('-----------x--------|');
    const e2subs = '^          !         ';
    const unsub = '           !         ';
    const expected = '--a--b------';

    expectSource((<any>e1).pipe(distinct(null as any, e2)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should allow opting in to default comparator with flush', () => {
    const e1 = hot('--a--b--a--b--a--b--|');
    const e1subs = '^                   !';
    const e2 = hot('-----------x--------|');
    const e2subs = '^                   !';
    const expected = '--a--b--------a--b--|';

    expectSource((<any>e1).pipe(distinct(null as any, e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
});

interface Person {
  name: string;
}

const sample: Person = {name: 'Tim'};

describe('distinctUntilChanged', () => {
  asDiagram('distinctUntilChanged')('should distinguish between values', () => {
    const e1 = hot('-1--2-2----1-3-|');
    const expected = '-1--2------1-3-|';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
  });

  it('should infer correctly', () => {
    const o = of(sample).pipe(distinctUntilChanged()); // $ExpectType Observable<Person>
  });

  it('should accept a compare', () => {
    const o = of(sample).pipe(distinctUntilChanged((p1, p2) => p1.name === p2.name)); // $ExpectType Observable<Person>
  });

  it('should accept a keySelector', () => {
    const o = of(sample).pipe(
      distinctUntilChanged(
        (name1, name2) => name1 === name2,
        p => p.name
      )
    ); // $ExpectType Observable<Person>
  });

  it('should enforce types', () => {
    const o = of(sample).pipe(distinctUntilChanged('F00D')); // $ExpectError
  });

  it('should enforce types of compare', () => {
    const o = of(sample).pipe(distinctUntilChanged((p1, p2) => p1.foo === p2.name)); // $ExpectError
    const p = of(sample).pipe(distinctUntilChanged((p1, p2) => p1.name === p2.foo)); // $ExpectError
  });

  it('should enforce types of keySelector', () => {
    const o = of(sample).pipe(
      distinctUntilChanged(
        (name1, name2) => name1 === name2,
        p => p.foo
      )
    ); // $ExpectError
  });

  it('should enforce types of compare in combination with keySelector', () => {
    const o = of(sample).pipe(
      distinctUntilChanged(
        (name1: number, name2) => name1 === name2,
        p => p.name
      )
    ); // $ExpectError
    const p = of(sample).pipe(
      distinctUntilChanged(
        (name1, name2: number) => name1 === name2,
        p => p.name
      )
    ); // $ExpectError
  });

  it('should distinguish between values', () => {
    const e1 = hot('--a--a--a--b--b--a--|');
    const e1subs = '^                   !';
    const expected = '--a--------b-----a--|';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should distinguish between values and does not completes', () => {
    const e1 = hot('--a--a--a--b--b--a-');
    const e1subs = '^                  ';
    const expected = '--a--------b-----a-';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source does not completes', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete if source does not emit', () => {
    const e1 = hot('------|');
    const e1subs = '^     !';
    const expected = '------|';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit if source emits single element only', () => {
    const e1 = hot('--a--|');
    const e1subs = '^    !';
    const expected = '--a--|';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit if source is scalar', () => {
    const e1 = of('a');
    const expected = '(a|)';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
  });

  it('should raises error if source raises error', () => {
    const e1 = hot('--a--a--#');
    const e1subs = '^       !';
    const expected = '--a-----#';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raises error if source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not omit if source elements are all different', () => {
    const e1 = hot('--a--b--c--d--e--f--|');
    const e1subs = '^                   !';
    const expected = '--a--b--c--d--e--f--|';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--b--b--d--a--f--|');
    const e1subs = '^         !          ';
    const expected = '--a--b-----          ';
    const unsub = '          !          ';

    const result = e1.pipe(distinctUntilChanged());

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const e1 = hot('--a--b--b--d--a--f--|');
    const e1subs = '^         !          ';
    const expected = '--a--b-----          ';
    const unsub = '          !          ';

    const result = e1.pipe(
      mergeMap((x: any) => of(x)),
      distinctUntilChanged(),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit once if source elements are all same', () => {
    const e1 = hot('--a--a--a--a--a--a--|');
    const e1subs = '^                   !';
    const expected = '--a-----------------|';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit once if comparator returns true always regardless of source emits', () => {
    const e1 = hot('--a--b--c--d--e--f--|');
    const e1subs = '^                   !';
    const expected = '--a-----------------|';

    expectSource(
      e1.pipe(
        distinctUntilChanged(() => {
          return true;
        })
      )
    ).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit all if comparator returns false always regardless of source emits', () => {
    const e1 = hot('--a--a--a--a--a--a--|');
    const e1subs = '^                   !';
    const expected = '--a--a--a--a--a--a--|';

    expectSource(
      e1.pipe(
        distinctUntilChanged(() => {
          return false;
        })
      )
    ).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should distinguish values by comparator', () => {
    const e1 = hot('--a--b--c--d--e--f--|', {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5,
      f: 6
    });
    const e1subs = '^                   !';
    const expected = '--a-----c-----e-----|';
    const comparator = (x: number, y: number) => y % 2 === 0;

    expectSource(e1.pipe(distinctUntilChanged(comparator))).toBe(expected, {
      a: 1,
      c: 3,
      e: 5
    });
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raises error when comparator throws', () => {
    const e1 = hot('--a--b--c--d--e--f--|');
    const e1subs = '^          !         ';
    const expected = '--a--b--c--#         ';
    const comparator = (x: string, y: string) => {
      if (y === 'd') {
        throw 'error';
      }
      return x === y;
    };

    expectSource(e1.pipe(distinctUntilChanged(comparator))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should use the keySelector to pick comparator values', () => {
    const e1 = hot('--a--b--c--d--e--f--|', {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5,
      f: 6
    });
    const e1subs = '^                   !';
    const expected = '--a--b-----d-----f--|';
    const comparator = (x: number, y: number) => y % 2 === 1;
    const keySelector = (x: number) => x % 2;

    expectSource(e1.pipe(distinctUntilChanged(comparator, keySelector))).toBe(expected, {
      a: 1,
      b: 2,
      d: 4,
      f: 6
    });
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raises error when keySelector throws', () => {
    const e1 = hot('--a--b--c--d--e--f--|');
    const e1subs = '^          !         ';
    const expected = '--a--b--c--#         ';
    const keySelector = (x: string) => {
      if (x === 'd') {
        throw 'error';
      }
      return x;
    };

    expectSource(e1.pipe(distinctUntilChanged(null as any, keySelector))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

const sample = {name: 'foobar', num: 42};

describe('distinctUntilKeyChanged', () => {
  asDiagram("distinctUntilKeyChanged('k')")('should distinguish between values', () => {
    const values = {a: {k: 1}, b: {k: 2}, c: {k: 3}};
    const e1 = hot('-a--b-b----a-c-|', values);
    const expected = '-a--b------a-c-|';

    const result = (<any>e1).pipe(distinctUntilKeyChanged('k'));

    expectSource(result).toBe(expected, values);
  });
  it('should infer correctly', () => {
    const o = of(sample).pipe(distinctUntilKeyChanged('name')); // $ExpectType Observable<{ name: string; num: number; }>
  });

  it('should infer correctly with compare', () => {
    const o = of(sample).pipe(distinctUntilKeyChanged('name', () => true)); // $ExpectType Observable<{ name: string; num: number; }>
  });

  it('should enforce key set', () => {
    const o = of(sample).pipe(distinctUntilKeyChanged('something')); // $ExpectError
  });

  it('should enforce key set with compare', () => {
    const o = of(sample).pipe(distinctUntilKeyChanged('something', () => true)); // $ExpectError
  });

  it("should enforce compare's type", () => {
    const o = of(sample).pipe(
      distinctUntilKeyChanged('name', (a: number, b: number) => true)
    ); // $ExpectError
  });

  it("should enforce key set and compare's type", () => {
    const o = of(sample).pipe(
      distinctUntilKeyChanged('something', (a: number, b: number) => true)
    ); // $ExpectError
  });

  it('should distinguish between values', () => {
    const values = {a: {val: 1}, b: {val: 2}};
    const e1 = hot('--a--a--a--b--b--a--|', values);
    const e1subs = '^                   !';
    const expected = '--a--------b-----a--|';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should distinguish between values and does not completes', () => {
    const values = {a: {val: 1}, b: {val: 2}};
    const e1 = hot('--a--a--a--b--b--a-', values);
    const e1subs = '^                  ';
    const expected = '--a--------b-----a-';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should distinguish between values with key', () => {
    const values = {
      a: {val: 1},
      b: {valOther: 1},
      c: {valOther: 3},
      d: {val: 1},
      e: {val: 5}
    };
    const e1 = hot('--a--b--c--d--e--|', values);
    const e1subs = '^                !';
    const expected = '--a--b-----d--e--|';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not compare if source does not have element with key', () => {
    const values = {
      a: {valOther: 1},
      b: {valOther: 1},
      c: {valOther: 3},
      d: {valOther: 1},
      e: {valOther: 5}
    };
    const e1 = hot('--a--b--c--d--e--|', values);
    const e1subs = '^                !';
    const expected = '--a--------------|';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source does not completes', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const expected = '-';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete if source does not emit', () => {
    const e1 = hot('------|');
    const e1subs = '^     !';
    const expected = '------|';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit if source emits single element only', () => {
    const values = {a: {val: 1}};
    const e1 = hot('--a--|', values);
    const e1subs = '^    !';
    const expected = '--a--|';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit if source is scalar', () => {
    const values = {a: {val: 1}};
    const e1 = of(values.a);
    const expected = '(a|)';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected, values);
  });

  it('should raises error if source raises error', () => {
    const values = {a: {val: 1}};
    const e1 = hot('--a--a--#', values);
    const e1subs = '^       !';
    const expected = '--a-----#';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raises error if source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not omit if source elements are all different', () => {
    const values = {
      a: {val: 1},
      b: {val: 2},
      c: {val: 3},
      d: {val: 4},
      e: {val: 5}
    };
    const e1 = hot('--a--b--c--d--e--|', values);
    const e1subs = '^                !';
    const expected = '--a--b--c--d--e--|';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const values = {
      a: {val: 1},
      b: {val: 2},
      c: {val: 3},
      d: {val: 4},
      e: {val: 5}
    };
    const e1 = hot('--a--b--b--d--a--e--|', values);
    const e1subs = '^         !          ';
    const expected = '--a--b-----          ';
    const unsub = '          !          ';

    const result = (<any>e1).pipe(distinctUntilKeyChanged('val'));

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    const values = {
      a: {val: 1},
      b: {val: 2},
      c: {val: 3},
      d: {val: 4},
      e: {val: 5}
    };
    const e1 = hot('--a--b--b--d--a--e--|', values);
    const e1subs = '^         !          ';
    const expected = '--a--b-----          ';
    const unsub = '          !          ';

    const result = (<any>e1).pipe(
      mergeMap((x: any) => of(x)),
      distinctUntilKeyChanged('val'),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit once if source elements are all same', () => {
    const values = {a: {val: 1}};
    const e1 = hot('--a--a--a--a--a--a--|', values);
    const e1subs = '^                   !';
    const expected = '--a-----------------|';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit once if comparer returns true always regardless of source emits', () => {
    const values = {
      a: {val: 1},
      b: {val: 2},
      c: {val: 3},
      d: {val: 4},
      e: {val: 5}
    };
    const e1 = hot('--a--b--c--d--e--|', values);
    const e1subs = '^                !';
    const expected = '--a--------------|';

    expectSource(e1.pipe(distinctUntilKeyChanged('val', () => true))).toBe(
      expected,
      values
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit all if comparer returns false always regardless of source emits', () => {
    const values = {a: {val: 1}};
    const e1 = hot('--a--a--a--a--a--a--|', values);
    const e1subs = '^                   !';
    const expected = '--a--a--a--a--a--a--|';

    expectSource(e1.pipe(distinctUntilKeyChanged('val', () => false))).toBe(
      expected,
      values
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should distinguish values by selector', () => {
    const values = {
      a: {val: 1},
      b: {val: 2},
      c: {val: 3},
      d: {val: 4},
      e: {val: 5}
    };
    const e1 = hot('--a--b--c--d--e--|', values);
    const e1subs = '^                !';
    const expected = '--a-----c-----e--|';
    const selector = (x: number, y: number) => y % 2 === 0;

    expectSource(e1.pipe(distinctUntilKeyChanged('val', selector))).toBe(
      expected,
      values
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raises error when comparer throws', () => {
    const values = {
      a: {val: 1},
      b: {val: 2},
      c: {val: 3},
      d: {val: 4},
      e: {val: 5}
    };
    const e1 = hot('--a--b--c--d--e--|', values);
    const e1subs = '^          !      ';
    const expected = '--a--b--c--#      ';
    const selector = (x: number, y: number) => {
      if (y === 4) {
        throw 'error';
      }
      return x === y;
    };

    expectSource(e1.pipe(distinctUntilKeyChanged('val', selector))).toBe(
      expected,
      values
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

describe('elementAt', () => {
  asDiagram('elementAt(2)')('should return last element by zero-based index', () => {
    const source = hot('--a--b--c-d---|');
    const subs = '^       !      ';
    const expected = '--------(c|)   ';

    expectSource((<any>source).pipe(elementAt(2))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should infer correctly', () => {
    const o = of('foo').pipe(elementAt(47)); // $ExpectType Observable<string>
  });

  it('should support a default value', () => {
    const o = of('foo').pipe(elementAt(47, 'bar')); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo').pipe(elementAt()); // $ExpectError
  });

  it('should enforce of index', () => {
    const o = of('foo').pipe(elementAt('foo')); // $ExpectError
  });

  it('should enforce of default', () => {
    const o = of('foo').pipe(elementAt(5, 5)); // $ExpectError
  });

  it('should return first element by zero-based index', () => {
    const source = hot('--a--b--c--|');
    const subs = '^ !';
    const expected = '--(a|)';

    expectSource((<any>source).pipe(elementAt(0))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return non-first element by zero-based index', () => {
    const source = hot('--a--b--c--d--e--f--|');
    const subs = '^          !';
    const expected = '-----------(d|)';

    expectSource((<any>source).pipe(elementAt(3))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return last element by zero-based index', () => {
    const source = hot('--a--b--c--|');
    const subs = '^       !';
    const expected = '--------(c|)';

    expectSource((<any>source).pipe(elementAt(2))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should raise error if source is Empty Observable', () => {
    const source = cold('|');
    const subs = '(^!)';
    const expected = '#';

    expectSource((<any>source).pipe(elementAt(0))).toBe(
      expected,
      undefined,
      new OutOfRangeError()
    );
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should propagate error if source is Throw Observable', () => {
    const source = cold('#');
    const subs = '(^!)';
    const expected = '#';

    expectSource((<any>source).pipe(elementAt(0))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return Never if source is Never Observable', () => {
    const source = cold('-');
    const subs = '^';
    const expected = '-';

    expectSource((<any>source).pipe(elementAt(0))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const source = hot('--a--b--c--|');
    const subs = '^     !     ';
    const expected = '-------     ';
    const unsub = '      !     ';

    const result = (<any>source).pipe(elementAt(2));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not break unsubscription chains when result Observable is unsubscribed', () => {
    const source = hot('--a--b--c--|');
    const subs = '^     !     ';
    const expected = '-------     ';
    const unsub = '      !     ';

    const result = (<any>source).pipe(
      mergeMap((x: any) => of(x)),
      elementAt(2),
      mergeMap((x: any) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should throw if index is smaller than zero', () => {
    expect(() => {
      range(0, 10).pipe(elementAt(-1));
    }).to.throw(OutOfRangeError);
  });

  it('should raise error if index is out of range but does not have default value', () => {
    const source = hot('--a--|');
    const subs = '^    !';
    const expected = '-----#';

    expectSource((<any>source).pipe(elementAt(3))).toBe(
      expected,
      null,
      new OutOfRangeError()
    );
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return default value if index is out of range', () => {
    const source = hot('--a--|');
    const subs = '^    !';
    const expected = '-----(x|)';
    const defaultValue = '42';

    expectSource(source.pipe(elementAt(3, defaultValue))).toBe(expected, {
      x: defaultValue
    });
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});

describe('filter', () => {
  function oddFilter(x: number | string) {
    return +x % 2 === 1;
  }

  function isPrime(i: number | string) {
    if (+i <= 1) {
      return false;
    }
    const max = Math.floor(Math.sqrt(+i));
    for (let j = 2; j <= max; ++j) {
      if (+i % j === 0) {
        return false;
      }
    }
    return true;
  }

  asDiagram('filter(x => x % 2 === 1)')('should filter out even values', () => {
    const source = hot('--0--1--2--3--4--|');
    const subs = '^                !';
    const expected = '-----1-----3-----|';

    expectSource(source.pipe(filter(oddFilter))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should support a predicate', () => {
    const o = of(1, 2, 3).pipe(filter(value => value < 3)); // $ExpectType Observable<number>
  });

  it('should support a predicate with an index', () => {
    const o = of(1, 2, 3).pipe(filter((value, index) => index < 3)); // $ExpectType Observable<number>
  });

  it('should support a predicate and an argument', () => {
    const o = of(1, 2, 3).pipe(filter(value => value < 3, 'bonjour')); // $ExpectType Observable<number>
  });

  it('should support a user-defined type guard', () => {
    const o = of(1, 2, 3).pipe(filter((value: number): value is 1 => value < 3)); // $ExpectType Observable<1>
  });

  it('should support a user-defined type guard with an index', () => {
    const o = of(1, 2, 3).pipe(filter((value: number, index): value is 1 => index < 3)); // $ExpectType Observable<1>
  });

  it('should support a user-defined type guard and an argument', () => {
    const o = of(1, 2, 3).pipe(filter((value: number): value is 1 => value < 3, 'hola')); // $ExpectType Observable<1>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(filter()); // $ExpectError
  });

  it('should enforce predicate types', () => {
    const o = of(1, 2, 3).pipe(filter(value => value < '3')); // $ExpectError
    const p = of(1, 2, 3).pipe(filter((value, index) => index < '3')); // $ExpectError
  });

  it('should enforce user-defined type guard types', () => {
    const o = of(1, 2, 3).pipe(filter((value: string): value is '1' => value < '3')); // $ExpectError
    const p = of(1, 2, 3).pipe(filter((value: number, index): value is 1 => index < '3')); // $ExpectError
  });

  it('should support Boolean as a predicate', () => {
    const o = of(1, 2, 3).pipe(filter(Boolean)); // $ExpectType Observable<number>
    const p = of(1, null, undefined).pipe(filter(Boolean)); // $ExpectType Observable<number>
    const q = of(null, undefined).pipe(filter(Boolean)); // $ExpectType Observable<never>
  });

  it('should support inference from a return type with Boolean as a predicate', () => {
    interface I {
      a: string;
    }

    const i$: Observable<I> = of();
    const s$: Observable<string> = i$.pipe(
      map(i => i.a),
      filter(Boolean)
    ); // $ExpectType Observable<string>
  });

  it('should support inference from a generic return type of the predicate', () => {
    function isDefined<T>() {
      return (value: T | undefined): value is T => {
        return value !== undefined && value !== null;
      };
    }

    const o$ = of(1, null, {foo: 'bar'}, true, undefined, 'Nick Cage').pipe(
      filter(isDefined())
    ); // $ExpectType Observable<string | number | boolean | { foo: string; }>
  });

  it('should filter in only prime numbers', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const subs = '^                  !';
    const expected = '--3---5----7-------|';

    expectSource(source.pipe(filter(isPrime))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should filter with an always-true predicate', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const expected = '--3-4-5-6--7-8--9--|';
    const predicate = () => {
      return true;
    };

    expectSource(source.pipe(filter(predicate))).toBe(expected);
  });

  it('should filter with an always-false predicate', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const expected = '-------------------|';
    const predicate = () => {
      return false;
    };

    expectSource(source.pipe(filter(predicate))).toBe(expected);
  });

  it('should filter in only prime numbers, source unsubscribes early', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const subs = '^           !       ';
    const unsub = '            !       ';
    const expected = '--3---5----7-       ';

    expectSource(source.pipe(filter(isPrime)), unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should filter in only prime numbers, source throws', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--#');
    const subs = '^                  !';
    const expected = '--3---5----7-------#';

    expectSource(source.pipe(filter(isPrime))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should filter in only prime numbers, but predicate throws', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const subs = '^       !           ';
    const expected = '--3---5-#           ';

    let invoked = 0;
    function predicate(x: any, index: number) {
      invoked++;
      if (invoked === 4) {
        throw 'error';
      }
      return isPrime(x);
    }

    expectSource((<any>source).pipe(filter(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should filter in only prime numbers, predicate with index', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const subs = '^                  !';
    const expected = '--3--------7-------|';

    function predicate(x: any, i: number) {
      return isPrime(+x + i * 10);
    }

    expectSource((<any>source).pipe(filter(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should invoke predicate once for each checked value', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const expected = '--3---5----7-------|';

    let invoked = 0;
    const predicate = (x: any) => {
      invoked++;
      return isPrime(x);
    };

    const r = source.pipe(
      filter(predicate),
      tap(null, null, () => {
        expect(invoked).to.equal(7);
      })
    );

    expectSource(r).toBe(expected);
  });

  it(
    'should filter in only prime numbers, predicate with index, ' +
      'source unsubscribes early',
    () => {
      const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
      const subs = '^           !       ';
      const unsub = '            !       ';
      const expected = '--3--------7-       ';

      function predicate(x: any, i: number) {
        return isPrime(+x + i * 10);
      }
      expectSource((<any>source).pipe(filter(predicate)), unsub).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

  it('should filter in only prime numbers, predicate with index, source throws', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--#');
    const subs = '^                  !';
    const expected = '--3--------7-------#';

    function predicate(x: any, i: number) {
      return isPrime(+x + i * 10);
    }
    expectSource((<any>source).pipe(filter(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should filter in only prime numbers, predicate with index and throws', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const subs = '^       !           ';
    const expected = '--3-----#           ';

    let invoked = 0;
    function predicate(x: any, i: number) {
      invoked++;
      if (invoked === 4) {
        throw 'error';
      }
      return isPrime(+x + i * 10);
    }

    expectSource((<any>source).pipe(filter(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should compose with another filter to allow multiples of six', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const expected = '--------6----------|';

    expectSource(
      source.pipe(
        filter((x: string) => +x % 2 === 0),
        filter((x: string) => +x % 3 === 0)
      )
    ).toBe(expected);
  });

  it('should be able to accept and use a thisArg', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const expected = '--------6----------|';

    class Filterer {
      filter1 = (x: string) => +x % 2 === 0;
      filter2 = (x: string) => +x % 3 === 0;
    }

    const filterer = new Filterer();

    expectSource(
      source.pipe(
        filter(function (this: any, x) {
          return this.filter1(x);
        }, filterer),
        filter(function (this: any, x) {
          return this.filter2(x);
        }, filterer),
        filter(function (this: any, x) {
          return this.filter1(x);
        }, filterer)
      )
    ).toBe(expected);
  });

  it('should be able to use filter and map composed', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const expected = '----a---b----c-----|';
    const values = {a: 16, b: 36, c: 64};

    expectSource(
      source.pipe(
        filter((x: string) => +x % 2 === 0),
        map((x: string) => +x * +x)
      )
    ).toBe(expected, values);
  });

  it('should propagate errors from the source', () => {
    const source = hot('--0--1--2--3--4--#');
    const subs = '^                !';
    const expected = '-----1-----3-----#';

    expectSource(source.pipe(filter(oddFilter))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should support Observable.empty', () => {
    const source = cold('|');
    const subs = '(^!)';
    const expected = '|';

    expectSource(source.pipe(filter(oddFilter))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should support Observable.never', () => {
    const source = cold('-');
    const subs = '^';
    const expected = '-';

    expectSource(source.pipe(filter(oddFilter))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should support Observable.throw', () => {
    const source = cold('#');
    const subs = '(^!)';
    const expected = '#';

    expectSource(source.pipe(filter(oddFilter))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should send errors down the error path', (done: MochaDone) => {
    of(42)
      .pipe(
        filter(<any>((x: number, index: number) => {
          throw 'bad';
        }))
      )
      .subscribe(
        (x: number) => {
          done(new Error('should not be called'));
        },
        (err: any) => {
          expect(err).to.equal('bad');
          done();
        },
        () => {
          done(new Error('should not be called'));
        }
      );
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const source = hot('-1--2--^-3-4-5-6--7-8--9--|');
    const subs = '^           !       ';
    const unsub = '            !       ';
    const expected = '--3---5----7-       ';

    const r = source.pipe(
      mergeMap((x: any) => of(x)),
      filter(isPrime),
      mergeMap((x: any) => of(x))
    );

    expectSource(r, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should support type guards without breaking previous behavior', () => {
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
        .pipe(filter(foo => foo.baz === 42))
        .subscribe(x => x.baz); // x is still Foo
      of(foo)
        .pipe(filter(isBar))
        .subscribe(x => x.bar); // x is Bar!

      const foobar: Bar = new Foo(); // type is interface, not the class
      of(foobar)
        .pipe(filter(foobar => foobar.bar === 'name'))
        .subscribe(x => x.bar); // <-- x is still Bar
      of(foobar)
        .pipe(filter(isBar))
        .subscribe(x => x.bar); // <--- x is Bar!

      const barish = {bar: 'quack', baz: 42}; // type can quack like a Bar
      of(barish)
        .pipe(filter(x => x.bar === 'quack'))
        .subscribe(x => x.bar); // x is still { bar: string; baz: number; }
      of(barish)
        .pipe(filter(isBar))
        .subscribe(bar => bar.bar); // x is Bar!
    }

    {
      const xs: Observable<string | number> = from([1, 'aaa', 3, 'bb']);

      // This type guard will narrow a `string | number` to a string in the examples below
      const isString = (x: string | number): x is string => typeof x === 'string';

      xs.pipe(filter(isString)).subscribe(s => s.length); // s is string

      // In contrast, this type of regular boolean predicate still maintains the original type
      xs.pipe(filter(x => typeof x === 'number')).subscribe(x => x); // x is still string | number
      xs.pipe(filter((x, i) => typeof x === 'number' && x > i)).subscribe(x => x); // x is still string | number
    }
  });

  it('should support Boolean as a predicate', () => {
    const source = hot('-t--f--^-t-f-t-f--t-f--f--|', {t: 1, f: 0});
    const subs = '^                  !';
    const expected = '--t---t----t-------|';

    expectSource(source.pipe(filter(Boolean))).toBe(expected, {t: 1, f: 0});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});

describe('first', () => {
  asDiagram('first')(
    'should take the first value of an observable with many values',
    () => {
      const e1 = hot('-----a--b--c---d---|');
      const expected = '-----(a|)           ';
      const sub = '^    !              ';

      expectSource(e1.pipe(first())).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(sub);
    }
  );

  const isFooBar = (value: string): value is 'foo' | 'bar' => /^(foo|bar)$/.test(value);

  it('should support an undefined predicate with no default', () => {
    const o = of('foo').pipe(first(undefined)); // $ExpectType Observable<string>
  });

  it('should support an undefined predicate with a T default', () => {
    const o = of('foo').pipe(first(undefined, 'bar')); // $ExpectType Observable<string>
  });

  it('should support an undefined predicate with a non-T default', () => {
    const o = of('foo').pipe(first(undefined, false)); // $ExpectType Observable<string | boolean>
  });

  it('should default D to T with an undfined predicate', () => {
    const o = of('foo').pipe(first<string>(undefined)); // $Observable<string>
  });

  it('should support a null predicate with no default', () => {
    const o = of('foo').pipe(first(null)); // $ExpectType Observable<string>
  });

  it('should support a null predicate with a T default', () => {
    const o = of('foo').pipe(first(null, 'bar')); // $ExpectType Observable<string>
  });

  it('should support a null predicate with a non-T default', () => {
    const o = of('foo').pipe(first(null, false)); // $ExpectType Observable<string | boolean>
  });

  it('should default D to T with a null predicate', () => {
    const o = of('foo').pipe(first<string>(null)); // $Observable<string>
  });

  it('should support a user-defined type guard with no default', () => {
    const o = of('foo').pipe(first(isFooBar)); // $ExpectType Observable<"foo" | "bar">
  });

  it('should support a user-defined type guard with an S default', () => {
    const o = of('foo').pipe(first(isFooBar, 'bar')); // $ExpectType Observable<"foo" | "bar">
  });

  it('should widen a user-defined type guard with a non-S default', () => {
    const o = of('foo').pipe(first(isFooBar, false)); // $ExpectType Observable<string | boolean>
  });

  it('should support a predicate with no default', () => {
    const o = of('foo').pipe(first(x => !!x)); // $ExpectType Observable<string>
  });

  it('should support a predicate with a T default', () => {
    const o = of('foo').pipe(first(x => !!x, 'bar')); // $ExpectType Observable<string>
  });

  it('should support a predicate with a non-T default', () => {
    const o = of('foo').pipe(first(x => !!x, false)); // $ExpectType Observable<string | boolean>
  });

  it('should default D to T with a predicate', () => {
    const o = of('foo').pipe(first<string>(x => !!x)); // $Observable<string>
  });
  it('should take the first value of an observable with one value', () => {
    const e1 = hot('---(a|)');
    const expected = '---(a|)';
    const sub = '^  !';

    expectSource(e1.pipe(first())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should error on empty', () => {
    const e1 = hot('--a--^----|');
    const expected = '-----#';
    const sub = '^    !';

    expectSource(e1.pipe(first())).toBe(expected, null, new EmptyError());
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should return the default value if source observable was empty', () => {
    const e1 = hot('-----^----|');
    const expected = '-----(a|)';
    const sub = '^    !';

    expectSource(e1.pipe(first(null, 'a'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should only emit one value in recursive cases', () => {
    const subject = new Subject<number>();
    const results: number[] = [];

    subject.pipe(first()).subscribe(x => {
      results.push(x);
      subject.next(x + 1);
    });

    subject.next(0);

    expect(results).toEqual([0]);
  });

  it('should propagate error from the source observable', () => {
    const e1 = hot('---^---#');
    const expected = '----#';
    const sub = '^   !';

    expectSource(e1.pipe(first())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should go on forever on never', () => {
    const e1 = hot('--^-------');
    const expected = '--------';
    const sub = '^       ';

    expectSource(e1.pipe(first())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('--a--^-----b----c---d--|');
    const e1subs = '^  !               ';
    const expected = '----               ';
    const unsub = '   !               ';

    expectSource(e1.pipe(first()), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--^-----b----c---d--|');
    const e1subs = '^  !               ';
    const expected = '----               ';
    const unsub = '   !               ';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      first(),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should unsubscribe when the first value is receiv', () => {
    const source = hot('--a--b---c-|');
    const subs = '^ !';
    const expected = '----(a|)';

    const duration = rxTestScheduler.createTime('--|');

    expectSource(source.pipe(first(), delay(duration, rxTestScheduler))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return first value that matches a predicate', () => {
    const e1 = hot('--a-^--b--c--a--c--|');
    const expected = '------(c|)';
    const sub = '^     !';

    expectSource(e1.pipe(first(value => value === 'c'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should return first value that matches a predicate for odd numbers', () => {
    const e1 = hot('--a-^--b--c--d--e--|', {a: 1, b: 2, c: 3, d: 4, e: 5});
    const expected = '------(c|)';
    const sub = '^     !';

    expectSource(e1.pipe(first(x => x % 2 === 1))).toBe(expected, {c: 3});
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should error when no value matches the predicate', () => {
    const e1 = hot('--a-^--b--c--a--c--|');
    const expected = '---------------#';
    const sub = '^              !';

    expectSource(e1.pipe(first(x => x === 's'))).toBe(expected, null, new EmptyError());
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should return the default value when no value matches the predicate', () => {
    const e1 = hot('--a-^--b--c--a--c--|');
    const expected = '---------------(d|)';
    const sub = '^              !';
    expectSource(e1.pipe(first<string>(x => x === 's', 'd'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should propagate error when no value matches the predicate', () => {
    const e1 = hot('--a-^--b--c--a--#');
    const expected = '------------#';
    const sub = '^           !';

    expectSource(e1.pipe(first(x => x === 's'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should return first value that matches the index in the predicate', () => {
    const e1 = hot('--a-^--b--c--a--c--|');
    const expected = '---------(a|)';
    const sub = '^        !';

    expectSource(e1.pipe(first((_, i) => i === 2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should propagate error from predicate', () => {
    const e1 = hot('--a-^--b--c--d--e--|', {a: 1, b: 2, c: 3, d: 4, e: 5});
    const expected = '---------#';
    const sub = '^        !';
    const predicate = function (value: number) {
      if (value < 4) {
        return false;
      } else {
        throw 'error';
      }
    };

    expectSource(e1.pipe(first(predicate))).toBe(expected, null, 'error');
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should support type guards without breaking previous behavior', () => {
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

      const isBar = (x: any): x is Bar => x && (x as Bar).bar !== undefined;
      const isBaz = (x: any): x is Baz => x && (x as Baz).baz !== undefined;

      const foo: Foo = new Foo();
      of(foo)
        .pipe(first())
        .subscribe(x => x.baz); // x is Foo
      of(foo)
        .pipe(first(foo => foo.bar === 'name'))
        .subscribe(x => x.baz); // x is still Foo
      of(foo)
        .pipe(first(isBar))
        .subscribe(x => x.bar); // x is Bar!

      const foobar: Bar = new Foo(); // type is the interface, not the class
      of(foobar)
        .pipe(first())
        .subscribe(x => x.bar); // x is Bar
      of(foobar)
        .pipe(first(foobar => foobar.bar === 'name'))
        .subscribe(x => x.bar); // x is still Bar
      of(foobar)
        .pipe(first(isBaz))
        .subscribe(x => x.baz); // x is Baz!

      const barish = {bar: 'quack', baz: 42}; // type can quack like a Bar
      of(barish)
        .pipe(first())
        .subscribe(x => x.baz); // x is still { bar: string; baz: number; }
      of(barish)
        .pipe(first(x => x.bar === 'quack'))
        .subscribe(x => x.bar); // x is still { bar: string; baz: number; }
      of(barish)
        .pipe(first(isBar))
        .subscribe(x => x.bar); // x is Bar!
    }

    {
      const xs: Observable<string | number> = from([1, 'aaa', 3, 'bb']);

      // This type guard will narrow a `string | number` to a string in the examples below
      const isString = (x: string | number): x is string => typeof x === 'string';

      // missing predicate preserves the type
      xs.pipe(first()).subscribe(x => x); // x is still string | number

      // null predicate preserves the type
      xs.pipe(first(null)).subscribe(x => x); // x is still string | number

      // undefined predicate preserves the type
      xs.pipe(first(undefined)).subscribe(x => x); // x is still string | number

      // After the type guard `first` predicates, the type is narrowed to string
      xs.pipe(first(isString)).subscribe(s => s.length); // s is string

      // boolean predicates preserve the type
      xs.pipe(first(x => typeof x === 'string')).subscribe(x => x); // x is still string | number
    }
  });
});

describe('ignoreElements', () => {
  asDiagram('ignoreElements')('should ignore all the elements of the source', () => {
    const source = hot('--a--b--c--d--|');
    const subs = '^             !';
    const expected = '--------------|';

    expectSource(source.pipe(ignoreElements())).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(ignoreElements()); // $ExpectType Observable<never>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(ignoreElements('nope')); // $ExpectError
  });

  it('should allow unsubscribing early and explicitly', () => {
    const source = hot('--a--b--c--d--|');
    const subs = '^      !       ';
    const expected = '--------       ';
    const unsub = '       !       ';

    const result = source.pipe(ignoreElements());

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const source = hot('--a--b--c--d--|');
    const subs = '^      !       ';
    const expected = '--------       ';
    const unsub = '       !       ';

    const result = source.pipe(
      mergeMap((x: string) => of(x)),
      ignoreElements(),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should propagate errors from the source', () => {
    const source = hot('--a--#');
    const subs = '^    !';
    const expected = '-----#';

    expectSource(source.pipe(ignoreElements())).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should support Observable.empty', () => {
    const source = cold('|');
    const subs = '(^!)';
    const expected = '|';

    expectSource(source.pipe(ignoreElements())).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should support Observable.never', () => {
    const source = cold('-');
    const subs = '^';
    const expected = '-';

    expectSource(source.pipe(ignoreElements())).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should support Observable.throw', () => {
    const source = cold('#');
    const subs = '(^!)';
    const expected = '#';

    expectSource(source.pipe(ignoreElements())).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});

describe('last', () => {
  asDiagram('last')('should take the last value of an observable', () => {
    const e1 = hot('--a----b--c--|');
    const e1subs = '^            !';
    const expected = '-------------(c|)';

    expectSource(e1.pipe(last())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should support an undefined predicate with no default', () => {
    const o = of('foo').pipe(last(undefined)); // $ExpectType Observable<string>
  });

  it('should support an undefined predicate with a T default', () => {
    const o = of('foo').pipe(last(undefined, 'bar')); // $ExpectType Observable<string>
  });

  it('should support an undefined predicate with a non-T default', () => {
    const o = of('foo').pipe(last(undefined, false)); // $ExpectType Observable<string | boolean>
  });

  it('should default D to T with an undfined predicate', () => {
    const o = of('foo').pipe(last<string>(undefined)); // $Observable<string>
  });

  it('should support a null predicate with no default', () => {
    const o = of('foo').pipe(last(null)); // $ExpectType Observable<string>
  });

  it('should support a null predicate with a T default', () => {
    const o = of('foo').pipe(last(null, 'bar')); // $ExpectType Observable<string>
  });

  it('should support a null predicate with a non-T default', () => {
    const o = of('foo').pipe(last(null, false)); // $ExpectType Observable<string | boolean>
  });

  it('should default D to T with a null predicate', () => {
    const o = of('foo').pipe(last<string>(null)); // $Observable<string>
  });

  it('should support a user-defined type guard with no default', () => {
    const o = of('foo').pipe(last(isFooBar)); // $ExpectType Observable<"foo" | "bar">
  });

  it('should support a user-defined type guard with an S default', () => {
    const o = of('foo').pipe(last(isFooBar, 'bar')); // $ExpectType Observable<"foo" | "bar">
  });

  it('should widen a user-defined type guard with a non-S default', () => {
    const o = of('foo').pipe(last(isFooBar, false)); // $ExpectType Observable<string | boolean>
  });

  it('should support a predicate with no default', () => {
    const o = of('foo').pipe(last(x => !!x)); // $ExpectType Observable<string>
  });

  it('should support a predicate with a T default', () => {
    const o = of('foo').pipe(last(x => !!x, 'bar')); // $ExpectType Observable<string>
  });

  it('should support a predicate with a non-T default', () => {
    const o = of('foo').pipe(last(x => !!x, false)); // $ExpectType Observable<string | boolean>
  });

  it('should default D to T with a predicate', () => {
    const o = of('foo').pipe(last<string>(x => !!x)); // $Observable<string>
  });

  it('should error on nothing sent but completed', () => {
    const e1 = hot('--a--^----|');
    const e1subs = '^    !';
    const expected = '-----#';

    expectSource(e1.pipe(last())).toBe(expected, null, new EmptyError());
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should error on empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(last())).toBe(expected, null, new EmptyError());
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should go on forever on never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(last())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return last element matches with predicate', () => {
    const e1 = hot('--a--b--a--b--|');
    const e1subs = '^             !';
    const expected = '--------------(b|)';

    expectSource(e1.pipe(last(value => value === 'b'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--b--c--d--|');
    const unsub = '       !       ';
    const e1subs = '^      !       ';
    const expected = '--------       ';

    expectSource(e1.pipe(last()), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b--c--d--|');
    const e1subs = '^      !       ';
    const expected = '--------       ';
    const unsub = '       !       ';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      last(),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return a default value if no element found', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(a|)';

    expectSource(e1.pipe(last(null, 'a'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not return default value if an element is found', () => {
    const e1 = hot('--a---^---b---c---d---|');
    const e1subs = '^               !';
    const expected = '----------------(d|)';

    expectSource(e1.pipe(last(null, 'x'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error when predicate throws', () => {
    const e1 = hot('--a--^---b---c---d---e--|');
    const e1subs = '^       !           ';
    const expected = '--------#           ';

    const predicate = function (x: string) {
      if (x === 'c') {
        throw 'error';
      } else {
        return false;
      }
    };

    expectSource(e1.pipe(last(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
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

      const isBar = (x: any): x is Bar => x && (x as Bar).bar !== undefined;
      const isBaz = (x: any): x is Baz => x && (x as Baz).baz !== undefined;

      const foo: Foo = new Foo();
      of(foo)
        .pipe(last())
        .subscribe(x => x.baz); // x is Foo
      of(foo)
        .pipe(last(foo => foo.bar === 'name'))
        .subscribe(x => x.baz); // x is still Foo
      of(foo)
        .pipe(last(isBar))
        .subscribe(x => x.bar); // x is Bar!

      const foobar: Bar = new Foo(); // type is the interface, not the class
      of(foobar)
        .pipe(last())
        .subscribe(x => x.bar); // x is Bar
      of(foobar)
        .pipe(last(foobar => foobar.bar === 'name'))
        .subscribe(x => x.bar); // x is still Bar
      of(foobar)
        .pipe(last(isBaz))
        .subscribe(x => x.baz); // x is Baz!

      const barish = {bar: 'quack', baz: 42}; // type can quack like a Bar
      of(barish)
        .pipe(last())
        .subscribe(x => x.baz); // x is still { bar: string; baz: number; }
      of(barish)
        .pipe(last(x => x.bar === 'quack'))
        .subscribe(x => x.bar); // x is still { bar: string; baz: number; }
      of(barish)
        .pipe(last(isBar))
        .subscribe(x => x.bar); // x is Bar!
    }

    // type guards with primitive types
    {
      const xs: Observable<string | number> = from([1, 'aaa', 3, 'bb']);

      // This type guard will narrow a `string | number` to a string in the examples below
      const isString = (x: string | number): x is string => typeof x === 'string';

      // missing predicate preserves the type
      xs.pipe(last()).subscribe(x => x); // x is still string | number

      // null predicate preserves the type
      xs.pipe(last(null)).subscribe(x => x); // x is still string | number

      // undefined predicate preserves the type
      xs.pipe(last(undefined)).subscribe(x => x); // x is still string | number

      // After the type guard `last` predicates, the type is narrowed to string
      xs.pipe(last(isString)).subscribe(s => s.length); // s is string

      // boolean predicates preserve the type
      xs.pipe(last(x => typeof x === 'string')).subscribe(x => x); // x is still string | number
    }

    // tslint:disable enable
  });
});

describe('sample', () => {
  asDiagram('sample')('should get samples when the notifier emits', () => {
    const e1 = hot('---a----b---c----------d-----|   ');
    const e1subs = '^                            !   ';
    const e2 = hot('-----x----------x---x------x---|');
    const e2subs = '^                            !   ';
    const expected = '-----a----------c----------d-|   ';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
  it('should enforce parameter', () => {
    const a = of(1, 2, 3).pipe(sample()); // $ExpectError
  });

  it('should accept observable as notifier parameter', () => {
    const a = of(1, 2, 3).pipe(sample(of(4))); // $ExpectType Observable<number>
    const b = of(1, 2, 3).pipe(sample(of('a'))); // $ExpectType Observable<number>
  });

  it('should sample nothing if source has not nexted at all', () => {
    const e1 = hot('----a-^------------|');
    const e1subs = '^            !';
    const e2 = hot('-----x-------|');
    const e2subs = '^            !';
    const expected = '-------------|';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should behave properly when notified by the same observable as the source (issue #2075)', () => {
    const item$ = new Subject<number>();
    const results: number[] = [];

    item$.pipe(sample(item$)).subscribe(value => results.push(value));

    item$.next(1);
    item$.next(2);
    item$.next(3);

    expect(results).toEqual([1, 2, 3]);
  });

  it('should sample nothing if source has nexted after all notifications, but notifier does not complete', () => {
    const e1 = hot('----a-^------b-----|');
    const e1subs = '^            !';
    const e2 = hot('-----x--------');
    const e2subs = '^            !';
    const expected = '-------------|';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should sample when the notifier completes', () => {
    const e1 = hot('----a-^------b----------|');
    const e1subs = '^                 !';
    const e2 = hot('-----x-----|');
    const e2subs = '^          !';
    const expected = '-----------b------|';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not complete when the notifier completes, nor should it emit', () => {
    const e1 = hot('----a----b----c----d----e----f----');
    const e1subs = '^                                 ';
    const e2 = hot('------x-|                         ');
    const e2subs = '^       !                         ';
    const expected = '------a---------------------------';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should complete only when the source completes, if notifier completes early', () => {
    const e1 = hot('----a----b----c----d----e----f---|');
    const e1subs = '^                                !';
    const e2 = hot('------x-|                         ');
    const e2subs = '^       !                         ';
    const expected = '------a--------------------------|';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('----a-^--b----c----d----e----f----|          ');
    const unsub = '              !                        ';
    const e1subs = '^             !                        ';
    const e2 = hot('-----x----------x----------x----------|');
    const e2subs = '^             !                        ';
    const expected = '-----b---------                        ';

    expectSource(e1.pipe(sample(e2)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('----a-^--b----c----d----e----f----|          ');
    const e1subs = '^             !                        ';
    const e2 = hot('-----x----------x----------x----------|');
    const e2subs = '^             !                        ';
    const expected = '-----b---------                        ';
    const unsub = '              !                        ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      sample(e2),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should only sample when a new value arrives, even if it is the same value', () => {
    const e1 = hot('----a----b----c----c----e----f----|  ');
    const e1subs = '^                                 !  ';
    const e2 = hot('------x-x------xx-x---x----x--------|');
    const e2subs = '^                                 !  ';
    const expected = '------a--------c------c----e------|  ';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error if source raises error', () => {
    const e1 = hot('----a-^--b----c----d----#                    ');
    const e1subs = '^                 !                    ';
    const e2 = hot('-----x----------x----------x----------|');
    const e2subs = '^                 !                    ';
    const expected = '-----b----------d-#                    ';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should completes if source does not emits', () => {
    const e1 = hot('|');
    const e2 = hot('------x-------|');
    const expected = '|';
    const e1subs = '(^!)';
    const e2subs = '(^!)';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error if source throws immediately', () => {
    const e1 = hot('#');
    const e2 = hot('------x-------|');
    const expected = '#';
    const e1subs = '(^!)';
    const e2subs = '(^!)';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error if notification raises error', () => {
    const e1 = hot('--a-----|');
    const e2 = hot('----#');
    const expected = '----#';
    const e1subs = '^   !';
    const e2subs = '^   !';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not completes if source does not complete', () => {
    const e1 = hot('-');
    const e1subs = '^              ';
    const e2 = hot('------x-------|');
    const e2subs = '^             !';
    const expected = '-';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should sample only until source completes', () => {
    const e1 = hot('----a----b----c----d-|');
    const e1subs = '^                    !';
    const e2 = hot('-----------x----------x------------|');
    const e2subs = '^                    !';
    const expected = '-----------b---------|';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should complete sampling if sample observable completes', () => {
    const e1 = hot('----a----b----c----d-|');
    const e1subs = '^                    !';
    const e2 = hot('|');
    const e2subs = '(^!)';
    const expected = '---------------------|';

    expectSource(e1.pipe(sample(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
});

describe('sampleTime', () => {
  asDiagram('sampleTime(70)')('should get samples on a delay', () => {
    const e1 = hot('a---b-c---------d--e---f-g-h--|');
    const e1subs = '^                             !';
    const expected = '-------c-------------e------h-|';
    // timer          -------!------!------!------!--

    expectSource(e1.pipe(sampleTime(70, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
  it('should enforce period parameter', () => {
    const a = of(1, 2, 3).pipe(sampleTime()); // $ExpectError
  });

  it('should infer correctly', () => {
    const a = of(1, 2, 3).pipe(sampleTime(1000)); // $ExpectType Observable<number>
  });

  it('should accept scheduler parameter', () => {
    const a = of(1, 2, 3).pipe(sampleTime(1000, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should sample nothing if new value has not arrived', () => {
    const e1 = hot('----a-^--b----c--------------f----|');
    const e1subs = '^                           !';
    const expected = '-----------c----------------|';
    // timer              -----------!----------!---------

    expectSource(e1.pipe(sampleTime(110, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should sample if new value has arrived, even if it is the same value', () => {
    const e1 = hot('----a-^--b----c----------c---f----|');
    const e1subs = '^                           !';
    const expected = '-----------c----------c-----|';
    // timer              -----------!----------!---------

    expectSource(e1.pipe(sampleTime(110, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should sample nothing if source has not nexted by time of sample', () => {
    const e1 = hot('----a-^-------------b-------------|');
    const e1subs = '^                           !';
    const expected = '----------------------b-----|';
    // timer              -----------!----------!---------

    expectSource(e1.pipe(sampleTime(110, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source raises error', () => {
    const e1 = hot('----a-^--b----c----d----#');
    const e1subs = '^                 !';
    const expected = '-----------c------#';
    // timer              -----------!----------!---------

    expectSource(e1.pipe(sampleTime(110, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('----a-^--b----c----d----e----f----|');
    const unsub = '                !            ';
    const e1subs = '^               !            ';
    const expected = '-----------c-----            ';
    // timer              -----------!----------!---------

    expectSource(e1.pipe(sampleTime(110, rxTestScheduler)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('----a-^--b----c----d----e----f----|');
    const e1subs = '^               !            ';
    // timer              -----------!----------!---------
    const expected = '-----------c-----            ';
    const unsub = '                !            ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      sampleTime(110, rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should completes if source does not emits', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(sampleTime(60, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source throws immediately', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(sampleTime(60, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not completes if source does not complete', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(sampleTime(60, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

describe('single', () => {
  asDiagram('single')(
    'should raise error from empty predicate if observable emits multiple time',
    () => {
      const e1 = hot('--a--b--c--|');
      const e1subs = '^    !      ';
      const expected = '-----#      ';
      const errorMsg = 'Sequence contains more than one element';

      expectSource(e1.pipe(single())).toBe(expected, null, errorMsg);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should infer correctly', () => {
    const o = of('foo').pipe(single()); // $ExpectType Observable<string>
  });

  it('should support a value', () => {
    const o = of('foo').pipe(single(value => value === 'foo')); // $ExpectType Observable<string>
  });

  it('should support an index', () => {
    const o = of('foo').pipe(single((value, index) => index === 2)); // $Observable<string>
  });

  it('should support a source', () => {
    const o = of('foo').pipe(single((value, index, source) => value === 'foo')); // $Observable<string>
  });

  it('should enforce value type', () => {
    const o = of('foo').pipe(single((value: number) => value === 2)); // $ExpectError
  });

  it('should enforce return type', () => {
    const o = of('foo').pipe(single(value => value)); // $ExpectError
  });

  it('should enforce index type', () => {
    const o = of('foo').pipe(single((value, index: string) => index === '2')); // $ExpectError
  });

  it('should enforce source type', () => {
    const o = of('foo').pipe(
      single((value, index, source: Observable<number>) => value === 'foo')
    ); // $ExpectError
  });

  it('should raise error from empty predicate if observable does not emit', () => {
    const e1 = hot('--a--^--|');
    const e1subs = '^  !';
    const expected = '---#';

    expectSource(e1.pipe(single())).toBe(expected, null, new EmptyError());
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return only element from empty predicate if observable emits only once', () => {
    const e1 = hot('--a--|');
    const e1subs = '^    !';
    const expected = '-----(a|)';

    expectSource(e1.pipe(single())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--b--c--|');
    const unsub = '   !        ';
    const e1subs = '^  !        ';
    const expected = '----        ';

    expectSource(e1.pipe(single()), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^  !        ';
    const expected = '----        ';
    const unsub = '   !        ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      single(),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error from empty predicate if observable emits error', () => {
    const e1 = hot('--a--b^--#');
    const e1subs = '^  !';
    const expected = '---#';

    expectSource(e1.pipe(single())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error from predicate if observable emits error', () => {
    const e1 = hot('--a--b^--#');
    const e1subs = '^  !';
    const expected = '---#';

    const predicate = function (value: string) {
      return value === 'c';
    };

    expectSource(e1.pipe(single(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if predicate throws error', () => {
    const e1 = hot('--a--b--c--d--|');
    const e1subs = '^          !   ';
    const expected = '-----------#   ';

    const predicate = function (value: string) {
      if (value !== 'd') {
        return false;
      }
      throw 'error';
    };

    expectSource(e1.pipe(single(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return element from predicate if observable have single matching element', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';
    const expected = '-----------(b|)';

    const predicate = function (value: string) {
      return value === 'b';
    };

    expectSource(e1.pipe(single(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error from predicate if observable have multiple matching element', () => {
    const e1 = hot('--a--b--a--b--b--|');
    const e1subs = '^          !      ';
    const expected = '-----------#      ';

    const predicate = function (value: string) {
      return value === 'b';
    };

    expectSource(e1.pipe(single(predicate))).toBe(
      expected,
      null,
      'Sequence contains more than one element'
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error from predicate if observable does not emit', () => {
    const e1 = hot('--a--^--|');
    const e1subs = '^  !';
    const expected = '---#';

    const predicate = function (value: string) {
      return value === 'a';
    };

    expectSource(e1.pipe(single(predicate))).toBe(expected, null, new EmptyError());
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return undefined from predicate if observable does not contain matching element', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';
    const expected = '-----------(z|)';

    const predicate = function (value: string) {
      return value === 'x';
    };

    expectSource(e1.pipe(single(predicate))).toBe(expected, {z: undefined});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should call predicate with indices starting at 0', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';
    const expected = '-----------(b|)';

    let indices: number[] = [];
    const predicate = function (value: string, index: number) {
      indices.push(index);
      return value === 'b';
    };

    expectSource(
      e1.pipe(
        single(predicate),
        tap(null, null, () => {
          expect(indices).toEqual([0, 1, 2]);
        })
      )
    ).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

describe('skip', () => {
  asDiagram('skip(3)')('should skip values before a total', () => {
    const source = hot('--a--b--c--d--e--|');
    const subs = '^                !';
    const expected = '-----------d--e--|';

    expectSource(source.pipe(skip(3))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
  it('should infer correctly', () => {
    const o = of('foo', 'bar', 'baz').pipe(skip(7)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skip()); // $ExpectError
    const p = of('foo', 'bar', 'baz').pipe(skip('7')); // $ExpectError
  });

  it('should skip all values without error if total is more than actual number of values', () => {
    const source = hot('--a--b--c--d--e--|');
    const subs = '^                !';
    const expected = '-----------------|';

    expectSource(source.pipe(skip(6))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should skip all values without error if total is same as actual number of values', () => {
    const source = hot('--a--b--c--d--e--|');
    const subs = '^                !';
    const expected = '-----------------|';

    expectSource(source.pipe(skip(5))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not skip if count is zero', () => {
    const source = hot('--a--b--c--d--e--|');
    const subs = '^                !';
    const expected = '--a--b--c--d--e--|';

    expectSource(source.pipe(skip(0))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const source = hot('--a--b--c--d--e--|');
    const unsub = '          !       ';
    const subs = '^         !       ';
    const expected = '--------c--       ';

    expectSource(source.pipe(skip(2)), unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = hot('--a--b--c--d--e--|');
    const subs = '^         !       ';
    const expected = '--------c--       ';
    const unsub = '          !       ';

    const result = source.pipe(
      mergeMap((x: string) => of(x)),
      skip(2),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should raise error if skip count is more than actual number of emits and source raises error', () => {
    const source = hot('--a--b--c--d--#');
    const subs = '^             !';
    const expected = '--------------#';

    expectSource(source.pipe(skip(6))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should raise error if skip count is same as emits of source and source raises error', () => {
    const source = hot('--a--b--c--d--#');
    const subs = '^             !';
    const expected = '--------------#';

    expectSource(source.pipe(skip(4))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should skip values before a total and raises error if source raises error', () => {
    const source = hot('--a--b--c--d--#');
    const subs = '^             !';
    const expected = '-----------d--#';

    expectSource(source.pipe(skip(3))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should complete regardless of skip count if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(skip(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not complete if source never completes without emit', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(skip(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should skip values before total and never completes if source emits and does not complete', () => {
    const e1 = hot('--a--b--c-');
    const e1subs = '^         ';
    const expected = '-----b--c-';

    expectSource(e1.pipe(skip(1))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should skip all values and never completes if total is more than numbers of value and source does not complete', () => {
    const e1 = hot('--a--b--c-');
    const e1subs = '^         ';
    const expected = '----------';

    expectSource(e1.pipe(skip(6))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should skip all values and never completes if total is same asnumbers of value and source does not complete', () => {
    const e1 = hot('--a--b--c-');
    const e1subs = '^         ';
    const expected = '----------';

    expectSource(e1.pipe(skip(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(skip(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

describe('skipLast', () => {
  asDiagram('skipLast(2)')(
    'should skip two values of an observable with many values',
    () => {
      const e1 = cold('--a-----b----c---d--|');
      const e1subs = '^                   !';
      const expected = '-------------a---b--|';

      expectSource(e1.pipe(skipLast(2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );
  it('should infer correctly', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipLast(7)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipLast()); // $ExpectError
    const p = of('foo', 'bar', 'baz').pipe(skipLast('7')); // $ExpectError
  });

  it('should skip last three values', () => {
    const e1 = cold('--a-----b----c---d--|');
    const e1subs = '^                   !';
    const expected = '-----------------a--|';

    expectSource(e1.pipe(skipLast(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should skip all values when trying to take larger then source', () => {
    const e1 = cold('--a-----b----c---d--|');
    const e1subs = '^                   !';
    const expected = '--------------------|';

    expectSource(e1.pipe(skipLast(5))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should skip all element when try to take exact', () => {
    const e1 = cold('--a-----b----c---d--|');
    const e1subs = '^                   !';
    const expected = '--------------------|';

    expectSource(e1.pipe(skipLast(4))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not skip any values', () => {
    const e1 = cold('--a-----b----c---d--|');
    const e1subs = '^                   !';
    const expected = '--a-----b----c---d--|';

    expectSource(e1.pipe(skipLast(0))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(skipLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should go on forever on never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(skipLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should skip one value from an observable with one value', () => {
    const e1 = hot('---(a|)');
    const e1subs = '^  !   ';
    const expected = '---|   ';

    expectSource(e1.pipe(skipLast(1))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should skip one value from an observable with many values', () => {
    const e1 = hot('--a--^--b----c---d--|');
    const e1subs = '^              !';
    const expected = '--------b---c--|';

    expectSource(e1.pipe(skipLast(1))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with empty and early emission', () => {
    const e1 = hot('--a--^----|');
    const e1subs = '^    !';
    const expected = '-----|';

    expectSource(e1.pipe(skipLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should propagate error from the source observable', () => {
    const e1 = hot('---^---#', undefined, 'too bad');
    const e1subs = '^   !';
    const expected = '----#';

    expectSource(e1.pipe(skipLast(42))).toBe(expected, null, 'too bad');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should propagate error from an observable with values', () => {
    const e1 = hot('---^--a--b--#');
    const e1subs = '^        !';
    const expected = '---------#';

    expectSource(e1.pipe(skipLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('---^--a--b-----c--d--e--|');
    const unsub = '         !            ';
    const e1subs = '^        !            ';
    const expected = '----------            ';

    expectSource(e1.pipe(skipLast(42)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(skipLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should throw if total is less than zero', () => {
    expect(() => {
      range(0, 10).pipe(skipLast(-1));
    }).to.throw(OutOfRangeError);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const e1 = hot('---^--a--b-----c--d--e--|');
    const unsub = '         !            ';
    const e1subs = '^        !            ';
    const expected = '----------            ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      skipLast(42),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

describe('skipUntil', () => {
  asDiagram('skipUntil')('should skip values until another observable notifies', () => {
    const e1 = hot('--a--b--c--d--e----|');
    const e1subs = '^                  !';
    const skip = hot('---------x------|   ');
    const skipSubs = '^        !          ';
    const expected = '-----------d--e----|';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });
  it('should infer correctly', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipUntil(of(4, 'RxJS', 7))); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipUntil()); // $ExpectError
    const p = of('foo', 'bar', 'baz').pipe(skipUntil('7')); // $ExpectError
  });

  it('should emit elements after notifer emits', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^                !';
    const skip = hot('---------x----|   ');
    const skipSubs = '^        !        ';
    const expected = '-----------d--e--|';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should emit elements after a synchronous notifier emits', () => {
    const values: string[] = [];

    of('a', 'b')
      .pipe(skipUntil(of('x')))
      .subscribe(
        value => values.push(value),
        err => {
          throw err;
        },
        () => expect(values).toEqual(['a', 'b'])
      );
  });

  it('should raise an error if notifier throws and source is hot', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^            !    ';
    const skip = hot('-------------#    ');
    const skipSubs = '^            !    ';
    const expected = '-------------#    ';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should skip all elements when notifier does not emit and completes early', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^                !';
    const skip = hot('------------|');
    const skipSubs = '^           !';
    const expected = '-----------------|';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--b--c--d--e----|');
    const unsub = '         !          ';
    const e1subs = '^        !          ';
    const skip = hot('-------------x--|   ');
    const skipSubs = '^        !          ';
    const expected = '----------          ';

    expectSource(e1.pipe(skipUntil(skip)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b--c--d--e----|');
    const e1subs = '^        !          ';
    const skip = hot('-------------x--|   ');
    const skipSubs = '^        !          ';
    const expected = '----------          ';
    const unsub = '         !          ';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      skipUntil(skip),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should not break unsubscription chains with interop inners when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b--c--d--e----|');
    const e1subs = '^        !          ';
    const skip = hot('-------------x--|   ');
    const skipSubs = '^        !          ';
    const expected = '----------          ';
    const unsub = '         !          ';

    // This test is the same as the previous test, but the observable is
    // manipulated to make it look like an interop observable - an observable
    // from a foreign library. Interop subscribers are treated differently:
    // they are wrapped in a safe subscriber. This test ensures that
    // unsubscriptions are chained all the way to the interop subscriber.

    const result = e1.pipe(
      mergeMap(x => of(x)),
      skipUntil(asInterop(skip)),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should skip all elements when notifier is empty', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^                !';
    const skip = cold('|');
    const skipSubs = '(^!)';
    const expected = '-----------------|';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should keep subscription to source, to wait for its eventual completion', () => {
    const e1 = hot('------------------------------|');
    const e1subs = '^                             !';
    const skip = hot('-------|                       ');
    const skipSubs = '^      !                       ';
    const expected = '------------------------------|';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should not complete if hot source observable does not complete', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const skip = hot('-------------x--|');
    const skipSubs = '^            !   ';
    const expected = '-';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should not complete if cold source observable never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const skip = hot('-------------x--|');
    const skipSubs = '^            !   ';
    const expected = '-';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should raise error if cold source is never and notifier errors', () => {
    const e1 = cold('-');
    const e1subs = '^            !';
    const skip = hot('-------------#');
    const skipSubs = '^            !';
    const expected = '-------------#';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should skip all elements and complete if notifier is cold never', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^                !';
    const skip = cold('-');
    const skipSubs = '^                !';
    const expected = '-----------------|';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should skip all elements and complete if notifier is a hot never', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = '^                !';
    const skip = hot('-');
    const skipSubs = '^                !';
    const expected = '-----------------|';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should skip all elements and complete, even if notifier would not complete until later', () => {
    const e1 = hot('^-a--b--c--d--e--|');
    const e1subs = '^                !';
    const skip = hot('^-----------------------|');
    const skipSubs = '^                !';
    const expected = '-----------------|';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should not complete if source does not complete if notifier completes without emission', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const skip = hot('--------------|');
    const skipSubs = '^             !';
    const expected = '-';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should not complete if source and notifier are both hot never', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const skip = hot('-');
    const skipSubs = '^';
    const expected = '-';

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(skip.subscriptions).toBe(skipSubs);
  });

  it('should skip skip all elements if notifier is unsubscribed explicitly before the notifier emits', () => {
    const e1 = hot('--a--b--c--d--e--|');
    const e1subs = ['^                !', '^                !']; // for the explicit subscribe some lines below
    const skip = new Subject<string>();
    const expected = '-----------------|';

    e1.subscribe((x: string) => {
      if (x === 'd' && !skip.closed) {
        skip.next('x');
      }

      skip.unsubscribe();
    });

    expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should unsubscribe the notifier after its first nexted value', () => {
    const source = hot('-^-o---o---o---o---o---o---|');
    const notifier = hot('-^--------n--n--n--n--n--n-|');
    const nSubs = '^        !';
    const expected = '-^---------o---o---o---o---|';
    const result = source.pipe(skipUntil(notifier));

    expectSource(result).toBe(expected);
    expectSubscriptions(notifier.subscriptions).toBe(nSubs);
  });

  it('should stop listening to a synchronous notifier after its first nexted value', () => {
    const sideEffects: number[] = [];
    const synchronousNotifer = concat(
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
    of(null)
      .pipe(skipUntil(synchronousNotifer))
      .subscribe(() => {});
    expect(sideEffects).toEqual([1]);
  });
});

describe('skipWhile', () => {
  asDiagram('skipWhile(x => x < 4)')(
    'should skip all elements until predicate is false',
    () => {
      const source = hot('-1-^2--3--4--5--6--|');
      const sourceSubs = '^               !';
      const expected = '-------4--5--6--|';

      const predicate = function (v: string) {
        return +v < 4;
      };

      expectSource(source.pipe(skipWhile(predicate))).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    }
  );
  it('should support a predicate', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipWhile(value => value === 'bar')); // $ExpectType Observable<string>
  });

  it('should support a predicate with an index', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipWhile((value, index) => index < 3)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipWhile()); // $ExpectError
  });

  it('should enforce predicate types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipWhile(value => value < 3)); // $ExpectError
    const p = of('foo', 'bar', 'baz').pipe(skipWhile((value, index) => index < '3')); // $ExpectError
  });

  it('should enforce predicate return type', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipWhile(value => value)); // $ExpectError
  });

  it('should skip all elements with a true predicate', () => {
    const source = hot('-1-^2--3--4--5--6--|');
    const sourceSubs = '^               !';
    const expected = '----------------|';

    expectSource(source.pipe(skipWhile(() => true))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should skip all elements with a truthy predicate', () => {
    const source = hot('-1-^2--3--4--5--6--|');
    const sourceSubs = '^               !';
    const expected = '----------------|';

    expectSource(
      source.pipe(
        skipWhile((): any => {
          return {};
        })
      )
    ).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not skip any element with a false predicate', () => {
    const source = hot('-1-^2--3--4--5--6--|');
    const sourceSubs = '^               !';
    const expected = '-2--3--4--5--6--|';

    expectSource(source.pipe(skipWhile(() => false))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not skip any elements with a falsy predicate', () => {
    const source = hot('-1-^2--3--4--5--6--|');
    const sourceSubs = '^               !';
    const expected = '-2--3--4--5--6--|';

    expectSource(source.pipe(skipWhile(() => undefined as any))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should skip elements on hot source', () => {
    const source = hot('--1--2-^-3--4--5--6--7--8--');
    const sourceSubs = '^                   ';
    const expected = '--------5--6--7--8--';

    const predicate = function (v: string) {
      return +v < 5;
    };

    expectSource(source.pipe(skipWhile(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it("should be possible to skip using the element's index", () => {
    const source = hot('--a--b-^-c--d--e--f--g--h--|');
    const sourceSubs = '^                   !';
    const expected = '--------e--f--g--h--|';

    const predicate = function (v: string, index: number) {
      return index < 2;
    };

    expectSource(source.pipe(skipWhile(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should skip using index with source unsubscribes early', () => {
    const source = hot('--a--b-^-c--d--e--f--g--h--|');
    const sourceSubs = '^          !';
    const unsub = '-----------!';
    const expected = '-----d--e---';

    const predicate = function (v: string, index: number) {
      return index < 1;
    };

    expectSource(source.pipe(skipWhile(predicate)), unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = hot('--a--b-^-c--d--e--f--g--h--|');
    const sourceSubs = '^          !';
    const expected = '-----d--e---';
    const unsub = '           !';

    const predicate = function (v: string, index: number) {
      return index < 1;
    };

    const result = source.pipe(
      mergeMap(function (x) {
        return of(x);
      }),
      skipWhile(predicate),
      mergeMap(function (x) {
        return of(x);
      })
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should skip using value with source throws', () => {
    const source = hot('--a--b-^-c--d--e--f--g--h--#');
    const sourceSubs = '^                   !';
    const expected = '-----d--e--f--g--h--#';

    const predicate = function (v: string) {
      return v !== 'd';
    };

    expectSource(source.pipe(skipWhile(predicate))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should invoke predicate while its false and never again', () => {
    const source = hot('--a--b-^-c--d--e--f--g--h--|');
    const sourceSubs = '^                   !';
    const expected = '--------e--f--g--h--|';

    let invoked = 0;
    const predicate = function (v: string) {
      invoked++;
      return v !== 'e';
    };

    expectSource(
      source.pipe(
        skipWhile(predicate),
        tap(null, null, () => {
          expect(invoked).to.equal(3);
        })
      )
    ).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should handle predicate that throws', () => {
    const source = hot('--a--b-^-c--d--e--f--g--h--|');
    const sourceSubs = '^       !';
    const expected = '--------#';

    const predicate = function (v: string) {
      if (v === 'e') {
        throw new Error("nom d'une pipe !");
      }

      return v !== 'f';
    };

    expectSource(source.pipe(skipWhile(predicate))).toBe(
      expected,
      undefined,
      new Error("nom d'une pipe !")
    );
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should handle Observable.empty', () => {
    const source = cold('|');
    const subs = '(^!)';
    const expected = '|';

    expectSource(source.pipe(skipWhile(() => true))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should handle Observable.never', () => {
    const source = cold('-');
    const subs = '^';
    const expected = '-';

    expectSource(source.pipe(skipWhile(() => true))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should handle Observable.throw', () => {
    const source = cold('#');
    const subs = '(^!)';
    const expected = '#';

    expectSource(source.pipe(skipWhile(() => true))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});

describe('take', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('take(2)')('should take two values of an observable with many values', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' --a-----b----c---d--|');
      const e1subs = '  ^-------!------------';
      const expected = '--a-----(b|)         ';

      expectSource(e1.pipe(take(2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(take(7)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(take('7')); // $ExpectError
  });

  it('should work with empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)';
      const expected = '|';

      expectSource(e1.pipe(take(42))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should go on forever on never', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('-');
      const e1subs = '  ^';
      const expected = '-';

      expectSource(e1.pipe(take(42))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should be empty on take(0)', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b----c---d--|');
      const e1subs: string[] = []; // Don't subscribe at all
      const expected = '   |';

      expectSource(e1.pipe(take(0))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should take one value of an observable with one value', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---(a|)');
      const e1subs = '  ^--!---';
      const expected = '---(a|)';

      expectSource(e1.pipe(take(1))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should take one values of an observable with many values', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b----c---d--|');
      const e1subs = '     ^--!------------';
      const expected = '   ---(b|)         ';

      expectSource(e1.pipe(take(1))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should error on empty', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^----|');
      const e1subs = '     ^----!';
      const expected = '   -----|';

      expectSource(e1.pipe(take(42))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should propagate error from the source observable', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^---#', undefined, 'too bad');
      const e1subs = '   ^---!';
      const expected = ' ----#';

      expectSource(e1.pipe(take(42))).toBe(expected, null, 'too bad');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should propagate error from an observable with values', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^--a--b--#');
      const e1subs = '   ^--------!';
      const expected = ' ---a--b--#';

      expectSource(e1.pipe(take(42))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should allow unsubscribing explicitly and early', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^--a--b-----c--d--e--|');
      const unsub = '    ---------!------------';
      const e1subs = '   ^--------!------------';
      const expected = ' ---a--b---            ';

      expectSource(e1.pipe(take(42)), unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should work with throw', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' #');
      const e1subs = '  (^!)';
      const expected = '#';

      expectSource(e1.pipe(take(42))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should throw if total is less than zero', () => {
    expect(() => {
      range(0, 10).pipe(take(-1));
    }).to.throw(OutOfRangeError);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^--a--b-----c--d--e--|');
      const unsub = '    ---------!            ';
      const e1subs = '   ^--------!            ';
      const expected = ' ---a--b---            ';

      const result = e1.pipe(
        mergeMap((x: string) => of(x)),
        take(42),
        mergeMap((x: string) => of(x))
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should unsubscribe from the source when it reaches the limit', () => {
    const source = new Observable<number>(observer => {
      expect(observer.closed).to.be.false;
      observer.next(42);
      expect(observer.closed).to.be.true;
    }).pipe(take(1));

    source.subscribe();
  });

  it('should complete when the source is reentrant', () => {
    let completed = false;
    const source = new Subject();
    source.pipe(take(5)).subscribe({
      next() {
        source.next();
      },
      complete() {
        completed = true;
      }
    });
    source.next();
    expect(completed).to.be.true;
  });
});

describe('takeLast', () => {
  asDiagram('takeLast(2)')(
    'should take two values of an observable with many values',
    () => {
      const e1 = cold('--a-----b----c---d--|    ');
      const e1subs = '^                   !    ';
      const expected = '--------------------(cd|)';

      expectSource(e1.pipe(takeLast(2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(takeLast(7)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(takeLast('7')); // $ExpectError
  });

  it('should take last three values', () => {
    const e1 = cold('--a-----b----c---d--|    ');
    const e1subs = '^                   !    ';
    const expected = '--------------------(bcd|)';

    expectSource(e1.pipe(takeLast(3))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take all element when try to take larger then source', () => {
    const e1 = cold('--a-----b----c---d--|    ');
    const e1subs = '^                   !    ';
    const expected = '--------------------(abcd|)';

    expectSource(e1.pipe(takeLast(5))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take all element when try to take exact', () => {
    const e1 = cold('--a-----b----c---d--|    ');
    const e1subs = '^                   !    ';
    const expected = '--------------------(abcd|)';

    expectSource(e1.pipe(takeLast(4))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not take any values', () => {
    const e1 = cold('--a-----b----c---d--|');
    const expected = '|';

    expectSource(e1.pipe(takeLast(0))).toBe(expected);
  });

  it('should work with empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(takeLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should go on forever on never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(takeLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should be empty on takeLast(0)', () => {
    const e1 = hot('--a--^--b----c---d--|');
    const e1subs: string[] = []; // Don't subscribe at all
    const expected = '|';

    expectSource(e1.pipe(takeLast(0))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take one value from an observable with one value', () => {
    const e1 = hot('---(a|)');
    const e1subs = '^  !   ';
    const expected = '---(a|)';

    expectSource(e1.pipe(takeLast(1))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take one value from an observable with many values', () => {
    const e1 = hot('--a--^--b----c---d--|   ');
    const e1subs = '^              !   ';
    const expected = '---------------(d|)';

    expectSource(e1.pipe(takeLast(1))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should error on empty', () => {
    const e1 = hot('--a--^----|');
    const e1subs = '^    !';
    const expected = '-----|';

    expectSource(e1.pipe(takeLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should propagate error from the source observable', () => {
    const e1 = hot('---^---#', undefined, 'too bad');
    const e1subs = '^   !';
    const expected = '----#';

    expectSource(e1.pipe(takeLast(42))).toBe(expected, null, 'too bad');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should propagate error from an observable with values', () => {
    const e1 = hot('---^--a--b--#');
    const e1subs = '^        !';
    const expected = '---------#';

    expectSource(e1.pipe(takeLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('---^--a--b-----c--d--e--|');
    const unsub = '         !            ';
    const e1subs = '^        !            ';
    const expected = '----------            ';

    expectSource(e1.pipe(takeLast(42)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(takeLast(42))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should throw if total is less than zero', () => {
    expect(() => {
      range(0, 10).pipe(takeLast(-1));
    }).to.throw(OutOfRangeError);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const e1 = hot('---^--a--b-----c--d--e--|');
    const unsub = '         !            ';
    const e1subs = '^        !            ';
    const expected = '----------            ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      takeLast(42),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

describe('takeUntil', () => {
  asDiagram('takeUntil')('should take values until notifier emits', () => {
    const e1 = hot('--a--b--c--d--e--f--g--|');
    const e1subs = '^            !          ';
    const e2 = hot('-------------z--|       ');
    const e2subs = '^            !          ';
    const expected = '--a--b--c--d-|          ';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(takeUntil(of(1, 2, 3))); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(takeUntil(value => value < 3)); // $ExpectError
  });

  it('should take values and raises error when notifier raises error', () => {
    const e1 = hot('--a--b--c--d--e--f--g--|');
    const e1subs = '^            !          ';
    const e2 = hot('-------------#          ');
    const e2subs = '^            !          ';
    const expected = '--a--b--c--d-#          ';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should take all values when notifier is empty', () => {
    const e1 = hot('--a--b--c--d--e--f--g--|');
    const e1subs = '^                      !';
    const e2 = hot('-------------|          ');
    const e2subs = '^            !          ';
    const expected = '--a--b--c--d--e--f--g--|';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should take all values when notifier does not complete', () => {
    const e1 = hot('--a--b--c--d--e--f--g--|');
    const e1subs = '^                      !';
    const e2 = hot('-');
    const e2subs = '^                      !';
    const expected = '--a--b--c--d--e--f--g--|';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should complete without subscribing to the source when notifier synchronously emits', () => {
    const e1 = hot('----a--|');
    const e2 = of(1, 2, 3);
    const expected = '(|)     ';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe([]);
  });

  it('should subscribe to the source when notifier synchronously completes without emitting', () => {
    const e1 = hot('----a--|');
    const e1subs = '^      !';
    const e2 = EMPTY;
    const expected = '----a--|';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--b--c--d--e--f--g--|');
    const e1subs = '^      !                ';
    const e2 = hot('-------------z--|       ');
    const e2subs = '^      !                ';
    const unsub = '       !                ';
    const expected = '--a--b--                ';

    expectSource(e1.pipe(takeUntil(e2)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should complete when notifier emits if source observable does not complete', () => {
    const e1 = hot('-');
    const e1subs = '^ !';
    const e2 = hot('--a--b--|');
    const e2subs = '^ !';
    const expected = '--|';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error when notifier raises error if source observable does not complete', () => {
    const e1 = hot('-');
    const e1subs = '^ !';
    const e2 = hot('--#');
    const e2subs = '^ !';
    const expected = '--#';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not complete when notifier is empty if source observable does not complete', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const e2 = hot('--|');
    const e2subs = '^ !';
    const expected = '---';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not complete when source and notifier do not complete', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const e2 = hot('-');
    const e2subs = '^';
    const expected = '-';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should complete when notifier emits before source observable emits', () => {
    const e1 = hot('----a--|');
    const e1subs = '^ !     ';
    const e2 = hot('--x     ');
    const e2subs = '^ !     ';
    const expected = '--|     ';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error if source raises error before notifier emits', () => {
    const e1 = hot('--a--b--c--d--#     ');
    const e1subs = '^             !     ';
    const e2 = hot('----------------a--|');
    const e2subs = '^             !     ';
    const expected = '--a--b--c--d--#     ';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error immediately if source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const e2 = hot('--x');
    const e2subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should dispose source observable if notifier emits before source emits', () => {
    const e1 = hot('---a---|');
    const e1subs = '^ !     ';
    const e2 = hot('--x-|   ');
    const e2subs = '^ !     ';
    const expected = '--|     ';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should dispose notifier if source observable completes', () => {
    const e1 = hot('--a--|     ');
    const e1subs = '^    !     ';
    const e2 = hot('-------x--|');
    const e2subs = '^    !     ';
    const expected = '--a--|     ';

    expectSource(e1.pipe(takeUntil(e2))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const e1 = hot('--a--b--c--d--e--f--g--|');
    const e1subs = '^      !                ';
    const e2 = hot('-------------z--|       ');
    const e2subs = '^      !                ';
    const unsub = '       !                ';
    const expected = '--a--b--                ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      takeUntil(e2),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
});

describe('takeWhile', () => {
  asDiagram('takeWhile(x => x < 4)')(
    'should take all elements until predicate is false',
    () => {
      const source = hot('-1-^2--3--4--5--6--|');
      const sourceSubs = '^      !         ';
      const expected = '-2--3--|         ';

      const result = source.pipe(takeWhile((v: any) => +v < 4));

      expectSource(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    }
  );
  it('should support a user-defined type guard', () => {
    const o = of('foo').pipe(takeWhile((s): s is 'foo' => true)); // $ExpectType Observable<"foo">
  });

  it('should support a user-defined type guard with inclusive option', () => {
    const o = of('foo').pipe(takeWhile((s): s is 'foo' => true, false)); // $ExpectType Observable<"foo">
  });

  it('should support a predicate', () => {
    const o = of('foo').pipe(takeWhile(s => true)); // $ExpectType Observable<string>
  });

  it('should support a predicate with inclusive option', () => {
    const o = of('foo').pipe(takeWhile(s => true, true)); // $ExpectType Observable<string>
  });

  it('should take all elements with predicate returns true', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const e1subs = '^             !';
    const expected = '--b--c--d--e--|';

    expectSource(e1.pipe(takeWhile(() => true))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take all elements with truthy predicate', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const e1subs = '^             !';
    const expected = '--b--c--d--e--|';

    expectSource(
      e1.pipe(
        takeWhile(<any>(() => {
          return {};
        }))
      )
    ).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should skip all elements with predicate returns false', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const e1subs = '^ !            ';
    const expected = '--|            ';

    expectSource(e1.pipe(takeWhile(() => false))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should skip all elements with falsy predicate', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const e1subs = '^ !            ';
    const expected = '--|            ';

    expectSource(e1.pipe(takeWhile(() => null as any))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take all elements until predicate return false', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const e1subs = '^       !      ';
    const expected = '--b--c--|      ';

    function predicate(value: string) {
      return value !== 'd';
    }

    expectSource(e1.pipe(takeWhile(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it(
    'should take all elements up to and including the element that made ' +
      'the predicate return false',
    () => {
      const e1 = hot('--a-^-b--c--d--e--|');
      const e1subs = '^       !      ';
      const expected = '--b--c--(d|)   ';

      function predicate(value: string) {
        return value !== 'd';
      }
      const inclusive = true;

      expectSource(e1.pipe(takeWhile(predicate, inclusive))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should take elements with predicate when source does not complete', () => {
    const e1 = hot('--a-^-b--c--d--e--');
    const e1subs = '^             ';
    const expected = '--b--c--d--e--';

    expectSource(e1.pipe(takeWhile(() => true))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not complete when source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const result = e1.pipe(takeWhile(() => true));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete when source does not emit', () => {
    const e1 = hot('--a-^------------|');
    const e1subs = '^            !';
    const expected = '-------------|';

    expectSource(e1.pipe(takeWhile(() => true))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete when source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    const result = e1.pipe(takeWhile(() => true));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should pass element index to predicate', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const e1subs = '^       !      ';
    const expected = '--b--c--|      ';

    function predicate(value: string, index: number) {
      return index < 2;
    }

    expectSource(e1.pipe(takeWhile(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error when source raises error', () => {
    const e1 = hot('--a-^-b--c--d--e--#');
    const e1subs = '^             !';
    const expected = '--b--c--d--e--#';

    expectSource(e1.pipe(takeWhile(() => true))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error when source throws', () => {
    const source = cold('#');
    const subs = '(^!)';
    const expected = '#';

    expectSource(source.pipe(takeWhile(() => true))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should invoke predicate until return false', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const e1subs = '^       !      ';
    const expected = '--b--c--|      ';

    let invoked = 0;
    function predicate(value: string) {
      invoked++;
      return value !== 'd';
    }

    const source = e1.pipe(
      takeWhile(predicate),
      tap(null, null, () => {
        expect(invoked).to.equal(3);
      })
    );
    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if predicate throws', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const e1subs = '^ !            ';
    const expected = '--#            ';

    function predicate(value: string) {
      throw 'error';
    }

    expectSource(e1.pipe(takeWhile(<any>predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take elements until unsubscribed', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const unsub = '-----!         ';
    const e1subs = '^    !         ';
    const expected = '--b---         ';

    function predicate(value: string) {
      return value !== 'd';
    }

    expectSource(e1.pipe(takeWhile(predicate)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const e1 = hot('--a-^-b--c--d--e--|');
    const unsub = '-----!         ';
    const e1subs = '^    !         ';
    const expected = '--b---         ';

    function predicate(value: string) {
      return value !== 'd';
    }

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      takeWhile(predicate),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should support type guards without breaking previous behavior', () => {
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

      const foo: Foo = new Foo();
      of(foo)
        .pipe(takeWhile(foo => foo.baz === 42))
        .subscribe(x => x.baz); // x is still Foo
      of(foo)
        .pipe(takeWhile(isBar))
        .subscribe(x => x.bar); // x is Bar!

      const foobar: Bar = new Foo(); // type is interface, not the class
      of(foobar)
        .pipe(takeWhile(foobar => foobar.bar === 'name'))
        .subscribe(x => x.bar); // <-- x is still Bar
      of(foobar)
        .pipe(takeWhile(isBar))
        .subscribe(x => x.bar); // <--- x is Bar!

      const barish = {bar: 'quack', baz: 42}; // type can quack like a Bar
      of(barish)
        .pipe(takeWhile(x => x.bar === 'quack'))
        .subscribe(x => x.bar); // x is still { bar: string; baz: number; }
      of(barish)
        .pipe(takeWhile(isBar))
        .subscribe(bar => bar.bar); // x is Bar!
    }

    // type guards with primitive types
    {
      const xs: Observable<string | number> = from([1, 'aaa', 3, 'bb']);

      // This type guard will narrow a `string | number` to a string in the examples below
      const isString = (x: string | number): x is string => typeof x === 'string';

      xs.pipe(takeWhile(isString)).subscribe(s => s.length); // s is string

      // In contrast, this type of regular boolean predicate still maintains the original type
      xs.pipe(takeWhile(x => typeof x === 'number')).subscribe(x => x); // x is still string | number
      xs.pipe(takeWhile((x, i) => typeof x === 'number' && x > i)).subscribe(x => x); // x is still string | number
    }
  });
});

describe('throttle', () => {
  asDiagram('throttle')(
    'should immediately emit the first value in each time window',
    () => {
      const e1 = hot('-a-xy-----b--x--cxxx-|');
      const e1subs = '^                    !';
      const e2 = cold('----|                ');
      const e2subs = [
        ' ^   !                ',
        '          ^   !       ',
        '                ^   ! '
      ];
      const expected = '-a--------b-----c----|';

      const result = e1.pipe(throttle(() => e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(throttle(() => timer(47))); // $ExpectType Observable<number>
  });

  it('should infer correctly with a Promise', () => {
    const o = of(1, 2, 3).pipe(
      throttle(
        () => new Promise<boolean>(() => {})
      )
    ); // $ExpectType Observable<number>
  });

  it('should support a config', () => {
    const o = of(1, 2, 3).pipe(
      throttle(() => timer(47), {leading: true, trailing: true})
    ); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(throttle()); // $ExpectError
    const p = of(1, 2, 3).pipe(throttle(() => {})); // $ExpectError
  });

  it('should enforce config types', () => {
    const o = of(1, 2, 3).pipe(throttle(() => timer(47), {x: 1})); // $ExpectError
    const p = of(1, 2, 3).pipe(throttle(() => timer(47), {leading: 1, trailing: 1})); // $ExpectError
    const q = of(1, 2, 3).pipe(throttle(() => timer(47), null)); // $ExpectError
  });

  it('should simply mirror the source if values are not emitted often enough', () => {
    const e1 = hot('-a--------b-----c----|');
    const e1subs = '^                    !';
    const e2 = cold('----|                ');
    const e2subs = [
      ' ^   !                ',
      '          ^   !       ',
      '                ^   ! '
    ];
    const expected = '-a--------b-----c----|';

    const result = e1.pipe(throttle(() => e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should throttle with duration Observable using next to close the duration', () => {
    const e1 = hot('-a-xy-----b--x--cxxx-|');
    const e1subs = '^                    !';
    const e2 = cold('----x-y-z            ');
    const e2subs = [
      ' ^   !                ',
      '          ^   !       ',
      '                ^   ! '
    ];
    const expected = '-a--------b-----c----|';

    const result = e1.pipe(throttle(() => e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should interrupt source and duration when result is unsubscribed early', () => {
    const e1 = hot('-a-x-y-z-xyz-x-y-z----b--x-x-|');
    const unsub = '              !               ';
    const e1subs = '^             !               ';
    const e2 = cold('------------------|          ');
    const e2subs = ' ^            !               ';
    const expected = '-a-------------               ';

    const result = e1.pipe(throttle(() => e2));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('-a-x-y-z-xyz-x-y-z----b--x-x-|');
    const e1subs = '^             !               ';
    const e2 = cold('------------------|          ');
    const e2subs = ' ^            !               ';
    const expected = '-a-------------               ';
    const unsub = '              !               ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      throttle(() => e2),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle a busy producer emitting a regular repeating sequence', () => {
    const e1 = hot('abcdefabcdefabcdefabcdefa|');
    const e1subs = '^                        !';
    const e2 = cold('-----|                    ');
    const e2subs = [
      '^    !                    ',
      '      ^    !              ',
      '            ^    !        ',
      '                  ^    !  ',
      '                        ^!'
    ];
    const expected = 'a-----a-----a-----a-----a|';

    const result = e1.pipe(throttle(() => e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should mirror source if durations are always empty', () => {
    const e1 = hot('abcdefabcdefabcdefabcdefa|');
    const e1subs = '^                        !';
    const e2 = cold('|');
    const expected = 'abcdefabcdefabcdefabcdefa|';

    const result = e1.pipe(throttle(() => e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take only the first value emitted if duration is a never', () => {
    const e1 = hot('----abcdefabcdefabcdefabcdefa|');
    const e1subs = '^                            !';
    const e2 = cold('-');
    const e2subs = '    ^                        !';
    const expected = '----a------------------------|';

    const result = e1.pipe(throttle(() => e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should unsubscribe duration Observable when source raise error', () => {
    const e1 = hot('----abcdefabcdefabcdefabcdefa#');
    const e1subs = '^                            !';
    const e2 = cold('-');
    const e2subs = '    ^                        !';
    const expected = '----a------------------------#';

    const result = e1.pipe(throttle(() => e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error as soon as just-throw duration is used', () => {
    const e1 = hot('----abcdefabcdefabcdefabcdefa|');
    const e1subs = '^   !                         ';
    const e2 = cold('#');
    const e2subs = '    (^!)                      ';
    const expected = '----(a#)                      ';

    const result = e1.pipe(throttle(() => e2));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should throttle using durations of constying lengths', () => {
    const e1 = hot('abcdefabcdabcdefghabca|   ');
    const e1subs = '^                     !   ';
    const e2 = [
      cold('-----|                    '),
      cold('---|                '),
      cold('-------|        '),
      cold('--|     '),
      cold('----|')
    ];
    const e2subs = [
      '^    !                    ',
      '      ^  !                ',
      '          ^      !        ',
      '                  ^ !     ',
      '                     ^!   '
    ];
    const expected = 'a-----a---a-------a--a|   ';

    let i = 0;
    const result = e1.pipe(throttle(() => e2[i++]));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    for (let j = 0; j < e2.length; j++) {
      expectSubscriptions(e2[j].subscriptions).toBe(e2subs[j]);
    }
  });

  it('should propagate error from duration Observable', () => {
    const e1 = hot('abcdefabcdabcdefghabca|   ');
    const e1subs = '^                !        ';
    const e2 = [
      cold('-----|                    '),
      cold('---|                '),
      cold('-------#        ')
    ];
    const e2subs = [
      '^    !                    ',
      '      ^  !                ',
      '          ^      !        '
    ];
    const expected = 'a-----a---a------#        ';

    let i = 0;
    const result = e1.pipe(throttle(() => e2[i++]));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    for (let j = 0; j < e2.length; j++) {
      expectSubscriptions(e2[j].subscriptions).toBe(e2subs[j]);
    }
  });

  it('should propagate error thrown from durationSelector function', () => {
    const s1 = hot('--^--x--x--x--x--x--x--e--x--x--x--|');
    const s1Subs = '^                    !';
    const n1 = cold('----|');
    const n1Subs = [
      '   ^   !                          ',
      '         ^   !                    ',
      '               ^   !              '
    ];
    const exp = '---x-----x-----x-----(e#)';

    let i = 0;
    const result = s1.pipe(
      throttle(() => {
        if (i++ === 3) {
          throw new Error('lol');
        }
        return n1;
      })
    );
    expectSource(result).toBe(exp, undefined, new Error('lol'));
    expectSubscriptions(s1.subscriptions).toBe(s1Subs);
    expectSubscriptions(n1.subscriptions).toBe(n1Subs);
  });

  it('should complete when source does not emit', () => {
    const e1 = hot('-----|');
    const subs = '^    !';
    const expected = '-----|';
    function durationSelector() {
      return cold('-----|');
    }

    expectSource(e1.pipe(throttle(durationSelector))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should raise error when source does not emit and raises error', () => {
    const e1 = hot('-----#');
    const subs = '^    !';
    const expected = '-----#';
    function durationSelector() {
      return cold('-----|');
    }

    expectSource(e1.pipe(throttle(durationSelector))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should handle an empty source', () => {
    const e1 = cold('|');
    const subs = '(^!)';
    const expected = '|';
    function durationSelector() {
      return cold('-----|');
    }

    expectSource(e1.pipe(throttle(durationSelector))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should handle a never source', () => {
    const e1 = cold('-');
    const subs = '^';
    const expected = '-';
    function durationSelector() {
      return cold('-----|');
    }

    expectSource(e1.pipe(throttle(durationSelector))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should handle a throw source', () => {
    const e1 = cold('#');
    const subs = '(^!)';
    const expected = '#';
    function durationSelector() {
      return cold('-----|');
    }

    expectSource(e1.pipe(throttle(durationSelector))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should throttle by promise resolves', (done: MochaDone) => {
    const e1 = concat(
      of(1),
      timer(10).pipe(mapTo(2)),
      timer(10).pipe(mapTo(3)),
      timer(50).pipe(mapTo(4))
    );
    const expected = [1, 2, 3, 4];

    e1.pipe(
      throttle(() => {
        return new Promise((resolve: any) => {
          resolve(42);
        });
      })
    ).subscribe(
      (x: number) => {
        expect(x).to.equal(expected.shift());
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected.length).to.equal(0);
        done();
      }
    );
  });

  it('should raise error when promise rejects', (done: MochaDone) => {
    const e1 = concat(
      of(1),
      timer(10).pipe(mapTo(2)),
      timer(10).pipe(mapTo(3)),
      timer(50).pipe(mapTo(4))
    );
    const expected = [1, 2, 3];
    const error = new Error('error');

    e1.pipe(
      throttle((x: number) => {
        if (x === 3) {
          return new Promise((resolve: any, reject: any) => {
            reject(error);
          });
        } else {
          return new Promise((resolve: any) => {
            resolve(42);
          });
        }
      })
    ).subscribe(
      (x: number) => {
        expect(x).to.equal(expected.shift());
      },
      (err: any) => {
        expect(err).to.be.an('error', 'error');
        expect(expected.length).to.equal(0);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  type('should support selectors of the same type', () => {
    /* tslint:disable:no-unused-variable */
    let o: Observable<number>;
    let s: Observable<number>;
    let r: Observable<number> = o!.pipe(throttle(n => s));
    /* tslint:enable:no-unused-variable */
  });

  type('should support selectors of a different type', () => {
    /* tslint:disable:no-unused-variable */
    let o: Observable<number>;
    let s: Observable<string>;
    let r: Observable<number> = o!.pipe(throttle(n => s));
    /* tslint:enable:no-unused-variable */
  });

  describe('throttle(fn, { leading: true, trailing: true })', () => {
    asDiagram('throttle(fn, { leading: true, trailing: true })')(
      'should immediately emit the first value in each time window',
      () => {
        const e1 = hot('-a-xy-----b--x--cxxx------|');
        const e1subs = '^                         !';
        const e2 = cold('----|                     ');
        const e2subs = [
          ' ^   !                     ',
          '     ^   !                 ',
          '          ^   !            ',
          '              ^   !        ',
          '                  ^   !    ',
          '                      ^   !'
        ];
        const expected = '-a---y----b---x---x---x---|';

        const result = e1.pipe(throttle(() => e2, {leading: true, trailing: true}));

        expectSource(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      }
    );

    it('should work for individual values', () => {
      const s1 = hot('-^-x------------------|');
      const s1Subs = '^                    !';
      const n1 = cold('------------------------|');
      const n1Subs = ['  ^                  !'];
      const exp = '--x------------------|';

      const result = s1.pipe(throttle(() => n1, {leading: true, trailing: true}));
      expectSource(result).toBe(exp);
      expectSubscriptions(s1.subscriptions).toBe(s1Subs);
      expectSubscriptions(n1.subscriptions).toBe(n1Subs);
    });
  });

  describe('throttle(fn, { leading: false, trailing: true })', () => {
    asDiagram('throttle(fn, { leading: false, trailing: true })')(
      'should immediately emit the first value in each time window',
      () => {
        const e1 = hot('-a-xy-----b--x--cxxx------|');
        const e1subs = '^                         !';
        const e2 = cold('----|                     ');
        const e2subs = [
          ' ^   !                     ',
          '     ^   !                 ',
          '          ^   !            ',
          '              ^   !        ',
          '                  ^   !    ',
          '                      ^   !'
        ];
        const expected = '-a---y----b---x---x---x---|';

        const result = e1.pipe(throttle(() => e2, {leading: true, trailing: true}));

        expectSource(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      }
    );

    it('should work for individual values', () => {
      const s1 = hot('-^-x------------------|');
      const s1Subs = '^                    !';
      const n1 = cold('------------------------|');
      const n1Subs = ['  ^                  !'];
      const exp = '--x------------------|';

      const result = s1.pipe(throttle(() => n1, {leading: true, trailing: true}));
      expectSource(result).toBe(exp);
      expectSubscriptions(s1.subscriptions).toBe(s1Subs);
      expectSubscriptions(n1.subscriptions).toBe(n1Subs);
    });
  });
});

describe('throttleTime', () => {
  asDiagram('throttleTime(50)')(
    'should immediately emit the first value in each time window',
    () => {
      const e1 = hot('-a-x-y----b---x-cx---|');
      const subs = '^                    !';
      const expected = '-a--------b-----c----|';

      const result = e1.pipe(throttleTime(50, rxTestScheduler));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    }
  );

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(throttleTime(47)); // $ExpectType Observable<number>
  });

  it('should support a scheduler', () => {
    const o = of(1, 2, 3).pipe(throttleTime(47, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should support a config', () => {
    const o = of(1, 2, 3).pipe(
      throttleTime(47, asyncScheduler, {leading: true, trailing: true})
    ); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(throttleTime()); // $ExpectError
    const p = of(1, 2, 3).pipe(throttleTime('foo')); // $ExpectError
  });

  it('should enforce scheduler types', () => {
    const o = of(1, 2, 3).pipe(throttleTime(47, null)); // $ExpectError
  });

  it('should enforce config types', () => {
    const o = of(1, 2, 3).pipe(throttleTime(47, asyncScheduler, {x: 1})); // $ExpectError
    const p = of(1, 2, 3).pipe(
      throttleTime(47, asyncScheduler, {leading: 1, trailing: 1})
    ); // $ExpectError
    const q = of(1, 2, 3).pipe(throttleTime(47, asyncScheduler, null)); // $ExpectError
  });

  it('should throttle events by 50 time units', (done: MochaDone) => {
    of(1, 2, 3)
      .pipe(throttleTime(50))
      .subscribe(
        (x: number) => {
          expect(x).to.equal(1);
        },
        null,
        done
      );
  });

  it('should throttle events multiple times', () => {
    const expected = ['1-0', '2-0'];
    concat(
      timer(0, 10, rxTestScheduler).pipe(
        take(3),
        map((x: number) => '1-' + x)
      ),
      timer(80, 10, rxTestScheduler).pipe(
        take(5),
        map((x: number) => '2-' + x)
      )
    )
      .pipe(throttleTime(50, rxTestScheduler))
      .subscribe((x: string) => {
        expect(x).to.equal(expected.shift());
      });

    rxTestScheduler.flush();
  });

  it('should simply mirror the source if values are not emitted often enough', () => {
    const e1 = hot('-a--------b-----c----|');
    const subs = '^                    !';
    const expected = '-a--------b-----c----|';

    expectSource(e1.pipe(throttleTime(50, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should handle a busy producer emitting a regular repeating sequence', () => {
    const e1 = hot('abcdefabcdefabcdefabcdefa|');
    const subs = '^                        !';
    const expected = 'a-----a-----a-----a-----a|';

    expectSource(e1.pipe(throttleTime(50, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should complete when source does not emit', () => {
    const e1 = hot('-----|');
    const subs = '^    !';
    const expected = '-----|';

    expectSource(e1.pipe(throttleTime(50, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should raise error when source does not emit and raises error', () => {
    const e1 = hot('-----#');
    const subs = '^    !';
    const expected = '-----#';

    expectSource(e1.pipe(throttleTime(10, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should handle an empty source', () => {
    const e1 = cold('|');
    const subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(throttleTime(30, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should handle a never source', () => {
    const e1 = cold('-');
    const subs = '^';
    const expected = '-';

    expectSource(e1.pipe(throttleTime(30, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should handle a throw source', () => {
    const e1 = cold('#');
    const subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(throttleTime(30, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should throttle and does not complete when source does not completes', () => {
    const e1 = hot('-a--(bc)-------d----------------');
    const unsub = '                               !';
    const subs = '^                              !';
    const expected = '-a-------------d----------------';

    expectSource(e1.pipe(throttleTime(50, rxTestScheduler)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('-a--(bc)-------d----------------');
    const subs = '^                              !';
    const expected = '-a-------------d----------------';
    const unsub = '                               !';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      throttleTime(50, rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should throttle values until source raises error', () => {
    const e1 = hot('-a--(bc)-------d---------------#');
    const subs = '^                              !';
    const expected = '-a-------------d---------------#';

    expectSource(e1.pipe(throttleTime(50, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  describe('throttleTime(fn, { leading: true, trailing: true })', () => {
    asDiagram('throttleTime(fn, { leading: true, trailing: true })')(
      'should immediately emit the first and last values in each time window',
      () => {
        const e1 = hot('-a-xy-----b--x--cxxx--|');
        const e1subs = '^                     !';
        const t = time('----|                  ');
        const expected = '-a---y----b---x-c---x-|';

        const result = e1.pipe(
          throttleTime(t, rxTestScheduler, {leading: true, trailing: true})
        );

        expectSource(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
      }
    );

    it('should emit the value if only a single one is given', () => {
      const e1 = hot('-a--------------------|');
      const t = time('----|                  ');
      const expected = '-a--------------------|';

      const result = e1.pipe(
        throttleTime(t, rxTestScheduler, {leading: true, trailing: true})
      );

      expectSource(result).toBe(expected);
    });
  });

  describe('throttleTime(fn, { leading: false, trailing: true })', () => {
    asDiagram('throttleTime(fn, { leading: false, trailing: true })')(
      'should immediately emit the last value in each time window',
      () => {
        const e1 = hot('-a-xy-----b--x--cxxx--|');
        const e1subs = '^                     !';
        const t = time('----|                  ');
        const expected = '-----y--------x-----x-|';

        const result = e1.pipe(
          throttleTime(t, rxTestScheduler, {leading: false, trailing: true})
        );

        expectSource(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
      }
    );

    it('should emit the last throttled value when complete', () => {
      const e1 = hot('-a-xy-----b--x--cxx|');
      const e1subs = '^                  !';
      const t = time('----|               ');
      const expected = '-----y--------x----(x|)';

      const result = e1.pipe(
        throttleTime(t, rxTestScheduler, {leading: false, trailing: true})
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });

    it('should emit the value if only a single one is given', () => {
      const e1 = hot('-a--------------------|');
      const t = time('----|                  ');
      const expected = '-----a----------------|';

      const result = e1.pipe(
        throttleTime(t, rxTestScheduler, {leading: false, trailing: true})
      );

      expectSource(result).toBe(expected);
    });
  });
});
