import * as proto from './proto';

export interface Dict<T> {
  [k: string]: T;
}

export interface GraphOptions {
  compound?: boolean;
  name?: string;
  rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
  type?: string | number;
  ranksep?: number;
  nodesep?: number;
  edgesep?: number;
}

export interface EdgeObject {
  v: string;
  w: string;
  name?: string;
}

export declare class Graph<N, E> {
  constructor(opt?: any);
  setNode(name: string, value?: N): void;
  hasNode(name: string): boolean;
  setEdge(fromName: string, toName: string, value?: E): void;
  hasEdge(fromName: string, toName: string): boolean;
  edge(fromName: string, toName: string): E;
  edge(edgeObject: EdgeObject): E;
  removeEdge(v: string, w: string): void;
  nodes(): string[];
  node(name: string): N;
  setGraph(options: GraphOptions): void;
  graph(): GraphOptions;
  nodeCount(): number;
  neighbors(name: string): string[];
  successors(name: string): string[];
  predecessors(name: string): string[];
  edges(): EdgeObject[];
  outEdges(name: string): E[];
  inEdges(name: string): E[];
  sources(): string[];
  removeNode(name: string): void;
  removeNode(name: string): Graph<N, E>;
  setParent(name: string, parentName: string): void;
}

export declare const dagre: {layout(graph: Graph<any, any>): void};

export enum GraphType {
  FULL,
  EMBEDDED,
  META,
  SERIES,
  CORE,
  SHADOW,
  BRIDGE,
  EDGE
}
export enum NodeType {
  META,
  OP,
  SERIES,
  BRIDGE,
  ELLIPSIS
}

export enum InclusionType {
  INCLUDE,
  EXCLUDE
}

export enum SeriesType {
  GROUP,
  UNGROUP
}

export enum AnnotationType {
  SHORTCUT,
  CONSTANT,
  SUMMARY,
  ELLIPSIS
}

export enum SelectionType {
  OP_GRAPH = 'op_graph',
  CONCEPTUAL_GRAPH = 'conceptual_graph',
  PROFILE = 'profile'
}

export enum ColorBy {
  STRUCTURE,
  DEVICE,
  CLUSTER,
  TIME,
  MEMORY,
  COMPAT
}

export interface BaseEdge extends EdgeObject {
  isRef: boolean;
  outKey: string;
  isControlDep: boolean;
}

export interface NormInput {
  name: string;
  outKey: string;
  isControlDep: boolean;
}

export interface BuildParams {
  enableEmbed: boolean;
  inEmbedTypes: string[];
  outEmbedTypes: string[];
  refEdges: Dict<boolean>;
}

export interface Node {
  name: string;
  type: NodeType;
  isGroup: boolean;
  cardinality: number;
  parent?: Node;
  stats?: NodeStats;
  include?: InclusionType;
  attributes: Dict<any>;
}

export interface BridgeNode extends Node {
  inbound: boolean;
}

export interface EllipsisNode extends Node {
  countMore: number;
  setCountMore(count: number): void;
}

export type EdgeShape = number[];

export interface OpNode extends Node {
  op: string;
  device?: string;
  cluster?: string;
  series?: string;
  attr: {key: string; value: any}[];
  ins: NormInput[];
  outShapes: Dict<EdgeShape>;
  inEmbeds: OpNode[];
  outEmbeds: OpNode[];
  compatible: boolean;
  fInputIdx?: number;
  fOutputIdx?: number;
}

export interface GroupNode extends Node {
  metag: Graph<GroupNode | OpNode, MetaEdge>;
  bridgeg?: Graph<GroupNode | OpNode, MetaEdge>;
  deviceHisto: Dict<number>;
  clusterHisto: Dict<number>;
  compatHisto: {compatible: number; incompatible: number};
  noControlEdges: boolean;
}

export interface MetaNode extends GroupNode {
  depth: number;
  template?: string;
  opHistogram: Dict<number>;
  assocFn?: string;
  getFirstChild(): GroupNode | OpNode;
  getRootOp(): OpNode;
  leaves(): string[];
}

export interface MetaEdge extends EdgeObject {
  bases: BaseEdge[];
  inbound?: boolean;
  numRegular: number;
  numControl: number;
  numRef: number;
  size: number;
  addBase(e: BaseEdge, h: Hierarchy): void;
}

export interface SeriesNode extends GroupNode {
  hasLoop: boolean;
  prefix: string;
  suffix: string;
  parentName: string;
  cluster: number;
  ids: number[];
}

export interface LibraryFn {
  node: MetaNode;
  usages: Node[];
}

