export interface HierarchyLink<Datum> {
  /**
   * The source of the link.
   */
  source: HierarchyNode<Datum>;

  /**
   * The target of the link.
   */
  target: HierarchyNode<Datum>;
}

export interface HierarchyNode<Datum> {
  /**
   * The associated data, as specified to the constructor.
   */
  data: Datum;

  /**
   * Zero for the root node, and increasing by one for each descendant generation.
   */
  readonly depth: number;

  /**
   * Zero for leaf nodes, and the greatest distance from any descendant leaf for internal nodes.
   */
  readonly height: number;

  /**
   * The parent node, or null for the root node.
   */
  parent: this | null;

  /**
   * An array of child nodes, if any; undefined for leaf nodes.
   */
  children?: this[];

  /**
   * Aggregated numeric value as calculated by `sum(value)` or `count()`, if previously invoked.
   */
  readonly value?: number;

  /**
   * Optional node id string set by `StratifyOperator`, if hierarchical data was created from tabular data using stratify().
   */
  readonly id?: string;

  /**
   * Returns the array of ancestors nodes, starting with this node, then followed by each parent up to the root.
   */
  ancestors(): this[];

  /**
   * Returns the array of descendant nodes, starting with this node, then followed by each child in topological order.
   */
  descendants(): this[];

  /**
   * Returns the array of leaf nodes in traversal order; leaves are nodes with no children.
   */
  leaves(): this[];

  /**
   * Returns the shortest path through the hierarchy from this node to the specified target node.
   * The path starts at this node, ascends to the least common ancestor of this node and the target node, and then descends to the target node.
   *
   * @param target The target node.
   */
  path(target: this): this[];

  /**
   * Returns an array of links for this node, where each link is an object that defines source and target properties.
   * The source of each link is the parent node, and the target is a child node.
   */
  links(): Array<HierarchyLink<Datum>>;

  /**
   * Evaluates the specified value function for this node and each descendant in post-order traversal, and returns this node.
   * The `node.value` property of each node is set to the numeric value returned by the specified function plus the combined value of all descendants.
   *
   * @param value The value function is passed the node’s data, and must return a non-negative number.
   */
  sum(value: (d: Datum) => number): this;

  /**
   * Computes the number of leaves under this node and assigns it to `node.value`, and similarly for every descendant of node.
   * If this node is a leaf, its count is one. Returns this node.
   */
  count(): this;

  /**
   * Sorts the children of this node, if any, and each of this node’s descendants’ children,
   * in pre-order traversal using the specified compare function, and returns this node.
   *
   * @param compare The compare function is passed two nodes a and b to compare.
   * If a should be before b, the function must return a value less than zero;
   * if b should be before a, the function must return a value greater than zero;
   * otherwise, the relative order of a and b are not specified. See `array.sort` for more.
   */
  sort(compare: (a: this, b: this) => number): this;

  /**
   * Invokes the specified function for node and each descendant in breadth-first order,
   * such that a given node is only visited if all nodes of lesser depth have already been visited,
   * as well as all preceding nodes of the same depth.
   *
   * @param func The specified function is passed the current node.
   */
  each(func: (node: this) => void): this;

  /**
   * Invokes the specified function for node and each descendant in post-order traversal,
   * such that a given node is only visited after all of its descendants have already been visited.
   *
   * @param func The specified function is passed the current node.
   */
  eachAfter(func: (node: this) => void): this;

  /**
   * Invokes the specified function for node and each descendant in pre-order traversal,
   * such that a given node is only visited after all of its ancestors have already been visited.
   *
   * @param func The specified function is passed the current node.
   */
  eachBefore(func: (node: this) => void): this;

  /**
   * Return a deep copy of the subtree starting at this node. The returned deep copy shares the same data, however.
   * The returned node is the root of a new tree; the returned node’s parent is always null and its depth is always zero.
   */
  copy(): this;
}

/**
 * Constructs a root node from the specified hierarchical data.
 *
 * @param data The root specified data.
 * @param children The specified children accessor function invoked for each datum, starting with the root data.
 * Must return an array of data representing the children, and return null or undefined if the current datum has no children.
 * If children is not specified, it defaults to: `(d) => d.children`.
 */
export function hierarchy<Datum>(
  data: Datum,
  children?: (d: Datum) => Datum[] | null | undefined
): HierarchyNode<Datum>;

// -----------------------------------------------------------------------
// Stratify
// -----------------------------------------------------------------------

export interface StratifyOperator<Datum> {
  /**
   * Generates a new hierarchy from the specified tabular data. Each node in the returned object has a shallow copy of the properties
   * from the corresponding data object, excluding the following reserved properties: id, parentId, children.
   *
   * @param data The root specified data.
   * @throws Error on missing id, ambiguous id, cycle, multiple roots or no root.
   */
  (data: Datum[]): HierarchyNode<Datum>;

  /**
   * Returns the current id accessor, which defaults to: `(d) => d.id`.
   */
  id(): (d: Datum, i: number, data: Datum[]) => string | null | '' | undefined;
  /**
   * Sets the id accessor to the given function.
   * The id accessor is invoked for each element in the input data passed to the stratify operator.
   * The returned string is then used to identify the node's relationships in conjunction with the parent id.
   * For leaf nodes, the id may be undefined, null or the empty string; otherwise, the id must be unique.
   *
   * @param id The id accessor.
   */
  id(
    id: (d: Datum, i: number, data: Datum[]) => string | null | '' | undefined
  ): this;

  /**
   * Returns the current parent id accessor, which defaults to: `(d) => d.parentId`.
   */
  parentId(): (
    d: Datum,
    i: number,
    data: Datum[]
  ) => string | null | '' | undefined;
  /**
   * Sets the parent id accessor to the given function.
   * The parent id accessor is invoked for each element in the input data passed to the stratify operator.
   * The returned string is then used to identify the node's relationships in conjunction with the id.
   * For the root node, the parent id should be undefined, null or the empty string.
   * There must be exactly one root node in the input data, and no circular relationships.
   *
   * @param parentId The parent id accessor.
   */
  parentId(
    parentId: (
      d: Datum,
      i: number,
      data: Datum[]
    ) => string | null | '' | undefined
  ): this;
}

/**
 * Constructs a new stratify operator with the default settings.
 */
export function stratify<Datum>(): StratifyOperator<Datum>;

// -----------------------------------------------------------------------
// Cluster
// -----------------------------------------------------------------------

export interface HierarchyPointLink<Datum> {
  /**
   * The source of the link.
   */
  source: HierarchyPointNode<Datum>;

  /**
   * The target of the link.
   */
  target: HierarchyPointNode<Datum>;
}

export interface HierarchyPointNode<Datum> extends HierarchyNode<Datum> {
  /**
   * The x-coordinate of the node.
   */
  x: number;

  /**
   * The y-coordinate of the node.
   */
  y: number;

  /**
   * Returns an array of links for this node, where each link is an object that defines source and target properties.
   * The source of each link is the parent node, and the target is a child node.
   */
  links(): Array<HierarchyPointLink<Datum>>;
}

export interface ClusterLayout<Datum> {
  /**
   * Lays out the specified root hierarchy.
   * You may want to call `root.sort` before passing the hierarchy to the cluster layout.
   *
   * @param root The specified root hierarchy.
   */
  (root: HierarchyNode<Datum>): HierarchyPointNode<Datum>;

  /**
   * Returns the current layout size, which defaults to [1, 1]. A layout size of null indicates that a node size will be used instead.
   */
  size(): [number, number] | null;
  /**
   * Sets this cluster layout’s size to the specified [width, height] array and returns the cluster layout.
   * The size represent an arbitrary coordinate system; for example, to produce a radial layout,
   * a size of [360, radius] corresponds to a breadth of 360° and a depth of radius.
   *
   * @param size The specified two-element size array.
   */
  size(size: [number, number]): this;

