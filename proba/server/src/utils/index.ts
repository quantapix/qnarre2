import cp from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import proc from 'process';

export interface Dict<T> {
  [_: string]: T;
}

export const empty = Object.freeze([]);

export function deepEquals<T>(
  a: ReadonlyArray<T>,
  b: ReadonlyArray<T>,
  cmp: (a: T, b: T) => boolean = (a, b) => a === b
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((x, i) => cmp(x, b[i]));
}

export function flatten<T>(a: ReadonlyArray<T>[]): T[] {
  return Array.prototype.concat.apply([], a) as T[];
}

export function coalesce<T>(a: ReadonlyArray<T | undefined>): T[] {
  return a.filter((e) => !!e);
}

export function equals(a: any, b: any): boolean {
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

export function memoize(_target: any, key: string, desc: any): void {
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

export function escapeRegExp(t: string): string {
  return t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function randHexString(len: number) {
  let r = '';
  // prettier-ignore
  const cs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
  for (let i = 0; i < len; i++) {
    r += cs[Math.floor(cs.length * Math.random())];
  }
  return r;
}

const rootDir = (() => {
  let d: string | undefined;
  return () => {
    if (!d) {
      d = path.join(
        os.tmpdir(),
        `vscode-typescript${
          proc.platform !== 'win32' && proc.getuid ? proc.getuid() : ''
        }`
      );
    }
    if (!fs.existsSync(d)) fs.mkdirSync(d);
    return d;
  };
})();

export const instanceDir = (() => {
  let d: string | undefined;
  return () => {
    if (!d) d = path.join(rootDir(), randHexString(20));
    if (!fs.existsSync(d)) fs.mkdirSync(d);
    return d;
  };
})();

export function tempFile(pre: string): string {
  return path.join(instanceDir(), `${pre}-${randHexString(20)}.tmp`);
}

function patch(env: any, p: string) {
  const e = Object.assign({}, env);
  e['ELECTRON_RUN_AS_NODE'] = '1';
  e['NODE_PATH'] = path.join(p, '..', '..', '..');
  e['PATH'] = e['PATH'] || proc.env.PATH;
  return e;
}

export interface ForkOptions {
  readonly cwd?: string;
  readonly argv?: string[];
}

export function fork(
  modulePath: string,
  args: string[],
  o: ForkOptions
): cp.ChildProcess {
  const env = patch(proc.env, modulePath);
  return cp.fork(modulePath, args, { silent: true, cwd: o.cwd, env, execArgv: o.argv });
}
