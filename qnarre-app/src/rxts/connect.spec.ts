import {hot, cold, expectSource, expectSubscriptions} from './testing';

declare function asDiagram(arg: string): Function;
declare const type: Function;

describe('publish', () => {
  asDiagram('publish')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = '^              !';
    const published = source.pipe(publish()) as Connect<any>;
    const expected = '--1-2---3-4--5-|';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should support empty parameter', () => {
    const a = of(1, 2, 3).pipe(publish()); // $ExpectType Observable<number>
  });

  it('should infer when type is specified', () => {
    const a = of(1, 2, 3).pipe<number>(publish()); // $ExpectType Observable<number>
  });

  it('should infer correctly with parameter', () => {
    const a = of(1, 2, 3).pipe(publish(x => x)); // $ExpectType Observable<number>
    const b = of('a', 'b', 'c').pipe(publish(x => x)); // $ExpectType Observable<string>
  });

  it('should enforce type on selector', () => {
    const a = of(1, 2, 3).pipe(publish((x: Observable<string>) => x)); // $ExpectError
  });

  it('should support union types in selector', () => {
    const a = of(1, 2, 3).pipe(
      publish(() => (Math.random() > 0.5 ? of(123) : of('test')))
    ); // $ExpectType Observable<string | number>
  });

  it('should return a Connect-ish', () => {
    const source = of(1).pipe(publish()) as Connect<number>;
    expect(typeof (<any>source)._subscribe === 'function').to.be.true;
    expect(typeof (<any>source).getSubject === 'function').to.be.true;
    expect(typeof source.connect === 'function').to.be.true;
    expect(typeof source.refCount === 'function').to.be.true;
  });

  it('should do nothing if connect is not called, despite subscriptions', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs: string[] = [];
    const published = source.pipe(publish());
    const expected = '-';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast the same values to multiple observers', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^           !';
    const published = source.pipe(publish()) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '-1-2-3----4-|';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    -3----4-|';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        --4-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should accept selectors', () => {
    const source = hot('-1-2-3----4-|');
    const sourceSubs = ['^           !', '    ^       !', '        ^   !'];
    const published = source.pipe(
      publish(x =>
        x.pipe(zip(x, (a, b) => (parseInt(a) + parseInt(b)).toString()))
      )
    );
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '-2-4-6----8-|';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    -6----8-|';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        --8-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast an error from the source to multiple observers', () => {
    const source = cold('-1-2-3----4-#');
    const sourceSubs = '^           !';
    const published = source.pipe(publish()) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '-1-2-3----4-#';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    -3----4-#';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        --4-#';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it(
    'should multicast the same values to multiple observers, ' +
      'but is unsubscribed explicitly and early',
    () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '^        !   ';
      const published = source.pipe(publish()) as Connect<string>;
      const unsub = '         u   ';
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '-1-2-3----   ';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    -3----   ';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
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

      connection = published.connect();
    }
  );

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^        !   ';
    const published = source.pipe(
      mergeMap(x => of(x)),
      publish()
    ) as Connect<any>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '-1-2-3----   ';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    -3----   ';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        --   ';
    const unsub = '         u   ';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    let connection: Subscription;
    expectSource(
      hot(unsub).pipe(
        tap(() => {
          connection.unsubscribe();
        })
      )
    ).toBe(unsub);

    connection = published.connect();
  });

  describe('with refCount()', () => {
    it('should connect when first subscriber subscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^           !';
      const replayed = source.pipe(publish(), refCount());
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(replayed));
      const expected1 = '   -1-2-3----4-|';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(replayed));
      const expected2 = '       -3----4-|';
      const subscriber3 = hot('           c|   ').pipe(mergeMapTo(replayed));
      const expected3 = '           --4-|';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should disconnect when last subscriber unsubscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^        !   ';
      const replayed = source.pipe(publish(), refCount());
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(replayed));
      const unsub1 = '          !     ';
      const expected1 = '   -1-2-3--     ';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(replayed));
      const unsub2 = '            !   ';
      const expected2 = '       -3----   ';

      expectSource(subscriber1, unsub1).toBe(expected1);
      expectSource(subscriber2, unsub2).toBe(expected2);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should NOT be retryable', () => {
      const source = cold('-1-2-3----4-#');
      const sourceSubs = '^           !';
      const published = source.pipe(publish(), refCount(), retry(3));
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '-1-2-3----4-#';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    -3----4-#';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
      const expected3 = '        --4-#';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should NOT be repeatable', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '^           !';
      const published = source.pipe(publish(), refCount(), repeat(3));
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '-1-2-3----4-|';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    -3----4-|';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
      const expected3 = '        --4-|';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });
  });

  it('should emit completed when subscribed after completed', done => {
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

    const connectable = source.pipe(publish()) as Connect<number>;

    connectable.subscribe(x => {
      results1.push(x);
    });

    expect(results1).to.deep.equal([]);
    expect(results2).to.deep.equal([]);

    connectable.connect();

    expect(results1).to.deep.equal([1, 2, 3, 4]);
    expect(results2).to.deep.equal([]);
    expect(subscriptions).to.equal(1);

    connectable.subscribe(
      x => {
        results2.push(x);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(results2).to.deep.equal([]);
        done();
      }
    );
  });

  it('should multicast an empty source', () => {
    const source = cold('|');
    const sourceSubs = '(^!)';
    const published = source.pipe(publish()) as Connect<string>;
    const expected = '|';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast a never source', () => {
    const source = cold('-');
    const sourceSubs = '^';
    const published = source.pipe(publish()) as Connect<string>;
    const expected = '-';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast a throw source', () => {
    const source = cold('#');
    const sourceSubs = '(^!)';
    const published = source.pipe(publish()) as Connect<string>;
    const expected = '#';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
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

    const connectable = source.pipe(publish()) as Connect<number>;

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
  type('should infer the type', () => {
    const source = of(1, 2, 3);
    const result: Connect<number> = source.pipe(publish()) as Connect<number>;
  });
  type('should infer the type with a selector', () => {
    const source = of(1, 2, 3);
    const result: Observable<number> = source.pipe(
      publish(s => s.pipe(map(x => x)))
    );
  });
  type('should infer the type with a type-changing selector', () => {
    const source = of(1, 2, 3);
    const result: Observable<string> = source.pipe(
      publish(s => s.pipe(map(x => x + '!')))
    );
  });
  type('should infer the type for the pipeable operator', () => {
    const source = of(1, 2, 3);
    const result: Connect<number> = publish<number>()(source);
  });
  type(
    'should infer the type for the pipeable operator with a selector',
    () => {
      const source = of(1, 2, 3);
      const result: Observable<number> = source.pipe(
        publish(s => s.pipe(map(x => x)))
      );
    }
  );
  type(
    'should infer the type for the pipeable operator with a type-changing selector',
    () => {
      const source = of(1, 2, 3);
      const result: Observable<string> = source.pipe(
        publish(s => s.pipe(map(x => x + '!')))
      );
    }
  );
});