export class SlimGraph {
  nodes = {} as Dict<OpNode>;
  edges = [] as BaseEdge[];
  addEdge(src: string, dst: OpNode, ni: NormInput, ps: BuildParams, i: number) {
    if (src !== dst.name) {
      const isRef = ps.refEdges[dst.op + ' ' + i] === true;
      this.edges.push({
        v: src,
        w: dst.name,
        outKey: ni.outKey,
        isControlDep: ni.isControlDep,
        isRef
      });
    }
  }
}

export interface Edges {
  control: MetaEdge[];
  regular: MetaEdge[];
}

export type Template = {names: string[]; level: number};

export interface Hierarchy {
  root: MetaNode;
  libraryFns: Dict<LibraryFn>;
  devices: string[];
  clusters: string[];
  templates: Dict<Template>;
  hasShapeInfo: boolean;
  maxMetaEdgeSize: number;
  options: GraphOptions;
  node(n?: string): GroupNode | OpNode | undefined;
  setNode(n: string, g: GroupNode | OpNode): void;
  getNodeMap(): Dict<GroupNode | OpNode>;
  getBridge(n: string): Graph<GroupNode | OpNode, MetaEdge> | undefined;
  getPreds(n: string): Edges;
  getSuccs(n: string): Edges;
  getOrdering(n: string): Dict<number>;
  getIndexer(): (n: string) => number;
  mergeStats(s: proto.StepStats): void;
}

export interface HierarchyParams {
  verifyTemplate: boolean;
  seriesMinSize: number;
  seriesMap: Dict<SeriesType>;
  rankdir: 'TB' | 'BT' | 'LR' | 'RL';
  usePatterns: boolean;
}

export const Class = {
  Node: {
    CONTAINER: 'nodes',
    GROUP: 'node',
    SHAPE: 'nodeshape',
    COLOR_TARGET: 'nodecolortarget',
    LABEL: 'nodelabel',
    BUTTON_CONTAINER: 'buttoncontainer',
    BUTTON_CIRCLE: 'buttoncircle',
    EXPAND_BUTTON: 'expandbutton',
    COLLAPSE_BUTTON: 'collapsebutton'
  },
  Edge: {
    CONTAINER: 'edges',
    GROUP: 'edge',
    LINE: 'edgeline',
    REFERENCE_EDGE: 'referenceedge',
    REF_LINE: 'refline',
    SELECTABLE: 'selectableedge',
    SELECTED: 'selectededge',
    STRUCTURAL: 'structural'
  },
  Annotation: {
    OUTBOX: 'out-annotations',
    INBOX: 'in-annotations',
    GROUP: 'annotation',
    NODE: 'annotation-node',
    EDGE: 'annotation-edge',
    CONTROL_EDGE: 'annotation-control-edge',
    LABEL: 'annotation-label',
    ELLIPSIS: 'annotation-ellipsis'
  },
  Scene: {
    GROUP: 'scene',
    CORE: 'core',
    FUNCTION_LIBRARY: 'function-library',
    INEXTRACT: 'in-extract',
    OUTEXTRACT: 'out-extract'
  },
  Subscene: {GROUP: 'subscene'},
  OPNODE: 'op',
  METANODE: 'meta',
  SERIESNODE: 'series',
  BRIDGENODE: 'bridge',
  ELLIPSISNODE: 'ellipsis'
};

export interface Tracker {
  setMessage(m: string): void;
  reportError(m: string, err: Error): void;
  updateProgress(inc: number): void;
}

export interface Health {
  device_name: string;
  node_name: string;
  output_slot: number;
  dtype: string;
  shape: number[];
  value: number[];
  wall_time: number;
  step: number;
}

export interface HealthEntry {
  background_color: string;
  label: string;
}

export class NodeStats {
  size: number[][];
  bytes?: number;
  start?: number;
  end?: number;

  constructor(size: number[][]) {
    this.size = size;
  }
  addBytes(bytes: number) {
    this.bytes = Math.max(this.bytes ?? 0, bytes);
  }
  addTime(start: number, end: number) {
    this.start = Math.min(this.start ?? Infinity, start);
    this.end = Math.max(this.end ?? 0, end);
  }
  combine(stats: NodeStats) {
    this.bytes = this.bytes ?? 0 + (stats.bytes ?? 0);
    if (stats.getMicros() !== undefined) {
      this.addTime(stats.start!, stats.end!);
    }
  }
  getMicros() {
    if (this.start !== undefined && this.end !== undefined) {
      return this.end - this.start;
    }
    return undefined;
  }
}
