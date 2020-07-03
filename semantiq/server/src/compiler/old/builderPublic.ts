namespace core {
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
}
