import * as fs from 'fs';
import * as chokidar from 'chokidar';
import * as path from 'path';
import Char from 'typescript-char';
import { URI } from 'vscode-uri';

import { QConsole, NullConsole } from './misc';
import { createDeferred } from './lazy';
import { some } from './collection';
import { compareValues, Comparison, GetCanonicalFileName, identity } from './core';
import * as debug from './debug';
import {
  compareStringsCaseInsensitive,
  compareStringsCaseSensitive,
  equateStringsCaseInsensitive,
  equateStringsCaseSensitive,
  getStringComparer,
} from './strings';

export const typeshedFallback = 'typeshed-fallback';
export const lib = 'lib';
export const sitePackages = 'site-packages';
export const src = 'src';

export type FileWatcherEventType = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
export type FileWatcherEventHandler = (
  eventName: FileWatcherEventType,
  path: string,
  stats?: Stats
) => void;

export interface FileWatcher {
  close(): void;
}

export interface Stats {
  size: number;

  isFile(): boolean;
  isDirectory(): boolean;
  isBlockDevice(): boolean;
  isCharacterDevice(): boolean;
  isSymbolicLink(): boolean;
  isFIFO(): boolean;
  isSocket(): boolean;
}

export interface MkDirOptions {
  recursive: boolean;
  // Not supported on Windows so commented out.
  // mode: string | number;
}

export interface FileSystem {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: MkDirOptions | number): void;
  chdir(path: string): void;
  readdirEntriesSync(path: string): fs.Dirent[];
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding?: null): Buffer;
  readFileSync(path: string, encoding: string): string;
  readFileSync(path: string, encoding?: string | null): string | Buffer;
  writeFileSync(path: string, data: string | Buffer, encoding: string | null): void;
  statSync(path: string): Stats;
  unlinkSync(path: string): void;
  realpathSync(path: string): string;
  getModulePath(): string;
  createFileSystemWatcher(
    paths: string[],
    listener: FileWatcherEventHandler
  ): FileWatcher;
  createReadStream(path: string): fs.ReadStream;
  createWriteStream(path: string): fs.WriteStream;
  copyFileSync(src: string, dst: string): void;
  // Async I/O
  readFile(path: string): Promise<Buffer>;
  readFileText(path: string, encoding?: string): Promise<string>;
}

export interface FileWatcherProvider {
  createFileWatcher(paths: string[], listener: FileWatcherEventHandler): FileWatcher;
}

// Callers can specify a different file watcher provider if desired.
// By default, we'll use the file watcher based on chokidar.
export function createFromRealFileSystem(
  console?: QConsole,
  fileWatcherProvider?: FileWatcherProvider
): FileSystem {
  return new RealFileSystem(
    fileWatcherProvider ?? new ChokidarFileWatcherProvider(console ?? new NullConsole())
  );
}

const _isMacintosh = process.platform === 'darwin';
const _isLinux = process.platform === 'linux';

class RealFileSystem implements FileSystem {
  private _fileWatcherProvider: FileWatcherProvider;

  constructor(fileWatcherProvider: FileWatcherProvider) {
    this._fileWatcherProvider = fileWatcherProvider;
  }

  existsSync(path: string) {
    return fs.existsSync(path);
  }

  mkdirSync(path: string, options?: MkDirOptions | number) {
    fs.mkdirSync(path, options);
  }

  chdir(path: string) {
    process.chdir(path);
  }

  readdirSync(path: string): string[] {
    return fs.readdirSync(path);
  }
  readdirEntriesSync(path: string): fs.Dirent[] {
    return fs.readdirSync(path, { withFileTypes: true });
  }

  readFileSync(path: string, encoding?: null): Buffer;
  readFileSync(path: string, encoding: string): string;
  readFileSync(path: string, encoding?: string | null): Buffer | string;
  readFileSync(path: string, encoding: string | null = null) {
    return fs.readFileSync(path, { encoding });
  }

  writeFileSync(path: string, data: string | Buffer, encoding: string | null) {
    fs.writeFileSync(path, data, { encoding });
  }

  statSync(path: string) {
    return fs.statSync(path);
  }

  unlinkSync(path: string) {
    fs.unlinkSync(path);
  }

  realpathSync(path: string) {
    return fs.realpathSync(path);
  }

