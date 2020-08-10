import * as qu from './util';
import { Node } from './type';
import * as qt from './type';
import { Syntax } from './syntax';
import * as qy from './syntax';
export interface ReadBuildProgramHost {
  useCaseSensitiveFileNames(): boolean;
  getCurrentDirectory(): string;
  readFile(fileName: string): string | undefined;
}
export function readBuilderProgram(compilerOpts: CompilerOpts, host: ReadBuildProgramHost) {
  if (compilerOpts.out || compilerOpts.outFile) return;
  const buildInfoPath = getTsBuildInfoEmitOutputFilePath(compilerOpts);
  if (!buildInfoPath) return;
  const content = host.readFile(buildInfoPath);
  if (!content) return;
  const buildInfo = getBuildInfo(content);
  if (buildInfo.version !== version) return;
  if (!buildInfo.program) return;
  return createBuildProgramUsingProgramBuildInfo(buildInfo.program, buildInfoPath, host);
}
export function createIncrementalCompilerHost(opts: CompilerOpts, system = sys): CompilerHost {
  const host = createCompilerHostWorker(opts, undefined, system);
  host.createHash = maybeBind(system, system.createHash);
  setGetSourceFileAsHashVersioned(host, system);
  changeCompilerHostLikeToUseCache(host, (fileName) => toPath(fileName, host.getCurrentDirectory(), host.getCanonicalFileName));
  return host;
}
export interface IncrementalProgramOpts<T extends BuilderProgram> {
  rootNames: readonly string[];
  opts: CompilerOpts;
  configFileParsingDiagnostics?: readonly Diagnostic[];
  projectReferences?: readonly ProjectReference[];
  host?: CompilerHost;
  createProgram?: CreateProgram<T>;
}
export function createIncrementalProgram<T extends BuilderProgram = EmitAndSemanticDiagnosticsBuilderProgram>({
  rootNames,
  opts,
  configFileParsingDiagnostics,
  projectReferences,
  host,
  createProgram,
}: IncrementalProgramOpts<T>): T {
  host = host || createIncrementalCompilerHost(opts);
  createProgram = createProgram || ((createEmitAndSemanticDiagnosticsBuilderProgram as any) as CreateProgram<T>);
  const oldProgram = (readBuilderProgram(opts, host) as any) as T;
  return createProgram(rootNames, opts, host, oldProgram, configFileParsingDiagnostics, projectReferences);
}
export type WatchStatusReporter = (diagnostic: Diagnostic, newLine: string, opts: CompilerOpts, errorCount?: number) => void;
export type CreateProgram<T extends BuilderProgram> = (
  rootNames: readonly string[] | undefined,
  opts: CompilerOpts | undefined,
  host?: CompilerHost,
  oldProgram?: T,
  configFileParsingDiagnostics?: readonly Diagnostic[],
  projectReferences?: readonly ProjectReference[] | undefined
) => T;
export interface WatchHost {
  onWatchStatusChange?(diagnostic: Diagnostic, newLine: string, opts: CompilerOpts, errorCount?: number): void;
  watchFile(path: string, callback: FileWatcherCallback, pollingInterval?: number, opts?: CompilerOpts): FileWatcher;
  watchDirectory(path: string, callback: DirectoryWatcherCallback, recursive?: boolean, opts?: CompilerOpts): FileWatcher;
  setTimeout?(callback: (...args: any[]) => void, ms: number, ...args: any[]): any;
  clearTimeout?(timeoutId: any): void;
}
export interface ProgramHost<T extends BuilderProgram> {
  createProgram: CreateProgram<T>;
  useCaseSensitiveFileNames(): boolean;
  getNewLine(): string;
  getCurrentDirectory(): string;
  qc.get.defaultLibFileName(opts: CompilerOpts): string;
  getDefaultLibLocation?(): string;
  createHash?(data: string): string;
  fileExists(path: string): boolean;
  readFile(path: string, encoding?: string): string | undefined;
  directoryExists?(path: string): boolean;
  getDirectories?(path: string): string[];
  readDirectory?(path: string, extensions?: readonly string[], exclude?: readonly string[], include?: readonly string[], depth?: number): string[];
  realpath?(path: string): string;
  trace?(s: string): void;
  getEnvironmentVariable?(name: string): string | undefined;
  resolveModuleNames?(
    moduleNames: string[],
    containingFile: string,
    reusedNames: string[] | undefined,
    redirectedReference: ResolvedProjectReference | undefined,
    opts: CompilerOpts
  ): (ResolvedModule | undefined)[];
  resolveTypeReferenceDirectives?(
    typeReferenceDirectiveNames: string[],
    containingFile: string,
    redirectedReference: ResolvedProjectReference | undefined,
    opts: CompilerOpts
  ): (ResolvedTypeReferenceDirective | undefined)[];
}
export interface ProgramHost<T extends BuilderProgram> {
  createDirectory?(path: string): void;
  writeFile?(path: string, data: string, writeByteOrderMark?: boolean): void;
}
export interface WatchCompilerHost<T extends BuilderProgram> extends ProgramHost<T>, WatchHost {
  useSourceOfProjectReferenceRedirect?(): boolean;
  afterProgramCreate?(program: T): void;
}
export interface WatchCompilerHostOfFilesAndCompilerOpts<T extends BuilderProgram> extends WatchCompilerHost<T> {
  rootFiles: string[];
  opts: CompilerOpts;
  watchOpts?: WatchOpts;
  projectReferences?: readonly ProjectReference[];
}
export interface WatchCompilerHostOfConfigFile<T extends BuilderProgram> extends WatchCompilerHost<T>, ConfigFileDiagnosticsReporter {
  configFileName: string;
  optsToExtend?: CompilerOpts;
  watchOptsToExtend?: WatchOpts;
  extraFileExtensions?: readonly FileExtensionInfo[];
  readDirectory(path: string, extensions?: readonly string[], exclude?: readonly string[], include?: readonly string[], depth?: number): string[];
}
export interface WatchCompilerHostOfConfigFile<T extends BuilderProgram> extends WatchCompilerHost<T> {
  configFileParsingResult?: ParsedCommandLine;
}
export interface Watch<T> {
  getProgram(): T;
  getCurrentProgram(): T;
  close(): void;
}
export interface WatchOfConfigFile<T> extends Watch<T> {}
export interface WatchOfFilesAndCompilerOpts<T> extends Watch<T> {
  updateRootFileNames(fileNames: string[]): void;
}
export function createWatchCompilerHost<T extends BuilderProgram>(
  configFileName: string,
  optsToExtend: CompilerOpts | undefined,
  system: System,
  createProgram?: CreateProgram<T>,
  reportDiagnostic?: DiagnosticReporter,
  reportWatchStatus?: WatchStatusReporter,
  watchOptsToExtend?: WatchOpts,
  extraFileExtensions?: readonly FileExtensionInfo[]
): WatchCompilerHostOfConfigFile<T>;
export function createWatchCompilerHost<T extends BuilderProgram>(
  rootFiles: string[],
  opts: CompilerOpts,
  system: System,
  createProgram?: CreateProgram<T>,
  reportDiagnostic?: DiagnosticReporter,
  reportWatchStatus?: WatchStatusReporter,
  projectReferences?: readonly ProjectReference[],
  watchOpts?: WatchOpts
): WatchCompilerHostOfFilesAndCompilerOpts<T>;
export function createWatchCompilerHost<T extends BuilderProgram>(
  rootFilesOrConfigFileName: string | string[],
  opts: CompilerOpts | undefined,
  system: System,
  createProgram?: CreateProgram<T>,
  reportDiagnostic?: DiagnosticReporter,
  reportWatchStatus?: WatchStatusReporter,
  projectReferencesOrWatchOptsToExtend?: readonly ProjectReference[] | WatchOpts,
  watchOptsOrExtraFileExtensions?: WatchOpts | readonly FileExtensionInfo[]
): WatchCompilerHostOfFilesAndCompilerOpts<T> | WatchCompilerHostOfConfigFile<T> {
  if (isArray(rootFilesOrConfigFileName)) {
    return createWatchCompilerHostOfFilesAndCompilerOpts({
      rootFiles: rootFilesOrConfigFileName,
      opts: opts!,
      watchOpts: watchOptsOrExtraFileExtensions as WatchOpts,
      projectReferences: projectReferencesOrWatchOptsToExtend as readonly ProjectReference[],
      system,
      createProgram,
      reportDiagnostic,
      reportWatchStatus,
    });
  } else {
    return createWatchCompilerHostOfConfigFile({
      configFileName: rootFilesOrConfigFileName,
      optsToExtend: opts,
      watchOptsToExtend: projectReferencesOrWatchOptsToExtend as WatchOpts,
      extraFileExtensions: watchOptsOrExtraFileExtensions as readonly FileExtensionInfo[],
      system,
      createProgram,
      reportDiagnostic,
      reportWatchStatus,
    });
  }
}
const carriageReturnLineFeed = '\r\n';
const lineFeed = '\n';
export function getNewLineCharacter(opts: qt.CompilerOpts | qt.PrinterOpts, getNewLine?: () => string): string {
  switch (opts.newLine) {
    case qt.NewLineKind.CarriageReturnLineFeed:
      return carriageReturnLineFeed;
    case qt.NewLineKind.LineFeed:
      return lineFeed;
  }
  return getNewLine ? getNewLine() : sys ? sys.newLine : carriageReturnLineFeed;
}

