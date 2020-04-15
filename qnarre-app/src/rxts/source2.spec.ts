import {bindCallback} from 'rxjs';
import {a, b, c, d, e, f, g, A, B, C, D, E, F, G} from '../helpers';
import {SchedulerLike} from '../../src';
import {combineLatest} from 'rxjs';
import {from, of, animationFrameScheduler} from 'rxjs';

describe('callbackFunc', () => {
  const f0 = (cb: () => any) => {
    cb();
  };

  const f1 = (cb: (res1: A) => any) => {
    cb(a);
  };

  const f2 = (cb: (res1: A, res2: B) => any) => {
    cb(a, b);
  };

  const f3 = (cb: (res1: A, res2: B, res3: C) => any) => {
    cb(a, b, c);
  };

  const f4 = (cb: (res1: A, res2: B, res3: C, res4: D) => any) => {
    cb(a, b, c, d);
  };

  it('should enforce function parameter', () => {
    const o = bindCallback(); // $ExpectError
  });

  it('should accept cb 0 param', () => {
    const o = bindCallback(f0); // $ExpectType () => Observable<void>
  });

  it('should accept cb 1 param', () => {
    const o = bindCallback(f1); // $ExpectType () => Observable<A>
  });

  it('should accept cb 2 params', () => {
    const o = bindCallback(f2); // $ExpectType () => Observable<[A, B]>
  });

  it('should accept cb 3 params', () => {
    const o = bindCallback(f3); // $ExpectType () => Observable<[A, B, C]>
  });

  it('should accept cb 4 params', () => {
    const o = bindCallback(f4); // $ExpectType () => Observable<any[]>
  });
});

describe('callbackFunc and 1 args', () => {
  const fa1cb0 = (e: E, cb: () => any) => {
    cb();
  };

  const fa1cb1 = (e: E, cb: (res1: A) => any) => {
    cb(a);
  };

  const fa1cb2 = (e: E, cb: (res1: A, res2: B) => any) => {
    cb(a, b);
  };

  const fa1cb3 = (e: E, cb: (res1: A, res2: B, res3: C) => any) => {
    cb(a, b, c);
  };

  const fa1cb4 = (e: E, cb: (res1: A, res2: B, res3: C, res4: D) => any) => {
    cb(a, b, c, d);
  };

  it('should accept cb 0 param', () => {
    const o = bindCallback(fa1cb0); // $ExpectType (arg1: E) => Observable<void>
  });

  it('should accept cb 1 param', () => {
    const o = bindCallback(fa1cb1); // $ExpectType (arg1: E) => Observable<A>
  });

  it('should accept cb 2 param', () => {
    const o = bindCallback(fa1cb2); // $ExpectType (arg1: E) => Observable<[A, B]>
  });

  it('should accept cb 3 param', () => {
    const o = bindCallback(fa1cb3); // $ExpectType (arg1: E) => Observable<[A, B, C]>
  });

  it('should accept cb 4 param', () => {
    const o = bindCallback(fa1cb4); // $ExpectType (arg1: E) => Observable<any[]>
  });
});

describe('callbackFunc and 2 args', () => {
  const fa2cb0 = (e: E, f: F, cb: () => any) => {
    cb();
  };

  const fa2cb1 = (e: E, f: F, cb: (res1: A) => any) => {
    cb(a);
  };

  const fa2cb2 = (e: E, f: F, cb: (res1: A, res2: B) => any) => {
    cb(a, b);
  };

  const fa2cb3 = (e: E, f: F, cb: (res1: A, res2: B, res3: C) => any) => {
    cb(a, b, c);
  };

  const fa2cb4 = (
    e: E,
    f: F,
    cb: (res1: A, res2: B, res3: C, res4: D) => any
  ) => {
    cb(a, b, c, d);
  };

  it('should accept cb 0 param', () => {
    const o = bindCallback(fa2cb0); // $ExpectType (arg1: E, arg2: F) => Observable<void>
  });

  it('should accept cb 1 param', () => {
    const o = bindCallback(fa2cb1); // $ExpectType (arg1: E, arg2: F) => Observable<A>
  });

  it('should accept cb 2 param', () => {
    const o = bindCallback(fa2cb2); // $ExpectType (arg1: E, arg2: F) => Observable<[A, B]>
  });

  it('should accept cb 3 param', () => {
    const o = bindCallback(fa2cb3); // $ExpectType (arg1: E, arg2: F) => Observable<[A, B, C]>
  });

  it('should accept cb 4 param', () => {
    const o = bindCallback(fa2cb4); // $ExpectType (arg1: E, arg2: F) => Observable<any[]>
  });
});

