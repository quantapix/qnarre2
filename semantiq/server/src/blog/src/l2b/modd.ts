import * as qb from '../base';
import * as qt from '../type';
import * as q2 from '../l2';
function newX(f: q2.Frame) {
  interface Frame extends q2.Frame {
    x: unknown;
  }
  const qf: Frame = f as Frame;
  return (qf.x = new (class _X {
    xx = new (class _XX {
      xxx = new (class {
        constructor(public up: _XX) {}
        f(n: qt.Node) {
          if (qf.is.c(n)) return true;
          return this.up.f(n);
        }
      })(this);
      constructor(public up: _X) {}
      f(n: qt.Node) {
        if (qf.is.b(n)) return true;
        return this.up.f(n);
      }
    })(this);
    f(n: qt.Node) {
      if (qf.is.a(n)) return false;
      return;
    }
  })());
}
interface Fx extends ReturnType<typeof newX> {}

function newX2(f: q2.Frame) {
  interface Frame extends q2.Frame {
    x: Fx;
  }
  const qf: Frame = f as Frame;
  interface _Fx extends Fx {}
  class _Fx {}
  qb.addMixins(_Fx, [newX(qf)]);
  type _Xx = Fx['xx'];
  interface _Fxx extends _Xx {}
  class _Fxx {}
  qb.addMixins(_Fxx, [newX(qf).xx]);
  type _Xxx = Fx['xx']['xxx'];
  interface _Fxxx extends _Xxx {}
  class _Fxxx {}
  qb.addMixins(_Fxxx, [newX(qf).xx.xxx]);
  return (qf.x = new (class _X extends _Fx {
    _xx = new (class _XX extends _Fxx {
      up!: Fx;
      _xxx = new (class extends _Fxxx {
        up!: _Xx;
        g(n: qt.Node) {
          if (qf.is.c(n)) return false;
          return this.up.f(n);
        }
      })();
      xxx: _XX['_xxx'] & _Xxx;
      constructor() {
        super();
        this.xxx = this._xxx;
        qb.addMixins(this.xxx, [newX(qf).xx]);
        this.xxx.up = this;
      }
      g(n: qt.Node) {
        if (qf.is.b(n)) return false;
        return this.up.f(n);
      }
    })();
    xx: _X['_xx'] & _Xx;
    constructor() {
      super();
      this.xx = this._xx;
      qb.addMixins(this.xx, [newX(qf).xx]);
      this.xx.up = this;
    }
    g(n: qt.Node) {
      if (qf.is.a(n)) return true;
      return;
    }
  })());
}
export interface Fx2 extends ReturnType<typeof newX2> {}
export interface Frame extends q2.Frame {
  x: Fx2;
}
export function newFrame(c: q2.Frame) {
  const f = c as Frame;
  newX2(f);
  return f;
}
export const qf: Frame = newFrame(q2.qf);
