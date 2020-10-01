import * as qb from './q0_a';
export interface Config {
  flip?: boolean;
}
export interface Frame extends Config, qb.Frame {
  make: unknown;
}
export const enum Kind {
  A,
  B,
  C,
  AB,
  BC,
  ABC,
}
export interface Nobj extends qb.Data {
  k: Kind;
  readonly n1: number;
  n2?: number;
  walk<T>(cb?: (n?: Node) => T | undefined): T | undefined;
}
export interface Nodes<T extends Nobj = Nobj> extends ReadonlyArray<T>, qb.Data {
  ns1: number;
  walk<U>(cb?: (n?: Node) => U | undefined, cbs?: (ns?: Nodes) => U | undefined): U | undefined;
}
export interface A extends Nobj {
  k: Kind.A;
  a1: number;
}
export interface B extends Nobj {
  k: Kind.B;
  readonly b1: number;
  b2: A;
}
export interface C extends Nobj {
  k: Kind.C;
  c1?: number;
  c2?: Nodes<B>;
}
export type Node = A | B | C;
