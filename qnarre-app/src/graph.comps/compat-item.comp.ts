import {Component, OnInit} from '@angular/core';

import * as qp from '../graph.elems/params';
import * as qt from '../graph.elems/types';
import * as hierarchy from '../../graph/hierarchy';

@Component({
  selector: 'qnr-graph-compat-item',
  template: `
    <div
      id="list-item"
      on-mouseover="(_nodeListener)"
      on-mouseout="(_nodeListener)"
      on-click="(_nodeListener)"
    >
      <div class$="{{" _fadedClass(itemRenderInfo) }}>
        <qnr-graph-node-icon
          class="node-icon"
          [height]="12"
          [colorBy]="colorBy"
          color-by-params="[[colorByParams]]"
          [node]="itemNode"
          [ndata]="itemRenderInfo"
          [tidx]="templateIndex"
        >
        </qnr-graph-node-icon>
        <span title="{{ name }}">{{ name }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      #list-item {
        width: 100%;
        color: #565656;
        font-size: 11pt;
        font-weight: 400;
        position: relative;
        display: inline-block;
      }
      #list-item:hover {
        background-color: var(--google-yellow-100);
      }
      .clickable {
        cursor: pointer;
      }
      #list-item span {
        margin-left: 40px;
      }
      #list-item.excluded span {
        color: #999;
      }
      #list-item span.edge-label {
        float: right;
        font-size: 10px;
        margin-left: 3px;
        margin-right: 5px;
      }
      .node-icon {
        position: absolute;
        top: 1px;
        left: 2px;
      }
      .faded span {
        color: var(--tb-graph-faded);
      }
    `
  ]
})
export class CompatItemComp {
  cardNode: any;
  itemNode: any;
  edgeLabel: string;
  itemRenderInfo: any;
  name: string;
  itemType: string; // observer: '_itemTypeChanged';
  colorBy: qt.ColorBy;
  colorByParams: any;
  templateIndex: Function;

  _itemTypeChanged() {
    if (this.itemType !== 'subnode') {
      this.$['list-item'].classList.add('clickable');
    } else {
      this.$['list-item'].classList.remove('clickable');
    }
  }

  _nodeListener(event) {
    this.fire('node-list-item-' + event.type, {
      nodeName: this.name,
      type: this.itemType
    });
  }

  _fadedClass(itemRenderInfo) {
    return itemRenderInfo && itemRenderInfo.isFadedOut ? 'faded' : '';
  }
}

@Component({
  selector: 'qnr-graph-compat-card',
  templateUrl: './compat-card.comp.html',
  styleUrls: ['./compat-card.comp.scss']
})
export class CompatCardComp implements OnInit {
  graphHierarchy: any;
  hierarchyParams: any;
  nodeTitle: string;
  _templateIndex: {
    type: Function;
    computed: '_getIndexer(graphHierarchy)';
  };
  _incompatibleOpNodes: {
    type: any;
    computed: '_getIncompatibleOpNodes(graphHierarchy, hierarchyParams)';
  };
  _expanded: {
    type: boolean;
    value: true;
  };
  _opCompatScore: {
    type: number;
    computed: '_computeOpCompatScore(graphHierarchy)';
  };
  _opCompatScoreLabel: {
    type: string;
    computed: '_getOpCompatScoreLabel(_opCompatScore)';
  };
  _opCompatColor = qp.OperColors.COMPAT;
  _opIncompatColor = qp.OperColors.INCOMPAT;
  _totalIncompatOps: number; //  computed: '_getTotalIncompatibleOps(graphHierarchy)';

  constructor() {}

  ngOnInit() {}

  _getIndexer(graphHierarchy) {
    return graphHierarchy.getIndexer();
  }

  _getNode(nodeName, graphHierarchy) {
    return graphHierarchy.node(nodeName);
  }

  _getPrintableHTMLNodeName(nodeName) {
    // Insert an optional line break before each slash so that
    // long node names wrap cleanly at path boundaries.
    return (nodeName || '').replace(/\//g, '<wbr>/');
  }

  _getRenderInfo(nodeName, renderHierarchy) {
    return this.renderHierarchy.getOrCreateRenderNodeByName(nodeName);
  }

  _toggleExpanded() {
    this._expanded = !this._expanded;
  }

  _getToggleIcon(expanded) {
    return expanded ? 'expand-less' : 'expand-more';
  }

  _resizeList(selector) {
    const list = document.querySelector(selector);
    if (list) {
      list.fire('iron-resize');
    }
  }

  _getIncompatibleOpNodes(graphHierarchy, hierarchyParams) {
    if (graphHierarchy && graphHierarchy.root) {
      this.async(this._resizeList.bind(this, '#incompatibleOpsList'));
      return graphHierarchy.getIncompatibleOps(hierarchyParams);
    }
  }

  _computeOpCompatScore(graphHierarchy) {
    if (graphHierarchy && graphHierarchy.root) {
      const root = graphHierarchy.root;
      const numCompat = root.compatHisto.compatible;
      const numIncompat = root.compatHisto.incompatible;
      if (numCompat == 0 && numIncompat == 0) return 0;
      const numTotal = numCompat + numIncompat;
      // Round the ratio towards negative infinity.
      return Math.floor((100 * numCompat) / numTotal) / 100;
    }
    return 0;
  }

  _getOpCompatScoreLabel(opCompatScore) {
    return d3.format('.0%')(opCompatScore);
  }

  _getTotalIncompatibleOps(graphHierarchy) {
    if (graphHierarchy && graphHierarchy.root) {
      return graphHierarchy.root.compatHisto.incompatible;
    }
    return 0;
  }
}
