/* eslint-disable @typescript-eslint/no-empty-interface */
import * as d3 from 'd3';
import * as _ from 'lodash';

import * as qg from './graph';
import * as qs from './shape';
import * as qt from './types';

interface Data extends qt.Area {
  id: string;
  class: any;
  elem: any;
  style: string;
  label: qt.Label;
}

export interface Gdata {
  transition: any;
}
export interface Ndata extends Data, qs.Ndata {
  pad: qt.Pad;
  shape: any;
}
export interface Edata extends Data {
  points: qt.Point[];
  arrow: qt.Arrow;
}

export interface Graph<G extends Gdata, N extends Ndata, E extends Edata>
  extends qg.Graph<G, N, E> {}

export class Graph<G extends Gdata, N extends Ndata, E extends Edata> {
  createNodes(sel: qt.Sel, shapes = qs.shapes) {
    const ns = this.nodes().filter(n => !this.isSubgraph(n));
    const es = sel
      .selectAll('g.node')
      .data(ns, (n: any) => n)
      .classed('update', true);
    es.enter()
      .append('g')
      .attr('class', 'node')
      .style('opacity', 0);
    es.exit().remove();
    sel.selectAll('g.node').each((n: any, i: number, g: any) => {
      const nd = this.node(n)!;
      let e = d3.select(g[i]);
      const m = (e.classed('update') ? 'update ' : '') + 'node';
      applyClass(e, nd.class, m);
      e.select('g.label').remove();
      const l = e.append('g').attr('class', 'label');
      const el = addLabel(l, nd);
      let bb = _.pick(el.node()!.getBBox(), 'width', 'height');
      nd.elem = g[i];
      if (nd.id) e.attr('id', nd.id);
      if (nd.label.id) l.attr('id', nd.label.id);
      if (_.has(nd, 'width')) bb.width = nd.w;
      if (_.has(nd, 'height')) bb.height = nd.h;
      bb.width += nd.pad.left + nd.pad.right;
      bb.height += nd.pad.top + nd.pad.bottom;
      l.attr(
        'transform',
        'translate(' +
          (nd.pad.left - nd.pad.right) / 2 +
          ',' +
          (nd.pad.top - nd.pad.bottom) / 2 +
          ')'
      );
      e = d3.select(g[i]);
      e.select('.label-container').remove();
      const sh = shapes[nd.shape];
      e = sh(e, bb, nd).classed('label-container', true);
      qs.applyStyle(e, nd.style);
      bb = e.node().getBBox();
      nd.w = bb.width;
      nd.h = bb.height;
    });
    const s = es.exit ? es.exit() : es.selectAll(null);
    this.applyTransition(s)
      .style('opacity', 0)
      .remove();
    return es;
  }

  createClusters(sel: qt.Sel) {
    const ns = this.nodes().filter(n => this.isSubgraph(n));
    let es = sel.selectAll('g.cluster').data(ns, (n: any) => n);
    es.selectAll('*').remove();
    es.enter()
      .append('g')
      .attr('class', 'cluster')
      .attr('id', (n: any) => this.node(n)!.id)
      .style('opacity', 0);
    es = sel.selectAll('g.cluster');
    this.applyTransition(es).style('opacity', 1);
    es.each((n: string, i: number, g: any) => {
      const nd = this.node(n)!;
      const e = d3.select(g[i]);
      d3.select(g[i]).append('rect');
      const l = e.append('g').attr('class', 'label');
      addLabel(l, nd, nd.label.cluster);
    });
    es.selectAll('rect').each((n: any, i: number, g: any) => {
      const e = d3.select(g[i]);
      qs.applyStyle(e, this.node(n)!.style);
    });
    const s = es.exit ? es.exit() : es.selectAll(null);
    this.applyTransition(s)
      .style('opacity', 0)
      .remove();
    return es;
  }

  createPaths(sel: qt.Sel, arrows = qs.arrows) {
    const prevs: qt.Sel = sel
      .selectAll('g.edgePath')
      .data(this.links(), (l: any) => l.edge)
      .classed('update', true);
    const newPaths = this.enter(prevs);
    this.exit(prevs);
    const es = prevs.merge !== undefined ? prevs.merge(newPaths) : prevs;
    this.applyTransition(es).style('opacity', 1);
    es.each((n: string, i: number, g: any) => {
      const e = d3.select(g[i]);
      const ed = this.edge(n)!;
      ed.elem = g[i];
      if (ed.id) e.attr('id', ed.id);
      const m = (e.classed('update') ? 'update ' : '') + 'edgePath';
      applyClass(e, ed.class, m);
    });
    es.selectAll('path.path').each((n: any, i: number, g: any) => {
      const ed = this.edge(n)!;
      ed.arrow.id = _.uniqueId('arrowhead');
      const f = fragRef(location.href, ed.arrow.id);
      const e = d3
        .select(g[i])
        .attr('marker-end', () => 'url(' + f + ')')
        .style('fill', 'none');
      this.applyTransition(e).attr('d', (l: qg.Link<E>) => this.calcPoints(l));
      qs.applyStyle(e, ed.style);
    });
    es.selectAll('defs *').remove();
    es.selectAll('defs').each((n: any, i: number, g: any) => {
      const ed = this.edge(n)!;
      arrows[ed.arrow.idx](d3.select(g[i]), ed.arrow.id, ed, 'arrowhead');
    });
    return es;
  }

