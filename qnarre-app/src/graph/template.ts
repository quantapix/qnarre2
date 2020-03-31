import * as _ from 'lodash';

import * as qt from './types';
import * as qg from './graph';
import * as qh from './hierarchy';

export function detect(h: qh.Hierarchy, verify: boolean) {
  const gs = h.groups();
  const ts = templsFrom(gs, verify);
  return _.keys(ts)
    .sort(k => ts[k].level)
    .reduce((d, k) => {
      d[k] = ts[k];
      return d;
    }, {} as qt.Dict<qg.Template>);
}

function templsFrom(gs: [string, qg.Group][], verify: boolean) {
  return _.reduce(
    gs,
    (ts, [s, g]) => {
      const ns = g.nodes;
      const cs = [] as qg.Cluster[];
      ns.forEach(n => {
        for (let i = 0; i < cs.length; i++) {
          const s = !verify || areSimilar(cs[i].node.meta!, n.meta!);
          if (s) {
            n.template = cs[i].node.template;
            cs[i].names.push(n.name);
            return;
          }
        }
        n.template = s + '[' + cs.length + ']';
        cs.push({node: n, names: [n.name]});
      });
      cs.forEach(c => {
        ts[c.node.template!] = {
          level: g.level,
          names: c.names
        };
      });
      return ts;
    },
    {} as qt.Dict<qg.Template>
  );
}

function areSimilar(
  g1: qg.Graph<qg.Gdata, any, any>,
  g2: qg.Graph<qg.Gdata, any, any>
) {
  if (!g1.isSimilar(g2)) return false;
  const pre1 = g1.data?.name!;
  const pre2 = g2.data?.name!;
  const v1 = {} as qt.Dict<boolean>;
  const v2 = {} as qt.Dict<boolean>;
  const stack = [] as {n1: string; n2: string}[];
  function pushSame(n1: string, n2: string) {
    const s1 = n1.substr(pre1.length);
    const s2 = n2.substr(pre2.length);
    if (v1[s1] !== v2[s2]) {
      console.warn(`different pattern [ ${pre1} ] ${s1} [ ${pre2} ] ${s2}`);
      return false;
    }
    if (!v1[s1]) {
      v1[s1] = v2[s2] = true;
      stack.push({n1, n2});
    }
    return true;
  }
  let s1 = g1.sources();
  let s2 = g2.sources();
  if (s1.length !== s2.length) {
    console.log('different source lengths');
    return false;
  }
  s1 = sort(g1, s1, pre1);
  s2 = sort(g2, s2, pre2);
  for (let i = 0; i < s1.length; i++) {
    if (!pushSame(s1[i], s2[i])) return false;
  }
  while (stack.length > 0) {
    const {n1, n2} = stack.pop()!;
    if (!nodeSimilar(g1.node(n1), g2.node(n2))) return false;
    let s1 = g1.succs(n1) ?? [];
    let s2 = g2.succs(n2) ?? [];
    if (s1?.length !== s2?.length) {
      console.log('successor count mismatch', s1, s2);
      return false;
    }
    s1 = sort(g1, s1, pre1);
    s2 = sort(g2, s2, pre2);
    for (let i = 0; i < s1.length; i++) {
      if (!pushSame(s1[i], s2[i])) return false;
    }
  }
  return true;
}

function nodeSimilar(
  n1: qg.Noper | qg.Nmeta | qg.Nlist,
  n2: qg.Noper | qg.Nmeta | qg.Nlist
) {
  const t = n1.type;
  if (t === n2.type) {
    if (n1.type === qt.NdataT.META) {
      const m = n1 as qg.Nmeta;
      return m.template && m.template === (n2 as qg.Nmeta).template;
    } else if (t === qt.NdataT.OPER) {
      return (n1 as qg.Noper).op === (n2 as qg.Noper).op;
    } else if (t === qt.NdataT.LIST) {
      const s1 = n1 as qg.Nlist;
      const s2 = n2 as qg.Nlist;
      const c = s1.meta!.nodeCount;
      return (
        c === s2.meta!.nodeCount &&
        (c === 0 ||
          (s1.meta!.node(s1.meta!.nodes()[0]) as qg.Noper).op ===
            (s2.meta!.node(s2.meta!.nodes()[0]) as qg.Noper).op)
      );
    }
  }
  return false;
}

function sort(
  g: qg.Graph<qg.Gdata, qg.Nmeta | qg.Noper, qg.Emeta>,
  ns: string[],
  pre: string
) {
  return _.sortBy(ns, [
    n => (g.node(n) as qg.Noper).op,
    n => (g.node(n) as qg.Nmeta).template,
    n => g.neighbors(n)?.length,
    n => g.preds(n)?.length,
    n => g.succs(n)?.length,
    n => n.substr(pre.length)
  ]);
}
