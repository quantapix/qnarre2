import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qp from './params';
import * as qg from './graph';
import * as qd from './gdata';
import * as qs from './scene';
import * as qt from './types';

export class Edata implements qg.Edata {
  adjoining?: Emeta;
  sel?: qt.Sel;
  ref?: boolean;
  control?: boolean;
  structural?: boolean;
  faded?: boolean;
  points = [] as qt.Point[];
  marker = {start: '', end: ''};

  constructor(public name = '', public out?: string, public meta?: qg.Emeta) {}

  addEdge(sel: qt.Sel, e: qs.Elem, c = qt.Class.Edge.LINE) {
    if (this.structural) c += ' ' + qt.Class.Edge.STRUCTURAL;
    if (this.meta?.num.ref) c += ' ' + qt.Class.Edge.REF_EDGE;
    if (e.handle) c += ' ' + qt.Class.Edge.SELECTABLE;
    let w;
    const gd = e.gdata as qd.Gdata;
    if (gd?.widthFn) {
      w = gd.widthFn(this, c);
    } else {
      let s = 1;
      if (this.meta) s = this.meta.size;
      w = gd?.scales.width(s);
    }
    const id = 'path_' + this.name;
    const s = sel
      .append('path')
      .attr('id', id)
      .attr('class', c)
      .style('stroke-width', w + 'px');
    if (this.meta) {
      if (this.meta.num.ref) {
        const m = `reference-arrowhead-${arrowhead(w)}`;
        s.style('marker-start', `url(#${m})`);
        this.marker.start = m;
      } else {
        const m = `dataflow-arrowhead-${arrowhead(w)}`;
        s.style('marker-end', `url(#${m})`);
        this.marker.end = m;
      }
    } else return;
    const t = gd?.getLabelForEdge(this.meta);
    if (!t) return;
    sel
      .append('text')
      .append('textPath')
      .attr('xlink:href', '#' + id)
      .attr('startOffset', '50%')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central') // 'text-after-edge'
      .text(t);
  }

  position(comp: HTMLElement, group: HTMLElement) {
    d3.select<any, Edata>(group)
      .select<SVGPathElement>('path.' + qt.Class.Edge.LINE)
      .transition()
      .attrTween('d', function(d, i, a) {
        return d.interpolator(comp, this, i, a);
      });
  }

  stylize(sel: qt.Sel, _e: qs.Elem, _stylize?: boolean) {
    sel.classed('faded', !!this.faded);
    const m = this.meta;
    sel
      .select('path.' + qt.Class.Edge.LINE)
      .classed('control-dep', !!(m && !m.num.regular));
  }

  interpolator(
    comp: HTMLElement,
    renderPath: SVGPathElement,
    _i: number,
    a: SVGPathElement[] | ArrayLike<SVGPathElement>
  ) {
    const ae = this.adjoining;
    let ps = this.points;
    const {shadowRoot} = comp;
    if (this.marker.start) {
      ps = adjust(
        ps,
        d3.select(shadowRoot!.querySelector('#' + this.marker.start)),
        true
      );
    }
    if (this.marker.end) {
      ps = adjust(
        ps,
        d3.select(shadowRoot!.querySelector('#' + this.marker.end)),
        false
      );
    }
    if (!ae) return d3.interpolate(a, interpolate(ps)!);
    const ap = (ae.sel?.node() as HTMLElement).firstChild as SVGPathElement;
    const inbound = this.meta?.inbound;
    return (_: number) => {
      const p = ap
        .getPointAtLength(inbound ? ap.getTotalLength() : 0)
        .matrixTransform(ap.getCTM()!)
        .matrixTransform(renderPath.getCTM()!.inverse());
      const i = inbound ? 0 : ps.length - 1;
      ps[i].x = p.x;
      ps[i].y = p.y;
      return interpolate(ps)!;
    };
  }
}

export class Emeta extends Edata implements qg.Emeta {
  size = 0;
  weight = 1;
  links = [] as qg.Link[];
  num = {regular: 0, control: 0, ref: 0};

  constructor(public inbound?: boolean, m?: qg.Emeta, n = '', o?: string) {
    super(n, o, m);
  }

  addLink(l: qg.Link, h: qg.Hierarchy) {
    this.links.push(l);
    if (l.data?.control) {
      this.num.control += 1;
    } else {
      this.num.regular += 1;
    }
    if (l.data?.ref) this.num.ref += 1;
    this.size += h.size(l);
    h.maxEdgeSize = Math.max(h.maxEdgeSize, this.size);
    return this;
  }
}

export const interpolate = d3
  .line<{x: number; y: number}>()
  .curve(d3.curveBasis)
  .x(d => d.x)
  .y(d => d.y);

function adjust(ps: qt.Point[], marker: qt.Sel, isStart: boolean) {
  const line = d3
    .line<qt.Point>()
    .x(d => d.x)
    .y(d => d.y);
  const path = d3
    .select(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
    .attr('d', line(ps)!);
  const width = +marker.attr('markerWidth');
  const box = marker
    .attr('viewBox')
    .split(' ')
    .map(Number);
  const w = box[2] - box[0];
  const x = +marker.attr('refX');
  const n = path.node() as SVGPathElement;
  if (isStart) {
    const fraction = 1 - x / w;
    const l = width * fraction;
    const p = n.getPointAtLength(l);
    const i = idxAtLength(ps, l, line);
    ps[i - 1] = {x: p.x, y: p.y};
    return ps.slice(i - 1);
  } else {
    const fraction = 1 - x / w;
    const l = n.getTotalLength() - width * fraction;
    const p = n.getPointAtLength(l);
    const i = idxAtLength(ps, l, line);
    ps[i] = {x: p.x, y: p.y};
    return ps.slice(0, i + 1);
  }
}

function idxAtLength(ps: qt.Point[], length: number, line: d3.Line<qt.Point>) {
  const p = document.createElementNS(qp.SVG_SPACE, 'path');
  for (let i = 1; i < ps.length; i++) {
    p.setAttribute('d', line(ps.slice(0, i))!);
    if (p.getTotalLength() > length) return i - 1;
  }
  return ps.length - 1;
}

const arrowhead = d3
  .scaleQuantize<string>()
  .domain([qp.MIN_E_WIDTH, qp.MAX_E_WIDTH])
  .range(['small', 'medium', 'large', 'xlarge']);
