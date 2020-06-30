export const enum Syntax {
  AAA,
  BBB,
  CCC,
  XXX,
  YYY,
}
export interface SynMap {
  [Syntax.AAA]: AAA;
  [Syntax.BBB]: BBB;
  [Syntax.CCC]: CCC;
  [Syntax.XXX]: XXX;
  [Syntax.YYY]: YYY;
}
export type NodeType<S extends Syntax> = S extends keyof SynMap ? SynMap[S] : never;
export interface Node {
  kind: Syntax;
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T): this is NodeType<T['kind']>;
}
export interface XXX extends Node {
  x1: number;
}
export interface YYY extends Node {
  y1: number;
}
export interface AAA extends Node {
  kind: Syntax.AAA;
  a1: number;
}
export interface BBB extends XXX {
  kind: Syntax.BBB;
  b1: number;
}
export interface CCC extends XXX, YYY {
  kind: Syntax.CCC;
  c1: number;
}
