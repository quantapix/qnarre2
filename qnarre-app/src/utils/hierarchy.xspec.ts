var tape = require('tape'),
  d3_hierarchy = require('..');

tape('stratify() has the expected defaults', function(test) {
  var s = d3_hierarchy.stratify();
  test.equal(s.id()({id: 'foo'}), 'foo');
  test.equal(s.parentId()({parentId: 'bar'}), 'bar');
  test.end();
});

tape('stratify(data) returns the root node', function(test) {
  var s = d3_hierarchy.stratify(),
    root = s([
      {id: 'a'},
      {id: 'aa', parentId: 'a'},
      {id: 'ab', parentId: 'a'},
      {id: 'aaa', parentId: 'aa'}
    ]);
  test.ok(root instanceof d3_hierarchy.hierarchy);
  test.deepEqual(noparent(root), {
    id: 'a',
    depth: 0,
    height: 2,
    data: {id: 'a'},
    children: [
      {
        id: 'aa',
        depth: 1,
        height: 1,
        data: {id: 'aa', parentId: 'a'},
        children: [
          {
            id: 'aaa',
            depth: 2,
            height: 0,
            data: {id: 'aaa', parentId: 'aa'}
          }
        ]
      },
      {
        id: 'ab',
        depth: 1,
        height: 0,
        data: {id: 'ab', parentId: 'a'}
      }
    ]
  });
  test.end();
});

tape(
  'stratify(data) does not require the data to be in topological order',
  function(test) {
    var s = d3_hierarchy.stratify(),
      root = s([
        {id: 'aaa', parentId: 'aa'},
        {id: 'aa', parentId: 'a'},
        {id: 'ab', parentId: 'a'},
        {id: 'a'}
      ]);
    test.deepEqual(noparent(root), {
      id: 'a',
      depth: 0,
      height: 2,
      data: {id: 'a'},
      children: [
        {
          id: 'aa',
          depth: 1,
          height: 1,
          data: {id: 'aa', parentId: 'a'},
          children: [
            {
              id: 'aaa',
              depth: 2,
              height: 0,
              data: {id: 'aaa', parentId: 'aa'}
            }
          ]
        },
        {
          id: 'ab',
          depth: 1,
          height: 0,
          data: {id: 'ab', parentId: 'a'}
        }
      ]
    });
    test.end();
  }
);

tape('stratify(data) preserves the input order of siblings', function(test) {
  var s = d3_hierarchy.stratify(),
    root = s([
      {id: 'aaa', parentId: 'aa'},
      {id: 'ab', parentId: 'a'},
      {id: 'aa', parentId: 'a'},
      {id: 'a'}
    ]);
  test.deepEqual(noparent(root), {
    id: 'a',
    depth: 0,
    height: 2,
    data: {id: 'a'},
    children: [
      {
        id: 'ab',
        depth: 1,
        height: 0,
        data: {id: 'ab', parentId: 'a'}
      },
      {
        id: 'aa',
        depth: 1,
        height: 1,
        data: {id: 'aa', parentId: 'a'},
        children: [
          {
            id: 'aaa',
            depth: 2,
            height: 0,
            data: {id: 'aaa', parentId: 'aa'}
          }
        ]
      }
    ]
  });
  test.end();
});

tape('stratify(data) treats an empty parentId as the root', function(test) {
  var s = d3_hierarchy.stratify(),
    root = s([
      {id: 'a', parentId: ''},
      {id: 'aa', parentId: 'a'},
      {id: 'ab', parentId: 'a'},
      {id: 'aaa', parentId: 'aa'}
    ]);
  test.deepEqual(noparent(root), {
    id: 'a',
    depth: 0,
    height: 2,
    data: {id: 'a', parentId: ''},
    children: [
      {
        id: 'aa',
        depth: 1,
        height: 1,
        data: {id: 'aa', parentId: 'a'},
        children: [
          {
            id: 'aaa',
            depth: 2,
            height: 0,
            data: {id: 'aaa', parentId: 'aa'}
          }
        ]
      },
      {
        id: 'ab',
        depth: 1,
        height: 0,
        data: {id: 'ab', parentId: 'a'}
      }
    ]
  });
  test.end();
});

tape(
  'stratify(data) does not treat a falsy but non-empty parentId as the root',
  function(test) {
    var s = d3_hierarchy.stratify(),
      root = s([
        {id: 0, parentId: null},
        {id: 1, parentId: 0},
        {id: 2, parentId: 0}
      ]);
    test.deepEqual(noparent(root), {
      id: '0',
      depth: 0,
      height: 1,
      data: {id: 0, parentId: null},
      children: [
        {
          id: '1',
          depth: 1,
          height: 0,
          data: {id: 1, parentId: 0}
        },
        {
          id: '2',
          depth: 1,
          height: 0,
          data: {id: 2, parentId: 0}
        }
      ]
    });
    test.end();
  }
);

tape(
  'stratify(data) throws an error if the data does not have a single root',
  function(test) {
    var s = d3_hierarchy.stratify();
    test.throws(function() {
      s([{id: 'a'}, {id: 'b'}]);
    }, /\bmultiple roots\b/);
    test.throws(function() {
      s([{id: 'a', parentId: 'a'}]);
    }, /\bno root\b/);
    test.throws(function() {
      s([
        {id: 'a', parentId: 'b'},
        {id: 'b', parentId: 'a'}
      ]);
    }, /\bno root\b/);
    test.end();
  }
);

tape('stratify(data) throws an error if the hierarchy is cyclical', function(
  test
) {
  var s = d3_hierarchy.stratify();
  test.throws(function() {
    s([{id: 'root'}, {id: 'a', parentId: 'a'}]);
  }, /\bcycle\b/);
  test.throws(function() {
    s([{id: 'root'}, {id: 'a', parentId: 'b'}, {id: 'b', parentId: 'a'}]);
  }, /\bcycle\b/);
  test.end();
});

tape(
  'stratify(data) throws an error if multiple parents have the same id',
  function(test) {
    var s = d3_hierarchy.stratify();
    test.throws(function() {
      s([
        {id: 'a'},
        {id: 'b', parentId: 'a'},
        {id: 'b', parentId: 'a'},
        {id: 'c', parentId: 'b'}
      ]);
    }, /\bambiguous\b/);
    test.end();
  }
);

tape(
  'stratify(data) throws an error if the specified parent is not found',
  function(test) {
    var s = d3_hierarchy.stratify();
    test.throws(function() {
      s([{id: 'a'}, {id: 'b', parentId: 'c'}]);
    }, /\bmissing\b/);
    test.end();
  }
);

tape('stratify(data) allows the id to be undefined for leaf nodes', function(
  test
) {
  var s = d3_hierarchy.stratify(),
    root = s([{id: 'a'}, {parentId: 'a'}, {parentId: 'a'}]);
  test.deepEqual(noparent(root), {
    id: 'a',
    depth: 0,
    height: 1,
    data: {id: 'a'},
    children: [
      {
        depth: 1,
        height: 0,
        data: {parentId: 'a'}
      },
      {
        depth: 1,
        height: 0,
        data: {parentId: 'a'}
      }
    ]
  });
  test.end();
});

tape('stratify(data) allows the id to be non-unique for leaf nodes', function(
  test
) {
  var s = d3_hierarchy.stratify(),
    root = s([
      {id: 'a', parentId: null},
      {id: 'b', parentId: 'a'},
      {id: 'b', parentId: 'a'}
    ]);
  test.deepEqual(noparent(root), {
    id: 'a',
    depth: 0,
    height: 1,
    data: {id: 'a', parentId: null},
    children: [
      {
        id: 'b',
        depth: 1,
        height: 0,
        data: {id: 'b', parentId: 'a'}
      },
      {
        id: 'b',
        depth: 1,
        height: 0,
        data: {id: 'b', parentId: 'a'}
      }
    ]
  });
  test.end();
});

