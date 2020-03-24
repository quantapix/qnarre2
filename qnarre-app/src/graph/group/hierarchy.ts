import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qg from './graph';
import * as qp from './params';
import * as qs from './slim';
import * as qt from './types';
import * as qu from './util';

import * as proto from './proto';
import * as series from './series';
import * as template from './template';

type Ngroup = qg.Ngroup | qg.Noper;
type Emeta = qg.Emeta;

export class Hierarchy implements qg.Hierarchy {
  root: qg.Nmeta;
  hasShape = false;
  maxEdgeSize = 1;
  devices = [] as string[];
  clusters = [] as string[];
  libfns = {} as qt.Dict<qg.LibraryFn>;
  orders = {} as qt.Dict<qt.Dict<number>>;
  templates = {} as qt.Dict<qg.Template>;
  private _nodes = new qt.Nodes<Ngroup>();

  constructor(public opts = {} as qt.Opts) {
    this.opts.isCompound = true;
    this.root = new qg.Nmeta(qp.ROOT_NAME, this.opts);
    this.setNode(qp.ROOT_NAME, this.root);
  }

  nodes() {
    return Array.from(this._nodes.keys());
  }

  node(x: any) {
    return this._nodes.get(String(x));
  }

  setNode(x: any, d?: Ngroup) {
    const n = String(x);
    this._nodes.set(n, d);
    return this;
  }

