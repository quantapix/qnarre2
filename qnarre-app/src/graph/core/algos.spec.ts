/* eslint-disable @typescript-eslint/unbound-method */
import * as _ from 'lodash';

import * as qa from './algos';
import * as qn from './nest';
import * as qs from './sort';
import * as qg from './graph';
import * as qu from './utils';

interface Edata extends qa.Edata {
  foo: any;
}

type QA = qa.Graph<qa.Gdata, qa.Ndata, Edata>;
type QG = qg.Graph<qa.Gdata, qa.Ndata, Edata>;

interface Graph extends QA, QG {}
class Graph extends qg.Graph<qa.Gdata, qa.Ndata, Edata> {}
qu.applyMixins(Graph, [qs.Graph, qn.Graph, qa.Graph, qg.Graph]);

describe('dijkstraNode', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({});
  });
  it('assigns distance 0 for source node', () => {
    g.setNode('source');
    expect(g.dijkstra('source')).toEqual({source: {v: 0}});
  });
  it('returns infinity for unconnected nodes', () => {
    g.setNode('a');
    g.setNode('b');
    expect(g.dijkstra('a')).toEqual({
      a: {v: 0},
      b: {v: Number.POSITIVE_INFINITY}
    });
  });
  it('returns distance and path from source to others', () => {
    g.setPath(['a', 'b', 'c']);
    g.setEdge(['b', 'd']);
    expect(g.dijkstra('a')).toEqual({
      a: {v: 0},
      b: {v: 1, pred: 'a'},
      c: {v: 2, pred: 'b'},
      d: {v: 2, pred: 'b'}
    });
  });
  it('works for undirected graphs', () => {
    g = new Graph({isDirected: false});
    g.setPath(['a', 'b', 'c']);
    g.setEdge(['b', 'd']);
    expect(g.dijkstra('a')).toEqual({
      a: {v: 0},
      b: {v: 1, pred: 'a'},
      c: {v: 2, pred: 'b'},
      d: {v: 2, pred: 'b'}
    });
  });
  it('uses supplied weight function', () => {
    g.setEdge(['a', 'b'], {weight: 1} as Edata);
    g.setEdge(['a', 'c'], {weight: 2} as Edata);
    g.setEdge(['b', 'd'], {weight: 3} as Edata);
    g.setEdge(['c', 'd'], {weight: 3} as Edata);
    expect(g.dijkstra('a', weight(g))).toEqual({
      a: {v: 0},
      b: {v: 1, pred: 'a'},
      c: {v: 2, pred: 'a'},
      d: {v: 4, pred: 'b'}
    });
  });
  it('uses supplied edge function', () => {
    g.setPath(['a', 'c', 'd']);
    g.setEdge(['b', 'c']);
    expect(g.dijkstra('d', undefined, e => g.inLinks(e))).toEqual({
      a: {v: 2, pred: 'c'},
      b: {v: 2, pred: 'c'},
      c: {v: 1, pred: 'd'},
      d: {v: 0}
    });
  });
  it('throws if encounters negative edge weight', () => {
    g.setEdge(['a', 'b'], {weight: 1} as Edata);
    g.setEdge(['a', 'c'], {weight: -2} as Edata);
    g.setEdge(['b', 'd'], {weight: 3} as Edata);
    g.setEdge(['c', 'd'], {weight: 3} as Edata);
    expect(() => g.dijkstra('a', weight(g))).toThrow();
  });
});

