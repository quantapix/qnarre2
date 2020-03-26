/* eslint-disable no-case-declarations */
import * as op from './oper';
import * as qg from './graph';
import * as qh from './hierarchy';
import * as qp from './params';
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

export async function loadMeta(path: string, t: qu.Tracker) {
  const buf = await t.runTask('Reading metadata', 40, () => {
    if (path) return loadText(path);
    return Promise.resolve(null);
  });
  return t.runPromiseTask('Parsing metadata', 60, () => {
    return buf ? parseStats(buf) : Promise.resolve(null);
  });
}

export async function loadGraph(path: string, blob: Blob, t: qu.Tracker) {
  const buf = await t.runPromiseTask('Reading graph pbtxt', 40, () => {
    if (blob) {
      return new Promise<ArrayBuffer>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(r.error);
        r.readAsArrayBuffer(blob);
      });
    } else {
      return loadText(path);
    }
  });
  return t.runPromiseTask('Parsing qg.pbtxt', 60, () => parseGraph(buf));
}

export function loadHierarchicalGraph(
  t: qu.Tracker,
  path?: string,
  blob?: Blob,
  p: op.CompatibilityProvider = new op.TpuCompatibility(),
  ps = qp.HierarchyParams
) {
  const dT = t.getSubtaskTracker('Data', 30);
  const gT = t.getSubtaskTracker('Graph', 20);
  const hT = t.getSubtaskTracker('Namespace hierarchy', 50);
  return loadGraph(path, blob, dT)
    .then(
      g => {
        if (!g.node) throw new Error('The graph is empty');
        return qg.build(g, qp.BuildParams, gT);
      },
      () => {
        throw new Error('Malformed GraphDef');
      }
    )
    .then(async graph => {
      op.checkOpsForCompatibility(graph, p);
      const hierarchy = await qh.build(graph, ps, hT);
      return {graph, hierarchy};
    })
    .catch(e => {
      const m = `Graph visualization failed.\n\n${e}`;
      t.reportError(m, e);
      throw e;
    });
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

export function streamParse(
  buf: ArrayBuffer,
  cb: Function,
  size = 1000000,
  delim = '\n'
) {
  return new Promise<boolean>((res, rej) => {
    function readChunk(old: string, data: string, offset: number) {
      const done = offset >= buf.byteLength;
      const ps = data.split(delim);
      ps[0] = old + ps[0];
      const rest = done ? '' : ps.pop();
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
      const next = new Blob([buf.slice(offset, offset + size)]);
      const r = new FileReader();
      r.onload = e => readChunk(rest, e.target.result as string, offset + size);
      r.readAsText(next);
    }
    readChunk('', '', 0);
  });
}

export function parseGraph(buf: ArrayBuffer) {
  return parse(buf, GRAPH_FIELDS) as Promise<proto.GraphDef>;
}

export async function parseStats(buf: ArrayBuffer): Promise<proto.StepStats> {
  return await parse(buf, METADATA_FIELDS)['step_stats'];
}

async function parse(buf: ArrayBuffer, fields: {[k: string]: boolean}) {
  const out = {} as {[k: string]: any};
  const path = [] as string[];
  const stack = [];
  let current = out;
  function add(obj: {[k: string]: any}, n: string, v: any, path: string[]) {
    const val = obj[n];
    if (val == undefined) {
      obj[n] = path.join('.') in fields ? [v] : v;
    } else if (Array.isArray(val)) {
      val.push(v);
    } else {
      obj[n] = [val, v];
    }
  }
  function split(s: string) {
    const i = s.indexOf(':');
    const name = s.substring(0, i).trim();
    const value = parseValue(s.substring(i + 2).trim());
    return {name, value};
  }
  await streamParse(buf, (line: string) => {
    if (!line) return;
    line = line.trim();
    switch (line[line.length - 1]) {
      case '{':
        const n = line.substring(0, line.length - 2).trim();
        const v: {
          [name_1: string]: any;
        } = {};
        stack.push(current);
        path.push(n);
        add(current, n, v, path);
        current = v;
        break;
      case '}':
        current = stack.pop();
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

const GRAPH_FIELDS: {[k: string]: boolean} = {
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
};

const METADATA_FIELDS: {[k: string]: boolean} = {
  'step_stats.dev_stats.node_stats.memory': true,
  'step_stats.dev_stats.node_stats.output.tensor_description.shape.dim': true,
  'step_stats.dev_stats.node_stats.output': true,
  'step_stats.dev_stats.node_stats': true,
  'step_stats.dev_stats': true
};
