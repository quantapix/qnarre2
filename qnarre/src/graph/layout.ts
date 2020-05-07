import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qt from './types';
import * as qp from './params';
import * as qg from './graph';
import * as qu from './utils';

export function runLayout<
  G extends qg.Gdata,
  N extends qg.Ndata,
  E extends qg.Edata
>(g: qg.Graph<G, N, E>, opts?: qg.Opts) {
  _.extend(g.data, {
    nodesep: opts?.nodesep,
    ranksep: opts?.ranksep,
    edgesep: opts?.edgesep
  });
  const bs = [];
  const nonbs = [] as string[];
  g.nodes().forEach(n => {
    const nd = g.node(n)!;
    if (nd.type === qt.NdataT.BRIDGE) bs.push(n);
    else nonbs.push(n);
  });
  if (!nonbs.length) return {w: 0, h: 0};
  g.runLayout(opts);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  nonbs.forEach(n => {
    const nd = g.node(n)!;
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
  g.edges().forEach(e => {
    const ed = g.edge(e)!;
    if (ed.structural) return;
    const n0 = g.node(ed.meta!.nodes![0]);
    const n1 = g.node(ed.meta!.nodes![1]);
    if (ed.points.length === 3 && qu.Point.colinear(ed.points)) {
      if (n0) {
        const x = n0.expanded ? n0.x : n0.centerX();
        ed.points[0].x = x;
      }
      if (n1) {
        const x = n1.expanded ? n1.x : n1.centerX();
        ed.points[2].x = x;
      }
      ed.points = [ed.points[0], ed.points[1]];
    }
    const nl = ed.points[ed.points.length - 2];
    if (n1) ed.points[ed.points.length - 1] = n1.intersect(nl);
    const sp = ed.points[1];
    if (n0) ed.points[0] = n0.intersect(sp);
    ed.points.forEach(p => {
      minX = p.x < minX ? p.x : minX;
      maxX = p.x > maxX ? p.x : maxX;
      minY = p.y < minY ? p.y : minY;
      maxY = p.y > maxY ? p.y : maxY;
    });
  });
  g.nodes().forEach(n => {
    const nd = g.node(n)!;
    nd.x -= minX;
    nd.y -= minY;
  });
  g.edges().forEach(e => {
    g.edge(e)!.points.forEach(p => {
      p.x -= minX;
      p.y -= minY;
    });
  });
  return {w: maxX - minX, h: maxY - minY};
}

export function layout(d: qg.Ndata) {
  if (qg.isClus(d)) layoutClus(d);
  if (qg.isMeta(d)) layoutMeta(d);
  else if (qg.isList(d)) layoutList(d);
}

function layoutClus(c: qg.Nclus) {
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
        if (!nd.expanded) {
          _.extend(nd, qp.PARAMS.nodeSize.meta);
          nd.h = qp.PARAMS.nodeSize.meta.height(nd.cardin);
        }
        break;
      case qt.NdataT.LIST:
        if (nd.expanded) {
          _.extend(nd, qp.PARAMS.nodeSize.list.expanded);
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
    if (nd.expanded) {
      if (qg.isClus(nd)) layout(nd);
    } else {
      updateWidth(nd);
    }
    layoutAnno(nd);
  });
}

function layoutMeta(m: qg.Nmeta) {
  const ps = qp.PARAMS.subscene.meta;
  _.extend(m, ps);
  _.extend(m.box, runLayout(m.core, qp.PARAMS.graph.meta));
  let parts = 0;
  if (m.core.nodeCount > 0) parts++;
  let nds = m.isolated.in;
  if (nds.length > 0) parts++;
  const iw = nds.length ? _.max(nds.map(d => d.w)) : undefined;
  m.areas.in.w = iw ?? 0;
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
  _.extend(l.box, runLayout(l.core, qp.PARAMS.graph.list));
  g.nodes().forEach(n => (g.node(n)!.excluded = false));
  l.w = l.box.w + ps.pad.left + ps.pad.right;
  l.h = l.box.h + ps.pad.top + ps.pad.bottom;
}

function layoutAnno(d: qg.Ndata) {
  if (d.expanded) return;
  const ins = d.annos.in;
  const outs = d.annos.out;
  ins.forEach(a => a.initSizes());
  outs.forEach(a => a.initSizes());
  const ps = qp.PARAMS.annotations;
  const calc = (h: number, a: qg.Anno, i: number) => {
    const o = i > 0 ? ps.yOffset : 0;
    a.x = -(d.box.w + a.w) / 2 - ps.xOffset;
    a.y = h + o + a.h / 2;
    return h + o + a.h;
  };
  const ih = _.reduce(ins, calc, 0);
  ins.forEach(a => {
    a.y -= ih / 2;
    a.offset = ps.labelOffset;
  });
  const oh = _.reduce(outs, calc, 0);
  outs.forEach(a => {
    a.y -= oh / 2;
    a.offset = ps.labelOffset;
  });
  let touch = Math.min(d.h / 2 - d.r, ih / 2);
  touch = touch < 0 ? 0 : touch;
  const iy = d3
    .scaleLinear()
    .domain([0, ins.length - 1])
    .range([-touch, touch]);
  ins.forEach((a, i) => {
    a.points = [
      new qt.Point(a.x + a.w / 2, a.y),
      new qt.Point(-d.box.w / 2, ins.length > 1 ? iy(i) : 0)
    ];
  });
  touch = Math.min(d.h / 2 - d.r, oh / 2);
  touch = touch < 0 ? 0 : touch;
  const oy = d3
    .scaleLinear()
    .domain([0, outs.length - 1])
    .range([-touch, touch]);
  outs.forEach((a, i) => {
    a.points = [
      new qt.Point(d.box.w / 2, outs.length > 1 ? oy(i) : 0),
      new qt.Point(a.x - a.w / 2, a.y)
    ];
  });
  d.h = Math.max(d.h, ih, oh);
}

function updateWidth(nd: qg.Ndata) {
  nd.width.in = nd.annos.in.length > 0 ? qp.PARAMS.annotations.inboxWidth : 0;
  nd.width.out =
    nd.annos.out.length > 0 ? qp.PARAMS.annotations.outboxWidth : 0;
  nd.box.w = nd.w;
  nd.box.h = nd.h;
  const l = nd.display.length;
  const w = 3;
  nd.w = Math.max(nd.box.w + nd.width.in + nd.width.out, l * w);
}
