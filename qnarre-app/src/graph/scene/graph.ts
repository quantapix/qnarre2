import * as _ from 'lodash';
import * as proto from './proto';
import * as qp from './params';
import * as qt from './types';
import * as qu from '../../elems/graph/util';

export function createGraph<N, E>(
  name: string,
  type: string | number,
  opts?: qt.GraphOptions
) {
  const g = new qt.Graph<N, E>(opts);
  g.setGraph({name, rankdir: opts?.rankdir ?? 'BT', type});
  return g;
}

export class EllipsisNode implements qt.EllipsisNode {
  name = '';
  type = qt.NodeType.ELLIPSIS;
  isGroup = false;
  cardinality = 1;
  parent?: qt.Node;
  stats?: qt.NodeStats;
  include?: qt.InclusionType;
  attributes = {} as qt.Dict<any>;
  countMore = 0;
  constructor(count: number) {
    this.setCountMore(count);
  }

  setCountMore(c: number) {
    this.countMore = c;
    this.name = '... ' + c + ' more';
  }
}

export class OpNode implements qt.OpNode {
  name: string;
  type = qt.NodeType.OP;
  isGroup = false;
  cardinality = 1;
  parent?: qt.Node;
  stats?: qt.NodeStats;
  include?: qt.InclusionType;
  attributes = {} as qt.Dict<any>;
  op: string;
  device?: string;
  cluster?: string;
  series?: string;
  attr: {key: string; value: any}[];
  ins: qt.NormInput[];
  outShapes: qt.Dict<qt.EdgeShape>;
  inEmbeds: qt.OpNode[] = [];
  outEmbeds: qt.OpNode[] = [];
  compatible = false;
  fInputIdx?: number;
  fOutputIdx?: number;
  constructor(def: proto.NodeDef) {
    this.name = def.name;
    this.op = def.op;
    this.device = def.device;
    this.cluster = extractCluster(def.attr);
    this.attr = def.attr;
    this.ins = normalizeIns(def.input);
    this.outShapes = extractShapes(def.attr);
  }
}

function extractCluster(
  pairs: Array<{key: string; value: any}>
): string | undefined {
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].key === '_cluster') {
      return pairs[i].value['s'];
    }
  }
  return undefined;
}

function normalizeIns(ins: string[]): qt.NormInput[] {
  const ns = [] as qt.NormInput[];
  _.each(ins, i => {
    const isControlDep = i.startsWith('^');
    if (isControlDep) {
      i = i.substring(1);
    }
    let name = i;
    let outKey = '0';
    let m = i.match(/(.*):(\w+:\d+)$/);
    if (m) {
      name = m[1];
      outKey = m[2];
    } else {
      m = i.match(/(.*):(\d+)$/);
      if (m) {
        name = m[1];
        outKey = m[2];
      }
    }
    if (ns.length === 0 || name !== ns[ns.length - 1].name) {
      ns.push({name, outKey, isControlDep});
    }
  });
  return ns;
}

function extractShapes(
  pairs: Array<{key: string; value: any}>
): qt.Dict<qt.EdgeShape> {
  for (let i = 0; i < pairs.length; i++) {
    const {key, value} = pairs[i];
    if (key === '_output_shapes') {
      const r = value.list.shape.map((s: any) => {
        if (s.unknown_rank) return undefined;
        if (s.dim == null || (s.dim.length === 1 && s.dim[0].size == null)) {
          return [];
        }
        return s.dim.map((d: {size: number}) => d.size);
      });
      pairs.splice(i, 1);
      return r;
    }
  }
  return {};
}

export class MetaNode implements qt.MetaNode {
  name: string;
  type = qt.NodeType.META;
  isGroup = true;
  cardinality = 0;
  parent?: qt.Node;
  stats?: qt.NodeStats;
  include?: qt.InclusionType;
  attributes = {} as qt.Dict<any>;
  metag: qt.Graph<qt.GroupNode | qt.OpNode, qt.MetaEdge>;
  bridgeg?: qt.Graph<qt.GroupNode | qt.OpNode, qt.MetaEdge>;
  deviceHisto = {} as qt.Dict<number>;
  clusterHisto = {} as qt.Dict<number>;
  compatHisto: {compatible: number; incompatible: number};
  noControlEdges = false;
  depth = 1;
  template?: string;
  opHistogram = {} as qt.Dict<number>;
  assocFn?: string;