function tests(fn: any) {
  describe('shortest paths', () => {
    let g: Graph;
    beforeEach(() => {
      g = new Graph({});
    });
    it('returns 0 for node itself', () => {
      g.setNode('a');
      expect(fn.bind(g)()).toEqual({a: {a: {v: 0}}});
    });
    it('returns distance and path from nodes to nodes', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      expect(fn.bind(g)()).toEqual({
        a: {
          a: {v: 0},
          b: {v: 1, pred: 'a'},
          c: {v: 2, pred: 'b'}
        },
        b: {
          a: {v: Number.POSITIVE_INFINITY},
          b: {v: 0},
          c: {v: 1, pred: 'b'}
        },
        c: {
          a: {v: Number.POSITIVE_INFINITY},
          b: {v: Number.POSITIVE_INFINITY},
          c: {v: 0}
        }
      });
    });
    it('uses supplied weight function', () => {
      g.setEdge(['a', 'b'], {weight: 2} as Edata);
      g.setEdge(['b', 'c'], {weight: 3} as Edata);
      expect(fn.bind(g)(weight(g))).toEqual({
        a: {
          a: {v: 0},
          b: {v: 2, pred: 'a'},
          c: {v: 5, pred: 'b'}
        },
        b: {
          a: {v: Number.POSITIVE_INFINITY},
          b: {v: 0},
          c: {v: 3, pred: 'b'}
        },
        c: {
          a: {v: Number.POSITIVE_INFINITY},
          b: {v: Number.POSITIVE_INFINITY},
          c: {v: 0}
        }
      });
    });
    it('uses supplied link function', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      expect(fn.bind(g)(undefined, (n: Node) => g.inLinks(n))).toEqual({
        a: {
          a: {v: 0},
          b: {v: Number.POSITIVE_INFINITY},
          c: {v: Number.POSITIVE_INFINITY}
        },
        b: {
          a: {v: 1, pred: 'b'},
          b: {v: 0},
          c: {v: Number.POSITIVE_INFINITY}
        },
        c: {
          a: {v: 2, pred: 'b'},
          b: {v: 1, pred: 'c'},
          c: {v: 0}
        }
      });
    });
    it('works with undirected graphs', () => {
      g = new Graph({isDirected: false});
      g.setEdge(['a', 'b'], {weight: 1} as Edata);
      g.setEdge(['b', 'c'], {weight: 2} as Edata);
      g.setEdge(['c', 'a'], {weight: 4} as Edata);
      g.setEdge(['b', 'd'], {weight: 6} as Edata);
      expect(fn.bind(g)(weight(g), g.nodeLinks.bind(g))).toEqual({
        a: {
          a: {v: 0},
          b: {v: 1, pred: 'a'},
          c: {v: 3, pred: 'b'},
          d: {v: 7, pred: 'b'}
        },
        b: {
          a: {v: 1, pred: 'b'},
          b: {v: 0},
          c: {v: 2, pred: 'b'},
          d: {v: 6, pred: 'b'}
        },
        c: {
          a: {v: 3, pred: 'b'},
          b: {v: 2, pred: 'c'},
          c: {v: 0},
          d: {v: 8, pred: 'b'}
        },
        d: {
          a: {v: 7, pred: 'b'},
          b: {v: 6, pred: 'd'},
          c: {v: 8, pred: 'b'},
          d: {v: 0}
        }
      });
    });
  });
}

describe('dijkstraSP', () => {
  let g = new Graph({});
  tests(g.dijkstraSP);
  it('throws if negative edge weight', () => {
    g = new Graph({});
    g.setEdge(['a', 'b'], {weight: 1} as Edata);
    g.setEdge(['a', 'c'], {weight: -2} as Edata);
    g.setEdge(['b', 'd'], {weight: 3} as Edata);
    g.setEdge(['c', 'd'], {weight: 3} as Edata);
    expect(() => {
      g.dijkstraSP(weight(g));
    }).toThrow();
  });
});