  getModulePath(): string {
    // The entry point to the tool should have set the __rootDirectory
    // global variable to point to the directory that contains the
    // typeshed-fallback directory.
    return (global as any).__rootDirectory;
  }

  createFileSystemWatcher(
    paths: string[],
    listener: FileWatcherEventHandler
  ): FileWatcher {
    return this._fileWatcherProvider.createFileWatcher(paths, listener);
  }

  createReadStream(path: string): fs.ReadStream {
    return fs.createReadStream(path);
  }
  createWriteStream(path: string): fs.WriteStream {
    return fs.createWriteStream(path);
  }

  copyFileSync(src: string, dst: string): void {
    fs.copyFileSync(src, dst);
  }

  readFile(path: string): Promise<Buffer> {
    const d = createDeferred<Buffer>();
    fs.readFile(path, (e, b) => {
      if (e) {
        d.reject(e);
      } else {
        d.resolve(b);
      }
    });
    return d.promise;
  }

  readFileText(path: string, encoding: string): Promise<string> {
    const d = createDeferred<string>();
    fs.readFile(path, { encoding }, (e, s) => {
      if (e) {
        d.reject(e);
      } else {
        d.resolve(s);
      }
    });
    return d.promise;
  }
}

class ChokidarFileWatcherProvider implements FileWatcherProvider {
  constructor(private _console: QConsole) {}

  createFileWatcher(paths: string[], listener: FileWatcherEventHandler): FileWatcher {
    return this._createFileSystemWatcher(paths).on('all', listener);
  }

  createReadStream(path: string): fs.ReadStream {
    return fs.createReadStream(path);
  }
  createWriteStream(path: string): fs.WriteStream {
    return fs.createWriteStream(path);
  }

  private _createFileSystemWatcher(paths: string[]): chokidar.FSWatcher {
    // The following options are copied from VS Code source base. It also
    // uses chokidar for its file watching.
    const watcherOptions: chokidar.WatchOptions = {
      ignoreInitial: true,
      ignorePermissionErrors: true,
      followSymlinks: true, // this is the default of chokidar and supports file events through symlinks
      interval: 1000, // while not used in normal cases, if any error causes chokidar to fallback to polling, increase its intervals
      binaryInterval: 1000,
      disableGlobbing: true, // fix https://github.com/Microsoft/vscode/issues/4586
    };

    if (_isMacintosh) {
      // Explicitly disable on MacOS because it uses up large amounts of memory
      // and CPU for large file hierarchies, resulting in instability and crashes.
      watcherOptions.usePolling = false;
    }

    const excludes: string[] = [];
    if (_isMacintosh || _isLinux) {
      if (paths.some((path) => path === '' || path === '/')) {
        excludes.push('/dev/**');
        if (_isLinux) {
          excludes.push('/proc/**', '/sys/**');
        }
      }
    }
    watcherOptions.ignored = excludes;

    const watcher = chokidar.watch(paths, watcherOptions);
    watcher.on('error', (_) => {
      this._console.log('Error returned from file system watcher.');
    });

    // Detect if for some reason the native watcher library fails to load
    if (_isMacintosh && !watcher.options.useFsEvents) {
      this._console.log(
        'Watcher could not use native fsevents library. File system watcher disabled.'
      );
    }

    return watcher;
  }

  readFile(path: string): Promise<Buffer> {
    const d = createDeferred<Buffer>();
    fs.readFile(path, (e, b) => {
      if (e) {
        d.reject(e);
      } else {
        d.resolve(b);
      }
    });
    return d.promise;
  }

  readFileText(path: string, encoding: string): Promise<string> {
    const d = createDeferred<string>();
    fs.readFile(path, { encoding }, (e, s) => {
      if (e) {
        d.reject(e);
      } else {
        d.resolve(s);
      }
    });
    return d.promise;
  }
}

export interface FileSpec {
  // File specs can contain wildcard characters (**, *, ?). This
  // specifies the first portion of the file spec that contains
  // no wildcards.
  wildcardRoot: string;

  // Regular expression that can be used to match against this
  // file spec.
  regExp: RegExp;
}

export namespace FileSpec {
  export function is(value: any): value is FileSpec {
    const candidate: FileSpec = value as FileSpec;
    return candidate && !!candidate.wildcardRoot && !!candidate.regExp;
  }
}

export interface FileSystemEntries {
  files: string[];
  directories: string[];
}

