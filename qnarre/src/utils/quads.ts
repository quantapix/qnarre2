/**
 * Leaf node of the quadtree.
 */
export interface QuadtreeLeaf<T> {
  /**
   * The data associated with this point, as passed to quadtree.add.
   */
  data: T;

  /**
   * The next datum in this leaf, if any.
   */
  next?: QuadtreeLeaf<T>;

  /**
   * The length property may be used to distinguish leaf nodes from internal nodes: it is undefined for leaf nodes, and 4 for internal nodes.
   */
  length?: undefined;
}

/**
 * Internal nodes of the quadtree are represented as four-element arrays in left-to-right, top-to-bottom order:
 *
 * 0 - the top-left quadrant, if any.
 * 1 - the top-right quadrant, if any.
 * 2 - the bottom-left quadrant, if any.
 * 3 - the bottom-right quadrant, if any.
 *
 * A child quadrant may be undefined if it is empty.
 */
export interface QuadtreeInternalNode<T>
  extends Array<QuadtreeInternalNode<T> | QuadtreeLeaf<T> | undefined> {
  /**
   * The length property may be used to distinguish leaf nodes from internal nodes: it is undefined for leaf nodes, and 4 for internal nodes.
   */
  length: 4;
}

export interface Quadtree<T> {
  /**
   * Returns the current x-accessor, which defaults to: `x(d) => d[0]`.
   */
  x(): (d: T) => number;
  /**
   * Sets the current x-coordinate accessor and returns the quadtree.
   * The x-accessors must be consistent, returning the same value given the same input.
   *
   * @param x The x-coordinate accessor.
   */
  x(x: (d: T) => number): this;

  /**
   * Returns the current y-accessor, which defaults to: `y(d) => d[1]`.
   */
  y(): (d: T) => number;
  /**
   * Sets the current y-coordinate accessor and returns the quadtree.
   * The y-accessors must be consistent, returning the same value given the same input.
   *
   * @param y The y-coordinate accessor.
   */
  y(y: (d: T) => number): this;

  /**
   * Returns the quadtree's current extent `[[x0, y0], [x1, y1]]`,
   * where `x0` and `y0` are the inclusive lower bounds and `x1` and `y1` are the inclusive upper bounds,
   * or `undefined` if the quadtree has no extent.
   */
  extent(): [[number, number], [number, number]] | undefined;
  /**
   * Expands the quadtree to cover the specified points `[[x0, y0], [x1, y1]]` and returns the quadtree.
   * The extent may also be expanded by calling `quadtree.cover` or `quadtree.add`.
   *
   * @param extend The specified points to cover.
   */
  extent(extend: [[number, number], [number, number]]): this;

  /**
   * Expands the quadtree to cover the specified point ⟨x,y⟩, and returns the quadtree.
   * * If the quadtree’s extent already covers the specified point, this method does nothing.
   * * If the quadtree has an extent, the extent is repeatedly doubled to cover the specified point, wrapping the root node as necessary.
   * * If the quadtree is empty, the extent is initialized to the extent `[[⌊x⌋, ⌊y⌋], [⌈x⌉, ⌈y⌉]]`.
   * Rounding is necessary such that if the extent is later doubled, the boundaries of existing quadrants do not change due to floating point error.
   *
   * @param x The x-coordinate for the specified point to cover.
   * @param y The y-coordinate for the specified point to cover.
   */
  cover(x: number, y: number): this;

  /**
   * Adds the specified datum to the quadtree, deriving its coordinates ⟨x,y⟩ using the current x- and y-accessors, and returns the quadtree.
   * If the new point is outside the current extent of the quadtree, the quadtree is automatically expanded to cover the new point.
   *
   * @param datum The specified datum to add.
   */
  add(datum: T): this;

  /**
   * Adds the specified array of data to the quadtree, deriving each element’s coordinates ⟨x,y⟩ using the current x- and y-accessors, and return this quadtree.
   * This is approximately equivalent to calling quadtree.add repeatedly.
   * However, this method results in a more compact quadtree because the extent of the data is computed first before adding the data.
   *
   * @param data The specified array of data to add.
   */
  addAll(data: T[]): this;

