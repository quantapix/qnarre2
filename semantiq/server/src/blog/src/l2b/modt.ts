import * as qb from '../base';
import * as qt from '../type';
import * as q1 from '../l1';
export function newIs(f: q1.Frame) {
  interface Frame extends q1.Frame {
    get: Fget;
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
