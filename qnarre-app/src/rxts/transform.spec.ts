//import {buffer, mergeMap, take} from 'rxjs/operators';
//import {EMPTY, NEVER, throwError, of} from 'rxjs';
import {TestScheduler, sourceMatcher} from './testing';

declare function asDiagram(arg: string): Function;

describe('buffer', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('buffer')('should emit buffers that close and reopen', () => {
    testScheduler.run(({hot, expectSource}) => {
      const a = hot('   -a-b-c-d-e-f-g-h-i-|');
      const b = hot('   -----B-----B-----B-|');
      const expected = '-----x-----y-----z-|';
      const expectedValues = {
        x: ['a', 'b', 'c'],
        y: ['d', 'e', 'f'],
        z: ['g', 'h', 'i']
      };
      expectSource(a.pipe(buffer(b))).toBe(expected, expectedValues);
    });
  });
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(buffer(of('foo'))); // $ExpectType Observable<number[]>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(buffer()); // $ExpectError
    const p = of(1, 2, 3).pipe(buffer(6)); // $ExpectError
  });

  it('should work with empty and empty selector', () => {
    testScheduler.run(({expectSource}) => {
      const a = EMPTY;
      const b = EMPTY;
      const expected = '|';
      expectSource(a.pipe(buffer(b))).toBe(expected);
    });
  });

  it('should work with empty and non-empty selector', () => {
    testScheduler.run(({hot, expectSource}) => {
      const a = EMPTY;
      const b = hot('-----a-----');
      const expected = '|';
      expectSource(a.pipe(buffer(b))).toBe(expected);
    });
  });

  it('should work with non-empty and empty selector', () => {
    testScheduler.run(({hot, expectSource}) => {
      const a = hot('--1--2--^--3--4--5---6----7--8--9---0---|');
      const b = EMPTY;
      const expected = '|';
      expectSource(a.pipe(buffer(b))).toBe(expected);
    });
  });

  it('should work with never and never selector', () => {
    testScheduler.run(({expectSource}) => {
      const a = NEVER;
      const b = NEVER;
      const expected = '-';
      expectSource(a.pipe(buffer(b))).toBe(expected);
    });
  });

  it('should work with never and empty selector', () => {
    testScheduler.run(({expectSource}) => {
      const a = NEVER;
      const b = EMPTY;
      const expected = '|';
      expectSource(a.pipe(buffer(b))).toBe(expected);
    });
  });

  it('should work with empty and never selector', () => {
    testScheduler.run(({expectSource}) => {
      const a = EMPTY;
      const b = NEVER;
      const expected = '|';
      expectSource(a.pipe(buffer(b))).toBe(expected);
    });
  });

  it('should work with non-empty and throw selector', () => {
    testScheduler.run(({hot, expectSource}) => {
      const a = hot('---^--a--');
      const b = throwError(new Error('too bad'));
      const expected = '#';
      expectSource(a.pipe(buffer(b))).toBe(
        expected,
        null,
        new Error('too bad')
      );
    });
  });

  it('should work with throw and non-empty selector', () => {
    testScheduler.run(({hot, expectSource}) => {
      const a = throwError(new Error('too bad'));
      const b = hot('---^--a--');
      const expected = '#';
      expectSource(a.pipe(buffer(b))).toBe(
        expected,
        null,
        new Error('too bad')
      );
    });
  });

  it('should work with error', () => {
    testScheduler.run(({hot, expectSource}) => {
      const a = hot('---^-------#', undefined, new Error('too bad'));
      const b = hot('---^--------');
      const expected = '--------#';
      expectSource(a.pipe(buffer(b))).toBe(
        expected,
        null,
        new Error('too bad')
      );
    });
  });

  it('should work with error and non-empty selector', () => {
    testScheduler.run(({hot, expectSource}) => {
      const a = hot('---^-------#', undefined, new Error('too bad'));
      const b = hot('---^---a----');
      const expected = '----a---#';
      expectSource(a.pipe(buffer(b))).toBe(
        expected,
        {a: []},
        new Error('too bad')
      );
    });
  });

  it('should work with selector', () => {
    // Buffer Boundaries Simple (RxJS 4)
    testScheduler.run(({hot, expectSource}) => {
      const a = hot('--1--2--^--3--4--5---6----7--8--9---0---|');
      const b = hot('--------^--a-------b---cd---------e---f---|');
      const expected = '     ---a-------b---cd---------e---f-|';
      const expectedValues = {
        a: ['3'],
        b: ['4', '5'],
        c: ['6'],
        d: [] as string[],
        e: ['7', '8', '9'],
        f: ['0']
      };
      expectSource(a.pipe(buffer(b))).toBe(expected, expectedValues);
    });
  });

  it(' work with selector completed', () => {
    // Buffshoulder Boundaries onCompletedBoundaries (RxJS 4)
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('--1--2--^--3--4--5---6----7--8--9---0---|');
      const subs = '         ^----------------!               ';
      const b = hot('--------^--a-------b---cd|               ');
      const expected = '     ---a-------b---cd|               ';
      const expectedValues = {
        a: ['3'],
        b: ['4', '5'],
        c: ['6'],
        d: [] as string[]
      };
      expectSource(a.pipe(buffer(b))).toBe(expected, expectedValues);
      expectSubscriptions(a.subscriptions).toBe(subs);
    });
  });

  it('should allow unsubscribing the result Observable early', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('--1--2--^--3--4--5---6----7--8--9---0---|');
      const unsub = '        --------------!                  ';
      const subs = '         ^-------------!                  ';
      const b = hot('--------^--a-------b---cd|               ');
      const expected = '     ---a-------b---                  ';
      const expectedValues = {
        a: ['3'],
        b: ['4', '5']
      };
      expectSource(a.pipe(buffer(b)), unsub).toBe(expected, expectedValues);
      expectSubscriptions(a.subscriptions).toBe(subs);
    });
  });

  it('should not break unsubscription chains when unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('--1--2--^--3--4--5---6----7--8--9---0---|');
      const subs = '         ^-------------!                  ';
      const b = hot('--------^--a-------b---cd|               ');
      const expected = '     ---a-------b---                  ';
      const unsub = '        --------------!                  ';
      const expectedValues = {
        a: ['3'],
        b: ['4', '5']
      };

      const result = a.pipe(
        mergeMap((x: any) => of(x)),
        buffer(b),
        mergeMap((x: any) => of(x))
      );

      expectSource(result, unsub).toBe(expected, expectedValues);
      expectSubscriptions(a.subscriptions).toBe(subs);
    });
  });

  it('should work with non-empty and selector error', () => {
    // Buffer Boundaries onErrorSource (RxJS 4)
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('--1--2--^--3-----#', {'3': 3}, new Error('too bad'));
      const subs = '         ^--------!';
      const b = hot('--------^--a--b---');
      const expected = '     ---a--b--#';
      const expectedValues = {
        a: [3],
        b: [] as string[]
      };
      expectSource(a.pipe(buffer(b))).toBe(
        expected,
        expectedValues,
        new Error('too bad')
      );
      expectSubscriptions(a.subscriptions).toBe(subs);
    });
  });

  it('should work with non-empty and empty selector error', () => {
    testScheduler.run(({hot, expectSource}) => {
      const a = hot('--1--2--^--3--4--5---6----7--8--9---0---|');
      const b = hot(
        '--------^----------------#',
        undefined,
        new Error('too bad')
      );
      const expected = '     -----------------#';
      expectSource(a.pipe(buffer(b))).toBe(
        expected,
        null,
        new Error('too bad')
      );
    });
  });

  it('should work with non-empty and selector error', () => {
    // Buffer Boundaries onErrorBoundaries (RxJS 4)
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const obj = {a: true, b: true, c: true};
      const a = hot('--1--2--^--3--4--5---6----7--8--9---0---|');
      const subs = '         ^----------------!';
      const b = hot('--------^--a-------b---c-#', obj, new Error('too bad'));
      const expected = '     ---a-------b---c-#';
      const expectedValues = {
        a: ['3'],
        b: ['4', '5'],
        c: ['6']
      };
      expectSource(a.pipe(buffer(b))).toBe(
        expected,
        expectedValues,
        new Error('too bad')
      );
      expectSubscriptions(a.subscriptions).toBe(subs);
    });
  });

  it('should unsubscribe notifier when source unsubscribed', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('--1--2--^--3--4--5---6----7--8--9---0---|');
      const unsub = '        --------------!                  ';
      const subs = '         ^-------------!                  ';
      const b = hot('--------^--a-------b---cd|               ');
      const bsubs = '        ^-------------!                  ';
      const expected = '     ---a-------b---                  ';
      const expectedValues = {
        a: ['3'],
        b: ['4', '5']
      };

      expectSource(a.pipe(buffer(b)), unsub).toBe(expected, expectedValues);
      expectSubscriptions(a.subscriptions).toBe(subs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should unsubscribe notifier when source unsubscribed', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('   -a-b-c-d-e-f-g-h-i-|');
      const b = hot('   -----1-----2-----3-|');
      const bsubs = '   ^----!';
      const expected = '-----(x|)';
      const expectedValues = {
        x: ['a', 'b', 'c']
      };

      expectSource(a.pipe(buffer(b), take(1))).toBe(expected, expectedValues);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });
});

