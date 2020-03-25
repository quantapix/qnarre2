import * as qg from '../graph';
import * as qt from '../types';

export {Dict, Dir, Point, Area, Pad, Rect, Selection} from '../types';
export {Named, Nodes, Edges, Link, Graph} from '../graph';

export enum GraphType {
  FULL,
  EMBEDDED,
  META,
  LIST,
  CORE,
  SHADOW,
  BRIDGE,
  EDGE
}

export enum NodeType {
  META,
  OPER,
  LIST,
  BRIDGE,
  DOTS
}

export enum AnnoType {
  SHORTCUT,
  CONSTANT,
  SUMMARY,
  DOTS
}

export enum SelectType {
  OP_GRAPH = 'op_graph',
  CONCEPT_GRAPH = 'concept_graph',
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

export interface Opts extends qg.Opts {
  rankdir: qt.Dir;
  edgesep: number;
  nodesep: number;
  ranksep: number;
}

export interface Input {
  isControl: boolean;
  name: string;
  out: string;
}

export interface Params {
  embed: boolean;
  inbedTypes: string[];
  outbedTypes: string[];
  refEdges: qt.Dict<boolean>;
}

export interface Tracker {
  setMessage(m: string): void;
  reportError(m: string, e: Error): void;
  updateProgress(i: number): void;
}

export interface Health {
  device: string;
  node: string;
  slot: number;
  dtype: string;
  shape: number[];
  value: number[];
  time: number;
  step: number;
}

export interface HealthEntry {
  background: string;
  label: string;
}

export const Class = {
  Node: {
    CONTAINER: 'nodes',
    GROUP: 'node',
    SHAPE: 'nodeshape',
    C_TARGET: 'nodecolortarget',
    LABEL: 'nodelabel',
    B_CONTAINER: 'buttoncontainer',
    B_CIRCLE: 'buttoncircle',
    E_BUTTON: 'expandbutton',
    C_BUTTON: 'collapsebutton'
  },
  Edge: {
    CONTAINER: 'edges',
    GROUP: 'edge',
    LINE: 'edgeline',
    REF_EDGE: 'referenceedge',
    REF_LINE: 'refline',
    SELECTABLE: 'selectableedge',
    SELECTED: 'selectededge',
    STRUCTURAL: 'structural'
  },
  Anno: {
    OUTBOX: 'out-annotations',
    INBOX: 'in-annotations',
    GROUP: 'annotation',
    NODE: 'annotation-node',
    EDGE: 'annotation-edge',
    CTRL_EDGE: 'annotation-control-edge',
    LABEL: 'annotation-label',
    DOTS: 'annotation-ellipsis'
  },
  Scene: {
    GROUP: 'scene',
    CORE: 'core',
    LIBRARY: 'function-library',
    INEXTRACT: 'in-extract',
    OUTEXTRACT: 'out-extract'
  },
  Subscene: {GROUP: 'subscene'},
  OPER: 'op',
  META: 'meta',
  LIST: 'series',
  BRIDGE: 'bridge',
  DOTS: 'ellipsis'
};
