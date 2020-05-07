import * as _ from 'lodash';

import * as qg from './graph';
import * as qs from './sort';
import * as qt from './types';
import * as qu from './utils';

type QG = qg.Graph<any, qs.Ndata, qs.Edata>;
type QS = qs.Graph<any, qs.Ndata, qs.Edata>;

interface Graph extends QS, QG {}
class Graph extends qg.Graph<any, qs.Ndata, qs.Edata> {}
qu.applyMixins(Graph, [qs.Graph, qg.Graph]);

describe('sort', () => {
  it('sorts nodes by mass', () => {
    const cs = [
      new qs.Conflict(['a'], 0, 2, 3),
      new qs.Conflict(['b'], 1, 1, 2)
    ];
    expect(qs.sort(cs)).toEqual(
      new qs.Mass(['b', 'a'], (2 * 3 + 1 * 2) / (3 + 2), 3 + 2)
    );
  });
  it('can sort super-nodes', () => {
    const cs = [
      new qs.Conflict(['a', 'c', 'd'], 0, 2, 3),
      new qs.Conflict(['b'], 1, 1, 2)
    ];
    expect(qs.sort(cs)).toEqual(
      new qs.Mass(['b', 'a', 'c', 'd'], (2 * 3 + 1 * 2) / (3 + 2), 3 + 2)
    );
  });
  it('biases to left by default', () => {
    const cs = [
      new qs.Conflict(['a'], 0, 1, 1),
      new qs.Conflict(['b'], 1, 1, 1)
    ];
    expect(qs.sort(cs)).toEqual(new qs.Mass(['a', 'b'], 1, 2));
  });
  it('biases to right if bias = true', () => {
    const cs = [
      new qs.Conflict(['a'], 0, 1, 1),
      new qs.Conflict(['b'], 1, 1, 1)
    ];
    expect(qs.sort(cs, true)).toEqual(new qs.Mass(['b', 'a'], 1, 2));
  });
  it('can sort nodes without mass', () => {
    const cs = [
      new qs.Conflict(['a'], 0, 2, 1),
      new qs.Conflict(['b'], 1, 6, 1),
      new qs.Conflict(['c'], 2),
      new qs.Conflict(['d'], 3, 3, 1)
    ];
    expect(qs.sort(cs)).toEqual(
      new qs.Mass(['a', 'd', 'c', 'b'], (2 + 6 + 3) / 3, 3)
    );
  });
  it('can handle no masses for nodes', () => {
    const cs = [
      new qs.Conflict(['a'], 0),
      new qs.Conflict(['b'], 3),
      new qs.Conflict(['c'], 2),
      new qs.Conflict(['d'], 1)
    ];
    expect(qs.sort(cs)).toEqual(
      new qs.Mass(['a', 'd', 'c', 'b'], undefined, undefined)
    );
  });
  it('can handle mass of 0', () => {
    const cs = [
      new qs.Conflict(['a'], 0, 0, 1),
      new qs.Conflict(['b'], 3),
      new qs.Conflict(['c'], 2),
      new qs.Conflict(['d'], 1)
    ];
    expect(qs.sort(cs)).toEqual(new qs.Mass(['a', 'd', 'c', 'b'], 0, 1));
  });
});

