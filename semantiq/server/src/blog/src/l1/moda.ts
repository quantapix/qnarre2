import { Kind } from '../type';
import * as qb from '../base';
import * as qt from '../type';
export abstract class N extends qb.Data implements qt.N {
  k!: Kind;
  n1 = 234;
  n2?: number;
  walk<T>(cb?: (n?: qt.All) => T | undefined): T | undefined {
    return cb?.(this as qt.All);
  }
}
export class Ns<T extends qt.N = N> extends Array<T> implements qt.Ns {
  readonly d1 = 123;
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
  static readonly k = Kind.A;
  k!: Kind.A;
  a1 = 0;
  update(a1: number) {
    this.a1 = a1;
    return this;
  }
}
A.prototype.k = A.k;
export class B extends N implements qt.B {
  static readonly k = Kind.B;
  k!: Kind.B;
  readonly b1 = 567;
  b2!: qt.A;
  update(b2: qt.A) {
    this.b2 = b2;
    return this;
  }
}
B.prototype.k = B.k;
export class C extends N implements qt.C {
  static readonly k = Kind.C;
  k!: Kind.C;
  c2?: qt.Ns<qt.B>;
  update(c2: B[]) {
    this.c2 = new Ns<qt.B>(...c2);
  }
}
C.prototype.k = C.k;
export type All = A | B | C;
export const all = { [Kind.A]: A, [Kind.B]: B, [Kind.C]: C };
export interface Ctrs {
  [Kind.A]: A;
  [Kind.B]: B;
  [Kind.C]: C;
}
export type Ctr<K extends Kind> = K extends keyof Ctrs ? Ctrs[K] : never;
