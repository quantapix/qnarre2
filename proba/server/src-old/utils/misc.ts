export const enum Comparison {
  LessThan = -1,
  EqualTo = 0,
  GreaterThan = 1,
}

export type AnyFunction = (...args: never[]) => void;

export function returnFalse(): false {
  return false;
}

export function returnTrue(): true {
  return true;
}

export function returnUndefined() {
  return undefined;
}

export function identity<T>(x: T) {
  return x;
}

export function toLowerCase(x: string) {
  return x.toLowerCase();
}

export function equateValues<T>(a: T, b: T) {
  return a === b;
}

export type GetCanonicalFileName = (n: string) => string;

export function compareComparableValues(
  a: string | undefined,
  b: string | undefined
): Comparison;
export function compareComparableValues(
  a: number | undefined,
  b: number | undefined
): Comparison;
export function compareComparableValues(
  a: string | number | undefined,
  b: string | number | undefined
) {
  return a === b
    ? Comparison.EqualTo
    : a === undefined
    ? Comparison.LessThan
    : b === undefined
    ? Comparison.GreaterThan
    : a < b
    ? Comparison.LessThan
    : Comparison.GreaterThan;
}

export function compareValues(a: number | undefined, b: number | undefined): Comparison {
  return compareComparableValues(a, b);
}

export function isArray(x: any): x is readonly {}[] {
  return Array.isArray ? Array.isArray(x) : x instanceof Array;
}

export function isString(x: unknown): x is string {
  return typeof x === 'string';
}

export function isNumber(x: unknown): x is number {
  return typeof x === 'number';
}

const hasOwnProperty = Object.prototype.hasOwnProperty;

export interface MapLike<T> {
  [index: string]: T;
}

export function hasProperty(map: MapLike<any>, key: string) {
  return hasOwnProperty.call(map, key);
}

export function toBoolean(t: string) {
  const n = t?.trim().toUpperCase();
  return n === 'TRUE';
}

export function isDebugMode() {
  const argv = process.execArgv.join();
  return argv.includes('inspect') || argv.includes('debug');
}

export interface QConsole {
  log: (m: string) => void;
  error: (m: string) => void;
}

export class NullConsole implements QConsole {
  logs = 0;
  errs = 0;
  log(_: string) {
    this.logs++;
  }
  error(_: string) {
    this.errs++;
  }
}

export class StdConsole implements QConsole {
  log(m: string) {
    console.log(m);
  }
  error(m: string) {
    console.error(m);
  }
}

export class Duration {
  private _start: number;
  constructor() {
    this._start = Date.now();
  }
  inMillis() {
    return Date.now() - this._start;
  }
  inSecs() {
    return this.inMillis() / 1000;
  }
}

export class Timing {
  time = 0;
  isTiming = false;

  timeCall(cb: () => void) {
    if (this.isTiming) cb();
    else {
      this.isTiming = true;
      const d = new Duration();
      cb();
      this.time += d.inMillis();
      this.isTiming = false;
    }
  }

  subtractTime(cb: () => void) {
    if (this.isTiming) {
      this.isTiming = false;
      const d = new Duration();
      cb();
      this.time -= d.inMillis();
      this.isTiming = true;
    } else cb();
  }

  inSecs() {
    const t = this.time / 1000;
    return (Math.round(t * 100) / 100).toString() + 'sec';
  }
}

export class Stats {
  duration = new Duration();
  find = new Timing();
  read = new Timing();
  tokenize = new Timing();
  parse = new Timing();
  resolve = new Timing();
  detect = new Timing();
  bind = new Timing();
  check = new Timing();

  summary(c: QConsole) {
    c.log(`Completed in ${this.duration.inSecs()}sec`);
  }

  details(c: QConsole) {
    c.log('');
    c.log('Timing stats');
    c.log('Find Sources:    ' + this.find.inSecs());
    c.log('Read Sources:    ' + this.read.inSecs());
    c.log('Tokenize:        ' + this.tokenize.inSecs());
    c.log('Parse:           ' + this.parse.inSecs());
    c.log('Resolve Imports: ' + this.resolve.inSecs());
    c.log('Bind:            ' + this.bind.inSecs());
    c.log('Check:           ' + this.check.inSecs());
    c.log('Detect Cycles:   ' + this.detect.inSecs());
  }
}

export const timings = new Stats();

export function assert(
  expression: boolean,
  message?: string,
  verboseDebugInfo?: string | (() => string),
  stackCrawlMark?: AnyFunction
): void {
  if (!expression) {
    if (verboseDebugInfo) {
      message +=
        '\r\nVerbose Debug Information: ' +
        (typeof verboseDebugInfo === 'string' ? verboseDebugInfo : verboseDebugInfo());
    }
    fail(
      message ? 'False expression: ' + message : 'False expression.',
      stackCrawlMark || assert
    );
  }
}

export function fail(message?: string, stackCrawlMark?: AnyFunction): never {
  const e = new Error(message ? `Debug Failure. ${message}` : 'Debug Failure.');
  if ((Error as any).captureStackTrace) {
    (Error as any).captureStackTrace(e, stackCrawlMark || fail);
  }
  throw e;
}

export function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value === undefined || value === null) {
    return fail(message);
  }
  return value;
}

export function assertEachDefined<T, A extends readonly T[]>(
  value: A,
  message?: string
): A {
  for (const v of value) {
    assertDefined(v, message);
  }
  return value;
}

export function assertNever(
  member: never,
  message = 'Illegal value:',
  stackCrawlMark?: AnyFunction
): never {
  const detail = JSON.stringify(member);
  return fail(`${message} ${detail}`, stackCrawlMark || assertNever);
}

export function getFunctionName(func: AnyFunction) {
  if (typeof func !== 'function') {
    return '';
  } else if (hasProperty(func, 'name')) {
    return (func as any).name;
  } else {
    const text = Function.prototype.toString.call(func);
    const match = /^function\s+([\w$]+)\s*\(/.exec(text);
    return match ? match[1] : '';
  }
}

export function formatEnum(value = 0, enumObject: any, isFlags?: boolean) {
  const members = getEnumMembers(enumObject);
  if (value === 0) {
    return members.length > 0 && members[0][0] === 0 ? members[0][1] : '0';
  }
  if (isFlags) {
    let result = '';
    let remainingFlags = value;
    for (const [enumValue, enumName] of members) {
      if (enumValue > value) {
        break;
      }
      if (enumValue !== 0 && enumValue & value) {
        result = `${result}${result ? '|' : ''}${enumName}`;
        remainingFlags &= ~enumValue;
      }
    }
    if (remainingFlags === 0) {
      return result;
    }
  } else {
    for (const [enumValue, enumName] of members) {
      if (enumValue === value) {
        return enumName;
      }
    }
  }
  return value.toString();
}

function getEnumMembers(enumObject: any) {
  const result: [number, string][] = [];
  for (const name of Object.keys(enumObject)) {
    const value = enumObject[name];
    if (typeof value === 'number') {
      result.push([value, name]);
    }
  }
  return stableSort<[number, string]>(result, (x, y) => compareValues(x[0], y[0]));
}
