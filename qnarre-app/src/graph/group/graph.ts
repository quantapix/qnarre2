import * as _ from 'lodash';

import * as qg from '../graph';
import * as qt from './types';
import * as qu from './utils';

export {Link, Nodes} from '../graph';

export interface Gdata extends qt.Opts {
  name: string;
  type: string | number;
}

export abstract class Ndata {
  parent?: Ndata;
  stats?: qu.Stats;
  include?: boolean;
  expanded?: boolean;
  attrs = {} as qt.Dict<any>;
  constructor(public type: qt.NodeType, public name = '', public cardin = 1) {}
}

export interface Nbridge extends Ndata {
  inbound?: boolean;
}

export interface Ndots extends Ndata {
  more: number;
  setMore(m: number): this;
}

export interface Noper extends Ndata {
  parent?: Noper | Nclus;
  op: string;
  device?: string;
  cluster?: string;
  list?: string;
  attr: {key: string; value: any}[];
  ins: qt.Input[];
  shapes: qt.Shapes;
  index: qt.Dict<number>;
  embeds: qt.Dict<Noper[]>;
  compatible?: boolean;
}

export function isOper(x?: any): x is Noper {
  return x?.type === qt.NodeType.OPER;
}

export interface Nclus extends Ndata {
  core: any;
  meta: any;
  parent?: any;
  bridge?: any;
  histo: qt.Histos;
  noControls?: boolean;
  setDepth(d: number): this;
}

export function isClus(x?: any): x is Nclus {
  return !!x && 'meta' in x;
}

export interface Nmeta extends Nclus {
  template?: string;
  assoc?: string;
  depth: number;
}

export function isMeta(x?: any): x is Nmeta {
  return x?.type === qt.NodeType.META;
}

export interface Library {
  meta: Nmeta;
  usages: Noper[];
}

export interface Nlist extends Nclus {
  prefix: string;
  suffix: string;
  pName: string;
  cluster: number;
  loop?: boolean;
  ids: number[];
}

export function isList(x?: any): x is Nlist {
  return x?.type === qt.NodeType.LIST;
}

export interface Edata {
  name?: string;
  control?: boolean;
  ref?: boolean;
  out: string;
}

export interface Hierarchy {
  maxEdgeSize: number;
  sizeOf(l: qg.Link<Edata>): number;
}

export class Emeta implements Edata {
  name?: string;
  control?: boolean;
  ref?: boolean;
  out = '';
  links = [] as qg.Link<Edata>[];
  num = {regular: 0, control: 0, ref: 0};
  size = 0;

  constructor(public inbound?: boolean) {}

  addLink(l: qg.Link<Edata>, h: Hierarchy) {
    this.links.push(l);
    if (l.data?.control) {
      this.num.control += 1;
    } else {
      this.num.regular += 1;
    }
    if (l.data?.ref) this.num.ref += 1;
    this.size += h.sizeOf(l);
    h.maxEdgeSize = Math.max(h.maxEdgeSize, this.size);
    return this;
  }
}

export type Template = {names: string[]; level: number};
export type Group = {nodes: Nmeta[]; level: number};
export type Cluster = {node: Nmeta; names: string[]};

export class Anno {
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  nodes?: string[];
  points = [] as {dx: number; dy: number}[];
  labelOffset = 0;

  constructor(
    public ndata: Ndata,
    public emeta: Emeta,
    public type: qt.AnnoType,
    public isIn: boolean
  ) {
    if (emeta && emeta.metaedge) {
      this.v = edata.metaedge.v;
      this.w = edata.metaedge.w;
    }
  }
}

export class Graph<
  G extends Gdata,
  N extends Ndata,
  E extends Edata
> extends qg.Graph<G, N, E> {
  setDepth(d: number) {
    this.nodes().forEach(n => {
      const nd = this.node(n)!;
      nd.expanded = d > 1;
      if (d > 0) {
        switch (nd.type) {
          case qt.NodeType.META:
          case qt.NodeType.LIST:
            const cd: Nclus = nd as any;
            cd.setDepth(d - 1);
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
    s.addOutAnno(d, e, qt.AnnoType.SHORTCUT);
    d.addInAnno(s, e, qt.AnnoType.SHORTCUT);
    this.delEdge(ns);
  }
}

export function createGraph<G extends Gdata, N extends Ndata, E extends Edata>(
  n: string,
  t: string | number,
  o = {} as qt.Opts
) {
  const g = new Graph<G, N, E>(o);
  const d = o as G;
  d.name = n;
  d.type = t;
  d.rankdir = d.rankdir ?? 'bt';
  g.setData(d);
  return g;
}
