/* eslint-disable @typescript-eslint/no-empty-interface */
import * as _ from 'lodash';

import * as qa from './algos';
import * as qc from './coords';
import * as qg from './graph';
import * as qn from './nest';
import * as qo from './order';
import * as qp from './position';
import * as qr from './rank';
import * as qt from './types';
import * as qu from './utils';

const keys = {
  graph: [
    'acyclicer',
    'align',
    'edgesep',
    'margin',
    'nodesep',
    'rankdir',
    'ranker',
    'ranksep'
  ],
  edge: ['h', 'labelPos', 'minlen', 'offset', 'weight', 'w'],
  node: ['w', 'h']
};

const defaults = {
  graph: {nodesep: 50, edgesep: 20, ranksep: 50, rankdir: 'tb'},
  edge: {
    minlen: 1,
    weight: 1,
    w: 0,
    h: 0,
    offset: 10,
    labelPos: 'r'
  },
  node: {w: 0, h: 0}
};

export interface Gdata
  extends qa.Gdata,
    qc.Gdata,
    qn.Gdata,
    qp.Gdata,
    qr.Gdata,
    qt.Area {
  maxRank: number;
  margin: qt.Point;
}
export interface Ndata
  extends qa.Ndata,
    qc.Ndata,
    qn.Ndata,
    qp.Ndata,
    qr.Ndata {
  selfLinks: qg.Link<Edata>[];
  link: qg.Link<Edata>;
}
export interface Edata
  extends qa.Edata,
    qc.Edata,
    qn.Edata,
    qp.Edata,
    qr.Edata {
  offset: number;
}

export interface Graph<G extends Gdata, N extends Ndata, E extends Edata>
  extends qg.Graph<G, N, E>,
    qa.Graph<G, N, E>,
    qc.Graph<G, N, E>,
    qn.Graph<G, N, E>,
    qo.Graph<G, N, E>,
    qp.Graph<G, N, E>,
    qr.Graph<G, N, E> {}

export class Graph<G extends Gdata, N extends Ndata, E extends Edata> {
  runLayout(opts?: {debugTiming: boolean}) {
    const g = this.prepClone();
    if (opts?.debugTiming) qu.time('layout', () => g.runSteps());
    else g.runSteps();
    this.updateFrom(g);
    return this;
  }

  prepClone() {
    const g = qu.cloneMixins(this, {
      isMultiple: true,
      isCompound: true
    }) as this;
    let d = qu.canonicalize(this.data!) as G;
    d = _.merge({}, defaults.graph, _.pick(d, keys.graph)) as G;
    g.setData(d);
    this.nodes().forEach(n => {
      let nd = qu.canonicalize(this.node(n)!) as N;
      nd = _.merge({}, defaults.node, _.pick(nd, keys.node)) as N;
      g.setNode(n, nd);
      g.setParent(n, this.parent(n));
    });
    this.links().forEach(l => {
      let ed = qu.canonicalize(this.edge(l)!) as E;
      ed = _.merge({}, defaults.edge, _.pick(ed, keys.edge)) as E;
      g.setEdge(l, ed);
    });
    return g;
  }

  runSteps() {
    this.spreadOut()
      .delSelfLinks()
      .runAcycler()
      .runNest()
      .nonCompound()
      .runRank();
    return this.injectProxies()
      .delEmptyRanks()
      .undoNest()
      .normalizeRanks()
      .assignRankSpan()
      .dejectProxies()
      .runNormalize()
      .fakeChains()
      .addBorders()
      .runOrder()
      .addSelfLinks()
      .adjustCoords()
      .runPosition()
      .posSelfLinks()
      .delBorders()
      .undoNormalize()
      .fixCoords()
      .undoCoords()
      .translateGraph()
      .addIntersects()
      .reversePoints()
      .undoAcycler();
  }

  updateFrom(g: this) {
    this.nodes().forEach(n => {
      const nd = this.node(n);
      if (nd) {
        const ld = g.node(n)!;
        nd.x = ld.x;
        nd.y = ld.y;
        if (g.children(n)?.length) {
          nd.w = ld.w;
          nd.h = ld.h;
        }
      }
    });
    this.links().forEach(l => {
      const ed = this.edge(l);
      if (ed) {
        const ld = g.edge(l)!;
        ed.x = ld.x;
        ed.y = ld.y;
        ed.points = ld.points;
      }
    });
    this.data!.w = g.data!.w;
    this.data!.h = g.data!.h;
  }

  spreadOut() {
    const d = this.data!;
    d.ranksep /= 2;
    this.links().forEach(l => {
      const ed = this.edge(l)!;
      ed.minlen *= 2;
      if (ed.labelPos.toLowerCase() !== 'c') {
        if (d.rankdir === 'tb' || d.rankdir === 'bt') {
          ed.w += ed.offset;
        } else {
          ed.h += ed.offset;
        }
      }
    });
    return this;
  }

  delSelfLinks() {
    this.links().forEach(l => {
      if (l.nodes[0] === l.nodes[1]) {
        const nd = this.node(l.nodes[0])!;
        if (!nd.selfLinks) nd.selfLinks = [] as qg.Link<E>[];
        nd.selfLinks.push(l);
        this.delEdge(l);
      }
    });
    return this;
  }

  addSelfLinks() {
    const lm = this.layMatrix();
    lm.forEach(lay => {
      let shift = 0;
      lay.forEach((n, i) => {
        const nd = this.node(n)!;
        nd.order = i + shift;
        nd.selfLinks?.forEach(l => {
          const ed = l.data!;
          this.addFake(
            'selfedge',
            {
              w: ed.w,
              h: ed.h,
              rank: nd.rank,
              order: i + ++shift,
              link: l
            } as N,
            '_se'
          );
        });
        delete nd.selfLinks;
      });
    });
    return this;
  }

