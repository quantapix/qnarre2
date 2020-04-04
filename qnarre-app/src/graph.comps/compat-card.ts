import {Component, OnInit} from '@angular/core';

import * as qp from '../graph.app/params';
import * as qt from '../graph.app/types';
import * as hierarchy from '../../graph/hierarchy';

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
