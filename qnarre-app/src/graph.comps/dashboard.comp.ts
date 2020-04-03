import * as vz_sorting from 'vz_sorting';
import * as storage from './storage';

import {Component, OnInit} from '@angular/core';
import * as backend from '../../graph/backend';
import * as qc from '../../graph/compat';

const RUN_STORAGE_KEY = 'run';

interface TagItem {
  tag?: string;
  displayName: string;
  conceptualGraph: boolean;
  opGraph: boolean;
  profile: boolean;
}

interface RunItem {
  name: string;
  tags: Array<TagItem>;
}

@Component({
  selector: 'qnr-graph-dashboard',
  templateUrl: './dashboard.comp.html',
  styleUrls: ['./dashboard.comp.scss']
})
export class DashboardComponent implements OnInit {
  _datasets = () => [];
  _datasetsFetched = false;
  _selectedDataset = 0;
  _requestManager = () => new backend.RequestManager();
  _canceller = () => new backend.Canceller();
  _debuggerDataEnabled: boolean;
  allStepsModeEnabled: boolean;
  specificHealthStep = 0;
  healthPillsToggledOn = false; // observer: '_healthPillsToggledOnChanged';
  selectedNode: string; // notify
  _isAttached: boolean;
  _initialized: boolean;
  _areHealthsLoading: boolean;
  _debuggerNumericAlerts = []; // notify: true;
  _nodeNamesToHealths = {};
  _healthPillStepIndex: number;
  _healthPillRequestId = 1;
  _healthPillStepRequestTimerId: number;
  _healthPillStepRequestTimerDelay = 500; // readOnly
  runs: Array<any>;
  run = storage.getStringInitializer(RUN_STORAGE_KEY, {
    defaultValue: '',
    useLocalStorage: false
  }); // notify, observer: '_runObserver';
  _selection: any;
  _compat: qc.TpuCompat;
  _traceInputs: boolean;

  listeners: {
    'node-toggle-expand': '_handleNodeToggleExpand';
  };
  observers = [
    '_maybeFetchHealths(_debuggerDataEnabled, allStepsModeEnabled, ' +
      'specificHealthStep, _selectedNode)',
    '_maybeInitializeDashboard(_isAttached)',
    '_determineSelectedDataset(_datasetsFetched, _datasets, run)',
    '_updateSelectedDatasetName(_datasetsFetched, _datasets, _selectedDataset)'
  ];

  constructor() {}

  ngOnInit() {}

  attached() {
    this.set('_isAttached', true);
  }

  detached() {
    this.set('_isAttached', false);
  }

  reload() {
    if (!this._debuggerDataEnabled) {
      // Check if the debugger plugin is enabled now.
      this._requestManager
        // .request(backend.getRouter().pluginsListing())
        .then(
          this._canceller.cancellable(result => {
            if (result.cancelled) {
              return;
            }
            if (result.value['debugger']) {
              // The debugger plugin is enabled. Request debugger-related
              // data. Perhaps the debugger plugin had been disabled
              // beforehand because no bad values (NaN, -/+ Inf) had been
              // found and muted_if_healthy had been on.
              this.set('_debuggerDataEnabled', true);
            }
          })
        );
    }
    this._maybeFetchHealths();
  }

  _fit() {
    this.$$('#graphboard').fit();
  }

  //_runObserver = tf_storage.getStringObserver(RUN_STORAGE_KEY, { defaultValue: '', polymerProperty: 'run', useLocalStorage: false}),

  _fetchDataset() {
    return this._requestManager.request(
      backend.getRouter().pluginRoute('graphs', '/info')
    );
  }

  /*
   * See also _maybeFetchHealths, _initiateNetworkRequestForHealths.
   * This function returns a promise with the raw health pill data.
   */
  _fetchHealths(nodeNames, step) {
    const postData = {
      node_names: JSON.stringify(nodeNames),

      // Events files with debugger data fall under this special run.
      run: '__debugger_data__'
    };
    if (step !== undefined) {
      // The user requested health pills for a specific step. This request
      // might be slow since the backend reads events sequentially from disk.
      postData['step'] = step;
    }
    const url = backend.getRouter().pluginRoute('debugger', '/health_pills');
    return this._requestManager.request(url, postData);
  }

  _fetchDebuggerNumericsAlerts() {
    return this._requestManager.request(
      backend.getRouter().pluginRoute('debugger', '/numerics_alert_report')
    );
  }

  _graphUrl(run, limitAttrSize, largeAttrsKey) {
    return backend.getRouter().pluginRoute(
      'graphs',
      '/graph',
      new URLSearchParams({
        run: run,
        limit_attr_size: limitAttrSize,
        large_attrs_key: largeAttrsKey
      })
    );
  }

  _shouldRequestHealths() {
    // Do not load debugger data if the feature is disabled, if the user toggled off the feature,
    // or if the graph itself has not loaded yet. We need the graph to load so that we know which
    // nodes to request health pills for.
    return (
      this._debuggerDataEnabled &&
      this.healthPillsToggledOn &&
      this._renderHierarchy &&
      this._datasetsState(this._datasetsFetched, this._datasets, 'PRESENT')
    );
  }

