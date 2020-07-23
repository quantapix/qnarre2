import * as qc from './core';
import { Node } from './type';
import * as qt from './type';
import * as qu from './util';
import { Syntax } from './syntax';
import * as qy from './syntax';
const brackets = createBracketsMap();
const syntheticParent: TextRange = { pos: -1, end: -1 };
export function isBuildInfoFile(file: string) {
  return fileExtensionIs(file, Extension.TsBuildInfo);
}
export function forEachEmittedFile<T>(
  host: EmitHost,
  action: (emitFileNames: EmitFileNames, sourceFileOrBundle: SourceFile | Bundle | undefined) => T,
  sourceFilesOrTargetSourceFile?: readonly SourceFile[] | SourceFile,
  forceDtsEmit = false,
  onlyBuildInfo?: boolean,
  includeBuildInfo?: boolean
) {
  const sourceFiles = isArray(sourceFilesOrTargetSourceFile) ? sourceFilesOrTargetSourceFile : getSourceFilesToEmit(host, sourceFilesOrTargetSourceFile, forceDtsEmit);
  const options = host.getCompilerOptions();
  if (options.outFile || options.out) {
    const prepends = host.getPrependNodes();
    if (sourceFiles.length || prepends.length) {
      const bundle = new qc.Bundle(sourceFiles, prepends);
      const result = action(getOutputPathsFor(bundle, host, forceDtsEmit), bundle);
      if (result) return result;
    }
  } else {
    if (!onlyBuildInfo) {
      for (const sourceFile of sourceFiles) {
        const result = action(getOutputPathsFor(sourceFile, host, forceDtsEmit), sourceFile);
        if (result) return result;
      }
    }
    if (includeBuildInfo) {
      const buildInfoPath = getTsBuildInfoEmitOutputFilePath(host.getCompilerOptions());
      if (buildInfoPath) return action({ buildInfoPath }, undefined);
    }
  }
}
export function getTsBuildInfoEmitOutputFilePath(options: CompilerOptions) {
  const configFile = options.configFilePath;
  if (!isIncrementalCompilation(options)) return;
  if (options.tsBuildInfoFile) return options.tsBuildInfoFile;
  const outPath = options.outFile || options.out;
  let buildInfoExtensionLess: string;
  if (outPath) {
    buildInfoExtensionLess = removeFileExtension(outPath);
  } else {
    if (!configFile) return;
    const configFileExtensionLess = removeFileExtension(configFile);
    buildInfoExtensionLess = options.outDir
      ? options.rootDir
        ? resolvePath(options.outDir, getRelativePathFromDirectory(options.rootDir, configFileExtensionLess, true))
        : combinePaths(options.outDir, getBaseFileName(configFileExtensionLess))
      : configFileExtensionLess;
  }
  return buildInfoExtensionLess + Extension.TsBuildInfo;
}
export function getOutputPathsForBundle(options: CompilerOptions, forceDtsPaths: boolean): EmitFileNames {
  const outPath = options.outFile || options.out!;
  const jsFilePath = options.emitDeclarationOnly ? undefined : outPath;
  const sourceMapFilePath = jsFilePath && getSourceMapFilePath(jsFilePath, options);
  const declarationFilePath = forceDtsPaths || getEmitDeclarations(options) ? removeFileExtension(outPath) + Extension.Dts : undefined;
  const declarationMapPath = declarationFilePath && getAreDeclarationMapsEnabled(options) ? declarationFilePath + '.map' : undefined;
  const buildInfoPath = getTsBuildInfoEmitOutputFilePath(options);
  return { jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath };
}
export function getOutputPathsFor(sourceFile: SourceFile | Bundle, host: EmitHost, forceDtsPaths: boolean): EmitFileNames {
  const options = host.getCompilerOptions();
  if (sourceFile.kind === Syntax.Bundle) return getOutputPathsForBundle(options, forceDtsPaths);
  else {
    const ownOutputFilePath = getOwnEmitOutputFilePath(sourceFile.fileName, host, getOutputExtension(sourceFile, options));
    const isJsonFile = qc.is.jsonSourceFile(sourceFile);
    const isJsonEmittedToSameLocation = isJsonFile && comparePaths(sourceFile.fileName, ownOutputFilePath, host.getCurrentDirectory(), !host.useCaseSensitiveFileNames()) === Comparison.EqualTo;
    const jsFilePath = options.emitDeclarationOnly || isJsonEmittedToSameLocation ? undefined : ownOutputFilePath;
    const sourceMapFilePath = !jsFilePath || qc.is.jsonSourceFile(sourceFile) ? undefined : getSourceMapFilePath(jsFilePath, options);
    const declarationFilePath = forceDtsPaths || (getEmitDeclarations(options) && !isJsonFile) ? getDeclarationEmitOutputFilePath(sourceFile.fileName, host) : undefined;
    const declarationMapPath = declarationFilePath && getAreDeclarationMapsEnabled(options) ? declarationFilePath + '.map' : undefined;
    return { jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath: undefined };
  }
}
function getSourceMapFilePath(jsFilePath: string, options: CompilerOptions) {
  return options.sourceMap && !options.inlineSourceMap ? jsFilePath + '.map' : undefined;
}
export function getOutputExtension(sourceFile: SourceFile, options: CompilerOptions): Extension {
  if (qc.is.jsonSourceFile(sourceFile)) return Extension.Json;
  if (options.jsx === JsxEmit.Preserve) {
    if (isSourceFileJS(sourceFile)) {
      if (fileExtensionIs(sourceFile.fileName, Extension.Jsx)) return Extension.Jsx;
    } else if (sourceFile.languageVariant === LanguageVariant.JSX) {
      return Extension.Jsx;
    }
  }
  return Extension.Js;
}
function rootDirOfOptions(configFile: ParsedCommandLine) {
  return configFile.options.rootDir || getDirectoryPath(Debug.checkDefined(configFile.options.configFilePath));
}
function getOutputPathWithoutChangingExt(inputFileName: string, configFile: ParsedCommandLine, ignoreCase: boolean, outputDir: string | undefined) {
  return outputDir ? resolvePath(outputDir, getRelativePathFromDirectory(rootDirOfOptions(configFile), inputFileName, ignoreCase)) : inputFileName;
}
export function getOutputDeclarationFileName(inputFileName: string, configFile: ParsedCommandLine, ignoreCase: boolean) {
  qu.assert(!fileExtensionIs(inputFileName, Extension.Dts) && !fileExtensionIs(inputFileName, Extension.Json));
  return changeExtension(getOutputPathWithoutChangingExt(inputFileName, configFile, ignoreCase, configFile.options.declarationDir || configFile.options.outDir), Extension.Dts);
}
function getOutputJSFileName(inputFileName: string, configFile: ParsedCommandLine, ignoreCase: boolean) {
  if (configFile.options.emitDeclarationOnly) return;
  const isJsonFile = fileExtensionIs(inputFileName, Extension.Json);
  const outputFileName = changeExtension(
    getOutputPathWithoutChangingExt(inputFileName, configFile, ignoreCase, configFile.options.outDir),
    isJsonFile ? Extension.Json : fileExtensionIs(inputFileName, Extension.Tsx) && configFile.options.jsx === JsxEmit.Preserve ? Extension.Jsx : Extension.Js
  );
  return !isJsonFile || comparePaths(inputFileName, outputFileName, Debug.checkDefined(configFile.options.configFilePath), ignoreCase) !== Comparison.EqualTo ? outputFileName : undefined;
}
function createAddOutput() {
  let outputs: string[] | undefined;
  return { addOutput, getOutputs };
  function addOutput(path: string | undefined) {
    if (path) {
      (outputs || (outputs = [])).push(path);
    }
  }
  function getOutputs(): readonly string[] {
    return outputs || emptyArray;
  }
}
function getSingleOutputFileNames(configFile: ParsedCommandLine, addOutput: ReturnType<typeof createAddOutput>['addOutput']) {
  const { jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath } = getOutputPathsForBundle(configFile.options, false);
  addOutput(jsFilePath);
  addOutput(sourceMapFilePath);
  addOutput(declarationFilePath);
  addOutput(declarationMapPath);
  addOutput(buildInfoPath);
}
function getOwnOutputFileNames(configFile: ParsedCommandLine, inputFileName: string, ignoreCase: boolean, addOutput: ReturnType<typeof createAddOutput>['addOutput']) {
  if (fileExtensionIs(inputFileName, Extension.Dts)) return;
  const js = getOutputJSFileName(inputFileName, configFile, ignoreCase);
  addOutput(js);
  if (fileExtensionIs(inputFileName, Extension.Json)) return;
  if (js && configFile.options.sourceMap) {
    addOutput(`${js}.map`);
  }
  if (getEmitDeclarations(configFile.options)) {
    const dts = getOutputDeclarationFileName(inputFileName, configFile, ignoreCase);
    addOutput(dts);
    if (configFile.options.declarationMap) {
      addOutput(`${dts}.map`);
    }
  }
}
export function getAllProjectOutputs(configFile: ParsedCommandLine, ignoreCase: boolean): readonly string[] {
  const { addOutput, getOutputs } = createAddOutput();
  if (configFile.options.outFile || configFile.options.out) {
    getSingleOutputFileNames(configFile, addOutput);
  } else {
    for (const inputFileName of configFile.fileNames) {
      getOwnOutputFileNames(configFile, inputFileName, ignoreCase, addOutput);
    }
    addOutput(getTsBuildInfoEmitOutputFilePath(configFile.options));
  }
  return getOutputs();
}
export function getOutputFileNames(commandLine: ParsedCommandLine, inputFileName: string, ignoreCase: boolean): readonly string[] {
  inputFileName = normalizePath(inputFileName);
  qu.assert(contains(commandLine.fileNames, inputFileName), `Expected fileName to be present in command line`);
  const { addOutput, getOutputs } = createAddOutput();
  if (commandLine.options.outFile || commandLine.options.out) {
    getSingleOutputFileNames(commandLine, addOutput);
  } else {
    getOwnOutputFileNames(commandLine, inputFileName, ignoreCase, addOutput);
  }
  return getOutputs();
}
export function getFirstProjectOutput(configFile: ParsedCommandLine, ignoreCase: boolean): string {
  if (configFile.options.outFile || configFile.options.out) {
    const { jsFilePath } = getOutputPathsForBundle(configFile.options, false);
    return Debug.checkDefined(jsFilePath, `project ${configFile.options.configFilePath} expected to have at least one output`);
  }
  for (const inputFileName of configFile.fileNames) {
    if (fileExtensionIs(inputFileName, Extension.Dts)) continue;
    const jsFilePath = getOutputJSFileName(inputFileName, configFile, ignoreCase);
    if (jsFilePath) return jsFilePath;
    if (fileExtensionIs(inputFileName, Extension.Json)) continue;
    if (getEmitDeclarations(configFile.options)) return getOutputDeclarationFileName(inputFileName, configFile, ignoreCase);
  }
  const buildInfoPath = getTsBuildInfoEmitOutputFilePath(configFile.options);
  if (buildInfoPath) return buildInfoPath;
  return fail(`project ${configFile.options.configFilePath} expected to have at least one output`);
}
export function emitFiles(
  resolver: EmitResolver,
  host: EmitHost,
  targetSourceFile: SourceFile | undefined,
  { scriptTransformers, declarationTransformers }: EmitTransformers,
  emitOnlyDtsFiles?: boolean,
  onlyBuildInfo?: boolean,
  forceDtsEmit?: boolean
): EmitResult {
  const compilerOptions = host.getCompilerOptions();
  const sourceMapDataList: SourceMapEmitResult[] | undefined = compilerOptions.sourceMap || compilerOptions.inlineSourceMap || getAreDeclarationMapsEnabled(compilerOptions) ? [] : undefined;
  const emittedFilesList: string[] | undefined = compilerOptions.listEmittedFiles ? [] : undefined;
  const emitterDiagnostics = createDiagnosticCollection();
  const newLine = getNewLineCharacter(compilerOptions, () => host.getNewLine());
  const writer = createTextWriter(newLine);
  const { enter, exit } = performance.createTimer('printTime', 'beforePrint', 'afterPrint');
  let bundleBuildInfo: BundleBuildInfo | undefined;
  let emitSkipped = false;
  let exportedModulesFromDeclarationEmit: ExportedModulesFromDeclarationEmit | undefined;
  enter();
  forEachEmittedFile(host, emitSourceFileOrBundle, getSourceFilesToEmit(host, targetSourceFile, forceDtsEmit), forceDtsEmit, onlyBuildInfo, !targetSourceFile);
  exit();
  return {
    emitSkipped,
    diagnostics: emitterqd.getDiagnostics(),
    emittedFiles: emittedFilesList,
    sourceMaps: sourceMapDataList,
    exportedModulesFromDeclarationEmit,
  };
  function emitSourceFileOrBundle({ jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath }: EmitFileNames, sourceFileOrBundle: SourceFile | Bundle | undefined) {
    let buildInfoDirectory: string | undefined;
    if (buildInfoPath && sourceFileOrBundle && qc.is.kind(qc.Bundle, sourceFileOrBundle)) {
      buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(buildInfoPath, host.getCurrentDirectory()));
      bundleBuildInfo = {
        commonSourceDirectory: relativeToBuildInfo(host.getCommonSourceDirectory()),
        sourceFiles: sourceFileOrBundle.sourceFiles.map((file) => relativeToBuildInfo(getNormalizedAbsolutePath(file.fileName, host.getCurrentDirectory()))),
      };
    }
    emitJsFileOrBundle(sourceFileOrBundle, jsFilePath, sourceMapFilePath, relativeToBuildInfo);
    emitDeclarationFileOrBundle(sourceFileOrBundle, declarationFilePath, declarationMapPath, relativeToBuildInfo);
    emitBuildInfo(bundleBuildInfo, buildInfoPath);
    if (!emitSkipped && emittedFilesList) {
      if (!emitOnlyDtsFiles) {
        if (jsFilePath) {
          emittedFilesList.push(jsFilePath);
        }
        if (sourceMapFilePath) {
          emittedFilesList.push(sourceMapFilePath);
        }
        if (buildInfoPath) {
          emittedFilesList.push(buildInfoPath);
        }
      }
      if (declarationFilePath) {
        emittedFilesList.push(declarationFilePath);
      }
      if (declarationMapPath) {
        emittedFilesList.push(declarationMapPath);
      }
    }
    function relativeToBuildInfo(path: string) {
      return ensurePathIsNonModuleName(getRelativePathFromDirectory(buildInfoDirectory!, path, host.getCanonicalFileName));
    }
  }
  function emitBuildInfo(bundle: BundleBuildInfo | undefined, buildInfoPath: string | undefined) {
    if (!buildInfoPath || targetSourceFile || emitSkipped) return;
    const program = host.getProgramBuildInfo();
    if (host.isEmitBlocked(buildInfoPath) || compilerOptions.noEmit) {
      emitSkipped = true;
      return;
    }
    const version = qnr.version;
    writeFile(host, emitterDiagnostics, buildInfoPath, getBuildInfoText({ bundle, program, version }), false);
  }
  function emitJsFileOrBundle(
    sourceFileOrBundle: SourceFile | Bundle | undefined,
    jsFilePath: string | undefined,
    sourceMapFilePath: string | undefined,
    relativeToBuildInfo: (path: string) => string
  ) {
    if (!sourceFileOrBundle || emitOnlyDtsFiles || !jsFilePath) {
      return;
    }
    if ((jsFilePath && host.isEmitBlocked(jsFilePath)) || compilerOptions.noEmit) {
      emitSkipped = true;
      return;
    }
    const transform = transformNodes(resolver, host, compilerOptions, [sourceFileOrBundle], scriptTransformers, false);
    const printerOptions: PrinterOptions = {
      removeComments: compilerOptions.removeComments,
      newLine: compilerOptions.newLine,
      noEmitHelpers: compilerOptions.noEmitHelpers,
      module: compilerOptions.module,
      target: compilerOptions.target,
      sourceMap: compilerOptions.sourceMap,
      inlineSourceMap: compilerOptions.inlineSourceMap,
      inlineSources: compilerOptions.inlineSources,
      extendedDiagnostics: compilerOptions.extendedDiagnostics,
      writeBundleFileInfo: !!bundleBuildInfo,
      relativeToBuildInfo,
    };
    const printer = createPrinter(printerOptions, {
      hasGlobalName: resolver.hasGlobalName,
      onEmitNode: transform.emitNodeWithNotification,
      isEmitNotificationEnabled: transform.isEmitNotificationEnabled,
      substituteNode: transform.substituteNode,
    });
    qu.assert(transform.transformed.length === 1, 'Should only see one output from the transform');
    printSourceFileOrBundle(jsFilePath, sourceMapFilePath, transform.transformed[0], printer, compilerOptions);
    transform.dispose();
    if (bundleBuildInfo) bundleBuildInfo.js = printer.bundleFileInfo;
  }
  function emitDeclarationFileOrBundle(
    sourceFileOrBundle: SourceFile | Bundle | undefined,
    declarationFilePath: string | undefined,
    declarationMapPath: string | undefined,
    relativeToBuildInfo: (path: string) => string
  ) {
    if (!sourceFileOrBundle) return;
    if (!declarationFilePath) {
      if (emitOnlyDtsFiles || compilerOptions.emitDeclarationOnly) emitSkipped = true;
      return;
    }
    const sourceFiles = qc.is.kind(qc.SourceFile, sourceFileOrBundle) ? [sourceFileOrBundle] : sourceFileOrBundle.sourceFiles;
    const filesForEmit = forceDtsEmit ? sourceFiles : filter(sourceFiles, isSourceFileNotJson);
    const inputListOrBundle =
      compilerOptions.outFile || compilerOptions.out ? [new qc.Bundle(filesForEmit, !qc.is.kind(qc.SourceFile, sourceFileOrBundle) ? sourceFileOrBundle.prepends : undefined)] : filesForEmit;
    if (emitOnlyDtsFiles && !getEmitDeclarations(compilerOptions)) {
      filesForEmit.forEach(collectLinkedAliases);
    }
    const declarationTransform = transformNodes(resolver, host, compilerOptions, inputListOrBundle, declarationTransformers, false);
    if (length(declarationTransform.diagnostics)) {
      for (const diagnostic of declarationTransform.diagnostics!) {
        emitterqd.add(diagnostic);
      }
    }
    const printerOptions: PrinterOptions = {
      removeComments: compilerOptions.removeComments,
      newLine: compilerOptions.newLine,
      noEmitHelpers: true,
      module: compilerOptions.module,
      target: compilerOptions.target,
      sourceMap: compilerOptions.sourceMap,
      inlineSourceMap: compilerOptions.inlineSourceMap,
      extendedDiagnostics: compilerOptions.extendedDiagnostics,
      onlyPrintDocStyle: true,
      writeBundleFileInfo: !!bundleBuildInfo,
      recordInternalSection: !!bundleBuildInfo,
      relativeToBuildInfo,
    };
    const declarationPrinter = createPrinter(printerOptions, {
      hasGlobalName: resolver.hasGlobalName,
      onEmitNode: declarationTransform.emitNodeWithNotification,
      isEmitNotificationEnabled: declarationTransform.isEmitNotificationEnabled,
      substituteNode: declarationTransform.substituteNode,
    });
    const declBlocked = (!!declarationTransform.diagnostics && !!declarationTransform.diagnostics.length) || !!host.isEmitBlocked(declarationFilePath) || !!compilerOptions.noEmit;
    emitSkipped = emitSkipped || declBlocked;
    if (!declBlocked || forceDtsEmit) {
      qu.assert(declarationTransform.transformed.length === 1, 'Should only see one output from the decl transform');
      printSourceFileOrBundle(declarationFilePath, declarationMapPath, declarationTransform.transformed[0], declarationPrinter, {
        sourceMap: compilerOptions.declarationMap,
        sourceRoot: compilerOptions.sourceRoot,
        mapRoot: compilerOptions.mapRoot,
        extendedDiagnostics: compilerOptions.extendedDiagnostics,
      });
      if (forceDtsEmit && declarationTransform.transformed[0].kind === Syntax.SourceFile) {
        const sourceFile = declarationTransform.transformed[0];
        exportedModulesFromDeclarationEmit = sourceFile.exportedModulesFromDeclarationEmit;
      }
    }
    declarationTransform.dispose();
    if (bundleBuildInfo) bundleBuildInfo.dts = declarationPrinter.bundleFileInfo;
  }
  function collectLinkedAliases(node: Node) {
    if (qc.is.kind(qc.ExportAssignment, node)) {
      if (node.expression.kind === Syntax.Identifier) {
        resolver.collectLinkedAliases(node.expression as Identifier, true);
      }
      return;
    } else if (qc.is.kind(qc.ExportSpecifier, node)) {
      resolver.collectLinkedAliases(node.propertyName || node.name, true);
      return;
    }
    qc.forEach.child(node, collectLinkedAliases);
  }
  function printSourceFileOrBundle(jsFilePath: string, sourceMapFilePath: string | undefined, sourceFileOrBundle: SourceFile | Bundle, printer: Printer, mapOptions: SourceMapOptions) {
    const bundle = sourceFileOrBundle.kind === Syntax.Bundle ? sourceFileOrBundle : undefined;
    const sourceFile = sourceFileOrBundle.kind === Syntax.SourceFile ? sourceFileOrBundle : undefined;
    const sourceFiles = bundle ? bundle.sourceFiles : [sourceFile!];
    let sourceMapGenerator: SourceMapGenerator | undefined;
    if (shouldEmitSourceMaps(mapOptions, sourceFileOrBundle)) {
      sourceMapGenerator = createSourceMapGenerator(
        host,
        getBaseFileName(normalizeSlashes(jsFilePath)),
        getSourceRoot(mapOptions),
        getSourceMapDirectory(mapOptions, jsFilePath, sourceFile),
        mapOptions
      );
    }
    if (bundle) {
      printer.writeBundle(bundle, writer, sourceMapGenerator);
    } else {
      printer.writeFile(sourceFile!, writer, sourceMapGenerator);
    }
    if (sourceMapGenerator) {
      if (sourceMapDataList) {
        sourceMapDataList.push({
          inputSourceFileNames: sourceMapGenerator.getSources(),
          sourceMap: sourceMapGenerator.toJSON(),
        });
      }
      const sourceMappingURL = getSourceMappingURL(mapOptions, sourceMapGenerator, jsFilePath, sourceMapFilePath, sourceFile);
      if (sourceMappingURL) {
        if (!writer.isAtStartOfLine()) writer.rawWrite(newLine);
        writer.writeComment('');
      }
      if (sourceMapFilePath) {
        const sourceMap = sourceMapGenerator.toString();
        writeFile(host, emitterDiagnostics, sourceMapFilePath, sourceMap, false, sourceFiles);
      }
    } else {
      writer.writeLine();
    }
    writeFile(host, emitterDiagnostics, jsFilePath, writer.getText(), !!compilerOptions.emitBOM, sourceFiles);
    writer.clear();
  }
  interface SourceMapOptions {
    sourceMap?: boolean;
    inlineSourceMap?: boolean;
    inlineSources?: boolean;
    sourceRoot?: string;
    mapRoot?: string;
    extendedDiagnostics?: boolean;
  }
  function shouldEmitSourceMaps(mapOptions: SourceMapOptions, sourceFileOrBundle: SourceFile | Bundle) {
    return (mapOptions.sourceMap || mapOptions.inlineSourceMap) && (sourceFileOrBundle.kind !== Syntax.SourceFile || !fileExtensionIs(sourceFileOrBundle.fileName, Extension.Json));
  }
  function getSourceRoot(mapOptions: SourceMapOptions) {
    const sourceRoot = normalizeSlashes(mapOptions.sourceRoot || '');
    return sourceRoot ? ensureTrailingDirectorySeparator(sourceRoot) : sourceRoot;
  }
  function getSourceMapDirectory(mapOptions: SourceMapOptions, filePath: string, sourceFile: SourceFile | undefined) {
    if (mapOptions.sourceRoot) return host.getCommonSourceDirectory();
    if (mapOptions.mapRoot) {
      let sourceMapDir = normalizeSlashes(mapOptions.mapRoot);
      if (sourceFile) {
        sourceMapDir = getDirectoryPath(getSourceFilePathInNewDir(sourceFile.fileName, host, sourceMapDir));
      }
      if (getRootLength(sourceMapDir) === 0) {
        sourceMapDir = combinePaths(host.getCommonSourceDirectory(), sourceMapDir);
      }
      return sourceMapDir;
    }
    return getDirectoryPath(normalizePath(filePath));
  }
  function getSourceMappingURL(mapOptions: SourceMapOptions, sourceMapGenerator: SourceMapGenerator, filePath: string, sourceMapFilePath: string | undefined, sourceFile: SourceFile | undefined) {
    if (mapOptions.inlineSourceMap) {
      const sourceMapText = sourceMapGenerator.toString();
      const base64SourceMapText = base64encode(sys, sourceMapText);
      return `data:application/json;base64,${base64SourceMapText}`;
    }
    const sourceMapFile = getBaseFileName(normalizeSlashes(Debug.checkDefined(sourceMapFilePath)));
    if (mapOptions.mapRoot) {
      let sourceMapDir = normalizeSlashes(mapOptions.mapRoot);
      if (sourceFile) {
        sourceMapDir = getDirectoryPath(getSourceFilePathInNewDir(sourceFile.fileName, host, sourceMapDir));
      }
      if (getRootLength(sourceMapDir) === 0) {
        sourceMapDir = combinePaths(host.getCommonSourceDirectory(), sourceMapDir);
        return getRelativePathToDirectoryOrUrl(getDirectoryPath(normalizePath(filePath)), combinePaths(sourceMapDir, sourceMapFile), host.getCurrentDirectory(), host.getCanonicalFileName, true);
      } else {
        return combinePaths(sourceMapDir, sourceMapFile);
      }
    }
    return sourceMapFile;
  }
}
export function getBuildInfoText(buildInfo: BuildInfo) {
  return JSON.stringify(buildInfo, undefined, 2);
}
export function getBuildInfo(buildInfoText: string) {
  return JSON.parse(buildInfoText) as BuildInfo;
}
export const notImplementedResolver: EmitResolver = {
  hasGlobalName: notImplemented,
  getReferencedExportContainer: notImplemented,
  getReferencedImportDeclaration: notImplemented,
  getReferencedDeclarationWithCollidingName: notImplemented,
  isDeclarationWithCollidingName: notImplemented,
  isValueAliasDeclaration: notImplemented,
  isReferencedAliasDeclaration: notImplemented,
  isTopLevelValueImportEqualsWithEntityName: notImplemented,
  getNodeCheckFlags: notImplemented,
  isDeclarationVisible: notImplemented,
  isLateBound: (_node): _node is LateBoundDeclaration => false,
  collectLinkedAliases: notImplemented,
  isImplementationOfOverload: notImplemented,
  isRequiredInitializedParameter: notImplemented,
  isOptionalUninitializedParameterProperty: notImplemented,
  isExpandoFunctionDeclaration: notImplemented,
  getPropertiesOfContainerFunction: notImplemented,
  createTypeOfDeclaration: notImplemented,
  createReturnTypeOfSignatureDeclaration: notImplemented,
  createTypeOfExpression: notImplemented,
  createLiteralConstValue: notImplemented,
  isSymbolAccessible: notImplemented,
  isEntityNameVisible: notImplemented,
  getConstantValue: notImplemented,
  getReferencedValueDeclaration: notImplemented,
  getTypeReferenceSerializationKind: notImplemented,
  isOptionalParameter: notImplemented,
  moduleExportsSomeValue: notImplemented,
  isArgumentsLocalBinding: notImplemented,
  getExternalModuleFileFromDeclaration: notImplemented,
  getTypeReferenceDirectivesForEntityName: notImplemented,
  getTypeReferenceDirectivesForSymbol: notImplemented,
  isLiteralConstDeclaration: notImplemented,
  getJsxFactoryEntity: notImplemented,
  getAllAccessorDeclarations: notImplemented,
  getSymbolOfExternalModuleSpecifier: notImplemented,
  isBindingCapturedByNode: notImplemented,
  getDeclarationStatementsForSourceFile: notImplemented,
  isImportRequiredByAugmentation: notImplemented,
};
export type EmitUsingBuildInfoResult = string | readonly OutputFile[];
export interface EmitUsingBuildInfoHost extends ModuleResolutionHost {
  getCurrentDirectory(): string;
  getCanonicalFileName(fileName: string): string;
  useCaseSensitiveFileNames(): boolean;
  getNewLine(): string;
}
function createSourceFilesFromBundleBuildInfo(bundle: BundleBuildInfo, buildInfoDirectory: string, host: EmitUsingBuildInfoHost): readonly SourceFile[] {
  const sourceFiles = bundle.sourceFiles.map((fileName) => {
    const sourceFile = createNode(Syntax.SourceFile, 0, 0) as SourceFile;
    sourceFile.fileName = getRelativePathFromDirectory(host.getCurrentDirectory(), getNormalizedAbsolutePath(fileName, buildInfoDirectory), !host.useCaseSensitiveFileNames());
    sourceFile.text = '';
    sourceFile.statements = new Nodes();
    return sourceFile;
  });
  const jsBundle = Debug.checkDefined(bundle.js);
  forEach(jsBundle.sources && jsBundle.sources.prologues, (prologueInfo) => {
    const sourceFile = sourceFiles[prologueInfo.file];
    sourceFile.text = prologueInfo.text;
    sourceFile.end = prologueInfo.text.length;
    sourceFile.statements = new Nodes(
      prologueInfo.directives.map((directive) => {
        const statement = createNode(Syntax.ExpressionStatement, directive.pos, directive.end) as PrologueDirective;
        statement.expression = createNode(Syntax.StringLiteral, directive.expression.pos, directive.expression.end) as StringLiteral;
        statement.expression.text = directive.expression.text;
        return statement;
      })
    );
  });
  return sourceFiles;
}
export function emitUsingBuildInfo(
  config: ParsedCommandLine,
  host: EmitUsingBuildInfoHost,
  getCommandLine: (ref: ProjectReference) => ParsedCommandLine | undefined,
  customTransformers?: CustomTransformers
): EmitUsingBuildInfoResult {
  const { buildInfoPath, jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath } = getOutputPathsForBundle(config.options, false);
  const buildInfoText = host.readFile(Debug.checkDefined(buildInfoPath));
  if (!buildInfoText) return buildInfoPath!;
  const jsFileText = host.readFile(Debug.checkDefined(jsFilePath));
  if (!jsFileText) return jsFilePath!;
  const sourceMapText = sourceMapFilePath && host.readFile(sourceMapFilePath);
  if ((sourceMapFilePath && !sourceMapText) || config.options.inlineSourceMap) return sourceMapFilePath || 'inline sourcemap decoding';
  const declarationText = declarationFilePath && host.readFile(declarationFilePath);
  if (declarationFilePath && !declarationText) return declarationFilePath;
  const declarationMapText = declarationMapPath && host.readFile(declarationMapPath);
  if ((declarationMapPath && !declarationMapText) || config.options.inlineSourceMap) return declarationMapPath || 'inline sourcemap decoding';
  const buildInfo = getBuildInfo(buildInfoText);
  if (!buildInfo.bundle || !buildInfo.bundle.js || (declarationText && !buildInfo.bundle.dts)) return buildInfoPath!;
  const buildInfoDirectory = getDirectoryPath(getNormalizedAbsolutePath(buildInfoPath!, host.getCurrentDirectory()));
  const ownPrependInput = new qc.InputFiles(
    jsFileText,
    declarationText!,
    sourceMapFilePath,
    sourceMapText,
    declarationMapPath,
    declarationMapText,
    jsFilePath,
    declarationFilePath,
    buildInfoPath,
    buildInfo,
    true
  );
  const outputFiles: OutputFile[] = [];
  const prependNodes = createPrependNodes(config.projectReferences, getCommandLine, (f) => host.readFile(f));
  const sourceFilesForJsEmit = createSourceFilesFromBundleBuildInfo(buildInfo.bundle, buildInfoDirectory, host);
  const emitHost: EmitHost = {
    getPrependNodes: memoize(() => [...prependNodes, ownPrependInput]),
    getCanonicalFileName: host.getCanonicalFileName,
    getCommonSourceDirectory: () => getNormalizedAbsolutePath(buildInfo.bundle!.commonSourceDirectory, buildInfoDirectory),
    getCompilerOptions: () => config.options,
    getCurrentDirectory: () => host.getCurrentDirectory(),
    getNewLine: () => host.getNewLine(),
    getSourceFile: () => undefined,
    getSourceFileByPath: () => undefined,
    getSourceFiles: () => sourceFilesForJsEmit,
    getLibFileFromReference: notImplemented,
    isSourceFileFromExternalLibrary: () => false,
    getResolvedProjectReferenceToRedirect: () => undefined,
    getProjectReferenceRedirect: () => undefined,
    isSourceOfProjectReferenceRedirect: () => false,
    writeFile: (name, text, writeByteOrderMark) => {
      switch (name) {
        case jsFilePath:
          if (jsFileText === text) return;
          break;
        case sourceMapFilePath:
          if (sourceMapText === text) return;
          break;
        case buildInfoPath:
          const newBuildInfo = getBuildInfo(text);
          newBuildInfo.program = buildInfo.program;
          const { js, dts, sourceFiles } = buildInfo.bundle!;
          newBuildInfo.bundle!.js!.sources = js!.sources;
          if (dts) {
            newBuildInfo.bundle!.dts!.sources = dts.sources;
          }
          newBuildInfo.bundle!.sourceFiles = sourceFiles;
          outputFiles.push({ name, text: getBuildInfoText(newBuildInfo), writeByteOrderMark });
          return;
        case declarationFilePath:
          if (declarationText === text) return;
          break;
        case declarationMapPath:
          if (declarationMapText === text) return;
          break;
        default:
          fail(`Unexpected path: ${name}`);
      }
      outputFiles.push({ name, text, writeByteOrderMark });
    },
    isEmitBlocked: () => false,
    readFile: (f) => host.readFile(f),
    fileExists: (f) => host.fileExists(f),
    useCaseSensitiveFileNames: () => host.useCaseSensitiveFileNames(),
    getProgramBuildInfo: () => undefined,
    getSourceFileFromReference: () => undefined,
    redirectTargetsMap: new MultiMap(),
  };
  emitFiles(notImplementedResolver, emitHost, undefined, getTransformers(config.options, customTransformers));
  return outputFiles;
}
const enum PipelinePhase {
  Notification,
  Substitution,
  Comments,
  SourceMaps,
  Emit,
}
export function createPrinter(printerOptions: PrinterOptions = {}, handlers: PrintHandlers = {}): Printer {
  const {
    hasGlobalName,
    onEmitNode = noEmitNotification,
    isEmitNotificationEnabled,
    substituteNode = noEmitSubstitution,
    onBeforeEmitNodes,
    onAfterEmitNodes,
    onBeforeEmitToken,
    onAfterEmitToken,
  } = handlers;
  const extendedDiagnostics = !!printerOptions.extendedDiagnostics;
  const newLine = getNewLineCharacter(printerOptions);
  const moduleKind = getEmitModuleKind(printerOptions);
  const bundledHelpers = createMap<boolean>();
  let currentSourceFile: SourceFile | undefined;
  let nodeIdToGeneratedName: string[];
  let autoGeneratedIdToGeneratedName: string[];
  let generatedNames: qu.QMap<true>;
  let tempFlagsStack: TempFlags[];
  let tempFlags: TempFlags;
  let reservedNamesStack: qu.QMap<true>[];
  let reservedNames: qu.QMap<true>;
  let preserveSourceNewlines = printerOptions.preserveSourceNewlines;
  let writer: EmitTextWriter;
  let ownWriter: EmitTextWriter;
  let write = writeBase;
  let isOwnFileEmit: boolean;
  const bundleFileInfo = printerOptions.writeBundleFileInfo ? ({ sections: [] } as BundleFileInfo) : undefined;
  const relativeToBuildInfo = bundleFileInfo ? Debug.checkDefined(printerOptions.relativeToBuildInfo) : undefined;
  const recordInternalSection = printerOptions.recordInternalSection;
  let sourceFileTextPos = 0;
  let sourceFileTextKind: BundleFileTextLikeKind = BundleFileSectionKind.Text;
  let sourceMapsDisabled = true;
  let sourceMapGenerator: SourceMapGenerator | undefined;
  let sourceMapSource: SourceMapSource;
  let sourceMapSourceIndex = -1;
  let containerPos = -1;
  let containerEnd = -1;
  let declarationListContainerEnd = -1;
  let currentLineMap: readonly number[] | undefined;
  let detachedCommentsInfo: { nodePos: number; detachedCommentEndPos: number }[] | undefined;
  let hasWrittenComment = false;
  let commentsDisabled = !!printerOptions.removeComments;
  let lastNode: Node | undefined;
  let lastSubstitution: Node | undefined;
  const { enter: enterComment, exit: exitComment } = performance.createTimerIf(extendedDiagnostics, 'commentTime', 'beforeComment', 'afterComment');
  reset();
  return {
    printNode,
    printList,
    printFile,
    printBundle,
    writeNode,
    writeList,
    writeFile,
    writeBundle,
    bundleFileInfo,
  };
  function printNode(hint: EmitHint, node: Node, sourceFile: SourceFile): string {
    switch (hint) {
      case EmitHint.SourceFile:
        qu.assert(qc.is.kind(qc.SourceFile, node), 'Expected a SourceFile node.');
        break;
      case EmitHint.IdentifierName:
        qu.assert(qc.is.kind(qc.Identifier, node), 'Expected an Identifier node.');
        break;
      case EmitHint.Expression:
        qu.assert(qc.is.expression(node), 'Expected an Expression node.');
        break;
    }
    switch (node.kind) {
      case Syntax.SourceFile:
        return printFile(<SourceFile>node);
      case Syntax.Bundle:
        return printBundle(<Bundle>node);
      case Syntax.UnparsedSource:
        return printUnparsedSource(<UnparsedSource>node);
    }
    writeNode(hint, node, sourceFile, beginPrint());
    return endPrint();
  }
  function printList<T extends Node>(format: ListFormat, nodes: Nodes<T>, sourceFile: SourceFile) {
    writeList(format, nodes, sourceFile, beginPrint());
    return endPrint();
  }
  function printBundle(bundle: Bundle): string {
    writeBundle(bundle, beginPrint(), undefined);
    return endPrint();
  }
  function printFile(sourceFile: SourceFile): string {
    writeFile(sourceFile, beginPrint(), undefined);
    return endPrint();
  }
  function printUnparsedSource(unparsed: UnparsedSource): string {
    writeUnparsedSource(unparsed, beginPrint());
    return endPrint();
  }
  function writeNode(hint: EmitHint, node: TypeNode, sourceFile: undefined, output: EmitTextWriter): void;
  function writeNode(hint: EmitHint, node: Node, sourceFile: SourceFile, output: EmitTextWriter): void;
  function writeNode(hint: EmitHint, node: Node, sourceFile: SourceFile | undefined, output: EmitTextWriter) {
    const previousWriter = writer;
    setWriter(output, undefined);
    print(hint, node, sourceFile);
    reset();
    writer = previousWriter;
  }
  function writeList<T extends Node>(format: ListFormat, nodes: Nodes<T>, sourceFile: SourceFile | undefined, output: EmitTextWriter) {
    const previousWriter = writer;
    setWriter(output, undefined);
    if (sourceFile) {
      setSourceFile(sourceFile);
    }
    emitList(syntheticParent, nodes, format);
    reset();
    writer = previousWriter;
  }
  function getTextPosWithWriteLine() {
    return writer.getTextPosWithWriteLine ? writer.getTextPosWithWriteLine() : writer.getTextPos();
  }
  function updateOrPushBundleFileTextLike(pos: number, end: number, kind: BundleFileTextLikeKind) {
    const last = lastOrUndefined(bundleFileInfo!.sections);
    if (last && last.kind === kind) {
      last.end = end;
    } else {
      bundleFileInfo!.sections.push({ pos, end, kind });
    }
  }
  function recordBundleFileInternalSectionStart(node: Node) {
    if (
      recordInternalSection &&
      bundleFileInfo &&
      currentSourceFile &&
      (qc.is.declaration(node) || qc.is.kind(qc.VariableStatement, node)) &&
      isInternalDeclaration(node, currentSourceFile) &&
      sourceFileTextKind !== BundleFileSectionKind.Internal
    ) {
      const prevSourceFileTextKind = sourceFileTextKind;
      recordBundleFileTextLikeSection(writer.getTextPos());
      sourceFileTextPos = getTextPosWithWriteLine();
      sourceFileTextKind = BundleFileSectionKind.Internal;
      return prevSourceFileTextKind;
    }
    return;
  }
  function recordBundleFileInternalSectionEnd(prevSourceFileTextKind: ReturnType<typeof recordBundleFileInternalSectionStart>) {
    if (prevSourceFileTextKind) {
      recordBundleFileTextLikeSection(writer.getTextPos());
      sourceFileTextPos = getTextPosWithWriteLine();
      sourceFileTextKind = prevSourceFileTextKind;
    }
  }
  function recordBundleFileTextLikeSection(end: number) {
    if (sourceFileTextPos < end) {
      updateOrPushBundleFileTextLike(sourceFileTextPos, end, sourceFileTextKind);
      return true;
    }
    return false;
  }
  function writeBundle(bundle: Bundle, output: EmitTextWriter, sourceMapGenerator: SourceMapGenerator | undefined) {
    isOwnFileEmit = false;
    const previousWriter = writer;
    setWriter(output, sourceMapGenerator);
    emitShebangIfNeeded(bundle);
    emitPrologueDirectivesIfNeeded(bundle);
    emitHelpers(bundle);
    emitSyntheticTripleSlashReferencesIfNeeded(bundle);
    for (const prepend of bundle.prepends) {
      writeLine();
      const pos = writer.getTextPos();
      const savedSections = bundleFileInfo && bundleFileInfo.sections;
      if (savedSections) bundleFileInfo!.sections = [];
      print(EmitHint.Unspecified, prepend, undefined);
      if (bundleFileInfo) {
        const newSections = bundleFileInfo.sections;
        bundleFileInfo.sections = savedSections!;
        if (prepend.oldFileOfCurrentEmit) bundleFileInfo.sections.push(...newSections);
        else {
          newSections.forEach((section) => qu.assert(isBundleFileTextLike(section)));
          bundleFileInfo.sections.push({
            pos,
            end: writer.getTextPos(),
            kind: BundleFileSectionKind.Prepend,
            data: relativeToBuildInfo!((prepend as UnparsedSource).fileName),
            texts: newSections as BundleFileTextLike[],
          });
        }
      }
    }
    sourceFileTextPos = getTextPosWithWriteLine();
    for (const sourceFile of bundle.sourceFiles) {
      print(EmitHint.SourceFile, sourceFile, sourceFile);
    }
    if (bundleFileInfo && bundle.sourceFiles.length) {
      const end = writer.getTextPos();
      if (recordBundleFileTextLikeSection(end)) {
        const prologues = getPrologueDirectivesFromBundledSourceFiles(bundle);
        if (prologues) {
          if (!bundleFileInfo.sources) bundleFileInfo.sources = {};
          bundleFileInfo.sources.prologues = prologues;
        }
        const helpers = getHelpersFromBundledSourceFiles(bundle);
        if (helpers) {
          if (!bundleFileInfo.sources) bundleFileInfo.sources = {};
          bundleFileInfo.sources.helpers = helpers;
        }
      }
    }
    reset();
    writer = previousWriter;
  }
  function writeUnparsedSource(unparsed: UnparsedSource, output: EmitTextWriter) {
    const previousWriter = writer;
    setWriter(output, undefined);
    print(EmitHint.Unspecified, unparsed, undefined);
    reset();
    writer = previousWriter;
  }
  function writeFile(sourceFile: SourceFile, output: EmitTextWriter, sourceMapGenerator: SourceMapGenerator | undefined) {
    isOwnFileEmit = true;
    const previousWriter = writer;
    setWriter(output, sourceMapGenerator);
    emitShebangIfNeeded(sourceFile);
    emitPrologueDirectivesIfNeeded(sourceFile);
    print(EmitHint.SourceFile, sourceFile, sourceFile);
    reset();
    writer = previousWriter;
  }
  function beginPrint() {
    return ownWriter || (ownWriter = createTextWriter(newLine));
  }
  function endPrint() {
    const text = ownWriter.getText();
    ownWriter.clear();
    return text;
  }
  function print(hint: EmitHint, node: Node, sourceFile: SourceFile | undefined) {
    if (sourceFile) {
      setSourceFile(sourceFile);
    }
    pipelineEmit(hint, node);
  }
  function setSourceFile(sourceFile: SourceFile | undefined) {
    currentSourceFile = sourceFile;
    currentLineMap = undefined;
    detachedCommentsInfo = undefined;
    if (sourceFile) {
      setSourceMapSource(sourceFile);
    }
  }
  function setWriter(_writer: EmitTextWriter | undefined, _sourceMapGenerator: SourceMapGenerator | undefined) {
    if (_writer && printerOptions.omitTrailingSemicolon) {
      _writer = getTrailingSemicolonDeferringWriter(_writer);
    }
    writer = _writer!;
    sourceMapGenerator = _sourceMapGenerator;
    sourceMapsDisabled = !writer || !sourceMapGenerator;
  }
  function reset() {
    nodeIdToGeneratedName = [];
    autoGeneratedIdToGeneratedName = [];
    generatedNames = createMap<true>();
    tempFlagsStack = [];
    tempFlags = TempFlags.Auto;
    reservedNamesStack = [];
    currentSourceFile = undefined!;
    currentLineMap = undefined!;
    detachedCommentsInfo = undefined;
    lastNode = undefined;
    lastSubstitution = undefined;
    setWriter(undefined);
  }
  function getCurrentLineMap() {
    return currentLineMap || (currentLineMap = qy.get.lineStarts(currentSourceFile!));
  }
  function emit(node: Node): Node;
  function emit(node: Node | undefined): Node | undefined;
  function emit(node: Node | undefined) {
    if (node === undefined) return;
    const prevSourceFileTextKind = recordBundleFileInternalSectionStart(node);
    const substitute = pipelineEmit(EmitHint.Unspecified, node);
    recordBundleFileInternalSectionEnd(prevSourceFileTextKind);
    return substitute;
  }
  function emitIdentifierName(node: Identifier): Node;
  function emitIdentifierName(node: Identifier | undefined): Node | undefined;
  function emitIdentifierName(node: Identifier | undefined): Node | undefined {
    if (node === undefined) return;
    return pipelineEmit(EmitHint.IdentifierName, node);
  }
  function emitExpression(node: Expression): Node;
  function emitExpression(node: Expression | undefined): Node | undefined;
  function emitExpression(node: Expression | undefined): Node | undefined {
    if (node === undefined) return;
    return pipelineEmit(EmitHint.Expression, node);
  }
  function emitJsxAttributeValue(node: StringLiteral | JsxExpression): Node {
    return pipelineEmit(qc.is.kind(qc.StringLiteral, node) ? EmitHint.JsxAttributeValue : EmitHint.Unspecified, node);
  }
  function pipelineEmit(emitHint: EmitHint, node: Node) {
    const savedLastNode = lastNode;
    const savedLastSubstitution = lastSubstitution;
    const savedPreserveSourceNewlines = preserveSourceNewlines;
    lastNode = node;
    lastSubstitution = undefined;
    if (preserveSourceNewlines && !!(qc.get.emitFlags(node) & EmitFlags.IgnoreSourceNewlines)) {
      preserveSourceNewlines = false;
    }
    const pipelinePhase = getPipelinePhase(PipelinePhase.Notification, emitHint, node);
    pipelinePhase(emitHint, node);
    qu.assert(lastNode === node);
    const substitute = lastSubstitution;
    lastNode = savedLastNode;
    lastSubstitution = savedLastSubstitution;
    preserveSourceNewlines = savedPreserveSourceNewlines;
    return substitute || node;
  }
  function getPipelinePhase(phase: PipelinePhase, emitHint: EmitHint, node: Node) {
    switch (phase) {
      case PipelinePhase.Notification:
        if (onEmitNode !== noEmitNotification && (!isEmitNotificationEnabled || isEmitNotificationEnabled(node))) return pipelineEmitWithNotification;
      case PipelinePhase.Substitution:
        if (substituteNode !== noEmitSubstitution && (lastSubstitution = substituteNode(emitHint, node)) !== node) return pipelineEmitWithSubstitution;
      case PipelinePhase.Comments:
        if (!commentsDisabled && node.kind !== Syntax.SourceFile) return pipelineEmitWithComments;
      case PipelinePhase.SourceMaps:
        if (!sourceMapsDisabled && node.kind !== Syntax.SourceFile && !qc.is.inJsonFile(node)) return pipelineEmitWithSourceMap;
      case PipelinePhase.Emit:
        return pipelineEmitWithHint;
      default:
        return Debug.assertNever(phase);
    }
  }
  function getNextPipelinePhase(currentPhase: PipelinePhase, emitHint: EmitHint, node: Node) {
    return getPipelinePhase(currentPhase + 1, emitHint, node);
  }
  function pipelineEmitWithNotification(hint: EmitHint, node: Node) {
    qu.assert(lastNode === node);
    const pipelinePhase = getNextPipelinePhase(PipelinePhase.Notification, hint, node);
    onEmitNode(hint, node, pipelinePhase);
    qu.assert(lastNode === node);
  }
  function pipelineEmitWithHint(hint: EmitHint, node: Node): void {
    qu.assert(lastNode === node || lastSubstitution === node);
    if (hint === EmitHint.SourceFile) return emitSourceFile(cast(node, isSourceFile));
    if (hint === EmitHint.IdentifierName) return emitIdentifier(cast(node, isIdentifier));
    if (hint === EmitHint.JsxAttributeValue) return emitLiteral(cast(node, isStringLiteral), true);
    if (hint === EmitHint.MappedTypeParameter) return emitMappedTypeParameter(cast(node, isTypeParameterDeclaration));
    if (hint === EmitHint.EmbeddedStatement) {
      Debug.assertNode(node, isEmptyStatement);
      return emitEmptyStatement(true);
    }
    if (hint === EmitHint.Unspecified) {
      if (qy.is.keyword(node.kind)) return writeTokenNode(node, writeKeyword);
      switch (node.kind) {
        case Syntax.TemplateHead:
        case Syntax.TemplateMiddle:
        case Syntax.TemplateTail:
          return emitLiteral(<LiteralExpression>node, false);
        case Syntax.UnparsedSource:
        case Syntax.UnparsedPrepend:
          return emitUnparsedSourceOrPrepend(<UnparsedSource>node);
        case Syntax.UnparsedPrologue:
          return writeUnparsedNode(<UnparsedNode>node);
        case Syntax.UnparsedText:
        case Syntax.UnparsedInternalText:
          return emitUnparsedTextLike(<UnparsedTextLike>node);
        case Syntax.UnparsedSyntheticReference:
          return emitUnparsedSyntheticReference(<UnparsedSyntheticReference>node);
        case Syntax.Identifier:
          return emitIdentifier(<Identifier>node);
        case Syntax.PrivateIdentifier:
          return emitPrivateIdentifier(node as PrivateIdentifier);
        case Syntax.QualifiedName:
          return emitQualifiedName(<QualifiedName>node);
        case Syntax.ComputedPropertyName:
          return emitComputedPropertyName(<ComputedPropertyName>node);
        case Syntax.TypeParameter:
          return emitTypeParameter(<TypeParameterDeclaration>node);
        case Syntax.Parameter:
          return emitParameter(<ParameterDeclaration>node);
        case Syntax.Decorator:
          return emitDecorator(<Decorator>node);
        case Syntax.PropertySignature:
          return emitPropertySignature(<PropertySignature>node);
        case Syntax.PropertyDeclaration:
          return emitPropertyDeclaration(<PropertyDeclaration>node);
        case Syntax.MethodSignature:
          return emitMethodSignature(<MethodSignature>node);
        case Syntax.MethodDeclaration:
          return emitMethodDeclaration(<MethodDeclaration>node);
        case Syntax.Constructor:
          return emitConstructor(<ConstructorDeclaration>node);
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return emitAccessorDeclaration(<AccessorDeclaration>node);
        case Syntax.CallSignature:
          return emitCallSignature(<CallSignatureDeclaration>node);
        case Syntax.ConstructSignature:
          return emitConstructSignature(<ConstructSignatureDeclaration>node);
        case Syntax.IndexSignature:
          return emitIndexSignature(<IndexSignatureDeclaration>node);
        case Syntax.TypePredicate:
          return emitTypePredicate(<TypePredicateNode>node);
        case Syntax.TypeReference:
          return emitTypeReference(<TypeReferenceNode>node);
        case Syntax.FunctionType:
          return emitFunctionType(<FunctionTypeNode>node);
        case Syntax.DocFunctionType:
          return emitDocFunctionType(node as DocFunctionType);
        case Syntax.ConstructorType:
          return emitConstructorType(<ConstructorTypeNode>node);
        case Syntax.TypeQuery:
          return emitTypeQuery(<TypeQueryNode>node);
        case Syntax.TypeLiteral:
          return emitTypeLiteral(<TypeLiteralNode>node);
        case Syntax.ArrayType:
          return emitArrayType(<ArrayTypeNode>node);
        case Syntax.TupleType:
          return emitTupleType(<TupleTypeNode>node);
        case Syntax.OptionalType:
          return emitOptionalType(<OptionalTypeNode>node);
        case Syntax.UnionType:
          return emitUnionType(<UnionTypeNode>node);
        case Syntax.IntersectionType:
          return emitIntersectionType(<IntersectionTypeNode>node);
        case Syntax.ConditionalType:
          return emitConditionalType(<ConditionalTypeNode>node);
        case Syntax.InferType:
          return emitInferType(<InferTypeNode>node);
        case Syntax.ParenthesizedType:
          return emitParenthesizedType(<ParenthesizedTypeNode>node);
        case Syntax.ExpressionWithTypeArguments:
          return emitExpressionWithTypeArguments(<ExpressionWithTypeArguments>node);
        case Syntax.ThisType:
          return emitThisType();
        case Syntax.TypeOperator:
          return emitTypeOperator(<TypeOperatorNode>node);
        case Syntax.IndexedAccessType:
          return emitIndexedAccessType(<IndexedAccessTypeNode>node);
        case Syntax.MappedType:
          return emitMappedType(<MappedTypeNode>node);
        case Syntax.LiteralType:
          return emitLiteralType(<LiteralTypeNode>node);
        case Syntax.ImportType:
          return emitImportTypeNode(<ImportTypeNode>node);
        case Syntax.DocAllType:
          writePunctuation('*');
          return;
        case Syntax.DocUnknownType:
          writePunctuation('?');
          return;
        case Syntax.DocNullableType:
          return emitDocNullableType(node as DocNullableType);
        case Syntax.DocNonNullableType:
          return emitDocNonNullableType(node as DocNonNullableType);
        case Syntax.DocOptionalType:
          return emitDocOptionalType(node as DocOptionalType);
        case Syntax.RestType:
        case Syntax.DocVariadicType:
          return emitRestOrDocVariadicType(node as RestTypeNode | DocVariadicType);
        case Syntax.NamedTupleMember:
          return emitNamedTupleMember(node as NamedTupleMember);
        case Syntax.ObjectBindingPattern:
          return emitObjectBindingPattern(<ObjectBindingPattern>node);
        case Syntax.ArrayBindingPattern:
          return emitArrayBindingPattern(<ArrayBindingPattern>node);
        case Syntax.BindingElement:
          return emitBindingElement(<BindingElement>node);
        case Syntax.TemplateSpan:
          return emitTemplateSpan(<TemplateSpan>node);
        case Syntax.SemicolonClassElement:
          return emitSemicolonClassElement();
        case Syntax.Block:
          return emitBlock(<Block>node);
        case Syntax.VariableStatement:
          return emitVariableStatement(<VariableStatement>node);
        case Syntax.EmptyStatement:
          return emitEmptyStatement(false);
        case Syntax.ExpressionStatement:
          return emitExpressionStatement(<ExpressionStatement>node);
        case Syntax.IfStatement:
          return emitIfStatement(<IfStatement>node);
        case Syntax.DoStatement:
          return emitDoStatement(<DoStatement>node);
        case Syntax.WhileStatement:
          return emitWhileStatement(<WhileStatement>node);
        case Syntax.ForStatement:
          return emitForStatement(<ForStatement>node);
        case Syntax.ForInStatement:
          return emitForInStatement(<ForInStatement>node);
        case Syntax.ForOfStatement:
          return emitForOfStatement(<ForOfStatement>node);
        case Syntax.ContinueStatement:
          return emitContinueStatement(<ContinueStatement>node);
        case Syntax.BreakStatement:
          return emitBreakStatement(<BreakStatement>node);
        case Syntax.ReturnStatement:
          return emitReturnStatement(<ReturnStatement>node);
        case Syntax.WithStatement:
          return emitWithStatement(<WithStatement>node);
        case Syntax.SwitchStatement:
          return emitSwitchStatement(<SwitchStatement>node);
        case Syntax.LabeledStatement:
          return emitLabeledStatement(<LabeledStatement>node);
        case Syntax.ThrowStatement:
          return emitThrowStatement(<ThrowStatement>node);
        case Syntax.TryStatement:
          return emitTryStatement(<TryStatement>node);
        case Syntax.DebuggerStatement:
          return emitDebuggerStatement(<DebuggerStatement>node);
        case Syntax.VariableDeclaration:
          return emitVariableDeclaration(<VariableDeclaration>node);
        case Syntax.VariableDeclarationList:
          return emitVariableDeclarationList(<VariableDeclarationList>node);
        case Syntax.FunctionDeclaration:
          return emitFunctionDeclaration(<FunctionDeclaration>node);
        case Syntax.ClassDeclaration:
          return emitClassDeclaration(<ClassDeclaration>node);
        case Syntax.InterfaceDeclaration:
          return emitInterfaceDeclaration(<InterfaceDeclaration>node);
        case Syntax.TypeAliasDeclaration:
          return emitTypeAliasDeclaration(<TypeAliasDeclaration>node);
        case Syntax.EnumDeclaration:
          return emitEnumDeclaration(<EnumDeclaration>node);
        case Syntax.ModuleDeclaration:
          return emitModuleDeclaration(<ModuleDeclaration>node);
        case Syntax.ModuleBlock:
          return emitModuleBlock(<ModuleBlock>node);
        case Syntax.CaseBlock:
          return emitCaseBlock(<CaseBlock>node);
        case Syntax.NamespaceExportDeclaration:
          return emitNamespaceExportDeclaration(<NamespaceExportDeclaration>node);
        case Syntax.ImportEqualsDeclaration:
          return emitImportEqualsDeclaration(<ImportEqualsDeclaration>node);
        case Syntax.ImportDeclaration:
          return emitImportDeclaration(<ImportDeclaration>node);
        case Syntax.ImportClause:
          return emitImportClause(<ImportClause>node);
        case Syntax.NamespaceImport:
          return emitNamespaceImport(<NamespaceImport>node);
        case Syntax.NamespaceExport:
          return emitNamespaceExport(<NamespaceExport>node);
        case Syntax.NamedImports:
          return emitNamedImports(<NamedImports>node);
        case Syntax.ImportSpecifier:
          return emitImportSpecifier(<ImportSpecifier>node);
        case Syntax.ExportAssignment:
          return emitExportAssignment(<ExportAssignment>node);
        case Syntax.ExportDeclaration:
          return emitExportDeclaration(<ExportDeclaration>node);
        case Syntax.NamedExports:
          return emitNamedExports(<NamedExports>node);
        case Syntax.ExportSpecifier:
          return emitExportSpecifier(<ExportSpecifier>node);
        case Syntax.MissingDeclaration:
          return;
        case Syntax.ExternalModuleReference:
          return emitExternalModuleReference(<ExternalModuleReference>node);
        case Syntax.JsxText:
          return emitJsxText(<JsxText>node);
        case Syntax.JsxOpeningElement:
        case Syntax.JsxOpeningFragment:
          return emitJsxOpeningElementOrFragment(<JsxOpeningElement>node);
        case Syntax.JsxClosingElement:
        case Syntax.JsxClosingFragment:
          return emitJsxClosingElementOrFragment(<JsxClosingElement>node);
        case Syntax.JsxAttribute:
          return emitJsxAttribute(<JsxAttribute>node);
        case Syntax.JsxAttributes:
          return emitJsxAttributes(<JsxAttributes>node);
        case Syntax.JsxSpreadAttribute:
          return emitJsxSpreadAttribute(<JsxSpreadAttribute>node);
        case Syntax.JsxExpression:
          return emitJsxExpression(<JsxExpression>node);
        case Syntax.CaseClause:
          return emitCaseClause(<CaseClause>node);
        case Syntax.DefaultClause:
          return emitDefaultClause(<DefaultClause>node);
        case Syntax.HeritageClause:
          return emitHeritageClause(<HeritageClause>node);
        case Syntax.CatchClause:
          return emitCatchClause(<CatchClause>node);
        case Syntax.PropertyAssignment:
          return emitPropertyAssignment(<PropertyAssignment>node);
        case Syntax.ShorthandPropertyAssignment:
          return emitShorthandPropertyAssignment(<ShorthandPropertyAssignment>node);
        case Syntax.SpreadAssignment:
          return emitSpreadAssignment(node as SpreadAssignment);
        case Syntax.EnumMember:
          return emitEnumMember(<EnumMember>node);
        case Syntax.DocParameterTag:
        case Syntax.DocPropertyTag:
          return emitDocPropertyLikeTag(node as DocPropertyLikeTag);
        case Syntax.DocReturnTag:
        case Syntax.DocTypeTag:
        case Syntax.DocThisTag:
        case Syntax.DocEnumTag:
          return emitDocSimpleTypedTag(node as DocTypeTag);
        case Syntax.DocImplementsTag:
        case Syntax.DocAugmentsTag:
          return emitDocHeritageTag(node as DocImplementsTag | DocAugmentsTag);
        case Syntax.DocTemplateTag:
          return emitDocTemplateTag(node as DocTemplateTag);
        case Syntax.DocTypedefTag:
          return emitDocTypedefTag(node as DocTypedefTag);
        case Syntax.DocCallbackTag:
          return emitDocCallbackTag(node as DocCallbackTag);
        case Syntax.DocSignature:
          return emitDocSignature(node as DocSignature);
        case Syntax.DocTypeLiteral:
          return emitDocTypeLiteral(node as DocTypeLiteral);
        case Syntax.DocClassTag:
        case Syntax.DocTag:
          return emitDocSimpleTag(node as DocTag);
        case Syntax.DocComment:
          return emitDoc(node as Doc);
      }
      if (qc.is.expression(node)) {
        hint = EmitHint.Expression;
        if (substituteNode !== noEmitSubstitution) {
          lastSubstitution = node = substituteNode(hint, node);
        }
      } else if (qy.is.token(node.kind)) {
        return writeTokenNode(node, writePunctuation);
      }
    }
    if (hint === EmitHint.Expression) {
      switch (node.kind) {
        case Syntax.NumericLiteral:
        case Syntax.BigIntLiteral:
          return emitNumericOrBigIntLiteral(<NumericLiteral | BigIntLiteral>node);
        case Syntax.StringLiteral:
        case Syntax.RegexLiteral:
        case Syntax.NoSubstitutionLiteral:
          return emitLiteral(<LiteralExpression>node, false);
        case Syntax.Identifier:
          return emitIdentifier(<Identifier>node);
        case Syntax.FalseKeyword:
        case Syntax.NullKeyword:
        case Syntax.SuperKeyword:
        case Syntax.TrueKeyword:
        case Syntax.ThisKeyword:
        case Syntax.ImportKeyword:
          writeTokenNode(node, writeKeyword);
          return;
        case Syntax.ArrayLiteralExpression:
          return emitArrayLiteralExpression(<ArrayLiteralExpression>node);
        case Syntax.ObjectLiteralExpression:
          return emitObjectLiteralExpression(<ObjectLiteralExpression>node);
        case Syntax.PropertyAccessExpression:
          return emitPropertyAccessExpression(<PropertyAccessExpression>node);
        case Syntax.ElementAccessExpression:
          return emitElementAccessExpression(<ElementAccessExpression>node);
        case Syntax.CallExpression:
          return emitCallExpression(<CallExpression>node);
        case Syntax.NewExpression:
          return emitNewExpression(<NewExpression>node);
        case Syntax.TaggedTemplateExpression:
          return emitTaggedTemplateExpression(<TaggedTemplateExpression>node);
        case Syntax.TypeAssertionExpression:
          return emitTypeAssertionExpression(<TypeAssertion>node);
        case Syntax.ParenthesizedExpression:
          return emitParenthesizedExpression(<ParenthesizedExpression>node);
        case Syntax.FunctionExpression:
          return emitFunctionExpression(<FunctionExpression>node);
        case Syntax.ArrowFunction:
          return emitArrowFunction(<ArrowFunction>node);
        case Syntax.DeleteExpression:
          return emitDeleteExpression(<DeleteExpression>node);
        case Syntax.TypeOfExpression:
          return emitTypeOfExpression(<TypeOfExpression>node);
        case Syntax.VoidExpression:
          return emitVoidExpression(<VoidExpression>node);
        case Syntax.AwaitExpression:
          return emitAwaitExpression(<AwaitExpression>node);
        case Syntax.PrefixUnaryExpression:
          return emitPrefixUnaryExpression(<PrefixUnaryExpression>node);
        case Syntax.PostfixUnaryExpression:
          return emitPostfixUnaryExpression(<PostfixUnaryExpression>node);
        case Syntax.BinaryExpression:
          return emitBinaryExpression(<BinaryExpression>node);
        case Syntax.ConditionalExpression:
          return emitConditionalExpression(<ConditionalExpression>node);
        case Syntax.TemplateExpression:
          return emitTemplateExpression(<TemplateExpression>node);
        case Syntax.YieldExpression:
          return emitYieldExpression(<YieldExpression>node);
        case Syntax.SpreadElement:
          return emitSpreadExpression(<SpreadElement>node);
        case Syntax.ClassExpression:
          return emitClassExpression(<ClassExpression>node);
        case Syntax.OmittedExpression:
          return;
        case Syntax.AsExpression:
          return emitAsExpression(<AsExpression>node);
        case Syntax.NonNullExpression:
          return emitNonNullExpression(<NonNullExpression>node);
        case Syntax.MetaProperty:
          return emitMetaProperty(<MetaProperty>node);
        case Syntax.JsxElement:
          return emitJsxElement(<JsxElement>node);
        case Syntax.JsxSelfClosingElement:
          return emitJsxSelfClosingElement(<JsxSelfClosingElement>node);
        case Syntax.JsxFragment:
          return emitJsxFragment(<JsxFragment>node);
        case Syntax.PartiallyEmittedExpression:
          return emitPartiallyEmittedExpression(<PartiallyEmittedExpression>node);
        case Syntax.CommaListExpression:
          return emitCommaList(<CommaListExpression>node);
      }
    }
  }
  function emitMappedTypeParameter(node: TypeParameterDeclaration): void {
    emit(node.name);
    writeSpace();
    writeKeyword('in');
    writeSpace();
    emit(node.constraint);
  }
  function pipelineEmitWithSubstitution(hint: EmitHint, node: Node) {
    qu.assert(lastNode === node || lastSubstitution === node);
    const pipelinePhase = getNextPipelinePhase(PipelinePhase.Substitution, hint, node);
    pipelinePhase(hint, lastSubstitution!);
    qu.assert(lastNode === node || lastSubstitution === node);
  }
  function getHelpersFromBundledSourceFiles(bundle: Bundle): string[] | undefined {
    let result: string[] | undefined;
    if (moduleKind === ModuleKind.None || printerOptions.noEmitHelpers) {
      return;
    }
    const bundledHelpers = createMap<boolean>();
    for (const sourceFile of bundle.sourceFiles) {
      const shouldSkip = getExternalHelpersModuleName(sourceFile) !== undefined;
      const helpers = getSortedEmitHelpers(sourceFile);
      if (!helpers) continue;
      for (const helper of helpers) {
        if (!helper.scoped && !shouldSkip && !bundledHelpers.get(helper.name)) {
          bundledHelpers.set(helper.name, true);
          (result || (result = [])).push(helper.name);
        }
      }
    }
    return result;
  }
  function emitHelpers(node: Node) {
    let helpersEmitted = false;
    const bundle = node.kind === Syntax.Bundle ? <Bundle>node : undefined;
    if (bundle && moduleKind === ModuleKind.None) {
      return;
    }
    const numPrepends = bundle ? bundle.prepends.length : 0;
    const numNodes = bundle ? bundle.sourceFiles.length + numPrepends : 1;
    for (let i = 0; i < numNodes; i++) {
      const currentNode = bundle ? (i < numPrepends ? bundle.prepends[i] : bundle.sourceFiles[i - numPrepends]) : node;
      const sourceFile = qc.is.kind(qc.SourceFile, currentNode) ? currentNode : qc.is.kind(qc.UnparsedSource, currentNode) ? undefined : currentSourceFile!;
      const shouldSkip = printerOptions.noEmitHelpers || (!!sourceFile && hasRecordedExternalHelpers(sourceFile));
      const shouldBundle = (qc.is.kind(qc.SourceFile, currentNode) || qc.is.kind(qc.UnparsedSource, currentNode)) && !isOwnFileEmit;
      const helpers = qc.is.kind(qc.UnparsedSource, currentNode) ? currentNode.helpers : getSortedEmitHelpers(currentNode);
      if (helpers) {
        for (const helper of helpers) {
          if (!helper.scoped) {
            if (shouldSkip) continue;
            if (shouldBundle) {
              if (bundledHelpers.get(helper.name)) {
                continue;
              }
              bundledHelpers.set(helper.name, true);
            }
          } else if (bundle) {
            continue;
          }
          const pos = getTextPosWithWriteLine();
          if (typeof helper.text === 'string') {
            writeLines(helper.text);
          } else {
            writeLines(helper.text(makeFileLevelOptimisticUniqueName));
          }
          if (bundleFileInfo) bundleFileInfo.sections.push({ pos, end: writer.getTextPos(), kind: BundleFileSectionKind.EmitHelpers, data: helper.name });
          helpersEmitted = true;
        }
      }
    }
    return helpersEmitted;
  }
  function getSortedEmitHelpers(node: Node) {
    const helpers = getEmitHelpers(node);
    return helpers && stableSort(helpers, compareEmitHelpers);
  }
  function emitNumericOrBigIntLiteral(node: NumericLiteral | BigIntLiteral) {
    emitLiteral(node, false);
  }
  function emitLiteral(node: LiteralLikeNode, jsxAttributeEscape: boolean) {
    const text = getLiteralTextOfNode(node, printerOptions.neverAsciiEscape, jsxAttributeEscape);
    if ((printerOptions.sourceMap || printerOptions.inlineSourceMap) && (node.kind === Syntax.StringLiteral || qy.is.templateLiteral(node.kind))) {
      writeLiteral(text);
    } else {
      writeStringLiteral(text);
    }
  }
  function emitUnparsedSourceOrPrepend(unparsed: UnparsedSource | UnparsedPrepend) {
    for (const text of unparsed.texts) {
      writeLine();
      emit(text);
    }
  }
  function writeUnparsedNode(unparsed: UnparsedNode) {
    writer.rawWrite(unparsed.parent.text.substring(unparsed.pos, unparsed.end));
  }
  function emitUnparsedTextLike(unparsed: UnparsedTextLike) {
    const pos = getTextPosWithWriteLine();
    writeUnparsedNode(unparsed);
    if (bundleFileInfo) {
      updateOrPushBundleFileTextLike(pos, writer.getTextPos(), unparsed.kind === Syntax.UnparsedText ? BundleFileSectionKind.Text : BundleFileSectionKind.Internal);
    }
  }
  function emitUnparsedSyntheticReference(unparsed: UnparsedSyntheticReference) {
    const pos = getTextPosWithWriteLine();
    writeUnparsedNode(unparsed);
    if (bundleFileInfo) {
      const section = clone(unparsed.section);
      section.pos = pos;
      section.end = writer.getTextPos();
      bundleFileInfo.sections.push(section);
    }
  }
  function emitIdentifier(node: Identifier) {
    const writeText = node.symbol ? writeSymbol : write;
    writeText(getTextOfNode(node, false), node.symbol);
    emitList(node, node.typeArguments, ListFormat.TypeParameters);
  }
  function emitPrivateIdentifier(node: PrivateIdentifier) {
    const writeText = node.symbol ? writeSymbol : write;
    writeText(getTextOfNode(node, false), node.symbol);
  }
  function emitQualifiedName(node: QualifiedName) {
    emitEntityName(node.left);
    writePunctuation('.');
    emit(node.right);
  }
  function emitEntityName(node: EntityName) {
    if (node.kind === Syntax.Identifier) {
      emitExpression(node);
    } else {
      emit(node);
    }
  }
  function emitComputedPropertyName(node: ComputedPropertyName) {
    writePunctuation('[');
    emitExpression(node.expression);
    writePunctuation(']');
  }
  function emitTypeParameter(node: TypeParameterDeclaration) {
    emit(node.name);
    if (node.constraint) {
      writeSpace();
      writeKeyword('extends');
      writeSpace();
      emit(node.constraint);
    }
    if (node.default) {
      writeSpace();
      writeOperator('=');
      writeSpace();
      emit(node.default);
    }
  }
  function emitParameter(node: ParameterDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emit(node.dot3Token);
    emitNodeWithWriter(node.name, writeParameter);
    emit(node.questionToken);
    if (node.parent && node.parent.kind === Syntax.DocFunctionType && !node.name) {
      emit(node.type);
    } else {
      emitTypeAnnotation(node.type);
    }
    emitIniter(
      node.initer,
      node.type ? node.type.end : node.questionToken ? node.questionToken.end : node.name ? node.name.end : node.modifiers ? node.modifiers.end : node.decorators ? node.decorators.end : node.pos,
      node
    );
  }
  function emitDecorator(decorator: Decorator) {
    writePunctuation('@');
    emitExpression(decorator.expression);
  }
  function emitPropertySignature(node: PropertySignature) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emitNodeWithWriter(node.name, writeProperty);
    emit(node.questionToken);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
  }
  function emitPropertyDeclaration(node: PropertyDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emit(node.name);
    emit(node.questionToken);
    emit(node.exclamationToken);
    emitTypeAnnotation(node.type);
    emitIniter(node.initer, node.type ? node.type.end : node.questionToken ? node.questionToken.end : node.name.end, node);
    writeTrailingSemicolon();
  }
  function emitMethodSignature(node: MethodSignature) {
    pushNameGenerationScope(node);
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emit(node.name);
    emit(node.questionToken);
    emitTypeParameters(node, node.typeParameters);
    emitParameters(node, node.parameters);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
    popNameGenerationScope(node);
  }
  function emitMethodDeclaration(node: MethodDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emit(node.asteriskToken);
    emit(node.name);
    emit(node.questionToken);
    emitSignatureAndBody(node, emitSignatureHead);
  }
  function emitConstructor(node: ConstructorDeclaration) {
    emitModifiers(node, node.modifiers);
    writeKeyword('constructor');
    emitSignatureAndBody(node, emitSignatureHead);
  }
  function emitAccessorDeclaration(node: AccessorDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword(node.kind === Syntax.GetAccessor ? 'get' : 'set');
    writeSpace();
    emit(node.name);
    emitSignatureAndBody(node, emitSignatureHead);
  }
  function emitCallSignature(node: CallSignatureDeclaration) {
    pushNameGenerationScope(node);
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emitTypeParameters(node, node.typeParameters);
    emitParameters(node, node.parameters);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
    popNameGenerationScope(node);
  }
  function emitConstructSignature(node: ConstructSignatureDeclaration) {
    pushNameGenerationScope(node);
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('new');
    writeSpace();
    emitTypeParameters(node, node.typeParameters);
    emitParameters(node, node.parameters);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
    popNameGenerationScope(node);
  }
  function emitIndexSignature(node: IndexSignatureDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emitParametersForIndexSignature(node, node.parameters);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
  }
  function emitSemicolonClassElement() {
    writeTrailingSemicolon();
  }
  function emitTypePredicate(node: TypePredicateNode) {
    if (node.assertsModifier) {
      emit(node.assertsModifier);
      writeSpace();
    }
    emit(node.parameterName);
    if (node.type) {
      writeSpace();
      writeKeyword('is');
      writeSpace();
      emit(node.type);
    }
  }
  function emitTypeReference(node: TypeReferenceNode) {
    emit(node.typeName);
    emitTypeArguments(node, node.typeArguments);
  }
  function emitFunctionType(node: FunctionTypeNode) {
    pushNameGenerationScope(node);
    emitTypeParameters(node, node.typeParameters);
    emitParametersForArrow(node, node.parameters);
    writeSpace();
    writePunctuation('=>');
    writeSpace();
    emit(node.type);
    popNameGenerationScope(node);
  }
  function emitDocFunctionType(node: DocFunctionType) {
    writeKeyword('function');
    emitParameters(node, node.parameters);
    writePunctuation(':');
    emit(node.type);
  }
  function emitDocNullableType(node: DocNullableType) {
    writePunctuation('?');
    emit(node.type);
  }
  function emitDocNonNullableType(node: DocNonNullableType) {
    writePunctuation('!');
    emit(node.type);
  }
  function emitDocOptionalType(node: DocOptionalType) {
    emit(node.type);
    writePunctuation('=');
  }
  function emitConstructorType(node: ConstructorTypeNode) {
    pushNameGenerationScope(node);
    writeKeyword('new');
    writeSpace();
    emitTypeParameters(node, node.typeParameters);
    emitParameters(node, node.parameters);
    writeSpace();
    writePunctuation('=>');
    writeSpace();
    emit(node.type);
    popNameGenerationScope(node);
  }
  function emitTypeQuery(node: TypeQueryNode) {
    writeKeyword('typeof');
    writeSpace();
    emit(node.exprName);
  }
  function emitTypeLiteral(node: TypeLiteralNode) {
    writePunctuation('{');
    const flags = qc.get.emitFlags(node) & EmitFlags.SingleLine ? ListFormat.SingleLineTypeLiteralMembers : ListFormat.MultiLineTypeLiteralMembers;
    emitList(node, node.members, flags | ListFormat.NoSpaceIfEmpty);
    writePunctuation('}');
  }
  function emitArrayType(node: ArrayTypeNode) {
    emit(node.elementType);
    writePunctuation('[');
    writePunctuation(']');
  }
  function emitRestOrDocVariadicType(node: RestTypeNode | DocVariadicType) {
    writePunctuation('...');
    emit(node.type);
  }
  function emitTupleType(node: TupleTypeNode) {
    emitTokenWithComment(Syntax.OpenBracketToken, node.pos, writePunctuation, node);
    const flags = qc.get.emitFlags(node) & EmitFlags.SingleLine ? ListFormat.SingleLineTupleTypeElements : ListFormat.MultiLineTupleTypeElements;
    emitList(node, node.elements, flags | ListFormat.NoSpaceIfEmpty);
    emitTokenWithComment(Syntax.CloseBracketToken, node.elements.end, writePunctuation, node);
  }
  function emitNamedTupleMember(node: NamedTupleMember) {
    emit(node.dot3Token);
    emit(node.name);
    emit(node.questionToken);
    emitTokenWithComment(Syntax.ColonToken, node.name.end, writePunctuation, node);
    writeSpace();
    emit(node.type);
  }
  function emitOptionalType(node: OptionalTypeNode) {
    emit(node.type);
    writePunctuation('?');
  }
  function emitUnionType(node: UnionTypeNode) {
    emitList(node, node.types, ListFormat.UnionTypeConstituents);
  }
  function emitIntersectionType(node: IntersectionTypeNode) {
    emitList(node, node.types, ListFormat.IntersectionTypeConstituents);
  }
  function emitConditionalType(node: ConditionalTypeNode) {
    emit(node.checkType);
    writeSpace();
    writeKeyword('extends');
    writeSpace();
    emit(node.extendsType);
    writeSpace();
    writePunctuation('?');
    writeSpace();
    emit(node.trueType);
    writeSpace();
    writePunctuation(':');
    writeSpace();
    emit(node.falseType);
  }
  function emitInferType(node: InferTypeNode) {
    writeKeyword('infer');
    writeSpace();
    emit(node.typeParameter);
  }
  function emitParenthesizedType(node: ParenthesizedTypeNode) {
    writePunctuation('(');
    emit(node.type);
    writePunctuation(')');
  }
  function emitThisType() {
    writeKeyword('this');
  }
  function emitTypeOperator(node: TypeOperatorNode) {
    writeTokenText(node.operator, writeKeyword);
    writeSpace();
    emit(node.type);
  }
  function emitIndexedAccessType(node: IndexedAccessTypeNode) {
    emit(node.objectType);
    writePunctuation('[');
    emit(node.indexType);
    writePunctuation(']');
  }
  function emitMappedType(node: MappedTypeNode) {
    const emitFlags = qc.get.emitFlags(node);
    writePunctuation('{');
    if (emitFlags & EmitFlags.SingleLine) {
      writeSpace();
    } else {
      writeLine();
      increaseIndent();
    }
    if (node.readonlyToken) {
      emit(node.readonlyToken);
      if (node.readonlyToken.kind !== Syntax.ReadonlyKeyword) {
        writeKeyword('readonly');
      }
      writeSpace();
    }
    writePunctuation('[');
    pipelineEmit(EmitHint.MappedTypeParameter, node.typeParameter);
    writePunctuation(']');
    if (node.questionToken) {
      emit(node.questionToken);
      if (node.questionToken.kind !== Syntax.QuestionToken) {
        writePunctuation('?');
      }
    }
    writePunctuation(':');
    writeSpace();
    emit(node.type);
    writeTrailingSemicolon();
    if (emitFlags & EmitFlags.SingleLine) {
      writeSpace();
    } else {
      writeLine();
      decreaseIndent();
    }
    writePunctuation('}');
  }
  function emitLiteralType(node: LiteralTypeNode) {
    emitExpression(node.literal);
  }
  function emitImportTypeNode(node: ImportTypeNode) {
    if (node.isTypeOf) {
      writeKeyword('typeof');
      writeSpace();
    }
    writeKeyword('import');
    writePunctuation('(');
    emit(node.argument);
    writePunctuation(')');
    if (node.qualifier) {
      writePunctuation('.');
      emit(node.qualifier);
    }
    emitTypeArguments(node, node.typeArguments);
  }
  function emitObjectBindingPattern(node: ObjectBindingPattern) {
    writePunctuation('{');
    emitList(node, node.elements, ListFormat.ObjectBindingPatternElements);
    writePunctuation('}');
  }
  function emitArrayBindingPattern(node: ArrayBindingPattern) {
    writePunctuation('[');
    emitList(node, node.elements, ListFormat.ArrayBindingPatternElements);
    writePunctuation(']');
  }
  function emitBindingElement(node: BindingElement) {
    emit(node.dot3Token);
    if (node.propertyName) {
      emit(node.propertyName);
      writePunctuation(':');
      writeSpace();
    }
    emit(node.name);
    emitIniter(node.initer, node.name.end, node);
  }
  function emitArrayLiteralExpression(node: ArrayLiteralExpression) {
    const elements = node.elements;
    const preferNewLine = node.multiLine ? ListFormat.PreferNewLine : ListFormat.None;
    emitExpressionList(node, elements, ListFormat.ArrayLiteralExpressionElements | preferNewLine);
  }
  function emitObjectLiteralExpression(node: ObjectLiteralExpression) {
    forEach(node.properties, generateMemberNames);
    const indentedFlag = qc.get.emitFlags(node) & EmitFlags.Indented;
    if (indentedFlag) {
      increaseIndent();
    }
    const preferNewLine = node.multiLine ? ListFormat.PreferNewLine : ListFormat.None;
    const allowTrailingComma = !qc.is.jsonSourceFile(currentSourceFile!) ? ListFormat.AllowTrailingComma : ListFormat.None;
    emitList(node, node.properties, ListFormat.ObjectLiteralExpressionProperties | allowTrailingComma | preferNewLine);
    if (indentedFlag) {
      decreaseIndent();
    }
  }
  function emitPropertyAccessExpression(node: PropertyAccessExpression) {
    const expression = cast(emitExpression(node.expression), isExpression);
    const token = node.questionDotToken || (createNode(Syntax.DotToken, node.expression.end, node.name.pos) as DotToken);
    const linesBeforeDot = linesBetweenNodes(node, node.expression, token);
    const linesAfterDot = linesBetweenNodes(node, token, node.name);
    writeLinesAndIndent(linesBeforeDot, false);
    const shouldEmitDotDot = token.kind !== Syntax.QuestionDotToken && mayNeedDotDotForPropertyAccess(expression) && !writer.hasTrailingComment() && !writer.hasTrailingWhitespace();
    if (shouldEmitDotDot) {
      writePunctuation('.');
    }
    if (node.questionDotToken) {
      emit(token);
    } else {
      emitTokenWithComment(token.kind, node.expression.end, writePunctuation, node);
    }
    writeLinesAndIndent(linesAfterDot, false);
    emit(node.name);
    decreaseIndentIf(linesBeforeDot, linesAfterDot);
  }
  function mayNeedDotDotForPropertyAccess(expression: Expression) {
    expression = skipPartiallyEmittedExpressions(expression);
    if (qc.is.kind(qc.NumericLiteral, expression)) {
      const text = getLiteralTextOfNode(<LiteralExpression>expression, false);
      return !expression.numericLiteralFlags && !stringContains(text, Token.toString(Syntax.DotToken)!);
    } else if (qc.is.accessExpression(expression)) {
      const constantValue = getConstantValue(expression);
      return typeof constantValue === 'number' && isFinite(constantValue) && Math.floor(constantValue) === constantValue;
    }
    return;
  }
  function emitElementAccessExpression(node: ElementAccessExpression) {
    emitExpression(node.expression);
    emit(node.questionDotToken);
    emitTokenWithComment(Syntax.OpenBracketToken, node.expression.end, writePunctuation, node);
    emitExpression(node.argumentExpression);
    emitTokenWithComment(Syntax.CloseBracketToken, node.argumentExpression.end, writePunctuation, node);
  }
  function emitCallExpression(node: CallExpression) {
    emitExpression(node.expression);
    emit(node.questionDotToken);
    emitTypeArguments(node, node.typeArguments);
    emitExpressionList(node, node.arguments, ListFormat.CallExpressionArguments);
  }
  function emitNewExpression(node: NewExpression) {
    emitTokenWithComment(Syntax.NewKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
    emitTypeArguments(node, node.typeArguments);
    emitExpressionList(node, node.arguments, ListFormat.NewExpressionArguments);
  }
  function emitTaggedTemplateExpression(node: TaggedTemplateExpression) {
    emitExpression(node.tag);
    emitTypeArguments(node, node.typeArguments);
    writeSpace();
    emitExpression(node.template);
  }
  function emitTypeAssertionExpression(node: TypeAssertion) {
    writePunctuation('<');
    emit(node.type);
    writePunctuation('>');
    emitExpression(node.expression);
  }
  function emitParenthesizedExpression(node: ParenthesizedExpression) {
    const openParenPos = emitTokenWithComment(Syntax.OpenParenToken, node.pos, writePunctuation, node);
    const indented = writeLineSeparatorsAndIndentBefore(node.expression, node);
    emitExpression(node.expression);
    writeLineSeparatorsAfter(node.expression, node);
    decreaseIndentIf(indented);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression ? node.expression.end : openParenPos, writePunctuation, node);
  }
  function emitFunctionExpression(node: FunctionExpression) {
    generateNameIfNeeded(node.name);
    emitFunctionDeclarationOrExpression(node);
  }
  function emitArrowFunction(node: ArrowFunction) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emitSignatureAndBody(node, emitArrowFunctionHead);
  }
  function emitArrowFunctionHead(node: ArrowFunction) {
    emitTypeParameters(node, node.typeParameters);
    emitParametersForArrow(node, node.parameters);
    emitTypeAnnotation(node.type);
    writeSpace();
    emit(node.equalsGreaterThanToken);
  }
  function emitDeleteExpression(node: DeleteExpression) {
    emitTokenWithComment(Syntax.DeleteKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
  }
  function emitTypeOfExpression(node: TypeOfExpression) {
    emitTokenWithComment(Syntax.TypeOfKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
  }
  function emitVoidExpression(node: VoidExpression) {
    emitTokenWithComment(Syntax.VoidKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
  }
  function emitAwaitExpression(node: AwaitExpression) {
    emitTokenWithComment(Syntax.AwaitKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
  }
  function emitPrefixUnaryExpression(node: PrefixUnaryExpression) {
    writeTokenText(node.operator, writeOperator);
    if (shouldEmitWhitespaceBeforeOperand(node)) {
      writeSpace();
    }
    emitExpression(node.operand);
  }
  function shouldEmitWhitespaceBeforeOperand(node: PrefixUnaryExpression) {
    const operand = node.operand;
    return (
      operand.kind === Syntax.PrefixUnaryExpression &&
      ((node.operator === Syntax.PlusToken && ((<PrefixUnaryExpression>operand).operator === Syntax.PlusToken || (<PrefixUnaryExpression>operand).operator === Syntax.Plus2Token)) ||
        (node.operator === Syntax.MinusToken && ((<PrefixUnaryExpression>operand).operator === Syntax.MinusToken || (<PrefixUnaryExpression>operand).operator === Syntax.Minus2Token)))
    );
  }
  function emitPostfixUnaryExpression(node: PostfixUnaryExpression) {
    emitExpression(node.operand);
    writeTokenText(node.operator, writeOperator);
  }
  const enum EmitBinaryExpressionState {
    EmitLeft,
    EmitRight,
    FinishEmit,
  }
  function emitBinaryExpression(node: BinaryExpression) {
    const nodeStack = [node];
    const stateStack = [EmitBinaryExpressionState.EmitLeft];
    let stackIndex = 0;
    while (stackIndex >= 0) {
      node = nodeStack[stackIndex];
      switch (stateStack[stackIndex]) {
        case EmitBinaryExpressionState.EmitLeft: {
          maybePipelineEmitExpression(node.left);
          break;
        }
        case EmitBinaryExpressionState.EmitRight: {
          const isCommaOperator = node.operatorToken.kind !== Syntax.CommaToken;
          const linesBeforeOperator = linesBetweenNodes(node, node.left, node.operatorToken);
          const linesAfterOperator = linesBetweenNodes(node, node.operatorToken, node.right);
          writeLinesAndIndent(linesBeforeOperator, isCommaOperator);
          emitLeadingCommentsOfPosition(node.operatorToken.pos);
          writeTokenNode(node.operatorToken, node.operatorToken.kind === Syntax.InKeyword ? writeKeyword : writeOperator);
          emitTrailingCommentsOfPosition(node.operatorToken.end, true);
          writeLinesAndIndent(linesAfterOperator, true);
          maybePipelineEmitExpression(node.right);
          break;
        }
        case EmitBinaryExpressionState.FinishEmit: {
          const linesBeforeOperator = linesBetweenNodes(node, node.left, node.operatorToken);
          const linesAfterOperator = linesBetweenNodes(node, node.operatorToken, node.right);
          decreaseIndentIf(linesBeforeOperator, linesAfterOperator);
          stackIndex--;
          break;
        }
        default:
          return fail(`Invalid state ${stateStack[stackIndex]} for emitBinaryExpressionWorker`);
      }
    }
    function maybePipelineEmitExpression(next: Expression) {
      stateStack[stackIndex]++;
      const savedLastNode = lastNode;
      const savedLastSubstitution = lastSubstitution;
      lastNode = next;
      lastSubstitution = undefined;
      const pipelinePhase = getPipelinePhase(PipelinePhase.Notification, EmitHint.Expression, next);
      if (pipelinePhase === pipelineEmitWithHint && qc.is.kind(qc.next, BinaryExpression)) {
        stackIndex++;
        stateStack[stackIndex] = EmitBinaryExpressionState.EmitLeft;
        nodeStack[stackIndex] = next;
      } else {
        pipelinePhase(EmitHint.Expression, next);
      }
      qu.assert(lastNode === next);
      lastNode = savedLastNode;
      lastSubstitution = savedLastSubstitution;
    }
  }
  function emitConditionalExpression(node: ConditionalExpression) {
    const linesBeforeQuestion = linesBetweenNodes(node, node.condition, node.questionToken);
    const linesAfterQuestion = linesBetweenNodes(node, node.questionToken, node.whenTrue);
    const linesBeforeColon = linesBetweenNodes(node, node.whenTrue, node.colonToken);
    const linesAfterColon = linesBetweenNodes(node, node.colonToken, node.whenFalse);
    emitExpression(node.condition);
    writeLinesAndIndent(linesBeforeQuestion, true);
    emit(node.questionToken);
    writeLinesAndIndent(linesAfterQuestion, true);
    emitExpression(node.whenTrue);
    decreaseIndentIf(linesBeforeQuestion, linesAfterQuestion);
    writeLinesAndIndent(linesBeforeColon, true);
    emit(node.colonToken);
    writeLinesAndIndent(linesAfterColon, true);
    emitExpression(node.whenFalse);
    decreaseIndentIf(linesBeforeColon, linesAfterColon);
  }
  function emitTemplateExpression(node: TemplateExpression) {
    emit(node.head);
    emitList(node, node.templateSpans, ListFormat.TemplateExpressionSpans);
  }
  function emitYieldExpression(node: YieldExpression) {
    emitTokenWithComment(Syntax.YieldKeyword, node.pos, writeKeyword, node);
    emit(node.asteriskToken);
    emitExpressionWithLeadingSpace(node.expression);
  }
  function emitSpreadExpression(node: SpreadElement) {
    emitTokenWithComment(Syntax.Dot3Token, node.pos, writePunctuation, node);
    emitExpression(node.expression);
  }
  function emitClassExpression(node: ClassExpression) {
    generateNameIfNeeded(node.name);
    emitClassDeclarationOrExpression(node);
  }
  function emitExpressionWithTypeArguments(node: ExpressionWithTypeArguments) {
    emitExpression(node.expression);
    emitTypeArguments(node, node.typeArguments);
  }
  function emitAsExpression(node: AsExpression) {
    emitExpression(node.expression);
    if (node.type) {
      writeSpace();
      writeKeyword('as');
      writeSpace();
      emit(node.type);
    }
  }
  function emitNonNullExpression(node: NonNullExpression) {
    emitExpression(node.expression);
    writeOperator('!');
  }
  function emitMetaProperty(node: MetaProperty) {
    writeToken(node.keywordToken, node.pos, writePunctuation);
    writePunctuation('.');
    emit(node.name);
  }
  function emitTemplateSpan(node: TemplateSpan) {
    emitExpression(node.expression);
    emit(node.literal);
  }
  function emitBlock(node: Block) {
    emitBlockStatements(node, !node.multiLine && isEmptyBlock(node));
  }
  function emitBlockStatements(node: BlockLike, forceSingleLine: boolean) {
    emitTokenWithComment(Syntax.OpenBraceToken, node.pos, writePunctuation, node);
    const format = forceSingleLine || qc.get.emitFlags(node) & EmitFlags.SingleLine ? ListFormat.SingleLineBlockStatements : ListFormat.MultiLineBlockStatements;
    emitList(node, node.statements, format);
    emitTokenWithComment(Syntax.CloseBraceToken, node.statements.end, writePunctuation, !!(format & ListFormat.MultiLine));
  }
  function emitVariableStatement(node: VariableStatement) {
    emitModifiers(node, node.modifiers);
    emit(node.declarationList);
    writeTrailingSemicolon();
  }
  function emitEmptyStatement(isEmbeddedStatement: boolean) {
    if (isEmbeddedStatement) {
      writePunctuation(';');
    } else {
      writeTrailingSemicolon();
    }
  }
  function emitExpressionStatement(node: ExpressionStatement) {
    emitExpression(node.expression);
    if (!qc.is.jsonSourceFile(currentSourceFile!) || isSynthesized(node.expression)) {
      writeTrailingSemicolon();
    }
  }
  function emitIfStatement(node: IfStatement) {
    const openParenPos = emitTokenWithComment(Syntax.IfKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitExpression(node.expression);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression.end, writePunctuation, node);
    emitEmbeddedStatement(node, node.thenStatement);
    if (node.elseStatement) {
      writeLineOrSpace(node);
      emitTokenWithComment(Syntax.ElseKeyword, node.thenStatement.end, writeKeyword, node);
      if (node.elseStatement.kind === Syntax.IfStatement) {
        writeSpace();
        emit(node.elseStatement);
      } else {
        emitEmbeddedStatement(node, node.elseStatement);
      }
    }
  }
  function emitWhileClause(node: WhileStatement | DoStatement, startPos: number) {
    const openParenPos = emitTokenWithComment(Syntax.WhileKeyword, startPos, writeKeyword, node);
    writeSpace();
    emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitExpression(node.expression);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression.end, writePunctuation, node);
  }
  function emitDoStatement(node: DoStatement) {
    emitTokenWithComment(Syntax.DoKeyword, node.pos, writeKeyword, node);
    emitEmbeddedStatement(node, node.statement);
    if (qc.is.kind(qc.Block, node.statement)) {
      writeSpace();
    } else {
      writeLineOrSpace(node);
    }
    emitWhileClause(node, node.statement.end);
    writeTrailingSemicolon();
  }
  function emitWhileStatement(node: WhileStatement) {
    emitWhileClause(node, node.pos);
    emitEmbeddedStatement(node, node.statement);
  }
  function emitForStatement(node: ForStatement) {
    const openParenPos = emitTokenWithComment(Syntax.ForKeyword, node.pos, writeKeyword, node);
    writeSpace();
    let pos = emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitForBinding(node.initer);
    pos = emitTokenWithComment(Syntax.SemicolonToken, node.initer ? node.initer.end : pos, writePunctuation, node);
    emitExpressionWithLeadingSpace(node.condition);
    pos = emitTokenWithComment(Syntax.SemicolonToken, node.condition ? node.condition.end : pos, writePunctuation, node);
    emitExpressionWithLeadingSpace(node.incrementor);
    emitTokenWithComment(Syntax.CloseParenToken, node.incrementor ? node.incrementor.end : pos, writePunctuation, node);
    emitEmbeddedStatement(node, node.statement);
  }
  function emitForInStatement(node: ForInStatement) {
    const openParenPos = emitTokenWithComment(Syntax.ForKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitForBinding(node.initer);
    writeSpace();
    emitTokenWithComment(Syntax.InKeyword, node.initer.end, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression.end, writePunctuation, node);
    emitEmbeddedStatement(node, node.statement);
  }
  function emitForOfStatement(node: ForOfStatement) {
    const openParenPos = emitTokenWithComment(Syntax.ForKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitWithTrailingSpace(node.awaitModifier);
    emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitForBinding(node.initer);
    writeSpace();
    emitTokenWithComment(Syntax.OfKeyword, node.initer.end, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression.end, writePunctuation, node);
    emitEmbeddedStatement(node, node.statement);
  }
  function emitForBinding(node: VariableDeclarationList | Expression | undefined) {
    if (node !== undefined) {
      if (node.kind === Syntax.VariableDeclarationList) {
        emit(node);
      } else {
        emitExpression(node);
      }
    }
  }
  function emitContinueStatement(node: ContinueStatement) {
    emitTokenWithComment(Syntax.ContinueKeyword, node.pos, writeKeyword, node);
    emitWithLeadingSpace(node.label);
    writeTrailingSemicolon();
  }
  function emitBreakStatement(node: BreakStatement) {
    emitTokenWithComment(Syntax.BreakKeyword, node.pos, writeKeyword, node);
    emitWithLeadingSpace(node.label);
    writeTrailingSemicolon();
  }
  function emitTokenWithComment(token: Syntax, pos: number, writer: (s: string) => void, contextNode: Node, indentLeading?: boolean) {
    const node = qc.get.parseTreeOf(contextNode);
    const isSimilarNode = node && node.kind === contextNode.kind;
    const startPos = pos;
    if (isSimilarNode && currentSourceFile) {
      pos = qy.skipTrivia(currentSourceFile.text, pos);
    }
    if (emitLeadingCommentsOfPosition && isSimilarNode && contextNode.pos !== startPos) {
      const needsIndent = indentLeading && currentSourceFile && !onSameLine(startPos, pos, currentSourceFile);
      if (needsIndent) {
        increaseIndent();
      }
      emitLeadingCommentsOfPosition(startPos);
      if (needsIndent) {
        decreaseIndent();
      }
    }
    pos = writeTokenText(token, writer, pos);
    if (emitTrailingCommentsOfPosition && isSimilarNode && contextNode.end !== pos) {
      emitTrailingCommentsOfPosition(pos, true);
    }
    return pos;
  }
  function emitReturnStatement(node: ReturnStatement) {
    emitTokenWithComment(Syntax.ReturnKeyword, node.pos, writeKeyword, node);
    emitExpressionWithLeadingSpace(node.expression);
    writeTrailingSemicolon();
  }
  function emitWithStatement(node: WithStatement) {
    const openParenPos = emitTokenWithComment(Syntax.WithKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitExpression(node.expression);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression.end, writePunctuation, node);
    emitEmbeddedStatement(node, node.statement);
  }
  function emitSwitchStatement(node: SwitchStatement) {
    const openParenPos = emitTokenWithComment(Syntax.SwitchKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitExpression(node.expression);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression.end, writePunctuation, node);
    writeSpace();
    emit(node.caseBlock);
  }
  function emitLabeledStatement(node: LabeledStatement) {
    emit(node.label);
    emitTokenWithComment(Syntax.ColonToken, node.label.end, writePunctuation, node);
    writeSpace();
    emit(node.statement);
  }
  function emitThrowStatement(node: ThrowStatement) {
    emitTokenWithComment(Syntax.ThrowKeyword, node.pos, writeKeyword, node);
    emitExpressionWithLeadingSpace(node.expression);
    writeTrailingSemicolon();
  }
  function emitTryStatement(node: TryStatement) {
    emitTokenWithComment(Syntax.TryKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emit(node.tryBlock);
    if (node.catchClause) {
      writeLineOrSpace(node);
      emit(node.catchClause);
    }
    if (node.finallyBlock) {
      writeLineOrSpace(node);
      emitTokenWithComment(Syntax.FinallyKeyword, (node.catchClause || node.tryBlock).end, writeKeyword, node);
      writeSpace();
      emit(node.finallyBlock);
    }
  }
  function emitDebuggerStatement(node: DebuggerStatement) {
    writeToken(Syntax.DebuggerKeyword, node.pos, writeKeyword);
    writeTrailingSemicolon();
  }
  function emitVariableDeclaration(node: VariableDeclaration) {
    emit(node.name);
    emit(node.exclamationToken);
    emitTypeAnnotation(node.type);
    emitIniter(node.initer, node.type ? node.type.end : node.name.end, node);
  }
  function emitVariableDeclarationList(node: VariableDeclarationList) {
    writeKeyword(qc.is.aLet(node) ? 'let' : qc.is.varConst(node) ? 'const' : 'var');
    writeSpace();
    emitList(node, node.declarations, ListFormat.VariableDeclarationList);
  }
  function emitFunctionDeclaration(node: FunctionDeclaration) {
    emitFunctionDeclarationOrExpression(node);
  }
  function emitFunctionDeclarationOrExpression(node: FunctionDeclaration | FunctionExpression) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('function');
    emit(node.asteriskToken);
    writeSpace();
    emitIdentifierName(node.name);
    emitSignatureAndBody(node, emitSignatureHead);
  }
  function emitBlockCallback(_hint: EmitHint, body: Node): void {
    emitBlockFunctionBody(<Block>body);
  }
  function emitSignatureAndBody(node: FunctionLikeDeclaration, emitSignatureHead: (node: SignatureDeclaration) => void) {
    const body = node.body;
    if (body) {
      if (qc.is.kind(qc.Block, body)) {
        const indentedFlag = qc.get.emitFlags(node) & EmitFlags.Indented;
        if (indentedFlag) {
          increaseIndent();
        }
        pushNameGenerationScope(node);
        forEach(node.parameters, generateNames);
        generateNames(node.body);
        emitSignatureHead(node);
        if (onEmitNode) {
          onEmitNode(EmitHint.Unspecified, body, emitBlockCallback);
        } else {
          emitBlockFunctionBody(body);
        }
        popNameGenerationScope(node);
        if (indentedFlag) {
          decreaseIndent();
        }
      } else {
        emitSignatureHead(node);
        writeSpace();
        emitExpression(body);
      }
    } else {
      emitSignatureHead(node);
      writeTrailingSemicolon();
    }
  }
  function emitSignatureHead(node: FunctionDeclaration | FunctionExpression | MethodDeclaration | AccessorDeclaration | ConstructorDeclaration) {
    emitTypeParameters(node, node.typeParameters);
    emitParameters(node, node.parameters);
    emitTypeAnnotation(node.type);
  }
  function shouldEmitBlockFunctionBodyOnSingleLine(body: Block) {
    if (qc.get.emitFlags(body) & EmitFlags.SingleLine) return true;
    if (body.multiLine) return false;
    if (!isSynthesized(body) && !rangeIsOnSingleLine(body, currentSourceFile!)) return false;
    if (getLeadingLineTerminatorCount(body, body.statements, ListFormat.PreserveLines) || getClosingLineTerminatorCount(body, body.statements, ListFormat.PreserveLines)) return false;
    let previousStatement: Statement | undefined;
    for (const statement of body.statements) {
      if (getSeparatingLineTerminatorCount(previousStatement, statement, ListFormat.PreserveLines) > 0) return false;
      previousStatement = statement;
    }
    return true;
  }
  function emitBlockFunctionBody(body: Block) {
    writeSpace();
    writePunctuation('{');
    increaseIndent();
    const emitBlockFunctionBody = shouldEmitBlockFunctionBodyOnSingleLine(body) ? emitBlockFunctionBodyOnSingleLine : emitBlockFunctionBodyWorker;
    if (emitBodyWithDetachedComments) {
      emitBodyWithDetachedComments(body, body.statements, emitBlockFunctionBody);
    } else {
      emitBlockFunctionBody(body);
    }
    decreaseIndent();
    writeToken(Syntax.CloseBraceToken, body.statements.end, writePunctuation, body);
  }
  function emitBlockFunctionBodyOnSingleLine(body: Block) {
    emitBlockFunctionBodyWorker(body, true);
  }
  function emitBlockFunctionBodyWorker(body: Block, emitBlockFunctionBodyOnSingleLine?: boolean) {
    const statementOffset = emitPrologueDirectives(body.statements);
    const pos = writer.getTextPos();
    emitHelpers(body);
    if (statementOffset === 0 && pos === writer.getTextPos() && emitBlockFunctionBodyOnSingleLine) {
      decreaseIndent();
      emitList(body, body.statements, ListFormat.SingleLineFunctionBodyStatements);
      increaseIndent();
    } else {
      emitList(body, body.statements, ListFormat.MultiLineFunctionBodyStatements, statementOffset);
    }
  }
  function emitClassDeclaration(node: ClassDeclaration) {
    emitClassDeclarationOrExpression(node);
  }
  function emitClassDeclarationOrExpression(node: ClassDeclaration | ClassExpression) {
    forEach(node.members, generateMemberNames);
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('class');
    if (node.name) {
      writeSpace();
      emitIdentifierName(node.name);
    }
    const indentedFlag = qc.get.emitFlags(node) & EmitFlags.Indented;
    if (indentedFlag) {
      increaseIndent();
    }
    emitTypeParameters(node, node.typeParameters);
    emitList(node, node.heritageClauses, ListFormat.ClassHeritageClauses);
    writeSpace();
    writePunctuation('{');
    emitList(node, node.members, ListFormat.ClassMembers);
    writePunctuation('}');
    if (indentedFlag) {
      decreaseIndent();
    }
  }
  function emitInterfaceDeclaration(node: InterfaceDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('interface');
    writeSpace();
    emit(node.name);
    emitTypeParameters(node, node.typeParameters);
    emitList(node, node.heritageClauses, ListFormat.HeritageClauses);
    writeSpace();
    writePunctuation('{');
    emitList(node, node.members, ListFormat.InterfaceMembers);
    writePunctuation('}');
  }
  function emitTypeAliasDeclaration(node: TypeAliasDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('type');
    writeSpace();
    emit(node.name);
    emitTypeParameters(node, node.typeParameters);
    writeSpace();
    writePunctuation('=');
    writeSpace();
    emit(node.type);
    writeTrailingSemicolon();
  }
  function emitEnumDeclaration(node: EnumDeclaration) {
    emitModifiers(node, node.modifiers);
    writeKeyword('enum');
    writeSpace();
    emit(node.name);
    writeSpace();
    writePunctuation('{');
    emitList(node, node.members, ListFormat.EnumMembers);
    writePunctuation('}');
  }
  function emitModuleDeclaration(node: ModuleDeclaration) {
    emitModifiers(node, node.modifiers);
    if (~node.flags & NodeFlags.GlobalAugmentation) {
      writeKeyword(node.flags & NodeFlags.Namespace ? 'namespace' : 'module');
      writeSpace();
    }
    emit(node.name);
    let body = node.body;
    if (!body) return writeTrailingSemicolon();
    while (body.kind === Syntax.ModuleDeclaration) {
      writePunctuation('.');
      emit((<ModuleDeclaration>body).name);
      body = (<ModuleDeclaration>body).body!;
    }
    writeSpace();
    emit(body);
  }
  function emitModuleBlock(node: ModuleBlock) {
    pushNameGenerationScope(node);
    forEach(node.statements, generateNames);
    emitBlockStatements(node, isEmptyBlock(node));
    popNameGenerationScope(node);
  }
  function emitCaseBlock(node: CaseBlock) {
    emitTokenWithComment(Syntax.OpenBraceToken, node.pos, writePunctuation, node);
    emitList(node, node.clauses, ListFormat.CaseBlockClauses);
    emitTokenWithComment(Syntax.CloseBraceToken, node.clauses.end, writePunctuation, node, true);
  }
  function emitImportEqualsDeclaration(node: ImportEqualsDeclaration) {
    emitModifiers(node, node.modifiers);
    emitTokenWithComment(Syntax.ImportKeyword, node.modifiers ? node.modifiers.end : node.pos, writeKeyword, node);
    writeSpace();
    emit(node.name);
    writeSpace();
    emitTokenWithComment(Syntax.EqualsToken, node.name.end, writePunctuation, node);
    writeSpace();
    emitModuleReference(node.moduleReference);
    writeTrailingSemicolon();
  }
  function emitModuleReference(node: ModuleReference) {
    if (node.kind === Syntax.Identifier) {
      emitExpression(node);
    } else {
      emit(node);
    }
  }
  function emitImportDeclaration(node: ImportDeclaration) {
    emitModifiers(node, node.modifiers);
    emitTokenWithComment(Syntax.ImportKeyword, node.modifiers ? node.modifiers.end : node.pos, writeKeyword, node);
    writeSpace();
    if (node.importClause) {
      emit(node.importClause);
      writeSpace();
      emitTokenWithComment(Syntax.FromKeyword, node.importClause.end, writeKeyword, node);
      writeSpace();
    }
    emitExpression(node.moduleSpecifier);
    writeTrailingSemicolon();
  }
  function emitImportClause(node: ImportClause) {
    if (node.isTypeOnly) {
      emitTokenWithComment(Syntax.TypeKeyword, node.pos, writeKeyword, node);
      writeSpace();
    }
    emit(node.name);
    if (node.name && node.namedBindings) {
      emitTokenWithComment(Syntax.CommaToken, node.name.end, writePunctuation, node);
      writeSpace();
    }
    emit(node.namedBindings);
  }
  function emitNamespaceImport(node: NamespaceImport) {
    const asPos = emitTokenWithComment(Syntax.AsteriskToken, node.pos, writePunctuation, node);
    writeSpace();
    emitTokenWithComment(Syntax.AsKeyword, asPos, writeKeyword, node);
    writeSpace();
    emit(node.name);
  }
  function emitNamedImports(node: NamedImports) {
    emitNamedImportsOrExports(node);
  }
  function emitImportSpecifier(node: ImportSpecifier) {
    emitImportOrExportSpecifier(node);
  }
  function emitExportAssignment(node: ExportAssignment) {
    const nextPos = emitTokenWithComment(Syntax.ExportKeyword, node.pos, writeKeyword, node);
    writeSpace();
    if (node.isExportEquals) {
      emitTokenWithComment(Syntax.EqualsToken, nextPos, writeOperator, node);
    } else {
      emitTokenWithComment(Syntax.DefaultKeyword, nextPos, writeKeyword, node);
    }
    writeSpace();
    emitExpression(node.expression);
    writeTrailingSemicolon();
  }
  function emitExportDeclaration(node: ExportDeclaration) {
    let nextPos = emitTokenWithComment(Syntax.ExportKeyword, node.pos, writeKeyword, node);
    writeSpace();
    if (node.isTypeOnly) {
      nextPos = emitTokenWithComment(Syntax.TypeKeyword, nextPos, writeKeyword, node);
      writeSpace();
    }
    if (node.exportClause) {
      emit(node.exportClause);
    } else {
      nextPos = emitTokenWithComment(Syntax.AsteriskToken, nextPos, writePunctuation, node);
    }
    if (node.moduleSpecifier) {
      writeSpace();
      const fromPos = node.exportClause ? node.exportClause.end : nextPos;
      emitTokenWithComment(Syntax.FromKeyword, fromPos, writeKeyword, node);
      writeSpace();
      emitExpression(node.moduleSpecifier);
    }
    writeTrailingSemicolon();
  }
  function emitNamespaceExportDeclaration(node: NamespaceExportDeclaration) {
    let nextPos = emitTokenWithComment(Syntax.ExportKeyword, node.pos, writeKeyword, node);
    writeSpace();
    nextPos = emitTokenWithComment(Syntax.AsKeyword, nextPos, writeKeyword, node);
    writeSpace();
    nextPos = emitTokenWithComment(Syntax.NamespaceKeyword, nextPos, writeKeyword, node);
    writeSpace();
    emit(node.name);
    writeTrailingSemicolon();
  }
  function emitNamespaceExport(node: NamespaceExport) {
    const asPos = emitTokenWithComment(Syntax.AsteriskToken, node.pos, writePunctuation, node);
    writeSpace();
    emitTokenWithComment(Syntax.AsKeyword, asPos, writeKeyword, node);
    writeSpace();
    emit(node.name);
  }
  function emitNamedExports(node: NamedExports) {
    emitNamedImportsOrExports(node);
  }
  function emitExportSpecifier(node: ExportSpecifier) {
    emitImportOrExportSpecifier(node);
  }
  function emitNamedImportsOrExports(node: NamedImportsOrExports) {
    writePunctuation('{');
    emitList(node, node.elements, ListFormat.NamedImportsOrExportsElements);
    writePunctuation('}');
  }
  function emitImportOrExportSpecifier(node: ImportOrExportSpecifier) {
    if (node.propertyName) {
      emit(node.propertyName);
      writeSpace();
      emitTokenWithComment(Syntax.AsKeyword, node.propertyName.end, writeKeyword, node);
      writeSpace();
    }
    emit(node.name);
  }
  function emitExternalModuleReference(node: ExternalModuleReference) {
    writeKeyword('require');
    writePunctuation('(');
    emitExpression(node.expression);
    writePunctuation(')');
  }
  function emitJsxElement(node: JsxElement) {
    emit(node.openingElement);
    emitList(node, node.children, ListFormat.JsxElementOrFragmentChildren);
    emit(node.closingElement);
  }
  function emitJsxSelfClosingElement(node: JsxSelfClosingElement) {
    writePunctuation('<');
    emitJsxTagName(node.tagName);
    emitTypeArguments(node, node.typeArguments);
    writeSpace();
    emit(node.attributes);
    writePunctuation('/>');
  }
  function emitJsxFragment(node: JsxFragment) {
    emit(node.openingFragment);
    emitList(node, node.children, ListFormat.JsxElementOrFragmentChildren);
    emit(node.closingFragment);
  }
  function emitJsxOpeningElementOrFragment(node: JsxOpeningElement | JsxOpeningFragment) {
    writePunctuation('<');
    if (qc.is.kind(qc.JsxOpeningElement, node)) {
      const indented = writeLineSeparatorsAndIndentBefore(node.tagName, node);
      emitJsxTagName(node.tagName);
      emitTypeArguments(node, node.typeArguments);
      if (node.attributes.properties && node.attributes.properties.length > 0) {
        writeSpace();
      }
      emit(node.attributes);
      writeLineSeparatorsAfter(node.attributes, node);
      decreaseIndentIf(indented);
    }
    writePunctuation('>');
  }
  function emitJsxText(node: JsxText) {
    writer.writeLiteral(node.text);
  }
  function emitJsxClosingElementOrFragment(node: JsxClosingElement | JsxClosingFragment) {
    writePunctuation('</');
    if (qc.is.kind(qc.JsxClosingElement, node)) {
      emitJsxTagName(node.tagName);
    }
    writePunctuation('>');
  }
  function emitJsxAttributes(node: JsxAttributes) {
    emitList(node, node.properties, ListFormat.JsxElementAttributes);
  }
  function emitJsxAttribute(node: JsxAttribute) {
    emit(node.name);
    emitNodeWithPrefix('=', writePunctuation, node.initer, emitJsxAttributeValue);
  }
  function emitJsxSpreadAttribute(node: JsxSpreadAttribute) {
    writePunctuation('{...');
    emitExpression(node.expression);
    writePunctuation('}');
  }
  function emitJsxExpression(node: JsxExpression) {
    if (node.expression) {
      writePunctuation('{');
      emit(node.dot3Token);
      emitExpression(node.expression);
      writePunctuation('}');
    }
  }
  function emitJsxTagName(node: JsxTagNameExpression) {
    if (node.kind === Syntax.Identifier) {
      emitExpression(node);
    } else {
      emit(node);
    }
  }
  function emitCaseClause(node: CaseClause) {
    emitTokenWithComment(Syntax.CaseKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
    emitCaseOrDefaultClauseRest(node, node.statements, node.expression.end);
  }
  function emitDefaultClause(node: DefaultClause) {
    const pos = emitTokenWithComment(Syntax.DefaultKeyword, node.pos, writeKeyword, node);
    emitCaseOrDefaultClauseRest(node, node.statements, pos);
  }
  function emitCaseOrDefaultClauseRest(parentNode: Node, statements: Nodes<Statement>, colonPos: number) {
    const emitAsSingleStatement = statements.length === 1 && (isSynthesized(parentNode) || isSynthesized(statements[0]) || startsOnSameLine(parentNode, statements[0], currentSourceFile!));
    let format = ListFormat.CaseOrDefaultClauseStatements;
    if (emitAsSingleStatement) {
      writeToken(Syntax.ColonToken, colonPos, writePunctuation, parentNode);
      writeSpace();
      format &= ~(ListFormat.MultiLine | ListFormat.Indented);
    } else {
      emitTokenWithComment(Syntax.ColonToken, colonPos, writePunctuation, parentNode);
    }
    emitList(parentNode, statements, format);
  }
  function emitHeritageClause(node: HeritageClause) {
    writeSpace();
    writeTokenText(node.token, writeKeyword);
    writeSpace();
    emitList(node, node.types, ListFormat.HeritageClauseTypes);
  }
  function emitCatchClause(node: CatchClause) {
    const openParenPos = emitTokenWithComment(Syntax.CatchKeyword, node.pos, writeKeyword, node);
    writeSpace();
    if (node.variableDeclaration) {
      emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
      emit(node.variableDeclaration);
      emitTokenWithComment(Syntax.CloseParenToken, node.variableDeclaration.end, writePunctuation, node);
      writeSpace();
    }
    emit(node.block);
  }
  function emitPropertyAssignment(node: PropertyAssignment) {
    emit(node.name);
    writePunctuation(':');
    writeSpace();
    const initer = node.initer;
    if (emitTrailingCommentsOfPosition && (qc.get.emitFlags(initer) & EmitFlags.NoLeadingComments) === 0) {
      const commentRange = getCommentRange(initer);
      emitTrailingCommentsOfPosition(commentRange.pos);
    }
    emitExpression(initer);
  }
  function emitShorthandPropertyAssignment(node: ShorthandPropertyAssignment) {
    emit(node.name);
    if (node.objectAssignmentIniter) {
      writeSpace();
      writePunctuation('=');
      writeSpace();
      emitExpression(node.objectAssignmentIniter);
    }
  }
  function emitSpreadAssignment(node: SpreadAssignment) {
    if (node.expression) {
      emitTokenWithComment(Syntax.Dot3Token, node.pos, writePunctuation, node);
      emitExpression(node.expression);
    }
  }
  function emitEnumMember(node: EnumMember) {
    emit(node.name);
    emitIniter(node.initer, node.name.end, node);
  }
  function emitDocSimpleTypedTag(tag: DocTypeTag | DocThisTag | DocEnumTag | DocReturnTag) {
    emitDocTagName(tag.tagName);
    emitDocTypeExpression(tag.typeExpression);
    emitDocComment(tag.comment);
  }
  function emitDocHeritageTag(tag: DocImplementsTag | DocAugmentsTag) {
    emitDocTagName(tag.tagName);
    writeSpace();
    writePunctuation('{');
    emit(tag.class);
    writePunctuation('}');
    emitDocComment(tag.comment);
  }
  function emitDocTemplateTag(tag: DocTemplateTag) {
    emitDocTagName(tag.tagName);
    emitDocTypeExpression(tag.constraint);
    writeSpace();
    emitList(tag, tag.typeParameters, ListFormat.CommaListElements);
    emitDocComment(tag.comment);
  }
  function emitDocTypedefTag(tag: DocTypedefTag) {
    emitDocTagName(tag.tagName);
    if (tag.typeExpression) {
      if (tag.typeExpression.kind === Syntax.DocTypeExpression) {
        emitDocTypeExpression(tag.typeExpression);
      } else {
        writeSpace();
        writePunctuation('{');
        write('Object');
        if (tag.typeExpression.isArrayType) {
          writePunctuation('[');
          writePunctuation(']');
        }
        writePunctuation('}');
      }
    }
    if (tag.fullName) {
      writeSpace();
      emit(tag.fullName);
    }
    emitDocComment(tag.comment);
    if (tag.typeExpression && tag.typeExpression.kind === Syntax.DocTypeLiteral) {
      emitDocTypeLiteral(tag.typeExpression);
    }
  }
  function emitDocCallbackTag(tag: DocCallbackTag) {
    emitDocTagName(tag.tagName);
    if (tag.name) {
      writeSpace();
      emit(tag.name);
    }
    emitDocComment(tag.comment);
    emitDocSignature(tag.typeExpression);
  }
  function emitDocSimpleTag(tag: DocTag) {
    emitDocTagName(tag.tagName);
    emitDocComment(tag.comment);
  }
  function emitDocTypeLiteral(lit: DocTypeLiteral) {
    emitList(lit, new Nodes(lit.docPropertyTags), ListFormat.DocComment);
  }
  function emitDocSignature(sig: DocSignature) {
    if (sig.typeParameters) {
      emitList(sig, new Nodes(sig.typeParameters), ListFormat.DocComment);
    }
    if (sig.parameters) {
      emitList(sig, new Nodes(sig.parameters), ListFormat.DocComment);
    }
    if (sig.type) {
      writeLine();
      writeSpace();
      writePunctuation('*');
      writeSpace();
      emit(sig.type);
    }
  }
  function emitDocPropertyLikeTag(param: DocPropertyLikeTag) {
    emitDocTagName(param.tagName);
    emitDocTypeExpression(param.typeExpression);
    writeSpace();
    if (param.isBracketed) {
      writePunctuation('[');
    }
    emit(param.name);
    if (param.isBracketed) {
      writePunctuation(']');
    }
    emitDocComment(param.comment);
  }
  function emitDocTagName(tagName: Identifier) {
    writePunctuation('@');
    emit(tagName);
  }
  function emitDocComment(comment: string | undefined) {
    if (comment) {
      writeSpace();
      write(comment);
    }
  }
  function emitDocTypeExpression(typeExpression: DocTypeExpression | undefined) {
    if (typeExpression) {
      writeSpace();
      writePunctuation('{');
      emit(typeExpression.type);
      writePunctuation('}');
    }
  }
  function emitSourceFile(node: SourceFile) {
    writeLine();
    const statements = node.statements;
    if (emitBodyWithDetachedComments) {
      const shouldEmitDetachedComment = statements.length === 0 || !qc.is.prologueDirective(statements[0]) || isSynthesized(statements[0]);
      if (shouldEmitDetachedComment) {
        emitBodyWithDetachedComments(node, statements, emitSourceFileWorker);
        return;
      }
    }
    emitSourceFileWorker(node);
  }
  function emitSyntheticTripleSlashReferencesIfNeeded(node: Bundle) {
    emitTripleSlashDirectives(!!node.hasNoDefaultLib, node.syntheticFileReferences || [], node.syntheticTypeReferences || [], node.syntheticLibReferences || []);
    for (const prepend of node.prepends) {
      if (qc.is.kind(qc.UnparsedSource, prepend) && prepend.syntheticReferences) {
        for (const ref of prepend.syntheticReferences) {
          emit(ref);
          writeLine();
        }
      }
    }
  }
  function emitTripleSlashDirectivesIfNeeded(node: SourceFile) {
    if (node.isDeclarationFile) emitTripleSlashDirectives(node.hasNoDefaultLib, node.referencedFiles, node.typeReferenceDirectives, node.libReferenceDirectives);
  }
  function emitTripleSlashDirectives(hasNoDefaultLib: boolean, files: readonly FileReference[], types: readonly FileReference[], libs: readonly FileReference[]) {
    if (hasNoDefaultLib) {
      const pos = writer.getTextPos();
      writeComment('');
      if (bundleFileInfo) bundleFileInfo.sections.push({ pos, end: writer.getTextPos(), kind: BundleFileSectionKind.NoDefaultLib });
      writeLine();
    }
    if (currentSourceFile && currentSourceFile.moduleName) {
      writeComment('');
      writeLine();
    }
    if (currentSourceFile && currentSourceFile.amdDependencies) {
      for (const dep of currentSourceFile.amdDependencies) {
        if (dep.name) {
          writeComment('');
        } else {
          writeComment('');
        }
        writeLine();
      }
    }
    for (const directive of files) {
      const pos = writer.getTextPos();
      writeComment('');
      if (bundleFileInfo) bundleFileInfo.sections.push({ pos, end: writer.getTextPos(), kind: BundleFileSectionKind.Reference, data: directive.fileName });
      writeLine();
    }
    for (const directive of types) {
      const pos = writer.getTextPos();
      writeComment('');
      if (bundleFileInfo) bundleFileInfo.sections.push({ pos, end: writer.getTextPos(), kind: BundleFileSectionKind.Type, data: directive.fileName });
      writeLine();
    }
    for (const directive of libs) {
      const pos = writer.getTextPos();
      writeComment('');
      if (bundleFileInfo) bundleFileInfo.sections.push({ pos, end: writer.getTextPos(), kind: BundleFileSectionKind.Lib, data: directive.fileName });
      writeLine();
    }
  }
  function emitSourceFileWorker(node: SourceFile) {
    const statements = node.statements;
    pushNameGenerationScope(node);
    forEach(node.statements, generateNames);
    emitHelpers(node);
    const index = findIndex(statements, (statement) => !qc.is.prologueDirective(statement));
    emitTripleSlashDirectivesIfNeeded(node);
    emitList(node, statements, ListFormat.MultiLine, index === -1 ? statements.length : index);
    popNameGenerationScope(node);
  }
  function emitPartiallyEmittedExpression(node: PartiallyEmittedExpression) {
    emitExpression(node.expression);
  }
  function emitCommaList(node: CommaListExpression) {
    emitExpressionList(node, node.elements, ListFormat.CommaListElements);
  }
  function emitPrologueDirectives(statements: readonly Node[], sourceFile?: SourceFile, seenPrologueDirectives?: qu.QMap<true>, recordBundleFileSection?: true): number {
    let needsToSetSourceFile = !!sourceFile;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (qc.is.prologueDirective(statement)) {
        const shouldEmitPrologueDirective = seenPrologueDirectives ? !seenPrologueDirectives.has(statement.expression.text) : true;
        if (shouldEmitPrologueDirective) {
          if (needsToSetSourceFile) {
            needsToSetSourceFile = false;
            setSourceFile(sourceFile);
          }
          writeLine();
          const pos = writer.getTextPos();
          emit(statement);
          if (recordBundleFileSection && bundleFileInfo) bundleFileInfo.sections.push({ pos, end: writer.getTextPos(), kind: BundleFileSectionKind.Prologue, data: statement.expression.text });
          if (seenPrologueDirectives) {
            seenPrologueDirectives.set(statement.expression.text, true);
          }
        }
      } else {
        return i;
      }
    }
    return statements.length;
  }
  function emitUnparsedPrologues(prologues: readonly UnparsedPrologue[], seenPrologueDirectives: qu.QMap<true>) {
    for (const prologue of prologues) {
      if (!seenPrologueDirectives.has(prologue.data)) {
        writeLine();
        const pos = writer.getTextPos();
        emit(prologue);
        if (bundleFileInfo) bundleFileInfo.sections.push({ pos, end: writer.getTextPos(), kind: BundleFileSectionKind.Prologue, data: prologue.data });
        if (seenPrologueDirectives) {
          seenPrologueDirectives.set(prologue.data, true);
        }
      }
    }
  }
  function emitPrologueDirectivesIfNeeded(sourceFileOrBundle: Bundle | SourceFile) {
    if (qc.is.kind(qc.SourceFile, sourceFileOrBundle)) {
      emitPrologueDirectives(sourceFileOrBundle.statements, sourceFileOrBundle);
    } else {
      const seenPrologueDirectives = createMap<true>();
      for (const prepend of sourceFileOrBundle.prepends) {
        emitUnparsedPrologues((prepend as UnparsedSource).prologues, seenPrologueDirectives);
      }
      for (const sourceFile of sourceFileOrBundle.sourceFiles) {
        emitPrologueDirectives(sourceFile.statements, sourceFile, seenPrologueDirectives, true);
      }
      setSourceFile(undefined);
    }
  }
  function getPrologueDirectivesFromBundledSourceFiles(bundle: Bundle): SourceFilePrologueInfo[] | undefined {
    const seenPrologueDirectives = createMap<true>();
    let prologues: SourceFilePrologueInfo[] | undefined;
    for (let index = 0; index < bundle.sourceFiles.length; index++) {
      const sourceFile = bundle.sourceFiles[index];
      let directives: SourceFilePrologueDirective[] | undefined;
      let end = 0;
      for (const statement of sourceFile.statements) {
        if (!qc.is.prologueDirective(statement)) break;
        if (seenPrologueDirectives.has(statement.expression.text)) continue;
        seenPrologueDirectives.set(statement.expression.text, true);
        (directives || (directives = [])).push({
          pos: statement.pos,
          end: statement.end,
          expression: {
            pos: statement.expression.pos,
            end: statement.expression.end,
            text: statement.expression.text,
          },
        });
        end = end < statement.end ? statement.end : end;
      }
      if (directives) (prologues || (prologues = [])).push({ file: index, text: sourceFile.text.substring(0, end), directives });
    }
    return prologues;
  }
  function emitShebangIfNeeded(sourceFileOrBundle: Bundle | SourceFile | UnparsedSource) {
    if (qc.is.kind(qc.SourceFile, sourceFileOrBundle) || qc.is.kind(qc.UnparsedSource, sourceFileOrBundle)) {
      const shebang = qy.get.shebang(sourceFileOrBundle.text);
      if (shebang) {
        writeComment(shebang);
        writeLine();
        return true;
      }
    } else {
      for (const prepend of sourceFileOrBundle.prepends) {
        Debug.assertNode(prepend, isUnparsedSource);
        if (emitShebangIfNeeded(prepend)) return true;
      }
      for (const sourceFile of sourceFileOrBundle.sourceFiles) {
        if (emitShebangIfNeeded(sourceFile)) return true;
      }
    }
  }
  function emitNodeWithWriter(node: Node | undefined, writer: typeof write) {
    if (!node) return;
    const savedWrite = write;
    write = writer;
    emit(node);
    write = savedWrite;
  }
  function emitModifiers(node: Node, modifiers: Nodes<Modifier> | undefined) {
    if (modifiers && modifiers.length) {
      emitList(node, modifiers, ListFormat.Modifiers);
      writeSpace();
    }
  }
  function emitTypeAnnotation(node: TypeNode | undefined) {
    if (node) {
      writePunctuation(':');
      writeSpace();
      emit(node);
    }
  }
  function emitIniter(node: Expression | undefined, equalCommentStartPos: number, container: Node) {
    if (node) {
      writeSpace();
      emitTokenWithComment(Syntax.EqualsToken, equalCommentStartPos, writeOperator, container);
      writeSpace();
      emitExpression(node);
    }
  }
  function emitNodeWithPrefix<T extends Node>(prefix: string, prefixWriter: (s: string) => void, node: T | undefined, emit: (node: T) => void) {
    if (node) {
      prefixWriter(prefix);
      emit(node);
    }
  }
  function emitWithLeadingSpace(node: Node | undefined) {
    if (node) {
      writeSpace();
      emit(node);
    }
  }
  function emitExpressionWithLeadingSpace(node: Expression | undefined) {
    if (node) {
      writeSpace();
      emitExpression(node);
    }
  }
  function emitWithTrailingSpace(node: Node | undefined) {
    if (node) {
      emit(node);
      writeSpace();
    }
  }
  function emitEmbeddedStatement(parent: Node, node: Statement) {
    if (qc.is.kind(qc.Block, node) || qc.get.emitFlags(parent) & EmitFlags.SingleLine) {
      writeSpace();
      emit(node);
    } else {
      writeLine();
      increaseIndent();
      if (qc.is.kind(qc.EmptyStatement, node)) {
        pipelineEmit(EmitHint.EmbeddedStatement, node);
      } else {
        emit(node);
      }
      decreaseIndent();
    }
  }
  function emitDecorators(parentNode: Node, decorators: Nodes<Decorator> | undefined) {
    emitList(parentNode, decorators, ListFormat.Decorators);
  }
  function emitTypeArguments(parentNode: Node, typeArguments: Nodes<TypeNode> | undefined) {
    emitList(parentNode, typeArguments, ListFormat.TypeArguments);
  }
  function emitTypeParameters(
    parentNode: SignatureDeclaration | InterfaceDeclaration | TypeAliasDeclaration | ClassDeclaration | ClassExpression,
    typeParameters: Nodes<TypeParameterDeclaration> | undefined
  ) {
    if (qc.is.functionLike(parentNode) && parentNode.typeArguments) return emitTypeArguments(parentNode, parentNode.typeArguments);
    emitList(parentNode, typeParameters, ListFormat.TypeParameters);
  }
  function emitParameters(parentNode: Node, parameters: Nodes<ParameterDeclaration>) {
    emitList(parentNode, parameters, ListFormat.Parameters);
  }
  function canEmitSimpleArrowHead(parentNode: FunctionTypeNode | ArrowFunction, parameters: Nodes<ParameterDeclaration>) {
    const parameter = singleOrUndefined(parameters);
    return (
      parameter &&
      parameter.pos === parentNode.pos &&
      qc.is.kind(qc.ArrowFunction, parentNode) &&
      !parentNode.type &&
      !some(parentNode.decorators) &&
      !some(parentNode.modifiers) &&
      !some(parentNode.typeParameters) &&
      !some(parameter.decorators) &&
      !some(parameter.modifiers) &&
      !parameter.dot3Token &&
      !parameter.questionToken &&
      !parameter.type &&
      !parameter.initer &&
      qc.is.kind(qc.Identifier, parameter.name)
    );
  }
  function emitParametersForArrow(parentNode: FunctionTypeNode | ArrowFunction, parameters: Nodes<ParameterDeclaration>) {
    if (canEmitSimpleArrowHead(parentNode, parameters)) {
      emitList(parentNode, parameters, ListFormat.Parameters & ~ListFormat.Parenthesis);
    } else {
      emitParameters(parentNode, parameters);
    }
  }
  function emitParametersForIndexSignature(parentNode: Node, parameters: Nodes<ParameterDeclaration>) {
    emitList(parentNode, parameters, ListFormat.IndexSignatureParameters);
  }
  function emitList(parentNode: TextRange, children: Nodes<Node> | undefined, format: ListFormat, start?: number, count?: number) {
    emitNodeList(emit, parentNode, children, format, start, count);
  }
  function emitExpressionList(parentNode: TextRange, children: Nodes<Node> | undefined, format: ListFormat, start?: number, count?: number) {
    emitNodeList(emitExpression as (node: Node) => void, parentNode, children, format, start, count);
  }
  function writeDelimiter(format: ListFormat) {
    switch (format & ListFormat.DelimitersMask) {
      case ListFormat.None:
        break;
      case ListFormat.CommaDelimited:
        writePunctuation(',');
        break;
      case ListFormat.BarDelimited:
        writeSpace();
        writePunctuation('|');
        break;
      case ListFormat.AsteriskDelimited:
        writeSpace();
        writePunctuation('*');
        writeSpace();
        break;
      case ListFormat.AmpersandDelimited:
        writeSpace();
        writePunctuation('&');
        break;
    }
  }
  function emitNodeList(emit: (node: Node) => void, parentNode: TextRange, children: Nodes<Node> | undefined, format: ListFormat, start = 0, count = children ? children.length - start : 0) {
    const isUndefined = children === undefined;
    if (isUndefined && format & ListFormat.OptionalIfUndefined) {
      return;
    }
    const isEmpty = children === undefined || start >= children.length || count === 0;
    if (isEmpty && format & ListFormat.OptionalIfEmpty) {
      if (onBeforeEmitNodes) {
        onBeforeEmitNodes(children);
      }
      if (onAfterEmitNodes) {
        onAfterEmitNodes(children);
      }
      return;
    }
    if (format & ListFormat.BracketsMask) {
      writePunctuation(getOpeningBracket(format));
      if (isEmpty && !isUndefined) {
        emitTrailingCommentsOfPosition(children!.pos, true);
      }
    }
    if (onBeforeEmitNodes) {
      onBeforeEmitNodes(children);
    }
    if (isEmpty) {
      if (format & ListFormat.MultiLine && !(preserveSourceNewlines && rangeIsOnSingleLine(parentNode, currentSourceFile!))) {
        writeLine();
      } else if (format & ListFormat.SpaceBetweenBraces && !(format & ListFormat.NoSpaceIfEmpty)) {
        writeSpace();
      }
    } else {
      const mayEmitInterveningComments = (format & ListFormat.NoInterveningComments) === 0;
      let shouldEmitInterveningComments = mayEmitInterveningComments;
      const leadingLineTerminatorCount = getLeadingLineTerminatorCount(parentNode, children!, format);
      if (leadingLineTerminatorCount) {
        writeLine(leadingLineTerminatorCount);
        shouldEmitInterveningComments = false;
      } else if (format & ListFormat.SpaceBetweenBraces) {
        writeSpace();
      }
      if (format & ListFormat.Indented) {
        increaseIndent();
      }
      let previousSibling: Node | undefined;
      let previousSourceFileTextKind: ReturnType<typeof recordBundleFileInternalSectionStart>;
      let shouldDecreaseIndentAfterEmit = false;
      for (let i = 0; i < count; i++) {
        const child = children![start + i];
        if (format & ListFormat.AsteriskDelimited) {
          writeLine();
          writeDelimiter(format);
        } else if (previousSibling) {
          if (format & ListFormat.DelimitersMask && previousSibling.end !== parentNode.end) {
            emitLeadingCommentsOfPosition(previousSibling.end);
          }
          writeDelimiter(format);
          recordBundleFileInternalSectionEnd(previousSourceFileTextKind);
          const separatingLineTerminatorCount = getSeparatingLineTerminatorCount(previousSibling, child, format);
          if (separatingLineTerminatorCount > 0) {
            if ((format & (ListFormat.LinesMask | ListFormat.Indented)) === ListFormat.SingleLine) {
              increaseIndent();
              shouldDecreaseIndentAfterEmit = true;
            }
            writeLine(separatingLineTerminatorCount);
            shouldEmitInterveningComments = false;
          } else if (previousSibling && format & ListFormat.SpaceBetweenSiblings) {
            writeSpace();
          }
        }
        previousSourceFileTextKind = recordBundleFileInternalSectionStart(child);
        if (shouldEmitInterveningComments) {
          if (emitTrailingCommentsOfPosition) {
            const commentRange = getCommentRange(child);
            emitTrailingCommentsOfPosition(commentRange.pos);
          }
        } else {
          shouldEmitInterveningComments = mayEmitInterveningComments;
        }
        emit(child);
        if (shouldDecreaseIndentAfterEmit) {
          decreaseIndent();
          shouldDecreaseIndentAfterEmit = false;
        }
        previousSibling = child;
      }
      const trailingComma = format & ListFormat.AllowTrailingComma && children!.trailingComma;
      if (format & ListFormat.CommaDelimited && trailingComma) {
        writePunctuation(',');
      }
      if (previousSibling && format & ListFormat.DelimitersMask && previousSibling.end !== parentNode.end && !(qc.get.emitFlags(previousSibling) & EmitFlags.NoTrailingComments)) {
        emitLeadingCommentsOfPosition(previousSibling.end);
      }
      if (format & ListFormat.Indented) {
        decreaseIndent();
      }
      recordBundleFileInternalSectionEnd(previousSourceFileTextKind);
      const closingLineTerminatorCount = getClosingLineTerminatorCount(parentNode, children!, format);
      if (closingLineTerminatorCount) {
        writeLine(closingLineTerminatorCount);
      } else if (format & (ListFormat.SpaceAfterList | ListFormat.SpaceBetweenBraces)) {
        writeSpace();
      }
    }
    if (onAfterEmitNodes) {
      onAfterEmitNodes(children);
    }
    if (format & ListFormat.BracketsMask) {
      if (isEmpty && !isUndefined) {
        emitLeadingCommentsOfPosition(children!.end);
      }
      writePunctuation(getClosingBracket(format));
    }
  }
  function writeLiteral(s: string) {
    writer.writeLiteral(s);
  }
  function writeStringLiteral(s: string) {
    writer.writeStringLiteral(s);
  }
  function writeBase(s: string) {
    writer.write(s);
  }
  function writeSymbol(s: string, sym: Symbol) {
    writer.writeSymbol(s, sym);
  }
  function writePunctuation(s: string) {
    writer.writePunctuation(s);
  }
  function writeTrailingSemicolon() {
    writer.writeTrailingSemicolon(';');
  }
  function writeKeyword(s: string) {
    writer.writeKeyword(s);
  }
  function writeOperator(s: string) {
    writer.writeOperator(s);
  }
  function writeParameter(s: string) {
    writer.writeParameter(s);
  }
  function writeComment(s: string) {
    writer.writeComment(s);
  }
  function writeSpace() {
    writer.writeSpace(' ');
  }
  function writeProperty(s: string) {
    writer.writeProperty(s);
  }
  function writeLine(count = 1) {
    for (let i = 0; i < count; i++) {
      writer.writeLine(i > 0);
    }
  }
  function increaseIndent() {
    writer.increaseIndent();
  }
  function decreaseIndent() {
    writer.decreaseIndent();
  }
  function writeToken(token: Syntax, pos: number, writer: (s: string) => void, contextNode?: Node) {
    return !sourceMapsDisabled ? emitTokenWithSourceMap(contextNode, token, writer, pos, writeTokenText) : writeTokenText(token, writer, pos);
  }
  function writeTokenNode(node: Node, writer: (s: string) => void) {
    if (onBeforeEmitToken) {
      onBeforeEmitToken(node);
    }
    writer(Token.toString(node.kind)!);
    if (onAfterEmitToken) {
      onAfterEmitToken(node);
    }
  }
  function writeTokenText(token: Syntax, writer: (s: string) => void): void;
  function writeTokenText(token: Syntax, writer: (s: string) => void, pos: number): number;
  function writeTokenText(token: Syntax, writer: (s: string) => void, pos?: number): number {
    const tokenString = Token.toString(token)!;
    writer(tokenString);
    return pos! < 0 ? pos! : pos! + tokenString.length;
  }
  function writeLineOrSpace(node: Node) {
    if (qc.get.emitFlags(node) & EmitFlags.SingleLine) {
      writeSpace();
    } else {
      writeLine();
    }
  }
  function writeLines(text: string): void {
    const lines = text.split(/\r\n?|\n/g);
    const indentation = guessIndentation(lines);
    for (const lineText of lines) {
      const line = indentation ? lineText.slice(indentation) : lineText;
      if (line.length) {
        writeLine();
        write(line);
      }
    }
  }
  function writeLinesAndIndent(lineCount: number, writeSpaceIfNotIndenting: boolean) {
    if (lineCount) {
      increaseIndent();
      writeLine(lineCount);
    } else if (writeSpaceIfNotIndenting) {
      writeSpace();
    }
  }
  function decreaseIndentIf(value1: boolean | number | undefined, value2?: boolean | number) {
    if (value1) {
      decreaseIndent();
    }
    if (value2) {
      decreaseIndent();
    }
  }
  function getLeadingLineTerminatorCount(parentNode: TextRange, children: readonly Node[], format: ListFormat): number {
    if (format & ListFormat.PreserveLines || preserveSourceNewlines) {
      if (format & ListFormat.PreferNewLine) return 1;
      const firstChild = children[0];
      if (firstChild === undefined) return rangeIsOnSingleLine(parentNode, currentSourceFile!) ? 0 : 1;
      if (firstChild.kind === Syntax.JsxText) return 0;
      if (!isSynthesized(parentNode.pos) && !isSynthesized(firstChild) && (!firstChild.parent || firstChild.parent === parentNode)) {
        if (preserveSourceNewlines) return getEffectiveLines((includeComments) => linesToPrevNonWhitespace(firstChild.pos, parentNode.pos, currentSourceFile!, includeComments));
        return startsOnSameLine(parentNode, firstChild, currentSourceFile!) ? 0 : 1;
      }
      if (synthesizedNodeStartsOnNewLine(firstChild, format)) return 1;
    }
    return format & ListFormat.MultiLine ? 1 : 0;
  }
  function getSeparatingLineTerminatorCount(previousNode: Node | undefined, nextNode: Node, format: ListFormat): number {
    if (format & ListFormat.PreserveLines || preserveSourceNewlines) {
      if (previousNode === undefined || nextNode === undefined) return 0;
      if (nextNode.kind === Syntax.JsxText) return 0;
      else if (!isSynthesized(previousNode) && !isSynthesized(nextNode) && previousNode.parent === nextNode.parent) {
        if (preserveSourceNewlines) return getEffectiveLines((includeComments) => linesBetween(previousNode, nextNode, currentSourceFile!, includeComments));
        return endOnSameLineAsStart(previousNode, nextNode, currentSourceFile!) ? 0 : 1;
      } else if (synthesizedNodeStartsOnNewLine(previousNode, format) || synthesizedNodeStartsOnNewLine(nextNode, format)) {
        return 1;
      }
    } else if (getStartsOnNewLine(nextNode)) {
      return 1;
    }
    return format & ListFormat.MultiLine ? 1 : 0;
  }
  function getClosingLineTerminatorCount(parentNode: TextRange, children: readonly Node[], format: ListFormat): number {
    if (format & ListFormat.PreserveLines || preserveSourceNewlines) {
      if (format & ListFormat.PreferNewLine) return 1;
      const lastChild = lastOrUndefined(children);
      if (lastChild === undefined) return rangeIsOnSingleLine(parentNode, currentSourceFile!) ? 0 : 1;
      if (!isSynthesized(parentNode.pos) && !isSynthesized(lastChild) && (!lastChild.parent || lastChild.parent === parentNode)) {
        if (preserveSourceNewlines) return getEffectiveLines((includeComments) => linesToNextNonWhitespace(lastChild.end, parentNode.end, currentSourceFile!, includeComments));
        return endsOnSameLine(parentNode, lastChild, currentSourceFile!) ? 0 : 1;
      }
      if (synthesizedNodeStartsOnNewLine(lastChild, format)) return 1;
    }
    if (format & ListFormat.MultiLine && !(format & ListFormat.NoTrailingNewLine)) return 1;
    return 0;
  }
  function getEffectiveLines(getLineDifference: (includeComments: boolean) => number) {
    qu.assert(!!preserveSourceNewlines);
    const lines = getLineDifference(true);
    if (lines === 0) return getLineDifference(false);
    return lines;
  }
  function writeLineSeparatorsAndIndentBefore(node: Node, parent: Node): boolean {
    const leadingNewlines = preserveSourceNewlines && getLeadingLineTerminatorCount(parent, [node], ListFormat.None);
    if (leadingNewlines) {
      writeLinesAndIndent(leadingNewlines, false);
    }
    return !!leadingNewlines;
  }
  function writeLineSeparatorsAfter(node: Node, parent: Node) {
    const trailingNewlines = preserveSourceNewlines && getClosingLineTerminatorCount(parent, [node], ListFormat.None);
    if (trailingNewlines) {
      writeLine(trailingNewlines);
    }
  }
  function synthesizedNodeStartsOnNewLine(node: Node, format: ListFormat) {
    if (isSynthesized(node)) {
      const startsOnNewLine = getStartsOnNewLine(node);
      if (startsOnNewLine === undefined) return (format & ListFormat.PreferNewLine) !== 0;
      return startsOnNewLine;
    }
    return (format & ListFormat.PreferNewLine) !== 0;
  }
  function linesBetweenNodes(parent: Node, node1: Node, node2: Node): number {
    if (qc.get.emitFlags(parent) & EmitFlags.NoIndentation) return 0;
    parent = skipSynthesizedParentheses(parent);
    node1 = skipSynthesizedParentheses(node1);
    node2 = skipSynthesizedParentheses(node2);
    if (getStartsOnNewLine(node2)) return 1;
    if (!isSynthesized(parent) && !isSynthesized(node1) && !isSynthesized(node2)) {
      if (preserveSourceNewlines) return getEffectiveLines((includeComments) => linesBetween(node1, node2, currentSourceFile!, includeComments));
      return endOnSameLineAsStart(node1, node2, currentSourceFile!) ? 0 : 1;
    }
    return 0;
  }
  function isEmptyBlock(block: BlockLike) {
    return block.statements.length === 0 && endOnSameLineAsStart(block, block, currentSourceFile!);
  }
  function skipSynthesizedParentheses(node: Node) {
    while (node.kind === Syntax.ParenthesizedExpression && isSynthesized(node)) {
      node = (<ParenthesizedExpression>node).expression;
    }
    return node;
  }
  function getTextOfNode(node: Node, includeTrivia?: boolean): string {
    if (qc.is.generatedIdentifier(node)) return generateName(node);
    else if (
      (qc.is.kind(qc.Identifier, node) || qc.is.kind(qc.PrivateIdentifier, node)) &&
      (isSynthesized(node) || !node.parent || !currentSourceFile || (node.parent && currentSourceFile && qc.get.sourceFileOf(node) !== qc.get.originalOf(currentSourceFile)))
    ) {
      return idText(node);
    } else if (node.kind === Syntax.StringLiteral && (<StringLiteral>node).textSourceNode) {
      return getTextOfNode((<StringLiteral>node).textSourceNode!, includeTrivia);
    } else if (qc.is.literalExpression(node) && (isSynthesized(node) || !node.parent)) {
      return node.text;
    }
    return getSourceTextOfNodeFromSourceFile(currentSourceFile!, node, includeTrivia);
  }
  function getLiteralTextOfNode(node: LiteralLikeNode, neverAsciiEscape: boolean | undefined, jsxAttributeEscape: boolean): string {
    if (node.kind === Syntax.StringLiteral && (<StringLiteral>node).textSourceNode) {
      const textSourceNode = (<StringLiteral>node).textSourceNode!;
      if (qc.is.kind(qc.Identifier, textSourceNode) || qc.is.kind(qc.NumericLiteral, textSourceNode)) {
        const text = qc.is.kind(qc.NumericLiteral, textSourceNode) ? textSourceNode.text : getTextOfNode(textSourceNode);
        return jsxAttributeEscape
          ? `"${escapeJsxAttributeString(text)}"`
          : neverAsciiEscape || qc.get.emitFlags(node) & EmitFlags.NoAsciiEscaping
          ? `"${escapeString(text)}"`
          : `"${escapeNonAsciiString(text)}"`;
      } else {
        return getLiteralTextOfNode(textSourceNode, neverAsciiEscape, jsxAttributeEscape);
      }
    }
    return qc.get.literalText(node, currentSourceFile!, neverAsciiEscape, jsxAttributeEscape);
  }
  function pushNameGenerationScope(node: Node | undefined) {
    if (node && qc.get.emitFlags(node) & EmitFlags.ReuseTempVariableScope) {
      return;
    }
    tempFlagsStack.push(tempFlags);
    tempFlags = 0;
    reservedNamesStack.push(reservedNames);
  }
  function popNameGenerationScope(node: Node | undefined) {
    if (node && qc.get.emitFlags(node) & EmitFlags.ReuseTempVariableScope) {
      return;
    }
    tempFlags = tempFlagsStack.pop()!;
    reservedNames = reservedNamesStack.pop()!;
  }
  function reserveNameInNestedScopes(name: string) {
    if (!reservedNames || reservedNames === lastOrUndefined(reservedNamesStack)) {
      reservedNames = createMap<true>();
    }
    reservedNames.set(name, true);
  }
  function generateNames(node: Node | undefined) {
    if (!node) return;
    switch (node.kind) {
      case Syntax.Block:
        forEach((<Block>node).statements, generateNames);
        break;
      case Syntax.LabeledStatement:
      case Syntax.WithStatement:
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
        generateNames((<LabeledStatement | WithStatement | DoStatement | WhileStatement>node).statement);
        break;
      case Syntax.IfStatement:
        generateNames((<IfStatement>node).thenStatement);
        generateNames((<IfStatement>node).elseStatement);
        break;
      case Syntax.ForStatement:
      case Syntax.ForOfStatement:
      case Syntax.ForInStatement:
        generateNames((<ForStatement | ForInOrOfStatement>node).initer);
        generateNames((<ForStatement | ForInOrOfStatement>node).statement);
        break;
      case Syntax.SwitchStatement:
        generateNames((<SwitchStatement>node).caseBlock);
        break;
      case Syntax.CaseBlock:
        forEach((<CaseBlock>node).clauses, generateNames);
        break;
      case Syntax.CaseClause:
      case Syntax.DefaultClause:
        forEach((<CaseOrDefaultClause>node).statements, generateNames);
        break;
      case Syntax.TryStatement:
        generateNames((<TryStatement>node).tryBlock);
        generateNames((<TryStatement>node).catchClause);
        generateNames((<TryStatement>node).finallyBlock);
        break;
      case Syntax.CatchClause:
        generateNames((<CatchClause>node).variableDeclaration);
        generateNames((<CatchClause>node).block);
        break;
      case Syntax.VariableStatement:
        generateNames((<VariableStatement>node).declarationList);
        break;
      case Syntax.VariableDeclarationList:
        forEach((<VariableDeclarationList>node).declarations, generateNames);
        break;
      case Syntax.VariableDeclaration:
      case Syntax.Parameter:
      case Syntax.BindingElement:
      case Syntax.ClassDeclaration:
        generateNameIfNeeded((<NamedDeclaration>node).name);
        break;
      case Syntax.FunctionDeclaration:
        generateNameIfNeeded((<FunctionDeclaration>node).name);
        if (qc.get.emitFlags(node) & EmitFlags.ReuseTempVariableScope) {
          forEach((<FunctionDeclaration>node).parameters, generateNames);
          generateNames((<FunctionDeclaration>node).body);
        }
        break;
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
        forEach((<BindingPattern>node).elements, generateNames);
        break;
      case Syntax.ImportDeclaration:
        generateNames((<ImportDeclaration>node).importClause);
        break;
      case Syntax.ImportClause:
        generateNameIfNeeded((<ImportClause>node).name);
        generateNames((<ImportClause>node).namedBindings);
        break;
      case Syntax.NamespaceImport:
        generateNameIfNeeded((<NamespaceImport>node).name);
        break;
      case Syntax.NamespaceExport:
        generateNameIfNeeded((<NamespaceExport>node).name);
        break;
      case Syntax.NamedImports:
        forEach((<NamedImports>node).elements, generateNames);
        break;
      case Syntax.ImportSpecifier:
        generateNameIfNeeded((<ImportSpecifier>node).propertyName || (<ImportSpecifier>node).name);
        break;
    }
  }
  function generateMemberNames(node: Node | undefined) {
    if (!node) return;
    switch (node.kind) {
      case Syntax.PropertyAssignment:
      case Syntax.ShorthandPropertyAssignment:
      case Syntax.PropertyDeclaration:
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        generateNameIfNeeded((<NamedDeclaration>node).name);
        break;
    }
  }
  function generateNameIfNeeded(name: DeclarationName | undefined) {
    if (name) {
      if (qc.is.generatedIdentifier(name)) {
        generateName(name);
      } else if (qc.is.kind(qc.BindingPattern, name)) {
        generateNames(name);
      }
    }
  }
  function generateName(name: GeneratedIdentifier) {
    if ((name.autoGenerateFlags & GeneratedIdentifierFlags.KindMask) === GeneratedIdentifierFlags.Node) return generateNameCached(getNodeForGeneratedName(name), name.autoGenerateFlags);
    else {
      const autoGenerateId = name.autoGenerateId!;
      return autoGeneratedIdToGeneratedName[autoGenerateId] || (autoGeneratedIdToGeneratedName[autoGenerateId] = makeName(name));
    }
  }
  function generateNameCached(node: Node, flags?: GeneratedIdentifierFlags) {
    const nodeId = getNodeId(node);
    return nodeIdToGeneratedName[nodeId] || (nodeIdToGeneratedName[nodeId] = generateNameForNode(node, flags));
  }
  function isUniqueName(name: string): boolean {
    return isFileLevelUniqueName(name) && !generatedNames.has(name) && !(reservedNames && reservedNames.has(name));
  }
  function isFileLevelUniqueName(name: string) {
    return currentSourceFile ? qnr.isFileLevelUniqueName(currentSourceFile, name, hasGlobalName) : true;
  }
  function isUniqueLocalName(name: string, container: Node): boolean {
    for (let node = container; qc.is.descendantOf(node, container); node = node.nextContainer!) {
      if (node.locals) {
        const local = node.locals.get(qy.get.escUnderscores(name));
        if (local && local.flags & (SymbolFlags.Value | SymbolFlags.ExportValue | SymbolFlags.Alias)) return false;
      }
    }
    return true;
  }
  function makeTempVariableName(flags: TempFlags, reservedInNestedScopes?: boolean): string {
    if (flags && !(tempFlags & flags)) {
      const name = flags === TempFlags._i ? '_i' : '_n';
      if (isUniqueName(name)) {
        tempFlags |= flags;
        if (reservedInNestedScopes) {
          reserveNameInNestedScopes(name);
        }
        return name;
      }
    }
    while (true) {
      const count = tempFlags & TempFlags.CountMask;
      tempFlags++;
      if (count !== 8 && count !== 13) {
        const name = count < 26 ? '_' + String.fromCharCode(Codes.a + count) : '_' + (count - 26);
        if (isUniqueName(name)) {
          if (reservedInNestedScopes) {
            reserveNameInNestedScopes(name);
          }
          return name;
        }
      }
    }
  }
  function makeUniqueName(baseName: string, checkFn: (name: string) => boolean = isUniqueName, optimistic?: boolean, scoped?: boolean): string {
    if (optimistic) {
      if (checkFn(baseName)) {
        if (scoped) {
          reserveNameInNestedScopes(baseName);
        } else {
          generatedNames.set(baseName, true);
        }
        return baseName;
      }
    }
    if (baseName.charCodeAt(baseName.length - 1) !== Codes._) {
      baseName += '_';
    }
    let i = 1;
    while (true) {
      const generatedName = baseName + i;
      if (checkFn(generatedName)) {
        if (scoped) {
          reserveNameInNestedScopes(generatedName);
        } else {
          generatedNames.set(generatedName, true);
        }
        return generatedName;
      }
      i++;
    }
  }
  function makeFileLevelOptimisticUniqueName(name: string) {
    return makeUniqueName(name, isFileLevelUniqueName, true);
  }
  function generateNameForModuleOrEnum(node: ModuleDeclaration | EnumDeclaration) {
    const name = getTextOfNode(node.name);
    return isUniqueLocalName(name, node) ? name : makeUniqueName(name);
  }
  function generateNameForImportOrExportDeclaration(node: ImportDeclaration | ExportDeclaration) {
    const expr = getExternalModuleName(node)!;
    const baseName = qc.is.kind(qc.StringLiteral, expr) ? makeIdentifierFromModuleName(expr.text) : 'module';
    return makeUniqueName(baseName);
  }
  function generateNameForExportDefault() {
    return makeUniqueName('default');
  }
  function generateNameForClassExpression() {
    return makeUniqueName('class');
  }
  function generateNameForMethodOrAccessor(node: MethodDeclaration | AccessorDeclaration) {
    if (qc.is.kind(qc.Identifier, node.name)) return generateNameCached(node.name);
    return makeTempVariableName(TempFlags.Auto);
  }
  function generateNameForNode(node: Node, flags?: GeneratedIdentifierFlags): string {
    switch (node.kind) {
      case Syntax.Identifier:
        return makeUniqueName(getTextOfNode(node), isUniqueName, !!(flags! & GeneratedIdentifierFlags.Optimistic), !!(flags! & GeneratedIdentifierFlags.ReservedInNestedScopes));
      case Syntax.ModuleDeclaration:
      case Syntax.EnumDeclaration:
        return generateNameForModuleOrEnum(<ModuleDeclaration | EnumDeclaration>node);
      case Syntax.ImportDeclaration:
      case Syntax.ExportDeclaration:
        return generateNameForImportOrExportDeclaration(<ImportDeclaration | ExportDeclaration>node);
      case Syntax.FunctionDeclaration:
      case Syntax.ClassDeclaration:
      case Syntax.ExportAssignment:
        return generateNameForExportDefault();
      case Syntax.ClassExpression:
        return generateNameForClassExpression();
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return generateNameForMethodOrAccessor(<MethodDeclaration | AccessorDeclaration>node);
      case Syntax.ComputedPropertyName:
        return makeTempVariableName(TempFlags.Auto, true);
      default:
        return makeTempVariableName(TempFlags.Auto);
    }
  }
  function makeName(name: GeneratedIdentifier) {
    switch (name.autoGenerateFlags & GeneratedIdentifierFlags.KindMask) {
      case GeneratedIdentifierFlags.Auto:
        return makeTempVariableName(TempFlags.Auto, !!(name.autoGenerateFlags & GeneratedIdentifierFlags.ReservedInNestedScopes));
      case GeneratedIdentifierFlags.Loop:
        return makeTempVariableName(TempFlags._i, !!(name.autoGenerateFlags & GeneratedIdentifierFlags.ReservedInNestedScopes));
      case GeneratedIdentifierFlags.Unique:
        return makeUniqueName(
          idText(name),
          name.autoGenerateFlags & GeneratedIdentifierFlags.FileLevel ? isFileLevelUniqueName : isUniqueName,
          !!(name.autoGenerateFlags & GeneratedIdentifierFlags.Optimistic),
          !!(name.autoGenerateFlags & GeneratedIdentifierFlags.ReservedInNestedScopes)
        );
    }
    return fail('Unsupported GeneratedIdentifierKind.');
  }
  function getNodeForGeneratedName(name: GeneratedIdentifier) {
    const autoGenerateId = name.autoGenerateId;
    let node = name as Node;
    let original = node.original;
    while (original) {
      node = original;
      if (qc.is.kind(qc.Identifier, node) && !!(node.autoGenerateFlags! & GeneratedIdentifierFlags.Node) && node.autoGenerateId !== autoGenerateId) {
        break;
      }
      original = node.original;
    }
    return node;
  }
  function pipelineEmitWithComments(hint: EmitHint, node: Node) {
    qu.assert(lastNode === node || lastSubstitution === node);
    enterComment();
    hasWrittenComment = false;
    const emitFlags = qc.get.emitFlags(node);
    const { pos, end } = getCommentRange(node);
    const isEmittedNode = node.kind !== Syntax.NotEmittedStatement;
    const skipLeadingComments = pos < 0 || (emitFlags & EmitFlags.NoLeadingComments) !== 0 || node.kind === Syntax.JsxText;
    const skipTrailingComments = end < 0 || (emitFlags & EmitFlags.NoTrailingComments) !== 0 || node.kind === Syntax.JsxText;
    const savedContainerPos = containerPos;
    const savedContainerEnd = containerEnd;
    const savedDeclarationListContainerEnd = declarationListContainerEnd;
    if ((pos > 0 || end > 0) && pos !== end) {
      if (!skipLeadingComments) {
        emitLeadingComments(pos, isEmittedNode);
      }
      if (!skipLeadingComments || (pos >= 0 && (emitFlags & EmitFlags.NoLeadingComments) !== 0)) {
        containerPos = pos;
      }
      if (!skipTrailingComments || (end >= 0 && (emitFlags & EmitFlags.NoTrailingComments) !== 0)) {
        containerEnd = end;
        if (node.kind === Syntax.VariableDeclarationList) {
          declarationListContainerEnd = end;
        }
      }
    }
    forEach(getSyntheticLeadingComments(node), emitLeadingSynthesizedComment);
    exitComment();
    const pipelinePhase = getNextPipelinePhase(PipelinePhase.Comments, hint, node);
    if (emitFlags & EmitFlags.NoNestedComments) {
      commentsDisabled = true;
      pipelinePhase(hint, node);
      commentsDisabled = false;
    } else {
      pipelinePhase(hint, node);
    }
    enterComment();
    forEach(getSyntheticTrailingComments(node), emitTrailingSynthesizedComment);
    if ((pos > 0 || end > 0) && pos !== end) {
      containerPos = savedContainerPos;
      containerEnd = savedContainerEnd;
      declarationListContainerEnd = savedDeclarationListContainerEnd;
      if (!skipTrailingComments && isEmittedNode) {
        emitTrailingComments(end);
      }
    }
    exitComment();
    qu.assert(lastNode === node || lastSubstitution === node);
  }
  function emitLeadingSynthesizedComment(comment: SynthesizedComment) {
    if (comment.hasLeadingNewline || comment.kind === Syntax.SingleLineCommentTrivia) {
      writer.writeLine();
    }
    writeSynthesizedComment(comment);
    if (comment.hasTrailingNewLine || comment.kind === Syntax.SingleLineCommentTrivia) {
      writer.writeLine();
    } else {
      writer.writeSpace(' ');
    }
  }
  function emitTrailingSynthesizedComment(comment: SynthesizedComment) {
    if (!writer.isAtStartOfLine()) {
      writer.writeSpace(' ');
    }
    writeSynthesizedComment(comment);
    if (comment.hasTrailingNewLine) {
      writer.writeLine();
    }
  }
  function writeSynthesizedComment(comment: SynthesizedComment) {
    const text = formatSynthesizedComment(comment);
    const lineMap = comment.kind === Syntax.MultiLineCommentTrivia ? qy.get.lineStarts(text) : undefined;
    writeCommentRange(text, lineMap!, writer, 0, text.length, newLine);
  }
  function formatSynthesizedComment(comment: SynthesizedComment) {
    return comment.kind === Syntax.MultiLineCommentTrivia ? `` : ``;
  }
  function emitBodyWithDetachedComments(node: Node, detachedRange: TextRange, emitCallback: (node: Node) => void) {
    enterComment();
    const { pos, end } = detachedRange;
    const emitFlags = qc.get.emitFlags(node);
    const skipLeadingComments = pos < 0 || (emitFlags & EmitFlags.NoLeadingComments) !== 0;
    const skipTrailingComments = commentsDisabled || end < 0 || (emitFlags & EmitFlags.NoTrailingComments) !== 0;
    if (!skipLeadingComments) {
      emitDetachedCommentsAndUpdateCommentsInfo(detachedRange);
    }
    exitComment();
    if (emitFlags & EmitFlags.NoNestedComments && !commentsDisabled) {
      commentsDisabled = true;
      emitCallback(node);
      commentsDisabled = false;
    } else {
      emitCallback(node);
    }
    enterComment();
    if (!skipTrailingComments) {
      emitLeadingComments(detachedRange.end, true);
      if (hasWrittenComment && !writer.isAtStartOfLine()) {
        writer.writeLine();
      }
    }
    exitComment();
  }
  function emitLeadingComments(pos: number, isEmittedNode: boolean) {
    hasWrittenComment = false;
    if (isEmittedNode) {
      forEachLeadingCommentToEmit(pos, emitLeadingComment);
    } else if (pos === 0) {
      forEachLeadingCommentToEmit(pos, emitTripleSlashLeadingComment);
    }
  }
  function emitTripleSlashLeadingComment(commentPos: number, commentEnd: number, kind: Syntax, hasTrailingNewLine: boolean, rangePos: number) {
    if (isTripleSlashComment(commentPos, commentEnd)) {
      emitLeadingComment(commentPos, commentEnd, kind, hasTrailingNewLine, rangePos);
    }
  }
  function shouldWriteComment(text: string, pos: number) {
    if (printerOptions.onlyPrintDocStyle) return qy.is.docLike(text, pos) || qy.is.pinnedComment(text, pos);
    return true;
  }
  function emitLeadingComment(commentPos: number, commentEnd: number, kind: Syntax, hasTrailingNewLine: boolean, rangePos: number) {
    if (!shouldWriteComment(currentSourceFile!.text, commentPos)) return;
    if (!hasWrittenComment) {
      emitNewLineBeforeLeadingCommentOfPosition(getCurrentLineMap(), writer, rangePos, commentPos);
      hasWrittenComment = true;
    }
    emitPos(commentPos);
    writeCommentRange(currentSourceFile!.text, getCurrentLineMap(), writer, commentPos, commentEnd, newLine);
    emitPos(commentEnd);
    if (hasTrailingNewLine) {
      writer.writeLine();
    } else if (kind === Syntax.MultiLineCommentTrivia) {
      writer.writeSpace(' ');
    }
  }
  function emitLeadingCommentsOfPosition(pos: number) {
    if (commentsDisabled || pos === -1) {
      return;
    }
    emitLeadingComments(pos, true);
  }
  function emitTrailingComments(pos: number) {
    forEachTrailingCommentToEmit(pos, emitTrailingComment);
  }
  function emitTrailingComment(commentPos: number, commentEnd: number, _kind: Syntax, hasTrailingNewLine: boolean) {
    if (!shouldWriteComment(currentSourceFile!.text, commentPos)) return;
    if (!writer.isAtStartOfLine()) {
      writer.writeSpace(' ');
    }
    emitPos(commentPos);
    writeCommentRange(currentSourceFile!.text, getCurrentLineMap(), writer, commentPos, commentEnd, newLine);
    emitPos(commentEnd);
    if (hasTrailingNewLine) {
      writer.writeLine();
    }
  }
  function emitTrailingCommentsOfPosition(pos: number, prefixSpace?: boolean) {
    if (commentsDisabled) {
      return;
    }
    enterComment();
    forEachTrailingCommentToEmit(pos, prefixSpace ? emitTrailingComment : emitTrailingCommentOfPosition);
    exitComment();
  }
  function emitTrailingCommentOfPosition(commentPos: number, commentEnd: number, _kind: Syntax, hasTrailingNewLine: boolean) {
    emitPos(commentPos);
    writeCommentRange(currentSourceFile!.text, getCurrentLineMap(), writer, commentPos, commentEnd, newLine);
    emitPos(commentEnd);
    if (hasTrailingNewLine) {
      writer.writeLine();
    } else {
      writer.writeSpace(' ');
    }
  }
  function forEachLeadingCommentToEmit(pos: number, cb: (commentPos: number, commentEnd: number, kind: Syntax, hasTrailingNewLine: boolean, rangePos: number) => void) {
    if (currentSourceFile && (containerPos === -1 || pos !== containerPos)) {
      if (hasDetachedComments(pos)) {
        forEachLeadingCommentWithoutDetachedComments(cb);
      } else {
        qy.forEachLeadingCommentRange(currentSourceFile.text, pos, cb, pos);
      }
    }
  }
  function forEachTrailingCommentToEmit(end: number, cb: (commentPos: number, commentEnd: number, kind: Syntax, hasTrailingNewLine: boolean) => void) {
    if (currentSourceFile && (containerEnd === -1 || (end !== containerEnd && end !== declarationListContainerEnd))) {
      qy.forEachTrailingCommentRange(currentSourceFile.text, end, cb);
    }
  }
  function hasDetachedComments(pos: number) {
    return detachedCommentsInfo !== undefined && last(detachedCommentsInfo).nodePos === pos;
  }
  function forEachLeadingCommentWithoutDetachedComments(cb: (commentPos: number, commentEnd: number, kind: Syntax, hasTrailingNewLine: boolean, rangePos: number) => void) {
    const pos = last(detachedCommentsInfo!).detachedCommentEndPos;
    if (detachedCommentsInfo!.length - 1) {
      detachedCommentsInfo!.pop();
    } else {
      detachedCommentsInfo = undefined;
    }
    qy.forEachLeadingCommentRange(currentSourceFile!.text, pos, cb, pos);
  }
  function emitDetachedCommentsAndUpdateCommentsInfo(range: TextRange) {
    const currentDetachedCommentInfo = emitDetachedComments(currentSourceFile!.text, getCurrentLineMap(), writer, emitComment, range, newLine, commentsDisabled);
    if (currentDetachedCommentInfo) {
      if (detachedCommentsInfo) {
        detachedCommentsInfo.push(currentDetachedCommentInfo);
      } else {
        detachedCommentsInfo = [currentDetachedCommentInfo];
      }
    }
  }
  function emitComment(text: string, lineMap: number[], writer: EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) {
    if (!shouldWriteComment(currentSourceFile!.text, commentPos)) return;
    emitPos(commentPos);
    writeCommentRange(text, lineMap, writer, commentPos, commentEnd, newLine);
    emitPos(commentEnd);
  }
  function isTripleSlashComment(commentPos: number, commentEnd: number) {
    return qy.is.recognizedTripleSlashComment(currentSourceFile!.text, commentPos, commentEnd);
  }
  function getParsedSourceMap(node: UnparsedSource) {
    if (node.parsedSourceMap === undefined && node.sourceMapText !== undefined) {
      node.parsedSourceMap = tryParseRawSourceMap(node.sourceMapText) || false;
    }
    return node.parsedSourceMap || undefined;
  }
  function pipelineEmitWithSourceMap(hint: EmitHint, node: Node) {
    qu.assert(lastNode === node || lastSubstitution === node);
    const pipelinePhase = getNextPipelinePhase(PipelinePhase.SourceMaps, hint, node);
    if (qc.is.kind(qc.UnparsedSource, node) || qc.is.kind(qc.UnparsedPrepend, node)) {
      pipelinePhase(hint, node);
    } else if (qc.is.unparsedNode(node)) {
      const parsed = getParsedSourceMap(node.parent);
      if (parsed && sourceMapGenerator) {
        sourceMapGenerator.appendSourceMap(
          writer.getLine(),
          writer.getColumn(),
          parsed,
          node.parent.sourceMapPath!,
          node.parent.qy.get.lineAndCharOf(node.pos),
          node.parent.qy.get.lineAndCharOf(node.end)
        );
      }
      pipelinePhase(hint, node);
    } else {
      const { pos, end, source = sourceMapSource } = getSourceMapRange(node);
      const emitFlags = qc.get.emitFlags(node);
      if (node.kind !== Syntax.NotEmittedStatement && (emitFlags & EmitFlags.NoLeadingSourceMap) === 0 && pos >= 0) {
        emitSourcePos(source, skipSourceTrivia(source, pos));
      }
      if (emitFlags & EmitFlags.NoNestedSourceMaps) {
        sourceMapsDisabled = true;
        pipelinePhase(hint, node);
        sourceMapsDisabled = false;
      } else {
        pipelinePhase(hint, node);
      }
      if (node.kind !== Syntax.NotEmittedStatement && (emitFlags & EmitFlags.NoTrailingSourceMap) === 0 && end >= 0) {
        emitSourcePos(source, end);
      }
    }
    qu.assert(lastNode === node || lastSubstitution === node);
  }
  function skipSourceTrivia(source: SourceMapSource, pos: number): number {
    return source.syntax.skipTrivia ? source.syntax.skipTrivia(pos) : qy.skipTrivia(source.text, pos);
  }
  function emitPos(pos: number) {
    if (sourceMapsDisabled || isSynthesized(pos) || isJsonSourceMapSource(sourceMapSource)) {
      return;
    }
    const { line: sourceLine, character: sourceCharacter } = qy.get.lineAndCharOf(sourceMapSource, pos);
    sourceMapGenerator!.addMapping(writer.getLine(), writer.getColumn(), sourceMapSourceIndex, sourceLine, sourceCharacter, undefined);
  }
  function emitSourcePos(source: SourceMapSource, pos: number) {
    if (source !== sourceMapSource) {
      const savedSourceMapSource = sourceMapSource;
      setSourceMapSource(source);
      emitPos(pos);
      setSourceMapSource(savedSourceMapSource);
    } else {
      emitPos(pos);
    }
  }
  function emitTokenWithSourceMap(
    node: Node | undefined,
    token: Syntax,
    writer: (s: string) => void,
    tokenPos: number,
    emitCallback: (token: Syntax, writer: (s: string) => void, tokenStartPos: number) => number
  ) {
    if (sourceMapsDisabled || (node && qc.is.inJsonFile(node))) return emitCallback(token, writer, tokenPos);
    const emitNode = node && node.emitNode;
    const emitFlags = (emitNode && emitNode.flags) || EmitFlags.None;
    const range = emitNode && emitNode.tokenSourceMapRanges && emitNode.tokenSourceMapRanges[token];
    const source = (range && range.source) || sourceMapSource;
    tokenPos = skipSourceTrivia(source, range ? range.pos : tokenPos);
    if ((emitFlags & EmitFlags.NoTokenLeadingSourceMaps) === 0 && tokenPos >= 0) {
      emitSourcePos(source, tokenPos);
    }
    tokenPos = emitCallback(token, writer, tokenPos);
    if (range) tokenPos = range.end;
    if ((emitFlags & EmitFlags.NoTokenTrailingSourceMaps) === 0 && tokenPos >= 0) {
      emitSourcePos(source, tokenPos);
    }
    return tokenPos;
  }
  function setSourceMapSource(source: SourceMapSource) {
    if (sourceMapsDisabled) {
      return;
    }
    sourceMapSource = source;
    if (isJsonSourceMapSource(source)) {
      return;
    }
    sourceMapSourceIndex = sourceMapGenerator!.addSource(source.fileName);
    if (printerOptions.inlineSources) {
      sourceMapGenerator!.setSourceContent(sourceMapSourceIndex, source.text);
    }
  }
  function isJsonSourceMapSource(sourceFile: SourceMapSource) {
    return fileExtensionIs(sourceFile.fileName, Extension.Json);
  }
}
function createBracketsMap() {
  const brackets: string[][] = [];
  brackets[ListFormat.Braces] = ['{', '}'];
  brackets[ListFormat.Parenthesis] = ['(', ')'];
  brackets[ListFormat.AngleBrackets] = ['<', '>'];
  brackets[ListFormat.SquareBrackets] = ['[', ']'];
  return brackets;
}
function getOpeningBracket(format: ListFormat) {
  return brackets[format & ListFormat.BracketsMask][0];
}
function getClosingBracket(format: ListFormat) {
  return brackets[format & ListFormat.BracketsMask][1];
}
function emitDoc(node: Doc) {
  write('/**');
  if (node.comment) {
    const lines = node.comment.split(/\r\n?|\n/g);
    for (const line of lines) {
      writeLine();
      writeSpace();
      writePunctuation('*');
      writeSpace();
      write(line);
    }
  }
  if (node.tags) {
    if (node.tags.length === 1 && node.tags[0].kind === Syntax.DocTypeTag && !node.comment) {
      writeSpace();
      emit(node.tags[0]);
    } else {
      emitList(node, node.tags, ListFormat.DocComment);
    }
  }
  writeSpace();
  write('*/');
}
const enum TempFlags {
  Auto = 0x00000000,
  CountMask = 0x0fffffff,
  _i = 0x10000000,
}
const stringWriter = createSingleLineStringWriter();
function createSingleLineStringWriter(): EmitTextWriter {
  let str = '';
  const writeText: (text: string) => void = (text) => (str += text);
  return {
    getText: () => str,
    write: writeText,
    rawWrite: writeText,
    writeKeyword: writeText,
    writeOperator: writeText,
    writePunctuation: writeText,
    writeSpace: writeText,
    writeStringLiteral: writeText,
    writeLiteral: writeText,
    writeParameter: writeText,
    writeProperty: writeText,
    writeSymbol: (s, _) => writeText(s),
    writeTrailingSemicolon: writeText,
    writeComment: writeText,
    getTextPos: () => str.length,
    getLine: () => 0,
    getColumn: () => 0,
    getIndent: () => 0,
    isAtStartOfLine: () => false,
    hasTrailingComment: () => false,
    hasTrailingWhitespace: () => !!str.length && qy.is.whiteSpaceLike(str.charCodeAt(str.length - 1)),
    writeLine: () => (str += ' '),
    increaseIndent: noop,
    decreaseIndent: noop,
    clear: () => (str = ''),
    trackSymbol: noop,
    reportInaccessibleThisError: noop,
    reportInaccessibleUniqueSymbolError: noop,
    reportPrivateInBaseOfClassExpression: noop,
  };
}
export function usingSingleLineStringWriter(action: (writer: EmitTextWriter) => void): string {
  const oldString = stringWriter.getText();
  try {
    action(stringWriter);
    return stringWriter.getText();
  } finally {
    stringWriter.clear();
    stringWriter.writeKeyword(oldString);
  }
}
export function createTextWriter(newLine: string): EmitTextWriter {
  let output: string;
  let indent: number;
  let lineStart: boolean;
  let lineCount: number;
  let linePos: number;
  let hasTrailingComment = false;
  function updateLineCountAndPosFor(s: string) {
    const s2 = qy.get.lineStarts(s);
    if (s2.length > 1) {
      lineCount = lineCount + s2.length - 1;
      linePos = output.length - s.length + last(s2);
      lineStart = linePos - output.length === 0;
    } else {
      lineStart = false;
    }
  }
  function writeText(s: string) {
    if (s && s.length) {
      if (lineStart) {
        s = getIndentString(indent) + s;
        lineStart = false;
      }
      output += s;
      updateLineCountAndPosFor(s);
    }
  }
  function write(s: string) {
    if (s) hasTrailingComment = false;
    writeText(s);
  }
  function writeComment(s: string) {
    if (s) hasTrailingComment = true;
    writeText(s);
  }
  function reset(): void {
    output = '';
    indent = 0;
    lineStart = true;
    lineCount = 0;
    linePos = 0;
    hasTrailingComment = false;
  }
  function rawWrite(s: string) {
    if (s !== undefined) {
      output += s;
      updateLineCountAndPosFor(s);
      hasTrailingComment = false;
    }
  }
  function writeLiteral(s: string) {
    if (s && s.length) {
      write(s);
    }
  }
  function writeLine(force?: boolean) {
    if (!lineStart || force) {
      output += newLine;
      lineCount++;
      linePos = output.length;
      lineStart = true;
      hasTrailingComment = false;
    }
  }
  function getTextPosWithWriteLine() {
    return lineStart ? output.length : output.length + newLine.length;
  }
  reset();
  return {
    write,
    rawWrite,
    writeLiteral,
    writeLine,
    increaseIndent: () => {
      indent++;
    },
    decreaseIndent: () => {
      indent--;
    },
    getIndent: () => indent,
    getTextPos: () => output.length,
    getLine: () => lineCount,
    getColumn: () => (lineStart ? indent * getIndentSize() : output.length - linePos),
    getText: () => output,
    isAtStartOfLine: () => lineStart,
    hasTrailingComment: () => hasTrailingComment,
    hasTrailingWhitespace: () => !!output.length && qy.is.whiteSpaceLike(output.charCodeAt(output.length - 1)),
    clear: reset,
    reportInaccessibleThisError: noop,
    reportPrivateInBaseOfClassExpression: noop,
    reportInaccessibleUniqueSymbolError: noop,
    trackSymbol: noop,
    writeKeyword: write,
    writeOperator: write,
    writeParameter: write,
    writeProperty: write,
    writePunctuation: write,
    writeSpace: write,
    writeStringLiteral: write,
    writeSymbol: (s, _) => write(s),
    writeTrailingSemicolon: write,
    writeComment,
    getTextPosWithWriteLine,
  };
}
export function getTrailingSemicolonDeferringWriter(writer: EmitTextWriter): EmitTextWriter {
  let pendingTrailingSemicolon = false;
  function commitPendingTrailingSemicolon() {
    if (pendingTrailingSemicolon) {
      writer.writeTrailingSemicolon(';');
      pendingTrailingSemicolon = false;
    }
  }
  return {
    ...writer,
    writeTrailingSemicolon() {
      pendingTrailingSemicolon = true;
    },
    writeLiteral(s) {
      commitPendingTrailingSemicolon();
      writer.writeLiteral(s);
    },
    writeStringLiteral(s) {
      commitPendingTrailingSemicolon();
      writer.writeStringLiteral(s);
    },
    writeSymbol(s, sym) {
      commitPendingTrailingSemicolon();
      writer.writeSymbol(s, sym);
    },
    writePunctuation(s) {
      commitPendingTrailingSemicolon();
      writer.writePunctuation(s);
    },
    writeKeyword(s) {
      commitPendingTrailingSemicolon();
      writer.writeKeyword(s);
    },
    writeOperator(s) {
      commitPendingTrailingSemicolon();
      writer.writeOperator(s);
    },
    writeParameter(s) {
      commitPendingTrailingSemicolon();
      writer.writeParameter(s);
    },
    writeSpace(s) {
      commitPendingTrailingSemicolon();
      writer.writeSpace(s);
    },
    writeProperty(s) {
      commitPendingTrailingSemicolon();
      writer.writeProperty(s);
    },
    writeComment(s) {
      commitPendingTrailingSemicolon();
      writer.writeComment(s);
    },
    writeLine() {
      commitPendingTrailingSemicolon();
      writer.writeLine();
    },
    increaseIndent() {
      commitPendingTrailingSemicolon();
      writer.increaseIndent();
    },
    decreaseIndent() {
      commitPendingTrailingSemicolon();
      writer.decreaseIndent();
    },
  };
}
export function emitComments(
  text: string,
  lineMap: readonly number[],
  writer: EmitTextWriter,
  comments: readonly CommentRange[] | undefined,
  leadingSeparator: boolean,
  trailingSeparator: boolean,
  newLine: string,
  writeComment: (text: string, lineMap: readonly number[], writer: EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) => void
) {
  if (comments && comments.length > 0) {
    if (leadingSeparator) {
      writer.writeSpace(' ');
    }
    let emitInterveningSeparator = false;
    for (const comment of comments) {
      if (emitInterveningSeparator) {
        writer.writeSpace(' ');
        emitInterveningSeparator = false;
      }
      writeComment(text, lineMap, writer, comment.pos, comment.end, newLine);
      if (comment.hasTrailingNewLine) {
        writer.writeLine();
      } else {
        emitInterveningSeparator = true;
      }
    }
    if (emitInterveningSeparator && trailingSeparator) {
      writer.writeSpace(' ');
    }
  }
}
export function emitDetachedComments(
  text: string,
  lineMap: readonly number[],
  writer: EmitTextWriter,
  writeComment: (text: string, lineMap: readonly number[], writer: EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) => void,
  node: TextRange,
  newLine: string,
  removeComments: boolean
) {
  let leadingComments: CommentRange[] | undefined;
  let currentDetachedCommentInfo: { nodePos: number; detachedCommentEndPos: number } | undefined;
  if (removeComments) {
    if (node.pos === 0) {
      leadingComments = filter(qy.get.leadingCommentRanges(text, node.pos), qy.is.pinnedCommentLocal);
    }
  } else {
    leadingComments = qy.get.leadingCommentRanges(text, node.pos);
  }
  if (leadingComments) {
    const detachedComments: CommentRange[] = [];
    let lastComment: CommentRange | undefined;
    for (const comment of leadingComments) {
      if (lastComment) {
        const lastCommentLine = getLineOfLocalPositionFromLineMap(lineMap, lastComment.end);
        const commentLine = getLineOfLocalPositionFromLineMap(lineMap, comment.pos);
        if (commentLine >= lastCommentLine + 2) {
          break;
        }
      }
      detachedComments.push(comment);
      lastComment = comment;
    }
    if (detachedComments.length) {
      const lastCommentLine = getLineOfLocalPositionFromLineMap(lineMap, last(detachedComments).end);
      const nodeLine = getLineOfLocalPositionFromLineMap(lineMap, qy.skipTrivia(text, node.pos));
      if (nodeLine >= lastCommentLine + 2) {
        emitNewLineBeforeLeadingComments(lineMap, writer, node, leadingComments);
        emitComments(text, lineMap, writer, detachedComments, true, newLine, writeComment);
        currentDetachedCommentInfo = { nodePos: node.pos, detachedCommentEndPos: last(detachedComments).end };
      }
    }
  }
  return currentDetachedCommentInfo;
  function qy.is.pinnedCommentLocal(comment: CommentRange) {
    return qy.is.pinnedComment(text, comment.pos);
  }
}
export function writeCommentRange(text: string, lineMap: readonly number[], writer: EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) {
  if (text.charCodeAt(commentPos + 1) === Codes.asterisk) {
    const firstCommentLineAndChar = qy.get.lineAndCharOf(lineMap, commentPos);
    const lineCount = lineMap.length;
    let firstCommentLineIndent: number | undefined;
    for (let pos = commentPos, currentLine = firstCommentLineAndChar.line; pos < commentEnd; currentLine++) {
      const nextLineStart = currentLine + 1 === lineCount ? text.length + 1 : lineMap[currentLine + 1];
      if (pos !== commentPos) {
        if (firstCommentLineIndent === undefined) {
          firstCommentLineIndent = calculateIndent(text, lineMap[firstCommentLineAndChar.line], commentPos);
        }
        const currentWriterIndentSpacing = writer.getIndent() * getIndentSize();
        const spacesToEmit = currentWriterIndentSpacing - firstCommentLineIndent + calculateIndent(text, pos, nextLineStart);
        if (spacesToEmit > 0) {
          let numberOfSingleSpacesToEmit = spacesToEmit % getIndentSize();
          const indentSizeSpaceString = getIndentString((spacesToEmit - numberOfSingleSpacesToEmit) / getIndentSize());
          writer.rawWrite(indentSizeSpaceString);
          while (numberOfSingleSpacesToEmit) {
            writer.rawWrite(' ');
            numberOfSingleSpacesToEmit--;
          }
        } else {
          writer.rawWrite('');
        }
      }
      writeTrimmedCurrentLine(text, commentEnd, writer, newLine, pos, nextLineStart);
      pos = nextLineStart;
    }
  } else {
    writer.writeComment(text.substring(commentPos, commentEnd));
  }
}
function writeTrimmedCurrentLine(text: string, commentEnd: number, writer: EmitTextWriter, newLine: string, pos: number, nextLineStart: number) {
  const end = Math.min(commentEnd, nextLineStart - 1);
  const currentLineText = text.substring(pos, end).replace(/^\s+|\s+$/g, '');
  if (currentLineText) {
    writer.writeComment(currentLineText);
    if (end !== commentEnd) {
      writer.writeLine();
    }
  } else {
    writer.rawWrite(newLine);
  }
}
