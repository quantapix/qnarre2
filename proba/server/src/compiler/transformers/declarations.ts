export function getDeclarationDiagnostics(host: EmitHost, resolver: EmitResolver, file: SourceFile | undefined): qt.DiagnosticWithLocation[] | undefined {
  if (file && qu.isJsonSourceFile(file)) {
    return []; // No declaration diagnostics for json for now
  }
  const compilerOptions = host.getCompilerOptions();
  const result = transformNodes(resolver, host, compilerOptions, file ? [file] : filter(host.getSourceFiles(), isSourceFileNotJson), [transformDeclarations], /*allowDtsFiles*/ false);
  return result.diagnostics;
}

function hasInternalAnnotation(range: CommentRange, currentSourceFile: SourceFile) {
  const comment = currentSourceFile.text.substring(range.pos, range.end);
  return qc.stringContains(comment, '@internal');
}

export function isInternalDeclaration(node: qt.Node, currentSourceFile: SourceFile) {
  const parseTreeNode = getParseTreeNode(node);
  if (parseTreeNode && parseTreeNode.kind === qt.SyntaxKind.Parameter) {
    const paramIdx = parseTreeNode.parent.parameters.indexOf(parseTreeNode);
    const previousSibling = paramIdx > 0 ? parseTreeNode.parent.parameters[paramIdx - 1] : undefined;
    const text = currentSourceFile.text;
    const commentRanges = previousSibling
      ? concatenate(
          // to handle
          // ... parameters,
          // public param: string
          qs.getTrailingCommentRanges(text, qs.skipTrivia(text, previousSibling.end + 1, /* stopAfterLineBreak */ false, /* stopAtComments */ true)),
          qs.getLeadingCommentRanges(text, node.pos)
        )
      : qs.getTrailingCommentRanges(text, qs.skipTrivia(text, node.pos, /* stopAfterLineBreak */ false, /* stopAtComments */ true));
    return commentRanges && commentRanges.length && hasInternalAnnotation(last(commentRanges), currentSourceFile);
  }
  const leadingCommentRanges = parseTreeNode && qu.getLeadingCommentRangesOfNode(parseTreeNode, currentSourceFile);
  return !!forEach(leadingCommentRanges, (range) => {
    return hasInternalAnnotation(range, currentSourceFile);
  });
}

const declarationEmitNodeBuilderFlags = NodeBuilderFlags.MultilineObjectLiterals | NodeBuilderFlags.WriteClassExpressionAsTypeLiteral | NodeBuilderFlags.UseTypeOfFunction | NodeBuilderFlags.UseStructuralFallback | NodeBuilderFlags.AllowEmptyTuple | NodeBuilderFlags.GenerateNamesForShadowedTypeParams | NodeBuilderFlags.NoTruncation;

/**
 * Transforms a ts file into a .d.ts file
 * This process requires type information, which is retrieved through the emit resolver. Because of this,
 * in many places this transformer assumes it will be operating on parse tree nodes directly.
 * This means that _no transforms should be allowed to occur before this one_.
 */
