import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qt from './types';
//import * as qr from './gdata';
import * as qp from './params';
import * as qg from './graph';
import * as qn from './ndata';

export function layoutScene(c: qg.Nclus) {
  if (qg.isClus(c)) layoutChildren(c);
  if (qg.isMeta(c)) layoutMeta(c);
  else if (qg.isList(c)) layoutList(c);
}

function layoutChildren(c: qg.Nclus) {
  const nds = c.core
    .nodes()
    .map(n => c.core.node(n)!)
    .concat(c.isolated.in, c.isolated.out, c.isolated.lib);
  nds.forEach(nd => {
    switch (nd.type) {
      case qt.NdataT.OPER:
        _.extend(nd, qp.PARAMS.nodeSize.oper);
        break;
      case qt.NdataT.BRIDGE:
        _.extend(nd, qp.PARAMS.nodeSize.bridge);
        break;
      case qt.NdataT.META:
        if (nd.expanded) layoutScene(nd as qg.Nclus);
        else {
          _.extend(nd, qp.PARAMS.nodeSize.meta);
          nd.h = qp.PARAMS.nodeSize.meta.height(nd.cardin);
        }
        break;
      case qt.NdataT.LIST:
        if (nd.expanded) {
          _.extend(nd, qp.PARAMS.nodeSize.list.expanded);
          layoutScene(nd as qg.Nclus);
        } else if (qg.isClus(nd)) {
          const s = nd.noControls
            ? qp.PARAMS.nodeSize.list.vertical
            : qp.PARAMS.nodeSize.list.horizontal;
          _.extend(nd, s);
        }
        break;
      default:
        throw Error('Unrecognized type: ' + nd.type);
    }
    if (!nd.expanded) nd.updateTotalWidthOfNode();
    layoutAnnotation(nd);
  });
}

function layoutMeta(m: qg.Nmeta) {
  _.extend(m, ps);
  _.extend(m.box, m.core.layout(qp.PARAMS.graph.meta));
  let parts = 0;
  if (m.core.nodeCount > 0) parts++;
  let nds = m.isolated.in;
  if (nds.length > 0) parts++;
  const iw = nds.length ? _.max(nds.map(d => d.w)) : undefined;
  m.areas.in.w = iw ?? 0;
  const ps = qp.PARAMS.subscene.meta;
  m.areas.in.h = _.reduce(
    nds,
    (h, nd, i) => {
      const y = i > 0 ? ps.extractYOffset : 0;
      nd.x = 0;
      nd.y = h + y + nd.h / 2;
      return h + y + nd.h;
    },
    0
  );
  nds = m.isolated.out;
  if (nds.length > 0) parts++;
  const ow = nds.length ? _.max(nds.map(d => d.w)) : undefined;
  m.areas.out.w = ow ?? 0;
  m.areas.out.h = _.reduce(
    nds,
    (h, nd, i) => {
      const y = i > 0 ? ps.extractYOffset : 0;
      nd.x = 0;
      nd.y = h + y + nd.h / 2;
      return h + y + nd.h;
    },
    0
  );
  nds = m.isolated.lib;
  if (nds.length > 0) parts++;
  const fw = nds.length ? _.max(nds.map(d => d.w)) : undefined;
  m.areas.lib.w = fw != null ? fw : 0;
  m.areas.lib.h = _.reduce(
    nds,
    (h, nd, i) => {
      const y = i > 0 ? ps.extractYOffset : 0;
      nd.x = 0;
      nd.y = h + y + nd.h / 2;
      return h + y + nd.h;
    },
    0
  );
  const off = ps.extractXOffset;
  const pad = parts <= 1 ? 0 : parts * off;
  const aux = Math.max(qp.MIN_AUX_WIDTH, m.areas.in.w + m.areas.out.w);
  m.box.w += aux + pad + m.areas.lib.w + pad;
  m.box.h =
    ps.labelHeight +
    Math.max(m.areas.in.h, m.box.h, m.areas.lib.h, m.areas.out.h);
  m.w = m.box.w + ps.pad.left + ps.pad.right;
  m.h = m.pad.top + m.box.h + m.pad.bottom;
}

function layoutList(l: qg.Nlist) {
  const g = l.core;
  const ps = qp.PARAMS.subscene.list;
  _.extend(l, ps);
  _.extend(l.box, layout(l.core, qp.PARAMS.graph.series));
  g.nodes().forEach(n => (g.node(n)!.excluded = false));
  l.w = l.box.w + ps.pad.left + ps.pad.right;
  l.h = l.box.h + ps.pad.top + ps.pad.bottom;
}

