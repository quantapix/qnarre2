import * as _ from 'lodash';
import {ok} from 'assert';

import * as qt from './types';

export function assert(cond: any, msg?: string): asserts cond {
  ok(cond, msg);
}

export function canonicalize(d: qt.Dict<any>) {
  //const r = {} as qt.Dict<any>;
  //d.forEach((v: any, k: string) => (r[k.toLowerCase()] = v));
  return d;
}

export function applyMixins(derived: any, bases: any[]) {
  bases.forEach((b: any) => {
    Object.getOwnPropertyNames(b.prototype).forEach(n => {
      Object.defineProperty(
        derived.prototype,
        n,
        Object.getOwnPropertyDescriptor(b.prototype, n)!
      );
    });
  });
}

export function cloneMixins(target: any, opts: any) {
  const c = Object.getPrototypeOf(target).constructor;
  return Object.create(
    Object.getPrototypeOf(target),
    Object.getOwnPropertyDescriptors(new c(opts))
  );
}

export function sorter(x: any, y: any) {
  return x < y ? -1 : 1;
}

export function range(start: number, stop = start, step = 1) {
  start = start === stop ? 0 : start;
  return Array.from(
    {length: (stop - start) / step},
    (_, i) => start + i * step
  );
}

export function partition<T>(es: T[], fn: (_: T) => boolean) {
  const r = {lhs: new Array<T>(), rhs: new Array<T>()};
  es.forEach(e => {
    if (fn(e)) {
      r.lhs.push(e);
    } else {
      r.rhs.push(e);
    }
  });
  return r;
}

export namespace Point {
  export function add(t: qt.Point, p: qt.Point) {
    t.x += p.x;
    t.y += p.y;
  }

  export function subtract(t: qt.Point, p: qt.Point) {
    t.x -= p.x;
    t.y -= p.y;
  }

  export function colinear(ps: qt.Point[]) {
    let a = angle(ps[0], ps[1]);
    for (let i = 1; i < ps.length - 1; i++) {
      const b = angle(ps[i], ps[i + 1]);
      if (Math.abs(b - a) > 1) return false;
      a = b;
    }
    return true;
  }

  function angle(a: qt.Point, b: qt.Point) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return (180 * Math.atan(dy / dx)) / Math.PI;
  }
}

export function intersectRect(t: qt.Rect, p: qt.Point, raise = true) {
  const x = t.x;
  const y = t.y;
  const dx = p.x - x;
  const dy = p.y - y;
  let w = t.w / 2;
  let h = t.h / 2;
  if (raise && !dx && !dy) throw new Error('No intersection with rect');
  let sx: number, sy: number;
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    if (dy < 0) h = -h;
    sx = dy === 0 ? 0 : (h * dx) / dy;
    sy = h;
  } else {
    if (dx < 0) w = -w;
    sx = w;
    sy = dx === 0 ? 0 : (w * dy) / dx;
  }
  return {x: x + sx, y: y + sy} as qt.Point;
}

export function intersectEllipse(t: qt.Rect, r: qt.Radius, p: qt.Point) {
  const cx = t.x;
  const cy = t.y;
  const px = cx - p.x;
  const py = cy - p.y;
  const det = Math.sqrt(r.rx * r.rx * py * py + r.ry * r.ry * px * px);
  let dx = Math.abs((r.rx * r.ry * px) / det);
  if (p.x < cx) dx = -dx;
  let dy = Math.abs((r.rx * r.ry * py) / det);
  if (p.y < cy) dy = -dy;
  return {x: cx + dx, y: cy + dy};
}

export function intersectCircle(t: qt.Rect, r: number, p: qt.Point) {
  return intersectEllipse(t, {rx: r, ry: r} as qt.Radius, p);
}

export function intersectPolygon(t: qt.Rect, ps: qt.Point[], p: qt.Point) {
  const x1 = t.x;
  const y1 = t.y;
  const xs = [];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  ps.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
  });
  const left = x1 - t.w / 2 - minX;
  const top = y1 - t.h / 2 - minY;
  for (let i = 0; i < ps.length; i++) {
    const p1 = ps[i];
    const p2 = ps[i < ps.length - 1 ? i + 1 : 0];
    const x = intersectLine(
      t,
      p,
      {x: left + p1.x, y: top + p1.y} as qt.Point,
      {x: left + p2.x, y: top + p2.y} as qt.Point
    );
    if (x) xs.push(x);
  }
  if (!xs.length) {
    console.log('No intersection found, using center', t);
    return t;
  }
  if (xs.length > 1) {
    xs.sort((p1, p2) => {
      const x1 = p1.x - p.x;
      const y1 = p1.y - p.y;
      const d1 = Math.sqrt(x1 * x1 + y1 * y1);
      const x2 = p2.x - p.x;
      const y2 = p2.y - p.y;
      const d2 = Math.sqrt(x2 * x2 + y2 * y2);
      return d1 < d2 ? -1 : d1 === d2 ? 0 : 1;
    });
  }
  return xs[0];
}

