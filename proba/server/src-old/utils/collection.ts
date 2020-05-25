import { compareValues, Comparison, equateValues, isArray } from './core';

export function pushAll<T>(to: T[], from: T[]) {
  if (from) {
    for (const e of from) {
      to.push(e);
    }
  }
}

export function contains<T>(arr: T[], val: T) {
  return arr.includes(val);
}

export function mergeSort<T>(data: T[], compare: (a: T, b: T) => number): T[] {
  _divideAndMerge(data, compare);
  return data;
}

function _divideAndMerge<T>(data: T[], compare: (a: T, b: T) => number): void {
  if (data.length <= 1) {
    // sorted
    return;
  }
  const p = (data.length / 2) | 0;
  const left = data.slice(0, p);
  const right = data.slice(p);

  _divideAndMerge(left, compare);
  _divideAndMerge(right, compare);

  let leftIdx = 0;
  let rightIdx = 0;
  let i = 0;
  while (leftIdx < left.length && rightIdx < right.length) {
    const ret = compare(left[leftIdx], right[rightIdx]);
    if (ret <= 0) {
      // smaller_equal -> take left to preserve order
      data[i++] = left[leftIdx++];
    } else {
      // greater -> take right
      data[i++] = right[rightIdx++];
    }
  }
  while (leftIdx < left.length) {
    data[i++] = left[leftIdx++];
  }
  while (rightIdx < right.length) {
    data[i++] = right[rightIdx++];
  }
}

export function binarySearch<T>(
  array: T[],
  key: T,
  comparator: (op1: T, op2: T) => number
): number {
  let low = 0,
    high = array.length - 1;

  while (low <= high) {
    const mid = ((low + high) / 2) | 0;
    const comp = comparator(array[mid], key);
    if (comp < 0) {
      low = mid + 1;
    } else if (comp > 0) {
      high = mid - 1;
    } else {
      return mid;
    }
  }
  return -(low + 1);
}

export function equals<T>(
  one: ReadonlyArray<T>,
  other: ReadonlyArray<T>,
  itemEquals: (a: T, b: T) => boolean = (a, b) => a === b
): boolean {
  if (one.length !== other.length) {
    return false;
  }

  for (let i = 0, len = one.length; i < len; i++) {
    if (!itemEquals(one[i], other[i])) {
      return false;
    }
  }

  return true;
}

export function flatten<T>(arr: ReadonlyArray<T>[]): T[] {
  return ([] as T[]).concat.apply([], arr);
}

export const emptyArray: never[] = [] as never[];
export type EqualityComparer<T> = (a: T, b: T) => boolean;

export function contains<T>(
  array: readonly T[] | undefined,
  value: T,
  equalityComparer: EqualityComparer<T> = equateValues
): boolean {
  if (array) {
    for (const v of array) {
      if (equalityComparer(v, value)) {
        return true;
      }
    }
  }
  return false;
}

export interface Push<T> {
  push(...values: T[]): void;
}

export function append<
  TArray extends any[] | undefined,
  TValue extends NonNullable<TArray>[number] | undefined
>(
  to: TArray,
  value: TValue
): [undefined, undefined] extends [TArray, TValue]
  ? TArray
  : NonNullable<TArray>[number][];
export function append<T>(to: T[], value: T | undefined): T[];
export function append<T>(to: T[] | undefined, value: T): T[];
export function append<T>(to: T[] | undefined, value: T | undefined): T[] | undefined;
export function append<T>(to: Push<T>, value: T | undefined): void;
export function append<T>(to: T[], value: T | undefined): T[] | undefined {
  if (value === undefined) {
    return to;
  }
  if (to === undefined) {
    return [value];
  }
  to.push(value);
  return to;
}

export function find<T, U extends T>(
  array: readonly T[],
  predicate: (element: T, index: number) => element is U
): U | undefined;
export function find<T>(
  array: readonly T[],
  predicate: (element: T, index: number) => boolean
): T | undefined;
export function find<T>(
  array: readonly T[],
  predicate: (element: T, index: number) => boolean
): T | undefined {
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (predicate(value, i)) {
      return value;
    }
  }
  return undefined;
}

function toOffset(array: readonly any[], offset: number) {
  return offset < 0 ? array.length + offset : offset;
}

