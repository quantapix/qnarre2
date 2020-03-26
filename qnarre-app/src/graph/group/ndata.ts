/* eslint-disable no-case-declarations */
import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qa from './annotation';
import * as qc from './cluster';
import * as qg from './graph';
import * as ql from './layout';
import * as qp from './params';
import * as qs from './scene';
import * as qt from './types';
import * as qu from './utils';

import * as menu from '../../elems/graph/contextmenu';
import {PARAMS as PS} from './params';

class Rect implements qt.Rect {
  constructor(
    public x: number,
    public y: number,
    public w: number,
    public h: number
  ) {}
}

interface _Ndata extends qg.Ndata {}

const nameRegex = new RegExp(
  '^(?:' + qp.LIB_PRE + ')?(\\w+)_[a-z0-9]{8}(?:_\\d+)?$'
);

export class Ndata implements qt.Point, qt.Area, _Ndata {
  parent?: Ndata;
  stats?: qg.Stats;
  include?: boolean;
  attrs = {} as qt.Dict<any>;
  expanded?: boolean;
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  coreBox = {w: 0, h: 0} as qt.Area;
  pad = {} as qt.Pad;

  inAnnotations = new qa.AnnoList();
  outAnnotations = new qa.AnnoList();
  inboxWidth = 0;
  outboxWidth = 0;
  excluded = false;
  structural = false;
  labelOffset = 0;
  radius = 0;
  labelHeight = 0;
  isInExtract = false;
  isOutExtract = false;
  isLibraryFn = false;
  deviceColors = [] as Array<{color: string; proportion: number}>;
  clusterColors = [] as Array<{color: string; proportion: number}>;
  compatibilityColors = [] as Array<{color: string; proportion: number}>;
  memoryColor = '';
  computeTimeColor = '';
  faded = false;
  display: string;

  constructor(
    public name: string,
    public type: qt.NodeType,
    public cardinality = 1
  ) {
    this.display = name.substring(name.lastIndexOf(qp.SLASH) + 1);
    if (type === qt.NodeType.META && (this as qg.Nmeta).assocFn) {
      const m = this.display.match(nameRegex);
      if (m) {
        this.display = m[1];
      } else if (_.startsWith(this.display, qp.LIB_PRE)) {
        this.display = this.display.substring(qp.LIB_PRE.length);
      }
    }
  }

  isInCore(): boolean {
    return !this.isInExtract && !this.isOutExtract && !this.isLibraryFn;
  }