describe('bufferCount', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('bufferCount(3,2)')('should emit buffers at intervals', () => {
    testScheduler.run(({hot, expectSource}) => {
      const values = {
        v: ['a', 'b', 'c'],
        w: ['c', 'd', 'e'],
        x: ['e', 'f', 'g'],
        y: ['g', 'h', 'i'],
        z: ['i']
      };
      const e1 = hot('  --a--b--c--d--e--f--g--h--i--|');
      const expected = '--------v-----w-----x-----y--(z|)';

      expectSource(e1.pipe(bufferCount(3, 2))).toBe(expected, values);
    });
  });
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(bufferCount(1)); // $ExpectType Observable<number[]>
    const p = of(1, 2, 3).pipe(bufferCount(1, 7)); // $ExpectType Observable<number[]>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(bufferCount()); // $ExpectError
  });

  it('should enforce type of bufferSize', () => {
    const o = of(1, 2, 3).pipe(bufferCount('7')); // $ExpectError
  });

  it('should enforce type of startBufferEvery', () => {
    const o = of(1, 2, 3).pipe(bufferCount(1, '7')); // $ExpectError
  });

  it('should emit buffers at buffersize of intervals if not specified', () => {
    testScheduler.run(({hot, expectSource}) => {
      const values = {
        x: ['a', 'b'],
        y: ['c', 'd'],
        z: ['e', 'f']
      };
      const e1 = hot('  --a--b--c--d--e--f--|');
      const expected = '-----x-----y-----z--|';

      expectSource(e1.pipe(bufferCount(2))).toBe(expected, values);
    });
  });

  it('should buffer properly (issue #2062)', () => {
    const item$ = new Subject<number>();
    const results: any[] = [];
    item$.pipe(bufferCount(3, 1)).subscribe(value => {
      results.push(value);

      if (value.join() === '1,2,3') {
        item$.next(4);
      }
    });

    item$.next(1);
    item$.next(2);
    item$.next(3);

    expect(results).to.deep.equal([
      [1, 2, 3],
      [2, 3, 4]
    ]);
  });

  it('should emit partial buffers if source completes before reaching specified buffer count', () => {
    testScheduler.run(({hot, expectSource}) => {
      const e1 = hot('  --a--b--c--d--|');
      const expected = '--------------(x|)';

      expectSource(e1.pipe(bufferCount(5))).toBe(expected, {
        x: ['a', 'b', 'c', 'd']
      });
    });
  });

  it('should emit full buffer then last partial buffer if source completes', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a^-b--c--d--e--|');
      const e1subs = '     ^-------------!';
      const expected = '   --------y-----(z|)';

      expectSource(e1.pipe(bufferCount(3))).toBe(expected, {
        y: ['b', 'c', 'd'],
        z: ['e']
      });
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should emit buffers at intervals, but stop when result is unsubscribed early', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        v: ['a', 'b', 'c'],
        w: ['c', 'd', 'e']
      };
      const e1 = hot('  --a--b--c--d--e--f--g--h--i--|');
      const unsub = '   ------------------!           ';
      const subs = '    ^-----------------!           ';
      const expected = '--------v-----w----           ';

      expectSource(e1.pipe(bufferCount(3, 2)), unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        v: ['a', 'b', 'c'],
        w: ['c', 'd', 'e']
      };
      const e1 = hot('  --a--b--c--d--e--f--g--h--i--|');
      const subs = '    ^-----------------!           ';
      const expected = '--------v-----w----           ';
      const unsub = '   ------------------!           ';

      const result = e1.pipe(
        mergeMap((x: any) => of(x)),
        bufferCount(3, 2),
        mergeMap((x: any) => of(x))
      );

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should raise error if source raise error before reaching specified buffer count', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--c--d--#');
      const e1subs = '  ^-------------!';
      const expected = '--------------#';

      expectSource(e1.pipe(bufferCount(5))).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should emit buffers with specified skip count when skip count is less than window count', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const values = {
        v: ['a', 'b', 'c'],
        w: ['b', 'c', 'd'],
        x: ['c', 'd', 'e'],
        y: ['d', 'e'],
        z: ['e']
      };
      const e1 = hot('  --a--b--c--d--e--|');
      const e1subs = '  ^----------------!';
      const expected = '--------v--w--x--(yz|)';

      expectSource(e1.pipe(bufferCount(3, 1))).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should emit buffers with specified skip count when skip count is more than window count', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  --a--b--c--d--e--|');
      const e1subs = '  ^----------------!';
      const expected = '-----y--------z--|';
      const values = {
        y: ['a', 'b'],
        z: ['d', 'e']
      };

      expectSource(e1.pipe(bufferCount(2, 3))).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });
});