tape(
  'stratify(data) coerces the id to a string, if not null and not empty',
  function(test) {
    var s = d3_hierarchy.stratify();
    test.strictEqual(
      s([
        {
          id: {
            toString: function() {
              return 'a';
            }
          }
        }
      ]).id,
      'a'
    );
    test.strictEqual(s([{id: ''}]).id, undefined);
    test.strictEqual(s([{id: null}]).id, undefined);
    test.strictEqual(s([{id: undefined}]).id, undefined);
    test.strictEqual(s([{}]).id, undefined);
    test.end();
  }
);

tape('stratify(data) allows the id to be undefined for leaf nodes', function(
  test
) {
  var s = d3_hierarchy.stratify(),
    o = {
      parentId: {
        toString: function() {
          return 'a';
        }
      }
    },
    root = s([{id: 'a'}, o]);
  test.deepEqual(noparent(root), {
    id: 'a',
    depth: 0,
    height: 1,
    data: {id: 'a'},
    children: [
      {
        depth: 1,
        height: 0,
        data: o
      }
    ]
  });
  test.end();
});

tape('stratify.id(id) observes the specified id function', function(test) {
  var foo = function(d) {
      return d.foo;
    },
    s = d3_hierarchy.stratify().id(foo),
    root = s([
      {foo: 'a'},
      {foo: 'aa', parentId: 'a'},
      {foo: 'ab', parentId: 'a'},
      {foo: 'aaa', parentId: 'aa'}
    ]);
  test.equal(s.id(), foo);
  test.deepEqual(noparent(root), {
    id: 'a',
    depth: 0,
    height: 2,
    data: {foo: 'a'},
    children: [
      {
        id: 'aa',
        depth: 1,
        height: 1,
        data: {foo: 'aa', parentId: 'a'},
        children: [
          {
            id: 'aaa',
            depth: 2,
            height: 0,
            data: {foo: 'aaa', parentId: 'aa'}
          }
        ]
      },
      {
        id: 'ab',
        depth: 1,
        height: 0,
        data: {foo: 'ab', parentId: 'a'}
      }
    ]
  });
  test.end();
});

tape('stratify.id(id) tests that id is a function', function(test) {
  var s = d3_hierarchy.stratify();
  test.throws(function() {
    s.id(42);
  });
  test.throws(function() {
    s.id(null);
  });
  test.end();
});

tape(
  'stratify.parentId(id) observes the specified parent id function',
  function(test) {
    var foo = function(d) {
        return d.foo;
      },
      s = d3_hierarchy.stratify().parentId(foo),
      root = s([
        {id: 'a'},
        {id: 'aa', foo: 'a'},
        {id: 'ab', foo: 'a'},
        {id: 'aaa', foo: 'aa'}
      ]);
    test.equal(s.parentId(), foo);
    test.deepEqual(noparent(root), {
      id: 'a',
      depth: 0,
      height: 2,
      data: {id: 'a'},
      children: [
        {
          id: 'aa',
          depth: 1,
          height: 1,
          data: {id: 'aa', foo: 'a'},
          children: [
            {
              id: 'aaa',
              depth: 2,
              height: 0,
              data: {id: 'aaa', foo: 'aa'}
            }
          ]
        },
        {
          id: 'ab',
          depth: 1,
          height: 0,
          data: {id: 'ab', foo: 'a'}
        }
      ]
    });
    test.end();
  }
);

tape('stratify.parentId(id) tests that id is a function', function(test) {
  var s = d3_hierarchy.stratify();
  test.throws(function() {
    s.parentId(42);
  });
  test.throws(function() {
    s.parentId(null);
  });
  test.end();
});

function noparent(node) {
  var copy = {};
  for (var k in node) {
    if (node.hasOwnProperty(k)) {
      // eslint-disable-line no-prototype-builtins
      switch (k) {
        case 'children':
          copy.children = node.children.map(noparent);
          break;
        case 'parent':
          break;
        default:
          copy[k] = node[k];
          break;
      }
    }
  }
  return copy;
}
var tape = require("tape"),
    d3_hierarchy = require("../../");

tape("node.links() returns an array of {source, target}", function(test) {
  var root = d3_hierarchy.hierarchy({id: "root", children: [{id: "a"}, {id: "b", children: [{id: "ba"}]}]}),
      a = root.children[0],
      b = root.children[1],
      ba = root.children[1].children[0];
  test.deepEqual(root.links(), [
    {source: root, target: a},
    {source: root, target: b},
    {source: b, target: ba}
  ]);
  test.end();
});
/* eslint-disable */

var d3 = Object.assign({}, require("../../"), require("d3-array"), require("d3-random")),
    benchmark = require("benchmark");

var slice = Array.prototype.slice,
    shuffle = d3.shuffle;

var n = 0,
    m = 1000,
    r = d3.randomLogNormal(10),
    x = d3.randomUniform(0, 100),
    y = x,
    circles0,
    circles1;

function extendBasis(B, p) {
  var i, j;

  if (enclosesWeakAll(p, B)) return [p];

  // If we get here then B must have at least one element.
  for (i = 0; i < B.length; ++i) {
    if (enclosesNot(p, B[i])
        && enclosesWeakAll(encloseBasis2(B[i], p), B)) {
      return [B[i], p];
    }
  }

  // If we get here then B must have at least two elements.
  for (i = 0; i < B.length - 1; ++i) {
    for (j = i + 1; j < B.length; ++j) {
      if (enclosesNot(encloseBasis2(B[i], B[j]), p)
          && enclosesNot(encloseBasis2(B[i], p), B[j])
          && enclosesNot(encloseBasis2(B[j], p), B[i])
          && enclosesWeakAll(encloseBasis3(B[i], B[j], p), B)) {
        return [B[i], B[j], p];
      }
    }
  }

  // If we get here then something is very wrong.
  throw new Error;
}

function enclosesNot(a, b) {
  var dr = a.r - b.r, dx = b.x - a.x, dy = b.y - a.y;
  return dr < 0 || dr * dr < dx * dx + dy * dy;
}

function enclosesWeak(a, b) {
  var dr = a.r - b.r + 1e-6, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}

function enclosesWeakAll(a, B) {
  for (var i = 0; i < B.length; ++i) {
    if (!enclosesWeak(a, B[i])) {
      return false;
    }
  }
  return true;
}

function encloseBasis(B) {
  switch (B.length) {
    case 1: return encloseBasis1(B[0]);
    case 2: return encloseBasis2(B[0], B[1]);
    case 3: return encloseBasis3(B[0], B[1], B[2]);
  }
}

function encloseBasis1(a) {
  return {
    x: a.x,
    y: a.y,
    r: a.r
  };
}

function encloseBasis2(a, b) {
  var x1 = a.x, y1 = a.y, r1 = a.r,
      x2 = b.x, y2 = b.y, r2 = b.r,
      x21 = x2 - x1, y21 = y2 - y1, r21 = r2 - r1,
      l = Math.sqrt(x21 * x21 + y21 * y21);
  return {
    x: (x1 + x2 + x21 / l * r21) / 2,
    y: (y1 + y2 + y21 / l * r21) / 2,
    r: (l + r1 + r2) / 2
  };
}