  /**
   * Removes the specified datum to the quadtree, deriving its coordinates ⟨x,y⟩ using the current x- and y-accessors, and returns the quadtree.
   * If the specified datum does not exist in this quadtree, this method does nothing.
   *
   * @param datum The specified datum to remove.
   */
  remove(datum: T): this;

  /**
   * Removes the specified data to the quadtree, deriving their coordinates ⟨x,y⟩ using the current x- and y-accessors, and returns the quadtree.
   * If a specified datum does not exist in this quadtree, it is ignored.
   *
   * @param data The specified array of data to remove.
   */
  removeAll(data: T[]): this;

  /**
   * Returns a copy of the quadtree. All nodes in the returned quadtree are identical copies of the corresponding node in the quadtree;
   * however, any data in the quadtree is shared by reference and not copied.
   */
  copy(): Quadtree<T>;

  /**
   * Returns the root node of the quadtree.
   */
  root(): QuadtreeInternalNode<T> | QuadtreeLeaf<T>;

  /**
   * Returns an array of all data in the quadtree.
   */
  data(): T[];

  /**
   * Returns the total number of data in the quadtree.
   */
  size(): number;

  /**
   * Returns the datum closest to the position ⟨x,y⟩ with the given search radius. If radius is not specified, it defaults to infinity.
   * If there is no datum within the search area, returns undefined.
   *
   * @param x The x-coordinate for the search position.
   * @param y The y-coordinate for the search position.
   * @param radius The optional search radius.
   */
  find(x: number, y: number, radius?: number): T | undefined;

  /**
   * Visits each node in the quadtree in pre-order traversal, invoking the specified callback with arguments `node`, `x0`, `y0`, `x1`, `y1` for each node,
   * where `node` is the node being visited, ⟨x0, y0⟩ are the lower bounds of the node, and ⟨x1, y1⟩ are the upper bounds, and returns the quadtree.
   *
   * If the callback returns true for a given node, then the children of that node are not visited; otherwise, all child nodes are visited.
   * This can be used to quickly visit only parts of the tree.
   * Note, however, that child quadrants are always visited in sibling order: top-left, top-right, bottom-left, bottom-right.
   * In cases such as search, visiting siblings in a specific order may be faster.
   *
   * @param callback The callback invoked for each node.
   */
  visit(
    callback: (
      node: QuadtreeInternalNode<T> | QuadtreeLeaf<T>,
      x0: number,
      y0: number,
      x1: number,
      y1: number
    ) => void | boolean
  ): this;

  /**
   * Visits each node in the quadtree in post-order traversal, invoking the specified callback with arguments `node`, `x0`, `y0`, `x1`, `y1` for each node,
   * where `node` is the node being visited, ⟨x0, y0⟩ are the lower bounds of the node, and ⟨x1, y1⟩ are the upper bounds, and returns the quadtree.
   *
   * @param callback The callback invoked for each node.
   */
  visitAfter(
    callback: (
      node: QuadtreeInternalNode<T> | QuadtreeLeaf<T>,
      x0: number,
      y0: number,
      x1: number,
      y1: number
    ) => void
  ): this;
}

/**
 * Creates a new, empty quadtree with an empty extent and the default x- and y-accessors.
 *
 * The generic refers to the data type. If omitted, the default setting assumes that,
 * the data used with the quadtree are two-element arrays.
 * The first element corresponds to the x-dimension, the second to the y-dimension.
 * When using another type, The x- and y-accessors must be specified.
 */
export function quadtree<T = [number, number]>(): Quadtree<T>;
/**
 * Creates a new quadtree with the specified array of data.
 * If `x` and `y` are also specified, sets the x- and y- accessors to the specified functions before adding the specified array of data to the quadtree, otherwise use the default x- and y-accessors.
 *
 * The generic refers to the data type. If omitted, the default setting assumes that,
 * the data used with the quadtree are two-element arrays.
 * The first element corresponds to the x-dimension, the second to the y-dimension.
 * When using another type, The x- and y-accessors must be specified.
 *
 * @param data The specified array of data to add.
 * @param x The x-coordinate accessor.
 * @param y The y-coordinate accessor.
 */
export function quadtree<T = [number, number]>(
  data: T[],
  x?: (d: T) => number,
  y?: (d: T) => number
): Quadtree<T>;

export default function(d) {
  var x = +this._x.call(null, d),
    y = +this._y.call(null, d);
  return add(this.cover(x, y), x, y, d);
}

