import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qc from './cluster';
import * as qe from './edata';
import * as qg from './graph';
import * as qh from './hierarchy';
import * as qn from './ndata';
import * as qp from './params';
import * as qt from './types';
import * as qu from './utils';

import {GdataPs as PS} from './params';

type Linear = d3.ScaleLinear<string, string>;
type Ordinal = d3.ScaleOrdinal<string, string>;

export class Gdata implements qg.Gdata {
  type = qt.GdataT.CORE;
  rankdir = 'bt' as qt.Dir;
  edgesep = NaN;
  nodesep = NaN;
  ranksep = NaN;
  name?: string;
  root: qc.Nclus;
  nds = {} as qt.Dict<qn.Ndata>;
  hasSubhier = {} as qt.Dict<boolean>;
  colors: qt.Dict<Ordinal>;
  scales: qt.Dict<Linear>;
  renderedOpNames = [] as string[];
  edgeWidthSizedBasedScale = {} as
    | d3.ScaleLinear<number, number>
    | d3.ScalePower<number, number>;
  traceInputs = false;
  edgeLabelFunction?: EdgeLabelFunction;
  edgeWidthFunction?: EdgeThicknessFunction;

  constructor(public hier: qh.Hierarchy, public displaying: boolean) {
    this.colors = {device: {} as Ordinal, cluster: {} as Ordinal};
    this.scales = {mem: {} as Linear, time: {} as Linear};
    this.initScales();
    this.root = new qc.Nclus(hier.root, hier.opts);
    this.root.expanded = true;
    this.nds[hier.root.name] = this.root;
    this.renderedOpNames.push(hier.root.name);
    this.buildSubhier(hier.root.name);
  }

  initScales() {
    this.colors.device = d3
      .scaleOrdinal<string>()
      .domain(this.hier.devices)
      .range(d3.range(this.hier.devices.length).map(qp.MetaColors.DEVICE));
    this.colors.cluster = d3
      .scaleOrdinal<string>()
      .domain(this.hier.clusters)
      .range(_.map(d3.range(this.hier.clusters.length), qp.MetaColors.CLUSTER));
    const m = this.hier.root.meta;
    const mem = d3.max(m.nodes(), n => m.node(n)?.stats?.bytes)!;
    this.scales.mem = d3
      .scaleLinear<string, string>()
      .domain([0, mem])
      .range(PS.minMaxColors);
    const time = d3.max(m.nodes(), n => m.node(n)?.stats?.getMicros())!;
    this.scales.time = d3
      .scaleLinear<string, string>()
      .domain([0, time])
      .range(PS.minMaxColors);
    this.edgeWidthSizedBasedScale = this.hier.hasShape
      ? qe.EDGE_WIDTH_SIZE_BASED_SCALE
      : d3
          .scaleLinear()
          .domain([1, this.hier.maxEdgeSize])
          .range([qp.MIN_E_WIDTH, qp.MAX_E_WIDTH]);
  }

  getNdataByName(n?: string) {
    return n ? this.nds[n] : undefined;
  }

  getNodeByName(n?: string) {
    return this.hier.node(n);
  }

  getOrCreateRenderNodeByName(name: string): qn.Ndata | undefined {
    if (name in this.nds) return this.nds[name];
    const n = this.hier.node(name);
    if (!n) return undefined;
    const nd = qg.isClus(n)
      ? new qc.Nclus(n, this.hier.options)
      : new qn.Ndata(n);
    this.nds[name] = nd;
    this.renderedOpNames.push(name);
    if (n.stats) {
      nd.color.mem = this.scales.mem(n.stats.bytes!);
      nd.color.time = this.scales.time(n.stats.getMicros()!);
    }
    nd.faded = this.displaying && !qu.displayable(n.stats!);
    let hd: qt.Histo | undefined;
    let hc: qt.Histo | undefined;
    let oc;
    if (qg.isClus(n)) {
      hd = n.histo.device;
      hc = n.histo.cluster;
      const cs = n.histo.compat.compats;
      const ics = n.histo.compat.incompats;
      if (cs != 0 || ics != 0) oc = cs / (cs + ics);
    } else {
      let n = (nd.node as qg.Noper).device;
      if (n) dh = {[n]: 1};
      n = (d.node as qg.Noper).cluster;
      if (n) ch = {[n]: 1};
      if (d.node.type === qt.NdataT.OPER) {
        oc = (d.node as qg.Noper).compatible ? 1 : 0;
      }
    }
    if (hd) nd.shade.device = qu.shade(hd, this.colors.device);
    if (hc) nd.shade.cluster = qu.shade(hc, this.colors.cluster);
    if (oc) {
      nd.shade.compat = [
        {color: qp.OperColors.COMPAT, perc: oc},
        {color: qp.OperColors.INCOMPAT, perc: 1 - oc}
      ];
    }
    return this.nds[name];
  }

