import * as _ from 'lodash';
import * as proto from './proto';
import * as qp from './params';
import * as qt from './types';
import * as qu from './util';

export function createGraph<G extends Gdata, N extends Ndata, E extends Edata>(
  name: string,
  type: string | number,
  opts = {} as qt.Opts
) {
  const g = new qt.Graph<G, N, E>(opts);
  const d = opts as G;
  d.name = name;
  d.type = type;
  d.rankdir = d.rankdir ?? 'bt';
  g.setData(d);
  return g;
}

export type MetaGraph = qt.Graph<Gdata, Ngroup | Noper, Emeta>;
export type BridgeGraph = qt.Graph<Gdata, Ngroup | Noper, Emeta>;

export interface Gdata extends qt.Named, qt.Opts {
  type: string | number;
}

export interface Ndata extends qt.Named {
  type: qt.NodeType;
  isGroup: boolean;
  cardinality: number;
  parent?: Ndata;
  stats?: qt.NodeStats;
  include?: boolean;
  attrs: qt.Dict<any>;
}

export interface Nbridge extends Ndata {
  inbound: boolean;
}

export class Nellipsis implements Ndata {
  name = '';
  type = qt.NodeType.ELLIPSIS;
  isGroup = false;
  cardinality = 1;
  parent?: Ndata;
  stats?: qt.NodeStats;
  include?: boolean;
  attrs = {} as qt.Dict<any>;
  more = 0;
  constructor(m: number) {
    this.setMore(m);
  }
  setMore(m: number) {
    this.more = m;
    this.name = '... ' + m + ' more';
  }
}

export type Shapes = number[][];

export class Noper implements Ndata {
  name: string;
  type = qt.NodeType.OP;
  isGroup = false;
  cardinality = 1;
  parent?: Ndata;
  stats?: qt.NodeStats;
  include?: boolean;
  attrs = {} as qt.Dict<any>;
  op: string;
  device?: string;
  cluster?: string;
  series?: string;
  attr: {key: string; value: any}[];
  ins: qt.NormInput[];
  outShapes: Shapes;
  inEmbeds = [] as Noper[];
  outEmbeds = [] as Noper[];
  compatible = false;
  fInputIdx?: number;
  fOutputIdx?: number;

  constructor(d: proto.NodeDef) {
    this.name = d.name;
    this.op = d.op;
    this.device = d.device;
    this.cluster = extractCluster(d.attr);
    this.attr = d.attr;
    this.ins = normIns(d.input);
    this.outShapes = extractShapes(d.attr);
  }
}

function extractCluster(ps: Array<{key: string; value: any}>) {
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].key === '_cluster') return ps[i].value['s'] as string;
  }
  return undefined;
}

function normIns(ins: string[]) {
  const ns = [] as qt.NormInput[];
  ins.forEach(i => {
    const isControl = i.startsWith('^');
    if (isControl) i = i.substring(1);
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
      ns.push({name, outKey, isControl});
    }
  });
  return ns;
}

function extractShapes(ps: Array<{key: string; value: any}>) {
  for (let i = 0; i < ps.length; i++) {
    const {key, value} = ps[i];
    if (key === '_output_shapes') {
      const r = value.list.shape.map((s: any) => {
        if (s.unknown_rank) return undefined;
        if (s.dim == null || (s.dim.length === 1 && s.dim[0].size == null)) {
          return [];
        }
        return s.dim.map((d: {size: number}) => d.size);
      });
      ps.splice(i, 1);
      return r as Shapes;
    }
  }
  return [] as Shapes;
}

type Histos = qt.Dict<qt.Dict<number>>;

abstract class Ngroup implements Ndata {
  isGroup = true;
  cardinality = 0;
  parent?: Ndata;
  stats?: qt.NodeStats;
  include?: boolean;
  attrs = {} as qt.Dict<any>;
  bridge?: BridgeGraph;
  histo = {} as Histos;
  noControls?: boolean;

  constructor(
    public name: string,
    public type: qt.NodeType,
    public meta: MetaGraph
  ) {
    this.histo.cluster = {} as qt.Dict<number>;
    this.histo.device = {} as qt.Dict<number>;
    this.histo.op = {} as qt.Dict<number>;
    this.histo.compat = {compats: 0, incompats: 0};
  }
}

export class Nmeta extends Ngroup {
  depth = 1;
  template?: string;
  assocFn?: string;

  constructor(name: string, opt = {} as qt.Opts) {
    super(
      name,
      qt.NodeType.META,
      createGraph<Gdata, Ngroup | Noper, Emeta>(name, qt.GraphType.META, opt)
    );
    this.histo.op = {} as qt.Dict<number>;
  }

  firstChild() {
    return this.meta.node(this.meta.nodes()[0]);
  }

  rootOp() {
    const s = this.name.split('/');
    const r = this.name + '/(' + s[s.length - 1] + ')';
    return this.meta.node(r) as Noper;
  }

  leaves() {
    const ls = [] as string[];
    const q = [this] as Ndata[];
    while (q.length) {
      const n = q.shift()!;
      if (n.isGroup) {
        const m = (n as Ngroup).meta;
        m.nodes().forEach(n => q.push(m.node(n)!));
      } else {
        ls.push(n.name!);
      }
    }
    return ls;
  }
}

