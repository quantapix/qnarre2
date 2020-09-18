export class Data {
  d1 = 123;
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
