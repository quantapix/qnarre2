import * as qb from '../base';
import { Kind } from '../type';
import * as q2 from '../l2';
import * as q3 from './mode';
export function newNode(f: q2.Frame) {
  interface Frame extends q2.Frame {}
  const qf: q2.Frame = f as Frame;
  interface _Fnode extends q2.Fnode {}
  class _Fnode {}
  qb.addMixins(_Fnode, [q2.newNode(qf)]);
  return (qf.node = new (class Base extends _Fnode {
    is = new (class extends Base {
      ab(n: q3.All): n is q3.AB {
        return n.k === Kind.AB;
      }
      bc(n: q3.All): n is q3.BC {
        return n.k === Kind.BC;
      }
    })();
  })());
}
export interface Fnode extends ReturnType<typeof newNode> {}
export interface Frame extends q2.Frame {
  node: Fnode;
}
export function newFrame(c: q2.Frame) {
  const f = c as q2.Frame;
  newNode(f);
  return f;
}
export const qf: Frame = newFrame(q2.qf);
