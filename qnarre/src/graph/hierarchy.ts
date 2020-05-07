import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qc from './cluster';
import * as qe from './edata';
import * as qg from './graph';
import * as qm from './meta';
import * as qp from './params';
import * as qs from './slim';
import * as qt from './types';
import * as qu from './utils';

import * as proto from './proto';
import * as templ from './template';

export class Hierarchy implements qg.Hierarchy {
  root: qc.Nmeta;
  hasShape = false;
  maxEdgeSize = 1;
  devs = [] as string[];
  clus = [] as string[];
  libs = {} as qt.Dict<qg.Library>;
  orders = {} as qt.Dict<qt.Dict<number>>;
  templs = {} as qt.Dict<qg.Template>;
  private _nodes = new qg.Nodes<qg.Ncomb>();

  constructor(public opts = {} as qg.Opts) {
    this.opts.isCompound = true;
    this.root = new qc.Nmeta(qp.ROOT, this.opts);
    this.setNode(qp.ROOT, this.root);
  }

  nodes() {
    return Array.from(this._nodes.keys());
  }

  node(x: any) {
    return this._nodes.get(String(x));
  }

  setNode(x: any, d?: qg.Ncomb) {
    const n = String(x);
    this._nodes.set(n, d);
    return this;
  }

  bridge(x: any) {
    const n = String(x);
    const nd = this.node(n);
    if (!qg.isClus(nd)) return undefined;
    if (nd.bridge) return nd.bridge;
    const b = qg.createGraph<qg.Gdata, qg.Ncomb, qg.Edata>(
      qt.GdataT.BRIDGE,
      'BRIDGEGRAPH',
      this.opts
    ) as qg.Bgraph;
    nd.bridge = b;
    const p = nd.parent;
    if (p) {
      [p.meta, this.bridge(p.name)].forEach(g => {
        g?.links()
          .filter(l => l.nodes[0] === n || l.nodes[1] === n)
          .forEach(l => {
            const ed = g.edge(l) as qg.Emeta;
            const inbound = l.nodes[1] === n;
            ed?.links.forEach(l2 => {
              let [desc, n1] = l2.nodes;
              if (inbound) [n1, desc] = l2.nodes;
              const c = this.childName(n, desc)!;
              const d = [inbound ? n1 : c, inbound ? c : n1];
              let m = b.edge(d) as qe.Emeta;
              if (!m) {
                m = new qe.Emeta(inbound);
                b.setEdge(d, m);
              }
              m.addLink(b.link(d)!, this);
            });
          });
      });
    }
    return b;
  }

  childName(n: string, desc: any) {
    let d = this.node(desc) as qg.Ndata | undefined;
    while (d) {
      if (d.parent?.name === n) return d.name;
      d = d.parent;
    }
    return undefined;
  }

  size(l: qg.Link) {
    const n = this.node(l.nodes[0]) as qg.Noper;
    if (!n.shapes.length) return 1;
    this.hasShape = true;
    const vs = n.shapes.map(s => s.reduce((a, v) => a * (v === -1 ? 1 : v), 1));
    return _.sum(vs);
  }

  preds(n: string) {
    const nd = this.node(n)!;
    const ps = this.oneWays(nd, true);
    if (qg.isOper(nd)) {
      nd.embeds.in.forEach(b => {
        nd.ins.forEach(i => {
          if (i.name === b.name) {
            const m = new qe.Emeta(true);
            const l = new qg.Link([b.name, n], this.opts);
            l.data = {
              control: i.control,
              out: i.out
            } as qg.Edata;
            m.addLink(l, this);
            ps.regular.push(m);
          }
        });
      });
    }
    return ps;
  }

  succs(n: string) {
    const nd = this.node(n)!;
    const ss = this.oneWays(nd, false);
    if (qg.isOper(nd)) {
      nd.embeds.out.forEach(b => {
        b.ins.forEach(i => {
          if (i.name === n) {
            const m = new qe.Emeta();
            const l = new qg.Link([n, b.name], this.opts);
            l.data = {
              control: i.control,
              out: i.out
            } as qg.Edata;
            m.addLink(l, this);
            ss.regular.push(m);
          }
        });
      });
    }
    return ss;
  }

