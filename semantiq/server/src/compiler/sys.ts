import { Node } from './types';
import { qf } from './core';
import { Syntax } from './syntax';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
declare function setTimeout(handler: (...args: any[]) => void, timeout: number): any;
declare function clearTimeout(handle: any): void;
export function generateDjb2Hash(data: string): string {
  let acc = 5381;
  for (let i = 0; i < data.length; i++) {
    acc = (acc << 5) + acc + data.charCodeAt(i);
  }
  return acc.toString();
}
export function setStackTraceLimit() {
  if ((Error as any).stackTraceLimit < 100) {
    (Error as any).stackTraceLimit = 100;
  }
}
export enum FileWatcherEventKind {
  Created,
  Changed,
  Deleted,
}
export type FileWatcherCallback = (fileName: string, eventKind: FileWatcherEventKind) => void;
export type DirectoryWatcherCallback = (fileName: string) => void;
export interface WatchedFile {
  readonly fileName: string;
  readonly callback: FileWatcherCallback;
  mtime: Date;
}
export enum PollingInterval {
  High = 2000,
  Medium = 500,
  Low = 250,
}
export type HostWatchFile = (fileName: string, callback: FileWatcherCallback, pollingInterval: PollingInterval, opts: WatchOpts | undefined) => FileWatcher;
export type HostWatchDirectory = (fileName: string, callback: DirectoryWatcherCallback, recursive: boolean, opts: WatchOpts | undefined) => FileWatcher;
export const missingFileModifiedTime = new Date(0);
interface Levels {
  Low: number;
  Medium: number;
  High: number;
}
function createPollingIntervalBasedLevels(levels: Levels) {
  return {
    [PollingInterval.Low]: levels.Low,
    [PollingInterval.Medium]: levels.Medium,
    [PollingInterval.High]: levels.High,
  };
}
const defaultChunkLevels: Levels = { Low: 32, Medium: 64, High: 256 };
let pollingChunkSize = createPollingIntervalBasedLevels(defaultChunkLevels);
export let unchangedPollThresholds = createPollingIntervalBasedLevels(defaultChunkLevels);
export function setCustomPollingValues(system: System) {
  if (!system.getEnvironmentVariable) {
    return;
  }
  const pollingIntervalChanged = setCustomLevels('TSC_WATCH_POLLINGINTERVAL', PollingInterval);
  pollingChunkSize = getCustomPollingBasedLevels('TSC_WATCH_POLLINGCHUNKSIZE', defaultChunkLevels) || pollingChunkSize;
  unchangedPollThresholds = getCustomPollingBasedLevels('TSC_WATCH_UNCHANGEDPOLLTHRESHOLDS', defaultChunkLevels) || unchangedPollThresholds;
  function getLevel(envVar: string, level: keyof Levels) {
    return system.getEnvironmentVariable(`${envVar}_${level.toUpperCase()}`);
  }
  function getCustomLevels(baseVariable: string) {
    let customLevels: Partial<Levels> | undefined;
    setCustomLevel('Low');
    setCustomLevel('Medium');
    setCustomLevel('High');
    return customLevels;
    function setCustomLevel(level: keyof Levels) {
      const customLevel = getLevel(baseVariable, level);
      if (customLevel) {
        (customLevels || (customLevels = {}))[level] = Number(customLevel);
      }
    }
  }
  function setCustomLevels(baseVariable: string, levels: Levels) {
    const customLevels = getCustomLevels(baseVariable);
    if (customLevels) {
      setLevel('Low');
      setLevel('Medium');
      setLevel('High');
      return true;
    }
    return false;
    function setLevel(level: keyof Levels) {
      levels[level] = customLevels![level] || levels[level];
    }
  }
  function getCustomPollingBasedLevels(baseVariable: string, defaultLevels: Levels) {
    const customLevels = getCustomLevels(baseVariable);
    return (pollingIntervalChanged || customLevels) && createPollingIntervalBasedLevels(customLevels ? { ...defaultLevels, ...customLevels } : defaultLevels);
  }
}
export function createDynamicPriorityPollingWatchFile(host: { getModifiedTime: NonNullable<System['getModifiedTime']>; setTimeout: NonNullable<System['setTimeout']> }): HostWatchFile {
  interface WatchedFile extends qnr.WatchedFile {
    isClosed?: boolean;
    unchangedPolls: number;
  }
  interface PollingIntervalQueue extends Array<WatchedFile> {
    pollingInterval: PollingInterval;
    pollIndex: number;
    pollScheduled: boolean;
  }
  const watchedFiles: WatchedFile[] = [];
  const changedFilesInLastPoll: WatchedFile[] = [];
  const lowPollingIntervalQueue = createPollingIntervalQueue(PollingInterval.Low);
  const mediumPollingIntervalQueue = createPollingIntervalQueue(PollingInterval.Medium);
  const highPollingIntervalQueue = createPollingIntervalQueue(PollingInterval.High);
  return watchFile;
  function watchFile(fileName: string, callback: FileWatcherCallback, defaultPollingInterval: PollingInterval): FileWatcher {
    const file: WatchedFile = {
      fileName,
      callback,
      unchangedPolls: 0,
      mtime: getModifiedTime(fileName),
    };
    watchedFiles.push(file);
    addToPollingIntervalQueue(file, defaultPollingInterval);
    return {
      close: () => {
        file.isClosed = true;
        unorderedRemoveItem(watchedFiles, file);
      },
    };
  }
  function createPollingIntervalQueue(pollingInterval: PollingInterval): PollingIntervalQueue {
    const queue = ([] as WatchedFile[]) as PollingIntervalQueue;
    queue.pollingInterval = pollingInterval;
    queue.pollIndex = 0;
    queue.pollScheduled = false;
    return queue;
  }
  function pollPollingIntervalQueue(queue: PollingIntervalQueue) {
    queue.pollIndex = pollQueue(queue, queue.pollingInterval, queue.pollIndex, pollingChunkSize[queue.pollingInterval]);
    if (queue.length) {
      scheduleNextPoll(queue.pollingInterval);
    } else {
      assert(queue.pollIndex === 0);
      queue.pollScheduled = false;
    }
  }
  function pollLowPollingIntervalQueue(queue: PollingIntervalQueue) {
    pollQueue(changedFilesInLastPoll, PollingInterval.Low, 0, changedFilesInLastPoll.length);
    pollPollingIntervalQueue(queue);
    if (!queue.pollScheduled && changedFilesInLastPoll.length) {
      scheduleNextPoll(PollingInterval.Low);
    }
  }
  function pollQueue(queue: (WatchedFile | undefined)[], pollingInterval: PollingInterval, pollIndex: number, chunkSize: number) {
    let needsVisit = queue.length;
    let definedValueCopyToIndex = pollIndex;
    for (let polled = 0; polled < chunkSize && needsVisit > 0; nextPollIndex(), needsVisit--) {
      const watchedFile = queue[pollIndex];
      if (!watchedFile) {
        continue;
      } else if (watchedFile.isClosed) {
        queue[pollIndex] = undefined;
        continue;
      }
      polled++;
      const fileChanged = onWatchedFileStat(watchedFile, getModifiedTime(watchedFile.fileName));
      if (watchedFile.isClosed) {
        queue[pollIndex] = undefined;
      } else if (fileChanged) {
        watchedFile.unchangedPolls = 0;
        if (queue !== changedFilesInLastPoll) {
          queue[pollIndex] = undefined;
          addChangedFileToLowPollingIntervalQueue(watchedFile);
        }
      } else if (watchedFile.unchangedPolls !== unchangedPollThresholds[pollingInterval]) {
        watchedFile.unchangedPolls++;
      } else if (queue === changedFilesInLastPoll) {
        watchedFile.unchangedPolls = 1;
        queue[pollIndex] = undefined;
        addToPollingIntervalQueue(watchedFile, PollingInterval.Low);
      } else if (pollingInterval !== PollingInterval.High) {
        watchedFile.unchangedPolls++;
        queue[pollIndex] = undefined;
        addToPollingIntervalQueue(watchedFile, pollingInterval === PollingInterval.Low ? PollingInterval.Medium : PollingInterval.High);
      }
      if (queue[pollIndex]) {
        if (definedValueCopyToIndex < pollIndex) {
          queue[definedValueCopyToIndex] = watchedFile;
          queue[pollIndex] = undefined;
        }
        definedValueCopyToIndex++;
      }
    }
    return pollIndex;
    function nextPollIndex() {
      pollIndex++;
      if (pollIndex === queue.length) {
        if (definedValueCopyToIndex < pollIndex) {
          queue.length = definedValueCopyToIndex;
        }
        pollIndex = 0;
        definedValueCopyToIndex = 0;
      }
    }
  }
  function pollingIntervalQueue(pollingInterval: PollingInterval) {
    switch (pollingInterval) {
      case PollingInterval.Low:
        return lowPollingIntervalQueue;
      case PollingInterval.Medium:
        return mediumPollingIntervalQueue;
      case PollingInterval.High:
        return highPollingIntervalQueue;
    }
  }
  function addToPollingIntervalQueue(file: WatchedFile, pollingInterval: PollingInterval) {
    pollingIntervalQueue(pollingInterval).push(file);
    scheduleNextPollIfNotAlreadyScheduled(pollingInterval);
  }
  function addChangedFileToLowPollingIntervalQueue(file: WatchedFile) {
    changedFilesInLastPoll.push(file);
    scheduleNextPollIfNotAlreadyScheduled(PollingInterval.Low);
  }
  function scheduleNextPollIfNotAlreadyScheduled(pollingInterval: PollingInterval) {
    if (!pollingIntervalQueue(pollingInterval).pollScheduled) {
      scheduleNextPoll(pollingInterval);
    }
  }
  function scheduleNextPoll(pollingInterval: PollingInterval) {
    pollingIntervalQueue(pollingInterval).pollScheduled = host.setTimeout(
      pollingInterval === PollingInterval.Low ? pollLowPollingIntervalQueue : pollPollingIntervalQueue,
      pollingInterval,
      pollingIntervalQueue(pollingInterval)
    );
  }
  function getModifiedTime(fileName: string) {
    return host.getModifiedTime(fileName) || missingFileModifiedTime;
  }
}
function createUseFsEventsOnParentDirectoryWatchFile(fsWatch: FsWatch, useCaseSensitiveFileNames: boolean): HostWatchFile {
  const fileWatcherCallbacks = new MultiMap<FileWatcherCallback>();
  const dirWatchers = createMap<DirectoryWatcher>();
  const toCanonicalName = createGetCanonicalFileName(useCaseSensitiveFileNames);
  return nonPollingWatchFile;
  function nonPollingWatchFile(fileName: string, callback: FileWatcherCallback, _pollingInterval: PollingInterval, fallbackOpts: WatchOpts | undefined): FileWatcher {
    const filePath = toCanonicalName(fileName);
    fileWatcherCallbacks.add(filePath, callback);
    const dirPath = getDirectoryPath(filePath) || '.';
    const watcher = dirWatchers.get(dirPath) || createDirectoryWatcher(getDirectoryPath(fileName) || '.', dirPath, fallbackOpts);
    watcher.referenceCount++;
    return {
      close: () => {
        if (watcher.referenceCount === 1) {
          watcher.close();
          dirWatchers.delete(dirPath);
        } else {
          watcher.referenceCount--;
        }
        fileWatcherCallbacks.remove(filePath, callback);
      },
    };
  }
  function createDirectoryWatcher(dirName: string, dirPath: string, fallbackOpts: WatchOpts | undefined) {
    const watcher = fsWatch(
      dirName,
      FileSystemEntryKind.Directory,
      (_eventName: string, relativeFileName) => {
        if (!isString(relativeFileName)) {
          return;
        }
        const fileName = getNormalizedAbsolutePath(relativeFileName, dirName);
        const callbacks = fileName && fileWatcherCallbacks.get(toCanonicalName(fileName));
        if (callbacks) {
          for (const fileCallback of callbacks) {
            fileCallback(fileName, FileWatcherEventKind.Changed);
          }
        }
      },
      false,
      PollingInterval.Medium,
      fallbackOpts
    ) as DirectoryWatcher;
    watcher.referenceCount = 0;
    dirWatchers.set(dirPath, watcher);
    return watcher;
  }
}
export function createSingleFileWatcherPerName(watchFile: HostWatchFile, useCaseSensitiveFileNames: boolean): HostWatchFile {
  interface SingleFileWatcher {
    watcher: FileWatcher;
    refCount: number;
  }
  const cache = createMap<SingleFileWatcher>();
  const callbacksCache = new MultiMap<FileWatcherCallback>();
  const toCanonicalFileName = createGetCanonicalFileName(useCaseSensitiveFileNames);
  return (fileName, callback, pollingInterval, opts) => {
    const path = toCanonicalFileName(fileName);
    const existing = cache.get(path);
    if (existing) {
      existing.refCount++;
    } else {
      cache.set(path, {
        watcher: watchFile(fileName, (fileName, eventKind) => forEach(callbacksCache.get(path), (cb) => cb(fileName, eventKind)), pollingInterval, opts),
        refCount: 1,
      });
    }
    callbacksCache.add(path, callback);
    return {
      close: () => {
        const watcher = Debug.checkDefined(cache.get(path));
        callbacksCache.remove(path, callback);
        watcher.refCount--;
        if (watcher.refCount) return;
        cache.delete(path);
        closeFileWatcherOf(watcher);
      },
    };
  };
}
export function onWatchedFileStat(watchedFile: WatchedFile, modifiedTime: Date): boolean {
  const oldTime = watchedFile.mtime.getTime();
  const newTime = modifiedTime.getTime();
  if (oldTime !== newTime) {
    watchedFile.mtime = modifiedTime;
    watchedFile.callback(watchedFile.fileName, getFileWatcherEventKind(oldTime, newTime));
    return true;
  }
  return false;
}
export function getFileWatcherEventKind(oldTime: number, newTime: number) {
  return oldTime === 0 ? FileWatcherEventKind.Created : newTime === 0 ? FileWatcherEventKind.Deleted : FileWatcherEventKind.Changed;
}
export const ignoredPaths = ['/node_modules/.', '/.git', '/.#'];
export let sysLog: (s: string) => void = noop;
export function setSysLog(logger: typeof sysLog) {
  sysLog = logger;
}
export interface RecursiveDirectoryWatcherHost {
  watchDirectory: HostWatchDirectory;
  useCaseSensitiveFileNames: boolean;
  getAccessibleSortedChildDirectories(path: string): readonly string[];
  directoryExists(dir: string): boolean;
  realpath(s: string): string;
  setTimeout: NonNullable<System['setTimeout']>;
  clearTimeout: NonNullable<System['clearTimeout']>;
}
export function createDirectoryWatcherSupportingRecursive(host: RecursiveDirectoryWatcherHost): HostWatchDirectory {
  interface ChildDirectoryWatcher extends FileWatcher {
    dirName: string;
  }
  type ChildWatches = readonly ChildDirectoryWatcher[];
  interface HostDirectoryWatcher {
    watcher: FileWatcher;
    childWatches: ChildWatches;
    refCount: number;
  }
  const cache = createMap<HostDirectoryWatcher>();
  const callbackCache = new MultiMap<{ dirName: string; callback: DirectoryWatcherCallback }>();
  const cacheToUpdateChildWatches = createMap<{ dirName: string; opts: WatchOpts | undefined }>();
  let timerToUpdateChildWatches: any;
  const filePathComparer = getStringComparer(!host.useCaseSensitiveFileNames);
  const toCanonicalFilePath = createGetCanonicalFileName(host.useCaseSensitiveFileNames);
  return (dirName, callback, recursive, opts) => (recursive ? createDirectoryWatcher(dirName, opts, callback) : host.watchDirectory(dirName, callback, recursive, opts));
  function createDirectoryWatcher(dirName: string, opts: WatchOpts | undefined, callback?: DirectoryWatcherCallback): ChildDirectoryWatcher {
    const dirPath = toCanonicalFilePath(dirName) as Path;
    let directoryWatcher = cache.get(dirPath);
    if (directoryWatcher) {
      directoryWatcher.refCount++;
    } else {
      directoryWatcher = {
        watcher: host.watchDirectory(
          dirName,
          (fileName) => {
            if (isIgnoredPath(fileName)) return;
            if (opts?.synchronousWatchDirectory) {
              invokeCallbacks(dirPath, fileName);
              updateChildWatches(dirName, dirPath, opts);
            } else {
              nonSyncUpdateChildWatches(dirName, dirPath, fileName, opts);
            }
          },
          false,
          opts
        ),
        refCount: 1,
        childWatches: emptyArray,
      };
      cache.set(dirPath, directoryWatcher);
      updateChildWatches(dirName, dirPath, opts);
    }
    const callbackToAdd = callback && { dirName, callback };
    if (callbackToAdd) {
      callbackCache.add(dirPath, callbackToAdd);
    }
    return {
      dirName,
      close: () => {
        const directoryWatcher = Debug.checkDefined(cache.get(dirPath));
        if (callbackToAdd) callbackCache.remove(dirPath, callbackToAdd);
        directoryWatcher.refCount--;
        if (directoryWatcher.refCount) return;
        cache.delete(dirPath);
        closeFileWatcherOf(directoryWatcher);
        directoryWatcher.childWatches.forEach(closeFileWatcher);
      },
    };
  }
  function invokeCallbacks(dirPath: Path, fileNameOrInvokeMap: string | Map<true>) {
    let fileName: string | undefined;
    let invokeMap: Map<true> | undefined;
    if (isString(fileNameOrInvokeMap)) {
      fileName = fileNameOrInvokeMap;
    } else {
      invokeMap = fileNameOrInvokeMap;
    }
    callbackCache.forEach((callbacks, rootDirName) => {
      if (invokeMap && invokeMap.has(rootDirName)) return;
      if (rootDirName === dirPath || (startsWith(dirPath, rootDirName) && dirPath[rootDirName.length] === dirSeparator)) {
        if (invokeMap) {
          invokeMap.set(rootDirName, true);
        } else {
          callbacks.forEach(({ callback }) => callback(fileName!));
        }
      }
    });
  }
  function nonSyncUpdateChildWatches(dirName: string, dirPath: Path, fileName: string, opts: WatchOpts | undefined) {
    const parentWatcher = cache.get(dirPath);
    if (parentWatcher && host.directoryExists(dirName)) {
      scheduleUpdateChildWatches(dirName, dirPath, opts);
      return;
    }
    invokeCallbacks(dirPath, fileName);
    removeChildWatches(parentWatcher);
  }
  function scheduleUpdateChildWatches(dirName: string, dirPath: Path, opts: WatchOpts | undefined) {
    if (!cacheToUpdateChildWatches.has(dirPath)) {
      cacheToUpdateChildWatches.set(dirPath, { dirName, opts });
    }
    if (timerToUpdateChildWatches) {
      host.clearTimeout(timerToUpdateChildWatches);
      timerToUpdateChildWatches = undefined;
    }
    timerToUpdateChildWatches = host.setTimeout(onTimerToUpdateChildWatches, 1000);
  }
  function onTimerToUpdateChildWatches() {
    timerToUpdateChildWatches = undefined;
    sysLog(`sysLog:: onTimerToUpdateChildWatches:: ${cacheToUpdateChildWatches.size}`);
    const start = timestamp();
    const invokeMap = createMap<true>();
    while (!timerToUpdateChildWatches && cacheToUpdateChildWatches.size) {
      const {
        value: [dirPath, { dirName, opts }],
        done,
      } = cacheToUpdateChildWatches.entries().next();
      assert(!done);
      cacheToUpdateChildWatches.delete(dirPath);
      invokeCallbacks(dirPath as Path, invokeMap);
      updateChildWatches(dirName, dirPath as Path, opts);
    }
    sysLog(`sysLog:: invokingWatchers:: ${timestamp() - start}ms:: ${cacheToUpdateChildWatches.size}`);
    callbackCache.forEach((callbacks, rootDirName) => {
      if (invokeMap.has(rootDirName)) {
        callbacks.forEach(({ callback, dirName }) => callback(dirName));
      }
    });
    const elapsed = timestamp() - start;
    sysLog(`sysLog:: Elapsed ${elapsed}ms:: onTimerToUpdateChildWatches:: ${cacheToUpdateChildWatches.size} ${timerToUpdateChildWatches}`);
  }
  function removeChildWatches(parentWatcher: HostDirectoryWatcher | undefined) {
    if (!parentWatcher) return;
    const existingChildWatches = parentWatcher.childWatches;
    parentWatcher.childWatches = emptyArray;
    for (const childWatcher of existingChildWatches) {
      childWatcher.close();
      removeChildWatches(cache.get(toCanonicalFilePath(childWatcher.dirName)));
    }
  }
  function updateChildWatches(dirName: string, dirPath: Path, opts: WatchOpts | undefined) {
    const parentWatcher = cache.get(dirPath);
    if (parentWatcher) {
      parentWatcher.childWatches = watchChildDirectories(dirName, parentWatcher.childWatches, opts);
    }
  }
  function watchChildDirectories(parentDir: string, existingChildWatches: ChildWatches, opts: WatchOpts | undefined): ChildWatches {
    let newChildWatches: ChildDirectoryWatcher[] | undefined;
    enumerateInsertsAndDeletes<string, ChildDirectoryWatcher>(
      host.directoryExists(parentDir)
        ? mapDefined(host.getAccessibleSortedChildDirectories(parentDir), (child) => {
            const childFullName = getNormalizedAbsolutePath(child, parentDir);
            return !isIgnoredPath(childFullName) && filePathComparer(childFullName, normalizePath(host.realpath(childFullName))) === Comparison.EqualTo ? childFullName : undefined;
          })
        : emptyArray,
      existingChildWatches,
      (child, childWatcher) => filePathComparer(child, childWatcher.dirName),
      createAndAddChildDirectoryWatcher,
      closeFileWatcher,
      addChildDirectoryWatcher
    );
    return newChildWatches || emptyArray;
    function createAndAddChildDirectoryWatcher(childName: string) {
      const result = createDirectoryWatcher(childName, opts);
      addChildDirectoryWatcher(result);
    }
    function addChildDirectoryWatcher(childWatcher: ChildDirectoryWatcher) {
      (newChildWatches || (newChildWatches = [])).push(childWatcher);
    }
  }
  function isIgnoredPath(path: string) {
    return some(ignoredPaths, (searchPath) => isInPath(path, searchPath));
  }
  function isInPath(path: string, searchPath: string) {
    if (qu.stringContains(path, searchPath)) return true;
    if (host.useCaseSensitiveFileNames) return false;
    return qu.stringContains(toCanonicalFilePath(path), searchPath);
  }
}
export type FsWatchCallback = (eventName: 'rename' | 'change', relativeFileName: string | undefined) => void;
export type FsWatch = (
  fileOrDirectory: string,
  entryKind: FileSystemEntryKind,
  callback: FsWatchCallback,
  recursive: boolean,
  fallbackPollingInterval: PollingInterval,
  fallbackOpts: WatchOpts | undefined
) => FileWatcher;
export const enum FileSystemEntryKind {
  File,
  Directory,
}
export function createFileWatcherCallback(callback: FsWatchCallback): FileWatcherCallback {
  return (_fileName, eventKind) => callback(eventKind === FileWatcherEventKind.Changed ? 'change' : 'rename', '');
}
function createFsWatchCallbackForFileWatcherCallback(fileName: string, callback: FileWatcherCallback, fileExists: System['fileExists']): FsWatchCallback {
  return (eventName) => {
    if (eventName === 'rename') {
      callback(fileName, fileExists(fileName) ? FileWatcherEventKind.Created : FileWatcherEventKind.Deleted);
    } else {
      callback(fileName, FileWatcherEventKind.Changed);
    }
  };
}
function createFsWatchCallbackForDirectoryWatcherCallback(directoryName: string, callback: DirectoryWatcherCallback): FsWatchCallback {
  return (eventName, relativeFileName) => {
    if (eventName === 'rename') {
      callback(!relativeFileName ? directoryName : normalizePath(combinePaths(directoryName, relativeFileName)));
    }
  };
}
export interface CreateSystemWatchFunctions {
  pollingWatchFile: HostWatchFile;
  getModifiedTime: NonNullable<System['getModifiedTime']>;
  setTimeout: NonNullable<System['setTimeout']>;
  clearTimeout: NonNullable<System['clearTimeout']>;
  fsWatch: FsWatch;
  fileExists: System['fileExists'];
  useCaseSensitiveFileNames: boolean;
  fsSupportsRecursiveFsWatch: boolean;
  directoryExists: System['directoryExists'];
  getAccessibleSortedChildDirectories(path: string): readonly string[];
  realpath(s: string): string;
  tscWatchFile: string | undefined;
  useNonPollingWatchers?: boolean;
  tscWatchDirectory: string | undefined;
}
export function createSystemWatchFunctions({
  pollingWatchFile,
  getModifiedTime,
  setTimeout,
  clearTimeout,
  fsWatch,
  fileExists,
  useCaseSensitiveFileNames,
  fsSupportsRecursiveFsWatch,
  directoryExists,
  getAccessibleSortedChildDirectories,
  realpath,
  tscWatchFile,
  useNonPollingWatchers,
  tscWatchDirectory,
}: CreateSystemWatchFunctions): { watchFile: HostWatchFile; watchDirectory: HostWatchDirectory } {
  let dynamicPollingWatchFile: HostWatchFile | undefined;
  let nonPollingWatchFile: HostWatchFile | undefined;
  let hostRecursiveDirectoryWatcher: HostWatchDirectory | undefined;
  return {
    watchFile,
    watchDirectory,
  };
  function watchFile(fileName: string, callback: FileWatcherCallback, pollingInterval: PollingInterval, opts: WatchOpts | undefined): FileWatcher {
    opts = updateOptsForWatchFile(opts, useNonPollingWatchers);
    const watchFileKind = Debug.checkDefined(opts.watchFile);
    switch (watchFileKind) {
      case WatchFileKind.FixedPollingInterval:
        return pollingWatchFile(fileName, callback, PollingInterval.Low, undefined);
      case WatchFileKind.PriorityPollingInterval:
        return pollingWatchFile(fileName, callback, pollingInterval, undefined);
      case WatchFileKind.DynamicPriorityPolling:
        return ensureDynamicPollingWatchFile()(fileName, callback, pollingInterval, undefined);
      case WatchFileKind.UseFsEvents:
        return fsWatch(fileName, FileSystemEntryKind.File, createFsWatchCallbackForFileWatcherCallback(fileName, callback, fileExists), false, pollingInterval, getFallbackOpts(opts));
      case WatchFileKind.UseFsEventsOnParentDirectory:
        if (!nonPollingWatchFile) {
          nonPollingWatchFile = createUseFsEventsOnParentDirectoryWatchFile(fsWatch, useCaseSensitiveFileNames);
        }
        return nonPollingWatchFile(fileName, callback, pollingInterval, getFallbackOpts(opts));
      default:
        qc.assert.never(watchFileKind);
    }
  }
  function ensureDynamicPollingWatchFile() {
    return dynamicPollingWatchFile || (dynamicPollingWatchFile = createDynamicPriorityPollingWatchFile({ getModifiedTime, setTimeout }));
  }
  function updateOptsForWatchFile(opts: WatchOpts | undefined, useNonPollingWatchers?: boolean): WatchOpts {
    if (opts && opts.watchFile !== undefined) return opts;
    switch (tscWatchFile) {
      case 'PriorityPollingInterval':
        return { watchFile: WatchFileKind.PriorityPollingInterval };
      case 'DynamicPriorityPolling':
        return { watchFile: WatchFileKind.DynamicPriorityPolling };
      case 'UseFsEvents':
        return generateWatchFileOpts(WatchFileKind.UseFsEvents, PollingWatchKind.PriorityInterval, opts);
      case 'UseFsEventsWithFallbackDynamicPolling':
        return generateWatchFileOpts(WatchFileKind.UseFsEvents, PollingWatchKind.DynamicPriority, opts);
      case 'UseFsEventsOnParentDirectory':
        useNonPollingWatchers = true;
      default:
        return useNonPollingWatchers ? generateWatchFileOpts(WatchFileKind.UseFsEventsOnParentDirectory, PollingWatchKind.PriorityInterval, opts) : { watchFile: WatchFileKind.FixedPollingInterval };
    }
  }
  function generateWatchFileOpts(watchFile: WatchFileKind, fallbackPolling: PollingWatchKind, opts: WatchOpts | undefined): WatchOpts {
    const defaultFallbackPolling = opts?.fallbackPolling;
    return {
      watchFile,
      fallbackPolling: defaultFallbackPolling === undefined ? fallbackPolling : defaultFallbackPolling,
    };
  }
  function watchDirectory(directoryName: string, callback: DirectoryWatcherCallback, recursive: boolean, opts: WatchOpts | undefined): FileWatcher {
    if (fsSupportsRecursiveFsWatch) {
      return fsWatch(directoryName, FileSystemEntryKind.Directory, createFsWatchCallbackForDirectoryWatcherCallback(directoryName, callback), recursive, PollingInterval.Medium, getFallbackOpts(opts));
    }
    if (!hostRecursiveDirectoryWatcher) {
      hostRecursiveDirectoryWatcher = createDirectoryWatcherSupportingRecursive({
        useCaseSensitiveFileNames,
        directoryExists,
        getAccessibleSortedChildDirectories,
        watchDirectory: nonRecursiveWatchDirectory,
        realpath,
        setTimeout,
        clearTimeout,
      });
    }
    return hostRecursiveDirectoryWatcher(directoryName, callback, recursive, opts);
  }
  function nonRecursiveWatchDirectory(directoryName: string, callback: DirectoryWatcherCallback, recursive: boolean, opts: WatchOpts | undefined): FileWatcher {
    assert(!recursive);
    opts = updateOptsForWatchDirectory(opts);
    const watchDirectoryKind = Debug.checkDefined(opts.watchDirectory);
    switch (watchDirectoryKind) {
      case WatchDirectoryKind.FixedPollingInterval:
        return pollingWatchFile(directoryName, () => callback(directoryName), PollingInterval.Medium, undefined);
      case WatchDirectoryKind.DynamicPriorityPolling:
        return ensureDynamicPollingWatchFile()(directoryName, () => callback(directoryName), PollingInterval.Medium, undefined);
      case WatchDirectoryKind.UseFsEvents:
        return fsWatch(
          directoryName,
          FileSystemEntryKind.Directory,
          createFsWatchCallbackForDirectoryWatcherCallback(directoryName, callback),
          recursive,
          PollingInterval.Medium,
          getFallbackOpts(opts)
        );
      default:
        qc.assert.never(watchDirectoryKind);
    }
  }
  function updateOptsForWatchDirectory(opts: WatchOpts | undefined): WatchOpts {
    if (opts && opts.watchDirectory !== undefined) return opts;
    switch (tscWatchDirectory) {
      case 'RecursiveDirectoryUsingFsWatchFile':
        return { watchDirectory: WatchDirectoryKind.FixedPollingInterval };
      case 'RecursiveDirectoryUsingDynamicPriorityPolling':
        return { watchDirectory: WatchDirectoryKind.DynamicPriorityPolling };
      default:
        const defaultFallbackPolling = opts?.fallbackPolling;
        return {
          watchDirectory: WatchDirectoryKind.UseFsEvents,
          fallbackPolling: defaultFallbackPolling !== undefined ? defaultFallbackPolling : undefined,
        };
    }
  }
}
export function patchWriteFileEnsuringDirectory(sys: System) {
  const originalWriteFile = sys.writeFile;
  sys.writeFile = (path, data, writeBom) =>
    writeFileEnsuringDirectories(
      path,
      data,
      !!writeBom,
      (path, data, writeByteOrderMark) => originalWriteFile.call(sys, path, data, writeByteOrderMark),
      (path) => sys.createDirectory(path),
      (path) => sys.directoryExists(path)
    );
}
export type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';
interface NodeBuffer extends Uint8Array {
  constructor: any;
  write(str: string, encoding?: BufferEncoding): number;
  write(str: string, offset: number, encoding?: BufferEncoding): number;
  write(str: string, offset: number, length: number, encoding?: BufferEncoding): number;
  toString(encoding?: string, start?: number, end?: number): string;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(otherBuffer: Uint8Array): boolean;
  compare(otherBuffer: Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number;
  copy(targetBuffer: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  slice(begin?: number, end?: number): Buffer;
  subarray(begin?: number, end?: number): Buffer;
  writeUIntLE(value: number, offset: number, byteLength: number): number;
  writeUIntBE(value: number, offset: number, byteLength: number): number;
  writeIntLE(value: number, offset: number, byteLength: number): number;
  writeIntBE(value: number, offset: number, byteLength: number): number;
  readUIntLE(offset: number, byteLength: number): number;
  readUIntBE(offset: number, byteLength: number): number;
  readIntLE(offset: number, byteLength: number): number;
  readIntBE(offset: number, byteLength: number): number;
  readUInt8(offset: number): number;
  readUInt16LE(offset: number): number;
  readUInt16BE(offset: number): number;
  readUInt32LE(offset: number): number;
  readUInt32BE(offset: number): number;
  readInt8(offset: number): number;
  readInt16LE(offset: number): number;
  readInt16BE(offset: number): number;
  readInt32LE(offset: number): number;
  readInt32BE(offset: number): number;
  readFloatLE(offset: number): number;
  readFloatBE(offset: number): number;
  readDoubleLE(offset: number): number;
  readDoubleBE(offset: number): number;
  reverse(): this;
  swap16(): Buffer;
  swap32(): Buffer;
  swap64(): Buffer;
  writeUInt8(value: number, offset: number): number;
  writeUInt16LE(value: number, offset: number): number;
  writeUInt16BE(value: number, offset: number): number;
  writeUInt32LE(value: number, offset: number): number;
  writeUInt32BE(value: number, offset: number): number;
  writeInt8(value: number, offset: number): number;
  writeInt16LE(value: number, offset: number): number;
  writeInt16BE(value: number, offset: number): number;
  writeInt32LE(value: number, offset: number): number;
  writeInt32BE(value: number, offset: number): number;
  writeFloatLE(value: number, offset: number): number;
  writeFloatBE(value: number, offset: number): number;
  writeDoubleLE(value: number, offset: number): number;
  writeDoubleBE(value: number, offset: number): number;
  readBigUInt64BE?(offset?: number): bigint;
  readBigUInt64LE?(offset?: number): bigint;
  readBigInt64BE?(offset?: number): bigint;
  readBigInt64LE?(offset?: number): bigint;
  writeBigInt64BE?(value: bigint, offset?: number): number;
  writeBigInt64LE?(value: bigint, offset?: number): number;
  writeBigUInt64BE?(value: bigint, offset?: number): number;
  writeBigUInt64LE?(value: bigint, offset?: number): number;
  fill(value: string | Uint8Array | number, offset?: number, end?: number, encoding?: BufferEncoding): this;
  indexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): number;
  lastIndexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: BufferEncoding): number;
  entries(): IterableIterator<[number, number]>;
  includes(value: string | number | Buffer, byteOffset?: number, encoding?: BufferEncoding): boolean;
  keys(): IterableIterator<number>;
  values(): IterableIterator<number>;
}
interface Buffer extends NodeBuffer {}
export interface System {
  args: string[];
  newLine: string;
  useCaseSensitiveFileNames: boolean;
  write(s: string): void;
  writeOutputIsTTY?(): boolean;
  readFile(path: string, encoding?: string): string | undefined;
  getFileSize?(path: string): number;
  writeFile(path: string, data: string, writeByteOrderMark?: boolean): void;
  watchFile?(path: string, callback: FileWatcherCallback, pollingInterval?: number, opts?: WatchOpts): FileWatcher;
  watchDirectory?(path: string, callback: DirectoryWatcherCallback, recursive?: boolean, opts?: WatchOpts): FileWatcher;
  resolvePath(path: string): string;
  fileExists(path: string): boolean;
  directoryExists(path: string): boolean;
  createDirectory(path: string): void;
  getExecutingFilePath(): string;
  getCurrentDirectory(): string;
  getDirectories(path: string): string[];
  readDirectory(path: string, extensions?: readonly string[], exclude?: readonly string[], include?: readonly string[], depth?: number): string[];
  getModifiedTime?(path: string): Date | undefined;
  setModifiedTime?(path: string, time: Date): void;
  deleteFile?(path: string): void;
  createHash?(data: string): string;
  createSHA256Hash?(data: string): string;
  getMemoryUsage?(): number;
  exit(exitCode?: number): void;
  enableCPUProfiler?(path: string, continuation: () => void): boolean;
  disableCPUProfiler?(continuation: () => void): boolean;
  realpath?(path: string): string;
  getEnvironmentVariable(name: string): string;
  tryEnableSourceMapsForHost?(): void;
  debugMode?: boolean;
  setTimeout?(callback: (...args: any[]) => void, ms: number, ...args: any[]): any;
  clearTimeout?(timeoutId: any): void;
  clearScreen?(): void;
  setBlocking?(): void;
  base64decode?(input: string): string;
  base64encode?(input: string): string;
  bufferFrom?(input: string, encoding?: string): Buffer;
  now?(): Date;
  require?(baseDir: string, moduleName: string): RequireResult;
}
export interface FileWatcher {
  close(): void;
}
interface DirectoryWatcher extends FileWatcher {
  referenceCount: number;
}
declare const require: any;
declare const process: any;
declare const global: any;
declare const __filename: string;
declare const __dirname: string;
export function getNodeMajorVersion(): number | undefined {
  if (typeof process === 'undefined') {
    return;
  }
  const version: string = process.version;
  if (!version) {
    return;
  }
  const dot = version.indexOf('.');
  if (dot === -1) {
    return;
  }
  return parseInt(version.substring(1, dot));
}
export let sys: System = (() => {
  const byteOrderMarkIndicator = '\uFEFF';
  function getNodeSystem(): System {
    const nativePattern = /^native |^\([^)]+\)$|^(internal[\\/]|[a-zA-Z0-9_\s]+(\.js)?$)/;
    const _fs: typeof import('fs') = require('fs');
    const _path: typeof import('path') = require('path');
    const _os = require('os');
    let _crypto: typeof import('crypto') | undefined;
    try {
      _crypto = require('crypto');
    } catch {
      _crypto = undefined;
    }
    let activeSession: import('inspector').Session | 'stopping' | undefined;
    let profilePath = './profile.cpuprofile';
    const Buffer: {
      new (input: string, encoding?: string): any;
      from?(input: string, encoding?: string): any;
    } = require('buffer').Buffer;
    const nodeVersion = getNodeMajorVersion();
    const isNode4OrLater = nodeVersion! >= 4;
    const isLinuxOrMacOs = process.platform === 'linux' || process.platform === 'darwin';
    const platform: string = _os.platform();
    const useCaseSensitiveFileNames = isFileSystemCaseSensitive();
    const fsSupportsRecursiveFsWatch = isNode4OrLater && (process.platform === 'win32' || process.platform === 'darwin');
    const { watchFile, watchDirectory } = createSystemWatchFunctions({
      pollingWatchFile: createSingleFileWatcherPerName(fsWatchFileWorker, useCaseSensitiveFileNames),
      getModifiedTime,
      setTimeout,
      clearTimeout,
      fsWatch,
      useCaseSensitiveFileNames,
      fileExists,
      fsSupportsRecursiveFsWatch,
      directoryExists,
      getAccessibleSortedChildDirectories: (path) => getAccessibleFileSystemEntries(path).directories,
      realpath,
      tscWatchFile: process.env.TSC_WATCHFILE,
      useNonPollingWatchers: process.env.TSC_NONPOLLING_WATCHER,
      tscWatchDirectory: process.env.TSC_WATCHDIRECTORY,
    });
    const nodeSystem: System = {
      args: process.argv.slice(2),
      newLine: _os.EOL,
      useCaseSensitiveFileNames,
      write(s: string): void {
        process.stdout.write(s);
      },
      writeOutputIsTTY() {
        return process.stdout.isTTY;
      },
      readFile,
      writeFile,
      watchFile,
      watchDirectory,
      resolvePath: (path) => _path.resolve(path),
      fileExists,
      directoryExists,
      createDirectory(directoryName: string) {
        if (!nodeSystem.directoryExists(directoryName)) {
          try {
            _fs.mkdirSync(directoryName);
          } catch (e) {
            if (e.code !== 'EEXIST') {
              throw e;
            }
          }
        }
      },
      getExecutingFilePath() {
        return __filename;
      },
      getCurrentDirectory() {
        return process.cwd();
      },
      getDirectories,
      getEnvironmentVariable(name: string) {
        return process.env[name] || '';
      },
      readDirectory,
      getModifiedTime,
      setModifiedTime,
      deleteFile,
      createHash: _crypto ? createSHA256Hash : generateDjb2Hash,
      createSHA256Hash: _crypto ? createSHA256Hash : undefined,
      getMemoryUsage() {
        if (global.gc) {
          global.gc();
        }
        return process.memoryUsage().heapUsed;
      },
      getFileSize(path) {
        try {
          const stat = _fs.statSync(path);
          if (stat.isFile()) return stat.size;
        } catch {}
        return 0;
      },
      exit(exitCode?: number): void {
        disableCPUProfiler(() => process.exit(exitCode));
      },
      enableCPUProfiler,
      disableCPUProfiler,
      realpath,
      debugMode: !!process.env.NODE_INSPECTOR_IPC || some(<string[]>process.execArgv, (arg) => /^--(inspect|debug)(-brk)?(=\d+)?$/i.test(arg)),
      tryEnableSourceMapsForHost() {
        try {
          require('source-map-support').install();
        } catch {}
      },
      setTimeout,
      clearTimeout,
      clearScreen: () => {
        process.stdout.write('\x1Bc');
      },
      setBlocking: () => {
        if (process.stdout && process.stdout._handle && process.stdout._handle.setBlocking) {
          process.stdout._handle.setBlocking(true);
        }
      },
      bufferFrom,
      base64decode: (input) => bufferFrom(input, 'base64').toString('utf8'),
      base64encode: (input) => bufferFrom(input).toString('base64'),
      require: (baseDir, moduleName) => {
        try {
          const modulePath = resolveJSModule(moduleName, baseDir, nodeSystem);
          return { module: require(modulePath), modulePath, error: undefined };
        } catch (error) {
          return { module: undefined, modulePath: undefined, error };
        }
      },
    };
    return nodeSystem;
    function enableCPUProfiler(path: string, cb: () => void) {
      if (activeSession) {
        cb();
        return false;
      }
      const inspector: typeof import('inspector') = require('inspector');
      if (!inspector || !inspector.Session) {
        cb();
        return false;
      }
      const session = new inspector.Session();
      session.connect();
      session.post('Profiler.enable', () => {
        session.post('Profiler.start', () => {
          activeSession = session;
          profilePath = path;
          cb();
        });
      });
      return true;
    }
    function cleanupPaths(profile: import('inspector').Profiler.Profile) {
      let externalFileCounter = 0;
      const remappedPaths = createMap<string>();
      const normalizedDir = normalizeSlashes(__dirname);
      const fileUrlRoot = `file:`;
      for (const node of profile.nodes) {
        if (node.callFrame.url) {
          const url = normalizeSlashes(node.callFrame.url);
          if (containsPath(fileUrlRoot, url, useCaseSensitiveFileNames)) {
            node.callFrame.url = getRelativePathToDirectoryOrUrl(fileUrlRoot, url, fileUrlRoot, createGetCanonicalFileName(useCaseSensitiveFileNames), true);
          } else if (!nativePattern.test(url)) {
            node.callFrame.url = (remappedPaths.has(url) ? remappedPaths : remappedPaths.set(url, `external${externalFileCounter}.js`)).get(url)!;
            externalFileCounter++;
          }
        }
      }
      return profile;
    }
    function disableCPUProfiler(cb: () => void) {
      if (activeSession && activeSession !== 'stopping') {
        const s = activeSession;
        activeSession.post('Profiler.stop', (err, { profile }) => {
          if (!err) {
            try {
              if (_fs.statSync(profilePath).isDirectory()) {
                profilePath = _path.join(profilePath, `${new Date().toISOString().replace(/:/g, '-')}+P${process.pid}.cpuprofile`);
              }
            } catch {}
            try {
              _fs.mkdirSync(_path.dirname(profilePath), { recursive: true });
            } catch {}
            _fs.writeFileSync(profilePath, JSON.stringify(cleanupPaths(profile)));
          }
          activeSession = undefined;
          s.disconnect();
          cb();
        });
        activeSession = 'stopping';
        return true;
      } else {
        cb();
        return false;
      }
    }
    function bufferFrom(input: string, encoding?: string): Buffer {
      return Buffer.from && (Buffer.from as Function) !== Int8Array.from ? Buffer.from(input, encoding) : new Buffer(input, encoding);
    }
    function isFileSystemCaseSensitive(): boolean {
      if (platform === 'win32' || platform === 'win64') return false;
      return !fileExists(swapCase(__filename));
    }
    function swapCase(s: string): string {
      return s.replace(/\w/g, (ch) => {
        const up = ch.toUpperCase();
        return ch === up ? ch.toLowerCase() : up;
      });
    }
    function fsWatchFileWorker(fileName: string, callback: FileWatcherCallback, pollingInterval: number): FileWatcher {
      _fs.watchFile(fileName, { persistent: true, interval: pollingInterval }, fileChanged);
      let eventKind: FileWatcherEventKind;
      return {
        close: () => _fs.unwatchFile(fileName, fileChanged),
      };
      function fileChanged(curr: any, prev: any) {
        const isPreviouslyDeleted = +prev.mtime === 0 || eventKind === FileWatcherEventKind.Deleted;
        if (+curr.mtime === 0) {
          if (isPreviouslyDeleted) {
            return;
          }
          eventKind = FileWatcherEventKind.Deleted;
        } else if (isPreviouslyDeleted) {
          eventKind = FileWatcherEventKind.Created;
        } else if (+curr.mtime === +prev.mtime) {
          return;
        } else {
          eventKind = FileWatcherEventKind.Changed;
        }
        callback(fileName, eventKind);
      }
    }
    function fsWatch(
      fileOrDirectory: string,
      entryKind: FileSystemEntryKind,
      callback: FsWatchCallback,
      recursive: boolean,
      fallbackPollingInterval: PollingInterval,
      fallbackOpts: WatchOpts | undefined
    ): FileWatcher {
      let opts: any;
      let lastDirectoryPartWithDirectorySeparator: string | undefined;
      let lastDirectoryPart: string | undefined;
      if (isLinuxOrMacOs) {
        lastDirectoryPartWithDirectorySeparator = fileOrDirectory.substr(fileOrDirectory.lastIndexOf(dirSeparator));
        lastDirectoryPart = lastDirectoryPartWithDirectorySeparator.slice(dirSeparator.length);
      }
      let watcher = !fileSystemEntryExists(fileOrDirectory, entryKind) ? watchMissingFileSystemEntry() : watchPresentFileSystemEntry();
      return {
        close: () => {
          watcher.close();
          watcher = undefined!;
        },
      };
      function invokeCallbackAndUpdateWatcher(createWatcher: () => FileWatcher) {
        sysLog(`sysLog:: ${fileOrDirectory}:: Changing watcher to ${createWatcher === watchPresentFileSystemEntry ? 'Present' : 'Missing'}FileSystemEntryWatcher`);
        callback('rename', '');
        if (watcher) {
          watcher.close();
          watcher = createWatcher();
        }
      }
      function watchPresentFileSystemEntry(): FileWatcher {
        if (opts === undefined) {
          if (fsSupportsRecursiveFsWatch) {
            opts = { persistent: true, recursive: !!recursive };
          } else {
            opts = { persistent: true };
          }
        }
        try {
          const presentWatcher = _fs.watch(fileOrDirectory, opts, isLinuxOrMacOs ? callbackChangingToMissingFileSystemEntry : callback);
          presentWatcher.on('error', () => invokeCallbackAndUpdateWatcher(watchMissingFileSystemEntry));
          return presentWatcher;
        } catch (e) {
          return watchPresentFileSystemEntryWithFsWatchFile();
        }
      }
      function callbackChangingToMissingFileSystemEntry(event: 'rename' | 'change', relativeName: string | undefined) {
        return event === 'rename' &&
          (!relativeName ||
            relativeName === lastDirectoryPart ||
            relativeName.lastIndexOf(lastDirectoryPartWithDirectorySeparator!) === relativeName.length - lastDirectoryPartWithDirectorySeparator!.length) &&
          !fileSystemEntryExists(fileOrDirectory, entryKind)
          ? invokeCallbackAndUpdateWatcher(watchMissingFileSystemEntry)
          : callback(event, relativeName);
      }
      function watchPresentFileSystemEntryWithFsWatchFile(): FileWatcher {
        sysLog(`sysLog:: ${fileOrDirectory}:: Changing to fsWatchFile`);
        return watchFile(fileOrDirectory, createFileWatcherCallback(callback), fallbackPollingInterval, fallbackOpts);
      }
      function watchMissingFileSystemEntry(): FileWatcher {
        return watchFile(
          fileOrDirectory,
          (_fileName, eventKind) => {
            if (eventKind === FileWatcherEventKind.Created && fileSystemEntryExists(fileOrDirectory, entryKind)) {
              invokeCallbackAndUpdateWatcher(watchPresentFileSystemEntry);
            }
          },
          fallbackPollingInterval,
          fallbackOpts
        );
      }
    }
    function readFileWorker(fileName: string, _encoding?: string): string | undefined {
      let buffer: Buffer;
      try {
        buffer = _fs.readFileSync(fileName);
      } catch (e) {
        return;
      }
      let len = buffer.length;
      if (len >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        len &= ~1;
        for (let i = 0; i < len; i += 2) {
          const temp = buffer[i];
          buffer[i] = buffer[i + 1];
          buffer[i + 1] = temp;
        }
        return buffer.toString('utf16le', 2);
      }
      if (len >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString('utf16le', 2);
      if (len >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return buffer.toString('utf8', 3);
      return buffer.toString('utf8');
    }
    function readFile(fileName: string, _encoding?: string): string | undefined {
      perfLogger.logStartReadFile(fileName);
      const file = readFileWorker(fileName, _encoding);
      perfLogger.logStopReadFile();
      return file;
    }
    function writeFile(fileName: string, data: string, writeByteOrderMark?: boolean): void {
      perfLogger.logEvent('WriteFile: ' + fileName);
      if (writeByteOrderMark) {
        data = byteOrderMarkIndicator + data;
      }
      let fd: number | undefined;
      try {
        fd = _fs.openSync(fileName, 'w');
        _fs.writeSync(fd, data, undefined, 'utf8');
      } finally {
        if (fd !== undefined) {
          _fs.closeSync(fd);
        }
      }
    }
    function getAccessibleFileSystemEntries(path: string): FileSystemEntries {
      perfLogger.logEvent('ReadDir: ' + (path || '.'));
      try {
        const entries = _fs.readdirSync(path || '.', { withFileTypes: true });
        const files: string[] = [];
        const directories: string[] = [];
        for (const dirent of entries) {
          const entry = typeof dirent === 'string' ? dirent : dirent.name;
          if (entry === '.' || entry === '..') {
            continue;
          }
          let stat: any;
          if (typeof dirent === 'string' || dirent.isSymbolicLink()) {
            const name = combinePaths(path, entry);
            try {
              stat = _fs.statSync(name);
            } catch (e) {
              continue;
            }
          } else {
            stat = dirent;
          }
          if (stat.isFile()) {
            files.push(entry);
          } else if (stat.isDirectory()) {
            directories.push(entry);
          }
        }
        files.sort();
        directories.sort();
        return { files, directories };
      } catch (e) {
        return emptyFileSystemEntries;
      }
    }
    function readDirectory(path: string, extensions?: readonly string[], excludes?: readonly string[], includes?: readonly string[], depth?: number): string[] {
      return matchFiles(path, extensions, excludes, includes, useCaseSensitiveFileNames, process.cwd(), depth, getAccessibleFileSystemEntries, realpath);
    }
    function fileSystemEntryExists(path: string, entryKind: FileSystemEntryKind): boolean {
      try {
        const stat = _fs.statSync(path);
        switch (entryKind) {
          case FileSystemEntryKind.File:
            return stat.isFile();
          case FileSystemEntryKind.Directory:
            return stat.isDirectory();
          default:
            return false;
        }
      } catch (e) {
        return false;
      }
    }
    function fileExists(path: string): boolean {
      return fileSystemEntryExists(path, FileSystemEntryKind.File);
    }
    function directoryExists(path: string): boolean {
      return fileSystemEntryExists(path, FileSystemEntryKind.Directory);
    }
    function getDirectories(path: string): string[] {
      return getAccessibleFileSystemEntries(path).directories.slice();
    }
    function realpath(path: string): string {
      try {
        return _fs.realpathSync(path);
      } catch {
        return path;
      }
    }
    function getModifiedTime(path: string) {
      try {
        return _fs.statSync(path).mtime;
      } catch (e) {
        return;
      }
    }
    function setModifiedTime(path: string, time: Date) {
      try {
        _fs.utimesSync(path, time, time);
      } catch (e) {
        return;
      }
    }
    function deleteFile(path: string) {
      try {
        return _fs.unlinkSync(path);
      } catch (e) {
        return;
      }
    }
    function createSHA256Hash(data: string): string {
      const hash = _crypto!.createHash('sha256');
      hash.update(data);
      return hash.digest('hex');
    }
  }
  let sys: System | undefined;
  if (typeof process !== 'undefined' && process.nextTick && !process.browser && typeof require !== 'undefined') {
    sys = getNodeSystem();
  }
  if (sys) {
    patchWriteFileEnsuringDirectory(sys);
  }
  return sys!;
})();
if (sys && sys.getEnvironmentVariable) {
  setCustomPollingValues(sys);
  qc.assert.setLevel(/^development$/i.test(sys.getEnvironmentVariable('NODE_ENV')) ? AssertionLevel.Normal : AssertionLevel.None);
}
if (sys && sys.debugMode) {
  Debug.isDebugging = true;
}
export function validateLocaleAndSetLanguage(
  locale: string,
  sys: {
    getExecutingFilePath(): string;
    resolvePath(path: string): string;
    fileExists(fileName: string): boolean;
    readFile(fileName: string): string | undefined;
  },
  errors?: qu.Push<qd.Diagnostic>
) {
  const matchResult = /^([a-z]+)([_\-]([a-z]+))?$/.exec(locale.toLowerCase());
  if (!matchResult) {
    if (errors) {
      errors.push(qd.createCompilerDiagnostic(qd.msgs.Locale_must_be_of_the_form_language_or_language_territory_For_example_0_or_1, 'en', 'ja-jp'));
    }
    return;
  }
  const language = matchResult[1];
  const territory = matchResult[3];
  if (!trySetLanguageAndTerritory(language, territory, errors)) {
    trySetLanguageAndTerritory(language, undefined, errors);
  }
  setUILocale(locale);
  function trySetLanguageAndTerritory(language: string, territory: string | undefined, errors?: qu.Push<qd.Diagnostic>) {
    const compilerFilePath = normalizePath(sys.getExecutingFilePath());
    const containingDirectoryPath = getDirectoryPath(compilerFilePath);
    let filePath = combinePaths(containingDirectoryPath, language);
    if (territory) filePath = filePath + '-' + territory;
    filePath = sys.resolvePath(combinePaths(filePath, 'diagnosticMessages.generated.json'));
    if (!sys.fileExists(filePath)) return false;
    let fileContents: string | undefined = '';
    try {
      fileContents = sys.readFile(filePath);
    } catch (e) {
      if (errors) errors.push(qd.createCompilerDiagnostic(qd.msgs.Unable_to_open_file_0, filePath));
      return false;
    }
    try {
      qd.setLocalizedMessages(JSON.parse(fileContents!));
    } catch {
      if (errors) errors.push(qd.createCompilerDiagnostic(qd.msgs.Corrupted_locale_file_0, filePath));
      return false;
    }
    return true;
  }
}
