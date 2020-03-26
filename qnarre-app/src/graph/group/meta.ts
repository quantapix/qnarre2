import * as _ from 'lodash';

import * as qg from './graph';
import * as qd from './gdata';
import * as qn from './ndata';
import * as qh from './hierarchy';
import * as qt from './types';
import * as qe from './edata';
import * as qp from './params';

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
    const ss = f(this.cluster(), h.opts);
    _.each(ss, (s: qg.Nlist, n: string) => {
      const ns = s.meta.nodes();
      ns.forEach(n => {
        const nd = (this.node(n) as any) as qg.Noper;
        if (!nd.list) nd.list = n;
      });
      if (ns.length < ps.thresh && !(s.name in ps.groups)) {
        ps.groups[s.name] = false;
      }
      if (s.name in ps.groups && ps.groups[s.name] === false) return;
      h.setNode(n, s);
      this.setNode(n, s);
      ns.forEach(n => {
        const nd = (this.node(n) as any) as qg.Noper;
        s.meta.setNode(n, nd);
        s.parent = nd.parent as any;
        s.cardin++;
        s.incHistoFrom(nd);
        s.incCompatFrom(nd);
        nd.inbeds.forEach(b => s.incCompatFrom(b));
        nd.outbeds.forEach(b => s.incCompatFrom(b));
        nd.parent = s;
        names[n] = n;
        this.delNode(n);
      });
    });
  }

  buildSubhierarchiesForNeededFunctions() {
    this.links().forEach(l => {
      const me = this.edge(l);
      const ed = new qe.Emeta(me);
      _.forEach(ed.metaedge?.bases, e => {
        const ps = e.v.split(qp.SLASH);
        for (let i = ps.length; i >= 0; i--) {
          const front = ps.slice(0, i);
          const n = this.data?.hierarchy.node(front.join(qp.SLASH));
          if (n) {
            if (
              n.type === qt.NodeType.OPER &&
              this.data?.hierarchy.libfns[(n as qg.Noper).op]
            ) {
              for (let j = 1; j < front.length; j++) {
                const nn = front.slice(0, j).join(qp.SLASH);
                if (!nn) continue;
                this.data?.buildSubhierarchy(nn);
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

  detect(c: Cluster, opts: qt.Opts) {
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
          this.addList(c, lists, +cluster, opts);
          c = [n];
        }
        this.addList(c, lists, +cluster, opts);
      });
    });
    return lists;
  }

  collect(c: Cluster, opts: qt.Opts) {
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
          this.addList(c, lists, +cluster, opts);
          c = [n];
        }
        this.addList(c, lists, +cluster, opts);
      });
    });
    return lists;
  }

  addList(
    c: qg.Nlist[],
    ls: qt.Dict<qg.Nlist>,
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
        nd.meta.setNode(n.name, this.node(n.name));
      });
      ls[name] = nd;
    }
  }
}
