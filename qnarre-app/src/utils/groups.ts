import * as qt from '../graph/core/types';

interface Proxy<D> {
  __data__: D;
}

export type Op<T, D, R> = (
  this: T,
  d: D,
  i: number,
  g: T[] | qt.ArrayLike<T>
) => R | undefined;

interface Target<D> extends Proxy<D> {
  [k: string]: any;
  textContent: qt.Scalar;
  innerHTML: string;
  parentNode?: any;
  nextSibling?: any;
  prevSibling?: any;
  style?: Style;
  cloneNode(d: boolean): this;
  compareDocumentPosition(t: Target<D>): number;
  getAttribute(n: string): string | undefined;
  getAttributeNS(s: string, l: string): string | undefined;
  matches(m: string): boolean;
  removeAttribute(n: string): void;
  removeAttributeNS(s: string, l: string): void;
  setAttribute(n: string, v: qt.Scalar): void;
  setAttributeNS(s: string, l: string, v: qt.Scalar): void;
}

interface Style {
  getPropertyValue(n: string): qt.Scalar;
  removeProperty(n: string): void;
  setProperty(n: string, v: qt.Scalar, p?: string): void;
}

export interface Etarget {
  ownerDocument: any;
  namespaceURI: string;
  appendChild(c: Node): Node;
  insertBefore(c: Node, ref: Node): Node;
  querySelector(s: string): any;
  querySelectorAll(s: string): NodeListOf<any>;
}

export class Selection<T extends Target<D>, D, P extends Proxy<Pd>, Pd> {
  enters: any;
  exits: any;

  constructor(public groups: T[][], public parents: P[]) {}

  creator<T2>(name: string): Op<T, D, T2> {
    const ns = namespace(name) as any;
    function i(this: T) {
      const d = this.ownerDocument!;
      const uri = this.namespaceURI;
      return uri === xhtml && d.documentElement.namespaceURI === xhtml
        ? d.createElement(ns)
        : d.createElementNS(uri, ns);
    }
    function f(this: T) {
      return this.ownerDocument!.createElementNS(ns.space, ns.local);
    }
    return ns.local ? f : i;
  }

  append<T2 extends Target<D>>(name: string): Selection<T2, D, P, Pd>;
  append<T2 extends Target<D>>(name: Op<T, D, T2> | string, ...args: any) {
    const c = typeof name === 'function' ? name : this.creator<T2>(name);
    function a(this: T) {
      return this.appendChild(c.apply(this, args));
    }
    return this.select<T2>(a as Op<T, D, T2>);
  }

  attr(name: string) {
    const n = this.node();
    const ns = namespace(name);
    return ns.local
      ? n?.getAttributeNS(ns.space, ns.local)
      : n?.getAttribute(name);
  }

  setAttr(name: string, val?: qt.Scalar): this;
  setAttr(name: string, val?: Op<T, D, qt.Scalar> | qt.Scalar, ...args: any) {
    const vf = val as Op<T, D, qt.Scalar>;
    const vs = val as qt.Scalar;
    const ns = namespace(name);
    function r(this: T) {
      this.removeAttribute(name);
    }
    function rNS(this: T) {
      this.removeAttributeNS(ns.space, ns.local);
    }
    function c(this: T) {
      this.setAttribute(name, vs);
    }
    function cNS(this: T) {
      this.setAttributeNS(ns.space, ns.local, vs);
    }
    function f(this: T) {
      const v = vf?.apply(this, args);
      if (v === undefined) this.removeAttribute(name);
      else this.setAttribute(name, v);
    }
    function fNS(this: T) {
      const v = vf.apply(this, args);
      if (v == undefined) this.removeAttributeNS(ns.space, ns.local);
      else this.setAttributeNS(ns.space, ns.local, v);
    }
    return this.each(
      val == undefined
        ? ns.local
          ? rNS
          : r
        : typeof val === 'function'
        ? ns.local
          ? fNS
          : f
        : ns.local
        ? cNS
        : c
    );
  }