describe('bufferTime', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('bufferTime(100)')('should emit buffers at intervals', () => {
    testScheduler.run(({hot, time, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a---b---c---d---e---f---g-----|   ');
      const subs = '    ^--------------------------------!   ';
      const t = time('  ----------|                          ');
      const expected = '----------w---------x---------y--(z|)';
      const values = {
        w: ['a', 'b'],
        x: ['c', 'd', 'e'],
        y: ['f', 'g'],
        z: [] as string[]
      };

      const result = e1.pipe(
        bufferTime(t, null, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(bufferTime(1)); // $ExpectType Observable<number[]>
    const p = of(1, 2, 3).pipe(bufferTime(1, asyncScheduler)); // $ExpectType Observable<number[]>
  });

  it('should support a bufferCreationInterval', () => {
    const o = of(1, 2, 3).pipe(bufferTime(1, 6)); // $ExpectType Observable<number[]>
    const p = of(1, 2, 3).pipe(bufferTime(1, 6, asyncScheduler)); // $ExpectType Observable<number[]>
    const q = of(1, 2, 3).pipe(bufferTime(1, undefined)); // $ExpectType Observable<number[]>
    const r = of(1, 2, 3).pipe(bufferTime(1, null)); // $ExpectType Observable<number[]>
  });

  it('should support a maxBufferSize', () => {
    const o = of(1, 2, 3).pipe(bufferTime(1, 6, 3)); // $ExpectType Observable<number[]>
    const p = of(1, 2, 3).pipe(bufferTime(1, 6, 3, asyncScheduler)); // $ExpectType Observable<number[]>
    const q = of(1, 2, 3).pipe(bufferTime(1, undefined, 3)); // $ExpectType Observable<number[]>
    const r = of(1, 2, 3).pipe(bufferTime(1, null, 3)); // $ExpectType Observable<number[]>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(bufferTime()); // $ExpectError
  });

  it('should enforce type of bufferTimeSpan', () => {
    const o = of(1, 2, 3).pipe(bufferTime('3')); // $ExpectError
  });

  it('should enforce type of scheduler', () => {
    const o = of(1, 2, 3).pipe(bufferTime(3, '3')); // $ExpectError
  });

  it('should enforce type of bufferCreationInterval', () => {
    const o = of(1, 2, 3).pipe(bufferTime(3, '3', asyncScheduler)); // $ExpectError
  });

  it('should enforce type of maxBufferSize', () => {
    const o = of(1, 2, 3).pipe(bufferTime(3, 3, '3', asyncScheduler)); // $ExpectError
  });

  it('should emit buffers at intervals test 2', () => {
    testScheduler.run(({hot, time, expectSource}) => {
      const e1 = hot(
        '  ---------a---------b---------c---------d---------e---------g--------|   '
      );
      const t = time(
        '  --------------------------------|                                       '
      );
      const expected =
        '--------------------------------x-------------------------------y---(z|)';
      const values = {
        x: ['a', 'b', 'c'],
        y: ['d', 'e', 'g'],
        z: [] as string[]
      };

      const result = e1.pipe(
        bufferTime(t, null, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result).toBe(expected, values);
    });
  });

  it('should emit buffers at intervals or when the buffer is full', () => {
    testScheduler.run(({hot, time, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a---b---c---d---e---f---g-----|   ');
      const subs = '    ^--------------------------------!   ';
      const t = time('  ----------|                          ');
      const expected = '-------w-------x-------y---------(z|)';
      const values = {
        w: ['a', 'b'],
        x: ['c', 'd'],
        y: ['e', 'f'],
        z: ['g']
      };

      const result = e1.pipe(bufferTime(t, null, 2, testScheduler));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should emit buffers at intervals or when the buffer is full test 2', () => {
    testScheduler.run(({hot, time, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a---b---c---d---e---f---g-----|   ');
      const subs = '    ^--------------------------------!   ';
      const t = time('  ----------|                          ');
      const expected = '----------w--------x---------y---(z|)';
      const values = {
        w: ['a', 'b'],
        x: ['c', 'd', 'e'],
        y: ['f', 'g'],
        z: [] as string[]
      };

      const result = e1.pipe(bufferTime(t, null, 3, testScheduler));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should emit buffers that have been created at intervals and close after the specified delay', () => {
    testScheduler.run(({hot, time, expectSource}) => {
      const e1 = hot(
        '       ---a---b---c----d----e----f----g----h----i----(k|)'
      );
      //                     --------------------*--------------------*----  start interval
      //                     ---------------------|                          timespans
      //                                         ---------------------|
      //                                                              -----|
      const t = time(
        '       ---------------------|                            '
      );
      const interval = time(
        '--------------------|                             '
      );
      const expected =
        '     ---------------------x-------------------y----(z|)';
      const values = {
        x: ['a', 'b', 'c', 'd', 'e'],
        y: ['e', 'f', 'g', 'h', 'i'],
        z: ['i', 'k']
      };

      const result = e1.pipe(
        bufferTime(t, interval, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result).toBe(expected, values);
    });
  });

  it(
    'should emit buffers that have been created at intervals and close after the specified delay ' +
      'or when the buffer is full',
    () => {
      testScheduler.run(({hot, time, expectSource}) => {
        const e1 = hot('  ---a---b---c----d----e----f----g----h----i----(k|)');
        //                --------------------*--------------------*----  start interval
        //                ---------------------|                          timespans
        //                                    ---------------------|
        //                                                         -----|
        const t = time('  ---------------------|                            ');
        const interval = time('                --------------------|        ');
        const expected = '----------------x-------------------y---------(z|)';
        const values = {
          x: ['a', 'b', 'c', 'd'],
          y: ['e', 'f', 'g', 'h'],
          z: ['i', 'k']
        };

        const result = e1.pipe(bufferTime(t, interval, 4, testScheduler));

        expectSource(result).toBe(expected, values);
      });
    }
  );

  it('should emit buffers with timeSpan 10 and creationInterval 7', () => {
    testScheduler.run(({hot, time, expectSource, expectSubscriptions}) => {
      const e1 = hot('--1--^2--3---4---5--6--7---8----9------------|   ');
      //                   -------*------*------*------*------*----- creation interval
      //                   ----------|                               timespans
      //                          ----------|
      //                                 ----------|
      //                                        ----------|
      //                                               ----------|
      //                                                      ----------|
      const e1subs = '     ^---------------------------------------!   ';
      const t = time('     ----------|');
      const interval = time('        -------|');
      const expected = '   ----------a------b------c------d------e-(f|)';
      const values = {
        a: ['2', '3', '4'],
        b: ['4', '5', '6'],
        c: ['6', '7', '8'],
        d: ['8', '9'],
        e: [] as string[],
        f: [] as string[]
      };

      const result = e1.pipe(
        bufferTime(t, interval, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should emit buffers but handle source ending with an error', () => {
    testScheduler.run(({hot, time, expectSource}) => {
      const e1 = hot('--1--^2--3---4---5--6--7---8----9------------#');
      //                   -------*------*------*------*------*----- creation interval
      //                   ----------|                               timespans
      //                          ----------|
      //                                 ----------|
      //                                        ----------|
      //                                               ----------|
      //                                                      ----------|
      const t = time('     ----------|');
      const interval = time('        -------|');
      const expected = '   ----------a------b------c------d------e-#';
      const values = {
        a: ['2', '3', '4'],
        b: ['4', '5', '6'],
        c: ['6', '7', '8'],
        d: ['8', '9'],
        e: [] as string[]
      };

      const result = e1.pipe(
        bufferTime(t, interval, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result).toBe(expected, values);
    });
  });

  it('should emit buffers and allow result to unsubscribed early', () => {
    testScheduler.run(({hot, time, expectSource, expectSubscriptions}) => {
      const e1 = hot('--1--^2--3---4---5--6--7---8----9------------|');
      const unsub = '      -----------------!                       ';
      const subs = '       ^----------------!                       ';
      //                   -------*------*------*------*------*----- creation interval
      //                   ----------|                               timespans
      //                          ----------|
      //                                 ----------|
      const t = time('     ----------|                              ');
      const interval = time('        -------|                       ');
      const expected = '   ----------a------                        ';
      const values = {
        a: ['2', '3', '4']
      };

      const result = e1.pipe(
        bufferTime(t, interval, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({hot, time, expectSource, expectSubscriptions}) => {
      const e1 = hot('--1--^2--3---4---5--6--7---8----9------------|');
      const subs = '       ^---------------!                        ';
      //                   -------*------*------*------*------*----- creation interval
      //                   ----------|                               timespans
      //                          ----------|
      //                                 ----------|
      const t = time('     ----------|');
      const interval = time('        -------|');
      const expected = '   ----------a------                        ';
      const unsub = '      ----------------!                        ';
      const values = {
        a: ['2', '3', '4']
      };

      const result = e1.pipe(
        mergeMap((x: any) => of(x)),
        bufferTime(t, interval, Number.POSITIVE_INFINITY, testScheduler),
        mergeMap((x: any) => of(x))
      );

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle empty', () => {
    testScheduler.run(({cold, time, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e1subs = '  (^!)';
      const expected = '(b|)';
      const values = {b: [] as string[]};
      const t = time('----------|');

      const result = e1.pipe(
        bufferTime(t, null, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle never', () => {
    testScheduler.run(({cold, time, expectSource}) => {
      const e1 = cold('-');
      const unsub = '   --------------------------------------------!';
      const t = time('  ----------|                                  ');
      const expected = '----------a---------a---------a---------a----';

      const result = e1.pipe(
        bufferTime(t, null, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result, unsub).toBe(expected, {a: []});
    });
  });

  it('should handle throw', () => {
    testScheduler.run(({time, expectSource}) => {
      const e1 = throwError(new Error('haha'));
      const expected = '#';
      const t = time('----------|');

      const result = e1.pipe(
        bufferTime(t, null, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result).toBe(expected, undefined, new Error('haha'));
    });
  });

  it('should handle errors', () => {
    testScheduler.run(({hot, time, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a---b---c---#');
      const e1subs = '  ^--------------!';
      const t = time('  ----------|');
      const expected = '----------w----#';
      const values = {
        w: ['a', 'b']
      };

      const result = e1.pipe(
        bufferTime(t, null, Number.POSITIVE_INFINITY, testScheduler)
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it(
    'should emit buffers that have been created at intervals and close after ' +
      'the specified delay with errors',
    () => {
      testScheduler.run(({hot, time, expectSource, expectSubscriptions}) => {
        const e1 = hot('  ---a---b---c----d----e----f----g----h----i--#');
        //                --------------------*--------------------*----  start interval
        //                ---------------------|                          timespans
        //                                    ---------------------|
        //                                                         -----|
        const e1subs = '  ^-------------------------------------------!';
        const t = time('  ---------------------|                       ');
        const interval = time('                --------------------|   ');
        const expected = '---------------------x-------------------y--#';
        const values = {
          x: ['a', 'b', 'c', 'd', 'e'],
          y: ['e', 'f', 'g', 'h', 'i']
        };

        const result = e1.pipe(
          bufferTime(t, interval, Number.POSITIVE_INFINITY, testScheduler)
        );

        expectSource(result).toBe(expected, values);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
      });
    }
  );

  it('should not throw when subscription synchronously unsubscribed after emit', () => {
    testScheduler.run(({hot, time, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a---b---c---d---e---f---g-----|');
      const subs = '    ^-------------------!             ';
      const t = time('  ----------|                       ');
      const expected = '----------w---------(x|)          ';
      const values = {
        w: ['a', 'b'],
        x: ['c', 'd', 'e']
      };

      const result = e1.pipe(
        bufferTime(t, null, Number.POSITIVE_INFINITY, testScheduler),
        take(2)
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should not have errors when take follows and maxBufferSize is provided', () => {
    testScheduler.run(({expectSource}) => {
      const tick = 1;
      const buffTime = 5;
      const expected = '-----a----b----c----d----(e|)';
      const values = {
        a: [0, 1, 2, 3],
        b: [4, 5, 6, 7, 8],
        c: [9, 10, 11, 12, 13],
        d: [14, 15, 16, 17, 18],
        e: [19, 20, 21, 22, 23]
      };

      const source = interval(tick, testScheduler).pipe(
        bufferTime(buffTime, null, 10, testScheduler),
        take(5)
      );

      expectSource(source).toBe(expected, values);
    });
  });
});

describe('bufferToggle', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('bufferToggle')(
    'should emit buffers using hot openings and hot closings',
    () => {
      testScheduler.run(({hot, expectSource}) => {
        const e1 = hot('  ---a---b---c---d---e---f---g---|');
        const e2 = hot('  --o------------------o---------|');
        const e3 = hot('  ---------c---------------c-----|');
        const expected = '---------x---------------y-----|';
        const values = {
          x: ['a', 'b'],
          y: ['f']
        };

        const result = e1.pipe(bufferToggle(e2, (x: any) => e3));

        expectSource(result).toBe(expected, values);
      });
    }
  );
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(
      bufferToggle(of('a', 'b', 'c'), value => of(new Date()))
    ); // $ExpectType Observable<number[]>
  });

  it('should support Promises', () => {
    const promise = Promise.resolve('a');
    const o = of(1, 2, 3).pipe(bufferToggle(promise, value => of(new Date()))); // $ExpectType Observable<number[]>
    const p = of(1, 2, 3).pipe(
      bufferToggle(of('a', 'b', 'c'), value => promise)
    ); // $ExpectType Observable<number[]>
    const q = of(1, 2, 3).pipe(bufferToggle(promise, value => promise)); // $ExpectType Observable<number[]>
  });

  it('should support NEVER', () => {
    const o = of(1, 2, 3).pipe(bufferToggle(NEVER, value => of(new Date()))); // $ExpectType Observable<number[]>
    const p = of(1, 2, 3).pipe(bufferToggle(of('a', 'b', 'c'), value => NEVER)); // $ExpectType Observable<number[]>
    const q = of(1, 2, 3).pipe(bufferToggle(NEVER, value => NEVER)); // $ExpectType Observable<number[]>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(bufferToggle()); // $ExpectError
  });

  it('should enforce type of openings', () => {
    const o = of(1, 2, 3).pipe(bufferToggle('a', () => of('a', 'b', 'c'))); // $ExpectError
  });

  it('should enforce type of closingSelector', () => {
    const o = of(1, 2, 3).pipe(bufferToggle(of('a', 'b', 'c'), 'a')); // $ExpectError
    const p = of(1, 2, 3).pipe(
      bufferToggle(of('a', 'b', 'c'), (value: number) => of('a', 'b', 'c'))
    ); // $ExpectError
  });

  it(
    'should emit buffers that are opened by an observable from the first argument ' +
      'and closed by an observable returned by the function in the second argument',
    () => {
      testScheduler.run(({hot, cold, expectSource}) => {
        const e1 = hot('  -----a----b----c----d----e----f----g----h----i----|');
        const e2 = cold(' -------------x-------------y--------------z-------|');
        const e3 = cold('              ---------------(j|)');
        //                                           ---------------(j|)
        //                                                          ---------------(j|)
        const expected =
          '----------------------------q-------------r-------(s|)';

        const values = {
          q: ['c', 'd', 'e'],
          r: ['f', 'g', 'h'],
          s: ['i']
        };
        const innerVals = ['x', 'y', 'z'];

        expectSource(
          e1.pipe(
            bufferToggle(e2, (x: string) => {
              expect(x).to.equal(innerVals.shift());
              return e3;
            })
          )
        ).toBe(expected, values);
      });
    }
  );

  it('should emit buffers using varying cold closings', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|    ');
      const e2 = cold('    --x-----------y--------z---|            ');
      const subs = '       ^----------------------------------!    ';
      const closings = [
        cold('             ---------------s--|                     '),
        cold('                         ----(s|)                    '),
        cold('                                  ---------------(s|)')
      ];
      const closeSubs = [
        '                 --^--------------!                       ',
        '                 --------------^---!                      ',
        '                 -----------------------^-----------!     '
      ];
      const expected = '-----------------ij----------------(k|) ';
      const values = {
        i: ['b', 'c', 'd', 'e'],
        j: ['e'],
        k: ['g', 'h']
      };

      let i = 0;
      const result = e1.pipe(bufferToggle(e2, () => closings[i++]));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
      expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
      expectSubscriptions(closings[2].subscriptions).toBe(closeSubs[2]);
    });
  });

  it('should emit buffers using varying hot closings', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|   ');
      const e2 = cold('    --x-----------y--------z---|           ');
      const subs = '       ^----------------------------------!   ';
      const closings = [
        {
          obs: hot('   -1--^----------------s-|                   '),
          sub: '           --^--------------!                     '
        },
        {
          obs: hot('  -----3----4-------(s|)                      '),
          sub: '           --------------^---!                    '
        },
        {
          obs: hot('  -------3----4-------5----------------s|     '),
          sub: '           -----------------------^-----------!   '
        }
      ];

      const expected = '   -----------------ij----------------(k|)';
      const values = {
        i: ['b', 'c', 'd', 'e'],
        j: ['e'],
        k: ['g', 'h']
      };

      let i = 0;
      const result = e1.pipe(bufferToggle(e2, () => closings[i++].obs));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      for (let j = 0; j < closings.length; j++) {
        expectSubscriptions(closings[j].obs.subscriptions).toBe(
          closings[j].sub
        );
      }
    });
  });

  it('should emit buffers using varying empty delayed closings', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|   ');
      const e2 = cold('    --x-----------y--------z---|           ');
      const subs = '       ^----------------------------------!   ';
      const closings = [
        cold('             ---------------|                       '),
        cold('                         ----|                      '),
        cold('                                  ---------------|  ')
      ];
      const expected = '   -----------------ij----------------(k|)';
      const values = {
        i: ['b', 'c', 'd', 'e'],
        j: ['e'],
        k: ['g', 'h']
      };

      let i = 0;
      const result = e1.pipe(bufferToggle(e2, () => closings[i++]));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should emit buffers using varying cold closings, outer unsubscribed early', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
      const subs = '       ^---------!                               ';
      const e2 = cold('    --x-----------y--------z---|              ');
      const closings = [
        cold('             ---------------s--|                       '),
        cold('                         ----(s|)                      '),
        cold('                                  ---------------(s|)  ')
      ];
      const csub0 = '      --^-------!                               ';
      const expected = '   -----------                               ';
      const unsub = '      ----------!                               ';
      const values = {
        i: ['b', 'c', 'd', 'e']
      };

      let i = 0;
      const result = e1.pipe(bufferToggle(e2, () => closings[i++]));

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(csub0);
      expectSubscriptions(closings[1].subscriptions).toBe([]);
      expectSubscriptions(closings[2].subscriptions).toBe([]);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|    ');
      const subs = '       ^-----------------!                     ';
      const e2 = cold('    --x-----------y--------z---|            ');
      const closings = [
        cold('             ---------------s--|                     '),
        cold('                         ----(s|)                    '),
        cold('                                  ---------------(s|)')
      ];
      const expected = '   -----------------i-                     ';
      const unsub = '      ------------------!                     ';
      const values = {
        i: ['b', 'c', 'd', 'e']
      };

      let i = 0;
      const result = e1.pipe(
        mergeMap((x: any) => of(x)),
        bufferToggle(e2, () => closings[i++]),
        mergeMap((x: any) => of(x))
      );

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should propagate error thrown from closingSelector', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|    ');
      const e2 = cold('    --x-----------y--------z---|            ');
      const subs = '       ^-------------!                         ';
      const closings = [
        cold('             ---------------s--|                     '),
        cold('                         ----(s|)                    '),
        cold('                                  ---------------(s|)')
      ];
      const closeSubs0 = '--^-----------!                         ';
      const expected = '--------------#                         ';

      let i = 0;
      const result = e1.pipe(
        bufferToggle(e2, () => {
          if (i === 1) {
            throw 'error';
          }
          return closings[i++];
        })
      );

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs0);
      expectSubscriptions(closings[1].subscriptions).toBe([]);
      expectSubscriptions(closings[2].subscriptions).toBe([]);
    });
  });

  it('should propagate error emitted from a closing', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const e2 = cold('    --x-----------y--------z---|        ');
      const subs = '       ^-------------!                     ';
      const closings = [
        cold('             ---------------s--|                 '),
        cold('                         #                       ')
      ];
      const closeSubs = [
        '                  --^-----------!                     ',
        '                  --------------(^!)                  '
      ];
      const expected = '   --------------#                     ';

      let i = 0;
      const result = e1.pipe(bufferToggle(e2, () => closings[i++]));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
      expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
    });
  });

  it('should propagate error emitted late from a closing', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const e2 = cold('    --x-----------y--------z---|        ');
      const subs = '       ^------------------!                ';
      const closings = [
        cold('             ---------------s--|                 '),
        cold('                         -----#                  ')
      ];
      const closeSubs = [
        '                  --^--------------!                  ',
        '                  --------------^----!                '
      ];
      const expected = '   -----------------i-#                ';
      const values = {
        i: ['b', 'c', 'd', 'e']
      };

      let i = 0;
      const result = e1.pipe(bufferToggle(e2, () => closings[i++]));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
      expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
    });
  });

  it('should handle errors', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e--#        ');
      const e2 = cold('    --x-----------y--------z---|');
      const subs = '       ^------------------!        ';
      const closings = [
        cold('             ---------------s--|         '),
        cold('                         -------s|       ')
      ];
      const closeSubs = [
        '                  --^--------------!          ',
        '                  --------------^----!        '
      ];
      const expected = '   -----------------i-#        ';
      const values = {
        i: ['b', 'c', 'd', 'e']
      };

      let i = 0;
      const result = e1.pipe(bufferToggle(e2, () => closings[i++]));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
      expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
    });
  });

  it('should handle empty source', () => {
    testScheduler.run(({cold, expectSource}) => {
      const e1 = cold(' |');
      const e2 = cold(' --o-----|');
      const e3 = cold('   -----c--|');
      const expected = '|';
      const values = {x: [] as string[]};

      const result = e1.pipe(bufferToggle(e2, () => e3));

      expectSource(result).toBe(expected, values);
    });
  });

  it('should handle throw', () => {
    testScheduler.run(({cold, expectSource}) => {
      const e1 = cold(' #');
      const e2 = cold(' --o-----|');
      const e3 = cold('   -----c--|');
      const expected = '#';
      const values = {x: [] as string[]};

      const result = e1.pipe(bufferToggle(e2, () => e3));

      expectSource(result).toBe(expected, values);
    });
  });

  it('should handle never', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -');
      const e2 = cold(' --o-----o------o-----o---o-----|');
      const e3 = cold('   --c-|');
      const unsub = '   --------------------------------------------!';
      const subs = '    ^-------------------------------------------!';
      const expected = '----x-----x------x-----x---x-----------------';
      const values = {x: [] as string[]};

      const result = e1.pipe(bufferToggle(e2, () => e3));

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should handle a never opening Observable', () => {
    testScheduler.run(({hot, cold, expectSource}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const e2 = cold('    -');
      const e3 = cold('   --c-|');
      const expected = '   -----------------------------------|';

      const result = e1.pipe(bufferToggle(e2, () => e3));

      expectSource(result).toBe(expected);
    });
  });

  it('should handle a never closing Observable', () => {
    testScheduler.run(({hot, cold, expectSource}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|    ');
      const e2 = cold('    ---o---------------o-----------|        ');
      const e3 = cold('    -');
      const expected = '   -----------------------------------(xy|)';
      const values = {
        x: ['b', 'c', 'd', 'e', 'f', 'g', 'h'],
        y: ['f', 'g', 'h']
      };

      const result = e1.pipe(bufferToggle(e2, () => e3));

      expectSource(result).toBe(expected, values);
    });
  });

  it('should handle opening Observable that just throws', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const e1subs = '     (^!)';
      const e2 = cold('    #');
      const e2subs = '     (^!)';
      const e3 = cold('    --c-|');
      const expected = '   #';

      const result = e1.pipe(bufferToggle(e2, () => e3));

      expectSource(result).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should accept openings resolved promise', (done: MochaDone) => {
    const e1 = concat(
      timer(10).pipe(mapTo(1)),
      timer(100).pipe(mapTo(2)),
      timer(150).pipe(mapTo(3)),
      timer(200).pipe(mapTo(4))
    );

    const expected = [[1]];

    e1.pipe(
      bufferToggle(
        new Promise((resolve: any) => {
          resolve(42);
        }),
        () => {
          return timer(50);
        }
      )
    ).subscribe(
      x => {
        expect(x).to.deep.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected.length).to.be.equal(0);
        done();
      }
    );
  });

  it('should accept openings rejected promise', (done: MochaDone) => {
    const e1 = concat(
      of(1),
      timer(10).pipe(mapTo(2)),
      timer(10).pipe(mapTo(3)),
      timer(100).pipe(mapTo(4))
    );

    const expected = 42;

    e1.pipe(
      bufferToggle(
        new Promise((resolve: any, reject: any) => {
          reject(expected);
        }),
        () => {
          return timer(50);
        }
      )
    ).subscribe(
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

  it('should accept closing selector that returns a resolved promise', (done: MochaDone) => {
    const e1 = concat(
      of(1),
      timer(10).pipe(mapTo(2)),
      timer(10).pipe(mapTo(3)),
      timer(100).pipe(mapTo(4))
    );
    const expected = [[1]];

    e1.pipe(
      bufferToggle(
        of(10),
        () =>
          new Promise((resolve: any) => {
            resolve(42);
          })
      )
    ).subscribe(
      x => {
        expect(x).to.deep.equal(expected.shift());
      },
      () => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected.length).to.be.equal(0);
        done();
      }
    );
  });

  it('should accept closing selector that returns a rejected promise', (done: MochaDone) => {
    const e1 = concat(
      of(1),
      timer(10).pipe(mapTo(2)),
      timer(10).pipe(mapTo(3)),
      timer(100).pipe(mapTo(4))
    );

    const expected = 42;

    e1.pipe(
      bufferToggle(
        of(10),
        () =>
          new Promise((resolve: any, reject: any) => {
            reject(expected);
          })
      )
    ).subscribe(
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

  it('should handle empty closing observable', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const subs = '       ^----------------------------------!';
      const e2 = cold('    --x-----------y--------z---|        ');
      const expected = '   --l-----------m--------n-----------|';

      const result = e1.pipe(bufferToggle(e2, () => EMPTY));

      expectSource(result).toBe(expected, {l: [], m: [], n: []});
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });
});

describe('bufferWhen', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  asDiagram('bufferWhen')('should emit buffers that close and reopen', () => {
    testScheduler.run(({hot, cold, expectSource}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---------|   ');
      const e2 = cold('    --------------(s|)                    ');
      //                                 --------------(s |)
      const expected = '   --------------x-------------y-----(z|)';
      const values = {
        x: ['b', 'c', 'd'],
        y: ['e', 'f', 'g'],
        z: [] as string[]
      };

      expectSource(e1.pipe(bufferWhen(() => e2))).toBe(expected, values);
    });
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(bufferWhen(() => of('a', 'b', 'c'))); // $ExpectType Observable<number[]>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(bufferWhen()); // $ExpectError
  });

  it('should enforce type of closingSelector', () => {
    const o = of(1, 2, 3).pipe(bufferWhen(of('a', 'b', 'c'))); // $ExpectError
  });

  it('should emit buffers using varying cold closings', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
      const subs = '       ^----------------------------------!      ';
      const closings = [
        cold('             ---------------s--|                       '),
        cold('                            ----------(s|)             '),
        cold('                                      -------------(s|)')
      ];
      const expected = '   ---------------x---------y---------(z|)   ';
      const values = {
        x: ['b', 'c', 'd'],
        y: ['e', 'f', 'g'],
        z: ['h']
      };

      let i = 0;
      const result = e1.pipe(bufferWhen(() => closings[i++]));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });

  it('should emit buffers using varying hot closings', () => {
    testScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|   ');
      const subs = '       ^----------------------------------!   ';
      const closings = [
        {
          obs: hot('   -1--^--------------s---|                   '),
          sub: '           ^--------------!                       '
        },
        {
          obs: hot('   --1-^----3--------4----------s-|           '),
          sub: '           ---------------^---------!             '
        },
        {
          obs: hot('   1-2-^------3----4-------5--6-----------s--|'),
          sub: '           -------------------------^---------!   '
        }
      ];
      const expected = '   ---------------x---------y---------(z|)';
      const values = {
        x: ['b', 'c', 'd'],
        y: ['e', 'f', 'g'],
        z: ['h']
      };

      let i = 0;
      const result = e1.pipe(bufferWhen(() => closings[i++].obs));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      for (let j = 0; j < closings.length; j++) {
        expectSubscriptions(closings[j].obs.subscriptions).toBe(
          closings[j].sub
        );
      }
    });
  });

  it('should emit buffers using varying empty delayed closings', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|   ');
      const subs = '       ^----------------------------------!   ';
      const closings = [
        cold('             ---------------|                       '),
        cold('                            ----------|             '),
        cold('                                      -------------|')
      ];
      const closeSubs = [
        '                  ^--------------!                       ',
        '                  ---------------^---------!             ',
        '                  -------------------------^---------!   '
      ];
      const expected = '   ---------------x---------y---------(z|)';
      const values = {
        x: ['b', 'c', 'd'],
        y: ['e', 'f', 'g'],
        z: ['h']
      };

      let i = 0;
      const result = e1.pipe(bufferWhen(() => closings[i++]));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
      expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
      expectSubscriptions(closings[2].subscriptions).toBe(closeSubs[2]);
    });
  });

  it('should emit buffers using varying cold closings, outer unsubscribed early', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
      const unsub = '      ------------------!                       ';
      const subs = '       ^-----------------!                       ';
      const closings = [
        cold('             ---------------(s|)                       '),
        cold('                            ----------(s|)             '),
        cold('                                      -------------(s|)')
      ];
      const closeSubs = [
        '                  ^--------------!                          ',
        '                  ---------------^--!                       '
      ];
      const expected = '   ---------------x---                       ';
      const values = {
        x: ['b', 'c', 'd']
      };

      let i = 0;
      const result = e1.pipe(bufferWhen(() => closings[i++]));

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
      expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
      expectSubscriptions(closings[2].subscriptions).toBe([]);
    });
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
      const subs = '       ^-----------------!                       ';
      const closings = [
        cold('             ---------------(s|)                       '),
        cold('                            ----------(s|)             '),
        cold('                                      -------------(s|)')
      ];
      const closeSubs = [
        '                  ^--------------!                          ',
        '                  ---------------^--!                       '
      ];
      const expected = '   ---------------x---                       ';
      const unsub = '      ------------------!                       ';
      const values = {
        x: ['b', 'c', 'd']
      };

      let i = 0;
      const result = e1.pipe(
        mergeMap((x: any) => of(x)),
        bufferWhen(() => closings[i++]),
        mergeMap((x: any) => of(x))
      );

      expectSource(result, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
      expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
      expectSubscriptions(closings[2].subscriptions).toBe([]);
    });
  });

  it('should propagate error thrown from closingSelector', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
      const subs = '       ^--------------!                          ';
      const closings = [
        cold('             ---------------s--|                       '),
        cold('                            ----------(s|)             '),
        cold('                                      -------------(s|)')
      ];
      const closeSubs0 = ' ^--------------!                          ';
      const expected = '   ---------------(x#)                       ';
      const values = {x: ['b', 'c', 'd']};

      let i = 0;
      const result = e1.pipe(
        bufferWhen(() => {
          if (i === 1) {
            throw 'error';
          }
          return closings[i++];
        })
      );

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs0);
    });
  });

  it('should propagate error emitted from a closing', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const subs = '       ^--------------!                    ';
      const closings = [
        cold('             ---------------s--|                 '),
        cold('                            #                    ')
      ];
      const closeSubs = [
        '                  ^--------------!                    ',
        '                  ---------------(^!)                 '
      ];
      const expected = '   ---------------(x#)                 ';
      const values = {
        x: ['b', 'c', 'd']
      };

      let i = 0;
      const result = e1.pipe(bufferWhen(() => closings[i++]));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
      expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
    });
  });

  it('should propagate error emitted late from a closing', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const subs = '       ^--------------------!              ';
      const closings = [
        cold('             ---------------s--|                 '),
        cold('                            ------#              ')
      ];
      const closeSubs = [
        '                  ^--------------!                    ',
        '                  ---------------^-----!              '
      ];
      const expected = '---------------x-----#              ';
      const values = {x: ['b', 'c', 'd']};

      let i = 0;
      const result = e1.pipe(bufferWhen(() => closings[i++]));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
      expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
      expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
    });
  });

  it('should handle errors', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---#');
      const e2 = cold('    ---------------(s|)      ');
      //                                ---------------(s|)
      const e2subs = [
        '                  ^--------------!         ',
        '                  ---------------^--------!'
      ];
      const expected = '   ---------------x--------#';
      const values = {
        x: ['b', 'c', 'd']
      };

      const result = e1.pipe(bufferWhen(() => e2));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle empty', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' |');
      const e2 = cold(' --------(s|)');
      const e1subs = '  (^!)';
      const expected = '(x|)';
      const values = {
        x: [] as string[]
      };

      const result = e1.pipe(bufferWhen(() => e2));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle throw', () => {
    testScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const e1 = cold(' #');
      const e2 = cold(' --------(s|)');
      const e1subs = '  (^!)';
      const expected = '#';
      const values = {
        x: [] as string[]
      };

      const result = e1.pipe(bufferWhen(() => e2));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });
  });

  it('should handle never', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('  -');
      const unsub = '   --------------------------------------------!';
      const e1subs = '  ^-------------------------------------------!';
      const e2 = cold(' --------(s|)                                 ');
      const e2subs = [
        '               ^-------!                                    ',
        '               --------^-------!                            ',
        '               ----------------^-------!                    ',
        '               ------------------------^-------!            ',
        '               --------------------------------^-------!    ',
        '               ----------------------------------------^---!'
      ];
      const expected = '--------x-------x-------x-------x-------x----';
      const values = {
        x: [] as string[]
      };

      const source = e1.pipe(bufferWhen(() => e2));

      expectSource(source, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle an inner never', () => {
    testScheduler.run(({hot, cold, expectSource}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const e2 = cold('-');
      const expected = '   -----------------------------------(x|)';
      const values = {
        x: ['b', 'c', 'd', 'e', 'f', 'g', 'h']
      };

      expectSource(e1.pipe(bufferWhen(() => e2))).toBe(expected, values);
    });
  });

  // bufferWhen is not supposed to handle a factory that returns always empty
  // closing Observables, because doing such would constantly recreate a new
  // buffer in a synchronous infinite loop until the stack overflows. This also
  // happens with buffer in RxJS 4.
  it('should NOT handle hot inner empty', (done: MochaDone) => {
    const source = of(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const closing = EMPTY;
    const TOO_MANY_INVOCATIONS = 30;

    source
      .pipe(
        bufferWhen(() => closing),
        takeWhile((val: any, index: number) => index < TOO_MANY_INVOCATIONS)
      )
      .subscribe(
        (val: any) => {
          expect(Array.isArray(val)).to.be.true;
          expect(val.length).to.equal(0);
        },
        (err: any) => {
          done(new Error('should not be called'));
        },
        () => {
          done();
        }
      );
  });

  it('should handle inner throw', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const e1subs = '     (^!)';
      const e2 = cold('    #');
      const e2subs = '     (^!)';
      const expected = '   #';
      const values = {
        x: ['b', 'c', 'd', 'e', 'f', 'g', 'h']
      };

      const result = e1.pipe(bufferWhen(() => e2));

      expectSource(result).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    });
  });

  it('should handle disposing of source', () => {
    testScheduler.run(({hot, cold, expectSource, expectSubscriptions}) => {
      const e1 = hot('--a--^---b---c---d---e---f---g---h------|');
      const subs = '       ^-------------------!';
      const unsub = '      --------------------!';
      const e2 = cold('    ---------------(s|)');
      //                                  ---------------(s|)
      const expected = '   ---------------x-----';
      const values = {
        x: ['b', 'c', 'd'],
        y: ['e', 'f', 'g', 'h'],
        z: [] as string[]
      };

      const source = e1.pipe(bufferWhen(() => e2));

      expectSource(source, unsub).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(subs);
    });
  });
});

