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
  describe('without project parameter', () => {
    it('should infer correctly with 1 param', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const res = a.pipe(combineLatest(b)); // $ExpectType Observable<[number, string]>
    });

    it('should infer correctly with 2 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const res = a.pipe(combineLatest(b, c)); // $ExpectType Observable<[number, string, string]>
    });

    it('should infer correctly with 3 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const res = a.pipe(combineLatest(b, c, d)); // $ExpectType Observable<[number, string, string, string]>
    });

    it('should infer correctly with 4 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const res = a.pipe(combineLatest(b, c, d, e)); // $ExpectType Observable<[number, string, string, string, string]>
    });

    it('should infer correctly with 5 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const f = of('m', 'n', 'o');
      const res = a.pipe(combineLatest(b, c, d, e, f)); // $ExpectType Observable<[number, string, string, string, string, string]>
    });

    it('should only accept maximum params of 5', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const f = of('m', 'n', 'o');
      const g = of('p', 'q', 'r');
      const res = a.pipe(combineLatest(b, c, d, e, f, g)); // $ExpectError
    });
  });

  describe('with project parameter', () => {
    it('should infer correctly with project param', () => {
      const a = of(1, 2, 3);
      const res = a.pipe(combineLatest(v1 => 'b')); // $ExpectType Observable<string>
    });

    it('should infer correctly with 1 param', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const res = a.pipe(combineLatest(b, (a, b) => b)); // $ExpectType Observable<string>
    });

    it('should infer correctly with 2 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const res = a.pipe(combineLatest(b, c, (a, b, c) => b + c)); // $ExpectType Observable<string>
    });

    it('should infer correctly with 3 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const ref = a.pipe(combineLatest(b, c, d, (a, b, c, d) => b + c)); // $ExpectType Observable<string>
    });

    it('should infer correctly with 4 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const res = a.pipe(combineLatest(b, c, d, e, (a, b, c, d, e) => b + c)); // $ExpectType Observable<string>
    });

    it('should infer correctly with 5 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const f = of('m', 'n', 'o');
      const res = a.pipe(
        combineLatest(b, c, d, e, f, (a, b, c, d, e, f) => b + c)
      ); // $ExpectType Observable<string>
    });

    // TODO: Fix this when the both combineLatest operator and combineLatest creator function has been fix
    // see: https://github.com/ReactiveX/rxjs/pull/4371#issuecomment-441124096
    // it('should infer correctly with array param', () => {
    //   const a = of(1, 2, 3);
    //   const b = [of('a', 'b', 'c')];
    //   const res = a.pipe(combineLatest(b, (a, b) => b)); // $ExpectType Observable<Observable<string>>
    // });
  });

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

describe('combineLatestWith', () => {
  let testScheduler: TestScheduler;

  beforeEach(() => {
    testScheduler = new TestScheduler(sourceMatcher);
  });

  describe('without project parameter', () => {
    it('should infer correctly with 1 param', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const res = a.pipe(combineLatestWith(b)); // $ExpectType Observable<[number, string]>
    });

    it('should infer correctly with 2 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const res = a.pipe(combineLatestWith(b, c)); // $ExpectType Observable<[number, string, string]>
    });

    it('should infer correctly with 3 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const res = a.pipe(combineLatestWith(b, c, d)); // $ExpectType Observable<[number, string, string, string]>
    });

    it('should infer correctly with 4 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const res = a.pipe(combineLatestWith(b, c, d, e)); // $ExpectType Observable<[number, string, string, string, string]>
    });

    it('should infer correctly with 5 params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const f = of('m', 'n', 'o');
      const res = a.pipe(combineLatestWith(b, c, d, e, f)); // $ExpectType Observable<[number, string, string, string, string, string]>
    });

    it('should accept N params', () => {
      const a = of(1, 2, 3);
      const b = of('a', 'b', 'c');
      const c = of('d', 'e', 'f');
      const d = of('g', 'h', 'i');
      const e = of('j', 'k', 'l');
      const f = of('m', 'n', 'o');
      const g = of('p', 'q', 'r');
      const res = a.pipe(combineLatestWith(b, c, d, e, f, g)); // $ExpectType Observable<[number, string, string, string, string, string, string]>
    });
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

