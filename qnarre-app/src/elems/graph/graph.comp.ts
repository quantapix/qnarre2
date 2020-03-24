import * as _ from 'lodash';
import * as d3 from 'd3';
import {Component, OnInit} from '@angular/core';

import * as qg from '../../graph/group/graph';
import * as qh from '../../graph/group/hierarchy';
import * as qr from '../../graph/group/render';
import * as qt from '../../graph/group/types';
import * as qu from '../../graph/group/util';

@Component({
  selector: 'qnr-graph',
  templateUrl: './templates/graph.component.html',
  styleUrls: ['./styles/graph.component.scss']
})
export class GraphComp implements OnInit {
  title: string;
  graph: any;
  stats: any;
  devicesForStats: any;
  hParams: any;
  colorBy: string;
  traceInputs: boolean;
  nodeContextMenuItems: Array<any>;
  nodeNamesToHealths: any;
  healthPillStepIndex: number;
  edgeWidthFunction?: Function;
  handleNodeSelected?: Function;
  edgeLabelFunction?: Function;
  handleEdgeSelected?: Function;
  _allowSelect = true;
  _lastSelectedEdgeGroup: any;
  _renderDepth = 1;

  _hierarchy?: qt.Hierarchy;
  get hierarchy() {
    return this._hierarchy;
  }
  set hierarchy(h: qt.Hierarchy) {
    this._hierarchy = h;
    this.graphChanged();
  }

  _gdata?: qr.Gdata;
  get gdata() {
    return this._gdata;
  }
  set gdata(d: qr.Gdata) {
    this._gdata = d;
  }

  _progress: any;
  get progress() {
    return this._progress;
  }
  set progress(p: any) {
    this._progress = p;
  }

  _selectedNode: string;
  get selectedNode() {
    return this._selectedNode;
  }
  set selectedNode(n: string) {
    this._selectedNode = n;
  }

  _selectedEdge: string;
  get selectedEdge() {
    return this._selectedEdge;
  }
  set selectedEdge(e: string) {
    this._selectedEdge = e;
  }

  _highlightedNode: string;
  get highlightedNode() {
    return this._highlightedNode;
  }
  set highlightedNode(n: string) {
    this._highlightedNode = n;
  }

  _colorByParams: any;
  get colorByParams() {
    return this._colorByParams;
  }
  set colorByParams(ps: any) {
    this._colorByParams = ps;
  }

  constructor() {}

  ngOnInit() {}

