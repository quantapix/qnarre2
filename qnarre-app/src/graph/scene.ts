import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qn from './ndata';
import * as qg from './graph';
import * as qt from './types';
import * as qp from './params';

import {PARAMS as PS} from './params';

type S = qt.Selection;

export function selectCreate(
  s: S,
  t: string,
  n?: string | string[],
  prior = false
): S {
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
  if (prior) {
    s.node().insertBefore(e, prior);
  } else {
    s.node().appendChild(e);
  }
  return d3.select(e).datum(s.datum());
}

export function selectChild(s: S, t: string, n?: string | string[]): S {
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

export const interpolate = d3
  .line<{x: number; y: number}>()
  .curve(d3.curveBasis)
  .x(d => d.x)
  .y(d => d.y);

export function position(s: S, nd: qg.Ndata) {
  const g = selectChild(s, 'g', qt.Class.Node.SHAPE);
  const cx = nd.centerX();
  switch (nd.type) {
    case qt.NdataT.OPER: {
      const od = (nd as any) as qg.Noper;
      if (_.isNumber(od.index.in) || _.isNumber(od.index.out)) {
        const sc = selectChild(g, 'polygon');
        const r = new qt.Rect(nd.x, nd.y, nd.box.w, nd.box.h);
        positionTriangle(sc, r);
      } else {
        const sc = selectChild(g, 'ellipse');
        const r = new qt.Rect(cx, nd.y, nd.box.w, nd.box.h);
        positionEllipse(sc, r);
      }
      positionLabel(s, cx, nd.y, nd.label.off);
      break;
    }
    case qt.NdataT.META: {
      const sa = g.selectAll('rect');
      if (nd.expanded) {
        positionRect(sa, nd);
        subPosition(s, nd);
        positionLabel(s, cx, nd.y, -nd.h / 2 + nd.label.h / 2);
      } else {
        const r = new qt.Rect(cx, nd.y, nd.box.w, nd.box.h);
        positionRect(sa, r);
        positionLabel(s, cx, nd.y, 0);
      }
      break;
    }
    case qt.NdataT.LIST: {
      const sc = selectChild(g, 'use');
      if (nd.expanded) {
        positionRect(sc, nd);
        subPosition(s, nd);
        positionLabel(s, cx, nd.y, -nd.h / 2 + nd.label.h / 2);
      } else {
        const r = new qt.Rect(cx, nd.y, nd.box.w, nd.box.h);
        positionRect(sc, r);
        positionLabel(s, cx, nd.y, nd.label.off);
      }
      break;
    }
    case qt.NdataT.BRIDGE: {
      const sc = selectChild(g, 'rect');
      positionRect(sc, nd);
      break;
    }
    default: {
      throw Error('Invalid type: ' + nd.type);
    }
  }
}

function subPosition(s: qt.Selection, nd: qg.Ndata) {
  const x = nd.x - nd.w / 2.0 + nd.pad.left;
  const y = nd.y - nd.h / 2.0 + nd.pad.top;
  const sub = selectChild(s, 'g', qt.Class.Subscene.GROUP);
  translate(sub, x, y);
}

export function positionClus(s: S, nc: qg.Nclus) {
  const y = qg.isList(nc) ? 0 : PS.subscene.meta.labelHeight;
  translate(selectChild(s, 'g', qt.Class.Scene.CORE), 0, y);
  const ins = nc.isolated.in.length > 0;
  const outs = nc.isolated.out.length > 0;
  const libs = nc.isolated.lib.length > 0;
  const off = PS.subscene.meta.extractXOffset;
  let w = 0;
  if (ins) w += nc.areas.out.w;
  if (outs) w += nc.areas.out.w;
  if (ins) {
    let x = nc.box.w;
    if (w < qp.MIN_AUX_WIDTH) {
      x -= qp.MIN_AUX_WIDTH + nc.areas.in.w / 2;
    } else {
      x -= nc.areas.in.w / 2 - nc.areas.out.w - (outs ? off : 0);
    }
    x -= nc.areas.lib.w - (libs ? off : 0);
    translate(selectChild(s, 'g', qt.Class.Scene.INEXTRACT), x, y);
  }
  if (outs) {
    let x = nc.box.w;
    if (w < qp.MIN_AUX_WIDTH) {
      x -= qp.MIN_AUX_WIDTH + nc.areas.out.w / 2;
    } else {
      x -= nc.areas.out.w / 2;
    }
    x -= nc.areas.lib.w - (libs ? off : 0);
    translate(selectChild(s, 'g', qt.Class.Scene.OUTEXTRACT), x, y);
  }
  if (libs) {
    const x = nc.box.w - nc.areas.lib.w / 2;
    translate(selectChild(s, 'g', qt.Class.Scene.LIBRARY), x, y);
  }
}

export function positionAnno(s: S, a: qg.Anno, d: qg.Ndata, e: GraphElem) {
  const cx = d.centerX();
  if (a.nd && a.type !== qt.AnnoT.DOTS) a.nd.stylize(s, e, qt.Class.Anno.NODE);
  if (a.type === qt.AnnoT.SUMMARY) a.w += 10;
  s.select('text.' + qt.Class.Anno.LABEL)
    .transition()
    .attr('x', cx + a.x + (a.inbound ? -1 : 1) * (a.w / 2 + a.offset))
    .attr('y', d.y + a.y);
  s.select('use.summary')
    .transition()
    .attr('x', cx + a.x - 3)
    .attr('y', d.y + a.y - 6);
  positionEllipse(
    s.select('.' + qt.Class.Anno.NODE + ' ellipse'),
    new qt.Rect(cx + a.x, d.y + a.y, a.w, a.h)
  );
  positionRect(
    s.select('.' + qt.Class.Anno.NODE + ' rect'),
    new qt.Rect(cx + a.x, d.y + a.y, a.w, a.h)
  );
  positionRect(
    s.select('.' + qt.Class.Anno.NODE + ' use'),
    new qt.Rect(cx + a.x, d.y + a.y, a.w, a.h)
  );
  s.select('path.' + qt.Class.Anno.EDGE)
    .transition()
    .attr('d', (a: qg.Anno) => {
      const ps = a.points.map(p => new qt.Point(p.x + cx, p.y + d.y));
      return interpolate(ps);
    });
}

function positionRect(s: S, r: qt.Rect) {
  s.transition()
    .attr('x', r.x - r.w / 2)
    .attr('y', r.y - r.h / 2)
    .attr('width', r.w)
    .attr('height', r.h);
}

function positionTriangle(s: S, r: qt.Rect) {
  const h = r.h / 2;
  const w = r.w / 2;
  const ps = [
    [r.x, r.y - h],
    [r.x + w, r.y + h],
    [r.x - w, r.y + h]
  ];
  s.transition().attr('points', ps.map(p => p.join(',')).join(' '));
}

function positionEllipse(s: S, r: qt.Rect) {
  s.transition()
    .attr('cx', r.x)
    .attr('cy', r.y)
    .attr('rx', r.w / 2)
    .attr('ry', r.h / 2);
}

function positionLabel(s: S, x: number, y: number, off: number) {
  selectChild(s, 'text', qt.Class.Node.LABEL)
    .transition()
    .attr('x', x)
    .attr('y', y + off);
}

export function addButton(s: S, nd: qg.Ndata, e: GraphElem) {
  const g = selectCreate(s, 'g', qt.Class.Node.B_CONTAINER);
  selectCreate(g, 'circle', qt.Class.Node.B_CIRCLE);
  selectCreate(g, 'path', qt.Class.Node.E_BUTTON).attr(
    'd',
    'M0,-2.2 V2.2 M-2.2,0 H2.2'
  );
  selectCreate(g, 'path', qt.Class.Node.C_BUTTON).attr('d', 'M-2.2,0 H2.2');
  g.on('click', function(d) {
    d3.event.stopPropagation();
    e.fire('node-toggle-expand', {name: d.name});
  });
  positionButton(g, nd);
}

function positionButton(s: S, nd: qg.Ndata) {
  const cx = nd.centerX();
  const w = nd.expanded ? nd.w : nd.box.w;
  const h = nd.expanded ? nd.h : nd.box.h;
  let x = cx + w / 2 - 6;
  let y = nd.y - h / 2 + 6;
  if (nd.type === qt.NdataT.LIST && !nd.expanded) {
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

function translate(s: S, x: number, y: number) {
  if (s.attr('transform')) s = s.transition('position') as any;
  s.attr('transform', 'translate(' + x + ',' + y + ')');
}

export function addClickListener(s: SVGElement, elem: any) {
  d3.select(s).on('click', () => {
    elem.fire('graph-select');
  });
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
  abstract addNodeGroup(n: string, s: S): void;
  abstract addAnnoGroup(n: string, s: S): void;
  abstract removeNodeGroup(n: string): void;
  abstract removeAnnoGroup(a: qg.Anno, n: qg.Ndata, s: S): void;
  abstract isNodeExpanded(nd: qg.Ndata): boolean;
  abstract isNodeHighlighted(n: string): boolean;
  abstract isNodeSelected(n: string): boolean;
  abstract getAnnotationGroupsIndex(n: string): S;
  abstract getGraphSvgRoot(): SVGElement;
  abstract contextMenu(): HTMLElement;
}
