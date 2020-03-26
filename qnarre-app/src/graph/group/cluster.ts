import * as _ from 'lodash';

import * as qt from './types';
import * as qg from './graph';
import * as qp from './params';
import * as qn from './ndata';
import * as qe from './edata';
import * as qs from './scene';
import {PARAMS as PS} from './params';

export class Nclus extends qn.Ndata implements qg.Nclus {
  core: qg.Graph<qg.Gdata, qn.Ndata, qe.Emeta>;
  inExtractBox: {w: number; h: number};
  outExtractBox: {w: number; h: number};
  libfnsBox: {w: number; h: number};
  isolatedInExtract: qn.Ndata[];
  isolatedOutExtract: qn.Ndata[];
  libfnsExtract: qn.Ndata[];
  histo = {} as qg.Histos;
  noControls?: boolean;

  constructor(public node: qg.Nclus, opts: qt.Opts) {
    super(node);
    const g = node.meta.data!;
    opts.isCompound = true;
    this.core = qg.createGraph<qg.Gdata, qn.Ndata, qe.Emeta>(
      g.name!,
      qt.GraphType.CORE,
      opts
    );
    this.inExtractBox = {w: 0, h: 0};
    this.outExtractBox = {w: 0, h: 0};
    this.libfnsBox = {w: 0, h: 0};
    this.isolatedInExtract = [];
    this.isolatedOutExtract = [];
    this.libfnsExtract = [];
  }

  buildGroup(s: qt.Selection, e: qs.GraphElem, cg: string) {
    cg = cg || qt.Class.Scene.GROUP;
    const empty = qs.selectChild(s, 'g', cg).empty();
    const scene = qs.selectOrCreate(s, 'g', cg);
    const sg = qs.selectOrCreate(scene, 'g', qt.Class.Scene.CORE);
    const ds = _.reduce(
      this.core.nodes(),
      (ds, n) => {
        const nd = this.core.node(n);
        if (nd && !nd.excluded) ds.push(nd);
        return ds;
      },
      [] as qn.Ndata[]
    );
    if (this.type === qt.NodeType.LIST) ds.reverse();
    qe.buildGroup(sg, this.core, e);
    qn.buildGroup(sg, ds, e);
    if (this.isolatedInExtract.length > 0) {
      const g = qs.selectOrCreate(scene, 'g', qt.Class.Scene.INEXTRACT);
      qn.buildGroup(g, this.isolatedInExtract, e);
    } else {
      qs.selectChild(scene, 'g', qt.Class.Scene.INEXTRACT).remove();
    }
    if (this.isolatedOutExtract.length > 0) {
      const g = qs.selectOrCreate(scene, 'g', qt.Class.Scene.OUTEXTRACT);
      qn.buildGroup(g, this.isolatedOutExtract, e);
    } else {
      qs.selectChild(scene, 'g', qt.Class.Scene.OUTEXTRACT).remove();
    }
    if (this.libfnsExtract.length > 0) {
      const g = qs.selectOrCreate(scene, 'g', qt.Class.Scene.LIBRARY);
      qn.buildGroup(g, this.libfnsExtract, e);
    } else {
      qs.selectChild(scene, 'g', qt.Class.Scene.LIBRARY).remove();
    }
    this.position(scene);
    if (empty) {
      scene
        .attr('opacity', 0)
        .transition()
        .attr('opacity', 1);
    }
    return scene;
  }

