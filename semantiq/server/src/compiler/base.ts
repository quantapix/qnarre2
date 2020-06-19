namespace qnr {
  export namespace qa {
    export function fail(m?: string, mark?: AnyFunction): never {
      debugger;
      const e = new Error(m ? `Debug Failure. ${m}` : 'Debug Failure.');
      Error.captureStackTrace(e, mark || fail);
      throw e;
    }
    export function assert(cond: unknown, m?: string, info?: string | (() => string), mark?: AnyFunction): asserts cond {
      if (!cond) {
        m = m ? `False expression: ${m}` : 'False expression.';
        if (info) m += '\r\nVerbose Debug Info: ' + (typeof info === 'string' ? info : info());
        fail(m, mark || assert);
      }
    }
    export const emptyArray = [] as never[];
    export function length(ts?: readonly unknown[]) {
      return ts ? ts.length : 0;
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
    export function forEach<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U | undefined): U | undefined {
      if (ts) {
        for (let i = 0; i < ts.length; i++) {
          const u = cb(ts[i], i);
          if (u) return u;
        }
      }
      return;
    }
    export function forEachEntry<T, U>(m: ReadonlyUnderscoreEscapedMap<T>, cb: (t: T, k: __String) => U | undefined): U | undefined;
    export function forEachEntry<T, U>(m: QReadonlyMap<T>, cb: (t: T, k: string) => U | undefined): U | undefined;
    export function forEachEntry<T, U>(m: ReadonlyUnderscoreEscapedMap<T> | QReadonlyMap<T>, cb: (t: T, k: string & __String) => U | undefined): U | undefined {
      const ts = m.entries();
      for (let i = ts.next(); !i.done; i = ts.next()) {
        const [k, t] = i.value;
        const u = cb(t, k as string & __String);
        if (u) return u;
      }
      return;
    }
    export function forEachKey<T>(m: ReadonlyUnderscoreEscapedMap<{}>, cb: (k: __String) => T | undefined): T | undefined;
    export function forEachKey<T>(m: QReadonlyMap<{}>, cb: (k: string) => T | undefined): T | undefined;
    export function forEachKey<T>(m: ReadonlyUnderscoreEscapedMap<{}> | QReadonlyMap<{}>, cb: (k: string & __String) => T | undefined): T | undefined {
      const ks = m.keys();
      for (let i = ks.next(); !i.done; i = ks.next()) {
        const t = cb(i.value as string & __String);
        if (t) return t;
      }
      return;
    }
    export function copyEntries<T>(s: ReadonlyUnderscoreEscapedMap<T>, t: UnderscoreEscapedMap<T>): void;
    export function copyEntries<T>(s: QReadonlyMap<T>, t: QMap<T>): void;
    export function copyEntries<T, U extends UnderscoreEscapedMap<T> | QMap<T>>(s: U, t: U): void {
      (s as QMap<T>).forEach((v, k) => {
        (t as QMap<T>).set(k, v);
      });
    }
    export function arrayToSet(ts: readonly string[]): QMap<true>;
    export function arrayToSet<T>(ts: readonly T[], key: (t: T) => string | undefined): QMap<true>;
    export function arrayToSet<T>(ts: readonly T[], key: (t: T) => __String | undefined): UnderscoreEscapedMap<true>;
    export function arrayToSet(ts: readonly any[], key?: (t: any) => string | __String | undefined): QMap<true> | UnderscoreEscapedMap<true> {
      return arrayToMap<any, true>(ts, key || ((t) => t), () => true);
    }
    export function forEachRight<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U | undefined): U | undefined {
      if (ts) {
        for (let i = ts.length - 1; i >= 0; i--) {
          const u = cb(ts[i], i);
          if (u) return u;
        }
      }
      return;
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
    export function contains<T>(ts: readonly T[] | undefined, x: T, eq: EqualityComparer<T> = equateValues): boolean {
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
    export interface MapLike<T> {
      [k: string]: T;
    }
    export class QMap<T> extends Map<string, T> {
      reverse() {
        const r = [] as string[];
        this.forEach((v, k) => {
          if (typeof v === 'number') r[v] = k;
        });
        return r;
      }
    }
    export namespace QMap {
      export function create<T>(es?: MapLike<T> | [string, T][]): QMap<T> {
        const m = new QMap<T>();
        if (isArray(es)) {
          for (const [k, v] of es) {
            m.set(k, v);
          }
        } else if (es) {
          for (const k in es) {
            if (hasOwnProperty.call(es, k)) {
              m.set(k, es[k]);
            }
          }
        }
        return m;
      }
    }
    export type QReadonlyMap<V> = ReadonlyMap<string, V>;
    export interface QIterator<T> {
      next(): { value: T; done?: false } | { value: never; done: true };
    }
    export interface Push<T> {
      push(...ts: T[]): void;
    }
    export interface SortedArray<T> extends Array<T> {
      ' __sortedArrayBrand': any;
    }
    export interface SortedReadonlyArray<T> extends ReadonlyArray<T> {
      ' __sortedArrayBrand': any;
    }
    export type EqualityComparer<T> = (a: T, b: T) => boolean;
    export type Comparer<T> = (a: T, b: T) => Comparison;
    export const enum Comparison {
      LessThan = -1,
      EqualTo = 0,
      GreaterThan = 1,
    }
    export function zipWith<T, U, V>(ts: readonly T[], us: readonly U[], cb: (a: T, b: U, i: number) => V): V[] {
      const vs: V[] = [];
      Debug.assertEqual(ts.length, us.length);
      for (let i = 0; i < ts.length; i++) {
        vs.push(cb(ts[i], us[i], i));
      }
      return vs;
    }
    export function zipToIterator<T, U>(ts: readonly T[], us: readonly U[]): Iterator<[T, U]> {
      Debug.assertEqual(ts.length, us.length);
      let i = 0;
      return {
        next() {
          if (i === ts.length) return { value: undefined as never, done: true };
          i++;
          return { value: [ts[i - 1], us[i - 1]] as [T, U], done: false };
        },
      };
    }
    export function zipToMap<T>(ks: readonly string[], ts: readonly T[]): QMap<T> {
      Debug.assertEqual(ks.length, ts.length);
      const r = QMap.create<T>();
      for (let i = 0; i < ks.length; ++i) {
        r.set(ks[i], ts[i]);
      }
      return r;
    }
    export function arraysEqual<T>(a: readonly T[], b: readonly T[], eq: EqualityComparer<T> = equateValues): boolean {
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
      return us || emptyArray;
    }
    export function flatMapToMutable<T, U>(ts: readonly T[] | undefined, cb: (t: T, i: number) => U | readonly U[] | undefined): U[] {
      const r: U[] = [];
      if (ts) {
        for (let i = 0; i < ts.length; i++) {
          const v = cb(ts[i], i);
          if (v) {
            if (isArray(v)) {
              addRange(r, v);
            } else {
              r.push(v);
            }
          }
        }
      }
      return r;
    }
    export function flatMapIterator<T, U>(ts: Iterator<T>, cb: (t: T) => readonly U[] | Iterator<U> | undefined): Iterator<U> {
      const t = ts.next();
      if (t.done) return emptyIterator;
      const getUs = (t: T): Iterator<U> => {
        const u = cb(t);
        return u === undefined ? emptyIterator : isArray(u) ? arrayIterator(u) : u;
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
    export function mapDefinedMap<T, U>(ts: QReadonlyMap<T>, mv: (t: T, k: string) => U | undefined, mk: (k: string) => string = identity): QMap<U> {
      const us = QMap.create<U>();
      ts.forEach((t, k) => {
        const u = mv(t, k);
        if (u !== undefined) us.set(mk(k), u);
      });
      return us;
    }
    export const emptyIterator: Iterator<never> = { next: () => ({ value: undefined as never, done: true }) };
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
    export function mapEntries<T, U>(map: QReadonlyMap<T>, f: (key: string, value: T) => [string, U]): QMap<U>;
    export function mapEntries<T, U>(map: QReadonlyMap<T> | undefined, f: (key: string, value: T) => [string, U]): QMap<U> | undefined;
    export function mapEntries<T, U>(map: QReadonlyMap<T> | undefined, f: (key: string, value: T) => [string, U]): QMap<U> | undefined {
      if (!map) return;
      const us = QMap.create<U>();
      map.forEach((value, key) => {
        const [newKey, newValue] = f(key, value);
        us.set(newKey, newValue);
      });
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
    function deduplicateRelational<T>(ts: readonly T[], eq: EqualityComparer<T>, comparer: Comparer<T>) {
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
    function deduplicateEquality<T>(ts: readonly T[], eq: EqualityComparer<T>) {
      const r: T[] = [];
      for (const item of ts) {
        pushIfUnique(r, item, eq);
      }
      return r;
    }
    export function deduplicate<T>(ts: readonly T[], eq: EqualityComparer<T>, comparer?: Comparer<T>): T[] {
      return ts.length === 0 ? [] : ts.length === 1 ? ts.slice() : comparer ? deduplicateRelational(ts, eq, comparer) : deduplicateEquality(ts, eq);
    }
    function deduplicateSorted<T>(ts: SortedReadonlyArray<T>, comparer: EqualityComparer<T> | Comparer<T>): SortedReadonlyArray<T> {
      if (ts.length === 0) return (emptyArray as any) as SortedReadonlyArray<T>;
      let last = ts[0];
      const deduplicated: T[] = [last];
      for (let i = 1; i < ts.length; i++) {
        const next = ts[i];
        switch (comparer(next, last)) {
          case true:
          // falls through
          case Comparison.EqualTo:
            continue;
          case Comparison.LessThan:
            return fail('Array is unsorted.');
        }
        deduplicated.push((last = next));
      }
      return (deduplicated as any) as SortedReadonlyArray<T>;
    }
    export function insertSorted<T>(ts: SortedArray<T>, insert: T, compare: Comparer<T>): void {
      if (ts.length === 0) {
        ts.push(insert);
        return;
      }
      const insertIndex = binarySearch(ts, insert, identity, compare);
      if (insertIndex < 0) {
        ts.splice(~insertIndex, 0, insert);
      }
    }
    export function sortAndDeduplicate<T>(ts: readonly string[]): SortedReadonlyArray<string>;
    export function sortAndDeduplicate<T>(ts: readonly T[], comparer: Comparer<T>, eq?: EqualityComparer<T>): SortedReadonlyArray<T>;
    export function sortAndDeduplicate<T>(ts: readonly T[], comparer?: Comparer<T>, eq?: EqualityComparer<T>): SortedReadonlyArray<T> {
      return deduplicateSorted(sort(ts, comparer), eq || comparer || ((compareStringsCaseSensitive as any) as Comparer<T>));
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
        if (ob > 0) Debug.assertGreaterThanOrEqual(c(b[ob], b[ob - 1]), Comparison.EqualTo);
        loopA: for (const startA = oa; oa < a.length; oa++) {
          if (oa > startA) Debug.assertGreaterThanOrEqual(c(a[oa], a[oa - 1]), Comparison.EqualTo);
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
    export function append<TArray extends any[] | undefined, TValue extends NonNullable<TArray>[number] | undefined>(
      to: TArray,
      value: TValue
    ): [undefined, undefined] extends [TArray, TValue] ? TArray : NonNullable<TArray>[number][];
    export function append<T>(to: T[], v?: T): T[];
    export function append<T>(to: T[] | undefined, v: T): T[];
    //export function append<T>(to: Push<T>, v?: T): Push<T>;
    export function append<T>(to?: T[], v?: T): T[] | undefined {
      if (v === undefined) return to;
      if (to === undefined) return [v];
      to.push(v);
      return to;
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
    export function pushIfUnique<T>(ts: T[], toAdd: T, eq?: EqualityComparer<T>): boolean {
      if (contains(ts, toAdd, eq)) return false;
      ts.push(toAdd);
      return true;
    }
    export function appendIfUnique<T>(ts: T[] | undefined, toAdd: T, eq?: EqualityComparer<T>): T[] {
      if (ts) {
        pushIfUnique(ts, toAdd, eq);
        return ts;
      }
      return [toAdd];
    }
    function stableSortIndices<T>(ts: readonly T[], indices: number[], comparer: Comparer<T>) {
      indices.sort((x, y) => comparer(ts[x], ts[y]) || compareValues(x, y));
    }
    export function sort<T>(ts: readonly T[], comparer?: Comparer<T>): SortedReadonlyArray<T> {
      return (ts.length === 0 ? ts : ts.slice().sort(comparer)) as SortedReadonlyArray<T>;
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
    export function stableSort<T>(ts: readonly T[], comparer: Comparer<T>): SortedReadonlyArray<T> {
      const indices = indicesOf(ts);
      stableSortIndices(ts, indices, comparer);
      return (indices.map((i) => ts[i]) as SortedArray<T>) as SortedReadonlyArray<T>;
    }
    export function rangeEquals<T>(a: readonly T[], b: readonly T[], pos: number, end: number) {
      while (pos < end) {
        if (a[pos] !== b[pos]) return false;
        pos++;
      }
      return true;
    }
    export function elementAt<T>(ts: readonly T[] | undefined, offset: number): T | undefined {
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
    export function replaceElement<T>(ts: readonly T[], index: number, value: T): T[] {
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
    export function reduceLeft<T>(ts: T[], f: (memo: T, t: T, i: number) => T, initial?: T, start?: number, count?: number): T | undefined {
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
    const hasOwnProperty = Object.prototype.hasOwnProperty;
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
    export function equalOwnProperties<T>(left: MapLike<T> | undefined, right: MapLike<T> | undefined, eq: EqualityComparer<T> = equateValues) {
      if (left === right) return true;
      if (!left || !right) return false;
      for (const key in left) {
        if (hasOwnProperty.call(left, key)) {
          if (!hasOwnProperty.call(right, key)) return false;
          if (!eq(left[key], right[key])) return false;
        }
      }
      for (const key in right) {
        if (hasOwnProperty.call(right, key)) {
          if (!hasOwnProperty.call(left, key)) return false;
        }
      }
      return true;
    }
    export function arrayToMap<T>(array: readonly T[], makeKey: (value: T) => string | undefined): QMap<T>;
    export function arrayToMap<T, U>(array: readonly T[], makeKey: (value: T) => string | undefined, makeValue: (value: T) => U): QMap<U>;
    export function arrayToMap<T, U>(array: readonly T[], makeKey: (value: T) => string | undefined, makeValue: (value: T) => T | U = identity): QMap<T | U> {
      const r = QMap.create<T | U>();
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
    export function arrayToMultiMap<T>(values: readonly T[], makeKey: (value: T) => string): QMultiMap<T>;
    export function arrayToMultiMap<T, U>(values: readonly T[], makeKey: (value: T) => string, makeValue: (value: T) => U): QMultiMap<U>;
    export function arrayToMultiMap<T, U>(values: readonly T[], makeKey: (value: T) => string, makeValue: (value: T) => T | U = identity): QMultiMap<T | U> {
      const r = createMultiMap<T | U>();
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
    export function mapMap<T, U>(map: QMap<T>, f: (t: T, key: string) => [string, U]): QMap<U>;
    export function mapMap<T, U>(map: UnderscoreEscapedMap<T>, f: (t: T, key: __String) => [string, U]): QMap<U>;
    export function mapMap<T, U>(map: QMap<T> | UnderscoreEscapedMap<T>, f: ((t: T, key: string) => [string, U]) | ((t: T, key: __String) => [string, U])): QMap<U> {
      const r = QMap.create<U>();
      map.forEach((t: T, key: string & __String) => r.set(...f(t, key)));
      return r;
    }
    export interface QMultiMap<T> extends QMap<T[]> {
      add(key: string, value: T): T[];
      remove(key: string, value: T): void;
    }
    export function createMultiMap<T>(): QMultiMap<T> {
      const map = QMap.create<T[]>() as QMultiMap<T>;
      map.add = multiMapAdd;
      map.remove = multiMapRemove;
      return map;
    }
    function multiMapAdd<T>(this: QMultiMap<T>, key: string, value: T) {
      let values = this.get(key);
      if (values) values.push(value);
      else this.set(key, (values = [value]));
      return values;
    }
    function multiMapRemove<T>(this: QMultiMap<T>, key: string, value: T) {
      const values = this.get(key);
      if (values) {
        unorderedRemoveItem(values, value);
        if (!values.length) this.delete(key);
      }
    }
    export interface UnderscoreEscapedMultiMap<T> extends UnderscoreEscapedMap<T[]> {
      add(key: __String, value: T): T[];
      remove(key: __String, value: T): void;
    }
    export function createUnderscoreEscapedMultiMap<T>(): UnderscoreEscapedMultiMap<T> {
      return createMultiMap<T>() as UnderscoreEscapedMultiMap<T>;
    }
    export function isString(text: unknown): text is string {
      return typeof text === 'string';
    }
    export function isNumber(x: unknown): x is number {
      return typeof x === 'number';
    }
    export function tryCast<TOut extends TIn, TIn = any>(value: TIn | undefined, test: (value: TIn) => value is TOut): TOut | undefined;
    export function tryCast<T>(value: T, test: (value: T) => boolean): T | undefined;
    export function tryCast<T>(value: T, test: (value: T) => boolean): T | undefined {
      return value !== undefined && test(value) ? value : undefined;
    }
    export function cast<TOut extends TIn, TIn = any>(value: TIn | undefined, test: (value: TIn) => value is TOut): TOut {
      if (value !== undefined && test(value)) return value;
      return fail(`Invalid cast. The supplied value ${value} did not pass the test '${Debug.getFunctionName(test)}'.`);
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
    export function compose<T>(...args: ((t: T) => T)[]): (t: T) => T;
    export function compose<T>(a: (t: T) => T, b: (t: T) => T, c: (t: T) => T, d: (t: T) => T, e: (t: T) => T): (t: T) => T {
      if (!!e) {
        const args: ((t: T) => T)[] = [];
        for (let i = 0; i < arguments.length; i++) {
          args[i] = arguments[i];
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
    export const enum AssertionLevel {
      None = 0,
      Normal = 1,
      Aggressive = 2,
      VeryAggressive = 3,
    }
    export type AnyFunction = (...args: never[]) => void;
    export type AnyConstructor = new (...args: unknown[]) => unknown;
    export function equateValues<T>(a: T, b: T) {
      return a === b;
    }
    export function equateStringsCaseInsensitive(a: string, b: string) {
      return a === b || (a !== undefined && b !== undefined && a.toUpperCase() === b.toUpperCase());
    }
    export function equateStringsCaseSensitive(a: string, b: string) {
      return equateValues(a, b);
    }
    function compareComparableValues(a: string | undefined, b: string | undefined): Comparison;
    function compareComparableValues(a: number | undefined, b: number | undefined): Comparison;
    function compareComparableValues(a: string | number | undefined, b: string | number | undefined) {
      return a === b ? Comparison.EqualTo : a === undefined ? Comparison.LessThan : b === undefined ? Comparison.GreaterThan : a < b ? Comparison.LessThan : Comparison.GreaterThan;
    }
    export function compareValues(a: number | undefined, b: number | undefined): Comparison {
      return compareComparableValues(a, b);
    }
    export function compareTextSpans(a: Partial<TextSpan> | undefined, b: Partial<TextSpan> | undefined): Comparison {
      return compareValues(a?.start, b?.start) || compareValues(a?.length, b?.length);
    }
    export function min<T>(a: T, b: T, compare: Comparer<T>): T {
      return compare(a, b) === Comparison.LessThan ? a : b;
    }
    export function compareStringsCaseInsensitive(a: string, b: string) {
      if (a === b) return Comparison.EqualTo;
      if (a === undefined) return Comparison.LessThan;
      if (b === undefined) return Comparison.GreaterThan;
      a = a.toUpperCase();
      b = b.toUpperCase();
      return a < b ? Comparison.LessThan : a > b ? Comparison.GreaterThan : Comparison.EqualTo;
    }
    export function compareStringsCaseSensitive(a: string | undefined, b: string | undefined): Comparison {
      return compareComparableValues(a, b);
    }
    export function getStringComparer(ignoreCase?: boolean) {
      return ignoreCase ? compareStringsCaseInsensitive : compareStringsCaseSensitive;
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
    export function compareStringsCaseSensitiveUI(a: string, b: string) {
      const comparer = uiComparerCaseSensitive || (uiComparerCaseSensitive = createUIStringComparer(uiLocale));
      return comparer(a, b);
    }
    export function compareProperties<T, K extends keyof T>(a: T | undefined, b: T | undefined, key: K, comparer: Comparer<T[K]>): Comparison {
      return a === b ? Comparison.EqualTo : a === undefined ? Comparison.LessThan : b === undefined ? Comparison.GreaterThan : comparer(a[key], b[key]);
    }
    export function compareBooleans(a: boolean, b: boolean): Comparison {
      return compareValues(a ? 1 : 0, b ? 1 : 0);
    }
    export function getSpellingSuggestion<T>(name: string, candidates: T[], getName: (candidate: T) => string | undefined): T | undefined {
      const maximumLengthDifference = Math.min(2, Math.floor(name.length * 0.34));
      let bestDistance = Math.floor(name.length * 0.4) + 1; // If the best r isn't better than this, don't bother.
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
          const dist = c1 === s2.charCodeAt(j - 1) ? previous[j - 1] : Math.min(/*delete*/ previous[j] + 1, /*insert*/ current[j - 1] + 1, /*substitute*/ previous[j - 1] + 2);
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
    export function endsWith(str: string, suffix: string): boolean {
      const expectedPos = str.length - suffix.length;
      return expectedPos >= 0 && str.indexOf(suffix, expectedPos) === expectedPos;
    }
    export function removeSuffix(str: string, suffix: string): string {
      return endsWith(str, suffix) ? str.slice(0, str.length - suffix.length) : str;
    }
    export function tryRemoveSuffix(str: string, suffix: string): string | undefined {
      return endsWith(str, suffix) ? str.slice(0, str.length - suffix.length) : undefined;
    }
    export function stringContains(str: string, substring: string): boolean {
      return str.indexOf(substring) !== -1;
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
      return unorderedRemoveFirstItemWhere(array, (element) => element === item);
    }
    function unorderedRemoveFirstItemWhere<T>(array: T[], cb: (element: T) => boolean) {
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
    export function startsWith(str: string, prefix: string): boolean {
      return str.lastIndexOf(prefix, 0) === 0;
    }
    export function removePrefix(str: string, prefix: string): string {
      return startsWith(str, prefix) ? str.substr(prefix.length) : str;
    }
    export function tryRemovePrefix(str: string, prefix: string, getCanonicalFileName: GetCanonicalFileName = identity): string | undefined {
      return startsWith(getCanonicalFileName(str), getCanonicalFileName(prefix)) ? str.substring(prefix.length) : undefined;
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
    export function singleElementArray<T>(t: T | undefined): T[] | undefined {
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
    export function cartesianProduct<T>(arrays: readonly T[][]) {
      const r: T[][] = [];
      cartesianProductWorker(arrays, r, /*outer*/ undefined, 0);
      return r;
    }
    function cartesianProductWorker<T>(arrays: readonly (readonly T[])[], result: (readonly T[])[], outer: readonly T[] | undefined, index: number) {
      for (const element of arrays[index]) {
        let inner: T[];
        if (outer) {
          inner = outer.slice();
          inner.push(element);
        } else inner = [element];
        if (index === arrays.length - 1) result.push(inner);
        else cartesianProductWorker(arrays, result, inner, index + 1);
      }
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
  }
}
