import * as qb from './base';
export const enum Kind {
  A,
  B,
  C,
  AB,
  BC,
  ABC,
}
export interface N extends qb.Data {
  k: Kind;
  readonly n1: number;
  n2?: number;
  walk<T>(cb?: (n?: All) => T | undefined): T | undefined;
}
export interface Ns<T extends N = N> extends ReadonlyArray<T>, qb.Data {
  ns1: number;
  walk<U>(cb?: (n?: All) => U | undefined, cbs?: (ns?: Ns) => U | undefined): U | undefined;
}
export interface A extends N {
  k: Kind.A;
  a1: number;
}
export interface B extends N {
  k: Kind.B;
  readonly b1: number;
  b2: A;
}
export interface C extends N {
  k: Kind.C;
  c1?: Ns<B>;
}
export type All = A | B | C;
