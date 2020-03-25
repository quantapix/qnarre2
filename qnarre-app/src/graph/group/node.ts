/* eslint-disable no-case-declarations */
import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qa from './annotation';
import * as qg from './graph';
import * as ql from './layout';
import * as qm from '../../elems/graph/contextmenu';
import * as qp from './params';
import * as qr from './render';
import * as qs from './scene';
import * as qt from './types';
import * as qu from './util';

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

  inAnnotations = new qa.AnnoList();
  outAnnotations = new qa.AnnoList();
  inboxWidth = 0;
  outboxWidth = 0;
  excluded = false;
  structural = false;
  labelOffset = 0;
  radius = 0;
  labelHeight = 0;
  paddingTop = 0;
  paddingLeft = 0;
  paddingRight = 0;
  paddingBottom = 0;
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
      if (d.node.isGroup) addButton(sh, d, elem);
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

function subBuild(group, ndata: qr.GroupNdata, elem: qs.GraphElem) {
  if (ndata.node.isGroup) {
    if (ndata.expanded) {
      return qs.buildGroup(group, ndata, elem, qt.Class.Subscene.GROUP);
    }
    qs.selectChild(group, 'g', qt.Class.Subscene.GROUP).remove();
  }
  return null;
}

function subPosition(group, d: Ndata) {
  const x0 = d.x - d.width / 2.0 + d.paddingLeft;
  const y0 = d.y - d.height / 2.0 + d.paddingTop;

  const subscene = qs.selectChild(group, 'g', qt.Class.Subscene.GROUP);
  qs.translate(subscene, x0, y0);
}

function addButton(sel, d: Ndata, elem: qs.GraphElem) {
  const group = qs.selectOrCreate(sel, 'g', qt.Class.Node.BUTTON_CONTAINER);
  qs.selectOrCreate(group, 'circle', qt.Class.Node.BUTTON_CIRCLE);
  qs.selectOrCreate(group, 'path', qt.Class.Node.EXPAND_BUTTON).attr(
    'd',
    'M0,-2.2 V2.2 M-2.2,0 H2.2'
  );
  qs.selectOrCreate(group, 'path', qt.Class.Node.COLLAPSE_BUTTON).attr(
    'd',
    'M-2.2,0 H2.2'
  );
  (group as any).on('click', (d: any) => {
    (<Event>d3.event).stopPropagation();
    elem.fire('node-toggle-expand', {name: d.node.name});
  });
  qs.positionButton(group, d);
}

function addInteraction(
  sel,
  d: Ndata,
  elem: qs.GraphElem,
  disableInteraction?: boolean
) {
  if (disableInteraction) {
    sel.attr('pointer-events', 'none');
    return;
  }
  const fn = qm.getMenu(elem, getContextMenu(d.node, elem));
  sel
    .on('dblclick', (d: Ndata) => {
      elem.fire('node-toggle-expand', {name: d.node.name});
    })
    .on('mouseover', (d: Ndata) => {
      if (elem.isNodeExpanded(d)) {
        return;
      }
      elem.fire('node-highlight', {name: d.node.name});
    })
    .on('mouseout', (d: Ndata) => {
      if (elem.isNodeExpanded(d)) {
        return;
      }
      elem.fire('node-unhighlight', {name: d.node.name});
    })
    .on('click', (d: Ndata) => {
      (<Event>d3.event).stopPropagation();
      elem.fire('node-select', {name: d.node.name});
    })
    .on('menu', (d: Ndata, i) => {
      elem.fire('node-select', {name: d.node.name});
      fn.call(d, i);
    });
}

export function getContextMenu(node: qt.Node, elem) {
  let m = [
    {
      title: (d): string => {
        return qg.getIncludeNodeButtonString(node.include);
      },
      action: (elm, d, i) => {
        elem.fire('node-toggle-extract', {name: node.name});
      }
    }
  ];
  if (elem.nodeContextMenuItems) m = m.concat(elem.nodeContextMenuItems);
  if (canBeInSeries(node)) {
    m.push({
      title: (_: Ndata) => getGroupSettingLabel(node),
      action: (elm, d, i) => {
        elem.fire('node-toggle-seriesgroup', {
          name: getSeriesName(node)
        });
      }
    });
  }
  return m;
}

export function canBeInSeries(node: qt.Node) {
  return getSeriesName(node) !== null;
}

export function getSeriesName(node: qt.Node) {
  if (!node) return undefined;
  if (node.type === qt.NodeType.LIST) return node.name;
  if (node.type === qt.NodeType.OP) return (node as qt.Noper).series;
  return undefined;
}

function getContainingSeries(node: qt.Node) {
  let s: qt.Nlist | undefined;
  if (node) {
    if (node.type === qt.NodeType.LIST) {
      s = node as qt.Nlist;
    } else if (node.parent && node.parent.type === qt.NodeType.LIST) {
      s = node.parent as qt.Nlist;
    }
  }
  return s;
}

export function getGroupSettingLabel(node: qt.Node) {
  return qg.getGroupNlistButtonString(
    getContainingSeries(node) ? qt.SeriesType.GROUP : qt.SeriesType.UNGROUP
  );
}

