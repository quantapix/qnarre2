import { Kind } from '../type';
import * as qt from '../type';
import * as q1 from '../l1';
export interface AB extends qt.N {
  k: Kind.AB;
  readonly n1: number;
  ab1: number;
}
export class AB extends q1.N implements AB {
  update(ab1: number) {
    this.ab1 = ab1;
    return this;
  }
}
export interface BC extends qt.N {
  k: Kind.BC;
  readonly n1: number;
  bc1: number;
}
export class BC extends q1.N implements BC {
  update(bc1: number) {
    this.bc1 = bc1;
    return this;
  }
}
export type All = AB | BC | q1.All;
