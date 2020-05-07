import * as _ from 'lodash';

import * as qb from './build';
import * as qg from './graph';
import * as qn from './ndata';
import * as qp from './params';
import * as qs from './scene';
import * as qt from './types';
import * as qu from './utils';

export class Nclus extends qn.Ndata implements qg.Nclus {
  core: qg.Cgraph;
  parent?: qg.Nclus;
  bridge?: qg.Bgraph;
  noControls?: boolean;
  areas = {in: new qt.Area(), out: new qt.Area(), lib: new qt.Area()};
  isolated = {
    in: [] as qn.Ndata[],
    out: [] as qn.Ndata[],
    lib: [] as qn.Ndata[]
  };
  histo = {
    dev: {} as qt.Histo,
    clus: {} as qt.Histo,
    comp: {compats: 0, incompats: 0}
  };

  constructor(
    t: qt.NdataT,
    n: string,
    public meta?: qg.Mgraph,
    opts?: qg.Opts
  ) {
    super(t, n);
    opts = opts ?? ({isCompound: true} as qg.Opts);
    this.core = qg.createGraph<qg.Gdata, qg.Ndata, qg.Edata>(
      qt.GdataT.CORE,
      n,
      opts
    );
  }

  setDepth(d: number) {
    if (this.core) this.core.setDepth(d);
    return this;
  }

  buildSub(sel: qt.Sel, e: qs.Elem) {
    if (qg.isClus(this)) {
      const c = qt.Class.Subscene.GROUP;
      if (this.expanded) this.build(sel, e, c);
      else qs.selectChild(sel, 'g', c).remove();
    }
  }

  makeInExtract(n: string, detach?: boolean) {
    const g = this.core;
    const nd = g.node(n)!;
    nd.extract.in = true;
    _.each(g.succs(n), s => g.createShortcut([n, s]));
    if (qp.GdataPs.detachAllEdgesForHighDegree || detach) {
      _.each(g.preds(n), p => g.createShortcut([p, n]));
    }
    if (g.neighbors(n)?.length === 0) {
      nd.include = false;
      this.isolated.in.push(nd as qn.Ndata);
      g.delNode(n);
    }
  }

