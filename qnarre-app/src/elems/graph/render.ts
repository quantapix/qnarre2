/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-case-declarations */
import * as _ from 'lodash';
import * as d3 from 'd3';
import * as qu from './util';
import * as qt from './types';
import * as qg from './graph';
import * as edge from './edge';
import * as qp from './params';

export type Point = {x: number; y: number};

export interface EdgeThicknessFunction {
  (d: edge.EdgeData, edgeClass: string): number;
}

export interface EdgeLabelFunction {
  (e: qt.MetaEdge, d: Gdata): string;
}

const PARAMS = {
  enableExtraction: true,
  minNodeCountForExtraction: 15,
  minDegreeForExtraction: 5,
  maxControlDegree: 4,
  maxBridgePathDegree: 4,
  outExtractTypes: ['NoOp'],
  inExtractTypes: [],
  detachAllEdgesForHighDegree: true,
  extractIsolatedNodesWithAnnotationsOnOneSide: true,
  enableBridgegraph: true,
  minMaxColors: ['#fff5f0', '#fb6a4a'],
  maxAnnotations: 5
};

const nodeDisplayNameRegex = new RegExp(
  '^(?:' + qp.LIBRARY_PREFIX + ')?(\\w+)_[a-z0-9]{8}(?:_\\d+)?$'
);

export class Gdata {
  index = {} as qt.Dict<Ndata>;
  renderedOpNames = [] as string[];
  deviceColorMap = {} as d3.ScaleOrdinal<string, string>;
  clusterColorMap = {} as d3.ScaleOrdinal<string, string>;
  memoryUsageScale = {} as d3.ScaleLinear<string, string>;
  computeTimeScale = {} as d3.ScaleLinear<string, string>;
  edgeWidthSizedBasedScale = {} as
    | d3.ScaleLinear<number, number>
    | d3.ScalePower<number, number>;
  hasSubhierarchy = {} as qt.Dict<boolean>;
  root: GroupNdata;
  traceInputs = false;
  edgeLabelFunction?: EdgeLabelFunction;
  edgeWidthFunction?: EdgeThicknessFunction;

  constructor(public hierarchy: qt.Hierarchy, public displayingStats: boolean) {
    this.computeScales();
    this.root = new GroupNdata(hierarchy.root, hierarchy.options);
    this.root.expanded = true;
    this.index[hierarchy.root.name] = this.root;
    this.renderedOpNames.push(hierarchy.root.name);
    this.buildSubhierarchy(hierarchy.root.name);
  }

  computeScales() {
    this.deviceColorMap = d3
      .scaleOrdinal<string>()
      .domain(this.hierarchy.devices)
      .range(
        _.map(
          d3.range(this.hierarchy.devices.length),
          qp.MetaNodeColors.DEVICE_PALETTE
        )
      );
    this.clusterColorMap = d3
      .scaleOrdinal<string>()
      .domain(this.hierarchy.clusters)
      .range(
        _.map(
          d3.range(this.hierarchy.clusters.length),
          qp.MetaNodeColors.CLUSTER_PALETTE
        )
      );
    const top = this.hierarchy.root.metag;
    const maxMemory = d3.max(top.nodes(), n => {
      return top.node(n).stats?.bytes;
    })!;
    this.memoryUsageScale = d3
      .scaleLinear<string, string>()
      .domain([0, maxMemory])
      .range(PARAMS.minMaxColors);
    const maxTime = d3.max(top.nodes(), n => {
      return top.node(n).stats?.getMicros();
    })!;
    this.computeTimeScale = d3
      .scaleLinear<string, string>()
      .domain([0, maxTime])
      .range(PARAMS.minMaxColors);
    this.edgeWidthSizedBasedScale = this.hierarchy.hasShapeInfo
      ? edge.EDGE_WIDTH_SIZE_BASED_SCALE
      : d3
          .scaleLinear()
          .domain([1, this.hierarchy.maxMetaEdgeSize])
          .range([qp.MIN_EDGE_WIDTH, qp.MAX_EDGE_WIDTH]);
  }

  getNdataByName(name?: string) {
    return name ? this.index[name] : undefined;
  }

  getNodeByName(name?: string) {
    return this.hierarchy.node(name);
  }