export class Graph<
  G extends qg.Gdata,
  N extends qg.Ndata,
  E extends qg.Edata
> extends qg.Graph<G, N, E> {
  layout(ps: qg.Opts) {
    _.extend(this.data, {
      nodesep: ps.nodesep,
      ranksep: ps.ranksep,
      edgesep: ps.edgesep
    });
    const bs = [];
    const nonbs = [] as string[];
    this.nodes().forEach(n => {
      const nd = this.node(n)!;
      if (nd.type === qt.NdataT.BRIDGE) bs.push(n);
      else nonbs.push(n);
    });
    if (!nonbs.length) return {w: 0, h: 0};
    this.runLayout();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nonbs.forEach(n => {
      const nd = this.node(n)!;
      const w = 0.5 * nd.w;
      const x1 = nd.x - w;
      const x2 = nd.x + w;
      minX = x1 < minX ? x1 : minX;
      maxX = x2 > maxX ? x2 : maxX;
      const h = 0.5 * nd.h;
      const y1 = nd.y - h;
      const y2 = nd.y + h;
      minY = y1 < minY ? y1 : minY;
      maxY = y2 > maxY ? y2 : maxY;
    });
    this.edges().forEach(e => {
      const ed = this.edge(e)!;
      if (ed.structural) return;
      const n0 = this.node(ed.metaedge!.v) as qn.Ndata;
      const n1 = this.node(ed.metaedge!.w) as qn.Ndata;
      if (ed.points.length === 3 && isStraightLine(ed.points)) {
        if (n0) {
          const x = n0.expanded ? n0.x : n0.computeCXPositionOfNodeShape();
          ed.points[0].x = x;
        }
        if (n1) {
          const x = n1.expanded ? n1.x : n1.computeCXPositionOfNodeShape();
          ed.points[2].x = x;
        }
        ed.points = [ed.points[0], ed.points[1]];
      }
      const nl = ed.points[ed.points.length - 2];
      if (n1) ed.points[ed.points.length - 1] = n1.intersectPointAndNode(nl);
      const sp = ed.points[1];
      if (n0) ed.points[0] = n0.intersectPointAndNode(sp);
      ed.points.forEach(p => {
        minX = p.x < minX ? p.x : minX;
        maxX = p.x > maxX ? p.x : maxX;
        minY = p.y < minY ? p.y : minY;
        maxY = p.y > maxY ? p.y : maxY;
      });
    });
    this.nodes().forEach(n => {
      const nd = this.node(n)!;
      nd.x -= minX;
      nd.y -= minY;
    });
    this.edges().forEach(e => {
      this.edge(e)!.points.forEach(p => {
        p.x -= minX;
        p.y -= minY;
      });
    });
    return {w: maxX - minX, h: maxY - minY};
  }
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
      a.dx = -(d.box.w + a.width) / 2 - ps.xOffset;
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
      a.dx = (d.box.w + a.width) / 2 + ps.xOffset;
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
        dx: -d.box.w / 2,
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
        dx: d.box.w / 2,
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

function sizeAnnotation(a: qg.Anno) {
  switch (a.type) {
    case qt.AnnoT.CONSTANT:
      _.extend(a, qp.PARAMS.constant.size);
      break;
    case qt.AnnoT.SHORTCUT:
      if (a.node.type === qt.NdataT.OPER) {
        _.extend(a, qp.PARAMS.shortcutSize.oper);
      } else if (a.node.type === qt.NdataT.META) {
        _.extend(a, qp.PARAMS.shortcutSize.meta);
      } else if (a.node.type === qt.NdataT.LIST) {
        _.extend(a, qp.PARAMS.shortcutSize.list);
      } else {
        throw Error('Invalid type: ' + a.node.type);
      }
      break;
    case qt.AnnoT.SUMMARY:
      _.extend(a, qp.PARAMS.constant.size);
      break;
  }
}

function angleBetweenTwoPoints(a: qt.Point, b: qt.Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return (180 * Math.atan(dy / dx)) / Math.PI;
}

function isStraightLine(ps: qt.Point[]) {
  let a = angleBetweenTwoPoints(ps[0], ps[1]);
  for (let i = 1; i < ps.length - 1; i++) {
    const b = angleBetweenTwoPoints(ps[i], ps[i + 1]);
    if (Math.abs(b - a) > 1) return false;
    a = b;
  }
  return true;
}