  getNearestVisibleAncestor(name: string) {
    const path = qg.hierPath(name);
    let i = 0;
    let node: qn.Ndata | undefined;
    let n = name;
    for (; i < path.length; i++) {
      n = path[i];
      node = this.getNdataByName(n);
      if (!node?.expanded) break;
    }
    if (i == path.length - 2) {
      const next = path[i + 1];
      if (node?.annos.in.names[next]) return next;
      if (node?.annos.out.names[next]) return next;
    }
    return n;
  }

  setDepth(d: number) {
    this.root.setDepth(d);
  }

  isNodeAuxiliary(nd: qn.Ndata) {
    const p = this.getNdataByName(nd.parent?.name) as qc.Nclus;
    let found = _.find(p.isolated.in, n => {
      return n.name === nd.name;
    });
    if (found) return true;
    found = _.find(p.isolated.out, n => {
      return n.name === nd.name;
    });
    return !!found;
  }

  getLabelForBaseEdge(e: qt.BaseEdge) {
    const n = this.getNodeByName(e.v) as qg.Noper;
    if (!n.outShapes || _.isEmpty(n.outShapes)) return undefined;
    const shape = n.outShapes[e.outKey];
    if (!shape) return undefined;
    if (shape.length === 0) return 'scalar';
    return shape.map(s => (s === -1 ? '?' : s)).join(TENSOR_SHAPE_DELIM);
  }

  getLabelForEdge(e: qg.Emeta) {
    if (this.edgeLabelFunction) return this.edgeLabelFunction(e);
    const isMulti = e.bases.length > 1;
    return isMulti
      ? e.bases.length + ' tensors'
      : this.getLabelForBaseEdge(e.bases[0]);
  }

  getNamesOfRenderedOps(): string[] {
    return this.renderedOpNames;
  }

  expandUntilNodeIsShown(scene, name: string) {
    const ns = name.split('/');
    const m = ns[ns.length - 1].match(/(.*):\w+/);
    if (m?.length === 2) ns[ns.length - 1] = m[1];
    let n = ns[0];
    let nd = this.getNdataByName(n);
    for (let i = 1; i < ns.length; i++) {
      if (nd?.type === qt.NdataT.OPER) break;
      this.buildSubhier(n);
      nd!.expanded = true;
      scene.setNodeExpanded(nd);
      n += '/' + ns[i];
      nd = this.getNdataByName(n);
    }
    return nd?.name;
  }

  _getAllContainedOpNodes(name: string) {
    let os = [] as qn.Noper[];
    const n = this.getNodeByName(name);
    if (qg.isOper(n)) return [n].concat(n.embeds.in as qn.Noper[]);
    const ns = n?.meta.nodes();
    ns?.forEach(n => {
      os = os.concat(this._getAllContainedOpNodes(n));
    });
    return os;
  }

  getVisibleParent(nd?: qg.Ndata) {
    let p = nd;
    let found = false;
    while (!found) {
      nd = p;
      p = nd?.parent;
      if (!p) {
        found = true;
      } else {
        const n = this.getNdataByName(p.name);
        if (n && (n.expanded || qg.isOper(p))) found = true;
      }
    }
    return nd;
  }

  findVisibleParents(ns: string[]) {
    const ps = {} as qt.Dict<qg.Ndata>;
    ns.forEach(n => {
      const nd = this.getNodeByName(n);
      const p = this.getVisibleParent(nd);
      if (p) ps[p.name!] = p;
    });
    return ps;
  }

  traceAllInputsOfOpNode(root: SVGElement, n: qg.Noper, ns: qt.Dict<any>) {
    if (ns[n.name!]) return ns;
    else ns[n.name!] = true;
    const ins = n.ins;
    const p = this.getVisibleParent(n)!;
    d3.select(root)
      .select(`.node[data-name="${p.name}"]`)
      .classed('input-highlight', true);
    const vins = {} as qt.Dict<VisibleParent>;
    ins.forEach(i => {
      let nd = this.getNodeByName(i.name);
      if (!nd) return;
      if (qg.isMeta(nd)) nd = this.getNodeByName(qu.strictName(nd.name));
      const vp = this.getVisibleParent(nd)!;
      const v = vins[vp.name!];
      if (v) {
        v.opNodes.push(nd);
      } else {
        vins[vp.name!] = {
          visibleParent: vp,
          opNodes: [nd]
        } as VisibleParent;
      }
    });
    const starts = {} as qt.Dict<any>;
    const nds = [p];
    starts[p.name!] = {
      idx: 0,
      ends: [],
      traced: false
    };
    let nd = p;
    for (let idx = 1; nd?.name !== qp.ROOT; idx++) {
      nd = nd?.parent;
      starts[nd.name!] = {
        idx,
        ends: [],
        traced: false
      };
      nds[idx] = nd;
    }
    _.forOwn(vins, vi => {
      const nd = vi.visibleParent;
      vi.opNodes.forEach(o => {
        ns = this.traceAllInputsOfOpNode(root, o, ns);
      });
      if (nd.name !== p?.name) createTrace(root, nd, starts, nds);
    });
    return ns;
  }

