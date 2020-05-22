import path from 'path';
import os from 'os';

export interface Dict<T> {
  [_: string]: T;
}

export const empty = Object.freeze([]);

export function deepEquals<T>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>,
  cmp: (a: T, b: T) => boolean = (a, b) => a === b
) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((x, i) => cmp(x, b[i]));
}

export function flatten<T>(a: ReadonlyArray<T>[]): T[] {
  return Array.prototype.concat.apply([], a);
}

export function coalesce<T>(a: ReadonlyArray<T | undefined>): T[] {
  return a.filter((e) => !!e);
}

export function equals(a: any, b: any) {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return deepEquals(a, b, equals);
  const aks: string[] = [];
  for (const k in a) {
    aks.push(k);
  }
  aks.sort();
  const bks: string[] = [];
  for (const k in b) {
    bks.push(k);
  }
  bks.sort();
  if (!deepEquals(aks, bks)) return false;
  return aks.every((k) => equals(a[k], b[k]));
}

export function memoize(_target: any, key: string, desc: any) {
  let fk: string | undefined;
  let f: Function | undefined;
  if (typeof desc.value === 'function') {
    fk = 'value';
    f = desc.value;
  } else if (typeof desc.get === 'function') {
    fk = 'get';
    f = desc.get;
  } else throw new Error('not supported');
  const k = `$memoize$${key}`;
  desc[fk] = function (...args: any[]) {
    if (!this.hasOwnProperty(k)) {
      Object.defineProperty(this, k, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: f!.apply(this, args),
      });
    }
    return this[k];
  };
}

export function escapeRegExp(t: string) {
  return t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function makeRandomHexString(length: number) {
  let r = '';
  // prettier-ignore
  const cs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
  for (let i = 0; i < length; i++) {
    r += cs[Math.floor(cs.length * Math.random())];
  }
  return r;
}

export function getTempFile(n: string) {
  return path.join(os.tmpdir(), n);
}