function labelBuild(group, ndata: Ndata, elem: qs.GraphElem) {
  let t = ndata.displayName;
  const useScale = ndata.node.type === qt.NodeType.META && !ndata.expanded;
  const label = qs.selectOrCreate(group, 'text', qt.Class.Node.LABEL);
  const n = <HTMLElement>label.node();
  n.parent.appendChild(n);
  label.attr('dy', '.35em').attr('text-anchor', 'middle');
  if (useScale) {
    if (t.length > elem.maxMetaNodeLabelLength) {
      t = t.substr(0, elem.maxMetaNodeLabelLength - 2) + '...';
    }
    const scale = getLabelFontScale(elem);
    label.attr('font-size', scale(t.length) + 'px');
  }
  enforceLabelWidth(label.text(t), ndata.node.type, ndata);
  return label;
}

export function enforceLabelWidth(
  sel,
  type: qt.NodeType | number,
  ndata?: Ndata
) {
  const n = sel.node() as SVGTextElement;
  let l = n.getComputedTextLength();
  let max: number | undefined;
  switch (type) {
    case qt.NodeType.META:
      if (ndata && !ndata.expanded) max = qp.PARAMS.nodeSize.meta.maxLabelWidth;
      break;
    case qt.NodeType.OP:
      max = qp.PARAMS.nodeSize.op.maxLabelWidth;
      break;
    case -1:
      max = qp.PARAMS.annotations.maxLabelWidth;
      break;
    default:
      break;
  }
  if (!max || l <= max) return;
  let i = 1;
  while (n.getSubStringLength(0, i) < max) {
    i++;
  }
  let t = n.textContent?.substr(0, i);
  do {
    t = t?.substr(0, t.length - 1);
    n.textContent = t + '...';
    l = n.getComputedTextLength();
  } while (l > max && t && t.length > 0);
  return sel.append('title').text(n.textContent);
}
let scale: d3.ScaleLinear<number, number> | undefined;
function getLabelFontScale(elem) {
  if (!scale) {
    scale = d3
      .scaleLinear()
      .domain([
        elem.maxMetaNodeLabelLengthLargeFont,
        elem.maxMetaNodeLabelLength
      ])
      .range([
        elem.maxMetaNodeLabelLengthFontSize,
        elem.minMetaNodeLabelLengthFontSize
      ])
      .clamp(true);
  }
  return scale;
}

function labelPosition(group, cx: number, cy: number, yOffset: number) {
  qs.selectChild(group, 'text', qt.Class.Node.LABEL)
    .transition()
    .attr('x', cx)
    .attr('y', cy + yOffset);
}

export function buildShape(group, d, nodeClass: string) {
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

export function nodeClass(d: Ndata) {
  switch (d.node.type) {
    case qt.NodeType.OP:
      return qt.Class.OPNODE;
    case qt.NodeType.META:
      return qt.Class.METANODE;
    case qt.NodeType.LIST:
      return qt.Class.LISTNODE;
    case qt.NodeType.BRIDGE:
      return qt.Class.BRIDGENODE;
    case qt.NodeType.DOTS:
      return qt.Class.DOTSNODE;
    default:
      throw Error('Unrecognized node type: ' + d.node.type);
  }
}

function position(group, d: Ndata) {
  const g = qs.selectChild(group, 'g', qt.Class.Node.SHAPE);
  const cx = ql.computeCXPositionOfNodeShape(d);
  switch (d.node.type) {
    case qt.NodeType.OP: {
      const n = d.node as qt.Noper;
      if (_.isNumber(n.inIdx) || _.isNumber(n.outIdx)) {
        const sh = qs.selectChild(g, 'polygon');
        qs.positionTriangle(sh, d.x, d.y, d.coreBox.width, d.coreBox.height);
      } else {
        const sh = qs.selectChild(g, 'ellipse');
        qs.positionEllipse(sh, cx, d.y, d.coreBox.width, d.coreBox.height);
      }
      labelPosition(group, cx, d.y, d.labelOffset);
      break;
    }
    case qt.NodeType.META: {
      const sh = g.selectAll('rect');
      if (d.expanded) {
        qs.positionRect(sh, d.x, d.y, d.width, d.height);
        subPosition(group, d);
        labelPosition(group, cx, d.y, -d.height / 2 + d.labelHeight / 2);
      } else {
        qs.positionRect(sh, cx, d.y, d.coreBox.width, d.coreBox.height);
        labelPosition(group, cx, d.y, 0);
      }
      break;
    }
    case qt.NodeType.LIST: {
      const sh = qs.selectChild(g, 'use');
      if (d.expanded) {
        qs.positionRect(sh, d.x, d.y, d.width, d.height);
        subPosition(group, d);
        labelPosition(group, cx, d.y, -d.height / 2 + d.labelHeight / 2);
      } else {
        qs.positionRect(sh, cx, d.y, d.coreBox.width, d.coreBox.height);
        labelPosition(group, cx, d.y, d.labelOffset);
      }
      break;
    }
    case qt.NodeType.BRIDGE: {
      const sh = qs.selectChild(g, 'rect');
      qs.positionRect(sh, d.x, d.y, d.width, d.height);
      break;
    }
    default: {
      throw Error('Unrecognized node type: ' + d.node.type);
    }
  }
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
  const n = gdata.getNodeByName(name) as qg.Ngroup | qt.Noper;
  if (n instanceof qg.OpNode) return [n].concat(n.inEmbeds);
  const ns = (n as qg.Ngroup).metag.nodes();
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