  call(cb: (s: Selection<T, D, P, Pd>, ...args: any) => void, ...args: any) {
    cb.apply(this, args);
    return this;
  }

  classed(name: string) {
    const ns = classArray(name + '');
    const ls = classList(this.node());
    let i = -1;
    const n = ns.length;
    while (++i < n) if (!ls?.contains(ns[i])) return false;
    return true;
  }

  setClassed(name: string, val: boolean): this;
  setClassed(name: string, val: Op<T, D, boolean> | boolean, ...args: any) {
    const names = classArray(name + '');
    function a(node: T) {
      const list = classList(node);
      let i = -1;
      const n = names.length;
      while (++i < n) list?.add(names[i]);
    }
    function r(node: T) {
      const list = classList(node);
      let i = -1;
      const n = names.length;
      while (++i < n) list?.remove(names[i]);
    }
    function fn(this: T) {
      const vf = val as Op<T, D, boolean>;
      (vf.apply(this, args) ? a : r)(this);
    }
    function t(this: T) {
      a(this);
    }
    function f(this: T) {
      r(this);
    }
    return this.each(typeof val === 'function' ? fn : val ? t : f);
  }

  clone(deep?: boolean) {
    function s(this: T) {
      const c = this.cloneNode(false);
      const p = this.parentNode;
      return p ? p.insertBefore(c, this.nextSibling) : c;
    }
    function d(this: T) {
      const c = this.cloneNode(true);
      const p = this.parentNode;
      return p ? p.insertBefore(c, this.nextSibling) : c;
    }
    return this.select<T>(deep ? d : s);
  }

  data() {
    const ds = new Array<D>(this.size());
    let i = -1;
    function s(this: T, d: D) {
      ds[++i] = d;
    }
    this.each(s);
    return ds;
  }

  private bindIdx<D2>(
    p: P,
    g: (T | undefined)[],
    eg: any[],
    ug: any[],
    xg: any[],
    d: D2[]
  ) {
    const dn = d.length;
    for (let i = 0; i < dn; ++i) {
      const n = g[i];
      if (n) {
        n.__data__ = d[i] as any;
        ug[i] = n;
      } else {
        eg[i] = new EnterNode(p, d[i]);
      }
    }
    g.forEach((n, i) => {
      if (n) xg[i] = n;
    });
  }

  private bindKey<D2>(
    p: P,
    g: T[],
    eg: any[],
    ug: any[],
    xg: any[],
    d: D2[],
    key?: Op<T | P, D | D2, string>
  ) {
    const ns = {} as qt.Dict<T>;
    const ks = new Array<string>(g.length);
    g.forEach((n, i) => {
      if (n) {
        const k = '$' + key!.call(n, n.__data__, i, g);
        if (k in ns) xg[i] = n;
        else ns[k] = n;
        ks[i] = k;
      }
    });
    const dn = d.length;
    for (let i = 0; i < dn; ++i) {
      const k = '$' + key!.call(p, d[i], i, d);
      const n = ns[k];
      if (n) {
        ug[i] = n;
        n.__data__ = d[i] as any;
        delete ns[k];
      } else {
        eg[i] = new EnterNode(p, d[i]);
      }
    }
    g.forEach((n, i) => {
      if (n && ns[ks[i]] === n) xg[i] = n;
    });
  }

