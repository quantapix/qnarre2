import {
  hot,
  cold,
  emptySubs,
  expectSource,
  expectSubscriptions
} from './testing';

declare function asDiagram(arg: string): Function;

declare const rxTestScheduler: TestScheduler;

const queueScheduler = rxQueue;

describe('concat static', () => {
  it('should emit elements from multiple sources', () => {
    const e1 = cold('-a-b-c-|');
    const e1subs = '^      !';
    const e2 = cold('-0-1-|');
    const e2subs = '       ^    !';
    const e3 = cold('-w-x-y-z-|');
    const e3subs = '            ^        !';
    const expected = '-a-b-c--0-1--w-x-y-z-|';
    expectSource(concat(e1, e2, e3)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
    expectSubscriptions(e3.subscriptions).toBe(e3subs);
  });
  it('should concat the same cold observable multiple times', () => {
    const inner = cold('--i-j-k-l-|                              ');
    const innersubs = [
      '^         !                              ',
      '          ^         !                    ',
      '                    ^         !          ',
      '                              ^         !'
    ];
    const expected = '--i-j-k-l---i-j-k-l---i-j-k-l---i-j-k-l-|';

    const result = concat(inner, inner, inner, inner);

    expectSource(result).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });
  it(
    'should concat the same cold observable multiple times, ' +
      'but the result is unsubscribed early',
    () => {
      const inner = cold('--i-j-k-l-|     ');
      const unsub = '               !';
      const innersubs = ['^         !     ', '          ^    !'];
      const expected = '--i-j-k-l---i-j-';

      const result = concat(inner, inner, inner, inner);

      expectSource(result, unsub).toBe(expected);
      expectSubscriptions(inner.subscriptions).toBe(innersubs);
    }
  );

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const inner = cold('--i-j-k-l-|     ');
    const innersubs = ['^         !     ', '          ^    !'];
    const expected = '--i-j-k-l---i-j-';
    const unsub = '               !';

    const innerWrapped = inner.pipe(mergeMap(x => of(x)));
    const result = concat(
      innerWrapped,
      innerWrapped,
      innerWrapped,
      innerWrapped
    ).pipe(mergeMap(x => of(x)));

    expectSource(result, unsub).toBe(expected);
    expectSubscriptions(inner.subscriptions).toBe(innersubs);
  });

  it('should complete without emit if both sources are empty', () => {
    const e1 = cold('--|');
    const e1subs = '^ !';
    const e2 = cold('----|');
    const e2subs = '  ^   !';
    const expected = '------|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not complete if first source does not completes', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('--|');
    const e2subs = emptySubs;
    const expected = '-';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not complete if second source does not completes', () => {
    const e1 = cold('--|');
    const e1subs = '^ !';
    const e2 = cold('---');
    const e2subs = '  ^';
    const expected = '---';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should not complete if both sources do not complete', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('-');
    const e2subs = emptySubs;
    const expected = '-';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error when first source is empty, second source raises error', () => {
    const e1 = cold('--|');
    const e1subs = '^ !';
    const e2 = cold('----#');
    const e2subs = '  ^   !';
    const expected = '------#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error when first source raises error, second source is empty', () => {
    const e1 = cold('---#');
    const e1subs = '^  !';
    const e2 = cold('----|');
    const e2subs = emptySubs;
    const expected = '---#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise first error when both source raise error', () => {
    const e1 = cold('---#');
    const e1subs = '^  !';
    const e2 = cold('------#');
    const e2subs = emptySubs;
    const expected = '---#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should concat if first source emits once, second source is empty', () => {
    const e1 = cold('--a--|');
    const e1subs = '^    !';
    const e2 = cold('--------|');
    const e2subs = '     ^       !';
    const expected = '--a----------|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should concat if first source is empty, second source emits once', () => {
    const e1 = cold('--|');
    const e1subs = '^ !';
    const e2 = cold('--a--|');
    const e2subs = '  ^    !';
    const expected = '----a--|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it(
    'should emit element from first source, and should not complete if second ' +
      'source does not completes',
    () => {
      const e1 = cold('--a--|');
      const e1subs = '^    !';
      const e2 = cold('-');
      const e2subs = '     ^';
      const expected = '--a---';

      expectSource(concat(e1, e2)).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should not complete if first source does not complete', () => {
    const e1 = cold('-');
    const e1subs = '^';
    const e2 = cold('--a--|');
    const e2subs = emptySubs;
    const expected = '-';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should emit elements from each source when source emit once', () => {
    const e1 = cold('---a|');
    const e1subs = '^   !';
    const e2 = cold('-----b--|');
    const e2subs = '    ^       !';
    const expected = '---a-----b--|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should unsubscribe to inner source if outer is unsubscribed early', () => {
    const e1 = cold('---a-a--a|            ');
    const e1subs = '^        !            ';
    const e2 = cold('-----b-b--b-|');
    const e2subs = '         ^       !    ';
    const unsub = '                 !    ';
    const expected = '---a-a--a-----b-b     ';

    expectSource(concat(e1, e2), unsub).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should raise error from first source and does not emit from second source', () => {
    const e1 = cold('--#');
    const e1subs = '^ !';
    const e2 = cold('----a--|');
    const e2subs = emptySubs;
    const expected = '--#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should emit element from first source then raise error from second source', () => {
    const e1 = cold('--a--|');
    const e1subs = '^    !';
    const e2 = cold('-------#');
    const e2subs = '     ^      !';
    const expected = '--a---------#';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it(
    'should emit all elements from both hot observable sources if first source ' +
      'completes before second source starts emit',
    () => {
      const e1 = hot('--a--b-|');
      const e1subs = '^      !';
      const e2 = hot('--------x--y--|');
      const e2subs = '       ^      !';
      const expected = '--a--b--x--y--|';

      expectSource(concat(e1, e2)).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it(
    'should emit elements from second source regardless of completion time ' +
      'when second source is cold observable',
    () => {
      const e1 = hot('--a--b--c---|');
      const e1subs = '^           !';
      const e2 = cold('-x-y-z-|');
      const e2subs = '            ^      !';
      const expected = '--a--b--c----x-y-z-|';

      expectSource(concat(e1, e2)).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should not emit collapsing element from second source', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';
    const e2 = hot('--------x--y--z--|');
    const e2subs = '           ^     !';
    const expected = '--a--b--c--y--z--|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should return empty if concatenating an empty source', () => {
    const e1 = cold('|');
    const e1subs = ['(^!)', '(^!)'];
    const expected = '|';

    const result = concat(e1, e1);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it('should error immediately if given a just-throw source', () => {
    const e1 = cold('#');
    const e1subs = '(^!)';
    const expected = '#';

    const result = concat(e1, e1);

    expectSource(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
  });

  it(
    'should emit elements from second source regardless of completion time ' +
      'when second source is cold observable',
    () => {
      const e1 = hot('--a--b--c---|');
      const e1subs = '^           !';
      const e2 = cold('-x-y-z-|');
      const e2subs = '            ^      !';
      const expected = '--a--b--c----x-y-z-|';

      expectSource(concat(e1, e2)).toBe(expected);
      expectSubscriptions(e1.subscriptions).toBe(e1subs);
      expectSubscriptions(e2.subscriptions).toBe(e2subs);
    }
  );

  it('should not emit collapsing element from second source', () => {
    const e1 = hot('--a--b--c--|');
    const e1subs = '^          !';
    const e2 = hot('--------x--y--z--|');
    const e2subs = '           ^     !';
    const expected = '--a--b--c--y--z--|';

    expectSource(concat(e1, e2)).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });

  it('should concat an immediately-scheduled source with an immediately-scheduled second', done => {
    const a = of(1, 2, 3, queueScheduler);
    const b = of(4, 5, 6, 7, 8, queueScheduler);
    const r = [1, 2, 3, 4, 5, 6, 7, 8];

    concat(a, b, queueScheduler).subscribe(
      vals => {
        expect(vals).to.equal(r.shift());
      },
      null,
      done
    );
  });

  it("should use the scheduler even when one Observable is concat'd", done => {
    let e1Subscribed = false;
    const e1 = defer(() => {
      e1Subscribed = true;
      return of('a');
    });

    concat(e1, asyncScheduler).subscribe({
      error: done,
      complete: () => {
        expect(e1Subscribed).to.be.true;
        done();
      }
    });

    expect(e1Subscribed).to.be.false;
  });

  it('should return passed observable if no scheduler was passed', () => {
    const source = cold('--a---b----c---|');
    const result = concat(source);

    expectSource(result).toBe('--a---b----c---|');
  });

  it('should return RxJS Observable when single lowerCaseO was passed', () => {
    const source = lowerCaseO('a', 'b', 'c');
    const result = concat(source);

    expect(result).to.be.an.instanceof(Observable);
    expectSource(result).toBe('(abc|)');
  });
});

describe('concat', () => {
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
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(concat()); // $ExpectType Observable<number>
  });

  it('should support a scheduler', () => {
    const o = of(1, 2, 3).pipe(concat(asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should support one argument', () => {
    const o = of(1, 2, 3).pipe(concat(of(1))); // $ExpectType Observable<number>
  });

  it('should support two arguments', () => {
    const o = of(1, 2, 3).pipe(concat(of(1), of(2))); // $ExpectType Observable<number>
  });

  it('should support three arguments', () => {
    const o = of(1, 2, 3).pipe(concat(of(1), of(2), of(3))); // $ExpectType Observable<number>
  });

  it('should support four arguments', () => {
    const o = of(1, 2, 3).pipe(concat(of(1), of(2), of(3), of(4))); // $ExpectType Observable<number>
  });

  it('should support five arguments', () => {
    const o = of(1, 2, 3).pipe(concat(of(1), of(2), of(3), of(4), of(5))); // $ExpectType Observable<number>
  });

  it('should support six arguments', () => {
    const o = of(1, 2, 3).pipe(
      concat(of(1), of(2), of(3), of(4), of(5), of(6))
    ); // $ExpectType Observable<number>
  });

  it('should support six or more arguments', () => {
    const o = of(1, 2, 3).pipe(
      concat(of(1), of(2), of(3), of(4), of(5), of(6), of(7), of(8), of(9))
    ); // $ExpectType Observable<number>
  });

  it('should support a scheduler as last parameter', () => {
    const o = of(1, 2, 3).pipe(concat(of(4), of(5), of(6), asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should support promises', () => {
    const o = of(1, 2, 3).pipe(concat(Promise.resolve(4))); // $ExpectType Observable<number>
  });

  it('should support arrays', () => {
    const o = of(1, 2, 3).pipe(concat([4, 5])); // $ExpectType Observable<number>
  });

  it('should support iterables', () => {
    const o = of(1, 2, 3).pipe(concat('foo')); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with multiple types', () => {
    const o = of(1, 2, 3).pipe(
      concat(
        of('foo'),
        Promise.resolve<number[]>([1]),
        of(6)
      )
    ); // $ExpectType Observable<string | number | number[]>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(concat(5)); // $ExpectError
    const p = of(1, 2, 3).pipe(concat(of(5), 6)); // $ExpectError
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

describe('concatAll', () => {
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

  it('should infer correctly', () => {
    const o = of(of(1, 2, 3)).pipe(concatAll()); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(concatAll()); // $ExpectError
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

describe('concatWith', () => {
  it('should support rest params', () => {
    const arr = [b$, c$];
    const o = a$.pipe(concatWith(...arr)); // $ExpectType Observable<A | B | C>
    const o2 = a$.pipe(concatWith(d$, ...arr, e$)); // $ExpectType Observable<A | B | C | D | E>
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(concatWith()); // $ExpectType Observable<number>
  });

  it('should support one argument', () => {
    const o = of(1, 2, 3).pipe(concatWith(of(1))); // $ExpectType Observable<number>
  });

  it('should support two arguments', () => {
    const o = of(1, 2, 3).pipe(concatWith(of(1), of(2))); // $ExpectType Observable<number>
  });

  it('should support three arguments', () => {
    const o = of(1, 2, 3).pipe(concatWith(of(1), of(2), of(3))); // $ExpectType Observable<number>
  });

  it('should support four arguments', () => {
    const o = of(1, 2, 3).pipe(concatWith(of(1), of(2), of(3), of(4))); // $ExpectType Observable<number>
  });

  it('should support five arguments', () => {
    const o = of(1, 2, 3).pipe(concatWith(of(1), of(2), of(3), of(4), of(5))); // $ExpectType Observable<number>
  });

  it('should support six arguments', () => {
    const o = of(1, 2, 3).pipe(
      concatWith(of(1), of(2), of(3), of(4), of(5), of(6))
    ); // $ExpectType Observable<number>
  });

  it('should support six or more arguments', () => {
    const o = of(1, 2, 3).pipe(
      concatWith(of(1), of(2), of(3), of(4), of(5), of(6), of(7), of(8), of(9))
    ); // $ExpectType Observable<number>
  });

  it('should support promises', () => {
    const o = of(1, 2, 3).pipe(concatWith(Promise.resolve(4))); // $ExpectType Observable<number>
  });

  it('should support arrays', () => {
    const o = of(1, 2, 3).pipe(concatWith([4, 5])); // $ExpectType Observable<number>
  });

  it('should support iterables', () => {
    const o = of(1, 2, 3).pipe(concatWith('foo')); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with multiple types', () => {
    const o = of(1, 2, 3).pipe(
      concatWith(of('foo'), Promise.resolve([1]), of(6))
    ); // $ExpectType Observable<string | number | number[]>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(concatWith(5)); // $ExpectError
    const p = of(1, 2, 3).pipe(concatWith(of(5), 6)); // $ExpectError
  });

  it('should always infer number', () => {
    const o = of(1, 2, 3).pipe(count(x => x > 1)); // $ExpectType Observable<number>
    const j = of('a', 'b', 'c').pipe(count(x => x === 'a')); // $ExpectType Observable<number>
  });
});

describe('concat operator', () => {
  let rxTest: TestScheduler;

  beforeEach(() => {
    rxTest = new TestScheduler(assertDeepEquals);
  });
  it('should accept 1 param', () => {
    const o = concat(of(1)); // $ExpectType Observable<number>
  });

  it('should accept 2 params', () => {
    const o = concat(of(1), of(2)); // $ExpectType Observable<number>
  });

  it('should accept 3 params', () => {
    const o = concat(of(1), of(2), of(3)); // $ExpectType Observable<number>
  });

  it('should accept 4 params', () => {
    const o = concat(of(1), of(2), of(3), of(4)); // $ExpectType Observable<number>
  });

  it('should accept 5 params', () => {
    const o = concat(of(1), of(2), of(3), of(4), of(5)); // $ExpectType Observable<number>
  });

  it('should accept 6 params', () => {
    const o = concat(of(1), of(2), of(3), of(4), of(5), of(6)); // $ExpectType Observable<number>
  });

  it('should accept more than 6 params', () => {
    const o = concat(
      of(1),
      of(2),
      of(3),
      of(4),
      of(5),
      of(6),
      of(7),
      of(8),
      of(9)
    ); // $ExpectType Observable<number>
  });

  it('should return Observable<unknown> for more than 6 different types of params', () => {
    const o = concat(
      of(1),
      of('a'),
      of(2),
      of(true),
      of(3),
      of([1, 2, 3]),
      of(4)
    ); // $ExpectType Observable<string | number | boolean | number[]>
  });

  it('should accept scheduler after params', () => {
    const o = concat(of(4), of(5), of(6), asyncScheduler); // $ExpectType Observable<number>
  });

  it('should accept promises', () => {
    const o = concat(Promise.resolve(4)); // $ExpectType Observable<number>
  });

  it('should accept arrays', () => {
    const o = concat([4, 5]); // $ExpectType Observable<number>
  });

  it('should accept iterables', () => {
    const o = concat([1], 'foo'); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with multiple types', () => {
    const o = concat(
      of('foo'),
      Promise.resolve<number[]>([1]),
      of(6)
    ); // $ExpectType Observable<string | number | number[]>
  });

  it('should enforce types', () => {
    const o = concat(5); // $ExpectError
    const p = concat(of(5), 6); // $ExpectError
  });

  it('should support union types', () => {
    const u = Math.random() > 0.5 ? of(123) : of('abc');
    const o = concat(u, u, u); // $ExpectType Observable<string | number>
  });

  it('should support different union types', () => {
    const u1 = Math.random() > 0.5 ? of(123) : of('abc');
    const u2 = Math.random() > 0.5 ? of(true) : of([1, 2, 3]);
    const o = concat(u1, u2); // $ExpectType Observable<string | number | boolean | number[]>
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

describe('count', () => {
  asDiagram('count')('should count the values of an observable', () => {
    const source = hot('--a--b--c--|');
    const subs = '^          !';
    const expected = '-----------(x|)';

    expectSource(source.pipe(count())).toBe(expected, {x: 3});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
  it('should accept empty parameter', () => {
    const o = of(1, 2, 3).pipe(count()); // $ExpectType Observable<number>
  });

  it('should infer source observable type in parameter', () => {
    const o = of(1, 2, 3).pipe(
      count((x, i, source: Observable<string>) => x === 3)
    ); // $ExpectError
  });

  it('should enforce value type of source type', () => {
    const o = of(1, 2, 3).pipe(count((x, i, source) => x === '3')); // $ExpectError
  });

  it('should enforce index type of number', () => {
    const o = of(1, 2, 3).pipe(count((x, i, source) => i === '3')); // $ExpectError
  });

  it('should expect function parameter', () => {
    const o = of(1, 2, 3).pipe(count(9)); // $ExpectError
  });

  it('should enforce source type', () => {
    const o = of(1, 2, 3).pipe(count(x => x === '')); // $ExpectError
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

describe('max', () => {
  asDiagram('max')('should find the max of values of an observable', () => {
    const e1 = hot('--a--b--c--|', {a: 42, b: -1, c: 3});
    const subs = '^          !';
    const expected = '-----------(x|)';

    expectSource((<any>e1).pipe(max())).toBe(expected, {x: 42});
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });
  it('should infer correctly', () => {
    const a = of(1, 2, 3).pipe(max()); // $ExpectType Observable<number>
    const b = of('abc', 'bcd', 'def').pipe(max()); // $ExpectType Observable<string>
  });

  it(' should except empty comparer', () => {
    const a = of(1, 2, 3).pipe(max()); // $ExpectType Observable<number>
  });

  it('should enforce comparer types', () => {
    const a = of(1, 2, 3).pipe(max((a: number, b: number) => a - b)); // $ExpectType Observable<number>
    const b = of(1, 2, 3).pipe(max((a: number, b: string) => 0)); // $ExpectError
    const c = of(1, 2, 3).pipe(max((a: string, b: number) => 0)); // $ExpectError
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

describe('min', () => {
  asDiagram('min')('should min the values of an observable', () => {
    const source = hot('--a--b--c--|', {a: 42, b: -1, c: 3});
    const subs = '^          !';
    const expected = '-----------(x|)';

    expectSource((<any>source).pipe(min())).toBe(expected, {x: -1});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
  it('should infer correctly', () => {
    const a = of(1, 2, 3).pipe(min()); // $ExpectType Observable<number>
    const b = of('abc', 'bcd', 'def').pipe(min()); // $ExpectType Observable<string>
  });

  it('should except empty comparer', () => {
    const a = of(1, 2, 3).pipe(min()); // $ExpectType Observable<number>
  });

  it('should enforce comparer types', () => {
    const a = of(1, 2, 3).pipe(min((a: number, b: number) => a - b)); // $ExpectType Observable<number>
    const b = of(1, 2, 3).pipe(min((a: number, b: string) => 0)); // $ExpectError
    const c = of(1, 2, 3).pipe(min((a: string, b: number) => 0)); // $ExpectError
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

describe('reduce', () => {
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
  it('should enforce parameter', () => {
    const a = of(1, 2, 3).pipe(reduce()); // $ExpectError
  });

  it('should infer correctly ', () => {
    const a = of(1, 2, 3).pipe(reduce((x, y, z) => x + 1)); // $ExpectType Observable<number>
  });

  it('should infer correctly for accumulator of type array', () => {
    const a = of(1, 2, 3).pipe(
      reduce((x: number[], y: number, i: number) => x, [])
    ); // $ExpectType Observable<number[]>
  });

  it('should accept seed parameter of the same type', () => {
    const a = of(1, 2, 3).pipe(reduce((x, y, z) => x + 1, 5)); // $ExpectType Observable<number>
    const b = of(1, 2, 3).pipe(reduce((x, y, z) => x + 1, [])); // $ExpectError
  });

  it('should accept seed parameter of the seed array type', () => {
    const a = of(1, 2, 3).pipe(
      reduce(
        (x, y, z) => {
          x.push(y);
          return x;
        },
        [4]
      )
    ); // $ExpectType Observable<number[]>
    // Array must be typed...
    const b = of(1, 2, 3).pipe(
      reduce((x, y, z) => {
        x.push(y);
        return x;
      }, [])
    ); // $ExpectError
  });

  it('should accept seed parameter of a different type', () => {
    const a = of(1, 2, 3).pipe(reduce((x, y, z) => x + '1', '5')); // $ExpectType Observable<string>
    const bv: {[key: string]: string} = {};
    const b = of(1, 2, 3).pipe(
      reduce((x, y, z) => ({...x, [y]: y.toString()}), bv)
    ); // $ExpectType Observable<{ [key: string]: string; }>
  });

  it('should act appropriately with no seed', () => {
    const a = of(1, 2, 3).pipe(reduce((a: any, v) => '' + v)); // $ExpectType Observable<any>
    const b = of(1, 2, 3).pipe(reduce((a, v) => v)); // $ExpectType Observable<number>
    const c = of(1, 2, 3).pipe(reduce(() => {})); // $ExpectType Observable<number | void>
  });

  it('should act appropriately with a seed', () => {
    const a = of(1, 2, 3).pipe(reduce((a, v) => a + v, '')); // $ExpectType Observable<string>
    const b = of(1, 2, 3).pipe(reduce((a, v) => a + v, 0)); // $ExpectType Observable<number>
    const c = of(1, 2, 3).pipe(reduce((a, v) => a + 1, [])); // $ExpectError
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

    const a = reduce(toArrayReducer, [] as number[]); // $ExpectType Lifter<number, number[]>
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