  /**
   * Returns the current node size, which defaults to null. A node size of null indicates that a layout size will be used instead.
   */
  nodeSize(): [number, number] | null;
  /**
   * Sets this cluster layout’s node size to the specified [width, height] array and returns this cluster layout.
   * When a node size is specified, the root node is always positioned at <0, 0>.
   *
   * @param size The specified two-element size array.
   */
  nodeSize(size: [number, number]): this;

  /**
   * Returns the current separation accessor, which defaults to: `(a, b) => a.parent == b.parent ? 1 : 2`.
   */
  separation(): (
    a: HierarchyPointNode<Datum>,
    b: HierarchyPointNode<Datum>
  ) => number;
  /**
   * Sets the separation accessor to the specified function and returns this cluster layout.
   * The separation accessor is used to separate neighboring leaves.
   *
   * @param separation The separation function is passed two leaves a and b, and must return the desired separation.
   * The nodes are typically siblings, though the nodes may be more distantly related if the layout decides to place such nodes adjacent.
   */
  separation(
    separation: (
      a: HierarchyPointNode<Datum>,
      b: HierarchyPointNode<Datum>
    ) => number
  ): this;
}

/**
 * Creates a new cluster layout with default settings.
 */
export function cluster<Datum>(): ClusterLayout<Datum>;

// -----------------------------------------------------------------------
// Tree
// -----------------------------------------------------------------------

export interface TreeLayout<Datum> {
  /**
   * Lays out the specified root hierarchy.
   * You may want to call `root.sort` before passing the hierarchy to the tree layout.
   *
   * @param root The specified root hierarchy.
   */
  (root: HierarchyNode<Datum>): HierarchyPointNode<Datum>;

  /**
   * Returns the current layout size, which defaults to [1, 1]. A layout size of null indicates that a node size will be used instead.
   */
  size(): [number, number] | null;
  /**
   * Sets this tree layout’s size to the specified [width, height] array and returns the tree layout.
   * The size represent an arbitrary coordinate system; for example, to produce a radial layout,
   * a size of [360, radius] corresponds to a breadth of 360° and a depth of radius.
   *
   * @param size The specified two-element size array.
   */
  size(size: [number, number]): this;

  /**
   * Returns the current node size, which defaults to null. A node size of null indicates that a layout size will be used instead.
   */
  nodeSize(): [number, number] | null;
  /**
   * Sets this tree layout’s node size to the specified [width, height] array and returns this tree layout.
   * When a node size is specified, the root node is always positioned at <0, 0>.
   *
   * @param size The specified two-element size array.
   */
  nodeSize(size: [number, number]): this;

  /**
   * Returns the current separation accessor, which defaults to: `(a, b) => a.parent == b.parent ? 1 : 2`.
   */
  separation(): (
    a: HierarchyPointNode<Datum>,
    b: HierarchyPointNode<Datum>
  ) => number;
  /**
   * Sets the separation accessor to the specified function and returns this tree layout.
   * The separation accessor is used to separate neighboring nodes.
   *
   * @param separation The separation function is passed two nodes a and b, and must return the desired separation.
   * The nodes are typically siblings, though the nodes may be more distantly related if the layout decides to place such nodes adjacent.
   */
  separation(
    separation: (
      a: HierarchyPointNode<Datum>,
      b: HierarchyPointNode<Datum>
    ) => number
  ): this;
}

/**
 * Creates a new tree layout with default settings.
 */
export function tree<Datum>(): TreeLayout<Datum>;

// -----------------------------------------------------------------------
// Treemap
// -----------------------------------------------------------------------

export interface HierarchyRectangularLink<Datum> {
  /**
   * The source of the link.
   */
  source: HierarchyRectangularNode<Datum>;

  /**
   * The target of the link.
   */
  target: HierarchyRectangularNode<Datum>;
}

export interface HierarchyRectangularNode<Datum> extends HierarchyNode<Datum> {
  /**
   * The left edge of the rectangle.
   */
  x0: number;

  /**
   * The top edge of the rectangle
   */
  y0: number;

  /**
   * The right edge of the rectangle.
   */
  x1: number;

  /**
   * The bottom edge of the rectangle.
   */
  y1: number;

  /**
   * Returns an array of links for this node, where each link is an object that defines source and target properties.
   * The source of each link is the parent node, and the target is a child node.
   */
  links(): Array<HierarchyRectangularLink<Datum>>;
}

export interface TreemapLayout<Datum> {
  /**
   * Lays out the specified root hierarchy.
   * You must call `root.sum` before passing the hierarchy to the treemap layout.
   * You probably also want to call `root.sort` to order the hierarchy before computing the layout.
   *
   * @param root The specified root hierarchy.
   */
  (root: HierarchyNode<Datum>): HierarchyRectangularNode<Datum>;

  /**
   * Returns the current tiling method, which defaults to `d3.treemapSquarify` with the golden ratio.
   */
  tile(): (
    node: HierarchyRectangularNode<Datum>,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) => void;
  /**
   * Sets the tiling method to the specified function and returns this treemap layout.
   *
   * @param tile The specified tiling function.
   */
  tile(
    tile: (
      node: HierarchyRectangularNode<Datum>,
      x0: number,
      y0: number,
      x1: number,
      y1: number
    ) => void
  ): this;

  /**
   * Returns the current size, which defaults to [1, 1].
   */
  size(): [number, number];
  /**
   * Sets this treemap layout’s size to the specified [width, height] array and returns this treemap layout.
   *
   * @param size The specified two-element size array.
   */
  size(size: [number, number]): this;

  /**
   * Returns the current rounding state, which defaults to false.
   */
  round(): boolean;
  /**
   * Enables or disables rounding according to the given boolean and returns this treemap layout.
   *
   * @param round The specified boolean flag.
   */
  round(round: boolean): this;

  /**
   * Returns the current inner padding function.
   */
  padding(): (node: HierarchyRectangularNode<Datum>) => number;
  /**
   * Sets the inner and outer padding to the specified number and returns this treemap layout.
   *
   * @param padding The specified padding value.
   */
  padding(padding: number): this;
  /**
   * Sets the inner and outer padding to the specified function and returns this treemap layout.
   *
   * @param padding The specified padding function.
   */
  padding(padding: (node: HierarchyRectangularNode<Datum>) => number): this;

  /**
   * Returns the current inner padding function, which defaults to the constant zero.
   */
  paddingInner(): (node: HierarchyRectangularNode<Datum>) => number;
  /**
   * Sets the inner padding to the specified number and returns this treemap layout.
   * The inner padding is used to separate a node’s adjacent children.
   *
   * @param padding The specified inner padding value.
   */
  paddingInner(padding: number): this;
  /**
   * Sets the inner padding to the specified function and returns this treemap layout.
   * The function is invoked for each node with children, being passed the current node.
   * The inner padding is used to separate a node’s adjacent children.
   *
   * @param padding The specified inner padding function.
   */
  paddingInner(
    padding: (node: HierarchyRectangularNode<Datum>) => number
  ): this;

  /**
   * Returns the current top padding function.
   */
  paddingOuter(): (node: HierarchyRectangularNode<Datum>) => number;
  /**
   * Sets the top, right, bottom and left padding to the specified function and returns this treemap layout.
   *
   * @param padding The specified padding outer value.
   */
  paddingOuter(padding: number): this;
  /**
   * Sets the top, right, bottom and left padding to the specified function and returns this treemap layout.
   *
   * @param padding The specified padding outer function.
   */
  paddingOuter(
    padding: (node: HierarchyRectangularNode<Datum>) => number
  ): this;

