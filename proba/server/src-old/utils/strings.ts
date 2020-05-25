import leven from 'leven';
import { compareComparableValues, Comparison } from './misc';

export function getWordAtText(
  text: string,
  offset: number,
  wordDefinition: RegExp
): { start: number; length: number } {
  let lineStart = offset;
  while (lineStart > 0 && !isNewlineCharacter(text.charCodeAt(lineStart - 1))) {
    lineStart--;
  }
  const offsetInLine = offset - lineStart;
  const lineText = text.substr(lineStart);
  const flags = wordDefinition.ignoreCase ? 'gi' : 'g';
  wordDefinition = new RegExp(wordDefinition.source, flags);

  let match = wordDefinition.exec(lineText);
  while (match && match.index + match[0].length < offsetInLine) {
    match = wordDefinition.exec(lineText);
  }
  if (match && match.index <= offsetInLine) {
    return { start: match.index + lineStart, length: match[0].length };
  }

  return { start: offset, length: 0 };
}

export function startsWith(t: string, s: string) {
  if (t.length < s.length) return false;
  for (let i = 0; i < s.length; i++) {
    if (t[i] !== s[i]) return false;
  }
  return true;
}

export function endsWith(t: string, s: string) {
  const d = t.length - s.length;
  if (d > 0) return t.lastIndexOf(s) === d;
  if (d === 0) return t === s;
  return false;
}

export function repeat(value: string, count: number) {
  let s = '';
  while (count > 0) {
    if ((count & 1) === 1) {
      s += value;
    }
    value += value;
    count = count >>> 1;
  }
  return s;
}

export function isWhitespaceOnly(str: string) {
  return /^\s*$/.test(str);
}

export function isEOL(content: string, offset: number) {
  return isNewlineCharacter(content.charCodeAt(offset));
}

const CR = '\r'.charCodeAt(0);
const NL = '\n'.charCodeAt(0);
export function isNewlineCharacter(charCode: number) {
  return charCode === CR || charCode === NL;
}

export function convertSimple2RegExpPattern(pattern: string): string {
  return pattern.replace(/[-\\{}+?|^$.,[\]()#\s]/g, '\\$&').replace(/[*]/g, '.*');
}

export function computeCompletionSimilarity(
  typedValue: string,
  symbolName: string
): number {
  if (symbolName.startsWith(typedValue)) {
    return 1;
  }
  const symbolLower = symbolName.toLocaleLowerCase();
  const typedLower = typedValue.toLocaleLowerCase();
  if (symbolLower.startsWith(typedLower)) {
    return 0.75;
  }
  let symbolSubstrLength = symbolLower.length;
  let smallestEditDistance = Number.MAX_VALUE;
  while (symbolSubstrLength > 0) {
    const editDistance = leven(symbolLower.substr(0, symbolSubstrLength), typedLower);
    if (editDistance < smallestEditDistance) {
      smallestEditDistance = editDistance;
    }
    symbolSubstrLength--;
  }
  if (smallestEditDistance >= typedValue.length) {
    return 0;
  }
  const similarity = (typedValue.length - smallestEditDistance) / typedValue.length;
  return 0.5 * similarity;
}

export function hashString(contents: string) {
  let hash = 0;

  for (let i = 0; i < contents.length; i++) {
    hash = ((hash << 5) - hash + contents.charCodeAt(i)) | 0;
  }
  return hash;
}

export function compareStringsCaseInsensitive(
  a: string | undefined,
  b: string | undefined
): Comparison {
  return a === b
    ? Comparison.EqualTo
    : a === undefined
    ? Comparison.LessThan
    : b === undefined
    ? Comparison.GreaterThan
    : compareComparableValues(a.toUpperCase(), b.toUpperCase());
}

export function compareStringsCaseSensitive(
  a: string | undefined,
  b: string | undefined
): Comparison {
  return compareComparableValues(a, b);
}

export function getStringComparer(ignoreCase?: boolean) {
  return ignoreCase ? compareStringsCaseInsensitive : compareStringsCaseSensitive;
}

export function equateStringsCaseInsensitive(a: string, b: string) {
  return compareStringsCaseInsensitive(a, b) === Comparison.EqualTo;
}

export function equateStringsCaseSensitive(a: string, b: string) {
  return compareStringsCaseSensitive(a, b) === Comparison.EqualTo;
}
