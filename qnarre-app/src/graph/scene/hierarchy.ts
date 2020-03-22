import * as _ from 'lodash';
import * as d3 from 'd3';
import * as qg from './graph';
import * as qp from './params';
import * as qt from './types';
import * as qu from '../../elems/graph/util';
import * as proto from './proto';
import * as template from './template';

type Graph = qt.Graph<qt.GroupNode | qt.OpNode, qt.MetaEdge>;

class Hierarchy implements qt.Hierarchy {
  root: qt.MetaNode;
  libraryFns = {} as qt.Dict<qt.LibraryFn>;
  devices = [] as string[];
  clusters = [] as string[];
  templates = {} as qt.Dict<qt.Template>;
  hasShapeInfo = false;
  maxMetaEdgeSize = 1;
  options: qt.GraphOptions;
  orderings = {} as qt.Dict<qt.Dict<number>>;
  private index: qt.Dict<qt.GroupNode | qt.OpNode>;

  constructor(options: qt.GraphOptions) {
    this.options = options || {};
    this.options.compound = true;
    this.root = qg.createMetaNode(qp.ROOT_NAME, this.options);
    this.index = {};
    this.index[qp.ROOT_NAME] = this.root;
  }
  node(name?: string) {
    return name ? this.index[name] : undefined;
  }
  setNode(name: string, node: qt.GroupNode | qt.OpNode) {
    this.index[name] = node;
  }
  getNodeMap() {
    return this.index;
  }
  getBridge(name: string): Graph | undefined {
    const n = this.index[name];
    if (!n) throw Error('Could not find node: ' + name);
    if (!('metag' in n)) return undefined;
    if (n.bridgeg) return n.bridgeg;
    const b = (n.bridgeg = qg.createGraph<
      qt.GroupNode | qt.OpNode,
      qt.MetaEdge
    >('BRIDGEGRAPH', qt.GraphType.BRIDGE, this.options));
    if (!n.parent || !('metag' in n.parent)) return b;
    const p = n.parent as qt.GroupNode;
    _.each([p.metag, this.getBridge(p.name)], (g?: Graph) => {
      g?.edges()
        .filter(e => e.v === name || e.w === name)
        .forEach(ed => {
          const inbound = ed.w === name;
          _.each(g.edge(ed).bases, (e: qt.BaseEdge) => {
            const [desc, other] = inbound ? [e.w, ed.v] : [e.v, ed.w];
            const c = this.getChildName(name, desc);
            const d = {v: inbound ? other : c, w: inbound ? c : other};
            let m = b.edge(d as qt.EdgeObject);
            if (!m) {
              m = qg.createMetaEdge(d.v, d.w);
              m.inbound = inbound;
              b.setEdge(d.v, d.w, m);
            }
            m.addBase(e, this);
          });
        });
    });
    return b;
  }
  getChildName(name: string, desc: string) {
    let n = this.index[desc] as qt.Node | undefined;
    while (n) {
      if (n.parent?.name === name) return n.name;
      n = n.parent;
    }
    throw Error('No named child for descendant: ' + desc);
  }
  getPreds(name: string) {
    const n = this.index[name];
    if (!n) throw Error('Could not find node: ' + name);
    const preds = this.getOneWays(n, true);
    if (!n.isGroup) {
      _.each((n as qt.OpNode).inEmbeds, (en: qt.OpNode) => {
        _.each((n as qt.OpNode).ins, (ni: qt.NormInput) => {
          if (ni.name === en.name) {
            const m = new qg.MetaEdge(en.name, name);
            m.addBase(
              {
                isControlDep: ni.isControlDep,
                outKey: ni.outKey,
                isRef: false,
                v: en.name,
                w: name
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
  getSuccs(name: string) {
    const n = this.index[name];
    if (!n) throw Error('Could not find node: ' + name);
    const succs = this.getOneWays(n, false);
    if (!n.isGroup) {
      _.each((n as qt.OpNode).outEmbeds, (en: qt.OpNode) => {
        _.each(en.ins, (ni: qt.NormInput) => {
          if (ni.name === name) {
            const metaedge = new qg.MetaEdge(name, en.name);
            metaedge.addBase(
              {
                isControlDep: ni.isControlDep,
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
  getOneWays(node: qt.GroupNode | qt.OpNode, inbound: boolean): qt.Edges {
    const es = new Edges();
    if (!node.parent || !node.parent.isGroup) return es;
    const p = node.parent as qt.GroupNode;
    const m = p.metag;
    const b = this.getBridge(parent.name);
    es.updateTargets(m, node, inbound);
    if (b) es.updateTargets(b, node, inbound);
    return es;
  }
  getOrdering(name: string): qt.Dict<number> {
    const node = this.index[name];
    if (!node) throw Error('Could not find node: ' + name);
    if (!node.isGroup) return {};
    if (name in this.orderings) return this.orderings[name];
    const succs = {} as qt.Dict<string[]>;
    const dests = {} as qt.Dict<boolean>;
    const m = (node as qt.GroupNode).metag;
    _.each(m.edges(), (e: qt.EdgeObject) => {
      if (!m.edge(e).numRegular) return;
      if (!(e.v in succs)) {
        succs[e.v] = [];
      }
      succs[e.v].push(e.w);
      dests[e.w] = true;
    });
    const queue: string[] = _.difference(_.keys(succs), _.keys(dests));
    const ord = (this.orderings[name] = {} as qt.Dict<number>);
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
  addNodes(g: qt.SlimGraph) {
    const map = {} as qt.Dict<qt.OpNode[]>;
    _.each(g.nodes, n => {
      const path = qg.getHierarchicalPath(n.name);
      let p = this.root;
      p.depth = Math.max(path.length, p.depth);
      if (!map[n.op]) map[n.op] = [];
      map[n.op].push(n);
      for (let i = 0; i < path.length; i++) {
        p.depth = Math.max(p.depth, path.length - i);
        p.cardinality += n.cardinality;
        p.opHistogram[n.op] = (p.opHistogram[n.op] || 0) + 1;
        if (n.device)
          p.deviceHisto[n.device] = (p.deviceHisto[n.device] || 0) + 1;
        if (n.cluster)
          p.clusterHisto[n.cluster] = (p.clusterHisto[n.cluster] || 0) + 1;
        if (n.compatible) {
          p.compatHisto.compatible = (p.compatHisto.compatible || 0) + 1;
        } else {
          p.compatHisto.incompatible = (p.compatHisto.incompatible || 0) + 1;
        }
        _.each(n.inEmbeds, e => {
          if (e.compatible) {
            p.compatHisto.compatible = (p.compatHisto.compatible || 0) + 1;
          } else {
            p.compatHisto.incompatible = (p.compatHisto.incompatible || 0) + 1;
          }
        });
        _.each(n.outEmbeds, e => {
          if (e.compatible) {
            p.compatHisto.compatible = (p.compatHisto.compatible || 0) + 1;
          } else {
            p.compatHisto.incompatible = (p.compatHisto.incompatible || 0) + 1;
          }
        });
        if (i === path.length - 1) break;
        const name = path[i];
        let c = this.node(name) as qt.MetaNode;
        if (!c) {
          c = qg.createMetaNode(name, this.options);
          c.parent = p;
          this.setNode(name, c);
          p.metag.setNode(name, c);
          if (name.startsWith(qp.LIBRARY_PREFIX) && p.name === qp.ROOT_NAME) {
            const fn = name.substring(qp.LIBRARY_PREFIX.length);
            if (!map[fn]) map[fn] = [];
            this.libraryFns[fn] = {
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
      p.metag.setNode(n.name, n);
      _.each(n.inEmbeds, e => {
        this.setNode(e.name, e);
        e.parent = n;
      });
      _.each(n.outEmbeds, e => {
        this.setNode(e.name, e);
        e.parent = n;
      });
    });
  }
  addEdges(g: qt.SlimGraph, _series: qt.Dict<string>) {
    const map = this.getNodeMap();
    const src = [] as string[];
    const dst = [] as string[];
    function getPath(path: string[], n?: qt.Node) {
      let i = 0;
      while (n) {
        path[i++] = n.name;
        n = n.parent;
      }
      return i - 1;
    }
    _.each(g.edges, e => {
      let si = getPath(src, g.nodes[e.v]);
      let di = getPath(dst, g.nodes[e.w]);
      if (si === -1 || di === -1) return;
      while (src[si] === dst[di]) {
        si--;
        di--;
        if (si < 0 || di < 0) throw Error('No difference in ancestor paths');
      }
      const a = map[src[si + 1]] as qt.GroupNode;
      const s = src[si];
      const d = dst[di];
      let m = a.metag.edge(s, d);
      if (!m) {
        m = qg.createMetaEdge(s, d);
        a.metag.setEdge(s, d, m);
      }
      if (!a.noControlEdges && !e.isControlDep) a.noControlEdges = true;
      m.addBase(e, this);
    });
  }
  mergeStats(_stats: proto.StepStats) {
    const ds = {} as qt.Dict<boolean>;
    const cs = {} as qt.Dict<boolean>;
    _.each(this.root.leaves(), n => {
      const d = this.node(n) as qt.OpNode;
      if (d.device) ds[d.device] = true;
      if (d.cluster) cs[d.cluster] = true;
    });
    this.devices = _.keys(ds);
    this.clusters = _.keys(cs);
    _.each(this.getNodeMap(), n => {
      if (n.isGroup) {
        n.stats = new qt.NodeStats([]);
        (n as qt.GroupNode).deviceHisto = {};
      }
    });
    _.each(this.root.leaves(), n => {
      const d = this.node(n) as qt.OpNode;
      let nd = d as qt.GroupNode | qt.OpNode;
      while (nd.parent) {
        if (d.device) {
          const h = (nd.parent as qt.GroupNode).deviceHisto;
          h[d.device] = (h[d.device] || 0) + 1;
        }
        if (d.cluster) {
          const h = (nd.parent as qt.GroupNode).clusterHisto;
          h[d.cluster] = (h[d.cluster] || 0) + 1;
        }
        if (d.stats) nd.parent?.stats?.combine(d.stats);
        nd = nd.parent as qt.GroupNode;
      }
    });
  }
  getIncompatibleOps(ps: qt.HierarchyParams) {
    const ns = [] as (qt.GroupNode | qt.OpNode)[];
    const added = {} as qt.Dict<qt.SeriesNode>;
    _.each(this.root.leaves(), n => {
      const d = this.node(n);
      if (d?.type === qt.NodeType.OP) {
        const nd = d as qt.OpNode;
        if (!nd.compatible) {
          if (nd.series) {
            if (ps && ps.seriesMap[nd.series] === qt.SeriesType.UNGROUP) {
              ns.push(nd);
            } else {
              if (!added[nd.series]) {
                const ss = this.node(nd.series) as qt.SeriesNode;
                if (ss) {
                  added[nd.series] = ss;
                  ns.push(ss);
                }
              }
            }
          } else ns.push(nd);
        }
        _.each(nd.inEmbeds, e => {
          if (!e.compatible) ns.push(e);
        });
        _.each(nd.outEmbeds, e => {
          if (!e.compatible) ns.push(e);
        });
      }
    });
    return ns;
  }
}

class Edges implements qt.Edges {
  control = [] as qt.MetaEdge[];
  regular = [] as qt.MetaEdge[];

  updateTargets(g: Graph, n: qt.Node, inbound: boolean) {
    const es = inbound ? g.inEdges(n.name) : g.outEdges(n.name);
    _.each(es, (e: qt.EdgeObject) => {
      const m = g.edge(e);
      const ts = m.numRegular ? this.regular : this.control;
      ts.push(m);
    });
  }
}

export async function build(
  g: qt.SlimGraph,
  ps: qt.HierarchyParams,
  t: qu.Tracker
): Promise<qt.Hierarchy> {
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
  metanode: qt.MetaNode,
  h: qt.Hierarchy,
  names: qt.Dict<string>,
  thresh: number,
  map: qt.Dict<qt.SeriesType>,
  patterns: boolean
) {
  const metag = metanode.metag;
  _.each(metag.nodes(), n => {
    const c = metag.node(n);
    if (c.type === qt.NodeType.META) {
      groupSeries(c as qt.MetaNode, h, names, thresh, map, patterns);
    }
  });
  const cs = clusterNodes(metag);
  const fn = patterns ? detectSeries : detectBySuffixes;
  const dict = fn(cs, metag, h.options);
  _.each(dict, (sn: qt.SeriesNode, name: string) => {
    const ns = sn.metag.nodes();
    _.each(ns, n => {
      const c = <qt.OpNode>metag.node(n);
      if (!c.series) c.series = name;
    });
    if (ns.length < thresh && !(sn.name in map)) {
      map[sn.name] = qt.SeriesType.UNGROUP;
    }
    if (sn.name in map && map[sn.name] === qt.SeriesType.UNGROUP) {
      return;
    }
    h.setNode(name, sn);
    metag.setNode(name, sn);
    _.each(ns, n => {
      const c = <qt.OpNode>metag.node(n);
      sn.metag.setNode(n, c);
      sn.parent = c.parent;
      sn.cardinality++;
      if (c.device) {
        sn.deviceHisto[c.device] = (sn.deviceHisto[c.device] || 0) + 1;
      }
      if (c.cluster) {
        sn.clusterHisto[c.cluster] = (sn.clusterHisto[c.cluster] || 0) + 1;
      }
      if (c.compatible) {
        sn.compatHisto.compatible = (sn.compatHisto.compatible || 0) + 1;
      } else {
        sn.compatHisto.incompatible = (sn.compatHisto.incompatible || 0) + 1;
      }
      _.each(c.inEmbeds, e => {
        if (e.compatible) {
          sn.compatHisto.compatible = (sn.compatHisto.compatible || 0) + 1;
        } else {
          sn.compatHisto.incompatible = (sn.compatHisto.incompatible || 0) + 1;
        }
      });
      _.each(c.outEmbeds, e => {
        if (e.compatible) {
          sn.compatHisto.compatible = (sn.compatHisto.compatible || 0) + 1;
        } else {
          sn.compatHisto.incompatible = (sn.compatHisto.incompatible || 0) + 1;
        }
      });
      c.parent = sn;
      names[n] = name;
      metag.removeNode(n);
    });
  });
}

type Cluster = qt.Dict<string[]>;

function clusterNodes(g: Graph) {
  return _.reduce(
    g.nodes(),
    (cl: Cluster, n: string) => {
      const c = g.node(n);
      if (c.type === qt.NodeType.META) return cl;
      const o = (c as qt.OpNode).op;
      if (o) {
        cl[o] = cl[o] || [];
        cl[o].push(c.name);
      }
      return cl;
    },
    {} as qt.Dict<string[]>
  );
}

function detectBySuffixes(cl: Cluster, g: Graph, opts: qt.GraphOptions) {
  const series = {} as qt.Dict<qt.SeriesNode>;
  _.each(cl, (ns, cluster: string) => {
    if (ns.length <= 1) return;
    const d = {} as qt.Dict<qt.SeriesNode[]>;
    _.each(ns, name => {
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
      const sn = qg.getSeriesNodeName(pre, suf, parent);
      d[sn] = d[sn] || [];
      const n = qg.createSeriesNode(pre, suf, parent, +id, name, opts);
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

function detectSeries(cl: Cluster, g: Graph, opts: qt.GraphOptions) {
  const series = {} as qt.Dict<qt.SeriesNode>;
  _.each(cl, function(ns, cluster: string) {
    if (ns.length <= 1) return;
    const fd = {} as qt.Dict<qt.SeriesNode>;
    const bd = {} as qt.Dict<any[]>;
    _.each(ns, name => {
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
        sn = qg.getSeriesNodeName(pre, suf, parent);
        if (!fd[sn]) {
          fd[sn] = qg.createSeriesNode(pre, suf, parent, +id, name, opts);
        }
        fd[sn].ids.push(+id);
        bd[name] = bd[name] || [];
        bd[name].push([sn, id]);
      }
      if (matched < 1) {
        pre = isGroup ? leaf.substr(0, leaf.length - 1) : leaf;
        id = 0;
        suf = isGroup ? '*' : '';
        sn = qg.getSeriesNodeName(pre, suf, parent);
        if (!fd[sn]) {
          fd[sn] = qg.createSeriesNode(pre, suf, parent, +id, name, opts);
        }
        fd[sn].ids.push(id);
        bd[name] = bd[name] || [];
        bd[name].push([sn, id]);
      }
    });
    const d = {} as qt.Dict<qt.SeriesNode[]>;
    _.each(bd, (ids, name) => {
      ids.sort((a, b) => {
        return fd[b[0]].ids.length - fd[a[0]].ids.length;
      });
      const sn = ids[0][0];
      const id = ids[0][1];
      d[sn] = d[sn] || [];
      const path = name.split('/');
      const parent = path.slice(0, path.length - 1).join('/');
      const n = qg.createSeriesNode(
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
  ns: qt.SeriesNode[],
  dict: qt.Dict<qt.SeriesNode>,
  cluster: number,
  opts: qt.GraphOptions
) {
  if (ns.length > 1) {
    const name = qg.getSeriesNodeName(
      ns[0].prefix,
      ns[0].suffix,
      ns[0].parentName,
      ns[0].cluster,
      ns[ns.length - 1].cluster
    );
    const node = qg.createSeriesNode(
      ns[0].prefix,
      ns[0].suffix,
      ns[0].parentName,
      cluster,
      name,
      opts
    );
    _.each(ns, n => {
      node.ids.push(n.cluster);
      node.metag.setNode(n.name, g.node(n.name));
    });
    dict[name] = node;
  }
}
