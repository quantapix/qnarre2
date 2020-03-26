import * as _ from 'lodash';

import * as qg from './graph';
import * as qt from './types';
import * as qu from './utils';

export interface Gdata {
  ranker: string;
  rankFactor: number;
}
export interface Ndata extends qt.Named {
  parent: string;
  rank: number;
  low: number;
  lim: number;
}
export interface Edata extends qt.Named {
  weight: number;
  minlen: number;
  cutval: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Graph<G extends Gdata, N extends Ndata, E extends Edata>
  extends qg.Graph<G, N, E> {}

export class Graph<G extends Gdata, N extends Ndata, E extends Edata> {
  runRank() {
    switch (this.data!.ranker) {
      case 'simplex':
        this.rankSimplex();
        break;
      case 'tree':
        this.initRank();
        this.rankTree();
        break;
      case 'path':
        this.initRank();
        break;
      default:
        this.rankSimplex();
    }
    return this;
  }

  initRank() {
    const done = new Set<string>();
    const walk = (n: string) => {
      const nd = this.node(n)!;
      if (!done.has(n)) {
        done.add(n);
        const rs = this.outLinks(n)?.map(
          l => walk(l.nodes[1]) - this.edge(l)!.minlen
        );
        nd.rank = rs?.length ? Math.min(...rs) : 0;
      }
      return nd.rank;
    };
    this.sources().forEach(walk);
  }

  rankSimplex() {
    const g = this.toCanonical();
    g.initRank();
    const t = g.rankTree();
    t.initLowLims();
    g.initCuts(t);
    let o: qg.Link<E> | undefined, n: qg.Link<E>;
    while ((o = t.leaveLink())) {
      n = g.enterLink(t, o)!;
      g.swapLinks(t, o, n);
    }
  }

  toCanonical() {
    const g = qu.cloneMixins(this, this as qg.Opts);
    g.setData(this.data);
    this.nodes().forEach(n => g.setNode(n, this.node(n)));
    this.links().forEach(l => {
      const ed = this.edge(l)!;
      const ns = l.nodes.slice(0, 2);
      const sd = g.edge(ns) ?? {weight: 0, minlen: 1};
      g.setEdge(ns, {
        weight: ed.weight + sd.weight,
        minlen: Math.max(ed.minlen, sd.minlen)
      } as E);
    });
    return g;
  }

  rankTree() {
    const t = qu.cloneMixins(this, {isDirected: false}) as this;
    const c = this.nodeCount;
    qu.assert(c);
    t.setNode(this.nodes()[0], {} as N);
    while (this.tightTree(t) < c) {
      const l = _.minBy(this.links(), l => {
        const [n0, n1] = l.nodes;
        return t.hasNode(n0) !== t.hasNode(n1) ? this.rankSlack(l) : undefined;
      })!;
      const delta = t.hasNode(l.nodes[0])
        ? this.rankSlack(l)
        : -this.rankSlack(l);
      t.nodes().forEach(n => (this.node(n)!.rank += delta));
    }
    return t;
  }

  rankSlack(l: qg.Link<E>) {
    const [n0, n1] = l.nodes;
    return this.node(n1)!.rank - this.node(n0)!.rank - this.edge(l)!.minlen;
  }

  initLowLims(root?: string) {
    const done = new Set<string>();
    const walk = (n: string, lim: number, p?: string) => {
      done.add(n);
      const low = lim;
      this.neighbors(n)?.forEach(m => {
        if (!done.has(m)) lim = walk(m, lim, n);
      });
      const nd = this.node(n)!;
      nd.low = low;
      nd.lim = lim++;
      if (p) {
        nd.parent = p;
      } else {
        delete nd.parent;
      }
      return lim;
    };
    walk(root ?? this.nodes()[0], 1);
  }

  initCuts(t: this) {
    const ns = t.rankPost(t.nodes());
    ns.slice(0, ns.length - 1).forEach(n => {
      const p = t.node(n)!.parent;
      t.edge([n, p])!.cutval = this.cutValue(t, n);
    });
  }

  rankPre(ns: string[]) {
    return this.rankOrder(ns, 'pre');
  }

  rankPost(ns: string[]) {
    return this.rankOrder(ns, 'post');
  }

