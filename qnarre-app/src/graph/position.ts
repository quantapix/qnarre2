/* eslint-disable @typescript-eslint/unbound-method */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qo from './order';
import * as qt from './types';
import * as qu from './utils';

export interface Gdata extends qo.Gdata {
  align: string;
  edgesep: number;
  nodesep: number;
  ranksep: number;
}
export interface Ndata extends qo.Ndata, qt.Point, qt.Area {
  borderType: string;
  fake: boolean | string;
  labelPos: string;
}
export interface Edata extends qo.Edata {
  value: number;
}

type XS = Map<string, number>;
export type XSS = Map<string, XS>;
export type Projs = Map<string, string>;

export interface Graph<G extends Gdata, N extends Ndata, E extends Edata>
  extends qo.Graph<G, N, E>,
    qg.Graph<G, N, E> {}

export class Graph<G extends Gdata, N extends Ndata, E extends Edata> {
  runPosition() {
    const g = this.nonCompound();
    g.posY()
      .posX()
      .forEach((x, n) => (g.node(n)!.x = x));
    return this;
  }

  nonCompound() {
    const g = qu.cloneMixins(this, {isMultiple: this.isMultiple}) as this;
    g.setData(this.data);
    this.nodes().forEach(n => {
      if (!this.children(n)?.length) g.setNode(n, this.node(n));
    });
    this.links().forEach(l => g.setEdge(l, this.edge(l)));
    return g;
  }

  posY() {
    const lm = this.layMatrix();
    const s = this.data!.ranksep;
    let y = 0;
    lm.forEach(l => {
      const h = Math.max(...l.map(n => this.node(n)!.h));
      l.forEach(n => (this.node(n)!.y = y + h / 2));
      y += h + s;
    });
    return this;
  }

  posX() {
    const xss = new Map() as XSS;
    const lm = this.layMatrix();
    const cs = new Conflicts([
      ...Array.from(this.fakeConflicts(lm).entries()),
      ...Array.from(this.type2Conflicts(lm).entries())
    ]);
    ['u', 'd'].forEach(v => {
      const lm2 = v === 'u' ? lm : lm.reverse();
      ['l', 'r'].forEach(h => {
        const ls = h === 'l' ? lm2 : lm2.map(l => Array.from(l).reverse());
        const neighbor = (v === 'u' ? this.preds : this.succs).bind(this);
        const a = columns(ls, cs, neighbor);
        const xs = this.horizontal(ls, a.roots, a.cols, h === 'r');
        if (h === 'r') {
          Array.from(xs.entries()).forEach(e => {
            const [n, x] = e;
            xs.set(n, -x);
          });
        }
        xss.set(v + h, xs);
      });
    });
    align(xss, this.thinnest(xss));
    return balance(xss, this.data?.align);
  }

  fakeConflicts(lm: string[][]) {
    const cs = new Conflicts();
    const walk = (prev: string[], ns: string[]) => {
      const last = _.last(ns);
      let s = 0;
      let o0 = 0;
      ns.forEach((n, i) => {
        const m = this.findFake(n);
        const o1 = m ? this.node(m)!.order : prev.length;
        if (m || n === last) {
          ns.slice(s, i + 1).forEach(n1 => {
            this.preds(n1)?.forEach(n0 => {
              const nd = this.node(n0)!;
              if (!(nd.fake && this.node(n1)!.fake)) {
                const o = nd.order;
                if (o < o0 || o > o1) cs.addConflict(n0, n1);
              }
            });
          });
          s = i + 1;
          o0 = o1;
        }
      });
      return ns;
    };
    _.reduce(lm, walk);
    return cs;
  }

  private findFake(n: string) {
    if (this.node(n)?.fake) {
      return this.preds(n)?.find(m => this.node(m)?.fake);
    }
    return undefined;
  }

  type2Conflicts(lm: string[][]) {
    const cs = new Conflicts();
    const scan = (
      ns: string[],
      s: number,
      e: number,
      o0: number,
      o1: number
    ) => {
      for (let i = s; i < e; i++) {
        const n1 = ns[i];
        if (this.node(n1)?.fake) {
          this.preds(n1)?.forEach(n0 => {
            const nd = this.node(n0);
            if (nd?.fake) {
              const o = nd.order;
              if (o < o0 || o > o1) cs.addConflict(n0, n1);
            }
          });
        }
      }
    };
    const walk = (prev: string[], ns: string[]) => {
      let s = 0;
      let o0 = -1;
      let o1 = -1;
      ns.forEach((n, i) => {
        if (this.node(n)?.fake === 'border') {
          const ps = this.preds(n);
          if (ps?.length) {
            o1 = this.node(ps[0])!.order;
            scan(ns, s, i, o0, o1);
            s = i;
            o0 = o1;
          }
        }
        scan(ns, s, ns.length, o1, prev.length);
      });
      return ns;
    };
    _.reduce(lm, walk);
    return cs;
  }

  horizontal(lm: string[][], roots: Projs, cols: Projs, reverse = false) {
    const xs = new Map() as XS;
    const bg = this.blockGraph(lm, roots, reverse);
    const bt = reverse ? 'left' : 'right';
    const walk = (
      pass: (n: string) => void,
      next: (x: any) => string[] | undefined
    ) => {
      const done = new Set<string>();
      let ns = bg.nodes();
      let n = ns.pop();
      while (n) {
        if (done.has(n)) {
          pass(n);
        } else {
          done.add(n);
          ns.push(n);
          ns = ns.concat(next(n)!);
        }
        n = ns.pop();
      }
    };
    const one = (n: string) => {
      const x = bg.inLinks(n)!.reduce((x, l) => {
        return Math.max(x, xs.get(l.nodes[0])! + bg.edge(l)!.value);
      }, 0);
      xs.set(n, x);
    };
    const two = (n: string) => {
      const x = bg.outLinks(n)!.reduce((x, l) => {
        return Math.min(x, xs.get(l.nodes[1])! - bg.edge(l)!.value);
      }, Number.POSITIVE_INFINITY);
      const nd = this.node(n)!;
      if (x !== Number.POSITIVE_INFINITY && nd.borderType !== bt) {
        xs.set(n, Math.max(xs.get(n)!, x));
      }
    };
    walk(one, bg.preds.bind(bg));
    walk(two, bg.succs.bind(bg));
    cols.forEach(n => xs.set(n, xs.get(roots.get(n)!)!));
    return xs;
  }

