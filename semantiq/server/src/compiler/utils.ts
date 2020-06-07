namespace qnr {
  export interface QSpan {
    start: number;
    length: number;
  }

  export interface QRange {
    pos: number;
    end: number;
  }
  export namespace QRange {
    export interface Change {
      span: QSpan;
      newLength: number;
    }
    export interface Comment extends QRange {
      hasTrailingNewLine?: boolean;
      kind: CommentKind;
    }
    export interface SourceMap extends QRange {
      source?: SourceMapSource;
    }
  }

  export class TextSpan implements QSpan {
    constructor(public start = 0, public length = 0) {
      assert(start >= 0 && length >= 0);
    }
    get end() {
      return TextSpan.end(this);
    }
    isEmpty() {
      return this.length === 0;
    }
    contains(x: number): boolean;
    contains(x: QSpan): boolean;
    contains(x: QSpan | number) {
      if (typeof x === 'number') return x >= this.start && x < this.end;
      return x.start >= this.start && x.start + x.length <= this.end;
    }
    intersects(s: QSpan): boolean;
    intersects(start: number, length?: number): boolean;
    intersects(x: QSpan | number, length?: number) {
      if (typeof x === 'number') {
        if (length === undefined) return this.start <= x && x <= this.end;
        return TextSpan.intersecting(this.start, this.length, x, length);
      }
      return TextSpan.intersecting(this.start, this.length, x.start, x.length);
    }
    overlaps(s: QSpan) {
      return TextSpan.overlap(this, s) !== undefined;
    }
  }
  export namespace TextSpan {
    export function from(x: QRange): TextSpan;
    export function from(start: number, end: number): TextSpan;
    export function from(x: QRange | number, end = 0) {
      if (typeof x === 'number') return new TextSpan(x, end - x);
      return new TextSpan(x.pos, x.end - x.pos);
    }
    export function end(s: QSpan) {
      return s.start + s.length;
    }
    export function intersecting(s1: number, l1: number, s2: number, l2: number) {
      const e1 = s1 + l1;
      const e2 = s2 + l2;
      return s2 <= e1 && e2 >= s1;
    }
    export function intersection(s1: QSpan, s2: QSpan) {
      const s = Math.max(s1.start, s2.start);
      const e = Math.min(end(s1), end(s2));
      return s <= e ? from(s, e) : undefined;
    }
    export function overlap(s1: QSpan, s2: QSpan) {
      const r = intersection(s1, s2);
      return r?.length === 0 ? undefined : r;
    }
  }

  export class TextRange implements QRange {
    constructor(public pos = 0, public end = 0) {
      assert(pos <= end || end === -1);
    }
    isCollapsed() {
      return this.pos === this.end;
    }
    containsInclusive(p: number) {
      return p >= this.pos && p <= this.end;
    }
    movePos(p: number) {
      return new TextRange(p, this.end);
    }
    moveEnd(e: number) {
      return new TextRange(this.pos, e);
    }
  }
  export namespace TextRange {
    export function movePastDecorators(n: Node): TextRange {
      return n.decorators && n.decorators.length > 0 ? n.movePos(n.decorators.end) : n;
    }
    export function movePastModifiers(n: Node): TextRange {
      return n.modifiers && n.modifiers.length > 0 ? n.movePos(n.modifiers.end) : movePastDecorators(n);
    }
    export function createTokenRange(pos: number, token: SyntaxKind): TextRange {
      return new TextRange(pos, pos + tokenToString(token)!.length);
    }
    export function ofNode(n: Node): TextRange {
      return new TextRange(getTokenPosOfNode(n), n.end);
    }
    export function ofTypeParams(a: NodeArray<TypeParameterDeclaration>): TextRange {
      return new TextRange(a.pos - 1, a.end + 1);
    }
  }

  export class TextChange implements QRange.Change {
    constructor(public span: QSpan = new TextSpan(), public newLength = 0) {
      assert(newLength >= 0);
    }
    isUnchanged() {
      return this.span.length === 0 && this.newLength === 0;
    }
    toSpan() {
      return new TextSpan(this.span.start, this.newLength);
    }
  }
  export namespace TextChange {
    export const unchanged = new TextChange();

    export function collapse(cs: readonly QRange.Change[]) {
      if (cs.length === 0) return unchanged;
      let c = cs[0];
      if (cs.length === 1) return new TextChange(c.span, c.newLength);
      let s = c.span.start;
      let e = TextSpan.end(c.span);
      let e2 = s + c.newLength;
      for (let i = 1; i < cs.length; i++) {
        c = cs[i];
        s = Math.min(s, c.span.start);
        const o = TextSpan.end(c.span);
        e = Math.max(e, e + (o - e2));
        const n = c.span.start + c.newLength;
        e2 = Math.max(n, n + (e2 - o));
      }
      return new TextChange(TextSpan.from(s, e), e2 - s);
    }
  }
}
