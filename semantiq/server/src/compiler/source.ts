export interface SourceMapGeneratorOptions {
  extendedDiagnostics?: boolean;
}
export function createSourceMapGenerator(host: EmitHost, file: string, sourceRoot: string, sourcesDirectoryPath: string, generatorOptions: SourceMapGeneratorOptions): SourceMapGenerator {
  const { enter, exit } = generatorOptions.extendedDiagnostics ? performance.createTimer('Source Map', 'beforeSourcemap', 'afterSourcemap') : performance.nullTimer;
  const rawSources: string[] = [];
  const sources: string[] = [];
  const sourceToSourceIndexMap = createMap<number>();
  let sourcesContent: (string | null)[] | undefined;
  const names: string[] = [];
  let nameToNameIndexMap: Map<number> | undefined;
  let mappings = '';
  let lastGeneratedLine = 0;
  let lastGeneratedCharacter = 0;
  let lastSourceIndex = 0;
  let lastSourceLine = 0;
  let lastSourceCharacter = 0;
  let lastNameIndex = 0;
  let hasLast = false;
  let pendingGeneratedLine = 0;
  let pendingGeneratedCharacter = 0;
  let pendingSourceIndex = 0;
  let pendingSourceLine = 0;
  let pendingSourceCharacter = 0;
  let pendingNameIndex = 0;
  let hasPending = false;
  let hasPendingSource = false;
  let hasPendingName = false;
  return {
    getSources: () => rawSources,
    addSource,
    setSourceContent,
    addName,
    addMapping,
    appendSourceMap,
    toJSON,
    toString: () => JSON.stringify(toJSON()),
  };
  function addSource(fileName: string) {
    enter();
    const source = getRelativePathToDirectoryOrUrl(sourcesDirectoryPath, fileName, host.getCurrentDirectory(), host.getCanonicalFileName, true);
    let sourceIndex = sourceToSourceIndexMap.get(source);
    if (sourceIndex === undefined) {
      sourceIndex = sources.length;
      sources.push(source);
      rawSources.push(fileName);
      sourceToSourceIndexMap.set(source, sourceIndex);
    }
    exit();
    return sourceIndex;
  }
  function setSourceContent(sourceIndex: number, content: string | null) {
    enter();
    if (content !== null) {
      if (!sourcesContent) sourcesContent = [];
      while (sourcesContent.length < sourceIndex) {
        sourcesContent.push(null);
      }
      sourcesContent[sourceIndex] = content;
    }
    exit();
  }
  function addName(name: string) {
    enter();
    if (!nameToNameIndexMap) nameToNameIndexMap = createMap();
    let nameIndex = nameToNameIndexMap.get(name);
    if (nameIndex === undefined) {
      nameIndex = names.length;
      names.push(name);
      nameToNameIndexMap.set(name, nameIndex);
    }
    exit();
    return nameIndex;
  }
  function isNewGeneratedPosition(generatedLine: number, generatedCharacter: number) {
    return !hasPending || pendingGeneratedLine !== generatedLine || pendingGeneratedCharacter !== generatedCharacter;
  }
  function isBacktrackingSourcePosition(sourceIndex: number | undefined, sourceLine: number | undefined, sourceCharacter: number | undefined) {
    return (
      sourceIndex !== undefined &&
      sourceLine !== undefined &&
      sourceCharacter !== undefined &&
      pendingSourceIndex === sourceIndex &&
      (pendingSourceLine > sourceLine || (pendingSourceLine === sourceLine && pendingSourceCharacter > sourceCharacter))
    );
  }
  function addMapping(generatedLine: number, generatedCharacter: number, sourceIndex?: number, sourceLine?: number, sourceCharacter?: number, nameIndex?: number) {
    assert(generatedLine >= pendingGeneratedLine, 'generatedLine cannot backtrack');
    assert(generatedCharacter >= 0, 'generatedCharacter cannot be negative');
    assert(sourceIndex === undefined || sourceIndex >= 0, 'sourceIndex cannot be negative');
    assert(sourceLine === undefined || sourceLine >= 0, 'sourceLine cannot be negative');
    assert(sourceCharacter === undefined || sourceCharacter >= 0, 'sourceCharacter cannot be negative');
    enter();
    if (isNewGeneratedPosition(generatedLine, generatedCharacter) || isBacktrackingSourcePosition(sourceIndex, sourceLine, sourceCharacter)) {
      commitPendingMapping();
      pendingGeneratedLine = generatedLine;
      pendingGeneratedCharacter = generatedCharacter;
      hasPendingSource = false;
      hasPendingName = false;
      hasPending = true;
    }
    if (sourceIndex !== undefined && sourceLine !== undefined && sourceCharacter !== undefined) {
      pendingSourceIndex = sourceIndex;
      pendingSourceLine = sourceLine;
      pendingSourceCharacter = sourceCharacter;
      hasPendingSource = true;
      if (nameIndex !== undefined) {
        pendingNameIndex = nameIndex;
        hasPendingName = true;
      }
    }
    exit();
  }
  function appendSourceMap(generatedLine: number, generatedCharacter: number, map: RawSourceMap, sourceMapPath: string, start?: LineAndChar, end?: LineAndChar) {
    assert(generatedLine >= pendingGeneratedLine, 'generatedLine cannot backtrack');
    assert(generatedCharacter >= 0, 'generatedCharacter cannot be negative');
    enter();
    const sourceIndexToNewSourceIndexMap: number[] = [];
    let nameIndexToNewNameIndexMap: number[] | undefined;
    const mappingIterator = decodeMappings(map.mappings);
    for (let iterResult = mappingIterator.next(); !iterResult.done; iterResult = mappingIterator.next()) {
      const raw = iterResult.value;
      if (end && (raw.generatedLine > end.line || (raw.generatedLine === end.line && raw.generatedCharacter > end.character))) {
        break;
      }
      if (start && (raw.generatedLine < start.line || (start.line === raw.generatedLine && raw.generatedCharacter < start.character))) {
        continue;
      }
      let newSourceIndex: number | undefined;
      let newSourceLine: number | undefined;
      let newSourceCharacter: number | undefined;
      let newNameIndex: number | undefined;
      if (raw.sourceIndex !== undefined) {
        newSourceIndex = sourceIndexToNewSourceIndexMap[raw.sourceIndex];
        if (newSourceIndex === undefined) {
          const rawPath = map.sources[raw.sourceIndex];
          const relativePath = map.sourceRoot ? combinePaths(map.sourceRoot, rawPath) : rawPath;
          const combinedPath = combinePaths(getDirectoryPath(sourceMapPath), relativePath);
          sourceIndexToNewSourceIndexMap[raw.sourceIndex] = newSourceIndex = addSource(combinedPath);
          if (map.sourcesContent && typeof map.sourcesContent[raw.sourceIndex] === 'string') {
            setSourceContent(newSourceIndex, map.sourcesContent[raw.sourceIndex]);
          }
        }
        newSourceLine = raw.sourceLine;
        newSourceCharacter = raw.sourceCharacter;
        if (map.names && raw.nameIndex !== undefined) {
          if (!nameIndexToNewNameIndexMap) nameIndexToNewNameIndexMap = [];
          newNameIndex = nameIndexToNewNameIndexMap[raw.nameIndex];
          if (newNameIndex === undefined) {
            nameIndexToNewNameIndexMap[raw.nameIndex] = newNameIndex = addName(map.names[raw.nameIndex]);
          }
        }
      }
      const rawGeneratedLine = raw.generatedLine - (start ? start.line : 0);
      const newGeneratedLine = rawGeneratedLine + generatedLine;
      const rawGeneratedCharacter = start && start.line === raw.generatedLine ? raw.generatedCharacter - start.character : raw.generatedCharacter;
      const newGeneratedCharacter = rawGeneratedLine === 0 ? rawGeneratedCharacter + generatedCharacter : rawGeneratedCharacter;
      addMapping(newGeneratedLine, newGeneratedCharacter, newSourceIndex, newSourceLine, newSourceCharacter, newNameIndex);
    }
    exit();
  }
  function shouldCommitMapping() {
    return (
      !hasLast ||
      lastGeneratedLine !== pendingGeneratedLine ||
      lastGeneratedCharacter !== pendingGeneratedCharacter ||
      lastSourceIndex !== pendingSourceIndex ||
      lastSourceLine !== pendingSourceLine ||
      lastSourceCharacter !== pendingSourceCharacter ||
      lastNameIndex !== pendingNameIndex
    );
  }
  function commitPendingMapping() {
    if (!hasPending || !shouldCommitMapping()) {
      return;
    }
    enter();
    if (lastGeneratedLine < pendingGeneratedLine) {
      do {
        mappings += ';';
        lastGeneratedLine++;
        lastGeneratedCharacter = 0;
      } while (lastGeneratedLine < pendingGeneratedLine);
    } else {
      Debug.assertEqual(lastGeneratedLine, pendingGeneratedLine, 'generatedLine cannot backtrack');
      if (hasLast) {
        mappings += ',';
      }
    }
    mappings += base64VLQFormatEncode(pendingGeneratedCharacter - lastGeneratedCharacter);
    lastGeneratedCharacter = pendingGeneratedCharacter;
    if (hasPendingSource) {
      mappings += base64VLQFormatEncode(pendingSourceIndex - lastSourceIndex);
      lastSourceIndex = pendingSourceIndex;
      mappings += base64VLQFormatEncode(pendingSourceLine - lastSourceLine);
      lastSourceLine = pendingSourceLine;
      mappings += base64VLQFormatEncode(pendingSourceCharacter - lastSourceCharacter);
      lastSourceCharacter = pendingSourceCharacter;
      if (hasPendingName) {
        mappings += base64VLQFormatEncode(pendingNameIndex - lastNameIndex);
        lastNameIndex = pendingNameIndex;
      }
    }
    hasLast = true;
    exit();
  }
  function toJSON(): RawSourceMap {
    commitPendingMapping();
    return {
      version: 3,
      file,
      sourceRoot,
      sources,
      names,
      mappings,
      sourcesContent,
    };
  }
}
const sourceMapCommentRegExp = /^\/\/[@#] source[M]appingURL=(.+)\s*$/;
const whitespaceOrMapCommentRegExp = /^\s*(\/\/[@#] .*)?$/;
export interface LineInfo {
  getLineCount(): number;
  getLineText(line: number): string;
}
export function getLineInfo(text: string, lineStarts: readonly number[]): LineInfo {
  return {
    getLineCount: () => lineStarts.length,
    getLineText: (line) => text.substring(lineStarts[line], lineStarts[line + 1]),
  };
}
export function tryGetSourceMappingURL(lineInfo: LineInfo) {
  for (let index = lineInfo.getLineCount() - 1; index >= 0; index--) {
    const line = lineInfo.getLineText(index);
    const comment = sourceMapCommentRegExp.exec(line);
    if (comment) return comment[1];
    else if (!line.match(whitespaceOrMapCommentRegExp)) {
      break;
    }
  }
}
function isStringOrNull(x: any) {
  return typeof x === 'string' || x === null;
}
export function isRawSourceMap(x: any): x is RawSourceMap {
  return (
    x !== null &&
    typeof x === 'object' &&
    x.version === 3 &&
    typeof x.file === 'string' &&
    typeof x.mappings === 'string' &&
    isArray(x.sources) &&
    every(x.sources, isString) &&
    (x.sourceRoot === undefined || x.sourceRoot === null || typeof x.sourceRoot === 'string') &&
    (x.sourcesContent === undefined || x.sourcesContent === null || (isArray(x.sourcesContent) && every(x.sourcesContent, isStringOrNull))) &&
    (x.names === undefined || x.names === null || (isArray(x.names) && every(x.names, isString)))
  );
}
export function tryParseRawSourceMap(text: string) {
  try {
    const parsed = JSON.parse(text);
    if (isRawSourceMap(parsed)) return parsed;
  } catch {}
  return;
}
export interface MappingsDecoder extends Iterator<Mapping> {
  readonly pos: number;
  readonly error: string | undefined;
  readonly state: Required<Mapping>;
}
export interface Mapping {
  generatedLine: number;
  generatedCharacter: number;
  sourceIndex?: number;
  sourceLine?: number;
  sourceCharacter?: number;
  nameIndex?: number;
}
export interface SourceMapping extends Mapping {
  sourceIndex: number;
  sourceLine: number;
  sourceCharacter: number;
}
export function decodeMappings(mappings: string): MappingsDecoder {
  let done = false;
  let pos = 0;
  let generatedLine = 0;
  let generatedCharacter = 0;
  let sourceIndex = 0;
  let sourceLine = 0;
  let sourceCharacter = 0;
  let nameIndex = 0;
  let error: string | undefined;
  return {
    get pos() {
      return pos;
    },
    get error() {
      return error;
    },
    get state() {
      return captureMapping(true);
    },
    next() {
      while (!done && pos < mappings.length) {
        const ch = mappings.charCodeAt(pos);
        if (ch === Codes.semicolon) {
          generatedLine++;
          generatedCharacter = 0;
          pos++;
          continue;
        }
        if (ch === Codes.comma) {
          pos++;
          continue;
        }
        let hasSource = false;
        let hasName = false;
        generatedCharacter += base64VLQFormatDecode();
        if (hasReportedError()) return stopIterating();
        if (generatedCharacter < 0) return setErrorAndStopIterating('Invalid generatedCharacter found');
        if (!isSourceMappingSegmentEnd()) {
          hasSource = true;
          sourceIndex += base64VLQFormatDecode();
          if (hasReportedError()) return stopIterating();
          if (sourceIndex < 0) return setErrorAndStopIterating('Invalid sourceIndex found');
          if (isSourceMappingSegmentEnd()) return setErrorAndStopIterating('Unsupported Format: No entries after sourceIndex');
          sourceLine += base64VLQFormatDecode();
          if (hasReportedError()) return stopIterating();
          if (sourceLine < 0) return setErrorAndStopIterating('Invalid sourceLine found');
          if (isSourceMappingSegmentEnd()) return setErrorAndStopIterating('Unsupported Format: No entries after sourceLine');
          sourceCharacter += base64VLQFormatDecode();
          if (hasReportedError()) return stopIterating();
          if (sourceCharacter < 0) return setErrorAndStopIterating('Invalid sourceCharacter found');
          if (!isSourceMappingSegmentEnd()) {
            hasName = true;
            nameIndex += base64VLQFormatDecode();
            if (hasReportedError()) return stopIterating();
            if (nameIndex < 0) return setErrorAndStopIterating('Invalid nameIndex found');
            if (!isSourceMappingSegmentEnd()) return setErrorAndStopIterating('Unsupported Error Format: Entries after nameIndex');
          }
        }
        return { value: captureMapping(hasSource, hasName), done };
      }
      return stopIterating();
    },
  };
  function captureMapping(hasSource: true, hasName: true): Required<Mapping>;
  function captureMapping(hasSource: boolean, hasName: boolean): Mapping;
  function captureMapping(hasSource: boolean, hasName: boolean): Mapping {
    return {
      generatedLine,
      generatedCharacter,
      sourceIndex: hasSource ? sourceIndex : undefined,
      sourceLine: hasSource ? sourceLine : undefined,
      sourceCharacter: hasSource ? sourceCharacter : undefined,
      nameIndex: hasName ? nameIndex : undefined,
    };
  }
  function stopIterating(): { value: never; done: true } {
    done = true;
    return { value: undefined!, done: true };
  }
  function setError(message: string) {
    if (error === undefined) {
      error = message;
    }
  }
  function setErrorAndStopIterating(message: string) {
    setError(message);
    return stopIterating();
  }
  function hasReportedError() {
    return error !== undefined;
  }
  function isSourceMappingSegmentEnd() {
    return pos === mappings.length || mappings.charCodeAt(pos) === Codes.comma || mappings.charCodeAt(pos) === Codes.semicolon;
  }
  function base64VLQFormatDecode(): number {
    let moreDigits = true;
    let shiftCount = 0;
    let value = 0;
    for (; moreDigits; pos++) {
      if (pos >= mappings.length) return setError('Error in decoding base64VLQFormatDecode, past the mapping string'), -1;
      const currentByte = base64FormatDecode(mappings.charCodeAt(pos));
      if (currentByte === -1) return setError('Invalid character in VLQ'), -1;
      moreDigits = (currentByte & 32) !== 0;
      value = value | ((currentByte & 31) << shiftCount);
      shiftCount += 5;
    }
    if ((value & 1) === 0) {
      value = value >> 1;
    } else {
      value = value >> 1;
      value = -value;
    }
    return value;
  }
}
export function sameMapping<T extends Mapping>(left: T, right: T) {
  return (
    left === right ||
    (left.generatedLine === right.generatedLine &&
      left.generatedCharacter === right.generatedCharacter &&
      left.sourceIndex === right.sourceIndex &&
      left.sourceLine === right.sourceLine &&
      left.sourceCharacter === right.sourceCharacter &&
      left.nameIndex === right.nameIndex)
  );
}
export function isSourceMapping(mapping: Mapping): mapping is SourceMapping {
  return mapping.sourceIndex !== undefined && mapping.sourceLine !== undefined && mapping.sourceCharacter !== undefined;
}
function base64FormatEncode(value: number) {
  return value >= 0 && value < 26
    ? Codes.A + value
    : value >= 26 && value < 52
    ? Codes.a + value - 26
    : value >= 52 && value < 62
    ? Codes._0 + value - 52
    : value === 62
    ? Codes.plus
    : value === 63
    ? Codes.slash
    : fail(`${value}: not a base64 value`);
}
function base64FormatDecode(ch: number) {
  return ch >= Codes.A && ch <= Codes.Z
    ? ch - Codes.A
    : ch >= Codes.a && ch <= Codes.z
    ? ch - Codes.a + 26
    : ch >= Codes._0 && ch <= Codes._9
    ? ch - Codes._0 + 52
    : ch === Codes.plus
    ? 62
    : ch === Codes.slash
    ? 63
    : -1;
}
function base64VLQFormatEncode(inValue: number) {
  if (inValue < 0) {
    inValue = (-inValue << 1) + 1;
  } else {
    inValue = inValue << 1;
  }
  let encodedStr = '';
  do {
    let currentDigit = inValue & 31;
    inValue = inValue >> 5;
    if (inValue > 0) {
      currentDigit = currentDigit | 32;
    }
    encodedStr = encodedStr + String.fromCharCode(base64FormatEncode(currentDigit));
  } while (inValue > 0);
  return encodedStr;
}
interface MappedPosition {
  generatedPosition: number;
  source: string | undefined;
  sourceIndex: number | undefined;
  sourcePosition: number | undefined;
  nameIndex: number | undefined;
}
interface SourceMappedPosition extends MappedPosition {
  source: string;
  sourceIndex: number;
  sourcePosition: number;
}
function isSourceMappedPosition(value: MappedPosition): value is SourceMappedPosition {
  return value.sourceIndex !== undefined && value.sourcePosition !== undefined;
}
function sameMappedPosition(left: MappedPosition, right: MappedPosition) {
  return left.generatedPosition === right.generatedPosition && left.sourceIndex === right.sourceIndex && left.sourcePosition === right.sourcePosition;
}
function compareSourcePositions(left: SourceMappedPosition, right: SourceMappedPosition) {
  assert(left.sourceIndex === right.sourceIndex);
  return compareValues(left.sourcePosition, right.sourcePosition);
}
function compareGeneratedPositions(left: MappedPosition, right: MappedPosition) {
  return compareValues(left.generatedPosition, right.generatedPosition);
}
function getSourcePositionOfMapping(value: SourceMappedPosition) {
  return value.sourcePosition;
}
function getGeneratedPositionOfMapping(value: MappedPosition) {
  return value.generatedPosition;
}
export function createDocumentPositionMapper(host: DocumentPositionMapperHost, map: RawSourceMap, mapPath: string): DocumentPositionMapper {
  const mapDirectory = getDirectoryPath(mapPath);
  const sourceRoot = map.sourceRoot ? getNormalizedAbsolutePath(map.sourceRoot, mapDirectory) : mapDirectory;
  const generatedAbsoluteFilePath = getNormalizedAbsolutePath(map.file, mapDirectory);
  const generatedFile = host.getSourceFileLike(generatedAbsoluteFilePath);
  const sourceFileAbsolutePaths = map.sources.map((source) => getNormalizedAbsolutePath(source, sourceRoot));
  const sourceToSourceIndexMap = createMap(sourceFileAbsolutePaths.map((source, i) => [host.getCanonicalFileName(source), i] as [string, number]));
  let decodedMappings: readonly MappedPosition[] | undefined;
  let generatedMappings: SortedReadonlyArray<MappedPosition> | undefined;
  let sourceMappings: readonly SortedReadonlyArray<SourceMappedPosition>[] | undefined;
  return {
    getSourcePosition,
    getGeneratedPosition,
  };
  function processMapping(mapping: Mapping): MappedPosition {
    const generatedPosition = generatedFile !== undefined ? syntax.get.posOf(generatedFile, mapping.generatedLine, mapping.generatedCharacter, true) : -1;
    let source: string | undefined;
    let sourcePosition: number | undefined;
    if (isSourceMapping(mapping)) {
      const sourceFile = host.getSourceFileLike(sourceFileAbsolutePaths[mapping.sourceIndex]);
      source = map.sources[mapping.sourceIndex];
      sourcePosition = sourceFile !== undefined ? syntax.get.posOf(sourceFile, mapping.sourceLine, mapping.sourceCharacter, true) : -1;
    }
    return {
      generatedPosition,
      source,
      sourceIndex: mapping.sourceIndex,
      sourcePosition,
      nameIndex: mapping.nameIndex,
    };
  }
  function getDecodedMappings() {
    if (decodedMappings === undefined) {
      const decoder = decodeMappings(map.mappings);
      const mappings = arrayFrom(decoder, processMapping);
      if (decoder.error !== undefined) {
        if (host.log) {
          host.log(`Encountered error while decoding sourcemap: ${decoder.error}`);
        }
        decodedMappings = emptyArray;
      } else {
        decodedMappings = mappings;
      }
    }
    return decodedMappings;
  }
  function getSourceMappings(sourceIndex: number) {
    if (sourceMappings === undefined) {
      const lists: SourceMappedPosition[][] = [];
      for (const mapping of getDecodedMappings()) {
        if (!isSourceMappedPosition(mapping)) continue;
        let list = lists[mapping.sourceIndex];
        if (!list) lists[mapping.sourceIndex] = list = [];
        list.push(mapping);
      }
      sourceMappings = lists.map((list) => sortAndDeduplicate<SourceMappedPosition>(list, compareSourcePositions, sameMappedPosition));
    }
    return sourceMappings[sourceIndex];
  }
  function getGeneratedMappings() {
    if (generatedMappings === undefined) {
      const list: MappedPosition[] = [];
      for (const mapping of getDecodedMappings()) {
        list.push(mapping);
      }
      generatedMappings = sortAndDeduplicate(list, compareGeneratedPositions, sameMappedPosition);
    }
    return generatedMappings;
  }
  function getGeneratedPosition(loc: DocumentPosition): DocumentPosition {
    const sourceIndex = sourceToSourceIndexMap.get(host.getCanonicalFileName(loc.fileName));
    if (sourceIndex === undefined) return loc;
    const sourceMappings = getSourceMappings(sourceIndex);
    if (!some(sourceMappings)) return loc;
    let targetIndex = binarySearchKey(sourceMappings, loc.pos, getSourcePositionOfMapping, compareValues);
    if (targetIndex < 0) {
      targetIndex = ~targetIndex;
    }
    const mapping = sourceMappings[targetIndex];
    if (mapping === undefined || mapping.sourceIndex !== sourceIndex) return loc;
    return { fileName: generatedAbsoluteFilePath, pos: mapping.generatedPosition };
  }
  function getSourcePosition(loc: DocumentPosition): DocumentPosition {
    const generatedMappings = getGeneratedMappings();
    if (!some(generatedMappings)) return loc;
    let targetIndex = binarySearchKey(generatedMappings, loc.pos, getGeneratedPositionOfMapping, compareValues);
    if (targetIndex < 0) {
      targetIndex = ~targetIndex;
    }
    const mapping = generatedMappings[targetIndex];
    if (mapping === undefined || !isSourceMappedPosition(mapping)) return loc;
    return { fileName: sourceFileAbsolutePaths[mapping.sourceIndex], pos: mapping.sourcePosition };
  }
}
export const identitySourceMapConsumer: DocumentPositionMapper = {
  getSourcePosition: identity,
  getGeneratedPosition: identity,
};
