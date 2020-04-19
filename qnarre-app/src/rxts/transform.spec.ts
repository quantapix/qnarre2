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
