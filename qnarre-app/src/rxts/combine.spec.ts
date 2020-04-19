import {hot, cold, expectSource, expectSubscriptions} from './testing';
//import {queueScheduler as rxQueue, zip, from, of, Observable} from 'rxjs';
//import {zipAll, mergeMap} from 'rxjs/operators';
//import {zipWith, mergeMap} from 'rxjs/operators';
//import {queueScheduler, of} from 'rxjs';
import {sourceMatcher, TestScheduler} from './testing';
//import {zip} from 'rxjs/operators';
//import {from} from 'rxjs';

declare const type: Function;
declare function asDiagram(arg: string): Function;

declare const Symbol: any;

const queueScheduler = rxQueue;

describe('endWith', () => {
  const defaultStartValue = 'x';

  asDiagram('endWith(s)')('should append to a cold Observable', () => {
    const e1 = cold('---a--b--c--|');
    const e1subs = '^           !';
    const expected = '---a--b--c--(s|)';

    expectSource(e1.pipe(endWith('s'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
  it('should support a scheduler', () => {
    const r = of(a).pipe(endWith(asyncScheduler)); // $ExpectType Observable<A>
  });

  it('should infer type for N values', () => {
    const r0 = of(a).pipe(endWith()); // $ExpectType Observable<A>
    const r1 = of(a).pipe(endWith(b)); // $ExpectType Observable<A | B>
    const r2 = of(a).pipe(endWith(b, c)); // $ExpectType Observable<A | B | C>
    const r3 = of(a).pipe(endWith(b, c, d)); // $ExpectType Observable<A | B | C | D>
    const r4 = of(a).pipe(endWith(b, c, d, e)); // $ExpectType Observable<A | B | C | D | E>
    const r5 = of(a).pipe(endWith(b, c, d, e, f)); // $ExpectType Observable<A | B | C | D | E | F>
    const r6 = of(a).pipe(endWith(b, c, d, e, f, g)); // $ExpectType Observable<A | B | C | D | E | F | G>
    const r7 = of(a).pipe(endWith(b, c, d, e, f, g, h)); // $ExpectType Observable<A | B | C | D | E | F | G | H>
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

describe('startWith', () => {
  const defaultStartValue = 'x';

  asDiagram('startWith(s)')('should prepend to a cold Observable', () => {
    const e1 = cold('---a--b--c--|');
    const e1subs = '^           !';
    const expected = 's--a--b--c--|';

    expectSource(e1.pipe(startWith('s'))).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });
  it('should infer correctly with N values', () => {
    const r0 = of(a).pipe(startWith()); // $ExpectType Observable<A>
    const r1 = of(a).pipe(startWith(b)); // $ExpectType Observable<A | B>
    const r2 = of(a).pipe(startWith(b, c)); // $ExpectType Observable<A | B | C>
    const r3 = of(a).pipe(startWith(b, c, d)); // $ExpectType Observable<A | B | C | D>
    const r4 = of(a).pipe(startWith(b, c, d, e)); // $ExpectType Observable<A | B | C | D | E>
    const r5 = of(a).pipe(startWith(b, c, d, e, f)); // $ExpectType Observable<A | B | C | D | E | F>
    const r6 = of(a).pipe(startWith(b, c, d, e, f, g)); // $ExpectType Observable<A | B | C | D | E | F | G>
    const r7 = of(a).pipe(startWith(b, c, d, e, f, g, h)); // $ExpectType Observable<A | B | C | D | E | F | G | H>
  });

  it('should infer correctly with only a scheduler', () => {
    const r = of(a).pipe(startWith(asyncScheduler)); // $ExpectType Observable<A>
    const r1 = of(a).pipe(startWith(b, asyncScheduler)); // $ExpectType Observable<A | B>
    const r2 = of(a).pipe(startWith(b, c, asyncScheduler)); // $ExpectType Observable<A | B | C>
    const r3 = of(a).pipe(startWith(b, c, d, asyncScheduler)); // $ExpectType Observable<A | B | C | D>
    const r4 = of(a).pipe(startWith(b, c, d, e, asyncScheduler)); // $ExpectType Observable<A | B | C | D | E>
    const r5 = of(a).pipe(startWith(b, c, d, e, f, asyncScheduler)); // $ExpectType Observable<A | B | C | D | E | F>
    const r6 = of(a).pipe(startWith(b, c, d, e, f, g, asyncScheduler)); // $ExpectType Observable<A | B | C | D | E | F | G>
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

describe('zip', () => {
  it('should support observables', () => {
    const a = of(1); // $ExpectType Observable<number>
    const b = of('foo'); // $ExpectType Observable<string>
    const c = of(true); // $ExpectType Observable<boolean>
    const o1 = zip(a, b, c); // $ExpectType Observable<[number, string, boolean]>
  });
  it('should support mixed observables and promises', () => {
    const a = Promise.resolve(1); // $ExpectType Promise<number>
    const b = of('foo'); // $ExpectType Observable<string>
    const c = of(true); // $ExpectType Observable<boolean>
    const d = of(['bar']); // $ExpectType Observable<string[]>
    const o1 = zip(a, b, c, d); // $ExpectType Observable<[number, string, boolean, string[]]>
  });
  it('should support arrays of promises', () => {
    const a = [Promise.resolve(1)]; // $ExpectType Promise<number>[]
    const o1 = zip(a); // $ExpectType Observable<number[]>
    const o2 = zip(...a); // $ExpectType Observable<number[]>
  });
  it('should support arrays of observables', () => {
    const a = [of(1)]; // $ExpectType Observable<number>[]
    const o1 = zip(a); // $ExpectType Observable<number[]>
    const o2 = zip(...a); // $ExpectType Observable<number[]>
  });
  it('should return Array<T> when given a single promise', () => {
    const a = Promise.resolve(1); // $ExpectType Promise<number>
    const o1 = zip(a); // $ExpectType Observable<number[]>
  });
  it('should return Array<T> when given a single observable', () => {
    const a = of(1); // $ExpectType Observable<number>
    const o1 = zip(a); // $ExpectType Observable<number[]>
  });
  it('should support union types', () => {
    const u = Math.random() > 0.5 ? of(123) : of('abc');
    const o = zip(u, u, u); // $ExpectType Observable<[string | number, string | number, string | number]>
  });
  it('should support different union types', () => {
    const u = Math.random() > 0.5 ? of(123) : of('abc');
    const u2 = Math.random() > 0.5 ? of(true) : of([1, 2, 3]);
    const o = zip(u, u2); // $ExpectType Observable<[string | number, boolean | number[]]>
  });
  it('should support rest parameter observables', () => {
    const o = of(1); // $ExpectType Observable<number>
    const z = [of(2)]; // $ExpectType Observable<number>[]
    const a = o.pipe(zip(...z)); // $ExpectType Observable<unknown>
  });
  it('should support rest parameter observables with type parameters', () => {
    const o = of(1); // $ExpectType Observable<number>
    const z = [of(2)]; // $ExpectType Observable<number>[]
    const a = o.pipe(zip<number, number[]>(...z)); // $ExpectType Observable<number[]>
  });
  it('should support projected rest parameter observables', () => {
    const o = of(1); // $ExpectType Observable<number>
    const z = [of(2)]; // $ExpectType Observable<number>[]
    const a = o.pipe(zip(...z, (...r) => r.map(v => v.toString()))); // $ExpectType Observable<string[]>
  });
  it('should support projected rest parameter observables with type parameters', () => {
    const o = of(1); // $ExpectType Observable<number>
    const z = [of(2)]; // $ExpectType Observable<number>[]
    const a = o.pipe(
      zip<number, string[]>(...z, (...r) => r.map(v => v.toString()))
    ); // $ExpectType Observable<string[]>
  });
  it('should support projected arrays of observables', () => {
    const o = of(1); // $ExpectType Observable<number>
    const z = [of(2)]; // $ExpectType Observable<number>[]
    const a = o.pipe(zip(z, (...r: any[]) => r.map(v => v.toString()))); // $ExpectType Observable<any[]>
  });
  it('should support projected arrays of observables with type parameters', () => {
    const o = of(1); // $ExpectType Observable<number>
    const z = [of(2)]; // $ExpectType Observable<number>[]
    const a = o.pipe(
      zip<number, number, string[]>(z, (...r: any[]) =>
        r.map(v => v.toString())
      )
    ); // $ExpectType Observable<string[]>
  });
  it('should combine a source with a second', () => {
    const a = hot('---1---2---3---');
    const asubs = '^';
    const b = hot('--4--5--6--7--8--');
    const bsubs = '^';
    const expected = '---x---y---z';
    expectSource(zip(a, b)).toBe(expected, {
      x: ['1', '4'],
      y: ['2', '5'],
      z: ['3', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });
  it('should zip the provided observables', (done: MochaDone) => {
    const expected = ['a1', 'b2', 'c3'];
    let i = 0;
    zip(
      from(['a', 'b', 'c']),
      from([1, 2, 3]),
      (a: string, b: number) => a + b
    ).subscribe(
      (x: string) => {
        expect(x).to.equal(expected[i++]);
      },
      null,
      done
    );
  });
  it('should end once one observable completes and its buffer is empty', () => {
    const e1 = hot('---a--b--c--|               ');
    const e1subs = '^           !               ';
    const e2 = hot('------d----e----f--------|  ');
    const e2subs = '^                 !         ';
    const e3 = hot('--------h----i----j---------'); // doesn't complete
    const e3subs = '^                 !         ';
    const expected = '--------x----y----(z|)      '; // e1 complete and buffer empty
    const values = {
      x: ['a', 'd', 'h'],
      y: ['b', 'e', 'i'],
      z: ['c', 'f', 'j']
    };

    expectSource(zip(e1, e2, e3)).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it(
    'should end once one observable nexts and zips value from completed other ' +
      'observable whose buffer is empty',
    () => {
      const e1 = hot('---a--b--c--|             ');
      const e1subs = '^           !             ';
      const e2 = hot('------d----e----f|        ');
      const e2subs = '^                !        ';
      const e3 = hot('--------h----i----j-------'); // doesn't complete
      const e3subs = '^                 !       ';
      const expected = '--------x----y----(z|)    '; // e2 buffer empty and signaled complete
      const values = {
        x: ['a', 'd', 'h'],
        y: ['b', 'e', 'i'],
        z: ['c', 'f', 'j']
      };

      expectSource(zip(e1, e2, e3)).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    }
  );

  describe('with iterables', () => {
    it('should zip them with values', () => {
      const myIterator = <any>{
        count: 0,
        next: function () {
          return {value: this.count++, done: false};
        }
      };

      myIterator[Symbol.iterator] = function () {
        return this;
      };

      const e1 = hot('---a---b---c---d---|');
      const e1subs = '^                  !';
      const expected = '---w---x---y---z---|';

      const values = {
        w: ['a', 0],
        x: ['b', 1],
        y: ['c', 2],
        z: ['d', 3]
      };

      expectSource(zip(e1, myIterator)).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });

    it('should only call `next` as needed', () => {
      let nextCalled = 0;
      const myIterator = <any>{
        count: 0,
        next() {
          nextCalled++;
          return {value: this.count++, done: false};
        }
      };
      myIterator[Symbol.iterator] = function () {
        return this;
      };

      zip(of(1, 2, 3), myIterator).subscribe();

      // since zip will call `next()` in advance, total calls when
      // zipped with 3 other values should be 4.
      expect(nextCalled).to.equal(4);
    });

    it('should work with never observable and empty iterable', () => {
      const a = cold('-');
      const asubs = '^';
      const b: number[] = [];
      const expected = '-';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with empty observable and empty iterable', () => {
      const a = cold('|');
      const asubs = '(^!)';
      const b: number[] = [];
      const expected = '|';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with empty observable and non-empty iterable', () => {
      const a = cold('|');
      const asubs = '(^!)';
      const b = [1];
      const expected = '|';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and empty iterable', () => {
      const a = hot('---^----a--|');
      const asubs = '^       !';
      const b: number[] = [];
      const expected = '--------|';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with never observable and non-empty iterable', () => {
      const a = cold('-');
      const asubs = '^';
      const b = [1];
      const expected = '-';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and non-empty iterable', () => {
      const a = hot('---^----1--|');
      const asubs = '^    !   ';
      const b = [2];
      const expected = '-----(x|)';

      expectSource(zip(a, b)).toBe(expected, {x: ['1', 2]});
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and empty iterable', () => {
      const a = hot('---^----#');
      const asubs = '^    !';
      const b: number[] = [];
      const expected = '-----#';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with observable which raises error and non-empty iterable', () => {
      const a = hot('---^----#');
      const asubs = '^    !';
      const b = [1];
      const expected = '-----#';

      expectSource(zip(a, b)).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty many observable and non-empty many iterable', () => {
      const a = hot('---^--1--2--3--|');
      const asubs = '^        !   ';
      const b = [4, 5, 6];
      const expected = '---x--y--(z|)';

      expectSource(zip(a, b)).toBe(expected, {
        x: ['1', 4],
        y: ['2', 5],
        z: ['3', 6]
      });
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and non-empty iterable selector that throws', () => {
      const a = hot('---^--1--2--3--|');
      const asubs = '^     !';
      const b = [4, 5, 6];
      const expected = '---x--#';

      const selector = (x: string, y: number) => {
        if (y === 5) {
          throw new Error('too bad');
        } else {
          return x + y;
        }
      };
      expectSource(zip(a, b, selector)).toBe(
        expected,
        {x: '14'},
        new Error('too bad')
      );
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });
  });

  it('should combine two observables and selector', () => {
    const a = hot('---1---2---3---');
    const asubs = '^';
    const b = hot('--4--5--6--7--8--');
    const bsubs = '^';
    const expected = '---x---y---z';

    expectSource(zip(a, b, (e1: string, e2: string) => e1 + e2)).toBe(
      expected,
      {x: '14', y: '25', z: '36'}
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with n-ary symmetric', () => {
    const a = hot('---1-^-1----4----|');
    const asubs = '^         !  ';
    const b = hot('---1-^--2--5----| ');
    const bsubs = '^         !  ';
    const c = hot('---1-^---3---6-|  ');
    const expected = '----x---y-|  ';

    expectSource(zip(a, b, c)).toBe(expected, {
      x: ['1', '2', '3'],
      y: ['4', '5', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with n-ary symmetric selector', () => {
    const a = hot('---1-^-1----4----|');
    const asubs = '^         !  ';
    const b = hot('---1-^--2--5----| ');
    const bsubs = '^         !  ';
    const c = hot('---1-^---3---6-|  ');
    const expected = '----x---y-|  ';

    const observable = zip(a, b, c, (r0: string, r1: string, r2: string) => [
      r0,
      r1,
      r2
    ]);
    expectSource(observable).toBe(expected, {
      x: ['1', '2', '3'],
      y: ['4', '5', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with n-ary symmetric array selector', () => {
    const a = hot('---1-^-1----4----|');
    const asubs = '^         !  ';
    const b = hot('---1-^--2--5----| ');
    const bsubs = '^         !  ';
    const c = hot('---1-^---3---6-|  ');
    const expected = '----x---y-|  ';

    const observable = zip(a, b, c, (r0: string, r1: string, r2: string) => [
      r0,
      r1,
      r2
    ]);
    expectSource(observable).toBe(expected, {
      x: ['1', '2', '3'],
      y: ['4', '5', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with some data asymmetric 1', () => {
    const a = hot('---1-^-1-3-5-7-9-x-y-z-w-u-|');
    const asubs = '^                 !    ';
    const b = hot('---1-^--2--4--6--8--0--|    ');
    const bsubs = '^                 !    ';
    const expected = '---a--b--c--d--e--|    ';

    expectSource(zip(a, b, (r1: string, r2: string) => r1 + r2)).toBe(
      expected,
      {a: '12', b: '34', c: '56', d: '78', e: '90'}
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with some data asymmetric 2', () => {
    const a = hot('---1-^--2--4--6--8--0--|    ');
    const asubs = '^                 !    ';
    const b = hot('---1-^-1-3-5-7-9-x-y-z-w-u-|');
    const bsubs = '^                 !    ';
    const expected = '---a--b--c--d--e--|    ';

    expectSource(zip(a, b, (r1: string, r2: string) => r1 + r2)).toBe(
      expected,
      {a: '21', b: '43', c: '65', d: '87', e: '09'}
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with some data symmetric', () => {
    const a = hot('---1-^-1-3-5-7-9------| ');
    const asubs = '^                ! ';
    const b = hot('---1-^--2--4--6--8--0--|');
    const bsubs = '^                ! ';
    const expected = '---a--b--c--d--e-| ';

    expectSource(zip(a, b, (r1: string, r2: string) => r1 + r2)).toBe(
      expected,
      {a: '12', b: '34', c: '56', d: '78', e: '90'}
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with selector throws', () => {
    const a = hot('---1-^-2---4----|  ');
    const asubs = '^       !     ';
    const b = hot('---1-^--3----5----|');
    const bsubs = '^       !     ';
    const expected = '---x----#     ';

    const selector = (x: string, y: string) => {
      if (y === '5') {
        throw new Error('too bad');
      } else {
        return x + y;
      }
    };
    const observable = zip(a, b, selector);
    expectSource(observable).toBe(expected, {x: '23'}, new Error('too bad'));
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with right completes first', () => {
    const a = hot('---1-^-2-----|');
    const asubs = '^     !';
    const b = hot('---1-^--3--|');
    const bsubs = '^     !';
    const expected = '---x--|';

    expectSource(zip(a, b)).toBe(expected, {x: ['2', '3']});
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with two nevers', () => {
    const a = cold('-');
    const asubs = '^';
    const b = cold('-');
    const bsubs = '^';
    const expected = '-';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with never and empty', () => {
    const a = cold('-');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and never', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = cold('-');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and empty', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and non-empty', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = hot('---1--|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with non-empty and empty', () => {
    const a = hot('---1--|');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with never and non-empty', () => {
    const a = cold('-');
    const asubs = '^';
    const b = hot('---1--|');
    const bsubs = '^     !';
    const expected = '-';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with non-empty and never', () => {
    const a = hot('---1--|');
    const asubs = '^     !';
    const b = cold('-');
    const bsubs = '^';
    const expected = '-';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and error', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = hot('------#', undefined, 'too bad');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and empty', () => {
    const a = hot('------#', undefined, 'too bad');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error', () => {
    const a = hot('----------|');
    const asubs = '^     !    ';
    const b = hot('------#    ');
    const bsubs = '^     !    ';
    const expected = '------#    ';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with never and error', () => {
    const a = cold('-');
    const asubs = '^     !';
    const b = hot('------#');
    const bsubs = '^     !';
    const expected = '------#';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and never', () => {
    const a = hot('------#');
    const asubs = '^     !';
    const b = cold('-');
    const bsubs = '^     !';
    const expected = '------#';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and error', () => {
    const a = hot('------#', undefined, 'too bad');
    const asubs = '^     !';
    const b = hot('----------#', undefined, 'too bad 2');
    const bsubs = '^     !';
    const expected = '------#';

    expectSource(zip(a, b)).toBe(expected, null, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with two sources that eventually raise errors', () => {
    const a = hot('--w-----#----', {w: 1}, 'too bad');
    const asubs = '^       !';
    const b = hot('-----z-----#-', {z: 2}, 'too bad 2');
    const bsubs = '^       !';
    const expected = '-----x--#';

    expectSource(zip(a, b)).toBe(expected, {x: [1, 2]}, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with two sources that eventually raise errors (swapped)', () => {
    const a = hot('-----z-----#-', {z: 2}, 'too bad 2');
    const asubs = '^       !';
    const b = hot('--w-----#----', {w: 1}, 'too bad');
    const bsubs = '^       !';
    const expected = '-----x--#';

    expectSource(zip(a, b)).toBe(expected, {x: [2, 1]}, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and some', () => {
    const a = cold('#');
    const asubs = '(^!)';
    const b = hot('--1--2--3--');
    const bsubs = '(^!)';
    const expected = '#';

    expectSource(zip(a, b)).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should combine an immediately-scheduled source with an immediately-scheduled second', (done: MochaDone) => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [
      [1, 4],
      [2, 5],
      [3, 6]
    ];
    let i = 0;

    zip(a, b).subscribe(
      (vals: Array<number>) => {
        expect(vals).to.deep.equal(r[i++]);
      },
      null,
      done
    );
  });

  type('should support observables', () => {
    let a: Observable<number>;
    let b: Observable<string>;
    let c: Observable<boolean>;
    let o1: Observable<[number, string, boolean]> = zip(a!, b!, c!);
  });

  type('should support mixed observables and promises', () => {
    let a: Promise<number>;
    let b: Observable<string>;
    let c: Promise<boolean>;
    let d: Observable<string[]>;
    let o1: Observable<[number, string, boolean, string[]]> = zip(
      a!,
      b!,
      c!,
      d!
    );
  });

  type('should support arrays of promises', () => {
    let a: Promise<number>[];
    let o1: Observable<number[]> = zip(a!);
    let o2: Observable<number[]> = zip(...a!);
  });

  type('should support arrays of observables', () => {
    let a: Observable<number>[];
    let o1: Observable<number[]> = zip(a!);
    let o2: Observable<number[]> = zip(...a!);
  });

  type('should return Array<T> when given a single promise', () => {
    let a: Promise<number>;
    let o1: Observable<number[]> = zip(a!);
  });

  type('should return Array<T> when given a single observable', () => {
    let a: Observable<number>;
    let o1: Observable<number[]> = zip(a!);
  });
});

describe('zipAll', () => {
  asDiagram('zipAll')(
    'should combine paired events from two observables',
    () => {
      const x = cold('-a-----b-|');
      const y = cold('--1-2-----');
      const outer = hot('-x----y--------|         ', {x: x, y: y});
      const expected = '-----------------A----B-|';

      const result = outer.pipe(zipAll((a, b) => String(a) + String(b)));

      expectSource(result).toBe(expected, {A: 'a1', B: 'b2'});
    }
  );
  it('should infer correctly', () => {
    const o = of(of(1, 2, 3)).pipe(zipAll()); // $ExpectType Observable<number[]>
  });
  it('should support projecting values', () => {
    const o = of(of(1, 2, 3)).pipe(zipAll(value => String(value))); // $ExpectType Observable<string>
  });
  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(zipAll()); // $ExpectError
  });
  it('should enforce projector types', () => {
    const o = of(of(1, 2, 3)).pipe(zipAll('foo')); // $ExpectError
    const p = of(of(1, 2, 3)).pipe(zipAll([4, 5, 6])); // $ExpectError
    const q = of(of(1, 2, 3)).pipe(zipAll(Promise.resolve(4))); // $ExpectError
    const r = of(of(1, 2, 3)).pipe(zipAll(of(4, 5, 6))); // $ExpectError
    const myIterator: Iterator<number | undefined> = {
      next(value) {
        return {done: false, value};
      }
    };
    const s = of(of(1, 2, 3)).pipe(zipAll(myIterator)); // $ExpectError
  });
  it('should still zip Observable<string>, because strings are iterables (GOTCHA)', () => {
    const o = of('test').pipe(zipAll()); // $ExpectType Observable<string[]>
  });
  it('should combine two observables', () => {
    const a = hot('---1---2---3---');
    const asubs = '^';
    const b = hot('--4--5--6--7--8--');
    const bsubs = '^';
    const expected = '---x---y---z';
    const values = {x: ['1', '4'], y: ['2', '5'], z: ['3', '6']};

    expectSource(of(a, b).pipe(zipAll())).toBe(expected, values);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });
  it('should take all observables from the source and zip them', done => {
    const expected = ['a1', 'b2', 'c3'];
    let i = 0;
    const source = of(of('a', 'b', 'c'), of(1, 2, 3))
      .pipe(zipAll((a: string, b: number) => a + b))
      .subscribe(
        x => {
          expect(x).to.equal(expected[i++]);
        },
        null,
        done
      );
  });
  it('should end once one observable completes and its buffer is empty', () => {
    const e1 = hot('---a--b--c--|               ');
    const e1subs = '^           !               ';
    const e2 = hot('------d----e----f--------|  ');
    const e2subs = '^                 !         ';
    const e3 = hot('--------h----i----j---------'); // doesn't complete
    const e3subs = '^                 !         ';
    const expected = '--------x----y----(z|)      '; // e1 complete and buffer empty
    const values = {
      x: ['a', 'd', 'h'],
      y: ['b', 'e', 'i'],
      z: ['c', 'f', 'j']
    };

    expectSource(of(e1, e2, e3).pipe(zipAll())).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it(
    'should end once one observable nexts and zips value from completed other ' +
      'observable whose buffer is empty',
    () => {
      const e1 = hot('---a--b--c--|             ');
      const e1subs = '^           !             ';
      const e2 = hot('------d----e----f|        ');
      const e2subs = '^                !        ';
      const e3 = hot('--------h----i----j-------'); // doesn't complete
      const e3subs = '^                 !       ';
      const expected = '--------x----y----(z|)    '; // e2 buffer empty and signaled complete
      const values = {
        x: ['a', 'd', 'h'],
        y: ['b', 'e', 'i'],
        z: ['c', 'f', 'j']
      };

      expectSource(of(e1, e2, e3).pipe(zipAll())).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    }
  );

  describe('with iterables', () => {
    it('should zip them with values', () => {
      const myIterator = {
        count: 0,
        next() {
          return {value: this.count++, done: false};
        },
        [Symbol.iterator]() {
          return this;
        }
      };

      const e1 = hot('---a---b---c---d---|');
      const e1subs = '^                  !';
      const expected = '---w---x---y---z---|';

      const values = {
        w: ['a', 0],
        x: ['b', 1],
        y: ['c', 2],
        z: ['d', 3]
      };

      expectSource(of(e1, myIterator).pipe(zipAll<string | number>())).toBe(
        expected,
        values
      );
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
    });

    it('should only call `next` as needed', () => {
      let nextCalled = 0;
      const myIterator = {
        count: 0,
        next() {
          nextCalled++;
          return {value: this.count++, done: false};
        },
        [Symbol.iterator]() {
          return this;
        }
      };

      of(of(1, 2, 3), myIterator).pipe(zipAll()).subscribe();

      // since zip will call `next()` in advance, total calls when
      // zipped with 3 other values should be 4.
      expect(nextCalled).to.equal(4);
    });

    it('should work with never observable and empty iterable', () => {
      const a = cold('-');
      const asubs = '^';
      const b: string[] = [];
      const expected = '-';

      expectSource(of(a, b).pipe(zipAll())).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with empty observable and empty iterable', () => {
      const a = cold('|');
      const asubs = '(^!)';
      const b: string[] = [];
      const expected = '|';

      expectSource(of(a, b).pipe(zipAll())).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with empty observable and non-empty iterable', () => {
      const a = cold('|');
      const asubs = '(^!)';
      const b = [1];
      const expected = '|';

      expectSource(of(a, b).pipe(zipAll<string | number>())).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and empty iterable', () => {
      const a = hot('---^----a--|');
      const asubs = '^       !';
      const b: string[] = [];
      const expected = '--------|';

      expectSource(of(a, b).pipe(zipAll())).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with never observable and non-empty iterable', () => {
      const a = cold('-');
      const asubs = '^';
      const b = [1];
      const expected = '-';

      expectSource(of(a, b).pipe(zipAll<string | number>())).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and non-empty iterable', () => {
      const a = hot('---^----1--|');
      const asubs = '^    !   ';
      const b = [2];
      const expected = '-----(x|)';

      expectSource(of(a, b).pipe(zipAll<string | number>())).toBe(expected, {
        x: ['1', 2]
      });
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and empty iterable', () => {
      const a = hot('---^----#');
      const asubs = '^    !';
      const b: string[] = [];
      const expected = '-----#';

      expectSource(of(a, b).pipe(zipAll())).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with observable which raises error and non-empty iterable', () => {
      const a = hot('---^----#');
      const asubs = '^    !';
      const b = [1];
      const expected = '-----#';

      expectSource(of(a, b).pipe(zipAll<string | number>())).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty many observable and non-empty many iterable', () => {
      const a = hot('---^--1--2--3--|');
      const asubs = '^        !   ';
      const b = [4, 5, 6];
      const expected = '---x--y--(z|)';

      expectSource(of(a, b).pipe(zipAll<string | number>())).toBe(expected, {
        x: ['1', 4],
        y: ['2', 5],
        z: ['3', 6]
      });
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });

    it('should work with non-empty observable and non-empty iterable selector that throws', () => {
      const a = hot('---^--1--2--3--|');
      const asubs = '^     !';
      const b = [4, 5, 6];
      const expected = '---x--#';

      const selector = function (x: string, y: number) {
        if (y === 5) {
          throw new Error('too bad');
        } else {
          return x + y;
        }
      };
      expectSource(of(a, b).pipe(zipAll(selector))).toBe(
        expected,
        {x: '14'},
        new Error('too bad')
      );
      expectSubscriptions(a.subscriptions).toBe(asubs);
    });
  });

  it('should combine two observables and selector', () => {
    const a = hot('---1---2---3---');
    const asubs = '^';
    const b = hot('--4--5--6--7--8--');
    const bsubs = '^';
    const expected = '---x---y---z';

    expectSource(of(a, b).pipe(zipAll((e1, e2) => e1 + e2))).toBe(expected, {
      x: '14',
      y: '25',
      z: '36'
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with n-ary symmetric', () => {
    const a = hot('---1-^-1----4----|');
    const asubs = '^         !  ';
    const b = hot('---1-^--2--5----| ');
    const bsubs = '^         !  ';
    const c = hot('---1-^---3---6-|  ');
    const expected = '----x---y-|  ';

    expectSource(of(a, b, c).pipe(zipAll())).toBe(expected, {
      x: ['1', '2', '3'],
      y: ['4', '5', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with n-ary symmetric selector', () => {
    const a = hot('---1-^-1----4----|');
    const asubs = '^         !  ';
    const b = hot('---1-^--2--5----| ');
    const bsubs = '^         !  ';
    const c = hot('---1-^---3---6-|  ');
    const expected = '----x---y-|  ';

    const observable = of(a, b, c).pipe(zipAll((r0, r1, r2) => [r0, r1, r2]));
    expectSource(observable).toBe(expected, {
      x: ['1', '2', '3'],
      y: ['4', '5', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with n-ary symmetric array selector', () => {
    const a = hot('---1-^-1----4----|');
    const asubs = '^         !  ';
    const b = hot('---1-^--2--5----| ');
    const bsubs = '^         !  ';
    const c = hot('---1-^---3---6-|  ');
    const expected = '----x---y-|  ';

    const observable = of(a, b, c).pipe(zipAll((r0, r1, r2) => [r0, r1, r2]));
    expectSource(observable).toBe(expected, {
      x: ['1', '2', '3'],
      y: ['4', '5', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with some data asymmetric 1', () => {
    const a = hot('---1-^-1-3-5-7-9-x-y-z-w-u-|');
    const asubs = '^                 !    ';
    const b = hot('---1-^--2--4--6--8--0--|    ');
    const bsubs = '^                 !    ';
    const expected = '---a--b--c--d--e--|    ';

    expectSource(of(a, b).pipe(zipAll((r1, r2) => r1 + r2))).toBe(expected, {
      a: '12',
      b: '34',
      c: '56',
      d: '78',
      e: '90'
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with some data asymmetric 2', () => {
    const a = hot('---1-^--2--4--6--8--0--|    ');
    const asubs = '^                 !    ';
    const b = hot('---1-^-1-3-5-7-9-x-y-z-w-u-|');
    const bsubs = '^                 !    ';
    const expected = '---a--b--c--d--e--|    ';

    expectSource(of(a, b).pipe(zipAll((r1, r2) => r1 + r2))).toBe(expected, {
      a: '21',
      b: '43',
      c: '65',
      d: '87',
      e: '09'
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with some data symmetric', () => {
    const a = hot('---1-^-1-3-5-7-9------| ');
    const asubs = '^                ! ';
    const b = hot('---1-^--2--4--6--8--0--|');
    const bsubs = '^                ! ';
    const expected = '---a--b--c--d--e-| ';

    expectSource(of(a, b).pipe(zipAll((r1, r2) => r1 + r2))).toBe(expected, {
      a: '12',
      b: '34',
      c: '56',
      d: '78',
      e: '90'
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with selector throws', () => {
    const a = hot('---1-^-2---4----|  ');
    const asubs = '^       !     ';
    const b = hot('---1-^--3----5----|');
    const bsubs = '^       !     ';
    const expected = '---x----#     ';

    const selector = function (x: string, y: string) {
      if (y === '5') {
        throw new Error('too bad');
      } else {
        return x + y;
      }
    };
    const observable = of(a, b).pipe(zipAll(selector));
    expectSource(observable).toBe(expected, {x: '23'}, new Error('too bad'));
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with right completes first', () => {
    const a = hot('---1-^-2-----|');
    const asubs = '^     !';
    const b = hot('---1-^--3--|');
    const bsubs = '^     !';
    const expected = '---x--|';

    expectSource(zip(a, b)).toBe(expected, {x: ['2', '3']});
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should zip until one child terminates', done => {
    const expected = ['a1', 'b2'];
    let i = 0;
    of(of('a', 'b', 'c'), of(1, 2))
      .pipe(zipAll((a: string, b: number) => a + b))
      .subscribe(
        x => {
          expect(x).to.equal(expected[i++]);
        },
        null,
        done
      );
  });

  it('should handle a hot observable of observables', () => {
    const x = cold('a---b---c---|      ');
    const xsubs = '        ^           !';
    const y = cold('d---e---f---|   ');
    const ysubs = '        ^           !';
    const e1 = hot('--x--y--|            ', {x: x, y: y});
    const e1subs = '^       !            ';
    const expected = '--------u---v---w---|';
    const values = {
      u: ['a', 'd'],
      v: ['b', 'e'],
      w: ['c', 'f']
    };

    expectSource(e1.pipe(zipAll())).toBe(expected, values);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should handle merging a hot observable of non-overlapped observables', () => {
    const x = cold('a-b---------|                         ');
    const xsubs = '                           ^           !';
    const y = cold('c-d-e-f-|                      ');
    const ysubs = '                           ^       !    ';
    const z = cold('g-h-i-j-k-|           ');
    const zsubs = '                           ^         !  ';
    const e1 = hot('--x------y--------z--------|            ', {
      x: x,
      y: y,
      z: z
    });
    const e1subs = '^                          !            ';
    const expected = '---------------------------u-v---------|';
    const values = {
      u: ['a', 'c', 'g'],
      v: ['b', 'd', 'h']
    };

    expectSource(e1.pipe(zipAll())).toBe(expected, values);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if inner observable raises error', () => {
    const x = cold('a-b---------|                     ');
    const xsubs = '                              ^       !';
    const y = cold('c-d-e-f-#               ');
    const ysubs = '                              ^       !';
    const z = cold('g-h-i-j-k-|    ');
    const zsubs = '                              ^       !';
    const e1 = hot('--x---------y--------z--------|        ', {
      x: x,
      y: y,
      z: z
    });
    const e1subs = '^                             !        ';
    const expected = '------------------------------u-v-----#';

    const expectedValues = {
      u: ['a', 'c', 'g'],
      v: ['b', 'd', 'h']
    };

    expectSource(e1.pipe(zipAll())).toBe(expected, expectedValues);
    expectSubscriptions(x.subscriptions).toBe(xsubs);
    expectSubscriptions(y.subscriptions).toBe(ysubs);
    expectSubscriptions(z.subscriptions).toBe(zsubs);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should raise error if outer observable raises error', () => {
    const y = cold('a-b---------|');
    const z = cold('c-d-e-f-|');
    const e1 = hot('--y---------z---#', {y: y, z: z});
    const e1subs = '^               !';
    const expected = '----------------#';

    expectSource(e1.pipe(zipAll())).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should work with two nevers', () => {
    const a = cold('-');
    const asubs = '^';
    const b = cold('-');
    const bsubs = '^';
    const expected = '-';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with never and empty', () => {
    const a = cold('-');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and never', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = cold('-');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and empty', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and non-empty', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = hot('---1--|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with non-empty and empty', () => {
    const a = hot('---1--|');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with never and non-empty', () => {
    const a = cold('-');
    const asubs = '^';
    const b = hot('---1--|');
    const bsubs = '^     !';
    const expected = '-';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with non-empty and never', () => {
    const a = hot('---1--|');
    const asubs = '^     !';
    const b = cold('-');
    const bsubs = '^';
    const expected = '-';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should combine a source with a second', () => {
    const a = hot('---1---2---3---');
    const asubs = '^';
    const b = hot('--4--5--6--7--8--');
    const bsubs = '^';
    const expected = '---x---y---z';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected, {
      x: ['1', '4'],
      y: ['2', '5'],
      z: ['3', '6']
    });
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with empty and error', () => {
    const a = cold('|');
    const asubs = '(^!)';
    const b = hot('------#', undefined, 'too bad');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and empty', () => {
    const a = hot('------#', undefined, 'too bad');
    const asubs = '(^!)';
    const b = cold('|');
    const bsubs = '(^!)';
    const expected = '|';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error', () => {
    const a = hot('----------|');
    const asubs = '^     !    ';
    const b = hot('------#    ');
    const bsubs = '^     !    ';
    const expected = '------#    ';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with never and error', () => {
    const a = cold('-');
    const asubs = '^     !';
    const b = hot('------#');
    const bsubs = '^     !';
    const expected = '------#';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and never', () => {
    const a = hot('------#');
    const asubs = '^     !';
    const b = cold('-');
    const bsubs = '^     !';
    const expected = '------#';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and error', () => {
    const a = hot('------#', undefined, 'too bad');
    const asubs = '^     !';
    const b = hot('----------#', undefined, 'too bad 2');
    const bsubs = '^     !';
    const expected = '------#';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected, null, 'too bad');
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with two sources that eventually raise errors', () => {
    const a = hot('--w-----#----', {w: 1}, 'too bad');
    const asubs = '^       !';
    const b = hot('-----z-----#-', {z: 2}, 'too bad 2');
    const bsubs = '^       !';
    const expected = '-----x--#';

    expectSource(of(a, b).pipe(zipAll())).toBe(
      expected,
      {x: [1, 2]},
      'too bad'
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with two sources that eventually raise errors (swapped)', () => {
    const a = hot('-----z-----#-', {z: 2}, 'too bad 2');
    const asubs = '^       !';
    const b = hot('--w-----#----', {w: 1}, 'too bad');
    const bsubs = '^       !';
    const expected = '-----x--#';

    expectSource(of(a, b).pipe(zipAll())).toBe(
      expected,
      {x: [2, 1]},
      'too bad'
    );
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should work with error and some', () => {
    const a = cold('#');
    const asubs = '(^!)';
    const b = hot('--1--2--3--');
    const bsubs = '(^!)';
    const expected = '#';

    expectSource(of(a, b).pipe(zipAll())).toBe(expected);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should combine two immediately-scheduled observables', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [
      [1, 4],
      [2, 5],
      [3, 6]
    ];
    let i = 0;

    const result = of(a, b, queueScheduler).pipe(zipAll());

    result.subscribe(
      vals => {
        expect(vals).to.deep.equal(r[i++]);
      },
      null,
      done
    );
  });

  it('should combine a source with an immediately-scheduled source', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8);
    const r = [
      [1, 4],
      [2, 5],
      [3, 6]
    ];
    let i = 0;

    const result = of(a, b, queueScheduler).pipe(zipAll());

    result.subscribe(
      vals => {
        expect(vals).to.deep.equal(r[i++]);
      },
      null,
      done
    );
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    const a = hot('---1---2---3---|');
    const unsub = '         !';
    const asubs = '^        !';
    const b = hot('--4--5--6--7--8--|');
    const bsubs = '^        !';
    const expected = '---x---y--';
    const values = {x: ['1', '4'], y: ['2', '5']};

    const r = of(a, b).pipe(
      mergeMap(x => of(x)),
      zipAll(),
      mergeMap(x => of(x))
    );

    expectSource(r, unsub).toBe(expected, values);
    expectSubscriptions(a.subscriptions).toBe(asubs);
    expectSubscriptions(b.subscriptions).toBe(bsubs);
  });

  it('should complete when empty source', () => {
    const source = hot('|');
    const expected = '|';

    expectSource(source.pipe(zipAll())).toBe(expected);
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number[]> = of(source1, source2, source3).pipe(
      zipAll()
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number> = of(source1, source2, source3).pipe(
      zipAll((...args) => args.reduce((acc, x) => acc + x, 0))
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number[]> = of(source1, source2, source3).pipe(
      zipAll()
    );
    /* tslint:enable:no-unused-variable */
  });

  type(() => {
    /* tslint:disable:no-unused-variable */
    const source1 = of(1, 2, 3);
    const source2 = [1, 2, 3];
    const source3 = new Promise<number>(d => d(1));

    let result: Observable<number> = of(source1, source2, source3).pipe(
      zipAll((...args) => args.reduce((acc, x) => acc + x, 0))
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
    ).pipe(zipAll<string>());
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
      zipAll<string>((...args) => args.reduce((acc, x) => acc + x, 0))
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
    ).pipe(zipAll<string>());
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
      zipAll<string>((...args) => args.reduce((acc, x) => acc + x, 0))
    );
    /* tslint:enable:no-unused-variable */
  });
});

describe('zipWith', () => {
  let rxTestScheduler: TestScheduler;
  beforeEach(() => {
    rxTestScheduler = new TestScheduler(sourceMatcher);
  });
  it('should infer correctly with 1 param', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const res = a.pipe(zipWith(b)); // $ExpectType Observable<[number, string]>
  });
  it('should infer correctly with 2 params', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const c = of('d', 'e', 'f');
    const res = a.pipe(zipWith(b, c)); // $ExpectType Observable<[number, string, string]>
  });
  it('should infer correctly with 3 params', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const c = of('d', 'e', 'f');
    const d = of('g', 'h', 'i');
    const res = a.pipe(zipWith(b, c, d)); // $ExpectType Observable<[number, string, string, string]>
  });
  it('should infer correctly with 4 params', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const c = of('d', 'e', 'f');
    const d = of('g', 'h', 'i');
    const e = of('j', 'k', 'l');
    const res = a.pipe(zipWith(b, c, d, e)); // $ExpectType Observable<[number, string, string, string, string]>
  });
  it('should infer correctly with 5 params', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const c = of('d', 'e', 'f');
    const d = of('g', 'h', 'i');
    const e = of('j', 'k', 'l');
    const f = of('m', 'n', 'o');
    const res = a.pipe(zipWith(b, c, d, e, f)); // $ExpectType Observable<[number, string, string, string, string, string]>
  });
  it('should accept N params', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const c = of('d', 'e', 'f');
    const d = of('g', 'h', 'i');
    const e = of('j', 'k', 'l');
    const f = of('m', 'n', 'o');
    const g = of('p', 'q', 'r');
    const res = a.pipe(zipWith(b, c, d, e, f, g)); // $ExpectType Observable<[number, string, string, string, string, string, string]>
  });
  it('should combine a source with a second', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('   ---1---2---3---');
      const asubs = '   ^';
      const b = hot('   --4--5--6--7--8--');
      const bsubs = '   ^';
      const expected = '---x---y---z';
      expectSource(a.pipe(zipWith(b))).toBe(expected, {
        x: ['1', '4'],
        y: ['2', '5'],
        z: ['3', '6']
      });
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });
  it('should end once one observable completes and its buffer is empty', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const e1 = hot('  ---a--b--c--|               ');
      const e1subs = '  ^-----------!               ';
      const e2 = hot('  ------d----e----f--------|  ');
      const e2subs = '  ^-----------------!         ';
      const e3 = hot('  --------h----i----j---------'); // doesn't complete
      const e3subs = '  ^-----------------!         ';
      const expected = '--------x----y----(z|)      '; // e1 complete and buffer empty
      const values = {
        x: ['a', 'd', 'h'],
        y: ['b', 'e', 'i'],
        z: ['c', 'f', 'j']
      };
      expectSource(e1.pipe(zipWith(e2, e3))).toBe(expected, values);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
      expectSubscriptions(e3.subscriptions).toBe(e3subs);
    });
  });

  it(
    'should end once one observable nexts and zips value from completed other ' +
      'observable whose buffer is empty',
    () => {
      rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const e1 = hot('  ---a--b--c--|             ');
        const e1subs = '  ^-----------!             ';
        const e2 = hot('  ------d----e----f|        ');
        const e2subs = '  ^----------------!        ';
        const e3 = hot('  --------h----i----j-------'); // doesn't complete
        const e3subs = '  ^-----------------!       ';
        const expected = '--------x----y----(z|)    '; // e2 buffer empty and signaled complete
        const values = {
          x: ['a', 'd', 'h'],
          y: ['b', 'e', 'i'],
          z: ['c', 'f', 'j']
        };

        expectSource(e1.pipe(zipWith(e2, e3))).toBe(expected, values);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
        expectSubscriptions(e2.subscriptions).toBe(e2subs);
        expectSubscriptions(e3.subscriptions).toBe(e3subs);
      });
    }
  );

  describe('with iterables', () => {
    it('should zip them with values', () => {
      rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const myIterator = <any>{
          count: 0,
          next: function () {
            return {value: this.count++, done: false};
          }
        };
        myIterator[Symbol.iterator] = function () {
          return this;
        };

        const e1 = hot('  ---a---b---c---d---|');
        const e1subs = '  ^------------------!';
        const expected = '---w---x---y---z---|';

        const values = {
          w: ['a', 0],
          x: ['b', 1],
          y: ['c', 2],
          z: ['d', 3]
        };

        expectSource(e1.pipe(zipWith(myIterator))).toBe(expected, values);
        expectSubscriptions(e1.subscriptions).toBe(e1subs);
      });
    });

    it('should only call `next` as needed', () => {
      let nextCalled = 0;
      const myIterator = <any>{
        count: 0,
        next: function () {
          nextCalled++;
          return {value: this.count++, done: false};
        }
      };
      myIterator[Symbol.iterator] = function () {
        return this;
      };

      of(1, 2, 3).pipe(zipWith(myIterator)).subscribe();

      // since zip will call `next()` in advance, total calls when
      // zipped with 3 other values should be 4.
      expect(nextCalled).to.equal(4);
    });

    it('should work with never observable and empty iterable', () => {
      rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
        const a = cold('  -');
        const asubs = '   ^';
        const expected = '-';
        const b: string[] = [];

        expectSource(a.pipe(zipWith(b))).toBe(expected);
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });

    it('should work with empty observable and empty iterable', () => {
      rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
        const a = cold('  |');
        const asubs = '   (^!)';
        const expected = '|';
        const b: string[] = [];

        expectSource(a.pipe(zipWith(b))).toBe(expected);
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });

    it('should work with empty observable and non-empty iterable', () => {
      rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
        const a = cold('  |');
        const asubs = '   (^!)';
        const expected = '|';
        const b = [1];

        expectSource(a.pipe(zipWith(b))).toBe(expected);
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });

    it('should work with non-empty observable and empty iterable', () => {
      rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const a = hot('   ---^----a--|');
        const asubs = '   ^-------!';
        const b: string[] = [];
        const expected = '--------|';

        expectSource(a.pipe(zipWith(b))).toBe(expected);
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });

    it('should work with never observable and non-empty iterable', () => {
      rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
        const a = cold('  -');
        const asubs = '   ^';
        const expected = '-';
        const b = [1];

        expectSource(a.pipe(zipWith(b))).toBe(expected);
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });

    it('should work with non-empty observable and non-empty iterable', () => {
      rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const a = hot('---^----1--|');
        const asubs = '   ^----!   ';
        const expected = '-----(x|)';
        const b = [2];

        expectSource(a.pipe(zipWith(b))).toBe(expected, {x: ['1', 2]});
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });

    it('should work with non-empty observable and empty iterable', () => {
      rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const a = hot('---^----#');
        const asubs = '   ^----!';
        const expected = '-----#';
        const b: string[] = [];

        expectSource(a.pipe(zipWith(b))).toBe(expected);
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });

    it('should work with observable which raises error and non-empty iterable', () => {
      rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const a = hot('---^----#');
        const asubs = '   ^----!';
        const expected = '-----#';
        const b = [1];

        expectSource(a.pipe(zipWith(b))).toBe(expected);
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });

    it('should work with non-empty many observable and non-empty many iterable', () => {
      rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const a = hot('---^--1--2--3--|');
        const asubs = '   ^--------!   ';
        const expected = '---x--y--(z|)';
        const b = [4, 5, 6];

        expectSource(a.pipe(zipWith(b))).toBe(expected, {
          x: ['1', 4],
          y: ['2', 5],
          z: ['3', 6]
        });
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });

    it('should work with non-empty observable and non-empty iterable selector that throws', () => {
      rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
        const a = hot('---^--1--2--3--|');
        const asubs = '   ^-----!';
        const expected = '---x--#';
        const b = [4, 5, 6];

        const selector = function (x: string, y: number) {
          if (y === 5) {
            throw new Error('too bad');
          } else {
            return x + y;
          }
        };
        expectSource(a.pipe(zipWith(b, selector))).toBe(
          expected,
          {x: '14'},
          new Error('too bad')
        );
        expectSubscriptions(a.subscriptions).toBe(asubs);
      });
    });
  });

  it('should work with n-ary symmetric', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('---1-^-1----4----|');
      const asubs = '     ^---------!  ';
      const b = hot('---1-^--2--5----| ');
      const bsubs = '     ^---------!  ';
      const c = hot('---1-^---3---6-|  ');
      const expected = '  ----x---y-|  ';

      expectSource(a.pipe(zipWith(b, c))).toBe(expected, {
        x: ['1', '2', '3'],
        y: ['4', '5', '6']
      });
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with right completes first', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('---1-^-2-----|');
      const asubs = '     ^-----!';
      const b = hot('---1-^--3--|');
      const bsubs = '     ^-----!';
      const expected = '  ---x--|';

      expectSource(a.pipe(zipWith(b))).toBe(expected, {x: ['2', '3']});
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with two nevers', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const a = cold('  -');
      const asubs = '   ^';
      const b = cold('  -');
      const bsubs = '   ^';
      const expected = '-';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with never and empty', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const a = cold('  -');
      const asubs = '   (^!)';
      const b = cold('  |');
      const bsubs = '   (^!)';
      const expected = '|';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with empty and never', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const a = cold('  |');
      const asubs = '   (^!)';
      const b = cold('  -');
      const bsubs = '   (^!)';
      const expected = '|';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with empty and empty', () => {
    rxTestScheduler.run(({cold, expectSource, expectSubscriptions}) => {
      const a = cold('  |');
      const asubs = '   (^!)';
      const b = cold('  |');
      const bsubs = '   (^!)';
      const expected = '|';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with empty and non-empty', () => {
    rxTestScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
      const a = cold('  |');
      const asubs = '   (^!)';
      const b = hot('   ---1--|');
      const bsubs = '   (^!)';
      const expected = '|';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with non-empty and empty', () => {
    rxTestScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
      const a = hot('   ---1--|');
      const asubs = '   (^!)';
      const b = cold('  |');
      const bsubs = '   (^!)';
      const expected = '|';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with never and non-empty', () => {
    rxTestScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
      const a = cold('  -');
      const asubs = '   ^';
      const b = hot('   ---1--|');
      const bsubs = '   ^-----!';
      const expected = '-';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with non-empty and never', () => {
    rxTestScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
      const a = hot('   ---1--|');
      const asubs = '   ^-----!';
      const b = cold('  -');
      const bsubs = '   ^';
      const expected = '-';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with empty and error', () => {
    rxTestScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
      const a = cold('  |');
      const asubs = '   (^!)';
      const b = hot('   ------#', undefined, 'too bad');
      const bsubs = '   (^!)';
      const expected = '|';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with error and empty', () => {
    rxTestScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
      const a = hot('   ------#', undefined, 'too bad');
      const asubs = '   (^!)';
      const b = cold('  |');
      const bsubs = '   (^!)';
      const expected = '|';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with error', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('   ----------|');
      const asubs = '   ^-----!    ';
      const b = hot('   ------#    ');
      const bsubs = '   ^-----!    ';
      const expected = '------#    ';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with never and error', () => {
    rxTestScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
      const a = cold('  -------');
      const asubs = '   ^-----!';
      const b = hot('   ------#');
      const bsubs = '   ^-----!';
      const expected = '------#';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with error and never', () => {
    rxTestScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
      const a = hot('   ------#');
      const asubs = '   ^-----!';
      const b = cold('  -------');
      const bsubs = '   ^-----!';
      const expected = '------#';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with error and error', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('   ------#', undefined, 'too bad');
      const asubs = '   ^-----!';
      const b = hot('   ----------#', undefined, 'too bad 2');
      const bsubs = '   ^-----!';
      const expected = '------#';

      expectSource(a.pipe(zipWith(b))).toBe(expected, null, 'too bad');
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with two sources that eventually raise errors', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('   --w-----#----', {w: 1}, 'too bad');
      const asubs = '   ^-------!';
      const b = hot('   -----z-----#-', {z: 2}, 'too bad 2');
      const bsubs = '   ^-------!';
      const expected = '-----x--#';

      expectSource(a.pipe(zipWith(b))).toBe(expected, {x: [1, 2]}, 'too bad');
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with two sources that eventually raise errors (swapped)', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('   -----z-----#-', {z: 2}, 'too bad 2');
      const asubs = '   ^-------!';
      const b = hot('   --w-----#----', {w: 1}, 'too bad');
      const bsubs = '   ^-------!';
      const expected = '-----x--#';

      expectSource(a.pipe(zipWith(b))).toBe(expected, {x: [2, 1]}, 'too bad');
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with error and some', () => {
    rxTestScheduler.run(({cold, hot, expectSource, expectSubscriptions}) => {
      const a = cold('  #');
      const asubs = '   (^!)';
      const b = hot('   --1--2--3--');
      const bsubs = '   (^!)';
      const expected = '#';

      expectSource(a.pipe(zipWith(b))).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should combine an immediately-scheduled source with an immediately-scheduled second', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [
      [1, 4],
      [2, 5],
      [3, 6]
    ];
    let i = 0;

    a.pipe(zipWith(b)).subscribe(
      function (vals) {
        expect(vals).to.deep.equal(r[i++]);
      },
      null,
      done
    );
  });

  it('should not break unsubscription chain when unsubscribed explicitly', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('   ---1---2---3---|');
      const unsub = '   ---------!';
      const asubs = '   ^--------!';
      const b = hot('   --4--5--6--7--8--|');
      const bsubs = '   ^--------!';
      const expected = '---x---y--';

      const r = a.pipe(
        mergeMap(x => of(x)),
        zipWith(b),
        mergeMap(x => of(x))
      );

      expectSource(r, unsub).toBe(expected, {x: ['1', '4'], y: ['2', '5']});
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });
});

describe('zip legacy', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(sourceMatcher);
  });

  it('should zip the provided observables', done => {
    const expected = ['a1', 'b2', 'c3'];
    let i = 0;

    from(['a', 'b', 'c'])
      .pipe(zip(from([1, 2, 3]), (a, b): string => a + b))
      .subscribe(
        function (x) {
          expect(x).to.equal(expected[i++]);
        },
        null,
        done
      );
  });

  it('should work with selector throws', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('---1-^-2---4----|  ');
      const asubs = '     ^-------!     ';
      const b = hot('---1-^--3----5----|');
      const bsubs = '     ^-------!     ';
      const expected = '  ---x----#     ';

      const selector = function (x: string, y: string) {
        if (y === '5') {
          throw new Error('too bad');
        } else {
          return x + y;
        }
      };
      const observable = a.pipe(zip(b, selector));
      expectSource(observable).toBe(expected, {x: '23'}, new Error('too bad'));
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with some data asymmetric 1', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('---1-^-1-3-5-7-9-x-y-z-w-u-|');
      const asubs = '     ^-----------------!    ';
      const b = hot('---1-^--2--4--6--8--0--|    ');
      const bsubs = '     ^-----------------!    ';
      const expected = '  ---a--b--c--d--e--|    ';

      expectSource(
        a.pipe(
          zip(b, function (r1, r2) {
            return r1 + r2;
          })
        )
      ).toBe(expected, {a: '12', b: '34', c: '56', d: '78', e: '90'});
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with some data asymmetric 2', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('---1-^--2--4--6--8--0--|    ');
      const asubs = '     ^-----------------!    ';
      const b = hot('---1-^-1-3-5-7-9-x-y-z-w-u-|');
      const bsubs = '     ^-----------------!    ';
      const expected = '  ---a--b--c--d--e--|    ';

      expectSource(
        a.pipe(
          zip(b, function (r1, r2) {
            return r1 + r2;
          })
        )
      ).toBe(expected, {a: '21', b: '43', c: '65', d: '87', e: '09'});
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with some data symmetric', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('---1-^-1-3-5-7-9------| ');
      const asubs = '     ^----------------! ';
      const b = hot('---1-^--2--4--6--8--0--|');
      const bsubs = '     ^----------------! ';
      const expected = '  ---a--b--c--d--e-| ';

      expectSource(
        a.pipe(
          zip(b, function (r1, r2) {
            return r1 + r2;
          })
        )
      ).toBe(expected, {a: '12', b: '34', c: '56', d: '78', e: '90'});
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with n-ary symmetric selector', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('---1-^-1----4----|');
      const asubs = '     ^---------!  ';
      const b = hot('---1-^--2--5----| ');
      const bsubs = '     ^---------!  ';
      const c = hot('---1-^---3---6-|  ');
      const expected = '  ----x---y-|  ';

      const observable = a.pipe(
        zip(b, c, function (r0, r1, r2) {
          return [r0, r1, r2];
        })
      );
      expectSource(observable).toBe(expected, {
        x: ['1', '2', '3'],
        y: ['4', '5', '6']
      });
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should work with n-ary symmetric array selector', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('---1-^-1----4----|');
      const asubs = '     ^---------!  ';
      const b = hot('---1-^--2--5----| ');
      const bsubs = '     ^---------!  ';
      const c = hot('---1-^---3---6-|  ');
      const expected = '  ----x---y-|  ';

      const observable = a.pipe(
        zip(b, c, function (r0, r1, r2) {
          return [r0, r1, r2];
        })
      );
      expectSource(observable).toBe(expected, {
        x: ['1', '2', '3'],
        y: ['4', '5', '6']
      });
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });

  it('should combine two observables and selector', () => {
    rxTestScheduler.run(({hot, expectSource, expectSubscriptions}) => {
      const a = hot('   ---1---2---3---');
      const asubs = '   ^';
      const b = hot('   --4--5--6--7--8--');
      const bsubs = '   ^';
      const expected = '---x---y---z';

      expectSource(
        a.pipe(
          zip(b, function (e1, e2) {
            return e1 + e2;
          })
        )
      ).toBe(expected, {x: '14', y: '25', z: '36'});
      expectSubscriptions(a.subscriptions).toBe(asubs);
      expectSubscriptions(b.subscriptions).toBe(bsubs);
    });
  });
});
