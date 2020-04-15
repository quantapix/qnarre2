import {
  Observable,
  ObservedValueOf,
  ObservedUnionFrom,
  ObservedTupleFrom,
  Unshift
} from 'rxjs';
import {A, B, C} from './spec/helpers/helpers';

describe('ObservedValueOf', () => {
  it('should infer from an observable', () => {
    let explicit: ObservedValueOf<Observable<A>>;
    let inferred = explicit!; // $ExpectType A
  });

  it('should infer from an array', () => {
    let explicit: ObservedValueOf<A[]>;
    let inferred = explicit!; // $ExpectType A
  });

  it('should infer from a promise', () => {
    let explicit: ObservedValueOf<Promise<A>>;
    let inferred = explicit!; // $ExpectType A
  });
});

describe('ObservedUnionFrom', () => {
  it('should infer from an array of observables', () => {
    let explicit: ObservedUnionFrom<[Observable<A>, Observable<B>]>;
    let inferred = explicit!; // $ExpectType A | B
  });

  it('should infer from an array of arrays', () => {
    let explicit: ObservedUnionFrom<[A[], B[]]>;
    let inferred = explicit!; // $ExpectType A | B
  });

  it('should infer from an array of promises', () => {
    let explicit: ObservedUnionFrom<[Promise<A>, Promise<B>]>;
    let inferred = explicit!; // $ExpectType A | B
  });
});

describe('ObservedTupleFrom', () => {
  it('should infer from an array of observables', () => {
    let explicit: ObservedTupleFrom<[Observable<A>, Observable<B>]>;
    let inferred = explicit!; // $ExpectType [A, B]
  });

  it('should infer from an array of arrays', () => {
    let explicit: ObservedTupleFrom<[A[], B[]]>;
    let inferred = explicit!; // $ExpectType [A, B]
  });

  it('should infer from an array of promises', () => {
    let explicit: ObservedTupleFrom<[Promise<A>, Promise<B>]>;
    let inferred = explicit!; // $ExpectType [A, B]
  });
});

describe('Unshift', () => {
  it('should add the type to the beginning of the tuple', () => {
    let tuple: ObservedTupleFrom<[Observable<A>, Observable<B>]>;
    let explicit: Unshift<typeof tuple, C>;
    let inferred = explicit!; // $ExpectType [C, A, B]
  });
});
