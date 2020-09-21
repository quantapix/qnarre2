import { A, B, C, Nodes } from './moda';
import * as q1 from './modb';
import * as qt from '../type';
beforeAll(() => {});
describe('modb', () => {
  const qf = q1.newFrame({});
  const a = new A().update(1);
  const b = new B().update(a);
  const c = new C().update([b]);
  c.c1 = 10;
  beforeEach(() => {});
  test('qf', () => {
    expect(qf.flip).toBeUndefined;
    qf.flip = true;
    expect(qf.flip).toBeTruthy;
  });
  test('is', () => {
    expect(qf.is.kind(B)).toBeFalsy;
    expect(qf.is.kind(B, a)).toBeFalsy;
    expect(qf.is.kind(B, b)).toBeTruthy;
    expect(qf.is.a(qt.Kind.A)).toBeTruthy;
    expect(qf.is.b(a)).toBeFalsy;
    expect(qf.is.b(b)).toBeTruthy;
    expect(qf.is.c(c)).toBeTruthy;
  });
  test('get', () => {
    expect(qf.get.v()).toBeUndefined;
    expect(qf.get.v(a)).toBe(1);
    expect(qf.get.v(b)).toBe(567);
    expect(qf.get.v(c)).toBe(10);
    expect(qf.get.b2(a)).toBeUndefined;
    expect(qf.get.b2(b)).toBe(a);
    expect(qf.get.c2(a)).toBeUndefined;
    expect(qf.get.c2(c) == new Nodes<qt.B>(...[b])).toBeTruthy;
  });
  test('make', () => {
    expect(qf.is.kind(A, qf.make.n(qt.Kind.A))).toBeTruthy;
    expect(qf.is.kind(B, qf.make.n(qt.Kind.B))).toBeTruthy;
    expect(qf.is.kind(C, qf.make.n(qt.Kind.C))).toBeTruthy;
    expect(qf.is.c(qf.make.n(qt.Kind.C))).toBeTruthy;
  });
});
