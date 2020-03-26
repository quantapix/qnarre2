/* eslint-disable @typescript-eslint/no-empty-interface */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qt from './types';
import * as qu from './utils';

export interface Ndata extends qt.Named {
  order: number;
  border: qt.Border;
}
export interface Edata extends qt.Named {
  weight: number;
}

export interface Graph<G, N extends Ndata, E extends Edata>
  extends qg.Graph<G, N, E> {}

export class Graph<G, N extends Ndata, E extends Edata> {
  sortSubgraph(n: string, g: Graph<G, N, E>, bias = false) {
    const nd = this.node(n);
    const bl = nd?.border?.left;
    const br = nd?.border?.right;
    let ns = this.children(n) ?? [];
    if (bl) ns = ns.filter(n => n !== bl[0] && n !== br![0]);
    const subs = new Map<string, Mass>();
    const ms = this.masses(ns);
    ms.forEach(m => {
      const n = m.ns[0];
      if (this.children(n)?.length) {
        const s = this.sortSubgraph(n, g, bias);
        subs.set(n, s);
        m.add(s);
      }
    });
    const cs = g.conflicts(ms);
    expand(cs, subs);
    const m = sort(cs, bias);
    if (bl) {
      m.ns = [bl, m.ns, br].flat();
      if (this.preds(bl)?.length) {
        const v = m.value ?? 0;
        const w = m.weight ?? 0;
        const l = this.node(this.preds(bl)![0])!;
        const r = this.node(this.preds(br)![0])!;
        m.value = (v * w + l.order + r.order) / (w + 2);
        m.weight = w + 2;
      }
    }
    return m;
  }

  masses(ns: string[]) {
    return ns.map(n => {
      const ls = this.inLinks(n);
      if (ls?.length) {
        const r = ls.reduce(
          (a, l) => {
            const w = this.edge(l)!.weight;
            const o = this.node(l.nodes[0])!.order;
            return {s: a.s + w * o, w: a.w + w};
          },
          {s: 0, w: 0}
        );
        return new Mass([n], r.s / r.w, r.w);
      }
      return new Mass([n]);
    });
  }

  conflicts(ms: Mass[]) {
    const cs = new Map<string, Conflict>();
    ms.forEach((m, i) => {
      const c = new Conflict(m.ns, i, m.value, m.weight);
      cs.set(m.ns[0], c);
    });
    this.links().forEach(l => {
      const c0 = cs.get(l.nodes[0]);
      const c1 = cs.get(l.nodes[1]);
      if (c0 && c1) {
        c1.indegree++;
        c0.outs.push(c1);
      }
    });
    return resolve(Array.from(cs.values()).filter(c => !c.indegree));
  }
}

export class Mass {
  constructor(
    public ns: string[],
    public value?: number,
    public weight?: number
  ) {}

  add(m: Mass) {
    let v = m.value;
    let w = m.weight;
    if (this.value !== undefined) {
      qu.assert(this.weight !== undefined);
      v = v ?? 0;
      w = w ?? 0;
      v = (this.value * this.weight + v * w) / (this.weight + w);
      w += this.weight;
    }
    this.value = v;
    this.weight = w;
  }
}

export class Conflict {
  indegree = 0;
  merged = false;
  ins = [] as Conflict[];
  outs = [] as Conflict[];

  constructor(
    public ns: string[],
    public i: number,
    public mass?: number,
    public weight?: number
  ) {}

  merge(c: Conflict) {
    this.ns = c.ns.concat(this.ns);
    this.i = Math.min(c.i, this.i);
    let s = 0;
    let w = 0;
    if (this.weight) {
      s += this.mass! * this.weight;
      w += this.weight;
    }
    if (c.weight) {
      s += c.mass! * c.weight;
      w += c.weight;
    }
    if (w) {
      this.mass = s / w;
      this.weight = w;
    }
    c.merged = true;
  }
}

function expand(cs: Conflict[], subs: Map<string, Mass>) {
  cs.forEach(c => {
    c.ns = c.ns.map(n => (subs.has(n) ? subs.get(n)!.ns : n)).flat();
  });
}

export function sort(cs: Conflict[], bias = false) {
  const ps = qu.partition(cs, c => c.mass !== undefined);
  const ss = ps.lhs;
  ss.sort(compare(bias));
  const us = _.sortBy(ps.rhs, c => -c.i);
  const nss = [] as string[][];
  let i = consume(us, nss, 0);
  let s = 0;
  let w = 0;
  ss.forEach(c => {
    i += c.ns.length;
    nss.push(c.ns);
    s += c.mass! * c.weight!;
    w += c.weight!;
    i = consume(us, nss, i);
  });
  return new Mass(nss.flat(), w ? s / w : undefined, w || undefined);
}

function consume(cs: Conflict[], ns: string[][], i: number) {
  let last: Conflict;
  while (cs.length && (last = _.last(cs)!).i <= i) {
    cs.pop();
    ns.push(last.ns);
    i++;
  }
  return i;
}

function resolve(cs: Conflict[]) {
  const rs = [] as Conflict[];
  while (cs.length) {
    const c = cs.pop()!;
    rs.push(c);
    c.ins.reverse().forEach(i => {
      const f =
        i.mass === undefined || c.mass === undefined || i.mass >= c.mass;
      if (!i.merged && f) c.merge(i);
    });
    c.outs.forEach(o => {
      o.ins.push(c);
      if (--o.indegree === 0) cs.push(o);
    });
  }
  return rs.filter(c => {
    c.ins = c.outs = [] as Conflict[];
    return !c.merged;
  });
}

function compare(bias = false) {
  return (c0: Conflict, c1: Conflict) => {
    const v = c0.mass! - c1.mass!;
    const i = c0.i - c1.i;
    return v ? v : bias ? -i : i;
  };
}
