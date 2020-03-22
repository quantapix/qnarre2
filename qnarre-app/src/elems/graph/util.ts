import * as _ from 'lodash';
import * as qt from '../../graph/scene/types';

/* eslint-disable no-constant-condition */

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

export function time<T>(m: string, task: () => T) {
  const start = Date.now();
  const r = task();
  console.log(m, ':', Date.now() - start, 'ms');
  return r;
}

const ASYNC_TASK_DELAY = 20;

export function getTracker(c: any) {
  return new Tracker({
    setMessage: msg => {
      c.set('progress', {value: c.progress.value, msg});
    },
    reportError: (msg, err) => {
      console.error(err.stack);
      c.set('progress', {
        value: c.progress.value,
        error: true,
        msg
      });
    },
    updateProgress: inc => {
      c.set('progress', {
        value: c.progress.value + inc,
        msg: c.progress.msg
      });
    }
  });
}

export class Tracker implements qt.Tracker {
  constructor(private delegate: qt.Tracker) {}
  setMessage(m: string) {
    this.delegate.setMessage(m);
  }
  reportError(m: string, err: Error) {
    this.delegate.reportError(m, err);
  }
  updateProgress(inc: number) {
    this.delegate.updateProgress(inc);
  }
  getSubtaskTracker(msg: string, factor: number): qt.Tracker {
    return {
      setMessage(m: string) {
        this.setMessage(msg + ': ' + m);
      },
      reportError(m: string, err: Error) {
        this.reportError(msg + ': ' + m, err);
      },
      updateProgress(inc: number) {
        this.updateProgress((inc * factor) / 100);
      }
    };
  }
  runTask<T>(msg: string, inc: number, t: () => T) {
    this.setMessage(msg);
    try {
      const r = time(msg, t);
      this.updateProgress(inc);
      return r;
    } catch (e) {
      this.reportError('Failed ' + msg, e);
    }
    return undefined;
  }
  runAsyncTask<T>(msg: string, inc: number, t: () => T): Promise<T> {
    return new Promise((res, _rej) => {
      this.setMessage(msg);
      setTimeout(() => {
        try {
          const r = time(msg, t);
          this.updateProgress(inc);
          res(r);
        } catch (e) {
          this.reportError('Failed ' + msg, e);
        }
      }, ASYNC_TASK_DELAY);
    });
  }
  runPromiseTask<T>(msg: string, inc: number, t: () => Promise<T>): Promise<T> {
    return new Promise((res, rej) => {
      const err = (e: any) => {
        this.reportError('Failed ' + msg, e);
        rej(e);
      };
      this.setMessage(msg);
      setTimeout(() => {
        try {
          const start = Date.now();
          t()
            .then(r => {
              console.log(msg, ':', Date.now() - start, 'ms');
              this.updateProgress(inc);
              res(r);
            })
            .catch(err);
        } catch (e) {
          err(e);
        }
      }, ASYNC_TASK_DELAY);
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

export function isDisplayable(s: qt.NodeStats) {
  if (s && (s.bytes || s.getMicros() || s.size)) {
    return true;
  }
  return false;
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