describe('publishBehavior', () => {
  asDiagram('publishBehavior(0)')(
    'should mirror a simple source Observable',
    () => {
      const source = cold('--1-2---3-4--5-|');
      const sourceSubs = '^              !';
      const published = source.pipe(publishBehavior('0')) as Connect<string>;
      const expected = '0-1-2---3-4--5-|';

      expectSource(published).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);

      published.connect();
    }
  );

  it('should enforce parameter', () => {
    const a = of(1, 2, 3).pipe(publishBehavior()); // $ExpectError
  });

  it('should infer correctly with parameter', () => {
    const a = of(1, 2, 3).pipe(publishBehavior(4)); // $ExpectType Observable<number>
  });

  it('should enforce type on parameter', () => {
    const a = of(1, 2, 3).pipe(publishBehavior('a')); // $ExpectError
  });

  it('should return a Connect-ish', () => {
    const source = of(1).pipe(publishBehavior(1)) as Connect<number>;
    expect(typeof (<any>source)._subscribe === 'function').to.be.true;
    expect(typeof (<any>source).getSubject === 'function').to.be.true;
    expect(typeof source.connect === 'function').to.be.true;
    expect(typeof source.refCount === 'function').to.be.true;
  });

  it('should only emit default value if connect is not called, despite subscriptions', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs: string[] = [];
    const published = source.pipe(publishBehavior('0'));
    const expected = '0';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast the same values to multiple observers', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^           !';
    const published = source.pipe(publishBehavior('0')) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '01-2-3----4-|';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    23----4-|';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        3-4-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast an error from the source to multiple observers', () => {
    const source = cold('-1-2-3----4-#');
    const sourceSubs = '^           !';
    const published = source.pipe(publishBehavior('0')) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '01-2-3----4-#';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    23----4-#';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        3-4-#';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it(
    'should multicast the same values to multiple observers, ' +
      'but is unsubscribed explicitly and early',
    () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '^        !   ';
      const published = source.pipe(publishBehavior('0')) as Connect<string>;
      const unsub = '         u   ';
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '01-2-3----   ';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    23----   ';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
      const expected3 = '        3-   ';

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

      connection = published.connect();
    }
  );

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^        !   ';
    const published = source.pipe(
      mergeMap(x => of(x)),
      publishBehavior('0')
    ) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '01-2-3----   ';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    23----   ';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        3-   ';
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

    connection = published.connect();
  });

  describe('with refCount()', () => {
    it('should connect when first subscriber subscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^           !';
      const replayed = source.pipe(publishBehavior('0'), refCount());
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(replayed));
      const expected1 = '   01-2-3----4-|';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(replayed));
      const expected2 = '       23----4-|';
      const subscriber3 = hot('           c|   ').pipe(mergeMapTo(replayed));
      const expected3 = '           3-4-|';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should disconnect when last subscriber unsubscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^        !   ';
      const replayed = source.pipe(publishBehavior('0'), refCount());
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(replayed));
      const unsub1 = '          !     ';
      const expected1 = '   01-2-3--     ';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(replayed));
      const unsub2 = '            !   ';
      const expected2 = '       23----   ';

      expectSource(subscriber1, unsub1).toBe(expected1);
      expectSource(subscriber2, unsub2).toBe(expected2);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should NOT be retryable', () => {
      const source = cold('-1-2-3----4-#');
      const sourceSubs = '^           !';
      const published = source.pipe(publishBehavior('0'), refCount(), retry(3));
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '01-2-3----4-#';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    23----4-#';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
      const expected3 = '        3-4-#';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should NOT be repeatable', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '^           !';
      const published = source.pipe(
        publishBehavior('0'),
        refCount(),
        repeat(3)
      );
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '01-2-3----4-|';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    23----4-|';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
      const expected3 = '        3-4-|';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });
  });

  it('should emit completed when subscribed after completed', done => {
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

    const connectable = source.pipe(publishBehavior(0)) as Connect<number>;

    connectable.subscribe(function (x) {
      results1.push(x);
    });

    expect(results1).to.deep.equal([0]);
    expect(results2).to.deep.equal([]);

    connectable.connect();

    expect(results1).to.deep.equal([0, 1, 2, 3, 4]);
    expect(results2).to.deep.equal([]);
    expect(subscriptions).to.equal(1);

    connectable.subscribe(
      function (x) {
        results2.push(x);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(results2).to.deep.equal([]);
        done();
      }
    );
  });

  it('should multicast an empty source', () => {
    const source = cold('|');
    const sourceSubs = '(^!)';
    const published = source.pipe(publishBehavior('0')) as Connect<string>;
    const expected = '(0|)';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast a never source', () => {
    const source = cold('-');
    const sourceSubs = '^';
    const published = source.pipe(publishBehavior('0')) as Connect<string>;
    const expected = '0';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast a throw source', () => {
    const source = cold('#');
    const sourceSubs = '(^!)';
    const published = source.pipe(publishBehavior('0')) as Connect<string>;
    const expected = '(0#)';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
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
    });

    const connectable = source.pipe(publishBehavior(0)) as Connect<number>;

    connectable.subscribe(x => {
      results1.push(x);
    });

    expect(results1).to.deep.equal([0]);

    connectable.connect();

    expect(results2).to.deep.equal([]);

    connectable.subscribe(x => {
      results2.push(x);
    });

    expect(results1).to.deep.equal([0, 1, 2, 3, 4]);
    expect(results2).to.deep.equal([4]);
    expect(subscriptions).to.equal(1);
    done();
  });

  it('should follow the RxJS 4 behavior and emit nothing to observer after completed', done => {
    const results: number[] = [];

    const source = new Observable<number>(observer => {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.next(4);
      observer.complete();
    });

    const connectable = source.pipe(publishBehavior(0)) as Connect<number>;

    connectable.connect();

    connectable.subscribe(x => {
      results.push(x);
    });

    expect(results).to.deep.equal([]);
    done();
  });

  type('should infer the type', () => {
    const source = of(1, 2, 3);
    const result: Connect<number> = source.pipe(publishBehavior(0)) as Connect<
      number
    >;
  });

  type('should infer the type for the pipeable operator', () => {
    const source = of(1, 2, 3);
    // TODO: https://github.com/ReactiveX/rxjs/issues/2972
    const result: Connect<number> = publishBehavior(0)(source);
  });
});

