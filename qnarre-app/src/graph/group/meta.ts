import * as _ from 'lodash';

import * as qg from './graph';
import * as qh from './hierarchy';
import * as qt from './types';

export function build(
  g: qg.MetaGraph,
  h: qh.Hierarchy,
  names: qt.Dict<string>,
  ps: qh.Params
) {
  g.nodes().forEach(n => {
    const nd = g.node(n);
    if (qg.isMeta(nd)) build(nd.meta, h, names, ps);
  });
  const f = ps.patterns ? detect : collect;
  const ss = f(g, cluster(g), h.opts);
  _.each(ss, (s: qg.Nlist, n: string) => {
    const ns = s.meta.nodes();
    ns.forEach(n => {
      const nd = g.node(n) as qg.Noper;
      if (!nd.list) nd.list = n;
    });
    if (ns.length < ps.thresh && !(s.name in ps.groups)) {
      ps.groups[s.name] = false;
    }
    if (s.name in ps.groups && ps.groups[s.name] === false) return;
    h.setNode(n, s);
    g.setNode(n, s);
    ns.forEach(n => {
      const nd = g.node(n) as qg.Noper;
      s.meta.setNode(n, nd);
      s.parent = nd.parent as any;
      s.cardinality++;
      s.incHistoFrom(nd);
      s.incCompatFrom(nd);
      nd.inbeds.forEach(b => s.incCompatFrom(b));
      nd.outbeds.forEach(b => s.incCompatFrom(b));
      nd.parent = s;
      names[n] = n;
      g.delNode(n);
    });
  });
}

type Cluster = qt.Dict<string[]>;

export function cluster(g: qg.MetaGraph) {
  return _.reduce(
    g.nodes(),
    (c, n: string) => {
      const nd = g.node(n);
      if (qg.isClus(nd)) return c;
      const o = nd?.op;
      if (o) {
        c[o] = c[o] || [];
        c[o].push(nd?.name!);
      }
      return c;
    },
    {} as Cluster
  );
}

function detect(g: qg.MetaGraph, c: Cluster, opts: qt.Opts) {
  const lists = {} as qt.Dict<qg.Nlist>;
  _.each(c, (ns, cluster: string) => {
    if (ns.length <= 1) return;
    const ss = {} as qt.Dict<qg.Nlist>;
    const back = {} as qt.Dict<[string, string][]>;
    ns.forEach(n => {
      const isClus = n.endsWith('*');
      const path = n.split('/');
      const leaf = path[path.length - 1];
      const parent = path.slice(0, path.length - 1).join('/');
      const re = /(\d+)/g;
      let matches: RegExpExecArray | null;
      let pre: string;
      let id: string;
      let suf: string;
      let sn: string;
      let matched = 0;
      while ((matches = re.exec(leaf))) {
        ++matched;
        pre = leaf.slice(0, matches.index);
        id = matches[0];
        suf = leaf.slice(matches.index + matches[0].length);
        sn = qg.listName(pre, suf, parent);
        if (!ss[sn]) ss[sn] = new qg.Nlist(pre, suf, parent, +id, n, opts);
        ss[sn].ids.push(+id);
        back[n] = back[n] || [];
        back[n].push([sn, id]);
      }
      if (matched < 1) {
        pre = isClus ? leaf.substr(0, leaf.length - 1) : leaf;
        id = '0';
        suf = isClus ? '*' : '';
        sn = qg.listName(pre, suf, parent);
        if (!ss[sn]) ss[sn] = new qg.Nlist(pre, suf, parent, +id, n, opts);
        ss[sn].ids.push(+id);
        back[n] = back[n] || [];
        back[n].push([sn, id]);
      }
    });
    const cs = {} as qt.Dict<qg.Nlist[]>;
    _.each(back, (ids, n) => {
      ids.sort((a, b) => ss[b[0]].ids.length - ss[a[0]].ids.length);
      const sn = ids[0][0];
      const id = ids[0][1];
      cs[sn] = cs[sn] || [];
      const path = n.split('/');
      const parent = path.slice(0, path.length - 1).join('/');
      const s = new qg.Nlist(
        ss[sn].prefix,
        ss[sn].suffix,
        parent,
        +id,
        n,
        opts
      );
      cs[sn].push(s);
    });
    _.each(cs, (ns2, _) => {
      if (ns2.length < 2) return;
      ns2.sort((a, b) => +a.cluster - +b.cluster);
      let c = [ns2[0]];
      for (let i = 1; i < ns2.length; i++) {
        const n = ns2[i];
        if (n.cluster === c[c.length - 1].cluster + 1) {
          c.push(n);
          continue;
        }
        addList(g, c, lists, +cluster, opts);
        c = [n];
      }
      addList(g, c, lists, +cluster, opts);
    });
  });
  return lists;
}

function collect(g: qg.MetaGraph, c: Cluster, opts: qt.Opts) {
  const lists = {} as qt.Dict<qg.Nlist>;
  _.each(c, (ns, cluster: string) => {
    if (ns.length <= 1) return;
    const cs = {} as qt.Dict<qg.Nlist[]>;
    ns.forEach(n => {
      const isClus = n.endsWith('*');
      const path = n.split('/');
      const leaf = path[path.length - 1];
      const parent = path.slice(0, path.length - 1).join('/');
      const matches = leaf.match(/^(\D*)_(\d+)$/);
      let pre: string;
      let id = '0';
      let suf = '';
      if (matches) {
        pre = matches[1];
        id = matches[2];
      } else {
        pre = isClus ? leaf.substr(0, leaf.length - 1) : leaf;
        suf = isClus ? '*' : '';
      }
      const sn = qg.listName(pre, suf, parent);
      cs[sn] = cs[sn] || [];
      const s = new qg.Nlist(pre, suf, parent, +id, n, opts);
      cs[sn].push(s);
    });
    _.each(cs, (ns2, _) => {
      if (ns2.length < 2) return;
      ns2.sort((a, b) => +a.cluster - +b.cluster);
      let c = [ns2[0]];
      for (let i = 1; i < ns2.length; i++) {
        const n = ns2[i];
        if (n.cluster === c[c.length - 1].cluster + 1) {
          c.push(n);
          continue;
        }
        addList(g, c, lists, +cluster, opts);
        c = [n];
      }
      addList(g, c, lists, +cluster, opts);
    });
  });
  return lists;
}

function addList(
  g: qg.MetaGraph,
  c: qg.Nlist[],
  lists: qt.Dict<qg.Nlist>,
  cluster: number,
  opts: qt.Opts
) {
  if (c.length > 1) {
    const name = qg.listName(
      c[0].prefix,
      c[0].suffix,
      c[0].pName,
      c[0].cluster,
      c[c.length - 1].cluster
    );
    const nd = new qg.Nlist(
      c[0].prefix,
      c[0].suffix,
      c[0].pName,
      cluster,
      name,
      opts
    );
    c.forEach(n => {
      nd.ids.push(n.cluster);
      nd.meta.setNode(n.name, g.node(n.name));
    });
    lists[name] = nd;
  }
}