function add(tree, x, y, d) {
  if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points

  var parent,
    node = tree._root,
    leaf = {data: d},
    x0 = tree._x0,
    y0 = tree._y0,
    x1 = tree._x1,
    y1 = tree._y1,
    xm,
    ym,
    xp,
    yp,
    right,
    bottom,
    i,
    j;

  // If the tree is empty, initialize the root as a leaf.
  if (!node) return (tree._root = leaf), tree;

  // Find the existing leaf for the new point, or add it.
  while (node.length) {
    if ((right = x >= (xm = (x0 + x1) / 2))) x0 = xm;
    else x1 = xm;
    if ((bottom = y >= (ym = (y0 + y1) / 2))) y0 = ym;
    else y1 = ym;
    if (((parent = node), !(node = node[(i = (bottom << 1) | right)])))
      return (parent[i] = leaf), tree;
  }

  // Is the new point is exactly coincident with the existing point?
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  if (x === xp && y === yp)
    return (
      (leaf.next = node),
      parent ? (parent[i] = leaf) : (tree._root = leaf),
      tree
    );

  // Otherwise, split the leaf node until the old and new point are separated.
  do {
    parent = parent ? (parent[i] = new Array(4)) : (tree._root = new Array(4));
    if ((right = x >= (xm = (x0 + x1) / 2))) x0 = xm;
    else x1 = xm;
    if ((bottom = y >= (ym = (y0 + y1) / 2))) y0 = ym;
    else y1 = ym;
  } while (
    (i = (bottom << 1) | right) === (j = ((yp >= ym) << 1) | (xp >= xm))
  );
  return (parent[j] = node), (parent[i] = leaf), tree;
}

export function addAll(data) {
  var d,
    i,
    n = data.length,
    x,
    y,
    xz = new Array(n),
    yz = new Array(n),
    x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;

  // Compute the points and their extent.
  for (i = 0; i < n; ++i) {
    if (
      isNaN((x = +this._x.call(null, (d = data[i])))) ||
      isNaN((y = +this._y.call(null, d)))
    )
      continue;
    xz[i] = x;
    yz[i] = y;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }

  // If there were no (valid) points, abort.
  if (x0 > x1 || y0 > y1) return this;

  // Expand the tree to cover the new points.
  this.cover(x0, y0).cover(x1, y1);

  // Add the new points.
  for (i = 0; i < n; ++i) {
    add(this, xz[i], yz[i], data[i]);
  }

  return this;
}
export default function(x, y) {
  if (isNaN((x = +x)) || isNaN((y = +y))) return this; // ignore invalid points

  var x0 = this._x0,
    y0 = this._y0,
    x1 = this._x1,
    y1 = this._y1;

  // If the quadtree has no extent, initialize them.
  // Integer extent are necessary so that if we later double the extent,
  // the existing quadrant boundaries don’t change due to floating point error!
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x)) + 1;
    y1 = (y0 = Math.floor(y)) + 1;
  }

  // Otherwise, double repeatedly to cover.
  else {
    var z = x1 - x0,
      node = this._root,
      parent,
      i;

    while (x0 > x || x >= x1 || y0 > y || y >= y1) {
      i = ((y < y0) << 1) | (x < x0);
      (parent = new Array(4)), (parent[i] = node), (node = parent), (z *= 2);
      switch (i) {
        case 0:
          (x1 = x0 + z), (y1 = y0 + z);
          break;
        case 1:
          (x0 = x1 - z), (y1 = y0 + z);
          break;
        case 2:
          (x1 = x0 + z), (y0 = y1 - z);
          break;
        case 3:
          (x0 = x1 - z), (y0 = y1 - z);
          break;
      }
    }

    if (this._root && this._root.length) this._root = node;
  }

  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  return this;
}
export default function() {
  var data = [];
  this.visit(function(node) {
    if (!node.length)
      do data.push(node.data);
      while ((node = node.next));
  });
  return data;
}
export default function(_) {
  return arguments.length
    ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
    : isNaN(this._x0)
    ? undefined
    : [
        [this._x0, this._y0],
        [this._x1, this._y1]
      ];
}
import Quad from './quad.js';