describe('sortSubgraph', () => {
  let g: Graph, cg: Graph;
  beforeEach(() => {
    g = new Graph({isCompound: true})
      .setDefNode(() => {
        return {} as qs.Ndata;
      })
      .setDefEdge(() => {
        return {weight: 1} as qs.Edata;
      });
    _.forEach(_.range(5), v => g.setNode(v, {order: v} as qs.Ndata));
    cg = new Graph({});
  });
  it('sorts flat subgraph based on mass', () => {
    g.setEdge([3, 'x']);
    g.setEdge([1, 'y'], {weight: 2} as qs.Edata);
    g.setEdge([4, 'y']);
    _.forEach(['x', 'y'], n => g.setParent(n, 'movable'));
    expect(g.sortSubgraph('movable', cg).ns).toEqual(['y', 'x']);
  });
  it('preserves pos of node (y) w/o neighbors in flat subgraph', () => {
    g.setEdge([3, 'x']);
    g.setNode('y');
    g.setEdge([1, 'z'], {weight: 2} as qs.Edata);
    g.setEdge([4, 'z']);
    _.forEach(['x', 'y', 'z'], n => g.setParent(n, 'movable'));
    expect(g.sortSubgraph('movable', cg).ns).toEqual(['z', 'y', 'x']);
  });
  it('biases to left without bias', () => {
    g.setEdge([1, 'x']);
    g.setEdge([1, 'y']);
    _.forEach(['x', 'y'], n => g.setParent(n, 'movable'));
    expect(g.sortSubgraph('movable', cg).ns).toEqual(['x', 'y']);
  });
  it('biases to right with bias', () => {
    g.setEdge([1, 'x']);
    g.setEdge([1, 'y']);
    _.forEach(['x', 'y'], n => g.setParent(n, 'movable'));
    expect(g.sortSubgraph('movable', cg, true).ns).toEqual(['y', 'x']);
  });
  it('aggregates stats about subgraph', () => {
    g.setEdge([3, 'x']);
    g.setEdge([1, 'y'], {weight: 2} as qs.Edata);
    g.setEdge([4, 'y']);
    _.forEach(['x', 'y'], n => g.setParent(n, 'movable'));
    const m = g.sortSubgraph('movable', cg);
    expect(m.value).toBe(2.25);
    expect(m.weight).toBe(4);
  });
  it('can sort nested subgraph with no mass', () => {
    g.setNodes(['a', 'b', 'c']);
    g.setParent('a', 'y');
    g.setParent('b', 'y');
    g.setParent('c', 'y');
    g.setEdge([0, 'x']);
    g.setEdge([1, 'z']);
    g.setEdge([2, 'y']);
    _.forEach(['x', 'y', 'z'], n => g.setParent(n, 'movable'));
    expect(g.sortSubgraph('movable', cg).ns).toEqual(['x', 'z', 'a', 'b', 'c']);
  });
  it('can sort nested subgraph with mass', () => {
    g.setNodes(['a', 'b', 'c']);
    g.setParent('a', 'y');
    g.setParent('b', 'y');
    g.setParent('c', 'y');
    g.setEdge([0, 'a'], {weight: 3} as qs.Edata);
    g.setEdge([0, 'x']);
    g.setEdge([1, 'z']);
    g.setEdge([2, 'y']);
    _.forEach(['x', 'y', 'z'], n => g.setParent(n, 'movable'));
    expect(g.sortSubgraph('movable', cg).ns).toEqual(['x', 'a', 'b', 'c', 'z']);
  });
  it('can sort nested subgraph with no in-edges', () => {
    g.setNodes(['a', 'b', 'c']);
    g.setParent('a', 'y');
    g.setParent('b', 'y');
    g.setParent('c', 'y');
    g.setEdge([0, 'a']);
    g.setEdge([1, 'b']);
    g.setEdge([0, 'x']);
    g.setEdge([1, 'z']);
    _.forEach(['x', 'y', 'z'], n => g.setParent(n, 'movable'));
    expect(g.sortSubgraph('movable', cg).ns).toEqual(['x', 'a', 'b', 'c', 'z']);
  });
  it('sorts border nodes to extremes of subgraph', () => {
    g.setEdge([0, 'x']);
    g.setEdge([1, 'y']);
    g.setEdge([2, 'z']);
    g.setNode('sg1', {
      border: {left: ['bl'], right: ['br']} as qt.Border
    } as qs.Ndata);
    _.forEach(['x', 'y', 'z', 'bl', 'br'], n => g.setParent(n, 'sg1'));
    expect(g.sortSubgraph('sg1', cg).ns).toEqual(['bl', 'x', 'y', 'z', 'br']);
  });
  it('assigns a mass to subgraph based on prev border nodes', () => {
    g.setNode('bl1', {order: 0} as qs.Ndata);
    g.setNode('br1', {order: 1} as qs.Ndata);
    g.setEdge(['bl1', 'bl2']);
    g.setEdge(['br1', 'br2']);
    _.forEach(['bl2', 'br2'], n => g.setParent(n, 'sg'));
    g.setNode('sg', {
      border: {left: ['bl2'], right: ['br2']} as qt.Border
    } as qs.Ndata);
    expect(g.sortSubgraph('sg', cg)).toEqual(
      new qs.Mass(['bl2', 'br2'], 0.5, 2)
    );
  });
});

