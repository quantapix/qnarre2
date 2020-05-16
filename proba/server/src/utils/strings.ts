export function endsWith(haystack: string, needle: string): boolean {
  let diff = haystack.length - needle.length;
  if (diff > 0) {
    return haystack.lastIndexOf(needle) === diff;
  } else if (diff === 0) {
    return haystack === needle;
  } else {
    return false;
  }
}

export function convertSimple2RegExpPattern(pattern: string): string {
  return pattern
    .replace(/[\-\\\{\}\+\?\|\^\$\.\,\[\]\(\)\#\s]/g, '\\$&')
    .replace(/[\*]/g, '.*');
}
