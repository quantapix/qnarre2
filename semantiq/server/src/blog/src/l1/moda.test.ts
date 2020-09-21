import { A, B, C, Nodes } from './moda';
import * as qt from '../type';
beforeAll(() => {});
describe('moda', () => {
  let a: A;
  let b: B;
  beforeEach(() => {
    a = new A();
    b = new B();
  });
  test('A', () => {
    expect(a.n1).toBe(234);
    expect(a.a1).toBe(0);
    a.update(1).update(2);
    expect(a.a1).toBe(2);
  });
  test('B', () => {
    expect(b.n2).toBeUndefined;
    expect(b.b1).toBe(567);
    expect(b.b2).toBeUndefined;
    b.update(a);
    expect(b.b2).toBe(a);
  });
  test('C', () => {
    const c = new C();
    expect(c.c1).toBeUndefined;
    expect(c.c2).toBeUndefined;
    c.update([b]);
    expect(c.c2 == new Nodes<qt.B>(...[b])).toBeTruthy;
  });
});
