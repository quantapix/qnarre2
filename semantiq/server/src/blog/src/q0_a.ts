export function addMixins(t: any, ss: any[]) {
  ss.forEach((s: any) => {
    const p = s.prototype || s.__proto__;
    Object.getOwnPropertyNames(p).forEach((n) => {
      if (n == 'constructor') return;
      //console.log(`adding ${s.name}.${n}`);
      Object.defineProperty(t.prototype || t.__proto__, n, Object.getOwnPropertyDescriptor(p, n)!);
    });
  });
}
export class Data {
  readonly d1 = 123;
  d2?: number;
}
export interface Frame {
  get: Fget;
  is: Fis;
}
export class Fget {
  empty() {
    return {};
  }
}
export class Fis {
  string(x: unknown): x is string {
    return typeof x === 'string';
  }
}
export function newFrame() {
  return { get: new Fget(), is: new Fis() } as Frame;
}
export const qf: Frame = newFrame();
