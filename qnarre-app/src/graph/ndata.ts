/* eslint-disable no-case-declarations */
import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qa from './anno';
//import * as qc from './cluster';
import * as qg from './graph';
//import * as ql from './layout';
import * as qp from './params';
import * as qs from './scene';
import * as qt from './types';
import * as qu from './utils';

import * as menu from '../elems/graph/contextmenu';
import {PARAMS as PS} from './params';
import {NodeDef} from './proto';

export class Ndata implements qt.Rect, qg.Ndata {
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  r = 0;
  inW = 0;
  outW = 0;
  labelH = 0;
  labelOff = 0;
  display: string;
  parent?: Ndata;
  stats?: qu.Stats;
  faded?: boolean;
  library?: boolean;
  include?: boolean;
  excluded?: boolean;
  expanded?: boolean;
  structural?: boolean;
  inExtract?: boolean;
  outExtract?: boolean;
  pad = new qt.Pad();
  box = new qt.Area();
  attrs = {} as qt.Dict<any>;
  color = {} as qt.Dict<string>;
  shade: qt.Dict<qt.Shade[]>;
  annos: qt.Dict<qa.AnnoList>;

  constructor(public type: qt.NodeType, public name = '', public cardin = 1) {
    this.display = name.substring(name.lastIndexOf(qp.SLASH) + 1);
    if (type === qt.NodeType.META && ((this as any) as qg.Nmeta).assocFn) {
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
    return !this.inExtract && !this.outExtract && !this.library;
  }

  hasTypeIn(ts: string[]) {
    if (this.type === qt.NodeType.OPER) {
      for (let i = 0; i < ts.length; i++) {
        if ((n as any).op === ts[i]) return true;
      }
    } else if (this.type === qt.NodeType.META) {
      const root = (n as any).getRootOp();
      if (root) {
        for (let i = 0; i < ts.length; i++) {
          if (root.op === ts[i]) return true;
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
    if (this.type === qt.NodeType.LIST) return this.name;
    if (this.type === qt.NodeType.OPER) return ((this as any) as Noper).list;
    return undefined;
  }

  containingList() {
    if (this.type === qt.NodeType.LIST) return (this as any) as qg.Nlist;
    const p = this.parent;
    if (p?.type === qt.NodeType.LIST) return (p as any) as qg.Nlist;
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
      case qt.NodeType.OPER:
        return qt.Class.OPER;
      case qt.NodeType.META:
        return qt.Class.META;
      case qt.NodeType.LIST:
        return qt.Class.LIST;
      case qt.NodeType.BRIDGE:
        return qt.Class.BRIDGE;
      case qt.NodeType.DOTS:
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

  addInAnno(nd: Ndata, em: qg.Emeta, t: qt.AnnoType) {
    const a = new qg.Anno(nd, em, t, true);
    this.annos.in.push(a);
  }

  addOutAnno(nd: Ndata, em: qg.Emeta, t: qt.AnnoType) {
    const a = new qg.Anno(nd, em, t, false);
    this.annos.out.push(a);
  }

  labelBuild(s: qt.Selection, e: qs.GraphElem) {
    let t = this.display;
    const scale = this.type === qt.NodeType.META && !this.expanded;
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
      case qt.NodeType.META:
        if (!this.expanded) max = PS.nodeSize.meta.maxLabelWidth;
        break;
      case qt.NodeType.OPER:
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

  position(s: qt.Selection) {
    const g = qs.selectChild(s, 'g', qt.Class.Node.SHAPE);
    const cx = ql.computeCXPositionOfNodeShape(this);
    switch (this.type) {
      case qt.NodeType.OPER: {
        const od = (this as any) as Noper;
        if (_.isNumber(od.index.in) || _.isNumber(od.index.out)) {
          const sc = qs.selectChild(g, 'polygon');
          const r = new qt.Rect(this.x, this.y, this.box.w, this.box.h);
          qs.positionTriangle(sc, r);
        } else {
          const sc = qs.selectChild(g, 'ellipse');
          const r = new qt.Rect(cx, this.y, this.box.w, this.box.h);
          qs.positionEllipse(sc, r);
        }
        labelPosition(s, cx, this.y, this.labelOff);
        break;
      }
      case qt.NodeType.META: {
        const sa = g.selectAll('rect');
        if (this.expanded) {
          qs.positionRect(sa, this);
          this.subPosition(s);
          labelPosition(s, cx, this.y, -this.h / 2 + this.labelH / 2);
        } else {
          const r = new qt.Rect(cx, this.y, this.box.w, this.box.h);
          qs.positionRect(sa, r);
          labelPosition(s, cx, this.y, 0);
        }
        break;
      }
      case qt.NodeType.LIST: {
        const sc = qs.selectChild(g, 'use');
        if (this.expanded) {
          qs.positionRect(sc, this);
          this.subPosition(s);
          labelPosition(s, cx, this.y, -this.h / 2 + this.labelH / 2);
        } else {
          const r = new qt.Rect(cx, this.y, this.box.w, this.box.h);
          qs.positionRect(sc, r);
          labelPosition(s, cx, this.y, this.labelOff);
        }
        break;
      }
      case qt.NodeType.BRIDGE: {
        const sc = qs.selectChild(g, 'rect');
        qs.positionRect(sc, this);
        break;
      }
      default: {
        throw Error('Unrecognized type: ' + this.type);
      }
    }
  }

  buildShape(s: qt.Selection, c: string) {
    const g = qs.selectOrCreate(s, 'g', c);
    switch (this.type) {
      case qt.NodeType.OPER:
        const od = (this as any) as Noper;
        if (_.isNumber(od.index.in) || _.isNumber(od.index.out)) {
          qs.selectOrCreate(g, 'polygon', qt.Class.Node.COLOR);
          break;
        }
        qs.selectOrCreate(g, 'ellipse', qt.Class.Node.COLOR);
        break;
      case qt.NodeType.LIST:
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
      case qt.NodeType.BRIDGE:
        qs.selectOrCreate(g, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.r)
          .attr('ry', this.r);
        break;
      case qt.NodeType.META:
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
    const highlighted = e.isNodeHighlighted(this.name);
    const selected = e.isNodeSelected(this.name);
    const extract = this.inExtract || this.outExtract || this.library;
    const expanded = this.expanded && c !== qt.Class.Anno.NODE;
    s.classed('highlighted', highlighted);
    s.classed('selected', selected);
    s.classed('extract', !!extract);
    s.classed('expanded', !!expanded);
    s.classed('faded', !!this.faded);
    const n = s.select('.' + c + ' .' + qt.Class.Node.COLOR);
    const fill = this.getFillForNode(
      e.templateIndex,
      e.colorBy.toUpperCase() as qt.ColorBy,
      expanded,
      e.getGraphSvgRoot()
    );
    n.style('fill', fill);
    n.style('stroke', () => (selected ? null : strokeForFill(fill)));
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
        if (this.type === qt.NodeType.META) {
          const tid = ((this as any) as qg.Nmeta).template;
          return tid === null ? cs.UNKNOWN : cs.STRUCT(indexer(tid), expanded);
        } else if (this.type === qt.NodeType.LIST) {
          return expanded ? cs.EXPANDED : 'white';
        } else if (this.type === qt.NodeType.BRIDGE) {
          return this.structural
            ? '#f0e'
            : ((this as any) as qg.Nbridge).inbound
            ? '#0ef'
            : '#fe0';
        } else if (_.isNumber(((this as any) as Noper).index.in)) {
          return '#795548';
        } else if (_.isNumber(((this as any) as Noper).index.out)) {
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
    super(qt.NodeType.DOTS);
    this.setMore(m);
  }
  setMore(m: number) {
    this.more = m;
    this.name = '... ' + m + ' more';
    return this;
  }
}

export class Noper extends Ndata implements qg.Noper {
  parent?: Noper | qg.Nclus;
  op: string;
  device?: string;
  cluster?: string;
  list?: string;
  attr: {key: string; value: any}[];
  ins: qt.Input[];
  shapes: qt.Shapes;
  index = {} as qt.Dict<number>;
  embeds: qt.Dict<Noper[]>;
  compatible?: boolean;

  constructor(d: NodeDef) {
    super(qt.NodeType.OPER, d.name);
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

export function buildGroup(s: qt.Selection, ds: Ndata[], e: qs.GraphElem) {
  const c = qs.selectOrCreate(s, 'g', qt.Class.Node.CONTAINER);
  const gs = c
    .selectAll<any, Ndata>(function() {
      return this.childNodes;
    })
    .data(ds, nd => nd.name + ':' + nd.type);
  gs.enter()
    .append('g')
    .attr('data-name', nd => nd.name)
    .each(function(nd) {
      const g = d3.select(this);
      e.addNodeGroup(nd.name, g);
    })
    .merge(gs)
    .attr('class', nd => qt.Class.Node.GROUP + ' ' + nd.nodeClass())
    .each(function(nd) {
      const g = d3.select(this);
      const inb = qs.selectOrCreate(g, 'g', qt.Class.Anno.INBOX);
      qa.buildGroup(inb, nd.annos.in, nd, e);
      const outb = qs.selectOrCreate(g, 'g', qt.Class.Anno.OUTBOX);
      qa.buildGroup(outb, nd.annos.out, nd, e);
      const s2 = nd.buildShape(g, qt.Class.Node.SHAPE);
      if (qg.isClus(nd)) nd.addButton(s2, e);
      nd.addInteraction(s2, e);
      (nd as qg.Nclus).subBuild(g, e);
      const label = nd.labelBuild(g, e);
      nd.addInteraction(label, e, nd.type === qt.NodeType.META);
      nd.stylize(g, e);
      nd.position(g);
    });
  gs.exit<Ndata>()
    .each(function(nd) {
      e.removeNodeGroup(nd.name);
      const g = d3.select(this);
      if (nd.annos.in.list.length > 0) {
        g.select('.' + qt.Class.Anno.INBOX)
          .selectAll<any, string>('.' + qt.Class.Anno.GROUP)
          .each(a => e.removeAnnotationGroup(a, nd));
      }
      if (nd.annos.out.list.length > 0) {
        g.select('.' + qt.Class.Anno.OUTBOX)
          .selectAll<any, string>('.' + qt.Class.Anno.GROUP)
          .each(a => e.removeAnnotationGroup(a, nd));
      }
    })
    .remove();
  return gs;
}
