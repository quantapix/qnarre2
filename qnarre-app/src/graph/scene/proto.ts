export interface NodeDef {
  name: string;
  input: string[];
  device?: string;
  op: string;
  attr: {key: string; value: any}[];
}

export interface VersionDef {
  producer: number;
  min_consumer: number;
  bad_consumers: number[];
}

export interface ArgDef {
  name: string;
  type: string;
}

export interface OpDef {
  name: string;
  input_arg: ArgDef[];
  output_arg: ArgDef[];
}

export interface FunctionDef {
  signature: OpDef;
  node_def: NodeDef[];
}

export interface FunctionDefLibraryDef {
  function: FunctionDef[];
}

export interface GraphDef {
  node: NodeDef[];
  versions: VersionDef[];
  library: FunctionDefLibraryDef;
}

export interface GenericGraph {
  node: GenericNode[];
  edge: GenericEdge[];
  attr: Array<{[key: string]: any}>;
}

export interface GenericEdge {
  source: string;
  target: string;
  edge_attr: Array<{[key: string]: any}>;
}

export interface GenericNode {
  name: string;
  node_attr: Array<{[key: string]: any}>;
  metanode_attr: Array<{[key: string]: any}>;
}

export interface DevStat {
  device: string;
  node_stats: NodeExecStats[];
}

export interface StepStats {
  dev_stats: DevStat[];
}

export interface NodeExecStats {
  node_name: string;
  all_start_micros: number;
  op_start_rel_micros: number;
  op_end_rel_micros: number;
  all_end_rel_micros: number;
  memory: {
    allocator_name: string;
    total_bytes: number;
    peak_bytes: number;
  }[];
  output: NodeOutput[];
  timeline_label: string;
  scheduled_micros: string;
  thread_id: string;
}

export interface NodeOutput {
  slot: number;
  tensor_description: {
    dtype: string;
    shape: {
      dim: {
        size: number;
        name?: string;
      }[];
    };
    allocation_description: {
      requested_bytes: number;
      allocated_bytes?: number;
      allocator_name: string;
    };
  };
}
