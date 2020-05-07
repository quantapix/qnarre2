var tape = require('tape'),
  d3_quadtree = require('..');

tape(
  'quadtree.add(datum) creates a new point and adds it to the quadtree',
  function(test) {
    var q = d3_quadtree.quadtree();
    test.deepEqual(q.add([0.0, 0.0]).root(), {data: [0, 0]});
    test.deepEqual(q.add([0.9, 0.9]).root(), [
      {data: [0, 0]},
      ,
      ,
      {data: [0.9, 0.9]}
    ]);
    test.deepEqual(q.add([0.9, 0.0]).root(), [
      {data: [0, 0]},
      {data: [0.9, 0]},
      ,
      {data: [0.9, 0.9]}
    ]);
    test.deepEqual(q.add([0.0, 0.9]).root(), [
      {data: [0, 0]},
      {data: [0.9, 0]},
      {data: [0, 0.9]},
      {data: [0.9, 0.9]}
    ]);
    test.deepEqual(q.add([0.4, 0.4]).root(), [
      [{data: [0, 0]}, , , {data: [0.4, 0.4]}],
      {data: [0.9, 0]},
      {data: [0, 0.9]},
      {data: [0.9, 0.9]}
    ]);
    test.end();
  }
);

tape(
  'quadtree.add(datum) handles points being on the perimeter of the quadtree bounds',
  function(test) {
    var q = d3_quadtree.quadtree().extent([
      [0, 0],
      [1, 1]
    ]);
    test.deepEqual(q.add([0, 0]).root(), {data: [0, 0]});
    test.deepEqual(q.add([1, 1]).root(), [{data: [0, 0]}, , , {data: [1, 1]}]);
    test.deepEqual(q.add([1, 0]).root(), [
      {data: [0, 0]},
      {data: [1, 0]},
      ,
      {data: [1, 1]}
    ]);
    test.deepEqual(q.add([0, 1]).root(), [
      {data: [0, 0]},
      {data: [1, 0]},
      {data: [0, 1]},
      {data: [1, 1]}
    ]);
    test.end();
  }
);

tape(
  'quadtree.add(datum) handles points being to the top of the quadtree bounds',
  function(test) {
    var q = d3_quadtree.quadtree().extent([
      [0, 0],
      [2, 2]
    ]);
    test.deepEqual(q.add([1, -1]).extent(), [
      [0, -4],
      [8, 4]
    ]);
    test.end();
  }
);

tape(
  'quadtree.add(datum) handles points being to the right of the quadtree bounds',
  function(test) {
    var q = d3_quadtree.quadtree().extent([
      [0, 0],
      [2, 2]
    ]);
    test.deepEqual(q.add([3, 1]).extent(), [
      [0, 0],
      [4, 4]
    ]);
    test.end();
  }
);

tape(
  'quadtree.add(datum) handles points being to the bottom of the quadtree bounds',
  function(test) {
    var q = d3_quadtree.quadtree().extent([
      [0, 0],
      [2, 2]
    ]);
    test.deepEqual(q.add([1, 3]).extent(), [
      [0, 0],
      [4, 4]
    ]);
    test.end();
  }
);

tape(
  'quadtree.add(datum) handles points being to the left of the quadtree bounds',
  function(test) {
    var q = d3_quadtree.quadtree().extent([
      [0, 0],
      [2, 2]
    ]);
    test.deepEqual(q.add([-1, 1]).extent(), [
      [-4, 0],
      [4, 8]
    ]);
    test.end();
  }
);

tape(
  'quadtree.add(datum) handles coincident points by creating a linked list',
  function(test) {
    var q = d3_quadtree.quadtree().extent([
      [0, 0],
      [1, 1]
    ]);
    test.deepEqual(q.add([0, 0]).root(), {data: [0, 0]});
    test.deepEqual(q.add([1, 0]).root(), [{data: [0, 0]}, {data: [1, 0]}, ,]);
    test.deepEqual(q.add([0, 1]).root(), [
      {data: [0, 0]},
      {data: [1, 0]},
      {data: [0, 1]}
    ]);
    test.deepEqual(q.add([0, 1]).root(), [
      {data: [0, 0]},
      {data: [1, 0]},
      {data: [0, 1], next: {data: [0, 1]}}
    ]);
    test.end();
  }
);

