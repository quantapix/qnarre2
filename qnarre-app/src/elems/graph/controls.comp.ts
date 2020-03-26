import {Component, OnInit} from '@angular/core';
import {SelectionType} from '../../graph/types';
import * as render from '../../graph/gdata';
import * as proto from '../../graph/proto';
import * as util from '../../graph/utils';

interface DeviceNameExclude {
  regex: RegExp;
}

const DEVICE_NAME_REGEX = /device:([^:]+:[0-9]+)$/;
const DEVICE_NAMES_INCLUDE: DeviceNameExclude[] = [
  {
    regex: DEVICE_NAME_REGEX
  }
];

interface StatsDefaultOff {
  regex: RegExp;
  msg: string;
}

const DEVICE_STATS_DEFAULT_OFF: StatsDefaultOff[] = [];

export interface Selection {
  run: string;
  tag: string | null;
  type: SelectionType;
}

export interface DeviceForStats {
  [key: string]: boolean;
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

export enum ColorBy {
  TIME = 'compute_time',
  MEMORY = 'memory',
  STRUCTURE = 'structure',
  CLUSTER = 'xla_cluster',
  COMPAT = 'op_compatibility'
}

interface ColorParams {
  minValue: number;
  maxValue: number;
  startColor: string;
  endColor: string;
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
  compute_time: ColorParams;
  memory: ColorParams;
  device: DeviceColor[];
  xla_cluster: ClusterColor[];
}

const GRADIENT_COMPATIBLE_COLOR_BY: Set<ColorBy> = new Set([
  ColorBy.TIME,
  ColorBy.MEMORY
]);

@Component({
  selector: 'qnr-graph-controls',
  templateUrl: './templates/controls.component.html',
  styleUrls: ['./styles/controls.component.scss']
})
export class ControlsComponent implements OnInit {
  stats?: any; // observer: '_statsChanged'
  devicesForStats?: any; // notify, readonly
  colorBy = ColorBy.STRUCTURE; // notify
  colorByParams: any; // notify, readonly
  datasets: () => []; // observer: '_datasetsChanged';
  selection: any; // notify, readOnly, computed: '_computeSelection(datasets, _selectedRunIndex, _selectedTagIndex, _selectedGraphType)';
  selectedFile: any; // notify
  _selectedRunIndex = 0; // observer: '_selectedRunIndexChanged';
  traceInputs = false; // notify
  _selectedTagIndex = 0; // observer: '_selectedTagIndexChanged';
  _selectedGraphType = SelectionType.OP_GRAPH;
  _currentDevices: Array<any>; // computed: '_getCurrentDevices(devicesForStats)';
  _currentDeviceParams: Array<any>; // computed: '_getCurrentDeviceParams(colorByParams)';
  _currentclusterParams: Array<any>; // computed: '_getCurrentclusterParams(colorByParams)';
  _currentGradientParams: any; // computed: '_getCurrentGradientParams(colorByParams, colorBy)';
  showSessionRunsDropdown = true;
  showUploadButton = true;
  healthPillsFeatureEnabled: boolean;
  healthPillsToggledOn = true; // notify
  _legendOpened = true;

  constructor() {}

  ngOnInit() {}

  _clustersProvided(renderHierarchy?: render.Gdata) {
    return (
      renderHierarchy &&
      renderHierarchy.hierarchy &&
      renderHierarchy.hierarchy.clusters.length > 0
    );
  }

  _statsChanged(stats: proto.StepStats): void {
    if (stats == null) {
      return;
    }
    const devicesForStats = {};
    const devices = _.each(stats.dev_stats, function(d) {
      // Only considered included devices.
      const include = _.some(DEVICE_NAMES_INCLUDE, function(rule) {
        return rule.regex.test(d.device);
      });
      // Exclude device names that are ignored by default.
      const exclude = _.some(DEVICE_STATS_DEFAULT_OFF, function(rule) {
        return rule.regex.test(d.device);
      });
      if (include && !exclude) {
        devicesForStats[d.device] = true;
      }
    });
    this.set('devicesForStats', devicesForStats);
  }

