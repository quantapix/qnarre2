import * as qb from '../q0_a';
import { Kind } from '../q0_b';
import * as q2 from '../q2';
import * as q3 from '../q3';
export function newNode(f: q2.Frame) {
  interface Frame extends q2.Frame {}
  const qf: q2.Frame = f as Frame;
  interface _Fnode extends q2.Fnode {}
  class _Fnode {}
  const n = q2.newNode(qf);
  qb.addMixins(_Fnode, [n]);
  type _Fis = q2.Fnode['is'];
  type _Fget = q2.Fnode['get'];
  return (qf.node = new (class Base extends _Fnode {
    _is = new (class extends Base {
      ab(n: q3.Node): n is q3.AB {
        return n.k === Kind.AB;
      }
      bc(n: q3.Node): n is q3.BC {
        return n.k === Kind.BC;
      }
    })();
    is: Base['_is'] & _Fis;
    _get2 = new (class extends Base {})();
    get: Base['_get'] & _Fget;
    constructor() {
      super();
      this.is = this._is as Base['is'];
      qb.addMixins(this.is, [n.is]);
      this.get = this._get as Base['get'];
      qb.addMixins(this.get, [n.get]);
    }
  })());
}
export interface Fnode extends ReturnType<typeof newNode> {}
export interface Frame extends q2.Frame {
  node: Fnode;
}
export function newFrame(c: q2.Frame) {
  const f: Frame = c as Frame;
  newNode(f);
  return f;
}
export const qf: Frame = newFrame(q2.qf);