  oneWays(n: qg.Ncomb, inbound: boolean) {
    const es = new Edges();
    const p = n.parent;
    if (qg.isClus(p)) {
      const m = p.meta!;
      let ls = inbound ? m.inLinks(p.name) : m.outLinks(p.name);
      es.update(ls);
      const b = this.bridge(p.name);
      if (b) {
        ls = inbound ? b.inLinks(p.name) : b.outLinks(p.name);
        es.update(ls);
      }
    }
    return es;
  }

  order(n: string) {
    const nd = this.node(n);
    if (!nd) throw Error('Could not find node: ' + n);
    const o = {} as qt.Dict<number>;
    if (qg.isClus(nd)) {
      if (n in this.orders) return this.orders[n];
      const succs = {} as qt.Dict<string[]>;
      const dests = {} as qt.Dict<boolean>;
      const m = nd.meta!;
      m.links().forEach(l => {
        const ed = m.edge(l)! as qg.Emeta;
        if (!ed.num.regular) return;
        const [n0, n1] = l.nodes;
        if (!(n0 in succs)) succs[n0] = [];
        succs[n0].push(n1);
        dests[n1] = true;
      });
      const q: string[] = _.difference(_.keys(succs), _.keys(dests));
      this.orders[n] = o;
      let i = 0;
      while (q.length) {
        const c = q.shift()!;
        o[c] = i++;
        _.each(succs[c], (s: string) => q.push(s));
        delete succs[c];
      }
    }
    return o;
  }

  indexer(): (n: string) => number {
    const ns = d3.keys(this.templs ?? {});
    const idx = d3
      .scaleOrdinal()
      .domain(ns)
      .range(d3.range(0, ns.length));
    return (t: string) => idx(t) as number;
  }

  addNodes(g: qs.Slim) {
    const os = {} as qt.Dict<qg.Noper[]>;
    _.each(g.opers, o => {
      const path = qu.hierPath(o.name);
      let p = this.root;
      p.depth = Math.max(path.length, p.depth);
      if (!os[o.op]) os[o.op] = [];
      os[o.op].push(o);
      for (let i = 0; i < path.length; i++) {
        p.depth = Math.max(p.depth, path.length - i);
        p.cardin += o.cardin;
        qu.updateHistos(p.histo, o);
        qu.updateCompat(p.histo, o);
        o.embeds.in.forEach(b => qu.updateCompat(p.histo, b));
        o.embeds.out.forEach(b => qu.updateCompat(p.histo, b));
        if (i === path.length - 1) break;
        const n = path[i];
        let m = this.node(n) as qc.Nmeta;
        if (!m) {
          m = new qc.Nmeta(n, this.opts);
          m.parent = p;
          this.setNode(n, m);
          p.meta!.setNode(n, m);
          if (n.startsWith(qp.LIB_PRE) && p.name === qp.ROOT) {
            const f = n.substring(qp.LIB_PRE.length);
            if (!os[f]) os[f] = [];
            this.libs[f] = {meta: m, usages: os[f]};
            m.assoc = f;
          }
        }
        p = m;
      }
      this.setNode(o.name, o);
      o.parent = p;
      p.meta!.setNode(o.name, o);
      o.embeds.in.forEach(b => {
        this.setNode(b.name, b);
        b.parent = o;
      });
      o.embeds.out.forEach(b => {
        this.setNode(b.name, b);
        b.parent = o;
      });
    });
    return this;
  }

  addEdges(g: qs.Slim, _series: qt.Dict<string>) {
    const src = [] as string[];
    const dst = [] as string[];
    function path(p: string[], n?: qg.Ndata) {
      let i = 0;
      while (n) {
        p[i++] = n.name;
        n = n.parent;
      }
      return i - 1;
    }
    g.links.forEach(l => {
      let si = path(src, g.opers[l.nodes[0]]);
      let di = path(dst, g.opers[l.nodes[1]]);
      if (si === -1 || di === -1) return;
      while (src[si] === dst[di]) {
        si--;
        di--;
        if (si < 0 || di < 0) throw Error('No difference in ancestors');
      }
      const n = this.node(src[si + 1]) as qg.Nclus;
      const sd = [src[si], dst[di]];
      let m = n.meta!.edge(sd) as qe.Emeta;
      if (!m) {
        m = new qe.Emeta();
        n.meta!.setEdge(sd, m);
      }
      if (!n.noControls && !m.control) n.noControls = true;
      m.addLink(n.meta!.link(sd)!, this);
    });
  }

