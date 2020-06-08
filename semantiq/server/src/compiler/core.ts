namespace qnr {
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

  export const versionMajorMinor = '4.0';
  export const version = `${versionMajorMinor}.0-dev`;

  export const emptyArray = [] as never[];

  export function isArray(x: any): x is readonly {}[] {
    return Array.isArray ? Array.isArray(x) : x instanceof Array;
  }

  export function toArray<T>(x: T | T[]): T[];
  export function toArray<T>(x: T | readonly T[]): readonly T[];
  export function toArray<T>(x: T | T[]): T[] {
    return isArray(x) ? x : [x];
  }

  export interface SortedArray<T> extends Array<T> {
    ' __sortedArrayBrand': any;
  }

  export interface SortedReadonlyArray<T> extends ReadonlyArray<T> {
    ' __sortedArrayBrand': any;
  }

  export function length(x: readonly any[] | undefined) {
    return x ? x.length : 0;
  }

  export function forEach<T, U>(x: readonly T[] | undefined, cb: (e: T, i: number) => U | undefined): U | undefined {
    if (x) {
      for (let i = 0; i < x.length; i++) {
        const r = cb(x[i], i);
        if (r) return r;
      }
    }
    return;
  }

  export function forEachRight<T, U>(x: readonly T[] | undefined, cb: (e: T, i: number) => U | undefined): U | undefined {
    if (x) {
      for (let i = x.length - 1; i >= 0; i--) {
        const r = cb(x[i], i);
        if (r) return r;
      }
    }
    return;
  }

  export function firstDefined<T, U>(x: readonly T[] | undefined, cb: (e: T, i: number) => U | undefined): U | undefined {
    if (x !== undefined) {
      for (let i = 0; i < x.length; i++) {
        const r = cb(x[i], i);
        if (r !== undefined) return r;
      }
    }
    return;
  }

  export function firstDefinedIterator<T, U>(i: Iterator<T>, cb: (e: T) => U | undefined): U | undefined {
    while (true) {
      const r = i.next();
      if (r.done) return;
      const r2 = cb(r.value);
      if (r2 !== undefined) return r2;
    }
  }

  export function intersperse<T>(x: T[], y: T): T[] {
    if (x.length <= 1) return x;
    const r = [] as T[];
    for (let i = 0, n = x.length; i < n; i++) {
      if (i) r.push(y);
      r.push(x[i]);
    }
    return r;
  }

  export function every<T>(x: readonly T[] | undefined, cb: (e: T, i: number) => boolean): boolean {
    if (x) {
      for (let i = 0; i < x.length; i++) {
        if (!cb(x[i], i)) return false;
      }
    }
    return true;
  }

  export function find<T, U extends T>(x: readonly T[], cb: (e: T, i: number) => e is U): U | undefined;
  export function find<T>(x: readonly T[], cb: (e: T, i: number) => boolean): T | undefined;
  export function find<T>(x: readonly T[], cb: (e: T, i: number) => boolean): T | undefined {
    for (let i = 0; i < x.length; i++) {
      const r = x[i];
      if (cb(r, i)) return r;
    }
    return;
  }

  export function findLast<T, U extends T>(x: readonly T[], cb: (e: T, i: number) => e is U): U | undefined;
  export function findLast<T>(x: readonly T[], cb: (e: T, i: number) => boolean): T | undefined;
  export function findLast<T>(x: readonly T[], cb: (e: T, i: number) => boolean): T | undefined {
    for (let i = x.length - 1; i >= 0; i--) {
      const r = x[i];
      if (cb(r, i)) return r;
    }
    return;
  }

  export function findIndex<T>(x: readonly T[], cb: (e: T, i: number) => boolean, start?: number): number {
    for (let i = start ?? 0; i < x.length; i++) {
      if (cb(x[i], i)) return i;
    }
    return -1;
  }

  export function findLastIndex<T>(x: readonly T[], cb: (e: T, i: number) => boolean, start?: number): number {
    for (let i = start === undefined ? x.length - 1 : start; i >= 0; i--) {
      if (cb(x[i], i)) return i;
    }
    return -1;
  }

  export function findMap<T, U>(x: readonly T[], cb: (e: T, i: number) => U | undefined): U {
    for (let i = 0; i < x.length; i++) {
      const r = cb(x[i], i);
      if (r) return r;
    }
    return fail();
  }

  export interface MapLike<T> {
    [k: string]: T;
  }

  export class QMap<V> extends Map<string, V> {
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
    push(..._: T[]): void;
  }

  export type EqualityComparer<T> = (a: T, b: T) => boolean;

  export type Comparer<T> = (a: T, b: T) => Comparison;

  export const enum Comparison {
    LessThan = -1,
    EqualTo = 0,
    GreaterThan = 1,
  }

  export function zipWith<T, U, V>(arrayA: readonly T[], arrayB: readonly U[], cb: (a: T, b: U, i: number) => V): V[] {
    const result: V[] = [];
    Debug.assertEqual(arrayA.length, arrayB.length);
    for (let i = 0; i < arrayA.length; i++) {
      result.push(cb(arrayA[i], arrayB[i], i));
    }
    return result;
  }

  export function zipToIterator<T, U>(arrayA: readonly T[], arrayB: readonly U[]): Iterator<[T, U]> {
    Debug.assertEqual(arrayA.length, arrayB.length);
    let i = 0;
    return {
      next() {
        if (i === arrayA.length) {
          return { value: undefined as never, done: true };
        }
        i++;
        return { value: [arrayA[i - 1], arrayB[i - 1]] as [T, U], done: false };
      },
    };
  }

  export function zipToMap<T>(keys: readonly string[], vs: readonly T[]): QMap<T> {
    assert(keys.length === vs.length);
    const map = createMap<T>();
    for (let i = 0; i < keys.length; ++i) {
      map.set(keys[i], vs[i]);
    }
    return map;
  }

  export function contains<T>(x: readonly T[] | undefined, y: T, eq: EqualityComparer<T> = equateValues): boolean {
    if (x) {
      for (const v of x) {
        if (eq(v, y)) return true;
      }
    }
    return false;
  }

  export function arraysEqual<T>(a: readonly T[], b: readonly T[], eq: EqualityComparer<T> = equateValues): boolean {
    return a.length === b.length && a.every((x, i) => eq(x, b[i]));
  }

  export function indexOfAnyCharCode(text: string, cs: readonly number[], start?: number): number {
    for (let i = start || 0; i < text.length; i++) {
      if (contains(cs, text.charCodeAt(i))) {
        return i;
      }
    }
    return -1;
  }

  export function countWhere<T>(array: readonly T[], cb: (x: T, i: number) => boolean): number {
    let count = 0;
    if (array) {
      for (let i = 0; i < array.length; i++) {
        const v = array[i];
        if (cb(v, i)) {
          count++;
        }
      }
    }
    return count;
  }

  export function filter<T, U extends T>(array: T[], f: (x: T) => x is U): U[];
  export function filter<T>(array: T[], f: (x: T) => boolean): T[];
  export function filter<T, U extends T>(array: readonly T[], f: (x: T) => x is U): readonly U[];
  export function filter<T, U extends T>(array: readonly T[], f: (x: T) => boolean): readonly T[];
  export function filter<T, U extends T>(array: T[] | undefined, f: (x: T) => x is U): U[] | undefined;
  export function filter<T>(array: T[] | undefined, f: (x: T) => boolean): T[] | undefined;
  export function filter<T, U extends T>(array: readonly T[] | undefined, f: (x: T) => x is U): readonly U[] | undefined;
  export function filter<T, U extends T>(array: readonly T[] | undefined, f: (x: T) => boolean): readonly T[] | undefined;
  export function filter<T>(array: readonly T[] | undefined, f: (x: T) => boolean): readonly T[] | undefined {
    if (array) {
      const len = array.length;
      let i = 0;
      while (i < len && f(array[i])) i++;
      if (i < len) {
        const result = array.slice(0, i);
        i++;
        while (i < len) {
          const item = array[i];
          if (f(item)) {
            result.push(item);
          }
          i++;
        }
        return result;
      }
    }
    return array;
  }

  export function filterMutate<T>(array: T[], f: (x: T, i: number, array: T[]) => boolean): void {
    let outIndex = 0;
    for (let i = 0; i < array.length; i++) {
      if (f(array[i], i, array)) {
        array[outIndex] = array[i];
        outIndex++;
      }
    }
    array.length = outIndex;
  }

  export function clear(array: {}[]): void {
    array.length = 0;
  }

  export function map<T, U>(array: readonly T[], f: (x: T, i: number) => U): U[];
  export function map<T, U>(array: readonly T[] | undefined, f: (x: T, i: number) => U): U[] | undefined;
  export function map<T, U>(array: readonly T[] | undefined, f: (x: T, i: number) => U): U[] | undefined {
    let result: U[] | undefined;
    if (array) {
      result = [];
      for (let i = 0; i < array.length; i++) {
        result.push(f(array[i], i));
      }
    }
    return result;
  }

  export function mapIterator<T, U>(iter: Iterator<T>, mapFn: (x: T) => U): Iterator<U> {
    return {
      next() {
        const iterRes = iter.next();
        return iterRes.done ? (iterRes as { done: true; value: never }) : { value: mapFn(iterRes.value), done: false };
      },
    };
  }

  // Maps from T to T and avoids allocation if all elements map to themselves
  export function sameMap<T>(array: T[], f: (x: T, i: number) => T): T[];
  export function sameMap<T>(array: readonly T[], f: (x: T, i: number) => T): readonly T[];
  export function sameMap<T>(array: T[] | undefined, f: (x: T, i: number) => T): T[] | undefined;
  export function sameMap<T>(array: readonly T[] | undefined, f: (x: T, i: number) => T): readonly T[] | undefined;
  export function sameMap<T>(array: readonly T[] | undefined, f: (x: T, i: number) => T): readonly T[] | undefined {
    if (array) {
      for (let i = 0; i < array.length; i++) {
        const item = array[i];
        const mapped = f(item, i);
        if (item !== mapped) {
          const result = array.slice(0, i);
          result.push(mapped);
          for (i++; i < array.length; i++) {
            result.push(f(array[i], i));
          }
          return result;
        }
      }
    }
    return array;
  }

  export function flatten<T>(array: T[][] | readonly (T | readonly T[] | undefined)[]): T[] {
    const result = [];
    for (const v of array) {
      if (v) {
        if (isArray(v)) {
          addRange(result, v);
        } else {
          result.push(v);
        }
      }
    }
    return result;
  }

  export function flatMap<T, U>(array: readonly T[] | undefined, mapfn: (x: T, i: number) => U | readonly U[] | undefined): readonly U[] {
    let result: U[] | undefined;
    if (array) {
      for (let i = 0; i < array.length; i++) {
        const v = mapfn(array[i], i);
        if (v) {
          if (isArray(v)) {
            result = addRange(result, v);
          } else {
            result = append(result, v);
          }
        }
      }
    }
    return result || emptyArray;
  }

  export function flatMapToMutable<T, U>(array: readonly T[] | undefined, mapfn: (x: T, i: number) => U | readonly U[] | undefined): U[] {
    const result: U[] = [];
    if (array) {
      for (let i = 0; i < array.length; i++) {
        const v = mapfn(array[i], i);
        if (v) {
          if (isArray(v)) {
            addRange(result, v);
          } else {
            result.push(v);
          }
        }
      }
    }
    return result;
  }

  export function flatMapIterator<T, U>(iter: Iterator<T>, mapfn: (x: T) => readonly U[] | Iterator<U> | undefined): Iterator<U> {
    const first = iter.next();
    if (first.done) {
      return emptyIterator;
    }
    let currentIter = getIterator(first.value);
    return {
      next() {
        while (true) {
          const currentRes = currentIter.next();
          if (!currentRes.done) {
            return currentRes;
          }
          const iterRes = iter.next();
          if (iterRes.done) {
            return iterRes as { done: true; value: never };
          }
          currentIter = getIterator(iterRes.value);
        }
      },
    };

    function getIterator(x: T): Iterator<U> {
      const res = mapfn(x);
      return res === undefined ? emptyIterator : isArray(res) ? arrayIterator(res) : res;
    }
  }

  export function sameFlatMap<T>(array: T[], mapfn: (x: T, i: number) => T | readonly T[]): T[];
  export function sameFlatMap<T>(array: readonly T[], mapfn: (x: T, i: number) => T | readonly T[]): readonly T[];
  export function sameFlatMap<T>(array: T[], mapfn: (x: T, i: number) => T | T[]): T[] {
    let result: T[] | undefined;
    if (array) {
      for (let i = 0; i < array.length; i++) {
        const item = array[i];
        const mapped = mapfn(item, i);
        if (result || item !== mapped || isArray(mapped)) {
          if (!result) {
            result = array.slice(0, i);
          }
          if (isArray(mapped)) {
            addRange(result, mapped);
          } else {
            result.push(mapped);
          }
        }
      }
    }
    return result || array;
  }

  export function mapAllOrFail<T, U>(array: readonly T[], mapFn: (x: T, i: number) => U | undefined): U[] | undefined {
    const result: U[] = [];
    for (let i = 0; i < array.length; i++) {
      const mapped = mapFn(array[i], i);
      if (mapped === undefined) {
        return;
      }
      result.push(mapped);
    }
    return result;
  }

  export function mapDefined<T, U>(array: readonly T[] | undefined, mapFn: (x: T, i: number) => U | undefined): U[] {
    const result: U[] = [];
    if (array) {
      for (let i = 0; i < array.length; i++) {
        const mapped = mapFn(array[i], i);
        if (mapped !== undefined) {
          result.push(mapped);
        }
      }
    }
    return result;
  }

  export function mapDefinedIterator<T, U>(iter: Iterator<T>, mapFn: (x: T) => U | undefined): Iterator<U> {
    return {
      next() {
        while (true) {
          const res = iter.next();
          if (res.done) {
            return res as { done: true; value: never };
          }
          const value = mapFn(res.value);
          if (value !== undefined) {
            return { value, done: false };
          }
        }
      },
    };
  }

  export function mapDefinedMap<T, U>(map: QReadonlyMap<T>, mapValue: (value: T, key: string) => U | undefined, mapKey: (key: string) => string = identity): QMap<U> {
    const result = createMap<U>();
    map.forEach((v, k) => {
      const mapped = mapValue(v, k);
      if (mapped !== undefined) {
        result.set(mapKey(k), mapped);
      }
    });
    return result;
  }

  export const emptyIterator: Iterator<never> = { next: () => ({ value: undefined as never, done: true }) };

  export function singleIterator<T>(value: T): Iterator<T> {
    let done = false;
    return {
      next() {
        const wasDone = done;
        done = true;
        return wasDone ? { value: undefined as never, done: true } : { value, done: false };
      },
    };
  }

  export function spanMap<T, K, U>(array: readonly T[], keyfn: (x: T, i: number) => K, mapfn: (chunk: T[], key: K, start: number, end: number) => U): U[];
  export function spanMap<T, K, U>(array: readonly T[] | undefined, keyfn: (x: T, i: number) => K, mapfn: (chunk: T[], key: K, start: number, end: number) => U): U[] | undefined;
  export function spanMap<T, K, U>(array: readonly T[] | undefined, keyfn: (x: T, i: number) => K, mapfn: (chunk: T[], key: K, start: number, end: number) => U): U[] | undefined {
    let result: U[] | undefined;
    if (array) {
      result = [];
      const len = array.length;
      let previousKey: K | undefined;
      let key: K | undefined;
      let start = 0;
      let pos = 0;
      while (start < len) {
        while (pos < len) {
          const value = array[pos];
          key = keyfn(value, pos);
          if (pos === 0) {
            previousKey = key;
          } else if (key !== previousKey) {
            break;
          }

          pos++;
        }

        if (start < pos) {
          const v = mapfn(array.slice(start, pos), previousKey!, start, pos);
          if (v) {
            result.push(v);
          }

          start = pos;
        }

        previousKey = key;
        pos++;
      }
    }

    return result;
  }

  export function mapEntries<T, U>(map: QReadonlyMap<T>, f: (key: string, value: T) => [string, U]): QMap<U>;
  export function mapEntries<T, U>(map: QReadonlyMap<T> | undefined, f: (key: string, value: T) => [string, U]): QMap<U> | undefined;
  export function mapEntries<T, U>(map: QReadonlyMap<T> | undefined, f: (key: string, value: T) => [string, U]): QMap<U> | undefined {
    if (!map) return;
    const result = createMap<U>();
    map.forEach((value, key) => {
      const [newKey, newValue] = f(key, value);
      result.set(newKey, newValue);
    });
    return result;
  }
  export function some<T>(array: readonly T[] | undefined): array is readonly T[];
  export function some<T>(array: readonly T[] | undefined, cb: (value: T) => boolean): boolean;
  export function some<T>(array: readonly T[] | undefined, cb?: (value: T) => boolean): boolean {
    if (array) {
      if (cb) {
        for (const v of array) {
          if (cb(v)) {
            return true;
          }
        }
      } else {
        return array.length > 0;
      }
    }
    return false;
  }

  export function getRangesWhere<T>(arr: readonly T[], pred: (t: T) => boolean, cb: (start: number, afterEnd: number) => void): void {
    let start: number | undefined;
    for (let i = 0; i < arr.length; i++) {
      if (pred(arr[i])) {
        start = start === undefined ? i : start;
      } else {
        if (start !== undefined) {
          cb(start, i);
          start = undefined;
        }
      }
    }
    if (start !== undefined) cb(start, arr.length);
  }

  export function concatenate<T>(array1: T[], array2: T[]): T[];
  export function concatenate<T>(array1: readonly T[], array2: readonly T[]): readonly T[];
  export function concatenate<T>(array1: T[] | undefined, array2: T[] | undefined): T[];
  export function concatenate<T>(array1: readonly T[] | undefined, array2: readonly T[] | undefined): readonly T[];
  export function concatenate<T>(array1: T[] | readonly T[] | undefined, array2: T[] | readonly T[] | undefined): T[] | readonly T[] | undefined {
    if (!some(array2)) return array1;
    if (!some(array1)) return array2;
    return [...array1, ...array2];
  }

  function selectIndex(_: unknown, i: number) {
    return i;
  }

  export function indicesOf(array: readonly unknown[]): number[] {
    return array.map(selectIndex);
  }

  function deduplicateRelational<T>(array: readonly T[], eq: EqualityComparer<T>, comparer: Comparer<T>) {
    // Perform a stable sort of the array. This ensures the first entry in a list of
    // duplicates remains the first entry in the result.
    const indices = indicesOf(array);
    stableSortIndices(array, indices, comparer);

    let last = array[indices[0]];
    const deduplicated: number[] = [indices[0]];
    for (let i = 1; i < indices.length; i++) {
      const index = indices[i];
      const item = array[index];
      if (!eq(last, item)) {
        deduplicated.push(index);
        last = item;
      }
    }
    deduplicated.sort();
    return deduplicated.map((i) => array[i]);
  }

  function deduplicateEquality<T>(array: readonly T[], eq: EqualityComparer<T>) {
    const result: T[] = [];
    for (const item of array) {
      pushIfUnique(result, item, eq);
    }
    return result;
  }

  export function deduplicate<T>(array: readonly T[], eq: EqualityComparer<T>, comparer?: Comparer<T>): T[] {
    return array.length === 0 ? [] : array.length === 1 ? array.slice() : comparer ? deduplicateRelational(array, eq, comparer) : deduplicateEquality(array, eq);
  }

  function deduplicateSorted<T>(array: SortedReadonlyArray<T>, comparer: EqualityComparer<T> | Comparer<T>): SortedReadonlyArray<T> {
    if (array.length === 0) return (emptyArray as any) as SortedReadonlyArray<T>;
    let last = array[0];
    const deduplicated: T[] = [last];
    for (let i = 1; i < array.length; i++) {
      const next = array[i];
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

  export function insertSorted<T>(array: SortedArray<T>, insert: T, compare: Comparer<T>): void {
    if (array.length === 0) {
      array.push(insert);
      return;
    }
    const insertIndex = binarySearch(array, insert, identity, compare);
    if (insertIndex < 0) {
      array.splice(~insertIndex, 0, insert);
    }
  }

  export function sortAndDeduplicate<T>(array: readonly string[]): SortedReadonlyArray<string>;
  export function sortAndDeduplicate<T>(array: readonly T[], comparer: Comparer<T>, eq?: EqualityComparer<T>): SortedReadonlyArray<T>;
  export function sortAndDeduplicate<T>(array: readonly T[], comparer?: Comparer<T>, eq?: EqualityComparer<T>): SortedReadonlyArray<T> {
    return deduplicateSorted(sort(array, comparer), eq || comparer || ((compareStringsCaseSensitive as any) as Comparer<T>));
  }

  export function arrayIsEqualTo<T>(array1: readonly T[] | undefined, array2: readonly T[] | undefined, eq: (a: T, b: T, index: number) => boolean = equateValues): boolean {
    if (!array1 || !array2) return array1 === array2;
    if (array1.length !== array2.length) return false;
    for (let i = 0; i < array1.length; i++) {
      if (!eq(array1[i], array2[i], i)) return false;
    }
    return true;
  }

  export function compact<T>(array: (T | undefined | null | false | 0 | '')[]): T[];
  export function compact<T>(array: readonly (T | undefined | null | false | 0 | '')[]): readonly T[];
  // ESLint thinks these can be combined with the above - they cannot; they'd produce higher-priority inferences and prevent the falsey types from being stripped
  export function compact<T>(array: T[]): T[]; // eslint-disable-line @typescript-eslint/unified-signatures
  export function compact<T>(array: readonly T[]): readonly T[]; // eslint-disable-line @typescript-eslint/unified-signatures
  export function compact<T>(array: T[] | readonly T[]): T[] | readonly T[] {
    let result: T[] | undefined;
    if (array) {
      for (let i = 0; i < array.length; i++) {
        const v = array[i];
        if (result || !v) {
          if (!result) result = array.slice(0, i);
          if (v) result.push(v);
        }
      }
    }
    return result || array;
  }

  export function relativeComplement<T>(arrayA: T[] | undefined, arrayB: T[] | undefined, comparer: Comparer<T>): T[] | undefined {
    if (!arrayB || !arrayA || arrayB.length === 0 || arrayA.length === 0) return arrayB;
    const result: T[] = [];
    loopB: for (let offsetA = 0, offsetB = 0; offsetB < arrayB.length; offsetB++) {
      if (offsetB > 0) {
        // Ensure `arrayB` is properly sorted.
        Debug.assertGreaterThanOrEqual(comparer(arrayB[offsetB], arrayB[offsetB - 1]), Comparison.EqualTo);
      }
      loopA: for (const startA = offsetA; offsetA < arrayA.length; offsetA++) {
        if (offsetA > startA) {
          // Ensure `arrayA` is properly sorted. We only need to perform this check if
          // `offsetA` has changed since we entered the loop.
          Debug.assertGreaterThanOrEqual(comparer(arrayA[offsetA], arrayA[offsetA - 1]), Comparison.EqualTo);
        }

        switch (comparer(arrayB[offsetB], arrayA[offsetA])) {
          case Comparison.LessThan:
            // If B is less than A, B does not exist in arrayA. Add B to the result and
            // move to the next element in arrayB without changing the current position
            // in arrayA.
            result.push(arrayB[offsetB]);
            continue loopB;
          case Comparison.EqualTo:
            // If B is equal to A, B exists in arrayA. Move to the next element in
            // arrayB without adding B to the result or changing the current position
            // in arrayA.
            continue loopB;
          case Comparison.GreaterThan:
            // If B is greater than A, we need to keep looking for B in arrayA. Move to
            // the next element in arrayA and recheck.
            continue loopA;
        }
      }
    }
    return result;
  }

  export function sum<T extends Record<K, number>, K extends string>(array: readonly T[], prop: K): number {
    let result = 0;
    for (const v of array) {
      result += v[prop];
    }
    return result;
  }

  export function append<TArray extends any[] | undefined, TValue extends NonNullable<TArray>[number] | undefined>(
    to: TArray,
    value: TValue
  ): [undefined, undefined] extends [TArray, TValue] ? TArray : NonNullable<TArray>[number][];
  export function append<T>(to: T[], value: T | undefined): T[];
  export function append<T>(to: T[] | undefined, value: T): T[];
  export function append<T>(to: T[] | undefined, value: T | undefined): T[] | undefined;
  export function append<T>(to: Push<T>, value: T | undefined): void;
  export function append<T>(to: T[], value: T | undefined): T[] | undefined {
    if (value === undefined) return to;
    if (to === undefined) return [value];
    to.push(value);
    return to;
  }

  export function combine<T>(xs: T | readonly T[] | undefined, ys: T | readonly T[] | undefined): T | readonly T[] | undefined;
  export function combine<T>(xs: T | T[] | undefined, ys: T | T[] | undefined): T | T[] | undefined;
  export function combine<T>(xs: T | T[] | undefined, ys: T | T[] | undefined) {
    if (xs === undefined) return ys;
    if (ys === undefined) return xs;
    if (isArray(xs)) return isArray(ys) ? concatenate(xs, ys) : append(xs, ys);
    if (isArray(ys)) return append(ys, xs);
    return [xs, ys];
  }

  function toOffset(array: readonly any[], offset: number) {
    return offset < 0 ? array.length + offset : offset;
  }

  export function addRange<T>(to: T[], from: readonly T[] | undefined, start?: number, end?: number): T[];
  export function addRange<T>(to: T[] | undefined, from: readonly T[] | undefined, start?: number, end?: number): T[] | undefined;
  export function addRange<T>(to: T[] | undefined, from: readonly T[] | undefined, start?: number, end?: number): T[] | undefined {
    if (from === undefined || from.length === 0) return to;
    if (to === undefined) return from.slice(start, end);
    start = start === undefined ? 0 : toOffset(from, start);
    end = end === undefined ? from.length : toOffset(from, end);
    for (let i = start; i < end && i < from.length; i++) {
      if (from[i] !== undefined) {
        to.push(from[i]);
      }
    }
    return to;
  }

  export function pushIfUnique<T>(array: T[], toAdd: T, eq?: EqualityComparer<T>): boolean {
    if (contains(array, toAdd, eq)) return false;
    array.push(toAdd);
    return true;
  }

  export function appendIfUnique<T>(array: T[] | undefined, toAdd: T, eq?: EqualityComparer<T>): T[] {
    if (array) {
      pushIfUnique(array, toAdd, eq);
      return array;
    }
    return [toAdd];
  }

  function stableSortIndices<T>(array: readonly T[], indices: number[], comparer: Comparer<T>) {
    indices.sort((x, y) => comparer(array[x], array[y]) || compareValues(x, y));
  }

  export function sort<T>(array: readonly T[], comparer?: Comparer<T>): SortedReadonlyArray<T> {
    return (array.length === 0 ? array : array.slice().sort(comparer)) as SortedReadonlyArray<T>;
  }

  export function arrayIterator<T>(array: readonly T[]): Iterator<T> {
    let i = 0;
    return {
      next: () => {
        if (i === array.length) return { value: undefined as never, done: true };
        else {
          i++;
          return { value: array[i - 1], done: false };
        }
      },
    };
  }

  export function arrayReverseIterator<T>(array: readonly T[]): Iterator<T> {
    let i = array.length;
    return {
      next: () => {
        if (i === 0) return { value: undefined as never, done: true };
        else {
          i--;
          return { value: array[i], done: false };
        }
      },
    };
  }

  export function stableSort<T>(array: readonly T[], comparer: Comparer<T>): SortedReadonlyArray<T> {
    const indices = indicesOf(array);
    stableSortIndices(array, indices, comparer);
    return (indices.map((i) => array[i]) as SortedArray<T>) as SortedReadonlyArray<T>;
  }

  export function rangeEquals<T>(array1: readonly T[], array2: readonly T[], pos: number, end: number) {
    while (pos < end) {
      if (array1[pos] !== array2[pos]) return false;
      pos++;
    }
    return true;
  }

  export function elementAt<T>(array: readonly T[] | undefined, offset: number): T | undefined {
    if (array) {
      offset = toOffset(array, offset);
      if (offset < array.length) return array[offset];
    }
    return;
  }

  export function firstOrUndefined<T>(array: readonly T[]): T | undefined {
    return array.length === 0 ? undefined : array[0];
  }

  export function first<T>(array: readonly T[]): T {
    assert(array.length !== 0);
    return array[0];
  }

  export function lastOrUndefined<T>(array: readonly T[]): T | undefined {
    return array.length === 0 ? undefined : array[array.length - 1];
  }

  export function last<T>(array: readonly T[]): T {
    assert(array.length !== 0);
    return array[array.length - 1];
  }

  export function singleOrUndefined<T>(array: readonly T[] | undefined): T | undefined {
    return array && array.length === 1 ? array[0] : undefined;
  }

  export function singleOrMany<T>(array: T[]): T | T[];
  export function singleOrMany<T>(array: readonly T[]): T | readonly T[];
  export function singleOrMany<T>(array: T[] | undefined): T | T[] | undefined;
  export function singleOrMany<T>(array: readonly T[] | undefined): T | readonly T[] | undefined;
  export function singleOrMany<T>(array: readonly T[] | undefined): T | readonly T[] | undefined {
    return array && array.length === 1 ? array[0] : array;
  }

  export function replaceElement<T>(array: readonly T[], index: number, value: T): T[] {
    const result = array.slice(0);
    result[index] = value;
    return result;
  }

  export function binarySearch<T, U>(array: readonly T[], value: T, keySelector: (v: T) => U, keyComparer: Comparer<U>, offset?: number): number {
    return binarySearchKey(array, keySelector(value), keySelector, keyComparer, offset);
  }

  export function binarySearchKey<T, U>(array: readonly T[], key: U, keySelector: (v: T) => U, keyComparer: Comparer<U>, offset?: number): number {
    if (!some(array)) return -1;
    let low = offset || 0;
    let high = array.length - 1;
    while (low <= high) {
      const middle = low + ((high - low) >> 1);
      const midKey = keySelector(array[middle]);
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

  export function reduceLeft<T, U>(array: readonly T[] | undefined, f: (memo: U, value: T, i: number) => U, initial: U, start?: number, count?: number): U;
  export function reduceLeft<T>(array: readonly T[], f: (memo: T, value: T, i: number) => T): T | undefined;
  export function reduceLeft<T>(array: T[], f: (memo: T, value: T, i: number) => T, initial?: T, start?: number, count?: number): T | undefined {
    if (array && array.length > 0) {
      const size = array.length;
      if (size > 0) {
        let pos = start === undefined || start < 0 ? 0 : start;
        const end = count === undefined || pos + count > size - 1 ? size - 1 : pos + count;
        let result: T;
        if (arguments.length <= 2) {
          result = array[pos];
          pos++;
        } else {
          result = initial!;
        }
        while (pos <= end) {
          result = f(result, array[pos], pos);
          pos++;
        }
        return result;
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
    const result: string[] = [];
    do {
      const names = Object.getOwnPropertyNames(obj);
      for (const name of names) {
        pushIfUnique(result, name);
      }
    } while ((obj = Object.getPrototypeOf(obj)));
    return result;
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
    const result: (T | U)[] = [];
    for (let iterResult = iterator.next(); !iterResult.done; iterResult = iterator.next()) {
      result.push(map ? map(iterResult.value) : iterResult.value);
    }
    return result;
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
    const result = createMap<T | U>();
    for (const value of array) {
      const key = makeKey(value);
      if (key !== undefined) result.set(key, makeValue(value));
    }
    return result;
  }

  export function arrayToNumericMap<T>(array: readonly T[], makeKey: (value: T) => number): T[];
  export function arrayToNumericMap<T, U>(array: readonly T[], makeKey: (value: T) => number, makeValue: (value: T) => U): U[];
  export function arrayToNumericMap<T, U>(array: readonly T[], makeKey: (value: T) => number, makeValue: (value: T) => T | U = identity): (T | U)[] {
    const result: (T | U)[] = [];
    for (const value of array) {
      result[makeKey(value)] = makeValue(value);
    }
    return result;
  }

  export function arrayToMultiMap<T>(values: readonly T[], makeKey: (value: T) => string): MultiMap<T>;
  export function arrayToMultiMap<T, U>(values: readonly T[], makeKey: (value: T) => string, makeValue: (value: T) => U): MultiMap<U>;
  export function arrayToMultiMap<T, U>(values: readonly T[], makeKey: (value: T) => string, makeValue: (value: T) => T | U = identity): MultiMap<T | U> {
    const result = createMultiMap<T | U>();
    for (const value of values) {
      result.add(makeKey(value), makeValue(value));
    }
    return result;
  }

  export function group<T>(values: readonly T[], getGroupId: (value: T) => string): readonly (readonly T[])[];
  export function group<T, R>(values: readonly T[], getGroupId: (value: T) => string, resultSelector: (values: readonly T[]) => R): R[];
  export function group<T>(values: readonly T[], getGroupId: (value: T) => string, resultSelector: (values: readonly T[]) => readonly T[] = identity): readonly (readonly T[])[] {
    return arrayFrom(arrayToMultiMap(values, getGroupId).values(), resultSelector);
  }

  export function clone<T>(object: T): T {
    const result: any = {};
    for (const id in object) {
      if (hasOwnProperty.call(object, id)) {
        result[id] = (<any>object)[id];
      }
    }
    return result;
  }

  export function extend<T1, T2>(first: T1, second: T2): T1 & T2 {
    const result: T1 & T2 = <any>{};
    for (const id in second) {
      if (hasOwnProperty.call(second, id)) (result as any)[id] = (second as any)[id];
    }
    for (const id in first) {
      if (hasOwnProperty.call(first, id)) (result as any)[id] = (first as any)[id];
    }
    return result;
  }

  export function copyProperties<T1 extends T2, T2>(to: T1, from: T2) {
    for (const k in from) {
      if (hasOwnProperty.call(from, k)) (to as any)[k] = from[k];
    }
  }

  export function maybeBind<T, A extends any[], R>(obj: T, fn: ((this: T, ...args: A) => R) | undefined): ((...args: A) => R) | undefined {
    return fn ? fn.bind(obj) : undefined;
  }

  export function mapMap<T, U>(map: QMap<T>, f: (t: T, key: string) => [string, U]): QMap<U>;
  export function mapMap<T, U>(map: UnderscoreEscapedMap<T>, f: (t: T, key: __String) => [string, U]): QMap<U>;
  export function mapMap<T, U>(map: QMap<T> | UnderscoreEscapedMap<T>, f: ((t: T, key: string) => [string, U]) | ((t: T, key: __String) => [string, U])): QMap<U> {
    const result = createMap<U>();
    map.forEach((t: T, key: string & __String) => result.set(...f(t, key)));
    return result;
  }

  export interface MultiMap<T> extends QMap<T[]> {
    add(key: string, value: T): T[];
    remove(key: string, value: T): void;
  }

  export function createMultiMap<T>(): MultiMap<T> {
    const map = createMap<T[]>() as MultiMap<T>;
    map.add = multiMapAdd;
    map.remove = multiMapRemove;
    return map;
  }

  function multiMapAdd<T>(this: MultiMap<T>, key: string, value: T) {
    let values = this.get(key);
    if (values) values.push(value);
    else this.set(key, (values = [value]));
    return values;
  }

  function multiMapRemove<T>(this: MultiMap<T>, key: string, value: T) {
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

  export function returnFalse(): false {
    return false;
  }

  export function returnTrue(): true {
    return true;
  }

  export function returnUndefined(): undefined {
    return;
  }

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
      if (typeof Intl === 'object' && typeof Intl.Collator === 'function') {
        return createIntlCollatorStringComparer;
      }
      if (typeof String.prototype.localeCompare === 'function' && typeof String.prototype.toLocaleUpperCase === 'function' && 'a'.localeCompare('B') < 0) {
        return createLocaleCompareStringComparer;
      }
      return createFallbackStringComparer;
    }

    function createStringComparer(locale: string | undefined) {
      if (locale === undefined) {
        return defaultComparer || (defaultComparer = stringComparerFactory(locale));
      } else if (locale === 'en-US') {
        return enUSComparer || (enUSComparer = stringComparerFactory(locale));
      } else {
        return stringComparerFactory(locale);
      }
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
    let bestDistance = Math.floor(name.length * 0.4) + 1; // If the best result isn't better than this, don't bother.
    let bestCandidate: T | undefined;
    let justCheckExactMatches = false;
    const nameLowerCase = name.toLowerCase();
    for (const candidate of candidates) {
      const candidateName = getName(candidate);
      if (candidateName !== undefined && Math.abs(candidateName.length - nameLowerCase.length) <= maximumLengthDifference) {
        const candidateNameLowerCase = candidateName.toLowerCase();
        if (candidateNameLowerCase === nameLowerCase) {
          if (candidateName === name) {
            continue;
          }
          return candidate;
        }
        if (justCheckExactMatches) {
          continue;
        }
        if (candidateName.length < 3) {
          // Don't bother, user would have noticed a 2-character name having an extra character
          continue;
        }
        // Only care about a result better than the best so far.
        const distance = levenshteinWithMax(nameLowerCase, candidateNameLowerCase, bestDistance - 1);
        if (distance === undefined) {
          continue;
        }
        if (distance < 3) {
          justCheckExactMatches = true;
          bestCandidate = candidate;
        } else {
          assert(distance < bestDistance); // Else `levenshteinWithMax` should return undefined
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
      /** Smallest value of the matrix in the ith column. */
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
      if (colMin > max) {
        // Give up -- everything in this column is > max and it can't get better in future columns.
        return;
      }

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
    // Match a "." or "-" followed by a version number or 'min' at the end of the name
    const trailingMinOrVersion = /[.-]((min)|(\d+(\.\d+)*))$/;

    // The "min" or version may both be present, in either order, so try applying the above twice.
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
    // This seems to be faster than either `array.splice(i, 1)` or `array.copyWithin(i, i+ 1)`.
    for (let i = index; i < array.length - 1; i++) {
      array[i] = array[i + 1];
    }
    array.pop();
  }

  export function unorderedRemoveItemAt<T>(array: T[], index: number): void {
    // Fill in the "hole" left at `index`.
    array[index] = array[array.length - 1];
    array.pop();
  }

  /** Remove the *first* occurrence of `item` from the array. */
  export function unorderedRemoveItem<T>(array: T[], item: T) {
    return unorderedRemoveFirstItemWhere(array, (element) => element === item);
  }

  /** Remove the *first* element satisfying `cb`. */
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

  /** Represents a "prefix*suffix" pattern. */
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

  /** Return the object corresponding to the best pattern to match `candidate`. */
  export function findBestPatternMatch<T>(values: readonly T[], getPattern: (value: T) => Pattern, candidate: string): T | undefined {
    let matchedValue: T | undefined;
    // use length of prefix as betterness criteria
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
        if (f(...args)) {
          return true;
        }
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
    const result = Array<T>(length);
    for (let i = 0; i < length; i++) {
      result[i] = cb(i);
    }
    return result;
  }

  export function cartesianProduct<T>(arrays: readonly T[][]) {
    const result: T[][] = [];
    cartesianProductWorker(arrays, result, /*outer*/ undefined, 0);
    return result;
  }

  function cartesianProductWorker<T>(arrays: readonly (readonly T[])[], result: (readonly T[])[], outer: readonly T[] | undefined, index: number) {
    for (const element of arrays[index]) {
      let inner: T[];
      if (outer) {
        inner = outer.slice();
        inner.push(element);
      } else {
        inner = [element];
      }
      if (index === arrays.length - 1) {
        result.push(inner);
      } else {
        cartesianProductWorker(arrays, result, inner, index + 1);
      }
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
