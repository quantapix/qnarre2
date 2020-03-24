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
  (e: qg.Emeta, d: Gdata): string;
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
          qp.NmetaColors.DEVICE_PALETTE
        )
      );
    this.clusterColorMap = d3
      .scaleOrdinal<string>()
      .domain(this.hierarchy.clusters)
      .range(
        _.map(
          d3.range(this.hierarchy.clusters.length),
          qp.NmetaColors.CLUSTER_PALETTE
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
    this.edgeWidthSizedBasedScale = this.hierarchy.hasShape
      ? edge.EDGE_WIDTH_SIZE_BASED_SCALE
      : d3
          .scaleLinear()
          .domain([1, this.hierarchy.maxEdgeSize])
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
      ? new GroupNdata(n as qg.Ngroup, this.hierarchy.options)
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
      dh = (n as qg.Ngroup).deviceHisto;
      ch = (n as qg.Ngroup).clusterHisto;
      const compat = (n as qg.Ngroup).compatHisto.compatible;
      const incompat = (n as qg.Ngroup).compatHisto.incompatible;
      if (compat != 0 || incompat != 0) {
        oc = compat / (compat + incompat);
      }
    } else {
      let n = (d.node as qg.Noper).device;
      if (n) dh = {[n]: 1};
      n = (d.node as qg.Noper).cluster;
      if (n) ch = {[n]: 1};
      if (d.node.type === qt.NodeType.OP) {
        oc = (d.node as qg.Noper).compatible ? 1 : 0;
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
        {color: qp.NoperColors.COMPATIBLE, proportion: oc},
        {color: qp.NoperColors.INCOMPATIBLE, proportion: 1 - oc}
      ];
    }
    return this.index[name];
  }

  getNearestVisibleAncestor(name: string) {
    const path = qg.hierarchyPath(name);
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
    m: qg.Nmeta,
    fnName: string,
    node: qg.Noper,
    prefix: string
  ): qg.Noper {
    const newName = node.name.replace(fnName, prefix);
    let n = m.meta.node(newName);
    if (n) {
      return n as qg.Noper;
    }
    n = new qg.Noper({
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
    n.inIdx = node.inIdx;
    n.outIdx = node.outIdx;
    n.ins = node.ins.map(ni => {
      const newNormInput = _.clone(ni);
      newNormInput.name = ni.name.replace(fnName, prefix);
      return newNormInput;
    });
    n.parent = m;
    m.meta.setNode(n.name, n);
    this.hierarchy.setNode(n.name, n);
    const update = (e: qg.Noper) => {
      return this.cloneAndAddFunctionOpNode(m, fnName, e, prefix);
    };
    n.inEmbeds = node.inEmbeds.map(update);
    n.outEmbeds = node.outEmbeds.map(update);
    return n;
  }

  private cloneLibMeta(
    g: qt.Graph<qg.Ngroup | qg.Noper, qg.Emeta>,
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
    g: qt.Graph<qg.Ngroup | qg.Noper, qg.Emeta>,
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
    n.deviceHisto = _.clone(libn.deviceHisto);
    n.clusterHisto = _.clone(libn.clusterHisto);
    n.noControls = libn.noControls;
    n.include = libn.include;
    n.attributes = _.clone(libn.attributes);
    n.assocFn = libn.assocFn;
    _.each(libn.meta.nodes(), nn => {
      const o = libn.meta.node(nn);
      switch (o.type) {
        case qt.NodeType.META:
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
          this.hierarchy.setNode(n2.name, n2);
          break;
        case qt.NodeType.OP:
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
    const es = this.hierarchy.getPreds(old.name);
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
    const es = this.hierarchy.getSuccs(old.name);
    _.each(es.regular, me => {
      _.each(me.bases, e => {
        const n = this.hierarchy.node(e.w) as qg.Noper;
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
    if (d.node.type !== qt.NodeType.META && d.node.type !== qt.NodeType.LIST)
      return;
    const ndata = d as GroupNdata;
    const metaG = ndata.node.metag;
    const coreG = ndata.coreGraph;
    const os = [] as qg.Noper[];
    const cs = [] as qg.Nmeta[];
    if (!_.isEmpty(this.hierarchy.libfns)) {
      _.each(metaG.nodes(), n => {
        const o = metaG.node(n) as qg.Noper;
        const fd = this.hierarchy.libfns[o.op];
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
        _.each((cn as qg.Noper).inEmbeds, e => {
          const ed = new Ndata(e);
          const md = new MetaEdata();
          addInAnno(cd, e, ed, md, qt.AnnotationType.CONSTANT);
          this.index[e.name] = ed;
        });
        _.each((cn as qg.Noper).outEmbeds, e => {
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
    if (!_.isEmpty(this.hierarchy.libfns)) {
      this.buildSubhierarchiesForNeededFunctions(metaG);
    }
    if (nodeName === qp.ROOT_NAME) {
      _.forOwn(this.hierarchy.libfns, fd => {
        const n = fd.node;
        const cd = this.getOrCreateRenderNodeByName(n.name)!;
        ndata.libfnsExtract.push(cd);
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
          topn = topn.parent as qg.Ngroup;
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
          const p: qt.Nbridge = {
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
        const n: qt.Nbridge = {
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
          const bn: qt.Nbridge = {
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
    g: qt.Graph<qg.Ngroup | qg.Noper, qg.Emeta>
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
              this.hierarchy.libfns[(n as qg.Noper).op]
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
        case qt.NodeType.LIST:
          setGroupNodeDepth(d as GroupNdata, depth - 1);
          break;
      }
    }
  });
}
