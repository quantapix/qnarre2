import * as qt from './classes';

export * from './classes';

export abstract class Node extends qt.Node {}
export namespace Node {
  export namespace is {
    export function aaa(n: qt.Node): n is qt.AAA {
      return n.kind === qt.Syntax.AAA;
    }
    export function aaaOrBbb(n: qt.Node) {
      return n.kind === qt.Syntax.AAA || n.kind === qt.Syntax.BBB;
    }
    export function aaaOrCcc(n: qt.Node) {
      return n.kind === qt.Syntax.AAA || n.kind === qt.Syntax.CCC;
    }
  }

  class HHH {
    h1 = 0;
    h2 = 0;
    bias() {
      return this.h1 + this.h2;
    }
  }

  export const get = new (class extends HHH {
    start(a: qt.AAA) {
      return (this.h1 = a.a1);
    }
    next(b: qt.BBB) {
      return (this.h2 = b.b1);
    }
    a1AndB1(a: qt.AAA, b: qt.BBB) {
      return a.a1 + b.b1 + this.bias();
    }
  })();
}
