import { assert } from './debug';
import { Position, Range, TextRange } from './text';
import { TextRangeCollection } from './text';

export function beforeOrSame(p1: Position, p2: Position) {
  return p1.line < p2.line || (p1.line === p2.line && p1.character <= p2.character);
}
export function insideRangeButNotSame(r1: Range, r2: Range) {
  return (
    beforeOrSame(r1.start, r2.start) &&
    beforeOrSame(r2.end, r1.end) &&
    !equalRange(r1, r2)
  );
}
export function equalRange(r1: Range, r2: Range) {
  return (
    r1.start.line === r2.start.line &&
    r1.start.character === r2.start.character &&
    r1.end.line === r2.end.line &&
    r1.end.character === r2.end.character
  );
}

export function convertOffsetToPosition(
  offset: number,
  lines: TextRangeCollection<TextRange>
): Position {
  if (lines.end === 0) {
    return {
      line: 0,
      character: 0,
    };
  }
  if (offset >= lines.end) offset = lines.end - 1;
  const itemIndex = lines.getItemContaining(offset);
  assert(itemIndex >= 0 && itemIndex <= lines.length);
  const lineRange = lines.getItemAt(itemIndex);
  assert(lineRange !== undefined);
  return {
    line: itemIndex,
    character: offset - lineRange.start,
  };
}

export function convertOffsetsToRange(
  startOffset: number,
  endOffset: number,
  lines: TextRangeCollection<TextRange>
): Range {
  const start = convertOffsetToPosition(startOffset, lines);
  const end = convertOffsetToPosition(endOffset, lines);
  return { start, end };
}

export function convertPositionToOffset(
  position: Position,
  lines: TextRangeCollection<TextRange>
): number | undefined {
  if (position.line >= lines.count) {
    return undefined;
  }
  return lines.getItemAt(position.line).start + position.character;
}

export function convertRangeToTextRange(
  range: Range,
  lines: TextRangeCollection<TextRange>
): TextRange | undefined {
  const start = convertPositionToOffset(range.start, lines);
  if (!start) {
    return undefined;
  }

  const end = convertPositionToOffset(range.end, lines);
  if (!end) {
    return undefined;
  }

  return TextRange.fromBounds(start, end);
}