describe('callbackFunc and 3 args', () => {
  const fa3cb0 = (e: E, f: F, g: G, cb: () => any) => {
    cb();
  };

  const fa3cb1 = (e: E, f: F, g: G, cb: (res1: A) => any) => {
    cb(a);
  };

  const fa3cb2 = (e: E, f: F, g: G, cb: (res1: A, res2: B) => any) => {
    cb(a, b);
  };

  const fa3cb3 = (e: E, f: F, g: G, cb: (res1: A, res2: B, res3: C) => any) => {
    cb(a, b, c);
  };

  const fa3cb4 = (
    e: E,
    f: F,
    g: G,
    cb: (res1: A, res2: B, res3: C, res4: D) => any
  ) => {
    cb(a, b, c, d);
  };

  it('should accept cb 0 param', () => {
    const o = bindCallback(fa3cb0); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<void>
  });

  it('should accept cb 1 param', () => {
    const o = bindCallback(fa3cb1); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<A>
  });

  it('should accept cb 2 params', () => {
    const o = bindCallback(fa3cb2); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<[A, B]>
  });

  it('should accept cb 3 params', () => {
    const o = bindCallback(fa3cb3); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<[A, B, C]>
  });

  it('should accept cb 4 params', () => {
    const o = bindCallback(fa3cb4); // $ExpectType (arg1: E, arg2: F, arg3: G) => Observable<any[]>
  });
});

describe('callbackFunc and 4 args', () => {
  const fa4cb0 = (e: E, f: F, g: G, a: A, cb: () => any) => {
    cb();
  };

  const fa4cb1 = (e: E, f: F, g: G, a: A, cb: (res1: A) => any) => {
    cb(a);
  };

  const fa4cb2 = (e: E, f: F, g: G, a: A, cb: (res1: A, res2: B) => any) => {
    cb(a, b);
  };

  const fa4cb3 = (
    e: E,
    f: F,
    g: G,
    a: A,
    cb: (res1: A, res2: B, res3: C) => any
  ) => {
    cb(a, b, c);
  };

  const fa4cb4 = (
    e: E,
    f: F,
    g: G,
    a: A,
    cb: (res1: A, res2: B, res3: C, res4: D) => any
  ) => {
    cb(a, b, c, d);
  };

  it('should accept cb 0 param', () => {
    const o = bindCallback(fa4cb0); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<void>
  });

  it('should accept cb 0 param', () => {
    const o = bindCallback(fa4cb1); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<A>
  });

  it('should accept cb 2 params', () => {
    const o = bindCallback(fa4cb2); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<[A, B]>
  });

  it('should accept cb 3 params', () => {
    const o = bindCallback(fa4cb3); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<[A, B, C]>
  });

  it('should accept cb 4 params', () => {
    const o = bindCallback(fa4cb4); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A) => Observable<any[]>
  });
});

