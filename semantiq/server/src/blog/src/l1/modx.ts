import * as qb from '../base';
import * as qt from '../type';
export abstract class N extends qb.Data implements qt.N {
  k!: qt.Kind;
  readonly n1 = 234;
  n2?: number;
  walk<T>(cb?: (n?: qt.All) => T | undefined): T | undefined {
    return cb?.(this as qt.All);
  }
}
export class Ns<T extends qt.N = N> extends Array<T> implements qt.Ns {
  d1 = 0;
  ns1 = 0;
  walk<U>(cb?: (n?: qt.All) => U | undefined, cbs?: (ns?: qt.Ns) => U | undefined): U | undefined {
    if (cbs) return cbs(this);
    for (const n of this) {
      const r = cb?.(n as qt.All);
      if (r) return r;
    }
    return;
  }
}
export class A extends N implements qt.A {
  static readonly k = qt.Kind.A;
  k!: qt.Kind.A;
  a1 = 0;
  update(a1: number) {
    this.a1 = a1;
    return this;
  }
}
A.prototype.k = A.k;
export class B extends N implements qt.B {
  static readonly k = qt.Kind.B;
  k!: qt.Kind.B;
  readonly b1 = 567;
  b2!: qt.A;
  update(b2: qt.A) {
    this.b2 = b2;
    return this;
  }
}
B.prototype.k = B.k;
export class C extends N implements qt.C {
  static readonly k = qt.Kind.C;
  k!: qt.Kind.C;
  c1?: qt.Ns<qt.B>;
  update(c1: B[]) {
    this.c1 = new Ns<qt.B>(...c1);
  }
}
C.prototype.k = C.k;
export type All = A | B | C;
