import * as _ from 'lodash';
import * as d3 from 'd3';
import {Component, OnInit, Input} from '@angular/core';

import * as qn from '../../graph/ndata';
import * as qg from '../../graph/graph';
import * as qp from '../../graph/params';
import * as qs from '../../graph/scene';
import * as qt from '../../graph/types';
import * as qu from '../../graph/utils';
import * as qd from '../../graph/gdata';
import * as ql from '../../graph/layout';

@Component({
  selector: 'qnr-graph-scene',
  templateUrl: './scene.comp.html',
  styleUrls: ['./scene.comp.scss']
})
export class SceneComponent extends qs.Elem implements OnInit {
  name: string;
  colorBy: string;
  traceInputs?: boolean;
  _hasRenderHierarchyBeenFitOnce?: boolean;
  _isAttached?: boolean;
  _zoom: any;
  handleEdgeSelected: any;
  _zoomStart?: any;
  _zoomTransform?: any;
  _maxZoomDistanceForClick = 20;
  indexer?: (n: string) => number;
  minimap: any;
  progress: any;
  nodeContextMenuItems: Array<any>;
  nodeNamesToHealths: any;
  healthPillStepIndex: number;
  renderHierarchy: qd.Gdata;

  @Input() selectedNode: string; // observer: '_selectedNodeChanged'
  highlighted: string; //  observer: '_highlightedChanged'
  _zoomed = false; //  observer: '_onZoomChanged';

  $ = {} as {svg: SVGSVGElement; root: SVGGElement; contextMenu: HTMLElement};

  constructor() {
    super();
  }

  getNode(n: string) {
    return this.renderHierarchy.getNdataByName(n);
  }

  isNodeSelected(n: string) {
    return n === this.selectedNode;
  }

  isNodeHighlighted(n: string) {
    return n === this.highlighted;
  }

  setNodeExpanded(renderNode) {
    this._build(this.renderHierarchy);
    this._updateLabels(!this._zoomed);
  }

  panToNode(n: string) {
    const zoomed = qs.panToNode(n, this.$.svg, this.$.root, this._zoom);
    if (zoomed) {
      this._zoomed = true;
    }
  }

  getGraphSvgRoot() {
    return this.$.svg;
  }

  contextMenu() {
    return this.$.contextMenu;
  }

  _resetState() {
    this.sels = {nodes: {}, edges: {}, annos: {}};
    this._updateLabels(false);
    d3.select(this.$.svg)
      .select('#root')
      .selectAll('*')
      .remove();
    qn.delGradDefs(this.$.svg);
  }

  _build(gd: qd.Gdata) {
    this.indexer = gd.hier.indexer();
    qu.time('qnr-graph-scene (layout):', () => {
      ql.layout(gd.root);
    });
    qu.time('qnr-graph-scene (build scene):', () => {
      qs.buildGroup(d3.select(this.$.root), gd.root, this);
      qs.addClickListener(this.$.svg, this);
      this._updateInputTrace();
    });
    setTimeout(() => {
      this._updateHealths(this.nodeNamesToHealths, this.healthPillStepIndex);
      this.minimap.update();
    }, qp.PARAMS.animation.duration);
  }

  ngOnInit() {
    this._zoom = d3
      .zoom()
      .on('end', () => {
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
      })
      .on('zoom', () => {
        this._zoomTransform = d3.event.transform;
        if (!this._zoomStart) {
          this._zoomStart = this._zoomTransform;
          this.fire('disable-click');
        }
        this._zoomed = true;
        d3.select(this.$.root).attr('transform', d3.event.transform);
        this.minimap.zoom(d3.event.transform);
      });
    d3.select(this.$.svg)
      .call(this._zoom)
      .on('dblclick.zoom', null);
    d3.select(window).on('resize', () => {
      this.minimap.zoom();
    });
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

  _renderHierarchyChanged(gd: qd.Gdata) {
    this._hasRenderHierarchyBeenFitOnce = false;
    this._resetState();
    this._build(gd);
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
      _.each(this.sels.nodes, (_, n) => {
        this._updateNodeState(n);
      });
      this.minimap.update();
    }
  }

  fit() {
    this._hasRenderHierarchyBeenFitOnce = true;
    qs.fit(this.$.svg, this.$.root, this._zoom, () => (this._zoomed = false));
  }

  _updateHealths(nodeNamesToHealths, healthPillStepIndex) {
    qs.addAllHealths(this.$.svg, nodeNamesToHealths, healthPillStepIndex);
  }

  _updateNodeState(n: string) {
    const nd = this.getNode(n)!;
    const s = this.nodeSel(n);
    if (s) nd.stylize(s, node, this);
    if (nd.type === qt.NdataT.META && nd.assoc && !nd.isLibraryFn) {
      const libraryFunctionNodeName = qp.LIB_PRE + node.node.assocFn;
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
      node.stylize(aGroup, node, this, qt.Class.Anno.NODE);
    });
  }

  _selectedNodeChanged(selectedNode, old) {
    if (selectedNode === old) return;
    if (old) this._updateNodeState(old);
    if (!selectedNode) return;
    this.minimap.update();
    let nd = this.renderHierarchy.hier.node(selectedNode);
    const ps = [];
    while (nd?.parent && nd.parent.name != qp.ROOT) {
      nd = nd.parent;
      ps.push(nd.name);
    }
    let top;
    _.forEachRight(ps, p => {
      this.renderHierarchy.buildSubhier(p);
      const d = this.renderHierarchy.getNdataByName(p);
      if (qg.isList(d) && !d.expanded) {
        d.expanded = true;
        if (!top) top = d;
      }
    });
    if (top) {
      this.setNodeExpanded(top);
      this._zoomed = true;
    }
    if (selectedNode) {
      this._updateNodeState(selectedNode);
    }
    setTimeout(() => {
      this.panToNode(selectedNode);
    }, qp.PARAMS.animation.duration);
  }

  _highlightedChanged(h, old) {
    if (h === old) return;
    if (h) this._updateNodeState(h);
    if (old) this._updateNodeState(old);
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