  position(s: qt.Selection) {
    const y = this.type === qt.NodeType.LIST ? 0 : PS.subscene.meta.labelHeight;
    qs.translate(qs.selectChild(s, 'g', qt.Class.Scene.CORE), 0, y);
    const ins = this.isolatedInExtract.length > 0;
    const outs = this.isolatedOutExtract.length > 0;
    const libs = this.libfnsExtract.length > 0;
    const off = PS.subscene.meta.extractXOffset;
    let w = 0;
    if (ins) w += this.outExtractBox.w;
    if (outs) w += this.outExtractBox.w;
    if (ins) {
      let x = this.box.w;
      if (w < qp.MIN_AUX_WIDTH) {
        x -= qp.MIN_AUX_WIDTH + this.inExtractBox.w / 2;
      } else {
        x -= this.inExtractBox.w / 2 - this.outExtractBox.w - (outs ? off : 0);
      }
      x -= this.libfnsBox.w - (libs ? off : 0);
      qs.translate(qs.selectChild(s, 'g', qt.Class.Scene.INEXTRACT), x, y);
    }
    if (outs) {
      let x = this.box.w;
      if (w < qp.MIN_AUX_WIDTH) {
        x -= qp.MIN_AUX_WIDTH + this.outExtractBox.w / 2;
      } else {
        x -= this.outExtractBox.w / 2;
      }
      x -= this.libfnsBox.w - (libs ? off : 0);
      qs.translate(qs.selectChild(s, 'g', qt.Class.Scene.OUTEXTRACT), x, y);
    }
    if (libs) {
      const x = this.box.w - this.libfnsBox.w / 2;
      qs.translate(qs.selectChild(s, 'g', qt.Class.Scene.LIBRARY), x, y);
    }
  }

  setDepth(d: number): void {
    if (this.core) this.core.setDepth(d);
  }

  subBuild(s: qt.Selection, e: qs.GraphElem) {
    if (qg.isClus(this)) {
      if (this.expanded) {
        return this.buildGroup(s, e, qt.Class.Subscene.GROUP);
      }
      qs.selectChild(s, 'g', qt.Class.Subscene.GROUP).remove();
    }
    return null;
  }

  makeOutExtract(n: string, detach?: boolean) {
    const g = this.core;
    const nd = g.node(n)!;
    nd.isOutExtract = true;
    _.each(g.preds(n), p => g.createShortcut([p, n]));
    if (PS.detachAllEdgesForHighDegree || detach) {
      _.each(g.succs(n), s => g.createShortcut([n, s]));
    }
    if (g.neighbors(n)?.length === 0) {
      nd.include = false;
      this.isolatedOutExtract.push(nd);
      g.delNode(n);
    }
  }

  makeInExtract(n: string, detach?: boolean) {
    const g = this.core;
    const nd = g.node(n)!;
    nd.isInExtract = true;
    _.each(g.succs(n), s => g.createShortcut([n, s]));
    if (PS.detachAllEdgesForHighDegree || detach) {
      _.each(g.preds(n), p => g.createShortcut([p, n]));
    }
    if (g.neighbors(n)?.length === 0) {
      nd.include = false;
      this.isolatedInExtract.push(nd);
      g.delNode(n);
    }
  }

  extractSpecifiedNodes() {
    const g = this.core;
    g.nodes().forEach(n => {
      const nd = g.node(n)!;
      if (!nd.include && !n.startsWith(qp.LIB_PRE)) {
        if (g.outLinks(n)!.length > g.inLinks(n)!.length) {
          this.makeOutExtract(n, true);
        } else {
          this.makeInExtract(n, true);
        }
      }
    });
  }

  extractPredefinedSink() {
    const g = this.core;
    g.nodes().forEach(n => {
      const nd = g.node(n)!;
      if (nd.include) return;
      if (nd.hasTypeIn(PS.outExtractTypes)) {
        this.makeOutExtract(n);
      }
    });
  }

  extractPredefinedSource() {
    const g = this.core;
    g.nodes().forEach(n => {
      const nd = g.node(n)!;
      if (nd.include) return;
      if (nd.hasTypeIn(PS.inExtractTypes)) {
        this.makeInExtract(n);
      }
    });
  }

