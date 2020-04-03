import {Component, OnInit, Input} from '@angular/core';

@Component({
  selector: 'qnr-graph-node-search',
  templateUrl: './node-search.comp.html',
  styleUrls: ['./node-search.comp.scss']
})
export class NodeSearchComponent implements OnInit {
  @Input() selectedNode: string; // notify
  _rawRegexInput = '';
  _regexInput: string; // computed: '_computeRegexInput(renderHierarchy, _rawRegexInput)';
  _previousRegexInput = '';
  _searchTimeoutDelay = 150; // readOnly
  _searchPending: boolean;
  _maxRegexResults = 42;
  _regexMatches: Array<any>;

  observers: ['_regexInputChanged(_regexInput)'];

  constructor() {}

  ngOnInit() {}

  _computeRegexInput(renderHierarchy, rawRegexInput) {
    return rawRegexInput.trim();
  }

  _regexInputChanged(regexInput) {
    this._requestSearch();
  }

  _clearSearchResults() {
    this.set('_regexMatches', []);
  }

  _requestSearch() {
    if (this._searchPending) {
      return;
    }
    if (this._regexInput === this._previousRegexInput) {
      // No new search is needed.
      this._searchPending = false;
      return;
    }
    this._searchPending = true;
    this._executeSearch();
    // After some time, perhaps execute another search.
    this.async(() => {
      this._searchPending = false;
      this._requestSearch();
    }, this._searchTimeoutDelay);
  }

  _executeSearch() {
    this._previousRegexInput = this._regexInput;
    if (!this._regexInput) {
      this._clearSearchResults();
      return;
    }
    try {
      var regex = new RegExp(this._regexInput);
    } catch (e) {
      // The regular expression is invalid.
      this._clearSearchResults();
      return;
    }
    const matchedNodes = [];
    const nodeMap = this.renderHierarchy.hierarchy.getNodeMap();
    _.each(nodeMap, (_, nodeName) => {
      if (matchedNodes.length >= this._maxRegexResults) {
        // Terminate.
        return false;
      }
      if (!regex.test(nodeName)) {
        return;
      }
      matchedNodes.push(nodeName);
    });
    this.set('_regexMatches', matchedNodes);
  }

  _matchClicked(e) {
    const node = e.model.item;
    this.set('selectedNode', node);
  }
}