  calcPoints(l: qg.Link<E>) {
    const ed = this.edge(l)!;
    const ps = ed.points.slice(1, ed.points.length - 1);
    const n0 = this.node(l.nodes[0]);
    if (n0) ps.unshift(intersectNode(n0, ps[0]));
    const n1 = this.node(l.nodes[1]);
    if (n1) ps.push(intersectNode(n1, ps[ps.length - 1]));
    return createLine(ed, ps);
  }

  enter(sel: qt.Sel) {
    const es = sel
      .enter()
      .append('g')
      .attr('class', 'edgePath')
      .style('opacity', 0);
    es.append('path')
      .attr('class', 'path')
      .attr('d', (l: qg.Link<E>) => {
        const ed = this.edge(l)!;
        const src = this.node(l.nodes[0])!.elem;
        const ps = _.range(ed.points.length).map(() => getCoords(src));
        return createLine(ed, ps);
      });
    es.append('defs');
    return es;
  }

  exit(sel: qt.Sel) {
    const es = sel.exit();
    this.applyTransition(es)
      .style('opacity', 0)
      .remove();
  }

  createLabels(sel: qt.Sel) {
    let es: qt.Sel = sel
      .selectAll('g.edgeLabel')
      .data(this.links(), (l: any) => l.edge)
      .classed('update', true);
    es.exit().remove();
    es.enter()
      .append('g')
      .classed('edgeLabel', true)
      .style('opacity', 0);
    es = sel.selectAll('g.edgeLabel');
    es.each((n: string, i: number, g: any) => {
      const e = d3.select(g[i]);
      e.select('.label').remove();
      const ed = this.edge(n)!;
      const l = addLabel(e, ed).classed('label', true);
      if (ed.label.id) l.attr('id', ed.label.id);
      const a = l.node()?.getBBox();
      if (a) {
        if (!_.has(ed, 'width')) ed.w = a.width;
        if (!_.has(ed, 'height')) ed.h = a.height;
      }
    });
    const s = es.exit ? es.exit() : es.selectAll(null);
    this.applyTransition(s)
      .style('opacity', 0)
      .remove();
    return s;
  }

  applyTransition(s: qt.Sel) {
    const d = this.data;
    if (d) {
      const t = d.transition;
      if (_.isFunction(t)) return t(s);
    }
    return s;
  }
}

export function applyClass(s: qt.Sel, v: any, more: any) {
  if (v) s.attr('class', v).attr('class', more + ' ' + s.attr('class'));
}

function fragRef(url: string, frag: string) {
  return url.split('#')[0] + '#' + frag;
}

function intersectNode(nd: Ndata, p: qt.Point) {
  return nd.intersectCB(p);
}

function createLine(_: Edata, ps: qt.Point[]) {
  const line = d3
    .line<qt.Point>()
    .x(p => p.x)
    .y(p => p.y);
  // .curve();
  return line(ps);
}

function getCoords(e: any) {
  const a = e.getBBox();
  const m = e.ownerSVGElement
    .getScreenCTM()
    .inverse()
    .multiply(e.getScreenCTM())
    .translate(a.width / 2, a.height / 2);
  return {x: m.e, y: m.f} as qt.Point;
}

function addLabel(s: qt.Sel, d: Data, pos?: string) {
  const es = s.append('g');
  const t = d.label.txt;
  if (d.label.type === 'svg') {
    addSVG(es, d);
  } else if (typeof t !== 'string' || d.label.type === 'html') {
    addHtml(es, d);
  } else {
    addText(es, d);
  }
  const a = es.node()?.getBBox();
  if (a) {
    let y: number;
    switch (pos) {
      case 'top':
        y = -d.h / 2;
        break;
      case 'bottom':
        y = d.h / 2 - a.height;
        break;
      default:
        y = -a.height / 2;
    }
    es.attr('transform', 'translate(' + -a.width / 2 + ',' + y + ')');
  }
  return es;
}

function addSVG(s: qt.Sel, d: Data) {
  s.node().appendChild(d.label.txt);
  qs.applyStyle(s, d.label.style);
  return s;
}

function addHtml(s: qt.Sel, d: Data) {
  const es = s.append('foreignObject').attr('width', '100000');
  const div = es.append('xhtml:div') as qt.Sel;
  div.attr('xmlns', 'http://www.w3.org/1999/xhtml');
  const t = d.label.txt;
  switch (typeof t) {
    case 'function':
      div.insert(t);
      break;
    case 'object':
      div.insert(() => t);
      break;
    default:
      div.html(t);
  }
  qs.applyStyle(div, d.label.style);
  div.style('display', 'inline-block');
  div.style('white-space', 'nowrap');
  const a = div.node().getBoundingClientRect();
  es.attr('width', a.width).attr('height', a.height);
  return es;
}

function addText(s: qt.Sel, d: Data) {
  const es = s.append('text');
  const lines = processEscs(d.label.txt).split('\n');
  for (let i = 0; i < lines.length; i++) {
    es.append('tspan')
      .attr('xml:space', 'preserve')
      .attr('dy', '1em')
      .attr('x', '1')
      .text(lines[i]);
  }
  qs.applyStyle(es, d.label.style);
  return es;
}

function processEscs(t: string) {
  let r = '';
  let c: string;
  let esc = false;
  for (let i = 0; i < t.length; ++i) {
    c = t[i];
    if (esc) {
      switch (c) {
        case 'n':
          r += '\n';
          break;
        default:
          r += c;
      }
      esc = false;
    } else if (c === '\\') {
      esc = true;
    } else {
      r += c;
    }
  }
  return r;
}
