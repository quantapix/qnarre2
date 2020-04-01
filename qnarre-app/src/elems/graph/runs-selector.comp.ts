/* eslint-disable no-constant-condition */
import {Component, OnInit} from '@angular/core';
import * as backend from '../../graph/backend';
import * as color_scale from './color-scale';
import * as storage from './storage';

@Component({
  selector: 'qnr-wbr-string',
  template: `
    <template is="dom-repeat" items="[[_parts]]" as="part"
      >[[part]]<wbr
    /></template>
  `
})
export class WbrString {
  value: string;
  _parts: Array<string>; // computed: '_computeParts(value)';

  _computeParts(value) {
    const result = [];
    const delimiterPattern = /[/=_,-]/;
    if (value == null) {
      value = '';
    }
    while (true) {
      const idx = value.search(delimiterPattern);
      if (idx === -1) {
        result.push(value);
        break;
      } else {
        result.push(value.slice(0, idx + 1));
        value = value.slice(idx + 1);
      }
    }
    return result;
  }
}

@Component({
  selector: 'qnr-runs-selector',
  templateUrl: './runs-selector.comp.html',
  styleUrls: ['./runs-selector.comp.scss']
})
export class RunsSelectorComponent implements OnInit {
  runSelectionState = storage.getObjectInitializer('runSelectionState', {
    defaultValue: {}
  }); // observer: '_storeRunSelectionState';
  regexInput = storage.getStringInitializer('regexInput', {defaultValue: ''}); // observer: '_regexObserver';
  selectedRuns: any; // notify: true;
  runs: Array<any>;
  dataLocation: string; // notify: true;
  _clippedDataLocation: string; // computed: '_getClippedDataLocation(dataLocation, _dataLocationClipLength)';
  _dataLocationClipLength = 250; // readOnly: true;
  coloring = {
    getColor: color_scale.runsColorScale
  };
  _runStoreListener: backend.ListenKey;
  _envStoreListener: backend.ListenKey;
  _storeRunSelectionState = storage.getObjectObserver('runSelectionState', {
    defaultValue: {}
  });
  _regexObserver = storage.getStringObserver('regexInput', {defaultValue: ''});

  constructor() {}

  ngOnInit() {}

  attached() {
    this._runStoreListener = backend.runsStore.addListener(() => {
      this.set('runs', backend.runsStore.getRuns());
    });
    this.set('runs', backend.runsStore.getRuns());

    this._envStoreListener = backend.environmentStore.addListener(() => {
      this.set('dataLocation', backend.environmentStore.getDataLocation());
    });
    this.set('dataLocation', backend.environmentStore.getDataLocation());
  }

  detached() {
    backend.runsStore.removeListenerByKey(this._runStoreListener);
    backend.environmentStore.removeListenerByKey(this._envStoreListener);
  }

  _toggleAll() {
    this.$.multiCheckbox.toggleAll();
  }

  _getClippedDataLocation(dataLocation, dataLocationClipLength) {
    if (dataLocation === undefined) {
      return undefined;
    }
    if (dataLocation.length > dataLocationClipLength) {
      dataLocation.substring(0, dataLocationClipLength);
    } else {
      return dataLocation;
    }
  }

  _openDataLocationDialog(event) {
    event.preventDefault();
    this.$$('#data-location-dialog').open();
  }

  _shouldShowExpandDataLocationButton(dataLocation, _dataLocationClipLength) {
    return dataLocation && dataLocation.length > _dataLocationClipLength;
  }
}
