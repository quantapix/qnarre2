import * as d3 from 'd3';
import * as _ from 'lodash';

import * as qg from './graph';
import * as ql from './layout';
import * as qo from './order';
import * as qt from './types';
import * as qu from './utils';

export interface Graph<
  G extends qt.Gdata,
  N extends qt.Ndata,
  E extends qt.Edata
> extends qo.Graph<G, N, E>, ql.Graph<G, N, E>, qg.Graph<G, N, E> {}

export class Graph<G extends qt.Gdata, N extends qt.Ndata, E extends qt.Edata> {
  debugOrdering() {
    const lays = this.layMatrix();
    const h = new qt.Graph({isCompound: true, isMultiple: true}).setData(
      {} as G
    );
    this.nodes().forEach(n => {
      h.setNode(n, {n} as N);
      h.setParent(n, 'layer' + this.node(n)!.rank);
    });
    this.links().forEach(l => {
      h.setEdge([l.nodes[0], l.nodes[1], l.nodes[2]], {} as E);
    });
    lays.forEach((lay, i) => {
      const n = 'layer' + i;
      h.setNode(n, {rank: 0} as N);
      _.reduce(lay, (n0, n1) => {
        h.setEdge([n0, n1], {style: 'invis'} as E);
        return n1;
      });
    });
    return h;
  }

  render() {
    const sel = d3.select('svg');
    sel.selectAll('g').remove();
    const group = sel.append('g');
    qu.time('preLayout', () => this.preLayout(group));
    this.layout({debugTiming: false});
    qu.time('postLayout', () => this.postLayout(sel, group));
  }

  preLayout(sel: qt.Sel) {
    this.edges().forEach(e => {
      const ed = this.edge(e);
      if (ed?.label) {
        const g = appendLabel(sel, ed.label, ed, 0, 0);
        g.attr('id', 'edge-' + edgeObjToId(e)).classed('edge', true);
      }
    });
    this.nodes().forEach(n => {
      if (this.children(n)?.length) return;
      const nd = this.node(n);
      if (nd?.label) {
        const g = appendLabel(sel, nd.label || n, nd, 10, 10);
        g.attr('id', 'node-' + id(n)).classed('node', true);
      }
    });
  }

  postLayout(root: qt.Sel, sel: qt.Sel) {
    root
      .insert('rect', ':first-child')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('fill', 'none')
      .style('pointer-events', 'all');
    root.call(
      d3.zoom().on('zoom', () => {
        sel.attr(
          'transform',
          'translate(' +
            d3.event.translate +
            ')' +
            'scale(' +
            d3.event.scale +
            ')'
        );
      })
    );
    this.edges().forEach(e => {
      const g = sel.select('g#edge-' + edgeObjToId(e));
      if (!g.empty()) {
        const ed = this.edge(e)!;
        g.attr('transform', 'translate(' + ed.x + ',' + ed.y + ')');
      }
    });
    this.nodes().forEach(v => {
      const group = sel.select('g#node-' + id(v));
      const nd = this.node(v)!;
      group.attr('transform', 'translate(' + nd.x + ',' + nd.y + ')');
    });
    this.edges().forEach(e => {
      const ps = this.edge(e)!.points;
      const path = sel
        .insert('path', ':first-child')
        .classed('edge', true)
        .attr('marker-end', 'url(#arrowhead)');
      const line = d3
        .line<qt.Point>()
        .x(p => p.x)
        .y(p => p.y);
      path.attr('d', line(ps)!);
    });
    const walk = (n: string) => {
      const cs = this.children(n);
      if (cs?.length) {
        cs.forEach(walk);
        const nd = this.node(n)!;
        sel
          .insert('g', ':first-child')
          .classed('subgraph', true)
          .attr(
            'transform',
            'translate(' + (nd.x - nd.w / 2) + ',' + (nd.y - nd.h / 2) + ')'
          )
          .append('rect')
          .attr('width', nd.w)
          .attr('height', nd.h);
      }
    };
    this.children()?.forEach(walk);
  }
}

/*
let debugTiming = false;
let time = qu.notime;
let lastDotStr = '';
const input = document.querySelector('#inputPanel textarea')!;

function renderDot() {
  (debugTiming = d3.select('#timing').property('checked')),
    (time = debugTiming ? qu.time : qu.notime);
  const dotStr = input.value;
  if (dotStr !== lastDotStr) {
    lastDotStr = dotStr;
    input.className = '';
    try {
      const g = time('DOT parsing', () => graphlibDot.read(dotStr));
      time('render', () => g.render());
    } catch (e) {
      input.className = 'error';
      throw e;
    }
  }
}

input.onkeydown = function(e) {
  if (e.keyCode === 9) {
    e.preventDefault();
    const s = this.selectionStart;
    this.value =
      this.value.substring(0, this.selectionStart) +
      '    ' +
      this.value.substring(this.selectionEnd);
    this.selectionEnd = s + 4;
  }
};
*/

function appendLabel(
  sel: qt.Sel,
  label: any,
  graphObj: any,
  marginX: number,
  marginY: number
) {
  const e = sel.append('g');
  const rect = e.append('rect');
  const text = e.append('text').attr('text-anchor', 'left');
  text
    .append('tspan')
    .attr('dy', '1em')
    .text(label);
  let a = text.node()!.getBBox();
  text.attr(
    'transform',
    'translate(' + -a.width / 2 + ',' + -a.height / 2 + ')'
  );
  a = e.node()!.getBBox();
  rect
    .attr('rx', 5)
    .attr('ry', 5)
    .attr('x', -(a.width / 2 + marginX))
    .attr('y', -(a.height / 2 + marginY))
    .attr('width', a.width + 2 * marginX)
    .attr('height', a.height + 2 * marginY)
    .attr('fill', '#fff');
  a = e.node()!.getBBox();
  graphObj.w = a.width;
  graphObj.h = a.height;
  return e;
}

function edgeObjToId(e: any) {
  return id(e.v) + '-' + id(e.w) + '-' + id(e.name);
}

function id(s: string) {
  return s ? s.replace(/[^a-zA-z0-9-]/g, '_') : '';
}
