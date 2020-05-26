import * as qt from './types';

export interface EmitOutput {
  outputFiles: OutputFile[];
  emitSkipped: boolean;
  diagnostics: readonly qt.Diagnostic[];
  exportedModulesFromDeclarationEmit?: qt.ExportedModulesFromDeclarationEmit;
}

export interface OutputFile {
  name: string;
  writeByteOrderMark: boolean;
  text: string;
}
