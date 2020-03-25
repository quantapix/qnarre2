import * as _ from 'lodash';

import * as qt from './types';
import * as proto from './proto';

export interface Gdata extends qt.Named, qt.Opts {
  type: string | number;
}

export abstract class Ndata {
  parent?: Ndata;
  stats?: Stats;
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

export type MetaGraph<N = Nclus | Noper, E = Emeta> = qt.Graph<Gdata, N, E>;
export type BridgeGraph<N = Nclus | Noper, E = Emeta> = qt.Graph<Gdata, N, E>;

export interface Nbridge extends Ndata {
  inbound: boolean;
}

export class Ndots extends Ndata {
  more = 0;

  constructor(m: number) {
    super('', qt.NodeType.DOTS);
    this.setMore(m);
  }

  setMore(m: number) {
    this.more = m;
    this.name = '... ' + m + ' more';
  }
}

export type Shapes = number[][];

export class Noper extends Ndata {
  parent?: Noper | Nclus;
  op: string;
  device?: string;
  cluster?: string;
  list?: string;
  attr: {key: string; value: any}[];
  ins: qt.Input[];
  inbeds = [] as Noper[];
  outbeds = [] as Noper[];
  shapes: Shapes;
  inIdx?: number;
  outIdx?: number;
  compatible = false;

  constructor(d: proto.NodeDef) {
    super(d.name, qt.NodeType.OPER);
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

export type Histos = qt.Dict<qt.Dict<number>>;

export abstract class Nclus extends Ndata {
  parent?: Nclus;
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

export function isClus(x?: any): x is Nclus {
  return !!x && 'meta' in x;
}

export class Nmeta extends Nclus {
  depth = 1;
  template?: string;
  assocFn?: string;

  constructor(n: string, o = {} as qt.Opts) {
    super(
      n,
      qt.NodeType.META,
      createGraph<Gdata, Nclus | Noper, Emeta>(n, qt.GraphType.META, o)
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
      if (isClus(n)) {
        const m = (n as Nclus).meta;
        m.nodes().forEach(n => q.push(m.node(n)!));
      } else {
        ls.push(n.name!);
      }
    }
    return ls;
  }

  signature() {
    const ps = _.map(
      {
        depth: this.depth,
        '|N|': this.meta.nodeCount,
        '|E|': this.meta.edgeCount
      },
      (v, k) => k + '=' + v
    ).join(' ');
    const os = _.map(this.histo.op, (n, o) => o + '=' + n).join(',');
    return ps + ' [ops] ' + os;
  }
}

export function isMeta(x?: any): x is Nmeta {
  return x?.type === qt.NodeType.META;
}

export class Nlist extends Nclus {
  hasLoop = false;
  ids = [] as number[];

  constructor(
    public prefix: string,
    public suffix: string,
    public pName: string,
    public cluster: number,
    n = listName(prefix, suffix, pName),
    o = {} as qt.Opts
  ) {
    super(
      n,
      qt.NodeType.LIST,
      createGraph<Gdata, Nmeta, Emeta>(n, qt.GraphType.LIST, o)
    );
  }
}

export function listName(
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

export interface LibraryFn {
  meta: Nmeta;
  usages: Noper[];
}

export type Template = {names: string[]; level: number};
export type Group = {nodes: Nmeta[]; level: number};
export type Cluster = {node: Nmeta; names: string[]};

export class Stats {
  bytes?: number;
  start?: number;
  end?: number;

  constructor(public size: number[][]) {}

  addBytes(b: number) {
    this.bytes = Math.max(this.bytes ?? 0, b);
  }
  addTime(s: number, e: number) {
    this.start = Math.min(this.start ?? Infinity, s);
    this.end = Math.max(this.end ?? 0, e);
  }
  combine(ss: Stats) {
    this.bytes = this.bytes ?? 0 + (ss.bytes ?? 0);
    if (ss.getMicros() !== undefined) this.addTime(ss.start!, ss.end!);
  }
  getMicros() {
    if (this.start !== undefined && this.end !== undefined) {
      return this.end - this.start;
    }
    return undefined;
  }
}

export class Graph<G, N, E> extends qt.Graph<G, N, E> {
  setDepth(depth: number) {
    this.nodes().forEach(n => {
      const nd = this.node(n);
      nd.expanded = depth > 1;
      if (depth > 0) {
        switch (nd.type) {
          case qt.NodeType.META:
          case qt.NodeType.LIST:
            (nd as Nclus).setDepth(depth - 1);
            break;
        }
      }
    });
  }

  createShortcut(ns: string[]) {
    const s = this.node(ns[0]);
    const d = this.node(ns[1]);
    const e = this.edge(ns);
    if (s?.include && d?.include) return;

    addOutAnno(s, d, e, qt.AnnoType.SHORTCUT);
    addInAnno(d, s, s, e, qt.AnnoType.SHORTCUT);
    this.delEdge(ns);
  }

  buildSubhierarchiesForNeededFunctions() {
    this.links().forEach(l => {
      const me = this.edge(l);
      const ed = new MetaEdata(me);
      _.forEach(ed.metaedge?.bases, e => {
        const ps = e.v.split(qp.SLASH);
        for (let i = ps.length; i >= 0; i--) {
          const front = ps.slice(0, i);
          const n = this.hierarchy.node(front.join(qp.SLASH));
          if (n) {
            if (
              n.type === qt.NodeType.OPER &&
              this.hierarchy.libfns[(n as qg.Noper).op]
            ) {
              for (let j = 1; j < front.length; j++) {
                const nn = front.slice(0, j).join(qp.SLASH);
                if (!nn) continue;
                this.data?.buildSubhierarchy(nn);
              }
            }
            break;
          }
        }
      });
    });
  }
}