  _getCurrentDevices(devicesForStats: DeviceForStats): CurrentDevice[] {
    const stats: proto.StepStats | null = this.stats;
    const devStats: proto.DevStat[] = stats ? stats.dev_stats : [];
    const allDevices = devStats.map(d => d.device);
    const devices = allDevices.filter(deviceName => {
      return DEVICE_NAMES_INCLUDE.some(rule => {
        return rule.regex.test(deviceName);
      });
    });
    // Devices names can be long so we remove the longest common prefix
    // before showing the devices in a list.
    const suffixes = util.removePrefix(devices);
    if (suffixes.length == 1) {
      const found = suffixes[0].match(DEVICE_NAME_REGEX);
      if (found) {
        suffixes[0] = found[1];
      }
    }
    return devices.map((device, i) => {
      let ignoredMsg = null;
      // TODO(stephanwlee): this should probably bail on the first match or
      // do something useful with multiple rule.msgs.
      DEVICE_STATS_DEFAULT_OFF.forEach(rule => {
        if (rule.regex.test(device)) {
          ignoredMsg = rule.msg;
        }
      });
      return {
        device: device,
        suffix: suffixes[i],
        used: devicesForStats[device],
        ignoredMsg: ignoredMsg
      };
    });
  }

  _deviceCheckboxClicked(event: Event): void {
    // Update the device map.
    const input = event.target as HTMLInputElement;
    const devicesForStats: DeviceForStats = Object.assign(
      {},
      this.devicesForStats
    );
    const device = input.value;
    if (input.checked) {
      devicesForStats[device] = true;
    } else {
      delete devicesForStats[device];
    }
    this.set('devicesForStats', devicesForStats);
  }

  _numTags(datasets: Dataset, _selectedRunIndex: number): number {
    return this._getTags(datasets, _selectedRunIndex).length;
  }

  _getTags(datasets: Dataset, _selectedRunIndex: number): TagItem[] {
    if (!datasets || !datasets[_selectedRunIndex]) {
      return [];
    }
    return datasets[_selectedRunIndex].tags;
  }

  _fit(): void {
    this.fire('fit-tap');
  }

  _isGradientColoring(stats: proto.StepStats, colorBy: ColorBy): boolean {
    return GRADIENT_COMPATIBLE_COLOR_BY.has(colorBy) && stats != null;
  }

  _equals(a: any, b: any): boolean {
    return a === b;
  }

  _getCurrentDeviceParams(colorByParams: ColorByParams): DeviceColor[] {
    const deviceParams = colorByParams.device.filter(param => {
      return DEVICE_NAMES_INCLUDE.some(rule => {
        return rule.regex.test(param.device);
      });
    });
    // Remove common prefix and merge back corresponding color. If
    // there is only one device then remove everything up to "/device:".
    const suffixes = util.removePrefix(deviceParams.map(d => d.device));
    if (suffixes.length == 1) {
      const found = suffixes[0].match(DEVICE_NAME_REGEX);
      if (found) {
        suffixes[0] = found[1];
      }
    }
    return deviceParams.map((d, i) => {
      return {device: suffixes[i], color: d.color};
    });
  }

  _getCurrentclusterParams(colorByParams: ColorByParams): ClusterColor[] {
    return colorByParams.xla_cluster;
  }

  _getCurrentGradientParams(
    colorByParams: ColorByParams,
    colorBy: ColorBy
  ): ColorParams | void {
    if (!this._isGradientColoring(this.stats, colorBy)) {
      return;
    }
    const params: ColorParams = colorByParams[colorBy];
    let minValue = params.minValue;
    let maxValue = params.maxValue;
    if (colorBy === ColorBy.MEMORY) {
      minValue = util.convertUnits(minValue, util.MEMORY_UNITS);
      maxValue = util.convertUnits(maxValue, util.MEMORY_UNITS);
    } else if (colorBy === ColorBy.TIME) {
      minValue = util.convertUnits(minValue, util.TIME_UNITS);
      maxValue = util.convertUnits(maxValue, util.TIME_UNITS);
    }
    return {
      minValue,
      maxValue,
      startColor: params.startColor,
      endColor: params.endColor
    };
  }

  download(): void {
    this.$.graphdownload.click();
  }