export function transformDeclarations(context: TransformationContext) {
  const throwDiagnostic = () => Debug.fail('Diagnostic emitted without context');
  let getSymbolAccessibilityDiagnostic: GetSymbolAccessibilityDiagnostic = throwDiagnostic;
  let needsDeclare = true;
  let isBundledEmit = false;
  let resultHasExternalModuleIndicator = false;
  let needsScopeFixMarker = false;
  let resultHasScopeMarker = false;
  let enclosingDeclaration: Node;
  let necessaryTypeReferences: Map<true> | undefined;
  let lateMarkedStatements: LateVisibilityPaintedStatement[] | undefined;
  let lateStatementReplacementMap: Map<VisitResult<LateVisibilityPaintedStatement | qt.ExportAssignment>>;
  let suppressNewDiagnosticContexts: boolean;
  let exportedModulesFromDeclarationEmit: symbol[] | undefined;

  const host = context.getEmitHost();
  const symbolTracker: SymbolTracker = {
    trackSymbol,
    reportInaccessibleThisError,
    reportInaccessibleUniqueSymbolError,
    reportPrivateInBaseOfClassExpression,
    reportLikelyUnsafeImportRequiredError,
    moduleResolverHost: host,
    trackReferencedAmbientModule,
    trackExternalModuleSymbolOfImportTypeNode,
    reportNonlocalAugmentation,
  };
  let errorNameNode: DeclarationName | undefined;

  let currentSourceFile: SourceFile;
  let refs: Map<SourceFile>;
  let libs: Map<boolean>;
  let emittedImports: readonly AnyImportSyntax[] | undefined; // must be declared in container so it can be `undefined` while transformer's first pass
  const resolver = context.getEmitResolver();
  const options = context.getCompilerOptions();
  const { noResolve, stripInternal } = options;
  return transformRoot;

  function recordTypeReferenceDirectivesIfNecessary(typeReferenceDirectives: readonly string[] | undefined): void {
    if (!typeReferenceDirectives) {
      return;
    }
    necessaryTypeReferences = necessaryTypeReferences || qc.createMap<true>();
    for (const ref of typeReferenceDirectives) {
      necessaryTypeReferences.set(ref, true);
    }
  }

  function trackReferencedAmbientModule(node: ModuleDeclaration, symbol: symbol) {
    // If it is visible via `// <reference types="..."/>`, then we should just use that
    const directives = resolver.getTypeReferenceDirectivesForSymbol(symbol, SymbolFlags.All);
    if (length(directives)) {
      return recordTypeReferenceDirectivesIfNecessary(directives);
    }
    // Otherwise we should emit a path-based reference
    const container = qu.getSourceFileOfNode(node);
    refs.set('' + getOriginalNodeId(container), container);
  }

  function handleSymbolAccessibilityError(symbolAccessibilityResult: SymbolAccessibilityResult) {
    if (symbolAccessibilityResult.accessibility === SymbolAccessibility.Accessible) {
      // Add aliases back onto the possible imports list if they're not there so we can try them again with updated visibility info
      if (symbolAccessibilityResult && symbolAccessibilityResult.aliasesToMakeVisible) {
        if (!lateMarkedStatements) {
          lateMarkedStatements = symbolAccessibilityResult.aliasesToMakeVisible;
        } else {
          for (const ref of symbolAccessibilityResult.aliasesToMakeVisible) {
            pushIfUnique(lateMarkedStatements, ref);
          }
        }
      }

      // TODO: Do all these accessibility checks inside/after the first pass in the checker when declarations are enabled, if possible
    } else {
      // Report error
      const errorInfo = getSymbolAccessibilityDiagnostic(symbolAccessibilityResult);
      if (errorInfo) {
        if (errorInfo.typeName) {
          context.addDiagnostic(qu.createDiagnosticForNode(symbolAccessibilityResult.errorNode || errorInfo.errorNode, errorInfo.diagnosticMessage, qu.getTextOfNode(errorInfo.typeName), symbolAccessibilityResult.errorSymbolName, symbolAccessibilityResult.errorModuleName));
        } else {
          context.addDiagnostic(qu.createDiagnosticForNode(symbolAccessibilityResult.errorNode || errorInfo.errorNode, errorInfo.diagnosticMessage, symbolAccessibilityResult.errorSymbolName, symbolAccessibilityResult.errorModuleName));
        }
      }
    }
  }

  function trackExternalModuleSymbolOfImportTypeNode(symbol: symbol) {
    if (!isBundledEmit) {
      (exportedModulesFromDeclarationEmit || (exportedModulesFromDeclarationEmit = [])).push(symbol);
    }
  }

  function trackSymbol(symbol: symbol, enclosingDeclaration?: Node, meaning?: SymbolFlags) {
    if (symbol.flags & SymbolFlags.TypeParameter) return;
    handleSymbolAccessibilityError(resolver.isSymbolAccessible(symbol, enclosingDeclaration, meaning, /*shouldComputeAliasesToMakeVisible*/ true));
    recordTypeReferenceDirectivesIfNecessary(resolver.getTypeReferenceDirectivesForSymbol(symbol, meaning));
  }

  function reportPrivateInBaseOfClassExpression(propertyName: string) {
    if (errorNameNode) {
      context.addDiagnostic(qu.createDiagnosticForNode(errorNameNode, Diagnostics.Property_0_of_exported_class_expression_may_not_be_private_or_protected, propertyName));
    }
  }

  function reportInaccessibleUniqueSymbolError() {
    if (errorNameNode) {
      context.addDiagnostic(qu.createDiagnosticForNode(errorNameNode, Diagnostics.The_inferred_type_of_0_references_an_inaccessible_1_type_A_type_annotation_is_necessary, qu.declarationNameToString(errorNameNode), 'unique symbol'));
    }
  }

  function reportInaccessibleThisError() {
    if (errorNameNode) {
      context.addDiagnostic(qu.createDiagnosticForNode(errorNameNode, Diagnostics.The_inferred_type_of_0_references_an_inaccessible_1_type_A_type_annotation_is_necessary, qu.declarationNameToString(errorNameNode), 'this'));
    }
  }

  function reportLikelyUnsafeImportRequiredError(specifier: string) {
    if (errorNameNode) {
      context.addDiagnostic(qu.createDiagnosticForNode(errorNameNode, Diagnostics.The_inferred_type_of_0_cannot_be_named_without_a_reference_to_1_This_is_likely_not_portable_A_type_annotation_is_necessary, qu.declarationNameToString(errorNameNode), specifier));
    }
  }

  function reportNonlocalAugmentation(containingFile: SourceFile, parentSymbol: symbol, symbol: symbol) {
    const primaryDeclaration = find(parentSymbol.declarations, (d) => qu.getSourceFileOfNode(d) === containingFile)!;
    const augmentingDeclarations = filter(symbol.declarations, (d) => qu.getSourceFileOfNode(d) !== containingFile);
    for (const augmentations of augmentingDeclarations) {
      context.addDiagnostic(addRelatedInfo(qu.createDiagnosticForNode(augmentations, Diagnostics.Declaration_augments_declaration_in_another_file_This_cannot_be_serialized), qu.createDiagnosticForNode(primaryDeclaration, Diagnostics.This_is_the_declaration_being_augmented_Consider_moving_the_augmenting_declaration_into_the_same_file)));
    }
  }

  function transformDeclarationsForJS(sourceFile: SourceFile, bundled?: boolean) {
    const oldDiag = getSymbolAccessibilityDiagnostic;
    getSymbolAccessibilityDiagnostic = (s) => ({
      diagnosticMessage: s.errorModuleName ? Diagnostics.Declaration_emit_for_this_file_requires_using_private_name_0_from_module_1_An_explicit_type_annotation_may_unblock_declaration_emit : Diagnostics.Declaration_emit_for_this_file_requires_using_private_name_0_An_explicit_type_annotation_may_unblock_declaration_emit,
      errorNode: s.errorNode || sourceFile,
    });
    const result = resolver.getDeclarationStatementsForSourceFile(sourceFile, declarationEmitNodeBuilderFlags, symbolTracker, bundled);
    getSymbolAccessibilityDiagnostic = oldDiag;
    return result;
  }

  function transformRoot(node: Bundle): Bundle;
  function transformRoot(node: SourceFile): SourceFile;
  function transformRoot(node: SourceFile | Bundle): SourceFile | Bundle;
  function transformRoot(node: SourceFile | Bundle) {
    if (node.kind === qt.SyntaxKind.SourceFile && node.isDeclarationFile) {
      return node;
    }

    if (node.kind === qt.SyntaxKind.Bundle) {
      isBundledEmit = true;
      refs = qc.createMap<SourceFile>();
      libs = qc.createMap<boolean>();
      let hasNoDefaultLib = false;
      const bundle = createBundle(
        map(node.sourceFiles, (sourceFile) => {
          if (sourceFile.isDeclarationFile) return undefined!; // Omit declaration files from bundle results, too // TODO: GH#18217
          hasNoDefaultLib = hasNoDefaultLib || sourceFile.hasNoDefaultLib;
          currentSourceFile = sourceFile;
          enclosingDeclaration = sourceFile;
          lateMarkedStatements = undefined;
          suppressNewDiagnosticContexts = false;
          lateStatementReplacementMap = createMap();
          getSymbolAccessibilityDiagnostic = throwDiagnostic;
          needsScopeFixMarker = false;
          resultHasScopeMarker = false;
          collectReferences(sourceFile, refs);
          collectLibs(sourceFile, libs);
          if (qu.isExternalOrCommonJsModule(sourceFile) || qu.isJsonSourceFile(sourceFile)) {
            resultHasExternalModuleIndicator = false; // unused in external module bundle emit (all external modules are within module blocks, therefore are known to be modules)
            needsDeclare = false;
            const statements = isSourceFileJS(sourceFile) ? createNodeArray(transformDeclarationsForJS(sourceFile, /*bundled*/ true)) : visitNodes(sourceFile.statements, visitDeclarationStatements);
            const newFile = updateSourceFileNode(sourceFile, [createModuleDeclaration([], [createModifier(SyntaxKind.DeclareKeyword)], createLiteral(getResolvedExternalModuleName(context.getEmitHost(), sourceFile)), createModuleBlock(setTextRange(createNodeArray(transformAndReplaceLatePaintedStatements(statements)), sourceFile.statements)))], /*isDeclarationFile*/ true, /*referencedFiles*/ [], /*typeReferences*/ [], /*hasNoDefaultLib*/ false, /*libReferences*/ []);
            return newFile;
          }
          needsDeclare = true;
          const updated = isSourceFileJS(sourceFile) ? createNodeArray(transformDeclarationsForJS(sourceFile)) : visitNodes(sourceFile.statements, visitDeclarationStatements);
          return updateSourceFileNode(sourceFile, transformAndReplaceLatePaintedStatements(updated), /*isDeclarationFile*/ true, /*referencedFiles*/ [], /*typeReferences*/ [], /*hasNoDefaultLib*/ false, /*libReferences*/ []);
        }),
        mapDefined(node.prepends, (prepend) => {
          if (prepend.kind === qt.SyntaxKind.InputFiles) {
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
      const outputFilePath = qp.getDirectoryPath(qp.normalizeSlashes(getOutputPathsFor(node, host, /*forceDtsPaths*/ true).declarationFilePath!));
      const referenceVisitor = mapReferencesIntoArray(bundle.syntheticFileReferences as FileReference[], outputFilePath);
      refs.forEach(referenceVisitor);
      return bundle;
    }

    // Single source file
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
    lateStatementReplacementMap = createMap();
    necessaryTypeReferences = undefined;
    refs = collectReferences(currentSourceFile, createMap());
    libs = collectLibs(currentSourceFile, createMap());
    const references: FileReference[] = [];
    const outputFilePath = qp.getDirectoryPath(qp.normalizeSlashes(getOutputPathsFor(node, host, /*forceDtsPaths*/ true).declarationFilePath!));
    const referenceVisitor = mapReferencesIntoArray(references, outputFilePath);
    let combinedStatements: qt.NodeArray<Statement>;
    if (isSourceFileJS(currentSourceFile)) {
      combinedStatements = createNodeArray(transformDeclarationsForJS(node));
      refs.forEach(referenceVisitor);
      emittedImports = filter(combinedStatements, isAnyImportSyntax);
    } else {
      const statements = visitNodes(node.statements, visitDeclarationStatements);
      combinedStatements = setTextRange(createNodeArray(transformAndReplaceLatePaintedStatements(statements)), node.statements);
      refs.forEach(referenceVisitor);
      emittedImports = filter(combinedStatements, isAnyImportSyntax);
      if (isExternalModule(node) && (!resultHasExternalModuleIndicator || (needsScopeFixMarker && !resultHasScopeMarker))) {
        combinedStatements = setTextRange(createNodeArray([...combinedStatements, createEmptyExports()]), combinedStatements);
      }
    }
    const updated = updateSourceFileNode(node, combinedStatements, /*isDeclarationFile*/ true, references, getFileReferencesForUsedTypeReferences(), node.hasNoDefaultLib, getLibReferences());
    updated.exportedModulesFromDeclarationEmit = exportedModulesFromDeclarationEmit;
    return updated;

    function getLibReferences() {
      return map(arrayFrom(libs.keys()), (lib) => ({ fileName: lib, pos: -1, end: -1 }));
    }

    function getFileReferencesForUsedTypeReferences() {
      return necessaryTypeReferences ? mapDefined(arrayFrom(necessaryTypeReferences.keys()), getFileReferenceForTypeName) : [];
    }

    function getFileReferenceForTypeName(typeName: string): FileReference | undefined {
      // Elide type references for which we have imports
      if (emittedImports) {
        for (const importStatement of emittedImports) {
          if (isImportEqualsDeclaration(importStatement) && isExternalModuleReference(importStatement.moduleReference)) {
            const expr = importStatement.moduleReference.expression;
            if (isStringLiteralLike(expr) && expr.text === typeName) {
              return undefined;
            }
          } else if (isImportDeclaration(importStatement) && isStringLiteral(importStatement.moduleSpecifier) && importStatement.moduleSpecifier.text === typeName) {
            return undefined;
          }
        }
      }
      return { fileName: typeName, pos: -1, end: -1 };
    }

    function mapReferencesIntoArray(references: FileReference[], outputFilePath: string): (file: SourceFile) => void {
      return (file) => {
        let declFileName: string;
        if (file.isDeclarationFile) {
          // Neither decl files or js should have their refs changed
          declFileName = file.fileName;
        } else {
          if (isBundledEmit && contains((node as Bundle).sourceFiles, file)) return; // Omit references to files which are being merged
          const paths = getOutputPathsFor(file, host, /*forceDtsPaths*/ true);
          declFileName = paths.declarationFilePath || paths.jsFilePath || file.fileName;
        }

        if (declFileName) {
          const specifier = moduleSpecifiers.getModuleSpecifier(
            // We pathify the baseUrl since we pathify the other paths here, so we can still easily check if the other paths are within the baseUrl
            // TODO: Should we _always_ be pathifying the baseUrl as we read it in?
            { ...options, baseUrl: options.baseUrl && qp.toPath(options.baseUrl, host.getCurrentDirectory(), host.getCanonicalFileName) },
            currentSourceFile,
            qp.toPath(outputFilePath, host.getCurrentDirectory(), host.getCanonicalFileName),
            qp.toPath(declFileName, host.getCurrentDirectory(), host.getCanonicalFileName),
            host,
            /*preferences*/ undefined
          );
          if (!qp.pathIsRelative(specifier)) {
            // If some compiler option/symlink/whatever allows access to the file containing the ambient module declaration
            // via a non-relative name, emit a type reference directive to that non-relative name, rather than
            // a relative path to the declaration file
            recordTypeReferenceDirectivesIfNecessary([specifier]);
            return;
          }

          let fileName = qp.getRelativePathToDirectoryOrUrl(outputFilePath, declFileName, host.getCurrentDirectory(), host.getCanonicalFileName, /*isAbsolutePathAnUrl*/ false);
          if (qc.startsWith(fileName, './') && qp.hasExtension(fileName)) {
            fileName = fileName.substring(2);
          }

          // omit references to files from node_modules (npm may disambiguate module
          // references when installing this package, making the path is unreliable).
          if (qc.startsWith(fileName, 'node_modules/') || pathContainsNodeModules(fileName)) {
            return;
          }

          references.push({ pos: -1, end: -1, fileName });
        }
      };
    }
  }

  function collectReferences(sourceFile: SourceFile | UnparsedSource, ret: Map<SourceFile>) {
    if (noResolve || (!isUnparsedSource(sourceFile) && isSourceFileJS(sourceFile))) return ret;
    forEach(sourceFile.referencedFiles, (f) => {
      const elem = host.getSourceFileFromReference(sourceFile, f);
      if (elem) {
        ret.set('' + getOriginalNodeId(elem), elem);
      }
    });
    return ret;
  }

  function collectLibs(sourceFile: SourceFile | UnparsedSource, ret: Map<boolean>) {
    forEach(sourceFile.libReferenceDirectives, (ref) => {
      const lib = host.getLibFileFromReference(ref);
      if (lib) {
        ret.set(toFileNameLowerCase(ref.fileName), true);
      }
    });
    return ret;
  }

  function filterBindingPatternInitializers(name: qt.BindingName) {
    if (name.kind === qt.SyntaxKind.Identifier) {
      return name;
    } else {
      if (name.kind === qt.SyntaxKind.ArrayBindingPattern) {
        return updateArrayBindingPattern(name, visitNodes(name.elements, visitBindingElement));
      } else {
        return updateObjectBindingPattern(name, visitNodes(name.elements, visitBindingElement));
      }
    }

    function visitBindingElement<T extends ArrayBindingElement>(elem: T): T;
    function visitBindingElement(elem: ArrayBindingElement): ArrayBindingElement {
      if (elem.kind === qt.SyntaxKind.OmittedExpression) {
        return elem;
      }
      return updateBindingElement(elem, elem.dotDotDotToken, elem.propertyName, filterBindingPatternInitializers(elem.name), shouldPrintWithInitializer(elem) ? elem.initializer : undefined);
    }
  }

  function ensureParameter(p: ParameterDeclaration, modifierMask?: qt.ModifierFlags, type?: TypeNode): ParameterDeclaration {
    let oldDiag: typeof getSymbolAccessibilityDiagnostic | undefined;
    if (!suppressNewDiagnosticContexts) {
      oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(p);
    }
    const newParam = updateParameter(
      p,
      /*decorators*/ undefined,
      maskModifiers(p, modifierMask),
      p.dotDotDotToken,
      filterBindingPatternInitializers(p.name),
      resolver.isOptionalParameter(p) ? p.questionToken || createToken(SyntaxKind.QuestionToken) : undefined,
      ensureType(p, type || p.type, /*ignorePrivate*/ true), // Ignore private param props, since this type is going straight back into a param
      ensureNoInitializer(p)
    );
    if (!suppressNewDiagnosticContexts) {
      getSymbolAccessibilityDiagnostic = oldDiag!;
    }
    return newParam;
  }

  function shouldPrintWithInitializer(node: qt.Node) {
    return canHaveLiteralInitializer(node) && resolver.isLiteralConstDeclaration(getParseTreeNode(node) as CanHaveLiteralInitializer); // TODO: Make safe
  }

  function ensureNoInitializer(node: CanHaveLiteralInitializer) {
    if (shouldPrintWithInitializer(node)) {
      return resolver.createLiteralConstValue(getParseTreeNode(node) as CanHaveLiteralInitializer, symbolTracker); // TODO: Make safe
    }
    return undefined;
  }

  type HasInferredType = FunctionDeclaration | MethodDeclaration | GetAccessorDeclaration | SetAccessorDeclaration | qt.BindingElement | ConstructSignatureDeclaration | qt.VariableDeclaration | MethodSignature | CallSignatureDeclaration | ParameterDeclaration | PropertyDeclaration | PropertySignature;

  function ensureType(node: HasInferredType, type: TypeNode | undefined, ignorePrivate?: boolean): TypeNode | undefined {
    if (!ignorePrivate && hasEffectiveModifier(node, qt.ModifierFlags.Private)) {
      // Private nodes emit no types (except private parameter properties, whose parameter types are actually visible)
      return;
    }
    if (shouldPrintWithInitializer(node)) {
      // Literal const declarations will have an initializer ensured rather than a type
      return;
    }
    const shouldUseResolverType = node.kind === qt.SyntaxKind.Parameter && (resolver.isRequiredInitializedParameter(node) || resolver.isOptionalUninitializedParameterProperty(node));
    if (type && !shouldUseResolverType) {
      return visitNode(type, visitDeclarationSubtree);
    }
    if (!getParseTreeNode(node)) {
      return type ? visitNode(type, visitDeclarationSubtree) : createKeywordTypeNode(SyntaxKind.AnyKeyword);
    }
    if (node.kind === qt.SyntaxKind.SetAccessor) {
      // Set accessors with no associated type node (from it's param or get accessor return) are `any` since they are never contextually typed right now
      // (The inferred type here will be void, but the old declaration emitter printed `any`, so this replicates that)
      return createKeywordTypeNode(SyntaxKind.AnyKeyword);
    }
    errorNameNode = node.name;
    let oldDiag: typeof getSymbolAccessibilityDiagnostic;
    if (!suppressNewDiagnosticContexts) {
      oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(node);
    }
    if (node.kind === qt.SyntaxKind.VariableDeclaration || node.kind === qt.SyntaxKind.BindingElement) {
      return cleanup(resolver.createTypeOfDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker));
    }
    if (node.kind === qt.SyntaxKind.Parameter || node.kind === qt.SyntaxKind.PropertyDeclaration || node.kind === qt.SyntaxKind.PropertySignature) {
      if (!node.initializer) return cleanup(resolver.createTypeOfDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker, shouldUseResolverType));
      return cleanup(resolver.createTypeOfDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker, shouldUseResolverType) || resolver.createTypeOfExpression(node.initializer, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker));
    }
    return cleanup(resolver.createReturnTypeOfSignatureDeclaration(node, enclosingDeclaration, declarationEmitNodeBuilderFlags, symbolTracker));

    function cleanup(returnValue: TypeNode | undefined) {
      errorNameNode = undefined;
      if (!suppressNewDiagnosticContexts) {
        getSymbolAccessibilityDiagnostic = oldDiag;
      }
      return returnValue || createKeywordTypeNode(SyntaxKind.AnyKeyword);
    }
  }

  function isDeclarationAndNotVisible(node: qt.NamedDeclaration) {
    node = getParseTreeNode(node);
    switch (node.kind) {
      case qt.SyntaxKind.FunctionDeclaration:
      case qt.SyntaxKind.ModuleDeclaration:
      case qt.SyntaxKind.InterfaceDeclaration:
      case qt.SyntaxKind.ClassDeclaration:
      case qt.SyntaxKind.TypeAliasDeclaration:
      case qt.SyntaxKind.EnumDeclaration:
        return !resolver.isDeclarationVisible(node);
      // The following should be doing their own visibility checks based on filtering their members
      case qt.SyntaxKind.VariableDeclaration:
        return !getBindingNameVisible(node);
      case qt.SyntaxKind.ImportEqualsDeclaration:
      case qt.SyntaxKind.ImportDeclaration:
      case qt.SyntaxKind.ExportDeclaration:
      case qt.SyntaxKind.ExportAssignment:
        return false;
    }
    return false;
  }

  function getBindingNameVisible(elem: qt.BindingElement | qt.VariableDeclaration | OmittedExpression): boolean {
    if (isOmittedExpression(elem)) {
      return false;
    }
    if (isBindingPattern(elem.name)) {
      // If any child binding pattern element has been marked visible (usually by collect linked aliases), then this is visible
      return some(elem.name.elements, getBindingNameVisible);
    } else {
      return resolver.isDeclarationVisible(elem);
    }
  }

  function updateParamsList(node: qt.Node, params: qt.NodeArray<qt.ParameterDeclaration>, modifierMask?: qt.ModifierFlags) {
    if (hasEffectiveModifier(node, qt.ModifierFlags.Private)) {
      return undefined!; // TODO: GH#18217
    }
    const newParams = map(params, (p) => ensureParameter(p, modifierMask));
    if (!newParams) {
      return undefined!; // TODO: GH#18217
    }
    return createNodeArray(newParams, params.hasTrailingComma);
  }

  function updateAccessorParamsList(input: AccessorDeclaration, isPrivate: boolean) {
    let newParams: ParameterDeclaration[] | undefined;
    if (!isPrivate) {
      const thisParameter = getThisParameter(input);
      if (thisParameter) {
        newParams = [ensureParameter(thisParameter)];
      }
    }
    if (isSetAccessorDeclaration(input)) {
      let newValueParameter: ParameterDeclaration | undefined;
      if (!isPrivate) {
        const valueParameter = getSetAccessorValueParameter(input);
        if (valueParameter) {
          const accessorType = getTypeAnnotationFromAllAccessorDeclarations(input, resolver.getAllAccessorDeclarations(input));
          newValueParameter = ensureParameter(valueParameter, /*modifierMask*/ undefined, accessorType);
        }
      }
      if (!newValueParameter) {
        newValueParameter = createParameter(/*decorators*/ undefined, /*modifiers*/ undefined, /*dotDotDotToken*/ undefined, 'value');
      }
      newParams = append(newParams, newValueParameter);
    }
    return createNodeArray(newParams || emptyArray);
  }

  function ensureTypeParams(node: qt.Node, params: qt.NodeArray<TypeParameterDeclaration> | undefined) {
    return hasEffectiveModifier(node, qt.ModifierFlags.Private) ? undefined : visitNodes(params, visitDeclarationSubtree);
  }

  function isEnclosingDeclaration(node: qt.Node) {
    return isSourceFile(node) || isTypeAliasDeclaration(node) || isModuleDeclaration(node) || isClassDeclaration(node) || isInterfaceDeclaration(node) || isFunctionLike(node) || isIndexSignatureDeclaration(node) || isMappedTypeNode(node);
  }

  function checkEntityNameVisibility(entityName: EntityNameOrEntityNameExpression, enclosingDeclaration: Node) {
    const visibilityResult = resolver.isEntityNameVisible(entityName, enclosingDeclaration);
    handleSymbolAccessibilityError(visibilityResult);
    recordTypeReferenceDirectivesIfNecessary(resolver.getTypeReferenceDirectivesForEntityName(entityName));
  }

  function preserveJsDoc<T extends Node>(updated: T, original: Node): T {
    if (hasJSDocNodes(updated) && hasJSDocNodes(original)) {
      updated.jsDoc = original.jsDoc;
    }
    return setCommentRange(updated, getCommentRange(original));
  }

  function rewriteModuleSpecifier<T extends Node>(parent: ImportEqualsDeclaration | ImportDeclaration | ExportDeclaration | ModuleDeclaration | qt.ImportTypeNode, input: T | undefined): T | StringLiteral {
    if (!input) return undefined!; // TODO: GH#18217
    resultHasExternalModuleIndicator = resultHasExternalModuleIndicator || (parent.kind !== qt.SyntaxKind.ModuleDeclaration && parent.kind !== qt.SyntaxKind.ImportType);
    if (isStringLiteralLike(input)) {
      if (isBundledEmit) {
        const newName = getExternalModuleNameFromDeclaration(context.getEmitHost(), resolver, parent);
        if (newName) {
          return createLiteral(newName);
        }
      } else {
        const symbol = resolver.getSymbolOfExternalModuleSpecifier(input);
        if (symbol) {
          (exportedModulesFromDeclarationEmit || (exportedModulesFromDeclarationEmit = [])).push(symbol);
        }
      }
    }
    return input;
  }

  function transformImportEqualsDeclaration(decl: ImportEqualsDeclaration) {
    if (!resolver.isDeclarationVisible(decl)) return;
    if (decl.moduleReference.kind === qt.SyntaxKind.ExternalModuleReference) {
      // Rewrite external module names if necessary
      const specifier = getExternalModuleImportEqualsDeclarationExpression(decl);
      return updateImportEqualsDeclaration(decl, /*decorators*/ undefined, decl.modifiers, decl.name, updateExternalModuleReference(decl.moduleReference, rewriteModuleSpecifier(decl, specifier)));
    } else {
      const oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(decl);
      checkEntityNameVisibility(decl.moduleReference, enclosingDeclaration);
      getSymbolAccessibilityDiagnostic = oldDiag;
      return decl;
    }
  }

  function transformImportDeclaration(decl: ImportDeclaration) {
    if (!decl.importClause) {
      // import "mod" - possibly needed for side effects? (global interface patches, module augmentations, etc)
      return updateImportDeclaration(decl, /*decorators*/ undefined, decl.modifiers, decl.importClause, rewriteModuleSpecifier(decl, decl.moduleSpecifier));
    }
    // The `importClause` visibility corresponds to the default's visibility.
    const visibleDefaultBinding = decl.importClause && decl.importClause.name && resolver.isDeclarationVisible(decl.importClause) ? decl.importClause.name : undefined;
    if (!decl.importClause.namedBindings) {
      // No named bindings (either namespace or list), meaning the import is just default or should be elided
      return visibleDefaultBinding && updateImportDeclaration(decl, /*decorators*/ undefined, decl.modifiers, updateImportClause(decl.importClause, visibleDefaultBinding, /*namedBindings*/ undefined, decl.importClause.isTypeOnly), rewriteModuleSpecifier(decl, decl.moduleSpecifier));
    }
    if (decl.importClause.namedBindings.kind === qt.SyntaxKind.NamespaceImport) {
      // Namespace import (optionally with visible default)
      const namedBindings = resolver.isDeclarationVisible(decl.importClause.namedBindings) ? decl.importClause.namedBindings : /*namedBindings*/ undefined;
      return visibleDefaultBinding || namedBindings ? updateImportDeclaration(decl, /*decorators*/ undefined, decl.modifiers, updateImportClause(decl.importClause, visibleDefaultBinding, namedBindings, decl.importClause.isTypeOnly), rewriteModuleSpecifier(decl, decl.moduleSpecifier)) : undefined;
    }
    // Named imports (optionally with visible default)
    const bindingList = mapDefined(decl.importClause.namedBindings.elements, (b) => (resolver.isDeclarationVisible(b) ? b : undefined));
    if ((bindingList && bindingList.length) || visibleDefaultBinding) {
      return updateImportDeclaration(decl, /*decorators*/ undefined, decl.modifiers, updateImportClause(decl.importClause, visibleDefaultBinding, bindingList && bindingList.length ? updateNamedImports(decl.importClause.namedBindings, bindingList) : undefined, decl.importClause.isTypeOnly), rewriteModuleSpecifier(decl, decl.moduleSpecifier));
    }
    // Augmentation of export depends on import
    if (resolver.isImportRequiredByAugmentation(decl)) {
      return updateImportDeclaration(decl, /*decorators*/ undefined, decl.modifiers, /*importClause*/ undefined, rewriteModuleSpecifier(decl, decl.moduleSpecifier));
    }
    // Nothing visible
  }

  function transformAndReplaceLatePaintedStatements(statements: qt.NodeArray<Statement>): qt.NodeArray<Statement> {
    // This is a `while` loop because `handleSymbolAccessibilityError` can see additional import aliases marked as visible during
    // error handling which must now be included in the output and themselves checked for errors.
    // For example:
    // ```
    // module A {
    //   export module Q {}
    //   import B = Q;
    //   import C = B;
    //   export import D = C;
    // }
    // ```
    // In such a scenario, only Q and D are initially visible, but we don't consider imports as private names - instead we say they if they are referenced they must
    // be recorded. So while checking D's visibility we mark C as visible, then we must check C which in turn marks B, completing the chain of
    // dependent imports and allowing a valid declaration file output. Today, this dependent alias marking only happens for internal import aliases.
    while (length(lateMarkedStatements)) {
      const i = lateMarkedStatements!.shift()!;
      if (!qu.isLateVisibilityPaintedStatement(i)) {
        return Debug.fail(`Late replaced statement was found which is not handled by the declaration transformer!: ${(ts as any).SyntaxKind ? (ts as any).SyntaxKind[i.kind] : i.kind}`);
      }
      const priorNeedsDeclare = needsDeclare;
      needsDeclare = i.parent && isSourceFile(i.parent) && !(isExternalModule(i.parent) && isBundledEmit);
      const result = transformTopLevelDeclaration(i);
      needsDeclare = priorNeedsDeclare;
      lateStatementReplacementMap.set('' + getOriginalNodeId(i), result);
    }

    // And lastly, we need to get the final form of all those indetermine import declarations from before and add them to the output list
    // (and remove them from the set to examine for outter declarations)
    return visitNodes(statements, visitLateVisibilityMarkedStatements);

    function visitLateVisibilityMarkedStatements(statement: qt.Statement) {
      if (qu.isLateVisibilityPaintedStatement(statement)) {
        const key = '' + getOriginalNodeId(statement);
        if (lateStatementReplacementMap.has(key)) {
          const result = lateStatementReplacementMap.get(key);
          lateStatementReplacementMap.delete(key);
          if (result) {
            if (isArray(result) ? some(result, needsScopeMarker) : needsScopeMarker(result)) {
              // Top-level declarations in .d.ts files are always considered exported even without a modifier unless there's an export assignment or specifier
              needsScopeFixMarker = true;
            }
            if (isSourceFile(statement.parent) && (isArray(result) ? some(result, isExternalModuleIndicator) : isExternalModuleIndicator(result))) {
              resultHasExternalModuleIndicator = true;
            }
          }
          return result;
        }
      }
      return statement;
    }
  }

  function visitDeclarationSubtree(input: Node): VisitResult<Node> {
    if (shouldStripInternal(input)) return;
    if (isDeclaration(input)) {
      if (isDeclarationAndNotVisible(input)) return;
      if (hasDynamicName(input) && !resolver.isLateBound(getParseTreeNode(input))) {
        return;
      }
    }

    // Elide implementation signatures from overload sets
    if (isFunctionLike(input) && resolver.isImplementationOfOverload(input)) return;

    // Elide semicolon class statements
    if (isSemicolonClassElement(input)) return;

    let previousEnclosingDeclaration: typeof enclosingDeclaration;
    if (isEnclosingDeclaration(input)) {
      previousEnclosingDeclaration = enclosingDeclaration;
      enclosingDeclaration = input as Declaration;
    }
    const oldDiag = getSymbolAccessibilityDiagnostic;

    // Setup diagnostic-related flags before first potential `cleanup` call, otherwise
    // We'd see a TDZ violation at runtime
    const canProduceDiagnostic = canProduceDiagnostics(input);
    const oldWithinObjectLiteralType = suppressNewDiagnosticContexts;
    let shouldEnterSuppressNewDiagnosticsContextContext = (input.kind === qt.SyntaxKind.TypeLiteral || input.kind === qt.SyntaxKind.MappedType) && input.parent.kind !== qt.SyntaxKind.TypeAliasDeclaration;

    // Emit methods which are private as properties with no type information
    if (isMethodDeclaration(input) || isMethodSignature(input)) {
      if (hasEffectiveModifier(input, qt.ModifierFlags.Private)) {
        if (input.symbol && input.symbol.declarations && input.symbol.declarations[0] !== input) return; // Elide all but the first overload
        return cleanup(createProperty(/*decorators*/ undefined, ensureModifiers(input), input.name, /*questionToken*/ undefined, /*type*/ undefined, /*initializer*/ undefined));
      }
    }

    if (canProduceDiagnostic && !suppressNewDiagnosticContexts) {
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(input as DeclarationDiagnosticProducing);
    }

    if (isTypeQueryNode(input)) {
      checkEntityNameVisibility(input.exprName, enclosingDeclaration);
    }

    if (shouldEnterSuppressNewDiagnosticsContextContext) {
      // We stop making new diagnostic contexts within object literal types. Unless it's an object type on the RHS of a type alias declaration. Then we do.
      suppressNewDiagnosticContexts = true;
    }

    if (isProcessedComponent(input)) {
      switch (input.kind) {
        case qt.SyntaxKind.ExpressionWithTypeArguments: {
          if (isEntityName(input.expression) || isEntityNameExpression(input.expression)) {
            checkEntityNameVisibility(input.expression, enclosingDeclaration);
          }
          const node = visitEachChild(input, visitDeclarationSubtree, context);
          return cleanup(updateExpressionWithTypeArguments(node, parenthesizeTypeParameters(node.typeArguments), node.expression));
        }
        case qt.SyntaxKind.TypeReference: {
          checkEntityNameVisibility(input.typeName, enclosingDeclaration);
          const node = visitEachChild(input, visitDeclarationSubtree, context);
          return cleanup(updateTypeReferenceNode(node, node.typeName, parenthesizeTypeParameters(node.typeArguments)));
        }
        case qt.SyntaxKind.ConstructSignature:
          return cleanup(updateConstructSignature(input, ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters), ensureType(input, input.type)));
        case qt.SyntaxKind.Constructor: {
          // A constructor declaration may not have a type annotation
          const ctor = createSignatureDeclaration(qt.SyntaxKind.Constructor, ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters, qt.ModifierFlags.None), /*type*/ undefined);
          ctor.modifiers = createNodeArray(ensureModifiers(input));
          return cleanup(ctor);
        }
        case qt.SyntaxKind.MethodDeclaration: {
          if (isPrivateIdentifier(input.name)) {
            return cleanup(/*returnValue*/ undefined);
          }
          const sig = createSignatureDeclaration(SyntaxKind.MethodSignature, ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters), ensureType(input, input.type));
          sig.name = input.name;
          sig.modifiers = createNodeArray(ensureModifiers(input));
          sig.questionToken = input.questionToken;
          return cleanup(sig);
        }
        case qt.SyntaxKind.GetAccessor: {
          if (isPrivateIdentifier(input.name)) {
            return cleanup(/*returnValue*/ undefined);
          }
          const accessorType = getTypeAnnotationFromAllAccessorDeclarations(input, resolver.getAllAccessorDeclarations(input));
          return cleanup(updateGetAccessor(input, /*decorators*/ undefined, ensureModifiers(input), input.name, updateAccessorParamsList(input, hasEffectiveModifier(input, qt.ModifierFlags.Private)), ensureType(input, accessorType), /*body*/ undefined));
        }
        case qt.SyntaxKind.SetAccessor: {
          if (isPrivateIdentifier(input.name)) {
            return cleanup(/*returnValue*/ undefined);
          }
          return cleanup(updateSetAccessor(input, /*decorators*/ undefined, ensureModifiers(input), input.name, updateAccessorParamsList(input, hasEffectiveModifier(input, qt.ModifierFlags.Private)), /*body*/ undefined));
        }
        case qt.SyntaxKind.PropertyDeclaration:
          if (isPrivateIdentifier(input.name)) {
            return cleanup(/*returnValue*/ undefined);
          }
          return cleanup(updateProperty(input, /*decorators*/ undefined, ensureModifiers(input), input.name, input.questionToken, ensureType(input, input.type), ensureNoInitializer(input)));
        case qt.SyntaxKind.PropertySignature:
          if (isPrivateIdentifier(input.name)) {
            return cleanup(/*returnValue*/ undefined);
          }
          return cleanup(updatePropertySignature(input, ensureModifiers(input), input.name, input.questionToken, ensureType(input, input.type), ensureNoInitializer(input)));
        case qt.SyntaxKind.MethodSignature: {
          if (isPrivateIdentifier(input.name)) {
            return cleanup(/*returnValue*/ undefined);
          }
          return cleanup(updateMethodSignature(input, ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters), ensureType(input, input.type), input.name, input.questionToken));
        }
        case qt.SyntaxKind.CallSignature: {
          return cleanup(updateCallSignature(input, ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters), ensureType(input, input.type)));
        }
        case qt.SyntaxKind.IndexSignature: {
          return cleanup(updateIndexSignature(input, /*decorators*/ undefined, ensureModifiers(input), updateParamsList(input, input.parameters), visitNode(input.type, visitDeclarationSubtree) || createKeywordTypeNode(SyntaxKind.AnyKeyword)));
        }
        case qt.SyntaxKind.VariableDeclaration: {
          if (isBindingPattern(input.name)) {
            return recreateBindingPattern(input.name);
          }
          shouldEnterSuppressNewDiagnosticsContextContext = true;
          suppressNewDiagnosticContexts = true; // Variable declaration types also suppress new diagnostic contexts, provided the contexts wouldn't be made for binding pattern types
          return cleanup(updateTypeScriptVariableDeclaration(input, input.name, /*exclaimationToken*/ undefined, ensureType(input, input.type), ensureNoInitializer(input)));
        }
        case qt.SyntaxKind.TypeParameter: {
          if (isPrivateMethodTypeParameter(input) && (input.default || input.constraint)) {
            return cleanup(updateTypeParameterDeclaration(input, input.name, /*constraint*/ undefined, /*defaultType*/ undefined));
          }
          return cleanup(visitEachChild(input, visitDeclarationSubtree, context));
        }
        case qt.SyntaxKind.ConditionalType: {
          // We have to process conditional types in a special way because for visibility purposes we need to push a new enclosingDeclaration
          // just for the `infer` types in the true branch. It's an implicit declaration scope that only applies to _part_ of the type.
          const checkType = visitNode(input.checkType, visitDeclarationSubtree);
          const extendsType = visitNode(input.extendsType, visitDeclarationSubtree);
          const oldEnclosingDecl = enclosingDeclaration;
          enclosingDeclaration = input.trueType;
          const trueType = visitNode(input.trueType, visitDeclarationSubtree);
          enclosingDeclaration = oldEnclosingDecl;
          const falseType = visitNode(input.falseType, visitDeclarationSubtree);
          return cleanup(updateConditionalTypeNode(input, checkType, extendsType, trueType, falseType));
        }
        case qt.SyntaxKind.FunctionType: {
          return cleanup(updateFunctionTypeNode(input, visitNodes(input.typeParameters, visitDeclarationSubtree), updateParamsList(input, input.parameters), visitNode(input.type, visitDeclarationSubtree)));
        }
        case qt.SyntaxKind.ConstructorType: {
          return cleanup(updateConstructorTypeNode(input, visitNodes(input.typeParameters, visitDeclarationSubtree), updateParamsList(input, input.parameters), visitNode(input.type, visitDeclarationSubtree)));
        }
        case qt.SyntaxKind.ImportType: {
          if (!qu.isLiteralImportTypeNode(input)) return cleanup(input);
          return cleanup(updateImportTypeNode(input, updateLiteralTypeNode(input.argument, rewriteModuleSpecifier(input, input.argument.literal)), input.qualifier, visitNodes(input.typeArguments, visitDeclarationSubtree, isTypeNode), input.isTypeOf));
        }
        default:
          Debug.assertNever(input, `Attempted to process unhandled node kind: ${(ts as any).SyntaxKind[(input as any).kind]}`);
      }
    }

    if (isTupleTypeNode(input) && qs.getLineAndCharacterOfPosition(currentSourceFile, input.pos).line === qs.getLineAndCharacterOfPosition(currentSourceFile, input.end).line) {
      setEmitFlags(input, qt.EmitFlags.SingleLine);
    }

    return cleanup(visitEachChild(input, visitDeclarationSubtree, context));

    function cleanup<T extends Node>(returnValue: T | undefined): T | undefined {
      if (returnValue && canProduceDiagnostic && hasDynamicName(input as Declaration)) {
        checkName(input as DeclarationDiagnosticProducing);
      }
      if (isEnclosingDeclaration(input)) {
        enclosingDeclaration = previousEnclosingDeclaration;
      }
      if (canProduceDiagnostic && !suppressNewDiagnosticContexts) {
        getSymbolAccessibilityDiagnostic = oldDiag;
      }
      if (shouldEnterSuppressNewDiagnosticsContextContext) {
        suppressNewDiagnosticContexts = oldWithinObjectLiteralType;
      }
      if (returnValue === input) {
        return returnValue;
      }
      return returnValue && setOriginalNode(preserveJsDoc(returnValue, input), input);
    }
  }

  function isPrivateMethodTypeParameter(node: TypeParameterDeclaration) {
    return node.parent.kind === qt.SyntaxKind.MethodDeclaration && hasEffectiveModifier(node.parent, qt.ModifierFlags.Private);
  }

  function visitDeclarationStatements(input: Node): VisitResult<Node> {
    if (!isPreservedDeclarationStatement(input)) {
      // return undefined for unmatched kinds to omit them from the tree
      return;
    }
    if (shouldStripInternal(input)) return;

    switch (input.kind) {
      case qt.SyntaxKind.ExportDeclaration: {
        if (isSourceFile(input.parent)) {
          resultHasExternalModuleIndicator = true;
        }
        resultHasScopeMarker = true;
        // Always visible if the parent node isn't dropped for being not visible
        // Rewrite external module names if necessary
        return updateExportDeclaration(input, /*decorators*/ undefined, input.modifiers, input.exportClause, rewriteModuleSpecifier(input, input.moduleSpecifier), input.isTypeOnly);
      }
      case qt.SyntaxKind.ExportAssignment: {
        // Always visible if the parent node isn't dropped for being not visible
        if (isSourceFile(input.parent)) {
          resultHasExternalModuleIndicator = true;
        }
        resultHasScopeMarker = true;
        if (input.expression.kind === qt.SyntaxKind.Identifier) {
          return input;
        } else {
          const newId = createOptimisticUniqueName('_default');
          getSymbolAccessibilityDiagnostic = () => ({
            diagnosticMessage: Diagnostics.Default_export_of_the_module_has_or_is_using_private_name_0,
            errorNode: input,
          });
          const varDecl = createVariableDeclaration(newId, resolver.createTypeOfExpression(input.expression, input, declarationEmitNodeBuilderFlags, symbolTracker), /*initializer*/ undefined);
          const statement = createVariableStatement(needsDeclare ? [createModifier(SyntaxKind.DeclareKeyword)] : [], createVariableDeclarationList([varDecl], NodeFlags.Const));
          return [statement, updateExportAssignment(input, input.decorators, input.modifiers, newId)];
        }
      }
    }

    const result = transformTopLevelDeclaration(input);
    // Don't actually transform yet; just leave as original node - will be elided/swapped by late pass
    lateStatementReplacementMap.set('' + getOriginalNodeId(input), result);
    return input;
  }

  function stripExportModifiers(statement: qt.Statement): qt.Statement {
    if (isImportEqualsDeclaration(statement) || hasEffectiveModifier(statement, qt.ModifierFlags.Default)) {
      // `export import` statements should remain as-is, as imports are _not_ implicitly exported in an ambient namespace
      // Likewise, `export default` classes and the like and just be `default`, so we preserve their `export` modifiers, too
      return statement;
    }
    const clone = getMutableClone(statement);
    const modifiers = createModifiersFromModifierFlags(getEffectiveModifierFlags(statement) & (ModifierFlags.All ^ qt.ModifierFlags.Export));
    clone.modifiers = modifiers.length ? createNodeArray(modifiers) : undefined;
    return clone;
  }

  function transformTopLevelDeclaration(input: LateVisibilityPaintedStatement) {
    if (shouldStripInternal(input)) return;
    switch (input.kind) {
      case qt.SyntaxKind.ImportEqualsDeclaration: {
        return transformImportEqualsDeclaration(input);
      }
      case qt.SyntaxKind.ImportDeclaration: {
        return transformImportDeclaration(input);
      }
    }
    if (isDeclaration(input) && isDeclarationAndNotVisible(input)) return;

    // Elide implementation signatures from overload sets
    if (isFunctionLike(input) && resolver.isImplementationOfOverload(input)) return;

    let previousEnclosingDeclaration: typeof enclosingDeclaration;
    if (isEnclosingDeclaration(input)) {
      previousEnclosingDeclaration = enclosingDeclaration;
      enclosingDeclaration = input;
    }

    const canProdiceDiagnostic = canProduceDiagnostics(input);
    const oldDiag = getSymbolAccessibilityDiagnostic;
    if (canProdiceDiagnostic) {
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(input);
    }

    const previousNeedsDeclare = needsDeclare;
    switch (input.kind) {
      case qt.SyntaxKind.TypeAliasDeclaration: // Type aliases get `declare`d if need be (for legacy support), but that's all
        return cleanup(updateTypeAliasDeclaration(input, /*decorators*/ undefined, ensureModifiers(input), input.name, visitNodes(input.typeParameters, visitDeclarationSubtree, isTypeParameterDeclaration), visitNode(input.type, visitDeclarationSubtree, isTypeNode)));
      case qt.SyntaxKind.InterfaceDeclaration: {
        return cleanup(updateInterfaceDeclaration(input, /*decorators*/ undefined, ensureModifiers(input), input.name, ensureTypeParams(input, input.typeParameters), transformHeritageClauses(input.heritageClauses), visitNodes(input.members, visitDeclarationSubtree)));
      }
      case qt.SyntaxKind.FunctionDeclaration: {
        // Generators lose their generator-ness, excepting their return type
        const clean = cleanup(updateFunctionDeclaration(input, /*decorators*/ undefined, ensureModifiers(input), /*asteriskToken*/ undefined, input.name, ensureTypeParams(input, input.typeParameters), updateParamsList(input, input.parameters), ensureType(input, input.type), /*body*/ undefined));
        if (clean && resolver.isExpandoFunctionDeclaration(input)) {
          const props = resolver.getPropertiesOfContainerFunction(input);
          const fakespace = createModuleDeclaration(/*decorators*/ undefined, /*modifiers*/ undefined, clean.name || createIdentifier('_default'), createModuleBlock([]), NodeFlags.Namespace);
          fakespace.flags ^= NodeFlags.Synthesized; // unset synthesized so it is usable as an enclosing declaration
          fakespace.parent = enclosingDeclaration as SourceFile | NamespaceDeclaration;
          fakespace.locals = qu.createSymbolTable(props);
          fakespace.symbol = props[0].parent!;
          const declarations = mapDefined(props, (p) => {
            if (!isPropertyAccessExpression(p.valueDeclaration)) {
              return undefined; // TODO GH#33569: Handle element access expressions that created late bound names (rather than silently omitting them)
            }
            getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(p.valueDeclaration);
            const type = resolver.createTypeOfDeclaration(p.valueDeclaration, fakespace, declarationEmitNodeBuilderFlags, symbolTracker);
            getSymbolAccessibilityDiagnostic = oldDiag;
            const varDecl = createVariableDeclaration(unescapeLeadingUnderscores(p.escapedName), type, /*initializer*/ undefined);
            return createVariableStatement(/*modifiers*/ undefined, createVariableDeclarationList([varDecl]));
          });
          const namespaceDecl = createModuleDeclaration(/*decorators*/ undefined, ensureModifiers(input), input.name!, createModuleBlock(declarations), NodeFlags.Namespace);

          if (!hasEffectiveModifier(clean, qt.ModifierFlags.Default)) {
            return [clean, namespaceDecl];
          }

          const modifiers = createModifiersFromModifierFlags((getEffectiveModifierFlags(clean) & ~ModifierFlags.ExportDefault) | qt.ModifierFlags.Ambient);
          const cleanDeclaration = updateFunctionDeclaration(clean, /*decorators*/ undefined, modifiers, /*asteriskToken*/ undefined, clean.name, clean.typeParameters, clean.parameters, clean.type, /*body*/ undefined);

          const namespaceDeclaration = updateModuleDeclaration(namespaceDecl, /*decorators*/ undefined, modifiers, namespaceDecl.name, namespaceDecl.body);

          const exportDefaultDeclaration = createExportAssignment(/*decorators*/ undefined, /*modifiers*/ undefined, /*isExportEquals*/ false, namespaceDecl.name);

          if (isSourceFile(input.parent)) {
            resultHasExternalModuleIndicator = true;
          }
          resultHasScopeMarker = true;

          return [cleanDeclaration, namespaceDeclaration, exportDefaultDeclaration];
        } else {
          return clean;
        }
      }
      case qt.SyntaxKind.ModuleDeclaration: {
        needsDeclare = false;
        const inner = input.body;
        if (inner && inner.kind === qt.SyntaxKind.ModuleBlock) {
          const oldNeedsScopeFix = needsScopeFixMarker;
          const oldHasScopeFix = resultHasScopeMarker;
          resultHasScopeMarker = false;
          needsScopeFixMarker = false;
          const statements = visitNodes(inner.statements, visitDeclarationStatements);
          let lateStatements = transformAndReplaceLatePaintedStatements(statements);
          if (input.flags & NodeFlags.Ambient) {
            needsScopeFixMarker = false; // If it was `declare`'d everything is implicitly exported already, ignore late printed "privates"
          }
          // With the final list of statements, there are 3 possibilities:
          // 1. There's an export assignment or export declaration in the namespace - do nothing
          // 2. Everything is exported and there are no export assignments or export declarations - strip all export modifiers
          // 3. Some things are exported, some are not, and there's no marker - add an empty marker
          if (!qu.isGlobalScopeAugmentation(input) && !hasScopeMarker(lateStatements) && !resultHasScopeMarker) {
            if (needsScopeFixMarker) {
              lateStatements = createNodeArray([...lateStatements, createEmptyExports()]);
            } else {
              lateStatements = visitNodes(lateStatements, stripExportModifiers);
            }
          }
          const body = updateModuleBlock(inner, lateStatements);
          needsDeclare = previousNeedsDeclare;
          needsScopeFixMarker = oldNeedsScopeFix;
          resultHasScopeMarker = oldHasScopeFix;
          const mods = ensureModifiers(input);
          return cleanup(updateModuleDeclaration(input, /*decorators*/ undefined, mods, qu.isExternalModuleAugmentation(input) ? rewriteModuleSpecifier(input, input.name) : input.name, body));
        } else {
          needsDeclare = previousNeedsDeclare;
          const mods = ensureModifiers(input);
          needsDeclare = false;
          visitNode(inner, visitDeclarationStatements);
          // eagerly transform nested namespaces (the nesting doesn't need any elision or painting done)
          const id = '' + getOriginalNodeId(inner); // TODO: GH#18217
          const body = lateStatementReplacementMap.get(id);
          lateStatementReplacementMap.delete(id);
          return cleanup(updateModuleDeclaration(input, /*decorators*/ undefined, mods, input.name, body));
        }
      }
      case qt.SyntaxKind.ClassDeclaration: {
        const modifiers = createNodeArray(ensureModifiers(input));
        const typeParameters = ensureTypeParams(input, input.typeParameters);
        const ctor = getFirstConstructorWithBody(input);
        let parameterProperties: readonly PropertyDeclaration[] | undefined;
        if (ctor) {
          const oldDiag = getSymbolAccessibilityDiagnostic;
          parameterProperties = compact(
            flatMap(ctor.parameters, (param) => {
              if (!hasSyntacticModifier(param, qt.ModifierFlags.ParameterPropertyModifier) || shouldStripInternal(param)) return;
              getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(param);
              if (param.name.kind === qt.SyntaxKind.Identifier) {
                return preserveJsDoc(createProperty(/*decorators*/ undefined, ensureModifiers(param), param.name, param.questionToken, ensureType(param, param.type), ensureNoInitializer(param)), param);
              } else {
                // qc.Pattern - this is currently an error, but we emit declarations for it somewhat correctly
                return walkBindingPattern(param.name);
              }

              function walkBindingPattern(pattern: qt.BindingPattern) {
                let elems: PropertyDeclaration[] | undefined;
                for (const elem of pattern.elements) {
                  if (isOmittedExpression(elem)) continue;
                  if (isBindingPattern(elem.name)) {
                    elems = concatenate(elems, walkBindingPattern(elem.name));
                  }
                  elems = elems || [];
                  elems.push(createProperty(/*decorators*/ undefined, ensureModifiers(param), elem.name, /*questionToken*/ undefined, ensureType(elem, /*type*/ undefined), /*initializer*/ undefined));
                }
                return elems;
              }
            })
          );
          getSymbolAccessibilityDiagnostic = oldDiag;
        }

        const hasPrivateIdentifier = some(input.members, (member) => !!member.name && isPrivateIdentifier(member.name));
        const privateIdentifier = hasPrivateIdentifier ? [createProperty(/*decorators*/ undefined, /*modifiers*/ undefined, createPrivateIdentifier('#private'), /*questionToken*/ undefined, /*type*/ undefined, /*initializer*/ undefined)] : undefined;
        const memberNodes = concatenate(concatenate(privateIdentifier, parameterProperties), visitNodes(input.members, visitDeclarationSubtree));
        const members = createNodeArray(memberNodes);

        const extendsClause = getEffectiveBaseTypeNode(input);
        if (extendsClause && !isEntityNameExpression(extendsClause.expression) && extendsClause.expression.kind !== qt.SyntaxKind.NullKeyword) {
          // We must add a temporary declaration for the extends clause expression

          const oldId = input.name ? unescapeLeadingUnderscores(input.name.escapedText) : 'default';
          const newId = createOptimisticUniqueName(`${oldId}_base`);
          getSymbolAccessibilityDiagnostic = () => ({
            diagnosticMessage: Diagnostics.extends_clause_of_exported_class_0_has_or_is_using_private_name_1,
            errorNode: extendsClause,
            typeName: input.name,
          });
          const varDecl = createVariableDeclaration(newId, resolver.createTypeOfExpression(extendsClause.expression, input, declarationEmitNodeBuilderFlags, symbolTracker), /*initializer*/ undefined);
          const statement = createVariableStatement(needsDeclare ? [createModifier(SyntaxKind.DeclareKeyword)] : [], createVariableDeclarationList([varDecl], NodeFlags.Const));
          const heritageClauses = createNodeArray(
            map(input.heritageClauses, (clause) => {
              if (clause.token === qt.SyntaxKind.ExtendsKeyword) {
                const oldDiag = getSymbolAccessibilityDiagnostic;
                getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(clause.types[0]);
                const newClause = updateHeritageClause(
                  clause,
                  map(clause.types, (t) => updateExpressionWithTypeArguments(t, visitNodes(t.typeArguments, visitDeclarationSubtree), newId))
                );
                getSymbolAccessibilityDiagnostic = oldDiag;
                return newClause;
              }
              return updateHeritageClause(clause, visitNodes(createNodeArray(filter(clause.types, (t) => isEntityNameExpression(t.expression) || t.expression.kind === qt.SyntaxKind.NullKeyword)), visitDeclarationSubtree));
            })
          );
          return [statement, cleanup(updateClassDeclaration(input, /*decorators*/ undefined, modifiers, input.name, typeParameters, heritageClauses, members))!]; // TODO: GH#18217
        } else {
          const heritageClauses = transformHeritageClauses(input.heritageClauses);
          return cleanup(updateClassDeclaration(input, /*decorators*/ undefined, modifiers, input.name, typeParameters, heritageClauses, members));
        }
      }
      case qt.SyntaxKind.VariableStatement: {
        return cleanup(transformVariableStatement(input));
      }
      case qt.SyntaxKind.EnumDeclaration: {
        return cleanup(
          updateEnumDeclaration(
            input,
            /*decorators*/ undefined,
            createNodeArray(ensureModifiers(input)),
            input.name,
            createNodeArray(
              mapDefined(input.members, (m) => {
                if (shouldStripInternal(m)) return;
                // Rewrite enum values to their constants, if available
                const constValue = resolver.getConstantValue(m);
                return preserveJsDoc(updateEnumMember(m, m.name, constValue !== undefined ? createLiteral(constValue) : undefined), m);
              })
            )
          )
        );
      }
    }
    // Anything left unhandled is an error, so this should be unreachable
    return Debug.assertNever(input, `Unhandled top-level node in declaration emit: ${(ts as any).SyntaxKind[(input as any).kind]}`);

    function cleanup<T extends Node>(node: T | undefined): T | undefined {
      if (isEnclosingDeclaration(input)) {
        enclosingDeclaration = previousEnclosingDeclaration;
      }
      if (canProdiceDiagnostic) {
        getSymbolAccessibilityDiagnostic = oldDiag;
      }
      if (input.kind === qt.SyntaxKind.ModuleDeclaration) {
        needsDeclare = previousNeedsDeclare;
      }
      if ((node as Node) === input) {
        return node;
      }
      return node && setOriginalNode(preserveJsDoc(node, input), input);
    }
  }

  function transformVariableStatement(input: VariableStatement) {
    if (!forEach(input.declarationList.declarations, getBindingNameVisible)) return;
    const nodes = visitNodes(input.declarationList.declarations, visitDeclarationSubtree);
    if (!length(nodes)) return;
    return updateVariableStatement(input, createNodeArray(ensureModifiers(input)), updateVariableDeclarationList(input.declarationList, nodes));
  }

  function recreateBindingPattern(d: qt.BindingPattern): qt.VariableDeclaration[] {
    return flatten<VariableDeclaration>(mapDefined(d.elements, (e) => recreateBindingElement(e)));
  }

  function recreateBindingElement(e: ArrayBindingElement) {
    if (e.kind === qt.SyntaxKind.OmittedExpression) {
      return;
    }
    if (e.name) {
      if (!getBindingNameVisible(e)) return;
      if (isBindingPattern(e.name)) {
        return recreateBindingPattern(e.name);
      } else {
        return createVariableDeclaration(e.name, ensureType(e, /*type*/ undefined), /*initializer*/ undefined);
      }
    }
  }

  function checkName(node: DeclarationDiagnosticProducing) {
    let oldDiag: typeof getSymbolAccessibilityDiagnostic | undefined;
    if (!suppressNewDiagnosticContexts) {
      oldDiag = getSymbolAccessibilityDiagnostic;
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNodeName(node);
    }
    errorNameNode = node.name;
    Debug.assert(resolver.isLateBound(getParseTreeNode(node))); // Should only be called with dynamic names
    const decl = node;
    const entityName = decl.name.expression;
    checkEntityNameVisibility(entityName, enclosingDeclaration);
    if (!suppressNewDiagnosticContexts) {
      getSymbolAccessibilityDiagnostic = oldDiag!;
    }
    errorNameNode = undefined;
  }

  function shouldStripInternal(node: qt.Node) {
    return !!stripInternal && !!node && isInternalDeclaration(node, currentSourceFile);
  }

  function isScopeMarker(node: qt.Node) {
    return isExportAssignment(node) || isExportDeclaration(node);
  }

  function hasScopeMarker(statements: readonly qt.Statement[]) {
    return some(statements, isScopeMarker);
  }

  function ensureModifiers(node: qt.Node): readonly Modifier[] | undefined {
    const currentFlags = qu.getEffectiveModifierFlags(node);
    const newFlags = ensureModifierFlags(node);
    if (currentFlags === newFlags) {
      return node.modifiers;
    }
    return createModifiersFromModifierFlags(newFlags);
  }

  function ensureModifierFlags(node: qt.Node): qt.ModifierFlags {
    let mask = qt.ModifierFlags.All ^ (ModifierFlags.Public | qt.ModifierFlags.Async); // No async modifiers in declaration files
    let additions = needsDeclare && !isAlwaysType(node) ? qt.ModifierFlags.Ambient : qt.ModifierFlags.None;
    const parentIsFile = node.parent.kind === qt.SyntaxKind.SourceFile;
    if (!parentIsFile || (isBundledEmit && parentIsFile && isExternalModule(node.parent))) {
      mask ^= qt.ModifierFlags.Ambient;
      additions = qt.ModifierFlags.None;
    }
    return maskModifierFlags(node, mask, additions);
  }

  function getTypeAnnotationFromAllAccessorDeclarations(node: AccessorDeclaration, accessors: AllAccessorDeclarations) {
    let accessorType = getTypeAnnotationFromAccessor(node);
    if (!accessorType && node !== accessors.firstAccessor) {
      accessorType = getTypeAnnotationFromAccessor(accessors.firstAccessor);
      // If we end up pulling the type from the second accessor, we also need to change the diagnostic context to get the expected error message
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(accessors.firstAccessor);
    }
    if (!accessorType && accessors.secondAccessor && node !== accessors.secondAccessor) {
      accessorType = getTypeAnnotationFromAccessor(accessors.secondAccessor);
      // If we end up pulling the type from the second accessor, we also need to change the diagnostic context to get the expected error message
      getSymbolAccessibilityDiagnostic = createGetSymbolAccessibilityDiagnosticForNode(accessors.secondAccessor);
    }
    return accessorType;
  }

  function transformHeritageClauses(nodes: qt.NodeArray<HeritageClause> | undefined) {
    return createNodeArray(
      filter(
        map(nodes, (clause) =>
          updateHeritageClause(
            clause,
            visitNodes(
              createNodeArray(
                filter(clause.types, (t) => {
                  return isEntityNameExpression(t.expression) || (clause.token === qt.SyntaxKind.ExtendsKeyword && t.expression.kind === qt.SyntaxKind.NullKeyword);
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

function isAlwaysType(node: qt.Node) {
  if (node.kind === qt.SyntaxKind.InterfaceDeclaration) {
    return true;
  }
  return false;
}

// Elide "public" modifier, as it is the default
function maskModifiers(node: qt.Node, modifierMask?: qt.ModifierFlags, modifierAdditions?: qt.ModifierFlags): Modifier[] {
  return createModifiersFromModifierFlags(maskModifierFlags(node, modifierMask, modifierAdditions));
}

function maskModifierFlags(node: qt.Node, modifierMask: qt.ModifierFlags = qt.ModifierFlags.All ^ qt.ModifierFlags.Public, modifierAdditions: qt.ModifierFlags = qt.ModifierFlags.None): qt.ModifierFlags {
  let flags = (getEffectiveModifierFlags(node) & modifierMask) | modifierAdditions;
  if (flags & qt.ModifierFlags.Default && !(flags & qt.ModifierFlags.Export)) {
    // A non-exported default is a nonsequitor - we usually try to remove all export modifiers
    // from statements in ambient declarations; but a default export must retain its export modifier to be syntactically valid
    flags ^= qt.ModifierFlags.Export;
  }
  if (flags & qt.ModifierFlags.Default && flags & qt.ModifierFlags.Ambient) {
    flags ^= qt.ModifierFlags.Ambient; // `declare` is never required alongside `default` (and would be an error if printed)
  }
  return flags;
}

function getTypeAnnotationFromAccessor(accessor: AccessorDeclaration): TypeNode | undefined {
  if (accessor) {
    return accessor.kind === qt.SyntaxKind.GetAccessor
      ? accessor.type // Getter - return type
      : accessor.parameters.length > 0
      ? accessor.parameters[0].type // Setter parameter type
      : undefined;
  }
}

type CanHaveLiteralInitializer = qt.VariableDeclaration | PropertyDeclaration | PropertySignature | ParameterDeclaration;
function canHaveLiteralInitializer(node: qt.Node): boolean {
  switch (node.kind) {
    case qt.SyntaxKind.PropertyDeclaration:
    case qt.SyntaxKind.PropertySignature:
      return !hasEffectiveModifier(node, qt.ModifierFlags.Private);
    case qt.SyntaxKind.Parameter:
    case qt.SyntaxKind.VariableDeclaration:
      return true;
  }
  return false;
}

type ProcessedDeclarationStatement = FunctionDeclaration | ModuleDeclaration | ImportEqualsDeclaration | InterfaceDeclaration | ClassDeclaration | TypeAliasDeclaration | qt.EnumDeclaration | VariableStatement | ImportDeclaration | ExportDeclaration | qt.ExportAssignment;

function isPreservedDeclarationStatement(node: qt.Node): node is ProcessedDeclarationStatement {
  switch (node.kind) {
    case qt.SyntaxKind.FunctionDeclaration:
    case qt.SyntaxKind.ModuleDeclaration:
    case qt.SyntaxKind.ImportEqualsDeclaration:
    case qt.SyntaxKind.InterfaceDeclaration:
    case qt.SyntaxKind.ClassDeclaration:
    case qt.SyntaxKind.TypeAliasDeclaration:
    case qt.SyntaxKind.EnumDeclaration:
    case qt.SyntaxKind.VariableStatement:
    case qt.SyntaxKind.ImportDeclaration:
    case qt.SyntaxKind.ExportDeclaration:
    case qt.SyntaxKind.ExportAssignment:
      return true;
  }
  return false;
}

type ProcessedComponent = ConstructSignatureDeclaration | qt.ConstructorDeclaration | MethodDeclaration | GetAccessorDeclaration | SetAccessorDeclaration | PropertyDeclaration | PropertySignature | MethodSignature | CallSignatureDeclaration | IndexSignatureDeclaration | qt.VariableDeclaration | TypeParameterDeclaration | qt.ExpressionWithTypeArguments | TypeReferenceNode | ConditionalTypeNode | FunctionTypeNode | ConstructorTypeNode | qt.ImportTypeNode;

function isProcessedComponent(node: qt.Node): node is ProcessedComponent {
  switch (node.kind) {
    case qt.SyntaxKind.ConstructSignature:
    case qt.SyntaxKind.Constructor:
    case qt.SyntaxKind.MethodDeclaration:
    case qt.SyntaxKind.GetAccessor:
    case qt.SyntaxKind.SetAccessor:
    case qt.SyntaxKind.PropertyDeclaration:
    case qt.SyntaxKind.PropertySignature:
    case qt.SyntaxKind.MethodSignature:
    case qt.SyntaxKind.CallSignature:
    case qt.SyntaxKind.IndexSignature:
    case qt.SyntaxKind.VariableDeclaration:
    case qt.SyntaxKind.TypeParameter:
    case qt.SyntaxKind.ExpressionWithTypeArguments:
    case qt.SyntaxKind.TypeReference:
    case qt.SyntaxKind.ConditionalType:
    case qt.SyntaxKind.FunctionType:
    case qt.SyntaxKind.ConstructorType:
    case qt.SyntaxKind.ImportType:
      return true;
  }
  return false;
}