  posSelfLinks() {
    this.nodes().forEach(n => {
      const nd = this.node(n)!;
      if (nd.fake === 'selfedge') {
        const sd = this.node(nd.link.nodes[0])!;
        const x = sd.x + sd.w / 2;
        const y = sd.y;
        const dx = nd.x - x;
        const dy = sd.h / 2;
        this.setEdge(nd.link as qg.Link<E>, nd.link.data as E);
        this.delNode(n);
        nd.link.data!.points = [
          {x: x + (2 * dx) / 3, y: y - dy},
          {x: x + (5 * dx) / 6, y: y - dy},
          {x: x + dx, y: y},
          {x: x + (5 * dx) / 6, y: y + dy},
          {x: x + (2 * dx) / 3, y: y + dy}
        ];
        nd.link.data!.x = nd.x;
        nd.link.data!.y = nd.y;
      }
    });
    return this;
  }

  injectProxies() {
    this.links().forEach(l => {
      const ed = l.data!;
      if (ed.w && ed.h) {
        const d0 = this.node(l.nodes[0])!;
        const d1 = this.node(l.nodes[1])!;
        const nd = {
          rank: (d1.rank - d0.rank) / 2 + d0.rank,
          link: l as qg.Link<any>
        } as N;
        this.addFake('edge-proxy', nd, '_ep');
      }
    });
    return this;
  }

  dejectProxies() {
    this.nodes().forEach(n => {
      const d = this.node(n)!;
      if (d.fake === 'edge-proxy') {
        this.edge(d.link as qg.Link<E>)!.rank = d.rank;
        this.delNode(n);
      }
    });
    return this;
  }

  assignRankSpan() {
    let maxRank = 0;
    this.nodes().forEach(n => {
      const d = this.node(n)!;
      if (d.border?.top) {
        d.minRank = this.node(d.border.top)!.rank;
        d.maxRank = this.node(d.border.bottom)!.rank;
        maxRank = Math.max(maxRank, d.maxRank);
      }
    });
    this.data!.maxRank = maxRank;
    return this;
  }

  translateGraph() {
    let minX = Number.POSITIVE_INFINITY;
    let maxX = 0;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = 0;
    const gd = this.data!;
    const mX = gd.margin?.x ?? 0;
    const mY = gd.margin?.y ?? 0;
    const extremes = (d: N | E) => {
      const x = d.x;
      const y = d.y;
      const w = d.w;
      const h = d.h;
      minX = Math.min(minX, x - w / 2);
      maxX = Math.max(maxX, x + w / 2);
      minY = Math.min(minY, y - h / 2);
      maxY = Math.max(maxY, y + h / 2);
    };
    this.nodes().forEach(n => extremes(this.node(n)!));
    this.links().forEach(l => {
      const ed = this.edge(l)!;
      if (_.has(ed, 'x')) extremes(ed);
    });
    minX -= mX;
    minY -= mY;
    this.nodes().forEach(n => {
      const nd = this.node(n)!;
      nd.x -= minX;
      nd.y -= minY;
    });
    this.links().forEach(l => {
      const ed = this.edge(l)!;
      ed.points.forEach(p => {
        p.x -= minX;
        p.y -= minY;
      });
      if (_.has(ed, 'x')) ed.x -= minX;
      if (_.has(ed, 'y')) ed.y -= minY;
    });
    gd.w = maxX - minX + mX;
    gd.h = maxY - minY + mY;
    return this;
  }

  addIntersects() {
    this.links().forEach(l => {
      const ed = this.edge(l)!;
      const n0 = this.node(l.nodes[0])!;
      const n1 = this.node(l.nodes[1])!;
      let p0: qt.Point, p1: qt.Point;
      if (!ed.points) {
        ed.points = [];
        p0 = n1;
        p1 = n0;
      } else {
        p0 = ed.points[0];
        p1 = ed.points[ed.points.length - 1];
      }
      ed.points.unshift(qu.intersectRect(n0, p0, false));
      ed.points.push(qu.intersectRect(n1, p1, false));
    });
    return this;
  }

  fixCoords() {
    this.links().forEach(l => {
      const ed = this.edge(l)!;
      if (_.has(ed, 'x')) {
        if (ed.labelPos === 'l' || ed.labelPos === 'r') ed.w -= ed.offset;
        switch (ed.labelPos) {
          case 'l':
            ed.x -= ed.w / 2 + ed.offset;
            break;
          case 'r':
            ed.x += ed.w / 2 + ed.offset;
            break;
        }
      }
    });
    return this;
  }

  reversePoints() {
    this.links().forEach(l => {
      const ed = this.edge(l)!;
      if (ed.reversed) ed.points.reverse();
    });
    return this;
  }

  delBorders() {
    this.nodes().forEach(n => {
      if (this.children(n)?.length) {
        const nd = this.node(n)!;
        const t = this.node(nd.border.top)!;
        const b = this.node(nd.border.bottom)!;
        const l = this.node(_.last(nd.border.left))!;
        const r = this.node(_.last(nd.border.right))!;
        nd.w = Math.abs(r.x - l.x);
        nd.h = Math.abs(b.y - t.y);
        nd.x = l.x + nd.w / 2;
        nd.y = t.y + nd.h / 2;
      }
    });
    this.nodes().forEach(n => {
      if (this.node(n)!.fake === 'border') this.delNode(n);
    });
    return this;
  }
}