  setData<D2>(
    val: D2[],
    key?: Op<T | P, D | D2, string>
  ): Selection<Target<D2>, D2, P, Pd>;
  setData<D2>(val: Op<P, Pd, D2[]> | D2[], key?: Op<T | P, D | D2, string>) {
    const gs = this.groups;
    const m = gs.length;
    const u = new Array(m);
    const e = new Array(m);
    const x = new Array(m);
    const ps = this.parents;
    const vf: Op<P, Pd, D2[]> = typeof val === 'function' ? val : () => val;
    for (let j = 0; j < m; ++j) {
      const g = gs[j];
      const p = ps[j];
      const d = vf.call(p, p.__data__, j, ps) ?? ([] as D2[]);
      const n = d?.length ?? 0;
      const eg = (e[j] = new Array(n));
      const ug = (u[j] = new Array(n));
      const xg = (x[j] = new Array(g.length));
      if (key) this.bindKey(p, g, eg, ug, xg, d, key);
      else this.bindIdx(p, g, eg, ug, xg, d);
      for (let i0 = 0, i1 = 0, prev, next; i0 < n; ++i0) {
        if ((prev = eg[i0])) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = ug[i1]) && ++i1 < n);
          prev._next = next || undefined;
        }
      }
    }
    const r = new Selection<Target<D2>, D2, P, Pd>(u, ps);
    r.enters = e;
    r.exits = x;
    return r;
  }

  datum() {
    return this.node()?.__data__;
  }

  setDatum<D2>(val?: D2): this;
  setDatum<D2>(val?: Op<T, D, D2>) {
    this.setProperty('__data__', val);
    return this;
  }

  dispatch<Ps>(type: string, ps?: Ps | Op<T, D, Ps>, ...args: any) {
    function c(this: T) {
      return dispatchEvent(this, type, ps);
    }
    function f(this: T) {
      const pf = ps as Op<T, D, Ps>;
      return dispatchEvent(this, type, pf?.apply(this, args));
    }
    return this.each(typeof ps === 'function' ? f : c);
  }

  each(cb: Op<T, D, void>) {
    this.groups.forEach(g => {
      g.forEach((n, i) => {
        if (n) cb.call(n, n.__data__, i, g);
      });
    });
    return this;
  }

  empty() {
    return !this.node();
  }

  enter<T2 extends Etarget & Target<D>>() {
    return new Selection<T2, D, P, Pd>(
      this.enters || this.groups.map(g => new Array(g.length)),
      this.parents
    );
  }

  exit<D2>() {
    return new Selection<Target<D2>, D2, P, Pd>(
      this.exits || this.groups.map(g => new Array(g.length)),
      this.parents
    );
  }

  filter(match: string): Selection<T, D, P, Pd>;
  filter<F extends Target<D>>(match: string): Selection<F, D, P, Pd>;
  filter(match: Op<T, D, boolean> | string): Selection<T, D, P, Pd>;
  filter<F extends Target<D>>(match: Op<T, D, boolean> | string) {
    const gs = this.groups;
    const fs = new Array(gs.length);
    const mf: Op<T, D, boolean> =
      typeof match === 'function'
        ? match
        : function() {
            return this.matches(match);
          };
    gs.forEach((g, j) => {
      const f = (fs[j] = [] as T[]);
      g.forEach((n, i) => {
        if (n && mf.call(n, n.__data__, i, g)) f.push(n);
      });
    });
    return new Selection<F, D, P, Pd>(fs, this.parents);
  }

  html() {
    return this.node()?.innerHTML;
  }

  setHtml(val?: string): this;
  setHtml(val?: Op<T, D, string | undefined> | string, ...args: any) {
    function r(this: T) {
      this.innerHTML = '';
    }
    function c(this: T) {
      this.innerHTML = val as string;
    }
    function f(this: T) {
      const vf = val as Op<T, D, string | undefined>;
      const v = vf.apply(this, args);
      this.innerHTML = v ? v : '';
    }
    return this.each(val === undefined ? r : typeof val === 'function' ? f : c);
  }

  insert<T2 extends Target<D>>(
    name: string | Op<T, D, T2>,
    prior?: string | Op<T, D, T2>,
    ...args: any
  ) {
    const c = typeof name === 'function' ? name : this.creator<T2>(name);
    const s =
      prior === undefined
        ? () => null
        : typeof prior === 'function'
        ? prior
        : this.selector(prior);
    function i(this: T) {
      return this.insertBefore(
        c.apply(this, args),
        s.apply(this, args) || undefined
      );
    }
    return this.select<T2>(i as Op<T, D, T2>);
  }

  join<C extends Target<D>, D2 = D>(
    one: string,
    onu?: (e: Selection<T, D, P, Pd>) => Selection<T, D, P, Pd> | undefined,
    onx?: (e: Selection<Target<D2>, D2, P, Pd>) => void
  ): Selection<C | T, D, P, Pd>;
  join<C extends Target<D>, D2 = D>(
    one: (e: Selection<EnterElement, D, P, Pd>) => Selection<C, D, P, Pd>,
    onu?: (e: Selection<T, D, P, Pd>) => Selection<T, D, P, Pd> | undefined,
    onx?: (e: Selection<Target<D2>, D2, P, Pd>) => void
  ): Selection<C | T, D, P, Pd> {
    let e = this.enter();
    let u = this;
    const x = this.exit();
    e = typeof one === 'function' ? one(e) : e.append(one + '');
    if (onu) u = onu(u);
    if (onx) onx(x);
    else x.remove();
    return e && u ? e.merge(this).order() : u;
  }

  lower() {
    function f(this: T) {
      if (this.prevSibling) {
        this.parentNode.insertBefore(this, this.parentNode.firstChild);
      }
    }
    return this.each(f);
  }

  merge(sel: Selection<T, D, P, Pd>) {
    const gs = this.groups;
    const gs1 = sel.groups;
    const m0 = gs.length;
    const m1 = gs1.length;
    const m = Math.min(m0, m1);
    const merges = new Array(m0);
    let j = 0;
    for (; j < m; ++j) {
      const g = gs[j];
      const g1 = gs1[j];
      const merge = (merges[j] = new Array(g.length));
      g.forEach((n, i) => {
        if (n || g1[i]) merge[i] = n;
      });
    }
    for (; j < m0; ++j) {
      merges[j] = gs[j];
    }
    return new Selection<T, D, P, Pd>(merges, this.parents);
  }

  node(): T | undefined {
    const gs = this.groups;
    const m = gs.length;
    for (let j = 0; j < m; ++j) {
      const g = gs[j];
      const n = g.length;
      for (let i = 0; i < n; ++i) {
        const n = g[i];
        if (n) return n;
      }
    }
    return undefined;
  }

  nodes() {
    const ns = new Array<T>(this.size());
    let i = -1;
    this.each(function() {
      ns[++i] = this;
    });
    return ns;
  }

  on(typename: string): Op<G, D, void> | undefined;
  on(typename: string, value: null): this;
  on(typename: string, value: Op<G, D, void>, capture?: boolean) {
    function parseTypes(ts: string) {
      return ts
        .trim()
        .split(/^|\s+/)
        .map(type => {
          let name = '';
          const i = type.indexOf('.');
          if (i >= 0) {
            name = type.slice(i + 1);
            type = type.slice(0, i);
          }
          return {type, name};
        });
    }
    const ts = parseTypes(typename + '');
    const n = ts.length;
    if (arguments.length < 2) {
      const on = this.node()?.__on;
      if (on)
        on.forEach(o => {
          for (let i = 0; i < n; ++i) {
            const t = ts[i];
            if (t.type === o.type && t.name === o.name) return o.value;
          }
        });
      return;
    }
    if (capture == null) capture = false;
    function onRemove(tn) {
      const on = this.__on;
      if (!on) return;
      let i = -1;
      on.forEach(o => {
        if ((!tn.type || o.type === tn.type) && o.name === tn.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
        } else {
          on[++i] = o;
        }
      });
      if (++i) on.length = i;
      else delete this.__on;
    }
    function onAdd(tn) {
      // eslint-disable-next-line no-prototype-builtins
      const wrap = filterEvents.hasOwnProperty(tn.type)
        ? filterContextListener
        : contextListener;
      return function(d, i, group) {
        const on = this.__on;
        const listener = wrap(value, i, group);
        if (on)
          on.forEach(o => {
            if (o.type === tn.type && o.name === tn.name) {
              this.removeEventListener(o.type, o.listener, o.capture);
              o.listener = listener;
              o.capture = capture;
              this.addEventListener(o.type, o.listener, o.capture);
              o.value = value;
              return;
            }
          });
        this.addEventListener(tn.type, listener, capture);
        const type = tn.type;
        const name = tn.name;
        const o = {type, name, value, listener, capture};
        if (!on) this.__on = [o];
        else on.push(o);
      };
    }
    const on = value ? onAdd : onRemove;
    for (let i = 0; i < n; ++i) this.each(on(ts[i]));
    return this;
  }

  order() {
    const gs = this.groups;
    gs.forEach(g => {
      let i = g.length - 1;
      let next = g[i];
      for (; --i >= 0; ) {
        const n = g[i];
        if (n) {
          if (next && n.compareDocumentPosition(next) ^ 4)
            next.parentNode.insertBefore(n, next);
          next = n;
        }
      }
    });
    return this;
  }

  property(name: string): any;
  property<L>(name: Local<L> | string): L | undefined {
    return this.node()?.[String(name)];
  }

  setProperty(name: string, val?: any): this;
  setProperty(name: string, val?: Op<T, D, any>, ...args: any): this;
  setProperty<L>(name: Local<L> | string, val?: L): this;
  setProperty<L>(name: Local<L> | string, val?: Op<T, D, L>, ...args: any) {
    function r(this: T) {
      delete this[String(name)];
    }
    function c(this: T) {
      this[String(name)] = val as any;
    }
    function f(this: T) {
      const vf = val as Op<T, D, any>;
      const v = vf.apply(this, args);
      if (v === undefined) delete this[String(name)];
      else this[String(name)] = v;
    }
    return this.each(val === undefined ? r : typeof val === 'function' ? f : c);
  }

  raise() {
    return this.each(function(this: T) {
      if (this.nextSibling) this.parentNode.appendChild(this);
    });
  }

  remove() {
    return this.each(function(this: T) {
      const p = this.parentNode;
      if (p) p.removeChild(this);
    });
  }

  selector<T2>(s?: string): Op<T, D, T2> {
    function f(this: T) {
      return this.querySelector(s!);
    }
    return s ? f : () => null;
  }

  select<T2 extends Target<D>>(sel?: Op<T, D, T2>): Selection<T2, D, P, Pd>;
  select<T2 extends Target<D>>(sel?: string | Op<T, D, T2>) {
    const sf = typeof sel === 'function' ? sel : this.selector<T2>(sel);
    const gs = this.groups;
    const ss = new Array(gs.length);
    gs.forEach((g, j) => {
      const sg = (ss[j] = new Array(g.length));
      g.forEach((n, i) => {
        if (n) {
          const s = sf.call(n, n.__data__, i, g);
          if (s) {
            if ('__data__' in n) s.__data__ = n.__data__;
            sg[i] = s;
          }
        }
      });
    });
    return new Selection<T2, D, P, Pd>(ss, this.parents);
  }

  selectorAll<T2 extends Element>(s?: string): Op<T, D, NodeListOf<T2>> {
    function f(this: T) {
      return this.querySelectorAll(s!);
    }
    return s ? f : () => new NodeList();
  }

  selectAll<T2 extends Target<D>>(sel?: string): Selection<T2, D, T, D>;
  selectAll<T2 extends Target<D> & Element>(
    sel?: Op<T, D, NodeListOf<T2>> | string
  ) {
    const sf = typeof sel === 'function' ? sel : this.selectorAll<T2>(sel);
    const gs = this.groups;
    const ss = [] as (T2 | undefined)[][];
    const ps = [] as T[];
    gs.forEach(g => {
      g.forEach((n, i) => {
        if (n) {
          const r = sf.call(n, n.__data__, i, g);
          ss.push(r ? Array.from(r) : []);
          ps.push(n);
        }
      });
    });
    return new Selection<T2, D, T, D>(ss, ps);
  }

  size() {
    let s = 0;
    this.each(() => {
      ++s;
    });
    return s;
  }

  sort(cmp?: (a: D, b: D) => number) {
    if (!cmp) cmp = (a, b) => (a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN);
    function f(a: any, b: any) {
      return a && b ? cmp!(a.__data__, b.__data__) : !a - !b;
    }
    const gs = this.groups;
    const ss = new Array(gs.length);
    gs.forEach((g, j) => {
      const sg = (ss[j] = new Array(g.length));
      g.forEach((n, i) => {
        if (n) sg[i] = n;
      });
      sg.sort(f);
    });
    return new Selection(ss, this.parents).order();
  }

  style(name: string) {
    const n = this.node();
    if (n) {
      return (
        n.style?.getPropertyValue(name) ||
        n
          .defaultView()
          .getComputedStyle(n, null)
          .getPropertyValue(name)
      );
    }
    return undefined;
  }

  setStyle(name: string, val?: qt.Scalar, priority?: 'important'): this;
  setStyle(
    name: string,
    val?: Op<T, D, qt.Scalar | undefined> | qt.Scalar,
    priority?: 'important',
    ...args: any
  ) {
    priority == null ? '' : priority;
    function r(this: T) {
      this.style?.removeProperty(name);
    }
    function c(this: T) {
      const v = val as qt.Scalar;
      this.style = this.style ?? ({} as Style);
      this.style?.setProperty(name, v, priority);
    }
    function f(this: T) {
      const vf = val as Op<T, D, qt.Scalar | undefined>;
      const v = vf.apply(this, args);
      if (v == undefined) this.style?.removeProperty(name);
      else {
        this.style = this.style ?? ({} as Style);
        this.style?.setProperty(name, v, priority);
      }
    }
    return this.each(val === undefined ? r : typeof val === 'function' ? f : c);
  }

  text() {
    return this.node()?.textContent;
  }

  setText(val?: qt.Scalar): this;
  setText(val?: Op<T, D, qt.Scalar | undefined> | qt.Scalar, ...args: any) {
    function r(this: T) {
      this.textContent = '';
    }
    function c(this: T) {
      this.textContent = val as qt.Scalar;
    }
    function f(this: T) {
      const vf = val as Op<T, D, qt.Scalar | undefined>;
      const v = vf.apply(this, args);
      this.textContent = v === undefined ? '' : v;
    }
    return this.each(val === undefined ? r : typeof val === 'function' ? f : c);
  }
}

