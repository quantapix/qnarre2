/* eslint-disable @typescript-eslint/unbound-method */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qj from './json';
import * as qt from './types';
import * as qu from './utils';

interface Gdata {
  foo: any;
}
interface Ndata extends qt.Named {
  foo: any;
}
interface Edata extends qt.Named {
  foo: any;
}

type QJ = qj.Graph<Gdata, Ndata, Edata>;
type QG = qg.Graph<Gdata, Ndata, Edata>;

interface Graph extends QJ, QG {}
class Graph extends qg.Graph<Gdata, Ndata, Edata> {}
qu.applyMixins(Graph, [qj.Graph, qg.Graph]);

describe('json', () => {
  it('preserves options', () => {
    expect(rw(new Graph({isDirected: true})).isDirected).toBeTrue;
    expect(rw(new Graph({isDirected: false})).isDirected).toBeFalse;
    expect(rw(new Graph({isMultiple: true})).isMultiple).toBeTrue;
    expect(rw(new Graph({isMultiple: false})).isMultiple).toBeFalse;
    expect(rw(new Graph({isCompound: true})).isCompound).toBeTrue;
    expect(rw(new Graph({isCompound: false})).isCompound).toBeFalse;
  });
  it('preserves data, if any', () => {
    expect(rw(new Graph({}).setData({foo: 'bar'} as Gdata)).data).toEqual({
      foo: 'bar'
    } as Gdata);
    expect(rw(new Graph({})).data).toBeUndefined;
  });
  it('preserves nodes', () => {
    expect(rw(new Graph({}).setNode('a')).hasNode('a')).toBeTrue;
    expect(rw(new Graph({}).setNode('a')).node('a')).toBeUndefined;
    expect(
      rw(new Graph({}).setNode('a', {foo: 'bar'} as Ndata)).node('a')
    ).toEqual({name: 'a', foo: 'bar'} as Ndata);
  });
  it('preserves edges', () => {
    expect(rw(new Graph({}).setEdge(['a', 'b'])).hasEdge(['a', 'b'])).toBeTrue;
    expect(rw(new Graph({}).setEdge(['a', 'b'])).edge(['a', 'b']))
      .toBeUndefined;
    expect(
      rw(new Graph({}).setEdge(['a', 'b'], {foo: 'bar'} as Edata)).edge([
        'a',
        'b'
      ])
    ).toEqual({name: 'a:b', foo: 'bar'} as Edata);
  });
  it('preserves multi-edges', () => {
    const g = new Graph({isMultiple: true});
    g.setEdge(['a', 'b', 'foo']);
    expect(rw(g).hasEdge(['a', 'b', 'foo'])).toBeTrue;
    g.setEdge(['a', 'b', 'foo']);
    expect(rw(g).edge(['a', 'b', 'foo'])).toBeUndefined;
    g.setEdge(['a', 'b', 'foo'], {foo: 'bar'} as Edata);
    expect(rw(g).edge(['a', 'b', 'foo'])).toEqual({
      name: 'a:b:foo',
      foo: 'bar'
    } as Edata);
  });
  it('preserves parent relationships', () => {
    expect(rw(new Graph({isCompound: true}).setNode('a')).parent('a'))
      .toBeUndefined;
    expect(
      rw(new Graph({isCompound: true}).setParent('a', 'parent')).parent('a')
    ).toBe('parent');
  });
});

function rw(g: Graph) {
  return g.read(g.write());
}