  constructor(name: string, opt = {}) {
    this.name = name;
    this.metag = createGraph<qt.GroupNode | qt.OpNode, qt.MetaEdge>(
      name,
      qt.GraphType.META,
      opt
    );
    this.compatHisto = {compatible: 0, incompatible: 0};
  }

  getFirstChild() {
    return this.metag.node(this.metag.nodes()[0]);
  }

  getRootOp() {
    const s = this.name.split('/');
    const root = this.name + '/(' + s[s.length - 1] + ')';
    return this.metag.node(root) as qt.OpNode;
  }

  leaves() {
    const ls = [] as string[];
    const queue = [this] as qt.Node[];
    while (queue.length) {
      const n = queue.shift()!;
      if (n.isGroup) {
        const m = (n as qt.GroupNode).metag;
        _.each(m.nodes(), n => queue.push(m.node(n)));
      } else {
        ls.push(n.name);
      }
    }
    return ls;
  }
}

export function createMetaNode(name: string, opt = {}): qt.MetaNode {
  return new MetaNode(name, opt);
}

export class MetaEdge implements qt.MetaEdge {
  v: string;
  w: string;
  bases: qt.BaseEdge[] = [];
  inbound?: boolean;
  numRegular = 0;
  numControl = 0;
  numRef = 0;
  size = 0;

  constructor(v: string, w: string) {
    this.v = v;
    this.w = w;
  }

  addBase(e: qt.BaseEdge, h: qt.Hierarchy) {
    this.bases.push(e);
    if (e.isControlDep) {
      this.numControl += 1;
    } else {
      this.numRegular += 1;
    }
    if (e.isRef) {
      this.numRef += 1;
    }
    this.size += sizeOfEdge(e, h);
    h.maxMetaEdgeSize = Math.max(h.maxMetaEdgeSize, this.size);
  }
}

function sizeOfEdge(e: qt.BaseEdge, h: qt.Hierarchy) {
  const n = h.node(e.v) as qt.OpNode;
  if (!n.outShapes) return 1;
  h.hasShapeInfo = true;
  const vs = Object.keys(n.outShapes)
    .map(k => n.outShapes[k])
    .map(s => (s ? s.reduce((acc, v) => acc * (v === -1 ? 1 : v), 1) : 1));
  return _.sum(vs);
}

export function createMetaEdge(v: string, w: string): qt.MetaEdge {
  return new MetaEdge(v, w);
}

class SeriesNode implements qt.SeriesNode {
  name: string;
  type = qt.NodeType.SERIES;
  isGroup = true;
  cardinality = 0;
  parent?: qt.Node;
  stats?: qt.NodeStats;
  include?: qt.InclusionType;
  attributes = {} as qt.Dict<any>;
  metag: qt.Graph<qt.GroupNode | qt.OpNode, qt.MetaEdge>;
  bridgeg?: qt.Graph<qt.GroupNode | qt.OpNode, qt.MetaEdge>;
  deviceHisto = {} as qt.Dict<number>;
  clusterHisto = {} as qt.Dict<number>;
  compatHisto: {compatible: number; incompatible: number};
  noControlEdges = false;
  hasLoop = false;
  prefix: string;
  suffix: string;
  parentName: string;
  cluster: number;
  ids = [] as number[];

  constructor(
    prefix: string,
    suffix: string,
    parentName: string,
    cluster: number,
    name: string,
    options: qt.GraphOptions
  ) {
    this.name = name || getSeriesNodeName(prefix, suffix, parentName);
    this.metag = createGraph<MetaNode, qt.MetaEdge>(
      name,
      qt.GraphType.SERIES,
      options
    );
    this.compatHisto = {compatible: 0, incompatible: 0};
    this.prefix = prefix;
    this.suffix = suffix;
    this.parentName = parentName;
    this.cluster = cluster;
  }
}

export function createSeriesNode(
  prefix: string,
  suffix: string,
  parent: string,
  cluster: number,
  name: string,
  opts: qt.GraphOptions
): qt.SeriesNode {
  return new SeriesNode(prefix, suffix, parent, cluster, name, opts);
}

export function getSeriesNodeName(
  prefix: string,
  suffix: string,
  parent: string,
  start?: number,
  end?: number
) {
  const n =
    start !== undefined && end !== undefined
      ? '[' + start + '-' + end + ']'
      : '#';
  const p = prefix + n + suffix;
  return (parent ? parent + '/' : '') + p;
}

export function getStrictName(name: string) {
  const s = name.split(qp.NAMESPACE_DELIM);
  return name + qp.NAMESPACE_DELIM + '(' + s[s.length - 1] + ')';
}