export function forEachAncestorDirectory(
  directory: string,
  callback: (directory: string) => string | undefined
): string | undefined {
  while (true) {
    const result = callback(directory);
    if (result !== undefined) {
      return result;
    }

    const parentPath = getDirectoryPath(directory);
    if (parentPath === directory) {
      return undefined;
    }

    directory = parentPath;
  }
}

export function getDirectoryPath(pathString: string): string {
  return pathString.substr(
    0,
    Math.max(getRootLength(pathString), pathString.lastIndexOf(path.sep))
  );
}

export function getRootLength(pathString: string): number {
  if (pathString.charAt(0) === path.sep) {
    if (pathString.charAt(1) !== path.sep) {
      return 1;
    }
    const p1 = pathString.indexOf(path.sep, 2);
    if (p1 < 0) {
      return 2;
    }
    const p2 = pathString.indexOf(path.sep, p1 + 1);
    if (p2 < 0) {
      return p1 + 1;
    }
    return p2 + 1;
  }
  if (pathString.charAt(1) === ':') {
    if (pathString.charAt(2) === path.sep) {
      return 3;
    }
  }
  return 0;
}

export function getPathComponents(pathString: string) {
  const normalizedPath = normalizeSlashes(pathString);
  const rootLength = getRootLength(normalizedPath);
  const root = normalizedPath.substring(0, rootLength);
  const rest = normalizedPath.substring(rootLength).split(path.sep);
  if (rest.length > 0 && !rest[rest.length - 1]) {
    rest.pop();
  }

  return reducePathComponents([root, ...rest]);
}

export function reducePathComponents(components: readonly string[]) {
  if (!some(components)) {
    return [];
  }

  // Reduce the path components by eliminating
  // any '.' or '..'.
  const reduced = [components[0]];
  for (let i = 1; i < components.length; i++) {
    const component = components[i];
    if (!component || component === '.') {
      continue;
    }

    if (component === '..') {
      if (reduced.length > 1) {
        if (reduced[reduced.length - 1] !== '..') {
          reduced.pop();
          continue;
        }
      } else if (reduced[0]) {
        continue;
      }
    }
    reduced.push(component);
  }

  return reduced;
}

export function combinePathComponents(components: string[]): string {
  if (components.length === 0) {
    return '';
  }

  const root = components[0] && ensureTrailingDirectorySeparator(components[0]);
  return normalizeSlashes(root + components.slice(1).join(path.sep));
}

export function getRelativePath(dirPath: string, relativeTo: string) {
  if (!dirPath.startsWith(ensureTrailingDirectorySeparator(relativeTo))) {
    return undefined;
  }

  const pathComponents = getPathComponents(dirPath);
  const relativeToComponents = getPathComponents(relativeTo);

  let relativePath = '.';
  for (let i = relativeToComponents.length; i < pathComponents.length; i++) {
    relativePath += path.sep + pathComponents[i];
  }

  return relativePath;
}

// Creates a directory hierarchy for a path, starting from some ancestor path.
export function makeDirectories(
  fs: FileSystem,
  dirPath: string,
  startingFromDirPath: string
) {
  if (!dirPath.startsWith(startingFromDirPath)) {
    return;
  }

  const pathComponents = getPathComponents(dirPath);
  const relativeToComponents = getPathComponents(startingFromDirPath);
  let curPath = startingFromDirPath;

  for (let i = relativeToComponents.length; i < pathComponents.length; i++) {
    curPath = combinePaths(curPath, pathComponents[i]);
    if (!fs.existsSync(curPath)) {
      fs.mkdirSync(curPath);
    }
  }
}

export function getFileSize(fs: FileSystem, path: string) {
  try {
    const stat = fs.statSync(path);
    if (stat.isFile()) {
      return stat.size;
    }
  } catch {
    /*ignore*/
  }
  return 0;
}

export function fileExists(fs: FileSystem, path: string): boolean {
  return fileSystemEntryExists(fs, path, FileSystemEntryKind.File);
}

export function directoryExists(fs: FileSystem, path: string): boolean {
  return fileSystemEntryExists(fs, path, FileSystemEntryKind.Directory);
}

export function normalizeSlashes(p: string) {
  const s = /[\\/]/g;
  return p.replace(s, path.sep);
}