function encloseBasis3(a, b, c) {
  var x1 = a.x, y1 = a.y, r1 = a.r,
      x2 = b.x, y2 = b.y, r2 = b.r,
      x3 = c.x, y3 = c.y, r3 = c.r,
      a2 = x1 - x2,
      a3 = x1 - x3,
      b2 = y1 - y2,
      b3 = y1 - y3,
      c2 = r2 - r1,
      c3 = r3 - r1,
      d1 = x1 * x1 + y1 * y1 - r1 * r1,
      d2 = d1 - x2 * x2 - y2 * y2 + r2 * r2,
      d3 = d1 - x3 * x3 - y3 * y3 + r3 * r3,
      ab = a3 * b2 - a2 * b3,
      xa = (b2 * d3 - b3 * d2) / (ab * 2) - x1,
      xb = (b3 * c2 - b2 * c3) / ab,
      ya = (a3 * d2 - a2 * d3) / (ab * 2) - y1,
      yb = (a2 * c3 - a3 * c2) / ab,
      A = xb * xb + yb * yb - 1,
      B = 2 * (r1 + xa * xb + ya * yb),
      C = xa * xa + ya * ya - r1 * r1,
      r = -(A ? (B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) : C / B);
  return {
    x: x1 + xa + xb * r,
    y: y1 + ya + yb * r,
    r: r
  };
}

function encloseCircular(L) {
  var i = 0, n = L.length, j = 0, B = [], p, e, k = 0;

  if (n) do {
    p = L[i];
    ++k;
    if (!(e && enclosesWeak(e, p))) {
      e = encloseBasis(B = extendBasis(B, p));
      j = i;
    }
    i = (i + 1) % n;
  } while (i != j);

  return e;
}

function encloseCircularShuffle(L) {
  var i = 0, n = shuffle(L = slice.call(L)).length, j = 0, B = [], p, e, k = 0;

  if (n) do {
    p = L[i];
    ++k;
    if (!(e && enclosesWeak(e, p))) {
      e = encloseBasis(B = extendBasis(B, p));
      j = i;
    }
    i = (i + 1) % n;
  } while (i != j);

  return e;
}

function encloseLazyShuffle(L) {
  var i = 0, j, n = (L = slice.call(L)).length, B = [], p, e;

  while (i < n) {
    p = L[j = i + (Math.random() * (n - i) | 0)], L[j] = L[i], L[i] = p;
    if (e && enclosesWeak(e, p)) ++i;
    else e = encloseBasis(B = extendBasis(B, p)), i = 0;
  }

  return e;
}

function encloseNoShuffle(L) {
  var i = 0, n = L.length, B = [], p, e;

  while (i < n) {
    p = L[i];
    if (e && enclosesWeak(e, p)) ++i;
    else e = encloseBasis(B = extendBasis(B, p)), i = 0;
  }

  return e;
}

function encloseShuffle(L) {
  var i = 0, n = shuffle(L = slice.call(L)).length, B = [], p, e;

  while (i < n) {
    p = L[i];
    if (e && enclosesWeak(e, p)) ++i;
    else e = encloseBasis(B = extendBasis(B, p)), i = 0;
  }

  return e;
}

function enclosePrePass(L) {
  var i, n = L.length, B = [], p, e;

  for (i = 0; i < n; ++i) {
    p = L[i];
    if (!(e && enclosesWeak(e, p))) e = encloseBasis(B = extendBasis(B, p));
  }

  for (i = 0; i < n;) {
    p = L[i];
    if (e && enclosesWeak(e, p)) ++i;
    else e = encloseBasis(B = extendBasis(B, p)), i = 0;
  }

  return e;
}

function enclosePrePassThenLazyShuffle(L) {
  var i, j, n = (L = slice.call(L)).length, B = [], p, e;

  for (i = 0; i < n; ++i) {
    p = L[i];
    if (!(e && enclosesWeak(e, p))) e = encloseBasis(B = extendBasis(B, p));
  }

  for (i = 0; i < n;) {
    p = L[j = i + (Math.random() * (n - i) | 0)], L[j] = L[i], L[i] = p;
    if (e && enclosesWeak(e, p)) ++i;
    else e = encloseBasis(B = extendBasis(B, p)), i = 0;
  }

  return e;
}

function encloseShufflePrePass(L) {
  var i, n = shuffle(L = slice.call(L)).length, B = [], p, e;

  for (i = 0; i < n; ++i) {
    p = L[i];
    if (!(e && enclosesWeak(e, p))) e = encloseBasis(B = extendBasis(B, p));
  }

  for (i = 0; i < n;) {
    p = L[i];
    if (e && enclosesWeak(e, p)) ++i;
    else e = encloseBasis(B = extendBasis(B, p)), i = 0;
  }

  return e;
}

function encloseCompletePasses(L) {
  var i, n = L.length, B = [], p, e, dirty = false;

  do {
    for (i = 0, dirty = false; i < n; ++i) {
      p = L[i];
      if (!(e && enclosesWeak(e, p))) e = encloseBasis(B = extendBasis(B, p)), dirty = true;
    }
  } while (dirty);

  return e;
}

function encloseShuffleCompletePasses(L) {
  var i, n = shuffle(L = slice.call(L)).length, B = [], p, e, dirty = false;

  do {
    for (i = 0, dirty = false; i < n; ++i) {
      p = L[i];
      if (!(e && enclosesWeak(e, p))) e = encloseBasis(B = extendBasis(B, p)), dirty = true;
    }
  } while (dirty);

  return e;
}

function recycle(event) {
  circles0 = d3.packSiblings(new Array(10).fill().map(() => ({r: r(), x: x(), y: y()})));
  circles1 = circles0.slice().reverse();
}

(new benchmark.Suite)
    .add("encloseNoShuffle (forward)", {onCycle: recycle, fn: () => encloseNoShuffle(circles0)})
    .add("encloseNoShuffle (reverse)", {onCycle: recycle, fn: () => encloseNoShuffle(circles1)})
    .add("enclosePrePass (forward)", {onCycle: recycle, fn: () => enclosePrePass(circles0)})
    .add("enclosePrePass (reverse)", {onCycle: recycle, fn: () => enclosePrePass(circles1)})
    .add("encloseCompletePasses (forward)", {onCycle: recycle, fn: () => encloseCompletePasses(circles0)})
    .add("encloseCompletePasses (reverse)", {onCycle: recycle, fn: () => encloseCompletePasses(circles1)})
    .add("encloseCircular (forward)", {onCycle: recycle, fn: () => encloseCircular(circles0)})
    .add("encloseCircular (reverse)", {onCycle: recycle, fn: () => encloseCircular(circles1)})
    .add("encloseShufflePrePass (forward)", {onCycle: recycle, fn: () => encloseShufflePrePass(circles0)})
    .add("encloseShufflePrePass (reverse)", {onCycle: recycle, fn: () => encloseShufflePrePass(circles1)})
    .add("encloseShuffleCompletePasses (forward)", {onCycle: recycle, fn: () => encloseShuffleCompletePasses(circles0)})
    .add("encloseShuffleCompletePasses (reverse)", {onCycle: recycle, fn: () => encloseShuffleCompletePasses(circles1)})
    .add("enclosePrePassThenLazyShuffle (forward)", {onCycle: recycle, fn: () => enclosePrePassThenLazyShuffle(circles0)})
    .add("enclosePrePassThenLazyShuffle (reverse)", {onCycle: recycle, fn: () => enclosePrePassThenLazyShuffle(circles1)})
    .add("encloseShuffle (forward)", {onCycle: recycle, fn: () => encloseShuffle(circles0)})
    .add("encloseShuffle (reverse)", {onCycle: recycle, fn: () => encloseShuffle(circles1)})
    .add("encloseLazyShuffle (forward)", {onCycle: recycle, fn: () => encloseLazyShuffle(circles0)})
    .add("encloseLazyShuffle (reverse)", {onCycle: recycle, fn: () => encloseLazyShuffle(circles1)})
    .add("encloseCircularShuffle (forward)", {onCycle: recycle, fn: () => encloseCircularShuffle(circles0)})
    .add("encloseCircularShuffle (reverse)", {onCycle: recycle, fn: () => encloseCircularShuffle(circles1)})
    .on("start", recycle)
    .on("cycle", event => console.log(event.target + ""))
    .run();
