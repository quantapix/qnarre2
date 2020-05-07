/* eslint-disable @typescript-eslint/unbound-method */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qo from './order';
import * as qp from './position';
import * as qu from './utils';

interface Gdata extends qp.Gdata {
  foo: any;
}

interface Ndata extends qp.Ndata {
  foo: any;
}

interface Edata extends qp.Edata {
  foo: any;
}

type QP = qp.Graph<Gdata, Ndata, Edata>;
type QO = qo.Graph<Gdata, Ndata, Edata>;
type QG = qg.Graph<Gdata, Ndata, Edata>;

interface Graph extends QP, QO, QG {}
class Graph extends qg.Graph<Gdata, Ndata, Edata> {}
qu.applyMixins(Graph, [qp.Graph, qo.Graph, qg.Graph]);

describe('position', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({}).setData({} as Gdata);
  });
  describe('fakeConflicts', () => {
    let lays: string[][];
    beforeEach(() => {
      g.setDefEdge(() => ({} as Edata))
        .setNode('a', {rank: 0, order: 0} as Ndata)
        .setNode('b', {rank: 0, order: 1} as Ndata)
        .setNode('c', {rank: 1, order: 0} as Ndata)
        .setNode('d', {rank: 1, order: 1} as Ndata)
        .setEdge(['a', 'd'])
        .setEdge(['b', 'c']);
      lays = g.layMatrix();
    });
    it('does not mark edges that have no conflict', () => {
      g.delEdge(['a', 'd']);
      g.delEdge(['b', 'c']);
      g.setEdge(['a', 'c']);
      g.setEdge(['b', 'd']);
      const cs = g.fakeConflicts(lays);
      expect(cs.hasConflict('a', 'c')).toBeFalse;
      expect(cs.hasConflict('b', 'd')).toBeFalse;
    });
    it('does not mark no-fakes conflicts', () => {
      const cs = g.fakeConflicts(lays);
      expect(cs.hasConflict('a', 'd')).toBeFalse;
      expect(cs.hasConflict('b', 'c')).toBeFalse;
    });
    _.forEach(['a', 'b', 'c', 'd'], v => {
      it('does not mark no-fakes conflicts (' + v + ' is fake)', () => {
        g.node(v)!.fake = true;
        const cs = g.fakeConflicts(lays);
        expect(cs.hasConflict('a', 'd')).toBeFalse;
        expect(cs.hasConflict('b', 'c')).toBeFalse;
      });
    });
    _.forEach(['a', 'b', 'c', 'd'], v => {
      it('does mark fake conflicts (' + v + ' is not fake)', () => {
        _.forEach(['a', 'b', 'c', 'd'], w => {
          if (v !== w) g.node(w)!.fake = true;
        });
        const cs = g.fakeConflicts(lays);
        if (v === 'a' || v === 'd') {
          expect(cs.hasConflict('a', 'd')).toBeTrue;
          expect(cs.hasConflict('b', 'c')).toBeFalse;
        } else {
          expect(cs.hasConflict('a', 'd')).toBeFalse;
          expect(cs.hasConflict('b', 'c')).toBeTrue;
        }
      });
    });
    it('does not mark all fakes conflicts', () => {
      _.forEach(['a', 'b', 'c', 'd'], v => (g.node(v)!.fake = true));
      const cs = g.fakeConflicts(lays);
      expect(cs.hasConflict('a', 'd')).toBeFalse;
      expect(cs.hasConflict('b', 'c')).toBeFalse;
      g.fakeConflicts(lays);
    });
  });

  describe('allFakesConflicts', () => {
    let lays: string[][];
    beforeEach(() => {
      g.setDefEdge(() => ({} as Edata))
        .setNode('a', {rank: 0, order: 0} as Ndata)
        .setNode('b', {rank: 0, order: 1} as Ndata)
        .setNode('c', {rank: 1, order: 0} as Ndata)
        .setNode('d', {rank: 1, order: 1} as Ndata)
        .setEdge(['a', 'd'])
        .setEdge(['b', 'c']);
      lays = g.layMatrix();
    });
    it('marks all fakes conflicts favoring borders #1', () => {
      _.forEach(['a', 'd'], v => (g.node(v)!.fake = true));
      _.forEach(['b', 'c'], v => (g.node(v)!.fake = 'border'));
      const cs = g.type2Conflicts(lays);
      expect(cs.hasConflict('a', 'd')).toBeTrue;
      expect(cs.hasConflict('b', 'c')).toBeFalse;
      g.fakeConflicts(lays);
    });
    it('marks all fakes conflicts favoring borders #2', () => {
      _.forEach(['b', 'c'], v => (g.node(v)!.fake = true));
      _.forEach(['a', 'd'], v => (g.node(v)!.fake = 'border'));
      const cs = g.type2Conflicts(lays);
      expect(cs.hasConflict('a', 'd')).toBeFalse;
      expect(cs.hasConflict('b', 'c')).toBeTrue;
      g.fakeConflicts(lays);
    });
  });

  describe('hasConflict', () => {
    it('can test for type-1 conflict regardless of edge orientation', () => {
      const cs = new qp.Conflicts();
      cs.addConflict('b', 'a');
      expect(cs.hasConflict('a', 'b')).toBeTrue;
      expect(cs.hasConflict('b', 'a')).toBeTrue;
    });
    it('works for multiple conflicts with same node', () => {
      const cs = new qp.Conflicts();
      cs.addConflict('a', 'b');
      cs.addConflict('a', 'c');
      expect(cs.hasConflict('a', 'b')).toBeTrue;
      expect(cs.hasConflict('a', 'c')).toBeTrue;
    });
  });

  describe('nonCompound', () => {
    let g: Graph;
    beforeEach(() => {
      g = new Graph({isCompound: true, isMultiple: true});
    });
    it('copies all nodes', () => {
      g.setNode('a', {foo: 'bar'} as Ndata);
      g.setNode('b');
      const g2 = g.nonCompound();
      expect(g2.node('a')).toEqual({name: 'a', foo: 'bar'} as Ndata);
      expect(g2.hasNode('b')).toBeTrue;
    });
    it('copies all edges', () => {
      g.setEdge(['a', 'b'], {foo: 'bar'} as Edata);
      g.setEdge(['a', 'b', 'multi'], {foo: 'baz'} as Edata);
      const g2 = g.nonCompound();
      expect(g2.edge(['a', 'b'])).toEqual({name: 'a:b', foo: 'bar'} as Edata);
      expect(g2.edge(['a', 'b', 'multi'])).toEqual({
        name: 'a:b:multi',
        foo: 'baz'
      } as Edata);
    });
    it('does not copy compound nodes', () => {
      g.setParent('a', 'sg1');
      const g2 = g.nonCompound();
      expect(g2.parent(g)).toBeUndefined;
      expect(g2.isCompound).toBeFalse;
    });
    it('copies graph object', () => {
      g.setData({foo: 'bar'} as Gdata);
      const g2 = g.nonCompound();
      expect(g2.data).toEqual({foo: 'bar'} as Gdata);
    });
  });

  describe('vertical', () => {
    it('aligns with itself if node has no adjacencies', () => {
      g.setNode('a', {rank: 0, order: 0} as Ndata);
      g.setNode('b', {rank: 1, order: 0} as Ndata);
      const lays = g.layMatrix();
      const cs = new qp.Conflicts();
      const result = qp.columns(lays, cs, g.preds.bind(g));
      expect(result).toEqual({
        roots: asMap({a: 'a', b: 'b'}),
        cols: asMap({a: 'a', b: 'b'})
      });
    });
    it('aligns with its sole adjacency', () => {
      g.setNode('a', {rank: 0, order: 0} as Ndata);
      g.setNode('b', {rank: 1, order: 0} as Ndata);
      g.setEdge(['a', 'b']);
      const lays = g.layMatrix();
      const cs = new qp.Conflicts();
      const result = qp.columns(lays, cs, g.preds.bind(g));
      expect(result).toEqual({
        roots: asMap({a: 'a', b: 'a'}),
        cols: asMap({a: 'b', b: 'a'})
      });
    });
    it('aligns with its left median when possible', () => {
      g.setNode('a', {rank: 0, order: 0} as Ndata);
      g.setNode('b', {rank: 0, order: 1} as Ndata);
      g.setNode('c', {rank: 1, order: 0} as Ndata);
      g.setEdge(['a', 'c']);
      g.setEdge(['b', 'c']);
      const lays = g.layMatrix();
      const cs = new qp.Conflicts();
      const result = qp.columns(lays, cs, g.preds.bind(g));
      expect(result).toEqual({
        roots: asMap({a: 'a', b: 'b', c: 'a'}),
        cols: asMap({a: 'c', b: 'b', c: 'a'})
      });
    });
    it('aligns correctly regardless of node name / insertion order', () => {
      g.setNode('b', {rank: 0, order: 1} as Ndata);
      g.setNode('c', {rank: 1, order: 0} as Ndata);
      g.setNode('z', {rank: 0, order: 0} as Ndata);
      g.setEdge(['z', 'c']);
      g.setEdge(['b', 'c']);
      const lays = g.layMatrix();
      const cs = new qp.Conflicts();
      const result = qp.columns(lays, cs, g.preds.bind(g));
      expect(result).toEqual({
        roots: asMap({z: 'z', b: 'b', c: 'z'}),
        cols: asMap({z: 'c', b: 'b', c: 'z'})
      });
    });
    it('aligns with its right median when left is unavailable', () => {
      g.setNode('a', {rank: 0, order: 0} as Ndata);
      g.setNode('b', {rank: 0, order: 1} as Ndata);
      g.setNode('c', {rank: 1, order: 0} as Ndata);
      g.setEdge(['a', 'c']);
      g.setEdge(['b', 'c']);
      const lays = g.layMatrix();
      const cs = new qp.Conflicts();
      cs.addConflict('a', 'c');
      const result = qp.columns(lays, cs, g.preds.bind(g));
      expect(result).toEqual({
        roots: asMap({a: 'a', b: 'b', c: 'b'}),
        cols: asMap({a: 'a', b: 'c', c: 'b'})
      });
    });
    it('aligns with neither median if both are unavailable', () => {
      g.setNode('a', {rank: 0, order: 0} as Ndata);
      g.setNode('b', {rank: 0, order: 1} as Ndata);
      g.setNode('c', {rank: 1, order: 0} as Ndata);
      g.setNode('d', {rank: 1, order: 1} as Ndata);
      g.setEdge(['a', 'd']);
      g.setEdge(['b', 'c']);
      g.setEdge(['b', 'd']);
      const lays = g.layMatrix();
      const cs = new qp.Conflicts();
      const result = qp.columns(lays, cs, g.preds.bind(g));
      expect(result).toEqual({
        roots: asMap({a: 'a', b: 'b', c: 'b', d: 'd'}),
        cols: asMap({a: 'a', b: 'c', c: 'b', d: 'd'})
      });
    });
    it('aligns with single median for odd number of adjacencies', () => {
      g.setNode('a', {rank: 0, order: 0} as Ndata);
      g.setNode('b', {rank: 0, order: 1} as Ndata);
      g.setNode('c', {rank: 0, order: 2} as Ndata);
      g.setNode('d', {rank: 1, order: 0} as Ndata);
      g.setEdge(['a', 'd']);
      g.setEdge(['b', 'd']);
      g.setEdge(['c', 'd']);
      const lays = g.layMatrix();
      const cs = new qp.Conflicts();
      const result = qp.columns(lays, cs, g.preds.bind(g));
      expect(result).toEqual({
        roots: asMap({a: 'a', b: 'b', c: 'c', d: 'b'}),
        cols: asMap({a: 'a', b: 'd', c: 'c', d: 'b'})
      });
    });
    it('aligns blocks across multiple layers', () => {
      g.setNode('a', {rank: 0, order: 0} as Ndata);
      g.setNode('b', {rank: 1, order: 0} as Ndata);
      g.setNode('c', {rank: 1, order: 1} as Ndata);
      g.setNode('d', {rank: 2, order: 0} as Ndata);
      g.setPath(['a', 'b', 'd']);
      g.setPath(['a', 'c', 'd']);
      const lays = g.layMatrix();
      const cs = new qp.Conflicts();
      const result = qp.columns(lays, cs, g.preds.bind(g));
      expect(result).toEqual({
        roots: asMap({a: 'a', b: 'a', c: 'c', d: 'a'}),
        cols: asMap({a: 'b', b: 'd', c: 'c', d: 'a'})
      });
    });
  });

  describe('horizontal', () => {
    it('places center of single node graph at origin', () => {
      const rs = asMap({a: 'a'});
      const cs = asMap({a: 'a'});
      g.setNode('a', {rank: 0, order: 0} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
    });
    it('separates adjacent nodes by specified node separation', () => {
      const rs = asMap({a: 'a', b: 'b'});
      const cs = asMap({a: 'a', b: 'b'});
      g.data!.nodesep = 100;
      g.setNode('a', {rank: 0, order: 0, w: 100} as Ndata);
      g.setNode('b', {rank: 0, order: 1, w: 200} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
      expect(xs.get('b')).toBe(100 / 2 + 100 + 200 / 2);
    });
    it('separates adjacent edges by specified node separation', () => {
      const rs = asMap({a: 'a', b: 'b'});
      const cs = asMap({a: 'a', b: 'b'});
      g.data!.edgesep = 20;
      g.setNode('a', {rank: 0, order: 0, w: 100, fake: true} as Ndata);
      g.setNode('b', {rank: 0, order: 1, w: 200, fake: true} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
      expect(xs.get('b')).toBe(100 / 2 + 20 + 200 / 2);
    });
    it('aligns centers of nodes in same block', () => {
      const rs = asMap({a: 'a', b: 'a'});
      const cs = asMap({a: 'b', b: 'a'});
      g.setNode('a', {rank: 0, order: 0, w: 100} as Ndata);
      g.setNode('b', {rank: 1, order: 0, w: 200} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
      expect(xs.get('b')).toBe(0);
    });
    it('separates blocks with appropriate separation', () => {
      const rs = asMap({a: 'a', b: 'a', c: 'c'});
      const cs = asMap({a: 'b', b: 'a', c: 'c'});
      g.data!.nodesep = 75;
      g.setNode('a', {rank: 0, order: 0, w: 100} as Ndata);
      g.setNode('b', {rank: 1, order: 1, w: 200} as Ndata);
      g.setNode('c', {rank: 1, order: 0, w: 50} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(50 / 2 + 75 + 200 / 2);
      expect(xs.get('b')).toBe(50 / 2 + 75 + 200 / 2);
      expect(xs.get('c')).toBe(0);
    });
    it('separates classes with appropriate separation', () => {
      const rs = asMap({a: 'a', b: 'b', c: 'c', d: 'b'});
      const cs = asMap({a: 'a', b: 'd', c: 'c', d: 'b'});
      g.data!.nodesep = 75;
      g.setNode('a', {rank: 0, order: 0, w: 100} as Ndata);
      g.setNode('b', {rank: 0, order: 1, w: 200} as Ndata);
      g.setNode('c', {rank: 1, order: 0, w: 50} as Ndata);
      g.setNode('d', {rank: 1, order: 1, w: 80} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
      expect(xs.get('b')).toBe(100 / 2 + 75 + 200 / 2);
      expect(xs.get('c')).toBe(100 / 2 + 75 + 200 / 2 - 80 / 2 - 75 - 50 / 2);
      expect(xs.get('d')).toBe(100 / 2 + 75 + 200 / 2);
    });
    it('shifts classes by max sep from adjacent block #1', () => {
      const rs = asMap({a: 'a', b: 'b', c: 'a', d: 'b'});
      const cs = asMap({a: 'c', b: 'd', c: 'a', d: 'b'});
      g.data!.nodesep = 75;
      g.setNode('a', {rank: 0, order: 0, w: 50} as Ndata);
      g.setNode('b', {rank: 0, order: 1, w: 150} as Ndata);
      g.setNode('c', {rank: 1, order: 0, w: 60} as Ndata);
      g.setNode('d', {rank: 1, order: 1, w: 70} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
      expect(xs.get('b')).toBe(50 / 2 + 75 + 150 / 2);
      expect(xs.get('c')).toBe(0);
      expect(xs.get('d')).toBe(50 / 2 + 75 + 150 / 2);
    });
    it('shifts classes by max sep from adjacent block #2', () => {
      const rs = asMap({a: 'a', b: 'b', c: 'a', d: 'b'});
      const cs = asMap({a: 'c', b: 'd', c: 'a', d: 'b'});
      g.data!.nodesep = 75;
      g.setNode('a', {rank: 0, order: 0, w: 50} as Ndata);
      g.setNode('b', {rank: 0, order: 1, w: 70} as Ndata);
      g.setNode('c', {rank: 1, order: 0, w: 60} as Ndata);
      g.setNode('d', {rank: 1, order: 1, w: 150} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
      expect(xs.get('b')).toBe(60 / 2 + 75 + 150 / 2);
      expect(xs.get('c')).toBe(0);
      expect(xs.get('d')).toBe(60 / 2 + 75 + 150 / 2);
    });
    it('cascades class shift', () => {
      const rs = asMap({
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
        e: 'b',
        f: 'f',
        g: 'd'
      });
      const cs = asMap({
        a: 'a',
        b: 'e',
        c: 'c',
        d: 'g',
        e: 'b',
        f: 'f',
        g: 'd'
      });
      g.data!.nodesep = 75;
      g.setNode('a', {rank: 0, order: 0, w: 50} as Ndata);
      g.setNode('b', {rank: 0, order: 1, w: 50} as Ndata);
      g.setNode('c', {rank: 1, order: 0, w: 50} as Ndata);
      g.setNode('d', {rank: 1, order: 1, w: 50} as Ndata);
      g.setNode('e', {rank: 1, order: 2, w: 50} as Ndata);
      g.setNode('f', {rank: 2, order: 0, w: 50} as Ndata);
      g.setNode('g', {rank: 2, order: 1, w: 50} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(xs.get('b')! - 50 / 2 - 75 - 50 / 2);
      expect(xs.get('b')).toBe(xs.get('e')!);
      expect(xs.get('c')).toBe(xs.get('f')!);
      expect(xs.get('d')).toBe(xs.get('c')! + 50 / 2 + 75 + 50 / 2);
      expect(xs.get('e')).toBe(xs.get('d')! + 50 / 2 + 75 + 50 / 2);
      expect(xs.get('g')).toBe(xs.get('f')! + 50 / 2 + 75 + 50 / 2);
    });
    it('handles labelpos = l', () => {
      const rs = asMap({a: 'a', b: 'b', c: 'c'});
      const cs = asMap({a: 'a', b: 'b', c: 'c'});
      g.data!.edgesep = 50;
      g.setNode('a', {rank: 0, order: 0, w: 100, fake: 'edge'} as Ndata);
      g.setNode('b', {
        rank: 0,
        order: 1,
        w: 200,
        fake: 'edge-label',
        labelPos: 'l'
      } as Ndata);
      g.setNode('c', {rank: 0, order: 2, w: 300, fake: 'edge'} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
      expect(xs.get('b')).toBe(xs.get('a')! + 100 / 2 + 50 + 200);
      expect(xs.get('c')).toBe(xs.get('b')! + 0 + 50 + 300 / 2);
    });
    it('handles labelpos = c', () => {
      const rs = asMap({a: 'a', b: 'b', c: 'c'});
      const cs = asMap({a: 'a', b: 'b', c: 'c'});
      g.data!.edgesep = 50;
      g.setNode('a', {rank: 0, order: 0, w: 100, fake: 'edge'} as Ndata);
      g.setNode('b', {
        rank: 0,
        order: 1,
        w: 200,
        fake: 'edge-label',
        labelPos: 'c'
      } as Ndata);
      g.setNode('c', {rank: 0, order: 2, w: 300, fake: 'edge'} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
      expect(xs.get('b')).toBe(xs.get('a')! + 100 / 2 + 50 + 200 / 2);
      expect(xs.get('c')).toBe(xs.get('b')! + 200 / 2 + 50 + 300 / 2);
    });
    it('handles labelpos = r', () => {
      const rs = asMap({a: 'a', b: 'b', c: 'c'});
      const cs = asMap({a: 'a', b: 'b', c: 'c'});
      g.data!.edgesep = 50;
      g.setNode('a', {rank: 0, order: 0, w: 100, fake: 'edge'} as Ndata);
      g.setNode('b', {
        rank: 0,
        order: 1,
        w: 200,
        fake: 'edge-label',
        labelPos: 'r'
      } as Ndata);
      g.setNode('c', {rank: 0, order: 2, w: 300, fake: 'edge'} as Ndata);
      const xs = g.horizontal(g.layMatrix(), rs, cs);
      expect(xs.get('a')).toBe(0);
      expect(xs.get('b')).toBe(xs.get('a')! + 100 / 2 + 50 + 0);
      expect(xs.get('c')).toBe(xs.get('b')! + 200 + 50 + 300 / 2);
    });
  });

  describe('alignCoordinates', () => {
    it('aligns single node', () => {
      const xss = asMapMap({
        ul: {a: 50},
        ur: {a: 100},
        dl: {a: 50},
        dr: {a: 200}
      });
      qp.align(xss, xss.get('ul'));
      expect(xss.get('ul')).toEqual(asMap({a: 50}));
      expect(xss.get('ur')).toEqual(asMap({a: 50}));
      expect(xss.get('dl')).toEqual(asMap({a: 50}));
      expect(xss.get('dr')).toEqual(asMap({a: 50}));
    });
    it('aligns multiple nodes', () => {
      const xss = asMapMap({
        ul: {a: 50, b: 1000},
        ur: {a: 100, b: 900},
        dl: {a: 150, b: 800},
        dr: {a: 200, b: 700}
      });
      qp.align(xss, xss.get('ul'));
      expect(xss.get('ul')).toEqual(asMap({a: 50, b: 1000}));
      expect(xss.get('ur')).toEqual(asMap({a: 200, b: 1000}));
      expect(xss.get('dl')).toEqual(asMap({a: 50, b: 700}));
      expect(xss.get('dr')).toEqual(asMap({a: 500, b: 1000}));
    });
  });

  describe('thinnest', () => {
    it('finds alignment with smallest width', () => {
      g.setNode('a', {w: 50} as Ndata);
      g.setNode('b', {w: 50} as Ndata);
      const xss = asMapMap({
        ul: {a: 0, b: 1000},
        ur: {a: -5, b: 1000},
        dl: {a: 5, b: 2000},
        dr: {a: 0, b: 200}
      });
      expect(g.thinnest(xss)).toEqual(xss.get('dr'));
    });
    it('takes node width into account', () => {
      g.setNode('a', {w: 50} as Ndata);
      g.setNode('b', {w: 50} as Ndata);
      g.setNode('c', {w: 200} as Ndata);
      const xss = asMapMap({
        ul: {a: 0, b: 100, c: 75},
        ur: {a: 0, b: 100, c: 80},
        dl: {a: 0, b: 100, c: 85},
        dr: {a: 0, b: 100, c: 90}
      });
      expect(g.thinnest(xss)).toEqual(xss.get('ul'));
    });
  });

  describe('balance', () => {
    it('aligns single node to shared median value', () => {
      const xss = asMapMap({
        ul: {a: 0},
        ur: {a: 100},
        dl: {a: 100},
        dr: {a: 200}
      });
      expect(qp.balance(xss)).toEqual(asMap({a: 100}));
    });
    it('aligns single node to average of different median values', () => {
      const xss = asMapMap({
        ul: {a: 0},
        ur: {a: 75},
        dl: {a: 125},
        dr: {a: 200}
      });
      expect(qp.balance(xss)).toEqual(asMap({a: 100}));
    });
    it('balances multiple nodes', () => {
      const xss = asMapMap({
        ul: {a: 0, b: 50},
        ur: {a: 75, b: 0},
        dl: {a: 125, b: 60},
        dr: {a: 200, b: 75}
      });
      expect(qp.balance(xss)).toEqual(asMap({a: 100, b: 55}));
    });
  });

  describe('posX', () => {
    it('positions a single node at origin', () => {
      g.setNode('a', {rank: 0, order: 0, w: 100} as Ndata);
      expect(g.posX()).toEqual(asMap({a: 0}));
    });
    it('positions a single node block at origin', () => {
      g.setNode('a', {rank: 0, order: 0, w: 100} as Ndata);
      g.setNode('b', {rank: 1, order: 0, w: 100} as Ndata);
      g.setEdge(['a', 'b']);
      expect(g.posX()).toEqual(asMap({a: 0, b: 0}));
    });
    it('positions a single node block at origin even when their sizes differ', () => {
      g.setNode('a', {rank: 0, order: 0, w: 40} as Ndata);
      g.setNode('b', {rank: 1, order: 0, w: 500} as Ndata);
      g.setNode('c', {rank: 2, order: 0, w: 20} as Ndata);
      g.setPath(['a', 'b', 'c']);
      expect(g.posX()).toEqual(asMap({a: 0, b: 0, c: 0}));
    });
    it('centers a node if it is a predecessor of two same sized nodes', () => {
      g.data!.nodesep = 10;
      g.setNode('a', {rank: 0, order: 0, w: 20} as Ndata);
      g.setNode('b', {rank: 1, order: 0, w: 50} as Ndata);
      g.setNode('c', {rank: 1, order: 1, w: 50} as Ndata);
      g.setEdge(['a', 'b']);
      g.setEdge(['a', 'c']);
      const pos = g.posX();
      const a = pos.get('a')!;
      expect(pos).toEqual(asMap({a: a, b: a - (25 + 5), c: a + (25 + 5)}));
    });
    it('shifts blocks on both sides of aligned block', () => {
      g.data!.nodesep = 10;
      g.setNode('a', {rank: 0, order: 0, w: 50} as Ndata);
      g.setNode('b', {rank: 0, order: 1, w: 60} as Ndata);
      g.setNode('c', {rank: 1, order: 0, w: 70} as Ndata);
      g.setNode('d', {rank: 1, order: 1, w: 80} as Ndata);
      g.setEdge(['b', 'c']);
      const pos = g.posX();
      const b = pos.get('b')!;
      const c = b;
      expect(pos).toEqual(
        asMap({
          a: b - 60 / 2 - 10 - 50 / 2,
          b: b,
          c: c,
          d: c + 70 / 2 + 10 + 80 / 2
        })
      );
    });
    it('aligns inner segments', () => {
      g.data!.nodesep = 10;
      g.setNode('a', {rank: 0, order: 0, w: 50, fake: true} as Ndata);
      g.setNode('b', {rank: 0, order: 1, w: 60} as Ndata);
      g.setNode('c', {rank: 1, order: 0, w: 70} as Ndata);
      g.setNode('d', {rank: 1, order: 1, w: 80, fake: true} as Ndata);
      g.setEdge(['b', 'c']);
      g.setEdge(['a', 'd']);
      const pos = g.posX();
      const a = pos.get('a')!;
      const d = a;
      expect(pos).toEqual(
        asMap({
          a: a,
          b: a + 50 / 2 + 10 + 60 / 2,
          c: d - 70 / 2 - 10 - 80 / 2,
          d: d
        })
      );
    });
  });
});

function asMap(x: any) {
  return new Map<string, any>(Object.entries(x));
}

function asMapMap(x: any) {
  const m = new Map<string, any>(Object.entries(x));
  Array.from(m.keys()).forEach(k => m.set(k, asMap(m.get(k))));
  return m;
}

describe('position', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({isCompound: true}).setData({
      ranksep: 50,
      nodesep: 50,
      edgesep: 10
    } as Gdata);
  });
  it('respects ranksep', () => {
    g.data!.ranksep = 1000;
    g.setNode('a', {w: 50, h: 100, rank: 0, order: 0} as Ndata);
    g.setNode('b', {w: 50, h: 80, rank: 1, order: 0} as Ndata);
    g.setEdge(['a', 'b']);
    g.runPosition();
    expect(g.node('b')!.y).toBe(100 + 1000 + 80 / 2);
  });
  it('use the largest height in each rank with ranksep', () => {
    g.data!.ranksep = 1000;
    g.setNode('a', {w: 50, h: 100, rank: 0, order: 0} as Ndata);
    g.setNode('b', {w: 50, h: 80, rank: 0, order: 1} as Ndata);
    g.setNode('c', {w: 50, h: 90, rank: 1, order: 0} as Ndata);
    g.setEdge(['a', 'c']);
    g.runPosition();
    expect(g.node('a')!.y).toBe(100 / 2);
    expect(g.node('b')!.y).toBe(100 / 2);
    expect(g.node('c')!.y).toBe(100 + 1000 + 90 / 2);
  });
  it('respects nodesep', () => {
    g.data!.nodesep = 1000;
    g.setNode('a', {w: 50, h: 100, rank: 0, order: 0} as Ndata);
    g.setNode('b', {w: 70, h: 80, rank: 0, order: 1} as Ndata);
    g.runPosition();
    expect(g.node('b')!.x).toBe(g.node('a')!.x + 50 / 2 + 1000 + 70 / 2);
  });
  it('should not try to position the subgraph node itself', () => {
    g.setNode('a', {w: 50, h: 50, rank: 0, order: 0} as Ndata);
    g.setNode('sg1', {} as Ndata);
    g.setParent('a', 'sg1');
    g.runPosition();
    expect(_.has(g.node('sg1'), 'x')).toBeTruthy;
    expect(_.has(g.node('sg1'), 'y')).toBeTruthy;
  });
});
