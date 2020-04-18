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