tape(
  'quadtree.add(datum) implicitly defines trivial bounds for the first point',
  function(test) {
    var q = d3_quadtree.quadtree().add([1, 2]);
    test.deepEqual(q.extent(), [
      [1, 2],
      [2, 3]
    ]);
    test.deepEqual(q.root(), {data: [1, 2]});
    test.end();
  }
);
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.addAll(data) creates new points and adds them to the quadtree", function(test) {
  var q = d3_quadtree.quadtree();
  test.deepEqual(q.add([0.0, 0.0]).root(), {data: [0, 0]});
  test.deepEqual(q.add([0.9, 0.9]).root(), [{data: [0, 0]},,, {data: [0.9, 0.9]}]);
  test.deepEqual(q.add([0.9, 0.0]).root(), [{data: [0, 0]}, {data: [0.9, 0]},, {data: [0.9, 0.9]}]);
  test.deepEqual(q.add([0.0, 0.9]).root(), [{data: [0, 0]}, {data: [0.9, 0]}, {data: [0, 0.9]}, {data: [0.9, 0.9]}]);
  test.deepEqual(q.add([0.4, 0.4]).root(), [[{data: [0, 0]},,, {data: [0.4, 0.4]}], {data: [0.9, 0]}, {data: [0, 0.9]}, {data: [0.9, 0.9]}]);
  test.end();
});

tape("quadtree.addAll(data) ignores points with NaN coordinates", function(test) {
  var q = d3_quadtree.quadtree();
  test.deepEqual(q.addAll([[NaN, 0], [0, NaN]]).root(), undefined);
  test.equal(q.extent(), undefined);
  test.deepEqual(q.addAll([[0, 0], [0.9, 0.9]]).root(), [{data: [0, 0]},,, {data: [0.9, 0.9]}]);
  test.deepEqual(q.addAll([[NaN, 0], [0, NaN]]).root(), [{data: [0, 0]},,, {data: [0.9, 0.9]}]);
  test.deepEqual(q.extent(), [[0, 0], [1, 1]]);
  test.end();
});

tape("quadtree.addAll(data) correctly handles the empty array", function(test) {
  var q = d3_quadtree.quadtree();
  test.deepEqual(q.addAll([]).root(), undefined);
  test.equal(q.extent(), undefined);
  test.deepEqual(q.addAll([[0, 0], [1, 1]]).root(), [{data: [0, 0]},,, {data: [1, 1]}]);
  test.deepEqual(q.addAll([]).root(), [{data: [0, 0]},,, {data: [1, 1]}]);
  test.deepEqual(q.extent(), [[0, 0], [2, 2]]);
  test.end();
});

tape("quadtree.addAll(data) computes the extent of the data before adding", function(test) {
  var q = d3_quadtree.quadtree().addAll([[0.4, 0.4], [0, 0], [0.9, 0.9]]);
  test.deepEqual(q.root(), [[{data: [0, 0]},,, {data: [0.4, 0.4]}],,, {data: [0.9, 0.9]}]);
  test.end();
});
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.copy() returns a copy of this quadtree", function(test) {
  var q0 = d3_quadtree.quadtree().addAll([[0, 0], [1, 0], [0, 1], [1, 1]]);
  test.deepEqual(q0.copy(), q0);
  test.end();
});

tape("quadtree.copy() isolates changes to the extent", function(test) {
  var q0 = d3_quadtree.quadtree().extent([[0, 0], [1, 1]]),
      q1 = q0.copy();
  q0.add([2, 2]);
  test.deepEqual(q1.extent(), [[0, 0], [2, 2]]);
  q1.add([-1, -1]);
  test.deepEqual(q0.extent(), [[0, 0], [4, 4]]);
  test.end();
});