/**
 * Combines and resolves paths. If a path is absolute, it replaces any previous path. Any
 * `.` and `..` path components are resolved. Trailing directory separators are preserved.
 *
 * ```ts
 * resolvePath("/path", "to", "file.ext") === "path/to/file.ext"
 * resolvePath("/path", "to", "file.ext/") === "path/to/file.ext/"
 * resolvePath("/path", "dir", "..", "to", "file.ext") === "path/to/file.ext"
 * ```
 */
export function resolvePaths(path: string, ...paths: (string | undefined)[]): string {
  return normalizePath(
    some(paths) ? combinePaths(path, ...paths) : normalizeSlashes(path)
  );
}

export function combinePaths(
  pathString: string,
  ...paths: (string | undefined)[]
): string {
  if (pathString) {
    pathString = normalizeSlashes(pathString);
  }

  for (let relativePath of paths) {
    if (!relativePath) {
      continue;
    }

    relativePath = normalizeSlashes(relativePath);

    if (!pathString || getRootLength(relativePath) !== 0) {
      pathString = relativePath;
    } else {
      pathString = ensureTrailingDirectorySeparator(pathString) + relativePath;
    }
  }

  return pathString;
}

/**
 * Compare two paths using the provided case sensitivity.
 */
export function comparePaths(a: string, b: string, ignoreCase?: boolean): Comparison;
export function comparePaths(
  a: string,
  b: string,
  currentDirectory: string,
  ignoreCase?: boolean
): Comparison;
export function comparePaths(
  a: string,
  b: string,
  currentDirectory?: string | boolean,
  ignoreCase?: boolean
) {
  a = normalizePath(a);
  b = normalizePath(b);

  if (typeof currentDirectory === 'string') {
    a = combinePaths(currentDirectory, a);
    b = combinePaths(currentDirectory, b);
  } else if (typeof currentDirectory === 'boolean') {
    ignoreCase = currentDirectory;
  }
  return comparePathsWorker(a, b, getStringComparer(ignoreCase));
}

export function containsPath(
  parent: string,
  child: string,
  ignoreCase?: boolean
): boolean;
export function containsPath(
  parent: string,
  child: string,
  currentDirectory: string,
  ignoreCase?: boolean
): boolean;
export function containsPath(
  parent: string,
  child: string,
  currentDirectory?: string | boolean,
  ignoreCase?: boolean
) {
  if (typeof currentDirectory === 'string') {
    parent = combinePaths(currentDirectory, parent);
    child = combinePaths(currentDirectory, child);
  } else if (typeof currentDirectory === 'boolean') {
    ignoreCase = currentDirectory;
  }

  if (parent === undefined || child === undefined) {
    return false;
  }
  if (parent === child) {
    return true;
  }

  const parentComponents = getPathComponents(parent);
  const childComponents = getPathComponents(child);

  if (childComponents.length < parentComponents.length) {
    return false;
  }

  const componentEqualityComparer = ignoreCase
    ? equateStringsCaseInsensitive
    : equateStringsCaseSensitive;
  for (let i = 0; i < parentComponents.length; i++) {
    const equalityComparer =
      i === 0 ? equateStringsCaseInsensitive : componentEqualityComparer;
    if (!equalityComparer(parentComponents[i], childComponents[i])) {
      return false;
    }
  }

  return true;
}

export function changeAnyExtension(path: string, ext: string): string;

export function changeAnyExtension(
  path: string,
  ext: string,
  extensions: string | readonly string[],
  ignoreCase: boolean
): string;
export function changeAnyExtension(
  path: string,
  ext: string,
  extensions?: string | readonly string[],
  ignoreCase?: boolean
): string {
  const pathExt =
    extensions !== undefined && ignoreCase !== undefined
      ? getAnyExtensionFromPath(path, extensions, ignoreCase)
      : getAnyExtensionFromPath(path);

  return pathExt
    ? path.slice(0, path.length - pathExt.length) +
        (ext.startsWith('.') ? ext : '.' + ext)
    : path;
}

export function getAnyExtensionFromPath(path: string): string;

export function getAnyExtensionFromPath(
  path: string,
  extensions: string | readonly string[],
  ignoreCase: boolean
): string;
export function getAnyExtensionFromPath(
  path: string,
  extensions?: string | readonly string[],
  ignoreCase?: boolean
): string {
  // Retrieves any string from the final "." onwards from a base file name.
  // Unlike extensionFromPath, which throws an exception on unrecognized extensions.
  if (extensions) {
    return getAnyExtensionFromPathWorker(
      stripTrailingDirectorySeparator(path),
      extensions,
      ignoreCase ? equateStringsCaseInsensitive : equateStringsCaseSensitive
    );
  }
  const baseFileName = getBaseFileName(path);
  const extensionIndex = baseFileName.lastIndexOf('.');
  if (extensionIndex >= 0) {
    return baseFileName.substring(extensionIndex);
  }
  return '';
}

