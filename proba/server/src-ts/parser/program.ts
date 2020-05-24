/* eslint-disable @typescript-eslint/unbound-method */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { Extra } from './parser-options';
import { firstDefined } from './utils';

interface DirectoryStructureHost {
  readDirectory?(
    path: string,
    extensions?: ReadonlyArray<string>,
    exclude?: ReadonlyArray<string>,
    include?: ReadonlyArray<string>,
    depth?: number
  ): string[];
}

interface CachedDirectoryStructureHost extends DirectoryStructureHost {
  readDirectory(
    path: string,
    extensions?: ReadonlyArray<string>,
    exclude?: ReadonlyArray<string>,
    include?: ReadonlyArray<string>,
    depth?: number
  ): string[];
}

interface WatchCompilerHostOfConfigFile<T extends ts.BuilderProgram>
  extends ts.WatchCompilerHostOfConfigFile<T> {
  onCachedDirectoryStructureHostCreate(_: CachedDirectoryStructureHost): void;
  extraFileExtensions?: readonly ts.FileExtensionInfo[];
}

const knownWatchProgramMap = new Map<
  CanonicalPath,
  ts.WatchOfConfigFile<ts.BuilderProgram>
>();

const fileWatchCallbackTrackingMap = new Map<
  CanonicalPath,
  Set<ts.FileWatcherCallback>
>();
const folderWatchCallbackTrackingMap = new Map<
  CanonicalPath,
  Set<ts.FileWatcherCallback>
>();

const programFileListCache = new Map<CanonicalPath, Set<CanonicalPath>>();

const tsconfigLastModifiedTimestampCache = new Map<CanonicalPath, number>();

const parsedFilesSeenHash = new Map<CanonicalPath, string>();

export function clearCaches() {
  knownWatchProgramMap.clear();
  fileWatchCallbackTrackingMap.clear();
  folderWatchCallbackTrackingMap.clear();
  parsedFilesSeenHash.clear();
  programFileListCache.clear();
  tsconfigLastModifiedTimestampCache.clear();
}

function saveWatchCallback(trackingMap: Map<string, Set<ts.FileWatcherCallback>>) {
  return (fileName: string, callback: ts.FileWatcherCallback): ts.FileWatcher => {
    const normalizedFileName = getCanonicalFileName(fileName);
    const watchers = ((): Set<ts.FileWatcherCallback> => {
      let watchers = trackingMap.get(normalizedFileName);
      if (!watchers) {
        watchers = new Set();
        trackingMap.set(normalizedFileName, watchers);
      }
      return watchers;
    })();
    watchers.add(callback);
    return {
      close: (): void => {
        watchers.delete(callback);
      },
    };
  };
}

const currentLintOperationState: { code: string; filePath: CanonicalPath } = {
  code: '',
  filePath: '' as CanonicalPath,
};

function diagnosticReporter(d: ts.Diagnostic) {
  throw new Error(ts.flattenDiagnosticMessageText(d.messageText, ts.sys.newLine));
}

function createHash(content: string): string {
  if (ts.sys && ts.sys.createHash) return ts.sys.createHash(content);
  return content;
}

export function getProgramsForProjects(
  code: string,
  filePathIn: string,
  extra: Extra
): ts.Program[] {
  const filePath = getCanonicalFileName(filePathIn);
  const results = [];
  currentLintOperationState.code = code;
  currentLintOperationState.filePath = filePath;
  const fileWatchCallbacks = fileWatchCallbackTrackingMap.get(filePath);
  const codeHash = createHash(code);
  if (
    parsedFilesSeenHash.get(filePath) !== codeHash &&
    fileWatchCallbacks &&
    fileWatchCallbacks.size > 0
  ) {
    fileWatchCallbacks.forEach((cb) => cb(filePath, ts.FileWatcherEventKind.Changed));
  }
  for (const rawTsconfigPath of extra.projects) {
    const tsconfigPath = getTsconfigPath(rawTsconfigPath, extra);
    const existingWatch = knownWatchProgramMap.get(tsconfigPath);
    if (!existingWatch) continue;
    let fileList = programFileListCache.get(tsconfigPath);
    let updatedProgram: ts.Program | null = null;
    if (!fileList) {
      updatedProgram = existingWatch.getProgram().getProgram();
      fileList = new Set(
        updatedProgram.getRootFileNames().map((f) => getCanonicalFileName(f))
      );
      programFileListCache.set(tsconfigPath, fileList);
    }
    if (fileList.has(filePath)) {
      updatedProgram = updatedProgram ?? existingWatch.getProgram().getProgram();
      updatedProgram.getTypeChecker();
      return [updatedProgram];
    }
  }
  for (const rawTsconfigPath of extra.projects) {
    const tsconfigPath = getTsconfigPath(rawTsconfigPath, extra);
    const existingWatch = knownWatchProgramMap.get(tsconfigPath);
    if (existingWatch) {
      const updatedProgram = maybeInvalidateProgram(
        existingWatch,
        filePath,
        tsconfigPath
      );
      if (!updatedProgram) continue;
      updatedProgram.getTypeChecker();
      results.push(updatedProgram);
      continue;
    }
    const programWatch = createWatchProgram(tsconfigPath, extra);
    const program = programWatch.getProgram().getProgram();
    knownWatchProgramMap.set(tsconfigPath, programWatch);
    program.getTypeChecker();
    results.push(program);
  }
  return results;
}