function classArray(s: string) {
  return s.trim().split(/^|\s+/);
}

function classList<D>(node?: Target<D>) {
  return node?.classList || node ? new ClassList(node) : undefined;
}

class ClassList<D> {
  names: string[];
  constructor(public node: Target<D>) {
    this.names = classArray(node.getAttribute('class') || '');
  }
  add(name: string) {
    const i = this.names.indexOf(name);
    if (i < 0) {
      this.names.push(name);
      this.node.setAttribute('class', this.names.join(' '));
    }
  }
  remove(name: string) {
    const i = this.names.indexOf(name);
    if (i >= 0) {
      this.names.splice(i, 1);
      this.node.setAttribute('class', this.names.join(' '));
    }
  }
  contains(name: string) {
    return this.names.includes(name);
  }
}

function dispatchEvent(node, type, params) {
  let window = defaultView(node),
    event = window.CustomEvent;
  if (typeof event === 'function') {
    event = new event(type, params);
  } else {
    event = window.document.createEvent('Event');
    if (params)
      event.initEvent(type, params.bubbles, params.cancelable),
        (event.detail = params.detail);
    else event.initEvent(type, false, false);
  }
  node.dispatchEvent(event);
}

export class EnterNode {
  ownerDocument: any;
  namespaceURI: any;
  _next: any = null;
  _parent: any;
  __data__: any;
  constructor(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }
  appendChild(child) {
    return this._parent.insertBefore(child, this._next);
  }
  insertBefore(child, next) {
    return this._parent.insertBefore(child, next);
  }
  querySelector(selector) {
    return this._parent.querySelector(selector);
  }
  querySelectorAll(selector) {
    return this._parent.querySelectorAll(selector);
  }
}

