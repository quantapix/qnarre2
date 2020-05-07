/* eslint-disable @typescript-eslint/unbound-method */
import * as _ from 'lodash';

import * as qu from './utils';
import * as qg from './graph';

describe('graph', () => {
  let g: qg.Graph<string, string | number, string | number>;

  beforeEach(() => {
    g = new qg.Graph({});
  });

  describe('initial state', () => {
    it('has no nodes', () => {
      expect(g.nodeCount).toBe(0);
    });
    it('has no edges', () => {
      expect(g.edgeCount).toBe(0);
    });
    it('has no data', () => {
      expect(g.data).toBeUndefined;
    });
    it('defaults to directed', () => {
      expect(g.isCompound).toBeFalse;
      expect(g.isDirected).toBeTrue;
      expect(g.isMultiple).toBeFalse;
    });
    it('can be undirected', () => {
      g = new qg.Graph({isDirected: false});
      expect(g.isDirected).toBeFalse;
      expect(g.isCompound).toBeFalse;
      expect(g.isMultiple).toBeFalse;
    });
    it('can be compound', () => {
      g = new qg.Graph({isCompound: true});
      expect(g.isDirected).toBeTrue;
      expect(g.isCompound).toBeTrue;
      expect(g.isMultiple).toBeFalse;
    });
    it('can be multiple', () => {
      g = new qg.Graph({isMultiple: true});
      expect(g.isDirected).toBeTrue;
      expect(g.isCompound).toBeFalse;
      expect(g.isMultiple).toBeTrue;
    });
  });

  describe('setData', () => {
    it('has get and set', () => {
      g.setData('foo');
      expect(g.data!).toBe('foo');
    });
    it('is chainable', () => {
      expect(g.setData('foo')).toBe(g);
    });
  });

  describe('nodes', () => {
    it('is empty if no nodes', () => {
      expect(g.nodes()).toEqual([]);
    });
    it('returns ids of nodes', () => {
      g.setNode('a').setNode('b');
      expect(g.nodes().sort(qu.sorter)).toEqual(['a', 'b']);
    });
  });

  describe('sources', () => {
    it('returns nodes that have no in-edges', () => {
      g.setPath(['a', 'b', 'c']).setNode('d');
      expect(g.sources().sort(qu.sorter)).toEqual(['a', 'd']);
    });
  });

  describe('sinks', () => {
    it('returns nodes that have no out-edges', () => {
      g.setPath(['a', 'b', 'c']).setNode('d');
      expect(g.sinks().sort(qu.sorter)).toEqual(['c', 'd']);
    });
  });

  describe('filterNodes', () => {
    it('returns identical when unfiltered', () => {
      g.setData('foo')
        .setNode('a', 123)
        .setPath(['a', 'b', 'c'])
        .setEdge(['a', 'c'], 456);
      const g2 = g.filterNodes(() => true);
      expect(g2.nodes().sort(qu.sorter)).toEqual(['a', 'b', 'c']);
      expect(g2.succs('a')!.sort(qu.sorter)).toEqual(['b', 'c']);
      expect(g2.succs('b')!.sort(qu.sorter)).toEqual(['c']);
      expect(g2.node('a')).toEqual(123);
      expect(g2.edge(['a', 'c'])).toEqual(456);
      expect(g2.data).toEqual('foo');
    });
    it('returns empty when filter nothing', () => {
      g.setPath(['a', 'b', 'c']);
      const g2 = g.filterNodes(() => false);
      expect(g2.nodes()).toEqual([]);
      expect(g2.edges()).toEqual([]);
    });
    it('only includes for which filter returns true', () => {
      g.setNodes(['a', 'b']);
      const g2 = g.filterNodes(n => n === 'a');
      expect(g2.nodes()).toEqual(['a']);
    });
    it('removes edges connected to removed nodes', () => {
      g.setEdge(['a', 'b']);
      const g2 = g.filterNodes(n => n === 'a');
      expect(g2.nodes().sort(qu.sorter)).toEqual(['a']);
      expect(g2.edges()).toEqual([]);
    });
    it('preserves directed', () => {
      g = new qg.Graph({isDirected: true});
      expect(g.filterNodes(() => true).isDirected).toBeTrue;
      g = new qg.Graph({isDirected: false});
      expect(g.filterNodes(() => true).isDirected).toBeFalse;
    });
    it('preserves multiple', () => {
      g = new qg.Graph({isMultiple: true});
      expect(g.filterNodes(() => true).isMultiple).toBeTrue;
      g = new qg.Graph({isMultiple: false});
      expect(g.filterNodes(() => true).isMultiple).toBeFalse;
    });
    it('preserves compound', () => {
      g = new qg.Graph({isCompound: true});
      expect(g.filterNodes(() => true).isCompound).toBeTrue;
      g = new qg.Graph({isCompound: false});
      expect(g.filterNodes(() => true).isCompound).toBeFalse;
    });
    it('includes subgraphs', () => {
      g = new qg.Graph({isCompound: true});
      g.setParent('a', 'parent');
      const g2 = g.filterNodes(() => true);
      expect(g2.parent('a')).toEqual('parent');
    });
    it('includes multi-level subgraphs', () => {
      g = new qg.Graph({isCompound: true});
      g.setParent('a', 'parent').setParent('parent', 'root');
      const g2 = g.filterNodes(() => true);
      expect(g2.parent('a')).toEqual('parent');
      expect(g2.parent('parent')).toEqual('root');
    });
    it('promotes to higher subgraph if parent not included', () => {
      g = new qg.Graph({isCompound: true});
      g.setParent('a', 'parent').setParent('parent', 'root');
      const g2 = g.filterNodes(n => n !== 'parent');
      expect(g2.parent('a')).toEqual('root');
    });
  });

  describe('setNodes', () => {
    it('creates multiple nodes', () => {
      g.setNodes(['a', 'b', 'c']);
      expect(g.hasNode('a')).toBeTrue;
      expect(g.hasNode('b')).toBeTrue;
      expect(g.hasNode('c')).toBeTrue;
    });
    it('can set data for all nodes', () => {
      g.setNodes(['a', 'b', 'c'], 123);
      expect(g.node('a')).toBe(123);
      expect(g.node('b')).toBe(123);
      expect(g.node('c')).toBe(123);
    });
    it('is chainable', () => {
      expect(g.setNodes(['a', 'b', 'c'])).toBe(g);
    });
  });

  describe('setNode', () => {
    it('creates node if not part of graph', () => {
      g.setNode('a');
      expect(g.hasNode('a')).toBeTrue;
      expect(g.node('a')).toBe(undefined);
      expect(g.node('a')).toBeUndefined;
      expect(g.nodeCount).toBe(1);
    });
    it('can set data for node', () => {
      g.setNode('a', 'foo');
      expect(g.node('a')).toBe('foo');
    });
    it('does not change data', () => {
      g.setNode('a', 123);
      g.setNode('a');
      expect(g.node('a')).toBe(123);
    });
    it('can remove data by passing null', () => {
      g.setNode('a', 123);
      expect(g.node('a')).toBe(123);
      g.setNode('a');
      expect(g.node('a')).toBe(123);
      g.setNode('a', null);
      expect(g.node('a')).toBeUndefined;
      expect(g.node('a')).toBe(undefined);
    });
    it('is idempotent', () => {
      g.setNode('a', 123).setNode('a', 123);
      expect(g.node('a')).toBe(123);
      expect(g.nodeCount).toBe(1);
    });
    it('uses the stringified form of node', () => {
      g.setNode(1);
      expect(g.hasNode(1)).toBeTrue;
      expect(g.hasNode('1')).toBeTrue;
      expect(g.nodes()).toEqual(['1']);
    });
    it('is chainable', () => {
      expect(g.setNode('a')).toBe(g);
    });
  });

  describe('setNodeDefaults', () => {
    it('sets default data for new nodes', () => {
      g.setDefNode('foo').setNode('a');
      expect(g.node('a')).toBe('foo');
    });
    it('does not change existing nodes', () => {
      g.setNode('a').setDefNode('foo');
      expect(g.node('a')).toBeUndefined;
    });
    it('not used if an explicit data is set', () => {
      g.setDefNode('foo').setNode('a', 'bar');
      expect(g.node('a')).toBe('bar');
    });
    it('can take a function', () => {
      g.setDefNode(() => 'foo').setNode('a');
      expect(g.node('a')).toBe('foo');
    });
    it('can take a function that takes name of node', () => {
      g.setDefNode((n: string) => n + '-foo').setNode('a');
      expect(g.node('a')).toBe('a-foo');
    });
    it('is chainable', () => {
      expect(g.setDefNode('foo')).toBe(g);
    });
  });

  describe('nodeData', () => {
    it('returns undefined if not part of graph', () => {
      expect(g.node('a')).toBeUndefined;
    });
    it('returns data if part of graph', () => {
      g.setNode('a', 'foo');
      expect(g.node('a')).toBe('foo');
    });
  });

  describe('removeNode', () => {
    it('does nothing if node is not in graph', () => {
      expect(g.nodeCount).toBe(0);
      g.delNode('a');
      expect(g.hasNode('a')).toBeFalse;
      expect(g.nodeCount).toBe(0);
    });
    it('removes node if in graph', () => {
      g.setNode('a').delNode('a');
      expect(g.hasNode('a')).toBeFalse;
      expect(g.nodeCount).toBe(0);
    });
    it('is idempotent', () => {
      g.setNode('a')
        .delNode('a')
        .delNode('a');
      expect(g.hasNode('a')).toBeFalse;
      expect(g.nodeCount).toBe(0);
    });
    it('removes incident edges', () => {
      g.setEdge(['a', 'b'])
        .setEdge(['b', 'c'])
        .delNode('b');
      expect(g.edgeCount).toBe(0);
    });
    it('removes parent relationships', () => {
      g = new qg.Graph({isCompound: true});
      g.setParent('c', 'b')
        .setParent('b', 'a')
        .delNode('b');
      expect(g.parent('b')).toBeUndefined;
      expect(g.children('b')).toBeUndefined;
      expect(g.children('a')).not.toContain('b');
      expect(g.parent('c')).toBeUndefined;
    });
    it('is chainable', () => {
      expect(g.delNode('a')).toBe(g);
    });
  });

  describe('setParent', () => {
    beforeEach(() => {
      g = new qg.Graph({isCompound: true});
    });
    it('throws if not compound', () => {
      expect(() => {
        new qg.Graph({}).setParent('a', 'parent');
      }).toThrow();
    });
    it('creates parent if does not exist', () => {
      g.setNode('a').setParent('a', 'parent');
      expect(g.hasNode('parent')).toBeTrue;
      expect(g.parent('a')).toBe('parent');
    });
    it('creates child if does not exist', () => {
      g.setNode('parent').setParent('a', 'parent');
      expect(g.hasNode('a')).toBeTrue;
      expect(g.parent('a')).toBe('parent');
    });
    it('has parent as undefined if has never been invoked', () => {
      g.setNode('a');
      expect(g.parent('a')).toBeUndefined;
    });
    it('moves node from previous parent', () => {
      g.setParent('a', 'parent').setParent('a', 'parent2');
      expect(g.parent('a')).toBe('parent2');
      expect(g.children('parent')).toEqual([]);
      expect(g.children('parent2')).toEqual(['a']);
    });
    it('removes parent if undefined', () => {
      g.setParent('a', 'parent');
      g.setParent('a', undefined);
      expect(g.parent('a')).toBeUndefined;
      expect(g.children()?.sort(qu.sorter)).toEqual(['a', 'parent']);
    });
    it('removes parent if no parent specified', () => {
      g.setParent('a', 'parent');
      g.setParent('a');
      expect(g.parent('a')).toBeUndefined;
      expect(g.children()?.sort(qu.sorter)).toEqual(['a', 'parent']);
    });
    it('is idempotent to remove a parent', () => {
      g.setParent('a', 'parent');
      g.setParent('a');
      g.setParent('a');
      expect(g.parent('a')).toBeUndefined;
      expect(g.children()?.sort(qu.sorter)).toEqual(['a', 'parent']);
    });
    it('uses the stringified id', () => {
      g.setParent(2, 1);
      g.setParent(3, 2);
      expect(g.parent(2)).toBe('1');
      expect(g.parent('2')).toBe('1');
      expect(g.parent(3)).toBe('2');
    });
    it('preserves tree invariant', () => {
      g.setParent('c', 'b');
      g.setParent('b', 'a');
      expect(() => {
        g.setParent('a', 'c');
      }).toThrow();
    });
    it('is chainable', () => {
      expect(g.setParent('a', 'parent')).toBe(g);
    });
  });

  describe('parent', () => {
    beforeEach(() => {
      g = new qg.Graph({isCompound: true});
    });
    it('returns undefined if not compound', () => {
      expect(new qg.Graph({isCompound: false}).parent('a')).toBeUndefined;
    });
    it('returns undefined if node not in graph', () => {
      expect(g.parent('a')).toBeUndefined;
    });
    it('defaults to undefined for new nodes', () => {
      g.setNode('a');
      expect(g.parent('a')).toBeUndefined;
    });
    it('returns the current parent assignment', () => {
      g.setNode('a');
      g.setNode('parent');
      g.setParent('a', 'parent');
      expect(g.parent('a')).toBe('parent');
    });
  });

  describe('children', () => {
    beforeEach(() => {
      g = new qg.Graph({isCompound: true});
    });
    it('returns undefined if node not in graph', () => {
      expect(g.children('a')).toBeUndefined;
    });
    it('defaults to en empty list for new nodes', () => {
      g.setNode('a');
      expect(g.children('a')).toEqual([]);
    });
    it('returns undefined for non-compound without node', () => {
      g = new qg.Graph({});
      expect(g.children('a')).toBeUndefined;
    });
    it('returns empty list for non-compound with node', () => {
      g = new qg.Graph({});
      g.setNode('a');
      expect(g.children('a')).toEqual([]);
    });
    it('returns all nodes for root of non-compound', () => {
      g = new qg.Graph({});
      g.setNode('a');
      g.setNode('b');
      expect(g.children()?.sort(qu.sorter)).toEqual(['a', 'b']);
    });
    it('returns children for node', () => {
      g.setParent('a', 'parent');
      g.setParent('b', 'parent');
      expect(g.children('parent')?.sort(qu.sorter)).toEqual(['a', 'b']);
    });
    it('returns all nodes without parent when parent not set', () => {
      g.setNode('a');
      g.setNode('b');
      g.setNode('c');
      g.setNode('parent');
      g.setParent('a', 'parent');
      expect(g.children()?.sort(qu.sorter)).toEqual(['b', 'c', 'parent']);
      expect(g.children(undefined)?.sort(qu.sorter)).toEqual([
        'b',
        'c',
        'parent'
      ]);
    });
  });

  describe('predecessors', () => {
    it('returns undefined for node not in graph', () => {
      expect(g.preds('a')).toBeUndefined;
    });
    it('returns the predecessors of a node', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      g.setEdge(['a', 'a']);
      expect(g.preds('a')!.sort(qu.sorter)).toEqual(['a']);
      expect(g.preds('b')!.sort(qu.sorter)).toEqual(['a']);
      expect(g.preds('c')!.sort(qu.sorter)).toEqual(['b']);
    });
  });

  describe('successors', () => {
    it('returns undefined for node not in graph', () => {
      expect(g.succs('a')).toBeUndefined;
    });
    it('returns the successors of a node', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      g.setEdge(['a', 'a']);
      expect(g.succs('a')!.sort(qu.sorter)).toEqual(['a', 'b']);
      expect(g.succs('b')!.sort(qu.sorter)).toEqual(['c']);
      expect(g.succs('c')!.sort(qu.sorter)).toEqual([]);
    });
  });

  describe('neighbors', () => {
    it('returns undefined for node not in graph', () => {
      expect(g.neighbors('a')).toBeUndefined;
    });
    it('returns the neighbors of a node', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      g.setEdge(['a', 'a']);
      expect(g.neighbors('a')!.sort(qu.sorter)).toEqual(['a', 'b']);
      expect(g.neighbors('b')!.sort(qu.sorter)).toEqual(['a', 'c']);
      expect(g.neighbors('c')!.sort(qu.sorter)).toEqual(['b']);
    });
  });

  describe('isLeaf', () => {
    it('returns false for connected node in undirected', () => {
      g = new qg.Graph({isDirected: false});
      g.setNode('a');
      g.setNode('b');
      g.setEdge(['a', 'b']);
      expect(g.isLeaf('b')).toBeFalse;
    });
    it('returns true for unconnected node in undirected', () => {
      g = new qg.Graph({isDirected: false});
      g.setNode('a');
      expect(g.isLeaf('a')).toBeTrue;
    });
    it('returns true for unconnected node in directed', () => {
      g.setNode('a');
      expect(g.isLeaf('a')).toBeTrue;
    });
    it('returns false for predecessor node in directed', () => {
      g.setNode('a');
      g.setNode('b');
      g.setEdge(['a', 'b']);
      expect(g.isLeaf('a')).toBeFalse;
    });
    it('returns true for successor node in directed', () => {
      g.setNode('a');
      g.setNode('b');
      g.setEdge(['a', 'b']);
      expect(g.isLeaf('b')).toBeTrue;
    });
  });

  describe('edges', () => {
    it('is empty if no edges', () => {
      expect(g.edges()).toEqual([]);
    });
    it('returns links for edges', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      expect(_.sortBy(g.links(), [0, 1])).toEqual([
        new qg.Link(['a', 'b'], g),
        new qg.Link(['b', 'c'], g)
      ]);
    });
  });

  describe('setPath', () => {
    it('creates a path of mutiple edges', () => {
      g.setPath(['a', 'b', 'c']);
      expect(g.hasEdge(['a', 'b'])).toBeTrue;
      expect(g.hasEdge(['b', 'c'])).toBeTrue;
    });
    it('can set data for all edges', () => {
      g.setPath(['a', 'b', 'c'], 'foo');
      expect(g.edge(['a', 'b'])).toBe('foo');
      expect(g.edge(['b', 'c'])).toBe('foo');
    });
    it('is chainable', () => {
      expect(g.setPath(['a', 'b', 'c'])).toBe(g);
    });
  });

  describe('setEdge', () => {
    it('creates edge if not part of graph', () => {
      g.setNode('a');
      g.setNode('b');
      g.setEdge(['a', 'b']);
      expect(g.edge(['a', 'b'])).toBeUndefined;
      expect(g.hasEdge(['a', 'b'])).toBeTrue;
      expect(g.edgeCount).toBe(1);
    });
    it('creates nodes for edge if not part of graph', () => {
      g.setEdge(['a', 'b']);
      expect(g.hasNode('a')).toBeTrue;
      expect(g.hasNode('b')).toBeTrue;
      expect(g.nodeCount).toBe(2);
    });
    it('creates a multi-edge if not part of graph', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b', 'name'], undefined);
      expect(g.hasEdge(['a', 'b'])).toBeFalse;
      expect(g.hasEdge(['a', 'b', 'name'])).toBeTrue;
    });
    it('throws if multi-edge is used with non-multigraph', () => {
      expect(() => {
        g.setEdge(['a', 'b', 'name'], undefined);
      }).toThrow();
    });
    it('changes data for edge if already in graph', () => {
      g.setEdge(['a', 'b'], 'foo');
      g.setEdge(['a', 'b'], 'bar');
      expect(g.edge(['a', 'b'])).toBe('bar');
    });
    it('deletes data for edge if data undefined', () => {
      g.setEdge(['a', 'b'], 'foo');
      g.setEdge(['a', 'b'], undefined);
      expect(g.edge(['a', 'b'])).toBeUndefined;
      expect(g.hasEdge(['a', 'b'])).toBeTrue;
    });
    it('changes data for multi-edge if already in graph', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b', 'name'], 'value');
      g.setEdge(['a', 'b', 'name'], undefined);
      expect(g.edge(['a', 'b', 'name'])).toBeUndefined;
      expect(g.hasEdge(['a', 'b', 'name'])).toBeTrue;
    });
    it('can take link as first parameter', () => {
      g.setEdge(new qg.Link(['a', 'b']), 'value');
      expect(g.edge(['a', 'b'])).toBe('value');
    });
    it('can take multi-link as first parameter', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(new qg.Link(['a', 'b', 'name']), 'value');
      expect(g.edge(['a', 'b', 'name'])).toBe('value');
    });
    it('uses stringified form of id #1', () => {
      g.setEdge([1, 2], 'foo');
      expect(g.edges()).toEqual([new qg.Link(['1', '2'], g).edge]);
      expect(g.edge(['1', '2'])).toBe('foo');
      expect(g.edge([1, 2])).toBe('foo');
    });
    it('uses stringified form of id #2', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge([1, 2, undefined], 'foo');
      expect(g.edges()).toEqual([new qg.Link(['1', '2'], g).edge]);
      expect(g.edge(['1', '2'])).toBe('foo');
      expect(g.edge([1, 2])).toBe('foo');
    });
    it('uses stringified form of id with name', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge([1, 2, 3], 'foo');
      expect(g.edges()).toEqual([new qg.Link(['1', '2', '3'], g).edge]);
      expect(g.edge(['1', '2', '3'])).toBe('foo');
      expect(g.edge([1, 2, 3])).toBe('foo');
    });
    it('treats opposite edges as distinct', () => {
      g.setEdge(['a', 'b']);
      expect(g.hasEdge(['a', 'b'])).toBeTrue;
      expect(g.hasEdge(['b', 'a'])).toBeFalse;
    });
    it('handles undirected edges', () => {
      g = new qg.Graph({isDirected: false});
      g.setEdge(['a', 'b'], 'foo');
      expect(g.edge(['a', 'b'])).toBe('foo');
      expect(g.edge(['b', 'a'])).toBe('foo');
    });
    it('handles undirected w/ different order than stringified', () => {
      g = new qg.Graph({isDirected: false});
      g.setEdge([9, 10], 'foo');
      expect(g.hasEdge(['9', '10'])).toBeTrue;
      expect(g.hasEdge([9, 10])).toBeTrue;
      expect(g.hasEdge(['10', '9'])).toBeTrue;
      expect(g.hasEdge([10, 9])).toBeTrue;
      expect(g.edge(['9', '10'])).toEqual('foo');
      expect(g.edge([9, 10])).toEqual('foo');
    });
    it('is chainable', () => {
      expect(g.setEdge(['a', 'b'])).toBe(g);
    });
  });

  describe('setEdgeDefaults', () => {
    it('sets default data for new edges', () => {
      g.setDefEdge('foo').setEdge(['a', 'b']);
      expect(g.edge(['a', 'b'])).toBe('foo');
    });
    it('does not change existing edges', () => {
      g.setEdge(['a', 'b']).setDefEdge('foo');
      expect(g.edge(['a', 'b'])).toBeUndefined;
    });
    it('is not used if explicit data is set', () => {
      g.setDefEdge('foo').setEdge(['a', 'b'], 'bar');
      expect(g.edge(['a', 'b'])).toBe('bar');
    });
    it('can take a function', () => {
      g.setDefEdge(() => 'foo').setEdge(['a', 'b']);
      expect(g.edge(['a', 'b'])).toBe('foo');
    });
    it("can take a function with edge's endpoints and name", () => {
      g = new qg.Graph({isMultiple: true});
      g.setDefEdge((l: qg.Link<string | number>) => {
        return l.nodes.join('-') + '-foo';
      });
      g.setEdge(new qg.Link(['a', 'b', 'name']));
      expect(g.edge(['a', 'b', 'name'])).toBe('a-b-name-foo');
    });
    it('does not set default for multi-edge that exists', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b', 'name'], 'old')
        .setDefEdge(() => 'should not set this')
        .setEdge(new qg.Link(['a', 'b', 'name']));
      expect(g.edge(['a', 'b', 'name'])).toBe('old');
    });
    it('is chainable', () => {
      expect(g.setDefEdge('foo')).toBe(g);
    });
  });

  describe('edge', () => {
    it('returns undefined if edge not part of the graph', () => {
      expect(g.edge(['a', 'b'])).toBeUndefined;
      expect(g.edge(new qg.Link(['a', 'b']))).toBeUndefined;
      expect(g.edge(['a', 'b', 'foo'])).toBeUndefined;
    });
    it('returns data of edge if part of graph', () => {
      g.setEdge(['a', 'b'], 'bar');
      expect(g.edge(['a', 'b'])).toEqual('bar');
      expect(g.edge(new qg.Link(['a', 'b']))).toEqual('bar');
      expect(g.edge(['b', 'a'])).toBeUndefined;
    });
    it('returns data of multi-edge if part of graph', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b', 'foo'], 'baz');
      expect(g.edge(['a', 'b', 'foo'])).toEqual('baz');
      expect(g.edge(['a', 'b'])).toBeUndefined;
    });
    it('returns edge in either direction in undirected', () => {
      g = new qg.Graph({isDirected: false});
      g.setEdge(['a', 'b'], 'bar');
      expect(g.edge(['a', 'b'])).toEqual('bar');
      expect(g.edge(['b', 'a'])).toEqual('bar');
    });
  });

  describe('delete edge', () => {
    it('has no effect if edge is not in graph', () => {
      g.delEdge(['a', 'b']);
      expect(g.hasEdge(['a', 'b'])).toBeFalse;
      expect(g.edgeCount).toBe(0);
    });
    it('can remove edge by link', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(new qg.Link(['a', 'b', 'foo']));
      g.delEdge(new qg.Link(['a', 'b', 'foo']));
      expect(g.hasEdge(['a', 'b', 'foo'])).toBeFalse;
      expect(g.edgeCount).toBe(0);
    });
    it('can remove edge by separate ids', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(new qg.Link(['a', 'b', 'foo']));
      g.delEdge(['a', 'b', 'foo']);
      expect(g.hasEdge(['a', 'b', 'foo'])).toBeFalse;
      expect(g.edgeCount).toBe(0);
    });
    it('correctly removes neighbors', () => {
      g.setEdge(['a', 'b']);
      g.delEdge(['a', 'b']);
      expect(g.succs('a')).toEqual([]);
      expect(g.neighbors('a')).toEqual([]);
      expect(g.preds('b')).toEqual([]);
      expect(g.neighbors('b')).toEqual([]);
    });
    it('correctly decrements neighbor counts', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b']);
      g.setEdge(new qg.Link(['a', 'b', 'foo']));
      g.delEdge(['a', 'b']);
      expect(g.hasEdge(['a', 'b', 'foo']));
      expect(g.succs('a')).toEqual(['b']);
      expect(g.neighbors('a')).toEqual(['b']);
      expect(g.preds('b')).toEqual(['a']);
      expect(g.neighbors('b')).toEqual(['a']);
    });
    it('works with undirected graphs', () => {
      g = new qg.Graph({isDirected: false});
      g.setEdge(['h', 'g']);
      g.delEdge(['g', 'h']);
      expect(g.neighbors('g')).toEqual([]);
      expect(g.neighbors('h')).toEqual([]);
    });
    it('is chainable', () => {
      g.setEdge(['a', 'b']);
      expect(g.delEdge(['a', 'b'])).toBe(g);
    });
  });

  describe('inLinks', () => {
    it('returns undefined for node not in graph', () => {
      expect(g.inLinks('a')).toBeUndefined;
    });
    it('returns edges that point at specified node', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      expect(g.inLinks('a')).toEqual([]);
      expect(g.inLinks('b')).toEqual([new qg.Link(['a', 'b'], g)]);
      expect(g.inLinks('c')).toEqual([new qg.Link(['b', 'c'], g)]);
    });
    it('works for multigraphs', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b']);
      g.setEdge(['a', 'b', 'bar'], undefined);
      g.setEdge(['a', 'b', 'foo'], undefined);
      expect(g.inLinks('a')).toEqual([]);
      expect(_.sortBy(g.inLinks('b'), 2)).toEqual([
        new qg.Link(['a', 'b']),
        new qg.Link(['a', 'b', 'bar'], g),
        new qg.Link(['a', 'b', 'foo'], g)
      ]);
    });
    it('can return only edges from specified node', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b']);
      g.setEdge(['a', 'b', 'foo'], undefined);
      g.setEdge(['a', 'c']);
      g.setEdge(['b', 'c']);
      g.setEdge(['z', 'a']);
      g.setEdge(['z', 'b']);
      expect(g.inLinks('a', 'b')).toEqual([]);
      expect(_.sortBy(g.inLinks('b', 'a'), 2)).toEqual([
        new qg.Link(['a', 'b']),
        new qg.Link(['a', 'b', 'foo'], g)
      ]);
    });
  });

  describe('outLinks', () => {
    it('returns undefined for node not in graph', () => {
      expect(g.outLinks('a')).toBeUndefined;
    });
    it('returns all edges that node points at', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      expect(g.outLinks('a')).toEqual([new qg.Link(['a', 'b'], g)]);
      expect(g.outLinks('b')).toEqual([new qg.Link(['b', 'c'], g)]);
      expect(g.outLinks('c')).toEqual([]);
    });
    it('works for multigraphs', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b']);
      g.setEdge(['a', 'b', 'bar'], undefined);
      g.setEdge(['a', 'b', 'foo'], undefined);
      expect(_.sortBy(g.outLinks('a'), 2)).toEqual([
        new qg.Link(['a', 'b'], g),
        new qg.Link(['a', 'b', 'bar'], g),
        new qg.Link(['a', 'b', 'foo'], g)
      ]);
      expect(g.outLinks('b')).toEqual([]);
    });
    it('can return only edges to specified node', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b']);
      g.setEdge(['a', 'b', 'foo'], undefined);
      g.setEdge(['a', 'c']);
      g.setEdge(['b', 'c']);
      g.setEdge(['z', 'a']);
      g.setEdge(['z', 'b']);
      expect(_.sortBy(g.outLinks('a', 'b'), 1)).toEqual([
        new qg.Link(['a', 'b'], g),
        new qg.Link(['a', 'b', 'foo'], g)
      ]);
      expect(g.outLinks('b', 'a')).toEqual([]);
    });
  });

  describe('nodeLinks', () => {
    it('returns undefined for node not in graph', () => {
      expect(g.nodeLinks('a')).toBeUndefined;
    });
    it('returns all edges that node points at', () => {
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      expect(g.nodeLinks('a')).toEqual([new qg.Link(['a', 'b'], g)]);
      expect(_.sortBy(g.nodeLinks('b'), [0, 1])).toEqual([
        new qg.Link(['a', 'b'], g),
        new qg.Link(['b', 'c'], g)
      ]);
      expect(g.nodeLinks('c')).toEqual([new qg.Link(['b', 'c'], g)]);
    });
    it('works for multigraphs', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b']);
      g.setEdge(new qg.Link(['a', 'b', 'bar']));
      g.setEdge(new qg.Link(['a', 'b', 'foo']));
      expect(_.sortBy(g.nodeLinks('a'), 2)).toEqual([
        new qg.Link(['a', 'b'], g),
        new qg.Link(['a', 'b', 'bar'], g),
        new qg.Link(['a', 'b', 'foo'], g)
      ]);
      expect(_.sortBy(g.nodeLinks('b'), 2)).toEqual([
        new qg.Link(['a', 'b'], g),
        new qg.Link(['a', 'b', 'bar'], g),
        new qg.Link(['a', 'b', 'foo'], g)
      ]);
    });
    it('can return only edges between specific nodes', () => {
      g = new qg.Graph({isMultiple: true});
      g.setEdge(['a', 'b']);
      g.setEdge(new qg.Link(['a', 'b', 'foo']));
      g.setEdge(['a', 'c']);
      g.setEdge(['b', 'c']);
      g.setEdge(['z', 'a']);
      g.setEdge(['z', 'b']);
      expect(_.sortBy(g.nodeLinks('a', 'b'), 2)).toEqual([
        new qg.Link(['a', 'b'], g),
        new qg.Link(['a', 'b', 'foo'], g)
      ]);
      expect(_.sortBy(g.nodeLinks('b', 'a'), 2)).toEqual([
        new qg.Link(['a', 'b'], g),
        new qg.Link(['a', 'b', 'foo'], g)
      ]);
    });
  });

  describe('components', () => {
    it('returns empty list for empty graph', () => {
      expect(g.components()).toEqual([]);
    });
    it('returns singleton lists for unconnected nodes', () => {
      g = new qg.Graph({isDirected: false});
      g.setNode('a');
      g.setNode('b');
      const r = _.sortBy(g.components(), c => {
        return _.min(c);
      });
      expect(r).toEqual([['a'], ['b']]);
    });
    it('returns list of nodes in component', () => {
      g = new qg.Graph({isDirected: false});
      g.setEdge(['a', 'b']);
      g.setEdge(['b', 'c']);
      const r = _.map(g.components(), c => {
        return _.sortBy(c);
      });
      expect(r).toEqual([['a', 'b', 'c']]);
    });
    it('returns nodes by a neighbor relationship in digraph', () => {
      g.setPath(['a', 'b', 'c', 'a']);
      g.setEdge(['d', 'c']);
      g.setEdge(['e', 'f']);
      const r = _.sortBy(
        g.components().map(c => {
          return c.sort(qu.sorter);
        }),
        '0'
      );
      expect(r).toEqual([
        ['a', 'b', 'c', 'd'],
        ['e', 'f']
      ]);
    });
  });
});
