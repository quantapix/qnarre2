import * as qb from '../base';
import * as qt from '../type';
export function newIs(f: qt.Frame) {
  interface Frame extends qt.Frame {
    get: Fget;
  }
  const qf: Frame = f as Frame;
  interface _Fis extends qb.Fis {}
  class _Fis {}
  qb.addMixins(_Fis, [new qb.Fis()]);
  return (qf.is = new (class extends _Fis {})());
}
export interface Fis extends ReturnType<typeof newIs> {}
export function newGet(f: qt.Frame) {
  interface Frame extends qt.Frame {
    is: Fis;
  }
  const qf: Frame = f as Frame;
  interface _Fget extends qb.Fget {}
  class _Fget {}
  qb.addMixins(_Fget, [new qb.Fget()]);
  return (qf.get = new (class extends _Fget {})());
}
export interface Fget extends ReturnType<typeof newGet> {}
export function newMake(f: qt.Frame) {
  interface Frame extends qt.Frame {
    is: Fis;
    get: Fget;
  }
  const qf: Frame = f as Frame;
  return (qf.make = new (class {})());
}
export interface Fmake extends ReturnType<typeof newMake> {}
export interface Frame extends qt.Frame {
  get: Fget;
  is: Fis;
  make: Fmake;
}
export function newFrame() {
  const f = {} as Frame;
  newIs(f);
  newGet(f);
  newMake(f);
  return f;
}
export const qf: Frame = newFrame();