tape("quadtree.copy() isolates changes to the root when a leaf", function(test) {
  var q0 = d3_quadtree.quadtree().extent([[0, 0], [1, 1]]),
      q1 = q0.copy(),
      p0 = [2, 2];
  q0.add(p0);
  test.equal(q1.root(), undefined);
  q1 = q0.copy();
  test.deepEqual(q0.root(), {data: [2, 2]});
  test.deepEqual(q1.root(), {data: [2, 2]});
  test.equal(q0.remove(p0), q0);
  test.equal(q0.root(), undefined);
  test.deepEqual(q1.root(), {data: [2, 2]});
  test.end();
});

tape("quadtree.copy() isolates changes to the root when not a leaf", function(test) {
  var p0 = [1, 1],
      p1 = [2, 2],
      p2 = [3, 3],
      q0 = d3_quadtree.quadtree().extent([[0, 0], [4, 4]]).addAll([p0, p1]),
      q1 = q0.copy();
  q0.add(p2);
  test.deepEqual(q0.extent(), [[0, 0], [8, 8]]);
  test.deepEqual(q0.root(), [[{data: [1, 1]},,, [{data: [2, 2]},,, {data: [3, 3]}]],,, ]);
  test.deepEqual(q1.extent(), [[0, 0], [8, 8]]);
  test.deepEqual(q1.root(), [[{data: [1, 1]},,, {data: [2, 2]}],,, ]);
  q1 = q0.copy();
  q0.remove(p2);
  test.deepEqual(q1.extent(), [[0, 0], [8, 8]]);
  test.deepEqual(q1.root(), [[{data: [1, 1]},,, [{data: [2, 2]},,, {data: [3, 3]}]],,, ]);
  test.end();
});
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.cover(x, y) sets a trivial extent if the extent was undefined", function(test) {
  test.deepEqual(d3_quadtree.quadtree().cover(1, 2).extent(), [[1, 2], [2, 3]]);
  test.end();
});

tape("quadtree.cover(x, y) sets a non-trivial squarified and centered extent if the extent was trivial", function(test) {
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(1, 2).extent(), [[0, 0], [4, 4]]);
  test.end();
});

tape("quadtree.cover(x, y) ignores invalid points", function(test) {
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(NaN, 2).extent(), [[0, 0], [1, 1]]);
  test.end();
});

