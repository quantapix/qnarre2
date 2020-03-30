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
import * as menu from '../elems/graph/contextmenu';

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

  addLabel(s: qt.Sel, e: qs.Elem) {
    let t = this.display;
    const scale = qg.isMeta(this) && !this.expanded;
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
    qs.enforceWidth(l.text(t), this);
    return l;
  }

  addInteraction(s: qt.Sel, e: qs.Elem, disable?: boolean) {
    if (disable) {
      s.attr('pointer-events', 'none');
      return;
    }
    const f = menu.getMenu(e, this.contextMenu(e));
    s.on('dblclick', function() {
      e.fire('node-toggle-expand', {name: this.name});
    })
      .on('mouseover', function() {
        if (e.isNodeExpanded(this)) return;
        e.fire('node-highlight', {name: this.name});
      })
      .on('mouseout', function() {
        if (e.isNodeExpanded(this)) return;
        e.fire('node-unhighlight', {name: this.name});
      })
      .on('click', function() {
        d3.event.stopPropagation();
        e.fire('node-select', {name: this.name});
      })
      .on('menu', function(i: number) {
        e.fire('node-select', {name: this.name});
        f(this, i);
      });
  }

  buildShape(s: qt.Sel, c: string) {
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

  contextMenu(e: qs.Elem) {
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
    const fill = this.getFillForNode(
      e.indexer,
      e.colorBy.toUpperCase() as qt.ColorBy,
      exp,
      e.getGraphSvgRoot()
    );
    n.style('fill', fill);
    n.style('stroke', () => (sel ? null : strokeForFill(fill)));
  }

  getFillForNode(
    idx = (_: string) => 0,
    cb: qt.ColorBy,
    expanded?: boolean,
    root?: SVGElement
  ) {
    const cs = qp.MetaColors;
    switch (cb) {
      case qt.ColorBy.STRUCTURE:
        if (this.type === qt.NdataT.META) {
          const t = ((this as any) as qg.Nmeta).template;
          return t ? cs.STRUCT(idx(t), expanded) : cs.UNKNOWN;
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

export function buildSel(s: qt.Sel, ds: qg.Ndata[], e: qs.Elem) {
  const c = qs.selectCreate(s, 'g', qt.Class.Node.CONTAINER);
  const ss = c
    .selectAll<any, Ndata>(function() {
      return this.childNodes;
    })
    .data(ds, d => d.name + ':' + d.type);
  ss.enter()
    .append('g')
    .attr('data-name', d => d.name)
    .each(function(d) {
      e.addNodeSel(d.name, d3.select(this));
    })
    .merge(ss)
    .attr('class', d => qt.Class.Node.GROUP + ' ' + qg.toClass(d.type))
    .each(function(dd) {
      const d = dd as Ndata;
      const s2 = d3.select(this);
      const inb = qs.selectCreate(s2, 'g', qt.Class.Anno.IN);
      d.annos.in.buildSels(inb, d, e);
      const outb = qs.selectCreate(s2, 'g', qt.Class.Anno.OUT);
      d.annos.out.buildSels(outb, d, e);
      const s3 = d.buildShape(s2, qt.Class.Node.SHAPE);
      if (qg.isClus(d)) qs.addButton(s3, d, e);
      d.addInteraction(s3, e);
      if (qg.isClus(d)) d.subBuild(s2, e);
      const label = d.addLabel(s2, e);
      d.addInteraction(label, e, d.type === qt.NdataT.META);
      d.stylize(s2, e);
      qs.position(s2, d);
    });
  ss.exit<Ndata>()
    .each(function(d) {
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
  let s: qt.Sel = r.select('defs#_graph-gradients');
  if (s.empty()) s = r.append('defs').attr('id', '_graph-gradients');
  let g: qt.Sel = s.select('linearGradient#' + ei);
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

function labelFontScale(e: qs.Elem) {
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
