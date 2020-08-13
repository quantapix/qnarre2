export type AnyFunction = (...args: never[]) => void;
export type AnyConstructor = new (...args: unknown[]) => unknown;
export function fail(m?: string, mark?: AnyFunction): never {
  debugger;
  const e = new Error(m ? `Failure. ${m}` : 'Failure.');
  Error.captureStackTrace(e, mark || fail);
  throw e;
}
export const enum AssertionLevel {
  None = 0,
  Normal = 1,
  Aggressive = 2,
  VeryAggressive = 3,
}
export function assert(cond: unknown, m?: string, info?: string | (() => string), mark?: AnyFunction): asserts cond {
  if (!cond) {
    m = m ? `False expression: ${m}` : 'False expression.';
    if (info) m += '\r\nVerbose Debug Info: ' + (typeof info === 'string' ? info : info());
    fail(m, mark || assert);
  }
}
export function assertNever(_: never, msg = 'Illegal value:', mark?: AnyFunction): never {
  return fail(`${msg}`, mark || assertNever);
}
export function assertEqual<T>(a: T, b: T, msg?: string, msg2?: string, mark?: AnyFunction) {
  if (a !== b) {
    const m = msg ? (msg2 ? `${msg} ${msg2}` : msg) : '';
    fail(`Expected ${a} === ${b}. ${m}`, mark || assertEqual);
  }
}
export function assertLessThan(a: number, b: number, msg?: string, mark?: AnyFunction) {
  if (a >= b) fail(`Expected ${a} < ${b}. ${msg || ''}`, mark || assertLessThan);
}
export function assertLessThanOrEqual(a: number, b: number, mark?: AnyFunction) {
  if (a > b) fail(`Expected ${a} <= ${b}`, mark || assertLessThanOrEqual);
}
export function assertGreaterThanOrEqual(a: number, b: number, mark?: AnyFunction) {
  if (a < b) fail(`Expected ${a} >= ${b}`, mark || assertGreaterThanOrEqual);
}
export function assertIsDefined<T>(v: T, m?: string, mark?: AnyFunction): asserts v is NonNullable<T> {
  if (v === undefined || v === null) fail(m, mark || assertIsDefined);
}
export function checkDefined<T>(t?: T | null, msg?: string, mark?: AnyFunction): T {
  assertIsDefined(t, msg, mark || checkDefined);
  return t;
}
//export function assertEachIsDefined<T extends Node>(ns: Nodes<T>, msg?: string, mark?: AnyFunction): asserts value is Nodes<T>;
export function assertEachIsDefined<T>(ts: readonly T[], msg?: string, mark?: AnyFunction): asserts ts is readonly NonNullable<T>[];
export function assertEachIsDefined<T>(ts: readonly T[], msg?: string, mark?: AnyFunction) {
  for (const t of ts) {
    assertIsDefined(t, msg, mark || assertEachIsDefined);
  }
}
export function checkEachDefined<T, TS extends readonly T[]>(ts: TS, msg?: string, mark?: AnyFunction): TS {
  assertEachIsDefined(ts, msg, mark || checkEachDefined);
  return ts;
}
export function getFunctionName(f: AnyFunction) {
  if (typeof f !== 'function') return '';
  if (f.hasOwnProperty('name')) return (f as any).name;
  else {
    const t = Function.prototype.toString.call(f);
    const m = /^function\s+([\w\$]+)\s*\(/.exec(t);
    return m ? m[1] : '';
  }
}
export function getEnumMembers(e: any) {
  const ms: [number, string][] = [];
  for (const k in e) {
    const v = e[k];
    if (typeof v === 'number') ms.push([v, k]);
  }
  return stableSort<[number, string]>(ms, (x, y) => compareNumbers(x[0], y[0]));
}
export function formatEnum(v = 0, e: any, isFlags?: boolean) {
  const ms = getEnumMembers(e);
  if (v === 0) return ms.length > 0 && ms[0][0] === 0 ? ms[0][1] : '0';
  if (isFlags) {
    let r = '';
    let fs = v;
    for (const [mv, mk] of ms) {
      if (mv > v) break;
      if (mv !== 0 && mv & v) {
        r = `${r}${r ? '|' : ''}${mk}`;
        fs &= ~mv;
      }
    }
    if (fs === 0) return r;
  } else {
    for (const [mv, mk] of ms) {
      if (mv === v) return mk;
    }
  }
  return v.toString();
}
export function addMixins(t: any, ss: any[]) {
  ss.forEach((s: any) => {
    Object.getOwnPropertyNames(s.prototype).forEach((n) => {
      if (n == 'constructor') return;
      console.log(`adding ${s.name}.${n}`);
      Object.defineProperty(t.prototype, n, Object.getOwnPropertyDescriptor(s.prototype, n)!);
    });
  });
}
const hasOwnProperty = Object.prototype.hasOwnProperty;
export interface MapLike<T> {
  [k: string]: T;
}
export class QMap<T> extends Map<string, T> {
  constructor(es?: MapLike<T> | [string, T][]) {
    super();
    if (isArray(es)) {
      for (const [k, v] of es) {
        this.set(k, v);
      }
    } else if (es) {
      for (const k in es) {
        if (hasOwnProperty.call(es, k)) this.set(k, es[k]);
      }
    }
  }
  reverse() {
    const r = [] as string[];
    this.forEach((v, k) => {
      if (typeof v === 'number') r[v] = k;
    });
    return r;
  }
}
export const emptyMap = new QMap<never>() as QReadonlyMap<never> & qt.ReadonlyPragmaMap;
export type QReadonlyMap<V> = ReadonlyMap<string, V>;
export class MultiMap<T> extends QMap<T[]> {
  add(k: string, v: T) {
    let vs = this.get(k);
    if (vs) vs.push(v);
    else this.set(k, (vs = [v]));
    return vs;
  }
  remove(k: string, v: T) {
    const vs = this.get(k);
    if (vs) {
      unorderedRemoveItem(vs, v);
      if (!vs.length) this.delete(k);
    }
  }
}
export interface QIterator<T> {
  next(): { value: T; done?: false } | { value: never; done: true };
}
export interface Push<T> {
  push(...ts: T[]): void;
}
export interface Sorteds<T> extends Array<T> {
  ' __sortedArrayBrand': any;
}
export interface ReadonlySorteds<T> extends ReadonlyArray<T> {
  ' __sortedArrayBrand': any;
}
export type __String = (string & { __escapedIdentifier: void }) | (void & { __escapedIdentifier: void }) | InternalSymbol;
export type EscapedMap<T> = Map<__String, T>;
export function createEscapedMap<T>(): EscapedMap<T> {
  return new QMap<T>() as EscapedMap<T>;
}
export const emptyEscapedMap: ReadonlyEscapedMap<never> = emptyMap as ReadonlyEscapedMap<never>;
export type ReadonlyEscapedMap<T> = ReadonlyMap<__String, T>;
export function hasEntries(m: ReadonlyEscapedMap<any> | undefined): m is ReadonlyEscapedMap<any> {
  return !!m?.size;
}
export interface EscapedMultiMap<T> extends EscapedMap<T[]> {
  add(key: __String, value: T): T[];
  remove(key: __String, value: T): void;
}
export function length(xs?: readonly unknown[]) {
  return xs ? xs.length : 0;
}
export function isArray(x: unknown): x is readonly {}[] {
  return Array.isArray ? Array.isArray(x) : x instanceof Array;
}
export function toArray<T>(ts: T | T[]): T[];
export function toArray<T>(ts: T | readonly T[]): readonly T[];
export function toArray<T>(ts: T | T[]): T[] {
  return isArray(ts) ? ts : [ts];
}
export function some<T>(ts?: readonly T[]): ts is readonly T[];
export function some<T>(ts: readonly T[] | undefined, cb: (t: T) => boolean): boolean;
export function some<T>(ts: readonly T[] | undefined, cb?: (t: T) => boolean): boolean {
  if (ts) {
    if (cb) {
      for (const t of ts) {
        if (cb(t)) return true;
      }
    } else return ts.length > 0;
  }
  return false;
}
export function every<T>(ts: readonly T[] | undefined, cb: (t: T, i: number) => boolean): boolean {
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      if (!cb(ts[i], i)) return false;
    }
  }
  return true;
}
export function find<T, U extends T>(ts: readonly T[], cb: (t: T, i: number) => t is U): U | undefined;
export function find<T>(ts: readonly T[], cb: (t: T, i: number) => boolean): T | undefined;
export function find<T>(ts: readonly T[], cb: (t: T, i: number) => boolean): T | undefined {
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (cb(t, i)) return t;
  }
  return;
}
export function findLast<T, U extends T>(ts: readonly T[], cb: (t: T, i: number) => t is U): U | undefined;
export function findLast<T>(ts: readonly T[], cb: (t: T, i: number) => boolean): T | undefined;
export function findLast<T>(ts: readonly T[], cb: (t: T, i: number) => boolean): T | undefined {
  for (let i = ts.length - 1; i >= 0; i--) {
    const t = ts[i];
    if (cb(t, i)) return t;
  }
  return;
}
export function findIndex<T>(ts: readonly T[], cb: (t: T, i: number) => boolean, start?: number): number {
  for (let i = start ?? 0; i < ts.length; i++) {
    if (cb(ts[i], i)) return i;
  }
  return -1;
}
export function findLastIndex<T>(ts: readonly T[], cb: (t: T, i: number) => boolean, start?: number): number {
  for (let i = start === undefined ? ts.length - 1 : start; i >= 0; i--) {
    if (cb(ts[i], i)) return i;
  }
  return -1;
}
export function findMap<T, U>(ts: readonly T[], cb: (t: T, i: number) => U | undefined): U {
  for (let i = 0; i < ts.length; i++) {
    const u = cb(ts[i], i);
    if (u) return u;
  }
  return fail();
}
export function each<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U | undefined): U | undefined {
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      const u = cb(ts[i], i);
      if (u) return u;
    }
  }
  return;
}
export function eachRight<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U | undefined): U | undefined {
  if (ts) {
    for (let i = ts.length - 1; i >= 0; i--) {
      const u = cb(ts[i], i);
      if (u) return u;
    }
  }
  return;
}
export function arrayToSet(ts: readonly string[]): QMap<true>;
export function arrayToSet<T>(ts: readonly T[], key: (t: T) => string | undefined): QMap<true>;
export function arrayToSet<T>(ts: readonly T[], key: (t: T) => __String | undefined): EscapedMap<true>;
export function arrayToSet(ts: readonly any[], key?: (t: any) => string | __String | undefined): QMap<true> | EscapedMap<true> {
  return arrayToMap<any, true>(ts, key || ((t) => t), () => true);
}
export function firstDefined<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U | undefined): U | undefined {
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      const u = cb(ts[i], i);
      if (u !== undefined) return u;
    }
  }
  return;
}
export function firstDefinedIterator<T, U>(ts: Iterator<T>, cb: (i: T) => U | undefined): U | undefined {
  while (true) {
    const t = ts.next();
    if (t.done) return;
    const u = cb(t.value);
    if (u !== undefined) return u;
  }
}
export function filter<T, U extends T>(ts: T[], cb: (t: T) => t is U): U[];
export function filter<T>(ts: T[], cb: (t: T) => boolean): T[];
export function filter<T, U extends T>(ts: readonly T[], cb: (t: T) => t is U): readonly U[];
export function filter<T, U extends T>(ts: readonly T[], cb: (t: T) => boolean): readonly T[];
export function filter<T, U extends T>(ts: T[] | undefined, cb: (t: T) => t is U): U[] | undefined;
export function filter<T>(ts: T[] | undefined, cb: (t: T) => boolean): T[] | undefined;
export function filter<T, U extends T>(ts: readonly T[] | undefined, cb: (t: T) => t is U): readonly U[] | undefined;
export function filter<T, U extends T>(ts: readonly T[] | undefined, cb: (t: T) => boolean): readonly T[] | undefined;
export function filter<T>(ts: readonly T[] | undefined, cb: (t: T) => boolean): readonly T[] | undefined {
  if (ts) {
    const len = ts.length;
    let i = 0;
    while (i < len && cb(ts[i])) i++;
    if (i < len) {
      const r = ts.slice(0, i);
      i++;
      while (i < len) {
        const t = ts[i];
        if (cb(t)) r.push(t);
        i++;
      }
      return r;
    }
  }
  return ts;
}
export function filterMutate<T>(ts: T[], cb: (t: T, i: number, ts: T[]) => boolean): void {
  let out = 0;
  for (let i = 0; i < ts.length; i++) {
    if (cb(ts[i], i, ts)) {
      ts[out] = ts[i];
      out++;
    }
  }
  ts.length = out;
}
export function map<T, U>(ts: readonly T[], cb: (t: T, i: number) => U): U[];
export function map<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U): U[] | undefined;
export function map<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U): U[] | undefined {
  let us: U[] | undefined;
  if (ts) {
    us = [];
    for (let i = 0; i < ts.length; i++) {
      us.push(cb(ts[i], i));
    }
  }
  return us;
}
export function mapIterator<T, U>(ts: Iterator<T>, cb: (t: T) => U): Iterator<U> {
  return {
    next() {
      const t = ts.next();
      return t.done ? (t as { done: true; value: never }) : { value: cb(t.value), done: false };
    },
  };
}
export const enum Comparison {
  LessThan = -1,
  EqualTo = 0,
  GreaterThan = 1,
}
export type EqComparer<T> = (a: T, b: T) => boolean;
export type Comparer<T> = (a: T, b: T) => Comparison;
export function equateValues<T>(a: T, b: T) {
  return a === b;
}
export function equateStringsCaseInsensitive(a: string, b: string) {
  return a === b || (a !== undefined && b !== undefined && a.toUpperCase() === b.toUpperCase());
}
export function equateStringsCaseSensitive(a: string, b: string) {
  return equateValues(a, b);
}
export function countWhere<T>(ts: readonly T[], cb: (t: T, i: number) => boolean): number {
  let r = 0;
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      if (cb(t, i)) r++;
    }
  }
  return r;
}
export function contains<T>(ts: readonly T[] | undefined, x: T, eq: EqComparer<T> = equateValues): boolean {
  if (ts) {
    for (const t of ts) {
      if (eq(t, x)) return true;
    }
  }
  return false;
}
export function intersperse<T>(ts: T[], t: T): T[] {
  if (ts.length <= 1) return ts;
  const r = [] as T[];
  for (let i = 0, n = ts.length; i < n; i++) {
    if (i) r.push(t);
    r.push(ts[i]);
  }
  return r;
}
export function clear(ts: unknown[]): void {
  ts.length = 0;
}
export function zipWith<T, U, V>(ts: readonly T[], us: readonly U[], cb: (a: T, b: U, i: number) => V): V[] {
  const vs: V[] = [];
  assertEqual(ts.length, us.length);
  for (let i = 0; i < ts.length; i++) {
    vs.push(cb(ts[i], us[i], i));
  }
  return vs;
}
export function zipToIterator<T, U>(ts: readonly T[], us: readonly U[]): Iterator<[T, U]> {
  assertEqual(ts.length, us.length);
  let i = 0;
  return {
    next() {
      if (i === ts.length) return { value: undefined as never, done: true };
      i++;
      return { value: [ts[i - 1], us[i - 1]] as [T, U], done: false };
    },
  };
}
export function arraysEqual<T>(a: readonly T[], b: readonly T[], eq: EqComparer<T> = equateValues): boolean {
  return a.length === b.length && a.every((x, i) => eq(x, b[i]));
}
export function indexOfAnyCharCode(s: string, cs: readonly number[], start?: number): number {
  for (let i = start || 0; i < s.length; i++) {
    if (contains(cs, s.charCodeAt(i))) return i;
  }
  return -1;
}
export function sameMap<T>(ts: T[], cb: (t: T, i: number) => T): T[];
export function sameMap<T>(ts: readonly T[], cb: (t: T, i: number) => T): readonly T[];
export function sameMap<T>(ts: T[] | undefined, cb: (t: T, i: number) => T): T[] | undefined;
export function sameMap<T>(ts: readonly T[] | undefined, cb: (t: T, i: number) => T): readonly T[] | undefined;
export function sameMap<T>(ts: readonly T[] | undefined, cb: (t: T, i: number) => T): readonly T[] | undefined {
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      const mapped = cb(t, i);
      if (t !== mapped) {
        const r = ts.slice(0, i);
        r.push(mapped);
        for (i++; i < ts.length; i++) {
          r.push(cb(ts[i], i));
        }
        return r;
      }
    }
  }
  return ts;
}
export function flatten<T>(ts: T[][] | readonly (T | readonly T[] | undefined)[]): T[] {
  const r = [];
  for (const t of ts) {
    if (t) {
      if (isArray(t)) addRange(r, t);
      else r.push(t);
    }
  }
  return r;
}
export const empty = [] as never[];
export function flatMap<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U | readonly U[] | undefined): readonly U[] {
  let us: U[] | undefined;
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      const u = cb(ts[i], i);
      if (u) {
        if (isArray(u)) us = addRange(us, u);
        else us = append(us, u);
      }
    }
  }
  return us || empty;
}
export function flatMapToMutable<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U | readonly U[] | undefined): U[] {
  const r: U[] = [];
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      const v = cb(ts[i], i);
      if (v) {
        if (isArray(v)) addRange(r, v);
        else {
          r.push(v);
        }
      }
    }
  }
  return r;
}
export const emptyIter: Iterator<never> = { next: () => ({ value: undefined as never, done: true }) };
export function flatMapIterator<T, U>(ts: Iterator<T>, cb: (t: T) => readonly U[] | Iterator<U> | undefined): Iterator<U> {
  const t = ts.next();
  if (t.done) return emptyIter;
  const getUs = (t: T): Iterator<U> => {
    const u = cb(t);
    return u === undefined ? emptyIter : isArray(u) ? arrayIterator(u) : u;
  };
  let us = getUs(t.value);
  return {
    next() {
      while (true) {
        const u = us.next();
        if (!u.done) return u;
        const t = ts.next();
        if (t.done) return t as { done: true; value: never };
        us = getUs(t.value);
      }
    },
  };
}
export function sameFlatMap<T>(ts: T[], cb: (t: T, i: number) => T | readonly T[]): T[];
export function sameFlatMap<T>(ts: readonly T[], cb: (t: T, i: number) => T | readonly T[]): readonly T[];
export function sameFlatMap<T>(ts: readonly T[], cb: (t: T, i: number) => T | T[]): readonly T[] {
  let r: T[] | undefined;
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i];
      const mapped = cb(t, i);
      if (r || t !== mapped || isArray(mapped)) {
        if (!r) r = ts.slice(0, i);
        if (isArray(mapped)) addRange(r, mapped);
        else r.push(mapped);
      }
    }
  }
  return r || ts;
}
export function mapAllOrFail<T, U>(ts: readonly T[], cb: (t: T, i: number) => U | undefined): U[] | undefined {
  const us: U[] = [];
  for (let i = 0; i < ts.length; i++) {
    const u = cb(ts[i], i);
    if (u === undefined) return;
    us.push(u);
  }
  return us;
}
export function mapDefined<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U | undefined): U[] {
  const us: U[] = [];
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      const u = cb(ts[i], i);
      if (u !== undefined) us.push(u);
    }
  }
  return us;
}
export function mapDefinedIterator<T, U>(ts: Iterator<T>, cb: (t: T) => U | undefined): Iterator<U> {
  return {
    next() {
      while (true) {
        const t = ts.next();
        if (t.done) return t as { done: true; value: never };
        const u = cb(t.value);
        if (u !== undefined) return { value: u, done: false };
      }
    },
  };
}
export function singleIterator<T>(t: T): Iterator<T> {
  let done = false;
  return {
    next() {
      const o = done;
      done = true;
      return o ? { value: undefined as never, done: true } : { value: t, done: false };
    },
  };
}
export function spanMap<T, K, U>(ts: readonly T[], keyfn: (x: T, i: number) => K, cb: (chunk: T[], key: K, start: number, end: number) => U): U[];
export function spanMap<T, K, U>(ts: readonly T[] | undefined, keyfn: (x: T, i: number) => K, cb: (chunk: T[], key: K, start: number, end: number) => U): U[] | undefined;
export function spanMap<T, K, U>(ts: readonly T[] | undefined, keyfn: (x: T, i: number) => K, cb: (chunk: T[], key: K, start: number, end: number) => U): U[] | undefined {
  let us: U[] | undefined;
  if (ts) {
    us = [];
    const len = ts.length;
    let previousKey: K | undefined;
    let key: K | undefined;
    let start = 0;
    let pos = 0;
    while (start < len) {
      while (pos < len) {
        const value = ts[pos];
        key = keyfn(value, pos);
        if (pos === 0) previousKey = key;
        else if (key !== previousKey) break;
        pos++;
      }
      if (start < pos) {
        const v = cb(ts.slice(start, pos), previousKey!, start, pos);
        if (v) us.push(v);
        start = pos;
      }
      previousKey = key;
      pos++;
    }
  }
  return us;
}
export function getRangesWhere<T>(arr: readonly T[], pred: (t: T) => boolean, cb: (start: number, afterEnd: number) => void): void {
  let start: number | undefined;
  for (let i = 0; i < arr.length; i++) {
    if (pred(arr[i])) start = start === undefined ? i : start;
    else {
      if (start !== undefined) {
        cb(start, i);
        start = undefined;
      }
    }
  }
  if (start !== undefined) cb(start, arr.length);
}
export function concatenate<T>(ts1: T[], b: T[]): T[];
export function concatenate<T>(a: readonly T[], b: readonly T[]): readonly T[];
export function concatenate<T>(a: T[] | undefined, b: T[] | undefined): T[];
export function concatenate<T>(a: readonly T[] | undefined, b: readonly T[] | undefined): readonly T[];
export function concatenate<T>(a: T[] | readonly T[] | undefined, b: T[] | readonly T[] | undefined): T[] | readonly T[] | undefined {
  if (!some(b)) return a;
  if (!some(a)) return b;
  return [...a, ...b];
}
function selectIndex(_: unknown, i: number) {
  return i;
}
export function indicesOf(ts: readonly unknown[]): number[] {
  return ts.map(selectIndex);
}
function deduplicateRelational<T>(ts: readonly T[], eq: EqComparer<T>, comparer: Comparer<T>) {
  const indices = indicesOf(ts);
  stableSortIndices(ts, indices, comparer);
  let last = ts[indices[0]];
  const deduplicated: number[] = [indices[0]];
  for (let i = 1; i < indices.length; i++) {
    const index = indices[i];
    const item = ts[index];
    if (!eq(last, item)) {
      deduplicated.push(index);
      last = item;
    }
  }
  deduplicated.sort();
  return deduplicated.map((i) => ts[i]);
}
function deduplicateEquality<T>(ts: readonly T[], eq: EqComparer<T>) {
  const r: T[] = [];
  for (const item of ts) {
    pushIfUnique(r, item, eq);
  }
  return r;
}
export function deduplicate<T>(ts: readonly T[], eq: EqComparer<T>, comparer?: Comparer<T>): T[] {
  return ts.length === 0 ? [] : ts.length === 1 ? ts.slice() : comparer ? deduplicateRelational(ts, eq, comparer) : deduplicateEquality(ts, eq);
}
export function zipToMap<T>(ks: readonly string[], ts: readonly T[]): QMap<T> {
  assertEqual(ks.length, ts.length);
  const r = new QMap<T>();
  for (let i = 0; i < ks.length; ++i) {
    r.set(ks[i], ts[i]);
  }
  return r;
}
export function mapDefinedMap<T, U>(ts: QReadonlyMap<T>, mv: (t: T, k: string) => U | undefined, mk: (k: string) => string = identity): QMap<U> {
  const us = new QMap<U>();
  ts.forEach((v, k) => {
    const u = mv(v, k);
    if (u !== undefined) us.set(mk(k), u);
  });
  return us;
}
export function mapEntries<T, U>(m: QReadonlyMap<T>, f: (k: string, t: T) => [string, U]): QMap<U>;
export function mapEntries<T, U>(m: QReadonlyMap<T> | undefined, f: (k: string, t: T) => [string, U]): QMap<U> | undefined;
export function mapEntries<T, U>(m: QReadonlyMap<T> | undefined, f: (k: string, t: T) => [string, U]): QMap<U> | undefined {
  if (!m) return;
  const us = new QMap<U>();
  m.forEach((v, k) => {
    const [k2, v2] = f(k, v);
    us.set(k2, v2);
  });
  return us;
}
export function mapMap<T, U>(m: QMap<T>, f: (t: T, k: string) => [string, U]): QMap<U>;
export function mapMap<T, U>(m: EscapedMap<T>, f: (t: T, k: __String) => [string, U]): QMap<U>;
export function mapMap<T, U>(m: QMap<T> | EscapedMap<T>, f: ((t: T, k: string) => [string, U]) | ((t: T, k: __String) => [string, U])): QMap<U> {
  const r = new QMap<U>();
  m.forEach((t: T, k: string & __String) => r.set(...f(t, k)));
  return r;
}
export function createEscapedMultiMap<T>(): EscapedMultiMap<T> {
  return new MultiMap<T>() as EscapedMultiMap<T>;
}
export function isString(text: unknown): text is string {
  return typeof text === 'string';
}
export function isNumber(x: unknown): x is number {
  return typeof x === 'number';
}
export function tryCast<TOut extends TIn, TIn = any>(t: TIn | undefined, test: (t: TIn) => t is TOut): TOut | undefined;
export function tryCast<T>(t: T, test: (t: T) => boolean): T | undefined;
export function tryCast<T>(t: T, test: (t: T) => boolean): T | undefined {
  return t !== undefined && test(t) ? t : undefined;
}
export function cast<TOut extends TIn, TIn = any>(t: TIn | undefined, test: (t: TIn) => t is TOut): TOut {
  if (t !== undefined && test(t)) return t;
  return fail(`Invalid cast`);
}
export function noop(_?: {} | null | undefined): void {}
export function identity<T>(x: T) {
  return x;
}
export function toLowerCase(x: string) {
  return x.toLowerCase();
}
const fileNameLowerCaseRegExp = /[^\u0130\u0131\u00DFa-z0-9\\/:\-_\. ]+/g;
export function toFileNameLowerCase(x: string) {
  return fileNameLowerCaseRegExp.test(x) ? x.replace(fileNameLowerCaseRegExp, toLowerCase) : x;
}
export function notImplemented(): never {
  throw new Error('Not implemented');
}
export function memoize<T>(cb: () => T): () => T {
  let v: T;
  return () => {
    if (cb) {
      v = cb();
      cb = undefined!;
    }
    return v;
  };
}
function deduplicateSorted<T>(ts: ReadonlySorteds<T>, comparer: EqComparer<T> | Comparer<T>): ReadonlySorteds<T> {
  if (ts.length === 0) return (empty as any) as ReadonlySorteds<T>;
  let last = ts[0];
  const deduplicated: T[] = [last];
  for (let i = 1; i < ts.length; i++) {
    const next = ts[i];
    switch (comparer(next, last)) {
      case true:
      case Comparison.EqualTo:
        continue;
      case Comparison.LessThan:
        return fail('Array is unsorted.');
    }
    deduplicated.push((last = next));
  }
  return (deduplicated as any) as ReadonlySorteds<T>;
}
export function insertSorted<T>(ts: Sorteds<T>, insert: T, compare: Comparer<T>): void {
  if (ts.length === 0) {
    ts.push(insert);
    return;
  }
  const insertIndex = binarySearch(ts, insert, identity, compare);
  if (insertIndex < 0) ts.splice(~insertIndex, 0, insert);
}
export function sortAndDeduplicate<T>(ts: readonly string[]): ReadonlySorteds<string>;
export function sortAndDeduplicate<T>(ts: readonly T[], comparer: Comparer<T>, eq?: EqComparer<T>): ReadonlySorteds<T>;
export function sortAndDeduplicate<T>(ts: readonly T[], comparer?: Comparer<T>, eq?: EqComparer<T>): ReadonlySorteds<T> {
  return deduplicateSorted(sort(ts, comparer), eq || comparer || ((compareCaseSensitive as any) as Comparer<T>));
}
export function arrayIsEqualTo<T>(a: readonly T[] | undefined, b: readonly T[] | undefined, eq: (a: T, b: T, index: number) => boolean = equateValues): boolean {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!eq(a[i], b[i], i)) return false;
  }
  return true;
}
export function compact<T>(ts: (T | undefined | null | false | 0 | '')[]): T[];
export function compact<T>(ts: readonly (T | undefined | null | false | 0 | '')[]): readonly T[];
export function compact<T>(ts: T[]): T[];
export function compact<T>(ts: readonly T[]): readonly T[];
export function compact<T>(ts: T[] | readonly T[]): T[] | readonly T[] {
  let r: T[] | undefined;
  if (ts) {
    for (let i = 0; i < ts.length; i++) {
      const v = ts[i];
      if (r || !v) {
        if (!r) r = ts.slice(0, i);
        if (v) r.push(v);
      }
    }
  }
  return r || ts;
}
export function relativeComplement<T>(a: T[] | undefined, b: T[] | undefined, c: Comparer<T>): T[] | undefined {
  if (!b || !a || b.length === 0 || a.length === 0) return b;
  const r: T[] = [];
  loopB: for (let oa = 0, ob = 0; ob < b.length; ob++) {
    if (ob > 0) assertGreaterThanOrEqual(c(b[ob], b[ob - 1]), Comparison.EqualTo);
    loopA: for (const startA = oa; oa < a.length; oa++) {
      if (oa > startA) assertGreaterThanOrEqual(c(a[oa], a[oa - 1]), Comparison.EqualTo);
      switch (c(b[ob], a[oa])) {
        case Comparison.LessThan:
          r.push(b[ob]);
          continue loopB;
        case Comparison.EqualTo:
          continue loopB;
        case Comparison.GreaterThan:
          continue loopA;
      }
    }
  }
  return r;
}
export function sum<T extends Record<K, number>, K extends string>(ts: readonly T[], prop: K): number {
  let r = 0;
  for (const v of ts) {
    r += v[prop];
  }
  return r;
}
export function append<T, V extends NonNullable<T[]>[number] | undefined>(ts: T[] | undefined, v: V): [undefined, undefined] extends [T[], V] ? T : NonNullable<T[]>[number][];
export function append<T>(ts: T[], v?: T): T[];
export function append<T>(ts: T[] | undefined, v: T): T[];
//export function append<T>(to: Push<T>, v?: T): Push<T>;
export function append<T>(ts?: T[], v?: T): T[] | undefined {
  if (v === undefined) return ts;
  if (ts === undefined) return [v];
  ts.push(v);
  return ts;
}
export function combine<T>(a: T | readonly T[] | undefined, b: T | readonly T[] | undefined): T | readonly T[] | undefined;
export function combine<T>(a: T | T[] | undefined, b: T | T[] | undefined): T | T[] | undefined;
export function combine<T>(a: T | T[] | undefined, b: T | T[] | undefined) {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (isArray(a)) return isArray(b) ? concatenate(a, b) : append(a, b);
  if (isArray(b)) return append(b, a);
  return [a, b];
}
function toOffset(ts: readonly any[], offset: number) {
  return offset < 0 ? ts.length + offset : offset;
}
export function addRange<T>(to: T[], from: readonly T[] | undefined, start?: number, end?: number): T[];
export function addRange<T>(to: T[] | undefined, from: readonly T[] | undefined, start?: number, end?: number): T[] | undefined;
export function addRange<T>(to: T[] | undefined, from: readonly T[] | undefined, start?: number, end?: number): T[] | undefined {
  if (from === undefined || from.length === 0) return to;
  if (to === undefined) return from.slice(start, end);
  start = start === undefined ? 0 : toOffset(from, start);
  end = end === undefined ? from.length : toOffset(from, end);
  for (let i = start; i < end && i < from.length; i++) {
    if (from[i] !== undefined) to.push(from[i]);
  }
  return to;
}
export function pushIfUnique<T>(ts: T[], toAdd: T, eq?: EqComparer<T>): boolean {
  if (contains(ts, toAdd, eq)) return false;
  ts.push(toAdd);
  return true;
}
export function appendIfUnique<T>(ts: T[] | undefined, toAdd: T, eq?: EqComparer<T>): T[] {
  if (ts) {
    pushIfUnique(ts, toAdd, eq);
    return ts;
  }
  return [toAdd];
}
function stableSortIndices<T>(ts: readonly T[], indices: number[], comparer: Comparer<T>) {
  indices.sort((x, y) => comparer(ts[x], ts[y]) || compareNumbers(x, y));
}
export function sort<T>(ts: readonly T[], comparer?: Comparer<T>): ReadonlySorteds<T> {
  return (ts.length === 0 ? ts : ts.slice().sort(comparer)) as ReadonlySorteds<T>;
}
export function arrayIterator<T>(ts: readonly T[]): Iterator<T> {
  let i = 0;
  return {
    next: () => {
      if (i === ts.length) return { value: undefined as never, done: true };
      else {
        i++;
        return { value: ts[i - 1], done: false };
      }
    },
  };
}
export function arrayReverseIterator<T>(ts: readonly T[]): Iterator<T> {
  let i = ts.length;
  return {
    next: () => {
      if (i === 0) return { value: undefined as never, done: true };
      else {
        i--;
        return { value: ts[i], done: false };
      }
    },
  };
}
export function stableSort<T>(ts: readonly T[], comparer: Comparer<T>): ReadonlySorteds<T> {
  const indices = indicesOf(ts);
  stableSortIndices(ts, indices, comparer);
  return (indices.map((i) => ts[i]) as Sorteds<T>) as ReadonlySorteds<T>;
}
export function rangeEquals<T>(a: readonly T[], b: readonly T[], pos: number, end: number) {
  while (pos < end) {
    if (a[pos] !== b[pos]) return false;
    pos++;
  }
  return true;
}
export function elemAt<T>(ts: readonly T[] | undefined, offset: number): T | undefined {
  if (ts) {
    offset = toOffset(ts, offset);
    if (offset < ts.length) return ts[offset];
  }
  return;
}
export function firstOrUndefined<T>(ts: readonly T[]): T | undefined {
  return ts.length === 0 ? undefined : ts[0];
}
export function first<T>(ts: readonly T[]): T {
  assert(ts.length !== 0);
  return ts[0];
}
export function lastOrUndefined<T>(ts: readonly T[]): T | undefined {
  return ts.length === 0 ? undefined : ts[ts.length - 1];
}
export function last<T>(ts: readonly T[]): T {
  assert(ts.length !== 0);
  return ts[ts.length - 1];
}
export function singleOrUndefined<T>(ts: readonly T[] | undefined): T | undefined {
  return ts && ts.length === 1 ? ts[0] : undefined;
}
export function singleOrMany<T>(ts: T[]): T | T[];
export function singleOrMany<T>(ts: readonly T[]): T | readonly T[];
export function singleOrMany<T>(ts: T[] | undefined): T | T[] | undefined;
export function singleOrMany<T>(ts: readonly T[] | undefined): T | readonly T[] | undefined;
export function singleOrMany<T>(ts: readonly T[] | undefined): T | readonly T[] | undefined {
  return ts && ts.length === 1 ? ts[0] : ts;
}
export function replaceElem<T>(ts: readonly T[], index: number, value: T): T[] {
  const r = ts.slice(0);
  r[index] = value;
  return r;
}
export function binarySearch<T, U>(ts: readonly T[], value: T, keySelector: (v: T) => U, keyComparer: Comparer<U>, offset?: number): number {
  return binarySearchKey(ts, keySelector(value), keySelector, keyComparer, offset);
}
export function binarySearchKey<T, U>(ts: readonly T[], key: U, keySelector: (v: T) => U, keyComparer: Comparer<U>, offset?: number): number {
  if (!some(ts)) return -1;
  let low = offset || 0;
  let high = ts.length - 1;
  while (low <= high) {
    const middle = low + ((high - low) >> 1);
    const midKey = keySelector(ts[middle]);
    switch (keyComparer(midKey, key)) {
      case Comparison.LessThan:
        low = middle + 1;
        break;
      case Comparison.EqualTo:
        return middle;
      case Comparison.GreaterThan:
        high = middle - 1;
        break;
    }
  }
  return ~low;
}
export function reduceLeft<T, U>(ts: readonly T[] | undefined, f: (memo: U, t: T, i: number) => U, initial: U, start?: number, count?: number): U;
export function reduceLeft<T>(ts: readonly T[], f: (memo: T, t: T, i: number) => T): T | undefined;
export function reduceLeft<T>(ts: readonly T[] | undefined, f: (memo: T, t: T, i: number) => T, initial?: T, start?: number, count?: number): T | undefined {
  if (ts && ts.length > 0) {
    const size = ts.length;
    if (size > 0) {
      let pos = start === undefined || start < 0 ? 0 : start;
      const end = count === undefined || pos + count > size - 1 ? size - 1 : pos + count;
      let r: T;
      if (arguments.length <= 2) {
        r = ts[pos];
        pos++;
      } else r = initial!;
      while (pos <= end) {
        r = f(r, ts[pos], pos);
        pos++;
      }
      return r;
    }
  }
  return initial;
}
export function hasProperty(map: MapLike<any>, key: string): boolean {
  return hasOwnProperty.call(map, key);
}
export function getProperty<T>(map: MapLike<T>, key: string): T | undefined {
  return hasOwnProperty.call(map, key) ? map[key] : undefined;
}
export function getOwnKeys<T>(map: MapLike<T>): string[] {
  const keys: string[] = [];
  for (const key in map) {
    if (hasOwnProperty.call(map, key)) keys.push(key);
  }
  return keys;
}
export function getAllKeys(obj: object): string[] {
  const r: string[] = [];
  do {
    const names = Object.getOwnPropertyNames(obj);
    for (const name of names) {
      pushIfUnique(r, name);
    }
  } while ((obj = Object.getPrototypeOf(obj)));
  return r;
}
export function getOwnValues<T>(sparseArray: T[]): T[] {
  const values: T[] = [];
  for (const key in sparseArray) {
    if (hasOwnProperty.call(sparseArray, key)) values.push(sparseArray[key]);
  }
  return values;
}
export function arrayFrom<T, U>(iterator: Iterator<T> | IterableIterator<T>, map: (t: T) => U): U[];
export function arrayFrom<T>(iterator: Iterator<T> | IterableIterator<T>): T[];
export function arrayFrom<T, U>(iterator: Iterator<T> | IterableIterator<T>, map?: (t: T) => U): (T | U)[] {
  const r: (T | U)[] = [];
  for (let iterResult = iterator.next(); !iterResult.done; iterResult = iterator.next()) {
    r.push(map ? map(iterResult.value) : iterResult.value);
  }
  return r;
}
export function assign<T extends object>(t: T, ...args: (T | undefined)[]) {
  for (const arg of args) {
    if (arg === undefined) continue;
    for (const p in arg) {
      if (hasProperty(arg, p)) t[p] = arg[p];
    }
  }
  return t;
}
export function equalOwnProperties<T>(left: MapLike<T> | undefined, right: MapLike<T> | undefined, eq: EqComparer<T> = equateValues) {
  if (left === right) return true;
  if (!left || !right) return false;
  for (const key in left) {
    if (hasOwnProperty.call(left, key)) {
      if (!hasOwnProperty.call(right, key)) return false;
      if (!eq(left[key], right[key])) return false;
    }
  }
  for (const key in right) {
    if (hasOwnProperty.call(right, key)) if (!hasOwnProperty.call(left, key)) return false;
  }
  return true;
}
export function arrayToMap<T>(array: readonly T[], makeKey: (value: T) => string | undefined): QMap<T>;
export function arrayToMap<T, U>(array: readonly T[], makeKey: (value: T) => string | undefined, makeValue: (value: T) => U): QMap<U>;
export function arrayToMap<T, U>(array: readonly T[], makeKey: (value: T) => string | undefined, makeValue: (value: T) => T | U = identity): QMap<T | U> {
  const r = new QMap<T | U>();
  for (const value of array) {
    const key = makeKey(value);
    if (key !== undefined) r.set(key, makeValue(value));
  }
  return r;
}
export function arrayToNumericMap<T>(array: readonly T[], makeKey: (value: T) => number): T[];
export function arrayToNumericMap<T, U>(array: readonly T[], makeKey: (value: T) => number, makeValue: (value: T) => U): U[];
export function arrayToNumericMap<T, U>(array: readonly T[], makeKey: (value: T) => number, makeValue: (value: T) => T | U = identity): (T | U)[] {
  const r: (T | U)[] = [];
  for (const value of array) {
    r[makeKey(value)] = makeValue(value);
  }
  return r;
}
export function arrayToMultiMap<T>(values: readonly T[], makeKey: (value: T) => string): MultiMap<T>;
export function arrayToMultiMap<T, U>(values: readonly T[], makeKey: (value: T) => string, makeValue: (value: T) => U): MultiMap<U>;
export function arrayToMultiMap<T, U>(values: readonly T[], makeKey: (value: T) => string, makeValue: (value: T) => T | U = identity): MultiMap<T | U> {
  const r = new MultiMap<T | U>();
  for (const value of values) {
    r.add(makeKey(value), makeValue(value));
  }
  return r;
}
export function group<T>(values: readonly T[], getGroupId: (value: T) => string): readonly (readonly T[])[];
export function group<T, R>(values: readonly T[], getGroupId: (value: T) => string, resultSelector: (values: readonly T[]) => R): R[];
export function group<T>(values: readonly T[], getGroupId: (value: T) => string, resultSelector: (values: readonly T[]) => readonly T[] = identity): readonly (readonly T[])[] {
  return arrayFrom(arrayToMultiMap(values, getGroupId).values(), resultSelector);
}
export function clone<T>(t: T): T {
  const r: any = {};
  for (const id in t) {
    if (hasOwnProperty.call(t, id)) r[id] = (<any>t)[id];
  }
  return r;
}
export function extend<T1, T2>(first: T1, second: T2): T1 & T2 {
  const r: T1 & T2 = <any>{};
  for (const id in second) {
    if (hasOwnProperty.call(second, id)) (r as any)[id] = (second as any)[id];
  }
  for (const id in first) {
    if (hasOwnProperty.call(first, id)) (r as any)[id] = (first as any)[id];
  }
  return r;
}
export function copyProperties<T1 extends T2, T2>(to: T1, from: T2) {
  for (const k in from) {
    if (hasOwnProperty.call(from, k)) (to as any)[k] = from[k];
  }
}
export function maybeBind<T, A extends unknown, R>(t: T, cb: ((this: T, ...args: A[]) => R) | undefined): ((...args: A[]) => R) | undefined {
  return cb ? cb.bind(t) : undefined;
}
export function eachEntry<T, U>(m: ReadonlyEscapedMap<T>, cb: (t: T, k: __String) => U | undefined): U | undefined;
export function eachEntry<T, U>(m: QReadonlyMap<T>, cb: (t: T, k: string) => U | undefined): U | undefined;
export function eachEntry<T, U>(m: ReadonlyEscapedMap<T> | QReadonlyMap<T>, cb: (t: T, k: string & __String) => U | undefined): U | undefined {
  const ts = m.entries();
  for (let i = ts.next(); !i.done; i = ts.next()) {
    const [k, t] = i.value;
    const u = cb(t, k as string & __String);
    if (u) return u;
  }
  return;
}
export function eachKey<T>(m: ReadonlyEscapedMap<{}>, cb: (k: __String) => T | undefined): T | undefined;
export function eachKey<T>(m: QReadonlyMap<{}>, cb: (k: string) => T | undefined): T | undefined;
export function eachKey<T>(m: ReadonlyEscapedMap<{}> | QReadonlyMap<{}>, cb: (k: string & __String) => T | undefined): T | undefined {
  const ks = m.keys();
  for (let i = ks.next(); !i.done; i = ks.next()) {
    const t = cb(i.value as string & __String);
    if (t) return t;
  }
  return;
}
export function copyEntries<T>(s: ReadonlyEscapedMap<T>, t: EscapedMap<T>): void;
export function copyEntries<T>(s: QReadonlyMap<T>, t: QMap<T>): void;
export function copyEntries<T, U extends EscapedMap<T> | QMap<T>>(s: U, t: U): void {
  (s as QMap<T>).forEach((v, k) => {
    (t as QMap<T>).set(k, v);
  });
}
export function compose<T>(...args: ((t: T) => T)[]): (t: T) => T;
export function compose<T>(a: (t: T) => T, b: (t: T) => T, c: (t: T) => T, d: (t: T) => T, e: (t: T) => T): (t: T) => T {
  if (!!e) {
    const args: ((t: T) => T)[] = [];
    for (let i = 0; i < args.length; i++) {
      args[i] = args[i];
    }
    return (t) => reduceLeft(args, (u, f) => f(u), t);
  } else if (d) {
    return (t) => d(c(b(a(t))));
  } else if (c) {
    return (t) => c(b(a(t)));
  } else if (b) {
    return (t) => b(a(t));
  } else if (a) {
    return (t) => a(t);
  } else {
    return (t) => t;
  }
}
export function min<T>(a: T, b: T, c: Comparer<T>): T {
  return c(a, b) === Comparison.LessThan ? a : b;
}
export function isInfinityOrNaNString(n: string | __String) {
  return n === 'Infinity' || n === '-Infinity' || n === 'NaN';
}
export function unhyphenatedJsxName(n: string | __String) {
  return !stringContains(n as string, '-');
}
function compare(a?: string, b?: string): Comparison;
function compare(a?: number, b?: number): Comparison;
function compare(a?: string | number, b?: string | number) {
  return a === b ? Comparison.EqualTo : a === undefined ? Comparison.LessThan : b === undefined ? Comparison.GreaterThan : a < b ? Comparison.LessThan : Comparison.GreaterThan;
}
export function compareNumbers(a?: number, b?: number) {
  return compare(a, b);
}
export function compareSpans(a?: Partial<Span>, b?: Partial<Span>) {
  return compareNumbers(a?.start, b?.start) || compareNumbers(a?.length, b?.length);
}
export function compareCaseInsensitive(a?: string, b?: string) {
  if (a === b) return Comparison.EqualTo;
  if (a === undefined) return Comparison.LessThan;
  if (b === undefined) return Comparison.GreaterThan;
  a = a.toUpperCase();
  b = b.toUpperCase();
  return a < b ? Comparison.LessThan : a > b ? Comparison.GreaterThan : Comparison.EqualTo;
}
export function compareCaseSensitive(a?: string, b?: string) {
  return compare(a, b);
}
export function getStringComparer(ignoreCase?: boolean) {
  return ignoreCase ? compareCaseInsensitive : compareCaseSensitive;
}
const createUIStringComparer = (() => {
  let defaultComparer: Comparer<string> | undefined;
  let enUSComparer: Comparer<string> | undefined;
  const stringComparerFactory = getStringComparerFactory();
  return createStringComparer;
  function compareWithCallback(a: string | undefined, b: string | undefined, comparer: (a: string, b: string) => number) {
    if (a === b) return Comparison.EqualTo;
    if (a === undefined) return Comparison.LessThan;
    if (b === undefined) return Comparison.GreaterThan;
    const v = comparer(a, b);
    return v < 0 ? Comparison.LessThan : v > 0 ? Comparison.GreaterThan : Comparison.EqualTo;
  }
  function createIntlCollatorStringComparer(locale: string | undefined): Comparer<string> {
    const comparer = new Intl.Collator(locale, { usage: 'sort', sensitivity: 'variant' }).compare;
    return (a, b) => compareWithCallback(a, b, comparer);
  }
  function createLocaleCompareStringComparer(locale: string | undefined): Comparer<string> {
    if (locale !== undefined) return createFallbackStringComparer();
    return (a, b) => compareWithCallback(a, b, compareStrings);
    function compareStrings(a: string, b: string) {
      return a.localeCompare(b);
    }
  }
  function createFallbackStringComparer(): Comparer<string> {
    return (a, b) => compareWithCallback(a, b, compareDictionaryOrder);
    function compareDictionaryOrder(a: string, b: string) {
      return compareStrings(a.toUpperCase(), b.toUpperCase()) || compareStrings(a, b);
    }
    function compareStrings(a: string, b: string) {
      return a < b ? Comparison.LessThan : a > b ? Comparison.GreaterThan : Comparison.EqualTo;
    }
  }
  function getStringComparerFactory() {
    if (typeof Intl === 'object' && typeof Intl.Collator === 'function') return createIntlCollatorStringComparer;
    if (typeof String.prototype.localeCompare === 'function' && typeof String.prototype.toLocaleUpperCase === 'function' && 'a'.localeCompare('B') < 0) return createLocaleCompareStringComparer;
    return createFallbackStringComparer;
  }
  function createStringComparer(locale: string | undefined) {
    if (locale === undefined) return defaultComparer || (defaultComparer = stringComparerFactory(locale));
    if (locale === 'en-US') return enUSComparer || (enUSComparer = stringComparerFactory(locale));
    return stringComparerFactory(locale);
  }
})();
let uiComparerCaseSensitive: Comparer<string> | undefined;
let uiLocale: string | undefined;
export function getUILocale() {
  return uiLocale;
}
export function setUILocale(v: string | undefined) {
  if (uiLocale !== v) {
    uiLocale = v;
    uiComparerCaseSensitive = undefined;
  }
}
export function compareCaseSensitiveUI(a: string, b: string) {
  const comparer = uiComparerCaseSensitive || (uiComparerCaseSensitive = createUIStringComparer(uiLocale));
  return comparer(a, b);
}
export function compareProperties<T, K extends keyof T>(a: T | undefined, b: T | undefined, key: K, comparer: Comparer<T[K]>): Comparison {
  return a === b ? Comparison.EqualTo : a === undefined ? Comparison.LessThan : b === undefined ? Comparison.GreaterThan : comparer(a[key], b[key]);
}
export function compareBooleans(a: boolean, b: boolean): Comparison {
  return compareNumbers(a ? 1 : 0, b ? 1 : 0);
}
export function getSpellingSuggestion<T>(name: string, candidates: T[], getName: (candidate: T) => string | undefined): T | undefined {
  const maximumLengthDifference = Math.min(2, Math.floor(name.length * 0.34));
  let bestDistance = Math.floor(name.length * 0.4) + 1;
  let bestCandidate: T | undefined;
  let justCheckExactMatches = false;
  const nameLowerCase = name.toLowerCase();
  for (const candidate of candidates) {
    const candidateName = getName(candidate);
    if (candidateName !== undefined && Math.abs(candidateName.length - nameLowerCase.length) <= maximumLengthDifference) {
      const candidateNameLowerCase = candidateName.toLowerCase();
      if (candidateNameLowerCase === nameLowerCase) {
        if (candidateName === name) continue;
        return candidate;
      }
      if (justCheckExactMatches) continue;
      if (candidateName.length < 3) continue;
      const distance = levenshteinWithMax(nameLowerCase, candidateNameLowerCase, bestDistance - 1);
      if (distance === undefined) continue;
      if (distance < 3) {
        justCheckExactMatches = true;
        bestCandidate = candidate;
      } else {
        assert(distance < bestDistance);
        bestDistance = distance;
        bestCandidate = candidate;
      }
    }
  }
  return bestCandidate;
}
function levenshteinWithMax(s1: string, s2: string, max: number): number | undefined {
  let previous = new Array(s2.length + 1);
  let current = new Array(s2.length + 1);
  const big = max + 1;
  for (let i = 0; i <= s2.length; i++) {
    previous[i] = i;
  }
  for (let i = 1; i <= s1.length; i++) {
    const c1 = s1.charCodeAt(i - 1);
    const minJ = i > max ? i - max : 1;
    const maxJ = s2.length > max + i ? max + i : s2.length;
    current[0] = i;
    let colMin = i;
    for (let j = 1; j < minJ; j++) {
      current[j] = big;
    }
    for (let j = minJ; j <= maxJ; j++) {
      const dist = c1 === s2.charCodeAt(j - 1) ? previous[j - 1] : Math.min(previous[j - 1] + 2);
      current[j] = dist;
      colMin = Math.min(colMin, dist);
    }
    for (let j = maxJ + 1; j <= s2.length; j++) {
      current[j] = big;
    }
    if (colMin > max) return;
    const temp = previous;
    previous = current;
    current = temp;
  }
  const res = previous[s2.length];
  return res > max ? undefined : res;
}
export function endsWith(s: string, suff: string): boolean {
  const expectedPos = s.length - suff.length;
  return expectedPos >= 0 && s.indexOf(suff, expectedPos) === expectedPos;
}
export function removeSuffix(s: string, suff: string): string {
  return endsWith(s, suff) ? s.slice(0, s.length - suff.length) : s;
}
export function tryRemoveSuffix(s: string, suff: string): string | undefined {
  return endsWith(s, suff) ? s.slice(0, s.length - suff.length) : undefined;
}
export function stringContains(s: string, substring: string): boolean {
  return s.indexOf(substring) !== -1;
}
const indents: string[] = ['', '    '];
export function getIndentString(level: number) {
  if (indents[level] === undefined) {
    indents[level] = getIndentString(level - 1) + indents[1];
  }
  return indents[level];
}
export function getIndentSize() {
  return indents[1].length;
}
export const reservedPattern = /[^\w\s\/]/g;
export function regExpEscape(s: string) {
  const escape = (m: string) => {
    return '\\' + m;
  };
  return s.replace(reservedPattern, escape);
}
export function removeMinAndVersionNumbers(fileName: string) {
  const trailingMinOrVersion = /[.-]((min)|(\d+(\.\d+)*))$/;
  return fileName.replace(trailingMinOrVersion, '').replace(trailingMinOrVersion, '');
}
export function orderedRemoveItem<T>(array: T[], item: T): boolean {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      orderedRemoveItemAt(array, i);
      return true;
    }
  }
  return false;
}
export function orderedRemoveItemAt<T>(array: T[], index: number): void {
  for (let i = index; i < array.length - 1; i++) {
    array[i] = array[i + 1];
  }
  array.pop();
}
export function unorderedRemoveItemAt<T>(array: T[], index: number): void {
  array[index] = array[array.length - 1];
  array.pop();
}
export function unorderedRemoveItem<T>(array: T[], item: T) {
  return unorderedRemoveFirstItemWhere(array, (elem) => elem === item);
}
function unorderedRemoveFirstItemWhere<T>(array: T[], cb: (elem: T) => boolean) {
  for (let i = 0; i < array.length; i++) {
    if (cb(array[i])) {
      unorderedRemoveItemAt(array, i);
      return true;
    }
  }
  return false;
}
export type GetCanonicalFileName = (fileName: string) => string;
export function createGetCanonicalFileName(useCaseSensitiveFileNames: boolean): GetCanonicalFileName {
  return useCaseSensitiveFileNames ? identity : toFileNameLowerCase;
}
export interface Pattern {
  prefix: string;
  suffix: string;
}
export function patternText({ prefix, suffix }: Pattern): string {
  return `${prefix}*${suffix}`;
}
export function matchedText(pattern: Pattern, candidate: string): string {
  assert(isPatternMatch(pattern, candidate));
  return candidate.substring(pattern.prefix.length, candidate.length - pattern.suffix.length);
}
export function findBestPatternMatch<T>(values: readonly T[], getPattern: (value: T) => Pattern, candidate: string): T | undefined {
  let matchedValue: T | undefined;
  let longestMatchPrefixLength = -1;
  for (const v of values) {
    const pattern = getPattern(v);
    if (isPatternMatch(pattern, candidate) && pattern.prefix.length > longestMatchPrefixLength) {
      longestMatchPrefixLength = pattern.prefix.length;
      matchedValue = v;
    }
  }
  return matchedValue;
}
export function startsWith(s: string, pre: string): boolean {
  return s.lastIndexOf(pre, 0) === 0;
}
export function removePrefix(s: string, pre: string): string {
  return startsWith(s, pre) ? s.substr(pre.length) : s;
}
export function tryRemovePrefix(s: string, pre: string, getCanonicalFileName: GetCanonicalFileName = identity): string | undefined {
  return startsWith(getCanonicalFileName(s), getCanonicalFileName(pre)) ? s.substring(pre.length) : undefined;
}
function isPatternMatch({ prefix, suffix }: Pattern, candidate: string) {
  return candidate.length >= prefix.length + suffix.length && startsWith(candidate, prefix) && endsWith(candidate, suffix);
}
export function and<T>(f: (arg: T) => boolean, g: (arg: T) => boolean) {
  return (arg: T) => f(arg) && g(arg);
}
export function or<T extends unknown[]>(...fs: ((...args: T) => boolean)[]): (...args: T) => boolean {
  return (...args) => {
    for (const f of fs) {
      if (f(...args)) return true;
    }
    return false;
  };
}
export function not<T extends unknown[]>(fn: (...args: T) => boolean): (...args: T) => boolean {
  return (...args) => !fn(...args);
}
export function assertType<T>(_: T): void {}
export function singleElemArray<T>(t: T | undefined): T[] | undefined {
  return t === undefined ? undefined : [t];
}
export function enumerateInsertsAndDeletes<T, U>(
  newItems: readonly T[],
  oldItems: readonly U[],
  comparer: (a: T, b: U) => Comparison,
  inserted: (newItem: T) => void,
  deleted: (oldItem: U) => void,
  unchanged?: (oldItem: U, newItem: T) => void
) {
  unchanged = unchanged || noop;
  let newIndex = 0;
  let oldIndex = 0;
  const newLen = newItems.length;
  const oldLen = oldItems.length;
  while (newIndex < newLen && oldIndex < oldLen) {
    const newItem = newItems[newIndex];
    const oldItem = oldItems[oldIndex];
    const compareResult = comparer(newItem, oldItem);
    if (compareResult === Comparison.LessThan) {
      inserted(newItem);
      newIndex++;
    } else if (compareResult === Comparison.GreaterThan) {
      deleted(oldItem);
      oldIndex++;
    } else {
      unchanged(oldItem, newItem);
      newIndex++;
      oldIndex++;
    }
  }
  while (newIndex < newLen) {
    inserted(newItems[newIndex++]);
  }
  while (oldIndex < oldLen) {
    deleted(oldItems[oldIndex++]);
  }
}
export function fill<T>(length: number, cb: (index: number) => T): T[] {
  const r = Array<T>(length);
  for (let i = 0; i < length; i++) {
    r[i] = cb(i);
  }
  return r;
}
export function cartesianProduct<T>(ts: readonly T[][]) {
  const r: T[][] = [];
  const worker = (ts: readonly (readonly T[])[], outer: readonly T[] | undefined, i: number) => {
    for (const t of ts[i]) {
      let inner: T[];
      if (outer) {
        inner = outer.slice();
        inner.push(t);
      } else inner = [t];
      if (i === ts.length - 1) r.push(inner);
      else worker(ts, inner, i + 1);
    }
  };
  worker(ts, undefined, 0);
  return r;
}
export function padLeft(s: string, length: number) {
  while (s.length < length) {
    s = ' ' + s;
  }
  return s;
}
export function padRight(s: string, length: number) {
  while (s.length < length) {
    s = s + ' ';
  }
  return s;
}
export function isSynthesized(x: number): boolean;
export function isSynthesized(r: Range): boolean;
export function isSynthesized(x: Range | number) {
  //  x === undefined || x === null || isNaN(x) || x < 0;
  if (typeof x === 'number') return !(x >= 0);
  return isSynthesized(x.pos) || isSynthesized(x.end);
}
interface IteratorShim<T> {
  next(): { value: T; done?: false } | { value: never; done: true };
}
interface MapShim<T> {
  readonly size: number;
  get(key: string): T | undefined;
  set(key: string, value: T): this;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  keys(): IteratorShim<string>;
  values(): IteratorShim<T>;
  entries(): IteratorShim<[string, T]>;
  forEach(action: (value: T, key: string) => void): void;
}
export function createMapShim(): new <T>() => MapShim<T> {
  function createDictionaryObject<T>(): Record<string, T> {
    const map = Object.create(null);
    map.__ = undefined;
    delete map.__;
    return map;
  }
  interface MapEntry<T> {
    readonly key?: string;
    value?: T;
    nextEntry?: MapEntry<T>;
    previousEntry?: MapEntry<T>;
    skipNext?: boolean;
  }
  class MapIterator<T, U extends string | T | [string, T]> {
    private currentEntry?: MapEntry<T>;
    private selector: (key: string, value: T) => U;
    constructor(currentEntry: MapEntry<T>, selector: (key: string, value: T) => U) {
      this.currentEntry = currentEntry;
      this.selector = selector;
    }
    public next(): { value: U; done?: false } | { value: never; done: true } {
      while (this.currentEntry) {
        const skipNext = !!this.currentEntry.skipNext;
        this.currentEntry = this.currentEntry.nextEntry;
        if (!skipNext) break;
      }
      if (this.currentEntry) return { value: this.selector(this.currentEntry.key!, this.currentEntry.value!), done: false };
      return { value: undefined as never, done: true };
    }
  }
  return class<T> implements MapShim<T> {
    private data = createDictionaryObject<MapEntry<T>>();
    public size = 0;
    private readonly firstEntry: MapEntry<T>;
    private lastEntry: MapEntry<T>;
    constructor() {
      this.firstEntry = {};
      this.lastEntry = this.firstEntry;
    }
    get(key: string): T | undefined {
      const entry = this.data[key] as MapEntry<T> | undefined;
      return entry && entry.value!;
    }
    set(key: string, value: T): this {
      if (!this.has(key)) {
        this.size++;
        const newEntry: MapEntry<T> = { key, value };
        this.data[key] = newEntry;
        const previousLastEntry = this.lastEntry;
        previousLastEntry.nextEntry = newEntry;
        newEntry.previousEntry = previousLastEntry;
        this.lastEntry = newEntry;
      } else this.data[key].value = value;
      return this;
    }
    has(key: string): boolean {
      return key in this.data;
    }
    delete(key: string): boolean {
      if (this.has(key)) {
        this.size--;
        const entry = this.data[key];
        delete this.data[key];
        const previousEntry = entry.previousEntry!;
        previousEntry.nextEntry = entry.nextEntry;
        if (entry.nextEntry) entry.nextEntry.previousEntry = previousEntry;
        if (this.lastEntry === entry) this.lastEntry = previousEntry;
        entry.previousEntry = undefined;
        entry.nextEntry = previousEntry;
        entry.skipNext = true;
        return true;
      }
      return false;
    }
    clear() {
      this.data = createDictionaryObject<MapEntry<T>>();
      this.size = 0;
      const firstEntry = this.firstEntry;
      let currentEntry = firstEntry.nextEntry;
      while (currentEntry) {
        const nextEntry = currentEntry.nextEntry;
        currentEntry.previousEntry = undefined;
        currentEntry.nextEntry = firstEntry;
        currentEntry.skipNext = true;
        currentEntry = nextEntry;
      }
      firstEntry.nextEntry = undefined;
      this.lastEntry = firstEntry;
    }
    keys(): IteratorShim<string> {
      return new MapIterator(this.firstEntry, (key) => key);
    }
    values(): IteratorShim<T> {
      return new MapIterator(this.firstEntry, (_key, value) => value);
    }
    entries(): IteratorShim<[string, T]> {
      return new MapIterator(this.firstEntry, (key, value) => [key, value] as [string, T]);
    }
    forEach(action: (value: T, key: string) => void) {
      const iterator = this.entries();
      while (true) {
        const iterResult = iterator.next();
        if (iterResult.done) break;
        const [key, value] = iterResult.value;
        action(value, key);
      }
    }
  };
}
export interface Span {
  start: number;
  length: number;
}
export interface Range {
  pos: number;
  end: number;
}
export namespace Range {
  export interface Change {
    span: Span;
    newLength: number;
  }
}
export class TextSpan implements Span {
  static from(x: Range): TextSpan;
  static from(start: number, end: number): TextSpan;
  static from(x: Range | number, end = 0) {
    if (typeof x === 'number') return new TextSpan(x, end - x);
    return new TextSpan(x.pos, x.end - x.pos);
  }
  static end(s: Span) {
    return s.start + s.length;
  }
  static intersecting(s1: number, l1: number, s2: number, l2: number) {
    const e1 = s1 + l1;
    const e2 = s2 + l2;
    return s2 <= e1 && e2 >= s1;
  }
  static intersection(s1: Span, s2: Span) {
    const s = Math.max(s1.start, s2.start);
    const e = Math.min(this.end(s1), this.end(s2));
    return s <= e ? this.from(s, e) : undefined;
  }
  static overlap(s1: Span, s2: Span) {
    const r = this.intersection(s1, s2);
    return r?.length === 0 ? undefined : r;
  }
  constructor(public start = 0, public length = 0) {
    assert(start >= 0 && length >= 0);
  }
  get end() {
    return TextSpan.end(this);
  }
  isEmpty() {
    return this.length === 0;
  }
  contains(x: number): boolean;
  contains(x: Span): boolean;
  contains(x: Span | number) {
    if (typeof x === 'number') return x >= this.start && x < this.end;
    return x.start >= this.start && x.start + x.length <= this.end;
  }
  intersects(s: Span): boolean;
  intersects(start: number, length?: number): boolean;
  intersects(x: Span | number, length?: number) {
    if (typeof x === 'number') {
      if (length === undefined) return this.start <= x && x <= this.end;
      return TextSpan.intersecting(this.start, this.length, x, length);
    }
    return TextSpan.intersecting(this.start, this.length, x.start, x.length);
  }
  overlaps(s: Span) {
    return TextSpan.overlap(this, s) !== undefined;
  }
}
export class TextRange implements Range {
  static merge(src: (TextRange | undefined)[], dst?: (TextRange | undefined)[]) {
    if (!dst) dst = [];
    for (const k in src) {
      dst[k] = src[k];
    }
    return dst;
  }
  constructor(public pos = -1, public end = -1) {
    assert(pos <= end || end === -1);
  }
  isCollapsed() {
    return this.pos === this.end;
  }
  containsInclusive(p: number) {
    return p >= this.pos && p <= this.end;
  }
  setRange(r?: Range): this {
    if (r) {
      this.pos = r.pos;
      this.end = r.end;
    }
    return this;
  }
  movePos(p: number) {
    return new TextRange(p, this.end);
  }
  moveEnd(e: number) {
    return new TextRange(this.pos, e);
  }
}
export class TextChange implements Range.Change {
  static readonly unchanged = new TextChange();
  static collapse(cs: readonly Range.Change[]) {
    if (cs.length === 0) return this.unchanged;
    let c = cs[0];
    if (cs.length === 1) return new TextChange(c.span, c.newLength);
    let s = c.span.start;
    let e = TextSpan.end(c.span);
    let e2 = s + c.newLength;
    for (let i = 1; i < cs.length; i++) {
      c = cs[i];
      s = Math.min(s, c.span.start);
      const o = TextSpan.end(c.span);
      e = Math.max(e, e + (o - e2));
      const n = c.span.start + c.newLength;
      e2 = Math.max(n, n + (e2 - o));
    }
    return new TextChange(TextSpan.from(s, e), e2 - s);
  }
  constructor(public span: Span = new TextSpan(), public newLength = 0) {
    assert(newLength >= 0);
  }
  isUnchanged() {
    return this.span.length === 0 && this.newLength === 0;
  }
  toSpan() {
    return new TextSpan(this.span.start, this.newLength);
  }
}
export namespace perf {
  declare const performance: { now?(): number } | undefined;
  export const timestamp = typeof performance !== 'undefined' && performance.now ? () => performance.now!() : Date.now ? Date.now : () => +new Date();
  declare const onProfilerEvent: { (markName: string): void; profiler: boolean };
  const profilerEvent: (markName: string) => void = typeof onProfilerEvent === 'function' && onProfilerEvent.profiler === true ? onProfilerEvent : () => {};
  let enabled = false;
  let profilerStart = 0;
  let counts: QMap<number>;
  let marks: QMap<number>;
  let measures: QMap<number>;
  export interface Timer {
    enter(): void;
    exit(): void;
  }
  export function createTimerIf(condition: boolean, measureName: string, startMarkName: string, endMarkName: string) {
    return condition ? createTimer(measureName, startMarkName, endMarkName) : nullTimer;
  }
  export function createTimer(measureName: string, startMarkName: string, endMarkName: string): Timer {
    let enterCount = 0;
    return {
      enter,
      exit,
    };
    function enter() {
      if (++enterCount === 1) mark(startMarkName);
    }
    function exit() {
      if (--enterCount === 0) {
        mark(endMarkName);
        measure(measureName, startMarkName, endMarkName);
      } else if (enterCount < 0) {
        fail('enter/exit count does not match.');
      }
    }
  }
  export const nullTimer: Timer = { enter: noop, exit: noop };
  export function mark(markName: string) {
    if (enabled) {
      marks.set(markName, timestamp());
      counts.set(markName, (counts.get(markName) || 0) + 1);
      profilerEvent(markName);
    }
  }
  export function measure(measureName: string, startMarkName?: string, endMarkName?: string) {
    if (enabled) {
      const end = (endMarkName && marks.get(endMarkName)) || timestamp();
      const start = (startMarkName && marks.get(startMarkName)) || profilerStart;
      measures.set(measureName, (measures.get(measureName) || 0) + (end - start));
    }
  }
  export function getCount(markName: string) {
    return (counts && counts.get(markName)) || 0;
  }
  export function getDuration(measureName: string) {
    return (measures && measures.get(measureName)) || 0;
  }
  export function forEachMeasure(cb: (measureName: string, duration: number) => void) {
    measures.forEach((measure, key) => {
      cb(key, measure);
    });
  }
  export function enable() {
    counts = new QMap<number>();
    marks = new QMap<number>();
    measures = new QMap<number>();
    enabled = true;
    profilerStart = timestamp();
  }
  export function disable() {
    enabled = false;
  }
  type PerfLogger = typeof import('@microsoft/typescript-etw');
  const nullLogger: PerfLogger = {
    logEvent: noop,
    logErrEvent: noop,
    logPerfEvent: noop,
    logInfoEvent: noop,
    logStartCommand: noop,
    logStopCommand: noop,
    logStartUpdateProgram: noop,
    logStopUpdateProgram: noop,
    logStartUpdateGraph: noop,
    logStopUpdateGraph: noop,
    logStartResolveModule: noop,
    logStopResolveModule: noop,
    logStartParseSourceFile: noop,
    logStopParseSourceFile: noop,
    logStartReadFile: noop,
    logStopReadFile: noop,
    logStartBindFile: noop,
    logStopBindFile: noop,
    logStartScheduledOperation: noop,
    logStopScheduledOperation: noop,
  };
  let etwModule;
  try {
    etwModule = require('@microsoft/typescript-etw');
  } catch (e) {
    etwModule = undefined;
  }
  export const perfLogger: PerfLogger = etwModule && etwModule.logEvent ? etwModule : nullLogger;
}
export function compareDataObjects(dst: any, src: any): boolean {
  if (!dst || !src || Object.keys(dst).length !== Object.keys(src).length) return false;
  for (const e in dst) {
    if (typeof dst[e] === 'object') {
      if (!compareDataObjects(dst[e], src[e])) return false;
    } else if (typeof dst[e] !== 'function') {
      if (dst[e] !== src[e]) return false;
    }
  }
  return true;
}
export function clearMap<T>(map: { forEach: QMap<T>['forEach']; clear: QMap<T>['clear'] }, onDeleteValue: (valueInMap: T, key: string) => void) {
  map.forEach(onDeleteValue);
  map.clear();
}
export interface MutateMapSkippingNewValuesOpts<T, U> {
  onDeleteValue(existingValue: T, key: string): void;
  onExistingValue?(existingValue: T, valueInNewMap: U, key: string): void;
}
export function mutateMapSkippingNewValues<T, U>(map: QMap<T>, newMap: QReadonlyMap<U>, opts: MutateMapSkippingNewValuesOpts<T, U>) {
  const { onDeleteValue, onExistingValue } = opts;
  map.forEach((existingValue, key) => {
    const valueInNewMap = newMap.get(key);
    if (valueInNewMap === undefined) {
      map.delete(key);
      onDeleteValue(existingValue, key);
    } else if (onExistingValue) {
      onExistingValue(existingValue, valueInNewMap, key);
    }
  });
}
export interface MutateMapOpts<T, U> extends MutateMapSkippingNewValuesOpts<T, U> {
  createNewValue(key: string, valueInNewMap: U): T;
}
export function mutateMap<T, U>(map: QMap<T>, newMap: QReadonlyMap<U>, opts: MutateMapOpts<T, U>) {
  mutateMapSkippingNewValues(map, newMap, opts);
  const { createNewValue } = opts;
  newMap.forEach((valueInNewMap, key) => {
    if (!map.has(key)) {
      map.set(key, createNewValue(key, valueInNewMap));
    }
  });
}
export function addToSeen(seen: QMap<true>, key: string | number): boolean;
export function addToSeen<T>(seen: QMap<T>, key: string | number, value: T): boolean;
export function addToSeen<T>(seen: QMap<T>, key: string | number, value: T = true as any): boolean {
  key = String(key);
  if (seen.has(key)) return false;
  seen.set(key, value);
  return true;
}
export function formatStringFromArgs(text: string, args: ArrayLike<string | number>, baseIndex = 0): string {
  return text.replace(/{(\d+)}/g, (_match, index: string) => '' + checkDefined(args[+index + baseIndex]));
}
export function isJsonEqual(a: unknown, b: unknown): boolean {
  return a === b || (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null && equalOwnProperties(a as MapLike<unknown>, b as MapLike<unknown>, isJsonEqual));
}
export function getOrUpdate<T>(map: QMap<T>, key: string, getDefault: () => T): T {
  const got = map.get(key);
  if (got === undefined) {
    const value = getDefault();
    map.set(key, value);
    return value;
  }
  return got;
}
export function arrayIsHomogeneous<T>(ts: readonly T[], c: EqComparer<T> = equateValues) {
  if (ts.length < 2) return true;
  const first = ts[0];
  for (let i = 1, l = ts.length; i < l; i++) {
    const t = ts[i];
    if (!c(first, t)) return false;
  }
  return true;
}
export function matchPatternOrExact(ss: readonly string[], candidate: string): string | Pattern | undefined {
  const ps: Pattern[] = [];
  for (const s of ss) {
    if (!s.includes('*')) continue;
    const pattern = tryParsePattern(s);
    if (pattern) ps.push(pattern);
    else if (s === candidate) return s;
  }
  return findBestPatternMatch(ps, (_) => _, candidate);
}
export type Mutable<T extends object> = { -readonly [K in keyof T]: T[K] };
export function sliceAfter<T>(ts: readonly T[], t: T): readonly T[] {
  const i = ts.indexOf(t);
  assert(i !== -1);
  return ts.slice(i);
}
export function minAndMax<T>(ts: readonly T[], getValue: (t: T) => number): { readonly min: number; readonly max: number } {
  assert(ts.length !== 0);
  let min = getValue(ts[0]);
  let max = min;
  for (let i = 1; i < ts.length; i++) {
    const t = getValue(ts[i]);
    if (t < min) min = t;
    else if (t > max) max = t;
  }
  return { min, max };
}
export function tryParsePattern(s: string): Pattern | undefined {
  assert(s.includes('*'));
  const i = s.indexOf('*');
  return i === -1
    ? undefined
    : {
        prefix: s.substr(0, i),
        suffix: s.substr(i + 1),
      };
}
export function getPropertyNameForKnownSymbolName(s: string): __String {
  return ('__@' + s) as __String;
}
export function hasChangesInResolutions<T>(
  names: readonly string[],
  newResolutions: readonly T[],
  oldResolutions: QReadonlyMap<T> | undefined,
  comparer: (oldResolution: T, newResolution: T) => boolean
): boolean {
  assert(names.length === newResolutions.length);
  for (let i = 0; i < names.length; i++) {
    const newResolution = newResolutions[i];
    const oldResolution = oldResolutions && oldResolutions.get(names[i]);
    const changed = oldResolution ? !newResolution || !comparer(oldResolution, newResolution) : newResolution;
    if (changed) return true;
  }
  return false;
}
export namespace semver {
  const versionRegExp = /^(0|[1-9]\d*)(?:\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*)(?:\-([a-z0-9-.]+))?(?:\+([a-z0-9-.]+))?)?)?$/i;
  const prereleaseRegExp = /^(?:0|[1-9]\d*|[a-z-][a-z0-9-]*)(?:\.(?:0|[1-9]\d*|[a-z-][a-z0-9-]*))*$/i;
  const buildRegExp = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/i;
  const numericIdentifierRegExp = /^(0|[1-9]\d*)$/;
  export class Version {
    static readonly zero = new Version(0, 0, 0);
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    readonly prerelease: readonly string[];
    readonly build: readonly string[];
    constructor(text: string);
    constructor(major: number, minor?: number, patch?: number, prerelease?: string, build?: string);
    constructor(major: number | string, minor = 0, patch = 0, prerelease = '', build = '') {
      if (typeof major === 'string') {
        const result = checkDefined(tryParseComponents(major), 'Invalid version');
        ({ major, minor, patch, prerelease, build } = result);
      }
      assert(major >= 0, 'Invalid arg: major');
      assert(minor >= 0, 'Invalid arg: minor');
      assert(patch >= 0, 'Invalid arg: patch');
      assert(!prerelease || prereleaseRegExp.test(prerelease), 'Invalid arg: prerelease');
      assert(!build || buildRegExp.test(build), 'Invalid arg: build');
      this.major = major;
      this.minor = minor;
      this.patch = patch;
      this.prerelease = prerelease ? prerelease.split('.') : empty;
      this.build = build ? build.split('.') : empty;
    }
    static tryParse(text: string) {
      const result = tryParseComponents(text);
      if (!result) return;
      const { major, minor, patch, prerelease, build } = result;
      return new Version(major, minor, patch, prerelease, build);
    }
    compareTo(other: Version | undefined) {
      if (this === other) return Comparison.EqualTo;
      if (other === undefined) return Comparison.GreaterThan;
      return (
        compareNumbers(this.major, other.major) || compareNumbers(this.minor, other.minor) || compareNumbers(this.patch, other.patch) || comparePrerelaseIdentifiers(this.prerelease, other.prerelease)
      );
    }
    increment(field: 'major' | 'minor' | 'patch') {
      switch (field) {
        case 'major':
          return new Version(this.major + 1, 0, 0);
        case 'minor':
          return new Version(this.major, this.minor + 1, 0);
        case 'patch':
          return new Version(this.major, this.minor, this.patch + 1);
        default:
          return assertNever(field);
      }
    }
    toString() {
      let result = `${this.major}.${this.minor}.${this.patch}`;
      if (some(this.prerelease)) result += `-${this.prerelease.join('.')}`;
      if (some(this.build)) result += `+${this.build.join('.')}`;
      return result;
    }
  }
  function tryParseComponents(text: string) {
    const match = versionRegExp.exec(text);
    if (!match) return;
    const [, major, minor = '0', patch = '0', prerelease = '', build = ''] = match;
    if (prerelease && !prereleaseRegExp.test(prerelease)) return;
    if (build && !buildRegExp.test(build)) return;
    return {
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      patch: parseInt(patch, 10),
      prerelease,
      build,
    };
  }
  function comparePrerelaseIdentifiers(left: readonly string[], right: readonly string[]) {
    if (left === right) return Comparison.EqualTo;
    if (left.length === 0) return right.length === 0 ? Comparison.EqualTo : Comparison.GreaterThan;
    if (right.length === 0) return Comparison.LessThan;
    const length = Math.min(left.length, right.length);
    for (let i = 0; i < length; i++) {
      const leftIdentifier = left[i];
      const rightIdentifier = right[i];
      if (leftIdentifier === rightIdentifier) continue;
      const leftIsNumeric = numericIdentifierRegExp.test(leftIdentifier);
      const rightIsNumeric = numericIdentifierRegExp.test(rightIdentifier);
      if (leftIsNumeric || rightIsNumeric) {
        if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? Comparison.LessThan : Comparison.GreaterThan;
        const result = compareNumbers(+leftIdentifier, +rightIdentifier);
        if (result) return result;
      } else {
        const result = compareCaseSensitive(leftIdentifier, rightIdentifier);
        if (result) return result;
      }
    }
    return compareNumbers(left.length, right.length);
  }
  export class VersionRange {
    private _alternatives: readonly (readonly Comparator[])[];
    constructor(spec: string) {
      this._alternatives = spec ? checkDefined(parseRange(spec), 'Invalid range spec.') : empty;
    }
    static tryParse(text: string) {
      const sets = parseRange(text);
      if (sets) {
        const range = new VersionRange('');
        range._alternatives = sets;
        return range;
      }
      return;
    }
    test(version: Version | string) {
      if (typeof version === 'string') version = new Version(version);
      return testDisjunction(version, this._alternatives);
    }
    toString() {
      return formatDisjunction(this._alternatives);
    }
  }
  interface Comparator {
    readonly operator: '<' | '<=' | '>' | '>=' | '=';
    readonly operand: Version;
  }
  const logicalOrRegExp = /\s*\|\|\s*/g;
  const whitespaceRegExp = /\s+/g;
  const partialRegExp = /^([xX*0]|[1-9]\d*)(?:\.([xX*0]|[1-9]\d*)(?:\.([xX*0]|[1-9]\d*)(?:-([a-z0-9-.]+))?(?:\+([a-z0-9-.]+))?)?)?$/i;
  const hyphenRegExp = /^\s*([a-z0-9-+.*]+)\s+-\s+([a-z0-9-+.*]+)\s*$/i;
  const rangeRegExp = /^\s*(~|\^|<|<=|>|>=|=)?\s*([a-z0-9-+.*]+)$/i;
  function parseRange(text: string) {
    const alternatives: Comparator[][] = [];
    for (const range of text.trim().split(logicalOrRegExp)) {
      if (!range) continue;
      const comparators: Comparator[] = [];
      const match = hyphenRegExp.exec(range);
      if (match) {
        if (!parseHyphen(match[1], match[2], comparators)) return;
      } else {
        for (const simple of range.split(whitespaceRegExp)) {
          const match = rangeRegExp.exec(simple);
          if (!match || !parseComparator(match[1], match[2], comparators)) return;
        }
      }
      alternatives.push(comparators);
    }
    return alternatives;
  }
  function parsePartial(text: string) {
    const match = partialRegExp.exec(text);
    if (!match) return;
    const [, major, minor = '*', patch = '*', prerelease, build] = match;
    const version = new Version(
      isWildcard(major) ? 0 : parseInt(major, 10),
      isWildcard(major) || isWildcard(minor) ? 0 : parseInt(minor, 10),
      isWildcard(major) || isWildcard(minor) || isWildcard(patch) ? 0 : parseInt(patch, 10),
      prerelease,
      build
    );
    return { version, major, minor, patch };
  }
  function parseHyphen(left: string, right: string, comparators: Comparator[]) {
    const leftResult = parsePartial(left);
    if (!leftResult) return false;
    const rightResult = parsePartial(right);
    if (!rightResult) return false;
    if (!isWildcard(leftResult.major)) {
      comparators.push(createComparator('>=', leftResult.version));
    }
    if (!isWildcard(rightResult.major)) {
      comparators.push(
        isWildcard(rightResult.minor)
          ? createComparator('<', rightResult.version.increment('major'))
          : isWildcard(rightResult.patch)
          ? createComparator('<', rightResult.version.increment('minor'))
          : createComparator('<=', rightResult.version)
      );
    }
    return true;
  }
  function parseComparator(operator: string, text: string, comparators: Comparator[]) {
    const result = parsePartial(text);
    if (!result) return false;
    const { version, major, minor, patch } = result;
    if (!isWildcard(major)) {
      switch (operator) {
        case '~':
          comparators.push(createComparator('>=', version));
          comparators.push(createComparator('<', version.increment(isWildcard(minor) ? 'major' : 'minor')));
          break;
        case '^':
          comparators.push(createComparator('>=', version));
          comparators.push(createComparator('<', version.increment(version.major > 0 || isWildcard(minor) ? 'major' : version.minor > 0 || isWildcard(patch) ? 'minor' : 'patch')));
          break;
        case '<':
        case '>=':
          comparators.push(createComparator(operator, version));
          break;
        case '<=':
        case '>':
          comparators.push(
            isWildcard(minor)
              ? createComparator(operator === '<=' ? '<' : '>=', version.increment('major'))
              : isWildcard(patch)
              ? createComparator(operator === '<=' ? '<' : '>=', version.increment('minor'))
              : createComparator(operator, version)
          );
          break;
        case '=':
        case undefined:
          if (isWildcard(minor) || isWildcard(patch)) {
            comparators.push(createComparator('>=', version));
            comparators.push(createComparator('<', version.increment(isWildcard(minor) ? 'major' : 'minor')));
          } else {
            comparators.push(createComparator('=', version));
          }
          break;
        default:
          return false;
      }
    } else if (operator === '<' || operator === '>') {
      comparators.push(createComparator('<', Version.zero));
    }
    return true;
  }
  function isWildcard(part: string) {
    return part === '*' || part === 'x' || part === 'X';
  }
  function createComparator(operator: Comparator['operator'], operand: Version) {
    return { operator, operand };
  }
  function testDisjunction(version: Version, alternatives: readonly (readonly Comparator[])[]) {
    if (alternatives.length === 0) return true;
    for (const alternative of alternatives) {
      if (testAlternative(version, alternative)) return true;
    }
    return false;
  }
  function testAlternative(version: Version, comparators: readonly Comparator[]) {
    for (const comparator of comparators) {
      if (!testComparator(version, comparator.operator, comparator.operand)) return false;
    }
    return true;
  }
  function testComparator(version: Version, operator: Comparator['operator'], operand: Version) {
    const cmp = version.compareTo(operand);
    switch (operator) {
      case '<':
        return cmp < 0;
      case '<=':
        return cmp <= 0;
      case '>':
        return cmp > 0;
      case '>=':
        return cmp >= 0;
      case '=':
        return cmp === 0;
      default:
        return assertNever(operator);
    }
  }
  function formatDisjunction(alternatives: readonly (readonly Comparator[])[]) {
    return map(alternatives, formatAlternative).join(' || ') || '*';
  }
  function formatAlternative(comparators: readonly Comparator[]) {
    return map(comparators, formatComparator).join(' ');
  }
  function formatComparator(comparator: Comparator) {
    return `${comparator.operator}${comparator.operand}`;
  }
}
export function hostUsesCaseSensitiveFileNames(host: { useCaseSensitiveFileNames?(): boolean }): boolean {
  return host.useCaseSensitiveFileNames ? host.useCaseSensitiveFileNames() : false;
}
export function hostGetCanonicalFileName(host: { useCaseSensitiveFileNames?(): boolean }): GetCanonicalFileName {
  return createGetCanonicalFileName(hostUsesCaseSensitiveFileNames(host));
}