export function createWatchProgram<T extends BuilderProgram>(host: WatchCompilerHostOfFilesAndCompilerOpts<T>): WatchOfFilesAndCompilerOpts<T>;
export function createWatchProgram<T extends BuilderProgram>(host: WatchCompilerHostOfConfigFile<T>): WatchOfConfigFile<T>;
export function createWatchProgram<T extends BuilderProgram>(
  host: WatchCompilerHostOfFilesAndCompilerOpts<T> & WatchCompilerHostOfConfigFile<T>
): WatchOfFilesAndCompilerOpts<T> | WatchOfConfigFile<T> {
  interface FilePresentOnHost {
    version: string;
    sourceFile: SourceFile;
    fileWatcher: FileWatcher;
  }
  type FileMissingOnHost = false;
  interface FilePresenceUnknownOnHost {
    version: false;
    fileWatcher?: FileWatcher;
  }
  type FileMayBePresentOnHost = FilePresentOnHost | FilePresenceUnknownOnHost;
  type HostFileInfo = FilePresentOnHost | FileMissingOnHost | FilePresenceUnknownOnHost;
  let builderProgram: T;
  let reloadLevel: ConfigFileProgramReloadLevel;
  let missingFilesMap: Map<FileWatcher>;
  let watchedWildcardDirectories: Map<WildcardDirectoryWatcher>;
  let timerToUpdateProgram: any;
  const sourceFilesCache = createMap<HostFileInfo>();
  let missingFilePathsRequestedForRelease: Path[] | undefined;
  let hasChangedCompilerOpts = false;
  let hasChangedAutomaticTypeDirectiveNames = false;
  const useCaseSensitiveFileNames = host.useCaseSensitiveFileNames();
  const currentDirectory = host.getCurrentDirectory();
  const { configFileName, optsToExtend: optsToExtendForConfigFile = {}, watchOptsToExtend, extraFileExtensions, createProgram } = host;
  let { rootFiles: rootFileNames, opts: compilerOpts, watchOpts, projectReferences } = host;
  let configFileSpecs: ConfigFileSpecs;
  let configFileParsingDiagnostics: Diagnostic[] | undefined;
  let canConfigFileJsonReportNoInputFiles = false;
  let hasChangedConfigFileParsingErrors = false;
  const cachedDirectoryStructureHost = configFileName === undefined ? undefined : createCachedDirectoryStructureHost(host, currentDirectory, useCaseSensitiveFileNames);
  const directoryStructureHost: DirectoryStructureHost = cachedDirectoryStructureHost || host;
  const parseConfigFileHost = parseConfigHostFromCompilerHostLike(host, directoryStructureHost);
  let newLine = updateNewLine();
  if (configFileName && host.configFileParsingResult) {
    setConfigFileParsingResult(host.configFileParsingResult);
    newLine = updateNewLine();
  }
  reportWatchDiagnostic(qd.Starting_compilation_in_watch_mode);
  if (configFileName && !host.configFileParsingResult) {
    newLine = getNewLineCharacter(optsToExtendForConfigFile, () => host.getNewLine());
    assert(!rootFileNames);
    parseConfigFile();
    newLine = updateNewLine();
  }
  const { watchFile, watchFilePath, watchDirectory, writeLog } = createWatchFactory<string>(host, compilerOpts);
  const getCanonicalFileName = createGetCanonicalFileName(useCaseSensitiveFileNames);
  writeLog(`Current directory: ${currentDirectory} CaseSensitiveFileNames: ${useCaseSensitiveFileNames}`);
  let configFileWatcher: FileWatcher | undefined;
  if (configFileName) {
    configFileWatcher = watchFile(host, configFileName, scheduleProgramReload, PollingInterval.High, watchOpts, WatchType.ConfigFile);
  }
  const compilerHost = createCompilerHostFromProgramHost(host, () => compilerOpts, directoryStructureHost) as CompilerHost & ResolutionCacheHost;
  setGetSourceFileAsHashVersioned(compilerHost, host);
  const getNewSourceFile = compilerHost.getSourceFile;
  compilerHost.getSourceFile = (fileName, ...args) => getVersionedSourceFileByPath(fileName, toPath(fileName), ...args);
  compilerHost.getSourceFileByPath = getVersionedSourceFileByPath;
  compilerHost.getNewLine = () => newLine;
  compilerHost.fileExists = fileExists;
  compilerHost.onReleaseOldSourceFile = onReleaseOldSourceFile;
  compilerHost.toPath = toPath;
  compilerHost.getCompilationSettings = () => compilerOpts;
  compilerHost.useSourceOfProjectReferenceRedirect = maybeBind(host, host.useSourceOfProjectReferenceRedirect);
  compilerHost.watchDirectoryOfFailedLookupLocation = (dir, cb, flags) => watchDirectory(host, dir, cb, flags, watchOpts, WatchType.FailedLookupLocations);
  compilerHost.watchTypeRootsDirectory = (dir, cb, flags) => watchDirectory(host, dir, cb, flags, watchOpts, WatchType.TypeRoots);
  compilerHost.getCachedDirectoryStructureHost = () => cachedDirectoryStructureHost;
  compilerHost.onInvalidatedResolution = scheduleProgramUpdate;
  compilerHost.onChangedAutomaticTypeDirectiveNames = () => {
    hasChangedAutomaticTypeDirectiveNames = true;
    scheduleProgramUpdate();
  };
  compilerHost.fileIsOpen = () => false;
  compilerHost.getCurrentProgram = getCurrentProgram;
  compilerHost.writeLog = writeLog;
  const resolutionCache = createResolutionCache(compilerHost, configFileName ? getDirectoryPath(getNormalizedAbsolutePath(configFileName, currentDirectory)) : currentDirectory, false);
  compilerHost.resolveModuleNames = host.resolveModuleNames
    ? (...args) => host.resolveModuleNames!(...args)
    : (moduleNames, containingFile, reusedNames, redirectedReference) => resolutionCache.resolveModuleNames(moduleNames, containingFile, reusedNames, redirectedReference);
  compilerHost.resolveTypeReferenceDirectives = host.resolveTypeReferenceDirectives
    ? (...args) => host.resolveTypeReferenceDirectives!(...args)
    : (typeDirectiveNames, containingFile, redirectedReference) => resolutionCache.resolveTypeReferenceDirectives(typeDirectiveNames, containingFile, redirectedReference);
  const userProvidedResolution = !!host.resolveModuleNames || !!host.resolveTypeReferenceDirectives;
  builderProgram = (readBuilderProgram(compilerOpts, compilerHost) as any) as T;
  synchronizeProgram();
  watchConfigFileWildCardDirectories();
  return configFileName
    ? { getCurrentProgram: getCurrentBuilderProgram, getProgram: updateProgram, close }
    : { getCurrentProgram: getCurrentBuilderProgram, getProgram: updateProgram, updateRootFileNames, close };
  function close() {
    resolutionCache.clear();
    clearMap(sourceFilesCache, (value) => {
      if (value && value.fileWatcher) {
        value.fileWatcher.close();
        value.fileWatcher = undefined;
      }
    });
    if (configFileWatcher) {
      configFileWatcher.close();
      configFileWatcher = undefined;
    }
    if (watchedWildcardDirectories) {
      clearMap(watchedWildcardDirectories, closeFileWatcherOf);
      watchedWildcardDirectories = undefined!;
    }
    if (missingFilesMap) {
      clearMap(missingFilesMap, closeFileWatcher);
      missingFilesMap = undefined!;
    }
  }
  function getCurrentBuilderProgram() {
    return builderProgram;
  }
  function getCurrentProgram() {
    return builderProgram && builderProgram.getProgramOrUndefined();
  }
  function synchronizeProgram() {
    writeLog(`Synchronizing program`);
    const program = getCurrentBuilderProgram();
    if (hasChangedCompilerOpts) {
      newLine = updateNewLine();
      if (program && changesAffectModuleResolution(program.getCompilerOpts(), compilerOpts)) {
        resolutionCache.clear();
      }
    }
    const hasInvalidatedResolution = resolutionCache.createHasInvalidatedResolution(userProvidedResolution);
    if (isProgramUptoDate(getCurrentProgram(), rootFileNames, compilerOpts, getSourceVersion, fileExists, hasInvalidatedResolution, hasChangedAutomaticTypeDirectiveNames, projectReferences)) {
      if (hasChangedConfigFileParsingErrors) {
        builderProgram = createProgram(undefined, compilerHost, builderProgram, configFileParsingDiagnostics, projectReferences);
        hasChangedConfigFileParsingErrors = false;
      }
    } else {
      createNewProgram(hasInvalidatedResolution);
    }
    if (host.afterProgramCreate && program !== builderProgram) {
      host.afterProgramCreate(builderProgram);
    }
    return builderProgram;
  }
  function createNewProgram(hasInvalidatedResolution: HasInvalidatedResolution) {
    writeLog('CreatingProgramWith::');
    writeLog(`  roots: ${JSON.stringify(rootFileNames)}`);
    writeLog(`  opts: ${JSON.stringify(compilerOpts)}`);
    const needsUpdateInTypeRootWatch = hasChangedCompilerOpts || !getCurrentProgram();
    hasChangedCompilerOpts = false;
    hasChangedConfigFileParsingErrors = false;
    resolutionCache.startCachingPerDirectoryResolution();
    compilerHost.hasInvalidatedResolution = hasInvalidatedResolution;
    compilerHost.hasChangedAutomaticTypeDirectiveNames = hasChangedAutomaticTypeDirectiveNames;
    hasChangedAutomaticTypeDirectiveNames = false;
    builderProgram = createProgram(rootFileNames, compilerOpts, compilerHost, builderProgram, configFileParsingDiagnostics, projectReferences);
    resolutionCache.finishCachingPerDirectoryResolution();
    updateMissingFilePathsWatch(builderProgram.getProgram(), missingFilesMap || (missingFilesMap = createMap()), watchMissingFilePath);
    if (needsUpdateInTypeRootWatch) {
      resolutionCache.updateTypeRootsWatch();
    }
    if (missingFilePathsRequestedForRelease) {
      for (const missingFilePath of missingFilePathsRequestedForRelease) {
        if (!missingFilesMap.has(missingFilePath)) {
          sourceFilesCache.delete(missingFilePath);
        }
      }
      missingFilePathsRequestedForRelease = undefined;
    }
  }
  function updateRootFileNames(files: string[]) {
    assert(!configFileName, 'Cannot update root file names with config file watch mode');
    rootFileNames = files;
    scheduleProgramUpdate();
  }
  function updateNewLine() {
    return getNewLineCharacter(compilerOpts || optsToExtendForConfigFile, () => host.getNewLine());
  }
  function toPath(fileName: string) {
    return qnr.toPath(fileName, currentDirectory, getCanonicalFileName);
  }
  function isFileMissingOnHost(hostSourceFile: HostFileInfo | undefined): hostSourceFile is FileMissingOnHost {
    return typeof hostSourceFile === 'boolean';
  }
  function isFilePresenceUnknownOnHost(hostSourceFile: FileMayBePresentOnHost): hostSourceFile is FilePresenceUnknownOnHost {
    return typeof (hostSourceFile as FilePresenceUnknownOnHost).version === 'boolean';
  }
  function fileExists(fileName: string) {
    const path = toPath(fileName);
    if (isFileMissingOnHost(sourceFilesCache.get(path))) return false;
    return directoryStructureHost.fileExists(fileName);
  }
  function getVersionedSourceFileByPath(fileName: string, path: Path, languageVersion: ScriptTarget, onError?: (message: string) => void, shouldCreateNewSourceFile?: boolean): SourceFile | undefined {
    const hostSourceFile = sourceFilesCache.get(path);
    if (isFileMissingOnHost(hostSourceFile)) {
      return;
    }
    if (hostSourceFile === undefined || shouldCreateNewSourceFile || isFilePresenceUnknownOnHost(hostSourceFile)) {
      const sourceFile = getNewSourceFile(fileName, languageVersion, onError);
      if (hostSourceFile) {
        if (sourceFile) {
          (hostSourceFile as FilePresentOnHost).sourceFile = sourceFile;
          hostSourceFile.version = sourceFile.version;
          if (!hostSourceFile.fileWatcher) {
            hostSourceFile.fileWatcher = watchFilePath(host, fileName, onSourceFileChange, PollingInterval.Low, watchOpts, path, WatchType.SourceFile);
          }
        } else {
          if (hostSourceFile.fileWatcher) {
            hostSourceFile.fileWatcher.close();
          }
          sourceFilesCache.set(path, false);
        }
      } else {
        if (sourceFile) {
          const fileWatcher = watchFilePath(host, fileName, onSourceFileChange, PollingInterval.Low, watchOpts, path, WatchType.SourceFile);
          sourceFilesCache.set(path, { sourceFile, version: sourceFile.version, fileWatcher });
        } else {
          sourceFilesCache.set(path, false);
        }
      }
      return sourceFile;
    }
    return hostSourceFile.sourceFile;
  }
  function nextSourceFileVersion(path: Path) {
    const hostSourceFile = sourceFilesCache.get(path);
    if (hostSourceFile !== undefined) {
      if (isFileMissingOnHost(hostSourceFile)) {
        sourceFilesCache.set(path, { version: false });
      } else {
        (hostSourceFile as FilePresenceUnknownOnHost).version = false;
      }
    }
  }
  function getSourceVersion(path: Path): string | undefined {
    const hostSourceFile = sourceFilesCache.get(path);
    return !hostSourceFile || !hostSourceFile.version ? undefined : hostSourceFile.version;
  }
  function onReleaseOldSourceFile(oldSourceFile: SourceFile, _oldOpts: CompilerOpts, hasSourceFileByPath: boolean) {
    const hostSourceFileInfo = sourceFilesCache.get(oldSourceFile.resolvedPath);
    if (hostSourceFileInfo !== undefined) {
      if (isFileMissingOnHost(hostSourceFileInfo)) {
        (missingFilePathsRequestedForRelease || (missingFilePathsRequestedForRelease = [])).push(oldSourceFile.path);
      } else if ((hostSourceFileInfo as FilePresentOnHost).sourceFile === oldSourceFile) {
        if (hostSourceFileInfo.fileWatcher) {
          hostSourceFileInfo.fileWatcher.close();
        }
        sourceFilesCache.delete(oldSourceFile.resolvedPath);
        if (!hasSourceFileByPath) {
          resolutionCache.removeResolutionsOfFile(oldSourceFile.path);
        }
      }
    }
  }
  function reportWatchDiagnostic(message: qd.Message) {
    if (host.onWatchStatusChange) {
      host.onWatchStatusChange(createCompilerDiagnostic(message), newLine, compilerOpts || optsToExtendForConfigFile);
    }
  }
  function scheduleProgramUpdate() {
    if (!host.setTimeout || !host.clearTimeout) {
      return;
    }
    if (timerToUpdateProgram) {
      host.clearTimeout(timerToUpdateProgram);
    }
    writeLog('Scheduling update');
    timerToUpdateProgram = host.setTimeout(updateProgramWithWatchStatus, 250);
  }
  function scheduleProgramReload() {
    assert(!!configFileName);
    reloadLevel = ConfigFileProgramReloadLevel.Full;
    scheduleProgramUpdate();
  }
  function updateProgramWithWatchStatus() {
    timerToUpdateProgram = undefined;
    reportWatchDiagnostic(qd.File_change_detected_Starting_incremental_compilation);
    updateProgram();
  }
  function updateProgram() {
    switch (reloadLevel) {
      case ConfigFileProgramReloadLevel.Partial:
        perfLogger.logStartUpdateProgram('PartialConfigReload');
        reloadFileNamesFromConfigFile();
        break;
      case ConfigFileProgramReloadLevel.Full:
        perfLogger.logStartUpdateProgram('FullConfigReload');
        reloadConfigFile();
        break;
      default:
        perfLogger.logStartUpdateProgram('SynchronizeProgram');
        synchronizeProgram();
        break;
    }
    perfLogger.logStopUpdateProgram('Done');
    return getCurrentBuilderProgram();
  }
  function reloadFileNamesFromConfigFile() {
    writeLog('Reloading new file names and opts');
    const result = getFileNamesFromConfigSpecs(configFileSpecs, getNormalizedAbsolutePath(getDirectoryPath(configFileName), currentDirectory), compilerOpts, parseConfigFileHost);
    if (updateErrorForNoInputFiles(result, getNormalizedAbsolutePath(configFileName, currentDirectory), configFileSpecs, configFileParsingDiagnostics!, canConfigFileJsonReportNoInputFiles)) {
      hasChangedConfigFileParsingErrors = true;
    }
    rootFileNames = result.fileNames;
    synchronizeProgram();
  }
  function reloadConfigFile() {
    writeLog(`Reloading config file: ${configFileName}`);
    reloadLevel = ConfigFileProgramReloadLevel.None;
    if (cachedDirectoryStructureHost) {
      cachedDirectoryStructureHost.clearCache();
    }
    parseConfigFile();
    hasChangedCompilerOpts = true;
    synchronizeProgram();
    watchConfigFileWildCardDirectories();
  }
  function parseConfigFile() {
    setConfigFileParsingResult(getParsedCommandLineOfConfigFile(configFileName, optsToExtendForConfigFile, parseConfigFileHost, undefined, watchOptsToExtend, extraFileExtensions)!);
  }
  function setConfigFileParsingResult(configFileParseResult: ParsedCommandLine) {
    rootFileNames = configFileParseResult.fileNames;
    compilerOpts = configFileParseResult.opts;
    watchOpts = configFileParseResult.watchOpts;
    configFileSpecs = configFileParseResult.configFileSpecs!;
    projectReferences = configFileParseResult.projectReferences;
    configFileParsingDiagnostics = getConfigFileParsingDiagnostics(configFileParseResult).slice();
    canConfigFileJsonReportNoInputFiles = canJsonReportNoInutFiles(configFileParseResult.raw);
    hasChangedConfigFileParsingErrors = true;
  }
  function onSourceFileChange(fileName: string, eventKind: FileWatcherEventKind, path: Path) {
    updateCachedSystemWithFile(fileName, path, eventKind);
    if (eventKind === FileWatcherEventKind.Deleted && sourceFilesCache.has(path)) {
      resolutionCache.invalidateResolutionOfFile(path);
    }
    resolutionCache.removeResolutionsFromProjectReferenceRedirects(path);
    nextSourceFileVersion(path);
    scheduleProgramUpdate();
  }
  function updateCachedSystemWithFile(fileName: string, path: Path, eventKind: FileWatcherEventKind) {
    if (cachedDirectoryStructureHost) {
      cachedDirectoryStructureHost.addOrDeleteFile(fileName, path, eventKind);
    }
  }
  function watchMissingFilePath(missingFilePath: Path) {
    return watchFilePath(host, missingFilePath, onMissingFileChange, PollingInterval.Medium, watchOpts, missingFilePath, WatchType.MissingFile);
  }
  function onMissingFileChange(fileName: string, eventKind: FileWatcherEventKind, missingFilePath: Path) {
    updateCachedSystemWithFile(fileName, missingFilePath, eventKind);
    if (eventKind === FileWatcherEventKind.Created && missingFilesMap.has(missingFilePath)) {
      missingFilesMap.get(missingFilePath)!.close();
      missingFilesMap.delete(missingFilePath);
      nextSourceFileVersion(missingFilePath);
      scheduleProgramUpdate();
    }
  }
  function watchConfigFileWildCardDirectories() {
    if (configFileSpecs) {
      updateWatchingWildcardDirectories(watchedWildcardDirectories || (watchedWildcardDirectories = createMap()), createMap(configFileSpecs.wildcardDirectories), watchWildcardDirectory);
    } else if (watchedWildcardDirectories) {
      clearMap(watchedWildcardDirectories, closeFileWatcherOf);
    }
  }
  function watchWildcardDirectory(directory: string, flags: WatchDirectoryFlags) {
    return watchDirectory(
      host,
      directory,
      (fileOrDirectory) => {
        assert(!!configFileName);
        let fileOrDirectoryPath: Path | undefined = toPath(fileOrDirectory);
        if (cachedDirectoryStructureHost) {
          cachedDirectoryStructureHost.addOrDeleteFileOrDirectory(fileOrDirectory, fileOrDirectoryPath);
        }
        nextSourceFileVersion(fileOrDirectoryPath);
        fileOrDirectoryPath = removeIgnoredPath(fileOrDirectoryPath);
        if (!fileOrDirectoryPath) return;
        if (fileOrDirectoryPath !== directory && hasExtension(fileOrDirectoryPath) && !isSupportedSourceFileName(fileOrDirectory, compilerOpts)) {
          writeLog(`Project: ${configFileName} Detected file add/remove of non supported extension: ${fileOrDirectory}`);
          return;
        }
        if (reloadLevel !== ConfigFileProgramReloadLevel.Full) {
          reloadLevel = ConfigFileProgramReloadLevel.Partial;
          scheduleProgramUpdate();
        }
      },
      flags,
      watchOpts,
      WatchType.WildcardDirectory
    );
  }
}
const sysFormatDiagnosticsHost: FormatDiagnosticsHost = sys
  ? {
      getCurrentDirectory: () => sys.getCurrentDirectory(),
      getNewLine: () => sys.newLine,
      getCanonicalFileName: createGetCanonicalFileName(sys.useCaseSensitiveFileNames),
    }
  : undefined!;
