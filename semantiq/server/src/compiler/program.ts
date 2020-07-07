import * as qb from './base';
import * as qt from './types';
import { Node } from './types';
import * as syntax from './syntax';
import { Syntax } from './syntax';
export function findConfigFile(searchPath: string, fileExists: (fileName: string) => boolean, configName = 'tsconfig.json'): string | undefined {
  return forEachAncestorDirectory(searchPath, (ancestor) => {
    const fileName = combinePaths(ancestor, configName);
    return fileExists(fileName) ? fileName : undefined;
  });
}
export function resolveTripleslashReference(moduleName: string, containingFile: string): string {
  const basePath = getDirectoryPath(containingFile);
  const referencedFileName = isRootedDiskPath(moduleName) ? moduleName : combinePaths(basePath, moduleName);
  return normalizePath(referencedFileName);
}
export function computeCommonSourceDirectoryOfFilenames(fileNames: string[], currentDirectory: string, getCanonicalFileName: GetCanonicalFileName): string {
  let commonPathComponents: string[] | undefined;
  const failed = forEach(fileNames, (sourceFile) => {
    const sourcePathComponents = getNormalizedPathComponents(sourceFile, currentDirectory);
    sourcePathComponents.pop();
    if (!commonPathComponents) {
      commonPathComponents = sourcePathComponents;
      return;
    }
    const n = Math.min(commonPathComponents.length, sourcePathComponents.length);
    for (let i = 0; i < n; i++) {
      if (getCanonicalFileName(commonPathComponents[i]) !== getCanonicalFileName(sourcePathComponents[i])) {
        if (i === 0) return true;
        commonPathComponents.length = i;
        break;
      }
    }
    if (sourcePathComponents.length < commonPathComponents.length) {
      commonPathComponents.length = sourcePathComponents.length;
    }
  });
  if (failed) return '';
  if (!commonPathComponents) return currentDirectory;
  return getPathFromPathComponents(commonPathComponents);
}
interface OutputFingerprint {
  hash: string;
  byteOrderMark: boolean;
  mtime: Date;
}
export function createCompilerHost(options: CompilerOptions, setParentNodes?: boolean): CompilerHost {
  return createCompilerHostWorker(options, setParentNodes);
}
export function createCompilerHostWorker(options: CompilerOptions, setParentNodes?: boolean, system = sys): CompilerHost {
  const existingDirectories = createMap<boolean>();
  const getCanonicalFileName = createGetCanonicalFileName(system.useCaseSensitiveFileNames);
  function getSourceFile(fileName: string, languageVersion: ScriptTarget, onError?: (message: string) => void): SourceFile | undefined {
    let text: string | undefined;
    try {
      performance.mark('beforeIORead');
      text = compilerHost.readFile(fileName);
      performance.mark('afterIORead');
      performance.measure('I/O Read', 'beforeIORead', 'afterIORead');
    } catch (e) {
      if (onError) {
        onError(e.message);
      }
      text = '';
    }
    return text !== undefined ? qp_createSource(fileName, text, languageVersion, setParentNodes) : undefined;
  }
  function directoryExists(directoryPath: string): boolean {
    if (existingDirectories.has(directoryPath)) return true;
    if ((compilerHost.directoryExists || system.directoryExists)(directoryPath)) {
      existingDirectories.set(directoryPath, true);
      return true;
    }
    return false;
  }
  function writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void) {
    try {
      performance.mark('beforeIOWrite');
      writeFileEnsuringDirectories(
        fileName,
        data,
        writeByteOrderMark,
        (path, data, writeByteOrderMark) => writeFileWorker(path, data, writeByteOrderMark),
        (path) => (compilerHost.createDirectory || system.createDirectory)(path),
        (path) => directoryExists(path)
      );
      performance.mark('afterIOWrite');
      performance.measure('I/O Write', 'beforeIOWrite', 'afterIOWrite');
    } catch (e) {
      if (onError) {
        onError(e.message);
      }
    }
  }
  let outputFingerprints: Map<OutputFingerprint>;
  function writeFileWorker(fileName: string, data: string, writeByteOrderMark: boolean) {
    if (!isWatchSet(options) || !system.createHash || !system.getModifiedTime) {
      system.writeFile(fileName, data, writeByteOrderMark);
      return;
    }
    if (!outputFingerprints) {
      outputFingerprints = createMap<OutputFingerprint>();
    }
    const hash = system.createHash(data);
    const mtimeBefore = system.getModifiedTime(fileName);
    if (mtimeBefore) {
      const fingerprint = outputFingerprints.get(fileName);
      if (fingerprint && fingerprint.byteOrderMark === writeByteOrderMark && fingerprint.hash === hash && fingerprint.mtime.getTime() === mtimeBefore.getTime()) {
        return;
      }
    }
    system.writeFile(fileName, data, writeByteOrderMark);
    const mtimeAfter = system.getModifiedTime(fileName) || missingFileModifiedTime;
    outputFingerprints.set(fileName, {
      hash,
      byteOrderMark: writeByteOrderMark,
      mtime: mtimeAfter,
    });
  }
  function getDefaultLibLocation(): string {
    return getDirectoryPath(normalizePath(system.getExecutingFilePath()));
  }
  const newLine = getNewLineCharacter(options, () => system.newLine);
  const realpath = system.realpath && ((path: string) => system.realpath!(path));
  const compilerHost: CompilerHost = {
    getSourceFile,
    getDefaultLibLocation,
    getDefaultLibFileName: (options) => combinePaths(getDefaultLibLocation(), getDefaultLibFileName(options)),
    writeFile,
    getCurrentDirectory: memoize(() => system.getCurrentDirectory()),
    useCaseSensitiveFileNames: () => system.useCaseSensitiveFileNames,
    getCanonicalFileName,
    getNewLine: () => newLine,
    fileExists: (fileName) => system.fileExists(fileName),
    readFile: (fileName) => system.readFile(fileName),
    trace: (s: string) => system.write(s + newLine),
    directoryExists: (directoryName) => system.directoryExists(directoryName),
    getEnvironmentVariable: (name) => (system.getEnvironmentVariable ? system.getEnvironmentVariable(name) : ''),
    getDirectories: (path: string) => system.getDirectories(path),
    realpath,
    readDirectory: (path, extensions, include, exclude, depth) => system.readDirectory(path, extensions, include, exclude, depth),
    createDirectory: (d) => system.createDirectory(d),
    createHash: maybeBind(system, system.createHash),
  };
  return compilerHost;
}
interface CompilerHostLikeForCache {
  fileExists(fileName: string): boolean;
  readFile(fileName: string, encoding?: string): string | undefined;
  directoryExists?(directory: string): boolean;
  createDirectory?(directory: string): void;
  writeFile?: WriteFileCallback;
}
export function changeCompilerHostLikeToUseCache(host: CompilerHostLikeForCache, toPath: (fileName: string) => Path, getSourceFile?: CompilerHost['getSourceFile']) {
  const originalReadFile = host.readFile;
  const originalFileExists = host.fileExists;
  const originalDirectoryExists = host.directoryExists;
  const originalCreateDirectory = host.createDirectory;
  const originalWriteFile = host.writeFile;
  const readFileCache = createMap<string | false>();
  const fileExistsCache = createMap<boolean>();
  const directoryExistsCache = createMap<boolean>();
  const sourceFileCache = createMap<SourceFile>();
  const readFileWithCache = (fileName: string): string | undefined => {
    const key = toPath(fileName);
    const value = readFileCache.get(key);
    if (value !== undefined) return value !== false ? value : undefined;
    return setReadFileCache(key, fileName);
  };
  const setReadFileCache = (key: Path, fileName: string) => {
    const newValue = originalReadFile.call(host, fileName);
    readFileCache.set(key, newValue !== undefined ? newValue : false);
    return newValue;
  };
  host.readFile = (fileName) => {
    const key = toPath(fileName);
    const value = readFileCache.get(key);
    if (value !== undefined) return value !== false ? value : undefined;
    if (!fileExtensionIs(fileName, Extension.Json) && !isBuildInfoFile(fileName)) return originalReadFile.call(host, fileName);
    return setReadFileCache(key, fileName);
  };
  const getSourceFileWithCache: CompilerHost['getSourceFile'] | undefined = getSourceFile
    ? (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        const key = toPath(fileName);
        const value = sourceFileCache.get(key);
        if (value) return value;
        const sourceFile = getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        if (sourceFile && (isDeclarationFileName(fileName) || fileExtensionIs(fileName, Extension.Json))) {
          sourceFileCache.set(key, sourceFile);
        }
        return sourceFile;
      }
    : undefined;
  host.fileExists = (fileName) => {
    const key = toPath(fileName);
    const value = fileExistsCache.get(key);
    if (value !== undefined) return value;
    const newValue = originalFileExists.call(host, fileName);
    fileExistsCache.set(key, !!newValue);
    return newValue;
  };
  if (originalWriteFile) {
    host.writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
      const key = toPath(fileName);
      fileExistsCache.delete(key);
      const value = readFileCache.get(key);
      if (value !== undefined && value !== data) {
        readFileCache.delete(key);
        sourceFileCache.delete(key);
      } else if (getSourceFileWithCache) {
        const sourceFile = sourceFileCache.get(key);
        if (sourceFile && sourceFile.text !== data) {
          sourceFileCache.delete(key);
        }
      }
      originalWriteFile.call(host, fileName, data, writeByteOrderMark, onError, sourceFiles);
    };
  }
  if (originalDirectoryExists && originalCreateDirectory) {
    host.directoryExists = (directory) => {
      const key = toPath(directory);
      const value = directoryExistsCache.get(key);
      if (value !== undefined) return value;
      const newValue = originalDirectoryExists.call(host, directory);
      directoryExistsCache.set(key, !!newValue);
      return newValue;
    };
    host.createDirectory = (directory) => {
      const key = toPath(directory);
      directoryExistsCache.delete(key);
      originalCreateDirectory.call(host, directory);
    };
  }
  return {
    originalReadFile,
    originalFileExists,
    originalDirectoryExists,
    originalCreateDirectory,
    originalWriteFile,
    getSourceFileWithCache,
    readFileWithCache,
  };
}
export function getPreEmitDiagnostics(program: Program, sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[];
export function getPreEmitDiagnostics(program: BuilderProgram, sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[];
export function getPreEmitDiagnostics(program: Program | BuilderProgram, sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[] {
  let diagnostics: Diagnostic[] | undefined;
  diagnostics = addRange(diagnostics, program.getConfigFileParsingDiagnostics());
  diagnostics = addRange(diagnostics, program.getOptionsDiagnostics(cancellationToken));
  diagnostics = addRange(diagnostics, program.getSyntacticDiagnostics(sourceFile, cancellationToken));
  diagnostics = addRange(diagnostics, program.getGlobalDiagnostics(cancellationToken));
  diagnostics = addRange(diagnostics, program.getSemanticDiagnostics(sourceFile, cancellationToken));
  if (getEmitDeclarations(program.getCompilerOptions())) {
    diagnostics = addRange(diagnostics, program.getDeclarationDiagnostics(sourceFile, cancellationToken));
  }
  return sortAndDeduplicateDiagnostics(diagnostics || emptyArray);
}
export interface FormatDiagnosticsHost {
  getCurrentDirectory(): string;
  getCanonicalFileName(fileName: string): string;
  getNewLine(): string;
}
export function formatDiagnostics(diagnostics: readonly Diagnostic[], host: FormatDiagnosticsHost): string {
  let output = '';
  for (const diagnostic of diagnostics) {
    output += formatDiagnostic(diagnostic, host);
  }
  return output;
}
export function formatDiagnostic(diagnostic: Diagnostic, host: FormatDiagnosticsHost): string {
  const errorMessage = `${diagnosticCategoryName(diagnostic)} TS${diagnostic.code}: ${flattenDiagnosticMessageText(diagnostic.messageText, host.getNewLine())}${host.getNewLine()}`;
  if (diagnostic.file) {
    const { line, character } = syntax.get.lineAndCharOf(diagnostic.file, diagnostic.start!);
    const fileName = diagnostic.file.fileName;
    const relativeFileName = convertToRelativePath(fileName, host.getCurrentDirectory(), (fileName) => host.getCanonicalFileName(fileName));
    return `${relativeFileName}(${line + 1},${character + 1}): ` + errorMessage;
  }
  return errorMessage;
}
export enum ForegroundColorEscapeSequences {
  Grey = '\u001b[90m',
  Red = '\u001b[91m',
  Yellow = '\u001b[93m',
  Blue = '\u001b[94m',
  Cyan = '\u001b[96m',
}
const gutterStyleSequence = '\u001b[7m';
const gutterSeparator = ' ';
const resetEscapeSequence = '\u001b[0m';
const ellipsis = '...';
const halfIndent = '  ';
const indent = '    ';
function getCategoryFormat(category: DiagnosticCategory): ForegroundColorEscapeSequences {
  switch (category) {
    case DiagnosticCategory.Error:
      return ForegroundColorEscapeSequences.Red;
    case DiagnosticCategory.Warning:
      return ForegroundColorEscapeSequences.Yellow;
    case DiagnosticCategory.Suggestion:
      return fail('Should never get an Info diagnostic on the command line.');
    case DiagnosticCategory.Message:
      return ForegroundColorEscapeSequences.Blue;
  }
}
export function formatColorAndReset(text: string, formatStyle: string) {
  return formatStyle + text + resetEscapeSequence;
}
function formatCodeSpan(file: SourceFile, start: number, length: number, indent: string, squiggleColor: ForegroundColorEscapeSequences, host: FormatDiagnosticsHost) {
  const { line: firstLine, character: firstLineChar } = syntax.get.lineAndCharOf(file, start);
  const { line: lastLine, character: lastLineChar } = syntax.get.lineAndCharOf(file, start + length);
  const lastLineInFile = syntax.get.lineAndCharOf(file, file.text.length).line;
  const hasMoreThanFiveLines = lastLine - firstLine >= 4;
  let gutterWidth = (lastLine + 1 + '').length;
  if (hasMoreThanFiveLines) {
    gutterWidth = Math.max(ellipsis.length, gutterWidth);
  }
  let context = '';
  for (let i = firstLine; i <= lastLine; i++) {
    context += host.getNewLine();
    if (hasMoreThanFiveLines && firstLine + 1 < i && i < lastLine - 1) {
      context += indent + formatColorAndReset(padLeft(ellipsis, gutterWidth), gutterStyleSequence) + gutterSeparator + host.getNewLine();
      i = lastLine - 1;
    }
    const lineStart = syntax.get.posOf(file, i, 0);
    const lineEnd = i < lastLineInFile ? syntax.get.posOf(file, i + 1, 0) : file.text.length;
    let lineContent = file.text.slice(lineStart, lineEnd);
    lineContent = lineContent.replace(/\s+$/g, '');
    lineContent = lineContent.replace('\t', ' ');
    context += indent + formatColorAndReset(padLeft(i + 1 + '', gutterWidth), gutterStyleSequence) + gutterSeparator;
    context += lineContent + host.getNewLine();
    context += indent + formatColorAndReset(padLeft('', gutterWidth), gutterStyleSequence) + gutterSeparator;
    context += squiggleColor;
    if (i === firstLine) {
      const lastCharForLine = i === lastLine ? lastLineChar : undefined;
      context += lineContent.slice(0, firstLineChar).replace(/\S/g, ' ');
      context += lineContent.slice(firstLineChar, lastCharForLine).replace(/./g, '~');
    } else if (i === lastLine) {
      context += lineContent.slice(0, lastLineChar).replace(/./g, '~');
    } else {
      context += lineContent.replace(/./g, '~');
    }
    context += resetEscapeSequence;
  }
  return context;
}
export function formatLocation(file: SourceFile, start: number, host: FormatDiagnosticsHost, color = formatColorAndReset) {
  const { line: firstLine, character: firstLineChar } = syntax.get.lineAndCharOf(file, start);
  const relativeFileName = host ? convertToRelativePath(file.fileName, host.getCurrentDirectory(), (fileName) => host.getCanonicalFileName(fileName)) : file.fileName;
  let output = '';
  output += color(relativeFileName, ForegroundColorEscapeSequences.Cyan);
  output += ':';
  output += color(`${firstLine + 1}`, ForegroundColorEscapeSequences.Yellow);
  output += ':';
  output += color(`${firstLineChar + 1}`, ForegroundColorEscapeSequences.Yellow);
  return output;
}
export function formatDiagnosticsWithColorAndContext(diagnostics: readonly Diagnostic[], host: FormatDiagnosticsHost): string {
  let output = '';
  for (const diagnostic of diagnostics) {
    if (diagnostic.file) {
      const { file, start } = diagnostic;
      output += formatLocation(file, start!, host);
      output += ' - ';
    }
    output += formatColorAndReset(diagnosticCategoryName(diagnostic), getCategoryFormat(diagnostic.category));
    output += formatColorAndReset(` TS${diagnostic.code}: `, ForegroundColorEscapeSequences.Grey);
    output += flattenDiagnosticMessageText(diagnostic.messageText, host.getNewLine());
    if (diagnostic.file) {
      output += host.getNewLine();
      output += formatCodeSpan(diagnostic.file, diagnostic.start!, diagnostic.length!, '', getCategoryFormat(diagnostic.category), host);
      if (diagnostic.relatedInformation) {
        output += host.getNewLine();
        for (const { file, start, length, messageText } of diagnostic.relatedInformation) {
          if (file) {
            output += host.getNewLine();
            output += halfIndent + formatLocation(file, start!, host);
            output += formatCodeSpan(file, start!, length!, indent, ForegroundColorEscapeSequences.Cyan, host);
          }
          output += host.getNewLine();
          output += indent + flattenDiagnosticMessageText(messageText, host.getNewLine());
        }
      }
    }
    output += host.getNewLine();
  }
  return output;
}
export function flattenDiagnosticMessageText(diag: string | DiagnosticMessageChain | undefined, newLine: string, indent = 0): string {
  if (isString(diag)) return diag;
  if (diag === undefined) return '';
  let result = '';
  if (indent) {
    result += newLine;
    for (let i = 0; i < indent; i++) {
      result += '  ';
    }
  }
  result += diag.messageText;
  indent++;
  if (diag.next) {
    for (const kid of diag.next) {
      result += flattenDiagnosticMessageText(kid, newLine, indent);
    }
  }
  return result;
}
export function loadWithLocalCache<T>(
  names: string[],
  containingFile: string,
  redirectedReference: ResolvedProjectReference | undefined,
  loader: (name: string, containingFile: string, redirectedReference: ResolvedProjectReference | undefined) => T
): T[] {
  if (names.length === 0) return [];
  const resolutions: T[] = [];
  const cache = createMap<T>();
  for (const name of names) {
    let result: T;
    if (cache.has(name)) {
      result = cache.get(name)!;
    } else {
      cache.set(name, (result = loader(name, containingFile, redirectedReference)));
    }
    resolutions.push(result);
  }
  return resolutions;
}
export const inferredTypesContainingFile = '__inferred type names__.ts';
interface DiagnosticCache<T extends Diagnostic> {
  perFile?: Map<readonly T[]>;
  allDiagnostics?: readonly T[];
}
interface RefFile extends TextRange {
  kind: RefFileKind;
  index: number;
  file: SourceFile;
}
export function isProgramUptoDate(
  program: Program | undefined,
  rootFileNames: string[],
  newOptions: CompilerOptions,
  getSourceVersion: (path: Path, fileName: string) => string | undefined,
  fileExists: (fileName: string) => boolean,
  hasInvalidatedResolution: HasInvalidatedResolution,
  hasChangedAutomaticTypeDirectiveNames: boolean,
  projectReferences: readonly ProjectReference[] | undefined
): boolean {
  if (!program || hasChangedAutomaticTypeDirectiveNames) return false;
  if (!arrayIsEqualTo(program.getRootFileNames(), rootFileNames)) return false;
  let seenResolvedRefs: ResolvedProjectReference[] | undefined;
  if (!arrayIsEqualTo(program.getProjectReferences(), projectReferences, projectReferenceUptoDate)) return false;
  if (program.getSourceFiles().some(sourceFileNotUptoDate)) return false;
  if (program.getMissingFilePaths().some(fileExists)) return false;
  const currentOptions = program.getCompilerOptions();
  if (!compareDataObjects(currentOptions, newOptions)) return false;
  if (currentOptions.configFile && newOptions.configFile) return currentOptions.configFile.text === newOptions.configFile.text;
  return true;
  function sourceFileNotUptoDate(sourceFile: SourceFile) {
    return !sourceFileVersionUptoDate(sourceFile) || hasInvalidatedResolution(sourceFile.path);
  }
  function sourceFileVersionUptoDate(sourceFile: SourceFile) {
    return sourceFile.version === getSourceVersion(sourceFile.resolvedPath, sourceFile.fileName);
  }
  function projectReferenceUptoDate(oldRef: ProjectReference, newRef: ProjectReference, index: number) {
    if (!projectReferenceIsEqualTo(oldRef, newRef)) return false;
    return resolvedProjectReferenceUptoDate(program!.getResolvedProjectReferences()![index], oldRef);
  }
  function resolvedProjectReferenceUptoDate(oldResolvedRef: ResolvedProjectReference | undefined, oldRef: ProjectReference): boolean {
    if (oldResolvedRef) {
      if (contains(seenResolvedRefs, oldResolvedRef)) return true;
      if (!sourceFileVersionUptoDate(oldResolvedRef.sourceFile)) return false;
      (seenResolvedRefs || (seenResolvedRefs = [])).push(oldResolvedRef);
      return !forEach(oldResolvedRef.references, (childResolvedRef, index) => !resolvedProjectReferenceUptoDate(childResolvedRef, oldResolvedRef.commandLine.projectReferences![index]));
    }
    return !fileExists(resolveProjectReferencePath(oldRef));
  }
}
export function getConfigFileParsingDiagnostics(configFileParseResult: ParsedCommandLine): readonly Diagnostic[] {
  return configFileParseResult.options.configFile ? [...configFileParseResult.options.configFile.parseDiagnostics, ...configFileParseResult.errors] : configFileParseResult.errors;
}
function shouldProgramCreateNewSourceFiles(program: Program | undefined, newOptions: CompilerOptions): boolean {
  if (!program) return false;
  const oldOptions = program.getCompilerOptions();
  return !!sourceFileAffectingCompilerOptions.some((option) => !isJsonEqual(getCompilerOptionValue(oldOptions, option), getCompilerOptionValue(newOptions, option)));
}
function createCreateProgramOptions(
  rootNames: readonly string[],
  options: CompilerOptions,
  host?: CompilerHost,
  oldProgram?: Program,
  configFileParsingDiagnostics?: readonly Diagnostic[]
): CreateProgramOptions {
  return {
    rootNames,
    options,
    host,
    oldProgram,
    configFileParsingDiagnostics,
  };
}
export function createProgram(createProgramOptions: CreateProgramOptions): Program;
export function createProgram(rootNames: readonly string[], options: CompilerOptions, host?: CompilerHost, oldProgram?: Program, configFileParsingDiagnostics?: readonly Diagnostic[]): Program;
export function createProgram(
  rootNamesOrOptions: readonly string[] | CreateProgramOptions,
  _options?: CompilerOptions,
  _host?: CompilerHost,
  _oldProgram?: Program,
  _configFileParsingDiagnostics?: readonly Diagnostic[]
): Program {
  const createProgramOptions = isArray(rootNamesOrOptions) ? createCreateProgramOptions(rootNamesOrOptions, _options!, _host, _oldProgram, _configFileParsingDiagnostics) : rootNamesOrOptions;
  const { rootNames, options, configFileParsingDiagnostics, projectReferences } = createProgramOptions;
  let { oldProgram } = createProgramOptions;
  let processingDefaultLibFiles: SourceFile[] | undefined;
  let processingOtherFiles: SourceFile[] | undefined;
  let files: SourceFile[];
  let symlinks: QReadonlyMap<string> | undefined;
  let commonSourceDirectory: string;
  let diagnosticsProducingTypeChecker: TypeChecker;
  let noDiagnosticsTypeChecker: TypeChecker;
  let classifiableNames: UnderscoreEscapedMap<true>;
  const ambientModuleNameToUnmodifiedFileName = createMap<string>();
  let refFileMap: MultiMap<ts.RefFile> | undefined;
  const cachedBindAndCheckDiagnosticsForFile: DiagnosticCache<Diagnostic> = {};
  const cachedDeclarationDiagnosticsForFile: DiagnosticCache<DiagnosticWithLocation> = {};
  let resolvedTypeReferenceDirectives = createMap<ResolvedTypeReferenceDirective | undefined>();
  let fileProcessingDiagnostics = createDiagnosticCollection();
  const maxNodeModuleJsDepth = typeof options.maxNodeModuleJsDepth === 'number' ? options.maxNodeModuleJsDepth : 0;
  let currentNodeModulesDepth = 0;
  const modulesWithElidedImports = createMap<boolean>();
  const sourceFilesFoundSearchingNodeModules = createMap<boolean>();
  performance.mark('beforeProgram');
  const host = createProgramOptions.host || createCompilerHost(options);
  const configParsingHost = parseConfigHostFromCompilerHostLike(host);
  let skipDefaultLib = options.noLib;
  const getDefaultLibraryFileName = memoize(() => host.getDefaultLibFileName(options));
  const defaultLibraryPath = host.getDefaultLibLocation ? host.getDefaultLibLocation() : getDirectoryPath(getDefaultLibraryFileName());
  const programDiagnostics = createDiagnosticCollection();
  const currentDirectory = host.getCurrentDirectory();
  const supportedExtensions = getSupportedExtensions(options);
  const supportedExtensionsWithJsonIfResolveJsonModule = getSuppoertedExtensionsWithJsonIfResolveJsonModule(options, supportedExtensions);
  const hasEmitBlockingDiagnostics = createMap<boolean>();
  let _compilerOptionsObjectLiteralSyntax: ObjectLiteralExpression | null | undefined;
  let moduleResolutionCache: ModuleResolutionCache | undefined;
  let actualResolveModuleNamesWorker: (moduleNames: string[], containingFile: string, reusedNames?: string[], redirectedReference?: ResolvedProjectReference) => ResolvedModuleFull[];
  const hasInvalidatedResolution = host.hasInvalidatedResolution || (() => false);
  if (host.resolveModuleNames) {
    actualResolveModuleNamesWorker = (moduleNames, containingFile, reusedNames, redirectedReference) =>
      host.resolveModuleNames!(Debug.checkEachDefined(moduleNames), containingFile, reusedNames, redirectedReference, options).map((resolved) => {
        if (!resolved || (resolved as ResolvedModuleFull).extension !== undefined) return resolved as ResolvedModuleFull;
        const withExtension = clone(resolved) as ResolvedModuleFull;
        withExtension.extension = syntax.get.extensionFromPath(resolved.resolvedFileName);
        return withExtension;
      });
  } else {
    moduleResolutionCache = createModuleResolutionCache(currentDirectory, (x) => host.getCanonicalFileName(x), options);
    const loader = (moduleName: string, containingFile: string, redirectedReference: ResolvedProjectReference | undefined) =>
      resolveModuleName(moduleName, containingFile, options, host, moduleResolutionCache, redirectedReference).resolvedModule!;
    actualResolveModuleNamesWorker = (moduleNames, containingFile, _reusedNames, redirectedReference) =>
      loadWithLocalCache<ResolvedModuleFull>(Debug.checkEachDefined(moduleNames), containingFile, redirectedReference, loader);
  }
  let actualResolveTypeReferenceDirectiveNamesWorker: (
    typeDirectiveNames: string[],
    containingFile: string,
    redirectedReference?: ResolvedProjectReference
  ) => (ResolvedTypeReferenceDirective | undefined)[];
  if (host.resolveTypeReferenceDirectives) {
    actualResolveTypeReferenceDirectiveNamesWorker = (typeDirectiveNames, containingFile, redirectedReference) =>
      host.resolveTypeReferenceDirectives!(Debug.checkEachDefined(typeDirectiveNames), containingFile, redirectedReference, options);
  } else {
    const loader = (typesRef: string, containingFile: string, redirectedReference: ResolvedProjectReference | undefined) =>
      resolveTypeReferenceDirective(typesRef, containingFile, options, host, redirectedReference).resolvedTypeReferenceDirective!;
    actualResolveTypeReferenceDirectiveNamesWorker = (typeReferenceDirectiveNames, containingFile, redirectedReference) =>
      loadWithLocalCache<ResolvedTypeReferenceDirective>(Debug.checkEachDefined(typeReferenceDirectiveNames), containingFile, redirectedReference, loader);
  }
  const packageIdToSourceFile = createMap<SourceFile>();
  let sourceFileToPackageName = createMap<string>();
  let redirectTargetsMap = new MultiMap<string>();
  const filesByName = createMap<SourceFile | false | undefined>();
  let missingFilePaths: readonly Path[] | undefined;
  const filesByNameIgnoreCase = host.useCaseSensitiveFileNames() ? createMap<SourceFile>() : undefined;
  let resolvedProjectReferences: readonly (ResolvedProjectReference | undefined)[] | undefined;
  let projectReferenceRedirects: Map<ResolvedProjectReference | false> | undefined;
  let mapFromFileToProjectReferenceRedirects: Map<Path> | undefined;
  let mapFromToProjectReferenceRedirectSource: Map<SourceOfProjectReferenceRedirect> | undefined;
  const useSourceOfProjectReferenceRedirect = !!host.useSourceOfProjectReferenceRedirect?.() && !options.disableSourceOfProjectReferenceRedirect;
  const { onProgramCreateComplete, fileExists } = updateHostForUseSourceOfProjectReferenceRedirect({
    compilerHost: host,
    useSourceOfProjectReferenceRedirect,
    toPath,
    getResolvedProjectReferences,
    getSourceOfProjectReferenceRedirect,
    forEachResolvedProjectReference,
  });
  const shouldCreateNewSourceFile = shouldProgramCreateNewSourceFiles(oldProgram, options);
  let structuralIsReused: StructureIsReused | undefined;
  structuralIsReused = tryReuseStructureFromOldProgram();
  if (structuralIsReused !== StructureIsReused.Completely) {
    processingDefaultLibFiles = [];
    processingOtherFiles = [];
    if (projectReferences) {
      if (!resolvedProjectReferences) {
        resolvedProjectReferences = projectReferences.map(parseProjectReferenceConfigFile);
      }
      if (rootNames.length) {
        for (const parsedRef of resolvedProjectReferences) {
          if (!parsedRef) continue;
          const out = parsedRef.commandLine.options.outFile || parsedRef.commandLine.options.out;
          if (useSourceOfProjectReferenceRedirect) {
            if (out || getEmitModuleKind(parsedRef.commandLine.options) === ModuleKind.None) {
              for (const fileName of parsedRef.commandLine.fileNames) {
                processSourceFile(fileName, undefined);
              }
            }
          } else {
            if (out) {
              processSourceFile(changeExtension(out, '.d.ts'), undefined);
            } else if (getEmitModuleKind(parsedRef.commandLine.options) === ModuleKind.None) {
              for (const fileName of parsedRef.commandLine.fileNames) {
                if (!fileExtensionIs(fileName, Extension.Dts) && !fileExtensionIs(fileName, Extension.Json)) {
                  processSourceFile(getOutputDeclarationFileName(fileName, parsedRef.commandLine, !host.useCaseSensitiveFileNames()), false, false, undefined);
                }
              }
            }
          }
        }
      }
    }
    forEach(rootNames, (name) => processRootFile(name, false));
    const typeReferences: string[] = rootNames.length ? getAutomaticTypeDirectiveNames(options, host) : emptyArray;
    if (typeReferences.length) {
      const containingDirectory = options.configFilePath ? getDirectoryPath(options.configFilePath) : host.getCurrentDirectory();
      const containingFilename = combinePaths(containingDirectory, inferredTypesContainingFile);
      const resolutions = resolveTypeReferenceDirectiveNamesWorker(typeReferences, containingFilename);
      for (let i = 0; i < typeReferences.length; i++) {
        processTypeReferenceDirective(typeReferences[i], resolutions[i]);
      }
    }
    if (rootNames.length && !skipDefaultLib) {
      const defaultLibraryFileName = getDefaultLibraryFileName();
      if (!options.lib && defaultLibraryFileName) {
        processRootFile(defaultLibraryFileName, false);
      } else {
        forEach(options.lib, (libFileName) => {
          processRootFile(combinePaths(defaultLibraryPath, libFileName), false);
        });
      }
    }
    missingFilePaths = arrayFrom(mapDefinedIterator(filesByName.entries(), ([path, file]) => (file === undefined ? (path as Path) : undefined)));
    files = stableSort(processingDefaultLibFiles, compareDefaultLibFiles).concat(processingOtherFiles);
    processingDefaultLibFiles = undefined;
    processingOtherFiles = undefined;
  }
  assert(!!missingFilePaths);
  if (oldProgram && host.onReleaseOldSourceFile) {
    const oldSourceFiles = oldProgram.getSourceFiles();
    for (const oldSourceFile of oldSourceFiles) {
      const newFile = getSourceFileByPath(oldSourceFile.resolvedPath);
      if (shouldCreateNewSourceFile || !newFile || (oldSourceFile.resolvedPath === oldSourceFile.path && newFile.resolvedPath !== oldSourceFile.path)) {
        host.onReleaseOldSourceFile(oldSourceFile, oldProgram.getCompilerOptions(), !!getSourceFileByPath(oldSourceFile.path));
      }
    }
    oldProgram.forEachResolvedProjectReference((resolvedProjectReference, resolvedProjectReferencePath) => {
      if (resolvedProjectReference && !getResolvedProjectReferenceByPath(resolvedProjectReferencePath)) {
        host.onReleaseOldSourceFile!(resolvedProjectReference.sourceFile, oldProgram!.getCompilerOptions(), false);
      }
    });
  }
  oldProgram = undefined;
  const program: Program = {
    getRootFileNames: () => rootNames,
    getSourceFile,
    getSourceFileByPath,
    getSourceFiles: () => files,
    getMissingFilePaths: () => missingFilePaths!,
    getRefFileMap: () => refFileMap,
    getFilesByNameMap: () => filesByName,
    getCompilerOptions: () => options,
    getSyntacticDiagnostics,
    getOptionsDiagnostics,
    getGlobalDiagnostics,
    getSemanticDiagnostics,
    getSuggestionDiagnostics,
    getDeclarationDiagnostics,
    getBindAndCheckDiagnostics,
    getProgramDiagnostics,
    getTypeChecker,
    getClassifiableNames,
    getDiagnosticsProducingTypeChecker,
    getCommonSourceDirectory,
    emit,
    getCurrentDirectory: () => currentDirectory,
    getNodeCount: () => getDiagnosticsProducingTypeChecker().getNodeCount(),
    getIdentifierCount: () => getDiagnosticsProducingTypeChecker().getIdentifierCount(),
    getSymbolCount: () => getDiagnosticsProducingTypeChecker().getSymbolCount(),
    getTypeCount: () => getDiagnosticsProducingTypeChecker().getTypeCount(),
    getInstantiationCount: () => getDiagnosticsProducingTypeChecker().getInstantiationCount(),
    getRelationCacheSizes: () => getDiagnosticsProducingTypeChecker().getRelationCacheSizes(),
    getFileProcessingDiagnostics: () => fileProcessingDiagnostics,
    getResolvedTypeReferenceDirectives: () => resolvedTypeReferenceDirectives,
    isSourceFileFromExternalLibrary,
    isSourceFileDefaultLibrary,
    dropDiagnosticsProducingTypeChecker,
    getSourceFileFromReference,
    getLibFileFromReference,
    sourceFileToPackageName,
    redirectTargetsMap,
    isEmittedFile,
    getConfigFileParsingDiagnostics,
    getResolvedModuleWithFailedLookupLocationsFromCache,
    getProjectReferences,
    getResolvedProjectReferences,
    getProjectReferenceRedirect,
    getResolvedProjectReferenceToRedirect,
    getResolvedProjectReferenceByPath,
    forEachResolvedProjectReference,
    isSourceOfProjectReferenceRedirect,
    emitBuildInfo,
    fileExists,
    getProbableSymlinks,
    useCaseSensitiveFileNames: () => host.useCaseSensitiveFileNames(),
  };
  onProgramCreateComplete();
  verifyCompilerOptions();
  performance.mark('afterProgram');
  performance.measure('Program', 'beforeProgram', 'afterProgram');
  return program;
  function resolveModuleNamesWorker(moduleNames: string[], containingFile: string, reusedNames?: string[], redirectedReference?: ResolvedProjectReference) {
    performance.mark('beforeResolveModule');
    const result = actualResolveModuleNamesWorker(moduleNames, containingFile, reusedNames, redirectedReference);
    performance.mark('afterResolveModule');
    performance.measure('ResolveModule', 'beforeResolveModule', 'afterResolveModule');
    return result;
  }
  function resolveTypeReferenceDirectiveNamesWorker(typeDirectiveNames: string[], containingFile: string, redirectedReference?: ResolvedProjectReference) {
    performance.mark('beforeResolveTypeReference');
    const result = actualResolveTypeReferenceDirectiveNamesWorker(typeDirectiveNames, containingFile, redirectedReference);
    performance.mark('afterResolveTypeReference');
    performance.measure('ResolveTypeReference', 'beforeResolveTypeReference', 'afterResolveTypeReference');
    return result;
  }
  function compareDefaultLibFiles(a: SourceFile, b: SourceFile) {
    return compareValues(getDefaultLibFilePriority(a), getDefaultLibFilePriority(b));
  }
  function getDefaultLibFilePriority(a: SourceFile) {
    if (containsPath(defaultLibraryPath, a.fileName, false)) {
      const basename = getBaseFileName(a.fileName);
      if (basename === 'lib.d.ts' || basename === 'lib.es6.d.ts') return 0;
      const name = removeSuffix(removePrefix(basename, 'lib.'), '.d.ts');
      const index = libs.indexOf(name);
      if (index !== -1) return index + 1;
    }
    return libs.length + 2;
  }
  function getResolvedModuleWithFailedLookupLocationsFromCache(moduleName: string, containingFile: string): ResolvedModuleWithFailedLookupLocations | undefined {
    return moduleResolutionCache && resolveModuleNameFromCache(moduleName, containingFile, moduleResolutionCache);
  }
  function toPath(fileName: string): Path {
    return qnr.toPath(fileName, currentDirectory, getCanonicalFileName);
  }
  function getCommonSourceDirectory() {
    if (commonSourceDirectory === undefined) {
      const emittedFiles = filter(files, (file) => sourceFileMayBeEmitted(file, program));
      if (options.rootDir && checkSourceFilesBelongToPath(emittedFiles, options.rootDir)) {
        commonSourceDirectory = getNormalizedAbsolutePath(options.rootDir, currentDirectory);
      } else if (options.composite && options.configFilePath) {
        commonSourceDirectory = getDirectoryPath(normalizeSlashes(options.configFilePath));
        checkSourceFilesBelongToPath(emittedFiles, commonSourceDirectory);
      } else {
        commonSourceDirectory = computeCommonSourceDirectory(emittedFiles);
      }
      if (commonSourceDirectory && commonSourceDirectory[commonSourceDirectory.length - 1] !== dirSeparator) {
        commonSourceDirectory += dirSeparator;
      }
    }
    return commonSourceDirectory;
  }
  function getClassifiableNames() {
    if (!classifiableNames) {
      getTypeChecker();
      classifiableNames = createUnderscoreEscapedMap<true>();
      for (const sourceFile of files) {
        qu.copyEntries(sourceFile.classifiableNames!, classifiableNames);
      }
    }
    return classifiableNames;
  }
  function resolveModuleNamesReusingOldState(moduleNames: string[], containingFile: string, file: SourceFile) {
    if (structuralIsReused === StructureIsReused.Not && !file.ambientModuleNames.length)
      return resolveModuleNamesWorker(moduleNames, containingFile, undefined, getResolvedProjectReferenceToRedirect(file.originalFileName));
    const oldSourceFile = oldProgram && oldProgram.getSourceFile(containingFile);
    if (oldSourceFile !== file && file.resolvedModules) {
      const result: ResolvedModuleFull[] = [];
      for (const moduleName of moduleNames) {
        const resolvedModule = file.resolvedModules.get(moduleName)!;
        result.push(resolvedModule);
      }
      return result;
    }
    let unknownModuleNames: string[] | undefined;
    let result: ResolvedModuleFull[] | undefined;
    let reusedNames: string[] | undefined;
    const predictedToResolveToAmbientModuleMarker: ResolvedModuleFull = <any>{};
    for (let i = 0; i < moduleNames.length; i++) {
      const moduleName = moduleNames[i];
      if (file === oldSourceFile && !hasInvalidatedResolution(oldSourceFile.path)) {
        const oldResolvedModule = oldSourceFile && oldSourceFile.resolvedModules!.get(moduleName);
        if (oldResolvedModule) {
          if (isTraceEnabled(options, host)) {
            trace(host, qd.Reusing_resolution_of_module_0_to_file_1_from_old_program, moduleName, containingFile);
          }
          (result || (result = new Array(moduleNames.length)))[i] = oldResolvedModule;
          (reusedNames || (reusedNames = [])).push(moduleName);
          continue;
        }
      }
      let resolvesToAmbientModuleInNonModifiedFile = false;
      if (contains(file.ambientModuleNames, moduleName)) {
        resolvesToAmbientModuleInNonModifiedFile = true;
        if (isTraceEnabled(options, host)) {
          trace(host, qd.Module_0_was_resolved_as_locally_declared_ambient_module_in_file_1, moduleName, containingFile);
        }
      } else {
        resolvesToAmbientModuleInNonModifiedFile = moduleNameResolvesToAmbientModuleInNonModifiedFile(moduleName);
      }
      if (resolvesToAmbientModuleInNonModifiedFile) {
        (result || (result = new Array(moduleNames.length)))[i] = predictedToResolveToAmbientModuleMarker;
      } else {
        (unknownModuleNames || (unknownModuleNames = [])).push(moduleName);
      }
    }
    const resolutions =
      unknownModuleNames && unknownModuleNames.length
        ? resolveModuleNamesWorker(unknownModuleNames, containingFile, reusedNames, getResolvedProjectReferenceToRedirect(file.originalFileName))
        : emptyArray;
    if (!result) {
      assert(resolutions.length === moduleNames.length);
      return resolutions;
    }
    let j = 0;
    for (let i = 0; i < result.length; i++) {
      if (result[i]) {
        if (result[i] === predictedToResolveToAmbientModuleMarker) {
          result[i] = undefined!;
        }
      } else {
        result[i] = resolutions[j];
        j++;
      }
    }
    assert(j === resolutions.length);
    return result;
    function moduleNameResolvesToAmbientModuleInNonModifiedFile(moduleName: string): boolean {
      const resolutionToFile = getResolvedModule(oldSourceFile, moduleName);
      const resolvedFile = resolutionToFile && oldProgram!.getSourceFile(resolutionToFile.resolvedFileName);
      if (resolutionToFile && resolvedFile) return false;
      const unmodifiedFile = ambientModuleNameToUnmodifiedFileName.get(moduleName);
      if (!unmodifiedFile) return false;
      if (isTraceEnabled(options, host)) {
        trace(host, qd.Module_0_was_resolved_as_ambient_module_declared_in_1_since_this_file_was_not_modified, moduleName, unmodifiedFile);
      }
      return true;
    }
  }
  function canReuseProjectReferences(): boolean {
    return !forEachProjectReference(
      oldProgram!.getProjectReferences(),
      oldProgram!.getResolvedProjectReferences(),
      (oldResolvedRef, index, parent) => {
        const newRef = (parent ? parent.commandLine.projectReferences : projectReferences)![index];
        const newResolvedRef = parseProjectReferenceConfigFile(newRef);
        if (oldResolvedRef) return !newResolvedRef || newResolvedRef.sourceFile !== oldResolvedRef.sourceFile;
        return newResolvedRef !== undefined;
      },
      (oldProjectReferences, parent) => {
        const newReferences = parent ? getResolvedProjectReferenceByPath(parent.sourceFile.path)!.commandLine.projectReferences : projectReferences;
        return !arrayIsEqualTo(oldProjectReferences, newReferences, projectReferenceIsEqualTo);
      }
    );
  }
  function tryReuseStructureFromOldProgram(): StructureIsReused {
    if (!oldProgram) return StructureIsReused.Not;
    const oldOptions = oldProgram.getCompilerOptions();
    if (changesAffectModuleResolution(oldOptions, options)) return (oldProgram.structureIsReused = StructureIsReused.Not);
    assert(!(oldProgram.structureIsReused! & (StructureIsReused.Completely | StructureIsReused.SafeModules)));
    const oldRootNames = oldProgram.getRootFileNames();
    if (!arrayIsEqualTo(oldRootNames, rootNames)) return (oldProgram.structureIsReused = StructureIsReused.Not);
    if (!arrayIsEqualTo(options.types, oldOptions.types)) return (oldProgram.structureIsReused = StructureIsReused.Not);
    if (!canReuseProjectReferences()) return (oldProgram.structureIsReused = StructureIsReused.Not);
    if (projectReferences) {
      resolvedProjectReferences = projectReferences.map(parseProjectReferenceConfigFile);
    }
    const newSourceFiles: SourceFile[] = [];
    const modifiedSourceFiles: { oldFile: SourceFile; newFile: SourceFile }[] = [];
    oldProgram.structureIsReused = StructureIsReused.Completely;
    if (oldProgram.getMissingFilePaths().some((missingFilePath) => host.fileExists(missingFilePath))) return (oldProgram.structureIsReused = StructureIsReused.Not);
    const oldSourceFiles = oldProgram.getSourceFiles();
    const enum SeenPackageName {
      Exists,
      Modified,
    }
    const seenPackageNames = createMap<SeenPackageName>();
    for (const oldSourceFile of oldSourceFiles) {
      let newSourceFile = host.getSourceFileByPath
        ? host.getSourceFileByPath(oldSourceFile.fileName, oldSourceFile.resolvedPath, options.target!, undefined, shouldCreateNewSourceFile)
        : host.getSourceFile(oldSourceFile.fileName, options.target!, undefined, shouldCreateNewSourceFile);
      if (!newSourceFile) return (oldProgram.structureIsReused = StructureIsReused.Not);
      assert(!newSourceFile.redirectInfo, 'Host should not return a redirect source file from `getSourceFile`');
      let fileChanged: boolean;
      if (oldSourceFile.redirectInfo) {
        if (newSourceFile !== oldSourceFile.redirectInfo.unredirected) return (oldProgram.structureIsReused = StructureIsReused.Not);
        fileChanged = false;
        newSourceFile = oldSourceFile;
      } else if (oldProgram.redirectTargetsMap.has(oldSourceFile.path)) {
        if (newSourceFile !== oldSourceFile) return (oldProgram.structureIsReused = StructureIsReused.Not);
        fileChanged = false;
      } else {
        fileChanged = newSourceFile !== oldSourceFile;
      }
      newSourceFile.path = oldSourceFile.path;
      newSourceFile.originalFileName = oldSourceFile.originalFileName;
      newSourceFile.resolvedPath = oldSourceFile.resolvedPath;
      newSourceFile.fileName = oldSourceFile.fileName;
      const packageName = oldProgram.sourceFileToPackageName.get(oldSourceFile.path);
      if (packageName !== undefined) {
        const prevKind = seenPackageNames.get(packageName);
        const newKind = fileChanged ? SeenPackageName.Modified : SeenPackageName.Exists;
        if ((prevKind !== undefined && newKind === SeenPackageName.Modified) || prevKind === SeenPackageName.Modified) return (oldProgram.structureIsReused = StructureIsReused.Not);
        seenPackageNames.set(packageName, newKind);
      }
      if (fileChanged) {
        if (!arrayIsEqualTo(oldSourceFile.libReferenceDirectives, newSourceFile.libReferenceDirectives, fileReferenceIsEqualTo)) return (oldProgram.structureIsReused = StructureIsReused.Not);
        if (oldSourceFile.hasNoDefaultLib !== newSourceFile.hasNoDefaultLib) {
          oldProgram.structureIsReused = StructureIsReused.SafeModules;
        }
        if (!arrayIsEqualTo(oldSourceFile.referencedFiles, newSourceFile.referencedFiles, fileReferenceIsEqualTo)) {
          oldProgram.structureIsReused = StructureIsReused.SafeModules;
        }
        collectExternalModuleReferences(newSourceFile);
        if (!arrayIsEqualTo(oldSourceFile.imports, newSourceFile.imports, moduleNameIsEqualTo)) {
          oldProgram.structureIsReused = StructureIsReused.SafeModules;
        }
        if (!arrayIsEqualTo(oldSourceFile.moduleAugmentations, newSourceFile.moduleAugmentations, moduleNameIsEqualTo)) {
          oldProgram.structureIsReused = StructureIsReused.SafeModules;
        }
        if ((oldSourceFile.flags & NodeFlags.PermanentlySetIncrementalFlags) !== (newSourceFile.flags & NodeFlags.PermanentlySetIncrementalFlags)) {
          oldProgram.structureIsReused = StructureIsReused.SafeModules;
        }
        if (!arrayIsEqualTo(oldSourceFile.typeReferenceDirectives, newSourceFile.typeReferenceDirectives, fileReferenceIsEqualTo)) {
          oldProgram.structureIsReused = StructureIsReused.SafeModules;
        }
        modifiedSourceFiles.push({ oldFile: oldSourceFile, newFile: newSourceFile });
      } else if (hasInvalidatedResolution(oldSourceFile.path)) {
        oldProgram.structureIsReused = StructureIsReused.SafeModules;
        modifiedSourceFiles.push({ oldFile: oldSourceFile, newFile: newSourceFile });
      }
      newSourceFiles.push(newSourceFile);
    }
    if (oldProgram.structureIsReused !== StructureIsReused.Completely) return oldProgram.structureIsReused;
    const modifiedFiles = modifiedSourceFiles.map((f) => f.oldFile);
    for (const oldFile of oldSourceFiles) {
      if (!contains(modifiedFiles, oldFile)) {
        for (const moduleName of oldFile.ambientModuleNames) {
          ambientModuleNameToUnmodifiedFileName.set(moduleName, oldFile.fileName);
        }
      }
    }
    for (const { oldFile: oldSourceFile, newFile: newSourceFile } of modifiedSourceFiles) {
      const newSourceFilePath = getNormalizedAbsolutePath(newSourceFile.originalFileName, currentDirectory);
      const moduleNames = getModuleNames(newSourceFile);
      const resolutions = resolveModuleNamesReusingOldState(moduleNames, newSourceFilePath, newSourceFile);
      const resolutionsChanged = hasChangesInResolutions(moduleNames, resolutions, oldSourceFile.resolvedModules, moduleResolutionIsEqualTo);
      if (resolutionsChanged) {
        oldProgram.structureIsReused = StructureIsReused.SafeModules;
        newSourceFile.resolvedModules = zipToMap(moduleNames, resolutions);
      } else {
        newSourceFile.resolvedModules = oldSourceFile.resolvedModules;
      }
      if (resolveTypeReferenceDirectiveNamesWorker) {
        const typesReferenceDirectives = map(newSourceFile.typeReferenceDirectives, (ref) => toFileNameLowerCase(ref.fileName));
        const resolutions = resolveTypeReferenceDirectiveNamesWorker(typesReferenceDirectives, newSourceFilePath, getResolvedProjectReferenceToRedirect(newSourceFile.originalFileName));
        const resolutionsChanged = hasChangesInResolutions(typesReferenceDirectives, resolutions, oldSourceFile.resolvedTypeReferenceDirectiveNames, typeDirectiveIsEqualTo);
        if (resolutionsChanged) {
          oldProgram.structureIsReused = StructureIsReused.SafeModules;
          newSourceFile.resolvedTypeReferenceDirectiveNames = zipToMap(typesReferenceDirectives, resolutions);
        } else {
          newSourceFile.resolvedTypeReferenceDirectiveNames = oldSourceFile.resolvedTypeReferenceDirectiveNames;
        }
      }
    }
    if (oldProgram.structureIsReused !== StructureIsReused.Completely) return oldProgram.structureIsReused;
    if (host.hasChangedAutomaticTypeDirectiveNames) return (oldProgram.structureIsReused = StructureIsReused.SafeModules);
    missingFilePaths = oldProgram.getMissingFilePaths();
    refFileMap = oldProgram.getRefFileMap();
    assert(newSourceFiles.length === oldProgram.getSourceFiles().length);
    for (const newSourceFile of newSourceFiles) {
      filesByName.set(newSourceFile.path, newSourceFile);
    }
    const oldFilesByNameMap = oldProgram.getFilesByNameMap();
    oldFilesByNameMap.forEach((oldFile, path) => {
      if (!oldFile) {
        filesByName.set(path, oldFile);
        return;
      }
      if (oldFile.path === path) {
        if (oldProgram!.isSourceFileFromExternalLibrary(oldFile)) {
          sourceFilesFoundSearchingNodeModules.set(oldFile.path, true);
        }
        return;
      }
      filesByName.set(path, filesByName.get(oldFile.path));
    });
    files = newSourceFiles;
    fileProcessingDiagnostics = oldProgram.getFileProcessingDiagnostics();
    for (const modifiedFile of modifiedSourceFiles) {
      fileProcessingqd.reattachFileDiagnostics(modifiedFile.newFile);
    }
    resolvedTypeReferenceDirectives = oldProgram.getResolvedTypeReferenceDirectives();
    sourceFileToPackageName = oldProgram.sourceFileToPackageName;
    redirectTargetsMap = oldProgram.redirectTargetsMap;
    return (oldProgram.structureIsReused = StructureIsReused.Completely);
  }
  function getEmitHost(writeFileCallback?: WriteFileCallback): EmitHost {
    return {
      getPrependNodes,
      getCanonicalFileName,
      getCommonSourceDirectory: program.getCommonSourceDirectory,
      getCompilerOptions: program.getCompilerOptions,
      getCurrentDirectory: () => currentDirectory,
      getNewLine: () => host.getNewLine(),
      getSourceFile: program.getSourceFile,
      getSourceFileByPath: program.getSourceFileByPath,
      getSourceFiles: program.getSourceFiles,
      getLibFileFromReference: program.getLibFileFromReference,
      isSourceFileFromExternalLibrary,
      getResolvedProjectReferenceToRedirect,
      getProjectReferenceRedirect,
      isSourceOfProjectReferenceRedirect,
      getProbableSymlinks,
      writeFile: writeFileCallback || ((fileName, data, writeByteOrderMark, onError, sourceFiles) => host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles)),
      isEmitBlocked,
      readFile: (f) => host.readFile(f),
      fileExists: (f) => {
        const path = toPath(f);
        if (getSourceFileByPath(path)) return true;
        if (contains(missingFilePaths, path)) return false;
        return host.fileExists(f);
      },
      useCaseSensitiveFileNames: () => host.useCaseSensitiveFileNames(),
      getProgramBuildInfo: () => program.getProgramBuildInfo && program.getProgramBuildInfo(),
      getSourceFileFromReference: (file, ref) => program.getSourceFileFromReference(file, ref),
      redirectTargetsMap,
    };
  }
  function emitBuildInfo(writeFileCallback?: WriteFileCallback): EmitResult {
    assert(!options.out && !options.outFile);
    performance.mark('beforeEmit');
    const emitResult = emitFiles(notImplementedResolver, getEmitHost(writeFileCallback), undefined, noTransformers, false, true);
    performance.mark('afterEmit');
    performance.measure('Emit', 'beforeEmit', 'afterEmit');
    return emitResult;
  }
  function getResolvedProjectReferences() {
    return resolvedProjectReferences;
  }
  function getProjectReferences() {
    return projectReferences;
  }
  function getPrependNodes() {
    return createPrependNodes(
      projectReferences,
      (_ref, index) => resolvedProjectReferences![index]!.commandLine,
      (fileName) => {
        const path = toPath(fileName);
        const sourceFile = getSourceFileByPath(path);
        return sourceFile ? sourceFile.text : filesByName.has(path) ? undefined : host.readFile(path);
      }
    );
  }
  function isSourceFileFromExternalLibrary(file: SourceFile): boolean {
    return !!sourceFilesFoundSearchingNodeModules.get(file.path);
  }
  function isSourceFileDefaultLibrary(file: SourceFile): boolean {
    if (file.hasNoDefaultLib) return true;
    if (!options.noLib) return false;
    const equalityComparer = host.useCaseSensitiveFileNames() ? equateStringsCaseSensitive : equateStringsCaseInsensitive;
    if (!options.lib) return equalityComparer(file.fileName, getDefaultLibraryFileName());
    return some(options.lib, (libFileName) => equalityComparer(file.fileName, combinePaths(defaultLibraryPath, libFileName)));
  }
  function getDiagnosticsProducingTypeChecker() {
    return diagnosticsProducingTypeChecker || (diagnosticsProducingTypeChecker = qc_create(program, true));
  }
  function dropDiagnosticsProducingTypeChecker() {
    diagnosticsProducingTypeChecker = undefined!;
  }
  function getTypeChecker() {
    return noDiagnosticsTypeChecker || (noDiagnosticsTypeChecker = qc_create(program, false));
  }
  function emit(
    sourceFile?: SourceFile,
    writeFileCallback?: WriteFileCallback,
    cancellationToken?: CancellationToken,
    emitOnlyDtsFiles?: boolean,
    transformers?: CustomTransformers,
    forceDtsEmit?: boolean
  ): EmitResult {
    return runWithCancellationToken(() => emitWorker(program, sourceFile, writeFileCallback, cancellationToken, emitOnlyDtsFiles, transformers, forceDtsEmit));
  }
  function isEmitBlocked(emitFileName: string): boolean {
    return hasEmitBlockingqd.has(toPath(emitFileName));
  }
  function emitWorker(
    program: Program,
    sourceFile: SourceFile | undefined,
    writeFileCallback: WriteFileCallback | undefined,
    cancellationToken: CancellationToken | undefined,
    emitOnlyDtsFiles?: boolean,
    customTransformers?: CustomTransformers,
    forceDtsEmit?: boolean
  ): EmitResult {
    if (!forceDtsEmit) {
      const result = handleNoEmitOptions(program, sourceFile, cancellationToken);
      if (result) return result;
    }
    const emitResolver = getDiagnosticsProducingTypeChecker().getEmitResolver(options.outFile || options.out ? undefined : sourceFile, cancellationToken);
    performance.mark('beforeEmit');
    const emitResult = emitFiles(emitResolver, getEmitHost(writeFileCallback), sourceFile, getTransformers(options, customTransformers, emitOnlyDtsFiles), emitOnlyDtsFiles, false, forceDtsEmit);
    performance.mark('afterEmit');
    performance.measure('Emit', 'beforeEmit', 'afterEmit');
    return emitResult;
  }
  function getSourceFile(fileName: string): SourceFile | undefined {
    return getSourceFileByPath(toPath(fileName));
  }
  function getSourceFileByPath(path: Path): SourceFile | undefined {
    return filesByName.get(path) || undefined;
  }
  function getDiagnosticsHelper<T extends Diagnostic>(
    sourceFile: SourceFile | undefined,
    getDiagnostics: (sourceFile: SourceFile, cancellationToken: CancellationToken | undefined) => readonly T[],
    cancellationToken: CancellationToken | undefined
  ): readonly T[] {
    if (sourceFile) return getDiagnostics(sourceFile, cancellationToken);
    return sortAndDeduplicateDiagnostics(
      flatMap(program.getSourceFiles(), (sourceFile) => {
        if (cancellationToken) {
          cancellationToken.throwIfCancellationRequested();
        }
        return getDiagnostics(sourceFile, cancellationToken);
      })
    );
  }
  function getSyntacticDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly DiagnosticWithLocation[] {
    return getDiagnosticsHelper(sourceFile, getSyntacticDiagnosticsForFile, cancellationToken);
  }
  function getSemanticDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[] {
    return getDiagnosticsHelper(sourceFile, getSemanticDiagnosticsForFile, cancellationToken);
  }
  function getBindAndCheckDiagnostics(sourceFile: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[] {
    return getBindAndCheckDiagnosticsForFile(sourceFile, cancellationToken);
  }
  function getProgramDiagnostics(sourceFile: SourceFile): readonly Diagnostic[] {
    if (skipTypeChecking(sourceFile, options, program)) return emptyArray;
    const fileProcessingDiagnosticsInFile = fileProcessingqd.getDiagnostics(sourceFile.fileName);
    const programDiagnosticsInFile = programqd.getDiagnostics(sourceFile.fileName);
    return getMergedProgramDiagnostics(sourceFile, fileProcessingDiagnosticsInFile, programDiagnosticsInFile);
  }
  function getMergedProgramDiagnostics(sourceFile: SourceFile, ...allDiagnostics: (readonly Diagnostic[] | undefined)[]) {
    const flatDiagnostics = flatten(allDiagnostics);
    if (!sourceFile.commentDirectives?.length) return flatDiagnostics;
    return getDiagnosticsWithPrecedingDirectives(sourceFile, sourceFile.commentDirectives, flatDiagnostics).diagnostics;
  }
  function getDeclarationDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly DiagnosticWithLocation[] {
    const options = program.getCompilerOptions();
    if (!sourceFile || options.out || options.outFile) return getDeclarationDiagnosticsWorker(sourceFile, cancellationToken);
    return getDiagnosticsHelper(sourceFile, getDeclarationDiagnosticsForFile, cancellationToken);
  }
  function getSyntacticDiagnosticsForFile(sourceFile: SourceFile): readonly DiagnosticWithLocation[] {
    if (isSourceFileJS(sourceFile)) {
      if (!sourceFile.additionalSyntacticDiagnostics) {
        sourceFile.additionalSyntacticDiagnostics = getJSSyntacticDiagnosticsForFile(sourceFile);
      }
      return concatenate(sourceFile.additionalSyntacticDiagnostics, sourceFile.parseDiagnostics);
    }
    return sourceFile.parseDiagnostics;
  }
  function runWithCancellationToken<T>(func: () => T): T {
    try {
      return func();
    } catch (e) {
      if (e instanceof OperationCanceledException) {
        noDiagnosticsTypeChecker = undefined!;
        diagnosticsProducingTypeChecker = undefined!;
      }
      throw e;
    }
  }
  function getSemanticDiagnosticsForFile(sourceFile: SourceFile, cancellationToken: CancellationToken | undefined): readonly Diagnostic[] {
    return concatenate(getBindAndCheckDiagnosticsForFile(sourceFile, cancellationToken), getProgramDiagnostics(sourceFile));
  }
  function getBindAndCheckDiagnosticsForFile(sourceFile: SourceFile, cancellationToken: CancellationToken | undefined): readonly Diagnostic[] {
    return getAndCacheDiagnostics(sourceFile, cancellationToken, cachedBindAndCheckDiagnosticsForFile, getBindAndCheckDiagnosticsForFileNoCache);
  }
  function getBindAndCheckDiagnosticsForFileNoCache(sourceFile: SourceFile, cancellationToken: CancellationToken | undefined): readonly Diagnostic[] {
    return runWithCancellationToken(() => {
      if (skipTypeChecking(sourceFile, options, program)) return emptyArray;
      const typeChecker = getDiagnosticsProducingTypeChecker();
      assert(!!sourceFile.bindDiagnostics);
      const isCheckJs = isCheckJsEnabledForFile(sourceFile, options);
      const isTsNoCheck = !!sourceFile.checkJsDirective && sourceFile.checkJsDirective.enabled === false;
      const includeBindAndCheckDiagnostics =
        !isTsNoCheck &&
        (sourceFile.scriptKind === ScriptKind.TS ||
          sourceFile.scriptKind === ScriptKind.TSX ||
          sourceFile.scriptKind === ScriptKind.External ||
          isCheckJs ||
          sourceFile.scriptKind === ScriptKind.Deferred);
      const bindDiagnostics: readonly Diagnostic[] = includeBindAndCheckDiagnostics ? sourceFile.bindDiagnostics : emptyArray;
      const checkDiagnostics = includeBindAndCheckDiagnostics ? typeChecker.getDiagnostics(sourceFile, cancellationToken) : emptyArray;
      return getMergedBindAndCheckDiagnostics(sourceFile, bindDiagnostics, checkDiagnostics, isCheckJs ? sourceFile.jsDocDiagnostics : undefined);
    });
  }
  function getMergedBindAndCheckDiagnostics(sourceFile: SourceFile, ...allDiagnostics: (readonly Diagnostic[] | undefined)[]) {
    const flatDiagnostics = flatten(allDiagnostics);
    if (!sourceFile.commentDirectives?.length) return flatDiagnostics;
    const { diagnostics, directives } = getDiagnosticsWithPrecedingDirectives(sourceFile, sourceFile.commentDirectives, flatDiagnostics);
    for (const errorExpectation of directives.getUnusedExpectations()) {
      diagnostics.push(createDiagnosticForRange(sourceFile, errorExpectation.range, qd.Unused_ts_expect_error_directive));
    }
    return diagnostics;
  }
  function getDiagnosticsWithPrecedingDirectives(sourceFile: SourceFile, commentDirectives: CommentDirective[], flatDiagnostics: Diagnostic[]) {
    const directives = createCommentDirectivesMap(sourceFile, commentDirectives);
    const diagnostics = flatqd.filter((diagnostic) => markPrecedingCommentDirectiveLine(diagnostic, directives) === -1);
    return { diagnostics, directives };
  }
  function getSuggestionDiagnostics(sourceFile: SourceFile, cancellationToken: CancellationToken): readonly DiagnosticWithLocation[] {
    return runWithCancellationToken(() => {
      return getDiagnosticsProducingTypeChecker().getSuggestionDiagnostics(sourceFile, cancellationToken);
    });
  }
  function markPrecedingCommentDirectiveLine(diagnostic: Diagnostic, directives: CommentDirectivesMap) {
    const { file, start } = diagnostic;
    if (!file) return -1;
    const s = syntax.get.lineStarts(file);
    let line = syntax.get.lineAndCharOf(s, start!).line - 1;
    while (line >= 0) {
      if (directives.markUsed(line)) return line;
      const lineText = file.text.slice(s[line], s[line + 1]).trim();
      if (lineText !== '' && !/^(\s*)\/\/(.*)$/.test(lineText)) return -1;
      line--;
    }
    return -1;
  }
  function getJSSyntacticDiagnosticsForFile(sourceFile: SourceFile): DiagnosticWithLocation[] {
    return runWithCancellationToken(() => {
      const diagnostics: DiagnosticWithLocation[] = [];
      walk(sourceFile, sourceFile);
      Node.forEach.childRecursively(sourceFile, walk, walkArray);
      return diagnostics;
      function walk(node: Node, parent: Node) {
        switch (parent.kind) {
          case Syntax.Parameter:
          case Syntax.PropertyDeclaration:
          case Syntax.MethodDeclaration:
            if ((<ParameterDeclaration | PropertyDeclaration | MethodDeclaration>parent).questionToken === node) {
              diagnostics.push(createDiagnosticForNode(node, qd.The_0_modifier_can_only_be_used_in_TypeScript_files, '?'));
              return 'skip';
            }
          case Syntax.MethodSignature:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.FunctionExpression:
          case Syntax.FunctionDeclaration:
          case Syntax.ArrowFunction:
          case Syntax.VariableDeclaration:
            if ((<FunctionLikeDeclaration | VariableDeclaration | ParameterDeclaration | PropertyDeclaration>parent).type === node) {
              diagnostics.push(createDiagnosticForNode(node, qd.Type_annotations_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
        }
        switch (node.kind) {
          case Syntax.ImportClause:
            if ((node as ImportClause).isTypeOnly) {
              diagnostics.push(createDiagnosticForNode(node.parent, qd._0_declarations_can_only_be_used_in_TypeScript_files, 'import type'));
              return 'skip';
            }
            break;
          case Syntax.ExportDeclaration:
            if ((node as ExportDeclaration).isTypeOnly) {
              diagnostics.push(createDiagnosticForNode(node, qd._0_declarations_can_only_be_used_in_TypeScript_files, 'export type'));
              return 'skip';
            }
            break;
          case Syntax.ImportEqualsDeclaration:
            diagnostics.push(createDiagnosticForNode(node, qd.import_can_only_be_used_in_TypeScript_files));
            return 'skip';
          case Syntax.ExportAssignment:
            if ((<ExportAssignment>node).isExportEquals) {
              diagnostics.push(createDiagnosticForNode(node, qd.export_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
            break;
          case Syntax.HeritageClause:
            const heritageClause = <HeritageClause>node;
            if (heritageClause.token === Syntax.ImplementsKeyword) {
              diagnostics.push(createDiagnosticForNode(node, qd.implements_clauses_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
            break;
          case Syntax.InterfaceDeclaration:
            const interfaceKeyword = Token.toString(Syntax.InterfaceKeyword);
            Debug.assertIsDefined(interfaceKeyword);
            diagnostics.push(createDiagnosticForNode(node, qd._0_declarations_can_only_be_used_in_TypeScript_files, interfaceKeyword));
            return 'skip';
          case Syntax.ModuleDeclaration:
            const moduleKeyword = node.flags & NodeFlags.Namespace ? Token.toString(Syntax.NamespaceKeyword) : Token.toString(Syntax.ModuleKeyword);
            Debug.assertIsDefined(moduleKeyword);
            diagnostics.push(createDiagnosticForNode(node, qd._0_declarations_can_only_be_used_in_TypeScript_files, moduleKeyword));
            return 'skip';
          case Syntax.TypeAliasDeclaration:
            diagnostics.push(createDiagnosticForNode(node, qd.Type_aliases_can_only_be_used_in_TypeScript_files));
            return 'skip';
          case Syntax.EnumDeclaration:
            const enumKeyword = Debug.checkDefined(Token.toString(Syntax.EnumKeyword));
            diagnostics.push(createDiagnosticForNode(node, qd._0_declarations_can_only_be_used_in_TypeScript_files, enumKeyword));
            return 'skip';
          case Syntax.NonNullExpression:
            diagnostics.push(createDiagnosticForNode(node, qd.Non_null_assertions_can_only_be_used_in_TypeScript_files));
            return 'skip';
          case Syntax.AsExpression:
            diagnostics.push(createDiagnosticForNode((node as AsExpression).type, qd.Type_assertion_expressions_can_only_be_used_in_TypeScript_files));
            return 'skip';
          case Syntax.TypeAssertionExpression:
            fail();
        }
      }
      function walkArray(nodes: Nodes<Node>, parent: Node) {
        if (parent.decorators === nodes && !options.experimentalDecorators) {
          diagnostics.push(
            createDiagnosticForNode(
              parent,
              qd.Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_the_experimentalDecorators_option_in_your_tsconfig_or_jsconfig_to_remove_this_warning
            )
          );
        }
        switch (parent.kind) {
          case Syntax.ClassDeclaration:
          case Syntax.ClassExpression:
          case Syntax.MethodDeclaration:
          case Syntax.Constructor:
          case Syntax.GetAccessor:
          case Syntax.SetAccessor:
          case Syntax.FunctionExpression:
          case Syntax.FunctionDeclaration:
          case Syntax.ArrowFunction:
            if (nodes === (<DeclarationWithTypeParameterChildren>parent).typeParameters) {
              diagnostics.push(createDiagnosticForNodes(nodes, qd.Type_parameter_declarations_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
          case Syntax.VariableStatement:
            if (nodes === parent.modifiers) {
              checkModifiers(parent.modifiers, parent.kind === Syntax.VariableStatement);
              return 'skip';
            }
            break;
          case Syntax.PropertyDeclaration:
            if (nodes === (<PropertyDeclaration>parent).modifiers) {
              for (const modifier of <Nodes<Modifier>>nodes) {
                if (modifier.kind !== Syntax.StaticKeyword) {
                  diagnostics.push(createDiagnosticForNode(modifier, qd.The_0_modifier_can_only_be_used_in_TypeScript_files, Token.toString(modifier.kind)));
                }
              }
              return 'skip';
            }
            break;
          case Syntax.Parameter:
            if (nodes === (<ParameterDeclaration>parent).modifiers) {
              diagnostics.push(createDiagnosticForNodes(nodes, qd.Parameter_modifiers_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
            break;
          case Syntax.CallExpression:
          case Syntax.NewExpression:
          case Syntax.ExpressionWithTypeArguments:
          case Syntax.JsxSelfClosingElement:
          case Syntax.JsxOpeningElement:
          case Syntax.TaggedTemplateExpression:
            if (nodes === (<NodeWithTypeArguments>parent).typeArguments) {
              diagnostics.push(createDiagnosticForNodes(nodes, qd.Type_arguments_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
            break;
        }
      }
      function checkModifiers(modifiers: Nodes<Modifier>, isConstValid: boolean) {
        for (const modifier of modifiers) {
          switch (modifier.kind) {
            case Syntax.ConstKeyword:
              if (isConstValid) {
                continue;
              }
            case Syntax.PublicKeyword:
            case Syntax.PrivateKeyword:
            case Syntax.ProtectedKeyword:
            case Syntax.ReadonlyKeyword:
            case Syntax.DeclareKeyword:
            case Syntax.AbstractKeyword:
              diagnostics.push(createDiagnosticForNode(modifier, qd.The_0_modifier_can_only_be_used_in_TypeScript_files, Token.toString(modifier.kind)));
              break;
            case Syntax.StaticKeyword:
            case Syntax.ExportKeyword:
            case Syntax.DefaultKeyword:
          }
        }
      }
      function createDiagnosticForNodes(nodes: Nodes<Node>, message: DiagnosticMessage, arg0?: string | number, arg1?: string | number, arg2?: string | number): DiagnosticWithLocation {
        const start = nodes.pos;
        return createFileDiagnostic(sourceFile, start, nodes.end - start, message, arg0, arg1, arg2);
      }
      function createDiagnosticForNode(node: Node, message: DiagnosticMessage, arg0?: string | number, arg1?: string | number, arg2?: string | number): DiagnosticWithLocation {
        return createDiagnosticForNodeInSourceFile(sourceFile, node, message, arg0, arg1, arg2);
      }
    });
  }
  function getDeclarationDiagnosticsWorker(sourceFile: SourceFile | undefined, cancellationToken: CancellationToken | undefined): readonly DiagnosticWithLocation[] {
    return getAndCacheDiagnostics(sourceFile, cancellationToken, cachedDeclarationDiagnosticsForFile, getDeclarationDiagnosticsForFileNoCache);
  }
  function getDeclarationDiagnosticsForFileNoCache(sourceFile: SourceFile | undefined, cancellationToken: CancellationToken | undefined): readonly DiagnosticWithLocation[] {
    return runWithCancellationToken(() => {
      const resolver = getDiagnosticsProducingTypeChecker().getEmitResolver(sourceFile, cancellationToken);
      return qnr.getDeclarationDiagnostics(getEmitHost(noop), resolver, sourceFile) || emptyArray;
    });
  }
  function getAndCacheDiagnostics<T extends SourceFile | undefined, U extends Diagnostic>(
    sourceFile: T,
    cancellationToken: CancellationToken | undefined,
    cache: DiagnosticCache<U>,
    getDiagnostics: (sourceFile: T, cancellationToken: CancellationToken | undefined) => readonly U[]
  ): readonly U[] {
    const cachedResult = sourceFile ? cache.perFile && cache.perFile.get(sourceFile.path) : cache.allDiagnostics;
    if (cachedResult) return cachedResult;
    const result = getDiagnostics(sourceFile, cancellationToken);
    if (sourceFile) {
      if (!cache.perFile) {
        cache.perFile = createMap();
      }
      cache.perFile.set(sourceFile.path, result);
    } else {
      cache.allDiagnostics = result;
    }
    return result;
  }
  function getDeclarationDiagnosticsForFile(sourceFile: SourceFile, cancellationToken: CancellationToken): readonly DiagnosticWithLocation[] {
    return sourceFile.isDeclarationFile ? [] : getDeclarationDiagnosticsWorker(sourceFile, cancellationToken);
  }
  function getOptionsDiagnostics(): SortedReadonlyArray<Diagnostic> {
    return sortAndDeduplicateDiagnostics(concatenate(fileProcessingqd.getGlobalDiagnostics(), concatenate(programqd.getGlobalDiagnostics(), getOptionsDiagnosticsOfConfigFile())));
  }
  function getOptionsDiagnosticsOfConfigFile() {
    if (!options.configFile) return emptyArray;
    let diagnostics = programqd.getDiagnostics(options.configFile.fileName);
    forEachResolvedProjectReference((resolvedRef) => {
      if (resolvedRef) {
        diagnostics = concatenate(diagnostics, programqd.getDiagnostics(resolvedRef.sourceFile.fileName));
      }
    });
    return diagnostics;
  }
  function getGlobalDiagnostics(): SortedReadonlyArray<Diagnostic> {
    return rootNames.length ? sortAndDeduplicateDiagnostics(getDiagnosticsProducingTypeChecker().getGlobalDiagnostics().slice()) : ((emptyArray as any) as SortedReadonlyArray<Diagnostic>);
  }
  function getConfigFileParsingDiagnostics(): readonly Diagnostic[] {
    return configFileParsingDiagnostics || emptyArray;
  }
  function processRootFile(fileName: string, isDefaultLib: boolean, ignoreNoDefaultLib: boolean) {
    processSourceFile(normalizePath(fileName), isDefaultLib, ignoreNoDefaultLib, undefined);
  }
  function fileReferenceIsEqualTo(a: FileReference, b: FileReference): boolean {
    return a.fileName === b.fileName;
  }
  function moduleNameIsEqualTo(a: StringLiteralLike | Identifier, b: StringLiteralLike | Identifier): boolean {
    return a.kind === Syntax.Identifier ? b.kind === Syntax.Identifier && a.escapedText === b.escapedText : b.kind === Syntax.StringLiteral && a.text === b.text;
  }
  function collectExternalModuleReferences(file: SourceFile): void {
    if (file.imports) {
      return;
    }
    const isJavaScriptFile = isSourceFileJS(file);
    const qp_isExternalModuleFile = qp_isExternalModule(file);
    let imports: StringLiteralLike[] | undefined;
    let moduleAugmentations: (StringLiteral | Identifier)[] | undefined;
    let ambientModules: string[] | undefined;
    if (options.importHelpers && (options.isolatedModules || qp_isExternalModuleFile) && !file.isDeclarationFile) {
      const externalHelpersModuleReference = createLiteral(externalHelpersModuleNameText);
      const importDecl = new qc.ImportDeclaration(undefined, undefined, externalHelpersModuleReference);
      addEmitFlags(importDecl, EmitFlags.NeverApplyImportHelper);
      externalHelpersModuleReference.parent = importDecl;
      importDecl.parent = file;
      imports = [externalHelpersModuleReference];
    }
    for (const node of file.statements) {
      collectModuleReferences(node, false);
    }
    if (file.flags & NodeFlags.PossiblyContainsDynamicImport || isJavaScriptFile) {
      collectDynamicImportOrRequireCalls(file);
    }
    file.imports = imports || emptyArray;
    file.moduleAugmentations = moduleAugmentations || emptyArray;
    file.ambientModuleNames = ambientModules || emptyArray;
    return;
    function collectModuleReferences(node: Statement, inAmbientModule: boolean): void {
      if (Node.is.anyImportOrReExport(node)) {
        const moduleNameExpr = getExternalModuleName(node);
        if (moduleNameExpr && Node.is.kind(StringLiteral, moduleNameExpr) && moduleNameExpr.text && (!inAmbientModule || !qp_isExternalModuleNameRelative(moduleNameExpr.text))) {
          imports = append(imports, moduleNameExpr);
        }
      } else if (Node.is.kind(ModuleDeclaration, node)) {
        if (Node.is.ambientModule(node) && (inAmbientModule || hasSyntacticModifier(node, ModifierFlags.Ambient) || file.isDeclarationFile)) {
          const nameText = getTextOfIdentifierOrLiteral(node.name);
          if (qp_isExternalModuleFile || (inAmbientModule && !qp_isExternalModuleNameRelative(nameText))) {
            (moduleAugmentations || (moduleAugmentations = [])).push(node.name);
          } else if (!inAmbientModule) {
            if (file.isDeclarationFile) {
              (ambientModules || (ambientModules = [])).push(nameText);
            }
            const body = <ModuleBlock>(<ModuleDeclaration>node).body;
            if (body) {
              for (const statement of body.statements) {
                collectModuleReferences(statement, true);
              }
            }
          }
        }
      }
    }
    function collectDynamicImportOrRequireCalls(file: SourceFile) {
      const r = /import|require/g;
      while (r.exec(file.text) !== null) {
        const node = getNodeAtPosition(file, r.lastIndex);
        if (isRequireCall(node, true)) {
          imports = append(imports, node.arguments[0]);
        } else if (Node.is.importCall(node) && node.arguments.length === 1 && StringLiteral.like(node.arguments[0])) {
          imports = append(imports, node.arguments[0] as StringLiteralLike);
        } else if (Node.is.literalImportTypeNode(node)) {
          imports = append(imports, node.argument.literal);
        }
      }
    }
    function getNodeAtPosition(sourceFile: SourceFile, position: number): Node {
      let current: Node = sourceFile;
      const getContainingChild = (child: Node) => {
        if (child.pos <= position && (position < child.end || (position === child.end && child.kind === Syntax.EndOfFileToken))) return child;
      };
      while (true) {
        const child = (isJavaScriptFile && Node.is.withJSDocNodes(current) && forEach(current.jsDoc, getContainingChild)) || Node.forEach.child(current, getContainingChild);
        if (!child) return current;
        current = child;
      }
    }
  }
  function getLibFileFromReference(ref: FileReference) {
    const libName = toFileNameLowerCase(ref.fileName);
    const libFileName = libMap.get(libName);
    if (libFileName) return getSourceFile(combinePaths(defaultLibraryPath, libFileName));
  }
  function getSourceFileFromReference(referencingFile: SourceFile | UnparsedSource, ref: FileReference): SourceFile | undefined {
    return getSourceFileFromReferenceWorker(resolveTripleslashReference(ref.fileName, referencingFile.fileName), (fileName) => filesByName.get(toPath(fileName)) || undefined);
  }
  function getSourceFileFromReferenceWorker(
    fileName: string,
    getSourceFile: (fileName: string) => SourceFile | undefined,
    fail?: (diagnostic: DiagnosticMessage, ...argument: string[]) => void,
    refFile?: SourceFile
  ): SourceFile | undefined {
    if (hasExtension(fileName)) {
      const canonicalFileName = host.getCanonicalFileName(fileName);
      if (!options.allowNonTsExtensions && !forEach(supportedExtensionsWithJsonIfResolveJsonModule, (extension) => fileExtensionIs(canonicalFileName, extension))) {
        if (fail) {
          if (hasJSFileExtension(canonicalFileName)) {
            fail(qd.File_0_is_a_JavaScript_file_Did_you_mean_to_enable_the_allowJs_option, fileName);
          } else {
            fail(qd.File_0_has_an_unsupported_extension_The_only_supported_extensions_are_1, fileName, "'" + supportedExtensions.join("', '") + "'");
          }
        }
        return;
      }
      const sourceFile = getSourceFile(fileName);
      if (fail) {
        if (!sourceFile) {
          const redirect = getProjectReferenceRedirect(fileName);
          if (redirect) {
            fail(qd.Output_file_0_has_not_been_built_from_source_file_1, redirect, fileName);
          } else {
            fail(qd.File_0_not_found, fileName);
          }
        } else if (refFile && canonicalFileName === host.getCanonicalFileName(refFile.fileName)) {
          fail(qd.A_file_cannot_have_a_reference_to_itself);
        }
      }
      return sourceFile;
    } else {
      const sourceFileNoExtension = options.allowNonTsExtensions && getSourceFile(fileName);
      if (sourceFileNoExtension) return sourceFileNoExtension;
      if (fail && options.allowNonTsExtensions) {
        fail(qd.File_0_not_found, fileName);
        return;
      }
      const sourceFileWithAddedExtension = forEach(supportedExtensions, (extension) => getSourceFile(fileName + extension));
      if (fail && !sourceFileWithAddedExtension) fail(qd.Could_not_resolve_the_path_0_with_the_extensions_Colon_1, fileName, "'" + supportedExtensions.join("', '") + "'");
      return sourceFileWithAddedExtension;
    }
  }
  function processSourceFile(fileName: string, isDefaultLib: boolean, ignoreNoDefaultLib: boolean, packageId: PackageId | undefined, refFile?: RefFile): void {
    getSourceFileFromReferenceWorker(
      fileName,
      (fileName) => findSourceFile(fileName, toPath(fileName), isDefaultLib, ignoreNoDefaultLib, refFile, packageId),
      (diagnostic, ...args) => fileProcessingqd.add(createRefFileDiagnostic(refFile, diagnostic, ...args)),
      refFile && refFile.file
    );
  }
  function reportFileNamesDifferOnlyInCasingError(fileName: string, existingFile: SourceFile, refFile: RefFile | undefined): void {
    const refs = !refFile ? refFileMap && refFileMap.get(existingFile.path) : undefined;
    const refToReportErrorOn = refs && find(refs, (ref) => ref.referencedFileName === existingFile.fileName);
    fileProcessingqd.add(
      refToReportErrorOn
        ? createFileDiagnosticAtReference(refToReportErrorOn, qd.Already_included_file_name_0_differs_from_file_name_1_only_in_casing, existingFile.fileName, fileName)
        : createRefFileDiagnostic(refFile, qd.File_name_0_differs_from_already_included_file_name_1_only_in_casing, fileName, existingFile.fileName)
    );
  }
  function createRedirectSourceFile(redirectTarget: SourceFile, unredirected: SourceFile, fileName: string, path: Path, resolvedPath: Path, originalFileName: string): SourceFile {
    const redirect: SourceFile = Object.create(redirectTarget);
    redirect.fileName = fileName;
    redirect.path = path;
    redirect.resolvedPath = resolvedPath;
    redirect.originalFileName = originalFileName;
    redirect.redirectInfo = { redirectTarget, unredirected };
    sourceFilesFoundSearchingNodeModules.set(path, currentNodeModulesDepth > 0);
    Object.defineProperties(redirect, {
      id: {
        get(this: SourceFile) {
          return this.redirectInfo!.redirectTarget.id;
        },
        set(this: SourceFile, value: SourceFile['id']) {
          this.redirectInfo!.redirectTarget.id = value;
        },
      },
      symbol: {
        get(this: SourceFile) {
          return this.redirectInfo!.redirectTarget.symbol;
        },
        set(this: SourceFile, value: SourceFile['symbol']) {
          this.redirectInfo!.redirectTarget.symbol = value;
        },
      },
    });
    return redirect;
  }
  function findSourceFile(fileName: string, path: Path, isDefaultLib: boolean, ignoreNoDefaultLib: boolean, refFile: RefFile | undefined, packageId: PackageId | undefined): SourceFile | undefined {
    if (useSourceOfProjectReferenceRedirect) {
      let source = getSourceOfProjectReferenceRedirect(fileName);
      if (!source && host.realpath && options.preserveSymlinks && isDeclarationFileName(fileName) && stringContains(fileName, nodeModulesPathPart)) {
        const realPath = host.realpath(fileName);
        if (realPath !== fileName) source = getSourceOfProjectReferenceRedirect(realPath);
      }
      if (source) {
        const file = isString(source) ? findSourceFile(source, toPath(source), isDefaultLib, ignoreNoDefaultLib, refFile, packageId) : undefined;
        if (file) addFileToFilesByName(file, path, undefined);
        return file;
      }
    }
    const originalFileName = fileName;
    if (filesByName.has(path)) {
      const file = filesByName.get(path);
      addFileToRefFileMap(fileName, file || undefined, refFile);
      if (file && options.forceConsistentCasingInFileNames) {
        const checkedName = file.fileName;
        const isRedirect = toPath(checkedName) !== toPath(fileName);
        if (isRedirect) {
          fileName = getProjectReferenceRedirect(fileName) || fileName;
        }
        const checkedAbsolutePath = getNormalizedAbsolutePathWithoutRoot(checkedName, currentDirectory);
        const inputAbsolutePath = getNormalizedAbsolutePathWithoutRoot(fileName, currentDirectory);
        if (checkedAbsolutePath !== inputAbsolutePath) {
          reportFileNamesDifferOnlyInCasingError(fileName, file, refFile);
        }
      }
      if (file && sourceFilesFoundSearchingNodeModules.get(file.path) && currentNodeModulesDepth === 0) {
        sourceFilesFoundSearchingNodeModules.set(file.path, false);
        if (!options.noResolve) {
          processReferencedFiles(file, isDefaultLib);
          processTypeReferenceDirectives(file);
        }
        if (!options.noLib) {
          processLibReferenceDirectives(file);
        }
        modulesWithElidedImports.set(file.path, false);
        processImportedModules(file);
      } else if (file && modulesWithElidedImports.get(file.path)) {
        if (currentNodeModulesDepth < maxNodeModuleJsDepth) {
          modulesWithElidedImports.set(file.path, false);
          processImportedModules(file);
        }
      }
      return file || undefined;
    }
    let redirectedPath: Path | undefined;
    if (refFile && !useSourceOfProjectReferenceRedirect) {
      const redirectProject = getProjectReferenceRedirectProject(fileName);
      if (redirectProject) {
        if (redirectProject.commandLine.options.outFile || redirectProject.commandLine.options.out) {
          return;
        }
        const redirect = getProjectReferenceOutputName(redirectProject, fileName);
        fileName = redirect;
        redirectedPath = toPath(redirect);
      }
    }
    const file = host.getSourceFile(
      fileName,
      options.target!,
      (hostErrorMessage) => fileProcessingqd.add(createRefFileDiagnostic(refFile, qd.Cannot_read_file_0_Colon_1, fileName, hostErrorMessage)),
      shouldCreateNewSourceFile
    );
    if (packageId) {
      const packageIdKey = packageIdToString(packageId);
      const fileFromPackageId = packageIdToSourceFile.get(packageIdKey);
      if (fileFromPackageId) {
        const dupFile = createRedirectSourceFile(fileFromPackageId, file!, fileName, path, toPath(fileName), originalFileName);
        redirectTargetsMap.add(fileFromPackageId.path, fileName);
        addFileToFilesByName(dupFile, path, redirectedPath);
        sourceFileToPackageName.set(path, packageId.name);
        processingOtherFiles!.push(dupFile);
        return dupFile;
      } else if (file) {
        packageIdToSourceFile.set(packageIdKey, file);
        sourceFileToPackageName.set(path, packageId.name);
      }
    }
    addFileToFilesByName(file, path, redirectedPath);
    if (file) {
      sourceFilesFoundSearchingNodeModules.set(path, currentNodeModulesDepth > 0);
      file.fileName = fileName;
      file.path = path;
      file.resolvedPath = toPath(fileName);
      file.originalFileName = originalFileName;
      addFileToRefFileMap(fileName, file, refFile);
      if (host.useCaseSensitiveFileNames()) {
        const pathLowerCase = toFileNameLowerCase(path);
        const existingFile = filesByNameIgnoreCase!.get(pathLowerCase);
        if (existingFile) {
          reportFileNamesDifferOnlyInCasingError(fileName, existingFile, refFile);
        } else {
          filesByNameIgnoreCase!.set(pathLowerCase, file);
        }
      }
      skipDefaultLib = skipDefaultLib || (file.hasNoDefaultLib && !ignoreNoDefaultLib);
      if (!options.noResolve) {
        processReferencedFiles(file, isDefaultLib);
        processTypeReferenceDirectives(file);
      }
      if (!options.noLib) {
        processLibReferenceDirectives(file);
      }
      processImportedModules(file);
      if (isDefaultLib) {
        processingDefaultLibFiles!.push(file);
      } else {
        processingOtherFiles!.push(file);
      }
    }
    return file;
  }
  function addFileToRefFileMap(referencedFileName: string, file: SourceFile | undefined, refFile: RefFile | undefined) {
    if (refFile && file) {
      (refFileMap || (refFileMap = new MultiMap())).add(file.path, {
        referencedFileName,
        kind: refFile.kind,
        index: refFile.index,
        file: refFile.file.path,
      });
    }
  }
  function addFileToFilesByName(file: SourceFile | undefined, path: Path, redirectedPath: Path | undefined) {
    if (redirectedPath) {
      filesByName.set(redirectedPath, file);
      filesByName.set(path, file || false);
    } else {
      filesByName.set(path, file);
    }
  }
  function getProjectReferenceRedirect(fileName: string): string | undefined {
    const referencedProject = getProjectReferenceRedirectProject(fileName);
    return referencedProject && getProjectReferenceOutputName(referencedProject, fileName);
  }
  function getProjectReferenceRedirectProject(fileName: string) {
    if (!resolvedProjectReferences || !resolvedProjectReferences.length || fileExtensionIs(fileName, Extension.Dts) || fileExtensionIs(fileName, Extension.Json)) {
      return;
    }
    return getResolvedProjectReferenceToRedirect(fileName);
  }
  function getProjectReferenceOutputName(referencedProject: ResolvedProjectReference, fileName: string) {
    const out = referencedProject.commandLine.options.outFile || referencedProject.commandLine.options.out;
    return out ? changeExtension(out, Extension.Dts) : getOutputDeclarationFileName(fileName, referencedProject.commandLine, !host.useCaseSensitiveFileNames());
  }
  function getResolvedProjectReferenceToRedirect(fileName: string) {
    if (mapFromFileToProjectReferenceRedirects === undefined) {
      mapFromFileToProjectReferenceRedirects = createMap();
      forEachResolvedProjectReference((referencedProject, referenceProjectPath) => {
        if (referencedProject && toPath(options.configFilePath!) !== referenceProjectPath) {
          referencedProject.commandLine.fileNames.forEach((f) => mapFromFileToProjectReferenceRedirects!.set(toPath(f), referenceProjectPath));
        }
      });
    }
    const referencedProjectPath = mapFromFileToProjectReferenceRedirects.get(toPath(fileName));
    return referencedProjectPath && getResolvedProjectReferenceByPath(referencedProjectPath);
  }
  function forEachResolvedProjectReference<T>(cb: (resolvedProjectReference: ResolvedProjectReference | undefined, resolvedProjectReferencePath: Path) => T | undefined): T | undefined {
    return forEachProjectReference(projectReferences, resolvedProjectReferences, (resolvedRef, index, parent) => {
      const ref = (parent ? parent.commandLine.projectReferences : projectReferences)![index];
      const resolvedRefPath = toPath(resolveProjectReferencePath(ref));
      return cb(resolvedRef, resolvedRefPath);
    });
  }
  function getSourceOfProjectReferenceRedirect(file: string) {
    if (!isDeclarationFileName(file)) return;
    if (mapFromToProjectReferenceRedirectSource === undefined) {
      mapFromToProjectReferenceRedirectSource = createMap();
      forEachResolvedProjectReference((resolvedRef) => {
        if (resolvedRef) {
          const out = resolvedRef.commandLine.options.outFile || resolvedRef.commandLine.options.out;
          if (out) {
            const outputDts = changeExtension(out, Extension.Dts);
            mapFromToProjectReferenceRedirectSource!.set(toPath(outputDts), true);
          } else {
            forEach(resolvedRef.commandLine.fileNames, (fileName) => {
              if (!fileExtensionIs(fileName, Extension.Dts) && !fileExtensionIs(fileName, Extension.Json)) {
                const outputDts = getOutputDeclarationFileName(fileName, resolvedRef.commandLine, host.useCaseSensitiveFileNames());
                mapFromToProjectReferenceRedirectSource!.set(toPath(outputDts), fileName);
              }
            });
          }
        }
      });
    }
    return mapFromToProjectReferenceRedirectSource.get(toPath(file));
  }
  function isSourceOfProjectReferenceRedirect(fileName: string) {
    return useSourceOfProjectReferenceRedirect && !!getResolvedProjectReferenceToRedirect(fileName);
  }
  function forEachProjectReference<T>(
    projectReferences: readonly ProjectReference[] | undefined,
    resolvedProjectReferences: readonly (ResolvedProjectReference | undefined)[] | undefined,
    cbResolvedRef: (resolvedRef: ResolvedProjectReference | undefined, index: number, parent: ResolvedProjectReference | undefined) => T | undefined,
    cbRef?: (projectReferences: readonly ProjectReference[] | undefined, parent: ResolvedProjectReference | undefined) => T | undefined
  ): T | undefined {
    let seenResolvedRefs: ResolvedProjectReference[] | undefined;
    return worker(projectReferences, resolvedProjectReferences, undefined, cbResolvedRef, cbRef);
    function worker(
      projectReferences: readonly ProjectReference[] | undefined,
      resolvedProjectReferences: readonly (ResolvedProjectReference | undefined)[] | undefined,
      parent: ResolvedProjectReference | undefined,
      cbResolvedRef: (resolvedRef: ResolvedProjectReference | undefined, index: number, parent: ResolvedProjectReference | undefined) => T | undefined,
      cbRef?: (projectReferences: readonly ProjectReference[] | undefined, parent: ResolvedProjectReference | undefined) => T | undefined
    ): T | undefined {
      if (cbRef) {
        const result = cbRef(projectReferences, parent);
        if (result) return result;
      }
      return forEach(resolvedProjectReferences, (resolvedRef, index) => {
        if (contains(seenResolvedRefs, resolvedRef)) {
          return;
        }
        const result = cbResolvedRef(resolvedRef, index, parent);
        if (result) return result;
        if (!resolvedRef) return;
        (seenResolvedRefs || (seenResolvedRefs = [])).push(resolvedRef);
        return worker(resolvedRef.commandLine.projectReferences, resolvedRef.references, resolvedRef, cbResolvedRef, cbRef);
      });
    }
  }
  function getResolvedProjectReferenceByPath(projectReferencePath: Path): ResolvedProjectReference | undefined {
    if (!projectReferenceRedirects) {
      return;
    }
    return projectReferenceRedirects.get(projectReferencePath) || undefined;
  }
  function processReferencedFiles(file: SourceFile, isDefaultLib: boolean) {
    forEach(file.referencedFiles, (ref, index) => {
      const referencedFileName = resolveTripleslashReference(ref.fileName, file.originalFileName);
      processSourceFile(referencedFileName, isDefaultLib, undefined, {
        kind: RefFileKind.ReferenceFile,
        index,
        file,
        pos: ref.pos,
        end: ref.end,
      });
    });
  }
  function processTypeReferenceDirectives(file: SourceFile) {
    const typeDirectives = map(file.typeReferenceDirectives, (ref) => toFileNameLowerCase(ref.fileName));
    if (!typeDirectives) {
      return;
    }
    const resolutions = resolveTypeReferenceDirectiveNamesWorker(typeDirectives, file.originalFileName, getResolvedProjectReferenceToRedirect(file.originalFileName));
    for (let i = 0; i < typeDirectives.length; i++) {
      const ref = file.typeReferenceDirectives[i];
      const resolvedTypeReferenceDirective = resolutions[i];
      const fileName = toFileNameLowerCase(ref.fileName);
      setResolvedTypeReferenceDirective(file, fileName, resolvedTypeReferenceDirective);
      processTypeReferenceDirective(fileName, resolvedTypeReferenceDirective, {
        kind: RefFileKind.TypeReferenceDirective,
        index: i,
        file,
        pos: ref.pos,
        end: ref.end,
      });
    }
  }
  function processTypeReferenceDirective(typeReferenceDirective: string, resolvedTypeReferenceDirective?: ResolvedTypeReferenceDirective, refFile?: RefFile): void {
    const previousResolution = resolvedTypeReferenceDirectives.get(typeReferenceDirective);
    if (previousResolution && previousResolution.primary) {
      return;
    }
    let saveResolution = true;
    if (resolvedTypeReferenceDirective) {
      if (resolvedTypeReferenceDirective.isExternalLibraryImport) currentNodeModulesDepth++;
      if (resolvedTypeReferenceDirective.primary) {
        processSourceFile(resolvedTypeReferenceDirective.resolvedFileName!, false, resolvedTypeReferenceDirective.packageId, refFile);
      } else {
        if (previousResolution) {
          if (resolvedTypeReferenceDirective.resolvedFileName !== previousResolution.resolvedFileName) {
            const otherFileText = host.readFile(resolvedTypeReferenceDirective.resolvedFileName!);
            const existingFile = getSourceFile(previousResolution.resolvedFileName!)!;
            if (otherFileText !== existingFile.text) {
              const refs = !refFile ? refFileMap && refFileMap.get(existingFile.path) : undefined;
              const refToReportErrorOn = refs && find(refs, (ref) => ref.referencedFileName === existingFile.fileName);
              fileProcessingqd.add(
                refToReportErrorOn
                  ? createFileDiagnosticAtReference(
                      refToReportErrorOn,
                      qd.Conflicting_definitions_for_0_found_at_1_and_2_Consider_installing_a_specific_version_of_this_library_to_resolve_the_conflict,
                      typeReferenceDirective,
                      resolvedTypeReferenceDirective.resolvedFileName,
                      previousResolution.resolvedFileName
                    )
                  : createRefFileDiagnostic(
                      refFile,
                      qd.Conflicting_definitions_for_0_found_at_1_and_2_Consider_installing_a_specific_version_of_this_library_to_resolve_the_conflict,
                      typeReferenceDirective,
                      resolvedTypeReferenceDirective.resolvedFileName,
                      previousResolution.resolvedFileName
                    )
              );
            }
          }
          saveResolution = false;
        } else {
          processSourceFile(resolvedTypeReferenceDirective.resolvedFileName!, false, resolvedTypeReferenceDirective.packageId, refFile);
        }
      }
      if (resolvedTypeReferenceDirective.isExternalLibraryImport) currentNodeModulesDepth--;
    } else {
      fileProcessingqd.add(createRefFileDiagnostic(refFile, qd.Cannot_find_type_definition_file_for_0, typeReferenceDirective));
    }
    if (saveResolution) {
      resolvedTypeReferenceDirectives.set(typeReferenceDirective, resolvedTypeReferenceDirective);
    }
  }
  function processLibReferenceDirectives(file: SourceFile) {
    forEach(file.libReferenceDirectives, (libReference) => {
      const libName = toFileNameLowerCase(libReference.fileName);
      const libFileName = libMap.get(libName);
      if (libFileName) {
        processRootFile(combinePaths(defaultLibraryPath, libFileName), true);
      } else {
        const unqualifiedLibName = removeSuffix(removePrefix(libName, 'lib.'), '.d.ts');
        const suggestion = getSpellingSuggestion(unqualifiedLibName, libs, identity);
        const message = suggestion ? qd.Cannot_find_lib_definition_for_0_Did_you_mean_1 : qd.Cannot_find_lib_definition_for_0;
        fileProcessingqd.add(createFileDiagnostic(file, libReference.pos, libReference.end - libReference.pos, message, libName, suggestion));
      }
    });
  }
  function createRefFileDiagnostic(refFile: RefFile | undefined, message: DiagnosticMessage, ...args: any[]): Diagnostic {
    if (!refFile) return createCompilerDiagnostic(message, ...args);
    return createFileDiagnostic(refFile.file, refFile.pos, refFile.end - refFile.pos, message, ...args);
  }
  function getCanonicalFileName(fileName: string): string {
    return host.getCanonicalFileName(fileName);
  }
  function processImportedModules(file: SourceFile) {
    collectExternalModuleReferences(file);
    if (file.imports.length || file.moduleAugmentations.length) {
      const moduleNames = getModuleNames(file);
      const resolutions = resolveModuleNamesReusingOldState(moduleNames, getNormalizedAbsolutePath(file.originalFileName, currentDirectory), file);
      assert(resolutions.length === moduleNames.length);
      for (let i = 0; i < moduleNames.length; i++) {
        const resolution = resolutions[i];
        setResolvedModule(file, moduleNames[i], resolution);
        if (!resolution) {
          continue;
        }
        const isFromNodeModulesSearch = resolution.isExternalLibraryImport;
        const isJsFile = !resolutionExtensionIsTSOrJson(resolution.extension);
        const isJsFileFromNodeModules = isFromNodeModulesSearch && isJsFile;
        const resolvedFileName = resolution.resolvedFileName;
        if (isFromNodeModulesSearch) {
          currentNodeModulesDepth++;
        }
        const elideImport = isJsFileFromNodeModules && currentNodeModulesDepth > maxNodeModuleJsDepth;
        const shouldAddFile =
          resolvedFileName &&
          !getResolutionDiagnostic(options, resolution) &&
          !options.noResolve &&
          i < file.imports.length &&
          !elideImport &&
          !(isJsFile && !options.allowJs) &&
          (isInJSFile(file.imports[i]) || !(file.imports[i].flags & NodeFlags.JSDoc));
        if (elideImport) {
          modulesWithElidedImports.set(file.path, true);
        } else if (shouldAddFile) {
          const path = toPath(resolvedFileName);
          const pos = syntax.skipTrivia(file.text, file.imports[i].pos);
          findSourceFile(
            resolvedFileName,
            path,
            false,
            false,
            {
              kind: RefFileKind.Import,
              index: i,
              file,
              pos,
              end: file.imports[i].end,
            },
            resolution.packageId
          );
        }
        if (isFromNodeModulesSearch) {
          currentNodeModulesDepth--;
        }
      }
    } else {
      file.resolvedModules = undefined;
    }
  }
  function computeCommonSourceDirectory(sourceFiles: SourceFile[]): string {
    const fileNames = mapDefined(sourceFiles, (file) => (file.isDeclarationFile ? undefined : file.fileName));
    return computeCommonSourceDirectoryOfFilenames(fileNames, currentDirectory, getCanonicalFileName);
  }
  function checkSourceFilesBelongToPath(sourceFiles: readonly SourceFile[], rootDirectory: string): boolean {
    let allFilesBelongToPath = true;
    const absoluteRootDirectoryPath = host.getCanonicalFileName(getNormalizedAbsolutePath(rootDirectory, currentDirectory));
    let rootPaths: Map<true> | undefined;
    for (const sourceFile of sourceFiles) {
      if (!sourceFile.isDeclarationFile) {
        const absoluteSourceFilePath = host.getCanonicalFileName(getNormalizedAbsolutePath(sourceFile.fileName, currentDirectory));
        if (absoluteSourceFilePath.indexOf(absoluteRootDirectoryPath) !== 0) {
          if (!rootPaths) rootPaths = qu.arrayToSet(rootNames, toPath);
          addProgramDiagnosticAtRefPath(sourceFile, rootPaths, qd.File_0_is_not_under_rootDir_1_rootDir_is_expected_to_contain_all_source_files, sourceFile.fileName, rootDirectory);
          allFilesBelongToPath = false;
        }
      }
    }
    return allFilesBelongToPath;
  }
  function parseProjectReferenceConfigFile(ref: ProjectReference): ResolvedProjectReference | undefined {
    if (!projectReferenceRedirects) {
      projectReferenceRedirects = createMap<ResolvedProjectReference | false>();
    }
    const refPath = resolveProjectReferencePath(ref);
    const sourceFilePath = toPath(refPath);
    const fromCache = projectReferenceRedirects.get(sourceFilePath);
    if (fromCache !== undefined) return fromCache || undefined;
    let commandLine: ParsedCommandLine | undefined;
    let sourceFile: JsonSourceFile | undefined;
    if (host.getParsedCommandLine) {
      commandLine = host.getParsedCommandLine(refPath);
      if (!commandLine) {
        addFileToFilesByName(undefined);
        projectReferenceRedirects.set(sourceFilePath, false);
        return;
      }
      sourceFile = Debug.checkDefined(commandLine.options.configFile);
      assert(!sourceFile.path || sourceFile.path === sourceFilePath);
      addFileToFilesByName(sourceFile, sourceFilePath, undefined);
    } else {
      const basePath = getNormalizedAbsolutePath(getDirectoryPath(refPath), host.getCurrentDirectory());
      sourceFile = host.getSourceFile(refPath, ScriptTarget.JSON) as JsonSourceFile | undefined;
      addFileToFilesByName(sourceFile, sourceFilePath, undefined);
      if (sourceFile === undefined) {
        projectReferenceRedirects.set(sourceFilePath, false);
        return;
      }
      commandLine = parseJsonSourceFileConfigFileContent(sourceFile, configParsingHost, basePath, undefined, refPath);
    }
    sourceFile.fileName = refPath;
    sourceFile.path = sourceFilePath;
    sourceFile.resolvedPath = sourceFilePath;
    sourceFile.originalFileName = refPath;
    const resolvedRef: ResolvedProjectReference = { commandLine, sourceFile };
    projectReferenceRedirects.set(sourceFilePath, resolvedRef);
    if (commandLine.projectReferences) {
      resolvedRef.references = commandLine.projectReferences.map(parseProjectReferenceConfigFile);
    }
    return resolvedRef;
  }
  function verifyCompilerOptions() {
    if (options.strictPropertyInitialization && !getStrictOptionValue(options, 'strictNullChecks')) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1, 'strictPropertyInitialization', 'strictNullChecks');
    }
    if (options.isolatedModules) {
      if (options.out) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'out', 'isolatedModules');
      }
      if (options.outFile) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'outFile', 'isolatedModules');
      }
    }
    if (options.inlineSourceMap) {
      if (options.sourceMap) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'sourceMap', 'inlineSourceMap');
      }
      if (options.mapRoot) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'mapRoot', 'inlineSourceMap');
      }
    }
    if (options.paths && options.baseUrl === undefined) {
      createDiagnosticForOptionName(qd.Option_paths_cannot_be_used_without_specifying_baseUrl_option, 'paths');
    }
    if (options.composite) {
      if (options.declaration === false) {
        createDiagnosticForOptionName(qd.Composite_projects_may_not_disable_declaration_emit, 'declaration');
      }
      if (options.incremental === false) {
        createDiagnosticForOptionName(qd.Composite_projects_may_not_disable_incremental_compilation, 'declaration');
      }
    }
    if (options.tsBuildInfoFile) {
      if (!isIncrementalCompilation(options)) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'tsBuildInfoFile', 'incremental', 'composite');
      }
    } else if (options.incremental && !options.outFile && !options.out && !options.configFilePath) {
      programqd.add(createCompilerDiagnostic(qd.Option_incremental_can_only_be_specified_using_tsconfig_emitting_to_single_file_or_when_option_tsBuildInfoFile_is_specified));
    }
    if (!options.listFilesOnly && options.noEmit && isIncrementalCompilation(options)) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'noEmit', options.incremental ? 'incremental' : 'composite');
    }
    verifyProjectReferences();
    if (options.composite) {
      const rootPaths = qu.arrayToSet(rootNames, toPath);
      for (const file of files) {
        if (sourceFileMayBeEmitted(file, program) && !rootPaths.has(file.path)) {
          addProgramDiagnosticAtRefPath(
            file,
            rootPaths,
            qd.File_0_is_not_listed_within_the_file_list_of_project_1_Projects_must_list_all_files_or_use_an_include_pattern,
            file.fileName,
            options.configFilePath || ''
          );
        }
      }
    }
    if (options.paths) {
      for (const key in options.paths) {
        if (!hasProperty(options.paths, key)) {
          continue;
        }
        if (!hasZeroOrOneAsteriskCharacter(key)) {
          createDiagnosticForOptionPaths(true, key, qd.Pattern_0_can_have_at_most_one_Asterisk_character, key);
        }
        if (isArray(options.paths[key])) {
          const len = options.paths[key].length;
          if (len === 0) {
            createDiagnosticForOptionPaths(false, key, qd.Substitutions_for_pattern_0_shouldn_t_be_an_empty_array, key);
          }
          for (let i = 0; i < len; i++) {
            const subst = options.paths[key][i];
            const typeOfSubst = typeof subst;
            if (typeOfSubst === 'string') {
              if (!hasZeroOrOneAsteriskCharacter(subst)) {
                createDiagnosticForOptionPathKeyValue(key, i, qd.Substitution_0_in_pattern_1_can_have_at_most_one_Asterisk_character, subst, key);
              }
            } else {
              createDiagnosticForOptionPathKeyValue(key, i, qd.Substitution_0_for_pattern_1_has_incorrect_type_expected_string_got_2, subst, key, typeOfSubst);
            }
          }
        } else {
          createDiagnosticForOptionPaths(false, key, qd.Substitutions_for_pattern_0_should_be_an_array, key);
        }
      }
    }
    if (!options.sourceMap && !options.inlineSourceMap) {
      if (options.inlineSources) {
        createDiagnosticForOptionName(qd.Option_0_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided, 'inlineSources');
      }
      if (options.sourceRoot) {
        createDiagnosticForOptionName(qd.Option_0_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided, 'sourceRoot');
      }
    }
    if (options.out && options.outFile) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'out', 'outFile');
    }
    if (options.mapRoot && !(options.sourceMap || options.declarationMap)) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'mapRoot', 'sourceMap', 'declarationMap');
    }
    if (options.declarationDir) {
      if (!getEmitDeclarations(options)) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'declarationDir', 'declaration', 'composite');
      }
      if (options.out || options.outFile) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'declarationDir', options.out ? 'out' : 'outFile');
      }
    }
    if (options.declarationMap && !getEmitDeclarations(options)) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'declarationMap', 'declaration', 'composite');
    }
    if (options.lib && options.noLib) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'lib', 'noLib');
    }
    if (options.noImplicitUseStrict && getStrictOptionValue(options, 'alwaysStrict')) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'noImplicitUseStrict', 'alwaysStrict');
    }
    const languageVersion = options.target || ScriptTarget.ES2020;
    const outFile = options.outFile || options.out;
    const firstNonAmbientExternalModuleSourceFile = find(files, (f) => qp_isExternalModule(f) && !f.isDeclarationFile);
    if (options.isolatedModules) {
      const firstNonExternalModuleSourceFile = find(files, (f) => !qp_isExternalModule(f) && !isSourceFileJS(f) && !f.isDeclarationFile && f.scriptKind !== ScriptKind.JSON);
      if (firstNonExternalModuleSourceFile) {
        const span = getErrorSpanForNode(firstNonExternalModuleSourceFile, firstNonExternalModuleSourceFile);
        programqd.add(createFileDiagnostic(firstNonExternalModuleSourceFile, span.start, span.length, qd.All_files_must_be_modules_when_the_isolatedModules_flag_is_provided));
      }
    }
    if (outFile && !options.emitDeclarationOnly) {
      if (options.module && !(options.module === ModuleKind.AMD || options.module === ModuleKind.System)) {
        createDiagnosticForOptionName(qd.Only_amd_and_system_modules_are_supported_alongside_0, options.out ? 'out' : 'outFile', 'module');
      } else if (options.module === undefined && firstNonAmbientExternalModuleSourceFile) {
        const span = getErrorSpanForNode(firstNonAmbientExternalModuleSourceFile, firstNonAmbientExternalModuleSourceFile.externalModuleIndicator!);
        programqd.add(
          createFileDiagnostic(
            firstNonAmbientExternalModuleSourceFile,
            span.start,
            span.length,
            qd.Cannot_compile_modules_using_option_0_unless_the_module_flag_is_amd_or_system,
            options.out ? 'out' : 'outFile'
          )
        );
      }
    }
    if (options.resolveJsonModule) {
      if (getEmitModuleResolutionKind(options) !== ModuleResolutionKind.NodeJs) {
        createDiagnosticForOptionName(qd.Option_resolveJsonModule_cannot_be_specified_without_node_module_resolution_strategy, 'resolveJsonModule');
      } else if (!hasJsonModuleEmitEnabled(options)) {
        createDiagnosticForOptionName(qd.Option_resolveJsonModule_can_only_be_specified_when_module_code_generation_is_commonjs_amd_es2015_or_esNext, 'resolveJsonModule', 'module');
      }
    }
    if (options.outDir || options.sourceRoot || options.mapRoot) {
      const dir = getCommonSourceDirectory();
      if (options.outDir && dir === '' && files.some((file) => getRootLength(file.fileName) > 1)) {
        createDiagnosticForOptionName(qd.Cannot_find_the_common_subdirectory_path_for_the_input_files, 'outDir');
      }
    }
    if (options.checkJs && !options.allowJs) {
      programqd.add(createCompilerDiagnostic(qd.Option_0_cannot_be_specified_without_specifying_option_1, 'checkJs', 'allowJs'));
    }
    if (options.emitDeclarationOnly) {
      if (!getEmitDeclarations(options)) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'emitDeclarationOnly', 'declaration', 'composite');
      }
      if (options.noEmit) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'emitDeclarationOnly', 'noEmit');
      }
    }
    if (options.emitDecoratorMetadata && !options.experimentalDecorators) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1, 'emitDecoratorMetadata', 'experimentalDecorators');
    }
    if (options.jsxFactory) {
      if (options.reactNamespace) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'reactNamespace', 'jsxFactory');
      }
      if (!qp_parseIsolatedEntityName(options.jsxFactory, languageVersion)) {
        createOptionValueDiagnostic('jsxFactory', qd.Invalid_value_for_jsxFactory_0_is_not_a_valid_identifier_or_qualified_name, options.jsxFactory);
      }
    } else if (options.reactNamespace && !syntax.is.identifierText(options.reactNamespace)) {
      createOptionValueDiagnostic('reactNamespace', qd.Invalid_value_for_reactNamespace_0_is_not_a_valid_identifier, options.reactNamespace);
    }
    if (!options.noEmit && !options.suppressOutputPathCheck) {
      const emitHost = getEmitHost();
      const emitFilesSeen = createMap<true>();
      forEachEmittedFile(emitHost, (emitFileNames) => {
        if (!options.emitDeclarationOnly) {
          verifyEmitFilePath(emitFileNames.jsFilePath, emitFilesSeen);
        }
        verifyEmitFilePath(emitFileNames.declarationFilePath, emitFilesSeen);
      });
    }
    function verifyEmitFilePath(emitFileName: string | undefined, emitFilesSeen: QMap<true>) {
      if (emitFileName) {
        const emitFilePath = toPath(emitFileName);
        if (filesByName.has(emitFilePath)) {
          let chain: DiagnosticMessageChain | undefined;
          if (!options.configFilePath) {
            chain = chainDiagnosticMessages(
              undefined,
              qd.Adding_a_tsconfig_json_file_will_help_organize_projects_that_contain_both_TypeScript_and_JavaScript_files_Learn_more_at_https_Colon_Slash_Slashaka_ms_Slashtsconfig
            );
          }
          chain = chainDiagnosticMessages(chain, qd.Cannot_write_file_0_because_it_would_overwrite_input_file, emitFileName);
          blockEmittingOfFile(emitFileName, createCompilerDiagnosticFromMessageChain(chain));
        }
        const emitFileKey = !host.useCaseSensitiveFileNames() ? toFileNameLowerCase(emitFilePath) : emitFilePath;
        if (emitFilesSeen.has(emitFileKey)) {
          blockEmittingOfFile(emitFileName, createCompilerDiagnostic(qd.Cannot_write_file_0_because_it_would_be_overwritten_by_multiple_input_files, emitFileName));
        } else {
          emitFilesSeen.set(emitFileKey, true);
        }
      }
    }
  }
  function createFileDiagnosticAtReference(refPathToReportErrorOn: qnr.RefFile, message: DiagnosticMessage, ...args: (string | number | undefined)[]) {
    const refFile = Debug.checkDefined(getSourceFileByPath(refPathToReportErrorOn.file));
    const { kind, index } = refPathToReportErrorOn;
    let pos: number, end: number;
    switch (kind) {
      case RefFileKind.Import:
        pos = syntax.skipTrivia(refFile.text, refFile.imports[index].pos);
        end = refFile.imports[index].end;
        break;
      case RefFileKind.ReferenceFile:
        ({ pos, end } = refFile.referencedFiles[index]);
        break;
      case RefFileKind.TypeReferenceDirective:
        ({ pos, end } = refFile.typeReferenceDirectives[index]);
        break;
      default:
        return Debug.assertNever(kind);
    }
    return createFileDiagnostic(refFile, pos, end - pos, message, ...args);
  }
  function addProgramDiagnosticAtRefPath(file: SourceFile, rootPaths: Map<true>, message: DiagnosticMessage, ...args: (string | number | undefined)[]) {
    const refPaths = refFileMap && refFileMap.get(file.path);
    const refPathToReportErrorOn = forEach(refPaths, (refPath) => (rootPaths.has(refPath.file) ? refPath : undefined)) || elementAt(refPaths, 0);
    programqd.add(refPathToReportErrorOn ? createFileDiagnosticAtReference(refPathToReportErrorOn, message, ...args) : createCompilerDiagnostic(message, ...args));
  }
  function verifyProjectReferences() {
    const buildInfoPath = !options.noEmit && !options.suppressOutputPathCheck ? getTsBuildInfoEmitOutputFilePath(options) : undefined;
    forEachProjectReference(projectReferences, resolvedProjectReferences, (resolvedRef, index, parent) => {
      const ref = (parent ? parent.commandLine.projectReferences : projectReferences)![index];
      const parentFile = parent && (parent.sourceFile as JsonSourceFile);
      if (!resolvedRef) {
        createDiagnosticForReference(parentFile, index, qd.File_0_not_found, ref.path);
        return;
      }
      const options = resolvedRef.commandLine.options;
      if (!options.composite) {
        const inputs = parent ? parent.commandLine.fileNames : rootNames;
        if (inputs.length) {
          createDiagnosticForReference(parentFile, index, qd.Referenced_project_0_must_have_setting_composite_Colon_true, ref.path);
        }
      }
      if (ref.prepend) {
        const out = options.outFile || options.out;
        if (out) {
          if (!host.fileExists(out)) {
            createDiagnosticForReference(parentFile, index, qd.Output_file_0_from_project_1_does_not_exist, out, ref.path);
          }
        } else {
          createDiagnosticForReference(parentFile, index, qd.Cannot_prepend_project_0_because_it_does_not_have_outFile_set, ref.path);
        }
      }
      if (!parent && buildInfoPath && buildInfoPath === getTsBuildInfoEmitOutputFilePath(options)) {
        createDiagnosticForReference(parentFile, index, qd.Cannot_write_file_0_because_it_will_overwrite_tsbuildinfo_file_generated_by_referenced_project_1, buildInfoPath, ref.path);
        hasEmitBlockingqd.set(toPath(buildInfoPath), true);
      }
    });
  }
  function createDiagnosticForOptionPathKeyValue(key: string, valueIndex: number, message: DiagnosticMessage, arg0: string | number, arg1: string | number, arg2?: string | number) {
    let needCompilerDiagnostic = true;
    const pathsSyntax = getOptionPathsSyntax();
    for (const pathProp of pathsSyntax) {
      if (Node.is.kind(ObjectLiteralExpression, pathProp.initializer)) {
        for (const keyProps of getPropertyAssignment(pathProp.initializer, key)) {
          const initializer = keyProps.initializer;
          if (isArrayLiteralExpression(initializer) && initializer.elements.length > valueIndex) {
            programqd.add(createDiagnosticForNodeInSourceFile(options.configFile!, initializer.elements[valueIndex], message, arg0, arg1, arg2));
            needCompilerDiagnostic = false;
          }
        }
      }
    }
    if (needCompilerDiagnostic) {
      programqd.add(createCompilerDiagnostic(message, arg0, arg1, arg2));
    }
  }
  function createDiagnosticForOptionPaths(onKey: boolean, key: string, message: DiagnosticMessage, arg0: string | number) {
    let needCompilerDiagnostic = true;
    const pathsSyntax = getOptionPathsSyntax();
    for (const pathProp of pathsSyntax) {
      if (Node.is.kind(ObjectLiteralExpression, pathProp.initializer) && createOptionDiagnosticInObjectLiteralSyntax(pathProp.initializer, onKey, key, undefined, message, arg0)) {
        needCompilerDiagnostic = false;
      }
    }
    if (needCompilerDiagnostic) {
      programqd.add(createCompilerDiagnostic(message, arg0));
    }
  }
  function getOptionsSyntaxByName(name: string): object | undefined {
    const compilerOptionsObjectLiteralSyntax = getCompilerOptionsObjectLiteralSyntax();
    if (compilerOptionsObjectLiteralSyntax) return getPropertyAssignment(compilerOptionsObjectLiteralSyntax, name);
    return;
  }
  function getOptionPathsSyntax(): PropertyAssignment[] {
    return (getOptionsSyntaxByName('paths') as PropertyAssignment[]) || emptyArray;
  }
  function createDiagnosticForOptionName(message: DiagnosticMessage, option1: string, option2?: string, option3?: string) {
    createDiagnosticForOption(true, option1, option2, message, option1, option2, option3);
  }
  function createOptionValueDiagnostic(option1: string, message: DiagnosticMessage, arg0: string) {
    createDiagnosticForOption(undefined, message, arg0);
  }
  function createDiagnosticForReference(sourceFile: JsonSourceFile | undefined, index: number, message: DiagnosticMessage, arg0?: string | number, arg1?: string | number) {
    const referencesSyntax = firstDefined(getTsConfigPropArray(sourceFile || options.configFile, 'references'), (property) =>
      isArrayLiteralExpression(property.initializer) ? property.initializer : undefined
    );
    if (referencesSyntax && referencesSyntax.elements.length > index) {
      programqd.add(createDiagnosticForNodeInSourceFile(sourceFile || options.configFile!, referencesSyntax.elements[index], message, arg0, arg1));
    } else {
      programqd.add(createCompilerDiagnostic(message, arg0, arg1));
    }
  }
  function createDiagnosticForOption(onKey: boolean, option1: string, option2: string | undefined, message: DiagnosticMessage, arg0: string | number, arg1?: string | number, arg2?: string | number) {
    const compilerOptionsObjectLiteralSyntax = getCompilerOptionsObjectLiteralSyntax();
    const needCompilerDiagnostic =
      !compilerOptionsObjectLiteralSyntax || !createOptionDiagnosticInObjectLiteralSyntax(compilerOptionsObjectLiteralSyntax, onKey, option1, option2, message, arg0, arg1, arg2);
    if (needCompilerDiagnostic) {
      programqd.add(createCompilerDiagnostic(message, arg0, arg1, arg2));
    }
  }
  function getCompilerOptionsObjectLiteralSyntax() {
    if (_compilerOptionsObjectLiteralSyntax === undefined) {
      _compilerOptionsObjectLiteralSyntax = null;
      const jsonObjectLiteral = getTsConfigObjectLiteralExpression(options.configFile);
      if (jsonObjectLiteral) {
        for (const prop of getPropertyAssignment(jsonObjectLiteral, 'compilerOptions')) {
          if (Node.is.kind(ObjectLiteralExpression, prop.initializer)) {
            _compilerOptionsObjectLiteralSyntax = prop.initializer;
            break;
          }
        }
      }
    }
    return _compilerOptionsObjectLiteralSyntax;
  }
  function createOptionDiagnosticInObjectLiteralSyntax(
    objectLiteral: ObjectLiteralExpression,
    onKey: boolean,
    key1: string,
    key2: string | undefined,
    message: DiagnosticMessage,
    arg0: string | number,
    arg1?: string | number,
    arg2?: string | number
  ): boolean {
    const props = getPropertyAssignment(objectLiteral, key1, key2);
    for (const prop of props) {
      programqd.add(createDiagnosticForNodeInSourceFile(options.configFile!, onKey ? prop.name : prop.initializer, message, arg0, arg1, arg2));
    }
    return !!props.length;
  }
  function blockEmittingOfFile(emitFileName: string, diag: Diagnostic) {
    hasEmitBlockingqd.set(toPath(emitFileName), true);
    programqd.add(diag);
  }
  function isEmittedFile(file: string): boolean {
    if (options.noEmit) return false;
    const filePath = toPath(file);
    if (getSourceFileByPath(filePath)) return false;
    const out = options.outFile || options.out;
    if (out) return isSameFile(filePath, out) || isSameFile(filePath, removeFileExtension(out) + Extension.Dts);
    if (options.declarationDir && containsPath(options.declarationDir, filePath, currentDirectory, !host.useCaseSensitiveFileNames())) return true;
    if (options.outDir) return containsPath(options.outDir, filePath, currentDirectory, !host.useCaseSensitiveFileNames());
    if (fileExtensionIsOneOf(filePath, supportedJSExtensions) || fileExtensionIs(filePath, Extension.Dts)) {
      const filePathWithoutExtension = removeFileExtension(filePath);
      return !!getSourceFileByPath((filePathWithoutExtension + Extension.Ts) as Path) || !!getSourceFileByPath((filePathWithoutExtension + Extension.Tsx) as Path);
    }
    return false;
  }
  function isSameFile(file1: string, file2: string) {
    return comparePaths(file1, file2, currentDirectory, !host.useCaseSensitiveFileNames()) === Comparison.EqualTo;
  }
  function getProbableSymlinks(): QReadonlyMap<string> {
    if (host.getSymlinks) return host.getSymlinks();
    return symlinks || (symlinks = discoverProbableSymlinks(files, getCanonicalFileName, host.getCurrentDirectory()));
  }
}
interface SymlinkedDirectory {
  real: string;
  realPath: Path;
}
interface HostForUseSourceOfProjectReferenceRedirect {
  compilerHost: CompilerHost;
  useSourceOfProjectReferenceRedirect: boolean;
  toPath(fileName: string): Path;
  getResolvedProjectReferences(): readonly (ResolvedProjectReference | undefined)[] | undefined;
  getSourceOfProjectReferenceRedirect(fileName: string): SourceOfProjectReferenceRedirect | undefined;
  forEachResolvedProjectReference<T>(cb: (resolvedProjectReference: ResolvedProjectReference | undefined, resolvedProjectReferencePath: Path) => T | undefined): T | undefined;
}
function updateHostForUseSourceOfProjectReferenceRedirect(host: HostForUseSourceOfProjectReferenceRedirect) {
  let mapOfDeclarationDirectories: Map<true> | undefined;
  let symlinkedDirectories: Map<SymlinkedDirectory | false> | undefined;
  let symlinkedFiles: Map<string> | undefined;
  const originalFileExists = host.compilerHost.fileExists;
  const originalDirectoryExists = host.compilerHost.directoryExists;
  const originalGetDirectories = host.compilerHost.getDirectories;
  const originalRealpath = host.compilerHost.realpath;
  if (!host.useSourceOfProjectReferenceRedirect) return { onProgramCreateComplete: noop, fileExists };
  host.compilerHost.fileExists = fileExists;
  if (originalDirectoryExists) {
    host.compilerHost.directoryExists = (path) => {
      if (originalDirectoryExists.call(host.compilerHost, path)) {
        handleDirectoryCouldBeSymlink(path);
        return true;
      }
      if (!host.getResolvedProjectReferences()) return false;
      if (!mapOfDeclarationDirectories) {
        mapOfDeclarationDirectories = createMap();
        host.forEachResolvedProjectReference((ref) => {
          if (!ref) return;
          const out = ref.commandLine.options.outFile || ref.commandLine.options.out;
          if (out) {
            mapOfDeclarationDirectories!.set(getDirectoryPath(host.toPath(out)), true);
          } else {
            const declarationDir = ref.commandLine.options.declarationDir || ref.commandLine.options.outDir;
            if (declarationDir) {
              mapOfDeclarationDirectories!.set(host.toPath(declarationDir), true);
            }
          }
        });
      }
      return fileOrDirectoryExistsUsingSource(path, false);
    };
  }
  if (originalGetDirectories) {
    host.compilerHost.getDirectories = (path) =>
      !host.getResolvedProjectReferences() || (originalDirectoryExists && originalDirectoryExists.call(host.compilerHost, path)) ? originalGetDirectories.call(host.compilerHost, path) : [];
  }
  if (originalRealpath) {
    host.compilerHost.realpath = (s) => symlinkedFiles?.get(host.toPath(s)) || originalRealpath.call(host.compilerHost, s);
  }
  return { onProgramCreateComplete, fileExists };
  function onProgramCreateComplete() {
    host.compilerHost.fileExists = originalFileExists;
    host.compilerHost.directoryExists = originalDirectoryExists;
    host.compilerHost.getDirectories = originalGetDirectories;
  }
  function fileExists(file: string) {
    if (originalFileExists.call(host.compilerHost, file)) return true;
    if (!host.getResolvedProjectReferences()) return false;
    if (!isDeclarationFileName(file)) return false;
    return fileOrDirectoryExistsUsingSource(file, true);
  }
  function fileExistsIfProjectReferenceDts(file: string) {
    const source = host.getSourceOfProjectReferenceRedirect(file);
    return source !== undefined ? (isString(source) ? originalFileExists.call(host.compilerHost, source) : true) : undefined;
  }
  function directoryExistsIfProjectReferenceDeclDir(dir: string) {
    const dirPath = host.toPath(dir);
    const dirPathWithTrailingDirectorySeparator = `${dirPath}${dirSeparator}`;
    return qu.forEachKey(
      mapOfDeclarationDirectories!,
      (declDirPath) => dirPath === declDirPath || startsWith(declDirPath, dirPathWithTrailingDirectorySeparator) || startsWith(dirPath, `${declDirPath}/`)
    );
  }
  function handleDirectoryCouldBeSymlink(directory: string) {
    if (!host.getResolvedProjectReferences()) return;
    if (!originalRealpath || !stringContains(directory, nodeModulesPathPart)) return;
    if (!symlinkedDirectories) symlinkedDirectories = createMap();
    const directoryPath = ensureTrailingDirectorySeparator(host.toPath(directory));
    if (symlinkedDirectories.has(directoryPath)) return;
    const real = normalizePath(originalRealpath.call(host.compilerHost, directory));
    let realPath: Path;
    if (real === directory || (realPath = ensureTrailingDirectorySeparator(host.toPath(real))) === directoryPath) {
      symlinkedDirectories.set(directoryPath, false);
      return;
    }
    symlinkedDirectories.set(directoryPath, {
      real: ensureTrailingDirectorySeparator(real),
      realPath,
    });
  }
  function fileOrDirectoryExistsUsingSource(fileOrDirectory: string, isFile: boolean): boolean {
    const fileOrDirectoryExistsUsingSource = isFile ? (file: string) => fileExistsIfProjectReferenceDts(file) : (dir: string) => directoryExistsIfProjectReferenceDeclDir(dir);
    const result = fileOrDirectoryExistsUsingSource(fileOrDirectory);
    if (result !== undefined) return result;
    if (!symlinkedDirectories) return false;
    const fileOrDirectoryPath = host.toPath(fileOrDirectory);
    if (!stringContains(fileOrDirectoryPath, nodeModulesPathPart)) return false;
    if (isFile && symlinkedFiles && symlinkedFiles.has(fileOrDirectoryPath)) return true;
    return (
      firstDefinedIterator(symlinkedDirectories.entries(), ([directoryPath, symlinkedDirectory]) => {
        if (!symlinkedDirectory || !startsWith(fileOrDirectoryPath, directoryPath)) return;
        const result = fileOrDirectoryExistsUsingSource(fileOrDirectoryPath.replace(directoryPath, symlinkedDirectory.realPath));
        if (isFile && result) {
          if (!symlinkedFiles) symlinkedFiles = createMap();
          const absolutePath = getNormalizedAbsolutePath(fileOrDirectory, host.compilerHost.getCurrentDirectory());
          symlinkedFiles.set(fileOrDirectoryPath, `${symlinkedDirectory.real}${absolutePath.replace(new RegExp(directoryPath, 'i'), '')}`);
        }
        return result;
      }) || false
    );
  }
}
export function handleNoEmitOptions(program: ProgramToEmitFilesAndReportErrors, sourceFile: SourceFile | undefined, cancellationToken: CancellationToken | undefined): EmitResult | undefined {
  const options = program.getCompilerOptions();
  if (options.noEmit) return { diagnostics: emptyArray, sourceMaps: undefined, emittedFiles: undefined, emitSkipped: true };
  if (!options.noEmitOnError) return;
  let diagnostics: readonly Diagnostic[] = [
    ...program.getOptionsDiagnostics(cancellationToken),
    ...program.getSyntacticDiagnostics(sourceFile, cancellationToken),
    ...program.getGlobalDiagnostics(cancellationToken),
    ...program.getSemanticDiagnostics(sourceFile, cancellationToken),
  ];
  if (diagnostics.length === 0 && getEmitDeclarations(program.getCompilerOptions())) {
    diagnostics = program.getDeclarationDiagnostics(undefined, cancellationToken);
  }
  return diagnostics.length > 0 ? { diagnostics, sourceMaps: undefined, emittedFiles: undefined, emitSkipped: true } : undefined;
}
interface CompilerHostLike {
  useCaseSensitiveFileNames(): boolean;
  getCurrentDirectory(): string;
  fileExists(fileName: string): boolean;
  readFile(fileName: string): string | undefined;
  readDirectory?(rootDir: string, extensions: readonly string[], excludes: readonly string[] | undefined, includes: readonly string[], depth?: number): string[];
  trace?(s: string): void;
  onUnRecoverableConfigFileDiagnostic?: DiagnosticReporter;
}
export function parseConfigHostFromCompilerHostLike(host: CompilerHostLike, directoryStructureHost: DirectoryStructureHost = host): ParseConfigFileHost {
  return {
    fileExists: (f) => directoryStructureHost.fileExists(f),
    readDirectory(root, extensions, excludes, includes, depth) {
      Debug.assertIsDefined(directoryStructureHost.readDirectory, "'CompilerHost.readDirectory' must be implemented to correctly process 'projectReferences'");
      return directoryStructureHost.readDirectory(root, extensions, excludes, includes, depth);
    },
    readFile: (f) => directoryStructureHost.readFile(f),
    useCaseSensitiveFileNames: host.useCaseSensitiveFileNames(),
    getCurrentDirectory: () => host.getCurrentDirectory(),
    onUnRecoverableConfigFileDiagnostic: host.onUnRecoverableConfigFileDiagnostic || (() => undefined),
    trace: host.trace ? (s) => host.trace!(s) : undefined,
  };
}
export interface ResolveProjectReferencePathHost {
  fileExists(fileName: string): boolean;
}
export function createPrependNodes(
  projectReferences: readonly ProjectReference[] | undefined,
  getCommandLine: (ref: ProjectReference, index: number) => ParsedCommandLine | undefined,
  readFile: (path: string) => string | undefined
) {
  if (!projectReferences) return emptyArray;
  let nodes: InputFiles[] | undefined;
  for (let i = 0; i < projectReferences.length; i++) {
    const ref = projectReferences[i];
    const resolvedRefOpts = getCommandLine(ref, i);
    if (ref.prepend && resolvedRefOpts && resolvedRefOpts.options) {
      const out = resolvedRefOpts.options.outFile || resolvedRefOpts.options.out;
      if (!out) continue;
      const { jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath } = getOutputPathsForBundle(resolvedRefOpts.options, true);
      const node = createInputFiles(readFile, jsFilePath!, sourceMapFilePath, declarationFilePath!, declarationMapPath, buildInfoPath);
      (nodes || (nodes = [])).push(node);
    }
  }
  return nodes || emptyArray;
}
export function resolveProjectReferencePath(ref: ProjectReference): ResolvedConfigFileName;
export function resolveProjectReferencePath(host: ResolveProjectReferencePathHost, ref: ProjectReference): ResolvedConfigFileName;
export function resolveProjectReferencePath(hostOrRef: ResolveProjectReferencePathHost | ProjectReference, ref?: ProjectReference): ResolvedConfigFileName {
  const passedInRef = ref ? ref : (hostOrRef as ProjectReference);
  return resolveConfigFileProjectName(passedInRef.path);
}
export function getResolutionDiagnostic(options: CompilerOptions, { extension }: ResolvedModuleFull): DiagnosticMessage | undefined {
  switch (extension) {
    case Extension.Ts:
    case Extension.Dts:
      return;
    case Extension.Tsx:
      return needJsx();
    case Extension.Jsx:
      return needJsx() || needAllowJs();
    case Extension.Js:
      return needAllowJs();
    case Extension.Json:
      return needResolveJsonModule();
  }
  function needJsx() {
    return options.jsx ? undefined : qd.Module_0_was_resolved_to_1_but_jsx_is_not_set;
  }
  function needAllowJs() {
    return options.allowJs || !getStrictOptionValue(options, 'noImplicitAny') ? undefined : qd.Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type;
  }
  function needResolveJsonModule() {
    return options.resolveJsonModule ? undefined : qd.Module_0_was_resolved_to_1_but_resolveJsonModule_is_not_used;
  }
}
function getModuleNames({ imports, moduleAugmentations }: SourceFile): string[] {
  const res = imports.map((i) => i.text);
  for (const aug of moduleAugmentations) {
    if (aug.kind === Syntax.StringLiteral) {
      res.push(aug.text);
    }
  }
  return res;
}
