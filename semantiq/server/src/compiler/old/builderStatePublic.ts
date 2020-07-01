namespace core {
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
}
