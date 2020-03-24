import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qe from './edge';
import * as ql from './layout';
import * as qn from './node';
import * as qp from './params';
import * as qr from './render';
import * as qt from './types';

const MINIMAP_BOX_WIDTH = 320;
const MINIMAP_BOX_HEIGHT = 150;

export type Selection = d3.Selection<any, any, any, any>;

export abstract class GraphElem extends HTMLElement {
  maxMetaNodeLabelLength?: number;
  maxMetaNodeLabelLengthLargeFont?: number;
  maxMetaNodeLabelLengthFontSize?: number;
  templateIndex?: () => {};
  colorBy = '';
  abstract fire(eventName: string, daat: any): void;
  abstract addNodeGroup(name: string, selection: Selection): void;
  abstract removeNodeGroup(name: string): void;
  abstract removeAnnotationGroup(name: string): void;
  abstract isNodeExpanded(node: qr.Ndata): boolean;
  abstract isNodeHighlighted(nodeName: string): boolean;
  abstract isNodeSelected(nodeName: string): boolean;
  abstract getAnnotationGroupsIndex(name: string): Selection;
  abstract getGraphSvgRoot(): SVGElement;
  abstract getContextMenu(): HTMLElement;
}

export function fit(svg: SVGElement, zoomG, d3zoom, callback: () => void) {
  const r = svg.getBoundingClientRect();
  let size;
  try {
    size = zoomG.getBBox();
    if (size.width === 0) return;
  } catch (e) {
    return;
  }
  const scale = 0.9 * Math.min(r.width / size.width, r.height / size.height, 2);
  const ps = qp.PARAMS.graph;
  const t = d3.zoomIdentity
    .scale(scale)
    .translate(ps.padding.paddingLeft, ps.padding.paddingTop);
  d3.select(svg)
    .transition()
    .duration(500)
    .call(d3zoom.transform, t)
    .on('end.fitted', () => {
      d3zoom.on('end.fitted', null);
      callback();
    });
}

export function panToNode(name: string, svg: SVGSVGElement, _zoomG, d3zoom) {
  const node = d3
    .select(svg)
    .select(`[data-name="${name}"]`)
    .node() as SVGAElement;
  if (!node) {
    console.warn(`panToNode() failed for "${name}"`);
    return false;
  }
  const box = node.getBBox();
  const ctm = node.getScreenCTM();
  let tl = svg.createSVGPoint();
  let br = svg.createSVGPoint();
  tl.x = box.x;
  tl.y = box.y;
  br.x = box.x + box.width;
  br.y = box.y + box.height;
  tl = tl.matrixTransform(ctm ?? undefined);
  br = br.matrixTransform(ctm ?? undefined);
  function isOutside(s: number, e: number, lower: number, upper: number) {
    return !(s > lower && e < upper);
  }
  const r = svg.getBoundingClientRect();
  const hBound = r.left + r.width - MINIMAP_BOX_WIDTH;
  const vBound = r.top + r.height - MINIMAP_BOX_HEIGHT;
  if (
    isOutside(tl.x, br.x, r.left, hBound) ||
    isOutside(tl.y, br.y, r.top, vBound)
  ) {
    const cX = (tl.x + br.x) / 2;
    const cY = (tl.y + br.y) / 2;
    const dx = r.left + r.width / 2 - cX;
    const dy = r.top + r.height / 2 - cY;
    const t = d3.zoomTransform(svg);
    d3.select(svg)
      .transition()
      .duration(500)
      .call(d3zoom.translateBy, dx / t.k, dy / t.k);
    return true;
  }
  return false;
}

export function selectOrCreate(
  cont,
  tag: string,
  name?: string | string[],
  before = false
): Selection {
  const c = selectChild(cont, tag, name);
  if (!c.empty()) return c;
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (name instanceof Array) {
    for (let i = 0; i < name.length; i++) {
      e.classList.add(name[i]);
    }
  } else if (name) {
    e.classList.add(name);
  }
  if (before) {
    cont.node().insertBefore(e, before);
  } else {
    cont.node().appendChild(e);
  }
  return d3.select(e).datum(cont.datum());
}

