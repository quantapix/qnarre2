import {expect} from 'chai';
import {TestScheduler} from 'rxjs/testing';
import {of, interval, EMPTY} from 'rxjs';
import {audit, take, mergeMap} from 'rxjs/operators';
import {sourceMatcher} from '../helpers/sourceMatcher';

declare function asDiagram(arg: string): Function;

/** @test {audit} */
describe('audit operator', () => {
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
import {expect} from 'chai';
import {of, concat, timer} from 'rxjs';
import {auditTime, take, map, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {sourceMatcher} from '../helpers/sourceMatcher';

declare function asDiagram(arg: string): Function;

/** @test {auditTime} */
describe('auditTime operator', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('auditTime(5)')(
    'should emit the last value in each time window',
    () => {
      testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const e1 = hot('  -a-x-y----b---x-cx---|');
        const subs = '    ^--------------------!';
        const expected = '------y--------x-----|';

        const result = e1.pipe(auditTime(5, testScheduler));

        expectSource(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(subs);
      });
    }
  );

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

import {expect} from 'chai';
import {concat, defer, Observable, of, throwError, EMPTY, from} from 'rxjs';
import {catchError, delay, map, mergeMap, takeWhile} from 'rxjs/operators';
import * as sinon from 'sinon';
import {createSourceInputs} from '../helpers/test-helper';
import {TestScheduler} from 'rxjs/testing';
import {sourceMatcher} from '../helpers/sourceMatcher';
import {asInteropSource} from '../helpers/interop-helper';

declare function asDiagram(arg: string): Function;

/** @test {catch} */
describe('catchError operator', () => {
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
import {expect} from 'chai';
import {queueScheduler, of, Observable} from 'rxjs';
import {combineAll, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {sourceMatcher} from '../helpers/sourceMatcher';

declare function asDiagram(arg: string): Function;
declare const type: Function;

/** @test {combineAll} */
describe('combineAll operator', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('combineAll')('should combine events from two observables', () => {
    testScheduler.run(({hot, cold, expectSource}) => {
      const x = cold('                  -a-----b---|');
      const y = cold('                  --1-2-|     ');
      const outer = hot('-x----y--------|           ', {x: x, y: y});
      const expected = ' -----------------A-B--C---|';

      const result = outer.pipe(combineAll((a, b) => String(a) + String(b)));

      expectSource(result).toBe(expected, {A: 'a1', B: 'a2', C: 'b2'});
    });
  });

  it('should work with two nevers', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' -');
      const e1subs = '  ^';
      const e2 = cold(' -');
      const e2subs = '  ^';
      const expected = '-';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with never and empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' -');
      const e1subs = '  ^';
      const e2 = cold(' |');
      const e2subs = '  (^!)';
      const expected = '-';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with empty and never', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)';
      const e2 = cold(' -');
      const e2subs = '  ^';
      const expected = '-';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with empty and empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)';
      const e2 = cold(' |');
      const e2subs = '  (^!)';
      const expected = '|';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot-empty and hot-single', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a-^-|');
      const e1subs = '   ^-!';
      const e2 = hot('-b-^-c-|');
      const e2subs = '   ^---!';
      const expected = ' ----|';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot-single and hot-empty', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a-^-|');
      const e1subs = '   ^-!';
      const e2 = hot('-b-^-c-|');
      const e2subs = '   ^---!';
      const expected = ' ----|';

      const result = of(e2, e1).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot-single and never', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a-^-|');
      const e1subs = '   ^-!';
      const e2 = hot('------'); //never
      const e2subs = '   ^--';
      const expected = ' ---'; //never

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with never and hot-single', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--------'); //never
      const e1subs = '   ^----';
      const e2 = hot('-a-^-b-|');
      const e2subs = '   ^---!';
      const expected = ' -----'; //never

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot and hot', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c--|');
      const e1subs = '     ^--------!';
      const e2 = hot('---e-^---f--g--|');
      const e2subs = '     ^---------!';
      const expected = '   ----x-yz--|';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, {x: 'bf', y: 'cf', z: 'cg'});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should allow unsubscribing early and explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c---d-| ');
      const e1subs = '     ^--------!    ';
      const e2 = hot('---e-^---f--g---h-|');
      const e2subs = '     ^--------!    ';
      const expected = '   ----x-yz--    ';
      const unsub = '      ---------!    ';
      const values = {x: 'bf', y: 'cf', z: 'cg'};

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--^--b--c---d-| ');
      const e1subs = '       ^--------!    ';
      const e2 = hot('  ---e-^---f--g---h-|');
      const e2subs = '       ^--------!    ';
      const expected = '     ----x-yz--    ';
      const unsub = '        ---------!    ';
      const values = {x: 'bf', y: 'cf', z: 'cg'};

      const result = of(e1, e2).pipe(
        mergeMap(x => of(x)),
        combineAll((x, y) => x + y),
        mergeMap(x => of(x))
      );

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should combine 3 observables', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c--|');
      const e1subs = '     ^--------!';
      const e2 = hot('---e-^---f--g--|');
      const e2subs = '     ^---------!';
      const e3 = hot('---h-^----i--j-|');
      const e3subs = '     ^---------!';
      const expected = '   -----wxyz-|';

      const result = of(e1, e2, e3).pipe(combineAll((x, y, z) => x + y + z));

      expectSource(result).toBe(expected, {
        w: 'bfi',
        x: 'cfi',
        y: 'cgi',
        z: 'cgj'
      });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    });
  });

  it('should work with empty and error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ----------|'); //empty
      const e1subs = '  ^-----!';
      const e2 = hot('  ------#', undefined, 'shazbot!'); //error
      const e2subs = '  ^-----!';
      const expected = '------#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'shazbot!');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with error and empty', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--^---#', undefined, 'too bad, honk'); //error
      const e1subs = '  ^---!';
      const e2 = hot('--^--------|'); //empty
      const e2subs = '  ^---!';
      const expected = '----#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'too bad, honk');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a-^--b--c--|');
      const e1subs = '   ^-!';
      const e2 = hot('---^-#', undefined, 'bazinga');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bazinga');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and hot', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^-#', undefined, 'bazinga');
      const e1subs = '   ^-!';
      const e2 = hot('-a-^--b--c--|');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bazinga');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^----#', undefined, 'jenga');
      const e1subs = '   ^-!';
      const e2 = hot('---^-#', undefined, 'bazinga');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bazinga');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with error and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a-^--b--#', undefined, 'wokka wokka');
      const e1subs = '   ^-!';
      const e2 = hot('---^-#', undefined, 'flurp');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'flurp');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^-#', undefined, 'flurp');
      const e1subs = '   ^-!';
      const e2 = hot('-a-^--b--#', undefined, 'wokka wokka');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'flurp');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with never and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^-----------');
      const e1subs = '   ^-----!';
      const e2 = hot('---^-----#', undefined, 'wokka wokka');
      const e2subs = '   ^-----!';
      const expected = ' ------#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and never', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('   ---^----#', undefined, 'wokka wokka');
      const e1subs = '      ^----!';
      const e2 = hot('   ---^-----------');
      const e2subs = '      ^----!';
      const expected = '    -----#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with some and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^----a---b--|');
      const e1subs = '   ^--!';
      const e2 = hot('---^--#', undefined, 'wokka wokka');
      const e2subs = '   ^--!';
      const expected = ' ---#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, {a: 1, b: 2}, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and some', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^--#', undefined, 'wokka wokka');
      const e1subs = '   ^--!';
      const e2 = hot('---^----a---b--|');
      const e2subs = '   ^--!';
      const expected = ' ---#';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle throw after complete left', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot(' --a--^--b---|');
      const leftSubs = '      ^------!';
      const right = hot('-----^--------#', undefined, 'bad things');
      const rightSubs = '     ^--------!';
      const expected = '      ---------#';

      const result = of(left, right).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bad things');
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle throw after complete right', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot('  -----^--------#', undefined, 'bad things');
      const leftSubs = '       ^--------!';
      const right = hot('--a--^--b---|');
      const rightSubs = '      ^------!';
      const expected = '       ---------#';

      const result = of(left, right).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bad things');
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle interleaved with tail', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a--^--b---c---|');
      const e1subs = '    ^----------!';
      const e2 = hot('--d-^----e---f--|');
      const e2subs = '    ^-----------!';
      const expected = '  -----x-y-z--|';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, {x: 'be', y: 'ce', z: 'cf'});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle two consecutive hot observables', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c--|');
      const e1subs = '     ^--------!';
      const e2 = hot('-----^----------d--e--f--|');
      const e2subs = '     ^-------------------!';
      const expected = '   -----------x--y--z--|';

      const result = of(e1, e2).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, {x: 'cd', y: 'ce', z: 'cf'});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle two consecutive hot observables with error left', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot(' --a--^--b--c--#', undefined, 'jenga');
      const leftSubs = '      ^--------!';
      const right = hot('-----^----------d--e--f--|');
      const rightSubs = '     ^--------!';
      const expected = '      ---------#';

      const result = of(left, right).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(expected, null, 'jenga');
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle two consecutive hot observables with error right', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot(' --a--^--b--c--|');
      const leftSubs = '      ^--------!';
      const right = hot('-----^----------d--e--f--#', undefined, 'dun dun dun');
      const rightSubs = '     ^-------------------!';
      const expected = '      -----------x--y--z--#';

      const result = of(left, right).pipe(combineAll((x, y) => x + y));

      expectSource(result).toBe(
        expected,
        {x: 'cd', y: 'ce', z: 'cf'},
        'dun dun dun'
      );
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle selector throwing', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--|');
      const e1subs = '     ^--!';
      const e2 = hot('--c--^--d--|');
      const e2subs = '     ^--!';
      const expected = '   ---#';

      const result = of(e1, e2).pipe(
        combineAll((x, y) => {
          throw 'ha ha ' + x + ', ' + y;
        })
      );

      expectSource(result).toBe(expected, null, 'ha ha b, d');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should combine two observables', done => {
    const a = of(1, 2, 3);
    const b = of(4, 5, 6, 7, 8);
    const expected = [
      [3, 4],
      [3, 5],
      [3, 6],
      [3, 7],
      [3, 8]
    ];
    of(a, b)
      .pipe(combineAll())
      .subscribe(
        vals => {
          expect(vals).to.deep.equal(expected.shift());
        },
        null,
        () => {
          expect(expected.length).to.equal(0);
          done();
        }
      );
  });

  it('should combine two immediately-scheduled observables', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [
      [1, 4],
      [2, 4],
      [2, 5],
      [3, 5],
      [3, 6],
      [3, 7],
      [3, 8]
    ];

    of(a, b, queueScheduler)
      .pipe(combineAll())
      .subscribe(
        vals => {
          expect(vals).to.deep.equal(r.shift());
        },
        null,
        () => {
          expect(r.length).to.equal(0);
          done();
        }
      );
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number[]> = of(source1, source2, source3).pipe(
      combineAll()
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number> = of(source1, source2, source3).pipe(
      combineAll((...args) => args.reduce((acc, x) => acc + x, 0))
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number[]> = of(source1, source2, source3).pipe(
      combineAll()
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number> = of(source1, source2, source3).pipe(
      combineAll((...args) => args.reduce((acc, x) => acc + x, 0))
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    // coerce type to a specific type
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<string[]> = of(
      <any>source1,
      <any>source2,
      <any>source3
    ).pipe(combineAll<string>());
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    // coerce type to a specific type
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<string> = of(
      <any>source1,
      <any>source2,
      <any>source3
    ).pipe(
      combineAll<string>((...args) => args.reduce((acc, x) => acc + x, 0))
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    // coerce type to a specific type
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<string[]> = of(
      <any>source1,
      <any>source2,
      <any>source3
    ).pipe(combineAll<string>());
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    // coerce type to a specific type
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<string> = of(
      <any>source1,
      <any>source2,
      <any>source3
    ).pipe(
      combineAll<string>((...args) => args.reduce((acc, x) => acc + x, 0))
    );
    /* tslint:enable:no-unused-variable */
  });
});
import {of} from 'rxjs';
import {combineLatest, mergeMap, distinct, count} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {sourceMatcher} from '../helpers/sourceMatcher';

declare function asDiagram(arg: string): Function;

/** @test {combineLatest} */
describe('combineLatest', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('combineLatest')(
    'should combine events from two cold observables',
    () => {
      testScheduler.run(({cold, expectSource}) => {
        const e1 = cold(' -a--b-----c-d-e-|');
        const e2 = cold(' --1--2-3-4---|   ');
        const expected = '--A-BC-D-EF-G-H-|';

        const result = e1.pipe(
          combineLatest(e2, (a, b) => String(a) + String(b))
        );

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
    }
  );

  it('should work with two nevers', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' -');
      const e1subs = '  ^';
      const e2 = cold(' -');
      const e2subs = '  ^';
      const expected = '-';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with never and empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' -');
      const e1subs = '  ^';
      const e2 = cold(' |');
      const e2subs = '  (^!)';
      const expected = '-';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with empty and never', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)';
      const e2 = cold(' -');
      const e2subs = '  ^';
      const expected = '-';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with empty and empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)';
      const e2 = cold(' |');
      const e2subs = '  (^!)';
      const expected = '|';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot-empty and hot-single', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        a: 1,
        b: 2,
        c: 3,
        r: 1 + 3 //a + c
      };
      const e1 = hot('-a-^-|', values);
      const e1subs = '   ^-!';
      const e2 = hot('-b-^-c-|', values);
      const e2subs = '   ^---!';
      const expected = ' ----|';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot-single and hot-empty', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        a: 1,
        b: 2,
        c: 3
      };
      const e1 = hot('-a-^-|', values);
      const e1subs = '   ^-!';
      const e2 = hot('-b-^-c-|', values);
      const e2subs = '   ^---!';
      const expected = ' ----|';

      const result = e2.pipe(combineLatest(e1, (x, y) => x + y));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot-single and never', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        a: 1
      };
      const e1 = hot('-a-^-|', values);
      const e1subs = '   ^-!';
      const e2 = hot('------', values); //never
      const e2subs = '   ^--';
      const expected = ' ---'; //never

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with never and hot-single', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        a: 1,
        b: 2
      };
      const e1 = hot('--------', values); //never
      const e1subs = '   ^    ';
      const e2 = hot('-a-^-b-|', values);
      const e2subs = '   ^---!';
      const expected = ' -----'; //never

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot and hot', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c--|', {a: 'a', b: 'b', c: 'c'});
      const e1subs = '     ^--------!';
      const e2 = hot('---e-^---f--g--|', {e: 'e', f: 'f', g: 'g'});
      const e2subs = '     ^---------!';
      const expected = '   ----x-yz--|';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, {x: 'bf', y: 'cf', z: 'cg'});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should accept array of observables', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c--|');
      const e1subs = '     ^--------!';
      const e2 = hot('---e-^---f--g--|');
      const e2subs = '     ^---------!';
      const e3 = hot('---h-^----i--j-|');
      const e3subs = '     ^---------!';
      const expected = '   -----wxyz-|';

      const result = e1.pipe(
        combineLatest([e2, e3], (x: string, y: string, z: string) => x + y + z)
      );

      expectSource(result).toBe(expected, {
        w: 'bfi',
        x: 'cfi',
        y: 'cgi',
        z: 'cgj'
      });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    });
  });

  it('should work with empty and error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ----------|'); //empty
      const e1subs = '  ^-----!';
      const e2 = hot('  ------#', undefined, 'shazbot!'); //error
      const e2subs = '  ^-----!';
      const expected = '------#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'shazbot!');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with error and empty', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--^---#', undefined, 'too bad, honk'); //error
      const e1subs = '  ^---!';
      const e2 = hot('--^--------|'); //empty
      const e2subs = '  ^---!';
      const expected = '----#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'too bad, honk');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a-^--b--c--|', {a: 1, b: 2, c: 3});
      const e1subs = '   ^-!';
      const e2 = hot('---^-#', undefined, 'bazinga');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bazinga');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and hot', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^-#', undefined, 'bazinga');
      const e1subs = '   ^-!';
      const e2 = hot('-a-^--b--c--|', {a: 1, b: 2, c: 3});
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bazinga');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^----#', undefined, 'jenga');
      const e1subs = '   ^-!';
      const e2 = hot('---^-#', undefined, 'bazinga');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bazinga');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with error and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a-^--b--#', {a: 1, b: 2}, 'wokka wokka');
      const e1subs = '   ^-!';
      const e2 = hot('---^-#', undefined, 'flurp');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'flurp');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^-#', undefined, 'flurp');
      const e1subs = '   ^-!';
      const e2 = hot('-a-^--b--#', {a: 1, b: 2}, 'wokka wokka');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'flurp');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with never and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^-----------');
      const e1subs = '   ^-----!';
      const e2 = hot('---^-----#', undefined, 'wokka wokka');
      const e2subs = '   ^-----!';
      const expected = ' ------#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and never', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^----#', undefined, 'wokka wokka');
      const e1subs = '   ^----!';
      const e2 = hot('---^-----------');
      const e2subs = '   ^----!';
      const expected = ' -----#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with some and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('   ---^----a---b--|', {a: 1, b: 2});
      const e1subs = '      ^--!';
      const e2 = hot('   ---^--#', undefined, 'wokka wokka');
      const e2subs = '      ^--!';
      const expected = '    ---#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, {a: 1, b: 2}, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and some', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^--#', undefined, 'wokka wokka');
      const e1subs = '   ^--!';
      const e2 = hot('---^----a---b--|', {a: 1, b: 2});
      const e2subs = '   ^--!';
      const expected = ' ---#';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, {a: 1, b: 2}, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle throw after complete left', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot(' --a--^--b---|', {a: 1, b: 2});
      const leftSubs = '      ^------!';
      const right = hot('-----^--------#', undefined, 'bad things');
      const rightSubs = '     ^--------!';
      const expected = '      ---------#';

      const result = left.pipe(combineLatest(right, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bad things');
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle throw after complete right', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot('  -----^--------#', undefined, 'bad things');
      const leftSubs = '       ^--------!';
      const right = hot(' --a--^--b---|', {a: 1, b: 2});
      const rightSubs = '      ^------!';
      const expected = '       ---------#';

      const result = left.pipe(combineLatest(right, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'bad things');
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle interleaved with tail', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a--^--b---c---|', {a: 'a', b: 'b', c: 'c'});
      const e1subs = '    ^----------!';
      const e2 = hot('--d-^----e---f--|', {d: 'd', e: 'e', f: 'f'});
      const e2subs = '    ^-----------!';
      const expected = '  -----x-y-z--|';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, {x: 'be', y: 'ce', z: 'cf'});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle two consecutive hot observables', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c--|', {a: 'a', b: 'b', c: 'c'});
      const e1subs = '     ^--------!';
      const e2 = hot('-----^----------d--e--f--|', {d: 'd', e: 'e', f: 'f'});
      const e2subs = '     ^-------------------!';
      const expected = '   -----------x--y--z--|';

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result).toBe(expected, {x: 'cd', y: 'ce', z: 'cf'});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle two consecutive hot observables with error left', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot(' --a--^--b--c--#', {a: 'a', b: 'b', c: 'c'}, 'jenga');
      const leftSubs = '      ^--------!';
      const right = hot('-----^----------d--e--f--|', {d: 'd', e: 'e', f: 'f'});
      const rightSubs = '     ^--------!';
      const expected = '      ---------#';

      const result = left.pipe(combineLatest(right, (x, y) => x + y));

      expectSource(result).toBe(expected, null, 'jenga');
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle two consecutive hot observables with error right', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot(' --a--^--b--c--|', {a: 'a', b: 'b', c: 'c'});
      const leftSubs = '      ^--------!';
      const right = hot(
        '-----^----------d--e--f--#',
        {d: 'd', e: 'e', f: 'f'},
        'dun dun dun'
      );
      const rightSubs = '     ^-------------------!';
      const expected = '      -----------x--y--z--#';

      const result = left.pipe(combineLatest(right, (x, y) => x + y));

      expectSource(result).toBe(
        expected,
        {x: 'cd', y: 'ce', z: 'cf'},
        'dun dun dun'
      );
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle selector throwing', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--|', {a: 1, b: 2});
      const e1subs = '     ^--!';
      const e2 = hot('--c--^--d--|', {c: 3, d: 4});
      const e2subs = '     ^--!';
      const expected = '   ---#';

      const result = e1.pipe(
        combineLatest(e2, (x, y) => {
          throw 'ha ha ' + x + ', ' + y;
        })
      );

      expectSource(result).toBe(expected, null, 'ha ha 2, 4');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should allow unsubscribing early and explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c---d-| ');
      const e1subs = '     ^--------!    ';
      const e2 = hot('---e-^---f--g---h-|');
      const e2subs = '     ^--------!    ';
      const expected = '   ----x-yz--    ';
      const unsub = '      ---------!    ';
      const values = {x: 'bf', y: 'cf', z: 'cg'};

      const result = e1.pipe(combineLatest(e2, (x, y) => x + y));

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c---d-| ');
      const e1subs = '     ^--------!    ';
      const e2 = hot('---e-^---f--g---h-|');
      const e2subs = '     ^--------!    ';
      const expected = '   ----x-yz--    ';
      const unsub = '      ---------!    ';
      const values = {x: 'bf', y: 'cf', z: 'cg'};

      const result = e1.pipe(
        mergeMap(x => of(x)),
        combineLatest(e2, (x, y) => x + y),
        mergeMap(x => of(x))
      );

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should emit unique array instances with the default projection', () => {
    testScheduler.run(({hot, expectSource}) => {
      const e1 = hot('  -a--b--|');
      const e2 = hot('  --1--2-|');
      const expected = '-------(c|)';

      const result = e1.pipe(combineLatest(e2), distinct(), count());

      expectSource(result).toBe(expected, {c: 3});
    });
  });
});
import {of} from 'rxjs';
import {
  combineLatestWith,
  mergeMap,
  distinct,
  count,
  map
} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {sourceMatcher} from '../helpers/sourceMatcher';

/** @test {combineLatestWith} */
describe('combineLatestWith', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  it('should combine events from two cold observables', () => {
    testScheduler.run(({cold, expectSource}) => {
      const e1 = cold(' -a--b-----c-d-e-|');
      const e2 = cold(' --1--2-3-4---|   ');
      const expected = '--A-BC-D-EF-G-H-|';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([a, b]) => a + b)
      );

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
  });

  it('should work with two nevers', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' -');
      const e1subs = '  ^';
      const e2 = cold(' -');
      const e2subs = '  ^';
      const expected = '-';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with never and empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' -');
      const e1subs = '  ^';
      const e2 = cold(' |');
      const e2subs = '  (^!)';
      const expected = '-';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with empty and never', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)';
      const e2 = cold(' -');
      const e2subs = '  ^';
      const expected = '-';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with empty and empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)';
      const e2 = cold(' |');
      const e2subs = '  (^!)';
      const expected = '|';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot-empty and hot-single', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        a: 1,
        b: 2,
        c: 3,
        r: 1 + 3 //a + c
      };
      const e1 = hot('-a-^-|', values);
      const e1subs = '   ^-!';
      const e2 = hot('-b-^-c-|', values);
      const e2subs = '   ^---!';
      const expected = ' ----|';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot-single and hot-empty', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        a: 1,
        b: 2,
        c: 3
      };
      const e1 = hot('-a-^-|', values);
      const e1subs = '   ^-!';
      const e2 = hot('-b-^-c-|', values);
      const e2subs = '   ^---!';
      const expected = ' ----|';

      const result = e2.pipe(
        combineLatestWith(e1),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot-single and never', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        a: 1
      };
      const e1 = hot('-a-^-|', values);
      const e1subs = '   ^-!';
      const e2 = hot('------', values); //never
      const e2subs = '   ^--';
      const expected = ' ---'; //never

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with never and hot-single', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        a: 1,
        b: 2
      };
      const e1 = hot('--------', values); //never
      const e1subs = '   ^    ';
      const e2 = hot('-a-^-b-|', values);
      const e2subs = '   ^---!';
      const expected = ' -----'; //never

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot and hot', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c--|', {a: 'a', b: 'b', c: 'c'});
      const e1subs = '     ^--------!';
      const e2 = hot('---e-^---f--g--|', {e: 'e', f: 'f', g: 'g'});
      const e2subs = '     ^---------!';
      const expected = '   ----x-yz--|';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, {x: 'bf', y: 'cf', z: 'cg'});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should accept array of observables', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c--|');
      const e1subs = '     ^--------!';
      const e2 = hot('---e-^---f--g--|');
      const e2subs = '     ^---------!';
      const e3 = hot('---h-^----i--j-|');
      const e3subs = '     ^---------!';
      const expected = '   -----wxyz-|';

      const result = e1.pipe(
        combineLatestWith(
          [e2, e3],
          (x: string, y: string, z: string) => x + y + z
        )
      );

      expectSource(result).toBe(expected, {
        w: 'bfi',
        x: 'cfi',
        y: 'cgi',
        z: 'cgj'
      });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    });
  });

  it('should work with empty and error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ----------|'); //empty
      const e1subs = '  ^-----!';
      const e2 = hot('  ------#', undefined, 'shazbot!'); //error
      const e2subs = '  ^-----!';
      const expected = '------#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'shazbot!');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with error and empty', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--^---#', undefined, 'too bad, honk'); //error
      const e1subs = '  ^---!';
      const e2 = hot('--^--------|'); //empty
      const e2subs = '  ^---!';
      const expected = '----#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'too bad, honk');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with hot and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a-^--b--c--|', {a: 1, b: 2, c: 3});
      const e1subs = '   ^-!';
      const e2 = hot('---^-#', undefined, 'bazinga');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'bazinga');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and hot', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^-#', undefined, 'bazinga');
      const e1subs = '   ^-!';
      const e2 = hot('-a-^--b--c--|', {a: 1, b: 2, c: 3});
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'bazinga');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^----#', undefined, 'jenga');
      const e1subs = '   ^-!';
      const e2 = hot('---^-#', undefined, 'bazinga');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'bazinga');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with error and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a-^--b--#', {a: 1, b: 2}, 'wokka wokka');
      const e1subs = '   ^-!';
      const e2 = hot('---^-#', undefined, 'flurp');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'flurp');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and error', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^-#', undefined, 'flurp');
      const e1subs = '   ^-!';
      const e2 = hot('-a-^--b--#', {a: 1, b: 2}, 'wokka wokka');
      const e2subs = '   ^-!';
      const expected = ' --#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'flurp');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with never and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^-----------');
      const e1subs = '   ^-----!';
      const e2 = hot('---^-----#', undefined, 'wokka wokka');
      const e2subs = '   ^-----!';
      const expected = ' ------#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and never', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^----#', undefined, 'wokka wokka');
      const e1subs = '   ^----!';
      const e2 = hot('---^-----------');
      const e2subs = '   ^----!';
      const expected = ' -----#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with some and throw', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('   ---^----a---b--|', {a: 1, b: 2});
      const e1subs = '      ^--!';
      const e2 = hot('   ---^--#', undefined, 'wokka wokka');
      const e2subs = '      ^--!';
      const expected = '    ---#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, {a: 1, b: 2}, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should work with throw and some', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---^--#', undefined, 'wokka wokka');
      const e1subs = '   ^--!';
      const e2 = hot('---^----a---b--|', {a: 1, b: 2});
      const e2subs = '   ^--!';
      const expected = ' ---#';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, {a: 1, b: 2}, 'wokka wokka');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle throw after complete left', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot(' --a--^--b---|', {a: 1, b: 2});
      const leftSubs = '      ^------!';
      const right = hot('-----^--------#', undefined, 'bad things');
      const rightSubs = '     ^--------!';
      const expected = '      ---------#';

      const result = left.pipe(
        combineLatestWith(right),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'bad things');
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle throw after complete right', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot('  -----^--------#', undefined, 'bad things');
      const leftSubs = '       ^--------!';
      const right = hot(' --a--^--b---|', {a: 1, b: 2});
      const rightSubs = '      ^------!';
      const expected = '       ---------#';

      const result = left.pipe(
        combineLatestWith(right),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'bad things');
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle interleaved with tail', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('-a--^--b---c---|', {a: 'a', b: 'b', c: 'c'});
      const e1subs = '    ^----------!';
      const e2 = hot('--d-^----e---f--|', {d: 'd', e: 'e', f: 'f'});
      const e2subs = '    ^-----------!';
      const expected = '  -----x-y-z--|';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, {x: 'be', y: 'ce', z: 'cf'});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle two consecutive hot observables', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c--|', {a: 'a', b: 'b', c: 'c'});
      const e1subs = '     ^--------!';
      const e2 = hot('-----^----------d--e--f--|', {d: 'd', e: 'e', f: 'f'});
      const e2subs = '     ^-------------------!';
      const expected = '   -----------x--y--z--|';

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, {x: 'cd', y: 'ce', z: 'cf'});
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle two consecutive hot observables with error left', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot(' --a--^--b--c--#', {a: 'a', b: 'b', c: 'c'}, 'jenga');
      const leftSubs = '      ^--------!';
      const right = hot('-----^----------d--e--f--|', {d: 'd', e: 'e', f: 'f'});
      const rightSubs = '     ^--------!';
      const expected = '      ---------#';

      const result = left.pipe(
        combineLatestWith(right),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(expected, null, 'jenga');
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should handle two consecutive hot observables with error right', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const left = hot(' --a--^--b--c--|', {a: 'a', b: 'b', c: 'c'});
      const leftSubs = '      ^--------!';
      const right = hot(
        '-----^----------d--e--f--#',
        {d: 'd', e: 'e', f: 'f'},
        'dun dun dun'
      );
      const rightSubs = '     ^-------------------!';
      const expected = '      -----------x--y--z--#';

      const result = left.pipe(
        combineLatestWith(right),
        map(([x, y]) => x + y)
      );

      expectSource(result).toBe(
        expected,
        {x: 'cd', y: 'ce', z: 'cf'},
        'dun dun dun'
      );
      expectSubscriptions(left.subscriptions).toBe(leftSubs);
      expectSubscriptions(right.subscriptions).toBe(rightSubs);
    });
  });

  it('should allow unsubscribing early and explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c---d-| ');
      const e1subs = '     ^--------!    ';
      const e2 = hot('---e-^---f--g---h-|');
      const e2subs = '     ^--------!    ';
      const expected = '   ----x-yz--    ';
      const unsub = '      ---------!    ';
      const values = {x: 'bf', y: 'cf', z: 'cg'};

      const result = e1.pipe(
        combineLatestWith(e2),
        map(([x, y]) => x + y)
      );

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^--b--c---d-| ');
      const e1subs = '     ^--------!    ';
      const e2 = hot('---e-^---f--g---h-|');
      const e2subs = '     ^--------!    ';
      const expected = '   ----x-yz--    ';
      const unsub = '      ---------!    ';
      const values = {x: 'bf', y: 'cf', z: 'cg'};

      const result = e1.pipe(
        mergeMap(x => of(x)),
        combineLatestWith(e2),
        map(([x, y]) => x + y),
        mergeMap(x => of(x))
      );

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should emit unique array instances with the default projection', () => {
    testScheduler.run(({hot, expectSource}) => {
      const e1 = hot('  -a--b--|');
      const e2 = hot('  --1--2-|');
      const expected = '-------(c|)';

      const result = e1.pipe(combineLatestWith(e2), distinct(), count());

      expectSource(result).toBe(expected, {c: 3});
    });
  });
});
import {expect} from 'chai';
import {of, Observable} from 'rxjs';
import {concat, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {sourceMatcher} from '../helpers/sourceMatcher';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {concat} */
describe('concat operator', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('concat')('should concatenate two cold observables', () => {
    testScheduler.run(({cold, expectSource}) => {
      const e1 = cold('  --a--b-|');
      const e2 = cold('         --x---y--|');
      const expected = ' --a--b---x---y--|';

      expectSource(e1.pipe(concat(e2, rxTestScheduler))).toBe(expected);
    });
  });

  it('should work properly with scalar observables', done => {
    const results: string[] = [];

    const s1 = new Observable<number>(observer => {
      setTimeout(() => {
        observer.next(1);
        observer.complete();
      });
    }).pipe(concat(of(2)));

    s1.subscribe(
      x => {
        results.push('Next: ' + x);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        results.push('Completed');
        expect(results).to.deep.equal(['Next: 1', 'Next: 2', 'Completed']);
        done();
      }
    );
  });

  it('should complete without emit if both sources are empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --|');
      const e1subs = '   ^-!';
      const e2 = cold('    ----|');
      const e2subs = '   --^---!';
      const expected = ' ------|';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not complete if first source does not complete', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  -');
      const e1subs = '   ^';
      const e2 = cold('  --|');
      const e2subs: string[] = [];
      const expected = ' -';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not complete if second source does not complete', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --|');
      const e1subs = '   ^-!';
      const e2 = cold('  ---');
      const e2subs = '   --^';
      const expected = ' ---';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not complete if both sources do not complete', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  -');
      const e1subs = '   ^';
      const e2 = cold('  -');
      const e2subs: string[] = [];
      const expected = ' -';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error when first source is empty, second source raises error', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --|');
      const e1subs = '   ^-!';
      const e2 = cold('    ----#');
      const e2subs = '   --^---!';
      const expected = ' ------#';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error when first source raises error, second source is empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---#');
      const e1subs = '   ^--!';
      const e2 = cold('  ----|');
      const e2subs: string[] = [];
      const expected = ' ---#';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise first error when both source raise error', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---#');
      const e1subs = '   ^--!';
      const e2 = cold('  ------#');
      const e2subs: string[] = [];
      const expected = ' ---#';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should concat if first source emits once, second source is empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --a--|');
      const e1subs = '   ^----!';
      const e2 = cold('       --------|');
      const e2subs = '   -----^-------!';
      const expected = ' --a----------|';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should concat if first source is empty, second source emits once', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --|');
      const e1subs = '   ^-!';
      const e2 = cold('    --a--|');
      const e2subs = '   --^----!';
      const expected = ' ----a--|';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it(
    'should emit element from first source, and should not complete if second ' +
      'source does not complete',
    () => {
      testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
        const e1 = cold('  --a--|');
        const e1subs = '   ^----!';
        const e2 = cold('       -');
        const e2subs = '   -----^';
        const expected = ' --a---';

        expectSource(e1.pipe(concat(e2))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      });
    }
  );

  it('should not complete if first source does not complete', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  -');
      const e1subs = '   ^';
      const e2 = cold('  --a--|');
      const e2subs: string[] = [];
      const expected = ' -';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should emit elements from each source when source emit once', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a|');
      const e1subs = '   ^---!';
      const e2 = cold('      -----b--|');
      const e2subs = '   ----^-------!';
      const expected = ' ---a-----b--|';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should unsubscribe to inner source if outer is unsubscribed early', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a-a--a|            ');
      const e1subs = '   ^--------!            ';
      const e2 = cold('           -----b-b--b-|');
      const e2subs = '   ---------^-------!    ';
      const unsub = '    -----------------!    ';
      const expected = ' ---a-a--a-----b-b     ';

      expectSource(e1.pipe(concat(e2)), unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a-a--a|            ');
      const e1subs = '   ^--------!            ';
      const e2 = cold('           -----b-b--b-|');
      const e2subs = '   ---------^-------!    ';
      const expected = ' ---a-a--a-----b-b-    ';
      const unsub = '    -----------------!    ';

      const result = e1.pipe(
        mergeMap(x => of(x)),
        concat(e2),
        mergeMap(x => of(x))
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error from first source and does not emit from second source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --#');
      const e1subs = '   ^-!';
      const e2 = cold('  ----a--|');
      const e2subs: string[] = [];
      const expected = ' --#';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should emit element from first source then raise error from second source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --a--|');
      const e1subs = '   ^----!';
      const e2 = cold('       -------#');
      const e2subs = '   -----^------!';
      const expected = ' --a---------#';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it(
    'should emit all elements from both hot observable sources if first source ' +
      'completes before second source starts emit',
    () => {
      testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const e1 = hot('  --a--b-|');
        const e1subs = '  ^------!';
        const e2 = hot('  --------x--y--|');
        const e2subs = '  -------^------!';
        const expected = '--a--b--x--y--|';

        expectSource(e1.pipe(concat(e2))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      });
    }
  );

  it(
    'should emit elements from second source regardless of completion time ' +
      'when second source is cold observable',
    () => {
      testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
        const e1 = hot('  --a--b--c---|');
        const e1subs = '  ^-----------!';
        const e2 = cold(' -x-y-z-|');
        const e2subs = '  ------------^------!';
        const expected = '--a--b--c----x-y-z-|';

        expectSource(e1.pipe(concat(e2))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      });
    }
  );

  it('should not emit collapsing element from second source', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--c--|');
      const e1subs = '  ^----------!';
      const e2 = hot('  --------x--y--z--|');
      const e2subs = '  -----------^-----!';
      const expected = '--a--b--c--y--z--|';

      expectSource(e1.pipe(concat(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should accept scheduler with multiple observables', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a|');
      const e1subs = '   ^---!';
      const e2 = cold('      ---b--|');
      const e2subs = '   ----^-----!';
      const e3 = cold('            ---c--|');
      const e3subs = '   ----------^-----!';
      const expected = ' ---a---b-----c--|';

      expectSource(e1.pipe(concat(e2, e3, rxTestScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    });
  });

  it('should accept scheduler without observable parameters', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a-|');
      const e1subs = '   ^----!';
      const expected = ' ---a-|';

      expectSource(e1.pipe(concat(rxTestScheduler))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should emit self without parameters', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a-|');
      const e1subs = '   ^----!';
      const expected = ' ---a-|';

      expectSource(e1.pipe(concat())).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });
});
import {expect} from 'chai';
import {from, throwError, of, Observable} from 'rxjs';
import {concatAll, take, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {sourceMatcher} from '../helpers/sourceMatcher';

declare function asDiagram(arg: string): Function;
declare const type: Function;
declare const rxTestScheduler: TestScheduler;

/** @test {concatAll} */
describe('concatAll operator', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('concatAll')('should concat an observable of observables', () => {
    testScheduler.run(({cold, hot, expectSource}) => {
      const x = cold('    ----a------b------|                 ');
      const y = cold('                      ---c-d---|        ');
      const z = cold('                               ---e--f-|');
      const outer = hot('-x---y----z------|', {x: x, y: y, z: z});
      const expected = ' -----a------b---------c-d------e--f-|';

      const result = outer.pipe(concatAll());

      expectSource(result).toBe(expected);
    });
  });

  it('should concat sources from promise', function (done) {
    this.timeout(2000);
    const sources = from([
      new Promise<number>(res => {
        res(0);
      }),
      new Promise<number>(res => {
        res(1);
      }),
      new Promise<number>(res => {
        res(2);
      }),
      new Promise<number>(res => {
        res(3);
      })
    ]).pipe(take(10));

    const res: number[] = [];
    sources.pipe(concatAll()).subscribe(
      x => {
        res.push(x);
      },
      err => {
        done(new Error('should not be called'));
      },
      () => {
        expect(res).to.deep.equal([0, 1, 2, 3]);
        done();
      }
    );
  });

  it('should concat and raise error from promise', function (done) {
    this.timeout(2000);

    const sources = from([
      new Promise<number>(res => {
        res(0);
      }),
      new Promise<number>((res, rej) => {
        rej(1);
      }),
      new Promise<number>(res => {
        res(2);
      }),
      new Promise<number>(res => {
        res(3);
      })
    ]).pipe(take(10));

    const res: number[] = [];
    sources.pipe(concatAll()).subscribe(
      x => {
        res.push(x);
      },
      err => {
        expect(res.length).to.equal(1);
        expect(err).to.equal(1);
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should concat all observables in an observable', () => {
    testScheduler.run(({expectSource}) => {
      const e1 = from([of('a'), of('b'), of('c')]).pipe(take(10));
      const expected = '(abc|)';

      expectSource(e1.pipe(concatAll())).toBe(expected);
    });
  });

  it('should throw if any child observable throws', () => {
    testScheduler.run(({expectSource}) => {
      const e1 = from([of('a'), throwError('error'), of('c')]).pipe(take(10));
      const expected = '(a#)';

      expectSource(e1.pipe(concatAll())).toBe(expected);
    });
  });

  it('should concat merging a hot observable of non-overlapped observables', () => {
    testScheduler.run(({cold, hot, expectSource}) => {
      const values = {
        x: cold('       a-b---------|'),
        y: cold('                 c-d-e-f-|'),
        z: cold('                          g-h-i-j-k-|')
      };

      const e1 = hot('  --x---------y--------z--------|', values);
      const expected = '--a-b---------c-d-e-f-g-h-i-j-k-|';

      expectSource(e1.pipe(concatAll())).toBe(expected);
    });
  });

  it('should raise error if inner observable raises error', () => {
    testScheduler.run(({cold, hot, expectSource}) => {
      const values = {
        x: cold('       a-b---------|'),
        y: cold('                 c-d-e-f-#'),
        z: cold('                         g-h-i-j-k-|')
      };
      const e1 = hot('  --x---------y--------z--------|', values);
      const expected = '--a-b---------c-d-e-f-#';

      expectSource(e1.pipe(concatAll())).toBe(expected);
    });
  });

  it('should raise error if outer observable raises error', () => {
    testScheduler.run(({cold, hot, expectSource}) => {
      const values = {
        y: cold('       a-b---------|'),
        z: cold('                 c-d-e-f-|')
      };
      const e1 = hot('  --y---------z---#    ', values);
      const expected = '--a-b---------c-#';

      expectSource(e1.pipe(concatAll())).toBe(expected);
    });
  });

  it('should complete without emit if both sources are empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --|');
      const e1subs = '   ^-!';
      const e2 = cold('    ----|');
      const e2subs = '   --^---!';
      const expected = ' ------|';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not complete if first source does not completes', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  -');
      const e1subs = '   ^';
      const e2 = cold('  --|');
      const e2subs: string[] = [];
      const expected = ' -';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not complete if second source does not completes', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --|');
      const e1subs = '   ^-!';
      const e2 = cold('  ---');
      const e2subs = '   --^';
      const expected = ' ---';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not complete if both sources do not complete', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  -');
      const e1subs = '   ^';
      const e2 = cold('  -');
      const e2subs: string[] = [];
      const expected = ' -';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error when first source is empty, second source raises error', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --|');
      const e1subs = '   ^-!';
      const e2 = cold('    ----#');
      const e2subs = '   --^---!';
      const expected = ' ------#';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error when first source raises error, second source is empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---#');
      const e1subs = '   ^--!';
      const e2 = cold('  ----|');
      const e2subs: string[] = [];
      const expected = ' ---#';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise first error when both source raise error', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---#');
      const e1subs = '   ^--!';
      const e2 = cold('  ------#');
      const e2subs: string[] = [];
      const expected = ' ---#';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should concat if first source emits once, second source is empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --a--|');
      const e1subs = '   ^----!';
      const e2 = cold('       --------|');
      const e2subs = '   -----^-------!';
      const expected = ' --a----------|';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should concat if first source is empty, second source emits once', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --|');
      const e1subs = '   ^-!';
      const e2 = cold('    --a--|');
      const e2subs = '   --^----!';
      const expected = ' ----a--|';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it(
    'should emit element from first source, and should not complete if second ' +
      'source does not completes',
    () => {
      testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
        const e1 = cold('  --a--|');
        const e1subs = '   ^----!';
        const e2 = cold('       -');
        const e2subs = '   -----^';
        const expected = ' --a---';

        const result = of(e1, e2).pipe(concatAll());

        expectSource(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      });
    }
  );

  it('should not complete if first source does not complete', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  -');
      const e1subs = '   ^';
      const e2 = cold('  --a--|');
      const e2subs: string[] = [];
      const expected = ' -';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should emit elements from each source when source emit once', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a|');
      const e1subs = '   ^---!';
      const e2 = cold('      -----b--|');
      const e2subs = '   ----^-------!';
      const expected = ' ---a-----b--|';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should unsubscribe to inner source if outer is unsubscribed early', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a-a--a|            ');
      const e1subs = '   ^--------!            ';
      const e2 = cold('           -----b-b--b-|');
      const e2subs = '   ---------^-------!    ';
      const unsub = '    -----------------!    ';
      const expected = ' ---a-a--a-----b-b     ';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a-a--a|            ');
      const e1subs = '   ^--------!            ';
      const e2 = cold('           -----b-b--b-|');
      const e2subs = '   ---------^-------!    ';
      const expected = ' ---a-a--a-----b-b-    ';
      const unsub = '    -----------------!    ';

      const result = of(e1, e2).pipe(
        mergeMap(x => of(x)),
        concatAll(),
        mergeMap(x => of(x))
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error from first source and does not emit from second source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --#');
      const e1subs = '   ^-!';
      const e2 = cold('  ----a--|');
      const e2subs: string[] = [];
      const expected = ' --#';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should emit element from first source then raise error from second source', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  --a--|');
      const e1subs = '   ^----!';
      const e2 = cold('       -------#');
      const e2subs = '   -----^------!';
      const expected = ' --a---------#';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it(
    'should emit all elements from both hot observable sources if first source ' +
      'completes before second source starts emit',
    () => {
      testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const e1 = hot('  --a--b-|');
        const e1subs = '  ^------!';
        const e2 = hot('  --------x--y--|');
        const e2subs = '  -------^------!';
        const expected = '--a--b--x--y--|';

        const result = of(e1, e2).pipe(concatAll());

        expectSource(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      });
    }
  );

  it(
    'should emit elements from second source regardless of completion time ' +
      'when second source is cold observable',
    () => {
      testScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
        const e1 = hot('  --a--b--c---|');
        const e1subs = '  ^-----------!';
        const e2 = cold(' -x-y-z-|');
        const e2subs = '  ------------^------!';
        const expected = '--a--b--c----x-y-z-|';

        const result = of(e1, e2).pipe(concatAll());

        expectSource(result).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      });
    }
  );

  it('should not emit collapsing element from second source', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--c--|');
      const e1subs = '  ^----------!';
      const e2 = hot('  --------x--y--z--|');
      const e2subs = '  -----------^-----!';
      const expected = '--a--b--c--y--z--|';

      const result = of(e1, e2).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should be able to work on a different scheduler', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a|');
      const e1subs = '   ^---!';
      const e2 = cold('      ---b--|');
      const e2subs = '   ----^-----!';
      const e3 = cold('            ---c--|');
      const e3subs = '   ----------^-----!';
      const expected = ' ---a---b-----c--|';

      const result = of(e1, e2, e3, rxTestScheduler).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    });
  });

  it('should concatAll a nested observable with a single inner observable', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a-|');
      const e1subs = '   ^----!';
      const expected = ' ---a-|';

      const result = of(e1).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should concatAll a nested observable with a single inner observable, and a scheduler', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a-|');
      const e1subs = '   ^----!';
      const expected = ' ---a-|';

      const result = of(e1, rxTestScheduler).pipe(concatAll());

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number> = of(source1, source2, source3).pipe(
      concatAll()
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number> = of(source1, source2, source3).pipe(
      concatAll()
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    // coerce type to a specific type
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<string> = of(
      <any>source1,
      <any>source2,
      <any>source3
    ).pipe(concatAll<string>());
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    // coerce type to a specific type
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<string> = of(
      <any>source1,
      <any>source2,
      <any>source3
    ).pipe(concatAll<string>());
    /* tslint:enable:no-unused-variable */
  });
});
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {Observable, of, from} from 'rxjs';
import {concatMap, mergeMap, map} from 'rxjs/operators';

declare function asDiagram(arg: string): Function;

/** @test {concatMap} */
describe('Observable.prototype.concatMap', () => {
  asDiagram('concatMap(i => 10*i\u2014\u201410*i\u2014\u201410*i\u2014| )')(
    'should map-and-flatten each item to an Observable',
    () => {
      const e1 = hot('--1-----3--5-------|');
      const e1subs = '^                  !';
      const e2 = cold('x-x-x|              ', {x: 10});
      const expected = '--x-x-x-y-y-yz-z-z-|';
      const values = {x: 10, y: 30, z: 50};

      const result = e1.pipe(
        concatMap(x => e2.pipe(map(i => i * parseInt(x))))
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should support the deprecated resultSelector', () => {
    const results: Array<number[]> = [];

    of(1, 2, 3)
      .pipe(
        concatMap(
          x => of(x, x + 1, x + 2),
          (a, b, i, ii) => [a, b, i, ii]
        )
      )
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([
            [1, 1, 0, 0],
            [1, 2, 0, 1],
            [1, 3, 0, 2],
            [2, 2, 1, 0],
            [2, 3, 1, 1],
            [2, 4, 1, 2],
            [3, 3, 2, 0],
            [3, 4, 2, 1],
            [3, 5, 2, 2]
          ]);
        }
      });
  });

  it('should support a void resultSelector (still deprecated)', () => {
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(concatMap(x => of(x, x + 1, x + 2), void 0))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([1, 2, 3, 2, 3, 4, 3, 4, 5]);
        }
      });
  });

  it('should concatenate many regular interval inners', () => {
    const a = cold('--a-a-a-(a|)                            ');
    const asubs = '^       !                               ';
    const b = cold('----b--b--(b|)                  ');
    const bsubs = '        ^         !                     ';
    const c = cold('-c-c-(c|)      ');
    const csubs = '                         ^    !         ';
    const d = cold('------(d|)');
    const dsubs = '                              ^     !   ';
    const e1 = hot('a---b--------------------c-d----|       ');
    const e1subs = '^                               !       ';
    const expected = '--a-a-a-a---b--b--b-------c-c-c-----(d|)';

    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d
    };
    const source = e1.pipe(concatMap(value => observableLookup[value]));

    expectSource(source).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
    expectSubscriptions(c.subscriptions).toBe(csubs);
    expectSubscriptions(d.subscriptions).toBe(dsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many outer values to many inner values', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---|                        ');
    const e1subs = '^                !                        ';
    const inner = cold('--i-j-k-l-|                               ', values);
    const innersubs = [
      ' ^         !                              ',
      '           ^         !                    ',
      '                     ^         !          ',
      '                               ^         !'
    ];
    const expected = '---i-j-k-l---i-j-k-l---i-j-k-l---i-j-k-l-|';

    const result = e1.pipe(concatMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an empty source', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const inner = cold('-1-2-3|');
    const innersubs: string[] = [];
    const expected = '|';

    const result = e1.pipe(concatMap(() => inner));

    expectSource(result).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a never source', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const inner = cold('-1-2-3|');
    const innersubs: string[] = [];
    const expected = '-';

    const result = e1.pipe(
      concatMap(() => {
        return inner;
      })
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should error immediately if given a just-throw source', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const inner = cold('-1-2-3|');
    const innersubs: string[] = [];
    const expected = '#';

    const result = e1.pipe(
      concatMap(() => {
        return inner;
      })
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return a silenced version of the source if the mapped inner is empty', () => {
    const e1 = cold('--a-b--c-| ');
    const e1subs = '^        ! ';
    const inner = cold('|');
    const innersubs = ['  (^!)     ', '    (^!)   ', '       (^!)'];
    const expected = '---------| ';

    const result = e1.pipe(
      concatMap(() => {
        return inner;
      })
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return a never if the mapped inner is never', () => {
    const e1 = cold('--a-b--c-|');
    const e1subs = '^        !';
    const inner = cold('-');
    const innersubs = '  ^       ';
    const expected = '----------';

    const result = e1.pipe(
      concatMap(() => {
        return inner;
      })
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should propagate errors if the mapped inner is a just-throw Observable', () => {
    const e1 = cold('--a-b--c-|');
    const e1subs = '^ !       ';
    const inner = cold('#');
    const innersubs = '  (^!)    ';
    const expected = '--#       ';

    const result = e1.pipe(
      concatMap(() => {
        return inner;
      })
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many outer to many inner, complete late', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d----------------------------------|');
    const e1subs = '^                                               !';
    const inner = cold(
      '--i-j-k-l-|                                     ',
      values
    );
    const innersubs = [
      ' ^         !                                     ',
      '           ^         !                           ',
      '                     ^         !                 ',
      '                               ^         !       '
    ];
    const expected = '---i-j-k-l---i-j-k-l---i-j-k-l---i-j-k-l--------|';

    const result = e1.pipe(concatMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many outer to many inner, outer never completes', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d-----------------------------------');
    const e1subs = '^                                                ';
    const inner = cold(
      '--i-j-k-l-|                                     ',
      values
    );
    const innersubs = [
      ' ^         !                                     ',
      '           ^         !                           ',
      '                     ^         !                 ',
      '                               ^         !       '
    ];
    const expected = '---i-j-k-l---i-j-k-l---i-j-k-l---i-j-k-l---------';

    const result = e1.pipe(concatMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many outer to many inner, inner never completes', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---|');
    const e1subs = '^                !';
    const inner = cold('--i-j-k-l-       ', values);
    const innersubs = ' ^                ';
    const expected = '---i-j-k-l--------';

    const result = e1.pipe(concatMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many outer to many inner, and inner throws', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---|');
    const e1subs = '^          !      ';
    const inner = cold('--i-j-k-l-#      ', values);
    const innersubs = ' ^         !      ';
    const expected = '---i-j-k-l-#      ';

    const result = e1.pipe(concatMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many outer to many inner, and outer throws', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---#');
    const e1subs = '^                !';
    const inner = cold('--i-j-k-l-|      ', values);
    const innersubs = [' ^         !      ', '           ^     !'];
    const expected = '---i-j-k-l---i-j-#';

    const result = e1.pipe(concatMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many outer to many inner, both inner and outer throw', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---#');
    const e1subs = '^          !      ';
    const inner = cold('--i-j-k-l-#      ', values);
    const innersubs = ' ^         !      ';
    const expected = '---i-j-k-l-#      ';

    const result = e1.pipe(concatMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many complex, where all inners are finite', () => {
    const a = cold(
      '-#                                                          '
    );
    const asubs: string[] = [];
    const b = cold(
      '-#                                                        '
    );
    const bsubs: string[] = [];
    const c = cold('-2--3--4--5----6-|                                   ');
    const csubs = '  ^                !                                   ';
    const d = cold('----2--3|                           ');
    const dsubs = '                   ^       !                           ';
    const e = cold('-1------2--3-4-5---|        ');
    const esubs = '                           ^                  !        ';
    const f = cold('--|      ');
    const fsubs = '                                              ^ !      ';
    const g = cold('---1-2|');
    const gsubs = '                                                ^     !';
    const e1 = hot(
      '-a-b--^-c-----d------e----------------f-----g|               '
    );
    const e1subs = '^                                      !               ';
    const expected = '---2--3--4--5----6-----2--3-1------2--3-4-5--------1-2|';
    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(concatMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
    expectSubscriptions(c.subscriptions).toBe(csubs);
    expectSubscriptions(d.subscriptions).toBe(dsubs);
    expectSubscriptions(e.subscriptions).toBe(esubs);
    expectSubscriptions(f.subscriptions).toBe(fsubs);
    expectSubscriptions(g.subscriptions).toBe(gsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many complex, all inners finite except one', () => {
    const a = cold(
      '-#                                                          '
    );
    const asubs: string[] = [];
    const b = cold(
      '-#                                                        '
    );
    const bsubs: string[] = [];
    const c = cold('-2--3--4--5----6-|                                   ');
    const csubs = '  ^                !                                   ';
    const d = cold('----2--3-                           ');
    const dsubs = '                   ^                                   ';
    const e = cold('-1------2--3-4-5---|        ');
    const esubs: string[] = [];
    const f = cold('--|      ');
    const fsubs: string[] = [];
    const g = cold('---1-2|');
    const gsubs: string[] = [];
    const e1 = hot(
      '-a-b--^-c-----d------e----------------f-----g|               '
    );
    const e1subs = '^                                      !               ';
    const expected = '---2--3--4--5----6-----2--3----------------------------';
    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(concatMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
    expectSubscriptions(c.subscriptions).toBe(csubs);
    expectSubscriptions(d.subscriptions).toBe(dsubs);
    expectSubscriptions(e.subscriptions).toBe(esubs);
    expectSubscriptions(f.subscriptions).toBe(fsubs);
    expectSubscriptions(g.subscriptions).toBe(gsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many complex, inners finite, outer does not complete', () => {
    const a = cold(
      '-#                                                          '
    );
    const asubs: string[] = [];
    const b = cold(
      '-#                                                        '
    );
    const bsubs: string[] = [];
    const c = cold('-2--3--4--5----6-|                                   ');
    const csubs = '  ^                !                                   ';
    const d = cold('----2--3|                           ');
    const dsubs = '                   ^       !                           ';
    const e = cold('-1------2--3-4-5---|        ');
    const esubs = '                           ^                  !        ';
    const f = cold('--|      ');
    const fsubs = '                                              ^ !      ';
    const g = cold('---1-2|');
    const gsubs = '                                                ^     !';
    const e1 = hot(
      '-a-b--^-c-----d------e----------------f-----g---             '
    );
    const e1subs = '^                                                      ';
    const expected = '---2--3--4--5----6-----2--3-1------2--3-4-5--------1-2-';
    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(concatMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
    expectSubscriptions(c.subscriptions).toBe(csubs);
    expectSubscriptions(d.subscriptions).toBe(dsubs);
    expectSubscriptions(e.subscriptions).toBe(esubs);
    expectSubscriptions(f.subscriptions).toBe(fsubs);
    expectSubscriptions(g.subscriptions).toBe(gsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many complex, all inners finite, and outer throws', () => {
    const a = cold(
      '-#                                                          '
    );
    const asubs: string[] = [];
    const b = cold(
      '-#                                                        '
    );
    const bsubs: string[] = [];
    const c = cold('-2--3--4--5----6-|                                   ');
    const csubs = '  ^                !                                   ';
    const d = cold('----2--3|                           ');
    const dsubs = '                   ^       !                           ';
    const e = cold('-1------2--3-4-5---|        ');
    const esubs = '                           ^           !               ';
    const f = cold('--|      ');
    const fsubs: string[] = [];
    const g = cold('---1-2|');
    const gsubs: string[] = [];
    const e1 = hot(
      '-a-b--^-c-----d------e----------------f-----g#               '
    );
    const e1subs = '^                                      !               ';
    const expected = '---2--3--4--5----6-----2--3-1------2--3#               ';
    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(concatMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
    expectSubscriptions(c.subscriptions).toBe(csubs);
    expectSubscriptions(d.subscriptions).toBe(dsubs);
    expectSubscriptions(e.subscriptions).toBe(esubs);
    expectSubscriptions(f.subscriptions).toBe(fsubs);
    expectSubscriptions(g.subscriptions).toBe(gsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many complex, all inners complete except one throws', () => {
    const a = cold(
      '-#                                                          '
    );
    const asubs: string[] = [];
    const b = cold(
      '-#                                                        '
    );
    const bsubs: string[] = [];
    const c = cold('-2--3--4--5----6-#                                   ');
    const csubs = '  ^                !                                   ';
    const d = cold('----2--3|                           ');
    const dsubs: string[] = [];
    const e = cold('-1------2--3-4-5---|        ');
    const esubs: string[] = [];
    const f = cold('--|      ');
    const fsubs: string[] = [];
    const g = cold('---1-2|');
    const gsubs: string[] = [];
    const e1 = hot(
      '-a-b--^-c-----d------e----------------f-----g|               '
    );
    const e1subs = '^                  !                                   ';
    const expected = '---2--3--4--5----6-#                                   ';
    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(concatMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
    expectSubscriptions(c.subscriptions).toBe(csubs);
    expectSubscriptions(d.subscriptions).toBe(dsubs);
    expectSubscriptions(e.subscriptions).toBe(esubs);
    expectSubscriptions(f.subscriptions).toBe(fsubs);
    expectSubscriptions(g.subscriptions).toBe(gsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many complex, all inners finite, outer is unsubscribed early', () => {
    const a = cold(
      '-#                                                          '
    );
    const asubs: string[] = [];
    const b = cold(
      '-#                                                        '
    );
    const bsubs: string[] = [];
    const c = cold('-2--3--4--5----6-|                                   ');
    const csubs = '  ^                !                                   ';
    const d = cold('----2--3|                           ');
    const dsubs = '                   ^       !                           ';
    const e = cold('-1------2--3-4-5---|        ');
    const esubs = '                           ^  !                        ';
    const f = cold('--|      ');
    const fsubs: string[] = [];
    const g = cold('---1-2|');
    const gsubs: string[] = [];
    const e1 = hot(
      '-a-b--^-c-----d------e----------------f-----g|               '
    );
    const e1subs = '^                             !                        ';
    const unsub = '                              !                        ';
    const expected = '---2--3--4--5----6-----2--3-1--                        ';
    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(concatMap(value => observableLookup[value]));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
    expectSubscriptions(c.subscriptions).toBe(csubs);
    expectSubscriptions(d.subscriptions).toBe(dsubs);
    expectSubscriptions(e.subscriptions).toBe(esubs);
    expectSubscriptions(f.subscriptions).toBe(fsubs);
    expectSubscriptions(g.subscriptions).toBe(gsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const a = cold(
      '-#                                                          '
    );
    const asubs: string[] = [];
    const b = cold(
      '-#                                                        '
    );
    const bsubs: string[] = [];
    const c = cold('-2--3--4--5----6-|                                   ');
    const csubs = '  ^                !                                   ';
    const d = cold('----2--3|                           ');
    const dsubs = '                   ^       !                           ';
    const e = cold('-1------2--3-4-5---|        ');
    const esubs = '                           ^  !                        ';
    const f = cold('--|      ');
    const fsubs: string[] = [];
    const g = cold('---1-2|');
    const gsubs: string[] = [];
    const e1 = hot(
      '-a-b--^-c-----d------e----------------f-----g|               '
    );
    const e1subs = '^                             !                        ';
    const unsub = '                              !                        ';
    const expected = '---2--3--4--5----6-----2--3-1--                        ';
    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(
      mergeMap(x => of(x)),
      concatMap(value => observableLookup[value]),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
    expectSubscriptions(c.subscriptions).toBe(csubs);
    expectSubscriptions(d.subscriptions).toBe(dsubs);
    expectSubscriptions(e.subscriptions).toBe(esubs);
    expectSubscriptions(f.subscriptions).toBe(fsubs);
    expectSubscriptions(g.subscriptions).toBe(gsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many complex, all inners finite, project throws', () => {
    const a = cold(
      '-#                                                          '
    );
    const asubs: string[] = [];
    const b = cold(
      '-#                                                        '
    );
    const bsubs: string[] = [];
    const c = cold('-2--3--4--5----6-|                                   ');
    const csubs = '  ^                !                                   ';
    const d = cold('----2--3|                           ');
    const dsubs = '                   ^       !                           ';
    const e = cold('-1------2--3-4-5---|        ');
    const esubs: string[] = [];
    const f = cold('--|      ');
    const fsubs: string[] = [];
    const g = cold('---1-2|');
    const gsubs: string[] = [];
    const e1 = hot(
      '-a-b--^-c-----d------e----------------f-----g|               '
    );
    const e1subs = '^                          !                           ';
    const expected = '---2--3--4--5----6-----2--3#                           ';
    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(
      concatMap(value => {
        if (value === 'e') {
          throw 'error';
        }
        return observableLookup[value];
      })
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
    expectSubscriptions(c.subscriptions).toBe(csubs);
    expectSubscriptions(d.subscriptions).toBe(dsubs);
    expectSubscriptions(e.subscriptions).toBe(esubs);
    expectSubscriptions(f.subscriptions).toBe(fsubs);
    expectSubscriptions(g.subscriptions).toBe(gsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  function arrayRepeat(value: string, times: number) {
    let results = [];
    for (let i = 0; i < times; i++) {
      results.push(value);
    }
    return results;
  }

  it('should concatMap many outer to an array for each value', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const e1subs = '^                               !';
    const expected = '(22)--(4444)---(333)----(22)----|';

    const result = e1.pipe(concatMap(value => arrayRepeat(value, +value)));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many outer to inner arrays, outer unsubscribed early', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const e1subs = '^            !                   ';
    const unsub = '             !                   ';
    const expected = '(22)--(4444)--                   ';

    const result = e1.pipe(concatMap(value => arrayRepeat(value, +value)));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should concatMap many outer to inner arrays, project throws', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const e1subs = '^              !                 ';
    const expected = '(22)--(4444)---#                 ';

    let invoked = 0;
    const result = e1.pipe(
      concatMap(value => {
        invoked++;
        if (invoked === 3) {
          throw 'error';
        }
        return arrayRepeat(value, +value);
      })
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
  it('should map values to constant resolved promises and concatenate', (done: MochaDone) => {
    const source = from([4, 3, 2, 1]);
    const project = (value: number) => from(Promise.resolve(42));

    const results: number[] = [];
    source.pipe(concatMap(project)).subscribe(
      x => {
        results.push(x);
      },
      err => {
        done(new Error('Subscriber error handler not supposed to be called.'));
      },
      () => {
        expect(results).to.deep.equal([42, 42, 42, 42]);
        done();
      }
    );
  });

  it('should map values to constant rejected promises and concatenate', done => {
    const source = from([4, 3, 2, 1]);
    const project = (value: any) => from(Promise.reject(42));

    source.pipe(concatMap(project)).subscribe(
      x => {
        done(new Error('Subscriber next handler not supposed to be called.'));
      },
      err => {
        expect(err).to.deep.equal(42);
        done();
      },
      () => {
        done(
          new Error('Subscriber complete handler not supposed to be called.')
        );
      }
    );
  });

  it('should map values to resolved promises and concatenate', done => {
    const source = from([4, 3, 2, 1]);
    const project = (value: number, index: number) =>
      from(Promise.resolve(value + index));

    const results: number[] = [];
    source.pipe(concatMap(project)).subscribe(
      x => {
        results.push(x);
      },
      err => {
        done(new Error('Subscriber error handler not supposed to be called.'));
      },
      () => {
        expect(results).to.deep.equal([4, 4, 4, 4]);
        done();
      }
    );
  });

  it('should map values to rejected promises and concatenate', done => {
    const source = from([4, 3, 2, 1]);
    const project = (value: number, index: number) =>
      from(Promise.reject('' + value + '-' + index));

    source.pipe(concatMap(project)).subscribe(
      x => {
        done(new Error('Subscriber next handler not supposed to be called.'));
      },
      err => {
        expect(err).to.deep.equal('4-0');
        done();
      },
      () => {
        done(
          new Error('Subscriber complete handler not supposed to be called.')
        );
      }
    );
  });
});
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of, from, Observable} from 'rxjs';
import {concatMapTo, mergeMap} from 'rxjs/operators';

declare function asDiagram(arg: string): Function;

/** @test {concatMapTo} */
describe('Observable.prototype.concatMapTo', () => {
  asDiagram('concatMapTo( 10\u2014\u201410\u2014\u201410\u2014| )')(
    'should map-and-flatten each item to an Observable',
    () => {
      const e1 = hot('--1-----3--5-------|');
      const e1subs = '^                  !';
      const e2 = cold('x-x-x|              ', {x: 10});
      const expected = '--x-x-x-x-x-xx-x-x-|';
      const values = {x: 10};

      const result = e1.pipe(concatMapTo(e2));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should support the deprecated resultSelector', () => {
    const results: Array<number[]> = [];

    of(1, 2, 3)
      .pipe(concatMapTo(of(4, 5, 6), (a, b, i, ii) => [a, b, i, ii]))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([
            [1, 4, 0, 0],
            [1, 5, 0, 1],
            [1, 6, 0, 2],
            [2, 4, 1, 0],
            [2, 5, 1, 1],
            [2, 6, 1, 2],
            [3, 4, 2, 0],
            [3, 5, 2, 1],
            [3, 6, 2, 2]
          ]);
        }
      });
  });

  it('should support a void resultSelector (still deprecated)', () => {
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(concatMapTo(of(4, 5, 6), void 0))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([4, 5, 6, 4, 5, 6, 4, 5, 6]);
        }
      });
  });

  it('should concatMapTo many outer values to many inner values', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---|                        ');
    const e1subs = '^                !                        ';
    const inner = cold('--i-j-k-l-|                              ', values);
    const innersubs = [
      ' ^         !                              ',
      '           ^         !                    ',
      '                     ^         !          ',
      '                               ^         !'
    ];
    const expected = '---i-j-k-l---i-j-k-l---i-j-k-l---i-j-k-l-|';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should handle an empty source', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const inner = cold('-1-2-3|');
    const innersubs: string[] = [];
    const expected = '|';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should handle a never source', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const inner = cold('-1-2-3|');
    const innersubs: string[] = [];
    const expected = '-';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should error immediately if given a just-throw source', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const inner = cold('-1-2-3|');
    const innersubs: string[] = [];
    const expected = '#';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should return a silenced version of the source if the mapped inner is empty', () => {
    const e1 = cold('--a-b--c-|');
    const e1subs = '^        !';
    const inner = cold('|');
    const innersubs = ['  (^!)     ', '    (^!)   ', '       (^!)'];
    const expected = '---------|';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should return a never if the mapped inner is never', () => {
    const e1 = cold('--a-b--c-|');
    const e1subs = '^        !';
    const inner = cold('-');
    const innersubs = '  ^       ';
    const expected = '----------';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should propagate errors if the mapped inner is a just-throw Observable', () => {
    const e1 = cold('--a-b--c-|');
    const e1subs = '^ !       ';
    const inner = cold('#');
    const innersubs = '  (^!)    ';
    const expected = '--#';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should concatMapTo many outer to many inner, complete late', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d----------------------------------|');
    const e1subs = '^                                               !';
    const inner = cold(
      '--i-j-k-l-|                                     ',
      values
    );
    const innersubs = [
      ' ^         !                                     ',
      '           ^         !                           ',
      '                     ^         !                 ',
      '                               ^         !       '
    ];
    const expected = '---i-j-k-l---i-j-k-l---i-j-k-l---i-j-k-l--------|';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should concatMapTo many outer to many inner, outer never completes', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d-----------------------------------');
    const e1subs = '^                                                ';
    const inner = cold(
      '--i-j-k-l-|                                     ',
      values
    );
    const innersubs = [
      ' ^         !                                     ',
      '           ^         !                           ',
      '                     ^         !                 ',
      '                               ^         !       '
    ];
    const expected = '---i-j-k-l---i-j-k-l---i-j-k-l---i-j-k-l---------';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---| ');
    const e1subs = '^                ! ';
    const inner = cold('--i-j-k-l-|       ', values);
    const innersubs = [' ^         !       ', '           ^      !'];
    const expected = '---i-j-k-l---i-j-k-';
    const unsub = '                  !';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      concatMapTo(inner),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should concatMapTo many outer to many inner, inner never completes', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---|');
    const e1subs = '^                !';
    const inner = cold('--i-j-k-l-       ', values);
    const innersubs = ' ^                ';
    const expected = '---i-j-k-l--------';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should concatMapTo many outer to many inner, and inner throws', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---|');
    const e1subs = '^          !      ';
    const inner = cold('--i-j-k-l-#      ', values);
    const innersubs = ' ^         !      ';
    const expected = '---i-j-k-l-#      ';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should concatMapTo many outer to many inner, and outer throws', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---#');
    const e1subs = '^                !';
    const inner = cold('--i-j-k-l-|      ', values);
    const innersubs = [' ^         !      ', '           ^     !'];
    const expected = '---i-j-k-l---i-j-#';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should concatMapTo many outer to many inner, both inner and outer throw', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a---b---c---d---#');
    const e1subs = '^          !      ';
    const inner = cold('--i-j-k-l-#      ', values);
    const innersubs = ' ^         !      ';
    const expected = '---i-j-k-l-#      ';

    const result = e1.pipe(concatMapTo(inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should concatMapTo many outer to an array', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const expected = '(0123)(0123)---(0123)---(0123)--|';

    const result = e1.pipe(concatMapTo(['0', '1', '2', '3']));

    expectSource(result).toBe(expected);
  });

  it('should concatMapTo many outer to inner arrays, and outer throws', () => {
    const e1 = hot('2-----4--------3--------2-------#');
    const expected = '(0123)(0123)---(0123)---(0123)--#';

    const result = e1.pipe(concatMapTo(['0', '1', '2', '3']));

    expectSource(result).toBe(expected);
  });

  it('should mergeMap many outer to inner arrays, outer unsubscribed early', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const unsub = '             !';
    const expected = '(0123)(0123)--';

    const result = e1.pipe(concatMapTo(['0', '1', '2', '3']));

    expectSource(result, unsub).toBe(expected);
  });

  it('should map values to constant resolved promises and concatenate', (done: MochaDone) => {
    const source = from([4, 3, 2, 1]);

    const results: number[] = [];
    source.pipe(concatMapTo(from(Promise.resolve(42)))).subscribe(
      x => {
        results.push(x);
      },
      err => {
        done(new Error('Subscriber error handler not supposed to be called.'));
      },
      () => {
        expect(results).to.deep.equal([42, 42, 42, 42]);
        done();
      }
    );
  });

  it('should map values to constant rejected promises and concatenate', done => {
    const source = from([4, 3, 2, 1]);

    source.pipe(concatMapTo(from(Promise.reject(42)))).subscribe(
      x => {
        done(new Error('Subscriber next handler not supposed to be called.'));
      },
      err => {
        expect(err).to.equal(42);
        done();
      },
      () => {
        done(
          new Error('Subscriber complete handler not supposed to be called.')
        );
      }
    );
  });
});
import {expect} from 'chai';
import {of, Observable} from 'rxjs';
import {concatWith, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {assertDeepEquals, NO_SUBS} from '../helpers/test-helper';

/** @test {concat} */
describe('concat operator', () => {
  let rxTest: TestScheduler;

  beforeEach(() => {
    rxTest = new TestScheduler(assertDeepEquals);
  });

  it('should concatenate two cold observables', () => {
    rxTest.run(({cold, expectSource}) => {
      const e1 = cold(' --a--b-|');
      const e2 = cold('        --x---y--|');
      const expected = '--a--b---x---y--|';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
    });
  });

  it('should work properly with scalar observables', done => {
    const results: string[] = [];

    const s1 = new Observable<number>(observer => {
      setTimeout(() => {
        observer.next(1);
        observer.complete();
      });
    }).pipe(concatWith(of(2)));

    s1.subscribe(
      x => {
        results.push('Next: ' + x);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        results.push('Completed');
        expect(results).to.deep.equal(['Next: 1', 'Next: 2', 'Completed']);
        done();
      }
    );
  });

  it('should complete without emit if both sources are empty', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' --|');
      const e1subs = '  ^-!';
      const e2 = cold('   ----|');
      const e2subs = '  --^---!';
      const expected = '------|';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not complete if first source does not completes', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' ---');
      const e1subs = '  ^--';
      const e2 = cold('    --|');
      const e2subs = NO_SUBS;
      const expected = '---';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not complete if second source does not completes', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' --|');
      const e1subs = '  ^-!';
      const e2 = cold('   ---');
      const e2subs = '  --^--';
      const expected = '-----';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not complete if both sources do not complete', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' ---');
      const e1subs = '  ^--';
      const e2 = cold('    ---');
      const e2subs = NO_SUBS;
      const expected = '---';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error when first source is empty, second source raises error', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' --|');
      const e1subs = '  ^-!';
      const e2 = cold('   ----#');
      const e2subs = '  --^---!';
      const expected = '------#';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error when first source raises error, second source is empty', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' ---#');
      const e1subs = '  ^--!';
      const e2 = cold('    ----|');
      const expected = '---#';
      const e2subs = NO_SUBS;

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise first error when both source raise error', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' ---#');
      const e1subs = '  ^--!';
      const e2 = cold('    ------#');
      const expected = '---#';
      const e2subs = NO_SUBS;

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should concat if first source emits once, second source is empty', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' --a--|');
      const e1subs = '  ^----!';
      const e2 = cold('      --------|');
      const e2subs = '  -----^-------!';
      const expected = '--a----------|';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should concat if first source is empty, second source emits once', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' --|');
      const e1subs = '  ^-!';
      const e2 = cold('   --a--|');
      const e2subs = '  --^----!';
      const expected = '----a--|';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it(
    'should emit element from first source, and should not complete if second ' +
      'source does not completes',
    () => {
      rxTest.run(({cold, expectSource, expectSubscriptions}) => {
        const e1 = cold(' --a--|');
        const e1subs = '  ^----!';
        const e2 = cold('      ---');
        const e2subs = '  -----^--';
        const expected = '--a-----';

        expectSource(e1.pipe(concatWith(e2))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      });
    }
  );

  it('should not complete if first source does not complete', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' ---');
      const e1subs = '  ^--';
      const e2 = cold('    --a--|');
      const e2subs = NO_SUBS;
      const expected = '---';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should emit elements from each source when source emit once', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' ---a|');
      const e1subs = '  ^---!';
      const e2 = cold('     -----b--|');
      const e2subs = '  ----^-------!';
      const expected = '---a-----b--|';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should unsubscribe to inner source if outer is unsubscribed early', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('  ---a-a--a|            ');
      const e1subs = '   ^--------!            ';
      const e2 = cold('           -----b-b--b-|');
      const e2subs = '   ---------^-------!';
      const unsub = '    -----------------!  ';
      const expected = ' ---a-a--a-----b-b     ';

      expectSource(e1.pipe(concatWith(e2)), unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' ---a-a--a|            ');
      const e1subs = '  ^--------!            ';
      const e2 = cold('          -----b-b--b-|');
      const e2subs = '  ---------^--------!    ';
      const expected = '---a-a--a-----b-b-    ';
      const unsub = '   ------------------!    ';

      const result = e1.pipe(
        mergeMap(x => of(x)),
        concatWith(e2),
        mergeMap(x => of(x))
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should raise error from first source and does not emit from second source', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' --#');
      const e1subs = '  ^-!';
      const e2 = cold('   ----a--|');
      const e2subs = NO_SUBS;
      const expected = '--#';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should emit element from first source then raise error from second source', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' --a--|');
      const e1subs = '  ^----!';
      const e2 = cold('      -------#');
      const e2subs = '  -----^------!';
      const expected = '--a---------#';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it(
    'should emit all elements from both hot observable sources if first source ' +
      'completes before second source starts emit',
    () => {
      rxTest.run(({hot, expectSource, expectSubscriptions}) => {
        const e1 = hot('  --a--b-|');
        const e1subs = '  ^------!';
        const e2 = hot('  --------x--y--|');
        const e2subs = '  -------^------!';
        const expected = '--a--b--x--y--|';

        expectSource(e1.pipe(concatWith(e2))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      });
    }
  );

  it(
    'should emit elements from second source regardless of completion time ' +
      'when second source is cold observable',
    () => {
      rxTest.run(({hot, cold, expectSource, expectSubscriptions}) => {
        const e1 = hot('  --a--b--c---|');
        const e1subs = '  ^-----------!';
        const e2 = cold('           -x-y-z-|');
        const e2subs = '  ------------^------!';
        const expected = '--a--b--c----x-y-z-|';

        expectSource(e1.pipe(concatWith(e2))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
      });
    }
  );

  it('should not emit collapsing element from second source', () => {
    rxTest.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--c--|');
      const e1subs = '  ^----------!';
      const e2 = hot('  --------x--y--z--|');
      const e2subs = '  -----------^-----!';
      const expected = '--a--b--c--y--z--|';

      expectSource(e1.pipe(concatWith(e2))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should emit self without parameters', () => {
    rxTest.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' ---a-|');
      const e1subs = '  ^----!';
      const expected = '---a-|';

      expectSource(e1.pipe(concatWith())).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });
});
import {expect} from 'chai';
import {of, range} from 'rxjs';
import {count, skip, take, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

declare function asDiagram(arg: string): Function;

/** @test {count} */
describe('count operator', () => {
  asDiagram('count')('should count the values of an observable', () => {
    const source = hot('--a--b--c--|');
    const subs = '^          !';
    const expected = '-----------(x|)';

    expectSource(source.pipe(count())).toBe(expected, {x: 3});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should be never when source is never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(count())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should be zero when source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(w|)';

    expectSource(e1.pipe(count())).toBe(expected, {w: 0});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it("should be never when source doesn't complete", () => {
    const e1 = hot('--x--^--y--');
    const e1subs = '^     ';
    const expected = '------';

    expectSource(e1.pipe(count())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it("should be zero when source doesn't have values", () => {
    const e1 = hot('-x-^---|');
    const e1subs = '^   !';
    const expected = '----(w|)';

    expectSource(e1.pipe(count())).toBe(expected, {w: 0});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should count the unique value of an observable', () => {
    const e1 = hot('-x-^--y--|');
    const e1subs = '^     !';
    const expected = '------(w|)';

    expectSource(e1.pipe(count())).toBe(expected, {w: 1});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should count the values of an ongoing hot observable', () => {
    const source = hot('--a-^-b--c--d--|');
    const subs = '^          !';
    const expected = '-----------(x|)';

    expectSource(source.pipe(count())).toBe(expected, {x: 3});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should count a range() source observable', (done: MochaDone) => {
    range(1, 10)
      .pipe(count())
      .subscribe(
        (value: number) => {
          expect(value).to.equal(10);
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
  });

  it('should count a range().skip(1) source observable', (done: MochaDone) => {
    range(1, 10)
      .pipe(skip(1), count())
      .subscribe(
        (value: number) => {
          expect(value).to.equal(9);
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
  });

  it('should count a range().take(1) source observable', (done: MochaDone) => {
    range(1, 10)
      .pipe(take(1), count())
      .subscribe(
        (value: number) => {
          expect(value).to.equal(1);
        },
        x => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
  });

  it('should work with error', () => {
    const e1 = hot('-x-^--y--z--#', {x: 1, y: 2, z: 3}, 'too bad');
    const e1subs = '^        !';
    const expected = '---------#';

    expectSource(e1.pipe(count())).toBe(expected, null, 'too bad');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(count())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an always-true predicate on an empty hot observable', () => {
    const e1 = hot('-x-^---|');
    const e1subs = '^   !';
    const expected = '----(w|)';
    const predicate = () => {
      return true;
    };

    expectSource(e1.pipe(count(predicate))).toBe(expected, {w: 0});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an always-false predicate on an empty hot observable', () => {
    const e1 = hot('-x-^---|');
    const e1subs = '^   !';
    const expected = '----(w|)';
    const predicate = () => {
      return false;
    };

    expectSource(e1.pipe(count(predicate))).toBe(expected, {w: 0});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an always-true predicate on a simple hot observable', () => {
    const e1 = hot('-x-^-a-|');
    const e1subs = '^   !';
    const expected = '----(w|)';
    const predicate = () => {
      return true;
    };

    expectSource(e1.pipe(count(predicate))).toBe(expected, {w: 1});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an always-false predicate on a simple hot observable', () => {
    const e1 = hot('-x-^-a-|');
    const e1subs = '^   !';
    const expected = '----(w|)';
    const predicate = () => {
      return false;
    };

    expectSource(e1.pipe(count(predicate))).toBe(expected, {w: 0});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early and explicitly', () => {
    const e1 = hot('-1-^-2--3--4-|');
    const e1subs = '^     !    ';
    const expected = '-------    ';
    const unsub = '      !    ';

    const result = e1.pipe(count((value: string) => parseInt(value) < 10));

    expectSource(result, unsub).toBe(expected, {w: 3});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('-1-^-2--3--4-|');
    const e1subs = '^     !    ';
    const expected = '-------    ';
    const unsub = '      !    ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      count((value: string) => parseInt(value) < 10),
      mergeMap((x: number) => of(x))
    );

    expectSource(result, unsub).toBe(expected, {w: 3});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a match-all predicate on observable with many values', () => {
    const e1 = hot('-1-^-2--3--4-|');
    const e1subs = '^         !';
    const expected = '----------(w|)';
    const predicate = (value: string) => parseInt(value) < 10;

    expectSource(e1.pipe(count(predicate))).toBe(expected, {w: 3});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a match-none predicate on observable with many values', () => {
    const e1 = hot('-1-^-2--3--4-|');
    const e1subs = '^         !';
    const expected = '----------(w|)';
    const predicate = (value: string) => parseInt(value) > 10;

    expectSource(e1.pipe(count(predicate))).toBe(expected, {w: 0});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an always-true predicate on observable that throws', () => {
    const e1 = hot('-1-^---#');
    const e1subs = '^   !';
    const expected = '----#';
    const predicate = () => true;

    expectSource(e1.pipe(count(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an always-false predicate on observable that throws', () => {
    const e1 = hot('-1-^---#');
    const e1subs = '^   !';
    const expected = '----#';
    const predicate = () => false;

    expectSource(e1.pipe(count(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an always-true predicate on a hot never-observable', () => {
    const e1 = hot('-x-^----');
    const e1subs = '^    ';
    const expected = '-----';
    const predicate = () => true;

    expectSource(e1.pipe(count(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a predicate that throws, on observable with many values', () => {
    const e1 = hot('-1-^-2--3--|');
    const e1subs = '^    !   ';
    const expected = '-----#   ';
    const predicate = (value: string) => {
      if (value === '3') {
        throw 'error';
      }
      return true;
    };

    expectSource(e1.pipe(count(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {expect} from 'chai';
import {NEVER, timer, of, EMPTY, concat, Subject, Observable} from 'rxjs';
import {debounce, mergeMap, mapTo} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

declare const type: Function;
declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {debounce} */
describe('debounce operator', () => {
  function getTimerSelector(x: number) {
    return () => timer(x, rxTestScheduler);
  }

  asDiagram('debounce')(
    'should debounce values by a specified cold Observable',
    () => {
      const e1 = hot('-a--bc--d---|');
      const e2 = cold('--|          ');
      const expected = '---a---c--d-|';

      const result = e1.pipe(debounce(() => e2));

      expectSource(result).toBe(expected);
    }
  );

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
    const selector = [
      cold('-x-y-'),
      cold('--x-y-'),
      cold('---x-y-'),
      cold('----x-y-')
    ];
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

    expect(results).to.deep.equal([1, 2]);
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
import {expect} from 'chai';
import {of, Subject} from 'rxjs';
import {debounceTime, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {Virtual} from '../../scheduler/Virtual';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {debounceTime} */
describe('debounceTime operator', () => {
  asDiagram('debounceTime(20)')(
    'should debounce values by 20 time units',
    () => {
      const e1 = hot('-a--bc--d---|');
      const expected = '---a---c--d-|';

      expectSource(e1.pipe(debounceTime(20, rxTestScheduler))).toBe(expected);
    }
  );

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

    expect(results).to.deep.equal([1, 2]);
  });
});
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of} from 'rxjs';
import {defaultIfEmpty, mergeMap} from 'rxjs/operators';

declare function asDiagram(arg: string): Function;

/** @test {defaultIfEmpty} */
describe('Observable.prototype.defaultIfEmpty', () => {
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
import {of, concat} from 'rxjs';
import {
  delay,
  repeatWhen,
  skip,
  take,
  tap,
  mergeMap,
  ignoreElements
} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import * as sinon from 'sinon';
import {expect} from 'chai';
import {sourceMatcher} from '../helpers/sourceMatcher';

declare const asDiagram: Function;

/** @test {delay} */
describe('delay operator', () => {
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
import {of, EMPTY} from 'rxjs';
import {delayWhen, tap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {expect} from 'chai';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {delayWhen} */
describe('delayWhen operator', () => {
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
import {of, Notification, Observable} from 'rxjs';
import {dematerialize, map, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

declare function asDiagram(arg: string): Function;

const NO_VALUES: {[key: string]: Notification<any>} = {};

/** @test {dematerialize} */
describe('dematerialize operator', () => {
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
import {distinct, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of} from 'rxjs';

/** @test {distinct} */
describe('distinct operator', () => {
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

    expectSource((<any>e1).pipe(distinct(null as any, e2)), unsub).toBe(
      expected
    );
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
import {distinctUntilChanged, mergeMap} from 'rxjs/operators';
import {of} from 'rxjs';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

declare function asDiagram(arg: string): Function;

/** @test {distinctUntilChanged} */
describe('distinctUntilChanged operator', () => {
  asDiagram('distinctUntilChanged')('should distinguish between values', () => {
    const e1 = hot('-1--2-2----1-3-|');
    const expected = '-1--2------1-3-|';

    expectSource(e1.pipe(distinctUntilChanged())).toBe(expected);
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

    expectSource(
      e1.pipe(distinctUntilChanged(comparator, keySelector))
    ).toBe(expected, {a: 1, b: 2, d: 4, f: 6});
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

    expectSource(e1.pipe(distinctUntilChanged(null as any, keySelector))).toBe(
      expected
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {distinctUntilKeyChanged, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {distinctUntilKeyChanged} */
describe('distinctUntilKeyChanged operator', () => {
  asDiagram("distinctUntilKeyChanged('k')")(
    'should distinguish between values',
    () => {
      const values = {a: {k: 1}, b: {k: 2}, c: {k: 3}};
      const e1 = hot('-a--b-b----a-c-|', values);
      const expected = '-a--b------a-c-|';

      const result = (<any>e1).pipe(distinctUntilKeyChanged('k'));

      expectSource(result).toBe(expected, values);
    }
  );

  it('should distinguish between values', () => {
    const values = {a: {val: 1}, b: {val: 2}};
    const e1 = hot('--a--a--a--b--b--a--|', values);
    const e1subs = '^                   !';
    const expected = '--a--------b-----a--|';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(
      expected,
      values
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should distinguish between values and does not completes', () => {
    const values = {a: {val: 1}, b: {val: 2}};
    const e1 = hot('--a--a--a--b--b--a-', values);
    const e1subs = '^                  ';
    const expected = '--a--------b-----a-';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(
      expected,
      values
    );
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

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(
      expected,
      values
    );
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

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(
      expected,
      values
    );
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

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(
      expected,
      values
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit if source is scalar', () => {
    const values = {a: {val: 1}};
    const e1 = of(values.a);
    const expected = '(a|)';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(
      expected,
      values
    );
  });

  it('should raises error if source raises error', () => {
    const values = {a: {val: 1}};
    const e1 = hot('--a--a--#', values);
    const e1subs = '^       !';
    const expected = '--a-----#';

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(
      expected,
      values
    );
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

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(
      expected,
      values
    );
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

    expectSource((<any>e1).pipe(distinctUntilKeyChanged('val'))).toBe(
      expected,
      values
    );
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
import {expect} from 'chai';
import {elementAt, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {OutOfRangeError, of, range} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {elementAt} */
describe('elementAt operator', () => {
  asDiagram('elementAt(2)')(
    'should return last element by zero-based index',
    () => {
      const source = hot('--a--b--c-d---|');
      const subs = '^       !      ';
      const expected = '--------(c|)   ';

      expectSource((<any>source).pipe(elementAt(2))).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

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
import {of} from 'rxjs';
import {endWith, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {endWith} */
describe('endWith operator', () => {
  const defaultStartValue = 'x';

  asDiagram('endWith(s)')('should append to a cold Observable', () => {
    const e1 = cold('---a--b--c--|');
    const e1subs = '^           !';
    const expected = '---a--b--c--(s|)';

    expectSource(e1.pipe(endWith('s'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should append numbers to a cold Observable', () => {
    const values = {a: 1, b: 2, c: 3, s: 4};
    const e1 = cold('---a--b--c--|', values);
    const e1subs = '^           !';
    const expected = '---a--b--c--(s|)';

    expectSource(e1.pipe(endWith(values.s))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should end an observable with given value', () => {
    const e1 = hot('--a--|');
    const e1subs = '^    !';
    const expected = '--a--(x|)';

    expectSource(e1.pipe(endWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not end with given value if source does not complete', () => {
    const e1 = hot('----a-');
    const e1subs = '^     ';
    const expected = '----a-';

    expectSource(e1.pipe(endWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not end with given value if source never emits and does not completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(endWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should end with given value if source does not emit but does complete', () => {
    const e1 = hot('---|');
    const e1subs = '^  !';
    const expected = '---(x|)';

    expectSource(e1.pipe(endWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit given value and complete immediately if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(x|)';

    expectSource(e1.pipe(endWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should end with given value and source both if source emits single value', () => {
    const e1 = cold('(a|)');
    const e1subs = '(^!)';
    const expected = '(ax|)';

    expectSource(e1.pipe(endWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should end with given values when given more than one value', () => {
    const e1 = hot('-----a--|');
    const e1subs = '^       !';
    const expected = '-----a--(yz|)';

    expectSource(e1.pipe(endWith('y', 'z'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error and not end with given value if source raises error', () => {
    const e1 = hot('--#');
    const e1subs = '^ !';
    const expected = '--#';

    expectSource(e1.pipe(endWith(defaultStartValue))).toBe(
      expected,
      defaultStartValue
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error immediately and not end with given value if source throws error immediately', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(endWith(defaultStartValue))).toBe(
      expected,
      defaultStartValue
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('---a--b----c--d--|');
    const unsub = '         !        ';
    const e1subs = '^        !        ';
    const expected = '---a--b---';

    const result = e1.pipe(endWith('s', rxTestScheduler));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('---a--b----c--d--|');
    const e1subs = '^        !        ';
    const expected = '---a--b---        ';
    const unsub = '         !        ';

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      endWith('s', rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should end with empty if given value is not specified', () => {
    const e1 = hot('-a-|');
    const e1subs = '^  !';
    const expected = '-a-|';

    expectSource(e1.pipe(endWith(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should accept scheduler as last argument with single value', () => {
    const e1 = hot('--a--|');
    const e1subs = '^    !';
    const expected = '--a--(x|)';

    expectSource(e1.pipe(endWith(defaultStartValue, rxTestScheduler))).toBe(
      expected
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should accept scheduler as last argument with multiple value', () => {
    const e1 = hot('-----a--|');
    const e1subs = '^       !';
    const expected = '-----a--(yz|)';

    expectSource(e1.pipe(endWith('y', 'z', rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {expect} from 'chai';
import {every, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of, Observable, Observer} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {every} */
describe('every operator', () => {
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
import {expect} from 'chai';
import {exhaust, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of, Lifter, Observable} from 'rxjs';

declare function asDiagram(arg: string): Function;
declare const type: Function;

/** @test {exhaust} */
describe('exhaust operator', () => {
  asDiagram('exhaust')(
    'should handle a hot observable of hot observables',
    () => {
      const x = cold('--a---b---c--|               ');
      const y = cold('---d--e---f---|      ');
      const z = cold('---g--h---i---|');
      const e1 = hot('------x-------y-----z-------------|', {x: x, y: y, z: z});
      const expected = '--------a---b---c------g--h---i---|';

      expectSource(e1.pipe(exhaust())).toBe(expected);
    }
  );

  it('should switch to first immediately-scheduled inner Observable', () => {
    const e1 = cold('(ab|)');
    const e1subs = '(^!)';
    const e2 = cold('(cd|)');
    const e2subs: string[] = [];
    const expected = '(ab|)';

    expectSource(of(e1, e2).pipe(exhaust())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a hot observable of observables', () => {
    const x = cold('--a---b---c--|               ');
    const xsubs = '      ^            !               ';
    const y = cold('---d--e---f---|      ');
    const ysubs: string[] = [];
    const z = cold('---g--h---i---|');
    const zsubs = '                    ^             !';
    const e1 = hot('------x-------y-----z-------------|', {x: x, y: y, z: z});
    const expected = '--------a---b---c------g--h---i---|';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
  });

  it('should handle a hot observable of observables, outer is unsubscribed early', () => {
    const x = cold('--a---b---c--|         ');
    const xsubs = '      ^         !           ';
    const y = cold('---d--e---f---|');
    const ysubs: string[] = [];
    const e1 = hot('------x-------y------|       ', {x: x, y: y});
    const unsub = '                !            ';
    const expected = '--------a---b---             ';

    expectSource(e1.pipe(exhaust()), unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const x = cold('--a---b---c--|         ');
    const xsubs = '      ^         !           ';
    const y = cold('---d--e---f---|');
    const ysubs: string[] = [];
    const e1 = hot('------x-------y------|       ', {x: x, y: y});
    const unsub = '                !            ';
    const expected = '--------a---b----            ';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      exhaust(),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle a hot observable of observables, inner never completes', () => {
    const x = cold('--a---b--|              ');
    const xsubs = '   ^        !              ';
    const y = cold('-d---e-            ');
    const ysubs: string[] = [];
    const z = cold('---f--g---h--');
    const zsubs = '              ^            ';
    const e1 = hot('---x---y------z----------| ', {x: x, y: y, z: z});
    const expected = '-----a---b-------f--g---h--';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
  });

  it('should handle a synchronous switch and stay on the first inner observable', () => {
    const x = cold('--a---b---c--|   ');
    const xsubs = '      ^            !   ';
    const y = cold('---d--e---f---|  ');
    const ysubs: string[] = [];
    const e1 = hot('------(xy)------------|', {x: x, y: y});
    const expected = '--------a---b---c-----|';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle a hot observable of observables, one inner throws', () => {
    const x = cold('--a---#                ');
    const xsubs = '      ^     !                ';
    const y = cold('---d--e---f---|');
    const ysubs: string[] = [];
    const e1 = hot('------x-------y------|       ', {x: x, y: y});
    const expected = '--------a---#                ';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle a hot observable of observables, outer throws', () => {
    const x = cold('--a---b---c--|         ');
    const xsubs = '      ^            !         ';
    const y = cold('---d--e---f---|');
    const ysubs: string[] = [];
    const e1 = hot('------x-------y-------#      ', {x: x, y: y});
    const expected = '--------a---b---c-----#      ';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle an empty hot observable', () => {
    const e1 = hot('------|');
    const e1subs = '^     !';
    const expected = '------|';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a never hot observable', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete not before the outer completes', () => {
    const x = cold('--a---b---c--|   ');
    const xsubs = '      ^            !   ';
    const e1 = hot('------x---------------|', {x: x});
    const expected = '--------a---b---c-----|';

    expectSource(e1.pipe(exhaust())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
  });

  it('should handle an observable of promises', done => {
    const expected = [1];

    of(Promise.resolve(1), Promise.resolve(2), Promise.resolve(3))
      .pipe(exhaust())
      .subscribe(
        x => {
          expect(x).to.equal(expected.shift());
        },
        null,
        () => {
          expect(expected.length).to.equal(0);
          done();
        }
      );
  });

  it('should handle an observable of promises, where one rejects', done => {
    of(Promise.reject(2), Promise.resolve(1))
      .pipe(exhaust<never | number>())
      .subscribe(
        x => {
          done(new Error('should not be called'));
        },
        err => {
          expect(err).to.equal(2);
          done();
        },
        () => {
          done(new Error('should not be called'));
        }
      );
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number> = of(source1, source2, source3).pipe(
      exhaust()
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number> = of(source1, source2, source3).pipe(
      exhaust()
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    // coerce type to a specific type
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<string> = of(
      <any>source1,
      <any>source2,
      <any>source3
    ).pipe(exhaust<string>());
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    // coerce type to a specific type
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<string> = of(
      <any>source1,
      <any>source2,
      <any>source3
    ).pipe(exhaust<string>());
    /* tslint:enable:no-unused-variable */
  });
});
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {concat, defer, Observable, of, from} from 'rxjs';
import {exhaustMap, mergeMap, takeWhile, map} from 'rxjs/operators';
import {expect} from 'chai';
import {asInteropSource} from '../helpers/interop-helper';

declare function asDiagram(arg: string): Function;

/** @test {exhaustMap} */
describe('exhaustMap', () => {
  asDiagram('exhaustMap(i => 10*i\u2014\u201410*i\u2014\u201410*i\u2014| )')(
    'should map-and-flatten each item to an Observable',
    () => {
      const e1 = hot('--1-----3--5-------|');
      const e1subs = '^                  !';
      const e2 = cold('x-x-x|              ', {x: 10});
      const expected = '--x-x-x-y-y-y------|';
      const values = {x: 10, y: 30, z: 50};

      const result = e1.pipe(exhaustMap(x => e2.pipe(map(i => i * +x))));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );
  it('should support the deprecated resultSelector', () => {
    const results: Array<number[]> = [];

    of(1, 2, 3)
      .pipe(
        exhaustMap(
          x => of(x, x + 1, x + 2),
          (a, b, i, ii) => [a, b, i, ii]
        )
      )
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([
            [1, 1, 0, 0],
            [1, 2, 0, 1],
            [1, 3, 0, 2],
            [2, 2, 1, 0],
            [2, 3, 1, 1],
            [2, 4, 1, 2],
            [3, 3, 2, 0],
            [3, 4, 2, 1],
            [3, 5, 2, 2]
          ]);
        }
      });
  });

  it('should support a void resultSelector (still deprecated)', () => {
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(exhaustMap(x => of(x, x + 1, x + 2), void 0))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([1, 2, 3, 2, 3, 4, 3, 4, 5]);
        }
      });
  });

  it('should handle outer throw', () => {
    const x = cold('--a--b--c--|');
    const xsubs: string[] = [];
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    const result = e1.pipe(exhaustMap(() => x));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle outer empty', () => {
    const x = cold('--a--b--c--|');
    const xsubs: string[] = [];
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    const result = e1.pipe(exhaustMap(() => x));
    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle outer never', () => {
    const x = cold('--a--b--c--|');
    const xsubs: string[] = [];
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const result = e1.pipe(exhaustMap(() => x));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if project throws', () => {
    const e1 = hot('---x---------y-----------------z-------------|');
    const e1subs = '^  !';
    const expected = '---#';

    const result = e1.pipe(
      exhaustMap(value => {
        throw 'error';
      })
    );

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch with a selector function', () => {
    const x = cold('--a--b--c--|                              ');
    const xsubs = '   ^          !                              ';
    const y = cold('--d--e--f--|                    ');
    const ysubs: string[] = [];
    const z = cold('--g--h--i--|  ');
    const zsubs = '                               ^          !  ';
    const e1 = hot('---x---------y-----------------z-------------|');
    const e1subs = '^                                            !';
    const expected = '-----a--b--c---------------------g--h--i-----|';

    const observableLookup: Record<string, Observable<string>> = {
      x: x,
      y: y,
      z: z
    };

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner cold observables, outer is unsubscribed early', () => {
    const x = cold('--a--b--c--|                               ');
    const xsubs = '   ^          !                               ';
    const y = cold('--d--e--f--|                     ');
    const ysubs: string[] = [];
    const z = cold('--g--h--i--|   ');
    const zsubs = '                               ^  !           ';
    const e1 = hot('---x---------y-----------------z-------------|');
    const unsub = '                                  !           ';
    const e1subs = '^                                 !           ';
    const expected = '-----a--b--c---------------------g-           ';

    const observableLookup: Record<string, Observable<string>> = {
      x: x,
      y: y,
      z: z
    };

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const x = cold('--a--b--c--|                               ');
    const xsubs = '   ^          !                               ';
    const y = cold('--d--e--f--|                     ');
    const ysubs: string[] = [];
    const z = cold('--g--h--i--|   ');
    const zsubs = '                               ^  !           ';
    const e1 = hot('---x---------y-----------------z-------------|');
    const e1subs = '^                                 !           ';
    const expected = '-----a--b--c---------------------g-           ';
    const unsub = '                                  !           ';

    const observableLookup: Record<string, Observable<string>> = {
      x: x,
      y: y,
      z: z
    };

    const result = e1.pipe(
      mergeMap(x => of(x)),
      exhaustMap(value => observableLookup[value]),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains with interop inners when result is unsubscribed explicitly', () => {
    const x = cold('--a--b--c--|                               ');
    const xsubs = '   ^          !                               ';
    const y = cold('--d--e--f--|                     ');
    const ysubs: string[] = [];
    const z = cold('--g--h--i--|   ');
    const zsubs = '                               ^  !           ';
    const e1 = hot('---x---------y-----------------z-------------|');
    const e1subs = '^                                 !           ';
    const expected = '-----a--b--c---------------------g-           ';
    const unsub = '                                  !           ';

    const observableLookup: Record<string, Observable<string>> = {
      x: x,
      y: y,
      z: z
    };

    // This test is the same as the previous test, but the observable is
    // manipulated to make it look like an interop observable - an observable
    // from a foreign library. Interop subscribers are treated differently:
    // they are wrapped in a safe subscriber. This test ensures that
    // unsubscriptions are chained all the way to the interop subscriber.

    const result = e1.pipe(
      mergeMap(x => of(x)),
      exhaustMap(value => asInteropSource(observableLookup[value])),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
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

    of(null)
      .pipe(
        exhaustMap(() => synchronousObservable),
        takeWhile(x => x != 2) // unsubscribe at the second side-effect
      )
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).to.deep.equal([1, 2]);
  });

  it('should switch inner cold observables, inner never completes', () => {
    const x = cold('--a--b--c--|                              ');
    const xsubs = '   ^          !                              ';
    const y = cold('--d--e--f--|                    ');
    const ysubs: string[] = [];
    const z = cold('--g--h--i-----');
    const zsubs = '                               ^             ';
    const e1 = hot('---x---------y-----------------z---------|   ');
    const e1subs = '^                                        !   ';
    const expected = '-----a--b--c---------------------g--h--i-----';

    const observableLookup: Record<string, Observable<string>> = {
      x: x,
      y: y,
      z: z
    };

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a synchronous switch an stay on the first inner observable', () => {
    const x = cold('--a--b--c--d--e--|   ');
    const xsubs = '         ^                !   ';
    const y = cold('---f---g---h---i--|  ');
    const ysubs: string[] = [];
    const e1 = hot('---------(xy)----------------|');
    const e1subs = '^                            !';
    const expected = '-----------a--b--c--d--e-----|';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner cold observables, one inner throws', () => {
    const x = cold('--a--b--c--d--#             ');
    const xsubs = '         ^             !             ';
    const y = cold('---f---g---h---i--');
    const ysubs: string[] = [];
    const e1 = hot('---------x---------y---------|       ');
    const e1subs = '^                      !             ';
    const expected = '-----------a--b--c--d--#             ';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner hot observables', () => {
    const x = hot('-----a--b--c--d--e--|                  ');
    const xsubs = '         ^          !                  ';
    const y = hot('--p-o-o-p-------f---g---h---i--|       ');
    const ysubs: string[] = [];
    const z = hot('---z-o-o-m-------------j---k---l---m--|');
    const zsubs = '                    ^                 !';
    const e1 = hot('---------x----y-----z--------|         ');
    const e1subs = '^                            !         ';
    const expected = '-----------c--d--e-----j---k---l---m--|';

    const observableLookup: Record<string, Observable<string>> = {
      x: x,
      y: y,
      z: z
    };

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner empty and empty', () => {
    const x = cold('|');
    const y = cold('|');
    const xsubs = '         (^!)                 ';
    const ysubs = '                   (^!)       ';
    const e1 = hot('---------x---------y---------|');
    const e1subs = '^                            !';
    const expected = '-----------------------------|';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner empty and never', () => {
    const x = cold('|');
    const y = cold('-');
    const xsubs = '         (^!)                 ';
    const ysubs = '                   ^          ';
    const e1 = hot('---------x---------y---------|');
    const e1subs = '^                            !';
    const expected = '------------------------------';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should never switch inner never', () => {
    const x = cold('-');
    const y = cold('#');
    const xsubs = '         ^                     ';
    const ysubs: string[] = [];
    const e1 = hot('---------x---------y----------|');
    const e1subs = '^                             !';
    const expected = '-------------------------------';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner empty and throw', () => {
    const x = cold('|');
    const y = cold('#');
    const xsubs = '         (^!)                  ';
    const ysubs = '                   (^!)        ';
    const e1 = hot('---------x---------y---------|');
    const e1subs = '^                  !          ';
    const expected = '-------------------#          ';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle outer error', () => {
    const x = cold('--a--b--c--d--e--|');
    const xsubs = '         ^         !       ';
    const e1 = hot('---------x---------#       ');
    const e1subs = '^                  !       ';
    const expected = '-----------a--b--c-#       ';

    const observableLookup: Record<string, Observable<string>> = {x: x};

    const result = e1.pipe(exhaustMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {expect} from 'chai';
import {expand, mergeMap, map} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {Subscribable, EMPTY, Observable, of, Observer} from 'rxjs';

declare function asDiagram(arg: string): Function;
declare const type: Function;

declare const rxTestScheduler: TestScheduler;

/** @test {expand} */
describe('expand operator', () => {
  asDiagram('expand(x => x === 8 ? empty : \u2014\u20142*x\u2014| )')(
    'should recursively map-and-flatten each item to an Observable',
    () => {
      const e1 = hot('--x----|  ', {x: 1});
      const e1subs = '^      !  ';
      const e2 = cold('--c|    ', {c: 2});
      const expected = '--a-b-c-d|';
      const values = {a: 1, b: 2, c: 4, d: 8};

      const result = e1.pipe(
        expand(x => (x === 8 ? EMPTY : e2.pipe(map(c => c * x))))
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should work with scheduler', () => {
    const e1 = hot('--x----|  ', {x: 1});
    const e1subs = '^      !  ';
    const e2 = cold('--c|    ', {c: 2});
    const expected = '--a-b-c-d|';
    const values = {a: 1, b: 2, c: 4, d: 8};

    const result = e1.pipe(
      expand(
        x => (x === 8 ? EMPTY : e2.pipe(map(c => c * x))),
        Number.POSITIVE_INFINITY,
        rxTestScheduler
      )
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should map and recursively flatten', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8 // d + d
    };
    const e1 = hot('(a|)', values);
    const e1subs = '(^!)            ';
    const e2shape = '---(z|)         ';
    const expected = 'a--b--c--d--(e|)';
    /*
      expectation explanation: (conjunction junction?) ...

      since `cold('---(z|)')` emits `x + x` and completes on frame 30
      but the next "expanded" return value is synchronously subscribed to in
      that same frame, it stacks like so:

      a
      ---(b|)
         ---(c|)
            ---(d|)
               ---(e|)      (...which flattens into:)
      a--b--c--d--(e|)
    */

    const result = e1.pipe(
      expand(
        (x, index): Observable<any> => {
          if (x === 16) {
            return EMPTY;
          } else {
            return cold(e2shape, {z: x + x});
          }
        }
      )
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should map and recursively flatten, and handle event raised error', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8 // d + d
    };
    const e1 = hot('(a|)', values);
    const e1subs = '(^!)         ';
    const e2shape = '---(z|)      ';
    const expected = 'a--b--c--(d#)';

    const result = e1.pipe(
      expand(x => {
        if (x === 8) {
          return cold<number>('#');
        }
        return cold(e2shape, {z: x + x});
      })
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should map and recursively flatten, and propagate error thrown from projection', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8 // d + d
    };
    const e1 = hot('(a|)', values);
    const e1subs = '(^!)         ';
    const e2shape = '---(z|)      ';
    const expected = 'a--b--c--(d#)';

    const result = e1.pipe(
      expand(x => {
        if (x === 8) {
          throw 'error';
        }
        return cold(e2shape, {z: x + x});
      })
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing early', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8 // d + d
    };
    const e1 = hot('(a|)', values);
    const unsub = '       !  ';
    const e1subs = '(^!)      ';
    const e2shape = '---(z|)   ';
    const expected = 'a--b--c-  ';

    const result = e1.pipe(
      expand(
        (x): Observable<any> => {
          if (x === 16) {
            return EMPTY;
          }
          return cold(e2shape, {z: x + x});
        }
      )
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8 // d + d
    };
    const e1 = hot('(a|)', values);
    const e1subs = '(^!)      ';
    const e2shape = '---(z|)   ';
    const expected = 'a--b--c-  ';
    const unsub = '       !  ';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      expand(
        (x): Observable<any> => {
          if (x === 16) {
            return EMPTY;
          }
          return cold(e2shape, {z: x + x});
        }
      ),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow concurrent expansions', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8 // d + d
    };
    const e1 = hot('a-a|              ', values);
    const e1subs = '^  !              ';
    const e2shape = '---(z|)           ';
    const expected = 'a-ab-bc-cd-de-(e|)';

    const result = e1.pipe(
      expand(
        (x): Observable<any> => {
          if (x === 16) {
            return EMPTY;
          }
          return cold(e2shape, {z: x + x});
        }
      )
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow configuring the concurrency limit parameter to 1', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8, // d + d
      u: 10,
      v: 20, // u + u
      x: 40, // v + v
      y: 80, // x + x
      z: 160 // y + y
    };
    const e1 = hot('a-u|', values);
    const e2shape = '---(z|)';
    //                 ---(z|)
    //                    ---(z|)
    //                       ---(z|)
    //                          ---(z|)
    //                             ---(z|)
    //                                ---(z|)
    //                                   ---(z|)
    // Notice how for each column, there is at most 1 `-` character.
    const e1subs = '^  !                         ';
    const expected = 'a--u--b--v--c--x--d--y--(ez|)';
    const concurrencyLimit = 1;

    const result = e1.pipe(
      expand((x): Observable<any> => {
        if (x === 16 || x === 160) {
          return EMPTY;
        }
        return cold(e2shape, {z: x + x});
      }, concurrencyLimit)
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow configuring the concurrency limit parameter to 2', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      u: 10,
      v: 20, // u + u
      x: 40 // v + v
    };
    const e1 = hot('a---au|', values);
    const e2shape = '------(z|)';
    //                  ------(z|)
    //                    ------(z|)
    //                        ------(z|)
    //                          ------(z|)
    //                              ------(z|)
    //                                ------(z|)
    // Notice how for each column, there is at most 2 `-` characters.
    const e1subs = '^     !                   ';
    const expected = 'a---a-u---b-b---v-(cc)(x|)';
    const concurrencyLimit = 2;

    const result = e1.pipe(
      expand((x): Observable<any> => {
        if (x === 4 || x === 40) {
          return EMPTY;
        }
        return cold(e2shape, {z: x + x});
      }, concurrencyLimit)
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should ignore concurrency limit if it is not passed', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8, // d + d
      u: 10,
      v: 20, // u + u
      x: 40, // v + v
      y: 80, // x + x
      z: 160 // y + y
    };
    const e1 = hot('a-u|              ', values);
    const e1subs = '^  !              ';
    const e2shape = '---(z|)           ';
    const expected = 'a-ub-vc-xd-ye-(z|)';
    const concurrencyLimit = 100;

    const result = e1.pipe(
      expand((x): Observable<any> => {
        if (x === 16 || x === 160) {
          return EMPTY;
        }
        return cold(e2shape, {z: x + x});
      }, concurrencyLimit)
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should map and recursively flatten with scalars', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8 // d + d
    };
    const e1 = hot('(a|)', values);
    const e1subs = '(^!)';
    const expected = '(abcde|)';

    const result = e1.pipe(
      expand(x => {
        if (x === 16) {
          return EMPTY;
        }
        return of(x + x); // scalar
      })
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should recursively flatten promises', done => {
    const expected = [1, 2, 4, 8, 16];
    of(1)
      .pipe(
        expand((x): any => {
          if (x === 16) {
            return EMPTY;
          }
          return Promise.resolve(x + x);
        })
      )
      .subscribe(
        x => {
          expect(x).to.equal(expected.shift());
        },
        null,
        () => {
          expect(expected.length).to.equal(0);
          done();
        }
      );
  });

  it('should recursively flatten Arrays', done => {
    const expected = [1, 2, 4, 8, 16];
    of(1)
      .pipe(
        expand((x): any => {
          if (x === 16) {
            return EMPTY;
          }
          return [x + x];
        })
      )
      .subscribe(
        x => {
          expect(x).to.equal(expected.shift());
        },
        null,
        () => {
          expect(expected.length).to.equal(0);
          done();
        }
      );
  });

  it('should recursively flatten lowercase-o observables', done => {
    const expected = [1, 2, 4, 8, 16];
    const project = (x: number, index: number): Subscribable<number> => {
      if (x === 16) {
        return <any>EMPTY;
      }

      const ish: any = {
        subscribe: (observer: Observer<number>) => {
          observer.next(x + x);
          observer.complete();
        }
      };

      ish[Symbol.rxSource] = function () {
        return this;
      };
      return <Subscribable<number>>ish;
    };

    of(1)
      .pipe(expand(project))
      .subscribe(
        x => {
          expect(x).to.equal(expected.shift());
        },
        null,
        () => {
          expect(expected.length).to.equal(0);
          done();
        }
      );
  });

  it('should work when passing undefined for the optional arguments', () => {
    const values = {
      a: 1,
      b: 1 + 1, // a + a,
      c: 2 + 2, // b + b,
      d: 4 + 4, // c + c,
      e: 8 + 8 // d + d
    };
    const e1 = hot('(a|)', values);
    const e1subs = '(^!)            ';
    const e2shape = '---(z|)         ';
    const expected = 'a--b--c--d--(e|)';

    const project = (x: any, index: number): Observable<any> => {
      if (x === 16) {
        return EMPTY;
      }
      return cold(e2shape, {z: x + x});
    };

    const result = e1.pipe(expand(project, undefined, undefined));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {expect} from 'chai';
import {filter, tap, map, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of, Observable, from} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {filter} */
describe('filter operator', () => {
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

    // type guards with primitive types
    {
      const xs: Observable<string | number> = from([1, 'aaa', 3, 'bb']);

      // This type guard will narrow a `string | number` to a string in the examples below
      const isString = (x: string | number): x is string =>
        typeof x === 'string';

      xs.pipe(filter(isString)).subscribe(s => s.length); // s is string

      // In contrast, this type of regular boolean predicate still maintains the original type
      xs.pipe(filter(x => typeof x === 'number')).subscribe(x => x); // x is still string | number
      xs.pipe(filter((x, i) => typeof x === 'number' && x > i)).subscribe(
        x => x
      ); // x is still string | number
    }

    // tslint:disable enable
  });

  it('should support Boolean as a predicate', () => {
    const source = hot('-t--f--^-t-f-t-f--t-f--f--|', {t: 1, f: 0});
    const subs = '^                  !';
    const expected = '--t---t----t-------|';

    expectSource(source.pipe(filter(Boolean))).toBe(expected, {t: 1, f: 0});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});
import {expect} from 'chai';
import {finalize, map, share} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of, timer, interval} from 'rxjs';

declare const type: Function;

declare const rxTestScheduler: TestScheduler;

/** @test {finalize} */
describe('finalize operator', () => {
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
import {expect} from 'chai';
import {find, mergeMap, delay} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of, Observable, from} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {find} */
describe('find operator', () => {
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
import {findIndex, mergeMap, delay} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {findIndex} */
describe('findIndex operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {first, mergeMap, delay} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of, from, Observable, Subject, EmptyError} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {first} */
describe('Observable.prototype.first', () => {
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

    expect(results).to.deep.equal([0]);
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

    expectSource(source.pipe(first(), delay(duration, rxTestScheduler))).toBe(
      expected
    );
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

    expectSource(e1.pipe(first(x => x === 's'))).toBe(
      expected,
      null,
      new EmptyError()
    );
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

    // type guards with primitive types
    {
      const xs: Observable<string | number> = from([1, 'aaa', 3, 'bb']);

      // This type guard will narrow a `string | number` to a string in the examples below
      const isString = (x: string | number): x is string =>
        typeof x === 'string';

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

    // tslint:disable enable
  });
});
import {expect} from 'chai';
import {
  groupBy,
  delay,
  tap,
  map,
  take,
  mergeMap,
  materialize,
  skip
} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {
  Replay,
  of,
  GroupedObservable,
  Observable,
  Operator,
  Observer
} from 'rxjs';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {groupBy} */
describe('groupBy operator', () => {
  asDiagram('groupBy(i => i % 2)')('should group numbers by odd/even', () => {
    const e1 = hot('--1---2---3---4---5---|');
    const expected = '--x---y---------------|';
    const x = cold('1-------3-------5---|');
    const y = cold('2-------4-------|');
    const expectedValues = {x: x, y: y};

    const source = e1.pipe(groupBy((val: string) => parseInt(val) % 2));
    expectSource(source).toBe(expected, expectedValues);
  });

  function reverseString(str: string) {
    return str.split('').reverse().join('');
  }

  function mapObject(obj: Record<string, any>, fn: Function) {
    const out: Record<string, any> = {};
    for (const p in obj) {
      if (obj.hasOwnProperty(p)) {
        out[p] = fn(obj[p]);
      }
    }
    return out;
  }

  it('should group values', (done: MochaDone) => {
    const expectedGroups = [
      {key: 1, values: [1, 3]},
      {key: 0, values: [2]}
    ];

    of(1, 2, 3)
      .pipe(groupBy((x: number) => x % 2))
      .subscribe(
        (g: any) => {
          const expectedGroup = expectedGroups.shift()!;
          expect(g.key).to.equal(expectedGroup.key);

          g.subscribe((x: any) => {
            expect(x).to.deep.equal(expectedGroup.values.shift());
          });
        },
        null,
        done
      );
  });

  it('should group values with an element selector', (done: MochaDone) => {
    const expectedGroups = [
      {key: 1, values: ['1!', '3!']},
      {key: 0, values: ['2!']}
    ];

    of(1, 2, 3)
      .pipe(
        groupBy(
          (x: number) => x % 2,
          (x: number) => x + '!'
        )
      )
      .subscribe(
        (g: any) => {
          const expectedGroup = expectedGroups.shift()!;
          expect(g.key).to.equal(expectedGroup.key);

          g.subscribe((x: any) => {
            expect(x).to.deep.equal(expectedGroup.values.shift());
          });
        },
        null,
        done
      );
  });

  it('should group values with a duration selector', () => {
    const expectedGroups = [
      {key: 1, values: [1, 3]},
      {key: 0, values: [2, 4]},
      {key: 1, values: [5]},
      {key: 0, values: [6]}
    ];

    const resultingGroups: {key: number; values: number[]}[] = [];

    of(1, 2, 3, 4, 5, 6)
      .pipe(
        groupBy(
          (x: number) => x % 2,
          (x: number) => x,
          (g: any) => g.pipe(skip(1))
        )
      )
      .subscribe((g: any) => {
        let group = {key: g.key, values: [] as number[]};

        g.subscribe((x: any) => {
          group.values.push(x);
        });

        resultingGroups.push(group);
      });

    expect(resultingGroups).to.deep.equal(expectedGroups);
  });

  it('should group values with a subject selector', (done: MochaDone) => {
    const expectedGroups = [
      {key: 1, values: [3]},
      {key: 0, values: [2]}
    ];

    of(1, 2, 3)
      .pipe(
        groupBy(
          (x: number) => x % 2,
          null as any,
          null as any,
          () => new Replay(1)
        ),
        // Ensure each inner group reaches the destination after the first event
        // has been next'd to the group
        delay(5)
      )
      .subscribe(
        (g: any) => {
          const expectedGroup = expectedGroups.shift()!;
          expect(g.key).to.equal(expectedGroup.key);

          g.subscribe((x: any) => {
            expect(x).to.deep.equal(expectedGroup.values.shift());
          });
        },
        null,
        done
      );
  });

  it('should handle an empty Observable', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    const source = e1.pipe(groupBy((val: string) => val.toLowerCase().trim()));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a never Observable', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const source = e1.pipe(groupBy((val: string) => val.toLowerCase().trim()));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a just-throw Observable', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    const source = e1.pipe(groupBy((val: string) => val.toLowerCase().trim()));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an Observable with a single value', () => {
    const values = {a: '  foo'};
    const e1 = hot('^--a--|', values);
    const e1subs = '^     !';
    const expected = '---g--|';
    const g = cold('a--|', values);
    const expectedValues = {g: g};

    const source = e1.pipe(groupBy((val: string) => val.toLowerCase().trim()));

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should group values with a keySelector', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^                         !';
    const expected = '--w---x---y-z-------------|';
    const w = cold('a-b---d---------i-----l-|', values);
    const x = cold('c-------g-h---------|', values);
    const y = cold('e---------j-k---|', values);
    const z = cold('f-------------|', values);
    const expectedValues = {w: w, x: x, y: y, z: z};

    const source = e1.pipe(groupBy((val: string) => val.toLowerCase().trim()));

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit GroupObservables', () => {
    const values = {
      a: '  foo',
      b: ' FoO '
    };
    const e1 = hot('-1--2--^-a-b----|', values);
    const e1subs = '^        !';
    const expected = '--g------|';
    const expectedValues = {g: 'foo'};

    const source = e1.pipe(
      groupBy((val: string) => val.toLowerCase().trim()),
      tap((group: any) => {
        expect(group.key).to.equal('foo');
        expect(group instanceof GroupedObservable).to.be.true;
      }),
      map((group: any) => {
        return group.key;
      })
    );

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should group values with a keySelector, assert GroupSubject key', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^                         !';
    const expected = '--w---x---y-z-------------|';
    const expectedValues = {w: 'foo', x: 'bar', y: 'baz', z: 'qux'};

    const source = e1.pipe(
      groupBy((val: string) => val.toLowerCase().trim()),
      map((g: any) => g.key)
    );

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should group values with a keySelector, but outer throws', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-#', values);
    const e1subs = '^                         !';
    const expected = '--w---x---y-z-------------#';
    const expectedValues = {w: 'foo', x: 'bar', y: 'baz', z: 'qux'};

    const source = e1.pipe(
      groupBy((val: string) => val.toLowerCase().trim()),
      map((g: any) => g.key)
    );

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should group values with a keySelector, inners propagate error from outer', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-#', values);
    const e1subs = '^                         !';
    const expected = '--w---x---y-z-------------#';
    const w = cold('a-b---d---------i-----l-#', values);
    const x = cold('c-------g-h---------#', values);
    const y = cold('e---------j-k---#', values);
    const z = cold('f-------------#', values);
    const expectedValues = {w: w, x: x, y: y, z: z};

    const source = e1.pipe(groupBy((val: string) => val.toLowerCase().trim()));

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow outer to be unsubscribed early', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const unsub = '           !';
    const e1subs = '^          !';
    const expected = '--w---x---y-';
    const expectedValues = {w: 'foo', x: 'bar', y: 'baz'};

    const source = e1.pipe(
      groupBy((val: string) => val.toLowerCase().trim()),
      map((group: any) => group.key)
    );

    expectSource(source, unsub).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should unsubscribe from the source when the outer and inner subscriptions are disposed', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^ !';
    const expected = '--(a|)';

    const source = e1.pipe(
      groupBy(val => val.toLowerCase().trim()),
      take(1),
      mergeMap(group => group.pipe(take(1)))
    );

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^          !';
    const expected = '--w---x---y-';
    const unsub = '           !';
    const expectedValues = {w: 'foo', x: 'bar', y: 'baz'};

    const source = e1.pipe(
      mergeMap((x: string) => of(x)),
      groupBy((x: string) => x.toLowerCase().trim()),
      mergeMap((group: any) => of(group.key))
    );

    expectSource(source, unsub).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should group values with a keySelector which eventually throws', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^                   !';
    const expected = '--w---x---y-z-------#';
    const w = cold('a-b---d---------i-#', values);
    const x = cold('c-------g-h---#', values);
    const y = cold('e---------#', values);
    const z = cold('f-------#', values);
    const expectedValues = {w: w, x: x, y: y, z: z};

    let invoked = 0;
    const source = e1.pipe(
      groupBy((val: string) => {
        invoked++;
        if (invoked === 10) {
          throw 'error';
        }
        return val.toLowerCase().trim();
      })
    );

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it(
    'should group values with a keySelector and elementSelector, ' +
      'but elementSelector throws',
    () => {
      const values = {
        a: '  foo',
        b: ' FoO ',
        c: 'baR  ',
        d: 'foO ',
        e: ' Baz   ',
        f: '  qux ',
        g: '   bar',
        h: ' BAR  ',
        i: 'FOO ',
        j: 'baz  ',
        k: ' bAZ ',
        l: '    fOo    '
      };
      const reversedValues = mapObject(values, reverseString);
      const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
      const e1subs = '^                   !';
      const expected = '--w---x---y-z-------#';
      const w = cold('a-b---d---------i-#', reversedValues);
      const x = cold('c-------g-h---#', reversedValues);
      const y = cold('e---------#', reversedValues);
      const z = cold('f-------#', reversedValues);
      const expectedValues = {w: w, x: x, y: y, z: z};

      let invoked = 0;
      const source = e1.pipe(
        groupBy(
          (val: string) => val.toLowerCase().trim(),
          (val: string) => {
            invoked++;
            if (invoked === 10) {
              throw 'error';
            }
            return reverseString(val);
          }
        )
      );

      expectSource(source).toBe(expected, expectedValues);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should allow the outer to be unsubscribed early but inners continue', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const unsub = '         !';
    const expected = '--w---x---';
    const w = cold('a-b---d---------i-----l-|', values);
    const x = cold('c-------g-h---------|', values);
    const expectedValues = {w: w, x: x};

    const source = e1.pipe(groupBy((val: string) => val.toLowerCase().trim()));

    expectSource(source, unsub).toBe(expected, expectedValues);
  });

  it('should allow an inner to be unsubscribed early but other inners continue', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const expected = '--w---x---y-z-------------|';
    const w = '--a-b---d-';
    const unsubw = '         !';
    const x = '------c-------g-h---------|';
    const y = '----------e---------j-k---|';
    const z = '------------f-------------|';

    const expectedGroups = {
      w: TestScheduler.parseMarbles(w, values),
      x: TestScheduler.parseMarbles(x, values),
      y: TestScheduler.parseMarbles(y, values),
      z: TestScheduler.parseMarbles(z, values)
    };

    const fooUnsubscriptionFrame = TestScheduler.parseMarblesAsSubscriptions(
      unsubw
    ).unsubscribedFrame;

    const source = e1.pipe(
      groupBy((val: string) => val.toLowerCase().trim()),
      map((group: any) => {
        const arr: any[] = [];

        const subscription = group
          .pipe(
            materialize(),
            map((notification: Notification) => {
              return {frame: rxTestScheduler.frame, notification: notification};
            })
          )
          .subscribe((value: any) => {
            arr.push(value);
          });

        if (group.key === 'foo') {
          rxTestScheduler.schedule(() => {
            subscription.unsubscribe();
          }, fooUnsubscriptionFrame - rxTestScheduler.frame);
        }
        return arr;
      })
    );

    expectSource(source).toBe(expected, expectedGroups);
  });

  it('should allow inners to be unsubscribed early at different times', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const expected = '--w---x---y-z-------------|';
    const w = '--a-b---d-';
    const unsubw = '         !';
    const x = '------c------';
    const unsubx = '            !';
    const y = '----------e------';
    const unsuby = '                !';
    const z = '------------f-------';
    const unsubz = '                   !';

    const expectedGroups = {
      w: TestScheduler.parseMarbles(w, values),
      x: TestScheduler.parseMarbles(x, values),
      y: TestScheduler.parseMarbles(y, values),
      z: TestScheduler.parseMarbles(z, values)
    };

    const unsubscriptionFrames: Record<string, number> = {
      foo: TestScheduler.parseMarblesAsSubscriptions(unsubw).unsubscribedFrame,
      bar: TestScheduler.parseMarblesAsSubscriptions(unsubx).unsubscribedFrame,
      baz: TestScheduler.parseMarblesAsSubscriptions(unsuby).unsubscribedFrame,
      qux: TestScheduler.parseMarblesAsSubscriptions(unsubz).unsubscribedFrame
    };

    const source = e1.pipe(
      groupBy((val: string) => val.toLowerCase().trim()),
      map((group: any) => {
        const arr: any[] = [];

        const subscription = group
          .pipe(
            materialize(),
            map((notification: Notification) => {
              return {frame: rxTestScheduler.frame, notification: notification};
            })
          )
          .subscribe((value: any) => {
            arr.push(value);
          });

        rxTestScheduler.schedule(() => {
          subscription.unsubscribe();
        }, unsubscriptionFrames[group.key] - rxTestScheduler.frame);
        return arr;
      })
    );

    expectSource(source).toBe(expected, expectedGroups);
  });

  it('should allow subscribing late to an inner Observable, outer completes', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      d: 'foO ',
      i: 'FOO ',
      l: '    fOo    '
    };
    const e1 = hot('--a-b---d---------i-----l-|', values);
    const subs = '^                         !';
    const expected = '----------------------------|';

    e1.pipe(groupBy((val: string) => val.toLowerCase().trim())).subscribe(
      (group: any) => {
        rxTestScheduler.schedule(() => {
          expectSource(group).toBe(expected);
        }, 260);
      }
    );
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should allow subscribing late to an inner Observable, outer throws', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      d: 'foO ',
      i: 'FOO ',
      l: '    fOo    '
    };
    const e1 = hot('--a-b---d---------i-----l-#', values);
    const subs = '^                         !';
    const expected = '----------------------------#';

    e1.pipe(groupBy((val: string) => val.toLowerCase().trim())).subscribe(
      (group: any) => {
        rxTestScheduler.schedule(() => {
          expectSource(group).toBe(expected);
        }, 260);
      },
      () => {
        //noop
      }
    );
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should allow subscribing late to inner, unsubscribe outer early', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      d: 'foO ',
      i: 'FOO ',
      l: '    fOo    '
    };
    const e1 = hot('--a-b---d---------i-----l-#', values);
    const unsub = '            !';
    const e1subs = '^           !';
    const expectedReactor = '--w----------';
    const expectedActor = '-------------';
    const outerNs = {w: 'foo'};

    const source = e1.pipe(
      groupBy((val: string) => val.toLowerCase().trim()),
      tap((group: any) => {
        rxTestScheduler.schedule(() => {
          expectSource(group).toBe(expectedActor);
        }, 260);
      }),
      map((group: any) => {
        return group.key;
      })
    );

    expectSource(source, unsub).toBe(expectedReactor, outerNs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow using a keySelector, elementSelector, and durationSelector', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const reversedValues = mapObject(values, reverseString);
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^                         !';
    const expected = '--v---w---x-y-----z-------|';
    const v = cold('a-b---(d|)', reversedValues);
    const w = cold('c-------g-(h|)', reversedValues);
    const x = cold('e---------j-(k|)', reversedValues);
    const y = cold('f-------------|', reversedValues);
    const z = cold('i-----l-|', reversedValues);
    const expectedValues = {v: v, w: w, x: x, y: y, z: z};

    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => reverseString(val),
        (group: any) => group.pipe(skip(2))
      )
    );

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow using a keySelector, elementSelector, and durationSelector that throws', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const reversedValues = mapObject(values, reverseString);
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const expected = '--v---w---x-y-----z-------|';
    const v = cold('a-b---(d#)', reversedValues);
    const w = cold('c-------g-(h#)', reversedValues);
    const x = cold('e---------j-(k#)', reversedValues);
    const y = cold('f-------------|', reversedValues);
    const z = cold('i-----l-|', reversedValues);
    const expectedValues = {v: v, w: w, x: x, y: y, z: z};

    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => reverseString(val),
        (group: any) =>
          group.pipe(
            skip(2),
            map(() => {
              throw 'error';
            })
          )
      )
    );
    expectSource(source).toBe(expected, expectedValues);
  });

  it('should allow using a keySelector and a durationSelector, outer throws', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-#', values);
    const e1subs = '^                         !';
    const expected = '--v---w---x-y-----z-------#';
    const v = cold('a-b---(d|)', values);
    const w = cold('c-------g-(h|)', values);
    const x = cold('e---------j-(k|)', values);
    const y = cold('f-------------#', values);
    const z = cold('i-----l-#', values);
    const expectedValues = {v: v, w: w, x: x, y: y, z: z};

    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => val,
        (group: any) => group.pipe(skip(2))
      )
    );

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow using a durationSelector, and outer unsubscribed early', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const unsub = '           !';
    const expected = '--v---w---x-';
    const v = cold('a-b---(d|)', values);
    const w = cold('c-------g-(h|)', values);
    const x = cold('e---------j-(k|)', values);
    const expectedValues = {v: v, w: w, x: x};

    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => val,
        (group: any) => group.pipe(skip(2))
      )
    );

    expectSource(source, unsub).toBe(expected, expectedValues);
  });

  it('should allow using a durationSelector, outer and all inners unsubscribed early', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const unsub = '           !';
    const expected = '--v---w---x-';
    const v = '--a-b---(d|)';
    const w = '------c-----';
    const x = '----------e-';

    const expectedGroups = {
      v: TestScheduler.parseMarbles(v, values),
      w: TestScheduler.parseMarbles(w, values),
      x: TestScheduler.parseMarbles(x, values)
    };

    const unsubscriptionFrame = TestScheduler.parseMarblesAsSubscriptions(unsub)
      .unsubscribedFrame;

    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => val,
        (group: any) => group.pipe(skip(2))
      ),
      map((group: any) => {
        const arr: any[] = [];

        const subscription = group
          .pipe(
            materialize(),
            map((notification: Notification) => {
              return {frame: rxTestScheduler.frame, notification: notification};
            })
          )
          .subscribe((value: any) => {
            arr.push(value);
          });

        rxTestScheduler.schedule(() => {
          subscription.unsubscribe();
        }, unsubscriptionFrame - rxTestScheduler.frame);
        return arr;
      })
    );

    expectSource(source, unsub).toBe(expected, expectedGroups);
  });

  it('should dispose a durationSelector after closing the group', () => {
    const obs = hot('-0-1--------2-|');
    const sub = '^              !';
    let unsubs = ['-^--!', '---^--!', '------------^-!'];
    const dur = '---s';
    const durations = [cold(dur), cold(dur), cold(dur)];

    const unsubscribedFrame = TestScheduler.parseMarblesAsSubscriptions(sub)
      .unsubscribedFrame;

    obs
      .pipe(
        groupBy(
          (val: string) => val,
          (val: string) => val,
          (group: any) => durations[group.key]
        )
      )
      .subscribe();

    rxTestScheduler.schedule(() => {
      durations.forEach((d, i) => {
        expectSubscriptions(d.subscriptions).toBe(unsubs[i]);
      });
    }, unsubscribedFrame);
  });

  it('should allow using a durationSelector, but keySelector throws', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^                   !';
    const expected = '--v---w---x-y-----z-#';
    const v = cold('a-b---(d|)', values);
    const w = cold('c-------g-(h|)', values);
    const x = cold('e---------#', values);
    const y = cold('f-------#', values);
    const z = cold('i-#', values);
    const expectedValues = {v: v, w: w, x: x, y: y, z: z};

    let invoked = 0;
    const source = e1.pipe(
      groupBy(
        (val: any) => {
          invoked++;
          if (invoked === 10) {
            throw 'error';
          }
          return val.toLowerCase().trim();
        },
        (val: string) => val,
        (group: any) => group.pipe(skip(2))
      )
    );

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow using a durationSelector, but elementSelector throws', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^                   !      ';
    const expected = '--v---w---x-y-----z-#      ';
    const v = cold('a-b---(d|)               ', values);
    const w = cold('c-------g-(h|)       ', values);
    const x = cold('e---------#      ', values);
    const y = cold('f-------#      ', values);
    const z = cold('i-#      ', values);
    const expectedValues = {v: v, w: w, x: x, y: y, z: z};

    let invoked = 0;
    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => {
          invoked++;
          if (invoked === 10) {
            throw 'error';
          }
          return val;
        },
        (group: any) => group.pipe(skip(2))
      )
    );

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow using a durationSelector which eventually throws', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^           !              ';
    const expected = '--v---w---x-(y#)              ';
    const v = cold('a-b---(d|)               ', values);
    const w = cold('c-----#              ', values);
    const x = cold('e-#              ', values);
    const y = cold('#              ', values);
    const expectedValues = {v: v, w: w, x: x, y: y};

    let invoked = 0;
    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => val,
        (group: any) => {
          invoked++;
          if (invoked === 4) {
            throw 'error';
          }
          return group.pipe(skip(2));
        }
      )
    );

    expectSource(source).toBe(expected, expectedValues);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it(
    'should allow an inner to be unsubscribed early but other inners continue, ' +
      'with durationSelector',
    () => {
      const values = {
        a: '  foo',
        b: ' FoO ',
        c: 'baR  ',
        d: 'foO ',
        e: ' Baz   ',
        f: '  qux ',
        g: '   bar',
        h: ' BAR  ',
        i: 'FOO ',
        j: 'baz  ',
        k: ' bAZ ',
        l: '    fOo    '
      };
      const reversedValues = mapObject(values, reverseString);
      const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
      const e1subs = '^                         !';
      const expected = '--v---w---x-y-----z-------|';
      const v = '--a-b---';
      const unsubv = '       !';
      const w = '------c-------g-(h|)';
      const x = '----------e---------j-(k|)';
      const y = '------------f-------------|';
      const z = '------------------i-----l-|';

      const expectedGroups = {
        v: TestScheduler.parseMarbles(v, reversedValues),
        w: TestScheduler.parseMarbles(w, reversedValues),
        x: TestScheduler.parseMarbles(x, reversedValues),
        y: TestScheduler.parseMarbles(y, reversedValues),
        z: TestScheduler.parseMarbles(z, reversedValues)
      };

      const fooUnsubscriptionFrame = TestScheduler.parseMarblesAsSubscriptions(
        unsubv
      ).unsubscribedFrame;

      const source = e1.pipe(
        groupBy(
          (val: string) => val.toLowerCase().trim(),
          (val: string) => reverseString(val),
          (group: any) => group.pipe(skip(2))
        ),
        map((group: any, index: number) => {
          const arr: any[] = [];

          const subscription = group
            .pipe(
              materialize(),
              map((notification: Notification) => {
                return {
                  frame: rxTestScheduler.frame,
                  notification: notification
                };
              })
            )
            .subscribe((value: any) => {
              arr.push(value);
            });

          if (group.key === 'foo' && index === 0) {
            rxTestScheduler.schedule(() => {
              subscription.unsubscribe();
            }, fooUnsubscriptionFrame - rxTestScheduler.frame);
          }
          return arr;
        })
      );

      expectSource(source).toBe(expected, expectedGroups);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should allow inners to be unsubscribed early at different times, with durationSelector', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|', values);
    const e1subs = '^                         !';
    const expected = '--v---w---x-y-----z-------|';
    const v = '--a-b---';
    const unsubv = '       !';
    const w = '------c---';
    const unsubw = '         !';
    const x = '----------e---------j-';
    const unsubx = '                     !';
    const y = '------------f----';
    const unsuby = '                !';
    const z = '------------------i----';
    const unsubz = '                      !';

    const expectedGroups = {
      v: TestScheduler.parseMarbles(v, values),
      w: TestScheduler.parseMarbles(w, values),
      x: TestScheduler.parseMarbles(x, values),
      y: TestScheduler.parseMarbles(y, values),
      z: TestScheduler.parseMarbles(z, values)
    };

    const unsubscriptionFrames: Record<string, number> = {
      foo: TestScheduler.parseMarblesAsSubscriptions(unsubv).unsubscribedFrame,
      bar: TestScheduler.parseMarblesAsSubscriptions(unsubw).unsubscribedFrame,
      baz: TestScheduler.parseMarblesAsSubscriptions(unsubx).unsubscribedFrame,
      qux: TestScheduler.parseMarblesAsSubscriptions(unsuby).unsubscribedFrame,
      foo2: TestScheduler.parseMarblesAsSubscriptions(unsubz).unsubscribedFrame
    };
    const hasUnsubscribed: Record<string, boolean> = {};

    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => val,
        (group: any) => group.pipe(skip(2))
      ),
      map((group: any) => {
        const arr: any[] = [];

        const subscription = group
          .pipe(
            materialize(),
            map((notification: Notification) => {
              return {frame: rxTestScheduler.frame, notification: notification};
            })
          )
          .subscribe((value: any) => {
            arr.push(value);
          });

        const unsubscriptionFrame = hasUnsubscribed[group.key]
          ? unsubscriptionFrames[group.key + '2']
          : unsubscriptionFrames[group.key];
        rxTestScheduler.schedule(() => {
          subscription.unsubscribe();
          hasUnsubscribed[group.key] = true;
        }, unsubscriptionFrame - rxTestScheduler.frame);
        return arr;
      })
    );

    expectSource(source).toBe(expected, expectedGroups);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return inners that when subscribed late exhibit hot behavior', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      c: 'baR  ',
      d: 'foO ',
      e: ' Baz   ',
      f: '  qux ',
      g: '   bar',
      h: ' BAR  ',
      i: 'FOO ',
      j: 'baz  ',
      k: ' bAZ ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b-c-d-e-f-g-h-i-j-k-l-|    ', values);
    const e1subs = '^                         !    ';
    const expected = '--v---w---x-y-------------|    ';
    const subv = '   ^                           '; // foo
    const v = '  --b---d---------i-----l-|    '; // foo
    const subw = '         ^                     '; // bar
    const w = '      --------g-h---------|    '; // bar
    const subx = '                   ^           '; // baz
    const x = '          ----------j-k---|    '; // baz
    const suby = '                              ^'; // qux
    const y = '            ------------------|'; // qux

    const expectedGroups = {
      v: TestScheduler.parseMarbles(v, values),
      w: TestScheduler.parseMarbles(w, values),
      x: TestScheduler.parseMarbles(x, values),
      y: TestScheduler.parseMarbles(y, values)
    };

    const subscriptionFrames: Record<string, number> = {
      foo: TestScheduler.parseMarblesAsSubscriptions(subv).subscribedFrame,
      bar: TestScheduler.parseMarblesAsSubscriptions(subw).subscribedFrame,
      baz: TestScheduler.parseMarblesAsSubscriptions(subx).subscribedFrame,
      qux: TestScheduler.parseMarblesAsSubscriptions(suby).subscribedFrame
    };

    const result = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => val
      ),
      map((group: any) => {
        const innerNotifications: any[] = [];
        const subscriptionFrame = subscriptionFrames[group.key];

        rxTestScheduler.schedule(() => {
          group
            .pipe(
              materialize(),
              map((notification: Notification) => {
                return {
                  frame: rxTestScheduler.frame,
                  notification: notification
                };
              })
            )
            .subscribe((value: any) => {
              innerNotifications.push(value);
            });
        }, subscriptionFrame - rxTestScheduler.frame);

        return innerNotifications;
      })
    );

    expectSource(result).toBe(expected, expectedGroups);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return inner group that when subscribed late emits complete()', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      d: 'foO ',
      i: 'FOO ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b---d---------i-----l-|', values);
    const e1subs = '^                         !';
    const expected = '--g-----------------------|';
    const innerSub = '                                ^';
    const g = '--------------------------------|';

    const expectedGroups = {
      g: TestScheduler.parseMarbles(g, values)
    };

    const innerSubscriptionFrame = TestScheduler.parseMarblesAsSubscriptions(
      innerSub
    ).subscribedFrame;

    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => val,
        (group: any) => group.pipe(skip(7))
      ),
      map((group: any) => {
        const arr: any[] = [];

        rxTestScheduler.schedule(() => {
          group
            .pipe(
              materialize(),
              map((notification: Notification) => {
                return {
                  frame: rxTestScheduler.frame,
                  notification: notification
                };
              })
            )
            .subscribe((value: any) => {
              arr.push(value);
            });
        }, innerSubscriptionFrame - rxTestScheduler.frame);

        return arr;
      })
    );

    expectSource(source).toBe(expected, expectedGroups);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return inner group that when subscribed late emits error()', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      d: 'foO ',
      i: 'FOO ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b---d---------i-----l-#', values);
    const e1subs = '^                         !';
    const expected = '--g-----------------------#';
    const innerSub = '                                ^';
    const g = '--------------------------------#';

    const expectedGroups = {
      g: TestScheduler.parseMarbles(g, values)
    };

    const innerSubscriptionFrame = TestScheduler.parseMarblesAsSubscriptions(
      innerSub
    ).subscribedFrame;

    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => val,
        (group: any) => group.pipe(skip(7))
      ),
      map((group: any) => {
        const arr: any[] = [];

        rxTestScheduler.schedule(() => {
          group
            .pipe(
              materialize(),
              map((notification: Notification) => {
                return {
                  frame: rxTestScheduler.frame,
                  notification: notification
                };
              })
            )
            .subscribe((value: any) => {
              arr.push(value);
            });
        }, innerSubscriptionFrame - rxTestScheduler.frame);

        return arr;
      })
    );

    expectSource(source).toBe(expected, expectedGroups);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should return inner that does not throw when faulty outer is unsubscribed early', () => {
    const values = {
      a: '  foo',
      b: ' FoO ',
      d: 'foO ',
      i: 'FOO ',
      l: '    fOo    '
    };
    const e1 = hot('-1--2--^-a-b---d---------i-----l-#', values);
    const unsub = '      !';
    const expectedSubs = '^     !';
    const expected = '--g----';
    const innerSub = '                                ^';
    const g = '-';

    const expectedGroups = {
      g: TestScheduler.parseMarbles(g, values)
    };

    const innerSubscriptionFrame = TestScheduler.parseMarblesAsSubscriptions(
      innerSub
    ).subscribedFrame;

    const source = e1.pipe(
      groupBy(
        (val: string) => val.toLowerCase().trim(),
        (val: string) => val,
        (group: any) => group.pipe(skip(7))
      ),
      map((group: any) => {
        const arr: any[] = [];

        rxTestScheduler.schedule(() => {
          group
            .pipe(
              materialize(),
              map((notification: Notification) => {
                return {
                  frame: rxTestScheduler.frame,
                  notification: notification
                };
              })
            )
            .subscribe((value: any) => {
              arr.push(value);
            });
        }, innerSubscriptionFrame - rxTestScheduler.frame);

        return arr;
      })
    );

    expectSource(source, unsub).toBe(expected, expectedGroups);
    expectSubscriptions(e1.subscriptions).toBe(expectedSubs);
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
    }).pipe(
      groupBy(
        (x: number) => x % 2,
        (x: number) => x + '!'
      )
    );

    expect(result instanceof MyCustomObservable).to.be.true;

    const expectedGroups = [
      {key: 1, values: ['1!', '3!']},
      {key: 0, values: ['2!']}
    ];

    result.subscribe(
      (g: any) => {
        const expectedGroup = expectedGroups.shift()!;
        expect(g.key).to.equal(expectedGroup.key);

        g.subscribe((x: any) => {
          expect(x).to.deep.equal(expectedGroup.values.shift());
        });
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
import {ignoreElements, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {ignoreElements} */
describe('ignoreElements operator', () => {
  asDiagram('ignoreElements')(
    'should ignore all the elements of the source',
    () => {
      const source = hot('--a--b--c--d--|');
      const subs = '^             !';
      const expected = '--------------|';

      expectSource(source.pipe(ignoreElements())).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(subs);
    }
  );

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
import * as index from 'rxjs/operators';
import {expect} from 'chai';

describe('operators/index', () => {
  it('should export operators', () => {
    expect(index.audit).to.exist;
    expect(index.auditTime).to.exist;
    expect(index.buffer).to.exist;
    expect(index.bufferCount).to.exist;
    expect(index.bufferTime).to.exist;
    expect(index.bufferToggle).to.exist;
    expect(index.bufferWhen).to.exist;
    expect(index.catchError).to.exist;
    expect(index.combineAll).to.exist;
    expect(index.concatAll).to.exist;
    expect(index.concatMap).to.exist;
    expect(index.concatMapTo).to.exist;
    expect(index.count).to.exist;
    expect(index.debounce).to.exist;
    expect(index.debounceTime).to.exist;
    expect(index.defaultIfEmpty).to.exist;
    expect(index.delay).to.exist;
    expect(index.delayWhen).to.exist;
    expect(index.dematerialize).to.exist;
    expect(index.distinct).to.exist;
    expect(index.distinctUntilChanged).to.exist;
    expect(index.distinctUntilKeyChanged).to.exist;
    expect(index.elementAt).to.exist;
    expect(index.every).to.exist;
    expect(index.exhaust).to.exist;
    expect(index.exhaustMap).to.exist;
    expect(index.expand).to.exist;
    expect(index.filter).to.exist;
    expect(index.finalize).to.exist;
    expect(index.find).to.exist;
    expect(index.findIndex).to.exist;
    expect(index.first).to.exist;
    expect(index.groupBy).to.exist;
    expect(index.ignoreElements).to.exist;
    expect(index.isEmpty).to.exist;
    expect(index.last).to.exist;
    expect(index.map).to.exist;
    expect(index.mapTo).to.exist;
    expect(index.materialize).to.exist;
    expect(index.max).to.exist;
    expect(index.mergeAll).to.exist;
    expect(index.mergeMap).to.exist;
    expect(index.mergeMap).to.exist;
    expect(index.mergeMapTo).to.exist;
    expect(index.mergeScan).to.exist;
    expect(index.min).to.exist;
    expect(index.multicast).to.exist;
    expect(index.observeOn).to.exist;
    expect(index.pairwise).to.exist;
    expect(index.partition).to.exist;
    expect(index.pluck).to.exist;
    expect(index.reduce).to.exist;
    expect(index.repeat).to.exist;
    expect(index.repeatWhen).to.exist;
    expect(index.retry).to.exist;
    expect(index.retryWhen).to.exist;
    expect(index.sample).to.exist;
    expect(index.sampleTime).to.exist;
    expect(index.scan).to.exist;
    expect(index.sequenceEqual).to.exist;
    expect(index.share).to.exist;
    expect(index.shareReplay).to.exist;
    expect(index.single).to.exist;
    expect(index.skip).to.exist;
    expect(index.skipLast).to.exist;
    expect(index.skipUntil).to.exist;
    expect(index.skipWhile).to.exist;
    expect(index.startWith).to.exist;
    expect(index.switchAll).to.exist;
    expect(index.switchMap).to.exist;
    expect(index.switchMapTo).to.exist;
    expect(index.take).to.exist;
    expect(index.takeLast).to.exist;
    expect(index.takeUntil).to.exist;
    expect(index.takeWhile).to.exist;
    expect(index.tap).to.exist;
    expect(index.throttle).to.exist;
    expect(index.throttleTime).to.exist;
    expect(index.timeInterval).to.exist;
    expect(index.timeout).to.exist;
    expect(index.timeoutWith).to.exist;
    expect(index.time).to.exist;
    expect(index.toArray).to.exist;
    expect(index.window).to.exist;
    expect(index.windowCount).to.exist;
    expect(index.windowTime).to.exist;
    expect(index.windowToggle).to.exist;
    expect(index.windowWhen).to.exist;
    expect(index.withLatestFrom).to.exist;
  });
});
import {isEmpty, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {isEmpty} */
describe('isEmpty operator', () => {
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

import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {last, mergeMap} from 'rxjs/operators';
import {EmptyError, of, from, Observable} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {last} */
describe('Observable.prototype.last', () => {
  asDiagram('last')('should take the last value of an observable', () => {
    const e1 = hot('--a----b--c--|');
    const e1subs = '^            !';
    const expected = '-------------(c|)';

    expectSource(e1.pipe(last())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
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
      const isString = (x: string | number): x is string =>
        typeof x === 'string';

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
import {expect} from 'chai';
import {map, tap, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

// function shortcuts
const addDrama = function (x: number | string) {
  return x + '!';
};
const identity = function <T>(x: T) {
  return x;
};

/** @test {map} */
describe('map operator', () => {
  asDiagram('map(x => 10 * x)')('should map multiple values', () => {
    const a = cold('--1--2--3--|');
    const asubs = '^          !';
    const expected = '--x--y--z--|';

    const r = a.pipe(
      map(function (x) {
        return 10 * +x;
      })
    );

    expectSource(r).toBe(expected, {x: 10, y: 20, z: 30});
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should map one value', () => {
    const a = cold('--x--|', {x: 42});
    const asubs = '^    !';
    const expected = '--y--|';

    const r = a.pipe(map(addDrama));

    expectSource(r).toBe(expected, {y: '42!'});
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should throw an error if not passed a function', () => {
    expect(() => {
      of(1, 2, 3).pipe(map(<any>'potato'));
    }).to.throw(
      TypeError,
      'argument is not a function. Are you looking for `mapTo()`?'
    );
  });

  it('should map multiple values', () => {
    const a = cold('--1--2--3--|');
    const asubs = '^          !';
    const expected = '--x--y--z--|';

    const r = a.pipe(map(addDrama));

    expectSource(r).toBe(expected, {x: '1!', y: '2!', z: '3!'});
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should propagate errors from map function', () => {
    const a = cold('--x--|', {x: 42});
    const asubs = '^ !   ';
    const expected = '--#   ';

    const r = a.pipe(
      map((x: any) => {
        throw 'too bad';
      })
    );

    expectSource(r).toBe(expected, null, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should propagate errors from observable that emits only errors', () => {
    const a = cold('#');
    const asubs = '(^!)';
    const expected = '#';

    const r = a.pipe(map(identity));
    expectSource(r).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should propagate errors from observable that emit values', () => {
    const a = cold('--a--b--#', {a: 1, b: 2}, 'too bad');
    const asubs = '^       !';
    const expected = '--x--y--#';

    const r = a.pipe(map(addDrama));
    expectSource(r).toBe(expected, {x: '1!', y: '2!'}, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should not map an empty observable', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const expected = '|';

    let invoked = 0;
    const r = a.pipe(
      map((x: any) => {
        invoked++;
        return x;
      }),
      tap(null, null, () => {
        expect(invoked).to.equal(0);
      })
    );

    expectSource(r).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const a = cold('--1--2--3--|');
    const unsub = '      !     ';
    const asubs = '^     !     ';
    const expected = '--x--y-     ';

    const r = a.pipe(map(addDrama));

    expectSource(r, unsub).toBe(expected, {x: '1!', y: '2!'});
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should map with index', () => {
    const a = hot('-5-^-4--3---2----1--|');
    const asubs = '^                !';
    const expected = '--a--b---c----d--|';
    const values = {a: 5, b: 14, c: 23, d: 32};

    let invoked = 0;
    const r = a.pipe(
      map((x: string, index: number) => {
        invoked++;
        return parseInt(x) + 1 + index * 10;
      }),
      tap(null, null, () => {
        expect(invoked).to.equal(4);
      })
    );

    expectSource(r).toBe(expected, values);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should map with index until completed', () => {
    const a = hot('-5-^-4--3---2----1--|');
    const asubs = '^                !';
    const expected = '--a--b---c----d--|';
    const values = {a: 5, b: 14, c: 23, d: 32};

    let invoked = 0;
    const r = a.pipe(
      map((x: string, index: number) => {
        invoked++;
        return parseInt(x) + 1 + index * 10;
      }),
      tap(null, null, () => {
        expect(invoked).to.equal(4);
      })
    );

    expectSource(r).toBe(expected, values);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should map with index until an error occurs', () => {
    const a = hot('-5-^-4--3---2----1--#', undefined, 'too bad');
    const asubs = '^                !';
    const expected = '--a--b---c----d--#';
    const values = {a: 5, b: 14, c: 23, d: 32};

    let invoked = 0;
    const r = a.pipe(
      map((x: string, index: number) => {
        invoked++;
        return parseInt(x) + 1 + index * 10;
      }),
      tap(null, null, () => {
        expect(invoked).to.equal(4);
      })
    );

    expectSource(r).toBe(expected, values, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should map using a custom thisArg', () => {
    const a = hot('-5-^-4--3---2----1--|');
    const asubs = '^                !';
    const expected = '--a--b---c----d--|';
    const values = {a: 5, b: 14, c: 23, d: 32};

    const foo = {
      value: 42
    };
    const r = a.pipe(
      map(function (this: typeof foo, x: string, index: number) {
        expect(this).to.equal(foo);
        return parseInt(x) + 1 + index * 10;
      }, foo)
    );

    expectSource(r).toBe(expected, values);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should map twice', () => {
    const a = hot('-0----1-^-2---3--4-5--6--7-8-|');
    const asubs = '^                    !';
    const expected = '--a---b--c-d--e--f-g-|';
    const values = {a: 2, b: 3, c: 4, d: 5, e: 6, f: 7, g: 8};

    let invoked1 = 0;
    let invoked2 = 0;
    const r = a.pipe(
      map((x: string) => {
        invoked1++;
        return parseInt(x) * 2;
      }),
      map((x: number) => {
        invoked2++;
        return x / 2;
      }),
      tap(null, null, () => {
        expect(invoked1).to.equal(7);
        expect(invoked2).to.equal(7);
      })
    );

    expectSource(r).toBe(expected, values);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should do multiple maps using a custom thisArg', () => {
    const a = hot('--1--2--3--4--|');
    const asubs = '^             !';
    const expected = '--a--b--c--d--|';
    const values = {a: 11, b: 14, c: 17, d: 20};

    class Filterer {
      selector1 = (x: string) => parseInt(x) + 2;
      selector2 = (x: string) => parseInt(x) * 3;
    }
    const filterer = new Filterer();

    const r = a.pipe(
      map(function (this: any, x) {
        return this.selector1(x);
      }, filterer),
      map(function (this: any, x) {
        return this.selector2(x);
      }, filterer),
      map(function (this: any, x) {
        return this.selector1(x);
      }, filterer)
    );

    expectSource(r).toBe(expected, values);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const a = cold('--1--2--3--|');
    const unsub = '      !     ';
    const asubs = '^     !     ';
    const expected = '--x--y-     ';

    const r = a.pipe(
      mergeMap((x: string) => of(x)),
      map(addDrama),
      mergeMap((x: string) => of(x))
    );

    expectSource(r, unsub).toBe(expected, {x: '1!', y: '2!'});
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });
});

import {mapTo, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {mapTo} */
describe('mapTo operator', () => {
  asDiagram("mapTo('a')")('should map multiple values', () => {
    const a = cold('--1--2--3--|');
    const asubs = '^          !';
    const expected = '--a--a--a--|';

    expectSource(a.pipe(mapTo('a'))).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should map one value', () => {
    const a = cold('--7--|');
    const asubs = '^    !';
    const expected = '--y--|';

    expectSource(a.pipe(mapTo('y'))).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const a = cold('--1--2--3--|');
    const unsub = '      !     ';
    const asubs = '^     !     ';
    const expected = '--x--x-     ';

    expectSource(a.pipe(mapTo('x')), unsub).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should propagate errors from observable that emits only errors', () => {
    const a = cold('--#', undefined, 'too bad');
    const asubs = '^ !';
    const expected = '--#';

    expectSource(a.pipe(mapTo(1))).toBe(expected, null, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should propagate errors from observable that emit values', () => {
    const a = cold('--1--2--#', undefined, 'too bad');
    const asubs = '^       !';
    const expected = '--x--x--#';

    expectSource(a.pipe(mapTo('x'))).toBe(expected, undefined, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should not map an empty observable', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const expected = '|';

    expectSource(a.pipe(mapTo(-1))).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should map twice', () => {
    const a = hot('-0----1-^-2---3--4-5--6--7-8-|');
    const asubs = '^                    !';
    const expected = '--h---h--h-h--h--h-h-|';

    const r = a.pipe(mapTo(-1), mapTo('h'));

    expectSource(r).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const a = cold('--1--2--3--|');
    const unsub = '      !     ';
    const asubs = '^     !     ';
    const expected = '--x--x-     ';

    const r = a.pipe(
      mergeMap((x: string) => of(x)),
      mapTo('x'),
      mergeMap((x: string) => of(x))
    );

    expectSource(r, unsub).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });
});
import {materialize, map, mergeMap} from 'rxjs/operators';
import {Notification, of} from 'rxjs';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

declare function asDiagram(arg: string): Function;

/** @test {materialize} */
describe('materialize operator', () => {
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
import {expect} from 'chai';
import {max, mergeMap, skip, take} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of, range} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {max} */
describe('max operator', () => {
  asDiagram('max')('should find the max of values of an observable', () => {
    const e1 = hot('--a--b--c--|', {a: 42, b: -1, c: 3});
    const subs = '^          !';
    const expected = '-----------(x|)';

    expectSource((<any>e1).pipe(max())).toBe(expected, {x: 42});
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should be never when source is never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource((<any>e1).pipe(max())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should be zero when source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource((<any>e1).pipe(max())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it("should be never when source doesn't complete", () => {
    const e1 = hot('--x--^--y--');
    const e1subs = '^     ';
    const expected = '------';

    expectSource((<any>e1).pipe(max())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it("should be completes when source doesn't have values", () => {
    const e1 = hot('-x-^---|');
    const e1subs = '^   !';
    const expected = '----|';

    expectSource((<any>e1).pipe(max())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should max the unique value of an observable', () => {
    const e1 = hot('-x-^--y--|', {y: 42});
    const e1subs = '^     !';
    const expected = '------(w|)';

    expectSource((<any>e1).pipe(max())).toBe(expected, {w: 42});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should max the values of an ongoing hot observable', () => {
    const e1 = hot('--a-^-b--c--d--|', {a: 42, b: -1, c: 0, d: 666});
    const subs = '^          !';
    const expected = '-----------(x|)';

    expectSource((<any>e1).pipe(max())).toBe(expected, {x: 666});
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--b--c--|', {a: 42, b: -1, c: 0});
    const unsub = '      !     ';
    const subs = '^     !     ';
    const expected = '-------     ';

    expectSource((<any>e1).pipe(max()), unsub).toBe(expected, {x: 42});
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = hot('--a--b--c--|', {a: 42, b: -1, c: 0});
    const subs = '^     !     ';
    const expected = '-------     ';
    const unsub = '      !     ';

    const result = (<any>source).pipe(
      mergeMap((x: string) => of(x)),
      max(),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected, {x: 42});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should max a range() source observable', (done: MochaDone) => {
    (<any>range(1, 10000)).pipe(max()).subscribe(
      (value: number) => {
        expect(value).to.equal(10000);
      },
      (x: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should max a range().skip(1) source observable', (done: MochaDone) => {
    (<any>range(1, 10)).pipe(skip(1), max()).subscribe(
      (value: number) => {
        expect(value).to.equal(10);
      },
      (x: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should max a range().take(1) source observable', (done: MochaDone) => {
    (<any>range(1, 10)).pipe(take(1), max()).subscribe(
      (value: number) => {
        expect(value).to.equal(1);
      },
      (x: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should work with error', () => {
    const e1 = hot('-x-^--y--z--#', {x: 1, y: 2, z: 3}, 'too bad');
    const e1subs = '^        !';
    const expected = '---------#';

    expectSource((<any>e1).pipe(max())).toBe(expected, null, 'too bad');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource((<any>e1).pipe(max())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a constant predicate on an empty hot observable', () => {
    const e1 = hot('-x-^---|');
    const e1subs = '^   !';
    const expected = '----|';

    const predicate = function <T>(x: T, y: T) {
      return 42;
    };

    expectSource((<any>e1).pipe(max(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a constant predicate on an never hot observable', () => {
    const e1 = hot('-x-^----');
    const e1subs = '^    ';
    const expected = '-----';

    const predicate = function <T>(x: T, y: T) {
      return 42;
    };

    expectSource((<any>e1).pipe(max(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a constant predicate on a simple hot observable', () => {
    const e1 = hot('-x-^-a-|', {a: 1});
    const e1subs = '^   !';
    const expected = '----(w|)';

    const predicate = function () {
      return 42;
    };

    expectSource((<any>e1).pipe(max(predicate))).toBe(expected, {w: 1});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a reverse predicate on observable with many values', () => {
    const e1 = hot('-a-^-b--c--d-|', {a: 42, b: -1, c: 0, d: 666});
    const e1subs = '^         !';
    const expected = '----------(w|)';

    const predicate = function <T>(x: T, y: T) {
      return x > y ? -1 : 1;
    };

    expectSource((<any>e1).pipe(max(predicate))).toBe(expected, {w: -1});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a predicate for string on observable with many values', () => {
    const e1 = hot('-a-^-b--c--d-|');
    const e1subs = '^         !';
    const expected = '----------(w|)';

    const predicate = function <T>(x: T, y: T) {
      return x > y ? -1 : 1;
    };

    expectSource((<any>e1).pipe(max(predicate))).toBe(expected, {w: 'b'});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a constant predicate on observable that throws', () => {
    const e1 = hot('-1-^---#');
    const e1subs = '^   !';
    const expected = '----#';

    const predicate = () => {
      return 42;
    };

    expectSource((<any>e1).pipe(max(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a predicate that throws, on observable with many values', () => {
    const e1 = hot('-1-^-2--3--|');
    const e1subs = '^    !   ';
    const expected = '-----#   ';

    const predicate = function (x: string, y: string) {
      if (y === '3') {
        throw 'error';
      }
      return x > y ? -1 : 1;
    };

    expectSource((<any>e1).pipe(max(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {merge} from 'rxjs/operators';
import {queueScheduler, of} from 'rxjs';
import {expect} from 'chai';

describe('merge (legacy)', () => {
  it('should merge an immediately-scheduled source with an immediately-scheduled second', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [1, 2, 4, 3, 5, 6, 7, 8];

    a.pipe(merge(b, queueScheduler)).subscribe(
      val => {
        expect(val).to.equal(r.shift());
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
import {expect} from 'chai';
import {mergeAll, mergeMap, take} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {throwError, from, of, Observable, queueScheduler} from 'rxjs';

declare function asDiagram(arg: string): Function;
declare const type: Function;

/** @test {mergeAll} */
describe('mergeAll oeprator', () => {
  asDiagram('mergeAll')(
    'should merge a hot observable of cold observables',
    () => {
      const x = cold('--a---b--c---d--|      ');
      const y = cold('----e---f--g---|');
      const e1 = hot('--x------y-------|       ', {x: x, y: y});
      const expected = '----a---b--c-e-d-f--g---|';

      expectSource(e1.pipe(mergeAll())).toBe(expected);
    }
  );

  it('should merge all observables in an observable', () => {
    const e1 = from([of('a'), of('b'), of('c')]);
    const expected = '(abc|)';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
  });

  it('should throw if any child observable throws', () => {
    const e1 = from([of('a'), throwError('error'), of('c')]);
    const expected = '(a#)';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
  });

  it('should handle merging a hot observable of observables', () => {
    const x = cold('a---b---c---|   ');
    const xsubs = '  ^           !   ';
    const y = cold('d---e---f---|');
    const ysubs = '     ^           !';
    const e1 = hot('--x--y--|         ', {x: x, y: y});
    const e1subs = '^       !         ';
    const expected = '--a--db--ec--f---|';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge one cold Observable at a time with parameter concurrency=1', () => {
    const x = cold('a---b---c---|            ');
    const xsubs = '  ^           !            ';
    const y = cold('d---e---f---|');
    const ysubs = '              ^           !';
    const e1 = hot('--x--y--|                  ', {x: x, y: y});
    const e1subs = '^       !                  ';
    const expected = '--a---b---c---d---e---f---|';

    expectSource(e1.pipe(mergeAll(1))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge two cold Observables at a time with parameter concurrency=2', () => {
    const x = cold('a---b---c---|        ');
    const xsubs = '  ^           !        ';
    const y = cold('d---e---f---|     ');
    const ysubs = '     ^           !     ';
    const z = cold('--g---h-|');
    const zsubs = '              ^       !';
    const e1 = hot('--x--y--z--|           ', {x: x, y: y, z: z});
    const e1subs = '^          !           ';
    const expected = '--a--db--ec--f--g---h-|';

    expectSource(e1.pipe(mergeAll(2))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge one hot Observable at a time with parameter concurrency=1', () => {
    const x = hot('---a---b---c---|          ');
    const xsubs = '  ^            !          ';
    const y = hot('-------------d---e---f---|');
    const ysubs = '               ^         !';
    const e1 = hot('--x--y--|                 ', {x: x, y: y});
    const e1subs = '^       !                 ';
    const expected = '---a---b---c-----e---f---|';

    expectSource(e1.pipe(mergeAll(1))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge two hot Observables at a time with parameter concurrency=2', () => {
    const x = hot('i--a---b---c---|        ');
    const xsubs = '  ^            !        ';
    const y = hot('-i-i--d---e---f---|     ');
    const ysubs = '     ^            !     ';
    const z = hot('--i--i--i--i-----g---h-|');
    const zsubs = '               ^       !';
    const e1 = hot('--x--y--z--|            ', {x: x, y: y, z: z});
    const e1subs = '^          !            ';
    const expected = '---a--db--ec--f--g---h-|';

    expectSource(e1.pipe(mergeAll(2))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle merging a hot observable of observables, outer unsubscribed early', () => {
    const x = cold('a---b---c---|   ');
    const xsubs = '  ^         !     ';
    const y = cold('d---e---f---|');
    const ysubs = '     ^      !     ';
    const e1 = hot('--x--y--|         ', {x: x, y: y});
    const e1subs = '^       !         ';
    const unsub = '            !     ';
    const expected = '--a--db--ec--     ';

    expectSource(e1.pipe(mergeAll()), unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const x = cold('a---b---c---|   ');
    const xsubs = '  ^         !     ';
    const y = cold('d---e---f---|');
    const ysubs = '     ^      !     ';
    const e1 = hot('--x--y--|         ', {x: x, y: y});
    const e1subs = '^       !         ';
    const expected = '--a--db--ec--     ';
    const unsub = '            !     ';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      mergeAll(),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge parallel emissions', () => {
    const x = cold('----a----b----c---|');
    const xsubs = '  ^                 !';
    const y = cold('-d----e----f---|');
    const ysubs = '     ^              !';
    const e1 = hot('--x--y--|            ', {x: x, y: y});
    const e1subs = '^       !            ';
    const expected = '------(ad)-(be)-(cf)|';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge empty and empty', () => {
    const x = cold('|');
    const xsubs = '  (^!)   ';
    const y = cold('|');
    const ysubs = '     (^!)';
    const e1 = hot('--x--y--|', {x: x, y: y});
    const e1subs = '^       !';
    const expected = '--------|';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge three empties', () => {
    const x = cold('|');
    const xsubs = '  (^!)     ';
    const y = cold('|');
    const ysubs = '     (^!)  ';
    const z = cold('|');
    const zsubs = '       (^!)';
    const e1 = hot('--x--y-z---|', {x: x, y: y, z: z});
    const e1subs = '^          !';
    const expected = '-----------|';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge never and empty', () => {
    const x = cold('-');
    const xsubs = '  ^';
    const y = cold('|');
    const ysubs = '     (^!)';
    const e1 = hot('--x--y--|', {x: x, y: y});
    const e1subs = '^       !';
    const expected = '---------';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge never and never', () => {
    const x = cold('-');
    const xsubs = '  ^';
    const y = cold('-');
    const ysubs = '     ^';
    const e1 = hot('--x--y--|', {x: x, y: y});
    const e1subs = '^       !';
    const expected = '---------';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge empty and throw', () => {
    const x = cold('|');
    const xsubs = '  (^!)   ';
    const y = cold('#');
    const ysubs = '     (^!)';
    const e1 = hot('--x--y--|', {x: x, y: y});
    const e1subs = '^    !   ';
    const expected = '-----#   ';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge never and throw', () => {
    const x = cold('-');
    const xsubs = '  ^  !';
    const y = cold('#');
    const ysubs = '     (^!)';
    const e1 = hot('--x--y--|', {x: x, y: y});
    const e1subs = '^    !   ';
    const expected = '-----#   ';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge empty and eventual error', () => {
    const x = cold('|');
    const xsubs = '  (^!)';
    const y = cold('------#');
    const ysubs = '     ^     !';
    const e1 = hot('--x--y--|   ', {x: x, y: y});
    const e1subs = '^       !   ';
    const expected = '-----------#';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge never and eventual error', () => {
    const x = cold('-');
    const xsubs = '  ^        !';
    const y = cold('------#');
    const ysubs = '     ^     !';
    const e1 = hot('--x--y--|   ', {x: x, y: y});
    const e1subs = '^       !   ';
    const expected = '-----------#';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take an empty source and return empty too', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take a never source and return never too', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should take a throw source and return throw too', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle merging a hot observable of non-overlapped observables', () => {
    const x = cold('a-b---------|                 ');
    const xsubs = '  ^           !                 ';
    const y = cold('c-d-e-f-|           ');
    const ysubs = '            ^       !           ';
    const z = cold('g-h-i-j-k-|');
    const zsubs = '                     ^         !';
    const e1 = hot('--x---------y--------z--------| ', {x: x, y: y, z: z});
    const e1subs = '^                             ! ';
    const expected = '--a-b-------c-d-e-f--g-h-i-j-k-|';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if inner observable raises error', () => {
    const x = cold('a-b---------|                 ');
    const xsubs = '  ^           !                 ';
    const y = cold('c-d-e-f-#           ');
    const ysubs = '            ^       !           ';
    const z = cold('g-h-i-j-k-|');
    const zsubs: string[] = [];
    const e1 = hot('--x---------y--------z--------| ', {x: x, y: y, z: z});
    const e1subs = '^                   !           ';
    const expected = '--a-b-------c-d-e-f-#           ';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if outer observable raises error', () => {
    const y = cold('a-b---------|                ');
    const ysubs = '  ^           !                ';
    const z = cold('c-d-e-f-|          ');
    const zsubs = '            ^   !              ';
    const e1 = hot('--y---------z---#              ', {y: y, z: z});
    const e1subs = '^               !              ';
    const expected = '--a-b-------c-d-#              ';

    expectSource(e1.pipe(mergeAll())).toBe(expected);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should merge all promises in an observable', done => {
    const e1 = from([
      new Promise<string>(res => {
        res('a');
      }),
      new Promise<string>(res => {
        res('b');
      }),
      new Promise<string>(res => {
        res('c');
      }),
      new Promise<string>(res => {
        res('d');
      })
    ]);
    const expected = ['a', 'b', 'c', 'd'];

    const res: string[] = [];
    e1.pipe(mergeAll()).subscribe(
      x => {
        res.push(x);
      },
      err => {
        done(new Error('should not be called'));
      },
      () => {
        expect(res).to.deep.equal(expected);
        done();
      }
    );
  });

  it('should raise error when promise rejects', done => {
    const error = 'error';
    const e1 = from([
      new Promise<string>(res => {
        res('a');
      }),
      new Promise<string>((res: any, rej) => {
        rej(error);
      }),
      new Promise<string>(res => {
        res('c');
      }),
      new Promise<string>(res => {
        res('d');
      })
    ]);

    const res: string[] = [];
    e1.pipe(mergeAll()).subscribe(
      x => {
        res.push(x);
      },
      err => {
        expect(res.length).to.equal(1);
        expect(err).to.equal('error');
        done();
      },
      () => {
        done(new Error('should not be called'));
      }
    );
  });

  it('should finalize generators when merged if the subscription ends', () => {
    const iterable = {
      finalized: false,
      next() {
        return {value: 'duck', done: false};
      },
      return() {
        this.finalized = true;
      },
      [Symbol.iterator]() {
        return this;
      }
    };

    const results: string[] = [];

    const iterableObservable = from<string>(iterable as any);
    of(iterableObservable)
      .pipe(mergeAll(), take(3))
      .subscribe(
        x => results.push(x),
        null,
        () => results.push('GOOSE!')
      );

    expect(results).to.deep.equal(['duck', 'duck', 'duck', 'GOOSE!']);
    expect(iterable.finalized).to.be.true;
  });

  it('should merge two observables', done => {
    const a = of(1, 2, 3);
    const b = of(4, 5, 6, 7, 8);
    const r = [1, 2, 3, 4, 5, 6, 7, 8];

    of(a, b)
      .pipe(mergeAll())
      .subscribe(
        val => {
          expect(val).to.equal(r.shift());
        },
        null,
        done
      );
  });

  it('should merge two immediately-scheduled observables', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [1, 2, 4, 3, 5, 6, 7, 8];

    of(a, b, queueScheduler)
      .pipe(mergeAll())
      .subscribe(
        val => {
          expect(val).to.equal(r.shift());
        },
        null,
        done
      );
  });
});
import {expect} from 'chai';
import {mergeMap, map} from 'rxjs/operators';
import {asapScheduler, defer, Observable, from, of, timer} from 'rxjs';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {asInteropSource} from '../helpers/interop-helper';

declare const type: Function;
declare const asDiagram: Function;

/** @test {mergeMap} */
describe('mergeMap', () => {
  asDiagram('mergeMap(i => 10*i\u2014\u201410*i\u2014\u201410*i\u2014| )')(
    'should map-and-flatten each item to an Observable',
    () => {
      const e1 = hot('--1-----3--5-------|');
      const e1subs = '^                  !';
      const e2 = cold('x-x-x|              ', {x: 10});
      const expected = '--x-x-x-y-yzyz-z---|';
      const values = {x: 10, y: 30, z: 50};

      const result = e1.pipe(mergeMap(x => e2.pipe(map(i => i * +x))));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should support the deprecated resultSelector', () => {
    const results: Array<number[]> = [];

    of(1, 2, 3)
      .pipe(
        mergeMap(
          x => of(x, x + 1, x + 2),
          (a, b, i, ii) => [a, b, i, ii]
        )
      )
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([
            [1, 1, 0, 0],
            [1, 2, 0, 1],
            [1, 3, 0, 2],
            [2, 2, 1, 0],
            [2, 3, 1, 1],
            [2, 4, 1, 2],
            [3, 3, 2, 0],
            [3, 4, 2, 1],
            [3, 5, 2, 2]
          ]);
        }
      });
  });

  it('should support a void resultSelector (still deprecated)', () => {
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(mergeMap(x => of(x, x + 1, x + 2), void 0))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([1, 2, 3, 2, 3, 4, 3, 4, 5]);
        }
      });
  });

  it('should support a void resultSelector (still deprecated) and concurrency limit', () => {
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(mergeMap(x => of(x, x + 1, x + 2), void 0, 1))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([1, 2, 3, 2, 3, 4, 3, 4, 5]);
        }
      });
  });

  it('should mergeMap many regular interval inners', () => {
    const a = cold('----a---a---a---(a|)                    ');
    const b = cold('----b---b---(b|)                    ');
    const c = cold('----c---c---c---c---(c|)');
    const d = cold('----(d|)        ');
    const e1 = hot('a---b-----------c-------d-------|       ');
    const e1subs = '^                               !       ';
    const expected = '----a---(ab)(ab)(ab)c---c---(cd)c---(c|)';

    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d
    };
    const source = e1.pipe(mergeMap(value => observableLookup[value]));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should map values to constant resolved promises and merge', done => {
    const source = from([4, 3, 2, 1]);
    const project = (value: any) => from(Promise.resolve(42));

    const results: number[] = [];
    source.pipe(mergeMap(project)).subscribe(
      x => {
        results.push(x);
      },
      err => {
        done(new Error('Subscriber error handler not supposed to be called.'));
      },
      () => {
        expect(results).to.deep.equal([42, 42, 42, 42]);
        done();
      }
    );
  });

  it('should map values to constant rejected promises and merge', done => {
    const source = from([4, 3, 2, 1]);
    const project = function (value: any) {
      return from(Promise.reject<number>(42));
    };

    source.pipe(mergeMap(project)).subscribe(
      x => {
        done(new Error('Subscriber next handler not supposed to be called.'));
      },
      err => {
        expect(err).to.equal(42);
        done();
      },
      () => {
        done(
          new Error('Subscriber complete handler not supposed to be called.')
        );
      }
    );
  });

  it('should map values to resolved promises and merge', done => {
    const source = from([4, 3, 2, 1]);
    const project = function (value: number, index: number) {
      return from(Promise.resolve(value + index));
    };

    const results: number[] = [];
    source.pipe(mergeMap(project)).subscribe(
      x => {
        results.push(x);
      },
      err => {
        done(new Error('Subscriber error handler not supposed to be called.'));
      },
      () => {
        expect(results).to.deep.equal([4, 4, 4, 4]);
        done();
      }
    );
  });

  it('should map values to rejected promises and merge', done => {
    const source = from([4, 3, 2, 1]);
    const project = function (value: number, index: number) {
      return from(Promise.reject<string>('' + value + '-' + index));
    };

    source.pipe(mergeMap(project)).subscribe(
      x => {
        done(new Error('Subscriber next handler not supposed to be called.'));
      },
      err => {
        expect(err).to.equal('4-0');
        done();
      },
      () => {
        done(
          new Error('Subscriber complete handler not supposed to be called.')
        );
      }
    );
  });

  it('should mergeMap many outer values to many inner values', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------|            ');
    const e1subs = '^                                !            ';
    const inner = cold('----i---j---k---l---|                        ', values);
    const innersubs = [
      ' ^                   !                        ',
      '         ^                   !                ',
      '                 ^                   !        ',
      '                         ^                   !'
    ];
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)k---l---|';

    const result = e1.pipe(mergeMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many outer to many inner, complete late', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-----------------------|');
    const e1subs = '^                                                !';
    const inner = cold(
      '----i---j---k---l---|                            ',
      values
    );
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)k---l-------|';

    const result = e1.pipe(mergeMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many outer to many inner, outer never completes', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------e---------------f------');
    const unsub = '                                                       !';
    const e1subs = '^                                                      !';
    const inner = cold(
      '----i---j---k---l---|                                  ',
      values
    );
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)(ki)(lj)k---l---i--';

    const source = e1.pipe(mergeMap(value => inner));

    expectSource(source, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------e---------------f------');
    const e1subs = '^                                                      !';
    const inner = cold(
      '----i---j---k---l---|                                  ',
      values
    );
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)(ki)(lj)k---l---i--';
    const unsub = '                                                       !';

    const source = e1.pipe(
      map(x => x),
      mergeMap(value => inner),
      map(x => x)
    );

    expectSource(source, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains with interop inners when result is unsubscribed explicitly', () => {
    const x = cold('--a--b--c--d--e--|           ');
    const xsubs = '         ^           !                ';
    const y = cold('---f---g---h---i--|');
    const ysubs = '                   ^ !                ';
    const e1 = hot('---------x---------y---------|        ');
    const e1subs = '^                    !                ';
    const expected = '-----------a--b--c--d-                ';
    const unsub = '                     !                ';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    // This test manipulates the observable to make it look like an interop
    // observable - an observable from a foreign library. Interop subscribers
    // are treated differently: they are wrapped in a safe subscriber. This
    // test ensures that unsubscriptions are chained all the way to the
    // interop subscriber.

    const result = e1.pipe(
      mergeMap(x => of(x)),
      mergeMap(value => asInteropSource(observableLookup[value])),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many outer to many inner, inner never completes', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------|         ');
    const e1subs = '^                                !         ';
    const inner = cold('----i---j---k---l-------------------------', values);
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)k---l-';

    const result = e1.pipe(mergeMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many outer to many inner, and inner throws', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------|');
    const e1subs = '^                        !        ';
    const inner = cold('----i---j---k---l-------#        ', values);
    const expected = '-----i---j---(ki)(lj)(ki)#        ';

    const result = e1.pipe(mergeMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many outer to many inner, and outer throws', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------#');
    const e1subs = '^                                !';
    const inner = cold('----i---j---k---l---|            ', values);
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)#';

    const result = e1.pipe(mergeMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many outer to many inner, both inner and outer throw', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------#');
    const e1subs = '^                    !            ';
    const inner = cold('----i---j---k---l---#            ', values);
    const expected = '-----i---j---(ki)(lj)#            ';

    const result = e1.pipe(mergeMap(value => inner));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap to many cold Observable, with parameter concurrency=1', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot(
      '-a-------b-------c---|                                        '
    );
    const e1subs =
      '^                    !                                        ';
    const inner = cold(
      '----i---j---k---l---|                                        ',
      values
    );
    const innersubs = [
      ' ^                   !                                        ',
      '                     ^                   !                    ',
      '                                         ^                   !'
    ];
    const expected =
      '-----i---j---k---l-------i---j---k---l-------i---j---k---l---|';

    function project() {
      return inner;
    }
    const result = e1.pipe(mergeMap(project, 1));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap to many cold Observable, with parameter concurrency=2', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c---|                    ');
    const e1subs = '^                    !                    ';
    const inner = cold('----i---j---k---l---|                    ', values);
    const innersubs = [
      ' ^                   !                    ',
      '         ^                   !            ',
      '                     ^                   !'
    ];
    const expected = '-----i---j---(ki)(lj)k---(li)j---k---l---|';

    function project() {
      return inner;
    }
    const result = e1.pipe(mergeMap(project, 2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap to many hot Observable, with parameter concurrency=1', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot(
      '-a-------b-------c---|                                        '
    );
    const e1subs =
      '^                    !                                        ';
    const hotA = hot(
      'x----i---j---k---l---|                                        ',
      values
    );
    const hotB = hot(
      '-x-x-xxxx-x-x-xxxxx-x----i---j---k---l---|                    ',
      values
    );
    const hotC = hot(
      'x-xxxx---x-x-x-x-x-xx--x--x-x--x--xxxx-x-----i---j---k---l---|',
      values
    );
    const asubs =
      ' ^                   !                                        ';
    const bsubs =
      '                     ^                   !                    ';
    const csubs =
      '                                         ^                   !';
    const expected =
      '-----i---j---k---l-------i---j---k---l-------i---j---k---l---|';
    const inners: Record<string, Observable<string>> = {
      a: hotA,
      b: hotB,
      c: hotC
    };

    function project(x: string) {
      return inners[x];
    }
    const result = e1.pipe(mergeMap(project, 1));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(hotA.subscriptions).toBe(asubs);
    expectSubscriptions(hotB.subscriptions).toBe(bsubs);
    expectSubscriptions(hotC.subscriptions).toBe(csubs);
  });

  it('should mergeMap to many hot Observable, with parameter concurrency=2', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c---|                    ');
    const e1subs = '^                    !                    ';
    const hotA = hot('x----i---j---k---l---|                    ', values);
    const hotB = hot('-x-x-xxxx----i---j---k---l---|            ', values);
    const hotC = hot('x-xxxx---x-x-x-x-x-xx----i---j---k---l---|', values);
    const asubs = ' ^                   !                    ';
    const bsubs = '         ^                   !            ';
    const csubs = '                     ^                   !';
    const expected = '-----i---j---(ki)(lj)k---(li)j---k---l---|';
    const inners: Record<string, Observable<string>> = {
      a: hotA,
      b: hotB,
      c: hotC
    };

    function project(x: string) {
      return inners[x];
    }
    const result = e1.pipe(mergeMap(project, 2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(hotA.subscriptions).toBe(asubs);
    expectSubscriptions(hotB.subscriptions).toBe(bsubs);
    expectSubscriptions(hotC.subscriptions).toBe(csubs);
  });

  it('should mergeMap to many cold Observable, with parameter concurrency=1', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot(
      '-a-------b-------c---|                                        '
    );
    const e1subs =
      '^                    !                                        ';
    const inner = cold(
      '----i---j---k---l---|                                        ',
      values
    );
    const innersubs = [
      ' ^                   !                                        ',
      '                     ^                   !                    ',
      '                                         ^                   !'
    ];
    const expected =
      '-----i---j---k---l-------i---j---k---l-------i---j---k---l---|';

    function project() {
      return inner;
    }
    const result = e1.pipe(mergeMap(project, 1));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap to many cold Observable, with parameter concurrency=2', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c---|                    ');
    const e1subs = '^                    !                    ';
    const inner = cold('----i---j---k---l---|                    ', values);
    const innersubs = [
      ' ^                   !                    ',
      '         ^                   !            ',
      '                     ^                   !'
    ];
    const expected = '-----i---j---(ki)(lj)k---(li)j---k---l---|';

    function project() {
      return inner;
    }
    const result = e1.pipe(mergeMap(project, 2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap to many hot Observable, with parameter concurrency=1', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot(
      '-a-------b-------c---|                                        '
    );
    const e1subs =
      '^                    !                                        ';
    const hotA = hot(
      'x----i---j---k---l---|                                        ',
      values
    );
    const hotB = hot(
      '-x-x-xxxx-x-x-xxxxx-x----i---j---k---l---|                    ',
      values
    );
    const hotC = hot(
      'x-xxxx---x-x-x-x-x-xx--x--x-x--x--xxxx-x-----i---j---k---l---|',
      values
    );
    const asubs =
      ' ^                   !                                        ';
    const bsubs =
      '                     ^                   !                    ';
    const csubs =
      '                                         ^                   !';
    const expected =
      '-----i---j---k---l-------i---j---k---l-------i---j---k---l---|';
    const inners: Record<string, Observable<string>> = {
      a: hotA,
      b: hotB,
      c: hotC
    };

    function project(x: string) {
      return inners[x];
    }
    const result = e1.pipe(mergeMap(project, 1));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(hotA.subscriptions).toBe(asubs);
    expectSubscriptions(hotB.subscriptions).toBe(bsubs);
    expectSubscriptions(hotC.subscriptions).toBe(csubs);
  });

  it('should mergeMap to many hot Observable, with parameter concurrency=2', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c---|                    ');
    const e1subs = '^                    !                    ';
    const hotA = hot('x----i---j---k---l---|                    ', values);
    const hotB = hot('-x-x-xxxx----i---j---k---l---|            ', values);
    const hotC = hot('x-xxxx---x-x-x-x-x-xx----i---j---k---l---|', values);
    const asubs = ' ^                   !                    ';
    const bsubs = '         ^                   !            ';
    const csubs = '                     ^                   !';
    const expected = '-----i---j---(ki)(lj)k---(li)j---k---l---|';
    const inners: Record<string, Observable<string>> = {
      a: hotA,
      b: hotB,
      c: hotC
    };

    function project(x: string) {
      return inners[x];
    }
    const result = e1.pipe(mergeMap(project, 2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(hotA.subscriptions).toBe(asubs);
    expectSubscriptions(hotB.subscriptions).toBe(bsubs);
    expectSubscriptions(hotC.subscriptions).toBe(csubs);
  });

  it('should mergeMap many complex, where all inners are finite', () => {
    const a = cold('-#');
    const b = cold('-#');
    const c = cold('-2--3--4--5------------------6-|');
    const d = cold('-----------2--3|');
    const e = cold('-1--------2--3-----4--5--------|');
    const f = cold('--|');
    const g = cold('---1-2|');
    const e1 = hot('-a-b--^-c-----d------e----------------f-----g|');
    const e1subs = '^                                      !';
    const expected = '---2--3--4--5---1--2--3--2--3--6--4--5---1-2--|';

    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(mergeMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many complex, all inners finite except one', () => {
    const a = cold('-#');
    const b = cold('-#');
    const c = cold('-2--3--4--5------------------6-|');
    const d = cold('-----------2--3-');
    const e = cold('-1--------2--3-----4--5--------|');
    const f = cold('--|');
    const g = cold('---1-2|');
    const e1 = hot('-a-b--^-c-----d------e----------------f-----g|');
    const e1subs = '^                                      !';
    const expected = '---2--3--4--5---1--2--3--2--3--6--4--5---1-2----';

    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(mergeMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many complex, inners finite, outer does not complete', () => {
    const a = cold('-#');
    const b = cold('-#');
    const c = cold('-2--3--4--5------------------6-|');
    const d = cold('-----------2--3|');
    const e = cold('-1--------2--3-----4--5--------|');
    const f = cold('--|');
    const g = cold('---1-2|');
    const e1 = hot('-a-b--^-c-----d------e----------------f-----g--------');
    const e1subs = '^                                               ';
    const expected = '---2--3--4--5---1--2--3--2--3--6--4--5---1-2----';

    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(mergeMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many complex, all inners finite, and outer throws', () => {
    const a = cold('-#');
    const b = cold('-#');
    const c = cold('-2--3--4--5------------------6-|');
    const d = cold('-----------2--3|');
    const e = cold('-1--------2--3-----4--5--------|');
    const f = cold('--|');
    const g = cold('---1-2|');
    const e1 = hot('-a-b--^-c-----d------e----------------f-----g#       ');
    const e1subs = '^                                      !       ';
    const expected = '---2--3--4--5---1--2--3--2--3--6--4--5-#       ';

    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(mergeMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many complex, all inners complete except one throws', () => {
    const a = cold('-#');
    const b = cold('-#');
    const c = cold('-2--3--4--5------------------6-#');
    const d = cold('-----------2--3|');
    const e = cold('-1--------2--3-----4--5--------|');
    const f = cold('--|');
    const g = cold('---1-2|');
    const e1 = hot('-a-b--^-c-----d------e----------------f-----g|');
    const e1subs = '^                                !             ';
    const expected = '---2--3--4--5---1--2--3--2--3--6-#             ';

    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };

    const result = e1.pipe(mergeMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many complex, all inners finite, outer is unsubscribed', () => {
    const a = cold('-#');
    const b = cold('-#');
    const c = cold('-2--3--4--5------------------6-|');
    const d = cold('-----------2--3|');
    const e = cold('-1--------2--3-----4--5--------|');
    const f = cold('--|');
    const g = cold('---1-2|');
    const e1 = hot('-a-b--^-c-----d------e----------------f-----g|');
    const unsub = '                              !                ';
    const e1subs = '^                             !                ';
    const expected = '---2--3--4--5---1--2--3--2--3--                ';

    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };
    const source = e1.pipe(mergeMap(value => observableLookup[value]));

    expectSource(source, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many complex, all inners finite, project throws', () => {
    const a = cold('-#');
    const b = cold('-#');
    const c = cold('-2--3--4--5------------------6-|');
    const d = cold('-----------2--3|');
    const e = cold('-1--------2--3-----4--5--------|');
    const f = cold('--|');
    const g = cold('---1-2|');
    const e1 = hot('-a-b--^-c-----d------e----------------f-----g|');
    const e1subs = '^              !                               ';
    const expected = '---2--3--4--5--#                               ';

    const observableLookup: Record<string, Observable<string>> = {
      a: a,
      b: b,
      c: c,
      d: d,
      e: e,
      f: f,
      g: g
    };
    let invoked = 0;
    const source = e1.pipe(
      mergeMap(value => {
        invoked++;
        if (invoked === 3) {
          throw 'error';
        }
        return observableLookup[value];
      })
    );

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  function arrayRepeat(value: any, times: number): any {
    const results = [];
    for (let i = 0; i < times; i++) {
      results.push(value);
    }
    return results;
  }

  it('should mergeMap many outer to an array for each value', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const e1subs = '^                               !';
    const expected = '(22)--(4444)---(333)----(22)----|';

    const source = e1.pipe(mergeMap(value => arrayRepeat(value, +value)));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many outer to inner arrays, and outer throws', () => {
    const e1 = hot('2-----4--------3--------2-------#');
    const e1subs = '^                               !';
    const expected = '(22)--(4444)---(333)----(22)----#';

    const source = e1.pipe(mergeMap(value => arrayRepeat(value, +value)));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many outer to inner arrays, outer gets unsubscribed', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const unsub = '             !                   ';
    const e1subs = '^            !                   ';
    const expected = '(22)--(4444)--                   ';

    const source = e1.pipe(mergeMap(value => arrayRepeat(value, +value)));

    expectSource(source, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap many outer to inner arrays, project throws', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const e1subs = '^              !                 ';
    const expected = '(22)--(4444)---#                 ';

    let invoked = 0;
    const source = e1.pipe(
      mergeMap(value => {
        invoked++;
        if (invoked === 3) {
          throw 'error';
        }
        return arrayRepeat(value, +value);
      })
    );

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should map and flatten', () => {
    const source = of(1, 2, 3, 4).pipe(mergeMap(x => of(x + '!')));

    const expected = ['1!', '2!', '3!', '4!'];
    let completed = false;

    source.subscribe(
      x => {
        expect(x).to.equal(expected.shift());
      },
      null,
      () => {
        expect(expected.length).to.equal(0);
        completed = true;
      }
    );

    expect(completed).to.be.true;
  });

  it('should map and flatten an Array', () => {
    const source = of(1, 2, 3, 4).pipe(mergeMap((x): any => [x + '!']));

    const expected = ['1!', '2!', '3!', '4!'];
    let completed = false;

    source.subscribe(
      x => {
        expect(x).to.equal(expected.shift());
      },
      null,
      () => {
        expect(expected.length).to.equal(0);
        completed = true;
      }
    );

    expect(completed).to.be.true;
  });

  it('should support nested merges', (done: MochaDone) => {
    // Added as a failing test when investigating:
    // https://github.com/ReactiveX/rxjs/issues/4071

    const results: (number | string)[] = [];

    of(1)
      .pipe(
        mergeMap(() =>
          defer(() => of(2, asapScheduler)).pipe(
            mergeMap(() => defer(() => of(3, asapScheduler)))
          )
        )
      )
      .subscribe({
        next(value: any) {
          results.push(value);
        },
        complete() {
          results.push('done');
        }
      });

    setTimeout(() => {
      expect(results).to.deep.equal([3, 'done']);
      done();
    }, 0);
  });

  it('should support nested merges with promises', (done: MochaDone) => {
    // Added as a failing test when investigating:
    // https://github.com/ReactiveX/rxjs/issues/4071

    const results: (number | string)[] = [];

    of(1)
      .pipe(
        mergeMap(() =>
          from(Promise.resolve(2)).pipe(mergeMap(() => Promise.resolve(3)))
        )
      )
      .subscribe({
        next(value) {
          results.push(value);
        },
        complete() {
          results.push('done');
        }
      });

    setTimeout(() => {
      expect(results).to.deep.equal([3, 'done']);
      done();
    }, 0);
  });

  it('should support wrapped sources', (done: MochaDone) => {
    // Added as a failing test when investigating:
    // https://github.com/ReactiveX/rxjs/issues/4095

    const results: (number | string)[] = [];

    const wrapped = new Observable<number>(subscriber => {
      const subscription = timer(0, asapScheduler).subscribe(subscriber);
      return () => subscription.unsubscribe();
    });
    wrapped.pipe(mergeMap(() => timer(0, asapScheduler))).subscribe({
      next(value) {
        results.push(value);
      },
      complete() {
        results.push('done');
      }
    });

    setTimeout(() => {
      expect(results).to.deep.equal([0, 'done']);
      done();
    }, 0);
  });

  type('should support type signatures', () => {
    let o: Observable<number>;

    /* tslint:disable:no-unused-variable */
    let a1: Observable<string> = o!.pipe(mergeMap(x => x.toString()));
    let a2: Observable<string> = o!.pipe(mergeMap(x => x.toString(), 3));
    let a3: Observable<{o: number; i: string}> = o!.pipe(
      mergeMap(
        x => x.toString(),
        (o, i) => ({o, i})
      )
    );
    let a4: Observable<{o: number; i: string}> = o!.pipe(
      mergeMap(
        x => x.toString(),
        (o, i) => ({o, i}),
        3
      )
    );
    /* tslint:enable:no-unused-variable */
  });
});
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {mergeMapTo, map} from 'rxjs/operators';
import {from, of, Observable} from 'rxjs';

declare const type: Function;
declare const asDiagram: Function;

/** @test {mergeMapTo} */
describe('mergeMapTo', () => {
  asDiagram('mergeMapTo( 10\u2014\u201410\u2014\u201410\u2014| )')(
    'should map-and-flatten each item to an Observable',
    () => {
      const e1 = hot('--1-----3--5-------|');
      const e1subs = '^                  !';
      const e2 = cold('x-x-x|              ', {x: 10});
      const expected = '--x-x-x-x-xxxx-x---|';
      const values = {x: 10};

      const result = e1.pipe(mergeMapTo(e2));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should support the deprecated resultSelector', () => {
    const results: Array<number[]> = [];

    of(1, 2, 3)
      .pipe(mergeMapTo(of(4, 5, 6), (a, b, i, ii) => [a, b, i, ii]))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([
            [1, 4, 0, 0],
            [1, 5, 0, 1],
            [1, 6, 0, 2],
            [2, 4, 1, 0],
            [2, 5, 1, 1],
            [2, 6, 1, 2],
            [3, 4, 2, 0],
            [3, 5, 2, 1],
            [3, 6, 2, 2]
          ]);
        }
      });
  });

  it('should support a void resultSelector (still deprecated)', () => {
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(mergeMapTo(of(4, 5, 6), void 0))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([4, 5, 6, 4, 5, 6, 4, 5, 6]);
        }
      });
  });

  it('should mergeMapTo many regular interval inners', () => {
    const x = cold('----1---2---3---(4|)                        ');
    const xsubs = [
      '^               !                           ',
      //                  ----1---2---3---(4|)
      '    ^               !                         ',
      //                              ----1---2---3---(4|)
      '                ^               !             ',
      //                                      ----1---2---3---(4|)
      '                        ^               !     '
    ];
    const e1 = hot('a---b-----------c-------d-------|           ');
    const e1subs = '^                               !           ';
    const expected = '----1---(21)(32)(43)(41)2---(31)(42)3---(4|)';

    const source = e1.pipe(mergeMapTo(x));

    expectSource(source).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should map values to constant resolved promises and merge', done => {
    const source = from([4, 3, 2, 1]);

    const results: number[] = [];
    source.pipe(mergeMapTo(from(Promise.resolve(42)))).subscribe(
      x => {
        results.push(x);
      },
      err => {
        done(new Error('Subscriber error handler not supposed to be called.'));
      },
      () => {
        expect(results).to.deep.equal([42, 42, 42, 42]);
        done();
      }
    );
  });

  it('should map values to constant rejected promises and merge', done => {
    const source = from([4, 3, 2, 1]);

    source.pipe(mergeMapTo(from(Promise.reject(42)))).subscribe(
      x => {
        done(new Error('Subscriber next handler not supposed to be called.'));
      },
      err => {
        expect(err).to.equal(42);
        done();
      },
      () => {
        done(
          new Error('Subscriber complete handler not supposed to be called.')
        );
      }
    );
  });

  it('should mergeMapTo many outer values to many inner values', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------|            ');
    const e1subs = '^                                !            ';
    const inner = cold('----i---j---k---l---|                        ', values);
    const innersubs = [
      ' ^                   !                        ',
      '         ^                   !                ',
      '                 ^                   !        ',
      '                         ^                   !'
    ];
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)k---l---|';

    expectSource(e1.pipe(mergeMapTo(inner))).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many outer to many inner, complete late', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-----------------------|');
    const e1subs = '^                                                !';
    const inner = cold('----i---j---k---l---|', values);
    const innersubs = [
      ' ^                   !                            ',
      '         ^                   !                    ',
      '                 ^                   !            ',
      '                         ^                   !    '
    ];
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)k---l-------|';

    expectSource(e1.pipe(mergeMapTo(inner))).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many outer to many inner, outer never completes', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------e---------------f------');
    const e1subs = '^                                                      !';
    const inner = cold('----i---j---k---l---|', values);
    const innersubs = [
      ' ^                   !                                  ',
      '         ^                   !                          ',
      '                 ^                   !                  ',
      '                         ^                   !          ',
      '                                 ^                   !  ',
      '                                                 ^     !'
    ];
    const unsub = '                                                       !';
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)(ki)(lj)k---l---i-';

    const source = e1.pipe(mergeMapTo(inner));
    expectSource(source, unsub).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------e---------------f------');
    const e1subs = '^                                                      !';
    const inner = cold('----i---j---k---l---|', values);
    const innersubs = [
      ' ^                   !                                  ',
      '         ^                   !                          ',
      '                 ^                   !                  ',
      '                         ^                   !          ',
      '                                 ^                   !  ',
      '                                                 ^     !'
    ];
    const unsub = '                                                       !';
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)(ki)(lj)k---l---i-';

    const source = e1.pipe(
      map(x => x),
      mergeMapTo(inner),
      map(x => x)
    );

    expectSource(source, unsub).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many outer to many inner, inner never completes', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------|         ');
    const e1subs = '^                                !         ';
    const inner = cold('----i---j---k---l-', values);
    const innersubs = [
      ' ^                                         ',
      '         ^                                 ',
      '                 ^                         ',
      '                         ^                 '
    ];
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)(lj)k---l-';

    expectSource(e1.pipe(mergeMapTo(inner))).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many outer to many inner, and inner throws', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------|');
    const e1subs = '^                        !        ';
    const inner = cold('----i---j---k---l-------#        ', values);
    const innersubs = [
      ' ^                       !        ',
      '         ^               !        ',
      '                 ^       !        ',
      '                         (^!)     '
    ];
    const expected = '-----i---j---(ki)(lj)(ki)#';

    expectSource(e1.pipe(mergeMapTo(inner))).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many outer to many inner, and outer throws', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------#');
    const e1subs = '^                                !';
    const inner = cold('----i---j---k---l---|            ', values);
    const innersubs = [
      ' ^                   !            ',
      '         ^                   !    ',
      '                 ^               !',
      '                         ^       !'
    ];
    const expected = '-----i---j---(ki)(lj)(ki)(lj)(ki)#';

    expectSource(e1.pipe(mergeMapTo(inner))).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many outer to many inner, both inner and outer throw', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c-------d-------#');
    const e1subs = '^                    !';
    const inner = cold('----i---j---k---l---#', values);
    const innersubs = [
      ' ^                   !',
      '         ^           !',
      '                 ^   !'
    ];
    const expected = '-----i---j---(ki)(lj)#';

    expectSource(e1.pipe(mergeMapTo(inner))).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many cold Observable, with parameter concurrency=1, without resultSelector', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot(
      '-a-------b-------c---|                                        '
    );
    const e1subs =
      '^                    !                                        ';
    const inner = cold(
      '----i---j---k---l---|                                        ',
      values
    );
    const innersubs = [
      ' ^                   !                                        ',
      '                     ^                   !                    ',
      '                                         ^                   !'
    ];
    const expected =
      '-----i---j---k---l-------i---j---k---l-------i---j---k---l---|';

    const result = e1.pipe(mergeMapTo(inner, 1));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMap to many cold Observable, with parameter concurrency=2, without resultSelector', () => {
    const values = {i: 'foo', j: 'bar', k: 'baz', l: 'qux'};
    const e1 = hot('-a-------b-------c---|                    ');
    const e1subs = '^                    !                    ';
    const inner = cold('----i---j---k---l---|                    ', values);
    const innersubs = [
      ' ^                   !                    ',
      '         ^                   !            ',
      '                     ^                   !'
    ];
    const expected = '-----i---j---(ki)(lj)k---(li)j---k---l---|';

    const result = e1.pipe(mergeMapTo(inner, 2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many outer to arrays', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const e1subs = '^                               !';
    const expected = '(0123)(0123)---(0123)---(0123)--|';

    const source = e1.pipe(mergeMapTo(['0', '1', '2', '3']));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many outer to inner arrays, and outer throws', () => {
    const e1 = hot('2-----4--------3--------2-------#');
    const e1subs = '^                               !';
    const expected = '(0123)(0123)---(0123)---(0123)--#';

    const source = e1.pipe(mergeMapTo(['0', '1', '2', '3']));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeMapTo many outer to inner arrays, outer gets unsubscribed', () => {
    const e1 = hot('2-----4--------3--------2-------|');
    const e1subs = '^            !';
    const unsub = '             !';
    const expected = '(0123)(0123)--';

    const source = e1.pipe(mergeMapTo(['0', '1', '2', '3']));

    expectSource(source, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should map and flatten', () => {
    const source = of(1, 2, 3, 4).pipe(mergeMapTo(of('!')));

    const expected = ['!', '!', '!', '!'];
    let completed = false;

    source.subscribe(
      x => {
        expect(x).to.equal(expected.shift());
      },
      null,
      () => {
        expect(expected.length).to.equal(0);
        completed = true;
      }
    );

    expect(completed).to.be.true;
  });

  it('should map and flatten an Array', () => {
    const source = of(1, 2, 3, 4).pipe(mergeMapTo(['!']));

    const expected = ['!', '!', '!', '!'];
    let completed = false;

    source.subscribe(
      x => {
        expect(x).to.equal(expected.shift());
      },
      null,
      () => {
        expect(expected.length).to.equal(0);
        completed = true;
      }
    );

    expect(completed).to.be.true;
  });

  type('should support type signatures', () => {
    let o: Observable<number>;
    let m: Observable<string>;

    /* tslint:disable:no-unused-variable */
    let a1: Observable<string> = o!.pipe(mergeMapTo(m!));
    let a2: Observable<string> = o!.pipe(mergeMapTo(m!, 3));
    /* tslint:enable:no-unused-variable */
  });
});
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {TestScheduler} from 'rxjs/testing';
import {of, defer, EMPTY, NEVER, concat, throwError} from 'rxjs';
import {mergeScan, delay, mergeMap, takeWhile, startWith} from 'rxjs/operators';
import {expect} from 'chai';

declare const rxTestScheduler: TestScheduler;
/** @test {mergeScan} */
describe('mergeScan', () => {
  it('should mergeScan things', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '---u--v--w--x--y--z--|';

    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(
      mergeScan((acc, x) => of(acc.concat(x)), [] as string[])
    );

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle errors', () => {
    const e1 = hot('--a--^--b--c--d--#');
    const e1subs = '^           !';
    const expected = '---u--v--w--#';

    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd']
    };

    const source = e1.pipe(
      mergeScan((acc, x) => of(acc.concat(x)), [] as string[])
    );

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeScan values and be able to asynchronously project them', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '-----u--v--w--x--y--z|';

    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(
      mergeScan(
        (acc, x) => of(acc.concat(x)).pipe(delay(20, rxTestScheduler)),
        [] as string[]
      )
    );

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not stop ongoing async projections when source completes', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '--------u--v--w--x--y--(z|)';

    const values = {
      u: ['b'],
      v: ['c'],
      w: ['b', 'd'],
      x: ['c', 'e'],
      y: ['b', 'd', 'f'],
      z: ['c', 'e', 'g']
    };

    const source = e1.pipe(
      mergeScan(
        (acc, x) => of(acc.concat(x)).pipe(delay(50, rxTestScheduler)),
        [] as string[]
      )
    );

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should interrupt ongoing async projections when result is unsubscribed early', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^               !     ';
    const expected = '--------u--v--w--     ';

    const values = {
      u: ['b'],
      v: ['c'],
      w: ['b', 'd'],
      x: ['c', 'e'],
      y: ['b', 'd', 'f'],
      z: ['c', 'e', 'g']
    };

    const source = e1.pipe(
      mergeScan(
        (acc, x) => of(acc.concat(x)).pipe(delay(50, rxTestScheduler)),
        [] as string[]
      )
    );

    expectSource(source, e1subs).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^               !     ';
    const expected = '--------u--v--w--     ';
    const unsub = '                !     ';

    const values = {
      u: ['b'],
      v: ['c'],
      w: ['b', 'd'],
      x: ['c', 'e'],
      y: ['b', 'd', 'f'],
      z: ['c', 'e', 'g']
    };

    const source = e1.pipe(
      mergeMap(x => of(x)),
      mergeScan(
        (acc, x) => of([...acc, x]).pipe(delay(50, rxTestScheduler)),
        [] as string[]
      ),
      mergeMap(function (x) {
        return of(x);
      })
    );

    expectSource(source, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
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

    of(null)
      .pipe(
        mergeScan(() => synchronousObservable, 0),
        takeWhile(x => x != 2) // unsubscribe at the second side-effect
      )
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).to.deep.equal([1, 2]);
  });

  it('should handle errors in the projection function', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^        !';
    const expected = '---u--v--#';

    const values = {
      u: ['b'],
      v: ['b', 'c']
    };

    const source = e1.pipe(
      mergeScan((acc, x) => {
        if (x === 'd') {
          throw new Error('bad!');
        }
        return of(acc.concat(x));
      }, [] as string[])
    );

    expectSource(source).toBe(expected, values, new Error('bad!'));
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should propagate errors from the projected Observable', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^  !';
    const expected = '---#';

    const source = e1.pipe(
      mergeScan((acc, x) => throwError(new Error('bad!')), [])
    );

    expectSource(source).toBe(expected, undefined, new Error('bad!'));
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an empty projected Observable', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '---------------------(x|)';

    const values = {x: <string[]>[]};

    const source = e1.pipe(mergeScan((acc, x) => EMPTY, []));

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a never projected Observable', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '----------------------';

    const values = {x: <string[]>[]};

    const source = e1.pipe(mergeScan((acc, x) => NEVER, []));

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(u|)';

    const values = {
      u: <string[]>[]
    };

    const source = e1.pipe(
      mergeScan((acc, x) => of(acc.concat(x)), [] as string[])
    );

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const source = e1.pipe(
      mergeScan((acc, x) => of(acc.concat(x)), [] as string[])
    );

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    const source = e1.pipe(
      mergeScan((acc, x) => of(acc.concat(x)), [] as string[])
    );

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergeScan unsubscription', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const expected = '---u--v--w--x--';
    const sub = '^             !';
    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(
      mergeScan((acc, x) => of(acc.concat(x)), [] as string[])
    );

    expectSource(source, sub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(sub);
  });

  it('should mergescan projects cold Observable with single concurrency', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';

    const inner = [
      cold('--d--e--f--|                      '),
      cold('--g--h--i--|           '),
      cold('--j--k--l--|')
    ];

    const xsubs = '  ^          !';
    const ysubs = '             ^          !';
    const zsubs = '                        ^          !';

    const expected = '--x-d--e--f--f-g--h--i--i-j--k--l--|';

    let index = 0;
    const source = e1.pipe(
      mergeScan(
        (acc, x) => {
          const value = inner[index++];
          return value.pipe(startWith(acc));
        },
        'x',
        1
      )
    );

    expectSource(source).toBe(expected);

    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner[0].subscriptions).toBe(xsubs);
    expectSubscriptions(inner[1].subscriptions).toBe(ysubs);
    expectSubscriptions(inner[2].subscriptions).toBe(zsubs);
  });

  it('should emit accumulator if inner completes without value', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '---------------------(x|)';

    const source = e1.pipe(mergeScan((acc, x) => EMPTY, ['1']));

    expectSource(source).toBe(expected, {x: ['1']});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should emit accumulator if inner completes without value after source completes', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '---------------------(x|)';

    const source = e1.pipe(
      mergeScan((acc, x) => EMPTY.pipe(delay(50, rxTestScheduler)), ['1'])
    );

    expectSource(source).toBe(expected, {x: ['1']});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should mergescan projects hot Observable with single concurrency', () => {
    const e1 = hot('---a---b---c---|');
    const e1subs = '^              !';

    const inner = [
      hot('--d--e--f--|'),
      hot('----g----h----i----|'),
      hot('------j------k-------l------|')
    ];

    const xsubs = '   ^       !';
    const ysubs = '           ^       !';
    const zsubs = '                   ^        !';

    const expected = '---x-e--f--f--i----i-l------|';

    let index = 0;
    const source = e1.pipe(
      mergeScan(
        (acc, x) => {
          const value = inner[index++];
          return value.pipe(startWith(acc));
        },
        'x',
        1
      )
    );

    expectSource(source).toBe(expected);

    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner[0].subscriptions).toBe(xsubs);
    expectSubscriptions(inner[1].subscriptions).toBe(ysubs);
    expectSubscriptions(inner[2].subscriptions).toBe(zsubs);
  });

  it('should mergescan projects cold Observable with dual concurrency', () => {
    const e1 = hot('----a----b----c----|');
    const e1subs = '^                  !';

    const inner = [
      cold('---d---e---f---|               '),
      cold('---g---h---i---|          '),
      cold('---j---k---l---|')
    ];

    const xsubs = '    ^              !';
    const ysubs = '         ^              !';
    const zsubs = '                   ^              !';

    const expected = '----x--d-d-eg--fh--hi-j---k---l---|';

    let index = 0;
    const source = e1.pipe(
      mergeScan(
        (acc, x) => {
          const value = inner[index++];
          return value.pipe(startWith(acc));
        },
        'x',
        2
      )
    );

    expectSource(source).toBe(expected);

    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner[0].subscriptions).toBe(xsubs);
    expectSubscriptions(inner[1].subscriptions).toBe(ysubs);
    expectSubscriptions(inner[2].subscriptions).toBe(zsubs);
  });

  it('should mergescan projects hot Observable with dual concurrency', () => {
    const e1 = hot('---a---b---c---|');
    const e1subs = '^              !';

    const inner = [
      hot('--d--e--f--|'),
      hot('----g----h----i----|'),
      hot('------j------k-------l------|')
    ];

    const xsubs = '   ^       !';
    const ysubs = '       ^           !';
    const zsubs = '           ^                !';

    const expected = '---x-e-efh-h-ki------l------|';

    let index = 0;
    const source = e1.pipe(
      mergeScan(
        (acc, x) => {
          const value = inner[index++];
          return value.pipe(startWith(acc));
        },
        'x',
        2
      )
    );

    expectSource(source).toBe(expected);

    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(inner[0].subscriptions).toBe(xsubs);
    expectSubscriptions(inner[1].subscriptions).toBe(ysubs);
    expectSubscriptions(inner[2].subscriptions).toBe(zsubs);
  });

  it('should pass current index to accumulator', () => {
    const recorded: number[] = [];
    const e1 = of('a', 'b', 'c', 'd');

    e1.pipe(
      mergeScan((acc, x, index) => {
        recorded.push(index);
        return of(index);
      }, 0)
    ).subscribe();

    expect(recorded).to.deep.equal([0, 1, 2, 3]);
  });
});
import {expect} from 'chai';
import {mergeWith, map, mergeAll} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {queueScheduler, of} from 'rxjs';
import {sourceMatcher} from '../helpers/sourceMatcher';

/** @test {merge} */
describe('merge operator', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(sourceMatcher);
  });

  it('should handle merging two hot observables', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a-----b-----c----|');
      const e1subs = '  ^------------------!';
      const e2 = hot('-----d-----e-----f---|');
      const e2subs = '  ^--------------------!';
      const expected = '--a--d--b--e--c--f---|';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge a source with a second', done => {
    const a = of(1, 2, 3);
    const b = of(4, 5, 6, 7, 8);
    const r = [1, 2, 3, 4, 5, 6, 7, 8];

    a.pipe(mergeWith(b)).subscribe(
      val => {
        expect(val).to.equal(r.shift());
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should merge cold and cold', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' ---a-----b-----c----|');
      const e1subs = '  ^-------------------!';
      const e2 = cold(' ------x-----y-----z----|');
      const e2subs = '  ^----------------------!';
      const expected = '---a--x--b--y--c--z----|';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge hot and hot', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('---a---^-b-----c----|');
      const e1subs = '       ^------------!';
      const e2 = hot('-----x-^----y-----z----|');
      const e2subs = '       ^---------------!';
      const expected = '     --b--y--c--z----|';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge hot and cold', () => {
    rxTestScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('---a-^---b-----c----|');
      const e1subs = '     ^--------------!';
      const e2 = cold('    --x-----y-----z----|');
      const e2subs = '     ^------------------!';
      const expected = '   --x-b---y-c---z----|';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge parallel emissions', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a----b----c----|');
      const e1subs = '  ^-----------------!';
      const e2 = hot('  ---x----y----z----|');
      const e2subs = '  ^-----------------!';
      const expected = '---(ax)-(by)-(cz)-|';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should allow unsubscribing explicitly and early', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a-----b-----c----|  ');
      const e1subs = '  ^---------!           ';
      const e2 = hot('  -----d-----e-----f---|');
      const e2subs = '  ^---------!           ';
      const expected = '--a--d--b--           ';
      const unsub = '   ----------!           ';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a-----b-----c----|  ');
      const e1subs = '  ^---------!           ';
      const e2 = hot('  -----d-----e-----f---|');
      const e2subs = '  ^---------!           ';
      const expected = '--a--d--b--           ';
      const unsub = '   ----------!           ';

      const result = e1.pipe(
        map(x => x),
        mergeWith(e2),
        map(x => x)
      );

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge empty and empty', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('|   ');
      const e1subs = ' (^!)';
      const e2 = cold('|   ');
      const e2subs = ' (^!)';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe('|');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge three empties', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('|');
      const e1subs = ' (^!)';
      const e2 = cold('|');
      const e2subs = ' (^!)';
      const e3 = cold('|');
      const e3subs = ' (^!)';

      const result = e1.pipe(mergeWith(e2, e3));

      expectSource(result).toBe('|');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    });
  });

  it('should merge never and empty', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('-');
      const e1subs = ' ^';
      const e2 = cold('|');
      const e2subs = ' (^!)';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe('-');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge never and never', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('-');
      const e1subs = ' ^';
      const e2 = cold('-');
      const e2subs = ' ^';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe('-');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge empty and throw', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('|');
      const e1subs = ' (^!)';
      const e2 = cold('#');
      const e2subs = ' (^!)';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe('#');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge hot and throw', () => {
    rxTestScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot(' --a--b--c--|');
      const e1subs = '(^!)';
      const e2 = cold('#');
      const e2subs = '(^!)';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe('#');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge never and throw', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold('-');
      const e1subs = ' (^!)';
      const e2 = cold('#');
      const e2subs = ' (^!)';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe('#');
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge empty and eventual error', () => {
    rxTestScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)    ';
      const e2 = hot('  -------#');
      const e2subs = '  ^------!';
      const expected = '-------#';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge hot and error', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--c--|');
      const e1subs = '  ^------!    ';
      const e2 = hot('  -------#    ');
      const e2subs = '  ^------!    ';
      const expected = '--a--b-#    ';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should merge never and error', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --------');
      const e1subs = '  ^------!';
      const e2 = hot('  -------#');
      const e2subs = '  ^------!';
      const expected = '-------#';

      const result = e1.pipe(mergeWith(e2));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });
});

describe('mergeAll operator', () => {
  it('should merge two observables', done => {
    const a = of(1, 2, 3);
    const b = of(4, 5, 6, 7, 8);
    const r = [1, 2, 3, 4, 5, 6, 7, 8];

    of(a, b)
      .pipe(mergeAll())
      .subscribe(
        val => {
          expect(val).to.equal(r.shift());
        },
        null,
        done
      );
  });

  it('should merge two immediately-scheduled observables', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [1, 2, 4, 3, 5, 6, 7, 8];

    of(a, b, queueScheduler)
      .pipe(mergeAll())
      .subscribe(
        val => {
          expect(val).to.equal(r.shift());
        },
        null,
        done
      );
  });
});
import {expect} from 'chai';
import {min, skip, take, mergeMap} from 'rxjs/operators';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {range, of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {min} */
describe('min operator', () => {
  asDiagram('min')('should min the values of an observable', () => {
    const source = hot('--a--b--c--|', {a: 42, b: -1, c: 3});
    const subs = '^          !';
    const expected = '-----------(x|)';

    expectSource((<any>source).pipe(min())).toBe(expected, {x: -1});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should be never when source is never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource((<any>e1).pipe(min())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should be zero when source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource((<any>e1).pipe(min())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it("should be never when source doesn't complete", () => {
    const e1 = hot('--x--^--y--');
    const e1subs = '^     ';
    const expected = '------';

    expectSource((<any>e1).pipe(min())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it("should be completes when source doesn't have values", () => {
    const e1 = hot('-x-^---|');
    const e1subs = '^   !';
    const expected = '----|';

    expectSource((<any>e1).pipe(min())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should min the unique value of an observable', () => {
    const e1 = hot('-x-^--y--|', {y: 42});
    const e1subs = '^     !';
    const expected = '------(w|)';

    expectSource((<any>e1).pipe(min())).toBe(expected, {w: 42});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should min the values of an ongoing hot observable', () => {
    const e1 = hot('--a-^-b--c--d--|', {a: 42, b: -1, c: 0, d: 666});
    const subs = '^          !';
    const expected = '-----------(x|)';

    expectSource((<any>e1).pipe(min())).toBe(expected, {x: -1});
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should min a range() source observable', (done: MochaDone) => {
    (<any>range(1, 10000)).pipe(min()).subscribe(
      (value: number) => {
        expect(value).to.equal(1);
      },
      (x: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should min a range().skip(1) source observable', (done: MochaDone) => {
    (<any>range(1, 10)).pipe(skip(1), min()).subscribe(
      (value: number) => {
        expect(value).to.equal(2);
      },
      (x: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should min a range().take(1) source observable', (done: MochaDone) => {
    (<any>range(1, 10)).pipe(take(1), min()).subscribe(
      (value: number) => {
        expect(value).to.equal(1);
      },
      (x: any) => {
        done(new Error('should not be called'));
      },
      () => {
        done();
      }
    );
  });

  it('should work with error', () => {
    const e1 = hot('-x-^--y--z--#', {x: 1, y: 2, z: 3}, 'too bad');
    const e1subs = '^        !';
    const expected = '---------#';

    expectSource((<any>e1).pipe(min())).toBe(expected, null, 'too bad');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource((<any>e1).pipe(min())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a constant predicate on an empty hot observable', () => {
    const e1 = hot('-x-^---|');
    const e1subs = '^   !';
    const expected = '----|';

    const predicate = function <T>(x: T, y: T) {
      return 42;
    };

    expectSource((<any>e1).pipe(min(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a constant predicate on an never hot observable', () => {
    const e1 = hot('-x-^----');
    const e1subs = '^    ';
    const expected = '-----';

    const predicate = function <T>(x: T, y: T) {
      return 42;
    };

    expectSource((<any>e1).pipe(min(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a constant predicate on a simple hot observable', () => {
    const e1 = hot('-x-^-a-|', {a: 1});
    const e1subs = '^   !';
    const expected = '----(w|)';

    const predicate = () => {
      return 42;
    };

    expectSource((<any>e1).pipe(min(predicate))).toBe(expected, {w: 1});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('-x-^-a-b-c-d-e-f-g-|');
    const unsub = '       !         ';
    const e1subs = '^      !         ';
    const expected = '--------         ';

    const predicate = () => {
      return 42;
    };

    expectSource((<any>e1).pipe(min(predicate)), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('-x-^-a-b-c-d-e-f-g-|');
    const e1subs = '^      !         ';
    const expected = '--------         ';
    const unsub = '       !         ';

    const predicate = function () {
      return 42;
    };

    const result = (<any>e1).pipe(
      mergeMap((x: string) => of(x)),
      min(predicate),
      mergeMap((x: number) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a reverse predicate on observable with many values', () => {
    const e1 = hot('-a-^-b--c--d-|', {a: 42, b: -1, c: 0, d: 666});
    const e1subs = '^         !';
    const expected = '----------(w|)';

    const predicate = function <T>(x: T, y: T) {
      return x > y ? -1 : 1;
    };

    expectSource((<any>e1).pipe(min(predicate))).toBe(expected, {w: 666});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a predicate for string on observable with many values', () => {
    const e1 = hot('-a-^-b--c--d-|');
    const e1subs = '^         !';
    const expected = '----------(w|)';

    const predicate = function <T>(x: T, y: T) {
      return x > y ? -1 : 1;
    };

    expectSource((<any>e1).pipe(min(predicate))).toBe(expected, {w: 'd'});
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a constant predicate on observable that throws', () => {
    const e1 = hot('-1-^---#');
    const e1subs = '^   !';
    const expected = '----#';

    const predicate = () => {
      return 42;
    };

    expectSource((<any>e1).pipe(min(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a predicate that throws, on observable with many values', () => {
    const e1 = hot('-1-^-2--3--|');
    const e1subs = '^    !   ';
    const expected = '-----#   ';

    const predicate = function (x: string, y: string) {
      if (y === '3') {
        throw 'error';
      }
      return x > y ? -1 : 1;
    };

    expectSource((<any>e1).pipe(min(predicate))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {expect} from 'chai';
import {
  multicast,
  tap,
  mergeMapTo,
  takeLast,
  mergeMap,
  retry,
  repeat,
  switchMap,
  map
} from 'rxjs/operators';
import {
  Subject,
  Replay,
  of,
  Connect,
  concat,
  Subscription,
  Observable,
  from
} from 'rxjs';
import {TestScheduler} from 'rxjs/testing';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions,
  time
} from '../helpers/marble-testing';

declare const type: Function;
declare const asDiagram: Function;

declare const rxTestScheduler: TestScheduler;

/** @test {multicast} */
describe('multicast operator', () => {
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

    type('should infer the type for the pipeable operator', () => {
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
import {observeOn, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {expect} from 'chai';
import {
  hot,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {of, Observable, asapScheduler} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {observeOn} */
describe('observeOn operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {onErrorResumeNext, takeWhile} from 'rxjs/operators';
import {concat, defer, throwError, of} from 'rxjs';
import {asInteropSource} from '../helpers/interop-helper';

declare function asDiagram(arg: string): Function;

describe('onErrorResumeNext operator', () => {
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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {pairwise, take} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {expect} from 'chai';

declare function asDiagram(arg: string): Function;

/** @test {pairwise} */
describe('pairwise operator', () => {
  asDiagram('pairwise')(
    'should group consecutive emissions as arrays of two',
    () => {
      const e1 = hot('--a--b-c----d--e---|');
      const expected = '-----u-v----w--x---|';

      const values = {
        u: ['a', 'b'],
        v: ['b', 'c'],
        w: ['c', 'd'],
        x: ['d', 'e']
      };

      const source = (<any>e1).pipe(pairwise());

      expectSource(source).toBe(expected, values);
    }
  );

  it('should pairwise things', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '------v--w--x--y--z--|';

    const values = {
      v: ['b', 'c'],
      w: ['c', 'd'],
      x: ['d', 'e'],
      y: ['e', 'f'],
      z: ['f', 'g']
    };

    const source = (<any>e1).pipe(pairwise());

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not emit on single-element streams', () => {
    const e1 = hot('-----^--b----|');
    const e1subs = '^       !';
    const expected = '--------|';

    const values = {};

    const source = (<any>e1).pipe(pairwise());

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle mid-stream throw', () => {
    const e1 = hot('--a--^--b--c--d--e--#');
    const e1subs = '^              !';
    const expected = '------v--w--x--#';

    const values = {
      v: ['b', 'c'],
      w: ['c', 'd'],
      x: ['d', 'e']
    };

    const source = (<any>e1).pipe(pairwise());

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    const source = (<any>e1).pipe(pairwise());

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const source = (<any>e1).pipe(pairwise());

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    const source = (<any>e1).pipe(pairwise());

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should be recursively re-enterable', () => {
    const results = new Array<[string, string]>();

    const subject = new Subject<string>();

    subject.pipe(pairwise(), take(3)).subscribe(pair => {
      results.push(pair);
      subject.next('c');
    });

    subject.next('a');
    subject.next('b');

    expect(results).to.deep.equal([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'c']
    ]);
  });
});
import {expect} from 'chai';
import {
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {pluck, map, tap, mergeMap} from 'rxjs/operators';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {pluck} */
describe('pluck operator', () => {
  asDiagram("pluck('v')")('should dematerialize an Observable', () => {
    const values = {
      a: '{v:1}',
      b: '{v:2}',
      c: '{v:3}'
    };

    const e1 = cold('--a--b--c--|', values);
    const expected = '--x--y--z--|';

    const result = e1.pipe(
      map((x: string) => ({v: x.charAt(3)})),
      pluck('v')
    );

    expectSource(result).toBe(expected, {x: '1', y: '2', z: '3'});
  });

  it('should work for one array', () => {
    const a = cold('--x--|', {x: ['abc']});
    const asubs = '^    !';
    const expected = '--y--|';

    const r = a.pipe(pluck(0));
    expectSource(r).toBe(expected, {y: 'abc'});
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should work for one object', () => {
    const a = cold('--x--|', {x: {prop: 42}});
    const asubs = '^    !';
    const expected = '--y--|';

    const r = a.pipe(pluck('prop'));
    expectSource(r).toBe(expected, {y: 42});
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should work for multiple objects', () => {
    const inputs = {
      a: {prop: '1'},
      b: {prop: '2'},
      c: {prop: '3'},
      d: {prop: '4'},
      e: {prop: '5'}
    };
    const a = cold('--a-b--c-d---e-|', inputs);
    const asubs = '^              !';
    const expected = '--1-2--3-4---5-|';

    const r = a.pipe(pluck('prop'));
    expectSource(r).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should work with deep nested properties', () => {
    const inputs = {
      a: {a: {b: {c: '1'}}},
      b: {a: {b: {c: '2'}}},
      c: {a: {b: {c: '3'}}},
      d: {a: {b: {c: '4'}}},
      e: {a: {b: {c: '5'}}}
    };
    const a = cold('--a-b--c-d---e-|', inputs);
    const asubs = '^              !';
    const expected = '--1-2--3-4---5-|';

    const r = a.pipe(pluck('a', 'b', 'c'));
    expectSource(r).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should work with edge cases of deep nested properties', () => {
    const inputs = {
      a: {a: {b: {c: 1}}},
      b: {a: {b: 2}},
      c: {a: {c: {c: 3}}},
      d: {},
      e: {a: {b: {c: 5}}}
    };
    const a = cold('--a-b--c-d---e-|', inputs);
    const asubs = '^              !';
    const expected = '--r-x--y-z---w-|';
    const values: {[key: string]: number | undefined} = {
      r: 1,
      x: undefined,
      y: undefined,
      z: undefined,
      w: 5
    };

    const r = a.pipe(pluck('a', 'b', 'c'));
    expectSource(r).toBe(expected, values);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should throw an error if not property is passed', () => {
    expect(() => {
      of({prop: 1}, {prop: 2}).pipe(pluck());
    }).to.throw(Error, 'list of properties cannot be empty.');
  });

  it('should propagate errors from observable that emits only errors', () => {
    const a = cold('#');
    const asubs = '(^!)';
    const expected = '#';

    const r = a.pipe(pluck('whatever'));
    expectSource(r).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should propagate errors from observable that emit values', () => {
    const a = cold('--a--b--#', {a: {prop: '1'}, b: {prop: '2'}}, 'too bad');
    const asubs = '^       !';
    const expected = '--1--2--#';

    const r = a.pipe(pluck('prop'));
    expectSource(r).toBe(expected, undefined, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should not pluck an empty observable', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const expected = '|';

    const invoked = 0;
    const r = a.pipe(
      pluck('whatever'),
      tap(null, null, () => {
        expect(invoked).to.equal(0);
      })
    );

    expectSource(r).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const a = cold('--a--b--c--|', {a: {prop: '1'}, b: {prop: '2'}});
    const unsub = '      !     ';
    const asubs = '^     !     ';
    const expected = '--1--2-     ';

    const r = a.pipe(pluck('prop'));
    expectSource(r, unsub).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should pluck twice', () => {
    const inputs = {
      a: {a: {b: {c: '1'}}},
      b: {a: {b: {c: '2'}}},
      c: {a: {b: {c: '3'}}},
      d: {a: {b: {c: '4'}}},
      e: {a: {b: {c: '5'}}}
    };
    const a = cold('--a-b--c-d---e-|', inputs);
    const asubs = '^              !';
    const expected = '--1-2--3-4---5-|';

    const r = a.pipe(pluck('a', 'b'), pluck('c'));
    expectSource(r).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const a = cold('--a--b--c--|', {a: {prop: '1'}, b: {prop: '2'}});
    const unsub = '      !     ';
    const asubs = '^     !     ';
    const expected = '--1--2-     ';

    const r = a.pipe(
      mergeMap((x: {prop: string}) => of(x)),
      pluck('prop'),
      mergeMap((x: string) => of(x))
    );

    expectSource(r, unsub).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });

  it('should support symbols', () => {
    const sym = Symbol('sym');

    const a = cold('--x--|', {x: {[sym]: 'abc'}});
    const asubs = '^    !';
    const expected = '--y--|';

    const r = a.pipe(pluck(sym));
    expectSource(r).toBe(expected, {y: 'abc'});
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });
});

import {expect} from 'chai';
import * as sinon from 'sinon';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {
  EMPTY,
  NEVER,
  of,
  race as staticRace,
  timer,
  defer,
  Observable,
  throwError
} from 'rxjs';
import {race, mergeMap, map, finalize, startWith} from 'rxjs/operators';

/** @test {race} */
describe('race operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {reduce, mergeMap} from 'rxjs/operators';
import {range, of} from 'rxjs';

declare const type: Function;
declare const asDiagram: Function;

/** @test {reduce} */
describe('reduce operator', () => {
  asDiagram('reduce((acc, curr) => acc + curr, 0)')('should reduce', () => {
    const values = {
      a: 1,
      b: 3,
      c: 5,
      x: 9
    };
    const e1 = hot('--a--b--c--|', values);
    const e1subs = '^          !';
    const expected = '-----------(x|)';

    const reduceFunction = function (o: number, x: number) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction, 0))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should reduce with seed', () => {
    const e1 = hot('--a--b--|');
    const e1subs = '^       !';
    const expected = '--------(x|)';

    const seed = 'n';
    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction, seed))).toBe(expected, {
      x: seed + 'ab'
    });
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should reduce with a seed of undefined', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '---------------------(x|)';

    const values = {
      x: 'undefined b c d e f g'
    };

    const source = e1.pipe(
      reduce((acc: any, x: string) => acc + ' ' + x, undefined)
    );

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should reduce without a seed', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '---------------------(x|)';

    const values = {
      x: 'b c d e f g'
    };

    const source = e1.pipe(reduce((acc: any, x: string) => acc + ' ' + x));

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should reduce with index without seed', (done: MochaDone) => {
    const idx = [1, 2, 3, 4, 5];

    range(0, 6)
      .pipe(
        reduce((acc, value, index) => {
          expect(idx.shift()).to.equal(index);
          return value;
        })
      )
      .subscribe(null, null, () => {
        expect(idx).to.be.empty;
        done();
      });
  });

  it('should reduce with index with seed', (done: MochaDone) => {
    const idx = [0, 1, 2, 3, 4, 5];

    range(0, 6)
      .pipe(
        reduce((acc, value, index) => {
          expect(idx.shift()).to.equal(index);
          return value;
        }, -1)
      )
      .subscribe(null, null, () => {
        expect(idx).to.be.empty;
        done();
      });
  });

  it('should reduce with seed if source is empty', () => {
    const e1 = hot('--a--^-------|');
    const e1subs = '^       !';
    const expected = '--------(x|)';

    const expectedValue = '42';
    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction, expectedValue))).toBe(
      expected,
      {x: expectedValue}
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if reduce function throws without seed', () => {
    const e1 = hot('--a--b--|');
    const e1subs = '^    !   ';
    const expected = '-----#   ';

    const reduceFunction = function (o: string, x: string) {
      throw 'error';
    };

    expectSource(e1.pipe(reduce(reduceFunction))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--b--|');
    const unsub = '      !  ';
    const e1subs = '^     !  ';
    const expected = '-------  ';

    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    const result = e1.pipe(reduce(reduceFunction));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--b--|');
    const e1subs = '^     !  ';
    const expected = '-------  ';
    const unsub = '      !  ';

    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      reduce(reduceFunction),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source emits and raises error with seed', () => {
    const e1 = hot('--a--b--#');
    const e1subs = '^       !';
    const expected = '--------#';

    const expectedValue = '42';
    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction, expectedValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source raises error with seed', () => {
    const e1 = hot('----#');
    const e1subs = '^   !';
    const expected = '----#';

    const expectedValue = '42';
    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction, expectedValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if reduce function throws with seed', () => {
    const e1 = hot('--a--b--|');
    const e1subs = '^ !     ';
    const expected = '--#     ';

    const seed = 'n';
    const reduceFunction = function (o: string, x: string) {
      throw 'error';
    };

    expectSource(e1.pipe(reduce(reduceFunction, seed))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not complete with seed if source emits but does not completes', () => {
    const e1 = hot('--a--');
    const e1subs = '^    ';
    const expected = '-----';

    const seed = 'n';
    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction, seed))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not complete with seed if source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const seed = 'n';
    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction, seed))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not complete without seed if source emits but does not completes', () => {
    const e1 = hot('--a--b--');
    const e1subs = '^       ';
    const expected = '--------';

    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not complete without seed if source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should reduce if source does not emit without seed', () => {
    const e1 = hot('--a--^-------|');
    const e1subs = '^       !';
    const expected = '--------|';

    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source emits and raises error without seed', () => {
    const e1 = hot('--a--b--#');
    const e1subs = '^       !';
    const expected = '--------#';

    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if source raises error without seed', () => {
    const e1 = hot('----#');
    const e1subs = '^   !';
    const expected = '----#';

    const reduceFunction = function (o: string, x: string) {
      return o + x;
    };

    expectSource(e1.pipe(reduce(reduceFunction))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});

import {expect} from 'chai';
import {
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {repeat, mergeMap, map, multicast, refCount} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of, Subject} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {repeat} */
describe('repeat operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {repeatWhen, map, mergeMap, takeUntil} from 'rxjs/operators';
import {of, EMPTY, Observable, Subscriber} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {repeatWhen} */
describe('repeatWhen operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {
  retry,
  map,
  take,
  mergeMap,
  concat,
  multicast,
  refCount
} from 'rxjs/operators';
import {
  Observable,
  Observer,
  defer,
  range,
  of,
  throwError,
  Subject
} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {retry} */
describe('retry operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {retryWhen, map, mergeMap, takeUntil} from 'rxjs/operators';
import {of, EMPTY} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {retryWhen} */
describe('retryWhen operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {sample, mergeMap} from 'rxjs/operators';
import {Subject, of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {sample} */
describe('sample operator', () => {
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

    expect(results).to.deep.equal([1, 2, 3]);
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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {sampleTime, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {sampleTime} */
describe('sampleTime operator', () => {
  asDiagram('sampleTime(70)')('should get samples on a delay', () => {
    const e1 = hot('a---b-c---------d--e---f-g-h--|');
    const e1subs = '^                             !';
    const expected = '-------c-------------e------h-|';
    // timer          -------!------!------!------!--

    expectSource(e1.pipe(sampleTime(70, rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
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

    expectSource(e1.pipe(sampleTime(110, rxTestScheduler)), unsub).toBe(
      expected
    );
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {scan, mergeMap, finalize} from 'rxjs/operators';
import {of} from 'rxjs';

declare const type: Function;
declare const asDiagram: Function;

/** @test {scan} */
describe('scan operator', () => {
  asDiagram('scan((acc, curr) => acc + curr, 0)')('should scan', () => {
    const values = {
      a: 1,
      b: 3,
      c: 5,
      x: 1,
      y: 4,
      z: 9
    };
    const e1 = hot('--a--b--c--|', values);
    const e1subs = '^          !';
    const expected = '--x--y--z--|';

    const scanFunction = function (o: number, x: number) {
      return o + x;
    };

    expectSource(e1.pipe(scan(scanFunction, 0))).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should scan things', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '---u--v--w--x--y--z--|';

    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should scan with a seed of undefined', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^                    !';
    const expected = '---u--v--w--x--y--z--|';

    const values = {
      u: 'undefined b',
      v: 'undefined b c',
      w: 'undefined b c d',
      x: 'undefined b c d e',
      y: 'undefined b c d e f',
      z: 'undefined b c d e f g'
    };

    const source = e1.pipe(
      scan((acc: any, x: string) => acc + ' ' + x, undefined)
    );

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should scan without seed', () => {
    const e1 = hot('--a--^--b--c--d--|');
    const e1subs = '^           !';
    const expected = '---x--y--z--|';

    const values = {
      x: 'b',
      y: 'bc',
      z: 'bcd'
    };

    const source = e1.pipe(scan((acc: any, x: string) => acc + x));

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle errors', () => {
    const e1 = hot('--a--^--b--c--d--#');
    const e1subs = '^           !';
    const expected = '---u--v--w--#';

    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd']
    };

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle errors in the projection function', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^        !            ';
    const expected = '---u--v--#            ';

    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(
      scan((acc, x) => {
        if (x === 'd') {
          throw 'bad!';
        }
        return acc.concat(x);
      }, [] as string[])
    );

    expectSource(source).toBe(expected, values, 'bad!');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('handle throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectSource(source).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const unsub = '              !       ';
    const e1subs = '^             !       ';
    const expected = '---u--v--w--x--       ';
    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(scan((acc, x) => acc.concat(x), [] as string[]));

    expectSource(source, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--|');
    const e1subs = '^             !       ';
    const expected = '---u--v--w--x--       ';
    const unsub = '              !       ';
    const values = {
      u: ['b'],
      v: ['b', 'c'],
      w: ['b', 'c', 'd'],
      x: ['b', 'c', 'd', 'e'],
      y: ['b', 'c', 'd', 'e', 'f'],
      z: ['b', 'c', 'd', 'e', 'f', 'g']
    };

    const source = e1.pipe(
      mergeMap((x: string) => of(x)),
      scan((acc, x) => acc.concat(x), [] as string[]),
      mergeMap((x: string[]) => of(x))
    );

    expectSource(source, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should pass current index to accumulator', () => {
    const values = {
      a: 1,
      b: 3,
      c: 5,
      x: 1,
      y: 4,
      z: 9
    };
    let idx = [0, 1, 2];

    const e1 = hot('--a--b--c--|', values);
    const e1subs = '^          !';
    const expected = '--x--y--z--|';

    const scanFunction = (o: number, value: number, index: number) => {
      expect(index).to.equal(idx.shift());
      return o + value;
    };

    const scanObs = e1.pipe(
      scan(scanFunction, 0),
      finalize(() => {
        expect(idx).to.be.empty;
      })
    );

    expectSource(scanObs).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import * as _ from 'lodash';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions,
  time
} from '../helpers/marble-testing';
import {sequenceEqual} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';

declare const type: Function;
declare const asDiagram: Function;
declare const rxTestScheduler: TestScheduler;
const booleans = {T: true, F: false};

/** @test {sequenceEqual} */
describe('sequenceEqual operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {share, retry, mergeMapTo, mergeMap, tap, repeat} from 'rxjs/operators';
import {Observable, EMPTY, NEVER, of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {share} */
describe('share operator', () => {
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
import {expect} from 'chai';
import * as sinon from 'sinon';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {shareReplay, mergeMapTo, retry, take} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {Observable, interval, Operator, Observer, of} from 'rxjs';

declare function asDiagram(arg: string): Function;
declare const rxTestScheduler: TestScheduler;

/** @test {shareReplay} */
describe('shareReplay operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {single, mergeMap, tap} from 'rxjs/operators';
import {of, EmptyError} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {single} */
describe('single operator', () => {
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

    expectSource(e1.pipe(single(predicate))).toBe(
      expected,
      null,
      new EmptyError()
    );
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
          expect(indices).to.deep.equal([0, 1, 2]);
        })
      )
    ).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {skip, mergeMap} from 'rxjs/operators';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {skip} */
describe('skip operator', () => {
  asDiagram('skip(3)')('should skip values before a total', () => {
    const source = hot('--a--b--c--d--e--|');
    const subs = '^                !';
    const expected = '-----------d--e--|';

    expectSource(source.pipe(skip(3))).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(subs);
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {skipLast, mergeMap} from 'rxjs/operators';
import {range, OutOfRangeError, of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {takeLast} */
describe('skipLast operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {concat, defer, Observable, of, Subject} from 'rxjs';
import {skipUntil, mergeMap} from 'rxjs/operators';
import {asInteropSource} from '../helpers/interop-helper';

declare function asDiagram(arg: string): Function;

/** @test {skipUntil} */
describe('skipUntil', () => {
  asDiagram('skipUntil')(
    'should skip values until another observable notifies',
    () => {
      const e1 = hot('--a--b--c--d--e----|');
      const e1subs = '^                  !';
      const skip = hot('---------x------|   ');
      const skipSubs = '^        !          ';
      const expected = '-----------d--e----|';

      expectSource(e1.pipe(skipUntil(skip))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(skip.subscriptions).toBe(skipSubs);
    }
  );

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
        () => expect(values).to.deep.equal(['a', 'b'])
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
      skipUntil(asInteropSource(skip)),
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
      .subscribe(() => {
        /* noop */
      });
    expect(sideEffects).to.deep.equal([1]);
  });
});
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {skipWhile, mergeMap, tap} from 'rxjs/operators';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {skipWhile} */
describe('skipWhile operator', () => {
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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {startWith, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {startWith} */
describe('startWith operator', () => {
  const defaultStartValue = 'x';

  asDiagram('startWith(s)')('should prepend to a cold Observable', () => {
    const e1 = cold('---a--b--c--|');
    const e1subs = '^           !';
    const expected = 's--a--b--c--|';

    expectSource(e1.pipe(startWith('s'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start an observable with given value', () => {
    const e1 = hot('--a--|');
    const e1subs = '^    !';
    const expected = 'x-a--|';

    expectSource(e1.pipe(startWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start with given value and does not completes if source does not completes', () => {
    const e1 = hot('----a-');
    const e1subs = '^     ';
    const expected = 'x---a-';

    expectSource(e1.pipe(startWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start with given value and does not completes if source never emits', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = 'x-';

    expectSource(e1.pipe(startWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start with given value and completes if source does not emits', () => {
    const e1 = hot('---|');
    const e1subs = '^  !';
    const expected = 'x--|';

    expectSource(e1.pipe(startWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start with given value and complete immediately if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '(x|)';

    expectSource(e1.pipe(startWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start with given value and source both if source emits single value', () => {
    const e1 = cold('(a|)');
    const e1subs = '(^!)';
    const expected = '(xa|)';

    expectSource(e1.pipe(startWith(defaultStartValue))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start with given values when given value is more than one', () => {
    const e1 = hot('-----a--|');
    const e1subs = '^       !';
    const expected = '(yz)-a--|';

    expectSource(e1.pipe(startWith('y', 'z'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start with given value and raises error if source raises error', () => {
    const e1 = hot('--#');
    const e1subs = '^ !';
    const expected = 'x-#';

    expectSource(e1.pipe(startWith(defaultStartValue))).toBe(
      expected,
      defaultStartValue
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start with given value and raises error immediately if source throws error', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '(x#)';

    expectSource(e1.pipe(startWith(defaultStartValue))).toBe(
      expected,
      defaultStartValue
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should allow unsubscribing explicitly and early', () => {
    const e1 = hot('---a--b----c--d--|');
    const unsub = '         !        ';
    const e1subs = '^        !        ';
    const expected = 's--a--b---';
    const values = {s: 's', a: 'a', b: 'b'};

    const result = e1.pipe(startWith('s', rxTestScheduler));

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('---a--b----c--d--|');
    const e1subs = '^        !        ';
    const expected = 's--a--b---        ';
    const unsub = '         !        ';
    const values = {s: 's', a: 'a', b: 'b'};

    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      startWith('s', rxTestScheduler),
      mergeMap((x: string) => of(x))
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should start with empty if given value is not specified', () => {
    const e1 = hot('-a-|');
    const e1subs = '^  !';
    const expected = '-a-|';

    expectSource(e1.pipe(startWith(rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should accept scheduler as last argument with single value', () => {
    const e1 = hot('--a--|');
    const e1subs = '^    !';
    const expected = 'x-a--|';

    expectSource(e1.pipe(startWith(defaultStartValue, rxTestScheduler))).toBe(
      expected
    );
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should accept scheduler as last argument with multiple value', () => {
    const e1 = hot('-----a--|');
    const e1subs = '^       !';
    const expected = '(yz)-a--|';

    expectSource(e1.pipe(startWith('y', 'z', rxTestScheduler))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {
  hot,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {subscribeOn, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {subscribeOn} */
describe('subscribeOn operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {Observable, of, NEVER, queueScheduler, Subject} from 'rxjs';
import {map, switchAll, mergeMap} from 'rxjs/operators';

declare function asDiagram(arg: string): Function;
declare const type: Function;

/** @test {switch} */
describe('switchAll', () => {
  asDiagram('switchAll')(
    'should switch a hot observable of cold observables',
    () => {
      const x = cold('--a---b--c---d--|      ');
      const y = cold('----e---f--g---|');
      const e1 = hot('--x------y-------|       ', {x: x, y: y});
      const expected = '----a---b----e---f--g---|';

      expectSource(e1.pipe(switchAll())).toBe(expected);
    }
  );

  it('should switch to each immediately-scheduled inner Observable', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, queueScheduler);
    const r = [1, 4, 5, 6];
    let i = 0;
    of(a, b, queueScheduler)
      .pipe(switchAll())
      .subscribe(
        x => {
          expect(x).to.equal(r[i++]);
        },
        null,
        done
      );
  });

  it('should unsub inner observables', () => {
    const unsubbed: string[] = [];

    of('a', 'b')
      .pipe(
        map(
          x =>
            new Observable<string>(subscriber => {
              subscriber.complete();
              return () => {
                unsubbed.push(x);
              };
            })
        ),
        switchAll()
      )
      .subscribe();

    expect(unsubbed).to.deep.equal(['a', 'b']);
  });

  it('should switch to each inner Observable', done => {
    const a = of(1, 2, 3);
    const b = of(4, 5, 6);
    const r = [1, 2, 3, 4, 5, 6];
    let i = 0;
    of(a, b)
      .pipe(switchAll())
      .subscribe(
        x => {
          expect(x).to.equal(r[i++]);
        },
        null,
        done
      );
  });

  it('should handle a hot observable of observables', () => {
    const x = cold('--a---b---c--|         ');
    const xsubs = '      ^       !              ';
    const y = cold('---d--e---f---|');
    const ysubs = '              ^             !';
    const e1 = hot('------x-------y------|       ', {x: x, y: y});
    const expected = '--------a---b----d--e---f---|';
    expectSource(e1.pipe(switchAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle a hot observable of observables, outer is unsubscribed early', () => {
    const x = cold('--a---b---c--|         ');
    const xsubs = '      ^       !              ';
    const y = cold('---d--e---f---|');
    const ysubs = '              ^ !            ';
    const e1 = hot('------x-------y------|       ', {x: x, y: y});
    const unsub = '                !            ';
    const expected = '--------a---b---             ';
    expectSource(e1.pipe(switchAll()), unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const x = cold('--a---b---c--|         ');
    const xsubs = '      ^       !              ';
    const y = cold('---d--e---f---|');
    const ysubs = '              ^ !            ';
    const e1 = hot('------x-------y------|       ', {x: x, y: y});
    const expected = '--------a---b----            ';
    const unsub = '                !            ';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      switchAll(),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle a hot observable of observables, inner never completes', () => {
    const x = cold('--a---b---c--|          ');
    const xsubs = '      ^       !               ';
    const y = cold('---d--e---f-----');
    const ysubs = '              ^               ';
    const e1 = hot('------x-------y------|        ', {x: x, y: y});
    const expected = '--------a---b----d--e---f-----';
    expectSource(e1.pipe(switchAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle a synchronous switch to the second inner observable', () => {
    const x = cold('--a---b---c--|   ');
    const xsubs = '      (^!)             ';
    const y = cold('---d--e---f---|  ');
    const ysubs = '      ^             !  ';
    const e1 = hot('------(xy)------------|', {x: x, y: y});
    const expected = '---------d--e---f-----|';
    expectSource(e1.pipe(switchAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle a hot observable of observables, one inner throws', () => {
    const x = cold('--a---#                ');
    const xsubs = '      ^     !                ';
    const y = cold('---d--e---f---|');
    const ysubs: string[] = [];
    const e1 = hot('------x-------y------|       ', {x: x, y: y});
    const expected = '--------a---#                ';
    expectSource(e1.pipe(switchAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle a hot observable of observables, outer throws', () => {
    const x = cold('--a---b---c--|         ');
    const xsubs = '      ^       !              ';
    const y = cold('---d--e---f---|');
    const ysubs = '              ^       !      ';
    const e1 = hot('------x-------y-------#      ', {x: x, y: y});
    const expected = '--------a---b----d--e-#      ';
    expectSource(e1.pipe(switchAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
  });

  it('should handle an empty hot observable', () => {
    const e1 = hot('------|');
    const e1subs = '^     !';
    const expected = '------|';

    expectSource(e1.pipe(switchAll())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a never hot observable', () => {
    const e1 = hot('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(switchAll())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should complete not before the outer completes', () => {
    const x = cold('--a---b---c--|   ');
    const xsubs = '      ^            !   ';
    const e1 = hot('------x---------------|', {x: x});
    const e1subs = '^                     !';
    const expected = '--------a---b---c-----|';

    expectSource(e1.pipe(switchAll())).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an observable of promises', done => {
    const expected = [3];

    of(Promise.resolve(1), Promise.resolve(2), Promise.resolve(3))
      .pipe(switchAll())
      .subscribe(
        x => {
          expect(x).to.equal(expected.shift());
        },
        null,
        () => {
          expect(expected.length).to.equal(0);
          done();
        }
      );
  });

  it('should handle an observable of promises, where last rejects', done => {
    of(Promise.resolve(1), Promise.resolve(2), Promise.reject(3))
      .pipe(switchAll())
      .subscribe(
        () => {
          done(new Error('should not be called'));
        },
        err => {
          expect(err).to.equal(3);
          done();
        },
        () => {
          done(new Error('should not be called'));
        }
      );
  });

  it('should handle an observable with Arrays in it', () => {
    const expected = [1, 2, 3, 4];
    let completed = false;

    of(NEVER, NEVER, [1, 2, 3, 4])
      .pipe(switchAll())
      .subscribe(
        x => {
          expect(x).to.equal(expected.shift());
        },
        null,
        () => {
          completed = true;
          expect(expected.length).to.equal(0);
        }
      );

    expect(completed).to.be.true;
  });

  it('should not leak when child completes before each switch (prevent memory leaks #2355)', () => {
    let iStream: Subject<number>;
    const oStreamControl = new Subject<number>();
    const oStream = oStreamControl.pipe(
      map(() => (iStream = new Subject<number>()))
    );
    const switcher = oStream.pipe(switchAll());
    const result: number[] = [];
    let sub = switcher.subscribe(x => result.push(x));

    [0, 1, 2, 3, 4].forEach(n => {
      oStreamControl.next(n); // creates inner
      iStream.complete();
    });
    // Expect one child of switch(): The oStream
    expect((<any>sub)._subscriptions[0]._subscriptions.length).to.equal(1);
    sub.unsubscribe();
  });

  it('should not leak if we switch before child completes (prevent memory leaks #2355)', () => {
    const oStreamControl = new Subject<number>();
    const oStream = oStreamControl.pipe(map(() => new Subject<number>()));
    const switcher = oStream.pipe(switchAll());
    const result: number[] = [];
    let sub = switcher.subscribe(x => result.push(x));

    [0, 1, 2, 3, 4].forEach(n => {
      oStreamControl.next(n); // creates inner
    });
    // Expect one child of switch(): The oStream
    expect((sub as any)._subscriptions[0]._subscriptions.length).to.equal(1);
    // Expect two children of subscribe(): The destination and the first inner
    // See #4106 - inner subscriptions are now added to destinations
    expect((sub as any)._subscriptions.length).to.equal(2);
    sub.unsubscribe();
  });
});
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {switchMap, mergeMap, map, takeWhile} from 'rxjs/operators';
import {concat, defer, of, Observable} from 'rxjs';
import {asInteropSource} from '../helpers/interop-helper';

declare function asDiagram(arg: string): Function;

/** @test {switchMap} */
describe('switchMap', () => {
  asDiagram('switchMap(i => 10*i\u2014\u201410*i\u2014\u201410*i\u2014| )')(
    'should map-and-flatten each item to an Observable',
    () => {
      const e1 = hot('--1-----3--5-------|');
      const e1subs = '^                  !';
      const e2 = cold('x-x-x|              ', {x: 10});
      const expected = '--x-x-x-y-yz-z-z---|';
      const values = {x: 10, y: 30, z: 50};

      const result = e1.pipe(switchMap(x => e2.pipe(map(i => i * +x))));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should support the deprecated resultSelector', () => {
    const results: Array<number[]> = [];

    of(1, 2, 3)
      .pipe(
        switchMap(
          x => of(x, x + 1, x + 2),
          (a, b, i, ii) => [a, b, i, ii]
        )
      )
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([
            [1, 1, 0, 0],
            [1, 2, 0, 1],
            [1, 3, 0, 2],
            [2, 2, 1, 0],
            [2, 3, 1, 1],
            [2, 4, 1, 2],
            [3, 3, 2, 0],
            [3, 4, 2, 1],
            [3, 5, 2, 2]
          ]);
        }
      });
  });

  it('should support a void resultSelector (still deprecated)', () => {
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(switchMap(x => of(x, x + 1, x + 2), void 0))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([1, 2, 3, 2, 3, 4, 3, 4, 5]);
        }
      });
  });

  it('should unsub inner observables', () => {
    const unsubbed: string[] = [];

    of('a', 'b')
      .pipe(
        switchMap(
          x =>
            new Observable<string>(subscriber => {
              subscriber.complete();
              return () => {
                unsubbed.push(x);
              };
            })
        )
      )
      .subscribe();

    expect(unsubbed).to.deep.equal(['a', 'b']);
  });

  it('should switch inner cold observables', () => {
    const x = cold('--a--b--c--d--e--|           ');
    const xsubs = '         ^         !                  ';
    const y = cold('---f---g---h---i--|');
    const ysubs = '                   ^                 !';
    const e1 = hot('---------x---------y---------|        ');
    const e1subs = '^                            !        ';
    const expected = '-----------a--b--c----f---g---h---i--|';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error when projection throws', () => {
    const e1 = hot('-------x-----y---|');
    const e1subs = '^      !          ';
    const expected = '-------#          ';
    function project(): any[] {
      throw 'error';
    }

    expectSource(e1.pipe(switchMap(project))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner cold observables, outer is unsubscribed early', () => {
    const x = cold('--a--b--c--d--e--|           ');
    const xsubs = '         ^         !                  ';
    const y = cold('---f---g---h---i--|');
    const ysubs = '                   ^ !                ';
    const e1 = hot('---------x---------y---------|        ');
    const e1subs = '^                    !                ';
    const unsub = '                     !                ';
    const expected = '-----------a--b--c----                ';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const x = cold('--a--b--c--d--e--|           ');
    const xsubs = '         ^         !                  ';
    const y = cold('---f---g---h---i--|');
    const ysubs = '                   ^ !                ';
    const e1 = hot('---------x---------y---------|        ');
    const e1subs = '^                    !                ';
    const expected = '-----------a--b--c----                ';
    const unsub = '                     !                ';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(
      mergeMap(x => of(x)),
      switchMap(value => observableLookup[value]),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains with interop inners when result is unsubscribed explicitly', () => {
    const x = cold('--a--b--c--d--e--|           ');
    const xsubs = '         ^         !                  ';
    const y = cold('---f---g---h---i--|');
    const ysubs = '                   ^ !                ';
    const e1 = hot('---------x---------y---------|        ');
    const e1subs = '^                    !                ';
    const expected = '-----------a--b--c----                ';
    const unsub = '                     !                ';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    // This test is the same as the previous test, but the observable is
    // manipulated to make it look like an interop observable - an observable
    // from a foreign library. Interop subscribers are treated differently:
    // they are wrapped in a safe subscriber. This test ensures that
    // unsubscriptions are chained all the way to the interop subscriber.

    const result = e1.pipe(
      mergeMap(x => of(x)),
      switchMap(value => asInteropSource(observableLookup[value])),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
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

    of(null)
      .pipe(
        switchMap(() => synchronousObservable),
        takeWhile(x => x != 2) // unsubscribe at the second side-effect
      )
      .subscribe(() => {
        /* noop */
      });

    expect(sideEffects).to.deep.equal([1, 2]);
  });

  it('should switch inner cold observables, inner never completes', () => {
    const x = cold('--a--b--c--d--e--|          ');
    const xsubs = '         ^         !                 ';
    const y = cold('---f---g---h---i--');
    const ysubs = '                   ^                 ';
    const e1 = hot('---------x---------y---------|       ');
    const e1subs = '^                            !       ';
    const expected = '-----------a--b--c----f---g---h---i--';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a synchronous switch to the second inner observable', () => {
    const x = cold('--a--b--c--d--e--|   ');
    const xsubs = '         (^!)                 ';
    const y = cold('---f---g---h---i--|  ');
    const ysubs = '         ^                 !  ';
    const e1 = hot('---------(xy)----------------|');
    const e1subs = '^                            !';
    const expected = '------------f---g---h---i----|';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner cold observables, one inner throws', () => {
    const x = cold('--a--b--#--d--e--|          ');
    const xsubs = '         ^       !                   ';
    const y = cold('---f---g---h---i--');
    const ysubs: string[] = [];
    const e1 = hot('---------x---------y---------|       ');
    const e1subs = '^                !                   ';
    const expected = '-----------a--b--#                   ';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner hot observables', () => {
    const x = hot('-----a--b--c--d--e--|                 ');
    const xsubs = '         ^         !                  ';
    const y = hot('--p-o-o-p-------------f---g---h---i--|');
    const ysubs = '                   ^                 !';
    const e1 = hot('---------x---------y---------|        ');
    const e1subs = '^                            !        ';
    const expected = '-----------c--d--e----f---g---h---i--|';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner empty and empty', () => {
    const x = cold('|');
    const y = cold('|');
    const xsubs = '         (^!)                 ';
    const ysubs = '                   (^!)       ';
    const e1 = hot('---------x---------y---------|');
    const e1subs = '^                            !';
    const expected = '-----------------------------|';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner empty and never', () => {
    const x = cold('|');
    const y = cold('-');
    const xsubs = '         (^!)                 ';
    const ysubs = '                   ^          ';
    const e1 = hot('---------x---------y---------|');
    const e1subs = '^                            !';
    const expected = '------------------------------';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner never and empty', () => {
    const x = cold('-');
    const y = cold('|');
    const xsubs = '         ^         !          ';
    const ysubs = '                   (^!)       ';
    const e1 = hot('---------x---------y---------|');
    const e1subs = '^                            !';
    const expected = '-----------------------------|';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner never and throw', () => {
    const x = cold('-');
    const y = cold('#', undefined, 'sad');
    const xsubs = '         ^         !          ';
    const ysubs = '                   (^!)       ';
    const e1 = hot('---------x---------y---------|');
    const e1subs = '^                  !          ';
    const expected = '-------------------#          ';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected, undefined, 'sad');
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch inner empty and throw', () => {
    const x = cold('|');
    const y = cold('#', undefined, 'sad');
    const xsubs = '         (^!)                 ';
    const ysubs = '                   (^!)       ';
    const e1 = hot('---------x---------y---------|');
    const e1subs = '^                  !          ';
    const expected = '-------------------#          ';

    const observableLookup: Record<string, Observable<string>> = {x: x, y: y};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected, undefined, 'sad');
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle outer empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    const result = e1.pipe(switchMap(value => of(value)));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle outer never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    const result = e1.pipe(switchMap(value => of(value)));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle outer throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    const result = e1.pipe(switchMap(value => of(value)));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle outer error', () => {
    const x = cold('--a--b--c--d--e--|');
    const xsubs = '         ^         !       ';
    const e1 = hot('---------x---------#       ');
    const e1subs = '^                  !       ';
    const expected = '-----------a--b--c-#       ';

    const observableLookup: Record<string, Observable<string>> = {x: x};

    const result = e1.pipe(switchMap(value => observableLookup[value]));

    expectSource(result).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {Observable, of, from} from 'rxjs';
import {switchMapTo, mergeMap} from 'rxjs/operators';

declare function asDiagram(arg: string): Function;

/** @test {switchMapTo} */
describe('switchMapTo', () => {
  asDiagram('switchMapTo( 10\u2014\u201410\u2014\u201410\u2014| )')(
    'should map-and-flatten each item to an Observable',
    () => {
      const e1 = hot('--1-----3--5-------|');
      const e1subs = '^                  !';
      const e2 = cold('x-x-x|              ', {x: 10});
      const expected = '--x-x-x-x-xx-x-x---|';
      const values = {x: 10};

      const result = e1.pipe(switchMapTo(e2));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    }
  );

  it('should support the deprecated resultSelector', () => {
    const results: Array<number[]> = [];

    of(1, 2, 3)
      .pipe(switchMapTo(of(4, 5, 6), (a, b, i, ii) => [a, b, i, ii]))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([
            [1, 4, 0, 0],
            [1, 5, 0, 1],
            [1, 6, 0, 2],
            [2, 4, 1, 0],
            [2, 5, 1, 1],
            [2, 6, 1, 2],
            [3, 4, 2, 0],
            [3, 5, 2, 1],
            [3, 6, 2, 2]
          ]);
        }
      });
  });

  it('should support a void resultSelector (still deprecated)', () => {
    const results: number[] = [];

    of(1, 2, 3)
      .pipe(switchMapTo(of(4, 5, 6), void 0))
      .subscribe({
        next(value) {
          results.push(value);
        },
        error(err) {
          throw err;
        },
        complete() {
          expect(results).to.deep.equal([4, 5, 6, 4, 5, 6, 4, 5, 6]);
        }
      });
  });

  it('should switch a synchronous many outer to a synchronous many inner', done => {
    const a = of(1, 2, 3);
    const expected = ['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c'];
    a.pipe(switchMapTo(of('a', 'b', 'c'))).subscribe(
      x => {
        expect(x).to.equal(expected.shift());
      },
      null,
      done
    );
  });

  it('should unsub inner observables', () => {
    let unsubbed = 0;

    of('a', 'b')
      .pipe(
        switchMapTo(
          new Observable<string>(subscriber => {
            subscriber.complete();
            return () => {
              unsubbed++;
            };
          })
        )
      )
      .subscribe();

    expect(unsubbed).to.equal(2);
  });

  it('should switch to an inner cold observable', () => {
    const x = cold('--a--b--c--d--e--|          ');
    const xsubs = [
      '         ^         !                 ',
      //                                 --a--b--c--d--e--|
      '                   ^                !'
    ];
    const e1 = hot('---------x---------x---------|       ');
    const e1subs = '^                            !       ';
    const expected = '-----------a--b--c---a--b--c--d--e--|';

    expectSource(e1.pipe(switchMapTo(x))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch to an inner cold observable, outer eventually throws', () => {
    const x = cold('--a--b--c--d--e--|');
    const xsubs = '         ^         !       ';
    const e1 = hot('---------x---------#       ');
    const e1subs = '^                  !       ';
    const expected = '-----------a--b--c-#       ';

    expectSource(e1.pipe(switchMapTo(x))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch to an inner cold observable, outer is unsubscribed early', () => {
    const x = cold('--a--b--c--d--e--|   ');
    const xsubs = [
      '         ^         !          ',
      //                                 --a--b--c--d--e--|
      '                   ^  !       '
    ];
    const e1 = hot('---------x---------x---------|');
    const unsub = '                      !       ';
    const e1subs = '^                     !       ';
    const expected = '-----------a--b--c---a-       ';

    expectSource(e1.pipe(switchMapTo(x)), unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const x = cold('--a--b--c--d--e--|   ');
    const xsubs = [
      '         ^         !          ',
      //                                 --a--b--c--d--e--|
      '                   ^  !       '
    ];
    const e1 = hot('---------x---------x---------|');
    const e1subs = '^                     !       ';
    const expected = '-----------a--b--c---a-       ';
    const unsub = '                      !       ';

    const result = e1.pipe(
      mergeMap(x => of(x)),
      switchMapTo(x),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch to an inner cold observable, inner never completes', () => {
    const x = cold('--a--b--c--d--e-          ');
    const xsubs = [
      '         ^         !               ',
      //                                 --a--b--c--d--e-
      '                   ^               '
    ];
    const e1 = hot('---------x---------y---------|     ');
    const e1subs = '^                            !     ';
    const expected = '-----------a--b--c---a--b--c--d--e-';

    expectSource(e1.pipe(switchMapTo(x))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a synchronous switch to the inner observable', () => {
    const x = cold('--a--b--c--d--e--|   ');
    const xsubs = [
      '         (^!)                 ',
      '         ^                !   '
    ];
    const e1 = hot('---------(xx)----------------|');
    const e1subs = '^                            !';
    const expected = '-----------a--b--c--d--e-----|';

    expectSource(e1.pipe(switchMapTo(x))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch to an inner cold observable, inner raises an error', () => {
    const x = cold('--a--b--#            ');
    const xsubs = '         ^       !            ';
    const e1 = hot('---------x---------x---------|');
    const e1subs = '^                !            ';
    const expected = '-----------a--b--#            ';

    expectSource(e1.pipe(switchMapTo(x))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch an inner hot observable', () => {
    const x = hot('--p-o-o-p---a--b--c--d-|      ');
    const xsubs = [
      '         ^         !          ',
      '                   ^   !      '
    ];
    const e1 = hot('---------x---------x---------|');
    const e1subs = '^                            !';
    const expected = '------------a--b--c--d-------|';

    expectSource(e1.pipe(switchMapTo(x))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch to an inner empty', () => {
    const x = cold('|');
    const xsubs = [
      '         (^!)                 ',
      '                   (^!)       '
    ];
    const e1 = hot('---------x---------x---------|');
    const e1subs = '^                            !';
    const expected = '-----------------------------|';

    expectSource(e1.pipe(switchMapTo(x))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch to an inner never', () => {
    const x = cold('-');
    const xsubs = [
      '         ^         !          ',
      '                   ^          '
    ];
    const e1 = hot('---------x---------x---------|');
    const e1subs = '^                            !';
    const expected = '------------------------------';

    expectSource(e1.pipe(switchMapTo(x))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should switch to an inner that just raises an error', () => {
    const x = cold('#');
    const xsubs = '         (^!)                 ';
    const e1 = hot('---------x---------x---------|');
    const e1subs = '^        !                    ';
    const expected = '---------#                    ';

    expectSource(e1.pipe(switchMapTo(x))).toBe(expected);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an empty outer', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = '|';

    expectSource(e1.pipe(switchMapTo(of('foo')))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle a never outer', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = '-';

    expectSource(e1.pipe(switchMapTo(of('foo')))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle an outer that just raises and error', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    expectSource(e1.pipe(switchMapTo(of('foo')))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
});
import {expect} from 'chai';
import {take, mergeMap} from 'rxjs/operators';
import {range, OutOfRangeError, of, Observable, Subject} from 'rxjs';
import {TestScheduler} from 'rxjs/testing';
import {sourceMatcher} from '../helpers/sourceMatcher';

declare function asDiagram(arg: string): Function;

/** @test {take} */
describe('take operator', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('take(2)')(
    'should take two values of an observable with many values',
    () => {
      testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
        const e1 = cold(' --a-----b----c---d--|');
        const e1subs = '  ^-------!------------';
        const expected = '--a-----(b|)         ';

        expectSource(e1.pipe(take(2))).toBe(expected);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
      });
    }
  );

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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {takeLast, mergeMap} from 'rxjs/operators';
import {range, OutOfRangeError, of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {takeLast} */
describe('takeLast operator', () => {
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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {takeUntil, mergeMap} from 'rxjs/operators';
import {of, EMPTY} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {takeUntil} */
describe('takeUntil operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {takeWhile, tap, mergeMap} from 'rxjs/operators';
import {of, Observable, from} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {takeWhile} */
describe('takeWhile operator', () => {
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
      const isString = (x: string | number): x is string =>
        typeof x === 'string';

      xs.pipe(takeWhile(isString)).subscribe(s => s.length); // s is string

      // In contrast, this type of regular boolean predicate still maintains the original type
      xs.pipe(takeWhile(x => typeof x === 'number')).subscribe(x => x); // x is still string | number
      xs.pipe(takeWhile((x, i) => typeof x === 'number' && x > i)).subscribe(
        x => x
      ); // x is still string | number
    }
  });
});
import {expect} from 'chai';
import {tap, mergeMap} from 'rxjs/operators';
import {Subject, of, throwError, Observer, EMPTY} from 'rxjs';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';

declare function asDiagram(arg: string): Function;

/** @test {tap} */
describe('tap operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {throttle, mergeMap, mapTo} from 'rxjs/operators';
import {of, concat, timer, Observable} from 'rxjs';

declare const type: Function;
declare function asDiagram(arg: string): Function;

/** @test {throttle} */
describe('throttle operator', () => {
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

        const result = e1.pipe(
          throttle(() => e2, {leading: true, trailing: true})
        );

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

      const result = s1.pipe(
        throttle(() => n1, {leading: true, trailing: true})
      );
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

        const result = e1.pipe(
          throttle(() => e2, {leading: true, trailing: true})
        );

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

      const result = s1.pipe(
        throttle(() => n1, {leading: true, trailing: true})
      );
      expectSource(result).toBe(exp);
      expectSubscriptions(s1.subscriptions).toBe(s1Subs);
      expectSubscriptions(n1.subscriptions).toBe(n1Subs);
    });
  });
});
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions,
  time
} from '../helpers/marble-testing';
import {throttleTime, take, map, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of, concat, timer} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {throttleTime} */
describe('throttleTime operator', () => {
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

    expectSource(e1.pipe(throttleTime(50, rxTestScheduler)), unsub).toBe(
      expected
    );
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {EMPTY, of, EmptyError, defer, throwError} from 'rxjs';
import {throwIfEmpty, mergeMap, retry} from 'rxjs/operators';

declare function asDiagram(arg: string): Function;

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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {timeInterval, map, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of} from 'rxjs';
import {TimeInterval} from 'rxjs/internal/operators/timeInterval';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {timeInterval} */
describe('timeInterval operator', () => {
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
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {timeout, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {TimeoutError, of} from 'rxjs';

declare function asDiagram(arg: string): Function;
declare const rxTestScheduler: TestScheduler;

/** @test {timeout} */
describe('timeout operator', () => {
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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {timeoutWith, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;
declare const rxTestScheduler: TestScheduler;

/** @test {timeoutWith} */
describe('timeoutWith operator', () => {
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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {time, map, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

/** @test {time} */
describe('time operator', () => {
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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {toArray, mergeMap} from 'rxjs/operators';
import {of} from 'rxjs';

declare const type: Function;
declare const asDiagram: Function;

/** @test {toArray} */
describe('toArray operator', () => {
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
import {expect} from 'chai';
import {of, EMPTY, throwError, config} from 'rxjs';

/** @test {toPromise} */
describe('Observable.toPromise', () => {
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
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {window, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {EMPTY, of, Observable} from 'rxjs';

declare const type: Function;
declare const asDiagram: Function;

declare const rxTestScheduler: TestScheduler;

/** @test {window} */
describe('window operator', () => {
  asDiagram('window')('should emit windows that close and reopen', () => {
    const source = hot('---a---b---c---d---e---f---g---h---i---|    ');
    const sourceSubs = '^                                      !    ';
    const closings = hot('-------------w------------w----------------|');
    const closingSubs = '^                                      !    ';
    const expected = 'x------------y------------z------------|    ';
    const x = cold('---a---b---c-|                              ');
    const y = cold('--d---e---f--|                 ');
    const z = cold('-g---h---i---|    ');
    const expectedValues = {x: x, y: y, z: z};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should return a single empty window if source is empty and closings are basic', () => {
    const source = cold('|');
    const sourceSubs = '(^!)';
    const closings = cold('--x--x--|');
    const closingSubs = '(^!)';
    const expected = '(w|)';
    const w = cold('|');
    const expectedValues = {w: w};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should return a single empty window if source is empty and closing is empty', () => {
    const source = cold('|');
    const sourceSubs = '(^!)';
    const closings = cold('|');
    const closingSubs = '(^!)';
    const expected = '(w|)';
    const w = cold('|');
    const expectedValues = {w: w};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should return a single empty window if source is sync empty and closing is sync empty', () => {
    const source = cold('(|)');
    const sourceSubs = '(^!)';
    const expected = '(w|)';
    const w = cold('|');
    const expectedValues = {w: w};

    const result = source.pipe(window(EMPTY));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    // expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should split a Just source into a single window identical to source, using a Never closing', () => {
    const source = cold('(a|)');
    const sourceSubs = '(^!)';
    const closings = cold('-');
    const closingSubs = '(^!)';
    const expected = '(w|)';
    const w = cold('(a|)');
    const expectedValues = {w: w};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should return a single Never window if source is Never', () => {
    const source = cold('------');
    const sourceSubs = '^     ';
    const closings = cold('------');
    const closingSubs = '^     ';
    const expected = 'w-----';
    const w = cold('------');
    const expectedValues = {w: w};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should be able to split a never Observable into timely empty windows', () => {
    const source = hot('^--------');
    const sourceSubs = '^       !';
    const closings = cold('--x--x--|');
    const closingSubs = '^       !';
    const expected = 'a-b--c--|';
    const a = cold('--|      ');
    const b = cold('---|   ');
    const c = cold('---|');
    const expectedValues = {a: a, b: b, c: c};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should emit an error-only window if outer is a simple throw-Observable', () => {
    const source = cold('#');
    const sourceSubs = '(^!)';
    const closings = cold('--x--x--|');
    const closingSubs = '(^!)';
    const expected = '(w#)';
    const w = cold('#');
    const expectedValues = {w: w};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should handle basic case with window closings', () => {
    const source = hot('-1-2-^3-4-5-6-7-8-9-|         ');
    const subs = '^              !         ';
    const closings = hot('---^---x---x---x---x---x---|');
    const closingSubs = '^              !         ';
    const expected = 'a---b---c---d--|         ';
    const a = cold('-3-4|                    ');
    const b = cold('-5-6|                ');
    const c = cold('-7-8|            ');
    const d = cold('-9-|         ');
    const expectedValues = {a: a, b: b, c: c, d: d};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(subs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should handle basic case with window closings, but outer throws', () => {
    const source = hot('-1-2-^3-4-5-6-7-8-9-#         ');
    const subs = '^              !         ';
    const closings = hot('---^---x---x---x---x---x---|');
    const closingSubs = '^              !         ';
    const expected = 'a---b---c---d--#         ';
    const a = cold('-3-4|                    ');
    const b = cold('-5-6|                ');
    const c = cold('-7-8|            ');
    const d = cold('-9-#         ');
    const expectedValues = {a: a, b: b, c: c, d: d};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(subs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should stop emitting windows when outer is unsubscribed early', () => {
    const source = hot('-1-2-^3-4-5-6-7-8-9-|         ');
    const subs = '^       !                ';
    const closings = hot('---^---x---x---x---x---x---|');
    const closingSubs = '^       !                ';
    const expected = 'a---b----                ';
    const a = cold('-3-4|                    ');
    const b = cold('-5-6                 ');
    const unsub = '        !                ';
    const expectedValues = {a: a, b: b};

    const result = source.pipe(window(closings));

    expectSource(result, unsub).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(subs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = hot('-1-2-^3-4-5-6-7-8-9-|         ');
    const subs = '^       !                ';
    const closings = hot('---^---x---x---x---x---x---|');
    const closingSubs = '^       !                ';
    const expected = 'a---b----                ';
    const a = cold('-3-4|                    ');
    const b = cold('-5-6-                ');
    const unsub = '        !                ';
    const expectedValues = {a: a, b: b};

    const result = source.pipe(
      mergeMap((x: string) => of(x)),
      window(closings),
      mergeMap((x: Observable<string>) => of(x))
    );

    expectSource(result, unsub).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(subs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should make outer emit error when closing throws', () => {
    const source = hot('-1-2-^3-4-5-6-7-8-9-#');
    const subs = '^   !           ';
    const closings = hot('---^---#           ');
    const closingSubs = '^   !           ';
    const expected = 'a---#           ';
    const a = cold('-3-4#           ');
    const expectedValues = {a: a};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(subs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });

  it('should complete the resulting Observable when window closings completes', () => {
    const source = hot('-1-2-^3-4-5-6-7-8-9-|');
    const subs = '^           !   ';
    const closings = hot('---^---x---x---|   ');
    const closingSubs = '^           !   ';
    const expected = 'a---b---c---|   ';
    const a = cold('-3-4|           ');
    const b = cold('-5-6|       ');
    const c = cold('-7-8|   ');
    const expectedValues = {a: a, b: b, c: c};

    const result = source.pipe(window(closings));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(subs);
    expectSubscriptions(closings.subscriptions).toBe(closingSubs);
  });
});
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {windowCount, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of, Observable} from 'rxjs';

declare const type: Function;
declare const asDiagram: Function;

declare const rxTestScheduler: TestScheduler;

/** @test {windowCount} */
describe('windowCount operator', () => {
  asDiagram('windowCount(3)')(
    'should emit windows with count 3, no skip specified',
    () => {
      const source = hot('---a---b---c---d---e---f---g---h---i---|');
      const sourceSubs = '^                                      !';
      const expected = 'x----------y-----------z-----------w---|';
      const x = cold('---a---b---(c|)                         ');
      const y = cold('----d---e---(f|)             ');
      const z = cold('----g---h---(i|) ');
      const w = cold('----|');
      const expectedValues = {x: x, y: y, z: z, w: w};

      const result = source.pipe(windowCount(3));

      expectSource(result).toBe(expected, expectedValues);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    }
  );

  it('should emit windows with count 2 and skip 1', () => {
    const source = hot('^-a--b--c--d--|');
    const subs = '^             !';
    const expected = 'u-v--x--y--z--|';
    const u = cold('--a--(b|)      ');
    const v = cold('---b--(c|)   ');
    const x = cold('---c--(d|)');
    const y = cold('---d--|');
    const z = cold('---|');
    const values = {u: u, v: v, x: x, y: y, z: z};

    const result = source.pipe(windowCount(2, 1));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should emit windows with count 2, and skip unspecified', () => {
    const source = hot('--a--b--c--d--e--f--|');
    const subs = '^                   !';
    const expected = 'x----y-----z-----w--|';
    const x = cold('--a--(b|)            ');
    const y = cold('---c--(d|)      ');
    const z = cold('---e--(f|)');
    const w = cold('---|');
    const values = {x: x, y: y, z: z, w: w};

    const result = source.pipe(windowCount(2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return empty if source is empty', () => {
    const source = cold('|');
    const subs = '(^!)';
    const expected = '(w|)';
    const w = cold('|');
    const values = {w: w};

    const result = source.pipe(windowCount(2, 1));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should return Never if source if Never', () => {
    const source = cold('-');
    const subs = '^';
    const expected = 'w';
    const w = cold('-');
    const expectedValues = {w: w};

    const result = source.pipe(windowCount(2, 1));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should propagate error from a just-throw source', () => {
    const source = cold('#');
    const subs = '(^!)';
    const expected = '(w#)';
    const w = cold('#');
    const expectedValues = {w: w};

    const result = source.pipe(windowCount(2, 1));

    expectSource(result).toBe(expected, expectedValues);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should raise error if source raises error', () => {
    const source = hot('--a--b--c--d--e--f--#');
    const subs = '^                   !';
    const expected = 'u-v--w--x--y--z--q--#';
    const u = cold('--a--b--(c|)         ');
    const v = cold('---b--c--(d|)      ');
    const w = cold('---c--d--(e|)   ');
    const x = cold('---d--e--(f|)');
    const y = cold('---e--f--#');
    const z = cold('---f--#');
    const q = cold('---#');
    const values = {u: u, v: v, w: w, x: x, y: y, z: z, q: q};

    const result = source.pipe(windowCount(3, 1));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should dispose of inner windows once outer is unsubscribed early', () => {
    const source = hot('^-a--b--c--d--|');
    const subs = '^        !     ';
    const expected = 'w-x--y--z-     ';
    const w = cold('--a--(b|)      ');
    const x = cold('---b--(c|)   ');
    const y = cold('---c-     ');
    const z = cold('--     ');
    const unsub = '         !     ';
    const values = {w: w, x: x, y: y, z: z};

    const result = source.pipe(windowCount(2, 1));

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = hot('^-a--b--c--d--|');
    const subs = '^        !     ';
    const expected = 'w-x--y--z-     ';
    const w = cold('--a--(b|)      ');
    const x = cold('---b--(c|)   ');
    const y = cold('---c-     ');
    const z = cold('--     ');
    const unsub = '         !     ';
    const values = {w: w, x: x, y: y, z: z};

    const result = source.pipe(
      mergeMap((x: string) => of(x)),
      windowCount(2, 1),
      mergeMap((x: Observable<string>) => of(x))
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
});
import {windowTime, mergeMap, mergeAll} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';
import {of, Observable} from 'rxjs';
import {sourceMatcher} from '../helpers/sourceMatcher';

/** @test {windowTime} */
describe('windowTime operator', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(sourceMatcher);
  });

  it('should emit windows given windowTimeSpan and windowCreationInterval', () => {
    rxTestScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const source = hot('--1--2--^-a--b--c--d--e---f--g--h-|');
      const subs = '^-------------------------!';
      //  10 frames              0---------1---------2-----|
      //  5                      -----|
      //  5                                -----|
      //  5                                          -----|
      const expected = 'x---------y---------z-----|';
      const x = cold('--a--(b|)                  ');
      const y = cold('-d--e|           ');
      const z = cold('-g--h| ');
      const values = {x, y, z};

      const result = source.pipe(windowTime(5, 10, rxTestScheduler));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should close windows after max count is reached', () => {
    rxTestScheduler.run(
      ({hot, time, cold, expectSource, expectSubscriptions}) => {
        const source = hot('--1--2--^--a--b--c--d--e--f--g-----|');
        const subs = '^--------------------------!';
        const timeSpan = time('----------|');
        //  10 frames              0---------1---------2------|
        const expected = 'x---------y---------z------|';
        const x = cold('---a--(b|)                  ');
        const y = cold('--d--(e|)         ');
        const z = cold('-g-----|');
        const values = {x, y, z};

        const result = source.pipe(
          windowTime(timeSpan, null as any, 2, rxTestScheduler)
        );

        expectSource(result).toBe(expected, values);
        expectSubscriptions(source.subscriptions).toBe(subs);
      }
    );
  });

  it('should close window after max count is reached with windowCreationInterval', () => {
    rxTestScheduler.run(({hot, cold, expectSubscriptions, expectSource}) => {
      const source = hot('--1--2--^-a--b--c--de-f---g--h--i-|');
      const subs = '^-------------------------!';
      //  10 frames              0---------1---------2-----|
      //  5                      -----|
      //  5                                -----|');
      //  5                                          -----|');
      const expected = 'x---------y---------z-----|';
      const x = cold('            --a--(b|)                 ');
      const y = cold('                      -de-(f|)         ');
      const z = cold('                                -h--i| ');
      const values = {x, y, z};

      const result = source.pipe(windowTime(5, 10, 3, rxTestScheduler));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should emit windows given windowTimeSpan', () => {
    rxTestScheduler.run(
      ({hot, cold, time, expectSubscriptions, expectSource}) => {
        const source = hot('--1--2--^--a--b--c--d--e--f--g--h--|');
        const subs = '^--------------------------!';
        const timeSpan = time('----------|');
        //  10 frames            0---------1---------2------|
        const expected = 'x---------y---------z------|';
        const x = cold('---a--b--c|                 ');
        const y = cold('--d--e--f-|       ');
        const z = cold('-g--h--|');
        const values = {x, y, z};

        const result = source.pipe(windowTime(timeSpan, rxTestScheduler));

        expectSource(result).toBe(expected, values);
        expectSubscriptions(source.subscriptions).toBe(subs);
      }
    );
  });

  it('should emit windows given windowTimeSpan and windowCreationInterval', () => {
    rxTestScheduler.run(
      ({hot, time, cold, expectSubscriptions, expectSource}) => {
        const source = hot('--1--2--^--a--b--c--d--e--f--g--h--|');
        const subs = '^--------------------------!';
        const timeSpan = time('-----|');
        const interval = time('----------|');
        //  10 frames            0---------1---------2------|
        //  5                     ----|
        //  5                               ----|
        //  5                                         ----|
        const expected = 'x---------y---------z------|';
        const x = cold('---a-|                      ');
        const y = cold('--d--(e|)         ');
        const z = cold('-g--h|  ');
        const values = {x, y, z};

        const result = source.pipe(
          windowTime(timeSpan, interval, rxTestScheduler)
        );

        expectSource(result).toBe(expected, values);
        expectSubscriptions(source.subscriptions).toBe(subs);
      }
    );
  });

  it('should return a single empty window if source is empty', () => {
    rxTestScheduler.run(({cold, time, expectSubscriptions, expectSource}) => {
      const source = cold('|');
      const subs = '(^!)';
      const expected = '(w|)';
      const w = cold('|');
      const expectedValues = {w};
      const timeSpan = time('-----|');
      const interval = time('----------|');

      const result = source.pipe(
        windowTime(timeSpan, interval, rxTestScheduler)
      );

      expectSource(result).toBe(expected, expectedValues);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should split a Just source into a single window identical to source', () => {
    rxTestScheduler.run(({cold, time, expectSubscriptions, expectSource}) => {
      const source = cold('(a|)');
      const subs = '(^!)';
      const expected = '(w|)';
      const w = cold('(a|)');
      const expectedValues = {w};
      const timeSpan = time('-----|');
      const interval = time('----------|');

      const result = source.pipe(
        windowTime(timeSpan, interval, rxTestScheduler)
      );

      expectSource(result).toBe(expected, expectedValues);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should be able to split a never Observable into timely empty windows', () => {
    rxTestScheduler.run(
      ({hot, cold, time, expectSubscriptions, expectSource}) => {
        const source = hot('^----------');
        const subs = '^---------!';
        const expected = 'a--b--c--d-';
        const timeSpan = time('---|');
        const interval = time('---|');
        const a = cold('---|       ');
        const b = cold('---|    ');
        const c = cold('---| ');
        const d = cold('--');
        const unsub = '----------!';
        const expectedValues = {a, b, c, d};

        const result = source.pipe(
          windowTime(timeSpan, interval, rxTestScheduler)
        );

        expectSource(result, unsub).toBe(expected, expectedValues);
        expectSubscriptions(source.subscriptions).toBe(subs);
      }
    );
  });

  it('should emit an error-only window if outer is a simple throw-Observable', () => {
    rxTestScheduler.run(({cold, time, expectSubscriptions, expectSource}) => {
      const source = cold('#');
      const subs = '(^!)';
      const expected = '(w#)';
      const w = cold('#');
      const expectedValues = {w};
      const timeSpan = time('-----|');
      const interval = time('----------|');

      const result = source.pipe(
        windowTime(timeSpan, interval, rxTestScheduler)
      );

      expectSource(result).toBe(expected, expectedValues);
      expectSubscriptions(source.subscriptions).toBe(subs);
    });
  });

  it('should handle source Observable which eventually emits an error', () => {
    rxTestScheduler.run(
      ({hot, cold, time, expectSubscriptions, expectSource}) => {
        const source = hot('--1--2--^--a--b--c--d--e--f--g--h--#');
        const subs = '^--------------------------!';
        const timeSpan = time('-----|');
        const interval = time('----------|');
        //  10 frames            0---------1---------2------|
        //  5                     ----|
        //  5                               ----|
        //  5                                         ----|
        const expected = 'x---------y---------z------#';
        const x = cold('---a-|                      ');
        const y = cold('--d--(e|)         ');
        const z = cold('-g--h|  ');
        const values = {x, y, z};

        const result = source.pipe(
          windowTime(timeSpan, interval, rxTestScheduler)
        );

        expectSource(result).toBe(expected, values);
        expectSubscriptions(source.subscriptions).toBe(subs);
      }
    );
  });

  it('should emit windows given windowTimeSpan and windowCreationInterval, but outer is unsubscribed early', () => {
    rxTestScheduler.run(
      ({hot, cold, time, expectSubscriptions, expectSource}) => {
        const source = hot('--1--2--^--a--b--c--d--e--f--g--h--|');
        const subs = '^----------!                ';
        const timeSpan = time('-----|');
        const interval = time('----------|');
        //  10 frames              0---------1---------2------|
        //  5                      ----|
        //  5                                ----|
        //  5                                          ----|
        const expected = 'x---------y-                ';
        const x = cold('---a-|                      ');
        const y = cold('--                ');
        const unsub = '-----------!                ';
        const values = {x, y};

        const result = source.pipe(
          windowTime(timeSpan, interval, rxTestScheduler)
        );

        expectSource(result, unsub).toBe(expected, values);
        expectSubscriptions(source.subscriptions).toBe(subs);
      }
    );
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    rxTestScheduler.run(
      ({hot, cold, time, expectSubscriptions, expectSource}) => {
        const source = hot('--1--2--^--a--b--c--d--e--f--g--h--|');
        const sourcesubs = '^-------------!             ';
        const timeSpan = time('-----|');
        const interval = time('----------|');
        //  10 frames              0---------1---------2------|
        //  5                      ----|
        //  5                                ----|
        //  5                                          ----|
        const expected = 'x---------y----             ';
        const x = cold('---a-|                      ');
        const y = cold('--d--             ');
        const unsub = '--------------!             ';
        const values = {x, y};

        const result = source.pipe(
          mergeMap((x: string) => of(x)),
          windowTime(timeSpan, interval, rxTestScheduler),
          mergeMap((x: Observable<string>) => of(x))
        );

        expectSource(result, unsub).toBe(expected, values);
        expectSubscriptions(source.subscriptions).toBe(sourcesubs);
      }
    );
  });

  it('should not error if maxWindowSize is hit while nexting to other windows.', () => {
    rxTestScheduler.run(({cold, time, expectSource}) => {
      const source = cold(
        '                ----a---b---c---d---e---f---g---h---i---j---'
      );
      const windowTimeSpan = time('        ------------|');
      const windowCreationInterval = time('--------|');
      const maxWindowSize = 4;
      const a = cold('                     ----a---b---|');
      //                                   ------------|
      const b = cold('                             b---c---d---(e|)');
      const c = cold('                                     ----e---f---(g|)');
      const d = cold(
        '                                             ----g---h---(i|)'
      );
      const e = cold(
        '                                                     ----i---j--'
      );
      const f = cold(
        '                                                             ---'
      );
      const expected =
        '                   a-------b-------c-------d-------e-------f---';
      const killSub =
        '                    ------------------------------------------!';
      const values = {a, b, c, d, e, f};
      const result = source.pipe(
        windowTime(
          windowTimeSpan,
          windowCreationInterval,
          maxWindowSize,
          rxTestScheduler
        )
      );
      expectSource(result, killSub).toBe(expected, values);
    });
  });
});
import {expect} from 'chai';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions,
  time
} from '../helpers/marble-testing';
import {Observable, NEVER, of, UnsubscribedError, EMPTY} from 'rxjs';
import {windowToggle, tap, mergeMap} from 'rxjs/operators';
import {TestScheduler} from 'rxjs/testing';

declare const rxTestScheduler: TestScheduler;
declare const type: Function;
declare const asDiagram: Function;

/** @test {windowToggle} */
describe('windowToggle', () => {
  asDiagram('windowToggle')(
    'should emit windows governed by openings and closings',
    () => {
      const source = hot('--1--2--^-a--b--c--d--e--f--g--h-|');
      const subs = '^                        !';
      const e2 = cold('----w--------w--------w--|');
      const e2subs = '^                        !';
      const e3 = cold('-----|                ');
      //                                     -----(c|)
      //                                              -----(c|)
      const e3subs = [
        '    ^    !                ', // eslint-disable-line array-bracket-spacing
        '             ^    !       ',
        '                      ^  !'
      ];
      const expected = '----x--------y--------z--|';
      const x = cold('-b--c|                ');
      const y = cold('-e--f|       ');
      const z = cold('-h-|');
      const values = {x, y, z};

      const result = source.pipe(windowToggle(e2, () => e3));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(source.subscriptions).toBe(subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    }
  );

  it(
    'should emit windows that are opened by an observable from the first argument ' +
      'and closed by an observable returned by the function in the second argument',
    () => {
      const e1 = hot('--1--2--^--a--b--c--d--e--f--g--h--|');
      const e1subs = '^                          !';
      const e2 = cold('--------x-------x-------x--|');
      const e2subs = '^                          !';
      const e3 = cold('----------(x|)      ');
      //                                    ----------(x|)
      //                                            ----------(x|)
      const e3subs = [
        '        ^         !         ', // eslint-disable-line array-bracket-spacing
        '                ^         ! ',
        '                        ^  !'
      ];
      const expected = '--------x-------y-------z--|';
      const x = cold('-c--d--e--(f|)      ');
      const y = cold('--f--g--h-| ');
      const z = cold('---|');
      const values = {x, y, z};

      const source = e1.pipe(
        windowToggle(e2, (value: string) => {
          expect(value).to.equal('x');
          return e3;
        })
      );

      expectSource(source).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    }
  );

  it('should emit windows using constying cold closings', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
    const e1subs = '^                                  !      ';
    const e2 = cold('--x-----------y--------z---|              ');
    const e2subs = '^                          !              ';
    const close = [
      cold('---------------s--|                     '),
      cold('----(s|)                    '),
      cold('---------------(s|)')
    ];
    const closeSubs = [
      '  ^              !                        ', // eslint-disable-line array-bracket-spacing
      '              ^   !                       ',
      '                       ^           !      '
    ];
    const expected = '--x-----------y--------z-----------|      ';
    const x = cold('--b---c---d---e|                        ');
    const y = cold('--e-|                       ');
    const z = cold('-g---h------|      ');
    const values = {x, y, z};

    let i = 0;
    const result = e1.pipe(windowToggle(e2, () => close[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(close[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(close[1].subscriptions).toBe(closeSubs[1]);
    expectSubscriptions(close[2].subscriptions).toBe(closeSubs[2]);
  });

  it('should emit windows using constying hot closings', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|   ');
    const e1subs = '^                                  !   ';
    const e2 = cold('--x-----------y--------z---|           ');
    const e2subs = '^                          !           ';
    const closings = [
      {
        obs: hot('-1--^----------------s-|                   '), // eslint-disable-line key-spacing
        sub: '  ^              !                     '
      }, // eslint-disable-line key-spacing
      {
        obs: hot('-----3----4-------(s|)                 '), // eslint-disable-line key-spacing
        sub: '              ^   !                    '
      }, // eslint-disable-line key-spacing
      {
        obs: hot('-------3----4-------5----------------s|'), // eslint-disable-line key-spacing
        sub: '                       ^           !   '
      }
    ]; // eslint-disable-line key-spacing
    const expected = '--x-----------y--------z-----------|   ';
    const x = cold('--b---c---d---e|                     ');
    const y = cold('--e-|                    ');
    const z = cold('-g---h------|   ');
    const values = {x, y, z};

    let i = 0;
    const result = e1.pipe(windowToggle(e2, () => closings[i++].obs));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(closings[0].obs.subscriptions).toBe(closings[0].sub);
    expectSubscriptions(closings[1].obs.subscriptions).toBe(closings[1].sub);
    expectSubscriptions(closings[2].obs.subscriptions).toBe(closings[2].sub);
  });

  it('should emit windows using constying empty delayed closings', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|   ');
    const e1subs = '^                                  !   ';
    const e2 = cold('--x-----------y--------z---|           ');
    const e2subs = '^                          !           ';
    const close = [
      cold('---------------|                     '),
      cold('----|                    '),
      cold('---------------|')
    ];
    const expected = '--x-----------y--------z-----------|   ';
    const x = cold('--b---c---d---e|                     ');
    const y = cold('--e-|                    ');
    const z = cold('-g---h------|   ');
    const values = {x, y, z};

    let i = 0;
    const result = e1.pipe(windowToggle(e2, () => close[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should emit windows using constying cold closings, outer unsubscribed early', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
    const e1subs = '^                !                        ';
    const e2 = cold('--x-----------y--------z---|              ');
    const e2subs = '^                !                        ';
    const close = [
      cold('-------------s---|                     '),
      cold('-----(s|)                   '),
      cold('---------------(s|)')
    ];
    const closeSubs = [
      '  ^            !                          ',
      '              ^  !                        '
    ];
    const expected = '--x-----------y---                        ';
    const x = cold('--b---c---d--|                          ');
    const y = cold('--e-                        ');
    const unsub = '                 !                        ';
    const values = {x, y};

    let i = 0;
    const result = e1.pipe(windowToggle(e2, () => close[i++]));

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(close[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(close[1].subscriptions).toBe(closeSubs[1]);
    expectSubscriptions(close[2].subscriptions).toBe([]);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
    const e1subs = '^              !                          ';
    const e2 = cold('--x-----------y--------z---|              ');
    const e2subs = '^              !                          ';
    const close = [
      cold('---------------s--|                     '),
      cold('----(s|)                    '),
      cold('---------------(s|)')
    ];
    const closeSubs = [
      '  ^            !                          ',
      '              ^!                          '
    ];
    const expected = '--x-----------y-                          ';
    const x = cold('--b---c---d---                          ');
    const y = cold('--                          ');
    const unsub = '               !                          ';
    const values = {x, y};

    let i = 0;
    const result = e1.pipe(
      mergeMap(x => of(x)),
      windowToggle(e2, () => close[i++]),
      mergeMap(x => of(x))
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(close[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(close[1].subscriptions).toBe(closeSubs[1]);
  });

  it('should dispose window Subjects if the outer is unsubscribed early', () => {
    const source = hot('--a--b--c--d--e--f--g--h--|');
    const open = cold('o-------------------------|');
    const sourceSubs = '^        !                 ';
    const expected = 'x---------                 ';
    const x = cold('--a--b--c-                 ');
    const unsub = '         !                 ';
    const late = time('---------------|           ');
    const values = {x};

    let window: Observable<string>;
    const result = source.pipe(
      windowToggle(open, () => NEVER),
      tap(w => {
        window = w;
      })
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    rxTestScheduler.schedule(() => {
      expect(() => {
        window.subscribe();
      }).to.throw(UnsubscribedError);
    }, late);
  });

  it('should propagate error thrown from closingSelector', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
    const e1subs = '^             !                           ';
    const e2 = cold('--x-----------y--------z---|              ');
    const e2subs = '^             !                           ';
    const close = [
      cold('---------------s--|                     '),
      cold('----(s|)                    '),
      cold('---------------(s|)')
    ];
    const expected = '--x-----------#----                       ';
    const x = cold('--b---c---d-#                           ');
    const values = {x: x};

    let i = 0;
    const result = e1.pipe(
      windowToggle(e2, () => {
        if (i === 1) {
          throw 'error';
        }
        return close[i++];
      })
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should propagate error emitted from a closing', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    const e1subs = '^             !                     ';
    const e2 = cold('--x-----------y--------z---|        ');
    const e2subs = '^             !                     ';
    const close = [
      cold('---------------s--|               '),
      cold('#                     ')
    ];
    const expected = '--x-----------(y#)                  ';
    const x = cold('--b---c---d-#                     ');
    const y = cold('#                     ');
    const values = {x, y};

    let i = 0;
    const result = e1.pipe(windowToggle(e2, () => close[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should propagate error emitted late from a closing', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    const e1subs = '^                  !                ';
    const e2 = cold('--x-----------y--------z---|        ');
    const e2subs = '^                  !                ';
    const close = [
      cold('---------------s--|               '),
      cold('-----#                ')
    ];
    const expected = '--x-----------y----#                ';
    const x = cold('--b---c---d---e|                  ');
    const y = cold('--e--#                ');
    const values = {x, y};

    let i = 0;
    const result = e1.pipe(windowToggle(e2, () => close[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle errors', () => {
    const e1 = hot('--a--^---b---c---d---e--#                ');
    const e1subs = '^                  !                ';
    const e2 = cold('--x-----------y--------z---|        ');
    const e2subs = '^                  !                ';
    const close = [
      cold('---------------s--|               '),
      cold('-------s|             ')
    ];
    const expected = '--x-----------y----#                ';
    const x = cold('--b---c---d---e|                  ');
    const y = cold('--e--#                ');
    const values = {x, y};

    let i = 0;
    const result = e1.pipe(windowToggle(e2, () => close[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle empty source', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('--o-----|');
    const e2subs = '(^!)';
    const e3 = cold('-----c--|');
    const expected = '|';

    const result = e1.pipe(windowToggle(e2, () => e3));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const e2 = cold('--o-----|');
    const e2subs = '(^!)';
    const e3 = cold('-----c--|');
    const expected = '#';

    const result = e1.pipe(windowToggle(e2, () => e3));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle never', () => {
    const e1 = hot('-');
    const e1subs = '^                                           !';
    const e2 = cold('--o-----o------o-----o---o-----|             ');
    const e2subs = '^                              !             ';
    const e3 = cold('--c-|                                      ');
    const expected = '--u-----v------x-----y---z-------------------';
    const u = cold('--|                                        ');
    const v = cold('--|                                  ');
    const x = cold('--|                           ');
    const y = cold('--|                     ');
    const z = cold('--|                 ');
    const unsub = '                                            !';
    const values = {u: u, v: v, x, y, z};

    const result = e1.pipe(windowToggle(e2, () => e3));

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle a never opening Observable', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    const e1subs = '^                                  !';
    const e2 = cold('-');
    const e2subs = '^                                  !';
    const e3 = cold('--c-|                               ');
    const expected = '-----------------------------------|';

    const result = e1.pipe(windowToggle(e2, () => e3));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle a never closing Observable', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    const e1subs = '^                                  !';
    const e2 = cold('---o---------------o-----------|    ');
    const e2subs = '^                              !    ';
    const e3 = cold('-');
    const expected = '---x---------------y---------------|';
    const x = cold('-b---c---d---e---f---g---h------|');
    const y = cold('-f---g---h------|');
    const values = {x, y};

    const result = e1.pipe(windowToggle(e2, () => e3));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle opening Observable that just throws', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    const e1subs = '(^!)';
    const e2 = cold('#');
    const e2subs = '(^!)';
    const e3 = cold('--c-|');
    const subs = '(^!)';
    const expected = '#';

    const result = e1.pipe(windowToggle(e2, () => e3));

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle empty closing observable', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    const e1subs = '^                                  !';
    const e2 = cold('---o---------------o-----------|    ');
    const e2subs = '^                              !    ';
    const e3 = EMPTY;
    const expected = '---x---------------y---------------|';
    const x = cold('|');
    const y = cold('|');
    const values = {x, y};

    const result = e1.pipe(windowToggle(e2, () => e3));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
});
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {TestScheduler} from 'rxjs/testing';
import {windowWhen, mergeMap} from 'rxjs/operators';
import {Observable, of} from 'rxjs';

declare const type: Function;
declare const asDiagram: Function;

declare const rxTestScheduler: TestScheduler;

/** @test {windowWhen} */
describe('windowWhen operator', () => {
  asDiagram('windowWhen')('should emit windows that close and reopen', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--h--i--|');
    const e1subs = '^                          !';
    const e2 = cold('-----------|                ');
    const e2subs = [
      '^          !                ',
      '           ^          !     ',
      '                      ^    !'
    ];
    const a = cold('---b--c--d-|                ');
    const b = cold('-e--f--g--h|     ');
    const c = cold('--i--|');
    const expected = 'a----------b----------c----|';
    const values = {a: a, b: b, c: c};

    const source = e1.pipe(windowWhen(() => e2));

    expectSource(source).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should emit windows using constying cold closings', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|     ');
    const e1subs = '^                                  !     ';
    const closings = [
      cold('-----------------s--|                    '),
      cold('-----(s|)               '),
      cold('---------------(s|)')
    ];
    const closeSubs = [
      '^                !                       ',
      '                 ^    !                  ',
      '                      ^            !     '
    ];
    const expected = 'x----------------y----z------------|     ';
    const x = cold('----b---c---d---e|                       ');
    const y = cold('---f-|                  ');
    const z = cold('--g---h------|     ');
    const values = {x: x, y: y, z: z};

    let i = 0;
    const result = e1.pipe(windowWhen(() => closings[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
    expectSubscriptions(closings[2].subscriptions).toBe(closeSubs[2]);
  });

  it('should emit windows using constying hot closings', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|   ');
    const subs = '^                                  !   ';
    const closings = [
      {
        obs: hot('-1--^----------------s-|                   '), // eslint-disable-line key-spacing
        sub: '^                !                     '
      }, // eslint-disable-line key-spacing
      {
        obs: hot('-----3----4-----------(s|)             '), // eslint-disable-line key-spacing
        sub: '                 ^    !                '
      }, // eslint-disable-line key-spacing
      {
        obs: hot('-------3----4-------5----------------s|'), // eslint-disable-line key-spacing
        sub: '                      ^            !   '
      }
    ]; // eslint-disable-line key-spacing
    const expected = 'x----------------y----z------------|   ';
    const x = cold('----b---c---d---e|                     ');
    const y = cold('---f-|                ');
    const z = cold('--g---h------|   ');
    const values = {x: x, y: y, z: z};

    let i = 0;
    const result = e1.pipe(windowWhen(() => closings[i++].obs));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(closings[0].obs.subscriptions).toBe(closings[0].sub);
    expectSubscriptions(closings[1].obs.subscriptions).toBe(closings[1].sub);
    expectSubscriptions(closings[2].obs.subscriptions).toBe(closings[2].sub);
  });

  it('should emit windows using constying empty delayed closings', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|  ');
    const e1subs = '^                                  !  ';
    const closings = [
      cold('-----------------|                    '),
      cold('-----|               '),
      cold('---------------|')
    ];
    const closeSubs = [
      '^                !                    ',
      '                 ^    !               ',
      '                      ^            !  '
    ];
    const expected = 'x----------------y----z------------|  ';
    const x = cold('----b---c---d---e|                    ');
    const y = cold('---f-|               ');
    const z = cold('--g---h------|  ');
    const values = {x: x, y: y, z: z};

    let i = 0;
    const result = e1.pipe(windowWhen(() => closings[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
    expectSubscriptions(closings[2].subscriptions).toBe(closeSubs[2]);
  });

  it('should emit windows using constying cold closings, outer unsubscribed early', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|     ');
    const e1subs = '^                    !                   ';
    const closings = [
      cold('-----------------s--|                    '),
      cold('---------(s|)           ')
    ];
    const closeSubs = [
      '^                !                       ',
      '                 ^   !                   '
    ];
    const expected = 'x----------------y----                   ';
    const x = cold('----b---c---d---e|                       ');
    const y = cold('---f-                   ');
    const unsub = '                     !                   ';
    const values = {x: x, y: y};

    let i = 0;
    const result = e1.pipe(windowWhen(() => closings[i++]));

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|     ');
    const e1subs = '^                    !                   ';
    const closings = [
      cold('-----------------s--|                    '),
      cold('---------(s|)           ')
    ];
    const closeSubs = [
      '^                !                       ',
      '                 ^   !                   '
    ];
    const expected = 'x----------------y----                   ';
    const x = cold('----b---c---d---e|                       ');
    const y = cold('---f-                   ');
    const unsub = '                     !                   ';
    const values = {x: x, y: y};

    let i = 0;
    const result = e1.pipe(
      mergeMap((x: string) => of(x)),
      windowWhen(() => closings[i++]),
      mergeMap((x: Observable<string>) => of(x))
    );

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
  });

  it('should propagate error thrown from closingSelector', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|     ');
    const e1subs = '^                !                       ';
    const closings = [
      cold('-----------------s--|                    '),
      cold('-----(s|)               '),
      cold('---------------(s|)')
    ];
    const closeSubs = ['^                !                       '];
    const expected = 'x----------------(y#)                    ';
    const x = cold('----b---c---d---e|                       ');
    const y = cold('#                       ');
    const values = {x: x, y: y};

    let i = 0;
    const result = e1.pipe(
      windowWhen(() => {
        if (i === 1) {
          throw 'error';
        }
        return closings[i++];
      })
    );

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
  });

  it('should propagate error emitted from a closing', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|     ');
    const e1subs = '^                !                       ';
    const closings = [
      cold('-----------------s--|                    '),
      cold('#                       ')
    ];
    const closeSubs = [
      '^                !                       ',
      '                 (^!)                    '
    ];
    const expected = 'x----------------(y#)                    ';
    const x = cold('----b---c---d---e|                       ');
    const y = cold('#                       ');
    const values = {x: x, y: y};

    let i = 0;
    const result = e1.pipe(windowWhen(() => closings[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
  });

  it('should propagate error emitted late from a closing', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|     ');
    const e1subs = '^                     !                  ';
    const closings = [
      cold('-----------------s--|                    '),
      cold('-----#                  ')
    ];
    const closeSubs = [
      '^                !                       ',
      '                 ^    !                  '
    ];
    const expected = 'x----------------y----#                  ';
    const x = cold('----b---c---d---e|                       ');
    const y = cold('---f-#                  ');
    const values = {x: x, y: y};

    let i = 0;
    const result = e1.pipe(windowWhen(() => closings[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
  });

  it('should propagate errors emitted from the source', () => {
    const e1 = hot('--a--^---b---c---d---e---f-#                  ');
    const e1subs = '^                     !                  ';
    const closings = [
      cold('-----------------s--|                    '),
      cold('-------(s|)             ')
    ];
    const closeSubs = [
      '^                !                       ',
      '                 ^    !                  '
    ];
    const expected = 'x----------------y----#                  ';
    const x = cold('----b---c---d---e|                       ');
    const y = cold('---f-#                  ');
    const values = {x: x, y: y};

    let i = 0;
    const result = e1.pipe(windowWhen(() => closings[i++]));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
  });

  it('should handle empty source', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('-----c--|');
    const e2subs = '(^!)';
    const expected = '(w|)';
    const values = {w: cold('|')};

    const result = e1.pipe(windowWhen(() => e2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle a never source', () => {
    const e1 = cold('-');
    const unsub = '                 !';
    const e1subs = '^                !';
    const e2 = cold('-----c--|');
    //                   -----c--|
    //                        -----c--|
    //                             -----c--|
    const e2subs = [
      '^    !            ',
      '     ^    !       ',
      '          ^    !  ',
      '               ^ !'
    ];
    const win = cold('-----|');
    const d = cold('---');
    const expected = 'a----b----c----d--';
    const values = {a: win, b: win, c: win, d: d};

    const result = e1.pipe(windowWhen(() => e2));

    expectSource(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle throw', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const e2 = cold('-----c--|');
    const e2subs = '(^!)';
    const win = cold('#');
    const expected = '(w#)';
    const values = {w: win};

    const result = e1.pipe(windowWhen(() => e2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle a never closing Observable', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    const e1subs = '^                                  !';
    const e2 = cold('-');
    const e2subs = '^                                  !';
    const expected = 'x----------------------------------|';
    const x = cold('----b---c---d---e---f---g---h------|');
    const values = {x: x};

    const result = e1.pipe(windowWhen(() => e2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should handle a throw closing Observable', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    const e1subs = '(^!)                                ';
    const e2 = cold('#');
    const e2subs = '(^!)                                ';
    const expected = '(x#)                                ';
    const x = cold('#                                   ');
    const values = {x: x};

    const result = e1.pipe(windowWhen(() => e2));

    expectSource(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
});
import {expect} from 'chai';
import {lowerCaseO} from '../helpers/test-helper';
import {
  hot,
  cold,
  expectSource,
  expectSubscriptions
} from '../helpers/marble-testing';
import {withLatestFrom, mergeMap, delay} from 'rxjs/operators';
import {of} from 'rxjs';

declare function asDiagram(arg: string): Function;

/** @test {withLatestFrom} */
describe('withLatestFrom operator', () => {
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
