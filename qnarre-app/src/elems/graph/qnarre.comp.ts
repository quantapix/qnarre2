import {Component, OnInit} from '@angular/core';
import * as backend from '../../graph/backend';

/**
 * @typedef {{
 *   plugin: string,
 *   loadingMechanism: !LoadingMechanism,
 *   tabName: string,
 *   disableReload: boolean,
 *   removeDom: boolean,
 * }}
 */
const DashboardDatum = {};

/**
 * @typedef {(LoadingMechanism$CUSTOM_ELEMENT | LoadingMechanism$IFRAME)}
 */
const LoadingMechanism = {};

/**
 * @typedef {{
 *   type: LoadingMechanism$CUSTOM_ELEMENT$Type,
 *   elementName: string,
 * }}
 */
const LoadingMechanism$CUSTOM_ELEMENT = {};

/**
 * @typedef {{
 *   type: LoadingMechanism$IFRAME$Type,
 *   modulePath: string,
 * }}
 */
const LoadingMechanism$IFRAME = {};

// Closure's type system doesn't have string literal types.
/** @enum {string} */
const LoadingMechanism$CUSTOM_ELEMENT$Type = {_: 'CUSTOM_ELEMENT'};
/** @enum {string} */
const LoadingMechanism$IFRAME$Type = {_: 'IFRAME'};

const DATA_SELECTION_CHANGE_DEBOUNCE_MS = 200;

export const AUTORELOAD_LOCALSTORAGE_KEY = 'TF.TensorBoard.autoReloadEnabled';

const getAutoReloadFromLocalStorage: () => boolean = () => {
  const val = window.localStorage.getItem(AUTORELOAD_LOCALSTORAGE_KEY);
  return val === 'true' || val == null; // defaults to true
};

function forceDisableAutoReload(): boolean {
  return new URLSearchParams(window.location.search).has('_DisableAutoReload');
}

@Component({
  selector: 'qnr-autoreload',
  templateUrl: './templates/qnarre.component.html',
  styleUrls: ['./styles/qnarre.component.scss']
})
export class AutoReload implements OnInit {
  autoReloadEnabled = getAutoReloadFromLocalStorage; // observer: '_autoReloadObserver';
  _autoReloadId: number;
  autoReloadIntervalSecs = 30;

  constructor() {}

  ngOnInit() {}

  detached() {
    window.clearTimeout(this._autoReloadId);
  }

  _autoReloadObserver(autoReload) {
    window.localStorage.setItem(AUTORELOAD_LOCALSTORAGE_KEY, autoReload);
    if (autoReload && !forceDisableAutoReload()) {
      this._autoReloadId = window.setTimeout(
        () => this._doAutoReload(),
        this.autoReloadIntervalSecs * 1000
      );
    } else {
      window.clearTimeout(this._autoReloadId);
    }
  }

  _doAutoReload() {
    if (this.reload == null) {
      throw new Error('AutoReloadBehavior requires a reload method');
    }
    this.reload();
    this._autoReloadId = window.setTimeout(
      () => this._doAutoReload(),
      this.autoReloadIntervalSecs * 1000
    );
  }
}


