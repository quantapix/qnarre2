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
import * as menu from '../docs.elems/graph.comps/contextmenu';

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

  addText(sel: qt.Sel, e: qs.Elem) {
    const scale = qg.isMeta(this) && !this.expanded;
    const s = qs.selectCreate(sel, 'text', qt.Class.Node.LABEL);
    const n = s.node();
    n.parent.appendChild(n);
    s.attr('dy', '.35em').attr('text-anchor', 'middle');
    let t = this.display;
    if (scale) {
      const max = e.maxMetaNodeLabelLength;
      if (max && t.length > max) t = t.substr(0, max - 2) + '...';
      const fs = fontScale(e);
      s.attr('font-size', fs!(t.length) + 'px');
    }
    qs.enforceWidth(s.text(t), this);
    return s;
  }

  addButton(sel: qt.Sel, e: qs.Elem) {
    const s = qs.selectCreate(sel, 'g', qt.Class.Node.B_CONTAINER);
    qs.selectCreate(s, 'circle', qt.Class.Node.B_CIRCLE);
    qs.selectCreate(s, 'path', qt.Class.Node.E_BUTTON).attr(
      'd',
      'M0,-2.2 V2.2 M-2.2,0 H2.2'
    );
    qs.selectCreate(s, 'path', qt.Class.Node.C_BUTTON).attr(
      'd',
      'M-2.2,0 H2.2'
    );
    s.on('click', function (d) {
      d3.event.stopPropagation();
      e.fire('node-toggle-expand', {name: d.name});
    });
    qs.position.button(s, this);
  }

  addCBs(sel: qt.Sel, e: qs.Elem, disable?: boolean) {
    if (disable) {
      sel.attr('pointer-events', 'none');
      return;
    }
    const f = menu.getMenu(e, this.contextMenu(e));
    sel
      .on('dblclick', function () {
        e.fire('node-toggle-expand', {name: this.name});
      })
      .on('mouseover', function () {
        if (e.isNodeExpanded(this)) return;
        e.fire('node-highlight', {name: this.name});
      })
      .on('mouseout', function () {
        if (e.isNodeExpanded(this)) return;
        e.fire('node-unhighlight', {name: this.name});
      })
      .on('click', function () {
        d3.event.stopPropagation();
        e.fire('node-select', {name: this.name});
      })
      .on('menu', function (i: number) {
        e.fire('node-select', {name: this.name});
        f(this, i);
      });
  }

  position(sel: qt.Sel) {
    const s = qs.selectChild(sel, 'g', qt.Class.Node.SHAPE);
    const cx = this.centerX();
    switch (this.type) {
      case qt.NdataT.OPER: {
        const od = (this as any) as qg.Noper;
        if (_.isNumber(od.index.in) || _.isNumber(od.index.out)) {
          const sc = qs.selectChild(s, 'polygon');
          const r = new qt.Rect(this.x, this.y, this.box.w, this.box.h);
          qs.position.triangle(sc, r);
        } else {
          const sc = qs.selectChild(s, 'ellipse');
          const r = new qt.Rect(cx, this.y, this.box.w, this.box.h);
          qs.position.ellipse(sc, r);
        }
        qs.position.label(sel, cx, this.y, this.label.off);
        break;
      }
      case qt.NdataT.META: {
        const sa = s.selectAll('rect');
        if (this.expanded) {
          qs.position.rect(sa, this);
          this.positionSub(sel);
          qs.position.label(sel, cx, this.y, -this.h / 2 + this.label.h / 2);
        } else {
          const r = new qt.Rect(cx, this.y, this.box.w, this.box.h);
          qs.position.rect(sa, r);
          qs.position.label(sel, cx, this.y, 0);
        }
        break;
      }
      case qt.NdataT.LIST: {
        const sc = qs.selectChild(s, 'use');
        if (this.expanded) {
          qs.position.rect(sc, this);
          this.positionSub(sel);
          qs.position.label(sel, cx, this.y, -this.h / 2 + this.label.h / 2);
        } else {
          const r = new qt.Rect(cx, this.y, this.box.w, this.box.h);
          qs.position.rect(sc, r);
          qs.position.label(sel, cx, this.y, this.label.off);
        }
        break;
      }
      case qt.NdataT.BRIDGE: {
        const sc = qs.selectChild(s, 'rect');
        qs.position.rect(sc, this);
        break;
      }
      default: {
        throw Error('Invalid type: ' + this.type);
      }
    }
  }

  positionSub(sel: qt.Sel) {
    const x = this.x - this.w / 2.0 + this.pad.left;
    const y = this.y - this.h / 2.0 + this.pad.top;
    const s = qs.selectChild(sel, 'g', qt.Class.Subscene.GROUP);
    qs.translate(s, x, y);
  }

  build(sel: qt.Sel, _e: qs.Elem, c: string) {
    const s = qs.selectCreate(sel, 'g', c);
    switch (this.type) {
      case qt.NdataT.OPER:
        const od = (this as any) as qg.Noper;
        if (_.isNumber(od.index.in) || _.isNumber(od.index.out)) {
          qs.selectCreate(s, 'polygon', qt.Class.Node.COLOR);
          break;
        }
        qs.selectCreate(s, 'ellipse', qt.Class.Node.COLOR);
        break;
      case qt.NdataT.LIST:
        let t = 'annotation';
        const cd = (this as any) as qg.Nclus;
        if (cd.core) {
          t = cd.noControls ? 'vertical' : 'horizontal';
        }
        const cs = [qt.Class.Node.COLOR];
        if (this.faded) cs.push('faded-ellipse');
        qs.selectCreate(s, 'use', cs).attr(
          'xlink:href',
          '#op-series-' + t + '-stamp'
        );
        qs.selectCreate(s, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      case qt.NdataT.BRIDGE:
        qs.selectCreate(s, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      case qt.NdataT.META:
        qs.selectCreate(s, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      default:
        throw Error('Invalid type: ' + this.type);
    }
    return s;
  }

  stylize(s: qt.Sel, e: qs.Elem, c?: string) {
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
    const fill = this.fillFor(
      e.indexer,
      e.colorBy.toUpperCase() as qt.ColorBy,
      exp,
      e.getGraphSvgRoot()
    );
    n.style('fill', fill);
    n.style('stroke', () => (sel ? null : strokeFor(fill)));
  }

  contextMenu(e: qs.Elem) {
    let m = [
      {
        title: function (this: Ndata) {
          return qu.includeButtonString(this.include);
        },
        action: function (this: Ndata) {
          e.fire('node-toggle-extract', {name: this.name});
        }
      }
    ];
    // if (e.nodeContextMenuItems) m = m.concat(e.nodeContextMenuItems);
    if (!!this.listName()) {
      m.push({
        title: function (this: Ndata) {
          return qu.groupButtonString(!!this.containingList());
        },
        action: function (this: Ndata) {
          e.fire('node-toggle-seriesgroup', {
            name: this.listName()
          });
        }
      });
    }
    return m;
  }

  intersect(p: qt.Point) {
    const x = this.expanded ? this.x : this.centerX();
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

  fillFor(
    tidx = (_: string) => 0,
    cb: qt.ColorBy,
    expanded?: boolean,
    root?: SVGElement
  ) {
    const cs = qp.MetaColors;
    switch (cb) {
      case qt.ColorBy.STRUCT:
        if (this.type === qt.NdataT.META) {
          const t = ((this as any) as qg.Nmeta).template;
          return t ? cs.STRUCT(tidx(t), expanded) : cs.UNKNOWN;
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
      case qt.ColorBy.MEM:
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

export namespace Ndatas {
  export function build(this: qg.Ndata[], s: qt.Sel, e: qs.Elem) {
    const c = qs.selectCreate(s, 'g', qt.Class.Node.CONTAINER);
    const ss = c
      .selectAll<any, Ndata>(function () {
        return this.childNodes;
      })
      .data(this, d => d.name + ':' + d.type);
    ss.enter()
      .append('g')
      .attr('data-name', d => d.name)
      .each(function (d) {
        e.addNodeSel(d.name, d3.select(this));
      })
      .merge(ss)
      .attr('class', d => qt.Class.Node.GROUP + ' ' + qg.toClass(d.type))
      .each(function (dd) {
        const d = dd as Ndata;
        const s2 = d3.select(this);
        const inb = qs.selectCreate(s2, 'g', qt.Class.Anno.IN);
        d.annos.in.build(inb, d, e);
        const outb = qs.selectCreate(s2, 'g', qt.Class.Anno.OUT);
        d.annos.out.build(outb, d, e);
        const s3 = d.build(s2, e, qt.Class.Node.SHAPE);
        if (qg.isClus(d)) d.addButton(s3, e);
        d.addCBs(s3, e);
        if (qg.isClus(d)) d.buildSub(s2, e);
        const t = d.addText(s2, e);
        d.addCBs(t, e, d.type === qt.NdataT.META);
        d.stylize(s2, e);
        d.position(s2);
      });
    ss.exit<Ndata>()
      .each(function (d) {
        e.delNodeSel(d.name);
        const s2 = d3.select(this);
        if (d.annos.in.length > 0) {
          s2.select('.' + qt.Class.Anno.IN)
            .selectAll<any, qg.Anno>('.' + qt.Class.Anno.GROUP)
            .each(a => e.delAnnoSel(a.nd.name, d.name));
        }
        if (d.annos.out.length > 0) {
          s2.select('.' + qt.Class.Anno.OUT)
            .selectAll<any, qg.Anno>('.' + qt.Class.Anno.GROUP)
            .each(a => e.delAnnoSel(a.nd.name, d.name));
        }
      })
      .remove();
    return ss;
  }
}

export class Nbridge extends Ndata implements qg.Nbridge {
  constructor(n: string, c: number, public inbound?: boolean) {
    super(qt.NdataT.BRIDGE, n, c);
  }
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

export function delGradDefs(r: SVGElement) {
  d3.select(r).select('defs#_graph-gradients').remove();
}

export function strokeFor(fill: string) {
  return fill.startsWith('url')
    ? qp.MetaColors.GRADIENT
    : d3.rgb(fill).darker().toString();
}

function grad(id: string, cs: qt.Shade[], e?: SVGElement) {
  const ei = qu.escapeQuerySelector(id);
  if (!e) return `url(#${ei})`;
  const r = d3.select(e);
  let s: qt.Sel = r.select('defs#_graph-gradients');
  if (s.empty()) s = r.append('defs').attr('id', '_graph-gradients');
  let g: qt.Sel = s.select('linearGradient#' + ei);
  if (g.empty()) {
    g = s.append('linearGradient').attr('id', id);
    g.selectAll('*').remove();
    let p = 0;
    cs.forEach(c => {
      const color = c.color;
      g.append('stop').attr('offset', p).attr('stop-color', color);
      g.append('stop')
        .attr('offset', p + c.perc)
        .attr('stop-color', color);
      p += c.perc;
    });
  }
  return `url(#${ei})`;
}

let scale: d3.ScaleLinear<number, number> | undefined;

function fontScale(e: qs.Elem) {
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