  hasTypeIn(types: string[]) {
    if (this.type === qt.NodeType.OPER) {
      for (let i = 0; i < types.length; i++) {
        if ((n as any).op === types[i]) return true;
      }
    } else if (this.type === qt.NodeType.META) {
      const root = (n as any).getRootOp();
      if (root) {
        for (let i = 0; i < types.length; i++) {
          if (root.op === types[i]) return true;
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
    if (this.type === qt.NodeType.OPER) return (this as qg.Noper).list;
    return undefined;
  }

  containingList() {
    if (this.type === qt.NodeType.LIST) return this as qg.Nlist;
    const p = this.parent;
    if (p?.type === qt.NodeType.LIST) return p! as qg.Nlist;
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
    if (e.nodeContextMenuItems) m = m.concat(e.nodeContextMenuItems);
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
        f.call(d, i);
      });
  }

  labelBuild(s: qt.Selection, e: qs.GraphElem) {
    let t = this.display;
    const scale = this.type === qt.NodeType.META && !this.expanded;
    const label = qs.selectOrCreate(s, 'text', qt.Class.Node.LABEL);
    const n = label.node() as HTMLElement;
    n.parent.appendChild(n);
    label.attr('dy', '.35em').attr('text-anchor', 'middle');
    if (scale) {
      const max = e.maxMetaNodeLabelLength;
      if (max && t.length > max) {
        t = t.substr(0, max - 2) + '...';
      }
      const fs = labelFontScale(e);
      label.attr('font-size', fs(t.length) + 'px');
    }
    this.enforceLabelWidth(label.text(t));
    return label;
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
        max = PS.nodeSize.op.maxLabelWidth;
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
    const cx = ql.computeCXPositionOfNodeShape(d);
    switch (this.type) {
      case qt.NodeType.OPER: {
        const od = this as qg.Noper;
        if (_.isNumber(od.inIdx) || _.isNumber(od.outIdx)) {
          const sc = qs.selectChild(g, 'polygon');
          const r = new Rect(this.x, this.y, this.coreBox.w, this.coreBox.h);
          qs.positionTriangle(sc, r);
        } else {
          const sc = qs.selectChild(g, 'ellipse');
          const r = new Rect(cx, this.y, this.coreBox.w, this.coreBox.h);
          qs.positionEllipse(sc, r);
        }
        labelPosition(s, cx, this.y, this.labelOffset);
        break;
      }
      case qt.NodeType.META: {
        const sa = g.selectAll('rect');
        if (this.expanded) {
          qs.positionRect(sa, this);
          this.subPosition(s);
          labelPosition(s, cx, this.y, -this.h / 2 + this.labelHeight / 2);
        } else {
          const r = new Rect(cx, this.y, this.coreBox.w, this.coreBox.h);
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
          labelPosition(s, cx, this.y, -this.h / 2 + this.labelHeight / 2);
        } else {
          const r = new Rect(cx, this.y, this.coreBox.w, this.coreBox.h);
          qs.positionRect(sc, r);
          labelPosition(s, cx, this.y, this.labelOffset);
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
        const od = this as qg.Noper;
        if (_.isNumber(od.inIdx) || _.isNumber(od.outIdx)) {
          qs.selectOrCreate(g, 'polygon', qt.Class.Node.COLOR);
          break;
        }
        qs.selectOrCreate(g, 'ellipse', qt.Class.Node.COLOR);
        break;
      case qt.NodeType.LIST:
        let t = 'annotation';
        const cd = this as qc.Nclus;
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
          .attr('rx', this.radius)
          .attr('ry', this.radius);
        break;
      case qt.NodeType.BRIDGE:
        qs.selectOrCreate(g, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.radius)
          .attr('ry', this.radius);
        break;
      case qt.NodeType.META:
        qs.selectOrCreate(g, 'rect', qt.Class.Node.COLOR)
          .attr('rx', this.radius)
          .attr('ry', this.radius);
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
    const extract = this.isInExtract || this.isOutExtract || this.isLibraryFn;
    const expanded = this.expanded && c !== qt.Class.Anno.NODE;
    s.classed('highlighted', highlighted);
    s.classed('selected', selected);
    s.classed('extract', extract);
    s.classed('expanded', expanded);
    s.classed('faded', this.faded);
    const n = s.select('.' + c + ' .' + qt.Class.Node.COLOR);
    const fill = this.getFillForNode(
      e.templateIndex,
      qt.ColorBy[e.colorBy.toUpperCase()],
      expanded,
      e.getGraphSvgRoot()
    );
    n.style('fill', fill);
    n.style('stroke', () => (selected ? null : strokeForFill(fill)));
  }

  getFillForNode(indexer, colorBy, isExpanded: boolean, root?: SVGElement) {
    const cs = qp.MetaColors;
    switch (colorBy) {
      case qt.ColorBy.STRUCTURE:
        if (this.type === qt.NodeType.META) {
          const tid = (this as qg.Nmeta).template;
          return tid === null
            ? cs.UNKNOWN
            : cs.STRUCTURE(indexer(tid), isExpanded);
        } else if (this.type === qt.NodeType.LIST) {
          return isExpanded ? cs.EXPANDED : 'white';
        } else if (this.type === qt.NodeType.BRIDGE) {
          return this.structural
            ? '#f0e'
            : (this as qg.Nbridge).inbound
            ? '#0ef'
            : '#fe0';
        } else if (_.isNumber((this as qg.Noper).inIdx)) {
          return '#795548';
        } else if (_.isNumber((this as qg.Noper).outIdx)) {
          return '#009688';
        } else {
          return 'white';
        }
      case qt.ColorBy.DEVICE:
        if (this.deviceColors == null) return cs.UNKNOWN;
        return isExpanded
          ? cs.EXPANDED
          : grad('device-' + this.name, this.deviceColors, root);
      case qt.ColorBy.CLUSTER:
        if (this.clusterColors == null) return cs.UNKNOWN;
        return isExpanded
          ? cs.EXPANDED
          : grad('xla-' + this.name, this.clusterColors, root);
      case qt.ColorBy.TIME:
        return isExpanded ? cs.EXPANDED : this.computeTimeColor || cs.UNKNOWN;
      case qt.ColorBy.MEMORY:
        return isExpanded ? cs.EXPANDED : this.memoryColor || cs.UNKNOWN;
      case qt.ColorBy.COMPAT:
        if (this.compatibilityColors == null) return cs.UNKNOWN;
        return isExpanded
          ? cs.EXPANDED
          : grad('op-compat-' + this.name, this.compatibilityColors, root);
      default:
        throw new Error('Unknown color');
    }
  }
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
      qa.buildGroup(inb, nd.inAnnotations, nd, e);
      const outb = qs.selectOrCreate(g, 'g', qt.Class.Anno.OUTBOX);
      qa.buildGroup(outb, nd.outAnnotations, nd, e);
      const s2 = nd.buildShape(g, qt.Class.Node.SHAPE);
      if (qg.isClus(nd)) nd.addButton(s2, e);
      nd.addInteraction(s2, e);
      (nd as qc.Nclus).subBuild(g, e);
      const label = nd.labelBuild(g, e);
      nd.addInteraction(label, e, nd.type === qt.NodeType.META);
      nd.stylize(g, e);
      nd.position(g);
    });
  gs.exit<Ndata>()
    .each(function(nd) {
      e.removeNodeGroup(nd.name);
      const g = d3.select(this);
      if (nd.inAnnotations.list.length > 0) {
        g.select('.' + qt.Class.Anno.INBOX)
          .selectAll<any, string>('.' + qt.Class.Anno.GROUP)
          .each(a => e.removeAnnotationGroup(a, nd));
      }
      if (nd.outAnnotations.list.length > 0) {
        g.select('.' + qt.Class.Anno.OUTBOX)
          .selectAll<any, string>('.' + qt.Class.Anno.GROUP)
          .each(a => e.removeAnnotationGroup(a, nd));
      }
    })
    .remove();
  return gs;
}

let scale: d3.ScaleLinear<number, number> | undefined;

function labelFontScale(e: qs.GraphElem) {
  if (!scale) {
    scale = d3
      .scaleLinear()
      .domain([e.maxMetaNodeLabelLengthLargeFont, e.maxMetaNodeLabelLength])
      .range([
        e.maxMetaNodeLabelLengthFontSize,
        e.minMetaNodeLabelLengthFontSize
      ])
      .clamp(true);
  }
  return scale;
}

function labelPosition(s: qt.Selection, x: number, y: number, off: number) {
  qs.selectChild(s, 'text', qt.Class.Node.LABEL)
    .transition()
    .attr('x', x)
    .attr('y', y + off);
}

function grad(
  id: string,
  cs: {color: string; proportion: number}[],
  e?: SVGElement
) {
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
        .attr('offset', p + c.proportion)
        .attr('stop-color', color);
      p += c.proportion;
    });
  }
  return `url(#${ei})`;
}

