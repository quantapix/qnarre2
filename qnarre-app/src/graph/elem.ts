import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qn from './ndata';
import * as qg from './graph';
import * as qt from './types';
import * as qp from './params';

import {PARAMS as PS} from './params';

export abstract class Elem extends HTMLElement {
  sels = {
    nodes: {} as qt.Dict<qt.Sel>,
    edges: {} as qt.Dict<qt.Sel>,
    annos: {} as qt.Dict<qt.Dict<qt.Sel>>
  };

  maxMetaNodeLabelLength?: number;
  maxMetaNodeLabelLengthLargeFont?: number;
  minMetaNodeLabelLengthFontSize?: number;
  maxMetaNodeLabelLengthFontSize?: number;
  templateIndex?: () => {};
  colorBy = '';
  abstract fire(n: string, d: any): void;
  abstract contextMenu(): HTMLElement;

  isNodeExpanded(nd: qg.Ndata) {
    return !!nd.expanded;
  }

  addNodeSel(n: string, s: qt.Sel) {
    this.sels.nodes[n] = s;
  }

  nodeSel(n: string) {
    return this.sels.nodes[n];
  }

  delNodeSel(n: string) {
    delete this.sels.nodes[n];
  }

  addEdgeSel(n: string, s: qt.Sel) {
    this.sels.edges[n] = s;
  }

  edgeSel(n: string) {
    return this.sels.edges[n];
  }

  delEdgeSel(n: string) {
    delete this.sels.edges[n];
  }

  addAnnoSel(a: string, n: string, s: qt.Sel) {
    const ans = this.sels.annos;
    ans[a] = ans[a] || {};
    ans[a][n] = s;
  }

  annoSel(n: string) {
    return this.sels.annos[n];
  }

  delAnnoSel(a: string, n: string) {
    delete this.sels.annos[a][n];
  }

  abstract getGraphSvgRoot(): SVGElement;
}
