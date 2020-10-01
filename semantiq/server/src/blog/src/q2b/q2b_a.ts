import * as qb from '../q0_a';
import * as qt from '../q0_b';
import * as q2 from '../q2';
function prev(f: q2.Frame) {
  interface Frame extends q2.Frame {
    x: unknown;
  }
  const qf: Frame = f as Frame;
  function xxx(up: Fxx) {
    return new (class {
      f(n: qt.Node) {
        if (qf.is.c(n)) return true;
        return up.f(n);
      }
    })();
  }
  function xx(up: Fx) {
    return new (class {
      xxx = xxx(this);
      f(n: qt.Node) {
        if (qf.is.b(n)) return true;
        return up.f(n);
      }
    })();
  }
  interface Fxx extends ReturnType<typeof xx> {}
  function x() {
    return new (class {
      xx = xx(this);
      f(n: qt.Node) {
        if (qf.is.a(n)) return true;
        return false;
      }
    })();
  }
  interface Fx extends ReturnType<typeof x> {}
  return (qf.x = x());
}
interface P extends ReturnType<typeof prev> {}

function newX(f: q2.Frame) {
  interface Frame extends q2.Frame {
    x: Fx;
  }
  const qf: Frame = f as Frame;
  function xxx(up: Fxx) {
    type _P = P['xx']['xxx'];
    interface _F extends _P {}
    class _F {}
    qb.addMixins(_F, [prev(qf).xx.xxx]);
    return new (class extends _F {
      g(n: qt.Node) {
        if (qf.is.c(n)) return false;
        up.f(n);
        return up.g(n);
      }
    })();
  }
  function xx(up: Fx) {
    type _P = P['xx'];
    interface _F extends _P {}
    class _F {}
    qb.addMixins(_F, [prev(qf).xx]);
    return new (class extends _F {
      xxx = xxx(this);
      g(n: qt.Node) {
        if (qf.is.b(n)) return false;
        this.xxx.f(n);
        up.f(n);
        return up.g(n);
      }
    })();
  }
  interface Fxx extends ReturnType<typeof xx> {}
  function x() {
    interface _F extends P {}
    class _F {}
    qb.addMixins(_F, [prev(qf)]);
    return new (class extends _F {
      xx = xx(this);
      g(n: qt.Node) {
        if (qf.is.a(n)) return false;
        this.xx.f(n);
        return true;
      }
    })();
  }
  interface Fx extends ReturnType<typeof x> {}
  return (qf.x = x());
}
export interface Fx extends ReturnType<typeof newX> {}
export interface Frame extends q2.Frame {
  x: Fx;
}
export function newFrame(c: q2.Frame) {
  const f = c as Frame;
  newX(f);
  return f;
}
export const qf: Frame = newFrame(q2.qf);
