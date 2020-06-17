namespace qnr {
  export namespace qns {
    export function create<T extends Node>(ts?: T[], trailingComma?: boolean): MutableNodes<T>;
    export function create<T extends Node>(ts?: readonly T[], trailingComma?: boolean): Nodes<T>;
    export function create<T extends Node>(ts?: readonly T[], trailingComma?: boolean): Nodes<T> {
      if (!ts || ts === qa.emptyArray) ts = [];
      else if (isNodes(ts)) return ts;
      const ns = ts as Nodes<T>;
      ns.pos = -1;
      ns.end = -1;
      ns.trailingComma = trailingComma;
      ns.visit = function <U>(this: Nodes<T>, cb: (n: Node) => U, cbs?: (ns: Nodes<Node>) => U | undefined): U | undefined {
        if (cbs) return cbs(this);
        for (const n of this) {
          const r = cb(n);
          if (r) return r;
        }
        return;
      };
      return ns;
    }
    export function from<T extends Node>(ts: readonly T[]): Nodes<T>;
    export function from<T extends Node>(ts: readonly T[] | undefined): Nodes<T> | undefined;
    export function from<T extends Node>(ts: readonly T[] | undefined): Nodes<T> | undefined {
      return ts ? create(ts) : undefined;
    }
    export function isNodes<T extends Node>(ns: readonly T[]): ns is Nodes<T> {
      return ns.hasOwnProperty('pos') && ns.hasOwnProperty('end');
    }
  }
}
