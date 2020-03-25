/* eslint-disable no-case-declarations */
import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qa from './annotation';
import * as qg from './graph';
import * as ql from './layout';
import * as qp from './params';
import * as qr from './gdata';
import * as qs from './scene';
import * as qt from './types';
import * as qu from './util';

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

export class Ndata implements qt.Point, qt.Area, _Ndata {
  parent?: Ndata;
  stats?: qg.Stats;
  include?: boolean;
  attrs = {} as qt.Dict<any>;
  expanded = false;
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
  isFadedOut = false;
  displayName: string;

  constructor(
    public name: string,
    public type: qt.NodeType,
    public cardinality = 1,
    public node: qt.Node
  ) {
    this.displayName = node.name.substring(
      node.name.lastIndexOf(qp.NAMESPACE_DELIM) + 1
    );
    if (node.type === qt.NodeType.META && (node as qg.Nmeta).assocFn) {
      const m = this.displayName.match(nodeDisplayNameRegex);
      if (m) {
        this.displayName = m[1];
      } else if (_.startsWith(this.displayName, qp.LIBRARY_PREFIX)) {
        this.displayName = this.displayName.substring(qp.LIBRARY_PREFIX.length);
      }
    }
  }

  isInCore(): boolean {
    return !this.isInExtract && !this.isOutExtract && !this.isLibraryFn;
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
    let t = this.displayName;
    const scale = this.type === qt.NodeType.META && !this.expanded;
    const label = qs.selectOrCreate(s, 'text', qt.Class.Node.LABEL);
    const n = label.node() as HTMLElement;
    n.parent.appendChild(n);
    label.attr('dy', '.35em').attr('text-anchor', 'middle');
    if (scale) {
      if (t.length > e.maxMetaNodeLabelLength) {
        t = t.substr(0, e.maxMetaNodeLabelLength - 2) + '...';
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
        const n = this as qg.Noper;
        if (_.isNumber(n.inIdx) || _.isNumber(n.outIdx)) {
          const sh = qs.selectChild(g, 'polygon');
          const r = new Rect(this.x, this.y, this.coreBox.w, this.coreBox.h);
          qs.positionTriangle(sh, r);
        } else {
          const sh = qs.selectChild(g, 'ellipse');
          const r = new Rect(cx, this.y, this.coreBox.w, this.coreBox.h);
          qs.positionEllipse(sh, r);
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

  buildShape(s: qt.Selection, nodeClass: string) {
    const g = qs.selectOrCreate(group, 'g', nodeClass);
    switch (d.node.type) {
      case qt.NodeType.OP:
        const n = d.node as qt.Noper;
        if (_.isNumber(n.inIdx) || _.isNumber(n.outIdx)) {
          qs.selectOrCreate(g, 'polygon', qt.Class.Node.COLOR_TARGET);
          break;
        }
        qs.selectOrCreate(g, 'ellipse', qt.Class.Node.COLOR_TARGET);
        break;
      case qt.NodeType.LIST:
        let t = 'annotation';
        const ndata = d as qr.GroupNdata;
        if (ndata.coreGraph) {
          t = ndata.node.noControls ? 'vertical' : 'horizontal';
        }
        const cs = [qt.Class.Node.COLOR_TARGET];
        if (ndata.isFadedOut) cs.push('faded-ellipse');
        qs.selectOrCreate(g, 'use', cs).attr(
          'xlink:href',
          '#op-series-' + t + '-stamp'
        );
        qs.selectOrCreate(g, 'rect', qt.Class.Node.COLOR_TARGET)
          .attr('rx', d.radius)
          .attr('ry', d.radius);
        break;
      case qt.NodeType.BRIDGE:
        qs.selectOrCreate(g, 'rect', qt.Class.Node.COLOR_TARGET)
          .attr('rx', d.radius)
          .attr('ry', d.radius);
        break;
      case qt.NodeType.META:
        qs.selectOrCreate(g, 'rect', qt.Class.Node.COLOR_TARGET)
          .attr('rx', d.radius)
          .attr('ry', d.radius);
        break;
      default:
        throw Error('Unrecognized node type: ' + d.node.type);
    }
    return g;
  }
}

export function buildGroup(group, ndata: Ndata[], elem: qs.GraphElem) {
  const container = qs.selectOrCreate(group, 'g', qt.Class.Node.CONTAINER);
  const gs = (container as any)
    .selectAll(() => this.childNodes)
    .data(ndata, (d: Ndata) => d.node.name + ':' + d.node.type);
  gs.enter()
    .append('g')
    .attr('data-name', (d: Ndata) => d.node.name)
    .each((d: Ndata) => {
      const g = d3.select(this);
      elem.addNodeGroup(d.node.name, g);
    })
    .merge(gs)
    .attr('class', (d: Ndata) => qt.Class.Node.GROUP + ' ' + nodeClass(d))
    .each((d: Ndata) => {
      const g = d3.select(this);
      const inb = qs.selectOrCreate(g, 'g', qt.Class.Annotation.INBOX);
      qa.buildGroup(inb, d.inAnnotations, d, elem);
      const outb = qs.selectOrCreate(g, 'g', qt.Class.Annotation.OUTBOX);
      qa.buildGroup(outb, d.outAnnotations, d, elem);
      const sh = buildShape(g, d, qt.Class.Node.SHAPE);
      if (d.node.isClus) addButton(sh, d, elem);
      addInteraction(sh, d, elem);
      subBuild(g, <qr.GroupNdata>d, elem);
      const label = labelBuild(g, d, elem);
      addInteraction(label, d, elem, d.node.type === qt.NodeType.META);
      stylize(g, d, elem);
      position(g, d);
    });
  gs.exit()
    .each((d: Ndata) => {
      elem.removeNodeGroup(d.node.name);
      const g = d3.select(this);
      if (d.inAnnotations.list.length > 0) {
        g.select('.' + qt.Class.Annotation.INBOX)
          .selectAll('.' + qt.Class.Annotation.GROUP)
          .each(a => elem.removeAnnotationGroup(a, d));
      }
      if (d.outAnnotations.list.length > 0) {
        g.select('.' + qt.Class.Annotation.OUTBOX)
          .selectAll('.' + qt.Class.Annotation.GROUP)
          .each(a => elem.removeAnnotationGroup(a, d));
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

function getGradient(
  id: string,
  colors: Array<{color: string; proportion: number}>,
  root?: SVGElement
) {
  const escId = qu.escapeQuerySelector(id);
  if (!root) return `url(#${escId})`;
  const r = d3.select(root);
  let defs = r.select('defs#_graph-gradients');
  if (defs.empty()) defs = r.append('defs').attr('id', '_graph-gradients');
  let grad = defs.select('linearGradient#' + escId);
  if (grad.empty()) {
    grad = defs.append('linearGradient').attr('id', id);
    grad.selectAll('*').remove();
    let cumulativeProportion = 0;
    _.each(colors, c => {
      const color = c.color;
      grad
        .append('stop')
        .attr('offset', cumulativeProportion)
        .attr('stop-color', color);
      grad
        .append('stop')
        .attr('offset', cumulativeProportion + d.proportion)
        .attr('stop-color', color);
      cumulativeProportion += c.proportion;
    });
  }
  return `url(#${escId})`;
}

export function removeGradientDefinitions(root: SVGElement) {
  d3.select(root)
    .select('defs#_graph-gradients')
    .remove();
}

export function getFillForNode(
  templateIndex,
  colorBy,
  renderInfo: Ndata,
  isExpanded: boolean,
  root?: SVGElement
) {
  const colorParams = qp.NmetaColors;
  switch (colorBy) {
    case qt.ColorBy.STRUCTURE:
      if (renderInfo.node.type === qt.NodeType.META) {
        const tid = (renderInfo.node as qg.Nmeta).template;
        return tid === null
          ? colorParams.UNKNOWN
          : colorParams.STRUCTURE_PALETTE(templateIndex(tid), isExpanded);
      } else if (renderInfo.node.type === qt.NodeType.LIST) {
        return isExpanded ? colorParams.EXPANDED_COLOR : 'white';
      } else if (renderInfo.node.type === qt.NodeType.BRIDGE) {
        return renderInfo.structural
          ? '#f0e'
          : (renderInfo.node as qt.Nbridge).inbound
          ? '#0ef'
          : '#fe0';
      } else if (_.isNumber((renderInfo.node as qt.Noper).inIdx)) {
        return '#795548';
      } else if (_.isNumber((renderInfo.node as qt.Noper).outIdx)) {
        return '#009688';
      } else {
        return 'white';
      }
    case qt.ColorBy.DEVICE:
      if (renderInfo.deviceColors == null) {
        return colorParams.UNKNOWN;
      }
      return isExpanded
        ? colorParams.EXPANDED_COLOR
        : getGradient(
            'device-' + renderInfo.node.name,
            renderInfo.deviceColors,
            root
          );
    case qt.ColorBy.CLUSTER:
      if (renderInfo.clusterColors == null) {
        return colorParams.UNKNOWN;
      }
      return isExpanded
        ? colorParams.EXPANDED_COLOR
        : getGradient(
            'xla-' + renderInfo.node.name,
            renderInfo.clusterColors,
            root
          );
    case qt.ColorBy.TIME:
      return isExpanded
        ? colorParams.EXPANDED_COLOR
        : renderInfo.computeTimeColor || colorParams.UNKNOWN;
    case qt.ColorBy.MEMORY:
      return isExpanded
        ? colorParams.EXPANDED_COLOR
        : renderInfo.memoryColor || colorParams.UNKNOWN;
    case qt.ColorBy.COMPAT:
      if (renderInfo.compatibilityColors == null) {
        return colorParams.UNKNOWN;
      }
      return isExpanded
        ? colorParams.EXPANDED_COLOR
        : getGradient(
            'op-compat-' + renderInfo.node.name,
            renderInfo.compatibilityColors,
            root
          );
    default:
      throw new Error('Unknown case to color nodes by');
  }
}

export function stylize(
  group,
  renderInfo: Ndata,
  elem: qs.GraphElem,
  nodeClass?
) {
  nodeClass = nodeClass || qt.Class.Node.SHAPE;
  const isHighlighted = elem.isNodeHighlighted(renderInfo.node.name);
  const isSelected = elem.isNodeSelected(renderInfo.node.name);
  const isExtract =
    renderInfo.isInExtract || renderInfo.isOutExtract || renderInfo.isLibraryFn;
  const isExpanded =
    renderInfo.expanded && nodeClass !== qt.Class.Annotation.NODE;
  const isFadedOut = renderInfo.isFadedOut;
  group.classed('highlighted', isHighlighted);
  group.classed('selected', isSelected);
  group.classed('extract', isExtract);
  group.classed('expanded', isExpanded);
  group.classed('faded', isFadedOut);
  const n = group.select('.' + nodeClass + ' .' + qt.Class.Node.COLOR_TARGET);
  const fill = getFillForNode(
    elem.templateIndex,
    qt.ColorBy[elem.colorBy.toUpperCase()],
    renderInfo,
    isExpanded,
    elem.getGraphSvgRoot()
  );
  n.style('fill', fill);
  n.style('stroke', isSelected ? null : getStrokeForFill(fill));
}

export function getStrokeForFill(fill: string) {
  return fill.startsWith('url')
    ? qp.NmetaColors.GRADIENT_OUTLINE
    : d3
        .rgb(fill)
        .darker()
        .toString();
}

export function updateInputTrace(
  root: SVGElement,
  gdata: qr.Gdata,
  selectedNodeName: string,
  trace: boolean
) {
  const r = d3.select(root);
  r.selectAll('.input-highlight').classed('input-highlight', false);
  r.selectAll('.non-input').classed('non-input', false);
  r.selectAll('.input-parent').classed('input-parent', false);
  r.selectAll('.input-child').classed('input-child', false);
  r.selectAll('.input-edge-highlight').classed('input-edge-highlight', false);
  r.selectAll('.non-input-edge-highlight').classed(
    'non-input-edge-highlight',
    false
  );
  r.selectAll('.input-highlight-selected').classed(
    'input-highlight-selected',
    false
  );
  if (!gdata || !trace || !selectedNodeName) return;
  const opNodes = _getAllContainedOpNodes(selectedNodeName, gdata);
  let allTracedNodes = {};
  _.each(opNodes, function(node) {
    allTracedNodes = traceAllInputsOfOpNode(root, gdata, node, allTracedNodes);
  });
  const highlightedNodes = Object.keys(allTracedNodes);
  const visibleNodes = findVisibleParents(gdata, highlightedNodes);
  markParents(root, visibleNodes);
  r.selectAll(
    'g.node:not(.selected):not(.input-highlight)' +
      ':not(.input-parent):not(.input-children)'
  )
    .classed('non-input', true)
    .each(d => {
      const nodeName = d.node.name;
      r.selectAll(`[data-name="${nodeName}"]`).classed('non-input', true);
    });
  r.selectAll('g.edge:not(.input-edge-highlight)').classed(
    'non-input-edge-highlight',
    true
  );
}

function _getAllContainedOpNodes(name: string, gdata: qr.Gdata) {
  let os = [] as Array<qg.OpNode>;
  const n = gdata.getNodeByName(name) as qg.Nclus | qt.Noper;
  if (n instanceof qg.OpNode) return [n].concat(n.inEmbeds);
  const ns = (n as qg.Nclus).metag.nodes();
  _.each(ns, n => {
    os = os.concat(_getAllContainedOpNodes(n, gdata));
  });
  return os;
}

interface VisibleParent {
  visibleParent: qt.Node;
  opNodes: qt.Noper[];
}

function traceAllInputsOfOpNode(
  root: SVGElement,
  gdata: qr.Gdata,
  startNode: qt.Noper,
  allTracedNodes: Record<string, any>
) {
  if (allTracedNodes[startNode.name]) {
    return allTracedNodes;
  } else {
    allTracedNodes[startNode.name] = true;
  }
  const ins = startNode.ins;
  const currentVisibleParent = getVisibleParent(gdata, startNode);
  d3.select(root)
    .select(`.node[data-name="${currentVisibleParent.name}"]`)
    .classed('input-highlight', true);
  const visibleInputs = {};
  _.each(ins, function(node) {
    let resolvedNode = gdata.getNodeByName(node.name);
    if (resolvedNode === undefined) return;
    if (resolvedNode instanceof qg.MetaNode) {
      const resolvedNodeName = qg.strictName(resolvedNode.name);
      resolvedNode = gdata.getNodeByName(resolvedNodeName) as qt.Noper;
    }
    const visibleParent = getVisibleParent(gdata, resolvedNode);
    const visibleInputsEntry = visibleInputs[visibleParent.name];
    if (visibleInputsEntry) {
      visibleInputsEntry.opNodes.push(resolvedNode);
    } else {
      visibleInputs[visibleParent.name] = {
        visibleParent: visibleParent,
        opNodes: [resolvedNode]
      } as VisibleParent;
    }
  });
  const starts = {};
  const idxStarts = [currentVisibleParent];
  starts[currentVisibleParent.name] = {
    traced: false,
    index: 0,
    connectionEndpoints: []
  };
  let node = currentVisibleParent;
  for (let index = 1; node.name !== qp.ROOT_NAME; index++) {
    node = node.parent;
    starts[node.name] = {
      traced: false,
      index: index,
      connectionEndpoints: []
    };
    idxStarts[index] = node;
  }
  _.forOwn(visibleInputs, function(visibleParentInfo: VisibleParent, key) {
    const node = visibleParentInfo.visibleParent;
    _.each(visibleParentInfo.opNodes, function(opNode: qt.Noper) {
      allTracedNodes = traceAllInputsOfOpNode(
        root,
        gdata,
        opNode,
        allTracedNodes
      );
    });
    if (node.name !== currentVisibleParent.name) {
      createVisibleTrace(root, node, starts, idxStarts);
    }
  });
  return allTracedNodes;
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

function findVisibleParents(gdata: qr.Gdata, ns: string[]) {
  const ps = {} as qt.Dict<qt.Node>;
  _.each(ns, nn => {
    const n = gdata.getNodeByName(nn);
    const p = getVisibleParent(gdata, n);
    if (p) ps[p.name] = p;
  });
  return ps;
}

function markParents(root: SVGElement, ns: qt.Dict<qt.Node>) {
  _.forOwn(ns, (n?: qt.Node) => {
    while (n && n.name !== qp.ROOT_NAME) {
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

export function getVisibleParent(gdata: qr.Gdata, node?: qt.Node) {
  let p = node;
  let found = false;
  while (!found) {
    node = p;
    p = node?.parent;
    if (!p) {
      found = true;
    } else {
      const n = gdata.getNdataByName(p.name);
      if (n && (n.expanded || p instanceof qg.OpNode)) found = true;
    }
  }
  return node;
}