describe('concatMap', () => {
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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(concatMap(p => of(Boolean(p)))); // $ExpectType Observable<boolean>
  });

  it('should support a projector that takes an index', () => {
    const o = of(1, 2, 3).pipe(concatMap((p, index) => of(Boolean(p)))); // $ExpectType Observable<boolean>
  });

  it('should infer correctly by using the resultSelector first parameter', () => {
    const o = of(1, 2, 3).pipe(
      concatMap(
        p => of(Boolean(p)),
        a => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should infer correctly by using the resultSelector second parameter', () => {
    const o = of(1, 2, 3).pipe(
      concatMap(
        p => of(Boolean(p)),
        (a, b) => b
      )
    ); // $ExpectType Observable<boolean>
  });

  it('should support a resultSelector that takes an inner index', () => {
    const o = of(1, 2, 3).pipe(
      concatMap(
        p => of(Boolean(p)),
        (a, b, innnerIndex) => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should support a resultSelector that takes an inner and outer index', () => {
    const o = of(1, 2, 3).pipe(
      concatMap(
        p => of(Boolean(p)),
        (a, b, innnerIndex, outerX) => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should support an undefined resultSelector', () => {
    const o = of(1, 2, 3).pipe(concatMap(p => of(Boolean(p)), undefined)); // $ExpectType Observable<boolean>
  });

  it('should support union-type projections', () => {
    const o = of(Math.random()).pipe(
      concatMap(n => (n > 0.5 ? of('life') : of(42)))
    ); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(concatMap()); // $ExpectError
  });

  it('should enforce the return type', () => {
    const o = of(1, 2, 3).pipe(concatMap(p => p)); // $ExpectError
  });

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

describe('concatMapTo', () => {
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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(concatMapTo(of('foo'))); // $ExpectType Observable<string>
  });

  it('should infer correctly with multiple types', () => {
    const o = of(1, 2, 3).pipe(concatMapTo(of('foo', 4))); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with an array', () => {
    const o = of(1, 2, 3).pipe(concatMapTo([4, 5, 6])); // $ExpectType Observable<number>
  });

  it('should infer correctly with a Promise', () => {
    const o = of(1, 2, 3).pipe(
      concatMapTo(
        new Promise<string>(() => {})
      )
    ); // $ExpectType Observable<string>
  });

  it('should infer correctly by using the resultSelector first parameter', () => {
    const o = of(1, 2, 3).pipe(concatMapTo(of('foo'), a => a)); // $ExpectType Observable<number>
  });

  it('should infer correctly by using the resultSelector second parameter', () => {
    const o = of(1, 2, 3).pipe(concatMapTo(of('foo'), (a, b) => b)); // $ExpectType Observable<string>
  });

  it('should support a resultSelector that takes an inner index', () => {
    const o = of(1, 2, 3).pipe(
      concatMapTo(of('foo'), (a, b, innnerIndex) => a)
    ); // $ExpectType Observable<number>
  });

  it('should support a resultSelector that takes an inner and outer index', () => {
    const o = of(1, 2, 3).pipe(
      concatMapTo(of('foo'), (a, b, innnerIndex, outerX) => a)
    ); // $ExpectType Observable<number>
  });

  it('should support an undefined resultSelector', () => {
    const o = of(1, 2, 3).pipe(concatMapTo(of('foo'), undefined)); // $ExpectType Observable<string>
  });

  it('should support union types', () => {
    const s = Math.random() > 0.5 ? of(123) : of('abc');
    const r = of(1, 2, 3).pipe(concatMapTo(s)); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(concatMapTo()); // $ExpectError
  });

  it('should enforce the return type', () => {
    const o = of(1, 2, 3).pipe(concatMapTo(p => p)); // $ExpectError
    const p = of(1, 2, 3).pipe(concatMapTo(4)); // $ExpectError
  });

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

describe('exhaust', () => {
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
  it('should infer correctly', () => {
    const o = of(of(1, 2, 3)).pipe(exhaust()); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(exhaust()); // $ExpectError
  });

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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(exhaustMap(p => of(Boolean(p)))); // $ExpectType Observable<boolean>
  });

  it('should support a projector that takes an index', () => {
    const o = of(1, 2, 3).pipe(exhaustMap((p, index) => of(Boolean(p)))); // $ExpectType Observable<boolean>
  });

  it('should infer correctly by using the resultSelector first parameter', () => {
    const o = of(1, 2, 3).pipe(
      exhaustMap(
        p => of(Boolean(p)),
        a => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should infer correctly by using the resultSelector second parameter', () => {
    const o = of(1, 2, 3).pipe(
      exhaustMap(
        p => of(Boolean(p)),
        (a, b) => b
      )
    ); // $ExpectType Observable<boolean>
  });

  it('should support a resultSelector that takes an inner index', () => {
    const o = of(1, 2, 3).pipe(
      exhaustMap(
        p => of(Boolean(p)),
        (a, b, innnerIndex) => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should support a resultSelector that takes an inner and outer index', () => {
    const o = of(1, 2, 3).pipe(
      exhaustMap(
        p => of(Boolean(p)),
        (a, b, innnerIndex, outerX) => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should support an undefined resultSelector', () => {
    const o = of(1, 2, 3).pipe(exhaustMap(p => of(Boolean(p)), undefined)); // $ExpectType Observable<boolean>
  });

  it('should report projections to union types', () => {
    const o = of(Math.random()).pipe(
      exhaustMap(n => (n > 0.5 ? of('life') : of(42)))
    ); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(exhaustMap()); // $ExpectError
  });

  it('should enforce the return type', () => {
    const o = of(1, 2, 3).pipe(exhaustMap(p => p)); // $ExpectError
  });

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
      exhaustMap(value => asInterop(observableLookup[value])),
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

describe('expand', () => {
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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(expand(value => of(value))); // $ExpectType Observable<number>
    const p = of(1, 2, 3).pipe(expand(value => [value])); // $ExpectType Observable<number>
    const q = of(1, 2, 3).pipe(expand(value => Promise.resolve(value))); // $ExpectType Observable<number>
  });

  it('should infer correctly with a different type as the source', () => {
    const o = of(1, 2, 3).pipe(expand(value => of('foo'))); // $ExpectType Observable<string>
    const p = of(1, 2, 3).pipe(expand(value => ['foo'])); // $ExpectType Observable<string>
    const q = of(1, 2, 3).pipe(expand(value => Promise.resolve('foo'))); // $ExpectType Observable<string>
  });

  it('should support a project function with index', () => {
    const o = of(1, 2, 3).pipe(expand((value, index) => of(index))); // $ExpectType Observable<number>
  });

  it('should support concurrent parameter', () => {
    const o = of(1, 2, 3).pipe(expand(value => of(1), 47)); // $ExpectType Observable<number>
  });

  it('should support a scheduler', () => {
    const o = of(1, 2, 3).pipe(expand(value => of(1), 47, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(expand()); // $ExpectError
  });

  it('should enforce project types', () => {
    const o = of(1, 2, 3).pipe(expand((value: string, index) => of(1))); // $ExpectError
    const p = of(1, 2, 3).pipe(expand((value, index: string) => of(1))); // $ExpectError
  });

  it('should enforce project return type', () => {
    const o = of(1, 2, 3).pipe(expand(value => 1)); // $ExpectError
  });

  it('should enforce concurrent type', () => {
    const o = of(1, 2, 3).pipe(expand(value => of(1), 'foo')); // $ExpectError
  });

  it('should enforce scheduler type', () => {
    const o = of(1, 2, 3).pipe(expand(value => of(1), 47, 'foo')); // $ExpectError
  });

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

describe('groupBy', () => {
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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(groupBy(value => value.toString())); // $ExpectType Observable<GroupedSource<string, number>>
  });

  it('should support an element selector', () => {
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        value => Boolean(value)
      )
    ); // $ExpectType Observable<GroupedSource<string, boolean>>
  });

  it('should support a duration selector', () => {
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        (value: GroupedSource<string, number>) => of(true, false)
      )
    ); // $ExpectType Observable<GroupedSource<string, number>>
  });

  it('should infer type of duration selector based on element selector', () => {
    /* tslint:disable-next-line:max-line-length */
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        value => Boolean(value),
        (value: GroupedSource<string, boolean>) => value
      )
    ); // $ExpectType Observable<GroupedSource<string, boolean>>
  });

  it('should support a subject selector', () => {
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        undefined,
        () => new Subject<boolean>()
      )
    ); // $ExpectType Observable<GroupedSource<string, boolean>>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(groupBy()); // $ExpectError
  });

  it('should enforce type of key selector', () => {
    const o = of(1, 2, 3).pipe(groupBy('nope')); // $ExpectError
  });

  it('should enforce types of element selector', () => {
    const o = of(1, 2, 3).pipe(groupBy(value => value, 'foo')); // $ExpectError
    const p = of(1, 2, 3).pipe(
      groupBy(
        value => value,
        (value: string) => value
      )
    ); // $ExpectError
  });

  it('should enforce types of duration selector', () => {
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        value => 'foo'
      )
    ); // $ExpectError
    const p = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        (value: GroupedSource<number, number>) => value
      )
    ); // $ExpectError
    const q = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        (value: GroupedSource<string, string>) => value
      )
    ); // $ExpectError
    const r = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        value => Boolean(value),
        (value: GroupedSource<string, string>) => value
      )
    ); // $ExpectError
    const s = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        value => Boolean(value),
        (value: GroupedSource<boolean, boolean>) => value
      )
    ); // $ExpectError
  });

  it('should enforce types of subject selector', () => {
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        undefined,
        () => 'nope'
      )
    ); // $ExpectError
    const p = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        undefined,
        value => new Subject<string>()
      )
    ); // $ExpectError
  });

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
        expect(group instanceof GroupedSource).to.be.true;
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

