import * as _ from 'lodash';
import * as d3 from 'd3';

import * as qc from './cluster';
import * as qg from './graph';
import * as qh from './hierarchy';
import * as qn from './ndata';
import * as qp from './params';
import * as qs from './scene';
import * as qt from './types';
import * as qu from './utils';

import {GdataPs as PS} from './params';

type Linear = d3.ScaleLinear<string, string>;
type Ordinal = d3.ScaleOrdinal<string, string>;
type Power = d3.ScalePower<number, number>;
type NLinear = d3.ScaleLinear<number, number>;

export class Gdata implements qg.Gdata {
  name = '';
  type = qt.GdataT.CORE;
  rankdir = 'bt' as qt.Dir;
  edgesep = NaN;
  nodesep = NaN;
  ranksep = NaN;
  root: qc.Nclus;
  nds = {} as qt.Dict<qg.Ndata>;
  hasSubhier = {} as qt.Dict<boolean>;
  colors = {} as {dev: Ordinal; clus: Ordinal};
  scales = {} as {mem: Linear; time: Linear; width: NLinear | Power};
  renderedOpNames = [] as string[];
  traceInputs = false;
  labelFn?: (e: qg.Emeta, d: Gdata) => string;
  widthFn?: (e: qg.Edata, c: string) => number;

  constructor(public hier: qh.Hierarchy, public displaying: boolean) {
    this.initScales();
    const n = hier.root.name;
    this.root = new qc.Nclus(n, hier.root, hier.opts);
    this.root.expanded = true;
    this.nds[n] = this.root;
    this.renderedOpNames.push(n);
    this.buildSubhier(n);
  }

  buildSubhier(_n: string) {}

  initScales() {
    this.colors.dev = d3
      .scaleOrdinal<string>()
      .domain(this.hier.devs)
      .range(d3.range(this.hier.devs.length).map(qp.MetaColors.DEVICE));
    this.colors.clus = d3
      .scaleOrdinal<string>()
      .domain(this.hier.clus)
      .range(_.map(d3.range(this.hier.clus.length), qp.MetaColors.CLUSTER));
    const m = this.hier.root.meta!;
    const mem = d3.max(m.nodes(), n => m.node(n)?.stats?.bytes)!;
    this.scales.mem = d3
      .scaleLinear<string, string>()
      .domain([0, mem])
      .range(PS.minMaxColors);
    const time = d3.max(m.nodes(), n => m.node(n)?.stats?.getMicros())!;
    this.scales.time = d3
      .scaleLinear<string, string>()
      .domain([0, time])
      .range(PS.minMaxColors);
    this.scales.width = this.hier.hasShape
      ? d3
          .scalePow()
          .exponent(qp.SCALE_EXP)
          .domain(qp.WIDTH_SCALE)
          .range([qp.MIN_E_WIDTH, qp.MAX_E_WIDTH])
          .clamp(true)
      : d3
          .scaleLinear()
          .domain([1, this.hier.maxEdgeSize])
          .range([qp.MIN_E_WIDTH, qp.MAX_E_WIDTH]);
  }

  getNdataByName(n?: string) {
    return n ? this.nds[n] : undefined;
  }

  getNodeByName(n?: string) {
    return this.hier.node(n);
  }

  getOrCreateRenderNodeByName(name: string): qg.Ndata | undefined {
    if (name in this.nds) return this.nds[name];
    const n = this.hier.node(name);
    if (!n) return undefined;
    const nd = qg.isClus(n) ? new qc.Nclus(n, this.hier.opts) : new qn.Ndata(n);
    this.nds[name] = nd;
    this.renderedOpNames.push(name);
    if (n.stats) {
      nd.color.mem = this.scales.mem(n.stats.bytes!);
      nd.color.time = this.scales.time(n.stats.getMicros()!);
    }
    nd.faded = this.displaying && !qu.displayable(n.stats!);
    let hd: qt.Histo | undefined;
    let hc: qt.Histo | undefined;
    let oc;
    if (qg.isClus(n)) {
      hd = n.histo.dev;
      hc = n.histo.clus;
      const cs = n.histo.comp.compats;
      const ics = n.histo.comp.incompats;
      if (cs != 0 || ics != 0) oc = cs / (cs + ics);
    } else {
      if (n.dev) hd = {[n.dev]: 1};
      if (n.clus) hd = {[n.clus]: 1};
      //if (d.node.type === qt.NdataT.OPER) {
      //  oc = (d.node as qg.Noper).compatible ? 1 : 0;
      //}
    }
    if (hd) nd.shade.dev = qu.shade(hd, this.colors.dev);
    if (hc) nd.shade.clus = qu.shade(hc, this.colors.clus);
    if (oc) {
      nd.shade.compat = [
        {color: qp.OperColors.COMPAT, perc: oc},
        {color: qp.OperColors.INCOMPAT, perc: 1 - oc}
      ];
    }
    return this.nds[name];
  }

