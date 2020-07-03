namespace core {
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
        const declarationSourceFile = Node.get.sourceFileOf(symbol.declarations[0]);
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
          if (!Node.is.kind(StringLiteral, moduleName)) continue;
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
          const declarationSourceFile = Node.get.sourceFileOf(declaration);
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
        if (!Node.is.moduleWithStringLiteralName(statement)) return false;
      }
      return true;
    }
    function containsGlobalScopeAugmentation(sourceFile: SourceFile) {
      return some(sourceFile.moduleAugmentations, (augmentation) => isGlobalScopeAugmentation(augmentation.parent as ModuleDeclaration));
    }
    function isFileAffectingGlobalScope(sourceFile: SourceFile) {
      return containsGlobalScopeAugmentation(sourceFile) || (!qp_isExternalModule(sourceFile) && !containsOnlyAmbientModules(sourceFile));
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
}
