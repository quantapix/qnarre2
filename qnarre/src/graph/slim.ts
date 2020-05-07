import * as _ from 'lodash';

import * as qg from './graph';
import * as qn from './ndata';
import * as qp from './params';
import * as qt from './types';
import * as qu from './utils';

import * as proto from './proto';

export class Slim {
  opers = {} as qt.Dict<qg.Noper>;
  links = [] as qg.Link[];

  constructor(public opts = {} as qg.Opts) {}

  addLink(s: string, d: qg.Noper, inp: qt.Input, ps: qt.BuildPs, i: number) {
    if (s !== d.name) {
      const ref = ps.refs[d.op + ' ' + i] === true;
      const l = new qg.Link([s, d.name], this.opts);
      l.data = {
        control: inp.control,
        ref,
        out: inp.out
      } as qg.Edata;
      this.links.push(l);
    }
  }

  mergeStats(stats: proto.StepStats, devs?: qt.Dict<boolean>) {
    _.each(this.opers, o => (o.stats = undefined));
    stats.dev_stats.forEach(ds => {
      if (devs && !devs[ds.device]) return;
      ds.node_stats.forEach(ns => {
        const o =
          ns.node_name in this.opers
            ? ns.node_name
            : qu.strictName(ns.node_name);
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
        this.opers[o].dev = ds.device;
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

export async function build(
  def: proto.GraphDef,
  ps: qt.BuildPs,
  t: qt.Tracker
): Promise<Slim> {
  const inEmbed = {} as qt.Dict<qg.Noper>;
  const outEmbed = {} as qt.Dict<qg.Noper>;
  const outs = {} as qt.Dict<qg.Noper[]>;
  const isIn = check(ps.inbedTs);
  const isOut = check(ps.outbedTs);
  const es = [] as string[];
  const raws = def.node;
  const ns = new Array<string>(raws.length);
  const run = qu.Task.runAsync;
  const opers = await run(t, 'Normalizing', 30, () => {
    const ops = new Array<qg.Noper>(raws.length);
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
        function inp(arg: proto.ArgDef) {
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
        args.forEach(inp);
      }
      const onames = {} as qt.Dict<any>;
      args = fn.signature.output_arg;
      if (args.length) {
        let idx = 0;
        // eslint-disable-next-line no-inner-declarations
        function outp(arg: proto.ArgDef) {
          onames[f + qp.SLASH + arg.name] = idx;
          idx++;
        }
        args.forEach(outp);
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
  return run(t, 'Building', 70, () => {
    const norms = qu.mapHier(ns, es);
    const g = new Slim();
    opers.forEach(o => {
      const nn = norms[o.name] || o.name;
      g.opers[nn] = o;
      if (o.name in outs) {
        o.embeds.out = outs[o.name];
        o.embeds.out.forEach(n2 => (n2.name = norms[n2.name!] || n2.name));
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

function check(types: string[]) {
  return (n: qg.Noper) => {
    for (let i = 0; i < types.length; i++) {
      const re = new RegExp(types[i]);
      if (typeof n.op === 'string' && n.op.match(re)) return true;
    }
    return false;
  };
}