let filterEvents = {};

export const event: any = null;

if (typeof document !== 'undefined') {
  const element = document.documentElement;
  if (!('onmouseenter' in element)) {
    filterEvents = {mouseenter: 'mouseover', mouseleave: 'mouseout'};
  }
}

function filterContextListener(listener, index, group) {
  listener = contextListener(listener, index, group);
  return function(event) {
    const related = event.relatedTarget;
    if (
      !related ||
      (related !== this && !(related.compareDocumentPosition(this) & 8))
    ) {
      listener.call(this, event);
    }
  };
}

function contextListener(listener, index, group) {
  return function(event1) {
    const event0 = event; // Events can be reentrant (e.g., focus).
    event = event1;
    try {
      listener.call(this, this.__data__, index, group);
    } finally {
      event = event0;
    }
  };
}

export function customEvent<Context, Result>(
  event: BaseEvent,
  listener: (this: Context, ...args: any[]) => Result,
  that: Context,
  ...args: any[]
): Result {
  const event0 = event;
  event1.sourceEvent = event;
  event = event1;
  try {
    return listener.apply(that, args);
  } finally {
    event = event0;
  }
}

export function local<T>(): Local<T> {
  return new Local();
}

let nextId = 0;

export class Local<T> {
  _: string;
  constructor() {
    this._ = '@' + (++nextId).toString(36);
  }
  get(elem: any): T | undefined {
    const id = this._;
    while (!(id in elem)) if (!(elem = elem.parentNode)) return;
    return elem[id];
  }
  set(elem: any, v: T) {
    return (elem[this._] = v);
  }
  remove(elem: any): boolean {
    return this._ in elem && delete elem[this._];
  }
  toString(): string {
    return this._;
  }
}

