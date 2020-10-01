import { Ctr } from './q1_a';
import { Kind } from '../q0_b';
import * as q1 from './q1_a';
import * as qb from '../q0_a';
import * as qt from '../q0_b';
export function newIs(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
  }
  const qf: Frame = f as Frame;
  interface _Fis extends qb.Fis {}
  class _Fis {}
  qb.addMixins(_Fis, [qb.Fis]);
  return (qf.is = new (class extends _Fis {
    kind<K extends Kind, C extends { k: K }>(c: C, n?: qt.Nobj): n is Ctr<C['k']> {
      return n?.k === c.k;
    }
    a(k: Kind) {
      return k === Kind.A;
    }
    b(k: Kind): boolean;
    b(n: qt.Node): n is qt.B;
    b(x: Kind | qt.Node) {
      x = typeof x === 'object' ? x.k : x;
      return x === Kind.B;
    }
    c(n: qt.Node): n is qt.C {
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
  qb.addMixins(_Fget, [qb.Fget]);
  return (qf.get = new (class extends _Fget {
    v(n?: qt.Node): number | undefined {
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
    b2(n: qt.Node) {
      if (qf.is.b(n)) return n.b2;
      return;
    }
    c2(n: qt.Node) {
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
      return new q1.Nmap[k]();
    }
  })());
}
export interface Fmake extends ReturnType<typeof newMake> {}
export interface Frame extends qt.Frame {
  get: Fget;
  is: Fis;
  make: Fmake;
}
export function newFrame(c: qt.Config) {
  const f = c as Frame;
  newIs(f);
  newGet(f);
  newMake(f);
  return f;
}
export const qf: Frame = newFrame({});