export function selectChild(
  cont,
  tag: string,
  name?: string | string[]
): Selection {
  const cs = cont.node().childNodes;
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c.tagName === tag) {
      if (name instanceof Array) {
        let hasAll = true;
        for (let j = 0; j < name.length; j++) {
          hasAll = hasAll && c.classList.contains(name[j]);
        }
        if (hasAll) return d3.select(c);
      } else if (!name || c.classList.contains(name)) {
        return d3.select(c);
      }
    }
  }
  return d3.select(null);
}

export function buildGroup(
  cont,
  ndata: qr.GroupNdata,
  elem: GraphElem,
  sClass: string
): Selection {
  sClass = sClass || qt.Class.Scene.GROUP;
  const isNew = selectChild(cont, 'g', sClass).empty();
  const scene = selectOrCreate(cont, 'g', sClass);
  const g = selectOrCreate(scene, 'g', qt.Class.Scene.CORE);
  const cores = _.reduce(
    ndata.coreGraph.nodes(),
    (ds, n) => {
      const d = ndata.coreGraph.node(n);
      if (!d.excluded) ds.push(d);
      return ds;
    },
    [] as qr.Ndata[]
  );
  if (ndata.node.type === qt.NodeType.LIST) cores.reverse();
  qe.buildGroup(g, ndata.coreGraph, elem);
  qn.buildGroup(g, cores, elem);
  if (ndata.isolatedInExtract.length > 0) {
    const g = selectOrCreate(scene, 'g', qt.Class.Scene.INEXTRACT);
    qn.buildGroup(g, ndata.isolatedInExtract, elem);
  } else {
    selectChild(scene, 'g', qt.Class.Scene.INEXTRACT).remove();
  }
  if (ndata.isolatedOutExtract.length > 0) {
    const g = selectOrCreate(scene, 'g', qt.Class.Scene.OUTEXTRACT);
    qn.buildGroup(g, ndata.isolatedOutExtract, elem);
  } else {
    selectChild(scene, 'g', qt.Class.Scene.OUTEXTRACT).remove();
  }
  if (ndata.libfnsExtract.length > 0) {
    const g = selectOrCreate(scene, 'g', qt.Class.Scene.FUNCTION_LIBRARY);
    qn.buildGroup(g, ndata.libfnsExtract, elem);
  } else {
    selectChild(scene, 'g', qt.Class.Scene.FUNCTION_LIBRARY).remove();
  }
  position(scene, ndata);
  if (isNew) {
    scene
      .attr('opacity', 0)
      .transition()
      .attr('opacity', 1);
  }
  return scene;
}

function position(scene, ndata: qr.GroupNdata) {
  const y =
    ndata.node.type === qt.NodeType.LIST
      ? 0
      : qp.PARAMS.subscene.meta.labelHeight;
  translate(selectChild(scene, 'g', qt.Class.Scene.CORE), 0, y);
  const hasIn = ndata.isolatedInExtract.length > 0;
  const hasOut = ndata.isolatedOutExtract.length > 0;
  const hasLib = ndata.libfnsExtract.length > 0;
  const offset = qp.PARAMS.subscene.meta.extractXOffset;
  let w = 0;
  if (hasIn) w += ndata.outExtractBox.width;
  if (hasOut) w += ndata.outExtractBox.width;
  if (hasIn) {
    let x = ndata.coreBox.width;
    if (w < ql.MIN_AUX_WIDTH) {
      x -= ql.MIN_AUX_WIDTH + ndata.inExtractBox.width / 2;
    } else {
      x -=
        ndata.inExtractBox.width / 2 -
        ndata.outExtractBox.width -
        (hasOut ? offset : 0);
    }
    x -= ndata.libfnsBox.width - (hasLib ? offset : 0);
    translate(selectChild(scene, 'g', qt.Class.Scene.INEXTRACT), x, y);
  }
  if (hasOut) {
    let x = ndata.coreBox.width;
    if (w < ql.MIN_AUX_WIDTH) {
      x -= ql.MIN_AUX_WIDTH + ndata.outExtractBox.width / 2;
    } else {
      x -= ndata.outExtractBox.width / 2;
    }
    x -= ndata.libfnsBox.width - (hasLib ? offset : 0);
    translate(selectChild(scene, 'g', qt.Class.Scene.OUTEXTRACT), x, y);
  }
  if (hasLib) {
    const x = ndata.coreBox.width - ndata.libfnsBox.width / 2;
    translate(selectChild(scene, 'g', qt.Class.Scene.FUNCTION_LIBRARY), x, y);
  }
}