  getNearestVisibleAncestor(name: string) {
    const path = qu.hierPath(name);
    let i = 0;
    let node: qg.Ndata | undefined;
    let n = name;
    for (; i < path.length; i++) {
      n = path[i];
      node = this.getNdataByName(n);
      if (!node?.expanded) break;
    }
    if (i == path.length - 2) {
      const next = path[i + 1];
      if (node?.annos.in.names[next]) return next;
      if (node?.annos.out.names[next]) return next;
    }
    return n;
  }

  setDepth(d: number) {
    this.root.setDepth(d);
  }

  isNodeAuxiliary(nd: qg.Ndata) {
    const p = this.getNdataByName(nd.parent?.name) as qc.Nclus;
    let found = _.find(p.isolated.in, n => {
      return n.name === nd.name;
    });
    if (found) return true;
    found = _.find(p.isolated.out, n => {
      return n.name === nd.name;
    });
    return !!found;
  }

  labelForLink(l: qg.Link) {
    const n = this.getNodeByName(l.nodes[0]) as qg.Noper;
    if (!n.shapes || _.isEmpty(n.shapes)) return undefined;
    const shape = n.shapes[+l.data!.out!];
    if (!shape) return undefined;
    if (shape.length === 0) return 'scalar';
    return shape.map(s => (s === -1 ? '?' : s)).join('x');
  }

  getLabelForEdge(e: qg.Emeta) {
    if (this.labelFn) return this.labelFn(e, this);
    const isMulti = e.links.length > 1;
    return isMulti
      ? e.links.length + ' tensors'
      : this.labelForLink(e.links[0]);
  }

  getNamesOfRenderedOps(): string[] {
    return this.renderedOpNames;
  }

  expandUntilNodeIsShown(e: qs.Elem, name: string) {
    const ns = name.split('/');
    const m = ns[ns.length - 1].match(/(.*):\w+/);
    if (m?.length === 2) ns[ns.length - 1] = m[1];
    let n = ns[0];
    let nd = this.getNdataByName(n)!;
    for (let i = 1; i < ns.length; i++) {
      if (nd.type === qt.NdataT.OPER) break;
      this.buildSubhier(n);
      nd.expanded = true;
      e.setNodeExpanded(nd);
      n += '/' + ns[i];
      nd = this.getNdataByName(n)!;
    }
    return nd.name;
  }

  _getAllContainedOpNodes(name: string) {
    let os = [] as qg.Noper[];
    const n = this.getNodeByName(name);
    if (qg.isOper(n)) return [n].concat(n.embeds.in as qg.Noper[]);
    const ns = n?.meta!.nodes();
    ns?.forEach(n => {
      os = os.concat(this._getAllContainedOpNodes(n));
    });
    return os;
  }

  getVisibleParent(nd?: qg.Ndata) {
    let p = nd;
    let found = false;
    while (!found) {
      nd = p;
      p = nd?.parent;
      if (!p) {
        found = true;
      } else {
        const n = this.getNdataByName(p.name);
        if (n && (n.expanded || qg.isOper(p))) found = true;
      }
    }
    return nd;
  }

  findVisibleParents(ns: string[]) {
    const ps = {} as qt.Dict<qg.Ndata>;
    ns.forEach(n => {
      const nd = this.getNodeByName(n);
      const p = this.getVisibleParent(nd);
      if (p) ps[p.name] = p;
    });
    return ps;
  }

