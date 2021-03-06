import { Node } from './types';
import { qf } from './core';
import { Syntax } from './syntax';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
export interface ResolutionCache {
  startRecordingFilesWithChangedResolutions(): void;
  finishRecordingFilesWithChangedResolutions(): qt.Path[] | undefined;
  resolveModuleNames(moduleNames: string[], containingFile: string, reusedNames: string[] | undefined, redirectedReference?: qt.ResolvedProjectReference): (ResolvedModuleFull | undefined)[];
  getResolvedModuleWithFailedLookupLocationsFromCache(moduleName: string, containingFile: string): CachedResolvedModuleWithFailedLookupLocations | undefined;
  resolveTypeReferenceDirectives(typeDirectiveNames: string[], containingFile: string, redirectedReference?: qt.ResolvedProjectReference): (ResolvedTypeReferenceDirective | undefined)[];
  invalidateResolutionOfFile(filePath: qt.Path): void;
  removeResolutionsOfFile(filePath: qt.Path): void;
  removeResolutionsFromProjectReferenceRedirects(filePath: qt.Path): void;
  setFilesWithInvalidatedNonRelativeUnresolvedImports(filesWithUnresolvedImports: Map<readonly string[]>): void;
  createHasInvalidatedResolution(forceAllFilesAsInvalidated?: boolean): qt.HasInvalidatedResolution;
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
  files?: qt.Path[];
}
interface ResolutionWithResolvedFileName {
  resolvedFileName: string | undefined;
}
interface CachedResolvedModuleWithFailedLookupLocations extends qt.ResolvedModuleWithFailedLookupLocations, ResolutionWithFailedLookupLocations {}
interface CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations extends qt.ResolvedTypeReferenceDirectiveWithFailedLookupLocations, ResolutionWithFailedLookupLocations {}
export interface ResolutionCacheHost extends qt.ModuleResolutionHost {
  toPath(fileName: string): qt.Path;
  getCanonicalFileName: GetCanonicalFileName;
  getCompilationSettings(): qt.CompilerOpts;
  watchDirectoryOfFailedLookupLocation(directory: string, cb: DirectoryWatcherCallback, flags: WatchDirectoryFlags): FileWatcher;
  onInvalidatedResolution(): void;
  watchTypeRootsDirectory(directory: string, cb: DirectoryWatcherCallback, flags: WatchDirectoryFlags): FileWatcher;
  onChangedAutomaticTypeDirectiveNames(): void;
  getCachedDirectoryStructureHost(): CachedDirectoryStructureHost | undefined;
  projectName?: string;
  getGlobalCache?(): string | undefined;
  globalCacheResolutionModuleName?(externalModuleName: string): string;
  writeLog(s: string): void;
  getCurrentProgram(): qt.Program | undefined;
  fileIsOpen(filePath: qt.Path): boolean;
  getCompilerHost?(): qt.CompilerHost | undefined;
}
interface DirectoryWatchesOfFailedLookup {
  watcher: FileWatcher;
  refCount: number;
  nonRecursive?: boolean;
}
interface DirectoryOfFailedLookupWatch {
  dir: string;
  dirPath: qt.Path;
  nonRecursive?: boolean;
}
export function removeIgnoredPath(path: qt.Path): qt.Path | undefined {
  if (endsWith(path, '/node_modules/.staging')) return removeSuffix(path, '/.staging') as qt.Path;
  return some(ignoredPaths, (searchPath) => qu.stringContains(path, searchPath)) ? undefined : path;
}
export function canWatchDirectory(dirPath: qt.Path) {
  const rootLength = getRootLength(dirPath);
  if (dirPath.length === rootLength) return false;
  let nextDirectorySeparator = dirPath.indexOf(dirSeparator, rootLength);
  if (nextDirectorySeparator === -1) return false;
  let pathPartForUserCheck = dirPath.substring(rootLength, nextDirectorySeparator + 1);
  const isNonDirectorySeparatorRoot = rootLength > 1 || dirPath.charCodeAt(0) !== Codes.slash;
  if (isNonDirectorySeparatorRoot && dirPath.search(/[a-zA-Z]:/) !== 0 && pathPartForUserCheck.search(/[a-zA-z]\$\//)) {
    nextDirectorySeparator = dirPath.indexOf(dirSeparator, nextDirectorySeparator + 1);
    if (nextDirectorySeparator === -1) return false;
    pathPartForUserCheck = dirPath.substring(rootLength + pathPartForUserCheck.length, nextDirectorySeparator + 1);
  }
  if (isNonDirectorySeparatorRoot && pathPartForUserCheck.search(/users\//)) return true;
  for (let searchIndex = nextDirectorySeparator + 1, searchLevels = 2; searchLevels > 0; searchLevels--) {
    searchIndex = dirPath.indexOf(dirSeparator, searchIndex) + 1;
    if (searchIndex === 0) return false;
  }
  return true;
}
type GetResolutionWithResolvedFileName<
  T extends ResolutionWithFailedLookupLocations = ResolutionWithFailedLookupLocations,
  R extends ResolutionWithResolvedFileName = ResolutionWithResolvedFileName
> = (resolution: T) => R | undefined;
export function createResolutionCache(resolutionHost: ResolutionCacheHost, rootDirForResolution: string | undefined, logChangesWhenResolvingModule: boolean): ResolutionCache {
  let filesWithChangedSetOfUnresolvedImports: qt.Path[] | undefined;
  let filesWithInvalidatedResolutions: Map<true> | undefined;
  let filesWithInvalidatedNonRelativeUnresolvedImports: ReadonlyMap<readonly string[]> | undefined;
  const nonRelativeExternalModuleResolutions = new MultiMap<ResolutionWithFailedLookupLocations>();
  const resolutionsWithFailedLookups: ResolutionWithFailedLookupLocations[] = [];
  const resolvedFileToResolution = new MultiMap<ResolutionWithFailedLookupLocations>();
  const getCurrentDirectory = memoize(() => resolutionHost.getCurrentDirectory!());
  const cachedDirectoryStructureHost = resolutionHost.getCachedDirectoryStructureHost();
  const resolvedModuleNames = qu.createMap<Map<CachedResolvedModuleWithFailedLookupLocations>>();
  const perDirectoryResolvedModuleNames: CacheWithRedirects<Map<CachedResolvedModuleWithFailedLookupLocations>> = createCacheWithRedirects();
  const nonRelativeModuleNameCache: CacheWithRedirects<PerModuleNameCache> = createCacheWithRedirects();
  const moduleResolutionCache = createModuleResolutionCacheWithMaps(perDirectoryResolvedModuleNames, nonRelativeModuleNameCache, getCurrentDirectory(), resolutionHost.getCanonicalFileName);
  const resolvedTypeReferenceDirectives = qu.createMap<Map<CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations>>();
  const perDirectoryResolvedTypeReferenceDirectives: CacheWithRedirects<Map<CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations>> = createCacheWithRedirects();
  const failedLookupDefaultExtensions = [Extension.Ts, qt.Extension.Tsx, qt.Extension.Js, qt.Extension.Jsx, qt.Extension.Json];
  const customFailedLookupPaths = qu.createMap<number>();
  const directoryWatchesOfFailedLookups = qu.createMap<DirectoryWatchesOfFailedLookup>();
  const rootDir = rootDirForResolution && removeTrailingDirectorySeparator(getNormalizedAbsolutePath(rootDirForResolution, getCurrentDirectory()));
  const rootPath = (rootDir && resolutionHost.toPath(rootDir)) as qt.Path;
  const rootSplitLength = rootPath !== undefined ? rootPath.split(dirSeparator).length : 0;
  const typeRootsWatches = qu.createMap<FileWatcher>();
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
  function getResolvedModule(r: CachedResolvedModuleWithFailedLookupLocations) {
    return r.resolvedModule;
  }
  function getResolvedTypeReferenceDirective(r: CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations) {
    return r.resolvedTypeReferenceDirective;
  }
  function isInDirectoryPath(dir: qt.Path | undefined, file: qt.Path) {
    if (dir === undefined || file.length <= dir.length) return false;
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
  function isFileWithInvalidatedNonRelativeUnresolvedImports(path: qt.Path): boolean {
    if (!filesWithInvalidatedNonRelativeUnresolvedImports) return false;
    const value = filesWithInvalidatedNonRelativeUnresolvedImports.get(path);
    return !!value && !!value.length;
  }
  function createHasInvalidatedResolution(forceAllFilesAsInvalidated?: boolean): qt.HasInvalidatedResolution {
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
    compilerOpts: qt.CompilerOpts,
    host: qt.ModuleResolutionHost,
    redirectedReference?: qt.ResolvedProjectReference
  ): CachedResolvedModuleWithFailedLookupLocations {
    const primaryResult = qnr.resolveModuleName(moduleName, containingFile, compilerOpts, host, moduleResolutionCache, redirectedReference);
    if (!resolutionHost.getGlobalCache) return primaryResult;
    const globalCache = resolutionHost.getGlobalCache();
    if (globalCache !== undefined && !isExternalModuleNameRelative(moduleName) && !(primaryResult.resolvedModule && extensionIsTS(primaryResult.resolvedModule.extension))) {
      const { resolvedModule, failedLookupLocations } = loadModuleFromGlobalCache(
        qf.check.defined(resolutionHost.globalCacheResolutionModuleName)(moduleName),
        resolutionHost.projectName,
        compilerOpts,
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
    redirectedReference: qt.ResolvedProjectReference | undefined;
    cache: Map<Map<T>>;
    perDirectoryCacheWithRedirects: CacheWithRedirects<Map<T>>;
    loader: (name: string, containingFile: string, opts: qt.CompilerOpts, host: qt.ModuleResolutionHost, redirectedReference?: qt.ResolvedProjectReference) => T;
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
    const resolutionsInFile = cache.get(path) || cache.set(path, qu.createMap()).get(path)!;
    const dirPath = getDirectoryPath(path);
    const perDirectoryCache = perDirectoryCacheWithRedirects.getOrCreateMapOfCacheRedirects(redirectedReference);
    let perDirectoryResolution = perDirectoryCache.get(dirPath);
    if (!perDirectoryResolution) {
      perDirectoryResolution = qu.createMap();
      perDirectoryCache.set(dirPath, perDirectoryResolution);
    }
    const resolvedModules: (R | undefined)[] = [];
    const compilerOpts = resolutionHost.getCompilationSettings();
    const hasInvalidatedNonRelativeUnresolvedImport = logChanges && isFileWithInvalidatedNonRelativeUnresolvedImports(path);
    const program = resolutionHost.getCurrentProgram();
    const oldRedirect = program && program.getResolvedProjectReferenceToRedirect(containingFile);
    const unmatchedRedirects = oldRedirect ? !redirectedReference || redirectedReference.sourceFile.path !== oldRedirect.sourceFile.path : !!redirectedReference;
    const seenNamesInFile = qu.createMap<true>();
    for (const name of names) {
      let resolution = resolutionsInFile.get(name);
      if (
        (!seenNamesInFile.has(name) && unmatchedRedirects) ||
        !resolution ||
        resolution.isInvalidated ||
        (hasInvalidatedNonRelativeUnresolvedImport && !isExternalModuleNameRelative(name) && shouldRetryResolution(resolution))
      ) {
        const existingResolution = resolution;
        const resolutionInDirectory = perDirectoryResolution.get(name);
        if (resolutionInDirectory) {
          resolution = resolutionInDirectory;
        } else {
          resolution = loader(name, containingFile, compilerOpts, resolutionHost.getCompilerHost?.() || resolutionHost, redirectedReference);
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
      qf.assert.true(resolution !== undefined && !resolution.isInvalidated);
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
      if (oldResolution === newResolution) return true;
      if (!oldResolution || !newResolution) return false;
      const oldResult = getResolutionWithResolvedFileName(oldResolution);
      const newResult = getResolutionWithResolvedFileName(newResolution);
      if (oldResult === newResult) return true;
      if (!oldResult || !newResult) return false;
      return oldResult.resolvedFileName === newResult.resolvedFileName;
    }
  }
  function resolveTypeReferenceDirectives(typeDirectiveNames: string[], containingFile: string, redirectedReference?: qt.ResolvedProjectReference): (ResolvedTypeReferenceDirective | undefined)[] {
    return resolveNamesWithLocalCache<CachedResolvedTypeReferenceDirectiveWithFailedLookupLocations, qt.ResolvedTypeReferenceDirective>({
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
  function resolveModuleNames(moduleNames: string[], containingFile: string, reusedNames: string[] | undefined, redirectedReference?: qt.ResolvedProjectReference): (ResolvedModuleFull | undefined)[] {
    return resolveNamesWithLocalCache<CachedResolvedModuleWithFailedLookupLocations, qt.ResolvedModuleFull>({
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
  function isNodeModulesAtTypesDirectory(dirPath: qt.Path) {
    return endsWith(dirPath, '/node_modules/@types');
  }
  function getDirectoryToWatchFailedLookupLocation(failedLookupLocation: string, failedLookupLocationPath: qt.Path): DirectoryOfFailedLookupWatch | undefined {
    if (isInDirectoryPath(rootPath, failedLookupLocationPath)) {
      failedLookupLocation = isRootedDiskPath(failedLookupLocation) ? normalizePath(failedLookupLocation) : getNormalizedAbsolutePath(failedLookupLocation, getCurrentDirectory());
      const failedLookupPathSplit = failedLookupLocationPath.split(dirSeparator);
      const failedLookupSplit = failedLookupLocation.split(dirSeparator);
      qf.assert.true(failedLookupSplit.length === failedLookupPathSplit.length, `FailedLookup: ${failedLookupLocation} failedLookupLocationPath: ${failedLookupLocationPath}`);
      if (failedLookupPathSplit.length > rootSplitLength + 1) {
        return {
          dir: failedLookupSplit.slice(0, rootSplitLength + 1).join(dirSeparator),
          dirPath: failedLookupPathSplit.slice(0, rootSplitLength + 1).join(dirSeparator) as qt.Path,
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
  function getDirectoryToWatchFromFailedLookupLocationDirectory(dir: string, dirPath: qt.Path): DirectoryOfFailedLookupWatch | undefined {
    while (pathContainsNodeModules(dirPath)) {
      dir = getDirectoryPath(dir);
      dirPath = getDirectoryPath(dirPath);
    }
    if (isNodeModulesDirectory(dirPath)) return canWatchDirectory(getDirectoryPath(dirPath)) ? { dir, dirPath } : undefined;
    let nonRecursive = true;
    let subDirectoryPath: qt.Path | undefined, subDirectory: string | undefined;
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
  function isPathWithDefaultFailedLookupExtension(path: qt.Path) {
    return fileExtensionIsOneOf(path, failedLookupDefaultExtensions);
  }
  function watchFailedLookupLocationsOfExternalModuleResolutions<T extends ResolutionWithFailedLookupLocations, R extends ResolutionWithResolvedFileName>(
    name: string,
    resolution: T,
    filePath: qt.Path,
    getResolutionWithResolvedFileName: GetResolutionWithResolvedFileName<T, R>
  ) {
    if (resolution.refCount) {
      resolution.refCount++;
      Debug.assertDefined(resolution.files);
    } else {
      resolution.refCount = 1;
      qf.assert.true(resolution.files === undefined);
      if (isExternalModuleNameRelative(name)) {
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
    qf.assert.true(!!resolution.refCount);
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
          qf.assert.true(!nonRecursive);
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
  function setDirectoryWatcher(dir: string, dirPath: qt.Path, nonRecursive?: boolean) {
    const dirWatcher = directoryWatchesOfFailedLookups.get(dirPath);
    if (dirWatcher) {
      qf.assert.true(!!nonRecursive === !!dirWatcher.nonRecursive);
      dirWatcher.refCount++;
    } else {
      directoryWatchesOfFailedLookups.set(dirPath, { watcher: createDirectoryWatcher(dir, dirPath, nonRecursive), refCount: 1, nonRecursive });
    }
  }
  function stopWatchFailedLookupLocationOfResolution<T extends ResolutionWithFailedLookupLocations, R extends ResolutionWithResolvedFileName>(
    resolution: T,
    filePath: qt.Path,
    getResolutionWithResolvedFileName: GetResolutionWithResolvedFileName<T, R>
  ) {
    qu.unorderedRemoveItem(Debug.assertDefined(resolution.files), filePath);
    resolution.refCount!--;
    if (resolution.refCount) {
      return;
    }
    const resolved = getResolutionWithResolvedFileName(resolution);
    if (resolved && resolved.resolvedFileName) {
      resolvedFileToResolution.remove(resolutionHost.toPath(resolved.resolvedFileName), resolution);
    }
    if (!qu.unorderedRemoveItem(resolutionsWithFailedLookups, resolution)) {
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
            qf.assert.true(refCount > 1);
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
  function createDirectoryWatcher(directory: string, dirPath: qt.Path, nonRecursive: boolean | undefined) {
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
    filePath: qt.Path,
    getResolutionWithResolvedFileName: GetResolutionWithResolvedFileName<T, R>
  ) {
    const resolutions = cache.get(filePath);
    if (resolutions) {
      resolutions.forEach((resolution) => stopWatchFailedLookupLocationOfResolution(resolution, filePath, getResolutionWithResolvedFileName));
      cache.delete(filePath);
    }
  }
  function removeResolutionsFromProjectReferenceRedirects(filePath: qt.Path) {
    if (!fileExtensionIs(filePath, qt.Extension.Json)) {
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
  function removeResolutionsOfFile(filePath: qt.Path) {
    removeResolutionsOfFileFromCache(resolvedModuleNames, filePath, getResolvedModule);
    removeResolutionsOfFileFromCache(resolvedTypeReferenceDirectives, filePath, getResolvedTypeReferenceDirective);
  }
  function invalidateResolution(resolution: ResolutionWithFailedLookupLocations) {
    resolution.isInvalidated = true;
    let changedInAutoTypeReferenced = false;
    for (const containingFilePath of Debug.assertDefined(resolution.files)) {
      (filesWithInvalidatedResolutions || (filesWithInvalidatedResolutions = qu.createMap<true>())).set(containingFilePath, true);
      changedInAutoTypeReferenced = changedInAutoTypeReferenced || containingFilePath.endsWith(inferredTypesContainingFile);
    }
    if (changedInAutoTypeReferenced) {
      resolutionHost.onChangedAutomaticTypeDirectiveNames();
    }
  }
  function invalidateResolutionOfFile(filePath: qt.Path) {
    removeResolutionsOfFile(filePath);
    forEach(resolvedFileToResolution.get(filePath), invalidateResolution);
  }
  function setFilesWithInvalidatedNonRelativeUnresolvedImports(filesMap: ReadonlyMap<readonly string[]>) {
    qf.assert.true(filesWithInvalidatedNonRelativeUnresolvedImports === filesMap || filesWithInvalidatedNonRelativeUnresolvedImports === undefined);
    filesWithInvalidatedNonRelativeUnresolvedImports = filesMap;
  }
  function invalidateResolutionOfFailedLookupLocation(fileOrDirectoryPath: qt.Path, isCreatingWatchedDirectory: boolean) {
    let isChangedFailedLookupLocation: (location: string) => boolean;
    if (isCreatingWatchedDirectory) {
      isChangedFailedLookupLocation = (location) => isInDirectoryPath(fileOrDirectoryPath, resolutionHost.toPath(location));
    } else {
      const updatedPath = removeIgnoredPath(fileOrDirectoryPath);
      if (!updatedPath) return false;
      fileOrDirectoryPath = updatedPath;
      if (resolutionHost.fileIsOpen(fileOrDirectoryPath)) return false;
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
        if (!isPathWithDefaultFailedLookupExtension(fileOrDirectoryPath) && !customFailedLookupPaths.has(fileOrDirectoryPath)) return false;
        if (isEmittedFileOfProgram(resolutionHost.getCurrentProgram(), fileOrDirectoryPath)) return false;
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
  function getDirectoryToWatchFailedLookupLocationFromTypeRoot(typeRoot: string, typeRootPath: qt.Path): qt.Path | undefined {
    if (isInDirectoryPath(rootPath, typeRootPath)) return rootPath;
    const toWatch = getDirectoryToWatchFromFailedLookupLocationDirectory(typeRoot, typeRootPath);
    return toWatch && directoryWatchesOfFailedLookups.has(toWatch.dirPath) ? toWatch.dirPath : undefined;
  }
  function createTypeRootsWatch(typeRootPath: qt.Path, typeRoot: string): FileWatcher {
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
    const opts = resolutionHost.getCompilationSettings();
    if (opts.types) {
      closeTypeRootsWatch();
      return;
    }
    const typeRoots = getEffectiveTypeRoots(opts, { directoryExists: directoryExistsForTypeRootWatch, getCurrentDirectory });
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