describe('publishLast', () => {
  asDiagram('publishLast')(
    'should emit last notification of a simple source Observable',
    () => {
      const source = cold('--1-2---3-4--5-|');
      const sourceSubs = '^              !';
      const published = source.pipe(publishLast()) as Connect<string>;
      const expected = '---------------(5|)';

      expectSource(published).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);

      published.connect();
    }
  );
  it('should accept empty parameter', () => {
    const a = of(1, 2, 3).pipe(publishLast()); // $ExpectType Observable<number>
  });

  it('should infer when type is specified', () => {
    const a = of(1, 2, 3).pipe<number>(publishLast()); // $ExpectType Observable<number>
  });

  it('should return a Connect-ish', () => {
    const source = of(1).pipe(publishLast()) as Connect<number>;
    expect(typeof (<any>source)._subscribe === 'function').to.be.true;
    expect(typeof (<any>source).getSubject === 'function').to.be.true;
    expect(typeof source.connect === 'function').to.be.true;
    expect(typeof source.refCount === 'function').to.be.true;
  });

  it('should do nothing if connect is not called, despite subscriptions', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs: string[] = [];
    const published = source.pipe(publishLast());
    const expected = '-';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast the same values to multiple observers', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^           !';
    const published = source.pipe(publishLast()) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '------------(4|)';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    --------(4|)';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        ----(4|)';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast an error from the source to multiple observers', () => {
    const source = cold('-1-2-3----4-#');
    const sourceSubs = '^           !';
    const published = source.pipe(publishLast()) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '------------#';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    --------#';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        ----#';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it(
    'should not cast any values to multiple observers, ' +
      'when source is unsubscribed explicitly and early',
    () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '^        !   ';
      const published = source.pipe(publishLast()) as Connect<string>;
      const unsub = '         u   ';
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '----------   ';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    ------   ';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
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

      connection = published.connect();
    }
  );

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^        !   ';
    const published = source.pipe(
      mergeMap(x => of(x)),
      publishLast()
    ) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '----------   ';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    ------   ';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
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

    connection = published.connect();
  });

  describe('with refCount()', () => {
    it('should connect when first subscriber subscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^           !';
      const replayed = source.pipe(publishLast(), refCount());
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(replayed));
      const expected1 = '   ------------(4|)';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(replayed));
      const expected2 = '       --------(4|)';
      const subscriber3 = hot('           c|   ').pipe(mergeMapTo(replayed));
      const expected3 = '           ----(4|)';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should disconnect when last subscriber unsubscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^        !   ';
      const replayed = source.pipe(publishLast(), refCount());
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(replayed));
      const unsub1 = '          !     ';
      const expected1 = '   --------     ';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(replayed));
      const unsub2 = '            !   ';
      const expected2 = '       ------   ';

      expectSource(subscriber1, unsub1).toBe(expected1);
      expectSource(subscriber2, unsub2).toBe(expected2);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should NOT be retryable', () => {
      const source = cold('-1-2-3----4-#');
      const sourceSubs = '^           !';
      const published = source.pipe(publishLast(), refCount(), retry(3));
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '------------#';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    --------#';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
      const expected3 = '        ----#';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });
  });

  it('should multicast an empty source', () => {
    const source = cold('|');
    const sourceSubs = '(^!)';
    const published = source.pipe(publishLast()) as Connect<string>;
    const expected = '|';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast a never source', () => {
    const source = cold('-');
    const sourceSubs = '^';
    const published = source.pipe(publishLast()) as Connect<string>;
    const expected = '-';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast a throw source', () => {
    const source = cold('#');
    const sourceSubs = '(^!)';
    const published = source.pipe(publishLast()) as Connect<string>;
    const expected = '#';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
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

    const connectable = source.pipe(publishLast()) as Connect<number>;

    connectable.subscribe(x => {
      results1.push(x);
    });

    connectable.subscribe(x => {
      results2.push(x);
    });

    expect(results1).to.deep.equal([]);
    expect(results2).to.deep.equal([]);

    connectable.connect();

    expect(results1).to.deep.equal([4]);
    expect(results2).to.deep.equal([4]);
    expect(subscriptions).to.equal(1);
    done();
  });

  type('should infer the type', () => {
    const source = of(1, 2, 3);
    const result: Connect<number> = source.pipe(publishLast()) as Connect<
      number
    >;
  });

  type('should infer the type for the pipeable operator', () => {
    const source = of(1, 2, 3);
    // TODO: https://github.com/ReactiveX/rxjs/issues/2972
    const result: Connect<unknown> = publishLast()(source);
  });
});

