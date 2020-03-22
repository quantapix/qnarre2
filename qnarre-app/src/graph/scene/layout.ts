import * as _ from 'lodash';
import * as d3 from 'd3';
import * as qt from './types';
import * as qr from './render';
import * as qp from './params';

export const MIN_AUX_WIDTH = 140;

export function layoutScene(d: qr.GroupNdata) {
  if (d.node.isGroup) layoutChildren(d);
  if (d.node.type === qt.NodeType.META) {
    layoutMetaNode(d);
  } else if (d.node.type === qt.NodeType.SERIES) {
    layoutNseries(d);
  }
}

function updateTotalWidthOfNode(d: qr.Ndata) {
  d.inboxWidth =
    d.inAnnotations.list.length > 0 ? qp.PARAMS.annotations.inboxWidth : 0;
  d.outboxWidth =
    d.outAnnotations.list.length > 0 ? qp.PARAMS.annotations.outboxWidth : 0;
  d.coreBox.width = d.width;
  d.coreBox.height = d.height;
  const l = d.displayName.length;
  const w = 3;
  d.width = Math.max(d.coreBox.width + d.inboxWidth + d.outboxWidth, l * w);
}

function layoutChildren(d: qr.GroupNdata) {
  const cs = d.coreGraph
    .nodes()
    .map(n => d.coreGraph.node(n))
    .concat(d.isolatedInExtract, d.isolatedOutExtract, d.libraryFnsExtract);
  cs.forEach(c => {
    switch (c.node.type) {
      case qt.NodeType.OP:
        _.extend(c, qp.PARAMS.nodeSize.op);
        break;
      case qt.NodeType.BRIDGE:
        _.extend(c, qp.PARAMS.nodeSize.bridge);
        break;
      case qt.NodeType.META:
        if (!c.expanded) {
          _.extend(c, qp.PARAMS.nodeSize.meta);
          c.height = qp.PARAMS.nodeSize.meta.height(c.node.cardinality);
        } else {
          layoutScene(c as qr.GroupNdata);
        }
        break;
      case qt.NodeType.SERIES:
        if (c.expanded) {
          _.extend(c, qp.PARAMS.nodeSize.series.expanded);
          layoutScene(c as qr.GroupNdata);
        } else {
          const g = c as qr.GroupNdata;
          const series = g.node.noControls
            ? qp.PARAMS.nodeSize.series.vertical
            : qp.PARAMS.nodeSize.series.horizontal;
          _.extend(c, series);
        }
        break;
      default:
        throw Error('Unrecognized node type: ' + c.node.type);
    }
    if (!c.expanded) updateTotalWidthOfNode(c);
    layoutAnnotation(c);
  });
}

function layout(g: qt.Graph<qr.Ndata, qr.MetaEdata>, ps) {
  _.extend(g.graph(), {
    nodesep: ps.nodeSep,
    ranksep: ps.rankSep,
    edgesep: ps.edgeSep
  });
  const bridges = [];
  const nonBridges = new Array<string>();
  g.nodes().forEach(n => {
    const i = g.node(n);
    if (i.node.type === qt.NodeType.BRIDGE) {
      bridges.push(n);
    } else {
      nonBridges.push(n);
    }
  });
  if (!nonBridges.length) return {width: 0, height: 0};
  qt.dagre.layout(g);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  nonBridges.forEach(n => {
    const i = g.node(n);
    const w = 0.5 * i.width;
    const x1 = i.x - w;
    const x2 = i.x + w;
    minX = x1 < minX ? x1 : minX;
    maxX = x2 > maxX ? x2 : maxX;
    const h = 0.5 * i.height;
    const y1 = i.y - h;
    const y2 = i.y + h;
    minY = y1 < minY ? y1 : minY;
    maxY = y2 > maxY ? y2 : maxY;
  });
  g.edges().forEach(d => {
    const e = g.edge(d);
    if (e.structural) return;
    const src = g.node(e.metaedge!.v);
    const dst = g.node(e.metaedge!.w);
    if (e.points.length === 3 && isStraightLine(e.points)) {
      if (src) {
        const cx = src.expanded ? src.x : computeCXPositionOfNodeShape(src);
        e.points[0].x = cx;
      }
      if (dst) {
        const cx = dst.expanded ? dst.x : computeCXPositionOfNodeShape(dst);
        e.points[2].x = cx;
      }
      e.points = [e.points[0], e.points[1]];
    }
    const nl = e.points[e.points.length - 2];
    if (dst) e.points[e.points.length - 1] = intersectPointAndNode(nl, dst);
    const sp = e.points[1];
    if (src) e.points[0] = intersectPointAndNode(sp, src);
    e.points.forEach(p => {
      minX = p.x < minX ? p.x : minX;
      maxX = p.x > maxX ? p.x : maxX;
      minY = p.y < minY ? p.y : minY;
      maxY = p.y > maxY ? p.y : maxY;
    });
  });
  g.nodes().forEach(n => {
    const i = g.node(n);
    i.x -= minX;
    i.y -= minY;
  });
  g.edges().forEach(e => {
    g.edge(e).points.forEach(p => {
      p.x -= minX;
      p.y -= minY;
    });
  });
  return {width: maxX - minX, height: maxY - minY};
}