function intersectLine(p1: qt.Point, p2: qt.Point, q1: qt.Point, q2: qt.Point) {
  const a1 = p2.y - p1.y;
  const b1 = p1.x - p2.x;
  const c1 = p2.x * p1.y - p1.x * p2.y;
  const r3 = a1 * q1.x + b1 * q1.y + c1;
  const r4 = a1 * q2.x + b1 * q2.y + c1;
  if (r3 !== 0 && r4 !== 0 && sameSign(r3, r4)) return;
  const a2 = q2.y - q1.y;
  const b2 = q1.x - q2.x;
  const c2 = q2.x * q1.y - q1.x * q2.y;
  const r1 = a2 * p1.x + b2 * p1.y + c2;
  const r2 = a2 * p2.x + b2 * p2.y + c2;
  if (r1 !== 0 && r2 !== 0 && sameSign(r1, r2)) return;
  const denom = a1 * b2 - a2 * b1;
  if (denom === 0) return;
  const offset = Math.abs(denom / 2);
  let num = b1 * c2 - b2 * c1;
  const x = num < 0 ? (num - offset) / denom : (num + offset) / denom;
  num = a2 * c1 - a1 * c2;
  const y = num < 0 ? (num - offset) / denom : (num + offset) / denom;
  return {x: x, y: y} as qt.Point;
}

function sameSign(n1: number, n2: number) {
  return n1 * n2 > 0;
}

export function time<T>(name: string, fn: () => T) {
  const start = _.now();
  try {
    return fn();
  } finally {
    console.log(name + ' time: ' + (_.now() - start) + 'ms');
  }
}

export function notime<T>(_name: string, fn: () => T) {
  return fn();
}

interface Data {
  key: string;
  weight: number;
}

export class WeightedQueue {
  private ds = new Array<Data>();
  private idxs = new Map<string, number>();

  get size() {
    return this.ds.length;
  }

  keys() {
    return this.ds.map(d => d.key);
  }

  has(x: any) {
    return this.idxs.has(String(x));
  }

  weight(x: any) {
    const i = this.idxs.get(String(x));
    return i === undefined ? undefined : this.ds[i].weight;
  }

  min() {
    assert(this.size > 0);
    return this.ds[0].key;
  }

  add(x: any, w: number) {
    const k = String(x);
    if (this.idxs.has(k)) return false;
    const i = this.ds.length;
    this.idxs.set(k, i);
    this.ds.push({key: k, weight: w} as Data);
    this.reorder(i);
    return true;
  }

  remove() {
    this.swap(0, this.ds.length - 1);
    const d = this.ds.pop()!;
    this.idxs.delete(d.key);
    this.heapify(0);
    return d.key;
  }

  decrease(x: any, w: number) {
    const i = this.idxs.get(String(x))!;
    assert(w < this.ds[i].weight);
    this.ds[i].weight = w;
    this.reorder(i);
  }

  reorder(i: number) {
    const ds = this.ds;
    const w = ds[i].weight;
    while (i !== 0) {
      const j = i >> 1;
      if (ds[j].weight < w) break;
      this.swap(i, j);
      i = j;
    }
  }

  swap(i: number, j: number) {
    const ds = this.ds;
    const di = ds[i];
    const dj = ds[j];
    ds[i] = dj;
    ds[j] = di;
    this.idxs.set(dj.key, i);
    this.idxs.set(di.key, j);
  }

  heapify(i: number) {
    const ds = this.ds;
    const l = 2 * i;
    const r = l + 1;
    let j = i;
    if (l < ds.length) {
      j = ds[l].weight < ds[j].weight ? l : j;
      if (r < ds.length) j = ds[r].weight < ds[j].weight ? r : j;
      if (j !== i) {
        this.swap(i, j);
        this.heapify(j);
      }
    }
  }
}

export class List {
  private head = {} as any;

  constructor() {
    this.head._next = this.head._prev = this.head;
  }

  enqueue(e: any) {
    const h = this.head;
    if (e._prev && e._next) {
      this.unlink(e);
    }
    e._next = h._next;
    h._next!._prev = e;
    h._next = e;
    e._prev = h;
  }

  dequeue() {
    const h = this.head;
    const e = h._prev;
    if (e && e !== h) {
      this.unlink(e);
      return e;
    }
    return undefined;
  }

  unlink(e: any) {
    e._prev!._next = e._next;
    e._next!._prev = e._prev;
    delete e._next;
    delete e._prev;
  }

  toString() {
    const ss = [] as string[];
    const h = this.head;
    let e = h._prev;
    const filter = (k: string, v: any) => {
      if (k !== '_next' && k !== '_prev') return v;
    };
    while (e && e !== h) {
      ss.push(JSON.stringify(e, filter));
      e = e._prev;
    }
    return '[' + ss.join(', ') + ']';
  }
}
