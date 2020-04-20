import {of, NEVER} from 'rxjs';
import {audit} from 'rxjs/operators';

describe('xxx', () => {


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
    const o = of(1, 2, 3).pipe(isEmpty()); // $ExpectType Observable<boolean>
  });

  it('should enforce types', () => {
    const o = of(1, 2, 3).pipe(isEmpty('nope')); // $ExpectError
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
