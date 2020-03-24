import * as _ from 'lodash';

import * as qg from './graph';
import * as qh from './hierarchy';
import * as qt from './types';

export function group(
  m: qg.Nmeta,
  h: qh.Hierarchy,
  names: qt.Dict<string>,
  ps: qh.Params
) {
  const g = m.meta;
  g.nodes().forEach(n => {
    const nd = g.node(n);
    if (nd?.type === qt.NodeType.META) group(nd as qg.Nmeta, h, names, ps);
  });
  const ss = (ps.patterns ? detect : collect)(g, qg.clusterOps(g), h.opts);
  _.each(ss, (s: qg.Nseries, n: string) => {
    const ns = s.meta.nodes();
    ns.forEach(n => {
      const nd = g.node(n) as qg.Noper;
      if (!nd.series) nd.series = n;
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

function detect(g: qg.MetaGraph, c: Cluster, opts: qt.Opts) {
  const series = {} as qt.Dict<qg.Nseries>;
  _.each(c, (ns, cluster: string) => {
    if (ns.length <= 1) return;
    const ss = {} as qt.Dict<qg.Nseries>;
    const back = {} as qt.Dict<[string, string][]>;
    ns.forEach(n => {
      const isGroup = n.endsWith('*');
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
        sn = qg.seriesName(pre, suf, parent);
        if (!ss[sn]) ss[sn] = new qg.Nseries(pre, suf, parent, +id, n, opts);
        ss[sn].ids.push(+id);
        back[n] = back[n] || [];
        back[n].push([sn, id]);
      }
      if (matched < 1) {
        pre = isGroup ? leaf.substr(0, leaf.length - 1) : leaf;
        id = '0';
        suf = isGroup ? '*' : '';
        sn = qg.seriesName(pre, suf, parent);
        if (!ss[sn]) ss[sn] = new qg.Nseries(pre, suf, parent, +id, n, opts);
        ss[sn].ids.push(+id);
        back[n] = back[n] || [];
        back[n].push([sn, id]);
      }
    });
    const cs = {} as qt.Dict<qg.Nseries[]>;
    _.each(back, (ids, n) => {
      ids.sort((a, b) => ss[b[0]].ids.length - ss[a[0]].ids.length);
      const sn = ids[0][0];
      const id = ids[0][1];
      cs[sn] = cs[sn] || [];
      const path = n.split('/');
      const parent = path.slice(0, path.length - 1).join('/');
      const s = new qg.Nseries(
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
        addSeries(g, c, series, +cluster, opts);
        c = [n];
      }
      addSeries(g, c, series, +cluster, opts);
    });
  });
  return series;
}

function collect(g: qg.MetaGraph, c: Cluster, opts: qt.Opts) {
  const series = {} as qt.Dict<qg.Nseries>;
  _.each(c, (ns, cluster: string) => {
    if (ns.length <= 1) return;
    const cs = {} as qt.Dict<qg.Nseries[]>;
    ns.forEach(n => {
      const isGroup = n.endsWith('*');
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
        pre = isGroup ? leaf.substr(0, leaf.length - 1) : leaf;
        suf = isGroup ? '*' : '';
      }
      const sn = qg.seriesName(pre, suf, parent);
      cs[sn] = cs[sn] || [];
      const s = new qg.Nseries(pre, suf, parent, +id, n, opts);
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
        addSeries(g, c, series, +cluster, opts);
        c = [n];
      }
      addSeries(g, c, series, +cluster, opts);
    });
  });
  return series;
}

function addSeries(
  g: qg.MetaGraph,
  c: qg.Nseries[],
  series: qt.Dict<qg.Nseries>,
  cluster: number,
  opts: qt.Opts
) {
  if (c.length > 1) {
    const name = qg.seriesName(
      c[0].prefix,
      c[0].suffix,
      c[0].pName,
      c[0].cluster,
      c[c.length - 1].cluster
    );
    const nd = new qg.Nseries(
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
    series[name] = nd;
  }
}