describe('callbackFunc and 5 args', () => {
  const fa5cb0 = (e: E, f: F, g: G, a: A, b: B, cb: () => any) => {
    cb();
  };

  const fa5cb1 = (e: E, f: F, g: G, a: A, b: B, cb: (res1: A) => any) => {
    cb(a);
  };

  const fa5cb2 = (
    e: E,
    f: F,
    g: G,
    a: A,
    b: B,
    cb: (res1: A, res2: B) => any
  ) => {
    cb(a, b);
  };

  const fa5cb3 = (
    e: E,
    f: F,
    g: G,
    a: A,
    b: B,
    cb: (res1: A, res2: B, res3: C) => any
  ) => {
    cb(a, b, c);
  };

  const fa5cb4 = (
    e: E,
    f: F,
    g: G,
    a: A,
    b: B,
    cb: (res1: A, res2: B, res3: C, res4: D) => any
  ) => {
    cb(a, b, c, d);
  };

  it('should accept cb 0 param', () => {
    const o = bindCallback(fa5cb0); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<void>
  });

  it('should accept cb 0 param', () => {
    const o = bindCallback(fa5cb1); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<A>
  });

  it('should accept cb 2 params', () => {
    const o = bindCallback(fa5cb2); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<[A, B]>
  });

  it('should accept cb 3 params', () => {
    const o = bindCallback(fa5cb3); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<[A, B, C]>
  });

  it('should accept cb 4 params', () => {
    const o = bindCallback(fa5cb4); // $ExpectType (arg1: E, arg2: F, arg3: G, arg4: A, arg5: B) => Observable<any[]>
  });
});

describe('callbackFunc: Function type', () => {
  const fn: Function = () => {};

  it('should accept Function', () => {
    const o = bindCallback(fn); // $ExpectType (...args: any[]) => Observable<any>
  });
});