export function getBaseFileName(pathString: string): string;
export function getBaseFileName(
  pathString: string,
  extensions: string | readonly string[],
  ignoreCase: boolean
): string;
export function getBaseFileName(
  pathString: string,
  extensions?: string | readonly string[],
  ignoreCase?: boolean
) {
  pathString = normalizeSlashes(pathString);

  // if the path provided is itself the root, then it has not file name.
  const rootLength = getRootLength(pathString);
  if (rootLength === pathString.length) {
    return '';
  }

  // return the trailing portion of the path starting after the last (non-terminal) directory
  // separator but not including any trailing directory separator.
  pathString = stripTrailingDirectorySeparator(pathString);
  const name = pathString.slice(
    Math.max(getRootLength(pathString), pathString.lastIndexOf(path.sep) + 1)
  );
  const extension =
    extensions !== undefined && ignoreCase !== undefined
      ? getAnyExtensionFromPath(name, extensions, ignoreCase)
      : undefined;

  return extension ? name.slice(0, name.length - extension.length) : name;
}

export function getRelativePathFromDirectory(
  from: string,
  to: string,
  ignoreCase: boolean
): string;
export function getRelativePathFromDirectory(
  fromDirectory: string,
  to: string,
  getCanonicalFileName: GetCanonicalFileName
): string;
export function getRelativePathFromDirectory(
  fromDirectory: string,
  to: string,
  getCanonicalFileNameOrIgnoreCase: GetCanonicalFileName | boolean
) {
  debug.assert(
    getRootLength(fromDirectory) > 0 === getRootLength(to) > 0,
    'Paths must either both be absolute or both be relative'
  );
  const getCanonicalFileName =
    typeof getCanonicalFileNameOrIgnoreCase === 'function'
      ? getCanonicalFileNameOrIgnoreCase
      : identity;
  const ignoreCase =
    typeof getCanonicalFileNameOrIgnoreCase === 'boolean'
      ? getCanonicalFileNameOrIgnoreCase
      : false;
  const pathComponents = getPathComponentsRelativeTo(
    fromDirectory,
    to,
    ignoreCase ? equateStringsCaseInsensitive : equateStringsCaseSensitive,
    getCanonicalFileName
  );

  return combinePathComponents(pathComponents);
}

export function comparePathsCaseSensitive(a: string, b: string) {
  return comparePathsWorker(a, b, compareStringsCaseSensitive);
}
export function comparePathsCaseInsensitive(a: string, b: string) {
  return comparePathsWorker(a, b, compareStringsCaseInsensitive);
}

export function ensureTrailingDirectorySeparator(pathString: string): string {
  if (!hasTrailingDirectorySeparator(pathString)) {
    return pathString + path.sep;
  }

  return pathString;
}

export function hasTrailingDirectorySeparator(pathString: string) {
  if (pathString.length === 0) {
    return false;
  }

  const ch = pathString.charCodeAt(pathString.length - 1);
  return ch === Char.Slash || ch === Char.Backslash;
}

export function stripTrailingDirectorySeparator(pathString: string) {
  if (!hasTrailingDirectorySeparator(pathString)) {
    return pathString;
  }
  return pathString.substr(0, pathString.length - 1);
}

export function getFileExtension(fileName: string) {
  return path.extname(fileName);
}

export function getFileName(pathString: string) {
  return path.basename(pathString);
}

export function stripFileExtension(fileName: string) {
  const ext = path.extname(fileName);
  return fileName.substr(0, fileName.length - ext.length);
}

export function normalizePath(p: string) {
  return normalizeSlashes(path.normalize(p));
}

export function isDirectory(fs: FileSystem, path: string): boolean {
  let stat: any;
  try {
    stat = fs.statSync(path);
  } catch (e) {
    return false;
  }

  return stat.isDirectory();
}

export function isFile(fs: FileSystem, path: string): boolean {
  let stat: any;
  try {
    stat = fs.statSync(path);
  } catch (e) {
    return false;
  }

  return stat.isFile();
}