  /**
   * Returns the current top padding function, which defaults to the constant zero.
   */
  paddingTop(): (node: HierarchyRectangularNode<Datum>) => number;
  /**
   * Sets the top padding to the specified number and returns this treemap layout.
   * The top padding is used to separate the top edge of a node from its children.
   *
   * @param padding The specified top padding value.
   */
  paddingTop(padding: number): this;
  /**
   * Sets the top padding to the specified function and returns this treemap layout.
   * The function is invoked for each node with children, being passed the current node.
   * The top padding is used to separate the top edge of a node from its children.
   *
   * @param padding The specified top padding function.
   */
  paddingTop(padding: (node: HierarchyRectangularNode<Datum>) => number): this;

  /**
   * Returns the current right padding function, which defaults to the constant zero.
   */
  paddingRight(): (node: HierarchyRectangularNode<Datum>) => number;
  /**
   * Sets the right padding to the specified number and returns this treemap layout.
   * The right padding is used to separate the right edge of a node from its children.
   *
   * @param padding The specified right padding value.
   */
  paddingRight(padding: number): this;
  /**
   * Sets the right padding to the specified function and returns this treemap layout.
   * The function is invoked for each node with children, being passed the current node.
   * The right padding is used to separate the right edge of a node from its children.
   *
   * @param padding The specified right padding function.
   */
  paddingRight(
    padding: (node: HierarchyRectangularNode<Datum>) => number
  ): this;

  /**
   * Returns the current bottom padding function, which defaults to the constant zero.
   */
  paddingBottom(): (node: HierarchyRectangularNode<Datum>) => number;
  /**
   * Sets the bottom padding to the specified number and returns this treemap layout.
   * The bottom padding is used to separate the bottom edge of a node from its children.
   *
   * @param padding The specified bottom padding value.
   */
  paddingBottom(padding: number): this;
  /**
   * Sets the bottom padding to the specified function and returns this treemap layout.
   * The function is invoked for each node with children, being passed the current node.
   * The bottom padding is used to separate the bottom edge of a node from its children.
   *
   * @param padding The specified bottom padding function.
   */
  paddingBottom(
    padding: (node: HierarchyRectangularNode<Datum>) => number
  ): this;

  /**
   * Returns the current left padding function, which defaults to the constant zero.
   */
  paddingLeft(): (node: HierarchyRectangularNode<Datum>) => number;
  /**
   * Sets the left padding to the specified number and returns this treemap layout.
   * The left padding is used to separate the left edge of a node from its children.
   *
   * @param padding The specified left padding value.
   */
  paddingLeft(padding: number): this;
  /**
   * Sets the left padding to the specified function and returns this treemap layout.
   * The function is invoked for each node with children, being passed the current node.
   * The left padding is used to separate the left edge of a node from its children.
   *
   * @param padding The specified left padding function.
   */
  paddingLeft(padding: (node: HierarchyRectangularNode<Datum>) => number): this;
}

/**
 * Creates a new treemap layout with default settings.
 */
export function treemap<Datum>(): TreemapLayout<Datum>;

// Tiling functions ------------------------------------------------------

/**
 * Recursively partitions the specified nodes into an approximately-balanced binary tree,
 * choosing horizontal partitioning for wide rectangles and vertical partitioning for tall rectangles.
 */
export function treemapBinary(
  node: HierarchyRectangularNode<any>,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): void;

/**
 * Divides the rectangular area specified by x0, y0, x1, y1 horizontally according the value of each of the specified node’s children.
 * The children are positioned in order, starting with the left edge (x0) of the given rectangle.
 * If the sum of the children’s values is less than the specified node’s value (i.e., if the specified node has a non-zero internal value),
 * the remaining empty space will be positioned on the right edge (x1) of the given rectangle.
 */
export function treemapDice(
  node: HierarchyRectangularNode<any>,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): void;

/**
 * Divides the rectangular area specified by x0, y0, x1, y1 vertically according the value of each of the specified node’s children.
 * The children are positioned in order, starting with the top edge (y0) of the given rectangle.
 * If the sum of the children’s values is less than the specified node’s value (i.e., if the specified node has a non-zero internal value),
 * the remaining empty space will be positioned on the bottom edge (y1) of the given rectangle.
 */
export function treemapSlice(
  node: HierarchyRectangularNode<any>,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): void;

/**
 * If the specified node has odd depth, delegates to treemapSlice; otherwise delegates to treemapDice.
 */
export function treemapSliceDice(
  node: HierarchyRectangularNode<any>,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): void;

// TODO: Test Factory code
export interface RatioSquarifyTilingFactory {
  (
    node: HierarchyRectangularNode<any>,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): void;

  /**
   * Specifies the desired aspect ratio of the generated rectangles.
   * Note that the orientation of the generated rectangles (tall or wide) is not implied by the ratio.
   * Furthermore, the rectangles ratio are not guaranteed to have the exact specified aspect ratio.
   * If not specified, the aspect ratio defaults to the golden ratio, φ = (1 + sqrt(5)) / 2, per Kong et al.
   *
   * @param ratio The specified ratio value greater than or equal to one.
   */
  ratio(ratio: number): RatioSquarifyTilingFactory;
}

/**
 * Implements the squarified treemap algorithm by Bruls et al., which seeks to produce rectangles of a given aspect ratio.
 */
export const treemapSquarify: RatioSquarifyTilingFactory;

/**
 * Like `d3.treemapSquarify`, except preserves the topology (node adjacencies) of the previous layout computed by `d3.treemapResquarify`,
 * if there is one and it used the same target aspect ratio. This tiling method is good for animating changes to treemaps because
 * it only changes node sizes and not their relative positions, thus avoiding distracting shuffling and occlusion.
 * The downside of a stable update, however, is a suboptimal layout for subsequent updates: only the first layout uses the Bruls et al. squarified algorithm.
 */
export const treemapResquarify: RatioSquarifyTilingFactory;

// -----------------------------------------------------------------------
// Partition
// -----------------------------------------------------------------------

export interface PartitionLayout<Datum> {
  /**
   * Lays out the specified root hierarchy.
   * You must call `root.sum` before passing the hierarchy to the partition layout.
   * You probably also want to call `root.sort` to order the hierarchy before computing the layout.
   *
   * @param root The specified root hierarchy.
   */
  (root: HierarchyNode<Datum>): HierarchyRectangularNode<Datum>;

  /**
   * Returns the current size, which defaults to [1, 1].
   */
  size(): [number, number];
  /**
   * Sets this partition layout’s size to the specified [width, height] array and returns this partition layout.
   *
   * @param size The specified two-element size array.
   */
  size(size: [number, number]): this;

  /**
   * Returns the current rounding state, which defaults to false.
   */
  round(): boolean;
  /**
   * Enables or disables rounding according to the given boolean and returns this partition layout.
   *
   * @param round The specified boolean flag.
   */
  round(round: boolean): this;

  /**
   * Returns the current padding, which defaults to zero.
   */
  padding(): number;
  /**
   * Sets the padding to the specified number and returns this partition layout.
   * The padding is used to separate a node’s adjacent children.
   *
   * @param padding The specified padding value.
   */
  padding(padding: number): this;
}

/**
 * Creates a new partition layout with the default settings.
 */
export function partition<Datum>(): PartitionLayout<Datum>;

// -----------------------------------------------------------------------
// Pack
// -----------------------------------------------------------------------

