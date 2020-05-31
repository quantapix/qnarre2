namespace qnr {
  export const versionMajorMinor = '4.0';
  export const version = `${versionMajorMinor}.0-dev`;

  export interface MapLike<T> {
    [k: string]: T;
  }

  export type QReadonlyMap<V> = ReadonlyMap<string, V>;
  export type QMap<V> = Map<string, V>;

  export interface SortedReadonlyArray<T> extends ReadonlyArray<T> {
    ' __sortedArrayBrand': any;
  }

  export interface SortedArray<T> extends Array<T> {
    ' __sortedArrayBrand': any;
  }

  export interface QIterator<T> {
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
}
