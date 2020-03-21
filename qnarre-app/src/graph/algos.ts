import * as _ from 'lodash';

import * as qg from './graph';
import * as qn from './nest';
import * as qs from './sort';
import * as qt from './types';
import * as qu from './utils';

export interface Gdata extends qn.Gdata {
  acycler: string;
}
export interface Ndata extends qs.Ndata, qn.Ndata, qt.Point {
  in: number;
  labelPos: string;
  n: string;
  out: number;
}
export interface Edata extends qs.Edata, qn.Edata, qt.Point, qt.Area {
  forward: string;
  labelPos: string;
  points: qt.Point[];
  rank: number;
  reversed: boolean;
  value: number;
}

export interface Graph<G extends Gdata, N extends Ndata, E extends Edata>
  extends qs.Graph<G, N, E>,
    qn.Graph<G, N, E>,
    qg.Graph<G, N, E> {}

export class Graph<G extends Gdata, N extends Ndata, E extends Edata> {
  dijkstraSP(wFn?: any, lFn?: any) {
    const ps = {} as Paths;
    this.nodes().forEach(n => (ps[n] = this.dijkstra(n, wFn, lFn)));
    return ps;
  }

  dijkstra(
    x: any,
    wFn = (_: qg.Link<E>) => 1,
    lFn = (n: string) => this.outLinks(n)
  ) {
    const node = String(x);
    const ds = {} as Dists;
    const q = new qu.WeightedQueue();
    this.nodes().forEach(n => {
      const d = n === node ? 0 : Number.POSITIVE_INFINITY;
      ds[n] = {v: d};
      q.add(n, d);
    });
    let n0: string;
    let d0: Distance;
    const update = (l: qg.Link<E>) => {
      const w = wFn(l);
      qu.assert(w >= 0);
      const d = d0.v + w;
      const n1 = l.nodes[0] === n0 ? l.nodes[1] : l.nodes[0];
      const d1 = ds[n1];
      if (d < d1.v) {
        d1.v = d;
        d1.pred = n0;
        q.decrease(n1, d);
      }
    };
    while (q.size > 0) {
      n0 = q.remove();
      d0 = ds[n0];
      if (d0.v === Number.POSITIVE_INFINITY) break;
      lFn(n0)?.forEach(update);
    }
    return ds;
  }

  floydWarshallSP(
    wFn = (_: qg.Link<E>) => 1,
    lFn = (n: string) => this.outLinks(n)
  ) {
    const ns = this.nodes();
    const ps = {} as Paths;
    ns.forEach(n => {
      const ds = {} as Dists;
      ns.forEach(m => {
        ds[m] = {v: n === m ? 0 : Number.POSITIVE_INFINITY};
      });
      ps[n] = ds;
    });
    ns.forEach(n => {
      lFn(n)?.forEach(l => {
        const m = l.nodes[0] === n ? l.nodes[1] : l.nodes[0];
        ps[n][m] = {v: wFn(l), pred: n};
      });
    });
    ns.forEach(k => {
      const rk = ps[k];
      ns.forEach(i => {
        const ri = ps[i];
        ns.forEach(j => {
          const ik = ri[k];
          const kj = rk[j];
          const ij = ri[j];
          const d = ik.v + kj.v;
          if (d < ij.v) {
            ij.v = d;
            ij.pred = kj.pred;
          }
        });
      });
    });
    return ps;
  }

  primMST(wFn = (_: qg.Link<E>) => 1) {
    const g = qu.cloneMixins(this, this as qg.Opts) as this;
    if (this.nodeCount === 0) return g;
    const q = new qu.WeightedQueue();
    this.nodes().forEach(n => {
      q.add(n, Number.POSITIVE_INFINITY);
      g.setNode(n);
    });
    q.decrease(this.nodes()[0], 0);
    const ps = new Map<string, string>();
    let n0: string;
    const update = (l: qg.Link<E>) => {
      const n1 = l.nodes[0] === n0 ? l.nodes[1] : l.nodes[0];
      const w1 = q.weight(n1);
      if (w1 !== undefined) {
        const w = wFn(l);
        if (w < w1) {
          ps.set(n1, n0);
          q.decrease(n1, w);
        }
      }
    };
    let init = false;
    while (q.size > 0) {
      n0 = q.remove();
      if (ps.has(n0)) {
        g.setEdge([n0, ps.get(n0)]);
      } else {
        qu.assert(!init);
        init = true;
      }
      this.nodeLinks(n0)?.forEach(update);
    }
    return g;
  }

