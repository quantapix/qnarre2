import {Component, OnInit, Input} from '@angular/core';
import * as q_graph from '../../graph/graph';

@Component({
  selector: 'qnr-graph-board',
  templateUrl: './board.comp.html',
  styleUrls: ['./board.comp.scss']
})
export class BoardComponent implements OnInit {
  graphHierarchy: any;
  graph: any;
  stats: any;
  progress: {value: number; msg: string};
  traceInputs: boolean;
  colorBy: string;
  colorByParams: any; // notify
  debuggerDataEnabled: boolean;
  @Input() areHealthsLoading: boolean;
  debuggerNumericAlerts: Array<any>; // notify
  nodeNamesToHealths: any;
  allStepsModeEnabled = false; // notify
  specificHealthStep = 0; // notify
  healthPillStepIndex: number;
  compatNodeTitle = 'TPU Compatibility';
  widthFn: any;
  _selectedNodeInclude: number;
  _highlightedNode: string;
  handleNodeSelected?: Function;
  labelFn?: Function;
  handleEdgeSelected?: Function;

  observers: ['_updateNodeInclude(selectedNode, renderHierarchy)'];

  constructor() {}

  ngOnInit() {}

  fit() {
    this.$.graph.fit();
  }

  _isNotComplete(progress) {
    return progress.value < 100;
  }

  _getContainerClass(progress) {
    let result = 'container';
    if (progress.error) {
      result += ' error';
    }
    if (this._isNotComplete(progress)) {
      result += ' loading';
    }
    return result;
  }

  _onNodeInclusionToggled(event) {
    this.$.graph.nodeToggleExtract(event.detail.name);
  }

  _onNodeSeriesGroupToggled(event) {
    this.$.graph.nodeToggleSeriesGroup(event.detail.name);
  }

  _updateNodeInclude() {
    const node = !this.renderHierarchy
      ? null
      : this.renderHierarchy.getNodeByName(this.selectedNode);
    this._selectedNodeInclude = node
      ? node.include
      : q_graph.InclusionType.UNSPECIFIED;
  }
}
