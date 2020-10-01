import * as qb from '../q0_a';
import { Kind } from '../q0_b';
import * as qt from '../q0_b';
import * as q1 from '../q1';
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
    a(n: qt.Node): n is qt.A;
    a(x: qt.Kind | qt.Node) {
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
    is = new (class {
      kind<K extends Kind, C extends { k: K }>(c: C, n?: q1.Nobj): n is q1.Ctr<C['k']> {
        return n?.k === c.k;
      }
      a(n: q1.Node): n is q1.A {
        return n.k === Kind.A;
      }
      b(n: q1.Node): n is q1.B {
        return n.k === Kind.B;
      }
      c(n: q1.Node): n is q1.C {
        return n.k === Kind.C;
      }
    })();
    _get = new (class {
      b1(n: qt.Node) {
        if (qf.is.b(n)) return n.b1;
        return;
      }
    })();
    get: Base['_get'] & q1.Fget;
    constructor() {
      this.get = this._get as Base['get'];
      qb.addMixins(this.get, [q1.newGet(qf)]);
    }
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
