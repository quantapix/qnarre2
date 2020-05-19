export namespace fix {
  export const annotateWithTypeFromJSDoc = 'annotateWithTypeFromJSDoc';
  export const constructorForDerivedNeedSuperCall = 'constructorForDerivedNeedSuperCall';
  export const extendsInterfaceBecomesImplements = 'extendsInterfaceBecomesImplements';
  export const awaitInSyncFunction = 'fixAwaitInSyncFunction';
  export const classIncorrectlyImplementsInterface =
    'fixClassIncorrectlyImplementsInterface';
  export const unreachableCode = 'fixUnreachableCode';
  export const unusedIdentifier = 'unusedIdentifier';
  export const forgottenThisPropertyAccess = 'forgottenThisPropertyAccess';
  export const spelling = 'spelling';
  export const fixImport = 'import';
  export const addMissingAwait = 'addMissingAwait';
}

export namespace codes {
  export const variableDeclaredButNeverUsed = 6133;
  export const propertyDeclaretedButNeverUsed = 6138;
  export const allImportsAreUnused = 6192;
  export const unreachableCode = 7027;
  export const unusedLabel = 7028;
  export const fallThroughCaseInSwitch = 7029;
  export const notAllCodePathsReturnAValue = 7030;
  export const incorrectlyImplementsInterface = 2420;
  export const cannotFindName = [2552, 2304];
  export const extendsShouldBeImplements = 2689;
  export const asyncOnlyAllowedInAsyncFunctions = 1308;
}
