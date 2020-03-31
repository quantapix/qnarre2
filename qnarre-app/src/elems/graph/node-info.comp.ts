import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'qnr-node-info',
  templateUrl: './templates/node-info.component.html',
  styleUrls: ['./styles/node-info.component.scss']
})
export class NodeInfoComponent implements OnInit {
  nodeName: string;
  graphHierarchy: Object;
  /** What to color the nodes by (compute time, memory, device etc.) */
  colorBy: string;
  _templateIndex: {
    type: Function;
    computed: '_getIndexer(graphHierarchy)';
  };
  _node: {
    type: Object;
    computed: '_getNode(nodeName, graphHierarchy)';
    observer: '_resetState';
  };
  _nodeStats: {
    type: Object;
    computed: '_getNodeStats(nodeName, graphHierarchy)';
    observer: '_resetState';
  };
  _isDisplayable: {
    type: Object;
    computed: '_getHasDisplayableNodeStats(_nodeStats)';
  };
  _nodeStatsFormattedBytes: {
    type: string;
    computed: '_getNodeStatsFormattedBytes(_nodeStats)';
  };
  _nodeStatsFormattedComputeTime: {
    type: string;
    computed: '_getNodeStatsFormattedComputeTime(_nodeStats)';
  };
  _nodeStatsFormattedOutputSizes: {
    type: Array<any>;
    computed: '_getNodeStatsFormattedOutputSizes(_nodeStats)';
  };
  // The enum value of the include property of the selected node.
  nodeInclude: {
    type: number;
    observer: '_nodeIncludeStateChanged';
  };
  _attributes: {
    type: Array;
    computed: '_getAttributes(_node)';
  };
  _device: {
    type: string;
    computed: '_getDevice(_node)';
  };
  _successors: {
    type: Object;
    computed: '_getSuccs(_node, graphHierarchy)';
  };
  _predecessors: {
    type: Object;
    computed: '_getPreds(_node, graphHierarchy)';
  };
  // Only relevant if this is a library function. A list of nodes that
  // represent where the function is used.
  _functionUsages: {
    type: Array<any>;
    computed: '_getFunctionUsages(_node, graphHierarchy)';
  };
  _subnodes: {
    type: Array<any>;
    computed: '_getSubnodes(_node)';
  };
  _expanded: {
    type: boolean;
    value: true;
  };
  _totalPredecessors: {
    type: number;
    computed: '_getTotalPred(_predecessors)';
  };
  _totalSuccessors: {
    type: number;
    computed: '_getTotalSucc(_successors)';
  };
  _openedControlPred: {
    type: boolean;
    value: false;
  };
  _openedControlSucc: {
    type: boolean;
    value: false;
  };
  _auxButtonText: string;
  _groupButtonText: string;

  constructor() {}

  ngOnInit() {}

  expandNode() {
    this.fire('_node.expand', this.node);
  }

  _getIndexer(graphHierarchy) {
    return graphHierarchy.getIndexer();
  }

  _getNode(nodeName, graphHierarchy) {
    return graphHierarchy.node(nodeName);
  }

  _getNodeStats(nodeName, graphHierarchy) {
    const node = this._getNode(nodeName, graphHierarchy);
    if (node) {
      return node.stats;
    }
    return null;
  }

  _getTotalMicros(stats) {
    return stats ? stats.getTotalMicros() : 0;
  }

  _getHasDisplayableNodeStats(stats) {
    return tf.graph.util.isDisplayable(stats);
  }

  _getNodeStatsFormattedBytes(stats) {
    if (!stats || !stats.totalBytes) {
      return;
    }

    return tf.graph.util.convertUnits(
      stats.totalBytes,
      tf.graph.util.MEMORY_UNITS
    );
  }

  _getNodeStatsFormattedComputeTime(stats) {
    if (!stats || !stats.getTotalMicros()) {
      return;
    }

    return tf.graph.util.convertUnits(
      stats.getTotalMicros(),
      tf.graph.util.TIME_UNITS
    );
  }

  _getNodeStatsFormattedOutputSizes(stats) {
    if (!stats || !stats.outputSize || !stats.outputSize.length) {
      return;
    }

    return _.map(stats.outputSize, function(shape) {
      if (shape.length === 0) {
        return 'scalar';
      }
      return '[' + shape.join(', ') + ']';
    });
  }

