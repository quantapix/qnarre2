import * as _ from 'lodash';

import * as qp from './params';
import * as qt from './types';

export * from './core/utils';

export function escapeQuerySelector(sel: string): string {
  return sel.replace(/([:.[\],/\\()])/g, '\\$1');
}

export function stringToBuffer(s: string) {
  const l = s.length;
  const buf = new ArrayBuffer(l);
  const v = new Uint8Array(buf);
  for (let i = 0, strLen = l; i < strLen; i++) {
    v[i] = s.charCodeAt(i);
  }
  return buf;
}

export function strictName(n: string) {
  const s = n.split(qp.SLASH);
  return n + qp.SLASH + '(' + s[s.length - 1] + ')';
}

export function cluster(ps: {key: string; value: any}[]) {
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].key === '_cluster') return ps[i].value['s'] as string;
  }
  return undefined;
}

export function inputs(ns: string[]) {
  const ins = [] as qt.Input[];
  ns.forEach(n => {
    const control = n.startsWith('^');
    if (control) n = n.substring(1);
    let name = n;
    let out = '0';
    let m = n.match(/(.*):(\w+:\d+)$/);
    if (m) {
      name = m[1];
      out = m[2];
    } else {
      m = n.match(/(.*):(\d+)$/);
      if (m) {
        name = m[1];
        out = m[2];
      }
    }
    if (ins.length === 0 || ins[ins.length - 1].name !== name) {
      ins.push({control, name, out});
    }
  });
  return ins;
}

export function shapes(ps: {key: string; value: any}[]) {
  for (let i = 0; i < ps.length; i++) {
    const {key, value} = ps[i];
    if (key === '_output_shapes') {
      const r = value.list.shape.map((s: any) => {
        if (s.unknown_rank) return undefined;
        if (s.dim == null || (s.dim.length === 1 && s.dim[0].size == null)) {
          return [];
        }
        return s.dim.map((d: {size: number}) => d.size);
      });
      ps.splice(i, 1);
      return r as qt.Shapes;
    }
  }
  return [] as qt.Shapes;
}

export function listName(
  pre: string,
  suf: string,
  p: string,
  s?: number,
  e?: number
) {
  let n = s !== undefined && e !== undefined ? '[' + s + '-' + e + ']' : '#';
  n = pre + n + suf;
  return (p ? p + '/' : '') + n;
}

export function mapHier(ns: string[], ens: string[]) {
  const m = {} as qt.Dict<string>;
  const es = {} as qt.Dict<boolean>;
  ns.sort();
  for (let i = 0; i < ns.length - 1; ++i) {
    const n0 = ns[i];
    hierPath(n0)
      .slice(0, -1)
      .forEach(p => (es[p] = true));
    for (let j = i + 1; j < ns.length; ++j) {
      const n1 = ns[j];
      if (_.startsWith(n1, n0)) {
        if (n1.length > n0.length && n1.charAt(n0.length) === qp.SLASH) {
          m[n0] = strictName(n0);
          break;
        }
      } else {
        break;
      }
    }
  }
  ens.forEach(e => {
    if (e in es) m[e] = strictName(e);
  });
  return m;
}

export function hierPath(n: string, ss?: qt.Dict<string>) {
  const ps = [] as string[];
  let i = n.indexOf(qp.SLASH);
  while (i >= 0) {
    ps.push(n.substring(0, i));
    i = n.indexOf(qp.SLASH, i + 1);
  }
  if (ss) {
    const p = ss[n];
    if (p) ps.push(p);
  }
  ps.push(name);
  return ps;
}

export function updateHistos(hs: {[k: string]: qt.Histo}, src: any) {
  _.keys(hs).forEach(k => {
    const n = src[k];
    if (n) {
      const h = hs[k];
      h[n] = (h[n] ?? 0) + 1;
    }
  });
}

export function updateCompat(
  hs: {comp: {compats: number; incompats: number}},
  src: any
) {
  const c = hs.comp;
  if (src.compatible) {
    c.compats += 1;
  } else {
    c.incompats += 1;
  }
}

export function shade(h: qt.Histo, cs: d3.ScaleOrdinal<string, string>) {
  if (_.keys(h).length > 0) {
    const c = _.sum(_.keys(h).map(k => h[k]));
    return _.keys(h).map(
      k =>
        ({
          color: cs(k),
          perc: h[k] / c
        } as qt.Shade)
    );
  }
  return [] as qt.Shade[];
}

export class Stats {
  bytes?: number;
  start?: number;
  end?: number;

  constructor(public size: number[][]) {}

