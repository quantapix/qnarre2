import * as qt from './types';
import * as qu from './util';
import * as qg from './graph';
import * as qs from './scene';
import * as qp from './params';
import * as loader from './loader';

describe('graph', () => {
  it('simple graph contruction', async () => {
    const pbtxt = qu.stringToBuffer(`
      node {
        name: "Q"
        op: "Input"
      }
      node {
        name: "W"
        op: "Input"
      }
      node {
        name: "X"
        op: "MatMul"
        input: "Q:2"
        input: "W"
      }`);
    const statsPbtxt = qu.stringToBuffer(`step_stats {
      dev_stats {
        device: "cpu"
        node_stats {
          node_name: "Q"
          all_start_micros: 10
          all_end_rel_micros: 4
        }
        node_stats {
          node_name: "Q"
          all_start_micros: 12
          all_end_rel_micros: 4
        }
      }
    }`);
    const buildParams: qt.BuildParams = {
      enableEmbed: true,
      inEmbedTypes: ['Const'],
      outEmbedTypes: ['^[a-zA-Z]+Summary$'],
      refEdges: {}
    };
    const dummyTracker = qu.getTracker({
      set: () => {
        return;
      },
      progress: 0
    });
    const nodes = await loader.parseGraph(pbtxt);
    const g: qt.SlimGraph = await qg.build(nodes, buildParams, dummyTracker);
    assert.isTrue(g.nodes['X'] != null);
    assert.isTrue(g.nodes['W'] != null);
    assert.isTrue(g.nodes['Q'] != null);
    const firstInputOfX = g.nodes['X'].ins[0];
    assert.equal(firstInputOfX.name, 'Q');
    assert.equal(firstInputOfX.outKey, '2');
    const secondInputOfX = g.nodes['X'].ins[1];
    assert.equal(secondInputOfX.name, 'W');
    assert.equal(secondInputOfX.outKey, '0');
    const stats = await loader.parseStats(statsPbtxt);
    qg.mergeStats(g, stats);
    assert.equal(g.nodes['Q'].stats.getMicros(), 6);
  });

  it('health pill numbers round correctly', () => {
    assert.equal(qs.renderHealthStat(42.0, true), '42');
    assert.equal(qs.renderHealthStat(1, false), '1.0');
    assert.equal(qs.renderHealthStat(42.42, false), '42.4');
    assert.equal(qs.renderHealthStat(-42.42, false), '-42.4');
    assert.equal(qs.renderHealthStat(0, false), '0.0e+0');
    assert.equal(qs.renderHealthStat(0.42, false), '4.2e-1');
    assert.equal(qs.renderHealthStat(-0.042, false), '-4.2e-2');
  });
});
