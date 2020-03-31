import * as d3 from 'd3';

import * as qt from './types';

export const ROOT = '__root__';
export const SLASH = '/';
export const LIB_PRE = '__function_library__';

export const displayRegex = new RegExp(
  '^(?:' + LIB_PRE + ')?(\\w+)_[a-z0-9]{8}(?:_\\d+)?$'
);

export const MIN_AUX_WIDTH = 140;

export const KEY_DELIM = '--';

export const SCALE_EXP = 0.3;
export const WIDTH_SCALE = [1, 5e6];
export const MIN_E_WIDTH = 0.75;
export const MAX_E_WIDTH = 12;

export const LARGE_KEY = '_too_large_attrs';
export const ATTR_SIZE = 1024;

export const SVG_SPACE = 'http://www.w3.org/2000/svg';

export const ASYNC_DELAY = 20;

export const PARAMS = {
  animation: {
    duration: 250
  },
  graph: {
    meta: {
      nodesep: 5,
      ranksep: 25,
      edgesep: 5
    },
    list: {
      nodesep: 5,
      ranksep: 25,
      edgesep: 5
    },
    pad: {top: 40, left: 20}
  },
  subscene: {
    meta: {
      pad: {top: 10, bottom: 10, left: 10, right: 10},
      labelHeight: 20,
      extractXOffset: 15,
      extractYOffset: 20
    },
    list: {
      pad: {top: 10, bottom: 10, left: 10, right: 10},
      labelHeight: 10
    }
  },
  nodeSize: {
    meta: {
      radius: 5,
      width: 60,
      maxLabelWidth: 52,
      height: (d3 as any)
        .scaleLinear()
        .domain([1, 200])
        .range([15, 60])
        .clamp(true),
      expandButtonRadius: 3
    },
    oper: {
      w: 15,
      h: 6,
      radius: 3,
      labelOffset: -8,
      maxLabelWidth: 30
    },
    list: {
      expanded: {
        radius: 10,
        labelOffset: 0
      },
      vertical: {
        w: 16,
        h: 13,
        labelOffset: -13
      },
      horizontal: {
        w: 24,
        h: 8,
        radius: 10,
        labelOffset: -10
      }
    },
    bridge: {
      w: 20,
      h: 20,
      radius: 2,
      labelOffset: 0
    }
  },
  shortcutSize: {
    oper: {w: 10, h: 4},
    meta: {w: 12, h: 4, radius: 1},
    list: {w: 14, h: 4}
  },
  annotations: {
    inboxWidth: 50,
    outboxWidth: 50,
    xOffset: 10,
    yOffset: 3,
    labelOffset: 2,
    maxLabelWidth: 120
  },
  constant: {size: {width: 4, height: 4}},
  list: {
    maxStackCount: 3,
    parallelStackOffsetRatio: 0.2,
    towerStackOffsetRatio: 0.5
  },
  minimap: {
    size: 150,
    boxWidth: 320,
    boxHeight: 150
  }
};

export const HierPs: qt.HierPs = {
  thresh: NaN,
  rankdir: 'bt' as qt.Dir,
  verify: true,
  groups: {}
  // seriesMinSize: 5,
  // seriesMap: {},
};

export const BuildPs: qt.BuildPs = {
  inbedTs: ['Const'],
  outbedTs: ['^[a-zA-Z]+Summary$'],
  refs: {
    'Assign 0': true,
    'AssignAdd 0': true,
    'AssignSub 0': true,
    'assign 0': true,
    'assign_add 0': true,
    'assign_sub 0': true,
    'count_up_to 0': true,
    'ScatterAdd 0': true,
    'ScatterSub 0': true,
    'ScatterUpdate 0': true,
    'scatter_add 0': true,
    'scatter_sub 0': true,
    'scatter_update 0': true
  }
};

export const GdataPs = {
  enableExtraction: true,
  minNodeCountForExtraction: 15,
  minDegreeForExtraction: 5,
  maxControlDegree: 4,
  maxBridgePathDegree: 4,
  outExtractTypes: ['NoOp'],
  inExtractTypes: [],
  detachAllEdgesForHighDegree: true,
  extractIsolatedNodesWithAnnotationsOnOneSide: true,
  enableBridgegraph: true,
  minMaxColors: ['#fff5f0', '#fb6a4a'],
  maxAnnotations: 5
};

