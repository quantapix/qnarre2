import * as d3 from 'd3';
import * as qt from './types';

export const ROOT_NAME = '__root__';
export const NAMESPACE_DELIM = '/';
export const LIBRARY_PREFIX = '__function_library__';

export const EDGE_KEY_DELIM = '--';
export const MIN_EDGE_WIDTH = 0.75;
export const MAX_EDGE_WIDTH = 12;

export const LARGE_ATTRS_KEY = '_too_large_attrs';
export const LIMIT_ATTR_SIZE = 1024;

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export const PARAMS = {
  animation: {
    duration: 250
  },
  graph: {
    meta: {
      nodeSep: 5,
      rankSep: 25,
      edgeSep: 5
    },
    series: {
      nodeSep: 5,
      rankSep: 25,
      edgeSep: 5
    },
    padding: {paddingTop: 40, paddingLeft: 20}
  },
  subscene: {
    meta: {
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 10,
      paddingRight: 10,
      labelHeight: 20,
      extractXOffset: 15,
      extractYOffset: 20
    },
    series: {
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 10,
      paddingRight: 10,
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
    op: {
      width: 15,
      height: 6,
      radius: 3,
      labelOffset: -8,
      maxLabelWidth: 30
    },
    series: {
      expanded: {
        radius: 10,
        labelOffset: 0
      },
      vertical: {
        width: 16,
        height: 13,
        labelOffset: -13
      },
      horizontal: {
        width: 24,
        height: 8,
        radius: 10,
        labelOffset: -10
      }
    },
    bridge: {
      width: 20,
      height: 20,
      radius: 2,
      labelOffset: 0
    }
  },
  shortcutSize: {
    op: {width: 10, height: 4},
    meta: {width: 12, height: 4, radius: 1},
    series: {
      width: 14,
      height: 4
    }
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
  series: {
    maxStackCount: 3,
    parallelStackOffsetRatio: 0.2,
    towerStackOffsetRatio: 0.5
  },
  minimap: {
    size: 150
  }
};

export const HierarchyParams = {
  verifyTemplate: true,
  seriesMinSize: 5,
  seriesMap: {},
  rankdir: 'BT' as 'TB' | 'BT' | 'LR' | 'RL',
  usePatterns: false
};

export const BuildParams: qt.Params = {
  embed: true,
  inbedTypes: ['Const'],
  outbedTypes: ['^[a-zA-Z]+Summary$'],
  refEdges: {
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

export const NoperColors = {
  DEFAULT_FILL: '#ffffff',
  DEFAULT_STROKE: '#b2b2b2',
  COMPATIBLE: '#0f9d58',
  INCOMPATIBLE: '#db4437'
};

export const NmetaColors = {
  DEFAULT_FILL: '#d9d9d9',
  DEFAULT_STROKE: '#a6a6a6',
  SATURATION: 0.6,
  LIGHTNESS: 0.85,
  EXPANDED_COLOR: '#f0f0f0',
  HUES: [220, 100, 180, 40, 20, 340, 260, 300, 140, 60],
  STRUCTURE_PALETTE(id: number, lightened?: boolean) {
    const hues = NmetaColors.HUES;
    const n = hues.length;
    const hue = hues[id % n];
    const m = Math.sin((hue * Math.PI) / 360);
    const sat = lightened ? 30 : 90 - 60 * m;
    const light = lightened ? 95 : 80;
    return d3.hsl(hue, 0.01 * sat, 0.01 * light).toString();
  },
  DEVICE_PALETTE(index: number): string {
    return NmetaColors.STRUCTURE_PALETTE(index);
  },
  CLUSTER_PALETTE(index: number): string {
    return NmetaColors.STRUCTURE_PALETTE(index);
  },
  UNKNOWN: '#eee',
  GRADIENT_OUTLINE: '#888'
};

export const NlistColors = {
  DEFAULT_FILL: 'white',
  DEFAULT_STROKE: '#b2b2b2'
};

export const healthEntries: qt.HealthEntry[] = [
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