  extractHighInOrOutDegree() {
    const g = this.core;
    const ins = {} as qt.Dict<number>;
    const outs = {} as qt.Dict<number>;
    let count = 0;
    g.nodes().forEach(n => {
      const nd = g.node(n)!;
      if (nd.include) return;
      let ind = _.reduce(
        g.preds(n),
        (d, p) => {
          const m = g.edge([p, n])?.metaedge;
          return d + (m?.num.regular ? 1 : 0);
        },
        0
      );
      let len = g.preds(n)?.length ?? 0;
      if (ind === 0 && len > 0) ind = len;
      let outd = _.reduce(
        g.succs(n),
        (d, s) => {
          const me = g.edge([n, s])?.metaedge;
          return d + (me?.num.regular ? 1 : 0);
        },
        0
      );
      len = g.succs(n)?.length ?? 0;
      if (outd === 0 && len > 0) outd = len;
      ins[n] = ind;
      outs[n] = outd;
      count++;
    });
    if (count < PS.minNodeCountForExtraction) return;
    const min = PS.minDegreeForExtraction - 1;
    const q3 = Math.round(count * 0.75);
    const q1 = Math.round(count * 0.25);
    const si = _.keys(ins).sort((n0, n1) => ins[n0] - ins[n1]);
    const iQ3 = ins[si[q3]];
    const iQ1 = ins[si[q1]];
    let ib = iQ3 + iQ3 - iQ1;
    ib = Math.max(ib, min);
    for (let i = count - 1; ins[si[i]] > ib; i--) {
      this.makeInExtract(si[i]);
    }
    const so = _.keys(outs).sort((n0, n1) => outs[n0] - outs[n1]);
    const oQ3 = outs[so[q3]];
    const oQ1 = outs[so[q1]];
    let ob = oQ3 + (oQ3 - oQ1) * 4;
    ob = Math.max(ob, min);
    for (let i = count - 1; outs[so[i]] > ob; i--) {
      const n = g.node(so[i]);
      if (!n || n.isInExtract) continue;
      this.makeOutExtract(so[i]);
    }
  }

  removeControlEdges() {
    const g = this.core;
    const ls = {} as qt.Dict<qt.Link<qe.Emeta>[]>;
    g.links().forEach(l => {
      const ed = g.edge(l);
      if (!ed?.metaedge?.num.regular) {
        (ls[l.nodes[0]] = ls[l.nodes[0]] || []).push(l);
        (ls[l.nodes[1]] = ls[l.nodes[1]] || []).push(l);
      }
    });
    _.each(ls, (ls2, _) => {
      if (ls2.length > PS.maxControlDegree) {
        ls2.forEach(l => g.createShortcut(l.nodes));
      }
    });
  }

  extractHighDegrees() {
    this.extractSpecifiedNodes();
    if (PS.outExtractTypes) this.extractPredefinedSink();
    if (PS.inExtractTypes) this.extractPredefinedSource();
    this.extractHighInOrOutDegree();
    if (PS.maxControlDegree) this.removeControlEdges();
    const g = this.core;
    g.nodes().forEach(n => {
      const nd = g.node(n)!;
      const d = g.neighbors(n)?.length;
      if (nd.include) return;
      if (d === 0) {
        const hasOut = nd.outAnnotations.list.length > 0;
        const hasIn = nd.inAnnotations.list.length > 0;
        if (nd.isInExtract) {
          this.isolatedInExtract.push(nd);
          nd.include = false;
          g.delNode(n);
        } else if (nd.isOutExtract) {
          this.isolatedOutExtract.push(nd);
          nd.include = false;
          g.delNode(n);
        } else if (PS.extractIsolatedNodesWithAnnotationsOnOneSide) {
          if (hasOut && !hasIn) {
            nd.isInExtract = true;
            this.isolatedInExtract.push(nd);
            nd.include = false;
            g.delNode(n);
          } else if (hasIn && !hasOut) {
            nd.isOutExtract = true;
            this.isolatedOutExtract.push(nd);
            nd.include = false;
            g.delNode(n);
          }
        }
      }
    });
  }
}

export function mapIndexToHue(id: number): number {
  const GOLDEN_RATIO = 1.61803398875;
  const MIN_HUE = 1;
  const MAX_HUE = 359;
  const COLOR_RANGE = MAX_HUE - MIN_HUE;
  return MIN_HUE + ((COLOR_RANGE * GOLDEN_RATIO * id) % COLOR_RANGE);
}
