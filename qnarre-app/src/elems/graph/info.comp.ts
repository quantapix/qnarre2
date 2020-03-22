import {Component, OnInit, Input} from '@angular/core';

@Component({
  selector: 'qnr-graph-info',
  templateUrl: './templates/info.component.html',
  styleUrls: ['./styles/info.component.scss']
})
export class InfoComponent implements OnInit {
  @Input() title: string;
  @Input() graphHierarchy: any;
  @Input() graph: any;
  nodeNamesToHealths: any;
  healthPillStepIndex: number; // notify
  colorBy: string;
  compatNodeTitle: string;
  @Input() selectedNode: string;
  highlightedNode: string; // notify
  selectedNodeInclude: number; // notify
  debuggerDataEnabled: boolean;

  listeners: {
    'node-list-item-click': '_nodeListItemClicked';
    'node-list-item-mouseover': '_nodeListItemMouseover';
    'node-list-item-mouseout': '_nodeListItemMouseout';
  };

  constructor() {}

  ngOnInit() {}

  _nodeListItemClicked(event) {
    this.selectedNode = event.detail.nodeName;
  }

  _nodeListItemMouseover(event) {
    this.highlightedNode = event.detail.nodeName;
  }

  _nodeListItemMouseout() {
    this.highlightedNode = null;
  }

  _healthPillsAvailable(debuggerDataEnabled, nodeNamesToHealths) {
    // So long as there is a mapping (even if empty) from node name to health pills, show the
    // legend and slider. We do that because, even if no health pills exist at the current step;
    // the user may desire to change steps, and the slider must show for the user to do that.
    return (
      debuggerDataEnabled &&
      nodeNamesToHealths &&
      Object.keys(nodeNamesToHealths).length > 0
    );
  }

  _equals(a, b) {
    return a === b;
  }
}