describe('xxx', () => {
  it('should accept 1 param', () => {
    const o = combineLatest(a$); // $ExpectType Observable<[A]>
  });

  it('should accept 2 params', () => {
    const o = combineLatest(a$, b$); // $ExpectType Observable<[A, B]>
  });

  it('should accept 3 params', () => {
    const o = combineLatest(a$, b$, c$); // $ExpectType Observable<[A, B, C]>
  });

  it('should accept 4 params', () => {
    const o = combineLatest(a$, b$, c$, d$); // $ExpectType Observable<[A, B, C, D]>
  });

  it('should accept 5 params', () => {
    const o = combineLatest(a$, b$, c$, d$, e$); // $ExpectType Observable<[A, B, C, D, E]>
  });

  it('should accept 6 params', () => {
    const o = combineLatest(a$, b$, c$, d$, e$, f$); // $ExpectType Observable<[A, B, C, D, E, F]>
  });

  it('should result in Observable<unknown> for 7 or more params', () => {
    const o = combineLatest(a$, b$, c$, d$, e$, f$, g$); // $ExpectType Observable<unknown>
  });

  it('should accept union types', () => {
    const u1: typeof a$ | typeof b$ = Math.random() > 0.5 ? a$ : b$;
    const u2: typeof c$ | typeof d$ = Math.random() > 0.5 ? c$ : d$;
    const o = combineLatest(u1, u2); // $ExpectType Observable<[A | B, C | D]>
  });

  it('should accept 1 param and a result selector', () => {
    const o = combineLatest(a$, () => new A()); // $ExpectType Observable<A>
  });

  it('should accept 2 params and a result selector', () => {
    const o = combineLatest(a$, b$, () => new A()); // $ExpectType Observable<A>
  });

  it('should accept 3 params and a result selector', () => {
    const o = combineLatest(a$, b$, c$, () => new A()); // $ExpectType Observable<A>
  });

  it('should accept 4 params and a result selector', () => {
    const o = combineLatest(a$, b$, c$, d$, () => new A()); // $ExpectType Observable<A>
  });

  it('should accept 5 params and a result selector', () => {
    const o = combineLatest(a$, b$, c$, d$, e$, () => new A()); // $ExpectType Observable<A>
  });

  it('should accept 6 params and a result selector', () => {
    const o = combineLatest(a$, b$, c$, d$, e$, f$, () => new A()); // $ExpectType Observable<A>
  });

  it('should accept 7 or more params and a result selector', () => {
    const o = combineLatest(a$, b$, c$, d$, e$, f$, g$, g$, g$, () => new A()); // $ExpectType Observable<A>
  });

  it('should accept 1 param', () => {
    const o = combineLatest([a$]); // $ExpectType Observable<[A]>
  });

  it('should accept 2 params', () => {
    const o = combineLatest([a$, b$]); // $ExpectType Observable<[A, B]>
  });

  it('should accept 3 params', () => {
    const o = combineLatest([a$, b$, c$]); // $ExpectType Observable<[A, B, C]>
  });

  it('should accept 4 params', () => {
    const o = combineLatest([a$, b$, c$, d$]); // $ExpectType Observable<[A, B, C, D]>
  });

  it('should accept 5 params', () => {
    const o = combineLatest([a$, b$, c$, d$, e$]); // $ExpectType Observable<[A, B, C, D, E]>
  });

  it('should accept 6 params', () => {
    const o = combineLatest([a$, b$, c$, d$, e$, f$]); // $ExpectType Observable<[A, B, C, D, E, F]>
  });

  it('should have basic support for 7 or more params', () => {
    const o = combineLatest([a$, b$, c$, d$, e$, f$, g$]); // $ExpectType Observable<(A | B | C | D | E | F | G)[]>
  });

  it('should handle an array of Observables', () => {
    const o = combineLatest([a$, a$, a$, a$, a$, a$, a$, a$, a$, a$, a$]); // $ExpectType Observable<A[]>
  });

  it('should accept 1 param and a result selector', () => {
    const o = combineLatest([a$], (a: A) => new A()); // $ExpectType Observable<A>
  });

  it('should accept 2 params and a result selector', () => {
    const o = combineLatest([a$, b$], (a: A, b: B) => new A()); // $ExpectType Observable<A>
  });

  it('should accept 3 params and a result selector', () => {
    const o = combineLatest([a$, b$, c$], (a: A, b: B, c: C) => new A()); // $ExpectType Observable<A>
  });

  it('should accept 4 params and a result selector', () => {
    const o = combineLatest(
      [a$, b$, c$, d$],
      (a: A, b: B, c: C, d: D) => new A()
    ); // $ExpectType Observable<A>
  });

  it('should accept 5 params and a result selector', () => {
    const o = combineLatest(
      [a$, b$, c$, d$, e$],
      (a: A, b: B, c: C, d: D, e: E) => new A()
    ); // $ExpectType Observable<A>
  });

  it('should accept 6 params and a result selector', () => {
    const o = combineLatest(
      [a$, b$, c$, d$, e$, f$],
      (a: A, b: B, c: C, d: D, e: E, f: F) => new A()
    ); // $ExpectType Observable<A>
  });

  it('should accept 7 or more params and a result selector', () => {
    const o = combineLatest(
      [a$, b$, c$, d$, e$, f$, g$, g$, g$],
      (
        a: any,
        b: any,
        c: any,
        d: any,
        e: any,
        f: any,
        g1: any,
        g2: any,
        g3: any
      ) => new A()
    ); // $ExpectType Observable<A>
  });
  import {of, concat, asyncScheduler} from 'rxjs';

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
  import {of, defer} from 'rxjs';

  it('should enforce function parameter', () => {
    const a = defer(); // $ExpectError
  });

  it('should infer correctly with function return observable', () => {
    const a = defer(() => of(1, 2, 3)); // $ExpectType Observable<number>
  });

  it('should infer correctly with function return promise', () => {
    const a = defer(() => Promise.resolve(5)); // $ExpectType Observable<number>
  });

  it('should support union type returns', () => {
    const a = defer(() => (Math.random() > 0.5 ? of(123) : of('abc'))); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with void functions', () => {
    const a = defer(() => {}); // $ExpectType Observable<never>
  });

  it('should error if an ObservableInput is not returned', () => {
    const a = defer(() => 42); // $ExpectError
  });

  it('should infer correctly with functions that sometimes do not return an ObservableInput', () => {
    const a = defer(() => {
      if (Math.random() < 0.5) {
        return of(42);
      }
    }); // $ExpectType Observable<number>
  });
  import {of, empty, animationFrameScheduler, EMPTY} from 'rxjs';

  it('should infer correctly with no parameter', () => {
    const a = empty(); // $ExpectType Observable<never>
  });

  it('should support scheduler parameter', () => {
    const a = empty(animationFrameScheduler); // $ExpectType Observable<never>
  });

  it('should always infer empty observable', () => {
    // Empty Observable that replace empty static function
    const a = EMPTY; // $ExpectType Observable<never>
  });
});