export function createWatchProgram(
  tsconfigPath: string,
  extra: Extra
): ts.WatchOfConfigFile<ts.BuilderProgram> {
  const watchCompilerHost = ts.createWatchCompilerHost(
    tsconfigPath,
    createDefaultCompilerOptionsFromExtra(extra),
    ts.sys,
    ts.createAbstractBuilder,
    diagnosticReporter,
    /*reportWatchStatus*/ () => {}
  ) as WatchCompilerHostOfConfigFile<ts.BuilderProgram>;
  const oldReadFile = watchCompilerHost.readFile;
  watchCompilerHost.readFile = (filePathIn, encoding): string | undefined => {
    const filePath = getCanonicalFileName(filePathIn);
    const fileContent =
      filePath === currentLintOperationState.filePath
        ? currentLintOperationState.code
        : oldReadFile(filePath, encoding);
    if (fileContent !== undefined) {
      parsedFilesSeenHash.set(filePath, createHash(fileContent));
    }
    return fileContent;
  };
  watchCompilerHost.onUnRecoverableConfigFileDiagnostic = diagnosticReporter;
  watchCompilerHost.afterProgramCreate = (program): void => {
    const configFileDiagnostics = program
      .getConfigFileParsingDiagnostics()
      .filter(
        (diag) => diag.category === ts.DiagnosticCategory.Error && diag.code !== 18003
      );
    if (configFileDiagnostics.length > 0) diagnosticReporter(configFileDiagnostics[0]);
  };
  watchCompilerHost.watchFile = saveWatchCallback(fileWatchCallbackTrackingMap);
  watchCompilerHost.watchDirectory = saveWatchCallback(folderWatchCallbackTrackingMap);
  const oldOnDirectoryStructureHostCreate =
    watchCompilerHost.onCachedDirectoryStructureHostCreate;
  watchCompilerHost.onCachedDirectoryStructureHostCreate = (host): void => {
    const oldReadDirectory = host.readDirectory;
    host.readDirectory = (path, extensions, exclude, include, depth): string[] =>
      oldReadDirectory(
        path,
        !extensions ? undefined : extensions.concat(extra.extraFileExtensions),
        exclude,
        include,
        depth
      );
    oldOnDirectoryStructureHostCreate(host);
  };
  watchCompilerHost.extraFileExtensions = extra.extraFileExtensions.map((extension) => ({
    extension,
    isMixedContent: true,
    scriptKind: ts.ScriptKind.Deferred,
  }));
  watchCompilerHost.trace = log;
  watchCompilerHost.setTimeout = undefined;
  watchCompilerHost.clearTimeout = undefined;
  const watch = ts.createWatchProgram(watchCompilerHost);
  return watch;
}

function hasTSConfigChanged(tsconfigPath: CanonicalPath): boolean {
  const stat = fs.statSync(tsconfigPath);
  const lastModifiedAt = stat.mtimeMs;
  const cachedLastModifiedAt = tsconfigLastModifiedTimestampCache.get(tsconfigPath);
  tsconfigLastModifiedTimestampCache.set(tsconfigPath, lastModifiedAt);
  if (cachedLastModifiedAt === undefined) return false;
  return Math.abs(cachedLastModifiedAt - lastModifiedAt) > Number.EPSILON;
}

