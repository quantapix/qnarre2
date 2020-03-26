import * as d3 from 'd3';

export type Scalar = string | number | boolean;

export type Selection = d3.Selection<any, any, any, any>;

export interface Dict<T> {
  [k: string]: T;
}

export interface ArrayLike<T> {
  [i: number]: T;
  length: number;
  item(i: number): T | undefined;
}

export interface Named {
  name?: string;
}

export function isNamed(x?: Named | string | number): x is Named {
  return x ? typeof x !== 'string' && typeof x !== 'number' : false;
}

export type Dir = 'tb' | 'bt' | 'lr' | 'rl';

export class Point {
  constructor(public x = 0, public y = 0) {}
}

export class Area {
  constructor(public w = 0, public h = 0) {}
}

export class Rect {
  constructor(public x = 0, public y = 0, public w = 0, public h = 0) {}
}

export class Radius {
  constructor(public rx = 0, public ry = 0) {}
}

export interface Label {
  id: string;
  type: string;
  style: string;
  txt: any;
  cluster: string;
}

export interface Border {
  type: string;
  top: string[];
  bottom: string[];
  left: string[];
  right: string[];
}

export interface Pad extends Point {
  top: number;
  bottom: number;
  left: number;
  right: number;
  v: number;
}

export interface Arrow {
  idx: number;
  id: string;
}
