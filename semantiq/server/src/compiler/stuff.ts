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

interface QNode {
  kind: SymKey;
}
namespace QNode {
  export function create(kind: SymKey) {
    return { kind } as QNode;
  }
  export interface Aaa extends QNode {
    kind: SymKey.AAA;
    aa?: number;
  }
  export namespace Aaa {
    export const kind = SymKey.AAA;
  }
  export interface Bbb extends QNode {
    kind: SymKey.BBB;
    bb?: number;
  }
  export namespace Bbb {
    export const kind = SymKey.BBB;
  }
}
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
*/
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
