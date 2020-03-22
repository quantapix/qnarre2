import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qp from './params';
import * as qr from './render';
import * as qs from './scene';
import * as qt from './types';

const TENSOR_SHAPE_DELIM = '×';
const EDGE_WIDTH_SCALE_EXPONENT = 0.3;
const DOMAIN_EDGE_WIDTH_SCALE = [1, 5e6];

export const EDGE_WIDTH_SIZE_BASED_SCALE: d3.ScalePower<number, number> = d3
  .scalePow()
  .exponent(EDGE_WIDTH_SCALE_EXPONENT)
  .domain(DOMAIN_EDGE_WIDTH_SCALE)
  .range([qp.MIN_EDGE_WIDTH, qp.MAX_EDGE_WIDTH])
  .clamp(true);

const arrowheadMap = d3
  .scaleQuantize<string>()
  .domain([qp.MIN_EDGE_WIDTH, qp.MAX_EDGE_WIDTH])
  .range(['small', 'medium', 'large', 'xlarge']);

const CENTER_EDGE_LABEL_MIN_STROKE_WIDTH = 2.5;

export type EdgeData = {
  v: string;
  w: string;
  label: qr.MetaEdata;
};

export interface EdgeSelectionCallback {
  (d: EdgeData): void;
}

export function getEdgeKey(d: EdgeData) {
  return d.v + qp.EDGE_KEY_DELIM + d.w;
}

export function buildGroup(
  scene,
  g: qt.Graph<qr.Ndata, qr.MetaEdata>,
  gelem: qs.GraphElem
) {
  const elem = gelem as any;
  const es = _.reduce(
    g.edges(),
    (ds, e) => {
      ds.push({v: e.v, w: e.w, label: g.edge(e)});
      return ds;
    },
    [] as EdgeData[]
  );
  const container = qs.selectOrCreate(scene, 'g', qt.Class.Edge.CONTAINER);
  const gs = (container as any)
    .selectAll(() => this.childNodes)
    .data(es, getEdgeKey);
  gs.enter()
    .append('g')
    .attr('class', qt.Class.Edge.GROUP)
    .attr('data-edge', getEdgeKey)
    .each((d: EdgeData) => {
      const g = d3.select(this);
      d.label.edgeGroup = g;
      elem._edgeGroupIndex[getEdgeKey(d)] = g;
      if (elem.handle) {
        g.on('click', d => {
          (d3.event as Event).stopPropagation();
          elem.fire('edge-select', {
            edgeData: d,
            edgeGroup: g
          });
        });
      }
      appendEdge(g, d, elem);
    })
    .merge(gs)
    .each(() => position(elem, this))
    .each((d: EdgeData) => stylize(d3.select(this), d, elem));
  gs.exit()
    .each((d: EdgeData) => delete elem._edgeGroupIndex[getEdgeKey(d)])
    .remove();
  return gs;
}

export function getLabelForBaseEdge(e: qt.BaseEdge, gdata: qr.Gdata) {
  const n = gdata.getNodeByName(e.v) as qt.OpNode;
  if (!n.outShapes || _.isEmpty(n.outShapes)) return undefined;
  const shape = n.outShapes[e.outKey];
  if (!shape) return undefined;
  if (shape.length === 0) return 'scalar';
  return shape.map(s => (s === -1 ? '?' : s)).join(TENSOR_SHAPE_DELIM);
}

export function getLabelForEdge(e: qt.MetaEdge, gdata: qr.Gdata) {
  if (gdata.edgeLabelFunction) return gdata.edgeLabelFunction(e, gdata);
  const isMulti = e.bases.length > 1;
  return isMulti
    ? e.bases.length + ' tensors'
    : getLabelForBaseEdge(e.bases[0], gdata);
}

function getPathSegmentIndexAtLength(
  ps: qr.Point[],
  length: number,
  line: (ps: qr.Point[]) => string
) {
  const path = document.createElementNS(qp.SVG_NAMESPACE, 'path');
  for (let i = 1; i < ps.length; i++) {
    path.setAttribute('d', line(ps.slice(0, i)));
    if (path.getTotalLength() > length) return i - 1;
  }
  return ps.length - 1;
}