describe('floydWarshallSP', () => {
  let g = new Graph({});
  tests(g.floydWarshallSP);
  beforeEach(() => {
    g = new Graph({});
  });
  it('handles negative weights', () => {
    g.setEdge(['a', 'b'], {weight: 1} as Edata);
    g.setEdge(['a', 'c'], {weight: -2} as Edata);
    g.setEdge(['b', 'd'], {weight: 3} as Edata);
    g.setEdge(['c', 'd'], {weight: 3} as Edata);
    expect(g.floydWarshallSP(weight(g))).toEqual({
      a: {
        a: {v: 0},
        b: {v: 1, pred: 'a'},
        c: {v: -2, pred: 'a'},
        d: {v: 1, pred: 'c'}
      },
      b: {
        a: {v: Number.POSITIVE_INFINITY},
        b: {v: 0},
        c: {v: Number.POSITIVE_INFINITY},
        d: {v: 3, pred: 'b'}
      },
      c: {
        a: {v: Number.POSITIVE_INFINITY},
        b: {v: Number.POSITIVE_INFINITY},
        c: {v: 0},
        d: {v: 3, pred: 'c'}
      },
      d: {
        a: {v: Number.POSITIVE_INFINITY},
        b: {v: Number.POSITIVE_INFINITY},
        c: {v: Number.POSITIVE_INFINITY},
        d: {v: 0}
      }
    });
  });
  it('does include negative weight self edges', () => {
    g.setEdge(['a', 'a'], {weight: -1} as Edata);
    expect(g.floydWarshallSP(weight(g))).toEqual({
      a: {a: {v: -2, pred: 'a'}}
    });
  });
});

describe('primMST', () => {
  let s: Graph;
  beforeEach(() => {
    s = new Graph({});
  });
  it('returns empty graph for empty input', () => {
    const g = s.primMST(weight(s));
    expect(g.nodeCount).toBe(0);
    expect(g.edgeCount).toBe(0);
  });
  it('returns single node for graph with single node', () => {
    s.setNode('a');
    const g = s.primMST(weight(s));
    expect(g.nodes()).toEqual(['a']);
    expect(g.edgeCount).toBe(0);
  });
  it('returns deterministic result given optimal solution', () => {
    s.setEdge(['a', 'b'], {weight: 1} as Edata);
    s.setEdge(['b', 'c'], {weight: 2} as Edata);
    s.setEdge(['b', 'd'], {weight: 3} as Edata);
    s.setEdge(['c', 'd'], {weight: 20} as Edata);
    s.setEdge(['c', 'e'], {weight: 60} as Edata);
    s.setEdge(['d', 'e'], {weight: 1} as Edata);
    const g = s.primMST(weight(s));
    expect(_.sortBy(g.neighbors('a')!)).toEqual(['b']);
    expect(_.sortBy(g.neighbors('b')!)).toEqual(['a', 'c', 'd']);
    expect(_.sortBy(g.neighbors('c')!)).toEqual(['b']);
    expect(_.sortBy(g.neighbors('d')!)).toEqual(['b', 'e']);
    expect(_.sortBy(g.neighbors('e')!)).toEqual(['d']);
  });
  it('throws for unconnected graphs', () => {
    s.setNode('a');
    s.setNode('b');
    expect(() => {
      s.primMST(weight(s));
    }).toThrow();
  });
});

describe('tarjan', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({});
  });
  it('returns empty for empty graph', () => {
    expect(g.tarjanSCC()).toEqual([]);
  });
  it('returns singletons for nodes not in component', () => {
    g.setPath(['a', 'b', 'c']);
    g.setEdge(['d', 'c']);
    expect(sort(g.tarjanSCC())).toEqual([['a'], ['b'], ['c'], ['d']]);
  });
  it('returns component for cycle of 1 edge', () => {
    g.setPath(['a', 'b', 'a']);
    expect(sort(g.tarjanSCC())).toEqual([['a', 'b']]);
  });
  it('returns component for a triangle', () => {
    g.setPath(['a', 'b', 'c', 'a']);
    expect(sort(g.tarjanSCC())).toEqual([['a', 'b', 'c']]);
  });
  it('can find multiple components', () => {
    g.setPath(['a', 'b', 'a']);
    g.setPath(['c', 'd', 'e', 'c']);
    g.setNode('f');
    expect(sort(g.tarjanSCC())).toEqual([['a', 'b'], ['c', 'd', 'e'], ['f']]);
  });
});

function sort(cs: string[][]) {
  return _.sortBy(
    _.map(
      cs.map(c => {
        return _.sortBy(c);
      })
    ),
    cs => {
      return cs[0];
    }
  );
}

