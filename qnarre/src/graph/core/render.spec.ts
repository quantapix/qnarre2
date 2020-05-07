import * as d3 from 'd3';
import * as _ from 'lodash';

import * as qg from './graph';
import * as ql from './layout';
import * as qo from './order';
import * as qp from './position';
import * as qr from './render';
import * as qt from './types';
import * as qu from './utils';

type QL = ql.Graph<qr.Gdata, qr.Ndata, qr.Edata>;

type QP = qp.Graph<qr.Gdata, qr.Ndata, qr.Edata>;
type QR = qr.Graph<qr.Gdata, qr.Ndata, qr.Edata>;
type QO = qo.Graph<qr.Gdata, qr.Ndata, qr.Edata>;
type QG = qg.Graph<qr.Gdata, qr.Ndata, qr.Edata>;

interface Graph extends QR, QL, QP, QO, QG {}
class Graph extends qg.Graph<qr.Gdata, qr.Ndata, qr.Edata> {}
qu.applyMixins(Graph, [qr.Graph, ql.Graph, qp.Graph, qo.Graph, qg.Graph]);

d3.select('body')
  .append('link')
  .attr('rel', 'stylesheet')
  .attr('href', '/base/test/bundle.spec.css');

describe('dagreD3', () => {
  let svg: qt.Sel;
  let g: Graph;
  beforeEach(() => {
    svg = d3.select('body').append('svg');
    g = new Graph({})
      .setData({} as qr.Gdata)
      .setDefNode(() => ({} as qr.Ndata))
      .setDefEdge(() => ({} as qr.Edata));
  });
  afterEach(() => {
    svg.remove();
  });

  describe('DOM elements', () => {
    it('are created for each node', () => {
      g.setNode('a', {id: 'a'} as qr.Ndata);
      g.setNode('b', {id: 'b'} as qr.Ndata);
      g.runRender(svg);
      expect(d3.select('#a').datum()).toEqual('a');
      expect(d3.select('#b').datum()).toEqual('b');
      expect(g.node('a')!.elem).toEqual(d3.select('#a').node());
      expect(g.node('b')!.elem).toEqual(d3.select('#b').node());
    });
    it('are created for each node label', () => {
      g.setNode('a', {label: {id: 'a-lab'}} as qr.Ndata);
      g.setNode('b', {label: {id: 'b-lab'}} as qr.Ndata);
      g.runRender(svg);
      expect(d3.select('#a-lab').datum()).toEqual('a');
      expect(d3.select('#b-lab').datum()).toEqual('b');
    });
    it('are created for each edge', () => {
      g.setNode('a', {} as qr.Ndata);
      g.setNode('b', {} as qr.Ndata);
      g.setEdge(['a', 'b'], {id: 'ab'} as qr.Edata);
      g.runRender(svg);
      expect(d3.select('#ab').datum()).toEqual({v: 'a', w: 'b'});
      expect(g.edge(['a', 'b'])!.elem).toEqual(d3.select('#ab').node());
    });
    it('preserve link to the elem even after re-rendering', () => {
      g.setNode('a', {} as qr.Ndata);
      g.setNode('b', {} as qr.Ndata);
      g.setEdge(['a', 'b'], {id: 'ab'} as qr.Edata);
      g.runRender(svg);
      g.setEdge(['a', 'b'], {id: 'ab'} as qr.Edata);
      g.runRender(svg);
      expect(g.edge(['a', 'b'])!.elem).toEqual(d3.select('#ab').node());
    });
    it('are created for each edge label', () => {
      g.setNode('a', {} as qr.Ndata);
      g.setNode('b', {} as qr.Ndata);
      g.setEdge(['a', 'b'], {label: {id: 'ab-lab'}} as qr.Edata);
      g.runRender(svg);
      expect(d3.select('#ab-lab').datum()).toEqual({v: 'a', w: 'b'});
    });
  });

  it("uses node's width and height if specified", () => {
    g.setNode('a', {
      id: 'a',
      w: 1000,
      h: 2000,
      pad: {v: 0}
    } as qr.Ndata);
    g.runRender(svg);
    expect(
      Math.round(
        d3
          .select<SVGSVGElement, any>('#a')
          .node()!
          .getBBox().width
      )
    ).toEqual(1000);
    expect(
      Math.round(
        d3
          .select<SVGSVGElement, any>('#a')
          .node()!
          .getBBox().height
      )
    ).toEqual(2000);
  });
  it('does not grow node dimensions when re-rendering', () => {
    g.setNode('a', {id: 'a'} as qr.Ndata);
    g.runRender(svg);
    const bbox = svg
      .select<SVGSVGElement>('#a rect')
      .node()!
      .getBBox();
    g.runRender(svg);
    const bbox2 = svg
      .select<SVGSVGElement>('#a rect')
      .node()!
      .getBBox();
    expect(bbox.width).toBe(bbox2.width);
    expect(bbox.height).toBe(bbox2.height);
  });
  it('does not grow edge dimensions when re-rendering', () => {
    g.setNode('a');
    g.setNode('b');
    g.setEdge(['a', 'b'], {label: {id: 'ab', txt: 'foo'}} as qr.Edata);
    g.runRender(svg);
    const bbox = svg
      .select<SVGSVGElement>('#ab')
      .node()!
      .getBBox();
    g.runRender(svg);
    const bbox2 = svg
      .select<SVGSVGElement>('#ab')
      .node()!
      .getBBox();
    expect(bbox.width).toBe(bbox2.width);
    expect(bbox.height).toBe(bbox2.height);
  });

  describe('HTML labels', () => {
    it('can be created for a node', () => {
      g.setNode('a', {
        label: {type: 'html', txt: "<p id='a-lab'>Hello</p>"}
      } as qr.Ndata);
      g.runRender(svg);
      expect(d3.select('#a-lab').empty()).toBeFalse();
      expect(d3.select('#a-lab').text()).toBe('Hello');
    });
    it('can use an existing DOM element', () => {
      const elem = document.createElement('p');
      elem.setAttribute('id', 'a-lab');
      elem.innerHTML = 'Hello';
      g.setNode('a', {id: 'a', label: {type: 'html', txt: elem}} as qr.Ndata);
      g.runRender(svg);
      expect(d3.select('#a #a-lab').empty()).toBeFalse();
      expect(d3.select('#a #a-lab').text()).toBe('Hello');
    });
    it('can use an function that returns a DOM element', () => {
      const elem = document.createElement('p');
      elem.setAttribute('id', 'a-lab');
      elem.innerHTML = 'Hello';
      g.setNode('a', {
        id: 'a',
        label: {type: 'html', txt: () => elem}
      } as qr.Ndata);
      g.runRender(svg);
      expect(d3.select('#a #a-lab').empty()).toBeFalse();
      expect(d3.select('#a #a-lab').text()).toBe('Hello');
    });
    it('can be created for an edge', () => {
      g.setNode('a', {} as qr.Ndata);
      g.setNode('b', {} as qr.Ndata);
      g.setEdge(['a', 'b'], {
        label: {type: 'html', txt: "<p id='ab-lab'>Hello</p>"}
      } as qr.Edata);
      g.runRender(svg);
      expect(d3.select('#ab-lab').empty()).toBeFalse();
      expect(d3.select('#ab-lab').text()).toBe('Hello');
    });
  });

  describe('SVG labels', () => {
    it('can be created for a node', () => {
      const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      link.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'xlink:href',
        'http://google.com/'
      );
      link.setAttribute('target', '_blank');
      link.setAttribute('id', 'a-lab');
      link.textContent = 'Google';
      g.setNode('a', {label: {type: 'svg', txt: link}} as qr.Ndata);
      g.runRender(svg);
      expect(d3.select('#a-lab').empty()).toBeFalse();
      expect(d3.select('#a-lab').text()).toBe('Google');
    });
    it('can be created for an edge', () => {
      const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      link.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'xlink:href',
        'http://yahoo.com/'
      );
      link.setAttribute('target', '_blank');
      link.setAttribute('id', 'ab-lab');
      link.textContent = 'Yahoo';
      g.setNode('a', {} as qr.Ndata);
      g.setNode('b', {} as qr.Ndata);
      g.setEdge(['a', 'b'], {label: {type: 'svg', txt: link}} as qr.Edata);
      g.runRender(svg);
      expect(d3.select('#ab-lab').empty()).toBeFalse();
      expect(d3.select('#ab-lab').text()).toBe('Yahoo');
    });
  });

  describe('breaks label lines', () => {
    it("on '\\n'", () => {
      g.setNode('a', {id: 'a', label: {txt: 'multi\nline'}} as qr.Ndata);
      g.runRender(svg);
      const text = d3.select('#a text');
      expect(text.empty()).toBeFalse();
      expect(d3.select(text.selectAll('tspan').nodes()[0]).text()).toBe(
        'multi'
      );
      expect(d3.select(text.selectAll('tspan').nodes()[1]).text()).toBe('line');
    });
    it("on '\\\\n'", () => {
      g.setNode('a', {id: 'a', label: {txt: 'multi\\nline'}} as qr.Ndata);
      g.runRender(svg);
      const text = d3.select('#a text');
      expect(text.empty()).toBeFalse();
      expect(d3.select(text.selectAll('tspan').nodes()[0]).text()).toBe(
        'multi'
      );
      expect(d3.select(text.selectAll('tspan').nodes()[1]).text()).toBe('line');
    });
  });

  describe('styles', () => {
    let red: string;
    beforeEach(() => {
      red = svg
        .append('rect')
        .style('fill', '#ff0000')
        .style('fill');
    });
    it('can be applied to a node', () => {
      g.setNode('a', {
        id: 'a',
        style: 'fill: #ff0000',
        shape: 'rect'
      } as qr.Ndata);
      g.runRender(svg);
      expect(d3.select('#a rect').style('fill')).toEqual(red);
    });
    it('can be applied to a node label', () => {
      g.setNode('a', {
        label: {id: 'a-lab', style: 'stroke: #ff0000'}
      } as qr.Ndata);
      g.runRender(svg);
      expect(d3.select('#a-lab text').style('stroke')).toEqual(red);
    });
    it('can be applied to an edge', () => {
      g.setNode('a', {} as qr.Ndata);
      g.setNode('b', {} as qr.Ndata);
      g.setEdge(['a', 'b'], {id: 'ab', style: 'stroke: #ff0000'} as qr.Edata);
      g.runRender(svg);
      expect(d3.select('#ab path').style('stroke')).toEqual(red);
    });
    it('can be applied to an edge label', () => {
      g.setNode('a', {} as qr.Ndata);
      g.setNode('b', {} as qr.Ndata);
      g.setEdge(['a', 'b'], {
        label: {id: 'ab-lab', style: 'stroke: #ff0000'}
      } as qr.Edata);
      g.runRender(svg);
      expect(d3.select('#ab-lab text').style('stroke')).toEqual(red);
    });
  });

  describe('shapes', () => {
    it('include a rect', () => {
      g.setNode('a', {
        id: 'a',
        shape: 'rect',
        w: 100,
        h: 200,
        pad: {v: 0}
      } as qr.Ndata);
      g.runRender(svg);
      const rect = d3.select<SVGSVGElement, any>('#a rect');
      expect(rect.empty()).toBeFalse();
      expect(rect.node()?.getBBox().width).toEqual(100);
      expect(rect.node()?.getBBox().height).toEqual(200);
    });
    it('include a circle', () => {
      g.setNode('a', {
        id: 'a',
        shape: 'circle',
        w: 100,
        h: 250,
        pad: {v: 0}
      } as qr.Ndata);
      g.runRender(svg);
      const circle = d3.select('#a circle');
      expect(circle.empty()).toBeFalse();
      expect(+circle.attr('r') * 2).toEqual(250);
    });
    it('include an ellipse', () => {
      g.setNode('a', {
        id: 'a',
        shape: 'ellipse',
        w: 100,
        h: 250,
        pad: {v: 0}
      } as qr.Ndata);
      g.runRender(svg);
      const ellipse = d3.select('#a ellipse');
      expect(ellipse.empty()).toBeFalse();
      expect(+ellipse.attr('rx') * 2).toEqual(100);
      expect(+ellipse.attr('ry') * 2).toEqual(250);
    });
  });

  describe('class', () => {
    it('can be set for nodes', () => {
      g.setNode('a', {
        id: 'a',
        class: (d: any) => d + '-class'
      } as qr.Ndata);
      g.setNode('b', {id: 'b', class: 'b-class'} as qr.Ndata);
      g.runRender(svg);
      expect(d3.select('#a').classed('a-class')).toBeTrue();
      expect(d3.select('#b').classed('b-class')).toBeTrue();
    });
    it('can be set for edges', () => {
      g.setNode('a', {id: 'a'} as qr.Ndata);
      g.setNode('b', {id: 'b'} as qr.Ndata);
      g.setEdge(['a', 'b'], {
        id: 'c',
        class: (d: any) => d.v + d.w + '-class'
      } as qr.Edata);
      g.setEdge(['b', 'a'], {id: 'd', class: 'd-class'} as qr.Edata);
      g.runRender(svg);
      expect(d3.select('#c').classed('ab-class')).toBeTrue();
      expect(d3.select('#d').classed('d-class')).toBeTrue();
    });
  });
});