export const COLORS = [
  {
    name: 'Google Blue',
    color: '#4184f3',
    active: '#3a53c5',
    disabled: '#cad8fc'
  },
  {
    name: 'Google Red',
    color: '#db4437',
    active: '#8f2a0c',
    disabled: '#e8c6c1'
  },
  {
    name: 'Google Yellow',
    color: '#f4b400',
    active: '#db9200',
    disabled: '#f7e8b0'
  },
  {
    name: 'Google Green',
    color: '#0f9d58',
    active: '#488046',
    disabled: '#c2e1cc'
  },
  {
    name: 'Purple',
    color: '#aa46bb',
    active: '#5c1398',
    disabled: '#d7bce6'
  },
  {
    name: 'Teal',
    color: '#00abc0',
    active: '#47828e',
    disabled: '#c2eaf2'
  },
  {
    name: 'Deep Orange',
    color: '#ff6f42',
    active: '#ca4a06',
    disabled: '#f2cbba'
  },
  {
    name: 'Lime',
    color: '#9d9c23',
    active: '#7f771d',
    disabled: '#f1f4c2'
  },
  {
    name: 'Indigo',
    color: '#5b6abf',
    active: '#3e47a9',
    disabled: '#c5c8e8'
  },
  {
    name: 'Pink',
    color: '#ef6191',
    active: '#ca1c60',
    disabled: '#e9b9ce'
  },
  {
    name: 'Deep Teal',
    color: '#00786a',
    active: '#2b4f43',
    disabled: '#bededa'
  },
  {
    name: 'Deep Pink',
    color: '#c1175a',
    active: '#75084f',
    disabled: '#de8cae'
  },
  {
    name: 'Gray',
    color: '#9E9E9E', // 500
    active: '#424242', // 800
    disabled: 'F5F5F5' // 100
  }
].reduce((m, c) => {
  m[c.name] = c;
  return m;
}, {} as {[k: string]: any});

export const OP_GROUP_COLORS = [
  {
    color: 'Google Red',
    groups: [
      'gen_legacy_ops',
      'legacy_ops',
      'legacy_flogs_input',
      'legacy_image_input',
      'legacy_input_example_input',
      'legacy_sequence_input',
      'legacy_seti_input_input'
    ]
  },
  {color: 'Deep Orange', groups: ['constant_ops']},
  {color: 'Indigo', groups: ['state_ops']},
  {color: 'Purple', groups: ['nn_ops', 'nn']},
  {color: 'Google Green', groups: ['math_ops']},
  {color: 'Lime', groups: ['array_ops']},
  {color: 'Teal', groups: ['control_flow_ops', 'data_flow_ops']},
  {color: 'Pink', groups: ['summary_ops']},
  {color: 'Deep Pink', groups: ['io_ops']}
].reduce((m, c) => {
  c.groups.forEach(g => {
    m[g] = c.color;
  });
  return m;
}, {} as {[k: string]: any});

export const OperColors = {
  FILL: '#ffffff',
  STROKE: '#b2b2b2',
  COMPAT: '#0f9d58',
  INCOMPAT: '#db4437'
};

export const MetaColors = {
  UNKNOWN: '#eee',
  FILL: '#d9d9d9',
  STROKE: '#a6a6a6',
  GRADIENT: '#888',
  LIGHTNESS: 0.85,
  SATURATION: 0.6,
  EXPANDED: '#f0f0f0',
  HUES: [220, 100, 180, 40, 20, 340, 260, 300, 140, 60],
  STRUCT(id: number, lighten?: boolean) {
    const hues = MetaColors.HUES;
    const n = hues.length;
    const hue = hues[id % n];
    const m = Math.sin((hue * Math.PI) / 360);
    const sat = lighten ? 30 : 90 - 60 * m;
    const light = lighten ? 95 : 80;
    return d3.hsl(hue, 0.01 * sat, 0.01 * light).toString();
  },
  DEVICE(i: number): string {
    return MetaColors.STRUCT(i);
  },
  CLUSTER(i: number): string {
    return MetaColors.STRUCT(i);
  }
};

export const ListColors = {
  FILL: 'white',
  STROKE: '#b2b2b2'
};

export const healthEs: qt.HealthEntry[] = [
  {
    background: '#CC2F2C',
    label: 'NaN'
  },
  {
    background: '#FF8D00',
    label: '-∞'
  },
  {
    background: '#EAEAEA',
    label: '-'
  },
  {
    background: '#A5A5A5',
    label: '0'
  },
  {
    background: '#262626',
    label: '+'
  },
  {
    background: '#003ED4',
    label: '+∞'
  }
];