describe('deprecated rest args', () => {
  it('should infer correctly with 1 parameter', () => {
    const a = of(1, 2, 3);
    const res = forkJoin(a); // $ExpectType Observable<[number]>
  });

  it('should infer correctly with 2 parameters', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const res = forkJoin(a, b); // $ExpectType Observable<[number, string]>
  });

  it('should infer correctly with 3 parameters', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const c = of(1, 2, 3);
    const res = forkJoin(a, b, c); // $ExpectType Observable<[number, string, number]>
  });

  it('should infer correctly with 4 parameters', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const c = of(1, 2, 3);
    const d = of(1, 2, 3);
    const res = forkJoin(a, b, c, d); // $ExpectType Observable<[number, string, number, number]>
  });

  it('should infer correctly with 5 parameters', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const c = of(1, 2, 3);
    const d = of(1, 2, 3);
    const e = of(1, 2, 3);
    const res = forkJoin(a, b, c, d, e); // $ExpectType Observable<[number, string, number, number, number]>
  });

  it('should infer correctly with 6 parameters', () => {
    const a = of(1, 2, 3);
    const b = of('a', 'b', 'c');
    const c = of(1, 2, 3);
    const d = of(1, 2, 3);
    const e = of(1, 2, 3);
    const f = of(1, 2, 3);
    const res = forkJoin(a, b, c, d, e, f); // $ExpectType Observable<[number, string, number, number, number, number]>
  });
});

it('should infer of type any for more than 6 parameters', () => {
  const a = of(1, 2, 3);
  const b = of('a', 'b', 'c');
  const c = of(1, 2, 3);
  const d = of(1, 2, 3);
  const e = of(1, 2, 3);
  const f = of(1, 2, 3);
  const g = of(1, 2, 3);
  const res = forkJoin(a, b, c, d, e, f, g); // $ExpectType Observable<any>
});

describe('forkJoin({})', () => {
  it('should properly type empty objects', () => {
    const res = forkJoin({}); // $ExpectType Observable<never>
  });

  it('should work for the simple case', () => {
    const res = forkJoin({foo: of(1), bar: of('two'), baz: of(false)}); // $ExpectType Observable<{ foo: number; bar: string; baz: boolean; }>
  });
});

describe('forkJoin([])', () => {
  // TODO(benlesh): Uncomment for TS 3.0
  // it('should properly type empty arrays', () => {
  //   const res = forkJoin([]); // $ExpectType Observable<never>
  // });

  it('should infer correctly for array of 1 observable', () => {
    const res = forkJoin([of(1, 2, 3)]); // $ExpectType Observable<[number]>
  });

  it('should infer correctly for array of 2 observables', () => {
    const res = forkJoin([of(1, 2, 3), of('a', 'b', 'c')]); // $ExpectType Observable<[number, string]>
  });

  it('should infer correctly for array of 3 observables', () => {
    const res = forkJoin([
      of(1, 2, 3),
      of('a', 'b', 'c'),
      of(true, true, false)
    ]); // $ExpectType Observable<[number, string, boolean]>
  });

  it('should infer correctly for array of 4 observables', () => {
    const res = forkJoin([
      of(1, 2, 3),
      of('a', 'b', 'c'),
      of(1, 2, 3),
      of(1, 2, 3)
    ]); // $ExpectType Observable<[number, string, number, number]>
  });

  it('should infer correctly for array of 5 observables', () => {
    const res = forkJoin([
      of(1, 2, 3),
      of('a', 'b', 'c'),
      of(1, 2, 3),
      of(1, 2, 3),
      of(1, 2, 3)
    ]); // $ExpectType Observable<[number, string, number, number, number]>
  });

  it('should infer correctly for array of 6 observables', () => {
    const res = forkJoin([
      of(1, 2, 3),
      of('a', 'b', 'c'),
      of(1, 2, 3),
      of(1, 2, 3),
      of(1, 2, 3),
      of(1, 2, 3)
    ]); // $ExpectType Observable<[number, string, number, number, number, number]>
  });

  it('should force user cast for array of 6+ observables', () => {
    const res = forkJoin([
      of(1, 2, 3),
      of('a', 'b', 'c'),
      of(1, 2, 3),
      of(1, 2, 3),
      of(1, 2, 3),
      of(1, 2, 3),
      of(1, 2, 3)
    ]); // $ExpectType Observable<(string | number)[]>
  });
});

