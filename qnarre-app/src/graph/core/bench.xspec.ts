#!/usr/bin/env node

import Benchmark, {formatNumber} from 'benchmark';
import seedrandom from 'seedrandom';
import {sprintf} from 'sprintf';
import {Graph} from './glib';
import {rank} from './rank';
import {dijkstra} from './algos';
import {layout} from '../elements/graph/layout';

const seed = process.env.SEED;
seedrandom(seed, {global: true});
if (seed) {
  console.log('SEED: %s (%d)', seed, Math.random());
}

const NODE_SIZES = [100];
const EDGE_DENSITY = 0.2;
const KEY_SIZE = 10;

function runBenchmark(name, fn) {
  const options: {[fn: string]: any} = {};
  options.onComplete = b => {
    const target = b.target,
      hz = target.hz,
      stats = target.stats,
      rme = stats.rme,
      samples = stats.sample.length,
      msg = sprintf(
        '    %25s: %13s ops/sec \xb1 %s%% (%3d run(s) sampled)',
        target.name,
        formatNumber(hz.toFixed(2)),
        rme.toFixed(2),
        samples
      );
    console.log(msg);
  };
  options.onError = b => {
    console.error('    ' + b.target.error);
  };
  options.setup = () => {
    this.count = Math.random() * 1000;
    this.nextInt = function(range) {
      return Math.floor(this.count++ % range);
    };
  };
  new Benchmark(name, fn, options).run();
}

function keys(count) {
  let ks = [],
    k;
  for (let i = 0; i < count; ++i) {
    k = '';
    for (let j = 0; j < KEY_SIZE; ++j) {
      k += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
    ks.push(k);
  }
  return ks;
}

function buildGraph(numNodes, edgeDensity) {
  const g = new Graph({}),
    numEdges = numNodes * numNodes * edgeDensity,
    ks = keys(numNodes);
  ks.forEach(k => {
    g.setNode(k);
  });
  for (let i = 0; i < numEdges; ++i) {
    let v, w;
    do {
      v = ks[Math.floor(Math.random() * ks.length)];
      w = ks[Math.floor(Math.random() * ks.length)];
    } while (g.hasEdge([v, w]));
    g.setEdge(v, w);
  }
  return g;
}

NODE_SIZES.forEach(size => {
  const g = buildGraph(size, EDGE_DENSITY);
  const nodes = g.nodes();
  const edges = g.edges();
  const nameSuffix = '(' + size + ',' + EDGE_DENSITY + ')';

  runBenchmark('nodes' + nameSuffix, () => {
    g.nodes();
  });

  runBenchmark('sources' + nameSuffix, () => {
    g.sources();
  });

  runBenchmark('sinks' + nameSuffix, () => {
    g.sinks();
  });

  runBenchmark('filterNodes all' + nameSuffix, () => {
    g.filterNodes(() => {
      return true;
    });
  });

  runBenchmark('filterNodes none' + nameSuffix, () => {
    g.filterNodes(() => {
      return false;
    });
  });

  runBenchmark('setNode' + nameSuffix, () => {
    g.setNode('key', 'label');
  });

  runBenchmark('node' + nameSuffix, () => {
    g.node(nodes[this.nextInt(nodes.length)]);
  });

  runBenchmark('set + removeNode' + nameSuffix, () => {
    g.setNode('key');
    g.delNode('key');
  });

  runBenchmark('predecessors' + nameSuffix, () => {
    g.preds(nodes[this.nextInt(nodes.length)]);
  });

  runBenchmark('successors' + nameSuffix, () => {
    g.succs(nodes[this.nextInt(nodes.length)]);
  });

  runBenchmark('neighbors' + nameSuffix, () => {
    g.neighbors(nodes[this.nextInt(nodes.length)]);
  });

  runBenchmark('edges' + nameSuffix, () => {
    g.edges();
  });

  runBenchmark('setPath' + nameSuffix, () => {
    g.setPath(['a', 'b', 'c', 'd', 'e']);
  });

  runBenchmark('setEdge' + nameSuffix, () => {
    g.setEdge(['from', 'to'], 'label');
  });

  runBenchmark('edge' + nameSuffix, () => {
    const edge = edges[this.nextInt(edges.length)];
    g.edge(edge);
  });

  runBenchmark('set + removeEdge' + nameSuffix, () => {
    g.setEdge(['from', 'to']);
    g.delEdge(['from', 'to']);
  });

  runBenchmark('inEdges' + nameSuffix, () => {
    g.inLinks(nodes[this.nextInt(nodes.length)]);
  });

  runBenchmark('outEdges' + nameSuffix, () => {
    g.outLinks(nodes[this.nextInt(nodes.length)]);
  });

  runBenchmark('nodeEdges' + nameSuffix, () => {
    g.nodeLinks(nodes[this.nextInt(nodes.length)]);
  });

  runBenchmark('components' + nameSuffix, () => {
    g.components();
  });

  runBenchmark('dijkstraAll' + nameSuffix, () => {
    dijkstra(g);
  });
});

const g = new Graph({})
  .setDefNode(() => {
    return {width: 1, height: 1}.toString();
  })
  .setDefEdge(() => {
    return {minlen: 1, weight: 1}.toString();
  })
  .setPath(['a', 'b', 'c', 'd', 'h'])
  .setPath(['a', 'e', 'g', 'h'])
  .setPath(['a', 'f', 'g']);

runBenchmark('longest-path ranker', () => {
  g.graph.ranker = 'longest-path';
  rank(g);
});

runBenchmark('tight-tree ranker', () => {
  g.graph.ranker = 'tight-tree';
  rank(g);
});

runBenchmark('network-simplex ranker', () => {
  g.graph.ranker = 'network-simplex';
  rank(g);
});

runBenchmark('layout', () => {
  delete g.graph.ranker;
  layout(g);
});
