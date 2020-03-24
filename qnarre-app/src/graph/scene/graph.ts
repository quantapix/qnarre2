import * as _ from 'lodash';
import * as proto from './proto';
import * as qp from './params';
import * as qt from './types';
import * as qu from './util';

export interface Gdata extends qt.Named, qt.Opts {
  type: string | number;
}

export abstract class Ndata implements qt.Named {
  parent?: Ndata;
  stats?: qt.NodeStats;
  include?: boolean;
  attrs = {} as qt.Dict<any>;
  constructor(
    public name: string,
    public type: qt.NodeType,
    public cardinality = 1
  ) {}
}

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

export type MetaGraph<N = Ngroup | Noper, E = Emeta> = qt.Graph<Gdata, N, E>;
export type BridgeGraph<N = Ngroup | Noper, E = Emeta> = qt.Graph<Gdata, N, E>;

export interface Nbridge extends Ndata {
  inbound: boolean;
}

export class Nellipsis extends Ndata {
  more = 0;

  constructor(m: number) {
    super('', qt.NodeType.ELLIPSIS);
    this.setMore(m);
  }

  setMore(m: number) {
    this.more = m;
    this.name = '... ' + m + ' more';
  }
}

export type Shapes = number[][];

export class Noper extends Ndata {
  op: string;
  device?: string;
  cluster?: string;
  series?: string;
  attr: {key: string; value: any}[];
  ins: qt.Input[];
  inbeds = [] as Noper[];
  outbeds = [] as Noper[];
  shapes: Shapes;
  inIdx?: number;
  outIdx?: number;
  compatible = false;

  constructor(d: proto.NodeDef) {
    super(d.name, qt.NodeType.OP);
    this.op = d.op;
    this.device = d.device;
    this.cluster = cluster(d.attr);
    this.attr = d.attr;
    this.ins = inputs(d.input);
    this.shapes = shapes(d.attr);
  }
}

function cluster(ps: {key: string; value: any}[]) {
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].key === '_cluster') return ps[i].value['s'] as string;
  }
  return undefined;
}

function inputs(ns: string[]) {
  const ins = [] as qt.Input[];
  ns.forEach(n => {
    const isControl = n.startsWith('^');
    if (isControl) n = n.substring(1);
    let name = n;
    let out = '0';
    let m = n.match(/(.*):(\w+:\d+)$/);
    if (m) {
      name = m[1];
      out = m[2];
    } else {
      m = n.match(/(.*):(\d+)$/);
      if (m) {
        name = m[1];
        out = m[2];
      }
    }
    if (ins.length === 0 || ins[ins.length - 1].name !== name) {
      ins.push({isControl, name, out});
    }
  });
  return ins;
}

function shapes(ps: {key: string; value: any}[]) {
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

export abstract class Ngroup extends Ndata {
  parent?: Ngroup;
  bridge?: BridgeGraph;
  histo = {} as Histos;
  noControls?: boolean;

  constructor(n: string, t: qt.NodeType, public meta: MetaGraph) {
    super(n, t, 0);
    this.histo.device = {} as qt.Dict<number>;
    this.histo.cluster = {} as qt.Dict<number>;
    this.histo.compat = {compats: 0, incompats: 0};
  }

  incHistoFrom(src: any) {
    _.keys(this.histo).forEach(k => {
      const n = src[k];
      if (n) {
        const t = this.histo[k];
        t[n] = (t[n] ?? 0) + 1;
      }
    });
  }

  incCompatFrom(src: any) {
    const c = this.histo.compat;
    if (src.compatible) {
      c.compats += 1;
    } else {
      c.incompats += 1;
    }
  }
}

export function isGroup(x?: any): x is Ngroup {
  return !!x && 'meta' in x;
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
      if (isGroup(n)) {
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
  usages: Noper[];
}

export type Template = {names: string[]; level: number};

export interface Edata extends qt.Named {
  isControl: boolean;
  isRef: boolean;
  out: string;
}

export interface Hierarchy {
  maxEdgeSize: number;
  sizeOf(l: qt.Link<Edata>): number;
}

export class Emeta implements Edata {
  isControl = false;
  isRef = false;
  out = '';
  links = [] as qt.Link<Edata>[];
  num = {regular: 0, control: 0, ref: 0};
  size = 0;

  constructor(public inbound?: boolean) {}

  addLink(l: qt.Link<Edata>, h: Hierarchy) {
    this.links.push(l);
    if (l.data?.isControl) {
      this.num.control += 1;
    } else {
      this.num.regular += 1;
    }
    if (l.data?.isRef) this.num.ref += 1;
    this.size += h.sizeOf(l);
    h.maxEdgeSize = Math.max(h.maxEdgeSize, this.size);
    return this;
  }
}

export class SlimGraph {
  opers = {} as qt.Dict<Noper>;
  links = [] as qt.Link<Edata>[];

  constructor(public opts = {} as qt.Opts) {}

  addLink(s: string, d: Noper, inp: qt.Input, ps: qt.BuildParams, i: number) {
    if (s !== d.name) {
      const isRef = ps.refEdges[d.op + ' ' + i] === true;
      const l = new qt.Link<Edata>([s, d.name], this.opts);
      l.data = {
        isControl: inp.isControl,
        isRef,
        out: inp.out
      } as Edata;
      this.links.push(l);
    }
  }

  mergeStats(stats: proto.StepStats, devices?: qt.Dict<boolean>) {
    _.each(this.opers, o => (o.stats = undefined));
    stats.dev_stats.forEach(ds => {
      if (devices && !devices[ds.device]) return;
      ds.node_stats.forEach(ns => {
        const o =
          ns.node_name in this.opers ? ns.node_name : strictName(ns.node_name);
        if (!(o in this.opers)) return;
        let b = 0;
        if (ns.memory) {
          _.each(ns.memory, m => {
            if (m.total_bytes) {
              if (m.total_bytes > 0) {
                b += Number(m.total_bytes);
              } else {
                console.log('ignoring negative memory for ' + o);
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
        this.opers[o].device = ds.device;
        if (!this.opers[o].stats) {
          this.opers[o].stats = new qt.NodeStats(s);
        }
        this.opers[o].stats?.addBytes(b);
        if (ns.all_end_rel_micros) {
          if (ns.all_end_rel_micros > 0) {
            this.opers[o].stats?.addTime(
              ns.all_start_micros,
              ns.all_start_micros + ns.all_end_rel_micros
            );
          } else {
            console.log('ignoring negative runtime for ' + o);
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
  const opers = await t.runAsyncTask('Normalizing names', 30, () => {
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
    opers.forEach(o => {
      const nn = norms[o.name] || o.name;
      g.opers[nn] = o;
      if (o.name in outs) {
        o.outbeds = outs[o.name];
        o.outbeds.forEach(n2 => (n2.name = norms[n2.name] || n2.name));
      }
      o.name = nn;
    });
    opers.forEach(o => {
      o.ins.forEach((inp, i) => {
        const nn = inp.name;
        if (nn in inEmbed) {
          const ie = inEmbed[nn];
          o.inbeds.push(ie);
          for (const e of ie.ins) {
            g.addLink(norms[e.name] || e.name, o, e, ps, i);
          }
        } else if (nn in outEmbed) {
          const oe = outEmbed[nn];
          for (const e of oe.ins) {
            g.addLink(norms[e.name] || e.name, o, inp, ps, i);
          }
        } else {
          g.addLink(norms[nn] || nn, o, inp, ps, i);
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