export function mergeStats(
  g: qt.SlimGraph,
  stats: proto.StepStats,
  devices?: qt.Dict<boolean>
) {
  _.each(g.nodes, n => (n.stats = undefined));
  _.each(stats.dev_stats, ds => {
    if (devices && !devices[ds.device]) return;
    _.each(ds.node_stats, ns => {
      const n =
        ns.node_name in g.nodes ? ns.node_name : getStrictName(ns.node_name);
      if (!(n in g.nodes)) return;
      let bytes = 0;
      if (ns.memory) {
        _.each(ns.memory, m => {
          if (m.total_bytes) {
            if (m.total_bytes > 0) {
              bytes += Number(m.total_bytes);
            } else {
              console.log('ignoring negative memory allocation for ' + n);
            }
          }
        });
      }
      let size = [] as number[][];
      if (ns.output) {
        size = _.map(ns.output, o =>
          _.map(o.tensor_description.shape.dim, d => d.size)
        );
      }
      g.nodes[n].device = ds.device;
      if (!g.nodes[n].stats) {
        g.nodes[n].stats = new qt.NodeStats(size);
      }
      g.nodes[n].stats?.addBytes(bytes);
      if (ns.all_end_rel_micros) {
        if (ns.all_end_rel_micros > 0) {
          g.nodes[n].stats?.addTime(
            ns.all_start_micros,
            ns.all_start_micros + ns.all_end_rel_micros
          );
        } else {
          console.log('ignoring negative runtime for ' + n);
        }
      }
    });
  });
}

export async function build(
  def: proto.GraphDef,
  ps: qt.BuildParams,
  t: qu.Tracker
): Promise<qt.SlimGraph> {
  const inEmbed = {} as qt.Dict<qt.OpNode>;
  const outEmbed = {} as qt.Dict<qt.OpNode>;
  const outEmbeds = {} as qt.Dict<qt.OpNode[]>;
  const isInPred = embedPredicate(ps.inEmbedTypes);
  const isOutPred = embedPredicate(ps.outEmbedTypes);
  const enames = [] as string[];
  const raws = def.node;
  const names = new Array<string>(raws.length);
  const nodes = await t.runAsyncTask('Normalizing names', 30, () => {
    const ops = new Array<OpNode>(raws.length);
    let i = 0;
    function processRaw(raw: proto.NodeDef) {
      const o = new OpNode(raw);
      if (isInPred(o)) {
        enames.push(o.name);
        inEmbed[o.name] = o;
        return o;
      }
      if (isOutPred(o)) {
        enames.push(o.name);
        outEmbed[o.name] = o;
        _.each(o.ins, inp => {
          const n = inp.name;
          outEmbeds[n] = outEmbeds[n] || [];
          outEmbeds[n].push(o);
        });
        return o;
      }
      ops[i] = o;
      names[i] = o.name;
      i++;
      return o;
    }
    _.each(raws, processRaw);
    function processFn(fn: proto.FunctionDef) {
      const fname = qp.LIBRARY_PREFIX + fn.signature.name;
      processRaw({name: fname, input: [], device: '', op: '', attr: []});
      let args = fn.signature.input_arg;
      if (args.length) {
        let idx = 0;
        // eslint-disable-next-line no-inner-declarations
        function processInput(arg: proto.ArgDef) {
          const o = processRaw({
            name: fname + qp.NAMESPACE_DELIM + arg.name,
            input: [],
            device: '',
            op: 'input_arg',
            attr: [{key: 'T', value: {type: arg.type}}]
          });
          o.fInputIdx = idx;
          idx++;
        }
        /*
        if (args['name']) {
          processInput(args['name']);
        } else {
          _.each(args, processInput);
        }
        */
        _.each(args, processInput);
      }
      const onames = {} as qt.Dict<any>;
      args = fn.signature.output_arg;
      if (args.length) {
        let idx = 0;
        // eslint-disable-next-line no-inner-declarations
        function processOutput(arg: proto.ArgDef) {
          onames[fname + qp.NAMESPACE_DELIM + arg.name] = idx;
          idx++;
        }
        /*
        if (args['name']) {
          processOutput(args['name']);
        } else {
          _.each(args, processOutput);
        }
        */
        _.each(args, processOutput);
      }
      _.each(fn.node_def, raw => {
        raw.name = fname + '/' + raw.name;
        if (typeof raw.input === 'string') {
          raw.input = [raw.input];
        }
        const o = processRaw(raw);
        if (_.isNumber(onames[raw.name])) {
          o.fOutputIdx = onames[raw.name];
        }
        _.each(o.ins, ni => {
          ni.name = fname + qp.NAMESPACE_DELIM + ni.name;
        });
      });
    }
    if (def.library && def.library.function) {
      _.each(def.library.function, processFn);
    }
    ops.splice(i);
    names.splice(i);
    return ops;
  });
  return t.runAsyncTask('Building the data structure', 70, () => {
    const norms = mapStrictHierarchy(names, enames);
    const g = new qt.SlimGraph();
    _.each(nodes, n => {
      const nn = norms[n.name] || n.name;
      g.nodes[nn] = n;
      if (n.name in outEmbeds) {
        n.outEmbeds = outEmbeds[n.name];
        _.each(n.outEmbeds, n2 => (n2.name = norms[n2.name] || n2.name));
      }
      n.name = nn;
    });
    _.each(nodes, n => {
      _.each(n.ins, (inp, i) => {
        const name = inp.name;
        if (name in inEmbed) {
          const ie = inEmbed[name];
          n.inEmbeds.push(ie);
          for (const e of ie.ins) {
            g.addEdge(norms[e.name] || e.name, n, e, ps, i);
          }
        } else if (name in outEmbed) {
          const oe = outEmbed[name];
          for (const e of oe.ins) {
            g.addEdge(norms[e.name] || e.name, n, inp, ps, i);
          }
        } else {
          g.addEdge(norms[name] || name, n, inp, ps, i);
        }
      });
    });
    _.each(inEmbed, n => (n.name = norms[n.name] || n.name));
    return g;
  });
}

