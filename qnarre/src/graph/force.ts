import {quadtree} from 'd3-quadtree';

import * as qt from './core/types';
import * as qu from './core/utils';

interface Velocity {
  vx: number;
  vy: number;
}

export interface Ndata extends qt.Point, Velocity {
  idx: number;
  fix?: qt.Point;
}

function nextX(n: Ndata) {
  return n.x + n.vx;
}

function nextY(n: Ndata) {
  return n.y + n.vy;
}

export interface Ldata<N extends Ndata> {
  idx: number;
  ns: N[];
}

export class Force<N extends Ndata, _L extends Ldata<N> | undefined> {
  ns = [] as N[];

  init(ns?: N[]) {
    if (ns) this.ns = ns;
    return this;
  }

  apply(_alpha: number) {
    return this;
  }
}

export function center<N extends Ndata>(o?: qt.Point) {
  return new Center<N>(o);
}

export class Center<N extends Ndata> extends Force<N, undefined> {
  orig: qt.Point;

  constructor(o?: qt.Point) {
    super();
    this.orig = o ?? {x: 0, y: 0};
  }

  setOrig(o: qt.Point) {
    this.orig = o;
    return this;
  }

  apply(_: number) {
    const ns = this.ns;
    const p = {x: 0, y: 0};
    ns.forEach(n => qu.Point.add(p, n));
    const c = ns.length;
    p.x = p.x / c - this.orig.x;
    p.y = p.y / c - this.orig.y;
    ns.forEach(n => qu.Point.subtract(n, p));
    return this;
  }
}

class Strength<N extends Ndata> extends Force<N, undefined> {
  stren: (n: N, i: number, ns: N[]) => number = () => 0.1;
  strens = [] as number[];

  init(ns?: N[]) {
    super.init(ns);
    if (this.ns) {
      const ns = this.ns;
      this.strens = new Array(ns.length);
      ns.forEach((n, i) => {
        this.strens[i] = this.stren(n, i, ns);
      });
    }
    return this;
  }

  setStren(s?: ((n: N, i: number, ns: N[]) => number) | number) {
    this.stren = typeof s === 'function' ? s : () => s ?? 0;
    this.init();
    return this;
  }
}

export function radial<N extends Ndata>() {
  return new Radial<N>();
}

export class Radial<N extends Ndata> extends Strength<N> {
  radius: (n: N, i: number, ns: N[]) => number;
  rs = [] as number[];
  orig: qt.Point;

  constructor(
    public r?: ((n: N, i: number, ns: N[]) => number) | number,
    o?: qt.Point
  ) {
    super();
    this.radius = typeof r === 'function' ? r : () => r ?? 0;
    this.orig = o ?? {x: 0, y: 0};
  }

  init(ns?: N[]) {
    super.init(ns);
    if (this.ns) {
      const ns = this.ns;
      this.rs = new Array(ns.length);
      ns.forEach((n, i) => {
        this.rs[i] = this.radius(n, i, ns);
        this.strens[i] = isNaN(this.rs[i]) ? 0 : this.stren(n, i, ns);
      });
    }
    return this;
  }

  setOrig(o: qt.Point) {
    this.orig = o;
    return this;
  }

  setRadius(r?: ((n: N, i: number, ns: N[]) => number) | number) {
    this.radius = typeof r === 'function' ? r : () => r ?? 0;
    this.init();
    return this;
  }

  apply(alpha: number) {
    this.ns.forEach((n, i) => {
      const x = n.x - this.orig.x || 1e-6;
      const y = n.y - this.orig.y || 1e-6;
      const r = Math.sqrt(x * x + y * y);
      const k = ((this.rs[i] - r) * this.strens[i] * alpha) / r;
      n.vx += x * k;
      n.vy += y * k;
    });
    return this;
  }
}

export function collide<N extends Ndata>() {
  return new Collide<N>();
}

export class Collide<N extends Ndata> extends Force<N, undefined> {
  radius: (n: N, i: number, ns: N[]) => number;
  rs = [] as number[];
  stren = 1;
  iters = 1;

  constructor(public r?: ((n: N, i: number, ns: N[]) => number) | number) {
    super();
    this.radius = typeof r === 'function' ? r : () => r ?? 1;
  }

  init(ns?: N[]) {
    super.init(ns);
    if (this.ns) {
      const ns = this.ns;
      this.rs = new Array(ns.length);
      ns.forEach((n, i) => {
        this.rs[i] = this.radius(n, i, ns);
      });
    }
    return this;
  }

  setRadius(r?: ((n: N, i: number, ns: N[]) => number) | number) {
    this.radius = typeof r === 'function' ? r : () => r ?? 1;
    this.init();
    return this;
  }

  setStren(s: number) {
    this.stren = s;
    return this;
  }

  setIters(i: number) {
    this.iters = i;
    return this;
  }