  mergeStats(_stats: proto.StepStats) {
    const ds = {} as qt.Dict<boolean>;
    const cs = {} as qt.Dict<boolean>;
    this.root.leaves().forEach(n => {
      const d = this.node(n) as qg.Noper;
      if (d.dev) ds[d.dev] = true;
      if (d.clus) cs[d.clus] = true;
    });
    this.devs = _.keys(ds);
    this.clus = _.keys(cs);
    this.nodes().forEach(n => {
      const nd = this.node(n);
      if (qg.isClus(nd)) {
        nd.stats = new qu.Stats([]);
        nd.histo.dev = {};
      }
    });
    this.root.leaves().forEach(n => {
      let nd: qg.Ndata | undefined = this.node(n);
      while (nd?.parent) {
        const p = nd.parent;
        if (!qg.isClus(nd) && qg.isClus(p)) qu.updateHistos(p.histo, nd);
        if (nd.stats) p?.stats?.combine(nd.stats);
        nd = p;
      }
    });
  }

  incompats(ps: qt.HierPs) {
    const ns = [] as qg.Ncomb[];
    const added = {} as qt.Dict<qg.Nlist>;
    this.root.leaves().forEach(n => {
      const d = this.node(n);
      if (d?.type === qt.NdataT.OPER) {
        const nd = d as qg.Noper;
        if (!nd.compatible) {
          if (nd.list) {
            if (ps && ps.groups[nd.list] === false) {
              ns.push(nd);
            } else {
              if (!added[nd.list]) {
                const ss = this.node(nd.list) as qg.Nlist;
                if (ss) {
                  added[nd.list] = ss;
                  ns.push(ss);
                }
              }
            }
          } else ns.push(nd);
        }
        nd.embeds.in.forEach(e => {
          if (!e.compatible) ns.push(e);
        });
        nd.embeds.out.forEach(e => {
          if (!e.compatible) ns.push(e);
        });
      }
    });
    return ns;
  }

  groups() {
    const gs = this.nodes().reduce((a, n) => {
      const nd = this.node(n)!;
      if (nd.type !== qt.NdataT.META) return a;
      const m = nd as qc.Nmeta;
      const s = m.signature();
      const level = n.split('/').length - 1;
      const t = a[s] || {nodes: [], level};
      a[s] = t;
      t.nodes.push(m);
      if (t.level > level) t.level = level;
      return a;
    }, {} as qt.Dict<qg.Group>);
    return _.keys(gs)
      .map(k => [k, gs[k]] as [string, qg.Group])
      .filter(([_, g]) => {
        const {nodes} = g;
        if (nodes.length > 1) return true;
        const n = nodes[0];
        return n.type === qt.NdataT.META && n.assoc;
      })
      .sort(([_, g]) => g.nodes[0].depth);
  }
}

class Edges implements qg.Edges {
  control = [] as qg.Emeta[];
  regular = [] as qg.Emeta[];

  update(ls?: qg.Link[]) {
    ls?.forEach(l => {
      const m = l.data as qg.Emeta;
      const ts = m.num.regular ? this.regular : this.control;
      ts.push(m);
    });
  }
}

export async function build(
  s: qs.Slim,
  ps: qt.HierPs,
  t: qt.Tracker
): Promise<Hierarchy> {
  const h = new Hierarchy({rankdir: ps.rankdir} as qg.Opts);
  const run = qu.Task.runAsync;
  await run(t, 'Add nodes', 20, () => {
    const ds = {} as qt.Dict<boolean>;
    const cs = {} as qt.Dict<boolean>;
    _.each(s.opers, o => {
      if (o.dev) ds[o.dev] = true;
      if (o.clus) cs[o.clus] = true;
    });
    h.devs = _.keys(ds);
    h.clus = _.keys(cs);
    h.addNodes(s);
  });
  const ns = {} as qt.Dict<string>;
  await run(t, 'Find lists', 20, () => {
    if (ps.thresh > 0) qm.Mgraph.build.call(h.root.meta!, h, ns, ps);
  });
  await run(t, 'Add edges', 30, () => h.addEdges(s, ns));
  await run(t, 'Patterns', 30, () => (h.templs = templ.detect(h, !!ps.verify)));
  return h;
}
