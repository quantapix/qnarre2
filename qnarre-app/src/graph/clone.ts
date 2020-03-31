import * as _ from 'lodash';

import * as qg from './graph';
import * as qh from './hierarchy';
import * as qn from './ndata';
import * as qt from './types';

export namespace clone {
  export function lib(
    this: qg.Gdata,
    g: qg.Mgraph,
    n: qg.Noper,
    lib: qg.Nmeta,
    old: string,
    pre: string
  ) {
    const d = {} as qt.Dict<qg.Ndata>;
    const m = helper.call(this, g, n, lib, old, pre, d);
    if (!_.isEmpty(d)) patchOuts.call(this, n, d);
    return m;
  }

  function helper(
    this: qg.Gdata,
    g: qg.Mgraph,
    old: qg.Noper,
    lib: qg.Nmeta,
    oldPre: string,
    pre: string,
    dict: qt.Dict<qg.Ndata>
  ): qg.Nmeta {
    const n = qg.createMetaNode(lib.name.replace(oldPre, pre));
    n.depth = lib.depth;
    n.cardin = lib.cardin;
    n.template = lib.template;
    n.histo.op = _.clone(lib.histo.op);
    n.histo.dev = _.clone(lib.histo.dev);
    n.histo.clus = _.clone(lib.histo.clus);
    n.noControls = lib.noControls;
    n.include = lib.include;
    n.attrs = _.clone(lib.attrs);
    n.assoc = lib.assoc;
    _.each(lib.meta!.nodes(), nn => {
      const o = lib.meta!.node(nn)!;
      switch (o.type) {
        case qt.NdataT.META:
          const n2 = helper.call(
            this,
            g,
            old,
            o as qg.Nmeta,
            oldPre,
            pre,
            dict
          );
          n2.parent = n;
          n.meta.setNode(n2.name, n2);
          this.hier.setNode(n2.name, n2);
          break;
        case qt.NdataT.OPER:
          const n3 = add.call(this, n, oldPre, o as qg.Noper, pre);
          if (_.isNumber(n3.index.in)) patchIns.call(this, old, n3);
          if (_.isNumber(n3.index.out)) dict[n3.index.out] = n3;
          break;
        default:
          console.warn(o.name + ' is neither metanode nor opnode.');
      }
    });
    edges.call(this, lib, n, oldPre, pre);
    return n;
  }

  function add(
    this: qg.Gdata,
    m: qg.Nmeta,
    fnName: string,
    node: qg.Noper,
    pre: string
  ): qg.Noper {
    const newName = node.name.replace(fnName, pre);
    let n = m.meta!.node(newName);
    if (n) return n as qg.Noper;
    const o = new qn.Noper({
      name: newName,
      input: [],
      device: node.dev,
      op: node.op,
      attr: _.cloneDeep(node.attr)
    });
    o.cardin = node.cardin;
    o.include = node.include;
    o.shapes = _.cloneDeep(node.shapes);
    o.clus = node.clus;
    o.index.in = node.index.in;
    o.index.out = node.index.out;
    o.ins = node.ins.map(ni => {
      const newNormInput = _.clone(ni);
      newNormInput.name = ni.name.replace(fnName, pre);
      return newNormInput;
    });
    o.parent = m;
    m.meta!.setNode(o.name, n);
    this.hier.setNode(o.name, n);
    const update = (e: qg.Noper) => {
      return add.call(this, m, fnName, e, pre);
    };
    o.embeds.in = node.embeds.in.map(update);
    o.embeds.out = node.embeds.out.map(update);
    return o;
  }

  export function edges(
    this: qg.Gdata,
    nd: qg.Nmeta,
    _md: qg.Nmeta,
    old: string,
    pre: string
  ) {
    const meta = nd.meta!;
    meta.links().forEach(l => {
      const n0 = l.nodes[0].replace(old, pre);
      const n1 = l.nodes[1].replace(old, pre);
      const ed = meta.edge(l)! as qg.Emeta;
      const m = new qe.Emeta([n0, n1]);
      m.inbound = ed.inbound;
      m.num.regular = ed.num.regular;
      m.num.control = ed.num.control;
      m.num.ref = ed.num.ref;
      m.size = ed.size;
      if (ed.links) {
        m.links = ed.links.map(l => {
          const c = _.clone(l);
          c.nodes[0] = l.nodes[0].replace(old, pre);
          c.nodes[1] = l.nodes[1].replace(old, pre);
          return c;
        });
      }
      if (meta.node(n1)) meta.setEdge([n0, n1], m);
      else meta.setEdge([n1, n0], m);
    });
  }

  function patchIns(this: qg.Gdata, old: qg.Noper, o: qg.Noper) {
    let i = _.min([o.index.in, old.ins.length - 1])!;
    let ii = _.clone(old.ins[i]);
    while (ii.control) {
      i++;
      ii = old.ins[i];
    }
    o.ins.push(ii);
    const h = this.hier as qh.Hierarchy;
    const es = h.preds(old.name);
    let em: qg.Emeta | undefined;
    let count = 0;
    es.regular.forEach(m => {
      count += m.num.regular;
      if (count > i) em = m;
    });
    em?.links.forEach(l => {
      if (l.nodes[1] === old.name) l.nodes[1] = o.name;
      if (l.nodes[0] === old.name) l.nodes[0] = o.name;
    });
  }

  function patchOuts(this: qg.Gdata, old: qg.Noper, d: qt.Dict<qg.Ndata>) {
    const h = this.hier as qh.Hierarchy;
    const es = h.succs(old.name);
    es.regular.forEach(em => {
      em.links.forEach(l => {
        const n = h.node(l.nodes[1]) as qg.Noper;
        n.ins.forEach(i => {
          if (i.name === old.name) {
            const o = d[i.out];
            i.name = o.name;
            i.out = l.data!.out!;
          }
        });
      });
      em.links.forEach(l => {
        l.nodes[0] = d[l.data!.out!].name;
        l.data!.out = '0';
      });
    });
  }
}
