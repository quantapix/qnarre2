import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qc from './create';
import * as qg from './graph';
import * as ql from './layout';
import * as qn from './nest';
import * as qt from './types';

export interface Gdata extends qc.Gdata, ql.Gdata {}
export interface Ndata extends qc.Ndata, ql.Ndata {
  _old: qt.Area;
}
export interface Edata extends qc.Edata, ql.Edata {}

export interface Graph<G extends Gdata, N extends Ndata, E extends Edata>
  extends qc.Graph<G, N, E>,
    ql.Graph<G, N, E>,
    qn.Graph<G, N, E>,
    qg.Graph<G, N, E> {}

export class Graph<G extends Gdata, N extends Ndata, E extends Edata> {
  runRender(s: qt.Sel) {
    this.preRender();
    const outs = createOrSelect(s, 'output');
    let cs = createOrSelect(outs, 'clusters');
    const ps = createOrSelect(outs, 'edgePaths');
    const ns = this.createNodes(createOrSelect(outs, 'nodes'));
    const ls = this.createLabels(createOrSelect(outs, 'edgeLabels'));
    this.runLayout()
      .posNodes(ns)
      .posLabels(ls)
      .createPaths(ps);
    cs = this.createClusters(cs);
    this.posClusters(cs).postRender();
    return this;
  }

  preRender() {
    this.nodes().forEach(n => {
      const nd = this.node(n)!;
      _.defaults(nd, {
        rx: 0,
        ry: 0,
        shape: 'rect'
      });
      if (!nd.label) nd.label = {} as qt.Label;
      if (!this.children(n)?.length) nd.label.txt = n;
      if (!nd.pad) nd.pad = new qt.Pad();
      _.defaults(nd.pad, {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10
      });
      if (_.has(nd.pad, 'v')) {
        _.defaults(nd.pad, {
          left: nd.pad.v,
          right: nd.pad.v,
          top: nd.pad.v,
          bottom: nd.pad.v
        });
      }
      if (_.has(nd.pad, 'x')) {
        _.defaults(nd.pad, {left: nd.pad.x, right: nd.pad.x});
      }
      if (_.has(nd.pad, 'y')) {
        _.defaults(nd.pad, {top: nd.pad.y, bottom: nd.pad.y});
      }
      if (_.has(nd, 'w')) nd._old = {w: nd.w, h: nd.h};
    });
    this.links().forEach(l => {
      const ed = this.edge(l)!;
      _.defaults(ed, {arrowhead: 'normal', curve: d3.curveLinear});
      if (!ed.label) ed.label = {txt: ''} as qt.Label;
    });
    return this;
  }

  postRender() {
    this.nodes().forEach(n => {
      const nd = this.node(n)!;
      if (nd._old) {
        nd.w = nd._old.w;
        nd.h = nd._old.h;
        delete nd._old;
      } else {
        delete nd.w;
        delete nd.h;
      }
    });
    return this;
  }

  posNodes(s: qt.Sel) {
    const es = s.filter((_, i, g) => !d3.select(g[i]).classed('update'));
    const t = (n: any) => {
      const nd = this.node(n)!;
      return 'translate(' + nd.x + ',' + nd.y + ')';
    };
    es.attr('transform', t);
    this.applyTransition(s)
      .style('opacity', 1)
      .attr('transform', t);
    return this;
  }

  posLabels(s: qt.Sel) {
    const es = s.filter((_, i, g) => !d3.select(g[i]).classed('update'));
    const t = (e: any) => {
      const ed = this.edge(e)!;
      return 'translate(' + ed.x + ',' + ed.y + ')';
    };
    es.attr('transform', t);
    this.applyTransition(s)
      .style('opacity', 1)
      .attr('transform', t);
    return this;
  }

  posClusters(s: qt.Sel) {
    const es = s.filter((_, i, g) => !d3.select(g[i]).classed('update'));
    const t = (n: any) => {
      const nd = this.node(n)!;
      return 'translate(' + nd.x + ',' + nd.y + ')';
    };
    es.attr('transform', t);
    this.applyTransition(s)
      .style('opacity', 1)
      .attr('transform', t);
    this.applyTransition(es.selectAll('rect'))
      .attr('width', (n: any) => this.node(n)!.w)
      .attr('height', (n: any) => this.node(n)!.h)
      .attr('x', (n: any) => -this.node(n)!.w / 2)
      .attr('y', (n: any) => -this.node(n)!.h / 2);
    return this;
  }
}

function createOrSelect(sel: qt.Sel, n: string) {
  const s = sel.select('g.' + n);
  if (s.empty()) return sel.append('g').attr('class', n);
  return s;
}

/*
chart = {
  const links = data.links.map(d => Object.create(d));
  const nodes = data.nodes.map(d => Object.create(d));

  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2));

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height]);

  const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

  const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
      .attr("r", 5)
      .attr("fill", color)
      .call(drag(simulation));

  node.append("title")
      .text(d => d.id);

  simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
  });

  invalidation.then(() => simulation.stop());

  return svg.node();
}

color = {
  const scale = d3.scaleOrdinal(d3.schemeCategory10);
  return d => scale(d.group);
}

drag = simulation => {
  
  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }
  
  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  
  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}

height = 600

////

chart = {
  const nodes = data.nodes.map(d => Object.create(d));
  const index = new Map(nodes.map(d => [d.id, d]));
  const links = data.links.map(d => Object.assign(Object.create(d), {
    source: index.get(d.source),
    target: index.get(d.target)
  }));

  const svg = d3.select(DOM.svg(width, height));

  const layout = cola.d3adaptor(d3)
      .size([width, height])
      .nodes(nodes)
      .links(links)
      .jaccardLinkLengths(40, 0.7)
      .start(30);
  
  const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
    .selectAll("line")
    .data(links)
    .enter().append("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

  const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
      .attr("r", 5)
      .attr("fill", d => color(d.group))
      .call(layout.drag);

  node.append("title")
      .text(d => d.id);

  layout.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
  });

  invalidation.then(() => layout.stop());

  return svg.node();
}

color = d3.scaleOrdinal(d3.schemeCategory10)

data = d3.json("miserables.json");

cola = require("webcola@3/WebCola/cola.min.js")

d3 = require("d3@5")
*/