describe('masses', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({})
      .setDefNode(() => {
        return {} as qs.Ndata;
      })
      .setDefEdge(() => {
        return {weight: 1} as qs.Edata;
      });
  });
  it('assigns undefined mass for node with no preds', () => {
    g.setNode('x', {} as qs.Ndata);
    const ms = g.masses(['x']);
    expect(ms.length).toBe(1);
    expect(ms[0]).toEqual(new qs.Mass(['x']));
  });
  it('assigns position of the sole preds', () => {
    g.setNode('a', {order: 2} as qs.Ndata);
    g.setEdge(['a', 'x']);
    const ms = g.masses(['x']);
    expect(ms.length).toBe(1);
    expect(ms[0]).toEqual(new qs.Mass(['x'], 2, 1));
  });
  it('assigns average of multiple preds', () => {
    g.setNode('a', {order: 2} as qs.Ndata);
    g.setNode('b', {order: 4} as qs.Ndata);
    g.setEdge(['a', 'x']);
    g.setEdge(['b', 'x']);
    const ms = g.masses(['x']);
    expect(ms.length).toBe(1);
    expect(ms[0]).toEqual(new qs.Mass(['x'], 3, 2));
  });
  it('takes into account weight of edges', () => {
    g.setNode('a', {order: 2} as qs.Ndata);
    g.setNode('b', {order: 4} as qs.Ndata);
    g.setEdge(['a', 'x'], {weight: 3} as qs.Edata);
    g.setEdge(['b', 'x']);
    const ms = g.masses(['x']);
    expect(ms.length).toBe(1);
    expect(ms[0]).toEqual(new qs.Mass(['x'], 2.5, 4));
  });
  it('calculates massess for all nodes in movable layer', () => {
    g.setNode('a', {order: 1} as qs.Ndata);
    g.setNode('b', {order: 2} as qs.Ndata);
    g.setNode('c', {order: 4} as qs.Ndata);
    g.setEdge(['a', 'x']);
    g.setEdge(['b', 'x']);
    g.setNode('y');
    g.setEdge(['a', 'z'], {weight: 2} as qs.Edata);
    g.setEdge(['c', 'z']);
    const ms = g.masses(['x', 'y', 'z']);
    expect(ms.length).toBe(3);
    expect(ms[0]).toEqual(new qs.Mass(['x'], 1.5, 2));
    expect(ms[1]).toEqual(new qs.Mass(['y']));
    expect(ms[2]).toEqual(new qs.Mass(['z'], 2, 3));
  });
});