  runAcycler() {
    const fas =
      this.data!.acycler === 'greedy'
        ? this.greedyFAS(l => this.edge(l)!.weight)
        : this.walkFAS();
    fas.forEach(l => {
      const d = this.edge(l)!;
      this.delEdge(l);
      d.forward = l.nodes[2];
      d.reversed = true;
      this.setEdge([l.nodes[1], l.nodes[0], _.uniqueId('rev')], d);
    });
    return this;
  }

  undoAcycler() {
    this.links().forEach(l => {
      const d = l.data;
      if (d?.reversed) {
        this.delEdge(l);
        const n = d.forward;
        delete d.reversed;
        delete d.forward;
        this.setEdge([l.nodes[1], l.nodes[0], n], d);
      }
    });
    return this;
  }

  greedyFAS(wFn = (_: qg.Link<E>) => 1) {
    if (this.nodeCount <= 1) return [];
    const {g, bs, zi} = this.bucketize(wFn);
    let ls = [] as qg.Link<E>[];
    const srcs = bs[bs.length - 1];
    const dsts = bs[0];
    let n: N;
    while (g.nodeCount) {
      while ((n = dsts.dequeue())) g.discard(bs, zi, n);
      while ((n = srcs.dequeue())) g.discard(bs, zi, n);
      if (g.nodeCount) {
        for (let i = bs.length - 2; i > 0; --i) {
          n = bs[i].dequeue();
          if (n) {
            ls = ls.concat(g.discard(bs, zi, n, true)!);
            break;
          }
        }
      }
    }
    return ls.map(l => this.outLinks(l.nodes[0], l.nodes[1])!).flat();
  }

  walkFAS() {
    const fas = [] as qg.Link<E>[];
    const done = new Set<string>();
    const stack = new Set<string>();
    const walk = (n: string) => {
      if (!done.has(n)) {
        done.add(n);
        stack.add(n);
        this.outLinks(n)!.forEach(l => {
          if (stack.has(l.nodes[1])) {
            fas.push(l);
          } else {
            walk(l.nodes[1]);
          }
        });
        stack.delete(n);
      }
    };
    this.nodes().forEach(walk);
    return fas;
  }

  findCycles() {
    return this.tarjanSCC().filter(c => {
      return c.length > 1 || (c.length === 1 && this.hasEdge([c[0], c[0]]));
    });
  }

  tarjanSCC() {
    const cs = [] as string[][];
    const stack = [] as string[];
    const done = new Map<string, Low>();
    let idx = 0;
    const walk = (n: string) => {
      stack.push(n);
      const low = {
        v: idx,
        idx: idx++,
        onStack: true
      } as Low;
      done.set(n, low);
      this.succs(n)?.forEach(m => {
        if (!done.has(m)) {
          walk(m);
          low.v = Math.min(low.v, done.get(m)!.v);
        } else if (done.get(m)!.onStack) {
          low.v = Math.min(low.v, done.get(m)!.idx);
        }
      });
      if (low.v === low.idx) {
        const c = [] as string[];
        let m: string;
        do {
          m = stack.pop()!;
          done.get(m)!.onStack = false;
          c.push(m);
        } while (n !== m);
        cs.push(c);
      }
    };
    this.nodes().forEach(n => {
      if (!done.has(n)) walk(n);
    });
    return cs;
  }

  isAcyclic() {
    try {
      this.topsort();
    } catch (e) {
      if (e instanceof CycleException) return false;
      throw e;
    }
    return true;
  }

  topsort() {
    const ns = [] as string[];
    const done = new Set<string>();
    const stack = new Set<string>();
    const walk = (n: string) => {
      if (stack.has(n)) throw new CycleException();
      if (!done.has(n)) {
        done.add(n);
        stack.add(n);
        this.preds(n)?.forEach(walk);
        stack.delete(n);
        ns.push(n);
      }
    };
    this.sinks().forEach(walk);
    if (done.size !== this.nodeCount) throw new CycleException();
    return ns;
  }