  private colorHistogram(
    histo: qt.Dict<number>,
    colors: d3.ScaleOrdinal<string, string>
  ): Array<{color: string; proportion: number}> {
    if (Object.keys(histo).length > 0) {
      const c = _.sum(Object.keys(histo).map(k => histo[k]));
      return Object.keys(histo).map(k => ({
        color: colors(k),
        proportion: histo[k] / c
      }));
    }
    console.info('no pairs found');
    return [];
  }

  getOrCreateRenderNodeByName(name: string): Ndata | undefined {
    if (name in this.index) return this.index[name];
    const n = this.hierarchy.node(name);
    if (!n) return undefined;
    const d = n.isGroup
      ? new GroupNdata(n as qt.GroupNode, this.hierarchy.options)
      : new Ndata(n);
    this.index[name] = d;
    this.renderedOpNames.push(name);
    if (n.stats) {
      d.memoryColor = this.memoryUsageScale(n.stats.bytes!);
      d.computeTimeColor = this.computeTimeScale(n.stats.getMicros()!);
    }
    d.isFadedOut = this.displayingStats && !qu.isDisplayable(n.stats!);
    let dh: qt.Dict<number> | undefined;
    let ch: qt.Dict<number> | undefined;
    let oc;
    if (n.isGroup) {
      dh = (n as qt.GroupNode).deviceHisto;
      ch = (n as qt.GroupNode).clusterHisto;
      const compat = (n as qt.GroupNode).compatHisto.compatible;
      const incompat = (n as qt.GroupNode).compatHisto.incompatible;
      if (compat != 0 || incompat != 0) {
        oc = compat / (compat + incompat);
      }
    } else {
      let n = (d.node as qt.OpNode).device;
      if (n) dh = {[n]: 1};
      n = (d.node as qt.OpNode).cluster;
      if (n) ch = {[n]: 1};
      if (d.node.type === qt.NodeType.OP) {
        oc = (d.node as qt.OpNode).compatible ? 1 : 0;
      }
    }
    if (dh) {
      d.deviceColors = this.colorHistogram(dh, this.deviceColorMap);
    }
    if (ch) {
      d.clusterColors = this.colorHistogram(ch, this.clusterColorMap);
    }
    if (oc) {
      d.compatibilityColors = [
        {color: qp.OpNodeColors.COMPATIBLE, proportion: oc},
        {color: qp.OpNodeColors.INCOMPATIBLE, proportion: 1 - oc}
      ];
    }
    return this.index[name];
  }

  getNearestVisibleAncestor(name: string) {
    const path = qg.getHierarchicalPath(name);
    let i = 0;
    let node: Ndata | undefined;
    let n = name;
    for (; i < path.length; i++) {
      n = path[i];
      node = this.getNdataByName(n);
      if (!node?.expanded) break;
    }
    if (i == path.length - 2) {
      const next = path[i + 1];
      if (node?.inAnnotations.names[next]) return next;
      if (node?.outAnnotations.names[next]) return next;
    }
    return n;
  }

  setDepth(depth: number) {
    setGroupNodeDepth(this.root, +depth);
  }

  isNodeAuxiliary(node: Ndata) {
    const p = this.getNdataByName(node.node.parent?.name) as GroupNdata;
    let found = _.find(p.isolatedInExtract, n => {
      return n.node.name === node.node.name;
    });
    if (found) return true;
    found = _.find(p.isolatedOutExtract, n => {
      return n.node.name === node.node.name;
    });
    return !!found;
  }

  getNamesOfRenderedOps(): string[] {
    return this.renderedOpNames;
  }

  private cloneAndAddFunctionOpNode(
    m: qt.MetaNode,
    fnName: string,
    node: qt.OpNode,
    prefix: string
  ): qt.OpNode {
    const newName = node.name.replace(fnName, prefix);
    let n = m.metag.node(newName);
    if (n) {
      return n as qt.OpNode;
    }
    n = new qg.OpNode({
      name: newName,
      input: [],
      device: node.device,
      op: node.op,
      attr: _.cloneDeep(node.attr)
    });
    n.cardinality = node.cardinality;
    n.include = node.include;
    n.outShapes = _.cloneDeep(node.outShapes);
    n.cluster = node.cluster;
    n.fInputIdx = node.fInputIdx;
    n.fOutputIdx = node.fOutputIdx;
    n.ins = node.ins.map(ni => {
      const newNormInput = _.clone(ni);
      newNormInput.name = ni.name.replace(fnName, prefix);
      return newNormInput;
    });
    n.parent = m;
    m.metag.setNode(n.name, n);
    this.hierarchy.setNode(n.name, n);
    const update = (e: qt.OpNode) => {
      return this.cloneAndAddFunctionOpNode(m, fnName, e, prefix);
    };
    n.inEmbeds = node.inEmbeds.map(update);
    n.outEmbeds = node.outEmbeds.map(update);
    return n;
  }

