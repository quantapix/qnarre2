/* eslint-disable @typescript-eslint/unbound-method */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qs from './sort';
import * as qu from './utils';
import * as qt from './types';

export interface Gdata {
  root: string;
}
export interface Ndata extends qs.Ndata {
  maxRank: number;
  minRank: number;
  rank: number;
}
export type Edata = qs.Edata;

export interface Graph<G extends Gdata, N extends Ndata, E extends Edata>
  extends qs.Graph<G, N, E>,
    qg.Graph<G, N, E> {}

export class Graph<G extends Gdata, N extends Ndata, E extends Edata> {
  runOrder() {
    const max = this.maxRank();
    const ins = qu.range(1, max + 1).map(r => this.layer(r, true));
    const outs = qu.range(max - 1, -1, -1).map(r => this.layer(r, false));
    let lays = this.orderInit();
    this.assignOrder(lays);
    let best = [] as string[][];
    let bestCC = Number.POSITIVE_INFINITY;
    for (let i = 0, last = 0; last < 4; ++i, ++last) {
      this.sweepGraphs(i % 2 ? ins : outs, i % 4 >= 2);
      lays = this.layMatrix();
      const cc = this.crossCount(lays);
      if (cc < bestCC) {
        last = 0;
        best = _.cloneDeep(lays);
        bestCC = cc;
      }
    }
    this.assignOrder(best);
    return this;
  }

  orderInit() {
    let ns = this.nodes().filter(n => !this.children(n)?.length);
    const r = this.maxRank(ns);
    const lays = qu.range(r + 1).map(() => [] as string[]);
    const done = new Set<string>();
    const walk = (n: string) => {
      if (!done.has(n)) {
        done.add(n);
        lays[this.node(n)!.rank].push(n);
        this.succs(n)?.forEach(walk);
      }
    };
    ns = ns.sort((n, m) => this.node(n)!.rank - this.node(m)!.rank);
    ns.forEach(walk);
    return lays;
  }

  maxRank(ns?: string[]) {
    const rs = (ns ?? this.nodes())
      .map(n => this.node(n)?.rank)
      .filter(r => r !== undefined) as number[];
    return Math.max(...rs);
  }

  layer(rank: number, ins: boolean): Graph<G, N, E> {
    const root = this.createRoot();
    const lg = qu.cloneMixins(this, {isCompound: true}) as this;
    lg.setData({root: root} as G).setDefNode((n: string) => this.node(n));
    const links = (ins ? this.inLinks : this.outLinks).bind(this);
    this.nodes().forEach(n => {
      const nd = this.node(n)!;
      if (nd.rank === rank || (nd.minRank <= rank && rank <= nd.maxRank)) {
        lg.setNode(n);
        lg.setParent(n, this.parent(n) ?? root);
        links(n)?.forEach(l => {
          const m = l.nodes[0] === n ? l.nodes[1] : l.nodes[0];
          const w = lg.edge([m, n])?.weight ?? 0;
          lg.setEdge([m, n], {weight: this.edge(l)!.weight + w} as E);
        });
        if (nd.minRank !== undefined) {
          const l = nd.border?.left?.[rank];
          const r = nd.border?.right?.[rank];
          const b = {left: l ? [l] : l, right: r ? [r] : r} as qt.Border;
          lg.setNode(n, {border: b} as N);
        }
      }
    });
    return lg;
  }

  layMatrix() {
    const lays = qu.range(this.maxRank() + 1).map(() => [] as string[]);
    this.nodes().forEach(n => {
      const nd = this.node(n);
      const r = nd?.rank;
      if (r !== undefined) lays[r][nd!.order] = n;
    });
    return lays;
  }

  subConstraints(cg: Graph<G, N, E>, ns: string[]) {
    const prev = new Map<string, string>();
    let root: string | undefined;
    ns.forEach(n => {
      let c = this.parent(n);
      while (c) {
        const p = this.parent(c);
        let oc: string | undefined;
        if (p) {
          oc = prev.get(p);
          prev.set(p, c);
        } else {
          oc = root;
          root = c;
        }
        if (oc && oc !== c) {
          cg.setEdge([oc, c]);
          return;
        }
        c = p;
      }
    });
  }

  crossCount(lays: string[][]) {
    let c = 0;
    for (let i = 1; i < lays.length; ++i) {
      c += this.crossLayers(lays[i - 1], lays[i]);
    }
    return c;
  }

  private createRoot() {
    let n: string;
    while (this.hasNode((n = _.uniqueId('_root'))));
    return n;
  }

  private assignOrder(lays: string[][]) {
    lays.forEach(lay => lay.forEach((n, i) => (this.node(n)!.order = i)));
  }

  private crossLayers(l0: string[], l1: string[]) {
    const pos = new Map(Array.from(l1, (n, i) => [n, i] as [string, number]));
    const es = l0
      .map(n => {
        return _.sortBy(
          this.outLinks(n)?.map(l => {
            return {pos: pos.get(l.nodes[1])!, weight: this.edge(l)!.weight};
          }),
          'pos'
        );
      })
      .flat();
    let idx = 1;
    while (idx < l1.length) idx <<= 1;
    const tree = Array.from({length: 2 * idx - 1}, () => 0);
    idx -= 1;
    let c = 0;
    es.forEach(e => {
      let i = e.pos + idx;
      tree[i] += e.weight;
      let s = 0;
      while (i > 0) {
        if (i % 2) s += tree[i + 1];
        i = (i - 1) >> 1;
        tree[i] += e.weight;
      }
      c += e.weight * s;
    });
    return c;
  }

  private sweepGraphs(gs: Graph<G, N, E>[], biasRight: boolean) {
    const c = qu.cloneMixins(this, this as qg.Opts) as this;
    gs.forEach(g => {
      const s = g.sortSubgraph(g.data!.root, c, biasRight);
      s.ns.forEach((n, i) => (g.node(n)!.order = i));
      g.subConstraints(c, s.ns);
    });
  }
}
