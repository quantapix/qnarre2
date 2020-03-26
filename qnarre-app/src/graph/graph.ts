import * as qt from './types';
import * as qu from './utils';

export interface Opts {
  isCompound?: boolean;
  isDirected?: boolean;
  isMultiple?: boolean;
}

export class Link<E> implements qt.Named {
  readonly nodes: string[];
  readonly edge: string;
  data?: E;

  constructor(x: any[], opts?: Opts) {
    const [p, s] = [/:/g, '\\:'];
    this.nodes = [String(x[0]).replace(p, s), String(x[1]).replace(p, s)];
    const [n0, n1] = this.nodes;
    if (!opts?.isDirected && n0 > n1) this.nodes = [n1, n0];
    this.edge = this.nodes.join(':');
    if (x.length > 2 && x[2] !== undefined) {
      const n = String(x[2]).replace(p, s);
      this.nodes = [...this.nodes, n];
      if (opts?.isMultiple) this.edge += ':' + n;
    }
  }

  get name() {
    return this.edge;
  }
}

export class Nodes<N> extends Map<string, N | undefined> {}
export class Edges<E> extends Map<string, Link<E>> {}

const ROOT = '';

export class Graph<G, N, E> {
  readonly isCompound: boolean;
  readonly isDirected: boolean;
  readonly isMultiple: boolean;

  private _data?: G;

  private _nodes = new Nodes<N>();
  private _edges = new Edges<E>();

  private _ins = new Map<string, Set<Link<E>>>();
  private _outs = new Map<string, Set<Link<E>>>();

  private _preds = new Map<string, Map<string, number>>();
  private _succs = new Map<string, Map<string, number>>();

  private _parents = new Map<string, string>();
  private _children = new Map<string, Set<string>>();

  private _defNode = (_: string): N | undefined => undefined;
  private _defEdge = (_: Link<E>): E | undefined => undefined;

  constructor({isCompound = false, isDirected = true, isMultiple = false}) {
    this.isCompound = isCompound;
    this.isDirected = isDirected;
    this.isMultiple = isMultiple;
    if (isCompound) {
      this._children.set(ROOT, new Set<string>());
    }
  }

  get data() {
    return this._data;
  }

  setData(d?: G) {
    if (d) this._data = d;
    return this;
  }

  setDefNode(f: N | ((_: string) => N | undefined)) {
    if (typeof f === 'function') {
      this._defNode = f as (_: string) => N | undefined;
    } else {
      this._defNode = (_: string) => f;
    }
    return this;
  }

  setDefEdge(f: E | ((_: Link<E>) => E | undefined)) {
    if (typeof f === 'function') {
      this._defEdge = f as (_: Link<E>) => E | undefined;
    } else {
      this._defEdge = (_: Link<E>) => f;
    }
    return this;
  }

  get nodeCount() {
    return this._nodes.size;
  }

  get edgeCount() {
    return this._edges.size;
  }

  nodes() {
    return Array.from(this._nodes.keys());
  }

  edges() {
    return Array.from(this._edges.keys());
  }

  links() {
    return Array.from(this._edges.values());
  }

  hasNode(x: any) {
    return this._nodes.has(String(x));
  }

  edgeFor(x: string | Link<E> | any[]) {
    return typeof x === 'string'
      ? x
      : new Link(Array.isArray(x) ? x : x.nodes, this).edge;
  }

  hasEdge(x: string | Link<E> | any[]) {
    return this._edges.has(this.edgeFor(x));
  }

  node(x: any) {
    return this._nodes.get(String(x));
  }

  link(x: string | Link<E> | any[]) {
    return this._edges.get(this.edgeFor(x));
  }

  edge(x: string | Link<E> | any[]) {
    return this.link(x)?.data;
  }

  path(xs: any[]) {
    const es = [] as (string | undefined)[];
    xs.reduce((x1, x2) => {
      es.push(this.link([x1, x2])?.edge);
      return x2;
    });
    return es;
  }