  thinnest(xss: XSS) {
    return _.minBy(Array.from(xss.values()), xs => {
      let max = Number.NEGATIVE_INFINITY;
      let min = Number.POSITIVE_INFINITY;
      xs.forEach((x, n) => {
        const h = this.node(n)!.w / 2;
        max = Math.max(x + h, max);
        min = Math.min(x - h, min);
      });
      return max - min;
    });
  }

  private blockGraph(lm: string[][], root: Projs, reverse = false) {
    const bg = qu.cloneMixins(this, this as qg.Opts) as this;
    const sep = this.separation(reverse);
    lm.forEach(ns => {
      let n0: string;
      ns.forEach(n => {
        const r1 = root.get(n);
        bg.setNode(r1);
        if (n0) {
          const r0 = root.get(n0);
          const m = bg.edge([r0, r1])?.value;
          bg.setEdge([r0, r1], {
            value: Math.max(sep(n, n0), m ?? 0)
          } as E);
        }
        n0 = n;
      });
    });
    return bg;
  }

  separation(reverse = false) {
    const gd = this.data!;
    const nsep = gd.nodesep;
    const esep = gd.edgesep;
    return (n0: string, n1: string) => {
      const nd0 = this.node(n0)!;
      let s = nd0.w / 2;
      let d = 0;
      if (nd0.labelPos) {
        switch (nd0.labelPos.toLowerCase()) {
          case 'l':
            d = -nd0.w / 2;
            break;
          case 'r':
            d = nd0.w / 2;
            break;
        }
      }
      if (d) s += reverse ? d : -d;
      d = 0;
      s += (nd0.fake ? esep : nsep) / 2;
      const nd1 = this.node(n1)!;
      s += (nd1.fake ? esep : nsep) / 2;
      s += nd1.w / 2;
      if (nd1.labelPos) {
        switch (nd1.labelPos.toLowerCase()) {
          case 'l':
            d = nd1.w / 2;
            break;
          case 'r':
            d = -nd1.w / 2;
            break;
        }
      }
      if (d) s += reverse ? d : -d;
      return s;
    };
  }
}

export function columns(
  lm: string[][],
  cs: Conflicts,
  fn: (n: any) => string[] | undefined
) {
  const roots = new Map() as Projs;
  const cols = new Map() as Projs;
  const pos = new Map() as XS;
  lm.forEach(ns => {
    ns.forEach((n, i) => {
      roots.set(n, n);
      cols.set(n, n);
      pos.set(n, i);
    });
  });
  lm.forEach(ns => {
    let p = -1;
    ns.forEach(n => {
      let ms = fn(n);
      if (ms?.length) {
        ms = _.sortBy(ms, m => pos.get(m));
        const h = (ms.length - 1) / 2;
        for (let i = Math.floor(h), c = Math.ceil(h); i <= c; ++i) {
          const m = ms[i];
          if (cols.get(n) === n && p < pos.get(m)! && !cs.hasConflict(n, m)) {
            cols.set(m, n);
            const r = roots.get(m)!;
            roots.set(n, r);
            cols.set(n, r);
            p = pos.get(m)!;
          }
        }
      }
    });
  });
  return {roots, cols};
}

export class Conflicts extends Map<string, Set<string>> {
  hasConflict(n0: string, n1: string) {
    if (n0 > n1) {
      const t = n0;
      n0 = n1;
      n1 = t;
    }
    return this.get(n0)?.has(n1);
  }

  addConflict(n0: string, n1: string) {
    if (n0 > n1) {
      const t = n0;
      n0 = n1;
      n1 = t;
    }
    let c = this.get(n0);
    if (!c) {
      c = new Set<string>();
      this.set(n0, c);
    }
    c.add(n1);
  }
}

type Pair = [string, number];

export function align(xss: XSS, to?: XS) {
  const vs = Array.from(to?.values() ?? []);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  ['u', 'd'].forEach(v => {
    ['l', 'r'].forEach(h => {
      const vh = v + h;
      const xs = xss.get(vh)!;
      if (xs === to) return;
      const ps = Array.from(xs.values());
      const d = h === 'l' ? min - Math.min(...ps) : max - Math.max(...ps);
      if (d) {
        xss.set(vh, new Map(Array.from(xs, ([n, x]) => [n, x + d] as Pair)));
      }
    });
  });
}

export function balance(xss: XSS, align?: string) {
  const ul = xss.get('ul')!;
  const a = align?.toLowerCase();
  if (a) {
    return new Map(
      Array.from(ul, ([n, _]) => [n, xss.get(a)!.get(n)!] as Pair)
    );
  }
  const ks = Array.from(xss.keys());
  const vs = (n: string) => {
    const xs = ks.map(k => xss.get(k)!.get(n)!).sort((a, b) => a - b);
    return (xs[1] + xs[2]) / 2;
  };
  return new Map(Array.from(ul, ([n, _]) => [n, vs(n)] as Pair));
}