export class Nseries extends Ngroup {
  hasLoop = false;
  ids = [] as number[];

  constructor(
    public prefix: string,
    public suffix: string,
    public parentName: string,
    public cluster: number,
    name = seriesName(prefix, suffix, parentName),
    opt = {} as qt.Opts
  ) {
    super(
      name,
      qt.NodeType.SERIES,
      createGraph<Gdata, Nmeta, Emeta>(name, qt.GraphType.SERIES, opt)
    );
  }
}

export function seriesName(
  pre: string,
  suf: string,
  p: string,
  s?: number,
  e?: number
) {
  let n = s !== undefined && e !== undefined ? '[' + s + '-' + e + ']' : '#';
  n = pre + n + suf;
  return (p ? p + '/' : '') + n;
}

export interface Edata extends qt.Named {
  isRef: boolean;
  outKey: string;
  isControl: boolean;
}

export interface LibraryFn {
  meta: Nmeta;
  usages: Node[];
}

export interface Edges {
  control: Nmeta[];
  regular: Nmeta[];
}

export type Template = {names: string[]; level: number};

export class Emeta implements Edata {
  isRef = false;
  outKey = '';
  isControl = false;
  bases = [] as qt.Link<Edata>[];
  inbound?: boolean;
  numRegular = 0;
  numControl = 0;
  numRef = 0;
  size = 0;

  constructor(v: string, w: string) {
    this.v = v;
    this.w = w;
  }

  addBase(e: Edata, h: qt.Hierarchy) {
    this.bases.push(e);
    if (e.isControl) {
      this.numControl += 1;
    } else {
      this.numRegular += 1;
    }
    if (e.isRef) this.numRef += 1;
    this.size += sizeOfEdge(e, h);
    h.maxEmetadgeSize = Math.max(h.maxEmetadgeSize, this.size);
  }
}

function sizeOfEdge(e: Edata, h: qt.Hierarchy) {
  const n = h.node(e.v) as Noper;
  if (!n.outShapes.length) return 1;
  h.hasShapeInfo = true;
  const vs = Object.keys(n.outShapes)
    .map(k => n.outShapes[k])
    .map(s => (s ? s.reduce((acc, v) => acc * (v === -1 ? 1 : v), 1) : 1));
  return _.sum(vs);
}

export class SlimGraph {
  nodes = {} as qt.Dict<Noper>;
  edges = [] as BaseEdge[];

  addEdge(
    src: string,
    dst: Noper,
    ni: qt.NormInput,
    ps: qt.BuildParams,
    i: number
  ) {
    if (src !== dst.name) {
      const isRef = ps.refEdges[dst.op + ' ' + i] === true;
      this.edges.push({
        v: src,
        w: dst.name,
        outKey: ni.outKey,
        isControl: ni.isControl,
        isRef
      });
    }
  }

  mergeStats(g: SlimGraph, stats: proto.StepStats, devices?: qt.Dict<boolean>) {
    _.each(g.nodes, n => (n.stats = undefined));
    _.each(stats.dev_stats, ds => {
      if (devices && !devices[ds.device]) return;
      _.each(ds.node_stats, ns => {
        const n =
          ns.node_name in g.nodes ? ns.node_name : strictName(ns.node_name);
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
}

export function strictName(n: string) {
  const s = n.split(qp.NAMESPACE_DELIM);
  return n + qp.NAMESPACE_DELIM + '(' + s[s.length - 1] + ')';
}

export async function build(
  def: proto.GraphDef,
  ps: qt.BuildParams,
  t: qu.Tracker
): Promise<SlimGraph> {
  const inEmbed = {} as qt.Dict<Noper>;
  const outEmbed = {} as qt.Dict<Noper>;
  const outEmbeds = {} as qt.Dict<Noper[]>;
  const isInPred = embedPredicate(ps.inEmbedTypes);
  const isOutPred = embedPredicate(ps.outEmbedTypes);
  const enames = [] as string[];
  const raws = def.node;
  const names = new Array<string>(raws.length);
  const nodes = await t.runAsyncTask('Normalizing names', 30, () => {
    const ops = new Array<Noper>(raws.length);
    let i = 0;
    function processRaw(raw: proto.NodeDef) {
      const o = new Noper(raw);
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
    const g = new SlimGraph();
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
  return (n: Noper) => {
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
          m[n0] = strictName(n0);
          break;
        }
      } else {
        break;
      }
    }
  }
  _.each(enames, e => {
    if (e in es) m[e] = strictName(e);
  });
  return m;
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

export function includeButtonString(inc?: boolean) {
  if (!inc) {
    return 'Add to main graph';
  } else {
    return 'Remove from main graph';
  }
}

export function groupButtonString(group?: boolean) {
  if (!group) {
    return 'Group these nodes';
  } else {
    return 'Ungroup these nodes';
  }
}

export function toggleGroup(map: qt.Dict<boolean>, n: string) {
  if (!(n in map) || map[n] === true) {
    map[n] = false;
  } else {
    map[n] = true;
  }
}