@Component({
  selector: 'qnr-qnarre',
  templateUrl: './templates/qnarre.component.html',
  styleUrls: ['./styles/qnarre.component.scss']
})
export class QnarreComponent implements OnInit {
  //behaviors: [tf_tensorboard.AutoReloadBehavior];
  brand = 'TensorBoard-X';
  useHash = true;
  disabledDashboards = '';
  _dashboardData: Array<any>; // computed: '_computeDashboardData(_dashboardRegistry)';
  _dashboardRegistry: any; // computed: '_computeDashboardRegistry(_pluginsListing)';
  _pluginsListing = () => {};
  _activeDashboards: Array<any>; // computed: '_computeActiveDashboard(_dashboardData, _pluginsListing)';
  _activeDashboardsLoadState: {
    type: String;
    //value: tf_tensorboard.ActiveDashboardsLoadState.NOT_LOADED
  };
  _activeDashboardsNotLoaded: {
    type: Boolean;
    computed: '_computeActiveDashboardsNotLoaded(_activeDashboardsLoadState)';
  };
  _activeDashboardsLoaded: {
    type: Boolean;
    computed: '_computeActiveDashboardsLoaded(_activeDashboardsLoadState)';
  };
  _activeDashboardsFailedToLoad: {
    type: Boolean;
    computed: '_computeActiveDashboardsFailedToLoad(_activeDashboardsLoadState)';
  };
  _showNoDashboardsMessage: {
    type: Boolean;
    computed: '_computeShowNoDashboardsMessage(_activeDashboardsLoaded, _activeDashboards, _selectedDashboard)';
  };
  _showNoSuchDashboardMessage: {
    type: Boolean;
    computed: '_computeShowNoSuchDashboardMessage(_activeDashboardsLoaded, _dashboardRegistry, _selectedDashboard)';
  };
  _selectedDashboard: {
    type: String;
    //value: tf_storage.getString(tf_storage.TAB) || null,
    //observer: '_selectedDashboardChanged'
  };
  _dashboardToMaybeRemove: String;
  _dashboardContainersStamped: {
    type: Object;
    value: () => {};
  };
  _isReloadDisabled: {
    type: Boolean;
    value: false;
  };
  _lastReloadTime: {
    type: String;
    value: 'not yet loaded';
  };
  _lastReloadTimeShort: {
    type: String;
    value: 'Not yet loaded';
  };
  _dataLocation: {
    type: String;
    value: null;
  };
  _requestManager: {
    type: Object;
    //value: () => new backend.RequestManager()
  };
  _canceller: {
    type: Object;
    //value: () => new backend.Canceller()
  };
  _refreshing: {
    type: Boolean;
    value: false;
  };

  //observers: [
  //  '_updateSelectedDashboardFromActive(' + '_selectedDashboard, _activeDashboards)',
  //  '_ensureSelectedDashboardStamped(' +      '_dashboardRegistry, _dashboardContainersStamped, ' +      '_activeDashboards, _selectedDashboard)'
  //];

  constructor() {}

  ngOnInit() {}

  _activeDashboardsUpdated(activeDashboards, selectedDashboard) {}

  _isDashboardActive(disabledDashboards, activeDashboards, dashboardDatum) {
    if (
      (disabledDashboards || '').split(',').indexOf(dashboardDatum.plugin) >= 0
    ) {
      // Explicitly disabled.
      return false;
    }
    if (!(activeDashboards || []).includes(dashboardDatum.plugin)) {
      // Inactive.
      return false;
    }
    return true;
  }

  /**
   * Determine whether a dashboard is enabled but not active.
   *
   * @param {string?} disabledDashboards comma-separated
   * @param {Array<string>?} activeDashboards if null, nothing is active
   * @param {Object} dashboardDatum
   * @return {boolean}
   */
  _isDashboardInactive(disabledDashboards, activeDashboards, dashboardDatum) {
    if (
      (disabledDashboards || '').split(',').indexOf(dashboardDatum.plugin) >= 0
    ) {
      // Disabled dashboards don't appear at all; they're not just
      // inactive.
      return false;
    }
    if (!(activeDashboards || []).includes(dashboardDatum.plugin)) {
      // Inactive.
      return true;
    }
    return false;
  }

  _inactiveDashboardsExist(dashboards, disabledDashboards, activeDashboards) {
    if (!activeDashboards) {
      // Not loaded yet. Show nothing.
      return false;
    }
    const workingSet = new Set();
    dashboards.forEach(d => {
      workingSet.add(d.plugin);
    });
    (disabledDashboards || '').split(',').forEach(d => {
      workingSet.delete(d.plugin);
    });
    activeDashboards.forEach(d => {
      workingSet.delete(d);
    });
    return workingSet.size > 0;
  }

  _getDashboardFromIndex(dashboards, index) {
    return dashboards[index];
  }

  _selectedStatus(selectedDashboard, candidateDashboard) {
    return selectedDashboard === candidateDashboard;
  }

