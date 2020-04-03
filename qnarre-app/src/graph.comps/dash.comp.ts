import {Component, OnInit} from '@angular/core';
import * as backend from '../graph/backend';

@Component({
  selector: 'qnr-option-selector',
  template: `
    <div id="wrap">
      <h3>[[name]]</h3>
      <div class="content-wrapper"><slot></slot></div>
    </div>
  `,
  styles: [
    `
      .content-wrapper ::slotted(*) {
        background: none;
        color: var(--tb-ui-dark-accent);
        font-size: 13px;
        margin-top: 10px;
      }
      .content-wrapper ::slotted(*) {
        background: none;
        color: var(--tb-ui-dark-accent);
        font-size: 13px;
        margin-top: 10px;
      }
      .content-wrapper ::slotted(.selected) {
        background-color: var(--tb-ui-dark-accent);
        color: white !important;
      }
      h3 {
        color: var(--paper-grey-800);
        display: block;
        font-size: 14px;
        font-weight: normal;
        margin: 0 0 5px;
        pointer-events: none;
      }
    `
  ]
})
export class OptionSelector {
  name: string;
  selectedId: string; // notify, observer: '_selectedIdChanged';
  attached() {
    this.async(function () {
      this.getEffectiveChildren().forEach(node => {
        this.listen(node, 'tap', '_selectTarget');
      }, this);
    });
  }
  _selectTarget(e) {
    this.selectedId = e.currentTarget.id;
  }
  _selectedIdChanged() {
    const selected = this.queryEffectiveChildren('#' + this.selectedId);
    if (!selected) {
      return;
    }
    this.getEffectiveChildren().forEach(function (node) {
      node.classList.remove('selected');
    });
    selected.classList.add('selected');
  }
}

@Component({
  selector: 'qnr-scrollbar-style',
  styles: [
    `
      .scrollbar::-webkit-scrollbar-track {
        visibility: hidden;
      }
      .scrollbar::-webkit-scrollbar {
        width: 10px;
      }
      .scrollbar::-webkit-scrollbar-thumb {
        border-radius: 10px;
        -webkit-box-shadow: inset 0 0 2px rgba(0, 0, 0, 0.3);
        background-color: var(--paper-grey-500);
        color: var(--paper-grey-900);
      }
      .scrollbar {
        box-sizing: border-box;
      }
    `
  ]
})
export class ScrollbarStyle {}

@Component({
  selector: 'qnr-run-color-style',
  styleUrls: ['./run-color-style.scss']
})
export class RunColorStyle {}

@Component({
  selector: 'qnr-no-data-warning',
  templateUrl: './no-data-warning.html',
  styles: [
    `
      .warning {
        max-width: 540px;
        margin: 80px auto 0 auto;
      }
    `
  ]
})
export class NoDataWarning {
  dataType: string;
  showWarning: boolean;
}

