/* eslint-disable no-case-declarations */
import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qa from './anno';
import * as qg from './graph';
import * as qp from './params';
import * as qs from './scene';
import * as qt from './types';
import * as qu from './utils';

import {NodeDef} from './proto';
import {PARAMS as PS} from './params';

export class Ndata implements qg.Ndata {
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  r = 0;
  display: string;
  parent?: qg.Ndata;
  stats?: qu.Stats;
  faded?: boolean;
  include?: boolean;
  excluded?: boolean;
  expanded?: boolean;
  structural?: boolean;
  pad = new qt.Pad();
  box = new qt.Area();
  label = {h: 0, off: 0};
  width = {in: 0, out: 0};
  attrs = {} as qt.Dict<any>;
  color = {} as qt.Dict<string>;
  annos = {in: new qa.Annos(), out: new qa.Annos()};
  extract = {} as {in: boolean; out: boolean; lib: boolean};
  shade = {
    dev: [] as qt.Shade[],
    clus: [] as qt.Shade[],
    comp: [] as qt.Shade[]
  };

  constructor(public type: qt.NdataT, public name = '', public cardin = 1) {
    this.display = name.substring(name.lastIndexOf(qp.SLASH) + 1);
    if (qg.isMeta(this) && this.assoc) {
      const m = this.display.match(qp.displayRegex);
      if (m) {
        this.display = m[1];
      } else if (this.display.startsWith(qp.LIB_PRE)) {
        this.display = this.display.substring(qp.LIB_PRE.length);
      }
    }
  }

  isInCore() {
    return !this.extract.in && !this.extract.out && !this.extract.lib;
  }

  hasTypeIn(ts: string[]) {
    if (qg.isOper(this)) {
      for (let i = 0; i < ts.length; i++) {
        if (this.op === ts[i]) return true;
      }
    } else if (qg.isMeta(this)) {
      const r = this.rootOp();
      if (r) {
        for (let i = 0; i < ts.length; i++) {
          if (r.op === ts[i]) return true;
        }
      }
    }
    return false;
  }

  centerX() {
    if (this.expanded) return this.x;
    const dx = this.annos.in.length ? this.width.in : 0;
    return this.x - this.w / 2 + dx + this.box.w / 2;
  }

  listName() {
    if (qg.isList(this)) return this.name;
    if (qg.isOper(this)) return this.list;
    return undefined;
  }

  containingList() {
    if (qg.isList(this)) return this as qg.Nlist;
    const p = this.parent;
    if (qg.isList(p)) return p as qg.Nlist;
    return undefined;
  }

  groupSettingLabel() {
    return qu.groupButtonString(!!this.containingList());
  }

  addInAnno(t: qt.AnnoT, nd: qg.Ndata, ed: qg.Edata) {
    const a = new qa.Anno(t, nd, ed, true);
    this.annos.in.push(a);
    return this;
  }

  addOutAnno(t: qt.AnnoT, nd: qg.Ndata, ed: qg.Edata) {
    const a = new qa.Anno(t, nd, ed, false);
    this.annos.out.push(a);
    return this;
  }

  labelBuild(s: qt.Selection, e: qs.GraphElem) {
    let t = this.display;
    const scale = this.type === qt.NdataT.META && !this.expanded;
    const l = qs.selectCreate(s, 'text', qt.Class.Node.LABEL);
    const n = l.node();
    n.parent.appendChild(n);
    l.attr('dy', '.35em').attr('text-anchor', 'middle');
    if (scale) {
      const max = e.maxMetaNodeLabelLength;
      if (max && t.length > max) t = t.substr(0, max - 2) + '...';
      const fs = labelFontScale(e);
      l.attr('font-size', fs!(t.length) + 'px');
    }
    enforceLabelWidth(l.text(t), this);
    return l;
  }

  updateTotalWidthOfNode() {
    this.width.in =
      this.annos.in.length > 0 ? qp.PARAMS.annotations.inboxWidth : 0;
    this.width.out =
      this.annos.out.length > 0 ? qp.PARAMS.annotations.outboxWidth : 0;
    this.box.w = this.w;
    this.box.h = this.h;
    const l = this.display.length;
    const w = 3;
    this.w = Math.max(this.box.w + this.width.in + this.width.out, l * w);
  }

