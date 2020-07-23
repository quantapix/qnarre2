import * as qd from '../diagnostic';
import * as qt from '../type';
import * as qu from '../util';
import { newIs, newHas, newGet } from './index';
export * from '../type';
export interface Frame {
  create: any;
  is: any;
  has: any;
  get: any;
}