export function addGraphClickListener(group, elem) {
  d3.select(group).on('click', () => {
    elem.fire('graph-select');
  });
}

export function translate(sel, x: number, y: number) {
  if (sel.attr('transform')) sel = sel.transition('position');
  sel.attr('transform', 'translate(' + x + ',' + y + ')');
}

export function positionRect(
  rect,
  cx: number,
  cy: number,
  width: number,
  height: number
) {
  rect
    .transition()
    .attr('x', cx - width / 2)
    .attr('y', cy - height / 2)
    .attr('width', width)
    .attr('height', height);
}

export function positionTriangle(
  polygon,
  cx: number,
  cy: number,
  width: number,
  height: number
) {
  const h = height / 2;
  const w = width / 2;
  const ps = [
    [cx, cy - h],
    [cx + w, cy + h],
    [cx - w, cy + h]
  ];
  polygon.transition().attr('points', ps.map(p => p.join(',')).join(' '));
}

export function positionButton(button, ndata: qr.Ndata) {
  const cx = ql.computeCXPositionOfNodeShape(ndata);
  const w = ndata.expanded ? ndata.width : ndata.coreBox.width;
  const h = ndata.expanded ? ndata.height : ndata.coreBox.height;
  let x = cx + w / 2 - 6;
  let y = ndata.y - h / 2 + 6;
  if (ndata.node.type === qt.NodeType.LIST && !ndata.expanded) {
    x += 10;
    y -= 2;
  }
  const t = 'translate(' + x + ',' + y + ')';
  button
    .selectAll('path')
    .transition()
    .attr('transform', t);
  button
    .select('circle')
    .transition()
    .attr({cx: x, cy: y, r: qp.PARAMS.nodeSize.meta.expandButtonRadius});
}

export function positionEllipse(
  ellipse,
  cx: number,
  cy: number,
  width: number,
  height: number
) {
  ellipse
    .transition()
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('rx', width / 2)
    .attr('ry', height / 2);
}

export function expandUntilNodeIsShown(scene, gdata: qr.Gdata, name: string) {
  const ns = name.split('/');
  const m = ns[ns.length - 1].match(/(.*):\w+/);
  if (m?.length === 2) ns[ns.length - 1] = m[1];
  let n = ns[0];
  let ndata = gdata.getNdataByName(n);
  for (let i = 1; i < ns.length; i++) {
    if (ndata?.node.type === qt.NodeType.OP) break;
    gdata.buildSubhierarchy(n);
    ndata!.expanded = true;
    scene.setNodeExpanded(ndata);
    n += '/' + ns[i];
    ndata = gdata.getNdataByName(n);
  }
  return ndata?.node.name;
}

interface HealthStats {
  min: number;
  max: number;
  mean: number;
  stddev: number;
}