  buildShape(s: qt.Selection, c: string) {
    const g = qs.selectCreate(s, 'g', c);
    switch (this.type) {
      case qt.NdataT.OPER:
        const od = (this as any) as qg.Noper;
        if (_.isNumber(od.index.in) || _.isNumber(od.index.out)) {
          qs.selectCreate(g, 'polygon', qt.Class.Node.COLOR);
          break;
        }
        qs.selectCreate(g, 'ellipse', qt.Class.Node.COLOR);
        break;
      case qt.NdataT.LIST:
        let t = 'annotation';
        const cd = (this as any) as qg.Nclus;
        if (cd.core) {
          t = cd.noControls ? 'vertical' : 'horizontal';
        }
        const cs = [qt.Class.Node.COLOR];
        if (this.faded) cs.push('faded-ellipse');
        qs.selectCreate(g, 'use', cs).attr(
          'xlink:href',
          '#op-series-' + t + '-stamp'
        );
        qs.selectCreate(g, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      case qt.NdataT.BRIDGE:
        qs.selectCreate(g, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      case qt.NdataT.META:
        qs.selectCreate(g, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      default:
        throw Error('Unrecognized type: ' + this.type);
    }
    return g;
  }

  contextMenu(e: qs.GraphElem) {
    let m = [
      {
        title: function(this: Ndata) {
          return qu.includeButtonString(this.include);
        },
        action: function(this: Ndata) {
          e.fire('node-toggle-extract', {name: this.name});
        }
      }
    ];
    // if (e.nodeContextMenuItems) m = m.concat(e.nodeContextMenuItems);
    if (!!this.listName()) {
      m.push({
        title: function(this: Ndata) {
          return qu.groupButtonString(!!this.containingList());
        },
        action: function(this: Ndata) {
          e.fire('node-toggle-seriesgroup', {
            name: this.listName()
          });
        }
      });
    }
    return m;
  }

  stylize(s: qt.Selection, e: qs.GraphElem, c?: string) {
    c = c ?? qt.Class.Node.SHAPE;
    const high = e.isNodeHighlighted(this.name);
    const sel = e.isNodeSelected(this.name);
    const ext = this.extract.in || this.extract.out || this.extract.lib;
    const exp = this.expanded && c !== qt.Class.Anno.NODE;
    s.classed('highlighted', high);
    s.classed('selected', sel);
    s.classed('extract', !!ext);
    s.classed('expanded', !!exp);
    s.classed('faded', !!this.faded);
    const n = s.select('.' + c + ' .' + qt.Class.Node.COLOR);
    const fill = this.getFillForNode(
      e.templateIndex,
      e.colorBy.toUpperCase() as qt.ColorBy,
      exp,
      e.getGraphSvgRoot()
    );
    n.style('fill', fill);
    n.style('stroke', () => (sel ? null : strokeForFill(fill)));
  }

  getFillForNode(
    indexer: any,
    cb: qt.ColorBy,
    expanded?: boolean,
    root?: SVGElement
  ) {
    const cs = qp.MetaColors;
    switch (cb) {
      case qt.ColorBy.STRUCTURE:
        if (this.type === qt.NdataT.META) {
          const tid = ((this as any) as qg.Nmeta).template;
          return tid === null ? cs.UNKNOWN : cs.STRUCT(indexer(tid), expanded);
        } else if (qg.isList(this)) {
          return expanded ? cs.EXPANDED : 'white';
        } else if (this.type === qt.NdataT.BRIDGE) {
          return this.structural
            ? '#f0e'
            : ((this as any) as qg.Nbridge).inbound
            ? '#0ef'
            : '#fe0';
        } else if (qg.isOper(this) && _.isNumber(this.index.in)) {
          return '#795548';
        } else if (qg.isOper(this) && _.isNumber(this.index.out)) {
          return '#009688';
        } else {
          return 'white';
        }
      case qt.ColorBy.DEVICE:
        if (!this.shade.dev) return cs.UNKNOWN;
        return expanded
          ? cs.EXPANDED
          : grad('device-' + this.name, this.shade.dev, root);
      case qt.ColorBy.CLUSTER:
        if (!this.shade.clus) return cs.UNKNOWN;
        return expanded
          ? cs.EXPANDED
          : grad('xla-' + this.name, this.shade.clus, root);
      case qt.ColorBy.TIME:
        return expanded ? cs.EXPANDED : this.color.time || cs.UNKNOWN;
      case qt.ColorBy.MEMORY:
        return expanded ? cs.EXPANDED : this.color.mem || cs.UNKNOWN;
      case qt.ColorBy.COMPAT:
        if (!this.shade.comp) return cs.UNKNOWN;
        return expanded
          ? cs.EXPANDED
          : grad('op-compat-' + this.name, this.shade.comp);
      default:
        throw new Error('Unknown color');
    }
  }
}

export function nodeClass(nd: qg.Ndata) {
  switch (nd.type) {
    case qt.NdataT.OPER:
      return qt.Class.OPER;
    case qt.NdataT.META:
      return qt.Class.META;
    case qt.NdataT.LIST:
      return qt.Class.LIST;
    case qt.NdataT.BRIDGE:
      return qt.Class.BRIDGE;
    case qt.NdataT.DOTS:
      return qt.Class.DOTS;
    default:
      throw Error('Unrecognized type: ' + nd.type);
  }
}

export function intersect(nd: qg.Ndata, p: qt.Point) {
  const x = nd.expanded ? nd.x : nd.centerX();
  const y = nd.y;
  const dx = p.x - x;
  const dy = p.y - y;
  let w = nd.expanded ? nd.w : nd.box.w;
  let h = nd.expanded ? nd.h : nd.box.h;
  let deltaX: number, deltaY: number;
  if ((Math.abs(dy) * w) / 2 > (Math.abs(dx) * h) / 2) {
    if (dy < 0) h = -h;
    deltaX = dy === 0 ? 0 : ((h / 2) * dx) / dy;
    deltaY = h / 2;
  } else {
    if (dx < 0) w = -w;
    deltaX = w / 2;
    deltaY = dx === 0 ? 0 : ((w / 2) * dy) / dx;
  }
  return {x: x + deltaX, y: y + deltaY} as qt.Point;
}

export function enforceLabelWidth(s: qt.Selection, nd?: qg.Ndata) {
  const e = s.node() as SVGTextElement;
  let l = e.getComputedTextLength();
  let max: number | undefined;
  switch (nd?.type) {
    case qt.NdataT.META:
      if (!nd.expanded) max = PS.nodeSize.meta.maxLabelWidth;
      break;
    case qt.NdataT.OPER:
      max = PS.nodeSize.oper.maxLabelWidth;
      break;
    case undefined:
      max = PS.annotations.maxLabelWidth;
      break;
    default:
      break;
  }
  if (!max || l <= max) return;
  let i = 1;
  while (e.getSubStringLength(0, i) < max) {
    i++;
  }
  let t = e.textContent?.substr(0, i);
  do {
    t = t?.substr(0, t.length - 1);
    e.textContent = t + '...';
    l = e.getComputedTextLength();
  } while (l > max && t && t.length > 0);
  return s.append('title').text(e.textContent);
}

export class Nbridge extends Ndata implements qg.Nbridge {
  inbound?: boolean;
}

export class Ndots extends Ndata implements qg.Ndots {
  more = 0;
  constructor(m: number) {
    super(qt.NdataT.DOTS);
    this.setMore(m);
  }
  setMore(m: number) {
    this.more = m;
    this.name = '... ' + m + ' more';
    return this;
  }
}

export class Noper extends Ndata implements qg.Noper {
  parent?: qg.Noper | qg.Nclus;
  op: string;
  dev?: string;
  clus?: string;
  list?: string;
  compatible?: boolean;
  ins: qt.Input[];
  shapes: qt.Shapes;
  index = {} as {in: number; out: number};
  attr: {key: string; value: any}[];
  embeds = {in: [] as qg.Noper[], out: [] as qg.Noper[]};

  constructor(d: NodeDef) {
    super(qt.NdataT.OPER, d.name);
    this.op = d.op;
    this.dev = d.device;
    this.clus = qu.cluster(d.attr);
    this.attr = d.attr;
    this.ins = qu.inputs(d.input);
    this.shapes = qu.shapes(d.attr);
  }
}

export function strokeForFill(f: string) {
  return f.startsWith('url')
    ? qp.MetaColors.GRADIENT
    : d3
        .rgb(f)
        .darker()
        .toString();
}

function grad(id: string, cs: qt.Shade[], e?: SVGElement) {
  const ei = qu.escapeQuerySelector(id);
  if (!e) return `url(#${ei})`;
  const r = d3.select(e);
  let s: qt.Selection = r.select('defs#_graph-gradients');
  if (s.empty()) s = r.append('defs').attr('id', '_graph-gradients');
  let g: qt.Selection = s.select('linearGradient#' + ei);
  if (g.empty()) {
    g = s.append('linearGradient').attr('id', id);
    g.selectAll('*').remove();
    let p = 0;
    cs.forEach(c => {
      const color = c.color;
      g.append('stop')
        .attr('offset', p)
        .attr('stop-color', color);
      g.append('stop')
        .attr('offset', p + c.perc)
        .attr('stop-color', color);
      p += c.perc;
    });
  }
  return `url(#${ei})`;
}

export function delGradDefs(r: SVGElement) {
  d3.select(r)
    .select('defs#_graph-gradients')
    .remove();
}

let scale: d3.ScaleLinear<number, number> | undefined;

function labelFontScale(e: qs.GraphElem) {
  if (!scale) {
    scale = d3
      .scaleLinear()
      .domain([e.maxMetaNodeLabelLengthLargeFont!, e.maxMetaNodeLabelLength!])
      .range([
        e.maxMetaNodeLabelLengthFontSize!,
        e.minMetaNodeLabelLengthFontSize!
      ])
      .clamp(true);
  }
  return scale;
}
