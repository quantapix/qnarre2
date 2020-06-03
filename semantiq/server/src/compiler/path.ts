namespace qnr {
  export const directorySeparator = '/';
  const altDirectorySeparator = '\\';
  const urlSchemeSeparator = '://';
  const backslashRegExp = /\\/g;

  export function isAnyDirectorySeparator(charCode: number): boolean {
    return charCode === CharCodes.slash || charCode === CharCodes.backslash;
  }

  export function isUrl(path: string) {
    return getEncodedRootLength(path) < 0;
  }

  export function isRootedDiskPath(path: string) {
    return getEncodedRootLength(path) > 0;
  }

  export function isDiskPathRoot(path: string) {
    const rootLength = getEncodedRootLength(path);
    return rootLength > 0 && rootLength === path.length;
  }

  export function pathIsAbsolute(path: string): boolean {
    return getEncodedRootLength(path) !== 0;
  }

  export function pathIsRelative(path: string): boolean {
    return /^\.\.?($|[\\/])/.test(path);
  }

  export function hasExtension(fileName: string): boolean {
    return stringContains(getBaseFileName(fileName), '.');
  }

  export function fileExtensionIs(path: string, extension: string): boolean {
    return path.length > extension.length && endsWith(path, extension);
  }

  export function fileExtensionIsOneOf(path: string, extensions: readonly string[]): boolean {
    for (const extension of extensions) {
      if (fileExtensionIs(path, extension)) {
        return true;
      }
    }
    return false;
  }

  export function hasTrailingDirectorySeparator(path: string) {
    return path.length > 0 && isAnyDirectorySeparator(path.charCodeAt(path.length - 1));
  }

  function isVolumeCharacter(charCode: number) {
    return (charCode >= CharCodes.a && charCode <= CharCodes.z) || (charCode >= CharCodes.A && charCode <= CharCodes.Z);
  }

  function getFileUrlVolumeSeparatorEnd(url: string, start: number) {
    const ch0 = url.charCodeAt(start);
    if (ch0 === CharCodes.colon) return start + 1;
    if (ch0 === CharCodes.percent && url.charCodeAt(start + 1) === CharCodes._3) {
      const ch2 = url.charCodeAt(start + 2);
      if (ch2 === CharCodes.a || ch2 === CharCodes.A) return start + 3;
    }
    return -1;
  }

  function getEncodedRootLength(path: string): number {
    if (!path) return 0;
    const ch0 = path.charCodeAt(0);
    if (ch0 === CharCodes.slash || ch0 === CharCodes.backslash) {
      if (path.charCodeAt(1) !== ch0) return 1; // POSIX: "/" (or non-normalized "\")
      const p1 = path.indexOf(ch0 === CharCodes.slash ? directorySeparator : altDirectorySeparator, 2);
      if (p1 < 0) return path.length;
      return p1 + 1;
    }
    if (isVolumeCharacter(ch0) && path.charCodeAt(1) === CharCodes.colon) {
      const ch2 = path.charCodeAt(2);
      if (ch2 === CharCodes.slash || ch2 === CharCodes.backslash) return 3; // DOS: "c:/" or "c:\"
      if (path.length === 2) return 2;
    }
    const schemeEnd = path.indexOf(urlSchemeSeparator);
    if (schemeEnd !== -1) {
      const authorityStart = schemeEnd + urlSchemeSeparator.length;
      const authorityEnd = path.indexOf(directorySeparator, authorityStart);
      if (authorityEnd !== -1) {
        const scheme = path.slice(0, schemeEnd);
        const authority = path.slice(authorityStart, authorityEnd);
        if (scheme === 'file' && (authority === '' || authority === 'localhost') && isVolumeCharacter(path.charCodeAt(authorityEnd + 1))) {
          const volumeSeparatorEnd = getFileUrlVolumeSeparatorEnd(path, authorityEnd + 2);
          if (volumeSeparatorEnd !== -1) {
            if (path.charCodeAt(volumeSeparatorEnd) === CharCodes.slash) {
              return ~(volumeSeparatorEnd + 1);
            }
            if (volumeSeparatorEnd === path.length) {
              return ~volumeSeparatorEnd;
            }
          }
        }
        return ~(authorityEnd + 1);
      }
      return ~path.length;
    }
    return 0;
  }

  export function getRootLength(path: string) {
    const rootLength = getEncodedRootLength(path);
    return rootLength < 0 ? ~rootLength : rootLength;
  }

  export function getDirectoryPath(path: Path): Path;
  export function getDirectoryPath(path: string): string;
  export function getDirectoryPath(path: string): string {
    path = normalizeSlashes(path);

    // If the path provided is itself the root, then return it.
    const rootLength = getRootLength(path);
    if (rootLength === path.length) return path;

    // return the leading portion of the path up to the last (non-terminal) directory separator
    // but not including any trailing directory separator.
    path = removeTrailingDirectorySeparator(path);
    return path.slice(0, Math.max(rootLength, path.lastIndexOf(directorySeparator)));
  }

  export function getBaseFileName(path: string): string;
  export function getBaseFileName(path: string, extensions: string | readonly string[], ignoreCase: boolean): string;
  export function getBaseFileName(path: string, extensions?: string | readonly string[], ignoreCase?: boolean) {
    path = normalizeSlashes(path);
    const rootLength = getRootLength(path);
    if (rootLength === path.length) return '';
    path = removeTrailingDirectorySeparator(path);
    const name = path.slice(Math.max(getRootLength(path), path.lastIndexOf(directorySeparator) + 1));
    const extension = extensions !== undefined && ignoreCase !== undefined ? getAnyExtensionFromPath(name, extensions, ignoreCase) : undefined;
    return extension ? name.slice(0, name.length - extension.length) : name;
  }

  function tryGetExtensionFromPath(path: string, extension: string, stringEqualityComparer: (a: string, b: string) => boolean) {
    if (!startsWith(extension, '.')) extension = '.' + extension;
    if (path.length >= extension.length && path.charCodeAt(path.length - extension.length) === CharCodes.dot) {
      const pathExtension = path.slice(path.length - extension.length);
      if (stringEqualityComparer(pathExtension, extension)) {
        return pathExtension;
      }
    }
    return;
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
      if (result) return result;
    }
    return '';
  }

  export function getAnyExtensionFromPath(path: string): string;
  export function getAnyExtensionFromPath(path: string, extensions: string | readonly string[], ignoreCase: boolean): string;
  export function getAnyExtensionFromPath(path: string, extensions?: string | readonly string[], ignoreCase?: boolean): string {
    if (extensions) {
      return getAnyExtensionFromPathWorker(
        removeTrailingDirectorySeparator(path),
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

  function pathComponents(path: string, rootLength: number) {
    const root = path.substring(0, rootLength);
    const rest = path.substring(rootLength).split(directorySeparator);
    if (rest.length && !lastOrUndefined(rest)) rest.pop();
    return [root, ...rest];
  }

  export function getPathComponents(path: string, currentDirectory = '') {
    path = combinePaths(currentDirectory, path);
    return pathComponents(path, getRootLength(path));
  }

  export function getPathFromPathComponents(pathComponents: readonly string[]) {
    if (pathComponents.length === 0) return '';

    const root = pathComponents[0] && ensureTrailingDirectorySeparator(pathComponents[0]);
    return root + pathComponents.slice(1).join(directorySeparator);
  }

  export function normalizeSlashes(path: string): string {
    return path.replace(backslashRegExp, directorySeparator);
  }

  export function reducePathComponents(components: readonly string[]) {
    if (!some(components)) return [];
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
      if (!path || getRootLength(relativePath) !== 0) {
        path = relativePath;
      } else {
        path = ensureTrailingDirectorySeparator(path) + relativePath;
      }
    }
    return path;
  }

  export function resolvePath(path: string, ...paths: (string | undefined)[]): string {
    return normalizePath(some(paths) ? combinePaths(path, ...paths) : normalizeSlashes(path));
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
    return pathComponents.slice(1).join(directorySeparator);
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
      const joinedParts = root + parts.join(directorySeparator);
      return { path: hasTrailingDirectorySeparator(path) ? ensureTrailingDirectorySeparator(joinedParts) : joinedParts, parts };
    } else {
      return { path: root, parts };
    }
  }

  export function removeTrailingDirectorySeparator(path: Path): Path;
  export function removeTrailingDirectorySeparator(path: string): string;
  export function removeTrailingDirectorySeparator(path: string) {
    if (hasTrailingDirectorySeparator(path)) {
      return path.substr(0, path.length - 1);
    }
    return path;
  }

  export function ensureTrailingDirectorySeparator(path: Path): Path;
  export function ensureTrailingDirectorySeparator(path: string): string;
  export function ensureTrailingDirectorySeparator(path: string) {
    if (!hasTrailingDirectorySeparator(path)) {
      return path + directorySeparator;
    }
    return path;
  }

  export function ensurePathIsNonModuleName(path: string): string {
    return !pathIsAbsolute(path) && !pathIsRelative(path) ? './' + path : path;
  }

  export function changeAnyExtension(path: string, ext: string): string;
  export function changeAnyExtension(path: string, ext: string, extensions: string | readonly string[], ignoreCase: boolean): string;
  export function changeAnyExtension(path: string, ext: string, extensions?: string | readonly string[], ignoreCase?: boolean) {
    const pathext =
      extensions !== undefined && ignoreCase !== undefined ? getAnyExtensionFromPath(path, extensions, ignoreCase) : getAnyExtensionFromPath(path);
    return pathext ? path.slice(0, path.length - pathext.length) + (startsWith(ext, '.') ? ext : '.' + ext) : path;
  }

  const relativePathSegmentRegExp = /(^|\/)\.{0,2}($|\/)/;

  function comparePathsWorker(a: string, b: string, componentComparer: (a: string, b: string) => Comparison) {
    if (a === b) return Comparison.EqualTo;
    if (a === undefined) return Comparison.LessThan;
    if (b === undefined) return Comparison.GreaterThan;
    const aRoot = a.substring(0, getRootLength(a));
    const bRoot = b.substring(0, getRootLength(b));
    const result = compareStringsCaseInsensitive(aRoot, bRoot);
    if (result !== Comparison.EqualTo) {
      return result;
    }
    const aRest = a.substring(aRoot.length);
    const bRest = b.substring(bRoot.length);
    if (!relativePathSegmentRegExp.test(aRest) && !relativePathSegmentRegExp.test(bRest)) {
      return componentComparer(aRest, bRest);
    }
    const aComponents = reducePathComponents(getPathComponents(a));
    const bComponents = reducePathComponents(getPathComponents(b));
    const sharedLength = Math.min(aComponents.length, bComponents.length);
    for (let i = 1; i < sharedLength; i++) {
      const result = componentComparer(aComponents[i], bComponents[i]);
      if (result !== Comparison.EqualTo) {
        return result;
      }
    }
    return compareValues(aComponents.length, bComponents.length);
  }

  export function comparePathsCaseSensitive(a: string, b: string) {
    return comparePathsWorker(a, b, compareStringsCaseSensitive);
  }

  export function comparePathsCaseInsensitive(a: string, b: string) {
    return comparePathsWorker(a, b, compareStringsCaseInsensitive);
  }

  export function comparePaths(a: string, b: string, ignoreCase?: boolean): Comparison;
  export function comparePaths(a: string, b: string, currentDirectory: string, ignoreCase?: boolean): Comparison;
  export function comparePaths(a: string, b: string, currentDirectory?: string | boolean, ignoreCase?: boolean) {
    if (typeof currentDirectory === 'string') {
      a = combinePaths(currentDirectory, a);
      b = combinePaths(currentDirectory, b);
    } else if (typeof currentDirectory === 'boolean') {
      ignoreCase = currentDirectory;
    }
    return comparePathsWorker(a, b, getStringComparer(ignoreCase));
  }

  export function containsPath(parent: string, child: string, ignoreCase?: boolean): boolean;
  export function containsPath(parent: string, child: string, currentDirectory: string, ignoreCase?: boolean): boolean;
  export function containsPath(parent: string, child: string, currentDirectory?: string | boolean, ignoreCase?: boolean) {
    if (typeof currentDirectory === 'string') {
      parent = combinePaths(currentDirectory, parent);
      child = combinePaths(currentDirectory, child);
    } else if (typeof currentDirectory === 'boolean') {
      ignoreCase = currentDirectory;
    }
    if (parent === undefined || child === undefined) return false;
    if (parent === child) return true;
    const parentComponents = reducePathComponents(getPathComponents(parent));
    const childComponents = reducePathComponents(getPathComponents(child));
    if (childComponents.length < parentComponents.length) {
      return false;
    }
    const componentEqualityComparer = ignoreCase ? equateStringsCaseInsensitive : equateStringsCaseSensitive;
    for (let i = 0; i < parentComponents.length; i++) {
      const equalityComparer = i === 0 ? equateStringsCaseInsensitive : componentEqualityComparer;
      if (!equalityComparer(parentComponents[i], childComponents[i])) {
        return false;
      }
    }
    return true;
  }

  export function startsWithDirectory(fileName: string, directoryName: string, getCanonicalFileName: GetCanonicalFileName): boolean {
    const canonicalFileName = getCanonicalFileName(fileName);
    const canonicalDirectoryName = getCanonicalFileName(directoryName);
    return startsWith(canonicalFileName, canonicalDirectoryName + '/') || startsWith(canonicalFileName, canonicalDirectoryName + '\\');
  }

  export function getPathComponentsRelativeTo(
    from: string,
    to: string,
    stringEqualityComparer: (a: string, b: string) => boolean,
    getCanonicalFileName: GetCanonicalFileName
  ) {
    const fromComponents = reducePathComponents(getPathComponents(from));
    const toComponents = reducePathComponents(getPathComponents(to));
    let start: number;
    for (start = 0; start < fromComponents.length && start < toComponents.length; start++) {
      const fromComponent = getCanonicalFileName(fromComponents[start]);
      const toComponent = getCanonicalFileName(toComponents[start]);
      const comparer = start === 0 ? equateStringsCaseInsensitive : stringEqualityComparer;
      if (!comparer(fromComponent, toComponent)) break;
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

  export function getRelativePathFromDirectory(from: string, to: string, ignoreCase: boolean): string;
  export function getRelativePathFromDirectory(fromDirectory: string, to: string, getCanonicalFileName: GetCanonicalFileName): string; // eslint-disable-line @typescript-eslint/unified-signatures
  export function getRelativePathFromDirectory(fromDirectory: string, to: string, getCanonicalFileNameOrIgnoreCase: GetCanonicalFileName | boolean) {
    Debug.assert(getRootLength(fromDirectory) > 0 === getRootLength(to) > 0, 'Paths must either both be absolute or both be relative');
    const getCanonicalFileName = typeof getCanonicalFileNameOrIgnoreCase === 'function' ? getCanonicalFileNameOrIgnoreCase : identity;
    const ignoreCase = typeof getCanonicalFileNameOrIgnoreCase === 'boolean' ? getCanonicalFileNameOrIgnoreCase : false;
    const pathComponents = getPathComponentsRelativeTo(
      fromDirectory,
      to,
      ignoreCase ? equateStringsCaseInsensitive : equateStringsCaseSensitive,
      getCanonicalFileName
    );
    return getPathFromPathComponents(pathComponents);
  }

  export function convertToRelativePath(absoluteOrRelativePath: string, basePath: string, getCanonicalFileName: (path: string) => string): string {
    return !isRootedDiskPath(absoluteOrRelativePath)
      ? absoluteOrRelativePath
      : getRelativePathToDirectoryOrUrl(basePath, absoluteOrRelativePath, basePath, getCanonicalFileName, /*isAbsolutePathAnUrl*/ false);
  }

  export function getRelativePathFromFile(from: string, to: string, getCanonicalFileName: GetCanonicalFileName) {
    return ensurePathIsNonModuleName(getRelativePathFromDirectory(getDirectoryPath(from), to, getCanonicalFileName));
  }

  export function getRelativePathToDirectoryOrUrl(
    directoryPathOrUrl: string,
    relativeOrAbsolutePath: string,
    currentDirectory: string,
    getCanonicalFileName: GetCanonicalFileName,
    isAbsolutePathAnUrl: boolean
  ) {
    const pathComponents = getPathComponentsRelativeTo(
      resolvePath(currentDirectory, directoryPathOrUrl),
      resolvePath(currentDirectory, relativeOrAbsolutePath),
      equateStringsCaseSensitive,
      getCanonicalFileName
    );
    const firstComponent = pathComponents[0];
    if (isAbsolutePathAnUrl && isRootedDiskPath(firstComponent)) {
      const prefix = firstComponent.charAt(0) === directorySeparator ? 'file://' : 'file:///';
      pathComponents[0] = prefix + firstComponent;
    }
    return getPathFromPathComponents(pathComponents);
  }

  export function forEachAncestorDirectory<T>(directory: Path, callback: (_: Path) => T | undefined): T | undefined;
  export function forEachAncestorDirectory<T>(directory: string, callback: (_: string) => T | undefined): T | undefined;
  export function forEachAncestorDirectory<T>(directory: Path, callback: (_: Path) => T | undefined): T | undefined {
    while (true) {
      const result = callback(directory);
      if (result !== undefined) {
        return result;
      }
      const parentPath = getDirectoryPath(directory);
      if (parentPath === directory) {
        return;
      }
      directory = parentPath;
    }
  }

  export function isNodeModulesDirectory(dirPath: Path) {
    return endsWith(dirPath, '/node_modules');
  }
}
