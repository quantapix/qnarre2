import {Component, OnInit} from '@angular/core';

import * as qg from '../graph/graph';
import * as qt from '../graph/types';
import * as qu from '../graph/utils';

import * as proto from '../graph/proto';

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

@Component({
  selector: 'qnr-graph-controls',
  templateUrl: './controls.comp.html',
  styleUrls: ['./controls.comp.scss']
})
export class ControlsComp implements OnInit {
  $ = {} as {loader: any};
  $$ = {} as (_s: string) => any;

  set stats(s: proto.StepStats | undefined) {
    const sds = {} as qt.Dict<boolean>;
    s?.dev_stats.forEach(s => {
      const inc = DEVS_INCL.some(r => r.regex.test(s.device));
      const exclude = STATS_DEFAULT_OFF.some(r => r.regex.test(s.device));
      if (inc && !exclude) sds[s.device] = true;
    });
    this._statDevs = sds;
  }
  get stats() {
    return this._stats;
  }
  private _stats?: proto.StepStats;

  get statDevs() {
    return this._statDevs;
  }
  private _statDevs = {} as qt.Dict<boolean>;

  colorBy = qt.ColorBy.STRUCT; // notify
  colorByParams: any; // notify, readonly

  datasets: () => []; // observer: '_datasetsChanged';
  selection: any; // notify, readOnly, computed: '_computeSelection(datasets, _selectedRunIndex, _selectedTagIndex, _selectedGraphType)';
  selectedFile: any; // notify
  _selectedRunIndex = 0; // observer: '_selectedRunIndexChanged';
  traceInputs = false; // notify
  _selectedTagIndex = 0; // observer: '_selectedTagIndexChanged';
  _selectedGraphType = qt.SelectT.OPER;

  curDevs(): CurrentDevice[] {
    const devStats = this.stats?.dev_stats ?? [];
    const ds = devStats
      .map(d => d.device)
      .filter(n => DEVS_INCL.some(r => r.regex.test(n)));
    const ss = qu.removePrefix(ds);
    if (ss.length == 1) {
      const m = ss[0].match(DEV_REGEX);
      if (m) ss[0] = m[1];
    }
    return ds.map((d, i) => {
      let m = null;
      STATS_DEFAULT_OFF.forEach(r => {
        if (r.regex.test(d)) m = r.msg;
      });
      return {
        device: d,
        suffix: ss[i],
        used: this.statDevs[d],
        ignoredMsg: m
      };
    });
  }

  curDevPs(colorByParams: qt.ColorByParams): DeviceColor[] {
    const deviceParams = colorByParams.device.filter(param => {
      return DEVS_INCL.some(rule => {
        return rule.regex.test(param.device);
      });
    });
    const suffixes = qu.removePrefix(deviceParams.map(d => d.device));
    if (suffixes.length == 1) {
      const found = suffixes[0].match(DEV_REGEX);
      if (found) {
        suffixes[0] = found[1];
      }
    }
    return deviceParams.map((d, i) => {
      return {device: suffixes[i], color: d.color};
    });
  }

  curClusPs(colorByParams: qt.ColorByParams): ClusterColor[] {
    return colorByParams.xla_cluster;
  }

  curGradPs(
    colorByParams: qt.ColorByParams,
    colorBy: qt.ColorBy
  ): qt.ColorPs | void {
    if (!this._isGradientColoring(this.stats, colorBy)) {
      return;
    }
    const params: qt.ColorPs = colorByParams[colorBy];
    let minValue = params.minValue;
    let maxValue = params.maxValue;
    if (colorBy === qt.ColorBy.MEMORY) {
      minValue = qu.convertUnits(minValue, qu.MEMORY_UNITS);
      maxValue = qu.convertUnits(maxValue, qu.MEMORY_UNITS);
    } else if (colorBy === qt.ColorBy.TIME) {
      minValue = qu.convertUnits(minValue, qu.TIME_UNITS);
      maxValue = qu.convertUnits(maxValue, qu.TIME_UNITS);
    }
    return {
      minValue,
      maxValue,
      startColor: params.startColor,
      endColor: params.endColor
    };
  }

  showSessionRunsDropdown = true;
  showUploadButton = true;
  healthPillsFeatureEnabled: boolean;
  healthPillsToggledOn = true; // notify
  _legendOpened = true;

  constructor() {}

  ngOnInit() {}

  _clustersProvided(gd?: qg.Gdata) {
    return gd && gd.hier.clus.length > 0;
  }

  _deviceCheckboxClicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const statDevs: DeviceForStats = Object.assign({}, this.statDevs);
    const device = input.value;
    if (input.checked) {
      statDevs[device] = true;
    } else {
      delete statDevs[device];
    }
    this.set('statDevs', statDevs);
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

  _isGradientColoring(stats: proto.StepStats, colorBy: qt.ColorBy): boolean {
    return GRADIENT_COMPATIBLE_COLOR_BY.has(colorBy) && stats != null;
  }

  _equals(a: any, b: any): boolean {
    return a === b;
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
    this.colorBy = qt.ColorBy.STRUCTURE;
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
