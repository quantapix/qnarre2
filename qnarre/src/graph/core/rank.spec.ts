/* eslint-disable @typescript-eslint/unbound-method */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qr from './rank';
import * as qu from './utils';

interface Gdata extends qr.Gdata {
  foo: any;
}

type QR = qr.Graph<Gdata, qr.Ndata, qr.Edata>;
type QG = qg.Graph<Gdata, qr.Ndata, qr.Edata>;

interface Graph extends QR, QG {}
class Graph extends qg.Graph<Gdata, qr.Ndata, qr.Edata> {}
qu.applyMixins(Graph, [qr.Graph, qg.Graph]);

describe('rank', () => {
  const rankers = ['path', 'tree', 'simplex', 'unknown'];
  let g: Graph;
  beforeEach(() => {
    g = new Graph({})
      .setData({} as Gdata)
      .setDefNode(() => ({} as qr.Ndata))
      .setDefEdge(() => ({minlen: 1, weight: 1} as qr.Edata))
      .setPath(['a', 'b', 'c', 'd', 'h'])
      .setPath(['a', 'e', 'g', 'h'])
      .setPath(['a', 'f', 'g']);
  });
  rankers.forEach(r => {
    describe(r, () => {
      it('respects minlen attribute', () => {
        g.data!.ranker = r;
        g.runRank();
        g.links().forEach(l => {
          const r0 = g.node(l.nodes[0])!.rank;
          const r1 = g.node(l.nodes[1])!.rank;
          expect(r1 - r0).toBeGreaterThanOrEqual(g.edge(l)!.minlen);
        });
      });
      it('can rank single node graph', () => {
        g = new Graph({}).setData({} as Gdata).setNode('a', {} as qr.Ndata);
        g.data!.ranker = r;
        g.runRank();
        expect(g.node('a')!.rank).toBe(0);
      });
    });
  });
});

describe('rankTree', () => {
  let g: Graph;
  it('creates tree for trivial input graph', () => {
    g = new Graph({})
      .setNode('a', {rank: 0} as qr.Ndata)
      .setNode('b', {rank: 1} as qr.Ndata)
      .setEdge(['a', 'b'], {minlen: 1} as qr.Edata);
    const t = g.rankTree();
    expect(g.node('b')!.rank).toBe(g.node('a')!.rank + 1);
    expect(t.neighbors('a')).toEqual(['b']);
  });
  it('shortens slack by pulling node up', () => {
    g = new Graph({})
      .setNode('a', {rank: 0} as qr.Ndata)
      .setNode('b', {rank: 1} as qr.Ndata)
      .setNode('c', {rank: 2} as qr.Ndata)
      .setNode('d', {rank: 2} as qr.Ndata)
      .setPath(['a', 'b', 'c'], {minlen: 1} as qr.Edata)
      .setEdge(['a', 'd'], {minlen: 1} as qr.Edata);
    const t = g.rankTree();
    expect(g.node('b')!.rank).toEqual(g.node('a')!.rank + 1);
    expect(g.node('c')!.rank).toEqual(g.node('b')!.rank + 1);
    expect(g.node('d')!.rank).toEqual(g.node('a')!.rank + 1);
    expect(_.sortBy(t.neighbors('a'))).toEqual(['b', 'd']);
    expect(_.sortBy(t.neighbors('b'))).toEqual(['a', 'c']);
    expect(t.neighbors('c')).toEqual(['b']);
    expect(t.neighbors('d')).toEqual(['a']);
  });
  it('shortens slack by pulling node down', () => {
    g = new Graph({})
      .setNode('a', {rank: 2} as qr.Ndata)
      .setNode('b', {rank: 0} as qr.Ndata)
      .setNode('c', {rank: 2} as qr.Ndata)
      .setEdge(['b', 'a'], {minlen: 1} as qr.Edata)
      .setEdge(['b', 'c'], {minlen: 1} as qr.Edata);
    const t = g.rankTree();
    expect(g.node('a')!.rank).toEqual(g.node('b')!.rank + 1);
    expect(g.node('c')!.rank).toEqual(g.node('b')!.rank + 1);
    expect(_.sortBy(t.neighbors('a'))).toEqual(['b']);
    expect(_.sortBy(t.neighbors('b'))).toEqual(['a', 'c']);
    expect(_.sortBy(t.neighbors('c'))).toEqual(['b']);
  });
});

