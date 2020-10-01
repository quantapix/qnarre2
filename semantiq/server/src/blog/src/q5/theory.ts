/*
interface monoid<T> {
  empty: T;
  concat: (u: T, v: T) => T;
}

// ---

const Sum: monoid = {
  Empty: 0,
  Concat: (u: number, v: number) => u + v,
};

function fold(list: Array, acumulate: T, concat: (u: T, v: T) => T): T {
  list.forEach((item) => {
    acumulate = concat(acumulate, item);
  });
  return acumulate;
}

var sum = fold([2, 3, 4], Sum.Empty, Sum.Concat);

// ---

interface monoid<T> {
  Empty: T;
  Concat: (u: T, v: T) => T;
}

function slice<T>(list: Array<T>, size: number): Array<Array<T>> {
  var accumulation: Array<Array<T>> = [];
  for (var i = 0; i < list.length; i += size) {
    var chunk: Array<T> = list.slice(i, i + size);
    accumulation.push(chunk);
  }
  return accumulation;
}

function mapReduce<T, T1>(
  list: Array<Array<T>>,
  f: (v: T) => T1,
  m: monoid<T1>
): T1 {
  var accumulation: Array<T1> = [];

  for (var i = 0; i < list.length; i++) {
    var chunk = list[i];
    var reduction: T1 = chunk.map(f).reduce(m.Concat, m.Empty);
    accumulation.push(reduction);
  }

  return accumulation.reduce(m.Concat, m.Empty);
}

var bigList = [...Array(1001)].map((_, i) => i);

var reduced: number = mapReduce<number, number>(
  slice<number>(bigList, 10),
  x => x + 1,
  {
    Empty: 0,
    Concat: (x, y) => x + y
  }
);

log(1, reduced);

// ---
 
Array.prototype.matchWith = function <T1>(pattern: ListPattern<any, T1>) { if (this.length == 0) {
  return pattern.empty(); }
  else {
  return pattern.cons(this[0], this.slice(1));
  } }

function Fold<T>(array: Array<T>, monoid: { empty: () => T; concat: (x: T, y: T) => T; }): T{
    return this.MatchWith({
    empty: () => monoid.empty(),
    cons: (v, r) => monoid.concat(v, r.Fold(monoid))
    });

public static Zip<T>(a1: Array<T>, a2: Array<T>): Array<T> { return a1.MatchWith({
      empty: () => a2,
      cons: (x, xs) => a2.MatchWith({
      empty: () => a1,
      cons: (y, ys) => [x, y].concat(F.Zip(xs, ys)) })
      }); }

// ---

class Id<T> {
  Value: T;

  constructor(value: T) {
    this.Value = value;
  }

  map<T1>(f: (y: T) => T1): Id<T1> {
    return new Id<T1>(f(this.Value));
  }

  public static of<T>(v: T) {
    return new Id<T>(v);
  }
}

var Id = <T>(x: T) => ({
  map: <U>(f: (y: T) => U) => Id<U>(f(x))
  })

cata<T1>(alg: (y: T) => T1): T1 { return alg(this.Value) };

Promise.prototype.map = function <T1>(f: (v: any) => T1) { return new Promise<T1>((resolve, reject) => {
  this.then(x => resolve(f(x))).catch(reject); });
  };
  new Promise<number>((resolve, reject) => { reject(1) })
  .map(x => x + 3)

// ---

  class IO<T> {
    Fn: () => T;
    constructor(fn: () => T) {
      this.Fn = fn;
    }
    map<T1>(f: (y: T) => T1): IO<T1> {
      return new IO<T1>(() => f(this.Fn()));
    }
    matchWith<T1>(f: (y: T) => T1): T1 {
      return f(this.Fn());
    }
    run<T1>(): T {
      return this.Fn();
    }
  }
  
  new IO<number>(() => 3).map(x => x + 3).matchWith(x => log(1, x));
  

// ---

class Reader<Env, T> {
  Fn: (e: Env) => T;
  constructor(fn: (e: Env) => T) {
    this.Fn = fn;
  }
  map<T1>(f: (y: T) => T1): Reader<Env, T1> {
    return new Reader<Env, T1>(env => f(this.Fn(env)));
  }
  matchWith<T1>(f: (y: T) => T1): (env: Env) => T1 {
    return (env: Env) => f(this.Fn(env));
  }
  run<T1>(env: Env): T {
    return this.Fn(env);
  }
  toPromise(env: Env): Promise<T> {
    return new Promise<T>(resolve => resolve(this.Fn(env)));
  }
}

class Config {
  constructor(name: string) {
    this.Name = name;
  }
  public Name: string;
}

var getName = new Reader<Config, string>((env: Config) => env.Name);
var mapped: Reader<Config, string> = getName.map(name => `Name:  ${name}`);
var evaluateWithConfig = mapped.run(new Config("Sql"));
log(1, evaluateWithConfig);


// ---

abstract class Maybe<T>
    {
abstract MatchWith<T1>(pattern: ({ none: () => T1, some: (v: T) => T1 })): T1;
abstract Map<T1>(f: (v: T) => T1): Maybe<T1>; }
class Some<T> extends Maybe<T> {
    Value: T
    constructor(value: T) {
        super();
this.Value = value; }
Map<T1>(f: (v: T) => T1): Maybe<T1> { return new Some<T1>(f(this.Value));
}
MatchWith<T1>(pattern: ({ none: () => T1, some: (v: T) => T1 })): T1 { return pattern.some(this.Value);
} }
class None<T> extends Maybe<T> { Map<T1>(f: (v: T) => T1): Maybe<T1> {
        return new None<T1>();
    }
MatchWith<T1>(pattern: ({ none: () => T1, some: (v: T) => T1 })): T1 { return pattern.none();
} }

// ---

abstract class Either<TL, TR>
{
abstract Map<TR1>(f: (v: TR) => TR1): Either<TL, TR1>; }
class Right<TL, TR> extends Either<TL, TR>{
        Value: TR
}
constructor(value: TR) {
    super();
this.Value = value; }
class Left<TL, TR> extends Either<TL, TR>{ Value: TL
constructor(value: TL) {
    super();
this.Value = value; }
52
 }
Map<TR1>(f: (v: TR) => TR1): Either<TL, TR1> { return new Right<TL, TR1>(f(this.Value));
}
 Map<TR1>(f: (v: TR) => TR1): Either<TL, TR1> { return new Left<TL, TR1>(this.Value);


// ---

type PromiseCallbackActions<T> = (
  resolve: (value: T) => void,
  reject: (reason?: any) => void
) => void;

class EitherAsync<T, T1> {
  private actions: PromiseCallbackActions<T>;
  private mappings: (u: T) => T1;
  static resolve<T>(value: T): EitherAsync<T, T> {
    return new EitherAsync<T, T>((resolve, reject) => resolve(value), x => x);
  }

  static fromPromise<T>(promise: Promise<T>): EitherAsync<T, T> {
    return new EitherAsync<T, T>(
      (resolve, reject) => promise.then(resolve).catch(reject),
      x => x
    );
  }

  constructor(executor: PromiseCallbackActions<T>, f: (u: T) => T1) {
    this.actions = executor;
    this.mappings = f;
  }

  map<T2>(f: (u: T1) => T2): EitherAsync<T, T2> {
    return new EitherAsync<T, T2>(this.actions, x => f(this.mappings(x)));
  }

  matchWith(pattern: { ok: (v: T1) => void; error: (v: any) => void }): void {
    this.actions(x => pattern.ok(this.mappings(x)), pattern.error);
  }
}

var eitherAsync = new EitherAsync(
  (resolve, reject) => {
    resolve(5);
  },
  x => x
);
eitherAsync.matchWith({
  ok: x => {
    console.log("ok" + x);
  },
  error: x => {
    console.log("error" + x);
  }
});

var r = EitherAsync.fromPromise(Promise.resolve(5));

r.map(x => x + 2).matchWith({
  ok: x => {
    log(1, "ok " + x);
  },
  error: x => {
    log(1, "error " + x);
  }
});

// ---

abstract class Tree<T> {
  abstract MatchWith<T1>(pattern: {
    leaf: (v: T) => T1;
    node: (left: Tree<T>, right: Tree<T>) => T1;
  }): T1;

  Show(): string {
    return this.MatchWith({
      leaf: v => `(${v})`,
      node: (l, r) => `(${l.Show()}, ${r.Show()})`
    });
  }
  Reverse(): Tree<T> {
    return this.MatchWith({
      leaf: v => new Leaf(v),
      node: (l, r) => new Node1(r.Reverse(), l.Reverse())
    });
  }

  map<T1>(f: (v: T) => T1): Tree<T1> {
    return this.MatchWith({
      leaf: v => new Leaf(f(v)),
      node: (l, r) => new Node1(l.map(f), r.map(f))
    });
  }
}

class Node1<T> extends Tree<T> {
  Left: Tree<T>;
  Right: Tree<T>;
  constructor(left: Tree<T>, right: Tree<T>) {
    super();
    this.Left = left;
    this.Right = right;
  }

  MatchWith<T1>(pattern: {
    leaf: (v: T) => T1;
    node: (left: Tree<T>, right: Tree<T>) => T1;
  }): T1 {
    return pattern.node(this.Left, this.Right);
  }
}

class Leaf<T> extends Tree<T> {
  Value: T;
  constructor(value: T) {
    super();
    this.Value = value;
  }
  MatchWith<T1>(pattern: {
    leaf: (v: T) => T1;
    node: (left: Tree<T>, right: Tree<T>) => T1;
  }): T1 {
    return pattern.leaf(this.Value);
  }
}

const tree = new Node1(
  new Node1(new Leaf(1), new Leaf(3)),
  new Node1(new Leaf(5), new Leaf(7))
);
log(1, tree.map(x => x + 3).Show());

// ---

export class Reader<Env, T> {
  Fn: (e: Env) => T;
  constructor(fn: (e: Env) => T) {
    this.Fn = fn;
  }
  map<T1>(f: (y: T) => T1): Reader<Env, T1> {
    return new Reader<Env, T1>(env => f(this.Fn(env)));
  }
  matchWith<T1>(f: (y: T) => T1): (env: Env) => T1 {
    return (env: Env) => f(this.Fn(env));
  }
  run<T1>(env: Env): T {
    return this.Fn(env);
  }
  toPromise(env: Env): Promise<T> {
    return new Promise<T>(resolve => resolve(this.Fn(env)));
  }

  apply<T1>(applicative: Reader<Env, (v: T) => T1>): Reader<Env, T1> {
    return new Reader<Env, T1>(env => applicative.run(env)(this.Fn(env)));
  }

  public static of<Env, T>(v: T) {
    return new Reader((env: Env) => v);
  }

  public static ap<Env, T, T1>(
    applicative: Reader<Env, (v: T) => T1>,
    fa: Reader<Env, T>
  ) {
    return fa.apply(applicative);
  }
}

// ---

interface Visitor<T, T1> {
  VisitLeaf(leaf: Leaf<T>): T1;
  VisitNode(node: Node1<T>): T1;
}

type TreePattern<T, T1> = {
  leaf: (v: T) => T1;
  node: (left: T1, v: T, right: T1) => T1;
};

//interface Tree<T> {
//    Cata<T1>(algebra: TreePattern<T, T1>): T1;
//}

abstract class Tree<T> {
  // abstract MatchWith<T1>(pattern: ({ leaf: (v: T) => T1, node: (left: Tree<T>, v: T, right: Tree<T>) => T1 })): T1;
  abstract Accept<T1>(visitor: Visitor<T, T1>): T1;

  Show(): string {
    var visitor: Visitor<T, string> = {
      VisitLeaf: l => `(${l.Value})`,
      VisitNode: n =>
        `(${n.Left.Accept(visitor)},${n.Value}, ${n.Right.Accept(visitor)})`
    };
    return this.Accept(visitor);
  }
}

class Node1<T> extends Tree<T> {
  Accept<T1>(visitor: Visitor<T, T1>): T1 {
    return visitor.VisitNode(this);
  }

  Left: Tree<T>;
  Value: T;
  Right: Tree<T>;
  constructor(left: Tree<T>, value: T, right: Tree<T>) {
    super();
    this.Left = left;
    this.Value = value;
    this.Right = right;
  }
}

class Leaf<T> extends Tree<T> {
  Value: T;
  constructor(value: T) {
    super();
    this.Value = value;
  }

  Accept<T1>(visitor: Visitor<T, T1>): T1 {
    return visitor.VisitLeaf(this);
  }
}

const tree = new Node1(
  new Node1(new Leaf(1), 2, new Leaf(3)),
  4,
  new Node1(new Leaf(5), 6, new Leaf(7))
);

log(1, tree.Show());

// ---

export abstract class Maybe<T> {
  abstract matchWith<T1>(pattern: { none: () => T1; some: (v: T) => T1 }): T1;
  abstract map<T1>(f: (v: T) => T1): Maybe<T1>;
  bind<T1>(f: (v: T) => Maybe<T1>): Maybe<T1> {
      return this.matchWith({
          none: () => new None<T1>(),
          some: (v: T) => f(v)
      })
  }
}

export class Some<T> extends Maybe<T> {
  bind<T1>(f: (v: T) => Maybe<T1>): Maybe<T1> {
      return f(this.Value)
  }
  Value: T;
  constructor(value: T) {
      super();
      this.Value = value;
  }

  map<T1>(f: (v: T) => T1): Maybe<T1> {
      return new Some<T1>(f(this.Value));
  }

  matchWith<T1>(pattern: { none: () => T1; some: (v: T) => T1 }): T1 {
      return pattern.some(this.Value);
  }

}

export class None<T> extends Maybe<T> { 
  map<T1>(f: (v: T) => T1): Maybe<T1> {
      return new None<T1>();
  }
  matchWith<T1>(pattern: { none: () => T1; some: (v: T) => T1 }): T1 {
      return pattern.none();
  }
}
*/
