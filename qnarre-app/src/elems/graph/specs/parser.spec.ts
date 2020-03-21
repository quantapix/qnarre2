import * as util from '../util';
import * as loader from '../loader';

describe('parser', () => {
  describe('parsing GraphDef pbtxt', () => {
    it('parses a simple pbtxt', () => {
      const pbtxt = util.stringToBuffer(`node {
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
        input: "Q"
        input: "W"
      }`);
      return loader.parseGraph(pbtxt).then(graph => {
        const nodes = graph.node;
        assert.isTrue(nodes != null && nodes.length === 3);

        assert.equal('Q', nodes[0].name);
        assert.equal('Input', nodes[0].op);

        assert.equal('W', nodes[1].name);
        assert.equal('Input', nodes[1].op);

        assert.equal('X', nodes[2].name);
        assert.equal('MatMul', nodes[2].op);
        assert.equal('Q', nodes[2].input[0]);
        assert.equal('W', nodes[2].input[1]);
      });
    });

    it('parses function def library', () => {
      const pbtxt = util.stringToBuffer(`library {
        function {
          signature {
            name: "foo"
            input_arg {
              name: "placeholder_1"
              type: DT_INT32
            }
            input_arg {
              name: "placeholder_2"
              type: DT_BOOL
            }
            output_arg {
              name: "identity"
              type: DT_BOOL
            }
          }
          node_def {
            name: "NoOp"
            op: "NoOp"
            attr {
              key: "_output_shapes"
              value {
                list {
                }
              }
            }
          }
          node_def {
            name: "Identity"
            op: "Identity"
            input: "placeholder_1"
            input: "^NoOp"
            attr {
              key: "T"
              value {
                type: DT_BOOL
              }
            }
            attr {
              key: "_output_shapes"
              value {
                list {
                  shape {
                  }
                }
              }
            }
          }
        }
      }`);
      return loader.parseGraph(pbtxt).then(graph => {
        expect(graph)
          .to.have.property('library')
          .that.has.property('function')
          .that.is.an('array')
          .and.that.has.length(1);

        const firstFunc = graph.library.function[0];

        expect(firstFunc)
          .to.have.property('signature')
          .that.has.property('name', 'foo');

        expect(firstFunc)
          .to.have.property('node_def')
          .that.is.an('array')
          .and.that.has.length(2);

        expect(firstFunc.node_def[0]).to.have.property('name', 'NoOp');
        expect(firstFunc.node_def[0]).to.not.have.property('input');
        expect(firstFunc.node_def[0])
          .to.have.property('attr')
          .that.deep.equal([{key: '_output_shapes', value: {list: {}}}]);

        expect(firstFunc.node_def[1]).to.have.property('name', 'Identity');
        expect(firstFunc.node_def[1])
          .to.have.property('input')
          .that.deep.equal(['placeholder_1', '^NoOp']);
        expect(firstFunc.node_def[1])
          .to.have.property('attr')
          .that.deep.equal([
            {key: 'T', value: {type: 'DT_BOOL'}},
            {key: '_output_shapes', value: {list: {shape: [{}]}}}
          ]);
      });
    });

    describe('malformed cases', () => {
      // Then it becomes unpredictable.
      it('parses upto an empty node', () => {
        const pbtxt = util.stringToBuffer(`node {
          name: "Q"
          op: "Input"
        }
        node {}`);
        return loader.parseGraph(pbtxt).then(graph => {
          const nodes = graph.node;
          assert.isArray(nodes);
          assert.lengthOf(nodes, 1);

          assert.equal('Q', nodes[0].name);
          assert.equal('Input', nodes[0].op);
        });
      });
      it('fails to parse a node when an empty node appears before', () => {
        const pbtxt = util.stringToBuffer(`node {}
        node {
          name: "Q"
          op: "Input"
        }`);
        return loader.parseGraph(pbtxt).then(
          () => assert.fail('Should NOT resolve'),
          () => {
            // Expected to fail and reject the promise.
          }
        );
      });
      it('parses pbtxt without newlines as errorneously empty', () => {
        const pbtxt = util.stringToBuffer(
          `node { name: "Q" op: "Input" } node { name: "A" op: "Input" }`
        );
        return loader.parseGraph(pbtxt).then(graph => {
          assert.notProperty(graph, 'node');
        });
      });
      it('parses malformed pbtxt upto the correct declaration', () => {
        const pbtxt = util.stringToBuffer(`node {
          name: "Q"
          op: "Input"
        }
        node { name: "W" op: "Input" }
        node { name: "X" op: "MatMul" input: "Q" input: "W" }`);
        return loader.parseGraph(pbtxt).then(graph => {
          const nodes = graph.node;
          assert.isArray(nodes);
          assert.lengthOf(nodes, 1);

          assert.equal('Q', nodes[0].name);
          assert.equal('Input', nodes[0].op);
        });
      });
      it('cannot parse when pbtxt is malformed', () => {
        const pbtxt = util.stringToBuffer(`node {
          name: "Q"
          op: "Input
        }
        node { name: "W" op: "Input"
        node { name: "X" op: "MatMul" input: "Q" input: "W" }
        node {
          name: A"
          op: "Input"
        }`);
        return loader.parseGraph(pbtxt).then(
          () => assert.fail('Should NOT resolve'),
          () => {
            // Expected to fail and reject the promise.
          }
        );
      });
    });
  });
  it('parses stats pbtxt', () => {
    const statsPbtxt = util.stringToBuffer(`step_stats {
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
    return loader.parseStats(statsPbtxt).then(stepStats => {
      assert.equal(stepStats.dev_stats.length, 1);
      assert.equal(stepStats.dev_stats[0].device, 'cpu');
      assert.equal(stepStats.dev_stats[0].node_stats.length, 2);
      assert.equal(stepStats.dev_stats[0].node_stats[0].all_start_micros, 10);
      assert.equal(stepStats.dev_stats[0].node_stats[1].node_name, 'Q');
      assert.equal(stepStats.dev_stats[0].node_stats[1].all_end_rel_micros, 4);
    });
  });
  it('d3 exists', () => {
    assert.isTrue(d3 != null);
  });
});