export function getFileSystemEntries(fs: FileSystem, path: string): FileSystemEntries {
  try {
    const entries = fs.readdirSync(path || '.').sort();
    const files: string[] = [];
    const directories: string[] = [];
    for (const entry of entries) {
      // This is necessary because on some file system node fails to exclude
      // "." and "..". See https://github.com/nodejs/node/issues/4002
      if (entry === '.' || entry === '..') {
        continue;
      }
      const name = combinePaths(path, entry);

      let stat: any;
      try {
        stat = fs.statSync(name);
      } catch (e) {
        continue;
      }

      if (stat.isFile()) {
        files.push(entry);
      } else if (stat.isDirectory()) {
        directories.push(entry);
      }
    }
    return { files, directories };
  } catch (e) {
    return { files: [], directories: [] };
  }
}

export function getWildcardRegexPattern(rootPath: string, fileSpec: string): string {
  let absolutePath = normalizePath(combinePaths(rootPath, fileSpec));
  if (!absolutePath.endsWith('.py') && !absolutePath.endsWith('.pyi')) {
    absolutePath = ensureTrailingDirectorySeparator(absolutePath);
  }

  const pathComponents = getPathComponents(absolutePath);

  const escapedSeparator = getRegexEscapedSeparator();
  const doubleAsteriskRegexFragment = `(${escapedSeparator}[^${escapedSeparator}.][^${escapedSeparator}]*)*?`;
  const reservedCharacterPattern = new RegExp(`[^\\w\\s${escapedSeparator}]`, 'g');

  // Strip the directory separator from the root component.
  if (pathComponents.length > 0) {
    pathComponents[0] = stripTrailingDirectorySeparator(pathComponents[0]);
  }

  let regExPattern = '';
  let firstComponent = true;

  for (let component of pathComponents) {
    if (component === '**') {
      regExPattern += doubleAsteriskRegexFragment;
    } else {
      if (!firstComponent) {
        component = escapedSeparator + component;
      }

      regExPattern += component.replace(reservedCharacterPattern, (match) => {
        if (match === '*') {
          return `[^${escapedSeparator}]*`;
        } else if (match === '?') {
          return `[^${escapedSeparator}]`;
        } else {
          // escaping anything that is not reserved characters - word/space/separator
          return '\\' + match;
        }
      });

      firstComponent = false;
    }
  }

  return regExPattern;
}

// Returns the topmost path that contains no wildcard characters.
export function getWildcardRoot(rootPath: string, fileSpec: string): string {
  let absolutePath = normalizePath(combinePaths(rootPath, fileSpec));
  if (!absolutePath.endsWith('.py') && !absolutePath.endsWith('.pyi')) {
    absolutePath = ensureTrailingDirectorySeparator(absolutePath);
  }
  const pathComponents = getPathComponents(absolutePath);
  // Strip the directory separator from the root component.
  if (pathComponents.length > 0) {
    pathComponents[0] = stripTrailingDirectorySeparator(pathComponents[0]);
  }
  let wildcardRoot = '';
  let firstComponent = true;
  for (let component of pathComponents) {
    if (component === '**') {
      break;
    } else {
      if (/[*?]/.exec(component)) break;
      if (!firstComponent) component = path.sep + component;
      wildcardRoot += component;
      firstComponent = false;
    }
  }
  return wildcardRoot;
}

export function getFileSpec(rootPath: string, fileSpec: string): FileSpec {
  let regExPattern = getWildcardRegexPattern(rootPath, fileSpec);
  const escapedSeparator = getRegexEscapedSeparator();
  regExPattern = `^(${regExPattern})($|${escapedSeparator})`;

  const regExp = new RegExp(regExPattern);
  const wildcardRoot = getWildcardRoot(rootPath, fileSpec);

  return {
    wildcardRoot,
    regExp,
  };
}

export function getRegexEscapedSeparator() {
  // we don't need to escape "/" in typescript regular expression
  return path.sep === '/' ? '/' : '\\\\';
}

/**
 * Determines whether a path is an absolute disk path (e.g. starts with `/`, or a dos path
 * like `c:`, `c:\` or `c:/`).
 */
export function isRootedDiskPath(path: string) {
  return getRootLength(path) > 0;
}

/**
 * Determines whether a path consists only of a path root.
 */
export function isDiskPathRoot(path: string) {
  const rootLength = getRootLength(path);
  return rootLength > 0 && rootLength === path.length;
}

