import * as qc from './core';
import * as qd from './diagnostic';
import { Node } from './type';
import * as qt from './type';
import * as qu from './util';
import { Syntax } from './syntax';
import * as qy from './syntax';
export type AffectedFileResult<T> = { result: T; affected: SourceFile | Program } | undefined;
export interface BuilderProgramHost {
  useCaseSensitiveFileNames(): boolean;
  createHash?: (data: string) => string;
  writeFile?: WriteFileCallback;
}
export interface BuilderProgram {
  getState(): ReusableBuilderProgramState;
  backupState(): void;
  restoreState(): void;
  getProgram(): Program;
  getProgramOrUndefined(): Program | undefined;
  releaseProgram(): void;
  getCompilerOptions(): CompilerOptions;
  getSourceFile(fileName: string): SourceFile | undefined;
  getSourceFiles(): readonly SourceFile[];
  getOptionsDiagnostics(cancellationToken?: CancellationToken): readonly Diagnostic[];
  getGlobalDiagnostics(cancellationToken?: CancellationToken): readonly Diagnostic[];
  getConfigFileParsingDiagnostics(): readonly Diagnostic[];
  getSyntacticDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[];
  getDeclarationDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly DiagnosticWithLocation[];
  getAllDependencies(sourceFile: SourceFile): readonly string[];
  getSemanticDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[];
  emit(targetSourceFile?: SourceFile, writeFile?: WriteFileCallback, cancellationToken?: CancellationToken, emitOnlyDtsFiles?: boolean, customTransformers?: CustomTransformers): EmitResult;
  getCurrentDirectory(): string;
  close(): void;
}
export interface SemanticDiagnosticsBuilderProgram extends BuilderProgram {
  getSemanticDiagnosticsOfNextAffectedFile(cancellationToken?: CancellationToken, ignoreSourceFile?: (sourceFile: SourceFile) => boolean): AffectedFileResult<readonly Diagnostic[]>;
}
export interface EmitAndSemanticDiagnosticsBuilderProgram extends SemanticDiagnosticsBuilderProgram {
  emitNextAffectedFile(writeFile?: WriteFileCallback, cancellationToken?: CancellationToken, emitOnlyDtsFiles?: boolean, customTransformers?: CustomTransformers): AffectedFileResult<EmitResult>;
}
export function createSemanticDiagnosticsBuilderProgram(
  newProgram: Program,
  host: BuilderProgramHost,
  oldProgram?: SemanticDiagnosticsBuilderProgram,
  configFileParsingDiagnostics?: readonly Diagnostic[]
): SemanticDiagnosticsBuilderProgram;
export function createSemanticDiagnosticsBuilderProgram(
  rootNames: readonly string[] | undefined,
  options: CompilerOptions | undefined,
  host?: CompilerHost,
  oldProgram?: SemanticDiagnosticsBuilderProgram,
  configFileParsingDiagnostics?: readonly Diagnostic[],
  projectReferences?: readonly ProjectReference[]
): SemanticDiagnosticsBuilderProgram;
export function createSemanticDiagnosticsBuilderProgram(
  newProgramOrRootNames: Program | readonly string[] | undefined,
  hostOrOptions: BuilderProgramHost | CompilerOptions | undefined,
  oldProgramOrHost?: CompilerHost | SemanticDiagnosticsBuilderProgram,
  configFileParsingDiagnosticsOrOldProgram?: readonly Diagnostic[] | SemanticDiagnosticsBuilderProgram,
  configFileParsingDiagnostics?: readonly Diagnostic[],
  projectReferences?: readonly ProjectReference[]
) {
  return createBuilderProgram(
    BuilderProgramKind.SemanticDiagnosticsBuilderProgram,
    getBuilderCreationParameters(newProgramOrRootNames, hostOrOptions, oldProgramOrHost, configFileParsingDiagnosticsOrOldProgram, configFileParsingDiagnostics, projectReferences)
  );
}
export function createEmitAndSemanticDiagnosticsBuilderProgram(
  newProgram: Program,
  host: BuilderProgramHost,
  oldProgram?: EmitAndSemanticDiagnosticsBuilderProgram,
  configFileParsingDiagnostics?: readonly Diagnostic[]
): EmitAndSemanticDiagnosticsBuilderProgram;
export function createEmitAndSemanticDiagnosticsBuilderProgram(
  rootNames: readonly string[] | undefined,
  options: CompilerOptions | undefined,
  host?: CompilerHost,
  oldProgram?: EmitAndSemanticDiagnosticsBuilderProgram,
  configFileParsingDiagnostics?: readonly Diagnostic[],
  projectReferences?: readonly ProjectReference[]
): EmitAndSemanticDiagnosticsBuilderProgram;
export function createEmitAndSemanticDiagnosticsBuilderProgram(
  newProgramOrRootNames: Program | readonly string[] | undefined,
  hostOrOptions: BuilderProgramHost | CompilerOptions | undefined,
  oldProgramOrHost?: CompilerHost | EmitAndSemanticDiagnosticsBuilderProgram,
  configFileParsingDiagnosticsOrOldProgram?: readonly Diagnostic[] | EmitAndSemanticDiagnosticsBuilderProgram,
  configFileParsingDiagnostics?: readonly Diagnostic[],
  projectReferences?: readonly ProjectReference[]
) {
  return createBuilderProgram(
    BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram,
    getBuilderCreationParameters(newProgramOrRootNames, hostOrOptions, oldProgramOrHost, configFileParsingDiagnosticsOrOldProgram, configFileParsingDiagnostics, projectReferences)
  );
}
export function createAbstractBuilder(newProgram: Program, host: BuilderProgramHost, oldProgram?: BuilderProgram, configFileParsingDiagnostics?: readonly Diagnostic[]): BuilderProgram;
export function createAbstractBuilder(
  rootNames: readonly string[] | undefined,
  options: CompilerOptions | undefined,
  host?: CompilerHost,
  oldProgram?: BuilderProgram,
  configFileParsingDiagnostics?: readonly Diagnostic[],
  projectReferences?: readonly ProjectReference[]
): BuilderProgram;
export function createAbstractBuilder(
  newProgramOrRootNames: Program | readonly string[] | undefined,
  hostOrOptions: BuilderProgramHost | CompilerOptions | undefined,
  oldProgramOrHost?: CompilerHost | BuilderProgram,
  configFileParsingDiagnosticsOrOldProgram?: readonly Diagnostic[] | BuilderProgram,
  configFileParsingDiagnostics?: readonly Diagnostic[],
  projectReferences?: readonly ProjectReference[]
): BuilderProgram {
  const { newProgram, configFileParsingDiagnostics: newConfigFileParsingDiagnostics } = getBuilderCreationParameters(
    newProgramOrRootNames,
    hostOrOptions,
    oldProgramOrHost,
    configFileParsingDiagnosticsOrOldProgram,
    configFileParsingDiagnostics,
    projectReferences
  );
  return createRedirectedBuilderProgram({ program: newProgram, compilerOptions: newProgram.getCompilerOptions() }, newConfigFileParsingDiagnostics);
}
export interface ReusableDiagnostic extends ReusableDiagnosticRelatedInformation {
  reportsUnnecessary?: {};
  source?: string;
  relatedInformation?: ReusableDiagnosticRelatedInformation[];
}
export interface ReusableDiagnosticRelatedInformation {
  category: qd.Category;
  code: number;
  file: string | undefined;
  start: number | undefined;
  length: number | undefined;
  messageText: string | ReusableMessageChain;
}
export type ReusableMessageChain = qd.MessageChain;
export interface ReusableBuilderProgramState extends ReusableBuilderState {
  semanticDiagnosticsPerFile?: ReadonlyMap<readonly ReusableDiagnostic[] | readonly Diagnostic[]> | undefined;
  changedFilesSet?: ReadonlyMap<true>;
  affectedFiles?: readonly SourceFile[] | undefined;
  currentChangedFilePath?: Path | undefined;
  currentAffectedFilesSignatures?: QReadonlyMap<string> | undefined;
  currentAffectedFilesExportedModulesMap?: Readonly<BuilderState.ComputingExportedModulesMap> | undefined;
  semanticDiagnosticsFromOldState?: Map<true>;
  program?: Program | undefined;
  compilerOptions: CompilerOptions;
  affectedFilesPendingEmit?: readonly Path[] | undefined;
  affectedFilesPendingEmitKind?: ReadonlyMap<BuilderFileEmit> | undefined;
  affectedFilesPendingEmitIndex?: number | undefined;
  hasReusableDiagnostic?: true;
}
export const enum BuilderFileEmit {
  DtsOnly,
  Full,
}
export interface BuilderProgramState extends BuilderState {
  semanticDiagnosticsPerFile: Map<readonly Diagnostic[]> | undefined;
  changedFilesSet: Map<true>;
  affectedFiles: readonly SourceFile[] | undefined;
  affectedFilesIndex: number | undefined;
  currentChangedFilePath: Path | undefined;
  currentAffectedFilesSignatures: Map<string> | undefined;
  currentAffectedFilesExportedModulesMap: BuilderState.ComputingExportedModulesMap | undefined;
  seenAffectedFiles: Map<true> | undefined;
  cleanedDiagnosticsOfLibFiles?: boolean;
  semanticDiagnosticsFromOldState?: Map<true>;
  program: Program | undefined;
  compilerOptions: CompilerOptions;
  affectedFilesPendingEmit: Path[] | undefined;
  affectedFilesPendingEmitKind: Map<BuilderFileEmit> | undefined;
  affectedFilesPendingEmitIndex: number | undefined;
  emittedBuildInfo?: boolean;
  seenEmittedFiles: Map<BuilderFileEmit> | undefined;
  programEmitComplete?: true;
}
function hasSameKeys<T, U>(map1: ReadonlyMap<T> | undefined, map2: ReadonlyMap<U> | undefined): boolean {
  return (map1 as ReadonlyMap<T | U>) === map2 || (map1 !== undefined && map2 !== undefined && map1.size === map2.size && !qu.forEachKey(map1, (key) => !map2.has(key)));
}
function createBuilderProgramState(newProgram: Program, getCanonicalFileName: GetCanonicalFileName, oldState?: Readonly<ReusableBuilderProgramState>): BuilderProgramState {
  const state = BuilderState.create(newProgram, getCanonicalFileName, oldState) as BuilderProgramState;
  state.program = newProgram;
  const compilerOptions = newProgram.getCompilerOptions();
  state.compilerOptions = compilerOptions;
  if (!compilerOptions.outFile && !compilerOptions.out) {
    state.semanticDiagnosticsPerFile = new QMap<readonly Diagnostic[]>();
  }
  state.changedFilesSet = new QMap<true>();
  const useOldState = BuilderState.canReuseOldState(state.referencedMap, oldState);
  const oldCompilerOptions = useOldState ? oldState!.compilerOptions : undefined;
  const canCopySemanticDiagnostics =
    useOldState && oldState!.semanticDiagnosticsPerFile && !!state.semanticDiagnosticsPerFile && !compilerOptionsAffectSemanticDiagnostics(compilerOptions, oldCompilerOptions!);
  if (useOldState) {
    if (!oldState!.currentChangedFilePath) {
      const affectedSignatures = oldState!.currentAffectedFilesSignatures;
      assert(!oldState!.affectedFiles && (!affectedSignatures || !affectedSignatures.size), 'Cannot reuse if only few affected files of currentChangedFile were iterated');
    }
    const changedFilesSet = oldState!.changedFilesSet;
    if (canCopySemanticDiagnostics) {
      assert(!changedFilesSet || !qu.forEachKey(changedFilesSet, (path) => oldState!.semanticDiagnosticsPerFile!.has(path)), 'Semantic diagnostics shouldnt be available for changed files');
    }
    if (changedFilesSet) {
      qu.copyEntries(changedFilesSet, state.changedFilesSet);
    }
    if (!compilerOptions.outFile && !compilerOptions.out && oldState!.affectedFilesPendingEmit) {
      state.affectedFilesPendingEmit = oldState!.affectedFilesPendingEmit.slice();
      state.affectedFilesPendingEmitKind = cloneMapOrUndefined(oldState!.affectedFilesPendingEmitKind);
      state.affectedFilesPendingEmitIndex = oldState!.affectedFilesPendingEmitIndex;
      state.seenAffectedFiles = new QMap();
    }
  }
  const referencedMap = state.referencedMap;
  const oldReferencedMap = useOldState ? oldState!.referencedMap : undefined;
  const copyDeclarationFileDiagnostics = canCopySemanticDiagnostics && !compilerOptions.skipLibCheck === !oldCompilerOptions!.skipLibCheck;
  const copyLibFileDiagnostics = copyDeclarationFileDiagnostics && !compilerOptions.skipDefaultLibCheck === !oldCompilerOptions!.skipDefaultLibCheck;
  state.fileInfos.forEach((info, sourceFilePath) => {
    let oldInfo: Readonly<BuilderState.FileInfo> | undefined;
    let newReferences: BuilderState.ReferencedSet | undefined;
    if (
      !useOldState ||
      !(oldInfo = oldState!.fileInfos.get(sourceFilePath)) ||
      oldInfo.version !== info.version ||
      !hasSameKeys((newReferences = referencedMap && referencedMap.get(sourceFilePath)), oldReferencedMap && oldReferencedMap.get(sourceFilePath)) ||
      (newReferences && qu.forEachKey(newReferences, (path) => !state.fileInfos.has(path) && oldState!.fileInfos.has(path)))
    ) {
      state.changedFilesSet.set(sourceFilePath, true);
    } else if (canCopySemanticDiagnostics) {
      const sourceFile = newProgram.getSourceFileByPath(sourceFilePath as Path)!;
      if (sourceFile.isDeclarationFile && !copyDeclarationFileDiagnostics) {
        return;
      }
      if (sourceFile.hasNoDefaultLib && !copyLibFileDiagnostics) {
        return;
      }
      const diagnostics = oldState!.semanticDiagnosticsPerFile!.get(sourceFilePath);
      if (diagnostics) {
        state.semanticDiagnosticsPerFile!.set(
          sourceFilePath,
          oldState!.hasReusableDiagnostic ? convertToDiagnostics(diagnostics as readonly ReusableDiagnostic[], newProgram, getCanonicalFileName) : (diagnostics as readonly Diagnostic[])
        );
        if (!state.semanticDiagnosticsFromOldState) {
          state.semanticDiagnosticsFromOldState = new QMap<true>();
        }
        state.semanticDiagnosticsFromOldState.set(sourceFilePath, true);
      }
    }
  });
  if (useOldState && qu.forEachEntry(oldState!.fileInfos, (info, sourceFilePath) => info.affectsGlobalScope && !state.fileInfos.has(sourceFilePath))) {
    BuilderState.getAllFilesExcludingDefaultLibraryFile(state, newProgram, undefined).forEach((file) => state.changedFilesSet.set(file.resolvedPath, true));
  } else if (oldCompilerOptions && compilerOptionsAffectEmit(compilerOptions, oldCompilerOptions)) {
    newProgram.getSourceFiles().forEach((f) => addToAffectedFilesPendingEmit(state, f.resolvedPath, BuilderFileEmit.Full));
    assert(!state.seenAffectedFiles || !state.seenAffectedFiles.size);
    state.seenAffectedFiles = state.seenAffectedFiles || new QMap<true>();
  }
  state.emittedBuildInfo = !state.changedFilesSet.size && !state.affectedFilesPendingEmit;
  return state;
}
function convertToDiagnostics(diagnostics: readonly ReusableDiagnostic[], newProgram: Program, getCanonicalFileName: GetCanonicalFileName): readonly Diagnostic[] {
  if (!diagnostics.length) return emptyArray;
  const buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(getTsBuildInfoEmitOutputFilePath(newProgram.getCompilerOptions())!, newProgram.getCurrentDirectory()));
  return diagnostics.map((diagnostic) => {
    const result: Diagnostic = convertToDiagnosticRelatedInformation(diagnostic, newProgram, toPath);
    result.reportsUnnecessary = diagnostic.reportsUnnecessary;
    result.source = diagnostic.source;
    const { relatedInformation } = diagnostic;
    result.relatedInformation = relatedInformation ? (relatedInformation.length ? relatedInformation.map((r) => convertToDiagnosticRelatedInformation(r, newProgram, toPath)) : emptyArray) : undefined;
    return result;
  });
  function toPath(path: string) {
    return qnr.toPath(path, buildInfoDirectory, getCanonicalFileName);
  }
}
function convertToDiagnosticRelatedInformation(diagnostic: ReusableDiagnosticRelatedInformation, newProgram: Program, toPath: (path: string) => Path): DiagnosticRelatedInformation {
  const { file } = diagnostic;
  return {
    ...diagnostic,
    file: file ? newProgram.getSourceFileByPath(toPath(file)) : undefined,
  };
}
function releaseCache(state: BuilderProgramState) {
  BuilderState.releaseCache(state);
  state.program = undefined;
}
function cloneBuilderProgramState(state: Readonly<BuilderProgramState>): BuilderProgramState {
  const newState = BuilderState.clone(state) as BuilderProgramState;
  newState.semanticDiagnosticsPerFile = cloneMapOrUndefined(state.semanticDiagnosticsPerFile);
  newState.changedFilesSet = cloneMap(state.changedFilesSet);
  newState.affectedFiles = state.affectedFiles;
  newState.affectedFilesIndex = state.affectedFilesIndex;
  newState.currentChangedFilePath = state.currentChangedFilePath;
  newState.currentAffectedFilesSignatures = cloneMapOrUndefined(state.currentAffectedFilesSignatures);
  newState.currentAffectedFilesExportedModulesMap = cloneMapOrUndefined(state.currentAffectedFilesExportedModulesMap);
  newState.seenAffectedFiles = cloneMapOrUndefined(state.seenAffectedFiles);
  newState.cleanedDiagnosticsOfLibFiles = state.cleanedDiagnosticsOfLibFiles;
  newState.semanticDiagnosticsFromOldState = cloneMapOrUndefined(state.semanticDiagnosticsFromOldState);
  newState.program = state.program;
  newState.compilerOptions = state.compilerOptions;
  newState.affectedFilesPendingEmit = state.affectedFilesPendingEmit && state.affectedFilesPendingEmit.slice();
  newState.affectedFilesPendingEmitKind = cloneMapOrUndefined(state.affectedFilesPendingEmitKind);
  newState.affectedFilesPendingEmitIndex = state.affectedFilesPendingEmitIndex;
  newState.seenEmittedFiles = cloneMapOrUndefined(state.seenEmittedFiles);
  newState.programEmitComplete = state.programEmitComplete;
  return newState;
}
function assertSourceFileOkWithoutNextAffectedCall(state: BuilderProgramState, sourceFile: SourceFile | undefined) {
  assert(!sourceFile || !state.affectedFiles || state.affectedFiles[state.affectedFilesIndex! - 1] !== sourceFile || !state.semanticDiagnosticsPerFile!.has(sourceFile.resolvedPath));
}
function getNextAffectedFile(state: BuilderProgramState, cancellationToken: CancellationToken | undefined, computeHash: BuilderState.ComputeHash): SourceFile | Program | undefined {
  while (true) {
    const { affectedFiles } = state;
    if (affectedFiles) {
      const seenAffectedFiles = state.seenAffectedFiles!;
      let affectedFilesIndex = state.affectedFilesIndex!;
      while (affectedFilesIndex < affectedFiles.length) {
        const affectedFile = affectedFiles[affectedFilesIndex];
        if (!seenAffectedFiles.has(affectedFile.resolvedPath)) {
          state.affectedFilesIndex = affectedFilesIndex;
          handleDtsMayChangeOfAffectedFile(state, affectedFile, cancellationToken, computeHash);
          return affectedFile;
        }
        affectedFilesIndex++;
      }
      state.changedFilesSet.delete(state.currentChangedFilePath!);
      state.currentChangedFilePath = undefined;
      BuilderState.updateSignaturesFromCache(state, state.currentAffectedFilesSignatures!);
      state.currentAffectedFilesSignatures!.clear();
      BuilderState.updateExportedFilesMapFromCache(state, state.currentAffectedFilesExportedModulesMap);
      state.affectedFiles = undefined;
    }
    const nextKey = state.changedFilesSet.keys().next();
    if (nextKey.done) {
      return;
    }
    const program = Debug.checkDefined(state.program);
    const compilerOptions = program.getCompilerOptions();
    if (compilerOptions.outFile || compilerOptions.out) {
      assert(!state.semanticDiagnosticsPerFile);
      return program;
    }
    state.currentAffectedFilesSignatures = state.currentAffectedFilesSignatures || new QMap();
    if (state.exportedModulesMap) {
      state.currentAffectedFilesExportedModulesMap = state.currentAffectedFilesExportedModulesMap || new QMap<BuilderState.ReferencedSet | false>();
    }
    state.affectedFiles = BuilderState.getFilesAffectedBy(
      state,
      program,
      nextKey.value as Path,
      cancellationToken,
      computeHash,
      state.currentAffectedFilesSignatures,
      state.currentAffectedFilesExportedModulesMap
    );
    state.currentChangedFilePath = nextKey.value as Path;
    state.affectedFilesIndex = 0;
    state.seenAffectedFiles = state.seenAffectedFiles || new QMap<true>();
  }
}
function getNextAffectedFilePendingEmit(state: BuilderProgramState) {
  const { affectedFilesPendingEmit } = state;
  if (affectedFilesPendingEmit) {
    const seenEmittedFiles = state.seenEmittedFiles || (state.seenEmittedFiles = new QMap());
    for (let i = state.affectedFilesPendingEmitIndex!; i < affectedFilesPendingEmit.length; i++) {
      const affectedFile = Debug.checkDefined(state.program).getSourceFileByPath(affectedFilesPendingEmit[i]);
      if (affectedFile) {
        const seenKind = seenEmittedFiles.get(affectedFile.resolvedPath);
        const emitKind = Debug.checkDefined(Debug.checkDefined(state.affectedFilesPendingEmitKind).get(affectedFile.resolvedPath));
        if (seenKind === undefined || seenKind < emitKind) {
          state.affectedFilesPendingEmitIndex = i;
          return { affectedFile, emitKind };
        }
      }
    }
    state.affectedFilesPendingEmit = undefined;
    state.affectedFilesPendingEmitKind = undefined;
    state.affectedFilesPendingEmitIndex = undefined;
  }
  return;
}
function handleDtsMayChangeOfAffectedFile(state: BuilderProgramState, affectedFile: SourceFile, cancellationToken: CancellationToken | undefined, computeHash: BuilderState.ComputeHash) {
  removeSemanticDiagnosticsOf(state, affectedFile.resolvedPath);
  if (state.allFilesExcludingDefaultLibraryFile === state.affectedFiles) {
    if (!state.cleanedDiagnosticsOfLibFiles) {
      state.cleanedDiagnosticsOfLibFiles = true;
      const program = Debug.checkDefined(state.program);
      const options = program.getCompilerOptions();
      forEach(program.getSourceFiles(), (f) => program.isSourceFileDefaultLibrary(f) && !skipTypeChecking(f, options, program) && removeSemanticDiagnosticsOf(state, f.resolvedPath));
    }
    return;
  }
  if (!state.compilerOptions.assumeChangesOnlyAffectDirectDependencies) {
    forEachReferencingModulesOfExportOfAffectedFile(state, affectedFile, (state, path) => handleDtsMayChangeOf(state, path, cancellationToken, computeHash));
  }
}
function handleDtsMayChangeOf(state: BuilderProgramState, path: Path, cancellationToken: CancellationToken | undefined, computeHash: BuilderState.ComputeHash) {
  removeSemanticDiagnosticsOf(state, path);
  if (!state.changedFilesSet.has(path)) {
    const program = Debug.checkDefined(state.program);
    const sourceFile = program.getSourceFileByPath(path);
    if (sourceFile) {
      BuilderState.updateShapeSignature(
        state,
        program,
        sourceFile,
        Debug.checkDefined(state.currentAffectedFilesSignatures),
        cancellationToken,
        computeHash,
        state.currentAffectedFilesExportedModulesMap
      );
      if (getEmitDeclarations(state.compilerOptions)) {
        addToAffectedFilesPendingEmit(state, path, BuilderFileEmit.DtsOnly);
      }
    }
  }
  return false;
}
function removeSemanticDiagnosticsOf(state: BuilderProgramState, path: Path) {
  if (!state.semanticDiagnosticsFromOldState) return true;
  state.semanticDiagnosticsFromOldState.delete(path);
  state.semanticDiagnosticsPerFile!.delete(path);
  return !state.semanticDiagnosticsFromOldState.size;
}
function isChangedSignagure(state: BuilderProgramState, path: Path) {
  const newSignature = Debug.checkDefined(state.currentAffectedFilesSignatures).get(path);
  const oldSignagure = Debug.checkDefined(state.fileInfos.get(path)).signature;
  return newSignature !== oldSignagure;
}
function forEachReferencingModulesOfExportOfAffectedFile(state: BuilderProgramState, affectedFile: SourceFile, fn: (state: BuilderProgramState, filePath: Path) => boolean) {
  if (!state.exportedModulesMap || !state.changedFilesSet.has(affectedFile.resolvedPath)) {
    return;
  }
  if (!isChangedSignagure(state, affectedFile.resolvedPath)) return;
  if (state.compilerOptions.isolatedModules) {
    const seenFileNamesMap = new QMap<true>();
    seenFileNamesMap.set(affectedFile.resolvedPath, true);
    const queue = BuilderState.getReferencedByPaths(state, affectedFile.resolvedPath);
    while (queue.length > 0) {
      const currentPath = queue.pop()!;
      if (!seenFileNamesMap.has(currentPath)) {
        seenFileNamesMap.set(currentPath, true);
        const result = fn(state, currentPath);
        if (result && isChangedSignagure(state, currentPath)) {
          const currentSourceFile = Debug.checkDefined(state.program).getSourceFileByPath(currentPath)!;
          queue.push(...BuilderState.getReferencedByPaths(state, currentSourceFile.resolvedPath));
        }
      }
    }
  }
  assert(!!state.currentAffectedFilesExportedModulesMap);
  const seenFileAndExportsOfFile = new QMap<true>();
  if (
    qu.forEachEntry(
      state.currentAffectedFilesExportedModulesMap,
      (exportedModules, exportedFromPath) =>
        exportedModules && exportedModules.has(affectedFile.resolvedPath) && forEachFilesReferencingPath(state, exportedFromPath as Path, seenFileAndExportsOfFile, fn)
    )
  ) {
    return;
  }
  qu.forEachEntry(
    state.exportedModulesMap,
    (exportedModules, exportedFromPath) =>
      !state.currentAffectedFilesExportedModulesMap!.has(exportedFromPath) &&
      exportedModules.has(affectedFile.resolvedPath) &&
      forEachFilesReferencingPath(state, exportedFromPath as Path, seenFileAndExportsOfFile, fn)
  );
}
function forEachFilesReferencingPath(state: BuilderProgramState, referencedPath: Path, seenFileAndExportsOfFile: Map<true>, fn: (state: BuilderProgramState, filePath: Path) => boolean) {
  return qu.forEachEntry(
    state.referencedMap!,
    (referencesInFile, filePath) => referencesInFile.has(referencedPath) && forEachFileAndExportsOfFile(state, filePath as Path, seenFileAndExportsOfFile, fn)
  );
}
function forEachFileAndExportsOfFile(state: BuilderProgramState, filePath: Path, seenFileAndExportsOfFile: Map<true>, fn: (state: BuilderProgramState, filePath: Path) => boolean): boolean {
  if (!addToSeen(seenFileAndExportsOfFile, filePath)) return false;
  if (fn(state, filePath)) return true;
  assert(!!state.currentAffectedFilesExportedModulesMap);
  if (
    qu.forEachEntry(
      state.currentAffectedFilesExportedModulesMap,
      (exportedModules, exportedFromPath) => exportedModules && exportedModules.has(filePath) && forEachFileAndExportsOfFile(state, exportedFromPath as Path, seenFileAndExportsOfFile, fn)
    )
  ) {
    return true;
  }
  if (
    qu.forEachEntry(
      state.exportedModulesMap!,
      (exportedModules, exportedFromPath) =>
        !state.currentAffectedFilesExportedModulesMap!.has(exportedFromPath) &&
        exportedModules.has(filePath) &&
        forEachFileAndExportsOfFile(state, exportedFromPath as Path, seenFileAndExportsOfFile, fn)
    )
  ) {
    return true;
  }
  return !!qu.forEachEntry(
    state.referencedMap!,
    (referencesInFile, referencingFilePath) => referencesInFile.has(filePath) && !seenFileAndExportsOfFile.has(referencingFilePath) && fn(state, referencingFilePath as Path)
  );
}
function doneWithAffectedFile(state: BuilderProgramState, affected: SourceFile | Program, emitKind?: BuilderFileEmit, isPendingEmit?: boolean, isBuildInfoEmit?: boolean) {
  if (isBuildInfoEmit) {
    state.emittedBuildInfo = true;
  } else if (affected === state.program) {
    state.changedFilesSet.clear();
    state.programEmitComplete = true;
  } else {
    state.seenAffectedFiles!.set((affected as SourceFile).resolvedPath, true);
    if (emitKind !== undefined) {
      (state.seenEmittedFiles || (state.seenEmittedFiles = new QMap())).set((affected as SourceFile).resolvedPath, emitKind);
    }
    if (isPendingEmit) {
      state.affectedFilesPendingEmitIndex!++;
    } else {
      state.affectedFilesIndex!++;
    }
  }
}
function toAffectedFileResult<T>(state: BuilderProgramState, result: T, affected: SourceFile | Program): AffectedFileResult<T> {
  doneWithAffectedFile(state, affected);
  return { result, affected };
}
function toAffectedFileEmitResult(
  state: BuilderProgramState,
  result: EmitResult,
  affected: SourceFile | Program,
  emitKind: BuilderFileEmit,
  isPendingEmit?: boolean,
  isBuildInfoEmit?: boolean
): AffectedFileResult<EmitResult> {
  doneWithAffectedFile(state, affected, emitKind, isPendingEmit, isBuildInfoEmit);
  return { result, affected };
}
function getSemanticDiagnosticsOfFile(state: BuilderProgramState, sourceFile: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[] {
  return concatenate(getBinderAndCheckerDiagnosticsOfFile(state, sourceFile, cancellationToken), Debug.checkDefined(state.program).getProgramDiagnostics(sourceFile));
}
function getBinderAndCheckerDiagnosticsOfFile(state: BuilderProgramState, sourceFile: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[] {
  const path = sourceFile.resolvedPath;
  if (state.semanticDiagnosticsPerFile) {
    const cachedDiagnostics = state.semanticDiagnosticsPerFile.get(path);
    if (cachedDiagnostics) return cachedDiagnostics;
  }
  const diagnostics = Debug.checkDefined(state.program).getBindAndCheckDiagnostics(sourceFile, cancellationToken);
  if (state.semanticDiagnosticsPerFile) {
    state.semanticDiagnosticsPerFile.set(path, diagnostics);
  }
  return diagnostics;
}
export type ProgramBuildInfoDiagnostic = string | [string, readonly ReusableDiagnostic[]];
export interface ProgramBuildInfo {
  fileInfos: MapLike<BuilderState.FileInfo>;
  options: CompilerOptions;
  referencedMap?: MapLike<string[]>;
  exportedModulesMap?: MapLike<string[]>;
  semanticDiagnosticsPerFile?: ProgramBuildInfoDiagnostic[];
}
function getProgramBuildInfo(state: Readonly<ReusableBuilderProgramState>, getCanonicalFileName: GetCanonicalFileName): ProgramBuildInfo | undefined {
  if (state.compilerOptions.outFile || state.compilerOptions.out) return;
  const currentDirectory = Debug.checkDefined(state.program).getCurrentDirectory();
  const buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(getTsBuildInfoEmitOutputFilePath(state.compilerOptions)!, currentDirectory));
  const fileInfos: MapLike<BuilderState.FileInfo> = {};
  state.fileInfos.forEach((value, key) => {
    const signature = state.currentAffectedFilesSignatures && state.currentAffectedFilesSignatures.get(key);
    fileInfos[relativeToBuildInfo(key)] = signature === undefined ? value : { version: value.version, signature, affectsGlobalScope: value.affectsGlobalScope };
  });
  const result: ProgramBuildInfo = {
    fileInfos,
    options: convertToReusableCompilerOptions(state.compilerOptions, relativeToBuildInfoEnsuringAbsolutePath),
  };
  if (state.referencedMap) {
    const referencedMap: MapLike<string[]> = {};
    for (const key of arrayFrom(state.referencedMap.keys()).sort(compareCaseSensitive)) {
      referencedMap[relativeToBuildInfo(key)] = arrayFrom(state.referencedMap.get(key)!.keys(), relativeToBuildInfo).sort(compareCaseSensitive);
    }
    result.referencedMap = referencedMap;
  }
  if (state.exportedModulesMap) {
    const exportedModulesMap: MapLike<string[]> = {};
    for (const key of arrayFrom(state.exportedModulesMap.keys()).sort(compareCaseSensitive)) {
      const newValue = state.currentAffectedFilesExportedModulesMap && state.currentAffectedFilesExportedModulesMap.get(key);
      if (newValue === undefined) exportedModulesMap[relativeToBuildInfo(key)] = arrayFrom(state.exportedModulesMap.get(key)!.keys(), relativeToBuildInfo).sort(compareCaseSensitive);
      else if (newValue) exportedModulesMap[relativeToBuildInfo(key)] = arrayFrom(newValue.keys(), relativeToBuildInfo).sort(compareCaseSensitive);
    }
    result.exportedModulesMap = exportedModulesMap;
  }
  if (state.semanticDiagnosticsPerFile) {
    const semanticDiagnosticsPerFile: ProgramBuildInfoDiagnostic[] = [];
    for (const key of arrayFrom(state.semanticDiagnosticsPerFile.keys()).sort(compareCaseSensitive)) {
      const value = state.semanticDiagnosticsPerFile.get(key)!;
      semanticDiagnosticsPerFile.push(
        value.length
          ? [relativeToBuildInfo(key), state.hasReusableDiagnostic ? (value as readonly ReusableDiagnostic[]) : convertToReusableDiagnostics(value as readonly Diagnostic[], relativeToBuildInfo)]
          : relativeToBuildInfo(key)
      );
    }
    result.semanticDiagnosticsPerFile = semanticDiagnosticsPerFile;
  }
  return result;
  function relativeToBuildInfoEnsuringAbsolutePath(path: string) {
    return relativeToBuildInfo(getNormalizedAbsolutePath(path, currentDirectory));
  }
  function relativeToBuildInfo(path: string) {
    return ensurePathIsNonModuleName(getRelativePathFromDirectory(buildInfoDirectory, path, getCanonicalFileName));
  }
}
function convertToReusableCompilerOptions(options: CompilerOptions, relativeToBuildInfo: (path: string) => string) {
  const result: CompilerOptions = {};
  const { optionsNameMap } = getOptionsNameMap();
  for (const name in options) {
    if (hasProperty(options, name)) {
      result[name] = convertToReusableCompilerOptionValue(optionsNameMap.get(name.toLowerCase()), options[name] as CompilerOptionsValue, relativeToBuildInfo);
    }
  }
  if (result.configFilePath) {
    result.configFilePath = relativeToBuildInfo(result.configFilePath);
  }
  return result;
}
function convertToReusableCompilerOptionValue(option: CommandLineOption | undefined, value: CompilerOptionsValue, relativeToBuildInfo: (path: string) => string) {
  if (option) {
    if (option.type === 'list') {
      const values = value as readonly (string | number)[];
      if (option.element.isFilePath && values.length) return values.map(relativeToBuildInfo);
    } else if (option.isFilePath) {
      return relativeToBuildInfo(value as string);
    }
  }
  return value;
}
function convertToReusableDiagnostics(diagnostics: readonly Diagnostic[], relativeToBuildInfo: (path: string) => string): readonly ReusableDiagnostic[] {
  assert(!!diagnostics.length);
  return diagnostics.map((diagnostic) => {
    const result: ReusableDiagnostic = convertToReusableDiagnosticRelatedInformation(diagnostic, relativeToBuildInfo);
    result.reportsUnnecessary = diagnostic.reportsUnnecessary;
    result.source = diagnostic.source;
    const { relatedInformation } = diagnostic;
    result.relatedInformation = relatedInformation
      ? relatedInformation.length
        ? relatedInformation.map((r) => convertToReusableDiagnosticRelatedInformation(r, relativeToBuildInfo))
        : emptyArray
      : undefined;
    return result;
  });
}
function convertToReusableDiagnosticRelatedInformation(diagnostic: DiagnosticRelatedInformation, relativeToBuildInfo: (path: string) => string): ReusableDiagnosticRelatedInformation {
  const { file } = diagnostic;
  return {
    ...diagnostic,
    file: file ? relativeToBuildInfo(file.resolvedPath) : undefined,
  };
}
export enum BuilderProgramKind {
  SemanticDiagnosticsBuilderProgram,
  EmitAndSemanticDiagnosticsBuilderProgram,
}
export interface BuilderCreationParameters {
  newProgram: Program;
  host: BuilderProgramHost;
  oldProgram: BuilderProgram | undefined;
  configFileParsingDiagnostics: readonly Diagnostic[];
}
export function getBuilderCreationParameters(
  newProgramOrRootNames: Program | readonly string[] | undefined,
  hostOrOptions: BuilderProgramHost | CompilerOptions | undefined,
  oldProgramOrHost?: BuilderProgram | CompilerHost,
  configFileParsingDiagnosticsOrOldProgram?: readonly Diagnostic[] | BuilderProgram,
  configFileParsingDiagnostics?: readonly Diagnostic[],
  projectReferences?: readonly ProjectReference[]
): BuilderCreationParameters {
  let host: BuilderProgramHost;
  let newProgram: Program;
  let oldProgram: BuilderProgram;
  if (newProgramOrRootNames === undefined) {
    assert(hostOrOptions === undefined);
    host = oldProgramOrHost as CompilerHost;
    oldProgram = configFileParsingDiagnosticsOrOldProgram as BuilderProgram;
    assert(!!oldProgram);
    newProgram = oldProgram.getProgram();
  } else if (isArray(newProgramOrRootNames)) {
    oldProgram = configFileParsingDiagnosticsOrOldProgram as BuilderProgram;
    newProgram = createProgram({
      rootNames: newProgramOrRootNames,
      options: hostOrOptions as CompilerOptions,
      host: oldProgramOrHost as CompilerHost,
      oldProgram: oldProgram && oldProgram.getProgramOrUndefined(),
      configFileParsingDiagnostics,
      projectReferences,
    });
    host = oldProgramOrHost as CompilerHost;
  } else {
    newProgram = newProgramOrRootNames;
    host = hostOrOptions as BuilderProgramHost;
    oldProgram = oldProgramOrHost as BuilderProgram;
    configFileParsingDiagnostics = configFileParsingDiagnosticsOrOldProgram as readonly Diagnostic[];
  }
  return { host, newProgram, oldProgram, configFileParsingDiagnostics: configFileParsingDiagnostics || emptyArray };
}
export function createBuilderProgram(kind: BuilderProgramKind.SemanticDiagnosticsBuilderProgram, builderCreationParameters: BuilderCreationParameters): SemanticDiagnosticsBuilderProgram;
export function createBuilderProgram(kind: BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram, builderCreationParameters: BuilderCreationParameters): EmitAndSemanticDiagnosticsBuilderProgram;
export function createBuilderProgram(kind: BuilderProgramKind, { newProgram, host, oldProgram, configFileParsingDiagnostics }: BuilderCreationParameters) {
  let oldState = oldProgram && oldProgram.getState();
  if (oldState && newProgram === oldState.program && configFileParsingDiagnostics === newProgram.getConfigFileParsingDiagnostics()) {
    newProgram = undefined!;
    oldState = undefined;
    return oldProgram;
  }
  const getCanonicalFileName = createGetCanonicalFileName(host.useCaseSensitiveFileNames());
  const computeHash = host.createHash || generateDjb2Hash;
  let state = createBuilderProgramState(newProgram, getCanonicalFileName, oldState);
  let backupState: BuilderProgramState | undefined;
  newProgram.getProgramBuildInfo = () => getProgramBuildInfo(state, getCanonicalFileName);
  newProgram = undefined!;
  oldProgram = undefined;
  oldState = undefined;
  const builderProgram = createRedirectedBuilderProgram(state, configFileParsingDiagnostics);
  builderProgram.getState = () => state;
  builderProgram.backupState = () => {
    assert(backupState === undefined);
    backupState = cloneBuilderProgramState(state);
  };
  builderProgram.restoreState = () => {
    state = Debug.checkDefined(backupState);
    backupState = undefined;
  };
  builderProgram.getAllDependencies = (sourceFile) => BuilderState.getAllDependencies(state, Debug.checkDefined(state.program), sourceFile);
  builderProgram.getSemanticDiagnostics = getSemanticDiagnostics;
  builderProgram.emit = emit;
  builderProgram.releaseProgram = () => {
    releaseCache(state);
    backupState = undefined;
  };
  if (kind === BuilderProgramKind.SemanticDiagnosticsBuilderProgram) {
    (builderProgram as SemanticDiagnosticsBuilderProgram).getSemanticDiagnosticsOfNextAffectedFile = getSemanticDiagnosticsOfNextAffectedFile;
  } else if (kind === BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram) {
    (builderProgram as EmitAndSemanticDiagnosticsBuilderProgram).getSemanticDiagnosticsOfNextAffectedFile = getSemanticDiagnosticsOfNextAffectedFile;
    (builderProgram as EmitAndSemanticDiagnosticsBuilderProgram).emitNextAffectedFile = emitNextAffectedFile;
  } else {
    notImplemented();
  }
  return builderProgram;
  function emitNextAffectedFile(
    writeFile?: WriteFileCallback,
    cancellationToken?: CancellationToken,
    emitOnlyDtsFiles?: boolean,
    customTransformers?: CustomTransformers
  ): AffectedFileResult<EmitResult> {
    let affected = getNextAffectedFile(state, cancellationToken, computeHash);
    let emitKind = BuilderFileEmit.Full;
    let isPendingEmitFile = false;
    if (!affected) {
      if (!state.compilerOptions.out && !state.compilerOptions.outFile) {
        const pendingAffectedFile = getNextAffectedFilePendingEmit(state);
        if (!pendingAffectedFile) {
          if (state.emittedBuildInfo) {
            return;
          }
          const affected = Debug.checkDefined(state.program);
          return toAffectedFileEmitResult(state, affected.emitBuildInfo(writeFile || maybeBind(host, host.writeFile), cancellationToken), affected, BuilderFileEmit.Full, false, true);
        }
        ({ affectedFile: affected, emitKind } = pendingAffectedFile);
        isPendingEmitFile = true;
      } else {
        const program = Debug.checkDefined(state.program);
        if (state.programEmitComplete) return;
        affected = program;
      }
    }
    return toAffectedFileEmitResult(
      state,
      Debug.checkDefined(state.program).emit(
        affected === state.program ? undefined : (affected as SourceFile),
        writeFile || maybeBind(host, host.writeFile),
        cancellationToken,
        emitOnlyDtsFiles || emitKind === BuilderFileEmit.DtsOnly,
        customTransformers
      ),
      affected,
      emitKind,
      isPendingEmitFile
    );
  }
  function emit(targetSourceFile?: SourceFile, writeFile?: WriteFileCallback, cancellationToken?: CancellationToken, emitOnlyDtsFiles?: boolean, customTransformers?: CustomTransformers): EmitResult {
    if (kind === BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram) {
      assertSourceFileOkWithoutNextAffectedCall(state, targetSourceFile);
      const result = handleNoEmitOptions(builderProgram, targetSourceFile, cancellationToken);
      if (result) return result;
      if (!targetSourceFile) {
        let sourceMaps: SourceMapEmitResult[] = [];
        let emitSkipped = false;
        let diagnostics: Diagnostic[] | undefined;
        let emittedFiles: string[] = [];
        let affectedEmitResult: AffectedFileResult<EmitResult>;
        while ((affectedEmitResult = emitNextAffectedFile(writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers))) {
          emitSkipped = emitSkipped || affectedEmitResult.result.emitSkipped;
          diagnostics = addRange(diagnostics, affectedEmitResult.result.diagnostics);
          emittedFiles = addRange(emittedFiles, affectedEmitResult.result.emittedFiles);
          sourceMaps = addRange(sourceMaps, affectedEmitResult.result.sourceMaps);
        }
        return {
          emitSkipped,
          diagnostics: diagnostics || emptyArray,
          emittedFiles,
          sourceMaps,
        };
      }
    }
    return Debug.checkDefined(state.program).emit(targetSourceFile, writeFile || maybeBind(host, host.writeFile), cancellationToken, emitOnlyDtsFiles, customTransformers);
  }
  function getSemanticDiagnosticsOfNextAffectedFile(cancellationToken?: CancellationToken, ignoreSourceFile?: (sourceFile: SourceFile) => boolean): AffectedFileResult<readonly Diagnostic[]> {
    while (true) {
      const affected = getNextAffectedFile(state, cancellationToken, computeHash);
      if (!affected) {
        return;
      } else if (affected === state.program) {
        return toAffectedFileResult(state, state.program.getSemanticDiagnostics(undefined, cancellationToken), affected);
      }
      if (kind === BuilderProgramKind.EmitAndSemanticDiagnosticsBuilderProgram) {
        addToAffectedFilesPendingEmit(state, (affected as SourceFile).resolvedPath, BuilderFileEmit.Full);
      }
      if (ignoreSourceFile && ignoreSourceFile(affected as SourceFile)) {
        doneWithAffectedFile(state, affected);
        continue;
      }
      return toAffectedFileResult(state, getSemanticDiagnosticsOfFile(state, affected as SourceFile, cancellationToken), affected);
    }
  }
  function getSemanticDiagnostics(sourceFile?: SourceFile, cancellationToken?: CancellationToken): readonly Diagnostic[] {
    assertSourceFileOkWithoutNextAffectedCall(state, sourceFile);
    const compilerOptions = Debug.checkDefined(state.program).getCompilerOptions();
    if (compilerOptions.outFile || compilerOptions.out) {
      assert(!state.semanticDiagnosticsPerFile);
      return Debug.checkDefined(state.program).getSemanticDiagnostics(sourceFile, cancellationToken);
    }
    if (sourceFile) return getSemanticDiagnosticsOfFile(state, sourceFile, cancellationToken);
    while (getSemanticDiagnosticsOfNextAffectedFile(cancellationToken)) {}
    let diagnostics: Diagnostic[] | undefined;
    for (const sourceFile of Debug.checkDefined(state.program).getSourceFiles()) {
      diagnostics = addRange(diagnostics, getSemanticDiagnosticsOfFile(state, sourceFile, cancellationToken));
    }
    return diagnostics || emptyArray;
  }
}
function addToAffectedFilesPendingEmit(state: BuilderProgramState, affectedFilePendingEmit: Path, kind: BuilderFileEmit) {
  if (!state.affectedFilesPendingEmit) state.affectedFilesPendingEmit = [];
  if (!state.affectedFilesPendingEmitKind) state.affectedFilesPendingEmitKind = new QMap();
  const existingKind = state.affectedFilesPendingEmitKind.get(affectedFilePendingEmit);
  state.affectedFilesPendingEmit.push(affectedFilePendingEmit);
  state.affectedFilesPendingEmitKind.set(affectedFilePendingEmit, existingKind || kind);
  if (state.affectedFilesPendingEmitIndex === undefined) {
    state.affectedFilesPendingEmitIndex = 0;
  }
}
function getMapOfReferencedSet(mapLike: MapLike<readonly string[]> | undefined, toPath: (path: string) => Path): ReadonlyMap<BuilderState.ReferencedSet> | undefined {
  if (!mapLike) return;
  const map = new QMap<BuilderState.ReferencedSet>();
  for (const key in mapLike) {
    if (hasProperty(mapLike, key)) {
      map.set(toPath(key), qu.arrayToSet(mapLike[key], toPath));
    }
  }
  return map;
}
export function createBuildProgramUsingProgramBuildInfo(program: ProgramBuildInfo, buildInfoPath: string, host: ReadBuildProgramHost): EmitAndSemanticDiagnosticsBuilderProgram {
  const buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(buildInfoPath, host.getCurrentDirectory()));
  const getCanonicalFileName = createGetCanonicalFileName(host.useCaseSensitiveFileNames());
  const fileInfos = new QMap<BuilderState.FileInfo>();
  for (const key in program.fileInfos) {
    if (hasProperty(program.fileInfos, key)) {
      fileInfos.set(toPath(key), program.fileInfos[key]);
    }
  }
  const state: ReusableBuilderProgramState = {
    fileInfos,
    compilerOptions: convertToOptionsWithAbsolutePaths(program.options, toAbsolutePath),
    referencedMap: getMapOfReferencedSet(program.referencedMap, toPath),
    exportedModulesMap: getMapOfReferencedSet(program.exportedModulesMap, toPath),
    semanticDiagnosticsPerFile:
      program.semanticDiagnosticsPerFile &&
      arrayToMap(
        program.semanticDiagnosticsPerFile,
        (value) => toPath(isString(value) ? value : value[0]),
        (value) => (isString(value) ? emptyArray : value[1])
      ),
    hasReusableDiagnostic: true,
  };
  return {
    getState: () => state,
    backupState: noop,
    restoreState: noop,
    getProgram: notImplemented,
    getProgramOrUndefined: () => undefined,
    releaseProgram: noop,
    getCompilerOptions: () => state.compilerOptions,
    getSourceFile: notImplemented,
    getSourceFiles: notImplemented,
    getOptionsDiagnostics: notImplemented,
    getGlobalDiagnostics: notImplemented,
    getConfigFileParsingDiagnostics: notImplemented,
    getSyntacticDiagnostics: notImplemented,
    getDeclarationDiagnostics: notImplemented,
    getSemanticDiagnostics: notImplemented,
    emit: notImplemented,
    getAllDependencies: notImplemented,
    getCurrentDirectory: notImplemented,
    emitNextAffectedFile: notImplemented,
    getSemanticDiagnosticsOfNextAffectedFile: notImplemented,
    close: noop,
  };
  function toPath(path: string) {
    return qnr.toPath(path, buildInfoDirectory, getCanonicalFileName);
  }
  function toAbsolutePath(path: string) {
    return getNormalizedAbsolutePath(path, buildInfoDirectory);
  }
}
export function createRedirectedBuilderProgram(state: { program: Program | undefined; compilerOptions: CompilerOptions }, configFileParsingDiagnostics: readonly Diagnostic[]): BuilderProgram {
  return {
    getState: notImplemented,
    backupState: noop,
    restoreState: noop,
    getProgram,
    getProgramOrUndefined: () => state.program,
    releaseProgram: () => (state.program = undefined),
    getCompilerOptions: () => state.compilerOptions,
    getSourceFile: (fileName) => getProgram().getSourceFile(fileName),
    getSourceFiles: () => getProgram().getSourceFiles(),
    getOptionsDiagnostics: (cancellationToken) => getProgram().getOptionsDiagnostics(cancellationToken),
    getGlobalDiagnostics: (cancellationToken) => getProgram().getGlobalDiagnostics(cancellationToken),
    getConfigFileParsingDiagnostics: () => configFileParsingDiagnostics,
    getSyntacticDiagnostics: (sourceFile, cancellationToken) => getProgram().getSyntacticDiagnostics(sourceFile, cancellationToken),
    getDeclarationDiagnostics: (sourceFile, cancellationToken) => getProgram().getDeclarationDiagnostics(sourceFile, cancellationToken),
    getSemanticDiagnostics: (sourceFile, cancellationToken) => getProgram().getSemanticDiagnostics(sourceFile, cancellationToken),
    emit: (sourceFile, writeFile, cancellationToken, emitOnlyDts, customTransformers) => getProgram().emit(sourceFile, writeFile, cancellationToken, emitOnlyDts, customTransformers),
    getAllDependencies: notImplemented,
    getCurrentDirectory: () => getProgram().getCurrentDirectory(),
    close: noop,
  };
  function getProgram() {
    return Debug.checkDefined(state.program);
  }
}
export interface EmitOutput {
  outputFiles: OutputFile[];
  emitSkipped: boolean;
  diagnostics: readonly Diagnostic[];
  exportedModulesFromDeclarationEmit?: ExportedModulesFromDeclarationEmit;
}
export interface OutputFile {
  name: string;
  writeByteOrderMark: boolean;
  text: string;
}
export function getFileEmitOutput(
  program: Program,
  sourceFile: SourceFile,
  emitOnlyDtsFiles: boolean,
  cancellationToken?: CancellationToken,
  customTransformers?: CustomTransformers,
  forceDtsEmit?: boolean
): EmitOutput {
  const outputFiles: OutputFile[] = [];
  const { emitSkipped, diagnostics, exportedModulesFromDeclarationEmit } = program.emit(sourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers, forceDtsEmit);
  return { outputFiles, emitSkipped, diagnostics, exportedModulesFromDeclarationEmit };
  function writeFile(fileName: string, text: string, writeByteOrderMark: boolean) {
    outputFiles.push({ name: fileName, writeByteOrderMark, text });
  }
}
export interface ReusableBuilderState {
  fileInfos: QReadonlyMap<BuilderState.FileInfo>;
  readonly referencedMap?: QReadonlyMap<BuilderState.ReferencedSet> | undefined;
  readonly exportedModulesMap?: QReadonlyMap<BuilderState.ReferencedSet> | undefined;
}
export interface BuilderState {
  fileInfos: QMap<BuilderState.FileInfo>;
  readonly referencedMap: QReadonlyMap<BuilderState.ReferencedSet> | undefined;
  readonly exportedModulesMap: QMap<BuilderState.ReferencedSet> | undefined;
  hasCalledUpdateShapeSignature: QMap<true>;
  allFilesExcludingDefaultLibraryFile?: readonly SourceFile[];
  allFileNames?: readonly string[];
}
export namespace BuilderState {
  export interface FileInfo {
    readonly version: string;
    signature: string | undefined;
    affectsGlobalScope: boolean;
  }
  export type ReferencedSet = QReadonlyMap<true>;
  export type ComputeHash = (data: string) => string;
  export type ComputingExportedModulesMap = QMap<ReferencedSet | false>;
  function getReferencedFileFromImportedModuleSymbol(symbol: Symbol) {
    if (symbol.declarations && symbol.declarations[0]) {
      const declarationSourceFile = symbol.declarations[0].sourceFile;
      return declarationSourceFile && declarationSourceFile.resolvedPath;
    }
    return;
  }
  function getReferencedFileFromImportLiteral(checker: TypeChecker, importName: StringLiteralLike) {
    const symbol = checker.getSymbolAtLocation(importName);
    return symbol && getReferencedFileFromImportedModuleSymbol(symbol);
  }
  function getReferencedFileFromFileName(program: Program, fileName: string, sourceFileDirectory: Path, getCanonicalFileName: GetCanonicalFileName): Path {
    return toPath(program.getProjectReferenceRedirect(fileName) || fileName, sourceFileDirectory, getCanonicalFileName);
  }
  function getReferencedFiles(program: Program, sourceFile: SourceFile, getCanonicalFileName: GetCanonicalFileName): QMap<true> | undefined {
    let referencedFiles: QMap<true> | undefined;
    if (sourceFile.imports && sourceFile.imports.length > 0) {
      const checker: TypeChecker = program.getTypeChecker();
      for (const importName of sourceFile.imports) {
        const declarationSourceFilePath = getReferencedFileFromImportLiteral(checker, importName);
        if (declarationSourceFilePath) addReferencedFile(declarationSourceFilePath);
      }
    }
    const sourceFileDirectory = getDirectoryPath(sourceFile.resolvedPath);
    if (sourceFile.referencedFiles && sourceFile.referencedFiles.length > 0) {
      for (const referencedFile of sourceFile.referencedFiles) {
        const referencedPath = getReferencedFileFromFileName(program, referencedFile.fileName, sourceFileDirectory, getCanonicalFileName);
        addReferencedFile(referencedPath);
      }
    }
    if (sourceFile.resolvedTypeReferenceDirectiveNames) {
      sourceFile.resolvedTypeReferenceDirectiveNames.forEach((resolvedTypeReferenceDirective) => {
        if (!resolvedTypeReferenceDirective) return;
        const fileName = resolvedTypeReferenceDirective.resolvedFileName!;
        const typeFilePath = getReferencedFileFromFileName(program, fileName, sourceFileDirectory, getCanonicalFileName);
        addReferencedFile(typeFilePath);
      });
    }
    if (sourceFile.moduleAugmentations.length) {
      const checker = program.getTypeChecker();
      for (const moduleName of sourceFile.moduleAugmentations) {
        if (!qc.is.kind(qc.StringLiteral, moduleName)) continue;
        const symbol = checker.getSymbolAtLocation(moduleName);
        if (!symbol) continue;
        addReferenceFromAmbientModule(symbol);
      }
    }
    for (const ambientModule of program.getTypeChecker().getAmbientModules()) {
      if (ambientModule.declarations.length > 1) addReferenceFromAmbientModule(ambientModule);
    }
    return referencedFiles;
    function addReferenceFromAmbientModule(symbol: Symbol) {
      for (const declaration of symbol.declarations) {
        const declarationSourceFile = declaration.sourceFile;
        if (declarationSourceFile && declarationSourceFile !== sourceFile) addReferencedFile(declarationSourceFile.resolvedPath);
      }
    }
    function addReferencedFile(referencedPath: Path) {
      if (!referencedFiles) referencedFiles = new QMap<true>();
      referencedFiles.set(referencedPath, true);
    }
  }
  export function canReuseOldState(newReferencedMap: QReadonlyMap<ReferencedSet> | undefined, oldState: Readonly<ReusableBuilderState> | undefined) {
    return oldState && !oldState.referencedMap === !newReferencedMap;
  }
  export function create(newProgram: Program, getCanonicalFileName: GetCanonicalFileName, oldState?: Readonly<ReusableBuilderState>): BuilderState {
    const fileInfos = new QMap<FileInfo>();
    const referencedMap = newProgram.getCompilerOptions().module !== ModuleKind.None ? new QMap<ReferencedSet>() : undefined;
    const exportedModulesMap = referencedMap ? new QMap<ReferencedSet>() : undefined;
    const hasCalledUpdateShapeSignature = new QMap<true>();
    const useOldState = canReuseOldState(referencedMap, oldState);
    for (const sourceFile of newProgram.getSourceFiles()) {
      const version = Debug.checkDefined(sourceFile.version, 'Program intended to be used with Builder should have source files with versions set');
      const oldInfo = useOldState ? oldState!.fileInfos.get(sourceFile.resolvedPath) : undefined;
      if (referencedMap) {
        const newReferences = getReferencedFiles(newProgram, sourceFile, getCanonicalFileName);
        if (newReferences) referencedMap.set(sourceFile.resolvedPath, newReferences);
        if (useOldState) {
          const exportedModules = oldState!.exportedModulesMap!.get(sourceFile.resolvedPath);
          if (exportedModules) exportedModulesMap!.set(sourceFile.resolvedPath, exportedModules);
        }
      }
      fileInfos.set(sourceFile.resolvedPath, {
        version,
        signature: oldInfo && oldInfo.signature,
        affectsGlobalScope: isFileAffectingGlobalScope(sourceFile),
      });
    }
    return {
      fileInfos,
      referencedMap,
      exportedModulesMap,
      hasCalledUpdateShapeSignature,
    };
  }
  export function releaseCache(state: BuilderState) {
    state.allFilesExcludingDefaultLibraryFile = undefined;
    state.allFileNames = undefined;
  }
  export function clone(state: Readonly<BuilderState>): BuilderState {
    const fileInfos = new QMap<FileInfo>();
    state.fileInfos.forEach((value, key) => {
      fileInfos.set(key, { ...value });
    });
    return {
      fileInfos,
      referencedMap: cloneMapOrUndefined(state.referencedMap),
      exportedModulesMap: cloneMapOrUndefined(state.exportedModulesMap),
      hasCalledUpdateShapeSignature: cloneMap(state.hasCalledUpdateShapeSignature),
    };
  }
  export function getFilesAffectedBy(
    state: BuilderState,
    programOfThisState: Program,
    path: Path,
    cancellationToken: CancellationToken | undefined,
    computeHash: ComputeHash,
    cacheToUpdateSignature?: QMap<string>,
    exportedModulesMapCache?: ComputingExportedModulesMap
  ): readonly SourceFile[] {
    const signatureCache = cacheToUpdateSignature || new QMap();
    const sourceFile = programOfThisState.getSourceFileByPath(path);
    if (!sourceFile) return empty;
    if (!updateShapeSignature(state, programOfThisState, sourceFile, signatureCache, cancellationToken, computeHash, exportedModulesMapCache)) return [sourceFile];
    const result = (state.referencedMap ? getFilesAffectedByUpdatedShapeWhenModuleEmit : getFilesAffectedByUpdatedShapeWhenNonModuleEmit)(
      state,
      programOfThisState,
      sourceFile,
      signatureCache,
      cancellationToken,
      computeHash,
      exportedModulesMapCache
    );
    if (!cacheToUpdateSignature) updateSignaturesFromCache(state, signatureCache);
    return result;
  }
  export function updateSignaturesFromCache(state: BuilderState, signatureCache: QMap<string>) {
    signatureCache.forEach((signature, path) => updateSignatureOfFile(state, signature, path as Path));
  }
  export function updateSignatureOfFile(state: BuilderState, signature: string | undefined, path: Path) {
    state.fileInfos.get(path)!.signature = signature;
    state.hasCalledUpdateShapeSignature.set(path, true);
  }
  export function updateShapeSignature(
    state: Readonly<BuilderState>,
    programOfThisState: Program,
    sourceFile: SourceFile,
    cacheToUpdateSignature: QMap<string>,
    cancellationToken: CancellationToken | undefined,
    computeHash: ComputeHash,
    exportedModulesMapCache?: ComputingExportedModulesMap
  ) {
    assert(!!sourceFile);
    assert(!exportedModulesMapCache || !!state.exportedModulesMap, 'Compute visible to outside map only if visibleToOutsideReferencedMap present in the state');
    if (state.hasCalledUpdateShapeSignature.has(sourceFile.resolvedPath) || cacheToUpdateSignature.has(sourceFile.resolvedPath)) return false;
    const info = state.fileInfos.get(sourceFile.resolvedPath);
    if (!info) return fail();
    const prevSignature = info.signature;
    let latestSignature: string;
    if (sourceFile.isDeclarationFile) {
      latestSignature = sourceFile.version;
      if (exportedModulesMapCache && latestSignature !== prevSignature) {
        const references = state.referencedMap ? state.referencedMap.get(sourceFile.resolvedPath) : undefined;
        exportedModulesMapCache.set(sourceFile.resolvedPath, references || false);
      }
    } else {
      const emitOutput = getFileEmitOutput(programOfThisState, sourceFile, true);
      const firstDts =
        emitOutput.outputFiles && programOfThisState.getCompilerOptions().declarationMap
          ? emitOutput.outputFiles.length > 1
            ? emitOutput.outputFiles[1]
            : undefined
          : emitOutput.outputFiles.length > 0
          ? emitOutput.outputFiles[0]
          : undefined;
      if (firstDts) {
        assert(
          fileExtensionIs(firstDts.name, Extension.Dts),
          'File extension for signature expected to be dts',
          () => `Found: ${getAnyExtensionFromPath(firstDts.name)} for ${firstDts.name}:: All output files: ${JSON.stringify(emitOutput.outputFiles.map((f) => f.name))}`
        );
        latestSignature = computeHash(firstDts.text);
        if (exportedModulesMapCache && latestSignature !== prevSignature) updateExportedModules(sourceFile, emitOutput.exportedModulesFromDeclarationEmit, exportedModulesMapCache);
      } else latestSignature = prevSignature!;
    }
    cacheToUpdateSignature.set(sourceFile.resolvedPath, latestSignature);
    return !prevSignature || latestSignature !== prevSignature;
  }
  function updateExportedModules(sourceFile: SourceFile, exportedModulesFromDeclarationEmit: ExportedModulesFromDeclarationEmit | undefined, exportedModulesMapCache: ComputingExportedModulesMap) {
    if (!exportedModulesFromDeclarationEmit) {
      exportedModulesMapCache.set(sourceFile.resolvedPath, false);
      return;
    }
    let exportedModules: QMap<true> | undefined;
    exportedModulesFromDeclarationEmit.forEach((symbol) => addExportedModule(getReferencedFileFromImportedModuleSymbol(symbol)));
    exportedModulesMapCache.set(sourceFile.resolvedPath, exportedModules || false);
    function addExportedModule(exportedModulePath: Path | undefined) {
      if (exportedModulePath) {
        if (!exportedModules) exportedModules = new QMap<true>();
        exportedModules.set(exportedModulePath, true);
      }
    }
  }
  export function updateExportedFilesMapFromCache(state: BuilderState, exportedModulesMapCache: ComputingExportedModulesMap | undefined) {
    if (exportedModulesMapCache) {
      assert(!!state.exportedModulesMap);
      exportedModulesMapCache.forEach((exportedModules, path) => {
        if (exportedModules) state.exportedModulesMap!.set(path, exportedModules);
        else state.exportedModulesMap!.delete(path);
      });
    }
  }
  export function getAllDependencies(state: BuilderState, programOfThisState: Program, sourceFile: SourceFile): readonly string[] {
    const compilerOptions = programOfThisState.getCompilerOptions();
    if (compilerOptions.outFile || compilerOptions.out) return getAllFileNames(state, programOfThisState);
    if (!state.referencedMap || isFileAffectingGlobalScope(sourceFile)) return getAllFileNames(state, programOfThisState);
    const seenMap = new QMap<true>();
    const queue = [sourceFile.resolvedPath];
    while (queue.length) {
      const path = queue.pop()!;
      if (!seenMap.has(path)) {
        seenMap.set(path, true);
        const references = state.referencedMap.get(path);
        if (references) {
          const iterator = references.keys();
          for (let iterResult = iterator.next(); !iterResult.done; iterResult = iterator.next()) {
            queue.push(iterResult.value as Path);
          }
        }
      }
    }
    return arrayFrom(
      mapDefinedIterator(seenMap.keys(), (path) => {
        const file = programOfThisState.getSourceFileByPath(path as Path);
        return file ? file.fileName : path;
      })
    );
  }
  function getAllFileNames(state: BuilderState, programOfThisState: Program): readonly string[] {
    if (!state.allFileNames) {
      const sourceFiles = programOfThisState.getSourceFiles();
      state.allFileNames = sourceFiles === empty ? empty : sourceFiles.map((file) => file.fileName);
    }
    return state.allFileNames;
  }
  export function getReferencedByPaths(state: Readonly<BuilderState>, referencedFilePath: Path) {
    return arrayFrom(mapDefinedIterator(state.referencedMap!.entries(), ([filePath, referencesInFile]) => (referencesInFile.has(referencedFilePath) ? (filePath as Path) : undefined)));
  }
  function containsOnlyAmbientModules(sourceFile: SourceFile) {
    for (const statement of sourceFile.statements) {
      if (!qc.is.moduleWithStringLiteralName(statement)) return false;
    }
    return true;
  }
  function containsGlobalScopeAugmentation(sourceFile: SourceFile) {
    return some(sourceFile.moduleAugmentations, (augmentation) => qf.is.globalScopeAugmentation(augmentation.parent as ModuleDeclaration));
  }
  function isFileAffectingGlobalScope(sourceFile: SourceFile) {
    return containsGlobalScopeAugmentation(sourceFile) || (!qc.is.externalModule(sourceFile) && !containsOnlyAmbientModules(sourceFile));
  }
  export function getAllFilesExcludingDefaultLibraryFile(state: BuilderState, programOfThisState: Program, firstSourceFile: SourceFile | undefined): readonly SourceFile[] {
    if (state.allFilesExcludingDefaultLibraryFile) return state.allFilesExcludingDefaultLibraryFile;
    let result: SourceFile[] | undefined;
    if (firstSourceFile) addSourceFile(firstSourceFile);
    for (const sourceFile of programOfThisState.getSourceFiles()) {
      if (sourceFile !== firstSourceFile) addSourceFile(sourceFile);
    }
    state.allFilesExcludingDefaultLibraryFile = result || empty;
    return state.allFilesExcludingDefaultLibraryFile;
    function addSourceFile(sourceFile: SourceFile) {
      if (!programOfThisState.isSourceFileDefaultLibrary(sourceFile)) (result || (result = [])).push(sourceFile);
    }
  }
  function getFilesAffectedByUpdatedShapeWhenNonModuleEmit(state: BuilderState, programOfThisState: Program, sourceFileWithUpdatedShape: SourceFile) {
    const compilerOptions = programOfThisState.getCompilerOptions();
    if (compilerOptions && (compilerOptions.out || compilerOptions.outFile)) return [sourceFileWithUpdatedShape];
    return getAllFilesExcludingDefaultLibraryFile(state, programOfThisState, sourceFileWithUpdatedShape);
  }
  function getFilesAffectedByUpdatedShapeWhenModuleEmit(
    state: BuilderState,
    programOfThisState: Program,
    sourceFileWithUpdatedShape: SourceFile,
    cacheToUpdateSignature: QMap<string>,
    cancellationToken: CancellationToken | undefined,
    computeHash: ComputeHash | undefined,
    exportedModulesMapCache: ComputingExportedModulesMap | undefined
  ) {
    if (isFileAffectingGlobalScope(sourceFileWithUpdatedShape)) return getAllFilesExcludingDefaultLibraryFile(state, programOfThisState, sourceFileWithUpdatedShape);
    const compilerOptions = programOfThisState.getCompilerOptions();
    if (compilerOptions && (compilerOptions.isolatedModules || compilerOptions.out || compilerOptions.outFile)) return [sourceFileWithUpdatedShape];
    const seenFileNamesMap = new QMap<SourceFile>();
    seenFileNamesMap.set(sourceFileWithUpdatedShape.resolvedPath, sourceFileWithUpdatedShape);
    const queue = getReferencedByPaths(state, sourceFileWithUpdatedShape.resolvedPath);
    while (queue.length > 0) {
      const currentPath = queue.pop()!;
      if (!seenFileNamesMap.has(currentPath)) {
        const currentSourceFile = programOfThisState.getSourceFileByPath(currentPath)!;
        seenFileNamesMap.set(currentPath, currentSourceFile);
        if (currentSourceFile && updateShapeSignature(state, programOfThisState, currentSourceFile, cacheToUpdateSignature, cancellationToken, computeHash!, exportedModulesMapCache)) {
          queue.push(...getReferencedByPaths(state, currentSourceFile.resolvedPath));
        }
      }
    }
    return arrayFrom(mapDefinedIterator(seenFileNamesMap.values(), (value) => value));
  }
}
export function cloneMapOrUndefined<T>(map: QReadonlyMap<T> | undefined) {
  return map ? cloneMap(map) : undefined;
}