/* eslint-disable */

var d3 = Object.assign({}, require("../../"), require("d3-random"));

var n = 0, r = d3.randomLogNormal(4);

while (true) {
  if (!(n % 100)) process.stdout.write(".");
  if (!(n % 10000)) process.stdout.write("\n" + n + " ");
  ++n;
  var radii = new Array(20).fill().map(r).map(Math.ceil);
  try {
    if (intersectsAny(d3.packSiblings(radii.map(r => ({r: r}))))) {
      throw new Error("overlap");
    }
  } catch (error) {
    process.stdout.write("\n");
    process.stdout.write(JSON.stringify(radii));
    process.stdout.write("\n");
    throw error;
  }
}

function intersectsAny(circles) {
  for (var i = 0, n = circles.length; i < n; ++i) {
    for (var j = i + 1, ci = circles[i], cj; j < n; ++j) {
      if (intersects(ci, cj = circles[j])) {
        return true;
      }
    }
  }
  return false;
}

function intersects(a, b) {
  var dr = a.r + b.r - 1e-6, dx = b.x - a.x, dy = b.y - a.y;
  return dr * dr > dx * dx + dy * dy;
}
/* eslint-disable */

var d3 = Object.assign({}, require("../../"), require("d3-array"), require("d3-random"));

var n = 0,
    m = 1000,
    r = d3.randomLogNormal(10),
    x = d3.randomUniform(0, 100),
    y = x;

while (true) {
  if (!(n % 10)) process.stdout.write(".");
  if (!(n % 1000)) process.stdout.write("\n" + n + " ");
  ++n;
  var circles = new Array(20).fill().map(() => ({r: r(), x: x(), y: y()})), circles2,
      enclose = d3.packEnclose(circles), enclose2;
  if (circles.some(circle => !encloses(enclose, circle))) {
    console.log(JSON.stringify(circles));
  }
  for (var i = 0; i < m; ++i) {
    if (!equals(enclose, enclose2 = d3.packEnclose(circles2 = d3.shuffle(circles.slice())))) {
      console.log(JSON.stringify(enclose));
      console.log(JSON.stringify(enclose2));
      console.log(JSON.stringify(circles));
      console.log(JSON.stringify(circles2));
    }
  }
}

function encloses(a, b) {
  var dr = a.r - b.r + 1e-6, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}

function equals(a, b) {
  return Math.abs(a.r - b.r) < 1e-6
      && Math.abs(a.x - b.x) < 1e-6
      && Math.abs(a.y - b.y) < 1e-6;
}
/* eslint-disable */

// Look for numerical inconsistencies between the place() and intersects()
// methods from pack/siblings.js

// The place and intersect functions are not exported, so we duplicate them here
function place(a, b, c) {
  var dx = b.x - a.x, x, a2,
      dy = b.y - a.y, y, b2,
      d2 = dx * dx + dy * dy;
  if (d2) {
    a2 = a.r + c.r, a2 *= a2;
    b2 = b.r + c.r, b2 *= b2;
    if (a2 > b2) {
      x = (d2 + b2 - a2) / (2 * d2);
      y = Math.sqrt(Math.max(0, b2 / d2 - x * x));
      c.x = b.x - x * dx - y * dy;
      c.y = b.y - x * dy + y * dx;
    } else {
      x = (d2 + a2 - b2) / (2 * d2);
      y = Math.sqrt(Math.max(0, a2 / d2 - x * x));
      c.x = a.x + x * dx - y * dy;
      c.y = a.y + x * dy + y * dx;
    }
  } else {
    c.x = a.x + c.r;
    c.y = a.y;
  }

  // This last part is not part of the original function!
  if (intersects(a, c) || intersects(b, c)) {
    console.log(`a = {x: ${a.x}, y: ${a.y}, r: ${a.r}},`);
    console.log(`b = {x: ${b.x}, y: ${b.y}, r: ${b.r}},`);
    console.log(`c = {r: ${c.r}}`);
    console.log();
  }
}

function intersects(a, b) {
  var dr = a.r + b.r - 1e-6, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}

// Create n random circles.
// The first two are placed touching on the x-axis; the rest are unplaced
function randomCircles(n) {
  const r = [];
  for (var i = 0; i < n; i++) {
    r.push({ r: Math.random() * (1 << (Math.random() * 30)) });
  }
  r[0].x = -r[1].r, r[1].x = r[0].r, r[0].y = r[1].y = 0;
  return r;
}

function test() {
  for(;;) {
    const [a,b,c,d] = randomCircles(4);
    place(b, a, c);
    place(a, c, d);
  }
}

test();
var fs = require("fs"),
    tape = require("tape"),
    d3_queue = require("d3-queue"),
    d3_dsv = require("d3-dsv"),
    d3_hierarchy = require("../../");

tape("pack(flare) produces the expected result", test(
  "test/data/flare.csv",
  "test/data/flare-pack.json"
));

function test(input, expected) {
  return function(test) {

    d3_queue.queue()
        .defer(fs.readFile, input, "utf8")
        .defer(fs.readFile, expected, "utf8")
        .await(ready);

    function ready(error, inputText, expectedText) {
      if (error) throw error;

      var stratify = d3_hierarchy.stratify()
          .parentId(function(d) { var i = d.id.lastIndexOf("."); return i >= 0 ? d.id.slice(0, i) : null; });

      var pack = d3_hierarchy.pack()
          .size([960, 960]);

      var data = d3_dsv.csvParse(inputText),
          expected = JSON.parse(expectedText),
          actual = pack(stratify(data)
              .sum(function(d) { return d.value; })
              .sort(function(a, b) { return b.value - a.value || a.data.id.localeCompare(b.data.id); }));

      (function visit(node) {
        node.name = node.data.id.slice(node.data.id.lastIndexOf(".") + 1);
        node.x = round(node.x);
        node.y = round(node.y);
        node.r = round(node.r);
        delete node.id;
        delete node.parent;
        delete node.data;
        delete node.depth;
        delete node.height;
        if (node.children) node.children.forEach(visit);
      })(actual);

      (function visit(node) {
        node.x = round(node.x);
        node.y = round(node.y);
        node.r = round(node.r);
        if (node.children) node.children.forEach(visit);
      })(expected);

      test.deepEqual(actual, expected);
      test.end();
    }
  };
}

function round(x) {
  return Math.round(x * 100) / 100;
}
var tape = require("tape"),
    d3 = require("../../");

