import { dirSeparator } from './syntax';
import { Extension, Path, ScriptKind } from './types';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
const backslashRegExp = /\\/g;
export function isUrl(p: string) {
  return qy.get.encodedRootLength(p) < 0;
}
export function isRootedDiskPath(p: string) {
  return qy.get.encodedRootLength(p) > 0;
}
export function isExternalModuleNameRelative(p: string) {
  return pathIsRelative(p) || isRootedDiskPath(p);
}
export function isDiskPathRoot(path: string) {
  const rootLength = qy.get.encodedRootLength(path);
  return rootLength > 0 && rootLength === path.length;
}
export function pathIsAbsolute(path: string): boolean {
  return qy.get.encodedRootLength(path) !== 0;
}
export function pathIsRelative(path: string): boolean {
  return /^\.\.?($|[\\/])/.test(path);
}
export function hasExtension(fileName: string): boolean {
  return qu.stringContains(getBaseFileName(fileName), '.');
}
export function fileExtensionIs(path: string, extension: string): boolean {
  return path.length > extension.length && qu.endsWith(path, extension);
}
export function fileExtensionIsOneOf(path: string, extensions: readonly string[]): boolean {
  for (const extension of extensions) {
    if (fileExtensionIs(path, extension)) return true;
  }
  return false;
}
export function hasTrailingDirectorySeparator(path: string) {
  return path.length > 0 && qy.is.dirSeparator(path.charCodeAt(path.length - 1));
}
export function getRootLength(path: string) {
  const rootLength = qy.get.encodedRootLength(path);
  return rootLength < 0 ? ~rootLength : rootLength;
}
export function getDirectoryPath(path: Path): Path;
export function getDirectoryPath(path: string): string;
export function getDirectoryPath(path: string): string {
  path = normalizeSlashes(path);
  const rootLength = getRootLength(path);
  if (rootLength === path.length) return path;
  path = removeTrailingDirectorySeparator(path);
  return path.slice(0, Math.max(rootLength, path.lastIndexOf(dirSeparator)));
}
export function getBaseFileName(path: string): string;
export function getBaseFileName(path: string, extensions: string | readonly string[], ignoreCase: boolean): string;
export function getBaseFileName(path: string, extensions?: string | readonly string[], ignoreCase?: boolean) {
  path = normalizeSlashes(path);
  const rootLength = getRootLength(path);
  if (rootLength === path.length) return '';
  path = removeTrailingDirectorySeparator(path);
  const name = path.slice(Math.max(getRootLength(path), path.lastIndexOf(dirSeparator) + 1));
  const extension = extensions !== undefined && ignoreCase !== undefined ? getAnyExtensionFromPath(name, extensions, ignoreCase) : undefined;
  return extension ? name.slice(0, name.length - extension.length) : name;
}
export function makeIdentifierFromModuleName(s: string): string {
  return getBaseFileName(s).replace(/^(\d)/, '_$1').replace(/\W/g, '_');
}
function getAnyExtensionFromPathWorker(path: string, extensions: string | readonly string[], stringEqComparer: (a: string, b: string) => boolean) {
  if (typeof extensions === 'string') return qy.get.extensionFrom(path, extensions, stringEqComparer) || '';
  for (const extension of extensions) {
    const result = qy.get.extensionFrom(path, extension, stringEqComparer);
    if (result) return result;
  }
  return '';
}
export function getAnyExtensionFromPath(path: string): string;
export function getAnyExtensionFromPath(path: string, extensions: string | readonly string[], ignoreCase: boolean): string;
export function getAnyExtensionFromPath(path: string, extensions?: string | readonly string[], ignoreCase?: boolean): string {
  if (extensions) return getAnyExtensionFromPathWorker(removeTrailingDirectorySeparator(path), extensions, ignoreCase ? qu.equateStringsCaseInsensitive : qu.equateStringsCaseSensitive);
  const baseFileName = getBaseFileName(path);
  const extensionIndex = baseFileName.lastIndexOf('.');
  if (extensionIndex >= 0) return baseFileName.substring(extensionIndex);
  return '';
}
function pathComponents(path: string, rootLength: number) {
  const root = path.substring(0, rootLength);
  const rest = path.substring(rootLength).split(dirSeparator);
  if (rest.length && !qu.lastOrUndefined(rest)) rest.pop();
  return [root, ...rest];
}
export function getPathComponents(path: string, currentDirectory = '') {
  path = combinePaths(currentDirectory, path);
  return pathComponents(path, getRootLength(path));
}
export function getPathFromPathComponents(pathComponents: readonly string[]) {
  if (pathComponents.length === 0) return '';
  const root = pathComponents[0] && ensureTrailingDirectorySeparator(pathComponents[0]);
  return root + pathComponents.slice(1).join(dirSeparator);
}
export function normalizeSlashes(path: string): string {
  return path.replace(backslashRegExp, dirSeparator);
}
export function reducePathComponents(components: readonly string[]) {
  if (!qu.some(components)) return [];
  const reduced = [components[0]];
  for (let i = 1; i < components.length; i++) {
    const component = components[i];
    if (!component) continue;
    if (component === '.') continue;
    if (component === '..') {
      if (reduced.length > 1) {
        if (reduced[reduced.length - 1] !== '..') {
          reduced.pop();
          continue;
        }
      } else if (reduced[0]) continue;
    }
    reduced.push(component);
  }
  return reduced;
}
export function combinePaths(path: string, ...paths: (string | undefined)[]): string {
  if (path) path = normalizeSlashes(path);
  for (let relativePath of paths) {
    if (!relativePath) continue;
    relativePath = normalizeSlashes(relativePath);
    if (!path || getRootLength(relativePath) !== 0) path = relativePath;
    else path = ensureTrailingDirectorySeparator(path) + relativePath;
  }
  return path;
}
export function resolvePath(path: string, ...paths: (string | undefined)[]): string {
  return normalizePath(qu.some(paths) ? combinePaths(path, ...paths) : normalizeSlashes(path));
}
export function getNormalizedPathComponents(path: string, currentDirectory: string | undefined) {
  return reducePathComponents(getPathComponents(path, currentDirectory));
}
export function getNormalizedAbsolutePath(fileName: string, currentDirectory: string | undefined) {
  return getPathFromPathComponents(getNormalizedPathComponents(fileName, currentDirectory));
}
export function normalizePath(path: string): string {
  path = normalizeSlashes(path);
  const normalized = getPathFromPathComponents(reducePathComponents(getPathComponents(path)));
  return normalized && hasTrailingDirectorySeparator(path) ? ensureTrailingDirectorySeparator(normalized) : normalized;
}
function getPathWithoutRoot(pathComponents: readonly string[]) {
  if (pathComponents.length === 0) return '';
  return pathComponents.slice(1).join(dirSeparator);
}
export function getNormalizedAbsolutePathWithoutRoot(fileName: string, currentDirectory: string | undefined) {
  return getPathWithoutRoot(getNormalizedPathComponents(fileName, currentDirectory));
}
export function toPath(fileName: string, basePath: string | undefined, getCanonicalFileName: (path: string) => string): Path {
  const nonCanonicalizedPath = isRootedDiskPath(fileName) ? normalizePath(fileName) : getNormalizedAbsolutePath(fileName, basePath);
  return <Path>getCanonicalFileName(nonCanonicalizedPath);
}
export function normalizePathAndParts(path: string): { path: string; parts: string[] } {
  path = normalizeSlashes(path);
  const [root, ...parts] = reducePathComponents(getPathComponents(path));
  if (parts.length) {
    const joinedParts = root + parts.join(dirSeparator);
    return { path: hasTrailingDirectorySeparator(path) ? ensureTrailingDirectorySeparator(joinedParts) : joinedParts, parts };
  }
  return { path: root, parts };
}
export function removeTrailingDirectorySeparator(path: Path): Path;
export function removeTrailingDirectorySeparator(path: string): string;
export function removeTrailingDirectorySeparator(path: string) {
  if (hasTrailingDirectorySeparator(path)) return path.substr(0, path.length - 1);
  return path;
}
export function ensureTrailingDirectorySeparator(path: Path): Path;
export function ensureTrailingDirectorySeparator(path: string): string;
export function ensureTrailingDirectorySeparator(path: string) {
  if (!hasTrailingDirectorySeparator(path)) return path + dirSeparator;
  return path;
}
export function ensurePathIsNonModuleName(path: string): string {
  return !pathIsAbsolute(path) && !pathIsRelative(path) ? './' + path : path;
}
export function changeAnyExtension(path: string, ext: string): string;
export function changeAnyExtension(path: string, ext: string, extensions: string | readonly string[], ignoreCase: boolean): string;
export function changeAnyExtension(path: string, ext: string, extensions?: string | readonly string[], ignoreCase?: boolean) {
  const pathext = extensions !== undefined && ignoreCase !== undefined ? getAnyExtensionFromPath(path, extensions, ignoreCase) : getAnyExtensionFromPath(path);
  return pathext ? path.slice(0, path.length - pathext.length) + (qu.startsWith(ext, '.') ? ext : '.' + ext) : path;
}
const relativePathSegmentRegExp = /(^|\/)\.{0,2}($|\/)/;
function comparePathsWorker(a: string, b: string, componentComparer: (a: string, b: string) => qu.Comparison) {
  if (a === b) return qu.Comparison.EqualTo;
  if (a === undefined) return qu.Comparison.LessThan;
  if (b === undefined) return qu.Comparison.GreaterThan;
  const aRoot = a.substring(0, getRootLength(a));
  const bRoot = b.substring(0, getRootLength(b));
  const result = qu.compareCaseInsensitive(aRoot, bRoot);
  if (result !== qu.Comparison.EqualTo) return result;
  const aRest = a.substring(aRoot.length);
  const bRest = b.substring(bRoot.length);
  if (!relativePathSegmentRegExp.test(aRest) && !relativePathSegmentRegExp.test(bRest)) return componentComparer(aRest, bRest);
  const aComponents = reducePathComponents(getPathComponents(a));
  const bComponents = reducePathComponents(getPathComponents(b));
  const sharedLength = Math.min(aComponents.length, bComponents.length);
  for (let i = 1; i < sharedLength; i++) {
    const result = componentComparer(aComponents[i], bComponents[i]);
    if (result !== qu.Comparison.EqualTo) return result;
  }
  return qu.compareNumbers(aComponents.length, bComponents.length);
}
export function comparePathsCaseSensitive(a: string, b: string) {
  return comparePathsWorker(a, b, qu.compareCaseSensitive);
}
export function comparePathsCaseInsensitive(a: string, b: string) {
  return comparePathsWorker(a, b, qu.compareCaseInsensitive);
}
export function comparePaths(a: string, b: string, ignoreCase?: boolean): qu.Comparison;
export function comparePaths(a: string, b: string, currentDirectory: string, ignoreCase?: boolean): qu.Comparison;
export function comparePaths(a: string, b: string, currentDirectory?: string | boolean, ignoreCase?: boolean) {
  if (typeof currentDirectory === 'string') {
    a = combinePaths(currentDirectory, a);
    b = combinePaths(currentDirectory, b);
  } else if (typeof currentDirectory === 'boolean') ignoreCase = currentDirectory;
  return comparePathsWorker(a, b, qu.getStringComparer(ignoreCase));
}
export function containsPath(parent: string, child: string, ignoreCase?: boolean): boolean;
export function containsPath(parent: string, child: string, currentDirectory: string, ignoreCase?: boolean): boolean;
export function containsPath(parent: string, child: string, currentDirectory?: string | boolean, ignoreCase?: boolean) {
  if (typeof currentDirectory === 'string') {
    parent = combinePaths(currentDirectory, parent);
    child = combinePaths(currentDirectory, child);
  } else if (typeof currentDirectory === 'boolean') ignoreCase = currentDirectory;
  if (parent === undefined || child === undefined) return false;
  if (parent === child) return true;
  const parentComponents = reducePathComponents(getPathComponents(parent));
  const childComponents = reducePathComponents(getPathComponents(child));
  if (childComponents.length < parentComponents.length) return false;
  const componentEqComparer = ignoreCase ? qu.equateStringsCaseInsensitive : qu.equateStringsCaseSensitive;
  for (let i = 0; i < parentComponents.length; i++) {
    const equalityComparer = i === 0 ? qu.equateStringsCaseInsensitive : componentEqComparer;
    if (!equalityComparer(parentComponents[i], childComponents[i])) return false;
  }
  return true;
}
export function startsWithDirectory(fileName: string, directoryName: string, getCanonicalFileName: qu.GetCanonicalFileName): boolean {
  const canonicalFileName = getCanonicalFileName(fileName);
  const canonicalDirectoryName = getCanonicalFileName(directoryName);
  return qu.startsWith(canonicalFileName, canonicalDirectoryName + '/') || qu.startsWith(canonicalFileName, canonicalDirectoryName + '\\');
}
export function getPathComponentsRelativeTo(from: string, to: string, stringEqComparer: (a: string, b: string) => boolean, getCanonicalFileName: qu.GetCanonicalFileName) {
  const fromComponents = reducePathComponents(getPathComponents(from));
  const toComponents = reducePathComponents(getPathComponents(to));
  let start: number;
  for (start = 0; start < fromComponents.length && start < toComponents.length; start++) {
    const fromComponent = getCanonicalFileName(fromComponents[start]);
    const toComponent = getCanonicalFileName(toComponents[start]);
    const comparer = start === 0 ? qu.equateStringsCaseInsensitive : stringEqComparer;
    if (!comparer(fromComponent, toComponent)) break;
  }
  if (start === 0) return toComponents;
  const components = toComponents.slice(start);
  const relative: string[] = [];
  for (; start < fromComponents.length; start++) {
    relative.push('..');
  }
  return ['', ...relative, ...components];
}
export function getRelativePathFromDirectory(from: string, to: string, ignoreCase: boolean): string;
export function getRelativePathFromDirectory(fromDirectory: string, to: string, getCanonicalFileName: qu.GetCanonicalFileName): string;
export function getRelativePathFromDirectory(fromDirectory: string, to: string, getCanonicalFileNameOrIgnoreCase: qu.GetCanonicalFileName | boolean) {
  qu.assert(getRootLength(fromDirectory) > 0 === getRootLength(to) > 0, 'Paths must either both be absolute or both be relative');
  const getCanonicalFileName = typeof getCanonicalFileNameOrIgnoreCase === 'function' ? getCanonicalFileNameOrIgnoreCase : qu.identity;
  const ignoreCase = typeof getCanonicalFileNameOrIgnoreCase === 'boolean' ? getCanonicalFileNameOrIgnoreCase : false;
  const pathComponents = getPathComponentsRelativeTo(fromDirectory, to, ignoreCase ? qu.equateStringsCaseInsensitive : qu.equateStringsCaseSensitive, getCanonicalFileName);
  return getPathFromPathComponents(pathComponents);
}
export function convertToRelativePath(absoluteOrRelativePath: string, basePath: string, getCanonicalFileName: (path: string) => string): string {
  return !isRootedDiskPath(absoluteOrRelativePath) ? absoluteOrRelativePath : getRelativePathToDirectoryOrUrl(basePath, absoluteOrRelativePath, basePath, getCanonicalFileName, false);
}
export function getRelativePathFromFile(from: string, to: string, getCanonicalFileName: qu.GetCanonicalFileName) {
  return ensurePathIsNonModuleName(getRelativePathFromDirectory(getDirectoryPath(from), to, getCanonicalFileName));
}
export function getRelativePathToDirectoryOrUrl(
  directoryPathOrUrl: string,
  relativeOrAbsolutePath: string,
  currentDirectory: string,
  getCanonicalFileName: qu.GetCanonicalFileName,
  isAbsolutePathAnUrl: boolean
) {
  const pathComponents = getPathComponentsRelativeTo(
    resolvePath(currentDirectory, directoryPathOrUrl),
    resolvePath(currentDirectory, relativeOrAbsolutePath),
    qu.equateStringsCaseSensitive,
    getCanonicalFileName
  );
  const firstComponent = pathComponents[0];
  if (isAbsolutePathAnUrl && isRootedDiskPath(firstComponent)) {
    const prefix = firstComponent.charAt(0) === dirSeparator ? 'file://' : 'file:///';
    pathComponents[0] = prefix + firstComponent;
  }
  return getPathFromPathComponents(pathComponents);
}
export function forEachAncestorDirectory<T>(d: Path, cb: (_: Path | string) => T | undefined): T | undefined;
export function forEachAncestorDirectory<T>(d: string, cb: (_: Path | string) => T | undefined): T | undefined;
export function forEachAncestorDirectory<T>(d: Path | string, cb: (_: Path | string) => T | undefined): T | undefined {
  while (true) {
    const r = cb(d);
    if (r !== undefined) return r;
    const p = getDirectoryPath(d);
    if (p === d) return;
    d = p;
  }
}
export function isNodeModulesDirectory(d: Path) {
  return qu.endsWith(d, '/node_modules');
}
export function discoverProbableSymlinks(fs: readonly qt.SourceFile[], n: qu.GetCanonicalFileName, cwd: string): qu.QReadonlyMap<string> {
  const r = new qu.QMap<string>();
  const ls = qu.flatten<readonly [string, string]>(
    qu.mapDefined(
      fs,
      (f) =>
        f.resolvedModules &&
        qu.compact(
          qu.arrayFrom(qu.mapIterator(f.resolvedModules.values(), (m) => (m && m.originalPath && m.resolvedFileName !== m.originalPath ? ([m.resolvedFileName, m.originalPath] as const) : undefined)))
        )
    )
  );
  for (const [resolvedPath, originalPath] of ls) {
    const [commonResolved, commonOriginal] = guessDirectorySymlink(resolvedPath, originalPath, cwd, n);
    r.set(commonOriginal, commonResolved);
  }
  return r;
}
function guessDirectorySymlink(a: string, b: string, cwd: string, getCanonicalFileName: qu.GetCanonicalFileName): [string, string] {
  const aParts = getPathComponents(toPath(a, cwd, getCanonicalFileName));
  const bParts = getPathComponents(toPath(b, cwd, getCanonicalFileName));
  while (
    !isNodeModulesOrScopedPackageDirectory(aParts[aParts.length - 2], getCanonicalFileName) &&
    !isNodeModulesOrScopedPackageDirectory(bParts[bParts.length - 2], getCanonicalFileName) &&
    getCanonicalFileName(aParts[aParts.length - 1]) === getCanonicalFileName(bParts[bParts.length - 1])
  ) {
    aParts.pop();
    bParts.pop();
  }
  return [getPathFromPathComponents(aParts), getPathFromPathComponents(bParts)];
}
function isNodeModulesOrScopedPackageDirectory(s: string, getCanonicalFileName: qu.GetCanonicalFileName): boolean {
  return getCanonicalFileName(s) === 'node_modules' || qu.startsWith(s, '@');
}
function stripLeadingDirectorySeparator(s: string): string | undefined {
  return qy.is.dirSeparator(s.charCodeAt(0)) ? s.slice(1) : undefined;
}
export function tryRemoveDirectoryPrefix(path: string, dirPath: string, getCanonicalFileName: qu.GetCanonicalFileName): string | undefined {
  const withoutPrefix = qu.tryRemovePrefix(path, dirPath, getCanonicalFileName);
  return withoutPrefix === undefined ? undefined : stripLeadingDirectorySeparator(withoutPrefix);
}
const wildcardCodes = [qy.Codes.asterisk, qy.Codes.question];
export const commonPackageFolders: readonly string[] = ['node_modules', 'bower_components', 'jspm_packages'];
const implicitExcludePathRegexPattern = `(?!(${commonPackageFolders.join('|')})(/|$))`;
interface WildcardMatcher {
  singleAsteriskRegexFragment: string;
  doubleAsteriskRegexFragment: string;
  replaceWildcardCharacter: (match: string) => string;
}
const filesMatcher: WildcardMatcher = {
  singleAsteriskRegexFragment: '([^./]|(\\.(?!min\\.js$))?)*',
  doubleAsteriskRegexFragment: `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`,
  replaceWildcardCharacter: (match) => replaceWildcardCharacter(match, filesMatcher.singleAsteriskRegexFragment),
};
const directoriesMatcher: WildcardMatcher = {
  singleAsteriskRegexFragment: '[^/]*',
  doubleAsteriskRegexFragment: `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`,
  replaceWildcardCharacter: (match) => replaceWildcardCharacter(match, directoriesMatcher.singleAsteriskRegexFragment),
};
const excludeMatcher: WildcardMatcher = {
  singleAsteriskRegexFragment: '[^/]*',
  doubleAsteriskRegexFragment: '(/.+?)?',
  replaceWildcardCharacter: (match) => replaceWildcardCharacter(match, excludeMatcher.singleAsteriskRegexFragment),
};
const wildcardMatchers = {
  files: filesMatcher,
  directories: directoriesMatcher,
  exclude: excludeMatcher,
};
export function getRegularExpressionForWildcard(specs: readonly string[] | undefined, basePath: string, usage: 'files' | 'directories' | 'exclude'): string | undefined {
  const patterns = getRegularExpressionsForWildcards(specs, basePath, usage);
  if (!patterns || !patterns.length) return;
  const pattern = patterns.map((pattern) => `(${pattern})`).join('|');
  const terminator = usage === 'exclude' ? '($|/)' : '$';
  return `^(${pattern})${terminator}`;
}
export function getRegularExpressionsForWildcards(specs: readonly string[] | undefined, basePath: string, usage: 'files' | 'directories' | 'exclude'): readonly string[] | undefined {
  if (specs === undefined || specs.length === 0) return;
  return qu.flatMap(specs, (spec) => spec && getSubPatternFromSpec(spec, basePath, usage, wildcardMatchers[usage]));
}
export function isImplicitGlob(lastPathComponent: string): boolean {
  return !/[.*?]/.test(lastPathComponent);
}
function getSubPatternFromSpec(
  spec: string,
  basePath: string,
  usage: 'files' | 'directories' | 'exclude',
  { singleAsteriskRegexFragment, doubleAsteriskRegexFragment, replaceWildcardCharacter }: WildcardMatcher
): string | undefined {
  let sub = '';
  let hasWrittenComponent = false;
  const components = getNormalizedPathComponents(spec, basePath);
  const lastComponent = qu.last(components);
  if (usage !== 'exclude' && lastComponent === '**') return;
  components[0] = removeTrailingDirectorySeparator(components[0]);
  if (isImplicitGlob(lastComponent)) components.push('**', '*');
  let optionalCount = 0;
  for (let component of components) {
    if (component === '**') sub += doubleAsteriskRegexFragment;
    else {
      if (usage === 'directories') {
        sub += '(';
        optionalCount++;
      }
      if (hasWrittenComponent) sub += dirSeparator;
      if (usage !== 'exclude') {
        let componentPattern = '';
        if (component.charCodeAt(0) === qy.Codes.asterisk) {
          componentPattern += '([^./]' + singleAsteriskRegexFragment + ')?';
          component = component.substr(1);
        } else if (component.charCodeAt(0) === qy.Codes.question) {
          componentPattern += '[^./]';
          component = component.substr(1);
        }
        componentPattern += component.replace(qu.reservedPattern, replaceWildcardCharacter);
        if (componentPattern !== component) sub += implicitExcludePathRegexPattern;
        sub += componentPattern;
      } else sub += component.replace(qu.reservedPattern, replaceWildcardCharacter);
    }
    hasWrittenComponent = true;
  }
  while (optionalCount > 0) {
    sub += ')?';
    optionalCount--;
  }
  return sub;
}
function replaceWildcardCharacter(match: string, singleAsteriskRegexFragment: string) {
  return match === '*' ? singleAsteriskRegexFragment : match === '?' ? '[^/]' : '\\' + match;
}
export interface ResolveModuleNameResolutionHost {
  getCanonicalFileName(p: string): string;
  getCommonSourceDirectory(): string;
  getCurrentDirectory(): string;
}
export function getExternalModuleNameFromPath(host: ResolveModuleNameResolutionHost, fileName: string, referencePath?: string): string {
  const getCanonicalFileName = (f: string) => host.getCanonicalFileName(f);
  const dir = toPath(referencePath ? getDirectoryPath(referencePath) : host.getCommonSourceDirectory(), host.getCurrentDirectory(), getCanonicalFileName);
  const filePath = getNormalizedAbsolutePath(fileName, host.getCurrentDirectory());
  const relativePath = getRelativePathToDirectoryOrUrl(dir, filePath, dir, getCanonicalFileName, false);
  const extensionless = removeFileExtension(relativePath);
  return referencePath ? ensurePathIsNonModuleName(extensionless) : extensionless;
}