  _maybeInitializeDashboard(isAttached) {
    if (this._initialized || !isAttached) {
      // Either this dashboard is already initialized ... or we are not yet ready to initialize.
      return;
    }
    this.set('_compat', new qc.TpuCompat());
    // Set this to true so we only initialize once.
    this._initialized = true;
    this._fetchDataset().then(dataset => {
      const runNames = Object.keys(dataset);
      // Transform raw data into UI friendly data.
      this._datasets = runNames
        .sort(vz_sorting.compareTagNames)
        .map(runName => {
          const runData = dataset[runName];
          const tagNames = Object.keys(runData.tags).sort(
            vz_sorting.compareTagNames
          );
          const tags = tagNames
            .map(name => runData.tags[name])
            .map(({tag, conceptual_graph, op_graph, profile}) => ({
              tag,
              displayName: tag,
              conceptualGraph: conceptual_graph,
              opGraph: op_graph,
              profile
            }));

          // Translate a run-wide GraphDef into specially named (without a tag) op graph
          // to abstract the difference between run_graph vs. op_graph from other
          // components.
          const tagsWithV1Graph = runData.run_graph
            ? [
                {
                  tag: null,
                  displayName: 'Default',
                  conceptualGraph: false,
                  opGraph: true,
                  profile: false
                },
                ...tags
              ]
            : tags;
          return {name: runName, tags: tagsWithV1Graph};
        });
      this._datasetsFetched = true;
    });
  }

  _determineSelectedDataset(datasetsFetched, datasets, run) {
    // By default, load the first dataset.
    if (!run) {
      // By default, load the first dataset.
      this.set('_selectedDataset', 0);
      return;
    }

    // If the URL specifies a dataset, load it.
    const dataset = datasets.findIndex(d => d.name === run);
    if (dataset === -1) {
      if (datasetsFetched) {
        // Tell the user if the dataset cannot be found to avoid misleading
        // the user.
        const dialog = this.$$('#error-dialog');
        dialog.textContent = `No dataset named "${run}" could be found.`;
        dialog.open();
      }
      return;
    }
    this.set('_selectedDataset', dataset);
  }

  _updateSelectedDatasetName(datasetsFetched, datasets, selectedDataset) {
    if (!datasetsFetched) return;
    // Cannot update `run` to update the hash in case datasets for graph is empty.
    if (datasets.length <= selectedDataset) return;
    this.set('run', datasets[selectedDataset].name);
  }

  _requestHealths() {
    this.set('_areHealthsLoading', true);
    const requestId = ++this._healthPillRequestId;
    if (this._healthPillStepRequestTimerId !== null) {
      // A request for health pills is already scheduled to be initiated. Clear it, and schedule a
      // new request.
      window.clearTimeout(this._healthPillStepRequestTimerId);
      this._healthPillStepRequestTimerId = null;
    }
    if (this.allStepsModeEnabled) {
      // This path may be slow. Schedule network requests to start some time later. If another
      // request is scheduled in the mean time, drop this current request.
      this._healthPillStepRequestTimerId = setTimeout(
        function() {
          this._healthPillStepRequestTimerId = null;
          this._initiateNetworkRequestForHealths(requestId);
        }.bind(this),
        this._healthPillStepRequestTimerDelay
      );
    } else {
      // The user is fetching sampled steps. This path is fast, so no need to throttle. Directly
      // fetch the health pills across the network.
      this._initiateNetworkRequestForHealths(requestId);
    }
  }

  // Initiates the network request for health pills. Do not directly call this method - network
  // requests may be throttled. Instead, call _requestHealths, which uses this method.
  _initiateNetworkRequestForHealths(requestId) {
    if (this._healthPillRequestId !== requestId) {
      // This possibly scheduled request was outdated before it was even sent across the network. Do
      // not bother initiating it.
      return;
    }
    const specificStep = this.allStepsModeEnabled
      ? this.specificHealthStep
      : undefined;
    const healthPillsPromise = this._fetchHealths(
      this._renderHierarchy.getNamesOfRenderedOps(),
      specificStep
    );
    const alertsPromise = this._fetchDebuggerNumericsAlerts();
    Promise.all([healthPillsPromise, alertsPromise]).then(
      function(result) {
        const healthPillsResult = result[0];
        const alertsResult = result[1];
        if (!this.healthPillsToggledOn) {
          // The user has opted to hide health pills via the toggle button.
          return;
        }
        if (requestId !== this._healthPillRequestId) {
          // This response is no longer relevant.
          return;
        }
        // Set the index for which step to show for the health pills. By default, show the last step.
        // A precondition we assume (that Tensorboard's reservoir sampling guarantees) is that all
        // node names should be mapped to the same number of steps.
        for (const nodeName in healthPillsResult) {
          this.set(
            '_healthPillStepIndex',
            healthPillsResult[nodeName].length - 1
          );
          break;
        }
        this.set('_debuggerNumericAlerts', alertsResult);
        this.set('_nodeNamesToHealths', healthPillsResult);
        this.set('_areHealthsLoading', false);
        this.set('_healthPillStepRequestTimerId', null);
      }.bind(this)
    );
  }

  _datasetsState(datasetsFetched, datasets, state) {
    if (!datasetsFetched) return state === 'NOT_LOADED';
    if (!datasets || !datasets.length) return state === 'EMPTY';
    return state === 'PRESENT';
  }

  _renderHierarchyChanged(renderHierarchy) {
    this.reload();
  }

  _handleNodeToggleExpand() {
    this._maybeFetchHealths();
  }

  _healthPillsToggledOnChanged(healthPillsToggledOn) {
    if (healthPillsToggledOn) {
      // Load health pills.
      this.reload();
    } else {
      // Remove all health pills by setting an empty mapping.
      this.set('_nodeNamesToHealths', {});
    }
  }

  _maybeFetchHealths() {
    if (!this._shouldRequestHealths()) {
      return;
    }
    this._requestHealths();
  }
}
