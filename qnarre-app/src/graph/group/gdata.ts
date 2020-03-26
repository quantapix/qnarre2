import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qe from './edata';
import * as qg from './graph';
import * as qp from './params';
import * as qt from './types';
import * as qu from './utils';
import * as qn from './ndata';
import * as qh from './hierarchy';
import {GdataParams as PS} from './params';

export interface EdgeThicknessFunction {
  (ed: qg.Edata, c: string): number;
}

export interface EdgeLabelFunction {
  (e: qg.Emeta, gd: Gdata): string;
}

interface VisibleParent {
  visibleParent: qt.Node;
  opNodes: qg.Noper[];
}

export class Gdata {
  index = {} as qt.Dict<qn.Ndata>;
  renderedOpNames = [] as string[];
  deviceColorMap = {} as d3.ScaleOrdinal<string, string>;
  clusterColorMap = {} as d3.ScaleOrdinal<string, string>;
  memoryUsageScale = {} as d3.ScaleLinear<string, string>;
  computeTimeScale = {} as d3.ScaleLinear<string, string>;
  edgeWidthSizedBasedScale = {} as
    | d3.ScaleLinear<number, number>
    | d3.ScalePower<number, number>;
  hasSubhierarchy = {} as qt.Dict<boolean>;
  root: qg.Nclus;
  traceInputs = false;
  edgeLabelFunction?: EdgeLabelFunction;
  edgeWidthFunction?: EdgeThicknessFunction;

  constructor(public hierarchy: qh.Hierarchy, public displayingStats: boolean) {
    this.computeScales();
    this.root = new qg.Nclus(hierarchy.root, hierarchy.options);
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
        _.map(d3.range(this.hierarchy.devices.length), qp.MetaColors.DEVICE)
      );
    this.clusterColorMap = d3
      .scaleOrdinal<string>()
      .domain(this.hierarchy.clusters)
      .range(
        _.map(d3.range(this.hierarchy.clusters.length), qp.MetaColors.CLUSTER)
      );
    const top = this.hierarchy.root.meta;
    const maxMemory = d3.max(top.nodes(), n => {
      return top.node(n)?.stats?.bytes;
    })!;
    this.memoryUsageScale = d3
      .scaleLinear<string, string>()
      .domain([0, maxMemory])
      .range(PS.minMaxColors);
    const maxTime = d3.max(top.nodes(), n => {
      return top.node(n)?.stats?.getMicros();
    })!;
    this.computeTimeScale = d3
      .scaleLinear<string, string>()
      .domain([0, maxTime])
      .range(PS.minMaxColors);
    this.edgeWidthSizedBasedScale = this.hierarchy.hasShape
      ? qe.EDGE_WIDTH_SIZE_BASED_SCALE
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

  getOrCreateRenderNodeByName(name: string): qn.Ndata | undefined {
    if (name in this.index) return this.index[name];
    const n = this.hierarchy.node(name);
    if (!n) return undefined;
    const d = qg.isClus(n)
      ? new qg.Nclus(n as qg.Nclus, this.hierarchy.options)
      : new qn.Ndata(n);
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
    if (qg.isClus(n)) {
      dh = (n as qg.Nclus).histo.device;
      ch = (n as qg.Nclus).histo.cluster;
      const compats = (n as qg.Nclus).histo.compat.compats;
      const incompats = (n as qg.Nclus).histo.compat.incompats;
      if (compats != 0 || incompats != 0) {
        oc = compats / (compats + incompats);
      }
    } else {
      let n = (d.node as qg.Noper).device;
      if (n) dh = {[n]: 1};
      n = (d.node as qg.Noper).cluster;
      if (n) ch = {[n]: 1};
      if (d.node.type === qt.NodeType.OPER) {
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
        {color: qp.OperColors.COMPATIBLE, proportion: oc},
        {color: qp.OperColors.INCOMPATIBLE, proportion: 1 - oc}
      ];
    }
    return this.index[name];
  }