@Component({
  selector: 'qnr-downloader',
  templateUrl: './downloader.html',
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        height: 32px;
      }
      paper-dropdown-menu {
        width: 100px;
        --paper-input-container-label: {
          font-size: 10px;
        }
        --paper-input-container-input: {
          font-size: 10px;
        }
      }
      a {
        font-size: 10px;
        margin: 0 0.2em;
      }
      paper-input {
        font-size: 22px;
      }
    `
  ]
})
export class Downloader {
  _run = '';
  runs: Array<string>;
  tag: string;
  urlFn: Function;

  _csvUrl(tag, run, urlFn) {
    if (!run) return '';
    return backend.addParams(urlFn(tag, run), {format: 'csv'});
  }
  _jsonUrl(tag, run, urlFn) {
    if (!run) return '';
    return urlFn(tag, run);
  }
  _csvName(tag, run) {
    if (!run) return '';
    return `run-${run}-tag-${tag}.csv`;
  }
  _jsonName(tag, run) {
    if (!run) return '';
    return `run-${run}-tag-${tag}.json`;
  }
}

@Component({
  selector: 'qnr-dashboard-layout',
  template: `
    <div id="sidebar">
      <slot name="sidebar"></slot>
    </div>
    <div id="center">
      <slot name="center" class="scollbar"></slot>
    </div>
  `,
  styleUrls: ['./dash-layout.scss']
})
export class DashboardLayout {}

@Component({
  selector: 'qnr-dropdown-trigger',
  template: `
    <div class="label hidden-label" aria-hidden="">[[label]]</div>
    <div class="content">
      <div class="label real-label">[[label]]</div>
      <span>[[name]]</span>
      <iron-icon icon="arrow-drop-down" aria-hidden=""></iron-icon>
    </div>
    <div class="underline" aria-hidden="">
      <div class="unfocused-line"></div>
      <div class="focused-line"></div>
    </div>
    <paper-ripple id="ripple" aria-hidden=""></paper-ripple>
  `,
  styleUrls: ['./styles/dropdown-trigger.scss']
})
export class DropdownTrigger implements OnInit {
  hostAttributes: {
    role: 'button';
    tabindex: '0';
  };
  behaviors: [Polymer.PaperInkyFocusBehavior];
  label: string;
  labelFloat = false;
  name: string;

  observers: ['_setHostClass(label, name, labelFloat)'];

  _setHostClass() {
    this.toggleClass('label-floats', this.labelFloat);
    this.toggleClass('label-floating', this.name);
    this.toggleClass(
      'label-shown',
      Boolean(this.label) && (!this.name || this.labelFloat)
    );
  }

  _createRipple() {
    return this.$.ripple;
  }

  constructor() {}

  ngOnInit() {}
}

@Component({
  selector: 'qnr-filterable-checkbox-list',
  template: `
    <div class="item">
      <paper-input
        id="input"
        autofocus=""
        class="input"
        no-label-float=""
        label="Write a regex to filter [[label]]s"
        value="[[_regexString]]"
        on-bind-value-changed="(_debouncedRegexChange)"
      >
      </paper-input>
    </div>
    <div class="matches">
      <template is="dom-if" if="[[!_itemsMatchingRegex.length]]">
        <div class="item empty-match">
          No matches
        </div>
      </template>
      <template
        is="dom-repeat"
        items="[[_itemsMatchingRegex]]"
        on-dom-change="(_synchronizeColors)"
      >
        <div class="item">
          <paper-checkbox
            checked$="[[_isChecked(item, selectionState.*)]]"
            class="checkbox"
            name="[[item]]"
            on-tap="(_checkboxTapped)"
            title="Alt+Click to select only [[item.title]]."
          >
            <span>[[item.title]]</span>
            <template is="dom-if" if="[[item.subtitle]]">
              <span class="subtitle">[[item.subtitle]]</span>
            </template>
          </paper-checkbox>
        </div>
      </template>
    </div>
    <template is="dom-if" if="[[!allToggleDisabled]]">
      <div class="item">
        <button mat-button class="x-button" on-tap="(_toggleAll)">
          Toggle All [[label]]s
        </button>
      </div>
    </template>
  `,
  styleUrls: ['./filterable-checkbox-list.scss']
})
export class FilterableCheckboxList {}

@Component({
  selector: 'qnr-dashboard-common',
  template: '',
  styleUrls: []
})
export class DashboardCommonComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}

@Component({
  selector: 'qnr-custom-style',
  styles: [
    `
      :root {
        --tb-orange-weak: #ffa726;
        --tb-orange-strong: #f57c00;
        --tb-orange-dark: #dc7320;
        --tb-grey-darker: #e2e2e2;
        --tb-grey-lighter: #f3f3f3;
        --tb-ui-dark-accent: #757575;
        --tb-ui-light-accent: #e0e0e0;
        --tb-graph-faded: #e0d4b3;
      }
    `
  ]
})
export class CustomStyle {}

export const ArrayUpdateHelper = {
  updateArrayProp(
    prop: string,
    value: Array<any>,
    getKey: (item: any, ind: number) => string
  ) {
    let orig = this.get(prop);
    const newVal = value;
    if (!Array.isArray(newVal)) {
      throw RangeError(`Expected new value to '${prop}' to be an array.`);
    }
    if (!Array.isArray(orig)) {
      orig = [];
      this.set(prop, orig);
    }
    const lookup = new Set(newVal.map((item, i) => getKey(item, i)));
    let origInd = 0;
    let newValInd = 0;
    while (origInd < orig.length && newValInd < newVal.length) {
      if (!lookup.has(getKey(orig[origInd], origInd))) {
        this.splice(prop, origInd, 1);
        continue;
      } else if (
        getKey(orig[origInd], origInd) == getKey(newVal[newValInd], newValInd)
      ) {
        this.set(`${prop}.${origInd}`, newVal[newValInd]);
      } else {
        this.splice(prop, origInd, 0, newVal[newValInd]);
      }
      newValInd++;
      origInd++;
    }
    if (origInd < orig.length) {
      this.splice(prop, origInd);
    }
    if (newValInd < newVal.length) {
      this.push(prop, ...newVal.slice(newValInd));
    }
  }
};

type CacheKey = string;

enum LoadState {
  LOADING,
  LOADED
}

export const DataLoaderBehavior = {
  properties: {
    active: {
      type: boolean,
      observer: '_loadDataIfActive'
    },

    loadKey: {
      type: string,
      value: ''
    },

    dataToLoad: {
      type: Array,
      value: () => []
    },

    getDataLoadName: {
      type: Function,
      value: () => (datum): CacheKey => string(datum)
    },

    loadDataCallback: Function,

    requestData: {
      type: Function,
      value() {
        return datum => this.requestManager.request(this.getDataLoadUrl(datum));
      }
    },

    getDataLoadUrl: Function,

    dataLoading: {
      type: boolean,
      readOnly: true,
      reflectToAttribute: true,
      value: false
    },

    _dataLoadState: {
      type: Object,
      value: () => new Map<CacheKey, LoadState>()
    },

    _canceller: {
      type: Object,
      value: () => new backend.Canceller()
    },

    _loadDataAsync: {
      type: Number,
      value: null
    }
  },

  observers: ['_dataToLoadChanged(isAttached, dataToLoad.*)'],

  onLoadFinish() {
    // Override to do something useful.
  },

  reload() {
    this._dataLoadState.clear();
    this._loadData();
  },

  reset() {
    if (this._loadDataAsync != null) {
      this.cancelAsync(this._loadDataAsync);
      this._loadDataAsync = null;
    }
    if (this._canceller) this._canceller.cancelAll();
    if (this._dataLoadState) this._dataLoadState.clear();
    if (this.isAttached) this._loadData();
  },

  _dataToLoadChanged() {
    if (this.isAttached) this._loadData();
  },

  created() {
    this._loadData = _.throttle(this._loadDataImpl, 100, {
      leading: true,
      trailing: true
    });
  },

  detached() {
    if (this._loadDataAsync != null) {
      this.cancelAsync(this._loadDataAsync);
      this._loadDataAsync = null;
    }
  },

  _loadDataIfActive() {
    if (this.active) {
      this._loadData();
    }
  },

  _loadDataImpl() {
    if (!this.active) return;
    this.cancelAsync(this._loadDataAsync);
    this._loadDataAsync = this.async(
      this._canceller.cancellable(result => {
        if (result.cancelled) {
          return;
        }
        // Read-only property have a special setter.
        this._setDataLoading(true);

        // Promises return cacheKeys of the data that were fetched.
        const promises = this.dataToLoad
          .filter(datum => {
            const cacheKey = this.getDataLoadName(datum);
            return !this._dataLoadState.has(cacheKey);
          })
          .map(datum => {
            const cacheKey = this.getDataLoadName(datum);
            this._dataLoadState.set(cacheKey, LoadState.LOADING);
            return this.requestData(datum).then(
              this._canceller.cancellable(result => {
                // It was resetted. Do not notify of the response.
                if (!result.cancelled) {
                  this._dataLoadState.set(cacheKey, LoadState.LOADED);
                  this.loadDataCallback(this, datum, result.value);
                }
                return cacheKey;
              })
            );
          });

        return Promise.all(promises)
          .then(
            this._canceller.cancellable(result => {
              // It was resetted. Do not notify of the data load.
              if (!result.cancelled) {
                const keysFetched = result.value;
                const fetched = new Set(keysFetched);
                const shouldNotify = this.dataToLoad.some(datum =>
                  fetched.has(this.getDataLoadName(datum))
                );

                if (shouldNotify) {
                  this.onLoadFinish();
                }
              }

              const isDataFetchPending = Array.from(
                this._dataLoadState.values()
              ).some(loadState => loadState === LoadState.LOADING);

              if (!isDataFetchPending) {
                // Read-only property have a special setter.
                this._setDataLoading(false);
              }
            }),
            // TODO(stephanwlee): remove me when we can use  Promise.prototype.finally
            // instead
            () => {}
          )
          .then(
            this._canceller.cancellable(({cancelled}) => {
              if (cancelled) {
                return;
              }
              this._loadDataAsync = null;
            })
          );
      })
    );
  }
};

export const filterableCheckboxDropdown = {
  properties: {
    label: {type: string},
    placeholder: {type: string},
    labelFloat: {
      type: boolean,
      value: false
    },
    useCheckboxColors: {
      type: boolean,
      value: true
    },
    coloring: Object,
    _coloring: {
      type: Object,
      computed: '_computeColoring(_opened, coloring)'
    },
    items: {
      type: Array,
      value: () => []
    },
    maxItemsToEnableByDefault: Number,
    selectionState: {
      type: Object,
      value: () => ({})
    },
    selectedItems: {
      type: Array,
      notify: true,
      value: () => []
    },
    _opened: {
      type: boolean,
      value: false
    }
  },

  _getValueLabel(_) {
    if (this.selectedItems.length == this.items.length) {
      return `All ${this.label}s`;
    } else if (!this.selectedItems.length) {
      return '';
    } else if (this.selectedItems.length <= 3) {
      const titles = this.selectedItems.map(({title}) => title);
      const uniqueNames = new Set(titles);
      return Array.from(uniqueNames).join(', ');
    }
    return `${this.selectedItems.length} Selected`;
  },

  _computeColoring() {
    return Object.assign({}, this.coloring);
  }
};

export type FilterableCheckboxListItem = {
  id: string | number;
  title: string;
  subtitle?: string;
};

export const filterableCheckboxList = {
  properties: {
    label: {type: string},

    useCheckboxColors: {
      type: boolean,
      value: true
    },

    coloring: {
      type: Object,
      value: {
        getColor: (item: FilterableCheckboxListItem): string => ''
      }
    },

    // `items` are Array of {id: string, title: string, subtitle: ?string}.
    items: {
      type: Array,
      value: (): Array<FilterableCheckboxListItem> => [],
      observer: '_pruneSelectionState'
    },

    _regexstring: {
      type: string,
      value: ''
    },

    _regex: {type: Object, computed: '_makeRegex(_regexstring)'},

    _itemsMatchingRegex: {
      type: Array,
      computed: 'computeItemsMatchingRegex(items.*, _regex)'
    },

    selectionState: {
      // if an item is explicitly enabled, True, if explicitly disabled, False.
      // if undefined, default value (enable for first k items, disable after).
      type: Object,
      value: () => ({})
    },

    selectedItems: {
      type: Array,
      notify: true,
      computed: '_computeSelectedItems(_itemsMatchingRegex.*, selectionState.*)'
    },

    maxItemsToEnableByDefault: {
      // When TB first loads, if it has k or fewer items, they are all enabled
      // by default. If there are more, then all items are disabled.
      type: Number,
      value: 40
    },

    allToggleDisabled: {
      type: boolean,
      value: false
    }
  },

  observers: [
    '_synchronizeColors(useCheckboxColors)',
    '_synchronizeColors(coloring)'
  ],

  detached() {
    this.cancelDebouncer('_setRegex');
  },

  _makeRegex(regexstring) {
    try {
      return new RegExp(regexstring);
    } catch (e) {
      return null;
    }
  },

  computeItemsMatchingRegex(__, ___) {
    const regex = this._regex;
    return regex ? this.items.filter(n => regex.test(n.title)) : this.items;
  },

  _computeSelectedItems(__, ___) {
    const selectionState = this.selectionState;
    const num = this.maxItemsToEnableByDefault;
    const allEnabled = this._itemsMatchingRegex.length <= num;
    return this._itemsMatchingRegex.filter(n => {
      return selectionState[n.id] == null ? allEnabled : selectionState[n.id];
    });
  },

  _isChecked(item, _) {
    return this.selectedItems.indexOf(item) != -1;
  },

  _debouncedRegexChange() {
    const val = this.$.input.value;
    if (val == '') {
      // If the user cleared the field, they may be done typing, so
      // update more quickly.
      window.requestAnimationFrame(() => {
        this._regexstring = val;
      });
    } else {
      this.debounce(
        '_setRegex',
        () => {
          this._regexstring = val;
        },
        150
      );
    }
  },

  _synchronizeColors(e) {
    const checkboxes = this.root.querySelectorAll('paper-checkbox');

    checkboxes.forEach(cb => {
      // Setting the null value will clear previously set color.
      const color = this.useCheckboxColors
        ? this.coloring.getColor(cb.name)
        : null;
      cb.customStyle['--paper-checkbox-checked-color'] = color;
      cb.customStyle['--paper-checkbox-checked-ink-color'] = color;
      cb.customStyle['--paper-checkbox-unchecked-color'] = color;
      cb.customStyle['--paper-checkbox-unchecked-ink-color'] = color;
    });
    window.requestAnimationFrame(() => this.updateStyles());
  },

  _checkboxTapped(e) {
    const checkbox = e.currentTarget;
    const newSelectedNames = Object.assign({}, this.selectionState, {
      [checkbox.name.id]: checkbox.checked
    });
    if (
      e.detail.sourceEvent instanceof MouseEvent &&
      e.detail.sourceEvent.altKey
    ) {
      Object.keys(newSelectedNames).forEach(key => {
        newSelectedNames[key] = key == checkbox.name.id;
      });
    }
    this.selectionState = newSelectedNames;
  },

  _toggleAll() {
    let anyToggledOn = this._itemsMatchingRegex.some(
      n => this.selectionState[n.id]
    );

    const selectionStateIsDefault =
      Object.keys(this.selectionState).length == 0;

    const defaultOff =
      this._itemsMatchingRegex.length > this.maxItemsToEnableByDefault;
    // We have names toggled either if some were explicitly toggled on, or if
    // we are in the default state, and there are few enough that we default
    // to toggling on.
    anyToggledOn = anyToggledOn || (selectionStateIsDefault && !defaultOff);

    // If any are toggled on, we turn everything off. Or, if none are toggled
    // on, we turn everything on.
    const newSelection = {};
    this.items.forEach(n => {
      newSelection[n.id] = !anyToggledOn;
    });
    this.selectionState = newSelection;
  },

  _pruneSelectionState() {
    // Object key turns numbered keys into string.
    const itemIds = new Set(this.items.map(({id}) => string(id)));
    const newSelection = Object.assign({}, this.selectionState);
    Object.keys(newSelection).forEach(key => {
      if (!itemIds.has(key)) delete newSelection[key];
    });
    this.selectionState = newSelection;
  }
};

@Component({
  selector: 'qnr-multi-checkbox',
  template: `
    <paper-input
      id="names-regex"
      no-label-float=""
      label="Write a regex to filter runs"
      value="[[regex]]"
      on-bind-value-changed="(_debouncedRegexChange)"
    ></paper-input>
    <div id="outer-container" class="scrollbar">
      <template
        is="dom-repeat"
        items="[[namesMatchingRegex]]"
        on-dom-change="(synchronizeColors)"
      >
        <div class="name-row">
          <div
            class="icon-container checkbox-container vertical-align-container"
          >
            <paper-checkbox
              class="checkbox vertical-align-center"
              id$="checkbox-[[item]]"
              name="[[item]]"
              checked$="[[_isChecked(item, selectionState.*)]]"
              on-change="(_checkboxChange)"
            ></paper-checkbox>
          </div>
          <div
            class="icon-container isolator-container vertical-align-container"
          >
            <paper-icon-button
              icon="radio-button-unchecked"
              class="isolator vertical-align-center"
              on-tap="(_isolateName)"
              name="[[item]]"
            ></paper-icon-button>
          </div>
          <div class="item-label-container">
            <span>[[item]]</span>
          </div>
        </div>
      </template>
    </div>
  `,
  styleUrls: ['./multi-checkbox.scss']
})
export class MultiCheckbox {
  names = () => [];
  coloring = {getColor: () => ''};
  regex = ''; // notify
  _regex: any; // computed: '_makeRegex(regex)'};
  namesMatchingRegex: Array<any>; // computed: 'computeNamesMatchingRegex(names.*, _regex)';
  selectionState = Function; // notify
  outSelected: Array<any>; // notify, computed: 'computeOutSelected(namesMatchingRegex.*, selectionState.*)';
  maxNamesToEnableByDefault = 40;

  observers: ['_setIsolatorIcon(selectionState, names)'];

  _makeRegex(regexstring) {
    try {
      return new RegExp(regexstring);
    } catch (e) {
      return null;
    }
  }

  _setIsolatorIcon() {
    const selectionMap = this.selectionState;
    const numChecked = _.filter(_.values(selectionMap)).length;
    const buttons = Array.prototype.slice.call(
      this.root.querySelectorAll('.isolator')
    );

    buttons.forEach(function (b) {
      if (numChecked === 1 && selectionMap[b.name]) {
        b.icon = 'radio-button-checked';
      } else {
        b.icon = 'radio-button-unchecked';
      }
    });
  }
  computeNamesMatchingRegex(__, ___) {
    const regex = this._regex;
    return regex ? this.names.filter(n => regex.test(n)) : this.names;
  }
  computeOutSelected(__, ___) {
    const selectionState = this.selectionState;
    const num = this.maxNamesToEnableByDefault;
    const allEnabled = this.namesMatchingRegex.length <= num;
    return this.namesMatchingRegex.filter(n => {
      return selectionState[n] == null ? allEnabled : selectionState[n];
    });
  }
  synchronizeColors(e) {
    this._setIsolatorIcon();

    const checkboxes = this.root.querySelectorAll('paper-checkbox');
    checkboxes.forEach(p => {
      const color = this.coloring.getColor(p.name);
      p.updateStyles({
        '--paper-checkbox-checked-color': color,
        '--paper-checkbox-checked-ink-color': color,
        '--paper-checkbox-unchecked-color': color,
        '--paper-checkbox-unchecked-ink-color': color
      });
    });
    const buttons = this.root.querySelectorAll('.isolator');
    buttons.forEach(p => {
      const color = this.coloring.getColor(p.name);
      p.style['color'] = color;
    });
    // The updateStyles call fails silently if the browser doesn't have focus,
    // e.g. if TensorBoard was opened into a new tab that isn't visible.
    // So we wait for requestAnimationFrame.
    window.requestAnimationFrame(() => {
      this.updateStyles();
    });
  }
  _isolateName(e) {
    // If user clicks on the label for one name, enable it and disable all other
    // names.
    const name = Polymer.dom(e).localTarget.name;
    const selectionState = {};
    this.names.forEach(function (n) {
      selectionState[n] = n == name;
    });
    this.selectionState = selectionState;
  }
  _checkboxChange(e) {
    const target = Polymer.dom(e).localTarget;
    const newSelectionState = _.clone(this.selectionState);
    newSelectionState[target.name] = target.checked;
    // n.b. notifyPath won't work because names may have periods.
    this.selectionState = newSelectionState;
  }
  _isChecked(item, outSelectedChange) {
    return this.outSelected.indexOf(item) != -1;
  }
  toggleAll() {
    // If any are toggled on, we turn everything off. Or, if none are toggled
    // on, we turn everything on.
    const anyToggledOn = this.namesMatchingRegex.some(name =>
      this.outSelected.includes(name)
    );
    const newSelectionState = {};
    this.names.forEach(n => {
      newSelectionState[n] = !anyToggledOn;
    });
    this.selectionState = newSelectionState;
  }
}
