import * as qg from '../graph';
import * as qt from '../types';

export {Area, Dict, Dir, Pad, Point, Rect, Selection} from '../types';

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
  OPER = 'op_graph',
  CONCEPT = 'concept_graph',
  PROFILE = 'profile'
}

export enum ColorBy {
  STRUCTURE = 'STRUCTURE',
  DEVICE = 'DEVICE',
  CLUSTER = 'CLUSTER',
  TIME = 'TIME',
  MEMORY = 'MEMORY',
  COMPAT = 'COMPAT'
}

export interface Opts extends qg.Opts {
  rankdir: qt.Dir;
  edgesep: number;
  nodesep: number;
  ranksep: number;
}

export interface Input {
  control?: boolean;
  name: string;
  out: string;
}

export type Shapes = number[][];

export type Histos = qt.Dict<qt.Dict<number>>;

export interface Tracker {
  setMessage(m: string): void;
  reportError(m: string, e: Error): void;
  updateProgress(i: number): void;
}

export interface HierarchyPs {
  thresh: number;
  rankdir: qt.Dir;
  verify?: boolean;
  patterns?: boolean;
  groups: qt.Dict<boolean>;
}

export interface BuildPs {
  embed?: boolean;
  inbedTs: string[];
  outbedTs: string[];
  refs: qt.Dict<boolean>;
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
    COLOR: 'nodecolortarget',
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
