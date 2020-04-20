describe('defaultIfEmpty', () => {
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
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(defaultIfEmpty()); // $ExpectType Observable<number>
  });

  it('should infer correctly with a defaultValue', () => {
    const o = of(1, 2, 3).pipe(defaultIfEmpty(47)); // $ExpectType Observable<number>
  });

  it('should infer correctly with a different type of defaultValue', () => {
    const o = of(1, 2, 3).pipe(defaultIfEmpty<number, string>('carbonara')); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with a subtype passed through parameters', () => {
    const o = of(true, false).pipe(
      map(p => p),
      defaultIfEmpty(true)
    ); // $ExpectType Observable<boolean>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(defaultIfEmpty(4, 5)); // $ExpectError
  });

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

describe('every', () => {
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
  it('should infer correctly', () => {
    const a = of(1, 2, 3).pipe(every(val => val < 3)); // $ExpectType Observable<boolean>
  });

  it('should support index and its type', () => {
    const a = of(1, 2, 3).pipe(every((val, index: number) => val < 3)); // $ExpectType Observable<boolean>
  });

  it('should support index and its type', () => {
    const a = of(1, 2, 3).pipe(every((val, index: number) => index < 3)); // $ExpectType Observable<boolean>
  });

  it('should infer source observable type in parameter', () => {
    const a = of(1, 2, 3).pipe(
      every((val, index, source: Observable<number>) => val < 3)
    ); // $ExpectType Observable<boolean>
  });

  it('should support optional thisArg parameter', () => {
    const a = of(1, 2, 3).pipe(
      every((val, index, source: Observable<number>) => val < 3, 'any object')
    ); // $ExpectType Observable<boolean>
  });

  it('should not accept empty parameter', () => {
    const a = of(1, 2, 3).pipe(every()); // $ExpectError
  });

  it('should support source type', () => {
    const a = of(1, 2, 3).pipe(every(val => val === '2')); // $ExpectError
  });

  it('should enforce index type of number', () => {
    const a = of(1, 2, 3).pipe(every((val, i) => i === '3')); // $ExpectError
  });

  it('should expect function parameter', () => {
    const a = of(1, 2, 3).pipe(every(9)); // $ExpectError
  });

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

describe('find', () => {
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

  it('should support a user-defined type guard', () => {
    const o = of('foo').pipe(find((s): s is 'foo' => true)); // $ExpectType Observable<"foo" | undefined>
  });

  it('should support a user-defined type guard that takes an index', () => {
    const o = of('foo').pipe(find((s, index): s is 'foo' => true)); // $ExpectType Observable<"foo" | undefined>
  });

  it('should support a user-defined type guard that takes an index and the source', () => {
    const o = of('foo').pipe(find((s, index, source): s is 'foo' => true)); // $ExpectType Observable<"foo" | undefined>
  });

  it('should support a predicate', () => {
    const o = of('foo').pipe(find(s => true)); // $ExpectType Observable<string | undefined>
  });

  it('should support a predicate that takes an index', () => {
    const o = of('foo').pipe(find((s, index) => true)); // $ExpectType Observable<string | undefined>
  });

  it('should support a predicate that takes an index and the source', () => {
    const o = of('foo').pipe(find((s, index, source) => true)); // $ExpectType Observable<string | undefined>
  });

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

describe('findIndex', () => {
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
  it('should infer correctly', () => {
    const o = of('foo', 'bar', 'baz').pipe(findIndex(p => p === 'foo')); // $ExpectType Observable<number>
  });

  it('should support a predicate that takes an index ', () => {
    const o = of('foo', 'bar', 'baz').pipe(
      findIndex((p, index) => index === 3)
    ); // $ExpectType Observable<number>
  });

  it('should support a predicate that takes a source ', () => {
    const o = of('foo', 'bar', 'baz').pipe(
      findIndex((p, index, source) => p === 'foo')
    ); // $ExpectType Observable<number>
  });

  it('should support an argument ', () => {
    const o = of('foo', 'bar', 'baz').pipe(findIndex(p => p === 'foo', 123)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(findIndex()); // $ExpectError
  });

  it('should enforce predicate types', () => {
    const o = of('foo', 'bar', 'baz').pipe(findIndex((p: number) => p === 3)); // $ExpectError
    const p = of('foo', 'bar', 'baz').pipe(
      findIndex((p, index: string) => p === 3)
    ); // $ExpectError
    const q = of('foo', 'bar', 'baz').pipe(
      findIndex((p, index, source: Observable<number>) => p === 3)
    ); // $ExpectError
  });

  it('should enforce predicate return type', () => {
    const o = of('foo', 'bar', 'baz').pipe(findIndex(p => p)); // $ExpectError
  });

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

describe('isEmpty', () => {
  asDiagram('isEmpty')('should return true if source is empty', () => {
    const source = hot('-----|');
    const subs = '^    !';
    const expected = '-----(T|)';

    expectSource((<any>source).pipe(isEmpty())).toBe(expected, {T: true});
    expectSubscriptions(source.subscriptions).toBe(subs);
  });
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(isEmpty()); // $ExpectType Observable<boolean>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(isEmpty('nope')); // $ExpectError
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