  traceAllInputsOfOpNode(root: SVGElement, n: qg.Noper, ns: qt.Dict<any>) {
    if (ns[n.name]) return ns;
    else ns[n.name] = true;
    const ins = n.ins;
    const p = this.getVisibleParent(n)!;
    d3.select(root)
      .select(`.node[data-name="${p.name}"]`)
      .classed('input-highlight', true);
    const vins = {} as qt.Dict<VisibleParent>;
    ins.forEach(i => {
      let nd = this.getNodeByName(i.name);
      if (!nd) return;
      if (qg.isMeta(nd)) nd = this.getNodeByName(qu.strictName(nd.name));
      if (qg.isOper(nd)) {
        const vp = this.getVisibleParent(nd)!;
        const v = vins[vp.name];
        if (v) v.ops.push(nd);
        else vins[vp.name] = {parent: vp, ops: [nd]};
      }
    });
    const starts = {} as qt.Dict<any>;
    const nds = [p];
    starts[p.name] = {idx: 0, ends: [], traced: false};
    let nd: qg.Ndata | undefined = p;
    for (let idx = 1; nd && nd.name !== qp.ROOT; idx++) {
      nd = nd.parent;
      if (nd) {
        starts[nd.name] = {idx, ends: [], traced: false};
        nds[idx] = nd;
      }
    }
    _.forOwn(vins, vi => {
      const nd = vi.parent;
      vi.ops.forEach(o => {
        ns = this.traceAllInputsOfOpNode(root, o, ns);
      });
      if (nd.name !== p?.name) createTrace(root, nd, starts, nds);
    });
    return ns;
  }

  updateInputTrace(root: SVGElement, n: string, trace: boolean) {
    const r = d3.select(root);
    r.selectAll('.input-highlight').classed('input-highlight', false);
    r.selectAll('.non-input').classed('non-input', false);
    r.selectAll('.input-parent').classed('input-parent', false);
    r.selectAll('.input-child').classed('input-child', false);
    r.selectAll('.input-edge-highlight').classed('input-edge-highlight', false);
    r.selectAll('.non-input-edge-highlight').classed(
      'non-input-edge-highlight',
      false
    );
    r.selectAll('.input-highlight-selected').classed(
      'input-highlight-selected',
      false
    );
    if (!trace || !n) return;
    const os = this._getAllContainedOpNodes(n);
    let ns = {};
    os.forEach(o => {
      ns = this.traceAllInputsOfOpNode(root, o, ns);
    });
    const hs = _.keys(ns);
    const vs = this.findVisibleParents(hs);
    markParents(root, vs);
    r.selectAll<SVGElement, qg.Ndata>(
      'g.node:not(.selected):not(.input-highlight)' +
        ':not(.input-parent):not(.input-children)'
    )
      .classed('non-input', true)
      .each(d => {
        r.selectAll(`[data-name="${d.name}"]`).classed('non-input', true);
      });
    r.selectAll('g.edge:not(.input-edge-highlight)').classed(
      'non-input-edge-highlight',
      true
    );
  }
}

interface VisibleParent {
  parent: qg.Ndata;
  ops: qg.Noper[];
}

function markParents(root: SVGElement, nds: qt.Dict<qg.Ndata>) {
  _.forOwn(nds, (nd?: qg.Ndata) => {
    while (nd && nd.name !== qp.ROOT) {
      const s = d3.select(root).select(`.node[data-name="${nd.name}"]`);
      if (
        s.nodes().length &&
        !s.classed('input-highlight') &&
        !s.classed('selected') &&
        !s.classed('op')
      ) {
        s.classed('input-parent', true);
      }
      nd = nd.parent;
    }
  });
}

function createTrace(
  root: SVGElement,
  nd: qg.Ndata,
  starts: qt.Dict<any>,
  nds: qg.Ndata[]
) {
  const pairs = [] as [qg.Ndata, qg.Ndata][];
  let n: qg.Ndata | undefined = nd;
  let prev = n;
  while (n && !starts[n.name]) {
    if (prev?.name !== n.name) pairs.push([prev, n]);
    prev = n;
    n = n?.parent;
  }
  const s = starts[nd.name].idx;
  const sn = nds[Math.max(s - 1, 0)].name;
  const r = d3.select(root);
  r.selectAll(`[data-edge="${prev.name}--${sn}"]`).classed(
    'input-edge-highlight',
    true
  );
  pairs.forEach(([i, o]) => {
    const sel = `[data-edge="${i.name}--${sn}` + `~~${o.name}~~OUT"]`;
    r.selectAll(sel).classed('input-edge-highlight', true);
  });
  for (let j = 1; j < s; j++) {
    const [i, o] = [nds[j - 1], nds[j]];
    const sel = `[data-edge="${prev.name}~~${o.name}` + `~~IN--${i.name}"]`;
    r.selectAll(sel).classed('input-edge-highlight', true);
  }
}