  getNearestVisibleAncestor(name: string) {
    const path = qg.hierarchyPath(name);
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
      if (node?.inAnnotations.names[next]) return next;
      if (node?.outAnnotations.names[next]) return next;
    }
    return n;
  }

  setDepth(d: number) {
    this.root.setDepth(d);
  }

  isNodeAuxiliary(nd: qn.Ndata) {
    const p = this.getNdataByName(nd.parent?.name) as qg.Nclus;
    let found = _.find(p.isolatedInExtract, n => {
      return n.node.name === nd.name;
    });
    if (found) return true;
    found = _.find(p.isolatedOutExtract, n => {
      return n.node.name === nd.name;
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
      if (nd?.type === qt.NodeType.OPER) break;
      this.buildSubhierarchy(n);
      nd!.expanded = true;
      scene.setNodeExpanded(nd);
      n += '/' + ns[i];
      nd = this.getNdataByName(n);
    }
    return nd?.name;
  }

  _getAllContainedOpNodes(name: string) {
    let os = [] as qg.Noper[];
    const n = this.getNodeByName(name);
    if (n instanceof qg.Noper) return [n].concat(n.inEmbeds);
    const ns = (n as qg.Nclus).meta.nodes();
    _.each(ns, n => {
      os = os.concat(this._getAllContainedOpNodes(n));
    });
    return os;
  }

  getVisibleParent(node?: qn.Ndata) {
    let p = node;
    let found = false;
    while (!found) {
      node = p;
      p = node?.parent;
      if (!p) {
        found = true;
      } else {
        const n = this.getNdataByName(p.name);
        if (n && (n.expanded || p instanceof qg.Noper)) found = true;
      }
    }
    return node;
  }

  findVisibleParents(ns: string[]) {
    const ps = {} as qt.Dict<qn.Ndata>;
    _.each(ns, nn => {
      const n = this.getNodeByName(nn);
      const p = this.getVisibleParent(n);
      if (p) ps[p.name] = p;
    });
    return ps;
  }

  traceAllInputsOfOpNode(
    root: SVGElement,
    startNode: qg.Noper,
    allTracedNodes: Record<string, any>
  ) {
    if (allTracedNodes[startNode.name]) {
      return allTracedNodes;
    } else {
      allTracedNodes[startNode.name] = true;
    }
    const ins = startNode.ins;
    const currentVisibleParent = this.getVisibleParent(startNode);
    d3.select(root)
      .select(`.node[data-name="${currentVisibleParent?.name}"]`)
      .classed('input-highlight', true);
    const visibleInputs = {};
    _.each(ins, nd => {
      let resolvedNode = this.getNodeByName(nd.name);
      if (resolvedNode === undefined) return;
      if (resolvedNode instanceof qg.Nmeta) {
        const resolvedNodeName = qg.strictName(resolvedNode.name);
        resolvedNode = this.getNodeByName(resolvedNodeName) as qg.Noper;
      }
      const visibleParent = this.getVisibleParent(resolvedNode);
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
    for (let index = 1; node?.name !== qp.ROOT; index++) {
      node = node?.parent;
      starts[node.name] = {
        traced: false,
        index: index,
        connectionEndpoints: []
      };
      idxStarts[index] = node;
    }
    _.forOwn(visibleInputs, function(visibleParentInfo: VisibleParent, key) {
      const node = visibleParentInfo.visibleParent;
      _.each(visibleParentInfo.opNodes, (opNode: qg.Noper) => {
        allTracedNodes = this.traceAllInputsOfOpNode(
          root,
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

  updateInputTrace(root: SVGElement, selectedNodeName: string, trace: boolean) {
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
    if (!trace || !selectedNodeName) return;
    const opNodes = this._getAllContainedOpNodes(selectedNodeName);
    let allTracedNodes = {};
    _.each(opNodes, node => {
      allTracedNodes = this.traceAllInputsOfOpNode(root, node, allTracedNodes);
    });
    const highlightedNodes = Object.keys(allTracedNodes);
    const visibleNodes = this.findVisibleParents(highlightedNodes);
    markParents(root, visibleNodes);
    r.selectAll(
      'g.node:not(.selected):not(.input-highlight)' +
        ':not(.input-parent):not(.input-children)'
    )
      .classed('non-input', true)
      .each(d => {
        const nodeName = d.name;
        r.selectAll(`[data-name="${nodeName}"]`).classed('non-input', true);
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
        case qt.NodeType.OPER:
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
    const ndata = d as qg.Nclus;
    const metaG = qn.ndata.node.metag;
    const coreG = qn.ndata.coreGraph;
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
      if (!cn.isClus) {
        _.each((cn as qg.Noper).inEmbeds, e => {
          const ed = new qn.Ndata(e);
          const md = new MetaEdata();
          addInAnno(cd, e, ed, md, qt.AnnotationType.CONSTANT);
          this.index[e.name] = ed;
        });
        _.each((cn as qg.Noper).outEmbeds, e => {
          const ed = new qn.Ndata(e);
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
    if (PS.enableExtraction && qn.ndata.node.type === qt.NodeType.META) {
      extractHighDegrees(ndata);
    }
    if (!_.isEmpty(this.hierarchy.libfns)) {
      metaG.buildSubhierarchiesForNeededFunctions();
    }
    if (nodeName === qp.ROOT_NAME) {
      _.forOwn(this.hierarchy.libfns, fd => {
        const n = fd.node;
        const cd = this.getOrCreateRenderNodeByName(n.name)!;
        qn.ndata.libfnsExtract.push(cd);
        cd.node.include = qt.InclusionType.EXCLUDE;
        coreG.removeNode(n.name);
      });
    }
    const parent = qn.ndata.node.parent;
    if (!parent) return;
    const pd = this.index[parent.name] as qg.Nclus;
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
        !ed.numRegular && counts.control[n1] > PS.maxControlDegree;
      const [, annos] = inbound
        ? [ndata.inAnnotations, rd0.inAnnotations]
        : [ndata.outAnnotations, rd0.outAnnotations];
      const c = (inbound ? counts.out : counts.in)[n1];
      const isOther = c > PS.maxBridgePathDegree;
      let adjoining: MetaEdata | undefined;
      let canDraw = false;
      if (PS.enableBridgegraph && !isOther && !isControl && rd0.isInCore()) {
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
          topn = topn.parent as qg.Nclus;
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
            isClus: false,
            cardinality: 0,
            inbound: inbound,
            attributes: {}
          };
          bpd = new qn.Ndata(p);
          this.index[bpn] = bpd;
          coreG.setNode(bpn, bpd);
        }
        const n: qt.Nbridge = {
          name: bn,
          type: qt.NodeType.BRIDGE,
          isClus: false,
          cardinality: 1,
          inbound: inbound,
          attributes: {}
        };
        bd = new qn.Ndata(n);
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
            isClus: false,
            cardinality: 1,
            inbound: inbound,
            attributes: {}
          };
          sd = new qn.Ndata(bn);
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