function embedPredicate(types: string[]) {
  return (n: qt.OpNode) => {
    for (let i = 0; i < types.length; i++) {
      const re = new RegExp(types[i]);
      if (typeof n.op === 'string' && n.op.match(re)) return true;
    }
    return false;
  };
}

function mapStrictHierarchy(names: string[], enames: string[]) {
  const m = {} as qt.Dict<string>;
  const es = {} as qt.Dict<boolean>;
  names.sort();
  for (let i = 0; i < names.length - 1; ++i) {
    const n0 = names[i];
    _.each(getHierarchicalPath(n0).slice(0, -1), ps => (es[ps] = true));
    for (let j = i + 1; j < names.length; ++j) {
      const n1 = names[j];
      if (_.startsWith(n1, n0)) {
        if (
          n1.length > n0.length &&
          n1.charAt(n0.length) === qp.NAMESPACE_DELIM
        ) {
          m[n0] = getStrictName(n0);
          break;
        }
      } else {
        break;
      }
    }
  }
  _.each(enames, e => {
    if (e in es) m[e] = getStrictName(e);
  });
  return m;
}

export function areDegreesSimilar(
  g1: qt.Graph<any, any>,
  g2: qt.Graph<any, any>
) {
  const ds1 = degrees(g1);
  const ds2 = degrees(g2);
  for (let i = 0; i < ds1.length; i++) {
    if (ds1[i] !== ds2[i]) {
      return false;
    }
  }
  return true;
}

function degrees(g: qt.Graph<any, any>) {
  return g
    .nodes()
    .map(n => g.neighbors(n).length)
    .sort();
}

export function getHierarchicalPath(name: string, series?: qt.Dict<string>) {
  const p = [] as string[];
  let i = name.indexOf(qp.NAMESPACE_DELIM);
  while (i >= 0) {
    p.push(name.substring(0, i));
    i = name.indexOf(qp.NAMESPACE_DELIM, i + 1);
  }
  if (series) {
    const n = series[name];
    if (n) {
      p.push(n);
    }
  }
  p.push(name);
  return p;
}

export function getIncludeNodeButtonString(inc: qt.InclusionType) {
  if (inc === qt.InclusionType.EXCLUDE) {
    return 'Add to main graph';
  } else {
    return 'Remove from main graph';
  }
}

export function getGroupSeriesNodeButtonString(group: qt.SeriesType) {
  if (group === qt.SeriesType.GROUP) {
    return 'Ungroup this series of nodes';
  } else {
    return 'Group this series of nodes';
  }
}

export function toggleNodeSeriesGroup(
  map: qt.Dict<qt.SeriesType>,
  name: string
) {
  if (!(name in map) || map[name] === qt.SeriesType.GROUP) {
    map[name] = qt.SeriesType.UNGROUP;
  } else {
    map[name] = qt.SeriesType.GROUP;
  }
}
