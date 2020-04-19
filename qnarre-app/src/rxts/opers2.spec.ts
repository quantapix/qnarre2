import {of, NEVER} from 'rxjs';
import {audit} from 'rxjs/operators';

describe('xxx', () => {
  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(audit(() => of('foo'))); // $ExpectType Observable<number>
    const p = of(1, 2, 3).pipe(audit(() => NEVER)); // $ExpectType Observable<number>
  });

  it('should infer correctly with a Promise', () => {
    const o = of(1, 2, 3).pipe(
      audit(
        () => new Promise<string>(() => {})
      )
    ); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(audit()); // $ExpectError
    const p = of(1, 2, 3).pipe(audit((p: string) => of('foo'))); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(auditTime(47)); // $ExpectType Observable<string>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(auditTime(47, asyncScheduler)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(auditTime()); // $ExpectError
    const p = of('a', 'b', 'c').pipe(auditTime('47')); // $ExpectError
    const q = of('a', 'b', 'c').pipe(auditTime(47, 'foo')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(catchError(() => of(4, 5, 6))); // $ExpectType Observable<number>
  });

  it('should handle empty (never) appropriately', () => {
    const o = of(1, 2, 3).pipe(catchError(() => EMPTY)); // $ExpectType Observable<number>
  });

  it('should handle a throw', () => {
    const f: () => never = () => {
      throw new Error('test');
    };
    const o = of(1, 2, 3).pipe(catchError(f)); // $ExpectType Observable<number>
  });

  it('should infer correctly when not returning', () => {
    const o = of(1, 2, 3).pipe(
      catchError(() => {
        throw new Error('your hands in the air');
      })
    ); // $ExpectType Observable<number>
  });

  it('should infer correctly when returning another type', () => {
    const o = of(1, 2, 3).pipe(catchError(() => of('a', 'b', 'c'))); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(catchError()); // $ExpectError
  });

  it('should enforce that selector returns an Observable', () => {
    const o = of(1, 2, 3).pipe(catchError(err => {})); // $ExpectError
  });

  it('should enforce type of caught', () => {
    const o = of(1, 2, 3).pipe(
      catchError((err, caught: Observable<string>) => of('a', 'b', 'c'))
    ); // $ExpectError
  });

  it('should handle union types', () => {
    const o = of(1, 2, 3).pipe(
      catchError(err => (err.message === 'wee' ? of('fun') : of(123)))
    ); // $ExpectType Observable<string | number>
  });

  it('should infer correctly', () => {
    const o = of([1, 2, 3]).pipe(combineAll()); // $ExpectType Observable<number[]>
  });

  it('should infer correctly with the projector', () => {
    const o = of([1, 2, 3]).pipe(
      combineAll((values: number) => ['x', 'y', 'z'])
    ); // $ExpectType Observable<string[]>
  });

  it('is possible to make the projector have an `any` type', () => {
    const o = of([1, 2, 3]).pipe(
      combineAll<string[]>(values => ['x', 'y', 'z'])
    ); // $ExpectType Observable<string[]>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(combineAll()); // $ExpectError
  });

  it('should enforce type of the projector', () => {
    const o = of([1, 2, 3]).pipe(
      combineAll((values: string) => ['x', 'y', 'z'])
    ); // $ExpectError
    const p = of([1, 2, 3]).pipe(
      combineAll<number[]>(values => ['x', 'y', 'z'])
    ); // $ExpectError
  });
});