export function addRange<T>(
  to: T[],
  from: readonly T[] | undefined,
  start?: number,
  end?: number
): T[];
export function addRange<T>(
  to: T[] | undefined,
  from: readonly T[] | undefined,
  start?: number,
  end?: number
): T[] | undefined;
export function addRange<T>(
  to: T[] | undefined,
  from: readonly T[] | undefined,
  start?: number,
  end?: number
): T[] | undefined {
  if (from === undefined || from.length === 0) {
    return to;
  }
  if (to === undefined) {
    return from.slice(start, end);
  }
  start = start === undefined ? 0 : toOffset(from, start);
  end = end === undefined ? from.length : toOffset(from, end);
  for (let i = start; i < end && i < from.length; i++) {
    if (from[i] !== undefined) {
      to.push(from[i]);
    }
  }
  return to;
}

export function insertAt<T>(array: T[], index: number, value: T) {
  if (index === 0) {
    array.unshift(value);
  } else if (index === array.length) {
    array.push(value);
  } else {
    for (let i = array.length; i > index; i--) {
      array[i] = array[i - 1];
    }
    array[index] = value;
  }
  return array;
}

export type Comparer<T> = (a: T, b: T) => Comparison;

export interface SortedReadonlyArray<T> extends ReadonlyArray<T> {
  ' __sortedArrayBrand': any;
}

export interface SortedArray<T> extends Array<T> {
  ' __sortedArrayBrand': any;
}

export function cloneAndSort<T>(
  array: readonly T[],
  comparer?: Comparer<T>
): SortedReadonlyArray<T> {
  return (array.length === 0
    ? array
    : array.slice().sort(comparer)) as SortedReadonlyArray<T>;
}

function selectIndex(_: unknown, i: number) {
  return i;
}

function indicesOf(array: readonly unknown[]): number[] {
  return array.map(selectIndex);
}

export function stableSort<T>(
  array: readonly T[],
  comparer: Comparer<T>
): SortedReadonlyArray<T> {
  const indices = indicesOf(array);
  stableSortIndices(array, indices, comparer);
  return (indices.map((i) => array[i]) as SortedArray<T>) as SortedReadonlyArray<T>;
}

function stableSortIndices<T>(
  array: readonly T[],
  indices: number[],
  comparer: Comparer<T>
) {
  indices.sort((x, y) => comparer(array[x], array[y]) || compareValues(x, y));
}

export function map<T, U>(array: readonly T[], f: (x: T, i: number) => U): U[];
export function map<T, U>(
  array: readonly T[] | undefined,
  f: (x: T, i: number) => U
): U[] | undefined;
export function map<T, U>(
  array: readonly T[] | undefined,
  f: (x: T, i: number) => U
): U[] | undefined {
  if (array) {
    return array.map(f);
  }
  return undefined;
}

export function some<T>(array: readonly T[] | undefined): array is readonly T[];
export function some<T>(
  array: readonly T[] | undefined,
  predicate: (value: T) => boolean
): boolean;
export function some<T>(
  array: readonly T[] | undefined,
  predicate?: (value: T) => boolean
): boolean {
  if (array) {
    if (predicate) {
      return array.some(predicate);
    } else {
      return array.length > 0;
    }
  }
  return false;
}

export function every<T>(
  array: readonly T[],
  callback: (element: T, index: number) => boolean
): boolean {
  if (array) {
    return array.every(callback);
  }

  return true;
}

export function binarySearch<T, U>(
  array: readonly T[],
  value: T,
  keySelector: (v: T) => U,
  keyComparer: Comparer<U>,
  offset?: number
): number {
  return binarySearchKey(array, keySelector(value), keySelector, keyComparer, offset);
}

export function binarySearchKey<T, U>(
  array: readonly T[],
  key: U,
  keySelector: (v: T) => U,
  keyComparer: Comparer<U>,
  offset?: number
): number {
  if (!some(array)) {
    return -1;
  }

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

export function flatten<T>(
  array: T[][] | readonly (T | readonly T[] | undefined)[]
): T[] {
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

export function getNestedProperty(object: any, property: string) {
  const value = property.split('.').reduce((obj, prop) => {
    return obj && obj[prop];
  }, object);
  return value;
}
