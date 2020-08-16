import { ModifierFlags, Node } from './types';
import { qf } from './core';
import { Syntax } from './syntax';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
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
export function createCompilerHost(opts: qt.CompilerOpts, setParentNodes?: boolean): qt.CompilerHost {
  return createCompilerHostWorker(opts, setParentNodes);
}
export function createCompilerHostWorker(opts: qt.CompilerOpts, setParentNodes?: boolean, system = sys): qt.CompilerHost {
  const existingDirectories = qu.createMap<boolean>();
  const getCanonicalFileName = createGetCanonicalFileName(system.useCaseSensitiveFileNames);
  function getSourceFile(fileName: string, languageVersion: qt.ScriptTarget, onError?: (message: string) => void): qt.SourceFile | undefined {
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
    function isWatchSet(opts: qt.CompilerOpts) {
      return opts.watch && opts.hasOwnProperty('watch');
    }
    if (!isWatchSet(opts) || !system.createHash || !system.getModifiedTime) {
      system.writeFile(fileName, data, writeByteOrderMark);
      return;
    }
    if (!outputFingerprints) {
      outputFingerprints = qu.createMap<OutputFingerprint>();
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
  const newLine = getNewLineCharacter(opts, () => system.newLine);
  const realpath = system.realpath && ((path: string) => system.realpath!(path));
  const compilerHost: qt.CompilerHost = {
    getSourceFile,
    getDefaultLibLocation,
    getDefaultLibFileName: (opts) => combinePaths(getDefaultLibLocation(), qf.get.defaultLibFileName(opts)),
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
  writeFile?: qt.WriteFileCallback;
}
export function changeCompilerHostLikeToUseCache(host: CompilerHostLikeForCache, toPath: (fileName: string) => qt.Path, getSourceFile?: qt.CompilerHost['getSourceFile']) {
  const originalReadFile = host.readFile;
  const originalFileExists = host.fileExists;
  const originalDirectoryExists = host.directoryExists;
  const originalCreateDirectory = host.createDirectory;
  const originalWriteFile = host.writeFile;
  const readFileCache = qu.createMap<string | false>();
  const fileExistsCache = qu.createMap<boolean>();
  const directoryExistsCache = qu.createMap<boolean>();
  const sourceFileCache = qu.createMap<qt.SourceFile>();
  const readFileWithCache = (fileName: string): string | undefined => {
    const key = toPath(fileName);
    const value = readFileCache.get(key);
    if (value !== undefined) return value !== false ? value : undefined;
    return setReadFileCache(key, fileName);
  };
  const setReadFileCache = (key: qt.Path, fileName: string) => {
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
  const getSourceFileWithCache: qt.CompilerHost['getSourceFile'] | undefined = getSourceFile
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
export function getPreEmitDiagnostics(program: qt.Program, sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly Diagnostic[];
export function getPreEmitDiagnostics(program: BuilderProgram, sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly Diagnostic[];
export function getPreEmitDiagnostics(program: qt.Program | BuilderProgram, sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly Diagnostic[] {
  let diagnostics: Diagnostic[] | undefined;
  diagnostics = qu.addRange(diagnostics, program.getConfigFileParsingDiagnostics());
  diagnostics = qu.addRange(diagnostics, program.getOptsDiagnostics(cancellationToken));
  diagnostics = qu.addRange(diagnostics, program.getSyntacticDiagnostics(sourceFile, cancellationToken));
  diagnostics = qu.addRange(diagnostics, program.getGlobalDiagnostics(cancellationToken));
  diagnostics = qu.addRange(diagnostics, program.getSemanticDiagnostics(sourceFile, cancellationToken));
  if (getEmitDeclarations(program.getCompilerOpts())) {
    diagnostics = qu.addRange(diagnostics, program.getDeclarationDiagnostics(sourceFile, cancellationToken));
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
  const errorMessage = `${diagnosticCategoryName(diagnostic)} TS${diagnostic.code}: ${flattenqd.MessageText(diagnostic.messageText, host.getNewLine())}${host.getNewLine()}`;
  if (diagnostic.file) {
    const { line, character } = qy.get.lineAndCharOf(diagnostic.file, diagnostic.start!);
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
function getCategoryFormat(category: qd.Category): ForegroundColorEscapeSequences {
  switch (category) {
    case qd.Category.Error:
      return ForegroundColorEscapeSequences.Red;
    case qd.Category.Warning:
      return ForegroundColorEscapeSequences.Yellow;
    case qd.Category.Suggestion:
      return fail('Should never get an Info diagnostic on the command line.');
    case qd.Category.Message:
      return ForegroundColorEscapeSequences.Blue;
  }
}
export function formatColorAndReset(text: string, formatStyle: string) {
  return formatStyle + text + resetEscapeSequence;
}
function formatCodeSpan(file: qt.SourceFile, start: number, length: number, indent: string, squiggleColor: ForegroundColorEscapeSequences, host: FormatDiagnosticsHost) {
  const { line: firstLine, character: firstLineChar } = qy.get.lineAndCharOf(file, start);
  const { line: lastLine, character: lastLineChar } = qy.get.lineAndCharOf(file, start + length);
  const lastLineInFile = qy.get.lineAndCharOf(file, file.text.length).line;
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
    const lineStart = qy.get.posOf(file, i, 0);
    const lineEnd = i < lastLineInFile ? qy.get.posOf(file, i + 1, 0) : file.text.length;
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
export function formatLocation(file: qt.SourceFile, start: number, host: FormatDiagnosticsHost, color = formatColorAndReset) {
  const { line: firstLine, character: firstLineChar } = qy.get.lineAndCharOf(file, start);
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
    output += flattenqd.MessageText(diagnostic.messageText, host.getNewLine());
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
          output += indent + flattenqd.MessageText(messageText, host.getNewLine());
        }
      }
    }
    output += host.getNewLine();
  }
  return output;
}
export function flattenqd.MessageText(diag: string | qd.MessageChain | undefined, newLine: string, indent = 0): string {
  if (qf.is.string(diag)) return diag;
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
      result += flattenqd.MessageText(kid, newLine, indent);
    }
  }
  return result;
}
export function loadWithLocalCache<T>(
  names: string[],
  containingFile: string,
  redirectedReference: qt.ResolvedProjectReference | undefined,
  loader: (name: string, containingFile: string, redirectedReference: qt.ResolvedProjectReference | undefined) => T
): T[] {
  if (names.length === 0) return [];
  const resolutions: T[] = [];
  const cache = qu.createMap<T>();
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
interface qt.RefFile extends TextRange {
  kind: qt.RefFileKind;
  index: number;
  file: qt.SourceFile;
}
export function isProgramUptoDate(
  program: qt.Program | undefined,
  rootFileNames: string[],
  newOpts: qt.CompilerOpts,
  getSourceVersion: (path: qt.Path, fileName: string) => string | undefined,
  fileExists: (fileName: string) => boolean,
  hasInvalidatedResolution: qt.HasInvalidatedResolution,
  hasChangedAutomaticTypeDirectiveNames: boolean,
  projectReferences: readonly qt.ProjectReference[] | undefined
): boolean {
  if (!program || hasChangedAutomaticTypeDirectiveNames) return false;
  if (!arrayIsEqualTo(program.getRootFileNames(), rootFileNames)) return false;
  let seenResolvedRefs: qt.ResolvedProjectReference[] | undefined;
  if (!arrayIsEqualTo(program.getProjectReferences(), projectReferences, projectReferenceUptoDate)) return false;
  if (program.getSourceFiles().some(sourceFileNotUptoDate)) return false;
  if (program.getMissingFilePaths().some(fileExists)) return false;
  const currentOpts = program.getCompilerOpts();
  if (!compareDataObjects(currentOpts, newOpts)) return false;
  if (currentOpts.configFile && newOpts.configFile) return currentOpts.configFile.text === newOpts.configFile.text;
  return true;
  function sourceFileNotUptoDate(sourceFile: qt.SourceFile) {
    return !sourceFileVersionUptoDate(sourceFile) || hasInvalidatedResolution(sourceFile.path);
  }
  function sourceFileVersionUptoDate(sourceFile: qt.SourceFile) {
    return sourceFile.version === getSourceVersion(sourceFile.resolvedPath, sourceFile.fileName);
  }
  function projectReferenceUptoDate(oldRef: qt.ProjectReference, newRef: qt.ProjectReference, index: number) {
    if (!projectReferenceIsEqualTo(oldRef, newRef)) return false;
    return resolvedProjectReferenceUptoDate(program!.getResolvedProjectReferences()![index], oldRef);
  }
  function resolvedProjectReferenceUptoDate(oldResolvedRef: qt.ResolvedProjectReference | undefined, oldRef: qt.ProjectReference): boolean {
    if (oldResolvedRef) {
      if (contains(seenResolvedRefs, oldResolvedRef)) return true;
      if (!sourceFileVersionUptoDate(oldResolvedRef.sourceFile)) return false;
      (seenResolvedRefs || (seenResolvedRefs = [])).push(oldResolvedRef);
      return !forEach(oldResolvedRef.references, (childResolvedRef, index) => !resolvedProjectReferenceUptoDate(childResolvedRef, oldResolvedRef.commandLine.projectReferences![index]));
    }
    return !fileExists(resolveProjectReferencePath(oldRef));
  }
}
export function getConfigFileParsingDiagnostics(configFileParseResult: qt.ParsedCommandLine): readonly Diagnostic[] {
  return configFileParseResult.opts.configFile ? [...configFileParseResult.opts.configFile.parseDiagnostics, ...configFileParseResult.errors] : configFileParseResult.errors;
}
function shouldProgramCreateNewSourceFiles(program: qt.Program | undefined, newOpts: qt.CompilerOpts): boolean {
  if (!program) return false;
  const oldOpts = program.getCompilerOpts();
  return !!sourceFileAffectingCompilerOpts.some((option) => !qf.is.jsonEqual(getCompilerOptionValue(oldOpts, option), getCompilerOptionValue(newOpts, option)));
}
function createCreateProgramOpts(
  rootNames: readonly string[],
  opts: qt.CompilerOpts,
  host?: qt.CompilerHost,
  oldProgram?: qt.Program,
  configFileParsingDiagnostics?: readonly Diagnostic[]
): qt.CreateProgramOpts {
  return {
    rootNames,
    opts,
    host,
    oldProgram,
    configFileParsingDiagnostics,
  };
}
export function createProgram(createProgramOpts: qt.CreateProgramOpts): qt.Program;
export function createProgram(rootNames: readonly string[], opts: qt.CompilerOpts, host?: qt.CompilerHost, oldProgram?: qt.Program, configFileParsingDiagnostics?: readonly Diagnostic[]): qt.Program;
export function createProgram(
  rootNamesOrOpts: readonly string[] | qt.CreateProgramOpts,
  _opts?: qt.CompilerOpts,
  _host?: qt.CompilerHost,
  _oldProgram?: qt.Program,
  _configFileParsingDiagnostics?: readonly Diagnostic[]
): qt.Program {
  const createProgramOpts = qf.is.array(rootNamesOrOpts) ? createCreateProgramOpts(rootNamesOrOpts, _opts!, _host, _oldProgram, _configFileParsingDiagnostics) : rootNamesOrOpts;
  const { rootNames, opts, configFileParsingDiagnostics, projectReferences } = createProgramOpts;
  let { oldProgram } = createProgramOpts;
  let processingDefaultLibFiles: qt.SourceFile[] | undefined;
  let processingOtherFiles: qt.SourceFile[] | undefined;
  let files: qt.SourceFile[];
  let symlinks: QReadonlyMap<string> | undefined;
  let commonSourceDirectory: string;
  let diagnosticsProducingTypeChecker: qt.TypeChecker;
  let noDiagnosticsTypeChecker: qt.TypeChecker;
  let classifiableNames: EscapedMap<true>;
  const ambientModuleNameToUnmodifiedFileName = qu.createMap<string>();
  let refFileMap: MultiMap<ts.RefFile> | undefined;
  const cachedBindAndCheckDiagnosticsForFile: DiagnosticCache<Diagnostic> = {};
  const cachedDeclarationDiagnosticsForFile: DiagnosticCache<DiagnosticWithLocation> = {};
  let resolvedTypeReferenceDirectives = qu.createMap<qt.ResolvedTypeReferenceDirective | undefined>();
  let fileProcessingDiagnostics = createDiagnosticCollection();
  const maxNodeModuleJsDepth = typeof opts.maxNodeModuleJsDepth === 'number' ? opts.maxNodeModuleJsDepth : 0;
  let currentNodeModulesDepth = 0;
  const modulesWithElidedImports = qu.createMap<boolean>();
  const sourceFilesFoundSearchingNodeModules = qu.createMap<boolean>();
  performance.mark('beforeProgram');
  const host = createProgramOpts.host || createCompilerHost(opts);
  const configParsingHost = parseConfigHostFromCompilerHostLike(host);
  let skipDefaultLib = opts.noLib;
  const getDefaultLibraryFileName = memoize(() => host.qf.get.defaultLibFileName(opts));
  const defaultLibraryPath = host.getDefaultLibLocation ? host.getDefaultLibLocation() : getDirectoryPath(getDefaultLibraryFileName());
  const programDiagnostics = createDiagnosticCollection();
  const currentDirectory = host.getCurrentDirectory();
  const supportedExtensions = getSupportedExtensions(opts);
  const supportedExtensionsWithJsonIfResolveJsonModule = getSuppoertedExtensionsWithJsonIfResolveJsonModule(opts, supportedExtensions);
  const hasEmitBlockingDiagnostics = qu.createMap<boolean>();
  let _compilerOptsObjectLiteralSyntax: qt.ObjectLiteralExpression | null | undefined;
  let moduleResolutionCache: ModuleResolutionCache | undefined;
  let actualResolveModuleNamesWorker: (moduleNames: string[], containingFile: string, reusedNames?: string[], redirectedReference?: qt.ResolvedProjectReference) => qt.ResolvedModuleFull[];
  const hasInvalidatedResolution = host.hasInvalidatedResolution || (() => false);
  if (host.resolveModuleNames) {
    actualResolveModuleNamesWorker = (moduleNames, containingFile, reusedNames, redirectedReference) =>
      host.resolveModuleNames!(qf.check.allDefined(moduleNames), containingFile, reusedNames, redirectedReference, opts).map((resolved) => {
        if (!resolved || (resolved as qt.ResolvedModuleFull).extension !== undefined) return resolved as qt.ResolvedModuleFull;
        const withExtension = clone(resolved) as qt.ResolvedModuleFull;
        withExtension.extension = qy.get.extensionFromPath(resolved.resolvedFileName);
        return withExtension;
      });
  } else {
    moduleResolutionCache = createModuleResolutionCache(currentDirectory, (x) => host.getCanonicalFileName(x), opts);
    const loader = (moduleName: string, containingFile: string, redirectedReference: qt.ResolvedProjectReference | undefined) =>
      resolveModuleName(moduleName, containingFile, opts, host, moduleResolutionCache, redirectedReference).resolvedModule!;
    actualResolveModuleNamesWorker = (moduleNames, containingFile, _reusedNames, redirectedReference) =>
      loadWithLocalCache<qt.ResolvedModuleFull>(qf.check.allDefined(moduleNames), containingFile, redirectedReference, loader);
  }
  let actualResolveTypeReferenceDirectiveNamesWorker: (
    typeDirectiveNames: string[],
    containingFile: string,
    redirectedReference?: qt.ResolvedProjectReference
  ) => (ResolvedTypeReferenceDirective | undefined)[];
  if (host.resolveTypeReferenceDirectives) {
    actualResolveTypeReferenceDirectiveNamesWorker = (typeDirectiveNames, containingFile, redirectedReference) =>
      host.resolveTypeReferenceDirectives!(qf.check.allDefined(typeDirectiveNames), containingFile, redirectedReference, opts);
  } else {
    const loader = (typesRef: string, containingFile: string, redirectedReference: qt.ResolvedProjectReference | undefined) =>
      resolveTypeReferenceDirective(typesRef, containingFile, opts, host, redirectedReference).resolvedTypeReferenceDirective!;
    actualResolveTypeReferenceDirectiveNamesWorker = (typeReferenceDirectiveNames, containingFile, redirectedReference) =>
      loadWithLocalCache<qt.ResolvedTypeReferenceDirective>(qf.check.allDefined(typeReferenceDirectiveNames), containingFile, redirectedReference, loader);
  }
  const packageIdToSourceFile = qu.createMap<qt.SourceFile>();
  let sourceFileToPackageName = qu.createMap<string>();
  let redirectTargetsMap = new MultiMap<string>();
  const filesByName = qu.createMap<qt.SourceFile | false | undefined>();
  let missingFilePaths: readonly qt.Path[] | undefined;
  const filesByNameIgnoreCase = host.useCaseSensitiveFileNames() ? qu.createMap<qt.SourceFile>() : undefined;
  let resolvedProjectReferences: readonly (ResolvedProjectReference | undefined)[] | undefined;
  let projectReferenceRedirects: Map<qt.ResolvedProjectReference | false> | undefined;
  let mapFromFileToProjectReferenceRedirects: Map<qt.Path> | undefined;
  let mapFromToProjectReferenceRedirectSource: Map<qt.SourceOfProjectReferenceRedirect> | undefined;
  const useSourceOfProjectReferenceRedirect = !!host.useSourceOfProjectReferenceRedirect?.() && !opts.disableSourceOfProjectReferenceRedirect;
  const { onProgramCreateComplete, fileExists } = updateHostForUseSourceOfProjectReferenceRedirect({
    compilerHost: host,
    useSourceOfProjectReferenceRedirect,
    toPath,
    getResolvedProjectReferences,
    getSourceOfProjectReferenceRedirect,
    forEachResolvedProjectReference,
  });
  const shouldCreateNewSourceFile = shouldProgramCreateNewSourceFiles(oldProgram, opts);
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
          const out = parsedRef.commandLine.opts.outFile || parsedRef.commandLine.opts.out;
          if (useSourceOfProjectReferenceRedirect) {
            if (out || getEmitModuleKind(parsedRef.commandLine.opts) === qt.ModuleKind.None) {
              for (const fileName of parsedRef.commandLine.fileNames) {
                processSourceFile(fileName, undefined);
              }
            }
          } else {
            if (out) {
              processSourceFile(changeExtension(out, '.d.ts'), undefined);
            } else if (getEmitModuleKind(parsedRef.commandLine.opts) === qt.ModuleKind.None) {
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
    const typeReferences: string[] = rootNames.length ? getAutomaticTypeDirectiveNames(opts, host) : emptyArray;
    if (typeReferences.length) {
      const containingDirectory = opts.configFilePath ? getDirectoryPath(opts.configFilePath) : host.getCurrentDirectory();
      const containingFilename = combinePaths(containingDirectory, inferredTypesContainingFile);
      const resolutions = resolveTypeReferenceDirectiveNamesWorker(typeReferences, containingFilename);
      for (let i = 0; i < typeReferences.length; i++) {
        processTypeReferenceDirective(typeReferences[i], resolutions[i]);
      }
    }
    if (rootNames.length && !skipDefaultLib) {
      const defaultLibraryFileName = getDefaultLibraryFileName();
      if (!opts.lib && defaultLibraryFileName) {
        processRootFile(defaultLibraryFileName, false);
      } else {
        forEach(opts.lib, (libFileName) => {
          processRootFile(combinePaths(defaultLibraryPath, libFileName), false);
        });
      }
    }
    missingFilePaths = arrayFrom(mapDefinedIterator(filesByName.entries(), ([path, file]) => (file === undefined ? (path as qt.Path) : undefined)));
    files = stableSort(processingDefaultLibFiles, compareDefaultLibFiles).concat(processingOtherFiles);
    processingDefaultLibFiles = undefined;
    processingOtherFiles = undefined;
  }
  qf.assert.true(!!missingFilePaths);
  if (oldProgram && host.onReleaseOldSourceFile) {
    const oldSourceFiles = oldProgram.getSourceFiles();
    for (const oldSourceFile of oldSourceFiles) {
      const newFile = getSourceFileByPath(oldSourceFile.resolvedPath);
      if (shouldCreateNewSourceFile || !newFile || (oldSourceFile.resolvedPath === oldSourceFile.path && newFile.resolvedPath !== oldSourceFile.path)) {
        host.onReleaseOldSourceFile(oldSourceFile, oldProgram.getCompilerOpts(), !!getSourceFileByPath(oldSourceFile.path));
      }
    }
    oldProgram.forEachResolvedProjectReference((resolvedProjectReference, resolvedProjectReferencePath) => {
      if (resolvedProjectReference && !getResolvedProjectReferenceByPath(resolvedProjectReferencePath)) {
        host.onReleaseOldSourceFile!(resolvedProjectReference.sourceFile, oldProgram!.getCompilerOpts(), false);
      }
    });
  }
  oldProgram = undefined;
  const program: qt.Program = {
    getRootFileNames: () => rootNames,
    getSourceFile,
    getSourceFileByPath,
    getSourceFiles: () => files,
    getMissingFilePaths: () => missingFilePaths!,
    getRefFileMap: () => refFileMap,
    getFilesByNameMap: () => filesByName,
    getCompilerOpts: () => opts,
    getSyntacticDiagnostics,
    getOptsDiagnostics,
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
    getNodeCount: () => getDiagnosticsProducingTypeChecker().get.nodeCount,
    getIdentifierCount: () => getDiagnosticsProducingTypeChecker().get.identifierCount,
    getSymbolCount: () => getDiagnosticsProducingTypeChecker().get.symbolCount,
    getTypeCount: () => getDiagnosticsProducingTypeChecker().get.typeCount,
    getInstantiationCount: () => getDiagnosticsProducingTypeChecker().get.instantiationCount,
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
  verifyCompilerOpts();
  performance.mark('afterProgram');
  performance.measure('Program', 'beforeProgram', 'afterProgram');
  return program;
  function resolveModuleNamesWorker(moduleNames: string[], containingFile: string, reusedNames?: string[], redirectedReference?: qt.ResolvedProjectReference) {
    performance.mark('beforeResolveModule');
    const result = actualResolveModuleNamesWorker(moduleNames, containingFile, reusedNames, redirectedReference);
    performance.mark('afterResolveModule');
    performance.measure('ResolveModule', 'beforeResolveModule', 'afterResolveModule');
    return result;
  }
  function resolveTypeReferenceDirectiveNamesWorker(typeDirectiveNames: string[], containingFile: string, redirectedReference?: qt.ResolvedProjectReference) {
    performance.mark('beforeResolveTypeReference');
    const result = actualResolveTypeReferenceDirectiveNamesWorker(typeDirectiveNames, containingFile, redirectedReference);
    performance.mark('afterResolveTypeReference');
    performance.measure('ResolveTypeReference', 'beforeResolveTypeReference', 'afterResolveTypeReference');
    return result;
  }
  function compareDefaultLibFiles(a: qt.SourceFile, b: qt.SourceFile) {
    return compareNumbers(getDefaultLibFilePriority(a), getDefaultLibFilePriority(b));
  }
  function getDefaultLibFilePriority(a: qt.SourceFile) {
    if (containsPath(defaultLibraryPath, a.fileName, false)) {
      const basename = getBaseFileName(a.fileName);
      if (basename === 'lib.d.ts' || basename === 'lib.es6.d.ts') return 0;
      const name = removeSuffix(removePrefix(basename, 'lib.'), '.d.ts');
      const index = libs.indexOf(name);
      if (index !== -1) return index + 1;
    }
    return libs.length + 2;
  }
  function getResolvedModuleWithFailedLookupLocationsFromCache(moduleName: string, containingFile: string): qt.ResolvedModuleWithFailedLookupLocations | undefined {
    return moduleResolutionCache && resolveModuleNameFromCache(moduleName, containingFile, moduleResolutionCache);
  }
  function toPath(fileName: string): qt.Path {
    return qnr.toPath(fileName, currentDirectory, getCanonicalFileName);
  }
  function getCommonSourceDirectory() {
    if (commonSourceDirectory === undefined) {
      const emittedFiles = filter(files, (file) => sourceFileMayBeEmitted(file, program));
      if (opts.rootDir && checkSourceFilesBelongToPath(emittedFiles, opts.rootDir)) {
        commonSourceDirectory = getNormalizedAbsolutePath(opts.rootDir, currentDirectory);
      } else if (opts.composite && opts.configFilePath) {
        commonSourceDirectory = getDirectoryPath(normalizeSlashes(opts.configFilePath));
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
      classifiableNames = qu.createEscapedMap<true>();
      for (const sourceFile of files) {
        qu.copyEntries(sourceFile.classifiableNames!, classifiableNames);
      }
    }
    return classifiableNames;
  }
  function resolveModuleNamesReusingOldState(moduleNames: string[], containingFile: string, file: qt.SourceFile) {
    if (structuralIsReused === StructureIsReused.Not && !file.ambientModuleNames.length)
      return resolveModuleNamesWorker(moduleNames, containingFile, undefined, getResolvedProjectReferenceToRedirect(file.originalFileName));
    const oldSourceFile = oldProgram && oldProgram.getSourceFile(containingFile);
    if (oldSourceFile !== file && file.resolvedModules) {
      const result: qt.ResolvedModuleFull[] = [];
      for (const moduleName of moduleNames) {
        const resolvedModule = file.resolvedModules.get(moduleName)!;
        result.push(resolvedModule);
      }
      return result;
    }
    let unknownModuleNames: string[] | undefined;
    let result: qt.ResolvedModuleFull[] | undefined;
    let reusedNames: string[] | undefined;
    const predictedToResolveToAmbientModuleMarker: qt.ResolvedModuleFull = <any>{};
    for (let i = 0; i < moduleNames.length; i++) {
      const moduleName = moduleNames[i];
      if (file === oldSourceFile && !hasInvalidatedResolution(oldSourceFile.path)) {
        const oldResolvedModule = oldSourceFile && oldSourceFile.resolvedModules!.get(moduleName);
        if (oldResolvedModule) {
          if (isTraceEnabled(opts, host)) {
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
        if (isTraceEnabled(opts, host)) {
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
      qf.assert.true(resolutions.length === moduleNames.length);
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
    qf.assert.true(j === resolutions.length);
    return result;
    function moduleNameResolvesToAmbientModuleInNonModifiedFile(moduleName: string): boolean {
      const resolutionToFile = oldSourceFile.resolvedModule(moduleName);
      const resolvedFile = resolutionToFile && oldProgram!.getSourceFile(resolutionToFile.resolvedFileName);
      if (resolutionToFile && resolvedFile) return false;
      const unmodifiedFile = ambientModuleNameToUnmodifiedFileName.get(moduleName);
      if (!unmodifiedFile) return false;
      if (isTraceEnabled(opts, host)) {
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
    const oldOpts = oldProgram.getCompilerOpts();
    if (changesAffectModuleResolution(oldOpts, opts)) return (oldProgram.structureIsReused = StructureIsReused.Not);
    qf.assert.true(!(oldProgram.structureIsReused! & (StructureIsReused.Completely | StructureIsReused.SafeModules)));
    const oldRootNames = oldProgram.getRootFileNames();
    if (!arrayIsEqualTo(oldRootNames, rootNames)) return (oldProgram.structureIsReused = StructureIsReused.Not);
    if (!arrayIsEqualTo(opts.types, oldOpts.types)) return (oldProgram.structureIsReused = StructureIsReused.Not);
    if (!canReuseProjectReferences()) return (oldProgram.structureIsReused = StructureIsReused.Not);
    if (projectReferences) {
      resolvedProjectReferences = projectReferences.map(parseProjectReferenceConfigFile);
    }
    const newSourceFiles: qt.SourceFile[] = [];
    const modifiedSourceFiles: { oldFile: qt.SourceFile; newFile: qt.SourceFile }[] = [];
    oldProgram.structureIsReused = StructureIsReused.Completely;
    if (oldProgram.getMissingFilePaths().some((missingFilePath) => host.fileExists(missingFilePath))) return (oldProgram.structureIsReused = StructureIsReused.Not);
    const oldSourceFiles = oldProgram.getSourceFiles();
    const enum SeenPackageName {
      Exists,
      Modified,
    }
    const seenPackageNames = qu.createMap<SeenPackageName>();
    for (const oldSourceFile of oldSourceFiles) {
      let newSourceFile = host.getSourceFileByPath
        ? host.getSourceFileByPath(oldSourceFile.fileName, oldSourceFile.resolvedPath, opts.target!, undefined, shouldCreateNewSourceFile)
        : host.getSourceFile(oldSourceFile.fileName, opts.target!, undefined, shouldCreateNewSourceFile);
      if (!newSourceFile) return (oldProgram.structureIsReused = StructureIsReused.Not);
      qf.assert.true(!newSourceFile.redirectInfo, 'Host should not return a redirect source file from `getSourceFile`');
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
    qf.assert.true(newSourceFiles.length === oldProgram.getSourceFiles().length);
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
  function getEmitHost(writeFileCallback?: qt.WriteFileCallback): qt.EmitHost {
    return {
      getPrependNodes,
      getCanonicalFileName,
      getCommonSourceDirectory: program.getCommonSourceDirectory,
      getCompilerOpts: program.getCompilerOpts,
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
  function emitBuildInfo(writeFileCallback?: qt.WriteFileCallback): qt.EmitResult {
    qf.assert.true(!opts.out && !opts.outFile);
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
  function isSourceFileFromExternalLibrary(file: qt.SourceFile): boolean {
    return !!sourceFilesFoundSearchingNodeModules.get(file.path);
  }
  function isSourceFileDefaultLibrary(file: qt.SourceFile): boolean {
    if (file.hasNoDefaultLib) return true;
    if (!opts.noLib) return false;
    const equalityComparer = host.useCaseSensitiveFileNames() ? equateStringsCaseSensitive : equateStringsCaseInsensitive;
    if (!opts.lib) return equalityComparer(file.fileName, getDefaultLibraryFileName());
    return some(opts.lib, (libFileName) => equalityComparer(file.fileName, combinePaths(defaultLibraryPath, libFileName)));
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
    sourceFile?: qt.SourceFile,
    writeFileCallback?: qt.WriteFileCallback,
    cancellationToken?: qt.CancellationToken,
    emitOnlyDtsFiles?: boolean,
    transformers?: qt.CustomTransformers,
    forceDtsEmit?: boolean
  ): qt.EmitResult {
    return runWithCancellationToken(() => emitWorker(program, sourceFile, writeFileCallback, cancellationToken, emitOnlyDtsFiles, transformers, forceDtsEmit));
  }
  function isEmitBlocked(emitFileName: string): boolean {
    return hasEmitBlockingqd.has(toPath(emitFileName));
  }
  function emitWorker(
    program: qt.Program,
    sourceFile: qt.SourceFile | undefined,
    writeFileCallback: qt.WriteFileCallback | undefined,
    cancellationToken: qt.CancellationToken | undefined,
    emitOnlyDtsFiles?: boolean,
    customTransformers?: qt.CustomTransformers,
    forceDtsEmit?: boolean
  ): qt.EmitResult {
    if (!forceDtsEmit) {
      const result = handleNoEmitOpts(program, sourceFile, cancellationToken);
      if (result) return result;
    }
    const emitResolver = getDiagnosticsProducingTypeChecker().getEmitResolver(opts.outFile || opts.out ? undefined : sourceFile, cancellationToken);
    performance.mark('beforeEmit');
    const emitResult = emitFiles(emitResolver, getEmitHost(writeFileCallback), sourceFile, getTransformers(opts, customTransformers, emitOnlyDtsFiles), emitOnlyDtsFiles, false, forceDtsEmit);
    performance.mark('afterEmit');
    performance.measure('Emit', 'beforeEmit', 'afterEmit');
    return emitResult;
  }
  function getSourceFile(fileName: string): qt.SourceFile | undefined {
    return getSourceFileByPath(toPath(fileName));
  }
  function getSourceFileByPath(path: qt.Path): qt.SourceFile | undefined {
    return filesByName.get(path) || undefined;
  }
  function getDiagnosticsHelper<T extends Diagnostic>(
    sourceFile: qt.SourceFile | undefined,
    getDiagnostics: (sourceFile: qt.SourceFile, cancellationToken: qt.CancellationToken | undefined) => readonly T[],
    cancellationToken: qt.CancellationToken | undefined
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
  function getSyntacticDiagnostics(sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly DiagnosticWithLocation[] {
    return getDiagnosticsHelper(sourceFile, getSyntacticDiagnosticsForFile, cancellationToken);
  }
  function getSemanticDiagnostics(sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly Diagnostic[] {
    return getDiagnosticsHelper(sourceFile, getSemanticDiagnosticsForFile, cancellationToken);
  }
  function getBindAndCheckDiagnostics(sourceFile: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly Diagnostic[] {
    return getBindAndCheckDiagnosticsForFile(sourceFile, cancellationToken);
  }
  function getProgramDiagnostics(sourceFile: qt.SourceFile): readonly Diagnostic[] {
    if (sourceFile.skipTypeChecking(opts, program)) return emptyArray;
    const fileProcessingDiagnosticsInFile = fileProcessingqd.getDiagnostics(sourceFile.fileName);
    const programDiagnosticsInFile = programqd.getDiagnostics(sourceFile.fileName);
    return getMergedProgramDiagnostics(sourceFile, fileProcessingDiagnosticsInFile, programDiagnosticsInFile);
  }
  function getMergedProgramDiagnostics(sourceFile: qt.SourceFile, ...allDiagnostics: (readonly Diagnostic[] | undefined)[]) {
    const flatDiagnostics = flatten(allDiagnostics);
    if (!sourceFile.commentDirectives?.length) return flatDiagnostics;
    return getDiagnosticsWithPrecedingDirectives(sourceFile, sourceFile.commentDirectives, flatDiagnostics).diagnostics;
  }
  function getDeclarationDiagnostics(sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly DiagnosticWithLocation[] {
    const opts = program.getCompilerOpts();
    if (!sourceFile || opts.out || opts.outFile) return getDeclarationDiagnosticsWorker(sourceFile, cancellationToken);
    return getDiagnosticsHelper(sourceFile, getDeclarationDiagnosticsForFile, cancellationToken);
  }
  function getSyntacticDiagnosticsForFile(sourceFile: qt.SourceFile): readonly DiagnosticWithLocation[] {
    if (sourceFile.isJS()) {
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
      if (e instanceof qt.OperationCanceledException) {
        noDiagnosticsTypeChecker = undefined!;
        diagnosticsProducingTypeChecker = undefined!;
      }
      throw e;
    }
  }
  function getSemanticDiagnosticsForFile(sourceFile: qt.SourceFile, cancellationToken: qt.CancellationToken | undefined): readonly Diagnostic[] {
    return concatenate(getBindAndCheckDiagnosticsForFile(sourceFile, cancellationToken), getProgramDiagnostics(sourceFile));
  }
  function getBindAndCheckDiagnosticsForFile(sourceFile: qt.SourceFile, cancellationToken: qt.CancellationToken | undefined): readonly Diagnostic[] {
    return getAndCacheDiagnostics(sourceFile, cancellationToken, cachedBindAndCheckDiagnosticsForFile, getBindAndCheckDiagnosticsForFileNoCache);
  }
  function getBindAndCheckDiagnosticsForFileNoCache(sourceFile: qt.SourceFile, cancellationToken: qt.CancellationToken | undefined): readonly Diagnostic[] {
    return runWithCancellationToken(() => {
      if (sourceFile.skipTypeChecking(opts, program)) return emptyArray;
      const typeChecker = getDiagnosticsProducingTypeChecker();
      qf.assert.true(!!sourceFile.bindDiagnostics);
      const isCheckJs = sourceFile.isCheckJsEnabled(opts);
      const isTsNoCheck = !!sourceFile.checkJsDirective && sourceFile.checkJsDirective.enabled === false;
      const includeBindAndCheckDiagnostics =
        !isTsNoCheck &&
        (sourceFile.scriptKind === qt.ScriptKind.TS ||
          sourceFile.scriptKind === qt.ScriptKind.TSX ||
          sourceFile.scriptKind === qt.ScriptKind.External ||
          isCheckJs ||
          sourceFile.scriptKind === qt.ScriptKind.Deferred);
      const bindDiagnostics: readonly Diagnostic[] = includeBindAndCheckDiagnostics ? sourceFile.bindDiagnostics : emptyArray;
      const checkDiagnostics = includeBindAndCheckDiagnostics ? typeChecker.getDiagnostics(sourceFile, cancellationToken) : emptyArray;
      return getMergedBindAndCheckDiagnostics(sourceFile, bindDiagnostics, checkDiagnostics, isCheckJs ? sourceFile.docDiagnostics : undefined);
    });
  }
  function getMergedBindAndCheckDiagnostics(sourceFile: qt.SourceFile, ...allDiagnostics: (readonly Diagnostic[] | undefined)[]) {
    const flatDiagnostics = flatten(allDiagnostics);
    if (!sourceFile.commentDirectives?.length) return flatDiagnostics;
    const { diagnostics, directives } = getDiagnosticsWithPrecedingDirectives(sourceFile, sourceFile.commentDirectives, flatDiagnostics);
    for (const errorExpectation of directives.getUnusedExpectations()) {
      diagnostics.push(qf.create.diagForRange(sourceFile, errorExpectation.range, qd.Unused_ts_expect_error_directive));
    }
    return diagnostics;
  }
  function getDiagnosticsWithPrecedingDirectives(sourceFile: qt.SourceFile, commentDirectives: qt.CommentDirective[], flatDiagnostics: Diagnostic[]) {
    const directives = qf.create.commentDirectivesMap(sourceFile, commentDirectives);
    const diagnostics = flatqd.filter((diagnostic) => markPrecedingCommentDirectiveLine(diagnostic, directives) === -1);
    return { diagnostics, directives };
  }
  function getSuggestionDiagnostics(sourceFile: qt.SourceFile, cancellationToken: qt.CancellationToken): readonly DiagnosticWithLocation[] {
    return runWithCancellationToken(() => {
      return getDiagnosticsProducingTypeChecker().getSuggestionDiagnostics(sourceFile, cancellationToken);
    });
  }
  function markPrecedingCommentDirectiveLine(diagnostic: Diagnostic, directives: qt.CommentDirectivesMap) {
    const { file, start } = diagnostic;
    if (!file) return -1;
    const s = qy.get.lineStarts(file);
    let line = qy.get.lineAndCharOf(s, start!).line - 1;
    while (line >= 0) {
      if (directives.markUsed(line)) return line;
      const lineText = file.text.slice(s[line], s[line + 1]).trim();
      if (lineText !== '' && !/^(\s*)\/\/(.*)$/.test(lineText)) return -1;
      line--;
    }
    return -1;
  }
  function getJSSyntacticDiagnosticsForFile(sourceFile: qt.SourceFile): DiagnosticWithLocation[] {
    return runWithCancellationToken(() => {
      const diagnostics: DiagnosticWithLocation[] = [];
      walk(sourceFile, sourceFile);
      qf.each.childRecursively(sourceFile, walk, walkArray);
      return diagnostics;
      function walk(node: Node, parent: Node) {
        switch (parent.kind) {
          case Syntax.Param:
          case Syntax.PropertyDeclaration:
          case Syntax.MethodDeclaration:
            if ((<qt.ParamDeclaration | qt.PropertyDeclaration | qt.MethodDeclaration>parent).questionToken === node) {
              diagnostics.push(qf.create.diagForNode(node, qd.The_0_modifier_can_only_be_used_in_TypeScript_files, '?'));
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
            if ((<qt.FunctionLikeDeclaration | qt.VariableDeclaration | qt.ParamDeclaration | qt.PropertyDeclaration>parent).type === node) {
              diagnostics.push(qf.create.diagForNode(node, qd.Type_annotations_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
        }
        switch (node.kind) {
          case Syntax.ImportClause:
            if ((node as qt.ImportClause).isTypeOnly) {
              diagnostics.push(qf.create.diagForNode(node.parent, qd._0_declarations_can_only_be_used_in_TypeScript_files, 'import type'));
              return 'skip';
            }
            break;
          case Syntax.ExportDeclaration:
            if ((node as qt.ExportDeclaration).isTypeOnly) {
              diagnostics.push(qf.create.diagForNode(node, qd._0_declarations_can_only_be_used_in_TypeScript_files, 'export type'));
              return 'skip';
            }
            break;
          case Syntax.ImportEqualsDeclaration:
            diagnostics.push(qf.create.diagForNode(node, qd.import_can_only_be_used_in_TypeScript_files));
            return 'skip';
          case Syntax.ExportAssignment:
            if ((<qt.ExportAssignment>node).isExportEquals) {
              diagnostics.push(qf.create.diagForNode(node, qd.export_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
            break;
          case Syntax.HeritageClause:
            const heritageClause = <qt.HeritageClause>node;
            if (heritageClause.token === Syntax.ImplementsKeyword) {
              diagnostics.push(qf.create.diagForNode(node, qd.implements_clauses_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
            break;
          case Syntax.InterfaceDeclaration:
            const interfaceKeyword = qt.Token.toString(Syntax.InterfaceKeyword);
            qf.assert.defined(interfaceKeyword);
            diagnostics.push(qf.create.diagForNode(node, qd._0_declarations_can_only_be_used_in_TypeScript_files, interfaceKeyword));
            return 'skip';
          case Syntax.ModuleDeclaration:
            const moduleKeyword = node.flags & NodeFlags.Namespace ? qt.Token.toString(Syntax.NamespaceKeyword) : qt.Token.toString(Syntax.ModuleKeyword);
            qf.assert.defined(moduleKeyword);
            diagnostics.push(qf.create.diagForNode(node, qd._0_declarations_can_only_be_used_in_TypeScript_files, moduleKeyword));
            return 'skip';
          case Syntax.TypeAliasDeclaration:
            diagnostics.push(qf.create.diagForNode(node, qd.Type_aliases_can_only_be_used_in_TypeScript_files));
            return 'skip';
          case Syntax.EnumDeclaration:
            const enumKeyword = qf.check.defined(Token.toString(Syntax.EnumKeyword));
            diagnostics.push(qf.create.diagForNode(node, qd._0_declarations_can_only_be_used_in_TypeScript_files, enumKeyword));
            return 'skip';
          case Syntax.NonNullExpression:
            diagnostics.push(qf.create.diagForNode(node, qd.Non_null_assertions_can_only_be_used_in_TypeScript_files));
            return 'skip';
          case Syntax.AsExpression:
            diagnostics.push(qf.create.diagForNode((node as qt.AsExpression).type, qd.Type_assertion_expressions_can_only_be_used_in_TypeScript_files));
            return 'skip';
          case Syntax.TypeAssertionExpression:
            fail();
        }
      }
      function walkArray(nodes: Nodes<Node>, parent: Node) {
        if (parent.decorators === nodes && !opts.experimentalDecorators) {
          diagnostics.push(
            qf.create.diagForNode(
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
            if (nodes === (<qt.DeclarationWithTypeParamChildren>parent).typeParams) {
              diagnostics.push(qf.create.diagForNodes(nodes, qd.Type_param_declarations_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
          case Syntax.VariableStatement:
            if (nodes === parent.modifiers) {
              checkModifiers(parent.modifiers, parent.kind === Syntax.VariableStatement);
              return 'skip';
            }
            break;
          case Syntax.PropertyDeclaration:
            if (nodes === (<qt.PropertyDeclaration>parent).modifiers) {
              for (const modifier of <Nodes<Modifier>>nodes) {
                if (modifier.kind !== Syntax.StaticKeyword) {
                  diagnostics.push(qf.create.diagForNode(modifier, qd.The_0_modifier_can_only_be_used_in_TypeScript_files, qt.Token.toString(modifier.kind)));
                }
              }
              return 'skip';
            }
            break;
          case Syntax.Param:
            if (nodes === (<qt.ParamDeclaration>parent).modifiers) {
              diagnostics.push(qf.create.diagForNodes(nodes, qd.Param_modifiers_can_only_be_used_in_TypeScript_files));
              return 'skip';
            }
            break;
          case Syntax.CallExpression:
          case Syntax.NewExpression:
          case Syntax.ExpressionWithTypings:
          case Syntax.JsxSelfClosingElem:
          case Syntax.JsxOpeningElem:
          case Syntax.TaggedTemplateExpression:
            if (nodes === (<qt.WithArgsTobj>parent).typeArgs) {
              diagnostics.push(qf.create.diagForNodes(nodes, qd.Type_args_can_only_be_used_in_TypeScript_files));
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
              diagnostics.push(qf.create.diagForNode(modifier, qd.The_0_modifier_can_only_be_used_in_TypeScript_files, qt.Token.toString(modifier.kind)));
              break;
            case Syntax.StaticKeyword:
            case Syntax.ExportKeyword:
            case Syntax.DefaultKeyword:
          }
        }
      }
      function qf.create.diagForNodes(nodes: Nodes<Node>, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number): DiagnosticWithLocation {
        const start = nodes.pos;
        return qf.create.fileDiag(sourceFile, start, nodes.end - start, message, arg0, arg1, arg2);
      }
      function qf.create.diagForNode(node: Node, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number): DiagnosticWithLocation {
        return qf.create.diagForNodeInSourceFile(sourceFile, node, message, arg0, arg1, arg2);
      }
    });
  }
  function getDeclarationDiagnosticsWorker(sourceFile: qt.SourceFile | undefined, cancellationToken: qt.CancellationToken | undefined): readonly DiagnosticWithLocation[] {
    return getAndCacheDiagnostics(sourceFile, cancellationToken, cachedDeclarationDiagnosticsForFile, getDeclarationDiagnosticsForFileNoCache);
  }
  function getDeclarationDiagnosticsForFileNoCache(sourceFile: qt.SourceFile | undefined, cancellationToken: qt.CancellationToken | undefined): readonly DiagnosticWithLocation[] {
    return runWithCancellationToken(() => {
      const resolver = getDiagnosticsProducingTypeChecker().getEmitResolver(sourceFile, cancellationToken);
      return qnr.getDeclarationDiagnostics(getEmitHost(noop), resolver, sourceFile) || emptyArray;
    });
  }
  function getAndCacheDiagnostics<T extends qt.SourceFile | undefined, U extends Diagnostic>(
    sourceFile: T,
    cancellationToken: qt.CancellationToken | undefined,
    cache: DiagnosticCache<U>,
    getDiagnostics: (sourceFile: T, cancellationToken: qt.CancellationToken | undefined) => readonly U[]
  ): readonly U[] {
    const cachedResult = sourceFile ? cache.perFile && cache.perFile.get(sourceFile.path) : cache.allDiagnostics;
    if (cachedResult) return cachedResult;
    const result = getDiagnostics(sourceFile, cancellationToken);
    if (sourceFile) {
      if (!cache.perFile) {
        cache.perFile = qu.createMap();
      }
      cache.perFile.set(sourceFile.path, result);
    } else {
      cache.allDiagnostics = result;
    }
    return result;
  }
  function getDeclarationDiagnosticsForFile(sourceFile: qt.SourceFile, cancellationToken: qt.CancellationToken): readonly DiagnosticWithLocation[] {
    return sourceFile.isDeclarationFile ? [] : getDeclarationDiagnosticsWorker(sourceFile, cancellationToken);
  }
  function getOptsDiagnostics(): SortedReadonlyArray<Diagnostic> {
    return sortAndDeduplicateDiagnostics(concatenate(fileProcessingqd.getGlobalDiagnostics(), concatenate(programqd.getGlobalDiagnostics(), getOptsDiagnosticsOfConfigFile())));
  }
  function getOptsDiagnosticsOfConfigFile() {
    if (!opts.configFile) return emptyArray;
    let diagnostics = programqd.getDiagnostics(opts.configFile.fileName);
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
  function fileReferenceIsEqualTo(a: qt.FileReference, b: qt.FileReference): boolean {
    return a.fileName === b.fileName;
  }
  function moduleNameIsEqualTo(a: qt.StringLiteralLike | qt.Identifier, b: qt.StringLiteralLike | qt.Identifier): boolean {
    return a.kind === Syntax.Identifier ? b.kind === Syntax.Identifier && a.escapedText === b.escapedText : b.kind === Syntax.StringLiteral && a.text === b.text;
  }
  function collectExternalModuleReferences(file: qt.SourceFile): void {
    if (file.imports) {
      return;
    }
    const isJavaScriptFile = file.isJS();
    const isExternalModuleFile = qf.is.externalModule(file);
    let imports: qt.StringLiteralLike[] | undefined;
    let moduleAugmentations: (StringLiteral | qt.Identifier)[] | undefined;
    let ambientModules: string[] | undefined;
    if (opts.importHelpers && (opts.isolatedModules || isExternalModuleFile) && !file.isDeclarationFile) {
      const externalHelpersModuleReference = qc.asLiteral(externalHelpersModuleNameText);
      const importDecl = new qc.ImportDeclaration(undefined, undefined, externalHelpersModuleReference);
      qf.emit.addFlags(importDecl, EmitFlags.NeverApplyImportHelper);
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
    function collectModuleReferences(node: qt.Statement, inAmbientModule: boolean): void {
      if (qf.is.anyImportOrReExport(node)) {
        const moduleNameExpr = qf.get.externalModuleName(node);
        if (moduleNameExpr && moduleNameExpr.kind === Syntax.StringLiteral && moduleNameExpr.text && (!inAmbientModule || !isExternalModuleNameRelative(moduleNameExpr.text))) {
          imports = append(imports, moduleNameExpr);
        }
      } else if (node.kind === Syntax.ModuleDeclaration) {
        if (qf.is.ambientModule(node) && (inAmbientModule || qf.has.syntacticModifier(node, ModifierFlags.Ambient) || file.isDeclarationFile)) {
          const nameText = qf.get.textOfIdentifierOrLiteral(node.name);
          if (isExternalModuleFile || (inAmbientModule && !isExternalModuleNameRelative(nameText))) {
            (moduleAugmentations || (moduleAugmentations = [])).push(node.name);
          } else if (!inAmbientModule) {
            if (file.isDeclarationFile) {
              (ambientModules || (ambientModules = [])).push(nameText);
            }
            const body = <qt.ModuleBlock>(<qt.ModuleDeclaration>node).body;
            if (body) {
              for (const statement of body.statements) {
                collectModuleReferences(statement, true);
              }
            }
          }
        }
      }
    }
    function collectDynamicImportOrRequireCalls(file: qt.SourceFile) {
      const r = /import|require/g;
      while (r.exec(file.text) !== null) {
        const node = getNodeAtPosition(file, r.lastIndex);
        if (qf.is.requireCall(node, true)) {
          imports = append(imports, node.args[0]);
        } else if (qf.is.importCall(node) && node.args.length === 1 && qf.is.stringLiteralLike(node.args[0])) {
          imports = append(imports, node.args[0] as qt.StringLiteralLike);
        } else if (qf.is.literalImportTyping(node)) {
          imports = append(imports, node.arg.literal);
        }
      }
    }
    function getNodeAtPosition(sourceFile: qt.SourceFile, position: number): Node {
      let current: Node = sourceFile;
      const getContainingChild = (child: Node) => {
        if (child.pos <= position && (position < child.end || (position === child.end && child.kind === Syntax.EndOfFileToken))) return child;
      };
      while (true) {
        const child = (isJavaScriptFile && qf.is.withDocNodes(current) && forEach(current.doc, getContainingChild)) || qf.each.child(current, getContainingChild);
        if (!child) return current;
        current = child;
      }
    }
  }
  function getLibFileFromReference(ref: qt.FileReference) {
    const libName = toFileNameLowerCase(ref.fileName);
    const libFileName = libMap.get(libName);
    if (libFileName) return getSourceFile(combinePaths(defaultLibraryPath, libFileName));
  }
  function getSourceFileFromReference(referencingFile: qt.SourceFile | qt.UnparsedSource, ref: qt.FileReference): qt.SourceFile | undefined {
    return getSourceFileFromReferenceWorker(resolveTripleslashReference(ref.fileName, referencingFile.fileName), (fileName) => filesByName.get(toPath(fileName)) || undefined);
  }
  function getSourceFileFromReferenceWorker(
    fileName: string,
    getSourceFile: (fileName: string) => qt.SourceFile | undefined,
    fail?: (diagnostic: qd.Message, ...arg: string[]) => void,
    refFile?: qt.SourceFile
  ): qt.SourceFile | undefined {
    if (hasExtension(fileName)) {
      const canonicalFileName = host.getCanonicalFileName(fileName);
      if (!opts.allowNonTsExtensions && !forEach(supportedExtensionsWithJsonIfResolveJsonModule, (extension) => fileExtensionIs(canonicalFileName, extension))) {
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
      const sourceFileNoExtension = opts.allowNonTsExtensions && getSourceFile(fileName);
      if (sourceFileNoExtension) return sourceFileNoExtension;
      if (fail && opts.allowNonTsExtensions) {
        fail(qd.File_0_not_found, fileName);
        return;
      }
      const sourceFileWithAddedExtension = forEach(supportedExtensions, (extension) => getSourceFile(fileName + extension));
      if (fail && !sourceFileWithAddedExtension) fail(qd.Could_not_resolve_the_path_0_with_the_extensions_Colon_1, fileName, "'" + supportedExtensions.join("', '") + "'");
      return sourceFileWithAddedExtension;
    }
  }
  function processSourceFile(fileName: string, isDefaultLib: boolean, ignoreNoDefaultLib: boolean, packageId: qt.PackageId | undefined, refFile?: qt.RefFile): void {
    getSourceFileFromReferenceWorker(
      fileName,
      (fileName) => findSourceFile(fileName, toPath(fileName), isDefaultLib, ignoreNoDefaultLib, refFile, packageId),
      (diagnostic, ...args) => fileProcessingqd.add(createRefFileDiagnostic(refFile, diagnostic, ...args)),
      refFile && refFile.file
    );
  }
  function reportFileNamesDifferOnlyInCasingError(fileName: string, existingFile: qt.SourceFile, refFile: qt.RefFile | undefined): void {
    const refs = !refFile ? refFileMap && refFileMap.get(existingFile.path) : undefined;
    const refToReportErrorOn = refs && qf.find.up(refs, (ref) => ref.referencedFileName === existingFile.fileName);
    fileProcessingqd.add(
      refToReportErrorOn
        ? qf.create.fileDiagAtReference(refToReportErrorOn, qd.Already_included_file_name_0_differs_from_file_name_1_only_in_casing, existingFile.fileName, fileName)
        : createRefFileDiagnostic(refFile, qd.File_name_0_differs_from_already_included_file_name_1_only_in_casing, fileName, existingFile.fileName)
    );
  }
  function createRedirectSourceFile(redirectTarget: qt.SourceFile, unredirected: qt.SourceFile, fileName: string, path: qt.Path, resolvedPath: qt.Path, originalFileName: string): qt.SourceFile {
    const redirect: qt.SourceFile = Object.create(redirectTarget);
    redirect.fileName = fileName;
    redirect.path = path;
    redirect.resolvedPath = resolvedPath;
    redirect.originalFileName = originalFileName;
    redirect.redirectInfo = { redirectTarget, unredirected };
    sourceFilesFoundSearchingNodeModules.set(path, currentNodeModulesDepth > 0);
    Object.defineProperties(redirect, {
      id: {
        get(this: qt.SourceFile) {
          return this.redirectInfo!.redirectTarget.id;
        },
        set(this: qt.SourceFile, value: qt.SourceFile['id']) {
          this.redirectInfo!.redirectTarget.id = value;
        },
      },
      symbol: {
        get(this: qt.SourceFile) {
          return this.redirectInfo!.redirectTarget.symbol;
        },
        set(this: qt.SourceFile, value: qt.SourceFile['symbol']) {
          this.redirectInfo!.redirectTarget.symbol = value;
        },
      },
    });
    return redirect;
  }
  function findSourceFile(fileName: string, path: qt.Path, isDefaultLib: boolean, ignoreNoDefaultLib: boolean, refFile: qt.RefFile | undefined, packageId: qt.PackageId | undefined): qt.SourceFile | undefined {
    if (useSourceOfProjectReferenceRedirect) {
      let source = getSourceOfProjectReferenceRedirect(fileName);
      if (!source && host.realpath && opts.preserveSymlinks && isDeclarationFileName(fileName) && qu.stringContains(fileName, nodeModulesPathPart)) {
        const realPath = host.realpath(fileName);
        if (realPath !== fileName) source = getSourceOfProjectReferenceRedirect(realPath);
      }
      if (source) {
        const file = qf.is.string(source) ? findSourceFile(source, toPath(source), isDefaultLib, ignoreNoDefaultLib, refFile, packageId) : undefined;
        if (file) addFileToFilesByName(file, path, undefined);
        return file;
      }
    }
    const originalFileName = fileName;
    if (filesByName.has(path)) {
      const file = filesByName.get(path);
      addFileToRefFileMap(fileName, file || undefined, refFile);
      if (file && opts.forceConsistentCasingInFileNames) {
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
        if (!opts.noResolve) {
          processReferencedFiles(file, isDefaultLib);
          processTypeReferenceDirectives(file);
        }
        if (!opts.noLib) {
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
    let redirectedPath: qt.Path | undefined;
    if (refFile && !useSourceOfProjectReferenceRedirect) {
      const redirectProject = getProjectReferenceRedirectProject(fileName);
      if (redirectProject) {
        if (redirectProject.commandLine.opts.outFile || redirectProject.commandLine.opts.out) {
          return;
        }
        const redirect = getProjectReferenceOutputName(redirectProject, fileName);
        fileName = redirect;
        redirectedPath = toPath(redirect);
      }
    }
    const file = host.getSourceFile(
      fileName,
      opts.target!,
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
      if (!opts.noResolve) {
        processReferencedFiles(file, isDefaultLib);
        processTypeReferenceDirectives(file);
      }
      if (!opts.noLib) {
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
  function addFileToRefFileMap(referencedFileName: string, file: qt.SourceFile | undefined, refFile: qt.RefFile | undefined) {
    if (refFile && file) {
      (refFileMap || (refFileMap = new MultiMap())).add(file.path, {
        referencedFileName,
        kind: refFile.kind,
        index: refFile.index,
        file: refFile.file.path,
      });
    }
  }
  function addFileToFilesByName(file: qt.SourceFile | undefined, path: qt.Path, redirectedPath: qt.Path | undefined) {
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
  function getProjectReferenceOutputName(referencedProject: qt.ResolvedProjectReference, fileName: string) {
    const out = referencedProject.commandLine.opts.outFile || referencedProject.commandLine.opts.out;
    return out ? changeExtension(out, Extension.Dts) : getOutputDeclarationFileName(fileName, referencedProject.commandLine, !host.useCaseSensitiveFileNames());
  }
  function getResolvedProjectReferenceToRedirect(fileName: string) {
    if (mapFromFileToProjectReferenceRedirects === undefined) {
      mapFromFileToProjectReferenceRedirects = qu.createMap();
      forEachResolvedProjectReference((referencedProject, referenceProjectPath) => {
        if (referencedProject && toPath(opts.configFilePath!) !== referenceProjectPath) {
          referencedProject.commandLine.fileNames.forEach((f) => mapFromFileToProjectReferenceRedirects!.set(toPath(f), referenceProjectPath));
        }
      });
    }
    const referencedProjectPath = mapFromFileToProjectReferenceRedirects.get(toPath(fileName));
    return referencedProjectPath && getResolvedProjectReferenceByPath(referencedProjectPath);
  }
  function forEachResolvedProjectReference<T>(cb: (resolvedProjectReference: qt.ResolvedProjectReference | undefined, resolvedProjectReferencePath: qt.Path) => T | undefined): T | undefined {
    return forEachProjectReference(projectReferences, resolvedProjectReferences, (resolvedRef, index, parent) => {
      const ref = (parent ? parent.commandLine.projectReferences : projectReferences)![index];
      const resolvedRefPath = toPath(resolveProjectReferencePath(ref));
      return cb(resolvedRef, resolvedRefPath);
    });
  }
  function getSourceOfProjectReferenceRedirect(file: string) {
    if (!isDeclarationFileName(file)) return;
    if (mapFromToProjectReferenceRedirectSource === undefined) {
      mapFromToProjectReferenceRedirectSource = qu.createMap();
      forEachResolvedProjectReference((resolvedRef) => {
        if (resolvedRef) {
          const out = resolvedRef.commandLine.opts.outFile || resolvedRef.commandLine.opts.out;
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
    projectReferences: readonly qt.ProjectReference[] | undefined,
    resolvedProjectReferences: readonly (ResolvedProjectReference | undefined)[] | undefined,
    cbResolvedRef: (resolvedRef: qt.ResolvedProjectReference | undefined, index: number, parent: qt.ResolvedProjectReference | undefined) => T | undefined,
    cbRef?: (projectReferences: readonly qt.ProjectReference[] | undefined, parent: qt.ResolvedProjectReference | undefined) => T | undefined
  ): T | undefined {
    let seenResolvedRefs: qt.ResolvedProjectReference[] | undefined;
    return worker(projectReferences, resolvedProjectReferences, undefined, cbResolvedRef, cbRef);
    function worker(
      projectReferences: readonly qt.ProjectReference[] | undefined,
      resolvedProjectReferences: readonly (ResolvedProjectReference | undefined)[] | undefined,
      parent: qt.ResolvedProjectReference | undefined,
      cbResolvedRef: (resolvedRef: qt.ResolvedProjectReference | undefined, index: number, parent: qt.ResolvedProjectReference | undefined) => T | undefined,
      cbRef?: (projectReferences: readonly qt.ProjectReference[] | undefined, parent: qt.ResolvedProjectReference | undefined) => T | undefined
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
  function getResolvedProjectReferenceByPath(projectReferencePath: qt.Path): qt.ResolvedProjectReference | undefined {
    if (!projectReferenceRedirects) {
      return;
    }
    return projectReferenceRedirects.get(projectReferencePath) || undefined;
  }
  function processReferencedFiles(file: qt.SourceFile, isDefaultLib: boolean) {
    forEach(file.referencedFiles, (ref, index) => {
      const referencedFileName = resolveTripleslashReference(ref.fileName, file.originalFileName);
      processSourceFile(referencedFileName, isDefaultLib, undefined, {
        kind: qt.RefFileKind.ReferenceFile,
        index,
        file,
        pos: ref.pos,
        end: ref.end,
      });
    });
  }
  function processTypeReferenceDirectives(file: qt.SourceFile) {
    const typeDirectives = map(file.typeReferenceDirectives, (ref) => toFileNameLowerCase(ref.fileName));
    if (!typeDirectives) {
      return;
    }
    const resolutions = resolveTypeReferenceDirectiveNamesWorker(typeDirectives, file.originalFileName, getResolvedProjectReferenceToRedirect(file.originalFileName));
    for (let i = 0; i < typeDirectives.length; i++) {
      const ref = file.typeReferenceDirectives[i];
      const resolvedTypeReferenceDirective = resolutions[i];
      const fileName = toFileNameLowerCase(ref.fileName);
      file.setResolvedTypeReferenceDirective(fileName, resolvedTypeReferenceDirective);
      processTypeReferenceDirective(fileName, resolvedTypeReferenceDirective, {
        kind: qt.RefFileKind.TypeReferenceDirective,
        index: i,
        file,
        pos: ref.pos,
        end: ref.end,
      });
    }
  }
  function processTypeReferenceDirective(typeReferenceDirective: string, resolvedTypeReferenceDirective?: qt.ResolvedTypeReferenceDirective, refFile?: qt.RefFile): void {
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
              const refToReportErrorOn = refs && qf.find.up(refs, (ref) => ref.referencedFileName === existingFile.fileName);
              fileProcessingqd.add(
                refToReportErrorOn
                  ? qf.create.fileDiagAtReference(
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
  function processLibReferenceDirectives(file: qt.SourceFile) {
    forEach(file.libReferenceDirectives, (libReference) => {
      const libName = toFileNameLowerCase(libReference.fileName);
      const libFileName = libMap.get(libName);
      if (libFileName) {
        processRootFile(combinePaths(defaultLibraryPath, libFileName), true);
      } else {
        const unqualifiedLibName = removeSuffix(removePrefix(libName, 'lib.'), '.d.ts');
        const suggestion = getSpellingSuggestion(unqualifiedLibName, libs, identity);
        const message = suggestion ? qd.Cannot_find_lib_definition_for_0_Did_you_mean_1 : qd.Cannot_find_lib_definition_for_0;
        fileProcessingqd.add(qf.create.fileDiag(file, libReference.pos, libReference.end - libReference.pos, message, libName, suggestion));
      }
    });
  }
  function createRefFileDiagnostic(refFile: qt.RefFile | undefined, message: qd.Message, ...args: any[]): Diagnostic {
    if (!refFile) return createCompilerDiagnostic(message, ...args);
    return qf.create.fileDiag(refFile.file, refFile.pos, refFile.end - refFile.pos, message, ...args);
  }
  function getCanonicalFileName(fileName: string): string {
    return host.getCanonicalFileName(fileName);
  }
  function processImportedModules(file: qt.SourceFile) {
    collectExternalModuleReferences(file);
    if (file.imports.length || file.moduleAugmentations.length) {
      const moduleNames = getModuleNames(file);
      const resolutions = resolveModuleNamesReusingOldState(moduleNames, getNormalizedAbsolutePath(file.originalFileName, currentDirectory), file);
      qf.assert.true(resolutions.length === moduleNames.length);
      for (let i = 0; i < moduleNames.length; i++) {
        const resolution = resolutions[i];
        file.setResolvedModule(moduleNames[i], resolution);
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
          !getResolutionDiagnostic(opts, resolution) &&
          !opts.noResolve &&
          i < file.imports.length &&
          !elideImport &&
          !(isJsFile && !opts.allowJs) &&
          (qf.is.inJSFile(file.imports[i]) || !(file.imports[i].flags & NodeFlags.Doc));
        if (elideImport) {
          modulesWithElidedImports.set(file.path, true);
        } else if (shouldAddFile) {
          const path = toPath(resolvedFileName);
          const pos = qy.skipTrivia(file.text, file.imports[i].pos);
          findSourceFile(
            resolvedFileName,
            path,
            false,
            false,
            {
              kind: qt.RefFileKind.Import,
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
  function computeCommonSourceDirectory(sourceFiles: qt.SourceFile[]): string {
    const fileNames = mapDefined(sourceFiles, (file) => (file.isDeclarationFile ? undefined : file.fileName));
    return computeCommonSourceDirectoryOfFilenames(fileNames, currentDirectory, getCanonicalFileName);
  }
  function checkSourceFilesBelongToPath(sourceFiles: readonly qt.SourceFile[], rootDirectory: string): boolean {
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
  function parseProjectReferenceConfigFile(ref: qt.ProjectReference): qt.ResolvedProjectReference | undefined {
    if (!projectReferenceRedirects) {
      projectReferenceRedirects = qu.createMap<qt.ResolvedProjectReference | false>();
    }
    const refPath = resolveProjectReferencePath(ref);
    const sourceFilePath = toPath(refPath);
    const fromCache = projectReferenceRedirects.get(sourceFilePath);
    if (fromCache !== undefined) return fromCache || undefined;
    let commandLine: qt.ParsedCommandLine | undefined;
    let sourceFile: qt.JsonSourceFile | undefined;
    if (host.getParsedCommandLine) {
      commandLine = host.getParsedCommandLine(refPath);
      if (!commandLine) {
        addFileToFilesByName(undefined);
        projectReferenceRedirects.set(sourceFilePath, false);
        return;
      }
      sourceFile = qf.check.defined(commandLine.opts.configFile);
      qf.assert.true(!sourceFile.path || sourceFile.path === sourceFilePath);
      addFileToFilesByName(sourceFile, sourceFilePath, undefined);
    } else {
      const basePath = getNormalizedAbsolutePath(getDirectoryPath(refPath), host.getCurrentDirectory());
      sourceFile = host.getSourceFile(refPath, qt.ScriptTarget.JSON) as qt.JsonSourceFile | undefined;
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
    const resolvedRef: qt.ResolvedProjectReference = { commandLine, sourceFile };
    projectReferenceRedirects.set(sourceFilePath, resolvedRef);
    if (commandLine.projectReferences) {
      resolvedRef.references = commandLine.projectReferences.map(parseProjectReferenceConfigFile);
    }
    return resolvedRef;
  }
  function verifyCompilerOpts() {
    if (opts.strictPropertyInitialization && !getStrictOptionValue(opts, 'strictNullChecks')) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1, 'strictPropertyInitialization', 'strictNullChecks');
    }
    if (opts.isolatedModules) {
      if (opts.out) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'out', 'isolatedModules');
      }
      if (opts.outFile) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'outFile', 'isolatedModules');
      }
    }
    if (opts.inlineSourceMap) {
      if (opts.sourceMap) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'sourceMap', 'inlineSourceMap');
      }
      if (opts.mapRoot) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'mapRoot', 'inlineSourceMap');
      }
    }
    if (opts.paths && opts.baseUrl === undefined) {
      createDiagnosticForOptionName(qd.Option_paths_cannot_be_used_without_specifying_baseUrl_option, 'paths');
    }
    if (opts.composite) {
      if (opts.declaration === false) {
        createDiagnosticForOptionName(qd.Composite_projects_may_not_disable_declaration_emit, 'declaration');
      }
      if (opts.incremental === false) {
        createDiagnosticForOptionName(qd.Composite_projects_may_not_disable_incremental_compilation, 'declaration');
      }
    }
    if (opts.tsBuildInfoFile) {
      if (!isIncrementalCompilation(opts)) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'tsBuildInfoFile', 'incremental', 'composite');
      }
    } else if (opts.incremental && !opts.outFile && !opts.out && !opts.configFilePath) {
      programqd.add(createCompilerDiagnostic(qd.Option_incremental_can_only_be_specified_using_tsconfig_emitting_to_single_file_or_when_option_tsBuildInfoFile_is_specified));
    }
    if (!opts.listFilesOnly && opts.noEmit && isIncrementalCompilation(opts)) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'noEmit', opts.incremental ? 'incremental' : 'composite');
    }
    verifyProjectReferences();
    if (opts.composite) {
      const rootPaths = qu.arrayToSet(rootNames, toPath);
      for (const file of files) {
        if (sourceFileMayBeEmitted(file, program) && !rootPaths.has(file.path)) {
          addProgramDiagnosticAtRefPath(
            file,
            rootPaths,
            qd.File_0_is_not_listed_within_the_file_list_of_project_1_Projects_must_list_all_files_or_use_an_include_pattern,
            file.fileName,
            opts.configFilePath || ''
          );
        }
      }
    }
    if (opts.paths) {
      for (const key in opts.paths) {
        if (!hasProperty(opts.paths, key)) {
          continue;
        }
        if (!qy.hasAsterisks(key)) {
          createDiagnosticForOptionPaths(true, key, qd.Pattern_0_can_have_at_most_one_Asterisk_character, key);
        }
        if (qf.is.array(opts.paths[key])) {
          const len = opts.paths[key].length;
          if (len === 0) {
            createDiagnosticForOptionPaths(false, key, qd.Substitutions_for_pattern_0_shouldn_t_be_an_empty_array, key);
          }
          for (let i = 0; i < len; i++) {
            const subst = opts.paths[key][i];
            const typeOfSubst = typeof subst;
            if (typeOfSubst === 'string') {
              if (!qy.hasAsterisks(subst)) {
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
    if (!opts.sourceMap && !opts.inlineSourceMap) {
      if (opts.inlineSources) {
        createDiagnosticForOptionName(qd.Option_0_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided, 'inlineSources');
      }
      if (opts.sourceRoot) {
        createDiagnosticForOptionName(qd.Option_0_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided, 'sourceRoot');
      }
    }
    if (opts.out && opts.outFile) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'out', 'outFile');
    }
    if (opts.mapRoot && !(opts.sourceMap || opts.declarationMap)) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'mapRoot', 'sourceMap', 'declarationMap');
    }
    if (opts.declarationDir) {
      if (!getEmitDeclarations(opts)) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'declarationDir', 'declaration', 'composite');
      }
      if (opts.out || opts.outFile) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'declarationDir', opts.out ? 'out' : 'outFile');
      }
    }
    if (opts.declarationMap && !getEmitDeclarations(opts)) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'declarationMap', 'declaration', 'composite');
    }
    if (opts.lib && opts.noLib) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'lib', 'noLib');
    }
    if (opts.noImplicitUseStrict && getStrictOptionValue(opts, 'alwaysStrict')) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'noImplicitUseStrict', 'alwaysStrict');
    }
    const languageVersion = opts.target || qt.ScriptTarget.ES2020;
    const outFile = opts.outFile || opts.out;
    const firstNonAmbientExternalModuleSourceFile = qf.find.up(files, (f) => qf.is.externalModule(f) && !f.isDeclarationFile);
    if (opts.isolatedModules) {
      const firstNonExternalModuleSourceFile = qf.find.up(files, (f) => !qf.is.externalModule(f) && !f.isJS() && !f.isDeclarationFile && f.scriptKind !== qt.ScriptKind.JSON);
      if (firstNonExternalModuleSourceFile) {
        const span = qf.get.errorSpanForNode(firstNonExternalModuleSourceFile, firstNonExternalModuleSourceFile);
        programqd.add(qf.create.fileDiag(firstNonExternalModuleSourceFile, span.start, span.length, qd.All_files_must_be_modules_when_the_isolatedModules_flag_is_provided));
      }
    }
    if (outFile && !opts.emitDeclarationOnly) {
      if (opts.module && !(opts.module === qt.ModuleKind.AMD || opts.module === qt.ModuleKind.System)) {
        createDiagnosticForOptionName(qd.Only_amd_and_system_modules_are_supported_alongside_0, opts.out ? 'out' : 'outFile', 'module');
      } else if (opts.module === undefined && firstNonAmbientExternalModuleSourceFile) {
        const span = qf.get.errorSpanForNode(firstNonAmbientExternalModuleSourceFile, firstNonAmbientExternalModuleSourceFile.externalModuleIndicator!);
        programqd.add(
          qf.create.fileDiag(
            firstNonAmbientExternalModuleSourceFile,
            span.start,
            span.length,
            qd.Cannot_compile_modules_using_option_0_unless_the_module_flag_is_amd_or_system,
            opts.out ? 'out' : 'outFile'
          )
        );
      }
    }
    if (opts.resolveJsonModule) {
      if (getEmitModuleResolutionKind(opts) !== qt.ModuleResolutionKind.NodeJs) {
        createDiagnosticForOptionName(qd.Option_resolveJsonModule_cannot_be_specified_without_node_module_resolution_strategy, 'resolveJsonModule');
      } else if (!hasJsonModuleEmitEnabled(opts)) {
        createDiagnosticForOptionName(qd.Option_resolveJsonModule_can_only_be_specified_when_module_code_generation_is_commonjs_amd_es2015_or_esNext, 'resolveJsonModule', 'module');
      }
    }
    if (opts.outDir || opts.sourceRoot || opts.mapRoot) {
      const dir = getCommonSourceDirectory();
      if (opts.outDir && dir === '' && files.some((file) => getRootLength(file.fileName) > 1)) {
        createDiagnosticForOptionName(qd.Cannot_find_the_common_subdirectory_path_for_the_input_files, 'outDir');
      }
    }
    if (opts.checkJs && !opts.allowJs) {
      programqd.add(createCompilerDiagnostic(qd.Option_0_cannot_be_specified_without_specifying_option_1, 'checkJs', 'allowJs'));
    }
    if (opts.emitDeclarationOnly) {
      if (!getEmitDeclarations(opts)) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1_or_option_2, 'emitDeclarationOnly', 'declaration', 'composite');
      }
      if (opts.noEmit) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'emitDeclarationOnly', 'noEmit');
      }
    }
    if (opts.emitDecoratorMetadata && !opts.experimentalDecorators) {
      createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_without_specifying_option_1, 'emitDecoratorMetadata', 'experimentalDecorators');
    }
    if (opts.jsxFactory) {
      if (opts.reactNamespace) {
        createDiagnosticForOptionName(qd.Option_0_cannot_be_specified_with_option_1, 'reactNamespace', 'jsxFactory');
      }
      if (!qp_parseIsolatedEntityName(opts.jsxFactory, languageVersion)) {
        createOptionValueDiagnostic('jsxFactory', qd.Invalid_value_for_jsxFactory_0_is_not_a_valid_identifier_or_qualified_name, opts.jsxFactory);
      }
    } else if (opts.reactNamespace && !qy.is.identifierText(opts.reactNamespace)) {
      createOptionValueDiagnostic('reactNamespace', qd.Invalid_value_for_reactNamespace_0_is_not_a_valid_identifier, opts.reactNamespace);
    }
    if (!opts.noEmit && !opts.suppressOutputPathCheck) {
      const emitHost = getEmitHost();
      const emitFilesSeen = qu.createMap<true>();
      forEachEmittedFile(emitHost, (emitFileNames) => {
        if (!opts.emitDeclarationOnly) {
          verifyEmitFilePath(emitFileNames.jsFilePath, emitFilesSeen);
        }
        verifyEmitFilePath(emitFileNames.declarationFilePath, emitFilesSeen);
      });
    }
    function verifyEmitFilePath(emitFileName: string | undefined, emitFilesSeen: QMap<true>) {
      if (emitFileName) {
        const emitFilePath = toPath(emitFileName);
        if (filesByName.has(emitFilePath)) {
          let chain: qd.MessageChain | undefined;
          if (!opts.configFilePath) {
            chain = chainqd.Messages(
              undefined,
              qd.Adding_a_tsconfig_json_file_will_help_organize_projects_that_contain_both_TypeScript_and_JavaScript_files_Learn_more_at_https_Colon_Slash_Slashaka_ms_Slashtsconfig
            );
          }
          chain = chainqd.Messages(chain, qd.Cannot_write_file_0_because_it_would_overwrite_input_file, emitFileName);
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
  function qf.create.fileDiagAtReference(refPathToReportErrorOn: qnr.RefFile, message: qd.Message, ...args: (string | number | undefined)[]) {
    const refFile = qf.check.defined(getSourceFileByPath(refPathToReportErrorOn.file));
    const { kind, index } = refPathToReportErrorOn;
    let pos: number, end: number;
    switch (kind) {
      case qt.RefFileKind.Import:
        pos = qy.skipTrivia(refFile.text, refFile.imports[index].pos);
        end = refFile.imports[index].end;
        break;
      case qt.RefFileKind.ReferenceFile:
        ({ pos, end } = refFile.referencedFiles[index]);
        break;
      case qt.RefFileKind.TypeReferenceDirective:
        ({ pos, end } = refFile.typeReferenceDirectives[index]);
        break;
      default:
        return qc.assert.never(kind);
    }
    return qf.create.fileDiag(refFile, pos, end - pos, message, ...args);
  }
  function addProgramDiagnosticAtRefPath(file: qt.SourceFile, rootPaths: Map<true>, message: qd.Message, ...args: (string | number | undefined)[]) {
    const refPaths = refFileMap && refFileMap.get(file.path);
    const refPathToReportErrorOn = forEach(refPaths, (refPath) => (rootPaths.has(refPath.file) ? refPath : undefined)) || elemAt(refPaths, 0);
    programqd.add(refPathToReportErrorOn ? qf.create.fileDiagAtReference(refPathToReportErrorOn, message, ...args) : createCompilerDiagnostic(message, ...args));
  }
  function verifyProjectReferences() {
    const buildInfoPath = !opts.noEmit && !opts.suppressOutputPathCheck ? getTsBuildInfoEmitOutputFilePath(opts) : undefined;
    forEachProjectReference(projectReferences, resolvedProjectReferences, (resolvedRef, index, parent) => {
      const ref = (parent ? parent.commandLine.projectReferences : projectReferences)![index];
      const parentFile = parent && (parent.sourceFile as qt.JsonSourceFile);
      if (!resolvedRef) {
        createDiagnosticForReference(parentFile, index, qd.File_0_not_found, ref.path);
        return;
      }
      const opts = resolvedRef.commandLine.opts;
      if (!opts.composite) {
        const inputs = parent ? parent.commandLine.fileNames : rootNames;
        if (inputs.length) {
          createDiagnosticForReference(parentFile, index, qd.Referenced_project_0_must_have_setting_composite_Colon_true, ref.path);
        }
      }
      if (ref.prepend) {
        const out = opts.outFile || opts.out;
        if (out) {
          if (!host.fileExists(out)) {
            createDiagnosticForReference(parentFile, index, qd.Output_file_0_from_project_1_does_not_exist, out, ref.path);
          }
        } else {
          createDiagnosticForReference(parentFile, index, qd.Cannot_prepend_project_0_because_it_does_not_have_outFile_set, ref.path);
        }
      }
      if (!parent && buildInfoPath && buildInfoPath === getTsBuildInfoEmitOutputFilePath(opts)) {
        createDiagnosticForReference(parentFile, index, qd.Cannot_write_file_0_because_it_will_overwrite_tsbuildinfo_file_generated_by_referenced_project_1, buildInfoPath, ref.path);
        hasEmitBlockingqd.set(toPath(buildInfoPath), true);
      }
    });
  }
  function createDiagnosticForOptionPathKeyValue(key: string, valueIndex: number, message: qd.Message, arg0: string | number, arg1: string | number, arg2?: string | number) {
    let needCompilerDiagnostic = true;
    const pathsSyntax = getOptionPathsSyntax();
    for (const pathProp of pathsSyntax) {
      if (pathProp.initer.kind === Syntax.ObjectLiteralExpression) {
        for (const keyProps of qf.get.propertyAssignment(pathProp.initer, key)) {
          const initer = keyProps.initer;
          if (qf.is.arrayLiteralExpression(initer) && initer.elems.length > valueIndex) {
            programqd.add(qf.create.diagForNodeInSourceFile(opts.configFile!, initer.elems[valueIndex], message, arg0, arg1, arg2));
            needCompilerDiagnostic = false;
          }
        }
      }
    }
    if (needCompilerDiagnostic) {
      programqd.add(createCompilerDiagnostic(message, arg0, arg1, arg2));
    }
  }
  function createDiagnosticForOptionPaths(onKey: boolean, key: string, message: qd.Message, arg0: string | number) {
    let needCompilerDiagnostic = true;
    const pathsSyntax = getOptionPathsSyntax();
    for (const pathProp of pathsSyntax) {
      if (pathProp.initer.kind === Syntax.ObjectLiteralExpression && createOptionDiagnosticInObjectLiteralSyntax(pathProp.initer, onKey, key, undefined, message, arg0)) {
        needCompilerDiagnostic = false;
      }
    }
    if (needCompilerDiagnostic) {
      programqd.add(createCompilerDiagnostic(message, arg0));
    }
  }
  function getOptsSyntaxByName(name: string): object | undefined {
    const compilerOptsObjectLiteralSyntax = getCompilerOptsObjectLiteralSyntax();
    if (compilerOptsObjectLiteralSyntax) return qf.get.propertyAssignment(compilerOptsObjectLiteralSyntax, name);
    return;
  }
  function getOptionPathsSyntax(): qt.PropertyAssignment[] {
    return (getOptsSyntaxByName('paths') as qt.PropertyAssignment[]) || emptyArray;
  }
  function createDiagnosticForOptionName(message: qd.Message, option1: string, option2?: string, option3?: string) {
    createDiagnosticForOption(true, option1, option2, message, option1, option2, option3);
  }
  function createOptionValueDiagnostic(option1: string, message: qd.Message, arg0: string) {
    createDiagnosticForOption(undefined, message, arg0);
  }
  function createDiagnosticForReference(sourceFile: qt.JsonSourceFile | undefined, index: number, message: qd.Message, arg0?: string | number, arg1?: string | number) {
    const referencesSyntax = qf.find.defined(qf.get.tsConfigPropArray(sourceFile || opts.configFile, 'references'), (property) =>
      isArrayLiteralExpression(property.initer) ? property.initer : undefined
    );
    if (referencesSyntax && referencesSyntax.elems.length > index) {
      programqd.add(qf.create.diagForNodeInSourceFile(sourceFile || opts.configFile!, referencesSyntax.elems[index], message, arg0, arg1));
    } else {
      programqd.add(createCompilerDiagnostic(message, arg0, arg1));
    }
  }
  function createDiagnosticForOption(onKey: boolean, option1: string, option2: string | undefined, message: qd.Message, arg0: string | number, arg1?: string | number, arg2?: string | number) {
    const compilerOptsObjectLiteralSyntax = getCompilerOptsObjectLiteralSyntax();
    const needCompilerDiagnostic =
      !compilerOptsObjectLiteralSyntax || !createOptionDiagnosticInObjectLiteralSyntax(compilerOptsObjectLiteralSyntax, onKey, option1, option2, message, arg0, arg1, arg2);
    if (needCompilerDiagnostic) {
      programqd.add(createCompilerDiagnostic(message, arg0, arg1, arg2));
    }
  }
  function getCompilerOptsObjectLiteralSyntax() {
    if (_compilerOptsObjectLiteralSyntax === undefined) {
      _compilerOptsObjectLiteralSyntax = null;
      const jsonObjectLiteral = qf.get.tsConfigObjectLiteralExpression(opts.configFile);
      if (jsonObjectLiteral) {
        for (const prop of qf.get.propertyAssignment(jsonObjectLiteral, 'compilerOpts')) {
          if (prop.initer.kind === Syntax.ObjectLiteralExpression) {
            _compilerOptsObjectLiteralSyntax = prop.initer;
            break;
          }
        }
      }
    }
    return _compilerOptsObjectLiteralSyntax;
  }
  function createOptionDiagnosticInObjectLiteralSyntax(
    objectLiteral: qt.ObjectLiteralExpression,
    onKey: boolean,
    key1: string,
    key2: string | undefined,
    message: qd.Message,
    arg0: string | number,
    arg1?: string | number,
    arg2?: string | number
  ): boolean {
    const props = qf.get.propertyAssignment(objectLiteral, key1, key2);
    for (const prop of props) {
      programqd.add(qf.create.diagForNodeInSourceFile(opts.configFile!, onKey ? prop.name : prop.initer, message, arg0, arg1, arg2));
    }
    return !!props.length;
  }
  function blockEmittingOfFile(emitFileName: string, diag: Diagnostic) {
    hasEmitBlockingqd.set(toPath(emitFileName), true);
    programqd.add(diag);
  }
  function isEmittedFile(file: string): boolean {
    if (opts.noEmit) return false;
    const filePath = toPath(file);
    if (getSourceFileByPath(filePath)) return false;
    const out = opts.outFile || opts.out;
    if (out) return isSameFile(filePath, out) || isSameFile(filePath, removeFileExtension(out) + Extension.Dts);
    if (opts.declarationDir && containsPath(opts.declarationDir, filePath, currentDirectory, !host.useCaseSensitiveFileNames())) return true;
    if (opts.outDir) return containsPath(opts.outDir, filePath, currentDirectory, !host.useCaseSensitiveFileNames());
    if (fileExtensionIsOneOf(filePath, supportedJSExtensions) || fileExtensionIs(filePath, Extension.Dts)) {
      const filePathWithoutExtension = removeFileExtension(filePath);
      return !!getSourceFileByPath((filePathWithoutExtension + Extension.Ts) as qt.Path) || !!getSourceFileByPath((filePathWithoutExtension + Extension.Tsx) as qt.Path);
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
  realPath: qt.Path;
}
interface HostForUseSourceOfProjectReferenceRedirect {
  compilerHost: qt.CompilerHost;
  useSourceOfProjectReferenceRedirect: boolean;
  toPath(fileName: string): qt.Path;
  getResolvedProjectReferences(): readonly (ResolvedProjectReference | undefined)[] | undefined;
  getSourceOfProjectReferenceRedirect(fileName: string): qt.SourceOfProjectReferenceRedirect | undefined;
  forEachResolvedProjectReference<T>(cb: (resolvedProjectReference: qt.ResolvedProjectReference | undefined, resolvedProjectReferencePath: qt.Path) => T | undefined): T | undefined;
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
        mapOfDeclarationDirectories = qu.createMap();
        host.forEachResolvedProjectReference((ref) => {
          if (!ref) return;
          const out = ref.commandLine.opts.outFile || ref.commandLine.opts.out;
          if (out) {
            mapOfDeclarationDirectories!.set(getDirectoryPath(host.toPath(out)), true);
          } else {
            const declarationDir = ref.commandLine.opts.declarationDir || ref.commandLine.opts.outDir;
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
    return source !== undefined ? (qf.is.string(source) ? originalFileExists.call(host.compilerHost, source) : true) : undefined;
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
    if (!originalRealpath || !qu.stringContains(directory, nodeModulesPathPart)) return;
    if (!symlinkedDirectories) symlinkedDirectories = qu.createMap();
    const directoryPath = ensureTrailingDirectorySeparator(host.toPath(directory));
    if (symlinkedDirectories.has(directoryPath)) return;
    const real = normalizePath(originalRealpath.call(host.compilerHost, directory));
    let realPath: qt.Path;
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
    if (!qu.stringContains(fileOrDirectoryPath, nodeModulesPathPart)) return false;
    if (isFile && symlinkedFiles && symlinkedFiles.has(fileOrDirectoryPath)) return true;
    return (
      qf.find.definedIterator(symlinkedDirectories.entries(), ([directoryPath, symlinkedDirectory]) => {
        if (!symlinkedDirectory || !startsWith(fileOrDirectoryPath, directoryPath)) return;
        const result = fileOrDirectoryExistsUsingSource(fileOrDirectoryPath.replace(directoryPath, symlinkedDirectory.realPath));
        if (isFile && result) {
          if (!symlinkedFiles) symlinkedFiles = qu.createMap();
          const absolutePath = getNormalizedAbsolutePath(fileOrDirectory, host.compilerHost.getCurrentDirectory());
          symlinkedFiles.set(fileOrDirectoryPath, `${symlinkedDirectory.real}${absolutePath.replace(new RegExp(directoryPath, 'i'), '')}`);
        }
        return result;
      }) || false
    );
  }
}
export function handleNoEmitOpts(program: ProgramToEmitFilesAndReportErrors, sourceFile: qt.SourceFile | undefined, cancellationToken: qt.CancellationToken | undefined): qt.EmitResult | undefined {
  const opts = program.getCompilerOpts();
  if (opts.noEmit) return { diagnostics: emptyArray, sourceMaps: undefined, emittedFiles: undefined, emitSkipped: true };
  if (!opts.noEmitOnError) return;
  let diagnostics: readonly Diagnostic[] = [
    ...program.getOptsDiagnostics(cancellationToken),
    ...program.getSyntacticDiagnostics(sourceFile, cancellationToken),
    ...program.getGlobalDiagnostics(cancellationToken),
    ...program.getSemanticDiagnostics(sourceFile, cancellationToken),
  ];
  if (diagnostics.length === 0 && getEmitDeclarations(program.getCompilerOpts())) {
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
      qf.assert.defined(directoryStructureHost.readDirectory, "'CompilerHost.readDirectory' must be implemented to correctly process 'projectReferences'");
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
  projectReferences: readonly qt.ProjectReference[] | undefined,
  getCommandLine: (ref: qt.ProjectReference, index: number) => qt.ParsedCommandLine | undefined,
  readFile: (path: string) => string | undefined
) {
  if (!projectReferences) return emptyArray;
  let nodes: qt.InputFiles[] | undefined;
  for (let i = 0; i < projectReferences.length; i++) {
    const ref = projectReferences[i];
    const resolvedRefOpts = getCommandLine(ref, i);
    if (ref.prepend && resolvedRefOpts && resolvedRefOpts.opts) {
      const out = resolvedRefOpts.opts.outFile || resolvedRefOpts.opts.out;
      if (!out) continue;
      const { jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath } = getOutputPathsForBundle(resolvedRefOpts.opts, true);
      const node = new qc.InputFiles(readFile, jsFilePath!, sourceMapFilePath, declarationFilePath!, declarationMapPath, buildInfoPath);
      (nodes || (nodes = [])).push(node);
    }
  }
  return nodes || emptyArray;
}
export function resolveProjectReferencePath(ref: qt.ProjectReference): qt.ResolvedConfigFileName;
export function resolveProjectReferencePath(host: ResolveProjectReferencePathHost, ref: qt.ProjectReference): qt.ResolvedConfigFileName;
export function resolveProjectReferencePath(hostOrRef: ResolveProjectReferencePathHost | qt.ProjectReference, ref?: qt.ProjectReference): qt.ResolvedConfigFileName {
  const passedInRef = ref ? ref : (hostOrRef as qt.ProjectReference);
  return resolveConfigFileProjectName(passedInRef.path);
}
export function getResolutionDiagnostic(opts: qt.CompilerOpts, { extension }: qt.ResolvedModuleFull): qd.Message | undefined {
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
    return opts.jsx ? undefined : qd.Module_0_was_resolved_to_1_but_jsx_is_not_set;
  }
  function needAllowJs() {
    return opts.allowJs || !getStrictOptionValue(opts, 'noImplicitAny') ? undefined : qd.Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type;
  }
  function needResolveJsonModule() {
    return opts.resolveJsonModule ? undefined : qd.Module_0_was_resolved_to_1_but_resolveJsonModule_is_not_used;
  }
}
function getModuleNames({ imports, moduleAugmentations }: qt.SourceFile): string[] {
  const res = imports.map((i) => i.text);
  for (const aug of moduleAugmentations) {
    if (aug.kind === Syntax.StringLiteral) {
      res.push(aug.text);
    }
  }
  return res;
}
export function projectReferenceIsEqualTo(oldRef: qt.ProjectReference, newRef: qt.ProjectReference) {
  return oldRef.path === newRef.path && !oldRef.prepend === !newRef.prepend && !oldRef.circular === !newRef.circular;
}
export function moduleResolutionIsEqualTo(oldResolution: qt.ResolvedModuleFull, newResolution: qt.ResolvedModuleFull): boolean {
  function packageIdIsEqual(a: qt.PackageId | undefined, b: qt.PackageId | undefined): boolean {
    return a === b || (!!a && !!b && a.name === b.name && a.subModuleName === b.subModuleName && a.version === b.version);
  }
  return (
    oldResolution.isExternalLibraryImport === newResolution.isExternalLibraryImport &&
    oldResolution.extension === newResolution.extension &&
    oldResolution.resolvedFileName === newResolution.resolvedFileName &&
    oldResolution.originalPath === newResolution.originalPath &&
    packageIdIsEqual(oldResolution.packageId, newResolution.packageId)
  );
}
export function packageIdToString({ name, subModuleName, version }: qt.PackageId): string {
  const fullName = subModuleName ? `${name}/${subModuleName}` : name;
  return `${fullName}@${version}`;
}
export function typeDirectiveIsEqualTo(oldResolution: qt.ResolvedTypeReferenceDirective, newResolution: qt.ResolvedTypeReferenceDirective): boolean {
  return oldResolution.resolvedFileName === newResolution.resolvedFileName && oldResolution.primary === newResolution.primary;
}
