/* eslint-disable @typescript-eslint/no-empty-interface */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qt from './types';

export interface Gdata {
  rankdir: qt.Dir;
}
export interface Ndata extends qt.Named, qt.Point, qt.Area {}
export interface Edata extends qt.Named, qt.Point, qt.Area {
  points: qt.Point[];
}

export interface Graph<G extends Gdata, N extends Ndata, E extends Edata>
  extends qg.Graph<G, N, E> {}

export class Graph<G extends Gdata, N extends Ndata, E extends Edata> {
  adjustCoords() {
    const d = this.data?.rankdir;
    if (d === 'lr' || d === 'rl') this.swapWH();
    return this;
  }

  undoCoords() {
    const d = this.data!.rankdir;
    if (d === 'bt' || d === 'rl') this.reverseY();
    if (d === 'lr' || d === 'rl') {
      this.swapXY();
      this.swapWH();
    }
    return this;
  }

  private swapWH() {
    const fn = (d: qt.Area) => {
      const w = d.w;
      d.w = d.h;
      d.h = w;
    };
    this.nodes().forEach(n => fn(this.node(n)!));
    this.edges().forEach(e => fn(this.edge(e)!));
  }

  private swapXY() {
    const fn = (d: qt.Point) => {
      const x = d.x;
      d.x = d.y;
      d.y = x;
    };
    this.nodes().forEach(n => fn(this.node(n)!));
    this.edges().forEach(e => {
      const d = this.edge(e);
      fn(d!);
      d?.points.forEach(fn);
    });
  }

  private reverseY() {
    const fn = (d: qt.Point) => (d.y = -d.y);
    this.nodes().forEach(n => fn(this.node(n)!));
    this.edges().forEach(e => {
      const d = this.edge(e);
      fn(d!);
      d?.points.forEach(fn);
    });
  }
}
