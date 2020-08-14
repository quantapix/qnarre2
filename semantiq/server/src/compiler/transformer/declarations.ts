import { Node, Modifier, ModifierFlags, NodeBuilderFlags } from '../types';
import { qf, Nodes } from '../core';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from '../types';
import * as qu from '../utils';
import * as qy from '../syntax';
export function getDeclarationDiagnostics(host: qt.EmitHost, resolver: qt.EmitResolver, file: qt.SourceFile | undefined): DiagnosticWithLocation[] | undefined {
  if (file && qf.is.jsonSourceFile(file)) return [];
  const compilerOpts = host.getCompilerOpts();
  const result = transformNodes(resolver, host, compilerOpts, file ? [file] : filter(host.getSourceFiles(), isSourceFileNotJson), [transformDeclarations], false);
  return result.diagnostics;
}
function hasInternalAnnotation(range: qt.CommentRange, currentSourceFile: qt.SourceFile) {
  const comment = currentSourceFile.text.substring(range.pos, range.end);
  return qu.stringContains(comment, '@internal');
}
export function isInternalDeclaration(node: Node, currentSourceFile: qt.SourceFile) {
  const parseTreeNode = qf.get.parseTreeOf(node);
  if (parseTreeNode && parseTreeNode.kind === Syntax.Param) {
    const paramIdx = (parseTreeNode.parent as FunctionLike).params.indexOf(parseTreeNode as qt.ParamDeclaration);
    const previousSibling = paramIdx > 0 ? (parseTreeNode.parent as FunctionLike).params[paramIdx - 1] : undefined;
    const text = currentSourceFile.text;
    const commentRanges = previousSibling
      ? concatenate(syntax.get.trailingCommentRanges(text, syntax.skipTrivia(text, previousSibling.end + 1, false, true)), syntax.get.leadingCommentRanges(text, node.pos))
      : syntax.get.trailingCommentRanges(text, syntax.skipTrivia(text, node.pos, false, true));
    return commentRanges && commentRanges.length && hasInternalAnnotation(last(commentRanges), currentSourceFile);
  }
  const leadingCommentRanges = parseTreeNode && syntax.get.leadingCommentRanges(parseTreeNode, currentSourceFile);
  return !!forEach(leadingCommentRanges, (range) => {
    return hasInternalAnnotation(range, currentSourceFile);
  });
}
const declarationEmitNodeBuilderFlags =
  NodeBuilderFlags.MultilineObjectLiterals |
  NodeBuilderFlags.WriteClassExpressionAsTypeLiteral |
  NodeBuilderFlags.UseTypeOfFunction |
  NodeBuilderFlags.UseStructuralFallback |
  NodeBuilderFlags.AllowEmptyTuple |
  NodeBuilderFlags.GenerateNamesForShadowedTypeParams |
  NodeBuilderFlags.NoTruncation;
