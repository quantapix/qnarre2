import { createMapShim } from './shims';

export const versionMajorMinor = '4.0';
export const version = `${versionMajorMinor}.0-dev`;

export interface MapLike<T> {
  [index: string]: T;
}

export interface SortedReadonlyArray<T> extends ReadonlyArray<T> {
  ' __sortedArrayBrand': any;
}

export interface SortedArray<T> extends Array<T> {
  ' __sortedArrayBrand': any;
}

export interface ReadonlyMap<T> {
  get(key: string): T | undefined;
  has(key: string): boolean;
  forEach(action: (value: T, key: string) => void): void;
  readonly size: number;
  keys(): Iterator<string>;
  values(): Iterator<T>;
  entries(): Iterator<[string, T]>;
}

export interface Map<T> extends ReadonlyMap<T> {
  set(key: string, value: T): this;
  delete(key: string): boolean;
  clear(): void;
}

export interface MapConstructor {
  new <T>(): Map<T>;
}

export function tryGetNativeMap(): MapConstructor | undefined {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  declare const Map: (new <T>() => Map<T>) | undefined;
  return typeof Map !== 'undefined' && 'entries' in Map.prototype ? Map : undefined;
}

export const Map: MapConstructor = tryGetNativeMap() || createMapShim();

export interface Iterator<T> {
  next(): { value: T; done?: false } | { value: never; done: true };
}

export interface Push<T> {
  push(...values: T[]): void;
}

export type EqualityComparer<T> = (a: T, b: T) => boolean;

export type Comparer<T> = (a: T, b: T) => Comparison;

export const enum Comparison {
  LessThan = -1,
  EqualTo = 0,
  GreaterThan = 1,
}