describe('map', () => {
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

  const isFooBar = (value: string): value is 'foo' | 'bar' =>
    /^(foo|bar)$/.test(value);

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(map(value => value)); // $ExpectType Observable<number>
  });

  it('should infer correctly when returning a different type', () => {
    const o = of(1, 2, 3).pipe(map(String)); // $ExpectType Observable<string>
  });

  it('should support an index parameter', () => {
    const o = of('a', 'b', 'c').pipe(map((value, index) => index)); // $ExpectType Observable<number>
  });

  it('should support an extra parameter', () => {
    const o = of(1, 2, 3).pipe(map(value => value, 'something')); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(map()); // $ExpectError
  });

  it('should enforce the projecter types', () => {
    const o = of(1, 2, 3).pipe(map((value: string) => value)); // $ExpectError
    const p = of(1, 2, 3).pipe(map((value, index: string) => value)); // $ExpectError
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

describe('mapTo', () => {
  asDiagram("mapTo('a')")('should map multiple values', () => {
    const a = cold('--1--2--3--|');
    const asubs = '^          !';
    const expected = '--a--a--a--|';

    expectSource(a.pipe(mapTo('a'))).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
  });
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(mapTo(47)); // $ExpectType Observable<number>
  });

  it('should infer correctly when returning a different type', () => {
    const o = of(1, 2, 3).pipe(mapTo('carrot')); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(mapTo()); // $ExpectError
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
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(mergeMap(p => of(Boolean(p)))); // $ExpectType Observable<boolean>
  });

  it('should support a projector that takes an index', () => {
    const o = of(1, 2, 3).pipe(mergeMap((p, index) => of(Boolean(p)))); // $ExpectType Observable<boolean>
  });

  it('should infer correctly by using the resultSelector first parameter', () => {
    const o = of(1, 2, 3).pipe(
      mergeMap(
        p => of(Boolean(p)),
        a => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should infer correctly by using the resultSelector second parameter', () => {
    const o = of(1, 2, 3).pipe(
      mergeMap(
        p => of(Boolean(p)),
        (a, b) => b
      )
    ); // $ExpectType Observable<boolean>
  });

  it('should support a resultSelector that takes an inner index', () => {
    const o = of(1, 2, 3).pipe(
      mergeMap(
        p => of(Boolean(p)),
        (a, b, innnerIndex) => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should support a resultSelector that takes an inner and outer index', () => {
    const o = of(1, 2, 3).pipe(
      mergeMap(
        p => of(Boolean(p)),
        (a, b, innnerIndex, outerX) => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should support an undefined resultSelector', () => {
    const o = of(1, 2, 3).pipe(mergeMap(p => of(Boolean(p)), undefined)); // $ExpectType Observable<boolean>
  });

  it('should support a concurrent parameter', () => {
    const o = of(1, 2, 3).pipe(mergeMap(p => of(Boolean(p)), 4)); // $ExpectType Observable<boolean>
  });

  it('should support a resultSelector and concurrent parameter', () => {
    const o = of(1, 2, 3).pipe(
      mergeMap(
        p => of(Boolean(p)),
        (a, b) => b,
        4
      )
    ); // $ExpectType Observable<boolean>
  });

  it('should support a undefined resultSelector and concurrent parameter', () => {
    const o = of(1, 2, 3).pipe(mergeMap(p => of(Boolean(p)), undefined, 4)); // $ExpectType Observable<boolean>
  });

  it('should support union-type projections', () => {
    const o = of(Math.random()).pipe(
      mergeMap(n => (n > 0.5 ? of('life') : of(42)))
    ); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(mergeMap()); // $ExpectError
  });

  it('should enforce the return type', () => {
    const o = of(1, 2, 3).pipe(mergeMap(p => p)); // $ExpectError
  });

  it('should enforce types of the concurrent parameter', () => {
    const o = of(1, 2, 3).pipe(mergeMap(p => of(Boolean(p)), '4')); // $ExpectError
  });

  it('should enforce types of the concurrent parameter with a resultSelector', () => {
    const o = of(1, 2, 3).pipe(
      mergeMap(
        p => of(Boolean(p)),
        a => a,
        '4'
      )
    ); // $ExpectError
  });

  it('should enforce types of the concurrent parameter with an undefined resultSelector', () => {
    const o = of(1, 2, 3).pipe(mergeMap(p => of(Boolean(p)), undefined, '4')); // $ExpectError
  });

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
      mergeMap(value => asInterop(observableLookup[value])),
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
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(of('foo'))); // $ExpectType Observable<string>
  });

  it('should infer correctly multiple types', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(of('foo', 4))); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with an array', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo([4, 5, 6])); // $ExpectType Observable<number>
  });

  it('should infer correctly with a Promise', () => {
    const o = of(1, 2, 3).pipe(
      mergeMapTo(
        new Promise<string>(() => {})
      )
    ); // $ExpectType Observable<string>
  });

  it('should support a concurrent parameter', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(of('foo'), 4)); // $ExpectType Observable<string>
  });

  it('should infer correctly by using the resultSelector first parameter', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(of('foo'), a => a)); // $ExpectType Observable<number>
  });

  it('should infer correctly by using the resultSelector second parameter', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(of('foo'), (a, b) => b)); // $ExpectType Observable<string>
  });

  it('should support a resultSelector that takes an inner index', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(of('foo'), (a, b, innnerIndex) => a)); // $ExpectType Observable<number>
  });

  it('should support a resultSelector that takes an inner and outer index', () => {
    const o = of(1, 2, 3).pipe(
      mergeMapTo(of('foo'), (a, b, innnerIndex, outerX) => a)
    ); // $ExpectType Observable<number>
  });

  it('should support a resultSelector and concurrent parameter', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(of('foo'), (a, b) => b, 4)); // $ExpectType Observable<string>
  });

  it('should support union types', () => {
    const s = Math.random() > 0.5 ? of(123) : of('abc');
    const r = of(1, 2, 3).pipe(mergeMapTo(s)); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo()); // $ExpectError
  });

  it('should enforce the return type', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(p => p)); // $ExpectError
    const p = of(1, 2, 3).pipe(mergeMapTo(4)); // $ExpectError
  });

  it('should enforce types of the concurrent parameter', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(of('foo'), '4')); // $ExpectError
  });

  it('should enforce types of the concurrent parameter with a resultSelector', () => {
    const o = of(1, 2, 3).pipe(mergeMapTo(of('foo'), a => a, '4')); // $ExpectError
  });

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