export function mouse(c: Celem): [number, number] {
  let e = sourceEvent();
  if (e.changedTouches) e = e.changedTouches[0];
  return point(c, e);
}

export interface NamespaceLocalObject {
  name: string;
  space: string;
  local: string;
}

export function namespace(name: string) {
  let pre = (name += '');
  const i = pre.indexOf(':');
  pre = name.slice(0, i);
  if (i >= 0 && pre !== 'xmlns') name = name.slice(i + 1);
  // eslint-disable-next-line no-prototype-builtins
  return namespaces.hasOwnProperty(pre)
    ? ({space: namespaces[pre], local: name} as NamespaceLocalObject)
    : ({name} as NamespaceLocalObject);
}

export const xhtml = 'http://www.w3.org/1999/xhtml';

export interface NamespaceMap {
  [k: string]: string;
}

export const namespaces: NamespaceMap = {
  svg: 'http://www.w3.org/2000/svg',
  xhtml: xhtml,
  xlink: 'http://www.w3.org/1999/xlink',
  xml: 'http://www.w3.org/XML/1998/namespace',
  xmlns: 'http://www.w3.org/2000/xmlns/'
};

export function point(c: Celem, e: ClientPointEvent): [number, number] {
  const svg = (c as SVGElement).ownerSVGElement || c;
  if ('createSVGPoint' in svg) {
    let p = (svg as SVGSVGElement).createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    p = p.matrixTransform((c as SVGGElement).getScreenCTM()!.inverse());
    return [p.x, p.y];
  }
  const r = c.getBoundingClientRect();
  return [e.clientX - r.left - c.clientLeft, e.clientY - r.top - c.clientTop];
}

export function sourceEvent() {
  let e = event;
  let s;
  while ((s = e.sourceEvent)) e = s;
  return e;
}

export function touch(c: Celem, id: number);
export function touch(c: Celem, ts: TouchList, id: number) {
  if (arguments.length < 3) {
    id = ts;
    ts = sourceEvent().changedTouches;
  }
  const n = ts ? ts.length : 0;
  for (let i = 0; i < n; ++i) {
    const t = ts[i];
    if (t.identifier === id) return point(c, t);
  }
  return null;
}

export function touches(c: Celem, ts?: TouchList) {
  if (!ts) ts = sourceEvent().touches;
  const n = ts ? ts.length : 0;
  const ps = new Array<[number, number]>(n);
  for (let i = 0; i < n; ++i) {
    ps[i] = point(c, ts![i]);
  }
  return ps;
}

export function window(n: Window | Document | Element) {
  return (
    ((n as Node).ownerDocument && (n as Node).ownerDocument?.defaultView) ||
    ((n as Window).document && n) ||
    (n as Document).defaultView
  );
}