describe('util', () => {
  let g: Graph;
  describe('normalizeRanks', () => {
    it('adjust ranks so all are >= 0, and at least one is 0', () => {
      g = new Graph({})
        .setNode('a', {rank: 3} as qr.Ndata)
        .setNode('b', {rank: 2} as qr.Ndata)
        .setNode('c', {rank: 4} as qr.Ndata);
      g.normalizeRanks();
      expect(g.node('a')!.rank).toBe(1);
      expect(g.node('b')!.rank).toBe(0);
      expect(g.node('c')!.rank).toBe(2);
    });
    it('works for negative ranks', () => {
      g = new Graph({})
        .setNode('a', {rank: -3} as qr.Ndata)
        .setNode('b', {rank: -2} as qr.Ndata);
      g.normalizeRanks();
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(1);
    });
    it('does not assign rank to subgraphs', () => {
      g = new Graph({isCompound: true})
        .setNode('a', {rank: 0} as qr.Ndata)
        .setNode('sg', {} as qr.Ndata)
        .setParent('a', 'sg');
      g.normalizeRanks();
      expect(g.node('sg')!.rank).toBeUndefined;
      expect(g.node('a')!.rank).toBe(0);
    });
  });

  describe('delEmptyRanks', () => {
    it('removes border ranks without any nodes', () => {
      g = new Graph({})
        .setData({rankFactor: 4} as Gdata)
        .setNode('a', {rank: 0} as qr.Ndata)
        .setNode('b', {rank: 4} as qr.Ndata);
      g.delEmptyRanks();
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(1);
    });
    it('does not remove non-border ranks', () => {
      const g = new Graph({})
        .setData({rankFactor: 4} as Gdata)
        .setNode('a', {rank: 0} as qr.Ndata)
        .setNode('b', {rank: 8} as qr.Ndata);
      g.delEmptyRanks();
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(2);
    });
  });

  describe('rankInit', () => {
    beforeEach(() => {
      g = new Graph({})
        .setDefNode(() => {
          return {} as qr.Ndata;
        })
        .setDefEdge(() => {
          return {minlen: 1} as qr.Edata;
        });
    });
    it('can assign rank to single node graph', () => {
      g.setNode('a');
      g.initRank();
      g.normalizeRanks();
      expect(g.node('a')!.rank).toBe(0);
    });
    it('can assign ranks to unconnected nodes', () => {
      g.setNode('a');
      g.setNode('b');
      g.initRank();
      g.normalizeRanks();
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(0);
    });
    it('can assign ranks to connected nodes', () => {
      g.setEdge(['a', 'b']);
      g.initRank();
      g.normalizeRanks();
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(1);
    });
    it('can assign ranks for diamond', () => {
      g.setPath(['a', 'b', 'd']);
      g.setPath(['a', 'c', 'd']);
      g.initRank();
      g.normalizeRanks();
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(1);
      expect(g.node('c')!.rank).toBe(1);
      expect(g.node('d')!.rank).toBe(2);
    });
    it('uses minlen attribute on edge', () => {
      g.setPath(['a', 'b', 'd']);
      g.setEdge(['a', 'c']);
      g.setEdge(['c', 'd'], {minlen: 2} as qr.Edata);
      g.initRank();
      g.normalizeRanks();
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(2);
      expect(g.node('c')!.rank).toBe(1);
      expect(g.node('d')!.rank).toBe(3);
    });
  });

  describe('toCanonical', () => {
    beforeEach(() => {
      g = new Graph({isMultiple: true});
    });
    it('copies graph with no multi-edges without change', () => {
      g.setEdge(['a', 'b'], {weight: 1, minlen: 1} as qr.Edata);
      const g2 = g.toCanonical();
      expect(g2.edge(['a', 'b'])).toEqual({
        name: 'a:b',
        weight: 1,
        minlen: 1
      } as qr.Edata);
      expect(g2.edgeCount).toBe(1);
    });
    it('collapses multi-edges', () => {
      g.setEdge(['a', 'b'], {weight: 1, minlen: 1} as qr.Edata);
      g.setEdge(['a', 'b', 'multi'], {weight: 2, minlen: 2} as qr.Edata);
      const g2 = g.toCanonical();
      expect(g2.isMultiple).toBeFalse;
      expect(g2.edge(['a', 'b'])).toEqual({
        name: 'a:b',
        weight: 3,
        minlen: 2
      } as qr.Edata);
      expect(g2.edgeCount).toBe(1);
    });
    it('copies the graph data', () => {
      g.setData({foo: 'bar'} as Gdata);
      const g2 = g.toCanonical();
      expect(g2.data).toEqual({foo: 'bar'} as Gdata);
    });
  });
});

