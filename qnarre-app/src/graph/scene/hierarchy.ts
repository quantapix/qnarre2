import * as _ from 'lodash';
import * as d3 from 'd3';
import * as qg from './graph';
import * as qp from './params';
import * as qt from './types';
import * as qu from './util';
import * as proto from './proto';
import * as template from './template';

type Ngroup = qg.Ngroup | qg.Noper;
type Emeta = qg.Emeta;

class Hierarchy {
  root: qg.Nmeta;
  hasShape = false;
  maxEdgeSize = 1;
  devices = [] as string[];
  clusters = [] as string[];
  libfns = {} as qt.Dict<qg.LibraryFn>;
  orders = {} as qt.Dict<qt.Dict<number>>;
  templates = {} as qt.Dict<qg.Template>;
  private _nodes = new qt.Nodes<Ngroup>();
  private _edges = new qt.Edges<Emeta>();

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
    let d = this.node(desc);
    while (d) {
      if (d.parent?.name === n) return d.name;
      d = d.parent;
    }
    throw Error('No child for desc: ' + desc);
  }

  sizeOf(l: qt.Link<Emeta>) {
    const n = this.node(l.nodes[0]) as qg.Noper;
    if (!n.outShapes.length) return 1;
    this.hasShape = true;
    const vs = n.outShapes.map(s =>
      s.reduce((a, v) => a * (v === -1 ? 1 : v), 1)
    );
    return _.sum(vs);
  }

  preds(x: any) {
    const n = String(x);
    const nd = this.node(n);
    if (!nd) throw Error('Could not find node: ' + n);
    const preds = this.oneWays(nd, true);
    if (!qg.isGroup(nd)) {
      nd.inEmbeds.forEach(en => {
        nd.ins.forEach(ni => {
          if (ni.name === en.name) {
            const m = new qg.Emeta(en.name, n);
            m.addBase(
              {
                isControl: ni.isControl,
                outKey: ni.outKey,
                isRef: false,
                v: en.name,
                w: nn
              },
              this
            );
            preds.regular.push(m);
          }
        });
      });
    }
    return preds;
  }

  succs(x: any) {
    const n = String(x);
    const nd = this.node(n);
    if (!nd) throw Error('Could not find node: ' + n);
    const succs = this.oneWays(n, false);
    if (!qg.isGroup(nd)) {
      nd.outEmbeds.forEach(en => {
        en.ins.forEach(ni => {
          if (ni.name === name) {
            const metaedge = new qg.Emeta(name, en.name);
            metaedge.addBase(
              {
                isControl: ni.isControl,
                outKey: ni.outKey,
                isRef: false,
                v: name,
                w: en.name
              },
              this
            );
            succs.regular.push(metaedge);
          }
        });
      });
    }
    return succs;
  }

  oneWays(node: qg.Ngroup | qg.Noper, inbound: boolean): qg.Edges {
    const es = new qg.Edges();
    if (!node.parent || !node.parent.isGroup) return es;
    const p = node.parent as qg.Ngroup;
    const m = p.meta;
    const b = this.getBridge(parent.name);
    es.updateTargets(m, node, inbound);
    if (b) es.updateTargets(b, node, inbound);
    return es;
  }

  getOrdering(name: string): qt.Dict<number> {
    const node = this.ns[name];
    if (!node) throw Error('Could not find node: ' + name);
    if (!node.isGroup) return {};
    if (name in this.orders) return this.orders[name];
    const succs = {} as qt.Dict<string[]>;
    const dests = {} as qt.Dict<boolean>;
    const m = (node as qg.Ngroup).meta;
    _.each(m.edges(), (e: qt.Link<qg.Edata>) => {
      if (!m.edge(e).numRegular) return;
      if (!(e.v in succs)) {
        succs[e.v] = [];
      }
      succs[e.v].push(e.w);
      dests[e.w] = true;
    });
    const queue: string[] = _.difference(_.keys(succs), _.keys(dests));
    const ord = (this.orders[name] = {} as qt.Dict<number>);
    let i = 0;
    while (queue.length) {
      const c = queue.shift()!;
      ord[c] = i++;
      _.each(succs[c], (s: string) => queue.push(s));
      delete succs[c];
    }
    return ord;
  }
  getIndexer(): (n: string) => number {
    const names = d3.keys(this.templates ?? {});
    const index = d3
      .scaleOrdinal()
      .domain(names)
      .range(d3.range(0, names.length));
    return (t: string) => index(t) as number;
  }
  addNodes(g: qg.SlimGraph) {
    const map = {} as qt.Dict<qg.Noper[]>;
    _.each(g.nodes, n => {
      const path = qg.hierarchyPath(n.name);
      let p = this.root;
      p.depth = Math.max(path.length, p.depth);
      if (!map[n.op]) map[n.op] = [];
      map[n.op].push(n);
      for (let i = 0; i < path.length; i++) {
        p.depth = Math.max(p.depth, path.length - i);
        p.cardinality += n.cardinality;
        p.histo.op[n.op] = (p.histo.op[n.op] || 0) + 1;
        if (n.device)
          p.histo.device[n.device] = (p.histo.device[n.device] || 0) + 1;
        if (n.cluster)
          p.histo.cluster[n.cluster] = (p.histo.cluster[n.cluster] || 0) + 1;
        if (n.compatible) {
          p.histo.compat.compats = (p.histo.compat.compats || 0) + 1;
        } else {
          p.histo.compat.incompats = (p.histo.compat.incompats || 0) + 1;
        }
        n.inEmbeds.forEach(e => {
          if (e.compatible) {
            p.histo.compat.compats = (p.histo.compat.compats || 0) + 1;
          } else {
            p.histo.compat.incompats = (p.histo.compat.incompats || 0) + 1;
          }
        });
        n.outEmbeds.forEach(e => {
          if (e.compatible) {
            p.histo.compat.compats = (p.histo.compat.compats || 0) + 1;
          } else {
            p.histo.compat.incompats = (p.histo.compat.incompats || 0) + 1;
          }
        });
        if (i === path.length - 1) break;
        const name = path[i];
        let c = this.node(name) as qg.Nmeta;
        if (!c) {
          c = qg.createMetaNode(name, this.opts);
          c.parent = p;
          this.setNode(name, c);
          p.meta.setNode(name, c);
          if (name.startsWith(qp.LIBRARY_PREFIX) && p.name === qp.ROOT_NAME) {
            const fn = name.substring(qp.LIBRARY_PREFIX.length);
            if (!map[fn]) map[fn] = [];
            this.libfns[fn] = {
              node: c,
              usages: map[fn]
            };
            c.assocFn = fn;
          }
        }
        p = c;
      }
      this.setNode(n.name, n);
      n.parent = p;
      p.meta.setNode(n.name, n);
      n.inEmbeds.forEach(e => {
        this.setNode(e.name, e);
        e.parent = n;
      });
      n.outEmbeds.forEach(e => {
        this.setNode(e.name, e);
        e.parent = n;
      });
    });
  }
  addEdges(g: qg.SlimGraph, _series: qt.Dict<string>) {
    const map = this.getNodeMap();
    const src = [] as string[];
    const dst = [] as string[];
    function getPath(path: string[], n?: qg.Ndata) {
      let i = 0;
      while (n) {
        path[i++] = n.name!;
        n = n.parent;
      }
      return i - 1;
    }
    g.edges.forEach(e => {
      let si = getPath(src, g.nodes[e.v]);
      let di = getPath(dst, g.nodes[e.w]);
      if (si === -1 || di === -1) return;
      while (src[si] === dst[di]) {
        si--;
        di--;
        if (si < 0 || di < 0) throw Error('No difference in ancestor paths');
      }
      const a = map[src[si + 1]] as qg.Ngroup;
      const s = src[si];
      const d = dst[di];
      let m = a.meta.edge(s, d);
      if (!m) {
        m = qg.createMetaEdge(s, d);
        a.meta.setEdge(s, d, m);
      }
      if (!a.noControls && !e.isControl) a.noControls = true;
      m!.addBase(e, this);
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
    _.each(this.getNodeMap(), n => {
      if (n.isGroup) {
        n.stats = new qt.NodeStats([]);
        (n as qg.Ngroup).histo.device = {};
      }
    });
    this.root.leaves().forEach(n => {
      const d = this.node(n) as qg.Noper;
      let nd = d as qg.Ngroup | qg.Noper;
      while (nd.parent) {
        if (d.device) {
          const h = (nd.parent as qg.Ngroup).histo.device;
          h[d.device] = (h[d.device] || 0) + 1;
        }
        if (d.cluster) {
          const h = (nd.parent as qg.Ngroup).histo.cluster;
          h[d.cluster] = (h[d.cluster] || 0) + 1;
        }
        if (d.stats) nd.parent?.stats?.combine(d.stats);
        nd = nd.parent as qg.Ngroup;
      }
    });
  }
  getIncompatsOps(ps: HierarchyParams) {
    const ns = [] as (qg.Ngroup | qg.Noper)[];
    const added = {} as qt.Dict<qg.Nseries>;
    _.each(this.root.leaves(), n => {
      const d = this.node(n);
      if (d?.type === qt.NodeType.OP) {
        const nd = d as qg.Noper;
        if (!nd.compatible) {
          if (nd.series) {
            if (ps && ps.seriesMap[nd.series] === false) {
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
        nd.inEmbeds.forEach(e => {
          if (!e.compatible) ns.push(e);
        });
        nd.outEmbeds.forEach(e => {
          if (!e.compatible) ns.push(e);
        });
      }
    });
    return ns;
  }
}

export interface HierarchyParams {
  verifyTemplate: boolean;
  seriesMinSize: number;
  seriesMap: qt.Dict<SeriesType>;
  rankdir: qt.Dir;
  usePatterns: boolean;
}

class Edges implements qt.Edges {
  control = [] as qg.Emeta[];
  regular = [] as qg.Emeta[];

  updateTargets(g: Graph, n: qg.Ndata, inbound: boolean) {
    const es = inbound ? g.inEdges(n.name) : g.outEdges(n.name);
    _.each(es, (e: qt.EdgeObject) => {
      const m = g.edge(e);
      const ts = m.numRegular ? this.regular : this.control;
      ts.push(m);
    });
  }
}

export async function build(
  g: qg.SlimGraph,
  ps: HierarchyParams,
  t: qu.Tracker
): Promise<Hierarchy> {
  const h = new Hierarchy({rankdir: ps.rankdir});
  const series = {} as qt.Dict<string>;
  await t.runAsyncTask('Adding nodes', 20, () => {
    const ds = {} as qt.Dict<boolean>;
    const cs = {} as qt.Dict<boolean>;
    _.each(g.nodes, n => {
      if (n.device) ds[n.device] = true;
      if (n.cluster) cs[n.cluster] = true;
    });
    h.devices = _.keys(ds);
    h.clusters = _.keys(cs);
    h.addNodes(g);
  });
  await t.runAsyncTask('Detecting series', 20, () => {
    if (ps.seriesMinSize > 0) {
      groupSeries(
        h.root,
        h,
        series,
        ps.seriesMinSize,
        ps.seriesMap,
        ps.usePatterns
      );
    }
  });
  await t.runAsyncTask('Adding edges', 30, () => h.addEdges(g, series));
  await t.runAsyncTask(
    'Finding similars',
    30,
    () => (h.templates = template.detect(h, ps.verifyTemplate))
  );
  return h;
}

function groupSeries(
  mn: qg.Nmeta,
  h: Hierarchy,
  names: qt.Dict<string>,
  thresh: number,
  map: qt.Dict<boolean>,
  patterns: boolean
) {
  const meta = mn.meta;
  meta.nodes().forEach(n => {
    const c = meta.node(n);
    if (c?.type === qg.NdataType.META) {
      groupSeries(c as qg.Nmeta, h, names, thresh, map, patterns);
    }
  });
  const cs = clusterNodes(meta);
  const fn = patterns ? detectSeries : detectBySuffixes;
  const dict = fn(cs, meta, h.opts);
  _.each(dict, (sn: qg.Nseries, name: string) => {
    const ns = sn.meta.nodes();
    ns.forEach(n => {
      const c = meta.node(n) as qg.Noper;
      if (!c.series) c.series = name;
    });
    if (ns.length < thresh && !(sn.name in map)) map[sn.name] = false;
    if (sn.name in map && map[sn.name] === false) {
      return;
    }
    h.setNode(name, sn);
    meta.setNode(name, sn);
    ns.forEach(n => {
      const c = meta.node(n) as qg.Noper;
      sn.meta.setNode(n, c);
      sn.parent = c.parent;
      sn.cardinality++;
      if (c.device) {
        sn.histo.device[c.device] = (sn.histo.device[c.device] || 0) + 1;
      }
      if (c.cluster) {
        sn.histo.cluster[c.cluster] = (sn.histo.cluster[c.cluster] || 0) + 1;
      }
      if (c.compatible) {
        sn.histo.compat.compats = (sn.histo.compat.compats || 0) + 1;
      } else {
        sn.histo.compat.incompats = (sn.histo.compat.incompats || 0) + 1;
      }
      c.inEmbeds.forEach(e => {
        if (e.compatible) {
          sn.histo.compat.compats = (sn.histo.compat.compats || 0) + 1;
        } else {
          sn.histo.compat.incompats = (sn.histo.compat.incompats || 0) + 1;
        }
      });
      c.outEmbeds.forEach(e => {
        if (e.compatible) {
          sn.histo.compat.compats = (sn.histo.compat.compats || 0) + 1;
        } else {
          sn.histo.compat.incompats = (sn.histo.compat.incompats || 0) + 1;
        }
      });
      c.parent = sn;
      names[n] = name;
      meta.delNode(n);
    });
  });
}

type Cluster = qt.Dict<string[]>;

function clusterNodes(g: Graph) {
  return _.reduce(
    g.nodes(),
    (cl: Cluster, n: string) => {
      const c = g.node(n);
      if (c.type === qg.NdataType.META) return cl;
      const o = (c as qg.Noper).op;
      if (o) {
        cl[o] = cl[o] || [];
        cl[o].push(c.name);
      }
      return cl;
    },
    {} as qt.Dict<string[]>
  );
}

function detectBySuffixes(cl: Cluster, g: Graph, opts: qt.Opts) {
  const series = {} as qt.Dict<qg.Nseries>;
  _.each(cl, (ns, cluster: string) => {
    if (ns.length <= 1) return;
    const d = {} as qt.Dict<qg.Nseries[]>;
    ns.forEach(name => {
      const isGroup = name.endsWith('*');
      const path = name.split('/');
      const leaf = path[path.length - 1];
      const parent = path.slice(0, path.length - 1).join('/');
      const matches = leaf.match(/^(\D*)_(\d+)$/);
      let pre;
      let id;
      let suf = '';
      if (matches) {
        pre = matches[1];
        id = matches[2];
      } else {
        pre = isGroup ? leaf.substr(0, leaf.length - 1) : leaf;
        id = 0;
        suf = isGroup ? '*' : '';
      }
      const sn = qg.seriesName(pre, suf, parent);
      d[sn] = d[sn] || [];
      const n = qg.createNseries(pre, suf, parent, +id, name, opts);
      d[sn].push(n);
    });
    _.each(d, (ns2, _n) => {
      if (ns2.length < 2) return;
      ns2.sort((a, b) => +a.cluster - +b.cluster);
      let sns = [ns2[0]];
      for (let i = 1; i < ns2.length; i++) {
        const n = ns2[i];
        if (n.cluster === sns[sns.length - 1].cluster + 1) {
          sns.push(n);
          continue;
        }
        addSeries(g, sns, series, +cluster, opts);
        sns = [n];
      }
      addSeries(g, sns, series, +cluster, opts);
    });
  });
  return series;
}

function detectSeries(cl: Cluster, g: Graph, opts: qt.Opts) {
  const series = {} as qt.Dict<qg.Nseries>;
  _.each(cl, function(ns, cluster: string) {
    if (ns.length <= 1) return;
    const fd = {} as qt.Dict<qg.Nseries>;
    const bd = {} as qt.Dict<any[]>;
    ns.forEach(name => {
      const isGroup = name.endsWith('*');
      const path = name.split('/');
      const leaf = path[path.length - 1];
      const parent = path.slice(0, path.length - 1).join('/');
      const re = /(\d+)/g;
      let matches;
      let pre;
      let id;
      let suf;
      let sn;
      let matched = 0;
      while ((matches = re.exec(leaf))) {
        ++matched;
        pre = leaf.slice(0, matches.index);
        id = matches[0];
        suf = leaf.slice(matches.index + matches[0].length);
        sn = qg.seriesName(pre, suf, parent);
        if (!fd[sn]) {
          fd[sn] = qg.createNseries(pre, suf, parent, +id, name, opts);
        }
        fd[sn].ids.push(+id);
        bd[name] = bd[name] || [];
        bd[name].push([sn, id]);
      }
      if (matched < 1) {
        pre = isGroup ? leaf.substr(0, leaf.length - 1) : leaf;
        id = 0;
        suf = isGroup ? '*' : '';
        sn = qg.seriesName(pre, suf, parent);
        if (!fd[sn]) {
          fd[sn] = qg.createNseries(pre, suf, parent, +id, name, opts);
        }
        fd[sn].ids.push(id);
        bd[name] = bd[name] || [];
        bd[name].push([sn, id]);
      }
    });
    const d = {} as qt.Dict<qg.Nseries[]>;
    _.each(bd, (ids, name) => {
      ids.sort((a, b) => {
        return fd[b[0]].ids.length - fd[a[0]].ids.length;
      });
      const sn = ids[0][0];
      const id = ids[0][1];
      d[sn] = d[sn] || [];
      const path = name.split('/');
      const parent = path.slice(0, path.length - 1).join('/');
      const n = qg.createNseries(
        fd[sn].prefix,
        fd[sn].suffix,
        parent,
        +id,
        name,
        opts
      );
      d[sn].push(n);
    });
    _.each(d, (ns2, _n) => {
      if (ns2.length < 2) return;
      ns2.sort((a, b) => +a.cluster - +b.cluster);
      let sns = [ns2[0]];
      for (let i = 1; i < ns2.length; i++) {
        const n = ns2[i];
        if (n.cluster === sns[sns.length - 1].cluster + 1) {
          sns.push(n);
          continue;
        }
        addSeries(g, sns, series, +cluster, opts);
        sns = [n];
      }
      addSeries(g, sns, series, +cluster, opts);
    });
  });
  return series;
}

function addSeries(
  g: Graph,
  ns: qg.Nseries[],
  dict: qt.Dict<qg.Nseries>,
  cluster: number,
  opts: qt.Opts
) {
  if (ns.length > 1) {
    const name = qg.seriesName(
      ns[0].prefix,
      ns[0].suffix,
      ns[0].parentName,
      ns[0].cluster,
      ns[ns.length - 1].cluster
    );
    const node = qg.createNseries(
      ns[0].prefix,
      ns[0].suffix,
      ns[0].parentName,
      cluster,
      name,
      opts
    );
    ns.forEach(n => {
      node.ids.push(n.cluster);
      node.metag.setNode(n.name, g.node(n.name));
    });
    dict[name] = node;
  }
}
