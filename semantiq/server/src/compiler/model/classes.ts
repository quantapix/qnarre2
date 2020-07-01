import * as qt from './types';
import { NodeType, Syntax } from './types';

export * from './types';

export class Base {
  b = 0;
  base() {
    this.b += 1;
    console.log(`called base from ${this}, ${this.b}`);
    return this.b;
  }
  toString() {
    return 'Base';
  }
}

export abstract class Node extends Base implements qt.Node {
  kind: any;
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T): this is NodeType<T['kind']> {
    return this.kind === t.kind || !!t.also?.includes(this.kind);
  }
  abstract nn1(): number;
  nn2() {
    return 0;
  }
}

export interface XXX {
  xx2(): number;
}
export abstract class XXX extends Node implements qt.XXX {
  x1 = 0;
  nn1() {
    console.log(`XXX.nn1: instance of ${this}`);
    return 0;
  }
  xx1() {
    this.x1 += 10;
    console.log(`xx1: from ${this}, ${this.x1}`);
    return this.x1;
  }
}

export class YYY extends Node implements qt.YYY {
  y1 = 0;
  nn1() {
    console.log(`YYY.nn1: instance of ${this}`);
    return 0;
  }
  yy1() {
    this.y1 += 100;
    console.log(`yy1: from ${this}, ${this.y1}`);
    return this.y1;
  }
}

export class AAA extends Node implements qt.AAA {
  static readonly kind = Syntax.AAA;
  a1 = 0;
  nn1() {
    console.log(`nn1: should be instance of AAA: ${this}`);
    return 0;
  }
  aa1() {
    this.a1 += 1000;
    console.log(`aa1: from ${this}, ${this.a1}`);
    return this.a1;
  }
  toString() {
    return 'AAA';
  }
}
AAA.prototype.kind = AAA.kind;

export interface BBB extends XXX {}
export class BBB extends XXX implements qt.BBB {
  static readonly kind = Syntax.BBB;
  b1 = 0;
  toString() {
    return 'BBB';
  }
}
BBB.prototype.kind = BBB.kind;
BBB.prototype.xx2 = () => 0;

export interface CCC extends XXX, YYY {}
export class CCC extends Node implements qt.CCC {
  static readonly kind = Syntax.CCC;
  x1 = 0;
  y1 = 0;
  c1 = 0;
  nn1() {
    console.log(`nn1: should be instance of CCC: ${this}`);
    return 0;
  }
  toString() {
    return 'CCC';
  }
}
CCC.prototype.kind = CCC.kind;
addMixins(CCC, [XXX, YYY]);
CCC.prototype.xx2 = () => 0;

export function addMixins(t: any, ss: any[]) {
  ss.forEach((s: any) => {
    Object.getOwnPropertyNames(s.prototype).forEach((n) => {
      if (n == 'constructor') return;
      console.log(`adding ${s.name}.${n}`);
      Object.defineProperty(t.prototype, n, Object.getOwnPropertyDescriptor(s.prototype, n)!);
    });
  });
}

/*

const a = new AAA();
console.log(`should be true: ${a.is(AAA)}, should be ${AAA.kind}: ${a.kind}`);
console.log(`should be false: ${a.is(BBB)}`);
a.base();
a.aa1();
a.nn1();
const b = new BBB();
console.log(`should be true: ${b.is(BBB)}, should be ${BBB.kind}: ${b.kind}`);
console.log(`should be false: ${b.is(AAA)}`);
b.base();
b.xx1();
console.log(`should be 0: ${b.xx2()}`);
b.nn1();
const c = new CCC();
console.log(`should be true: ${c.is(CCC)}, should be ${CCC.kind}: ${c.kind}`);
console.log(`should be false: ${c.is(AAA)}`);
console.log(`should be false: ${c.is(BBB)}`);
c.base();
c.xx1();
console.log(`should be 0: ${c.xx2()}`);
c.yy1();
c.nn1();
*/
