import * as _ from 'lodash';

import * as qg from './graph';
import * as qt from './types';

export abstract class Elem extends HTMLElement {
  gdata?: qg.Gdata;
  sels = {
    nodes: {} as qt.Dict<qt.Sel>,
    edges: {} as qt.Dict<qt.Sel>,
    annos: {} as qt.Dict<qt.Dict<qt.Sel>>
  };

  maxMetaNodeLabelLength = 18;
  maxMetaNodeLabelLengthFontSize = 9;
  maxMetaNodeLabelLengthLargeFont = 11;
  minMetaNodeLabelLengthFontSize = 6;

  indexer?: (_: string) => number;
  colorBy = '';
  handle: any;

  abstract fire(n: string, d: any): void;
  abstract contextMenu(): HTMLElement;
  abstract getGraphSvgRoot(): SVGElement;
  abstract isNodeSelected(n: string): boolean;
  abstract isNodeHighlighted(n: string): boolean;

  isNodeExpanded(nd: qg.Ndata) {
    return !!nd.expanded;
  }

  abstract setNodeExpanded(nd: qg.Ndata): void;

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
}
