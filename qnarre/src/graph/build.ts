/* eslint-disable no-case-declarations */
import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qa from './anno';
import * as qc from './cluster';
import * as qd from './gdata';
import * as qe from './edata';
import * as qg from './graph';
import * as qn from './ndata';
import * as qp from './params';
import * as qs from './scene';
import * as qt from './types';

import {clone} from './clone';

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
  function buildMeta(
    gd: qd.Gdata,
    c: qc.Nclus,
    meta: qg.Mgraph,
    core: qg.Cgraph
  ) {
    const os = [] as qg.Noper[];
    const ms = [] as qg.Nmeta[];
    if (!_.isEmpty(gd.hier.libs)) {
      meta.nodes().forEach(n => {
        const o = meta.node(n)! as qg.Noper;
        const l = gd.hier.libs[o.op];
        if (!l || n.startsWith(qp.LIB_PRE)) return;
        const m = clone.lib.call(gd, meta, o, l.meta, l.meta.name, o.name);
        os.push(o);
        ms.push(m);
      });
      ms.forEach((m, i) => {
        const o = os[i];
        m.parent = o.parent as qg.Nclus;
        meta.setNode(o.name, m);
        gd.hier.setNode(o.name, m);
      });
    }
    meta.nodes().forEach(n => {
      const d = gd.getOrCreateRenderNodeByName(n)! as qg.Ndata;
      core.setNode(n, d);
      if (qg.isOper(d)) {
        d.embeds.in.forEach(o => {
          const n = new qn.Ndata(o);
          const e = new qe.Emeta();
          c.addInAnno(qt.AnnoT.CONSTANT, n, e);
          gd.nds[o.name] = n;
        });
        d.embeds.out.forEach(o => {
          const n = new qn.Ndata(o);
          const e = new qe.Emeta();
          c.addOutAnno(qt.AnnoT.SUMMARY, n, e);
          gd.nds[o.name] = n;
        });
      }
    });
    meta.links().forEach(l => {
      const ed = meta.edge(l);
      const m = new qe.Emeta(ed);
      m.faded = gd.nds[l.nodes[0]].faded || gd.nds[l.nodes[1]].faded;
      core.setEdge(l.nodes, m);
    });
    if (qp.GdataPs.enableExtraction && qg.isMeta(c)) c.extractHighDegrees();
    if (!_.isEmpty(gd.hier.libs)) buildSubhier.call(meta);
  }

  function counts(meta: qg.Mgraph, bridge: qg.Bgraph) {
    const cs = {
      in: {} as qt.Dict<number>,
      out: {} as qt.Dict<number>,
      control: {} as qt.Dict<number>
    };
    bridge.links().forEach(l => {
      const inbound = !!meta.node(l.nodes[1]);
      const n = inbound ? l.nodes[0] : l.nodes[1];
      const ed = bridge.edge(l)! as qg.Emeta;
      if (!ed.num.regular) {
        cs.control[n] = (cs.control[n] || 0) + 1;
      } else if (inbound) {
        cs.out[n] = (cs.out[n] || 0) + 1;
      } else {
        cs.in[n] = (cs.in[n] || 0) + 1;
      }
    });
    return cs;
  }

  function bridgeName(inbound: boolean, ...ns: string[]) {
    return ns.concat([inbound ? 'IN' : 'OUT']).join('~~');
  }

  function addData(this: qd.Gdata, core: qg.Cgraph, inbound: boolean) {
    const bpn = bridgeName(inbound, nodeName);
    const bn = bridgeName(inbound, n1, nodeName);
    let bd = core.node(bn);
    if (!bd) {
      let bpd = core.node(bpn);
      if (!bpd) {
        const p = new qn.Nbridge(bpn, 0, inbound);
        bpd = new qn.Ndata(p);
        this.nds[bpn] = bpd!;
        core.setNode(bpn, bpd);
      }
      const n = new qn.Nbridge(bn, 1, inbound);
      bd = new qn.Ndata(n);
      this.nds[bn] = bd!;
      core.setNode(bn, bd);
      core.setParent(bn, bpn);
      bpd!.cardin++;
    }
    return bn;
  }

  export function buildSubhier(this: qd.Gdata, nodeName: string) {
    if (nodeName in this.hasSubhier) return;
    this.hasSubhier[nodeName] = true;
    const nd = this.nds[nodeName];
    if (!qg.isMeta(nd) && !qg.isList(nd)) return;
    const clus = nd as qg.Nclus;
    const metaG = clus.meta!;
    const coreG = clus.core;
    buildMeta(this, clus, metaG, coreG);
    if (nodeName === qp.ROOT) {
      _.forOwn(this.hier.libs, l => {
        const m = l.meta;
        const d = this.getOrCreateRenderNodeByName(m.name)! as qg.Ndata;
        clus.isolated.lib.push(d);
        d.include = false;
        coreG.delNode(m.name);
      });
    }
    const parent = clus.parent;
    if (!parent) return;
    const pd = this.nds[parent.name] as qg.Nclus;
    const bridgeG = this.hier.bridge(nodeName)!;
    const cs = counts(metaG, bridgeG);
    bridgeG.links().forEach(l => {
      const inbound = !!metaG.node(l.nodes[1]);
      let [n0, n1] = l.nodes;
      if (inbound) [n1, n0] = l.nodes;
      const d0 = this.nds[n0];
      const d1 = this.nds[n1];
      const ed = bridgeG.edge(l)! as qg.Emeta;
      const control =
        !ed.num.regular && cs.control[n1] > qp.GdataPs.maxControlDegree;
      const [, annos] = inbound
        ? [clus.annos.in, d0.annos.in]
        : [clus.annos.out, d0.annos.out];
      const c = (inbound ? cs.out : cs.in)[n1];
      const other = c > qp.GdataPs.maxBridgePathDegree;
      let adjoining: qg.Emeta | undefined;
      let draw = false;
      if (qp.GdataPs.enableBridgegraph && !other && !control && d0.isInCore()) {
        const find = (t: string) => {
          const ns = inbound ? [t, nodeName] : [nodeName, t];
          return pd.core.edge(ns) as qg.Emeta;
        };
        adjoining = find(n1);
        if (!adjoining) adjoining = find(bridgeName(inbound, n1, parent.name));
        draw = !!adjoining;
      }
      let back = false;
      if (adjoining && !ed.num.regular) {
        let tope = adjoining;
        let topn = pd;
        while (tope.adjoining) {
          tope = tope.adjoining;
          topn = topn.parent as qg.Nclus;
        }
        const o = this.hier.order(topn.name);
        const m = tope.meta!;
        back = o[m.nodes![0]] > o[m.nodes![1]];
      }
      draw = draw && !back;
      if (!draw) {
        const n = d1 ? d1 : this.hier.node(n1)!;
        annos.push(
          new qa.Anno(qt.AnnoT.SHORTCUT, n, new qe.Emeta(ed), inbound)
        );
        return;
      }
      const bn = addData(this, coreG, inbound);
      const bed = new qe.Emeta(ed);
      bed.adjoining = adjoining;
      inbound ? coreG.setEdge([bn, n0], bed) : coreG.setEdge([n0, bn], bed);
    });
    [true, false].forEach(inbound => {
      const bpn = bridgeName(inbound, nodeName);
      const bpd = coreG.node(bpn);
      if (!bpd) return;
      coreG.nodes().forEach(n => {
        const nd = coreG.node(n);
        if (nd?.type === qt.NdataT.BRIDGE) return;
        const isTerminal = inbound
          ? !coreG.preds(n)?.length
          : !coreG.succs(n)?.length;
        if (!isTerminal) return;
        const sn = bridgeName(inbound, nodeName, 'STRUCTURAL_TARGET');
        let sd = coreG.node(sn);
        if (!sd) {
          const bn = new qn.Nbridge(sn, 1, inbound);
          sd = new qn.Ndata(bn);
          sd!.structural = true;
          this.nds[sn] = sd!;
          coreG.setNode(sn, sd);
          bpd.cardin++;
          coreG.setParent(sn, bpn);
        }
        const sed = new qe.Emeta();
        sed.structural = true;
        sed.weight--;
        inbound ? coreG.setEdge([sn, n], sed) : coreG.setEdge([n, sn], sed);
      });
    });
  }
}
