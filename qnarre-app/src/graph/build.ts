/* eslint-disable no-case-declarations */
import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qa from './anno';
import * as qg from './graph';
import * as qn from './ndata';
import * as qt from './types';
import * as qs from './scene';

class Gdata {
  buildSubhier(nodeName: string) {
    if (nodeName in this.hasSubhier) return;
    this.hasSubhier[nodeName] = true;
    const d = this.nds[nodeName];
    if (d.node.type !== qt.NdataT.META && d.node.type !== qt.NdataT.LIST)
      return;
    const ndata = d as qg.Nclus;
    const metaG = qn.ndata.node.metag;
    const coreG = qn.ndata.coreGraph;
    const os = [] as qg.Noper[];
    const cs = [] as qg.Nmeta[];
    if (!_.isEmpty(this.hier.libfns)) {
      _.each(metaG.nodes(), n => {
        const o = metaG.node(n) as qg.Noper;
        const fd = this.hier.libfns[o.op];
        if (!fd || n.startsWith(qp.LIBRARY_PREFIX)) return;
        const c = this.cloneLibMeta(metaG, o, fd.node, fd.node.name, o.name);
        os.push(o);
        cs.push(c);
      });
      _.each(cs, (c, i) => {
        const o = os[i];
        c.parent = o.parent;
        metaG.setNode(o.name, c);
        this.hier.setNode(o.name, c);
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
          addInAnno(qt.AnnoT.CONSTANT, cd, e, ed, md);
          this.nds[e.name] = ed;
        });
        _.each((cn as qg.Noper).outEmbeds, e => {
          const ed = new qn.Ndata(e);
          const md = new MetaEdata();
          addOutAnno(qt.AnnoT.SUMMARY, cd, e, ed, md);
          this.nds[e.name] = ed;
        });
      }
    });
    _.each(metaG.edges(), e => {
      const ed = metaG.edge(e);
      const md = new MetaEdata(ed);
      md.faded = this.nds[e.v].faded || this.nds[e.w].faded;
      coreG.setEdge(e.v, e.w, md);
    });
    if (PS.enableExtraction && qn.ndata.node.type === qt.NdataT.META) {
      extractHighDegrees(ndata);
    }
    if (!_.isEmpty(this.hier.libfns)) {
      metaG.buildSubhierarchiesForNeededFunctions();
    }
    if (nodeName === qp.ROOT_NAME) {
      _.forOwn(this.hier.libfns, fd => {
        const n = fd.node;
        const cd = this.getOrCreateRenderNodeByName(n.name)!;
        qn.ndata.libfnsExtract.push(cd);
        cd.node.include = qt.InclusionType.EXCLUDE;
        coreG.removeNode(n.name);
      });
    }
    const parent = qn.ndata.node.parent;
    if (!parent) return;
    const pd = this.nds[parent.name] as qg.Nclus;
    function bridgeName(inbound: boolean, ...rest: string[]) {
      return rest.concat([inbound ? 'IN' : 'OUT']).join('~~');
    }
    const bridgeG = this.hier.getBridge(nodeName)!;
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
    const hmap = this.hier.getNodeMap();
    _.each(bridgeG.edges(), e => {
      const ed = bridgeG.edge(e);
      const inbound = !!metaG.node(e.w);
      const [n0, n1] = inbound ? [e.w, e.v] : [e.v, e.w];
      const rd0 = this.nds[n0];
      const rd1 = this.nds[n1];
      const isControl =
        !ed.numRegular && counts.control[n1] > PS.maxControlDegree;
      const [, annos] = inbound
        ? [ndata.annos.in, rd0.annos.in]
        : [ndata.annos.out, rd0.annos.out];
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
        const o = this.hier.getOrdering(topn.name);
        const e = tope.metaedge!;
        backwards = o[e.v] > o[e.w];
      }
      canDraw = canDraw && !backwards;
      if (!canDraw) {
        const n = rd1 ? rd1.node : hmap[n1];
        annos.push(
          new Annotation(n, rd1, new MetaEdata(ed), qt.AnnoT.SHORTCUT, inbound)
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
            type: qt.NdataT.BRIDGE,
            isClus: false,
            cardinality: 0,
            inbound: inbound,
            attributes: {}
          };
          bpd = new qn.Ndata(p);
          this.nds[bpn] = bpd;
          coreG.setNode(bpn, bpd);
        }
        const n: qt.Nbridge = {
          name: bn,
          type: qt.NdataT.BRIDGE,
          isClus: false,
          cardinality: 1,
          inbound: inbound,
          attributes: {}
        };
        bd = new qn.Ndata(n);
        this.nds[bn] = bd;
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
        if (nd.node.type === qt.NdataT.BRIDGE) return;
        const isTerminal = inbound
          ? !coreG.predecessors(n).length
          : !coreG.successors(n).length;
        if (!isTerminal) return;
        const sn = bridgeName(inbound, nodeName, 'STRUCTURAL_TARGET');
        let sd = coreG.node(sn);
        if (!sd) {
          const bn: qt.Nbridge = {
            name: sn,
            type: qt.NdataT.BRIDGE,
            isClus: false,
            cardinality: 1,
            inbound: inbound,
            attributes: {}
          };
          sd = new qn.Ndata(bn);
          sd.structural = true;
          this.nds[sn] = sd;
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

export function buildGroup2(
  scene,
  g: qt.Graph<qr.Ndata, Emeta>,
  gelem: qs.GraphElem
) {
  const elem = gelem as any;
  const es = _.reduce(
    g.edges(),
    (ds, e) => {
      ds.push({v: e.v, w: e.w, label: g.edge(e)});
      return ds;
    },
    [] as EdgeData[]
  );
  const container = qs.selectOrCreate(scene, 'g', qt.Class.Edge.CONTAINER);
  const gs = (container as any)
    .selectAll(function() {
      return this.childNodes;
    })
    .data(es, getEdgeKey);
  gs.enter()
    .append('g')
    .attr('class', qt.Class.Edge.GROUP)
    .attr('data-edge', getEdgeKey)
    .each(function(d) {
      const g = d3.select(this);
      d.label.edgeGroup = g;
      elem._edgeGroupIndex[getEdgeKey(d)] = g;
      if (elem.handle) {
        g.on('click', d => {
          (d3.event as Event).stopPropagation();
          elem.fire('edge-select', {
            edgeData: d,
            edgeGroup: g
          });
        });
      }
      appendEdge(g, d, elem);
    })
    .merge(gs)
    .each(() => position(elem, this))
    .each((d: EdgeData) => stylize(d3.select(this), d, elem));
  gs.exit()
    .each((d: EdgeData) => delete elem._edgeGroupIndex[getEdgeKey(d)])
    .remove();
  return gs;
}

export function buildGroup(s: qt.Selection, ds: qn.Ndata[], e: qs.GraphElem) {
  const c = qs.selectOrCreate(s, 'g', qt.Class.Node.CONTAINER);
  const gs = c
    .selectAll<any, qg.Ndata>(function() {
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
    .attr('class', nd => qt.Class.Node.GROUP + ' ' + qn.nodeClass(nd))
    .each(function(nd) {
      const g = d3.select(this);
      const inb = qs.selectOrCreate(g, 'g', qt.Class.Anno.INBOX);
      qa.buildGroup(inb, nd.annos.in, nd, e);
      const outb = qs.selectOrCreate(g, 'g', qt.Class.Anno.OUTBOX);
      qa.buildGroup(outb, nd.annos.out, nd, e);
      const s2 = nd.buildShape(g, qt.Class.Node.SHAPE);
      if (qg.isClus(nd)) nd.addButton(s2, e);
      nd.addInteraction(s2, e);
      if (qg.isClus(nd)) nd.subBuild(g, e);
      const label = nd.labelBuild(g, e);
      nd.addInteraction(label, e, nd.type === qt.NdataT.META);
      nd.stylize(g, e);
      nd.position(g);
    });
  gs.exit<qn.Ndata>()
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