  rankOrder(ns: string[], post: 'pre' | 'post') {
    const rs = [] as string[];
    const done = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const succs = (this.isDirected ? this.succs : this.neighbors).bind(this);
    const walk = (n: string, post: boolean) => {
      qu.assert(this.hasNode(n));
      if (!done.has(n)) {
        done.add(n);
        if (!post) rs.push(n);
        succs(n)?.forEach(m => walk(m, post));
        if (post) rs.push(n);
      }
    };
    ns.forEach(n => walk(n, post === 'post'));
    return rs;
  }

  cutValue(t: this, n: string) {
    const p = t.node(n)!.parent;
    let tail = true;
    let gd = this.edge([n, p]);
    if (!gd) {
      tail = false;
      gd = this.edge([p, n]);
    }
    let v = gd!.weight;
    this.nodeLinks(n)!.forEach(l => {
      const out = l.nodes[0] === n;
      const m = out ? l.nodes[1] : l.nodes[0];
      if (m !== p) {
        const head = out === tail;
        const w = this.edge(l)!.weight;
        v += head ? w : -w;
        if (t.hasEdge([n, m])) {
          const o = t.edge([n, m])!.cutval;
          v += head ? -o : o;
        }
      }
    });
    return v;
  }

  enterLink(t: this, o: qg.Link<E>) {
    let [n0, n1] = o.nodes;
    if (!this.hasEdge([n0, n1])) [n1, n0] = o.nodes;
    const d0 = t.node(n0)!;
    let tail = d0;
    let flip = false;
    const d1 = t.node(n1)!;
    if (d0.lim > d1.lim) {
      tail = d1;
      flip = true;
    }
    const isDesc = (d: N) => tail.low <= d.lim && d.lim <= tail.lim;
    const ls = this.links().filter(
      l =>
        flip === isDesc(t.node(l.nodes[0])!) &&
        flip !== isDesc(t.node(l.nodes[1])!)
    );
    return _.minBy(ls, l => this.rankSlack(l));
  }

  swapLinks(t: this, o: qg.Link<E>, n: qg.Link<E>) {
    t.delEdge(o.nodes);
    t.setEdge(n.nodes, {weight: 0} as E);
    t.initLowLims();
    this.initCuts(t);
    this.rankUpdate(t);
  }

  leaveLink() {
    return this.links().find(l => this.edge(l)!.cutval < 0);
  }

  normalizeRanks() {
    const min = Math.min(
      ...this.nodes().map(n => this.node(n)?.rank ?? Infinity)
    );
    this.nodes().forEach(n => {
      if (this.node(n)?.rank !== undefined) this.node(n)!.rank -= min;
    });
    return this;
  }

  delEmptyRanks() {
    const off = Math.min(
      ...this.nodes().map(n => this.node(n)?.rank ?? Infinity)
    );
    const lays = [] as string[][];
    this.nodes().forEach(n => {
      const r = this.node(n)!.rank - off;
      if (!lays[r]) lays[r] = [] as string[];
      lays[r].push(n);
    });
    let delta = 0;
    const f = this.data!.rankFactor;
    for (let i = 0; i < lays.length; i++) {
      const ns = lays[i];
      if (ns === undefined) {
        if (i % f !== 0) --delta;
      } else if (delta) {
        ns.forEach(n => (this.node(n)!.rank += delta));
      }
    }
    return this;
  }

  tightTree(t: this) {
    const walk = (n: string) => {
      this.nodeLinks(n)?.forEach(l => {
        const n0 = l.nodes[0];
        const m = n0 === n ? l.nodes[1] : n0;
        if (!t.hasNode(m) && !this.rankSlack(l)) {
          t.setNode(m, {} as N);
          t.setEdge([n, m], {} as E);
          walk(m);
        }
      });
    };
    t.nodes().forEach(walk);
    return t.nodeCount;
  }

  rankUpdate(t: this) {
    const root = t.nodes().find(n => !this.node(n)!.parent)!;
    t.rankPre([root])
      .slice(1)
      .forEach(n => {
        const p = t.node(n)!.parent;
        const d = this.edge([n, p])?.minlen ?? -this.edge([p, n])!.minlen;
        this.node(n)!.rank = this.node(p)!.rank - d;
      });
  }
}