export function createDiagnosticReporter(system: System, pretty?: boolean): DiagnosticReporter {
  const host: FormatDiagnosticsHost =
    system === sys
      ? sysFormatDiagnosticsHost
      : {
          getCurrentDirectory: () => system.getCurrentDirectory(),
          getNewLine: () => system.newLine,
          getCanonicalFileName: createGetCanonicalFileName(system.useCaseSensitiveFileNames),
        };
  if (!pretty) return (diagnostic) => system.write(formatDiagnostic(diagnostic, host));
  const diagnostics: Diagnostic[] = new Array(1);
  return (diagnostic) => {
    diagnostics[0] = diagnostic;
    system.write(formatDiagnosticsWithColorAndContext(diagnostics, host) + host.getNewLine());
    diagnostics[0] = undefined!;
  };
}
function clearScreenIfNotWatchingForFileChanges(system: System, diagnostic: Diagnostic, opts: CompilerOpts): boolean {
  if (system.clearScreen && !opts.preserveWatchOutput && !opts.extendedDiagnostics && !opts.diagnostics && contains(screenStartingMessageCodes, diagnostic.code)) {
    system.clearScreen();
    return true;
  }
  return false;
}
export const screenStartingMessageCodes: number[] = [qd.Starting_compilation_in_watch_mode.code, qd.File_change_detected_Starting_incremental_compilation.code];
function getPlainDiagnosticFollowingNewLines(diagnostic: Diagnostic, newLine: string): string {
  return contains(screenStartingMessageCodes, diagnostic.code) ? newLine + newLine : newLine;
}
export function getLocaleTimeString(system: System) {
  return !system.now ? new Date().toLocaleTimeString() : system.now().toLocaleTimeString('en-US', { timeZone: 'UTC' });
}
export function createWatchStatusReporter(system: System, pretty?: boolean): WatchStatusReporter {
  return pretty
    ? (diagnostic, newLine, opts) => {
        clearScreenIfNotWatchingForFileChanges(system, diagnostic, opts);
        let output = `[${formatColorAndReset(getLocaleTimeString(system), ForegroundColorEscapeSequences.Grey)}] `;
        output += `${flattenqd.MessageText(diagnostic.messageText, system.newLine)}${newLine + newLine}`;
        system.write(output);
      }
    : (diagnostic, newLine, opts) => {
        let output = '';
        if (!clearScreenIfNotWatchingForFileChanges(system, diagnostic, opts)) {
          output += newLine;
        }
        output += `${getLocaleTimeString(system)} - `;
        output += `${flattenqd.MessageText(diagnostic.messageText, system.newLine)}${getPlainDiagnosticFollowingNewLines(diagnostic, newLine)}`;
        system.write(output);
      };
}
export function parseConfigFileWithSystem(
  configFileName: string,
  optsToExtend: CompilerOpts,
  watchOptsToExtend: WatchOpts | undefined,
  system: System,
  reportDiagnostic: DiagnosticReporter
) {
  const host: ParseConfigFileHost = <any>system;
  host.onUnRecoverableConfigFileDiagnostic = (diagnostic) => reportUnrecoverableDiagnostic(system, reportDiagnostic, diagnostic);
  const result = getParsedCommandLineOfConfigFile(configFileName, optsToExtend, host, undefined, watchOptsToExtend);
  host.onUnRecoverableConfigFileDiagnostic = undefined!;
  return result;
}
export function getErrorCountForSummary(diagnostics: readonly Diagnostic[]) {
  return countWhere(diagnostics, (diagnostic) => diagnostic.category === qd.Category.Error);
}
export function getWatchErrorSummaryqd.Message(errorCount: number) {
  return errorCount === 1 ? qd.Found_1_error_Watching_for_file_changes : qd.Found_0_errors_Watching_for_file_changes;
}
export function getErrorSummaryText(errorCount: number, newLine: string) {
  if (errorCount === 0) return '';
  const d = createCompilerDiagnostic(errorCount === 1 ? qd.Found_1_error : qd.Found_0_errors, errorCount);
  return `${newLine}${flattenqd.MessageText(d.messageText, newLine)}${newLine}${newLine}`;
}
export interface ProgramToEmitFilesAndReportErrors {
  getCurrentDirectory(): string;
  getCompilerOpts(): CompilerOpts;
  getSourceFiles(): readonly SourceFile[];
  getSyntacticDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[];
  getOptsDiagnostics(cancellationToken?: CancellationToken): readonly Diagnostic[];
  getGlobalDiagnostics(cancellationToken?: CancellationToken): readonly Diagnostic[];
  getSemanticDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[];
  getDeclarationDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly DiagnosticWithLocation[];
  getConfigFileParsingDiagnostics(): readonly Diagnostic[];
  emit(targetSourceFile?: SourceFile, writeFile?: WriteFileCallback, cancellationToken?: CancellationToken, emitOnlyDtsFiles?: boolean, customTransformers?: CustomTransformers): EmitResult;
}
export function listFiles(program: ProgramToEmitFilesAndReportErrors, writeFileName: (s: string) => void) {
  if (program.getCompilerOpts().listFiles || program.getCompilerOpts().listFilesOnly) {
    forEach(program.getSourceFiles(), (file) => {
      writeFileName(file.fileName);
    });
  }
}
export function emitFilesAndReportErrors(
  program: ProgramToEmitFilesAndReportErrors,
  reportDiagnostic: DiagnosticReporter,
  writeFileName?: (s: string) => void,
  reportSummary?: ReportEmitErrorSummary,
  writeFile?: WriteFileCallback,
  cancellationToken?: CancellationToken,
  emitOnlyDtsFiles?: boolean,
  customTransformers?: CustomTransformers
) {
  const isListFilesOnly = !!program.getCompilerOpts().listFilesOnly;
  const allDiagnostics = program.getConfigFileParsingDiagnostics().slice();
  const configFileParsingDiagnosticsLength = allqd.length;
  addRange(allDiagnostics, program.getSyntacticDiagnostics(undefined, cancellationToken));
  if (allqd.length === configFileParsingDiagnosticsLength) {
    addRange(allDiagnostics, program.getOptsDiagnostics(cancellationToken));
    if (!isListFilesOnly) {
      addRange(allDiagnostics, program.getGlobalDiagnostics(cancellationToken));
      if (allqd.length === configFileParsingDiagnosticsLength) {
        addRange(allDiagnostics, program.getSemanticDiagnostics(undefined, cancellationToken));
      }
    }
  }
  const emitResult = isListFilesOnly ? { emitSkipped: true, diagnostics: emptyArray } : program.emit(undefined, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
  const { emittedFiles, diagnostics: emitDiagnostics } = emitResult;
  addRange(allDiagnostics, emitDiagnostics);
  const diagnostics = sortAndDeduplicateDiagnostics(allDiagnostics);
  diagnostics.forEach(reportDiagnostic);
  if (writeFileName) {
    const currentDir = program.getCurrentDirectory();
    forEach(emittedFiles, (file) => {
      const filepath = getNormalizedAbsolutePath(file, currentDir);
      writeFileName(`TSFILE: ${filepath}`);
    });
    listFiles(program, writeFileName);
  }
  if (reportSummary) {
    reportSummary(getErrorCountForSummary(diagnostics));
  }
  return {
    emitResult,
    diagnostics,
  };
}
export function emitFilesAndReportErrorsAndGetExitStatus(
  program: ProgramToEmitFilesAndReportErrors,
  reportDiagnostic: DiagnosticReporter,
  writeFileName?: (s: string) => void,
  reportSummary?: ReportEmitErrorSummary,
  writeFile?: WriteFileCallback,
  cancellationToken?: CancellationToken,
  emitOnlyDtsFiles?: boolean,
  customTransformers?: CustomTransformers
) {
  const { emitResult, diagnostics } = emitFilesAndReportErrors(program, reportDiagnostic, writeFileName, reportSummary, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
  if (emitResult.emitSkipped && diagnostics.length > 0) return ExitStatus.DiagnosticsPresent_OutputsSkipped;
  if (diagnostics.length > 0) return ExitStatus.DiagnosticsPresent_OutputsGenerated;
  return ExitStatus.Success;
}
export const noopFileWatcher: FileWatcher = { close: noop };
export function createWatchHost(system = sys, reportWatchStatus?: WatchStatusReporter): WatchHost {
  const onWatchStatusChange = reportWatchStatus || createWatchStatusReporter(system);
  return {
    onWatchStatusChange,
    watchFile: maybeBind(system, system.watchFile) || (() => noopFileWatcher),
    watchDirectory: maybeBind(system, system.watchDirectory) || (() => noopFileWatcher),
    setTimeout: maybeBind(system, system.setTimeout) || noop,
    clearTimeout: maybeBind(system, system.clearTimeout) || noop,
  };
}
export type WatchType = WatchTypeRegistry[keyof WatchTypeRegistry];
export const WatchType: WatchTypeRegistry = {
  ConfigFile: 'Config file',
  SourceFile: 'Source file',
  MissingFile: 'Missing file',
  WildcardDirectory: 'Wild card directory',
  FailedLookupLocations: 'Failed Lookup Locations',
  TypeRoots: 'Type roots',
};
export interface WatchTypeRegistry {
  ConfigFile: 'Config file';
  SourceFile: 'Source file';
  MissingFile: 'Missing file';
  WildcardDirectory: 'Wild card directory';
  FailedLookupLocations: 'Failed Lookup Locations';
  TypeRoots: 'Type roots';
}
interface WatchFactory<X, Y = undefined> extends qnr.WatchFactory<X, Y> {
  writeLog: (s: string) => void;
}
export function createWatchFactory<Y = undefined>(host: { trace?(s: string): void }, opts: { extendedDiagnostics?: boolean; diagnostics?: boolean }) {
  const watchLogLevel = host.trace ? (opts.extendedDiagnostics ? WatchLogLevel.Verbose : opts.diagnostics ? WatchLogLevel.TriggerOnly : WatchLogLevel.None) : WatchLogLevel.None;
  const writeLog: (s: string) => void = watchLogLevel !== WatchLogLevel.None ? (s) => host.trace!(s) : noop;
  const result = getWatchFactory<WatchType, Y>(watchLogLevel, writeLog) as WatchFactory<WatchType, Y>;
  result.writeLog = writeLog;
  return result;
}
export function createCompilerHostFromProgramHost(host: ProgramHost<any>, getCompilerOpts: () => CompilerOpts, directoryStructureHost: DirectoryStructureHost = host): CompilerHost {
  const useCaseSensitiveFileNames = host.useCaseSensitiveFileNames();
  const hostGetNewLine = memoize(() => host.getNewLine());
  return {
    getSourceFile: (fileName, languageVersion, onError) => {
      let text: string | undefined;
      try {
        performance.mark('beforeIORead');
        text = host.readFile(fileName, getCompilerOpts().charset);
        performance.mark('afterIORead');
        performance.measure('I/O Read', 'beforeIORead', 'afterIORead');
      } catch (e) {
        if (onError) {
          onError(e.message);
        }
        text = '';
      }
      return text !== undefined ? qp_createSource(fileName, text, languageVersion) : undefined;
    },
    getDefaultLibLocation: maybeBind(host, host.getDefaultLibLocation),
    getDefaultLibFileName: (opts) => host.qc.get.defaultLibFileName(opts),
    writeFile,
    getCurrentDirectory: memoize(() => host.getCurrentDirectory()),
    useCaseSensitiveFileNames: () => useCaseSensitiveFileNames,
    getCanonicalFileName: createGetCanonicalFileName(useCaseSensitiveFileNames),
    getNewLine: () => getNewLineCharacter(getCompilerOpts(), hostGetNewLine),
    fileExists: (f) => host.fileExists(f),
    readFile: (f) => host.readFile(f),
    trace: maybeBind(host, host.trace),
    directoryExists: maybeBind(directoryStructureHost, directoryStructureHost.directoryExists),
    getDirectories: maybeBind(directoryStructureHost, directoryStructureHost.getDirectories),
    realpath: maybeBind(host, host.realpath),
    getEnvironmentVariable: maybeBind(host, host.getEnvironmentVariable) || (() => ''),
    createHash: maybeBind(host, host.createHash),
    readDirectory: maybeBind(host, host.readDirectory),
  };
  function writeFile(fileName: string, text: string, writeByteOrderMark: boolean, onError: (message: string) => void) {
    try {
      performance.mark('beforeIOWrite');
      writeFileEnsuringDirectories(
        fileName,
        text,
        writeByteOrderMark,
        (path, data, writeByteOrderMark) => host.writeFile!(path, data, writeByteOrderMark),
        (path) => host.createDirectory!(path),
        (path) => host.directoryExists!(path)
      );
      performance.mark('afterIOWrite');
      performance.measure('I/O Write', 'beforeIOWrite', 'afterIOWrite');
    } catch (e) {
      if (onError) {
        onError(e.message);
      }
    }
  }
}
export function setGetSourceFileAsHashVersioned(compilerHost: CompilerHost, host: { createHash?(data: string): string }) {
  const originalGetSourceFile = compilerHost.getSourceFile;
  const computeHash = host.createHash || generateDjb2Hash;
  compilerHost.getSourceFile = (...args) => {
    const result = originalGetSourceFile.call(compilerHost, ...args);
    if (result) {
      result.version = computeHash.call(host, result.text);
    }
    return result;
  };
}
export function createProgramHost<T extends BuilderProgram = EmitAndSemanticDiagnosticsBuilderProgram>(system: System, createProgram: CreateProgram<T> | undefined): ProgramHost<T> {
  const getDefaultLibLocation = memoize(() => getDirectoryPath(normalizePath(system.getExecutingFilePath())));
  return {
    useCaseSensitiveFileNames: () => system.useCaseSensitiveFileNames,
    getNewLine: () => system.newLine,
    getCurrentDirectory: memoize(() => system.getCurrentDirectory()),
    getDefaultLibLocation,
    getDefaultLibFileName: (opts) => combinePaths(getDefaultLibLocation(), qc.get.defaultLibFileName(opts)),
    fileExists: (path) => system.fileExists(path),
    readFile: (path, encoding) => system.readFile(path, encoding),
    directoryExists: (path) => system.directoryExists(path),
    getDirectories: (path) => system.getDirectories(path),
    readDirectory: (path, extensions, exclude, include, depth) => system.readDirectory(path, extensions, exclude, include, depth),
    realpath: maybeBind(system, system.realpath),
    getEnvironmentVariable: maybeBind(system, system.getEnvironmentVariable),
    trace: (s) => system.write(s + system.newLine),
    createDirectory: (path) => system.createDirectory(path),
    writeFile: (path, data, writeByteOrderMark) => system.writeFile(path, data, writeByteOrderMark),
    createHash: maybeBind(system, system.createHash),
    createProgram: createProgram || ((createEmitAndSemanticDiagnosticsBuilderProgram as any) as CreateProgram<T>),
  };
}
function createWatchCompilerHost<T extends BuilderProgram = EmitAndSemanticDiagnosticsBuilderProgram>(
  system = sys,
  createProgram: CreateProgram<T> | undefined,
  reportDiagnostic: DiagnosticReporter,
  reportWatchStatus?: WatchStatusReporter
): WatchCompilerHost<T> {
  const writeFileName = (s: string) => system.write(s + system.newLine);
  const result = createProgramHost(system, createProgram) as WatchCompilerHost<T>;
  copyProperties(result, createWatchHost(system, reportWatchStatus));
  result.afterProgramCreate = (builderProgram) => {
    const compilerOpts = builderProgram.getCompilerOpts();
    const newLine = getNewLineCharacter(compilerOpts, () => system.newLine);
    emitFilesAndReportErrors(builderProgram, reportDiagnostic, writeFileName, (errorCount) =>
      result.onWatchStatusChange!(createCompilerDiagnostic(getWatchErrorSummaryqd.Message(errorCount), errorCount), newLine, compilerOpts, errorCount)
    );
  };
  return result;
}
function reportUnrecoverableDiagnostic(system: System, reportDiagnostic: DiagnosticReporter, diagnostic: Diagnostic) {
  reportDiagnostic(diagnostic);
  system.exit(ExitStatus.DiagnosticsPresent_OutputsSkipped);
}
export interface CreateWatchCompilerHostInput<T extends BuilderProgram> {
  system: System;
  createProgram?: CreateProgram<T>;
  reportDiagnostic?: DiagnosticReporter;
  reportWatchStatus?: WatchStatusReporter;
}
export interface CreateWatchCompilerHostOfConfigFileInput<T extends BuilderProgram> extends CreateWatchCompilerHostInput<T> {
  configFileName: string;
  optsToExtend?: CompilerOpts;
  watchOptsToExtend?: WatchOpts;
  extraFileExtensions?: readonly FileExtensionInfo[];
}
export function createWatchCompilerHostOfConfigFile<T extends BuilderProgram = EmitAndSemanticDiagnosticsBuilderProgram>({
  configFileName,
  optsToExtend,
  watchOptsToExtend,
  extraFileExtensions,
  system,
  createProgram,
  reportDiagnostic,
  reportWatchStatus,
}: CreateWatchCompilerHostOfConfigFileInput<T>): WatchCompilerHostOfConfigFile<T> {
  const diagnosticReporter = reportDiagnostic || createDiagnosticReporter(system);
  const host = createWatchCompilerHost(system, createProgram, diagnosticReporter, reportWatchStatus) as WatchCompilerHostOfConfigFile<T>;
  host.onUnRecoverableConfigFileDiagnostic = (diagnostic) => reportUnrecoverableDiagnostic(system, diagnosticReporter, diagnostic);
  host.configFileName = configFileName;
  host.optsToExtend = optsToExtend;
  host.watchOptsToExtend = watchOptsToExtend;
  host.extraFileExtensions = extraFileExtensions;
  return host;
}
export interface CreateWatchCompilerHostOfFilesAndCompilerOptsInput<T extends BuilderProgram> extends CreateWatchCompilerHostInput<T> {
  rootFiles: string[];
  opts: CompilerOpts;
  watchOpts: WatchOpts | undefined;
  projectReferences?: readonly ProjectReference[];
}
export function createWatchCompilerHostOfFilesAndCompilerOpts<T extends BuilderProgram = EmitAndSemanticDiagnosticsBuilderProgram>({
  rootFiles,
  opts,
  watchOpts,
  projectReferences,
  system,
  createProgram,
  reportDiagnostic,
  reportWatchStatus,
}: CreateWatchCompilerHostOfFilesAndCompilerOptsInput<T>): WatchCompilerHostOfFilesAndCompilerOpts<T> {
  const host = createWatchCompilerHost(system, createProgram, reportDiagnostic || createDiagnosticReporter(system), reportWatchStatus) as WatchCompilerHostOfFilesAndCompilerOpts<T>;
  host.rootFiles = rootFiles;
  host.opts = opts;
  host.watchOpts = watchOpts;
  host.projectReferences = projectReferences;
  return host;
}
export interface IncrementalCompilationOpts {
  rootNames: readonly string[];
  opts: CompilerOpts;
  configFileParsingDiagnostics?: readonly Diagnostic[];
  projectReferences?: readonly ProjectReference[];
  host?: CompilerHost;
  reportDiagnostic?: DiagnosticReporter;
  reportErrorSummary?: ReportEmitErrorSummary;
  afterProgramEmitAndDiagnostics?(program: EmitAndSemanticDiagnosticsBuilderProgram): void;
  system?: System;
}
export function performIncrementalCompilation(input: IncrementalCompilationOpts) {
  const system = input.system || sys;
  const host = input.host || (input.host = createIncrementalCompilerHost(input.opts, system));
  const builderProgram = createIncrementalProgram(input);
  const exitStatus = emitFilesAndReportErrorsAndGetExitStatus(
    builderProgram,
    input.reportDiagnostic || createDiagnosticReporter(system),
    (s) => host.trace && host.trace(s),
    input.reportErrorSummary || input.opts.pretty ? (errorCount) => system.write(getErrorSummaryText(errorCount, system.newLine)) : undefined
  );
  if (input.afterProgramEmitAndDiagnostics) input.afterProgramEmitAndDiagnostics(builderProgram);
  return exitStatus;
}
export interface DirectoryStructureHost {
  fileExists(path: string): boolean;
  readFile(path: string, encoding?: string): string | undefined;
  directoryExists?(path: string): boolean;
  getDirectories?(path: string): string[];
  readDirectory?(path: string, extensions?: readonly string[], exclude?: readonly string[], include?: readonly string[], depth?: number): string[];
  realpath?(path: string): string;
  createDirectory?(path: string): void;
  writeFile?(path: string, data: string, writeByteOrderMark?: boolean): void;
}
interface FileAndDirectoryExistence {
  fileExists: boolean;
  directoryExists: boolean;
}
export interface CachedDirectoryStructureHost extends DirectoryStructureHost {
  useCaseSensitiveFileNames: boolean;
  getDirectories(path: string): string[];
  readDirectory(path: string, extensions?: readonly string[], exclude?: readonly string[], include?: readonly string[], depth?: number): string[];
  addOrDeleteFileOrDirectory(fileOrDirectory: string, fileOrDirectoryPath: Path): FileAndDirectoryExistence | undefined;
  addOrDeleteFile(fileName: string, filePath: Path, eventKind: FileWatcherEventKind): void;
  clearCache(): void;
}
interface MutableFileSystemEntries {
  readonly files: string[];
  readonly directories: string[];
}
export function createCachedDirectoryStructureHost(host: DirectoryStructureHost, currentDirectory: string, useCaseSensitiveFileNames: boolean): CachedDirectoryStructureHost | undefined {
  if (!host.getDirectories || !host.readDirectory) {
    return;
  }
  const cachedReadDirectoryResult = createMap<MutableFileSystemEntries>();
  const getCanonicalFileName = createGetCanonicalFileName(useCaseSensitiveFileNames);
  return {
    useCaseSensitiveFileNames,
    fileExists,
    readFile: (path, encoding) => host.readFile(path, encoding),
    directoryExists: host.directoryExists && directoryExists,
    getDirectories,
    readDirectory,
    createDirectory: host.createDirectory && createDirectory,
    writeFile: host.writeFile && writeFile,
    addOrDeleteFileOrDirectory,
    addOrDeleteFile,
    clearCache,
    realpath: host.realpath && realpath,
  };
  function toPath(fileName: string) {
    return qnr.toPath(fileName, currentDirectory, getCanonicalFileName);
  }
  function getCachedFileSystemEntries(rootDirPath: Path): MutableFileSystemEntries | undefined {
    return cachedReadDirectoryResult.get(ensureTrailingDirectorySeparator(rootDirPath));
  }
  function getCachedFileSystemEntriesForBaseDir(path: Path): MutableFileSystemEntries | undefined {
    return getCachedFileSystemEntries(getDirectoryPath(path));
  }
  function getBaseNameOfFileName(fileName: string) {
    return getBaseFileName(normalizePath(fileName));
  }
  function createCachedFileSystemEntries(rootDir: string, rootDirPath: Path) {
    const resultFromHost: MutableFileSystemEntries = {
      files: map(host.readDirectory!(rootDir, ['*.*']), getBaseNameOfFileName) || [],
      directories: host.getDirectories!(rootDir) || [],
    };
    cachedReadDirectoryResult.set(ensureTrailingDirectorySeparator(rootDirPath), resultFromHost);
    return resultFromHost;
  }
  function tryReadDirectory(rootDir: string, rootDirPath: Path): MutableFileSystemEntries | undefined {
    rootDirPath = ensureTrailingDirectorySeparator(rootDirPath);
    const cachedResult = getCachedFileSystemEntries(rootDirPath);
    if (cachedResult) return cachedResult;
    try {
      return createCachedFileSystemEntries(rootDir, rootDirPath);
    } catch (_e) {
      assert(!cachedReadDirectoryResult.has(ensureTrailingDirectorySeparator(rootDirPath)));
      return;
    }
  }
  function fileNameEqual(name1: string, name2: string) {
    return getCanonicalFileName(name1) === getCanonicalFileName(name2);
  }
  function hasEntry(entries: readonly string[], name: string) {
    return some(entries, (file) => fileNameEqual(file, name));
  }
  function updateFileSystemEntry(entries: string[], baseName: string, isValid: boolean) {
    if (hasEntry(entries, baseName)) {
      if (!isValid) return filterMutate(entries, (entry) => !fileNameEqual(entry, baseName));
    } else if (isValid) {
      return entries.push(baseName);
    }
  }
  function writeFile(fileName: string, data: string, writeByteOrderMark?: boolean): void {
    const path = toPath(fileName);
    const result = getCachedFileSystemEntriesForBaseDir(path);
    if (result) {
      updateFilesOfFileSystemEntry(result, getBaseNameOfFileName(fileName), true);
    }
    return host.writeFile!(fileName, data, writeByteOrderMark);
  }
  function fileExists(fileName: string): boolean {
    const path = toPath(fileName);
    const result = getCachedFileSystemEntriesForBaseDir(path);
    return (result && hasEntry(result.files, getBaseNameOfFileName(fileName))) || host.fileExists(fileName);
  }
  function directoryExists(dirPath: string): boolean {
    const path = toPath(dirPath);
    return cachedReadDirectoryResult.has(ensureTrailingDirectorySeparator(path)) || host.directoryExists!(dirPath);
  }
  function createDirectory(dirPath: string) {
    const path = toPath(dirPath);
    const result = getCachedFileSystemEntriesForBaseDir(path);
    const baseFileName = getBaseNameOfFileName(dirPath);
    if (result) {
      updateFileSystemEntry(result.directories, baseFileName, true);
    }
    host.createDirectory!(dirPath);
  }
  function getDirectories(rootDir: string): string[] {
    const rootDirPath = toPath(rootDir);
    const result = tryReadDirectory(rootDir, rootDirPath);
    if (result) return result.directories.slice();
    return host.getDirectories!(rootDir);
  }
  function readDirectory(rootDir: string, extensions?: readonly string[], excludes?: readonly string[], includes?: readonly string[], depth?: number): string[] {
    const rootDirPath = toPath(rootDir);
    const result = tryReadDirectory(rootDir, rootDirPath);
    if (result) return matchFiles(rootDir, extensions, excludes, includes, useCaseSensitiveFileNames, currentDirectory, depth, getFileSystemEntries, realpath);
    return host.readDirectory!(rootDir, extensions, excludes, includes, depth);
    function getFileSystemEntries(dir: string): FileSystemEntries {
      const path = toPath(dir);
      if (path === rootDirPath) return result!;
      return tryReadDirectory(dir, path) || emptyFileSystemEntries;
    }
  }
  function realpath(s: string) {
    return host.realpath ? host.realpath(s) : s;
  }
  function addOrDeleteFileOrDirectory(fileOrDirectory: string, fileOrDirectoryPath: Path) {
    const existingResult = getCachedFileSystemEntries(fileOrDirectoryPath);
    if (existingResult) {
      clearCache();
      return;
    }
    const parentResult = getCachedFileSystemEntriesForBaseDir(fileOrDirectoryPath);
    if (!parentResult) {
      return;
    }
    if (!host.directoryExists) {
      clearCache();
      return;
    }
    const baseName = getBaseNameOfFileName(fileOrDirectory);
    const fsQueryResult: FileAndDirectoryExistence = {
      fileExists: host.fileExists(fileOrDirectoryPath),
      directoryExists: host.directoryExists(fileOrDirectoryPath),
    };
    if (fsQueryResult.directoryExists || hasEntry(parentResult.directories, baseName)) {
      clearCache();
    } else {
      updateFilesOfFileSystemEntry(parentResult, baseName, fsQueryResult.fileExists);
    }
    return fsQueryResult;
  }
  function addOrDeleteFile(fileName: string, filePath: Path, eventKind: FileWatcherEventKind) {
    if (eventKind === FileWatcherEventKind.Changed) {
      return;
    }
    const parentResult = getCachedFileSystemEntriesForBaseDir(filePath);
    if (parentResult) {
      updateFilesOfFileSystemEntry(parentResult, getBaseNameOfFileName(fileName), eventKind === FileWatcherEventKind.Created);
    }
  }
  function updateFilesOfFileSystemEntry(parentResult: MutableFileSystemEntries, baseName: string, fileExists: boolean) {
    updateFileSystemEntry(parentResult.files, baseName, fileExists);
  }
  function clearCache() {
    cachedReadDirectoryResult.clear();
  }
}
export function closeFileWatcher(watcher: FileWatcher) {
  watcher.close();
}
export enum ConfigFileProgramReloadLevel {
  None,
  Partial,
  Full,
}
export function updateMissingFilePathsWatch(program: Program, missingFileWatches: Map<FileWatcher>, createMissingFileWatch: (missingFilePath: Path) => FileWatcher) {
  const missingFilePaths = program.getMissingFilePaths();
  const newMissingFilePathMap = qu.arrayToSet(missingFilePaths);
  mutateMap(missingFileWatches, newMissingFilePathMap, {
    createNewValue: createMissingFileWatch,
    onDeleteValue: closeFileWatcher,
  });
}
export interface WildcardDirectoryWatcher {
  watcher: FileWatcher;
  flags: WatchDirectoryFlags;
}
export function updateWatchingWildcardDirectories(
  existingWatchedForWildcards: Map<WildcardDirectoryWatcher>,
  wildcardDirectories: Map<WatchDirectoryFlags>,
  watchDirectory: (directory: string, flags: WatchDirectoryFlags) => FileWatcher
) {
  mutateMap(existingWatchedForWildcards, wildcardDirectories, {
    createNewValue: createWildcardDirectoryWatcher,
    onDeleteValue: closeFileWatcherOf,
    onExistingValue: updateWildcardDirectoryWatcher,
  });
  function createWildcardDirectoryWatcher(directory: string, flags: WatchDirectoryFlags): WildcardDirectoryWatcher {
    return {
      watcher: watchDirectory(directory, flags),
      flags,
    };
  }
  function updateWildcardDirectoryWatcher(existingWatcher: WildcardDirectoryWatcher, flags: WatchDirectoryFlags, directory: string) {
    if (existingWatcher.flags === flags) {
      return;
    }
    existingWatcher.watcher.close();
    existingWatchedForWildcards.set(directory, createWildcardDirectoryWatcher(directory, flags));
  }
}
export function isEmittedFileOfProgram(program: Program | undefined, file: string) {
  if (!program) return false;
  return program.isEmittedFile(file);
}
export enum WatchLogLevel {
  None,
  TriggerOnly,
  Verbose,
}
export interface WatchFileHost {
  watchFile(path: string, callback: FileWatcherCallback, pollingInterval?: number, opts?: WatchOpts): FileWatcher;
}
export interface WatchDirectoryHost {
  watchDirectory(path: string, callback: DirectoryWatcherCallback, recursive?: boolean, opts?: WatchOpts): FileWatcher;
}
export type WatchFile<X, Y> = (
  host: WatchFileHost,
  file: string,
  callback: FileWatcherCallback,
  pollingInterval: PollingInterval,
  opts: WatchOpts | undefined,
  detailInfo1: X,
  detailInfo2?: Y
) => FileWatcher;
export type FilePathWatcherCallback = (fileName: string, eventKind: FileWatcherEventKind, filePath: Path) => void;
export type WatchFilePath<X, Y> = (
  host: WatchFileHost,
  file: string,
  callback: FilePathWatcherCallback,
  pollingInterval: PollingInterval,
  opts: WatchOpts | undefined,
  path: Path,
  detailInfo1: X,
  detailInfo2?: Y
) => FileWatcher;
export type WatchDirectory<X, Y> = (
  host: WatchDirectoryHost,
  directory: string,
  callback: DirectoryWatcherCallback,
  flags: WatchDirectoryFlags,
  opts: WatchOpts | undefined,
  detailInfo1: X,
  detailInfo2?: Y
) => FileWatcher;
export interface WatchFactory<X, Y> {
  watchFile: WatchFile<X, Y>;
  watchFilePath: WatchFilePath<X, Y>;
  watchDirectory: WatchDirectory<X, Y>;
}
export function getWatchFactory<X, Y = undefined>(watchLogLevel: WatchLogLevel, log: (s: string) => void, getDetailWatchInfo?: GetDetailWatchInfo<X, Y>): WatchFactory<X, Y> {
  return getWatchFactoryWith(watchLogLevel, log, getDetailWatchInfo, watchFile, watchDirectory);
}
function getWatchFactoryWith<X, Y = undefined>(
  watchLogLevel: WatchLogLevel,
  log: (s: string) => void,
  getDetailWatchInfo: GetDetailWatchInfo<X, Y> | undefined,
  watchFile: (host: WatchFileHost, file: string, callback: FileWatcherCallback, watchPriority: PollingInterval, opts: WatchOpts | undefined) => FileWatcher,
  watchDirectory: (host: WatchDirectoryHost, directory: string, callback: DirectoryWatcherCallback, flags: WatchDirectoryFlags, opts: WatchOpts | undefined) => FileWatcher
): WatchFactory<X, Y> {
  const createFileWatcher: CreateFileWatcher<WatchFileHost, PollingInterval, FileWatcherEventKind, never, X, Y> = getCreateFileWatcher(watchLogLevel, watchFile);
  const createFilePathWatcher: CreateFileWatcher<WatchFileHost, PollingInterval, FileWatcherEventKind, Path, X, Y> = watchLogLevel === WatchLogLevel.None ? watchFilePath : createFileWatcher;
  const createDirectoryWatcher: CreateFileWatcher<WatchDirectoryHost, WatchDirectoryFlags, undefined, never, X, Y> = getCreateFileWatcher(watchLogLevel, watchDirectory);
  if (watchLogLevel === WatchLogLevel.Verbose && sysLog === noop) {
    setSysLog((s) => log(s));
  }
  return {
    watchFile: (host, file, callback, pollingInterval, opts, detailInfo1, detailInfo2) =>
      createFileWatcher(host, file, callback, pollingInterval, opts, undefined, detailInfo1, detailInfo2, watchFile, log, 'FileWatcher', getDetailWatchInfo),
    watchFilePath: (host, file, callback, pollingInterval, opts, path, detailInfo1, detailInfo2) =>
      createFilePathWatcher(host, file, callback, pollingInterval, opts, path, detailInfo1, detailInfo2, watchFile, log, 'FileWatcher', getDetailWatchInfo),
    watchDirectory: (host, directory, callback, flags, opts, detailInfo1, detailInfo2) =>
      createDirectoryWatcher(host, directory, callback, flags, opts, undefined, detailInfo1, detailInfo2, watchDirectory, log, 'DirectoryWatcher', getDetailWatchInfo),
  };
}
function watchFile(host: WatchFileHost, file: string, callback: FileWatcherCallback, pollingInterval: PollingInterval, opts: WatchOpts | undefined): FileWatcher {
  return host.watchFile(file, callback, pollingInterval, opts);
}
function watchFilePath(host: WatchFileHost, file: string, callback: FilePathWatcherCallback, pollingInterval: PollingInterval, opts: WatchOpts | undefined, path: Path): FileWatcher {
  return watchFile(host, file, (fileName, eventKind) => callback(fileName, eventKind, path), pollingInterval, opts);
}
function watchDirectory(host: WatchDirectoryHost, directory: string, callback: DirectoryWatcherCallback, flags: WatchDirectoryFlags, opts: WatchOpts | undefined): FileWatcher {
  return host.watchDirectory(directory, callback, (flags & WatchDirectoryFlags.Recursive) !== 0, opts);
}
type WatchCallback<T, U> = (fileName: string, cbOptional?: T, passThrough?: U) => void;
type AddWatch<H, T, U, V> = (
  host: H,
  file: string,
  cb: WatchCallback<U, V>,
  flags: T,
  opts: WatchOpts | undefined,
  passThrough?: V,
  detailInfo1?: undefined,
  detailInfo2?: undefined
) => FileWatcher;
export type GetDetailWatchInfo<X, Y> = (detailInfo1: X, detailInfo2: Y | undefined) => string;
type CreateFileWatcher<H, T, U, V, X, Y> = (
  host: H,
  file: string,
  cb: WatchCallback<U, V>,
  flags: T,
  opts: WatchOpts | undefined,
  passThrough: V | undefined,
  detailInfo1: X | undefined,
  detailInfo2: Y | undefined,
  addWatch: AddWatch<H, T, U, V>,
  log: (s: string) => void,
  watchCaption: string,
  getDetailWatchInfo: GetDetailWatchInfo<X, Y> | undefined
) => FileWatcher;
function getCreateFileWatcher<H, T, U, V, X, Y>(watchLogLevel: WatchLogLevel, addWatch: AddWatch<H, T, U, V>): CreateFileWatcher<H, T, U, V, X, Y> {
  switch (watchLogLevel) {
    case WatchLogLevel.None:
      return addWatch;
    case WatchLogLevel.TriggerOnly:
      return createFileWatcherWithTriggerLogging;
    case WatchLogLevel.Verbose:
      return addWatch === <any>watchDirectory ? createDirectoryWatcherWithLogging : createFileWatcherWithLogging;
  }
}
function createFileWatcherWithLogging<H, T, U, V, X, Y>(
  host: H,
  file: string,
  cb: WatchCallback<U, V>,
  flags: T,
  opts: WatchOpts | undefined,
  passThrough: V | undefined,
  detailInfo1: X | undefined,
  detailInfo2: Y | undefined,
  addWatch: AddWatch<H, T, U, V>,
  log: (s: string) => void,
  watchCaption: string,
  getDetailWatchInfo: GetDetailWatchInfo<X, Y> | undefined
): FileWatcher {
  log(`${watchCaption}:: Added:: ${getWatchInfo(file, flags, opts, detailInfo1, detailInfo2, getDetailWatchInfo)}`);
  const watcher = createFileWatcherWithTriggerLogging(host, file, cb, flags, opts, passThrough, detailInfo1, detailInfo2, addWatch, log, watchCaption, getDetailWatchInfo);
  return {
    close: () => {
      log(`${watchCaption}:: Close:: ${getWatchInfo(file, flags, opts, detailInfo1, detailInfo2, getDetailWatchInfo)}`);
      watcher.close();
    },
  };
}
function createDirectoryWatcherWithLogging<H, T, U, V, X, Y>(
  host: H,
  file: string,
  cb: WatchCallback<U, V>,
  flags: T,
  opts: WatchOpts | undefined,
  passThrough: V | undefined,
  detailInfo1: X | undefined,
  detailInfo2: Y | undefined,
  addWatch: AddWatch<H, T, U, V>,
  log: (s: string) => void,
  watchCaption: string,
  getDetailWatchInfo: GetDetailWatchInfo<X, Y> | undefined
): FileWatcher {
  const watchInfo = `${watchCaption}:: Added:: ${getWatchInfo(file, flags, opts, detailInfo1, detailInfo2, getDetailWatchInfo)}`;
  log(watchInfo);
  const start = timestamp();
  const watcher = createFileWatcherWithTriggerLogging(host, file, cb, flags, opts, passThrough, detailInfo1, detailInfo2, addWatch, log, watchCaption, getDetailWatchInfo);
  const elapsed = timestamp() - start;
  log(`Elapsed:: ${elapsed}ms ${watchInfo}`);
  return {
    close: () => {
      const watchInfo = `${watchCaption}:: Close:: ${getWatchInfo(file, flags, opts, detailInfo1, detailInfo2, getDetailWatchInfo)}`;
      log(watchInfo);
      const start = timestamp();
      watcher.close();
      const elapsed = timestamp() - start;
      log(`Elapsed:: ${elapsed}ms ${watchInfo}`);
    },
  };
}
function createFileWatcherWithTriggerLogging<H, T, U, V, X, Y>(
  host: H,
  file: string,
  cb: WatchCallback<U, V>,
  flags: T,
  opts: WatchOpts | undefined,
  passThrough: V | undefined,
  detailInfo1: X | undefined,
  detailInfo2: Y | undefined,
  addWatch: AddWatch<H, T, U, V>,
  log: (s: string) => void,
  watchCaption: string,
  getDetailWatchInfo: GetDetailWatchInfo<X, Y> | undefined
): FileWatcher {
  return addWatch(
    host,
    file,
    (fileName, cbOptional) => {
      const triggerredInfo = `${watchCaption}:: Triggered with ${fileName} ${cbOptional !== undefined ? cbOptional : ''}:: ${getWatchInfo(
        file,
        flags,
        opts,
        detailInfo1,
        detailInfo2,
        getDetailWatchInfo
      )}`;
      log(triggerredInfo);
      const start = timestamp();
      cb(fileName, cbOptional, passThrough);
      const elapsed = timestamp() - start;
      log(`Elapsed:: ${elapsed}ms ${triggerredInfo}`);
    },
    flags,
    opts
  );
}
export function getFallbackOpts(opts: WatchOpts | undefined): WatchOpts {
  const fallbackPolling = opts?.fallbackPolling;
  return {
    watchFile: fallbackPolling !== undefined ? ((fallbackPolling as unknown) as WatchFileKind) : WatchFileKind.PriorityPollingInterval,
  };
}
function getWatchInfo<T, X, Y>(file: string, flags: T, opts: WatchOpts | undefined, detailInfo1: X, detailInfo2: Y | undefined, getDetailWatchInfo: GetDetailWatchInfo<X, Y> | undefined) {
  return `WatchInfo: ${file} ${flags} ${JSON.stringify(opts)} ${
    getDetailWatchInfo ? getDetailWatchInfo(detailInfo1, detailInfo2) : detailInfo2 === undefined ? detailInfo1 : `${detailInfo1} ${detailInfo2}`
  }`;
}
export function closeFileWatcherOf<T extends { watcher: FileWatcher }>(objWithWatcher: T) {
  objWithWatcher.watcher.close();
}