describe('mergeScan', () => {
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(mergeScan((acc, value) => of(acc + value), 0)); // $ExpectType Observable<number>
  });

  it('should infer correctly by using the seed', () => {
    const o = of(1, 2, 3).pipe(mergeScan((acc, value) => of(acc + value), '')); // $ExpectType Observable<string>
  });

  it('should support the accumulator returning an iterable', () => {
    const o = of(1, 2, 3).pipe(mergeScan((acc, value) => acc + value, '')); // $ExpectType Observable<string>
  });

  it('should support the accumulator returning a promise', () => {
    const o = of(1, 2, 3).pipe(mergeScan(acc => Promise.resolve(acc), '')); // $ExpectType Observable<string>
  });

  it('should support a currency', () => {
    const o = of(1, 2, 3).pipe(
      mergeScan((acc, value) => of(acc + value), '', 47)
    ); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(mergeScan()); // $ExpectError
  });

  it('should enforce accumulate types', () => {
    const o = of(1, 2, 3).pipe(
      mergeScan((acc: string, value) => of(acc + value), 0)
    ); // $ExpectError
    const p = of(1, 2, 3).pipe(
      mergeScan((acc, value: string) => of(acc + value), 0)
    ); // $ExpectError
  });

  it('should enforce accumulate return type', () => {
    const o = of(1, 2, 3).pipe(mergeScan((acc, value) => of(''), 0)); // $ExpectError
  });

  it('should enforce concurrent type', () => {
    const o = of(1, 2, 3).pipe(
      mergeScan((acc, value) => of(acc + value), 0, '')
    ); // $ExpectError
  });

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

