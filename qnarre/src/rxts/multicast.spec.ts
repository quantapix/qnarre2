describe('multicast', () => {
  asDiagram('multicast(() => new Subject<string>())')(
    'should mirror a simple source Observable',
    () => {
      const source = cold('--1-2---3-4--5-|');
      const sourceSubs = '^              !';
      const multicasted = source.pipe(multicast(() => new Subject<string>())) as Connect<
        string
      >;
      const expected = '--1-2---3-4--5-|';

      expectSource(multicasted).toBe(expected);
      expectSubscriptions(source.subscriptions).toBe(sourceSubs);

      multicasted.connect();
    }
  );

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(multicast(new Subject<number>())); // $ExpectType Observable<number>
    const p = of(1, 2, 3).pipe(multicast(() => new Subject<number>())); // $ExpectType Observable<number>
  });

  it('should be possible to use a this with in a SubjectFactory', () => {
    const o = of(1, 2, 3).pipe(
      multicast(function (this: Observable<number>) {
        return new Subject<number>();
      })
    ); // $ExpectType Observable<number>
  });

  it('should be possible to use a selector', () => {
    const o = of(1, 2, 3).pipe(multicast(new Subject<number>(), p => p)); // $ExpectType Observable<number>
    const p = of(1, 2, 3).pipe(multicast(new Subject<number>(), p => of('foo'))); // $ExpectType Observable<string>
    const q = of(1, 2, 3).pipe(
      multicast(
        () => new Subject<number>(),
        p => p
      )
    ); // $ExpectType Observable<number>
    const r = of(1, 2, 3).pipe(
      multicast(
        () => new Subject<number>(),
        p => of('foo')
      )
    ); // $ExpectType Observable<string>
  });

  it('should support union types', () => {
    const o = of(1, 2, 3).pipe(
      multicast(new Subject<number>(), p => (Math.random() > 0.5 ? of(123) : of('foo')))
    ); // $ExpectType Observable<string | number>
    const p = of(1, 2, 3).pipe(
      multicast(
        () => new Subject<number>(),
        p => (Math.random() > 0.5 ? of(123) : of('foo'))
      )
    ); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const p = of(1, 2, 3).pipe(multicast()); // $ExpectError
  });

  it('should enforce Subject type', () => {
    const o = of(1, 2, 3).pipe(multicast('foo')); // $ExpectError
    const p = of(1, 2, 3).pipe(multicast(new Subject<string>())); // $ExpectError
  });

  it('should enforce SubjectFactory type', () => {
    const p = of(1, 2, 3).pipe(multicast('foo')); // $ExpectError
    const q = of(1, 2, 3).pipe(multicast(() => new Subject<string>())); // $ExpectError
  });

  it('should enforce the selector type', () => {
    const o = of(1, 2, 3).pipe(multicast(() => new Subject<number>(), 5)); // $ExpectError
    const p = of(1, 2, 3).pipe(
      multicast(
        () => new Subject<number>(),
        (p: string) => 5
      )
    ); // $ExpectError
  });

  it('should accept Subjects', done => {
    const expected = [1, 2, 3, 4];

    const connectable = of(1, 2, 3, 4).pipe(multicast(new Subject<number>())) as Connect<
      number
    >;

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
    const connectable = source.pipe(multicast(new Subject<number>())) as Connect<number>;
    const replayed = connectable.pipe(multicast(new Replay<number>())) as Connect<number>;

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
        x => zip(x, x, (a: any, b: any) => (parseInt(a) + parseInt(b)).toString())
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
    const sourceSubs = ['^           !', '    ^           !', '        ^           !'];
    const multicasted = source.pipe(
      multicast(
        () => new Subject<string>(),
        x => zip(x, x, (a: any, b: any) => (parseInt(a) + parseInt(b)).toString())
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
    const sourceSubs = ['^           !', '    ^           !', '        ^           !'];
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
    const multicasted = source.pipe(multicast(() => new Subject<string>())) as Connect<
      string
    >;
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
    const multicasted = source.pipe(multicast(() => new Subject<string>())) as Connect<
      string
    >;
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
      const multicasted = source.pipe(multicast(() => new Subject<string>())) as Connect<
        string
      >;
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
    const multicasted = source.pipe(multicast(() => new Subject<string>())) as Connect<
      string
    >;
    const expected = '|';

    expectSource(multicasted).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    multicasted.connect();
  });

  it('should multicast a never source', () => {
    const source = cold('-');
    const sourceSubs = '^';
    const multicasted = source.pipe(multicast(() => new Subject<string>())) as Connect<
      string
    >;
    const expected = '-';

    expectSource(multicasted).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    multicasted.connect();
  });

  it('should multicast a throw source', () => {
    const source = cold('#');
    const sourceSubs = '(^!)';
    const multicasted = source.pipe(multicast(() => new Subject<string>())) as Connect<
      string
    >;
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

    expect(results1).toEqual([]);
    expect(results2).toEqual([]);

    connectable.connect();

    expect(results1).toEqual([1, 2, 3, 4]);
    expect(results2).toEqual([1, 2, 3, 4]);
    expect(subscriptions).to.equal(1);
    done();
  });

  it('should remove all subscribers from the subject when disconnected', () => {
    const subject = new Subject<number>();
    const expected = [1, 2, 3, 4];
    let i = 0;

    const source = from([1, 2, 3, 4]).pipe(multicast(subject)) as Connect<number>;

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

    it('should not throw UnsubscribedError when used in ' + 'a switchMap', done => {
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
    });
  });

  describe('when given a subject', () => {
    it('should not throw UnsubscribedError when used in ' + 'a switchMap', done => {
      const source = of(1, 2, 3).pipe(multicast(new Subject<number>()), refCount());

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
    });
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

    type('should infer the type for the pipeable', () => {
      /* tslint:disable:no-unused-variable */
      const source = of(1, 2, 3);
      // TODO: https://github.com/ReactiveX/rxjs/issues/2972
      const result: Connect<number> = multicast(() => new Subject<number>())(source);
      /* tslint:enable:no-unused-variable */
    });

    type('should infer the type for the pipeable operator with a selector', () => {
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
      publish(x => x.pipe(zip(x, (a, b) => (parseInt(a) + parseInt(b)).toString())))
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

    expect(results1).toEqual([]);
    expect(results2).toEqual([]);

    connectable.connect();

    expect(results1).toEqual([1, 2, 3, 4]);
    expect(results2).toEqual([]);
    expect(subscriptions).to.equal(1);

    connectable.subscribe(
      x => {
        results2.push(x);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(results2).toEqual([]);
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

    expect(results1).toEqual([]);
    expect(results2).toEqual([]);

    connectable.connect();

    expect(results1).toEqual([1, 2, 3, 4]);
    expect(results2).toEqual([1, 2, 3, 4]);
    expect(subscriptions).to.equal(1);
    done();
  });
  type('should infer the type', () => {
    const source = of(1, 2, 3);
    const result: Connect<number> = source.pipe(publish()) as Connect<number>;
  });
  type('should infer the type with a selector', () => {
    const source = of(1, 2, 3);
    const result: Observable<number> = source.pipe(publish(s => s.pipe(map(x => x))));
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
  type('should infer the type for the pipeable operator with a selector', () => {
    const source = of(1, 2, 3);
    const result: Observable<number> = source.pipe(publish(s => s.pipe(map(x => x))));
  });
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
  asDiagram('publishBehavior(0)')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = '^              !';
    const published = source.pipe(publishBehavior('0')) as Connect<string>;
    const expected = '0-1-2---3-4--5-|';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });

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
      const published = source.pipe(publishBehavior('0'), refCount(), repeat(3));
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

    expect(results1).toEqual([0]);
    expect(results2).toEqual([]);

    connectable.connect();

    expect(results1).toEqual([0, 1, 2, 3, 4]);
    expect(results2).toEqual([]);
    expect(subscriptions).to.equal(1);

    connectable.subscribe(
      function (x) {
        results2.push(x);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(results2).toEqual([]);
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

    expect(results1).toEqual([0]);

    connectable.connect();

    expect(results2).toEqual([]);

    connectable.subscribe(x => {
      results2.push(x);
    });

    expect(results1).toEqual([0, 1, 2, 3, 4]);
    expect(results2).toEqual([4]);
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

    expect(results).toEqual([]);
    done();
  });

  type('should infer the type', () => {
    const source = of(1, 2, 3);
    const result: Connect<number> = source.pipe(publishBehavior(0)) as Connect<number>;
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

    expect(results1).toEqual([]);
    expect(results2).toEqual([]);

    connectable.connect();

    expect(results1).toEqual([4]);
    expect(results2).toEqual([4]);
    expect(subscriptions).to.equal(1);
    done();
  });

  type('should infer the type', () => {
    const source = of(1, 2, 3);
    const result: Connect<number> = source.pipe(publishLast()) as Connect<number>;
  });

  type('should infer the type for the pipeable operator', () => {
    const source = of(1, 2, 3);
    // TODO: https://github.com/ReactiveX/rxjs/issues/2972
    const result: Connect<unknown> = publishLast()(source);
  });
});

describe('publishReplay', () => {
  asDiagram('publishReplay(1)')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = '^              !';
    const published = source.pipe(publishReplay(1)) as Connect<string>;
    const expected = '--1-2---3-4--5-|';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);

    published.connect();
  });
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

  it('should accept windowTime, bufferSize, selector  of Shifter', () => {
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
    const a = of(1, 2, 3).pipe(publishReplay(1, 1, x => of('a'), asyncScheduler)); // $ExpectType Observable<string>
  });

  it('should accept windowTime, bufferSize, selector of Shifter, and scheduler', () => {
    const a = of(1, 2, 3).pipe(publishReplay(1, 1, x => x, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should enforce type on selector', () => {
    const a = of(1, 2, 3).pipe(publishReplay(1, 1, (x: Observable<string>) => x)); // $ExpectError
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

    expect(results1).toEqual([]);
    expect(results2).toEqual([]);

    connectable.connect();

    expect(results1).toEqual([1, 2, 3, 4]);
    expect(results2).toEqual([1, 2, 3, 4]);
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

    expect(results1).toEqual([]);
    expect(results2).toEqual([]);

    connectable.connect();

    connectable.subscribe(x => {
      results2.push(x);
    });

    expect(results1).toEqual([1, 2, 3, 4]);
    expect(results2).toEqual([3, 4]);
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

      expect(results1).toEqual([]);
      expect(results2).toEqual([]);

      connectable.connect().unsubscribe();
      subscription1.unsubscribe();

      expect(results1).toEqual([1, 2, 3, 4]);
      expect(results2).toEqual([]);
      expect(subscriptions).to.equal(1);

      const subscription2 = connectable.subscribe(x => {
        results2.push(x);
      });

      connectable.connect().unsubscribe();
      subscription2.unsubscribe();

      expect(results1).toEqual([1, 2, 3, 4]);
      expect(results2).toEqual([3, 4, 1, 2, 3, 4]);
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

    expect(results1).toEqual([]);
    expect(results2).toEqual([]);

    connectable.connect();

    expect(results1).toEqual([1, 2, 3, 4]);
    expect(results2).toEqual([]);
    expect(subscriptions).to.equal(1);

    connectable.subscribe(
      x => {
        results2.push(x);
      },
      x => {
        done(new Error('should not be called'));
      },
      () => {
        expect(results2).toEqual([3, 4]);
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
    const published = source.pipe(publishReplay(1, Number.POSITIVE_INFINITY, selector));
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
    const published = source.pipe(publishReplay(1, Number.POSITIVE_INFINITY, selector));

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
    const published = source.pipe(publishReplay(1, Number.POSITIVE_INFINITY, selector));
    const expected = '----5-65-6-#';

    expectSource(published).toBe(expected, undefined, error);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should terminate immediately when the selector returns an empty Observable', () => {
    const selector = () => EMPTY;
    const source = cold('--1--2---3---|');
    const sourceSubs = '(^!)';
    const published = source.pipe(publishReplay(1, Number.POSITIVE_INFINITY, selector));
    const expected = '|';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should not emit and should not complete/error when the selector returns never', () => {
    const selector = () => NEVER;
    const source = cold('-');
    const sourceSubs = '^';
    const published = source.pipe(publishReplay(1, Number.POSITIVE_INFINITY, selector));
    const expected = '-';

    expectSource(published).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should emit error when the selector returns Observable.throw', () => {
    const error = "It's broken";
    const selector = () => throwError(error);
    const source = cold('--1--2---3---|');
    const sourceSubs = '(^!)';
    const published = source.pipe(publishReplay(1, Number.POSITIVE_INFINITY, selector));
    const expected = '#';

    expectSource(published).toBe(expected, undefined, error);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  type('should infer the type', () => {
    const source = of(1, 2, 3);
    const result: Connect<number> = source.pipe(publishReplay(1)) as Connect<number>;
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

  type('should infer the type for the pipeable operator with a selector', () => {
    const source = of(1, 2, 3);
    const result: Observable<number> = source.pipe(
      publishReplay(1, undefined, s => s.pipe(map(x => x)))
    );
  });

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

describe('share', () => {
  asDiagram('share')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|');
    const sourceSubs = '^              !';
    const expected = '--1-2---3-4--5-|';

    const shared = source.pipe(share());

    expectSource(shared).toBe(expected);
    expectSubscriptions(source.subscriptions).toBe(sourceSubs);
  });

  it('should infer correctly', () => {
    const o = of('foo', 'bar', 'baz').pipe(share()); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(share('abc')); // $ExpectError
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

describe('shareReplay', () => {
  it('should accept an individual bufferSize parameter', () => {
    const o = of(1, 2, 3).pipe(shareReplay(1)); // $ExpectType Observable<number>
  });

  it('should accept individual bufferSize and windowTime parameters', () => {
    const o = of(1, 2, 3).pipe(shareReplay(1, 2)); // $ExpectType Observable<number>
  });

  it('should accept individual bufferSize, windowTime and scheduler parameters', () => {
    const o3 = of(1, 2, 3).pipe(shareReplay(1, 2, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should accept a bufferSize config parameter', () => {
    const o = of(1, 2, 3).pipe(shareReplay({bufferSize: 1, refCount: true})); // $ExpectType Observable<number>
  });

  it('should accept bufferSize and windowTime config parameters', () => {
    const o = of(1, 2, 3).pipe(
      shareReplay({bufferSize: 1, windowTime: 2, refCount: true})
    ); // $ExpectType Observable<number>
  });

  it('should accept bufferSize, windowTime and scheduler config parameters', () => {
    const o = of(1, 2, 3).pipe(
      shareReplay({
        bufferSize: 1,
        windowTime: 2,
        scheduler: asyncScheduler,
        refCount: true
      })
    ); // $ExpectType Observable<number>
  });

  it('should require a refCount config parameter', () => {
    const o = of(1, 2, 3).pipe(shareReplay({bufferSize: 1})); // $ExpectError
  });

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
    const subscriber1 = hot('a|                         ').pipe(mergeMapTo(shared));
    const expected1 = '-1-2-----3-#               ';
    const subscriber2 = hot('    b|                     ').pipe(mergeMapTo(shared));
    const expected2 = '    (12)-3-#               ';
    const subscriber3 = hot('               (c|)        ').pipe(mergeMapTo(shared));
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
    expect(spy, 'Replay should not call scheduler.now() when no windowTime is given').to
      .be.not.called;
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