describe('findCycles', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({});
  });
  it('returns empty for empty graph', () => {
    expect(g.findCycles()).toEqual([]);
  });
  it('returns empty if graph has no cycles', () => {
    g.setPath(['a', 'b', 'c']);
    expect(g.findCycles()).toEqual([]);
  });
  it('returns single entry for cycle of 1 node', () => {
    g.setPath(['a', 'a']);
    expect(sort(g.findCycles())).toEqual([['a']]);
  });
  it('returns single entry for cycle of 2 nodes', () => {
    g.setPath(['a', 'b', 'a']);
    expect(sort(g.findCycles())).toEqual([['a', 'b']]);
  });
  it('returns a single entry for a triangle', () => {
    g.setPath(['a', 'b', 'c', 'a']);
    expect(sort(g.findCycles())).toEqual([['a', 'b', 'c']]);
  });
  it('returns multiple entries for multiple cycles', () => {
    g.setPath(['a', 'b', 'a']);
    g.setPath(['c', 'd', 'e', 'c']);
    g.setPath(['f', 'g', 'g']);
    g.setNode('h');
    expect(sort(g.findCycles())).toEqual([['a', 'b'], ['c', 'd', 'e'], ['g']]);
  });
});

describe('topsort', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({});
  });
  it('returns ampty for empty graph', () => {
    expect(g.topsort()).toEqual([]);
  });
  it('sorts such that earliers have directed edges to laters', () => {
    g.setPath(['b', 'c', 'a']);
    expect(g.topsort()).toEqual(['b', 'c', 'a']);
  });
  it('works for diamond', () => {
    g.setPath(['a', 'b', 'd']);
    g.setPath(['a', 'c', 'd']);
    const res = g.topsort();
    expect(_.indexOf(res, 'a')).toBe(0);
    expect(_.indexOf(res, 'b')).toBeLessThan(_.indexOf(res, 'd'));
    expect(_.indexOf(res, 'c')).toBeLessThan(_.indexOf(res, 'd'));
    expect(_.indexOf(res, 'd')).toBe(3);
  });
  it('throws CycleException if cycle #1', () => {
    g.setPath(['b', 'c', 'a', 'b']);
    expect(() => {
      g.topsort();
    }).toThrow();
  });
  it('throws CycleException if cycle #2', () => {
    g.setPath(['b', 'c', 'a', 'b']);
    g.setEdge(['b', 'd']);
    expect(() => {
      g.topsort();
    }).toThrow();
  });
  it('throws CycleException if cycle #3', () => {
    g.setPath(['b', 'c', 'a', 'b']);
    g.setNode('d');
    expect(() => {
      g.topsort();
    }).toThrow();
  });
});

describe('isAcyclic', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({});
  });
  it('returns true if graph has no cycles', () => {
    g.setPath(['a', 'b', 'c']);
    expect(g.isAcyclic()).toBeTrue;
  });
  it('returns false if graph has at least one cycle', () => {
    g.setPath(['a', 'b', 'c', 'a']);
    expect(g.isAcyclic()).toBeFalse;
  });
  it('returns false if graph has ycle of 1 node', () => {
    g.setPath(['a', 'a']);
    expect(g.isAcyclic()).toBeFalse;
  });
});