  apply(_: number) {
    for (let k = 0; k < this.iters; ++k) {
      this.step();
    }
    return this;
  }

  step() {
    const ns = this.ns;
    const prep = (q: any) => {
      const d = q.data as N | undefined;
      if (d?.idx) q.r = this.rs[d.idx];
      else {
        q.r = 0;
        for (let i = 0; i < 4; ++i) {
          if (q[i] && q[i].r > q.r) q.r = q[i].r;
        }
      }
    };
    const tree = quadtree(ns, nextX, nextY).visitAfter(prep);
    ns.forEach((n, i) => {
      const ri = this.rs[i];
      const ri2 = ri * ri;
      const p = {x: nextX(n), y: nextY(n)} as qt.Point;
      const calc = (q: any, x0: number, y0: number, x1: number, y1: number) => {
        let rj = q.r;
        let r = ri + rj;
        const d = q.data as N;
        if (d) {
          if (d.idx > n.idx) {
            let x = p.x - nextX(d);
            let y = p.y - nextY(d);
            let l = x * x + y * y;
            if (l < r * r) {
              if (x === 0) (x = jiggle()), (l += x * x);
              if (y === 0) (y = jiggle()), (l += y * y);
              l = ((r - (l = Math.sqrt(l))) / l) * this.stren;
              n.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
              n.vy += (y *= l) * r;
              d.vx -= x * (r = 1 - r);
              d.vy -= y * r;
            }
          }
          return false;
        }
        return x0 > p.x + r || x1 < p.x - r || y0 > p.y + r || y1 < p.y - r;
      };
      tree.visit(calc);
    });
  }
}

class Position<N extends Ndata> extends Strength<N> {
  pos: (n: N, i: number, ns: N[]) => number;
  ps = [] as number[];

  constructor(p?: ((n: N, i: number, ns: N[]) => number) | number) {
    super();
    this.pos = typeof p === 'function' ? p : () => p ?? 0;
  }

  init(ns?: N[]) {
    super.init(ns);
    if (this.ns) {
      const ns = this.ns;
      this.ps = new Array(ns.length);
      ns.forEach((n, i) => {
        const p = (this.ps[i] = this.pos(n, i, ns));
        this.strens[i] = isNaN(p) ? 0 : this.stren(n, i, ns);
      });
    }
    return this;
  }
}

export function forceX<N extends Ndata>() {
  return new ForceX<N>();
}

export class ForceX<N extends Ndata> extends Position<N> {
  setX(x?: ((n: N, i: number, ns: N[]) => number) | number) {
    this.pos = typeof x === 'function' ? x : () => x ?? 0;
    this.init();
    return this;
  }

  apply(alpha: number) {
    this.ns.forEach((n, i) => {
      n.vx += (this.ps[i] - n.x) * this.strens[i] * alpha;
    });
    return this;
  }
}

export function forceY<N extends Ndata>() {
  return new ForceY<N>();
}

export class ForceY<N extends Ndata> extends Position<N> {
  setY(y?: ((n: N, i: number, ns: N[]) => number) | number) {
    this.pos = typeof y === 'function' ? y : () => y ?? 0;
    this.init();
    return this;
  }

  apply(alpha: number) {
    this.ns.forEach((n, i) => {
      n.vy += (this.ps[i] - n.y) * this.strens[i] * alpha;
    });
    return this;
  }
}

export function bodies<N extends Ndata>() {
  return new Bodies<N>();
}

export class Bodies<N extends Ndata> extends Strength<N> {
  distMin2 = 1;
  distMax2 = Number.POSITIVE_INFINITY;
  theta2 = 0.81;

  constructor(public r?: ((n: N, i: number, ns: N[]) => number) | number) {
    super();
    this.stren = () => -30;
  }

  distMin() {
    return Math.sqrt(this.distMin2);
  }

  setDistMin(d: number) {
    this.distMin2 = d * d;
    return this;
  }

  distMax() {
    return Math.sqrt(this.distMax2);
  }

  setDistMax(d: number) {
    this.distMax2 = d * d;
    return this;
  }

  theta() {
    return Math.sqrt(this.theta2);
  }

  setTheta(t: number) {
    this.theta2 = t * t;
    return this;
  }

