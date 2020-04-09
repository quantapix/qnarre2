/* eslint-disable no-case-declarations */
import * as qc from './compat';
import * as qh from './hierarchy';
import * as qp from './params';
import * as qs from './slim';
import * as qt from './types';
import * as qu from './utils';

import * as proto from './proto';

export function loadText(path: string) {
  return new Promise<ArrayBuffer>((res, rej) => {
    fetch(path).then(r => {
      if (r.ok) {
        r.arrayBuffer().then(res, rej);
      } else {
        r.text().then(rej, rej);
      }
    });
  });
}

export async function loadMeta(t: qt.Tracker, path: string) {
  const buf = await qu.Task.run(t, 'Reading meta', 40, () => loadText(path));
  return qu.Task.runPromise(t, 'Parsing metadata', 60, () => {
    return buf ? parseStats(buf) : Promise.resolve(undefined);
  });
}

export async function loadGraph(t: qt.Tracker, path?: string, b?: Blob) {
  const buf = await qu.Task.runPromise(t, 'Reading proto', 40, () => {
    if (b) {
      return new Promise<ArrayBuffer>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as ArrayBuffer) ?? undefined);
        r.onerror = () => rej(r.error);
        r.readAsArrayBuffer(b);
      });
    } else {
      return loadText(path!);
    }
  });
  return qu.Task.runPromise(t, 'Parsing proto', 60, () => parseGraph(buf));
}

export async function loadHier(
  t: qu.Tracker,
  path?: string,
  b?: Blob,
  p: qc.Compat = new qc.TpuCompat(),
  ps = qp.HierPs
) {
  const dt = t.subTracker('Data', 30);
  const gt = t.subTracker('Graph', 20);
  const ht = t.subTracker('Hierarchy', 50);
  return await loadGraph(dt, path, b)
    .then(
      p => {
        if (!p.node) throw new Error('Empty graph');
        return qs.build(p, qp.BuildPs, gt);
      },
      () => {
        throw new Error('Invalid GraphDef');
      }
    )
    .then(async s => {
      qc.check(s, p);
      const h = await qh.build(s, ps, ht);
      return {slim: s, hier: h};
    })
    .catch(e => {
      const m = `Build failed.\n\n${e}`;
      t.report(m, e);
      throw e;
    });
}

export function parseGraph(b: ArrayBuffer) {
  return parse(b, GRAPH_FIELDS) as Promise<proto.GraphDef>;
}

export async function parseStats(b: ArrayBuffer) {
  return (await parse(b, META_FIELDS)).step_stats;
}

async function parse(b: ArrayBuffer, fields: qt.Dict<boolean>) {
  const out = {} as qt.Dict<any>;
  const path = [] as string[];
  const stack = [] as qt.Dict<any>[];
  function add(d: qt.Dict<any>, n: string, v: any, ps: string[]) {
    const e = d[n];
    if (e === undefined) d[n] = ps.join('.') in fields ? [v] : v;
    else if (Array.isArray(e)) e.push(v);
    else d[n] = [e, v];
  }
  let current = out;
  await streamParse(b, (line: string) => {
    if (!line) return;
    line = line.trim();
    switch (line[line.length - 1]) {
      case '{':
        const n = line.substring(0, line.length - 2).trim();
        const v = {} as qt.Dict<any>;
        stack.push(current);
        path.push(n);
        add(current, n, v, path);
        current = v;
        break;
      case '}':
        current = stack.pop()!;
        path.pop();
        break;
      default:
        const p = split(line);
        add(current, p.name, p.value, path.concat(p.name));
        break;
    }
  });
  return out;
}

function streamParse(
  b: ArrayBuffer,
  cb: Function,
  size = 1000000,
  delim = '\n'
) {
  return new Promise<boolean>((res, rej) => {
    function chunk(old: string, d: string, off: number) {
      const done = off >= b.byteLength;
      const ps = d.split(delim);
      ps[0] = old + ps[0];
      const rest = done ? '' : ps.pop()!;
      for (const p of ps) {
        try {
          cb(p);
        } catch (e) {
          rej(e);
          return;
        }
      }
      if (done) {
        res(true);
        return;
      }
      const next = new Blob([b.slice(off, off + size)]);
      const r = new FileReader();
      r.onload = e => chunk(rest, e.target?.result as string, off + size);
      r.readAsText(next);
    }
    chunk('', '', 0);
  });
}

function split(s: string) {
  const i = s.indexOf(':');
  const name = s.substring(0, i).trim();
  const value = parseValue(s.substring(i + 2).trim());
  return {name, value};
}

function parseValue(v: string) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  const first = v[0];
  if (first === '"') {
    return v.substring(1, v.length - 1);
  }
  const n = parseFloat(v);
  return isNaN(n) ? v : n;
}

const GRAPH_FIELDS = {
  'library.function.node_def.attr.value.list.b': true,
  'library.function.node_def.attr.value.list.f': true,
  'library.function.node_def.attr.value.list.func': true,
  'library.function.node_def.attr.value.list.i': true,
  'library.function.node_def.attr.value.list.s': true,
  'library.function.node_def.attr.value.list.shape.dim': true,
  'library.function.node_def.attr.value.list.shape': true,
  'library.function.node_def.attr.value.list.tensor': true,
  'library.function.node_def.attr.value.list.type': true,
  'library.function.node_def.attr.value.shape.dim': true,
  'library.function.node_def.attr.value.tensor.string_val': true,
  'library.function.node_def.attr.value.tensor.tensor_shape.dim': true,
  'library.function.node_def.attr': true,
  'library.function.node_def.input': true,
  'library.function.node_def': true,
  'library.function.signature.input_arg': true,
  'library.function.signature.output_arg': true,
  'library.function': true,
  'library.versions': true,
  'node.attr.value.list.b': true,
  'node.attr.value.list.f': true,
  'node.attr.value.list.func': true,
  'node.attr.value.list.i': true,
  'node.attr.value.list.s': true,
  'node.attr.value.list.shape.dim': true,
  'node.attr.value.list.shape': true,
  'node.attr.value.list.tensor': true,
  'node.attr.value.list.type': true,
  'node.attr.value.shape.dim': true,
  'node.attr.value.tensor.string_val': true,
  'node.attr.value.tensor.tensor_shape.dim': true,
  'node.attr': true,
  'node.input': true,
  node: true
} as qt.Dict<boolean>;

const META_FIELDS = {
  'step_stats.dev_stats.node_stats.memory': true,
  'step_stats.dev_stats.node_stats.output.tensor_description.shape.dim': true,
  'step_stats.dev_stats.node_stats.output': true,
  'step_stats.dev_stats.node_stats': true,
  'step_stats.dev_stats': true
} as qt.Dict<boolean>;
