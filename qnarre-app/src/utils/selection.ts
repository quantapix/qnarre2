import * as qg from './groups';

export type Selem = Element | EnterElement | Document | Window | null;

export interface BaseEvent {
  type: string;
  sourceEvent?: any;
}

export interface EnterElement {
  ownerDocument: Document;
  namespaceURI: string;
  appendChild(newChild: Node): Node;
  insertBefore(newChild: Node, refChild: Node): Node;
  querySelector(selectors: string): Element;
  querySelectorAll(selectors: string): NodeListOf<Element>;
}

export type Celem = HTMLElement | SVGSVGElement | SVGGElement;

export interface ClientPointEvent {
  clientX: number;
  clientY: number;
}

export interface CustomEventParams {
  cancelable: boolean;
  bubbles: boolean;
  detail: any;
}

export interface TransitionLike<G extends Selem, D> {
  selection(): Selection<G, D, any, any>;
  on(type: string, listener: null): TransitionLike<G, D>;
  on(type: string, listener: qg.Op<G, D, void>): TransitionLike<G, D>;
  tween(name: string, fn: null): TransitionLike<G, D>;
  tween(
    name: string,
    fn: qg.Op<G, D, (t: number) => void>
  ): TransitionLike<G, D>;
}

export const root = [null];

export type SelectionFn = () => Selection<HTMLElement, any, null, undefined>;
export const selection: SelectionFn = () =>
  new Selection([[document.documentElement]], root);

export function select<G extends Selem, Od>(
  s: string
): Selection<G, Od, HTMLElement, any>;
export function select<G extends Selem, Od>(
  s: G
): Selection<G, Od, null, undefined> {
  return typeof s === 'string'
    ? new Selection([[document.querySelector(s)]], [document.documentElement])
    : new Selection([[s]], root);
}

export function selectAll(): Selection<null, undefined, null, undefined>;
export function selectAll(
  sel: null
): Selection<null, undefined, null, undefined>;
export function selectAll(
  sel: undefined
): Selection<null, undefined, null, undefined>;
export function selectAll<G extends Selem, Od>(
  sel: string
): Selection<G, Od, HTMLElement, any>;
export function selectAll<G extends Selem, Od>(
  sel: G[]
): Selection<G, Od, null, undefined>;
export function selectAll<G extends Selem, Od>(
  sel: ArrayLike<G>
): Selection<G, Od, null, undefined> {
  return typeof sel === 'string'
    ? new Selection(
        [document.querySelectorAll(sel)],
        [document.documentElement]
      )
    : new Selection([sel == null ? [] : sel], root);
}

export class Selection<
  G extends Selem,
  D,
  P extends Selem,
  Pd
> extends qg.Selection<G, D, P, Pd> {
  _enter: any;
  _exit: any;

  constructor(groups: G[][], parents: P[]) {
    super(groups, parents);
  }


  append<K extends keyof ElementTagNameMap>(
    name: K
  ): Selection<ElementTagNameMap[K], D, P, Pd> {
    return super.append(name);
  }

  insert<K extends keyof ElementTagNameMap>(
    name: K,
    before?: string | Op<T, D, ElementTagNameMap[K]>
  ): Selection<ElementTagNameMap[K], D, P, Pd>;

  join<K extends keyof ElementTagNameMap, Od = D>(
    one: K,
    onu?: (e: Selection<G, D, P, Pd>) => Selection<G, D, P, Pd> | undefined,
    onx?: (e: Selection<G, Od, P, Pd>) => void
  ): Selection<G | ElementTagNameMap[K], D, P, Pd>;

  on(typename: string): qg.Op<G, D, void> | undefined;
  on(typename: string, value: null): this;
  on(typename: string, value: qg.Op<G, D, void>, capture?: boolean) {
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
}

create<K extends keyof ElementTagNameMap>(
  name: K
): Selection<ElementTagNameMap[K], undefined, null, undefined> {}
export function creator<K extends keyof ElementTagNameMap>(
  name: K
): (this: Element) => Element;
create<NewG extends Element>(
  name: string
): Selection<NewG, undefined, null, undefined> {
  return select(creator(name).call(document.documentElement));
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

export function create<K extends keyof ElementTagNameMap>(
  name: K
): Selection<ElementTagNameMap[K], undefined, null, undefined>;
export function create<NewG extends Element>(
  name: string
): Selection<NewG, undefined, null, undefined> {
  return select(creator(name).call(document.documentElement));
}

export function creator<K extends keyof ElementTagNameMap>(
  name: K
): (this: Element) => Element;
export function creator(name: string): (this: Element) => Element {
  const ns = namespace(name) as any;
  function i(this: Element) {
    const d = this.ownerDocument!;
    const uri = this.namespaceURI;
    return uri === xhtml && d.documentElement.namespaceURI === xhtml
      ? d.createElement(ns)
      : d.createElementNS(uri, ns);
  }
  function f(this: Element) {
    return this.ownerDocument!.createElementNS(ns.space, ns.local);
  }
  return ns.local ? f : i;
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

export function selector<E extends Element>(s: string): (this: Selem) => E {
  return s == null ? () => {} : () => this.querySelector(s);
}

export function selectorAll<E extends Element>(
  s: string
): (this: Selem) => NodeListOf<E> {
  return s == null ? () => [] : () => this.querySelectorAll(s);
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
