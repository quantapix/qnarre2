import * as _ from 'lodash';

import * as qa from './algos';
import * as qc from './coords';
import * as qg from './graph';
import * as ql from './layout';
import * as qn from './nest';
import * as qo from './order';
import * as qp from './position';
import * as qr from './rank';
import * as qs from './sort';
import * as qt from './types';
import * as qu from './utils';

type QA = qa.Graph<ql.Gdata, ql.Ndata, ql.Edata>;
type QC = qc.Graph<ql.Gdata, ql.Ndata, ql.Edata>;
type QG = qg.Graph<ql.Gdata, ql.Ndata, ql.Edata>;
type QL = ql.Graph<ql.Gdata, ql.Ndata, ql.Edata>;
type QN = qn.Graph<ql.Gdata, ql.Ndata, ql.Edata>;
type QO = qo.Graph<ql.Gdata, ql.Ndata, ql.Edata>;
type QP = qp.Graph<ql.Gdata, ql.Ndata, ql.Edata>;
type QR = qr.Graph<ql.Gdata, ql.Ndata, ql.Edata>;
type QS = qs.Graph<ql.Gdata, ql.Ndata, ql.Edata>;

interface Graph extends QL, QP, QO, QR, QS, QC, QN, QA, QG {}
class Graph extends qg.Graph<ql.Gdata, ql.Ndata, ql.Edata> {}
qu.applyMixins(Graph, [
  ql.Graph,
  qa.Graph,
  qc.Graph,
  qn.Graph,
  qs.Graph,
  qp.Graph,
  qo.Graph,
  qr.Graph,
  qg.Graph
]);

