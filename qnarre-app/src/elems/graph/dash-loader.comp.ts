import {Component, OnInit} from '@angular/core';
import * as backend from '../../graph/backend';
import * as loader from '../../graph/loader';
import * as q_graph from '../../graph/graph';
import * as util from '../../graph/utils';
import * as hierarchy from '../../graph/hierarchy';
import * as op from '../../graph/oper';

@Component({
  selector: 'qnr-graph-dashboard-loader',
  template: '',
  styleUrls: []
})
export class DashboardLoaderComponent implements OnInit {
  // datasets: Array<{name: string; path: string}>;
  datasets: Array<any>;
  progress: {value: number; msg: string}; // notify
  selection: any;
  selectedFile: any;
  compatibilityProvider = () => new op.TpuCompatibility();
  hierarchyParams = () => hierarchy.DefaultHierarchyParams;
  outGraphHierarchy: any; // readOnly, notify
  outGraph: any; // readOnly, notify
  outStats: any; // readOnly, notify
  _graphRunTag: any;

  observers: [
    '_selectionChanged(selection, compatibilityProvider)',
    '_selectedFileChanged(selectedFile, compatibilityProvider)'
  ];

  constructor() {}

  ngOnInit() {}

  _selectionChanged() {
    this.debounce('selectionchange', () => {
      this._load(this.selection);
    });
  }

  _load(selection: q_graph.controls.Selection): Promise<void> {
    const {run, tag, type: selectionType} = selection;
    switch (selectionType) {
      case q_graph.SelectionType.OP_GRAPH:
      case q_graph.SelectionType.CONCEPTUAL_GRAPH: {
        this._setOutStats(null);
        const params = new URLSearchParams();
        params.set('run', run);
        params.set(
          'conceptual',
          String(selectionType === q_graph.SelectionType.CONCEPTUAL_GRAPH)
        );
        if (tag) params.set('tag', tag);
        const graphPath = backend
          .getRouter()
          .pluginRoute('graphs', '/graph', params);
        return this._loadHierarchicalGraph(graphPath).then(() => {
          this._graphRunTag = {run, tag};
        });
      }
      case q_graph.SelectionType.PROFILE: {
        const {tags} = this.datasets.find(({name}) => name === run);
        const tagMeta = tags.find(t => t.tag === tag);
        // In case current tag misses opGraph but has profile information,
        // we fallback to the v1 behavior of fetching the run graph.
        const requiredOpGraphTag = tagMeta.opGraph ? tag : null;
        console.assert(
          tags.find(t => t.tag === requiredOpGraphTag),
          `Required tag (${requiredOpGraphTag}) is missing.`
        );
        const shouldFetchGraph =
          !this._graphRunTag ||
          this._graphRunTag.run !== run ||
          this._graphRunTag.tag !== requiredOpGraphTag;
        const maybeFetchGraphPromise = shouldFetchGraph
          ? this._load({
              run,
              tag: requiredOpGraphTag,
              type: q_graph.SelectionType.OP_GRAPH
            })
          : Promise.resolve();
        const params = new URLSearchParams();
        params.set('tag', tag);
        params.set('run', run);
        const metadataPath = backend
          .getRouter()
          .pluginRoute('graphs', '/run_metadata', params);
        return maybeFetchGraphPromise.then(() =>
          this._readAndParseMetadata(metadataPath)
        );
      }
      default:
        return Promise.reject(
          new Error(`Unknown selection type: ${selectionType}`)
        );
    }
  }

  _readAndParseMetadata(path: string) {
    this.set('progress', {
      value: 0,
      msg: ''
    });
    const tracker = util.getTracker(this);
    loader.loadMeta(path, tracker).then(s => {
      this._setOutStats(s);
    });
  }

  _loadHierarchicalGraph(path?: string, pbTxtFile?: Blob) {
    this.set('progress', {
      value: 0,
      msg: ''
    });
    const tracker = util.getTracker(this);
    return loader
      .loadHierarchicalGraph(
        tracker,
        path,
        pbTxtFile,
        this.compatibilityProvider,
        this.hierarchyParams
      )
      .then(({graph, graphHierarchy}) => {
        this._setOutGraph(graph);
        this._setOutGraphHierarchy(graphHierarchy);
      });
  }

  _selectedFileChanged(e?: Event) {
    if (e) {
      const target = e.target as HTMLInputElement;
      const file = target.files[0];
      if (file) {
        target.value = '';
        this._loadHierarchicalGraph(null, file);
      }
    }
  }
}