function layoutMetaNode(d: qr.GroupNdata) {
  const ps = qp.PARAMS.subscene.meta;
  _.extend(d, ps);
  _.extend(d.coreBox, layout(d.coreGraph, qp.PARAMS.graph.meta));
  const iw = d.isolatedInExtract.length
    ? _.max(d.isolatedInExtract.map(d => d.width))
    : null;
  d.inExtractBox.width = iw != null ? iw : 0;
  d.inExtractBox.height = _.reduce(
    d.isolatedInExtract,
    (h: number, c, i: number) => {
      const y = i > 0 ? ps.extractYOffset : 0;
      c.x = 0;
      c.y = h + y + c.height / 2;
      return h + y + c.height;
    },
    0
  );
  const ow = d.isolatedOutExtract.length
    ? _.max(d.isolatedOutExtract.map(d => d.width))
    : null;
  d.outExtractBox.width = ow != null ? ow : 0;
  d.outExtractBox.height = _.reduce(
    d.isolatedOutExtract,
    (h, c, i) => {
      const y = i > 0 ? ps.extractYOffset : 0;
      c.x = 0;
      c.y = h + y + c.height / 2;
      return h + y + c.height;
    },
    0
  );
  const fw = d.libraryFnsExtract.length
    ? _.max(d.libraryFnsExtract.map(d => d.width))
    : null;
  d.libraryFnsBox.width = fw != null ? fw : 0;
  d.libraryFnsBox.height = _.reduce(
    d.libraryFnsExtract,
    (h, c, i) => {
      const y = i > 0 ? ps.extractYOffset : 0;
      c.x = 0;
      c.y = h + y + c.height / 2;
      return h + y + c.height;
    },
    0
  );
  let numParts = 0;
  if (d.isolatedInExtract.length > 0) numParts++;
  if (d.isolatedOutExtract.length > 0) numParts++;
  if (d.libraryFnsExtract.length > 0) numParts++;
  if (d.coreGraph.nodeCount() > 0) numParts++;
  const offset = qp.PARAMS.subscene.meta.extractXOffset;
  const padding = numParts <= 1 ? 0 : numParts * offset;
  const auxWidth = Math.max(
    MIN_AUX_WIDTH,
    d.inExtractBox.width + d.outExtractBox.width
  );
  d.coreBox.width += auxWidth + padding + d.libraryFnsBox.width + padding;
  d.coreBox.height =
    ps.labelHeight +
    Math.max(
      d.inExtractBox.height,
      d.coreBox.height,
      d.libraryFnsBox.height,
      d.outExtractBox.height
    );
  d.width = d.coreBox.width + ps.paddingLeft + ps.paddingRight;
  d.height = d.paddingTop + d.coreBox.height + d.paddingBottom;
}

function layoutNseries(d: qr.GroupNdata) {
  const g = d.coreGraph;
  const ps = qp.PARAMS.subscene.series;
  _.extend(d, ps);
  _.extend(d.coreBox, layout(d.coreGraph, qp.PARAMS.graph.series));
  g.nodes().forEach(n => (g.node(n).excluded = false));
  d.width = d.coreBox.width + ps.paddingLeft + ps.paddingRight;
  d.height = d.coreBox.height + ps.paddingTop + ps.paddingBottom;
}

