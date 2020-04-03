import * as _ from 'lodash';
import * as d3 from 'd3';
import {Component, OnInit} from '@angular/core';

import * as qg from '../graph/graph';
import * as qh from '../graph/hierarchy';
import * as qr from '../graph/gdata';
import * as qt from '../graph/types';
import * as qu from '../graph/utils';

@Component({
  selector: 'qnr-graph',
  templateUrl: './graph.comp.html',
  styleUrls: ['./graph.comp.scss']
})
export class GraphComp implements OnInit {
  title?: string;
  graph: any;
  stats: any;
  devicesForStats: any;
  hParams: any;
  colorBy: string;
  traceInputs: boolean;
  nodeContextMenuItems: Array<any>;
  nodeNamesToHealths: any;
  healthPillStepIndex: number;
  widthFn?: Function;
  labelFn?: Function;
  _lastSelectedEdgeGroup: any;
  _renderDepth = 1;

  _allowSel = true;

  set gdata(d: qr.Gdata) {
    this._gdata = d;
  }
  get gdata() {
    return this._gdata!;
  }
  _gdata?: qr.Gdata;

  set hier(h: qg.Hierarchy | undefined) {
    this._hier = h;
    if (this._allowSel) {
      this._selNode = undefined;
      this._selEdge = undefined;
    }
    this._allowSel = true;
  }
  get hier() {
    return this._hier;
  }
  _hier?: qg.Hierarchy;

  set selNode(n: string | undefined) {
    if (this._allowSel) this._selNode = n;
    this._allowSel = true;
  }
  get selNode() {
    return this._selNode;
  }
  _selNode?: string;

  get selEdge() {
    return this._selEdge;
  }
  set selEdge(e: string | undefined) {
    if (this._allowSel) {
      this.deselectPrevious();
      if (e) {
        //this._lastSelectedEdgeGroup = event.detail.edgeGroup;
        this._lastSelectedEdgeGroup.classed(qt.Class.Edge.SELECTED, true);
        this.updateMarker(e);
      }
      this._selEdge = e;
    }
    this._allowSel = true;
  }
  _selEdge?: string;

  get progress() {
    return this._progress;
  }
  set progress(p: any) {
    this._progress = p;
  }
  _progress: any;

  _lightedN: string;
  get lightedN() {
    return this._lightedN;
  }
  set lightedN(n: string) {
    this._lightedN = n;
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

  enableClick(_: any) {
    this._allowSel = true;
  }
  disableClick(_: any) {
    this._allowSel = false;
  }
  nodeHighlighted(event: any) {
    this.set('lightedN', event.detail.name);
  }
  nodeUnhighlighted(_: any) {
    this.set('lightedN', null);
  }
  toggleExpand(event: any) {
    this.nodeSelected(event);
    const n = event.detail.name;
    const d = this.gdata.getNdataByName(n);
    if (d.node.type === qt.NdataT.OP) return;
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
    const t = qu.getTracker(this).subTracker('Namespace hierarchy', 100);
    qh.build(this.graph, this.hParams, t).then(h => {
      this.set('graphHierarchy', h);
      this.buildHierarchy(this.hierarchy);
    });
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
  fit() {
    this.$.scene.fit();
  }
  panTo(n: string) {
    this.$$('qnr-graph-scene').panTo(n);
  }
  getVisible(name) {
    if (!name) return name;
    return this.gdata.getNearestVisibleAncestor(name);
  }
  buildNewHierarchy(h?: qt.Hierarchy) {
    if (!h) return;
    this.buildHierarchy(h);
  }
  buildHierarchy(h: qg.Hierarchy) {
    qu.time('new hierarchy', () => {
      if (h.root.type !== qt.NdataT.META) return;
      const d = new qr.Gdata(h, !!this.stats);
      d.labelFn = this.labelFn;
      d.widthFn = this.widthFn;
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