describe('xxx', () => {
  it('should accept an array', () => {
    const o = from([1, 2, 3, 4]); // $ExpectType Observable<number>
  });

  it('should accept a Promise', () => {
    const o = from(Promise.resolve('test')); // $ExpectType Observable<string>
  });

  it('should accept an Iterable', () => {
    const iterable = (function* () {
      yield 42;
    })();

    const o = from(iterable); // $ExpectType Observable<number>
  });

  it('should accept an Observable', () => {
    const o = from(of('test')); // $ExpectType Observable<string>
  });

  it('should accept union types', () => {
    const o = from(Math.random() > 0.5 ? of(123) : of('test')); // $ExpectType Observable<string | number>
  });

  it('should accept Observable<Observable<number>>', () => {
    const o = from(of(of(123))); // $ExpectType Observable<Observable<number>>
  });

  it('should accept Observable<number[]>', () => {
    const o = from(of([1, 2, 3])); // $ExpectType Observable<number[]>
  });

  it('should accept an array of Observables', () => {
    const o = from([of(1), of(2), of(3)]); // $ExpectType Observable<Observable<number>>
  });

  it('should support scheduler', () => {
    const a = from([1, 2, 3], animationFrameScheduler); // $ExpectType Observable<number>
  });
});

describe('xxx', () => {
  it('should accept function as first parameter', () => {
    const a = iif(() => false); // $ExpectType Observable<never>
  });

  it('should infer correctly with 2 parameters', () => {
    const a = iif(() => false, of(1)); // $ExpectType Observable<number>
  });

  it('should infer correctly with 3 parameters', () => {
    const a = iif(() => false, of(1), of(2)); // $ExpectType Observable<number>
  });

  it('should infer correctly with 3 parameters of different types', () => {
    const a = iif(() => false, of(1), of('a')); // $ExpectType Observable<string | number>
  });

  it('should infer correctly with number param', () => {
    const a = interval(1); // $ExpectType Observable<number>
  });

  it('should infer correctly with no param', () => {
    const a = interval(); // $ExpectType Observable<number>
  });

  it('should support scheduler', () => {
    const a = interval(1, animationFrameScheduler); // $ExpectType Observable<number>
  });
  import {never} from 'rxjs';

  it('should not support any parameter', () => {
    const a = never(1); // $ExpectError
  });

  it('should infer never', () => {
    const a = never(); // $ExpectType Observable<never>
  });

  it('should infer never with 0 params', () => {
    const res = of(); // $ExpectType Observable<never>
  });

  it('forced generic should not cause an issue', () => {
    const x: any = null;
    const res = of<string>(); // $ExpectType Observable<string>
    const res2 = of<string>(x); // $ExpectType Observable<string>
  });

  it('should infer correctly with 1 param', () => {
    const res = of(a); // $ExpectType Observable<A>
  });

  it('should infer correctly with mixed type of 2 params', () => {
    const res = of(a, b); // $ExpectType Observable<A | B>
  });

  it('should infer correctly with mixed type of 3 params', () => {
    const res = of(a, b, c); // $ExpectType Observable<A | B | C>
  });

  it('should infer correctly with mixed type of 4 params', () => {
    const res = of(a, b, c, d); // $ExpectType Observable<A | B | C | D>
  });

  it('should infer correctly with mixed type of 5 params', () => {
    const res = of(a, b, c, d, e); // $ExpectType Observable<A | B | C | D | E>
  });

  it('should infer correctly with mixed type of 6 params', () => {
    const res = of(a, b, c, d, e, f); // $ExpectType Observable<A | B | C | D | E | F>
  });

  it('should infer correctly with mixed type of 7 params', () => {
    const res = of(a, b, c, d, e, f, g); // $ExpectType Observable<A | B | C | D | E | F | G>
  });

  it('should infer correctly with mixed type of 8 params', () => {
    const res = of(a, b, c, d, e, f, g, h); // $ExpectType Observable<A | B | C | D | E | F | G | H>
  });

  it('should infer correctly with mixed type of 9 params', () => {
    const res = of(a, b, c, d, e, f, g, h, i); // $ExpectType Observable<A | B | C | D | E | F | G | H | I>
  });

  it('should infer correctly with mono type of more than 9 params', () => {
    const res = of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10); // $ExpectType Observable<number>
  });

  it('should support mixed type of 9 params', () => {
    const res = of(a, b, c, d, e, f, g, h, i, j); // $ExpectType Observable<A | B | C | D | E | F | G | H | I | J>
  });

  it('should support mixed type of 13 params', () => {
    const res = of(a, b, c, d, e, f, g, h, i, j, '', true, 123, 10n); // $ExpectType Observable<string | number | bigint | boolean | A | B | C | D | E | F | G | H | I | J>
  });

  it('should support a rest of params', () => {
    const arr = [a, b, c, d, e, f, g, h, i, j];
    const res = of(...arr); // $ExpectType Observable<A | B | C | D | E | F | G | H | I | J>

    const arr2 = ['test', 123, a];
    const res2 = of(...arr2); // $ExpectType Observable<string | number | A>

    const res3 = of(b, ...arr2, c, true); // $ExpectType Observable<string | number | boolean | A | B | C>
  });

  it('should support scheduler', () => {
    const res = of(a, animationFrameScheduler); // $ExpectType Observable<A>
  });

  it('should infer correctly with array', () => {
    const res = of([a, b, c]); // $ExpectType Observable<(A | B | C)[]>
  });

  // SchedulerLike inclusions (remove in v8)
  it('should infer never with 0 params', () => {
    const res = of(queueScheduler); // $ExpectType Observable<never>
  });

  it('should infer correctly with 1 param', () => {
    const res = of(a, queueScheduler); // $ExpectType Observable<A>
  });

  it('should infer correctly with mixed type of 2 params', () => {
    const res = of(a, b, queueScheduler); // $ExpectType Observable<A | B>
  });

  it('should infer correctly with mixed type of 3 params', () => {
    const res = of(a, b, c, queueScheduler); // $ExpectType Observable<A | B | C>
  });

  it('should infer correctly with mixed type of 4 params', () => {
    const res = of(a, b, c, d, queueScheduler); // $ExpectType Observable<A | B | C | D>
  });

  it('should infer correctly with mixed type of 5 params', () => {
    const res = of(a, b, c, d, e, queueScheduler); // $ExpectType Observable<A | B | C | D | E>
  });

  it('should infer correctly with mixed type of 6 params', () => {
    const res = of(a, b, c, d, e, f, queueScheduler); // $ExpectType Observable<A | B | C | D | E | F>
  });

  it('should infer correctly with mixed type of 7 params', () => {
    const res = of(a, b, c, d, e, f, g, queueScheduler); // $ExpectType Observable<A | B | C | D | E | F | G>
  });

  it('should infer correctly with mixed type of 8 params', () => {
    const res = of(a, b, c, d, e, f, g, h, queueScheduler); // $ExpectType Observable<A | B | C | D | E | F | G | H>
  });

  it('should infer correctly with mixed type of 9 params', () => {
    const res = of(a, b, c, d, e, f, g, h, i, queueScheduler); // $ExpectType Observable<A | B | C | D | E | F | G | H | I>
  });

  it('should deprecate correctly', () => {
    of(queueScheduler); // $ExpectDeprecation
    of(a, queueScheduler); // $ExpectDeprecation
    of(a, b, queueScheduler); // $ExpectDeprecation
    of(a, b, c, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, f, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, f, g, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, f, g, h, queueScheduler); // $ExpectDeprecation
    of(a, b, c, d, e, f, g, h, i, queueScheduler); // $ExpectDeprecation
    of<A>(); // $ExpectDeprecation
    of(); // $ExpectNoDeprecation
    of(a); // $ExpectNoDeprecation
    of(a, b); // $ExpectNoDeprecation
    of(a, b, c); // $ExpectNoDeprecation
    of(a, b, c, d); // $ExpectNoDeprecation
  });
  import {of, partition} from 'rxjs';

  it('should infer correctly', () => {
    const o = partition(of('a', 'b', 'c'), (value, index) => true); // $ExpectType [Observable<string>, Observable<string>]
    const p = partition(of('a', 'b', 'c'), () => true); // $ExpectType [Observable<string>, Observable<string>]
  });

  it('should accept a thisArg parameter', () => {
    const o = partition(of('a', 'b', 'c'), () => true, 5); // $ExpectType [Observable<string>, Observable<string>]
  });

  it('should enforce predicate', () => {
    const o = partition(of('a', 'b', 'c')); // $ExpectError
  });

  it('should enforce predicate types', () => {
    const o = partition(of('a', 'b', 'c'), 'nope'); // $ExpectError
    const p = partition(of('a', 'b', 'c'), (value: number) => true); // $ExpectError
    const q = partition(of('a', 'b', 'c'), (value, index: string) => true); // $ExpectError
  });
});