tape("packSiblings(circles) produces a non-overlapping layout of circles", function(test) {
  permute([100, 200, 500, 70, 3].map(circleValue), p => intersectsAny(d3.packSiblings(p)) && test.fail(p.map(c => c.r)));
  permute([3, 30, 50, 400, 600].map(circleValue), p => intersectsAny(d3.packSiblings(p)) && test.fail(p.map(c => c.r)));
  permute([1, 1, 3, 30, 50, 400, 600].map(circleValue), p => intersectsAny(d3.packSiblings(p)) && test.fail(p.map(c => c.r)));
  test.equal(intersectsAny(d3.packSiblings([0.24155803737254639, 0.06349736576607135, 0.4721808601742349, 0.7469141449305542, 1.6399276349079663].map(circleRadius))), false);
  test.equal(intersectsAny(d3.packSiblings([2, 9071, 79, 51, 325, 867, 546, 19773, 371, 16, 165781, 10474, 6928, 40201, 31062, 14213, 8626, 12, 299, 1075, 98918, 4738, 664, 2694, 2619, 51237, 21431, 99, 5920, 1117, 321, 519162, 33559, 234, 4207].map(circleValue))), false);
  test.equal(intersectsAny(d3.packSiblings([0.3371386860049076, 58.65337373332081, 2.118883785686244, 1.7024669121097333, 5.834919697833051, 8.949453403094978, 6.792586534702093, 105.30490014617664, 6.058936212213754, 0.9535722042975694, 313.7636051642043].map(circleRadius))), false);
  test.equal(intersectsAny(d3.packSiblings([6.26551789195159, 1.707773433636342, 9.43220282933871, 9.298909705475646, 5.753163715613753, 8.882383159012575, 0.5819319661882536, 2.0234859171687747, 2.096171518434433, 9.762727931304937].map(circleRadius))), false);
  test.equal(intersectsAny(d3.packSiblings([9.153035316963035, 9.86048622524424, 8.3974499571329, 7.8338007571397865, 8.78260490259886, 6.165829618300345, 7.134819943097564, 7.803701771392344, 5.056638985134191, 7.424601077645588, 8.538658023474753, 2.4616388562274896, 0.5444633747829343, 9.005740508584667].map(circleRadius))), false);
  test.equal(intersectsAny(d3.packSiblings([2.23606797749979, 52.07088264296293, 5.196152422706632, 20.09975124224178, 357.11557267679996, 4.898979485566356, 14.7648230602334, 17.334875731491763].map(circleRadius))), false);
  test.end();
});

tape("packSiblings(circles) can successfully pack a circle with a tiny radius", function(test) {
  test.equal(intersectsAny(d3.packSiblings([
    0.5672035864083508,
    0.6363498687452267,
    0.5628456216244132,
    1.5619458670239148,
    1.5658933259424268,
    0.9195955097595698,
    0.4747083763630309,
    0.38341282734497434,
    1.3475593361729394,
    0.7492342961633259,
    1.0716990115071823,
    0.31686823341701664,
    2.8766442376551415e-7
  ].map(circleRadius))), false);
  test.end();
});

function swap(array, i, j) {
  var t = array[i];
  array[i] = array[j];
  array[j] = t;
}

function permute(array, f, n) {
  if (n == null) n = array.length;
  if (n === 1) return void f(array);
  for (var i = 0; i < n - 1; ++i) {
    permute(array, f, n - 1);
    swap(array, n & 1 ? 0 : i, n - 1);
  }
  permute(array, f, n - 1);
}

function circleValue(value) {
  return {r: Math.sqrt(value)};
}

function circleRadius(radius) {
  return {r: radius};
}

function intersectsAny(circles) {
  for (var i = 0, n = circles.length; i < n; ++i) {
    for (var j = i + 1, ci = circles[i]; j < n; ++j) {
      if (intersects(ci, circles[j])) {
        return true;
      }
    }
  }
  return false;
}

function intersects(a, b) {
  var dr = a.r + b.r - 1e-6, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}
var tape = require("tape"),
    d3_hierarchy = require("../../"),
    round = require("./round");

tape("treemapBinary(parent, x0, y0, x1, y1) generates a binary treemap layout", function(test) {
  var tile = d3_hierarchy.treemapBinary,
      root = {
        value: 24,
        children: [
          {value: 6},
          {value: 6},
          {value: 4},
          {value: 3},
          {value: 2},
          {value: 2},
          {value: 1}
        ]
      };
  tile(root, 0, 0, 6, 4);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 3.00, y0: 0.00, y1: 2.00},
    {x0: 0.00, x1: 3.00, y0: 2.00, y1: 4.00},
    {x0: 3.00, x1: 4.71, y0: 0.00, y1: 2.33},
    {x0: 4.71, x1: 6.00, y0: 0.00, y1: 2.33},
    {x0: 3.00, x1: 4.20, y0: 2.33, y1: 4.00},
    {x0: 4.20, x1: 5.40, y0: 2.33, y1: 4.00},
    {x0: 5.40, x1: 6.00, y0: 2.33, y1: 4.00}
  ]);
  test.end();
});
var tape = require("tape"),
    d3_hierarchy = require("../../"),
    round = require("./round");

tape("treemapDice(parent, x0, y0, x1, y1) generates a diced layout", function(test) {
  var tile = d3_hierarchy.treemapDice,
      root = {
        value: 24,
        children: [
          {value: 6},
          {value: 6},
          {value: 4},
          {value: 3},
          {value: 2},
          {value: 2},
          {value: 1}
        ]
      };
  tile(root, 0, 0, 4, 6);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 1.00, y0: 0.00, y1: 6.00},
    {x0: 1.00, x1: 2.00, y0: 0.00, y1: 6.00},
    {x0: 2.00, x1: 2.67, y0: 0.00, y1: 6.00},
    {x0: 2.67, x1: 3.17, y0: 0.00, y1: 6.00},
    {x0: 3.17, x1: 3.50, y0: 0.00, y1: 6.00},
    {x0: 3.50, x1: 3.83, y0: 0.00, y1: 6.00},
    {x0: 3.83, x1: 4.00, y0: 0.00, y1: 6.00}
  ]);
  test.end();
});

tape("treemapDice(parent, x0, y0, x1, y1) handles a degenerate empty parent", function(test) {
  var tile = d3_hierarchy.treemapDice,
      root = {
        value: 0,
        children: [
          {value: 0},
          {value: 0}
        ]
      };
  tile(root, 0, 0, 0, 4);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 0.00, y0: 0.00, y1: 4.00},
    {x0: 0.00, x1: 0.00, y0: 0.00, y1: 4.00}
  ]);
  test.end();
});
var fs = require("fs"),
    tape = require("tape"),
    d3_queue = require("d3-queue"),
    d3_dsv = require("d3-dsv"),
    d3_hierarchy = require("../../");

tape("treemap(flare) produces the expected result with a squarified ratio of φ", test(
  "test/data/flare.csv",
  "test/data/flare-phi.json",
  d3_hierarchy.treemapSquarify
));

tape("treemap(flare) produces the expected result with a squarified ratio of 1", test(
  "test/data/flare.csv",
  "test/data/flare-one.json",
  d3_hierarchy.treemapSquarify.ratio(1)
));

function test(input, expected, tile) {
  return function(test) {

    d3_queue.queue()
        .defer(fs.readFile, input, "utf8")
        .defer(fs.readFile, expected, "utf8")
        .await(ready);

    function ready(error, inputText, expectedText) {
      if (error) throw error;

      var stratify = d3_hierarchy.stratify()
          .parentId(function(d) { var i = d.id.lastIndexOf("."); return i >= 0 ? d.id.slice(0, i) : null; });

      var treemap = d3_hierarchy.treemap()
          .tile(tile)
          .size([960, 500]);

      var data = d3_dsv.csvParse(inputText),
          expected = JSON.parse(expectedText),
          actual = treemap(stratify(data)
              .sum(function(d) { return d.value; })
              .sort(function(a, b) { return b.value - a.value || a.data.id.localeCompare(b.data.id); }));

      (function visit(node) {
        node.name = node.data.id.slice(node.data.id.lastIndexOf(".") + 1);
        node.x0 = round(node.x0);
        node.y0 = round(node.y0);
        node.x1 = round(node.x1);
        node.y1 = round(node.y1);
        delete node.id;
        delete node.parent;
        delete node.data;
        delete node._squarify;
        delete node.height;
        if (node.children) node.children.forEach(visit);
      })(actual);

      (function visit(node) {
        node.x0 = round(node.x);
        node.y0 = round(node.y);
        node.x1 = round(node.x + node.dx);
        node.y1 = round(node.y + node.dy);
        delete node.x;
        delete node.y;
        delete node.dx;
        delete node.dy;
        if (node.children) {
          node.children.reverse(); // D3 3.x bug
          node.children.forEach(visit);
        }
      })(expected);

      test.deepEqual(actual, expected);
      test.end();
    }
  };
}

