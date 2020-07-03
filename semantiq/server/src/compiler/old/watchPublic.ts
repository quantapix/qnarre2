namespace core {
  export interface ReadBuildProgramHost {
    useCaseSensitiveFileNames(): boolean;
    getCurrentDirectory(): string;
    readFile(fileName: string): string | undefined;
  }
  export function readBuilderProgram(compilerOptions: CompilerOptions, host: ReadBuildProgramHost) {
    if (compilerOptions.out || compilerOptions.outFile) return;
    const buildInfoPath = getTsBuildInfoEmitOutputFilePath(compilerOptions);
    if (!buildInfoPath) return;
    const content = host.readFile(buildInfoPath);
    if (!content) return;
    const buildInfo = getBuildInfo(content);
    if (buildInfo.version !== version) return;
    if (!buildInfo.program) return;
    return createBuildProgramUsingProgramBuildInfo(buildInfo.program, buildInfoPath, host);
  }

  export function createIncrementalCompilerHost(options: CompilerOptions, system = sys): CompilerHost {
    const host = createCompilerHostWorker(options, undefined, system);
    host.createHash = maybeBind(system, system.createHash);
    setGetSourceFileAsHashVersioned(host, system);
    changeCompilerHostLikeToUseCache(host, (fileName) => toPath(fileName, host.getCurrentDirectory(), host.getCanonicalFileName));
    return host;
  }

  export interface IncrementalProgramOptions<T extends BuilderProgram> {
    rootNames: readonly string[];
    options: CompilerOptions;
    configFileParsingDiagnostics?: readonly Diagnostic[];
    projectReferences?: readonly ProjectReference[];
    host?: CompilerHost;
    createProgram?: CreateProgram<T>;
  }

  export function createIncrementalProgram<T extends BuilderProgram = EmitAndSemanticDiagnosticsBuilderProgram>({
    rootNames,
    options,
    configFileParsingDiagnostics,
    projectReferences,
    host,
    createProgram,
  }: IncrementalProgramOptions<T>): T {
    host = host || createIncrementalCompilerHost(options);
    createProgram = createProgram || ((createEmitAndSemanticDiagnosticsBuilderProgram as any) as CreateProgram<T>);
    const oldProgram = (readBuilderProgram(options, host) as any) as T;
    return createProgram(rootNames, options, host, oldProgram, configFileParsingDiagnostics, projectReferences);
  }

  export type WatchStatusReporter = (diagnostic: Diagnostic, newLine: string, options: CompilerOptions, errorCount?: number) => void;

  export type CreateProgram<T extends BuilderProgram> = (
    rootNames: readonly string[] | undefined,
    options: CompilerOptions | undefined,
    host?: CompilerHost,
    oldProgram?: T,
    configFileParsingDiagnostics?: readonly Diagnostic[],
    projectReferences?: readonly ProjectReference[] | undefined
  ) => T;

  export interface WatchHost {
    onWatchStatusChange?(diagnostic: Diagnostic, newLine: string, options: CompilerOptions, errorCount?: number): void;

    watchFile(path: string, callback: FileWatcherCallback, pollingInterval?: number, options?: CompilerOptions): FileWatcher;

    watchDirectory(path: string, callback: DirectoryWatcherCallback, recursive?: boolean, options?: CompilerOptions): FileWatcher;

    setTimeout?(callback: (...args: any[]) => void, ms: number, ...args: any[]): any;

    clearTimeout?(timeoutId: any): void;
  }
  export interface ProgramHost<T extends BuilderProgram> {
    createProgram: CreateProgram<T>;

    useCaseSensitiveFileNames(): boolean;
    getNewLine(): string;
    getCurrentDirectory(): string;
    getDefaultLibFileName(options: CompilerOptions): string;
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
      options: CompilerOptions
    ): (ResolvedModule | undefined)[];

    resolveTypeReferenceDirectives?(
      typeReferenceDirectiveNames: string[],
      containingFile: string,
      redirectedReference: ResolvedProjectReference | undefined,
      options: CompilerOptions
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

  export interface WatchCompilerHostOfFilesAndCompilerOptions<T extends BuilderProgram> extends WatchCompilerHost<T> {
    rootFiles: string[];

    options: CompilerOptions;

    watchOptions?: WatchOptions;

    projectReferences?: readonly ProjectReference[];
  }

  export interface WatchCompilerHostOfConfigFile<T extends BuilderProgram> extends WatchCompilerHost<T>, ConfigFileDiagnosticsReporter {
    configFileName: string;

    optionsToExtend?: CompilerOptions;

    watchOptionsToExtend?: WatchOptions;

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

  export interface WatchOfFilesAndCompilerOptions<T> extends Watch<T> {
    updateRootFileNames(fileNames: string[]): void;
  }

  export function createWatchCompilerHost<T extends BuilderProgram>(
    configFileName: string,
    optionsToExtend: CompilerOptions | undefined,
    system: System,
    createProgram?: CreateProgram<T>,
    reportDiagnostic?: DiagnosticReporter,
    reportWatchStatus?: WatchStatusReporter,
    watchOptionsToExtend?: WatchOptions,
    extraFileExtensions?: readonly FileExtensionInfo[]
  ): WatchCompilerHostOfConfigFile<T>;
  export function createWatchCompilerHost<T extends BuilderProgram>(
    rootFiles: string[],
    options: CompilerOptions,
    system: System,
    createProgram?: CreateProgram<T>,
    reportDiagnostic?: DiagnosticReporter,
    reportWatchStatus?: WatchStatusReporter,
    projectReferences?: readonly ProjectReference[],
    watchOptions?: WatchOptions
  ): WatchCompilerHostOfFilesAndCompilerOptions<T>;
  export function createWatchCompilerHost<T extends BuilderProgram>(
    rootFilesOrConfigFileName: string | string[],
    options: CompilerOptions | undefined,
    system: System,
    createProgram?: CreateProgram<T>,
    reportDiagnostic?: DiagnosticReporter,
    reportWatchStatus?: WatchStatusReporter,
    projectReferencesOrWatchOptionsToExtend?: readonly ProjectReference[] | WatchOptions,
    watchOptionsOrExtraFileExtensions?: WatchOptions | readonly FileExtensionInfo[]
  ): WatchCompilerHostOfFilesAndCompilerOptions<T> | WatchCompilerHostOfConfigFile<T> {
    if (isArray(rootFilesOrConfigFileName)) {
      return createWatchCompilerHostOfFilesAndCompilerOptions({
        rootFiles: rootFilesOrConfigFileName,
        options: options!,
        watchOptions: watchOptionsOrExtraFileExtensions as WatchOptions,
        projectReferences: projectReferencesOrWatchOptionsToExtend as readonly ProjectReference[],
        system,
        createProgram,
        reportDiagnostic,
        reportWatchStatus,
      });
    } else {
      return createWatchCompilerHostOfConfigFile({
        configFileName: rootFilesOrConfigFileName,
        optionsToExtend: options,
        watchOptionsToExtend: projectReferencesOrWatchOptionsToExtend as WatchOptions,
        extraFileExtensions: watchOptionsOrExtraFileExtensions as readonly FileExtensionInfo[],
        system,
        createProgram,
        reportDiagnostic,
        reportWatchStatus,
      });
    }
  }

  export function createWatchProgram<T extends BuilderProgram>(host: WatchCompilerHostOfFilesAndCompilerOptions<T>): WatchOfFilesAndCompilerOptions<T>;

  export function createWatchProgram<T extends BuilderProgram>(host: WatchCompilerHostOfConfigFile<T>): WatchOfConfigFile<T>;
  export function createWatchProgram<T extends BuilderProgram>(
    host: WatchCompilerHostOfFilesAndCompilerOptions<T> & WatchCompilerHostOfConfigFile<T>
  ): WatchOfFilesAndCompilerOptions<T> | WatchOfConfigFile<T> {
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
    let hasChangedCompilerOptions = false;
    let hasChangedAutomaticTypeDirectiveNames = false;

    const useCaseSensitiveFileNames = host.useCaseSensitiveFileNames();
    const currentDirectory = host.getCurrentDirectory();
    const { configFileName, optionsToExtend: optionsToExtendForConfigFile = {}, watchOptionsToExtend, extraFileExtensions, createProgram } = host;
    let { rootFiles: rootFileNames, options: compilerOptions, watchOptions, projectReferences } = host;
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
    reportWatchDiagnostic(Diagnostics.Starting_compilation_in_watch_mode);
    if (configFileName && !host.configFileParsingResult) {
      newLine = getNewLineCharacter(optionsToExtendForConfigFile, () => host.getNewLine());
      assert(!rootFileNames);
      parseConfigFile();
      newLine = updateNewLine();
    }

    const { watchFile, watchFilePath, watchDirectory, writeLog } = createWatchFactory<string>(host, compilerOptions);
    const getCanonicalFileName = createGetCanonicalFileName(useCaseSensitiveFileNames);

    writeLog(`Current directory: ${currentDirectory} CaseSensitiveFileNames: ${useCaseSensitiveFileNames}`);
    let configFileWatcher: FileWatcher | undefined;
    if (configFileName) {
      configFileWatcher = watchFile(host, configFileName, scheduleProgramReload, PollingInterval.High, watchOptions, WatchType.ConfigFile);
    }

    const compilerHost = createCompilerHostFromProgramHost(host, () => compilerOptions, directoryStructureHost) as CompilerHost & ResolutionCacheHost;
    setGetSourceFileAsHashVersioned(compilerHost, host);

    const getNewSourceFile = compilerHost.getSourceFile;
    compilerHost.getSourceFile = (fileName, ...args) => getVersionedSourceFileByPath(fileName, toPath(fileName), ...args);
    compilerHost.getSourceFileByPath = getVersionedSourceFileByPath;
    compilerHost.getNewLine = () => newLine;
    compilerHost.fileExists = fileExists;
    compilerHost.onReleaseOldSourceFile = onReleaseOldSourceFile;

    compilerHost.toPath = toPath;
    compilerHost.getCompilationSettings = () => compilerOptions;
    compilerHost.useSourceOfProjectReferenceRedirect = maybeBind(host, host.useSourceOfProjectReferenceRedirect);
    compilerHost.watchDirectoryOfFailedLookupLocation = (dir, cb, flags) => watchDirectory(host, dir, cb, flags, watchOptions, WatchType.FailedLookupLocations);
    compilerHost.watchTypeRootsDirectory = (dir, cb, flags) => watchDirectory(host, dir, cb, flags, watchOptions, WatchType.TypeRoots);
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

    builderProgram = (readBuilderProgram(compilerOptions, compilerHost) as any) as T;
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
      if (hasChangedCompilerOptions) {
        newLine = updateNewLine();
        if (program && changesAffectModuleResolution(program.getCompilerOptions(), compilerOptions)) {
          resolutionCache.clear();
        }
      }

      const hasInvalidatedResolution = resolutionCache.createHasInvalidatedResolution(userProvidedResolution);
      if (isProgramUptoDate(getCurrentProgram(), rootFileNames, compilerOptions, getSourceVersion, fileExists, hasInvalidatedResolution, hasChangedAutomaticTypeDirectiveNames, projectReferences)) {
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
      writeLog(`  options: ${JSON.stringify(compilerOptions)}`);

      const needsUpdateInTypeRootWatch = hasChangedCompilerOptions || !getCurrentProgram();
      hasChangedCompilerOptions = false;
      hasChangedConfigFileParsingErrors = false;
      resolutionCache.startCachingPerDirectoryResolution();
      compilerHost.hasInvalidatedResolution = hasInvalidatedResolution;
      compilerHost.hasChangedAutomaticTypeDirectiveNames = hasChangedAutomaticTypeDirectiveNames;
      hasChangedAutomaticTypeDirectiveNames = false;
      builderProgram = createProgram(rootFileNames, compilerOptions, compilerHost, builderProgram, configFileParsingDiagnostics, projectReferences);
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
      return getNewLineCharacter(compilerOptions || optionsToExtendForConfigFile, () => host.getNewLine());
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

      if (isFileMissingOnHost(sourceFilesCache.get(path))) {
        return false;
      }

      return directoryStructureHost.fileExists(fileName);
    }

    function getVersionedSourceFileByPath(
      fileName: string,
      path: Path,
      languageVersion: ScriptTarget,
      onError?: (message: string) => void,
      shouldCreateNewSourceFile?: boolean
    ): SourceFile | undefined {
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
              hostSourceFile.fileWatcher = watchFilePath(host, fileName, onSourceFileChange, PollingInterval.Low, watchOptions, path, WatchType.SourceFile);
            }
          } else {
            if (hostSourceFile.fileWatcher) {
              hostSourceFile.fileWatcher.close();
            }
            sourceFilesCache.set(path, false);
          }
        } else {
          if (sourceFile) {
            const fileWatcher = watchFilePath(host, fileName, onSourceFileChange, PollingInterval.Low, watchOptions, path, WatchType.SourceFile);
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

    function onReleaseOldSourceFile(oldSourceFile: SourceFile, _oldOptions: CompilerOptions, hasSourceFileByPath: boolean) {
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

    function reportWatchDiagnostic(message: DiagnosticMessage) {
      if (host.onWatchStatusChange) {
        host.onWatchStatusChange(createCompilerDiagnostic(message), newLine, compilerOptions || optionsToExtendForConfigFile);
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
      reportWatchDiagnostic(Diagnostics.File_change_detected_Starting_incremental_compilation);
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
      writeLog('Reloading new file names and options');
      const result = getFileNamesFromConfigSpecs(configFileSpecs, getNormalizedAbsolutePath(getDirectoryPath(configFileName), currentDirectory), compilerOptions, parseConfigFileHost);
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
      hasChangedCompilerOptions = true;
      synchronizeProgram();

      watchConfigFileWildCardDirectories();
    }

    function parseConfigFile() {
      setConfigFileParsingResult(getParsedCommandLineOfConfigFile(configFileName, optionsToExtendForConfigFile, parseConfigFileHost, undefined, watchOptionsToExtend, extraFileExtensions)!);
    }

    function setConfigFileParsingResult(configFileParseResult: ParsedCommandLine) {
      rootFileNames = configFileParseResult.fileNames;
      compilerOptions = configFileParseResult.options;
      watchOptions = configFileParseResult.watchOptions;
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
      return watchFilePath(host, missingFilePath, onMissingFileChange, PollingInterval.Medium, watchOptions, missingFilePath, WatchType.MissingFile);
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

          if (fileOrDirectoryPath !== directory && hasExtension(fileOrDirectoryPath) && !isSupportedSourceFileName(fileOrDirectory, compilerOptions)) {
            writeLog(`Project: ${configFileName} Detected file add/remove of non supported extension: ${fileOrDirectory}`);
            return;
          }

          if (reloadLevel !== ConfigFileProgramReloadLevel.Full) {
            reloadLevel = ConfigFileProgramReloadLevel.Partial;

            scheduleProgramUpdate();
          }
        },
        flags,
        watchOptions,
        WatchType.WildcardDirectory
      );
    }
  }
}