  addBytes(b: number) {
    this.bytes = Math.max(this.bytes ?? 0, b);
  }
  addTime(s: number, e: number) {
    this.start = Math.min(this.start ?? Infinity, s);
    this.end = Math.max(this.end ?? 0, e);
  }
  combine(ss: Stats) {
    this.bytes = this.bytes ?? 0 + (ss.bytes ?? 0);
    if (ss.getMicros() !== undefined) this.addTime(ss.start!, ss.end!);
  }
  getMicros() {
    if (this.start !== undefined && this.end !== undefined) {
      return this.end - this.start;
    }
    return undefined;
  }
}

export function mapIndexToHue(id: number): number {
  const GOLDEN_RATIO = 1.61803398875;
  const MIN_HUE = 1;
  const MAX_HUE = 359;
  const COLOR_RANGE = MAX_HUE - MIN_HUE;
  return MIN_HUE + ((COLOR_RANGE * GOLDEN_RATIO * id) % COLOR_RANGE);
}

export function tracker(c: any) {
  return new Tracker({
    setMessage: msg => {
      c.set('progress', {value: c.progress.value, msg});
    },
    report: (msg, err) => {
      console.error(err.stack);
      c.set('progress', {
        value: c.progress.value,
        error: true,
        msg
      });
    },
    update: i => {
      c.set('progress', {
        value: c.progress.value + i,
        msg: c.progress.msg
      });
    }
  });
}

export class Tracker implements qt.Tracker {
  constructor(private proxy: qt.Tracker) {}
  setMessage(m: string) {
    this.proxy.setMessage(m);
  }
  report(m: string, err: Error) {
    this.proxy.report(m, err);
  }
  update(i: number) {
    this.proxy.update(i);
  }
  subTracker(msg: string, factor: number) {
    return {
      setMessage(m: string) {
        this.setMessage(msg + ': ' + m);
      },
      report(m: string, err: Error) {
        this.report(msg + ': ' + m, err);
      },
      update(i: number) {
        this.update((i * factor) / 100);
      }
    } as qt.Tracker;
  }
}

export function time<T>(m: string, f: () => T) {
  const start = Date.now();
  const r = f();
  console.log(m, ':', Date.now() - start, 'ms');
  return r;
}

export namespace Task {
  export function run<T>(t: qt.Tracker, m: string, i: number, f: () => T) {
    t.setMessage(m);
    try {
      const r = time(m, f);
      t.update(i);
      return r;
    } catch (e) {
      t.report('Failed ' + m, e);
      throw e;
    }
  }

  export function runAsync<T>(t: qt.Tracker, m: string, i: number, f: () => T) {
    return new Promise<T>((res, _rej) => {
      t.setMessage(m);
      setTimeout(() => {
        try {
          const r = time(m, f);
          t.update(i);
          res(r);
        } catch (e) {
          t.report('Failed ' + m, e);
        }
      }, qp.ASYNC_DELAY);
    });
  }

  export function runPromise<T>(
    t: qt.Tracker,
    m: string,
    i: number,
    f: () => Promise<T>
  ) {
    return new Promise<T>((res, rej) => {
      const err = (e: any) => {
        t.report('Failed ' + m, e);
        rej(e);
      };
      t.setMessage(m);
      setTimeout(() => {
        try {
          const start = Date.now();
          f()
            .then(r => {
              console.log(m, ':', Date.now() - start, 'ms');
              t.update(i);
              res(r);
            })
            .catch(err);
        } catch (e) {
          err(e);
        }
      }, qp.ASYNC_DELAY);
    });
  }
}

interface Unit {
  symbol: string;
  factor?: number;
}

type Units = ReadonlyArray<Unit>;

export const MEMORY_UNITS: Units = [
  {symbol: 'B'},
  {symbol: 'KB', factor: 1024},
  {symbol: 'MB', factor: 1024},
  {symbol: 'GB', factor: 1024},
  {symbol: 'TB', factor: 1024},
  {symbol: 'PB', factor: 1024}
];

export const TIME_UNITS: Units = [
  {symbol: 'µs'},
  {symbol: 'ms', factor: 1000},
  {symbol: 's', factor: 1000},
  {symbol: 'min', factor: 60},
  {symbol: 'hr', factor: 60},
  {symbol: 'days', factor: 24}
];

export function convertUnits(v: number, us: Units, idx = 0): string {
  if (idx + 1 < us.length && v >= (us[idx + 1].factor ?? Infinity)) {
    if (us[idx + 1].factor) {
      return convertUnits(v / us[idx + 1].factor!, us, idx + 1);
    }
  }
  return Number(v.toPrecision(3)) + ' ' + us[idx].symbol;
}

export function displayable(s: Stats) {
  return s && (s.bytes || s.getMicros() || s.size);
}

