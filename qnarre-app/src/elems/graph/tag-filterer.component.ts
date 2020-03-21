import {Component, OnInit} from '@angular/core';
import * as storage from './storage';

@Component({
  selector: 'qnr-tag-filterer',
  template: `
    <paper-input
      no-label-float
      label="Filter tags (regular expressions supported)"
      value="{{ _tagFilter }}"
      class="search-input"
    >
      <iron-icon prefix icon="search" slot="prefix"></iron-icon>
    </paper-input>
  `,
  styles: [
    `
      :host {
        display: block;
        margin: 10px 5px 10px 10px;
      }
    `
  ]
})
export class TagFiltererComponent implements OnInit {
  tagFilter: string; // notify,  computed: '_computeTagFilter(_tagFilter)';
  _tagFilter = storage.getStringInitializer('tagFilter', {
    defaultValue: '',
    useLocalStorage: false,
    polymerProperty: '_tagFilter'
  }); // observer: _tagFilterObserver
  _tagFilterObserver = storage.getStringObserver('tagFilter', {
    defaultValue: '',
    useLocalStorage: false,
    polymerProperty: '_tagFilter'
  });
  constructor() {}

  ngOnInit() {}

  _computeTagFilter() {
    return this._tagFilter;
  }
}