  bridge(x: any) {
    const n = String(x);
    const nd = this.node(n);
    if (!qg.isGroup(nd)) return undefined;
    if (nd.bridge) return nd.bridge;
    const b = qg.createGraph<qg.Gdata, Ngroup, Emeta>(
      'BRIDGEGRAPH',
      qt.GraphType.BRIDGE,
      this.opts
    );
    nd.bridge = b;
    const p = nd.parent;
    if (p) {
      [p.meta, this.bridge(p.name)].forEach(g => {
        g?.links()
          .filter(l => l.nodes[0] === n || l.nodes[1] === n)
          .forEach(l => {
            const inbound = l.nodes[1] === n;
            g.edge(l)!.links.forEach(l2 => {
              let [desc, n1] = l2.nodes;
              if (inbound) [n1, desc] = l2.nodes;
              const c = this.childName(n, desc)!;
              const d = [inbound ? n1 : c, inbound ? c : n1];
              let m = b.edge(d);
              if (!m) {
                m = new qg.Emeta(inbound);
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
    let d: qg.Ndata | undefined = this.node(desc);
    while (d) {
      if (d.parent?.name === n) return d.name;
      d = d.parent;
    }
    throw Error('No child for desc: ' + desc);
  }

  sizeOf(l: qt.Link<qg.Edata>) {
    const n = this.node(l.nodes[0]) as qg.Noper;
    if (!n.shapes.length) return 1;
    this.hasShape = true;
    const vs = n.shapes.map(s => s.reduce((a, v) => a * (v === -1 ? 1 : v), 1));
    return _.sum(vs);
  }

  preds(n: string) {
    const nd = this.node(n);
    if (!nd) throw Error('Could not find node: ' + n);
    const ps = this.oneWays(nd, true);
    if (!qg.isGroup(nd)) {
      nd.inbeds.forEach(b => {
        nd.ins.forEach(i => {
          if (i.name === b.name) {
            const m = new qg.Emeta(true);
            const l = new qt.Link<qg.Edata>([b.name, n], this.opts);
            l.data = {
              isControl: i.isControl,
              isRef: false,
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
    const nd = this.node(n);
    if (!nd) throw Error('Could not find node: ' + n);
    const ss = this.oneWays(nd, false);
    if (!qg.isGroup(nd)) {
      nd.outbeds.forEach(b => {
        b.ins.forEach(i => {
          if (i.name === n) {
            const m = new qg.Emeta();
            const l = new qt.Link<qg.Edata>([n, b.name], this.opts);
            l.data = {
              isControl: i.isControl,
              isRef: false,
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

  oneWays(n: Ngroup, inbound: boolean) {
    const es = new Edges();
    const p = n.parent;
    if (qg.isGroup(p)) {
      const m = p.meta;
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
    if (qg.isGroup(nd)) {
      if (n in this.orders) return this.orders[n];
      const succs = {} as qt.Dict<string[]>;
      const dests = {} as qt.Dict<boolean>;
      const m = nd.meta;
      m.links().forEach(l => {
        if (!m.edge(l)?.num.regular) return;
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
    const ns = d3.keys(this.templates ?? {});
    const idx = d3
      .scaleOrdinal()
      .domain(ns)
      .range(d3.range(0, ns.length));
    return (t: string) => idx(t) as number;
  }

  addNodes(g: qs.SlimGraph) {
    const os = {} as qt.Dict<qg.Noper[]>;
    _.each(g.opers, o => {
      const path = qs.hierarchyPath(o.name);
      let p = this.root;
      p.depth = Math.max(path.length, p.depth);
      if (!os[o.op]) os[o.op] = [];
      os[o.op].push(o);
      for (let i = 0; i < path.length; i++) {
        p.depth = Math.max(p.depth, path.length - i);
        p.cardinality += o.cardinality;
        p.incHistoFrom(o);
        p.incCompatFrom(o);
        o.inbeds.forEach(b => p.incCompatFrom(b));
        o.outbeds.forEach(b => p.incCompatFrom(b));
        if (i === path.length - 1) break;
        const n = path[i];
        let meta = this.node(n) as qg.Nmeta;
        if (!meta) {
          meta = new qg.Nmeta(n, this.opts);
          meta.parent = p;
          this.setNode(n, meta);
          p.meta.setNode(n, meta);
          if (n.startsWith(qp.LIBRARY_PREFIX) && p.name === qp.ROOT_NAME) {
            const f = n.substring(qp.LIBRARY_PREFIX.length);
            if (!os[f]) os[f] = [];
            this.libfns[f] = {meta, usages: os[f]};
            meta.assocFn = f;
          }
        }
        p = meta;
      }
      this.setNode(o.name, o);
      o.parent = p;
      p.meta.setNode(o.name, o);
      o.inbeds.forEach(b => {
        this.setNode(b.name, b);
        b.parent = o;
      });
      o.outbeds.forEach(b => {
        this.setNode(b.name, b);
        b.parent = o;
      });
    });
    return this;
  }

  addEdges(g: qs.SlimGraph, _series: qt.Dict<string>) {
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
      const n = this.node(src[si + 1]) as qg.Ngroup;
      const sd = [src[si], dst[di]];
      let m = n.meta.edge(sd);
      if (!m) {
        m = new qg.Emeta();
        n.meta.setEdge(sd, m);
      }
      if (!n.noControls && !m.isControl) n.noControls = true;
      m!.addLink(n.meta.link(sd)!, this);
    });
  }

  mergeStats(_stats: proto.StepStats) {
    const ds = {} as qt.Dict<boolean>;
    const cs = {} as qt.Dict<boolean>;
    this.root.leaves().forEach(n => {
      const d = this.node(n) as qg.Noper;
      if (d.device) ds[d.device] = true;
      if (d.cluster) cs[d.cluster] = true;
    });
    this.devices = _.keys(ds);
    this.clusters = _.keys(cs);
    this.nodes().forEach(n => {
      const nd = this.node(n);
      if (qg.isGroup(nd)) {
        nd.stats = new qg.Stats([]);
        nd.histo.device = {};
      }
    });
    this.root.leaves().forEach(n => {
      let nd: qg.Ndata | undefined = this.node(n);
      while (nd?.parent) {
        const p = nd.parent;
        if (!qg.isGroup(nd) && qg.isGroup(p)) p.incHistoFrom(nd);
        if (nd.stats) p?.stats?.combine(nd.stats);
        nd = p;
      }
    });
  }

  incompats(ps: Params) {
    const ns = [] as Ngroup[];
    const added = {} as qt.Dict<qg.Nseries>;
    this.root.leaves().forEach(n => {
      const d = this.node(n);
      if (d?.type === qt.NodeType.OPER) {
        const nd = d as qg.Noper;
        if (!nd.compatible) {
          if (nd.series) {
            if (ps && ps.groups[nd.series] === false) {
              ns.push(nd);
            } else {
              if (!added[nd.series]) {
                const ss = this.node(nd.series) as qg.Nseries;
                if (ss) {
                  added[nd.series] = ss;
                  ns.push(ss);
                }
              }
            }
          } else ns.push(nd);
        }
        nd.inbeds.forEach(e => {
          if (!e.compatible) ns.push(e);
        });
        nd.outbeds.forEach(e => {
          if (!e.compatible) ns.push(e);
        });
      }
    });
    return ns;
  }

  groups() {
    const gs = this.nodes().reduce((a, n) => {
      const nd = this.node(n)!;
      if (nd.type !== qt.NodeType.META) return a;
      const m = nd as qg.Nmeta;
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
        return n.type === qt.NodeType.META && n.assocFn;
      })
      .sort(([_, g]) => g.nodes[0].depth);
  }
}

class Edges {
  control = [] as qg.Emeta[];
  regular = [] as qg.Emeta[];

  update(ls?: qt.Link<Emeta>[]) {
    ls?.forEach(l => {
      const m = l.data!;
      const ts = m.num.regular ? this.regular : this.control;
      ts.push(m);
    });
  }
}

export interface Params {
  thresh: number;
  rankdir: qt.Dir;
  verify: boolean;
  patterns: boolean;
  groups: qt.Dict<boolean>;
}

export async function build(
  g: qs.SlimGraph,
  ps: Params,
  t: qu.Tracker
): Promise<Hierarchy> {
  const h = new Hierarchy({rankdir: ps.rankdir} as qt.Opts);
  const ss = {} as qt.Dict<string>;
  await t.runAsyncTask('Add nodes', 20, () => {
    const ds = {} as qt.Dict<boolean>;
    const cs = {} as qt.Dict<boolean>;
    _.each(g.opers, o => {
      if (o.device) ds[o.device] = true;
      if (o.cluster) cs[o.cluster] = true;
    });
    h.devices = _.keys(ds);
    h.clusters = _.keys(cs);
    h.addNodes(g);
  });
  await t.runAsyncTask('Find series', 20, () => {
    if (ps.thresh > 0) series.group(h.root, h, ss, ps);
  });
  await t.runAsyncTask('Add edges', 30, () => h.addEdges(g, ss));
  await t.runAsyncTask(
    'Find similars',
    30,
    () => (h.templates = template.detect(h, ps.verify))
  );
  return h;
}
