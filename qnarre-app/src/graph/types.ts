import * as d3 from 'd3';

export type Selection = d3.Selection<any, any, any, any>;

export type Scalar = string | number | boolean;

export interface Dict<T> {
  [k: string]: T;
}

export interface ArrayLike<T> {
  [i: number]: T;
  length: number;
  item(i: number): T | undefined;
}

export type Dir = 'tb' | 'bt' | 'lr' | 'rl';

export interface Point {
  x: number;
  y: number;
}

export interface Area {
  w: number;
  h: number;
}

export interface Rect extends Point, Area {}

export interface Radius {
  rx: number;
  ry: number;
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
