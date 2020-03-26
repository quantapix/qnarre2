/* eslint-disable @typescript-eslint/no-empty-interface */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qt from './types';

export interface Gdata {
  fakes: string[];
  nestRoot: string;
  rankFactor: number;
}
export interface Ndata extends qt.Named, qt.Area {
  border: qt.Border;
  borderType: string;
  fake: boolean | string;
  link: qg.Link<any>;
  maxRank: number;
  minRank: number;
  rank: number;
}
export interface Edata extends qt.Named {
  minlen: number;
  nestEdge: boolean;
  weight: number;
}

export interface Graph<G extends Gdata, N extends Ndata, E extends Edata>
  extends qg.Graph<G, N, E> {}

export class Graph<G extends Gdata, N extends Ndata, E extends Edata> {
  runNest() {
    const r = this.addFake('root', {} as N, '_root');
    const ds = this.treeDepths();
    const h = Math.max(...Array.from(ds.values())) - 1;
    const sep = 2 * h + 1;
    this.data!.nestRoot = r;
    this.edges().forEach(e => (this.edge(e)!.minlen *= sep));
    const w = this.sumWeights() + 1;
    const walk = (n: string) => {
      const cs = this.children(n);
      if (cs !== undefined && !cs.length) {
        if (n !== r) this.setEdge([r, n], {weight: 0, minlen: sep} as E);
        return;
      }
      const top = this.addBorderNode('_bt');
      const bot = this.addBorderNode('_bb');
      const nd = this.node(n)!;
      this.setParent(top, n);
      if (!nd.border) nd.border = {} as qt.Border;
      nd.border.top = [top];
      this.setParent(bot, n);
      nd.border.bottom = [bot];
      cs!.forEach(c => {
        walk(c);
        const cd = this.node(c)!;
        const ctop = cd.border?.top ?? c;
        const cbot = cd.border?.bottom ?? c;
        const cw = cd.border?.top ? w : 2 * w;
        const clen = ctop !== cbot ? 1 : h - ds.get(n)! + 1;
        this.setEdge([top, ctop], {
          weight: cw,
          minlen: clen,
          nestEdge: true
        } as E);
        this.setEdge([cbot, bot], {
          weight: cw,
          minlen: clen,
          nestEdge: true
        } as E);
      });
      if (!this.parent(n)) {
        this.setEdge([r, top], {weight: 0, minlen: h + ds.get(n)!} as E);
      }
    };
    this.children()?.forEach(n => walk(n));
    this.data!.rankFactor = sep;
    return this;
  }

  undoNest() {
    const gd = this.data!;
    this.delNode(gd.nestRoot);
    delete gd.nestRoot;
    this.edges().forEach(e => {
      const ed = this.edge(e)!;
      if (ed.nestEdge) this.delEdge(e);
    });
    return this;
  }

  private treeDepths() {
    const ds = new Map<string, number>();
    const walk = (n: string, depth: number) => {
      this.children(n)?.forEach(c => walk(c, depth + 1));
      ds.set(n, depth);
    };
    this.children()?.forEach(n => walk(n, 1));
    return ds;
  }

  private sumWeights() {
    return _.reduce(this.edges(), (s, e) => s + this.edge(e)!.weight, 0);
  }

  addFake(type: string, nd: N, name: string) {
    let n: string;
    do {
      n = _.uniqueId(name);
    } while (this.hasNode(n));
    nd.fake = type;
    this.setNode(n, nd);
    return n;
  }

  fakeChains() {
    const po = this.nestOrdering();
    this.data?.fakes.forEach(n => {
      let nd = this.node(n)!;
      const l = nd.link;
      const path = this.findPath(po, l.nodes);
      const p = path.path;
      const lca = path.lca;
      let i = 0;
      let m = p[i];
      let ascending = true;
      while (n !== l.nodes[1]) {
        nd = this.node(n)!;
        if (ascending) {
          while ((m = p[i]) !== lca && this.node(m)!.maxRank < nd.rank) i++;
          if (m === lca) ascending = false;
        }
        if (!ascending) {
          while (
            i < p.length - 1 &&
            this.node((m = p[i + 1]))!.minRank <= nd.rank
          ) {
            i++;
          }
          m = p[i];
        }
        this.setParent(n, m);
        n = this.succs(n)![0];
      }
    });
    return this;
  }

  private nestOrdering() {
    const po = new Map<string, {low: number; lim: number}>();
    let lim = 0;
    const walk = (n: string) => {
      const low = lim;
      this.children(n)?.forEach(walk);
      po.set(n, {low: low, lim: lim++});
    };
    this.children()?.forEach(walk);
    return po;
  }

  private findPath(po: Map<string, {low: number; lim: number}>, ns: string[]) {
    const [n0, n1] = ns;
    const low = Math.min(po.get(n0)!.low, po.get(n1)!.low);
    const lim = Math.max(po.get(n0)!.lim, po.get(n1)!.lim);
    const p0 = [] as string[];
    const p1 = [] as string[];
    let p = n0;
    do {
      p = this.parent(p)!;
      p0.push(p);
    } while (p && (po.get(p)!.low > low || lim > po.get(p)!.lim));
    const lca = p;
    p = n1;
    while ((p = this.parent(p)!) !== lca) {
      p1.push(p);
    }
    return {path: p0.concat(p1.reverse()), lca: lca};
  }

  addBorders() {
    const walk = (n: string) => {
      const cs = this.children(n);
      if (cs) cs.forEach(walk);
      const nd = this.node(n);
      if (nd?.minRank !== undefined) {
        if (!nd.border) nd.border = {} as qt.Border;
        nd.border.left = [] as string[];
        nd.border.right = [] as string[];
        for (let r = nd.minRank, mx = nd.maxRank + 1; r < mx; r++) {
          this.addBorder(true, '_bl', n, nd, r);
          this.addBorder(false, '_br', n, nd, r);
        }
      }
    };
    this.children()?.forEach(walk);
    return this;
  }

  private addBorderNode(pre: string, rank?: number, order?: number) {
    let nd = {w: 0, h: 0} as N;
    if (rank !== undefined) nd = {...nd, rank: rank};
    if (order !== undefined) nd = {...nd, order: order};
    return this.addFake('border', nd, pre);
  }

  private addBorder(
    left: boolean,
    pre: string,
    sg: string,
    nd: N,
    rank: number
  ) {
    const d = {
      w: 0,
      h: 0,
      rank: rank,
      borderType: left ? 'left' : 'right'
    } as N;
    const b = left ? nd.border.left : nd.border.right;
    const prev = b[rank - 1];
    const n = this.addFake('border', d, pre);
    b[rank] = n;
    this.setParent(n, sg);
    if (prev) this.setEdge([prev, n], {weight: 1} as E);
  }

  succWeights() {
    const ms = this.nodes().map(n => {
      const ws = new Weights();
      this.outLinks(n)?.forEach(l => {
        ws.set(l.nodes[1], (ws.get(l.nodes[1]) ?? 0) + this.edge(l)!.weight);
      });
      return [n, ws] as [string, Weights];
    });
    return new Map<string, Weights>(ms);
  }

  predWeights() {
    const ms = this.nodes().map(n => {
      const ws = new Weights();
      this.inLinks(n)?.forEach(l => {
        ws.set(l.nodes[0], (ws.get(l.nodes[0]) ?? 0) + this.edge(l)!.weight);
      });
      return [n, ws] as [string, Weights];
    });
    return new Map<string, Weights>(ms);
  }
}

export class Weights extends Map<string, number> {}