export function transformDeclarations(context: qt.TrafoContext) {
  const throwDiagnostic = () => fail('Diagnostic emitted without context');
  let getSymbolAccessibilityDiagnostic: GetSymbolAccessibilityDiagnostic = throwDiagnostic;
  let needsDeclare = true;
  let isBundledEmit = false;
  let resultHasExternalModuleIndicator = false;
  let needsScopeFixMarker = false;
  let resultHasScopeMarker = false;
  let enclosingDeclaration: Node;
  let necessaryTypeReferences: QMap<true> | undefined;
  let lateMarkedStatements: qt.LateVisibilityPaintedStatement[] | undefined;
  let lateStatementReplacementMap: QMap<VisitResult<qt.LateVisibilityPaintedStatement | qt.ExportAssignment>>;
  let suppressNewDiagnosticContexts: boolean;
  let exportedModulesFromDeclarationEmit: qt.Symbol[] | undefined;
  const host = context.getEmitHost();
  const symbolTracker: qt.SymbolTracker = {
    trackSymbol,
    reportInaccessibleThisError,
    reportInaccessibleUniqueSymbolError,
    reportPrivateInBaseOfClassExpression,
    reportLikelyUnsafeImportRequiredError,
    moduleResolverHost: host,
    trackReferencedAmbientModule,
    trackExternalModuleSymbolOfImportTyping,
    reportNonlocalAugmentation,
  };
  let errorNameNode: qt.DeclarationName | undefined;
  let currentSourceFile: qt.SourceFile;
  let refs: QMap<qt.SourceFile>;
  let libs: QMap<boolean>;
  let emittedImports: readonly qt.AnyImportSyntax[] | undefined;
  const resolver = context.getEmitResolver();
  const opts = context.getCompilerOpts();
  const { noResolve, stripInternal } = opts;
  return transformRoot;
  function recordTypeReferenceDirectivesIfNecessary(typeReferenceDirectives: readonly string[] | undefined): void {
    if (!typeReferenceDirectives) return;
    necessaryTypeReferences = necessaryTypeReferences || new QMap<true>();
    for (const ref of typeReferenceDirectives) {
      necessaryTypeReferences.set(ref, true);
    }
  }
  function trackReferencedAmbientModule(node: qt.ModuleDeclaration, symbol: qt.Symbol) {
    const directives = resolver.getTypeReferenceDirectivesForSymbol(symbol, SymbolFlags.All);
    if (length(directives)) return recordTypeReferenceDirectivesIfNecessary(directives);
    const container = node.sourceFile;
    refs.set('' + getOriginalNodeId(container), container);
  }
  function handleSymbolAccessibilityError(symbolAccessibilityResult: qt.SymbolAccessibilityResult) {
    if (symbolAccessibilityResult.accessibility === SymbolAccessibility.Accessible) {
      if (symbolAccessibilityResult && symbolAccessibilityResult.aliasesToMakeVisible) {
        if (!lateMarkedStatements) lateMarkedStatements = symbolAccessibilityResult.aliasesToMakeVisible;
        else {
          for (const ref of symbolAccessibilityResult.aliasesToMakeVisible) {
            qu.pushIfUnique(lateMarkedStatements, ref);
          }
        }
      }
    } else {
      const errorInfo = getSymbolAccessibilityDiagnostic(symbolAccessibilityResult);
      if (errorInfo) {
        if (errorInfo.typeName) {
          context.addDiagnostic(
            qf.create.diagnosticForNode(
              symbolAccessibilityResult.errorNode || errorInfo.errorNode,
              errorInfo.diagnosticMessage,
              qf.get.textOf(errorInfo.typeName),
              symbolAccessibilityResult.errorSymbolName,
              symbolAccessibilityResult.errorModuleName
            )
          );
        } else {
          context.addDiagnostic(
            qf.create.diagnosticForNode(
              symbolAccessibilityResult.errorNode || errorInfo.errorNode,
              errorInfo.diagnosticMessage,
              symbolAccessibilityResult.errorSymbolName,
              symbolAccessibilityResult.errorModuleName
            )
          );
        }
      }
    }
  }
  function trackExternalModuleSymbolOfImportTyping(symbol: qt.Symbol) {
    if (!isBundledEmit) (exportedModulesFromDeclarationEmit || (exportedModulesFromDeclarationEmit = [])).push(symbol);
  }
  function trackSymbol(symbol: qt.Symbol, enclosingDeclaration?: Node, meaning?: SymbolFlags) {
    if (symbol.flags & SymbolFlags.TypeParam) return;
    handleSymbolAccessibilityError(resolver.isSymbolAccessible(symbol, enclosingDeclaration, meaning, true));
    recordTypeReferenceDirectivesIfNecessary(resolver.getTypeReferenceDirectivesForSymbol(symbol, meaning));
  }
  function reportPrivateInBaseOfClassExpression(propertyName: string) {
    if (errorNameNode) context.addDiagnostic(qf.create.diagnosticForNode(errorNameNode, qd.Property_0_of_exported_class_expression_may_not_be_private_or_protected, propertyName));
  }
  function reportInaccessibleUniqueSymbolError() {
    if (errorNameNode) {
      context.addDiagnostic(
        qf.create.diagnosticForNode(errorNameNode, qd.The_inferred_type_of_0_references_an_inaccessible_1_type_A_type_annotation_is_necessary, declarationNameToString(errorNameNode), 'unique symbol')
      );
    }
  }
  function reportInaccessibleThisError() {
    if (errorNameNode) {
      context.addDiagnostic(
        qf.create.diagnosticForNode(errorNameNode, qd.The_inferred_type_of_0_references_an_inaccessible_1_type_A_type_annotation_is_necessary, declarationNameToString(errorNameNode), 'this')
      );
    }
  }
  function reportLikelyUnsafeImportRequiredError(spec: string) {
    if (errorNameNode) {
      context.addDiagnostic(
        qf.create.diagnosticForNode(
          errorNameNode,
          qd.The_inferred_type_of_0_cannot_be_named_without_a_reference_to_1_This_is_likely_not_portable_A_type_annotation_is_necessary,
          declarationNameToString(errorNameNode),
          spec
        )
      );
    }
  }
  function reportNonlocalAugmentation(containingFile: qt.SourceFile, parentSymbol: qt.Symbol, symbol: qt.Symbol) {
    const primaryDeclaration = find(parentSymbol.declarations, (d) => d.sourceFile === containingFile)!;
    const augmentingDeclarations = filter(symbol.declarations, (d) => d.sourceFile !== containingFile);
    for (const augmentations of augmentingDeclarations) {
      context.addDiagnostic(
        addRelatedInfo(
          qf.create.diagnosticForNode(augmentations, qd.Declaration_augments_declaration_in_another_file_This_cannot_be_serialized),
          qf.create.diagnosticForNode(primaryDeclaration, qd.This_is_the_declaration_being_augmented_Consider_moving_the_augmenting_declaration_into_the_same_file)
        )
      );
    }
  }
  function transformDeclarationsForJS(sourceFile: qt.SourceFile, bundled?: boolean) {
    const oldDiag = getSymbolAccessibilityDiagnostic;
    getSymbolAccessibilityDiagnostic = (s) => ({
      diagnosticMessage: s.errorModuleName
        ? qd.Declaration_emit_for_this_file_requires_using_private_name_0_from_module_1_An_explicit_type_annotation_may_unblock_declaration_emit
        : qd.Declaration_emit_for_this_file_requires_using_private_name_0_An_explicit_type_annotation_may_unblock_declaration_emit,
      errorNode: s.errorNode || sourceFile,
    });
    const result = resolver.getDeclarationStmtsForSourceFile(sourceFile, declarationEmitNodeBuilderFlags, symbolTracker, bundled);
    getSymbolAccessibilityDiagnostic = oldDiag;
    return result;
  }
  function transformRoot(node: qt.Bundle): qt.Bundle;
  function transformRoot(node: qt.SourceFile): qt.SourceFile;
  function transformRoot(node: qt.SourceFile | qt.Bundle): qt.SourceFile | qt.Bundle;
  function transformRoot(node: qt.SourceFile | qt.Bundle) {
    if (node.kind === Syntax.SourceFile && node.isDeclarationFile) return node;
    if (node.kind === Syntax.Bundle) {
      isBundledEmit = true;
      refs = new QMap<qt.SourceFile>();
      libs = new QMap<boolean>();
      let hasNoDefaultLib = false;
      const bundle = new qc.Bundle(
        map(node.sourceFiles, (sourceFile) => {
          if (sourceFile.isDeclarationFile) return undefined!;
          hasNoDefaultLib = hasNoDefaultLib || sourceFile.hasNoDefaultLib;
          currentSourceFile = sourceFile;
          enclosingDeclaration = sourceFile;
          lateMarkedStatements = undefined;
          suppressNewDiagnosticContexts = false;
          lateStatementReplacementMap = new QMap();
          getSymbolAccessibilityDiagnostic = throwDiagnostic;
          needsScopeFixMarker = false;
          resultHasScopeMarker = false;
          collectReferences(sourceFile, refs);
          collectLibs(sourceFile, libs);
          if (qf.is.externalOrCommonJsModule(sourceFile) || qf.is.jsonSourceFile(sourceFile)) {
            resultHasExternalModuleIndicator = false;
            needsDeclare = false;
            const statements = sourceFile.isJS() ? new Nodes(transformDeclarationsForJS(sourceFile, true)) : Nodes.visit(sourceFile.statements, visitDeclarationStmts);
            const newFile = qp_updateSourceNode(
              sourceFile,
              [
                new qc.ModuleDeclaration(
                  [],
                  [qf.create.modifier(Syntax.DeclareKeyword)],
                  qc.asLiteral(getResolvedExternalModuleName(context.getEmitHost(), sourceFile)),
                  new qc.ModuleBlock(new Nodes(transformAndReplaceLatePaintedStatements(statements)).setRange(sourceFile.statements))
                ),
              ],
              true,
              [],
              [],
              false,
              []
            );
            return newFile;
          }
          needsDeclare = true;
          const updated = sourceFile.isJS() ? new Nodes(transformDeclarationsForJS(sourceFile)) : Nodes.visit(sourceFile.statements, visitDeclarationStmts);
          return qp_updateSourceNode(sourceFile, transformAndReplaceLatePaintedStatements(updated), true, [], [], false, []);
        }),
        mapDefined(node.prepends, (prepend) => {
          if (prepend.kind === Syntax.InputFiles) {
            const sourceFile = createUnparsedSourceFile(prepend, 'dts', stripInternal);
            hasNoDefaultLib = hasNoDefaultLib || !!sourceFile.hasNoDefaultLib;
            collectReferences(sourceFile, refs);
            recordTypeReferenceDirectivesIfNecessary(sourceFile.typeReferenceDirectives);
            collectLibs(sourceFile, libs);
            return sourceFile;
          }
          return prepend;
        })
      );
      bundle.syntheticFileReferences = [];
      bundle.syntheticTypeReferences = getFileReferencesForUsedTypeReferences();
      bundle.syntheticLibReferences = getLibReferences();
      bundle.hasNoDefaultLib = hasNoDefaultLib;
      const outputFilePath = getDirectoryPath(normalizeSlashes(getOutputPathsFor(node, host, true).declarationFilePath!));
      const referenceVisitor = mapReferencesIntoArray(bundle.syntheticFileReferences as qt.FileReference[], outputFilePath);
      refs.forEach(referenceVisitor);
      return bundle;
    }
    needsDeclare = true;
    needsScopeFixMarker = false;
    resultHasScopeMarker = false;
    enclosingDeclaration = node;
    currentSourceFile = node;
    getSymbolAccessibilityDiagnostic = throwDiagnostic;
    isBundledEmit = false;
    resultHasExternalModuleIndicator = false;
    suppressNewDiagnosticContexts = false;
    lateMarkedStatements = undefined;
    lateStatementReplacementMap = new QMap();
    necessaryTypeReferences = undefined;
    refs = collectReferences(currentSourceFile, new QMap());
    libs = collectLibs(currentSourceFile, new QMap());
    const references: qt.FileReference[] = [];
    const outputFilePath = getDirectoryPath(normalizeSlashes(getOutputPathsFor(node, host, true).declarationFilePath!));
    const referenceVisitor = mapReferencesIntoArray(references, outputFilePath);
    let combinedStatements: Nodes<qt.Statement>;
    if (currentSourceFile.isJS()) {
      combinedStatements = new Nodes(transformDeclarationsForJS(node));
      refs.forEach(referenceVisitor);
      emittedImports = filter(combinedStatements, isAnyImportSyntax);
    } else {
      const statements = Nodes.visit(node.statements, visitDeclarationStmts);
      combinedStatements = new Nodes(transformAndReplaceLatePaintedStatements(statements)).setRange(node.statements);
      refs.forEach(referenceVisitor);
      emittedImports = filter(combinedStatements, isAnyImportSyntax);
      if (qf.is.externalModule(node) && (!resultHasExternalModuleIndicator || (needsScopeFixMarker && !resultHasScopeMarker)))
        combinedStatements = new Nodes([...combinedStatements, qf.create.emptyExports()]).setRange(combinedStatements);
    }
    const updated = qp_updateSourceNode(node, combinedStatements, true, references, getFileReferencesForUsedTypeReferences(), node.hasNoDefaultLib, getLibReferences());
    updated.exportedModulesFromDeclarationEmit = exportedModulesFromDeclarationEmit;
    return updated;
    function getLibReferences() {
      return map(arrayFrom(libs.keys()), (lib) => ({ fileName: lib, pos: -1, end: -1 }));
    }
    function getFileReferencesForUsedTypeReferences() {
      return necessaryTypeReferences ? mapDefined(arrayFrom(necessaryTypeReferences.keys()), getFileReferenceForTypeName) : [];
    }
    function getFileReferenceForTypeName(typeName: string): qt.FileReference | undefined {
      if (emittedImports) {
        for (const importStatement of emittedImports) {
          if (qf.is.kind(qc.ImportEqualsDeclaration, importStatement) && qp_qf.is.kind(qc.ExternalModuleReference, importStatement.moduleReference)) {
            const expr = importStatement.moduleReference.expression;
            if (qf.is.stringLiteralLike(expr) && expr.text === typeName) return;
          } else if (qf.is.kind(qc.ImportDeclaration, importStatement) && qf.is.kind(qc.StringLiteral, importStatement.moduleSpecifier) && importStatement.moduleSpecifier.text === typeName) {
            return;
          }
        }
      }
      return { fileName: typeName, pos: -1, end: -1 };
    }
    function mapReferencesIntoArray(references: qt.FileReference[], outputFilePath: string): (file: qt.SourceFile) => void {
      return (file) => {
        let declFileName: string;
        if (file.isDeclarationFile) declFileName = file.fileName;
        else {
          if (isBundledEmit && contains((node as qt.Bundle).sourceFiles, file)) return;
          const paths = getOutputPathsFor(file, host, true);
          declFileName = paths.declarationFilePath || paths.jsFilePath || file.fileName;
        }
        if (declFileName) {
          const spec = moduleSpecifiers.getModuleSpecifier(
            { ...opts, baseUrl: opts.baseUrl && toPath(opts.baseUrl, host.getCurrentDirectory(), host.getCanonicalFileName) },
            currentSourceFile,
            toPath(outputFilePath, host.getCurrentDirectory(), host.getCanonicalFileName),
            toPath(declFileName, host.getCurrentDirectory(), host.getCanonicalFileName),
            host,
            undefined
          );
          if (!pathIsRelative(spec)) {
            recordTypeReferenceDirectivesIfNecessary([spec]);
            return;
          }
          let fileName = getRelativePathToDirectoryOrUrl(outputFilePath, declFileName, host.getCurrentDirectory(), host.getCanonicalFileName, false);
          if (startsWith(fileName, './') && hasExtension(fileName)) fileName = fileName.substring(2);
          if (startsWith(fileName, 'node_modules/') || pathContainsNodeModules(fileName)) return;
          references.push({ pos: -1, end: -1, fileName });
        }
      };
    }
  }
  function collectReferences(sourceFile: qt.SourceFile | qt.UnparsedSource, ret: QMap<qt.SourceFile>) {
    if (noResolve || (!qf.is.kind(qc.UnparsedSource, sourceFile) && sourceFile.isJS())) return ret;
    forEach(sourceFile.referencedFiles, (f) => {
      const elem = host.getSourceFileFromReference(sourceFile, f);
      if (elem) ret.set('' + getOriginalNodeId(elem), elem);
    });
    return ret;
  }
  function collectLibs(sourceFile: qt.SourceFile | qt.UnparsedSource, ret: QMap<boolean>) {
    forEach(sourceFile.libReferenceDirectives, (ref) => {
      const lib = host.getLibFileFromReference(ref);
      if (lib) ret.set(toFileNameLowerCase(ref.fileName), true);
    });
    return ret;
  }
  function filterBindingPatternIniters(name: qt.BindingName) {
    if (name.kind === Syntax.Identifier) return name;
    if (name.is(ArrayBindingPattern)) return name.update(name, Nodes.visit(name.elems, visitBindingElem));
    return name.update(Nodes.visit(name.elems, visitBindingElem));
    function visitBindingElem<T extends qt.ArrayBindingElem>(elem: T): T;
    function visitBindingElem(elem: qt.ArrayBindingElem): qt.ArrayBindingElem {
      if (elem.kind === Syntax.OmittedExpression) return elem;
      return elem.update(elem.dot3Token, elem.propertyName, filterBindingPatternIniters(elem.name), shouldPrintWithIniter(elem) ? elem.initer : undefined);
    }
  }
  function ensureParam(p: qt.ParamDeclaration, modifierMask?: ModifierFlags, type?: qt.Typing): qt.ParamDeclaration {
    let oldDiag: typeof getSymbolAccessibilityDiagnostic | undefined;
    if (!suppressNewDiagnosticContexts) {
      oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(p);
    }
    const newParam = updateParam(
      p,
      undefined,
      maskModifiers(p, modifierMask),
      p.dot3Token,
      filterBindingPatternIniters(p.name),
      resolver.isOptionalParam(p) ? p.questionToken || new qc.Token(Syntax.QuestionToken) : undefined,
      ensureType(p, type || p.type, true),
      ensureNoIniter(p)
    );
    if (!suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = oldDiag!;
    return newParam;
  }
  function shouldPrintWithIniter(node: Node) {
    return canHaveLiteralIniter(node) && resolver.isLiteralConstDeclaration(qf.get.parseTreeOf(node) as CanHaveLiteralIniter);
  }
  function ensureNoIniter(node: CanHaveLiteralIniter) {
    if (shouldPrintWithIniter(node)) return resolver.createLiteralConstValue(qf.get.parseTreeOf(node) as CanHaveLiteralIniter, symbolTracker);
    return;
  }
  type HasInferredType =
    | qt.FunctionDeclaration
    | qt.MethodDeclaration
    | qt.GetAccessorDeclaration
    | qt.SetAccessorDeclaration
    | qt.BindingElem
    | qt.ConstructSignatureDeclaration
    | qt.VariableDeclaration
    | qt.MethodSignature
    | qt.CallSignatureDeclaration
    | qt.ParamDeclaration
    | qt.PropertyDeclaration
    | qt.PropertySignature;
  function ensureType(node: HasInferredType, type: qt.Typing | undefined, ignorePrivate?: boolean): qt.Typing | undefined {
    if (!ignorePrivate && qf.has.effectiveModifier(node, ModifierFlags.Private)) return;
    if (shouldPrintWithIniter(node)) return;
    const shouldUseResolverType = node.kind === Syntax.Param && (resolver.isRequiredInitializedParam(node) || resolver.isOptionalUninitializedParamProperty(node));
    if (type && !shouldUseResolverType) return qf.visit.node(type, visitDeclarationSubtree);
    if (!qf.get.parseTreeOf(node)) return type ? qf.visit.node(type, visitDeclarationSubtree) : new qc.KeywordTyping(Syntax.AnyKeyword);
    if (node.kind === Syntax.SetAccessor) return new qc.KeywordTyping(Syntax.AnyKeyword);
    errorNameNode = node.name;
    let oldDiag: typeof getSymbolAccessibilityDiagnostic;
    if (!suppressNewDiagnosticContexts) {
      oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(node);
    }
    if (node.kind === Syntax.VariableDeclaration || node.kind === Syntax.BindingElem)
      return cleanup(resolver.createTypeOfDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker));
    if (node.kind === Syntax.Param || node.kind === Syntax.PropertyDeclaration || node.kind === Syntax.PropertySignature) {
      if (!node.initer) return cleanup(resolver.createTypeOfDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker, shouldUseResolverType));
      return cleanup(
        resolver.createTypeOfDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker, shouldUseResolverType) ||
          resolver.createTypeOfExpression(node.initer, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker)
      );
    }
    return cleanup(resolver.createReturnTypeOfSignatureDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker));
    function cleanup(returnValue: qt.Typing | undefined) {
      errorNameNode = undefined;
      if (!suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = oldDiag;
      return returnValue || new qc.KeywordTyping(Syntax.AnyKeyword);
    }
  }
  function isDeclarationAndNotVisible(node: qt.NamedDecl) {
    node = qf.get.parseTreeOf(node) as qt.NamedDecl;
    switch (node.kind) {
      case Syntax.FunctionDeclaration:
      case Syntax.ModuleDeclaration:
      case Syntax.InterfaceDeclaration:
      case Syntax.ClassDeclaration:
      case Syntax.TypeAliasDeclaration:
      case Syntax.EnumDeclaration:
        return !resolver.qf.is.declarationVisible(node);
      case Syntax.VariableDeclaration:
        return !getBindingNameVisible(node as qt.VariableDeclaration);
      case Syntax.ImportEqualsDeclaration:
      case Syntax.ImportDeclaration:
      case Syntax.ExportDeclaration:
      case Syntax.ExportAssignment:
        return false;
    }
    return false;
  }
  function getBindingNameVisible(elem: qt.BindingElem | qt.VariableDeclaration | qt.OmittedExpression): boolean {
    if (qf.is.kind(qc.OmittedExpression, elem)) return false;
    if (qf.is.kind(qc.BindingPattern, elem.name)) return some(elem.name.elems, getBindingNameVisible);
    return resolver.qf.is.declarationVisible(elem);
  }
  function updateParamsList(node: Node, params: Nodes<qt.ParamDeclaration>, modifierMask?: ModifierFlags) {
    if (qf.has.effectiveModifier(node, ModifierFlags.Private)) return undefined!;
    const newParams = map(params, (p) => ensureParam(p, modifierMask));
    if (!newParams) return undefined!;
    return new Nodes(newParams, params.trailingComma);
  }
  function updateAccessorParamsList(input: qt.AccessorDeclaration, isPrivate: boolean) {
    let newParams: qt.ParamDeclaration[] | undefined;
    if (!isPrivate) {
      const thisParam = getThisNode(ParamDeclaration, input);
      if (thisParam) newParams = [ensureParam(thisParam)];
    }
    if (qf.is.kind(qc.SetAccessorDeclaration, input)) {
      let newValueParam: qt.ParamDeclaration | undefined;
      if (!isPrivate) {
        const valueParam = qf.get.setAccessorValueParam(input);
        if (valueParam) {
          const accessorType = getTypeAnnotationFromAllAccessorDeclarations(input, resolver.qf.get.allAccessorDeclarations(input));
          newValueParam = ensureParam(valueParam, undefined, accessorType);
        }
      }
      if (!newValueParam) newValueParam = new qc.ParamDeclaration(undefined, undefined, 'value');
      newParams = append(newParams, newValueParam);
    }
    return new Nodes(newParams || emptyArray) as Nodes<qt.ParamDeclaration>;
  }
  function ensureTypeParams(node: Node, params: Nodes<qt.TypeParamDeclaration> | undefined) {
    return qf.has.effectiveModifier(node, ModifierFlags.Private) ? undefined : Nodes.visit(params, visitDeclarationSubtree);
  }
  function isEnclosingDeclaration(node: Node) {
    return (
      qf.is.kind(qc.SourceFile, node) ||
      qf.is.kind(qc.TypeAliasDeclaration, node) ||
      qf.is.kind(qc.ModuleDeclaration, node) ||
      qf.is.kind(qc.ClassDeclaration, node) ||
      qf.is.kind(qc.InterfaceDeclaration, node) ||
      qf.is.functionLike(node) ||
      qf.is.kind(qc.IndexSignatureDeclaration, node) ||
      qf.is.kind(qc.MappedTyping, node)
    );
  }
  function checkEntityNameVisibility(entityName: qt.EntityNameOrEntityNameExpression, enclosingDeclaration: Node) {
    const visibilityResult = resolver.isEntityNameVisible(entityName, enclosingDeclaration);
    handleSymbolAccessibilityError(visibilityResult);
    recordTypeReferenceDirectivesIfNecessary(resolver.getTypeReferenceDirectivesForEntityName(entityName));
  }
  function preserveDoc<T extends Node>(updated: T, original: Node): T {
    if (qf.is.withDocNodes(updated) && qf.is.withDocNodes(original)) updated.doc = original.doc;
    return qf.emit.setCommentRange(updated, qf.emit.commentRange(original));
  }
  function rewriteModuleSpecifier<T extends Node>(
    parent: qt.ImportEqualsDeclaration | qt.ImportDeclaration | qt.ExportDeclaration | qt.ModuleDeclaration | qt.ImportTyping,
    input: T | undefined
  ): T | qt.StringLiteral {
    if (!input) return undefined!;
    resultHasExternalModuleIndicator = resultHasExternalModuleIndicator || (parent.kind !== Syntax.ModuleDeclaration && parent.kind !== Syntax.ImportTyping);
    if (qf.is.stringLiteralLike(input)) {
      if (isBundledEmit) {
        const newName = qf.get.externalModuleNameFromDeclaration(context.getEmitHost(), resolver, parent);
        if (newName) return qc.asLiteral(newName);
      } else {
        const symbol = resolver.getSymbolOfExternalModuleSpecifier(input);
        if (symbol) (exportedModulesFromDeclarationEmit || (exportedModulesFromDeclarationEmit = [])).push(symbol);
      }
    }
    return input;
  }
  function transformImportEqualsDeclaration(decl: qt.ImportEqualsDeclaration) {
    if (!resolver.qf.is.declarationVisible(decl)) return;
    if (decl.moduleReference.kind === Syntax.ExternalModuleReference) {
      const spec = qf.get.externalModuleImportEqualsDeclarationExpression(decl);
      return decl.update(undefined, decl.modifiers, decl.name, updateExternalModuleReference(decl.moduleReference, rewriteModuleSpecifier(decl, spec)));
    } else {
      const oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(decl);
      checkEntityNameVisibility(decl.moduleReference, enclosingDeclaration);
      getSymbolAccessibilityDiagnostic = oldDiag;
      return decl;
    }
  }
  function transformImportDeclaration(decl: qt.ImportDeclaration) {
    if (!decl.importClause) return decl.update(undefined, decl.modifiers, decl.importClause, rewriteModuleSpecifier(decl, decl.moduleSpecifier));
    const visibleDefaultBinding = decl.importClause && decl.importClause.name && resolver.qf.is.declarationVisible(decl.importClause) ? decl.importClause.name : undefined;
    if (!decl.importClause.namedBindings) {
      return (
        visibleDefaultBinding &&
        decl.update(
          undefined,
          decl.modifiers,
          updateImportClause(decl.importClause, visibleDefaultBinding, undefined, decl.importClause.isTypeOnly),
          rewriteModuleSpecifier(decl, decl.moduleSpecifier)
        )
      );
    }
    if (decl.importClause.namedBindings.kind === Syntax.NamespaceImport) {
      const namedBindings = resolver.qf.is.declarationVisible(decl.importClause.namedBindings) ? decl.importClause.namedBindings : undefined;
      return visibleDefaultBinding || namedBindings
        ? decl.update(
            undefined,
            decl.modifiers,
            updateImportClause(decl.importClause, visibleDefaultBinding, namedBindings, decl.importClause.isTypeOnly),
            rewriteModuleSpecifier(decl, decl.moduleSpecifier)
          )
        : undefined;
    }
    const bindingList = mapDefined(decl.importClause.namedBindings.elems, (b) => (resolver.qf.is.declarationVisible(b) ? b : undefined));
    if ((bindingList && bindingList.length) || visibleDefaultBinding) {
      return decl.update(
        undefined,
        decl.modifiers,
        updateImportClause(
          decl.importClause,
          visibleDefaultBinding,
          bindingList && bindingList.length ? updateNamedImports(decl.importClause.namedBindings, bindingList) : undefined,
          decl.importClause.isTypeOnly
        ),
        rewriteModuleSpecifier(decl, decl.moduleSpecifier)
      );
    }
    if (resolver.isImportRequiredByAugmentation(decl)) return decl.update(undefined, decl.modifiers, undefined, rewriteModuleSpecifier(decl, decl.moduleSpecifier));
  }
  function transformAndReplaceLatePaintedStatements(statements: Nodes<qt.Statement>): Nodes<qt.Statement> {
    while (length(lateMarkedStatements)) {
      const i = lateMarkedStatements!.shift()!;
      if (!qf.is.lateVisibilityPaintedStatement(i))
        return fail(`Late replaced statement was found which is not handled by the declaration transformer!: ${(ts as any).SyntaxKind ? (ts as any).SyntaxKind[(i as any).kind] : (i as any).kind}`);
      const priorNeedsDeclare = needsDeclare;
      needsDeclare = i.parent && qf.is.kind(qc.SourceFile, i.parent) && !(qf.is.externalModule(i.parent) && isBundledEmit);
      const result = transformTopLevelDeclaration(i);
      needsDeclare = priorNeedsDeclare;
      lateStatementReplacementMap.set('' + getOriginalNodeId(i), result);
    }
    return Nodes.visit(statements, visitLateVisibilityMarkedStatements);
    function visitLateVisibilityMarkedStatements(statement: qt.Statement) {
      if (qf.is.lateVisibilityPaintedStatement(statement)) {
        const key = '' + getOriginalNodeId(statement);
        if (lateStatementReplacementMap.has(key)) {
          const result = lateStatementReplacementMap.get(key);
          lateStatementReplacementMap.delete(key);
          if (result) {
            if (isArray(result) ? some(result, qf.stmt.is.scopeMarkerNeeded) : qf.stmt.is.scopeMarkerNeeded(result)) needsScopeFixMarker = true;
            if (qf.is.kind(qc.SourceFile, statement.parent) && (isArray(result) ? some(result, isExternalModuleIndicator) : qp_qf.is.externalModuleIndicator(result)))
              resultHasExternalModuleIndicator = true;
          }
          return result;
        }
      }
      return statement;
    }
  }
  function visitDeclarationSubtree(input: Node): VisitResult<Node> {
    if (shouldStripInternal(input)) return;
    if (qf.is.declaration(input)) {
      if (isDeclarationAndNotVisible(input)) return;
      if (qf.has.dynamicName(input) && !resolver.isLateBound(qf.get.parseTreeOf(input) as qt.Declaration)) return;
    }
    if (qf.is.functionLike(input) && resolver.isImplementationOfOverload(input)) return;
    if (qf.is.kind(qc.SemicolonClassElem, input)) return;
    let previousEnclosingDeclaration: typeof enclosingDeclaration;
    if (isEnclosingDeclaration(input)) {
      previousEnclosingDeclaration = enclosingDeclaration;
      enclosingDeclaration = input as qt.Declaration;
    }
    const oldDiag = getSymbolAccessibilityDiagnostic;
    const canProduceDiagnostic = canProduceDiagnostics(input);
    const oldWithinObjectLiteralType = suppressNewDiagnosticContexts;
    let shouldEnterSuppressNewDiagnosticsContextContext = (input.kind === Syntax.TypingLiteral || input.kind === Syntax.MappedTyping) && input.parent.kind !== Syntax.TypeAliasDeclaration;
    if (qf.is.kind(qc.MethodDeclaration, input) || qf.is.kind(qc.MethodSignature, input)) {
      if (qf.has.effectiveModifier(input, ModifierFlags.Private)) {
        if (input.symbol && input.symbol.declarations && input.symbol.declarations[0] !== input) return;
        return cleanup(PropertyDeclaration.create(undefined, ensureModifiers(input), input.name, undefined, undefined, undefined));
      }
    }
    if (canProduceDiagnostic && !suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(input as DeclarationDiagnosticProducing);
    if (qf.is.kind(qc.TypingQuery, input)) checkEntityNameVisibility(input.exprName, enclosingDeclaration);
    if (shouldEnterSuppressNewDiagnosticsContextContext) suppressNewDiagnosticContexts = true;
    if (isProcessedComponent(input)) {
      switch (input.kind) {
        case Syntax.ExpressionWithTypings: {
          if (qf.is.entityName(input.expression) || qf.is.entityNameExpression(input.expression)) checkEntityNameVisibility(input.expression, enclosingDeclaration);
          const node = qf.visit.eachChild(input, visitDeclarationSubtree, context);
          return cleanup(node.update(parenthesizeTypeParams(node.typeArgs), node.expression));
        }
        case Syntax.TypingReference: {
          checkEntityNameVisibility(input.typeName, enclosingDeclaration);
          const node = qf.visit.eachChild(input, visitDeclarationSubtree, context);
          return cleanup(node.update(node.typeName, parenthesizeTypeParams(node.typeArgs)));
        }
        case Syntax.ConstructSignature:
          return cleanup(input.update(ensureTypeParams(input, input.typeParams), updateParamsList(input, input.params), ensureType(input, input.type)));
        case Syntax.Constructor: {
          const ctor = qt.SignatureDeclaration.create(Syntax.Constructor, ensureTypeParams(input, input.typeParams), updateParamsList(input, input.params, ModifierFlags.None), undefined);
          ctor.modifiers = new Nodes(ensureModifiers(input));
          return cleanup(ctor);
        }
        case Syntax.MethodDeclaration: {
          if (qf.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          const sig = qt.SignatureDeclaration.create(
            Syntax.MethodSignature,
            ensureTypeParams(input, input.typeParams),
            updateParamsList(input, input.params),
            ensureType(input, input.type)
          ) as qt.MethodSignature;
          sig.name = input.name;
          sig.modifiers = new Nodes(ensureModifiers(input));
          sig.questionToken = input.questionToken;
          return cleanup(sig);
        }
        case Syntax.GetAccessor: {
          if (qf.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          const accessorType = getTypeAnnotationFromAllAccessorDeclarations(input, resolver.qf.get.allAccessorDeclarations(input));
          return cleanup(
            input.update(
              undefined,
              ensureModifiers(input),
              input.name,
              updateAccessorParamsList(input, qf.has.effectiveModifier(input, ModifierFlags.Private)),
              ensureType(input, accessorType),
              undefined
            )
          );
        }
        case Syntax.SetAccessor: {
          if (qf.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          return cleanup(input.update(undefined, ensureModifiers(input), input.name, updateAccessorParamsList(input, qf.has.effectiveModifier(input, ModifierFlags.Private)), undefined));
        }
        case Syntax.PropertyDeclaration:
          if (qf.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          return cleanup(input.update(undefined, ensureModifiers(input), input.name, input.questionToken, ensureType(input, input.type), ensureNoIniter(input)));
        case Syntax.PropertySignature:
          if (qf.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          return cleanup(input.update(ensureModifiers(input), input.name, input.questionToken, ensureType(input, input.type), ensureNoIniter(input)));
        case Syntax.MethodSignature: {
          if (qf.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          return cleanup(input.update(ensureTypeParams(input, input.typeParams), updateParamsList(input, input.params), ensureType(input, input.type), input.name, input.questionToken));
        }
        case Syntax.CallSignature: {
          return cleanup(input.update(ensureTypeParams(input, input.typeParams), updateParamsList(input, input.params), ensureType(input, input.type)));
        }
        case Syntax.IndexSignature: {
          return cleanup(
            input.update(undefined, ensureModifiers(input), updateParamsList(input, input.params), qf.visit.node(input.type, visitDeclarationSubtree) || new qc.KeywordTyping(Syntax.AnyKeyword))
          );
        }
        case Syntax.VariableDeclaration: {
          if (qf.is.kind(qc.BindingPattern, input.name)) return recreateBindingPattern(input.name);
          shouldEnterSuppressNewDiagnosticsContextContext = true;
          suppressNewDiagnosticContexts = true;
          return cleanup(input.update(input.name, ensureType(input, input.type), ensureNoIniter(input)));
        }
        case Syntax.TypeParam: {
          if (isPrivateMethodTypeParam(input) && (input.default || input.constraint)) return cleanup(updateTypeParamDeclaration(input, input.name, undefined));
          return cleanup(qf.visit.eachChild(input, visitDeclarationSubtree, context));
        }
        case Syntax.ConditionalTyping: {
          const checkType = qf.visit.node(input.checkType, visitDeclarationSubtree);
          const extendsType = qf.visit.node(input.extendsType, visitDeclarationSubtree);
          const oldEnclosingDecl = enclosingDeclaration;
          enclosingDeclaration = input.trueType;
          const trueType = qf.visit.node(input.trueType, visitDeclarationSubtree);
          enclosingDeclaration = oldEnclosingDecl;
          const falseType = qf.visit.node(input.falseType, visitDeclarationSubtree);
          return cleanup(input.update(checkType, extendsType, trueType, falseType));
        }
        case Syntax.FunctionTyping: {
          return cleanup(input.update(Nodes.visit(input.typeParams, visitDeclarationSubtree), updateParamsList(input, input.params), qf.visit.node(input.type, visitDeclarationSubtree)));
        }
        case Syntax.ConstructorTyping: {
          return cleanup(
            qt.ConstructorDeclaration.updateTypeNode(
              input,
              Nodes.visit(input.typeParams, visitDeclarationSubtree),
              updateParamsList(input, input.params),
              qf.visit.node(input.type, visitDeclarationSubtree)
            )
          );
        }
        case Syntax.ImportTyping: {
          if (!qf.is.literalImportTyping(input)) return cleanup(input);
          return cleanup(
            input.update(input.arg.update(rewriteModuleSpecifier(input, input.arg.literal)), input.qualifier, Nodes.visit(input.typeArgs, visitDeclarationSubtree, isTypeNode), input.isTypeOf)
          );
        }
        default:
          qc.assert.never(input, `Attempted to process unhandled node kind: ${(ts as any).SyntaxKind[(input as any).kind]}`);
      }
    }
    if (qf.is.kind(qc.TupleTyping, input) && syntax.get.lineAndCharOf(currentSourceFile, input.pos).line === syntax.get.lineAndCharOf(currentSourceFile, input.end).line)
      qf.emit.setFlags(input, EmitFlags.SingleLine);
    return cleanup(qf.visit.eachChild(input, visitDeclarationSubtree, context));
    function cleanup<T extends Node>(returnValue: T | undefined): T | undefined {
      if (returnValue && canProduceDiagnostic && qf.has.dynamicName(input as qt.Declaration)) checkName(input as DeclarationDiagnosticProducing);
      if (isEnclosingDeclaration(input)) enclosingDeclaration = previousEnclosingDeclaration;
      if (canProduceDiagnostic && !suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = oldDiag;
      if (shouldEnterSuppressNewDiagnosticsContextContext) suppressNewDiagnosticContexts = oldWithinObjectLiteralType;
      if (returnValue === input) return returnValue;
      return returnValue && preserveDoc(returnValue, input).setOriginal(input);
    }
  }
  function isPrivateMethodTypeParam(node: qt.TypeParamDeclaration) {
    return node.parent.kind === Syntax.MethodDeclaration && qf.has.effectiveModifier(node.parent, ModifierFlags.Private);
  }
  function visitDeclarationStmts(input: Node): VisitResult<Node> {
    if (!isPreservedDeclarationStmt(input)) return;
    if (shouldStripInternal(input)) return;
    switch (input.kind) {
      case Syntax.ExportDeclaration: {
        if (qf.is.kind(qc.SourceFile, input.parent)) resultHasExternalModuleIndicator = true;
        resultHasScopeMarker = true;
        return input.update(undefined, input.modifiers, input.exportClause, rewriteModuleSpecifier(input, input.moduleSpecifier), input.isTypeOnly);
      }
      case Syntax.ExportAssignment: {
        if (qf.is.kind(qc.SourceFile, input.parent)) resultHasExternalModuleIndicator = true;
        resultHasScopeMarker = true;
        if (input.expression.kind === Syntax.Identifier) return input;
        else {
          const newId = createOptimisticUniqueName('_default');
          getSymbolAccessibilityDiagnostic = () => ({
            diagnosticMessage: qd.Default_export_of_the_module_has_or_is_using_private_name_0,
            errorNode: input,
          });
          const varDecl = new qc.VariableDeclaration(newId, resolver.createTypeOfExpression(input.expression, input, declarationEmitNodeBuilderFlags, symbolTracker), undefined);
          const statement = new qc.VariableStatement(needsDeclare ? [qf.create.modifier(Syntax.DeclareKeyword)] : [], new qc.VariableDeclarationList([varDecl], NodeFlags.Const));
          return [statement, input.update(input.decorators, input.modifiers, newId)];
        }
      }
    }
    const result = transformTopLevelDeclaration(input);
    lateStatementReplacementMap.set('' + getOriginalNodeId(input), result);
    return input;
  }
  function stripExportModifiers(statement: qt.Statement): qt.Statement {
    if (qf.is.kind(qc.ImportEqualsDeclaration, statement) || qf.has.effectiveModifier(statement, ModifierFlags.Default)) return statement;
    const clone = getMutableClone(statement);
    const modifiers = qf.create.modifiersFromFlags(qf.get.effectiveModifierFlags(statement) & (ModifierFlags.All ^ ModifierFlags.Export));
    clone.modifiers = modifiers.length ? new Nodes(modifiers) : undefined;
    return clone;
  }
  function transformTopLevelDeclaration(input: qt.LateVisibilityPaintedStatement) {
    if (shouldStripInternal(input)) return;
    switch (input.kind) {
      case Syntax.ImportEqualsDeclaration: {
        return transformImportEqualsDeclaration(input);
      }
      case Syntax.ImportDeclaration: {
        return transformImportDeclaration(input);
      }
    }
    if (qf.is.declaration(input) && isDeclarationAndNotVisible(input)) return;
    if (qf.is.functionLike(input) && resolver.isImplementationOfOverload(input)) return;
    let previousEnclosingDeclaration: typeof enclosingDeclaration;
    if (isEnclosingDeclaration(input)) {
      previousEnclosingDeclaration = enclosingDeclaration;
      enclosingDeclaration = input as qt.Declaration;
    }
    const canProdiceDiagnostic = canProduceDiagnostics(input);
    const oldDiag = getSymbolAccessibilityDiagnostic;
    if (canProdiceDiagnostic) getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(input as DeclarationDiagnosticProducing);
    const previousNeedsDeclare = needsDeclare;
    switch (input.kind) {
      case Syntax.TypeAliasDeclaration:
        return cleanup(
          input.update(
            undefined,
            ensureModifiers(input),
            input.name,
            Nodes.visit(input.typeParams, visitDeclarationSubtree, isTypeParamDeclaration),
            qf.visit.node(input.type, visitDeclarationSubtree, isTypeNode)
          )
        );
      case Syntax.InterfaceDeclaration: {
        return cleanup(
          input.update(
            undefined,
            ensureModifiers(input),
            input.name,
            ensureTypeParams(input, input.typeParams),
            transformHeritageClauses(input.heritageClauses),
            Nodes.visit(input.members, visitDeclarationSubtree)
          )
        );
      }
      case Syntax.FunctionDeclaration: {
        const clean = cleanup(
          input.update(
            undefined,
            ensureModifiers(input),
            undefined,
            input.name,
            ensureTypeParams(input, input.typeParams),
            updateParamsList(input, input.params),
            ensureType(input, input.type),
            undefined
          )
        );
        if (clean && resolver.isExpandoFunctionDeclaration(input)) {
          const props = resolver.getPropertiesOfContainerFunction(input);
          const fakespace = new qc.ModuleDeclaration(undefined, undefined, clean.name || new qc.Identifier('_default'), new qc.ModuleBlock([]), NodeFlags.Namespace);
          fakespace.flags ^= NodeFlags.Synthesized;
          fakespace.parent = enclosingDeclaration as qt.SourceFile | qt.NamespaceDeclaration;
          fakespace.locals = new qc.SymbolTable(props);
          fakespace.symbol = props[0].parent!;
          const declarations = mapDefined(props, (p) => {
            if (!qf.is.kind(qc.PropertyAccessExpression, p.valueDeclaration)) return;
            getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(p.valueDeclaration);
            const type = resolver.createTypeOfDeclaration(p.valueDeclaration, fakespace, declarationEmitNodeBuilderFlags, symbolTracker);
            getSymbolAccessibilityDiagnostic = oldDiag;
            const varDecl = new qc.VariableDeclaration(syntax.get.unescUnderscores(p.escName), type, undefined);
            return new qc.VariableStatement(undefined, new qc.VariableDeclarationList([varDecl]));
          });
          const namespaceDecl = new qc.ModuleDeclaration(undefined, ensureModifiers(input), input.name!, new qc.ModuleBlock(declarations), NodeFlags.Namespace);
          if (!qf.has.effectiveModifier(clean, ModifierFlags.Default)) return [clean, namespaceDecl];
          const modifiers = qf.create.modifiersFromFlags((qf.get.effectiveModifierFlags(clean) & ~ModifierFlags.ExportDefault) | ModifierFlags.Ambient);
          const cleanDeclaration = clean.update(undefined, modifiers, undefined, clean.name, clean.typeParams, clean.params, clean.type, undefined);
          const namespaceDeclaration = namespaceDecl.update(undefined, modifiers, namespaceDecl.name, namespaceDecl.body);
          const exportDefaultDeclaration = new qc.ExportAssignment(undefined, false, namespaceDecl.name);
          if (qf.is.kind(qc.SourceFile, input.parent)) resultHasExternalModuleIndicator = true;
          resultHasScopeMarker = true;
          return [cleanDeclaration, namespaceDeclaration, exportDefaultDeclaration];
        }
        return clean;
      }
      case Syntax.ModuleDeclaration: {
        needsDeclare = false;
        const inner = input.body;
        if (inner && inner.kind === Syntax.ModuleBlock) {
          const oldNeedsScopeFix = needsScopeFixMarker;
          const oldHasScopeFix = resultHasScopeMarker;
          resultHasScopeMarker = false;
          needsScopeFixMarker = false;
          const statements = Nodes.visit(inner.statements, visitDeclarationStmts);
          let lateStatements = transformAndReplaceLatePaintedStatements(statements);
          if (input.flags & NodeFlags.Ambient) needsScopeFixMarker = false;
          if (!input.qf.is.globalScopeAugmentation() && !qf.has.scopeMarker(lateStatements) && !resultHasScopeMarker) {
            if (needsScopeFixMarker) lateStatements = new Nodes([...lateStatements, qf.create.emptyExports()]);
            else {
              lateStatements = Nodes.visit(lateStatements, stripExportModifiers);
            }
          }
          const body = inner.update(lateStatements);
          needsDeclare = previousNeedsDeclare;
          needsScopeFixMarker = oldNeedsScopeFix;
          resultHasScopeMarker = oldHasScopeFix;
          const mods = ensureModifiers(input);
          return cleanup(input.update(undefined, mods, qf.is.externalModuleAugmentation(input) ? rewriteModuleSpecifier(input, input.name) : input.name, body));
        } else {
          needsDeclare = previousNeedsDeclare;
          const mods = ensureModifiers(input);
          needsDeclare = false;
          qf.visit.node(inner, visitDeclarationStmts);
          const id = '' + getOriginalNodeId(inner!);
          const body = lateStatementReplacementMap.get(id);
          lateStatementReplacementMap.delete(id);
          return cleanup(input.update(undefined, mods, input.name, body as qt.ModuleBody));
        }
      }
      case Syntax.ClassDeclaration: {
        const modifiers = new Nodes(ensureModifiers(input));
        const typeParams = ensureTypeParams(input, input.typeParams);
        const ctor = qf.get.firstConstructorWithBody(input);
        let paramProperties: readonly qt.PropertyDeclaration[] | undefined;
        if (ctor) {
          const oldDiag = getSymbolAccessibilityDiagnostic;
          paramProperties = compact(
            flatMap(ctor.params, (param) => {
              if (!qf.has.syntacticModifier(param, ModifierFlags.ParamPropertyModifier) || shouldStripInternal(param)) return;
              getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(param);
              if (param.name.kind === Syntax.Identifier)
                return preserveDoc(PropertyDeclaration.create(undefined, ensureModifiers(param), param.name, param.questionToken, ensureType(param, param.type), ensureNoIniter(param)), param);
              return walkBindingPattern(param.name);
              function walkBindingPattern(pattern: qt.BindingPattern) {
                let elems: qt.PropertyDeclaration[] | undefined;
                for (const elem of pattern.elems) {
                  if (qf.is.kind(qc.OmittedExpression, elem)) continue;
                  if (qf.is.kind(qc.BindingPattern, elem.name)) elems = concatenate(elems, walkBindingPattern(elem.name));
                  elems = elems || [];
                  elems.push(PropertyDeclaration.create(undefined, ensureModifiers(param), elem.name as qt.Identifier, undefined, ensureType(elem, undefined), undefined));
                }
                return elems;
              }
            })
          );
          getSymbolAccessibilityDiagnostic = oldDiag;
        }
        const hasPrivateIdentifier = some(input.members, (member) => !!member.name && qf.is.kind(qc.PrivateIdentifier, member.name));
        const privateIdentifier = hasPrivateIdentifier ? [PropertyDeclaration.create(undefined, undefined, new qc.PrivateIdentifier('#private'), undefined, undefined, undefined)] : undefined;
        const memberNodes = concatenate(concatenate(privateIdentifier, paramProperties), Nodes.visit(input.members, visitDeclarationSubtree));
        const members = new Nodes(memberNodes);
        const extendsClause = qf.get.effectiveBaseTypeNode(input);
        if (extendsClause && !qf.is.entityNameExpression(extendsClause.expression) && extendsClause.expression.kind !== Syntax.NullKeyword) {
          const oldId = input.name ? syntax.get.unescUnderscores(input.name.escapedText) : 'default';
          const newId = createOptimisticUniqueName(`${oldId}_base`);
          getSymbolAccessibilityDiagnostic = () => ({
            diagnosticMessage: qd.extends_clause_of_exported_class_0_has_or_is_using_private_name_1,
            errorNode: extendsClause,
            typeName: input.name,
          });
          const varDecl = new qc.VariableDeclaration(newId, resolver.createTypeOfExpression(extendsClause.expression, input, declarationEmitNodeBuilderFlags, symbolTracker), undefined);
          const statement = new qc.VariableStatement(needsDeclare ? [qf.create.modifier(Syntax.DeclareKeyword)] : [], new qc.VariableDeclarationList([varDecl], NodeFlags.Const));
          const heritageClauses = new Nodes(
            map(input.heritageClauses, (clause) => {
              if (clause.token === Syntax.ExtendsKeyword) {
                const oldDiag = getSymbolAccessibilityDiagnostic;
                getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(clause.types[0]);
                const newClause = updateHeritageClause(
                  clause,
                  map(clause.types, (t) => updateExpressionWithTypings(t, Nodes.visit(t.typeArgs, visitDeclarationSubtree), newId))
                );
                getSymbolAccessibilityDiagnostic = oldDiag;
                return newClause;
              }
              return updateHeritageClause(
                clause,
                Nodes.visit(new Nodes(filter(clause.types, (t) => qf.is.entityNameExpression(t.expression) || t.expression.kind === Syntax.NullKeyword)), visitDeclarationSubtree)
              );
            })
          );
          return [statement, cleanup(input.update(undefined, modifiers, input.name, typeParams, heritageClauses, members))!];
        } else {
          const heritageClauses = transformHeritageClauses(input.heritageClauses);
          return cleanup(input.update(undefined, modifiers, input.name, typeParams, heritageClauses, members));
        }
      }
      case Syntax.VariableStatement: {
        return cleanup(transformVariableStatement(input));
      }
      case Syntax.EnumDeclaration: {
        return cleanup(
          input.update(
            undefined,
            new Nodes(ensureModifiers(input)),
            input.name,
            new Nodes(
              mapDefined(input.members, (m) => {
                if (shouldStripInternal(m)) return;
                const constValue = resolver.getConstantValue(m);
                return preserveDoc(m.update(m.name, constValue !== undefined ? qc.asLiteral(constValue) : undefined), m);
              })
            )
          )
        );
      }
    }
    return qc.assert.never(input, `Unhandled top-level node in declaration emit: ${(ts as any).SyntaxKind[(input as any).kind]}`);
    function cleanup<T extends Node>(node: T | undefined): T | undefined {
      if (isEnclosingDeclaration(input)) enclosingDeclaration = previousEnclosingDeclaration;
      if (canProdiceDiagnostic) getSymbolAccessibilityDiagnostic = oldDiag;
      if (input.kind === Syntax.ModuleDeclaration) needsDeclare = previousNeedsDeclare;
      if ((node as Node) === input) return node;
      return node && preserveDoc(node, input).setOriginal(input);
    }
  }
  function transformVariableStatement(input: qt.VariableStatement) {
    if (!forEach(input.declarationList.declarations, getBindingNameVisible)) return;
    const nodes = Nodes.visit(input.declarationList.declarations, visitDeclarationSubtree);
    if (!length(nodes)) return;
    return input.update(new Nodes(ensureModifiers(input)), updateVariableDeclarationList(input.declarationList, nodes));
  }
  function recreateBindingPattern(d: qt.BindingPattern): qt.VariableDeclaration[] {
    return flatten<qt.VariableDeclaration>(mapDefined(d.elems, (e) => recreateBindingElem(e)));
  }
  function recreateBindingElem(e: qt.ArrayBindingElem) {
    if (e.kind === Syntax.OmittedExpression) return;
    if (e.name) {
      if (!getBindingNameVisible(e)) return;
      if (qf.is.kind(qc.BindingPattern, e.name)) return recreateBindingPattern(e.name);
      return new qc.VariableDeclaration(e.name, ensureType(e, undefined), undefined);
    }
  }
  function checkName(node: DeclarationDiagnosticProducing) {
    let oldDiag: typeof getSymbolAccessibilityDiagnostic | undefined;
    if (!suppressNewDiagnosticContexts) {
      oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNodeName(node);
    }
    errorNameNode = (node as qt.NamedDecl).name;
    assert(resolver.isLateBound(qf.get.parseTreeOf(node) as qt.Declaration));
    const decl = (node as qt.NamedDecl) as qt.LateBoundDecl;
    const entityName = decl.name.expression;
    checkEntityNameVisibility(entityName, enclosingDeclaration);
    if (!suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = oldDiag!;
    errorNameNode = undefined;
  }
  function shouldStripInternal(node: Node) {
    return !!stripInternal && !!node && isInternalDeclaration(node, currentSourceFile);
  }
  function isNodeScopeMarker(node: Node) {
    return qf.is.kind(qc.ExportAssignment, node) || qf.is.kind(qc.ExportDeclaration, node);
  }
  function hasScopeMarker(statements: readonly qt.Statement[]) {
    return some(statements, isScopeMarker);
  }
  function ensureModifiers(node: Node): readonly Modifier[] | undefined {
    const currentFlags = qf.get.effectiveModifierFlags(node);
    const newFlags = ensureModifierFlags(node);
    if (currentFlags === newFlags) return node.modifiers;
    return qf.create.modifiersFromFlags(newFlags);
  }
  function ensureModifierFlags(node: Node): ModifierFlags {
    let mask = ModifierFlags.All ^ (ModifierFlags.Public | ModifierFlags.Async);
    let additions = needsDeclare && !isAlwaysType(node) ? ModifierFlags.Ambient : ModifierFlags.None;
    const parentIsFile = node.parent.kind === Syntax.SourceFile;
    if (!parentIsFile || (isBundledEmit && parentIsFile && qf.is.externalModule(node.parent as qt.SourceFile))) {
      mask ^= ModifierFlags.Ambient;
      additions = ModifierFlags.None;
    }
    return maskModifierFlags(node, mask, additions);
  }
  function getTypeAnnotationFromAllAccessorDeclarations(node: qt.AccessorDeclaration, accessors: qt.AllAccessorDeclarations) {
    let accessorType = getTypeAnnotationFromAccessor(node);
    if (!accessorType && node !== accessors.firstAccessor) {
      accessorType = getTypeAnnotationFromAccessor(accessors.firstAccessor);
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(accessors.firstAccessor);
    }
    if (!accessorType && accessors.secondAccessor && node !== accessors.secondAccessor) {
      accessorType = getTypeAnnotationFromAccessor(accessors.secondAccessor);
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(accessors.secondAccessor);
    }
    return accessorType;
  }
  function transformHeritageClauses(nodes: Nodes<qt.HeritageClause> | undefined) {
    return new Nodes(
      filter(
        map(nodes, (clause) =>
          updateHeritageClause(
            clause,
            Nodes.visit(
              new Nodes(
                filter(clause.types, (t) => {
                  return qf.is.entityNameExpression(t.expression) || (clause.token === Syntax.ExtendsKeyword && t.expression.kind === Syntax.NullKeyword);
                })
              ),
              visitDeclarationSubtree
            )
          )
        ),
        (clause) => clause.types && !!clause.types.length
      )
    );
  }
}
function isAlwaysType(node: Node) {
  if (node.kind === Syntax.InterfaceDeclaration) return true;
  return false;
}
function maskModifiers(node: Node, modifierMask?: ModifierFlags, modifierAdditions?: ModifierFlags): Modifier[] {
  return qf.create.modifiersFromFlags(maskModifierFlags(node, modifierMask, modifierAdditions));
}
function maskModifierFlags(node: Node, modifierMask: ModifierFlags = ModifierFlags.All ^ ModifierFlags.Public, modifierAdditions: ModifierFlags = ModifierFlags.None): ModifierFlags {
  let flags = (qf.get.effectiveModifierFlags(node) & modifierMask) | modifierAdditions;
  if (flags & ModifierFlags.Default && !(flags & ModifierFlags.Export)) flags ^= ModifierFlags.Export;
  if (flags & ModifierFlags.Default && flags & ModifierFlags.Ambient) flags ^= ModifierFlags.Ambient;
  return flags;
}
function getTypeAnnotationFromAccessor(accessor: qt.AccessorDeclaration): qt.Typing | undefined {
  if (accessor) return accessor.kind === Syntax.GetAccessor ? accessor.type : accessor.params.length > 0 ? accessor.params[0].type : undefined;
}
type CanHaveLiteralIniter = qt.VariableDeclaration | qt.PropertyDeclaration | qt.PropertySignature | qt.ParamDeclaration;
function canHaveLiteralIniter(node: Node): boolean {
  switch (node.kind) {
    case Syntax.PropertyDeclaration:
    case Syntax.PropertySignature:
      return !qf.has.effectiveModifier(node, ModifierFlags.Private);
    case Syntax.Param:
    case Syntax.VariableDeclaration:
      return true;
  }
  return false;
}
type ProcessedDeclarationStmt =
  | qt.FunctionDeclaration
  | qt.ModuleDeclaration
  | qt.ImportEqualsDeclaration
  | qt.InterfaceDeclaration
  | qt.ClassDeclaration
  | qt.TypeAliasDeclaration
  | qt.EnumDeclaration
  | qt.VariableStatement
  | qt.ImportDeclaration
  | qt.ExportDeclaration
  | qt.ExportAssignment;
function isPreservedDeclarationStmt(node: Node): node is ProcessedDeclarationStmt {
  switch (node.kind) {
    case Syntax.FunctionDeclaration:
    case Syntax.ModuleDeclaration:
    case Syntax.ImportEqualsDeclaration:
    case Syntax.InterfaceDeclaration:
    case Syntax.ClassDeclaration:
    case Syntax.TypeAliasDeclaration:
    case Syntax.EnumDeclaration:
    case Syntax.VariableStatement:
    case Syntax.ImportDeclaration:
    case Syntax.ExportDeclaration:
    case Syntax.ExportAssignment:
      return true;
  }
  return false;
}
type ProcessedComponent =
  | qt.ConstructSignatureDeclaration
  | qt.ConstructorDeclaration
  | qt.MethodDeclaration
  | qt.GetAccessorDeclaration
  | qt.SetAccessorDeclaration
  | qt.PropertyDeclaration
  | qt.PropertySignature
  | qt.MethodSignature
  | qt.CallSignatureDeclaration
  | qt.IndexSignatureDeclaration
  | qt.VariableDeclaration
  | qt.TypeParamDeclaration
  | qt.ExpressionWithTypings
  | qt.TypingReference
  | qt.ConditionalTyping
  | qt.FunctionTyping
  | qt.ConstructorTyping
  | qt.ImportTyping;
function isProcessedComponent(node: Node): node is ProcessedComponent {
  switch (node.kind) {
    case Syntax.ConstructSignature:
    case Syntax.Constructor:
    case Syntax.MethodDeclaration:
    case Syntax.GetAccessor:
    case Syntax.SetAccessor:
    case Syntax.PropertyDeclaration:
    case Syntax.PropertySignature:
    case Syntax.MethodSignature:
    case Syntax.CallSignature:
    case Syntax.IndexSignature:
    case Syntax.VariableDeclaration:
    case Syntax.TypeParam:
    case Syntax.ExpressionWithTypings:
    case Syntax.TypingReference:
    case Syntax.ConditionalTyping:
    case Syntax.FunctionTyping:
    case Syntax.ConstructorTyping:
    case Syntax.ImportTyping:
      return true;
  }
  return false;
}
