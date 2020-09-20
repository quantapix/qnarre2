import { Ctr } from './moda';
import { Kind } from '../type';
import * as q1 from './moda';
import * as qb from '../base';
import * as qt from '../type';
export function newIs(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
  }
  const qf: Frame = f as Frame;
  interface _Fis extends qb.Fis {}
  class _Fis {}
  qb.addMixins(_Fis, [new qb.Fis()]);
  return (qf.is = new (class extends _Fis {
    kind<K extends Kind, C extends { k: K }>(c: C, n?: qt.N): n is Ctr<C['k']> {
      return n?.k === c.k;
    }
    a(k: Kind) {
      return k === Kind.A;
    }
    b(k: Kind): boolean;
    b(n: qt.All): n is qt.B;
    b(x: Kind | qt.All) {
      x = typeof x === 'object' ? x.k : x;
      return x === Kind.B;
    }
    c(n: qt.All): n is qt.C {
      return n.k === Kind.C;
    }
  })());
}
export interface Fis extends ReturnType<typeof newIs> {}
export function newGet(f: qt.Frame) {
  interface Frame extends qt.Frame {
    is: Fis;
  }
  const qf: Frame = f as Frame;
  interface _Fget extends qb.Fget {}
  class _Fget {}
  qb.addMixins(_Fget, [new qb.Fget()]);
  return (qf.get = new (class extends _Fget {
    v(n?: qt.All): number | undefined {
      switch (n?.k) {
        case Kind.A:
          return n.a1;
        case Kind.B:
          return n.b1;
        case Kind.C:
          return n.c1;
      }
      return;
    }
    b2(n: qt.All) {
      if (qf.is.b(n)) return n.b2;
      return;
    }
    c2(n: qt.All) {
      if (qf.is.c(n)) return n.c2;
      return;
    }
  })());
}
export interface Fget extends ReturnType<typeof newGet> {}
export function newMake(f: qt.Frame) {
  interface Frame extends qt.Frame {
    is: Fis;
    get: Fget;
  }
  const qf: Frame = f as Frame;
  return (qf.make = new (class {
    n<K extends Kind.A | Kind.B | Kind.C>(k: K) {
      return new q1.all[k]();
    }
  })());
}
export interface Fmake extends ReturnType<typeof newMake> {}
export interface Frame extends qt.Frame {
  get: Fget;
  is: Fis;
  make: Fmake;
}
export function newFrame(c: qt.Cfg) {
  const f = c as Frame;
  newIs(f);
  newGet(f);
  newMake(f);
  return f;
}
export const qf: Frame = newFrame({});