function round(x) {
  return Math.round(x * 100) / 100;
}
var tape = require("tape"),
    d3_hierarchy = require("../../"),
    round = require("./round"),
    simple = require("../data/simple2");

tape("treemap() has the expected defaults", function(test) {
  var treemap = d3_hierarchy.treemap();
  test.equal(treemap.tile(), d3_hierarchy.treemapSquarify);
  test.deepEqual(treemap.size(), [1, 1]);
  test.deepEqual(treemap.round(), false);
  test.end();
});

tape("treemap.round(round) observes the specified rounding", function(test) {
  var treemap = d3_hierarchy.treemap().size([600, 400]).round(true),
      root = treemap(d3_hierarchy.hierarchy(simple).sum(defaultValue).sort(descendingValue)),
      nodes = root.descendants().map(round);
  test.deepEqual(treemap.round(), true);
  test.deepEqual(nodes, [
    {x0:   0, x1: 600, y0:   0, y1: 400},
    {x0:   0, x1: 300, y0:   0, y1: 200},
    {x0:   0, x1: 300, y0: 200, y1: 400},
    {x0: 300, x1: 471, y0:   0, y1: 233},
    {x0: 471, x1: 600, y0:   0, y1: 233},
    {x0: 300, x1: 540, y0: 233, y1: 317},
    {x0: 300, x1: 540, y0: 317, y1: 400},
    {x0: 540, x1: 600, y0: 233, y1: 400}
  ]);
  test.end();
});

tape("treemap.round(round) coerces the specified round to boolean", function(test) {
  var treemap = d3_hierarchy.treemap().round("yes");
  test.strictEqual(treemap.round(), true);
  test.end();
});

tape("treemap.padding(padding) sets the inner and outer padding to the specified value", function(test) {
  var treemap = d3_hierarchy.treemap().padding("42");
  test.strictEqual(treemap.padding()(), 42);
  test.strictEqual(treemap.paddingInner()(), 42);
  test.strictEqual(treemap.paddingOuter()(), 42);
  test.strictEqual(treemap.paddingTop()(), 42);
  test.strictEqual(treemap.paddingRight()(), 42);
  test.strictEqual(treemap.paddingBottom()(), 42);
  test.strictEqual(treemap.paddingLeft()(), 42);
  test.end();
});

tape("treemap.paddingInner(padding) observes the specified padding", function(test) {
  var treemap = d3_hierarchy.treemap().size([6, 4]).paddingInner(0.5),
      root = treemap(d3_hierarchy.hierarchy(simple).sum(defaultValue).sort(descendingValue)),
      nodes = root.descendants().map(round);
  test.strictEqual(treemap.paddingInner()(), 0.5);
  test.deepEqual(treemap.size(), [6, 4]);
  test.deepEqual(nodes, [
    {x0: 0.00, x1: 6.00, y0: 0.00, y1: 4.00},
    {x0: 0.00, x1: 2.75, y0: 0.00, y1: 1.75},
    {x0: 0.00, x1: 2.75, y0: 2.25, y1: 4.00},
    {x0: 3.25, x1: 4.61, y0: 0.00, y1: 2.13},
    {x0: 5.11, x1: 6.00, y0: 0.00, y1: 2.13},
    {x0: 3.25, x1: 5.35, y0: 2.63, y1: 3.06},
    {x0: 3.25, x1: 5.35, y0: 3.56, y1: 4.00},
    {x0: 5.85, x1: 6.00, y0: 2.63, y1: 4.00}
  ]);
  test.end();
});

tape("treemap.paddingOuter(padding) observes the specified padding", function(test) {
  var treemap = d3_hierarchy.treemap().size([6, 4]).paddingOuter(0.5),
      root = treemap(d3_hierarchy.hierarchy(simple).sum(defaultValue).sort(descendingValue)),
      nodes = root.descendants().map(round);
  test.strictEqual(treemap.paddingOuter()(), 0.5);
  test.strictEqual(treemap.paddingTop()(), 0.5);
  test.strictEqual(treemap.paddingRight()(), 0.5);
  test.strictEqual(treemap.paddingBottom()(), 0.5);
  test.strictEqual(treemap.paddingLeft()(), 0.5);
  test.deepEqual(treemap.size(), [6, 4]);
  test.deepEqual(nodes, [
    {x0: 0.00, x1: 6.00, y0: 0.00, y1: 4.00},
    {x0: 0.50, x1: 3.00, y0: 0.50, y1: 2.00},
    {x0: 0.50, x1: 3.00, y0: 2.00, y1: 3.50},
    {x0: 3.00, x1: 4.43, y0: 0.50, y1: 2.25},
    {x0: 4.43, x1: 5.50, y0: 0.50, y1: 2.25},
    {x0: 3.00, x1: 5.00, y0: 2.25, y1: 2.88},
    {x0: 3.00, x1: 5.00, y0: 2.88, y1: 3.50},
    {x0: 5.00, x1: 5.50, y0: 2.25, y1: 3.50}
  ]);
  test.end();
});

tape("treemap.size(size) observes the specified size", function(test) {
  var treemap = d3_hierarchy.treemap().size([6, 4]),
      root = treemap(d3_hierarchy.hierarchy(simple).sum(defaultValue).sort(descendingValue)),
      nodes = root.descendants().map(round);
  test.deepEqual(treemap.size(), [6, 4]);
  test.deepEqual(nodes, [
    {x0: 0.00, x1: 6.00, y0: 0.00, y1: 4.00},
    {x0: 0.00, x1: 3.00, y0: 0.00, y1: 2.00},
    {x0: 0.00, x1: 3.00, y0: 2.00, y1: 4.00},
    {x0: 3.00, x1: 4.71, y0: 0.00, y1: 2.33},
    {x0: 4.71, x1: 6.00, y0: 0.00, y1: 2.33},
    {x0: 3.00, x1: 5.40, y0: 2.33, y1: 3.17},
    {x0: 3.00, x1: 5.40, y0: 3.17, y1: 4.00},
    {x0: 5.40, x1: 6.00, y0: 2.33, y1: 4.00}
  ]);
  test.end();
});

tape("treemap.size(size) coerces the specified size to numbers", function(test) {
  var treemap = d3_hierarchy.treemap().size(["6", {valueOf: function() { return 4; }}]);
  test.strictEqual(treemap.size()[0], 6);
  test.strictEqual(treemap.size()[1], 4);
  test.end();
});

tape("treemap.size(size) makes defensive copies", function(test) {
  var size = [6, 4],
      treemap = d3_hierarchy.treemap().size(size),
      root = (size[1] = 100, treemap(d3_hierarchy.hierarchy(simple).sum(defaultValue).sort(descendingValue))),
      nodes = root.descendants().map(round);
  test.deepEqual(treemap.size(), [6, 4]);
  treemap.size()[1] = 100;
  test.deepEqual(treemap.size(), [6, 4]);
  test.deepEqual(nodes, [
    {x0: 0.00, x1: 6.00, y0: 0.00, y1: 4.00},
    {x0: 0.00, x1: 3.00, y0: 0.00, y1: 2.00},
    {x0: 0.00, x1: 3.00, y0: 2.00, y1: 4.00},
    {x0: 3.00, x1: 4.71, y0: 0.00, y1: 2.33},
    {x0: 4.71, x1: 6.00, y0: 0.00, y1: 2.33},
    {x0: 3.00, x1: 5.40, y0: 2.33, y1: 3.17},
    {x0: 3.00, x1: 5.40, y0: 3.17, y1: 4.00},
    {x0: 5.40, x1: 6.00, y0: 2.33, y1: 4.00}
  ]);
  test.end();
});

