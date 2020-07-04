import * as qb from './base';
import * as qt from './types';
import { Node } from './types';
import * as syntax from './syntax';
import { Syntax } from './syntax';
export interface ResolutionCache {
  startRecordingFilesWithChangedResolutions(): void;
  finishRecordingFilesWithChangedResolutions(): Path[] | undefined;
  resolveModuleNames(moduleNames: string[], containingFile: string, reusedNames: string[] | undefined, redirectedReference?: ResolvedProjectReference): (ResolvedModuleFull | undefined)[];
  getResolvedModuleWithFailedLookupLocationsFromCache(moduleName: string, containingFile: string): CachedResolvedModuleWithFailedLookupLocations | undefined;
  resolveTypeReferenceDirectives(typeDirectiveNames: string[], containingFile: string, redirectedReference?: ResolvedProjectReference): (ResolvedTypeReferenceDirective | undefined)[];
  invalidateResolutionOfFile(filePath: Path): void;
  removeResolutionsOfFile(filePath: Path): void;
  removeResolutionsFromProjectReferenceRedirects(filePath: Path): void;
  setFilesWithInvalidatedNonRelativeUnresolvedImports(filesWithUnresolvedImports: Map<readonly string[]>): void;
  createHasInvalidatedResolution(forceAllFilesAsInvalidated?: boolean): HasInvalidatedResolution;
  startCachingPerDirectoryResolution(): void;
  finishCachingPerDirectoryResolution(): void;
  updateTypeRootsWatch(): void;
  closeTypeRootsWatch(): void;
  clear(): void;
}
interface ResolutionWithFailedLookupLocations {
  readonly failedLookupLocations: string[];
  isInvalidated?: boolean;
  refCount?: number;
  files?: Path[];
}
interface ResolutionWithResolvedFileName {
  resolvedFileName: string | undefined;
}
interface CachedResolvedModuleWithFailedLookupLocations extends ResolvedModuleWithFailedLookupLocations, ResolutionWithFailedLookupLocations {}
interface CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations extends ResolvedTypeReferenceDirectiveWithFailedLookupLocations, ResolutionWithFailedLookupLocations {}
export interface ResolutionCacheHost extends ModuleResolutionHost {
  toPath(fileName: string): Path;
  getCanonicalFileName: GetCanonicalFileName;
  getCompilationSettings(): CompilerOptions;
  watchDirectoryOfFailedLookupLocation(directory: string, cb: DirectoryWatcherCallback, flags: WatchDirectoryFlags): FileWatcher;
  onInvalidatedResolution(): void;
  watchTypeRootsDirectory(directory: string, cb: DirectoryWatcherCallback, flags: WatchDirectoryFlags): FileWatcher;
  onChangedAutomaticTypeDirectiveNames(): void;
  getCachedDirectoryStructureHost(): CachedDirectoryStructureHost | undefined;
  projectName?: string;
  getGlobalCache?(): string | undefined;
  globalCacheResolutionModuleName?(externalModuleName: string): string;
  writeLog(s: string): void;
  getCurrentProgram(): Program | undefined;
  fileIsOpen(filePath: Path): boolean;
  getCompilerHost?(): CompilerHost | undefined;
}
interface DirectoryWatchesOfFailedLookup {
  watcher: FileWatcher;
  refCount: number;
  nonRecursive?: boolean;
}
interface DirectoryOfFailedLookupWatch {
  dir: string;
  dirPath: Path;
  nonRecursive?: boolean;
}
export function removeIgnoredPath(path: Path): Path | undefined {
  if (endsWith(path, '/node_modules/.staging')) {
    return removeSuffix(path, '/.staging') as Path;
  }
  return some(ignoredPaths, (searchPath) => stringContains(path, searchPath)) ? undefined : path;
}
export function canWatchDirectory(dirPath: Path) {
  const rootLength = getRootLength(dirPath);
  if (dirPath.length === rootLength) {
    return false;
  }
  let nextDirectorySeparator = dirPath.indexOf(dirSeparator, rootLength);
  if (nextDirectorySeparator === -1) {
    return false;
  }
  let pathPartForUserCheck = dirPath.substring(rootLength, nextDirectorySeparator + 1);
  const isNonDirectorySeparatorRoot = rootLength > 1 || dirPath.charCodeAt(0) !== Codes.slash;
  if (isNonDirectorySeparatorRoot && dirPath.search(/[a-zA-Z]:/) !== 0 && pathPartForUserCheck.search(/[a-zA-z]\$\//)) {
    nextDirectorySeparator = dirPath.indexOf(dirSeparator, nextDirectorySeparator + 1);
    if (nextDirectorySeparator === -1) {
      return false;
    }
    pathPartForUserCheck = dirPath.substring(rootLength + pathPartForUserCheck.length, nextDirectorySeparator + 1);
  }
  if (isNonDirectorySeparatorRoot && pathPartForUserCheck.search(/users\//)) {
    return true;
  }
  for (let searchIndex = nextDirectorySeparator + 1, searchLevels = 2; searchLevels > 0; searchLevels--) {
    searchIndex = dirPath.indexOf(dirSeparator, searchIndex) + 1;
    if (searchIndex === 0) {
      return false;
    }
  }
  return true;
}
type GetResolutionWithResolvedFileName<
  T extends ResolutionWithFailedLookupLocations = ResolutionWithFailedLookupLocations,
  R extends ResolutionWithResolvedFileName = ResolutionWithResolvedFileName
> = (resolution: T) => R | undefined;
export function createResolutionCache(resolutionHost: ResolutionCacheHost, rootDirForResolution: string | undefined, logChangesWhenResolvingModule: boolean): ResolutionCache {
  let filesWithChangedSetOfUnresolvedImports: Path[] | undefined;
  let filesWithInvalidatedResolutions: Map<true> | undefined;
  let filesWithInvalidatedNonRelativeUnresolvedImports: ReadonlyMap<readonly string[]> | undefined;
  const nonRelativeExternalModuleResolutions = new MultiMap<ResolutionWithFailedLookupLocations>();
  const resolutionsWithFailedLookups: ResolutionWithFailedLookupLocations[] = [];
  const resolvedFileToResolution = new MultiMap<ResolutionWithFailedLookupLocations>();
  const getCurrentDirectory = memoize(() => resolutionHost.getCurrentDirectory!());
  const cachedDirectoryStructureHost = resolutionHost.getCachedDirectoryStructureHost();
  const resolvedModuleNames = createMap<Map<CachedResolvedModuleWithFailedLookupLocations>>();
  const perDirectoryResolvedModuleNames: CacheWithRedirects<Map<CachedResolvedModuleWithFailedLookupLocations>> = createCacheWithRedirects();
  const nonRelativeModuleNameCache: CacheWithRedirects<PerModuleNameCache> = createCacheWithRedirects();
  const moduleResolutionCache = createModuleResolutionCacheWithMaps(perDirectoryResolvedModuleNames, nonRelativeModuleNameCache, getCurrentDirectory(), resolutionHost.getCanonicalFileName);
  const resolvedTypeReferenceDirectives = createMap<Map<CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations>>();
  const perDirectoryResolvedTypeReferenceDirectives: CacheWithRedirects<Map<CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations>> = createCacheWithRedirects();
  const failedLookupDefaultExtensions = [Extension.Ts, Extension.Tsx, Extension.Js, Extension.Jsx, Extension.Json];
  const customFailedLookupPaths = createMap<number>();
  const directoryWatchesOfFailedLookups = createMap<DirectoryWatchesOfFailedLookup>();
  const rootDir = rootDirForResolution && removeTrailingDirectorySeparator(getNormalizedAbsolutePath(rootDirForResolution, getCurrentDirectory()));
  const rootPath = (rootDir && resolutionHost.toPath(rootDir)) as Path;
  const rootSplitLength = rootPath !== undefined ? rootPath.split(dirSeparator).length : 0;
  const typeRootsWatches = createMap<FileWatcher>();
  return {
    startRecordingFilesWithChangedResolutions,
    finishRecordingFilesWithChangedResolutions,
    startCachingPerDirectoryResolution: clearPerDirectoryResolutions,
    finishCachingPerDirectoryResolution,
    resolveModuleNames,
    getResolvedModuleWithFailedLookupLocationsFromCache,
    resolveTypeReferenceDirectives,
    removeResolutionsFromProjectReferenceRedirects,
    removeResolutionsOfFile,
    invalidateResolutionOfFile,
    setFilesWithInvalidatedNonRelativeUnresolvedImports,
    createHasInvalidatedResolution,
    updateTypeRootsWatch,
    closeTypeRootsWatch,
    clear,
  };
  function getResolvedModule(resolution: CachedResolvedModuleWithFailedLookupLocations) {
    return resolution.resolvedModule;
  }
  function getResolvedTypeReferenceDirective(resolution: CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations) {
    return resolution.resolvedTypeReferenceDirective;
  }
  function isInDirectoryPath(dir: Path | undefined, file: Path) {
    if (dir === undefined || file.length <= dir.length) {
      return false;
    }
    return startsWith(file, dir) && file[dir.length] === dirSeparator;
  }
  function clear() {
    clearMap(directoryWatchesOfFailedLookups, closeFileWatcherOf);
    customFailedLookupPaths.clear();
    nonRelativeExternalModuleResolutions.clear();
    closeTypeRootsWatch();
    resolvedModuleNames.clear();
    resolvedTypeReferenceDirectives.clear();
    resolvedFileToResolution.clear();
    resolutionsWithFailedLookups.length = 0;
    clearPerDirectoryResolutions();
  }
  function startRecordingFilesWithChangedResolutions() {
    filesWithChangedSetOfUnresolvedImports = [];
  }
  function finishRecordingFilesWithChangedResolutions() {
    const collected = filesWithChangedSetOfUnresolvedImports;
    filesWithChangedSetOfUnresolvedImports = undefined;
    return collected;
  }
  function isFileWithInvalidatedNonRelativeUnresolvedImports(path: Path): boolean {
    if (!filesWithInvalidatedNonRelativeUnresolvedImports) {
      return false;
    }
    const value = filesWithInvalidatedNonRelativeUnresolvedImports.get(path);
    return !!value && !!value.length;
  }
  function createHasInvalidatedResolution(forceAllFilesAsInvalidated?: boolean): HasInvalidatedResolution {
    if (forceAllFilesAsInvalidated) {
      filesWithInvalidatedResolutions = undefined;
      return () => true;
    }
    const collected = filesWithInvalidatedResolutions;
    filesWithInvalidatedResolutions = undefined;
    return (path) => (!!collected && collected.has(path)) || isFileWithInvalidatedNonRelativeUnresolvedImports(path);
  }
  function clearPerDirectoryResolutions() {
    perDirectoryResolvedModuleNames.clear();
    nonRelativeModuleNameCache.clear();
    perDirectoryResolvedTypeReferenceDirectives.clear();
    nonRelativeExternalModuleResolutions.forEach(watchFailedLookupLocationOfNonRelativeModuleResolutions);
    nonRelativeExternalModuleResolutions.clear();
  }
  function finishCachingPerDirectoryResolution() {
    filesWithInvalidatedNonRelativeUnresolvedImports = undefined;
    clearPerDirectoryResolutions();
    directoryWatchesOfFailedLookups.forEach((watcher, path) => {
      if (watcher.refCount === 0) {
        directoryWatchesOfFailedLookups.delete(path);
        watcher.watcher.close();
      }
    });
  }
  function resolveModuleName(
    moduleName: string,
    containingFile: string,
    compilerOptions: CompilerOptions,
    host: ModuleResolutionHost,
    redirectedReference?: ResolvedProjectReference
  ): CachedResolvedModuleWithFailedLookupLocations {
    const primaryResult = qnr.resolveModuleName(moduleName, containingFile, compilerOptions, host, moduleResolutionCache, redirectedReference);
    if (!resolutionHost.getGlobalCache) {
      return primaryResult;
    }
    const globalCache = resolutionHost.getGlobalCache();
    if (globalCache !== undefined && !qp_isExternalModuleNameRelative(moduleName) && !(primaryResult.resolvedModule && extensionIsTS(primaryResult.resolvedModule.extension))) {
      const { resolvedModule, failedLookupLocations } = loadModuleFromGlobalCache(
        Debug.checkDefined(resolutionHost.globalCacheResolutionModuleName)(moduleName),
        resolutionHost.projectName,
        compilerOptions,
        host,
        globalCache
      );
      if (resolvedModule) {
        (primaryResult.resolvedModule as any) = resolvedModule;
        primaryResult.failedLookupLocations.push(...failedLookupLocations);
        return primaryResult;
      }
    }
    return primaryResult;
  }
  interface ResolveNamesWithLocalCacheInput<T extends ResolutionWithFailedLookupLocations, R extends ResolutionWithResolvedFileName> {
    names: readonly string[];
    containingFile: string;
    redirectedReference: ResolvedProjectReference | undefined;
    cache: Map<Map<T>>;
    perDirectoryCacheWithRedirects: CacheWithRedirects<Map<T>>;
    loader: (name: string, containingFile: string, options: CompilerOptions, host: ModuleResolutionHost, redirectedReference?: ResolvedProjectReference) => T;
    getResolutionWithResolvedFileName: GetResolutionWithResolvedFileName<T, R>;
    shouldRetryResolution: (t: T) => boolean;
    reusedNames?: readonly string[];
    logChanges?: boolean;
  }
  function resolveNamesWithLocalCache<T extends ResolutionWithFailedLookupLocations, R extends ResolutionWithResolvedFileName>({
    names,
    containingFile,
    redirectedReference,
    cache,
    perDirectoryCacheWithRedirects,
    loader,
    getResolutionWithResolvedFileName,
    shouldRetryResolution,
    reusedNames,
    logChanges,
  }: ResolveNamesWithLocalCacheInput<T, R>): (R | undefined)[] {
    const path = resolutionHost.toPath(containingFile);
    const resolutionsInFile = cache.get(path) || cache.set(path, createMap()).get(path)!;
    const dirPath = getDirectoryPath(path);
    const perDirectoryCache = perDirectoryCacheWithRedirects.getOrCreateMapOfCacheRedirects(redirectedReference);
    let perDirectoryResolution = perDirectoryCache.get(dirPath);
    if (!perDirectoryResolution) {
      perDirectoryResolution = createMap();
      perDirectoryCache.set(dirPath, perDirectoryResolution);
    }
    const resolvedModules: (R | undefined)[] = [];
    const compilerOptions = resolutionHost.getCompilationSettings();
    const hasInvalidatedNonRelativeUnresolvedImport = logChanges && isFileWithInvalidatedNonRelativeUnresolvedImports(path);
    const program = resolutionHost.getCurrentProgram();
    const oldRedirect = program && program.getResolvedProjectReferenceToRedirect(containingFile);
    const unmatchedRedirects = oldRedirect ? !redirectedReference || redirectedReference.sourceFile.path !== oldRedirect.sourceFile.path : !!redirectedReference;
    const seenNamesInFile = createMap<true>();
    for (const name of names) {
      let resolution = resolutionsInFile.get(name);
      if (
        (!seenNamesInFile.has(name) && unmatchedRedirects) ||
        !resolution ||
        resolution.isInvalidated ||
        (hasInvalidatedNonRelativeUnresolvedImport && !qp_isExternalModuleNameRelative(name) && shouldRetryResolution(resolution))
      ) {
        const existingResolution = resolution;
        const resolutionInDirectory = perDirectoryResolution.get(name);
        if (resolutionInDirectory) {
          resolution = resolutionInDirectory;
        } else {
          resolution = loader(name, containingFile, compilerOptions, resolutionHost.getCompilerHost?.() || resolutionHost, redirectedReference);
          perDirectoryResolution.set(name, resolution);
        }
        resolutionsInFile.set(name, resolution);
        watchFailedLookupLocationsOfExternalModuleResolutions(name, resolution, path, getResolutionWithResolvedFileName);
        if (existingResolution) {
          stopWatchFailedLookupLocationOfResolution(existingResolution, path, getResolutionWithResolvedFileName);
        }
        if (logChanges && filesWithChangedSetOfUnresolvedImports && !resolutionIsEqualTo(existingResolution, resolution)) {
          filesWithChangedSetOfUnresolvedImports.push(path);
          logChanges = false;
        }
      }
      assert(resolution !== undefined && !resolution.isInvalidated);
      seenNamesInFile.set(name, true);
      resolvedModules.push(getResolutionWithResolvedFileName(resolution));
    }
    resolutionsInFile.forEach((resolution, name) => {
      if (!seenNamesInFile.has(name) && !contains(reusedNames, name)) {
        stopWatchFailedLookupLocationOfResolution(resolution, path, getResolutionWithResolvedFileName);
        resolutionsInFile.delete(name);
      }
    });
    return resolvedModules;
    function resolutionIsEqualTo(oldResolution: T | undefined, newResolution: T | undefined): boolean {
      if (oldResolution === newResolution) {
        return true;
      }
      if (!oldResolution || !newResolution) {
        return false;
      }
      const oldResult = getResolutionWithResolvedFileName(oldResolution);
      const newResult = getResolutionWithResolvedFileName(newResolution);
      if (oldResult === newResult) {
        return true;
      }
      if (!oldResult || !newResult) {
        return false;
      }
      return oldResult.resolvedFileName === newResult.resolvedFileName;
    }
  }
  function resolveTypeReferenceDirectives(typeDirectiveNames: string[], containingFile: string, redirectedReference?: ResolvedProjectReference): (ResolvedTypeReferenceDirective | undefined)[] {
    return resolveNamesWithLocalCache<CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations, ResolvedTypeReferenceDirective>({
      names: typeDirectiveNames,
      containingFile,
      redirectedReference,
      cache: resolvedTypeReferenceDirectives,
      perDirectoryCacheWithRedirects: perDirectoryResolvedTypeReferenceDirectives,
      loader: resolveTypeReferenceDirective,
      getResolutionWithResolvedFileName: getResolvedTypeReferenceDirective,
      shouldRetryResolution: (resolution) => resolution.resolvedTypeReferenceDirective === undefined,
    });
  }
  function resolveModuleNames(moduleNames: string[], containingFile: string, reusedNames: string[] | undefined, redirectedReference?: ResolvedProjectReference): (ResolvedModuleFull | undefined)[] {
    return resolveNamesWithLocalCache<CachedResolvedModuleWithFailedLookupLocations, ResolvedModuleFull>({
      names: moduleNames,
      containingFile,
      redirectedReference,
      cache: resolvedModuleNames,
      perDirectoryCacheWithRedirects: perDirectoryResolvedModuleNames,
      loader: resolveModuleName,
      getResolutionWithResolvedFileName: getResolvedModule,
      shouldRetryResolution: (resolution) => !resolution.resolvedModule || !resolutionExtensionIsTSOrJson(resolution.resolvedModule.extension),
      reusedNames,
      logChanges: logChangesWhenResolvingModule,
    });
  }
  function getResolvedModuleWithFailedLookupLocationsFromCache(moduleName: string, containingFile: string): CachedResolvedModuleWithFailedLookupLocations | undefined {
    const cache = resolvedModuleNames.get(resolutionHost.toPath(containingFile));
    return cache && cache.get(moduleName);
  }
  function isNodeModulesAtTypesDirectory(dirPath: Path) {
    return endsWith(dirPath, '/node_modules/@types');
  }
  function getDirectoryToWatchFailedLookupLocation(failedLookupLocation: string, failedLookupLocationPath: Path): DirectoryOfFailedLookupWatch | undefined {
    if (isInDirectoryPath(rootPath, failedLookupLocationPath)) {
      failedLookupLocation = isRootedDiskPath(failedLookupLocation) ? normalizePath(failedLookupLocation) : getNormalizedAbsolutePath(failedLookupLocation, getCurrentDirectory());
      const failedLookupPathSplit = failedLookupLocationPath.split(dirSeparator);
      const failedLookupSplit = failedLookupLocation.split(dirSeparator);
      assert(failedLookupSplit.length === failedLookupPathSplit.length, `FailedLookup: ${failedLookupLocation} failedLookupLocationPath: ${failedLookupLocationPath}`);
      if (failedLookupPathSplit.length > rootSplitLength + 1) {
        return {
          dir: failedLookupSplit.slice(0, rootSplitLength + 1).join(dirSeparator),
          dirPath: failedLookupPathSplit.slice(0, rootSplitLength + 1).join(dirSeparator) as Path,
        };
      } else {
        return {
          dir: rootDir!,
          dirPath: rootPath,
          nonRecursive: false,
        };
      }
    }
    return getDirectoryToWatchFromFailedLookupLocationDirectory(getDirectoryPath(getNormalizedAbsolutePath(failedLookupLocation, getCurrentDirectory())), getDirectoryPath(failedLookupLocationPath));
  }
  function getDirectoryToWatchFromFailedLookupLocationDirectory(dir: string, dirPath: Path): DirectoryOfFailedLookupWatch | undefined {
    while (pathContainsNodeModules(dirPath)) {
      dir = getDirectoryPath(dir);
      dirPath = getDirectoryPath(dirPath);
    }
    if (isNodeModulesDirectory(dirPath)) {
      return canWatchDirectory(getDirectoryPath(dirPath)) ? { dir, dirPath } : undefined;
    }
    let nonRecursive = true;
    let subDirectoryPath: Path | undefined, subDirectory: string | undefined;
    if (rootPath !== undefined) {
      while (!isInDirectoryPath(dirPath, rootPath)) {
        const parentPath = getDirectoryPath(dirPath);
        if (parentPath === dirPath) {
          break;
        }
        nonRecursive = false;
        subDirectoryPath = dirPath;
        subDirectory = dir;
        dirPath = parentPath;
        dir = getDirectoryPath(dir);
      }
    }
    return canWatchDirectory(dirPath) ? { dir: subDirectory || dir, dirPath: subDirectoryPath || dirPath, nonRecursive } : undefined;
  }
  function isPathWithDefaultFailedLookupExtension(path: Path) {
    return fileExtensionIsOneOf(path, failedLookupDefaultExtensions);
  }
  function watchFailedLookupLocationsOfExternalModuleResolutions<T extends ResolutionWithFailedLookupLocations, R extends ResolutionWithResolvedFileName>(
    name: string,
    resolution: T,
    filePath: Path,
    getResolutionWithResolvedFileName: GetResolutionWithResolvedFileName<T, R>
  ) {
    if (resolution.refCount) {
      resolution.refCount++;
      Debug.assertDefined(resolution.files);
    } else {
      resolution.refCount = 1;
      assert(resolution.files === undefined);
      if (qp_isExternalModuleNameRelative(name)) {
        watchFailedLookupLocationOfResolution(resolution);
      } else {
        nonRelativeExternalModuleResolutions.add(name, resolution);
      }
      const resolved = getResolutionWithResolvedFileName(resolution);
      if (resolved && resolved.resolvedFileName) {
        resolvedFileToResolution.add(resolutionHost.toPath(resolved.resolvedFileName), resolution);
      }
    }
    (resolution.files || (resolution.files = [])).push(filePath);
  }
  function watchFailedLookupLocationOfResolution(resolution: ResolutionWithFailedLookupLocations) {
    assert(!!resolution.refCount);
    const { failedLookupLocations } = resolution;
    if (!failedLookupLocations.length) return;
    resolutionsWithFailedLookups.push(resolution);
    let setAtRoot = false;
    for (const failedLookupLocation of failedLookupLocations) {
      const failedLookupLocationPath = resolutionHost.toPath(failedLookupLocation);
      const toWatch = getDirectoryToWatchFailedLookupLocation(failedLookupLocation, failedLookupLocationPath);
      if (toWatch) {
        const { dir, dirPath, nonRecursive } = toWatch;
        if (!isPathWithDefaultFailedLookupExtension(failedLookupLocationPath)) {
          const refCount = customFailedLookupPaths.get(failedLookupLocationPath) || 0;
          customFailedLookupPaths.set(failedLookupLocationPath, refCount + 1);
        }
        if (dirPath === rootPath) {
          assert(!nonRecursive);
          setAtRoot = true;
        } else {
          setDirectoryWatcher(dir, dirPath, nonRecursive);
        }
      }
    }
    if (setAtRoot) {
      setDirectoryWatcher(rootDir!, rootPath, true);
    }
  }
  function watchFailedLookupLocationOfNonRelativeModuleResolutions(resolutions: ResolutionWithFailedLookupLocations[], name: string) {
    const program = resolutionHost.getCurrentProgram();
    if (!program || !program.getTypeChecker().tryFindAmbientModuleWithoutAugmentations(name)) {
      resolutions.forEach(watchFailedLookupLocationOfResolution);
    }
  }
  function setDirectoryWatcher(dir: string, dirPath: Path, nonRecursive?: boolean) {
    const dirWatcher = directoryWatchesOfFailedLookups.get(dirPath);
    if (dirWatcher) {
      assert(!!nonRecursive === !!dirWatcher.nonRecursive);
      dirWatcher.refCount++;
    } else {
      directoryWatchesOfFailedLookups.set(dirPath, { watcher: createDirectoryWatcher(dir, dirPath, nonRecursive), refCount: 1, nonRecursive });
    }
  }
  function stopWatchFailedLookupLocationOfResolution<T extends ResolutionWithFailedLookupLocations, R extends ResolutionWithResolvedFileName>(
    resolution: T,
    filePath: Path,
    getResolutionWithResolvedFileName: GetResolutionWithResolvedFileName<T, R>
  ) {
    unorderedRemoveItem(Debug.assertDefined(resolution.files), filePath);
    resolution.refCount!--;
    if (resolution.refCount) {
      return;
    }
    const resolved = getResolutionWithResolvedFileName(resolution);
    if (resolved && resolved.resolvedFileName) {
      resolvedFileToResolution.remove(resolutionHost.toPath(resolved.resolvedFileName), resolution);
    }
    if (!unorderedRemoveItem(resolutionsWithFailedLookups, resolution)) {
      return;
    }
    const { failedLookupLocations } = resolution;
    let removeAtRoot = false;
    for (const failedLookupLocation of failedLookupLocations) {
      const failedLookupLocationPath = resolutionHost.toPath(failedLookupLocation);
      const toWatch = getDirectoryToWatchFailedLookupLocation(failedLookupLocation, failedLookupLocationPath);
      if (toWatch) {
        const { dirPath } = toWatch;
        const refCount = customFailedLookupPaths.get(failedLookupLocationPath);
        if (refCount) {
          if (refCount === 1) {
            customFailedLookupPaths.delete(failedLookupLocationPath);
          } else {
            assert(refCount > 1);
            customFailedLookupPaths.set(failedLookupLocationPath, refCount - 1);
          }
        }
        if (dirPath === rootPath) {
          removeAtRoot = true;
        } else {
          removeDirectoryWatcher(dirPath);
        }
      }
    }
    if (removeAtRoot) {
      removeDirectoryWatcher(rootPath);
    }
  }
  function removeDirectoryWatcher(dirPath: string) {
    const dirWatcher = directoryWatchesOfFailedLookups.get(dirPath)!;
    dirWatcher.refCount--;
  }
  function createDirectoryWatcher(directory: string, dirPath: Path, nonRecursive: boolean | undefined) {
    return resolutionHost.watchDirectoryOfFailedLookupLocation(
      directory,
      (fileOrDirectory) => {
        const fileOrDirectoryPath = resolutionHost.toPath(fileOrDirectory);
        if (cachedDirectoryStructureHost) {
          cachedDirectoryStructureHost.addOrDeleteFileOrDirectory(fileOrDirectory, fileOrDirectoryPath);
        }
        if (invalidateResolutionOfFailedLookupLocation(fileOrDirectoryPath, dirPath === fileOrDirectoryPath)) {
          resolutionHost.onInvalidatedResolution();
        }
      },
      nonRecursive ? WatchDirectoryFlags.None : WatchDirectoryFlags.Recursive
    );
  }
  function removeResolutionsOfFileFromCache<T extends ResolutionWithFailedLookupLocations, R extends ResolutionWithResolvedFileName>(
    cache: Map<Map<T>>,
    filePath: Path,
    getResolutionWithResolvedFileName: GetResolutionWithResolvedFileName<T, R>
  ) {
    const resolutions = cache.get(filePath);
    if (resolutions) {
      resolutions.forEach((resolution) => stopWatchFailedLookupLocationOfResolution(resolution, filePath, getResolutionWithResolvedFileName));
      cache.delete(filePath);
    }
  }
  function removeResolutionsFromProjectReferenceRedirects(filePath: Path) {
    if (!fileExtensionIs(filePath, Extension.Json)) {
      return;
    }
    const program = resolutionHost.getCurrentProgram();
    if (!program) {
      return;
    }
    const resolvedProjectReference = program.getResolvedProjectReferenceByPath(filePath);
    if (!resolvedProjectReference) {
      return;
    }
    resolvedProjectReference.commandLine.fileNames.forEach((f) => removeResolutionsOfFile(resolutionHost.toPath(f)));
  }
  function removeResolutionsOfFile(filePath: Path) {
    removeResolutionsOfFileFromCache(resolvedModuleNames, filePath, getResolvedModule);
    removeResolutionsOfFileFromCache(resolvedTypeReferenceDirectives, filePath, getResolvedTypeReferenceDirective);
  }
  function invalidateResolution(resolution: ResolutionWithFailedLookupLocations) {
    resolution.isInvalidated = true;
    let changedInAutoTypeReferenced = false;
    for (const containingFilePath of Debug.assertDefined(resolution.files)) {
      (filesWithInvalidatedResolutions || (filesWithInvalidatedResolutions = createMap<true>())).set(containingFilePath, true);
      changedInAutoTypeReferenced = changedInAutoTypeReferenced || containingFilePath.endsWith(inferredTypesContainingFile);
    }
    if (changedInAutoTypeReferenced) {
      resolutionHost.onChangedAutomaticTypeDirectiveNames();
    }
  }
  function invalidateResolutionOfFile(filePath: Path) {
    removeResolutionsOfFile(filePath);
    forEach(resolvedFileToResolution.get(filePath), invalidateResolution);
  }
  function setFilesWithInvalidatedNonRelativeUnresolvedImports(filesMap: ReadonlyMap<readonly string[]>) {
    assert(filesWithInvalidatedNonRelativeUnresolvedImports === filesMap || filesWithInvalidatedNonRelativeUnresolvedImports === undefined);
    filesWithInvalidatedNonRelativeUnresolvedImports = filesMap;
  }
  function invalidateResolutionOfFailedLookupLocation(fileOrDirectoryPath: Path, isCreatingWatchedDirectory: boolean) {
    let isChangedFailedLookupLocation: (location: string) => boolean;
    if (isCreatingWatchedDirectory) {
      isChangedFailedLookupLocation = (location) => isInDirectoryPath(fileOrDirectoryPath, resolutionHost.toPath(location));
    } else {
      const updatedPath = removeIgnoredPath(fileOrDirectoryPath);
      if (!updatedPath) return false;
      fileOrDirectoryPath = updatedPath;
      if (resolutionHost.fileIsOpen(fileOrDirectoryPath)) {
        return false;
      }
      const dirOfFileOrDirectory = getDirectoryPath(fileOrDirectoryPath);
      if (
        isNodeModulesAtTypesDirectory(fileOrDirectoryPath) ||
        isNodeModulesDirectory(fileOrDirectoryPath) ||
        isNodeModulesAtTypesDirectory(dirOfFileOrDirectory) ||
        isNodeModulesDirectory(dirOfFileOrDirectory)
      ) {
        isChangedFailedLookupLocation = (location) => {
          const locationPath = resolutionHost.toPath(location);
          return locationPath === fileOrDirectoryPath || startsWith(resolutionHost.toPath(location), fileOrDirectoryPath);
        };
      } else {
        if (!isPathWithDefaultFailedLookupExtension(fileOrDirectoryPath) && !customFailedLookupPaths.has(fileOrDirectoryPath)) {
          return false;
        }
        if (isEmittedFileOfProgram(resolutionHost.getCurrentProgram(), fileOrDirectoryPath)) {
          return false;
        }
        isChangedFailedLookupLocation = (location) => resolutionHost.toPath(location) === fileOrDirectoryPath;
      }
    }
    let invalidated = false;
    for (const resolution of resolutionsWithFailedLookups) {
      if (resolution.failedLookupLocations.some(isChangedFailedLookupLocation)) {
        invalidateResolution(resolution);
        invalidated = true;
      }
    }
    return invalidated;
  }
  function closeTypeRootsWatch() {
    clearMap(typeRootsWatches, closeFileWatcher);
  }
  function getDirectoryToWatchFailedLookupLocationFromTypeRoot(typeRoot: string, typeRootPath: Path): Path | undefined {
    if (isInDirectoryPath(rootPath, typeRootPath)) {
      return rootPath;
    }
    const toWatch = getDirectoryToWatchFromFailedLookupLocationDirectory(typeRoot, typeRootPath);
    return toWatch && directoryWatchesOfFailedLookups.has(toWatch.dirPath) ? toWatch.dirPath : undefined;
  }
  function createTypeRootsWatch(typeRootPath: Path, typeRoot: string): FileWatcher {
    return resolutionHost.watchTypeRootsDirectory(
      typeRoot,
      (fileOrDirectory) => {
        const fileOrDirectoryPath = resolutionHost.toPath(fileOrDirectory);
        if (cachedDirectoryStructureHost) {
          cachedDirectoryStructureHost.addOrDeleteFileOrDirectory(fileOrDirectory, fileOrDirectoryPath);
        }
        resolutionHost.onChangedAutomaticTypeDirectiveNames();
        const dirPath = getDirectoryToWatchFailedLookupLocationFromTypeRoot(typeRoot, typeRootPath);
        if (dirPath && invalidateResolutionOfFailedLookupLocation(fileOrDirectoryPath, dirPath === fileOrDirectoryPath)) {
          resolutionHost.onInvalidatedResolution();
        }
      },
      WatchDirectoryFlags.Recursive
    );
  }
  function updateTypeRootsWatch() {
    const options = resolutionHost.getCompilationSettings();
    if (options.types) {
      closeTypeRootsWatch();
      return;
    }
    const typeRoots = getEffectiveTypeRoots(options, { directoryExists: directoryExistsForTypeRootWatch, getCurrentDirectory });
    if (typeRoots) {
      mutateMap(
        typeRootsWatches,
        arrayToMap(typeRoots, (tr) => resolutionHost.toPath(tr)),
        {
          createNewValue: createTypeRootsWatch,
          onDeleteValue: closeFileWatcher,
        }
      );
    } else {
      closeTypeRootsWatch();
    }
  }
  function directoryExistsForTypeRootWatch(nodeTypesDirectory: string) {
    const dir = getDirectoryPath(getDirectoryPath(nodeTypesDirectory));
    const dirPath = resolutionHost.toPath(dir);
    return dirPath === rootPath || canWatchDirectory(dirPath);
  }
}
