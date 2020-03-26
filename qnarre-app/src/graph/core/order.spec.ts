import * as _ from 'lodash';

import * as qg from './graph';
import * as qo from './order';
import * as qt from './types';
import * as qu from './utils';
import * as qs from './sort';

interface Ndata extends qo.Ndata {
  foo: any;
}

type QO = qo.Graph<qo.Gdata, Ndata, qo.Edata>;
type QS = qs.Graph<qo.Gdata, Ndata, qo.Edata>;
type QG = qg.Graph<qo.Gdata, Ndata, qo.Edata>;

interface Graph extends QO, QS, QG {}
class Graph extends qg.Graph<qo.Gdata, Ndata, qo.Edata> {}
qu.applyMixins(Graph, [qo.Graph, qs.Graph, qg.Graph]);

describe('order', () => {
  let g: Graph;

  beforeEach(() => {
    g = new Graph({isCompound: true}).setDefEdge({
      weight: 1
    } as qo.Edata);
  });

  describe('initOrder', () => {
    it('assigns non-overlapping orders for each rank in a tree', () => {
      new Map(Object.entries({a: 0, b: 1, c: 2, d: 2, e: 1})).forEach(
        (r, n) => {
          g.setNode(n, {rank: r} as Ndata);
        }
      );
      g.setPath(['a', 'b', 'c']);
      g.setEdge(['b', 'd']);
      g.setEdge(['a', 'e']);
      const lays = g.orderInit();
      expect(lays[0]).toEqual(['a']);
      expect(lays[1].sort(qu.sorter)).toEqual(['b', 'e']);
      expect(lays[2].sort(qu.sorter)).toEqual(['c', 'd']);
    });
    it('assigns non-overlapping orders for each rank in a DAG', () => {
      new Map(Object.entries({a: 0, b: 1, c: 1, d: 2})).forEach((r, n) => {
        g.setNode(n, {rank: r} as Ndata);
      });
      g.setPath(['a', 'b', 'd']);
      g.setPath(['a', 'c', 'd']);
      const lays = g.orderInit();
      expect(lays[0]).toEqual(['a']);
      expect(lays[1].sort(qu.sorter)).toEqual(['b', 'c']);
      expect(lays[2].sort(qu.sorter)).toEqual(['d']);
    });
    it('does not assign an order to subgraph nodes', () => {
      g.setNode('a', {rank: 0} as Ndata);
      g.setNode('sg1', {} as Ndata);
      g.setParent('a', 'sg1');
      const lays = g.orderInit();
      expect(lays).toEqual([['a']]);
    });
  });

  describe('order', () => {
    it('does not add crossings to a tree structure', () => {
      g.setNode('a', {rank: 1} as Ndata);
      ['b', 'e'].forEach(n => {
        g.setNode(n, {rank: 2} as Ndata);
      });
      ['c', 'd', 'f'].forEach(n => {
        g.setNode(n, {rank: 3} as Ndata);
      });
      g.setPath(['a', 'b', 'c']);
      g.setEdge(['b', 'd']);
      g.setPath(['a', 'e', 'f']);
      const lm = g.runOrder().layMatrix();
      expect(g.crossCount(lm)).toBe(0);
    });
    it('can solve a simple graph', () => {
      ['a', 'd'].forEach(n => {
        g.setNode(n, {rank: 1} as Ndata);
      });
      ['b', 'f', 'e'].forEach(n => {
        g.setNode(n, {rank: 2} as Ndata);
      });
      ['c', 'g'].forEach(n => {
        g.setNode(n, {rank: 3} as Ndata);
      });
      const lm = g.runOrder().layMatrix();
      expect(g.crossCount(lm)).toBe(0);
    });
    it('can minimize crossings', () => {
      g.setNode('a', {rank: 1} as Ndata);
      ['b', 'e', 'g'].forEach(n => {
        g.setNode(n, {rank: 2} as Ndata);
      });
      ['c', 'f', 'h'].forEach(n => {
        g.setNode(n, {rank: 3} as Ndata);
      });
      g.setNode('d', {rank: 4} as Ndata);
      const lm = g.runOrder().layMatrix();
      expect(g.crossCount(lm)).toBeLessThanOrEqual(1);
    });
  });

  describe('layer', () => {
    beforeEach(() => {
      g = new Graph({isCompound: true, isMultiple: true});
    });
    it('places movable nodes with no parents under the root node', () => {
      g.setNode('a', {rank: 1} as Ndata);
      g.setNode('b', {rank: 1} as Ndata);
      g.setNode('c', {rank: 2} as Ndata);
      g.setNode('d', {rank: 3} as Ndata);
      const lg = g.layer(1, true);
      expect(lg.hasNode(lg.data!.root));
      expect(lg.children()).toEqual([lg.data!.root]);
      expect(lg.children(lg.data!.root)).toEqual(['a', 'b']);
    });
    it('copies flat nodes from the layer to the graph', () => {
      g.setNode('a', {rank: 1} as Ndata);
      g.setNode('b', {rank: 1} as Ndata);
      g.setNode('c', {rank: 2} as Ndata);
      g.setNode('d', {rank: 3} as Ndata);
      expect(g.layer(1, true).nodes()).toContain('a');
      expect(g.layer(1, true).nodes()).toContain('b');
      expect(g.layer(2, true).nodes()).toContain('c');
      expect(g.layer(3, true).nodes()).toContain('d');
    });
    it('uses the original node label for copied nodes', () => {
      g.setNode('a', {foo: 1, rank: 1} as Ndata);
      g.setNode('b', {foo: 2, rank: 2} as Ndata);
      g.setEdge(['a', 'b'], {weight: 1} as qo.Edata);
      const lg = g.layer(2, true);
      expect((<Ndata>lg.node('a')!).foo).toBe(1);
      (<Ndata>g.node('a')!).foo = 'updated';
      expect((<Ndata>lg.node('a')!).foo).toBe('updated');
      expect((<Ndata>lg.node('b')!).foo).toBe(2);
      (<Ndata>g.node('b')!).foo = 'updated';
      expect((<Ndata>lg.node('b')!).foo).toBe('updated');
    });
    it('copies edges incident on rank nodes to graph', () => {
      g.setNode('a', {rank: 1} as Ndata);
      g.setNode('b', {rank: 1} as Ndata);
      g.setNode('c', {rank: 2} as Ndata);
      g.setNode('d', {rank: 3} as Ndata);
      g.setEdge(['a', 'c'], {weight: 2} as qo.Edata);
      g.setEdge(['b', 'c'], {weight: 3} as qo.Edata);
      g.setEdge(['c', 'd'], {weight: 4} as qo.Edata);
      expect(g.layer(1, true).edgeCount).toBe(0);
      expect(g.layer(2, true).edgeCount).toBe(2);
      expect(g.layer(2, true).edge(['a', 'c'])).toEqual({
        name: 'a:c',
        weight: 2
      } as qo.Edata);
      expect(g.layer(2, true).edge(['b', 'c'])).toEqual({
        name: 'b:c',
        weight: 3
      } as qo.Edata);
      expect(g.layer(3, true).edgeCount).toBe(1);
      expect(g.layer(3, true).edge(['c', 'd'])).toEqual({
        name: 'c:d',
        weight: 4
      } as qo.Edata);
    });
    it('copies edges incident on rank nodes to graph', () => {
      g.setNode('a', {rank: 1} as Ndata);
      g.setNode('b', {rank: 1} as Ndata);
      g.setNode('c', {rank: 2} as Ndata);
      g.setNode('d', {rank: 3} as Ndata);
      g.setEdge(['a', 'c'], {weight: 2} as qo.Edata);
      g.setEdge(['b', 'c'], {weight: 3} as qo.Edata);
      g.setEdge(['c', 'd'], {weight: 4} as qo.Edata);
      expect(g.layer(1, false).edgeCount).toBe(2);
      expect(g.layer(1, false).edge(['c', 'a'])).toEqual({
        name: 'c:a',
        weight: 2
      } as qo.Edata);
      expect(g.layer(1, false).edge(['c', 'b'])).toEqual({
        name: 'c:b',
        weight: 3
      } as qo.Edata);
      expect(g.layer(2, false).edgeCount).toBe(1);
      expect(g.layer(2, false).edge(['d', 'c'])).toEqual({
        name: 'd:c',
        weight: 4
      } as qo.Edata);
      expect(g.layer(3, false).edgeCount).toBe(0);
    });
    it('collapses multi-edges', () => {
      g.setNode('a', {rank: 1} as Ndata);
      g.setNode('b', {rank: 2} as Ndata);
      g.setEdge(['a', 'b'], {weight: 2} as qo.Edata);
      g.setEdge(['a', 'b', 'multi'], {weight: 3} as qo.Edata);
      expect(g.layer(2, true).edge(['a', 'b'])).toEqual({
        name: 'a:b',
        weight: 5
      } as qo.Edata);
    });
    it('preserves hierarchy for the movable layer', () => {
      g.setNode('a', {rank: 0} as Ndata);
      g.setNode('b', {rank: 0} as Ndata);
      g.setNode('c', {rank: 0} as Ndata);
      g.setNode('sg', {
        minRank: 0,
        maxRank: 0,
        border: {left: ['bl'], right: ['br']} as qt.Border
      } as Ndata);
      ['a', 'b'].forEach(n => {
        g.setParent(n, 'sg');
      });
      const lg = g.layer(0, true);
      const root = lg.data!.root;
      expect(lg.children(root)?.sort(qu.sorter)).toEqual(['c', 'sg']);
      expect(lg.parent('a')).toBe('sg');
      expect(lg.parent('b')).toBe('sg');
    });
  });

  describe('crossCount', () => {
    beforeEach(() => {
      g = new Graph({}).setDefEdge(() => {
        return {weight: 1} as qo.Edata;
      });
    });
    it('returns 0 for an empty layering', () => {
      expect(g.crossCount([])).toBe(0);
    });
    it('returns 0 for a layering with no crossings', () => {
      g.setEdge(['a1', 'b1']);
      g.setEdge(['a2', 'b2']);
      expect(
        g.crossCount([
          ['a1', 'a2'],
          ['b1', 'b2']
        ])
      ).toBe(0);
    });
    it('returns 1 for a layering with 1 crossing', () => {
      g.setEdge(['a1', 'b1']);
      g.setEdge(['a2', 'b2']);
      expect(
        g.crossCount([
          ['a1', 'a2'],
          ['b2', 'b1']
        ])
      ).toBe(1);
    });
    it('returns a weighted crossing count for a layering with 1 crossing', () => {
      g.setEdge(['a1', 'b1'], {weight: 2} as qo.Edata);
      g.setEdge(['a2', 'b2'], {weight: 3} as qo.Edata);
      expect(
        g.crossCount([
          ['a1', 'a2'],
          ['b2', 'b1']
        ])
      ).toBe(6);
    });
    it('calculates crossings across layers', () => {
      g.setPath(['a1', 'b1', 'c1']);
      g.setPath(['a2', 'b2', 'c2']);
      expect(
        g.crossCount([
          ['a1', 'a2'],
          ['b2', 'b1'],
          ['c1', 'c2']
        ])
      ).toBe(2);
    });
    it('works for graph #1', () => {
      g.setPath(['a', 'b', 'c']);
      g.setPath(['d', 'e', 'c']);
      g.setPath(['a', 'f', 'i']);
      g.setEdge(['a', 'e']);
      expect(
        g.crossCount([
          ['a', 'd'],
          ['b', 'e', 'f'],
          ['c', 'i']
        ])
      ).toBe(1);
      expect(
        g.crossCount([
          ['d', 'a'],
          ['e', 'b', 'f'],
          ['c', 'i']
        ])
      ).toBe(0);
    });
  });

  describe('layMatrix', () => {
    it('creates a matrix based on rank and order of nodes in the graph', () => {
      g.setNode('a', {rank: 0, order: 0} as Ndata);
      g.setNode('b', {rank: 0, order: 1} as Ndata);
      g.setNode('c', {rank: 1, order: 0} as Ndata);
      g.setNode('d', {rank: 1, order: 1} as Ndata);
      g.setNode('e', {rank: 2, order: 0} as Ndata);
      expect(g.layMatrix()).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    });
  });

  describe('subConstraints', () => {
    let cg: Graph;
    beforeEach(() => {
      g = new Graph({isCompound: true});
      cg = new Graph({});
    });
    it('does not change CG for a flat set of nodes', () => {
      const ns = ['a', 'b', 'c', 'd'];
      ns.forEach(n => {
        g.setNode(n);
      });
      g.subConstraints(cg, ns);
      expect(cg.nodeCount).toBe(0);
      expect(cg.edgeCount).toBe(0);
    });
    it("doesn't create a constraint for contiguous subgraph nodes", () => {
      const ns = ['a', 'b', 'c'];
      ns.forEach(n => {
        g.setParent(n, 'sg');
      });
      g.subConstraints(cg, ns);
      expect(cg.nodeCount).toBe(0);
      expect(cg.edgeCount).toBe(0);
    });
    it('adds a constraint when the parents for adjacent nodes are different', () => {
      const ns = ['a', 'b'];
      g.setParent('a', 'sg1');
      g.setParent('b', 'sg2');
      g.subConstraints(cg, ns);
      expect(cg.edges()).toEqual([new qg.Link(['sg1', 'sg2'], cg).edge]);
    });
    it('works for multiple levels', () => {
      const ns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      ns.forEach(n => {
        g.setNode(n);
      });
      g.setParent('b', 'sg2');
      g.setParent('sg2', 'sg1');
      g.setParent('c', 'sg1');
      g.setParent('d', 'sg3');
      g.setParent('sg3', 'sg1');
      g.setParent('f', 'sg4');
      g.setParent('g', 'sg5');
      g.setParent('sg5', 'sg4');
      g.subConstraints(cg, ns);
      expect(cg.edges().sort(qu.sorter)).toEqual([
        new qg.Link(['sg1', 'sg4'], cg).edge,
        new qg.Link(['sg2', 'sg3'], cg).edge
      ]);
    });
  });
});
