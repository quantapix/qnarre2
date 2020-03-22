import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qe from './edge';
import * as ql from './layout';
import * as qm from '../../elems/graph/contextmenu';
import * as qn from './node';
import * as qr from './render';
import * as qs from './scene';
import * as qt from './types';

export function buildGroup(cont, annos: qr.AnnotationList, d: qr.Ndata, elem) {
  const gs = cont
    .selectAll(() => this.childNodes)
    .data(annos.list, d => d.node.name);
  gs.enter()
    .append('g')
    .attr('data-name', (a: qr.Annotation) => a.node.name)
    .each((a: qr.Annotation) => {
      const g = d3.select(this);
      elem.addAnnotationGroup(a, d, g);
      let t = qt.Class.Annotation.EDGE;
      const me = a.edata && a.edata.metaedge;
      if (me && !me.numRegular) t += ' ' + qt.Class.Annotation.CONTROL_EDGE;
      if (me && me.numRef) t += ' ' + qt.Class.Edge.REF_LINE;
      qe.appendEdge(g, a, elem, t);
      if (a.type !== qt.AnnotationType.ELLIPSIS) {
        addAnnotationLabelFromNode(g, a);
        buildShape(g, a);
      } else {
        addAnnotationLabel(g, a.node.name, a, qt.Class.Annotation.ELLIPSIS);
      }
    })
    .merge(gs)
    .attr('class', (a: qr.Annotation) => {
      return (
        qt.Class.Annotation.GROUP +
        ' ' +
        annotationToClassName(a.type) +
        ' ' +
        qn.nodeClass(a)
      );
    })
    .each((a: qr.Annotation) => {
      const g = d3.select(this);
      update(g, d, a, elem);
      if (a.type !== qt.AnnotationType.ELLIPSIS) addInteraction(g, d, a, elem);
    });
  gs.exit()
    .each((a: qr.Annotation) => {
      const g = d3.select(this);
      elem.removeAnnotationGroup(a, d, g);
    })
    .remove();
  return gs;
}

function annotationToClassName(t: qt.AnnotationType) {
  return (qt.AnnotationType[t] || '').toLowerCase() || null;
}

function buildShape(group, a: qr.Annotation) {
  if (a.type === qt.AnnotationType.SUMMARY) {
    const s = qs.selectOrCreate(group, 'use');
    s.attr('class', 'summary')
      .attr('xlink:href', '#summary-icon')
      .attr('cursor', 'pointer');
  } else {
    const s = qn.buildShape(group, a, qt.Class.Annotation.NODE);
    qs.selectOrCreate(s, 'title').text(a.node.name);
  }
}

function addAnnotationLabelFromNode(group, a: qr.Annotation) {
  const path = a.node.name.split('/');
  const t = path[path.length - 1];
  return addAnnotationLabel(group, t, a, null);
}

function addAnnotationLabel(group, label: string, a: qr.Annotation, more) {
  let ns = qt.Class.Annotation.LABEL;
  if (more) ns += ' ' + more;
  const t = group
    .append('text')
    .attr('class', ns)
    .attr('dy', '.35em')
    .attr('text-anchor', a.isIn ? 'end' : 'start')
    .text(label);
  return qn.enforceLabelWidth(t, -1);
}

function addInteraction(sel, d: qr.Ndata, anno: qr.Annotation, elem) {
  sel
    .on('mouseover', (a: qr.Annotation) => {
      elem.fire('annotation-highlight', {
        name: a.node.name,
        hostName: d.node.name
      });
    })
    .on('mouseout', (a: qr.Annotation) => {
      elem.fire('annotation-unhighlight', {
        name: a.node.name,
        hostName: d.node.name
      });
    })
    .on('click', (a: qr.Annotation) => {
      (d3.event as Event).stopPropagation();
      elem.fire('annotation-select', {
        name: a.node.name,
        hostName: d.node.name
      });
    });
  if (
    anno.type !== qt.AnnotationType.SUMMARY &&
    anno.type !== qt.AnnotationType.CONSTANT
  ) {
    sel.on('contextmenu', qm.getMenu(elem, qn.getContextMenu(anno.node, elem)));
  }
}

function update(group, d: qr.Ndata, a: qr.Annotation, elem) {
  const cx = ql.computeCXPositionOfNodeShape(d);
  if (a.ndata && a.type !== qt.AnnotationType.ELLIPSIS) {
    qn.stylize(group, a.ndata, elem, qt.Class.Annotation.NODE);
  }
  if (a.type === qt.AnnotationType.SUMMARY) a.width += 10;
  group
    .select('text.' + qt.Class.Annotation.LABEL)
    .transition()
    .attr('x', cx + a.dx + (a.isIn ? -1 : 1) * (a.width / 2 + a.labelOffset))
    .attr('y', d.y + a.dy);
  group
    .select('use.summary')
    .transition()
    .attr('x', cx + a.dx - 3)
    .attr('y', d.y + a.dy - 6);
  qs.positionEllipse(
    group.select('.' + qt.Class.Annotation.NODE + ' ellipse'),
    cx + a.dx,
    d.y + a.dy,
    a.width,
    a.height
  );
  qs.positionRect(
    group.select('.' + qt.Class.Annotation.NODE + ' rect'),
    cx + a.dx,
    d.y + a.dy,
    a.width,
    a.height
  );
  qs.positionRect(
    group.select('.' + qt.Class.Annotation.NODE + ' use'),
    cx + a.dx,
    d.y + a.dy,
    a.width,
    a.height
  );
  group
    .select('path.' + qt.Class.Annotation.EDGE)
    .transition()
    .attr('d', (a: qr.Annotation) => {
      const ps = a.points.map(p => ({
        x: p.dx + this.cx,
        y: p.dy + d.y
      }));
      return qe.interpolate(ps);
    });
}