describe('xxx', () => {
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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(delay(100)); // $ExpectType Observable<number>
  });

  it('should support date parameter', () => {
    const o = of(1, 2, 3).pipe(delay(new Date(2018, 09, 18))); // $ExpectType Observable<number>
  });

  it('should support a scheduler', () => {
    const o = of(1, 2, 3).pipe(delay(100, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(delay()); // $ExpectError
    const p = of(1, 2, 3).pipe(delay('foo')); // $ExpectError
    const q = of(1, 2, 3).pipe(delay(47, 'foo')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(delayWhen(() => of('a', 'b', 'c'))); // $ExpectType Observable<number>
    const p = of(1, 2, 3).pipe(
      delayWhen((value: number, index: number) => of('a', 'b', 'c'))
    ); // $ExpectType Observable<number>
  });

  it('should support an empty notifier', () => {
    const o = of(1, 2, 3).pipe(delayWhen(() => NEVER)); // $ExpectType Observable<number>
  });

  it('should support a subscriptiondelayWhen parameter', () => {
    const o = of(1, 2, 3).pipe(
      delayWhen(() => of('a', 'b', 'c'), of(new Date()))
    ); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(delayWhen()); // $ExpectError
  });

  it('should enforce types of delayWhenDurationSelector', () => {
    const o = of(1, 2, 3).pipe(delayWhen(of('a', 'b', 'c'))); // $ExpectError
    const p = of(1, 2, 3).pipe(
      delayWhen((value: string, index) => of('a', 'b', 'c'))
    ); // $ExpectError
    const q = of(1, 2, 3).pipe(
      delayWhen((value, index: string) => of('a', 'b', 'c'))
    ); // $ExpectError
  });

  it('should enforce types of subscriptiondelayWhen', () => {
    const o = of(1, 2, 3).pipe(delayWhen(() => of('a', 'b', 'c'), 'a')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(Notification.createNext('foo')).pipe(dematerialize()); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of(Notification.createNext('foo')).pipe(dematerialize(() => {})); // $ExpectError
  });

  it('should enforce Notification source', () => {
    const o = of('foo').pipe(dematerialize()); // $ExpectError
  });
});

const sample = {name: 'foobar', num: 42};

describe('xxx', () => {
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

  it('should infer correctly', () => {
    const o = of(of(1, 2, 3)).pipe(exhaust()); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(exhaust()); // $ExpectError
  });

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

  it('should support a predicate', () => {
    const o = of(1, 2, 3).pipe(filter(value => value < 3)); // $ExpectType Observable<number>
  });

  it('should support a predicate with an index', () => {
    const o = of(1, 2, 3).pipe(filter((value, index) => index < 3)); // $ExpectType Observable<number>
  });

  it('should support a predicate and an argument', () => {
    const o = of(1, 2, 3).pipe(filter(value => value < 3, 'bonjour')); // $ExpectType Observable<number>
  });

  it('should support a user-defined type guard', () => {
    const o = of(1, 2, 3).pipe(
      filter((value: number): value is 1 => value < 3)
    ); // $ExpectType Observable<1>
  });

  it('should support a user-defined type guard with an index', () => {
    const o = of(1, 2, 3).pipe(
      filter((value: number, index): value is 1 => index < 3)
    ); // $ExpectType Observable<1>
  });

  it('should support a user-defined type guard and an argument', () => {
    const o = of(1, 2, 3).pipe(
      filter((value: number): value is 1 => value < 3, 'hola')
    ); // $ExpectType Observable<1>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(filter()); // $ExpectError
  });

  it('should enforce predicate types', () => {
    const o = of(1, 2, 3).pipe(filter(value => value < '3')); // $ExpectError
    const p = of(1, 2, 3).pipe(filter((value, index) => index < '3')); // $ExpectError
  });

  it('should enforce user-defined type guard types', () => {
    const o = of(1, 2, 3).pipe(
      filter((value: string): value is '1' => value < '3')
    ); // $ExpectError
    const p = of(1, 2, 3).pipe(
      filter((value: number, index): value is 1 => index < '3')
    ); // $ExpectError
  });

  it('should support Boolean as a predicate', () => {
    const o = of(1, 2, 3).pipe(filter(Boolean)); // $ExpectType Observable<number>
    const p = of(1, null, undefined).pipe(filter(Boolean)); // $ExpectType Observable<number>
    const q = of(null, undefined).pipe(filter(Boolean)); // $ExpectType Observable<never>
  });

  it('should support inference from a return type with Boolean as a predicate', () => {
    interface I {
      a: string | null;
    }

    const i$: Observable<I> = of();
    const s$: Observable<string> = i$.pipe(
      map(i => i.a),
      filter(Boolean)
    ); // $ExpectType Observable<string>
  });

  it('should support inference from a generic return type of the predicate', () => {
    function isDefined<T>() {
      return (value: T | undefined | null): value is T => {
        return value !== undefined && value !== null;
      };
    }

    const o$ = of(1, null, {foo: 'bar'}, true, undefined, 'Nick Cage').pipe(
      filter(isDefined())
    ); // $ExpectType Observable<string | number | boolean | { foo: string; }>
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(finalize(() => {})); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(finalize()); // $ExpectError
    const p = of(1, 2, 3).pipe(finalize(value => {})); // $ExpectError
  });

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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(groupBy(value => value.toString())); // $ExpectType Observable<GroupedObservable<string, number>>
  });

  it('should support an element selector', () => {
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        value => Boolean(value)
      )
    ); // $ExpectType Observable<GroupedObservable<string, boolean>>
  });

  it('should support a duration selector', () => {
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        (value: GroupedObservable<string, number>) => of(true, false)
      )
    ); // $ExpectType Observable<GroupedObservable<string, number>>
  });

  it('should infer type of duration selector based on element selector', () => {
    /* tslint:disable-next-line:max-line-length */
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        value => Boolean(value),
        (value: GroupedObservable<string, boolean>) => value
      )
    ); // $ExpectType Observable<GroupedObservable<string, boolean>>
  });

  it('should support a subject selector', () => {
    const o = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        undefined,
        () => new Subject<boolean>()
      )
    ); // $ExpectType Observable<GroupedObservable<string, boolean>>
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
        (value: GroupedObservable<number, number>) => value
      )
    ); // $ExpectError
    const q = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        undefined,
        (value: GroupedObservable<string, string>) => value
      )
    ); // $ExpectError
    const r = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        value => Boolean(value),
        (value: GroupedObservable<string, string>) => value
      )
    ); // $ExpectError
    const s = of(1, 2, 3).pipe(
      groupBy(
        value => value.toString(),
        value => Boolean(value),
        (value: GroupedObservable<boolean, boolean>) => value
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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(isEmpty()); // $ExpectType Observable<boolean>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(isEmpty('nope')); // $ExpectError
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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(mapTo(47)); // $ExpectType Observable<number>
  });

  it('should infer correctly when returning a different type', () => {
    const o = of(1, 2, 3).pipe(mapTo('carrot')); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(mapTo()); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('foo').pipe(materialize()); // $ExpectType Observable<Notification<string>>
  });

  it('should enforce types', () => {
    const o = of('foo').pipe(materialize(() => {})); // $ExpectError
  });

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
    const p = of(1, 2, 3).pipe(
      multicast(new Subject<number>(), p => of('foo'))
    ); // $ExpectType Observable<string>
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
      multicast(new Subject<number>(), p =>
        Math.random() > 0.5 ? of(123) : of('foo')
      )
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

  it('should infer correctly', () => {
    const o = of('apple', 'banana', 'peach').pipe(observeOn(asyncScheduler)); // $ExpectType Observable<string>
  });

  it('should support a delay', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      observeOn(asyncScheduler, 47)
    ); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const p = of('apple', 'banana', 'peach').pipe(observeOn()); // $ExpectError
  });

  it('should enforce scheduler type', () => {
    const p = of('apple', 'banana', 'peach').pipe(observeOn('fruit')); // $ExpectError
  });

  it('should enforce delay type', () => {
    const p = of('apple', 'banana', 'peach').pipe(
      observeOn(asyncScheduler, '47')
    ); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext()); // $ExpectType Observable<string>
  });

  it('should accept one input', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext(of(1))); // $ExpectType Observable<string | number>
    const p = of('apple', 'banana', 'peach').pipe(onErrorResumeNext(of('5'))); // $ExpectType Observable<string>
  });

  it('should accept promises', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(Promise.resolve(5))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept iterables', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext('foo')); // $ExpectType Observable<string>
  });

  it('should accept arrays', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext([5])); // $ExpectType Observable<string | number>
  });

  it('should accept two inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept three inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept four inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'), of('4'))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept five inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'), of('4'), of(5))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept six inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'), of('4'), of(5), of('6'))
    ); // $ExpectType Observable<string | number>
  });

  it('should accept seven and more inputs', () => {
    const o = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext(of(1), of(2), of('3'), of('4'), of(5), of('6'), of(7))
    ); // $ExpectType Observable<unknown>
    const p = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext<string, string | number>(
        of(1),
        of(2),
        of('3'),
        of('4'),
        of(5),
        of('6'),
        of(7)
      )
    ); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of('apple', 'banana', 'peach').pipe(onErrorResumeNext(5)); // $ExpectError
  });

  it('should enforce source types', () => {
    const p = of('apple', 'banana', 'peach').pipe(
      onErrorResumeNext<number, number>(of(5))
    ); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('apple', 'banana', 'peach').pipe(pairwise()); // $ExpectType Observable<[string, string]>
  });

  it('should infer correctly with multiple types', () => {
    const o = of('apple', 4, 'peach', 7).pipe(pairwise()); // $ExpectType Observable<[string | number, string | number]>
  });

  it('should enforce types', () => {
    const o = of('apple', 'banana', 'peach').pipe(pairwise('lemon')); // $ExpectError
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

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(race()); // $ExpectType Observable<string>
  });

  it('should allow observables', () => {
    const o = of('a', 'b', 'c').pipe(race(of('x', 'y', 'z'))); // $ExpectType Observable<string>
    const p = of('a', 'b', 'c').pipe(
      race(of('x', 'y', 'z'), of('t', 'i', 'm'))
    ); // $ExpectType Observable<string>
  });

  it('should allow an array of observables', () => {
    const o = of('a', 'b', 'c').pipe(race([of('x', 'y', 'z')])); // $ExpectType Observable<string>
    const p = of('a', 'b', 'c').pipe(
      race([of('x', 'y', 'z'), of('t', 'i', 'm')])
    ); // $ExpectType Observable<string>
  });

  it('should be possible to provide a return type', () => {
    const o = of('a', 'b', 'c').pipe(
      race<string, number>([of(1, 2, 3)])
    ); // $ExpectType Observable<number>
    const p = of('a', 'b', 'c').pipe(
      race<string, number>([of(1, 2, 3), of('t', 'i', 'm')])
    ); // $ExpectType Observable<number>
    const q = of('a', 'b', 'c').pipe(
      race<string, number>(of(1, 2, 3), [of(1, 2, 3)])
    ); // $ExpectType Observable<number>
    const r = of('a', 'b', 'c').pipe(
      race<string, number>([of(1, 2, 3)], of('t', 'i', 'm'))
    ); // $ExpectType Observable<number>
  });

  it('should be possible to use nested arrays', () => {
    const o = of('a', 'b', 'c').pipe(race([of('x', 'y', 'z')])); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(race('aa')); // $ExpectError
  });

  it('should enforce argument types when not provided ', () => {
    const o = of('a', 'b', 'c').pipe(race(of(1, 2, 3))); // $ExpectError
    const p = of('a', 'b', 'c').pipe(race([of(1, 2, 3)])); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(repeat()); // $ExpectType Observable<string>
  });

  it('should accept a count parameter', () => {
    const o = of('a', 'b', 'c').pipe(repeat(47)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(repeat('aa')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(retry()); // $ExpectType Observable<number>
  });

  it('should accept a count parameter', () => {
    const o = of(1, 2, 3).pipe(retry(47)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(retry('aa')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(retryWhen(errors => errors)); // $ExpectType Observable<number>
  });

  it('should infer correctly when the error observable has a different type', () => {
    const o = of(1, 2, 3).pipe(
      retryWhen(retryWhen(errors => of('a', 'b', 'c')))
    ); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(retryWhen()); // $ExpectError
  });

  it('should enforce types of the notifier', () => {
    const o = of(1, 2, 3).pipe(retryWhen(() => 8)); // $ExpectError
  });

  it('should enforce parameter', () => {
    const a = of(1, 2, 3).pipe(sample()); // $ExpectError
  });

  it('should accept observable as notifier parameter', () => {
    const a = of(1, 2, 3).pipe(sample(of(4))); // $ExpectType Observable<number>
    const b = of(1, 2, 3).pipe(sample(of('a'))); // $ExpectType Observable<number>
  });

  it('should enforce period parameter', () => {
    const a = of(1, 2, 3).pipe(sampleTime()); // $ExpectError
  });

  it('should infer correctly', () => {
    const a = of(1, 2, 3).pipe(sampleTime(1000)); // $ExpectType Observable<number>
  });

  it('should accept scheduler parameter', () => {
    const a = of(1, 2, 3).pipe(sampleTime(1000, asyncScheduler)); // $ExpectType Observable<number>
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

  it('should enforce compareTo Observable', () => {
    const a = of(1, 2, 3).pipe(sequenceEqual()); // $ExpectError
  });

  it('should infer correctly give compareTo Observable', () => {
    const a = of(1, 2, 3).pipe(sequenceEqual(of(1))); // $ExpectType Observable<boolean>
  });

  it('should enforce compareTo to be the same type of Observable', () => {
    const a = of(1, 2, 3).pipe(sequenceEqual(of('a'))); // $ExpectError
  });

  it('should infer correcly given comparor parameter', () => {
    const a = of(1, 2, 3).pipe(
      sequenceEqual(of(1), (val1, val2) => val1 === val2)
    ); // $ExpectType Observable<boolean>
  });

  it('should infer correctly', () => {
    const o = of('foo', 'bar', 'baz').pipe(share()); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(share('abc')); // $ExpectError
  });

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

  it('should infer correctly', () => {
    const o = of('foo').pipe(single()); // $ExpectType Observable<string>
  });

  it('should support a value', () => {
    const o = of('foo').pipe(single(value => value === 'foo')); // $ExpectType Observable<string>
  });

  it('should support an index', () => {
    const o = of('foo').pipe(single((value, index) => index === 2)); // $Observable<string>
  });

  it('should support a source', () => {
    const o = of('foo').pipe(single((value, index, source) => value === 'foo')); // $Observable<string>
  });

  it('should enforce value type', () => {
    const o = of('foo').pipe(single((value: number) => value === 2)); // $ExpectError
  });

  it('should enforce return type', () => {
    const o = of('foo').pipe(single(value => value)); // $ExpectError
  });

  it('should enforce index type', () => {
    const o = of('foo').pipe(single((value, index: string) => index === '2')); // $ExpectError
  });

  it('should enforce source type', () => {
    const o = of('foo').pipe(
      single((value, index, source: Observable<number>) => value === 'foo')
    ); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('foo', 'bar', 'baz').pipe(skip(7)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skip()); // $ExpectError
    const p = of('foo', 'bar', 'baz').pipe(skip('7')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipLast(7)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipLast()); // $ExpectError
    const p = of('foo', 'bar', 'baz').pipe(skipLast('7')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipUntil(of(4, 'RxJS', 7))); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipUntil()); // $ExpectError
    const p = of('foo', 'bar', 'baz').pipe(skipUntil('7')); // $ExpectError
  });

  it('should support a predicate', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipWhile(value => value === 'bar')); // $ExpectType Observable<string>
  });

  it('should support a predicate with an index', () => {
    const o = of('foo', 'bar', 'baz').pipe(
      skipWhile((value, index) => index < 3)
    ); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipWhile()); // $ExpectError
  });

  it('should enforce predicate types', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipWhile(value => value < 3)); // $ExpectError
    const p = of('foo', 'bar', 'baz').pipe(
      skipWhile((value, index) => index < '3')
    ); // $ExpectError
  });

  it('should enforce predicate return type', () => {
    const o = of('foo', 'bar', 'baz').pipe(skipWhile(value => value)); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn(asyncScheduler)); // $ExpectType Observable<string>
  });

  it('should support a delay ', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn(asyncScheduler, 7)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn()); // $ExpectError
  });

  it('should enforce scheduler type', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn('nope')); // $ExpectError
  });

  it('should enforce delay type', () => {
    const o = of('a', 'b', 'c').pipe(subscribeOn(asyncScheduler, 'nope')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(of(1, 2, 3)).pipe(switchAll()); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(switchAll()); // $ExpectError
  });

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

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(take(7)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(take('7')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(takeLast(7)); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(takeLast('7')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(takeUntil(of(1, 2, 3))); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(takeUntil(value => value < 3)); // $ExpectError
  });

  it('should support a user-defined type guard', () => {
    const o = of('foo').pipe(takeWhile((s): s is 'foo' => true)); // $ExpectType Observable<"foo">
  });

  it('should support a user-defined type guard with inclusive option', () => {
    const o = of('foo').pipe(takeWhile((s): s is 'foo' => true, false)); // $ExpectType Observable<"foo">
  });

  it('should support a predicate', () => {
    const o = of('foo').pipe(takeWhile(s => true)); // $ExpectType Observable<string>
  });

  it('should support a predicate with inclusive option', () => {
    const o = of('foo').pipe(takeWhile(s => true, true)); // $ExpectType Observable<string>
  });

  it('should infer correctly', () => {
    const a = of(1, 2, 3).pipe(tap()); // $ExpectType Observable<number>
  });

  it('should accept partial observer', () => {
    const a = of(1, 2, 3).pipe(tap({next: (x: number) => {}})); // $ExpectType Observable<number>
    const b = of(1, 2, 3).pipe(tap({error: (x: any) => {}})); // $ExpectType Observable<number>
    const c = of(1, 2, 3).pipe(tap({complete: () => {}})); // $ExpectType Observable<number>
  });

  it('should not accept empty observer', () => {
    const a = of(1, 2, 3).pipe(tap({})); // $ExpectError
  });

  it('should enforce type for next observer function', () => {
    const a = of(1, 2, 3).pipe(tap({next: (x: string) => {}})); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(throttle(() => timer(47))); // $ExpectType Observable<number>
  });

  it('should infer correctly with a Promise', () => {
    const o = of(1, 2, 3).pipe(
      throttle(
        () => new Promise<boolean>(() => {})
      )
    ); // $ExpectType Observable<number>
  });

  it('should support a config', () => {
    const o = of(1, 2, 3).pipe(
      throttle(() => timer(47), {leading: true, trailing: true})
    ); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(throttle()); // $ExpectError
    const p = of(1, 2, 3).pipe(throttle(() => {})); // $ExpectError
  });

  it('should enforce config types', () => {
    const o = of(1, 2, 3).pipe(throttle(() => timer(47), {x: 1})); // $ExpectError
    const p = of(1, 2, 3).pipe(
      throttle(() => timer(47), {leading: 1, trailing: 1})
    ); // $ExpectError
    const q = of(1, 2, 3).pipe(throttle(() => timer(47), null)); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(throttleTime(47)); // $ExpectType Observable<number>
  });

  it('should support a scheduler', () => {
    const o = of(1, 2, 3).pipe(throttleTime(47, asyncScheduler)); // $ExpectType Observable<number>
  });

  it('should support a config', () => {
    const o = of(1, 2, 3).pipe(
      throttleTime(47, asyncScheduler, {leading: true, trailing: true})
    ); // $ExpectType Observable<number>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(throttleTime()); // $ExpectError
    const p = of(1, 2, 3).pipe(throttleTime('foo')); // $ExpectError
  });

  it('should enforce scheduler types', () => {
    const o = of(1, 2, 3).pipe(throttleTime(47, null)); // $ExpectError
  });

  it('should enforce config types', () => {
    const o = of(1, 2, 3).pipe(throttleTime(47, asyncScheduler, {x: 1})); // $ExpectError
    const p = of(1, 2, 3).pipe(
      throttleTime(47, asyncScheduler, {leading: 1, trailing: 1})
    ); // $ExpectError
    const q = of(1, 2, 3).pipe(throttleTime(47, asyncScheduler, null)); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(throwIfEmpty()); // $ExpectType Observable<string>
  });

  it('should support an errorFactory', () => {
    const o = of('a', 'b', 'c').pipe(throwIfEmpty(() => 47)); // $ExpectType Observable<string>
  });

  it('should enforce errorFactory type', () => {
    const o = of('a', 'b', 'c').pipe(throwIfEmpty('nope')); // $ExpectError
    const p = of('a', 'b', 'c').pipe(throwIfEmpty(x => 47)); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(timeInterval()); // $ExpectType Observable<TimeInterval<string>>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(timeInterval(asyncScheduler)); // $ExpectType Observable<TimeInterval<string>>
  });

  it('should enforce scheduler type', () => {
    const o = of('a', 'b', 'c').pipe(timeInterval('nope')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(timeout(10)); // $ExpectType Observable<string>
  });

  it('should support a date', () => {
    const o = of('a', 'b', 'c').pipe(timeout(new Date())); // $ExpectType Observable<string>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(timeout(10, asyncScheduler)); // $ExpectType Observable<string>
    const p = of('a', 'b', 'c').pipe(timeout(new Date(), asyncScheduler)); // $ExpectType Observable<string>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(timeout()); // $ExpectError
  });

  it('should enforce types of due', () => {
    const o = of('a', 'b', 'c').pipe(timeout('foo')); // $ExpectError
  });

  it('should enforce types of scheduler', () => {
    const o = of('a', 'b', 'c').pipe(timeout(5, 'foo')); // $ExpectError
  });
  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(10, of(1, 2, 3))); // $ExpectType Observable<string | number>
    const p = of('a', 'b', 'c').pipe(timeoutWith(10, [1, 2, 3])); // $ExpectType Observable<string | number>
    const q = of('a', 'b', 'c').pipe(timeoutWith(10, Promise.resolve(5))); // $ExpectType Observable<string | number>
    const r = of('a', 'b', 'c').pipe(timeoutWith(10, new Set([1, 2, 3]))); // $ExpectType Observable<string | number>
    const s = of('a', 'b', 'c').pipe(timeoutWith(10, 'foo')); // $ExpectType Observable<string>
  });

  it('should infer correctly while having the same types', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(10, of('x', 'y', 'z'))); // $ExpectType Observable<string>
  });

  it('should support a date', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(new Date(), of(1, 2, 3))); // $ExpectType Observable<string | number>
    const p = of('a', 'b', 'c').pipe(timeoutWith(new Date(), [1, 2, 3])); // $ExpectType Observable<string | number>
    const q = of('a', 'b', 'c').pipe(
      timeoutWith(new Date(), Promise.resolve(5))
    ); // $ExpectType Observable<string | number>
    const r = of('a', 'b', 'c').pipe(
      timeoutWith(new Date(), new Set([1, 2, 3]))
    ); // $ExpectType Observable<string | number>
    const s = of('a', 'b', 'c').pipe(timeoutWith(new Date(), 'foo')); // $ExpectType Observable<string>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(
      timeoutWith(10, of(1, 2, 3), asyncScheduler)
    ); // $ExpectType Observable<string | number>
    const p = of('a', 'b', 'c').pipe(
      timeoutWith(new Date(), of(1, 2, 3), asyncScheduler)
    ); // $ExpectType Observable<string | number>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith()); // $ExpectError
  });

  it('should enforce types of due', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith('foo')); // $ExpectError
  });

  it('should enforce types of withObservable', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(10, 10)); // $ExpectError
  });

  it('should enforce types of scheduler', () => {
    const o = of('a', 'b', 'c').pipe(timeoutWith(5, of(1, 2, 3), 'foo')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(time()); // $ExpectType Observable<Stamp<string>>
  });

  it('should support a scheduler', () => {
    const o = of('a', 'b', 'c').pipe(time(asyncScheduler)); // $ExpectType Observable<Stamp<string>>
  });

  it('should enforce scheduler type', () => {
    const o = of('a', 'b', 'c').pipe(time('nope')); // $ExpectError
  });

  it('should infer correctly', () => {
    const o = of(1, 2, 3).pipe(toArray()); // $ExpectType Observable<number[]>
  });

  it('should enforce types', () => {
    const o = of(1).pipe(toArray('')); // $ExpectError
  });

  it('should infer correctly', () => {
    of(1).pipe(window(of('1'))); // $ExpectType Observable<Observable<number>>
  });

  it('should enforce types', () => {
    of(1).pipe(window('')); // $ExpectError
  });

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

  it('should infer correctly', () => {
    const o = of('a', 'b', 'c').pipe(windowWhen(() => of(1, 2, 3))); // $ExpectType Observable<Observable<string>>
  });

  it('should enforce types', () => {
    const o = of('a', 'b', 'c').pipe(windowWhen()); // $ExpectError
  });

  it('should enforce closingSelector type', () => {
    const o = of('a', 'b', 'c').pipe(windowWhen('nope')); // $ExpectError
  });

  describe('withLatestFrom', () => {
    describe('without project parameter', () => {
      it('should infer correctly with 1 param', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const res = a.pipe(withLatestFrom(b)); // $ExpectType Observable<[number, string]>
      });

      it('should infer correctly with 2 params', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const c = of('d', 'e', 'f');
        const res = a.pipe(withLatestFrom(b, c)); // $ExpectType Observable<[number, string, string]>
      });

      it('should infer correctly with 3 params', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const c = of('d', 'e', 'f');
        const d = of('g', 'h', 'i');
        const res = a.pipe(withLatestFrom(b, c, d)); // $ExpectType Observable<[number, string, string, string]>
      });

      it('should infer correctly with 4 params', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const c = of('d', 'e', 'f');
        const d = of('g', 'h', 'i');
        const e = of('j', 'k', 'l');
        const res = a.pipe(withLatestFrom(b, c, d, e)); // $ExpectType Observable<[number, string, string, string, string]>
      });

      it('should infer correctly with 5 params', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const c = of('d', 'e', 'f');
        const d = of('g', 'h', 'i');
        const e = of('j', 'k', 'l');
        const f = of('m', 'n', 'o');
        const res = a.pipe(withLatestFrom(b, c, d, e, f)); // $ExpectType Observable<[number, string, string, string, string, string]>
      });

      it('should only accept maximum params of 5', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const c = of('d', 'e', 'f');
        const d = of('g', 'h', 'i');
        const e = of('j', 'k', 'l');
        const f = of('m', 'n', 'o');
        const g = of('p', 'q', 'r');
        const res = a.pipe(withLatestFrom(b, c, d, e, f, g)); // $ExpectType Observable<unknown>
      });
    });

    describe('with project parameter', () => {
      it('should infer correctly with project param', () => {
        const a = of(1, 2, 3);
        const res = a.pipe(withLatestFrom(v1 => 'b')); // $ExpectType Observable<string>
      });

      it('should infer correctly with 1 param', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const res = a.pipe(withLatestFrom(b, (a, b) => b)); // $ExpectType Observable<string>
      });

      it('should infer correctly with 2 params', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const c = of('d', 'e', 'f');
        const res = a.pipe(withLatestFrom(b, c, (a, b, c) => b + c)); // $ExpectType Observable<string>
      });

      it('should infer correctly with 3 params', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const c = of('d', 'e', 'f');
        const d = of('g', 'h', 'i');
        const ref = a.pipe(withLatestFrom(b, c, d, (a, b, c, d) => b + c)); // $ExpectType Observable<string>
      });

      it('should infer correctly with 4 params', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const c = of('d', 'e', 'f');
        const d = of('g', 'h', 'i');
        const e = of('j', 'k', 'l');
        const res = a.pipe(
          withLatestFrom(b, c, d, e, (a, b, c, d, e) => b + c)
        ); // $ExpectType Observable<string>
      });

      it('should infer correctly with 5 params', () => {
        const a = of(1, 2, 3);
        const b = of('a', 'b', 'c');
        const c = of('d', 'e', 'f');
        const d = of('g', 'h', 'i');
        const e = of('j', 'k', 'l');
        const f = of('m', 'n', 'o');
        const res = a.pipe(
          withLatestFrom(b, c, d, e, f, (a, b, c, d, e, f) => b + c)
        ); // $ExpectType Observable<string>
      });
    });
  });
});
