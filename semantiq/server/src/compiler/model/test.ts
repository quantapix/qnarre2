import * as qc from './context';

const a = new qc.AAA();
console.log(`should be true: ${a.is(qc.AAA)}, should be ${qc.AAA.kind}: ${a.kind}`);
console.log(`should be false: ${a.is(qc.BBB)}`);
a.base();
a.aa1();
a.nn1();
const b = new qc.BBB();
console.log(`should be true: ${b.is(qc.BBB)}, should be ${qc.BBB.kind}: ${b.kind}`);
console.log(`should be false: ${b.is(qc.AAA)}`);
b.base();
b.xx1();
console.log(`should be 0: ${b.xx2()}`);
b.nn1();
const c = new qc.CCC();
console.log(`should be true: ${c.is(qc.CCC)}, should be ${qc.CCC.kind}: ${c.kind}`);
console.log(`should be false: ${c.is(qc.AAA)}`);
console.log(`should be false: ${c.is(qc.BBB)}`);
c.base();
c.xx1();
console.log(`should be 0: ${c.xx2()}`);
c.yy1();
c.nn1();

console.log(`should be true: ${qc.Node.is.aaa(a)}`);
console.log(`should be true: ${qc.Node.is.aaaOrBbb(b)}`);
console.log(`should be true: ${qc.Node.is.aaaOrCcc(c)}`);

console.log(qc.Node.get.start(a), qc.Node.get.next(b));
console.log(qc.Node.get.a1AndB1(a, b));

const { aaa, bbb } = qc.create();
console.log(new aaa().aa2());
console.log(bbb.xx2());
