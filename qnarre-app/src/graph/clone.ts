import * as _ from 'lodash';

import * as qg from './graph';
import * as qh from './hierarchy';
import * as qn from './ndata';
import * as qt from './types';

export function cloneLib(
  this: qg.Gdata,
  g: qg.Mgraph,
  n: qg.Noper,
  lib: qg.Nmeta,
  old: string,
  pre: string
) {
  const d = {} as qt.Dict<qg.Ndata>;
  const m = cloneHelper.call(this, g, n, lib, old, pre, d);
  if (!_.isEmpty(d)) patchOuts.call(this, n, d);
  return m;
}

function cloneHelper(
  this: qg.Gdata,
  g: qg.Mgraph,
  old: qg.Noper,
  lib: qg.Nmeta,
  oldPre: string,
  prefix: string,
  dict: qt.Dict<qg.Ndata>
): qg.Nmeta {
  const n = qg.createMetaNode(lib.name.replace(oldPre, prefix));
  n.depth = lib.depth;
  n.cardinality = lib.cardin;
  n.template = lib.template;
  n.opHistogram = _.clone(lib.histo.op);
  n.histo.device = _.clone(lib.histo.dev);
  n.histo.cluster = _.clone(lib.histo.clus);
  n.noControls = lib.noControls;
  n.include = lib.include;
  n.attributes = _.clone(lib.attrs);
  n.assocFn = lib.assoc;
  _.each(lib.meta.nodes(), nn => {
    const o = lib.meta.node(nn)!;
    switch (o.type) {
      case qt.NdataT.META:
        const n2 = cloneHelper.call(
          this,
          g,
          old,
          o as qg.Nmeta,
          oldPre,
          prefix,
          dict
        );
        n2.parent = n;
        n.meta.setNode(n2.name, n2);
        this.hier.setNode(n2.name, n2);
        break;
      case qt.NdataT.OPER:
        const n3 = cloneAndAdd.call(this, n, oldPre, o as qg.Noper, prefix);
        if (_.isNumber(n3.index.in)) patchIns.call(this, old, n3);
        if (_.isNumber(n3.index.out)) dict[n3.index.out] = n3;
        break;
      default:
        console.warn(o.name + ' is neither metanode nor opnode.');
    }
  });
  cloneEdges.call(this, lib, n, oldPre, prefix);
  return n;
}

function cloneAndAdd(
  this: qg.Gdata,
  m: qg.Nmeta,
  fnName: string,
  node: qg.Noper,
  pre: string
): qg.Noper {
  const newName = node.name.replace(fnName, pre);
  let n = m.meta.node(newName);
  if (n) return n as qg.Noper;
  const o = new qn.Noper({
    name: newName,
    input: [],
    device: node.device,
    op: node.op,
    attr: _.cloneDeep(node.attr)
  });
  o.cardin = node.cardin;
  o.include = node.include;
  o.outShapes = _.cloneDeep(node.outShapes);
  o.cluster = node.cluster;
  o.index.in = node.index.in;
  o.index.out = node.index.out;
  o.ins = node.ins.map(ni => {
    const newNormInput = _.clone(ni);
    newNormInput.name = ni.name.replace(fnName, pre);
    return newNormInput;
  });
  o.parent = m;
  m.meta.setNode(o.name, n);
  this.hier.setNode(o.name, n);
  const update = (e: qg.Noper) => {
    return cloneAndAdd.call(this, m, fnName, e, pre);
  };
  o.embeds.in = node.embeds.in.map(update);
  o.embeds.out = node.embeds.out.map(update);
  return o;
}

function cloneEdges(
  this: qg.Gdata,
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
          i.out = l.outKey;
        }
      });
    });
    em.links.forEach(l => {
      l.nodes[0] = dict[l.outKey].name;
      l.outKey = '0';
    });
  });
}