  private cloneLibMeta(
    g: qt.Graph<qt.GroupNode | qt.OpNode, qt.MetaEdge>,
    n: qt.OpNode,
    libn: qt.MetaNode,
    oldPre: string,
    prefix: string
  ): qt.MetaNode {
    const dict = {} as qt.Dict<qt.Node>;
    const m = this.cloneLibMetaHelper(g, n, libn, oldPre, prefix, dict);
    if (!_.isEmpty(dict)) this.patchEdgesFromFunctionOutputs(n, dict);
    return m;
  }

  private cloneLibMetaHelper(
    g: qt.Graph<qt.GroupNode | qt.OpNode, qt.MetaEdge>,
    old: qt.OpNode,
    libn: qt.MetaNode,
    oldPre: string,
    prefix: string,
    dict: qt.Dict<qt.Node>
  ): qt.MetaNode {
    const n = qg.createMetaNode(libn.name.replace(oldPre, prefix));
    n.depth = libn.depth;
    n.cardinality = libn.cardinality;
    n.template = libn.template;
    n.opHistogram = _.clone(libn.opHistogram);
    n.deviceHisto = _.clone(libn.deviceHisto);
    n.clusterHisto = _.clone(libn.clusterHisto);
    n.noControlEdges = libn.noControlEdges;
    n.include = libn.include;
    n.attributes = _.clone(libn.attributes);
    n.assocFn = libn.assocFn;
    _.each(libn.metag.nodes(), nn => {
      const o = libn.metag.node(nn);
      switch (o.type) {
        case qt.NodeType.META:
          const n2 = this.cloneLibMetaHelper(
            g,
            old,
            o as qt.MetaNode,
            oldPre,
            prefix,
            dict
          );
          n2.parent = n;
          n.metag.setNode(n2.name, n2);
          this.hierarchy.setNode(n2.name, n2);
          break;
        case qt.NodeType.OP:
          const n3 = this.cloneAndAddFunctionOpNode(
            n,
            oldPre,
            o as qt.OpNode,
            prefix
          );
          if (_.isNumber(n3.fInputIdx))
            this.patchEdgesIntoFunctionInputs(old, n3);
          if (_.isNumber(n3.fOutputIdx)) dict[n3.fOutputIdx] = n3;
          break;
        default:
          console.warn(o.name + ' is neither metanode nor opnode.');
      }
    });
    this.cloneLibraryMetaNodeEdges(libn, n, oldPre, prefix);
    return n;
  }

  private cloneLibraryMetaNodeEdges(
    libn: qt.MetaNode,
    newMetaNode: qt.MetaNode,
    oldPre: string,
    prefix: string
  ) {
    _.each(libn.metag.edges(), (edgeObject: qt.EdgeObject) => {
      const edge = libn.metag.edge(edgeObject);
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
      if (newMetaNode.metag.node(newW)) {
        newMetaNode.metag.setEdge(newV, newW, newMetaEdge);
      } else {
        newMetaNode.metag.setEdge(newW, newV, newMetaEdge);
      }
    });
  }