export default function(x, y, radius) {
  var data,
    x0 = this._x0,
    y0 = this._y0,
    x1,
    y1,
    x2,
    y2,
    x3 = this._x1,
    y3 = this._y1,
    quads = [],
    node = this._root,
    q,
    i;

  if (node) quads.push(new Quad(node, x0, y0, x3, y3));
  if (radius == null) radius = Infinity;
  else {
    (x0 = x - radius), (y0 = y - radius);
    (x3 = x + radius), (y3 = y + radius);
    radius *= radius;
  }

  while ((q = quads.pop())) {
    // Stop searching if this quadrant can’t contain a closer node.
    if (
      !(node = q.node) ||
      (x1 = q.x0) > x3 ||
      (y1 = q.y0) > y3 ||
      (x2 = q.x1) < x0 ||
      (y2 = q.y1) < y0
    )
      continue;

    // Bisect the current quadrant.
    if (node.length) {
      var xm = (x1 + x2) / 2,
        ym = (y1 + y2) / 2;

      quads.push(
        new Quad(node[3], xm, ym, x2, y2),
        new Quad(node[2], x1, ym, xm, y2),
        new Quad(node[1], xm, y1, x2, ym),
        new Quad(node[0], x1, y1, xm, ym)
      );

      // Visit the closest quadrant first.
      if ((i = ((y >= ym) << 1) | (x >= xm))) {
        q = quads[quads.length - 1];
        quads[quads.length - 1] = quads[quads.length - 1 - i];
        quads[quads.length - 1 - i] = q;
      }
    }

    // Visit this point. (Visiting coincident points isn’t necessary!)
    else {
      var dx = x - +this._x.call(null, node.data),
        dy = y - +this._y.call(null, node.data),
        d2 = dx * dx + dy * dy;
      if (d2 < radius) {
        var d = Math.sqrt((radius = d2));
        (x0 = x - d), (y0 = y - d);
        (x3 = x + d), (y3 = y + d);
        data = node.data;
      }
    }
  }

  return data;
}
export {default as quadtree} from './quadtree.js';
export default function(node, x0, y0, x1, y1) {
  this.node = node;
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
}
import tree_add, {addAll as tree_addAll} from './add.js';
import tree_cover from './cover.js';
import tree_data from './data.js';
import tree_extent from './extent.js';
import tree_find from './find.js';
import tree_remove, {removeAll as tree_removeAll} from './remove.js';
import tree_root from './root.js';
import tree_size from './size.js';
import tree_visit from './visit.js';
import tree_visitAfter from './visitAfter.js';
import tree_x, {defaultX} from './x.js';
import tree_y, {defaultY} from './y.js';

export default function quadtree(nodes, x, y) {
  var tree = new Quadtree(
    x == null ? defaultX : x,
    y == null ? defaultY : y,
    NaN,
    NaN,
    NaN,
    NaN
  );
  return nodes == null ? tree : tree.addAll(nodes);
}

function Quadtree(x, y, x0, y0, x1, y1) {
  this._x = x;
  this._y = y;
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  this._root = undefined;
}

function leaf_copy(leaf) {
  var copy = {data: leaf.data},
    next = copy;
  while ((leaf = leaf.next)) next = next.next = {data: leaf.data};
  return copy;
}

var treeProto = (quadtree.prototype = Quadtree.prototype);

treeProto.copy = function() {
  var copy = new Quadtree(
      this._x,
      this._y,
      this._x0,
      this._y0,
      this._x1,
      this._y1
    ),
    node = this._root,
    nodes,
    child;

  if (!node) return copy;

  if (!node.length) return (copy._root = leaf_copy(node)), copy;

  nodes = [{source: node, target: copy._root = new Array(4)}];
  while ((node = nodes.pop())) {
    for (var i = 0; i < 4; ++i) {
      if ((child = node.source[i])) {
        if (child.length)
          nodes.push({source: child, target: node.target[i] = new Array(4)});
        else node.target[i] = leaf_copy(child);
      }
    }
  }

  return copy;
};

