import * as _ from 'lodash';
import * as d3 from 'd3';
import {Component, OnInit, Input} from '@angular/core';

import * as ql from '../../graph/group/layout';
import * as qn from '../../graph/group/ndata';
import * as qp from '../../graph/group/params';
import * as qs from '../../graph/group/scene';
import * as qt from '../../graph/group/types';
import * as qu from '../../graph/group/utils';

@Component({
  selector: 'qnr-graph-scene',
  templateUrl: './templates/scene.component.html',
  styleUrls: ['./styles/scene.component.scss']
})
export class SceneComponent implements OnInit {
  name: string;
  colorBy: string;
  traceInputs: boolean;
  _hasRenderHierarchyBeenFitOnce: boolean;
  _isAttached: boolean;
  _zoom: any;
  handleEdgeSelected: any;
  _zoomStart?: any;
  _zoomTransform?: any;
  _maxZoomDistanceForClick = 20;
  templateIndex: number;
  minimap: any;
  _nodeGroupIndex: Function;
  _annotationGroupIndex: Function;
  _edgeGroupIndex: Function;
  maxMetaNodeLabelLengthFontSize = 9;
  minMetaNodeLabelLengthFontSize = 6;
  maxMetaNodeLabelLengthLargeFont = 11;
  maxMetaNodeLabelLength = 18;
  progress: any;
  nodeContextMenuItems: Array<any>;
  nodeNamesToHealths: any;
  healthPillStepIndex: number;
  renderHierarchy: any;

  @Input() selectedNode: string; // observer: '_selectedNodeChanged'
  highlightedNode: string; //  observer: '_highlightedNodeChanged'
  _zoomed = false; //  observer: '_onZoomChanged';

  constructor() {}

  getNode(nodeName) {
    return this.renderHierarchy.getNdataByName(nodeName);
  }

  isNodeExpanded(node) {
    return node.expanded;
  }

  setNodeExpanded(renderNode) {
    this._build(this.renderHierarchy);
    this._updateLabels(!this._zoomed);
  }

  panToNode(nodeName) {
    const zoomed = qs.panToNode(nodeName, this.$.svg, this.$.root, this._zoom);
    if (zoomed) {
      this._zoomed = true;
    }
  }

  getGraphSvgRoot() {
    return this.$.svg;
  }

  getContextMenu() {
    return this.$.contextMenu;
  }

  _resetState() {
    this._nodeGroupIndex = {};
    this._annotationGroupIndex = {};
    this._edgeGroupIndex = {};
    this._updateLabels(false);
    d3.select(this.$.svg)
      .select('#root')
      .selectAll('*')
      .remove();
    node.removeGradientDefinitions(this.$.svg);
  }

  _build(renderHierarchy) {
    this.templateIndex = renderHierarchy.hierarchy.getIndexer();
    qu.time('qnr-graph-scene (layout):', () => {
      layoutScene(renderHierarchy.root, this);
    });
    qu.time(
      'qnr-graph-scene (build scene):',
      function() {
        qs.buildGroup(d3.select(this.$.root), renderHierarchy.root, this);
        qs.addGraphClickListener(this.$.svg, this);
        this._updateInputTrace();
      }.bind(this)
    );
    setTimeout(
      function() {
        this._updateHealths(this.nodeNamesToHealths, this.healthPillStepIndex);
        this.minimap.update();
      }.bind(this),
      qp.PARAMS.animation.duration
    );
  }

  ngOnInit() {
    this._zoom = d3
      .zoom()
      .on(
        'end',
        function() {
          if (this._zoomStart) {
            const dragDistance = Math.sqrt(
              Math.pow(this._zoomStart.x - this._zoomTransform.x, 2) +
                Math.pow(this._zoomStart.y - this._zoomTransform.y, 2)
            );
            if (dragDistance < this._maxZoomDistanceForClick) {
              this._fireEnableClick();
            } else {
              setTimeout(this._fireEnableClick.bind(this), 50);
            }
          }
          this._zoomStart = null;
        }.bind(this)
      )
      .on(
        'zoom',
        function() {
          this._zoomTransform = d3.event.transform;
          if (!this._zoomStart) {
            this._zoomStart = this._zoomTransform;
            this.fire('disable-click');
          }
          this._zoomed = true;
          d3.select(this.$.root).attr('transform', d3.event.transform);
          this.minimap.zoom(d3.event.transform);
        }.bind(this)
      );
    d3.select(this.$.svg)
      .call(this._zoom)
      .on('dblclick.zoom', null);
    d3.select(window).on(
      'resize',
      function() {
        this.minimap.zoom();
      }.bind(this)
    );
    this.minimap = this.$.minimap.init(
      this.$.svg,
      this.$.root,
      this._zoom,
      qp.PARAMS.minimap.size,
      qp.PARAMS.subqs.meta.labelHeight
    );
  }