  setNode(x: any, d?: N | null) {
    const n = String(x);
    const setIt = () => {
      const nd = d ?? this._defNode(n);
      if (qt.isNamed(nd)) nd.name = nd.name ?? n;
      this._nodes.set(n, nd);
    };
    if (this._nodes.has(n)) {
      if (d !== undefined) setIt();
      return this;
    }
    setIt();
    this._ins.set(n, new Set<Link<E>>());
    this._outs.set(n, new Set<Link<E>>());
    this._preds.set(n, new Map<string, number>());
    this._succs.set(n, new Map<string, number>());
    if (this.isCompound) {
      this._parents.set(n, ROOT);
      this._children.get(ROOT)!.add(n);
      this._children.set(n, new Set<string>());
    }
    return this;
  }

  setEdge(x: string | Link<E> | any[], d?: E | null) {
    const l =
      typeof x === 'string'
        ? undefined
        : new Link<E>(Array.isArray(x) ? x : x.nodes, this);
    const e = typeof x === 'string' ? x : l!.edge;
    const setIt = (l: Link<E>) => {
      const ed = d ?? this._defEdge(l);
      if (ed || l.data) {
        if (qt.isNamed(ed)) ed.name = ed.name ?? l.name;
        l.data = ed;
      }
    };
    if (this._edges.has(e)) {
      if (d !== undefined) setIt(this.link(e)!);
      return this;
    }
    qu.assert(l !== undefined);
    qu.assert(l.nodes.length < 3 || this.isMultiple);
    setIt(l);
    const [n0, n1] = l.nodes;
    this.setNode(n0).setNode(n1);
    this._edges.set(e, l);
    this._ins.get(n1)!.add(l);
    this._outs.get(n0)!.add(l);
    initOrInc(this._preds.get(n1)!, n0);
    initOrInc(this._succs.get(n0)!, n1);
    return this;
  }

  setNodes(xs: any[], d?: N) {
    xs.forEach(x => this.setNode(x, d));
    return this;
  }

  setEdges(xs: (string | Link<E> | any[])[], d?: E) {
    xs.forEach(x => this.setEdge(x, d));
    return this;
  }

  setPath(xs: any[], d?: E) {
    xs.reduce((x1, x2) => {
      this.setEdge([x1, x2], d);
      return x2;
    });
    return this;
  }

  delNode(x: any) {
    const n = String(x);
    if (this._nodes.has(n)) {
      this._nodes.delete(n);
      const delIt = (l: Link<E>) => this.delEdge(l.edge);
      this._ins.get(n)!.forEach(delIt, this);
      this._ins.delete(n);
      this._preds.delete(n);
      this._outs.get(n)!.forEach(delIt, this);
      this._outs.delete(n);
      this._succs.delete(n);
      if (this.isCompound) {
        this.delFromParentsChildren(n);
        this._parents.delete(n);
        this._children.get(n)?.forEach(c => this.setParent(c));
        this._children.delete(n);
      }
    }
    return this;
  }

  delEdge(x: string | Link<E> | any[]) {
    const e = this.edgeFor(x);
    if (this._edges.has(e)) {
      const l = this._edges.get(e)!;
      this._edges.delete(e);
      const [n1, n2] = l.nodes;
      this._ins.get(n2)!.delete(l);
      this._outs.get(n1)!.delete(l);
      decOrDel(this._preds.get(n2)!, n1);
      decOrDel(this._succs.get(n1)!, n2);
    }
    return this;
  }

  parent(x: any) {
    const p = this._parents.get(String(x));
    return p ? p : undefined;
  }

  setParent(x: any, y?: any) {
    qu.assert(this.isCompound);
    const n = String(x);
    let parent = y ? String(y) : undefined;
    for (let p = parent; p; p = this.parent(p)) {
      if (p === n) throw new Error(`Cycle between ${parent} and ${n}`);
    }
    if (parent) {
      this.setNode(parent);
    } else {
      parent = ROOT;
    }
    this.setNode(n);
    this.delFromParentsChildren(n);
    this._parents.set(n, parent);
    this._children.get(parent)!.add(n);
    return this;
  }

  delFromParentsChildren(n: string) {
    const p = this._parents.get(n);
    if (p !== undefined) this._children.get(p)!.delete(n);
    return this;
  }