export function addHealth(
  elem: SVGElement,
  health: qt.Health,
  ndata: qr.Ndata,
  id: number,
  width = 60,
  height = 10,
  y = 0,
  x?: number
) {
  d3.select(elem.parent as any)
    .selectAll('.health-pill')
    .remove();
  if (!health) return;
  const d = health.value;
  const es = d.slice(2, 8);
  const nan = es[0];
  const negInf = es[1];
  const posInf = es[5];
  const total = d[1];
  const stats: HealthStats = {
    min: d[8],
    max: d[9],
    mean: d[10],
    stddev: Math.sqrt(d[11])
  };
  if (ndata && ndata.node.type === qt.NodeType.OP) {
    width /= 2;
    height /= 2;
  }
  const group = document.createElementNS(qp.SVG_NAMESPACE, 'g');
  group.classList.add('health-pill');
  const defs = document.createElementNS(qp.SVG_NAMESPACE, 'defs');
  group.appendChild(defs);
  const grad = document.createElementNS(qp.SVG_NAMESPACE, 'linearGradient');
  const gradId = 'health-pill-gradient-' + id;
  grad.setAttribute('id', gradId);
  let count = 0;
  let offset = '0%';
  for (let i = 0; i < es.length; i++) {
    if (!es[i]) continue;
    count += es[i];
    const s0 = document.createElementNS(qp.SVG_NAMESPACE, 'stop');
    s0.setAttribute('offset', offset);
    s0.setAttribute('stop-color', qp.healthEntries[i].background_color);
    grad.appendChild(s0);
    const s1 = document.createElementNS(qp.SVG_NAMESPACE, 'stop');
    const percent = (count * 100) / total + '%';
    s1.setAttribute('offset', percent);
    s1.setAttribute('stop-color', qp.healthEntries[i].background_color);
    grad.appendChild(s1);
    offset = percent;
  }
  defs.appendChild(grad);
  const rect = document.createElementNS(qp.SVG_NAMESPACE, 'rect');
  rect.setAttribute('fill', 'url(#' + gradId + ')');
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('y', String(y));
  group.appendChild(rect);
  const title = document.createElementNS(qp.SVG_NAMESPACE, 'title');
  title.textContent = getHealthText(health, total, es, stats);
  group.appendChild(title);
  let round = false;
  if (ndata != null) {
    const px = ndata.x - width / 2;
    let py = ndata.y - height - ndata.height / 2 - 2;
    if (ndata.labelOffset < 0) py += ndata.labelOffset;
    group.setAttribute('transform', 'translate(' + px + ', ' + py + ')');
    if (es[2] || es[3] || es[4]) {
      const n = ndata.node as qt.Noper;
      const a = n.attr;
      if (a && a.length) {
        for (let i = 0; i < a.length; i++) {
          if (a[i].key === 'T') {
            const o = a[i].value['type'];
            round = o && /^DT_(BOOL|INT|UINT)/.test(o);
            break;
          }
        }
      }
    }
  }
  const svg = document.createElementNS(qp.SVG_NAMESPACE, 'text');
  if (Number.isFinite(stats.min) && Number.isFinite(stats.max)) {
    const min = renderHealthStat(stats.min, round);
    const max = renderHealthStat(stats.max, round);
    if (total > 1) {
      svg.textContent = min + ' ~ ' + max;
    } else {
      svg.textContent = min;
    }
    if (nan > 0 || negInf > 0 || posInf > 0) {
      svg.textContent += ' (';
      const bad: string[] = [];
      if (nan > 0) bad.push(`NaN×${nan}`);
      if (negInf > 0) bad.push(`-∞×${negInf}`);
      if (posInf > 0) bad.push(`+∞×${posInf}`);
      svg.textContent += bad.join('; ') + ')';
    }
  } else {
    svg.textContent = '(No finite elements)';
  }
  svg.classList.add('health-pill-stats');
  if (x === undefined) x = width / 2;
  svg.setAttribute('x', String(x));
  svg.setAttribute('y', String(y - 2));
  group.appendChild(svg);
  // Polymer.dom(elem.parent).appendChild(group);
}

export function addAllHealths(
  root: SVGElement,
  dict: qt.Dict<qt.Health[]>,
  idx: number
) {
  if (!dict) return;
  let i = 1;
  const r = d3.select(root);
  r.selectAll('g.nodeshape').each(d => {
    const ndata = d as qr.Ndata;
    const hs = dict[ndata.node.name];
    const h = hs ? hs[idx] : undefined;
    if (h) addHealth(this as SVGElement, h, ndata, i++);
  });
}

export function renderHealthStat(stat: number, round: boolean) {
  if (round) return stat.toFixed(0);
  if (Math.abs(stat) >= 1) return stat.toFixed(1);
  return stat.toExponential(1);
}

function getHealthText(
  h: qt.Health,
  total: number,
  es: number[],
  stats: HealthStats
) {
  let t = 'Device: ' + h.device_name + '\n';
  t += 'dtype: ' + h.dtype + '\n';
  let shape = '(scalar)';
  if (h.shape.length > 0) shape = '(' + h.shape.join(',') + ')';
  t += '\nshape: ' + shape + '\n\n';
  t += '#(elements): ' + total + '\n';
  const ns = [] as string[];
  for (let i = 0; i < es.length; i++) {
    if (es[i] > 0) ns.push('#(' + qp.healthEntries[i].label + '): ' + es[i]);
  }
  t += ns.join(', ') + '\n\n';
  if (stats.max >= stats.min) {
    t += 'min: ' + stats.min + ', max: ' + stats.max + '\n';
    t += 'mean: ' + stats.mean + ', stddev: ' + stats.stddev;
  }
  return t;
}