  attached() {
    this.set('_isAttached', true);
  }

  detached() {
    this.set('_isAttached', false);
  }

  _renderHierarchyChanged(renderHierarchy) {
    this._hasRenderHierarchyBeenFitOnce = false;
    this._resetState();
    this._build(renderHierarchy);
  }

  _animateAndFit(isAttached, renderHierarchy) {
    if (this._hasRenderHierarchyBeenFitOnce || !isAttached) {
      return;
    }
    setTimeout(this.fit.bind(this), qp.PARAMS.animation.duration);
  }

  _updateLabels(showLabels) {
    const mainGraphTitleElement = this.$$('.title');
    const titleStyle = mainGraphTitleElement.style;
    const auxTitleElement = this.$$('.auxTitle');
    const auxTitleStyle = auxTitleElement.style;
    const functionLibraryTitleStyle = this.$$('.functionLibraryTitle').style;
    const root = d3.select(this.$.svg);
    const core = root
      .select('.' + qt.Class.Scene.GROUP + '>.' + qt.Class.Scene.CORE)
      .node();
    if (showLabels && core && this.progress && this.progress.value === 100) {
      const aux =
        root
          .select('.' + qt.Class.Scene.GROUP + '>.' + qt.Class.Scene.INEXTRACT)
          .node() ||
        root
          .select('.' + qt.Class.Scene.GROUP + '>.' + qt.Class.Scene.OUTEXTRACT)
          .node();
      const coreX = core.getCTM().e;
      let auxX = aux ? aux.getCTM().e : null;
      titleStyle.display = 'inline';
      titleStyle.left = coreX + 'px';
      if (auxX !== null && auxX !== coreX) {
        auxTitleStyle.display = 'inline';
        auxX = Math.max(
          coreX + mainGraphTitleElement.getBoundingClientRect().width,
          auxX
        );
        auxTitleStyle.left = auxX + 'px';
      } else {
        auxTitleStyle.display = 'none';
      }
      const functionLibrary = root
        .select(
          '.' + qt.Class.Scene.GROUP + '>.' + qt.Class.Scene.FUNCTION_LIBRARY
        )
        .node();
      let functionLibraryX = functionLibrary
        ? functionLibrary.getCTM().e
        : null;
      if (functionLibraryX !== null && functionLibraryX !== auxX) {
        functionLibraryTitleStyle.display = 'inline';
        functionLibraryX = Math.max(
          auxX + auxTitleElement.getBoundingClientRect().width,
          functionLibraryX
        );
        functionLibraryTitleStyle.left = functionLibraryX + 'px';
      } else {
        functionLibraryTitleStyle.display = 'none';
      }
    } else {
      titleStyle.display = 'none';
      auxTitleStyle.display = 'none';
      functionLibraryTitleStyle.display = 'none';
    }
  }

  _colorByChanged() {
    if (this.renderHierarchy != null) {
      _.each(this._nodeGroupIndex, (nodeGroup, nodeName) => {
        this._updateNodeState(nodeName);
      });
      this.minimap.update();
    }
  }

  fit() {
    this._hasRenderHierarchyBeenFitOnce = true;
    qs.fit(this.$.svg, this.$.root, this._zoom, () => (this._zoomed = false));
  }

  isNodeSelected(n) {
    return n === this.selectedNode;
  }

  isNodeHighlighted(n) {
    return n === this.highlightedNode;
  }

  addAnnotationGroup(a, d, selection) {
    const an = a.node.name;
    this._annotationGroupIndex[an] = this._annotationGroupIndex[an] || {};
    this._annotationGroupIndex[an][d.node.name] = selection;
  }

