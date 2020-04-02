import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qg from './graph';
import * as qp from './params';
import * as qt from './types';

import {PARAMS as PS} from './params';

export {Elem} from './elem';

export function selectCreate(
  sel: qt.Sel,
  t: string,
  n?: string | string[],
  prior = false
): qt.Sel {
  const c = selectChild(sel, t, n);
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
    sel.node().insertBefore(e, prior);
  } else {
    sel.node().appendChild(e);
  }
  return d3.select(e).datum(sel.datum());
}

export function selectChild(
  sel: qt.Sel,
  t: string,
  n?: string | string[]
): qt.Sel {
  const cs = sel.node().childNodes;
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

export namespace position {
  export function rect(sel: qt.Sel, r: qt.Rect) {
    sel
      .transition()
      .attr('x', r.x - r.w / 2)
      .attr('y', r.y - r.h / 2)
      .attr('width', r.w)
      .attr('height', r.h);
  }

  export function triangle(sel: qt.Sel, r: qt.Rect) {
    const h = r.h / 2;
    const w = r.w / 2;
    const ps = [
      [r.x, r.y - h],
      [r.x + w, r.y + h],
      [r.x - w, r.y + h]
    ];
    sel.transition().attr('points', ps.map(p => p.join(',')).join(' '));
  }

  export function ellipse(sel: qt.Sel, r: qt.Rect) {
    sel
      .transition()
      .attr('cx', r.x)
      .attr('cy', r.y)
      .attr('rx', r.w / 2)
      .attr('ry', r.h / 2);
  }

  export function label(sel: qt.Sel, x: number, y: number, off: number) {
    selectChild(sel, 'text', qt.Class.Node.LABEL)
      .transition()
      .attr('x', x)
      .attr('y', y + off);
  }

  export function button(sel: qt.Sel, nd: qg.Ndata) {
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
    sel
      .selectAll('path')
      .transition()
      .attr('transform', t);
    sel
      .select('circle')
      .transition()
      .attr('cx', x)
      .attr('cy', y)
      .attr('r', PS.nodeSize.meta.expandButtonRadius);
  }

  export function clus(sel: qt.Sel, nc: qg.Nclus) {
    const y = qg.isList(nc) ? 0 : PS.subscene.meta.labelHeight;
    translate(selectChild(sel, 'g', qt.Class.Scene.CORE), 0, y);
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
      translate(selectChild(sel, 'g', qt.Class.Scene.IN), x, y);
    }
    if (outs) {
      let x = nc.box.w;
      if (w < qp.MIN_AUX_WIDTH) {
        x -= qp.MIN_AUX_WIDTH + nc.areas.out.w / 2;
      } else {
        x -= nc.areas.out.w / 2;
      }
      x -= nc.areas.lib.w - (libs ? off : 0);
      translate(selectChild(sel, 'g', qt.Class.Scene.OUT), x, y);
    }
    if (libs) {
      const x = nc.box.w - nc.areas.lib.w / 2;
      translate(selectChild(sel, 'g', qt.Class.Scene.LIB), x, y);
    }
  }
}

export function translate(sel: qt.Sel, x: number, y: number) {
  if (sel.attr('transform')) sel = sel.transition('position') as any;
  sel.attr('transform', 'translate(' + x + ',' + y + ')');
}

export function addClickListener(s: SVGElement, elem: any) {
  d3.select(s).on('click', () => {
    elem.fire('graph-select');
  });
}

export function enforceWidth(sel: qt.Sel, nd?: qg.Ndata) {
  const e = sel.node() as SVGTextElement;
  let l = e.getComputedTextLength();
  let max: number | undefined;
  switch (nd?.type) {
    case qt.NdataT.META:
      if (!nd.expanded) max = PS.nodeSize.meta.maxLabelWidth;
      break;
    case qt.NdataT.OPER:
      max = PS.nodeSize.oper.maxLabelWidth;
      break;
    case undefined:
      max = PS.annotations.maxLabelWidth;
      break;
    default:
      break;
  }
  if (!max || l <= max) return;
  let i = 1;
  while (e.getSubStringLength(0, i) < max) {
    i++;
  }
  let t = e.textContent?.substr(0, i);
  do {
    t = t?.substr(0, t.length - 1);
    e.textContent = t + '...';
    l = e.getComputedTextLength();
  } while (l > max && t && t.length > 0);
  return sel.append('title').text(e.textContent);
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

export function panTo(
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
    console.warn(`panTo() failed for "${n}"`);
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
  const h = r.left + r.width - PS.minimap.boxWidth;
  const v = r.top + r.height - PS.minimap.boxHeight;
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