describe('race(a, b, c)', () => {
  it('should support N arguments of different types', () => {
    const o1 = race(a$); // $ExpectType Observable<A>
    const o2 = race(a$, b$); // $ExpectType Observable<A | B>
    const o3 = race(a$, b$, c$); // $ExpectType Observable<A | B | C>
    const o4 = race(a$, b$, c$, d$); // $ExpectType Observable<A | B | C | D>
    const o5 = race(a$, b$, c$, d$, e$); // $ExpectType Observable<A | B | C | D | E>
    const o6 = race(a$, b$, c$, d$, e$, f$); // $ExpectType Observable<A | B | C | D | E | F>
  });
});

describe('race([a, b, c])', () => {
  it('should support N arguments of different types', () => {
    const o1 = race([a$]); // $ExpectType Observable<A>
    const o2 = race([a$, b$]); // $ExpectType Observable<A | B>
    const o3 = race([a$, b$, c$]); // $ExpectType Observable<A | B | C>
    const o4 = race([a$, b$, c$, d$]); // $ExpectType Observable<A | B | C | D>
    const o5 = race([a$, b$, c$, d$, e$]); // $ExpectType Observable<A | B | C | D | E>
    const o6 = race([a$, b$, c$, d$, e$, f$]); // $ExpectType Observable<A | B | C | D | E | F>
  });
});