  /**
   * Handle a change in the selected dashboard by persisting the current
   * selection to the hash and logging a pageview if analytics are enabled.
   */
  _selectedDashboardChanged(selectedDashboard) {
    const pluginString = selectedDashboard || '';
    tf_storage.setString(tf_storage.TAB, pluginString);
    // Record this dashboard selection as a page view.
    let pathname = window.location.pathname;
    pathname += pathname.endsWith('/') ? pluginString : '/' + pluginString;
    ga('set', 'page', pathname);
    ga('send', 'pageview');
  }


  /**
   * If no dashboard is selected but dashboards are available,
   * set the selected dashboard to the first active one.
   */
  _updateSelectedDashboardFromActive(selectedDashboard, activeDashboards) {
    if (activeDashboards && selectedDashboard == null) {
      selectedDashboard = activeDashboards[0] || null;
      if (selectedDashboard != null) {
        // Use location.replace for this call to avoid breaking back-button navigation.
        // Note that this will precede the update to tf_storage triggered by updating
        // _selectedDashboard and make it a no-op.
        tf_storage.setString(tf_storage.TAB, selectedDashboard, {
          useLocationReplace: true
        });
        // Note: the following line will re-trigger this handler, but it
        // will be a no-op since selectedDashboard is no longer null.
        this._selectedDashboard = selectedDashboard;
      }
    }
  }

  _updateSelectedDashboardFromHash() {
    const dashboardName = tf_storage.getString(tf_storage.TAB);
    this.set('_selectedDashboard', dashboardName || null);
  }

  /**
   * Make sure that the currently selected dashboard actually has a
   * Polymer component; if it doesn't, create one.
   *
   * We have to stamp each dashboard before we can interact with it:
   * for instance, to ask it to reload. Conversely, we can't stamp a
   * dashboard until its _container_ is itself stamped. (Containers
   * are stamped declaratively by a `<dom-repeat>` in the HTML
   * template.)
   *
   * We also wait for the set of active dashboards to be loaded
   * before we stamp anything. This prevents us from stamping a
   * dashboard that's not actually enabled (e.g., if the user
   * navigates to `/#text` when the text plugin is disabled).
   *
   * If the currently selected dashboard is not a real dashboard,
   * this does nothing.
   *
   * @param {!Object<string, !DashboardDatum>} dashboardRegistry
   */
  _ensureSelectedDashboardStamped(
    dashboardRegistry,
    containersStamped,
    activeDashboards,
    selectedDashboard
  ) {
    if (
      !activeDashboards ||
      !selectedDashboard ||
      !containersStamped[selectedDashboard]
    ) {
      return;
    }
    const previous = this._dashboardToMaybeRemove;
    this._dashboardToMaybeRemove = selectedDashboard;
    if (previous && previous != selectedDashboard) {
      if (dashboardRegistry[previous].removeDom) {
        const div = this.$$(`.dashboard-container[data-dashboard=${previous}]`);
        if (div.firstChild) {
          div.firstChild.remove();
        }
      }
    }
    const container = this.$$(
      `.dashboard-container[data-dashboard=${selectedDashboard}]`
    );
    if (!container) {
      // This dashboard doesn't exist. Nothing to do here.
      return;
    }
    const dashboard = dashboardRegistry[selectedDashboard];
    // Use .children, not .childNodes, to avoid counting comment nodes.
    if (container.children.length === 0) {
      const loadingMechanism = dashboard.loadingMechanism;
      switch (loadingMechanism.type) {
        case 'CUSTOM_ELEMENT': {
          const component = document.createElement(
            loadingMechanism.elementName
          );
          component.id = 'dashboard'; // used in `_selectedDashboardComponent`
          container.appendChild(component);
          break;
        }
        case 'IFRAME': {
          this._renderPluginIframe(
            container,
            selectedDashboard,
            loadingMechanism
          );
          break;
        }
        default: {
          console.warn('Invariant violation:', loadingMechanism);
          break;
        }
      }
    }
    this.set('_isReloadDisabled', dashboard.disableReload);
  }