export interface HierarchyCircularLink<Datum> {
  /**
   * The source of the link.
   */
  source: HierarchyCircularNode<Datum>;

  /**
   * The target of the link.
   */
  target: HierarchyCircularNode<Datum>;
}

export interface HierarchyCircularNode<Datum> extends HierarchyNode<Datum> {
  /**
   * The x-coordinate of the circle’s center.
   */
  x: number;

  /**
   * The y-coordinate of the circle’s center.
   */
  y: number;

  /**
   * The radius of the circle.
   */
  r: number;

  /**
   * Returns an array of links for this node, where each link is an object that defines source and target properties.
   * The source of each link is the parent node, and the target is a child node.
   */
  links(): Array<HierarchyCircularLink<Datum>>;
}

export interface PackLayout<Datum> {
  /**
   * Lays out the specified root hierarchy.
   * You must call `root.sum` before passing the hierarchy to the pack layout.
   * You probably also want to call `root.sort` to order the hierarchy before computing the layout.
   *
   * @param root The specified root hierarchy.
   */
  (root: HierarchyNode<Datum>): HierarchyCircularNode<Datum>;

  /**
   * Returns the current radius accessor, which defaults to null.
   */
  radius(): null | ((node: HierarchyCircularNode<Datum>) => number);
  /**
   * Sets the pack layout’s radius accessor to the specified function and returns this pack layout.
   * If the radius accessor is null, the radius of each leaf circle is derived from the leaf `node.value` (computed by `node.sum`);
   * the radii are then scaled proportionally to fit the layout size.
   * If the radius accessor is not null, the radius of each leaf circle is specified exactly by the function.
   *
   * @param radius The specified radius accessor.
   */
  radius(radius: null | ((node: HierarchyCircularNode<Datum>) => number)): this;

  /**
   * Returns the current size, which defaults to [1, 1].
   */
  size(): [number, number];
  /**
   * Sets this pack layout’s size to the specified [width, height] array and returns this pack layout.
   *
   * @param size The specified two-element size array.
   */
  size(size: [number, number]): this;

  /**
   * Returns the current padding accessor, which defaults to the constant zero.
   */
  padding(): (node: HierarchyCircularNode<Datum>) => number;
  /**
   * Sets this pack layout’s padding accessor to the specified number and returns this pack layout.
   * Returns the current padding accessor, which defaults to the constant zero.
   *
   * When siblings are packed, tangent siblings will be separated by approximately the specified padding;
   * the enclosing parent circle will also be separated from its children by approximately the specified padding.
   * If an explicit radius is not specified, the padding is approximate because a two-pass algorithm
   * is needed to fit within the layout size: the circles are first packed without padding;
   * a scaling factor is computed and applied to the specified padding; and lastly the circles are re-packed with padding.
   *
   * @param padding The specified padding value.
   */
  padding(padding: number): this;
  /**
   * Sets this pack layout’s padding accessor to the specified function and returns this pack layout.
   * Returns the current padding accessor, which defaults to the constant zero.
   *
   * When siblings are packed, tangent siblings will be separated by approximately the specified padding;
   * the enclosing parent circle will also be separated from its children by approximately the specified padding.
   * If an explicit radius is not specified, the padding is approximate because a two-pass algorithm
   * is needed to fit within the layout size: the circles are first packed without padding;
   * a scaling factor is computed and applied to the specified padding; and lastly the circles are re-packed with padding.
   *
   * @param padding The specified padding function.
   */
  padding(padding: (node: HierarchyCircularNode<Datum>) => number): this;
}

/**
 * Creates a new pack layout with the default settings.
 */
export function pack<Datum>(): PackLayout<Datum>;

// -----------------------------------------------------------------------
// Pack Siblings and Enclosure
// -----------------------------------------------------------------------

export interface PackRadius {
  /**
   * The radius of the circle.
   */
  r: number;

  /**
   * The x-coordinate of the circle’s center.
   */
  x?: number;

  /**
   * The y-coordinate of the circle’s center.
   */
  y?: number;
}

export interface PackCircle {
  /**
   * The radius of the circle.
   */
  r: number;

  /**
   * The x-coordinate of the circle’s center.
   */
  x: number;

  /**
   * The y-coordinate of the circle’s center.
   */
  y: number;
}

// TODO: Since packSiblings manipulates the circles array in place, technically the x and y properties
// are optional on invocation, but will be created after execution for each entry.

/**
 * Packs the specified array of circles, each of which must have a `circle.r` property specifying the circle’s radius.
 * The circles are positioned according to the front-chain packing algorithm by Wang et al.
 *
 * @param circles The specified array of circles to pack.
 */
export function packSiblings<Datum extends PackRadius>(
  circles: Datum[]
): Array<Datum & PackCircle>;

/**
 * Computes the smallest circle that encloses the specified array of circles, each of which must have
 * a `circle.r` property specifying the circle’s radius, and `circle.x` and `circle.y` properties specifying the circle’s center.
 * The enclosing circle is computed using the Matoušek-Sharir-Welzl algorithm. (See also Apollonius’ Problem.)
 *
 * @param circles The specified array of circles to pack.
 */
export function packEnclose<Datum extends PackCircle>(
  circles: Datum[]
): PackCircle;
export function optional(f) {
  return f == null ? null : required(f);
}

export function required(f) {
  if (typeof f !== "function") throw new Error;
  return f;
}
export var slice = Array.prototype.slice;