describe('xxx', () => {
  it('should race observable inputs', () => {
    const o = race(a$, Promise.resolve(b), [c]); // $ExpectType Observable<A | B | C>
  });

  it('should race an array observable inputs', () => {
    const o = race([a$, Promise.resolve(b), [c]]); // $ExpectType Observable<A | B | C>
  });

  it('should infer correctly with number parameters', () => {
    const a = range(1, 2); // $ExpectType Observable<number>
  });

  it('should accept only number parameters', () => {
    const a = range('a', 1); // $ExpectError
  });

  it('should allow 1 parameter', () => {
    const a = range(1); // $ExpectType Observable<number>
  });

  it('should support scheduler', () => {
    const a = range(1, 2, animationFrameScheduler); // $ExpectType Observable<number>
  });

  it('should accept any type and return never observable', () => {
    const a = throwError(1); // $ExpectType Observable<never>
    const b = throwError('a'); // $ExpectType Observable<never>
    const c = throwError({a: 1}); // $ExpectType Observable<never>
  });

  it('should support scheduler', () => {
    const a = throwError(1, animationFrameScheduler); // $ExpectType Observable<never>
  });

  it('should infer correctly with 1 parameter of number type', () => {
    const a = timer(1); // $ExpectType Observable<number>
  });

  it('should infer correctly with 1 parameter of date type', () => {
    const a = timer(new Date()); // $ExpectType Observable<number>
  });

  it('should not support string parameter', () => {
    const a = timer('a'); // $ExpectError
  });

  it('should infer correctly with 2 parameters', () => {
    const a = timer(1, 2); // $ExpectType Observable<number>
  });

  it('should support scheduler as second parameter', () => {
    const a = timer(1, animationFrameScheduler); // $ExpectType Observable<number>
  });

  it('should support scheduler as third parameter', () => {
    const a = timer(1, 2, animationFrameScheduler); // $ExpectType Observable<number>
  });

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
});
