/* eslint-disable @typescript-eslint/unbound-method */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qn from './nest';
import * as qu from './utils';

type QN = qn.Graph<qn.Gdata, qn.Ndata, qn.Edata>;
type QG = qg.Graph<qn.Gdata, qn.Ndata, qn.Edata>;

interface Graph extends QN, QG {}
class Graph extends qg.Graph<qn.Gdata, qn.Ndata, qn.Edata> {}
qu.applyMixins(Graph, [qn.Graph, qg.Graph]);

describe('nesting', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({isCompound: true}).setData({} as qn.Gdata).setDefNode(() => {
      return {} as qn.Ndata;
    });
  });
  describe('run', () => {
    it('connects disconnected graph', () => {
      g.setNode('a');
      g.setNode('b');
      expect(g.components().length).toBe(2);
      g.runNest();
      expect(g.components().length).toBe(1);
      expect(g.hasNode('a'));
      expect(g.hasNode('b'));
    });
    it('adds border nodes to top and bottom of subgraph', () => {
      g.setParent('a', 'sg1');
      g.runNest();
      const bt = g.node('sg1')!.border.top;
      const bb = g.node('sg1')!.border.bottom;
      expect(bt).toBeTruthy;
      expect(bb).toBeTruthy;
      expect(g.parent(bt)).toBe('sg1');
      expect(g.parent(bb)).toBe('sg1');
      expect(g.outLinks(bt, 'a')!.length).toBe(1);
      expect(g.edge(g.outLinks(bt, 'a')![0])!.minlen).toBe(1);
      expect(g.outLinks('a', bb)!.length).toBe(1);
      expect(g.edge(g.outLinks('a', bb)![0])!.minlen).toBe(1);
      expect(stripName(g.node(bt))).toEqual({
        w: 0,
        h: 0,
        fake: 'border'
      } as qn.Ndata);
      expect(stripName(g.node(bb))).toEqual({
        w: 0,
        h: 0,
        fake: 'border'
      } as qn.Ndata);
    });
    it('adds edges between borders of nested subgraphs', () => {
      g.setParent('sg2', 'sg1');
      g.setParent('a', 'sg2');
      g.runNest();
      const bt1 = g.node('sg1')!.border.top;
      const bb1 = g.node('sg1')!.border.bottom;
      const bt2 = g.node('sg2')!.border.top;
      const bb2 = g.node('sg2')!.border.bottom;
      expect(bt1).toBeTruthy;
      expect(bb1).toBeTruthy;
      expect(bt2).toBeTruthy;
      expect(bb2).toBeTruthy;
      expect(g.outLinks(bt1, bt2)!.length).toBe(1);
      expect(g.edge(g.outLinks(bt1, bt2)![0])!.minlen).toBe(1);
      expect(g.outLinks(bb2, bb1)!.length).toBe(1);
      expect(g.edge(g.outLinks(bb2, bb1)![0])!.minlen).toBe(1);
    });
    it('adds sufficient weight to border to node edges', () => {
      g.setParent('x', 'sg');
      g.setEdge(['a', 'x'], {weight: 100} as qn.Edata);
      g.setEdge(['x', 'b'], {weight: 200} as qn.Edata);
      g.runNest();
      const bt = g.node('sg')!.border.top;
      const bb = g.node('sg')!.border.bottom;
      expect(g.edge([bt, 'x'])!.weight).toBeGreaterThan(300);
      expect(g.edge(['x', bb])!.weight).toBeGreaterThan(300);
    });
    it('adds an edge from root to the tops of top-level subgraphs', () => {
      g.setParent('a', 'sg1');
      g.runNest();
      const root = g.data!.nestRoot;
      const bt = g.node('sg1')!.border.top;
      expect(root).toBeTruthy;
      expect(bt).toBeTruthy;
      expect(g.outLinks(root, bt)!.length).toBe(1);
      expect(g.hasEdge(g.outLinks(root, bt)![0])).toBeTrue;
    });
    it('adds an edge from root to each node with correct minlen #1', () => {
      g.setNode('a');
      g.runNest();
      const root = g.data!.nestRoot;
      expect(root).toBeTruthy;
      expect(g.outLinks(root, 'a')!.length).toBe(1);
      expect(stripName(g.edge(g.outLinks(root, 'a')![0]))).toEqual({
        weight: 0,
        minlen: 1
      } as qn.Edata);
    });
    it('adds an edge from root to each node with correct minlen #2', () => {
      g.setParent('a', 'sg1');
      g.runNest();
      const root = g.data!.nestRoot;
      expect(root).toBeTruthy;
      expect(g.outLinks(root, 'a')!.length).toBe(1);
      expect(stripName(g.edge(g.outLinks(root, 'a')![0]))).toEqual({
        weight: 0,
        minlen: 3
      } as qn.Edata);
    });
    it('adds an edge from root to each node with correct minlen #3', () => {
      g.setParent('sg2', 'sg1');
      g.setParent('a', 'sg2');
      g.runNest();
      const root = g.data!.nestRoot;
      expect(root).toBeTruthy;
      expect(g.outLinks(root, 'a')!.length).toBe(1);
      expect(stripName(g.edge(g.outLinks(root, 'a')![0]))).toEqual({
        weight: 0,
        minlen: 5
      } as qn.Edata);
    });
    it('does not add an edge from root to itself', () => {
      g.setNode('a');
      g.runNest();
      const root = g.data!.nestRoot;
      expect(g.outLinks(root, root)!).toEqual([]);
    });
    it('expands inter-node edges to separate SG border and nodes #1', () => {
      g.setEdge(['a', 'b'], {minlen: 1} as qn.Edata);
      g.runNest();
      expect(g.edge(['a', 'b'])!.minlen).toBe(1);
    });
    it('expands inter-node edges to separate SG border and nodes #2', () => {
      g.setParent('a', 'sg1');
      g.setEdge(['a', 'b'], {minlen: 1} as qn.Edata);
      g.runNest();
      expect(g.edge(['a', 'b'])!.minlen).toBe(3);
    });
    it('expands inter-node edges to separate SG border and nodes #3', () => {
      g.setParent('sg2', 'sg1');
      g.setParent('a', 'sg2');
      g.setEdge(['a', 'b'], {minlen: 1} as qn.Edata);
      g.runNest();
      expect(g.edge(['a', 'b'])!.minlen).toBe(5);
    });
    it('sets minlen correctly for nested SG boder to children', () => {
      g.setParent('a', 'sg1');
      g.setParent('sg2', 'sg1');
      g.setParent('b', 'sg2');
      g.runNest();
      const root = g.data!.nestRoot;
      const bt1 = g.node('sg1')!.border.top;
      const bb1 = g.node('sg1')!.border.bottom;
      const bt2 = g.node('sg2')!.border.top;
      const bb2 = g.node('sg2')!.border.bottom;
      expect(g.edge([root, bt1])!.minlen).toBe(3);
      expect(g.edge([bt1, bt2])!.minlen).toBe(1);
      expect(g.edge([bt1, 'a'])!.minlen).toBe(2);
      expect(g.edge(['a', bb1])!.minlen).toBe(2);
      expect(g.edge([bt2, 'b'])!.minlen).toBe(1);
      expect(g.edge(['b', bb2])!.minlen).toBe(1);
      expect(g.edge([bb2, bb1])!.minlen).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('removes nesting graph edges', () => {
      g.setParent('a', 'sg1');
      g.setEdge(['a', 'b'], {minlen: 1} as qn.Edata);
      g.runNest().undoNest();
      expect(g.succs('a')).toEqual(['b']);
    });
    it('removes root node', () => {
      g.setParent('a', 'sg1');
      g.runNest().undoNest();
      expect(g.nodeCount).toBe(4);
    });
  });
});

