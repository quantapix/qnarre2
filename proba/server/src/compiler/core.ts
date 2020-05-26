/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable no-extra-boolean-cast */
/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-for-in-array */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/unbound-method */

import * as qpc from './corePublic';
import * as qt from './types';
import { Debug } from './debug';

export const emptyArray: never[] = [] as never[];

export function createMap<T>(): qpc.Map<T> {
  return new qpc.Map<T>();
}

export function createMapFromEntries<T>(entries: [string, T][]): qpc.Map<T> {
  const map = createMap<T>();
  for (const [key, value] of entries) {
    map.set(key, value);
  }
  return map;
}

export function createMapFromTemplate<T>(template: qpc.MapLike<T>): qpc.Map<T> {
  const map: qpc.Map<T> = new qpc.Map<T>();
  for (const key in template) {
    if (hasOwnProperty.call(template, key)) {
      map.set(key, template[key]);
    }
  }
  return map;
}

export function length(array: readonly any[] | undefined): number {
  return array ? array.length : 0;
}

export function forEach<T, U>(array: readonly T[] | undefined, callback: (element: T, index: number) => U | undefined): U | undefined {
  if (array) {
    for (let i = 0; i < array.length; i++) {
      const result = callback(array[i], i);
      if (result) {
        return result;
      }
    }
  }
  return undefined;
}

export function forEachRight<T, U>(array: readonly T[] | undefined, callback: (element: T, index: number) => U | undefined): U | undefined {
  if (array) {
    for (let i = array.length - 1; i >= 0; i--) {
      const result = callback(array[i], i);
      if (result) {
        return result;
      }
    }
  }
  return undefined;
}

export function firstDefined<T, U>(array: readonly T[] | undefined, callback: (element: T, index: number) => U | undefined): U | undefined {
  if (array === undefined) {
    return undefined;
  }
  for (let i = 0; i < array.length; i++) {
    const result = callback(array[i], i);
    if (result !== undefined) {
      return result;
    }
  }
  return undefined;
}

export function firstDefinedIterator<T, U>(iter: Iterator<T>, callback: (element: T) => U | undefined): U | undefined {
  while (true) {
    const iterResult = iter.next();
    if (iterResult.done) {
      return undefined;
    }
    const result = callback(iterResult.value);
    if (result !== undefined) {
      return result;
    }
  }
}

