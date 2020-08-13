import { Node } from './type';
import * as qt from './type';
import * as qu from './util';
import { Syntax } from './syntax';
import * as qy from './syntax';
const enum RelativePreference {
  Relative,
  NonRelative,
  Auto,
}
const enum Ending {
  Minimal,
  Index,
  JsExtension,
}
interface Preferences {
  readonly relativePreference: RelativePreference;
  readonly ending: Ending;
}
function getPreferences({ importModuleSpecifierPreference, importModuleSpecifierEnding }: UserPreferences, compilerOpts: CompilerOpts, importingSourceFile: SourceFile): Preferences {
  return {
    relativePreference:
      importModuleSpecifierPreference === 'relative' ? RelativePreference.Relative : importModuleSpecifierPreference === 'non-relative' ? RelativePreference.NonRelative : RelativePreference.Auto,
    ending: getEnding(),
  };
  function getEnding(): Ending {
    switch (importModuleSpecifierEnding) {
      case 'minimal':
        return Ending.Minimal;
      case 'index':
        return Ending.Index;
      case 'js':
        return Ending.JsExtension;
      default:
        return usesJsExtensionOnImports(importingSourceFile) ? Ending.JsExtension : getEmitModuleResolutionKind(compilerOpts) !== ModuleResolutionKind.NodeJs ? Ending.Index : Ending.Minimal;
    }
  }
}
function getPreferencesForUpdate(compilerOpts: CompilerOpts, oldImportSpecifier: string): Preferences {
  return {
    relativePreference: isExternalModuleNameRelative(oldImportSpecifier) ? RelativePreference.Relative : RelativePreference.NonRelative,
    ending: hasJSFileExtension(oldImportSpecifier)
      ? Ending.JsExtension
      : getEmitModuleResolutionKind(compilerOpts) !== ModuleResolutionKind.NodeJs || endsWith(oldImportSpecifier, 'index')
      ? Ending.Index
      : Ending.Minimal,
  };
}
export function updateModuleSpecifier(
  compilerOpts: CompilerOpts,
  importingSourceFileName: Path,
  toFileName: string,
  host: ModuleSpecifierResolutionHost,
  oldImportSpecifier: string
): string | undefined {
  const res = getModuleSpecifierWorker(compilerOpts, importingSourceFileName, toFileName, host, getPreferencesForUpdate(compilerOpts, oldImportSpecifier));
  if (res === oldImportSpecifier) return;
  return res;
}
export function getModuleSpecifier(
  compilerOpts: CompilerOpts,
  importingSourceFile: SourceFile,
  importingSourceFileName: Path,
  toFileName: string,
  host: ModuleSpecifierResolutionHost,
  preferences: UserPreferences = {}
): string {
  return getModuleSpecifierWorker(compilerOpts, importingSourceFileName, toFileName, host, getPreferences(preferences, compilerOpts, importingSourceFile));
}
export function getNodeModulesPackageName(compilerOpts: CompilerOpts, importingSourceFileName: Path, nodeModulesFileName: string, host: ModuleSpecifierResolutionHost): string | undefined {
  const info = getInfo(importingSourceFileName, host);
  const modulePaths = getAllModulePaths(importingSourceFileName, nodeModulesFileName, host);
  return firstDefined(modulePaths, (moduleFileName) => tryGetModuleNameAsNodeModule(moduleFileName, info, host, compilerOpts, true));
}
function getModuleSpecifierWorker(compilerOpts: CompilerOpts, importingSourceFileName: Path, toFileName: string, host: ModuleSpecifierResolutionHost, preferences: Preferences): string {
  const info = getInfo(importingSourceFileName, host);
  const modulePaths = getAllModulePaths(importingSourceFileName, toFileName, host);
  return firstDefined(modulePaths, (moduleFileName) => tryGetModuleNameAsNodeModule(moduleFileName, info, host, compilerOpts)) || getLocalModuleSpecifier(toFileName, info, compilerOpts, preferences);
}
export function getModuleSpecifiers(
  moduleSymbol: Symbol,
  compilerOpts: CompilerOpts,
  importingSourceFile: SourceFile,
  host: ModuleSpecifierResolutionHost,
  userPreferences: UserPreferences
): readonly string[] {
  const ambient = tryGetModuleNameFromAmbientModule(moduleSymbol);
  if (ambient) return [ambient];
  const info = getInfo(importingSourceFile.path, host);
  const moduleSourceFile = (moduleSymbol.valueDeclaration || moduleSymbol.nonAugmentationDeclaration()).sourceFileOf;
  const modulePaths = getAllModulePaths(importingSourceFile.path, moduleSourceFile.originalFileName, host);
  const preferences = getPreferences(userPreferences, compilerOpts, importingSourceFile);
  const global = mapDefined(modulePaths, (moduleFileName) => tryGetModuleNameAsNodeModule(moduleFileName, info, host, compilerOpts));
  return global.length ? global : modulePaths.map((moduleFileName) => getLocalModuleSpecifier(moduleFileName, info, compilerOpts, preferences));
}
interface Info {
  readonly getCanonicalFileName: GetCanonicalFileName;
  readonly sourceDirectory: Path;
}
function getInfo(importingSourceFileName: Path, host: ModuleSpecifierResolutionHost): Info {
  const getCanonicalFileName = createGetCanonicalFileName(host.useCaseSensitiveFileNames ? host.useCaseSensitiveFileNames() : true);
  const sourceDirectory = getDirectoryPath(importingSourceFileName);
  return { getCanonicalFileName, sourceDirectory };
}
function getLocalModuleSpecifier(moduleFileName: string, { getCanonicalFileName, sourceDirectory }: Info, compilerOpts: CompilerOpts, { ending, relativePreference }: Preferences): string {
  const { baseUrl, paths, rootDirs } = compilerOpts;
  const relativePath =
    (rootDirs && tryGetModuleNameFromRootDirs(rootDirs, moduleFileName, sourceDirectory, getCanonicalFileName, ending, compilerOpts)) ||
    removeExtensionAndIndexPostFix(ensurePathIsNonModuleName(getRelativePathFromDirectory(sourceDirectory, moduleFileName, getCanonicalFileName)), ending, compilerOpts);
  if (!baseUrl || relativePreference === RelativePreference.Relative) return relativePath;
  const relativeToBaseUrl = getRelativePathIfInDirectory(moduleFileName, baseUrl, getCanonicalFileName);
  if (!relativeToBaseUrl) return relativePath;
  const importRelativeToBaseUrl = removeExtensionAndIndexPostFix(relativeToBaseUrl, ending, compilerOpts);
  const fromPaths = paths && tryGetModuleNameFromPaths(removeFileExtension(relativeToBaseUrl), importRelativeToBaseUrl, paths);
  const nonRelative = fromPaths === undefined ? importRelativeToBaseUrl : fromPaths;
  if (relativePreference === RelativePreference.NonRelative) return nonRelative;
  if (relativePreference !== RelativePreference.Auto) qc.assert.never(relativePreference);
  return isPathRelativeToParent(nonRelative) || countPathComponents(relativePath) < countPathComponents(nonRelative) ? relativePath : nonRelative;
}
export function countPathComponents(path: string): number {
  let count = 0;
  for (let i = startsWith(path, './') ? 2 : 0; i < path.length; i++) {
    if (path.charCodeAt(i) === Codes.slash) count++;
  }
  return count;
}
function usesJsExtensionOnImports({ imports }: SourceFile): boolean {
  return firstDefined(imports, ({ text }) => (pathIsRelative(text) ? hasJSFileExtension(text) : undefined)) || false;
}
function numberOfDirectorySeparators(str: string) {
  const match = str.match(/\//);
  return match ? match.length : 0;
}
function comparePathsByNumberOfDirectorySeparators(a: string, b: string) {
  return compareNumbers(numberOfDirectorySeparators(a), numberOfDirectorySeparators(b));
}
export function forEachFileNameOfModule<T>(
  importingFileName: string,
  importedFileName: string,
  host: ModuleSpecifierResolutionHost,
  preferSymlinks: boolean,
  cb: (fileName: string) => T | undefined
): T | undefined {
  const getCanonicalFileName = hostGetCanonicalFileName(host);
  const cwd = host.getCurrentDirectory();
  const referenceRedirect = host.isSourceOfProjectReferenceRedirect(importedFileName) ? host.getProjectReferenceRedirect(importedFileName) : undefined;
  const redirects = host.redirectTargetsMap.get(toPath(importedFileName, cwd, getCanonicalFileName)) || emptyArray;
  const importedFileNames = [...(referenceRedirect ? [referenceRedirect] : emptyArray), importedFileName, ...redirects];
  const targets = importedFileNames.map((f) => getNormalizedAbsolutePath(f, cwd));
  if (!preferSymlinks) {
    const result = forEach(targets, cb);
    if (result) return result;
  }
  const links = host.getProbableSymlinks ? host.getProbableSymlinks(host.getSourceFiles()) : discoverProbableSymlinks(host.getSourceFiles(), getCanonicalFileName, cwd);
  const compareStrings = !host.useCaseSensitiveFileNames || host.useCaseSensitiveFileNames() ? compareCaseSensitive : compareCaseInsensitive;
  const result = qu.forEachEntry(links, (resolved, path) => {
    if (startsWithDirectory(importingFileName, resolved, getCanonicalFileName)) {
      return;
    }
    const target = find(targets, (t) => compareStrings(t.slice(0, resolved.length + 1), resolved + '/') === Comparison.EqualTo);
    if (target === undefined) return;
    const relative = getRelativePathFromDirectory(resolved, target, getCanonicalFileName);
    const option = resolvePath(path, relative);
    if (!host.fileExists || host.fileExists(option)) {
      const result = cb(option);
      if (result) return result;
    }
  });
  return result || (preferSymlinks ? forEach(targets, cb) : undefined);
}
function getAllModulePaths(importingFileName: string, importedFileName: string, host: ModuleSpecifierResolutionHost): readonly string[] {
  const cwd = host.getCurrentDirectory();
  const getCanonicalFileName = hostGetCanonicalFileName(host);
  const allFileNames = createMap<string>();
  let importedFileFromNodeModules = false;
  forEachFileNameOfModule(importingFileName, importedFileName, host, true, (path) => {
    allFileNames.set(path, getCanonicalFileName(path));
    importedFileFromNodeModules = importedFileFromNodeModules || pathContainsNodeModules(path);
  });
  const sortedPaths: string[] = [];
  for (let directory = getDirectoryPath(toPath(importingFileName, cwd, getCanonicalFileName)); allFileNames.size !== 0; ) {
    const directoryStart = ensureTrailingDirectorySeparator(directory);
    let pathsInDirectory: string[] | undefined;
    allFileNames.forEach((canonicalFileName, fileName) => {
      if (startsWith(canonicalFileName, directoryStart)) {
        if (!importedFileFromNodeModules || pathContainsNodeModules(fileName)) {
          (pathsInDirectory || (pathsInDirectory = [])).push(fileName);
        }
        allFileNames.delete(fileName);
      }
    });
    if (pathsInDirectory) {
      if (pathsInDirectory.length > 1) {
        pathsInDirectory.sort(comparePathsByNumberOfDirectorySeparators);
      }
      sortedPaths.push(...pathsInDirectory);
    }
    const newDirectory = getDirectoryPath(directory);
    if (newDirectory === directory) break;
    directory = newDirectory;
  }
  if (allFileNames.size) {
    const remainingPaths = arrayFrom(allFileNames.values());
    if (remainingPaths.length > 1) remainingPaths.sort(comparePathsByNumberOfDirectorySeparators);
    sortedPaths.push(...remainingPaths);
  }
  return sortedPaths;
}
function tryGetModuleNameFromAmbientModule(moduleSymbol: Symbol): string | undefined {
  const decl = find(
    moduleSymbol.declarations,
    (d) => qc.is.nonGlobalAmbientModule(d) && (!qc.is.externalModuleAugmentation(d) || !isExternalModuleNameRelative(qf.get.textOfIdentifierOrLiteral(d.name)))
  ) as (ModuleDeclaration & { name: StringLiteral }) | undefined;
  if (decl) return decl.name.text;
}
function tryGetModuleNameFromPaths(relativeToBaseUrlWithIndex: string, relativeToBaseUrl: string, paths: MapLike<readonly string[]>): string | undefined {
  for (const key in paths) {
    for (const patternText of paths[key]) {
      const pattern = removeFileExtension(normalizePath(patternText));
      const indexOfStar = pattern.indexOf('*');
      if (indexOfStar !== -1) {
        const prefix = pattern.substr(0, indexOfStar);
        const suffix = pattern.substr(indexOfStar + 1);
        if (
          (relativeToBaseUrl.length >= prefix.length + suffix.length && startsWith(relativeToBaseUrl, prefix) && endsWith(relativeToBaseUrl, suffix)) ||
          (!suffix && relativeToBaseUrl === removeTrailingDirectorySeparator(prefix))
        ) {
          const matchedStar = relativeToBaseUrl.substr(prefix.length, relativeToBaseUrl.length - suffix.length);
          return key.replace('*', matchedStar);
        }
      } else if (pattern === relativeToBaseUrl || pattern === relativeToBaseUrlWithIndex) {
        return key;
      }
    }
  }
}
function tryGetModuleNameFromRootDirs(
  rootDirs: readonly string[],
  moduleFileName: string,
  sourceDirectory: string,
  getCanonicalFileName: (file: string) => string,
  ending: Ending,
  compilerOpts: CompilerOpts
): string | undefined {
  const normalizedTargetPath = getPathRelativeToRootDirs(moduleFileName, rootDirs, getCanonicalFileName);
  if (normalizedTargetPath === undefined) {
    return;
  }
  const normalizedSourcePath = getPathRelativeToRootDirs(sourceDirectory, rootDirs, getCanonicalFileName);
  const relativePath =
    normalizedSourcePath !== undefined ? ensurePathIsNonModuleName(getRelativePathFromDirectory(normalizedSourcePath, normalizedTargetPath, getCanonicalFileName)) : normalizedTargetPath;
  return getEmitModuleResolutionKind(compilerOpts) === ModuleResolutionKind.NodeJs ? removeExtensionAndIndexPostFix(relativePath, ending, compilerOpts) : removeFileExtension(relativePath);
}
function tryGetModuleNameAsNodeModule(
  moduleFileName: string,
  { getCanonicalFileName, sourceDirectory }: Info,
  host: ModuleSpecifierResolutionHost,
  opts: CompilerOpts,
  packageNameOnly?: boolean
): string | undefined {
  if (!host.fileExists || !host.readFile) {
    return;
  }
  const parts: NodeModulePathParts = getNodeModulePathParts(moduleFileName)!;
  if (!parts) {
    return;
  }
  let moduleSpecifier = moduleFileName;
  if (!packageNameOnly) {
    let packageRootIndex = parts.packageRootIndex;
    let moduleFileNameForExtensionless: string | undefined;
    while (true) {
      const { moduleFileToTry, packageRootPath } = tryDirectoryWithPackageJson(packageRootIndex);
      if (packageRootPath) {
        moduleSpecifier = packageRootPath;
        break;
      }
      if (!moduleFileNameForExtensionless) moduleFileNameForExtensionless = moduleFileToTry;
      packageRootIndex = moduleFileName.indexOf(dirSeparator, packageRootIndex + 1);
      if (packageRootIndex === -1) {
        moduleSpecifier = getExtensionlessFileName(moduleFileNameForExtensionless);
        break;
      }
    }
  }
  const globalTypingsCacheLocation = host.getGlobalTypingsCacheLocation && host.getGlobalTypingsCacheLocation();
  const pathToTopLevelNodeModules = getCanonicalFileName(moduleSpecifier.substring(0, parts.topLevelNodeModulesIndex));
  if (!(startsWith(sourceDirectory, pathToTopLevelNodeModules) || (globalTypingsCacheLocation && startsWith(getCanonicalFileName(globalTypingsCacheLocation), pathToTopLevelNodeModules)))) {
    return;
  }
  const nodeModulesDirectoryName = moduleSpecifier.substring(parts.topLevelPackageNameIndex + 1);
  const packageName = getPackageNameFromTypesPackageName(nodeModulesDirectoryName);
  return getEmitModuleResolutionKind(opts) !== ModuleResolutionKind.NodeJs && packageName === nodeModulesDirectoryName ? undefined : packageName;
  function tryDirectoryWithPackageJson(packageRootIndex: number) {
    const packageRootPath = moduleFileName.substring(0, packageRootIndex);
    const packageJsonPath = combinePaths(packageRootPath, 'package.json');
    let moduleFileToTry = moduleFileName;
    if (host.fileExists(packageJsonPath)) {
      const packageJsonContent = JSON.parse(host.readFile!(packageJsonPath)!);
      const versionPaths = packageJsonContent.typesVersions ? getPackageJsonTypesVersionsPaths(packageJsonContent.typesVersions) : undefined;
      if (versionPaths) {
        const subModuleName = moduleFileName.slice(packageRootPath.length + 1);
        const fromPaths = tryGetModuleNameFromPaths(removeFileExtension(subModuleName), removeExtensionAndIndexPostFix(subModuleName, Ending.Minimal, opts), versionPaths.paths);
        if (fromPaths !== undefined) {
          moduleFileToTry = combinePaths(packageRootPath, fromPaths);
        }
      }
      const mainFileRelative = packageJsonContent.typings || packageJsonContent.types || packageJsonContent.main;
      if (isString(mainFileRelative)) {
        const mainExportFile = toPath(mainFileRelative, packageRootPath, getCanonicalFileName);
        if (removeFileExtension(mainExportFile) === removeFileExtension(getCanonicalFileName(moduleFileToTry))) return { packageRootPath, moduleFileToTry };
      }
    }
    return { moduleFileToTry };
  }
  function getExtensionlessFileName(path: string): string {
    const fullModulePathWithoutExtension = removeFileExtension(path);
    if (
      getCanonicalFileName(fullModulePathWithoutExtension.substring(parts.fileNameIndex)) === '/index' &&
      !tryGetAnyFileFromPath(host, fullModulePathWithoutExtension.substring(0, parts.fileNameIndex))
    ) {
      return fullModulePathWithoutExtension.substring(0, parts.fileNameIndex);
    }
    return fullModulePathWithoutExtension;
  }
}
function tryGetAnyFileFromPath(host: ModuleSpecifierResolutionHost, path: string) {
  if (!host.fileExists) return;
  const extensions = getSupportedExtensions({ allowJs: true }, [
    { extension: 'node', isMixedContent: false },
    { extension: 'json', isMixedContent: false, scriptKind: ScriptKind.JSON },
  ]);
  for (const e of extensions) {
    const fullPath = path + e;
    if (host.fileExists(fullPath)) return fullPath;
  }
}
interface NodeModulePathParts {
  readonly topLevelNodeModulesIndex: number;
  readonly topLevelPackageNameIndex: number;
  readonly packageRootIndex: number;
  readonly fileNameIndex: number;
}
function getNodeModulePathParts(fullPath: string): NodeModulePathParts | undefined {
  let topLevelNodeModulesIndex = 0;
  let topLevelPackageNameIndex = 0;
  let packageRootIndex = 0;
  let fileNameIndex = 0;
  const enum States {
    BeforeNodeModules,
    NodeModules,
    Scope,
    PackageContent,
  }
  let partStart = 0;
  let partEnd = 0;
  let state = States.BeforeNodeModules;
  while (partEnd >= 0) {
    partStart = partEnd;
    partEnd = fullPath.indexOf('/', partStart + 1);
    switch (state) {
      case States.BeforeNodeModules:
        if (fullPath.indexOf(nodeModulesPathPart, partStart) === partStart) {
          topLevelNodeModulesIndex = partStart;
          topLevelPackageNameIndex = partEnd;
          state = States.NodeModules;
        }
        break;
      case States.NodeModules:
      case States.Scope:
        if (state === States.NodeModules && fullPath.charAt(partStart + 1) === '@') {
          state = States.Scope;
        } else {
          packageRootIndex = partEnd;
          state = States.PackageContent;
        }
        break;
      case States.PackageContent:
        if (fullPath.indexOf(nodeModulesPathPart, partStart) === partStart) {
          state = States.NodeModules;
        } else {
          state = States.PackageContent;
        }
        break;
    }
  }
  fileNameIndex = partStart;
  return state > States.NodeModules ? { topLevelNodeModulesIndex, topLevelPackageNameIndex, packageRootIndex, fileNameIndex } : undefined;
}
function getPathRelativeToRootDirs(path: string, rootDirs: readonly string[], getCanonicalFileName: GetCanonicalFileName): string | undefined {
  return firstDefined(rootDirs, (rootDir) => {
    const relativePath = getRelativePathIfInDirectory(path, rootDir, getCanonicalFileName)!;
    return isPathRelativeToParent(relativePath) ? undefined : relativePath;
  });
}
function removeExtensionAndIndexPostFix(fileName: string, ending: Ending, opts: CompilerOpts): string {
  if (fileExtensionIs(fileName, Extension.Json)) return fileName;
  const noExtension = removeFileExtension(fileName);
  switch (ending) {
    case Ending.Minimal:
      return removeSuffix(noExtension, '/index');
    case Ending.Index:
      return noExtension;
    case Ending.JsExtension:
      return noExtension + getJSExtensionForFile(fileName, opts);
    default:
      return qc.assert.never(ending);
  }
}
function getJSExtensionForFile(fileName: string, opts: CompilerOpts): Extension {
  const ext = qy.get.extensionFromPath(fileName);
  switch (ext) {
    case Extension.Ts:
    case Extension.Dts:
      return Extension.Js;
    case Extension.Tsx:
      return opts.jsx === JsxEmit.Preserve ? Extension.Jsx : Extension.Js;
    case Extension.Js:
    case Extension.Jsx:
    case Extension.Json:
      return ext;
    case Extension.TsBuildInfo:
      return fail(`Extension ${Extension.TsBuildInfo} is unsupported:: FileName:: ${fileName}`);
    default:
      return qc.assert.never(ext);
  }
}
function getRelativePathIfInDirectory(path: string, directoryPath: string, getCanonicalFileName: GetCanonicalFileName): string | undefined {
  const relativePath = getRelativePathToDirectoryOrUrl(directoryPath, path, directoryPath, getCanonicalFileName, false);
  return isRootedDiskPath(relativePath) ? undefined : relativePath;
}
function isPathRelativeToParent(path: string): boolean {
  return startsWith(path, '..');
}
export function trace(host: ModuleResolutionHost, message: qd.Message, ...args: any[]): void;
export function trace(host: ModuleResolutionHost): void {
  host.trace!(formatMessage.apply(undefined, args));
}
export function isTraceEnabled(compilerOpts: CompilerOpts, host: ModuleResolutionHost): boolean {
  return !!compilerOpts.traceResolution && host.trace !== undefined;
}
function withPackageId(packageInfo: PackageJsonInfo | undefined, r: PathAndExtension | undefined): Resolved | undefined {
  let packageId: PackageId | undefined;
  if (r && packageInfo) {
    const packageJsonContent = packageInfo.packageJsonContent as PackageJson;
    if (typeof packageJsonContent.name === 'string' && typeof packageJsonContent.version === 'string') {
      packageId = {
        name: packageJsonContent.name,
        subModuleName: r.path.slice(packageInfo.packageDirectory.length + dirSeparator.length),
        version: packageJsonContent.version,
      };
    }
  }
  return r && { path: r.path, extension: r.ext, packageId };
}
function noPackageId(r: PathAndExtension | undefined): Resolved | undefined {
  return withPackageId(undefined, r);
}
function removeIgnoredPackageId(r: Resolved | undefined): PathAndExtension | undefined {
  if (r) {
    assert(r.packageId === undefined);
    return { path: r.path, ext: r.extension };
  }
}
interface Resolved {
  path: string;
  extension: Extension;
  packageId: PackageId | undefined;
  originalPath?: string | true;
}
interface PathAndExtension {
  path: string;
  ext: Extension;
}
enum Extensions {
  TypeScript,
  JavaScript,
  Json,
  TSConfig,
  DtsOnly,
}
interface PathAndPackageId {
  readonly fileName: string;
  readonly packageId: PackageId | undefined;
}
function resolvedTypeScriptOnly(resolved: Resolved | undefined): PathAndPackageId | undefined {
  if (!resolved) {
    return;
  }
  assert(extensionIsTS(resolved.extension));
  return { fileName: resolved.path, packageId: resolved.packageId };
}
function createResolvedModuleWithFailedLookupLocations(
  resolved: Resolved | undefined,
  isExternalLibraryImport: boolean | undefined,
  failedLookupLocations: string[],
  resultFromCache: ResolvedModuleWithFailedLookupLocations | undefined
): ResolvedModuleWithFailedLookupLocations {
  if (resultFromCache) {
    resultFromCache.failedLookupLocations.push(...failedLookupLocations);
    return resultFromCache;
  }
  return {
    resolvedModule: resolved && {
      resolvedFileName: resolved.path,
      originalPath: resolved.originalPath === true ? undefined : resolved.originalPath,
      extension: resolved.extension,
      isExternalLibraryImport,
      packageId: resolved.packageId,
    },
    failedLookupLocations,
  };
}
interface ModuleResolutionState {
  host: ModuleResolutionHost;
  compilerOpts: CompilerOpts;
  traceEnabled: boolean;
  failedLookupLocations: Push<string>;
  resultFromCache?: ResolvedModuleWithFailedLookupLocations;
}
interface PackageJsonPathFields {
  typings?: string;
  types?: string;
  typesVersions?: MapLike<MapLike<string[]>>;
  main?: string;
  tsconfig?: string;
}
interface PackageJson extends PackageJsonPathFields {
  name?: string;
  version?: string;
}
function readPackageJsonField<TMatch, K extends MatchingKeys<PackageJson, string | undefined>>(
  jsonContent: PackageJson,
  fieldName: K,
  typeOfTag: 'string',
  state: ModuleResolutionState
): PackageJson[K] | undefined;
function readPackageJsonField<K extends MatchingKeys<PackageJson, object | undefined>>(
  jsonContent: PackageJson,
  fieldName: K,
  typeOfTag: 'object',
  state: ModuleResolutionState
): PackageJson[K] | undefined;
function readPackageJsonField<K extends keyof PackageJson>(jsonContent: PackageJson, fieldName: K, typeOfTag: 'string' | 'object', state: ModuleResolutionState): PackageJson[K] | undefined {
  if (!hasProperty(jsonContent, fieldName)) {
    if (state.traceEnabled) {
      trace(state.host, qd.package_json_does_not_have_a_0_field, fieldName);
    }
    return;
  }
  const value = jsonContent[fieldName];
  if (typeof value !== typeOfTag || value === null) {
    if (state.traceEnabled) {
      trace(state.host, qd.Expected_type_of_0_field_in_package_json_to_be_1_got_2, fieldName, typeOfTag, value === null ? 'null' : typeof value);
    }
    return;
  }
  return value;
}
function readPackageJsonPathField<K extends 'typings' | 'types' | 'main' | 'tsconfig'>(
  jsonContent: PackageJson,
  fieldName: K,
  baseDirectory: string,
  state: ModuleResolutionState
): PackageJson[K] | undefined {
  const fileName = readPackageJsonField(jsonContent, fieldName, 'string', state);
  if (fileName === undefined) {
    return;
  }
  if (!fileName) {
    if (state.traceEnabled) {
      trace(state.host, qd.package_json_had_a_falsy_0_field, fieldName);
    }
    return;
  }
  const path = normalizePath(combinePaths(baseDirectory, fileName));
  if (state.traceEnabled) {
    trace(state.host, qd.package_json_has_0_field_1_that_references_2, fieldName, fileName, path);
  }
  return path;
}
function readPackageJsonTypesFields(jsonContent: PackageJson, baseDirectory: string, state: ModuleResolutionState) {
  return readPackageJsonPathField(jsonContent, 'typings', baseDirectory, state) || readPackageJsonPathField(jsonContent, 'types', baseDirectory, state);
}
function readPackageJsonTSConfigField(jsonContent: PackageJson, baseDirectory: string, state: ModuleResolutionState) {
  return readPackageJsonPathField(jsonContent, 'tsconfig', baseDirectory, state);
}
function readPackageJsonMainField(jsonContent: PackageJson, baseDirectory: string, state: ModuleResolutionState) {
  return readPackageJsonPathField(jsonContent, 'main', baseDirectory, state);
}
function readPackageJsonTypesVersionsField(jsonContent: PackageJson, state: ModuleResolutionState) {
  const typesVersions = readPackageJsonField(jsonContent, 'typesVersions', 'object', state);
  if (typesVersions === undefined) return;
  if (state.traceEnabled) {
    trace(state.host, qd.package_json_has_a_typesVersions_field_with_version_specific_path_mappings);
  }
  return typesVersions;
}
interface VersionPaths {
  version: string;
  paths: MapLike<string[]>;
}
function readPackageJsonTypesVersionPaths(jsonContent: PackageJson, state: ModuleResolutionState): VersionPaths | undefined {
  const typesVersions = readPackageJsonTypesVersionsField(jsonContent, state);
  if (typesVersions === undefined) return;
  if (state.traceEnabled) {
    for (const key in typesVersions) {
      if (hasProperty(typesVersions, key) && !VersionRange.tryParse(key)) {
        trace(state.host, qd.package_json_has_a_typesVersions_entry_0_that_is_not_a_valid_semver_range, key);
      }
    }
  }
  const result = getPackageJsonTypesVersionsPaths(typesVersions);
  if (!result) {
    if (state.traceEnabled) {
      trace(state.host, qd.package_json_does_not_have_a_typesVersions_entry_that_matches_version_0, versionMajorMinor);
    }
    return;
  }
  const { version: bestVersionKey, paths: bestVersionPaths } = result;
  if (typeof bestVersionPaths !== 'object') {
    if (state.traceEnabled) {
      trace(state.host, qd.Expected_type_of_0_field_in_package_json_to_be_1_got_2, `typesVersions['${bestVersionKey}']`, 'object', typeof bestVersionPaths);
    }
    return;
  }
  return result;
}
let typeScriptVersion: Version | undefined;
export function getPackageJsonTypesVersionsPaths(typesVersions: MapLike<MapLike<string[]>>) {
  if (!typeScriptVersion) typeScriptVersion = new Version(version);
  for (const key in typesVersions) {
    if (!hasProperty(typesVersions, key)) continue;
    const keyRange = VersionRange.tryParse(key);
    if (keyRange === undefined) {
      continue;
    }
    if (keyRange.test(typeScriptVersion)) return { version: key, paths: typesVersions[key] };
  }
}
export function getEffectiveTypeRoots(opts: CompilerOpts, host: GetEffectiveTypeRootsHost): string[] | undefined {
  if (opts.typeRoots) return opts.typeRoots;
  let currentDirectory: string | undefined;
  if (opts.configFilePath) {
    currentDirectory = getDirectoryPath(opts.configFilePath);
  } else if (host.getCurrentDirectory) {
    currentDirectory = host.getCurrentDirectory();
  }
  if (currentDirectory !== undefined) return getDefaultTypeRoots(currentDirectory, host);
}
function getDefaultTypeRoots(currentDirectory: string, host: { directoryExists?: (directoryName: string) => boolean }): string[] | undefined {
  if (!host.directoryExists) return [combinePaths(currentDirectory, nodeModulesAtTypes)];
  let typeRoots: string[] | undefined;
  forEachAncestorDirectory(normalizePath(currentDirectory), (directory) => {
    const atTypes = combinePaths(directory, nodeModulesAtTypes);
    if (host.directoryExists!(atTypes)) {
      (typeRoots || (typeRoots = [])).push(atTypes);
    }
    return;
  });
  return typeRoots;
}
const nodeModulesAtTypes = combinePaths('node_modules', '@types');
export function resolveTypeReferenceDirective(
  typeReferenceDirectiveName: string,
  containingFile: string | undefined,
  opts: CompilerOpts,
  host: ModuleResolutionHost,
  redirectedReference?: ResolvedProjectReference
): ResolvedTypeReferenceDirectiveWithFailedLookupLocations {
  const traceEnabled = isTraceEnabled(opts, host);
  if (redirectedReference) {
    opts = redirectedReference.commandLine.opts;
  }
  const failedLookupLocations: string[] = [];
  const moduleResolutionState: ModuleResolutionState = { compilerOpts: opts, host, traceEnabled, failedLookupLocations };
  const typeRoots = getEffectiveTypeRoots(opts, host);
  if (traceEnabled) {
    if (containingFile === undefined) {
      if (typeRoots === undefined) {
        trace(host, qd.Resolving_type_reference_directive_0_containing_file_not_set_root_directory_not_set, typeReferenceDirectiveName);
      } else {
        trace(host, qd.Resolving_type_reference_directive_0_containing_file_not_set_root_directory_1, typeReferenceDirectiveName, typeRoots);
      }
    } else {
      if (typeRoots === undefined) {
        trace(host, qd.Resolving_type_reference_directive_0_containing_file_1_root_directory_not_set, typeReferenceDirectiveName, containingFile);
      } else {
        trace(host, qd.Resolving_type_reference_directive_0_containing_file_1_root_directory_2, typeReferenceDirectiveName, containingFile, typeRoots);
      }
    }
    if (redirectedReference) {
      trace(host, qd.Using_compiler_opts_of_project_reference_redirect_0, redirectedReference.sourceFile.fileName);
    }
  }
  let resolved = primaryLookup();
  let primary = true;
  if (!resolved) {
    resolved = secondaryLookup();
    primary = false;
  }
  let resolvedTypeReferenceDirective: ResolvedTypeReferenceDirective | undefined;
  if (resolved) {
    const { fileName, packageId } = resolved;
    const resolvedFileName = opts.preserveSymlinks ? fileName : realPath(fileName, host, traceEnabled);
    if (traceEnabled) {
      if (packageId) {
        trace(
          host,
          qd.Type_reference_directive_0_was_successfully_resolved_to_1_with_Package_ID_2_primary_Colon_3,
          typeReferenceDirectiveName,
          resolvedFileName,
          packageIdToString(packageId),
          primary
        );
      } else {
        trace(host, qd.Type_reference_directive_0_was_successfully_resolved_to_1_primary_Colon_2, typeReferenceDirectiveName, resolvedFileName, primary);
      }
    }
    resolvedTypeReferenceDirective = { primary, resolvedFileName, packageId, isExternalLibraryImport: pathContainsNodeModules(fileName) };
  }
  return { resolvedTypeReferenceDirective, failedLookupLocations };
  function directoryProbablyExists(directoryName: string, host: { directoryExists?: (directoryName: string) => boolean }): boolean {
    return !host.directoryExists || host.directoryExists(directoryName);
  }
  function primaryLookup(): PathAndPackageId | undefined {
    if (typeRoots && typeRoots.length) {
      if (traceEnabled) {
        trace(host, qd.Resolving_with_primary_search_path_0, typeRoots.join(', '));
      }
      return firstDefined(typeRoots, (typeRoot) => {
        const candidate = combinePaths(typeRoot, typeReferenceDirectiveName);
        const candidateDirectory = getDirectoryPath(candidate);
        const directoryExists = directoryProbablyExists(candidateDirectory, host);
        if (!directoryExists && traceEnabled) {
          trace(host, qd.Directory_0_does_not_exist_skipping_all_lookups_in_it, candidateDirectory);
        }
        return resolvedTypeScriptOnly(loadNodeModuleFromDirectory(Extensions.DtsOnly, candidate, !directoryExists, moduleResolutionState));
      });
    } else {
      if (traceEnabled) {
        trace(host, qd.Root_directory_cannot_be_determined_skipping_primary_search_paths);
      }
    }
  }
  function secondaryLookup(): PathAndPackageId | undefined {
    const initialLocationForSecondaryLookup = containingFile && getDirectoryPath(containingFile);
    if (initialLocationForSecondaryLookup !== undefined) {
      if (traceEnabled) {
        trace(host, qd.Looking_up_in_node_modules_folder_initial_location_0, initialLocationForSecondaryLookup);
      }
      let result: Resolved | undefined;
      if (!isExternalModuleNameRelative(typeReferenceDirectiveName)) {
        const searchResult = loadModuleFromNearestNodeModulesDirectory(Extensions.DtsOnly, typeReferenceDirectiveName, initialLocationForSecondaryLookup, moduleResolutionState, undefined, undefined);
        result = searchResult && searchResult.value;
      } else {
        const { path: candidate } = normalizePathAndParts(combinePaths(initialLocationForSecondaryLookup, typeReferenceDirectiveName));
        result = nodeLoadModuleByRelativeName(Extensions.DtsOnly, candidate, true);
      }
      const resolvedFile = resolvedTypeScriptOnly(result);
      if (!resolvedFile && traceEnabled) {
        trace(host, qd.Type_reference_directive_0_was_not_resolved, typeReferenceDirectiveName);
      }
      return resolvedFile;
    } else {
      if (traceEnabled) {
        trace(host, qd.Containing_file_is_not_specified_and_root_directory_cannot_be_determined_skipping_lookup_in_node_modules_folder);
      }
    }
  }
}
function readJson(path: string, host: { readFile(fileName: string): string | undefined }): object {
  try {
    const jsonText = host.readFile(path);
    if (!jsonText) return {};
    const result = parseConfigFileTextToJson(path, jsonText);
    if (result.error) return {};
    return result.config;
  } catch (e) {
    return {};
  }
}

export function getAutomaticTypeDirectiveNames(opts: CompilerOpts, host: ModuleResolutionHost): string[] {
  if (opts.types) return opts.types;
  const result: string[] = [];
  if (host.directoryExists && host.getDirectories) {
    const typeRoots = getEffectiveTypeRoots(opts, host);
    if (typeRoots) {
      for (const root of typeRoots) {
        if (host.directoryExists(root)) {
          for (const typeDirectivePath of host.getDirectories(root)) {
            const normalized = normalizePath(typeDirectivePath);
            const packageJsonPath = combinePaths(root, normalized, 'package.json');
            const isNotNeededPackage = host.fileExists(packageJsonPath) && (readJson(packageJsonPath, host) as PackageJson).typings === null;
            if (!isNotNeededPackage) {
              const baseFileName = getBaseFileName(normalized);
              if (baseFileName.charCodeAt(0) !== Codes.dot) {
                result.push(baseFileName);
              }
            }
          }
        }
      }
    }
  }
  return result;
}
export interface ModuleResolutionCache extends NonRelativeModuleNameResolutionCache {
  getOrCreateCacheForDirectory(directoryName: string, redirectedReference?: ResolvedProjectReference): Map<ResolvedModuleWithFailedLookupLocations>;
  directoryToModuleNameMap: CacheWithRedirects<Map<ResolvedModuleWithFailedLookupLocations>>;
}
export interface NonRelativeModuleNameResolutionCache {
  getOrCreateCacheForModuleName(nonRelativeModuleName: string, redirectedReference?: ResolvedProjectReference): PerModuleNameCache;
  moduleNameToDirectoryMap: CacheWithRedirects<PerModuleNameCache>;
}
export interface PerModuleNameCache {
  get(directory: string): ResolvedModuleWithFailedLookupLocations | undefined;
  set(directory: string, result: ResolvedModuleWithFailedLookupLocations): void;
}
export function createModuleResolutionCache(currentDirectory: string, getCanonicalFileName: (s: string) => string, opts?: CompilerOpts): ModuleResolutionCache {
  return createModuleResolutionCacheWithMaps(createCacheWithRedirects(opts), createCacheWithRedirects(opts), currentDirectory, getCanonicalFileName);
}
export interface CacheWithRedirects<T> {
  ownMap: Map<T>;
  redirectsMap: Map<Map<T>>;
  getOrCreateMapOfCacheRedirects(redirectedReference: ResolvedProjectReference | undefined): Map<T>;
  clear(): void;
  setOwnOpts(newOpts: CompilerOpts): void;
  setOwnMap(newOwnMap: Map<T>): void;
}
export function createCacheWithRedirects<T>(opts?: CompilerOpts): CacheWithRedirects<T> {
  let ownMap: Map<T> = createMap();
  const redirectsMap: Map<Map<T>> = createMap();
  return {
    ownMap,
    redirectsMap,
    getOrCreateMapOfCacheRedirects,
    clear,
    setOwnOpts,
    setOwnMap,
  };
  function setOwnOpts(newOpts: CompilerOpts) {
    opts = newOpts;
  }
  function setOwnMap(newOwnMap: Map<T>) {
    ownMap = newOwnMap;
  }
  function getOrCreateMapOfCacheRedirects(redirectedReference: ResolvedProjectReference | undefined) {
    if (!redirectedReference) return ownMap;
    const path = redirectedReference.sourceFile.path;
    let redirects = redirectsMap.get(path);
    if (!redirects) {
      redirects = !opts || optsHaveModuleResolutionChanges(opts, redirectedReference.commandLine.opts) ? createMap() : ownMap;
      redirectsMap.set(path, redirects);
    }
    return redirects;
  }
  function clear() {
    ownMap.clear();
    redirectsMap.clear();
  }
}
export function createModuleResolutionCacheWithMaps(
  directoryToModuleNameMap: CacheWithRedirects<Map<ResolvedModuleWithFailedLookupLocations>>,
  moduleNameToDirectoryMap: CacheWithRedirects<PerModuleNameCache>,
  currentDirectory: string,
  getCanonicalFileName: GetCanonicalFileName
): ModuleResolutionCache {
  return { getOrCreateCacheForDirectory, getOrCreateCacheForModuleName, directoryToModuleNameMap, moduleNameToDirectoryMap };
  function getOrCreateCacheForDirectory(directoryName: string, redirectedReference?: ResolvedProjectReference) {
    const path = toPath(directoryName, currentDirectory, getCanonicalFileName);
    return getOrCreateCache<Map<ResolvedModuleWithFailedLookupLocations>>(directoryToModuleNameMap, redirectedReference, path, createMap);
  }
  function getOrCreateCacheForModuleName(nonRelativeModuleName: string, redirectedReference?: ResolvedProjectReference): PerModuleNameCache {
    assert(!isExternalModuleNameRelative(nonRelativeModuleName));
    return getOrCreateCache(moduleNameToDirectoryMap, redirectedReference, nonRelativeModuleName, createPerModuleNameCache);
  }
  function getOrCreateCache<T>(cacheWithRedirects: CacheWithRedirects<T>, redirectedReference: ResolvedProjectReference | undefined, key: string, create: () => T): T {
    const cache = cacheWithRedirects.getOrCreateMapOfCacheRedirects(redirectedReference);
    let result = cache.get(key);
    if (!result) {
      result = create();
      cache.set(key, result);
    }
    return result;
  }
  function createPerModuleNameCache(): PerModuleNameCache {
    const directoryPathMap = createMap<ResolvedModuleWithFailedLookupLocations>();
    return { get, set };
    function get(directory: string): ResolvedModuleWithFailedLookupLocations | undefined {
      return directoryPathMap.get(toPath(directory, currentDirectory, getCanonicalFileName));
    }
    function set(directory: string, result: ResolvedModuleWithFailedLookupLocations): void {
      const path = toPath(directory, currentDirectory, getCanonicalFileName);
      if (directoryPathMap.has(path)) {
        return;
      }
      directoryPathMap.set(path, result);
      const resolvedFileName = result.resolvedModule && (result.resolvedModule.originalPath || result.resolvedModule.resolvedFileName);
      const commonPrefix = resolvedFileName && getCommonPrefix(path, resolvedFileName);
      let current = path;
      while (current !== commonPrefix) {
        const parent = getDirectoryPath(current);
        if (parent === current || directoryPathMap.has(parent)) {
          break;
        }
        directoryPathMap.set(parent, result);
        current = parent;
      }
    }
    function getCommonPrefix(directory: Path, resolution: string) {
      const resolutionDirectory = toPath(getDirectoryPath(resolution), currentDirectory, getCanonicalFileName);
      let i = 0;
      const limit = Math.min(directory.length, resolutionDirectory.length);
      while (i < limit && directory.charCodeAt(i) === resolutionDirectory.charCodeAt(i)) {
        i++;
      }
      if (i === directory.length && (resolutionDirectory.length === i || resolutionDirectory[i] === dirSeparator)) return directory;
      const rootLength = getRootLength(directory);
      if (i < rootLength) {
        return;
      }
      const sep = directory.lastIndexOf(dirSeparator, i - 1);
      if (sep === -1) {
        return;
      }
      return directory.substr(0, Math.max(sep, rootLength));
    }
  }
}
export function resolveModuleNameFromCache(moduleName: string, containingFile: string, cache: ModuleResolutionCache): ResolvedModuleWithFailedLookupLocations | undefined {
  const containingDirectory = getDirectoryPath(containingFile);
  const perFolderCache = cache && cache.getOrCreateCacheForDirectory(containingDirectory);
  return perFolderCache && perFolderCache.get(moduleName);
}
export function resolveModuleName(
  moduleName: string,
  containingFile: string,
  compilerOpts: CompilerOpts,
  host: ModuleResolutionHost,
  cache?: ModuleResolutionCache,
  redirectedReference?: ResolvedProjectReference
): ResolvedModuleWithFailedLookupLocations {
  const traceEnabled = isTraceEnabled(compilerOpts, host);
  if (redirectedReference) {
    compilerOpts = redirectedReference.commandLine.opts;
  }
  if (traceEnabled) {
    trace(host, qd.Resolving_module_0_from_1, moduleName, containingFile);
    if (redirectedReference) {
      trace(host, qd.Using_compiler_opts_of_project_reference_redirect_0, redirectedReference.sourceFile.fileName);
    }
  }
  const containingDirectory = getDirectoryPath(containingFile);
  const perFolderCache = cache && cache.getOrCreateCacheForDirectory(containingDirectory, redirectedReference);
  let result = perFolderCache && perFolderCache.get(moduleName);
  if (result) {
    if (traceEnabled) {
      trace(host, qd.Resolution_for_module_0_was_found_in_cache_from_location_1, moduleName, containingDirectory);
    }
  } else {
    let moduleResolution = compilerOpts.moduleResolution;
    if (moduleResolution === undefined) {
      moduleResolution = getEmitModuleKind(compilerOpts) === ModuleKind.CommonJS ? ModuleResolutionKind.NodeJs : ModuleResolutionKind.Classic;
      if (traceEnabled) {
        trace(host, qd.Module_resolution_kind_is_not_specified_using_0, ModuleResolutionKind[moduleResolution]);
      }
    } else {
      if (traceEnabled) {
        trace(host, qd.Explicitly_specified_module_resolution_kind_Colon_0, ModuleResolutionKind[moduleResolution]);
      }
    }
    perfLogger.logStartResolveModule(moduleName);
    switch (moduleResolution) {
      case ModuleResolutionKind.NodeJs:
        result = nodeModuleNameResolver(moduleName, containingFile, compilerOpts, host, cache, redirectedReference);
        break;
      case ModuleResolutionKind.Classic:
        result = classicNameResolver(moduleName, containingFile, compilerOpts, host, cache, redirectedReference);
        break;
      default:
        return fail(`Unexpected moduleResolution: ${moduleResolution}`);
    }
    if (result && result.resolvedModule) perfLogger.logInfoEvent(`Module "${moduleName}" resolved to "${result.resolvedModule.resolvedFileName}"`);
    perfLogger.logStopResolveModule(result && result.resolvedModule ? '' + result.resolvedModule.resolvedFileName : 'null');
    if (perFolderCache) {
      perFolderCache.set(moduleName, result);
      if (!isExternalModuleNameRelative(moduleName)) {
        cache!.getOrCreateCacheForModuleName(moduleName, redirectedReference).set(containingDirectory, result);
      }
    }
  }
  if (traceEnabled) {
    if (result.resolvedModule) {
      if (result.resolvedModule.packageId) {
        trace(host, qd.Module_name_0_was_successfully_resolved_to_1_with_Package_ID_2, moduleName, result.resolvedModule.resolvedFileName, packageIdToString(result.resolvedModule.packageId));
      } else {
        trace(host, qd.Module_name_0_was_successfully_resolved_to_1, moduleName, result.resolvedModule.resolvedFileName);
      }
    } else {
      trace(host, qd.Module_name_0_was_not_resolved, moduleName);
    }
  }
  return result;
}
type ResolutionKindSpecificLoader = (extensions: Extensions, candidate: string, onlyRecordFailures: boolean, state: ModuleResolutionState) => Resolved | undefined;
function tryLoadModuleUsingOptionalResolutionSettings(
  extensions: Extensions,
  moduleName: string,
  containingDirectory: string,
  loader: ResolutionKindSpecificLoader,
  state: ModuleResolutionState
): Resolved | undefined {
  const resolved = tryLoadModuleUsingPathsIfEligible(extensions, moduleName, loader, state);
  if (resolved) return resolved.value;
  if (!isExternalModuleNameRelative(moduleName)) return tryLoadModuleUsingBaseUrl(extensions, moduleName, loader, state);
  return tryLoadModuleUsingRootDirs(extensions, moduleName, containingDirectory, loader, state);
}
function tryLoadModuleUsingPathsIfEligible(extensions: Extensions, moduleName: string, loader: ResolutionKindSpecificLoader, state: ModuleResolutionState) {
  const { baseUrl, paths } = state.compilerOpts;
  if (baseUrl && paths && !pathIsRelative(moduleName)) {
    if (state.traceEnabled) {
      trace(state.host, qd.baseUrl_option_is_set_to_0_using_this_value_to_resolve_non_relative_module_name_1, baseUrl, moduleName);
      trace(state.host, qd.paths_option_is_specified_looking_for_a_pattern_to_match_module_name_0, moduleName);
    }
    return tryLoadModuleUsingPaths(extensions, moduleName, baseUrl, paths, loader, false, state);
  }
}
function tryLoadModuleUsingRootDirs(extensions: Extensions, moduleName: string, containingDirectory: string, loader: ResolutionKindSpecificLoader, state: ModuleResolutionState): Resolved | undefined {
  if (!state.compilerOpts.rootDirs) {
    return;
  }
  if (state.traceEnabled) {
    trace(state.host, qd.rootDirs_option_is_set_using_it_to_resolve_relative_module_name_0, moduleName);
  }
  const candidate = normalizePath(combinePaths(containingDirectory, moduleName));
  let matchedRootDir: string | undefined;
  let matchedNormalizedPrefix: string | undefined;
  for (const rootDir of state.compilerOpts.rootDirs) {
    let normalizedRoot = normalizePath(rootDir);
    if (!endsWith(normalizedRoot, dirSeparator)) {
      normalizedRoot += dirSeparator;
    }
    const isLongestMatchingPrefix = startsWith(candidate, normalizedRoot) && (matchedNormalizedPrefix === undefined || matchedNormalizedPrefix.length < normalizedRoot.length);
    if (state.traceEnabled) {
      trace(state.host, qd.Checking_if_0_is_the_longest_matching_prefix_for_1_2, normalizedRoot, candidate, isLongestMatchingPrefix);
    }
    if (isLongestMatchingPrefix) {
      matchedNormalizedPrefix = normalizedRoot;
      matchedRootDir = rootDir;
    }
  }
  if (matchedNormalizedPrefix) {
    if (state.traceEnabled) {
      trace(state.host, qd.Longest_matching_prefix_for_0_is_1, candidate, matchedNormalizedPrefix);
    }
    const suffix = candidate.substr(matchedNormalizedPrefix.length);
    if (state.traceEnabled) {
      trace(state.host, qd.Loading_0_from_the_root_dir_1_candidate_location_2, suffix, matchedNormalizedPrefix, candidate);
    }
    const resolvedFileName = loader(extensions, candidate, !directoryProbablyExists(containingDirectory, state.host), state);
    if (resolvedFileName) return resolvedFileName;
    if (state.traceEnabled) {
      trace(state.host, qd.Trying_other_entries_in_rootDirs);
    }
    for (const rootDir of state.compilerOpts.rootDirs) {
      if (rootDir === matchedRootDir) {
        continue;
      }
      const candidate = combinePaths(normalizePath(rootDir), suffix);
      if (state.traceEnabled) {
        trace(state.host, qd.Loading_0_from_the_root_dir_1_candidate_location_2, suffix, rootDir, candidate);
      }
      const baseDirectory = getDirectoryPath(candidate);
      const resolvedFileName = loader(extensions, candidate, !directoryProbablyExists(baseDirectory, state.host), state);
      if (resolvedFileName) return resolvedFileName;
    }
    if (state.traceEnabled) {
      trace(state.host, qd.Module_resolution_using_rootDirs_has_failed);
    }
  }
  return;
}
function tryLoadModuleUsingBaseUrl(extensions: Extensions, moduleName: string, loader: ResolutionKindSpecificLoader, state: ModuleResolutionState): Resolved | undefined {
  const { baseUrl } = state.compilerOpts;
  if (!baseUrl) {
    return;
  }
  if (state.traceEnabled) {
    trace(state.host, qd.baseUrl_option_is_set_to_0_using_this_value_to_resolve_non_relative_module_name_1, baseUrl, moduleName);
  }
  const candidate = normalizePath(combinePaths(baseUrl, moduleName));
  if (state.traceEnabled) {
    trace(state.host, qd.Resolving_module_name_0_relative_to_base_url_1_2, moduleName, baseUrl, candidate);
  }
  return loader(extensions, candidate, !directoryProbablyExists(getDirectoryPath(candidate), state.host), state);
}
export function resolveJSModule(moduleName: string, initialDir: string, host: ModuleResolutionHost): string {
  const { resolvedModule, failedLookupLocations } = tryResolveJSModuleWorker(moduleName, initialDir, host);
  if (!resolvedModule) {
    throw new Error(`Could not resolve JS module '${moduleName}' starting at '${initialDir}'. Looked in: ${failedLookupLocations.join(', ')}`);
  }
  return resolvedModule.resolvedFileName;
}
export function tryResolveJSModule(moduleName: string, initialDir: string, host: ModuleResolutionHost): string | undefined {
  const { resolvedModule } = tryResolveJSModuleWorker(moduleName, initialDir, host);
  return resolvedModule && resolvedModule.resolvedFileName;
}
const jsOnlyExtensions = [Extensions.JavaScript];
const tsExtensions = [Extensions.TypeScript, Extensions.JavaScript];
const tsPlusJsonExtensions = [...tsExtensions, Extensions.Json];
const tsconfigExtensions = [Extensions.TSConfig];
function tryResolveJSModuleWorker(moduleName: string, initialDir: string, host: ModuleResolutionHost): ResolvedModuleWithFailedLookupLocations {
  return nodeModuleNameResolverWorker(moduleName, initialDir, { moduleResolution: ModuleResolutionKind.NodeJs, allowJs: true }, host, undefined, jsOnlyExtensions, undefined);
}
export function nodeModuleNameResolver(
  moduleName: string,
  containingFile: string,
  compilerOpts: CompilerOpts,
  host: ModuleResolutionHost,
  cache?: ModuleResolutionCache,
  redirectedReference?: ResolvedProjectReference
): ResolvedModuleWithFailedLookupLocations;
export function nodeModuleNameResolver(
  moduleName: string,
  containingFile: string,
  compilerOpts: CompilerOpts,
  host: ModuleResolutionHost,
  cache?: ModuleResolutionCache,
  redirectedReference?: ResolvedProjectReference,
  lookupConfig?: boolean
): ResolvedModuleWithFailedLookupLocations;
export function nodeModuleNameResolver(
  moduleName: string,
  containingFile: string,
  compilerOpts: CompilerOpts,
  host: ModuleResolutionHost,
  cache?: ModuleResolutionCache,
  redirectedReference?: ResolvedProjectReference,
  lookupConfig?: boolean
): ResolvedModuleWithFailedLookupLocations {
  return nodeModuleNameResolverWorker(
    moduleName,
    getDirectoryPath(containingFile),
    compilerOpts,
    host,
    cache,
    lookupConfig ? tsconfigExtensions : compilerOpts.resolveJsonModule ? tsPlusJsonExtensions : tsExtensions,
    redirectedReference
  );
}
function nodeModuleNameResolverWorker(
  moduleName: string,
  containingDirectory: string,
  compilerOpts: CompilerOpts,
  host: ModuleResolutionHost,
  cache: ModuleResolutionCache | undefined,
  extensions: Extensions[],
  redirectedReference: ResolvedProjectReference | undefined
): ResolvedModuleWithFailedLookupLocations {
  const traceEnabled = isTraceEnabled(compilerOpts, host);
  const failedLookupLocations: string[] = [];
  const state: ModuleResolutionState = { compilerOpts, host, traceEnabled, failedLookupLocations };
  const result = forEach(extensions, (ext) => tryResolve(ext));
  return createResolvedModuleWithFailedLookupLocations(result?.value?.resolved, result?.value?.isExternalLibraryImport, failedLookupLocations, state.resultFromCache);
  function tryResolve(extensions: Extensions): SearchResult<{ resolved: Resolved; isExternalLibraryImport: boolean }> {
    const loader: ResolutionKindSpecificLoader = (extensions, candidate, onlyRecordFailures, state) => nodeLoadModuleByRelativeName(extensions, candidate, onlyRecordFailures, state, true);
    const resolved = tryLoadModuleUsingOptionalResolutionSettings(extensions, moduleName, containingDirectory, loader, state);
    if (resolved) return toSearchResult({ resolved, isExternalLibraryImport: pathContainsNodeModules(resolved.path) });
    if (!isExternalModuleNameRelative(moduleName)) {
      if (traceEnabled) {
        trace(host, qd.Loading_module_0_from_node_modules_folder_target_file_type_1, moduleName, Extensions[extensions]);
      }
      const resolved = loadModuleFromNearestNodeModulesDirectory(extensions, moduleName, containingDirectory, state, cache, redirectedReference);
      if (!resolved) return;
      let resolvedValue = resolved.value;
      if (!compilerOpts.preserveSymlinks && resolvedValue && !resolvedValue.originalPath) {
        const path = realPath(resolvedValue.path, host, traceEnabled);
        const originalPath = path === resolvedValue.path ? undefined : resolvedValue.path;
        resolvedValue = { ...resolvedValue, path, originalPath };
      }
      return { value: resolvedValue && { resolved: resolvedValue, isExternalLibraryImport: true } };
    } else {
      const { path: candidate, parts } = normalizePathAndParts(combinePaths(containingDirectory, moduleName));
      const resolved = nodeLoadModuleByRelativeName(extensions, candidate, true);
      return resolved && toSearchResult({ resolved, isExternalLibraryImport: contains(parts, 'node_modules') });
    }
  }
}
function realPath(path: string, host: ModuleResolutionHost, traceEnabled: boolean): string {
  if (!host.realpath) return path;
  const real = normalizePath(host.realpath(path));
  if (traceEnabled) {
    trace(host, qd.Resolving_real_path_for_0_result_1, path, real);
  }
  assert(host.fileExists(real), `${path} linked to nonexistent file ${real}`);
  return real;
}
function nodeLoadModuleByRelativeName(extensions: Extensions, candidate: string, onlyRecordFailures: boolean, state: ModuleResolutionState, considerPackageJson: boolean): Resolved | undefined {
  if (state.traceEnabled) {
    trace(state.host, qd.Loading_module_as_file_Slash_folder_candidate_module_location_0_target_file_type_1, candidate, Extensions[extensions]);
  }
  if (!hasTrailingDirectorySeparator(candidate)) {
    if (!onlyRecordFailures) {
      const parentOfCandidate = getDirectoryPath(candidate);
      if (!directoryProbablyExists(parentOfCandidate, state.host)) {
        if (state.traceEnabled) {
          trace(state.host, qd.Directory_0_does_not_exist_skipping_all_lookups_in_it, parentOfCandidate);
        }
        onlyRecordFailures = true;
      }
    }
    const resolvedFromFile = loadModuleFromFile(extensions, candidate, onlyRecordFailures, state);
    if (resolvedFromFile) {
      const packageDirectory = considerPackageJson ? parseNodeModuleFromPath(resolvedFromFile) : undefined;
      const packageInfo = packageDirectory ? getPackageJsonInfo(packageDirectory, false, state) : undefined;
      return withPackageId(packageInfo, resolvedFromFile);
    }
  }
  if (!onlyRecordFailures) {
    const candidateExists = directoryProbablyExists(candidate, state.host);
    if (!candidateExists) {
      if (state.traceEnabled) {
        trace(state.host, qd.Directory_0_does_not_exist_skipping_all_lookups_in_it, candidate);
      }
      onlyRecordFailures = true;
    }
  }
  return loadNodeModuleFromDirectory(extensions, candidate, onlyRecordFailures, state, considerPackageJson);
}
export const nodeModulesPathPart = '/node_modules/';
export function pathContainsNodeModules(path: string): boolean {
  return qu.stringContains(path, nodeModulesPathPart);
}
function parseNodeModuleFromPath(resolved: PathAndExtension): string | undefined {
  const path = normalizePath(resolved.path);
  const idx = path.lastIndexOf(nodeModulesPathPart);
  if (idx === -1) {
    return;
  }
  const indexAfterNodeModules = idx + nodeModulesPathPart.length;
  let indexAfterPackageName = moveToNextDirectorySeparatorIfAvailable(path, indexAfterNodeModules);
  if (path.charCodeAt(indexAfterNodeModules) === Codes.at) {
    indexAfterPackageName = moveToNextDirectorySeparatorIfAvailable(path, indexAfterPackageName);
  }
  return path.slice(0, indexAfterPackageName);
}
function moveToNextDirectorySeparatorIfAvailable(path: string, prevSeparatorIndex: number): number {
  const nextSeparatorIndex = path.indexOf(dirSeparator, prevSeparatorIndex + 1);
  return nextSeparatorIndex === -1 ? prevSeparatorIndex : nextSeparatorIndex;
}
function loadModuleFromFileNoPackageId(extensions: Extensions, candidate: string, onlyRecordFailures: boolean, state: ModuleResolutionState): Resolved | undefined {
  return noPackageId(loadModuleFromFile(extensions, candidate, onlyRecordFailures, state));
}
function loadModuleFromFile(extensions: Extensions, candidate: string, onlyRecordFailures: boolean, state: ModuleResolutionState): PathAndExtension | undefined {
  if (extensions === Extensions.Json || extensions === Extensions.TSConfig) {
    const extensionLess = tryRemoveExtension(candidate, Extension.Json);
    return extensionLess === undefined && extensions === Extensions.Json ? undefined : tryAddingExtensions(extensionLess || candidate, extensions, onlyRecordFailures, state);
  }
  const resolvedByAddingExtension = tryAddingExtensions(candidate, extensions, onlyRecordFailures, state);
  if (resolvedByAddingExtension) return resolvedByAddingExtension;
  if (hasJSFileExtension(candidate)) {
    const extensionless = removeFileExtension(candidate);
    if (state.traceEnabled) {
      const extension = candidate.substring(extensionless.length);
      trace(state.host, qd.File_name_0_has_a_1_extension_stripping_it, candidate, extension);
    }
    return tryAddingExtensions(extensionless, extensions, onlyRecordFailures, state);
  }
}
function tryAddingExtensions(candidate: string, extensions: Extensions, onlyRecordFailures: boolean, state: ModuleResolutionState): PathAndExtension | undefined {
  if (!onlyRecordFailures) {
    const directory = getDirectoryPath(candidate);
    if (directory) {
      onlyRecordFailures = !directoryProbablyExists(directory, state.host);
    }
  }
  switch (extensions) {
    case Extensions.DtsOnly:
      return tryExtension(Extension.Dts);
    case Extensions.TypeScript:
      return tryExtension(Extension.Ts) || tryExtension(Extension.Tsx) || tryExtension(Extension.Dts);
    case Extensions.JavaScript:
      return tryExtension(Extension.Js) || tryExtension(Extension.Jsx);
    case Extensions.TSConfig:
    case Extensions.Json:
      return tryExtension(Extension.Json);
  }
  function tryExtension(ext: Extension): PathAndExtension | undefined {
    const path = tryFile(candidate + ext, onlyRecordFailures, state);
    return path === undefined ? undefined : { path, ext };
  }
}
function tryFile(fileName: string, onlyRecordFailures: boolean, state: ModuleResolutionState): string | undefined {
  if (!onlyRecordFailures) {
    if (state.host.fileExists(fileName)) {
      if (state.traceEnabled) {
        trace(state.host, qd.File_0_exist_use_it_as_a_name_resolution_result, fileName);
      }
      return fileName;
    } else {
      if (state.traceEnabled) {
        trace(state.host, qd.File_0_does_not_exist, fileName);
      }
    }
  }
  state.failedLookupLocations.push(fileName);
  return;
}
function loadNodeModuleFromDirectory(extensions: Extensions, candidate: string, onlyRecordFailures: boolean, state: ModuleResolutionState, considerPackageJson = true) {
  const packageInfo = considerPackageJson ? getPackageJsonInfo(candidate, onlyRecordFailures, state) : undefined;
  const packageJsonContent = packageInfo && packageInfo.packageJsonContent;
  const versionPaths = packageInfo && packageInfo.versionPaths;
  return withPackageId(packageInfo, loadNodeModuleFromDirectoryWorker(extensions, candidate, onlyRecordFailures, state, packageJsonContent, versionPaths));
}
interface PackageJsonInfo {
  packageDirectory: string;
  packageJsonContent: PackageJsonPathFields;
  versionPaths: VersionPaths | undefined;
}
function getPackageJsonInfo(packageDirectory: string, onlyRecordFailures: boolean, state: ModuleResolutionState): PackageJsonInfo | undefined {
  const { host, traceEnabled } = state;
  const directoryExists = !onlyRecordFailures && directoryProbablyExists(packageDirectory, host);
  const packageJsonPath = combinePaths(packageDirectory, 'package.json');
  if (directoryExists && host.fileExists(packageJsonPath)) {
    const packageJsonContent = readJson(packageJsonPath, host) as PackageJson;
    if (traceEnabled) {
      trace(host, qd.Found_package_json_at_0, packageJsonPath);
    }
    const versionPaths = readPackageJsonTypesVersionPaths(packageJsonContent, state);
    return { packageDirectory, packageJsonContent, versionPaths };
  } else {
    if (directoryExists && traceEnabled) {
      trace(host, qd.File_0_does_not_exist, packageJsonPath);
    }
    state.failedLookupLocations.push(packageJsonPath);
  }
}
function loadNodeModuleFromDirectoryWorker(
  extensions: Extensions,
  candidate: string,
  onlyRecordFailures: boolean,
  state: ModuleResolutionState,
  jsonContent: PackageJsonPathFields | undefined,
  versionPaths: VersionPaths | undefined
): PathAndExtension | undefined {
  let packageFile: string | undefined;
  if (jsonContent) {
    switch (extensions) {
      case Extensions.JavaScript:
      case Extensions.Json:
        packageFile = readPackageJsonMainField(jsonContent, candidate, state);
        break;
      case Extensions.TypeScript:
        packageFile = readPackageJsonTypesFields(jsonContent, candidate, state) || readPackageJsonMainField(jsonContent, candidate, state);
        break;
      case Extensions.DtsOnly:
        packageFile = readPackageJsonTypesFields(jsonContent, candidate, state);
        break;
      case Extensions.TSConfig:
        packageFile = readPackageJsonTSConfigField(jsonContent, candidate, state);
        break;
      default:
        return qc.assert.never(extensions);
    }
  }
  const loader: ResolutionKindSpecificLoader = (extensions, candidate, onlyRecordFailures, state) => {
    const fromFile = tryFile(candidate, onlyRecordFailures, state);
    if (fromFile) {
      const resolved = resolvedIfExtensionMatches(extensions, fromFile);
      if (resolved) return noPackageId(resolved);
      if (state.traceEnabled) {
        trace(state.host, qd.File_0_has_an_unsupported_extension_so_skipping_it, fromFile);
      }
    }
    const nextExtensions = extensions === Extensions.DtsOnly ? Extensions.TypeScript : extensions;
    return nodeLoadModuleByRelativeName(nextExtensions, candidate, onlyRecordFailures, state, false);
  };
  const onlyRecordFailuresForPackageFile = packageFile ? !directoryProbablyExists(getDirectoryPath(packageFile), state.host) : undefined;
  const onlyRecordFailuresForIndex = onlyRecordFailures || !directoryProbablyExists(candidate, state.host);
  const indexPath = combinePaths(candidate, extensions === Extensions.TSConfig ? 'tsconfig' : 'index');
  if (versionPaths && (!packageFile || containsPath(candidate, packageFile))) {
    const moduleName = getRelativePathFromDirectory(candidate, packageFile || indexPath, false);
    if (state.traceEnabled) {
      trace(state.host, qd.package_json_has_a_typesVersions_entry_0_that_matches_compiler_version_1_looking_for_a_pattern_to_match_module_name_2, versionPaths.version, version, moduleName);
    }
    const result = tryLoadModuleUsingPaths(extensions, moduleName, candidate, versionPaths.paths, loader, onlyRecordFailuresForPackageFile || onlyRecordFailuresForIndex, state);
    if (result) return removeIgnoredPackageId(result.value);
  }
  const packageFileResult = packageFile && removeIgnoredPackageId(loader(extensions, packageFile, onlyRecordFailuresForPackageFile!, state));
  if (packageFileResult) return packageFileResult;
  return loadModuleFromFile(extensions, indexPath, onlyRecordFailuresForIndex, state);
}
function resolvedIfExtensionMatches(extensions: Extensions, path: string): PathAndExtension | undefined {
  const ext = tryGetExtensionFromPath(path);
  return ext !== undefined && extensionIsOk(extensions, ext) ? { path, ext } : undefined;
}
function extensionIsOk(extensions: Extensions, extension: Extension): boolean {
  switch (extensions) {
    case Extensions.JavaScript:
      return extension === Extension.Js || extension === Extension.Jsx;
    case Extensions.TSConfig:
    case Extensions.Json:
      return extension === Extension.Json;
    case Extensions.TypeScript:
      return extension === Extension.Ts || extension === Extension.Tsx || extension === Extension.Dts;
    case Extensions.DtsOnly:
      return extension === Extension.Dts;
  }
}
export function parsePackageName(moduleName: string): { packageName: string; rest: string } {
  let idx = moduleName.indexOf(dirSeparator);
  if (moduleName[0] === '@') {
    idx = moduleName.indexOf(dirSeparator, idx + 1);
  }
  return idx === -1 ? { packageName: moduleName, rest: '' } : { packageName: moduleName.slice(0, idx), rest: moduleName.slice(idx + 1) };
}
function loadModuleFromNearestNodeModulesDirectory(
  extensions: Extensions,
  moduleName: string,
  directory: string,
  state: ModuleResolutionState,
  cache: NonRelativeModuleNameResolutionCache | undefined,
  redirectedReference: ResolvedProjectReference | undefined
): SearchResult<Resolved> {
  return loadModuleFromNearestNodeModulesDirectoryWorker(extensions, moduleName, directory, state, false, cache, redirectedReference);
}
function loadModuleFromNearestNodeModulesDirectoryTypesScope(moduleName: string, directory: string, state: ModuleResolutionState): SearchResult<Resolved> {
  return loadModuleFromNearestNodeModulesDirectoryWorker(Extensions.DtsOnly, moduleName, directory, state, undefined);
}
function loadModuleFromNearestNodeModulesDirectoryWorker(
  extensions: Extensions,
  moduleName: string,
  directory: string,
  state: ModuleResolutionState,
  typesScopeOnly: boolean,
  cache: NonRelativeModuleNameResolutionCache | undefined,
  redirectedReference: ResolvedProjectReference | undefined
): SearchResult<Resolved> {
  const perModuleNameCache = cache && cache.getOrCreateCacheForModuleName(moduleName, redirectedReference);
  return forEachAncestorDirectory(normalizeSlashes(directory), (ancestorDirectory) => {
    if (getBaseFileName(ancestorDirectory) !== 'node_modules') {
      const resolutionFromCache = tryFindNonRelativeModuleNameInCache(perModuleNameCache, moduleName, ancestorDirectory, state);
      if (resolutionFromCache) return resolutionFromCache;
      return toSearchResult(loadModuleFromImmediateNodeModulesDirectory(extensions, moduleName, ancestorDirectory, state, typesScopeOnly));
    }
  });
}
function loadModuleFromImmediateNodeModulesDirectory(extensions: Extensions, moduleName: string, directory: string, state: ModuleResolutionState, typesScopeOnly: boolean): Resolved | undefined {
  const nodeModulesFolder = combinePaths(directory, 'node_modules');
  const nodeModulesFolderExists = directoryProbablyExists(nodeModulesFolder, state.host);
  if (!nodeModulesFolderExists && state.traceEnabled) {
    trace(state.host, qd.Directory_0_does_not_exist_skipping_all_lookups_in_it, nodeModulesFolder);
  }
  const packageResult = typesScopeOnly ? undefined : loadModuleFromSpecificNodeModulesDirectory(extensions, moduleName, nodeModulesFolder, nodeModulesFolderExists, state);
  if (packageResult) return packageResult;
  if (extensions === Extensions.TypeScript || extensions === Extensions.DtsOnly) {
    const nodeModulesAtTypes = combinePaths(nodeModulesFolder, '@types');
    let nodeModulesAtTypesExists = nodeModulesFolderExists;
    if (nodeModulesFolderExists && !directoryProbablyExists(nodeModulesAtTypes, state.host)) {
      if (state.traceEnabled) {
        trace(state.host, qd.Directory_0_does_not_exist_skipping_all_lookups_in_it, nodeModulesAtTypes);
      }
      nodeModulesAtTypesExists = false;
    }
    return loadModuleFromSpecificNodeModulesDirectory(Extensions.DtsOnly, mangleScopedPackageNameWithTrace(moduleName, state), nodeModulesAtTypes, nodeModulesAtTypesExists, state);
  }
}
function loadModuleFromSpecificNodeModulesDirectory(
  extensions: Extensions,
  moduleName: string,
  nodeModulesDirectory: string,
  nodeModulesDirectoryExists: boolean,
  state: ModuleResolutionState
): Resolved | undefined {
  const candidate = normalizePath(combinePaths(nodeModulesDirectory, moduleName));
  let packageInfo = getPackageJsonInfo(candidate, !nodeModulesDirectoryExists, state);
  if (packageInfo) {
    const fromFile = loadModuleFromFile(extensions, candidate, !nodeModulesDirectoryExists, state);
    if (fromFile) return noPackageId(fromFile);
    const fromDirectory = loadNodeModuleFromDirectoryWorker(extensions, candidate, !nodeModulesDirectoryExists, state, packageInfo.packageJsonContent, packageInfo.versionPaths);
    return withPackageId(packageInfo, fromDirectory);
  }
  const loader: ResolutionKindSpecificLoader = (extensions, candidate, onlyRecordFailures, state) => {
    const pathAndExtension =
      loadModuleFromFile(extensions, candidate, onlyRecordFailures, state) ||
      loadNodeModuleFromDirectoryWorker(extensions, candidate, onlyRecordFailures, state, packageInfo && packageInfo.packageJsonContent, packageInfo && packageInfo.versionPaths);
    return withPackageId(packageInfo, pathAndExtension);
  };
  const { packageName, rest } = parsePackageName(moduleName);
  if (rest !== '') {
    const packageDirectory = combinePaths(nodeModulesDirectory, packageName);
    packageInfo = getPackageJsonInfo(packageDirectory, !nodeModulesDirectoryExists, state);
    if (packageInfo && packageInfo.versionPaths) {
      if (state.traceEnabled) {
        trace(state.host, qd.package_json_has_a_typesVersions_entry_0_that_matches_compiler_version_1_looking_for_a_pattern_to_match_module_name_2, packageInfo.versionPaths.version, version, rest);
      }
      const packageDirectoryExists = nodeModulesDirectoryExists && directoryProbablyExists(packageDirectory, state.host);
      const fromPaths = tryLoadModuleUsingPaths(extensions, rest, packageDirectory, packageInfo.versionPaths.paths, loader, !packageDirectoryExists, state);
      if (fromPaths) return fromPaths.value;
    }
  }
  return loader(extensions, candidate, !nodeModulesDirectoryExists, state);
}
function tryLoadModuleUsingPaths(
  extensions: Extensions,
  moduleName: string,
  baseDirectory: string,
  paths: MapLike<string[]>,
  loader: ResolutionKindSpecificLoader,
  onlyRecordFailures: boolean,
  state: ModuleResolutionState
): SearchResult<Resolved> {
  const matchedPattern = matchPatternOrExact(getOwnKeys(paths), moduleName);
  if (matchedPattern) {
    const matchedStar = isString(matchedPattern) ? undefined : matchedText(matchedPattern, moduleName);
    const matchedPatternText = isString(matchedPattern) ? matchedPattern : patternText(matchedPattern);
    if (state.traceEnabled) {
      trace(state.host, qd.Module_name_0_matched_pattern_1, moduleName, matchedPatternText);
    }
    const resolved = forEach(paths[matchedPatternText], (subst) => {
      const path = matchedStar ? subst.replace('*', matchedStar) : subst;
      const candidate = normalizePath(combinePaths(baseDirectory, path));
      if (state.traceEnabled) {
        trace(state.host, qd.Trying_substitution_0_candidate_module_location_Colon_1, subst, path);
      }
      const extension = tryGetExtensionFromPath(candidate);
      if (extension !== undefined) {
        const path = tryFile(candidate, onlyRecordFailures, state);
        if (path !== undefined) return noPackageId({ path, ext: extension });
      }
      return loader(extensions, candidate, onlyRecordFailures || !directoryProbablyExists(getDirectoryPath(candidate), state.host), state);
    });
    return { value: resolved };
  }
}
const mangledScopedPackageSeparator = '__';
function mangleScopedPackageNameWithTrace(packageName: string, state: ModuleResolutionState): string {
  const mangled = mangleScopedPackageName(packageName);
  if (state.traceEnabled && mangled !== packageName) {
    trace(state.host, qd.Scoped_package_detected_looking_in_0, mangled);
  }
  return mangled;
}
export function getTypesPackageName(packageName: string): string {
  return `@types/${mangleScopedPackageName(packageName)}`;
}
export function mangleScopedPackageName(packageName: string): string {
  if (startsWith(packageName, '@')) {
    const replaceSlash = packageName.replace(dirSeparator, mangledScopedPackageSeparator);
    if (replaceSlash !== packageName) return replaceSlash.slice(1);
  }
  return packageName;
}
export function getPackageNameFromTypesPackageName(mangledName: string): string {
  const withoutAtTypePrefix = removePrefix(mangledName, '@types/');
  if (withoutAtTypePrefix !== mangledName) return unmangleScopedPackageName(withoutAtTypePrefix);
  return mangledName;
}
export function unmangleScopedPackageName(typesPackageName: string): string {
  return qu.stringContains(typesPackageName, mangledScopedPackageSeparator) ? '@' + typesPackageName.replace(mangledScopedPackageSeparator, dirSeparator) : typesPackageName;
}
function tryFindNonRelativeModuleNameInCache(cache: PerModuleNameCache | undefined, moduleName: string, containingDirectory: string, state: ModuleResolutionState): SearchResult<Resolved> {
  const result = cache && cache.get(containingDirectory);
  if (result) {
    if (state.traceEnabled) {
      trace(state.host, qd.Resolution_for_module_0_was_found_in_cache_from_location_1, moduleName, containingDirectory);
    }
    state.resultFromCache = result;
    return {
      value: result.resolvedModule && {
        path: result.resolvedModule.resolvedFileName,
        originalPath: result.resolvedModule.originalPath || true,
        extension: result.resolvedModule.extension,
        packageId: result.resolvedModule.packageId,
      },
    };
  }
}
export function classicNameResolver(
  moduleName: string,
  containingFile: string,
  compilerOpts: CompilerOpts,
  host: ModuleResolutionHost,
  cache?: NonRelativeModuleNameResolutionCache,
  redirectedReference?: ResolvedProjectReference
): ResolvedModuleWithFailedLookupLocations {
  const traceEnabled = isTraceEnabled(compilerOpts, host);
  const failedLookupLocations: string[] = [];
  const state: ModuleResolutionState = { compilerOpts, host, traceEnabled, failedLookupLocations };
  const containingDirectory = getDirectoryPath(containingFile);
  const resolved = tryResolve(Extensions.TypeScript) || tryResolve(Extensions.JavaScript);
  return createResolvedModuleWithFailedLookupLocations(resolved && resolved.value, false, failedLookupLocations, state.resultFromCache);
  function tryResolve(extensions: Extensions): SearchResult<Resolved> {
    const resolvedUsingSettings = tryLoadModuleUsingOptionalResolutionSettings(extensions, moduleName, containingDirectory, loadModuleFromFileNoPackageId, state);
    if (resolvedUsingSettings) return { value: resolvedUsingSettings };
    if (!isExternalModuleNameRelative(moduleName)) {
      const perModuleNameCache = cache && cache.getOrCreateCacheForModuleName(moduleName, redirectedReference);
      const resolved = forEachAncestorDirectory(containingDirectory, (directory) => {
        const resolutionFromCache = tryFindNonRelativeModuleNameInCache(perModuleNameCache, moduleName, directory, state);
        if (resolutionFromCache) return resolutionFromCache;
        const searchName = normalizePath(combinePaths(directory, moduleName));
        return toSearchResult(loadModuleFromFileNoPackageId(extensions, searchName, false, state));
      });
      if (resolved) return resolved;
      if (extensions === Extensions.TypeScript) return loadModuleFromNearestNodeModulesDirectoryTypesScope(moduleName, containingDirectory, state);
    } else {
      const candidate = normalizePath(combinePaths(containingDirectory, moduleName));
      return toSearchResult(loadModuleFromFileNoPackageId(extensions, candidate, false, state));
    }
  }
}
export function loadModuleFromGlobalCache(
  moduleName: string,
  projectName: string | undefined,
  compilerOpts: CompilerOpts,
  host: ModuleResolutionHost,
  globalCache: string
): ResolvedModuleWithFailedLookupLocations {
  const traceEnabled = isTraceEnabled(compilerOpts, host);
  if (traceEnabled) {
    trace(host, qd.Auto_discovery_for_typings_is_enabled_in_project_0_Running_extra_resolution_pass_for_module_1_using_cache_location_2, projectName, moduleName, globalCache);
  }
  const failedLookupLocations: string[] = [];
  const state: ModuleResolutionState = { compilerOpts, host, traceEnabled, failedLookupLocations };
  const resolved = loadModuleFromImmediateNodeModulesDirectory(Extensions.DtsOnly, moduleName, globalCache, state, false);
  return createResolvedModuleWithFailedLookupLocations(resolved, true, failedLookupLocations, state.resultFromCache);
}
type SearchResult<T> = { value: T | undefined } | undefined;
function toSearchResult<T>(value: T | undefined): SearchResult<T> {
  return value !== undefined ? { value } : undefined;
}
export function importFromModuleSpecifier(node: StringLiteralLike): AnyValidImportOrReExport {
  return tryGetImportFromModuleSpecifier(node) || qu.failBadSyntax(node.parent);
}
export function tryGetImportFromModuleSpecifier(node: StringLiteralLike): AnyValidImportOrReExport | undefined {
  switch (node.parent.kind) {
    case Syntax.ImportDeclaration:
    case Syntax.ExportDeclaration:
      return node.parent as AnyValidImportOrReExport;
    case Syntax.ExternalModuleReference:
      return (node.parent as ExternalModuleReference).parent as AnyValidImportOrReExport;
    case Syntax.CallExpression:
      return qf.is.importCall(node.parent) || qf.is.requireCall(node.parent, false) ? (node.parent as RequireOrImportCall) : undefined;
    case Syntax.LiteralTyping:
      assert(node.kind === Syntax.StringLiteral);
      return qu.tryCast(node.parent.parent, ImportTyping.kind) as ValidImportTyping | undefined;
    default:
      return;
  }
}