  private patchEdgesIntoFunctionInputs(old: qt.OpNode, node: qt.OpNode) {
    let i = _.min([node.fInputIdx, old.ins.length - 1])!;
    let inp = _.clone(old.ins[i]);
    while (inp.isControlDep) {
      i++;
      inp = old.ins[i];
    }
    node.ins.push(inp);
    const es = this.hierarchy.getPreds(old.name);
    let me: qt.MetaEdge | undefined;
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

  private patchEdgesFromFunctionOutputs(
    old: qt.OpNode,
    dict: qt.Dict<qt.Node>
  ) {
    const es = this.hierarchy.getSuccs(old.name);
    _.each(es.regular, me => {
      _.each(me.bases, e => {
        const n = this.hierarchy.node(e.w) as qt.OpNode;
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

  buildSubhierarchy(nodeName: string) {
    if (nodeName in this.hasSubhierarchy) return;
    this.hasSubhierarchy[nodeName] = true;
    const d = this.index[nodeName];
    if (d.node.type !== qt.NodeType.META && d.node.type !== qt.NodeType.SERIES)
      return;
    const ndata = d as GroupNdata;
    const metaG = ndata.node.metag;
    const coreG = ndata.coreGraph;
    const os = [] as qt.OpNode[];
    const cs = [] as qt.MetaNode[];
    if (!_.isEmpty(this.hierarchy.libraryFns)) {
      _.each(metaG.nodes(), n => {
        const o = metaG.node(n) as qt.OpNode;
        const fd = this.hierarchy.libraryFns[o.op];
        if (!fd || n.startsWith(qp.LIBRARY_PREFIX)) return;
        const c = this.cloneLibMeta(metaG, o, fd.node, fd.node.name, o.name);
        os.push(o);
        cs.push(c);
      });
      _.each(cs, (c, i) => {
        const o = os[i];
        c.parent = o.parent;
        metaG.setNode(o.name, c);
        this.hierarchy.setNode(o.name, c);
      });
    }
    _.each(metaG.nodes(), n => {
      const cd = this.getOrCreateRenderNodeByName(n)!;
      const cn = cd.node;
      coreG.setNode(n, cd);
      if (!cn.isGroup) {
        _.each((cn as qt.OpNode).inEmbeds, e => {
          const ed = new Ndata(e);
          const md = new MetaEdata();
          addInAnno(cd, e, ed, md, qt.AnnotationType.CONSTANT);
          this.index[e.name] = ed;
        });
        _.each((cn as qt.OpNode).outEmbeds, e => {
          const ed = new Ndata(e);
          const md = new MetaEdata();
          addOutAnno(cd, e, ed, md, qt.AnnotationType.SUMMARY);
          this.index[e.name] = ed;
        });
      }
    });
    _.each(metaG.edges(), e => {
      const ed = metaG.edge(e);
      const md = new MetaEdata(ed);
      md.isFadedOut = this.index[e.v].isFadedOut || this.index[e.w].isFadedOut;
      coreG.setEdge(e.v, e.w, md);
    });
    if (PARAMS.enableExtraction && ndata.node.type === qt.NodeType.META) {
      extractHighDegrees(ndata);
    }
    if (!_.isEmpty(this.hierarchy.libraryFns)) {
      this.buildSubhierarchiesForNeededFunctions(metaG);
    }
    if (nodeName === qp.ROOT_NAME) {
      _.forOwn(this.hierarchy.libraryFns, fd => {
        const n = fd.node;
        const cd = this.getOrCreateRenderNodeByName(n.name)!;
        ndata.libraryFnsExtract.push(cd);
        cd.node.include = qt.InclusionType.EXCLUDE;
        coreG.removeNode(n.name);
      });
    }
    const parent = ndata.node.parent;
    if (!parent) return;
    const pd = this.index[parent.name] as GroupNdata;
    function bridgeName(inbound: boolean, ...rest: string[]) {
      return rest.concat([inbound ? 'IN' : 'OUT']).join('~~');
    }
    const bridgeG = this.hierarchy.getBridge(nodeName)!;
    const counts = {
      in: {} as qt.Dict<number>,
      out: {} as qt.Dict<number>,
      control: {} as qt.Dict<number>
    };
    _.each(bridgeG.edges(), e => {
      const inbound = !!metaG.node(e.w);
      const n = inbound ? e.v : e.w;
      const ed = bridgeG.edge(e);
      if (!ed.numRegular) {
        counts.control[n] = (counts.control[n] || 0) + 1;
      } else if (inbound) {
        counts.out[n] = (counts.out[n] || 0) + 1;
      } else {
        counts.in[n] = (counts.in[n] || 0) + 1;
      }
    });
    const hmap = this.hierarchy.getNodeMap();
    _.each(bridgeG.edges(), e => {
      const ed = bridgeG.edge(e);
      const inbound = !!metaG.node(e.w);
      const [n0, n1] = inbound ? [e.w, e.v] : [e.v, e.w];
      const rd0 = this.index[n0];
      const rd1 = this.index[n1];
      const isControl =
        !ed.numRegular && counts.control[n1] > PARAMS.maxControlDegree;
      const [, annos] = inbound
        ? [ndata.inAnnotations, rd0.inAnnotations]
        : [ndata.outAnnotations, rd0.outAnnotations];
      const c = (inbound ? counts.out : counts.in)[n1];
      const isOther = c > PARAMS.maxBridgePathDegree;
      let adjoining: MetaEdata | undefined;
      let canDraw = false;
      if (
        PARAMS.enableBridgegraph &&
        !isOther &&
        !isControl &&
        rd0.isInCore()
      ) {
        const find = (t: string) => {
          console.log(d);
          const l: qt.EdgeObject = inbound
            ? {v: t, w: nodeName}
            : {v: nodeName, w: t};
          return pd.coreGraph.edge(l);
        };
        adjoining = find(n1);
        if (!adjoining) {
          adjoining = find(bridgeName(inbound, n1, parent.name));
        }
        canDraw = !!adjoining;
      }
      let backwards = false;
      if (adjoining && !ed.numRegular) {
        let tope = adjoining;
        let topn = pd.node;
        while (tope.adjoiningMetaEdge) {
          tope = tope.adjoiningMetaEdge;
          topn = topn.parent as qt.GroupNode;
        }
        const o = this.hierarchy.getOrdering(topn.name);
        const e = tope.metaedge!;
        backwards = o[e.v] > o[e.w];
      }
      canDraw = canDraw && !backwards;
      if (!canDraw) {
        const n = rd1 ? rd1.node : hmap[n1];
        annos.push(
          new Annotation(
            n,
            rd1,
            new MetaEdata(ed),
            qt.AnnotationType.SHORTCUT,
            inbound
          )
        );
        return;
      }
      const bpn = bridgeName(inbound, nodeName);
      const bn = bridgeName(inbound, n1, nodeName);
      let bd = coreG.node(bn);
      if (!bd) {
        let bpd = coreG.node(bpn);
        if (!bpd) {
          const p: qt.BridgeNode = {
            name: bpn,
            type: qt.NodeType.BRIDGE,
            isGroup: false,
            cardinality: 0,
            inbound: inbound,
            attributes: {}
          };
          bpd = new Ndata(p);
          this.index[bpn] = bpd;
          coreG.setNode(bpn, bpd);
        }
        const n: qt.BridgeNode = {
          name: bn,
          type: qt.NodeType.BRIDGE,
          isGroup: false,
          cardinality: 1,
          inbound: inbound,
          attributes: {}
        };
        bd = new Ndata(n);
        this.index[bn] = bd;
        coreG.setNode(bn, bd);
        coreG.setParent(bn, bpn);
        bpd.node.cardinality++;
      }
      const bed = new MetaEdata(ed);
      bed.adjoiningMetaEdge = adjoining;
      inbound ? coreG.setEdge(bn, n0, bed) : coreG.setEdge(n0, bn, bed);
    });
    _.each([true, false], inbound => {
      const bpn = bridgeName(inbound, nodeName);
      const bpd = coreG.node(bpn);
      if (!bpd) return;
      _.each(coreG.nodes(), n => {
        const nd = coreG.node(n);
        if (nd.node.type === qt.NodeType.BRIDGE) return;
        const isTerminal = inbound
          ? !coreG.predecessors(n).length
          : !coreG.successors(n).length;
        if (!isTerminal) return;
        const sn = bridgeName(inbound, nodeName, 'STRUCTURAL_TARGET');
        let sd = coreG.node(sn);
        if (!sd) {
          const bn: qt.BridgeNode = {
            name: sn,
            type: qt.NodeType.BRIDGE,
            isGroup: false,
            cardinality: 1,
            inbound: inbound,
            attributes: {}
          };
          sd = new Ndata(bn);
          sd.structural = true;
          this.index[sn] = sd;
          coreG.setNode(sn, sd);
          bpd.node.cardinality++;
          coreG.setParent(sn, bpn);
        }
        const sed = new MetaEdata();
        sed.structural = true;
        sed.weight--;
        inbound ? coreG.setEdge(sn, n, sed) : coreG.setEdge(n, sn, sed);
      });
    });
  }

  private buildSubhierarchiesForNeededFunctions(
    g: qt.Graph<qt.GroupNode | qt.OpNode, qt.MetaEdge>
  ) {
    _.each(g.edges(), l => {
      const me = g.edge(l);
      const ed = new MetaEdata(me);
      _.forEach(ed.metaedge?.bases, e => {
        const ps = e.v.split(qp.NAMESPACE_DELIM);
        for (let i = ps.length; i >= 0; i--) {
          const front = ps.slice(0, i);
          const n = this.hierarchy.node(front.join(qp.NAMESPACE_DELIM));
          if (n) {
            if (
              n.type === qt.NodeType.OP &&
              this.hierarchy.libraryFns[(n as qt.OpNode).op]
            ) {
              for (let j = 1; j < front.length; j++) {
                const nn = front.slice(0, j).join(qp.NAMESPACE_DELIM);
                if (!nn) continue;
                this.buildSubhierarchy(nn);
              }
            }
            break;
          }
        }
      });
    });
  }
}

export class Annotation {
  node: qt.Node;
  ndata: Ndata;
  edata?: MetaEdata;
  type: qt.AnnotationType;
  dx = 0;
  dy = 0;
  width = 0;
  height = 0;
  v?: string;
  w?: string;
  isIn: boolean;
  labelOffset = 0;
  points = [] as {dx: number; dy: number}[];

  constructor(
    node: qt.Node,
    ndata: Ndata,
    edata: MetaEdata | undefined,
    type: qt.AnnotationType,
    isIn: boolean
  ) {
    this.node = node;
    this.ndata = ndata;
    this.edata = edata;
    this.type = type;
    if (edata && edata.metaedge) {
      this.v = edata.metaedge.v;
      this.w = edata.metaedge.w;
    }
    this.isIn = isIn;
  }
}

export class AnnotationList {
  list: Annotation[];
  names: qt.Dict<boolean>;

  constructor() {
    this.list = [];
    this.names = {};
  }
  push(a: Annotation) {
    if (a.node.name in this.names) return;
    this.names[a.node.name] = true;
    if (this.list.length < PARAMS.maxAnnotations) {
      this.list.push(a);
      return;
    }
    const type = qt.AnnotationType.ELLIPSIS;
    const last = this.list[this.list.length - 1];
    if (last.type === type) {
      const e = last.node as qt.EllipsisNode;
      e.setCountMore(++e.countMore);
      return;
    }
    const e = new qg.EllipsisNode(1);
    this.list.push(new Annotation(e, new Ndata(e), undefined, type, a.isIn));
  }
}

export class Ndata {
  expanded = false;
  inAnnotations = new AnnotationList();
  outAnnotations = new AnnotationList();
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  coreBox = {width: 0, height: 0};
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

  constructor(public node: qt.Node) {
    this.displayName = node.name.substring(
      node.name.lastIndexOf(qp.NAMESPACE_DELIM) + 1
    );
    if (node.type === qt.NodeType.META && (node as qt.MetaNode).assocFn) {
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

export class MetaEdata {
  adjoiningMetaEdge?: MetaEdata;
  structural = false;
  weight = 1;
  points = [] as Point[];
  edgeGroup?: d3.Selection<MetaEdata & any, any, any, any>;
  startMarkerId = '';
  endMarkerId = '';
  isFadedOut = false;

  constructor(public metaedge?: qt.MetaEdge) {}
}

function addInAnno(
  node: Ndata,
  pred: qt.Node,
  ndata: Ndata,
  edge: MetaEdata,
  type: qt.AnnotationType
) {
  const a = new Annotation(pred, ndata, edge, type, true);
  node.inAnnotations.push(a);
}

function addOutAnno(
  node: Ndata,
  succ: qt.Node,
  ndata: Ndata,
  edge: MetaEdata,
  type: qt.AnnotationType
) {
  const a = new Annotation(succ, ndata, edge, type, false);
  node.outAnnotations.push(a);
}

function setGraphDepth(g: qt.Graph<Ndata, any>, depth: number) {
  _.each(g.nodes(), n => {
    const d = g.node(n);
    d.expanded = depth > 1;
    if (depth > 0) {
      switch (d.node.type) {
        case qt.NodeType.META:
        case qt.NodeType.SERIES:
          setGroupNodeDepth(d as GroupNdata, depth - 1);
          break;
      }
    }
  });
}

export class GroupNdata extends Ndata {
  coreGraph: qt.Graph<Ndata, MetaEdata>;
  inExtractBox: {width: number; height: number};
  outExtractBox: {width: number; height: number};
  libraryFnsBox: {width: number; height: number};
  isolatedInExtract: Ndata[];
  isolatedOutExtract: Ndata[];
  libraryFnsExtract: Ndata[];

  constructor(public node: qt.GroupNode, opts: qt.GraphOptions) {
    super(node);
    const g = node.metag.graph();
    opts.compound = true;
    this.coreGraph = qg.createGraph<Ndata, MetaEdata>(
      g.name!,
      qt.GraphType.CORE,
      opts
    );
    this.inExtractBox = {width: 0, height: 0};
    this.outExtractBox = {width: 0, height: 0};
    this.libraryFnsBox = {width: 0, height: 0};
    this.isolatedInExtract = [];
    this.isolatedOutExtract = [];
    this.libraryFnsExtract = [];
  }
}

function setGroupNodeDepth(d: GroupNdata, depth: number): void {
  if (d.coreGraph) {
    setGraphDepth(d.coreGraph, depth);
  }
}

function createShortcut(g: qt.Graph<Ndata, MetaEdata>, v: string, w: string) {
  const src = g.node(v);
  const sink = g.node(w);
  const edge = g.edge(v, w);
  if (
    (src.node.include === qt.InclusionType.INCLUDE ||
      sink.node.include === qt.InclusionType.INCLUDE) &&
    src.node.include !== qt.InclusionType.EXCLUDE &&
    sink.node.include !== qt.InclusionType.EXCLUDE
  ) {
    return;
  }
  addOutAnno(src, sink.node, sink, edge, qt.AnnotationType.SHORTCUT);
  addInAnno(sink, src.node, src, edge, qt.AnnotationType.SHORTCUT);
  g.removeEdge(v, w);
}

function makeOutExtract(ndata: GroupNdata, n: string, forceDetach?: boolean) {
  const g = ndata.coreGraph;
  const c = g.node(n);
  c.isOutExtract = true;
  _.each(g.predecessors(n), p => createShortcut(g, p, n));
  if (PARAMS.detachAllEdgesForHighDegree || forceDetach) {
    _.each(g.successors(n), s => createShortcut(g, n, s));
  }
  if (g.neighbors(n).length === 0) {
    c.node.include = qt.InclusionType.EXCLUDE;
    ndata.isolatedOutExtract.push(c);
    g.removeNode(n);
  }
}

export function makeInExtract(ndata: GroupNdata, n: string, detach?: boolean) {
  const g = ndata.coreGraph;
  const d = g.node(n);
  d.isInExtract = true;
  _.each(g.successors(n), s => createShortcut(g, n, s));
  if (PARAMS.detachAllEdgesForHighDegree || detach) {
    _.each(g.predecessors(n), p => createShortcut(g, p, n));
  }
  if (g.neighbors(n).length === 0) {
    d.node.include = qt.InclusionType.EXCLUDE;
    ndata.isolatedInExtract.push(d);
    g.removeNode(n);
  }
}

function hasTypeIn(node: qt.Node, types: string[]) {
  if (node.type === qt.NodeType.OP) {
    for (let i = 0; i < types.length; i++) {
      if ((node as qt.OpNode).op === types[i]) return true;
    }
  } else if (node.type === qt.NodeType.META) {
    const root = (node as qt.MetaNode).getRootOp();
    if (root) {
      for (let i = 0; i < types.length; i++) {
        if (root.op === types[i]) return true;
      }
    }
  }
  return false;
}

function extractSpecifiedNodes(ndata: GroupNdata) {
  const g = ndata.coreGraph;
  _.each(g.nodes(), n => {
    const d = g.node(n);
    if (
      d.node.include === qt.InclusionType.EXCLUDE &&
      !n.startsWith(qp.LIBRARY_PREFIX)
    ) {
      if (
        ndata.coreGraph.outEdges(n).length > ndata.coreGraph.inEdges(n).length
      ) {
        makeOutExtract(ndata, n, true);
      } else {
        makeInExtract(ndata, n, true);
      }
    }
  });
}

function extractPredefinedSink(ndata: GroupNdata) {
  const g = ndata.coreGraph;
  _.each(g.nodes(), n => {
    const d = g.node(n);
    if (d.node.include) return;
    if (hasTypeIn(d.node, PARAMS.outExtractTypes)) {
      makeOutExtract(ndata, n);
    }
  });
}

function extractPredefinedSource(ndata: GroupNdata) {
  const g = ndata.coreGraph;
  _.each(g.nodes(), n => {
    const d = g.node(n);
    if (d.node.include) return;
    if (hasTypeIn(d.node, PARAMS.inExtractTypes)) {
      makeInExtract(ndata, n);
    }
  });
}

function extractHighInOrOutDegree(ndata: GroupNdata) {
  const g = ndata.coreGraph;
  const inDegree = {} as qt.Dict<number>;
  const outDegree = {} as qt.Dict<number>;
  let count = 0;
  _.each(g.nodes(), n => {
    if (g.node(n).node.include) return;
    let inD = _.reduce(
      g.predecessors(n),
      (d, p) => {
        const me = g.edge(p, n).metaedge;
        return d + (me?.numRegular ? 1 : 0);
      },
      0
    );
    if (inD === 0 && g.predecessors(n).length > 0) {
      inD = g.predecessors(n).length;
    }
    let outD = _.reduce(
      g.successors(n),
      (d, s) => {
        const me = g.edge(n, s).metaedge;
        return d + (me?.numRegular ? 1 : 0);
      },
      0
    );
    if (outD === 0 && g.successors(n).length > 0) {
      outD = g.successors(n).length;
    }
    inDegree[n] = inD;
    outDegree[n] = outD;
    count++;
  });
  if (count < PARAMS.minNodeCountForExtraction) return;
  const minBound = PARAMS.minDegreeForExtraction - 1;
  const q3 = Math.round(count * 0.75);
  const q1 = Math.round(count * 0.25);
  const si = Object.keys(inDegree).sort((n0, n1) => {
    return inDegree[n0] - inDegree[n1];
  });
  const iQ3 = inDegree[si[q3]];
  const iQ1 = inDegree[si[q1]];
  let iBound = iQ3 + iQ3 - iQ1;
  iBound = Math.max(iBound, minBound);
  for (let i = count - 1; inDegree[si[i]] > iBound; i--) {
    makeInExtract(ndata, si[i]);
  }
  const so = Object.keys(outDegree).sort((n0, n1) => {
    return outDegree[n0] - outDegree[n1];
  });
  const oQ3 = outDegree[so[q3]];
  const oQ1 = outDegree[so[q1]];
  let oBound = oQ3 + (oQ3 - oQ1) * 4;
  oBound = Math.max(oBound, minBound);
  for (let i = count - 1; outDegree[so[i]] > oBound; i--) {
    const n = g.node(so[i]);
    if (!n || n.isInExtract) continue;
    makeOutExtract(ndata, so[i]);
  }
}

function removeControlEdges(ndata: GroupNdata) {
  const g = ndata.coreGraph;
  const dict = {} as qt.Dict<qt.EdgeObject[]>;
  _.each(g.edges(), e => {
    if (!g.edge(e).metaedge?.numRegular) {
      (dict[e.v] = dict[e.v] || []).push(e);
      (dict[e.w] = dict[e.w] || []).push(e);
    }
  });
  _.each(dict, (es, _n) => {
    if (es.length > PARAMS.maxControlDegree) {
      _.each(es, e => createShortcut(g, e.v, e.w));
    }
  });
}

export function mapIndexToHue(id: number): number {
  const GOLDEN_RATIO = 1.61803398875;
  const MIN_HUE = 1;
  const MAX_HUE = 359;
  const COLOR_RANGE = MAX_HUE - MIN_HUE;
  return MIN_HUE + ((COLOR_RANGE * GOLDEN_RATIO * id) % COLOR_RANGE);
}

function extractHighDegrees(ndata: GroupNdata) {
  extractSpecifiedNodes(ndata);
  if (PARAMS.outExtractTypes) extractPredefinedSink(ndata);
  if (PARAMS.inExtractTypes) extractPredefinedSource(ndata);
  extractHighInOrOutDegree(ndata);
  if (PARAMS.maxControlDegree) removeControlEdges(ndata);
  const g = ndata.coreGraph;
  _.each(g.nodes(), n => {
    const c = g.node(n);
    const degree = g.neighbors(n).length;
    if (c.node.include) return;
    if (degree === 0) {
      const hasOut = c.outAnnotations.list.length > 0;
      const hasIn = c.inAnnotations.list.length > 0;
      if (c.isInExtract) {
        ndata.isolatedInExtract.push(c);
        c.node.include = qt.InclusionType.EXCLUDE;
        g.removeNode(n);
      } else if (c.isOutExtract) {
        ndata.isolatedOutExtract.push(c);
        c.node.include = qt.InclusionType.EXCLUDE;
        g.removeNode(n);
      } else if (PARAMS.extractIsolatedNodesWithAnnotationsOnOneSide) {
        if (hasOut && !hasIn) {
          c.isInExtract = true;
          ndata.isolatedInExtract.push(c);
          c.node.include = qt.InclusionType.EXCLUDE;
          g.removeNode(n);
        } else if (hasIn && !hasOut) {
          c.isOutExtract = true;
          ndata.isolatedOutExtract.push(c);
          c.node.include = qt.InclusionType.EXCLUDE;
          g.removeNode(n);
        }
      }
    }
  });
}