describe('acycler', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({isMultiple: true}).setDefEdge(() => {
      return {minlen: 1, weight: 1} as Edata;
    });
  });
  ['greedy', 'dfs', 'unknown'].forEach(a => {
    describe(a, () => {
      beforeEach(() => {
        g.setData({acycler: a} as qa.Gdata);
      });
      describe('run', () => {
        it('does not change an already acyclic graph', () => {
          g.setPath(['a', 'b', 'd']);
          g.setPath(['a', 'c', 'd']);
          g.runAcycler();
          const res = g.links().map(stripData);
          expect(_.sortBy(res, 'edge')).toEqual([
            new qg.Link<Edata>(['a', 'b']),
            new qg.Link<Edata>(['a', 'c']),
            new qg.Link<Edata>(['b', 'd']),
            new qg.Link<Edata>(['c', 'd'])
          ]);
        });
        it('breaks cycles in the input graph', () => {
          g.setPath(['a', 'b', 'c', 'd', 'a']);
          g.runAcycler();
          expect(g.findCycles()).toEqual([]);
        });
        it('creates a multi-edge where necessary', () => {
          g.setPath(['a', 'b', 'a']);
          g.runAcycler();
          expect(g.findCycles()).toEqual([]);
          if (g.hasEdge(['a', 'b'])) {
            expect(g.outLinks('a', 'b')!.length).toBe(2);
          } else {
            expect(g.outLinks('b', 'a')!.length).toBe(2);
          }
          expect(g.edgeCount).toBe(2);
        });
      });
      describe('undo', () => {
        it('does not change edges where the original graph was acyclic', () => {
          g.setEdge(['a', 'b'], {minlen: 2, weight: 3} as Edata);
          g.runAcycler().undoAcycler();
          expect(stripName(g.edge(['a', 'b']))).toEqual({
            minlen: 2,
            weight: 3
          } as Edata);
          expect(g.edges().length).toBe(1);
        });
        it('can restore previosuly reversed edges', () => {
          g.setEdge(['a', 'b'], {minlen: 2, weight: 3} as Edata);
          g.setEdge(['b', 'a'], {minlen: 3, weight: 4} as Edata);
          g.runAcycler().undoAcycler();
          expect(stripName(g.edge(['a', 'b']))).toEqual({
            minlen: 2,
            weight: 3
          } as Edata);
          expect(stripName(g.edge(['b', 'a']))).toEqual({
            minlen: 3,
            weight: 4
          } as Edata);
          expect(g.edges().length).toBe(2);
        });
      });
    });
  });

  describe('greedy-specific functionality', () => {
    it('prefers to break cycles at low-weight edges', () => {
      g.setData({acycler: 'greedy'} as qa.Gdata);
      g.setDefEdge(() => {
        return {minlen: 1, weight: 2} as Edata;
      });
      g.setPath(['a', 'b', 'c', 'd', 'a']);
      g.setEdge(['c', 'd'], {weight: 1} as Edata);
      g.runAcycler();
      expect(g.findCycles()).toEqual([]);
      expect(g.hasEdge(['c', 'd'])).toBeFalse;
    });
  });

  describe('greedyFAS', () => {
    beforeEach(() => {
      g = new Graph({});
    });
    it('returns the empty set for empty graphs', () => {
      expect(g.greedyFAS()).toEqual([]);
    });
    it('returns the empty set for single-node graphs', () => {
      g.setNode('a');
      expect(g.greedyFAS()).toEqual([]);
    });
    it('returns an empty set if the input graph is acyclic', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      g.setEdge(['b', 'd']);
      g.setEdge(['a', 'e']);
      expect(g.greedyFAS()).toEqual([]);
    });
    it('returns a single edge with a simple cycle', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'a']);
      checkFAS(g, g.greedyFAS());
    });
    it('returns a single edge in a 4-node cycle', () => {
      g.setEdge(['n1', 'n2']);
      g.setPath(['n2', 'n3', 'n4', 'n5', 'n2']);
      g.setEdge(['n3', 'n5']);
      g.setEdge(['n4', 'n2']);
      g.setEdge(['n4', 'n6']);
      checkFAS(g, g.greedyFAS());
    });
    it('returns two edges for two 4-node cycles', () => {
      g.setEdge(['n1', 'n2']);
      g.setPath(['n2', 'n3', 'n4', 'n5', 'n2']);
      g.setEdge(['n3', 'n5']);
      g.setEdge(['n4', 'n2']);
      g.setEdge(['n4', 'n6']);
      g.setPath(['n6', 'n7', 'n8', 'n9', 'n6']);
      g.setEdge(['n7', 'n9']);
      g.setEdge(['n8', 'n6']);
      g.setEdge(['n8', 'n10']);
      checkFAS(g, g.greedyFAS());
    });
    it('works with arbitrarily weighted edges', () => {
      const g1 = new Graph({});
      g1.setEdge(['n1', 'n2'], {weight: 2} as Edata);
      g1.setEdge(['n2', 'n1'], {weight: 1} as Edata);
      expect(g1.greedyFAS(weight(g1)).map(stripData)).toEqual([
        new qg.Link<Edata>(['n2', 'n1'], {isDirected: true})
      ]);
      const g2 = new Graph({});
      g2.setEdge(['n1', 'n2'], {weight: 1} as Edata);
      g2.setEdge(['n2', 'n1'], {weight: 2} as Edata);
      expect(g2.greedyFAS(weight(g2)).map(stripData)).toEqual([
        new qg.Link<Edata>(['n1', 'n2'])
      ]);
    });
    it('works for multigraphs', () => {
      g = new Graph({isMultiple: true});
      g.setEdge(['a', 'b', 'foo'], {weight: 5} as Edata);
      g.setEdge(['b', 'a', 'bar'], {weight: 2} as Edata);
      g.setEdge(['b', 'a', 'baz'], {weight: 2} as Edata);
      expect(_.sortBy(g.greedyFAS(weight(g)), 'edge').map(stripData)).toEqual([
        new qg.Link<Edata>(['b', 'a', 'bar'], g),
        new qg.Link<Edata>(['b', 'a', 'baz'], g)
      ]);
    });
  });
});

