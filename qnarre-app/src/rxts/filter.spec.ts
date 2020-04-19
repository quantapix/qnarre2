import {hot, cold, expectSource, expectSubscriptions} from './testing';

declare function asDiagram(arg: string): Function;

describe('debounce', () => {
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

describe('debounceTime', () => {
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
});

interface Person {
  name: string;
}
const sample: Person = {name: 'Tim'};

describe('distinctUntilChanged', () => {
  it('should infer correctly', () => {
    const o = of(sample).pipe(distinctUntilChanged()); // $ExpectType Observable<Person>
  });

  it('should accept a compare', () => {
    const o = of(sample).pipe(
      distinctUntilChanged((p1, p2) => p1.name === p2.name)
    ); // $ExpectType Observable<Person>
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
    const o = of(sample).pipe(
      distinctUntilChanged((p1, p2) => p1.foo === p2.name)
    ); // $ExpectError
    const p = of(sample).pipe(
      distinctUntilChanged((p1, p2) => p1.name === p2.foo)
    ); // $ExpectError
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
});

const sample = {name: 'foobar', num: 42};

describe('distinctUntilKeyChanged', () => {
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
});

describe('elementAt', () => {
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
      const isString = (x: string | number): x is string =>
        typeof x === 'string';

      xs.pipe(filter(isString)).subscribe(s => s.length); // s is string

      // In contrast, this type of regular boolean predicate still maintains the original type
      xs.pipe(filter(x => typeof x === 'number')).subscribe(x => x); // x is still string | number
      xs.pipe(filter((x, i) => typeof x === 'number' && x > i)).subscribe(
        x => x
      ); // x is still string | number
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

  const isFooBar = (value: string): value is 'foo' | 'bar' =>
    /^(foo|bar)$/.test(value);

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
  });
});

describe('ignoreElements', () => {
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