tape("treemap.tile(tile) observes the specified tile function", function(test) {
  var treemap = d3_hierarchy.treemap().size([6, 4]).tile(d3_hierarchy.treemapSlice),
      root = treemap(d3_hierarchy.hierarchy(simple).sum(defaultValue).sort(descendingValue)),
      nodes = root.descendants().map(round);
  test.equal(treemap.tile(), d3_hierarchy.treemapSlice);
  test.deepEqual(nodes, [
    {x0: 0.00, x1: 6.00, y0: 0.00, y1: 4.00},
    {x0: 0.00, x1: 6.00, y0: 0.00, y1: 1.00},
    {x0: 0.00, x1: 6.00, y0: 1.00, y1: 2.00},
    {x0: 0.00, x1: 6.00, y0: 2.00, y1: 2.67},
    {x0: 0.00, x1: 6.00, y0: 2.67, y1: 3.17},
    {x0: 0.00, x1: 6.00, y0: 3.17, y1: 3.50},
    {x0: 0.00, x1: 6.00, y0: 3.50, y1: 3.83},
    {x0: 0.00, x1: 6.00, y0: 3.83, y1: 4.00}
  ]);
  test.end();
});

tape("treemap(data) observes the specified values", function(test) {
  var foo = function(d) { return d.foo; },
      treemap = d3_hierarchy.treemap().size([6, 4]),
      root = treemap(d3_hierarchy.hierarchy(require("../data/simple3")).sum(foo).sort(descendingValue)),
      nodes = root.descendants().map(round);
  test.deepEqual(treemap.size(), [6, 4]);
  test.deepEqual(nodes, [
    {x0: 0.00, x1: 6.00, y0: 0.00, y1: 4.00},
    {x0: 0.00, x1: 3.00, y0: 0.00, y1: 2.00},
    {x0: 0.00, x1: 3.00, y0: 2.00, y1: 4.00},
    {x0: 3.00, x1: 4.71, y0: 0.00, y1: 2.33},
    {x0: 4.71, x1: 6.00, y0: 0.00, y1: 2.33},
    {x0: 3.00, x1: 5.40, y0: 2.33, y1: 3.17},
    {x0: 3.00, x1: 5.40, y0: 3.17, y1: 4.00},
    {x0: 5.40, x1: 6.00, y0: 2.33, y1: 4.00}
  ]);
  test.end();
});

tape("treemap(data) observes the specified sibling order", function(test) {
  var treemap = d3_hierarchy.treemap(),
      root = treemap(d3_hierarchy.hierarchy(simple).sum(defaultValue).sort(ascendingValue));
  test.deepEqual(root.descendants().map(function(d) { return d.value; }), [24, 1, 2, 2, 3, 4, 6, 6]);
  test.end();
});

function defaultValue(d) {
  return d.value;
}

function ascendingValue(a, b) {
  return a.value - b.value;
}

function descendingValue(a, b) {
  return b.value - a.value;
}
var tape = require("tape"),
    d3_hierarchy = require("../../"),
    round = require("./round");

tape("treemapResquarify(parent, x0, y0, x1, y1) produces a stable update", function(test) {
  var tile = d3_hierarchy.treemapResquarify,
      root = {value: 20, children: [{value: 10}, {value: 10}]};
  tile(root, 0, 0, 20, 10);
  test.deepEqual(root.children.map(round), [
    {x0:  0, x1: 10, y0:  0, y1: 10},
    {x0: 10, x1: 20, y0:  0, y1: 10}
  ]);
  tile(root, 0, 0, 10, 20);
  test.deepEqual(root.children.map(round), [
    {x0:  0, x1:  5, y0:  0, y1: 20},
    {x0:  5, x1: 10, y0:  0, y1: 20}
  ]);
  test.end();
});

tape("treemapResquarify.ratio(ratio) observes the specified ratio", function(test) {
  var tile = d3_hierarchy.treemapResquarify.ratio(1),
      root = {
        value: 24,
        children: [
          {value: 6},
          {value: 6},
          {value: 4},
          {value: 3},
          {value: 2},
          {value: 2},
          {value: 1}
        ]
      };
  tile(root, 0, 0, 6, 4);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 3.00, y0: 0.00, y1: 2.00},
    {x0: 0.00, x1: 3.00, y0: 2.00, y1: 4.00},
    {x0: 3.00, x1: 4.71, y0: 0.00, y1: 2.33},
    {x0: 4.71, x1: 6.00, y0: 0.00, y1: 2.33},
    {x0: 3.00, x1: 4.20, y0: 2.33, y1: 4.00},
    {x0: 4.20, x1: 5.40, y0: 2.33, y1: 4.00},
    {x0: 5.40, x1: 6.00, y0: 2.33, y1: 4.00}
  ]);
  test.end();
});

tape("treemapResquarify.ratio(ratio) is stable if the ratio is unchanged", function(test) {
  var root = {value: 20, children: [{value: 10}, {value: 10}]};
  d3_hierarchy.treemapResquarify(root, 0, 0, 20, 10);
  test.deepEqual(root.children.map(round), [
    {x0:  0, x1: 10, y0:  0, y1: 10},
    {x0: 10, x1: 20, y0:  0, y1: 10}
  ]);
  d3_hierarchy.treemapResquarify.ratio((1 + Math.sqrt(5)) / 2)(root, 0, 0, 10, 20);
  test.deepEqual(root.children.map(round), [
    {x0:  0, x1:  5, y0:  0, y1: 20},
    {x0:  5, x1: 10, y0:  0, y1: 20}
  ]);
  test.end();
});

tape("treemapResquarify.ratio(ratio) is unstable if the ratio is changed", function(test) {
  var root = {value: 20, children: [{value: 10}, {value: 10}]};
  d3_hierarchy.treemapResquarify(root, 0, 0, 20, 10);
  test.deepEqual(root.children.map(round), [
    {x0:  0, x1: 10, y0:  0, y1: 10},
    {x0: 10, x1: 20, y0:  0, y1: 10}
  ]);
  d3_hierarchy.treemapResquarify.ratio(1)(root, 0, 0, 10, 20);
  test.deepEqual(root.children.map(round), [
    {x0:  0, x1: 10, y0:  0, y1: 10},
    {x0:  0, x1: 10, y0: 10, y1: 20}
  ]);
  test.end();
});
module.exports = function(d) {
  return {
    x0: round(d.x0),
    y0: round(d.y0),
    x1: round(d.x1),
    y1: round(d.y1)
  };
};

function round(x) {
  return Math.round(x * 100) / 100;
}
var tape = require("tape"),
    d3_hierarchy = require("../../"),
    round = require("./round");

tape("treemapSlice(parent, x0, y0, x1, y1) generates a sliced layout", function(test) {
  var tile = d3_hierarchy.treemapSlice,
      root = {
        value: 24,
        children: [
          {value: 6},
          {value: 6},
          {value: 4},
          {value: 3},
          {value: 2},
          {value: 2},
          {value: 1}
        ]
      };
  tile(root, 0, 0, 6, 4);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 6.00, y0: 0.00, y1: 1.00},
    {x0: 0.00, x1: 6.00, y0: 1.00, y1: 2.00},
    {x0: 0.00, x1: 6.00, y0: 2.00, y1: 2.67},
    {x0: 0.00, x1: 6.00, y0: 2.67, y1: 3.17},
    {x0: 0.00, x1: 6.00, y0: 3.17, y1: 3.50},
    {x0: 0.00, x1: 6.00, y0: 3.50, y1: 3.83},
    {x0: 0.00, x1: 6.00, y0: 3.83, y1: 4.00}
  ]);
  test.end();
});