export function zipWith<T, U, V>(arrayA: readonly T[], arrayB: readonly U[], callback: (a: T, b: U, index: number) => V): V[] {
  const result: V[] = [];
  Debug.assertEqual(arrayA.length, arrayB.length);
  for (let i = 0; i < arrayA.length; i++) {
    result.push(callback(arrayA[i], arrayB[i], i));
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

export function zipToMap<T>(keys: readonly string[], values: readonly T[]): qpc.Map<T> {
  Debug.assert(keys.length === values.length);
  const map = createMap<T>();
  for (let i = 0; i < keys.length; ++i) {
    map.set(keys[i], values[i]);
  }
  return map;
}

export function intersperse<T>(input: T[], element: T): T[] {
  if (input.length <= 1) {
    return input;
  }
  const result: T[] = [];
  for (let i = 0, n = input.length; i < n; i++) {
    if (i) result.push(element);
    result.push(input[i]);
  }
  return result;
}

export function every<T>(array: readonly T[] | undefined, callback: (element: T, index: number) => boolean): boolean {
  if (array) {
    for (let i = 0; i < array.length; i++) {
      if (!callback(array[i], i)) {
        return false;
      }
    }
  }

  return true;
}

export function find<T, U extends T>(array: readonly T[], predicate: (element: T, index: number) => element is U): U | undefined;
export function find<T>(array: readonly T[], predicate: (element: T, index: number) => boolean): T | undefined;
export function find<T>(array: readonly T[], predicate: (element: T, index: number) => boolean): T | undefined {
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (predicate(value, i)) {
      return value;
    }
  }
  return undefined;
}

export function findLast<T, U extends T>(array: readonly T[], predicate: (element: T, index: number) => element is U): U | undefined;
export function findLast<T>(array: readonly T[], predicate: (element: T, index: number) => boolean): T | undefined;
export function findLast<T>(array: readonly T[], predicate: (element: T, index: number) => boolean): T | undefined {
  for (let i = array.length - 1; i >= 0; i--) {
    const value = array[i];
    if (predicate(value, i)) {
      return value;
    }
  }
  return undefined;
}

export function findIndex<T>(array: readonly T[], predicate: (element: T, index: number) => boolean, startIndex?: number): number {
  for (let i = startIndex || 0; i < array.length; i++) {
    if (predicate(array[i], i)) {
      return i;
    }
  }
  return -1;
}

export function findLastIndex<T>(array: readonly T[], predicate: (element: T, index: number) => boolean, startIndex?: number): number {
  for (let i = startIndex === undefined ? array.length - 1 : startIndex; i >= 0; i--) {
    if (predicate(array[i], i)) {
      return i;
    }
  }
  return -1;
}

export function findMap<T, U>(array: readonly T[], callback: (element: T, index: number) => U | undefined): U {
  for (let i = 0; i < array.length; i++) {
    const result = callback(array[i], i);
    if (result) {
      return result;
    }
  }
  return Debug.fail();
}

export function contains<T>(array: readonly T[] | undefined, value: T, equalityComparer: qpc.EqualityComparer<T> = equateValues): boolean {
  if (array) {
    for (const v of array) {
      if (equalityComparer(v, value)) {
        return true;
      }
    }
  }
  return false;
}

export function arraysEqual<T>(a: readonly T[], b: readonly T[], equalityComparer: qpc.EqualityComparer<T> = equateValues): boolean {
  return a.length === b.length && a.every((x, i) => equalityComparer(x, b[i]));
}

export function indexOfAnyCharCode(text: string, charCodes: readonly number[], start?: number): number {
  for (let i = start || 0; i < text.length; i++) {
    if (contains(charCodes, text.charCodeAt(i))) {
      return i;
    }
  }
  return -1;
}

export function countWhere<T>(array: readonly T[], predicate: (x: T, i: number) => boolean): number {
  let count = 0;
  if (array) {
    for (let i = 0; i < array.length; i++) {
      const v = array[i];
      if (predicate(v, i)) {
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
      return undefined;
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

export function mapDefinedMap<T, U>(map: qpc.ReadonlyMap<T>, mapValue: (value: T, key: string) => U | undefined, mapKey: (key: string) => string = identity): qpc.Map<U> {
  const result = createMap<U>();
  map.forEach((value, key) => {
    const mapped = mapValue(value, key);
    if (mapped !== undefined) {
      result.set(mapKey(key), mapped);
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

export function mapEntries<T, U>(map: qpc.ReadonlyMap<T>, f: (key: string, value: T) => [string, U]): qpc.Map<U>;
export function mapEntries<T, U>(map: qpc.ReadonlyMap<T> | undefined, f: (key: string, value: T) => [string, U]): qpc.Map<U> | undefined;
export function mapEntries<T, U>(map: qpc.ReadonlyMap<T> | undefined, f: (key: string, value: T) => [string, U]): qpc.Map<U> | undefined {
  if (!map) {
    return undefined;
  }
  const result = createMap<U>();
  map.forEach((value, key) => {
    const [newKey, newValue] = f(key, value);
    result.set(newKey, newValue);
  });
  return result;
}

export function some<T>(array: readonly T[] | undefined): array is readonly T[];
export function some<T>(array: readonly T[] | undefined, predicate: (value: T) => boolean): boolean;
export function some<T>(array: readonly T[] | undefined, predicate?: (value: T) => boolean): boolean {
  if (array) {
    if (predicate) {
      for (const v of array) {
        if (predicate(v)) {
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
export function concatenate<T>(array1: T[], array2: T[]): T[] {
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

function deduplicateRelational<T>(array: readonly T[], equalityComparer: qpc.EqualityComparer<T>, comparer: qpc.Comparer<T>) {
  const indices = indicesOf(array);
  stableSortIndices(array, indices, comparer);
  let last = array[indices[0]];
  const deduplicated: number[] = [indices[0]];
  for (let i = 1; i < indices.length; i++) {
    const index = indices[i];
    const item = array[index];
    if (!equalityComparer(last, item)) {
      deduplicated.push(index);
      last = item;
    }
  }
  deduplicated.sort();
  return deduplicated.map((i) => array[i]);
}

function deduplicateEquality<T>(array: readonly T[], equalityComparer: qpc.EqualityComparer<T>) {
  const result: T[] = [];
  for (const item of array) {
    pushIfUnique(result, item, equalityComparer);
  }
  return result;
}

export function deduplicate<T>(array: readonly T[], equalityComparer: qpc.EqualityComparer<T>, comparer?: qpc.Comparer<T>): T[] {
  return array.length === 0 ? [] : array.length === 1 ? array.slice() : comparer ? deduplicateRelational(array, equalityComparer, comparer) : deduplicateEquality(array, equalityComparer);
}

function deduplicateSorted<T>(array: qpc.SortedReadonlyArray<T>, comparer: qpc.EqualityComparer<T> | qpc.Comparer<T>): qpc.SortedReadonlyArray<T> {
  if (array.length === 0) return (emptyArray as any) as qpc.SortedReadonlyArray<T>;
  let last = array[0];
  const deduplicated: T[] = [last];
  for (let i = 1; i < array.length; i++) {
    const next = array[i];
    switch (comparer(next, last)) {
      case true:
      // falls through
      case qpc.Comparison.EqualTo:
        continue;
      case qpc.Comparison.LessThan:
        return Debug.fail('Array is unsorted.');
    }
    deduplicated.push((last = next));
  }
  return (deduplicated as any) as qpc.SortedReadonlyArray<T>;
}

export function insertSorted<T>(array: qpc.SortedArray<T>, insert: T, compare: qpc.Comparer<T>): void {
  if (array.length === 0) {
    array.push(insert);
    return;
  }
  const insertIndex = binarySearch(array, insert, identity, compare);
  if (insertIndex < 0) {
    array.splice(~insertIndex, 0, insert);
  }
}

export function sortAndDeduplicate<T>(array: readonly string[]): qpc.SortedReadonlyArray<string>;
export function sortAndDeduplicate<T>(array: readonly T[], comparer: qpc.Comparer<T>, equalityComparer?: qpc.EqualityComparer<T>): qpc.SortedReadonlyArray<T>;
export function sortAndDeduplicate<T>(array: readonly T[], comparer?: qpc.Comparer<T>, equalityComparer?: qpc.EqualityComparer<T>): qpc.SortedReadonlyArray<T> {
  return deduplicateSorted(sort(array, comparer), equalityComparer || comparer || ((compareStringsCaseSensitive as any) as qpc.Comparer<T>));
}

export function arrayIsEqualTo<T>(array1: readonly T[] | undefined, array2: readonly T[] | undefined, equalityComparer: (a: T, b: T, index: number) => boolean = equateValues): boolean {
  if (!array1 || !array2) {
    return array1 === array2;
  }
  if (array1.length !== array2.length) {
    return false;
  }
  for (let i = 0; i < array1.length; i++) {
    if (!equalityComparer(array1[i], array2[i], i)) {
      return false;
    }
  }
  return true;
}

export function compact<T>(array: (T | undefined | null | false | 0 | '')[]): T[];
export function compact<T>(array: readonly (T | undefined | null | false | 0 | '')[]): readonly T[];
export function compact<T>(array: T[]): T[];
export function compact<T>(array: readonly T[]): readonly T[];
export function compact<T>(array: T[]): T[] {
  let result: T[] | undefined;
  if (array) {
    for (let i = 0; i < array.length; i++) {
      const v = array[i];
      if (result || !v) {
        if (!result) {
          result = array.slice(0, i);
        }
        if (v) {
          result.push(v);
        }
      }
    }
  }
  return result || array;
}

export function relativeComplement<T>(arrayA: T[] | undefined, arrayB: T[] | undefined, comparer: qpc.Comparer<T>): T[] | undefined {
  if (!arrayB || !arrayA || arrayB.length === 0 || arrayA.length === 0) return arrayB;
  const result: T[] = [];
  loopB: for (let offsetA = 0, offsetB = 0; offsetB < arrayB.length; offsetB++) {
    if (offsetB > 0) {
      Debug.assertGreaterThanOrEqual(comparer(arrayB[offsetB], arrayB[offsetB - 1]), qpc.Comparison.EqualTo);
    }
    loopA: for (const startA = offsetA; offsetA < arrayA.length; offsetA++) {
      if (offsetA > startA) {
        Debug.assertGreaterThanOrEqual(comparer(arrayA[offsetA], arrayA[offsetA - 1]), qpc.Comparison.EqualTo);
      }
      switch (comparer(arrayB[offsetB], arrayA[offsetA])) {
        case qpc.Comparison.LessThan:
          result.push(arrayB[offsetB]);
          continue loopB;
        case qpc.Comparison.EqualTo:
          continue loopB;
        case qpc.Comparison.GreaterThan:
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

export function append<TArray extends any[] | undefined, TValue extends NonNullable<TArray>[number] | undefined>(to: TArray, value: TValue): [undefined, undefined] extends [TArray, TValue] ? TArray : NonNullable<TArray>[number][];
export function append<T>(to: T[], value: T | undefined): T[];
export function append<T>(to: T[] | undefined, value: T): T[];
export function append<T>(to: T[] | undefined, value: T | undefined): T[] | undefined;
export function append<T>(to: qpc.Push<T>, value: T | undefined): void;
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

export function pushIfUnique<T>(array: T[], toAdd: T, equalityComparer?: qpc.EqualityComparer<T>): boolean {
  if (contains(array, toAdd, equalityComparer)) {
    return false;
  } else {
    array.push(toAdd);
    return true;
  }
}

export function appendIfUnique<T>(array: T[] | undefined, toAdd: T, equalityComparer?: qpc.EqualityComparer<T>): T[] {
  if (array) {
    pushIfUnique(array, toAdd, equalityComparer);
    return array;
  } else {
    return [toAdd];
  }
}

function stableSortIndices<T>(array: readonly T[], indices: number[], comparer: qpc.Comparer<T>) {
  indices.sort((x, y) => comparer(array[x], array[y]) || compareValues(x, y));
}

export function sort<T>(array: readonly T[], comparer?: qpc.Comparer<T>): qpc.SortedReadonlyArray<T> {
  return (array.length === 0 ? array : array.slice().sort(comparer)) as qpc.SortedReadonlyArray<T>;
}

export function arrayIterator<T>(array: readonly T[]): Iterator<T> {
  let i = 0;
  return {
    next: () => {
      if (i === array.length) {
        return { value: undefined as never, done: true };
      } else {
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
      if (i === 0) {
        return { value: undefined as never, done: true };
      } else {
        i--;
        return { value: array[i], done: false };
      }
    },
  };
}

export function stableSort<T>(array: readonly T[], comparer: qpc.Comparer<T>): qpc.SortedReadonlyArray<T> {
  const indices = indicesOf(array);
  stableSortIndices(array, indices, comparer);
  return (indices.map((i) => array[i]) as qpc.SortedArray<T>) as qpc.SortedReadonlyArray<T>;
}

export function rangeEquals<T>(array1: readonly T[], array2: readonly T[], pos: number, end: number) {
  while (pos < end) {
    if (array1[pos] !== array2[pos]) {
      return false;
    }
    pos++;
  }
  return true;
}

export function elementAt<T>(array: readonly T[] | undefined, offset: number): T | undefined {
  if (array) {
    offset = toOffset(array, offset);
    if (offset < array.length) {
      return array[offset];
    }
  }
  return undefined;
}

export function firstOrUndefined<T>(array: readonly T[]): T | undefined {
  return array.length === 0 ? undefined : array[0];
}

export function first<T>(array: readonly T[]): T {
  Debug.assert(array.length !== 0);
  return array[0];
}

export function lastOrUndefined<T>(array: readonly T[]): T | undefined {
  return array.length === 0 ? undefined : array[array.length - 1];
}

export function last<T>(array: readonly T[]): T {
  Debug.assert(array.length !== 0);
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

export function binarySearch<T, U>(array: readonly T[], value: T, keySelector: (v: T) => U, keyComparer: qpc.Comparer<U>, offset?: number): number {
  return binarySearchKey(array, keySelector(value), keySelector, keyComparer, offset);
}

export function binarySearchKey<T, U>(array: readonly T[], key: U, keySelector: (v: T) => U, keyComparer: qpc.Comparer<U>, offset?: number): number {
  if (!some(array)) {
    return -1;
  }
  let low = offset || 0;
  let high = array.length - 1;
  while (low <= high) {
    const middle = low + ((high - low) >> 1);
    const midKey = keySelector(array[middle]);
    switch (keyComparer(midKey, key)) {
      case qpc.Comparison.LessThan:
        low = middle + 1;
        break;
      case qpc.Comparison.EqualTo:
        return middle;
      case qpc.Comparison.GreaterThan:
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

export function hasProperty(map: qpc.MapLike<any>, key: string): boolean {
  return hasOwnProperty.call(map, key);
}

export function getProperty<T>(map: qpc.MapLike<T>, key: string): T | undefined {
  return hasOwnProperty.call(map, key) ? map[key] : undefined;
}

export function getOwnKeys<T>(map: qpc.MapLike<T>): string[] {
  const keys: string[] = [];
  for (const key in map) {
    if (hasOwnProperty.call(map, key)) {
      keys.push(key);
    }
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
    if (hasOwnProperty.call(sparseArray, key)) {
      values.push(sparseArray[key]);
    }
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
      if (hasProperty(arg, p)) {
        t[p] = arg[p];
      }
    }
  }
  return t;
}

export function equalOwnProperties<T>(left: qpc.MapLike<T> | undefined, right: qpc.MapLike<T> | undefined, equalityComparer: qpc.EqualityComparer<T> = equateValues) {
  if (left === right) return true;
  if (!left || !right) return false;
  for (const key in left) {
    if (hasOwnProperty.call(left, key)) {
      if (!hasOwnProperty.call(right, key)) return false;
      if (!equalityComparer(left[key], right[key])) return false;
    }
  }
  for (const key in right) {
    if (hasOwnProperty.call(right, key)) {
      if (!hasOwnProperty.call(left, key)) return false;
    }
  }
  return true;
}

export function arrayToMap<T>(array: readonly T[], makeKey: (value: T) => string | undefined): qpc.Map<T>;
export function arrayToMap<T, U>(array: readonly T[], makeKey: (value: T) => string | undefined, makeValue: (value: T) => U): qpc.Map<U>;
export function arrayToMap<T, U>(array: readonly T[], makeKey: (value: T) => string | undefined, makeValue: (value: T) => T | U = identity): qpc.Map<T | U> {
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
    if (hasOwnProperty.call(second, id)) {
      (result as any)[id] = (second as any)[id];
    }
  }
  for (const id in first) {
    if (hasOwnProperty.call(first, id)) {
      (result as any)[id] = (first as any)[id];
    }
  }
  return result;
}

export function copyProperties<T1 extends T2, T2>(first: T1, second: T2) {
  for (const id in second) {
    if (hasOwnProperty.call(second, id)) {
      (first as any)[id] = second[id];
    }
  }
}

export function maybeBind<T, A extends any[], R>(o: T, f?: (this: T, ...args: A) => R): ((...args: A) => R) | undefined {
  return f?.bind(o);
}

export function mapMap<T, U>(map: qpc.Map<T>, f: (t: T, key: string) => [string, U]): qpc.Map<U>;
export function mapMap<T, U>(map: qt.UnderscoreEscapedMap<T>, f: (t: T, key: qt.__String) => [string, U]): qpc.Map<U>;
export function mapMap<T, U>(map: qpc.Map<T> | qt.UnderscoreEscapedMap<T>, f: (t: T, key: string | qt.__String) => [string, U]): qpc.Map<U> {
  const result = createMap<U>();
  map.forEach((t: T, key: string | qt.__String) => result.set(...f(t, key)));
  return result;
}

export interface MultiMap<T> extends qpc.Map<T[]> {
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
  if (values) {
    values.push(value);
  } else {
    this.set(key, (values = [value]));
  }
  return values;
}

function multiMapRemove<T>(this: MultiMap<T>, key: string, value: T) {
  const values = this.get(key);
  if (values) {
    unorderedRemoveItem(values, value);
    if (!values.length) {
      this.delete(key);
    }
  }
}

export interface UnderscoreEscapedMultiMap<T> extends qt.UnderscoreEscapedMap<T[]> {
  add(key: qt.__String, value: T): T[];
  remove(key: qt.__String, value: T): void;
}

export function createUnderscoreEscapedMultiMap<T>(): UnderscoreEscapedMultiMap<T> {
  return createMultiMap<T>() as UnderscoreEscapedMultiMap<T>;
}

export function isArray(value: any): value is readonly {}[] {
  return Array.isArray ? Array.isArray(value) : value instanceof Array;
}

export function toArray<T>(value: T | T[]): T[];
export function toArray<T>(value: T | readonly T[]): readonly T[];
export function toArray<T>(value: T | T[]): T[] {
  return isArray(value) ? value : [value];
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

  return Debug.fail(`Invalid cast. The supplied value ${value} did not pass the test '${Debug.getFunctionName(test)}'.`);
}

export function noop(_?: {} | null | undefined): void {}

export function returnFalse(): false {
  return false;
}

export function returnTrue(): true {
  return true;
}

export function returnUndefined(): undefined {
  return undefined;
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

export function memoize<T>(callback: () => T): () => T {
  let value: T;
  return () => {
    if (callback) {
      value = callback();
      callback = undefined!;
    }
    return value;
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

function compareComparableValues(a: string | undefined, b: string | undefined): qpc.Comparison;
function compareComparableValues(a: number | undefined, b: number | undefined): qpc.Comparison;
function compareComparableValues(a: string | number | undefined, b: string | number | undefined) {
  return a === b ? qpc.Comparison.EqualTo : a === undefined ? qpc.Comparison.LessThan : b === undefined ? qpc.Comparison.GreaterThan : a < b ? qpc.Comparison.LessThan : qpc.Comparison.GreaterThan;
}

export function compareValues(a: number | undefined, b: number | undefined): qpc.Comparison {
  return compareComparableValues(a, b);
}

export function compareTextSpans(a: Partial<qt.TextSpan> | undefined, b: Partial<qt.TextSpan> | undefined): qpc.Comparison {
  return compareValues(a?.start, b?.start) || compareValues(a?.length, b?.length);
}

export function min<T>(a: T, b: T, compare: qpc.Comparer<T>): T {
  return compare(a, b) === qpc.Comparison.LessThan ? a : b;
}

export function compareStringsCaseInsensitive(a: string, b: string) {
  if (a === b) return qpc.Comparison.EqualTo;
  if (a === undefined) return qpc.Comparison.LessThan;
  if (b === undefined) return qpc.Comparison.GreaterThan;
  a = a.toUpperCase();
  b = b.toUpperCase();
  return a < b ? qpc.Comparison.LessThan : a > b ? qpc.Comparison.GreaterThan : qpc.Comparison.EqualTo;
}

export function compareStringsCaseSensitive(a: string | undefined, b: string | undefined): qpc.Comparison {
  return compareComparableValues(a, b);
}

export function getStringComparer(ignoreCase?: boolean) {
  return ignoreCase ? compareStringsCaseInsensitive : compareStringsCaseSensitive;
}

const createUIStringComparer = (() => {
  let defaultComparer: qpc.Comparer<string> | undefined;
  let enUSComparer: qpc.Comparer<string> | undefined;

  const stringComparerFactory = getStringComparerFactory();
  return createStringComparer;

  function compareWithCallback(a: string | undefined, b: string | undefined, comparer: (a: string, b: string) => number) {
    if (a === b) return qpc.Comparison.EqualTo;
    if (a === undefined) return qpc.Comparison.LessThan;
    if (b === undefined) return qpc.Comparison.GreaterThan;
    const value = comparer(a, b);
    return value < 0 ? qpc.Comparison.LessThan : value > 0 ? qpc.Comparison.GreaterThan : qpc.Comparison.EqualTo;
  }

  function createIntlCollatorStringComparer(locale: string | undefined): qpc.Comparer<string> {
    const comparer = new Intl.Collator(locale, { usage: 'sort', sensitivity: 'variant' }).compare;
    return (a, b) => compareWithCallback(a, b, comparer);
  }

  function createLocaleCompareStringComparer(locale: string | undefined): qpc.Comparer<string> {
    if (locale !== undefined) return createFallbackStringComparer();
    return (a, b) => compareWithCallback(a, b, compareStrings);
    function compareStrings(a: string, b: string) {
      return a.localeCompare(b);
    }
  }

  function createFallbackStringComparer(): qpc.Comparer<string> {
    return (a, b) => compareWithCallback(a, b, compareDictionaryOrder);

    function compareDictionaryOrder(a: string, b: string) {
      return compareStrings(a.toUpperCase(), b.toUpperCase()) || compareStrings(a, b);
    }

    function compareStrings(a: string, b: string) {
      return a < b ? qpc.Comparison.LessThan : a > b ? qpc.Comparison.GreaterThan : qpc.Comparison.EqualTo;
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

let uiComparerCaseSensitive: qpc.Comparer<string> | undefined;
let uiLocale: string | undefined;

export function getUILocale() {
  return uiLocale;
}

export function setUILocale(value: string | undefined) {
  if (uiLocale !== value) {
    uiLocale = value;
    uiComparerCaseSensitive = undefined;
  }
}

export function compareStringsCaseSensitiveUI(a: string, b: string) {
  const comparer = uiComparerCaseSensitive || (uiComparerCaseSensitive = createUIStringComparer(uiLocale));
  return comparer(a, b);
}

export function compareProperties<T, K extends keyof T>(a: T | undefined, b: T | undefined, key: K, comparer: qpc.Comparer<T[K]>): qpc.Comparison {
  return a === b ? qpc.Comparison.EqualTo : a === undefined ? qpc.Comparison.LessThan : b === undefined ? qpc.Comparison.GreaterThan : comparer(a[key], b[key]);
}

export function compareBooleans(a: boolean, b: boolean): qpc.Comparison {
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
        continue;
      }
      const distance = levenshteinWithMax(nameLowerCase, candidateNameLowerCase, bestDistance - 1);
      if (distance === undefined) {
        continue;
      }
      if (distance < 3) {
        justCheckExactMatches = true;
        bestCandidate = candidate;
      } else {
        Debug.assert(distance < bestDistance); // Else `levenshteinWithMax` should return undefined
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
    if (colMin > max) {
      return undefined;
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

function unorderedRemoveFirstItemWhere<T>(array: T[], predicate: (element: T) => boolean) {
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i])) {
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
  Debug.assert(isPatternMatch(pattern, candidate));
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

export function enumerateInsertsAndDeletes<T, U>(newItems: readonly T[], oldItems: readonly U[], comparer: (a: T, b: U) => qpc.Comparison, inserted: (newItem: T) => void, deleted: (oldItem: U) => void, unchanged?: (oldItem: U, newItem: T) => void) {
  unchanged = unchanged || noop;
  let newIndex = 0;
  let oldIndex = 0;
  const newLen = newItems.length;
  const oldLen = oldItems.length;
  while (newIndex < newLen && oldIndex < oldLen) {
    const newItem = newItems[newIndex];
    const oldItem = oldItems[oldIndex];
    const compareResult = comparer(newItem, oldItem);
    if (compareResult === qpc.Comparison.LessThan) {
      inserted(newItem);
      newIndex++;
    } else if (compareResult === qpc.Comparison.GreaterThan) {
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
