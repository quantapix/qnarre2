namespace qnr {
  export interface Span {
    start: number;
    length: number;
  }

  export interface Range {
    pos: number;
    end: number;
  }

  export namespace Range {
    export interface Change {
      span: Span;
      newLength: number;
    }
    export interface Comment extends Range {
      hasTrailingNewLine?: boolean;
      kind: CommentKind;
    }
    export interface SourceMap extends Range {
      source?: SourceMapSource;
    }
  }

  export function isSynthesized(x: number): boolean;
  export function isSynthesized(r: Range): boolean;
  export function isSynthesized(x: Range | number) {
    //  x === undefined || x === null || isNaN(x) || x < 0;
    if (typeof x === 'number') return !(x >= 0);
    return isSynthesized(x.pos) || isSynthesized(x.end);
  }

  export class TextSpan implements Span {
    constructor(public start = 0, public length = 0) {
      if (start < 0) throw new Error('start < 0');
      if (length < 0) throw new Error('length < 0');
    }
    get end() {
      return TextSpan.end(this);
    }
    isEmpty() {
      return this.length === 0;
    }
    contains(x: number): boolean;
    contains(x: Span): boolean;
    contains(x: Span | number) {
      if (typeof x === 'number') return x >= this.start && x < this.end;
      return x.start >= this.start && x.start + x.length <= this.end;
    }
    intersects(s: Span): boolean;
    intersects(start: number, length?: number): boolean;
    intersects(x: Span | number, length?: number) {
      if (typeof x === 'number') {
        if (length === undefined) return this.start <= x && x <= this.end;
        return TextSpan.intersecting(this.start, this.length, x, length);
      }
      return TextSpan.intersecting(this.start, this.length, x.start, x.length);
    }
    overlaps(s: Span) {
      return TextSpan.overlap(this, s) !== undefined;
    }
  }
  export namespace TextSpan {
    export function from(x: Range): TextSpan;
    export function from(start: number, end: number): TextSpan;
    export function from(x: Range | number, end?: number) {
      if (typeof x === 'number') return new TextSpan(x, end - x);
      return new TextSpan(x.pos, x.end - x.pos);
    }
    export function end(s: Span) {
      return s.start + s.length;
    }
    export function intersecting(s1: number, l1: number, s2: number, l2: number) {
      const e1 = s1 + l1;
      const e2 = s2 + l2;
      return s2 <= e1 && e2 >= s1;
    }
    export function intersection(s1: Span, s2: Span) {
      const s = Math.max(s1.start, s2.start);
      const e = Math.min(end(s1), end(s2));
      return s <= e ? from(s, e) : undefined;
    }
    export function overlap(s1: Span, s2: Span) {
      const r = intersection(s1, s2);
      return r?.length === 0 ? undefined : r;
    }
  }

  export namespace SourceFile {
    export function positionsAreOnSameLine(pos1: number, pos2: number, sourceFile: SourceFile) {
      return getLinesBetweenPositions(sourceFile, pos1, pos2) === 0;
    }
  }

  export class TextRange implements Range {
    constructor(public pos = 0, public end = 0) {
      if (pos > end && end !== -1) throw new Error('pos > end && end !== -1');
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
    getStartPos(s: SourceFile, includeComments: boolean) {
      return isSynthesized(this.pos) ? -1 : skipTrivia(s.text, this.pos, /*stopAfterLineBreak*/ false, includeComments);
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

    export function isOnSingleLine(s: SourceFile) {
      return startOnSameLineAsEnd(this, this, s);
    }
    export function rangeStartPositionsAreOnSameLine(range1: TextRange, range2: TextRange, sourceFile: SourceFile) {
      return positionsAreOnSameLine(
        getStartPositionOfRange(range1, sourceFile, /*includeComments*/ false),
        getStartPositionOfRange(range2, sourceFile, /*includeComments*/ false),
        sourceFile
      );
    }
    export function rangeEndPositionsAreOnSameLine(range1: TextRange, range2: TextRange, sourceFile: SourceFile) {
      return positionsAreOnSameLine(range1.end, range2.end, sourceFile);
    }

    export function startOnSameLineAsEnd(r1: TextRange, r2: TextRange, s: SourceFile) {
      return positionsAreOnSameLine(r1.getStartPos(s, /*includeComments*/ false), r2.end, s);
    }

    export function rangeEndIsOnSameLineAsRangeStart(r1: TextRange, r2: TextRange, s: SourceFile) {
      return positionsAreOnSameLine(r1.end, r2.getStartPos(s, /*includeComments*/ false), s);
    }
  }

  export class TextChange implements Range.Change {
    constructor(public span: Span = new TextSpan(), public newLength = 0) {
      if (newLength < 0) throw new Error('newLength < 0');
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

    export function collapse(cs: readonly Range.Change[]) {
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