  _getPrintableHTMLNodeName(nodeName) {
    // Insert an optional line break before each slash so that
    // long node names wrap cleanly at path boundaries.
    return (nodeName || '').replace(/\//g, '<wbr>/');
  }

  _getRenderInfo(nodeName, renderHierarchy) {
    return this.renderHierarchy.getOrCreateRenderNodeByName(nodeName);
  }

  _getAttributes(node) {
    this.async(this._resizeList.bind(this, '#attributesList'));
    if (!node || !node.attr) {
      return [];
    }
    const attrs = [];
    _.each(node.attr, function(entry) {
      // Unpack the "too large" attributes into separate attributes
      // in the info card, with values "too large to show".
      if (entry.key === tf.graph.LARGE_ATTRS_KEY) {
        attrs = attrs.concat(
          entry.value.list.s.map(function(key) {
            return {key: key, value: 'Too large to show...'};
          })
        );
      } else {
        attrs.push({
          key: entry.key,
          value: JSON.stringify(entry.value)
        });
      }
    });
    return attrs;
  }

  _getDevice(node) {
    return node ? node.device : null;
  }

  _getSuccs(node, hierarchy) {
    this._refreshNodeItemList('insList');
    if (!node) {
      return {regular: [], control: []};
    }
    return this._convertEdgeListToEdgeInfoList(
      hierarchy.getSuccs(node.name),
      false,
      node.isGroup
    );
  }

  _getPreds(node, hierarchy) {
    this._refreshNodeItemList('outputsList');
    if (!node) {
      return {regular: [], control: []};
    }
    return this._convertEdgeListToEdgeInfoList(
      hierarchy.getPreds(node.name),
      true,
      node.isGroup
    );
  }

  _getFunctionUsages(node, hierarchy) {
    this._refreshNodeItemList('functionUsagesList');
    if (!node || node.type !== tf.graph.NodeType.META) {
      // Functions must be represented by metanodes.
      return [];
    }

    const libraryFunctionData = hierarchy.libfns[node.assocFn];
    if (!libraryFunctionData) {
      // This is no function.
      return [];
    }

    // Return where the function is used.
    return libraryFunctionData.usages;
  }

  // The iron lists that enumerate ops must be asynchronously updated when
  // the data they render changes. This function triggers that update.
  _refreshNodeItemList(nodeListId) {
    this.async(this._resizeList.bind(this, `#${nodeListId}`));
  }

  _convertEdgeListToEdgeInfoList(list, isPredecessor, isGroup) {
    /**
     * Unpacks the metaedge into a list of base edge information
     * that can be rendered.
     */
    const unpackMetaEdge = meta => {
      return meta.links.map(l => {
        const name = isPredecessor ? l.nodes[0] : l.nodes[1];
        return {
          name: name,
          node: this._getNode(name, this.graphHierarchy),
          edgeLabel: this.renderHierarchy.labelForLink(l),
          renderInfo: this._getRenderInfo(name, this.renderHierarchy)
        };
      });
    };

    /**
     * Converts a list of metaedges to a list of edge information
     * that can be rendered.
     */
    const toEdgeInfoList = function(edges) {
      const edgeInfoList = [];
      _.each(edges, metaedge => {
        const name = isPredecessor ? metaedge.v : metaedge.w;
        // Enumerate all the base edges if the node is an OpNode, or the
        // metaedge has only 1 edge in it.
        if (!isGroup || metaedge.bases.length == 1) {
          edgeInfoList = edgeInfoList.concat(unpackMetaEdge(metaedge));
        } else {
          edgeInfoList.push({
            name: name,
            node: this._getNode(name, this.graphHierarchy),
            edgeLabel: tf.graph.scene.edge.getLabelForEdge(
              metaedge,
              this.renderHierarchy
            ),
            renderInfo: this._getRenderInfo(name, this.renderHierarchy)
          });
        }
      });
      return edgeInfoList;
    }.bind(this);

    return {
      regular: toEdgeInfoList(list.regular),
      control: toEdgeInfoList(list.control)
    };
  }

  _getSubnodes(node) {
    return node && node.metag ? node.metag.nodes() : null;
  }

  _getTotalPred(predecessors) {
    return predecessors.regular.length + predecessors.control.length;
  }

  _getTotalSucc(successors) {
    return successors.regular.length + successors.control.length;
  }

  _toggleControlPred() {
    this._openedControlPred = !this._openedControlPred;
  }

  _toggleControlSucc() {
    this._openedControlSucc = !this._openedControlSucc;
  }

  _toggleExpanded() {
    this._expanded = !this._expanded;
  }

  _getToggleIcon(expanded) {
    return expanded ? 'expand-less' : 'expand-more';
  }

  _resetState() {
    this._openedControlPred = false;
    this._openedControlSucc = false;

    this.set(
      '_groupButtonText',
      tf.graph.scene.node.getGroupSettingLabel(this._node)
    );

    if (this._node) {
      Polymer.dom(this.$.nodetitle).innerHTML = this._getPrintableHTMLNodeName(
        this._node.name
      );
    }
  }

  _resizeList(selector) {
    const list = document.querySelector(selector);
    if (list) {
      list.fire('iron-resize');
    }
  }

  _toggleInclude() {
    this.fire('node-toggle-inclusion', {name: this.nodeName});
  }

  _nodeIncludeStateChanged(include, oldInclude) {
    this.set('_auxButtonText', tf.graph.getIncludeNodeButtonString(include));
  }

  _toggleGroup() {
    const seriesName = tf.graph.scene.node.getSeriesName(this._node);
    this.fire('node-toggle-seriesgroup', {name: seriesName});
  }

  _isLibraryFn(node) {
    // If the node name starts with this string, the node is either a
    // library function or a node within it. Those nodes should never be
    // extracted into the auxiliary scene group because they represent
    // templates for function call nodes, not ops in the graph themselves.
    return node && node.name.startsWith(tf.graph.LIBRARY_PREFIX);
  }

  _isInSeries(node) {
    return tf.graph.scene.node.canBeInSeries(node);
  }
}