export function getSourceFilePathInNewDirWorker(fileName: string, newDirPath: string, currentDirectory: string, commonSourceDirectory: string, getCanonicalFileName: qu.GetCanonicalFileName): string {
  let sourceFilePath = getNormalizedAbsolutePath(fileName, currentDirectory);
  const isSourceFileInCommonSourceDirectory = getCanonicalFileName(sourceFilePath).indexOf(getCanonicalFileName(commonSourceDirectory)) === 0;
  sourceFilePath = isSourceFileInCommonSourceDirectory ? sourceFilePath.substring(commonSourceDirectory.length) : sourceFilePath;
  return combinePaths(newDirPath, sourceFilePath);
}
export function writeFile(
  host: { writeFile: qt.WriteFileCallback },
  diagnostics: qd.DiagnosticCollection,
  fileName: string,
  data: string,
  writeByteOrderMark: boolean,
  sourceFiles?: readonly qt.SourceFile[]
) {
  host.writeFile(
    fileName,
    data,
    writeByteOrderMark,
    (hostErrorMessage) => {
      diagnostics.add(qd.createCompilerDiagnostic(qd.msgs.Could_not_write_file_0_Colon_1, fileName, hostErrorMessage));
    },
    sourceFiles
  );
}
function ensureDirectoriesExist(directoryPath: string, createDirectory: (path: string) => void, directoryExists: (path: string) => boolean) {
  if (directoryPath.length > getRootLength(directoryPath) && !directoryExists(directoryPath)) {
    const parentDirectory = getDirectoryPath(directoryPath);
    ensureDirectoriesExist(parentDirectory, createDirectory, directoryExists);
    createDirectory(directoryPath);
  }
}
export function writeFileEnsuringDirectories(
  path: string,
  data: string,
  writeByteOrderMark: boolean,
  writeFile: (path: string, data: string, writeByteOrderMark: boolean) => void,
  createDirectory: (path: string) => void,
  directoryExists: (path: string) => boolean
) {
  try {
    writeFile(path, data, writeByteOrderMark);
  } catch {
    ensureDirectoriesExist(getDirectoryPath(normalizePath(path)), createDirectory, directoryExists);
    writeFile(path, data, writeByteOrderMark);
  }
}
const extensionsToRemove = [Extension.Dts, Extension.Ts, Extension.Js, Extension.Tsx, Extension.Jsx, Extension.Json];
export function removeFileExtension(path: string): string {
  for (const ext of extensionsToRemove) {
    const extensionless = tryRemoveExtension(path, ext);
    if (extensionless !== undefined) return extensionless;
  }
  return path;
}
export function tryRemoveExtension(path: string, extension: string): string | undefined {
  return fileExtensionIs(path, extension) ? removeExtension(path, extension) : undefined;
}
export function removeExtension(path: string, extension: string): string {
  return path.substring(0, path.length - extension.length);
}
export function changeExtension<T extends string | Path>(path: T, newExtension: string): T {
  return <T>changeAnyExtension(path, newExtension, extensionsToRemove, false);
}
export interface FileSystemEntries {
  readonly files: readonly string[];
  readonly directories: readonly string[];
}
export interface FileMatcherPatterns {
  includeFilePatterns: readonly string[] | undefined;
  includeFilePattern: string | undefined;
  includeDirectoryPattern: string | undefined;
  excludePattern: string | undefined;
  basePaths: readonly string[];
}
export function getFileMatcherPatterns(
  path: string,
  excludes: readonly string[] | undefined,
  includes: readonly string[] | undefined,
  useCaseSensitiveFileNames: boolean,
  currentDirectory: string
): FileMatcherPatterns {
  path = normalizePath(path);
  currentDirectory = normalizePath(currentDirectory);
  const absolutePath = combinePaths(currentDirectory, path);
  return {
    includeFilePatterns: qu.map(getRegularExpressionsForWildcards(includes, absolutePath, 'files'), (pattern) => `^${pattern}$`),
    includeFilePattern: getRegularExpressionForWildcard(includes, absolutePath, 'files'),
    includeDirectoryPattern: getRegularExpressionForWildcard(includes, absolutePath, 'directories'),
    excludePattern: getRegularExpressionForWildcard(excludes, absolutePath, 'exclude'),
    basePaths: getBasePaths(path, includes, useCaseSensitiveFileNames),
  };
}
export function getRegexFromPattern(pattern: string, useCaseSensitiveFileNames: boolean): RegExp {
  return new RegExp(pattern, useCaseSensitiveFileNames ? '' : 'i');
}
export function matchFiles(
  path: string,
  extensions: readonly string[] | undefined,
  excludes: readonly string[] | undefined,
  includes: readonly string[] | undefined,
  useCaseSensitiveFileNames: boolean,
  currentDirectory: string,
  depth: number | undefined,
  getFileSystemEntries: (path: string) => FileSystemEntries,
  realpath: (path: string) => string
): string[] {
  path = normalizePath(path);
  currentDirectory = normalizePath(currentDirectory);
  const patterns = getFileMatcherPatterns(path, excludes, includes, useCaseSensitiveFileNames, currentDirectory);
  const includeFileRegexes = patterns.includeFilePatterns && patterns.includeFilePatterns.map((pattern) => getRegexFromPattern(pattern, useCaseSensitiveFileNames));
  const includeDirectoryRegex = patterns.includeDirectoryPattern && getRegexFromPattern(patterns.includeDirectoryPattern, useCaseSensitiveFileNames);
  const excludeRegex = patterns.excludePattern && getRegexFromPattern(patterns.excludePattern, useCaseSensitiveFileNames);
  const results: string[][] = includeFileRegexes ? includeFileRegexes.map(() => []) : [[]];
  const visited = new qu.QMap<true>();
  const toCanonical = qu.createGetCanonicalFileName(useCaseSensitiveFileNames);
  for (const basePath of patterns.basePaths) {
    visitDirectory(basePath, combinePaths(currentDirectory, basePath), depth);
  }
  return qu.flatten(results);
  function visitDirectory(path: string, absolutePath: string, depth: number | undefined) {
    const canonicalPath = toCanonical(realpath(absolutePath));
    if (visited.has(canonicalPath)) return;
    visited.set(canonicalPath, true);
    const { files, directories } = getFileSystemEntries(path);
    for (const current of qu.sort<string>(files, qu.compareCaseSensitive)) {
      const name = combinePaths(path, current);
      const absoluteName = combinePaths(absolutePath, current);
      if (extensions && !fileExtensionIsOneOf(name, extensions)) continue;
      if (excludeRegex && excludeRegex.test(absoluteName)) continue;
      if (!includeFileRegexes) {
        results[0].push(name);
      } else {
        const includeIndex = qu.findIndex(includeFileRegexes, (re) => re.test(absoluteName));
        if (includeIndex !== -1) {
          results[includeIndex].push(name);
        }
      }
    }
    if (depth !== undefined) {
      depth--;
      if (depth === 0) {
        return;
      }
    }
    for (const current of qu.sort<string>(directories, qu.compareCaseSensitive)) {
      const name = combinePaths(path, current);
      const absoluteName = combinePaths(absolutePath, current);
      if ((!includeDirectoryRegex || includeDirectoryRegex.test(absoluteName)) && (!excludeRegex || !excludeRegex.test(absoluteName))) {
        visitDirectory(name, absoluteName, depth);
      }
    }
  }
}
function getBasePaths(path: string, includes: readonly string[] | undefined, useCaseSensitiveFileNames: boolean): string[] {
  const basePaths: string[] = [path];
  if (includes) {
    const includeBasePaths: string[] = [];
    for (const include of includes) {
      const absolute: string = isRootedDiskPath(include) ? include : normalizePath(combinePaths(path, include));
      includeBasePaths.push(getIncludeBasePath(absolute));
    }
    includeBasePaths.sort(qu.getStringComparer(!useCaseSensitiveFileNames));
    for (const includeBasePath of includeBasePaths) {
      if (qu.every(basePaths, (basePath) => !containsPath(basePath, includeBasePath, path, !useCaseSensitiveFileNames))) {
        basePaths.push(includeBasePath);
      }
    }
  }
  return basePaths;
}
function getIncludeBasePath(absolute: string): string {
  const wildcardOffset = qu.indexOfAnyCharCode(absolute, wildcardCodes);
  if (wildcardOffset < 0) return !hasExtension(absolute) ? absolute : removeTrailingDirectorySeparator(getDirectoryPath(absolute));
  return absolute.substring(0, absolute.lastIndexOf(dirSeparator, wildcardOffset));
}
export function ensureScriptKind(fileName: string, scriptKind: ScriptKind | undefined): ScriptKind {
  return scriptKind || getScriptKindFromFileName(fileName) || ScriptKind.TS;
}
export function getScriptKindFromFileName(fileName: string): ScriptKind {
  const ext = fileName.substr(fileName.lastIndexOf('.'));
  switch (ext.toLowerCase()) {
    case Extension.Js:
      return ScriptKind.JS;
    case Extension.Jsx:
      return ScriptKind.JSX;
    case Extension.Ts:
      return ScriptKind.TS;
    case Extension.Tsx:
      return ScriptKind.TSX;
    case Extension.Json:
      return ScriptKind.JSON;
    default:
      return ScriptKind.Unknown;
  }
}
export const supportedTSExtensions: readonly Extension[] = [Extension.Ts, Extension.Tsx, Extension.Dts];
export const supportedTSExtensionsWithJson: readonly Extension[] = [Extension.Ts, Extension.Tsx, Extension.Dts, Extension.Json];
export const supportedTSExtensionsForExtractExtension: readonly Extension[] = [Extension.Dts, Extension.Ts, Extension.Tsx];
export const supportedJSExtensions: readonly Extension[] = [Extension.Js, Extension.Jsx];
export const supportedJSAndJsonExtensions: readonly Extension[] = [Extension.Js, Extension.Jsx, Extension.Json];
const allSupportedExtensions: readonly Extension[] = [...supportedTSExtensions, ...supportedJSExtensions];
const allSupportedExtensionsWithJson: readonly Extension[] = [...supportedTSExtensions, ...supportedJSExtensions, Extension.Json];
export function getSupportedExtensions(opts?: qt.CompilerOpts): readonly Extension[];
export function getSupportedExtensions(opts?: qt.CompilerOpts, extraFileExtensions?: readonly qt.FileExtensionInfo[]): readonly string[];
export function getSupportedExtensions(opts?: qt.CompilerOpts, extraFileExtensions?: readonly qt.FileExtensionInfo[]): readonly string[] {
  const needJsExtensions = opts && opts.allowJs;
  if (!extraFileExtensions || extraFileExtensions.length === 0) return needJsExtensions ? allSupportedExtensions : supportedTSExtensions;
  const extensions = [
    ...(needJsExtensions ? allSupportedExtensions : supportedTSExtensions),
    ...qu.mapDefined(extraFileExtensions, (x) => (x.scriptKind === ScriptKind.Deferred || (needJsExtensions && isJSLike(x.scriptKind)) ? x.extension : undefined)),
  ];
  return qu.deduplicate<string>(extensions, qu.equateStringsCaseSensitive, qu.compareCaseSensitive);
}
export function getSuppoertedExtensionsWithJsonIfResolveJsonModule(opts: qt.CompilerOpts | undefined, supportedExtensions: readonly string[]): readonly string[] {
  if (!opts || !opts.resolveJsonModule) return supportedExtensions;
  if (supportedExtensions === allSupportedExtensions) return allSupportedExtensionsWithJson;
  if (supportedExtensions === supportedTSExtensions) return supportedTSExtensionsWithJson;
  return [...supportedExtensions, Extension.Json];
}
function isJSLike(scriptKind: ScriptKind | undefined): boolean {
  return scriptKind === ScriptKind.JS || scriptKind === ScriptKind.JSX;
}
export function hasJSFileExtension(fileName: string): boolean {
  return qu.some(supportedJSExtensions, (extension) => fileExtensionIs(fileName, extension));
}
export function hasTSFileExtension(fileName: string): boolean {
  return qu.some(supportedTSExtensions, (extension) => fileExtensionIs(fileName, extension));
}
export function isSupportedSourceFileName(fileName: string, compilerOpts?: qt.CompilerOpts, extraFileExtensions?: readonly qt.FileExtensionInfo[]) {
  if (!fileName) return false;
  const supportedExtensions = getSupportedExtensions(compilerOpts, extraFileExtensions);
  for (const extension of getSuppoertedExtensionsWithJsonIfResolveJsonModule(compilerOpts, supportedExtensions)) {
    if (fileExtensionIs(fileName, extension)) return true;
  }
  return false;
}
export const enum ExtensionPriority {
  TypeScriptFiles = 0,
  DeclarationAndJavaScriptFiles = 2,
  Highest = TypeScriptFiles,
  Lowest = DeclarationAndJavaScriptFiles,
}
export function getExtensionPriority(path: string, supportedExtensions: readonly string[]): ExtensionPriority {
  for (let i = supportedExtensions.length - 1; i >= 0; i--) {
    if (fileExtensionIs(path, supportedExtensions[i])) return adjustExtensionPriority(<ExtensionPriority>i, supportedExtensions);
  }
  return ExtensionPriority.Highest;
}
export function adjustExtensionPriority(extensionPriority: ExtensionPriority, supportedExtensions: readonly string[]): ExtensionPriority {
  if (extensionPriority < ExtensionPriority.DeclarationAndJavaScriptFiles) return ExtensionPriority.TypeScriptFiles;
  else if (extensionPriority < supportedExtensions.length) return ExtensionPriority.DeclarationAndJavaScriptFiles;
  return supportedExtensions.length;
}
export function getNextLowestExtensionPriority(extensionPriority: ExtensionPriority, supportedExtensions: readonly string[]): ExtensionPriority {
  if (extensionPriority < ExtensionPriority.DeclarationAndJavaScriptFiles) return ExtensionPriority.DeclarationAndJavaScriptFiles;
  return supportedExtensions.length;
}
export function extensionIsTS(ext: Extension): boolean {
  return ext === Extension.Ts || ext === Extension.Tsx || ext === Extension.Dts;
}
export function resolutionExtensionIsTSOrJson(ext: Extension) {
  return extensionIsTS(ext) || ext === Extension.Json;
}
export function extensionFromPath(path: string): Extension {
  const ext = tryGetExtensionFromPath(path);
  return ext !== undefined ? ext : qu.fail(`File ${path} has unknown extension.`);
}
export function isAnySupportedFileExtension(path: string): boolean {
  return tryGetExtensionFromPath(path) !== undefined;
}
export function tryGetExtensionFromPath(path: string): Extension | undefined {
  return qu.find<Extension>(extensionsToRemove, (e) => fileExtensionIs(path, e));
}
export const emptyFileSystemEntries: FileSystemEntries = {
  files: qu.empty,
  directories: qu.empty,
};
export interface HostWithIsSourceOfProjectReferenceRedirect {
  isSourceOfProjectReferenceRedirect(fileName: string): boolean;
}
export function forSomeAncestorDirectory(directory: string, cb: (directory: string) => boolean): boolean {
  return !!forEachAncestorDirectory(directory, (d) => (cb(d) ? true : undefined));
}
