import * as q1 from '../src/q1';
import * as q2 from '../src/q2';
import { newFrame } from '../src/q2b/q2b_a';
beforeAll(() => {});
describe('modd', () => {
  const qf = newFrame(q2.newFrame(q1.newFrame({})));
  const a = new q1.A().update(1);
  const b = new q1.B().update(a);
  const c = new q1.C().update([b]);
  beforeEach(() => {});
  test('xxx', () => {
    expect(qf.x.xx.xxx.f(c)).toBeTruthy;
    expect(qf.x.xx.xxx.f(b)).toBeTruthy;
    expect(qf.x.xx.xxx.f(a)).toBeTruthy;
    expect(qf.x.xx.xxx.g(c)).toBeFalsy;
    expect(qf.x.xx.xxx.g(b)).toBeFalsy;
    expect(qf.x.xx.xxx.g(a)).toBeFalsy;
  });
  test('xx', () => {
    expect(qf.x.xx.f(c)).toBeFalsy;
    expect(qf.x.xx.f(b)).toBeTruthy;
    expect(qf.x.xx.f(a)).toBeTruthy;
    expect(qf.x.xx.g(c)).toBeTruthy;
    expect(qf.x.xx.g(b)).toBeFalsy;
    expect(qf.x.xx.g(a)).toBeFalsy;
  });
  test('x', () => {
    expect(qf.x.f(c)).toBeFalsy;
    expect(qf.x.f(b)).toBeFalsy;
    expect(qf.x.f(a)).toBeTruthy;
    expect(qf.x.f(c)).toBeTruthy;
    expect(qf.x.f(b)).toBeTruthy;
    expect(qf.x.f(a)).toBeFalsy;
  });
});
