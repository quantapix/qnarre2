import * as qt from '../graph/types';

export {ColorBy, Dict, NdataT} from '../graph/types';

export enum GraphIconT {
  CONST = 'CONST',
  LIST = 'LIST',
  META = 'META',
  OPER = 'OPER',
  SUMY = 'SUMY'
}

interface DeviceNameExclude {
  regex: RegExp;
}

const DEV_REGEX = /device:([^:]+:[0-9]+)$/;
const DEVS_INCL: DeviceNameExclude[] = [
  {
    regex: DEV_REGEX
  }
];

interface StatsDefaultOff {
  regex: RegExp;
  msg: string;
}

const STATS_DEFAULT_OFF: StatsDefaultOff[] = [];

export interface Selection {
  run: string;
  tag: string | null;
  type: SelectionType;
}

export interface TagItem {
  tag: string | null;
  displayName: string;
  conceptualGraph: boolean;
  opGraph: boolean;
  profile: boolean;
}

export interface RunItem {
  name: string;
  tags: TagItem[];
}

export type Dataset = Array<RunItem>;

interface CurrentDevice {
  device: string;
  suffix: string;
  used: boolean;
  ignoredMsg: string | null;
}

interface DeviceColor {
  device: string;
  color: string;
}

interface ClusterColor {
  xla_cluster: string;
  color: string;
}

interface ColorByParams {
  compute_time: qt.ColorPs;
  memory: qt.ColorPs;
  device: DeviceColor[];
  xla_cluster: ClusterColor[];
}

const GRADIENT_COMPATIBLE_COLOR_BY: Set<qt.ColorBy> = new Set([
  qt.ColorBy.TIME,
  qt.ColorBy.MEM
]);