  makeOutExtract(n: string, detach?: boolean) {
    const g = this.core;
    const nd = g.node(n)!;
    nd.extract.out = true;
    _.each(g.preds(n), p => g.createShortcut([p, n]));
    if (qp.GdataPs.detachAllEdgesForHighDegree || detach) {
      _.each(g.succs(n), s => g.createShortcut([n, s]));
    }
    if (g.neighbors(n)?.length === 0) {
      nd.include = false;
      this.isolated.out.push(nd as qn.Ndata);
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
      if (nd.hasTypeIn(qp.GdataPs.outExtractTypes)) {
        this.makeOutExtract(n);
      }
    });
  }

  extractPredefinedSource() {
    const g = this.core;
    g.nodes().forEach(n => {
      const nd = g.node(n)!;
      if (nd.include) return;
      if (nd.hasTypeIn(qp.GdataPs.inExtractTypes)) {
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
          const m = g.edge([p, n])?.meta;
          return d + (m?.num.regular ? 1 : 0);
        },
        0
      );
      let len = g.preds(n)?.length ?? 0;
      if (ind === 0 && len > 0) ind = len;
      let outd = _.reduce(
        g.succs(n),
        (d, s) => {
          const me = g.edge([n, s])?.meta;
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
    if (count < qp.GdataPs.minNodeCountForExtraction) return;
    const min = qp.GdataPs.minDegreeForExtraction - 1;
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
      if (!n || n.extract.in) continue;
      this.makeOutExtract(so[i]);
    }
  }

  removeControlEdges() {
    const g = this.core;
    const ls = {} as qt.Dict<qg.Link[]>;
    g.links().forEach(l => {
      const ed = g.edge(l);
      if (!ed?.meta?.num.regular) {
        (ls[l.nodes[0]] = ls[l.nodes[0]] || []).push(l);
        (ls[l.nodes[1]] = ls[l.nodes[1]] || []).push(l);
      }
    });
    _.each(ls, (ls2, _) => {
      if (ls2.length > qp.GdataPs.maxControlDegree) {
        ls2.forEach(l => g.createShortcut(l.nodes));
      }
    });
  }

  extractHighDegrees() {
    this.extractSpecifiedNodes();
    if (qp.GdataPs.outExtractTypes) this.extractPredefinedSink();
    if (qp.GdataPs.inExtractTypes) this.extractPredefinedSource();
    this.extractHighInOrOutDegree();
    if (qp.GdataPs.maxControlDegree) this.removeControlEdges();
    const g = this.core;
    g.nodes().forEach(n => {
      const nd = g.node(n)!;
      const d = g.neighbors(n)?.length;
      if (nd.include) return;
      if (d === 0) {
        const hasOut = nd.annos.out.length > 0;
        const hasIn = nd.annos.in.length > 0;
        if (nd.extract.in) {
          this.isolated.in.push(nd as qn.Ndata);
          nd.include = false;
          g.delNode(n);
        } else if (nd.extract.out) {
          this.isolated.out.push(nd as qn.Ndata);
          nd.include = false;
          g.delNode(n);
        } else if (qp.GdataPs.extractIsolatedNodesWithAnnotationsOnOneSide) {
          if (hasOut && !hasIn) {
            nd.extract.in = true;
            this.isolated.in.push(nd as qn.Ndata);
            nd.include = false;
            g.delNode(n);
          } else if (hasIn && !hasOut) {
            nd.extract.out = true;
            this.isolated.out.push(nd as qn.Ndata);
            nd.include = false;
            g.delNode(n);
          }
        }
      }
    });
  }

  build(sel: qt.Sel, e: qs.Elem, c = qt.Class.Scene.GROUP) {
    const empty = qs.selectChild(sel, 'g', c).empty();
    const s = qs.selectCreate(sel, 'g', c);
    const ds = _.reduce(
      this.core.nodes(),
      (ds, n) => {
        const nd = this.core.node(n);
        if (nd && !nd.excluded) ds.push(nd as qn.Ndata);
        return ds;
      },
      [] as qn.Ndata[]
    );
    if (qg.isList(this)) ds.reverse();
    const s2 = qs.selectCreate(s, 'g', qt.Class.Scene.CORE);
    qb.Graph.build.call(this.core, s2, e);
    qn.Ndatas.build.call(ds, s2, e);
    if (this.isolated.in.length > 0) {
      const g = qs.selectCreate(s, 'g', qt.Class.Scene.INEXTRACT);
      qn.Ndatas.build.call(this.isolated.in, g, e);
    } else {
      qs.selectChild(s, 'g', qt.Class.Scene.INEXTRACT).remove();
    }
    if (this.isolated.out.length > 0) {
      const g = qs.selectCreate(s, 'g', qt.Class.Scene.OUTEXTRACT);
      qn.Ndatas.build.call(this.isolated.out, g, e);
    } else {
      qs.selectChild(s, 'g', qt.Class.Scene.OUTEXTRACT).remove();
    }
    if (this.isolated.lib.length > 0) {
      const g = qs.selectCreate(s, 'g', qt.Class.Scene.LIBRARY);
      qn.Ndatas.build.call(this.isolated.lib, g, e);
    } else {
      qs.selectChild(s, 'g', qt.Class.Scene.LIBRARY).remove();
    }
    qs.position.clus(s, this);
    if (empty) {
      s.attr('opacity', 0)
        .transition()
        .attr('opacity', 1);
    }
    return s;
  }
}

type Ncomb = qg.Nclus | qg.Noper;

export class Nmeta extends Nclus implements qg.Nmeta {
  template?: string;
  assoc?: string;
  depth = 1;
  histo = {
    op: {} as qt.Histo,
    dev: {} as qt.Histo,
    clus: {} as qt.Histo,
    comp: {compats: 0, incompats: 0}
  };

  constructor(n: string, o = {} as qg.Opts) {
    super(
      qt.NdataT.META,
      n,
      qg.createGraph<qg.Gdata, Ncomb, qg.Edata>(qt.GdataT.META, n, o),
      o
    );
  }

  firstChild() {
    return this.meta!.node(this.meta!.nodes()[0]);
  }

  rootOp() {
    const s = this.name.split('/');
    const r = this.name + '/(' + s[s.length - 1] + ')';
    const n = this.meta!.node(r);
    return qg.isOper(n) ? (n as qg.Noper) : undefined;
  }

  leaves() {
    const ls = [] as string[];
    const q = [this] as qg.Ndata[];
    while (q.length) {
      const nd = q.shift()!;
      if (qg.isClus(nd)) {
        const m = nd.meta!;
        m.nodes().forEach(n => q.push(m.node(n)!));
      } else {
        ls.push(nd.name);
      }
    }
    return ls;
  }

  signature() {
    const ps = _.map(
      {
        depth: this.depth,
        '|N|': this.meta!.nodeCount,
        '|E|': this.meta!.edgeCount
      },
      (v, k) => k + '=' + v
    ).join(' ');
    const os = _.map(this.histo.op, (n, o) => o + '=' + n).join(',');
    return ps + ' [ops] ' + os;
  }
}

export class Nlist extends Nclus implements qg.Nlist {
  loop?: boolean;
  ids = [] as number[];

  constructor(
    public prefix: string,
    public suffix: string,
    public pName: string,
    public cluster: number,
    n = qu.listName(prefix, suffix, pName),
    o = {} as qg.Opts
  ) {
    super(
      qt.NdataT.LIST,
      n,
      qg.createGraph<qg.Gdata, Ncomb, qg.Edata>(qt.GdataT.LIST, n, o),
      o
    );
  }
}