  runNormalize() {
    this.data!.fakes = [] as string[];
    this.links().forEach(l => this.normLink(l));
    return this;
  }

  undoNormalize() {
    this.data!.fakes.forEach(n => {
      let nd = this.node(n)!;
      const ed = nd.link.data! as E;
      this.setEdge(nd.link as qg.Link<E>, ed);
      while (nd.fake) {
        const m = this.succs(n)![0];
        this.delNode(n);
        ed.points.push({x: nd.x, y: nd.y});
        if (nd.fake === 'edge-label') {
          ed.x = nd.x;
          ed.y = nd.y;
          ed.w = nd.w;
          ed.h = nd.h;
        }
        n = m;
        nd = this.node(n)!;
      }
    });
    return this;
  }

  normLink(l: qg.Link<E>) {
    const [n0, n1] = l.nodes;
    let r0 = this.node(n0)!.rank;
    const r1 = this.node(n1)!.rank;
    if (r1 === r0 + 1) return;
    const ed = this.edge(l)!;
    const dd = {weight: ed.weight} as E;
    ed.points = [];
    const name = l.nodes.length > 2 ? l.nodes[2] : undefined;
    const lr = ed.rank;
    this.delEdge(l);
    let i = 0;
    let n = n0;
    for (++r0; r0 < r1; ++i, ++r0) {
      const nd = {
        w: 0,
        h: 0,
        link: l as qg.Link<any>,
        rank: r0
      } as N;
      const d = this.addFake('edge', nd, '_d');
      if (r0 === lr) {
        nd.w = ed.w;
        nd.h = ed.h;
        nd.fake = 'edge-label';
        nd.labelPos = ed.labelPos;
      }
      this.setEdge([n, d, name], dd);
      if (i === 0) this.data!.fakes.push(d);
      n = d;
    }
    this.setEdge([n, n1, name], dd);
  }

  private bucketize(wFn: (l: qg.Link<E>) => number) {
    const g = qu.cloneMixins(this, this as qg.Opts) as this;
    this.nodes().forEach(n => g.setNode(n, {n: n, in: 0, out: 0} as N));
    let i = 0;
    let o = 0;
    this.links().forEach(l => {
      const w = wFn(l);
      const pre = g.edge([l.nodes[0], l.nodes[1]])?.value || 0;
      g.setEdge([l.nodes[0], l.nodes[1]], {value: pre + w} as E);
      o = Math.max(o, (g.node(l.nodes[0])!.out += w));
      i = Math.max(i, (g.node(l.nodes[1])!.in += w));
    });
    const bs = _.range(o + i + 3).map(() => new qu.List());
    const zi = i + 1;
    g.nodes().forEach(n => this.assign(bs, zi, g.node(n)!));
    return {g, bs, zi};
  }

  private discard(bs: qu.List[], i: number, n: N, preds = false) {
    const ls = preds ? ([] as qg.Link<E>[]) : undefined;
    this.inLinks(n.n)?.forEach(l => {
      if (preds) ls!.push(new qg.Link<E>(l.nodes, this));
      const nd = this.node(l.nodes[0])!;
      nd.out -= this.edge(l)!.value;
      this.assign(bs, i, nd);
    });
    this.outLinks(n.n)?.forEach(l => {
      const nd = this.node(l.nodes[1])!;
      nd.in -= this.edge(l)!.value;
      this.assign(bs, i, nd);
    });
    this.delNode(n.n);
    return ls;
  }

  private assign(bs: qu.List[], zi: number, nd: N) {
    if (!nd.out) {
      bs[0].enqueue(nd);
    } else if (!nd.in) {
      bs[bs.length - 1].enqueue(nd);
    } else {
      bs[nd.out - nd.in + zi].enqueue(nd);
    }
  }
}

export class CycleException extends Error {}

interface Distance {
  v: number;
  pred?: string;
}

type Dists = qt.Dict<Distance>;
type Paths = qt.Dict<Dists>;

interface Low {
  v: number;
  idx: number;
  onStack: boolean;
}
