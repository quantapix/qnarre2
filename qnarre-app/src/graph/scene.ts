import * as _ from 'lodash';
import * as d3 from 'd3';

import * as ql from './layout';
import * as qn from './ndata';
import * as qt from './types';

import {PARAMS as PS} from './params';

export function selectOrCreate(
  s: qt.Selection,
  t: string,
  n?: string | string[],
  before = false
): qt.Selection {
  const c = selectChild(s, t, n);
  if (!c.empty()) return c;
  const e = document.createElementNS('http://www.w3.org/2000/svg', t);
  if (n instanceof Array) {
    for (let i = 0; i < n.length; i++) {
      e.classList.add(n[i]);
    }
  } else if (n) {
    e.classList.add(n);
  }
  if (before) {
    s.node().insertBefore(e, before);
  } else {
    s.node().appendChild(e);
  }
  return d3.select(e).datum(s.datum());
}

export function selectChild(
  s: qt.Selection,
  t: string,
  n?: string | string[]
): qt.Selection {
  const cs = s.node().childNodes;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c.tagName === t) {
      if (n instanceof Array) {
        let hasAll = true;
        for (let j = 0; j < n.length; j++) {
          hasAll = hasAll && c.classList.contains(n[j]);
        }
        if (hasAll) return d3.select(c);
      } else if (!n || c.classList.contains(n)) {
        return d3.select(c);
      }
    }
  }
  return d3.select(null);
}

export function positionRect(s: qt.Selection, r: qt.Rect) {
  s.transition()
    .attr('x', r.x - r.w / 2)
    .attr('y', r.y - r.h / 2)
    .attr('width', r.w)
    .attr('height', r.h);
}

export function positionTriangle(s: qt.Selection, r: qt.Rect) {
  const h = r.h / 2;
  const w = r.w / 2;
  const ps = [
    [r.x, r.y - h],
    [r.x + w, r.y + h],
    [r.x - w, r.y + h]
  ];
  s.transition().attr('points', ps.map(p => p.join(',')).join(' '));
}

export function positionEllipse(s: qt.Selection, r: qt.Rect) {
  s.transition()
    .attr('cx', r.x)
    .attr('cy', r.y)
    .attr('rx', r.w / 2)
    .attr('ry', r.h / 2);
}

export function positionButton(s: qt.Selection, nd: qn.Ndata) {
  const cx = ql.computeCXPositionOfNodeShape(nd);
  const w = nd.expanded ? nd.w : nd.box.w;
  const h = nd.expanded ? nd.h : nd.box.h;
  let x = cx + w / 2 - 6;
  let y = nd.y - h / 2 + 6;
  if (nd.type === qt.NodeType.LIST && !nd.expanded) {
    x += 10;
    y -= 2;
  }
  const t = 'translate(' + x + ',' + y + ')';
  s.selectAll('path')
    .transition()
    .attr('transform', t);
  s.select('circle')
    .transition()
    .attr('cx', x)
    .attr('cy', y)
    .attr('r', PS.nodeSize.meta.expandButtonRadius);
}

export function addGraphClickListener(group: any, elem: any) {
  d3.select(group).on('click', () => {
    elem.fire('graph-select');
  });
}

export function translate(s: qt.Selection, x: number, y: number) {
  if (s.attr('transform')) s = s.transition('position') as any;
  s.attr('transform', 'translate(' + x + ',' + y + ')');
}

export function fit(
  s: SVGElement,
  zoom: SVGGElement,
  d3zoom: any,
  cb: () => void
) {
  const r = s.getBoundingClientRect();
  let a: DOMRect;
  try {
    a = zoom.getBBox();
    if (a.width === 0) return;
  } catch (e) {
    return;
  }
  const scale = 0.9 * Math.min(r.width / a.width, r.height / a.height, 2);
  const ps = PS.graph;
  const t = d3.zoomIdentity.scale(scale).translate(ps.pad.left, ps.pad.top);
  d3.select(s)
    .transition()
    .duration(500)
    .call(d3zoom.transform, t)
    .on('end.fitted', () => {
      d3zoom.on('end.fitted', null);
      cb();
    });
}

export function panToNode(
  n: string,
  s: SVGSVGElement,
  _zoom: SVGGElement,
  d3zoom: any
) {
  const e = d3
    .select(s)
    .select(`[data-name="${n}"]`)
    .node() as SVGAElement;
  if (!e) {
    console.warn(`panToNode() failed for "${n}"`);
    return false;
  }
  const b = e.getBBox();
  const c = e.getScreenCTM();
  let tl = s.createSVGPoint();
  let br = s.createSVGPoint();
  tl.x = b.x;
  tl.y = b.y;
  br.x = b.x + b.width;
  br.y = b.y + b.height;
  tl = tl.matrixTransform(c ?? undefined);
  br = br.matrixTransform(c ?? undefined);
  function isOut(s: number, e: number, l: number, u: number) {
    return !(s > l && e < u);
  }
  const r = s.getBoundingClientRect();
  const h = r.left + r.width - MINIMAP_BOX_WIDTH;
  const v = r.top + r.height - MINIMAP_BOX_HEIGHT;
  if (isOut(tl.x, br.x, r.left, h) || isOut(tl.y, br.y, r.top, v)) {
    const x = (tl.x + br.x) / 2;
    const y = (tl.y + br.y) / 2;
    const dx = r.left + r.width / 2 - x;
    const dy = r.top + r.height / 2 - y;
    const t = d3.zoomTransform(s);
    d3.select(s)
      .transition()
      .duration(500)
      .call(d3zoom.translateBy, dx / t.k, dy / t.k);
    return true;
  }
  return false;
}

const MINIMAP_BOX_WIDTH = 320;
const MINIMAP_BOX_HEIGHT = 150;

export abstract class GraphElem extends HTMLElement {
  maxMetaNodeLabelLength?: number;
  maxMetaNodeLabelLengthLargeFont?: number;
  minMetaNodeLabelLengthFontSize?: number;
  maxMetaNodeLabelLengthFontSize?: number;
  templateIndex?: () => {};
  colorBy = '';
  abstract fire(eventName: string, daat: any): void;
  abstract addNodeGroup(name: string, selection: qt.Selection): void;
  abstract removeNodeGroup(name: string): void;
  abstract removeAnnotationGroup(n: string, nd: any): void;
  abstract isNodeExpanded(node: qn.Ndata): boolean;
  abstract isNodeHighlighted(nodeName: string): boolean;
  abstract isNodeSelected(nodeName: string): boolean;
  abstract getAnnotationGroupsIndex(name: string): qt.Selection;
  abstract getGraphSvgRoot(): SVGElement;
  abstract getContextMenu(): HTMLElement;
}