describe('layout', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({isMultiple: true, isCompound: true})
      .setData({} as ql.Gdata)
      .setDefEdge(() => ({} as ql.Edata));
  });
  it('can layout single node', () => {
    g.setNode('a', {w: 50, h: 100} as ql.Ndata);
    g.runLayout();
    expect(coordsFrom(g)).toEqual({a: {x: 50 / 2, y: 100 / 2}});
    expect(g.node('a')!.x).toBe(50 / 2);
    expect(g.node('a')!.y).toBe(100 / 2);
  });
  it('can layout two nodes on same rank', () => {
    g.data!.nodesep = 200;
    g.setNode('a', {w: 50, h: 100} as ql.Ndata);
    g.setNode('b', {w: 75, h: 200} as ql.Ndata);
    g.runLayout();
    expect(coordsFrom(g)).toEqual({
      a: {x: 50 / 2, y: 200 / 2},
      b: {x: 50 + 200 + 75 / 2, y: 200 / 2}
    });
  });
  it('can layout two nodes connected by edge', () => {
    g.data!.ranksep = 300;
    g.setNode('a', {w: 50, h: 100} as ql.Ndata);
    g.setNode('b', {w: 75, h: 200} as ql.Ndata);
    g.setEdge(['a', 'b']);
    g.runLayout();
    expect(coordsFrom(g)).toEqual({
      a: {x: 75 / 2, y: 100 / 2},
      b: {x: 75 / 2, y: 100 + 300 + 200 / 2}
    });
    expect(g.edge(['a', 'b'])?.x).toBeUndefined();
    expect(g.edge(['a', 'b'])?.y).toBeUndefined();
  });
  it('can layout edge with label', () => {
    g.data!.ranksep = 300;
    g.setNode('a', {w: 50, h: 100} as ql.Ndata);
    g.setNode('b', {w: 75, h: 200} as ql.Ndata);
    g.setEdge(['a', 'b'], {w: 60, h: 70, labelPos: 'c'} as ql.Edata);
    g.runLayout();
    expect(coordsFrom(g)).toEqual({
      a: {x: 75 / 2, y: 100 / 2},
      b: {x: 75 / 2, y: 100 + 150 + 70 + 150 + 200 / 2}
    });
    expect(_.pick(g.edge(['a', 'b']), ['x', 'y'])).toEqual({
      x: 75 / 2,
      y: 100 + 150 + 70 / 2
    });
  });

  describe('can layout edge with long label with rankdir =', () => {
    ['tb', 'bt', 'lr', 'rl'].forEach(rd => {
      it(rd, () => {
        g.data!.nodesep = g.data!.edgesep = 10;
        g.data!.rankdir = rd as qt.Dir;
        ['a', 'b', 'c', 'd'].forEach(n =>
          g.setNode(n, {w: 10, h: 10} as ql.Ndata)
        );
        g.setEdge(['a', 'c'], {
          w: 2000,
          h: 10,
          labelPos: 'c'
        } as ql.Edata);
        g.setEdge(['b', 'd'], {w: 1, h: 1} as ql.Edata);
        g.runLayout();
        let p1, p2;
        if (rd === 'tb' || rd === 'bt') {
          p1 = g.edge(['a', 'c'])!;
          p2 = g.edge(['b', 'd'])!;
        } else {
          p1 = g.node('a')!;
          p2 = g.node('c')!;
        }
        expect(Math.abs(p1.x - p2.x)).toBeGreaterThan(1000);
      });
    });
  });

  describe('can apply an offset with rankdir =', () => {
    ['tb', 'bt', 'lr', 'rl'].forEach(rd => {
      it(rd, () => {
        g.data!.nodesep = g.data!.edgesep = 10;
        g.data!.rankdir = rd as qt.Dir;
        ['a', 'b', 'c', 'd'].forEach(n =>
          g.setNode(n, {w: 10, h: 10} as ql.Ndata)
        );
        g.setEdge(['a', 'b'], {
          w: 10,
          h: 10,
          labelPos: 'l',
          offset: 1000
        } as ql.Edata);
        g.setEdge(['c', 'd'], {
          w: 10,
          h: 10,
          labelPos: 'r',
          offset: 1000
        } as ql.Edata);
        g.runLayout();
        if (rd === 'tb' || rd === 'bt') {
          expect(g.edge(['a', 'b'])!.x - g.edge(['a', 'b'])!.points[0].x).toBe(
            -1000 - 10 / 2
          );
          expect(g.edge(['c', 'd'])!.x - g.edge(['c', 'd'])!.points[0].x).toBe(
            1000 + 10 / 2
          );
        } else {
          expect(g.edge(['a', 'b'])!.y - g.edge(['a', 'b'])!.points[0].y).toBe(
            -1000 - 10 / 2
          );
          expect(g.edge(['c', 'd'])!.y - g.edge(['c', 'd'])!.points[0].y).toBe(
            1000 + 10 / 2
          );
        }
      });
    });
  });

  it('can layout long edge with label', () => {
    g.data!.ranksep = 300;
    g.setNode('a', {w: 50, h: 100} as ql.Ndata);
    g.setNode('b', {w: 75, h: 200} as ql.Ndata);
    g.setEdge(['a', 'b'], {
      w: 60,
      h: 70,
      minlen: 2,
      labelPos: 'c'
    } as ql.Edata);
    g.runLayout();
    expect(g.edge(['a', 'b'])!.x).toBe(75 / 2);
    expect(g.edge(['a', 'b'])!.y).toBeGreaterThan(g.node('a')!.y);
    expect(g.edge(['a', 'b'])!.y).toBeLessThan(g.node('b')!.y);
  });
  it('can layout short cycle', () => {
    g.data!.ranksep = 200;
    g.setNode('a', {w: 100, h: 100} as ql.Ndata);
    g.setNode('b', {w: 100, h: 100} as ql.Ndata);
    g.setEdge(['a', 'b'], {weight: 2} as ql.Edata);
    g.setEdge(['b', 'a']);
    g.runLayout();
    expect(coordsFrom(g)).toEqual({
      a: {x: 100 / 2, y: 100 / 2},
      b: {x: 100 / 2, y: 100 + 200 + 100 / 2}
    });
    expect(g.edge(['a', 'b'])!.points[1].y).toBeGreaterThan(
      g.edge(['a', 'b'])!.points[0].y
    );
    expect(g.edge(['b', 'a'])!.points[0].y).toBeGreaterThan(
      g.edge(['b', 'a'])!.points[1].y
    );
  });
  it('adds rect intersects for edges', () => {
    g.data!.ranksep = 200;
    g.setNode('a', {w: 100, h: 100} as ql.Ndata);
    g.setNode('b', {w: 100, h: 100} as ql.Ndata);
    g.setEdge(['a', 'b']);
    g.runLayout();
    const points = g.edge(['a', 'b'])!.points;
    expect(points.length).toBe(3);
    expect(points).toEqual([
      {x: 100 / 2, y: 100},
      {x: 100 / 2, y: 100 + 200 / 2},
      {x: 100 / 2, y: 100 + 200}
    ]);
  });
  it('adds rect intersects for edges spanning ranks', () => {
    g.data!.ranksep = 200;
    g.setNode('a', {w: 100, h: 100} as ql.Ndata);
    g.setNode('b', {w: 100, h: 100} as ql.Ndata);
    g.setEdge(['a', 'b'], {minlen: 2} as ql.Edata);
    g.runLayout();
    const points = g.edge(['a', 'b'])!.points;
    expect(points.length).toBe(5);
    expect(points).toEqual([
      {x: 100 / 2, y: 100},
      {x: 100 / 2, y: 100 + 200 / 2},
      {x: 100 / 2, y: 100 + 400 / 2},
      {x: 100 / 2, y: 100 + 600 / 2},
      {x: 100 / 2, y: 100 + 800 / 2}
    ]);
  });

  describe('can layout self loop', () => {
    ['tb', 'bt', 'lr', 'rl'].forEach(rd => {
      it('in rankdir = ' + rd, () => {
        g.data!.edgesep = 75;
        g.data!.rankdir = rd as qt.Dir;
        g.setNode('a', {w: 100, h: 100} as ql.Ndata);
        g.setEdge(['a', 'a'], {w: 50, h: 50} as ql.Edata);
        g.runLayout();
        const nodeA = g.node('a')!;
        const points = g.edge(['a', 'a'])!.points;
        expect(points.length).toBe(7);
        points.forEach(p => {
          if (rd !== 'lr' && rd !== 'rl') {
            expect(p.x).toBeGreaterThan(nodeA.x);
            expect(Math.abs(p.y - nodeA.y)).toBeLessThanOrEqual(nodeA.h / 2);
          } else {
            expect(p.y).toBeGreaterThan(nodeA.y);
            expect(Math.abs(p.x - nodeA.x)).toBeLessThanOrEqual(nodeA.w / 2);
          }
        });
      });
    });
  });

  it('can layout graph with subgraphs', () => {
    g.setNode('a', {w: 50, h: 50} as ql.Ndata);
    g.setParent('a', 'sg1');
    g.runLayout();
  });
  it('minimizes the height of subgraphs', () => {
    ['a', 'b', 'c', 'd', 'x', 'y'].forEach(n => {
      g.setNode(n, {w: 50, h: 50} as ql.Ndata);
    });
    g.setPath(['a', 'b', 'c', 'd']);
    g.setEdge(['a', 'x'], {w: 100} as ql.Edata);
    g.setEdge(['y', 'd'], {w: 100} as ql.Edata);
    g.setParent('x', 'sg');
    g.setParent('y', 'sg');
    g.runLayout();
    expect(g.node('x')!.y).toBe(g.node('y')!.y);
  });
  it('can layout subgraphs with different rankdirs', () => {
    g.setNode('a', {w: 50, h: 50} as ql.Ndata);
    g.setNode('sg', {} as ql.Ndata);
    g.setParent('a', 'sg');
    function check() {
      expect(g.node('sg')!.w).toBeGreaterThan(50);
      expect(g.node('sg')!.h).toBeGreaterThan(50);
      expect(g.node('sg')!.x).toBeGreaterThan(50 / 2);
      expect(g.node('sg')!.y).toBeGreaterThan(50 / 2);
    }
    ['tb', 'bt', 'lr', 'rl'].forEach(rd => {
      g.data!.rankdir = rd as qt.Dir;
      g.runLayout();
      check();
    });
  });
  it('adds dimensions to graph', () => {
    g.setNode('a', {w: 100, h: 50} as ql.Ndata);
    g.runLayout();
    expect(g.data!.w).toBe(100);
    expect(g.data!.h).toBe(50);
  });

  describe('ensures coords in bounding box for graph', () => {
    ['tb', 'bt', 'lr', 'rl'].forEach(rd => {
      describe(rd, () => {
        beforeEach(() => (g.data!.rankdir = rd as qt.Dir));
        it('node', () => {
          g.setNode('a', {w: 100, h: 200} as ql.Ndata);
          g.runLayout();
          expect(g.node('a')!.x).toBe(100 / 2);
          expect(g.node('a')!.y).toBe(200 / 2);
        });
        it('edge, labelpos = l', () => {
          g.setNode('a', {w: 100, h: 100} as ql.Ndata);
          g.setNode('b', {w: 100, h: 100} as ql.Ndata);
          g.setEdge(['a', 'b'], {
            w: 1000,
            h: 2000,
            labelPos: 'l',
            offset: 0
          } as ql.Edata);
          g.runLayout();
          if (rd === 'tb' || rd === 'bt') {
            expect(g.edge(['a', 'b'])!.x).toBe(1000 / 2);
          } else {
            expect(g.edge(['a', 'b'])!.y).toBe(2000 / 2);
          }
        });
      });
    });
  });

  it('ignores case', () => {
    g.data!.nodesep = 200;
    g.setNode('a', {w: 50, h: 100} as ql.Ndata);
    g.setNode('b', {w: 75, h: 200} as ql.Ndata);
    g.runLayout();
    expect(coordsFrom(g)).toEqual({
      a: {x: 50 / 2, y: 200 / 2},
      b: {x: 50 + 200 + 75 / 2, y: 200 / 2}
    });
  });
});

function coordsFrom(g: Graph) {
  const ns = g.nodes();
  return _.zipObject(
    ns,
    ns.map(n => _.pick(g.node(n), ['x', 'y']))
  );
}