describe('merge', () => {
  it('should accept no parameter', () => {
    const res = a$.pipe(merge()); // $ExpectType Observable<A>
  });

  it('should infer correctly with scheduler param', () => {
    const res = a$.pipe(merge(asyncScheduler)); // $ExpectType Observable<A>
  });

  it('should infer correctly with concurrent param', () => {
    const res = a$.pipe(merge(3)); // $ExpectType Observable<A>
  });

  it('should infer correctly with concurrent and scheduler param', () => {
    const res = a$.pipe(merge(3, asyncScheduler)); // $ExpectType Observable<A>
  });

  it('should infer correctly with 1 Observable param', () => {
    const res = a$.pipe(merge(b$)); // $ExpectType Observable<A | B>
  });

  it('should infer correctly with 2 Observable param', () => {
    const res = a$.pipe(merge(b$, c$)); // $ExpectType Observable<A | B | C>
  });

  it('should infer correctly with 3 Observable param', () => {
    const res = a$.pipe(merge(b$, c$, d$)); // $ExpectType Observable<A | B | C | D>
  });

  it('should infer correctly with 4 Observable param', () => {
    const res = a$.pipe(merge(b$, c$, d$, e$)); // $ExpectType Observable<A | B | C | D | E>
  });

  it('should infer correctly with 5 Observable param', () => {
    const res = a$.pipe(merge(b$, c$, d$, e$, f$)); // $ExpectType Observable<A | B | C | D | E | F>
  });

  it('should infer correctly with 1 Observable and concurrent param', () => {
    const res = a$.pipe(merge(b$, 1)); // $ExpectType Observable<A | B>
  });

  it('should infer correctly with 2 Observable and concurrent param', () => {
    const res = a$.pipe(merge(b$, c$, 1)); // $ExpectType Observable<A | B | C>
  });

  it('should infer correctly with 3 Observable and concurrent param', () => {
    const res = a$.pipe(merge(b$, c$, d$, 1)); // $ExpectType Observable<A | B | C | D>
  });

  it('should infer correctly with 4 Observable and concurrent param', () => {
    const res = a$.pipe(merge(b$, c$, d$, e$, 1)); // $ExpectType Observable<A | B | C | D | E>
  });

  it('should infer correctly with 5 Observable and concurrent param', () => {
    const res = a$.pipe(merge(b$, c$, d$, e$, f$, 1)); // $ExpectType Observable<A | B | C | D | E | F>
  });

  it('should infer correctly with 1 Observable, concurrent, and scheduler param', () => {
    const res = a$.pipe(merge(b$, 1, asyncScheduler)); // $ExpectType Observable<A | B>
  });

  it('should infer correctly with 2 Observable, concurrent, and scheduler param', () => {
    const res = a$.pipe(merge(b$, c$, 1, asyncScheduler)); // $ExpectType Observable<A | B | C>
  });

  it('should infer correctly with 3 Observable, concurrent, and scheduler param', () => {
    const res = a$.pipe(merge(b$, c$, d$, 1, asyncScheduler)); // $ExpectType Observable<A | B | C | D>
  });

  it('should infer correctly with 4 Observable, concurrent, and scheduler param', () => {
    const res = a$.pipe(merge(b$, c$, d$, e$, 1, asyncScheduler)); // $ExpectType Observable<A | B | C | D | E>
  });

  it('should infer correctly with 5 Observable, concurrent, and scheduler param', () => {
    const res = a$.pipe(merge(b$, c$, d$, e$, f$, 1, asyncScheduler)); // $ExpectType Observable<A | B | C | D | E | F>
  });

  it('should merge cold and cold', () => {
    const e1 = cold('---a-----b-----c----|');
    const e1subs = '^                   !';
    const e2 = cold('------x-----y-----z----|');
    const e2subs = '^                      !';
    const expected = '---a--x--b--y--c--z----|';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should return itself when try to merge single observable', () => {
    const e1 = of('a');
    const result = merge(e1);

    expect(e1).to.equal(result);
  });

  it('should merge hot and hot', () => {
    const e1 = hot('---a---^-b-----c----|');
    const e1subs = '^            !';
    const e2 = hot('-----x-^----y-----z----|');
    const e2subs = '^               !';
    const expected = '--b--y--c--z----|';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge hot and cold', () => {
    const e1 = hot('---a-^---b-----c----|');
    const e1subs = '^              !';
    const e2 = cold('--x-----y-----z----|');
    const e2subs = '^                  !';
    const expected = '--x-b---y-c---z----|';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge parallel emissions', () => {
    const e1 = hot('---a----b----c----|');
    const e1subs = '^                 !';
    const e2 = hot('---x----y----z----|');
    const e2subs = '^                 !';
    const expected = '---(ax)-(by)-(cz)-|';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge empty and empty', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('|');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('|');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge three empties', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('|');
    const e2subs = '(^!)';
    const e3 = cold('|');
    const e3subs = '(^!)';

    const result = merge(e1, e2, e3);

    expectSource(result).toBe('|');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });

  it('should merge never and empty', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('|');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('-');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge never and never', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('-');
    const e2subs = '^';

    const result = merge(e1, e2);

    expectSource(result).toBe('-');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge empty and throw', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = cold('#');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('#');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge hot and throw', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '(^!)';
    const e2 = cold('#');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('#');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge never and throw', () => {
    const e1 = cold('-');
    const e1subs = '(^!)';
    const e2 = cold('#');
    const e2subs = '(^!)';

    const result = merge(e1, e2);

    expectSource(result).toBe('#');
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge empty and eventual error', () => {
    const e1 = cold('|');
    const e1subs = '(^!)';
    const e2 = hot('-------#');
    const e2subs = '^------!';
    const expected = '-------#';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge hot and error', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^      !    ';
    const e2 = hot('-------#    ');
    const e2subs = '^      !    ';
    const expected = '--a--b-#    ';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge never and error', () => {
    const e1 = hot('-');
    const e1subs = '^      !';
    const e2 = hot('-------#');
    const e2subs = '^      !';
    const expected = '-------#';

    const result = merge(e1, e2);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should merge single lowerCaseO into RxJS Observable', () => {
    const e1 = lowerCaseO('a', 'b', 'c');

    const result = merge(e1);

    expect(result).to.be.instanceof(Observable);
    expectSource(result).toBe('(abc|)');
  });

  it('should merge two lowerCaseO into RxJS Observable', () => {
    const e1 = lowerCaseO('a', 'b', 'c');
    const e2 = lowerCaseO('d', 'e', 'f');

    const result = merge(e1, e2);

    expect(result).to.be.instanceof(Observable);
    expectSource(result).toBe('(abcdef|)');
  });

  it('should merge single lowerCaseO into RxJS Observable', () => {
    const e1 = lowerCaseO('a', 'b', 'c');

    const result = merge(e1, rxTestScheduler);

    expect(result).to.be.instanceof(Observable);
    expectSource(result).toBe('(abc|)');
  });

  it('should handle concurrency limits', () => {
    const e1 = cold('---a---b---c---|');
    const e2 = cold('-d---e---f--|');
    const e3 = cold('---x---y---z---|');
    const expected = '-d-a-e-b-f-c---x---y---z---|';
    expectSource(merge(e1, e2, e3, 2)).toBe(expected);
  });

  it('should handle scheduler', () => {
    const e1 = of('a');
    const e2 = of('b').pipe(delay(20, rxTestScheduler));
    const expected = 'a-(b|)';

    expectSource(merge(e1, e2, rxTestScheduler)).toBe(expected);
  });

  it('should handle scheduler with concurrency limits', () => {
    const e1 = cold('---a---b---c---|');
    const e2 = cold('-d---e---f--|');
    const e3 = cold('---x---y---z---|');
    const expected = '-d-a-e-b-f-c---x---y---z---|';
    expectSource(merge(e1, e2, e3, 2, rxTestScheduler)).toBe(expected);
  });

  it('should use the scheduler even when one Observable is merged', done => {
    let e1Subscribed = false;
    const e1 = defer(() => {
      e1Subscribed = true;
      return of('a');
    });

    merge(e1, asyncScheduler).subscribe({
      error: done,
      complete: () => {
        expect(e1Subscribed).to.be.true;
        done();
      }
    });

    expect(e1Subscribed).to.be.false;
  });
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

describe('mergeWith', () => {
  let rxTestScheduler: TestScheduler;

  beforeEach(() => {
    rxTestScheduler = new TestScheduler(sourceMatcher);
  });

  it('should accept N args', () => {
    const r0 = a$.pipe(mergeWith()); // $ExpectType Observable<A>
    const r1 = a$.pipe(mergeWith(b$)); // $ExpectType Observable<A | B>
    const r2 = a$.pipe(mergeWith(b$, c$)); // $ExpectType Observable<A | B | C>
    const r3 = a$.pipe(mergeWith(b$, c$, d$)); // $ExpectType Observable<A | B | C | D>
    const r4 = a$.pipe(mergeWith(b$, c$, d$, e$)); // $ExpectType Observable<A | B | C | D | E>
    const r5 = a$.pipe(mergeWith(b$, c$, d$, e$, f$)); // $ExpectType Observable<A | B | C | D | E | F>
    const r6 = a$.pipe(mergeWith(b$, c$, d$, e$, f$, g$)); // $ExpectType Observable<A | B | C | D | E | F | G>
    const r7 = a$.pipe(mergeWith(b$, c$, d$, e$, f$, g$, h$)); // $ExpectType Observable<A | B | C | D | E | F | G | H>
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

describe('mergeAll', () => {
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

  it('should infer correctly', () => {
    const o = of(of(1, 2, 3)).pipe(mergeAll()); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(mergeAll()); // $ExpectError
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