describe('rankPre', () => {
  let g: Graph;
  it('returns root for singleton graph', () => {
    g = new Graph({});
    g.setNode('a');
    expect(g.rankPre(['a'])).toEqual(['a']);
  });
  it('visits each node in graph once', () => {
    g = new Graph({});
    g.setPath(['a', 'b', 'd', 'e']);
    g.setPath(['a', 'c', 'd', 'e']);
    const ns = g.rankPre(['a']);
    expect(_.sortBy(ns)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('works for tree', () => {
    g = new Graph({});
    g.setEdge(['a', 'b']);
    g.setPath(['a', 'c', 'd']);
    g.setEdge(['c', 'e']);
    const ns = g.rankPre(['a']);
    expect(_.sortBy(ns)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ns.indexOf('b')).toBeGreaterThan(ns.indexOf('a'));
    expect(ns.indexOf('c')).toBeGreaterThan(ns.indexOf('a'));
    expect(ns.indexOf('d')).toBeGreaterThan(ns.indexOf('c'));
    expect(ns.indexOf('e')).toBeGreaterThan(ns.indexOf('c'));
  });
  it('works for array of roots', () => {
    g = new Graph({});
    g.setEdge(['a', 'b']);
    g.setEdge(['c', 'd']);
    g.setNode('e');
    g.setNode('f');
    const ns = g.rankPre(['a', 'c', 'e']);
    expect(_.sortBy(ns)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ns.indexOf('b')).toBeGreaterThan(ns.indexOf('a'));
    expect(ns.indexOf('d')).toBeGreaterThan(ns.indexOf('c'));
  });
  it('fails if root is not in graph', () => {
    g = new Graph({});
    g.setNode('a');
    expect(() => g.rankPre(['b'])).toThrow();
  });
});

describe('rankPost', () => {
  let g: Graph;
  it('returns root for singleton graph', () => {
    g = new Graph({});
    g.setNode('a');
    expect(g.rankPost(['a'])).toEqual(['a']);
  });
  it('visits each node in graph once', () => {
    g = new Graph({});
    g.setPath(['a', 'b', 'd', 'e']);
    g.setPath(['a', 'c', 'd', 'e']);
    const ns = g.rankPost(['a']);
    expect(_.sortBy(ns)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('works for tree', () => {
    g = new Graph({});
    g.setEdge(['a', 'b']);
    g.setPath(['a', 'c', 'd']);
    g.setEdge(['c', 'e']);
    const ns = g.rankPost(['a']);
    expect(_.sortBy(ns)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ns.indexOf('b')).toBeLessThan(ns.indexOf('a'));
    expect(ns.indexOf('c')).toBeLessThan(ns.indexOf('a'));
    expect(ns.indexOf('d')).toBeLessThan(ns.indexOf('c'));
    expect(ns.indexOf('e')).toBeLessThan(ns.indexOf('c'));
  });
  it('works for array of roots', () => {
    g = new Graph({});
    g.setEdge(['a', 'b']);
    g.setEdge(['c', 'd']);
    g.setNode('e');
    g.setNode('f');
    const ns = g.rankPost(['a', 'b', 'c', 'e']);
    expect(_.sortBy(ns)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ns.indexOf('b')).toBeLessThan(ns.indexOf('a'));
    expect(ns.indexOf('d')).toBeLessThan(ns.indexOf('c'));
  });
  it('works for multiple connected roots', () => {
    g = new Graph({});
    g.setEdge(['a', 'b']);
    g.setEdge(['a', 'c']);
    g.setEdge(['d', 'c']);
    const ns = g.rankPost(['a', 'd']);
    expect(_.sortBy(ns)).toEqual(['a', 'b', 'c', 'd']);
    expect(ns.indexOf('b')).toBeLessThan(ns.indexOf('a'));
    expect(ns.indexOf('c')).toBeLessThan(ns.indexOf('a'));
    expect(ns.indexOf('c')).toBeLessThan(ns.indexOf('d'));
  });
  it('fails if root is not in graph', () => {
    g = new Graph({});
    g.setNode('a');
    expect(() => g.rankPost(['b'])).toThrow();
  });
});

describe('rankSimplex', () => {
  let g: Graph;
  let t: Graph;
  let gg: Graph;
  let gt: Graph;
  beforeEach(() => {
    g = new Graph({isMultiple: true})
      .setDefNode(() => ({} as qr.Ndata))
      .setDefEdge(() => ({minlen: 1, weight: 1} as qr.Edata));
    t = new Graph({isDirected: false})
      .setDefNode(() => ({} as qr.Ndata))
      .setDefEdge(() => ({} as qr.Edata));
    gg = new Graph({})
      .setDefNode(() => ({} as qr.Ndata))
      .setDefEdge(() => ({minlen: 1, weight: 1} as qr.Edata))
      .setPath(['a', 'b', 'c', 'd', 'h'])
      .setPath(['a', 'e', 'g', 'h'])
      .setPath(['a', 'f', 'g']);
    gt = new Graph({isDirected: false})
      .setDefNode(() => ({} as qr.Ndata))
      .setDefEdge(() => ({} as qr.Edata))
      .setPath(['a', 'b', 'c', 'd', 'h', 'g', 'e'])
      .setEdge(['g', 'f']);
  });
  it('can assign rank to single node', () => {
    g.setNode('a');
    ns(g);
    expect(g.node('a')!.rank).toBe(0);
  });
  it('can assign rank to 2-node connected graph', () => {
    g.setEdge(['a', 'b']);
    ns(g);
    expect(g.node('a')!.rank).toBe(0);
    expect(g.node('b')!.rank).toBe(1);
  });
  it('can assign ranks for diamond', () => {
    g.setPath(['a', 'b', 'd']);
    g.setPath(['a', 'c', 'd']);
    ns(g);
    expect(g.node('a')!.rank).toBe(0);
    expect(g.node('b')!.rank).toBe(1);
    expect(g.node('c')!.rank).toBe(1);
    expect(g.node('d')!.rank).toBe(2);
  });
  it('uses minlen attribute on edge', () => {
    g.setPath(['a', 'b', 'd']);
    g.setEdge(['a', 'c']);
    g.setEdge(['c', 'd'], {minlen: 2} as qr.Edata);
    ns(g);
    expect(g.node('a')!.rank).toBe(0);
    expect(g.node('b')!.rank).toBe(2);
    expect(g.node('c')!.rank).toBe(1);
    expect(g.node('d')!.rank).toBe(3);
  });
  it('can rank gansner graph', () => {
    ns(gg);
    expect(gg.node('a')!.rank).toBe(0);
    expect(gg.node('b')!.rank).toBe(1);
    expect(gg.node('c')!.rank).toBe(2);
    expect(gg.node('d')!.rank).toBe(3);
    expect(gg.node('h')!.rank).toBe(4);
    expect(gg.node('e')!.rank).toBe(1);
    expect(gg.node('f')!.rank).toBe(1);
    expect(gg.node('g')!.rank).toBe(2);
  });
  it('can handle multi-edges', () => {
    g.setPath(['a', 'b', 'c', 'd']);
    g.setEdge(['a', 'e'], {weight: 2, minlen: 1} as qr.Edata);
    g.setEdge(['e', 'd']);
    g.setEdge(['b', 'c', 'multi'], {weight: 1, minlen: 2} as qr.Edata);
    ns(g);
    expect(g.node('a')!.rank).toBe(0);
    expect(g.node('b')!.rank).toBe(1);
    expect(g.node('c')!.rank).toBe(3);
    expect(g.node('d')!.rank).toBe(4);
    expect(g.node('e')!.rank).toBe(1);
  });

  describe('leaveLink', () => {
    it('returns undefined if no edge with negative cutvalue', () => {
      const t = new Graph({isDirected: false});
      t.setEdge(['a', 'b'], {cutval: 1} as qr.Edata);
      t.setEdge(['b', 'c'], {cutval: 1} as qr.Edata);
      expect(t.leaveLink()).toBeUndefined;
    });
    it('returns edge if found with negative cutvalue', () => {
      const t = new Graph({isDirected: false});
      t.setEdge(['a', 'b'], {cutval: 1} as qr.Edata);
      t.setEdge(['b', 'c'], {cutval: -1} as qr.Edata);
      expect(t.leaveLink()).toBeUndefined;
    });
  });

  describe('enterLink', () => {
    it('finds edge from head to tail', () => {
      g.setNode('a', {rank: 0} as qr.Ndata)
        .setNode('b', {rank: 2} as qr.Ndata)
        .setNode('c', {rank: 3} as qr.Ndata)
        .setPath(['a', 'b', 'c'])
        .setEdge(['a', 'c']);
      t.setPath(['b', 'c', 'a']);
      t.initLowLims('c');
      const f = g.enterLink(t, new qg.Link(['b', 'c']))!;
      expect(undirected(f)).toEqual(undirected(new qg.Link(['a', 'b'])));
    });
    it('works when root of tree is in tail', () => {
      g.setNode('a', {rank: 0} as qr.Ndata)
        .setNode('b', {rank: 2} as qr.Ndata)
        .setNode('c', {rank: 3} as qr.Ndata)
        .setPath(['a', 'b', 'c'])
        .setEdge(['a', 'c']);
      t.setPath(['b', 'c', 'a']);
      t.initLowLims('b');
      const f = g.enterLink(t, new qg.Link(['b', 'c']))!;
      expect(undirected(f)).toEqual(undirected(new qg.Link(['a', 'b'])));
    });
    it('finds edge with least slack', () => {
      g.setNode('a', {rank: 0} as qr.Ndata)
        .setNode('b', {rank: 1} as qr.Ndata)
        .setNode('c', {rank: 3} as qr.Ndata)
        .setNode('d', {rank: 4} as qr.Ndata)
        .setEdge(['a', 'd'])
        .setPath(['a', 'c', 'd'])
        .setEdge(['b', 'c']);
      t.setPath(['c', 'd', 'a', 'b']);
      t.initLowLims('a');
      const f = g.enterLink(t, new qg.Link(['c', 'd']))!;
      expect(undirected(f)).toEqual(undirected(new qg.Link(['b', 'c'])));
    });
    it('finds appropriate edge for gansner graph #1', () => {
      g = gg;
      t = gt;
      g.initRank();
      t.initLowLims('a');
      const f = g.enterLink(t, new qg.Link(['g', 'h']))!;
      expect(undirected(f).nodes[0]).toBe('a');
      expect(['e', 'f']).toContain(undirected(f).nodes[1]);
    });
    it('finds appropriate edge for gansner graph #2', () => {
      g = gg;
      t = gt;
      g.initRank();
      t.initLowLims('e');
      const f = g.enterLink(t, new qg.Link(['g', 'h']))!;
      expect(undirected(f).nodes[0]).toBe('a');
      expect(['e', 'f']).toContain(undirected(f).nodes[1]);
    });
    it('finds appropriate edge for gansner graph #3', () => {
      g = gg;
      t = gt;
      g.initRank();
      t.initLowLims('a');
      const f = g.enterLink(t, new qg.Link(['h', 'g']))!;
      expect(undirected(f).nodes[0]).toBe('a');
      expect(['e', 'f']).toContain(undirected(f).nodes[1]);
    });

    it('finds appropriate edge for gansner graph #4', () => {
      g = gg;
      t = gt;
      g.initRank();
      t.initLowLims('e');
      const f = g.enterLink(t, new qg.Link(['h', 'g']))!;
      expect(undirected(f).nodes[0]).toBe('a');
      expect(['e', 'f']).toContain(undirected(f).nodes[1]);
    });
  });

  describe('initLowLims', () => {
    it('assigns low, lim, and parent for each node in tree', () => {
      g = new Graph({})
        .setDefNode(() => ({} as qr.Ndata))
        .setNodes(['a', 'b', 'c', 'd', 'e'])
        .setPath(['a', 'b', 'a', 'c', 'd', 'c', 'e']);
      g.initLowLims('a');
      const a = g.node('a')!;
      const b = g.node('b')!;
      const c = g.node('c')!;
      const d = g.node('d')!;
      const e = g.node('e')!;
      expect(_.sortBy(g.nodes().map(n => g.node(n)!.lim))).toEqual(
        _.range(1, 6)
      );
      expect(a).toEqual({name: 'a', low: 1, lim: 5} as qr.Ndata);
      expect(b.parent).toBe('a');
      expect(b.lim).toBeLessThan(a.lim);
      expect(c.parent).toBe('a');
      expect(c.lim).toBeLessThan(a.lim);
      expect(c.lim).not.toBe(b.lim);
      expect(d.parent).toBe('c');
      expect(d.lim).toBeLessThan(c.lim);
      expect(e.parent).toBe('c');
      expect(e.lim).toBeLessThan(c.lim);
      expect(e.lim).not.toBe(d.lim);
    });
  });

  describe('swapLinks', () => {
    it('swaps edges and updates cut values, low/lim numbers', () => {
      g = gg;
      t = gt;
      g.initRank();
      g.initLowLims();
      g.swapLinks(t, new qg.Link(['g', 'h']), new qg.Link(['a', 'e']));
      expect(t.edge(['a', 'b'])!.cutval).toBe(2);
      expect(t.edge(['b', 'c'])!.cutval).toBe(2);
      expect(t.edge(['c', 'd'])!.cutval).toBe(2);
      expect(t.edge(['d', 'h'])!.cutval).toBe(2);
      expect(t.edge(['a', 'e'])!.cutval).toBe(1);
      expect(t.edge(['e', 'g'])!.cutval).toBe(1);
      expect(t.edge(['g', 'f'])!.cutval).toBe(0);
      const lims = _.sortBy(t.nodes().map(n => t.node(n)!.lim));
      expect(lims).toEqual(_.range(1, 9));
    });
    it('updates ranks', () => {
      g = gg;
      t = gt;
      g.initRank();
      g.initLowLims();
      g.swapLinks(t, new qg.Link(['g', 'h']), new qg.Link(['a', 'e']));
      g.normalizeRanks();
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(1);
      expect(g.node('c')!.rank).toBe(2);
      expect(g.node('d')!.rank).toBe(3);
      expect(g.node('e')!.rank).toBe(1);
      expect(g.node('f')!.rank).toBe(1);
      expect(g.node('g')!.rank).toBe(2);
      expect(g.node('h')!.rank).toBe(4);
    });
  });

  describe('cutValue', () => {
    it('works for 2-node tree with c -> p', () => {
      g.setPath(['c', 'p']);
      t.setPath(['p', 'c']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(1);
    });
    it('works for 2-node tree with c <- p', () => {
      g.setPath(['p', 'c']);
      t.setPath(['p', 'c']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(1);
    });
    it('works for 3-node tree with gc -> c -> p', () => {
      g.setPath(['gc', 'c', 'p']);
      t.setEdge(['gc', 'c'], {cutval: 3} as qr.Edata).setEdge(['p', 'c']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(3);
    });
    it('works for 3-node tree with gc -> c <- p', () => {
      g.setEdge(['p', 'c']).setEdge(['gc', 'c']);
      t.setEdge(['gc', 'c'], {cutval: 3} as qr.Edata).setEdge(['p', 'c']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(-1);
    });
    it('works for 3-node tree with gc <- c -> p', () => {
      g.setEdge(['c', 'p']).setEdge(['c', 'gc']);
      t.setEdge(['gc', 'c'], {cutval: 3} as qr.Edata).setEdge(['p', 'c']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(-1);
    });
    it('works for 3-node tree with gc <- c <- p', () => {
      g.setPath(['p', 'c', 'gc']);
      t.setEdge(['gc', 'c'], {cutval: 3} as qr.Edata).setEdge(['p', 'c']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(3);
    });
    it('works for 4-node tree with gc -> c -> p -> o, with o -> c', () => {
      g.setEdge(['o', 'c'], {weight: 7} as qr.Edata).setPath([
        'gc',
        'c',
        'p',
        'o'
      ]);
      t.setEdge(['gc', 'c'], {cutval: 3} as qr.Edata).setPath(['c', 'p', 'o']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(-4);
    });
    it('works for 4-node tree with gc -> c -> p -> o, with o <- c', () => {
      g.setEdge(['c', 'o'], {weight: 7} as qr.Edata).setPath([
        'gc',
        'c',
        'p',
        'o'
      ]);
      t.setEdge(['gc', 'c'], {cutval: 3} as qr.Edata).setPath(['c', 'p', 'o']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(10);
    });
    it('works for 4-node tree with o -> gc -> c -> p, with o -> c', () => {
      g.setEdge(['o', 'c'], {weight: 7} as qr.Edata).setPath([
        'o',
        'gc',
        'c',
        'p'
      ]);
      t.setEdge(['o', 'gc'])
        .setEdge(['gc', 'c'], {cutval: 3} as qr.Edata)
        .setEdge(['c', 'p']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(-4);
    });
    it('works for 4-node tree with o -> gc -> c -> p, with o <- c', () => {
      g.setEdge(['c', 'o'], {weight: 7} as qr.Edata).setPath([
        'o',
        'gc',
        'c',
        'p'
      ]);
      t.setEdge(['o', 'gc'])
        .setEdge(['gc', 'c'], {cutval: 3} as qr.Edata)
        .setEdge(['c', 'p']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(10);
    });
    it('works for 4-node tree with gc -> c <- p -> o, with o -> c', () => {
      g.setEdge(['gc', 'c'])
        .setEdge(['p', 'c'])
        .setEdge(['p', 'o'])
        .setEdge(['o', 'c'], {weight: 7} as qr.Edata);
      t.setEdge(['o', 'gc'])
        .setEdge(['gc', 'c'], {cutval: 3} as qr.Edata)
        .setEdge(['c', 'p']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(6);
    });
    it('works for 4-node tree with gc -> c <- p -> o, with o <- c', () => {
      g.setEdge(['gc', 'c'])
        .setEdge(['p', 'c'])
        .setEdge(['p', 'o'])
        .setEdge(['c', 'o'], {weight: 7} as qr.Edata);
      t.setEdge(['o', 'gc'])
        .setEdge(['gc', 'c'], {cutval: 3} as qr.Edata)
        .setEdge(['c', 'p']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(-8);
    });
    it('works for 4-node tree with o -> gc -> c <- p, with o -> c', () => {
      g.setEdge(['o', 'c'], {weight: 7} as qr.Edata)
        .setPath(['o', 'gc', 'c'])
        .setEdge(['p', 'c']);
      t.setEdge(['o', 'gc'])
        .setEdge(['gc', 'c'], {cutval: 3} as qr.Edata)
        .setEdge(['c', 'p']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(6);
    });
    it('works for 4-node tree with o -> gc -> c <- p, with o <- c', () => {
      g.setEdge(['c', 'o'], {weight: 7} as qr.Edata)
        .setPath(['o', 'gc', 'c'])
        .setEdge(['p', 'c']);
      t.setEdge(['o', 'gc'])
        .setEdge(['gc', 'c'], {cutval: 3} as qr.Edata)
        .setEdge(['c', 'p']);
      t.initLowLims('p');
      expect(g.cutValue(t, 'c')).toBe(-8);
    });
  });

  describe('initCuts', () => {
    it('works for gg', () => {
      gt.initLowLims();
      gg.initCuts(gt);
      expect(gt.edge(['a', 'b'])!.cutval).toBe(3);
      expect(gt.edge(['b', 'c'])!.cutval).toBe(3);
      expect(gt.edge(['c', 'd'])!.cutval).toBe(3);
      expect(gt.edge(['d', 'h'])!.cutval).toBe(3);
      expect(gt.edge(['g', 'h'])!.cutval).toBe(-1);
      expect(gt.edge(['e', 'g'])!.cutval).toBe(0);
      expect(gt.edge(['f', 'g'])!.cutval).toBe(0);
    });
    it('works for updated gg', () => {
      gt.delEdge(['g', 'h']);
      gt.setEdge(['a', 'e']);
      gt.initLowLims();
      gg.initCuts(gt);
      expect(gt.edge(['a', 'b'])!.cutval).toBe(2);
      expect(gt.edge(['b', 'c'])!.cutval).toBe(2);
      expect(gt.edge(['c', 'd'])!.cutval).toBe(2);
      expect(gt.edge(['d', 'h'])!.cutval).toBe(2);
      expect(gt.edge(['a', 'e'])!.cutval).toBe(1);
      expect(gt.edge(['e', 'g'])!.cutval).toBe(1);
      expect(gt.edge(['f', 'g'])!.cutval).toBe(0);
    });
  });
});

function ns(g: Graph) {
  g.rankSimplex();
  g.normalizeRanks();
}

function undirected(l: qg.Link<qr.Edata>) {
  const [n0, n1] = l.nodes;
  return n0 < n1 ? new qg.Link([n0, n1]) : new qg.Link([n1, n0]);
}
