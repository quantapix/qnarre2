/* eslint-disable @typescript-eslint/no-empty-interface */
import * as _ from 'lodash';

import * as qg from './graph';
import * as qt from './types';
import * as qu from './utils';

export interface Graph<G, N, E> extends qg.Graph<G, N, E> {}

export class Graph<G, N, E> {
  read(json: qt.Dict<any>) {
    const g = qu.cloneMixins(this, json.opts) as this;
    g.setData(json.data);
    json.nodes.forEach((e: any) => {
      g.setNode(e.name, e.data);
      if (e.parent) g.setParent(e.name, e.parent);
    });
    json.edges.forEach((e: any) => {
      g.setEdge([e.n0, e.n1, e.name], e.data);
    });
    return g;
  }

  write() {
    const json = {
      opts: {
        isCompound: this.isCompound,
        isDirected: this.isDirected,
        isMultiple: this.isMultiple
      },
      nodes: this.writeNodes(),
      edges: this.writeEdges()
    } as qt.Dict<any>;
    const d = this.data;
    if (d) json.data = _.clone(d);
    return json;
  }

  private writeNodes() {
    return this.nodes().map(n => {
      const o = {name: n} as qt.Dict<any>;
      const d = this.node(n);
      if (d) o.data = d;
      const p = this.parent(n);
      if (p) o.parent = p;
      return o;
    });
  }

  private writeEdges() {
    return this.links().map(l => {
      const o = {n0: l.nodes[0], n1: l.nodes[1]} as qt.Dict<any>;
      if (l.nodes[2]) o.name = l.nodes[2];
      const d = this.edge(l);
      if (d) o.data = d;
      return o;
    });
  }
}