  _renderPluginIframe(container, selectedDashboard, loadingMechanism) {
    const iframe = document.createElement('iframe');
    iframe.id = 'dashboard'; // used in `_selectedDashboardComponent`
    const srcUrl = new URL('data/plugin_entry.html', window.location.href);
    srcUrl.searchParams.set('name', selectedDashboard);
    iframe.setAttribute('src', srcUrl.toString());
    container.appendChild(iframe);
  }

  /**
   * Get the Polymer component corresponding to the currently
   * selected dashboard. For instance, the result might be an
   * instance of `<tf-scalar-dashboard>`.
   *
   * If the dashboard does not exist (e.g., the set of active
   * dashboards has not loaded or has failed to load, or the user
   * has selected a dashboard for which we have no implementation),
   * `null` is returned.
   */
  _selectedDashboardComponent() {
    const selectedDashboard = this._selectedDashboard;
    var dashboard = this.$$(
      `.dashboard-container[data-dashboard=${selectedDashboard}] #dashboard`
    );
    return dashboard;
  }

  ready() {
    util.setUseHash(this.useHash);
    this._updateSelectedDashboardFromHash();
    window.addEventListener(
      'hashchange',
      () => {
        this._updateSelectedDashboardFromHash();
      }
      /*useCapture=*/ false
    );
    backend.environmentStore.addListener(() => {
      this._dataLocation = backend.environmentStore.getDataLocation();
      const title = backend.environmentStore.getWindowTitle();
      if (title) {
        window.document.title = title;
      }
    });
    this._reloadData();
    this._lastReloadTime = new Date().toString();
  }

  _computeActiveDashboard() {
    if (!this._dashboardData) return [];
    return this._dashboardData
      .map(d => d.plugin)
      .filter(dashboardName => {
        // TODO(stephanwlee): Remove boolean code path when releasing
        // 2.0.
        // PluginsListing can be an object whose key is name of the
        // plugin and value is a boolean indicating whether if it is
        // enabled. This is deprecated but we will maintain backwards
        // compatibility for some time.
        const maybeMetadata = this._pluginsListing[dashboardName];
        if (typeof maybeMetadata === 'boolean') return maybeMetadata;
        return maybeMetadata && maybeMetadata.enabled;
      });
  }

  _onTemplateChanged() {
    // This will trigger an observer that kicks off everything.
    const dashboardContainersStamped = {};
    for (const container of this.root.querySelectorAll(
      '.dashboard-container'
    )) {
      dashboardContainersStamped[container.dataset.dashboard] = true;
    }
    this._dashboardContainersStamped = dashboardContainersStamped;
  }

  /**
   * @return {!Object<string, !DashboardDatum>}
   */
  _computeDashboardRegistry(pluginsListing) {
    const registry = {};
    for (const [name, legacyMetadata] of Object.entries(
      tf_tensorboard.dashboardRegistry
    )) {
      registry[name] = {
        plugin: legacyMetadata.plugin,
        loadingMechanism: {
          type: 'CUSTOM_ELEMENT',
          elementName: legacyMetadata.elementName
        }
        tabName: legacyMetadata.tabName.toUpperCase(),
        disableReload: legacyMetadata.isReloadDisabled || false,
        removeDom: legacyMetadata.removeDom || false
      };
    }
    if (pluginsListing != null) {
      for (const [name, backendMetadata] of Object.entries(pluginsListing)) {
        if (typeof backendMetadata === 'boolean') {
          // Legacy backend (prior to #2257). No metadata to speak of.
          continue;
        }
        let loadingMechanism;
        switch (backendMetadata.loading_mechanism.type) {
          case 'NONE':
            // Legacy backend plugin.
            if (registry[name] == null) {
              console.warn(
                'Plugin has no loading mechanism and no baked-in registry entry: %s',
                name
              );
            }
            continue;
          case 'CUSTOM_ELEMENT':
            loadingMechanism = {
              type: 'CUSTOM_ELEMENT',
              elementName: backendMetadata.loading_mechanism.element_name
            };
            break;
          case 'IFRAME':
            loadingMechanism = {
              type: 'IFRAME',
              modulePath: backendMetadata.loading_mechanism.module_path
            };
            break;
          default:
            console.warn(
              'Unknown loading mechanism for plugin %s: %s',
              name,
              backendMetadata.loading_mechanism
            );
            continue;
        }
        if (loadingMechanism == null) {
          console.error(
            'Invariant violation: loadingMechanism is %s for %s',
            loadingMechanism,
            name
          );
        }
        registry[name] = {
          plugin: name,
          loadingMechanism: loadingMechanism,
          tabName: backendMetadata.tab_name.toUpperCase(),
          disableReload: backendMetadata.disable_reload,
          removeDom: backendMetadata.remove_dom
        };
      }
    }

    // Reorder to list all values from the `/data/plugins_listing`
    // response first and in their listed order.
    const orderedRegistry = {};
    for (const plugin of Object.keys(pluginsListing)) {
      if (registry[plugin]) {
        orderedRegistry[plugin] = registry[plugin];
      }
    }
    Object.assign(orderedRegistry, registry);
    return orderedRegistry;
  }

