import { Node } from './types';
import { qf } from './core';
import { Syntax } from './syntax';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
const minimumDate = new Date(-8640000000000000);
const maximumDate = new Date(8640000000000000);
export interface BuildOpts {
  dry?: boolean;
  force?: boolean;
  verbose?: boolean;
  clean?: boolean;
  watch?: boolean;
  help?: boolean;
  preserveWatchOutput?: boolean;
  listEmittedFiles?: boolean;
  listFiles?: boolean;
  pretty?: boolean;
  incremental?: boolean;
  assumeChangesOnlyAffectDirectDependencies?: boolean;
  traceResolution?: boolean;
  diagnostics?: boolean;
  extendedDiagnostics?: boolean;
  locale?: string;
  generateCpuProfile?: string;
  [option: string]: qt.CompilerOptsValue | undefined;
}
enum BuildResultFlags {
  None = 0,
  Success = 1 << 0,
  DeclarationOutputUnchanged = 1 << 1,
  ConfigFileErrors = 1 << 2,
  SyntaxErrors = 1 << 3,
  TypeErrors = 1 << 4,
  DeclarationEmitErrors = 1 << 5,
  EmitErrors = 1 << 6,
  AnyErrors = ConfigFileErrors | SyntaxErrors | TypeErrors | DeclarationEmitErrors | EmitErrors,
}
export type ResolvedConfigFilePath = qt.ResolvedConfigFileName & qt.Path;
interface FileMap<T, U extends qt.Path = qt.Path> extends Map<T> {
  get(key: U): T | undefined;
  has(key: U): boolean;
  forEach(action: (value: T, key: U) => void): void;
  readonly size: number;
  keys(): Iterator<U>;
  values(): Iterator<T>;
  entries(): Iterator<[U, T]>;
  set(key: U, value: T): this;
  delete(key: U): boolean;
  clear(): void;
}
type ConfigFileMap<T> = FileMap<T, ResolvedConfigFilePath>;
function createConfigFileMap<T>(): ConfigFileMap<T> {
  return qu.createMap() as ConfigFileMap<T>;
}
function getOrCreateValueFromConfigFileMap<T>(configFileMap: ConfigFileMap<T>, resolved: ResolvedConfigFilePath, createT: () => T): T {
  const existingValue = configFileMap.get(resolved);
  let newValue: T | undefined;
  if (!existingValue) {
    newValue = createT();
    configFileMap.set(resolved, newValue);
  }
  return existingValue || newValue!;
}
function getOrCreateValueMapFromConfigFileMap<T>(configFileMap: ConfigFileMap<Map<T>>, resolved: ResolvedConfigFilePath): Map<T> {
  return getOrCreateValueFromConfigFileMap<Map<T>>(configFileMap, resolved, createMap);
}
function newer(date1: Date, date2: Date): Date {
  return date2 > date1 ? date2 : date1;
}
function isDeclarationFile(fileName: string) {
  return fileExtensionIs(fileName, qt.Extension.Dts);
}
export type ReportEmitErrorSummary = (errorCount: number) => void;
export interface SolutionBuilderHostBase<T extends BuilderProgram> extends ProgramHost<T> {
  createDirectory?(path: string): void;
  writeFile?(path: string, data: string, writeByteOrderMark?: boolean): void;
  getModifiedTime(fileName: string): Date | undefined;
  setModifiedTime(fileName: string, date: Date): void;
  deleteFile(fileName: string): void;
  getParsedCommandLine?(fileName: string): qt.ParsedCommandLine | undefined;
  reportDiagnostic: DiagnosticReporter;
  reportSolutionBuilderStatus: DiagnosticReporter;
  afterProgramEmitAndDiagnostics?(program: T): void;
  afterEmitBundle?(config: qt.ParsedCommandLine): void;
  now?(): Date;
}
export interface SolutionBuilderHost<T extends BuilderProgram> extends SolutionBuilderHostBase<T> {
  reportErrorSummary?: ReportEmitErrorSummary;
}
export interface SolutionBuilderWithWatchHost<T extends BuilderProgram> extends SolutionBuilderHostBase<T>, WatchHost {}
export type BuildOrder = readonly qt.ResolvedConfigFileName[];
export interface CircularBuildOrder {
  buildOrder: BuildOrder;
  circularDiagnostics: readonly Diagnostic[];
}
export type AnyBuildOrder = BuildOrder | CircularBuildOrder;
export function isCircularBuildOrder(buildOrder: AnyBuildOrder): buildOrder is CircularBuildOrder {
  return !!buildOrder && !!(buildOrder as CircularBuildOrder).buildOrder;
}
export function getBuildOrderFromAnyBuildOrder(anyBuildOrder: AnyBuildOrder): BuildOrder {
  return isCircularBuildOrder(anyBuildOrder) ? anyBuildOrder.buildOrder : anyBuildOrder;
}
export interface SolutionBuilder<T extends BuilderProgram> {
  build(project?: string, cancellationToken?: qt.CancellationToken): ExitStatus;
  clean(project?: string): ExitStatus;
  buildReferences(project: string, cancellationToken?: qt.CancellationToken): ExitStatus;
  cleanReferences(project?: string): ExitStatus;
  getNextInvalidatedProject(cancellationToken?: qt.CancellationToken): InvalidatedProject<T> | undefined;
  getBuildOrder(): AnyBuildOrder;
  getUpToDateStatusOfProject(project: string): UpToDateStatus;
  invalidateProject(configFilePath: ResolvedConfigFilePath, reloadLevel?: ConfigFileProgramReloadLevel): void;
  buildNextInvalidatedProject(): void;
  getAllParsedConfigs(): readonly qt.ParsedCommandLine[];
  close(): void;
}
export function createBuilderStatusReporter(system: System, pretty?: boolean): DiagnosticReporter {
  return (diagnostic) => {
    let output = pretty ? `[${formatColorAndReset(getLocaleTimeString(system), ForegroundColorEscapeSequences.Grey)}] ` : `${getLocaleTimeString(system)} - `;
    output += `${flattenqd.MessageText(diagnostic.messageText, system.newLine)}${system.newLine + system.newLine}`;
    system.write(output);
  };
}
function createSolutionBuilderHostBase<T extends BuilderProgram>(
  system: System,
  createProgram: CreateProgram<T> | undefined,
  reportDiagnostic?: DiagnosticReporter,
  reportSolutionBuilderStatus?: DiagnosticReporter
) {
  const host = createProgramHost(system, createProgram) as SolutionBuilderHostBase<T>;
  host.getModifiedTime = system.getModifiedTime ? (path) => system.getModifiedTime!(path) : () => undefined;
  host.setModifiedTime = system.setModifiedTime ? (path, date) => system.setModifiedTime!(path, date) : noop;
  host.deleteFile = system.deleteFile ? (path) => system.deleteFile!(path) : noop;
  host.reportDiagnostic = reportDiagnostic || createDiagnosticReporter(system);
  host.reportSolutionBuilderStatus = reportSolutionBuilderStatus || createBuilderStatusReporter(system);
  host.now = maybeBind(system, system.now);
  return host;
}
export function createSolutionBuilderHost<T extends BuilderProgram = EmitAndSemanticDiagnosticsBuilderProgram>(
  system = sys,
  createProgram?: CreateProgram<T>,
  reportDiagnostic?: DiagnosticReporter,
  reportSolutionBuilderStatus?: DiagnosticReporter,
  reportErrorSummary?: ReportEmitErrorSummary
) {
  const host = createSolutionBuilderHostBase(system, createProgram, reportDiagnostic, reportSolutionBuilderStatus) as SolutionBuilderHost<T>;
  host.reportErrorSummary = reportErrorSummary;
  return host;
}
export function createSolutionBuilderWithWatchHost<T extends BuilderProgram = EmitAndSemanticDiagnosticsBuilderProgram>(
  system = sys,
  createProgram?: CreateProgram<T>,
  reportDiagnostic?: DiagnosticReporter,
  reportSolutionBuilderStatus?: DiagnosticReporter,
  reportWatchStatus?: WatchStatusReporter
) {
  const host = createSolutionBuilderHostBase(system, createProgram, reportDiagnostic, reportSolutionBuilderStatus) as SolutionBuilderWithWatchHost<T>;
  const watchHost = createWatchHost(system, reportWatchStatus);
  copyProperties(host, watchHost);
  return host;
}
function getCompilerOptsOfBuildOpts(buildOpts: BuildOpts): qt.CompilerOpts {
  const result = {} as qt.CompilerOpts;
  commonOptsWithBuild.forEach((option) => {
    if (hasProperty(buildOpts, option.name)) result[option.name] = buildOpts[option.name];
  });
  return result;
}
export function createSolutionBuilder<T extends BuilderProgram>(host: SolutionBuilderHost<T>, rootNames: readonly string[], defaultOpts: BuildOpts): SolutionBuilder<T> {
  return createSolutionBuilderWorker(false, host, rootNames, defaultOpts);
}
export function createSolutionBuilderWithWatch<T extends BuilderProgram>(
  host: SolutionBuilderWithWatchHost<T>,
  rootNames: readonly string[],
  defaultOpts: BuildOpts,
  baseWatchOpts?: qt.WatchOpts
): SolutionBuilder<T> {
  return createSolutionBuilderWorker(true, host, rootNames, defaultOpts, baseWatchOpts);
}
type ConfigFileCacheEntry = qt.ParsedCommandLine | Diagnostic;
interface SolutionBuilderStateCache {
  originalReadFile: qt.CompilerHost['readFile'];
  originalFileExists: qt.CompilerHost['fileExists'];
  originalDirectoryExists: qt.CompilerHost['directoryExists'];
  originalCreateDirectory: qt.CompilerHost['createDirectory'];
  originalWriteFile: qt.CompilerHost['writeFile'] | undefined;
  originalReadFileWithCache: qt.CompilerHost['readFile'];
  originalGetSourceFile: qt.CompilerHost['getSourceFile'];
}
interface SolutionBuilderState<T extends BuilderProgram = BuilderProgram> {
  readonly host: SolutionBuilderHost<T>;
  readonly hostWithWatch: SolutionBuilderWithWatchHost<T>;
  readonly currentDirectory: string;
  readonly getCanonicalFileName: GetCanonicalFileName;
  readonly parseConfigFileHost: ParseConfigFileHost;
  readonly writeFileName: ((s: string) => void) | undefined;
  readonly opts: BuildOpts;
  readonly baseCompilerOpts: qt.CompilerOpts;
  readonly rootNames: readonly string[];
  readonly baseWatchOpts: qt.WatchOpts | undefined;
  readonly resolvedConfigFilePaths: Map<ResolvedConfigFilePath>;
  readonly configFileCache: ConfigFileMap<ConfigFileCacheEntry>;
  readonly projectStatus: ConfigFileMap<UpToDateStatus>;
  readonly buildInfoChecked: ConfigFileMap<true>;
  readonly extendedConfigCache: Map<ExtendedConfigCacheEntry>;
  readonly builderPrograms: ConfigFileMap<T>;
  readonly diagnostics: ConfigFileMap<readonly Diagnostic[]>;
  readonly projectPendingBuild: ConfigFileMap<ConfigFileProgramReloadLevel>;
  readonly projectErrorsReported: ConfigFileMap<true>;
  readonly compilerHost: qt.CompilerHost;
  readonly moduleResolutionCache: ModuleResolutionCache | undefined;
  buildOrder: AnyBuildOrder | undefined;
  readFileWithCache: (f: string) => string | undefined;
  projectCompilerOpts: qt.CompilerOpts;
  cache: SolutionBuilderStateCache | undefined;
  allProjectBuildPending: boolean;
  needsSummary: boolean;
  watchAllProjectsPending: boolean;
  currentInvalidatedProject: InvalidatedProject<T> | undefined;
  readonly watch: boolean;
  readonly allWatchedWildcardDirectories: ConfigFileMap<Map<WildcardDirectoryWatcher>>;
  readonly allWatchedInputFiles: ConfigFileMap<Map<FileWatcher>>;
  readonly allWatchedConfigFiles: ConfigFileMap<FileWatcher>;
  timerToBuildInvalidatedProject: any;
  reportFileChangeDetected: boolean;
  watchFile: WatchFile<WatchType, qt.ResolvedConfigFileName>;
  watchFilePath: WatchFilePath<WatchType, qt.ResolvedConfigFileName>;
  watchDirectory: WatchDirectory<WatchType, qt.ResolvedConfigFileName>;
  writeLog: (s: string) => void;
}
function createSolutionBuilderState<T extends BuilderProgram>(
  watch: boolean,
  hostOrHostWithWatch: SolutionBuilderHost<T> | SolutionBuilderWithWatchHost<T>,
  rootNames: readonly string[],
  opts: BuildOpts,
  baseWatchOpts: qt.WatchOpts | undefined
): SolutionBuilderState<T> {
  const host = hostOrHostWithWatch as SolutionBuilderHost<T>;
  const hostWithWatch = hostOrHostWithWatch as SolutionBuilderWithWatchHost<T>;
  const currentDirectory = host.getCurrentDirectory();
  const getCanonicalFileName = createGetCanonicalFileName(host.useCaseSensitiveFileNames());
  const baseCompilerOpts = getCompilerOptsOfBuildOpts(opts);
  const compilerHost = createCompilerHostFromProgramHost(host, () => state.projectCompilerOpts);
  setGetSourceFileAsHashVersioned(compilerHost, host);
  compilerHost.getParsedCommandLine = (fileName) => parseConfigFile(state, fileName as qt.ResolvedConfigFileName, toResolvedConfigFilePath(state, fileName as qt.ResolvedConfigFileName));
  compilerHost.resolveModuleNames = maybeBind(host, host.resolveModuleNames);
  compilerHost.resolveTypeReferenceDirectives = maybeBind(host, host.resolveTypeReferenceDirectives);
  const moduleResolutionCache = !compilerHost.resolveModuleNames ? createModuleResolutionCache(currentDirectory, getCanonicalFileName) : undefined;
  if (!compilerHost.resolveModuleNames) {
    const loader = (moduleName: string, containingFile: string, redirectedReference: qt.ResolvedProjectReference | undefined) =>
      resolveModuleName(moduleName, containingFile, state.projectCompilerOpts, compilerHost, moduleResolutionCache, redirectedReference).resolvedModule!;
    compilerHost.resolveModuleNames = (moduleNames, containingFile, _reusedNames, redirectedReference) =>
      loadWithLocalCache<qt.ResolvedModuleFull>(qf.check.allDefined(moduleNames), containingFile, redirectedReference, loader);
  }
  const { watchFile, watchFilePath, watchDirectory, writeLog } = createWatchFactory<qt.ResolvedConfigFileName>(hostWithWatch, opts);
  const state: SolutionBuilderState<T> = {
    host,
    hostWithWatch,
    currentDirectory,
    getCanonicalFileName,
    parseConfigFileHost: parseConfigHostFromCompilerHostLike(host),
    writeFileName: host.trace ? (s: string) => host.trace!(s) : undefined,
    opts,
    baseCompilerOpts,
    rootNames,
    baseWatchOpts,
    resolvedConfigFilePaths: qu.createMap(),
    configFileCache: createConfigFileMap(),
    projectStatus: createConfigFileMap(),
    buildInfoChecked: createConfigFileMap(),
    extendedConfigCache: qu.createMap(),
    builderPrograms: createConfigFileMap(),
    diagnostics: createConfigFileMap(),
    projectPendingBuild: createConfigFileMap(),
    projectErrorsReported: createConfigFileMap(),
    compilerHost,
    moduleResolutionCache,
    buildOrder: undefined,
    readFileWithCache: (f) => host.readFile(f),
    projectCompilerOpts: baseCompilerOpts,
    cache: undefined,
    allProjectBuildPending: true,
    needsSummary: true,
    watchAllProjectsPending: watch,
    currentInvalidatedProject: undefined,
    watch,
    allWatchedWildcardDirectories: createConfigFileMap(),
    allWatchedInputFiles: createConfigFileMap(),
    allWatchedConfigFiles: createConfigFileMap(),
    timerToBuildInvalidatedProject: undefined,
    reportFileChangeDetected: false,
    watchFile,
    watchFilePath,
    watchDirectory,
    writeLog,
  };
  return state;
}
function toPath(state: SolutionBuilderState, fileName: string) {
  return qnr.toPath(fileName, state.currentDirectory, state.getCanonicalFileName);
}
function toResolvedConfigFilePath(state: SolutionBuilderState, fileName: qt.ResolvedConfigFileName): ResolvedConfigFilePath {
  const { resolvedConfigFilePaths } = state;
  const path = resolvedConfigFilePaths.get(fileName);
  if (path !== undefined) return path;
  const resolvedPath = toPath(state, fileName) as ResolvedConfigFilePath;
  resolvedConfigFilePaths.set(fileName, resolvedPath);
  return resolvedPath;
}
function isParsedCommandLine(entry: ConfigFileCacheEntry): entry is qt.ParsedCommandLine {
  return !!(entry as qt.ParsedCommandLine).opts;
}
function parseConfigFile(state: SolutionBuilderState, configFileName: qt.ResolvedConfigFileName, configFilePath: ResolvedConfigFilePath): qt.ParsedCommandLine | undefined {
  const { configFileCache } = state;
  const value = configFileCache.get(configFilePath);
  if (value) return isParsedCommandLine(value) ? value : undefined;
  let diagnostic: Diagnostic | undefined;
  const { parseConfigFileHost, baseCompilerOpts, baseWatchOpts, extendedConfigCache, host } = state;
  let parsed: qt.ParsedCommandLine | undefined;
  if (host.getParsedCommandLine) {
    parsed = host.getParsedCommandLine(configFileName);
    if (!parsed) diagnostic = createCompilerDiagnostic(qd.File_0_not_found, configFileName);
  } else {
    parseConfigFileHost.onUnRecoverableConfigFileDiagnostic = (d) => (diagnostic = d);
    parsed = getParsedCommandLineOfConfigFile(configFileName, baseCompilerOpts, parseConfigFileHost, extendedConfigCache, baseWatchOpts);
    parseConfigFileHost.onUnRecoverableConfigFileDiagnostic = noop;
  }
  configFileCache.set(configFilePath, parsed || diagnostic!);
  return parsed;
}
function resolveProjectName(state: SolutionBuilderState, name: string): qt.ResolvedConfigFileName {
  return resolveConfigFileProjectName(resolvePath(state.currentDirectory, name));
}
function createBuildOrder(state: SolutionBuilderState, roots: readonly qt.ResolvedConfigFileName[]): AnyBuildOrder {
  const temporaryMarks = qu.createMap() as ConfigFileMap<true>;
  const permanentMarks = qu.createMap() as ConfigFileMap<true>;
  const circularityReportStack: string[] = [];
  let buildOrder: qt.ResolvedConfigFileName[] | undefined;
  let circularDiagnostics: Diagnostic[] | undefined;
  for (const root of roots) {
    visit(root);
  }
  return circularDiagnostics ? { buildOrder: buildOrder || emptyArray, circularDiagnostics } : buildOrder || emptyArray;
  function visit(configFileName: qt.ResolvedConfigFileName, inCircularContext?: boolean) {
    const projPath = toResolvedConfigFilePath(state, configFileName);
    if (permanentMarks.has(projPath)) return;
    if (temporaryMarks.has(projPath)) {
      if (!inCircularContext) {
        (circularDiagnostics || (circularDiagnostics = [])).push(
          createCompilerDiagnostic(qd.Project_references_may_not_form_a_circular_graph_Cycle_detected_Colon_0, circularityReportStack.join('\r\n'))
        );
      }
      return;
    }
    temporaryMarks.set(projPath, true);
    circularityReportStack.push(configFileName);
    const parsed = parseConfigFile(state, configFileName, projPath);
    if (parsed && parsed.projectReferences) {
      for (const ref of parsed.projectReferences) {
        const resolvedRefPath = resolveProjectName(state, ref.path);
        visit(resolvedRefPath, inCircularContext || ref.circular);
      }
    }
    circularityReportStack.pop();
    permanentMarks.set(projPath, true);
    (buildOrder || (buildOrder = [])).push(configFileName);
  }
}
function getBuildOrder(state: SolutionBuilderState) {
  return state.buildOrder || createStateBuildOrder(state);
}
function createStateBuildOrder(state: SolutionBuilderState) {
  const buildOrder = createBuildOrder(
    state,
    state.rootNames.map((f) => resolveProjectName(state, f))
  );
  state.resolvedConfigFilePaths.clear();
  const currentProjects = qu.arrayToSet(getBuildOrderFromAnyBuildOrder(buildOrder), (resolved) => toResolvedConfigFilePath(state, resolved)) as ConfigFileMap<true>;
  const noopOnDelete = { onDeleteValue: noop };
  mutateMapSkippingNewValues(state.configFileCache, currentProjects, noopOnDelete);
  mutateMapSkippingNewValues(state.projectStatus, currentProjects, noopOnDelete);
  mutateMapSkippingNewValues(state.buildInfoChecked, currentProjects, noopOnDelete);
  mutateMapSkippingNewValues(state.builderPrograms, currentProjects, noopOnDelete);
  mutateMapSkippingNewValues(state.diagnostics, currentProjects, noopOnDelete);
  mutateMapSkippingNewValues(state.projectPendingBuild, currentProjects, noopOnDelete);
  mutateMapSkippingNewValues(state.projectErrorsReported, currentProjects, noopOnDelete);
  if (state.watch) {
    mutateMapSkippingNewValues(state.allWatchedConfigFiles, currentProjects, { onDeleteValue: closeFileWatcher });
    mutateMapSkippingNewValues(state.allWatchedWildcardDirectories, currentProjects, {
      onDeleteValue: (existingMap) => existingMap.forEach(closeFileWatcherOf),
    });
    mutateMapSkippingNewValues(state.allWatchedInputFiles, currentProjects, {
      onDeleteValue: (existingMap) => existingMap.forEach(closeFileWatcher),
    });
  }
  return (state.buildOrder = buildOrder);
}
function getBuildOrderFor(state: SolutionBuilderState, project: string | undefined, onlyReferences: boolean | undefined): AnyBuildOrder | undefined {
  const resolvedProject = project && resolveProjectName(state, project);
  const buildOrderFromState = getBuildOrder(state);
  if (isCircularBuildOrder(buildOrderFromState)) return buildOrderFromState;
  if (resolvedProject) {
    const projectPath = toResolvedConfigFilePath(state, resolvedProject);
    const projectIndex = qf.find.index(buildOrderFromState, (configFileName) => toResolvedConfigFilePath(state, configFileName) === projectPath);
    if (projectIndex === -1) return;
  }
  const buildOrder = resolvedProject ? (createBuildOrder(state, [resolvedProject]) as BuildOrder) : buildOrderFromState;
  qf.assert.true(!isCircularBuildOrder(buildOrder));
  qf.assert.true(!onlyReferences || resolvedProject !== undefined);
  qf.assert.true(!onlyReferences || buildOrder[buildOrder.length - 1] === resolvedProject);
  return onlyReferences ? buildOrder.slice(0, buildOrder.length - 1) : buildOrder;
}
function enableCache(state: SolutionBuilderState) {
  if (state.cache) {
    disableCache(state);
  }
  const { compilerHost, host } = state;
  const originalReadFileWithCache = state.readFileWithCache;
  const originalGetSourceFile = compilerHost.getSourceFile;
  const { originalReadFile, originalFileExists, originalDirectoryExists, originalCreateDirectory, originalWriteFile, getSourceFileWithCache, readFileWithCache } = changeCompilerHostLikeToUseCache(
    host,
    (fileName) => toPath(state, fileName),
    (...args) => originalGetSourceFile.call(compilerHost, ...args)
  );
  state.readFileWithCache = readFileWithCache;
  compilerHost.getSourceFile = getSourceFileWithCache!;
  state.cache = {
    originalReadFile,
    originalFileExists,
    originalDirectoryExists,
    originalCreateDirectory,
    originalWriteFile,
    originalReadFileWithCache,
    originalGetSourceFile,
  };
}
function disableCache(state: SolutionBuilderState) {
  if (!state.cache) return;
  const { cache, host, compilerHost, extendedConfigCache, moduleResolutionCache } = state;
  host.readFile = cache.originalReadFile;
  host.fileExists = cache.originalFileExists;
  host.directoryExists = cache.originalDirectoryExists;
  host.createDirectory = cache.originalCreateDirectory;
  host.writeFile = cache.originalWriteFile;
  compilerHost.getSourceFile = cache.originalGetSourceFile;
  state.readFileWithCache = cache.originalReadFileWithCache;
  extendedConfigCache.clear();
  if (moduleResolutionCache) {
    moduleResolutionCache.directoryToModuleNameMap.clear();
    moduleResolutionCache.moduleNameToDirectoryMap.clear();
  }
  state.cache = undefined;
}
function clearProjectStatus(state: SolutionBuilderState, resolved: ResolvedConfigFilePath) {
  state.projectStatus.delete(resolved);
  state.diagnostics.delete(resolved);
}
function addProjToQueue({ projectPendingBuild }: SolutionBuilderState, proj: ResolvedConfigFilePath, reloadLevel: ConfigFileProgramReloadLevel) {
  const value = projectPendingBuild.get(proj);
  if (value === undefined) {
    projectPendingBuild.set(proj, reloadLevel);
  } else if (value < reloadLevel) {
    projectPendingBuild.set(proj, reloadLevel);
  }
}
function setupInitialBuild(state: SolutionBuilderState, cancellationToken: qt.CancellationToken | undefined) {
  if (!state.allProjectBuildPending) return;
  state.allProjectBuildPending = false;
  if (state.opts.watch) {
    reportWatchStatus(state, qd.Starting_compilation_in_watch_mode);
  }
  enableCache(state);
  const buildOrder = getBuildOrderFromAnyBuildOrder(getBuildOrder(state));
  buildOrder.forEach((configFileName) => state.projectPendingBuild.set(toResolvedConfigFilePath(state, configFileName), ConfigFileProgramReloadLevel.None));
  if (cancellationToken) {
    cancellationToken.throwIfCancellationRequested();
  }
}
export enum InvalidatedProjectKind {
  Build,
  UpdateBundle,
  UpdateOutputFileStamps,
}
export interface InvalidatedProjectBase {
  readonly kind: InvalidatedProjectKind;
  readonly project: qt.ResolvedConfigFileName;
  readonly projectPath: ResolvedConfigFilePath;
  readonly buildOrder: readonly qt.ResolvedConfigFileName[];
  done(cancellationToken?: qt.CancellationToken, writeFile?: qt.WriteFileCallback, customTransformers?: qt.CustomTransformers): ExitStatus;
  getCompilerOpts(): qt.CompilerOpts;
  getCurrentDirectory(): string;
}
export interface UpdateOutputFileStampsProject extends InvalidatedProjectBase {
  readonly kind: InvalidatedProjectKind.UpdateOutputFileStamps;
  updateOutputFileStatmps(): void;
}
export interface BuildInvalidedProject<T extends BuilderProgram> extends InvalidatedProjectBase {
  readonly kind: InvalidatedProjectKind.Build;
  getBuilderProgram(): T | undefined;
  getProgram(): qt.Program | undefined;
  getSourceFile(fileName: string): qt.SourceFile | undefined;
  getSourceFiles(): readonly qt.SourceFile[];
  getOptsDiagnostics(cancellationToken?: qt.CancellationToken): readonly Diagnostic[];
  getGlobalDiagnostics(cancellationToken?: qt.CancellationToken): readonly Diagnostic[];
  getConfigFileParsingDiagnostics(): readonly Diagnostic[];
  getSyntacticDiagnostics(sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly Diagnostic[];
  getAllDependencies(sourceFile: qt.SourceFile): readonly string[];
  getSemanticDiagnostics(sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly Diagnostic[];
  getSemanticDiagnosticsOfNextAffectedFile(cancellationToken?: qt.CancellationToken, ignoreSourceFile?: (sourceFile: qt.SourceFile) => boolean): AffectedFileResult<readonly Diagnostic[]>;
  emit(
    targetSourceFile?: qt.SourceFile,
    writeFile?: qt.WriteFileCallback,
    cancellationToken?: qt.CancellationToken,
    emitOnlyDtsFiles?: boolean,
    customTransformers?: qt.CustomTransformers
  ): qt.EmitResult | undefined;
}
export interface UpdateBundleProject<T extends BuilderProgram> extends InvalidatedProjectBase {
  readonly kind: InvalidatedProjectKind.UpdateBundle;
  emit(writeFile?: qt.WriteFileCallback, customTransformers?: qt.CustomTransformers): qt.EmitResult | BuildInvalidedProject<T> | undefined;
}
export type InvalidatedProject<T extends BuilderProgram> = UpdateOutputFileStampsProject | BuildInvalidedProject<T> | UpdateBundleProject<T>;
function doneInvalidatedProject(state: SolutionBuilderState, projectPath: ResolvedConfigFilePath) {
  state.projectPendingBuild.delete(projectPath);
  state.currentInvalidatedProject = undefined;
  return state.diagnostics.has(projectPath) ? ExitStatus.DiagnosticsPresent_OutputsSkipped : ExitStatus.Success;
}
function createUpdateOutputFileStampsProject(
  state: SolutionBuilderState,
  project: qt.ResolvedConfigFileName,
  projectPath: ResolvedConfigFilePath,
  config: qt.ParsedCommandLine,
  buildOrder: readonly qt.ResolvedConfigFileName[]
): UpdateOutputFileStampsProject {
  let updateOutputFileStampsPending = true;
  return {
    kind: InvalidatedProjectKind.UpdateOutputFileStamps,
    project,
    projectPath,
    buildOrder,
    getCompilerOpts: () => config.opts,
    getCurrentDirectory: () => state.currentDirectory,
    updateOutputFileStatmps: () => {
      updateOutputTimestamps(state, config, projectPath);
      updateOutputFileStampsPending = false;
    },
    done: () => {
      if (updateOutputFileStampsPending) {
        updateOutputTimestamps(state, config, projectPath);
      }
      return doneInvalidatedProject(state, projectPath);
    },
  };
}
function createBuildOrUpdateInvalidedProject<T extends BuilderProgram>(
  kind: InvalidatedProjectKind.Build | InvalidatedProjectKind.UpdateBundle,
  state: SolutionBuilderState<T>,
  project: qt.ResolvedConfigFileName,
  projectPath: ResolvedConfigFilePath,
  projectIndex: number,
  config: qt.ParsedCommandLine,
  buildOrder: readonly qt.ResolvedConfigFileName[]
): BuildInvalidedProject<T> | UpdateBundleProject<T> {
  enum Step {
    CreateProgram,
    SyntaxDiagnostics,
    SemanticDiagnostics,
    Emit,
    EmitBundle,
    BuildInvalidatedProjectOfBundle,
    QueueReferencingProjects,
    Done,
  }
  let step = kind === InvalidatedProjectKind.Build ? Step.CreateProgram : Step.EmitBundle;
  let program: T | undefined;
  let buildResult: BuildResultFlags | undefined;
  let invalidatedProjectOfBundle: BuildInvalidedProject<T> | undefined;
  return kind === InvalidatedProjectKind.Build
    ? {
        kind,
        project,
        projectPath,
        buildOrder,
        getCompilerOpts: () => config.opts,
        getCurrentDirectory: () => state.currentDirectory,
        getBuilderProgram: () => withProgramOrUndefined(identity),
        getProgram: () => withProgramOrUndefined((program) => program.getProgramOrUndefined()),
        getSourceFile: (fileName) => withProgramOrUndefined((program) => program.getSourceFile(fileName)),
        getSourceFiles: () => withProgramOrEmptyArray((program) => program.getSourceFiles()),
        getOptsDiagnostics: (cancellationToken) => withProgramOrEmptyArray((program) => program.getOptsDiagnostics(cancellationToken)),
        getGlobalDiagnostics: (cancellationToken) => withProgramOrEmptyArray((program) => program.getGlobalDiagnostics(cancellationToken)),
        getConfigFileParsingDiagnostics: () => withProgramOrEmptyArray((program) => program.getConfigFileParsingDiagnostics()),
        getSyntacticDiagnostics: (sourceFile, cancellationToken) => withProgramOrEmptyArray((program) => program.getSyntacticDiagnostics(sourceFile, cancellationToken)),
        getAllDependencies: (sourceFile) => withProgramOrEmptyArray((program) => program.getAllDependencies(sourceFile)),
        getSemanticDiagnostics: (sourceFile, cancellationToken) => withProgramOrEmptyArray((program) => program.getSemanticDiagnostics(sourceFile, cancellationToken)),
        getSemanticDiagnosticsOfNextAffectedFile: (cancellationToken, ignoreSourceFile) =>
          withProgramOrUndefined(
            (program) =>
              ((program as any) as SemanticDiagnosticsBuilderProgram).getSemanticDiagnosticsOfNextAffectedFile &&
              ((program as any) as SemanticDiagnosticsBuilderProgram).getSemanticDiagnosticsOfNextAffectedFile(cancellationToken, ignoreSourceFile)
          ),
        emit: (targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers) => {
          if (targetSourceFile || emitOnlyDtsFiles) return withProgramOrUndefined((program) => program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers));
          executeSteps(Step.SemanticDiagnostics, cancellationToken);
          if (step !== Step.Emit) return;
          return emit(writeFile, cancellationToken, customTransformers);
        },
        done,
      }
    : {
        kind,
        project,
        projectPath,
        buildOrder,
        getCompilerOpts: () => config.opts,
        getCurrentDirectory: () => state.currentDirectory,
        emit: (writeFile: qt.WriteFileCallback | undefined, customTransformers: qt.CustomTransformers | undefined) => {
          if (step !== Step.EmitBundle) return invalidatedProjectOfBundle;
          return emitBundle(writeFile, customTransformers);
        },
        done,
      };
  function done(cancellationToken?: qt.CancellationToken, writeFile?: qt.WriteFileCallback, customTransformers?: qt.CustomTransformers) {
    executeSteps(Step.Done, cancellationToken, writeFile, customTransformers);
    return doneInvalidatedProject(state, projectPath);
  }
  function withProgramOrUndefined<U>(action: (program: T) => U | undefined): U | undefined {
    executeSteps(Step.CreateProgram);
    return program && action(program);
  }
  function withProgramOrEmptyArray<U>(action: (program: T) => readonly U[]): readonly U[] {
    return withProgramOrUndefined(action) || emptyArray;
  }
  function createProgram() {
    qf.assert.true(program === undefined);
    if (state.opts.dry) {
      reportStatus(state, qd.A_non_dry_build_would_build_project_0, project);
      buildResult = BuildResultFlags.Success;
      step = Step.QueueReferencingProjects;
      return;
    }
    if (state.opts.verbose) reportStatus(state, qd.Building_project_0, project);
    if (config.fileNames.length === 0) {
      reportAndStoreErrors(state, projectPath, getConfigFileParsingDiagnostics(config));
      buildResult = BuildResultFlags.None;
      step = Step.QueueReferencingProjects;
      return;
    }
    const { host, compilerHost } = state;
    state.projectCompilerOpts = config.opts;
    updateModuleResolutionCache(state, project, config);
    program = host.createProgram(config.fileNames, config.opts, compilerHost, getOldProgram(state, projectPath, config), getConfigFileParsingDiagnostics(config), config.projectReferences);
    step++;
  }
  function handleDiagnostics(diagnostics: readonly Diagnostic[], errorFlags: BuildResultFlags, errorType: string) {
    if (diagnostics.length) {
      buildResult = buildErrors(state, projectPath, program, config, diagnostics, errorFlags, errorType);
      step = Step.QueueReferencingProjects;
    } else {
      step++;
    }
  }
  function getSyntaxDiagnostics(cancellationToken?: qt.CancellationToken) {
    qf.assert.defined(program);
    handleDiagnostics(
      [
        ...program.getConfigFileParsingDiagnostics(),
        ...program.getOptsDiagnostics(cancellationToken),
        ...program.getGlobalDiagnostics(cancellationToken),
        ...program.getSyntacticDiagnostics(undefined, cancellationToken),
      ],
      BuildResultFlags.SyntaxErrors,
      'Syntactic'
    );
  }
  function getSemanticDiagnostics(cancellationToken?: qt.CancellationToken) {
    handleDiagnostics(qf.check.defined(program).getSemanticDiagnostics(undefined, cancellationToken), BuildResultFlags.TypeErrors, 'Semantic');
  }
  function emit(writeFileCallback?: qt.WriteFileCallback, cancellationToken?: qt.CancellationToken, customTransformers?: qt.CustomTransformers): qt.EmitResult {
    qf.assert.defined(program);
    qf.assert.true(step === Step.Emit);
    program.backupState();
    let declDiagnostics: Diagnostic[] | undefined;
    const reportDeclarationDiagnostics = (d: Diagnostic) => (declDiagnostics || (declDiagnostics = [])).push(d);
    const outputFiles: OutputFile[] = [];
    const { emitResult } = emitFilesAndReportErrors(
      program,
      reportDeclarationDiagnostics,
      undefined,
      undefined,
      (name, text, writeByteOrderMark) => outputFiles.push({ name, text, writeByteOrderMark }),
      cancellationToken,
      false,
      customTransformers
    );
    if (declDiagnostics) {
      program.restoreState();
      buildResult = buildErrors(state, projectPath, program, config, declDiagnostics, BuildResultFlags.DeclarationEmitErrors, 'Declaration file');
      step = Step.QueueReferencingProjects;
      return {
        emitSkipped: true,
        diagnostics: emitResult.diagnostics,
      };
    }
    const { host, compilerHost } = state;
    let resultFlags = BuildResultFlags.DeclarationOutputUnchanged;
    let newestDeclarationFileContentChangedTime = minimumDate;
    let anyDtsChanged = false;
    const emitterDiagnostics = createDiagnosticCollection();
    const emittedOutputs = qu.createMap() as FileMap<string>;
    outputFiles.forEach(({ name, text, writeByteOrderMark }) => {
      let priorChangeTime: Date | undefined;
      if (!anyDtsChanged && isDeclarationFile(name)) {
        if (host.fileExists(name) && state.readFileWithCache(name) === text) {
          priorChangeTime = host.getModifiedTime(name);
        } else {
          resultFlags &= ~BuildResultFlags.DeclarationOutputUnchanged;
          anyDtsChanged = true;
        }
      }
      emittedOutputs.set(toPath(state, name), name);
      writeFile(writeFileCallback ? { writeFile: writeFileCallback } : compilerHost, emitterDiagnostics, name, text, writeByteOrderMark);
      if (priorChangeTime !== undefined) {
        newestDeclarationFileContentChangedTime = newer(priorChangeTime, newestDeclarationFileContentChangedTime);
      }
    });
    finishEmit(
      emitterDiagnostics,
      emittedOutputs,
      newestDeclarationFileContentChangedTime,
      anyDtsChanged,
      outputFiles.length ? outputFiles[0].name : getFirstProjectOutput(config, !host.useCaseSensitiveFileNames()),
      resultFlags
    );
    return emitResult;
  }
  function finishEmit(
    emitterDiagnostics: DiagnosticCollection,
    emittedOutputs: FileMap<string>,
    priorNewestUpdateTime: Date,
    newestDeclarationFileContentChangedTimeIsMaximumDate: boolean,
    oldestOutputFileName: string,
    resultFlags: BuildResultFlags
  ) {
    const emitDiagnostics = emitterqd.getDiagnostics();
    if (emitqd.length) {
      buildResult = buildErrors(state, projectPath, program, config, emitDiagnostics, BuildResultFlags.EmitErrors, 'Emit');
      step = Step.QueueReferencingProjects;
      return emitDiagnostics;
    }
    if (state.writeFileName) {
      emittedOutputs.forEach((name) => listEmittedFile(state, config, name));
      if (program) listFiles(program, state.writeFileName);
    }
    const newestDeclarationFileContentChangedTime = updateOutputTimestampsWorker(state, config, priorNewestUpdateTime, qd.Updating_unchanged_output_timestamps_of_project_0, emittedOutputs);
    state.diagnostics.delete(projectPath);
    state.projectStatus.set(projectPath, {
      type: UpToDateStatusType.UpToDate,
      newestDeclarationFileContentChangedTime: newestDeclarationFileContentChangedTimeIsMaximumDate ? maximumDate : newestDeclarationFileContentChangedTime,
      oldestOutputFileName,
    });
    afterProgramDone(state, projectPath, program, config);
    state.projectCompilerOpts = state.baseCompilerOpts;
    step = Step.QueueReferencingProjects;
    buildResult = resultFlags;
    return emitDiagnostics;
  }
  function emitBundle(writeFileCallback?: qt.WriteFileCallback, customTransformers?: qt.CustomTransformers): qt.EmitResult | BuildInvalidedProject<T> | undefined {
    qf.assert.true(kind === InvalidatedProjectKind.UpdateBundle);
    if (state.opts.dry) {
      reportStatus(state, qd.A_non_dry_build_would_update_output_of_project_0, project);
      buildResult = BuildResultFlags.Success;
      step = Step.QueueReferencingProjects;
      return;
    }
    if (state.opts.verbose) reportStatus(state, qd.Updating_output_of_project_0, project);
    const { compilerHost } = state;
    state.projectCompilerOpts = config.opts;
    const outputFiles = emitUsingBuildInfo(
      config,
      compilerHost,
      (ref) => {
        const refName = resolveProjectName(state, ref.path);
        return parseConfigFile(state, refName, toResolvedConfigFilePath(state, refName));
      },
      customTransformers
    );
    if (qf.is.string(outputFiles)) {
      reportStatus(state, qd.Cannot_update_output_of_project_0_because_there_was_error_reading_file_1, project, relName(state, outputFiles));
      step = Step.BuildInvalidatedProjectOfBundle;
      return (invalidatedProjectOfBundle = createBuildOrUpdateInvalidedProject(InvalidatedProjectKind.Build, state, project, projectPath, projectIndex, config, buildOrder) as BuildInvalidedProject<
        T
      >);
    }
    qf.assert.true(!!outputFiles.length);
    const emitterDiagnostics = createDiagnosticCollection();
    const emittedOutputs = qu.createMap() as FileMap<string>;
    outputFiles.forEach(({ name, text, writeByteOrderMark }) => {
      emittedOutputs.set(toPath(state, name), name);
      writeFile(writeFileCallback ? { writeFile: writeFileCallback } : compilerHost, emitterDiagnostics, name, text, writeByteOrderMark);
    });
    const emitDiagnostics = finishEmit(emitterDiagnostics, emittedOutputs, minimumDate, false, outputFiles[0].name, BuildResultFlags.DeclarationOutputUnchanged);
    return { emitSkipped: false, diagnostics: emitDiagnostics };
  }
  function executeSteps(till: Step, cancellationToken?: qt.CancellationToken, writeFile?: qt.WriteFileCallback, customTransformers?: qt.CustomTransformers) {
    while (step <= till && step < Step.Done) {
      const currentStep = step;
      switch (step) {
        case Step.CreateProgram:
          createProgram();
          break;
        case Step.SyntaxDiagnostics:
          getSyntaxDiagnostics(cancellationToken);
          break;
        case Step.SemanticDiagnostics:
          getSemanticDiagnostics(cancellationToken);
          break;
        case Step.Emit:
          emit(writeFile, cancellationToken, customTransformers);
          break;
        case Step.EmitBundle:
          emitBundle(writeFile, customTransformers);
          break;
        case Step.BuildInvalidatedProjectOfBundle:
          qf.check.defined(invalidatedProjectOfBundle).done(cancellationToken);
          step = Step.Done;
          break;
        case Step.QueueReferencingProjects:
          queueReferencingProjects(state, project, projectPath, projectIndex, config, buildOrder, qf.check.defined(buildResult));
          step++;
          break;
        case Step.Done:
        default:
          assertType<Step.Done>(step);
      }
      qf.assert.true(step > currentStep);
    }
  }
}
function needsBuild({ opts }: SolutionBuilderState, status: UpToDateStatus, config: qt.ParsedCommandLine) {
  if (status.type !== UpToDateStatusType.OutOfDateWithPrepend || opts.force) return true;
  return config.fileNames.length === 0 || !!getConfigFileParsingDiagnostics(config).length || !isIncrementalCompilation(config.opts);
}
function getNextInvalidatedProject<T extends BuilderProgram>(state: SolutionBuilderState<T>, buildOrder: AnyBuildOrder, reportQueue: boolean): InvalidatedProject<T> | undefined {
  if (!state.projectPendingBuild.size) return;
  if (isCircularBuildOrder(buildOrder)) return;
  if (state.currentInvalidatedProject) return arrayIsEqualTo(state.currentInvalidatedProject.buildOrder, buildOrder) ? state.currentInvalidatedProject : undefined;
  const { opts, projectPendingBuild } = state;
  for (let projectIndex = 0; projectIndex < buildOrder.length; projectIndex++) {
    const project = buildOrder[projectIndex];
    const projectPath = toResolvedConfigFilePath(state, project);
    const reloadLevel = state.projectPendingBuild.get(projectPath);
    if (reloadLevel === undefined) continue;
    if (reportQueue) {
      reportQueue = false;
      reportBuildQueue(state, buildOrder);
    }
    const config = parseConfigFile(state, project, projectPath);
    if (!config) {
      reportParseConfigFileDiagnostic(state, projectPath);
      projectPendingBuild.delete(projectPath);
      continue;
    }
    if (reloadLevel === ConfigFileProgramReloadLevel.Full) {
      watchConfigFile(state, project, projectPath, config);
      watchWildCardDirectories(state, project, projectPath, config);
      watchInputFiles(state, project, projectPath, config);
    } else if (reloadLevel === ConfigFileProgramReloadLevel.Partial) {
      const result = getFileNamesFromConfigSpecs(config.configFileSpecs!, getDirectoryPath(project), config.opts, state.parseConfigFileHost);
      updateErrorForNoInputFiles(result, project, config.configFileSpecs!, config.errors, canJsonReportNoInutFiles(config.raw));
      config.fileNames = result.fileNames;
      watchInputFiles(state, project, projectPath, config);
    }
    const status = getUpToDateStatus(state, config, projectPath);
    verboseReportProjectStatus(state, project, status);
    if (!opts.force) {
      if (status.type === UpToDateStatusType.UpToDate) {
        reportAndStoreErrors(state, projectPath, getConfigFileParsingDiagnostics(config));
        projectPendingBuild.delete(projectPath);
        if (opts.dry) {
          reportStatus(state, qd.Project_0_is_up_to_date, project);
        }
        continue;
      }
      if (status.type === UpToDateStatusType.UpToDateWithUpstreamTypes) {
        reportAndStoreErrors(state, projectPath, getConfigFileParsingDiagnostics(config));
        return createUpdateOutputFileStampsProject(state, project, projectPath, config, buildOrder);
      }
    }
    if (status.type === UpToDateStatusType.UpstreamBlocked) {
      reportAndStoreErrors(state, projectPath, getConfigFileParsingDiagnostics(config));
      projectPendingBuild.delete(projectPath);
      if (opts.verbose) {
        reportStatus(
          state,
          status.upstreamProjectBlocked ? qd.Skipping_build_of_project_0_because_its_dependency_1_was_not_built : qd.Skipping_build_of_project_0_because_its_dependency_1_has_errors,
          project,
          status.upstreamProjectName
        );
      }
      continue;
    }
    if (status.type === UpToDateStatusType.ContainerOnly) {
      reportAndStoreErrors(state, projectPath, getConfigFileParsingDiagnostics(config));
      projectPendingBuild.delete(projectPath);
      continue;
    }
    return createBuildOrUpdateInvalidedProject(
      needsBuild(state, status, config) ? InvalidatedProjectKind.Build : InvalidatedProjectKind.UpdateBundle,
      state,
      project,
      projectPath,
      projectIndex,
      config,
      buildOrder
    );
  }
  return;
}
function listEmittedFile({ writeFileName }: SolutionBuilderState, proj: qt.ParsedCommandLine, file: string) {
  if (writeFileName && proj.opts.listEmittedFiles) {
    writeFileName(`TSFILE: ${file}`);
  }
}
function getOldProgram<T extends BuilderProgram>({ opts, builderPrograms, compilerHost }: SolutionBuilderState<T>, proj: ResolvedConfigFilePath, parsed: qt.ParsedCommandLine) {
  if (opts.force) return;
  const value = builderPrograms.get(proj);
  if (value) return value;
  return (readBuilderProgram(parsed.opts, compilerHost) as any) as T;
}
function afterProgramDone<T extends BuilderProgram>({ host, watch, builderPrograms }: SolutionBuilderState<T>, proj: ResolvedConfigFilePath, program: T | undefined, config: qt.ParsedCommandLine) {
  if (program) {
    if (host.afterProgramEmitAndDiagnostics) {
      host.afterProgramEmitAndDiagnostics(program);
    }
    if (watch) {
      program.releaseProgram();
      builderPrograms.set(proj, program);
    }
  } else if (host.afterEmitBundle) {
    host.afterEmitBundle(config);
  }
}
function buildErrors<T extends BuilderProgram>(
  state: SolutionBuilderState<T>,
  resolvedPath: ResolvedConfigFilePath,
  program: T | undefined,
  config: qt.ParsedCommandLine,
  diagnostics: readonly Diagnostic[],
  errorFlags: BuildResultFlags,
  errorType: string
) {
  reportAndStoreErrors(state, resolvedPath, diagnostics);
  if (program && state.writeFileName) listFiles(program, state.writeFileName);
  state.projectStatus.set(resolvedPath, { type: UpToDateStatusType.Unbuildable, reason: `${errorType} errors` });
  afterProgramDone(state, resolvedPath, program, config);
  state.projectCompilerOpts = state.baseCompilerOpts;
  return errorFlags;
}
function updateModuleResolutionCache(state: SolutionBuilderState, proj: qt.ResolvedConfigFileName, config: qt.ParsedCommandLine) {
  if (!state.moduleResolutionCache) return;
  const { moduleResolutionCache } = state;
  const projPath = toPath(state, proj);
  if (moduleResolutionCache.directoryToModuleNameMap.redirectsMap.size === 0) {
    qf.assert.true(moduleResolutionCache.moduleNameToDirectoryMap.redirectsMap.size === 0);
    moduleResolutionCache.directoryToModuleNameMap.redirectsMap.set(projPath, moduleResolutionCache.directoryToModuleNameMap.ownMap);
    moduleResolutionCache.moduleNameToDirectoryMap.redirectsMap.set(projPath, moduleResolutionCache.moduleNameToDirectoryMap.ownMap);
  } else {
    qf.assert.true(moduleResolutionCache.moduleNameToDirectoryMap.redirectsMap.size > 0);
    const ref: qt.ResolvedProjectReference = {
      sourceFile: config.opts.configFile!,
      commandLine: config,
    };
    moduleResolutionCache.directoryToModuleNameMap.setOwnMap(moduleResolutionCache.directoryToModuleNameMap.getOrCreateMapOfCacheRedirects(ref));
    moduleResolutionCache.moduleNameToDirectoryMap.setOwnMap(moduleResolutionCache.moduleNameToDirectoryMap.getOrCreateMapOfCacheRedirects(ref));
  }
  moduleResolutionCache.directoryToModuleNameMap.setOwnOpts(config.opts);
  moduleResolutionCache.moduleNameToDirectoryMap.setOwnOpts(config.opts);
}
function checkConfigFileUpToDateStatus(state: SolutionBuilderState, configFile: string, oldestOutputFileTime: Date, oldestOutputFileName: string): Status.OutOfDateWithSelf | undefined {
  const tsconfigTime = state.host.getModifiedTime(configFile) || missingFileModifiedTime;
  if (oldestOutputFileTime < tsconfigTime) {
    return {
      type: UpToDateStatusType.OutOfDateWithSelf,
      outOfDateOutputFileName: oldestOutputFileName,
      newerInputFileName: configFile,
    };
  }
}
function getUpToDateStatusWorker(state: SolutionBuilderState, project: qt.ParsedCommandLine, resolvedPath: ResolvedConfigFilePath): UpToDateStatus {
  let newestInputFileName: string = undefined!;
  let newestInputFileTime = minimumDate;
  const { host } = state;
  for (const inputFile of project.fileNames) {
    if (!host.fileExists(inputFile)) {
      return {
        type: UpToDateStatusType.Unbuildable,
        reason: `${inputFile} does not exist`,
      };
    }
    const inputTime = host.getModifiedTime(inputFile) || missingFileModifiedTime;
    if (inputTime > newestInputFileTime) {
      newestInputFileName = inputFile;
      newestInputFileTime = inputTime;
    }
  }
  if (!project.fileNames.length && !canJsonReportNoInutFiles(project.raw)) {
    return {
      type: UpToDateStatusType.ContainerOnly,
    };
  }
  const outputs = getAllProjectOutputs(project, !host.useCaseSensitiveFileNames());
  let oldestOutputFileName = '(none)';
  let oldestOutputFileTime = maximumDate;
  let newestOutputFileName = '(none)';
  let newestOutputFileTime = minimumDate;
  let missingOutputFileName: string | undefined;
  let newestDeclarationFileContentChangedTime = minimumDate;
  let isOutOfDateWithInputs = false;
  for (const output of outputs) {
    if (!host.fileExists(output)) {
      missingOutputFileName = output;
      break;
    }
    const outputTime = host.getModifiedTime(output) || missingFileModifiedTime;
    if (outputTime < oldestOutputFileTime) {
      oldestOutputFileTime = outputTime;
      oldestOutputFileName = output;
    }
    if (outputTime < newestInputFileTime) {
      isOutOfDateWithInputs = true;
      break;
    }
    if (outputTime > newestOutputFileTime) {
      newestOutputFileTime = outputTime;
      newestOutputFileName = output;
    }
    if (isDeclarationFile(output)) {
      const outputModifiedTime = host.getModifiedTime(output) || missingFileModifiedTime;
      newestDeclarationFileContentChangedTime = newer(newestDeclarationFileContentChangedTime, outputModifiedTime);
    }
  }
  let pseudoUpToDate = false;
  let usesPrepend = false;
  let upstreamChangedProject: string | undefined;
  if (project.projectReferences) {
    state.projectStatus.set(resolvedPath, { type: UpToDateStatusType.ComputingUpstream });
    for (const ref of project.projectReferences) {
      usesPrepend = usesPrepend || !!ref.prepend;
      const resolvedRef = resolveProjectReferencePath(ref);
      const resolvedRefPath = toResolvedConfigFilePath(state, resolvedRef);
      const refStatus = getUpToDateStatus(state, parseConfigFile(state, resolvedRef, resolvedRefPath), resolvedRefPath);
      if (refStatus.type === UpToDateStatusType.ComputingUpstream || refStatus.type === UpToDateStatusType.ContainerOnly) {
        continue;
      }
      if (refStatus.type === UpToDateStatusType.Unbuildable || refStatus.type === UpToDateStatusType.UpstreamBlocked) {
        return {
          type: UpToDateStatusType.UpstreamBlocked,
          upstreamProjectName: ref.path,
          upstreamProjectBlocked: refStatus.type === UpToDateStatusType.UpstreamBlocked,
        };
      }
      if (refStatus.type !== UpToDateStatusType.UpToDate) {
        return {
          type: UpToDateStatusType.UpstreamOutOfDate,
          upstreamProjectName: ref.path,
        };
      }
      if (!missingOutputFileName) {
        if (refStatus.newestInputFileTime && refStatus.newestInputFileTime <= oldestOutputFileTime) {
          continue;
        }
        if (refStatus.newestDeclarationFileContentChangedTime && refStatus.newestDeclarationFileContentChangedTime <= oldestOutputFileTime) {
          pseudoUpToDate = true;
          upstreamChangedProject = ref.path;
          continue;
        }
        qf.assert.true(oldestOutputFileName !== undefined, 'Should have an oldest output filename here');
        return {
          type: UpToDateStatusType.OutOfDateWithUpstream,
          outOfDateOutputFileName: oldestOutputFileName,
          newerProjectName: ref.path,
        };
      }
    }
  }
  if (missingOutputFileName !== undefined) {
    return {
      type: UpToDateStatusType.OutputMissing,
      missingOutputFileName,
    };
  }
  if (isOutOfDateWithInputs) {
    return {
      type: UpToDateStatusType.OutOfDateWithSelf,
      outOfDateOutputFileName: oldestOutputFileName,
      newerInputFileName: newestInputFileName,
    };
  } else {
    const configStatus = checkConfigFileUpToDateStatus(state, project.opts.configFilePath!, oldestOutputFileTime, oldestOutputFileName);
    if (configStatus) return configStatus;
    const extendedConfigStatus = forEach(project.opts.configFile!.extendedSourceFiles || emptyArray, (configFile) =>
      checkConfigFileUpToDateStatus(state, configFile, oldestOutputFileTime, oldestOutputFileName)
    );
    if (extendedConfigStatus) return extendedConfigStatus;
  }
  if (!state.buildInfoChecked.has(resolvedPath)) {
    state.buildInfoChecked.set(resolvedPath, true);
    const buildInfoPath = getTsBuildInfoEmitOutputFilePath(project.opts);
    if (buildInfoPath) {
      const value = state.readFileWithCache(buildInfoPath);
      const buildInfo = value && getBuildInfo(value);
      if (buildInfo && (buildInfo.bundle || buildInfo.program) && buildInfo.version !== version) {
        return {
          type: UpToDateStatusType.TsVersionOutputOfDate,
          version: buildInfo.version,
        };
      }
    }
  }
  if (usesPrepend && pseudoUpToDate) {
    return {
      type: UpToDateStatusType.OutOfDateWithPrepend,
      outOfDateOutputFileName: oldestOutputFileName,
      newerProjectName: upstreamChangedProject!,
    };
  }
  return {
    type: pseudoUpToDate ? UpToDateStatusType.UpToDateWithUpstreamTypes : UpToDateStatusType.UpToDate,
    newestDeclarationFileContentChangedTime,
    newestInputFileTime,
    newestOutputFileTime,
    newestInputFileName,
    newestOutputFileName,
    oldestOutputFileName,
  };
}
function getUpToDateStatus(state: SolutionBuilderState, project: qt.ParsedCommandLine | undefined, resolvedPath: ResolvedConfigFilePath): UpToDateStatus {
  if (project === undefined) return { type: UpToDateStatusType.Unbuildable, reason: 'File deleted mid-build' };
  const prior = state.projectStatus.get(resolvedPath);
  if (prior !== undefined) return prior;
  const actual = getUpToDateStatusWorker(state, project, resolvedPath);
  state.projectStatus.set(resolvedPath, actual);
  return actual;
}
function updateOutputTimestampsWorker(state: SolutionBuilderState, proj: qt.ParsedCommandLine, priorNewestUpdateTime: Date, verboseMessage: qd.Message, skipOutputs?: FileMap<string>) {
  const { host } = state;
  const outputs = getAllProjectOutputs(proj, !host.useCaseSensitiveFileNames());
  if (!skipOutputs || outputs.length !== skipOutputs.size) {
    let reportVerbose = !!state.opts.verbose;
    const now = host.now ? host.now() : new Date();
    for (const file of outputs) {
      if (skipOutputs && skipOutputs.has(toPath(state, file))) {
        continue;
      }
      if (reportVerbose) {
        reportVerbose = false;
        reportStatus(state, verboseMessage, proj.opts.configFilePath!);
      }
      if (isDeclarationFile(file)) {
        priorNewestUpdateTime = newer(priorNewestUpdateTime, host.getModifiedTime(file) || missingFileModifiedTime);
      }
      host.setModifiedTime(file, now);
    }
  }
  return priorNewestUpdateTime;
}
function updateOutputTimestamps(state: SolutionBuilderState, proj: qt.ParsedCommandLine, resolvedPath: ResolvedConfigFilePath) {
  if (state.opts.dry) return reportStatus(state, qd.A_non_dry_build_would_update_timestamps_for_output_of_project_0, proj.opts.configFilePath!);
  const priorNewestUpdateTime = updateOutputTimestampsWorker(state, proj, minimumDate, qd.Updating_output_timestamps_of_project_0);
  state.projectStatus.set(resolvedPath, {
    type: UpToDateStatusType.UpToDate,
    newestDeclarationFileContentChangedTime: priorNewestUpdateTime,
    oldestOutputFileName: getFirstProjectOutput(proj, !state.host.useCaseSensitiveFileNames()),
  });
}
function queueReferencingProjects(
  state: SolutionBuilderState,
  project: qt.ResolvedConfigFileName,
  projectPath: ResolvedConfigFilePath,
  projectIndex: number,
  config: qt.ParsedCommandLine,
  buildOrder: readonly qt.ResolvedConfigFileName[],
  buildResult: BuildResultFlags
) {
  if (buildResult & BuildResultFlags.AnyErrors) return;
  if (!config.opts.composite) return;
  for (let index = projectIndex + 1; index < buildOrder.length; index++) {
    const nextProject = buildOrder[index];
    const nextProjectPath = toResolvedConfigFilePath(state, nextProject);
    if (state.projectPendingBuild.has(nextProjectPath)) continue;
    const nextProjectConfig = parseConfigFile(state, nextProject, nextProjectPath);
    if (!nextProjectConfig || !nextProjectConfig.projectReferences) continue;
    for (const ref of nextProjectConfig.projectReferences) {
      const resolvedRefPath = resolveProjectName(state, ref.path);
      if (toResolvedConfigFilePath(state, resolvedRefPath) !== projectPath) continue;
      const status = state.projectStatus.get(nextProjectPath);
      if (status) {
        switch (status.type) {
          case UpToDateStatusType.UpToDate:
            if (buildResult & BuildResultFlags.DeclarationOutputUnchanged) {
              if (ref.prepend) {
                state.projectStatus.set(nextProjectPath, {
                  type: UpToDateStatusType.OutOfDateWithPrepend,
                  outOfDateOutputFileName: status.oldestOutputFileName,
                  newerProjectName: project,
                });
              } else {
                status.type = UpToDateStatusType.UpToDateWithUpstreamTypes;
              }
              break;
            }
          case UpToDateStatusType.UpToDateWithUpstreamTypes:
          case UpToDateStatusType.OutOfDateWithPrepend:
            if (!(buildResult & BuildResultFlags.DeclarationOutputUnchanged)) {
              state.projectStatus.set(nextProjectPath, {
                type: UpToDateStatusType.OutOfDateWithUpstream,
                outOfDateOutputFileName: status.type === UpToDateStatusType.OutOfDateWithPrepend ? status.outOfDateOutputFileName : status.oldestOutputFileName,
                newerProjectName: project,
              });
            }
            break;
          case UpToDateStatusType.UpstreamBlocked:
            if (toResolvedConfigFilePath(state, resolveProjectName(state, status.upstreamProjectName)) === projectPath) {
              clearProjectStatus(state, nextProjectPath);
            }
            break;
        }
      }
      addProjToQueue(state, nextProjectPath, ConfigFileProgramReloadLevel.None);
      break;
    }
  }
}
function build(state: SolutionBuilderState, project?: string, cancellationToken?: qt.CancellationToken, onlyReferences?: boolean): ExitStatus {
  const buildOrder = getBuildOrderFor(state, project, onlyReferences);
  if (!buildOrder) return ExitStatus.InvalidProject_OutputsSkipped;
  setupInitialBuild(state, cancellationToken);
  let reportQueue = true;
  let successfulProjects = 0;
  while (true) {
    const invalidatedProject = getNextInvalidatedProject(state, buildOrder, reportQueue);
    if (!invalidatedProject) break;
    reportQueue = false;
    invalidatedProject.done(cancellationToken);
    if (!state.diagnostics.has(invalidatedProject.projectPath)) successfulProjects++;
  }
  disableCache(state);
  reportErrorSummary(state, buildOrder);
  startWatching(state, buildOrder);
  return isCircularBuildOrder(buildOrder)
    ? ExitStatus.ProjectReferenceCycle_OutputsSkipped
    : !buildOrder.some((p) => state.diagnostics.has(toResolvedConfigFilePath(state, p)))
    ? ExitStatus.Success
    : successfulProjects
    ? ExitStatus.DiagnosticsPresent_OutputsGenerated
    : ExitStatus.DiagnosticsPresent_OutputsSkipped;
}
function clean(state: SolutionBuilderState, project?: string, onlyReferences?: boolean) {
  const buildOrder = getBuildOrderFor(state, project, onlyReferences);
  if (!buildOrder) return ExitStatus.InvalidProject_OutputsSkipped;
  if (isCircularBuildOrder(buildOrder)) {
    reportErrors(state, buildOrder.circularDiagnostics);
    return ExitStatus.ProjectReferenceCycle_OutputsSkipped;
  }
  const { opts, host } = state;
  const filesToDelete = opts.dry ? ([] as string[]) : undefined;
  for (const proj of buildOrder) {
    const resolvedPath = toResolvedConfigFilePath(state, proj);
    const parsed = parseConfigFile(state, proj, resolvedPath);
    if (parsed === undefined) {
      reportParseConfigFileDiagnostic(state, resolvedPath);
      continue;
    }
    const outputs = getAllProjectOutputs(parsed, !host.useCaseSensitiveFileNames());
    for (const output of outputs) {
      if (host.fileExists(output)) {
        if (filesToDelete) {
          filesToDelete.push(output);
        } else {
          host.deleteFile(output);
          invalidateProject(state, resolvedPath, ConfigFileProgramReloadLevel.None);
        }
      }
    }
  }
  if (filesToDelete) {
    reportStatus(state, qd.A_non_dry_build_would_delete_the_following_files_Colon_0, filesToDelete.map((f) => `\r\n * ${f}`).join(''));
  }
  return ExitStatus.Success;
}
function invalidateProject(state: SolutionBuilderState, resolved: ResolvedConfigFilePath, reloadLevel: ConfigFileProgramReloadLevel) {
  if (state.host.getParsedCommandLine && reloadLevel === ConfigFileProgramReloadLevel.Partial) {
    reloadLevel = ConfigFileProgramReloadLevel.Full;
  }
  if (reloadLevel === ConfigFileProgramReloadLevel.Full) {
    state.configFileCache.delete(resolved);
    state.buildOrder = undefined;
  }
  state.needsSummary = true;
  clearProjectStatus(state, resolved);
  addProjToQueue(state, resolved, reloadLevel);
  enableCache(state);
}
function invalidateProjectAndScheduleBuilds(state: SolutionBuilderState, resolvedPath: ResolvedConfigFilePath, reloadLevel: ConfigFileProgramReloadLevel) {
  state.reportFileChangeDetected = true;
  invalidateProject(state, resolvedPath, reloadLevel);
  scheduleBuildInvalidatedProject(state);
}
function scheduleBuildInvalidatedProject(state: SolutionBuilderState) {
  const { hostWithWatch } = state;
  if (!hostWithWatch.setTimeout || !hostWithWatch.clearTimeout) {
    return;
  }
  if (state.timerToBuildInvalidatedProject) {
    hostWithWatch.clearTimeout(state.timerToBuildInvalidatedProject);
  }
  state.timerToBuildInvalidatedProject = hostWithWatch.setTimeout(buildNextInvalidatedProject, 250, state);
}
function buildNextInvalidatedProject(state: SolutionBuilderState) {
  state.timerToBuildInvalidatedProject = undefined;
  if (state.reportFileChangeDetected) {
    state.reportFileChangeDetected = false;
    state.projectErrorsReported.clear();
    reportWatchStatus(state, qd.File_change_detected_Starting_incremental_compilation);
  }
  const buildOrder = getBuildOrder(state);
  const invalidatedProject = getNextInvalidatedProject(state, buildOrder, false);
  if (invalidatedProject) {
    invalidatedProject.done();
    if (state.projectPendingBuild.size) {
      if (state.watch && !state.timerToBuildInvalidatedProject) {
        scheduleBuildInvalidatedProject(state);
      }
      return;
    }
  }
  disableCache(state);
  reportErrorSummary(state, buildOrder);
}
function watchConfigFile(state: SolutionBuilderState, resolved: qt.ResolvedConfigFileName, resolvedPath: ResolvedConfigFilePath, parsed: qt.ParsedCommandLine | undefined) {
  if (!state.watch || state.allWatchedConfigFiles.has(resolvedPath)) return;
  state.allWatchedConfigFiles.set(
    resolvedPath,
    state.watchFile(
      state.hostWithWatch,
      resolved,
      () => {
        invalidateProjectAndScheduleBuilds(state, resolvedPath, ConfigFileProgramReloadLevel.Full);
      },
      PollingInterval.High,
      parsed?.watchOpts,
      WatchType.ConfigFile,
      resolved
    )
  );
}
function isSameFile(state: SolutionBuilderState, file1: string, file2: string) {
  return comparePaths(file1, file2, state.currentDirectory, !state.host.useCaseSensitiveFileNames()) === Comparison.EqualTo;
}
function isOutputFile(state: SolutionBuilderState, fileName: string, configFile: qt.ParsedCommandLine) {
  if (configFile.opts.noEmit) return false;
  if (!fileExtensionIs(fileName, qt.Extension.Dts) && (fileExtensionIs(fileName, qt.Extension.Ts) || fileExtensionIs(fileName, qt.Extension.Tsx))) return false;
  const out = configFile.opts.outFile || configFile.opts.out;
  if (out && (isSameFile(state, fileName, out) || isSameFile(state, fileName, removeFileExtension(out) + qt.Extension.Dts))) return true;
  if (configFile.opts.declarationDir && containsPath(configFile.opts.declarationDir, fileName, state.currentDirectory, !state.host.useCaseSensitiveFileNames())) return true;
  if (configFile.opts.outDir && containsPath(configFile.opts.outDir, fileName, state.currentDirectory, !state.host.useCaseSensitiveFileNames())) return true;
  return !forEach(configFile.fileNames, (inputFile) => isSameFile(state, fileName, inputFile));
}
function watchWildCardDirectories(state: SolutionBuilderState, resolved: qt.ResolvedConfigFileName, resolvedPath: ResolvedConfigFilePath, parsed: qt.ParsedCommandLine) {
  if (!state.watch) return;
  updateWatchingWildcardDirectories(getOrCreateValueMapFromConfigFileMap(state.allWatchedWildcardDirectories, resolvedPath), qu.createMap(parsed.configFileSpecs!.wildcardDirectories), (dir, flags) =>
    state.watchDirectory(
      state.hostWithWatch,
      dir,
      (fileOrDirectory) => {
        const fileOrDirectoryPath = toPath(state, fileOrDirectory);
        if (fileOrDirectoryPath !== toPath(state, dir) && hasExtension(fileOrDirectoryPath) && !isSupportedSourceFileName(fileOrDirectory, parsed.opts)) {
          state.writeLog(`Project: ${resolved} Detected file add/remove of non supported extension: ${fileOrDirectory}`);
          return;
        }
        if (isOutputFile(state, fileOrDirectory, parsed)) {
          state.writeLog(`${fileOrDirectory} is output file`);
          return;
        }
        invalidateProjectAndScheduleBuilds(state, resolvedPath, ConfigFileProgramReloadLevel.Partial);
      },
      flags,
      parsed?.watchOpts,
      WatchType.WildcardDirectory,
      resolved
    )
  );
}
function watchInputFiles(state: SolutionBuilderState, resolved: qt.ResolvedConfigFileName, resolvedPath: ResolvedConfigFilePath, parsed: qt.ParsedCommandLine) {
  if (!state.watch) return;
  mutateMap(
    getOrCreateValueMapFromConfigFileMap(state.allWatchedInputFiles, resolvedPath),
    arrayToMap(parsed.fileNames, (fileName) => toPath(state, fileName)),
    {
      createNewValue: (path, input) =>
        state.watchFilePath(
          state.hostWithWatch,
          input,
          () => invalidateProjectAndScheduleBuilds(state, resolvedPath, ConfigFileProgramReloadLevel.None),
          PollingInterval.Low,
          parsed?.watchOpts,
          path as qt.Path,
          WatchType.SourceFile,
          resolved
        ),
      onDeleteValue: closeFileWatcher,
    }
  );
}
function startWatching(state: SolutionBuilderState, buildOrder: AnyBuildOrder) {
  if (!state.watchAllProjectsPending) return;
  state.watchAllProjectsPending = false;
  for (const resolved of getBuildOrderFromAnyBuildOrder(buildOrder)) {
    const resolvedPath = toResolvedConfigFilePath(state, resolved);
    const cfg = parseConfigFile(state, resolved, resolvedPath);
    watchConfigFile(state, resolved, resolvedPath, cfg);
    if (cfg) {
      watchWildCardDirectories(state, resolved, resolvedPath, cfg);
      watchInputFiles(state, resolved, resolvedPath, cfg);
    }
  }
}
function stopWatching(state: SolutionBuilderState) {
  clearMap(state.allWatchedConfigFiles, closeFileWatcher);
  clearMap(state.allWatchedWildcardDirectories, (watchedWildcardDirectories) => clearMap(watchedWildcardDirectories, closeFileWatcherOf));
  clearMap(state.allWatchedInputFiles, (watchedWildcardDirectories) => clearMap(watchedWildcardDirectories, closeFileWatcher));
}
function createSolutionBuilderWorker<T extends BuilderProgram>(watch: false, host: SolutionBuilderHost<T>, rootNames: readonly string[], defaultOpts: BuildOpts): SolutionBuilder<T>;
function createSolutionBuilderWorker<T extends BuilderProgram>(
  watch: true,
  host: SolutionBuilderWithWatchHost<T>,
  rootNames: readonly string[],
  defaultOpts: BuildOpts,
  baseWatchOpts?: qt.WatchOpts
): SolutionBuilder<T>;
function createSolutionBuilderWorker<T extends BuilderProgram>(
  watch: boolean,
  hostOrHostWithWatch: SolutionBuilderHost<T> | SolutionBuilderWithWatchHost<T>,
  rootNames: readonly string[],
  opts: BuildOpts,
  baseWatchOpts?: qt.WatchOpts
): SolutionBuilder<T> {
  const state = createSolutionBuilderState(watch, hostOrHostWithWatch, rootNames, opts, baseWatchOpts);
  return {
    build: (project, cancellationToken) => build(state, project, cancellationToken),
    clean: (project) => clean(state, project),
    buildReferences: (project, cancellationToken) => build(state, project, cancellationToken, true),
    cleanReferences: (project) => clean(state, project, true),
    getNextInvalidatedProject: (cancellationToken) => {
      setupInitialBuild(state, cancellationToken);
      return getNextInvalidatedProject(state, getBuildOrder(state), false);
    },
    getBuildOrder: () => getBuildOrder(state),
    getUpToDateStatusOfProject: (project) => {
      const configFileName = resolveProjectName(state, project);
      const configFilePath = toResolvedConfigFilePath(state, configFileName);
      return getUpToDateStatus(state, parseConfigFile(state, configFileName, configFilePath), configFilePath);
    },
    invalidateProject: (configFilePath, reloadLevel) => invalidateProject(state, configFilePath, reloadLevel || ConfigFileProgramReloadLevel.None),
    buildNextInvalidatedProject: () => buildNextInvalidatedProject(state),
    getAllParsedConfigs: () => arrayFrom(mapDefinedIterator(state.configFileCache.values(), (config) => (isParsedCommandLine(config) ? config : undefined))),
    close: () => stopWatching(state),
  };
}
function relName(state: SolutionBuilderState, path: string): string {
  return convertToRelativePath(path, state.currentDirectory, (f) => state.getCanonicalFileName(f));
}
function reportStatus(state: SolutionBuilderState, message: qd.Message, ...args: string[]) {
  state.host.reportSolutionBuilderStatus(createCompilerDiagnostic(message, ...args));
}
function reportWatchStatus(state: SolutionBuilderState, message: qd.Message, ...args: (string | number | undefined)[]) {
  if (state.hostWithWatch.onWatchStatusChange) {
    state.hostWithWatch.onWatchStatusChange(createCompilerDiagnostic(message, ...args), state.host.getNewLine(), state.baseCompilerOpts);
  }
}
function reportErrors({ host }: SolutionBuilderState, errors: readonly Diagnostic[]) {
  errors.forEach((err) => host.reportDiagnostic(err));
}
function reportAndStoreErrors(state: SolutionBuilderState, proj: ResolvedConfigFilePath, errors: readonly Diagnostic[]) {
  reportErrors(state, errors);
  state.projectErrorsReported.set(proj, true);
  if (errors.length) {
    state.diagnostics.set(proj, errors);
  }
}
function reportParseConfigFileDiagnostic(state: SolutionBuilderState, proj: ResolvedConfigFilePath) {
  reportAndStoreErrors(state, proj, [state.configFileCache.get(proj) as Diagnostic]);
}
function reportErrorSummary(state: SolutionBuilderState, buildOrder: AnyBuildOrder) {
  if (!state.needsSummary) return;
  state.needsSummary = false;
  const canReportSummary = state.watch || !!state.host.reportErrorSummary;
  const { diagnostics } = state;
  let totalErrors = 0;
  if (isCircularBuildOrder(buildOrder)) {
    reportBuildQueue(state, buildOrder.buildOrder);
    reportErrors(state, buildOrder.circularDiagnostics);
    if (canReportSummary) totalErrors += getErrorCountForSummary(buildOrder.circularDiagnostics);
  } else {
    buildOrder.forEach((project) => {
      const projectPath = toResolvedConfigFilePath(state, project);
      if (!state.projectErrorsReported.has(projectPath)) {
        reportErrors(state, diagnostics.get(projectPath) || emptyArray);
      }
    });
    if (canReportSummary) diagnostics.forEach((singleProjectErrors) => (totalErrors += getErrorCountForSummary(singleProjectErrors)));
  }
  if (state.watch) {
    reportWatchStatus(state, getWatchErrorSummaryqd.Message(totalErrors), totalErrors);
  } else if (state.host.reportErrorSummary) {
    state.host.reportErrorSummary(totalErrors);
  }
}
function reportBuildQueue(state: SolutionBuilderState, buildQueue: readonly qt.ResolvedConfigFileName[]) {
  if (state.opts.verbose) {
    reportStatus(state, qd.Projects_in_this_build_Colon_0, buildQueue.map((s) => '\r\n    * ' + relName(state, s)).join(''));
  }
}
function reportUpToDateStatus(state: SolutionBuilderState, configFileName: string, status: UpToDateStatus) {
  switch (status.type) {
    case UpToDateStatusType.OutOfDateWithSelf:
      return reportStatus(
        state,
        qd.Project_0_is_out_of_date_because_oldest_output_1_is_older_than_newest_input_2,
        relName(state, configFileName),
        relName(state, status.outOfDateOutputFileName),
        relName(state, status.newerInputFileName)
      );
    case UpToDateStatusType.OutOfDateWithUpstream:
      return reportStatus(
        state,
        qd.Project_0_is_out_of_date_because_oldest_output_1_is_older_than_newest_input_2,
        relName(state, configFileName),
        relName(state, status.outOfDateOutputFileName),
        relName(state, status.newerProjectName)
      );
    case UpToDateStatusType.OutputMissing:
      return reportStatus(state, qd.Project_0_is_out_of_date_because_output_file_1_does_not_exist, relName(state, configFileName), relName(state, status.missingOutputFileName));
    case UpToDateStatusType.UpToDate:
      if (status.newestInputFileTime !== undefined) {
        return reportStatus(
          state,
          qd.Project_0_is_up_to_date_because_newest_input_1_is_older_than_oldest_output_2,
          relName(state, configFileName),
          relName(state, status.newestInputFileName || ''),
          relName(state, status.oldestOutputFileName || '')
        );
      }
      break;
    case UpToDateStatusType.OutOfDateWithPrepend:
      return reportStatus(state, qd.Project_0_is_out_of_date_because_output_of_its_dependency_1_has_changed, relName(state, configFileName), relName(state, status.newerProjectName));
    case UpToDateStatusType.UpToDateWithUpstreamTypes:
      return reportStatus(state, qd.Project_0_is_up_to_date_with_d_ts_files_from_its_dependencies, relName(state, configFileName));
    case UpToDateStatusType.UpstreamOutOfDate:
      return reportStatus(state, qd.Project_0_is_out_of_date_because_its_dependency_1_is_out_of_date, relName(state, configFileName), relName(state, status.upstreamProjectName));
    case UpToDateStatusType.UpstreamBlocked:
      return reportStatus(
        state,
        status.upstreamProjectBlocked ? qd.Project_0_can_t_be_built_because_its_dependency_1_was_not_built : qd.Project_0_can_t_be_built_because_its_dependency_1_has_errors,
        relName(state, configFileName),
        relName(state, status.upstreamProjectName)
      );
    case UpToDateStatusType.Unbuildable:
      return reportStatus(state, qd.Failed_to_parse_file_0_Colon_1, relName(state, configFileName), status.reason);
    case UpToDateStatusType.TsVersionOutputOfDate:
      return reportStatus(
        state,
        qd.Project_0_is_out_of_date_because_output_for_it_was_generated_with_version_1_that_differs_with_current_version_2,
        relName(state, configFileName),
        status.version,
        version
      );
    case UpToDateStatusType.ContainerOnly:
    case UpToDateStatusType.ComputingUpstream:
      break;
    default:
      assertType<never>(status);
  }
}
function verboseReportProjectStatus(state: SolutionBuilderState, configFileName: string, status: UpToDateStatus) {
  if (state.opts.verbose) {
    reportUpToDateStatus(state, configFileName, status);
  }
}
export enum UpToDateStatusType {
  Unbuildable,
  UpToDate,
  UpToDateWithUpstreamTypes,
  OutOfDateWithPrepend,
  OutputMissing,
  OutOfDateWithSelf,
  OutOfDateWithUpstream,
  UpstreamOutOfDate,
  UpstreamBlocked,
  ComputingUpstream,
  TsVersionOutputOfDate,
  ContainerOnly,
}
export type UpToDateStatus =
  | Status.Unbuildable
  | Status.UpToDate
  | Status.OutOfDateWithPrepend
  | Status.OutputMissing
  | Status.OutOfDateWithSelf
  | Status.OutOfDateWithUpstream
  | Status.UpstreamOutOfDate
  | Status.UpstreamBlocked
  | Status.ComputingUpstream
  | Status.TsVersionOutOfDate
  | Status.ContainerOnly;
export namespace Status {
  export interface Unbuildable {
    type: UpToDateStatusType.Unbuildable;
    reason: string;
  }
  export interface ContainerOnly {
    type: UpToDateStatusType.ContainerOnly;
  }
  export interface UpToDate {
    type: UpToDateStatusType.UpToDate | UpToDateStatusType.UpToDateWithUpstreamTypes;
    newestInputFileTime?: Date;
    newestInputFileName?: string;
    newestDeclarationFileContentChangedTime?: Date;
    newestOutputFileTime?: Date;
    newestOutputFileName?: string;
    oldestOutputFileName: string;
  }
  export interface OutOfDateWithPrepend {
    type: UpToDateStatusType.OutOfDateWithPrepend;
    outOfDateOutputFileName: string;
    newerProjectName: string;
  }
  export interface OutputMissing {
    type: UpToDateStatusType.OutputMissing;
    missingOutputFileName: string;
  }
  export interface OutOfDateWithSelf {
    type: UpToDateStatusType.OutOfDateWithSelf;
    outOfDateOutputFileName: string;
    newerInputFileName: string;
  }
  export interface UpstreamOutOfDate {
    type: UpToDateStatusType.UpstreamOutOfDate;
    upstreamProjectName: string;
  }
  export interface UpstreamBlocked {
    type: UpToDateStatusType.UpstreamBlocked;
    upstreamProjectName: string;
    upstreamProjectBlocked: boolean;
  }
  export interface ComputingUpstream {
    type: UpToDateStatusType.ComputingUpstream;
  }
  export interface TsVersionOutOfDate {
    type: UpToDateStatusType.TsVersionOutputOfDate;
    version: string;
  }
  export interface OutOfDateWithUpstream {
    type: UpToDateStatusType.OutOfDateWithUpstream;
    outOfDateOutputFileName: string;
    newerProjectName: string;
  }
}
export function resolveConfigFileProjectName(project: string): qt.ResolvedConfigFileName {
  if (fileExtensionIs(project, qt.Extension.Json)) return project as qt.ResolvedConfigFileName;
  return combinePaths(project, 'tsconfig.json') as qt.ResolvedConfigFileName;
}