  getAnnotationGroupsIndex(a) {
    return this._annotationGroupIndex[a];
  }

  removeAnnotationGroup(a, d) {
    delete this._annotationGroupIndex[a.node.name][d.node.name];
  }

  addNodeGroup(n, selection) {
    this._nodeGroupIndex[n] = selection;
  }

  getNodeGroup(n) {
    return this._nodeGroupIndex[n];
  }

  removeNodeGroup(n) {
    delete this._nodeGroupIndex[n];
  }

  addEdgeGroup(n, selection) {
    this._edgeGroupIndex[n] = selection;
  }

  getEdgeGroup(e) {
    return this._edgeGroupIndex[e];
  }

  _updateHealths(nodeNamesToHealths, healthPillStepIndex) {
    qs.addAllHealths(this.$.svg, nodeNamesToHealths, healthPillStepIndex);
  }

  _updateNodeState(n) {
    const node = this.getNode(n);
    const nodeGroup = this.getNodeGroup(n);
    if (nodeGroup) node.stylize(nodeGroup, node, this);
    if (
      node.node.type === qt.NodeType.META &&
      node.node.assocFn &&
      !node.isLibraryFn
    ) {
      const libraryFunctionNodeName = qp.LIBRARY_PREFIX + node.node.assocFn;
      const functionGroup = d3.select(
        '.' +
          qt.Class.Scene.GROUP +
          '>.' +
          qt.Class.Scene.FUNCTION_LIBRARY +
          ' g[data-name="' +
          libraryFunctionNodeName +
          '"]'
      );
      node.stylize(functionGroup, node, this);
    }
    const annotationGroupIndex = this.getAnnotationGroupsIndex(n);
    _.each(annotationGroupIndex, (aGroup, hostName) => {
      node.stylize(aGroup, node, this, qt.Class.Annotation.NODE);
    });
  }

  _selectedNodeChanged(selectedNode, oldSelectedNode) {
    if (selectedNode === oldSelectedNode) return;
    if (oldSelectedNode) this._updateNodeState(oldSelectedNode);
    if (!selectedNode) return;
    this.minimap.update();
    let node = this.renderHierarchy.hierarchy.node(selectedNode);
    const nodeParents = [];
    while (node.parent != null && node.parent.name != qp.ROOT_NAME) {
      node = node.parent;
      nodeParents.push(node.name);
    }
    let topparentToBeExpanded;
    _.forEachRight(nodeParents, parentName => {
      this.renderHierarchy.buildSubhierarchy(parentName);
      const renderNode = this.renderHierarchy.getNdataByName(parentName);
      if (renderNode.node.isGroup && !renderNode.expanded) {
        renderNode.expanded = true;
        if (!topparentToBeExpanded) topparentToBeExpanded = renderNode;
      }
    });
    if (topparentToBeExpanded) {
      this.setNodeExpanded(topparentToBeExpanded);
      this._zoomed = true;
    }
    if (selectedNode) {
      this._updateNodeState(selectedNode);
    }
    setTimeout(() => {
      this.panToNode(selectedNode);
    }, qp.PARAMS.animation.duration);
  }

  _highlightedNodeChanged(highlightedNode, oldHighlightedNode) {
    if (highlightedNode === oldHighlightedNode) return;
    if (highlightedNode) this._updateNodeState(highlightedNode);
    if (oldHighlightedNode) this._updateNodeState(oldHighlightedNode);
  }

  _onZoomChanged() {
    this._updateLabels(!this._zoomed);
  }

  _fireEnableClick() {
    this.fire('enable-click');
  }

  _updateInputTrace() {
    node.updateInputTrace(
      this.getGraphSvgRoot(),
      this.renderHierarchy,
      this.selectedNode,
      this.traceInputs
    );
  }

  observers: [
    '_colorByChanged(colorBy)',
    '_renderHierarchyChanged(renderHierarchy)',
    '_animateAndFit(_isAttached, renderHierarchy)',
    '_updateHealths(nodeNamesToHealths, healthPillStepIndex)',
    '_updateInputTrace(traceInputs, selectedNode)'
  ];
}