  updateInputTrace(root: SVGElement, n: string, trace: boolean) {
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
    if (!trace || !n) return;
    const os = this._getAllContainedOpNodes(n);
    let ns = {};
    os.forEach(o => {
      ns = this.traceAllInputsOfOpNode(root, o, ns);
    });
    const hs = _.keys(ns);
    const vs = this.findVisibleParents(hs);
    markParents(root, vs);
    r.selectAll<SVGElement, qg.Ndata>(
      'g.node:not(.selected):not(.input-highlight)' +
        ':not(.input-parent):not(.input-children)'
    )
      .classed('non-input', true)
      .each(d => {
        r.selectAll(`[data-name="${d.name}"]`).classed('non-input', true);
      });
    r.selectAll('g.edge:not(.input-edge-highlight)').classed(
      'non-input-edge-highlight',
      true
    );
  }

  cloneAndAddFunctionOpNode(
    m: qg.Nmeta,
    fnName: string,
    node: qg.Noper,
    pre: string
  ): qg.Noper {
    const newName = node.name.replace(fnName, pre);
    let n = m.meta.node(newName);
    if (n) return n as qg.Noper;
    const o = new qn.Noper({
      name: newName,
      input: [],
      device: node.device,
      op: node.op,
      attr: _.cloneDeep(node.attr)
    });
    o.cardin = node.cardin;
    o.include = node.include;
    o.outShapes = _.cloneDeep(node.outShapes);
    o.cluster = node.cluster;
    o.inIdx = node.inIdx;
    o.outIdx = node.outIdx;
    o.ins = node.ins.map(ni => {
      const newNormInput = _.clone(ni);
      newNormInput.name = ni.name.replace(fnName, pre);
      return newNormInput;
    });
    o.parent = m;
    m.meta.setNode(o.name, n);
    this.hier.setNode(o.name, n);
    const update = (e: qg.Noper) => {
      return this.cloneAndAddFunctionOpNode(m, fnName, e, pre);
    };
    o.inEmbeds = node.inEmbeds.map(update);
    o.outEmbeds = node.outEmbeds.map(update);
    return o;
  }

  private cloneLibMeta(
    g: qt.Graph<qg.Nclus | qg.Noper, qg.Emeta>,
    n: qg.Noper,
    libn: qg.Nmeta,
    oldPre: string,
    prefix: string
  ): qg.Nmeta {
    const dict = {} as qt.Dict<qt.Node>;
    const m = this.cloneLibMetaHelper(g, n, libn, oldPre, prefix, dict);
    if (!_.isEmpty(dict)) this.patchEdgesFromFunctionOutputs(n, dict);
    return m;
  }

  private cloneLibMetaHelper(
    g: qt.Graph<qg.Nclus | qg.Noper, qg.Emeta>,
    old: qg.Noper,
    libn: qg.Nmeta,
    oldPre: string,
    prefix: string,
    dict: qt.Dict<qt.Node>
  ): qg.Nmeta {
    const n = qg.createMetaNode(libn.name.replace(oldPre, prefix));
    n.depth = libn.depth;
    n.cardinality = libn.cardinality;
    n.template = libn.template;
    n.opHistogram = _.clone(libn.opHistogram);
    n.histo.device = _.clone(libn.histo.device);
    n.histo.cluster = _.clone(libn.histo.cluster);
    n.noControls = libn.noControls;
    n.include = libn.include;
    n.attributes = _.clone(libn.attributes);
    n.assocFn = libn.assocFn;
    _.each(libn.meta.nodes(), nn => {
      const o = libn.meta.node(nn);
      switch (o.type) {
        case qt.NdataT.META:
          const n2 = this.cloneLibMetaHelper(
            g,
            old,
            o as qg.Nmeta,
            oldPre,
            prefix,
            dict
          );
          n2.parent = n;
          n.meta.setNode(n2.name, n2);
          this.hier.setNode(n2.name, n2);
          break;
        case qt.NdataT.OPER:
          const n3 = this.cloneAndAddFunctionOpNode(
            n,
            oldPre,
            o as qg.Noper,
            prefix
          );
          if (_.isNumber(n3.inIdx)) this.patchEdgesIntoFunctionInputs(old, n3);
          if (_.isNumber(n3.outIdx)) dict[n3.outIdx] = n3;
          break;
        default:
          console.warn(o.name + ' is neither metanode nor opnode.');
      }
    });
    this.cloneLibraryMetaNodeEdges(libn, n, oldPre, prefix);
    return n;
  }