  _updateFileInput(e: Event): void {
    const file = (e.target as HTMLInputElement).files[0];
    if (!file) return;
    let filePath = file.name;
    const dotIndex = filePath.lastIndexOf('.');
    if (dotIndex >= 0) {
      filePath = filePath.substring(0, dotIndex);
    }
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex >= 0) {
      filePath = filePath.substring(lastSlashIndex + 1);
    }
    this._setDownloadFilename(filePath);
    this.set('selectedFile', e);
  }

  _datasetsChanged(newDatasets: Dataset, oldDatasets: Dataset) {
    if (oldDatasets != null) {
      // Select the first dataset by default.
      this._selectedRunIndex = 0;
    }
  }

  _computeSelection(
    datasets: Dataset,
    _selectedRunIndex: number,
    _selectedTagIndex: number,
    _selectedGraphType: SelectionType
  ) {
    if (
      !datasets[_selectedRunIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex]
    ) {
      return null;
    }

    return {
      run: datasets[_selectedRunIndex].name,
      tag: datasets[_selectedRunIndex].tags[_selectedTagIndex].tag,
      type: _selectedGraphType
    };
  }

  _selectedRunIndexChanged(runIndex: number): void {
    if (!this.datasets) return;
    // Reset the states when user pick a different run.
    this.colorBy = ColorBy.STRUCTURE;
    this._selectedTagIndex = 0;
    this._selectedGraphType = this._getDefaultSelectionType();
    this.traceInputs = false; // Set trace input to off-state.
    this._setDownloadFilename(
      this.datasets[runIndex] ? this.datasets[runIndex].name : ''
    );
  }

  _selectedTagIndexChanged(): void {
    this._selectedGraphType = this._getDefaultSelectionType();
  }

  _getDefaultSelectionType(): SelectionType {
    const {datasets, _selectedRunIndex: run, _selectedTagIndex: tag} = this;
    if (
      !datasets ||
      !datasets[run] ||
      !datasets[run].tags[tag] ||
      datasets[run].tags[tag].opGraph
    ) {
      return SelectionType.OP_GRAPH;
    }
    if (datasets[run].tags[tag].profile) {
      return SelectionType.PROFILE;
    }
    if (datasets[run].tags[tag].conceptualGraph) {
      return SelectionType.CONCEPTUAL_GRAPH;
    }
    return SelectionType.OP_GRAPH;
  }

  _getFile(): void {
    this.$$('#file').click();
  }

  _setDownloadFilename(name: string): void {
    this.$.graphdownload.setAttribute('download', name + '.png');
  }

  _statsNotNull(stats: proto.StepStats): boolean {
    return stats !== null;
  }

  _toggleLegendOpen(): void {
    this.set('_legendOpened', !this._legendOpened);
  }

  _getToggleText(legendOpened: boolean): string {
    return legendOpened ? 'Close legend.' : 'Expand legend.';
  }

  _getToggleLegendIcon(legendOpened: boolean): string {
    // This seems counter-intuitive, but actually makes sense because the
    // expand-more button points downwards, and the expand-less button points
    // upwards. For most collapsibles, this works because the collapsibles
    // expand in the downwards direction. This collapsible expands upwards
    // though, so we reverse the icons.
    return legendOpened ? 'expand-more' : 'expand-less';
  }

  _getSelectionOpGraphDisabled(
    datasets: Dataset,
    _selectedRunIndex: number,
    _selectedTagIndex: number
  ) {
    return (
      !datasets[_selectedRunIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex].opGraph
    );
  }

  _getSelectionProfileDisabled(
    datasets: Dataset,
    _selectedRunIndex: number,
    _selectedTagIndex: number
  ) {
    return (
      !datasets[_selectedRunIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex].profile
    );
  }

  _getSelectionConceptualGraphDisabled(
    datasets: Dataset,
    _selectedRunIndex: number,
    _selectedTagIndex: number
  ) {
    return (
      !datasets[_selectedRunIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex] ||
      !datasets[_selectedRunIndex].tags[_selectedTagIndex].conceptualGraph
    );
  }
}

/* 
const $_documentContainer = document.createElement('template');

$_documentContainer.innerHTML = `<dom-module id="qnr-graph-controls">
  <template>
  </template>
</dom-module>`;

document.head.appendChild($_documentContainer.content);
*/