  children(x?: any) {
    const n = x === undefined ? ROOT : String(x);
    if (n === ROOT && !this.isCompound) return this.nodes();
    const cs = this._children.get(n);
    return cs ? Array.from(cs) : this.hasNode(n) ? [] : undefined;
  }

  sources() {
    return this.nodes().filter(n => this._ins.get(n)!.size === 0, this);
  }

  sinks() {
    return this.nodes().filter(n => this._outs.get(n)!.size === 0, this);
  }

  preds(x: any) {
    const n = this._preds.get(String(x));
    return n === undefined ? undefined : Array.from(n.keys());
  }

  succs(x: any) {
    const n = this._succs.get(String(x));
    return n === undefined ? undefined : Array.from(n.keys());
  }

  neighbors(x: any) {
    if (this.hasNode(x)) {
      const ns = [...this.preds(x)!, ...this.succs(x)!];
      return Array.from(new Set<string>(ns));
    }
    return undefined;
  }

  degrees() {
    return this.nodes()
      .map(n => this.neighbors(n)?.length)
      .sort();
  }

  isSimilar(other: this) {
    const d1 = this.degrees();
    const d2 = other.degrees();
    for (let i = 0; i < d1.length; i++) {
      if (d1[i] !== d2[i]) return false;
    }
    return true;
  }

  isSubgraph(x: any) {
    return !!this.children(x)?.length;
  }

  isLeaf(x: any) {
    if (this.hasNode(x)) {
      if (this.isDirected) return this.succs(x)!.length === 0;
      return this.neighbors(x)!.length === 0;
    }
    return undefined;
  }

  filterNodes(fn: (n: string) => boolean) {
    const r = new Graph(this);
    r.setData(this.data);
    this._nodes.forEach((d, n) => {
      if (fn(n)) r.setNode(n, d);
    });
    this._edges.forEach((l, _) => {
      if (r.hasNode(l.nodes[0]) && r.hasNode(l.nodes[1])) {
        r.setEdge(l, l.data);
      }
    });
    if (this.isCompound) {
      const ps = new Map<string, string | undefined>();
      const getParent = (c: string): string | undefined => {
        const p = this.parent(c);
        if (p === undefined || r.hasNode(p)) {
          ps.set(c, p);
          return p;
        } else if (p in ps) {
          return ps.get(p);
        } else {
          return getParent(p);
        }
      };
      r.nodes().forEach(n => r.setParent(n, getParent(n)));
    }
    return r;
  }

  inLinks(x1: any, x0?: any) {
    const n1 = String(x1);
    const ins = this._ins.get(n1);
    if (ins) {
      const ls = Array.from(ins);
      if (x0 !== undefined) {
        const n0 = String(x0);
        return ls.filter(l => l.nodes[0] === n0);
      }
      return ls;
    }
    return undefined;
  }

  outLinks(x0: any, x1?: any) {
    const n0 = String(x0);
    const outs = this._outs.get(n0);
    if (outs) {
      const ls = Array.from(outs);
      if (x1 !== undefined) {
        const n1 = String(x1);
        return ls.filter(l => l.nodes[1] === n1);
      }
      return ls;
    }
    return undefined;
  }

  nodeLinks(x0: any, x1?: any) {
    const ins = this.inLinks(x0, x1);
    const outs = this.outLinks(x0, x1);
    if (ins === undefined) return outs;
    if (outs === undefined) return ins;
    return ins.concat(outs);
  }

  components() {
    const cs = [] as string[][];
    const done = new Set<string>();
    let ns: string[];
    const walk = (n: string) => {
      if (!done.has(n)) {
        done.add(n);
        ns.push(n);
        this.succs(n)?.forEach(walk);
        this.preds(n)?.forEach(walk);
      }
    };
    this.nodes().forEach(n => {
      ns = [] as string[];
      walk(n);
      if (ns.length) cs.push(ns);
    });
    return cs;
  }
}

function initOrInc(m: Map<string, number>, n: string) {
  let v = m.get(n);
  v = v ? v + 1 : 1;
  m.set(n, v);
}

function decOrDel(m: Map<string, number>, n: string) {
  const v = m.get(n)! - 1;
  if (v) {
    m.set(n, v);
  } else {
    m.delete(n);
  }
}