export function delGradDefs(r: SVGElement) {
  d3.select(r)
    .select('defs#_graph-gradients')
    .remove();
}

export function strokeForFill(f: string) {
  return f.startsWith('url')
    ? qp.MetaColors.GRADIENT
    : d3
        .rgb(f)
        .darker()
        .toString();
}

function createVisibleTrace(
  root: SVGElement,
  node: qt.Node,
  starts: qt.Dict<number>,
  idxStarts: qt.Node[]
) {
  let n: qt.Node | undefined = node;
  let prev = n;
  const pairs = [];
  while (n && !starts[n.name]) {
    if (prev?.name !== n.name) pairs.push([prev, n]);
    prev = n;
    n = n?.parent;
  }
  const s = starts[node.name].index;
  const sn = idxStarts[Math.max(s - 1, 0)].name;
  const r = d3.select(root);
  r.selectAll(`[data-edge="${prev.name}--${sn}"]`).classed(
    'input-edge-highlight',
    true
  );
  _.each(pairs, p => {
    const inner = p[0];
    const outer = p[1];
    const sel = `[data-edge="${inner.name}--${sn}` + `~~${outer.name}~~OUT"]`;
    r.selectAll(sel).classed('input-edge-highlight', true);
  });
  for (let i = 1; i < s; i++) {
    const inner = idxStarts[i - 1];
    const outer = idxStarts[i];
    const sel =
      `[data-edge="${prev.name}~~${outer.name}` + `~~IN--${inner.name}"]`;
    r.selectAll(sel).classed('input-edge-highlight', true);
  }
}

function markParents(root: SVGElement, ns: qt.Dict<qt.Node>) {
  _.forOwn(ns, (n?: qt.Node) => {
    while (n && n.name !== qp.ROOT) {
      const s = d3.select(root).select(`.node[data-name="${n.name}"]`);
      if (
        s.nodes().length &&
        !s.classed('input-highlight') &&
        !s.classed('selected') &&
        !s.classed('op')
      ) {
        s.classed('input-parent', true);
      }
      n = n.parent;
    }
  });
}
