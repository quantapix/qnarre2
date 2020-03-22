import * as _ from 'lodash';

import * as qc from './coords';
import * as qg from './graph';
import * as qu from './utils';

type QC = qc.Graph<qc.Gdata, qc.Ndata, qc.Edata>;
type QG = qg.Graph<qc.Gdata, qc.Ndata, qc.Edata>;

interface Graph extends QC, QG {}
class Graph extends qg.Graph<qc.Gdata, qc.Ndata, qc.Edata> {}
qu.applyMixins(Graph, [qc.Graph, qg.Graph]);

describe('coords', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph({});
  });
  describe('adjust', () => {
    beforeEach(() => {
      g.setNode('a', {w: 100, h: 200} as qc.Ndata);
    });
    it('does nothing with rankdir = tb', () => {
      g.setData({rankdir: 'tb'} as qc.Gdata).adjustCoords();
      expect(g.node('a')).toEqual({name: 'a', w: 100, h: 200} as qc.Ndata);
    });
    it('does nothing with rankdir = bt', () => {
      g.setData({rankdir: 'bt'} as qc.Gdata).adjustCoords();
      expect(g.node('a')).toEqual({name: 'a', w: 100, h: 200} as qc.Ndata);
    });
    it('swaps width height with rankdir = lr', () => {
      g.setData({rankdir: 'lr'} as qc.Gdata).adjustCoords();
      expect(g.node('a')).toEqual({name: 'a', w: 200, h: 100} as qc.Ndata);
    });
    it('swaps width height with rankdir = rl', () => {
      g.setData({rankdir: 'rl'} as qc.Gdata).adjustCoords();
      expect(g.node('a')).toEqual({name: 'a', w: 200, h: 100} as qc.Ndata);
    });
  });

  describe('undo', () => {
    beforeEach(() => {
      g.setNode('a', {w: 100, h: 200, x: 20, y: 40} as qc.Ndata);
    });
    it('does nothing with rankdir = tb', () => {
      g.setData({rankdir: 'tb'} as qc.Gdata).undoCoords();
      expect(g.node('a')).toEqual({
        name: 'a',
        x: 20,
        y: 40,
        w: 100,
        h: 200
      } as qc.Ndata);
    });
    it('flips y coordinate with rankdir = bt', () => {
      g.setData({rankdir: 'bt'} as qc.Gdata).undoCoords();
      expect(g.node('a')).toEqual({
        name: 'a',
        x: 20,
        y: -40,
        w: 100,
        h: 200
      } as qc.Ndata);
    });
    it('swaps dims and coords with rankdir = lr', () => {
      g.setData({rankdir: 'lr'} as qc.Gdata).undoCoords();
      expect(g.node('a')).toEqual({
        name: 'a',
        x: 40,
        y: 20,
        w: 200,
        h: 100
      } as qc.Ndata);
    });
    it('swaps dims and coords and flips x with rankdir = rl', () => {
      g.setData({rankdir: 'rl'} as qc.Gdata).undoCoords();
      expect(g.node('a')).toEqual({
        name: 'a',
        x: -40,
        y: 20,
        w: 200,
        h: 100
      } as qc.Ndata);
    });
  });
});
