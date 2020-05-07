import * as _ from 'lodash';

import * as qg from './core/graph';
import * as qt from './types';
import * as qu from './utils';

export {Nodes} from './core/graph';

export class Link extends qg.Link<Edata> {}

export interface Opts extends qg.Opts {
  rankdir?: qt.Dir;
  edgesep: number;
  nodesep: number;
  ranksep: number;
}

export interface Gdata extends Opts {
  type: qt.GdataT;
  name: string;
  hier: Hierarchy;
  hasSubhier: qt.Dict<boolean>;
  nds: qt.Dict<Ndata>;
  buildSubhier(n: string): void;
}

export interface Ndata extends qt.Rect {
  r: number;
  type: qt.NdataT;
  name: string;
  cardin: number;
  display: string;
  parent?: Ndata;
  stats?: qu.Stats;
  include?: boolean;
  excluded?: boolean;
  expanded?: boolean;
  structural?: boolean;
  faded?: boolean;
  pad: qt.Pad;
  box: qt.Area;
  attrs: qt.Dict<any>;
  label: {h: number; off: number};
  width: {in: number; out: number};
  annos: {in: Annos; out: Annos};
  extract: {in: boolean; out: boolean; lib: boolean};
  centerX(): number;
  contextMenu(e: any): any;
  hasTypeIn(ts: string[]): boolean;
  addInAnno(t: qt.AnnoT, n: Ndata, e: Edata): this;
  addOutAnno(t: qt.AnnoT, n: Ndata, e: Edata): this;
  intersect(p: qt.Point): qt.Point;
  stylize(s: qt.Sel, e: any, c?: string): void;
}

export interface Edata {
  name: string;
  out?: string;
  meta?: Emeta;
  adjoining?: Emeta;
  sel?: qt.Sel;
  ref?: boolean;
  control?: boolean;
  structural?: boolean;
  faded?: boolean;
  points: qt.Point[];
  marker: {start: string; end: string};
}

export interface Nbridge extends Ndata {
  inbound?: boolean;
}

export interface Ndots extends Ndata {
  more: number;
  setMore(m: number): this;
}

export interface Noper extends Ndata {
  parent?: Ncomb;
  op: string;
  dev?: string;
  clus?: string;
  list?: string;
  compatible?: boolean;
  ins: qt.Input[];
  shapes: qt.Shapes;
  index: {in: number; out: number};
  attr: {key: string; value: any}[];
  embeds: {in: Noper[]; out: Noper[]};
}

export function isOper(x?: any): x is Noper {
  return x?.type === qt.NdataT.OPER;
}

export interface Nclus extends Ndata {
  core: Cgraph;
  meta?: Mgraph;
  parent?: Nclus;
  bridge?: Bgraph;
  noControls?: boolean;
  areas: {in: qt.Area; out: qt.Area; lib: qt.Area};
  isolated: {in: Ndata[]; out: Ndata[]; lib: Ndata[]};
  histo: {
    dev: qt.Histo;
    clus: qt.Histo;
    comp: {compats: number; incompats: number};
  };
  setDepth(d: number): this;
  buildSub(s: any, e: any): void;
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

export interface Emeta extends Edata {
  size: number;
  weight: number;
  inbound?: boolean;
  nodes?: string[];
  links: Link[];
  num: {regular: number; control: number; ref: number};
}

export type Template = {names: string[]; level: number};
export type Group = {nodes: Nmeta[]; level: number};
export type Cluster = {node: Nmeta; names: string[]};

export interface Edges {
  control: Emeta[];
  regular: Emeta[];
}

export interface Hierarchy {
  clus: string[];
  libs: qt.Dict<Library>;
  maxEdgeSize: number;
  size(l: Link): number;
  node(x: any): Ncomb | undefined;
  setNode(x: any, d?: Ncomb): this;
  bridge(x: any): Bgraph | undefined;
}

export interface Library {
  meta: Nmeta;
  usages: Noper[];
}

export interface Anno extends qt.Rect {
  type: qt.AnnoT;
  nd: Ndata;
  ed: Edata;
  offset: number;
  nodes?: string[];
  points: qt.Point[];
  inbound?: boolean;
  initSizes(): void;
}

export interface Annos extends Array<Anno> {
  names: qt.Dict<boolean>;
}

export class Graph<
  G extends Gdata,
  N extends Ndata,
  E extends Edata
> extends qg.Graph<G, N, E> {
  runLayout(_opts?: Opts): this {
    return this;
  }
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
    s.addOutAnno(qt.AnnoT.SHORTCUT, d, e);
    d.addInAnno(qt.AnnoT.SHORTCUT, s, e);
    this.delEdge(ns);
  }
}

export type Ncomb = Nclus | Noper;

export type Bgraph = Graph<Gdata, Ncomb, Edata>;
export type Cgraph = Graph<Gdata, Ndata, Edata>;
export type Mgraph = Graph<Gdata, Ncomb, Edata>;

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

export function toClass(t: qt.NdataT) {
  switch (t) {
    case qt.NdataT.OPER:
      return qt.Class.OPER;
    case qt.NdataT.META:
      return qt.Class.META;
    case qt.NdataT.LIST:
      return qt.Class.LIST;
    case qt.NdataT.BRIDGE:
      return qt.Class.BRIDGE;
    case qt.NdataT.DOTS:
      return qt.Class.DOTS;
    default:
      throw Error('Invalid type: ' + t);
  }
}
