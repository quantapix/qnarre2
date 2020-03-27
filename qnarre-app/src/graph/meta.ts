import * as _ from 'lodash';

import * as qc from './cluster';
import * as qd from './gdata';
import * as qe from './edata';
import * as qg from './graph';
import * as qh from './hierarchy';
import * as qn from './ndata';
import * as qp from './params';
import * as qt from './types';
import * as qu from './utils';

type Cluster = qt.Dict<string[]>;

export class Graph<
  G extends qd.Gdata,
  N extends qn.Ndata,
  E extends qe.Emeta
> extends qg.Graph<G, N, E> {
  build(h: qh.Hierarchy, names: qt.Dict<string>, ps: qt.HierarchyPs) {
    this.nodes().forEach(n => {
      const nd = this.node(n);
      if (qg.isMeta(nd)) nd.meta.build(h, names, ps);
    });
    const f = ps.patterns ? this.detect : this.collect;
    const ls = f(this.cluster(), h.opts);
    _.each(ls, (l, n) => {
      const ns = l.meta.nodes();
      ns.forEach(n => {
        const nd = this.node(n);
        if (qg.isOper(nd) && !nd.list) nd.list = n;
      });
      if (ns.length < ps.thresh && !(l.name in ps.groups)) {
        ps.groups[l.name] = false;
      }
      if (l.name in ps.groups && ps.groups[l.name] === false) return;
      h.setNode(n, l);
      this.setNode(n, l);
      ns.forEach(n => {
        const nd = this.node(n)!;
        l.meta.setNode(n, nd);
        l.parent = nd.parent as any;
        l.cardin++;
        qu.updateHistos(l.histo, nd);
        qu.updateCompat(l.histo, nd);
        if (qg.isOper(nd)) {
          nd.embeds.in.forEach(b => qu.updateCompat(l.histo, b));
          nd.embeds.out.forEach(b => qu.updateCompat(l.histo, b));
        }
        nd.parent = l;
        names[n] = n;
        this.delNode(n);
      });
    });
  }

  buildSubhierarchiesForNeededFunctions() {
    this.links().forEach(l => {
      const ed = this.edge(l);
      const m = new qe.Emeta(ed);
      _.forEach(m.metaedge?.bases, e => {
        const ps = e.v.split(qp.SLASH);
        for (let i = ps.length; i >= 0; i--) {
          const front = ps.slice(0, i);
          const nd = this.data?.hier.node(front.join(qp.SLASH));
          if (nd) {
            if (qg.isOper(nd) && this.data?.hier.libfns[nd.op]) {
              for (let j = 1; j < front.length; j++) {
                const n = front.slice(0, j).join(qp.SLASH);
                if (n) this.data?.buildSubhier(n);
              }
            }
            break;
          }
        }
      });
    });
  }

  cluster() {
    return _.reduce(
      this.nodes(),
      (c, n: string) => {
        const nd = this.node(n);
        if (qg.isClus(nd)) return c;
        if (qg.isOper(nd)) {
          const o = nd?.op;
          if (o) {
            c[o] = c[o] || [];
            c[o].push(nd?.name!);
          }
        }
        return c;
      },
      {} as Cluster
    );
  }

  detect(c: Cluster, opts: qg.Opts) {
    const lists = {} as qt.Dict<qc.Nlist>;
    _.each(c, (ns, cluster: string) => {
      if (ns.length <= 1) return;
      const ls = {} as qt.Dict<qg.Nlist>;
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
          sn = qu.listName(pre, suf, parent);
          if (!ls[sn]) ls[sn] = new qc.Nlist(pre, suf, parent, +id, n, opts);
          ls[sn].ids.push(+id);
          back[n] = back[n] || [];
          back[n].push([sn, id]);
        }
        if (matched < 1) {
          pre = isClus ? leaf.substr(0, leaf.length - 1) : leaf;
          id = '0';
          suf = isClus ? '*' : '';
          sn = qu.listName(pre, suf, parent);
          if (!ls[sn]) ls[sn] = new qc.Nlist(pre, suf, parent, +id, n, opts);
          ls[sn].ids.push(+id);
          back[n] = back[n] || [];
          back[n].push([sn, id]);
        }
      });
      const cs = {} as qt.Dict<qg.Nlist[]>;
      _.each(back, (ids, n) => {
        ids.sort((a, b) => ls[b[0]].ids.length - ls[a[0]].ids.length);
        const sn = ids[0][0];
        const id = ids[0][1];
        cs[sn] = cs[sn] || [];
        const path = n.split('/');
        const parent = path.slice(0, path.length - 1).join('/');
        const s = new qc.Nlist(
          ls[sn].prefix,
          ls[sn].suffix,
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
        let l = [ns2[0]];
        for (let i = 1; i < ns2.length; i++) {
          const n = ns2[i];
          if (n.cluster === l[l.length - 1].cluster + 1) {
            l.push(n);
            continue;
          }
          this.addList(l, lists, +cluster, opts);
          l = [n];
        }
        this.addList(l, lists, +cluster, opts);
      });
    });
    return lists;
  }

  collect(c: Cluster, opts: qg.Opts) {
    const lists = {} as qt.Dict<qc.Nlist>;
    _.each(c, (ns, cluster: string) => {
      if (ns.length <= 1) return;
      const ls = {} as qt.Dict<qg.Nlist[]>;
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
        const sn = qu.listName(pre, suf, parent);
        ls[sn] = ls[sn] || [];
        const s = new qc.Nlist(pre, suf, parent, +id, n, opts);
        ls[sn].push(s);
      });
      _.each(ls, (ns2, _) => {
        if (ns2.length < 2) return;
        ns2.sort((a, b) => +a.cluster - +b.cluster);
        let l = [ns2[0]];
        for (let i = 1; i < ns2.length; i++) {
          const n = ns2[i];
          if (n.cluster === l[l.length - 1].cluster + 1) {
            l.push(n);
            continue;
          }
          this.addList(l, lists, +cluster, opts);
          l = [n];
        }
        this.addList(l, lists, +cluster, opts);
      });
    });
    return lists;
  }

  addList(
    l: qg.Nlist[],
    ls: qt.Dict<qg.Nlist>,
    cluster: number,
    opts: qg.Opts
  ) {
    if (l.length > 1) {
      const name = qu.listName(
        l[0].prefix,
        l[0].suffix,
        l[0].pName,
        l[0].cluster,
        l[l.length - 1].cluster
      );
      const nd = new qc.Nlist(
        l[0].prefix,
        l[0].suffix,
        l[0].pName,
        cluster,
        name,
        opts
      );
      l.forEach(n => {
        nd.ids.push(n.cluster);
        nd.meta.setNode(n.name, this.node(n.name));
      });
      ls[name] = nd;
    }
  }
}
