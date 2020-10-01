import { Kind } from '../q0_b';
import * as qt from '../q0_b';
import * as q1 from '../q1';
export interface AB extends qt.Nobj {
  k: Kind.AB;
  readonly n1: number;
  ab1: number;
}
export class AB extends q1.Nobj implements AB {
  get n2(): number | undefined {
    return 10;
  }
  update(ab1: number) {
    this.ab1 = ab1;
    return this;
  }
}
export interface BC extends qt.Nobj {
  k: Kind.BC;
  readonly n1: number;
  bc1: number;
}
export class BC extends q1.Nobj implements BC {
  get n2(): number | undefined {
    return 20;
  }
  update(bc1: number) {
    this.bc1 = bc1;
    return this;
  }
}
export type Node = AB | BC | q1.Node;