  enableClick(_: any) {
    this._allowSelect = true;
  }
  disableClick(_: any) {
    this._allowSelect = false;
  }
  graphSelected(_: any) {
    if (this._allowSelect) {
      this.set('selectedNode', null);
      this.set('selectedEdge', null);
    }
    this._allowSelect = true;
  }
  nodeSelected(event: any) {
    if (this._allowSelect) {
      this.set('selectedNode', event.detail.name);
    }
    this._allowSelect = true;
  }
  edgeSelected(event: any) {
    if (this._allowSelect) {
      this.set('_lastSelectedEdgeGroup', event.detail.edgeGroup);
      this.set('selectedEdge', event.detail.edgeData);
    }
    this._allowSelect = true;
  }
  nodeHighlighted(event: any) {
    this.set('highlightedNode', event.detail.name);
  }
  nodeUnhighlighted(_: any) {
    this.set('highlightedNode', null);
  }
  toggleExpand(event: any) {
    this.nodeSelected(event);
    const n = event.detail.name;
    const d = this.gdata.getNdataByName(n);
    if (d.node.type === qt.NodeType.OP) return;
    this.gdata.buildSubhierarchy(n);
    d.expanded = !d.expanded;
    this.async(() => {
      this.$.scene.setNodeExpanded(d);
    }, 75);
  }
  toggleExtract(event: any) {
    const n = event.detail.name;
    const d = this.gdata.getNdataByName(n);
    if (d.node.include == qt.InclusionType.INCLUDE) {
      d.node.include = qt.InclusionType.EXCLUDE;
    } else if (d.node.include == qt.InclusionType.EXCLUDE) {
      d.node.include = qt.InclusionType.INCLUDE;
    } else {
      d.node.include = this.gdata.isNodeAuxiliary(d)
        ? qt.InclusionType.INCLUDE
        : qt.InclusionType.EXCLUDE;
    }
    this.buildHierarchy(this.hierarchy);
  }
  toggleSeries(event: any) {
    const n = event.detail.name;
    qg.toggleNodeSeriesGroup(this.hParams.seriesMap, n);
    this.set('progress', {value: 0, msg: ''});
    const t = qu.getTracker(this).getSubtaskTracker('Namespace hierarchy', 100);
    qh.build(this.graph, this.hParams, t).then(h => {
      this.set('graphHierarchy', h);
      this.buildHierarchy(this.hierarchy);
    });
  }
  graphChanged() {
    this.fire('graph-select');
  }
  statsChanged(stats, devices) {
    if (this.hierarchy) {
      if (stats && devices) {
        qg.mergeStats(this.graph, stats, devices);
        this.hierarchy.mergeStats(stats);
      }
      this.buildHierarchy(this.hierarchy);
    }
  }
  nodeChanged(node) {
    if (this.handleNodeSelected) {
      this.handleNodeSelected(node);
    }
  }
  edgeChanged(edge) {
    this.deselectPrevious();
    if (edge) {
      this._lastSelectedEdgeGroup.classed(qt.Class.Edge.SELECTED, true);
      this.updateMarker(edge);
    }
    if (this.handleEdgeSelected) {
      this.handleEdgeSelected(edge);
    }
  }
  deselectPrevious() {
    const selectedSelector = '.' + qt.Class.Edge.SELECTED;
    d3.select(selectedSelector)
      .classed(qt.Class.Edge.SELECTED, false)
      .each((d, i) => {
        if (d.label) {
          const paths = d3.select(this).selectAll('path.edgeline');
          if (d.label.startMarkerId) {
            paths.style('marker-start', `url(#${d.label.startMarkerId})`);
          }
          if (d.label.endMarkerId) {
            paths.style('marker-end', `url(#${d.label.endMarkerId})`);
          }
        }
      });
  }
  updateMarker(edge) {
    if (edge.label) {
      const markerId = edge.label.startMarkerId || edge.label.endMarkerId;
      if (markerId) {
        const selectedMarkerId = markerId.replace('dataflow-', 'selected-');
        let selectedMarker = this.$$('#' + selectedMarkerId);
        if (!selectedMarker) {
          const originalMarker = this.$.scene.querySelector('#' + markerId);
          selectedMarker = originalMarker.cloneNode(true);
          selectedMarker.setAttribute('id', selectedMarkerId);
          selectedMarker.classList.add('selected-arrowhead');
          originalMarker.parent.appendChild(selectedMarker);
        }
        const markerAttribute = edge.label.startMarkerId
          ? 'marker-start'
          : 'marker-end';
        this._lastSelectedEdgeGroup
          .selectAll('path.edgeline')
          .style(markerAttribute, `url(#${selectedMarkerId})`);
      }
    }
  }
  fit() {
    this.$.scene.fit();
  }
  panToNode(name) {
    this.$$('qnr-graph-scene').panToNode(name);
  }
  getVisible(name) {
    if (!name) return name;
    return this.gdata.getNearestVisibleAncestor(name);
  }
  buildNewHierarchy(h?: qt.Hierarchy) {
    if (!h) return;
    this.buildHierarchy(h);
  }
  buildHierarchy(h: qt.Hierarchy) {
    qu.time('new hierarchy', () => {
      if (h.root.type !== qt.NodeType.META) return;
      const d = new qr.Gdata(h, !!this.stats);
      d.edgeLabelFunction = this.edgeLabelFunction;
      d.edgeWidthFunction = this.edgeWidthFunction;
      function colorParams(s: d3.ScaleLinear<string, string>) {
        return {
          minValue: s.domain()[0],
          maxValue: s.domain()[1],
          startColor: s.range()[0],
          endColor: s.range()[1]
        };
      }
      this.colorByParams = {
        compute_time: colorParams(d.computeTimeScale),
        memory: colorParams(d.memoryUsageScale),
        device: _.map(d.deviceColorMap.domain(), device => {
          return {device, color: d.deviceColorMap(device)};
        }),
        cluster: _.map(d.clusterColorMap.domain(), cluster => {
          return {cluster, color: d.clusterColorMap(cluster)};
        })
      };
      this.gdata = d;
      this.async(() => this.fire('rendered'));
    });
  }

  listeners: {
    'enable-click': 'enableClick';
    'disable-click': 'disableClick';
    'graph-select': 'graphSelected';
    'node-select': 'nodeSelected';
    'edge-select': 'edgeSelected';
    'anno-select': 'nodeSelected';
    'node-highlight': 'nodeHighlighted';
    'node-unhighlight': 'nodeUnhighlighted';
    'anno-highlight': 'nodeHighlighted';
    'anno-unhighlight': 'nodeUnhighlighted';
    'toggle-expand': 'toggleExpand';
    'toggle-extract': 'toggleExtract';
    'toggle-series': 'toggleSeries';
  };
}
