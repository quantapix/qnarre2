import * as qb from '../base';
import { Node, Nodes } from '../core';
import * as qc from '../core3';
import * as qt from '../types';
import * as qy from '../syntax';
import { Modifier, ModifierFlags, Syntax } from '../syntax';
export function getDeclarationDiagnostics(host: EmitHost, resolver: EmitResolver, file: SourceFile | undefined): DiagnosticWithLocation[] | undefined {
  if (file && qc.is.jsonSourceFile(file)) return [];
  const compilerOptions = host.getCompilerOptions();
  const result = transformNodes(resolver, host, compilerOptions, file ? [file] : filter(host.getSourceFiles(), isSourceFileNotJson), [transformDeclarations], false);
  return result.diagnostics;
}
function hasInternalAnnotation(range: CommentRange, currentSourceFile: SourceFile) {
  const comment = currentSourceFile.text.substring(range.pos, range.end);
  return stringContains(comment, '@internal');
}
export function isInternalDeclaration(node: Node, currentSourceFile: SourceFile) {
  const parseTreeNode = qc.get.parseTreeOf(node);
  if (parseTreeNode && parseTreeNode.kind === Syntax.Parameter) {
    const paramIdx = (parseTreeNode.parent as FunctionLike).parameters.indexOf(parseTreeNode as ParameterDeclaration);
    const previousSibling = paramIdx > 0 ? (parseTreeNode.parent as FunctionLike).parameters[paramIdx - 1] : undefined;
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
export function transformDeclarations(context: TransformationContext) {
  const throwDiagnostic = () => fail('Diagnostic emitted without context');
  let getSymbolAccessibilityDiagnostic: GetSymbolAccessibilityDiagnostic = throwDiagnostic;
  let needsDeclare = true;
  let isBundledEmit = false;
  let resultHasExternalModuleIndicator = false;
  let needsScopeFixMarker = false;
  let resultHasScopeMarker = false;
  let enclosingDeclaration: Node;
  let necessaryTypeReferences: QMap<true> | undefined;
  let lateMarkedStatements: LateVisibilityPaintedStatement[] | undefined;
  let lateStatementReplacementMap: QMap<VisitResult<LateVisibilityPaintedStatement | ExportAssignment>>;
  let suppressNewDiagnosticContexts: boolean;
  let exportedModulesFromDeclarationEmit: Symbol[] | undefined;
  const host = context.getEmitHost();
  const symbolTracker: SymbolTracker = {
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
  let errorNameNode: DeclarationName | undefined;
  let currentSourceFile: SourceFile;
  let refs: QMap<SourceFile>;
  let libs: QMap<boolean>;
  let emittedImports: readonly AnyImportSyntax[] | undefined;
  const resolver = context.getEmitResolver();
  const options = context.getCompilerOptions();
  const { noResolve, stripInternal } = options;
  return transformRoot;
  function recordTypeReferenceDirectivesIfNecessary(typeReferenceDirectives: readonly string[] | undefined): void {
    if (!typeReferenceDirectives) return;
    necessaryTypeReferences = necessaryTypeReferences || new QMap<true>();
    for (const ref of typeReferenceDirectives) {
      necessaryTypeReferences.set(ref, true);
    }
  }
  function trackReferencedAmbientModule(node: ModuleDeclaration, symbol: Symbol) {
    const directives = resolver.getTypeReferenceDirectivesForSymbol(symbol, SymbolFlags.All);
    if (length(directives)) return recordTypeReferenceDirectivesIfNecessary(directives);
    const container = node.sourceFile;
    refs.set('' + getOriginalNodeId(container), container);
  }
  function handleSymbolAccessibilityError(symbolAccessibilityResult: SymbolAccessibilityResult) {
    if (symbolAccessibilityResult.accessibility === SymbolAccessibility.Accessible) {
      if (symbolAccessibilityResult && symbolAccessibilityResult.aliasesToMakeVisible) {
        if (!lateMarkedStatements) lateMarkedStatements = symbolAccessibilityResult.aliasesToMakeVisible;
        else {
          for (const ref of symbolAccessibilityResult.aliasesToMakeVisible) {
            pushIfUnique(lateMarkedStatements, ref);
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
              qc.get.textOf(errorInfo.typeName),
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
  function trackExternalModuleSymbolOfImportTyping(symbol: Symbol) {
    if (!isBundledEmit) (exportedModulesFromDeclarationEmit || (exportedModulesFromDeclarationEmit = [])).push(symbol);
  }
  function trackSymbol(symbol: Symbol, enclosingDeclaration?: Node, meaning?: SymbolFlags) {
    if (symbol.flags & SymbolFlags.TypeParameter) return;
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
  function reportLikelyUnsafeImportRequiredError(specifier: string) {
    if (errorNameNode) {
      context.addDiagnostic(
        qf.create.diagnosticForNode(
          errorNameNode,
          qd.The_inferred_type_of_0_cannot_be_named_without_a_reference_to_1_This_is_likely_not_portable_A_type_annotation_is_necessary,
          declarationNameToString(errorNameNode),
          specifier
        )
      );
    }
  }
  function reportNonlocalAugmentation(containingFile: SourceFile, parentSymbol: Symbol, symbol: Symbol) {
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
  function transformDeclarationsForJS(sourceFile: SourceFile, bundled?: boolean) {
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
  function transformRoot(node: Bundle): Bundle;
  function transformRoot(node: SourceFile): SourceFile;
  function transformRoot(node: SourceFile | Bundle): SourceFile | Bundle;
  function transformRoot(node: SourceFile | Bundle) {
    if (node.kind === Syntax.SourceFile && node.isDeclarationFile) return node;
    if (node.kind === Syntax.Bundle) {
      isBundledEmit = true;
      refs = new QMap<SourceFile>();
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
          if (qc.is.externalOrCommonJsModule(sourceFile) || qc.is.jsonSourceFile(sourceFile)) {
            resultHasExternalModuleIndicator = false;
            needsDeclare = false;
            const statements = isSourceFileJS(sourceFile) ? new Nodes(transformDeclarationsForJS(sourceFile, true)) : Nodes.visit(sourceFile.statements, visitDeclarationStmts);
            const newFile = qp_updateSourceNode(
              sourceFile,
              [
                new qc.ModuleDeclaration(
                  [],
                  [qc.create.modifier(Syntax.DeclareKeyword)],
                  qc.asLiteral(getResolvedExternalModuleName(context.getEmitHost(), sourceFile)),
                  new qc.ModuleBlock(setRange(new Nodes(transformAndReplaceLatePaintedStatements(statements)), sourceFile.statements))
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
          const updated = isSourceFileJS(sourceFile) ? new Nodes(transformDeclarationsForJS(sourceFile)) : Nodes.visit(sourceFile.statements, visitDeclarationStmts);
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
      const referenceVisitor = mapReferencesIntoArray(bundle.syntheticFileReferences as FileReference[], outputFilePath);
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
    const references: FileReference[] = [];
    const outputFilePath = getDirectoryPath(normalizeSlashes(getOutputPathsFor(node, host, true).declarationFilePath!));
    const referenceVisitor = mapReferencesIntoArray(references, outputFilePath);
    let combinedStatements: Nodes<Statement>;
    if (isSourceFileJS(currentSourceFile)) {
      combinedStatements = new Nodes(transformDeclarationsForJS(node));
      refs.forEach(referenceVisitor);
      emittedImports = filter(combinedStatements, isAnyImportSyntax);
    } else {
      const statements = Nodes.visit(node.statements, visitDeclarationStmts);
      combinedStatements = setRange(new Nodes(transformAndReplaceLatePaintedStatements(statements)), node.statements);
      refs.forEach(referenceVisitor);
      emittedImports = filter(combinedStatements, isAnyImportSyntax);
      if (qc.is.externalModule(node) && (!resultHasExternalModuleIndicator || (needsScopeFixMarker && !resultHasScopeMarker)))
        combinedStatements = setRange(new Nodes([...combinedStatements, qf.create.emptyExports()]), combinedStatements);
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
    function getFileReferenceForTypeName(typeName: string): FileReference | undefined {
      if (emittedImports) {
        for (const importStatement of emittedImports) {
          if (qc.is.kind(qc.ImportEqualsDeclaration, importStatement) && qp_qc.is.kind(qc.ExternalModuleReference, importStatement.moduleReference)) {
            const expr = importStatement.moduleReference.expression;
            if (qf.is.stringLiteralLike(expr) && expr.text === typeName) return;
          } else if (qc.is.kind(qc.ImportDeclaration, importStatement) && qc.is.kind(qc.StringLiteral, importStatement.moduleSpecifier) && importStatement.moduleSpecifier.text === typeName) {
            return;
          }
        }
      }
      return { fileName: typeName, pos: -1, end: -1 };
    }
    function mapReferencesIntoArray(references: FileReference[], outputFilePath: string): (file: SourceFile) => void {
      return (file) => {
        let declFileName: string;
        if (file.isDeclarationFile) declFileName = file.fileName;
        else {
          if (isBundledEmit && contains((node as Bundle).sourceFiles, file)) return;
          const paths = getOutputPathsFor(file, host, true);
          declFileName = paths.declarationFilePath || paths.jsFilePath || file.fileName;
        }
        if (declFileName) {
          const specifier = moduleSpecifiers.getModuleSpecifier(
            { ...options, baseUrl: options.baseUrl && toPath(options.baseUrl, host.getCurrentDirectory(), host.getCanonicalFileName) },
            currentSourceFile,
            toPath(outputFilePath, host.getCurrentDirectory(), host.getCanonicalFileName),
            toPath(declFileName, host.getCurrentDirectory(), host.getCanonicalFileName),
            host,
            undefined
          );
          if (!pathIsRelative(specifier)) {
            recordTypeReferenceDirectivesIfNecessary([specifier]);
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
  function collectReferences(sourceFile: SourceFile | UnparsedSource, ret: QMap<SourceFile>) {
    if (noResolve || (!qc.is.kind(qc.UnparsedSource, sourceFile) && isSourceFileJS(sourceFile))) return ret;
    forEach(sourceFile.referencedFiles, (f) => {
      const elem = host.getSourceFileFromReference(sourceFile, f);
      if (elem) ret.set('' + getOriginalNodeId(elem), elem);
    });
    return ret;
  }
  function collectLibs(sourceFile: SourceFile | UnparsedSource, ret: QMap<boolean>) {
    forEach(sourceFile.libReferenceDirectives, (ref) => {
      const lib = host.getLibFileFromReference(ref);
      if (lib) ret.set(toFileNameLowerCase(ref.fileName), true);
    });
    return ret;
  }
  function filterBindingPatternIniters(name: BindingName) {
    if (name.kind === Syntax.Identifier) return name;
    if (name.is(ArrayBindingPattern)) return name.update(name, Nodes.visit(name.elems, visitBindingElem));
    return name.update(Nodes.visit(name.elems, visitBindingElem));
    function visitBindingElem<T extends ArrayBindingElem>(elem: T): T;
    function visitBindingElem(elem: ArrayBindingElem): ArrayBindingElem {
      if (elem.kind === Syntax.OmittedExpression) return elem;
      return elem.update(elem.dot3Token, elem.propertyName, filterBindingPatternIniters(elem.name), shouldPrintWithIniter(elem) ? elem.initer : undefined);
    }
  }
  function ensureParameter(p: ParameterDeclaration, modifierMask?: ModifierFlags, type?: Typing): ParameterDeclaration {
    let oldDiag: typeof getSymbolAccessibilityDiagnostic | undefined;
    if (!suppressNewDiagnosticContexts) {
      oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(p);
    }
    const newParam = updateParameter(
      p,
      undefined,
      maskModifiers(p, modifierMask),
      p.dot3Token,
      filterBindingPatternIniters(p.name),
      resolver.isOptionalParameter(p) ? p.questionToken || new Token(Syntax.QuestionToken) : undefined,
      ensureType(p, type || p.type, true),
      ensureNoIniter(p)
    );
    if (!suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = oldDiag!;
    return newParam;
  }
  function shouldPrintWithIniter(node: Node) {
    return canHaveLiteralIniter(node) && resolver.isLiteralConstDeclaration(qc.get.parseTreeOf(node) as CanHaveLiteralIniter);
  }
  function ensureNoIniter(node: CanHaveLiteralIniter) {
    if (shouldPrintWithIniter(node)) return resolver.createLiteralConstValue(qc.get.parseTreeOf(node) as CanHaveLiteralIniter, symbolTracker);
    return;
  }
  type HasInferredType =
    | FunctionDeclaration
    | MethodDeclaration
    | GetAccessorDeclaration
    | SetAccessorDeclaration
    | BindingElem
    | ConstructSignatureDeclaration
    | VariableDeclaration
    | MethodSignature
    | CallSignatureDeclaration
    | ParameterDeclaration
    | PropertyDeclaration
    | PropertySignature;
  function ensureType(node: HasInferredType, type: Typing | undefined, ignorePrivate?: boolean): Typing | undefined {
    if (!ignorePrivate && qc.has.effectiveModifier(node, ModifierFlags.Private)) return;
    if (shouldPrintWithIniter(node)) return;
    const shouldUseResolverType = node.kind === Syntax.Parameter && (resolver.isRequiredInitializedParameter(node) || resolver.isOptionalUninitializedParameterProperty(node));
    if (type && !shouldUseResolverType) return visitNode(type, visitDeclarationSubtree);
    if (!qc.get.parseTreeOf(node)) return type ? visitNode(type, visitDeclarationSubtree) : new qc.KeywordTyping(Syntax.AnyKeyword);
    if (node.kind === Syntax.SetAccessor) return new qc.KeywordTyping(Syntax.AnyKeyword);
    errorNameNode = node.name;
    let oldDiag: typeof getSymbolAccessibilityDiagnostic;
    if (!suppressNewDiagnosticContexts) {
      oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(node);
    }
    if (node.kind === Syntax.VariableDeclaration || node.kind === Syntax.BindingElem)
      return cleanup(resolver.createTypeOfDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker));
    if (node.kind === Syntax.Parameter || node.kind === Syntax.PropertyDeclaration || node.kind === Syntax.PropertySignature) {
      if (!node.initer) return cleanup(resolver.createTypeOfDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker, shouldUseResolverType));
      return cleanup(
        resolver.createTypeOfDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker, shouldUseResolverType) ||
          resolver.createTypeOfExpression(node.initer, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker)
      );
    }
    return cleanup(resolver.createReturnTypeOfSignatureDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker));
    function cleanup(returnValue: Typing | undefined) {
      errorNameNode = undefined;
      if (!suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = oldDiag;
      return returnValue || new qc.KeywordTyping(Syntax.AnyKeyword);
    }
  }
  function isDeclarationAndNotVisible(node: NamedDecl) {
    node = qc.get.parseTreeOf(node) as NamedDecl;
    switch (node.kind) {
      case Syntax.FunctionDeclaration:
      case Syntax.ModuleDeclaration:
      case Syntax.InterfaceDeclaration:
      case Syntax.ClassDeclaration:
      case Syntax.TypeAliasDeclaration:
      case Syntax.EnumDeclaration:
        return !resolver.isDeclarationVisible(node);
      case Syntax.VariableDeclaration:
        return !getBindingNameVisible(node as VariableDeclaration);
      case Syntax.ImportEqualsDeclaration:
      case Syntax.ImportDeclaration:
      case Syntax.ExportDeclaration:
      case Syntax.ExportAssignment:
        return false;
    }
    return false;
  }
  function getBindingNameVisible(elem: BindingElem | VariableDeclaration | OmittedExpression): boolean {
    if (qc.is.kind(qc.OmittedExpression, elem)) return false;
    if (qc.is.kind(qc.BindingPattern, elem.name)) return some(elem.name.elems, getBindingNameVisible);
    return resolver.isDeclarationVisible(elem);
  }
  function updateParamsList(node: Node, params: Nodes<ParameterDeclaration>, modifierMask?: ModifierFlags) {
    if (qc.has.effectiveModifier(node, ModifierFlags.Private)) return undefined!;
    const newParams = map(params, (p) => ensureParameter(p, modifierMask));
    if (!newParams) return undefined!;
    return new Nodes(newParams, params.trailingComma);
  }
  function updateAccessorParamsList(input: AccessorDeclaration, isPrivate: boolean) {
    let newParams: ParameterDeclaration[] | undefined;
    if (!isPrivate) {
      const thisParameter = getThisNode(ParameterDeclaration, input);
      if (thisParameter) newParams = [ensureParameter(thisParameter)];
    }
    if (qc.is.kind(qc.SetAccessorDeclaration, input)) {
      let newValueParameter: ParameterDeclaration | undefined;
      if (!isPrivate) {
        const valueParameter = qf.get.setAccessorValueParameter(input);
        if (valueParameter) {
          const accessorType = getTypeAnnotationFromAllAccessorDeclarations(input, resolver.qf.get.allAccessorDeclarations(input));
          newValueParameter = ensureParameter(valueParameter, undefined, accessorType);
        }
      }
      if (!newValueParameter) newValueParameter = new qc.ParameterDeclaration(undefined, undefined, 'value');
      newParams = append(newParams, newValueParameter);
    }
    return new Nodes(newParams || emptyArray) as Nodes<ParameterDeclaration>;
  }
  function ensureTypeParams(node: Node, params: Nodes<TypeParameterDeclaration> | undefined) {
    return qc.has.effectiveModifier(node, ModifierFlags.Private) ? undefined : Nodes.visit(params, visitDeclarationSubtree);
  }
  function isEnclosingDeclaration(node: Node) {
    return (
      qc.is.kind(qc.SourceFile, node) ||
      qc.is.kind(qc.TypeAliasDeclaration, node) ||
      qc.is.kind(qc.ModuleDeclaration, node) ||
      qc.is.kind(qc.ClassDeclaration, node) ||
      qc.is.kind(qc.InterfaceDeclaration, node) ||
      qc.is.functionLike(node) ||
      qc.is.kind(qc.IndexSignatureDeclaration, node) ||
      qc.is.kind(qc.MappedTyping, node)
    );
  }
  function checkEntityNameVisibility(entityName: EntityNameOrEntityNameExpression, enclosingDeclaration: Node) {
    const visibilityResult = resolver.isEntityNameVisible(entityName, enclosingDeclaration);
    handleSymbolAccessibilityError(visibilityResult);
    recordTypeReferenceDirectivesIfNecessary(resolver.getTypeReferenceDirectivesForEntityName(entityName));
  }
  function preserveDoc<T extends Node>(updated: T, original: Node): T {
    if (qc.is.withDocNodes(updated) && qc.is.withDocNodes(original)) updated.doc = original.doc;
    return setCommentRange(updated, getCommentRange(original));
  }
  function rewriteModuleSpecifier<T extends Node>(
    parent: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration | ModuleDeclaration | ImportTyping,
    input: T | undefined
  ): T | StringLiteral {
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
  function transformImportEqualsDeclaration(decl: ImportEqualsDeclaration) {
    if (!resolver.isDeclarationVisible(decl)) return;
    if (decl.moduleReference.kind === Syntax.ExternalModuleReference) {
      const specifier = qc.get.externalModuleImportEqualsDeclarationExpression(decl);
      return decl.update(undefined, decl.modifiers, decl.name, updateExternalModuleReference(decl.moduleReference, rewriteModuleSpecifier(decl, specifier)));
    } else {
      const oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(decl);
      checkEntityNameVisibility(decl.moduleReference, enclosingDeclaration);
      getSymbolAccessibilityDiagnostic = oldDiag;
      return decl;
    }
  }
  function transformImportDeclaration(decl: ImportDeclaration) {
    if (!decl.importClause) return decl.update(undefined, decl.modifiers, decl.importClause, rewriteModuleSpecifier(decl, decl.moduleSpecifier));
    const visibleDefaultBinding = decl.importClause && decl.importClause.name && resolver.isDeclarationVisible(decl.importClause) ? decl.importClause.name : undefined;
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
      const namedBindings = resolver.isDeclarationVisible(decl.importClause.namedBindings) ? decl.importClause.namedBindings : undefined;
      return visibleDefaultBinding || namedBindings
        ? decl.update(
            undefined,
            decl.modifiers,
            updateImportClause(decl.importClause, visibleDefaultBinding, namedBindings, decl.importClause.isTypeOnly),
            rewriteModuleSpecifier(decl, decl.moduleSpecifier)
          )
        : undefined;
    }
    const bindingList = mapDefined(decl.importClause.namedBindings.elems, (b) => (resolver.isDeclarationVisible(b) ? b : undefined));
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
  function transformAndReplaceLatePaintedStatements(statements: Nodes<Statement>): Nodes<Statement> {
    while (length(lateMarkedStatements)) {
      const i = lateMarkedStatements!.shift()!;
      if (!qc.is.lateVisibilityPaintedStatement(i))
        return fail(`Late replaced statement was found which is not handled by the declaration transformer!: ${(ts as any).SyntaxKind ? (ts as any).SyntaxKind[(i as any).kind] : (i as any).kind}`);
      const priorNeedsDeclare = needsDeclare;
      needsDeclare = i.parent && qc.is.kind(qc.SourceFile, i.parent) && !(qc.is.externalModule(i.parent) && isBundledEmit);
      const result = transformTopLevelDeclaration(i);
      needsDeclare = priorNeedsDeclare;
      lateStatementReplacementMap.set('' + getOriginalNodeId(i), result);
    }
    return Nodes.visit(statements, visitLateVisibilityMarkedStatements);
    function visitLateVisibilityMarkedStatements(statement: Statement) {
      if (qc.is.lateVisibilityPaintedStatement(statement)) {
        const key = '' + getOriginalNodeId(statement);
        if (lateStatementReplacementMap.has(key)) {
          const result = lateStatementReplacementMap.get(key);
          lateStatementReplacementMap.delete(key);
          if (result) {
            if (isArray(result) ? some(result, qf.is.scopeMarkerNeeded) : qf.is.scopeMarkerNeeded(result)) needsScopeFixMarker = true;
            if (qc.is.kind(qc.SourceFile, statement.parent) && (isArray(result) ? some(result, isExternalModuleIndicator) : qp_qc.is.externalModuleIndicator(result)))
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
    if (qc.is.declaration(input)) {
      if (isDeclarationAndNotVisible(input)) return;
      if (qf.has.dynamicName(input) && !resolver.isLateBound(qc.get.parseTreeOf(input) as Declaration)) return;
    }
    if (qc.is.functionLike(input) && resolver.isImplementationOfOverload(input)) return;
    if (qc.is.kind(qc.SemicolonClassElem, input)) return;
    let previousEnclosingDeclaration: typeof enclosingDeclaration;
    if (isEnclosingDeclaration(input)) {
      previousEnclosingDeclaration = enclosingDeclaration;
      enclosingDeclaration = input as Declaration;
    }
    const oldDiag = getSymbolAccessibilityDiagnostic;
    const canProduceDiagnostic = canProduceDiagnostics(input);
    const oldWithinObjectLiteralType = suppressNewDiagnosticContexts;
    let shouldEnterSuppressNewDiagnosticsContextContext = (input.kind === Syntax.TypingLiteral || input.kind === Syntax.MappedTyping) && input.parent.kind !== Syntax.TypeAliasDeclaration;
    if (qc.is.kind(qc.MethodDeclaration, input) || qc.is.kind(qc.MethodSignature, input)) {
      if (qc.has.effectiveModifier(input, ModifierFlags.Private)) {
        if (input.symbol && input.symbol.declarations && input.symbol.declarations[0] !== input) return;
        return cleanup(PropertyDeclaration.create(undefined, ensureModifiers(input), input.name, undefined, undefined, undefined));
      }
    }
    if (canProduceDiagnostic && !suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(input as DeclarationDiagnosticProducing);
    if (qc.is.kind(qc.TypingQuery, input)) checkEntityNameVisibility(input.exprName, enclosingDeclaration);
    if (shouldEnterSuppressNewDiagnosticsContextContext) suppressNewDiagnosticContexts = true;
    if (isProcessedComponent(input)) {
      switch (input.kind) {
        case Syntax.ExpressionWithTypings: {
          if (qc.is.entityName(input.expression) || qc.is.entityNameExpression(input.expression)) checkEntityNameVisibility(input.expression, enclosingDeclaration);
          const node = visitEachChild(input, visitDeclarationSubtree, context);
          return cleanup(node.update(parenthesizeTypeParameters(node.typeArguments), node.expression));
        }
        case Syntax.TypingReference: {
          checkEntityNameVisibility(input.typeName, enclosingDeclaration);
          const node = visitEachChild(input, visitDeclarationSubtree, context);
          return cleanup(node.update(node.typeName, parenthesizeTypeParameters(node.typeArguments)));
        }
        case Syntax.ConstructSignature:
          return cleanup(input.update(ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters), ensureType(input, input.type)));
        case Syntax.Constructor: {
          const ctor = SignatureDeclaration.create(Syntax.Constructor, ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters, ModifierFlags.None), undefined);
          ctor.modifiers = new Nodes(ensureModifiers(input));
          return cleanup(ctor);
        }
        case Syntax.MethodDeclaration: {
          if (qc.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          const sig = SignatureDeclaration.create(
            Syntax.MethodSignature,
            ensureTypeParams(input, input.typeParameters),
            updateParamsList(input, input.parameters),
            ensureType(input, input.type)
          ) as MethodSignature;
          sig.name = input.name;
          sig.modifiers = new Nodes(ensureModifiers(input));
          sig.questionToken = input.questionToken;
          return cleanup(sig);
        }
        case Syntax.GetAccessor: {
          if (qc.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          const accessorType = getTypeAnnotationFromAllAccessorDeclarations(input, resolver.qf.get.allAccessorDeclarations(input));
          return cleanup(
            input.update(
              undefined,
              ensureModifiers(input),
              input.name,
              updateAccessorParamsList(input, qc.has.effectiveModifier(input, ModifierFlags.Private)),
              ensureType(input, accessorType),
              undefined
            )
          );
        }
        case Syntax.SetAccessor: {
          if (qc.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          return cleanup(input.update(undefined, ensureModifiers(input), input.name, updateAccessorParamsList(input, qc.has.effectiveModifier(input, ModifierFlags.Private)), undefined));
        }
        case Syntax.PropertyDeclaration:
          if (qc.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          return cleanup(input.update(undefined, ensureModifiers(input), input.name, input.questionToken, ensureType(input, input.type), ensureNoIniter(input)));
        case Syntax.PropertySignature:
          if (qc.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          return cleanup(input.update(ensureModifiers(input), input.name, input.questionToken, ensureType(input, input.type), ensureNoIniter(input)));
        case Syntax.MethodSignature: {
          if (qc.is.kind(qc.PrivateIdentifier, input.name)) return cleanup(undefined);
          return cleanup(input.update(ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters), ensureType(input, input.type), input.name, input.questionToken));
        }
        case Syntax.CallSignature: {
          return cleanup(input.update(ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters), ensureType(input, input.type)));
        }
        case Syntax.IndexSignature: {
          return cleanup(
            input.update(undefined, ensureModifiers(input), updateParamsList(input, input.parameters), visitNode(input.type, visitDeclarationSubtree) || new qc.KeywordTyping(Syntax.AnyKeyword))
          );
        }
        case Syntax.VariableDeclaration: {
          if (qc.is.kind(qc.BindingPattern, input.name)) return recreateBindingPattern(input.name);
          shouldEnterSuppressNewDiagnosticsContextContext = true;
          suppressNewDiagnosticContexts = true;
          return cleanup(input.update(input.name, ensureType(input, input.type), ensureNoIniter(input)));
        }
        case Syntax.TypeParameter: {
          if (isPrivateMethodTypeParameter(input) && (input.default || input.constraint)) return cleanup(updateTypeParameterDeclaration(input, input.name, undefined));
          return cleanup(visitEachChild(input, visitDeclarationSubtree, context));
        }
        case Syntax.ConditionalTyping: {
          const checkType = visitNode(input.checkType, visitDeclarationSubtree);
          const extendsType = visitNode(input.extendsType, visitDeclarationSubtree);
          const oldEnclosingDecl = enclosingDeclaration;
          enclosingDeclaration = input.trueType;
          const trueType = visitNode(input.trueType, visitDeclarationSubtree);
          enclosingDeclaration = oldEnclosingDecl;
          const falseType = visitNode(input.falseType, visitDeclarationSubtree);
          return cleanup(input.update(checkType, extendsType, trueType, falseType));
        }
        case Syntax.FunctionTyping: {
          return cleanup(input.update(Nodes.visit(input.typeParameters, visitDeclarationSubtree), updateParamsList(input, input.parameters), visitNode(input.type, visitDeclarationSubtree)));
        }
        case Syntax.ConstructorTyping: {
          return cleanup(
            ConstructorDeclaration.updateTypeNode(
              input,
              Nodes.visit(input.typeParameters, visitDeclarationSubtree),
              updateParamsList(input, input.parameters),
              visitNode(input.type, visitDeclarationSubtree)
            )
          );
        }
        case Syntax.ImportTyping: {
          if (!qc.is.literalImportTyping(input)) return cleanup(input);
          return cleanup(
            input.update(
              input.argument.update(rewriteModuleSpecifier(input, input.argument.literal)),
              input.qualifier,
              Nodes.visit(input.typeArguments, visitDeclarationSubtree, isTypeNode),
              input.isTypeOf
            )
          );
        }
        default:
          qc.assert.never(input, `Attempted to process unhandled node kind: ${(ts as any).SyntaxKind[(input as any).kind]}`);
      }
    }
    if (qc.is.kind(qc.TupleTyping, input) && syntax.get.lineAndCharOf(currentSourceFile, input.pos).line === syntax.get.lineAndCharOf(currentSourceFile, input.end).line)
      setEmitFlags(input, EmitFlags.SingleLine);
    return cleanup(visitEachChild(input, visitDeclarationSubtree, context));
    function cleanup<T extends Node>(returnValue: T | undefined): T | undefined {
      if (returnValue && canProduceDiagnostic && qf.has.dynamicName(input as Declaration)) checkName(input as DeclarationDiagnosticProducing);
      if (isEnclosingDeclaration(input)) enclosingDeclaration = previousEnclosingDeclaration;
      if (canProduceDiagnostic && !suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = oldDiag;
      if (shouldEnterSuppressNewDiagnosticsContextContext) suppressNewDiagnosticContexts = oldWithinObjectLiteralType;
      if (returnValue === input) return returnValue;
      return returnValue && preserveDoc(returnValue, input).setOriginal(input);
    }
  }
  function isPrivateMethodTypeParameter(node: TypeParameterDeclaration) {
    return node.parent.kind === Syntax.MethodDeclaration && qc.has.effectiveModifier(node.parent, ModifierFlags.Private);
  }
  function visitDeclarationStmts(input: Node): VisitResult<Node> {
    if (!isPreservedDeclarationStmt(input)) return;
    if (shouldStripInternal(input)) return;
    switch (input.kind) {
      case Syntax.ExportDeclaration: {
        if (qc.is.kind(qc.SourceFile, input.parent)) resultHasExternalModuleIndicator = true;
        resultHasScopeMarker = true;
        return input.update(undefined, input.modifiers, input.exportClause, rewriteModuleSpecifier(input, input.moduleSpecifier), input.isTypeOnly);
      }
      case Syntax.ExportAssignment: {
        if (qc.is.kind(qc.SourceFile, input.parent)) resultHasExternalModuleIndicator = true;
        resultHasScopeMarker = true;
        if (input.expression.kind === Syntax.Identifier) return input;
        else {
          const newId = createOptimisticUniqueName('_default');
          getSymbolAccessibilityDiagnostic = () => ({
            diagnosticMessage: qd.Default_export_of_the_module_has_or_is_using_private_name_0,
            errorNode: input,
          });
          const varDecl = new qc.VariableDeclaration(newId, resolver.createTypeOfExpression(input.expression, input, declarationEmitNodeBuilderFlags, symbolTracker), undefined);
          const statement = new qc.VariableStatement(needsDeclare ? [qc.create.modifier(Syntax.DeclareKeyword)] : [], new qc.VariableDeclarationList([varDecl], NodeFlags.Const));
          return [statement, input.update(input.decorators, input.modifiers, newId)];
        }
      }
    }
    const result = transformTopLevelDeclaration(input);
    lateStatementReplacementMap.set('' + getOriginalNodeId(input), result);
    return input;
  }
  function stripExportModifiers(statement: Statement): Statement {
    if (qc.is.kind(qc.ImportEqualsDeclaration, statement) || qc.has.effectiveModifier(statement, ModifierFlags.Default)) return statement;
    const clone = getMutableClone(statement);
    const modifiers = qc.create.modifiersFromFlags(qc.get.effectiveModifierFlags(statement) & (ModifierFlags.All ^ ModifierFlags.Export));
    clone.modifiers = modifiers.length ? new Nodes(modifiers) : undefined;
    return clone;
  }
  function transformTopLevelDeclaration(input: LateVisibilityPaintedStatement) {
    if (shouldStripInternal(input)) return;
    switch (input.kind) {
      case Syntax.ImportEqualsDeclaration: {
        return transformImportEqualsDeclaration(input);
      }
      case Syntax.ImportDeclaration: {
        return transformImportDeclaration(input);
      }
    }
    if (qc.is.declaration(input) && isDeclarationAndNotVisible(input)) return;
    if (qc.is.functionLike(input) && resolver.isImplementationOfOverload(input)) return;
    let previousEnclosingDeclaration: typeof enclosingDeclaration;
    if (isEnclosingDeclaration(input)) {
      previousEnclosingDeclaration = enclosingDeclaration;
      enclosingDeclaration = input as Declaration;
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
            Nodes.visit(input.typeParameters, visitDeclarationSubtree, isTypeParameterDeclaration),
            visitNode(input.type, visitDeclarationSubtree, isTypeNode)
          )
        );
      case Syntax.InterfaceDeclaration: {
        return cleanup(
          input.update(
            undefined,
            ensureModifiers(input),
            input.name,
            ensureTypeParams(input, input.typeParameters),
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
            ensureTypeParams(input, input.typeParameters),
            updateParamsList(input, input.parameters),
            ensureType(input, input.type),
            undefined
          )
        );
        if (clean && resolver.isExpandoFunctionDeclaration(input)) {
          const props = resolver.getPropertiesOfContainerFunction(input);
          const fakespace = new qc.ModuleDeclaration(undefined, undefined, clean.name || new Identifier('_default'), new qc.ModuleBlock([]), NodeFlags.Namespace);
          fakespace.flags ^= NodeFlags.Synthesized;
          fakespace.parent = enclosingDeclaration as SourceFile | NamespaceDeclaration;
          fakespace.locals = new SymbolTable(props);
          fakespace.symbol = props[0].parent!;
          const declarations = mapDefined(props, (p) => {
            if (!qc.is.kind(qc.PropertyAccessExpression, p.valueDeclaration)) return;
            getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(p.valueDeclaration);
            const type = resolver.createTypeOfDeclaration(p.valueDeclaration, fakespace, declarationEmitNodeBuilderFlags, symbolTracker);
            getSymbolAccessibilityDiagnostic = oldDiag;
            const varDecl = new qc.VariableDeclaration(syntax.get.unescUnderscores(p.escName), type, undefined);
            return new qc.VariableStatement(undefined, new qc.VariableDeclarationList([varDecl]));
          });
          const namespaceDecl = new qc.ModuleDeclaration(undefined, ensureModifiers(input), input.name!, new qc.ModuleBlock(declarations), NodeFlags.Namespace);
          if (!qc.has.effectiveModifier(clean, ModifierFlags.Default)) return [clean, namespaceDecl];
          const modifiers = qc.create.modifiersFromFlags((qc.get.effectiveModifierFlags(clean) & ~ModifierFlags.ExportDefault) | ModifierFlags.Ambient);
          const cleanDeclaration = clean.update(undefined, modifiers, undefined, clean.name, clean.typeParameters, clean.parameters, clean.type, undefined);
          const namespaceDeclaration = namespaceDecl.update(undefined, modifiers, namespaceDecl.name, namespaceDecl.body);
          const exportDefaultDeclaration = new qc.ExportAssignment(undefined, false, namespaceDecl.name);
          if (qc.is.kind(qc.SourceFile, input.parent)) resultHasExternalModuleIndicator = true;
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
          return cleanup(input.update(undefined, mods, qc.is.externalModuleAugmentation(input) ? rewriteModuleSpecifier(input, input.name) : input.name, body));
        } else {
          needsDeclare = previousNeedsDeclare;
          const mods = ensureModifiers(input);
          needsDeclare = false;
          visitNode(inner, visitDeclarationStmts);
          const id = '' + getOriginalNodeId(inner!);
          const body = lateStatementReplacementMap.get(id);
          lateStatementReplacementMap.delete(id);
          return cleanup(input.update(undefined, mods, input.name, body as ModuleBody));
        }
      }
      case Syntax.ClassDeclaration: {
        const modifiers = new Nodes(ensureModifiers(input));
        const typeParameters = ensureTypeParams(input, input.typeParameters);
        const ctor = qf.get.firstConstructorWithBody(input);
        let parameterProperties: readonly PropertyDeclaration[] | undefined;
        if (ctor) {
          const oldDiag = getSymbolAccessibilityDiagnostic;
          parameterProperties = compact(
            flatMap(ctor.parameters, (param) => {
              if (!qc.has.syntacticModifier(param, ModifierFlags.ParameterPropertyModifier) || shouldStripInternal(param)) return;
              getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(param);
              if (param.name.kind === Syntax.Identifier)
                return preserveDoc(PropertyDeclaration.create(undefined, ensureModifiers(param), param.name, param.questionToken, ensureType(param, param.type), ensureNoIniter(param)), param);
              return walkBindingPattern(param.name);
              function walkBindingPattern(pattern: BindingPattern) {
                let elems: PropertyDeclaration[] | undefined;
                for (const elem of pattern.elems) {
                  if (qc.is.kind(qc.OmittedExpression, elem)) continue;
                  if (qc.is.kind(qc.BindingPattern, elem.name)) elems = concatenate(elems, walkBindingPattern(elem.name));
                  elems = elems || [];
                  elems.push(PropertyDeclaration.create(undefined, ensureModifiers(param), elem.name as Identifier, undefined, ensureType(elem, undefined), undefined));
                }
                return elems;
              }
            })
          );
          getSymbolAccessibilityDiagnostic = oldDiag;
        }
        const hasPrivateIdentifier = some(input.members, (member) => !!member.name && qc.is.kind(qc.PrivateIdentifier, member.name));
        const privateIdentifier = hasPrivateIdentifier ? [PropertyDeclaration.create(undefined, undefined, new PrivateIdentifier('#private'), undefined, undefined, undefined)] : undefined;
        const memberNodes = concatenate(concatenate(privateIdentifier, parameterProperties), Nodes.visit(input.members, visitDeclarationSubtree));
        const members = new Nodes(memberNodes);
        const extendsClause = qf.get.effectiveBaseTypeNode(input);
        if (extendsClause && !qc.is.entityNameExpression(extendsClause.expression) && extendsClause.expression.kind !== Syntax.NullKeyword) {
          const oldId = input.name ? syntax.get.unescUnderscores(input.name.escapedText) : 'default';
          const newId = createOptimisticUniqueName(`${oldId}_base`);
          getSymbolAccessibilityDiagnostic = () => ({
            diagnosticMessage: qd.extends_clause_of_exported_class_0_has_or_is_using_private_name_1,
            errorNode: extendsClause,
            typeName: input.name,
          });
          const varDecl = new qc.VariableDeclaration(newId, resolver.createTypeOfExpression(extendsClause.expression, input, declarationEmitNodeBuilderFlags, symbolTracker), undefined);
          const statement = new qc.VariableStatement(needsDeclare ? [qc.create.modifier(Syntax.DeclareKeyword)] : [], new qc.VariableDeclarationList([varDecl], NodeFlags.Const));
          const heritageClauses = new Nodes(
            map(input.heritageClauses, (clause) => {
              if (clause.token === Syntax.ExtendsKeyword) {
                const oldDiag = getSymbolAccessibilityDiagnostic;
                getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(clause.types[0]);
                const newClause = updateHeritageClause(
                  clause,
                  map(clause.types, (t) => updateExpressionWithTypings(t, Nodes.visit(t.typeArguments, visitDeclarationSubtree), newId))
                );
                getSymbolAccessibilityDiagnostic = oldDiag;
                return newClause;
              }
              return updateHeritageClause(
                clause,
                Nodes.visit(new Nodes(filter(clause.types, (t) => qc.is.entityNameExpression(t.expression) || t.expression.kind === Syntax.NullKeyword)), visitDeclarationSubtree)
              );
            })
          );
          return [statement, cleanup(input.update(undefined, modifiers, input.name, typeParameters, heritageClauses, members))!];
        } else {
          const heritageClauses = transformHeritageClauses(input.heritageClauses);
          return cleanup(input.update(undefined, modifiers, input.name, typeParameters, heritageClauses, members));
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
  function transformVariableStatement(input: VariableStatement) {
    if (!forEach(input.declarationList.declarations, getBindingNameVisible)) return;
    const nodes = Nodes.visit(input.declarationList.declarations, visitDeclarationSubtree);
    if (!length(nodes)) return;
    return input.update(new Nodes(ensureModifiers(input)), updateVariableDeclarationList(input.declarationList, nodes));
  }
  function recreateBindingPattern(d: BindingPattern): VariableDeclaration[] {
    return flatten<VariableDeclaration>(mapDefined(d.elems, (e) => recreateBindingElem(e)));
  }
  function recreateBindingElem(e: ArrayBindingElem) {
    if (e.kind === Syntax.OmittedExpression) return;
    if (e.name) {
      if (!getBindingNameVisible(e)) return;
      if (qc.is.kind(qc.BindingPattern, e.name)) return recreateBindingPattern(e.name);
      return new qc.VariableDeclaration(e.name, ensureType(e, undefined), undefined);
    }
  }
  function checkName(node: DeclarationDiagnosticProducing) {
    let oldDiag: typeof getSymbolAccessibilityDiagnostic | undefined;
    if (!suppressNewDiagnosticContexts) {
      oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNodeName(node);
    }
    errorNameNode = (node as NamedDecl).name;
    assert(resolver.isLateBound(qc.get.parseTreeOf(node) as Declaration));
    const decl = (node as NamedDecl) as LateBoundDecl;
    const entityName = decl.name.expression;
    checkEntityNameVisibility(entityName, enclosingDeclaration);
    if (!suppressNewDiagnosticContexts) getSymbolAccessibilityDiagnostic = oldDiag!;
    errorNameNode = undefined;
  }
  function shouldStripInternal(node: Node) {
    return !!stripInternal && !!node && isInternalDeclaration(node, currentSourceFile);
  }
  function isNodeScopeMarker(node: Node) {
    return qc.is.kind(qc.ExportAssignment, node) || qc.is.kind(qc.ExportDeclaration, node);
  }
  function qf.has.scopeMarker(statements: readonly Statement[]) {
    return some(statements, isScopeMarker);
  }
  function ensureModifiers(node: Node): readonly Modifier[] | undefined {
    const currentFlags = qc.get.effectiveModifierFlags(node);
    const newFlags = ensureModifierFlags(node);
    if (currentFlags === newFlags) return node.modifiers;
    return qc.create.modifiersFromFlags(newFlags);
  }
  function ensureModifierFlags(node: Node): ModifierFlags {
    let mask = ModifierFlags.All ^ (ModifierFlags.Public | ModifierFlags.Async);
    let additions = needsDeclare && !isAlwaysType(node) ? ModifierFlags.Ambient : ModifierFlags.None;
    const parentIsFile = node.parent.kind === Syntax.SourceFile;
    if (!parentIsFile || (isBundledEmit && parentIsFile && qc.is.externalModule(node.parent as SourceFile))) {
      mask ^= ModifierFlags.Ambient;
      additions = ModifierFlags.None;
    }
    return maskModifierFlags(node, mask, additions);
  }
  function getTypeAnnotationFromAllAccessorDeclarations(node: AccessorDeclaration, accessors: AllAccessorDeclarations) {
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
  function transformHeritageClauses(nodes: Nodes<HeritageClause> | undefined) {
    return new Nodes(
      filter(
        map(nodes, (clause) =>
          updateHeritageClause(
            clause,
            Nodes.visit(
              new Nodes(
                filter(clause.types, (t) => {
                  return qc.is.entityNameExpression(t.expression) || (clause.token === Syntax.ExtendsKeyword && t.expression.kind === Syntax.NullKeyword);
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
  return qc.create.modifiersFromFlags(maskModifierFlags(node, modifierMask, modifierAdditions));
}
function maskModifierFlags(node: Node, modifierMask: ModifierFlags = ModifierFlags.All ^ ModifierFlags.Public, modifierAdditions: ModifierFlags = ModifierFlags.None): ModifierFlags {
  let flags = (qc.get.effectiveModifierFlags(node) & modifierMask) | modifierAdditions;
  if (flags & ModifierFlags.Default && !(flags & ModifierFlags.Export)) flags ^= ModifierFlags.Export;
  if (flags & ModifierFlags.Default && flags & ModifierFlags.Ambient) flags ^= ModifierFlags.Ambient;
  return flags;
}
function getTypeAnnotationFromAccessor(accessor: AccessorDeclaration): Typing | undefined {
  if (accessor) return accessor.kind === Syntax.GetAccessor ? accessor.type : accessor.parameters.length > 0 ? accessor.parameters[0].type : undefined;
}
type CanHaveLiteralIniter = VariableDeclaration | PropertyDeclaration | PropertySignature | ParameterDeclaration;
function canHaveLiteralIniter(node: Node): boolean {
  switch (node.kind) {
    case Syntax.PropertyDeclaration:
    case Syntax.PropertySignature:
      return !qc.has.effectiveModifier(node, ModifierFlags.Private);
    case Syntax.Parameter:
    case Syntax.VariableDeclaration:
      return true;
  }
  return false;
}
type ProcessedDeclarationStmt =
  | FunctionDeclaration
  | ModuleDeclaration
  | ImportEqualsDeclaration
  | InterfaceDeclaration
  | ClassDeclaration
  | TypeAliasDeclaration
  | EnumDeclaration
  | VariableStatement
  | ImportDeclaration
  | ExportDeclaration
  | ExportAssignment;
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
  | ConstructSignatureDeclaration
  | ConstructorDeclaration
  | MethodDeclaration
  | GetAccessorDeclaration
  | SetAccessorDeclaration
  | PropertyDeclaration
  | PropertySignature
  | MethodSignature
  | CallSignatureDeclaration
  | IndexSignatureDeclaration
  | VariableDeclaration
  | TypeParameterDeclaration
  | ExpressionWithTypings
  | TypingReference
  | ConditionalTyping
  | FunctionTyping
  | ConstructorTyping
  | ImportTyping;
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
    case Syntax.TypeParameter:
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