function maybeInvalidateProgram(
  existingWatch: ts.WatchOfConfigFile<ts.BuilderProgram>,
  filePath: CanonicalPath,
  tsconfigPath: CanonicalPath
): ts.Program | null {
  let updatedProgram = existingWatch.getProgram().getProgram();
  if (process.env.TSESTREE_NO_INVALIDATION === 'true') return updatedProgram;
  if (hasTSConfigChanged(tsconfigPath)) {
    fileWatchCallbackTrackingMap
      .get(tsconfigPath)!
      .forEach((cb) => cb(tsconfigPath, ts.FileWatcherEventKind.Changed));
    programFileListCache.delete(tsconfigPath);
  }
  let sourceFile = updatedProgram.getSourceFile(filePath);
  if (sourceFile) return updatedProgram;
  const currentDir = canonicalDirname(filePath);
  let current: CanonicalPath | null = null;
  let next = currentDir;
  let hasCallback = false;
  while (current !== next) {
    current = next;
    const folderWatchCallbacks = folderWatchCallbackTrackingMap.get(current);
    if (folderWatchCallbacks) {
      folderWatchCallbacks.forEach((cb) => {
        if (currentDir !== current) cb(currentDir, ts.FileWatcherEventKind.Changed);
        cb(current!, ts.FileWatcherEventKind.Changed);
      });
      hasCallback = true;
    }
    next = canonicalDirname(current);
  }
  if (!hasCallback) return null;
  programFileListCache.delete(tsconfigPath);
  updatedProgram = existingWatch.getProgram().getProgram();
  sourceFile = updatedProgram.getSourceFile(filePath);
  if (sourceFile) return updatedProgram;
  const rootFilenames = updatedProgram.getRootFileNames();
  const deletedFile = rootFilenames.find((file) => !fs.existsSync(file));
  if (!deletedFile) return null;
  const fileWatchCallbacks = fileWatchCallbackTrackingMap.get(
    getCanonicalFileName(deletedFile)
  );
  if (!fileWatchCallbacks) return updatedProgram;
  fileWatchCallbacks.forEach((cb) => cb(deletedFile, ts.FileWatcherEventKind.Deleted));
  programFileListCache.delete(tsconfigPath);
  updatedProgram = existingWatch.getProgram().getProgram();
  sourceFile = updatedProgram.getSourceFile(filePath);
  if (sourceFile) return updatedProgram;
  return null;
}

export function createSourceFile(code: string, extra: Extra): ts.SourceFile {
  return ts.createSourceFile(
    extra.filePath,
    code,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    getScriptKind(extra)
  );
}

const DEFAULT_EXTRA_FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function getExtension(fileName: string | undefined): string | null {
  if (!fileName) return null;
  return fileName.endsWith('.d.ts') ? '.d.ts' : path.extname(fileName);
}

export function createProjectProgram(
  code: string,
  createDefaultProgram: boolean,
  extra: Extra
): ASTAndProgram | undefined {
  const astAndProgram = firstDefined(
    getProgramsForProjects(code, extra.filePath, extra),
    (currentProgram) => {
      const ast = currentProgram.getSourceFile(extra.filePath);
      const expectedExt = getExtension(extra.filePath);
      const returnedExt = getExtension(ast?.fileName);
      if (expectedExt !== returnedExt) return;

      return ast && { ast, program: currentProgram };
    }
  );
  if (!astAndProgram && !createDefaultProgram) {
    const errorLines = [
      '"parserOptions.project" has been set for @typescript-eslint/parser.',
      `The file does not match your project config: ${path.relative(
        extra.tsconfigRootDir || process.cwd(),
        extra.filePath
      )}.`,
    ];
    let hasMatchedAnError = false;
    const extraFileExtensions = extra.extraFileExtensions || [];
    extraFileExtensions.forEach((extraExtension) => {
      if (!extraExtension.startsWith('.')) {
        errorLines.push(
          `Found unexpected extension "${extraExtension}" specified with the "extraFileExtensions" option. Did you mean ".${extraExtension}"?`
        );
      }
      if (DEFAULT_EXTRA_FILE_EXTENSIONS.includes(extraExtension)) {
        errorLines.push(
          `You unnecessarily included the extension "${extraExtension}" with the "extraFileExtensions" option. This extension is already handled by the parser by default.`
        );
      }
    });
    const fileExtension = path.extname(extra.filePath);
    if (!DEFAULT_EXTRA_FILE_EXTENSIONS.includes(fileExtension)) {
      const nonStandardExt = `The extension for the file (${fileExtension}) is non-standard`;
      if (extraFileExtensions.length > 0) {
        if (!extraFileExtensions.includes(fileExtension)) {
          errorLines.push(
            `${nonStandardExt}. It should be added to your existing "parserOptions.extraFileExtensions".`
          );
          hasMatchedAnError = true;
        }
      } else {
        errorLines.push(
          `${nonStandardExt}. You should add "parserOptions.extraFileExtensions" to your config.`
        );
        hasMatchedAnError = true;
      }
    }
    if (!hasMatchedAnError) {
      errorLines.push(
        'The file must be included in at least one of the projects provided.'
      );
    }
    throw new Error(errorLines.join('\n'));
  }
  return astAndProgram;
}

