import * as _ from 'lodash';

import * as qg from './core/graph';
import * as qt from './types';
import * as qu from './utils';

export {Link, Nodes} from './core/graph';

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
}

export interface Ndata extends qt.Rect {
  r: number;
  type: qt.NdataT;
  name: string;
  cardin: number;
  parent?: Ndata;
  stats?: qu.Stats;
  include?: boolean;
  excluded?: boolean;
  expanded?: boolean;
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
  updateTotalWidthOfNode(): void;
  listName(): string | undefined;
  stylize(s: qt.Selection, e: any, c?: string): void;
}

export interface Edata {
  name: string;
  out: string;
  ref?: boolean;
  control?: boolean;
  structural?: boolean;
  points: qt.Point[];
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
  meta: Mgraph;
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
  name = '';
  out = '';
  ref?: boolean;
  control?: boolean;
  structural?: boolean;
  points = [] as qt.Point[];
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

export interface Edges {
  control: Emeta[];
  regular: Emeta[];
}

export interface Hierarchy {
  bridge(x: any): Bgraph | undefined;
  libs: qt.Dict<Library>;
  maxEdgeSize: number;
  sizeOf(l: qg.Link<Edata>): number;
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

export type Bgraph = Graph<Gdata, Nclus | Noper, Edata>;
export type Cgraph = Graph<Gdata, Ndata, Edata>;
export type Mgraph = Graph<Gdata, Nclus | Noper, Edata>;

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
