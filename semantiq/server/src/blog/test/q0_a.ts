import { addMixins } from '../src/q0_a';
class S1 {
  s1 = 0;
  add(x: number, y: number) {
    return x + y;
  }
  dec(x: number) {
    return x - this.s1;
  }
}
class S2 {
  s2 = 0;
  mul(x: number, y: number) {
    return x * y;
  }
}
interface T extends S1, S2 {}
class T {
  s1 = 1;
}
beforeAll(() => {
  addMixins(T, [S1, new S2()]);
});
describe('base', () => {
  let t: T;
  beforeEach(() => {
    t = new T();
  });
  test('add', () => {
    expect(t.add(2, 2)).toBe(4);
  });
  test('dec', () => {
    expect(t.dec(2)).toBe(1);
  });
  test('mul', () => {
    expect(t.mul(2, 2)).toBe(4);
  });
});