export function removePrefix(ss: string[]) {
  if (ss.length < 2) return ss;
  let index = 0;
  let largestIndex = 0;
  const minLength = _.min(_.map(ss, s => s.length)) ?? 0;
  while (true) {
    index++;
    const prefixes = _.map(ss, str => str.substring(0, index));
    const allTheSame = prefixes.every((prefix, i) => {
      return i === 0 ? true : prefix === prefixes[i - 1];
    });
    if (allTheSame) {
      if (index >= minLength) return ss;
      largestIndex = index;
    } else {
      break;
    }
  }
  return _.map(ss, str => str.substring(largestIndex));
}

export function convertTime(micros: number) {
  const diff = +new Date() - +new Date(micros / 1e3);
  if (diff < 30000) {
    return 'just now';
  } else if (diff < 60000) {
    return Math.floor(diff / 1000) + ' seconds ago';
  } else if (diff < 120000) {
    return 'a minute ago';
  } else if (diff < 3600000) {
    return Math.floor(diff / 60000) + ' minutes ago';
  } else if (Math.floor(diff / 3600000) == 1) {
    return 'an hour ago';
  } else if (diff < 86400000) {
    return Math.floor(diff / 3600000) + ' hours ago';
  } else if (diff < 172800000) {
    return 'yesterday';
  }
  return Math.floor(diff / 86400000) + ' days ago';
}

let _useHash = false;

export function setUseHash(should: boolean) {
  _useHash = should;
}

export function useHash() {
  return _useHash;
}

let _fakeHash = '';

export function setFakeHash(h: string) {
  _fakeHash = h;
}

export function getFakeHash() {
  return _fakeHash;
}

export function formatDate(date?: Date) {
  if (!date) return '';

  return date.toString().replace(/GMT-\d+ \(([^)]+)\)/, '$1');
}

export function pickTextColor(background?: string) {
  const rgb = convertHexToRgb(background);
  if (!rgb) return 'inherit';
  const brightness = Math.round(
    (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
  );
  return brightness > 125 ? 'inherit' : '#eee';
}

function convertHexToRgb(color?: string) {
  if (color) {
    const m = color.match(/^#([0-9a-f]{1,2})([0-9a-f]{1,2})([0-9a-f]{1,2})$/);
    if (m) {
      if (color.length == 4) {
        for (let i = 1; i <= 3; i++) {
          m[i] = m[i] + m[i];
        }
      }
      return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    }
  }
  return undefined;
}

export interface TagInfo {
  displayName: string;
  description: string;
}

export function aggregateTagInfo(
  runToTagInfo: {[run: string]: TagInfo},
  defaultDisplayName: string
): TagInfo {
  let unanimousDisplayName: string | null | undefined = undefined;
  const descriptionToRuns: {[description: string]: string[]} = {};
  Object.keys(runToTagInfo).forEach(run => {
    const info = runToTagInfo[run];
    if (unanimousDisplayName === undefined) {
      unanimousDisplayName = info.displayName;
    }
    if (unanimousDisplayName !== info.displayName) {
      unanimousDisplayName = null;
    }
    if (descriptionToRuns[info.description] === undefined) {
      descriptionToRuns[info.description] = [];
    }
    descriptionToRuns[info.description].push(run);
  });
  const displayName =
    unanimousDisplayName != null ? unanimousDisplayName : defaultDisplayName;
  const description = (() => {
    const descriptions = Object.keys(descriptionToRuns);
    if (descriptions.length === 0) {
      return '';
    } else if (descriptions.length === 1) {
      return descriptions[0];
    } else {
      const items = descriptions.map(description => {
        const runs = descriptionToRuns[description].map(run => {
          const safeRun = run
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;') // for symmetry :-)
            .replace(/&/g, '&amp;');
          return `<code>${safeRun}</code>`;
        });
        const joined =
          runs.length > 2
            ? runs.slice(0, runs.length - 1).join(', ') +
              ', and ' +
              runs[runs.length - 1]
            : runs.join(' and ');
        const runNoun = ngettext(runs.length, 'run', 'runs');
        return `<li><p>For ${runNoun} ${joined}:</p>${description}</li>`;
      });
      const prefix = '<p><strong>Multiple descriptions:</strong></p>';
      return `${prefix}<ul>${items.join('')}</ul>`;
    }
  })();
  return {displayName, description};
}

function ngettext(k: number, enSingular: string, enPlural: string): string {
  return k === 1 ? enSingular : enPlural;
}

export function includeButtonString(include?: boolean): string {
  if (!include) {
    return 'Add to main graph';
  } else {
    return 'Remove from main graph';
  }
}

export function groupButtonString(group?: boolean): string {
  if (!group) {
    return 'Group these nodes';
  } else {
    return 'Ungroup these nodes';
  }
}

export function toggleGroup(map: qt.Dict<boolean>, n: string) {
  if (!(n in map) || map[n] === true) {
    map[n] = false;
  } else {
    map[n] = true;
  }
}