export function shuffle(array) {
  var m = array.length,
      t,
      i;

  while (m) {
    i = Math.random() * m-- | 0;
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}
function defaultSeparation(a, b) {
  return a.parent === b.parent ? 1 : 2;
}

function meanX(children) {
  return children.reduce(meanXReduce, 0) / children.length;
}

function meanXReduce(x, c) {
  return x + c.x;
}

function maxY(children) {
  return 1 + children.reduce(maxYReduce, 0);
}

function maxYReduce(y, c) {
  return Math.max(y, c.y);
}

function leafLeft(node) {
  var children;
  while (children = node.children) node = children[0];
  return node;
}

function leafRight(node) {
  var children;
  while (children = node.children) node = children[children.length - 1];
  return node;
}

export default function() {
  var separation = defaultSeparation,
      dx = 1,
      dy = 1,
      nodeSize = false;

  function cluster(root) {
    var previousNode,
        x = 0;

    // First walk, computing the initial x & y values.
    root.eachAfter(function(node) {
      var children = node.children;
      if (children) {
        node.x = meanX(children);
        node.y = maxY(children);
      } else {
        node.x = previousNode ? x += separation(node, previousNode) : 0;
        node.y = 0;
        previousNode = node;
      }
    });

    var left = leafLeft(root),
        right = leafRight(root),
        x0 = left.x - separation(left, right) / 2,
        x1 = right.x + separation(right, left) / 2;

    // Second walk, normalizing x & y to the desired size.
    return root.eachAfter(nodeSize ? function(node) {
      node.x = (node.x - root.x) * dx;
      node.y = (root.y - node.y) * dy;
    } : function(node) {
      node.x = (node.x - x0) / (x1 - x0) * dx;
      node.y = (1 - (root.y ? node.y / root.y : 1)) * dy;
    });
  }

  cluster.separation = function(x) {
    return arguments.length ? (separation = x, cluster) : separation;
  };

  cluster.size = function(x) {
    return arguments.length ? (nodeSize = false, dx = +x[0], dy = +x[1], cluster) : (nodeSize ? null : [dx, dy]);
  };

  cluster.nodeSize = function(x) {
    return arguments.length ? (nodeSize = true, dx = +x[0], dy = +x[1], cluster) : (nodeSize ? [dx, dy] : null);
  };

  return cluster;
}
export function constantZero() {
  return 0;
}

export default function(x) {
  return function() {
    return x;
  };
}
export {default as cluster} from "./cluster.js";
export {default as hierarchy} from "./hierarchy/index.js";
export {default as pack} from "./pack/index.js";
export {default as packSiblings} from "./pack/siblings.js";
export {default as packEnclose} from "./pack/enclose.js";
export {default as partition} from "./partition.js";
export {default as stratify} from "./stratify.js";
export {default as tree} from "./tree.js";
export {default as treemap} from "./treemap/index.js";
export {default as treemapBinary} from "./treemap/binary.js";
export {default as treemapDice} from "./treemap/dice.js";
export {default as treemapSlice} from "./treemap/slice.js";
export {default as treemapSliceDice} from "./treemap/sliceDice.js";
export {default as treemapSquarify} from "./treemap/squarify.js";
export {default as treemapResquarify} from "./treemap/resquarify.js";
import roundNode from "./treemap/round.js";
import treemapDice from "./treemap/dice.js";

export default function() {
  var dx = 1,
      dy = 1,
      padding = 0,
      round = false;

  function partition(root) {
    var n = root.height + 1;
    root.x0 =
    root.y0 = padding;
    root.x1 = dx;
    root.y1 = dy / n;
    root.eachBefore(positionNode(dy, n));
    if (round) root.eachBefore(roundNode);
    return root;
  }

  function positionNode(dy, n) {
    return function(node) {
      if (node.children) {
        treemapDice(node, node.x0, dy * (node.depth + 1) / n, node.x1, dy * (node.depth + 2) / n);
      }
      var x0 = node.x0,
          y0 = node.y0,
          x1 = node.x1 - padding,
          y1 = node.y1 - padding;
      if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
      if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
      node.x0 = x0;
      node.y0 = y0;
      node.x1 = x1;
      node.y1 = y1;
    };
  }

  partition.round = function(x) {
    return arguments.length ? (round = !!x, partition) : round;
  };

  partition.size = function(x) {
    return arguments.length ? (dx = +x[0], dy = +x[1], partition) : [dx, dy];
  };

  partition.padding = function(x) {
    return arguments.length ? (padding = +x, partition) : padding;
  };

  return partition;
}
import {required} from "./accessors.js";
import {Node, computeHeight} from "./hierarchy/index.js";

var keyPrefix = "$", // Protect against keys like “__proto__”.
    preroot = {depth: -1},
    ambiguous = {};

function defaultId(d) {
  return d.id;
}

function defaultParentId(d) {
  return d.parentId;
}

export default function() {
  var id = defaultId,
      parentId = defaultParentId;

  function stratify(data) {
    var d,
        i,
        n = data.length,
        root,
        parent,
        node,
        nodes = new Array(n),
        nodeId,
        nodeKey,
        nodeByKey = {};

    for (i = 0; i < n; ++i) {
      d = data[i], node = nodes[i] = new Node(d);
      if ((nodeId = id(d, i, data)) != null && (nodeId += "")) {
        nodeKey = keyPrefix + (node.id = nodeId);
        nodeByKey[nodeKey] = nodeKey in nodeByKey ? ambiguous : node;
      }
    }

    for (i = 0; i < n; ++i) {
      node = nodes[i], nodeId = parentId(data[i], i, data);
      if (nodeId == null || !(nodeId += "")) {
        if (root) throw new Error("multiple roots");
        root = node;
      } else {
        parent = nodeByKey[keyPrefix + nodeId];
        if (!parent) throw new Error("missing: " + nodeId);
        if (parent === ambiguous) throw new Error("ambiguous: " + nodeId);
        if (parent.children) parent.children.push(node);
        else parent.children = [node];
        node.parent = parent;
      }
    }

    if (!root) throw new Error("no root");
    root.parent = preroot;
    root.eachBefore(function(node) { node.depth = node.parent.depth + 1; --n; }).eachBefore(computeHeight);
    root.parent = null;
    if (n > 0) throw new Error("cycle");

    return root;
  }

  stratify.id = function(x) {
    return arguments.length ? (id = required(x), stratify) : id;
  };

  stratify.parentId = function(x) {
    return arguments.length ? (parentId = required(x), stratify) : parentId;
  };

  return stratify;
}
import {Node} from "./hierarchy/index.js";

function defaultSeparation(a, b) {
  return a.parent === b.parent ? 1 : 2;
}

// function radialSeparation(a, b) {
//   return (a.parent === b.parent ? 1 : 2) / a.depth;
// }

// This function is used to traverse the left contour of a subtree (or
// subforest). It returns the successor of v on this contour. This successor is
// either given by the leftmost child of v or by the thread of v. The function
// returns null if and only if v is on the highest level of its subtree.
function nextLeft(v) {
  var children = v.children;
  return children ? children[0] : v.t;
}

// This function works analogously to nextLeft.
function nextRight(v) {
  var children = v.children;
  return children ? children[children.length - 1] : v.t;
}

// Shifts the current subtree rooted at w+. This is done by increasing
// prelim(w+) and mod(w+) by shift.
function moveSubtree(wm, wp, shift) {
  var change = shift / (wp.i - wm.i);
  wp.c -= change;
  wp.s += shift;
  wm.c += change;
  wp.z += shift;
  wp.m += shift;
}

// All other shifts, applied to the smaller subtrees between w- and w+, are
// performed by this function. To prepare the shifts, we have to adjust
// change(w+), shift(w+), and change(w-).
function executeShifts(v) {
  var shift = 0,
      change = 0,
      children = v.children,
      i = children.length,
      w;
  while (--i >= 0) {
    w = children[i];
    w.z += shift;
    w.m += shift;
    shift += w.s + (change += w.c);
  }
}

// If vi-’s ancestor is a sibling of v, returns vi-’s ancestor. Otherwise,
// returns the specified (default) ancestor.
function nextAncestor(vim, v, ancestor) {
  return vim.a.parent === v.parent ? vim.a : ancestor;
}

function TreeNode(node, i) {
  this._ = node;
  this.parent = null;
  this.children = null;
  this.A = null; // default ancestor
  this.a = this; // ancestor
  this.z = 0; // prelim
  this.m = 0; // mod
  this.c = 0; // change
  this.s = 0; // shift
  this.t = null; // thread
  this.i = i; // number
}

TreeNode.prototype = Object.create(Node.prototype);

function treeRoot(root) {
  var tree = new TreeNode(root, 0),
      node,
      nodes = [tree],
      child,
      children,
      i,
      n;

  while (node = nodes.pop()) {
    if (children = node._.children) {
      node.children = new Array(n = children.length);
      for (i = n - 1; i >= 0; --i) {
        nodes.push(child = node.children[i] = new TreeNode(children[i], i));
        child.parent = node;
      }
    }
  }

  (tree.parent = new TreeNode(null, 0)).children = [tree];
  return tree;
}

// Node-link tree diagram using the Reingold-Tilford "tidy" algorithm
export default function() {
  var separation = defaultSeparation,
      dx = 1,
      dy = 1,
      nodeSize = null;

  function tree(root) {
    var t = treeRoot(root);

    // Compute the layout using Buchheim et al.’s algorithm.
    t.eachAfter(firstWalk), t.parent.m = -t.z;
    t.eachBefore(secondWalk);

    // If a fixed node size is specified, scale x and y.
    if (nodeSize) root.eachBefore(sizeNode);

    // If a fixed tree size is specified, scale x and y based on the extent.
    // Compute the left-most, right-most, and depth-most nodes for extents.
    else {
      var left = root,
          right = root,
          bottom = root;
      root.eachBefore(function(node) {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
        if (node.depth > bottom.depth) bottom = node;
      });
      var s = left === right ? 1 : separation(left, right) / 2,
          tx = s - left.x,
          kx = dx / (right.x + s + tx),
          ky = dy / (bottom.depth || 1);
      root.eachBefore(function(node) {
        node.x = (node.x + tx) * kx;
        node.y = node.depth * ky;
      });
    }

    return root;
  }

  // Computes a preliminary x-coordinate for v. Before that, FIRST WALK is
  // applied recursively to the children of v, as well as the function
  // APPORTION. After spacing out the children by calling EXECUTE SHIFTS, the
  // node v is placed to the midpoint of its outermost children.
  function firstWalk(v) {
    var children = v.children,
        siblings = v.parent.children,
        w = v.i ? siblings[v.i - 1] : null;
    if (children) {
      executeShifts(v);
      var midpoint = (children[0].z + children[children.length - 1].z) / 2;
      if (w) {
        v.z = w.z + separation(v._, w._);
        v.m = v.z - midpoint;
      } else {
        v.z = midpoint;
      }
    } else if (w) {
      v.z = w.z + separation(v._, w._);
    }
    v.parent.A = apportion(v, w, v.parent.A || siblings[0]);
  }

  // Computes all real x-coordinates by summing up the modifiers recursively.
  function secondWalk(v) {
    v._.x = v.z + v.parent.m;
    v.m += v.parent.m;
  }

  // The core of the algorithm. Here, a new subtree is combined with the
  // previous subtrees. Threads are used to traverse the inside and outside
  // contours of the left and right subtree up to the highest common level. The
  // vertices used for the traversals are vi+, vi-, vo-, and vo+, where the
  // superscript o means outside and i means inside, the subscript - means left
  // subtree and + means right subtree. For summing up the modifiers along the
  // contour, we use respective variables si+, si-, so-, and so+. Whenever two
  // nodes of the inside contours conflict, we compute the left one of the
  // greatest uncommon ancestors using the function ANCESTOR and call MOVE
  // SUBTREE to shift the subtree and prepare the shifts of smaller subtrees.
  // Finally, we add a new thread (if necessary).
  function apportion(v, w, ancestor) {
    if (w) {
      var vip = v,
          vop = v,
          vim = w,
          vom = vip.parent.children[0],
          sip = vip.m,
          sop = vop.m,
          sim = vim.m,
          som = vom.m,
          shift;
      while (vim = nextRight(vim), vip = nextLeft(vip), vim && vip) {
        vom = nextLeft(vom);
        vop = nextRight(vop);
        vop.a = v;
        shift = vim.z + sim - vip.z - sip + separation(vim._, vip._);
        if (shift > 0) {
          moveSubtree(nextAncestor(vim, v, ancestor), v, shift);
          sip += shift;
          sop += shift;
        }
        sim += vim.m;
        sip += vip.m;
        som += vom.m;
        sop += vop.m;
      }
      if (vim && !nextRight(vop)) {
        vop.t = vim;
        vop.m += sim - sop;
      }
      if (vip && !nextLeft(vom)) {
        vom.t = vip;
        vom.m += sip - som;
        ancestor = v;
      }
    }
    return ancestor;
  }

  function sizeNode(node) {
    node.x *= dx;
    node.y = node.depth * dy;
  }

  tree.separation = function(x) {
    return arguments.length ? (separation = x, tree) : separation;
  };

  tree.size = function(x) {
    return arguments.length ? (nodeSize = false, dx = +x[0], dy = +x[1], tree) : (nodeSize ? null : [dx, dy]);
  };

  tree.nodeSize = function(x) {
    return arguments.length ? (nodeSize = true, dx = +x[0], dy = +x[1], tree) : (nodeSize ? [dx, dy] : null);
  };

  return tree;
}
export default function() {
  var node = this, nodes = [node];
  while (node = node.parent) {
    nodes.push(node);
  }
  return nodes;
}
function count(node) {
  var sum = 0,
      children = node.children,
      i = children && children.length;
  if (!i) sum = 1;
  else while (--i >= 0) sum += children[i].value;
  node.value = sum;
}

export default function() {
  return this.eachAfter(count);
}
export default function() {
  var nodes = [];
  this.each(function(node) {
    nodes.push(node);
  });
  return nodes;
}
export default function(callback) {
  var node = this, current, next = [node], children, i, n;
  do {
    current = next.reverse(), next = [];
    while (node = current.pop()) {
      callback(node), children = node.children;
      if (children) for (i = 0, n = children.length; i < n; ++i) {
        next.push(children[i]);
      }
    }
  } while (next.length);
  return this;
}
export default function(callback) {
  var node = this, nodes = [node], next = [], children, i, n;
  while (node = nodes.pop()) {
    next.push(node), children = node.children;
    if (children) for (i = 0, n = children.length; i < n; ++i) {
      nodes.push(children[i]);
    }
  }
  while (node = next.pop()) {
    callback(node);
  }
  return this;
}
export default function(callback) {
  var node = this, nodes = [node], children, i;
  while (node = nodes.pop()) {
    callback(node), children = node.children;
    if (children) for (i = children.length - 1; i >= 0; --i) {
      nodes.push(children[i]);
    }
  }
  return this;
}
import node_count from "./count.js";
import node_each from "./each.js";
import node_eachBefore from "./eachBefore.js";
import node_eachAfter from "./eachAfter.js";
import node_sum from "./sum.js";
import node_sort from "./sort.js";
import node_path from "./path.js";
import node_ancestors from "./ancestors.js";
import node_descendants from "./descendants.js";
import node_leaves from "./leaves.js";
import node_links from "./links.js";

export default function hierarchy(data, children) {
  var root = new Node(data),
      valued = +data.value && (root.value = data.value),
      node,
      nodes = [root],
      child,
      childs,
      i,
      n;

  if (children == null) children = defaultChildren;

  while (node = nodes.pop()) {
    if (valued) node.value = +node.data.value;
    if ((childs = children(node.data)) && (n = childs.length)) {
      node.children = new Array(n);
      for (i = n - 1; i >= 0; --i) {
        nodes.push(child = node.children[i] = new Node(childs[i]));
        child.parent = node;
        child.depth = node.depth + 1;
      }
    }
  }

  return root.eachBefore(computeHeight);
}

function node_copy() {
  return hierarchy(this).eachBefore(copyData);
}

function defaultChildren(d) {
  return d.children;
}

function copyData(node) {
  node.data = node.data.data;
}

export function computeHeight(node) {
  var height = 0;
  do node.height = height;
  while ((node = node.parent) && (node.height < ++height));
}

export function Node(data) {
  this.data = data;
  this.depth =
  this.height = 0;
  this.parent = null;
}

Node.prototype = hierarchy.prototype = {
  constructor: Node,
  count: node_count,
  each: node_each,
  eachAfter: node_eachAfter,
  eachBefore: node_eachBefore,
  sum: node_sum,
  sort: node_sort,
  path: node_path,
  ancestors: node_ancestors,
  descendants: node_descendants,
  leaves: node_leaves,
  links: node_links,
  copy: node_copy
};
export default function() {
  var leaves = [];
  this.eachBefore(function(node) {
    if (!node.children) {
      leaves.push(node);
    }
  });
  return leaves;
}
export default function() {
  var root = this, links = [];
  root.each(function(node) {
    if (node !== root) { // Don’t include the root’s parent, if any.
      links.push({source: node.parent, target: node});
    }
  });
  return links;
}
export default function(end) {
  var start = this,
      ancestor = leastCommonAncestor(start, end),
      nodes = [start];
  while (start !== ancestor) {
    start = start.parent;
    nodes.push(start);
  }
  var k = nodes.length;
  while (end !== ancestor) {
    nodes.splice(k, 0, end);
    end = end.parent;
  }
  return nodes;
}

function leastCommonAncestor(a, b) {
  if (a === b) return a;
  var aNodes = a.ancestors(),
      bNodes = b.ancestors(),
      c = null;
  a = aNodes.pop();
  b = bNodes.pop();
  while (a === b) {
    c = a;
    a = aNodes.pop();
    b = bNodes.pop();
  }
  return c;
}
export default function(compare) {
  return this.eachBefore(function(node) {
    if (node.children) {
      node.children.sort(compare);
    }
  });
}
export default function(value) {
  return this.eachAfter(function(node) {
    var sum = +value(node.data) || 0,
        children = node.children,
        i = children && children.length;
    while (--i >= 0) sum += children[i].value;
    node.value = sum;
  });
}
import {shuffle, slice} from "../array.js";

export default function(circles) {
  var i = 0, n = (circles = shuffle(slice.call(circles))).length, B = [], p, e;

  while (i < n) {
    p = circles[i];
    if (e && enclosesWeak(e, p)) ++i;
    else e = encloseBasis(B = extendBasis(B, p)), i = 0;
  }

  return e;
}

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
import {packEnclose} from "./siblings.js";
import {optional} from "../accessors.js";
import constant, {constantZero} from "../constant.js";

function defaultRadius(d) {
  return Math.sqrt(d.value);
}

export default function() {
  var radius = null,
      dx = 1,
      dy = 1,
      padding = constantZero;

  function pack(root) {
    root.x = dx / 2, root.y = dy / 2;
    if (radius) {
      root.eachBefore(radiusLeaf(radius))
          .eachAfter(packChildren(padding, 0.5))
          .eachBefore(translateChild(1));
    } else {
      root.eachBefore(radiusLeaf(defaultRadius))
          .eachAfter(packChildren(constantZero, 1))
          .eachAfter(packChildren(padding, root.r / Math.min(dx, dy)))
          .eachBefore(translateChild(Math.min(dx, dy) / (2 * root.r)));
    }
    return root;
  }

  pack.radius = function(x) {
    return arguments.length ? (radius = optional(x), pack) : radius;
  };

  pack.size = function(x) {
    return arguments.length ? (dx = +x[0], dy = +x[1], pack) : [dx, dy];
  };

  pack.padding = function(x) {
    return arguments.length ? (padding = typeof x === "function" ? x : constant(+x), pack) : padding;
  };

  return pack;
}

function radiusLeaf(radius) {
  return function(node) {
    if (!node.children) {
      node.r = Math.max(0, +radius(node) || 0);
    }
  };
}

function packChildren(padding, k) {
  return function(node) {
    if (children = node.children) {
      var children,
          i,
          n = children.length,
          r = padding(node) * k || 0,
          e;

      if (r) for (i = 0; i < n; ++i) children[i].r += r;
      e = packEnclose(children);
      if (r) for (i = 0; i < n; ++i) children[i].r -= r;
      node.r = e + r;
    }
  };
}

function translateChild(k) {
  return function(node) {
    var parent = node.parent;
    node.r *= k;
    if (parent) {
      node.x = parent.x + k * node.x;
      node.y = parent.y + k * node.y;
    }
  };
}
import enclose from "./enclose.js";

function place(b, a, c) {
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
}

function intersects(a, b) {
  var dr = a.r + b.r - 1e-6, dx = b.x - a.x, dy = b.y - a.y;
  return dr > 0 && dr * dr > dx * dx + dy * dy;
}

function score(node) {
  var a = node._,
      b = node.next._,
      ab = a.r + b.r,
      dx = (a.x * b.r + b.x * a.r) / ab,
      dy = (a.y * b.r + b.y * a.r) / ab;
  return dx * dx + dy * dy;
}

function Node(circle) {
  this._ = circle;
  this.next = null;
  this.previous = null;
}

export function packEnclose(circles) {
  if (!(n = circles.length)) return 0;

  var a, b, c, n, aa, ca, i, j, k, sj, sk;

  // Place the first circle.
  a = circles[0], a.x = 0, a.y = 0;
  if (!(n > 1)) return a.r;

  // Place the second circle.
  b = circles[1], a.x = -b.r, b.x = a.r, b.y = 0;
  if (!(n > 2)) return a.r + b.r;

  // Place the third circle.
  place(b, a, c = circles[2]);

  // Initialize the front-chain using the first three circles a, b and c.
  a = new Node(a), b = new Node(b), c = new Node(c);
  a.next = c.previous = b;
  b.next = a.previous = c;
  c.next = b.previous = a;

  // Attempt to place each remaining circle…
  pack: for (i = 3; i < n; ++i) {
    place(a._, b._, c = circles[i]), c = new Node(c);

    // Find the closest intersecting circle on the front-chain, if any.
    // “Closeness” is determined by linear distance along the front-chain.
    // “Ahead” or “behind” is likewise determined by linear distance.
    j = b.next, k = a.previous, sj = b._.r, sk = a._.r;
    do {
      if (sj <= sk) {
        if (intersects(j._, c._)) {
          b = j, a.next = b, b.previous = a, --i;
          continue pack;
        }
        sj += j._.r, j = j.next;
      } else {
        if (intersects(k._, c._)) {
          a = k, a.next = b, b.previous = a, --i;
          continue pack;
        }
        sk += k._.r, k = k.previous;
      }
    } while (j !== k.next);

    // Success! Insert the new circle c between a and b.
    c.previous = a, c.next = b, a.next = b.previous = b = c;

    // Compute the new closest circle pair to the centroid.
    aa = score(a);
    while ((c = c.next) !== b) {
      if ((ca = score(c)) < aa) {
        a = c, aa = ca;
      }
    }
    b = a.next;
  }

  // Compute the enclosing circle of the front chain.
  a = [b._], c = b; while ((c = c.next) !== b) a.push(c._); c = enclose(a);

  // Translate the circles to put the enclosing circle around the origin.
  for (i = 0; i < n; ++i) a = circles[i], a.x -= c.x, a.y -= c.y;

  return c.r;
}

export default function(circles) {
  packEnclose(circles);
  return circles;
}
export default function(parent, x0, y0, x1, y1) {
  var nodes = parent.children,
      i, n = nodes.length,
      sum, sums = new Array(n + 1);

  for (sums[0] = sum = i = 0; i < n; ++i) {
    sums[i + 1] = sum += nodes[i].value;
  }

  partition(0, n, parent.value, x0, y0, x1, y1);

  function partition(i, j, value, x0, y0, x1, y1) {
    if (i >= j - 1) {
      var node = nodes[i];
      node.x0 = x0, node.y0 = y0;
      node.x1 = x1, node.y1 = y1;
      return;
    }

    var valueOffset = sums[i],
        valueTarget = (value / 2) + valueOffset,
        k = i + 1,
        hi = j - 1;

    while (k < hi) {
      var mid = k + hi >>> 1;
      if (sums[mid] < valueTarget) k = mid + 1;
      else hi = mid;
    }

    if ((valueTarget - sums[k - 1]) < (sums[k] - valueTarget) && i + 1 < k) --k;

    var valueLeft = sums[k] - valueOffset,
        valueRight = value - valueLeft;

    if ((x1 - x0) > (y1 - y0)) {
      var xk = (x0 * valueRight + x1 * valueLeft) / value;
      partition(i, k, valueLeft, x0, y0, xk, y1);
      partition(k, j, valueRight, xk, y0, x1, y1);
    } else {
      var yk = (y0 * valueRight + y1 * valueLeft) / value;
      partition(i, k, valueLeft, x0, y0, x1, yk);
      partition(k, j, valueRight, x0, yk, x1, y1);
    }
  }
}
export default function(parent, x0, y0, x1, y1) {
  var nodes = parent.children,
      node,
      i = -1,
      n = nodes.length,
      k = parent.value && (x1 - x0) / parent.value;

  while (++i < n) {
    node = nodes[i], node.y0 = y0, node.y1 = y1;
    node.x0 = x0, node.x1 = x0 += node.value * k;
  }
}
import roundNode from "./round.js";
import squarify from "./squarify.js";
import {required} from "../accessors.js";
import constant, {constantZero} from "../constant.js";

export default function() {
  var tile = squarify,
      round = false,
      dx = 1,
      dy = 1,
      paddingStack = [0],
      paddingInner = constantZero,
      paddingTop = constantZero,
      paddingRight = constantZero,
      paddingBottom = constantZero,
      paddingLeft = constantZero;

  function treemap(root) {
    root.x0 =
    root.y0 = 0;
    root.x1 = dx;
    root.y1 = dy;
    root.eachBefore(positionNode);
    paddingStack = [0];
    if (round) root.eachBefore(roundNode);
    return root;
  }

  function positionNode(node) {
    var p = paddingStack[node.depth],
        x0 = node.x0 + p,
        y0 = node.y0 + p,
        x1 = node.x1 - p,
        y1 = node.y1 - p;
    if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
    if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
    node.x0 = x0;
    node.y0 = y0;
    node.x1 = x1;
    node.y1 = y1;
    if (node.children) {
      p = paddingStack[node.depth + 1] = paddingInner(node) / 2;
      x0 += paddingLeft(node) - p;
      y0 += paddingTop(node) - p;
      x1 -= paddingRight(node) - p;
      y1 -= paddingBottom(node) - p;
      if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
      if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
      tile(node, x0, y0, x1, y1);
    }
  }

  treemap.round = function(x) {
    return arguments.length ? (round = !!x, treemap) : round;
  };

  treemap.size = function(x) {
    return arguments.length ? (dx = +x[0], dy = +x[1], treemap) : [dx, dy];
  };

  treemap.tile = function(x) {
    return arguments.length ? (tile = required(x), treemap) : tile;
  };

  treemap.padding = function(x) {
    return arguments.length ? treemap.paddingInner(x).paddingOuter(x) : treemap.paddingInner();
  };

  treemap.paddingInner = function(x) {
    return arguments.length ? (paddingInner = typeof x === "function" ? x : constant(+x), treemap) : paddingInner;
  };

  treemap.paddingOuter = function(x) {
    return arguments.length ? treemap.paddingTop(x).paddingRight(x).paddingBottom(x).paddingLeft(x) : treemap.paddingTop();
  };

  treemap.paddingTop = function(x) {
    return arguments.length ? (paddingTop = typeof x === "function" ? x : constant(+x), treemap) : paddingTop;
  };

  treemap.paddingRight = function(x) {
    return arguments.length ? (paddingRight = typeof x === "function" ? x : constant(+x), treemap) : paddingRight;
  };

  treemap.paddingBottom = function(x) {
    return arguments.length ? (paddingBottom = typeof x === "function" ? x : constant(+x), treemap) : paddingBottom;
  };

  treemap.paddingLeft = function(x) {
    return arguments.length ? (paddingLeft = typeof x === "function" ? x : constant(+x), treemap) : paddingLeft;
  };

  return treemap;
}
import treemapDice from "./dice.js";
import treemapSlice from "./slice.js";
import {phi, squarifyRatio} from "./squarify.js";

export default (function custom(ratio) {

  function resquarify(parent, x0, y0, x1, y1) {
    if ((rows = parent._squarify) && (rows.ratio === ratio)) {
      var rows,
          row,
          nodes,
          i,
          j = -1,
          n,
          m = rows.length,
          value = parent.value;

      while (++j < m) {
        row = rows[j], nodes = row.children;
        for (i = row.value = 0, n = nodes.length; i < n; ++i) row.value += nodes[i].value;
        if (row.dice) treemapDice(row, x0, y0, x1, y0 += (y1 - y0) * row.value / value);
        else treemapSlice(row, x0, y0, x0 += (x1 - x0) * row.value / value, y1);
        value -= row.value;
      }
    } else {
      parent._squarify = rows = squarifyRatio(ratio, parent, x0, y0, x1, y1);
      rows.ratio = ratio;
    }
  }

  resquarify.ratio = function(x) {
    return custom((x = +x) > 1 ? x : 1);
  };

  return resquarify;
})(phi);
export default function(node) {
  node.x0 = Math.round(node.x0);
  node.y0 = Math.round(node.y0);
  node.x1 = Math.round(node.x1);
  node.y1 = Math.round(node.y1);
}
export default function(parent, x0, y0, x1, y1) {
  var nodes = parent.children,
      node,
      i = -1,
      n = nodes.length,
      k = parent.value && (y1 - y0) / parent.value;

  while (++i < n) {
    node = nodes[i], node.x0 = x0, node.x1 = x1;
    node.y0 = y0, node.y1 = y0 += node.value * k;
  }
}
import dice from "./dice.js";
import slice from "./slice.js";

export default function(parent, x0, y0, x1, y1) {
  (parent.depth & 1 ? slice : dice)(parent, x0, y0, x1, y1);
}
import treemapDice from "./dice.js";
import treemapSlice from "./slice.js";

export var phi = (1 + Math.sqrt(5)) / 2;

export function squarifyRatio(ratio, parent, x0, y0, x1, y1) {
  var rows = [],
      nodes = parent.children,
      row,
      nodeValue,
      i0 = 0,
      i1 = 0,
      n = nodes.length,
      dx, dy,
      value = parent.value,
      sumValue,
      minValue,
      maxValue,
      newRatio,
      minRatio,
      alpha,
      beta;

  while (i0 < n) {
    dx = x1 - x0, dy = y1 - y0;

    // Find the next non-empty node.
    do sumValue = nodes[i1++].value; while (!sumValue && i1 < n);
    minValue = maxValue = sumValue;
    alpha = Math.max(dy / dx, dx / dy) / (value * ratio);
    beta = sumValue * sumValue * alpha;
    minRatio = Math.max(maxValue / beta, beta / minValue);

    // Keep adding nodes while the aspect ratio maintains or improves.
    for (; i1 < n; ++i1) {
      sumValue += nodeValue = nodes[i1].value;
      if (nodeValue < minValue) minValue = nodeValue;
      if (nodeValue > maxValue) maxValue = nodeValue;
      beta = sumValue * sumValue * alpha;
      newRatio = Math.max(maxValue / beta, beta / minValue);
      if (newRatio > minRatio) { sumValue -= nodeValue; break; }
      minRatio = newRatio;
    }

    // Position and record the row orientation.
    rows.push(row = {value: sumValue, dice: dx < dy, children: nodes.slice(i0, i1)});
    if (row.dice) treemapDice(row, x0, y0, x1, value ? y0 += dy * sumValue / value : y1);
    else treemapSlice(row, x0, y0, value ? x0 += dx * sumValue / value : x1, y1);
    value -= sumValue, i0 = i1;
  }

  return rows;
}

export default (function custom(ratio) {

  function squarify(parent, x0, y0, x1, y1) {
    squarifyRatio(ratio, parent, x0, y0, x1, y1);
  }

  squarify.ratio = function(x) {
    return custom((x = +x) > 1 ? x : 1);
  };

  return squarify;
})(phi);
