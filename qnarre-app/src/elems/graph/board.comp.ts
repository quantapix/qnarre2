import {Component, OnInit, Input} from '@angular/core';
import * as q_graph from '../../graph/group/graph';

@Component({
  selector: 'qnr-graph-board',
  templateUrl: './templates/board.component.html',
  styleUrls: ['./styles/board.component.scss']
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
  edgeWidthFunction: any;
  _selectedNodeInclude: number;
  _highlightedNode: string;
  handleNodeSelected?: Function;
  edgeLabelFunction?: Function;
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