describe('publishReplay', () => {
  asDiagram('publishReplay(1)')(
    'should mirror a simple source Observable',
    () => {
      const source = cold('--1-2---3-4--5-|');
      const sourceSubs = '^              !';
      const published = source.pipe(publishReplay(1)) as Connect<string>;
      const expected = '--1-2---3-4--5-|';

      expectSource(published).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);

      published.connect();
    }
  );
  it('should accept empty parameter', () => {
    const a = of(1, 2, 3).pipe(publishReplay()); // $ExpectType Observable<number>
  });

  it('should accept bufferSize parameter only', () => {
    const a = of(1, 2, 3).pipe(publishReplay(1)); // $ExpectType Observable<number>
  });

  it('should accept windowTime and bufferSize', () => {
    const a = of(1, 2, 3).pipe(publishReplay(1, 1)); // $ExpectType Observable<number>
  });

  it('should accept windowTime, bufferSize, scheduler', () => {
    const a = of(1, 2, 3).pipe(publishReplay(1, 1, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should accept windowTime, bufferSize, selector of Lifter', () => {
    const a = of(1, 2, 3).pipe(publishReplay(1, 1, x => of('a'))); // $ExpectType Observable<string>
  });

  it('should accept windowTime, bufferSize, selector returning union type', () => {
    const a = of(1, 2, 3).pipe(
      publishReplay(1, 1, () => (Math.random() > 0.5 ? of(123) : of('test')))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept windowTime, bufferSize, selector  of MonoOper', () => {
    const a = of(1, 2, 3).pipe(publishReplay(1, 1, x => x)); // $ExpectType Observable<number>
  });

  it('should accept windowTime, bufferSize, selector returning union type, and a scheduler', () => {
    const a = of(1, 2, 3).pipe(
      publishReplay(
        1,
        1,
        () => (Math.random() > 0.5 ? of(123) : of('test')),
        asyncScheduler
      )
    ); // $ExpectType Observable<string | number>
  });
  it('should accept windowTime, bufferSize, selector of Lifter, and scheduler', () => {
    const a = of(1, 2, 3).pipe(
      publishReplay(1, 1, x => of('a'), asyncScheduler)
    ); // $ExpectType Observable<string>
  });

  it('should accept windowTime, bufferSize, selector of MonoOper, and scheduler', () => {
    const a = of(1, 2, 3).pipe(publishReplay(1, 1, x => x, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should enforce type on selector', () => {
    const a = of(1, 2, 3).pipe(
      publishReplay(1, 1, (x: Observable<string>) => x)
    ); // $ExpectError
  });

  it('should return a Connect-ish', () => {
    const source = of(1).pipe(publishReplay()) as Connect<number>;
    expect(typeof (<any>source)._subscribe === 'function').to.be.true;
    expect(typeof (<any>source).getSubject === 'function').to.be.true;
    expect(typeof source.connect === 'function').to.be.true;
    expect(typeof source.refCount === 'function').to.be.true;
  });

  it('should do nothing if connect is not called, despite subscriptions', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs: string[] = [];
    const published = source.pipe(publishReplay(1));
    const expected = '-';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should multicast the same values to multiple observers, bufferSize=1', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^           !';
    const published = source.pipe(publishReplay(1)) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '-1-2-3----4-|';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    23----4-|';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        3-4-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast the same values to multiple observers, bufferSize=2', () => {
    const source = cold('-1-2-----3------4-|');
    const sourceSubs = '^                 !';
    const published = source.pipe(publishReplay(2)) as Connect<string>;
    const subscriber1 = hot('a|                 ').pipe(mergeMapTo(published));
    const expected1 = '-1-2-----3------4-|';
    const subscriber2 = hot('    b|             ').pipe(mergeMapTo(published));
    const expected2 = '    (12)-3------4-|';
    const subscriber3 = hot('           c|       ').pipe(mergeMapTo(published));
    const expected3 = '           (23)-4-|';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast an error from the source to multiple observers', () => {
    const source = cold('-1-2-3----4-#');
    const sourceSubs = '^           !';
    const published = source.pipe(publishReplay(1)) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '-1-2-3----4-#';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    23----4-#';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        3-4-#';

    expectSource(subscriber1).toBe(expected1);
    expectSource(subscriber2).toBe(expected2);
    expectSource(subscriber3).toBe(expected3);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it(
    'should multicast the same values to multiple observers, ' +
      'but is unsubscribed explicitly and early',
    () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '^        !   ';
      const published = source.pipe(publishReplay(1)) as Connect<string>;
      const unsub = '         u   ';
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '-1-2-3----   ';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    23----   ';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
      const expected3 = '        3-   ';

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

      connection = published.connect();
    }
  );

  it('should not break unsubscription chains when result is unsubscribed explicitly', () => {
    const source = cold('-1-2-3----4-|');
    const sourceSubs = '^        !   ';
    const published = source.pipe(
      mergeMap(x => of(x)),
      publishReplay(1)
    ) as Connect<string>;
    const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
    const expected1 = '-1-2-3----   ';
    const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
    const expected2 = '    23----   ';
    const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
    const expected3 = '        3-   ';
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

    connection = published.connect();
  });

  describe('with refCount()', () => {
    it('should connect when first subscriber subscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^           !';
      const replayed = source.pipe(publishReplay(1), refCount());
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(replayed));
      const expected1 = '   -1-2-3----4-|';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(replayed));
      const expected2 = '       23----4-|';
      const subscriber3 = hot('           c|   ').pipe(mergeMapTo(replayed));
      const expected3 = '           3-4-|';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should disconnect when last subscriber unsubscribes', () => {
      const source = cold('-1-2-3----4-|');
      const sourceSubs = '   ^        !   ';
      const replayed = source.pipe(publishReplay(1), refCount());
      const subscriber1 = hot('   a|           ').pipe(mergeMapTo(replayed));
      const unsub1 = '          !     ';
      const expected1 = '   -1-2-3--     ';
      const subscriber2 = hot('       b|       ').pipe(mergeMapTo(replayed));
      const unsub2 = '            !   ';
      const expected2 = '       23----   ';

      expectSource(subscriber1, unsub1).toBe(expected1);
      expectSource(subscriber2, unsub2).toBe(expected2);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should NOT be retryable', () => {
      const source = cold('-1-2-3----4-#');
      // const sourceSubs =      '^           !';
      const published = source.pipe(publishReplay(1), refCount(), retry(3));
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '-1-2-3----4-(444#)';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    23----4-(444#)';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
      const expected3 = '        3-4-(444#)';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      // expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    });

    it('should NOT be repeatable', () => {
      const source = cold('-1-2-3----4-|');
      // const sourceSubs =      '^           !';
      const published = source.pipe(publishReplay(1), refCount(), repeat(3));
      const subscriber1 = hot('a|           ').pipe(mergeMapTo(published));
      const expected1 = '-1-2-3----4-(44|)';
      const subscriber2 = hot('    b|       ').pipe(mergeMapTo(published));
      const expected2 = '    23----4-(44|)';
      const subscriber3 = hot('        c|   ').pipe(mergeMapTo(published));
      const expected3 = '        3-4-(44|)';

      expectSource(subscriber1).toBe(expected1);
      expectSource(subscriber2).toBe(expected2);
      expectSource(subscriber3).toBe(expected3);
      // expectSubscriptions(source.subscriptions).toBe(sourceSubs);
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

    const connectable = source.pipe(publishReplay()) as Connect<number>;

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

  it('should replay as many events as specified by the bufferSize', done => {
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

    const connectable = source.pipe(publishReplay(2)) as Connect<number>;

    connectable.subscribe(x => {
      results1.push(x);
    });

    expect(results1).to.deep.equal([]);
    expect(results2).to.deep.equal([]);

    connectable.connect();

    connectable.subscribe(x => {
      results2.push(x);
    });

    expect(results1).to.deep.equal([1, 2, 3, 4]);
    expect(results2).to.deep.equal([3, 4]);
    expect(subscriptions).to.equal(1);
    done();
  });

  it(
    'should emit replayed values and resubscribe to the source when ' +
      'reconnected without source completion',
    () => {
      const results1: number[] = [];
      const results2: number[] = [];
      let subscriptions = 0;

      const source = new Observable<number>(observer => {
        subscriptions++;
        observer.next(1);
        observer.next(2);
        observer.next(3);
        observer.next(4);
        // observer.complete();
      });

      const connectable = source.pipe(publishReplay(2)) as Connect<number>;
      const subscription1 = connectable.subscribe(x => {
        results1.push(x);
      });

      expect(results1).to.deep.equal([]);
      expect(results2).to.deep.equal([]);

      connectable.connect().unsubscribe();
      subscription1.unsubscribe();

      expect(results1).to.deep.equal([1, 2, 3, 4]);
      expect(results2).to.deep.equal([]);
      expect(subscriptions).to.equal(1);

      const subscription2 = connectable.subscribe(x => {
        results2.push(x);
      });

      connectable.connect().unsubscribe();
      subscription2.unsubscribe();

      expect(results1).to.deep.equal([1, 2, 3, 4]);
      expect(results2).to.deep.equal([3, 4, 1, 2, 3, 4]);
      expect(subscriptions).to.equal(2);
    }
  );

  it('should emit replayed values plus completed when subscribed after completed', done => {
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

    const connectable = source.pipe(publishReplay(2)) as Connect<number>;

    connectable.subscribe(x => {
      results1.push(x);
    });

    expect(results1).to.deep.equal([]);
    expect(results2).to.deep.equal([]);

    connectable.connect();

    expect(results1).to.deep.equal([1, 2, 3, 4]);
    expect(results2).to.deep.equal([]);
    expect(subscriptions).to.equal(1);

    connectable.subscribe(
      x => {
        results2.push(x);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(results2).to.deep.equal([3, 4]);
        done();
      }
    );
  });

  it('should multicast an empty source', () => {
    const source = cold('|');
    const sourceSubs = '(^!)';
    const published = source.pipe(publishReplay(1)) as Connect<string>;
    const expected = '|';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast a never source', () => {
    const source = cold('-');
    const sourceSubs = '^';

    const published = source.pipe(publishReplay(1)) as Connect<string>;
    const expected = '-';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should multicast a throw source', () => {
    const source = cold('#');
    const sourceSubs = '(^!)';
    const published = source.pipe(publishReplay(1)) as Connect<string>;
    const expected = '#';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

  it('should mirror a simple source Observable with selector', () => {
    const values = {a: 2, b: 4, c: 6, d: 8};
    const selector = (observable: Observable<string>) =>
      observable.pipe(map(v => 2 * +v));
    const source = cold('--1-2---3-4---|');
    const sourceSubs = '^             !';
    const published = source.pipe(
      publishReplay(1, Number.POSITIVE_INFINITY, selector)
    );
    const expected = '--a-b---c-d---|';

    expectSource(published).toBe(expected, values);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit an error when the selector throws an exception', () => {
    const error = "It's broken";
    const selector = () => {
      throw error;
    };
    const source = cold('--1-2---3-4---|');
    const published = source.pipe(
      publishReplay(1, Number.POSITIVE_INFINITY, selector)
    );

    // The exception is thrown outside Rx chain (not as an error notification).
    expect(() => published.subscribe()).to.throw(error);
  });

  it('should emit an error when the selector returns an Observable that emits an error', () => {
    const error = "It's broken";
    const innerObservable = cold('--5-6----#', undefined, error);
    const selector = (observable: Observable<string>) =>
      observable.pipe(mergeMapTo(innerObservable));
    const source = cold('--1--2---3---|');
    const sourceSubs = '^          !';
    const published = source.pipe(
      publishReplay(1, Number.POSITIVE_INFINITY, selector)
    );
    const expected = '----5-65-6-#';

    expectSource(published).toBe(expected, undefined, error);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should terminate immediately when the selector returns an empty Observable', () => {
    const selector = () => EMPTY;
    const source = cold('--1--2---3---|');
    const sourceSubs = '(^!)';
    const published = source.pipe(
      publishReplay(1, Number.POSITIVE_INFINITY, selector)
    );
    const expected = '|';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not emit and should not complete/error when the selector returns never', () => {
    const selector = () => NEVER;
    const source = cold('-');
    const sourceSubs = '^';
    const published = source.pipe(
      publishReplay(1, Number.POSITIVE_INFINITY, selector)
    );
    const expected = '-';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit error when the selector returns Observable.throw', () => {
    const error = "It's broken";
    const selector = () => throwError(error);
    const source = cold('--1--2---3---|');
    const sourceSubs = '(^!)';
    const published = source.pipe(
      publishReplay(1, Number.POSITIVE_INFINITY, selector)
    );
    const expected = '#';

    expectSource(published).toBe(expected, undefined, error);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  type('should infer the type', () => {
    const source = of(1, 2, 3);
    const result: Connect<number> = source.pipe(publishReplay(1)) as Connect<
      number
    >;
  });

  type('should infer the type with a selector', () => {
    const source = of(1, 2, 3);
    const result: Observable<number> = source.pipe(
      publishReplay(1, undefined, s => s.pipe(map(x => x)))
    );
  });

  type('should infer the type with a type-changing selector', () => {
    const source = of(1, 2, 3);
    const result: Observable<string> = source.pipe(
      publishReplay(1, undefined, s => s.pipe(map(x => x + '!')))
    );
  });

  // TODO: https://github.com/ReactiveX/rxjs/issues/2972
  // type('should infer the type for the pipeable operator', () => {
  //
  //   const source =of(1, 2, 3);
  //   const result: Connect<number> = publishReplay<number>(1)(source);
  //
  // });

  type(
    'should infer the type for the pipeable operator with a selector',
    () => {
      const source = of(1, 2, 3);
      const result: Observable<number> = source.pipe(
        publishReplay(1, undefined, s => s.pipe(map(x => x)))
      );
    }
  );

  type(
    'should infer the type for the pipeable operator with a type-changing selector',
    () => {
      const source = of(1, 2, 3);
      const result: Observable<string> = source.pipe(
        publishReplay(1, undefined, s => s.pipe(map(x => x + '!')))
      );
    }
  );
});

describe('refCount', () => {
  asDiagram('refCount')(
    'should turn a multicasted Observable an automatically ' +
      '(dis)connecting hot one',
    () => {
      const source = cold('--1-2---3-4--5-|');
      const sourceSubs = '^              !';
      const expected = '--1-2---3-4--5-|';

      const result = source.pipe(publish(), refCount());

      expectSource(result).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);
    }
  );
  it('should infer correctly', () => {
    const a = of(1, 2, 3).pipe(refCount()); // $ExpectType Observable<number>
  });

  it('should not accept any parameters', () => {
    const a = of(1, 2, 3).pipe(refCount(1)); // $ExpectError
  });

  it('should count references', () => {
    const connectable = NEVER.pipe(publish());
    const refCounted = connectable.pipe(refCount());

    const sub1 = refCounted.subscribe({
      next: noop
    });
    const sub2 = refCounted.subscribe({
      next: noop
    });
    const sub3 = refCounted.subscribe({
      next: noop
    });

    expect((connectable as any)._refCount).to.equal(3);

    sub1.unsubscribe();
    sub2.unsubscribe();
    sub3.unsubscribe();
  });

  it('should unsub from the source when all other subscriptions are unsubbed', (done: MochaDone) => {
    let unsubscribeCalled = false;
    const connectable = new Observable<boolean>(observer => {
      observer.next(true);
      return () => {
        unsubscribeCalled = true;
      };
    }).pipe(publish());

    const refCounted = connectable.pipe(refCount());

    const sub1 = refCounted.subscribe(() => {
      //noop
    });
    const sub2 = refCounted.subscribe(() => {
      //noop
    });
    const sub3 = refCounted.subscribe((x: any) => {
      expect((connectable as any)._refCount).to.equal(1);
    });

    sub1.unsubscribe();
    sub2.unsubscribe();
    sub3.unsubscribe();

    expect((connectable as any)._refCount).to.equal(0);
    expect(unsubscribeCalled).to.be.true;
    done();
  });

  it(
    'should not unsubscribe when a subscriber synchronously unsubscribes if ' +
      'other subscribers are present',
    () => {
      let unsubscribeCalled = false;
      const connectable = new Observable<boolean>(observer => {
        observer.next(true);
        return () => {
          unsubscribeCalled = true;
        };
      }).pipe(publishReplay(1));

      const refCounted = connectable.pipe(refCount());

      refCounted.subscribe();
      refCounted.subscribe().unsubscribe();

      expect((connectable as any)._refCount).to.equal(1);
      expect(unsubscribeCalled).to.be.false;
    }
  );

  it(
    'should not unsubscribe when a subscriber synchronously unsubscribes if ' +
      'other subscribers are present and the source is a Subject',
    () => {
      const arr: string[] = [];
      const subject = new Subject<string>();
      const connectable = subject.pipe(publishReplay(1));
      const refCounted = connectable.pipe(refCount());

      refCounted.subscribe(val => {
        arr.push(val);
      });

      subject.next('the number one');

      refCounted.pipe(first()).subscribe().unsubscribe();

      subject.next('the number two');

      expect((connectable as any)._refCount).to.equal(1);
      expect(arr[0]).to.equal('the number one');
      expect(arr[1]).to.equal('the number two');
    }
  );
});
