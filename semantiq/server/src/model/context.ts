import * as qt from './groups';
export * from './groups';

export function create() {
  let ctx1 = 0;
  let ctx2 = 100;
  const aaa = class AAA extends qt.AAA {
    aa2() {
      return ctx1 + this.aa1();
    }
  };
  const bbb = new (class extends qt.BBB {
    xx2() {
      return ctx2 + super.xx2() + create.bias + create.extra();
    }
  })();
  return { aaa, bbb };
}
export namespace create {
  export const bias = 91;
  export function extra() {
    return 4;
  }
}