tape("quadtree.cover(x, y) repeatedly doubles the existing extent if the extent was non-trivial", function(test) {
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(-1, -1).extent(), [[-4, -4], [4, 4]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(1, -1).extent(), [[0, -4], [8, 4]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(3, -1).extent(), [[0, -4], [8, 4]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(3, 1).extent(), [[0, 0], [4, 4]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(3, 3).extent(), [[0, 0], [4, 4]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(1, 3).extent(), [[0, 0], [4, 4]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(-1, 3).extent(), [[-4, 0], [4, 8]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(-1, 1).extent(), [[-4, 0], [4, 8]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(-3, -3).extent(), [[-4, -4], [4, 4]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(3, -3).extent(), [[0, -4], [8, 4]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(5, -3).extent(), [[0, -4], [8, 4]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(5, 3).extent(), [[0, 0], [8, 8]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(5, 5).extent(), [[0, 0], [8, 8]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(3, 5).extent(), [[0, 0], [8, 8]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(-3, 5).extent(), [[-4, 0], [4, 8]]);
  test.deepEqual(d3_quadtree.quadtree().cover(0, 0).cover(2, 2).cover(-3, 3).extent(), [[-4, 0], [4, 8]]);
  test.end();
});

tape("quadtree.cover(x, y) repeatedly wraps the root node if it has children", function(test) {
  var q = d3_quadtree.quadtree().add([0, 0]).add([2, 2]);
  test.deepEqual(q.root(), [{data: [0, 0]},,, {data: [2, 2]}]);
  test.deepEqual(q.copy().cover(3, 3).root(), [{data: [0, 0]},,, {data: [2, 2]}]);
  test.deepEqual(q.copy().cover(-1, 3).root(), [,[{data: [0, 0]},,, {data: [2, 2]}],, ]);
  test.deepEqual(q.copy().cover(3, -1).root(), [,, [{data: [0, 0]},,, {data: [2, 2]}], ]);
  test.deepEqual(q.copy().cover(-1, -1).root(), [,,, [{data: [0, 0]},,, {data: [2, 2]}]]);
  test.deepEqual(q.copy().cover(5, 5).root(), [[{data: [0, 0]},,, {data: [2, 2]}],,, ]);
  test.deepEqual(q.copy().cover(-3, 5).root(), [,[{data: [0, 0]},,, {data: [2, 2]}],, ]);
  test.deepEqual(q.copy().cover(5, -3).root(), [,, [{data: [0, 0]},,, {data: [2, 2]}], ]);
  test.deepEqual(q.copy().cover(-3, -3).root(), [,,, [{data: [0, 0]},,, {data: [2, 2]}]]);
  test.end();
});

tape("quadtree.cover(x, y) does not wrap the root node if it is a leaf", function(test) {
  var q = d3_quadtree.quadtree().cover(0, 0).add([2, 2]);
  test.deepEqual(q.root(), {data: [2, 2]});
  test.deepEqual(q.copy().cover(3, 3).root(), {data: [2, 2]});
  test.deepEqual(q.copy().cover(-1, 3).root(), {data: [2, 2]});
  test.deepEqual(q.copy().cover(3, -1).root(), {data: [2, 2]});
  test.deepEqual(q.copy().cover(-1, -1).root(), {data: [2, 2]});
  test.deepEqual(q.copy().cover(5, 5).root(), {data: [2, 2]});
  test.deepEqual(q.copy().cover(-3, 5).root(), {data: [2, 2]});
  test.deepEqual(q.copy().cover(5, -3).root(), {data: [2, 2]});
  test.deepEqual(q.copy().cover(-3, -3).root(), {data: [2, 2]});
  test.end();
});

tape("quadtree.cover(x, y) does not wrap the root node if it is undefined", function(test) {
  var q = d3_quadtree.quadtree().cover(0, 0).cover(2, 2);
  test.equal(q.root(), undefined);
  test.equal(q.copy().cover(3, 3).root(), undefined);
  test.equal(q.copy().cover(-1, 3).root(), undefined);
  test.equal(q.copy().cover(3, -1).root(), undefined);
  test.equal(q.copy().cover(-1, -1).root(), undefined);
  test.equal(q.copy().cover(5, 5).root(), undefined);
  test.equal(q.copy().cover(-3, 5).root(), undefined);
  test.equal(q.copy().cover(5, -3).root(), undefined);
  test.equal(q.copy().cover(-3, -3).root(), undefined);
  test.end();
});
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.data() returns an array of data in the quadtree", function(test) {
  var q = d3_quadtree.quadtree();
  test.deepEqual(q.data(), []);
  q.add([0, 0]).add([1, 2]);
  test.deepEqual(q.data(), [[0, 0], [1, 2]]);
  test.end();
});

tape("quadtree.data() correctly handles coincident nodes", function(test) {
  var q = d3_quadtree.quadtree();
  q.add([0, 0]).add([0, 0]);
  test.deepEqual(q.data(), [[0, 0], [0, 0]]);
  test.end();
});
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.extent(extent) extends the extent", function(test) {
  test.deepEqual(d3_quadtree.quadtree().extent([[0, 1], [2, 6]]).extent(), [[0, 1], [8, 9]]);
  test.end();
});

tape("quadtree.extent() can be inferred by quadtree.cover", function(test) {
  var q = d3_quadtree.quadtree();
  test.deepEqual(q.cover(0, 0).extent(), [[0, 0], [1, 1]]);
  test.deepEqual(q.cover(2, 4).extent(), [[0, 0], [8, 8]]);
  test.end();
});

tape("quadtree.extent() can be inferred by quadtree.add", function(test) {
  var q = d3_quadtree.quadtree();
  q.add([0, 0]);
  test.deepEqual(q.extent(), [[0, 0], [1, 1]]);
  q.add([2, 4]);
  test.deepEqual(q.extent(), [[0, 0], [8, 8]]);
  test.end();
});

tape("quadtree.extent(extent) squarifies and centers the specified extent", function(test) {
  test.deepEqual(d3_quadtree.quadtree().extent([[0, 1], [2, 6]]).extent(), [[0, 1], [8, 9]]);
  test.end();
});

tape("quadtree.extent(extent) ignores invalid extents", function(test) {
  test.equal(d3_quadtree.quadtree().extent([[1, NaN], [NaN, 0]]).extent(), undefined);
  test.equal(d3_quadtree.quadtree().extent([[NaN, 1], [0, NaN]]).extent(), undefined);
  test.equal(d3_quadtree.quadtree().extent([[NaN, NaN], [NaN, NaN]]).extent(), undefined);
  test.end();
});

tape("quadtree.extent(extent) flips inverted extents", function(test) {
  test.deepEqual(d3_quadtree.quadtree().extent([[1, 1], [0, 0]]).extent(), [[0, 0], [2, 2]]);
  test.end();
});

tape("quadtree.extent(extent) tolerates partially-valid extents", function(test) {
  test.deepEqual(d3_quadtree.quadtree().extent([[NaN, 0], [1, 1]]).extent(), [[1, 1], [2, 2]]);
  test.deepEqual(d3_quadtree.quadtree().extent([[0, NaN], [1, 1]]).extent(), [[1, 1], [2, 2]]);
  test.deepEqual(d3_quadtree.quadtree().extent([[0, 0], [NaN, 1]]).extent(), [[0, 0], [1, 1]]);
  test.deepEqual(d3_quadtree.quadtree().extent([[0, 0], [1, NaN]]).extent(), [[0, 0], [1, 1]]);
  test.end();
});

tape("quadtree.extent(extent) allows trivial extents", function(test) {
  test.deepEqual(d3_quadtree.quadtree().extent([[0, 0], [0, 0]]).extent(), [[0, 0], [1, 1]]);
  test.deepEqual(d3_quadtree.quadtree().extent([[1, 1], [1, 1]]).extent(), [[1, 1], [2, 2]]);
  test.end();
});
var tape = require("tape"),
    d3_array = require("d3-array"),
    d3_quadtree = require("../");

tape("quadtree.find(x, y) returns the closest point to the given [x, y]", function(test) {
  var dx = 17,
      dy = 17,
      q = d3_quadtree.quadtree();
  d3_array.range(dx * dy).forEach(function(i) { q.add([i % dx, i / dx | 0]); });
  test.deepEqual(q.find( 0.1,  0.1), [ 0,  0]);
  test.deepEqual(q.find( 7.1,  7.1), [ 7,  7]);
  test.deepEqual(q.find( 0.1, 15.9), [ 0, 16]);
  test.deepEqual(q.find(15.9, 15.9), [16, 16]);
  test.end();
});

tape("quadtree.find(x, y, radius) returns the closest point within the search radius to the given [x, y]", function(test) {
  var q = d3_quadtree.quadtree([[0, 0], [100, 0], [0, 100], [100, 100]]);
  test.deepEqual(q.find(20, 20, Infinity), [0, 0]);
  test.deepEqual(q.find(20, 20, 20 * Math.SQRT2 + 1e-6), [0, 0]);
  test.equal(q.find(20, 20, 20 * Math.SQRT2 - 1e-6), undefined);
  test.deepEqual(q.find(0, 20, 20 + 1e-6), [0, 0]);
  test.equal(q.find(0, 20, 20 - 1e-6), undefined);
  test.deepEqual(q.find(20, 0, 20 + 1e-6), [0, 0]);
  test.equal(q.find(20, 0, 20 - 1e-6), undefined);
  test.end();
});

tape("quadtree.find(x, y, null) treats the given radius as Infinity", function(test) {
  var q = d3_quadtree.quadtree([[0, 0], [100, 0], [0, 100], [100, 100]]);
  test.deepEqual(q.find(20, 20, null), [0, 0]);
  test.deepEqual(q.find(20, 20, undefined), [0, 0]);
  test.end();
});
var tape = require("tape"),
    d3_quadtree = require("../");

tape("d3.quadtree() creates an empty quadtree", function(test) {
  var q = d3_quadtree.quadtree();
  test.ok(q instanceof d3_quadtree.quadtree);
  test.equal(q.visit(function() { throw new Error; }), q);
  test.equal(q.size(), 0);
  test.equal(q.extent(), undefined);
  test.equal(q.root(), undefined);
  test.deepEqual(q.data(), []);
  test.end();
});

tape("d3.quadtree(nodes) is equivalent to d3.quadtree().addAll(nodes)", function(test) {
  var q = d3_quadtree.quadtree([[0, 0], [1, 1]]);
  test.ok(q instanceof d3_quadtree.quadtree);
  test.deepEqual(q.root(), [{data: [0, 0]},,, {data: [1, 1]}]);
  test.end();
});

tape("d3.quadtree(nodes, x, y) is equivalent to d3.quadtree().x(x).y(y).addAll(nodes)", function(test) {
  var q = d3_quadtree.quadtree([{x: 0, y: 0}, {x: 1, y: 1}], function(d) { return d.x; }, function(d) { return d.y; });
  test.ok(q instanceof d3_quadtree.quadtree);
  test.deepEqual(q.root(), [{data: {x: 0, y: 0}},,, {data: {x: 1, y: 1}}]);
  test.end();
});
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.remove(datum) removes a point and returns the quadtree", function(test) {
  var p0 = [1, 1],
      q = d3_quadtree.quadtree().add(p0);
  test.deepEqual(q.root(), {data: p0});
  test.equal(q.remove(p0), q);
  test.deepEqual(q.root(), undefined);
  test.end();
});

tape("quadtree.remove(datum) removes the only point in the quadtree", function(test) {
  var p0 = [1, 1],
      q = d3_quadtree.quadtree().add(p0);
  test.equal(q.remove(p0), q);
  test.deepEqual(q.extent(), [[1, 1], [2, 2]]);
  test.deepEqual(q.root(), undefined);
  test.deepEqual(p0, [1, 1]);
  test.end();
});

tape("quadtree.remove(datum) removes a first coincident point at the root in the quadtree", function(test) {
  var p0 = [1, 1],
      p1 = [1, 1],
      q = d3_quadtree.quadtree().addAll([p0, p1]);
  test.equal(q.remove(p0), q);
  test.deepEqual(q.extent(), [[1, 1], [2, 2]]);
  test.equal(q.root().data, p1);
  test.deepEqual(p0, [1, 1]);
  test.deepEqual(p1, [1, 1]);
  test.end();
});

tape("quadtree.remove(datum) removes another coincident point at the root in the quadtree", function(test) {
  var p0 = [1, 1],
      p1 = [1, 1],
      q = d3_quadtree.quadtree().addAll([p0, p1]);
  test.equal(q.remove(p1), q);
  test.deepEqual(q.extent(), [[1, 1], [2, 2]]);
  test.equal(q.root().data, p0);
  test.deepEqual(p0, [1, 1]);
  test.deepEqual(p1, [1, 1]);
  test.end();
});

tape("quadtree.remove(datum) removes a non-root point in the quadtree", function(test) {
  var p0 = [0, 0],
      p1 = [1, 1],
      q = d3_quadtree.quadtree().addAll([p0, p1]);
  test.equal(q.remove(p0), q);
  test.deepEqual(q.extent(), [[0, 0], [2, 2]]);
  test.equal(q.root().data, p1);
  test.deepEqual(p0, [0, 0]);
  test.deepEqual(p1, [1, 1]);
  test.end();
});

tape("quadtree.remove(datum) removes another non-root point in the quadtree", function(test) {
  var p0 = [0, 0],
      p1 = [1, 1],
      q = d3_quadtree.quadtree().addAll([p0, p1]);
  test.equal(q.remove(p1), q);
  test.deepEqual(q.extent(), [[0, 0], [2, 2]]);
  test.equal(q.root().data, p0);
  test.deepEqual(p0, [0, 0]);
  test.deepEqual(p1, [1, 1]);
  test.end();
});

tape("quadtree.remove(datum) ignores a point not in the quadtree", function(test) {
  var p0 = [0, 0],
      p1 = [1, 1],
      q0 = d3_quadtree.quadtree().add(p0),
      q1 = d3_quadtree.quadtree().add(p1);
  test.equal(q0.remove(p1), q0);
  test.deepEqual(q0.extent(), [[0, 0], [1, 1]]);
  test.equal(q0.root().data, p0);
  test.equal(q1.root().data, p1);
  test.end();
});

tape("quadtree.remove(datum) ignores a coincident point not in the quadtree", function(test) {
  var p0 = [0, 0],
      p1 = [0, 0],
      q0 = d3_quadtree.quadtree().add(p0),
      q1 = d3_quadtree.quadtree().add(p1);
  test.equal(q0.remove(p1), q0);
  test.deepEqual(q0.extent(), [[0, 0], [1, 1]]);
  test.equal(q0.root().data, p0);
  test.equal(q1.root().data, p1);
  test.end();
});

tape("quadtree.remove(datum) removes another point in the quadtree", function(test) {
  var q = d3_quadtree.quadtree()
      .extent([[0, 0], [959, 959]])
      .addAll([[630, 438], [715, 464], [523, 519], [646, 318], [434, 620], [570, 489], [520, 345], [459, 443], [346, 405], [529, 444]]);
  test.equal(q.remove(q.find(546, 440)), q);
  test.deepEqual(q.extent(), [[0, 0], [1024, 1024]]);
  test.deepEqual(q.root(), [
    [
      ,
      ,
      ,
      [
        ,
        ,
        {data: [346, 405]},
        {data: [459, 443]}
      ]
    ],
    [
      ,
      ,
      [
        {data: [520, 345]},
        {data: [646, 318]},
        [
          ,
          {data: [630, 438]},
          {data: [570, 489]},

        ],
        {data: [715, 464]}
      ],
    ],
    {data: [434, 620]},
    {data: [523, 519]}
  ]);
  test.end();
});
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.size() returns the number of points in the quadtree", function(test) {
  var q = d3_quadtree.quadtree();
  test.equal(q.size(), 0);
  q.add([0, 0]).add([1, 2]);
  test.equal(q.size(), 2);
  test.end();
});

tape("quadtree.size() correctly counts coincident nodes", function(test) {
  var q = d3_quadtree.quadtree();
  q.add([0, 0]).add([0, 0]);
  test.equal(q.size(), 2);
  test.end();
});
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.visit(callback) visits each node in a quadtree", function(test) {
  var results = [], q = d3_quadtree.quadtree()
      .addAll([[0, 0], [1, 0], [0, 1], [1, 1]]);
  test.equal(q.visit(function(node, x0, y0, x1, y1) { results.push([x0, y0, x1, y1]); }), q);
  test.deepEqual(results, [
    [0, 0, 2, 2],
    [0, 0, 1, 1],
    [1, 0, 2, 1],
    [0, 1, 1, 2],
    [1, 1, 2, 2]
  ]);
  test.end();
});

tape("quadtree.visit(callback) applies pre-order traversal", function(test) {
  var results = [], q = d3_quadtree.quadtree()
      .extent([[0, 0], [960, 960]])
      .addAll([[100, 100], [200, 200], [300, 300]]);
  test.equal(q.visit(function(node, x0, y0, x1, y1) { results.push([x0, y0, x1, y1]); }), q);
  test.deepEqual(results, [
    [  0,   0, 1024, 1024],
    [  0,   0, 512, 512],
    [  0,   0, 256, 256],
    [  0,   0, 128, 128],
    [128, 128, 256, 256],
    [256, 256, 512, 512]
  ]);
  test.end();
});

tape("quadtree.visit(callback) does not recurse if the callback returns truthy", function(test) {
  var results = [], q = d3_quadtree.quadtree()
      .extent([[0, 0], [960, 960]])
      .addAll([[100, 100], [700, 700], [800, 800]]);
  test.equal(q.visit(function(node, x0, y0, x1, y1) { results.push([x0, y0, x1, y1]); return x0 > 0; }), q);
  test.deepEqual(results, [
    [  0,   0, 1024, 1024],
    [  0,   0, 512, 512],
    [512, 512, 1024, 1024]
  ]);
  test.end();
});

tape("quadtree.visit(callback) on an empty quadtree with no bounds does nothing", function(test) {
  var results = [], q = d3_quadtree.quadtree();
  test.equal(q.visit(function(node, x0, y0, x1, y1) { results.push([x0, y0, x1, y1]); }), q);
  test.equal(results.length, 0);
  test.end();
});

tape("quadtree.visit(callback) on an empty quadtree with bounds does nothing", function(test) {
  var results = [], q = d3_quadtree.quadtree()
      .extent([[0, 0], [960, 960]]);
  test.equal(q.visit(function(node, x0, y0, x1, y1) { results.push([x0, y0, x1, y1]); }), q);
  test.deepEqual(results.length, 0);
  test.end();
});
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.x(x) sets the x-accessor used by quadtree.add", function(test) {
  var q = d3_quadtree.quadtree().x(x).add({x: 1, 1: 2});
  test.deepEqual(q.extent(), [[1, 2], [2, 3]]);
  test.deepEqual(q.root(), {data: {x: 1, 1: 2}});
  test.end();
});

tape("quadtree.x(x) sets the x-accessor used by quadtree.addAll", function(test) {
  var q = d3_quadtree.quadtree().x(x).addAll([{x: 1, 1: 2}]);
  test.deepEqual(q.extent(), [[1, 2], [2, 3]]);
  test.deepEqual(q.root(), {data: {x: 1, 1: 2}});
  test.end();
});

tape("quadtree.x(x) sets the x-accessor used by quadtree.remove", function(test) {
  var p0 = {x: 0, 1: 1},
      p1 = {x: 1, 1: 2},
      q = d3_quadtree.quadtree().x(x);
  test.deepEqual(q.add(p0).root(), {data: {x: 0, 1: 1}});
  test.deepEqual(q.add(p1).root(), [{data: {x: 0, 1: 1}},,, {data: {x: 1, 1: 2}}]);
  test.deepEqual(q.remove(p1).root(), {data: {x: 0, 1: 1}});
  test.equal(q.remove(p0).root(), undefined);
  test.end();
});

function x(d) {
  return d.x;
}
var tape = require("tape"),
    d3_quadtree = require("../");

tape("quadtree.y(y) sets the y-accessor used by quadtree.add", function(test) {
  var q = d3_quadtree.quadtree().y(y).add({0: 1, y: 2});
  test.deepEqual(q.extent(), [[1, 2], [2, 3]]);
  test.deepEqual(q.root(), {data: {0: 1, y: 2}});
  test.end();
});

tape("quadtree.y(y) sets the y-accessor used by quadtree.addAll", function(test) {
  var q = d3_quadtree.quadtree().y(y).addAll([{0: 1, y: 2}]);
  test.deepEqual(q.extent(), [[1, 2], [2, 3]]);
  test.deepEqual(q.root(), {data: {0: 1, y: 2}});
  test.end();
});

tape("quadtree.y(y) sets the y-accessor used by quadtree.remove", function(test) {
  var p0 = {0: 0, y: 1},
      p1 = {0: 1, y: 2},
      q = d3_quadtree.quadtree().y(y);
  test.deepEqual(q.add(p0).root(), {data: {0: 0, y: 1}});
  test.deepEqual(q.add(p1).root(), [{data: {0: 0, y: 1}},,, {data: {0: 1, y: 2}}]);
  test.deepEqual(q.remove(p1).root(), {data: {0: 0, y: 1}});
  test.equal(q.remove(p0).root(), undefined);
  test.end();
});

function y(d) {
  return d.y;
}