describe('normalize', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({isMultiple: true, isCompound: true}).setData({} as qa.Gdata);
  });
  describe('run', () => {
    it('does not change a short edge', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 1} as qa.Ndata);
      g.setEdge(['a', 'b'], {} as Edata);
      g.runNormalize();
      expect(g.links().map(stripData)).toEqual([
        new qg.Link<Edata>(['a', 'b'])
      ]);
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(1);
    });
    it('splits a two layer edge into two segments', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 2} as qa.Ndata);
      g.setEdge(['a', 'b'], {} as Edata);
      g.runNormalize();
      expect(g.succs('a')!.length).toBe(1);
      const s = g.succs('a')![0];
      expect(g.node(s)!.fake).toBe('edge');
      expect(g.node(s)!.rank).toBe(1);
      expect(g.succs(s)).toEqual(['b']);
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(2);
      expect(g.data!.fakes.length).toBe(1);
      expect(g.data!.fakes[0]).toBe(s);
    });
    it('assigns width = 0, height = 0 to fake nodes by default', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 2} as qa.Ndata);
      g.setEdge(['a', 'b'], {w: 10, h: 10} as Edata);
      g.runNormalize();
      expect(g.succs('a')!.length).toBe(1);
      const s = g.succs('a')![0];
      expect(g.node(s)!.w).toBe(0);
      expect(g.node(s)!.h).toBe(0);
    });
    it('assigns width and height from the edge for the node on labelRank', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 4} as qa.Ndata);
      g.setEdge(['a', 'b'], {w: 20, h: 10, rank: 2} as Edata);
      g.runNormalize();
      const n = g.succs(g.succs('a')![0])![0];
      const nd = g.node(n)!;
      expect(nd.w).toBe(20);
      expect(nd.h).toBe(10);
    });
    it('preserves the weight for the edge', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 2} as qa.Ndata);
      g.setEdge(['a', 'b'], {weight: 2} as Edata);
      g.runNormalize();
      expect(g.succs('a')!.length).toBe(1);
      expect(g.edge(['a', g.succs('a')![0]])!.weight).toBe(2);
    });
  });

  describe('normalize undo', () => {
    it('reverses the run operation', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 2} as qa.Ndata);
      g.setEdge(['a', 'b'], {} as Edata);
      g.runNormalize();
      g.undoNormalize();
      expect(g.links().map(stripData)).toEqual([
        new qg.Link<Edata>(['a', 'b'])
      ]);
      expect(g.node('a')!.rank).toBe(0);
      expect(g.node('b')!.rank).toBe(2);
    });
    it('restores previous edge labels', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 2} as qa.Ndata);
      g.setEdge(['a', 'b'], {foo: 'bar'} as Edata);
      g.runNormalize().undoNormalize();
      expect((<Edata>g.edge(['a', 'b'])!).foo).toBe('bar');
    });
    it("collects assigned coordinates into the 'points' attribute", () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 2} as qa.Ndata);
      g.setEdge(['a', 'b'], {} as Edata);
      g.runNormalize();
      const nd = g.node(g.neighbors('a')![0])!;
      nd.x = 5;
      nd.y = 10;
      g.undoNormalize();
      expect(g.edge(['a', 'b'])!.points).toEqual([{x: 5, y: 10}]);
    });
    it("merges assigned coordinates into the 'points' attribute", () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 4} as qa.Ndata);
      g.setEdge(['a', 'b'], {} as Edata);
      g.runNormalize();
      const ad = g.node(g.neighbors('a')![0])!;
      ad.x = 5;
      ad.y = 10;
      const md = g.node(g.succs(g.succs('a')![0])![0])!;
      md.x = 20;
      md.y = 25;
      const bd = g.node(g.neighbors('b')![0])!;
      bd.x = 100;
      bd.y = 200;
      g.undoNormalize();
      expect(g.edge(['a', 'b'])!.points).toEqual([
        {x: 5, y: 10},
        {x: 20, y: 25},
        {x: 100, y: 200}
      ]);
    });
    it('sets coords and dims for the label, if the edge has one', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 2} as qa.Ndata);
      g.setEdge(['a', 'b'], {w: 10, h: 20, rank: 1} as Edata);
      g.runNormalize();
      const nd = g.node(g.succs('a')![0])!;
      nd.x = 50;
      nd.y = 60;
      nd.w = 20;
      nd.h = 10;
      g.undoNormalize();
      expect(_.pick(g.edge(['a', 'b']), ['x', 'y', 'w', 'h'])).toEqual({
        x: 50,
        y: 60,
        w: 20,
        h: 10
      });
    });
    it('sets coords and dims for the label, if the long edge has one', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 4} as qa.Ndata);
      g.setEdge(['a', 'b'], {w: 10, h: 20, rank: 2} as Edata);
      g.runNormalize();
      const nd = g.node(g.succs(g.succs('a')![0])![0])!;
      nd.x = 50;
      nd.y = 60;
      nd.w = 20;
      nd.h = 10;
      g.undoNormalize();
      expect(_.pick(g.edge(['a', 'b']), ['x', 'y', 'w', 'h'])).toEqual({
        x: 50,
        y: 60,
        w: 20,
        h: 10
      });
    });
    it('restores multi-edges', () => {
      g.setNode('a', {rank: 0} as qa.Ndata);
      g.setNode('b', {rank: 2} as qa.Ndata);
      g.setEdge(['a', 'b', 'bar'], {foo: 'bar'} as Edata);
      g.setEdge(['a', 'b', 'foo'], {foo: 'foo'} as Edata);
      g.runNormalize();
      const outs = _.sortBy(g.outLinks('a')!, 'name');
      expect(outs.length).toBe(2);
      const bd = g.node(outs[0].nodes[1])!;
      bd.x = 5;
      bd.y = 10;
      const fd = g.node(outs[1].nodes[1])!;
      fd.x = 15;
      fd.y = 20;
      g.undoNormalize();
      expect(g.hasEdge(['a', 'b'])).toBeFalse;
      expect(g.edge(['a', 'b', 'bar'])!.points).toEqual([{x: 5, y: 10}]);
      expect(g.edge(['a', 'b', 'foo'])!.points).toEqual([{x: 15, y: 20}]);
    });
  });
});

function stripData(o: any) {
  const c = _.clone(o);
  delete c.data;
  return c;
}

function stripName(o: any) {
  const c = _.clone(o);
  delete c.name;
  return c;
}

function checkFAS(g: Graph, fas: qg.Link<Edata>[]) {
  const n = g.nodeCount;
  const e = g.edgeCount;
  fas.forEach(l => {
    g.delEdge(l);
  });
  expect(g.findCycles()).toEqual([]);
  expect(fas.length).toBeLessThanOrEqual(Math.floor(e / 2) - Math.floor(n / 6));
}

function weight(g: Graph) {
  return (l: qg.Link<Edata>) => {
    return g.edge(l)!.weight;
  };
}
