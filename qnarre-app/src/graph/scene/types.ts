import * as qg from '../graph';
import * as qt from '../types';

export {Dict, Dir} from '../types';
export {Named, Link, Graph} from '../graph';

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

export enum XSeriesType {
  GROUP,
  UNGROUP
}

export enum AnnoType {
  SHORTCUT,
  CONSTANT,
  SUMMARY,
  ELLIPSIS
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

export interface NormInput {
  name: string;
  outKey: string;
  isControl: boolean;
}

export interface BuildParams {
  enableEmbed: boolean;
  inEmbedTypes: string[];
  outEmbedTypes: string[];
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

export class NodeStats {
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
  combine(ss: NodeStats) {
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

export const Class = {
  Node: {
    CONTAINER: 'nodes',
    GROUP: 'node',
    SHAPE: 'nodeshape',
    COLOR_TARGET: 'nodecolortarget',
    LABEL: 'nodelabel',
    BUTTON_CONT: 'buttoncontainer',
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
  Anno: {
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
