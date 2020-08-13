import { Node } from './types';
import { qf } from './core';
import { Syntax } from './syntax';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
const brackets = createBracketsMap();
const syntheticParent: TextRange = { pos: -1, end: -1 };
export interface EmitFileNames {
  jsFilePath?: string | undefined;
  sourceMapFilePath?: string | undefined;
  declarationFilePath?: string | undefined;
  declarationMapPath?: string | undefined;
  buildInfoPath?: string | undefined;
}
export function getExternalModuleNameFromDeclaration(
  host: ResolveModuleNameResolutionHost,
  resolver: qt.EmitResolver,
  declaration: qt.ImportEqualsDeclaration | qt.ImportDeclaration | qt.ExportDeclaration | qt.ModuleDeclaration | qt.ImportTyping
): string | undefined {
  const file = resolver.getExternalModuleFileFromDeclaration(declaration);
  if (!file || file.isDeclarationFile) {
    return;
  }
  return getResolvedExternalModuleName(host, file);
}

export function getSourceFilePathInNewDir(fileName: string, host: qt.EmitHost, newDirPath: string): string {
  return getSourceFilePathInNewDirWorker(fileName, newDirPath, host.getCurrentDirectory(), host.getCommonSourceDirectory(), (f) => host.getCanonicalFileName(f));
}
export function getOwnEmitOutputFilePath(fileName: string, host: qt.EmitHost, extension: string) {
  const compilerOpts = host.getCompilerOpts();
  let emitOutputFilePathWithoutExtension: string;
  if (compilerOpts.outDir) {
    emitOutputFilePathWithoutExtension = removeFileExtension(getSourceFilePathInNewDir(fileName, host, compilerOpts.outDir));
  } else {
    emitOutputFilePathWithoutExtension = removeFileExtension(fileName);
  }
  return emitOutputFilePathWithoutExtension + extension;
}
export function getDeclarationEmitOutputFilePath(fileName: string, host: qt.EmitHost) {
  return getDeclarationEmitOutputFilePathWorker(fileName, host.getCompilerOpts(), host.getCurrentDirectory(), host.getCommonSourceDirectory(), (f) => host.getCanonicalFileName(f));
}
export function getDeclarationEmitOutputFilePathWorker(
  fileName: string,
  opts: qt.CompilerOpts,
  currentDirectory: string,
  commonSourceDirectory: string,
  getCanonicalFileName: GetCanonicalFileName
): string {
  const outputDir = opts.declarationDir || opts.outDir;
  const path = outputDir ? getSourceFilePathInNewDirWorker(fileName, outputDir, currentDirectory, commonSourceDirectory, getCanonicalFileName) : fileName;
  return removeFileExtension(path) + Extension.Dts;
}
export function emitNewLineBeforeLeadingComments(lineMap: readonly number[], writer: qt.EmitTextWriter, node: TextRange, leadingComments: readonly qt.CommentRange[] | undefined) {
  emitNewLineBeforeLeadingCommentsOfPosition(lineMap, writer, node.pos, leadingComments);
}
export function emitNewLineBeforeLeadingCommentsOfPosition(lineMap: readonly number[], writer: qt.EmitTextWriter, pos: number, leadingComments: readonly qt.CommentRange[] | undefined) {
  if (
    leadingComments &&
    leadingComments.length &&
    pos !== leadingComments[0].pos &&
    getLineOfLocalPositionFromLineMap(lineMap, pos) !== getLineOfLocalPositionFromLineMap(lineMap, leadingComments[0].pos)
  ) {
    writer.writeLine();
  }
}
export function emitNewLineBeforeLeadingCommentOfPosition(lineMap: readonly number[], writer: qt.EmitTextWriter, pos: number, commentPos: number) {
  if (pos !== commentPos && getLineOfLocalPositionFromLineMap(lineMap, pos) !== getLineOfLocalPositionFromLineMap(lineMap, commentPos)) {
    writer.writeLine();
  }
}
export function isBuildInfoFile(file: string) {
  return fileExtensionIs(file, Extension.TsBuildInfo);
}
export function forEachEmittedFile<T>(
  host: qt.EmitHost,
  action: (emitFileNames: EmitFileNames, sourceFileOrBundle: qt.SourceFile | qt.Bundle | undefined) => T,
  sourceFilesOrTargetSourceFile?: readonly qt.SourceFile[] | qt.SourceFile,
  forceDtsEmit = false,
  onlyBuildInfo?: boolean,
  includeBuildInfo?: boolean
) {
  const sourceFiles = isArray(sourceFilesOrTargetSourceFile) ? sourceFilesOrTargetSourceFile : getSourceFilesToEmit(host, sourceFilesOrTargetSourceFile, forceDtsEmit);
  const opts = host.getCompilerOpts();
  if (opts.outFile || opts.out) {
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
      const buildInfoPath = getTsBuildInfoEmitOutputFilePath(host.getCompilerOpts());
      if (buildInfoPath) return action({ buildInfoPath }, undefined);
    }
  }
}
export function getTsBuildInfoEmitOutputFilePath(opts: qt.CompilerOpts) {
  const configFile = opts.configFilePath;
  if (!isIncrementalCompilation(opts)) return;
  if (opts.tsBuildInfoFile) return opts.tsBuildInfoFile;
  const outPath = opts.outFile || opts.out;
  let buildInfoExtensionLess: string;
  if (outPath) {
    buildInfoExtensionLess = removeFileExtension(outPath);
  } else {
    if (!configFile) return;
    const configFileExtensionLess = removeFileExtension(configFile);
    buildInfoExtensionLess = opts.outDir
      ? opts.rootDir
        ? resolvePath(opts.outDir, getRelativePathFromDirectory(opts.rootDir, configFileExtensionLess, true))
        : combinePaths(opts.outDir, getBaseFileName(configFileExtensionLess))
      : configFileExtensionLess;
  }
  return buildInfoExtensionLess + Extension.TsBuildInfo;
}
export function getOutputPathsForBundle(opts: qt.CompilerOpts, forceDtsPaths: boolean): EmitFileNames {
  const outPath = opts.outFile || opts.out!;
  const jsFilePath = opts.emitDeclarationOnly ? undefined : outPath;
  const sourceMapFilePath = jsFilePath && getSourceMapFilePath(jsFilePath, opts);
  const declarationFilePath = forceDtsPaths || getEmitDeclarations(opts) ? removeFileExtension(outPath) + Extension.Dts : undefined;
  const declarationMapPath = declarationFilePath && getAreDeclarationMapsEnabled(opts) ? declarationFilePath + '.map' : undefined;
  const buildInfoPath = getTsBuildInfoEmitOutputFilePath(opts);
  return { jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath };
}
export function getOutputPathsFor(sourceFile: qt.SourceFile | qt.Bundle, host: qt.EmitHost, forceDtsPaths: boolean): EmitFileNames {
  const opts = host.getCompilerOpts();
  if (sourceFile.kind === Syntax.Bundle) return getOutputPathsForBundle(opts, forceDtsPaths);
  else {
    const ownOutputFilePath = getOwnEmitOutputFilePath(sourceFile.fileName, host, getOutputExtension(sourceFile, opts));
    const isJsonFile = qf.is.jsonSourceFile(sourceFile);
    const isJsonEmittedToSameLocation = isJsonFile && comparePaths(sourceFile.fileName, ownOutputFilePath, host.getCurrentDirectory(), !host.useCaseSensitiveFileNames()) === Comparison.EqualTo;
    const jsFilePath = opts.emitDeclarationOnly || isJsonEmittedToSameLocation ? undefined : ownOutputFilePath;
    const sourceMapFilePath = !jsFilePath || qf.is.jsonSourceFile(sourceFile) ? undefined : getSourceMapFilePath(jsFilePath, opts);
    const declarationFilePath = forceDtsPaths || (getEmitDeclarations(opts) && !isJsonFile) ? getDeclarationEmitOutputFilePath(sourceFile.fileName, host) : undefined;
    const declarationMapPath = declarationFilePath && getAreDeclarationMapsEnabled(opts) ? declarationFilePath + '.map' : undefined;
    return { jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath: undefined };
  }
}
function getSourceMapFilePath(jsFilePath: string, opts: qt.CompilerOpts) {
  return opts.sourceMap && !opts.inlineSourceMap ? jsFilePath + '.map' : undefined;
}
export function getOutputExtension(sourceFile: qt.SourceFile, opts: qt.CompilerOpts): Extension {
  if (qf.is.jsonSourceFile(sourceFile)) return Extension.Json;
  if (opts.jsx === JsxEmit.Preserve) {
    if (sourceFile.isJS()) {
      if (fileExtensionIs(sourceFile.fileName, Extension.Jsx)) return Extension.Jsx;
    } else if (sourceFile.languageVariant === LanguageVariant.JSX) {
      return Extension.Jsx;
    }
  }
  return Extension.Js;
}
function rootDirOfOpts(configFile: qt.ParsedCommandLine) {
  return configFile.opts.rootDir || getDirectoryPath(Debug.checkDefined(configFile.opts.configFilePath));
}
function getOutputPathWithoutChangingExt(inputFileName: string, configFile: qt.ParsedCommandLine, ignoreCase: boolean, outputDir: string | undefined) {
  return outputDir ? resolvePath(outputDir, getRelativePathFromDirectory(rootDirOfOpts(configFile), inputFileName, ignoreCase)) : inputFileName;
}
export function getOutputDeclarationFileName(inputFileName: string, configFile: qt.ParsedCommandLine, ignoreCase: boolean) {
  qu.assert(!fileExtensionIs(inputFileName, Extension.Dts) && !fileExtensionIs(inputFileName, Extension.Json));
  return changeExtension(getOutputPathWithoutChangingExt(inputFileName, configFile, ignoreCase, configFile.opts.declarationDir || configFile.opts.outDir), Extension.Dts);
}
function getOutputJSFileName(inputFileName: string, configFile: qt.ParsedCommandLine, ignoreCase: boolean) {
  if (configFile.opts.emitDeclarationOnly) return;
  const isJsonFile = fileExtensionIs(inputFileName, Extension.Json);
  const outputFileName = changeExtension(
    getOutputPathWithoutChangingExt(inputFileName, configFile, ignoreCase, configFile.opts.outDir),
    isJsonFile ? Extension.Json : fileExtensionIs(inputFileName, Extension.Tsx) && configFile.opts.jsx === JsxEmit.Preserve ? Extension.Jsx : Extension.Js
  );
  return !isJsonFile || comparePaths(inputFileName, outputFileName, Debug.checkDefined(configFile.opts.configFilePath), ignoreCase) !== Comparison.EqualTo ? outputFileName : undefined;
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
function getSingleOutputFileNames(configFile: qt.ParsedCommandLine, addOutput: ReturnType<typeof createAddOutput>['addOutput']) {
  const { jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath } = getOutputPathsForBundle(configFile.opts, false);
  addOutput(jsFilePath);
  addOutput(sourceMapFilePath);
  addOutput(declarationFilePath);
  addOutput(declarationMapPath);
  addOutput(buildInfoPath);
}
function getOwnOutputFileNames(configFile: qt.ParsedCommandLine, inputFileName: string, ignoreCase: boolean, addOutput: ReturnType<typeof createAddOutput>['addOutput']) {
  if (fileExtensionIs(inputFileName, Extension.Dts)) return;
  const js = getOutputJSFileName(inputFileName, configFile, ignoreCase);
  addOutput(js);
  if (fileExtensionIs(inputFileName, Extension.Json)) return;
  if (js && configFile.opts.sourceMap) {
    addOutput(`${js}.map`);
  }
  if (getEmitDeclarations(configFile.opts)) {
    const dts = getOutputDeclarationFileName(inputFileName, configFile, ignoreCase);
    addOutput(dts);
    if (configFile.opts.declarationMap) {
      addOutput(`${dts}.map`);
    }
  }
}
export function getAllProjectOutputs(configFile: qt.ParsedCommandLine, ignoreCase: boolean): readonly string[] {
  const { addOutput, getOutputs } = createAddOutput();
  if (configFile.opts.outFile || configFile.opts.out) {
    getSingleOutputFileNames(configFile, addOutput);
  } else {
    for (const inputFileName of configFile.fileNames) {
      getOwnOutputFileNames(configFile, inputFileName, ignoreCase, addOutput);
    }
    addOutput(getTsBuildInfoEmitOutputFilePath(configFile.opts));
  }
  return getOutputs();
}
export function getOutputFileNames(commandLine: qt.ParsedCommandLine, inputFileName: string, ignoreCase: boolean): readonly string[] {
  inputFileName = normalizePath(inputFileName);
  qu.assert(contains(commandLine.fileNames, inputFileName), `Expected fileName to be present in command line`);
  const { addOutput, getOutputs } = createAddOutput();
  if (commandLine.opts.outFile || commandLine.opts.out) {
    getSingleOutputFileNames(commandLine, addOutput);
  } else {
    getOwnOutputFileNames(commandLine, inputFileName, ignoreCase, addOutput);
  }
  return getOutputs();
}
export function getFirstProjectOutput(configFile: qt.ParsedCommandLine, ignoreCase: boolean): string {
  if (configFile.opts.outFile || configFile.opts.out) {
    const { jsFilePath } = getOutputPathsForBundle(configFile.opts, false);
    return Debug.checkDefined(jsFilePath, `project ${configFile.opts.configFilePath} expected to have at least one output`);
  }
  for (const inputFileName of configFile.fileNames) {
    if (fileExtensionIs(inputFileName, Extension.Dts)) continue;
    const jsFilePath = getOutputJSFileName(inputFileName, configFile, ignoreCase);
    if (jsFilePath) return jsFilePath;
    if (fileExtensionIs(inputFileName, Extension.Json)) continue;
    if (getEmitDeclarations(configFile.opts)) return getOutputDeclarationFileName(inputFileName, configFile, ignoreCase);
  }
  const buildInfoPath = getTsBuildInfoEmitOutputFilePath(configFile.opts);
  if (buildInfoPath) return buildInfoPath;
  return fail(`project ${configFile.opts.configFilePath} expected to have at least one output`);
}
export function emitFiles(
  resolver: qt.EmitResolver,
  host: qt.EmitHost,
  targetSourceFile: qt.SourceFile | undefined,
  { scriptTransformers, declarationTransformers }: qt.EmitTransformers,
  emitOnlyDtsFiles?: boolean,
  onlyBuildInfo?: boolean,
  forceDtsEmit?: boolean
): qt.EmitResult {
  const compilerOpts = host.getCompilerOpts();
  const sourceMapDataList: qt.SourceMapEmitResult[] | undefined = compilerOpts.sourceMap || compilerOpts.inlineSourceMap || getAreDeclarationMapsEnabled(compilerOpts) ? [] : undefined;
  const emittedFilesList: string[] | undefined = compilerOpts.listEmittedFiles ? [] : undefined;
  const emitterDiagnostics = createDiagnosticCollection();
  const newLine = getNewLineCharacter(compilerOpts, () => host.getNewLine());
  const writer = createTextWriter(newLine);
  const { enter, exit } = performance.createTimer('printTime', 'beforePrint', 'afterPrint');
  let bundleBuildInfo: qt.BundleBuildInfo | undefined;
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
  function emitSourceFileOrBundle({ jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath, buildInfoPath }: EmitFileNames, sourceFileOrBundle: qt.SourceFile | qt.Bundle | undefined) {
    let buildInfoDirectory: string | undefined;
    if (buildInfoPath && sourceFileOrBundle && qf.is.kind(qc.Bundle, sourceFileOrBundle)) {
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
  function emitBuildInfo(bundle: qt.BundleBuildInfo | undefined, buildInfoPath: string | undefined) {
    if (!buildInfoPath || targetSourceFile || emitSkipped) return;
    const program = host.getProgramBuildInfo();
    if (host.isEmitBlocked(buildInfoPath) || compilerOpts.noEmit) {
      emitSkipped = true;
      return;
    }
    const version = qnr.version;
    writeFile(host, emitterDiagnostics, buildInfoPath, getBuildInfoText({ bundle, program, version }), false);
  }
  function emitJsFileOrBundle(
    sourceFileOrBundle: qt.SourceFile | qt.Bundle | undefined,
    jsFilePath: string | undefined,
    sourceMapFilePath: string | undefined,
    relativeToBuildInfo: (path: string) => string
  ) {
    if (!sourceFileOrBundle || emitOnlyDtsFiles || !jsFilePath) {
      return;
    }
    if ((jsFilePath && host.isEmitBlocked(jsFilePath)) || compilerOpts.noEmit) {
      emitSkipped = true;
      return;
    }
    const transform = transformNodes(resolver, host, compilerOpts, [sourceFileOrBundle], scriptTransformers, false);
    const printerOpts: qt.PrinterOpts = {
      removeComments: compilerOpts.removeComments,
      newLine: compilerOpts.newLine,
      noEmitHelpers: compilerOpts.noEmitHelpers,
      module: compilerOpts.module,
      target: compilerOpts.target,
      sourceMap: compilerOpts.sourceMap,
      inlineSourceMap: compilerOpts.inlineSourceMap,
      inlineSources: compilerOpts.inlineSources,
      extendedDiagnostics: compilerOpts.extendedDiagnostics,
      writeBundleFileInfo: !!bundleBuildInfo,
      relativeToBuildInfo,
    };
    const printer = createPrinter(printerOpts, {
      hasGlobalName: resolver.hasGlobalName,
      onEmitNode: transform.emitNodeWithNotification,
      isEmitNotificationEnabled: transform.isEmitNotificationEnabled,
      substituteNode: transform.substituteNode,
    });
    qu.assert(transform.transformed.length === 1, 'Should only see one output from the transform');
    printSourceFileOrBundle(jsFilePath, sourceMapFilePath, transform.transformed[0], printer, compilerOpts);
    transform.dispose();
    if (bundleBuildInfo) bundleBuildInfo.js = printer.bundleFileInfo;
  }
  function emitDeclarationFileOrBundle(
    sourceFileOrBundle: qt.SourceFile | qt.Bundle | undefined,
    declarationFilePath: string | undefined,
    declarationMapPath: string | undefined,
    relativeToBuildInfo: (path: string) => string
  ) {
    if (!sourceFileOrBundle) return;
    if (!declarationFilePath) {
      if (emitOnlyDtsFiles || compilerOpts.emitDeclarationOnly) emitSkipped = true;
      return;
    }
    const sourceFiles = qf.is.kind(qc.SourceFile, sourceFileOrBundle) ? [sourceFileOrBundle] : sourceFileOrBundle.sourceFiles;
    const filesForEmit = forceDtsEmit ? sourceFiles : filter(sourceFiles, isSourceFileNotJson);
    const inputListOrBundle =
      compilerOpts.outFile || compilerOpts.out ? [new qc.Bundle(filesForEmit, !qf.is.kind(qc.SourceFile, sourceFileOrBundle) ? sourceFileOrBundle.prepends : undefined)] : filesForEmit;
    if (emitOnlyDtsFiles && !getEmitDeclarations(compilerOpts)) {
      filesForEmit.forEach(collectLinkedAliases);
    }
    const declarationTransform = transformNodes(resolver, host, compilerOpts, inputListOrBundle, declarationTransformers, false);
    if (length(declarationTransform.diagnostics)) {
      for (const diagnostic of declarationTransform.diagnostics!) {
        emitterqd.add(diagnostic);
      }
    }
    const printerOpts: qt.PrinterOpts = {
      removeComments: compilerOpts.removeComments,
      newLine: compilerOpts.newLine,
      noEmitHelpers: true,
      module: compilerOpts.module,
      target: compilerOpts.target,
      sourceMap: compilerOpts.sourceMap,
      inlineSourceMap: compilerOpts.inlineSourceMap,
      extendedDiagnostics: compilerOpts.extendedDiagnostics,
      onlyPrintDocStyle: true,
      writeBundleFileInfo: !!bundleBuildInfo,
      recordInternalSection: !!bundleBuildInfo,
      relativeToBuildInfo,
    };
    const declarationPrinter = createPrinter(printerOpts, {
      hasGlobalName: resolver.hasGlobalName,
      onEmitNode: declarationTransform.emitNodeWithNotification,
      isEmitNotificationEnabled: declarationTransform.isEmitNotificationEnabled,
      substituteNode: declarationTransform.substituteNode,
    });
    const declBlocked = (!!declarationTransform.diagnostics && !!declarationTransform.diagnostics.length) || !!host.isEmitBlocked(declarationFilePath) || !!compilerOpts.noEmit;
    emitSkipped = emitSkipped || declBlocked;
    if (!declBlocked || forceDtsEmit) {
      qu.assert(declarationTransform.transformed.length === 1, 'Should only see one output from the decl transform');
      printSourceFileOrBundle(declarationFilePath, declarationMapPath, declarationTransform.transformed[0], declarationPrinter, {
        sourceMap: compilerOpts.declarationMap,
        sourceRoot: compilerOpts.sourceRoot,
        mapRoot: compilerOpts.mapRoot,
        extendedDiagnostics: compilerOpts.extendedDiagnostics,
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
    if (qf.is.kind(qc.ExportAssignment, node)) {
      if (node.expression.kind === Syntax.Identifier) {
        resolver.collectLinkedAliases(node.expression as qt.Identifier, true);
      }
      return;
    } else if (qf.is.kind(qc.ExportSpecifier, node)) {
      resolver.collectLinkedAliases(node.propertyName || node.name, true);
      return;
    }
    qf.each.child(node, collectLinkedAliases);
  }
  function printSourceFileOrBundle(jsFilePath: string, sourceMapFilePath: string | undefined, sourceFileOrBundle: qt.SourceFile | qt.Bundle, printer: qt.Printer, mapOpts: SourceMapOpts) {
    const bundle = sourceFileOrBundle.kind === Syntax.Bundle ? sourceFileOrBundle : undefined;
    const sourceFile = sourceFileOrBundle.kind === Syntax.SourceFile ? sourceFileOrBundle : undefined;
    const sourceFiles = bundle ? bundle.sourceFiles : [sourceFile!];
    let sourceMapGenerator: qt.SourceMapGenerator | undefined;
    if (shouldEmitSourceMaps(mapOpts, sourceFileOrBundle)) {
      sourceMapGenerator = createSourceMapGenerator(
        host,
        getBaseFileName(normalizeSlashes(jsFilePath)),
        getSourceRoot(mapOpts),
        getSourceMapDirectory(mapOpts, jsFilePath, sourceFile),
        mapOpts
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
      const sourceMappingURL = getSourceMappingURL(mapOpts, sourceMapGenerator, jsFilePath, sourceMapFilePath, sourceFile);
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
    writeFile(host, emitterDiagnostics, jsFilePath, writer.getText(), !!compilerOpts.emitBOM, sourceFiles);
    writer.clear();
  }
  interface SourceMapOpts {
    sourceMap?: boolean;
    inlineSourceMap?: boolean;
    inlineSources?: boolean;
    sourceRoot?: string;
    mapRoot?: string;
    extendedDiagnostics?: boolean;
  }
  function shouldEmitSourceMaps(mapOpts: SourceMapOpts, sourceFileOrBundle: qt.SourceFile | qt.Bundle) {
    return (mapOpts.sourceMap || mapOpts.inlineSourceMap) && (sourceFileOrBundle.kind !== Syntax.SourceFile || !fileExtensionIs(sourceFileOrBundle.fileName, Extension.Json));
  }
  function getSourceRoot(mapOpts: SourceMapOpts) {
    const sourceRoot = normalizeSlashes(mapOpts.sourceRoot || '');
    return sourceRoot ? ensureTrailingDirectorySeparator(sourceRoot) : sourceRoot;
  }
  function getSourceMapDirectory(mapOpts: SourceMapOpts, filePath: string, sourceFile: qt.SourceFile | undefined) {
    if (mapOpts.sourceRoot) return host.getCommonSourceDirectory();
    if (mapOpts.mapRoot) {
      let sourceMapDir = normalizeSlashes(mapOpts.mapRoot);
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
  function getSourceMappingURL(mapOpts: SourceMapOpts, sourceMapGenerator: qt.SourceMapGenerator, filePath: string, sourceMapFilePath: string | undefined, sourceFile: qt.SourceFile | undefined) {
    if (mapOpts.inlineSourceMap) {
      const sourceMapText = sourceMapGenerator.toString();
      const base64SourceMapText = base64encode(sys, sourceMapText);
      return `data:application/json;base64,${base64SourceMapText}`;
    }
    const sourceMapFile = getBaseFileName(normalizeSlashes(Debug.checkDefined(sourceMapFilePath)));
    if (mapOpts.mapRoot) {
      let sourceMapDir = normalizeSlashes(mapOpts.mapRoot);
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
export function getBuildInfoText(buildInfo: qt.BuildInfo) {
  return JSON.stringify(buildInfo, undefined, 2);
}
export function getBuildInfo(buildInfoText: string) {
  return JSON.parse(buildInfoText) as qt.BuildInfo;
}
export const notImplementedResolver: qt.EmitResolver = {
  hasGlobalName: notImplemented,
  getReferencedExportContainer: notImplemented,
  getReferencedImportDeclaration: notImplemented,
  getReferencedDeclarationWithCollidingName: notImplemented,
  isDeclarationWithCollidingName: notImplemented,
  isValueAliasDeclaration: notImplemented,
  referencedAliasDeclaration: notImplemented,
  isTopLevelValueImportEqualsWithEntityName: notImplemented,
  getNodeCheckFlags: notImplemented,
  qf.is.declarationVisible: notImplemented,
  isLateBound: (_node): _node is qt.LateBoundDecl => false,
  collectLinkedAliases: notImplemented,
  isImplementationOfOverload: notImplemented,
  isRequiredInitializedParam: notImplemented,
  isOptionalUninitializedParamProperty: notImplemented,
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
  isOptionalParam: notImplemented,
  moduleExportsSomeValue: notImplemented,
  isArgsLocalBinding: notImplemented,
  getExternalModuleFileFromDeclaration: notImplemented,
  getTypeReferenceDirectivesForEntityName: notImplemented,
  getTypeReferenceDirectivesForSymbol: notImplemented,
  isLiteralConstDeclaration: notImplemented,
  getJsxFactoryEntity: notImplemented,
  qf.get.allAccessorDeclarations: notImplemented,
  getSymbolOfExternalModuleSpecifier: notImplemented,
  isBindingCapturedByNode: notImplemented,
  getDeclarationStmtsForSourceFile: notImplemented,
  isImportRequiredByAugmentation: notImplemented,
};
export type EmitUsingBuildInfoResult = string | readonly OutputFile[];
export interface EmitUsingBuildInfoHost extends qt.ModuleResolutionHost {
  getCurrentDirectory(): string;
  getCanonicalFileName(fileName: string): string;
  useCaseSensitiveFileNames(): boolean;
  getNewLine(): string;
}
function createSourceFilesFromBundleBuildInfo(bundle: qt.BundleBuildInfo, buildInfoDirectory: string, host: EmitUsingBuildInfoHost): readonly qt.SourceFile[] {
  const sourceFiles = bundle.sourceFiles.map((fileName) => {
    const sourceFile = createNode(Syntax.SourceFile, 0, 0) as qt.SourceFile;
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
        const statement = createNode(Syntax.ExpressionStatement, directive.pos, directive.end) as qt.PrologueDirective;
        statement.expression = createNode(Syntax.StringLiteral, directive.expression.pos, directive.expression.end) as qt.StringLiteral;
        statement.expression.text = directive.expression.text;
        return statement;
      })
    );
  });
  return sourceFiles;
}
export function emitUsingBuildInfo(
  config: qt.ParsedCommandLine,
  host: EmitUsingBuildInfoHost,
  getCommandLine: (ref: qt.ProjectReference) => qt.ParsedCommandLine | undefined,
  customTransformers?: qt.CustomTransformers
): EmitUsingBuildInfoResult {
  const { buildInfoPath, jsFilePath, sourceMapFilePath, declarationFilePath, declarationMapPath } = getOutputPathsForBundle(config.opts, false);
  const buildInfoText = host.readFile(Debug.checkDefined(buildInfoPath));
  if (!buildInfoText) return buildInfoPath!;
  const jsFileText = host.readFile(Debug.checkDefined(jsFilePath));
  if (!jsFileText) return jsFilePath!;
  const sourceMapText = sourceMapFilePath && host.readFile(sourceMapFilePath);
  if ((sourceMapFilePath && !sourceMapText) || config.opts.inlineSourceMap) return sourceMapFilePath || 'inline sourcemap decoding';
  const declarationText = declarationFilePath && host.readFile(declarationFilePath);
  if (declarationFilePath && !declarationText) return declarationFilePath;
  const declarationMapText = declarationMapPath && host.readFile(declarationMapPath);
  if ((declarationMapPath && !declarationMapText) || config.opts.inlineSourceMap) return declarationMapPath || 'inline sourcemap decoding';
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
  const emitHost: qt.EmitHost = {
    getPrependNodes: memoize(() => [...prependNodes, ownPrependInput]),
    getCanonicalFileName: host.getCanonicalFileName,
    getCommonSourceDirectory: () => getNormalizedAbsolutePath(buildInfo.bundle!.commonSourceDirectory, buildInfoDirectory),
    getCompilerOpts: () => config.opts,
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
  emitFiles(notImplementedResolver, emitHost, undefined, getTransformers(config.opts, customTransformers));
  return outputFiles;
}
const enum PipelinePhase {
  Notification,
  Substitution,
  Comments,
  SourceMaps,
  Emit,
}
export function createPrinter(printerOpts: qt.PrinterOpts = {}, handlers: qt.PrintHandlers = {}): qt.Printer {
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
  const extendedDiagnostics = !!printerOpts.extendedDiagnostics;
  const newLine = getNewLineCharacter(printerOpts);
  const moduleKind = getEmitModuleKind(printerOpts);
  const bundledHelpers = createMap<boolean>();
  let currentSourceFile: qt.SourceFile | undefined;
  let nodeIdToGeneratedName: string[];
  let autoGeneratedIdToGeneratedName: string[];
  let generatedNames: qu.QMap<true>;
  let tempFlagsStack: TempFlags[];
  let tempFlags: TempFlags;
  let reservedNamesStack: qu.QMap<true>[];
  let reservedNames: qu.QMap<true>;
  let preserveSourceNewlines = printerOpts.preserveSourceNewlines;
  let writer: qt.EmitTextWriter;
  let ownWriter: qt.EmitTextWriter;
  let write = writeBase;
  let isOwnFileEmit: boolean;
  const bundleFileInfo = printerOpts.writeBundleFileInfo ? ({ sections: [] } as qt.BundleFileInfo) : undefined;
  const relativeToBuildInfo = bundleFileInfo ? Debug.checkDefined(printerOpts.relativeToBuildInfo) : undefined;
  const recordInternalSection = printerOpts.recordInternalSection;
  let sourceFileTextPos = 0;
  let sourceFileTextKind: BundleFileTextLikeKind = BundleFileSectionKind.Text;
  let sourceMapsDisabled = true;
  let sourceMapGenerator: qt.SourceMapGenerator | undefined;
  let sourceMapSource: qt.SourceMapSource;
  let sourceMapSourceIndex = -1;
  let containerPos = -1;
  let containerEnd = -1;
  let declarationListContainerEnd = -1;
  let currentLineMap: readonly number[] | undefined;
  let detachedCommentsInfo: { nodePos: number; detachedCommentEndPos: number }[] | undefined;
  let hasWrittenComment = false;
  let commentsDisabled = !!printerOpts.removeComments;
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
  function printNode(hint: EmitHint, node: Node, sourceFile: qt.SourceFile): string {
    switch (hint) {
      case EmitHint.SourceFile:
        qu.assert(qf.is.kind(qc.SourceFile, node), 'Expected a qt.SourceFile node.');
        break;
      case EmitHint.IdentifierName:
        qu.assert(qf.is.kind(qc.Identifier, node), 'Expected an qt.Identifier node.');
        break;
      case EmitHint.Expression:
        qu.assert(qf.is.expression(node), 'Expected an Expression node.');
        break;
    }
    switch (node.kind) {
      case Syntax.SourceFile:
        return printFile(<qt.SourceFile>node);
      case Syntax.Bundle:
        return printBundle(<qt.Bundle>node);
      case Syntax.UnparsedSource:
        return printUnparsedSource(<qt.UnparsedSource>node);
    }
    writeNode(hint, node, sourceFile, beginPrint());
    return endPrint();
  }
  function printList<T extends Node>(format: ListFormat, nodes: Nodes<T>, sourceFile: qt.SourceFile) {
    writeList(format, nodes, sourceFile, beginPrint());
    return endPrint();
  }
  function printBundle(bundle: qt.Bundle): string {
    writeBundle(bundle, beginPrint(), undefined);
    return endPrint();
  }
  function printFile(sourceFile: qt.SourceFile): string {
    writeFile(sourceFile, beginPrint(), undefined);
    return endPrint();
  }
  function printUnparsedSource(unparsed: qt.UnparsedSource): string {
    writeUnparsedSource(unparsed, beginPrint());
    return endPrint();
  }
  function writeNode(hint: EmitHint, node: Typing, sourceFile: undefined, output: qt.EmitTextWriter): void;
  function writeNode(hint: EmitHint, node: Node, sourceFile: qt.SourceFile, output: qt.EmitTextWriter): void;
  function writeNode(hint: EmitHint, node: Node, sourceFile: qt.SourceFile | undefined, output: qt.EmitTextWriter) {
    const previousWriter = writer;
    setWriter(output, undefined);
    print(hint, node, sourceFile);
    reset();
    writer = previousWriter;
  }
  function writeList<T extends Node>(format: ListFormat, nodes: Nodes<T>, sourceFile: qt.SourceFile | undefined, output: qt.EmitTextWriter) {
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
      (qf.is.declaration(node) || qf.is.kind(qc.VariableStatement, node)) &&
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
  function isBundleFileTextLike(s: qt.BundleFileSection): s is qt.BundleFileTextLike {
    switch (s.kind) {
      case qt.BundleFileSectionKind.Text:
      case qt.BundleFileSectionKind.Internal:
        return true;
    }
    return false;
  }

  function writeBundle(bundle: qt.Bundle, output: qt.EmitTextWriter, sourceMapGenerator: qt.SourceMapGenerator | undefined) {
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
            data: relativeToBuildInfo!((prepend as qt.UnparsedSource).fileName),
            texts: newSections as qt.BundleFileTextLike[],
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
  function writeUnparsedSource(unparsed: qt.UnparsedSource, output: qt.EmitTextWriter) {
    const previousWriter = writer;
    setWriter(output, undefined);
    print(EmitHint.Unspecified, unparsed, undefined);
    reset();
    writer = previousWriter;
  }
  function writeFile(sourceFile: qt.SourceFile, output: qt.EmitTextWriter, sourceMapGenerator: qt.SourceMapGenerator | undefined) {
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
  function print(hint: EmitHint, node: Node, sourceFile: qt.SourceFile | undefined) {
    if (sourceFile) {
      setSourceFile(sourceFile);
    }
    pipelineEmit(hint, node);
  }
  function setSourceFile(sourceFile: qt.SourceFile | undefined) {
    currentSourceFile = sourceFile;
    currentLineMap = undefined;
    detachedCommentsInfo = undefined;
    if (sourceFile) {
      setSourceMapSource(sourceFile);
    }
  }
  function setWriter(_writer: qt.EmitTextWriter | undefined, _sourceMapGenerator: qt.SourceMapGenerator | undefined) {
    if (_writer && printerOpts.omitTrailingSemicolon) {
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
  function emitIdentifierName(node: qt.Identifier): Node;
  function emitIdentifierName(node: qt.Identifier | undefined): Node | undefined;
  function emitIdentifierName(node: qt.Identifier | undefined): Node | undefined {
    if (node === undefined) return;
    return pipelineEmit(EmitHint.IdentifierName, node);
  }
  function emitExpression(node: Expression): Node;
  function emitExpression(node: Expression | undefined): Node | undefined;
  function emitExpression(node: Expression | undefined): Node | undefined {
    if (node === undefined) return;
    return pipelineEmit(EmitHint.Expression, node);
  }
  function emitJsxAttributeValue(node: qt.StringLiteral | qt.JsxExpression): Node {
    return pipelineEmit(qf.is.kind(qc.StringLiteral, node) ? EmitHint.JsxAttributeValue : EmitHint.Unspecified, node);
  }
  function pipelineEmit(emitHint: EmitHint, node: Node) {
    const savedLastNode = lastNode;
    const savedLastSubstitution = lastSubstitution;
    const savedPreserveSourceNewlines = preserveSourceNewlines;
    lastNode = node;
    lastSubstitution = undefined;
    if (preserveSourceNewlines && !!(qf.get.emitFlags(node) & EmitFlags.IgnoreSourceNewlines)) {
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
        if (!sourceMapsDisabled && node.kind !== Syntax.SourceFile && !qf.is.inJsonFile(node)) return pipelineEmitWithSourceMap;
      case PipelinePhase.Emit:
        return pipelineEmitWithHint;
      default:
        return qc.assert.never(phase);
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
    if (hint === EmitHint.MappedTypeParam) return emitMappedTypeParam(cast(node, isTypeParamDeclaration));
    if (hint === EmitHint.EmbeddedStatement) {
      qc.assert.node(node, isEmptyStatement);
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
          return emitUnparsedSourceOrPrepend(<qt.UnparsedSource>node);
        case Syntax.UnparsedPrologue:
          return writeUnparsedNode(<UnparsedNode>node);
        case Syntax.UnparsedText:
        case Syntax.UnparsedInternalText:
          return emitUnparsedTextLike(<qt.UnparsedTextLike>node);
        case Syntax.UnparsedSyntheticReference:
          return emitUnparsedSyntheticReference(<qt.UnparsedSyntheticReference>node);
        case Syntax.Identifier:
          return emitIdentifier(<qt.Identifier>node);
        case Syntax.PrivateIdentifier:
          return emitPrivateIdentifier(node as qt.PrivateIdentifier);
        case Syntax.QualifiedName:
          return emitQualifiedName(<qt.QualifiedName>node);
        case Syntax.ComputedPropertyName:
          return emitComputedPropertyName(<qt.ComputedPropertyName>node);
        case Syntax.TypeParam:
          return emitTypeParam(<qt.TypeParamDeclaration>node);
        case Syntax.Param:
          return emitParam(<qt.ParamDeclaration>node);
        case Syntax.Decorator:
          return emitDecorator(<qt.Decorator>node);
        case Syntax.PropertySignature:
          return emitPropertySignature(<qt.PropertySignature>node);
        case Syntax.PropertyDeclaration:
          return emitPropertyDeclaration(<qt.PropertyDeclaration>node);
        case Syntax.MethodSignature:
          return emitMethodSignature(<qt.MethodSignature>node);
        case Syntax.MethodDeclaration:
          return emitMethodDeclaration(<qt.MethodDeclaration>node);
        case Syntax.Constructor:
          return emitConstructor(<qt.ConstructorDeclaration>node);
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
          return emitAccessorDeclaration(<qt.AccessorDeclaration>node);
        case Syntax.CallSignature:
          return emitCallSignature(<qt.CallSignatureDeclaration>node);
        case Syntax.ConstructSignature:
          return emitConstructSignature(<qt.ConstructSignatureDeclaration>node);
        case Syntax.IndexSignature:
          return emitIndexSignature(<qt.IndexSignatureDeclaration>node);
        case Syntax.TypingPredicate:
          return emitTypePredicate(<qt.TypingPredicate>node);
        case Syntax.TypingReference:
          return emitTypeReference(<qt.TypingReference>node);
        case Syntax.FunctionTyping:
          return emitFunctionType(<qt.FunctionTyping>node);
        case Syntax.DocFunctionTyping:
          return emitDocFunctionTyping(node as qt.DocFunctionTyping);
        case Syntax.ConstructorTyping:
          return emitConstructorType(<qt.ConstructorTyping>node);
        case Syntax.TypingQuery:
          return emitTypeQuery(<qt.TypingQuery>node);
        case Syntax.TypingLiteral:
          return emitTypeLiteral(<qt.TypingLiteral>node);
        case Syntax.ArrayTyping:
          return emitArrayType(<qt.ArrayTyping>node);
        case Syntax.TupleTyping:
          return emitTupleType(<qt.TupleTyping>node);
        case Syntax.OptionalTyping:
          return emitOptionalType(<qt.OptionalTyping>node);
        case Syntax.UnionTyping:
          return emitUnionType(<qt.UnionTyping>node);
        case Syntax.IntersectionTyping:
          return emitIntersectionType(<qt.IntersectionTyping>node);
        case Syntax.ConditionalTyping:
          return emitConditionalType(<qt.ConditionalTyping>node);
        case Syntax.InferTyping:
          return emitInferType(<qt.InferTyping>node);
        case Syntax.ParenthesizedTyping:
          return emitParenthesizedType(<qt.ParenthesizedTyping>node);
        case Syntax.ExpressionWithTypings:
          return emitExpressionWithTypings(<qt.ExpressionWithTypings>node);
        case Syntax.ThisTyping:
          return emitThisType();
        case Syntax.TypingOperator:
          return emitTypeOperator(<qt.TypingOperator>node);
        case Syntax.IndexedAccessTyping:
          return emitIndexedAccessType(<qt.IndexedAccessTyping>node);
        case Syntax.MappedTyping:
          return emitMappedType(<qt.MappedTyping>node);
        case Syntax.LiteralTyping:
          return emitLiteralType(<qt.LiteralTyping>node);
        case Syntax.ImportTyping:
          return emitImportTyping(<qt.ImportTyping>node);
        case Syntax.DocAllTyping:
          writePunctuation('*');
          return;
        case Syntax.DocUnknownTyping:
          writePunctuation('?');
          return;
        case Syntax.DocNullableTyping:
          return emitDocNullableTyping(node as qt.DocNullableTyping);
        case Syntax.DocNonNullableTyping:
          return emitDocNonNullableTyping(node as qt.DocNonNullableTyping);
        case Syntax.DocOptionalTyping:
          return emitDocOptionalTyping(node as qt.DocOptionalTyping);
        case Syntax.RestTyping:
        case Syntax.DocVariadicTyping:
          return emitRestOrDocVariadicTyping(node as qt.RestTyping | qt.DocVariadicTyping);
        case Syntax.NamedTupleMember:
          return emitNamedTupleMember(node as qt.NamedTupleMember);
        case Syntax.ObjectBindingPattern:
          return emitObjectBindingPattern(<qt.ObjectBindingPattern>node);
        case Syntax.ArrayBindingPattern:
          return emitArrayBindingPattern(<qt.ArrayBindingPattern>node);
        case Syntax.BindingElem:
          return emitBindingElem(<qt.BindingElem>node);
        case Syntax.TemplateSpan:
          return emitTemplateSpan(<qt.TemplateSpan>node);
        case Syntax.SemicolonClassElem:
          return emitSemicolonClassElem();
        case Syntax.Block:
          return emitBlock(<qt.Block>node);
        case Syntax.VariableStatement:
          return emitVariableStatement(<qt.VariableStatement>node);
        case Syntax.EmptyStatement:
          return emitEmptyStatement(false);
        case Syntax.ExpressionStatement:
          return emitExpressionStatement(<qt.ExpressionStatement>node);
        case Syntax.IfStatement:
          return emitIfStatement(<qt.IfStatement>node);
        case Syntax.DoStatement:
          return emitDoStatement(<qt.DoStatement>node);
        case Syntax.WhileStatement:
          return emitWhileStatement(<qt.WhileStatement>node);
        case Syntax.ForStatement:
          return emitForStatement(<qt.ForStatement>node);
        case Syntax.ForInStatement:
          return emitForInStatement(<qt.ForInStatement>node);
        case Syntax.ForOfStatement:
          return emitForOfStatement(<qt.ForOfStatement>node);
        case Syntax.ContinueStatement:
          return emitContinueStatement(<qt.ContinueStatement>node);
        case Syntax.BreakStatement:
          return emitBreakStatement(<qt.BreakStatement>node);
        case Syntax.ReturnStatement:
          return emitReturnStatement(<qt.ReturnStatement>node);
        case Syntax.WithStatement:
          return emitWithStatement(<qt.WithStatement>node);
        case Syntax.SwitchStatement:
          return emitSwitchStatement(<qt.SwitchStatement>node);
        case Syntax.LabeledStatement:
          return emitLabeledStatement(<qt.LabeledStatement>node);
        case Syntax.ThrowStatement:
          return emitThrowStatement(<qt.ThrowStatement>node);
        case Syntax.TryStatement:
          return emitTryStatement(<qt.TryStatement>node);
        case Syntax.DebuggerStatement:
          return emitDebuggerStatement(<qt.DebuggerStatement>node);
        case Syntax.VariableDeclaration:
          return emitVariableDeclaration(<qt.VariableDeclaration>node);
        case Syntax.VariableDeclarationList:
          return emitVariableDeclarationList(<qt.VariableDeclarationList>node);
        case Syntax.FunctionDeclaration:
          return emitFunctionDeclaration(<qt.FunctionDeclaration>node);
        case Syntax.ClassDeclaration:
          return emitClassDeclaration(<qt.ClassDeclaration>node);
        case Syntax.InterfaceDeclaration:
          return emitInterfaceDeclaration(<qt.InterfaceDeclaration>node);
        case Syntax.TypeAliasDeclaration:
          return emitTypeAliasDeclaration(<qt.TypeAliasDeclaration>node);
        case Syntax.EnumDeclaration:
          return emitEnumDeclaration(<qt.EnumDeclaration>node);
        case Syntax.ModuleDeclaration:
          return emitModuleDeclaration(<qt.ModuleDeclaration>node);
        case Syntax.ModuleBlock:
          return emitModuleBlock(<qt.ModuleBlock>node);
        case Syntax.CaseBlock:
          return emitCaseBlock(<qt.CaseBlock>node);
        case Syntax.NamespaceExportDeclaration:
          return emitNamespaceExportDeclaration(<qt.NamespaceExportDeclaration>node);
        case Syntax.ImportEqualsDeclaration:
          return emitImportEqualsDeclaration(<qt.ImportEqualsDeclaration>node);
        case Syntax.ImportDeclaration:
          return emitImportDeclaration(<qt.ImportDeclaration>node);
        case Syntax.ImportClause:
          return emitImportClause(<qt.ImportClause>node);
        case Syntax.NamespaceImport:
          return emitNamespaceImport(<qt.NamespaceImport>node);
        case Syntax.NamespaceExport:
          return emitNamespaceExport(<qt.NamespaceExport>node);
        case Syntax.NamedImports:
          return emitNamedImports(<qt.NamedImports>node);
        case Syntax.ImportSpecifier:
          return emitImportSpecifier(<qt.ImportSpecifier>node);
        case Syntax.ExportAssignment:
          return emitExportAssignment(<qt.ExportAssignment>node);
        case Syntax.ExportDeclaration:
          return emitExportDeclaration(<qt.ExportDeclaration>node);
        case Syntax.NamedExports:
          return emitNamedExports(<qt.NamedExports>node);
        case Syntax.ExportSpecifier:
          return emitExportSpecifier(<qt.ExportSpecifier>node);
        case Syntax.MissingDeclaration:
          return;
        case Syntax.ExternalModuleReference:
          return emitExternalModuleReference(<qt.ExternalModuleReference>node);
        case Syntax.JsxText:
          return emitJsxText(<qt.JsxText>node);
        case Syntax.JsxOpeningElem:
        case Syntax.JsxOpeningFragment:
          return emitJsxOpeningElemOrFragment(<qt.JsxOpeningElem>node);
        case Syntax.JsxClosingElem:
        case Syntax.JsxClosingFragment:
          return emitJsxClosingElemOrFragment(<qt.JsxClosingElem>node);
        case Syntax.JsxAttribute:
          return emitJsxAttribute(<qt.JsxAttribute>node);
        case Syntax.JsxAttributes:
          return emitJsxAttributes(<qt.JsxAttributes>node);
        case Syntax.JsxSpreadAttribute:
          return emitJsxSpreadAttribute(<qt.JsxSpreadAttribute>node);
        case Syntax.JsxExpression:
          return emitJsxExpression(<qt.JsxExpression>node);
        case Syntax.CaseClause:
          return emitCaseClause(<qt.CaseClause>node);
        case Syntax.DefaultClause:
          return emitDefaultClause(<qt.DefaultClause>node);
        case Syntax.HeritageClause:
          return emitHeritageClause(<qt.HeritageClause>node);
        case Syntax.CatchClause:
          return emitCatchClause(<qt.CatchClause>node);
        case Syntax.PropertyAssignment:
          return emitPropertyAssignment(<qt.PropertyAssignment>node);
        case Syntax.ShorthandPropertyAssignment:
          return emitShorthandPropertyAssignment(<qt.ShorthandPropertyAssignment>node);
        case Syntax.SpreadAssignment:
          return emitSpreadAssignment(node as qt.SpreadAssignment);
        case Syntax.EnumMember:
          return emitEnumMember(<qt.EnumMember>node);
        case Syntax.DocParamTag:
        case Syntax.DocPropertyTag:
          return emitDocPropertyLikeTag(node as qt.DocPropertyLikeTag);
        case Syntax.DocReturnTag:
        case Syntax.DocTypeTag:
        case Syntax.DocThisTag:
        case Syntax.DocEnumTag:
          return emitDocSimpleTypedTag(node as qt.DocTypeTag);
        case Syntax.DocImplementsTag:
        case Syntax.DocAugmentsTag:
          return emitDocHeritageTag(node as qt.DocImplementsTag | qt.DocAugmentsTag);
        case Syntax.DocTemplateTag:
          return emitDocTemplateTag(node as qt.DocTemplateTag);
        case Syntax.DocTypedefTag:
          return emitDocTypedefTag(node as qt.DocTypedefTag);
        case Syntax.DocCallbackTag:
          return emitDocCallbackTag(node as qt.DocCallbackTag);
        case Syntax.DocSignature:
          return emitDocSignature(node as qt.DocSignature);
        case Syntax.DocTypingLiteral:
          return emitDocTypingLiteral(node as qt.DocTypingLiteral);
        case Syntax.DocClassTag:
        case Syntax.DocUnknownTag:
          return emitDocSimpleTag(node as qt.DocTag);
        case Syntax.DocComment:
          return emitDoc(node as qt.Doc);
      }
      if (qf.is.expression(node)) {
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
          return emitNumericOrBigIntLiteral(<qt.NumericLiteral | qt.BigIntLiteral>node);
        case Syntax.StringLiteral:
        case Syntax.RegexLiteral:
        case Syntax.NoSubstitutionLiteral:
          return emitLiteral(<LiteralExpression>node, false);
        case Syntax.Identifier:
          return emitIdentifier(<qt.Identifier>node);
        case Syntax.FalseKeyword:
        case Syntax.NullKeyword:
        case Syntax.SuperKeyword:
        case Syntax.TrueKeyword:
        case Syntax.ThisKeyword:
        case Syntax.ImportKeyword:
          writeTokenNode(node, writeKeyword);
          return;
        case Syntax.ArrayLiteralExpression:
          return emitArrayLiteralExpression(<qt.ArrayLiteralExpression>node);
        case Syntax.ObjectLiteralExpression:
          return emitObjectLiteralExpression(<qt.ObjectLiteralExpression>node);
        case Syntax.PropertyAccessExpression:
          return emitPropertyAccessExpression(<qt.PropertyAccessExpression>node);
        case Syntax.ElemAccessExpression:
          return emitElemAccessExpression(<qt.ElemAccessExpression>node);
        case Syntax.CallExpression:
          return emitCallExpression(<qt.CallExpression>node);
        case Syntax.NewExpression:
          return emitNewExpression(<qt.NewExpression>node);
        case Syntax.TaggedTemplateExpression:
          return emitTaggedTemplateExpression(<qt.TaggedTemplateExpression>node);
        case Syntax.TypeAssertionExpression:
          return emitTypeAssertionExpression(<qt.TypeAssertion>node);
        case Syntax.ParenthesizedExpression:
          return emitParenthesizedExpression(<qt.ParenthesizedExpression>node);
        case Syntax.FunctionExpression:
          return emitFunctionExpression(<qt.FunctionExpression>node);
        case Syntax.ArrowFunction:
          return emitArrowFunction(<qt.ArrowFunction>node);
        case Syntax.DeleteExpression:
          return emitDeleteExpression(<qt.DeleteExpression>node);
        case Syntax.TypeOfExpression:
          return emitTypeOfExpression(<qt.TypeOfExpression>node);
        case Syntax.VoidExpression:
          return emitVoidExpression(<qt.VoidExpression>node);
        case Syntax.AwaitExpression:
          return emitAwaitExpression(<qt.AwaitExpression>node);
        case Syntax.PrefixUnaryExpression:
          return emitPrefixUnaryExpression(<qt.PrefixUnaryExpression>node);
        case Syntax.PostfixUnaryExpression:
          return emitPostfixUnaryExpression(<qt.PostfixUnaryExpression>node);
        case Syntax.BinaryExpression:
          return emitBinaryExpression(<qt.BinaryExpression>node);
        case Syntax.ConditionalExpression:
          return emitConditionalExpression(<qt.ConditionalExpression>node);
        case Syntax.TemplateExpression:
          return emitTemplateExpression(<qt.TemplateExpression>node);
        case Syntax.YieldExpression:
          return emitYieldExpression(<qt.YieldExpression>node);
        case Syntax.SpreadElem:
          return emitSpreadExpression(<qt.SpreadElem>node);
        case Syntax.ClassExpression:
          return emitClassExpression(<qt.ClassExpression>node);
        case Syntax.OmittedExpression:
          return;
        case Syntax.AsExpression:
          return emitAsExpression(<qt.AsExpression>node);
        case Syntax.NonNullExpression:
          return emitNonNullExpression(<qt.NonNullExpression>node);
        case Syntax.MetaProperty:
          return emitMetaProperty(<qt.MetaProperty>node);
        case Syntax.JsxElem:
          return emitJsxElem(<qt.JsxElem>node);
        case Syntax.JsxSelfClosingElem:
          return emitJsxSelfClosingElem(<qt.JsxSelfClosingElem>node);
        case Syntax.JsxFragment:
          return emitJsxFragment(<qt.JsxFragment>node);
        case Syntax.PartiallyEmittedExpression:
          return emitPartiallyEmittedExpression(<qt.PartiallyEmittedExpression>node);
        case Syntax.CommaListExpression:
          return emitCommaList(<qt.CommaListExpression>node);
      }
    }
  }
  function emitMappedTypeParam(node: qt.TypeParamDeclaration): void {
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
  function getHelpersFromBundledSourceFiles(bundle: qt.Bundle): string[] | undefined {
    let result: string[] | undefined;
    if (moduleKind === ModuleKind.None || printerOpts.noEmitHelpers) {
      return;
    }
    const bundledHelpers = createMap<boolean>();
    for (const sourceFile of bundle.sourceFiles) {
      const shouldSkip = qf.emit.externalHelpersModuleName(sourceFile) !== undefined;
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
    const bundle = node.kind === Syntax.Bundle ? <qt.Bundle>node : undefined;
    if (bundle && moduleKind === ModuleKind.None) {
      return;
    }
    const numPrepends = bundle ? bundle.prepends.length : 0;
    const numNodes = bundle ? bundle.sourceFiles.length + numPrepends : 1;
    for (let i = 0; i < numNodes; i++) {
      const currentNode = bundle ? (i < numPrepends ? bundle.prepends[i] : bundle.sourceFiles[i - numPrepends]) : node;
      const sourceFile = qf.is.kind(qc.SourceFile, currentNode) ? currentNode : qf.is.kind(qc.UnparsedSource, currentNode) ? undefined : currentSourceFile!;
      const shouldSkip = printerOpts.noEmitHelpers || (!!sourceFile && qf.emit.hasRecordedExternalHelpers(sourceFile));
      const shouldBundle = (qf.is.kind(qc.SourceFile, currentNode) || qf.is.kind(qc.UnparsedSource, currentNode)) && !isOwnFileEmit;
      const helpers = qf.is.kind(qc.UnparsedSource, currentNode) ? currentNode.helpers : getSortedEmitHelpers(currentNode);
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
    const helpers = qf.emit.helpers(node);
    return helpers && stableSort(helpers, qf.emit.compareHelpers);
  }
  function emitNumericOrBigIntLiteral(node: qt.NumericLiteral | qt.BigIntLiteral) {
    emitLiteral(node, false);
  }
  function emitLiteral(node: qt.LiteralLikeNode, jsxAttributeEscape: boolean) {
    const text = getLiteralTextOfNode(node, printerOpts.neverAsciiEscape, jsxAttributeEscape);
    if ((printerOpts.sourceMap || printerOpts.inlineSourceMap) && (node.kind === Syntax.StringLiteral || qy.is.templateLiteral(node.kind))) {
      writeLiteral(text);
    } else {
      writeStringLiteral(text);
    }
  }
  function emitUnparsedSourceOrPrepend(unparsed: qt.UnparsedSource | qt.UnparsedPrepend) {
    for (const text of unparsed.texts) {
      writeLine();
      emit(text);
    }
  }
  function writeUnparsedNode(unparsed: UnparsedNode) {
    writer.rawWrite(unparsed.parent.text.substring(unparsed.pos, unparsed.end));
  }
  function emitUnparsedTextLike(unparsed: qt.UnparsedTextLike) {
    const pos = getTextPosWithWriteLine();
    writeUnparsedNode(unparsed);
    if (bundleFileInfo) {
      updateOrPushBundleFileTextLike(pos, writer.getTextPos(), unparsed.kind === Syntax.UnparsedText ? BundleFileSectionKind.Text : BundleFileSectionKind.Internal);
    }
  }
  function emitUnparsedSyntheticReference(unparsed: qt.UnparsedSyntheticReference) {
    const pos = getTextPosWithWriteLine();
    writeUnparsedNode(unparsed);
    if (bundleFileInfo) {
      const section = clone(unparsed.section);
      section.pos = pos;
      section.end = writer.getTextPos();
      bundleFileInfo.sections.push(section);
    }
  }
  function emitIdentifier(node: qt.Identifier) {
    const writeText = node.symbol ? writeSymbol : write;
    writeText(getTextOfNode(node, false), node.symbol);
    emitList(node, node.typeArgs, ListFormat.TypeParams);
  }
  function emitPrivateIdentifier(node: qt.PrivateIdentifier) {
    const writeText = node.symbol ? writeSymbol : write;
    writeText(getTextOfNode(node, false), node.symbol);
  }
  function emitQualifiedName(node: qt.QualifiedName) {
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
  function emitComputedPropertyName(node: qt.ComputedPropertyName) {
    writePunctuation('[');
    emitExpression(node.expression);
    writePunctuation(']');
  }
  function emitTypeParam(node: qt.TypeParamDeclaration) {
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
  function emitParam(node: qt.ParamDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emit(node.dot3Token);
    emitNodeWithWriter(node.name, writeParam);
    emit(node.questionToken);
    if (node.parent && node.parent.kind === Syntax.DocFunctionTyping && !node.name) {
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
  function emitDecorator(decorator: qt.Decorator) {
    writePunctuation('@');
    emitExpression(decorator.expression);
  }
  function emitPropertySignature(node: qt.PropertySignature) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emitNodeWithWriter(node.name, writeProperty);
    emit(node.questionToken);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
  }
  function emitPropertyDeclaration(node: qt.PropertyDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emit(node.name);
    emit(node.questionToken);
    emit(node.exclamationToken);
    emitTypeAnnotation(node.type);
    emitIniter(node.initer, node.type ? node.type.end : node.questionToken ? node.questionToken.end : node.name.end, node);
    writeTrailingSemicolon();
  }
  function emitMethodSignature(node: qt.MethodSignature) {
    pushNameGenerationScope(node);
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emit(node.name);
    emit(node.questionToken);
    emitTypeParams(node, node.typeParams);
    emitParams(node, node.params);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
    popNameGenerationScope(node);
  }
  function emitMethodDeclaration(node: qt.MethodDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emit(node.asteriskToken);
    emit(node.name);
    emit(node.questionToken);
    emitSignatureAndBody(node, emitSignatureHead);
  }
  function emitConstructor(node: qt.ConstructorDeclaration) {
    emitModifiers(node, node.modifiers);
    writeKeyword('constructor');
    emitSignatureAndBody(node, emitSignatureHead);
  }
  function emitAccessorDeclaration(node: qt.AccessorDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword(node.kind === Syntax.GetAccessor ? 'get' : 'set');
    writeSpace();
    emit(node.name);
    emitSignatureAndBody(node, emitSignatureHead);
  }
  function emitCallSignature(node: qt.CallSignatureDeclaration) {
    pushNameGenerationScope(node);
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emitTypeParams(node, node.typeParams);
    emitParams(node, node.params);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
    popNameGenerationScope(node);
  }
  function emitConstructSignature(node: qt.ConstructSignatureDeclaration) {
    pushNameGenerationScope(node);
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('new');
    writeSpace();
    emitTypeParams(node, node.typeParams);
    emitParams(node, node.params);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
    popNameGenerationScope(node);
  }
  function emitIndexSignature(node: qt.IndexSignatureDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emitParamsForIndexSignature(node, node.params);
    emitTypeAnnotation(node.type);
    writeTrailingSemicolon();
  }
  function emitSemicolonClassElem() {
    writeTrailingSemicolon();
  }
  function emitTypePredicate(node: qt.TypingPredicate) {
    if (node.assertsModifier) {
      emit(node.assertsModifier);
      writeSpace();
    }
    emit(node.paramName);
    if (node.type) {
      writeSpace();
      writeKeyword('is');
      writeSpace();
      emit(node.type);
    }
  }
  function emitTypeReference(node: qt.TypingReference) {
    emit(node.typeName);
    emitTypeArgs(node, node.typeArgs);
  }
  function emitFunctionType(node: qt.FunctionTyping) {
    pushNameGenerationScope(node);
    emitTypeParams(node, node.typeParams);
    emitParamsForArrow(node, node.params);
    writeSpace();
    writePunctuation('=>');
    writeSpace();
    emit(node.type);
    popNameGenerationScope(node);
  }
  function emitDocFunctionTyping(node: qt.DocFunctionTyping) {
    writeKeyword('function');
    emitParams(node, node.params);
    writePunctuation(':');
    emit(node.type);
  }
  function emitDocNullableTyping(node: qt.DocNullableTyping) {
    writePunctuation('?');
    emit(node.type);
  }
  function emitDocNonNullableTyping(node: qt.DocNonNullableTyping) {
    writePunctuation('!');
    emit(node.type);
  }
  function emitDocOptionalTyping(node: qt.DocOptionalTyping) {
    emit(node.type);
    writePunctuation('=');
  }
  function emitConstructorType(node: qt.ConstructorTyping) {
    pushNameGenerationScope(node);
    writeKeyword('new');
    writeSpace();
    emitTypeParams(node, node.typeParams);
    emitParams(node, node.params);
    writeSpace();
    writePunctuation('=>');
    writeSpace();
    emit(node.type);
    popNameGenerationScope(node);
  }
  function emitTypeQuery(node: qt.TypingQuery) {
    writeKeyword('typeof');
    writeSpace();
    emit(node.exprName);
  }
  function emitTypeLiteral(node: qt.TypingLiteral) {
    writePunctuation('{');
    const flags = qf.get.emitFlags(node) & EmitFlags.SingleLine ? ListFormat.SingleLineTypeLiteralMembers : ListFormat.MultiLineTypeLiteralMembers;
    emitList(node, node.members, flags | ListFormat.NoSpaceIfEmpty);
    writePunctuation('}');
  }
  function emitArrayType(node: qt.ArrayTyping) {
    emit(node.elemType);
    writePunctuation('[');
    writePunctuation(']');
  }
  function emitRestOrDocVariadicTyping(node: qt.RestTyping | qt.DocVariadicTyping) {
    writePunctuation('...');
    emit(node.type);
  }
  function emitTupleType(node: qt.TupleTyping) {
    emitTokenWithComment(Syntax.OpenBracketToken, node.pos, writePunctuation, node);
    const flags = qf.get.emitFlags(node) & EmitFlags.SingleLine ? ListFormat.SingleLineTupleTypeElems : ListFormat.MultiLineTupleTypeElems;
    emitList(node, node.elems, flags | ListFormat.NoSpaceIfEmpty);
    emitTokenWithComment(Syntax.CloseBracketToken, node.elems.end, writePunctuation, node);
  }
  function emitNamedTupleMember(node: qt.NamedTupleMember) {
    emit(node.dot3Token);
    emit(node.name);
    emit(node.questionToken);
    emitTokenWithComment(Syntax.ColonToken, node.name.end, writePunctuation, node);
    writeSpace();
    emit(node.type);
  }
  function emitOptionalType(node: qt.OptionalTyping) {
    emit(node.type);
    writePunctuation('?');
  }
  function emitUnionType(node: qt.UnionTyping) {
    emitList(node, node.types, ListFormat.UnionTypeConstituents);
  }
  function emitIntersectionType(node: qt.IntersectionTyping) {
    emitList(node, node.types, ListFormat.IntersectionTypeConstituents);
  }
  function emitConditionalType(node: qt.ConditionalTyping) {
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
  function emitInferType(node: qt.InferTyping) {
    writeKeyword('infer');
    writeSpace();
    emit(node.typeParam);
  }
  function emitParenthesizedType(node: qt.ParenthesizedTyping) {
    writePunctuation('(');
    emit(node.type);
    writePunctuation(')');
  }
  function emitThisType() {
    writeKeyword('this');
  }
  function emitTypeOperator(node: qt.TypingOperator) {
    writeTokenText(node.operator, writeKeyword);
    writeSpace();
    emit(node.type);
  }
  function emitIndexedAccessType(node: qt.IndexedAccessTyping) {
    emit(node.objectType);
    writePunctuation('[');
    emit(node.indexType);
    writePunctuation(']');
  }
  function emitMappedType(node: qt.MappedTyping) {
    const emitFlags = qf.get.emitFlags(node);
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
    pipelineEmit(EmitHint.MappedTypeParam, node.typeParam);
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
  function emitLiteralType(node: qt.LiteralTyping) {
    emitExpression(node.literal);
  }
  function emitImportTyping(node: qt.ImportTyping) {
    if (node.isTypeOf) {
      writeKeyword('typeof');
      writeSpace();
    }
    writeKeyword('import');
    writePunctuation('(');
    emit(node.arg);
    writePunctuation(')');
    if (node.qualifier) {
      writePunctuation('.');
      emit(node.qualifier);
    }
    emitTypeArgs(node, node.typeArgs);
  }
  function emitObjectBindingPattern(node: qt.ObjectBindingPattern) {
    writePunctuation('{');
    emitList(node, node.elems, ListFormat.ObjectBindingPatternElems);
    writePunctuation('}');
  }
  function emitArrayBindingPattern(node: qt.ArrayBindingPattern) {
    writePunctuation('[');
    emitList(node, node.elems, ListFormat.ArrayBindingPatternElems);
    writePunctuation(']');
  }
  function emitBindingElem(node: qt.BindingElem) {
    emit(node.dot3Token);
    if (node.propertyName) {
      emit(node.propertyName);
      writePunctuation(':');
      writeSpace();
    }
    emit(node.name);
    emitIniter(node.initer, node.name.end, node);
  }
  function emitArrayLiteralExpression(node: qt.ArrayLiteralExpression) {
    const elems = node.elems;
    const preferNewLine = node.multiLine ? ListFormat.PreferNewLine : ListFormat.None;
    emitExpressionList(node, elems, ListFormat.ArrayLiteralExpressionElems | preferNewLine);
  }
  function emitObjectLiteralExpression(node: qt.ObjectLiteralExpression) {
    forEach(node.properties, generateMemberNames);
    const indentedFlag = qf.get.emitFlags(node) & EmitFlags.Indented;
    if (indentedFlag) {
      increaseIndent();
    }
    const preferNewLine = node.multiLine ? ListFormat.PreferNewLine : ListFormat.None;
    const allowTrailingComma = !qf.is.jsonSourceFile(currentSourceFile!) ? ListFormat.AllowTrailingComma : ListFormat.None;
    emitList(node, node.properties, ListFormat.ObjectLiteralExpressionProperties | allowTrailingComma | preferNewLine);
    if (indentedFlag) {
      decreaseIndent();
    }
  }
  function emitPropertyAccessExpression(node: qt.PropertyAccessExpression) {
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
    expression = qf.skip.partiallyEmittedExpressions(expression);
    if (qf.is.kind(qc.NumericLiteral, expression)) {
      const text = getLiteralTextOfNode(<LiteralExpression>expression, false);
      return !expression.numericLiteralFlags && !qu.stringContains(text, qt.Token.toString(Syntax.DotToken)!);
    } else if (qf.is.accessExpression(expression)) {
      const constantValue = qf.emit.constantValue(expression);
      return typeof constantValue === 'number' && isFinite(constantValue) && Math.floor(constantValue) === constantValue;
    }
    return;
  }
  function emitElemAccessExpression(node: qt.ElemAccessExpression) {
    emitExpression(node.expression);
    emit(node.questionDotToken);
    emitTokenWithComment(Syntax.OpenBracketToken, node.expression.end, writePunctuation, node);
    emitExpression(node.argExpression);
    emitTokenWithComment(Syntax.CloseBracketToken, node.argExpression.end, writePunctuation, node);
  }
  function emitCallExpression(node: qt.CallExpression) {
    emitExpression(node.expression);
    emit(node.questionDotToken);
    emitTypeArgs(node, node.typeArgs);
    emitExpressionList(node, node.args, ListFormat.CallExpressionArgs);
  }
  function emitNewExpression(node: qt.NewExpression) {
    emitTokenWithComment(Syntax.NewKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
    emitTypeArgs(node, node.typeArgs);
    emitExpressionList(node, node.args, ListFormat.NewExpressionArgs);
  }
  function emitTaggedTemplateExpression(node: qt.TaggedTemplateExpression) {
    emitExpression(node.tag);
    emitTypeArgs(node, node.typeArgs);
    writeSpace();
    emitExpression(node.template);
  }
  function emitTypeAssertionExpression(node: qt.TypeAssertion) {
    writePunctuation('<');
    emit(node.type);
    writePunctuation('>');
    emitExpression(node.expression);
  }
  function emitParenthesizedExpression(node: qt.ParenthesizedExpression) {
    const openParenPos = emitTokenWithComment(Syntax.OpenParenToken, node.pos, writePunctuation, node);
    const indented = writeLineSeparatorsAndIndentBefore(node.expression, node);
    emitExpression(node.expression);
    writeLineSeparatorsAfter(node.expression, node);
    decreaseIndentIf(indented);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression ? node.expression.end : openParenPos, writePunctuation, node);
  }
  function emitFunctionExpression(node: qt.FunctionExpression) {
    generateNameIfNeeded(node.name);
    emitFunctionDeclarationOrExpression(node);
  }
  function emitArrowFunction(node: qt.ArrowFunction) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    emitSignatureAndBody(node, emitArrowFunctionHead);
  }
  function emitArrowFunctionHead(node: qt.ArrowFunction) {
    emitTypeParams(node, node.typeParams);
    emitParamsForArrow(node, node.params);
    emitTypeAnnotation(node.type);
    writeSpace();
    emit(node.equalsGreaterThanToken);
  }
  function emitDeleteExpression(node: qt.DeleteExpression) {
    emitTokenWithComment(Syntax.DeleteKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
  }
  function emitTypeOfExpression(node: qt.TypeOfExpression) {
    emitTokenWithComment(Syntax.TypeOfKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
  }
  function emitVoidExpression(node: qt.VoidExpression) {
    emitTokenWithComment(Syntax.VoidKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
  }
  function emitAwaitExpression(node: qt.AwaitExpression) {
    emitTokenWithComment(Syntax.AwaitKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
  }
  function emitPrefixUnaryExpression(node: qt.PrefixUnaryExpression) {
    writeTokenText(node.operator, writeOperator);
    if (shouldEmitWhitespaceBeforeOperand(node)) {
      writeSpace();
    }
    emitExpression(node.operand);
  }
  function shouldEmitWhitespaceBeforeOperand(node: qt.PrefixUnaryExpression) {
    const operand = node.operand;
    return (
      operand.kind === Syntax.PrefixUnaryExpression &&
      ((node.operator === Syntax.PlusToken && ((<qt.PrefixUnaryExpression>operand).operator === Syntax.PlusToken || (<qt.PrefixUnaryExpression>operand).operator === Syntax.Plus2Token)) ||
        (node.operator === Syntax.MinusToken && ((<qt.PrefixUnaryExpression>operand).operator === Syntax.MinusToken || (<qt.PrefixUnaryExpression>operand).operator === Syntax.Minus2Token)))
    );
  }
  function emitPostfixUnaryExpression(node: qt.PostfixUnaryExpression) {
    emitExpression(node.operand);
    writeTokenText(node.operator, writeOperator);
  }
  const enum EmitBinaryExpressionState {
    EmitLeft,
    EmitRight,
    FinishEmit,
  }
  function emitBinaryExpression(node: qt.BinaryExpression) {
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
      if (pipelinePhase === pipelineEmitWithHint && qf.is.kind(qc.next, qt.BinaryExpression)) {
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
  function emitConditionalExpression(node: qt.ConditionalExpression) {
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
  function emitTemplateExpression(node: qt.TemplateExpression) {
    emit(node.head);
    emitList(node, node.templateSpans, ListFormat.TemplateExpressionSpans);
  }
  function emitYieldExpression(node: qt.YieldExpression) {
    emitTokenWithComment(Syntax.YieldKeyword, node.pos, writeKeyword, node);
    emit(node.asteriskToken);
    emitExpressionWithLeadingSpace(node.expression);
  }
  function emitSpreadExpression(node: qt.SpreadElem) {
    emitTokenWithComment(Syntax.Dot3Token, node.pos, writePunctuation, node);
    emitExpression(node.expression);
  }
  function emitClassExpression(node: qt.ClassExpression) {
    generateNameIfNeeded(node.name);
    emitClassDeclarationOrExpression(node);
  }
  function emitExpressionWithTypings(node: qt.ExpressionWithTypings) {
    emitExpression(node.expression);
    emitTypeArgs(node, node.typeArgs);
  }
  function emitAsExpression(node: qt.AsExpression) {
    emitExpression(node.expression);
    if (node.type) {
      writeSpace();
      writeKeyword('as');
      writeSpace();
      emit(node.type);
    }
  }
  function emitNonNullExpression(node: qt.NonNullExpression) {
    emitExpression(node.expression);
    writeOperator('!');
  }
  function emitMetaProperty(node: qt.MetaProperty) {
    writeToken(node.keywordToken, node.pos, writePunctuation);
    writePunctuation('.');
    emit(node.name);
  }
  function emitTemplateSpan(node: qt.TemplateSpan) {
    emitExpression(node.expression);
    emit(node.literal);
  }
  function emitBlock(node: qt.Block) {
    emitBlockStatements(node, !node.multiLine && isEmptyBlock(node));
  }
  function emitBlockStatements(node: BlockLike, forceSingleLine: boolean) {
    emitTokenWithComment(Syntax.OpenBraceToken, node.pos, writePunctuation, node);
    const format = forceSingleLine || qf.get.emitFlags(node) & EmitFlags.SingleLine ? ListFormat.SingleLineBlockStatements : ListFormat.MultiLineBlockStatements;
    emitList(node, node.statements, format);
    emitTokenWithComment(Syntax.CloseBraceToken, node.statements.end, writePunctuation, !!(format & ListFormat.MultiLine));
  }
  function emitVariableStatement(node: qt.VariableStatement) {
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
  function emitExpressionStatement(node: qt.ExpressionStatement) {
    emitExpression(node.expression);
    if (!qf.is.jsonSourceFile(currentSourceFile!) || isSynthesized(node.expression)) {
      writeTrailingSemicolon();
    }
  }
  function emitIfStatement(node: qt.IfStatement) {
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
  function emitWhileClause(node: qt.WhileStatement | qt.DoStatement, startPos: number) {
    const openParenPos = emitTokenWithComment(Syntax.WhileKeyword, startPos, writeKeyword, node);
    writeSpace();
    emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitExpression(node.expression);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression.end, writePunctuation, node);
  }
  function emitDoStatement(node: qt.DoStatement) {
    emitTokenWithComment(Syntax.DoKeyword, node.pos, writeKeyword, node);
    emitEmbeddedStatement(node, node.statement);
    if (qf.is.kind(qc.Block, node.statement)) {
      writeSpace();
    } else {
      writeLineOrSpace(node);
    }
    emitWhileClause(node, node.statement.end);
    writeTrailingSemicolon();
  }
  function emitWhileStatement(node: qt.WhileStatement) {
    emitWhileClause(node, node.pos);
    emitEmbeddedStatement(node, node.statement);
  }
  function emitForStatement(node: qt.ForStatement) {
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
  function emitForInStatement(node: qt.ForInStatement) {
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
  function emitForOfStatement(node: qt.ForOfStatement) {
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
  function emitForBinding(node: qt.VariableDeclarationList | Expression | undefined) {
    if (node !== undefined) {
      if (node.kind === Syntax.VariableDeclarationList) {
        emit(node);
      } else {
        emitExpression(node);
      }
    }
  }
  function emitContinueStatement(node: qt.ContinueStatement) {
    emitTokenWithComment(Syntax.ContinueKeyword, node.pos, writeKeyword, node);
    emitWithLeadingSpace(node.label);
    writeTrailingSemicolon();
  }
  function emitBreakStatement(node: qt.BreakStatement) {
    emitTokenWithComment(Syntax.BreakKeyword, node.pos, writeKeyword, node);
    emitWithLeadingSpace(node.label);
    writeTrailingSemicolon();
  }
  function emitTokenWithComment(token: Syntax, pos: number, writer: (s: string) => void, contextNode: Node, indentLeading?: boolean) {
    const node = qf.get.parseTreeOf(contextNode);
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
  function emitReturnStatement(node: qt.ReturnStatement) {
    emitTokenWithComment(Syntax.ReturnKeyword, node.pos, writeKeyword, node);
    emitExpressionWithLeadingSpace(node.expression);
    writeTrailingSemicolon();
  }
  function emitWithStatement(node: qt.WithStatement) {
    const openParenPos = emitTokenWithComment(Syntax.WithKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitExpression(node.expression);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression.end, writePunctuation, node);
    emitEmbeddedStatement(node, node.statement);
  }
  function emitSwitchStatement(node: qt.SwitchStatement) {
    const openParenPos = emitTokenWithComment(Syntax.SwitchKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitTokenWithComment(Syntax.OpenParenToken, openParenPos, writePunctuation, node);
    emitExpression(node.expression);
    emitTokenWithComment(Syntax.CloseParenToken, node.expression.end, writePunctuation, node);
    writeSpace();
    emit(node.caseBlock);
  }
  function emitLabeledStatement(node: qt.LabeledStatement) {
    emit(node.label);
    emitTokenWithComment(Syntax.ColonToken, node.label.end, writePunctuation, node);
    writeSpace();
    emit(node.statement);
  }
  function emitThrowStatement(node: qt.ThrowStatement) {
    emitTokenWithComment(Syntax.ThrowKeyword, node.pos, writeKeyword, node);
    emitExpressionWithLeadingSpace(node.expression);
    writeTrailingSemicolon();
  }
  function emitTryStatement(node: qt.TryStatement) {
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
  function emitDebuggerStatement(node: qt.DebuggerStatement) {
    writeToken(Syntax.DebuggerKeyword, node.pos, writeKeyword);
    writeTrailingSemicolon();
  }
  function emitVariableDeclaration(node: qt.VariableDeclaration) {
    emit(node.name);
    emit(node.exclamationToken);
    emitTypeAnnotation(node.type);
    emitIniter(node.initer, node.type ? node.type.end : node.name.end, node);
  }
  function emitVariableDeclarationList(node: qt.VariableDeclarationList) {
    writeKeyword(qf.is.aLet(node) ? 'let' : qf.is.varConst(node) ? 'const' : 'var');
    writeSpace();
    emitList(node, node.declarations, ListFormat.VariableDeclarationList);
  }
  function emitFunctionDeclaration(node: qt.FunctionDeclaration) {
    emitFunctionDeclarationOrExpression(node);
  }
  function emitFunctionDeclarationOrExpression(node: qt.FunctionDeclaration | qt.FunctionExpression) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('function');
    emit(node.asteriskToken);
    writeSpace();
    emitIdentifierName(node.name);
    emitSignatureAndBody(node, emitSignatureHead);
  }
  function emitBlockCallback(_hint: EmitHint, body: Node): void {
    emitBlockFunctionBody(<qt.Block>body);
  }
  function emitSignatureAndBody(node: FunctionLikeDeclaration, emitSignatureHead: (node: SignatureDeclaration) => void) {
    const body = node.body;
    if (body) {
      if (qf.is.kind(qc.Block, body)) {
        const indentedFlag = qf.get.emitFlags(node) & EmitFlags.Indented;
        if (indentedFlag) {
          increaseIndent();
        }
        pushNameGenerationScope(node);
        forEach(node.params, generateNames);
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
  function emitSignatureHead(node: qt.FunctionDeclaration | qt.FunctionExpression | qt.MethodDeclaration | qt.AccessorDeclaration | qt.ConstructorDeclaration) {
    emitTypeParams(node, node.typeParams);
    emitParams(node, node.params);
    emitTypeAnnotation(node.type);
  }
  function shouldEmitBlockFunctionBodyOnSingleLine(body: qt.Block) {
    if (qf.get.emitFlags(body) & EmitFlags.SingleLine) return true;
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
  function emitBlockFunctionBody(body: qt.Block) {
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
  function emitBlockFunctionBodyOnSingleLine(body: qt.Block) {
    emitBlockFunctionBodyWorker(body, true);
  }
  function emitBlockFunctionBodyWorker(body: qt.Block, emitBlockFunctionBodyOnSingleLine?: boolean) {
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
  function emitClassDeclaration(node: qt.ClassDeclaration) {
    emitClassDeclarationOrExpression(node);
  }
  function emitClassDeclarationOrExpression(node: qt.ClassDeclaration | qt.ClassExpression) {
    forEach(node.members, generateMemberNames);
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('class');
    if (node.name) {
      writeSpace();
      emitIdentifierName(node.name);
    }
    const indentedFlag = qf.get.emitFlags(node) & EmitFlags.Indented;
    if (indentedFlag) {
      increaseIndent();
    }
    emitTypeParams(node, node.typeParams);
    emitList(node, node.heritageClauses, ListFormat.ClassHeritageClauses);
    writeSpace();
    writePunctuation('{');
    emitList(node, node.members, ListFormat.ClassMembers);
    writePunctuation('}');
    if (indentedFlag) {
      decreaseIndent();
    }
  }
  function emitInterfaceDeclaration(node: qt.InterfaceDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('interface');
    writeSpace();
    emit(node.name);
    emitTypeParams(node, node.typeParams);
    emitList(node, node.heritageClauses, ListFormat.HeritageClauses);
    writeSpace();
    writePunctuation('{');
    emitList(node, node.members, ListFormat.InterfaceMembers);
    writePunctuation('}');
  }
  function emitTypeAliasDeclaration(node: qt.TypeAliasDeclaration) {
    emitDecorators(node, node.decorators);
    emitModifiers(node, node.modifiers);
    writeKeyword('type');
    writeSpace();
    emit(node.name);
    emitTypeParams(node, node.typeParams);
    writeSpace();
    writePunctuation('=');
    writeSpace();
    emit(node.type);
    writeTrailingSemicolon();
  }
  function emitEnumDeclaration(node: qt.EnumDeclaration) {
    emitModifiers(node, node.modifiers);
    writeKeyword('enum');
    writeSpace();
    emit(node.name);
    writeSpace();
    writePunctuation('{');
    emitList(node, node.members, ListFormat.EnumMembers);
    writePunctuation('}');
  }
  function emitModuleDeclaration(node: qt.ModuleDeclaration) {
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
      emit((<qt.ModuleDeclaration>body).name);
      body = (<qt.ModuleDeclaration>body).body!;
    }
    writeSpace();
    emit(body);
  }
  function emitModuleBlock(node: qt.ModuleBlock) {
    pushNameGenerationScope(node);
    forEach(node.statements, generateNames);
    emitBlockStatements(node, isEmptyBlock(node));
    popNameGenerationScope(node);
  }
  function emitCaseBlock(node: qt.CaseBlock) {
    emitTokenWithComment(Syntax.OpenBraceToken, node.pos, writePunctuation, node);
    emitList(node, node.clauses, ListFormat.CaseBlockClauses);
    emitTokenWithComment(Syntax.CloseBraceToken, node.clauses.end, writePunctuation, node, true);
  }
  function emitImportEqualsDeclaration(node: qt.ImportEqualsDeclaration) {
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
  function emitImportDeclaration(node: qt.ImportDeclaration) {
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
  function emitImportClause(node: qt.ImportClause) {
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
  function emitNamespaceImport(node: qt.NamespaceImport) {
    const asPos = emitTokenWithComment(Syntax.AsteriskToken, node.pos, writePunctuation, node);
    writeSpace();
    emitTokenWithComment(Syntax.AsKeyword, asPos, writeKeyword, node);
    writeSpace();
    emit(node.name);
  }
  function emitNamedImports(node: qt.NamedImports) {
    emitNamedImportsOrExports(node);
  }
  function emitImportSpecifier(node: qt.ImportSpecifier) {
    emitImportOrExportSpecifier(node);
  }
  function emitExportAssignment(node: qt.ExportAssignment) {
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
  function emitExportDeclaration(node: qt.ExportDeclaration) {
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
  function emitNamespaceExportDeclaration(node: qt.NamespaceExportDeclaration) {
    let nextPos = emitTokenWithComment(Syntax.ExportKeyword, node.pos, writeKeyword, node);
    writeSpace();
    nextPos = emitTokenWithComment(Syntax.AsKeyword, nextPos, writeKeyword, node);
    writeSpace();
    nextPos = emitTokenWithComment(Syntax.NamespaceKeyword, nextPos, writeKeyword, node);
    writeSpace();
    emit(node.name);
    writeTrailingSemicolon();
  }
  function emitNamespaceExport(node: qt.NamespaceExport) {
    const asPos = emitTokenWithComment(Syntax.AsteriskToken, node.pos, writePunctuation, node);
    writeSpace();
    emitTokenWithComment(Syntax.AsKeyword, asPos, writeKeyword, node);
    writeSpace();
    emit(node.name);
  }
  function emitNamedExports(node: qt.NamedExports) {
    emitNamedImportsOrExports(node);
  }
  function emitExportSpecifier(node: qt.ExportSpecifier) {
    emitImportOrExportSpecifier(node);
  }
  function emitNamedImportsOrExports(node: NamedImportsOrExports) {
    writePunctuation('{');
    emitList(node, node.elems, ListFormat.NamedImportsOrExportsElems);
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
  function emitExternalModuleReference(node: qt.ExternalModuleReference) {
    writeKeyword('require');
    writePunctuation('(');
    emitExpression(node.expression);
    writePunctuation(')');
  }
  function emitJsxElem(node: qt.JsxElem) {
    emit(node.opening);
    emitList(node, node.children, ListFormat.JsxElemOrFragmentChildren);
    emit(node.closing);
  }
  function emitJsxSelfClosingElem(node: qt.JsxSelfClosingElem) {
    writePunctuation('<');
    emitJsxTagName(node.tagName);
    emitTypeArgs(node, node.typeArgs);
    writeSpace();
    emit(node.attributes);
    writePunctuation('/>');
  }
  function emitJsxFragment(node: qt.JsxFragment) {
    emit(node.openingFragment);
    emitList(node, node.children, ListFormat.JsxElemOrFragmentChildren);
    emit(node.closingFragment);
  }
  function emitJsxOpeningElemOrFragment(node: qt.JsxOpeningElem | qt.JsxOpeningFragment) {
    writePunctuation('<');
    if (qf.is.kind(qc.JsxOpeningElem, node)) {
      const indented = writeLineSeparatorsAndIndentBefore(node.tagName, node);
      emitJsxTagName(node.tagName);
      emitTypeArgs(node, node.typeArgs);
      if (node.attributes.properties && node.attributes.properties.length > 0) {
        writeSpace();
      }
      emit(node.attributes);
      writeLineSeparatorsAfter(node.attributes, node);
      decreaseIndentIf(indented);
    }
    writePunctuation('>');
  }
  function emitJsxText(node: qt.JsxText) {
    writer.writeLiteral(node.text);
  }
  function emitJsxClosingElemOrFragment(node: qt.JsxClosingElem | qt.JsxClosingFragment) {
    writePunctuation('</');
    if (qf.is.kind(qc.JsxClosingElem, node)) {
      emitJsxTagName(node.tagName);
    }
    writePunctuation('>');
  }
  function emitJsxAttributes(node: qt.JsxAttributes) {
    emitList(node, node.properties, ListFormat.JsxElemAttributes);
  }
  function emitJsxAttribute(node: qt.JsxAttribute) {
    emit(node.name);
    emitNodeWithPrefix('=', writePunctuation, node.initer, emitJsxAttributeValue);
  }
  function emitJsxSpreadAttribute(node: qt.JsxSpreadAttribute) {
    writePunctuation('{...');
    emitExpression(node.expression);
    writePunctuation('}');
  }
  function emitJsxExpression(node: qt.JsxExpression) {
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
  function emitCaseClause(node: qt.CaseClause) {
    emitTokenWithComment(Syntax.CaseKeyword, node.pos, writeKeyword, node);
    writeSpace();
    emitExpression(node.expression);
    emitCaseOrDefaultClauseRest(node, node.statements, node.expression.end);
  }
  function emitDefaultClause(node: qt.DefaultClause) {
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
  function emitHeritageClause(node: qt.HeritageClause) {
    writeSpace();
    writeTokenText(node.token, writeKeyword);
    writeSpace();
    emitList(node, node.types, ListFormat.HeritageClauseTypes);
  }
  function emitCatchClause(node: qt.CatchClause) {
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
  function emitPropertyAssignment(node: qt.PropertyAssignment) {
    emit(node.name);
    writePunctuation(':');
    writeSpace();
    const initer = node.initer;
    if (emitTrailingCommentsOfPosition && (qf.get.emitFlags(initer) & EmitFlags.NoLeadingComments) === 0) {
      const commentRange = qf.emit.commentRange(initer);
      emitTrailingCommentsOfPosition(commentRange.pos);
    }
    emitExpression(initer);
  }
  function emitShorthandPropertyAssignment(node: qt.ShorthandPropertyAssignment) {
    emit(node.name);
    if (node.objectAssignmentIniter) {
      writeSpace();
      writePunctuation('=');
      writeSpace();
      emitExpression(node.objectAssignmentIniter);
    }
  }
  function emitSpreadAssignment(node: qt.SpreadAssignment) {
    if (node.expression) {
      emitTokenWithComment(Syntax.Dot3Token, node.pos, writePunctuation, node);
      emitExpression(node.expression);
    }
  }
  function emitEnumMember(node: qt.EnumMember) {
    emit(node.name);
    emitIniter(node.initer, node.name.end, node);
  }
  function emitDocSimpleTypedTag(tag: qt.DocTypeTag | qt.DocThisTag | qt.DocEnumTag | qt.DocReturnTag) {
    emitDocTagName(tag.tagName);
    emitDocTypingExpression(tag.typeExpression);
    emitDocComment(tag.comment);
  }
  function emitDocHeritageTag(tag: qt.DocImplementsTag | qt.DocAugmentsTag) {
    emitDocTagName(tag.tagName);
    writeSpace();
    writePunctuation('{');
    emit(tag.class);
    writePunctuation('}');
    emitDocComment(tag.comment);
  }
  function emitDocTemplateTag(tag: qt.DocTemplateTag) {
    emitDocTagName(tag.tagName);
    emitDocTypingExpression(tag.constraint);
    writeSpace();
    emitList(tag, tag.typeParams, ListFormat.CommaListElems);
    emitDocComment(tag.comment);
  }
  function emitDocTypedefTag(tag: qt.DocTypedefTag) {
    emitDocTagName(tag.tagName);
    if (tag.typeExpression) {
      if (tag.typeExpression.kind === Syntax.DocTypingExpression) {
        emitDocTypingExpression(tag.typeExpression);
      } else {
        writeSpace();
        writePunctuation('{');
        write('Object');
        if (tag.typeExpression.qf.is.arrayType) {
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
    if (tag.typeExpression && tag.typeExpression.kind === Syntax.DocTypingLiteral) {
      emitDocTypingLiteral(tag.typeExpression);
    }
  }
  function emitDocCallbackTag(tag: qt.DocCallbackTag) {
    emitDocTagName(tag.tagName);
    if (tag.name) {
      writeSpace();
      emit(tag.name);
    }
    emitDocComment(tag.comment);
    emitDocSignature(tag.typeExpression);
  }
  function emitDocSimpleTag(tag: qt.DocTag) {
    emitDocTagName(tag.tagName);
    emitDocComment(tag.comment);
  }
  function emitDocTypingLiteral(lit: qt.DocTypingLiteral) {
    emitList(lit, new Nodes(lit.docPropertyTags), ListFormat.DocComment);
  }
  function emitDocSignature(sig: qt.DocSignature) {
    if (sig.typeParams) {
      emitList(sig, new Nodes(sig.typeParams), ListFormat.DocComment);
    }
    if (sig.params) {
      emitList(sig, new Nodes(sig.params), ListFormat.DocComment);
    }
    if (sig.type) {
      writeLine();
      writeSpace();
      writePunctuation('*');
      writeSpace();
      emit(sig.type);
    }
  }
  function emitDocPropertyLikeTag(param: qt.DocPropertyLikeTag) {
    emitDocTagName(param.tagName);
    emitDocTypingExpression(param.typeExpression);
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
  function emitDocTagName(tagName: qt.Identifier) {
    writePunctuation('@');
    emit(tagName);
  }
  function emitDocComment(comment: string | undefined) {
    if (comment) {
      writeSpace();
      write(comment);
    }
  }
  function emitDocTypingExpression(typeExpression: qt.DocTypingExpression | undefined) {
    if (typeExpression) {
      writeSpace();
      writePunctuation('{');
      emit(typeExpression.type);
      writePunctuation('}');
    }
  }
  function emitSourceFile(node: qt.SourceFile) {
    writeLine();
    const statements = node.statements;
    if (emitBodyWithDetachedComments) {
      const shouldEmitDetachedComment = statements.length === 0 || !qf.is.prologueDirective(statements[0]) || isSynthesized(statements[0]);
      if (shouldEmitDetachedComment) {
        emitBodyWithDetachedComments(node, statements, emitSourceFileWorker);
        return;
      }
    }
    emitSourceFileWorker(node);
  }
  function emitSyntheticTripleSlashReferencesIfNeeded(node: qt.Bundle) {
    emitTripleSlashDirectives(!!node.hasNoDefaultLib, node.syntheticFileReferences || [], node.syntheticTypeReferences || [], node.syntheticLibReferences || []);
    for (const prepend of node.prepends) {
      if (qf.is.kind(qc.UnparsedSource, prepend) && prepend.syntheticReferences) {
        for (const ref of prepend.syntheticReferences) {
          emit(ref);
          writeLine();
        }
      }
    }
  }
  function emitTripleSlashDirectivesIfNeeded(node: qt.SourceFile) {
    if (node.isDeclarationFile) emitTripleSlashDirectives(node.hasNoDefaultLib, node.referencedFiles, node.typeReferenceDirectives, node.libReferenceDirectives);
  }
  function emitTripleSlashDirectives(hasNoDefaultLib: boolean, files: readonly qt.FileReference[], types: readonly qt.FileReference[], libs: readonly qt.FileReference[]) {
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
  function emitSourceFileWorker(node: qt.SourceFile) {
    const statements = node.statements;
    pushNameGenerationScope(node);
    forEach(node.statements, generateNames);
    emitHelpers(node);
    const index = findIndex(statements, (statement) => !qf.is.prologueDirective(statement));
    emitTripleSlashDirectivesIfNeeded(node);
    emitList(node, statements, ListFormat.MultiLine, index === -1 ? statements.length : index);
    popNameGenerationScope(node);
  }
  function emitPartiallyEmittedExpression(node: qt.PartiallyEmittedExpression) {
    emitExpression(node.expression);
  }
  function emitCommaList(node: qt.CommaListExpression) {
    emitExpressionList(node, node.elems, ListFormat.CommaListElems);
  }
  function emitPrologueDirectives(statements: readonly Node[], sourceFile?: qt.SourceFile, seenPrologueDirectives?: qu.QMap<true>, recordBundleFileSection?: true): number {
    let needsToSetSourceFile = !!sourceFile;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (qf.is.prologueDirective(statement)) {
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
  function emitUnparsedPrologues(prologues: readonly qt.UnparsedPrologue[], seenPrologueDirectives: qu.QMap<true>) {
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
  function emitPrologueDirectivesIfNeeded(sourceFileOrBundle: qt.Bundle | qt.SourceFile) {
    if (qf.is.kind(qc.SourceFile, sourceFileOrBundle)) {
      emitPrologueDirectives(sourceFileOrBundle.statements, sourceFileOrBundle);
    } else {
      const seenPrologueDirectives = createMap<true>();
      for (const prepend of sourceFileOrBundle.prepends) {
        emitUnparsedPrologues((prepend as qt.UnparsedSource).prologues, seenPrologueDirectives);
      }
      for (const sourceFile of sourceFileOrBundle.sourceFiles) {
        emitPrologueDirectives(sourceFile.statements, sourceFile, seenPrologueDirectives, true);
      }
      setSourceFile(undefined);
    }
  }
  function getPrologueDirectivesFromBundledSourceFiles(bundle: qt.Bundle): qt.SourceFilePrologueInfo[] | undefined {
    const seenPrologueDirectives = createMap<true>();
    let prologues: qt.SourceFilePrologueInfo[] | undefined;
    for (let index = 0; index < bundle.sourceFiles.length; index++) {
      const sourceFile = bundle.sourceFiles[index];
      let directives: qt.SourceFilePrologueDirective[] | undefined;
      let end = 0;
      for (const statement of sourceFile.statements) {
        if (!qf.is.prologueDirective(statement)) break;
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
  function emitShebangIfNeeded(sourceFileOrBundle: qt.Bundle | qt.SourceFile | qt.UnparsedSource) {
    if (qf.is.kind(qc.SourceFile, sourceFileOrBundle) || qf.is.kind(qc.UnparsedSource, sourceFileOrBundle)) {
      const shebang = qy.get.shebang(sourceFileOrBundle.text);
      if (shebang) {
        writeComment(shebang);
        writeLine();
        return true;
      }
    } else {
      for (const prepend of sourceFileOrBundle.prepends) {
        qc.assert.node(prepend, isUnparsedSource);
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
  function emitTypeAnnotation(node: Typing | undefined) {
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
    if (qf.is.kind(qc.Block, node) || qf.get.emitFlags(parent) & EmitFlags.SingleLine) {
      writeSpace();
      emit(node);
    } else {
      writeLine();
      increaseIndent();
      if (qf.is.kind(qc.EmptyStatement, node)) {
        pipelineEmit(EmitHint.EmbeddedStatement, node);
      } else {
        emit(node);
      }
      decreaseIndent();
    }
  }
  function emitDecorators(parentNode: Node, decorators: Nodes<qt.Decorator> | undefined) {
    emitList(parentNode, decorators, ListFormat.Decorators);
  }
  function emitTypeArgs(parentNode: Node, typeArgs: Nodes<Typing> | undefined) {
    emitList(parentNode, typeArgs, ListFormat.TypeArgs);
  }
  function emitTypeParams(
    parentNode: SignatureDeclaration | qt.InterfaceDeclaration | qt.TypeAliasDeclaration | qt.ClassDeclaration | qt.ClassExpression,
    typeParams: Nodes<qt.TypeParamDeclaration> | undefined
  ) {
    if (qf.is.functionLike(parentNode) && parentNode.typeArgs) return emitTypeArgs(parentNode, parentNode.typeArgs);
    emitList(parentNode, typeParams, ListFormat.TypeParams);
  }
  function emitParams(parentNode: Node, params: Nodes<qt.ParamDeclaration>) {
    emitList(parentNode, params, ListFormat.Params);
  }
  function canEmitSimpleArrowHead(parentNode: qt.FunctionTyping | qt.ArrowFunction, params: Nodes<qt.ParamDeclaration>) {
    const param = singleOrUndefined(params);
    return (
      param &&
      param.pos === parentNode.pos &&
      qf.is.kind(qc.ArrowFunction, parentNode) &&
      !parentNode.type &&
      !some(parentNode.decorators) &&
      !some(parentNode.modifiers) &&
      !some(parentNode.typeParams) &&
      !some(param.decorators) &&
      !some(param.modifiers) &&
      !param.dot3Token &&
      !param.questionToken &&
      !param.type &&
      !param.initer &&
      qf.is.kind(qc.Identifier, param.name)
    );
  }
  function emitParamsForArrow(parentNode: qt.FunctionTyping | qt.ArrowFunction, params: Nodes<qt.ParamDeclaration>) {
    if (canEmitSimpleArrowHead(parentNode, params)) {
      emitList(parentNode, params, ListFormat.Params & ~ListFormat.Parenthesis);
    } else {
      emitParams(parentNode, params);
    }
  }
  function emitParamsForIndexSignature(parentNode: Node, params: Nodes<qt.ParamDeclaration>) {
    emitList(parentNode, params, ListFormat.IndexSignatureParams);
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
            const commentRange = qf.emit.commentRange(child);
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
      if (previousSibling && format & ListFormat.DelimitersMask && previousSibling.end !== parentNode.end && !(qf.get.emitFlags(previousSibling) & EmitFlags.NoTrailingComments)) {
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
  function writeSymbol(s: string, sym: qt.Symbol) {
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
  function writeParam(s: string) {
    writer.writeParam(s);
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
    const tokenString = qt.Token.toString(token)!;
    writer(tokenString);
    return pos! < 0 ? pos! : pos! + tokenString.length;
  }
  function writeLineOrSpace(node: Node) {
    if (qf.get.emitFlags(node) & EmitFlags.SingleLine) {
      writeSpace();
    } else {
      writeLine();
    }
  }
  function writeLines(text: string): void {
    const lines = text.split(/\r\n?|\n/g);
    const indentation = qy.get.indentation(lines);
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
    } else if (qf.emit.startsOnNewLine(nextNode)) {
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
      const startsOnNewLine = qf.emit.startsOnNewLine(node);
      if (startsOnNewLine === undefined) return (format & ListFormat.PreferNewLine) !== 0;
      return startsOnNewLine;
    }
    return (format & ListFormat.PreferNewLine) !== 0;
  }
  function linesBetweenNodes(parent: Node, node1: Node, node2: Node): number {
    if (qf.get.emitFlags(parent) & EmitFlags.NoIndentation) return 0;
    parent = skipSynthesizedParentheses(parent);
    node1 = skipSynthesizedParentheses(node1);
    node2 = skipSynthesizedParentheses(node2);
    if (qf.emit.startsOnNewLine(node2)) return 1;
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
      node = (<qt.ParenthesizedExpression>node).expression;
    }
    return node;
  }
  function getTextOfNode(node: Node, includeTrivia?: boolean): string {
    if (qf.is.generatedIdentifier(node)) return generateName(node);
    else if (
      (qf.is.kind(qc.Identifier, node) || qf.is.kind(qc.PrivateIdentifier, node)) &&
      (isSynthesized(node) || !node.parent || !currentSourceFile || (node.parent && currentSourceFile && node.sourceFile !== qf.get.originalOf(currentSourceFile)))
    ) {
      return idText(node);
    } else if (node.kind === Syntax.StringLiteral && (<qt.StringLiteral>node).textSourceNode) {
      return getTextOfNode((<qt.StringLiteral>node).textSourceNode!, includeTrivia);
    } else if (qf.is.literalExpression(node) && (isSynthesized(node) || !node.parent)) {
      return node.text;
    }
    return qf.get.sourceTextOfNodeFromSourceFile(currentSourceFile!, node, includeTrivia);
  }
  function getLiteralTextOfNode(node: qt.LiteralLikeNode, neverAsciiEscape: boolean | undefined, jsxAttributeEscape: boolean): string {
    if (node.kind === Syntax.StringLiteral && (<qt.StringLiteral>node).textSourceNode) {
      const textSourceNode = (<qt.StringLiteral>node).textSourceNode!;
      if (qf.is.kind(qc.Identifier, textSourceNode) || qf.is.kind(qc.NumericLiteral, textSourceNode)) {
        const text = qf.is.kind(qc.NumericLiteral, textSourceNode) ? textSourceNode.text : getTextOfNode(textSourceNode);
        return jsxAttributeEscape
          ? `"${escapeJsxAttributeString(text)}"`
          : neverAsciiEscape || qf.get.emitFlags(node) & EmitFlags.NoAsciiEscaping
          ? `"${escapeString(text)}"`
          : `"${escapeNonAsciiString(text)}"`;
      } else {
        return getLiteralTextOfNode(textSourceNode, neverAsciiEscape, jsxAttributeEscape);
      }
    }
    return qf.get.literalText(node, currentSourceFile!, neverAsciiEscape, jsxAttributeEscape);
  }
  function pushNameGenerationScope(node: Node | undefined) {
    if (node && qf.get.emitFlags(node) & EmitFlags.ReuseTempVariableScope) {
      return;
    }
    tempFlagsStack.push(tempFlags);
    tempFlags = 0;
    reservedNamesStack.push(reservedNames);
  }
  function popNameGenerationScope(node: Node | undefined) {
    if (node && qf.get.emitFlags(node) & EmitFlags.ReuseTempVariableScope) {
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
        forEach((<qt.Block>node).statements, generateNames);
        break;
      case Syntax.LabeledStatement:
      case Syntax.WithStatement:
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
        generateNames((<qt.LabeledStatement | qt.WithStatement | qt.DoStatement | qt.WhileStatement>node).statement);
        break;
      case Syntax.IfStatement:
        generateNames((<qt.IfStatement>node).thenStatement);
        generateNames((<qt.IfStatement>node).elseStatement);
        break;
      case Syntax.ForStatement:
      case Syntax.ForOfStatement:
      case Syntax.ForInStatement:
        generateNames((<qt.ForStatement | ForInOrOfStatement>node).initer);
        generateNames((<qt.ForStatement | ForInOrOfStatement>node).statement);
        break;
      case Syntax.SwitchStatement:
        generateNames((<qt.SwitchStatement>node).caseBlock);
        break;
      case Syntax.CaseBlock:
        forEach((<qt.CaseBlock>node).clauses, generateNames);
        break;
      case Syntax.CaseClause:
      case Syntax.DefaultClause:
        forEach((<CaseOrDefaultClause>node).statements, generateNames);
        break;
      case Syntax.TryStatement:
        generateNames((<qt.TryStatement>node).tryBlock);
        generateNames((<qt.TryStatement>node).catchClause);
        generateNames((<qt.TryStatement>node).finallyBlock);
        break;
      case Syntax.CatchClause:
        generateNames((<qt.CatchClause>node).variableDeclaration);
        generateNames((<qt.CatchClause>node).block);
        break;
      case Syntax.VariableStatement:
        generateNames((<qt.VariableStatement>node).declarationList);
        break;
      case Syntax.VariableDeclarationList:
        forEach((<qt.VariableDeclarationList>node).declarations, generateNames);
        break;
      case Syntax.VariableDeclaration:
      case Syntax.Param:
      case Syntax.BindingElem:
      case Syntax.ClassDeclaration:
        generateNameIfNeeded((<qt.NamedDecl>node).name);
        break;
      case Syntax.FunctionDeclaration:
        generateNameIfNeeded((<qt.FunctionDeclaration>node).name);
        if (qf.get.emitFlags(node) & EmitFlags.ReuseTempVariableScope) {
          forEach((<qt.FunctionDeclaration>node).params, generateNames);
          generateNames((<qt.FunctionDeclaration>node).body);
        }
        break;
      case Syntax.ObjectBindingPattern:
      case Syntax.ArrayBindingPattern:
        forEach((<BindingPattern>node).elems, generateNames);
        break;
      case Syntax.ImportDeclaration:
        generateNames((<qt.ImportDeclaration>node).importClause);
        break;
      case Syntax.ImportClause:
        generateNameIfNeeded((<qt.ImportClause>node).name);
        generateNames((<qt.ImportClause>node).namedBindings);
        break;
      case Syntax.NamespaceImport:
        generateNameIfNeeded((<qt.NamespaceImport>node).name);
        break;
      case Syntax.NamespaceExport:
        generateNameIfNeeded((<qt.NamespaceExport>node).name);
        break;
      case Syntax.NamedImports:
        forEach((<qt.NamedImports>node).elems, generateNames);
        break;
      case Syntax.ImportSpecifier:
        generateNameIfNeeded((<qt.ImportSpecifier>node).propertyName || (<qt.ImportSpecifier>node).name);
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
        generateNameIfNeeded((<qt.NamedDecl>node).name);
        break;
    }
  }
  function generateNameIfNeeded(name: DeclarationName | undefined) {
    if (name) {
      if (qf.is.generatedIdentifier(name)) {
        generateName(name);
      } else if (qf.is.kind(qc.BindingPattern, name)) {
        generateNames(name);
      }
    }
  }
  function generateName(name: qt.GeneratedIdentifier) {
    if ((name.autoGenerateFlags & GeneratedIdentifierFlags.KindMask) === GeneratedIdentifierFlags.Node) return generateNameCached(getNodeForGeneratedName(name), name.autoGenerateFlags);
    else {
      const autoGenerateId = name.autoGenerateId!;
      return autoGeneratedIdToGeneratedName[autoGenerateId] || (autoGeneratedIdToGeneratedName[autoGenerateId] = makeName(name));
    }
  }
  function generateNameCached(node: Node, flags?: GeneratedIdentifierFlags) {
    const nodeId = qf.get.nodeId(node);
    return nodeIdToGeneratedName[nodeId] || (nodeIdToGeneratedName[nodeId] = generateNameForNode(node, flags));
  }
  function isUniqueName(name: string): boolean {
    return isFileLevelUniqueName(name) && !generatedNames.has(name) && !(reservedNames && reservedNames.has(name));
  }
  function isFileLevelUniqueName(name: string) {
    return currentSourceFile ? currentSourceFile.isFileLevelUniqueName(name, hasGlobalName) : true;
  }
  function isUniqueLocalName(name: string, container: Node): boolean {
    for (let node = container; qf.is.descendantOf(node, container); node = node.nextContainer!) {
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
  function generateNameForModuleOrEnum(node: qt.ModuleDeclaration | qt.EnumDeclaration) {
    const name = getTextOfNode(node.name);
    return isUniqueLocalName(name, node) ? name : makeUniqueName(name);
  }
  function generateNameForImportOrExportDeclaration(node: qt.ImportDeclaration | qt.ExportDeclaration) {
    const expr = qf.get.externalModuleName(node)!;
    const baseName = qf.is.kind(qc.StringLiteral, expr) ? makeIdentifierFromModuleName(expr.text) : 'module';
    return makeUniqueName(baseName);
  }
  function generateNameForExportDefault() {
    return makeUniqueName('default');
  }
  function generateNameForClassExpression() {
    return makeUniqueName('class');
  }
  function generateNameForMethodOrAccessor(node: qt.MethodDeclaration | qt.AccessorDeclaration) {
    if (qf.is.kind(qc.Identifier, node.name)) return generateNameCached(node.name);
    return makeTempVariableName(TempFlags.Auto);
  }
  function generateNameForNode(node: Node, flags?: GeneratedIdentifierFlags): string {
    switch (node.kind) {
      case Syntax.Identifier:
        return makeUniqueName(getTextOfNode(node), isUniqueName, !!(flags! & GeneratedIdentifierFlags.Optimistic), !!(flags! & GeneratedIdentifierFlags.ReservedInNestedScopes));
      case Syntax.ModuleDeclaration:
      case Syntax.EnumDeclaration:
        return generateNameForModuleOrEnum(<qt.ModuleDeclaration | qt.EnumDeclaration>node);
      case Syntax.ImportDeclaration:
      case Syntax.ExportDeclaration:
        return generateNameForImportOrExportDeclaration(<qt.ImportDeclaration | qt.ExportDeclaration>node);
      case Syntax.FunctionDeclaration:
      case Syntax.ClassDeclaration:
      case Syntax.ExportAssignment:
        return generateNameForExportDefault();
      case Syntax.ClassExpression:
        return generateNameForClassExpression();
      case Syntax.MethodDeclaration:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
        return generateNameForMethodOrAccessor(<qt.MethodDeclaration | qt.AccessorDeclaration>node);
      case Syntax.ComputedPropertyName:
        return makeTempVariableName(TempFlags.Auto, true);
      default:
        return makeTempVariableName(TempFlags.Auto);
    }
  }
  function makeName(name: qt.GeneratedIdentifier) {
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
  function getNodeForGeneratedName(name: qt.GeneratedIdentifier) {
    const autoGenerateId = name.autoGenerateId;
    let node = name as Node;
    let original = node.original;
    while (original) {
      node = original;
      if (qf.is.kind(qc.Identifier, node) && !!(node.autoGenerateFlags! & GeneratedIdentifierFlags.Node) && node.autoGenerateId !== autoGenerateId) {
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
    const emitFlags = qf.get.emitFlags(node);
    const { pos, end } = qf.emit.commentRange(node);
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
    forEach(qf.emit.syntheticLeadingComments(node), emitLeadingSynthesizedComment);
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
    forEach(qf.emit.syntheticTrailingComments(node), emitTrailingSynthesizedComment);
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
  function emitLeadingSynthesizedComment(comment: qt.SynthesizedComment) {
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
  function emitTrailingSynthesizedComment(comment: qt.SynthesizedComment) {
    if (!writer.isAtStartOfLine()) {
      writer.writeSpace(' ');
    }
    writeSynthesizedComment(comment);
    if (comment.hasTrailingNewLine) {
      writer.writeLine();
    }
  }
  function writeSynthesizedComment(comment: qt.SynthesizedComment) {
    const text = formatSynthesizedComment(comment);
    const lineMap = comment.kind === Syntax.MultiLineCommentTrivia ? qy.get.lineStarts(text) : undefined;
    writeCommentRange(text, lineMap!, writer, 0, text.length, newLine);
  }
  function formatSynthesizedComment(comment: qt.SynthesizedComment) {
    return comment.kind === Syntax.MultiLineCommentTrivia ? `` : ``;
  }
  function emitBodyWithDetachedComments(node: Node, detachedRange: TextRange, emitCallback: (node: Node) => void) {
    enterComment();
    const { pos, end } = detachedRange;
    const emitFlags = qf.get.emitFlags(node);
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
    if (printerOpts.onlyPrintDocStyle) return qy.is.docLike(text, pos) || qy.is.pinnedComment(text, pos);
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
        qy.each.leadingCommentRange(currentSourceFile.text, pos, cb, pos);
      }
    }
  }
  function forEachTrailingCommentToEmit(end: number, cb: (commentPos: number, commentEnd: number, kind: Syntax, hasTrailingNewLine: boolean) => void) {
    if (currentSourceFile && (containerEnd === -1 || (end !== containerEnd && end !== declarationListContainerEnd))) {
      qy.each.trailingCommentRange(currentSourceFile.text, end, cb);
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
    qy.each.leadingCommentRange(currentSourceFile!.text, pos, cb, pos);
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
  function emitComment(text: string, lineMap: number[], writer: qt.EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) {
    if (!shouldWriteComment(currentSourceFile!.text, commentPos)) return;
    emitPos(commentPos);
    writeCommentRange(text, lineMap, writer, commentPos, commentEnd, newLine);
    emitPos(commentEnd);
  }
  function isTripleSlashComment(commentPos: number, commentEnd: number) {
    return qy.is.recognizedTripleSlashComment(currentSourceFile!.text, commentPos, commentEnd);
  }
  function getParsedSourceMap(node: qt.UnparsedSource) {
    if (node.parsedSourceMap === undefined && node.sourceMapText !== undefined) {
      node.parsedSourceMap = tryParseRawSourceMap(node.sourceMapText) || false;
    }
    return node.parsedSourceMap || undefined;
  }
  function pipelineEmitWithSourceMap(hint: EmitHint, node: Node) {
    qu.assert(lastNode === node || lastSubstitution === node);
    const pipelinePhase = getNextPipelinePhase(PipelinePhase.SourceMaps, hint, node);
    if (qf.is.kind(qc.UnparsedSource, node) || qf.is.kind(qc.UnparsedPrepend, node)) {
      pipelinePhase(hint, node);
    } else if (qf.is.unparsedNode(node)) {
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
      const { pos, end, source = sourceMapSource } = qf.emit.sourceMapRange(node);
      const emitFlags = qf.get.emitFlags(node);
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
  function skipSourceTrivia(source: qt.SourceMapSource, pos: number): number {
    return source.syntax.skipTrivia ? source.syntax.skipTrivia(pos) : qy.skipTrivia(source.text, pos);
  }
  function emitPos(pos: number) {
    if (sourceMapsDisabled || isSynthesized(pos) || isJsonSourceMapSource(sourceMapSource)) {
      return;
    }
    const { line: sourceLine, character: sourceCharacter } = qy.get.lineAndCharOf(sourceMapSource, pos);
    sourceMapGenerator!.addMapping(writer.getLine(), writer.getColumn(), sourceMapSourceIndex, sourceLine, sourceCharacter, undefined);
  }
  function emitSourcePos(source: qt.SourceMapSource, pos: number) {
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
    if (sourceMapsDisabled || (node && qf.is.inJsonFile(node))) return emitCallback(token, writer, tokenPos);
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
  function setSourceMapSource(source: qt.SourceMapSource) {
    if (sourceMapsDisabled) {
      return;
    }
    sourceMapSource = source;
    if (isJsonSourceMapSource(source)) {
      return;
    }
    sourceMapSourceIndex = sourceMapGenerator!.addSource(source.fileName);
    if (printerOpts.inlineSources) {
      sourceMapGenerator!.setSourceContent(sourceMapSourceIndex, source.text);
    }
  }
  function isJsonSourceMapSource(sourceFile: qt.SourceMapSource) {
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
function emitDoc(node: qt.Doc) {
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
function createSingleLineStringWriter(): qt.EmitTextWriter {
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
    writeParam: writeText,
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
export function usingSingleLineStringWriter(action: (writer: qt.EmitTextWriter) => void): string {
  const oldString = stringWriter.getText();
  try {
    action(stringWriter);
    return stringWriter.getText();
  } finally {
    stringWriter.clear();
    stringWriter.writeKeyword(oldString);
  }
}
export function createTextWriter(newLine: string): qt.EmitTextWriter {
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
    writeParam: write,
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
export function getTrailingSemicolonDeferringWriter(writer: qt.EmitTextWriter): qt.EmitTextWriter {
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
    writeParam(s) {
      commitPendingTrailingSemicolon();
      writer.writeParam(s);
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
  writer: qt.EmitTextWriter,
  comments: readonly qt.CommentRange[] | undefined,
  leadingSeparator: boolean,
  trailingSeparator: boolean,
  newLine: string,
  writeComment: (text: string, lineMap: readonly number[], writer: qt.EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) => void
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
  writer: qt.EmitTextWriter,
  writeComment: (text: string, lineMap: readonly number[], writer: qt.EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) => void,
  node: TextRange,
  newLine: string,
  removeComments: boolean
) {
  let leadingComments: qt.CommentRange[] | undefined;
  let currentDetachedCommentInfo: { nodePos: number; detachedCommentEndPos: number } | undefined;
  if (removeComments) {
    if (node.pos === 0) {
      leadingComments = filter(qy.get.leadingCommentRanges(text, node.pos), qy.is.pinnedCommentLocal);
    }
  } else {
    leadingComments = qy.get.leadingCommentRanges(text, node.pos);
  }
  if (leadingComments) {
    const detachedComments: qt.CommentRange[] = [];
    let lastComment: qt.CommentRange | undefined;
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
  function qy.is.pinnedCommentLocal(comment: qt.CommentRange) {
    return qy.is.pinnedComment(text, comment.pos);
  }
}
export function writeCommentRange(text: string, lineMap: readonly number[], writer: qt.EmitTextWriter, commentPos: number, commentEnd: number, newLine: string) {
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
function writeTrimmedCurrentLine(text: string, commentEnd: number, writer: qt.EmitTextWriter, newLine: string, pos: number, nextLineStart: number) {
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
