namespace core {
  const versionRegExp = /^(0|[1-9]\d*)(?:\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*)(?:\-([a-z0-9-.]+))?(?:\+([a-z0-9-.]+))?)?)?$/i;

  const prereleaseRegExp = /^(?:0|[1-9]\d*|[a-z-][a-z0-9-]*)(?:\.(?:0|[1-9]\d*|[a-z-][a-z0-9-]*))*$/i;

  const buildRegExp = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/i;

  const numericIdentifierRegExp = /^(0|[1-9]\d*)$/;

  export class Version {
    static readonly zero = new Version(0, 0, 0);

    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    readonly prerelease: readonly string[];
    readonly build: readonly string[];

    constructor(text: string);
    constructor(major: number, minor?: number, patch?: number, prerelease?: string, build?: string);
    constructor(major: number | string, minor = 0, patch = 0, prerelease = '', build = '') {
      if (typeof major === 'string') {
        const result = Debug.checkDefined(tryParseComponents(major), 'Invalid version');
        ({ major, minor, patch, prerelease, build } = result);
      }

      assert(major >= 0, 'Invalid argument: major');
      assert(minor >= 0, 'Invalid argument: minor');
      assert(patch >= 0, 'Invalid argument: patch');
      assert(!prerelease || prereleaseRegExp.test(prerelease), 'Invalid argument: prerelease');
      assert(!build || buildRegExp.test(build), 'Invalid argument: build');
      this.major = major;
      this.minor = minor;
      this.patch = patch;
      this.prerelease = prerelease ? prerelease.split('.') : emptyArray;
      this.build = build ? build.split('.') : emptyArray;
    }

    static tryParse(text: string) {
      const result = tryParseComponents(text);
      if (!result) return;

      const { major, minor, patch, prerelease, build } = result;
      return new Version(major, minor, patch, prerelease, build);
    }

    compareTo(other: Version | undefined) {
      if (this === other) return Comparison.EqualTo;
      if (other === undefined) return Comparison.GreaterThan;
      return (
        compareValues(this.major, other.major) || compareValues(this.minor, other.minor) || compareValues(this.patch, other.patch) || comparePrerelaseIdentifiers(this.prerelease, other.prerelease)
      );
    }

    increment(field: 'major' | 'minor' | 'patch') {
      switch (field) {
        case 'major':
          return new Version(this.major + 1, 0, 0);
        case 'minor':
          return new Version(this.major, this.minor + 1, 0);
        case 'patch':
          return new Version(this.major, this.minor, this.patch + 1);
        default:
          return Debug.assertNever(field);
      }
    }

    toString() {
      let result = `${this.major}.${this.minor}.${this.patch}`;
      if (some(this.prerelease)) result += `-${this.prerelease.join('.')}`;
      if (some(this.build)) result += `+${this.build.join('.')}`;
      return result;
    }
  }

  function tryParseComponents(text: string) {
    const match = versionRegExp.exec(text);
    if (!match) return;

    const [, major, minor = '0', patch = '0', prerelease = '', build = ''] = match;
    if (prerelease && !prereleaseRegExp.test(prerelease)) return;
    if (build && !buildRegExp.test(build)) return;
    return {
      major: parseInt(major, 10),
      minor: parseInt(minor, 10),
      patch: parseInt(patch, 10),
      prerelease,
      build,
    };
  }

  function comparePrerelaseIdentifiers(left: readonly string[], right: readonly string[]) {
    if (left === right) return Comparison.EqualTo;
    if (left.length === 0) return right.length === 0 ? Comparison.EqualTo : Comparison.GreaterThan;
    if (right.length === 0) return Comparison.LessThan;

    const length = Math.min(left.length, right.length);
    for (let i = 0; i < length; i++) {
      const leftIdentifier = left[i];
      const rightIdentifier = right[i];
      if (leftIdentifier === rightIdentifier) continue;

      const leftIsNumeric = numericIdentifierRegExp.test(leftIdentifier);
      const rightIsNumeric = numericIdentifierRegExp.test(rightIdentifier);
      if (leftIsNumeric || rightIsNumeric) {
        if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? Comparison.LessThan : Comparison.GreaterThan;

        const result = compareValues(+leftIdentifier, +rightIdentifier);
        if (result) return result;
      } else {
        const result = compareStringsCaseSensitive(leftIdentifier, rightIdentifier);
        if (result) return result;
      }
    }

    return compareValues(left.length, right.length);
  }

  export class VersionRange {
    private _alternatives: readonly (readonly Comparator[])[];

    constructor(spec: string) {
      this._alternatives = spec ? Debug.checkDefined(parseRange(spec), 'Invalid range spec.') : emptyArray;
    }

    static tryParse(text: string) {
      const sets = parseRange(text);
      if (sets) {
        const range = new VersionRange('');
        range._alternatives = sets;
        return range;
      }
      return;
    }

    test(version: Version | string) {
      if (typeof version === 'string') version = new Version(version);
      return testDisjunction(version, this._alternatives);
    }

    toString() {
      return formatDisjunction(this._alternatives);
    }
  }

  interface Comparator {
    readonly operator: '<' | '<=' | '>' | '>=' | '=';
    readonly operand: Version;
  }

  const logicalOrRegExp = /\s*\|\|\s*/g;
  const whitespaceRegExp = /\s+/g;

  const partialRegExp = /^([xX*0]|[1-9]\d*)(?:\.([xX*0]|[1-9]\d*)(?:\.([xX*0]|[1-9]\d*)(?:-([a-z0-9-.]+))?(?:\+([a-z0-9-.]+))?)?)?$/i;

  const hyphenRegExp = /^\s*([a-z0-9-+.*]+)\s+-\s+([a-z0-9-+.*]+)\s*$/i;

  const rangeRegExp = /^\s*(~|\^|<|<=|>|>=|=)?\s*([a-z0-9-+.*]+)$/i;

  function parseRange(text: string) {
    const alternatives: Comparator[][] = [];
    for (const range of text.trim().split(logicalOrRegExp)) {
      if (!range) continue;
      const comparators: Comparator[] = [];
      const match = hyphenRegExp.exec(range);
      if (match) {
        if (!parseHyphen(match[1], match[2], comparators)) return;
      } else {
        for (const simple of range.split(whitespaceRegExp)) {
          const match = rangeRegExp.exec(simple);
          if (!match || !parseComparator(match[1], match[2], comparators)) return;
        }
      }
      alternatives.push(comparators);
    }
    return alternatives;
  }

  function parsePartial(text: string) {
    const match = partialRegExp.exec(text);
    if (!match) return;

    const [, major, minor = '*', patch = '*', prerelease, build] = match;
    const version = new Version(
      isWildcard(major) ? 0 : parseInt(major, 10),
      isWildcard(major) || isWildcard(minor) ? 0 : parseInt(minor, 10),
      isWildcard(major) || isWildcard(minor) || isWildcard(patch) ? 0 : parseInt(patch, 10),
      prerelease,
      build
    );

    return { version, major, minor, patch };
  }

  function parseHyphen(left: string, right: string, comparators: Comparator[]) {
    const leftResult = parsePartial(left);
    if (!leftResult) return false;

    const rightResult = parsePartial(right);
    if (!rightResult) return false;

    if (!isWildcard(leftResult.major)) {
      comparators.push(createComparator('>=', leftResult.version));
    }

    if (!isWildcard(rightResult.major)) {
      comparators.push(
        isWildcard(rightResult.minor)
          ? createComparator('<', rightResult.version.increment('major'))
          : isWildcard(rightResult.patch)
          ? createComparator('<', rightResult.version.increment('minor'))
          : createComparator('<=', rightResult.version)
      );
    }

    return true;
  }

  function parseComparator(operator: string, text: string, comparators: Comparator[]) {
    const result = parsePartial(text);
    if (!result) return false;

    const { version, major, minor, patch } = result;
    if (!isWildcard(major)) {
      switch (operator) {
        case '~':
          comparators.push(createComparator('>=', version));
          comparators.push(createComparator('<', version.increment(isWildcard(minor) ? 'major' : 'minor')));
          break;
        case '^':
          comparators.push(createComparator('>=', version));
          comparators.push(createComparator('<', version.increment(version.major > 0 || isWildcard(minor) ? 'major' : version.minor > 0 || isWildcard(patch) ? 'minor' : 'patch')));
          break;
        case '<':
        case '>=':
          comparators.push(createComparator(operator, version));
          break;
        case '<=':
        case '>':
          comparators.push(
            isWildcard(minor)
              ? createComparator(operator === '<=' ? '<' : '>=', version.increment('major'))
              : isWildcard(patch)
              ? createComparator(operator === '<=' ? '<' : '>=', version.increment('minor'))
              : createComparator(operator, version)
          );
          break;
        case '=':
        case undefined:
          if (isWildcard(minor) || isWildcard(patch)) {
            comparators.push(createComparator('>=', version));
            comparators.push(createComparator('<', version.increment(isWildcard(minor) ? 'major' : 'minor')));
          } else {
            comparators.push(createComparator('=', version));
          }
          break;
        default:
          return false;
      }
    } else if (operator === '<' || operator === '>') {
      comparators.push(createComparator('<', Version.zero));
    }

    return true;
  }

  function isWildcard(part: string) {
    return part === '*' || part === 'x' || part === 'X';
  }

  function createComparator(operator: Comparator['operator'], operand: Version) {
    return { operator, operand };
  }

  function testDisjunction(version: Version, alternatives: readonly (readonly Comparator[])[]) {
    if (alternatives.length === 0) return true;
    for (const alternative of alternatives) {
      if (testAlternative(version, alternative)) return true;
    }
    return false;
  }

  function testAlternative(version: Version, comparators: readonly Comparator[]) {
    for (const comparator of comparators) {
      if (!testComparator(version, comparator.operator, comparator.operand)) return false;
    }
    return true;
  }

  function testComparator(version: Version, operator: Comparator['operator'], operand: Version) {
    const cmp = version.compareTo(operand);
    switch (operator) {
      case '<':
        return cmp < 0;
      case '<=':
        return cmp <= 0;
      case '>':
        return cmp > 0;
      case '>=':
        return cmp >= 0;
      case '=':
        return cmp === 0;
      default:
        return Debug.assertNever(operator);
    }
  }

  function formatDisjunction(alternatives: readonly (readonly Comparator[])[]) {
    return map(alternatives, formatAlternative).join(' || ') || '*';
  }

  function formatAlternative(comparators: readonly Comparator[]) {
    return map(comparators, formatComparator).join(' ');
  }

  function formatComparator(comparator: Comparator) {
    return `${comparator.operator}${comparator.operand}`;
  }
}
