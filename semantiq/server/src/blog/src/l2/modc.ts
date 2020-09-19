import * as qb from '../base';
import { Kind } from '../type';
import * as qt from '../type';
import * as q1 from '../l1';
export function newIs(f: q1.Frame) {
  interface Frame extends q1.Frame {
    node: Fnode;
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
export function newNode(f: q1.Frame) {
  interface Frame extends q1.Frame {
    is: Fis;
    node: unknown;
  }
  const qf: Frame = f as Frame;
  return (qf.node = new (class Base {
    is = new (class extends Base {
      kind<K extends Kind, C extends { k: K }>(c: C, n?: q1.All): n is q1.Ctr<C['k']> {
        return n?.k === c.k;
      }
      a(n: q1.All): n is q1.A {
        return n.k === Kind.A;
      }
      b(n: q1.All): n is q1.B {
        return n.k === Kind.B;
      }
      c(n: q1.All): n is q1.C {
        return n.k === Kind.C;
      }
    })();
    get = new (class extends Base {})();
  })());
}
export interface Fnode extends ReturnType<typeof newNode> {}
export interface Frame extends q1.Frame {
  is: Fis;
  node: Fnode;
}
export function newFrame(c: q1.Frame) {
  const f = c as Frame;
  newIs(f);
  newNode(f);
  return f;
}
export const qf: Frame = newFrame(q1.qf);