function layoutAnnotation(d: qr.Ndata) {
  if (d.expanded) return;
  const inAnnotations = d.inAnnotations.list;
  const outAnnotations = d.outAnnotations.list;
  _.each(inAnnotations, a => sizeAnnotation(a));
  _.each(outAnnotations, a => sizeAnnotation(a));
  const ps = qp.PARAMS.annotations;
  const inboxHeight = _.reduce(
    inAnnotations,
    (height, a, i) => {
      const yOffset = i > 0 ? ps.yOffset : 0;
      a.dx = -(d.coreBox.width + a.width) / 2 - ps.xOffset;
      a.dy = height + yOffset + a.height / 2;
      return height + yOffset + a.height;
    },
    0
  );
  _.each(inAnnotations, a => {
    a.dy -= inboxHeight / 2;
    a.labelOffset = ps.labelOffset;
  });
  const outboxHeight = _.reduce(
    outAnnotations,
    (height, a, i) => {
      const yOffset = i > 0 ? ps.yOffset : 0;
      a.dx = (d.coreBox.width + a.width) / 2 + ps.xOffset;
      a.dy = height + yOffset + a.height / 2;
      return height + yOffset + a.height;
    },
    0
  );
  _.each(outAnnotations, a => {
    a.dy -= outboxHeight / 2;
    a.labelOffset = ps.labelOffset;
  });
  let inTouchHeight = Math.min(d.height / 2 - d.radius, inboxHeight / 2);
  inTouchHeight = inTouchHeight < 0 ? 0 : inTouchHeight;
  const inY = d3
    .scaleLinear()
    .domain([0, inAnnotations.length - 1])
    .range([-inTouchHeight, inTouchHeight]);
  _.each(inAnnotations, (a, i) => {
    a.points = [
      {
        dx: a.dx + a.width / 2,
        dy: a.dy
      },
      {
        dx: -d.coreBox.width / 2,
        dy: inAnnotations.length > 1 ? inY(i) : 0
      }
    ];
  });
  let outTouchHeight = Math.min(d.height / 2 - d.radius, outboxHeight / 2);
  outTouchHeight = outTouchHeight < 0 ? 0 : outTouchHeight;
  const outY = d3
    .scaleLinear()
    .domain([0, outAnnotations.length - 1])
    .range([-outTouchHeight, outTouchHeight]);
  _.each(outAnnotations, (a, i) => {
    a.points = [
      {
        dx: d.coreBox.width / 2,
        dy: outAnnotations.length > 1 ? outY(i) : 0
      },
      {
        dx: a.dx - a.width / 2,
        dy: a.dy
      }
    ];
  });
  d.height = Math.max(d.height, inboxHeight, outboxHeight);
}

function sizeAnnotation(a: qr.Annotation) {
  switch (a.type) {
    case qt.AnnotationType.CONSTANT:
      _.extend(a, qp.PARAMS.constant.size);
      break;
    case qt.AnnotationType.SHORTCUT:
      if (a.node.type === qt.NodeType.OP) {
        _.extend(a, qp.PARAMS.shortcutSize.op);
      } else if (a.node.type === qt.NodeType.META) {
        _.extend(a, qp.PARAMS.shortcutSize.meta);
      } else if (a.node.type === qt.NodeType.SERIES) {
        _.extend(a, qp.PARAMS.shortcutSize.series);
      } else {
        throw Error('Invalid node type: ' + a.node.type);
      }
      break;
    case qt.AnnotationType.SUMMARY:
      _.extend(a, qp.PARAMS.constant.size);
      break;
  }
}

export function computeCXPositionOfNodeShape(d: qr.Ndata) {
  if (d.expanded) return d.x;
  const dx = d.inAnnotations.list.length ? d.inboxWidth : 0;
  return d.x - d.width / 2 + dx + d.coreBox.width / 2;
}

function angleBetweenTwoPoints(a: qr.Point, b: qr.Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (180 * Math.atan(dy / dx)) / Math.PI;
}

function isStraightLine(ps: qr.Point[]) {
  let angle = angleBetweenTwoPoints(ps[0], ps[1]);
  for (let i = 1; i < ps.length - 1; i++) {
    const n = angleBetweenTwoPoints(ps[i], ps[i + 1]);
    if (Math.abs(n - angle) > 1) return false;
    angle = n;
  }
  return true;
}

function intersectPointAndNode(p: qr.Point, d: qr.Ndata) {
  const cx = d.expanded ? d.x : computeCXPositionOfNodeShape(d);
  const cy = d.y;
  const dx = p.x - cx;
  const dy = p.y - cy;
  let w = d.expanded ? d.width : d.coreBox.width;
  let h = d.expanded ? d.height : d.coreBox.height;
  let deltaX: number, deltaY: number;
  if ((Math.abs(dy) * w) / 2 > (Math.abs(dx) * h) / 2) {
    if (dy < 0) h = -h;
    deltaX = dy === 0 ? 0 : ((h / 2) * dx) / dy;
    deltaY = h / 2;
  } else {
    if (dx < 0) w = -w;
    deltaX = w / 2;
    deltaY = dx === 0 ? 0 : ((w / 2) * dy) / dx;
  }
  return {x: cx + deltaX, y: cy + deltaY} as qr.Point;
}
