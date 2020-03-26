import * as _ from 'lodash';

import * as qg from './graph';
import * as qn from './ndata';
import * as qp from './params';
import * as qt from './types';
import * as qu from './utils';

import * as proto from './proto';

export class SlimGraph {
  opers = {} as qt.Dict<qn.Noper>;
  links = [] as qg.Link<qg.Edata>[];

  constructor(public opts = {} as qt.Opts) {}

  addLink(s: string, d: qn.Noper, inp: qt.Input, ps: qt.BuildPs, i: number) {
    if (s !== d.name) {
      const isRef = ps.refs[d.op + ' ' + i] === true;
      const l = new qg.Link<qg.Edata>([s, d.name], this.opts);
      l.data = {
        isControl: inp.control,
        isRef,
        out: inp.out
      } as qg.Edata;
      this.links.push(l);
    }
  }

  mergeStats(stats: proto.StepStats, devices?: qt.Dict<boolean>) {
    _.each(this.opers, o => (o.stats = undefined));
    stats.dev_stats.forEach(ds => {
      if (devices && !devices[ds.device]) return;
      ds.node_stats.forEach(ns => {
        const o =
          ns.node_name in this.opers ? ns.node_name : strictName(ns.node_name);
        if (!(o in this.opers)) return;
        let b = 0;
        if (ns.memory) {
          _.each(ns.memory, m => {
            if (m.total_bytes) {
              if (m.total_bytes > 0) {
                b += Number(m.total_bytes);
              } else {
                console.log('ignoring negative memory for ' + o);
              }
            }
          });
        }
        let s = [] as number[][];
        if (ns.output) {
          s = ns.output.map(o =>
            o.tensor_description.shape.dim.map(d => d.size)
          );
        }
        this.opers[o].device = ds.device;
        if (!this.opers[o].stats) {
          this.opers[o].stats = new qu.Stats(s);
        }
        this.opers[o].stats?.addBytes(b);
        if (ns.all_end_rel_micros) {
          if (ns.all_end_rel_micros > 0) {
            this.opers[o].stats?.addTime(
              ns.all_start_micros,
              ns.all_start_micros + ns.all_end_rel_micros
            );
          } else {
            console.log('ignoring negative runtime for ' + o);
          }
        }
      });
    });
  }
}

function strictName(n: string) {
  const s = n.split(qp.SLASH);
  return n + qp.SLASH + '(' + s[s.length - 1] + ')';
}

export async function build(
  def: proto.GraphDef,
  ps: qt.BuildPs,
  t: qu.Tracker
): Promise<SlimGraph> {
  const inEmbed = {} as qt.Dict<qn.Noper>;
  const outEmbed = {} as qt.Dict<qn.Noper>;
  const outs = {} as qt.Dict<qn.Noper[]>;
  const isIn = embedPred(ps.inbedTs);
  const isOut = embedPred(ps.outbedTs);
  const es = [] as string[];
  const raws = def.node;
  const ns = new Array<string>(raws.length);
  const opers = await t.runAsyncTask('Normalizing names', 30, () => {
    const ops = new Array<qn.Noper>(raws.length);
    let i = 0;
    function raw(p: proto.NodeDef) {
      const o = new qn.Noper(p);
      if (isIn(o)) {
        es.push(o.name);
        inEmbed[o.name] = o;
        return o;
      }
      if (isOut(o)) {
        es.push(o.name);
        outEmbed[o.name] = o;
        o.ins.forEach(inp => {
          const n = inp.name;
          outs[n] = outs[n] || [];
          outs[n].push(o);
        });
        return o;
      }
      ops[i] = o;
      ns[i] = o.name;
      i++;
      return o;
    }
    raws.forEach(raw);
    function process(fn: proto.FunctionDef) {
      const f = qp.LIB_PRE + fn.signature.name;
      raw({name: f, input: [], device: '', op: '', attr: []});
      let args = fn.signature.input_arg;
      if (args.length) {
        let idx = 0;
        // eslint-disable-next-line no-inner-declarations
        function input(arg: proto.ArgDef) {
          const o = raw({
            name: f + qp.SLASH + arg.name,
            input: [],
            device: '',
            op: 'input_arg',
            attr: [{key: 'T', value: {type: arg.type}}]
          });
          o.index.in = idx;
          idx++;
        }
        args.forEach(input);
      }
      const onames = {} as qt.Dict<any>;
      args = fn.signature.output_arg;
      if (args.length) {
        let idx = 0;
        // eslint-disable-next-line no-inner-declarations
        function output(arg: proto.ArgDef) {
          onames[f + qp.SLASH + arg.name] = idx;
          idx++;
        }
        args.forEach(output);
      }
      fn.node_def.forEach(r => {
        r.name = f + '/' + r.name;
        if (typeof r.input === 'string') r.input = [r.input];
        const o = raw(r);
        if (_.isNumber(onames[r.name])) o.index.out = onames[r.name];
        o.ins.forEach(n => {
          n.name = f + qp.SLASH + n.name;
        });
      });
    }
    def.library?.function?.forEach(process);
    ops.splice(i);
    ns.splice(i);
    return ops;
  });
  return t.runAsyncTask('Building data structure', 70, () => {
    const norms = mapHierarchy(ns, es);
    const g = new SlimGraph();
    opers.forEach(o => {
      const nn = norms[o.name] || o.name;
      g.opers[nn] = o;
      if (o.name in outs) {
        o.embeds.out = outs[o.name];
        o.embeds.out.forEach(n2 => (n2.name = norms[n2.name] || n2.name));
      }
      o.name = nn;
    });
    opers.forEach(o => {
      o.ins.forEach((inp, i) => {
        const nn = inp.name;
        if (nn in inEmbed) {
          const ie = inEmbed[nn];
          o.embeds.in.push(ie);
          for (const e of ie.ins) {
            g.addLink(norms[e.name] || e.name, o, e, ps, i);
          }
        } else if (nn in outEmbed) {
          const oe = outEmbed[nn];
          for (const e of oe.ins) {
            g.addLink(norms[e.name] || e.name, o, inp, ps, i);
          }
        } else {
          g.addLink(norms[nn] || nn, o, inp, ps, i);
        }
      });
    });
    _.each(inEmbed, n => (n.name = norms[n.name] || n.name));
    return g;
  });
}

function embedPred(types: string[]) {
  return (n: qn.Noper) => {
    for (let i = 0; i < types.length; i++) {
      const re = new RegExp(types[i]);
      if (typeof n.op === 'string' && n.op.match(re)) return true;
    }
    return false;
  };
}

function mapHierarchy(names: string[], enames: string[]) {
  const m = {} as qt.Dict<string>;
  const es = {} as qt.Dict<boolean>;
  names.sort();
  for (let i = 0; i < names.length - 1; ++i) {
    const n0 = names[i];
    hierarchyPath(n0)
      .slice(0, -1)
      .forEach(p => (es[p] = true));
    for (let j = i + 1; j < names.length; ++j) {
      const n1 = names[j];
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
  enames.forEach(e => {
    if (e in es) m[e] = strictName(e);
  });
  return m;
}

export function hierarchyPath(name: string, series?: qt.Dict<string>) {
  const p = [] as string[];
  let i = name.indexOf(qp.SLASH);
  while (i >= 0) {
    p.push(name.substring(0, i));
    i = name.indexOf(qp.SLASH, i + 1);
  }
  if (series) {
    const n = series[name];
    if (n) p.push(n);
  }
  p.push(name);
  return p;
}