tape("treemapSlice(parent, x0, y0, x1, y1) handles a degenerate empty parent", function(test) {
  var tile = d3_hierarchy.treemapSlice,
      root = {
        value: 0,
        children: [
          {value: 0},
          {value: 0}
        ]
      };
  tile(root, 0, 0, 4, 0);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 4.00, y0: 0.00, y1: 0.00},
    {x0: 0.00, x1: 4.00, y0: 0.00, y1: 0.00}
  ]);
  test.end();
});
var tape = require("tape"),
    d3_hierarchy = require("../../"),
    round = require("./round");

tape("treemapSliceDice(parent, x0, y0, x1, y1) uses slice for odd depth", function(test) {
  var tile = d3_hierarchy.treemapSliceDice,
      root = {
        depth: 1,
        value: 24,
        children: [
          {value: 6},
          {value: 6},
          {value: 4},
          {value: 3},
          {value: 2},
          {value: 2},
          {value: 1}
        ]
      };
  tile(root, 0, 0, 6, 4);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 6.00, y0: 0.00, y1: 1.00},
    {x0: 0.00, x1: 6.00, y0: 1.00, y1: 2.00},
    {x0: 0.00, x1: 6.00, y0: 2.00, y1: 2.67},
    {x0: 0.00, x1: 6.00, y0: 2.67, y1: 3.17},
    {x0: 0.00, x1: 6.00, y0: 3.17, y1: 3.50},
    {x0: 0.00, x1: 6.00, y0: 3.50, y1: 3.83},
    {x0: 0.00, x1: 6.00, y0: 3.83, y1: 4.00}
  ]);
  test.end();
});

tape("treemapSliceDice(parent, x0, y0, x1, y1) uses dice for even depth", function(test) {
  var tile = d3_hierarchy.treemapSliceDice,
      root = {
        depth: 2,
        value: 24,
        children: [
          {value: 6},
          {value: 6},
          {value: 4},
          {value: 3},
          {value: 2},
          {value: 2},
          {value: 1}
        ]
      };
  tile(root, 0, 0, 4, 6);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 1.00, y0: 0.00, y1: 6.00},
    {x0: 1.00, x1: 2.00, y0: 0.00, y1: 6.00},
    {x0: 2.00, x1: 2.67, y0: 0.00, y1: 6.00},
    {x0: 2.67, x1: 3.17, y0: 0.00, y1: 6.00},
    {x0: 3.17, x1: 3.50, y0: 0.00, y1: 6.00},
    {x0: 3.50, x1: 3.83, y0: 0.00, y1: 6.00},
    {x0: 3.83, x1: 4.00, y0: 0.00, y1: 6.00}
  ]);
  test.end();
});
var tape = require("tape"),
    d3_hierarchy = require("../../"),
    round = require("./round");

tape("treemapSquarify(parent, x0, y0, x1, y1) generates a squarified layout", function(test) {
  var tile = d3_hierarchy.treemapSquarify,
      root = {
        value: 24,
        children: [
          {value: 6},
          {value: 6},
          {value: 4},
          {value: 3},
          {value: 2},
          {value: 2},
          {value: 1}
        ]
      };
  tile(root, 0, 0, 6, 4);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 3.00, y0: 0.00, y1: 2.00},
    {x0: 0.00, x1: 3.00, y0: 2.00, y1: 4.00},
    {x0: 3.00, x1: 4.71, y0: 0.00, y1: 2.33},
    {x0: 4.71, x1: 6.00, y0: 0.00, y1: 2.33},
    {x0: 3.00, x1: 5.40, y0: 2.33, y1: 3.17},
    {x0: 3.00, x1: 5.40, y0: 3.17, y1: 4.00},
    {x0: 5.40, x1: 6.00, y0: 2.33, y1: 4.00}
  ]);
  test.end();
});

tape("treemapSquarify(parent, x0, y0, x1, y1) does not produce a stable update", function(test) {
  var tile = d3_hierarchy.treemapSquarify,
      root = {value: 20, children: [{value: 10}, {value: 10}]};
  tile(root, 0, 0, 20, 10);
  test.deepEqual(root.children.map(round), [
    {x0:  0, x1: 10, y0:  0, y1: 10},
    {x0: 10, x1: 20, y0:  0, y1: 10}
  ]);
  tile(root, 0, 0, 10, 20);
  test.deepEqual(root.children.map(round), [
    {x0:  0, x1: 10, y0:  0, y1: 10},
    {x0:  0, x1: 10, y0: 10, y1: 20}
  ]);
  test.end();
});

tape("treemapSquarify.ratio(ratio) observes the specified ratio", function(test) {
  var tile = d3_hierarchy.treemapSquarify.ratio(1),
      root = {
        value: 24,
        children: [
          {value: 6},
          {value: 6},
          {value: 4},
          {value: 3},
          {value: 2},
          {value: 2},
          {value: 1}
        ]
      };
  tile(root, 0, 0, 6, 4);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 3.00, y0: 0.00, y1: 2.00},
    {x0: 0.00, x1: 3.00, y0: 2.00, y1: 4.00},
    {x0: 3.00, x1: 4.71, y0: 0.00, y1: 2.33},
    {x0: 4.71, x1: 6.00, y0: 0.00, y1: 2.33},
    {x0: 3.00, x1: 4.20, y0: 2.33, y1: 4.00},
    {x0: 4.20, x1: 5.40, y0: 2.33, y1: 4.00},
    {x0: 5.40, x1: 6.00, y0: 2.33, y1: 4.00}
  ]);
  test.end();
});

tape("treemapSquarify(parent, x0, y0, x1, y1) handles a degenerate tall empty parent", function(test) {
  var tile = d3_hierarchy.treemapSquarify,
      root = {
        value: 0,
        children: [
          {value: 0},
          {value: 0}
        ]
      };
  tile(root, 0, 0, 0, 4);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 0.00, y0: 0.00, y1: 4.00},
    {x0: 0.00, x1: 0.00, y0: 0.00, y1: 4.00}
  ]);
  test.end();
});

tape("treemapSquarify(parent, x0, y0, x1, y1) handles a degenerate wide empty parent", function(test) {
  var tile = d3_hierarchy.treemapSquarify,
      root = {
        value: 0,
        children: [
          {value: 0},
          {value: 0}
        ]
      };
  tile(root, 0, 0, 4, 0);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 4.00, y0: 0.00, y1: 0.00},
    {x0: 0.00, x1: 4.00, y0: 0.00, y1: 0.00}
  ]);
  test.end();
});

tape("treemapSquarify(parent, x0, y0, x1, y1) handles a leading zero value", function(test) {
  var tile = d3_hierarchy.treemapSquarify,
      root = {
        value: 24,
        children: [
          {value: 0},
          {value: 6},
          {value: 6},
          {value: 4},
          {value: 3},
          {value: 2},
          {value: 2},
          {value: 1}
        ]
      };
  tile(root, 0, 0, 6, 4);
  test.deepEqual(root.children.map(round), [
    {x0: 0.00, x1: 3.00, y0: 0.00, y1: 0.00},
    {x0: 0.00, x1: 3.00, y0: 0.00, y1: 2.00},
    {x0: 0.00, x1: 3.00, y0: 2.00, y1: 4.00},
    {x0: 3.00, x1: 4.71, y0: 0.00, y1: 2.33},
    {x0: 4.71, x1: 6.00, y0: 0.00, y1: 2.33},
    {x0: 3.00, x1: 5.40, y0: 2.33, y1: 3.17},
    {x0: 3.00, x1: 5.40, y0: 3.17, y1: 4.00},
    {x0: 5.40, x1: 6.00, y0: 2.33, y1: 4.00}
  ]);
  test.end();
});
