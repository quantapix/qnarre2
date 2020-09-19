import * as qb from '../base';
import * as qt from '../type';
import * as q1 from '../l1';
export function newIs(f: q1.Frame) {
  interface Frame extends q1.Frame {
    type: Ftype;
  }
  const qf: Frame = f as Frame;
  interface _Fis extends q1.Fis {}
  class _Fis {}
  qb.addMixins(_Fis, [q1.newIs(qf)]);
  return (qf.is = new (class extends _Fis {
    a(k: qt.Kind): boolean;
    a(n: qt.All): n is qt.A;
    a(x: qt.Kind | qt.All) {
      x = typeof x === 'object' ? x.k : x;
      return x === qt.Kind.A;
    }
  })());
}
export interface Fis extends ReturnType<typeof newIs> {}
export function newType(f: q1.Frame) {
  interface Frame extends q1.Frame {
    is: Fis;
    type: unknown;
  }
  const qf: Frame = f as Frame;
  return (qf.type = new (class Base {
    has = new (class extends Base {})();
    check = new (class extends Base {})();
  })());
}
export interface Ftype extends ReturnType<typeof newType> {}
export interface Frame extends q1.Frame {
  is: Fis;
  type: Ftype;
}
export function newFrame(c: q1.Frame) {
  const f = c as Frame;
  newIs(f);
  newType(f);
  return f;
}
export const qf: Frame = newFrame(q1.qf);
