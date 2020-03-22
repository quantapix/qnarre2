import * as _ from 'lodash';
import * as qt from './types';
import * as qg from './graph';

type Node = qt.Noper | qg.Ngroup;
type Group = {nodes: qg.Nmeta[]; level: number};
type Cluster = {node: qg.Nmeta; names: string[]};

export function detect(h: qt.Hierarchy, verify: boolean) {
  const gs = toGroups(h);
  const ts = toTemplates(gs, verify);
  return Object.keys(ts)
    .sort(k => ts[k].level)
    .reduce((d, k) => {
      d[k] = ts[k];
      return d;
    }, {} as qt.Dict<qt.Template>);
}

function toGroups(h: qt.Hierarchy) {
  const map = h.getNodeMap();
  const gs = Object.keys(map).reduce((r, name) => {
    const n: Node = map[name];
    if (n.type !== qt.NodeType.META) return r;
    const m = n as qg.Nmeta;
    const s = getSignature(m);
    const level = name.split('/').length - 1;
    const t = r[s] || {nodes: [], level};
    r[s] = t;
    t.nodes.push(m);
    if (t.level > level) t.level = level;
    return r;
  }, {} as qt.Dict<Group>);
  return Object.keys(gs)
    .map(k => [k, gs[k]] as [string, Group])
    .filter(([_, g]) => {
      const {nodes} = g;
      if (nodes.length > 1) return true;
      const n = nodes[0];
      return n.type === qt.NodeType.META && (n as qg.Nmeta).assocFn;
    })
    .sort(([_, g]) => g.nodes[0].depth);
}

function getSignature(m: qg.Nmeta) {
  const ps = _.map(
    {
      depth: m.depth,
      '|V|': m.metag.nodes().length,
      '|E|': m.metag.edges().length
    },
    (v, k) => k + '=' + v
  ).join(' ');
  const ops = _.map(m.opHistogram, (c, op) => op + '=' + c).join(',');
  return ps + ' [ops] ' + ops;
}

function toTemplates(gs: [string, Group][], verify: boolean) {
  return _.reduce(
    gs,
    (ts, [s, g]) => {
      const ns = g.nodes;
      const cs = [] as Cluster[];
      ns.forEach(node => {
        for (let i = 0; i < cs.length; i++) {
          const same = !verify || areSimilar(cs[i].node.metag, node.metag);
          if (same) {
            node.template = cs[i].node.template;
            cs[i].names.push(node.name);
            return;
          }
        }
        node.template = s + '[' + cs.length + ']';
        cs.push({node, names: [node.name]});
      });
      cs.forEach(c => {
        ts[c.node.template!] = {
          level: g.level,
          names: c.names
        };
      });
      return ts;
    },
    {} as qt.Dict<qt.Template>
  );
}

function areSimilar(g1: qt.Graph<any, any>, g2: qt.Graph<any, any>) {
  if (!qg.areDegreesSimilar(g1, g2)) return false;
  const pre1 = g1.graph().name!;
  const pre2 = g2.graph().name!;
  const v1 = {} as qt.Dict<boolean>;
  const v2 = {} as qt.Dict<boolean>;
  const stack = [] as {n1: string; n2: string}[];
  function pushIfSame(n1: string, n2: string) {
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
    console.log('different source length');
    return false;
  }
  s1 = sortNodes(g1, s1, pre1);
  s2 = sortNodes(g2, s2, pre2);
  for (let i = 0; i < s1.length; i++) {
    const same = pushIfSame(s1[i], s2[i]);
    if (!same) return false;
  }
  while (stack.length > 0) {
    const {n1, n2} = stack.pop()!;
    const same = areNodesSimilar(g1.node(n1), g2.node(n2));
    if (!same) return false;
    let s1 = g1.successors(n1);
    let s2 = g2.successors(n2);
    if (s1.length !== s2.length) {
      console.log('successor count mismatch', s1, s2);
      return false;
    }
    s1 = sortNodes(g1, s1, pre1);
    s2 = sortNodes(g2, s2, pre2);
    for (let i = 0; i < s1.length; i++) {
      const same = pushIfSame(s1[i], s2[i]);
      if (!same) return false;
    }
  }
  return true;
}

function areNodesSimilar(
  n1: qt.Noper | qg.Nmeta | qt.Nseries,
  n2: qt.Noper | qg.Nmeta | qt.Nseries
) {
  const t = n1.type;
  if (t === n2.type) {
    if (n1.type === qt.NodeType.META) {
      const m = n1 as qg.Nmeta;
      return m.template && m.template === (n2 as qg.Nmeta).template;
    } else if (t === qt.NodeType.OP) {
      return (n1 as qt.Noper).op === (n2 as qt.Noper).op;
    } else if (t === qt.NodeType.SERIES) {
      const s1 = n1 as qt.Nseries;
      const s2 = n2 as qt.Nseries;
      const c = s1.metag.nodeCount();
      return (
        c === s2.metag.nodeCount() &&
        (c === 0 ||
          (s1.metag.node(s1.metag.nodes()[0]) as qt.Noper).op ===
            (s2.metag.node(s2.metag.nodes()[0]) as qt.Noper).op)
      );
    }
  }
  return false;
}

function sortNodes(
  g: qt.Graph<qg.Nmeta | qt.Noper, qg.Emeta>,
  ns: string[],
  prefix: string
) {
  return _.sortBy(ns, [
    n => (g.node(n) as qt.Noper).op,
    n => (g.node(n) as qg.Nmeta).template,
    n => g.neighbors(n).length,
    n => g.predecessors(n).length,
    n => g.successors(n).length,
    n => n.substr(prefix.length)
  ]);
}