//// Path Comparisons
function comparePathsWorker(
  a: string,
  b: string,
  componentComparer: (a: string, b: string) => Comparison
) {
  if (a === b) {
    return Comparison.EqualTo;
  }
  if (a === undefined) {
    return Comparison.LessThan;
  }
  if (b === undefined) {
    return Comparison.GreaterThan;
  }

  // NOTE: Performance optimization - shortcut if the root segments differ as there would be no
  //       need to perform path reduction.
  const aRoot = a.substring(0, getRootLength(a));
  const bRoot = b.substring(0, getRootLength(b));
  const result = compareStringsCaseInsensitive(aRoot, bRoot);
  if (result !== Comparison.EqualTo) {
    return result;
  }

  // check path for these segments: '', '.'. '..'
  const escapedSeparator = getRegexEscapedSeparator();
  const relativePathSegmentRegExp = new RegExp(
    `(^|${escapedSeparator}).{0,2}($|${escapedSeparator})`
  );

  // NOTE: Performance optimization - shortcut if there are no relative path segments in
  //       the non-root portion of the path
  const aRest = a.substring(aRoot.length);
  const bRest = b.substring(bRoot.length);
  if (!relativePathSegmentRegExp.test(aRest) && !relativePathSegmentRegExp.test(bRest)) {
    return componentComparer(aRest, bRest);
  }

  // The path contains a relative path segment. Normalize the paths and perform a slower component
  // by component comparison.
  const aComponents = getPathComponents(a);
  const bComponents = getPathComponents(b);
  const sharedLength = Math.min(aComponents.length, bComponents.length);
  for (let i = 1; i < sharedLength; i++) {
    const result = componentComparer(aComponents[i], bComponents[i]);
    if (result !== Comparison.EqualTo) {
      return result;
    }
  }

  return compareValues(aComponents.length, bComponents.length);
}

function getAnyExtensionFromPathWorker(
  path: string,
  extensions: string | readonly string[],
  stringEqualityComparer: (a: string, b: string) => boolean
) {
  if (typeof extensions === 'string') {
    return tryGetExtensionFromPath(path, extensions, stringEqualityComparer) || '';
  }
  for (const extension of extensions) {
    const result = tryGetExtensionFromPath(path, extension, stringEqualityComparer);
    if (result) {
      return result;
    }
  }
  return '';
}

function tryGetExtensionFromPath(
  path: string,
  extension: string,
  stringEqualityComparer: (a: string, b: string) => boolean
) {
  if (!extension.startsWith('.')) {
    extension = '.' + extension;
  }
  if (
    path.length >= extension.length &&
    path.charCodeAt(path.length - extension.length) === Char.Period
  ) {
    const pathExtension = path.slice(path.length - extension.length);
    if (stringEqualityComparer(pathExtension, extension)) {
      return pathExtension;
    }
  }

  return undefined;
}

function getPathComponentsRelativeTo(
  from: string,
  to: string,
  stringEqualityComparer: (a: string, b: string) => boolean,
  getCanonicalFileName: GetCanonicalFileName
) {
  const fromComponents = getPathComponents(from);
  const toComponents = getPathComponents(to);

  let start: number;
  for (start = 0; start < fromComponents.length && start < toComponents.length; start++) {
    const fromComponent = getCanonicalFileName(fromComponents[start]);
    const toComponent = getCanonicalFileName(toComponents[start]);
    const comparer = start === 0 ? equateStringsCaseInsensitive : stringEqualityComparer;
    if (!comparer(fromComponent, toComponent)) {
      break;
    }
  }

  if (start === 0) {
    return toComponents;
  }

  const components = toComponents.slice(start);
  const relative: string[] = [];
  for (; start < fromComponents.length; start++) {
    relative.push('..');
  }
  return ['', ...relative, ...components];
}

const enum FileSystemEntryKind {
  File,
  Directory,
}

function fileSystemEntryExists(
  fs: FileSystem,
  path: string,
  entryKind: FileSystemEntryKind
): boolean {
  try {
    const stat = fs.statSync(path);
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

export function uriToPath(u: string) {
  const u2 = URI.parse(u);
  let p = normalizePath(u2.path);
  if (/^\\[a-zA-Z]:\\/.exec(p)) p = p.substr(1);
  return p;
}

export function pathToUri(p: string) {
  return URI.file(p).toString();
}