export function createDefaultProgram(
  code: string,
  extra: Extra
): ASTAndProgram | undefined {
  if (!extra.projects || extra.projects.length !== 1) return;
  const tsconfigPath = getTsconfigPath(extra.projects[0], extra);
  const commandLine = ts.getParsedCommandLineOfConfigFile(
    tsconfigPath,
    createDefaultCompilerOptionsFromExtra(extra),
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
  );
  if (!commandLine) return;
  const compilerHost = ts.createCompilerHost(
    commandLine.options,
    /* setParentNodes */ true
  );
  const oldReadFile = compilerHost.readFile;
  compilerHost.readFile = (fileName: string): string | undefined =>
    path.normalize(fileName) === path.normalize(extra.filePath)
      ? code
      : oldReadFile(fileName);
  const program = ts.createProgram([extra.filePath], commandLine.options, compilerHost);
  const ast = program.getSourceFile(extra.filePath);
  return ast && { ast, program };
}

export function createIsolatedProgram(code: string, extra: Extra): ASTAndProgram {
  const compilerHost: ts.CompilerHost = {
    fileExists() {
      return true;
    },
    getCanonicalFileName() {
      return extra.filePath;
    },
    getCurrentDirectory() {
      return '';
    },
    getDirectories() {
      return [];
    },
    getDefaultLibFileName() {
      return 'lib.d.ts';
    },
    getNewLine() {
      return '\n';
    },
    getSourceFile(filename: string) {
      return ts.createSourceFile(
        filename,
        code,
        ts.ScriptTarget.Latest,
        /* setParentNodes */ true,
        getScriptKind(extra, filename)
      );
    },
    readFile() {
      return undefined;
    },
    useCaseSensitiveFileNames() {
      return true;
    },
    writeFile() {
      return null;
    },
  };
  const program = ts.createProgram(
    [extra.filePath],
    {
      noResolve: true,
      target: ts.ScriptTarget.Latest,
      jsx: extra.jsx ? ts.JsxEmit.Preserve : undefined,
      ...createDefaultCompilerOptionsFromExtra(extra),
    },
    compilerHost
  );
  const ast = program.getSourceFile(extra.filePath);
  if (!ast) {
    throw new Error(
      'Expected an ast to be returned for the single-file isolated program.'
    );
  }
  return { ast, program };
}

interface ASTAndProgram {
  ast: ts.SourceFile;
  program: ts.Program;
}

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  allowNonTsExtensions: true,
  allowJs: true,
  checkJs: true,
  noEmit: true,
  // extendedDiagnostics: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
};

function createDefaultCompilerOptionsFromExtra(extra: Extra): ts.CompilerOptions {
  if (extra.debugLevel.has('typescript')) {
    return {
      ...DEFAULT_COMPILER_OPTIONS,
      extendedDiagnostics: true,
    };
  }
  return DEFAULT_COMPILER_OPTIONS;
}

type CanonicalPath = string & { __brand: unknown };

const useCaseSensitiveFileNames =
  ts.sys !== undefined ? ts.sys.useCaseSensitiveFileNames : true;
const correctPathCasing = useCaseSensitiveFileNames
  ? (filePath: string): string => filePath
  : (filePath: string): string => filePath.toLowerCase();

function getCanonicalFileName(filePath: string): CanonicalPath {
  let normalized = path.normalize(filePath);
  if (normalized.endsWith(path.sep)) {
    normalized = normalized.substr(0, normalized.length - 1);
  }
  return correctPathCasing(normalized) as CanonicalPath;
}

function ensureAbsolutePath(p: string, extra: Extra): string {
  return path.isAbsolute(p) ? p : path.join(extra.tsconfigRootDir || process.cwd(), p);
}

function getTsconfigPath(tsconfigPath: string, extra: Extra): CanonicalPath {
  return getCanonicalFileName(ensureAbsolutePath(tsconfigPath, extra));
}

function canonicalDirname(p: CanonicalPath): CanonicalPath {
  return path.dirname(p) as CanonicalPath;
}

function getScriptKind(extra: Extra, filePath: string = extra.filePath): ts.ScriptKind {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.ts':
      return ts.ScriptKind.TS;
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.js':
      return ts.ScriptKind.JS;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.json':
      return ts.ScriptKind.JSON;
    default:
      return extra.jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  }
}
