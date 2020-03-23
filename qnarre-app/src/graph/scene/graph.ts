import * as _ from 'lodash';
import * as proto from './proto';
import * as qp from './params';
import * as qt from './types';
import * as qu from './util';

export function createGraph<G extends Gdata, N extends Ndata, E extends Edata>(
  n: string,
  t: string | number,
  o = {} as qt.Opts
) {
  const g = new qt.Graph<G, N, E>(o);
  const d = o as G;
  d.name = n;
  d.type = t;
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
  inIdx?: number;
  outIdx?: number;

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

function extractCluster(ps: {key: string; value: any}[]) {
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

function extractShapes(ps: {key: string; value: any}[]) {
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

export abstract class Ngroup implements Ndata {
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

  constructor(n: string, o = {} as qt.Opts) {
    super(
      n,
      qt.NodeType.META,
      createGraph<Gdata, Ngroup | Noper, Emeta>(n, qt.GraphType.META, o)
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
    n = seriesName(prefix, suffix, parentName),
    o = {} as qt.Opts
  ) {
    super(
      n,
      qt.NodeType.SERIES,
      createGraph<Gdata, Nmeta, Emeta>(n, qt.GraphType.SERIES, o)
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

export interface LibraryFn {
  meta: Nmeta;
  usages: Node[];
}

export type Template = {names: string[]; level: number};

export interface Edata extends qt.Named {
  isRef: boolean;
  outKey: string;
  isControl: boolean;
}

export interface Edges {
  control: Nmeta[];
  regular: Nmeta[];
}

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

  constructor(ns: string[]) {
    this.v = v;
    this.w = w;
  }

  addBase(l: qt.Link<Edata>, h: qt.Hierarchy) {
    this.bases.push(l);
    if (l.data?.isControl) {
      this.numControl += 1;
    } else {
      this.numRegular += 1;
    }
    if (l.data?.isRef) this.numRef += 1;
    this.size += sizeOf(l, h);
    h.maxEmetadgeSize = Math.max(h.maxEmetadgeSize, this.size);
  }
}

function sizeOf(l: qt.Link<Edata>, h: qt.Hierarchy) {
  const n = h.node(l.nodes[0]) as Noper;
  if (!n.outShapes.length) return 1;
  h.hasShape = true;
  const vs = n.outShapes.map(s =>
    s.reduce((a, v) => a * (v === -1 ? 1 : v), 1)
  );
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
    stats.dev_stats.forEach(ds => {
      if (devices && !devices[ds.device]) return;
      ds.node_stats.forEach(ns => {
        const n =
          ns.node_name in g.nodes ? ns.node_name : strictName(ns.node_name);
        if (!(n in g.nodes)) return;
        let b = 0;
        if (ns.memory) {
          _.each(ns.memory, m => {
            if (m.total_bytes) {
              if (m.total_bytes > 0) {
                b += Number(m.total_bytes);
              } else {
                console.log('ignoring negative memory for ' + n);
              }
            }
          });
        }
        let s = [] as number[][];
        if (ns.output) {
          s = ns.output.map(o =>
            o.tensor_description.shape.dim.map(d => d.size)
          );
        }
        g.nodes[n].device = ds.device;
        if (!g.nodes[n].stats) {
          g.nodes[n].stats = new qt.NodeStats(s);
        }
        g.nodes[n].stats?.addBytes(b);
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
  const outs = {} as qt.Dict<Noper[]>;
  const isIn = embedPred(ps.inEmbedTypes);
  const isOut = embedPred(ps.outEmbedTypes);
  const es = [] as string[];
  const raws = def.node;
  const ns = new Array<string>(raws.length);
  const nodes = await t.runAsyncTask('Normalizing names', 30, () => {
    const ops = new Array<Noper>(raws.length);
    let i = 0;
    function raw(p: proto.NodeDef) {
      const o = new Noper(p);
      if (isIn(o)) {
        es.push(o.name);
        inEmbed[o.name] = o;
        return o;
      }
      if (isOut(o)) {
        es.push(o.name);
        outEmbed[o.name] = o;
        o.ins.forEach(inp => {
          const n = inp.name;
          outs[n] = outs[n] || [];
          outs[n].push(o);
        });
        return o;
      }
      ops[i] = o;
      ns[i] = o.name;
      i++;
      return o;
    }
    raws.forEach(raw);
    function process(fn: proto.FunctionDef) {
      const f = qp.LIBRARY_PREFIX + fn.signature.name;
      raw({name: f, input: [], device: '', op: '', attr: []});
      let args = fn.signature.input_arg;
      if (args.length) {
        let idx = 0;
        // eslint-disable-next-line no-inner-declarations
        function input(arg: proto.ArgDef) {
          const o = raw({
            name: f + qp.NAMESPACE_DELIM + arg.name,
            input: [],
            device: '',
            op: 'input_arg',
            attr: [{key: 'T', value: {type: arg.type}}]
          });
          o.inIdx = idx;
          idx++;
        }
        args.forEach(input);
      }
      const onames = {} as qt.Dict<any>;
      args = fn.signature.output_arg;
      if (args.length) {
        let idx = 0;
        // eslint-disable-next-line no-inner-declarations
        function output(arg: proto.ArgDef) {
          onames[f + qp.NAMESPACE_DELIM + arg.name] = idx;
          idx++;
        }
        args.forEach(output);
      }
      fn.node_def.forEach(r => {
        r.name = f + '/' + r.name;
        if (typeof r.input === 'string') r.input = [r.input];
        const o = raw(r);
        if (_.isNumber(onames[r.name])) o.outIdx = onames[r.name];
        o.ins.forEach(n => {
          n.name = f + qp.NAMESPACE_DELIM + n.name;
        });
      });
    }
    def.library?.function?.forEach(process);
    ops.splice(i);
    ns.splice(i);
    return ops;
  });
  return t.runAsyncTask('Building data structure', 70, () => {
    const norms = mapHierarchy(ns, es);
    const g = new SlimGraph();
    nodes.forEach(n => {
      const nn = norms[n.name] || n.name;
      g.nodes[nn] = n;
      if (n.name in outs) {
        n.outEmbeds = outs[n.name];
        n.outEmbeds.forEach(n2 => (n2.name = norms[n2.name] || n2.name));
      }
      n.name = nn;
    });
    nodes.forEach(n => {
      n.ins.forEach((inp, i) => {
        const nn = inp.name;
        if (nn in inEmbed) {
          const ie = inEmbed[nn];
          n.inEmbeds.push(ie);
          for (const e of ie.ins) {
            g.addEdge(norms[e.name] || e.name, n, e, ps, i);
          }
        } else if (nn in outEmbed) {
          const oe = outEmbed[nn];
          for (const e of oe.ins) {
            g.addEdge(norms[e.name] || e.name, n, inp, ps, i);
          }
        } else {
          g.addEdge(norms[nn] || nn, n, inp, ps, i);
        }
      });
    });
    _.each(inEmbed, n => (n.name = norms[n.name] || n.name));
    return g;
  });
}

function embedPred(types: string[]) {
  return (n: Noper) => {
    for (let i = 0; i < types.length; i++) {
      const re = new RegExp(types[i]);
      if (typeof n.op === 'string' && n.op.match(re)) return true;
    }
    return false;
  };
}

function mapHierarchy(names: string[], enames: string[]) {
  const m = {} as qt.Dict<string>;
  const es = {} as qt.Dict<boolean>;
  names.sort();
  for (let i = 0; i < names.length - 1; ++i) {
    const n0 = names[i];
    hierarchyPath(n0)
      .slice(0, -1)
      .forEach(p => (es[p] = true));
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
  enames.forEach(e => {
    if (e in es) m[e] = strictName(e);
  });
  return m;
}

export function hierarchyPath(name: string, series?: qt.Dict<string>) {
  const p = [] as string[];
  let i = name.indexOf(qp.NAMESPACE_DELIM);
  while (i >= 0) {
    p.push(name.substring(0, i));
    i = name.indexOf(qp.NAMESPACE_DELIM, i + 1);
  }
  if (series) {
    const n = series[name];
    if (n) p.push(n);
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
