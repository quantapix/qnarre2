import {Component, OnInit} from '@angular/core';

import * as loader from '../../graph/loader';
import * as util from '../../graph/utils';
import * as op from '../../graph/compat';

@Component({
  selector: 'qnr-graph-loader',
  template: '',
  styleUrls: []
})
export class LoaderComponent implements OnInit {
  datasets: Array<{name: string; path: string}>;
  selectedData = 0;
  selectedFile: any;
  compatibilityProvider = () => new op.TpuCompatibility();
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  overridingHierarchyParams = () => {};
  progress: {value: number; msg: string}; // notify
  outGraphHierarchy: any; //  readOnly, notify
  outGraph: any; // readOnly, notify
  outHierarchyParams: any; // readOnly, notify

  observers: [
    '_loadData(datasets, selectedData, overridingHierarchyParams, compatibilityProvider)',
    '_loadFile(selectedFile, overridingHierarchyParams, compatibilityProvider)'
  ];

  constructor() {}

  ngOnInit() {}

  _loadData() {
    this.debounce('load', () => {
      const dataset = this.datasets[this.selectedData];
      if (!dataset) return;
      this._parseAndConstructHierarchicalGraph(dataset.path);
    });
  }

  _parseAndConstructHierarchicalGraph(path?: string, pbTxtFile?: Blob) {
    const {overridingHierarchyParams, compatibilityProvider} = this;
    // Reset the progress bar to 0.
    this.progress = {value: 0, msg: ''};
    const tracker = util.getTracker(this);
    const hierarchyParams = Object.assign(
      {},
      tf.graph.hierarchy.DefaultHierarchyParams,
      overridingHierarchyParams
    );
    loader
      .loadHierGraph(
        tracker,
        path,
        pbTxtFile,
        compatibilityProvider,
        hierarchyParams
      )
      .then(({graph, graphHierarchy}) => {
        this._setOutHierarchyParams(hierarchyParams);
        this._setOutGraph(graph);
        this._setOutGraphHierarchy(graphHierarchy);
      });
  }

  _loadFile(e?: Event) {
    if (e) {
      const target = e.target as HTMLInputElement;
      const file = target.files[0];
      if (file) {
        target.value = '';
        this._parseAndConstructHierarchicalGraph(null, file);
      }
    }
  }
}
