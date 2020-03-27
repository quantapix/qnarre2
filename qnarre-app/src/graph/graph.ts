import * as _ from 'lodash';

import * as qg from './core/graph';
import * as qt from './types';
import * as qu from './utils';

export {Link, Nodes} from './core/graph';

export interface Opts extends qg.Opts {
  rankdir: qt.Dir;
  edgesep: number;
  nodesep: number;
  ranksep: number;
}

export interface Gdata extends Opts {
  type: qt.GdataT;
  name?: string;
}

export interface Ndata {
  type: qt.NdataT;
  name?: string;
  cardin: number;
  parent?: Ndata;
  stats?: qu.Stats;
  include?: boolean;
  excluded?: boolean;
  expanded?: boolean;
  attrs: qt.Dict<any>;
  annos: qt.Dict<AnnoList>;
  extract: qt.Dict<boolean>;
  hasTypeIn(ts: string[]): boolean;
  addInAnno(n: Ndata, e: Edata, t: qt.AnnoT): this;
  addOutAnno(n: Ndata, e: Edata, t: qt.AnnoT): this;
}

export interface Edata {
  name?: string;
  control?: boolean;
  ref?: boolean;
  out: string;
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
  return x?.type === qt.NdataT.OPER;
}

export interface Nclus extends Ndata {
  core: Cgraph;
  meta: Mgraph;
  parent?: Nclus;
  bridge?: Bgraph;
  histo: qt.Histos;
  noControls?: boolean;
  setDepth(d: number): this;
  subBuild(s: any, e: any): any;
}

export function isClus(x?: any): x is Nclus {
  return !!x && 'meta' in x;
}

export interface Nmeta extends Nclus {
  template?: string;
  assoc?: string;
  depth: number;
  rootOp(): Noper | undefined;
}

export function isMeta(x?: any): x is Nmeta {
  return x?.type === qt.NdataT.META;
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
  return x?.type === qt.NdataT.LIST;
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

export interface Hierarchy {
  maxEdgeSize: number;
  sizeOf(l: qg.Link<Edata>): number;
}

export interface Library {
  meta: Nmeta;
  usages: Noper[];
}

export interface Anno extends qt.Rect {
  type: qt.AnnoT;
  ndata: Ndata;
  edata: Edata;
  isIn?: boolean;
  nodes?: string[];
  points: qt.Point[];
  offset: number;
}

export interface AnnoList {
  list: Anno[];
  names: qt.Dict<boolean>;
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
          case qt.NdataT.META:
          case qt.NdataT.LIST:
            const cd: Nclus = nd as any;
            cd.setDepth(d - 1);
            break;
        }
      }
    });
  }

  createShortcut(ns: string[]) {
    const s = this.node(ns[0])!;
    const d = this.node(ns[1])!;
    const e = this.edge(ns)!;
    if (s.include && d.include) return;
    s.addOutAnno(d, e, qt.AnnoT.SHORTCUT);
    d.addInAnno(s, e, qt.AnnoT.SHORTCUT);
    this.delEdge(ns);
  }
}

export type Bgraph = Graph<Gdata, Ndata, Edata>;
export type Cgraph = Graph<Gdata, Ndata, Edata>;
export type Mgraph = Graph<Gdata, Ndata, Edata>;

export function createGraph<G extends Gdata, N extends Ndata, E extends Edata>(
  t: qt.GdataT,
  n: string,
  o = {} as Opts
) {
  const g = new Graph<G, N, E>(o);
  const d = o as G;
  d.name = n;
  d.type = t;
  d.rankdir = d.rankdir ?? 'bt';
  g.setData(d);
  return g;
}