  _computeDashboardData(dashboardRegistry) {
    return Object.values(dashboardRegistry);
  }

  _fetchPluginsListing() {
    this._canceller.cancelAll();
    const updatePluginsListing = this._canceller.cancellable(result => {
      if (result.cancelled) {
        return;
      }
      this._pluginsListing = result.value;
      this._activeDashboardsLoadState =
        tf_tensorboard.ActiveDashboardsLoadState.LOADED;
    });
    const onFailure = () => {
      if (
        this._activeDashboardsLoadState ===
        tf_tensorboard.ActiveDashboardsLoadState.NOT_LOADED
      ) {
        this._activeDashboardsLoadState =
          tf_tensorboard.ActiveDashboardsLoadState.FAILED;
      } else {
        console.warn(
          'Failed to reload the set of active plugins; using old value.'
        );
      }
    };
    return this._requestManager
      .request(backend.getRouter().pluginsListing())
      .then(updatePluginsListing, onFailure);
  }

  _computeActiveDashboardsNotLoaded(state) {
    return state === tf_tensorboard.ActiveDashboardsLoadState.NOT_LOADED;
  }

  _computeActiveDashboardsLoaded(state) {
    return state === tf_tensorboard.ActiveDashboardsLoadState.LOADED;
  }

  _computeActiveDashboardsFailedToLoad(state) {
    return state === tf_tensorboard.ActiveDashboardsLoadState.FAILED;
  }

  _computeShowNoDashboardsMessage(loaded, activeDashboards, selectedDashboard) {
    return loaded && activeDashboards.length === 0 && selectedDashboard == null;
  }

  _computeShowNoSuchDashboardMessage(loaded, registry, selectedDashboard) {
    return loaded && !!selectedDashboard && registry[selectedDashboard] == null;
  }

  _updateRouter(router) {
    backend.setRouter(router);
  }

  _updateTitle(title) {
    if (title) {
      this.set('brand', title);
    }
  }

  reload() {
    if (this._isReloadDisabled) return;
    this._reloadData().then(() => {
      const dashboard = this._selectedDashboardComponent();
      if (dashboard && dashboard.reload) dashboard.reload();
    });
    this._lastReloadTime = new Date().toString();
  }

  _reloadData() {
    this._refreshing = true;
    return Promise.all([
      this._fetchPluginsListing(),
      backend.environmentStore.refresh(),
      backend.runsStore.refresh(),
      backend.experimentsStore.refresh()
    ])
      .then(() => {
        this._lastReloadTimeShort = new Date().toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        });
      })
      .finally(() => {
        this._refreshing = false;
      });
  }

  _getDataRefreshingClass() {
    return this._refreshing ? 'refreshing' : '';
  }

  openSettings() {
    this.$.settings.open();
    this.$.paginationLimitInput.value = tf_paginated_view.getLimit();
  }


  _paginationLimitValidate(event) {
    event.target.validate();
  }

  _paginationLimitChanged(e) {
    const value = Number.parseInt(e.target.value, 10);
    // We set type="number" and min="1" on the input, but Polymer
    // doesn't actually enforce those, so we have to check manually.
    if (value === +value && value > 0) {
      tf_paginated_view.setLimit(value);
    }
  }


}