  private cloneLibraryMetaNodeEdges(
    libn: qg.Nmeta,
    newMetaNode: qg.Nmeta,
    oldPre: string,
    prefix: string
  ) {
    _.each(libn.meta.edges(), (edgeObject: qt.EdgeObject) => {
      const edge = libn.meta.edge(edgeObject);
      const newV = edge.v.replace(oldPre, prefix);
      const newW = edge.w.replace(oldPre, prefix);
      const newMetaEdge = new qg.MetaEdge(newV, newW);
      newMetaEdge.inbound = edge.inbound;
      newMetaEdge.numRegular = edge.numRegular;
      newMetaEdge.numControl = edge.numControl;
      newMetaEdge.numRef = edge.numRef;
      newMetaEdge.size = edge.size;
      if (edge.bases) {
        newMetaEdge.bases = edge.bases.map(e => {
          const newBaseEdge = _.clone(e);
          newBaseEdge.v = e.v.replace(oldPre, prefix);
          newBaseEdge.w = e.w.replace(oldPre, prefix);
          return newBaseEdge;
        });
      }
      if (newMetaNode.meta.node(newW)) {
        newMetaNode.meta.setEdge(newV, newW, newMetaEdge);
      } else {
        newMetaNode.meta.setEdge(newW, newV, newMetaEdge);
      }
    });
  }

  private patchEdgesIntoFunctionInputs(old: qg.Noper, node: qg.Noper) {
    let i = _.min([node.inIdx, old.ins.length - 1])!;
    let inp = _.clone(old.ins[i]);
    while (inp.isControl) {
      i++;
      inp = old.ins[i];
    }
    node.ins.push(inp);
    const es = this.hier.getPreds(old.name);
    let me: qg.Emeta | undefined;
    let count = 0;
    _.each(es.regular, e => {
      count += e.numRegular;
      if (count > i) me = e;
    });
    _.each(me?.bases, e => {
      if (e.w === old.name) e.w = node.name;
      if (e.v === old.name) e.v = node.name;
    });
  }

  private patchEdgesFromFunctionOutputs(old: qg.Noper, dict: qt.Dict<qt.Node>) {
    const es = this.hier.getSuccs(old.name);
    _.each(es.regular, me => {
      _.each(me.bases, e => {
        const n = this.hier.node(e.w) as qg.Noper;
        _.each(n.ins, ni => {
          if (ni.name === old.name) {
            const o = dict[ni.outKey];
            ni.name = o.name;
            ni.outKey = e.outKey;
          }
        });
      });
      _.each(me.bases, e => {
        e.v = dict[e.outKey].name;
        e.outKey = '0';
      });
    });
  }
}

export interface EdgeThicknessFunction {
  (ed: qg.Edata, c: string): number;
}

export interface EdgeLabelFunction {
  (e: qg.Emeta, gd: Gdata): string;
}

interface VisibleParent {
  visibleParent: qg.Ndata;
  opNodes: qg.Noper[];
}

function markParents(root: SVGElement, nds: qt.Dict<qg.Ndata>) {
  _.forOwn(nds, (nd?: qg.Ndata) => {
    while (nd && nd.name !== qp.ROOT) {
      const s = d3.select(root).select(`.node[data-name="${nd.name}"]`);
      if (
        s.nodes().length &&
        !s.classed('input-highlight') &&
        !s.classed('selected') &&
        !s.classed('op')
      ) {
        s.classed('input-parent', true);
      }
      nd = nd.parent;
    }
  });
}

function createTrace(
  root: SVGElement,
  nd: qg.Ndata,
  starts: qt.Dict<any>,
  nds: qg.Ndata[]
) {
  const pairs = [] as [qg.Ndata, qg.Ndata][];
  let n: qg.Ndata | undefined = nd;
  let prev = n;
  while (n && !starts[n.name!]) {
    if (prev?.name !== n.name) pairs.push([prev, n]);
    prev = n;
    n = n?.parent;
  }
  const s = starts[nd.name!].idx;
  const sn = nds[Math.max(s - 1, 0)].name;
  const r = d3.select(root);
  r.selectAll(`[data-edge="${prev.name}--${sn}"]`).classed(
    'input-edge-highlight',
    true
  );
  pairs.forEach(([i, o]) => {
    const sel = `[data-edge="${i.name}--${sn}` + `~~${o.name}~~OUT"]`;
    r.selectAll(sel).classed('input-edge-highlight', true);
  });
  for (let j = 1; j < s; j++) {
    const [i, o] = [nds[j - 1], nds[j]];
    const sel = `[data-edge="${prev.name}~~${o.name}` + `~~IN--${i.name}"]`;
    r.selectAll(sel).classed('input-edge-highlight', true);
  }
}