  apply(alpha: number) {
    const ns = this.ns;
    const accu = (quad: any) => {
      let s = 0;
      if (quad.length) {
        const p = {x: 0, y: 0};
        let w = 0;
        for (let i = 0; i < 4; ++i) {
          const q = quad[i];
          if (q) {
            const c = Math.abs(q.value);
            if (c) {
              s += q.value;
              w += c;
              p.x += c * q.x;
              p.y += c * q.y;
            }
          }
        }
        quad.x = p.x / w;
        quad.y = p.y / w;
      } else {
        let q = quad;
        q.x = q.data.x;
        q.y = q.data.y;
        do s += this.strens[q.data.idx];
        while ((q = q.next));
      }
      quad.value = s;
    };
    const tree = quadtree(
      ns,
      (n: N) => n.x,
      (n: N) => n.y
    ).visitAfter(accu);
    ns.forEach(n => {
      const calc = (q: any, x1: number, _: any, x2: number) => {
        if (!q.value) return true;
        let x = q.x - n.x;
        let y = q.y - n.y;
        let w = x2 - x1;
        let l = x * x + y * y;
        if ((w * w) / this.theta2 < l) {
          if (l < this.distMax2) {
            if (x === 0) (x = jiggle()), (l += x * x);
            if (y === 0) (y = jiggle()), (l += y * y);
            if (l < this.distMin2) l = Math.sqrt(this.distMin2 * l);
            n.vx += (x * q.value * alpha) / l;
            n.vy += (y * q.value * alpha) / l;
          }
          return true;
        } else if (q.length || l >= this.distMax2) return false;
        if (q.data !== n || q.next) {
          if (x === 0) (x = jiggle()), (l += x * x);
          if (y === 0) (y = jiggle()), (l += y * y);
          if (l < this.distMin2) l = Math.sqrt(this.distMin2 * l);
        }
        do
          if (q.data !== n) {
            w = (this.strens[q.data.idx] * alpha) / l;
            n.vx += x * w;
            n.vy += y * w;
          }
        while ((q = q.next));
        return false;
      };
      tree.visit(calc);
    });
    return this;
  }
}

export function links<N extends Ndata, L extends Ldata<N>>(ls = [] as L[]) {
  return new Links<N, L>(ls);
}

export class Links<N extends Ndata, L extends Ldata<N>> extends Force<N, L> {
  id: (n: N, i: number, ns: N[]) => string | number = (n: N) => n.idx;
  stren: (l: L, i: number, ls: L[]) => number = this.defStren.bind(this);
  dist: (l: L, i: number, ls: L[]) => number = () => 30;
  count = [] as number[];
  bias = [] as number[];
  strens = [] as number[];
  dists = [] as number[];
  iters = 1;

  constructor(public ls = [] as L[]) {
    super();
  }

  defStren(l: L) {
    return 1 / Math.min(this.count[l.ns[0].idx], this.count[l.ns[1].idx]);
  }

  setId(f?: (n: N, i: number, ns: N[]) => string | number) {
    this.id = typeof f === 'function' ? f : (n: N) => n.idx;
    this.initStren();
    return this;
  }

  init(ns?: N[]) {
    super.init(ns);
    if (this.ns) {
      let c = this.ns.length;
      this.count = new Array(c);
      const ls = this.ls;
      ls.forEach((l, i) => {
        l.idx = i;
        this.count[l.ns[0].idx] = (this.count[l.ns[0].idx] || 0) + 1;
        this.count[l.ns[1].idx] = (this.count[l.ns[1].idx] || 0) + 1;
      });
      c = ls.length;
      this.bias = new Array(c);
      this.ls.forEach((l, i) => {
        const d = this.count[l.ns[0].idx] + this.count[l.ns[1].idx];
        this.bias[i] = this.count[l.ns[0].idx] / d;
      });
      this.strens = new Array(c);
      this.initStren();
      this.dists = new Array(c);
      this.initDist();
    }
    return this;
  }

  setLinks(ls: L[]) {
    this.ls = ls;
    this.init();
    return this;
  }

  initStren() {
    if (this.ns) {
      const ls = this.ls;
      ls.forEach((l, i) => {
        this.strens[i] = this.stren(l, i, ls);
      });
    }
  }

  setStren(s?: ((l: L, i: number, ls: L[]) => number) | number) {
    this.stren = typeof s === 'function' ? s : () => s ?? 0;
    this.initStren();
    return this;
  }

  initDist() {
    if (this.ns) {
      const ls = this.ls;
      ls.forEach((l, i) => {
        this.dists[i] = this.dist(l, i, ls);
      });
    }
  }

  setDistance(d?: ((l: L, i: number, ls: L[]) => number) | number) {
    this.dist = typeof d === 'function' ? d : () => d ?? 0;
    this.initDist();
    return this;
  }

  apply(alpha: number) {
    const ls = this.ls;
    for (let k = 0; k < this.iters; ++k) {
      ls.forEach((l, i) => {
        const s = l.ns[0];
        const t = l.ns[1];
        let x = t.x + t.vx - s.x - s.vx || jiggle();
        let y = t.y + t.vy - s.y - s.vy || jiggle();
        let c = Math.sqrt(x * x + y * y);
        c = ((c - this.dists[i]) / c) * alpha * this.strens[i];
        x *= c;
        y *= c;
        let b = this.bias[i];
        t.vx -= x * b;
        t.vy -= y * b;
        b = 1 - b;
        s.vx += x * b;
        s.vy += y * b;
      });
    }
    return this;
  }
}

function jiggle() {
  return (Math.random() - 0.5) * 1e-6;
}