describe('pairs', () => {
  asDiagram('pairs({a: 1, b:2})')(
    'should create an observable emits key-value pair',
    () => {
      const e1 = pairs({a: 1, b: 2}, rxTestScheduler);
      const expected = '(ab|)';
      const values = {
        a: ['a', 1],
        b: ['b', 2]
      };

      expectSource(e1).toBe(expected, values);
    }
  );

  it('should create an observable without scheduler', (done: MochaDone) => {
    let expected = [
      ['a', 1],
      ['b', 2],
      ['c', 3]
    ];

    pairs({a: 1, b: 2, c: 3}).subscribe(
      x => {
        expect(x).to.deep.equal(expected.shift());
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(expected).to.be.empty;
        done();
      }
    );
  });

  it('should work with empty object', () => {
    const e1 = pairs({}, rxTestScheduler);
    const expected = '|';

    expectSource(e1).toBe(expected);
  });
});

describe('pairwise', () => {
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

  it('should infer correctly', () => {
    const o = of('apple', 'banana', 'peach').pipe(pairwise()); // $ExpectType Observable<[string, string]>
  });

  it('should infer correctly with multiple types', () => {
    const o = of('apple', 4, 'peach', 7).pipe(pairwise()); // $ExpectType Observable<[string | number, string | number]>
  });

  it('should enforce types', () => {
    const o = of('apple', 'banana', 'peach').pipe(pairwise('lemon')); // $ExpectError
  });

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

describe('partition', () => {
  function expectSourceArray(result: Observable<string>[], expected: string[]) {
    for (let idx = 0; idx < result.length; idx++) {
      expectSource(result[idx]).toBe(expected[idx]);
    }
  }

  asDiagram('partition(x => x % 2 === 1)')(
    'should partition an observable of ' + 'integers into even and odd',
    () => {
      const e1 = hot('--1-2---3------4--5---6--|');
      const e1subs = '^                        !';
      const expected = [
        '--1-----3---------5------|',
        '----2----------4------6--|'
      ];

      const result = partition(e1, (x: any) => x % 2 === 1);

      expectSourceArray(result, expected);
      expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
    }
  );
  it('should infer correctly', () => {
    const o = partition(of('a', 'b', 'c'), (value, index) => true); // $ExpectType [Observable<string>, Observable<string>]
    const p = partition(of('a', 'b', 'c'), () => true); // $ExpectType [Observable<string>, Observable<string>]
  });

  it('should accept a thisArg parameter', () => {
    const o = partition(of('a', 'b', 'c'), () => true, 5); // $ExpectType [Observable<string>, Observable<string>]
  });

  it('should enforce predicate', () => {
    const o = partition(of('a', 'b', 'c')); // $ExpectError
  });

  it('should enforce predicate types', () => {
    const o = partition(of('a', 'b', 'c'), 'nope'); // $ExpectError
    const p = partition(of('a', 'b', 'c'), (value: number) => true); // $ExpectError
    const q = partition(of('a', 'b', 'c'), (value, index: string) => true); // $ExpectError
  });

  it('should partition an observable into two using a predicate', () => {
    const e1 = hot('--a-b---a------d--a---c--|');
    const e1subs = '^                        !';
    const expected = [
      '--a-----a---------a------|',
      '----b----------d------c--|'
    ];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition an observable into two using a predicate that takes an index', () => {
    const e1 = hot('--a-b---a------d--e---c--|');
    const e1subs = '^                        !';
    const expected = [
      '--a-----a---------e------|',
      '----b----------d------c--|'
    ];

    function predicate(value: string, index: number) {
      return index % 2 === 0;
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition an observable into two using a predicate and thisArg', () => {
    const e1 = hot('--a-b---a------d--a---c--|');
    const e1subs = '^                        !';
    const expected = [
      '--a-----a---------a------|',
      '----b----------d------c--|'
    ];

    function predicate(this: any, x: string) {
      return x === this.value;
    }

    expectSourceArray(partition(e1, predicate, {value: 'a'}), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should pass errors to both returned observables', () => {
    const e1 = hot('--a-b---#');
    const e1subs = '^       !';
    const expected = ['--a-----#', '----b---#'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should pass errors to both returned observables if source throws', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = ['#', '#'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should pass errors to both returned observables if predicate throws', () => {
    const e1 = hot('--a-b--a--|');
    const e1subs = '^      !   ';
    const expected = ['--a----#   ', '----b--#   '];

    let index = 0;
    const error = 'error';
    function predicate(x: string) {
      const match = x === 'a';
      if (match && index++ > 1) {
        throw error;
      }
      return match;
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition empty observable if source does not emits', () => {
    const e1 = hot('----|');
    const e1subs = '^   !';
    const expected = ['----|', '----|'];

    function predicate(x: string) {
      return x === 'x';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition empty observable if source is empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const expected = ['|', '|'];

    function predicate(x: string) {
      return x === 'x';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition if source emits single elements', () => {
    const e1 = hot('--a--|');
    const e1subs = '^    !';
    const expected = ['--a--|', '-----|'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition if predicate matches all of source elements', () => {
    const e1 = hot('--a--a--a--a--a--a--a--|');
    const e1subs = '^                      !';
    const expected = ['--a--a--a--a--a--a--a--|', '-----------------------|'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition if predicate does not match all of source elements', () => {
    const e1 = hot('--b--b--b--b--b--b--b--|');
    const e1subs = '^                      !';
    const expected = ['-----------------------|', '--b--b--b--b--b--b--b--|'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition to infinite observable if source does not completes', () => {
    const e1 = hot('--a-b---a------d----');
    const e1subs = '^                   ';
    const expected = ['--a-----a-----------', '----b----------d----'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition to infinite observable if source never completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const expected = ['-', '-'];

    function predicate(x: string) {
      return x === 'a';
    }

    expectSourceArray(partition(e1, predicate), expected);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should partition into two observable with early unsubscription', () => {
    const e1 = hot('--a-b---a------d-|');
    const unsub = '       !          ';
    const e1subs = '^      !          ';
    const expected = ['--a-----          ', '----b---          '];

    function predicate(x: string) {
      return x === 'a';
    }
    const result = partition(e1, predicate);

    for (let idx = 0; idx < result.length; idx++) {
      expectSource(result[idx], unsub).toBe(expected[idx]);
    }
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const e1 = hot('--a-b---a------d-|');
    const e1subs = '^      !          ';
    const expected = ['--a-----          ', '----b---          '];
    const unsub = '       !          ';

    const e1Pipe = e1.pipe(mergeMap((x: string) => of(x)));
    const result = partition(e1Pipe, (x: string) => x === 'a');

    expectSource(result[0], unsub).toBe(expected[0]);
    expectSource(result[1], unsub).toBe(expected[1]);
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs]);
  });

  it('should accept thisArg', () => {
    const thisArg = {};

    partition(
      of(1),
      function (this: any, value: number) {
        expect(this).to.deep.equal(thisArg);
        return true;
      },
      thisArg
    ).forEach((observable: Observable<number>) => observable.subscribe());
  });
});

describe('pluck', () => {
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

  it('should infer correctly', () => {
    const a = of({name: 'abc'}).pipe(pluck('name')); // $ExpectType Observable<string>
  });

  it('should support nested object of 2 layer depth', () => {
    const a = of({a: {name: 'abc'}}).pipe(pluck('a', 'name')); // $ExpectType Observable<string>
  });

  it('should support nested object of 3 layer depth', () => {
    const a = of({a: {b: {name: 'abc'}}}).pipe(pluck('a', 'b', 'name')); // $ExpectType Observable<string>
  });

  it('should support nested object of 4 layer depth', () => {
    const a = of({a: {b: {c: {name: 'abc'}}}}).pipe(
      pluck('a', 'b', 'c', 'name')
    ); // $ExpectType Observable<string>
  });

  it('should support nested object of 5 layer depth', () => {
    const a = of({a: {b: {c: {d: {name: 'abc'}}}}}).pipe(
      pluck('a', 'b', 'c', 'd', 'name')
    ); // $ExpectType Observable<string>
  });

  it('should support nested object of 6 layer depth', () => {
    const a = of({a: {b: {c: {d: {e: {name: 'abc'}}}}}}).pipe(
      pluck('a', 'b', 'c', 'd', 'e', 'name')
    ); // $ExpectType Observable<string>
  });

  it('should support nested object of more than 6 layer depth', () => {
    const a = of({a: {b: {c: {d: {e: {f: {name: 'abc'}}}}}}}).pipe(
      pluck('a', 'b', 'c', 'd', 'e', 'f', 'name')
    ); // $ExpectType Observable<unknown>
  });

  it('should accept existing keys only', () => {
    const a = of({name: 'abc'}).pipe(pluck('xyz')); // $ExpectType Observable<unknown>
  });

  it('should not accept empty parameter', () => {
    const a = of({name: 'abc'}).pipe(pluck()); // $ExpectType Observable<unknown>
  });

  it('should not accept a number when plucking an object', () => {
    const a = of({name: 'abc'}).pipe(pluck(1)); // $ExpectError
  });

  it("should not infer type from the variable if key doesn't exist", () => {
    const a: Observable<number> = of({name: 'abc'}).pipe(pluck('xyz')); // $ExpectError
  });

  it('should accept a spread of arguments', () => {
    const obj = {
      foo: {
        bar: {
          baz: 123
        }
      }
    };

    const path = ['foo', 'bar', 'baz'];
    const a = of(obj).pipe(pluck(...path)); // $ExpectType Observable<unknown>

    const path2 = ['bar', 'baz'];
    const b = of(obj).pipe(pluck('foo', ...path2)); // $ExpectType Observable<unknown>
  });

  it('should support arrays', () => {
    const a = of(['abc']).pipe(pluck(0)); // $ExpectType Observable<string>
  });

  it('should support picking by symbols', () => {
    const sym = Symbol('sym');
    const a = of({[sym]: 'abc'}).pipe(pluck(sym)); // $ExpectType Observable<string>
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

describe('scan', () => {
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

  it('should enforce parameter', () => {
    const a = of(1, 2, 3).pipe(scan()); // $ExpectError
  });

  it('should infer correctly ', () => {
    const a = of(1, 2, 3).pipe(scan((x, y, z) => x + 1)); // $ExpectType Observable<number>
  });

  it('should infer correctly for accumulator of type array', () => {
    const a = of(1, 2, 3).pipe(
      scan((x: number[], y: number, i: number) => x, [])
    ); // $ExpectType Observable<number[]>
  });

  it('should accept seed parameter of the same type', () => {
    const a = of(1, 2, 3).pipe(scan((x, y, z) => x + 1, 5)); // $ExpectType Observable<number>
    const b = of(1, 2, 3).pipe(scan((x, y, z) => x + 1, [])); // $ExpectError
  });

  it('should accept seed parameter of the seed array type', () => {
    const a = of(1, 2, 3).pipe(
      scan(
        (x, y, z) => {
          x.push(y);
          return x;
        },
        [4]
      )
    ); // $ExpectType Observable<number[]>
    // Array must be typed...
    const b = of(1, 2, 3).pipe(
      scan((x, y, z) => {
        x.push(y);
        return x;
      }, [])
    ); // $ExpectError
  });

  it('should accept seed parameter of a different type', () => {
    const a = of(1, 2, 3).pipe(scan((x, y, z) => x + '1', '5')); // $ExpectType Observable<string>
    const bv: {[key: string]: string} = {};
    const b = of(1, 2, 3).pipe(
      scan((x, y, z) => ({...x, [y]: y.toString()}), bv)
    ); // $ExpectType Observable<{ [key: string]: string; }>
  });

  it('should act appropriately with no seed', () => {
    const a = of(1, 2, 3).pipe(scan((a: any, v) => '' + v)); // $ExpectType Observable<any>
    const b = of(1, 2, 3).pipe(scan((a, v) => v)); // $ExpectType Observable<number>
    const c = of(1, 2, 3).pipe(scan(() => {})); // $ExpectType Observable<number | void>
  });

  it('should act appropriately with a seed', () => {
    const a = of(1, 2, 3).pipe(scan((a, v) => a + v, '')); // $ExpectType Observable<string>
    const b = of(1, 2, 3).pipe(scan((a, v) => a + v, 0)); // $ExpectType Observable<number>
    const c = of(1, 2, 3).pipe(scan((a, v) => a + 1, [])); // $ExpectError
  });

  it('should infer types properly from arguments', () => {
    function toArrayReducer(
      arr: number[],
      item: number,
      index: number
    ): number[] {
      if (index === 0) {
        return [item];
      }
      arr.push(item);
      return arr;
    }

    const a = scan(toArrayReducer, [] as number[]); // $ExpectType Lifter<number, number[]>
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
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(switchMap(p => of(Boolean(p)))); // $ExpectType Observable<boolean>
  });

  it('should support a projector that takes an index', () => {
    const o = of(1, 2, 3).pipe(switchMap(p => of(Boolean(p)))); // $ExpectType Observable<boolean>
  });

  it('should infer correctly by using the resultSelector first parameter', () => {
    const o = of(1, 2, 3).pipe(
      switchMap(
        p => of(Boolean(p)),
        a => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should infer correctly by using the resultSelector second parameter', () => {
    const o = of(1, 2, 3).pipe(
      switchMap(
        p => of(Boolean(p)),
        (a, b) => b
      )
    ); // $ExpectType Observable<boolean>
  });

  it('should support a resultSelector that takes an inner index', () => {
    const o = of(1, 2, 3).pipe(
      switchMap(
        p => of(Boolean(p)),
        (a, b, i) => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should support a resultSelector that takes an inner and outer index', () => {
    const o = of(1, 2, 3).pipe(
      switchMap(
        p => of(Boolean(p)),
        (a, b, i, ii) => a
      )
    ); // $ExpectType Observable<number>
  });

  it('should support an undefined resultSelector', () => {
    const o = of(1, 2, 3).pipe(switchMap(p => of(Boolean(p)), undefined)); // $ExpectType Observable<boolean>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(switchMap()); // $ExpectError
  });

  it('should enforce the return type', () => {
    const o = of(1, 2, 3).pipe(switchMap(p => p)); // $ExpectError
  });

  it('should support projecting to union types', () => {
    const o = of(Math.random()).pipe(
      switchMap(n => (n > 0.5 ? of(123) : of('test')))
    ); // $ExpectType Observable<string | number>
  });

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
      switchMap(value => asInterop(observableLookup[value])),
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
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(switchMapTo(of('foo'))); // $ExpectType Observable<string>
  });

  it('should infer correctly with multiple types', () => {
    const o = of(1, 2, 3).pipe(switchMapTo(of('foo', 4))); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with an array', () => {
    const o = of(1, 2, 3).pipe(switchMapTo([4, 5, 6])); // $ExpectType Observable<number>
  });

  it('should infer correctly with a Promise', () => {
    const o = of(1, 2, 3).pipe(
      switchMapTo(
        new Promise<string>(() => {})
      )
    ); // $ExpectType Observable<string>
  });

  it('should infer correctly by using the resultSelector first parameter', () => {
    const o = of(1, 2, 3).pipe(switchMapTo(of('foo'), a => a)); // $ExpectType Observable<number>
  });

  it('should infer correctly by using the resultSelector second parameter', () => {
    const o = of(1, 2, 3).pipe(switchMapTo(of('foo'), (a, b) => b)); // $ExpectType Observable<string>
  });

  it('should support a resultSelector that takes an inner index', () => {
    const o = of(1, 2, 3).pipe(
      switchMapTo(of('foo'), (a, b, innnerIndex) => a)
    ); // $ExpectType Observable<number>
  });

  it('should support a resultSelector that takes an inner and outer index', () => {
    const o = of(1, 2, 3).pipe(
      switchMapTo(of('foo'), (a, b, innnerIndex, outerX) => a)
    ); // $ExpectType Observable<number>
  });

  it('should support an undefined resultSelector', () => {
    const o = of(1, 2, 3).pipe(switchMapTo(of('foo'), undefined)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(switchMapTo()); // $ExpectError
  });

  it('should enforce the return type', () => {
    const o = of(1, 2, 3).pipe(switchMapTo(p => p)); // $ExpectError
    const p = of(1, 2, 3).pipe(switchMapTo(4)); // $ExpectError
  });

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
  it('should infer correctly', () => {
    const o = of(of(1, 2, 3)).pipe(switchAll()); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(switchAll()); // $ExpectError
  });

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

describe('window', () => {
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
  it('should infer correctly', () => {
    of(1).pipe(window(of('1'))); // $ExpectType Observable<Observable<number>>
  });

  it('should enforce types', () => {
    of(1).pipe(window('')); // $ExpectError
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

describe('windowCount', () => {
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
  it('should infer correctly', () => {
    of('test').pipe(windowCount(1)); // $ExpectType Observable<Observable<string>>
    of('test').pipe(windowCount(1, 2)); // $ExpectType Observable<Observable<string>>
  });

  it('should enforce windowSize type', () => {
    of(1).pipe(windowCount()); // $ExpectError
    of(1).pipe(windowCount('1')); // $ExpectError
  });

  it('should enforce startEveryWindow type', () => {
    of(1).pipe(windowCount(1, '2')); // $ExpectError
  });

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

describe('windowTime', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(sourceMatcher);
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(windowTime(10)); // $ExpectType Observable<Observable<string>>
    const p = of('a', 'b', 'c').pipe(windowTime(10, asyncScheduler)); // $ExpectType Observable<Observable<string>>
  });

  it('should support a windowCreationInterval', () => {
    const o = of('a', 'b', 'c').pipe(windowTime(10, 30)); // $ExpectType Observable<Observable<string>>
    const p = of('a', 'b', 'c').pipe(windowTime(10, 30, asyncScheduler)); // $ExpectType Observable<Observable<string>>
  });

  it('should support a maxWindowSize', () => {
    const o = of('a', 'b', 'c').pipe(windowTime(10, 30, 80)); // $ExpectType Observable<Observable<string>>
    const p = of('a', 'b', 'c').pipe(windowTime(10, 30, 80, asyncScheduler)); // $ExpectType Observable<Observable<string>>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(windowTime()); // $ExpectError
  });

  it('should enforce windowTimeSpan type', () => {
    const o = of('a', 'b', 'c').pipe(windowTime('nope')); // $ExpectError
  });

  it('should enforce windowCreationInterval type', () => {
    const o = of('a', 'b', 'c').pipe(windowTime(10, 'nope')); // $ExpectError
  });

  it('should enforce maxWindowSize type', () => {
    const o = of('a', 'b', 'c').pipe(windowTime(10, 30, 'nope')); // $ExpectError
  });

  it('should enforce scheduler type', () => {
    const o = of('a', 'b', 'c').pipe(windowTime(10, 30, 50, 'nope')); // $ExpectError
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

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(windowToggle(of(1, 2, 3), () => of({}))); // $ExpectType Observable<Observable<string>>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(windowToggle()); // $ExpectError
  });

  it('should enforce openings type', () => {
    const o = of('a', 'b', 'c').pipe(windowToggle('nope')); // $ExpectError
  });

  it('should enforce closingSelector type', () => {
    const o = of('a', 'b', 'c').pipe(windowToggle(of(1, 2, 3), 'nope')); // $ExpectError
    const p = of('a', 'b', 'c').pipe(
      windowToggle(of(1, 2, 3), (closingSelector: string) => of(1))
    ); // $ExpectError
  });

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

describe('windowWhen', () => {
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

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(windowWhen(() => of(1, 2, 3))); // $ExpectType Observable<Observable<string>>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(windowWhen()); // $ExpectError
  });

  it('should enforce closingSelector type', () => {
    const o = of('a', 'b', 'c').pipe(windowWhen('nope')); // $ExpectError
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
