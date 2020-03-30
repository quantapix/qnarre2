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
import * as qe from './edata';

export namespace Graph {
  export function build(this: qg.Cgraph, sel: qt.Sel, e: qs.Elem) {
    const es = _.reduce(
      this.links(),
      (es, l) => {
        const ed = l.data as qe.Edata;
        ed.name = l.edge;
        es.push(ed as qe.Edata);
        return es;
      },
      [] as qe.Edata[]
    );
    const c = qs.selectCreate(sel, 'g', qt.Class.Edge.CONTAINER);
    const ss = c
      .selectAll<any, qe.Edata>(function() {
        return this.childNodes;
      })
      .data(es, d => d.name);
    ss.enter()
      .append('g')
      .attr('class', qt.Class.Edge.GROUP)
      .attr('data-edge', d => d.name)
      .each(function(d) {
        const s = d3.select(this);
        d.sel = s;
        e.addEdgeSel(d.name, s);
        if (e.handle) {
          s.on('click', d => {
            (d3.event as Event).stopPropagation();
            e.fire('edge-select', {edgeData: d, edgeGroup: s});
          });
        }
        d.addEdge(s, e);
      })
      .merge(ss)
      .each(function(d) {
        d.position(e, this);
      })
      .each(function(d) {
        d.stylize(d3.select(this), e);
      });
    ss.exit<qe.Edata>()
      .each(d => e.delEdgeSel(d.name))
      .remove();
    return ss;
  }
}

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
      metaG.buildSubhier();
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
        bpd.cardin++;
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
