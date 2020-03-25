import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qe from './edata';
import * as ql from './layout';
import * as qm from '../../elems/graph/contextmenu';
import * as qn from './ndata';
import * as qr from './gdata';
import * as qs from './scene';
import * as qt from './types';

export class Anno {
  node: qt.Node;
  ndata: Ndata;
  edata?: MetaEdata;
  type: qt.AnnoType;
  dx = 0;
  dy = 0;
  width = 0;
  height = 0;
  v?: string;
  w?: string;
  isIn: boolean;
  labelOffset = 0;
  points = [] as {dx: number; dy: number}[];

  constructor(
    node: qt.Node,
    ndata: Ndata,
    edata: MetaEdata | undefined,
    type: qt.AnnoType,
    isIn: boolean
  ) {
    this.node = node;
    this.ndata = ndata;
    this.edata = edata;
    this.type = type;
    if (edata && edata.metaedge) {
      this.v = edata.metaedge.v;
      this.w = edata.metaedge.w;
    }
    this.isIn = isIn;
  }
}

export class AnnoList {
  list: Anno[];
  names: qt.Dict<boolean>;

  constructor() {
    this.list = [];
    this.names = {};
  }
  push(a: Anno) {
    if (a.node.name in this.names) return;
    this.names[a.node.name] = true;
    if (this.list.length < PARAMS.maxAnnotations) {
      this.list.push(a);
      return;
    }
    const type = qt.AnnoType.DOTS;
    const last = this.list[this.list.length - 1];
    if (last.type === type) {
      const e = last.node as qt.Ndots;
      e.setCountMore(++e.countMore);
      return;
    }
    const e = new qg.Ndots(1);
    this.list.push(new Anno(e, new Ndata(e), undefined, type, a.isIn));
  }
}

export function buildGroup(cont, annos: AnnoList, d: qr.Ndata, elem) {
  const gs = cont
    .selectAll(() => this.childNodes)
    .data(annos.list, d => d.node.name);
  gs.enter()
    .append('g')
    .attr('data-name', (a: Anno) => a.node.name)
    .each((a: Anno) => {
      const g = d3.select(this);
      elem.addAnnoGroup(a, d, g);
      let t = qt.Class.Anno.EDGE;
      const me = a.edata && a.edata.metaedge;
      if (me && !me.numRegular) t += ' ' + qt.Class.Anno.CONTROL_EDGE;
      if (me && me.numRef) t += ' ' + qt.Class.Edge.REF_LINE;
      qe.appendEdge(g, a, elem, t);
      if (a.type !== qt.AnnoType.DOTS) {
        addAnnoLabelFromNode(g, a);
        buildShape(g, a);
      } else {
        addAnnoLabel(g, a.node.name, a, qt.Class.Anno.DOTS);
      }
    })
    .merge(gs)
    .attr('class', (a: Anno) => {
      return (
        qt.Class.Anno.GROUP +
        ' ' +
        AnnoToClassName(a.type) +
        ' ' +
        qn.nodeClass(a)
      );
    })
    .each((a: Anno) => {
      const g = d3.select(this);
      update(g, d, a, elem);
      if (a.type !== qt.AnnoType.DOTS) addInteraction(g, d, a, elem);
    });
  gs.exit()
    .each((a: Anno) => {
      const g = d3.select(this);
      elem.removeAnnoGroup(a, d, g);
    })
    .remove();
  return gs;
}

function annotationToClassName(t: qt.AnnoType) {
  return (qt.AnnoType[t] || '').toLowerCase() || null;
}

function buildShape(group, a: Anno) {
  if (a.type === qt.AnnoType.SUMMARY) {
    const s = qs.selectOrCreate(group, 'use');
    s.attr('class', 'summary')
      .attr('xlink:href', '#summary-icon')
      .attr('cursor', 'pointer');
  } else {
    const s = qn.buildShape(group, a, qt.Class.Anno.NODE);
    qs.selectOrCreate(s, 'title').text(a.node.name);
  }
}

function addAnnotationLabelFromNode(group, a: Anno) {
  const path = a.node.name.split('/');
  const t = path[path.length - 1];
  return addAnnoLabel(group, t, a, null);
}

function addAnnoLabel(group, label: string, a: Anno, more) {
  let ns = qt.Class.Anno.LABEL;
  if (more) ns += ' ' + more;
  const t = group
    .append('text')
    .attr('class', ns)
    .attr('dy', '.35em')
    .attr('text-anchor', a.isIn ? 'end' : 'start')
    .text(label);
  return qn.enforceLabelWidth(t, -1);
}

function addInteraction(sel, d: qr.Ndata, anno: Anno, elem) {
  sel
    .on('mouseover', (a: Anno) => {
      elem.fire('annotation-highlight', {
        name: a.node.name,
        hostName: d.node.name
      });
    })
    .on('mouseout', (a: Anno) => {
      elem.fire('annotation-unhighlight', {
        name: a.node.name,
        hostName: d.node.name
      });
    })
    .on('click', (a: Anno) => {
      (d3.event as Event).stopPropagation();
      elem.fire('annotation-select', {
        name: a.node.name,
        hostName: d.node.name
      });
    });
  if (anno.type !== qt.AnnoType.SUMMARY && anno.type !== qt.AnnoType.CONSTANT) {
    sel.on('contextmenu', qm.getMenu(elem, qn.getContextMenu(anno.node, elem)));
  }
}

function update(group, d: qr.Ndata, a: Anno, elem) {
  const cx = ql.computeCXPositionOfNodeShape(d);
  if (a.ndata && a.type !== qt.AnnoType.DOTS) {
    qn.stylize(group, a.ndata, elem, qt.Class.Anno.NODE);
  }
  if (a.type === qt.AnnoType.SUMMARY) a.width += 10;
  group
    .select('text.' + qt.Class.Anno.LABEL)
    .transition()
    .attr('x', cx + a.dx + (a.isIn ? -1 : 1) * (a.width / 2 + a.labelOffset))
    .attr('y', d.y + a.dy);
  group
    .select('use.summary')
    .transition()
    .attr('x', cx + a.dx - 3)
    .attr('y', d.y + a.dy - 6);
  qs.positionEllipse(
    group.select('.' + qt.Class.Anno.NODE + ' ellipse'),
    cx + a.dx,
    d.y + a.dy,
    a.w,
    a.h
  );
  qs.positionRect(
    group.select('.' + qt.Class.Anno.NODE + ' rect'),
    cx + a.dx,
    d.y + a.dy,
    a.w,
    a.h
  );
  qs.positionRect(
    group.select('.' + qt.Class.Anno.NODE + ' use'),
    cx + a.dx,
    d.y + a.dy,
    a.w,
    a.h
  );
  group
    .select('path.' + qt.Class.Anno.EDGE)
    .transition()
    .attr('d', (a: Anno) => {
      const ps = a.points.map(p => ({
        x: p.dx + this.cx,
        y: p.dy + d.y
      }));
      return qe.interpolate(ps);
    });
}
