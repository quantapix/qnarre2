import * as util from './utils';
import * as graph from './graph';
import * as hierarchy from './hierarchy';
import * as loader from './loader';

describe('hierarchy', () => {
  beforeEach(function() {
    const pbtxt = util.stringToBuffer(`
      node {
        name: "Q"
        op: "VariableV2"
        attr {
          key: "_output_shapes"
          value {
            list {
              shape {
                dim {
                  size: 100
                }
                dim {
                  size: 200
                }
              }
            }
          }
        }
        attr {
          key: "container"
          value {
            s: ""
          }
        }
        attr {
          key: "dtype"
          value {
            type: DT_FLOAT
          }
        }
        attr {
          key: "shape"
          value {
            shape {
              dim {
                size: 100
              }
              dim {
                size: 200
              }
            }
          }
        }
      }
      node {
        name: "W"
        op: "VariableV2"
        attr {
          key: "_output_shapes"
          value {
            list {
              shape {
                dim {
                  size: 200
                }
                dim {
                  size: 100
                }
              }
            }
          }
        }
        attr {
          key: "container"
          value {
            s: ""
          }
        }
        attr {
          key: "dtype"
          value {
            type: DT_FLOAT
          }
        }
        attr {
          key: "shape"
          value {
            shape {
              dim {
                size: 200
              }
              dim {
                size: 100
              }
            }
          }
        }
      }
      node {
        name: "Y"
        op: "MatMul"
        input: "Q"
        input: "W"
      }`);
    const buildParams: graph.BuildParams = {
      enableEmbed: true,
      inEmbedTypes: ['Const'],
      outEmbedTypes: ['^[a-zA-Z]+Summary$'],
      refEdges: {}
    };
    this.dummyTracker = util.getTracker({
      set: () => {},
      progress: 0
    });
    this.options = {
      verifyTemplate: true,
      seriesMinSize: 5,
      seriesMap: {},
      rankdir: '',
      usePatterns: false
    };
    return loader
      .parseGraph(pbtxt)
      .then(nodes => graph.build(nodes, buildParams, this.dummyTracker))
      .then((graph: types.SlimGraph) => (this.slimGraph = graph));
  });

  it('builds hierarchy with metag', () => {
    return hierarchy
      .build(this.slimGraph, this.options, this.dummyTracker)
      .then(hierarchy => {
        if (!hierarchy) throw new Error('Expected hierarchy to be built');
        expect(hierarchy.hasShape).to.be.true;
        expect(hierarchy.maxEdgeSize).to.equal(20000);
        expect(hierarchy.root.metag.edge('Q', 'Y')).to.exist;
        expect(hierarchy.root.metag.edge('W', 'Y')).to.exist;
        // Not symmetric.
        expect(hierarchy.root.metag.edge('Y', 'Q')).to.not.exist;
        // Two variables are not connected directly.
        expect(hierarchy.root.metag.edge('Q', 'W')).to.not.exist;

        const edge = hierarchy.root.metag.edge('Q', 'Y');
        expect(edge.size).to.equal(20000);
        expect(edge.v).to.equal('Q');
        expect(edge.w).to.equal('Y');
      });
  });
});