describe('conflicts', () => {
  let cg: Graph;
  beforeEach(() => {
    cg = new Graph({});
  });
  it('returns nodes unchanged when no constraints', () => {
    const ms = [new qs.Mass(['a'], 2, 3), new qs.Mass(['b'], 1, 2)];
    expect(_.sortBy(cg.conflicts(ms), 'ns')).toEqual([
      new qs.Conflict(['a'], 0, 2, 3),
      new qs.Conflict(['b'], 1, 1, 2)
    ]);
  });
  it('returns nodes unchanged when no conflicts', () => {
    const ms = [new qs.Mass(['a'], 2, 3), new qs.Mass(['b'], 1, 2)];
    cg.setEdge(['b', 'a']);
    expect(_.sortBy(cg.conflicts(ms), 'ns')).toEqual([
      new qs.Conflict(['a'], 0, 2, 3),
      new qs.Conflict(['b'], 1, 1, 2)
    ]);
  });
  it('coalesces nodes when conflict #1', () => {
    const ms = [new qs.Mass(['a'], 2, 3), new qs.Mass(['b'], 1, 2)];
    cg.setEdge(['a', 'b']);
    expect(_.sortBy(cg.conflicts(ms), 'ns')).toEqual([
      new qs.Conflict(['a', 'b'], 0, (3 * 2 + 2 * 1) / (3 + 2), 3 + 2)
    ]);
  });
  it('coalesces nodes when conflict #2', () => {
    const ms = [
      new qs.Mass(['a'], 4, 1),
      new qs.Mass(['b'], 3, 1),
      new qs.Mass(['c'], 2, 1),
      new qs.Mass(['d'], 1, 1)
    ];
    cg.setPath(['a', 'b', 'c', 'd']);
    expect(_.sortBy(cg.conflicts(ms), 'ns')).toEqual([
      new qs.Conflict(['a', 'b', 'c', 'd'], 0, (4 + 3 + 2 + 1) / 4, 4)
    ]);
  });
  it('works with multiple constraints for same target #1', () => {
    const ms = [
      new qs.Mass(['a'], 4, 1),
      new qs.Mass(['b'], 3, 1),
      new qs.Mass(['c'], 2, 1)
    ];
    cg.setEdge(['a', 'c']);
    cg.setEdge(['b', 'c']);
    const cs = cg.conflicts(ms);
    expect(cs.length).toBe(1);
    expect(_.indexOf(cs[0].ns, 'c')).toBeGreaterThan(_.indexOf(cs[0].ns, 'a'));
    expect(_.indexOf(cs[0].ns, 'c')).toBeGreaterThan(_.indexOf(cs[0].ns, 'b'));
    expect(cs[0].i).toBe(0);
    expect(cs[0].mass).toBe((4 + 3 + 2) / 3);
    expect(cs[0].weight).toBe(3);
  });
  it('works with multiple constraints for same target #2', () => {
    const ms = [
      new qs.Mass(['a'], 4, 1),
      new qs.Mass(['b'], 3, 1),
      new qs.Mass(['c'], 2, 1),
      new qs.Mass(['d'], 1, 1)
    ];
    cg.setEdge(['a', 'c']);
    cg.setEdge(['a', 'd']);
    cg.setEdge(['b', 'c']);
    cg.setEdge(['c', 'd']);
    const cs = cg.conflicts(ms);
    expect(cs.length).toBe(1);
    expect(_.indexOf(cs[0].ns, 'c')).toBeGreaterThan(_.indexOf(cs[0].ns, 'a'));
    expect(_.indexOf(cs[0].ns, 'c')).toBeGreaterThan(_.indexOf(cs[0].ns, 'b'));
    expect(_.indexOf(cs[0].ns, 'd')).toBeGreaterThan(_.indexOf(cs[0].ns, 'c'));
    expect(cs[0].i).toBe(0);
    expect(cs[0].mass).toBe((4 + 3 + 2 + 1) / 4);
    expect(cs[0].weight).toBe(4);
  });
  it('does nothing to node lacking mass and constraint', () => {
    const ms = [new qs.Mass(['a']), new qs.Mass(['b'], 1, 2)];
    expect(_.sortBy(cg.conflicts(ms), 'ns')).toEqual([
      new qs.Conflict(['a'], 0, undefined, undefined),
      new qs.Conflict(['b'], 1, 1, 2)
    ]);
  });
  it('treats node w/o mass as violating constraints #1', () => {
    const ms = [new qs.Mass(['a']), new qs.Mass(['b'], 1, 2)];
    cg.setEdge(['a', 'b']);
    expect(_.sortBy(cg.conflicts(ms), 'ns')).toEqual([
      new qs.Conflict(['a', 'b'], 0, 1, 2)
    ]);
  });
  it('treats node w/o mass as violating constraints #2', () => {
    const ms = [new qs.Mass(['a']), new qs.Mass(['b'], 1, 2)];
    cg.setEdge(['b', 'a']);
    expect(_.sortBy(cg.conflicts(ms), 'ns')).toEqual([
      new qs.Conflict(['b', 'a'], 0, 1, 2)
    ]);
  });
  it('ignores edges not related to entries', () => {
    const ms = [new qs.Mass(['a'], 2, 3), new qs.Mass(['b'], 1, 2)];
    cg.setEdge(['c', 'd']);
    expect(_.sortBy(cg.conflicts(ms), 'ns')).toEqual([
      new qs.Conflict(['a'], 0, 2, 3),
      new qs.Conflict(['b'], 1, 1, 2)
    ]);
  });
});
