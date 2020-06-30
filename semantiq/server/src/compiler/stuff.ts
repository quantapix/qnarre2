function addMixins(t: any, ss: any[]) {
  ss.forEach((s: any) => {
    Object.getOwnPropertyNames(s.prototype).forEach((n) => {
      if (n == 'constructor') return;
      console.log(`adding ${s.name}.${n}`);
      Object.defineProperty(t.prototype, n, Object.getOwnPropertyDescriptor(s.prototype, n)!);
    });
  });
}
class Base {
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
const enum Syntax {
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
abstract class QNode extends Base {
  kind!: Syntax;
  is<S extends Syntax, T extends { kind: S; also?: Syntax[] }>(t: T): this is NodeType<T['kind']> {
    return this.kind === t.kind || !!t.also?.includes(this.kind);
  }
  abstract nnn(): number;
}
interface XXX {
  x: number;
  xyz(): number;
}
abstract class XXX extends QNode {
  x = 0;
  xxx() {
    this.x += 10;
    console.log(`called xxx from ${this}, ${this.x}`);
    return this.x;
  }
  abstract xxy(): number;
  nnn() {
    console.log(`XXX.nnn: instance of ${this}`);
    return 0;
  }
}
interface YYY {
  y: number;
}
class YYY extends QNode {
  y = 0;
  yyy() {
    this.y += 100;
    console.log(`called yyy from ${this}, ${this.y}`);
    return this.y;
  }
  nnn() {
    return 0;
  }
}
interface AAA {
  kind: typeof AAA.kind;
  nnn(): number;
}
class AAA extends QNode {
  static readonly kind = Syntax.AAA;
  a = 0;
  aaa() {
    this.a += 1000;
    console.log(`called aaa from ${this}, ${this.a}`);
    return this.a;
  }
  toString() {
    return 'AAA';
  }
}
AAA.prototype.kind = AAA.kind;
AAA.prototype.nnn = function () {
  console.log(`nnn: should be instance of AAA: ${this}`);
  return 0;
};
interface BBB extends XXX {
  kind: typeof BBB.kind;
}
class BBB extends XXX {
  static readonly kind = Syntax.BBB;
  xxy() {
    return NaN;
  }
  toString() {
    return 'BBB';
  }
}
BBB.prototype.kind = BBB.kind;
BBB.prototype.xxy = () => 0;
interface CCC extends XXX, YYY {
  kind: typeof CCC.kind;
}
class CCC extends QNode {
  static readonly kind = Syntax.CCC;
  x = 0;
  y = 0;
}
CCC.prototype.kind = CCC.kind;
addMixins(CCC, [XXX, YYY]);
CCC.prototype.xxy = () => 0;

const a = new AAA();
console.log(`should be true: ${a.is(AAA)}, should be ${AAA.kind}: ${a.kind}`);
console.log(`should be false: ${a.is(BBB)}`);
a.base();
a.aaa();
a.nnn();
const b = new BBB();
console.log(`should be true: ${b.is(BBB)}, should be ${BBB.kind}: ${b.kind}`);
console.log(`should be false: ${b.is(AAA)}`);
b.base();
b.xxx();
console.log(`should be 0: ${b.xxy()}`);
b.nnn();
const c = new CCC();
console.log(`should be true: ${c.is(CCC)}, should be ${CCC.kind}: ${c.kind}`);
console.log(`should be false: ${c.is(AAA)}`);
console.log(`should be false: ${c.is(BBB)}`);
c.base();
c.xxx();
console.log(`should be 0: ${c.xxy()}`);
c.yyy();
c.nnn();

let r = [...Array(5).keys()];
const enum SymKey {
  AAA,
  BBB,
  CCC,
  End,
}
r = [...Array(SymKey.End).keys()];
console.log(r);

type KS = keyof typeof SymKey;

const INTERVALS = ['total', 'weekly', 'biweekly', 'monthly', 'annually'] as const;
type Interval = typeof INTERVALS[number];

type KS2<T extends Record<string, KS>> = {
  -readonly [K in keyof T]: KS;
};
let SymNames: { [P in keyof typeof SymKey]: { Name: P; Value: typeof SymKey[P] } } = {
  AAA: { Value: SymKey.AAA, Name: 'AAA' },
  BBB: { Value: SymKey.BBB, Name: 'BBB' },
  CCC: { Value: SymKey.CCC, Name: 'CCC' },
  End: { Value: SymKey.End, Name: 'End' },
};

type NS<T> = T extends QNode ? T : never;
const nodes = Object.keys(QNode).map((k) => (QNode as any)[k]);
console.log(nodes);
/*
function cNode<C extends SymKey>(cs: C, n: string): { [P in keyof C]: C[P] }[keyof C] {
    return  (cs as any)[n];
}

type SymType<K extends SymKey> = K extends keyof CMap ? CMap[K] : never;


function cNode<C extends SymKey>(cs: C, n: string): { [P in keyof C]: C[P] }[keyof C] {
    return  (cs as any)[n];
}
const m = mapEnum(SymKey, "");

type QRecord<C extends keyof typeof SymKey, N extends QNode> = {
  [P in C]: N;
};
type QI<T extends QRecord<string, keyof MapSchemaTypes>> = {
  -readonly [K in keyof T]: (typeof nodes)[T[K]]
}
interface CMap {
  [SymKey.AAA]: QNode.Aaa;
  [SymKey.BBB]: QNode.Bbb;
}
type GN<C extends SymKey> = C extends keyof CMap ? CMap[C] : never;
function create<C extends SymKey>(c: C): GN<C> {
  return QNode.create(c) as GN<C>;
}
function isKind<C extends SymKey, T extends { kind: C }>(n: GN<C>, t: T): n is GN<C> {
  return n.kind === t.kind;
}

const a = QNode.create(SymKey.AAA) as QNode.Aaa;
const b = QNode.create(SymKey.BBB) as QNode.Bbb;

const a2 = create(SymKey.AAA);
const b2 = create(SymKey.BBB);

console.log(isKind(a, QNode.Aaa), '*** true');
console.log(isKind(a, QNode.Bbb), '*** false');
console.log(isKind(b, QNode.Aaa), '*** false');
console.log(isKind(b, QNode.Bbb), '*** true');

interface typeMap {
  string: string;
  number: number;
  boolean: boolean;
}

type KeysOfUnion<T> = T extends any ? keyof T : never;

type POC = { new (...args: any[]): any } | keyof typeMap;

type GuardedType<T extends POC> = T extends { new (...args: any[]): infer U } ? U : T extends keyof typeMap ? typeMap[T] : never;

function typeGuard<T extends POC>(o, className: T): o is GuardedType<T> {
  const poc: POC = className;
  if (typeof poc === 'string') {
    return typeof o === poc;
  }
  return o instanceof poc;
}

class A {
  a: string = 'a';
}

class B extends A {
  b: number = 5;
}

console.log(typeGuard(5, 'number'), 'true'); // typeGuard<"number">(o: any, className: "number"): o is number
console.log(typeGuard(5, 'string'), 'false'); // typeGuard<"string">(o: any, className: "string"): o is string

console.log(typeGuard(new A(), A), 'true'); // typeGuard<typeof A>(o: any, className: typeof A): o is A
console.log(typeGuard(new B(), A), 'true');

console.log(typeGuard(new A(), B), 'false'); // typeGuard<typeof B>(o: any, className: typeof B): o is B
console.log(typeGuard(new B(), B), 'true');
*/
