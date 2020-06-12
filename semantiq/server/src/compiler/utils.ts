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

  export function isSynthesized(x: number): boolean;
  export function isSynthesized(r: QRange): boolean;
  export function isSynthesized(x: QRange | number) {
    //  x === undefined || x === null || isNaN(x) || x < 0;
    if (typeof x === 'number') return !(x >= 0);
    return isSynthesized(x.pos) || isSynthesized(x.end);
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
    export function createTokenRange(pos: number, token: Syntax): TextRange {
      return new TextRange(pos, pos + Token.toString(token)!.length);
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

  export class SourceFile2 implements SourceFileLike {
    text = '';
    lineMap?: number[];
    lineStarts(): readonly number[] {
      return this.lineMap ?? (this.lineMap = Scanner.lineStarts(this.text));
    }
    lineAndCharOf(pos: number) {
      return Scanner.lineAndCharOf(this.lineStarts(), pos);
    }
    posOf(line: number, char: number): number;
    posOf(line: number, char: number, edits?: true): number;
    posOf(line: number, char: number, edits?: true): number {
      return Scanner.posOf(this.lineStarts(), line, char, this.text, edits);
    }
    linesBetween(p1: number, p2: number): number;
    linesBetween(r1: QRange, r2: QRange, comments: boolean): number;
    linesBetween(x1: QRange | number, x2: QRange | number, comments = false) {
      if (typeof x1 === 'number') {
        if (x1 === x2) return 0;
        assert(typeof x2 === 'number');
        const ss = this.lineStarts();
        const min = Math.min(x1, x2);
        const isNegative = min === x2;
        const max = isNegative ? x1 : x2;
        const lower = Scanner.lineOf(ss, min);
        const upper = Scanner.lineOf(ss, max, lower);
        return isNegative ? lower - upper : upper - lower;
      }
      const s = this.startPos(x2 as QRange, comments);
      return this.linesBetween(x1.end, s);
    }
    linesBetweenEnds(r1: QRange, r2: QRange) {
      return this.linesBetween(r1.end, r2.end);
    }
    linesToPrevNonWhitespace(pos: number, stop: number, comments = false) {
      const s = Scanner.skipTrivia(this.text, pos, false, comments);
      const p = this.prevNonWhitespacePos(s, stop);
      return this.linesBetween(p ?? stop, s);
    }
    linesToNextNonWhitespace(pos: number, stop: number, comments = false) {
      const s = Scanner.skipTrivia(this.text, pos, false, comments);
      return this.linesBetween(pos, Math.min(stop, s));
    }
    startPos(r: QRange, comments = false) {
      return isSynthesized(r.pos) ? -1 : Scanner.skipTrivia(this.text, r.pos, false, comments);
    }
    prevNonWhitespacePos(pos: number, stop = 0) {
      while (pos-- > stop) {
        if (!Scanner.isWhiteSpaceLike(this.text.charCodeAt(pos))) return pos;
      }
      return;
    }
    onSameLine(p1: number, p2: number) {
      return this.linesBetween(p1, p2) === 0;
    }
    onSingleLine(r: QRange) {
      return this.onSameLine(r.pos, r.end);
    }
    multiLine(a: NodeArray<Node>) {
      return !this.onSameLine(a.pos, a.end);
    }
    startsOnSameLine(r1: QRange, r2: QRange) {
      return this.onSameLine(this.startPos(r1), this.startPos(r2));
    }
    endsOnSameLine(r1: QRange, r2: QRange) {
      return this.onSameLine(r1.end, r2.end);
    }
    startOnSameLineAsEnd(r1: QRange, r2: QRange) {
      return this.onSameLine(this.startPos(r1), r2.end);
    }
    endOnSameLineAsStart(r1: QRange, r2: QRange) {
      return this.onSameLine(r1.end, this.startPos(r2));
    }
  }
}