describe('addBorderSegments', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({isCompound: true});
  });
  it('does not add border nodes for non-compound graph', () => {
    g = new Graph({});
    g.setNode('a', {rank: 0} as qn.Ndata);
    g.addBorders();
    expect(g.nodeCount).toBe(1);
    expect(g.node('a')).toEqual({name: 'a', rank: 0} as qn.Ndata);
  });
  it('does not add border nodes for graph with no clusters', () => {
    g.setNode('a', {rank: 0} as qn.Ndata);
    g.addBorders();
    expect(g.nodeCount).toBe(1);
    expect(g.node('a')).toEqual({name: 'a', rank: 0} as qn.Ndata);
  });
  it('adds border for a single-rank subgraph', () => {
    g.setNode('sg', {minRank: 1, maxRank: 1} as qn.Ndata);
    g.addBorders();
    const bl = g.node('sg')!.border.left[1];
    const br = g.node('sg')!.border.right[1];
    expect(stripName(g.node(bl))).toEqual({
      fake: 'border',
      borderType: 'left',
      rank: 1,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(bl)).toBe('sg');
    expect(stripName(g.node(br))).toEqual({
      fake: 'border',
      borderType: 'right',
      rank: 1,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(br)).toBe('sg');
  });
  it('adds border for a multi-rank subgraph', () => {
    g.setNode('sg', {minRank: 1, maxRank: 2} as qn.Ndata);
    g.addBorders();
    const nd = g.node('sg')!;
    const bl2 = nd.border.left[1];
    const br2 = nd.border.right[1];
    expect(stripName(g.node(bl2))).toEqual({
      fake: 'border',
      borderType: 'left',
      rank: 1,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(bl2)).toBe('sg');
    expect(stripName(g.node(br2))).toEqual({
      fake: 'border',
      borderType: 'right',
      rank: 1,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(br2)).toBe('sg');
    const bl1 = nd.border.left[2];
    const br1 = nd.border.right[2];
    expect(stripName(g.node(bl1))).toEqual({
      fake: 'border',
      borderType: 'left',
      rank: 2,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(bl1)).toBe('sg');
    expect(stripName(g.node(br1))).toEqual({
      fake: 'border',
      borderType: 'right',
      rank: 2,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(br1)).toBe('sg');
    expect(g.hasEdge([nd.border.left[1], nd.border.left[2]])).toBeTrue;
    expect(g.hasEdge([nd.border.right[1], nd.border.right[2]])).toBeTrue;
  });
  it('adds borders for nested subgraphs', () => {
    g.setNode('sg1', {minRank: 1, maxRank: 1} as qn.Ndata);
    g.setNode('sg2', {minRank: 1, maxRank: 1} as qn.Ndata);
    g.setParent('sg2', 'sg1');
    g.addBorders();
    const bl1 = g.node('sg1')!.border.left[1];
    const br1 = g.node('sg1')!.border.right[1];
    expect(stripName(g.node(bl1))).toEqual({
      fake: 'border',
      borderType: 'left',
      rank: 1,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(bl1)).toBe('sg1');
    expect(stripName(g.node(br1))).toEqual({
      fake: 'border',
      borderType: 'right',
      rank: 1,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(br1)).toBe('sg1');
    const bl2 = g.node('sg2')!.border.left[1];
    const br2 = g.node('sg2')!.border.right[1];
    expect(stripName(g.node(bl2))).toEqual({
      fake: 'border',
      borderType: 'left',
      rank: 1,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(bl2)).toBe('sg2');
    expect(stripName(g.node(br2))).toEqual({
      fake: 'border',
      borderType: 'right',
      rank: 1,
      w: 0,
      h: 0
    } as qn.Ndata);
    expect(g.parent(br2)).toBe('sg2');
  });

  describe('parentDummyChains', () => {
    let g: Graph;
    beforeEach(() => {
      g = new Graph({isCompound: true}).setData({} as qn.Gdata);
    });
    it('does not set parent if both tail and head have no parent', () => {
      g.setNode('a');
      g.setNode('b');
      g.setNode('d1', {link: new qg.Link(['a', 'b'])} as qn.Ndata);
      g.data!.fakes = ['d1'];
      g.setPath(['a', 'd1', 'b']);
      g.fakeChains();
      expect(g.parent('d1')).toBeUndefined;
    });
    it("uses tail's parent for first node if not root", () => {
      g.setParent('a', 'sg1');
      g.setNode('sg1', {minRank: 0, maxRank: 2} as qn.Ndata);
      g.setNode('d1', {link: new qg.Link(['a', 'b']), rank: 2} as qn.Ndata);
      g.data!.fakes = ['d1'];
      g.setPath(['a', 'd1', 'b']);
      g.fakeChains();
      expect(g.parent('d1')).toBe('sg1');
    });
    it("uses heads's parent for first node if tail's is root", () => {
      g.setParent('b', 'sg1');
      g.setNode('sg1', {minRank: 1, maxRank: 3} as qn.Ndata);
      g.setNode('d1', {link: new qg.Link(['a', 'b']), rank: 1} as qn.Ndata);
      g.data!.fakes = ['d1'];
      g.setPath(['a', 'd1', 'b']);
      g.fakeChains();
      expect(g.parent('d1')).toBe('sg1');
    });
    it('handles long chain starting in a subgraph', () => {
      g.setParent('a', 'sg1');
      g.setNode('sg1', {minRank: 0, maxRank: 2} as qn.Ndata);
      g.setNode('d1', {link: new qg.Link(['a', 'b']), rank: 2} as qn.Ndata);
      g.setNode('d2', {rank: 3} as qn.Ndata);
      g.setNode('d3', {rank: 4} as qn.Ndata);
      g.data!.fakes = ['d1'];
      g.setPath(['a', 'd1', 'd2', 'd3', 'b']);
      g.fakeChains();
      expect(g.parent('d1')).toBe('sg1');
      expect(g.parent('d2')).toBeUndefined;
      expect(g.parent('d3')).toBeUndefined;
    });
    it('handles long chain ending in a subgraph', () => {
      g.setParent('b', 'sg1');
      g.setNode('sg1', {minRank: 3, maxRank: 5} as qn.Ndata);
      g.setNode('d1', {link: new qg.Link(['a', 'b']), rank: 1} as qn.Ndata);
      g.setNode('d2', {rank: 2} as qn.Ndata);
      g.setNode('d3', {rank: 3} as qn.Ndata);
      g.data!.fakes = ['d1'];
      g.setPath(['a', 'd1', 'd2', 'd3', 'b']);
      g.fakeChains();
      expect(g.parent('d1')).toBeUndefined;
      expect(g.parent('d2')).toBeUndefined;
      expect(g.parent('d3')).toBe('sg1');
    });
    it('handles nested subgraphs', () => {
      g.setParent('a', 'sg2');
      g.setParent('sg2', 'sg1');
      g.setNode('sg1', {minRank: 0, maxRank: 4} as qn.Ndata);
      g.setNode('sg2', {minRank: 1, maxRank: 3} as qn.Ndata);
      g.setParent('b', 'sg4');
      g.setParent('sg4', 'sg3');
      g.setNode('sg3', {minRank: 6, maxRank: 10} as qn.Ndata);
      g.setNode('sg4', {minRank: 7, maxRank: 9} as qn.Ndata);
      for (let i = 0; i < 5; ++i) {
        g.setNode('d' + (i + 1), {rank: i + 3} as qn.Ndata);
      }
      g.node('d1')!.link = new qg.Link(['a', 'b']);
      g.data!.fakes = ['d1'];
      g.setPath(['a', 'd1', 'd2', 'd3', 'd4', 'd5', 'b']);
      g.fakeChains();
      expect(g.parent('d1')).toBe('sg2');
      expect(g.parent('d2')).toBe('sg1');
      expect(g.parent('d3')).toBeUndefined;
      expect(g.parent('d4')).toBe('sg3');
      expect(g.parent('d5')).toBe('sg4');
    });
    it('handles overlapping rank ranges', () => {
      g.setParent('a', 'sg1');
      g.setNode('sg1', {minRank: 0, maxRank: 3} as qn.Ndata);
      g.setParent('b', 'sg2');
      g.setNode('sg2', {minRank: 2, maxRank: 6} as qn.Ndata);
      g.setNode('d1', {link: new qg.Link(['a', 'b']), rank: 2} as qn.Ndata);
      g.setNode('d2', {rank: 3} as qn.Ndata);
      g.setNode('d3', {rank: 4} as qn.Ndata);
      g.data!.fakes = ['d1'];
      g.setPath(['a', 'd1', 'd2', 'd3', 'b']);
      g.fakeChains();
      expect(g.parent('d1')).toBe('sg1');
      expect(g.parent('d2')).toBe('sg1');
      expect(g.parent('d3')).toBe('sg2');
    });
    it('handles an LCA that is not root of graph #1', () => {
      g.setParent('a', 'sg1');
      g.setParent('sg2', 'sg1');
      g.setNode('sg1', {minRank: 0, maxRank: 6} as qn.Ndata);
      g.setParent('b', 'sg2');
      g.setNode('sg2', {minRank: 3, maxRank: 5} as qn.Ndata);
      g.setNode('d1', {link: new qg.Link(['a', 'b']), rank: 2} as qn.Ndata);
      g.setNode('d2', {rank: 3} as qn.Ndata);
      g.data!.fakes = ['d1'];
      g.setPath(['a', 'd1', 'd2', 'b']);
      g.fakeChains();
      expect(g.parent('d1')).toBe('sg1');
      expect(g.parent('d2')).toBe('sg2');
    });
    it('handles an LCA that is not root of graph #2', () => {
      g.setParent('a', 'sg2');
      g.setParent('sg2', 'sg1');
      g.setNode('sg1', {minRank: 0, maxRank: 6} as qn.Ndata);
      g.setParent('b', 'sg1');
      g.setNode('sg2', {minRank: 1, maxRank: 3} as qn.Ndata);
      g.setNode('d1', {link: new qg.Link(['a', 'b']), rank: 3} as qn.Ndata);
      g.setNode('d2', {rank: 4} as qn.Ndata);
      g.data!.fakes = ['d1'];
      g.setPath(['a', 'd1', 'd2', 'b']);
      g.fakeChains();
      expect(g.parent('d1')).toBe('sg2');
      expect(g.parent('d2')).toBe('sg1');
    });
  });

  describe('extras', () => {
    let g: Graph;
    beforeEach(() => {
      g = new Graph({isMultiple: true});
    });
    it('maps to successors with associated weights', () => {
      g.setEdge(['a', 'b'], {weight: 2} as qn.Edata);
      g.setEdge(['b', 'c'], {weight: 1} as qn.Edata);
      g.setEdge(['b', 'c', 'multi'], {weight: 2} as qn.Edata);
      g.setEdge(['b', 'd', 'multi'], {weight: 1} as qn.Edata);
      expect(g.succWeights().get('a')).toEqual(new qn.Weights([['b', 2]]));
      expect(g.succWeights().get('b')).toEqual(
        new qn.Weights([
          ['c', 3],
          ['d', 1]
        ])
      );
      expect(g.succWeights().get('c')).toEqual(new qn.Weights([]));
      expect(g.succWeights().get('d')).toEqual(new qn.Weights([]));
    });
    it('maps to predecessors with associated weights', () => {
      g.setEdge(['a', 'b'], {weight: 2} as qn.Edata);
      g.setEdge(['b', 'c'], {weight: 1} as qn.Edata);
      g.setEdge(['b', 'c', 'multi'], {weight: 2} as qn.Edata);
      g.setEdge(['b', 'd', 'multi'], {weight: 1} as qn.Edata);
      expect(g.predWeights().get('a')).toEqual(new qn.Weights([]));
      expect(g.predWeights().get('b')).toEqual(new qn.Weights([['a', 2]]));
      expect(g.predWeights().get('c')).toEqual(new qn.Weights([['b', 3]]));
      expect(g.predWeights().get('d')).toEqual(new qn.Weights([['b', 1]]));
    });
  });
});

function stripName(o: any) {
  const c = _.clone(o);
  delete c.name;
  return c;
}
