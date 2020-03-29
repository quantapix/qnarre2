/* eslint-disable no-case-declarations */
import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qg from './graph';
import * as qn from './ndata';
import * as qt from './types';
import * as qs from './scene';
import * as qp from './params';
import * as qd from './gdata';
import * as qc from './clone';

export namespace Gdata {
  export function buildSubhier(this: qg.Gdata, nodeName: string) {
    if (nodeName in this.hasSubhier) return;
    this.hasSubhier[nodeName] = true;
    const nd = this.nds[nodeName];
    if (!qg.isMeta(nd) && !qg.isList(nd)) return;
    const clus = nd as qg.Nclus;
    const metaG = clus.meta;
    const coreG = clus.core;
    const os = [] as qg.Noper[];
    const ms = [] as qg.Nmeta[];
    if (!_.isEmpty(this.hier.libs)) {
      metaG.nodes().forEach(n => {
        const o = metaG.node(n) as qg.Noper;
        const l = this.hier.libs[o.op];
        if (!l || n.startsWith(qp.LIB_PRE)) return;
        const m = qc.cloneLib.call(this, metaG, o, l.meta, l.meta.name, o.name);
        os.push(o);
        ms.push(m);
      });
      ms.forEach((m, i) => {
        const o = os[i];
        m.parent = o.parent;
        metaG.setNode(o.name, m);
        this.hier.setNode(o.name, m);
      });
    }
    metaG.nodes().forEach(n => {
      const nd = this.getOrCreateRenderNodeByName(n)! as qg.Ndata;
      coreG.setNode(n, nd);
      if (!qg.isClus(nd)) {
        (nd as qg.Noper).embeds.in.forEach(o => {
          const n = new qn.Ndata(o);
          const e = new MetaEdata();
          nd.addInAnno(qt.AnnoT.CONSTANT, n, e);
          this.nds[o.name] = n;
        });
        (nd as qg.Noper).embeds.out.forEach(o => {
          const n = new qn.Ndata(o);
          const e = new MetaEdata();
          nd.addOutAnno(qt.AnnoT.SUMMARY, n, e);
          this.nds[o.name] = n;
        });
      }
    });
    metaG.links().forEach(l => {
      const ed = metaG.edge(l);
      const m = new MetaEdata(ed);
      m.faded = this.nds[l.nodes[0]].faded || this.nds[l.nodes[1]].faded;
      coreG.setEdge(l.nodes, m);
    });
    if (qp.GdataPs.enableExtraction && qg.isMeta(clus)) {
      clus.extractHighDegrees();
    }
    if (!_.isEmpty(this.hier.libs)) {
      metaG.buildSubhierarchiesForNeededFunctions();
    }
    if (nodeName === qp.ROOT) {
      _.forOwn(this.hier.libs, l => {
        const m = l.meta;
        const nd = this.getOrCreateRenderNodeByName(m.name)! as qg.Ndata;
        clus.isolated.lib.push(nd);
        nd.include = false;
        coreG.delNode(m.name);
      });
    }
    const parent = clus.parent;
    if (!parent) return;
    const pd = this.nds[parent.name] as qg.Nclus;
    function bridgeName(inbound: boolean, ...rest: string[]) {
      return rest.concat([inbound ? 'IN' : 'OUT']).join('~~');
    }
    const bridgeG = this.hier.bridge(nodeName)!;
    const counts = {
      in: {} as qt.Dict<number>,
      out: {} as qt.Dict<number>,
      control: {} as qt.Dict<number>
    };
    bridgeG.links().forEach(l => {
      const inbound = !!metaG.node(l.nodes[1]);
      const n = inbound ? l.nodes[0] : l.nodes[1];
      const ed = bridgeG.edge(l);
      if (!ed?.num.regular) {
        counts.control[n] = (counts.control[n] || 0) + 1;
      } else if (inbound) {
        counts.out[n] = (counts.out[n] || 0) + 1;
      } else {
        counts.in[n] = (counts.in[n] || 0) + 1;
      }
    });
    const hmap = this.hier.getNodeMap();
    bridgeG.links().forEach(l => {
      const ed = bridgeG.edge(l);
      const inbound = !!metaG.node(l.nodes[1]);
      let [n0, n1] = l.nodes;
      if (inbound) [n1, n0] = l.nodes;
      const rd0 = this.nds[n0];
      const rd1 = this.nds[n1];
      const isControl =
        !ed.num.regular && counts.control[n1] > qp.GdataPs.maxControlDegree;
      const [, annos] = inbound
        ? [clus.annos.in, rd0.annos.in]
        : [clus.annos.out, rd0.annos.out];
      const c = (inbound ? counts.out : counts.in)[n1];
      const isOther = c > qp.GdataPs.maxBridgePathDegree;
      let adjoining: MetaEdata | undefined;
      let canDraw = false;
      if (
        qp.GdataPs.enableBridgegraph &&
        !isOther &&
        !isControl &&
        rd0.isInCore()
      ) {
        const find = (t: string) => {
          console.log(d);
          const l: qt.EdgeObject = inbound
            ? {v: t, w: nodeName}
            : {v: nodeName, w: t};
          return pd.core.edge(l);
        };
        adjoining = find(n1);
        if (!adjoining) adjoining = find(bridgeName(inbound, n1, parent.name));
        canDraw = !!adjoining;
      }
      let backwards = false;
      if (adjoining && !ed.num.regular) {
        let tope = adjoining;
        let topn = pd;
        while (tope.adjoiningMetaEdge) {
          tope = tope.adjoiningMetaEdge;
          topn = topn.parent as qg.Nclus;
        }
        const o = this.hier.order(topn.name);
        const e = tope.metaedge!;
        backwards = o[e.v] > o[e.w];
      }
      canDraw = canDraw && !backwards;
      if (!canDraw) {
        const n = rd1 ? rd1 : hmap[n1];
        annos.push(
          new qa.Anno(n, rd1, new MetaEdata(ed), qt.AnnoT.SHORTCUT, inbound)
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
    [true, false].forEach(inbound => {
      const bpn = bridgeName(inbound, nodeName);
      const bpd = coreG.node(bpn);
      if (!bpd) return;
      _.each(coreG.nodes(), n => {
        const nd = coreG.node(n);
        if (nd?.type === qt.NdataT.BRIDGE) return;
        const isTerminal = inbound
          ? !coreG.preds(n)?.length
          : !coreG.succs(n)?.length;
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
          bpd.cardin++;
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
  const container = qs.selectCreate(scene, 'g', qt.Class.Edge.CONTAINER);
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
    .each(() => qs.position(elem, this))
    .each((d: EdgeData) => stylize(d3.select(this), d, elem));
  gs.exit()
    .each((d: EdgeData) => delete elem._edgeGroupIndex[getEdgeKey(d)])
    .remove();
  return gs;
}

export function buildGroup(s: qt.Selection, ds: qn.Ndata[], e: qs.GraphElem) {
  const c = qs.selectCreate(s, 'g', qt.Class.Node.CONTAINER);
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
      const inb = qs.selectCreate(g, 'g', qt.Class.Anno.INBOX);
      nd.annos.in.buildGroup(inb, nd, e);
      const outb = qs.selectCreate(g, 'g', qt.Class.Anno.OUTBOX);
      nd.annos.out.buildGroup(outb, nd, e);
      const s2 = nd.buildShape(g, qt.Class.Node.SHAPE);
      if (qg.isClus(nd)) qs.addButton(s2, nd, e);
      qs.addInteraction(s2, nd, e);
      if (qg.isClus(nd)) nd.subBuild(g, e);
      const label = nd.labelBuild(g, e);
      qs.addInteraction(label, nd, e, nd.type === qt.NdataT.META);
      nd.stylize(g, e);
      qs.position(g, nd);
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
