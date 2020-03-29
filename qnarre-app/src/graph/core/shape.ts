import * as qt from './types';
import * as qu from './utils';

export const shapes: {[k: string]: any} = {
  rect: rect,
  ellipse: ellipse,
  circle: circle,
  diamond: diamond
};

export interface Ndata extends qt.Rect, qt.Radius {
  intersectCB: (p: qt.Point) => qt.Point;
}

function rect(s: qt.Sel, a: qt.Area, d: Ndata) {
  const es = s
    .insert('rect', ':first-child')
    .attr('rx', d.rx)
    .attr('ry', d.ry)
    .attr('x', -a.w / 2)
    .attr('y', -a.h / 2)
    .attr('width', a.w)
    .attr('height', a.h);
  d.intersectCB = (p: qt.Point) => qu.intersectRect(d, p, false);
  return es;
}

function ellipse(s: qt.Sel, a: qt.Area, d: Ndata) {
  const r = {rx: a.w / 2, ry: a.h / 2} as qt.Radius;
  const es = s
    .insert('ellipse', ':first-child')
    .attr('x', -a.w / 2)
    .attr('y', -a.h / 2)
    .attr('rx', r.rx)
    .attr('ry', r.ry);
  d.intersectCB = (p: qt.Point) => qu.intersectEllipse(d, r, p);
  return es;
}

function circle(s: qt.Sel, a: qt.Area, d: Ndata) {
  const r = Math.max(a.w, a.h) / 2;
  const es = s
    .insert('circle', ':first-child')
    .attr('x', -a.w / 2)
    .attr('y', -a.h / 2)
    .attr('r', r);
  d.intersectCB = (p: qt.Point) => qu.intersectCircle(d, r, p);
  return es;
}

function diamond(s: qt.Sel, a: qt.Area, d: Ndata) {
  const w = (a.w * Math.SQRT2) / 2;
  const h = (a.h * Math.SQRT2) / 2;
  const ps = [
    {x: 0, y: -h},
    {x: -w, y: 0},
    {x: 0, y: h},
    {x: w, y: 0}
  ] as qt.Point[];
  const es = s
    .insert('polygon', ':first-child')
    .attr('points', ps.map(p => p.x + ',' + p.y).join(' '));
  d.intersectCB = (p: qt.Point) => qu.intersectPolygon(d, ps, p);
  return es;
}

export const arrows: {[k: string]: any} = {
  default: normal,
  normal: normal,
  vee: vee,
  undirected: undirected
};

function normal(s: qt.Sel, id: string, ed: any, n: string) {
  const m = s
    .append('marker')
    .attr('id', id)
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerUnits', 'strokeWidth')
    .attr('markerWidth', 8)
    .attr('markerHeight', 6)
    .attr('orient', 'auto');
  const p = m
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .style('stroke-width', 1)
    .style('stroke-dasharray', '1,0');
  applyStyle(p, ed[n + 'Style']);
  if (ed[n + 'Class']) p.attr('class', ed[n + 'Class']);
}

function vee(s: qt.Sel, id: string, ed: any, n: string) {
  const m = s
    .append('marker')
    .attr('id', id)
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerUnits', 'strokeWidth')
    .attr('markerWidth', 8)
    .attr('markerHeight', 6)
    .attr('orient', 'auto');
  const p = m
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 L 4 5 z')
    .style('stroke-width', 1)
    .style('stroke-dasharray', '1,0');
  applyStyle(p, ed[n + 'Style']);
  if (ed[n + 'Class']) p.attr('class', ed[n + 'Class']);
}

function undirected(s: qt.Sel, id: string, ed: any, n: string) {
  const m = s
    .append('marker')
    .attr('id', id)
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 9)
    .attr('refY', 5)
    .attr('markerUnits', 'strokeWidth')
    .attr('markerWidth', 8)
    .attr('markerHeight', 6)
    .attr('orient', 'auto');
  const p = m
    .append('path')
    .attr('d', 'M 0 5 L 10 5')
    .style('stroke-width', 1)
    .style('stroke-dasharray', '1,0');
  applyStyle(p, ed[n + 'Style']);
  if (ed[n + 'Class']) p.attr('class', ed[n + 'Class']);
}

export function applyStyle(s: qt.Sel, v: any) {
  if (v) s.attr('style', v);
}
