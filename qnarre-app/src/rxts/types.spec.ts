import * as qt from './types';
import {A, B, C} from './spec/helpers';

describe('Sourced', () => {
  it('should infer from an observable', () => {
    const e = {} as qt.Sourced<qt.Source<A, any, boolean>>;
    expect(typeof e).toBe(typeof A);
  });
  it('should infer from an array', () => {
    const e = {} as qt.Sourced<A[]>;
    expect(typeof e).toBe(typeof A);
  });
  it('should infer from a promise', () => {
    const e = {} as qt.Sourced<Promise<A>>;
    expect(typeof e).toBe(typeof A);
  });
});

describe('SourcedFrom', () => {
  it('should infer from an array of observables', () => {
    const e = {} as qt.SourcedFrom<
      [qt.Source<A, any, boolean>, qt.Source<B, any, boolean>]
    >;
    expect(typeof e).toBe(typeof (A | B));
  });
  it('should infer from an array of arrays', () => {
    const e = {} as qt.SourcedFrom<[A[], B[]]>;
    expect(typeof e).toBe(typeof (A | B));
  });
  it('should infer from an array of promises', () => {
    const e = {} as qt.SourcedFrom<[Promise<A>, Promise<B>]>;
    expect(typeof e).toBe(typeof (A | B));
  });
});

describe('SourcedTuple', () => {
  it('should infer from an array of observables', () => {
    const e = {} as qt.SourcedTuple<
      [qt.Source<A, any, boolean>, qt.Source<B, any, boolean>]
    >;
    expect(typeof e).toBe(typeof [A, B]);
  });
  it('should infer from an array of arrays', () => {
    const e = {} as qt.SourcedTuple<[A[], B[]]>;
    expect(typeof e).toBe(typeof [A, B]);
  });
  it('should infer from an array of promises', () => {
    const e = {} as qt.SourcedTuple<[Promise<A>, Promise<B>]>;
    expect(typeof e).toBe(typeof [A, B]);
  });
});

describe('Unshift', () => {
  it('should add the type to the beginning of the tuple', () => {
    let tuple: qt.SourcedTuple<[
      qt.Source<A, any, boolean>,
      qt.Source<B, any, boolean>
    ]>;
    const e = {} as qt.Unshift<typeof tuple, C>;
    expect(typeof e).toBe(typeof [C, A, B]);
  });
});
