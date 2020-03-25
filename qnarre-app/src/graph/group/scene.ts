import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qc from './cluster';
import * as qe from './edata';
import * as ql from './layout';
import * as qn from './ndata';
import * as qr from './gdata';
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
  const w = nd.expanded ? nd.w : nd.coreBox.w;
  const h = nd.expanded ? nd.h : nd.coreBox.h;
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
    .attr({cx: x, cy: y, r: PS.nodeSize.meta.expandButtonRadius});
}

export function expandUntilNodeIsShown(scene, gd: qr.Gdata, name: string) {
  const ns = name.split('/');
  const m = ns[ns.length - 1].match(/(.*):\w+/);
  if (m?.length === 2) ns[ns.length - 1] = m[1];
  let n = ns[0];
  let nd = gd.getNdataByName(n);
  for (let i = 1; i < ns.length; i++) {
    if (nd?.type === qt.NodeType.OPER) break;
    gd.buildSubhierarchy(n);
    nd!.expanded = true;
    scene.setNodeExpanded(nd);
    n += '/' + ns[i];
    nd = gd.getNdataByName(n);
  }
  return nd?.name;
}

export function addGraphClickListener(group, elem) {
  d3.select(group).on('click', () => {
    elem.fire('graph-select');
  });
}

export function translate(s: qt.Selection, x: number, y: number) {
  if (s.attr('transform')) s = s.transition('position');
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
  maxMetaNodeLabelLengthFontSize?: number;
  templateIndex?: () => {};
  colorBy = '';
  abstract fire(eventName: string, daat: any): void;
  abstract addNodeGroup(name: string, selection: qt.Selection): void;
  abstract removeNodeGroup(name: string): void;
  abstract removeAnnotationGroup(name: string): void;
  abstract isNodeExpanded(node: qn.Ndata): boolean;
  abstract isNodeHighlighted(nodeName: string): boolean;
  abstract isNodeSelected(nodeName: string): boolean;
  abstract getAnnotationGroupsIndex(name: string): qt.Selection;
  abstract getGraphSvgRoot(): SVGElement;
  abstract getContextMenu(): HTMLElement;
}

export function buildGroup(
  s: qt.Selection,
  gd: qc.Nclus,
  e: GraphElem,
  cg: string
) {
  cg = cg || qt.Class.Scene.GROUP;
  const empty = selectChild(s, 'g', cg).empty();
  const scene = selectOrCreate(s, 'g', cg);
  const sg = selectOrCreate(scene, 'g', qt.Class.Scene.CORE);
  const ds = _.reduce(
    gd.core.nodes(),
    (ds, n) => {
      const nd = gd.core.node(n);
      if (nd && !nd.excluded) ds.push(nd);
      return ds;
    },
    [] as qn.Ndata[]
  );
  if (gd.type === qt.NodeType.LIST) ds.reverse();
  qe.buildGroup(sg, gd.core, e);
  qn.buildGroup(sg, ds, e);
  if (gd.isolatedInExtract.length > 0) {
    const g = selectOrCreate(scene, 'g', qt.Class.Scene.INEXTRACT);
    qn.buildGroup(g, gd.isolatedInExtract, e);
  } else {
    selectChild(scene, 'g', qt.Class.Scene.INEXTRACT).remove();
  }
  if (gd.isolatedOutExtract.length > 0) {
    const g = selectOrCreate(scene, 'g', qt.Class.Scene.OUTEXTRACT);
    qn.buildGroup(g, gd.isolatedOutExtract, e);
  } else {
    selectChild(scene, 'g', qt.Class.Scene.OUTEXTRACT).remove();
  }
  if (gd.libfnsExtract.length > 0) {
    const g = selectOrCreate(scene, 'g', qt.Class.Scene.FUNCTION_LIBRARY);
    qn.buildGroup(g, gd.libfnsExtract, e);
  } else {
    selectChild(scene, 'g', qt.Class.Scene.FUNCTION_LIBRARY).remove();
  }
  position(scene, gd);
  if (empty) {
    scene
      .attr('opacity', 0)
      .transition()
      .attr('opacity', 1);
  }
  return scene;
}

function position(s: qt.Selection, cd: qc.Nclus) {
  const y = cd.type === qt.NodeType.LIST ? 0 : PS.subscene.meta.labelHeight;
  translate(selectChild(s, 'g', qt.Class.Scene.CORE), 0, y);
  const ins = cd.isolatedInExtract.length > 0;
  const outs = cd.isolatedOutExtract.length > 0;
  const libs = cd.libfnsExtract.length > 0;
  const off = PS.subscene.meta.extractXOffset;
  let w = 0;
  if (ins) w += cd.outExtractBox.w;
  if (outs) w += cd.outExtractBox.w;
  if (ins) {
    let x = cd.coreBox.w;
    if (w < ql.MIN_AUX_WIDTH) {
      x -= ql.MIN_AUX_WIDTH + cd.inExtractBox.w / 2;
    } else {
      x -= cd.inExtractBox.w / 2 - cd.outExtractBox.w - (outs ? off : 0);
    }
    x -= cd.libfnsBox.w - (libs ? off : 0);
    translate(selectChild(s, 'g', qt.Class.Scene.INEXTRACT), x, y);
  }
  if (outs) {
    let x = cd.coreBox.w;
    if (w < ql.MIN_AUX_WIDTH) {
      x -= ql.MIN_AUX_WIDTH + cd.outExtractBox.w / 2;
    } else {
      x -= cd.outExtractBox.w / 2;
    }
    x -= cd.libfnsBox.w - (libs ? off : 0);
    translate(selectChild(s, 'g', qt.Class.Scene.OUTEXTRACT), x, y);
  }
  if (libs) {
    const x = cd.coreBox.w - cd.libfnsBox.w / 2;
    translate(selectChild(s, 'g', qt.Class.Scene.FUNCTION_LIBRARY), x, y);
  }
}
