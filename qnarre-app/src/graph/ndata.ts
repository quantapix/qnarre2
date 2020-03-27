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
import * as menu from '../elems/graph/contextmenu';

export class Ndata implements qt.Rect, qg.Ndata {
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  r = 0;
  label = {h: 0, off: 0};
  width = {in: 0, out: 0};
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
  attrs = {} as qt.Dict<any>;
  color = {} as qt.Dict<string>;
  shade: qt.Dict<qt.Shade[]>;
  annos: qt.Dict<qa.AnnoList>;
  extract = {} as qt.Dict<boolean>;

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
    this.shade = {device: [], cluster: [], compat: []};
    this.annos = {in: new qa.AnnoList(), out: new qa.AnnoList()};
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

  subPosition(s: qt.Selection) {
    const x = this.x - this.w / 2.0 + this.pad.left;
    const y = this.y - this.h / 2.0 + this.pad.top;
    const sub = qs.selectChild(s, 'g', qt.Class.Subscene.GROUP);
    qs.translate(sub, x, y);
  }

  canBeInList() {
    return !!this.listName();
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
    if (this.canBeInList()) {
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

  nodeClass() {
    switch (this.type) {
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
        throw Error('Unrecognized type: ' + this.type);
    }
  }

  addButton(s: qt.Selection, e: qs.GraphElem) {
    const g = qs.selectOrCreate(s, 'g', qt.Class.Node.B_CONTAINER);
    qs.selectOrCreate(g, 'circle', qt.Class.Node.B_CIRCLE);
    qs.selectOrCreate(g, 'path', qt.Class.Node.E_BUTTON).attr(
      'd',
      'M0,-2.2 V2.2 M-2.2,0 H2.2'
    );
    qs.selectOrCreate(g, 'path', qt.Class.Node.C_BUTTON).attr(
      'd',
      'M-2.2,0 H2.2'
    );
    g.on('click', (d: this) => {
      d3.event.stopPropagation();
      e.fire('node-toggle-expand', {name: d.name});
    });
    qs.positionButton(g, this);
  }

  addInteraction(s: qt.Selection, e: qs.GraphElem, disable?: boolean) {
    if (disable) {
      s.attr('pointer-events', 'none');
      return;
    }
    const f = menu.getMenu(e, this.contextMenu(e));
    s.on('dblclick', (d: this) => {
      e.fire('node-toggle-expand', {name: d.name});
    })
      .on('mouseover', (d: this) => {
        if (e.isNodeExpanded(d)) return;
        e.fire('node-highlight', {name: d.name});
      })
      .on('mouseout', (d: this) => {
        if (e.isNodeExpanded(d)) return;
        e.fire('node-unhighlight', {name: d.name});
      })
      .on('click', (d: this) => {
        d3.event.stopPropagation();
        e.fire('node-select', {name: d.name});
      })
      .on('menu', (d: this, i) => {
        e.fire('node-select', {name: d.name});
        f(d, i);
      });
  }

  addInAnno(nd: qg.Ndata, em: qg.Edata, t: qt.AnnoT) {
    const a = new qa.Anno(nd, em, t, true);
    this.annos.in.push(a);
    return this;
  }

  addOutAnno(nd: qg.Ndata, em: qg.Edata, t: qt.AnnoT) {
    const a = new qa.Anno(nd, em, t, false);
    this.annos.out.push(a);
    return this;
  }

  labelBuild(s: qt.Selection, e: qs.GraphElem) {
    let t = this.display;
    const scale = this.type === qt.NdataT.META && !this.expanded;
    const l = qs.selectOrCreate(s, 'text', qt.Class.Node.LABEL);
    const n = l.node();
    n.parent.appendChild(n);
    l.attr('dy', '.35em').attr('text-anchor', 'middle');
    if (scale) {
      const max = e.maxMetaNodeLabelLength;
      if (max && t.length > max) t = t.substr(0, max - 2) + '...';
      const fs = labelFontScale(e);
      l.attr('font-size', fs!(t.length) + 'px');
    }
    this.enforceLabelWidth(l.text(t));
    return l;
  }

  enforceLabelWidth(s: qt.Selection) {
    const e = s.node() as SVGTextElement;
    let l = e.getComputedTextLength();
    let max: number | undefined;
    switch (this.type) {
      case qt.NdataT.META:
        if (!this.expanded) max = PS.nodeSize.meta.maxLabelWidth;
        break;
      case qt.NdataT.OPER:
        max = PS.nodeSize.oper.maxLabelWidth;
        break;
      case -1:
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

  computeCXPositionOfNodeShape() {
    if (this.expanded) return this.x;
    const dx = this.annos.in.list.length ? this.width.in : 0;
    return this.x - this.w / 2 + dx + this.box.w / 2;
  }

  intersectPointAndNode(p: qt.Point) {
    const x = this.expanded ? this.x : this.computeCXPositionOfNodeShape();
    const y = this.y;
    const dx = p.x - x;
    const dy = p.y - y;
    let w = this.expanded ? this.w : this.box.w;
    let h = this.expanded ? this.h : this.box.h;
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

  position(s: qt.Selection) {
    const g = qs.selectChild(s, 'g', qt.Class.Node.SHAPE);
    const cx = this.computeCXPositionOfNodeShape();
    switch (this.type) {
      case qt.NdataT.OPER: {
        const od = (this as any) as qg.Noper;
        if (_.isNumber(od.index.in) || _.isNumber(od.index.out)) {
          const sc = qs.selectChild(g, 'polygon');
          const r = new qt.Rect(this.x, this.y, this.box.w, this.box.h);
          qs.positionTriangle(sc, r);
        } else {
          const sc = qs.selectChild(g, 'ellipse');
          const r = new qt.Rect(cx, this.y, this.box.w, this.box.h);
          qs.positionEllipse(sc, r);
        }
        labelPosition(s, cx, this.y, this.label.off);
        break;
      }
      case qt.NdataT.META: {
        const sa = g.selectAll('rect');
        if (this.expanded) {
          qs.positionRect(sa, this);
          this.subPosition(s);
          labelPosition(s, cx, this.y, -this.h / 2 + this.label.h / 2);
        } else {
          const r = new qt.Rect(cx, this.y, this.box.w, this.box.h);
          qs.positionRect(sa, r);
          labelPosition(s, cx, this.y, 0);
        }
        break;
      }
      case qt.NdataT.LIST: {
        const sc = qs.selectChild(g, 'use');
        if (this.expanded) {
          qs.positionRect(sc, this);
          this.subPosition(s);
          labelPosition(s, cx, this.y, -this.h / 2 + this.label.h / 2);
        } else {
          const r = new qt.Rect(cx, this.y, this.box.w, this.box.h);
          qs.positionRect(sc, r);
          labelPosition(s, cx, this.y, this.label.off);
        }
        break;
      }
      case qt.NdataT.BRIDGE: {
        const sc = qs.selectChild(g, 'rect');
        qs.positionRect(sc, this);
        break;
      }
      default: {
        throw Error('Unrecognized type: ' + this.type);
      }
    }
  }

  updateTotalWidthOfNode() {
    this.width.in =
      this.annos.in.list.length > 0 ? qp.PARAMS.annotations.inboxWidth : 0;
    this.width.out =
      this.annos.out.list.length > 0 ? qp.PARAMS.annotations.outboxWidth : 0;
    this.box.w = this.w;
    this.box.h = this.h;
    const l = this.display.length;
    const w = 3;
    this.w = Math.max(this.box.w + this.width.in + this.width.out, l * w);
  }

  buildShape(s: qt.Selection, c: string) {
    const g = qs.selectOrCreate(s, 'g', c);
    switch (this.type) {
      case qt.NdataT.OPER:
        const od = (this as any) as qg.Noper;
        if (_.isNumber(od.index.in) || _.isNumber(od.index.out)) {
          qs.selectOrCreate(g, 'polygon', qt.Class.Node.COLOR);
          break;
        }
        qs.selectOrCreate(g, 'ellipse', qt.Class.Node.COLOR);
        break;
      case qt.NdataT.LIST:
        let t = 'annotation';
        const cd = (this as any) as qg.Nclus;
        if (cd.core) {
          t = cd.noControls ? 'vertical' : 'horizontal';
        }
        const cs = [qt.Class.Node.COLOR];
        if (this.faded) cs.push('faded-ellipse');
        qs.selectOrCreate(g, 'use', cs).attr(
          'xlink:href',
          '#op-series-' + t + '-stamp'
        );
        qs.selectOrCreate(g, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      case qt.NdataT.BRIDGE:
        qs.selectOrCreate(g, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      case qt.NdataT.META:
        qs.selectOrCreate(g, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      default:
        throw Error('Unrecognized type: ' + this.type);
    }
    return g;
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
        if (!this.shade.device) return cs.UNKNOWN;
        return expanded
          ? cs.EXPANDED
          : grad('device-' + this.name, this.shade.device, root);
      case qt.ColorBy.CLUSTER:
        if (!this.shade.cluster) return cs.UNKNOWN;
        return expanded
          ? cs.EXPANDED
          : grad('xla-' + this.name, this.shade.cluster, root);
      case qt.ColorBy.TIME:
        return expanded ? cs.EXPANDED : this.color.time || cs.UNKNOWN;
      case qt.ColorBy.MEMORY:
        return expanded ? cs.EXPANDED : this.color.mem || cs.UNKNOWN;
      case qt.ColorBy.COMPAT:
        if (!this.shade.compat) return cs.UNKNOWN;
        return expanded
          ? cs.EXPANDED
          : grad('op-compat-' + this.name, this.shade.compat);
      default:
        throw new Error('Unknown color');
    }
  }
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
  device?: string;
  cluster?: string;
  list?: string;
  attr: {key: string; value: any}[];
  ins: qt.Input[];
  shapes: qt.Shapes;
  index = {} as qt.Dict<number>;
  embeds: qt.Dict<qg.Noper[]>;
  compatible?: boolean;

  constructor(d: NodeDef) {
    super(qt.NdataT.OPER, d.name);
    this.op = d.op;
    this.device = d.device;
    this.cluster = qu.cluster(d.attr);
    this.attr = d.attr;
    this.ins = qu.inputs(d.input);
    this.shapes = qu.shapes(d.attr);
    this.embeds = {in: [], out: []};
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

function labelPosition(s: qt.Selection, x: number, y: number, off: number) {
  qs.selectChild(s, 'text', qt.Class.Node.LABEL)
    .transition()
    .attr('x', x)
    .attr('y', y + off);
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