treeProto.add = tree_add;
treeProto.addAll = tree_addAll;
treeProto.cover = tree_cover;
treeProto.data = tree_data;
treeProto.extent = tree_extent;
treeProto.find = tree_find;
treeProto.remove = tree_remove;
treeProto.removeAll = tree_removeAll;
treeProto.root = tree_root;
treeProto.size = tree_size;
treeProto.visit = tree_visit;
treeProto.visitAfter = tree_visitAfter;
treeProto.x = tree_x;
treeProto.y = tree_y;
export default function(d) {
  if (
    isNaN((x = +this._x.call(null, d))) ||
    isNaN((y = +this._y.call(null, d)))
  )
    return this; // ignore invalid points

  var parent,
    node = this._root,
    retainer,
    previous,
    next,
    x0 = this._x0,
    y0 = this._y0,
    x1 = this._x1,
    y1 = this._y1,
    x,
    y,
    xm,
    ym,
    right,
    bottom,
    i,
    j;

  // If the tree is empty, initialize the root as a leaf.
  if (!node) return this;

  // Find the leaf node for the point.
  // While descending, also retain the deepest parent with a non-removed sibling.
  if (node.length)
    while (true) {
      if ((right = x >= (xm = (x0 + x1) / 2))) x0 = xm;
      else x1 = xm;
      if ((bottom = y >= (ym = (y0 + y1) / 2))) y0 = ym;
      else y1 = ym;
      if (!((parent = node), (node = node[(i = (bottom << 1) | right)])))
        return this;
      if (!node.length) break;
      if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3])
        (retainer = parent), (j = i);
    }

  // Find the point to remove.
  while (node.data !== d)
    if (!((previous = node), (node = node.next))) return this;
  if ((next = node.next)) delete node.next;

  // If there are multiple coincident points, remove just the point.
  if (previous)
    return next ? (previous.next = next) : delete previous.next, this;

  // If this is the root point, remove it.
  if (!parent) return (this._root = next), this;

  // Remove this leaf.
  next ? (parent[i] = next) : delete parent[i];

  // If the parent now contains exactly one leaf, collapse superfluous parents.
  if (
    (node = parent[0] || parent[1] || parent[2] || parent[3]) &&
    node === (parent[3] || parent[2] || parent[1] || parent[0]) &&
    !node.length
  ) {
    if (retainer) retainer[j] = node;
    else this._root = node;
  }

  return this;
}

export function removeAll(data) {
  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
  return this;
}
export default function() {
  return this._root;
}
export default function() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length)
      do ++size;
      while ((node = node.next));
  });
  return size;
}
import Quad from './quad.js';

export default function(callback) {
  var quads = [],
    q,
    node = this._root,
    child,
    x0,
    y0,
    x1,
    y1;
  if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
  while ((q = quads.pop())) {
    if (
      !callback(
        (node = q.node),
        (x0 = q.x0),
        (y0 = q.y0),
        (x1 = q.x1),
        (y1 = q.y1)
      ) &&
      node.length
    ) {
      var xm = (x0 + x1) / 2,
        ym = (y0 + y1) / 2;
      if ((child = node[3])) quads.push(new Quad(child, xm, ym, x1, y1));
      if ((child = node[2])) quads.push(new Quad(child, x0, ym, xm, y1));
      if ((child = node[1])) quads.push(new Quad(child, xm, y0, x1, ym));
      if ((child = node[0])) quads.push(new Quad(child, x0, y0, xm, ym));
    }
  }
  return this;
}
import Quad from './quad.js';

export default function(callback) {
  var quads = [],
    next = [],
    q;
  if (this._root)
    quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
  while ((q = quads.pop())) {
    var node = q.node;
    if (node.length) {
      var child,
        x0 = q.x0,
        y0 = q.y0,
        x1 = q.x1,
        y1 = q.y1,
        xm = (x0 + x1) / 2,
        ym = (y0 + y1) / 2;
      if ((child = node[0])) quads.push(new Quad(child, x0, y0, xm, ym));
      if ((child = node[1])) quads.push(new Quad(child, xm, y0, x1, ym));
      if ((child = node[2])) quads.push(new Quad(child, x0, ym, xm, y1));
      if ((child = node[3])) quads.push(new Quad(child, xm, ym, x1, y1));
    }
    next.push(q);
  }
  while ((q = next.pop())) {
    callback(q.node, q.x0, q.y0, q.x1, q.y1);
  }
  return this;
}
export function defaultX(d) {
  return d[0];
}

export default function(_) {
  return arguments.length ? ((this._x = _), this) : this._x;
}
export function defaultY(d) {
  return d[1];
}

export default function(_) {
  return arguments.length ? ((this._y = _), this) : this._y;
}