function adjustPathPointsForMarker(
  ps: qr.Point[],
  marker: qs.Selection,
  isStart: boolean
) {
  const line = d3
    .line<qr.Point>()
    .x(d => d.x)
    .y(d => d.y);
  const path = d3
    .select(document.createElementNS('http://www.w3.org/2000/svg', 'path'))
    .attr('d', line(ps));
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
    const i = getPathSegmentIndexAtLength(ps, l, line);
    ps[i - 1] = {x: p.x, y: p.y};
    return ps.slice(i - 1);
  } else {
    const fraction = 1 - x / w;
    const l = n.getTotalLength() - width * fraction;
    const p = n.getPointAtLength(l);
    const i = getPathSegmentIndexAtLength(ps, l, line);
    ps[i] = {x: p.x, y: p.y};
    return ps.slice(0, i + 1);
  }
}

export function appendEdge(
  edgeGroup,
  d: EdgeData,
  elem: {gdata: qr.Gdata; handle: Function},
  eClass?: string
) {
  eClass = eClass || qt.Class.Edge.LINE;
  if (d.label && d.label.structural) eClass += ' ' + qt.Class.Edge.STRUCTURAL;
  if (d.label && d.label.metaedge && d.label.metaedge.numRef)
    eClass += ' ' + qt.Class.Edge.REFERENCE_EDGE;
  if (elem.handle) eClass += ' ' + qt.Class.Edge.SELECTABLE;
  const id = 'path_' + getEdgeKey(d);
  let w;
  if (elem.gdata.edgeWidthFunction) {
    w = elem.gdata.edgeWidthFunction(d, eClass);
  } else {
    let s = 1;
    if (d.label && d.label.metaedge) s = d.label.metaedge.size;
    w = elem.gdata.edgeWidthSizedBasedScale(s);
  }
  const path = edgeGroup
    .append('path')
    .attr('id', id)
    .attr('class', eClass)
    .style('stroke-width', w + 'px');
  if (d.label && d.label.metaedge) {
    if (d.label.metaedge.numRef) {
      const m = `reference-arrowhead-${arrowheadMap(w)}`;
      path.style('marker-start', `url(#${m})`);
      d.label.startMarkerId = m;
    } else {
      const m = `dataflow-arrowhead-${arrowheadMap(w)}`;
      path.style('marker-end', `url(#${m})`);
      d.label.endMarkerId = m;
    }
  }
  if (!d.label || !d.label.metaedge) return;
  const t = getLabelForEdge(d.label.metaedge, elem.gdata);
  if (!t) return;
  const baseline =
    w > CENTER_EDGE_LABEL_MIN_STROKE_WIDTH ? 'central' : 'text-after-edge';
  edgeGroup
    .append('text')
    .append('textPath')
    .attr('xlink:href', '#' + id)
    .attr('startOffset', '50%')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .text(t);
}

export const interpolate = d3
  .line<{x: number; y: number}>()
  .curve(d3.curveBasis)
  .x(d => d.x)
  .y(d => d.y);

function getEdgePathInterpolator(
  comp: HTMLElement,
  renderPath: SVGPathElement,
  ed: EdgeData,
  i: number,
  a: SVGPathElement[]
) {
  const md = ed.label;
  const ae = md.adjoiningMetaEdge;
  let ps = md.points;
  const {shadowRoot} = comp;
  if (ed.label.startMarkerId) {
    ps = adjustPathPointsForMarker(
      ps,
      d3.select(shadowRoot!.querySelector('#' + ed.label.startMarkerId)),
      true
    );
  }
  if (ed.label.endMarkerId) {
    ps = adjustPathPointsForMarker(
      ps,
      d3.select(shadowRoot!.querySelector('#' + ed.label.endMarkerId)),
      false
    );
  }
  if (!ae) return d3.interpolate(a, interpolate(ps)!);
  const ap = (ae.edgeGroup?.node() as HTMLElement).firstChild as SVGPathElement;
  const inbound = md.metaedge?.inbound;
  return (_: any) => {
    const p = ap
      .getPointAtLength(inbound ? ap.getTotalLength() : 0)
      .matrixTransform(ap.getCTM()!)
      .matrixTransform(renderPath.getCTM()!.inverse());
    const i = inbound ? 0 : ps.length - 1;
    ps[i].x = p.x;
    ps[i].y = p.y;
    return interpolate(ps);
  };
}

function position(comp: HTMLElement, group: HTMLElement) {
  d3.select(group)
    .select('path.' + qt.Class.Edge.LINE)
    .transition()
    .attrTween('d', (d: EdgeData, i: number, a: SVGPathElement[]) => {
      return getEdgePathInterpolator(comp, this as SVGPathElement, d, i, a);
    });
}

function stylize(group, ed: EdgeData, _stylize: boolean) {
  group.classed('faded', ed.label.isFadedOut);
  const e = ed.label.metaedge;
  group
    .select('path.' + qt.Class.Edge.LINE)
    .classed('control-dep', e && !e.numRegular);
}
