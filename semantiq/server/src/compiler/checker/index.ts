import { ModifierFlags, Node, ObjectFlags, SymbolFlags, TypeFlags } from './types';
import { newCheck, Fcheck } from './check';
import { newCreate, Fcreate, newInstantiate, Finstantiate, newResolve, Fresolve } from './create';
import { newGet, Fget } from './get';
import { newHas, Fhas, newIs, Fis } from './groups';
import { Syntax } from '../syntax';
import * as qc from '../core';
import * as qd from '../diags';
import * as qt from './types';
import * as qu from '../utils';
import * as qy from '../syntax';
export class TypeChecker implements Frame {
  host: qt.TypeCheckerHost;
  typeCount: number;
  totalInstantiationCount: number;
  mergedSymbols: qt.Symbol[];
  check: Fcheck;
  create: Fcreate;
  get: Fget;
  has: Fhas;
  instantiate: Finstantiate;
  is: Fis;
  resolve: Fresolve;
}
const ambientModuleSymbolRegex = /^".+"$/;
const anon = '(anonymous)' as qu.__String & string;

function SymbolLinks(this: qt.SymbolLinks) {}
export function isInstantiatedModule(node: qt.ModuleDeclaration, preserveConstEnums: boolean) {
  const moduleState = getModuleInstanceState(node);
  return moduleState === ModuleInstanceState.Instantiated || (preserveConstEnums && moduleState === ModuleInstanceState.ConstEnumOnly);
}
interface DuplicateInfoForSymbol {
  readonly firstFileLocations: qt.Declaration[];
  readonly secondFileLocations: qt.Declaration[];
  readonly isBlockScoped: boolean;
}
interface DuplicateInfoForFiles {
  readonly firstFile: qt.SourceFile;
  readonly secondFile: qt.SourceFile;
  readonly conflictingSymbols: qu.QMap<DuplicateInfoForSymbol>;
}
export function create(host: qt.TypeCheckerHost, produceDiagnostics: boolean): qt.TypeChecker {
  const getPackagesSet: () => qu.QMap<true> = qu.memoize(() => {
    const set = new qu.QMap<true>();
    host.getSourceFiles().forEach((sf) => {
      if (!sf.resolvedModules) return;
      forEachEntry(sf.resolvedModules, (r) => {
        if (r && r.packageId) set.set(r.packageId.name, true);
      });
    });
    return set;
  });
  class QNode extends qc.Nobj {
    isGlobalSourceFile() {
      return this.kind === Syntax.SourceFile && !is.externalOrCommonJsModule(this as xSourceFile);
    }
  }
  class QType extends qc.Type {
    static typeCount = 0;
    createType(flags: qt.TypeFlags): qt.Type {
      const result = new qc.Type(checker, flags);
      QType.typeCount++;
      result.id = QType.typeCount;
      return result;
    }
  }
  const checker = new class implements qt.TypeChecker {
    getRelationCacheSizes() { return {
      assignable: assignableRelation.size,
      identity: identityRelation.size,
      subtype: subtypeRelation.size,
      strictSubtype: strictSubtypeRelation.size,
    };}
    isUndefinedSymbol(s) { return s === undefinedSymbol; }
    isArgsSymbol(s) { return s === argsSymbol; }
    isUnknownSymbol(s) { return s === unknownSymbol; }
    getDiagnostics;
    getGlobalDiagnostics;
    typeOfSymbolAtLocation(s, l) {
      location = qf.get.parseTreeOf(l);
      return location ? typeOfSymbolAtLocation(s, l) : errorType;
    }
    getSymbolsOfParamPropertyDeclaration(paramIn, paramName) {
      const param = qf.get.parseTreeOf(paramIn, isParam);
      if (param === undefined) return qu.fail('Cannot get symbols of a synthetic param that cannot be resolved to a parse-tree node.');
      return getSymbolsOfParamPropertyDeclaration(param, qy.get.escUnderscores(paramName));
    }
    getDeclaredTypeOfSymbol,
    propertyOfType(type, name) { return qf.get.propertyOfType(type, qy.get.escUnderscores(name)); }
    getPrivateIdentifierPropertyOfType(leftType: qt.Type, name: string, location: Node) {
      const node = qf.get.parseTreeOf(location);
      if (!node) return;
      const propName = qy.get.escUnderscores(name);
      const lexicallyScopedIdentifier = lookupSymbolForPrivateIdentifierDeclaration(propName, node);
      return lexicallyScopedIdentifier ? getPrivateIdentifierPropertyOfType(leftType, lexicallyScopedIdentifier) : undefined;
    }
    typeOfPropertyOfType(type, name) { return qf.get.typeOfPropertyOfType(type, qy.get.escUnderscores(name)); }
    getIndexInfoOfType;
    getSignaturesOfType;
    getIndexTypeOfType;
    getBaseTypes;
    getBaseTypeOfLiteralType;
    getWidenedType;
    getTypeFromTypeNode(nodeIn) {
      const node = qf.get.parseTreeOf(nodeIn, isTypeNode);
      return node ? qf.get.typeFromTypeNode(node) : errorType;
    }
    getParamType = getTypeAtPosition;
    getPromisedTypeOfPromise;
    getAwaitedType(type) { return getAwaitedType(type); }
    qf.get.returnTypeOfSignature;
    isNullableType;
    getNullableType;
    getNonNullableType;
    getNonOptionalType = removeOptionalTypeMarker;
    getTypeArgs;
    typeToTypeNode = nodeBuilder.typeToTypeNode;
    indexInfoToIndexSignatureDeclaration = nodeBuilder.indexInfoToIndexSignatureDeclaration;
    signatureToSignatureDeclaration = nodeBuilder.signatureToSignatureDeclaration;
    symbolToEntityName = nodeBuilder.symbolToEntityName;
    symbolToExpression = nodeBuilder.symbolToExpression;
    symbolToTypeParamDeclarations = nodeBuilder.symbolToTypeParamDeclarations;
    symbolToParamDeclaration = nodeBuilder.symbolToParamDeclaration;
    typeParamToDeclaration = nodeBuilder.typeParamToDeclaration;
    getSymbolsInScope(location, meaning) {
      location = qf.get.parseTreeOf(location);
      return location ? getSymbolsInScope(location, meaning) : [];
    }
    getSymbolAtLocation(node) {
      node = qf.get.parseTreeOf(node);
      return node ? getSymbolAtLocation(node, true) : undefined;
    }
    getShorthandAssignmentValueSymbol(node) {
      node = qf.get.parseTreeOf(node);
      return node ? getShorthandAssignmentValueSymbol(node) : undefined;
    }
    getExportSpecifierLocalTargetSymbol(nodeIn) {
      const node = qf.get.parseTreeOf(nodeIn, isExportSpecifier);
      return node ? getExportSpecifierLocalTargetSymbol(node) : undefined;
    }
    getExportSymbolOfSymbol(symbol) {
      return qf.get.mergedSymbol(symbol.exportSymbol || symbol);
    }
    getTypeAtLocation(node) {
      node = qf.get.parseTreeOf(node);
      return node ? getTypeOfNode(node) : errorType;
    }
    getTypeOfAssignmentPattern(nodeIn) {
      const node = qf.get.parseTreeOf(nodeIn, isAssignmentPattern);
      return (node && getTypeOfAssignmentPattern(node)) || errorType;
    }
    getPropertySymbolOfDestructuringAssignment(locationIn) {
      const location = qf.get.parseTreeOf(locationIn, qf.is.identifier);
      return location ? getPropertySymbolOfDestructuringAssignment(location) : undefined;
    }
    signatureToString(signature, enclosingDeclaration, flags, kind) {
      return signatureToString(signature, qf.get.parseTreeOf(enclosingDeclaration), flags, kind);
    }
    typeToString(type, enclosingDeclaration, flags) {
      return typeToString(type, qf.get.parseTreeOf(enclosingDeclaration), flags);
    }
    symbolToString(symbol, enclosingDeclaration, meaning, flags) {
      return symbol.symbolToString(qf.get.parseTreeOf(enclosingDeclaration), meaning, flags);
    }
    typePredicateToString(predicate, enclosingDeclaration, flags) {
      return typePredicateToString(predicate, qf.get.parseTreeOf(enclosingDeclaration), flags);
    }
    writeSignature(signature, enclosingDeclaration, flags, kind, writer) {
      return signatureToString(signature, qf.get.parseTreeOf(enclosingDeclaration), flags, kind, writer);
    }
    writeType(type, enclosingDeclaration, flags, writer) {
      return typeToString(type, qf.get.parseTreeOf(enclosingDeclaration), flags, writer);
    }
    writeSymbol(symbol, enclosingDeclaration, meaning, flags, writer) {
      return symbol.symbolToString(qf.get.parseTreeOf(enclosingDeclaration), meaning, flags, writer);
    }
    writeTypePredicate(predicate, enclosingDeclaration, flags, writer) {
      return typePredicateToString(predicate, qf.get.parseTreeOf(enclosingDeclaration), flags, writer);
    }
    getAugmentedPropertiesOfType;
    getRootSymbols;
    getContextualType(nodeIn: qt.Expression, contextFlags?: ContextFlags) {
      const node = qf.get.parseTreeOf(nodeIn, isExpression);
      if (!node) return;
      const containingCall = qc.findAncestor(node, isCallLikeExpression);
      const containingCallResolvedSignature = containingCall && qf.get.nodeLinks(containingCall).resolvedSignature;
      if (contextFlags! & ContextFlags.Completions && containingCall) {
        let toMarkSkip = node as Node;
        do {
          qf.get.nodeLinks(toMarkSkip).skipDirectInference = true;
          toMarkSkip = toMarkSkip.parent;
        } while (toMarkSkip && toMarkSkip !== containingCall);
        qf.get.nodeLinks(containingCall).resolvedSignature = undefined;
      }
      const result = getContextualType(node, contextFlags);
      if (contextFlags! & ContextFlags.Completions && containingCall) {
        let toMarkSkip = node as Node;
        do {
          qf.get.nodeLinks(toMarkSkip).skipDirectInference = undefined;
          toMarkSkip = toMarkSkip.parent;
        } while (toMarkSkip && toMarkSkip !== containingCall);
        qf.get.nodeLinks(containingCall).resolvedSignature = containingCallResolvedSignature;
      }
      return result;
    }
    getContextualTypeForObjectLiteralElem(nodeIn) {
      const node = qf.get.parseTreeOf(nodeIn, isObjectLiteralElemLike);
      return node ? getContextualTypeForObjectLiteralElem(node) : undefined;
    }
    getContextualTypeForArgAtIndex(nodeIn, argIndex) {
      const node = qf.get.parseTreeOf(nodeIn, isCallLikeExpression);
      return node && getContextualTypeForArgAtIndex(node, argIndex);
    }
    getContextualTypeForJsxAttribute(nodeIn) {
      const node = qf.get.parseTreeOf(nodeIn, isJsxAttributeLike);
      return node && getContextualTypeForJsxAttribute(node);
    }
    isContextSensitive;
    getFullyQualifiedName;
    getResolvedSignature(node, candidatesOutArray, argCount) { return getResolvedSignatureWorker(node, candidatesOutArray, argCount, CheckMode.Normal); }
    getResolvedSignatureForSignatureHelp(node, candidatesOutArray, argCount) { return getResolvedSignatureWorker(node, candidatesOutArray, argCount, CheckMode.IsForSignatureHelp); }
    getExpandedParams;
    hasEffectiveRestParam;
    getConstantValue(nodeIn) {
      const node = qf.get.parseTreeOf(nodeIn, canHaveConstantValue);
      return node ? getConstantValue(node) : undefined;
    }
    isValidPropertyAccess(nodeIn, propertyName) {
      const node = qf.get.parseTreeOf(nodeIn, isPropertyAccessOrQualifiedNameOrImportTyping);
      return !!node && isValidPropertyAccess(node, qy.get.escUnderscores(propertyName));
    }
    isValidPropertyAccessForCompletions(nodeIn, type, property) {
      const node = qf.get.parseTreeOf(nodeIn, isPropertyAccessExpression);
      return !!node && isValidPropertyAccessForCompletions(node, type, property);
    }
    getSignatureFromDeclaration(declarationIn) {
      const declaration = qf.get.parseTreeOf(declarationIn, isFunctionLike);
      return declaration ? qf.get.signatureFromDeclaration(declaration) : undefined;
    }
    isImplementationOfOverload(node) {
      const parsed = qf.get.parseTreeOf(node, isFunctionLike);
      return parsed ? isImplementationOfOverload(parsed) : undefined;
    }
    getImmediateAliasedSymbol;
    getAliasedSymbol = resolveAlias;
    getEmitResolver;
    getExportsOfModule = qf.get.exportsOfModuleAsArray;
    getExportsAndPropertiesOfModule;
    getSymbolWalker = createGetSymbolWalker(
      getRestTypeOfSignature,
      getTypePredicateOfSignature,
      getReturnTypeOfSignature,
      getBaseTypes,
      resolveStructuredTypeMembers,
      getTypeOfSymbol,
      getResolvedSymbol,
      getIndexTypeOfStructuredType,
      getConstraintOfTypeParam,
      getFirstIdentifier,
      getTypeArgs
    );
    getAmbientModules;
    getJsxIntrinsicTagNamesAt;
    isOptionalParam(nodeIn) {
      const node = qf.get.parseTreeOf(nodeIn, isParam);
      return node ? isOptionalParam(node) : false;
    }
    tryGetMemberInModuleExports(name, symbol) { return tryGetMemberInModuleExports(qy.get.escUnderscores(name), symbol); }
    tryGetMemberInModuleExportsAndProperties(name, symbol) { return tryGetMemberInModuleExportsAndProperties(qy.get.escUnderscores(name), symbol); }
    tryFindAmbientModuleWithoutAugmentations(moduleName) {
      return tryFindAmbientModule(moduleName, false);
    }
    getApparentType;
    qf.get.unionType;
    isTypeAssignableTo,
    qf.create.anonymousType,
    qf.create.signature,
    createSymbol,
    qf.create.indexInfo,
    getAnyType: () => anyType,
    getStringType: () => stringType,
    getNumberType: () => numberType,
    createPromiseType,
    createArrayType,
    getElemTypeOfArrayType,
    getBooleanType: () => booleanType,
    getFalseType: (fresh?) => (fresh ? falseType : regularFalseType),
    getTrueType: (fresh?) => (fresh ? trueType : regularTrueType),
    getVoidType: () => voidType,
    getUndefinedType: () => undefinedType,
    getNullType: () => nullType,
    getESSymbolType: () => esSymbolType,
    isArrayType;
    isTupleType;
    isArrayLikeType;
    isTypeInvalidDueToUnionDiscriminant;
    getAllPossiblePropertiesOfTypes;
    getSuggestedSymbolForNonexistentProperty;
    getSuggestionForNonexistentProperty;
    getSuggestedSymbolForNonexistentSymbol(location, name, meaning) {return getSuggestedSymbolForNonexistentSymbol(location, qy.get.escUnderscores(name), meaning);} 
    getSuggestionForNonexistentSymbol(location, name, meaning) {return getSuggestionForNonexistentSymbol(location, qy.get.escUnderscores(name), meaning); }
    qf.get.suggestedSymbolForNonexistentModule;
    getSuggestionForNonexistentExport;
    qf.get.baseConstraintOfType;
    getDefaultFromTypeParam(type) {return (type && type.flags & qt.TypeFlags.TypeParam ? getDefaultFromTypeParam(type as qt.TypeParam) : undefined);}
    resolveName(name, location, meaning, excludeGlobals) {
      return resolveName(location, qy.get.escUnderscores(name), meaning, undefined, undefined, false, excludeGlobals);
    }
    getJsxNamespace(n) { return qy.get.unescUnderscores(getJsxNamespace(n)); }
    qf.get.accessibleSymbolChain;
    getTypePredicateOfSignature;
    resolveExternalModuleName(moduleSpecifier) {
      return resolveExternalModuleName(moduleSpecifier, moduleSpecifier, true);
    }
    resolveExternalModuleSymbol;
    tryGetThisTypeAt(node, includeGlobalThis) {
      node = qf.get.parseTreeOf(node);
      return node && tryGetThisTypeAt(node, includeGlobalThis);
    }
    getTypeArgConstraint(nodeIn) {
      const node = qf.get.parseTreeOf(nodeIn, isTypeNode);
      return node && getTypeArgConstraint(node);
    }
    getSuggestionDiagnostics(file, ct) {
      if (file.skipTypeChecking(compilerOpts, host)) return empty;
      let diagnostics: qd.DiagnosticWithLocation[] | undefined;
      try {
        cancellationToken = ct;
        check.sourceFile(file);
        qf.assert.true(!!(qf.get.nodeLinks(file).flags & NodeCheckFlags.TypeChecked));
        diagnostics = qu.addRange(diagnostics, suggestionqd.msgs.getDiagnostics(file.fileName));
        check.unusedIdentifiers(getPotentiallyUnusedIdentifiers(file), (containingNode, kind, diag) => {
          if (!qf.has.parseError(containingNode) && !unusedIsError(kind, !!(containingNode.flags & NodeFlags.Ambient)))
            (diagnostics || (diagnostics = [])).push({ ...diag, category: qd.msgs.Category.Suggestion });
        });
        return diagnostics || empty;
      } finally {
        cancellationToken = undefined;
      }
    }
    runWithCancellationToken(token, callback) {
      try {
        cancellationToken = token;
        return callback(checker);
      } finally {
        cancellationToken = undefined;
      }
    }
    getLocalTypeParamsOfClassOrInterfaceOrTypeAlias;
    isDeclarationVisible;
  };
  let outofbandVarianceMarkerHandler: ((onlyUnreliable: boolean) => void) | undefined;
  builtinGlobals.set(undefinedSymbol.escName, undefinedSymbol);
  initializeTypeChecker();
  return checker;

  function lookupOrIssueError(location: Node | undefined, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number): qd.Diagnostic {
    const diagnostic = location ? qf.create.diagForNode(location, message, arg0, arg1, arg2, arg3) : createCompilerDiagnostic(message, arg0, arg1, arg2, arg3);
    const existing = diagnostics.lookup(diagnostic);
    if (existing) return existing;
    else {
      diagnostics.add(diagnostic);
      return diagnostic;
    }
  }
  function error(location: Node | undefined, message: qd.Message, arg0?: string | number, arg1?: string | number, arg2?: string | number, arg3?: string | number): qd.Diagnostic {
    const diagnostic = location ? qf.create.diagForNode(location, message, arg0, arg1, arg2, arg3) : createCompilerDiagnostic(message, arg0, arg1, arg2, arg3);
    diagnostics.add(diagnostic);
    return diagnostic;
  }
  function addErrorOrSuggestion(isError: boolean, diagnostic: qd.DiagnosticWithLocation) {
    if (isError) diagnostics.add(diagnostic);
    else {
      suggestionqd.msgs.add({ ...diagnostic, category: qd.msgs.Category.Suggestion });
    }
  }
  function errorOrSuggestion(
    isError: boolean,
    location: Node,
    message: qd.Message | qd.MessageChain,
    arg0?: string | number,
    arg1?: string | number,
    arg2?: string | number,
    arg3?: string | number
  ): void {
    addErrorOrSuggestion(isError, 'message' in message ? qf.create.diagForNode(location, message, arg0, arg1, arg2, arg3) : qf.create.diagForNodeFromMessageChain(location, message));
  }
  function errorAndMaybeSuggestAwait(
    location: Node,
    maybeMissingAwait: boolean,
    message: qd.Message,
    arg0?: string | number | undefined,
    arg1?: string | number | undefined,
    arg2?: string | number | undefined,
    arg3?: string | number | undefined
  ): qd.Diagnostic {
    const diagnostic = error(location, message, arg0, arg1, arg2, arg3);
    if (maybeMissingAwait) {
      const related = qf.create.diagForNode(location, qd.msgs.Did_you_forget_to_use_await);
      addRelatedInfo(diagnostic, related);
    }
    return diagnostic;
  }
  function addDuplicateDeclarationError(node: qt.Declaration, message: qd.Message, symbolName: string, relatedNodes: readonly qt.Declaration[] | undefined) {
    const errorNode = (qf.get.expandoIniter(node, false) ? qf.decl.nameOfExpando(node) : qf.decl.nameOf(node)) || node;
    const err = lookupOrIssueError(errorNode, message, symbolName);
    for (const relatedNode of relatedNodes || empty) {
      const adjustedNode = (qf.get.expandoIniter(relatedNode, false) ? qf.decl.nameOfExpando(relatedNode) : qf.decl.nameOf(relatedNode)) || relatedNode;
      if (adjustedNode === errorNode) continue;
      err.relatedInformation = err.relatedInformation || [];
      const leadingMessage = qf.create.diagForNode(adjustedNode, qd.msgs._0_was_also_declared_here, symbolName);
      const followOnMessage = qf.create.diagForNode(adjustedNode, qd.msgs.and_here);
      if (
        length(err.relatedInformation) >= 5 ||
        some(err.relatedInformation, (r) => compareDiagnostics(r, followOnMessage) === Comparison.EqualTo || compareDiagnostics(r, leadingMessage) === Comparison.EqualTo)
      )
        continue;
      addRelatedInfo(err, !length(err.relatedInformation) ? leadingMessage : followOnMessage);
    }
  }
  function mergeModuleAugmentation(moduleName: qt.StringLiteral | qt.Identifier): void {
    const moduleAugmentation = <qt.ModuleDeclaration>moduleName.parent;
    if (moduleAugmentation.symbol.declarations[0] !== moduleAugmentation) {
      qf.assert.true(moduleAugmentation.symbol.declarations.length > 1);
      return;
    }
    if (qf.is.globalScopeAugmentation(moduleAugmentation)) globals.merge(moduleAugmentation.symbol.exports!);
    else {
      const moduleNotFoundError = !(moduleName.parent.parent.flags & NodeFlags.Ambient) ? qd.msgs.Invalid_module_name_in_augmentation_module_0_cannot_be_found : undefined;
      let mainModule = resolveExternalModuleNameWorker(moduleName, moduleName, moduleNotFoundError, true);
      if (!mainModule) return;
      mainModule = resolveExternalModuleSymbol(mainModule);
      if (mainModule.flags & qt.SymbolFlags.Namespace) {
        if (some(patternAmbientModules, (module) => mainModule === module.symbol)) {
          const merged = mainModule.merge(moduleAugmentation.symbol, true);
          if (!patternAmbientModuleAugmentations) patternAmbientModuleAugmentations = new qu.QMap();
          patternAmbientModuleAugmentations.set((moduleName as qt.StringLiteral).text, merged);
        } else {
          if (mainModule.exports?.get(InternalSymbol.ExportStar) && moduleAugmentation.symbol.exports?.size) {
            const resolvedExports = getResolvedMembersOrExportsOfSymbol(mainModule, MembersOrExportsResolutionKind.resolvedExports);
            for (const [key, value] of arrayFrom(moduleAugmentation.symbol.exports.entries())) {
              if (resolvedExports.has(key) && !mainModule.exports.has(key)) value.merge(resolvedExports.get(key)!);
            }
          }
          moduleAugmentation.symbol.merge(mainModule);
        }
      } else error(moduleName, qd.msgs.Cannot_augment_module_0_because_it_resolves_to_a_non_module_entity, (moduleName as qt.StringLiteral).text);
    }
  }
  function useOuterVariableScopeInParam(result: qt.Symbol, location: Node, lastLocation: Node) {
    const target = getEmitScriptTarget(compilerOpts);
    const functionLocation = <qt.FunctionLikeDeclaration>location;
    if (
      lastLocation.kind === Syntax.ParamDeclaration &&
      functionLocation.body &&
      result.valueDeclaration.pos >= functionLocation.body.pos &&
      result.valueDeclaration.end <= functionLocation.body.end
    ) {
      const ls = qf.get.nodeLinks(functionLocation);
      if (ls.declarationRequiresScopeChange === undefined) ls.declarationRequiresScopeChange = forEach(functionLocation.params, requiresScopeChange) || false;
      return !ls.declarationRequiresScopeChange;
    }
    return false;
    function requiresScopeChange(node: qt.ParamDeclaration): boolean {
      return requiresScopeChangeWorker(node.name) || (!!node.initer && requiresScopeChangeWorker(node.initer));
    }
    function requiresScopeChangeWorker(node: Node): boolean {
      switch (node.kind) {
        case Syntax.ArrowFunction:
        case Syntax.FunctionExpression:
        case Syntax.FunctionDeclaration:
        case Syntax.Constructor:
          return false;
        case Syntax.MethodDeclaration:
        case Syntax.GetAccessor:
        case Syntax.SetAccessor:
        case Syntax.PropertyAssignment:
          return requiresScopeChangeWorker((node as qt.MethodDeclaration | qt.AccessorDeclaration | qt.PropertyAssignment).name);
        case Syntax.PropertyDeclaration:
          if (qf.has.staticModifier(node)) return target < qt.ScriptTarget.ESNext || !compilerOpts.useDefineForClassFields;
          return requiresScopeChangeWorker((node as qt.PropertyDeclaration).name);
        default:
          if (qf.is.nullishCoalesce(node) || qf.is.optionalChain(node)) return false;
          if (node.kind === Syntax.BindingElem && node.dot3Token && node.parent.kind === Syntax.ObjectBindingPattern) return false;
          if (qf.is.typeNode(node)) return false;
          return qf.each.child(node, requiresScopeChangeWorker) || false;
      }
    }
  }
  function diagnosticName(nameArg: qu.__String | qc.Identifier | qc.PrivateIdentifier) {
    return qf.is.string(nameArg) ? qy.get.unescUnderscores(nameArg as qu.__String) : declarationNameToString(nameArg as qt.Identifier);
  }
  function canHaveSyntheticDefault(file: qt.SourceFile | undefined, moduleSymbol: qt.Symbol, dontResolveAlias: boolean) {
    if (!allowSyntheticDefaultImports) return false;
    if (!file || file.isDeclarationFile) {
      const defaultExportSymbol = resolveExportByName(moduleSymbol, qt.InternalSymbol.Default, undefined, true);
      if (defaultExportSymbol && some(defaultExportSymbol.declarations, isSyntacticDefault)) return false;
      if (resolveExportByName(moduleSymbol, qy.get.escUnderscores('__esModule'), undefined, dontResolveAlias)) return false;
      return true;
    }
    if (!file.isJS()) return hasExportAssignmentSymbol(moduleSymbol);
    return !file.externalModuleIndicator && !resolveExportByName(moduleSymbol, qy.get.escUnderscores('__esModule'), undefined, dontResolveAlias);
  }
  function reportNonDefaultExport(moduleSymbol: qt.Symbol, node: qt.ImportClause) {
    if (moduleSymbol.exports?.has(node.symbol.escName))
      error(node.name, qd.msgs.Module_0_has_no_default_export_Did_you_mean_to_use_import_1_from_0_instead, moduleSymbol.symbolToString(), node.symbol.symbolToString());
    else {
      const diagnostic = error(node.name, qd.msgs.Module_0_has_no_default_export, moduleSymbol.symbolToString());
      const exportStar = moduleSymbol.exports?.get(InternalSymbol.ExportStar);
      if (exportStar) {
        const defaultExport = qf.find.up(
          exportStar.declarations,
          (decl) => !!(decl.kind === Syntax.ExportDeclaration && decl.moduleSpecifier && resolveExternalModuleName(decl, decl.moduleSpecifier)?.exports?.has(InternalSymbol.Default))
        );
        if (defaultExport) addRelatedInfo(diagnostic, qf.create.diagForNode(defaultExport, qd.msgs.export_Asterisk_does_not_re_export_a_default));
      }
    }
  }
  function combineValueAndTypeSymbols(valueSymbol: qt.Symbol, typeSymbol: qt.Symbol): qt.Symbol {
    if (valueSymbol === unknownSymbol && typeSymbol === unknownSymbol) return unknownSymbol;
    if (valueSymbol.flags & (SymbolFlags.Type | qt.SymbolFlags.Namespace)) return valueSymbol;
    const result = new qc.Symbol(valueSymbol.flags | typeSymbol.flags, valueSymbol.escName);
    result.declarations = deduplicate(concatenate(valueSymbol.declarations, typeSymbol.declarations), equateValues);
    result.parent = valueSymbol.parent || typeSymbol.parent;
    if (valueSymbol.valueDeclaration) result.valueDeclaration = valueSymbol.valueDeclaration;
    if (typeSymbol.members) result.members = cloneMap(typeSymbol.members);
    if (valueSymbol.exports) result.exports = cloneMap(valueSymbol.exports);
    return result;
  }
  function reportNonExportedMember(node: qt.ImportDeclaration | qt.ExportDeclaration, name: qt.Identifier, declarationName: string, moduleSymbol: qt.Symbol, moduleName: string): void {
    const localSymbol = moduleSymbol.valueDeclaration.locals?.get(name.escapedText);
    const exports = moduleSymbol.exports;
    if (localSymbol) {
      const exportedEqualsSymbol = exports?.get(InternalSymbol.ExportEquals);
      if (exportedEqualsSymbol) {
        qf.get.symbolIfSameReference(exportedEqualsSymbol, localSymbol)
          ? reportInvalidImportEqualsExportMember(node, name, declarationName, moduleName)
          : error(name, qd.msgs.Module_0_has_no_exported_member_1, moduleName, declarationName);
      } else {
        const exportedSymbol = exports ? qf.find.up(exports.toArray(), (s) => !!qf.get.symbolIfSameReference(s, localSymbol)) : undefined;
        const diagnostic = exportedSymbol
          ? error(name, qd.msgs.Module_0_declares_1_locally_but_it_is_exported_as_2, moduleName, declarationName, exportedSymbol.symbolToString())
          : error(name, qd.msgs.Module_0_declares_1_locally_but_it_is_not_exported, moduleName, declarationName);
        addRelatedInfo(diagnostic, ...map(localSymbol.declarations, (decl, index) => qf.create.diagForNode(decl, index === 0 ? qd.msgs._0_is_declared_here : qd.msgs.and_here, declarationName)));
      }
    } else {
      error(name, qd.msgs.Module_0_has_no_exported_member_1, moduleName, declarationName);
    }
  }
  function reportInvalidImportEqualsExportMember(node: qt.ImportDeclaration | qt.ExportDeclaration, name: qt.Identifier, declarationName: string, moduleName: string) {
    if (moduleKind >= qt.ModuleKind.ES2015) {
      const message = compilerOpts.esModuleInterop
        ? qd.msgs._0_can_only_be_imported_by_using_a_default_import
        : qd.msgs._0_can_only_be_imported_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import;
      error(name, message, declarationName);
    } else {
      if (qf.is.inJSFile(node)) {
        const message = compilerOpts.esModuleInterop
          ? qd.msgs._0_can_only_be_imported_by_using_a_require_call_or_by_using_a_default_import
          : qd.msgs._0_can_only_be_imported_by_using_a_require_call_or_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import;
        error(name, message, declarationName);
      } else {
        const message = compilerOpts.esModuleInterop
          ? qd.msgs._0_can_only_be_imported_by_using_import_1_require_2_or_a_default_import
          : qd.msgs._0_can_only_be_imported_by_using_import_1_require_2_or_by_turning_on_the_esModuleInterop_flag_and_using_a_default_import;
        error(name, message, declarationName, declarationName, moduleName);
      }
    }
  }
  function markSymbolOfAliasDeclarationIfTypeOnly(aliasDeclaration: qt.Declaration | undefined, immediateTarget: qt.Symbol | undefined, finalTarget: qt.Symbol | undefined, overwriteEmpty: boolean): boolean {
    if (!aliasDeclaration) return false;
    const sourceSymbol = qf.get.symbolOfNode(aliasDeclaration);
    if (qf.is.typeOnlyImportOrExportDeclaration(aliasDeclaration)) {
      const ls = sourceSymbol.links;
      ls.typeOnlyDeclaration = aliasDeclaration;
      return true;
    }
    const ls = sourceSymbol.links;
    return markSymbolOfAliasDeclarationIfTypeOnlyWorker(ls, immediateTarget, overwriteEmpty) || markSymbolOfAliasDeclarationIfTypeOnlyWorker(ls, finalTarget, overwriteEmpty);
  }
  function markSymbolOfAliasDeclarationIfTypeOnlyWorker(aliasDeclarationLinks: qt.SymbolLinks, target: qt.Symbol | undefined, overwriteEmpty: boolean): boolean {
    if (target && (aliasDeclarationLinks.typeOnlyDeclaration === undefined || (overwriteEmpty && aliasDeclarationLinks.typeOnlyDeclaration === false))) {
      const exportSymbol = target.exports?.get(InternalSymbol.ExportEquals) ?? target;
      const typeOnly = exportSymbol.declarations && qf.find.up(exportSymbol.declarations, isTypeOnlyImportOrExportDeclaration);
      aliasDeclarationLinks.typeOnlyDeclaration = typeOnly ?? exportSymbol.links.typeOnlyDeclaration ?? false;
    }
    return !!aliasDeclarationLinks.typeOnlyDeclaration;
  }
  function markExportAsReferenced(node: qt.ImportEqualsDeclaration | qt.ExportSpecifier) {
    const symbol = qf.get.symbolOfNode(node);
    const target = this.resolveAlias();
    if (target) {
      const markAlias = target === unknownSymbol || (target.flags & qt.SymbolFlags.Value && !isConstEnumOrConstEnumOnlyModule(target) && !this.getTypeOnlyAliasDeclaration());
      if (markAlias) symbol.markAliasSymbolAsReferenced();
    }
  }
  function errorOnImplicitAnyModule(isError: boolean, errorNode: Node, { packageId, resolvedFileName }: qt.ResolvedModuleFull, moduleReference: string): void {
    const errorInfo =
      !isExternalModuleNameRelative(moduleReference) && packageId
        ? typesPackageExists(packageId.name)
          ? chainqd.Messages(
              undefined,
              qd.msgs
                .If_the_0_package_actually_exposes_this_module_consider_sending_a_pull_request_to_amend_https_Colon_Slash_Slashgithub_com_SlashDefinitelyTyped_SlashDefinitelyTyped_Slashtree_Slashmaster_Slashtypes_Slash_1,
              packageId.name,
              mangleScopedPackageName(packageId.name)
            )
          : chainqd.Messages(
              undefined,
              qd.msgs.Try_npm_install_types_Slash_1_if_it_exists_or_add_a_new_declaration_d_ts_file_containing_declare_module_0,
              moduleReference,
              mangleScopedPackageName(packageId.name)
            )
        : undefined;
    errorOrSuggestion(isError, errorNode, chainqd.Messages(errorInfo, qd.msgs.Could_not_find_a_declaration_file_for_module_0_1_implicitly_has_an_any_type, moduleReference, resolvedFileName));
  }
  function typesPackageExists(packageName: string): boolean {
    return getPackagesSet().has(getTypesPackageName(packageName));
  }
  function tryGetMemberInModuleExports(memberName: qu.__String, moduleSymbol: qt.Symbol): qt.Symbol | undefined {
    const symbolTable = qf.get.exportsOfModule(moduleSymbol);
    if (symbolTable) return symbolTable.get(memberName);
  }
  function tryGetMemberInModuleExportsAndProperties(memberName: qu.__String, moduleSymbol: qt.Symbol): qt.Symbol | undefined {
    const symbol = tryGetMemberInModuleExports(memberName, moduleSymbol);
    if (symbol) return symbol;
    const exportEquals = resolveExternalModuleSymbol(moduleSymbol);
    if (exportEquals === moduleSymbol) return;
    const type = exportEquals.typeOfSymbol();
    return type.flags & qt.TypeFlags.Primitive || getObjectFlags(type) & ObjectFlags.Class || isArrayOrTupleLikeType(type) ? undefined : qf.get.propertyOfType(type, memberName);
  }
  interface ExportCollisionTracker {
    specText: string;
    exportsWithDuplicate: qt.ExportDeclaration[];
  }
  type ExportCollisionTrackerTable = EscapedMap<ExportCollisionTracker>;
  function extendExportSymbols(target: qt.SymbolTable, source: qt.SymbolTable | undefined, lookupTable?: ExportCollisionTrackerTable, exportNode?: qt.ExportDeclaration) {
    if (!source) return;
    source.forEach((sourceSymbol, id) => {
      if (id === qt.InternalSymbol.Default) return;
      const targetSymbol = target.get(id);
      if (!targetSymbol) {
        target.set(id, sourceSymbol);
        if (lookupTable && exportNode) {
          lookupTable.set(id, {
            specText: qf.get.textOf(exportNode.moduleSpecifier!),
          } as ExportCollisionTracker);
        }
      } else if (lookupTable && exportNode && targetSymbol && targetSymbol.resolveSymbol() !== sourceSymbol.resolveSymbol()) {
        const collisionTracker = lookupTable.get(id)!;
        if (!collisionTracker.exportsWithDuplicate) collisionTracker.exportsWithDuplicate = [exportNode];
        else {
          collisionTracker.exportsWithDuplicate.push(exportNode);
        }
      }
    });
  }
  function findConstructorDeclaration(node: qt.ClassLikeDeclaration): qt.ConstructorDeclaration | undefined {
    const members = node.members;
    for (const member of members) {
      if (member.kind === Syntax.Constructor && qf.is.present((<qt.ConstructorDeclaration>member).body)) return <qt.ConstructorDeclaration>member;
    }
  }
  function setStructuredTypeMembers(
    type: qt.StructuredType,
    members: qt.SymbolTable,
    callSignatures: readonly qt.Signature[],
    constructSignatures: readonly qt.Signature[],
    stringIndexInfo: qt.IndexInfo | undefined,
    numberIndexInfo: qt.IndexInfo | undefined
  ): qt.ResolvedType {
    (<qt.ResolvedType>type).members = members;
    (<qt.ResolvedType>type).properties = members === emptySymbols ? empty : getNamedMembers(members);
    (<qt.ResolvedType>type).callSignatures = callSignatures;
    (<qt.ResolvedType>type).constructSignatures = constructSignatures;
    (<qt.ResolvedType>type).stringIndexInfo = stringIndexInfo;
    (<qt.ResolvedType>type).numberIndexInfo = numberIndexInfo;
    return <qt.ResolvedType>type;
  }
  function forEachSymbolTableInScope<T>(enclosingDeclaration: Node | undefined, callback: (symbolTable: qt.SymbolTable) => T): T {
    let result: T;
    for (let location = enclosingDeclaration; location; location = location.parent) {
      if (location.locals && !qf.is.globalSourceFile(location)) if ((result = callback(location.locals))) return result;
      switch (location.kind) {
        case Syntax.SourceFile:
          if (!is.externalOrCommonJsModule(<qt.SourceFile>location)) break;
        case Syntax.ModuleDeclaration:
          const sym = qf.get.symbolOfNode(location as qt.ModuleDeclaration);
          if ((result = callback(sym?.exports || emptySymbols))) return result;
          break;
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.InterfaceDeclaration:
          let table: EscapedMap<qt.Symbol> | undefined;
          (qf.get.symbolOfNode(location as qt.ClassLikeDeclaration | qt.InterfaceDeclaration).members || emptySymbols).forEach((memberSymbol, key) => {
            if (memberSymbol.flags & (SymbolFlags.Type & ~SymbolFlags.Assignment)) (table || (table = new qc.SymbolTable())).set(key, memberSymbol);
          });
          if (table && (result = callback(table))) return result;
          break;
      }
    }
    return callback(globals);
  }
  function toNodeBuilderFlags(flags = TypeFormatFlags.None): NodeBuilderFlags {
    return flags & TypeFormatFlags.NodeBuilderFlagsMask;
  }
  function typePredicateToString(
    typePredicate: qt.TypePredicate,
    enclosingDeclaration?: Node,
    flags: TypeFormatFlags = TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
    writer?: qt.EmitTextWriter
  ): string {
    return writer ? typePredicateToStringWorker(writer).getText() : usingSingleLineStringWriter(typePredicateToStringWorker);
    function typePredicateToStringWorker(writer: qt.EmitTextWriter) {
      const predicate = new qc.TypingPredicate(
        typePredicate.kind === qt.TypePredicateKind.AssertsThis || typePredicate.kind === qt.TypePredicateKind.AssertsIdentifier ? new qc.Token(Syntax.AssertsKeyword) : undefined,
        typePredicate.kind === qt.TypePredicateKind.Identifier || typePredicate.kind === qt.TypePredicateKind.AssertsIdentifier ? new qc.Identifier(typePredicate.paramName) : qt.ThisTyping.create(),
        typePredicate.type &&
          nodeBuilder.typeToTypeNode(typePredicate.type, enclosingDeclaration, toNodeBuilderFlags(flags) | NodeBuilderFlags.IgnoreErrors | NodeBuilderFlags.WriteTypeParamsInQualifiedName)!
      );
      const printer = createPrinter({ removeComments: true });
      const sourceFile = enclosingDeclaration && enclosingDeclaration.sourceFile;
      printer.writeNode(EmitHint.Unspecified, predicate, sourceFile, writer);
      return writer;
    }
  }
  function formatUnionTypes(types: readonly qt.Type[]): qt.Type[] {
    const result: qt.Type[] = [];
    let flags: qt.TypeFlags = 0;
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      flags |= t.flags;
      if (!(t.flags & qt.TypeFlags.Nullable)) {
        if (t.flags & (TypeFlags.BooleanLiteral | qt.TypeFlags.EnumLiteral)) {
          const baseType = t.flags & qt.TypeFlags.BooleanLiteral ? booleanType : getBaseTypeOfEnumLiteralType(<qt.LiteralType>t);
          if (baseType.flags & qt.TypeFlags.Union) {
            const count = (<qt.UnionType>baseType).types.length;
            if (i + count <= types.length && getRegularTypeOfLiteralType(types[i + count - 1]) === getRegularTypeOfLiteralType((<qt.UnionType>baseType).types[count - 1])) {
              result.push(baseType);
              i += count - 1;
              continue;
            }
          }
        }
        result.push(t);
      }
    }
    if (flags & qt.TypeFlags.Null) result.push(nullType);
    if (flags & qt.TypeFlags.Undefined) result.push(undefinedType);
    return result || types;
  }
  function visibilityToString(flags: ModifierFlags): string | undefined {
    if (flags === ModifierFlags.Private) return 'private';
    if (flags === ModifierFlags.Protected) return 'protected';
    return 'public';
  }
  function collectLinkedAliases(node: qt.Identifier, setVisibility?: boolean): Node[] | undefined {
    let exportSymbol: qt.Symbol | undefined;
    if (node.parent && node.parent.kind === Syntax.ExportAssignment)
      exportSymbol = resolveName(node, node.escapedText, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias, undefined, node, false);
    else if (node.parent.kind === Syntax.ExportSpecifier) {
      exportSymbol = qf.get.targetOfExportSpecifier(<qt.ExportSpecifier>node.parent, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace | qt.SymbolFlags.Alias);
    }
    let result: Node[] | undefined;
    let visited: qu.QMap<true> | undefined;
    if (exportSymbol) {
      visited = new qu.QMap();
      visited.set('' + exportSymbol.getId(), true);
      buildVisibleNodeList(exportSymbol.declarations);
    }
    return result;
    function buildVisibleNodeList(declarations: qt.Declaration[]) {
      forEach(declarations, (declaration) => {
        const resultNode = getAnyImportSyntax(declaration) || declaration;
        if (setVisibility) qf.get.nodeLinks(declaration).isVisible = true;
        else {
          result = result || [];
          qu.pushIfUnique(result, resultNode);
        }
        if (qf.is.internalModuleImportEqualsDeclaration(declaration)) {
          const internalModuleReference = <qt.Identifier | qt.QualifiedName>declaration.moduleReference;
          const firstIdentifier = qf.get.firstIdentifier(internalModuleReference);
          const importSymbol = resolveName(declaration, firstIdentifier.escapedText, qt.SymbolFlags.Value | qt.SymbolFlags.Type | qt.SymbolFlags.Namespace, undefined, undefined, false);
          const id = importSymbol && '' + importSymbol.getId();
          if (importSymbol && !visited!.has(id!)) {
            visited!.set(id!, true);
            buildVisibleNodeList(importSymbol.declarations);
          }
        }
      });
    }
  }
  function pushTypeResolution(target: TypeSystemEntity, propertyName: TypeSystemPropertyName): boolean {
    const resolutionCycleStartIndex = findResolutionCycleStartIndex(target, propertyName);
    if (resolutionCycleStartIndex >= 0) {
      const { length } = resolutionTargets;
      for (let i = resolutionCycleStartIndex; i < length; i++) {
        resolutionResults[i] = false;
      }
      return false;
    }
    resolutionTargets.push(target);
    resolutionResults.push(true);
    resolutionPropertyNames.push(propertyName);
    return true;
  }
  function findResolutionCycleStartIndex(target: TypeSystemEntity, propertyName: TypeSystemPropertyName): number {
    for (let i = resolutionTargets.length - 1; i >= 0; i--) {
      if (qf.is.withType(resolutionTargets[i], resolutionPropertyNames[i])) return -1;
      if (resolutionTargets[i] === target && resolutionPropertyNames[i] === propertyName) return i;
    }
    return -1;
  }
  function popTypeResolution(): boolean {
    resolutionTargets.pop();
    resolutionPropertyNames.pop();
    return resolutionResults.pop()!;
  }
  function declarationBelongsToPrivateAmbientMember(declaration: qt.VariableLikeDeclaration) {
    const root = qf.get.rootDeclaration(declaration);
    const memberDeclaration = root.kind === Syntax.Param ? root.parent : root;
    return isPrivateWithinAmbient(memberDeclaration);
  }
  function tryGetTypeFromEffectiveTypeNode(declaration: qt.Declaration) {
    const typeNode = qf.get.effectiveTypeAnnotationNode(declaration);
    if (typeNode) return qf.get.typeFromTypeNode(typeNode);
  }
  function appendTypeParams(typeParams: qt.TypeParam[] | undefined, declarations: readonly qt.TypeParamDeclaration[]): qt.TypeParam[] | undefined {
    for (const declaration of declarations) {
      typeParams = appendIfUnique(typeParams, getDeclaredTypeOfTypeParam(qf.get.symbolOfNode(declaration)));
    }
    return typeParams;
  }
  function addDeclarationToLateBoundSymbol(symbol: qt.Symbol, member: qt.LateBoundDecl | qt.BinaryExpression, symbolFlags: qt.SymbolFlags) {
    qf.assert.true(!!(this.checkFlags() & qt.CheckFlags.Late), 'Expected a late-bound symbol.');
    symbol.flags |= symbolFlags;
    member.symbol.links.lateSymbol = symbol;
    if (!symbol.declarations) symbol.declarations = [member];
    else {
      symbol.declarations.push(member);
    }
    if (symbolFlags & qt.SymbolFlags.Value) {
      if (!symbol.valueDeclaration || symbol.valueDeclaration.kind !== member.kind) symbol.valueDeclaration = member;
    }
  }
  function lateBindMember(parent: qt.Symbol, earlySymbols: qt.SymbolTable | undefined, lateSymbols: EscapedMap<qt.TransientSymbol>, decl: qt.LateBoundDecl | qt.LateBoundBinaryExpressionDeclaration) {
    qf.assert.true(!!decl.symbol, 'The member is expected to have a symbol.');
    const ls = qf.get.nodeLinks(decl);
    if (!ls.resolvedSymbol) {
      ls.resolvedSymbol = decl.symbol;
      const declName = decl.kind === Syntax.BinaryExpression ? decl.left : decl.name;
      const type = declName.kind === Syntax.ElemAccessExpression ? check.expressionCached(declName.argExpression) : check.computedPropertyName(declName);
      if (qf.is.typeUsableAsPropertyName(type)) {
        const memberName = getPropertyNameFromType(type);
        const symbolFlags = decl.symbol.flags;
        let lateSymbol = lateSymbols.get(memberName);
        if (!lateSymbol) lateSymbols.set(memberName, (lateSymbol = new qc.Symbol(SymbolFlags.None, memberName, qt.CheckFlags.Late)));
        const earlySymbol = earlySymbols && earlySymbols.get(memberName);
        if (lateSymbol.flags & qf.get.excluded(symbolFlags) || earlySymbol) {
          const declarations = earlySymbol ? concatenate(earlySymbol.declarations, lateSymbol.declarations) : lateSymbol.declarations;
          const name = (!(type.flags & qt.TypeFlags.UniqueESSymbol) && qy.get.unescUnderscores(memberName)) || declarationNameToString(declName);
          forEach(declarations, (declaration) => error(qf.decl.nameOf(declaration) || declaration, qd.msgs.Property_0_was_also_declared_here, name));
          error(declName || decl, qd.msgs.Duplicate_property_0, name);
          lateSymbol = new qc.Symbol(SymbolFlags.None, memberName, qt.CheckFlags.Late);
        }
        lateSymbol.nameType = type;
        addDeclarationToLateBoundSymbol(lateSymbol, decl, symbolFlags);
        if (lateSymbol.parent) qf.assert.true(lateSymbol.parent === parent, 'Existing symbol parent should match new one');
        else {
          lateSymbol.parent = parent;
        }
        return (ls.resolvedSymbol = lateSymbol);
      }
    }
    return ls.resolvedSymbol;
  }
  function findMatchingSignature(signatureList: readonly qt.Signature[], signature: qt.Signature, partialMatch: boolean, ignoreThisTypes: boolean, ignoreReturnTypes: boolean): qt.Signature | undefined {
    for (const s of signatureList) {
      if (compareSignaturesIdentical(s, signature, partialMatch, ignoreThisTypes, ignoreReturnTypes, partialMatch ? compareTypesSubtypeOf : compareTypesIdentical)) return s;
    }
  }
  function findMatchingSignatures(signatureLists: readonly (readonly qt.Signature[])[], signature: qt.Signature, listIndex: number): qt.Signature[] | undefined {
    if (signature.typeParams) {
      if (listIndex > 0) return;
      for (let i = 1; i < signatureLists.length; i++) {
        if (!findMatchingSignature(signatureLists[i], signature, false)) return;
      }
      return [signature];
    }
    let result: qt.Signature[] | undefined;
    for (let i = 0; i < signatureLists.length; i++) {
      const match = i === listIndex ? signature : findMatchingSignature(signatureLists[i], signature, true);
      if (!match) return;
      result = appendIfUnique(result, match);
    }
    return result;
  }
  function combineUnionThisParam(left: qt.Symbol | undefined, right: qt.Symbol | undefined): qt.Symbol | undefined {
    if (!left || !right) return left || right;
    const thisType = qf.get.intersectionType([left.typeOfSymbol(), right.typeOfSymbol()]);
    return createSymbolWithType(left, thisType);
  }
  function intersectIndexInfos(info1: qt.IndexInfo | undefined, info2: qt.IndexInfo | undefined): qt.IndexInfo | undefined {
    return !info1 ? info2 : !info2 ? info1 : qf.create.indexInfo(qf.get.intersectionType([info1.type, info2.type]), info1.isReadonly && info2.isReadonly);
  }
  function unionSpreadIndexInfos(info1: qt.IndexInfo | undefined, info2: qt.IndexInfo | undefined): qt.IndexInfo | undefined {
    return info1 && info2 && qf.create.indexInfo(qf.get.unionType([info1.type, info2.type]), info1.isReadonly || info2.isReadonly);
  }
  function findMixins(types: readonly qt.Type[]): readonly boolean[] {
    const constructorTypeCount = countWhere(types, (t) => getSignaturesOfType(t, qt.SignatureKind.Construct).length > 0);
    const mixinFlags = map(types, qf.is.mixinConstructorType);
    if (constructorTypeCount > 0 && constructorTypeCount === countWhere(mixinFlags, (b) => b)) {
      const firstMixinIndex = mixinFlags.indexOf(true);
      mixinFlags[firstMixinIndex] = false;
    }
    return mixinFlags;
  }
  function appendSignatures(signatures: qt.Signature[] | undefined, newSignatures: readonly qt.Signature[]) {
    for (const sig of newSignatures) {
      if (!signatures || every(signatures, (s) => !compareSignaturesIdentical(s, sig, false, compareTypesIdentical))) signatures = append(signatures, sig);
    }
    return signatures;
  }
  function elaborateNeverIntersection(errorInfo: qd.MessageChain | undefined, type: qt.Type) {
    if (getObjectFlags(type) & ObjectFlags.IsNeverIntersection) {
      const neverProp = qf.find.up(getPropertiesOfUnionOrIntersectionType(<qt.IntersectionType>type), qf.is.discriminantWithNeverType);
      if (neverProp) {
        return chainqd.Messages(
          errorInfo,
          qd.msgs.The_intersection_0_was_reduced_to_never_because_property_1_has_conflicting_types_in_some_constituents,
          typeToString(type, undefined, TypeFormatFlags.NoTypeReduction),
          neverProp.symbolToString()
        );
      }
      const privateProp = qf.find.up(getPropertiesOfUnionOrIntersectionType(<qt.IntersectionType>type), qf.is.conflictingPrivateProperty);
      if (privateProp) {
        return chainqd.Messages(
          errorInfo,
          qd.msgs.The_intersection_0_was_reduced_to_never_because_property_1_exists_in_multiple_constituents_and_is_private_in_some,
          typeToString(type, undefined, TypeFormatFlags.NoTypeReduction),
          privateProp.symbolToString()
        );
      }
    }
    return errorInfo;
  }
  function tryFindAmbientModule(moduleName: string, withAugmentations: boolean) {
    if (isExternalModuleNameRelative(moduleName)) return;
    const s = globals.fetch(('"' + moduleName + '"') as qu.__String, qt.SymbolFlags.ValueModule);
    return s && withAugmentations ? qf.get.mergedSymbol(s) : s;
  }
  function fillMissingTypeArgs(typeArgs: readonly qt.Type[], typeParams: readonly qt.TypeParam[] | undefined, minTypeArgCount: number, isJavaScriptImplicitAny: boolean): qt.Type[];
  function fillMissingTypeArgs(
    typeArgs: readonly qt.Type[] | undefined,
    typeParams: readonly qt.TypeParam[] | undefined,
    minTypeArgCount: number,
    isJavaScriptImplicitAny: boolean
  ): qt.Type[] | undefined;
  function fillMissingTypeArgs(typeArgs: readonly qt.Type[] | undefined, typeParams: readonly qt.TypeParam[] | undefined, minTypeArgCount: number, isJavaScriptImplicitAny: boolean) {
    const numTypeParams = length(typeParams);
    if (!numTypeParams) return [];
    const numTypeArgs = length(typeArgs);
    if (isJavaScriptImplicitAny || (numTypeArgs >= minTypeArgCount && numTypeArgs <= numTypeParams)) {
      const result = typeArgs ? typeArgs.slice() : [];
      for (let i = numTypeArgs; i < numTypeParams; i++) {
        result[i] = errorType;
      }
      const baseDefaultType = getDefaultTypeArgType(isJavaScriptImplicitAny);
      for (let i = numTypeArgs; i < numTypeParams; i++) {
        let defaultType = getDefaultFromTypeParam(typeParams![i]);
        if (isJavaScriptImplicitAny && defaultType && (qf.is.typeIdenticalTo(defaultType, unknownType) || qf.is.typeIdenticalTo(defaultType, emptyObjectType))) defaultType = anyType;
        result[i] = defaultType ? instantiateType(defaultType, createTypeMapper(typeParams!, result)) : baseDefaultType;
      }
      result.length = typeParams!.length;
      return result;
    }
    return typeArgs && typeArgs.slice();
  }
  function maybeAddJsSyntheticRestParam(declaration: qt.SignatureDeclaration | qt.DocSignature, params: qt.Symbol[]): boolean {
    if (declaration.kind === Syntax.DocSignature || !containsArgsReference(declaration)) return false;
    const lastParam = lastOrUndefined(declaration.params);
    const lastParamTags = lastParam ? qf.get.doc.paramTags(lastParam) : qf.get.doc.tags(declaration).filter(isDocParamTag);
    const lastParamVariadicType = qf.find.defined(lastParamTags, (p) => (p.typeExpression && p.typeExpression.type.kind === Syntax.DocVariadicTyping ? p.typeExpression.type : undefined));
    const syntheticArgsSymbol = new qc.Symbol(SymbolFlags.Variable, 'args' as qu.__String, qt.CheckFlags.RestParam);
    syntheticArgsSymbol.type = lastParamVariadicType ? createArrayType(qf.get.typeFromTypeNode(lastParamVariadicType.type)) : anyArrayType;
    if (lastParamVariadicType) params.pop();
    params.push(syntheticArgsSymbol);
    return true;
  }
  function cloneTypeReference(source: qt.TypeReference): qt.TypeReference {
    const type = <qt.TypeReference>createType(source.flags);
    type.symbol = source.symbol;
    type.objectFlags = source.objectFlags;
    type.target = source.target;
    type.resolvedTypeArgs = source.resolvedTypeArgs;
    return type;
  }
  function typeArgsFromTypingReference(node: qt.WithArgsTobj): qt.Type[] | undefined {
    return map(node.typeArgs, qf.get.typeFromTypeNode);
  }
  function mayResolveTypeAlias(node: Node): boolean {
    switch (node.kind) {
      case Syntax.TypingReference:
        return isDocTypeReference(node) || !!(resolveTypeReferenceName((<qt.TypingReference>node).typeName, qt.SymbolFlags.Type).flags & qt.SymbolFlags.TypeAlias);
      case Syntax.TypingQuery:
        return true;
      case Syntax.TypingOperator:
        return (<qt.TypingOperator>node).operator !== Syntax.UniqueKeyword && mayResolveTypeAlias((<qt.TypingOperator>node).type);
      case Syntax.ParenthesizedTyping:
      case Syntax.OptionalTyping:
      case Syntax.NamedTupleMember:
      case Syntax.DocOptionalTyping:
      case Syntax.DocNullableTyping:
      case Syntax.DocNonNullableTyping:
      case Syntax.DocTypingExpression:
        return mayResolveTypeAlias((<qt.ParenthesizedTyping | qt.OptionalTyping | qt.DocTypeReferencingNode | qt.NamedTupleMember>node).type);
      case Syntax.RestTyping:
        return (<qt.RestTyping>node).type.kind !== Syntax.ArrayTyping || mayResolveTypeAlias((<qt.ArrayTyping>(<qt.RestTyping>node).type).elemType);
      case Syntax.UnionTyping:
      case Syntax.IntersectionTyping:
        return some((<qt.UnionOrIntersectionTyping>node).types, mayResolveTypeAlias);
      case Syntax.IndexedAccessTyping:
        return mayResolveTypeAlias((<qt.IndexedAccessTyping>node).objectType) || mayResolveTypeAlias((<qt.IndexedAccessTyping>node).indexType);
      case Syntax.ConditionalTyping:
        return (
          mayResolveTypeAlias((<qt.ConditionalTyping>node).checkType) ||
          mayResolveTypeAlias((<qt.ConditionalTyping>node).extendsType) ||
          mayResolveTypeAlias((<qt.ConditionalTyping>node).trueType) ||
          mayResolveTypeAlias((<qt.ConditionalTyping>node).falseType)
        );
    }
    return false;
  }
  function sliceTupleType(type: qt.TupleTypeReference, index: number) {
    const tuple = type.target;
    if (tuple.hasRestElem) index = Math.min(index, getTypeReferenceArity(type) - 1);
    return createTupleType(
      getTypeArgs(type).slice(index),
      Math.max(0, tuple.minLength - index),
      tuple.hasRestElem,
      tuple.readonly,
      tuple.labeledElemDeclarations && tuple.labeledElemDeclarations.slice(index)
    );
  }
  function addTypesToUnion(typeSet: qt.Type[], includes: qt.TypeFlags, types: readonly qt.Type[]): qt.TypeFlags {
    for (const type of types) {
      includes = addTypeToUnion(typeSet, includes, type);
    }
    return includes;
  }
  function removeSubtypes(types: qt.Type[], primitivesOnly: boolean): boolean {
    const len = types.length;
    if (len === 0 || isSetOfLiteralsFromSameEnum(types)) return true;
    let i = len;
    let count = 0;
    while (i > 0) {
      i--;
      const source = types[i];
      for (const target of types) {
        if (source !== target) {
          if (count === 100000) {
            const estimatedCount = (count / (len - i)) * len;
            if (estimatedCount > (primitivesOnly ? 25000000 : 1000000)) {
              error(currentNode, qd.msgs.Expression_produces_a_union_type_that_is_too_complex_to_represent);
              return false;
            }
          }
          count++;
          if (
            qf.is.typeRelatedTo(source, target, strictSubtypeRelation) &&
            (!(getObjectFlags(getTargetType(source)) & ObjectFlags.Class) || !(getObjectFlags(getTargetType(target)) & ObjectFlags.Class) || qf.is.typeDerivedFrom(source, target))
          ) {
            orderedRemoveItemAt(types, i);
            break;
          }
        }
      }
    }
    return true;
  }
  function removeRedundantLiteralTypes(types: qt.Type[], includes: qt.TypeFlags) {
    let i = types.length;
    while (i > 0) {
      i--;
      const t = types[i];
      const remove =
        (t.flags & qt.TypeFlags.StringLiteral && includes & qt.TypeFlags.String) ||
        (t.flags & qt.TypeFlags.NumberLiteral && includes & qt.TypeFlags.Number) ||
        (t.flags & qt.TypeFlags.BigIntLiteral && includes & qt.TypeFlags.BigInt) ||
        (t.flags & qt.TypeFlags.UniqueESSymbol && includes & qt.TypeFlags.ESSymbol) ||
        (qf.is.freshLiteralType(t) && containsType(types, (<qt.LiteralType>t).regularType));
      if (remove) orderedRemoveItemAt(types, i);
    }
  }
  function typePredicateKindsMatch(a: qt.TypePredicate, b: qt.TypePredicate): boolean {
    return a.kind === b.kind && a.paramIndex === b.paramIndex;
  }
  function addTypeToIntersection(typeSet: qu.QMap<qt.Type>, includes: qt.TypeFlags, type: qt.Type) {
    const flags = type.flags;
    if (flags & qt.TypeFlags.Intersection) return addTypesToIntersection(typeSet, includes, (<qt.IntersectionType>type).types);
    if (isEmptyAnonymousObjectType(type)) {
      if (!(includes & qt.TypeFlags.IncludesEmptyObject)) {
        includes |= qt.TypeFlags.IncludesEmptyObject;
        typeSet.set(type.id.toString(), type);
      }
    } else {
      if (flags & qt.TypeFlags.AnyOrUnknown)
        if (type === wildcardType) includes |= qt.TypeFlags.IncludesWildcard;
        else if ((strictNullChecks || !(flags & qt.TypeFlags.Nullable)) && !typeSet.has(type.id.toString())) {
          if (type.flags & qt.TypeFlags.Unit && includes & qt.TypeFlags.Unit) includes |= qt.TypeFlags.NonPrimitive;
          typeSet.set(type.id.toString(), type);
        }
      includes |= flags & qt.TypeFlags.IncludesMask;
    }
    return includes;
  }
  function addTypesToIntersection(typeSet: qu.QMap<qt.Type>, includes: qt.TypeFlags, types: readonly qt.Type[]) {
    for (const type of types) {
      includes = addTypeToIntersection(typeSet, includes, getRegularTypeOfLiteralType(type));
    }
    return includes;
  }
  function removeRedundantPrimitiveTypes(types: qt.Type[], includes: qt.TypeFlags) {
    let i = types.length;
    while (i > 0) {
      i--;
      const t = types[i];
      const remove =
        (t.flags & qt.TypeFlags.String && includes & qt.TypeFlags.StringLiteral) ||
        (t.flags & qt.TypeFlags.Number && includes & qt.TypeFlags.NumberLiteral) ||
        (t.flags & qt.TypeFlags.BigInt && includes & qt.TypeFlags.BigIntLiteral) ||
        (t.flags & qt.TypeFlags.ESSymbol && includes & qt.TypeFlags.UniqueESSymbol);
      if (remove) orderedRemoveItemAt(types, i);
    }
  }
  function extractIrreducible(types: qt.Type[], flag: qt.TypeFlags) {
    if (every(types, (t) => !!(t.flags & qt.TypeFlags.Union) && some((t as qt.UnionType).types, (tt) => !!(tt.flags & flag)))) {
      for (let i = 0; i < types.length; i++) {
        types[i] = filterType(types[i], (t) => !(t.flags & flag));
      }
      return true;
    }
    return false;
  }
  function intersectUnionsOfPrimitiveTypes(types: qt.Type[]) {
    let unionTypes: qt.UnionType[] | undefined;
    const index = qf.find.index(types, (t) => !!(getObjectFlags(t) & ObjectFlags.PrimitiveUnion));
    if (index < 0) return false;
    let i = index + 1;
    while (i < types.length) {
      const t = types[i];
      if (getObjectFlags(t) & ObjectFlags.PrimitiveUnion) {
        (unionTypes || (unionTypes = [<qt.UnionType>types[index]])).push(<qt.UnionType>t);
        orderedRemoveItemAt(types, i);
      } else {
        i++;
      }
    }
    if (!unionTypes) return false;
    const checked: qt.Type[] = [];
    const result: qt.Type[] = [];
    for (const u of unionTypes) {
      for (const t of u.types) {
        if (insertType(checked, t)) {
          if (eachUnionContains(unionTypes, t)) insertType(result, t);
        }
      }
    }
    types[index] = qf.get.unionTypeFromSortedList(result, ObjectFlags.PrimitiveUnion);
    return true;
  }
  function substituteIndexedMappedType(objectType: qt.MappedType, index: qt.Type) {
    const mapper = createTypeMapper([getTypeParamFromMappedType(objectType)], [index]);
    const templateMapper = combineTypeMappers(objectType.mapper, mapper);
    return instantiateType(getTemplateTypeFromMappedType(objectType), templateMapper);
  }
  function tryMergeUnionOfObjectTypeAndEmptyObject(type: qt.UnionType, readonly: boolean): qt.Type | undefined {
    if (type.types.length === 2) {
      const firstType = type.types[0];
      const secondType = type.types[1];
      if (every(type.types, qf.is.emptyObjectTypeOrSpreadsIntoEmptyObject)) return qf.is.emptyObjectType(firstType) ? firstType : qf.is.emptyObjectType(secondType) ? secondType : emptyObjectType;
      if (qf.is.emptyObjectTypeOrSpreadsIntoEmptyObject(firstType) && isSinglePropertyAnonymousObjectType(secondType)) return getAnonymousPartialType(secondType);
      if (qf.is.emptyObjectTypeOrSpreadsIntoEmptyObject(secondType) && isSinglePropertyAnonymousObjectType(firstType)) return getAnonymousPartialType(firstType);
    }
    function getAnonymousPartialType(type: qt.Type) {
      const members = new qc.SymbolTable();
      for (const prop of qf.get.propertiesOfType(type)) {
        if (prop.declarationModifierFlags() & (ModifierFlags.Private | ModifierFlags.Protected)) {
        } else if (isSpreadableProperty(prop)) {
          const isSetonlyAccessor = prop.flags & qt.SymbolFlags.SetAccessor && !(prop.flags & qt.SymbolFlags.GetAccessor);
          const flags = qt.SymbolFlags.Property | qt.SymbolFlags.Optional;
          const result = new qc.Symbol(flags, prop.escName, readonly ? qt.CheckFlags.Readonly : 0);
          result.type = isSetonlyAccessor ? undefinedType : prop.typeOfSymbol();
          result.declarations = prop.declarations;
          result.nameType = prop.links.nameType;
          result.syntheticOrigin = prop;
          members.set(prop.escName, result);
        }
      }
      const spread = qf.create.anonymousType(type.symbol, members, qu.empty, qu.empty, qf.get.indexInfoOfType(type, IndexKind.String), qf.get.indexInfoOfType(type, IndexKind.Number));
      spread.objectFlags |= ObjectFlags.ObjectLiteral | ObjectFlags.ContainsObjectOrArrayLiteral;
      return spread;
    }
  }
  function combineTypeMappers(mapper1: qt.TypeMapper | undefined, mapper2: qt.TypeMapper): qt.TypeMapper {
    return mapper1 ? makeCompositeTypeMapper(TypeMapKind.Composite, mapper1, mapper2) : mapper2;
  }
  function mergeTypeMappers(mapper1: qt.TypeMapper | undefined, mapper2: qt.TypeMapper): qt.TypeMapper {
    return mapper1 ? makeCompositeTypeMapper(TypeMapKind.Merged, mapper1, mapper2) : mapper2;
  }
  function appendTypeMapping(mapper: qt.TypeMapper | undefined, source: qt.Type, target: qt.Type) {
    return !mapper ? makeUnaryTypeMapper(source, target) : makeCompositeTypeMapper(TypeMapKind.Merged, mapper, makeUnaryTypeMapper(source, target));
  }
  function cloneTypeParam(typeParam: qt.TypeParam): qt.TypeParam {
    const result = qf.create.typeParam(typeParam.symbol);
    result.target = typeParam;
    return result;
  }
  function maybeTypeParamReference(node: Node) {
    return !(
      node.kind === Syntax.QualifiedName ||
      (node.parent.kind === Syntax.TypingReference && (<qt.TypingReference>node.parent).typeArgs && node === (<qt.TypingReference>node.parent).typeName) ||
      (node.parent.kind === Syntax.ImportTyping && (node.parent as qt.ImportTyping).typeArgs && node === (node.parent as qt.ImportTyping).qualifier)
    );
  }
  function elaborateError(
    node: qt.Expression | undefined,
    source: qt.Type,
    target: qt.Type,
    relation: qu.QMap<RelationComparisonResult>,
    headMessage: qd.Message | undefined,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ): boolean {
    if (!node || isOrHasGenericConditional(target)) return false;
    if (!check.typeRelatedTo(source, target, relation, undefined) && elaborateDidYouMeanToCallOrConstruct(node, source, target, relation, headMessage, containingMessageChain, errorOutputContainer))
      return true;
    switch (node.kind) {
      case Syntax.JsxExpression:
      case Syntax.ParenthesizedExpression:
        return elaborateError((node as qt.ParenthesizedExpression | qt.JsxExpression).expression, source, target, relation, headMessage, containingMessageChain, errorOutputContainer);
      case Syntax.BinaryExpression:
        switch ((node as qt.BinaryExpression).operatorToken.kind) {
          case Syntax.EqualsToken:
          case Syntax.CommaToken:
            return elaborateError((node as qt.BinaryExpression).right, source, target, relation, headMessage, containingMessageChain, errorOutputContainer);
        }
        break;
      case Syntax.ObjectLiteralExpression:
        return elaborateObjectLiteral(node as qt.ObjectLiteralExpression, source, target, relation, containingMessageChain, errorOutputContainer);
      case Syntax.ArrayLiteralExpression:
        return elaborateArrayLiteral(node as qt.ArrayLiteralExpression, source, target, relation, containingMessageChain, errorOutputContainer);
      case Syntax.JsxAttributes:
        return elaborateJsxComponents(node as qt.JsxAttributes, source, target, relation, containingMessageChain, errorOutputContainer);
      case Syntax.ArrowFunction:
        return elaborateArrowFunction(node as qt.ArrowFunction, source, target, relation, containingMessageChain, errorOutputContainer);
    }
    return false;
  }
  function elaborateDidYouMeanToCallOrConstruct(
    node: qt.Expression,
    source: qt.Type,
    target: qt.Type,
    relation: qu.QMap<RelationComparisonResult>,
    headMessage: qd.Message | undefined,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ): boolean {
    const callSignatures = getSignaturesOfType(source, qt.SignatureKind.Call);
    const constructSignatures = getSignaturesOfType(source, qt.SignatureKind.Construct);
    for (const signatures of [constructSignatures, callSignatures]) {
      if (
        some(signatures, (s) => {
          const returnType = qf.get.returnTypeOfSignature(s);
          return !(returnType.flags & (TypeFlags.Any | qt.TypeFlags.Never)) && check.typeRelatedTo(returnType, target, relation, undefined);
        })
      ) {
        const resultObj: { errors?: qd.Diagnostic[] } = errorOutputContainer || {};
        check.typeAssignableTo(source, target, node, headMessage, containingMessageChain, resultObj);
        const diagnostic = resultObj.errors![resultObj.errors!.length - 1];
        addRelatedInfo(
          diagnostic,
          qf.create.diagForNode(node, signatures === constructSignatures ? qd.msgs.Did_you_mean_to_use_new_with_this_expression : qd.msgs.Did_you_mean_to_call_this_expression)
        );
        return true;
      }
    }
    return false;
  }
  function elaborateArrowFunction(
    node: qt.ArrowFunction,
    source: qt.Type,
    target: qt.Type,
    relation: qu.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ): boolean {
    if (node.body.kind === Syntax.Block) return false;
    if (some(node.params, qc.hasType)) return false;
    const sourceSig = getSingleCallSignature(source);
    if (!sourceSig) return false;
    const targetSignatures = getSignaturesOfType(target, qt.SignatureKind.Call);
    if (!length(targetSignatures)) return false;
    const returnExpression = node.body;
    const sourceReturn = qf.get.returnTypeOfSignature(sourceSig);
    const targetReturn = qf.get.unionType(map(targetSignatures, qf.get.returnTypeOfSignature));
    if (!check.typeRelatedTo(sourceReturn, targetReturn, relation, undefined)) {
      const elaborated = returnExpression && elaborateError(returnExpression, sourceReturn, targetReturn, relation, undefined, containingMessageChain, errorOutputContainer);
      if (elaborated) return elaborated;
      const resultObj: { errors?: qd.Diagnostic[] } = errorOutputContainer || {};
      check.typeRelatedTo(sourceReturn, targetReturn, relation, returnExpression, undefined, containingMessageChain, resultObj);
      if (resultObj.errors) {
        if (target.symbol && length(target.symbol.declarations)) {
          addRelatedInfo(
            resultObj.errors[resultObj.errors.length - 1],
            qf.create.diagForNode(target.symbol.declarations[0], qd.msgs.The_expected_type_comes_from_the_return_type_of_this_signature)
          );
        }
        if (
          (qf.get.functionFlags(node) & FunctionFlags.Async) === 0 &&
          !qf.get.typeOfPropertyOfType(sourceReturn, 'then' as qu.__String) &&
          check.typeRelatedTo(createPromiseType(sourceReturn), targetReturn, relation, undefined)
        ) {
          addRelatedInfo(resultObj.errors[resultObj.errors.length - 1], qf.create.diagForNode(node, qd.msgs.Did_you_mean_to_mark_this_function_as_async));
        }
        return true;
      }
    }
    return false;
  }
  type ElaborationIterator = IterableIterator<{
    errorNode: Node;
    innerExpression: qt.Expression | undefined;
    nameType: qt.Type;
    errorMessage?: qd.Message | undefined;
  }>;
  function elaborateElemwise(
    iterator: ElaborationIterator,
    source: qt.Type,
    target: qt.Type,
    relation: qu.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    let reportedError = false;
    for (let status = iterator.next(); !status.done; status = iterator.next()) {
      const { errorNode: prop, innerExpression: next, nameType, errorMessage } = status.value;
      const targetPropType = getBestMatchIndexedAccessTypeOrUndefined(source, target, nameType);
      if (!targetPropType || targetPropType.flags & qt.TypeFlags.IndexedAccess) continue;
      const sourcePropType = qf.get.indexedAccessTypeOrUndefined(source, nameType);
      if (sourcePropType && !check.typeRelatedTo(sourcePropType, targetPropType, relation, undefined)) {
        const elaborated = next && elaborateError(next, sourcePropType, targetPropType, relation, undefined, containingMessageChain, errorOutputContainer);
        if (elaborated) reportedError = true;
        else {
          const resultObj: { errors?: qd.Diagnostic[] } = errorOutputContainer || {};
          const specificSource = next ? check.expressionForMutableLocationWithContextualType(next, sourcePropType) : sourcePropType;
          const result = check.typeRelatedTo(specificSource, targetPropType, relation, prop, errorMessage, containingMessageChain, resultObj);
          if (result && specificSource !== sourcePropType) check.typeRelatedTo(sourcePropType, targetPropType, relation, prop, errorMessage, containingMessageChain, resultObj);
          if (resultObj.errors) {
            const reportedDiag = resultObj.errors[resultObj.errors.length - 1];
            const propertyName = qf.is.typeUsableAsPropertyName(nameType) ? getPropertyNameFromType(nameType) : undefined;
            const targetProp = propertyName !== undefined ? qf.get.propertyOfType(target, propertyName) : undefined;
            let issuedElaboration = false;
            if (!targetProp) {
              const indexInfo =
                (qf.is.typeAssignableToKind(nameType, qt.TypeFlags.NumberLike) && qf.get.indexInfoOfType(target, IndexKind.Number)) || qf.get.indexInfoOfType(target, IndexKind.String) || undefined;
              if (indexInfo && indexInfo.declaration && !indexInfo.declaration.sourceFile.hasNoDefaultLib) {
                issuedElaboration = true;
                addRelatedInfo(reportedDiag, qf.create.diagForNode(indexInfo.declaration, qd.msgs.The_expected_type_comes_from_this_index_signature));
              }
            }
            if (!issuedElaboration && ((targetProp && length(targetProp.declarations)) || (target.symbol && length(target.symbol.declarations)))) {
              const targetNode = targetProp && length(targetProp.declarations) ? targetProp.declarations[0] : target.symbol.declarations[0];
              if (!targetNode.sourceFile.hasNoDefaultLib) {
                addRelatedInfo(
                  reportedDiag,
                  qf.create.diagForNode(
                    targetNode,
                    qd.msgs.The_expected_type_comes_from_property_0_which_is_declared_here_on_type_1,
                    propertyName && !(nameType.flags & qt.TypeFlags.UniqueESSymbol) ? qy.get.unescUnderscores(propertyName) : typeToString(nameType),
                    typeToString(target)
                  )
                );
              }
            }
          }
          reportedError = true;
        }
      }
    }
    return reportedError;
  }
  function* generateJsxAttributes(node: qt.JsxAttributes): ElaborationIterator {
    if (!length(node.properties)) return;
    for (const prop of node.properties) {
      if (prop.kind === Syntax.JsxSpreadAttribute) continue;
      yield { errorNode: prop.name, innerExpression: prop.initer, nameType: qf.get.literalType(idText(prop.name)) };
    }
  }
  function* generateJsxChildren(node: qt.JsxElem, getInvalidTextDiagnostic: () => qd.Message): ElaborationIterator {
    if (!length(node.children)) return;
    let memberOffset = 0;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const nameType = qf.get.literalType(i - memberOffset);
      const elem = getElaborationElemForJsxChild(child, nameType, getInvalidTextDiagnostic);
      if (elem) yield elem;
      else {
        memberOffset++;
      }
    }
  }
  function elaborateJsxComponents(
    node: qt.JsxAttributes,
    source: qt.Type,
    target: qt.Type,
    relation: qu.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    let result = elaborateElemwise(generateJsxAttributes(node), source, target, relation, containingMessageChain, errorOutputContainer);
    let invalidTextDiagnostic: qd.Message | undefined;
    if (node.parent.kind === Syntax.JsxOpeningElem && node.parent.parent.kind === Syntax.JsxElem) {
      const containingElem = node.parent.parent;
      const childPropName = getJsxElemChildrenPropertyName(getJsxNamespaceAt(node));
      const childrenPropName = childPropName === undefined ? 'children' : qy.get.unescUnderscores(childPropName);
      const childrenNameType = qf.get.literalType(childrenPropName);
      const childrenTargetType = qf.get.indexedAccessType(target, childrenNameType);
      const validChildren = getSemanticJsxChildren(containingElem.children);
      if (!length(validChildren)) return result;
      const moreThanOneRealChildren = length(validChildren) > 1;
      const arrayLikeTargetParts = filterType(childrenTargetType, isArrayOrTupleLikeType);
      const nonArrayLikeTargetParts = filterType(childrenTargetType, (t) => !isArrayOrTupleLikeType(t));
      if (moreThanOneRealChildren) {
        if (arrayLikeTargetParts !== neverType) {
          const realSource = createTupleType(check.jsxChildren(containingElem, CheckMode.Normal));
          const children = generateJsxChildren(containingElem, getInvalidTextualChildDiagnostic);
          result = elaborateElemwise(children, realSource, arrayLikeTargetParts, relation, containingMessageChain, errorOutputContainer) || result;
        } else if (!qf.is.typeRelatedTo(qf.get.indexedAccessType(source, childrenNameType), childrenTargetType, relation)) {
          result = true;
          const diag = error(
            containingElem.opening.tagName,
            qd.msgs.This_JSX_tag_s_0_prop_expects_a_single_child_of_type_1_but_multiple_children_were_provided,
            childrenPropName,
            typeToString(childrenTargetType)
          );
          if (errorOutputContainer && errorOutputContainer.skipLogging) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
        }
      } else {
        if (nonArrayLikeTargetParts !== neverType) {
          const child = validChildren[0];
          const elem = getElaborationElemForJsxChild(child, childrenNameType, getInvalidTextualChildDiagnostic);
          if (elem) {
            result =
              elaborateElemwise(
                (function* () {
                  yield elem;
                })(),
                source,
                target,
                relation,
                containingMessageChain,
                errorOutputContainer
              ) || result;
          }
        } else if (!qf.is.typeRelatedTo(qf.get.indexedAccessType(source, childrenNameType), childrenTargetType, relation)) {
          result = true;
          const diag = error(
            containingElem.opening.tagName,
            qd.msgs.This_JSX_tag_s_0_prop_expects_type_1_which_requires_multiple_children_but_only_a_single_child_was_provided,
            childrenPropName,
            typeToString(childrenTargetType)
          );
          if (errorOutputContainer && errorOutputContainer.skipLogging) (errorOutputContainer.errors || (errorOutputContainer.errors = [])).push(diag);
        }
      }
    }
    return result;
    function getInvalidTextualChildDiagnostic() {
      if (!invalidTextDiagnostic) {
        const tagNameText = qf.get.textOf(node.parent.tagName);
        const childPropName = getJsxElemChildrenPropertyName(getJsxNamespaceAt(node));
        const childrenPropName = childPropName === undefined ? 'children' : qy.get.unescUnderscores(childPropName);
        const childrenTargetType = qf.get.indexedAccessType(target, qf.get.literalType(childrenPropName));
        const diagnostic = qd.msgs._0_components_don_t_accept_text_as_child_elems_Text_in_JSX_has_the_type_string_but_the_expected_type_of_1_is_2;
        invalidTextDiagnostic = {
          ...diagnostic,
          key: '!!ALREADY FORMATTED!!',
          message: formatMessage(undefined, diagnostic, tagNameText, childrenPropName, typeToString(childrenTargetType)),
        };
      }
      return invalidTextDiagnostic;
    }
  }
  function* generateLimitedTupleElems(node: qt.ArrayLiteralExpression, target: qt.Type): ElaborationIterator {
    const len = length(node.elems);
    if (!len) return;
    for (let i = 0; i < len; i++) {
      if (qf.is.tupleLikeType(target) && !qf.get.propertyOfType(target, ('' + i) as qu.__String)) continue;
      const elem = node.elems[i];
      if (elem.kind === Syntax.OmittedExpression) continue;
      const nameType = qf.get.literalType(i);
      yield { errorNode: elem, innerExpression: elem, nameType };
    }
  }
  function elaborateArrayLiteral(
    node: qt.ArrayLiteralExpression,
    source: qt.Type,
    target: qt.Type,
    relation: qu.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    if (target.flags & qt.TypeFlags.Primitive) return false;
    if (qf.is.tupleLikeType(source)) return elaborateElemwise(generateLimitedTupleElems(node, target), source, target, relation, containingMessageChain, errorOutputContainer);
    const oldContext = node.contextualType;
    node.contextualType = target;
    try {
      const tupleizedType = check.arrayLiteral(node, CheckMode.Contextual, true);
      node.contextualType = oldContext;
      if (qf.is.tupleLikeType(tupleizedType)) return elaborateElemwise(generateLimitedTupleElems(node, target), tupleizedType, target, relation, containingMessageChain, errorOutputContainer);
      return false;
    } finally {
      node.contextualType = oldContext;
    }
  }
  function* generateObjectLiteralElems(node: qt.ObjectLiteralExpression): ElaborationIterator {
    if (!length(node.properties)) return;
    for (const prop of node.properties) {
      if (prop.kind === Syntax.SpreadAssignment) continue;
      const type = qf.get.literalTypeFromProperty(qf.get.symbolOfNode(prop), qt.TypeFlags.StringOrNumberLiteralOrUnique);
      if (!type || type.flags & qt.TypeFlags.Never) continue;
      switch (prop.kind) {
        case Syntax.SetAccessor:
        case Syntax.GetAccessor:
        case Syntax.MethodDeclaration:
        case Syntax.ShorthandPropertyAssignment:
          yield { errorNode: prop.name, innerExpression: undefined, nameType: type };
          break;
        case Syntax.PropertyAssignment:
          yield {
            errorNode: prop.name,
            innerExpression: prop.initer,
            nameType: type,
            errorMessage: qf.is.computedNonLiteralName(prop.name) ? qd.msgs.Type_of_computed_property_s_value_is_0_which_is_not_assignable_to_type_1 : undefined,
          };
          break;
        default:
          qc.assert.never(prop);
      }
    }
  }
  function elaborateObjectLiteral(
    node: qt.ObjectLiteralExpression,
    source: qt.Type,
    target: qt.Type,
    relation: qu.QMap<RelationComparisonResult>,
    containingMessageChain: (() => qd.MessageChain | undefined) | undefined,
    errorOutputContainer: { errors?: qd.Diagnostic[]; skipLogging?: boolean } | undefined
  ) {
    if (target.flags & qt.TypeFlags.Primitive) return false;
    return elaborateElemwise(generateObjectLiteralElems(node), source, target, relation, containingMessageChain, errorOutputContainer);
  }
  type ErrorReporter = (message: qd.Message, arg0?: string, arg1?: string) => void;
  function compareTypePredicateRelatedTo(
    source: qt.TypePredicate,
    target: qt.TypePredicate,
    reportErrors: boolean,
    errorReporter: ErrorReporter | undefined,
    compareTypes: (s: qt.Type, t: qt.Type, reportErrors?: boolean) => qt.Ternary
  ): qt.Ternary {
    if (source.kind !== target.kind) {
      if (reportErrors) {
        errorReporter!(qd.msgs.A_this_based_type_guard_is_not_compatible_with_a_param_based_type_guard);
        errorReporter!(qd.msgs.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
      }
      return qt.Ternary.False;
    }
    if (source.kind === qt.TypePredicateKind.Identifier || source.kind === qt.TypePredicateKind.AssertsIdentifier) {
      if (source.paramIndex !== (target as qt.IdentifierTypePredicate).paramIndex) {
        if (reportErrors) {
          errorReporter!(qd.msgs.Param_0_is_not_in_the_same_position_as_param_1, source.paramName, (target as qt.IdentifierTypePredicate).paramName);
          errorReporter!(qd.msgs.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
        }
        return qt.Ternary.False;
      }
    }
    const related = source.type === target.type ? qt.Ternary.True : source.type && target.type ? compareTypes(source.type, target.type, reportErrors) : qt.Ternary.False;
    if (related === qt.Ternary.False && reportErrors) errorReporter!(qd.msgs.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
    return related;
  }
  function discriminateTypeByDiscriminableItems(
    target: qt.UnionType,
    discriminators: [() => qt.Type, qu.__String][],
    related: (source: qt.Type, target: qt.Type) => boolean | qt.Ternary,
    defaultValue?: undefined,
    skipPartial?: boolean
  ): qt.Type | undefined;
  function discriminateTypeByDiscriminableItems(
    target: qt.UnionType,
    discriminators: [() => qt.Type, qu.__String][],
    related: (source: qt.Type, target: qt.Type) => boolean | qt.Ternary,
    defaultValue: qt.Type,
    skipPartial?: boolean
  ): qt.Type;
  function discriminateTypeByDiscriminableItems(
    target: qt.UnionType,
    discriminators: [() => qt.Type, qu.__String][],
    related: (source: qt.Type, target: qt.Type) => boolean | qt.Ternary,
    defaultValue?: qt.Type,
    skipPartial?: boolean
  ) {
    const discriminable = target.types.map((_) => undefined) as (boolean | undefined)[];
    for (const [getDiscriminatingType, propertyName] of discriminators) {
      const targetProp = getUnionOrIntersectionProperty(target, propertyName);
      if (skipPartial && targetProp && targetProp.checkFlags() & qt.CheckFlags.ReadPartial) continue;
      let i = 0;
      for (const type of target.types) {
        const targetType = qf.get.typeOfPropertyOfType(type, propertyName);
        if (targetType && related(getDiscriminatingType(), targetType)) discriminable[i] = discriminable[i] === undefined ? true : discriminable[i];
        else {
          discriminable[i] = false;
        }
        i++;
      }
    }
    const match = discriminable.indexOf(true);
    return match === -1 || discriminable.indexOf(true, match + 1) !== -1 ? defaultValue : target.types[match];
  }
  function compareTypePredicatesIdentical(source: qt.TypePredicate | undefined, target: qt.TypePredicate | undefined, compareTypes: (s: qt.Type, t: qt.Type) => qt.Ternary): qt.Ternary {
    return !(source && target && typePredicateKindsMatch(source, target))
      ? qt.Ternary.False
      : source.type === target.type
      ? qt.Ternary.True
      : source.type && target.type
      ? compareTypes(source.type, target.type)
      : qt.Ternary.False;
  }
  function literalTypesWithSameBaseType(types: qt.Type[]): boolean {
    let commonBaseType: qt.Type | undefined;
    for (const t of types) {
      const baseType = getBaseTypeOfLiteralType(t);
      if (!commonBaseType) commonBaseType = baseType;
      if (baseType === t || baseType !== commonBaseType) return false;
    }
    return true;
  }
  function reportImplicitAny(declaration: qt.Declaration, type: qt.Type, wideningKind?: WideningKind) {
    const typeAsString = typeToString(qf.get.widenedType(type));
    if (qf.is.inJSFile(declaration) && !declaration.sourceFile.isCheckJsEnabled(compilerOpts)) return;
    let diagnostic: qd.Message;
    switch (declaration.kind) {
      case Syntax.BinaryExpression:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
        diagnostic = noImplicitAny ? qd.msgs.Member_0_implicitly_has_an_1_type : qd.msgs.Member_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage;
        break;
      case Syntax.Param:
        const param = declaration as qt.ParamDeclaration;
        if (
          param.name.kind === Syntax.Identifier &&
          (param.parent.kind === Syntax.CallSignatureDeclaration || param.parent.kind === Syntax.MethodSignature || param.parent.kind === Syntax.FunctionTyping) &&
          param.parent.params.indexOf(param) > -1 &&
          (resolveName(param, param.name.escapedText, qt.SymbolFlags.Type, undefined, param.name.escapedText, true) ||
            (param.name.originalKeywordKind && qy.is.typeNode(param.name.originalKeywordKind)))
        ) {
          const newName = 'arg' + param.parent.params.indexOf(param);
          errorOrSuggestion(noImplicitAny, declaration, qd.msgs.Param_has_a_name_but_no_type_Did_you_mean_0_Colon_1, newName, declarationNameToString(param.name));
          return;
        }
        diagnostic = (<qt.ParamDeclaration>declaration).dot3Token
          ? noImplicitAny
            ? qd.msgs.Rest_param_0_implicitly_has_an_any_type
            : qd.msgs.Rest_param_0_implicitly_has_an_any_type_but_a_better_type_may_be_inferred_from_usage
          : noImplicitAny
          ? qd.msgs.Param_0_implicitly_has_an_1_type
          : qd.msgs.Param_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage;
        break;
      case Syntax.BindingElem:
        diagnostic = qd.msgs.Binding_elem_0_implicitly_has_an_1_type;
        if (!noImplicitAny) return;
        break;
      case Syntax.DocFunctionTyping:
        error(declaration, qd.msgs.Function_type_which_lacks_return_type_annotation_implicitly_has_an_0_return_type, typeAsString);
        return;
      case Syntax.FunctionDeclaration:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
        if (noImplicitAny && !(declaration as qt.NamedDecl).name) {
          if (wideningKind === WideningKind.GeneratorYield)
            error(declaration, qd.msgs.Generator_implicitly_has_yield_type_0_because_it_does_not_yield_any_values_Consider_supplying_a_return_type_annotation, typeAsString);
          else {
            error(declaration, qd.msgs.Function_expression_which_lacks_return_type_annotation_implicitly_has_an_0_return_type, typeAsString);
          }
          return;
        }
        diagnostic = !noImplicitAny
          ? qd.msgs._0_implicitly_has_an_1_return_type_but_a_better_type_may_be_inferred_from_usage
          : wideningKind === WideningKind.GeneratorYield
          ? qd.msgs._0_which_lacks_return_type_annotation_implicitly_has_an_1_yield_type
          : qd.msgs._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type;
        break;
      case Syntax.MappedTyping:
        if (noImplicitAny) error(declaration, qd.msgs.Mapped_object_type_implicitly_has_an_any_template_type);
        return;
      default:
        diagnostic = noImplicitAny ? qd.msgs.Variable_0_implicitly_has_an_1_type : qd.msgs.Variable_0_implicitly_has_an_1_type_but_a_better_type_may_be_inferred_from_usage;
    }
    errorOrSuggestion(noImplicitAny, declaration, diagnostic, declarationNameToString(qf.decl.nameOf(declaration)), typeAsString);
  }
  function reportErrorsFromWidening(declaration: qt.Declaration, type: qt.Type, wideningKind?: WideningKind) {
    if (
      produceDiagnostics &&
      noImplicitAny &&
      getObjectFlags(type) & ObjectFlags.ContainsWideningType &&
      (!wideningKind || !getContextualSignatureForFunctionLikeDeclaration(declaration as qt.FunctionLikeDeclaration))
    ) {
      if (!reportWideningErrorsInType(type)) reportImplicitAny(declaration, type, wideningKind);
    }
  }
  function cloneInferenceContext<T extends qt.InferenceContext | undefined>(context: T, extraFlags: InferenceFlags = 0): qt.InferenceContext | (T & undefined) {
    return context && createInferenceContextWorker(map(context.inferences, cloneInferenceInfo), context.signature, context.flags | extraFlags, context.compareTypes);
  }
  function mapToInferredType(context: qt.InferenceContext, t: qt.Type, fix: boolean): qt.Type {
    const inferences = context.inferences;
    for (let i = 0; i < inferences.length; i++) {
      const inference = inferences[i];
      if (t === inference.typeParam) {
        if (fix && !inference.isFixed) {
          clearCachedInferences(inferences);
          inference.isFixed = true;
        }
        return getInferredType(context, i);
      }
    }
    return t;
  }
  function clearCachedInferences(inferences: qt.InferenceInfo[]) {
    for (const inference of inferences) {
      if (!inference.isFixed) inference.inferredType = undefined;
    }
  }
  function cloneInferenceInfo(inference: qt.InferenceInfo): qt.InferenceInfo {
    return {
      typeParam: inference.typeParam,
      candidates: inference.candidates && inference.candidates.slice(),
      contraCandidates: inference.contraCandidates && inference.contraCandidates.slice(),
      inferredType: inference.inferredType,
      priority: inference.priority,
      topLevel: inference.topLevel,
      isFixed: inference.isFixed,
    };
  }
  function cloneInferredPartOfContext(context: qt.InferenceContext): qt.InferenceContext | undefined {
    const inferences = filter(context.inferences, hasInferenceCandidates);
    return inferences.length ? createInferenceContextWorker(map(inferences, cloneInferenceInfo), context.signature, context.flags, context.compareTypes) : undefined;
  }
  function tupleTypesDefinitelyUnrelated(source: qt.TupleTypeReference, target: qt.TupleTypeReference) {
    return target.target.minLength > source.target.minLength || (!getRestTypeOfTupleType(target) && (!!getRestTypeOfTupleType(source) || getLengthOfTupleType(target) < getLengthOfTupleType(source)));
  }
  function inferTypes(inferences: qt.InferenceInfo[], originalSource: qt.Type, originalTarget: qt.Type, priority: InferencePriority = 0, contravariant = false) {
    let symbolOrTypeStack: (Symbol | qt.Type)[];
    let visited: qu.QMap<number>;
    let bivariant = false;
    let propagationType: qt.Type;
    let inferencePriority = InferencePriority.MaxValue;
    let allowComplexConstraintInference = true;
    inferFromTypes(originalSource, originalTarget);
    function inferFromTypes(source: qt.Type, target: qt.Type): void {
      if (!couldContainTypeVariables(target)) return;
      if (source === wildcardType) {
        const savePropagationType = propagationType;
        propagationType = source;
        inferFromTypes(target, target);
        propagationType = savePropagationType;
        return;
      }
      if (source.aliasSymbol && source.aliasTypeArgs && source.aliasSymbol === target.aliasSymbol) {
        inferFromTypeArgs(source.aliasTypeArgs, target.aliasTypeArgs!, getAliasVariances(source.aliasSymbol));
        return;
      }
      if (source === target && source.flags & qt.TypeFlags.UnionOrIntersection) {
        for (const t of (<qt.UnionOrIntersectionType>source).types) {
          inferFromTypes(t, t);
        }
        return;
      }
      if (target.flags & qt.TypeFlags.Union) {
        const [tempSources, tempTargets] = inferFromMatchingTypes(source.flags & qt.TypeFlags.Union ? (<qt.UnionType>source).types : [source], (<qt.UnionType>target).types, isTypeOrBaseIdenticalTo);
        const [sources, targets] = inferFromMatchingTypes(tempSources, tempTargets, isTypeCloselyMatchedBy);
        if (targets.length === 0) return;
        target = qf.get.unionType(targets);
        if (sources.length === 0) {
          inferWithPriority(source, target, InferencePriority.NakedTypeVariable);
          return;
        }
        source = qf.get.unionType(sources);
      } else if (
        target.flags & qt.TypeFlags.Intersection &&
        some((<qt.IntersectionType>target).types, (t) => !!getInferenceInfoForType(t) || (qf.is.genericMappedType(t) && !!getInferenceInfoForType(qf.get.homomorphicTypeVariable(t) || neverType)))
      ) {
        if (!(source.flags & qt.TypeFlags.Union)) {
          const [sources, targets] = inferFromMatchingTypes(
            source.flags & qt.TypeFlags.Intersection ? (<qt.IntersectionType>source).types : [source],
            (<qt.IntersectionType>target).types,
            qf.is.typeIdenticalTo
          );
          if (sources.length === 0 || targets.length === 0) return;
          source = qf.get.intersectionType(sources);
          target = qf.get.intersectionType(targets);
        }
      } else if (target.flags & (TypeFlags.IndexedAccess | qt.TypeFlags.Substitution)) {
        target = getActualTypeVariable(target);
      }
      if (target.flags & qt.TypeFlags.TypeVariable) {
        if (
          getObjectFlags(source) & ObjectFlags.NonInferrableType ||
          source === nonInferrableAnyType ||
          source === silentNeverType ||
          (priority & InferencePriority.ReturnType && (source === autoType || source === autoArrayType)) ||
          isFromInferenceBlockedSource(source)
        ) {
          return;
        }
        const inference = getInferenceInfoForType(target);
        if (inference) {
          if (!inference.isFixed) {
            if (inference.priority === undefined || priority < inference.priority) {
              inference.candidates = undefined;
              inference.contraCandidates = undefined;
              inference.topLevel = true;
              inference.priority = priority;
            }
            if (priority === inference.priority) {
              const candidate = propagationType || source;
              if (contravariant && !bivariant) {
                if (!contains(inference.contraCandidates, candidate)) {
                  inference.contraCandidates = append(inference.contraCandidates, candidate);
                  clearCachedInferences(inferences);
                }
              } else if (!contains(inference.candidates, candidate)) {
                inference.candidates = append(inference.candidates, candidate);
                clearCachedInferences(inferences);
              }
            }
            if (
              !(priority & InferencePriority.ReturnType) &&
              target.flags & qt.TypeFlags.TypeParam &&
              inference.topLevel &&
              !qf.is.typeParamAtTopLevel(originalTarget, <qt.TypeParam>target)
            ) {
              inference.topLevel = false;
              clearCachedInferences(inferences);
            }
          }
          inferencePriority = Math.min(inferencePriority, priority);
          return;
        } else {
          const simplified = getSimplifiedType(target, false);
          if (simplified !== target) invokeOnce(source, simplified, inferFromTypes);
          else if (target.flags & qt.TypeFlags.IndexedAccess) {
            const indexType = getSimplifiedType((target as qt.IndexedAccessType).indexType, false);
            if (indexType.flags & qt.TypeFlags.Instantiable) {
              const simplified = distributeIndexOverObjectType(getSimplifiedType((target as qt.IndexedAccessType).objectType, false), indexType, false);
              if (simplified && simplified !== target) invokeOnce(source, simplified, inferFromTypes);
            }
          }
        }
      }
      if (
        getObjectFlags(source) & ObjectFlags.Reference &&
        getObjectFlags(target) & ObjectFlags.Reference &&
        ((<qt.TypeReference>source).target === (<qt.TypeReference>target).target || (qf.is.arrayType(source) && qf.is.arrayType(target))) &&
        !((<qt.TypeReference>source).node && (<qt.TypeReference>target).node)
      ) {
        inferFromTypeArgs(getTypeArgs(<qt.TypeReference>source), getTypeArgs(<qt.TypeReference>target), getVariances((<qt.TypeReference>source).target));
      } else if (source.flags & qt.TypeFlags.Index && target.flags & qt.TypeFlags.Index) {
        contravariant = !contravariant;
        inferFromTypes((<qt.IndexType>source).type, (<qt.IndexType>target).type);
        contravariant = !contravariant;
      } else if ((qf.is.literalType(source) || source.flags & qt.TypeFlags.String) && target.flags & qt.TypeFlags.Index) {
        const empty = createEmptyObjectTypeFromStringLiteral(source);
        contravariant = !contravariant;
        inferWithPriority(empty, (target as qt.IndexType).type, InferencePriority.LiteralKeyof);
        contravariant = !contravariant;
      } else if (source.flags & qt.TypeFlags.IndexedAccess && target.flags & qt.TypeFlags.IndexedAccess) {
        inferFromTypes((<qt.IndexedAccessType>source).objectType, (<qt.IndexedAccessType>target).objectType);
        inferFromTypes((<qt.IndexedAccessType>source).indexType, (<qt.IndexedAccessType>target).indexType);
      } else if (source.flags & qt.TypeFlags.Conditional && target.flags & qt.TypeFlags.Conditional) {
        inferFromTypes((<qt.ConditionalType>source).checkType, (<qt.ConditionalType>target).checkType);
        inferFromTypes((<qt.ConditionalType>source).extendsType, (<qt.ConditionalType>target).extendsType);
        inferFromTypes(getTrueTypeFromConditionalType(<qt.ConditionalType>source), getTrueTypeFromConditionalType(<qt.ConditionalType>target));
        inferFromTypes(getFalseTypeFromConditionalType(<qt.ConditionalType>source), getFalseTypeFromConditionalType(<qt.ConditionalType>target));
      } else if (target.flags & qt.TypeFlags.Conditional) {
        const savePriority = priority;
        priority |= contravariant ? InferencePriority.ContravariantConditional : 0;
        const targetTypes = [getTrueTypeFromConditionalType(<qt.ConditionalType>target), getFalseTypeFromConditionalType(<qt.ConditionalType>target)];
        inferToMultipleTypes(source, targetTypes, target.flags);
        priority = savePriority;
      } else if (target.flags & qt.TypeFlags.UnionOrIntersection) {
        inferToMultipleTypes(source, (<qt.UnionOrIntersectionType>target).types, target.flags);
      } else if (source.flags & qt.TypeFlags.Union) {
        const sourceTypes = (<qt.UnionOrIntersectionType>source).types;
        for (const sourceType of sourceTypes) {
          inferFromTypes(sourceType, target);
        }
      } else {
        source = getReducedType(source);
        if (!(priority & InferencePriority.NoConstraints && source.flags & (TypeFlags.Intersection | qt.TypeFlags.Instantiable))) {
          const apparentSource = getApparentType(source);
          if (apparentSource !== source && allowComplexConstraintInference && !(apparentSource.flags & (TypeFlags.Object | qt.TypeFlags.Intersection))) {
            allowComplexConstraintInference = false;
            return inferFromTypes(apparentSource, target);
          }
          source = apparentSource;
        }
        if (source.flags & (TypeFlags.Object | qt.TypeFlags.Intersection)) invokeOnce(source, target, inferFromObjectTypes);
      }
      if (source.flags & qt.TypeFlags.Simplifiable) {
        const simplified = getSimplifiedType(source, contravariant);
        if (simplified !== source) inferFromTypes(simplified, target);
      }
    }
    function inferWithPriority(source: qt.Type, target: qt.Type, newPriority: InferencePriority) {
      const savePriority = priority;
      priority |= newPriority;
      inferFromTypes(source, target);
      priority = savePriority;
    }
    function invokeOnce(source: qt.Type, target: qt.Type, action: (source: qt.Type, target: qt.Type) => void) {
      const key = source.id + ',' + target.id;
      const status = visited && visited.get(key);
      if (status !== undefined) {
        inferencePriority = Math.min(inferencePriority, status);
        return;
      }
      (visited || (visited = new qu.QMap<number>())).set(key, InferencePriority.Circularity);
      const saveInferencePriority = inferencePriority;
      inferencePriority = InferencePriority.MaxValue;
      action(source, target);
      visited.set(key, inferencePriority);
      inferencePriority = Math.min(inferencePriority, saveInferencePriority);
    }
    function inferFromMatchingTypes(sources: qt.Type[], targets: qt.Type[], matches: (s: qt.Type, t: qt.Type) => boolean): [Type[], qt.Type[]] {
      let matchedSources: qt.Type[] | undefined;
      let matchedTargets: qt.Type[] | undefined;
      for (const t of targets) {
        for (const s of sources) {
          if (matches(s, t)) {
            inferFromTypes(s, t);
            matchedSources = appendIfUnique(matchedSources, s);
            matchedTargets = appendIfUnique(matchedTargets, t);
          }
        }
      }
      return [matchedSources ? filter(sources, (t) => !contains(matchedSources, t)) : sources, matchedTargets ? filter(targets, (t) => !contains(matchedTargets, t)) : targets];
    }
    function inferFromTypeArgs(sourceTypes: readonly qt.Type[], targetTypes: readonly qt.Type[], variances: readonly VarianceFlags[]) {
      const count = sourceTypes.length < targetTypes.length ? sourceTypes.length : targetTypes.length;
      for (let i = 0; i < count; i++) {
        if (i < variances.length && (variances[i] & VarianceFlags.VarianceMask) === VarianceFlags.Contravariant) inferFromContravariantTypes(sourceTypes[i], targetTypes[i]);
        else {
          inferFromTypes(sourceTypes[i], targetTypes[i]);
        }
      }
    }
    function inferFromContravariantTypes(source: qt.Type, target: qt.Type) {
      if (strictFunctionTypes || priority & InferencePriority.AlwaysStrict) {
        contravariant = !contravariant;
        inferFromTypes(source, target);
        contravariant = !contravariant;
      } else {
        inferFromTypes(source, target);
      }
    }
    function getInferenceInfoForType(type: qt.Type) {
      if (type.flags & qt.TypeFlags.TypeVariable) {
        for (const inference of inferences) {
          if (type === inference.typeParam) return inference;
        }
      }
      return;
    }
    function getSingleTypeVariableFromIntersectionTypes(types: qt.Type[]) {
      let typeVariable: qt.Type | undefined;
      for (const type of types) {
        const t = type.flags & qt.TypeFlags.Intersection && qf.find.up((<qt.IntersectionType>type).types, (t) => !!getInferenceInfoForType(t));
        if (!t || (typeVariable && t !== typeVariable)) return;
        typeVariable = t;
      }
      return typeVariable;
    }
    function inferToMultipleTypes(source: qt.Type, targets: qt.Type[], f: qt.TypeFlags) {
      let typeVariableCount = 0;
      if (f & qt.TypeFlags.Union) {
        let nakedTypeVariable: qt.Type | undefined;
        const sources = source.flags & qt.TypeFlags.Union ? (<qt.UnionType>source).types : [source];
        const matched = new Array<boolean>(sources.length);
        let inferenceCircularity = false;
        for (const t of targets) {
          if (getInferenceInfoForType(t)) {
            nakedTypeVariable = t;
            typeVariableCount++;
          } else {
            for (let i = 0; i < sources.length; i++) {
              const saveInferencePriority = inferencePriority;
              inferencePriority = InferencePriority.MaxValue;
              inferFromTypes(sources[i], t);
              if (inferencePriority === priority) matched[i] = true;
              inferenceCircularity = inferenceCircularity || inferencePriority === InferencePriority.Circularity;
              inferencePriority = Math.min(inferencePriority, saveInferencePriority);
            }
          }
        }
        if (typeVariableCount === 0) {
          const intersectionTypeVariable = getSingleTypeVariableFromIntersectionTypes(targets);
          if (intersectionTypeVariable) inferWithPriority(source, intersectionTypeVariable, InferencePriority.NakedTypeVariable);
          return;
        }
        if (typeVariableCount === 1 && !inferenceCircularity) {
          const unmatched = flatMap(sources, (s, i) => (matched[i] ? undefined : s));
          if (unmatched.length) {
            inferFromTypes(qf.get.unionType(unmatched), nakedTypeVariable!);
            return;
          }
        }
      } else {
        for (const t of targets) {
          if (getInferenceInfoForType(t)) typeVariableCount++;
          else {
            inferFromTypes(source, t);
          }
        }
      }
      if (f & qt.TypeFlags.Intersection ? typeVariableCount === 1 : typeVariableCount > 0) {
        for (const t of targets) {
          if (getInferenceInfoForType(t)) inferWithPriority(source, t, InferencePriority.NakedTypeVariable);
        }
      }
    }
    function inferToMappedType(source: qt.Type, target: qt.MappedType, constraintType: qt.Type): boolean {
      if (constraintType.flags & qt.TypeFlags.Union) {
        let result = false;
        for (const type of (constraintType as qt.UnionType).types) {
          result = inferToMappedType(source, target, type) || result;
        }
        return result;
      }
      if (constraintType.flags & qt.TypeFlags.Index) {
        const inference = getInferenceInfoForType((<qt.IndexType>constraintType).type);
        if (inference && !inference.isFixed && !isFromInferenceBlockedSource(source)) {
          const inferredType = inferTypeForHomomorphicMappedType(source, target, <qt.IndexType>constraintType);
          if (inferredType) {
            inferWithPriority(
              inferredType,
              inference.typeParam,
              getObjectFlags(source) & ObjectFlags.NonInferrableType ? InferencePriority.PartialHomomorphicMappedType : InferencePriority.HomomorphicMappedType
            );
          }
        }
        return true;
      }
      if (constraintType.flags & qt.TypeFlags.TypeParam) {
        inferWithPriority(qf.get.indexType(source), constraintType, InferencePriority.MappedTypeConstraint);
        const extendedConstraint = getConstraintOfType(constraintType);
        if (extendedConstraint && inferToMappedType(source, target, extendedConstraint)) return true;
        const propTypes = map(qf.get.propertiesOfType(source), qf.get.typeOfSymbol);
        const stringIndexType = qf.get.indexTypeOfType(source, IndexKind.String);
        const numberIndexInfo = getNonEnumNumberIndexInfo(source);
        const numberIndexType = numberIndexInfo && numberIndexInfo.type;
        inferFromTypes(qf.get.unionType(append(append(propTypes, stringIndexType), numberIndexType)), getTemplateTypeFromMappedType(target));
        return true;
      }
      return false;
    }
    function inferFromObjectTypes(source: qt.Type, target: qt.Type) {
      const isNonConstructorObject = target.flags & qt.TypeFlags.Object && !(getObjectFlags(target) & ObjectFlags.Anonymous && target.symbol && target.symbol.flags & qt.SymbolFlags.Class);
      const symbolOrType = isNonConstructorObject ? (qf.is.tupleType(target) ? target.target : target.symbol) : undefined;
      if (symbolOrType) {
        if (contains(symbolOrTypeStack, symbolOrType)) {
          inferencePriority = InferencePriority.Circularity;
          return;
        }
        (symbolOrTypeStack || (symbolOrTypeStack = [])).push(symbolOrType);
        inferFromObjectTypesWorker(source, target);
        symbolOrTypeStack.pop();
      } else {
        inferFromObjectTypesWorker(source, target);
      }
    }
    function inferFromObjectTypesWorker(source: qt.Type, target: qt.Type) {
      if (
        getObjectFlags(source) & ObjectFlags.Reference &&
        getObjectFlags(target) & ObjectFlags.Reference &&
        ((<qt.TypeReference>source).target === (<qt.TypeReference>target).target || (qf.is.arrayType(source) && qf.is.arrayType(target)))
      ) {
        inferFromTypeArgs(getTypeArgs(<qt.TypeReference>source), getTypeArgs(<qt.TypeReference>target), getVariances((<qt.TypeReference>source).target));
        return;
      }
      if (qf.is.genericMappedType(source) && qf.is.genericMappedType(target)) {
        inferFromTypes(getConstraintTypeFromMappedType(source), getConstraintTypeFromMappedType(target));
        inferFromTypes(getTemplateTypeFromMappedType(source), getTemplateTypeFromMappedType(target));
      }
      if (getObjectFlags(target) & ObjectFlags.Mapped) {
        const constraintType = getConstraintTypeFromMappedType(<qt.MappedType>target);
        if (inferToMappedType(source, <qt.MappedType>target, constraintType)) return;
      }
      if (!typesDefinitelyUnrelated(source, target)) {
        if (qf.is.arrayType(source) || qf.is.tupleType(source)) {
          if (qf.is.tupleType(target)) {
            const sourceLength = qf.is.tupleType(source) ? getLengthOfTupleType(source) : 0;
            const targetLength = getLengthOfTupleType(target);
            const sourceRestType = qf.is.tupleType(source) ? getRestTypeOfTupleType(source) : getElemTypeOfArrayType(source);
            const targetRestType = getRestTypeOfTupleType(target);
            const fixedLength = targetLength < sourceLength || sourceRestType ? targetLength : sourceLength;
            for (let i = 0; i < fixedLength; i++) {
              inferFromTypes(i < sourceLength ? getTypeArgs(<qt.TypeReference>source)[i] : sourceRestType!, getTypeArgs(target)[i]);
            }
            if (targetRestType) {
              const types = fixedLength < sourceLength ? getTypeArgs(<qt.TypeReference>source).slice(fixedLength, sourceLength) : [];
              if (sourceRestType) types.push(sourceRestType);
              if (types.length) inferFromTypes(qf.get.unionType(types), targetRestType);
            }
            return;
          }
          if (qf.is.arrayType(target)) {
            inferFromIndexTypes(source, target);
            return;
          }
        }
        inferFromProperties(source, target);
        inferFromSignatures(source, target, qt.SignatureKind.Call);
        inferFromSignatures(source, target, qt.SignatureKind.Construct);
        inferFromIndexTypes(source, target);
      }
    }
    function inferFromProperties(source: qt.Type, target: qt.Type) {
      const properties = getPropertiesOfObjectType(target);
      for (const targetProp of properties) {
        const sourceProp = qf.get.propertyOfType(source, targetProp.escName);
        if (sourceProp) inferFromTypes(sourceProp.typeOfSymbol(), targetProp.typeOfSymbol());
      }
    }
    function inferFromSignatures(source: qt.Type, target: qt.Type, kind: qt.SignatureKind) {
      const sourceSignatures = getSignaturesOfType(source, kind);
      const targetSignatures = getSignaturesOfType(target, kind);
      const sourceLen = sourceSignatures.length;
      const targetLen = targetSignatures.length;
      const len = sourceLen < targetLen ? sourceLen : targetLen;
      const skipParams = !!(getObjectFlags(source) & ObjectFlags.NonInferrableType);
      for (let i = 0; i < len; i++) {
        inferFromSignature(getBaseSignature(sourceSignatures[sourceLen - len + i]), getErasedSignature(targetSignatures[targetLen - len + i]), skipParams);
      }
    }
    function inferFromSignature(source: qt.Signature, target: qt.Signature, skipParams: boolean) {
      if (!skipParams) {
        const saveBivariant = bivariant;
        const kind = target.declaration ? target.declaration.kind : Syntax.Unknown;
        bivariant = bivariant || kind === Syntax.MethodDeclaration || kind === Syntax.MethodSignature || kind === Syntax.Constructor;
        applyToParamTypes(source, target, inferFromContravariantTypes);
        bivariant = saveBivariant;
      }
      applyToReturnTypes(source, target, inferFromTypes);
    }
    function inferFromIndexTypes(source: qt.Type, target: qt.Type) {
      const targetStringIndexType = qf.get.indexTypeOfType(target, IndexKind.String);
      if (targetStringIndexType) {
        const sourceIndexType = qf.get.indexTypeOfType(source, IndexKind.String) || getImplicitIndexTypeOfType(source, IndexKind.String);
        if (sourceIndexType) inferFromTypes(sourceIndexType, targetStringIndexType);
      }
      const targetNumberIndexType = qf.get.indexTypeOfType(target, IndexKind.Number);
      if (targetNumberIndexType) {
        const sourceIndexType = qf.get.indexTypeOfType(source, IndexKind.Number) || qf.get.indexTypeOfType(source, IndexKind.String) || getImplicitIndexTypeOfType(source, IndexKind.Number);
        if (sourceIndexType) inferFromTypes(sourceIndexType, targetNumberIndexType);
      }
    }
  }
  function unionObjectAndArrayLiteralCandidates(candidates: qt.Type[]): qt.Type[] {
    if (candidates.length > 1) {
      const objectLiterals = filter(candidates, qf.is.objectOrArrayLiteralType);
      if (objectLiterals.length) {
        const literalsType = qf.get.unionType(objectLiterals, qt.UnionReduction.Subtype);
        return concatenate(
          filter(candidates, (t) => !qf.is.objectOrArrayLiteralType(t)),
          [literalsType]
        );
      }
    }
    return candidates;
  }
  function optionalChainContainsReference(source: Node, target: Node) {
    while (qf.is.optionalChain(source)) {
      source = source.expression;
      if (qf.is.matchingReference(source, target)) return true;
    }
    return false;
  }
  function findDiscriminantProperties(sourceProperties: qt.Symbol[], target: qt.Type): qt.Symbol[] | undefined {
    let result: qt.Symbol[] | undefined;
    for (const sourceProperty of sourceProperties) {
      if (isDiscriminantProperty(target, sourceProperty.escName)) {
        if (result) {
          result.push(sourceProperty);
          continue;
        }
        result = [sourceProperty];
      }
    }
    return result;
  }
  function addEvolvingArrayElemType(evolvingArrayType: qt.EvolvingArrayType, node: qt.Expression): qt.EvolvingArrayType {
    const elemType = getBaseTypeOfLiteralType(getContextFreeTypeOfExpression(node));
    return isTypeSubsetOf(elemType, evolvingArrayType.elemType) ? evolvingArrayType : getEvolvingArrayType(qf.get.unionType([evolvingArrayType.elemType, elemType]));
  }
  function finalizeEvolvingArrayType(type: qt.Type): qt.Type {
    return getObjectFlags(type) & ObjectFlags.EvolvingArray ? getFinalArrayType(<qt.EvolvingArrayType>type) : type;
  }
  function reportFlowControlError(node: Node) {
    const block = <qt.Block | qt.ModuleBlock | qt.SourceFile>qc.findAncestor(node, isFunctionOrModuleBlock);
    const sourceFile = node.sourceFile;
    const span = sourceFile.spanOfTokenAtPos(block.statements.pos);
    diagnostics.add(qf.create.fileDiag(sourceFile, span.start, span.length, qd.msgs.The_containing_function_or_module_body_is_too_large_for_control_flow_analysis));
  }
  function markParamAssignments(node: Node) {
    if (node.kind === Syntax.Identifier) {
      if (qf.is.assignmentTarget(node)) {
        const symbol = getResolvedSymbol(<qt.Identifier>node);
        if (symbol.valueDeclaration && qf.get.rootDeclaration(symbol.valueDeclaration).kind === Syntax.Param) symbol.assigned = true;
      }
    } else {
      qf.each.child(node, markParamAssignments);
    }
  }
  function removeOptionalityFromDeclaredType(declaredType: qt.Type, declaration: qt.VariableLikeDeclaration): qt.Type {
    if (pushTypeResolution(declaration.symbol, TypeSystemPropertyName.DeclaredType)) {
      const annotationIncludesUndefined =
        strictNullChecks &&
        declaration.kind === Syntax.Param &&
        declaration.initer &&
        getFalsyFlags(declaredType) & qt.TypeFlags.Undefined &&
        !(getFalsyFlags(check.expression(declaration.initer)) & qt.TypeFlags.Undefined);
      popTypeResolution();
      return annotationIncludesUndefined ? getTypeWithFacts(declaredType, TypeFacts.NEUndefined) : declaredType;
    } else {
      reportCircularityError(declaration.symbol);
      return declaredType;
    }
  }
  function captureLexicalThis(node: Node, container: Node): void {
    qf.get.nodeLinks(node).flags |= NodeCheckFlags.LexicalThis;
    if (container.kind === Syntax.PropertyDeclaration || container.kind === Syntax.Constructor) {
      const classNode = container.parent;
      qf.get.nodeLinks(classNode).flags |= NodeCheckFlags.CaptureThis;
    } else {
      qf.get.nodeLinks(container).flags |= NodeCheckFlags.CaptureThis;
    }
  }
  function findFirstSuperCall(node: Node): qt.SuperCall | undefined {
    return qf.is.superCall(node) ? node : qf.is.functionLike(node) ? undefined : qf.each.child(node, findFirstSuperCall);
  }
  function classDeclarationExtendsNull(classDecl: qt.ClassDeclaration): boolean {
    const classSymbol = qf.get.symbolOfNode(classDecl);
    const classInstanceType = <qt.InterfaceType>getDeclaredTypeOfSymbol(classSymbol);
    const baseConstructorType = getBaseConstructorTypeOfClass(classInstanceType);
    return baseConstructorType === nullWideningType;
  }
  function tryGetThisTypeAt(node: Node, includeGlobalThis = true, container = qf.get.thisContainer(node, false)): qt.Type | undefined {
    const isInJS = qf.is.inJSFile(node);
    if (qf.is.functionLike(container) && (!isInParamIniterBeforeContainingFunction(node) || qf.get.thisNodeKind(ParamDeclaration, container))) {
      const className = getClassNameFromPrototypeMethod(container);
      if (isInJS && className) {
        const classSymbol = check.expression(className).symbol;
        if (classSymbol && classSymbol.members && classSymbol.flags & qt.SymbolFlags.Function) {
          const classType = (getDeclaredTypeOfSymbol(classSymbol) as qt.InterfaceType).thisType;
          if (classType) return qf.get.flow.typeOfReference(node, classType);
        }
      } else if (isInJS && (container.kind === Syntax.FunctionExpression || container.kind === Syntax.FunctionDeclaration) && qf.get.doc.classTag(container)) {
        const classType = (getDeclaredTypeOfSymbol(qf.get.mergedSymbol(container.symbol)) as qt.InterfaceType).thisType!;
        return qf.get.flow.typeOfReference(node, classType);
      }
      const thisType = getThisTypeOfDeclaration(container) || getContextualThisParamType(container);
      if (thisType) return qf.get.flow.typeOfReference(node, thisType);
    }
    if (qf.is.classLike(container.parent)) {
      const symbol = qf.get.symbolOfNode(container.parent);
      const type = qf.has.syntacticModifier(container, ModifierFlags.Static) ? this.typeOfSymbol() : (getDeclaredTypeOfSymbol(symbol) as qt.InterfaceType).thisType!;
      return qf.get.flow.typeOfReference(node, type);
    }
    if (isInJS) {
      const type = getTypeForThisExpressionFromDoc(container);
      if (type && type !== errorType) return qf.get.flow.typeOfReference(node, type);
    }
    if (container.kind === Syntax.SourceFile) {
      if (container.commonJsModuleIndicator) {
        const fileSymbol = qf.get.symbolOfNode(container);
        return fileSymbol && fileSymbol.typeOfSymbol();
      } else if (container.externalModuleIndicator) {
        return undefinedType;
      } else if (includeGlobalThis) {
        return globalThisSymbol.typeOfSymbol();
      }
    }
  }
  function discriminateContextualTypeByObjectMembers(node: qt.ObjectLiteralExpression, contextualType: qt.UnionType) {
    return discriminateTypeByDiscriminableItems(
      contextualType,
      map(
        filter(node.properties, (p) => !!p.symbol && p.kind === Syntax.PropertyAssignment && qf.is.possiblyDiscriminantValue(p.initer) && isDiscriminantProperty(contextualType, p.symbol.escName)),
        (prop) => [() => check.expression((prop as qt.PropertyAssignment).initer), prop.symbol.escName] as [() => qt.Type, qu.__String]
      ),
      qf.is.typeAssignableTo,
      contextualType
    );
  }
  function discriminateContextualTypeByJSXAttributes(node: qt.JsxAttributes, contextualType: qt.UnionType) {
    return discriminateTypeByDiscriminableItems(
      contextualType,
      map(
        filter(
          node.properties,
          (p) => !!p.symbol && p.kind === Syntax.JsxAttribute && isDiscriminantProperty(contextualType, p.symbol.escName) && (!p.initer || qf.is.possiblyDiscriminantValue(p.initer))
        ),
        (prop) => [!(prop as qt.JsxAttribute).initer ? () => trueType : () => check.expression((prop as qt.JsxAttribute).initer!), prop.symbol.escName] as [() => qt.Type, qu.__String]
      ),
      qf.is.typeAssignableTo,
      contextualType
    );
  }
  function reportObjectPossiblyNullOrUndefinedError(node: Node, flags: qt.TypeFlags) {
    error(node, flags & qt.TypeFlags.Undefined ? (flags & qt.TypeFlags.Null ? qd.msgs.Object_is_possibly_null_or_undefined : qd.msgs.Object_is_possibly_undefined) : qd.msgs.Object_is_possibly_null);
  }
  function reportCannotInvokePossiblyNullOrUndefinedError(node: Node, flags: qt.TypeFlags) {
    error(
      node,
      flags & qt.TypeFlags.Undefined
        ? flags & qt.TypeFlags.Null
          ? qd.msgs.Cannot_invoke_an_object_which_is_possibly_null_or_undefined
          : qd.msgs.Cannot_invoke_an_object_which_is_possibly_undefined
        : qd.msgs.Cannot_invoke_an_object_which_is_possibly_null
    );
  }
  function lookupSymbolForPrivateIdentifierDeclaration(propName: qu.__String, location: Node): qt.Symbol | undefined {
    for (let containingClass = qf.get.containingClass(location); !!containingClass; containingClass = qf.get.containingClass(containingClass)) {
      const { symbol } = containingClass;
      const name = symbol.nameForPrivateIdentifier(propName);
      const prop = (symbol.members && symbol.members.get(name)) || (symbol.exports && symbol.exports.get(name));
      if (prop) return prop;
    }
  }
  function reportNonexistentProperty(propNode: qc.Identifier | qc.PrivateIdentifier, containingType: qt.Type) {
    let errorInfo: qd.MessageChain | undefined;
    let relatedInfo: qd.Diagnostic | undefined;
    if (propNode.kind !== Syntax.PrivateIdentifier && containingType.flags & qt.TypeFlags.Union && !(containingType.flags & qt.TypeFlags.Primitive)) {
      for (const subtype of (containingType as qt.UnionType).types) {
        if (!qf.get.propertyOfType(subtype, propNode.escapedText) && !qf.get.indexInfoOfType(subtype, IndexKind.String)) {
          errorInfo = chainqd.Messages(errorInfo, qd.msgs.Property_0_does_not_exist_on_type_1, declarationNameToString(propNode), typeToString(subtype));
          break;
        }
      }
    }
    if (typeHasStaticProperty(propNode.escapedText, containingType))
      errorInfo = chainqd.Messages(errorInfo, qd.msgs.Property_0_is_a_static_member_of_type_1, declarationNameToString(propNode), typeToString(containingType));
    else {
      const promisedType = getPromisedTypeOfPromise(containingType);
      if (promisedType && qf.get.propertyOfType(promisedType, propNode.escapedText)) {
        errorInfo = chainqd.Messages(errorInfo, qd.msgs.Property_0_does_not_exist_on_type_1, declarationNameToString(propNode), typeToString(containingType));
        relatedInfo = qf.create.diagForNode(propNode, qd.msgs.Did_you_forget_to_use_await);
      } else {
        const suggestion = getSuggestedSymbolForNonexistentProperty(propNode, containingType);
        if (suggestion !== undefined) {
          const suggestedName = suggestion.name;
          errorInfo = chainqd.Messages(errorInfo, qd.msgs.Property_0_does_not_exist_on_type_1_Did_you_mean_2, declarationNameToString(propNode), typeToString(containingType), suggestedName);
          relatedInfo = suggestion.valueDeclaration && qf.create.diagForNode(suggestion.valueDeclaration, qd.msgs._0_is_declared_here, suggestedName);
        } else {
          errorInfo = chainqd.Messages(
            elaborateNeverIntersection(errorInfo, containingType),
            qd.msgs.Property_0_does_not_exist_on_type_1,
            declarationNameToString(propNode),
            typeToString(containingType)
          );
        }
      }
    }
    const resultDiagnostic = qf.create.diagForNodeFromMessageChain(propNode, errorInfo);
    if (relatedInfo) addRelatedInfo(resultDiagnostic, relatedInfo);
    diagnostics.add(resultDiagnostic);
  }
  function typeHasStaticProperty(propName: qu.__String, containingType: qt.Type): boolean {
    const prop = containingType.symbol && qf.get.propertyOfType(containingType.symbol.typeOfSymbol(), propName);
    return prop !== undefined && prop.valueDeclaration && qf.has.syntacticModifier(prop.valueDeclaration, ModifierFlags.Static);
  }
  function markPropertyAsReferenced(prop: qt.Symbol, nodeForCheckWriteOnly: Node | undefined, isThisAccess: boolean) {
    const valueDeclaration = prop && prop.flags & qt.SymbolFlags.ClassMember && prop.valueDeclaration;
    if (!valueDeclaration) return;
    const hasPrivateModifier = qf.has.effectiveModifier(valueDeclaration, ModifierFlags.Private);
    const hasPrivateIdentifier = qf.is.namedDeclaration(prop.valueDeclaration) && prop.valueDeclaration.name.kind === Syntax.PrivateIdentifier;
    if (!hasPrivateModifier && !hasPrivateIdentifier) return;
    if (nodeForCheckWriteOnly && qf.is.writeOnlyAccess(nodeForCheckWriteOnly) && !(prop.flags & qt.SymbolFlags.SetAccessor)) return;
    if (isThisAccess) {
      const containingMethod = qc.findAncestor(nodeForCheckWriteOnly, isFunctionLikeDeclaration);
      if (containingMethod && containingMethod.symbol === prop) return;
    }
    (prop.checkFlags() & qt.CheckFlags.Instantiated ? prop.links.target : prop)!.referenced = qt.SymbolFlags.All;
  }
  function callLikeExpressionMayHaveTypeArgs(node: qt.CallLikeExpression): node is qt.CallExpression | qt.NewExpression | qt.TaggedTemplateExpression | qt.JsxOpeningElem {
    return qf.is.callOrNewExpression(node) || node.kind === Syntax.TaggedTemplateExpression || qf.is.jsx.openingLikeElem(node);
  }
  function reorderCandidates(signatures: readonly qt.Signature[], result: qt.Signature[], callChainFlags: SignatureFlags): void {
    let lastParent: Node | undefined;
    let lastSymbol: qt.Symbol | undefined;
    let cutoffIndex = 0;
    let index: number | undefined;
    let specializedIndex = -1;
    let spliceIndex: number;
    qf.assert.true(!result.length);
    for (const signature of signatures) {
      const symbol = signature.declaration && qf.get.symbolOfNode(signature.declaration);
      const parent = signature.declaration && signature.declaration.parent;
      if (!lastSymbol || symbol === lastSymbol) {
        if (lastParent && parent === lastParent) index = index! + 1;
        else {
          lastParent = parent;
          index = cutoffIndex;
        }
      } else {
        index = cutoffIndex = result.length;
        lastParent = parent;
      }
      lastSymbol = symbol;
      if (signature.hasLiteralTypes()) {
        specializedIndex++;
        spliceIndex = specializedIndex;
        cutoffIndex++;
      } else {
        spliceIndex = index;
      }
      result.splice(spliceIndex, 0, callChainFlags ? getOptionalCallSignature(signature, callChainFlags) : signature);
    }
  }
  function inferJsxTypeArgs(node: qt.JsxOpeningLikeElem, signature: qt.Signature, checkMode: CheckMode, context: qt.InferenceContext): qt.Type[] {
    const paramType = getEffectiveFirstArgForJsxSignature(signature, node);
    const checkAttrType = check.expressionWithContextualType(node.attributes, paramType, context, checkMode);
    inferTypes(context.inferences, checkAttrType, paramType);
    return getInferredTypes(context);
  }
  function inferTypeArgs(node: qt.CallLikeExpression, signature: qt.Signature, args: readonly qt.Expression[], checkMode: CheckMode, context: qt.InferenceContext): qt.Type[] {
    if (qf.is.jsx.openingLikeElem(node)) return inferJsxTypeArgs(node, signature, checkMode, context);
    if (node.kind !== Syntax.Decorator) {
      const contextualType = getContextualType(node);
      if (contextualType) {
        const outerContext = getInferenceContext(node);
        const outerMapper = getMapperFromContext(cloneInferenceContext(outerContext, InferenceFlags.NoDefault));
        const instantiatedType = instantiateType(contextualType, outerMapper);
        const contextualSignature = getSingleCallSignature(instantiatedType);
        const inferenceSourceType =
          contextualSignature && contextualSignature.typeParams
            ? getOrCreateTypeFromSignature(getSignatureInstantiationWithoutFillingInTypeArgs(contextualSignature, contextualSignature.typeParams))
            : instantiatedType;
        const inferenceTargetType = qf.get.returnTypeOfSignature(signature);
        inferTypes(context.inferences, inferenceSourceType, inferenceTargetType, InferencePriority.ReturnType);
        const returnContext = createInferenceContext(signature.typeParams!, signature, context.flags);
        const returnSourceType = instantiateType(contextualType, outerContext && outerContext.returnMapper);
        inferTypes(returnContext.inferences, returnSourceType, inferenceTargetType);
        context.returnMapper = some(returnContext.inferences, hasInferenceCandidates) ? getMapperFromContext(cloneInferredPartOfContext(returnContext)) : undefined;
      }
    }
    const thisType = getThisTypeOfSignature(signature);
    if (thisType) {
      const thisArgNode = getThisArgOfCall(node);
      const thisArgType = thisArgNode ? check.expression(thisArgNode) : voidType;
      inferTypes(context.inferences, thisArgType, thisType);
    }
    const restType = getNonArrayRestType(signature);
    const argCount = restType ? Math.min(getParamCount(signature) - 1, args.length) : args.length;
    for (let i = 0; i < argCount; i++) {
      const arg = args[i];
      if (arg.kind !== Syntax.OmittedExpression) {
        const paramType = getTypeAtPosition(signature, i);
        const argType = check.expressionWithContextualType(arg, paramType, context, checkMode);
        inferTypes(context.inferences, argType, paramType);
      }
    }
    if (restType) {
      const spreadType = getSpreadArgType(args, argCount, args.length, restType, context);
      inferTypes(context.inferences, spreadType, restType);
    }
    return getInferredTypes(context);
  }
  function pickLongestCandidateSignature(node: qt.CallLikeExpression, candidates: qt.Signature[], args: readonly qt.Expression[]): qt.Signature {
    const bestIndex = getLongestCandidateIndex(candidates, apparentArgCount === undefined ? args.length : apparentArgCount);
    const candidate = candidates[bestIndex];
    const { typeParams } = candidate;
    if (!typeParams) return candidate;
    const typeArgNodes: readonly qt.Typing[] | undefined = callLikeExpressionMayHaveTypeArgs(node) ? node.typeArgs : undefined;
    const instantiated = typeArgNodes
      ? qf.create.signatureInstantiation(candidate, getTypeArgsFromNodes(typeArgNodes, typeParams, qf.is.inJSFile(node)))
      : inferSignatureInstantiationForOverloadFailure(node, typeParams, candidate, args);
    candidates[bestIndex] = instantiated;
    return instantiated;
  }
  function inferSignatureInstantiationForOverloadFailure(node: qt.CallLikeExpression, typeParams: readonly qt.TypeParam[], candidate: qt.Signature, args: readonly qt.Expression[]): qt.Signature {
    const inferenceContext = createInferenceContext(typeParams, candidate, qf.is.inJSFile(node) ? InferenceFlags.AnyDefault : InferenceFlags.None);
    const typeArgTypes = inferTypeArgs(node, candidate, args, CheckMode.SkipContextSensitive | CheckMode.SkipGenericFunctions, inferenceContext);
    return qf.create.signatureInstantiation(candidate, typeArgTypes);
  }
  function typeHasProtectedAccessibleBase(target: qt.Symbol, type: qt.InterfaceType): boolean {
    const baseTypes = getBaseTypes(type);
    if (!length(baseTypes)) return false;
    const firstBase = baseTypes[0];
    if (firstBase.flags & qt.TypeFlags.Intersection) {
      const types = (firstBase as qt.IntersectionType).types;
      const mixinFlags = findMixins(types);
      let i = 0;
      for (const intersectionMember of (firstBase as qt.IntersectionType).types) {
        if (!mixinFlags[i]) {
          if (getObjectFlags(intersectionMember) & (ObjectFlags.Class | ObjectFlags.Interface)) {
            if (intersectionMember.symbol === target) return true;
            if (typeHasProtectedAccessibleBase(target, intersectionMember as qt.InterfaceType)) return true;
          }
        }
        i++;
      }
      return false;
    }
    if (firstBase.symbol === target) return true;
    return typeHasProtectedAccessibleBase(target, firstBase as qt.InterfaceType);
  }
  function invocationErrorDetails(errorTarget: Node, apparentType: qt.Type, kind: qt.SignatureKind): { messageChain: qd.MessageChain; relatedMessage: qd.Message | undefined } {
    let errorInfo: qd.MessageChain | undefined;
    const isCall = kind === qt.SignatureKind.Call;
    const awaitedType = getAwaitedType(apparentType);
    const maybeMissingAwait = awaitedType && getSignaturesOfType(awaitedType, kind).length > 0;
    if (apparentType.flags & qt.TypeFlags.Union) {
      const types = (apparentType as qt.UnionType).types;
      let hasSignatures = false;
      for (const constituent of types) {
        const signatures = getSignaturesOfType(constituent, kind);
        if (signatures.length !== 0) {
          hasSignatures = true;
          if (errorInfo) break;
        } else {
          if (!errorInfo) {
            errorInfo = chainqd.Messages(errorInfo, isCall ? qd.msgs.Type_0_has_no_call_signatures : qd.msgs.Type_0_has_no_construct_signatures, typeToString(constituent));
            errorInfo = chainqd.Messages(
              errorInfo,
              isCall ? qd.msgs.Not_all_constituents_of_type_0_are_callable : qd.msgs.Not_all_constituents_of_type_0_are_constructable,
              typeToString(apparentType)
            );
          }
          if (hasSignatures) break;
        }
      }
      if (!hasSignatures)
        errorInfo = chainqd.Messages(undefined, isCall ? qd.msgs.No_constituent_of_type_0_is_callable : qd.msgs.No_constituent_of_type_0_is_constructable, typeToString(apparentType));
      if (!errorInfo) {
        errorInfo = chainqd.Messages(
          errorInfo,
          isCall
            ? qd.msgs.Each_member_of_the_union_type_0_has_signatures_but_none_of_those_signatures_are_compatible_with_each_other
            : qd.msgs.Each_member_of_the_union_type_0_has_construct_signatures_but_none_of_those_signatures_are_compatible_with_each_other,
          typeToString(apparentType)
        );
      }
    } else {
      errorInfo = chainqd.Messages(errorInfo, isCall ? qd.msgs.Type_0_has_no_call_signatures : qd.msgs.Type_0_has_no_construct_signatures, typeToString(apparentType));
    }
    let headMessage = isCall ? qd.msgs.This_expression_is_not_callable : qd.msgs.This_expression_is_not_constructable;
    if (errorTarget.parent.kind === Syntax.CallExpression && errorTarget.parent.args.length === 0) {
      const { resolvedSymbol } = qf.get.nodeLinks(errorTarget);
      if (resolvedSymbol && resolvedSymbol.flags & qt.SymbolFlags.GetAccessor) headMessage = qd.msgs.This_expression_is_not_callable_because_it_is_a_get_accessor_Did_you_mean_to_use_it_without;
    }
    return {
      messageChain: chainqd.Messages(errorInfo, headMessage),
      relatedMessage: maybeMissingAwait ? qd.msgs.Did_you_forget_to_use_await : undefined,
    };
  }
  function invocationError(errorTarget: Node, apparentType: qt.Type, kind: qt.SignatureKind, relatedInformation?: qd.DiagnosticRelatedInformation) {
    const { messageChain, relatedMessage: relatedInfo } = invocationErrorDetails(errorTarget, apparentType, kind);
    const diagnostic = qf.create.diagForNodeFromMessageChain(errorTarget, messageChain);
    if (relatedInfo) addRelatedInfo(diagnostic, qf.create.diagForNode(errorTarget, relatedInfo));
    if (errorTarget.parent.kind === Syntax.CallExpression) {
      const { start, length } = getDiagnosticSpanForCallNode(errorTarget.parent, true);
      diagnostic.start = start;
      diagnostic.length = length;
    }
    diagnostics.add(diagnostic);
    invocationErrorRecovery(apparentType, kind, relatedInformation ? addRelatedInfo(diagnostic, relatedInformation) : diagnostic);
  }
  function invocationErrorRecovery(apparentType: qt.Type, kind: qt.SignatureKind, diagnostic: qd.Diagnostic) {
    if (!apparentType.symbol) return;
    const importNode = apparentType.symbol.links.originatingImport;
    if (importNode && !is.importCall(importNode)) {
      const sigs = getSignaturesOfType(apparentType.symbol.links.target!.typeOfSymbol(), kind);
      if (!sigs || !sigs.length) return;
      addRelatedInfo(
        diagnostic,
        qf.create.diagForNode(
          importNode,
          qd.msgs
            .Type_originates_at_this_import_A_namespace_style_import_cannot_be_called_or_constructed_and_will_cause_a_failure_at_runtime_Consider_using_a_default_import_or_import_require_here_instead
        )
      );
    }
  }
  function mergeJSSymbols(target: qt.Symbol, source: qt.Symbol | undefined) {
    if (source) {
      const links = source.links;
      if (!links.inferredClassSymbol || !links.inferredClassSymbol.has('' + target.getId())) {
        const inferred = target.isTransient() ? target : (target.clone() as qt.TransientSymbol);
        inferred.exports = inferred.exports || new qc.SymbolTable();
        inferred.members = inferred.members || new qc.SymbolTable();
        inferred.flags |= source.flags & qt.SymbolFlags.Class;
        if (qu.hasEntries(source.exports)) inferred.exports.merge(source.exports);
        if (qu.hasEntries(source.members)) inferred.members.merge(source.members);
        (links.inferredClassSymbol || (links.inferredClassSymbol = new qu.QMap<qt.TransientSymbol>())).set('' + inferred.getId(), inferred);
        return inferred;
      }
      return links.inferredClassSymbol.get('' + target.getId());
    }
  }
  function assignParamType(param: qt.Symbol, type?: qt.Type) {
    const links = param.links;
    if (!links.type) {
      const declaration = param.valueDeclaration as qt.ParamDeclaration;
      links.type = type || qf.get.widenedTypeForVariableLikeDeclaration(declaration, true);
      if (declaration.name.kind !== Syntax.Identifier) {
        if (links.type === unknownType) links.type = qf.get.typeFromBindingPattern(declaration.name);
        assignBindingElemTypes(declaration.name);
      }
    }
  }
  function assignBindingElemTypes(pattern: qt.BindingPattern) {
    for (const elem of pattern.elems) {
      if (elem.kind !== Syntax.OmittedExpression) {
        if (elem.name.kind === Syntax.Identifier) qf.get.symbolOfNode(elem).links.type = qf.get.typeForBindingElem(elem);
        else assignBindingElemTypes(elem.name);
      }
    }
  }
  function issueMemberSpecificError(node: qt.ClassLikeDeclaration, typeWithThis: qt.Type, baseWithThis: qt.Type, broadDiag: qd.Message) {
    let issuedMemberError = false;
    for (const member of node.members) {
      if (qf.has.staticModifier(member)) continue;
      const declaredProp = (member.name && getSymbolAtLocation(member.name)) || getSymbolAtLocation(member);
      if (declaredProp) {
        const prop = qf.get.propertyOfType(typeWithThis, declaredProp.escName);
        const baseProp = qf.get.propertyOfType(baseWithThis, declaredProp.escName);
        if (prop && baseProp) {
          const rootChain = () =>
            chainqd.Messages(
              undefined,
              qd.msgs.Property_0_in_type_1_is_not_assignable_to_the_same_property_in_base_type_2,
              declaredProp.symbolToString(),
              typeToString(typeWithThis),
              typeToString(baseWithThis)
            );
          if (!check.typeAssignableTo(prop.typeOfSymbol(), baseProp.typeOfSymbol(), member.name || member, undefined, rootChain)) issuedMemberError = true;
        }
      }
    }
    if (!issuedMemberError) check.typeAssignableTo(typeWithThis, baseWithThis, node.name || node, broadDiag);
  }
  function computeExhaustiveSwitchStatement(node: qt.SwitchStatement): boolean {
    if (node.expression.kind === Syntax.TypeOfExpression) {
      const operandType = qf.get.typeOfExpression((node.expression as qt.TypeOfExpression).expression);
      const witnesses = getSwitchClauseTypeOfWitnesses(node, false);
      const notEqualFacts = getFactsFromTypeofSwitch(0, 0, witnesses, true);
      const type = qf.get.baseConstraintOfType(operandType) || operandType;
      return !!(filterType(type, (t) => (getTypeFacts(t) & notEqualFacts) === notEqualFacts).flags & qt.TypeFlags.Never);
    }
    const type = qf.get.typeOfExpression(node.expression);
    if (!qf.is.literalType(type)) return false;
    const switchTypes = getSwitchClauseTypes(node);
    if (!switchTypes.length || some(switchTypes, isNeitherUnitTypeNorNever)) return false;
    return eachTypeContainedIn(mapType(type, getRegularTypeOfLiteralType), switchTypes);
  }
  function functionHasImplicitReturn(func: qt.FunctionLikeDeclaration) {
    return func.endFlowNode && isReachableFlowNode(func.endFlowNode);
  }
  function mayReturnNever(func: qt.FunctionLikeDeclaration): boolean {
    switch (func.kind) {
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
        return true;
      case Syntax.MethodDeclaration:
        return func.parent.kind === Syntax.ObjectLiteralExpression;
      default:
        return false;
    }
  }
  function contextuallyCheckFunctionExpressionOrObjectLiteralMethod(node: qt.FunctionExpression | qt.ArrowFunction | qt.MethodDeclaration, checkMode?: CheckMode) {
    const links = qf.get.nodeLinks(node);
    if (!(links.flags & NodeCheckFlags.ContextChecked)) {
      const contextualSignature = getContextualSignature(node);
      if (!(links.flags & NodeCheckFlags.ContextChecked)) {
        links.flags |= NodeCheckFlags.ContextChecked;
        const signature = firstOrUndefined(getSignaturesOfType(qf.get.symbolOfNode(node).typeOfSymbol(), qt.SignatureKind.Call));
        if (!signature) return;
        if (qf.is.contextSensitive(node)) {
          if (contextualSignature) {
            const inferenceContext = getInferenceContext(node);
            if (checkMode && checkMode & CheckMode.Inferential) inferFromAnnotatedParams(signature, contextualSignature, inferenceContext!);
            const instantiatedContextualSignature = inferenceContext ? instantiateSignature(contextualSignature, inferenceContext.mapper) : contextualSignature;
            assignContextualParamTypes(signature, instantiatedContextualSignature);
          } else {
            assignNonContextualParamTypes(signature);
          }
        }
        if (contextualSignature && !getReturnTypeFromAnnotation(node) && !signature.resolvedReturn) {
          const returnType = getReturnTypeFromBody(node, checkMode);
          if (!signature.resolvedReturn) signature.resolvedReturn = returnType;
        }
        check.signatureDeclaration(node);
      }
    }
  }
  const enum CheckBinaryExpressionState {
    MaybeCheckLeft,
    CheckRight,
    FinishCheck,
  }
  function padTupleType(type: qt.TupleTypeReference, pattern: qt.ArrayBindingPattern) {
    const patternElems = pattern.elems;
    const arity = getTypeReferenceArity(type);
    const elemTypes = arity ? getTypeArgs(type).slice() : [];
    for (let i = arity; i < patternElems.length; i++) {
      const e = patternElems[i];
      if (i < patternElems.length - 1 || !(e.kind === Syntax.BindingElem && e.dot3Token)) {
        elemTypes.push(e.kind !== Syntax.OmittedExpression && hasDefaultValue(e) ? getTypeFromBindingElem(e, false, false) : anyType);
        if (e.kind !== Syntax.OmittedExpression && !hasDefaultValue(e)) reportImplicitAny(e, anyType);
      }
    }
    return createTupleType(elemTypes, type.target.minLength, false, type.target.readonly);
  }
  function widenTypeInferredFromIniter(declaration: qt.HasExpressionIniter, type: qt.Type) {
    const widened = qf.get.combinedFlagsOf(declaration) & NodeFlags.Const || qf.is.declarationReadonly(declaration) ? type : qf.get.widenedLiteralType(type);
    if (qf.is.inJSFile(declaration)) {
      if (widened.flags & qt.TypeFlags.Nullable) {
        reportImplicitAny(declaration, anyType);
        return anyType;
      } else if (qf.is.emptyArrayLiteralType(widened)) {
        reportImplicitAny(declaration, anyArrayType);
        return anyArrayType;
      }
    }
    return widened;
  }
  function skippedGenericFunction(node: Node, checkMode: CheckMode) {
    if (checkMode & CheckMode.Inferential) {
      const context = getInferenceContext(node)!;
      context.flags |= InferenceFlags.SkippedGenericFunction;
    }
  }
  function mergeInferences(target: qt.InferenceInfo[], source: qt.InferenceInfo[]) {
    for (let i = 0; i < target.length; i++) {
      if (!hasInferenceCandidates(target[i]) && hasInferenceCandidates(source[i])) target[i] = source[i];
    }
  }
  function markTypeNodeAsReferenced(node: qt.Typing) {
    markEntityNameOrEntityExpressionAsReference(node && qf.get.entityNameFromTypeNode(node));
  }
  function markEntityNameOrEntityExpressionAsReference(typeName: qt.EntityNameOrEntityNameExpression | undefined) {
    if (!typeName) return;
    const rootName = qf.get.firstIdentifier(typeName);
    const meaning = (typeName.kind === Syntax.Identifier ? qt.SymbolFlags.Type : qt.SymbolFlags.Namespace) | qt.SymbolFlags.Alias;
    const s = resolveName(rootName, rootName.escapedText, meaning, undefined, undefined, true);
    if (s && s.flags & qt.SymbolFlags.Alias && s.isValue() && !isConstEnumOrConstEnumOnlyModule(s.resolveAlias()) && !s.getTypeOnlyAliasDeclaration())
      s.markAliasSymbolAsReferenced();
  }
  function markDecoratorMedataDataTypeNodeAsReferenced(node: qt.Typing | undefined): void {
    const entityName = getEntityNameForDecoratorMetadata(node);
    if (entityName && qf.is.entityName(entityName)) markEntityNameOrEntityExpressionAsReference(entityName);
  }
  function registerForUnusedIdentifiersCheck(node: PotentiallyUnusedIdentifier): void {
    if (produceDiagnostics) {
      const sourceFile = node.sourceFile;
      let potentiallyUnusedIdentifiers = allPotentiallyUnusedIdentifiers.get(sourceFile.path);
      if (!potentiallyUnusedIdentifiers) {
        potentiallyUnusedIdentifiers = [];
        allPotentiallyUnusedIdentifiers.set(sourceFile.path, potentiallyUnusedIdentifiers);
      }
      potentiallyUnusedIdentifiers.push(node);
    }
  }
  type PotentiallyUnusedIdentifier =
    | qt.SourceFile
    | qt.ModuleDeclaration
    | qt.ClassLikeDeclaration
    | qt.InterfaceDeclaration
    | qt.Block
    | qt.CaseBlock
    | qt.ForStatement
    | qt.ForInStatement
    | qt.ForOfStatement
    | Exclude<qt.SignatureDeclaration, qt.IndexSignatureDeclaration | qt.DocFunctionTyping>
    | qt.TypeAliasDeclaration
    | qt.InferTyping;
  function errorUnusedLocal(declaration: qt.Declaration, name: string, addDiagnostic: AddUnusedDiagnostic) {
    const node = qf.decl.nameOf(declaration) || declaration;
    const message = qf.is.typeDeclaration(declaration) ? qd.msgs._0_is_declared_but_never_used : qd.msgs._0_is_declared_but_its_value_is_never_read;
    addDiagnostic(declaration, UnusedKind.Local, qf.create.diagForNode(node, message, name));
  }
  function addToGroup<K, V>(map: qu.QMap<string, [K, V[]]>, key: K, value: V, getKey: (key: K) => number | string): void {
    const keyString = String(getKey(key));
    const group = map.get(keyString);
    if (group) group[1].push(value);
    else {
      map.set(keyString, [key, [value]]);
    }
  }
  function tryGetRootParamDeclaration(node: Node): qt.ParamDeclaration | undefined {
    return qu.tryCast(qf.get.rootDeclaration(node), isParam);
  }
  function bindingNameText(name: qt.BindingName): string {
    switch (name.kind) {
      case Syntax.Identifier:
        return idText(name);
      case Syntax.ArrayBindingPattern:
      case Syntax.ObjectBindingPattern:
        return bindingNameText(cast(first(name.elems), qt.BindingElem.kind).name);
      default:
        return qc.assert.never(name);
    }
  }
  type ImportedDeclaration = qt.ImportClause | qt.ImportSpecifier | qt.NamespaceImport;
  function importClauseFromImported(decl: ImportedDeclaration): qt.ImportClause {
    return decl.kind === Syntax.ImportClause ? decl : decl.kind === Syntax.NamespaceImport ? decl.parent : decl.parent.parent;
  }
  function needCollisionCheckForIdentifier(node: Node, identifier: qc.Identifier | undefined, name: string): boolean {
    if (!(identifier && identifier.escapedText === name)) return false;
    if (
      node.kind === Syntax.PropertyDeclaration ||
      node.kind === Syntax.PropertySignature ||
      node.kind === Syntax.MethodDeclaration ||
      node.kind === Syntax.MethodSignature ||
      node.kind === Syntax.GetAccessor ||
      node.kind === Syntax.SetAccessor
    ) {
      return false;
    }
    if (node.flags & NodeFlags.Ambient) return false;
    const root = qf.get.rootDeclaration(node);
    if (root.kind === Syntax.Param && qf.is.missing((<qt.FunctionLikeDeclaration>root.parent).body)) return false;
    return true;
  }
  function errorNextVariableOrPropertyDeclarationMustHaveSameType(firstDeclaration: qt.Declaration | undefined, firstType: qt.Type, nextDeclaration: qt.Declaration, nextType: qt.Type): void {
    const nextDeclarationName = qf.decl.nameOf(nextDeclaration);
    const message =
      nextDeclaration.kind === Syntax.PropertyDeclaration || nextDeclaration.kind === Syntax.PropertySignature
        ? qd.msgs.Subsequent_property_declarations_must_have_the_same_type_Property_0_must_be_of_type_1_but_here_has_type_2
        : qd.msgs.Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2;
    const declName = declarationNameToString(nextDeclarationName);
    const err = error(nextDeclarationName, message, declName, typeToString(firstType), typeToString(nextType));
    if (firstDeclaration) addRelatedInfo(err, qf.create.diagForNode(firstDeclaration, qd.msgs._0_was_also_declared_here, declName));
  }
  function areDeclarationFlagsIdentical(left: qt.Declaration, right: qt.Declaration) {
    if ((left.kind === Syntax.Param && right.kind === Syntax.VariableDeclaration) || (left.kind === Syntax.VariableDeclaration && right.kind === Syntax.Param)) return true;
    if (qf.has.questionToken(left) !== qf.has.questionToken(right)) return false;
    const interestingFlags = ModifierFlags.Private | ModifierFlags.Protected | ModifierFlags.Async | ModifierFlags.Abstract | ModifierFlags.Readonly | ModifierFlags.Static;
    return qf.get.selectedEffectiveModifierFlags(left, interestingFlags) === qf.get.selectedEffectiveModifierFlags(right, interestingFlags);
  }
  function combineIterationTypes(array: (IterationTypes | undefined)[]) {
    let yieldTypes: qt.Type[] | undefined;
    let returnTypes: qt.Type[] | undefined;
    let nextTypes: qt.Type[] | undefined;
    for (const iterationTypes of array) {
      if (iterationTypes === undefined || iterationTypes === noIterationTypes) continue;
      if (iterationTypes === anyIterationTypes) return anyIterationTypes;
      yieldTypes = append(yieldTypes, iterationTypes.yieldType);
      returnTypes = append(returnTypes, iterationTypes.returnType);
      nextTypes = append(nextTypes, iterationTypes.nextType);
    }
    if (yieldTypes || returnTypes || nextTypes)
      return qf.create.iterationTypes(yieldTypes && qf.get.unionType(yieldTypes), returnTypes && qf.get.unionType(returnTypes), nextTypes && qf.get.intersectionType(nextTypes));
    return noIterationTypes;
  }
  function reportTypeNotIterableError(errorNode: Node, type: qt.Type, allowAsyncIterables: boolean): void {
    const message = allowAsyncIterables
      ? qd.msgs.Type_0_must_have_a_Symbol_asyncIterator_method_that_returns_an_async_iterator
      : qd.msgs.Type_0_must_have_a_Symbol_iterator_method_that_returns_an_iterator;
    errorAndMaybeSuggestAwait(errorNode, !!getAwaitedTypeOfPromise(type), message, typeToString(type));
  }
  function areTypeParamsIdentical(declarations: readonly (ClassDeclaration | qt.InterfaceDeclaration)[], targetParams: qt.TypeParam[]) {
    const maxTypeArgCount = length(targetParams);
    const minTypeArgCount = getMinTypeArgCount(targetParams);
    for (const declaration of declarations) {
      const sourceParams = qf.get.effectiveTypeParamDeclarations(declaration);
      const numTypeParams = sourceParams.length;
      if (numTypeParams < minTypeArgCount || numTypeParams > maxTypeArgCount) return false;
      for (let i = 0; i < numTypeParams; i++) {
        const source = sourceParams[i];
        const target = targetParams[i];
        if (source.name.escapedText !== target.symbol.escName) return false;
        const constraint = qf.get.effectiveConstraintOfTypeParam(source);
        const sourceConstraint = constraint && qf.get.typeFromTypeNode(constraint);
        const targetConstraint = qf.get.constraintOfTypeParam(target);
        if (sourceConstraint && targetConstraint && !qf.is.typeIdenticalTo(sourceConstraint, targetConstraint)) return false;
        const sourceDefault = source.default && qf.get.typeFromTypeNode(source.default);
        const targetDefault = getDefaultFromTypeParam(target);
        if (sourceDefault && targetDefault && !qf.is.typeIdenticalTo(sourceDefault, targetDefault)) return false;
      }
    }
    return true;
  }
  function computeEnumMemberValues(node: qt.EnumDeclaration) {
    const nodeLinks = qf.get.nodeLinks(node);
    if (!(nodeLinks.flags & NodeCheckFlags.EnumValuesComputed)) {
      nodeLinks.flags |= NodeCheckFlags.EnumValuesComputed;
      let autoValue: number | undefined = 0;
      for (const member of node.members) {
        const value = computeMemberValue(member, autoValue);
        qf.get.nodeLinks(member).enumMemberValue = value;
        autoValue = typeof value === 'number' ? value + 1 : undefined;
      }
    }
  }
  function computeMemberValue(member: qt.EnumMember, autoValue?: number) {
    if (qf.is.computedNonLiteralName(member.name)) error(member.name, qd.msgs.Computed_property_names_are_not_allowed_in_enums);
    else {
      const t = qf.get.textOfPropertyName(member.name);
      if (NumericLiteral.name(t) && !qf.is.infOrNaN(t)) error(member.name, qd.msgs.An_enum_member_cannot_have_a_numeric_name);
    }
    if (member.initer) return computeConstantValue(member);
    if (member.parent.flags & NodeFlags.Ambient && !is.enumConst(member.parent) && getEnumKind(qf.get.symbolOfNode(member.parent)) === qt.EnumKind.Numeric) return;
    if (autoValue !== undefined) return autoValue;
    error(member.name, qd.msgs.Enum_member_must_have_initer);
    return;
  }
  function computeConstantValue(member: qt.EnumMember): string | number | undefined {
    const enumKind = getEnumKind(qf.get.symbolOfNode(member.parent));
    const isConstEnum = qf.is.enumConst(member.parent);
    const initer = member.initer!;
    const value = enumKind === qt.EnumKind.Literal && !isLiteralEnumMember(member) ? undefined : evaluate(initer);
    if (value !== undefined) {
      if (isConstEnum && typeof value === 'number' && !isFinite(value)) {
        error(initer, isNaN(value) ? qd.msgs.const_enum_member_initer_was_evaluated_to_disallowed_value_NaN : qd.msgs.const_enum_member_initer_was_evaluated_to_a_non_finite_value);
      }
    } else if (enumKind === qt.EnumKind.Literal) {
      error(initer, qd.msgs.Computed_values_are_not_permitted_in_an_enum_with_string_valued_members);
      return 0;
    } else if (isConstEnum) {
      error(initer, qd.msgs.const_enum_member_initers_can_only_contain_literal_values_and_other_computed_enum_values);
    } else if (member.parent.flags & NodeFlags.Ambient) {
      error(initer, qd.msgs.In_ambient_enum_declarations_member_initer_must_be_constant_expression);
    } else {
      const source = check.expression(initer);
      if (!qf.is.typeAssignableToKind(source, qt.TypeFlags.NumberLike)) {
        error(
          initer,
          qd.msgs.Only_numeric_enums_can_have_computed_members_but_this_expression_has_type_0_If_you_do_not_need_exhaustiveness_checks_consider_using_an_object_literal_instead,
          typeToString(source)
        );
      } else {
        check.typeAssignableTo(source, getDeclaredTypeOfSymbol(qf.get.symbolOfNode(member.parent)), initer, undefined);
      }
    }
    return value;
    function evaluate(e: qt.Expression): string | number | undefined {
      switch (e.kind) {
        case Syntax.PrefixUnaryExpression:
          const value = evaluate((<qt.PrefixUnaryExpression>e).operand);
          if (typeof value === 'number') {
            switch ((<qt.PrefixUnaryExpression>e).operator) {
              case Syntax.PlusToken:
                return value;
              case Syntax.MinusToken:
                return -value;
              case Syntax.TildeToken:
                return ~value;
            }
          }
          break;
        case Syntax.BinaryExpression:
          const left = evaluate((<qt.BinaryExpression>e).left);
          const right = evaluate((<qt.BinaryExpression>e).right);
          if (typeof left === 'number' && typeof right === 'number') {
            switch ((<qt.BinaryExpression>e).operatorToken.kind) {
              case Syntax.BarToken:
                return left | right;
              case Syntax.AmpersandToken:
                return left & right;
              case Syntax.GreaterThan2Token:
                return left >> right;
              case Syntax.GreaterThan3Token:
                return left >>> right;
              case Syntax.LessThan2Token:
                return left << right;
              case Syntax.CaretToken:
                return left ^ right;
              case Syntax.AsteriskToken:
                return left * right;
              case Syntax.SlashToken:
                return left / right;
              case Syntax.PlusToken:
                return left + right;
              case Syntax.MinusToken:
                return left - right;
              case Syntax.PercentToken:
                return left % right;
              case Syntax.Asterisk2Token:
                return left ** right;
            }
          } else if (typeof left === 'string' && typeof right === 'string' && (<qt.BinaryExpression>e).operatorToken.kind === Syntax.PlusToken) {
            return left + right;
          }
          break;
        case Syntax.StringLiteral:
        case Syntax.NoSubstitutionLiteral:
          return (<qt.StringLiteralLike>e).text;
        case Syntax.NumericLiteral:
          checkGrammar.numericLiteral(<qt.NumericLiteral>e);
          return +(<qt.NumericLiteral>e).text;
        case Syntax.ParenthesizedExpression:
          return evaluate((<qt.ParenthesizedExpression>e).expression);
        case Syntax.Identifier:
          if (qf.is.infOrNaN(e.escapedText)) return +e.escapedText;
          return qf.is.missing(e) ? 0 : evaluateEnumMember(e, qf.get.symbolOfNode(member.parent), identifier.escapedText);
        case Syntax.ElemAccessExpression:
        case Syntax.PropertyAccessExpression:
          const ex = <qt.AccessExpression>e;
          if (isConstantMemberAccess(ex)) {
            const type = qf.get.typeOfExpression(ex.expression);
            if (type.symbol && type.symbol.flags & qt.SymbolFlags.Enum) {
              let name: qu.__String;
              if (ex.kind === Syntax.PropertyAccessExpression) name = ex.name.escapedText;
              else name = qy.get.escUnderscores(cast(ex.argExpression, isLiteralExpression).text);

              return evaluateEnumMember(e, type.symbol, name);
            }
          }
          break;
      }
      return;
    }
    function evaluateEnumMember(e: qt.Expression, enumSymbol: qt.Symbol, name: qu.__String) {
      const memberSymbol = enumSymbol.exports!.get(name);
      if (memberSymbol) {
        const declaration = memberSymbol.valueDeclaration;
        if (declaration !== member) {
          if (qf.is.blockScopedNameDeclaredBeforeUse(declaration, member)) return getEnumMemberValue(declaration as qt.EnumMember);
          error(e, qd.msgs.A_member_initer_in_a_enum_declaration_cannot_reference_members_declared_after_it_including_members_defined_in_other_enums);
          return 0;
        } else {
          error(e, qd.msgs.Property_0_is_used_before_being_assigned, memberSymbol.symbolToString());
        }
      }
      return;
    }
  }
  function inSameLexicalScope(node1: Node, node2: Node) {
    const container1 = qf.get.enclosingBlockScopeContainer(node1);
    const container2 = qf.get.enclosingBlockScopeContainer(node2);
    if (qf.is.globalSourceFile(container1)) return qf.is.globalSourceFile(container2);
    else if (qf.is.globalSourceFile(container2)) return false;
    return container1 === container2;
  }
  function importClauseContainsReferencedImport(n: qt.ImportClause) {
    return qf.each.importClause(n, (d) => {
      return !!qf.get.symbolOfNode(d).referenced;
    });
  }
  function importClauseContainsConstEnumUsedAsValue(n: qt.ImportClause) {
    return qf.each.importClause(n, (d) => {
      return !!qf.get.symbolOfNode(d).links.constEnumReferenced;
    });
  }
  function unusedIsError(kind: UnusedKind, isAmbient: boolean): boolean {
    if (isAmbient) return false;
    switch (kind) {
      case UnusedKind.Local:
        return !!compilerOpts.noUnusedLocals;
      case UnusedKind.Param:
        return !!compilerOpts.noUnusedParams;
      default:
        return qc.assert.never(kind);
    }
  }
  function throwIfNonDiagnosticsProducing() {
    if (!produceDiagnostics) throw new Error('Trying to get diagnostics from a type checker that does not produce them.');
  }
  function forEachEnclosingClass<T>(node: Node, callback: (node: Node) => T | undefined): T | undefined {
    let result: T | undefined;
    while (true) {
      node = qf.get.containingClass(node)!;
      if (!node) break;
      if ((result = callback(node))) break;
    }
    return result;
  }
  function moduleExportsSomeValue(moduleReferenceExpression: qt.Expression): boolean {
    let moduleSymbol = resolveExternalModuleName(moduleReferenceExpression.parent, moduleReferenceExpression);
    if (!moduleSymbol || moduleSymbol.isShorthandAmbientModule()) return true;
    const hasExportAssignment = hasExportAssignmentSymbol(moduleSymbol);
    moduleSymbol = resolveExternalModuleSymbol(moduleSymbol);
    const symbolLinks = moduleSymbol.links;
    if (symbolLinks.exportsSomeValue === undefined)
      symbolLinks.exportsSomeValue = hasExportAssignment ? !!(moduleSymbol.flags & qt.SymbolFlags.Value) : forEachEntry(qf.get.exportsOfModule(moduleSymbol), isValue);
    return symbolLinks.exportsSomeValue!;
    function isValue(s: qt.Symbol): boolean {
      s = s.resolveSymbol();
      return s && !!(s.flags & qt.SymbolFlags.Value);
    }
  }
  function canHaveConstantValue(node: Node): node is qt.EnumMember | qt.AccessExpression {
    switch (node.kind) {
      case Syntax.EnumMember:
      case Syntax.PropertyAccessExpression:
      case Syntax.ElemAccessExpression:
        return true;
    }
    return false;
  }
  function literalTypeToNode(type: qt.FreshableType, enclosing: Node, tracker: qt.SymbolTracker): qt.Expression {
    const enumResult =
      type.flags & qt.TypeFlags.EnumLiteral
        ? nodeBuilder.symbolToExpression(type.symbol, qt.SymbolFlags.Value, enclosing, undefined, tracker)
        : type === trueType
        ? new qc.BooleanLiteral(true)
        : type === falseType && new qc.BooleanLiteral(false);
    return enumResult || qc.asLiteral((type as qt.LiteralType).value);
  }
  function initializeTypeChecker() {
    for (const file of host.getSourceFiles()) {
      bindSourceFile(file, compilerOpts);
    }
    amalgamatedDuplicates = new qu.QMap();
    let augmentations: (readonly (StringLiteral | qt.Identifier)[])[] | undefined;
    for (const file of host.getSourceFiles()) {
      if (file.redirectInfo) continue;
      if (!is.externalOrCommonJsModule(file)) {
        const fileGlobalThisSymbol = file.locals!.get('globalThis' as qu.__String);
        if (fileGlobalThisSymbol) {
          for (const declaration of fileGlobalThisSymbol.declarations) {
            diagnostics.add(qf.create.diagForNode(declaration, qd.msgs.Declaration_name_conflicts_with_built_in_global_identifier_0, 'globalThis'));
          }
        }
        globals.merge(file.locals!);
      }
      if (file.jsGlobalAugmentations) globals.merge(file.jsGlobalAugmentations);
      if (file.patternAmbientModules && file.patternAmbientModules.length) patternAmbientModules = concatenate(patternAmbientModules, file.patternAmbientModules);
      if (file.moduleAugmentations.length) (augmentations || (augmentations = [])).push(file.moduleAugmentations);
      if (file.symbol && file.symbol.globalExports) {
        const source = file.symbol.globalExports;
        source.forEach((sourceSymbol, id) => {
          if (!globals.has(id)) globals.set(id, sourceSymbol);
        });
      }
    }
    if (augmentations) {
      for (const list of augmentations) {
        for (const augmentation of list) {
          if (!qf.is.globalScopeAugmentation(augmentation.parent as qt.ModuleDeclaration)) continue;
          mergeModuleAugmentation(augmentation);
        }
      }
    }
    globals.add(builtinGlobals, qd.msgs.Declaration_name_conflicts_with_built_in_global_identifier_0);
    undefinedSymbol.links.type = undefinedWideningType;
    argsSymbol.links.type = getGlobalType('IArgs' as qu.__String, 0, true);
    unknownSymbol.links.type = errorType;
    globalThisSymbol.links.type = createObjectType(ObjectFlags.Anonymous, globalThisSymbol);
    globalArrayType = getGlobalType('Array' as qu.__String, 1, true);
    globalObjectType = getGlobalType('Object' as qu.__String, 0, true);
    globalFunctionType = getGlobalType('Function' as qu.__String, 0, true);
    globalCallableFunctionType = (strictBindCallApply && getGlobalType('CallableFunction' as qu.__String, 0, true)) || globalFunctionType;
    globalNewableFunctionType = (strictBindCallApply && getGlobalType('NewableFunction' as qu.__String, 0, true)) || globalFunctionType;
    globalStringType = getGlobalType('String' as qu.__String, 0, true);
    globalNumberType = getGlobalType('Number' as qu.__String, 0, true);
    globalBooleanType = getGlobalType('Boolean' as qu.__String, 0, true);
    globalRegExpType = getGlobalType('RegExp' as qu.__String, 0, true);
    anyArrayType = createArrayType(anyType);
    autoArrayType = createArrayType(autoType);
    if (autoArrayType === emptyObjectType) autoArrayType = qf.create.anonymousType(undefined, emptySymbols, qu.empty, qu.empty, undefined, undefined);
    globalReadonlyArrayType = <qt.GenericType>getGlobalTypeOrUndefined('ReadonlyArray' as qu.__String, 1) || globalArrayType;
    anyReadonlyArrayType = globalReadonlyArrayType ? createTypeFromGenericGlobalType(globalReadonlyArrayType, [anyType]) : anyArrayType;
    globalThisType = <qt.GenericType>getGlobalTypeOrUndefined('ThisType' as qu.__String, 1);
    if (augmentations) {
      for (const list of augmentations) {
        for (const augmentation of list) {
          if (qf.is.globalScopeAugmentation(augmentation.parent as qt.ModuleDeclaration)) continue;
          mergeModuleAugmentation(augmentation);
        }
      }
    }
    amalgamatedDuplicates.forEach(({ firstFile, secondFile, conflictingSymbols }) => {
      if (conflictingSymbols.size < 8) {
        conflictingSymbols.forEach(({ isBlockScoped, firstFileLocations, secondFileLocations }, symbolName) => {
          const message = isBlockScoped ? qd.msgs.Cannot_redeclare_block_scoped_variable_0 : qd.msgs.Duplicate_identifier_0;
          for (const node of firstFileLocations) {
            addDuplicateDeclarationError(node, message, symbolName, secondFileLocations);
          }
          for (const node of secondFileLocations) {
            addDuplicateDeclarationError(node, message, symbolName, firstFileLocations);
          }
        });
      } else {
        const list = arrayFrom(conflictingSymbols.keys()).join(', ');
        diagnostics.add(
          addRelatedInfo(
            qf.create.diagForNode(firstFile, qd.msgs.Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0, list),
            qf.create.diagForNode(secondFile, qd.msgs.Conflicts_are_in_this_file)
          )
        );
        diagnostics.add(
          addRelatedInfo(
            qf.create.diagForNode(secondFile, qd.msgs.Definitions_of_the_following_identifiers_conflict_with_those_in_another_file_Colon_0, list),
            qf.create.diagForNode(firstFile, qd.msgs.Conflicts_are_in_this_file)
          )
        );
      }
    });
    amalgamatedDuplicates = undefined;
  }
  function reportObviousModifierErrors(node: Node): boolean | undefined {
    return !node.modifiers ? false : shouldReportBadModifier(node) ? grammarErrorOnFirstToken(node, qd.msgs.Modifiers_cannot_appear_here) : undefined;
  }
  function shouldReportBadModifier(node: Node): boolean {
    switch (node.kind) {
      case Syntax.GetAccessor:
      case Syntax.SetAccessor:
      case Syntax.Constructor:
      case Syntax.PropertyDeclaration:
      case Syntax.PropertySignature:
      case Syntax.MethodDeclaration:
      case Syntax.MethodSignature:
      case Syntax.IndexSignature:
      case Syntax.ModuleDeclaration:
      case Syntax.ImportDeclaration:
      case Syntax.ImportEqualsDeclaration:
      case Syntax.ExportDeclaration:
      case Syntax.ExportAssignment:
      case Syntax.FunctionExpression:
      case Syntax.ArrowFunction:
      case Syntax.Param:
        return false;
      default:
        if (node.parent.kind === Syntax.ModuleBlock || node.parent.kind === Syntax.SourceFile) return false;
        switch (node.kind) {
          case Syntax.FunctionDeclaration:
            return nodeHasAnyModifiersExcept(node, Syntax.AsyncKeyword);
          case Syntax.ClassDeclaration:
            return nodeHasAnyModifiersExcept(node, Syntax.AbstractKeyword);
          case Syntax.InterfaceDeclaration:
          case Syntax.VariableStatement:
          case Syntax.TypeAliasDeclaration:
            return true;
          case Syntax.EnumDeclaration:
            return nodeHasAnyModifiersExcept(node, Syntax.ConstKeyword);
          default:
            qu.fail();
            return false;
        }
    }
  }
  function nodeHasAnyModifiersExcept(node: Node, allowedModifier: Syntax): boolean {
    return node.modifiers!.length > 1 || node.modifiers![0].kind !== allowedModifier;
  }
  function doesAccessorHaveCorrectParamCount(accessor: qt.AccessorDeclaration) {
    return qf.get.accessorThisNodeKind(ParamDeclaration, accessor) || accessor.params.length === (accessor.kind === Syntax.GetAccessor ? 0 : 1);
  }
  function allowLetAndConstDeclarations(parent: Node): boolean {
    switch (parent.kind) {
      case Syntax.IfStatement:
      case Syntax.DoStatement:
      case Syntax.WhileStatement:
      case Syntax.WithStatement:
      case Syntax.ForStatement:
      case Syntax.ForInStatement:
      case Syntax.ForOfStatement:
        return false;
      case Syntax.LabeledStatement:
        return allowLetAndConstDeclarations(parent.parent);
    }
    return true;
  }
  function grammarErrorOnFirstToken(node: Node, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const f = node.sourceFile;
    if (!hasParseDiagnostics(f)) {
      const s = f.spanOfTokenAtPos(node.pos);
      diagnostics.add(qf.create.fileDiag(f, s.start, s.length, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function grammarErrorAtPos(nodeForSourceFile: Node, start: number, length: number, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const sourceFile = nodeForSourceFile.sourceFile;
    if (!hasParseDiagnostics(sourceFile)) {
      diagnostics.add(qf.create.fileDiag(sourceFile, start, length, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function grammarErrorOnNode(node: Node, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const sourceFile = node.sourceFile;
    if (!hasParseDiagnostics(sourceFile)) {
      diagnostics.add(qf.create.diagForNode(node, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function grammarErrorAfterFirstToken(node: Node, message: qd.Message, arg0?: any, arg1?: any, arg2?: any): boolean {
    const f = node.sourceFile;
    if (!hasParseDiagnostics(f)) {
      const s = f.spanOfTokenAtPos(node.pos);
      diagnostics.add(qf.create.fileDiag(f, textSpanEnd(s), 0, message, arg0, arg1, arg2));
      return true;
    }
    return false;
  }
  function filterPrimitivesIfContainsNonPrimitive(type: qt.UnionType) {
    if (maybeTypeOfKind(type, qt.TypeFlags.NonPrimitive)) {
      const result = filterType(type, (t) => !(t.flags & qt.TypeFlags.Primitive));
      if (!(result.flags & qt.TypeFlags.Never)) return result;
    }
    return type;
  }
}
namespace JsxNames {
  export const JSX = 'JSX' as qu.__String;
  export const IntrinsicElems = 'IntrinsicElems' as qu.__String;
  export const ElemClass = 'ElemClass' as qu.__String;
  export const ElemAttributesPropertyNameContainer = 'ElemAttributesProperty' as qu.__String;
  export const ElemChildrenAttributeNameContainer = 'ElemChildrenAttribute' as qu.__String;
  export const Elem = 'Elem' as qu.__String;
  export const IntrinsicAttributes = 'IntrinsicAttributes' as qu.__String;
  export const IntrinsicClassAttributes = 'IntrinsicClassAttributes' as qu.__String;
  export const LibraryManagedAttributes = 'LibraryManagedAttributes' as qu.__String;
}
function getIterationTypesKeyFromIterationTypeKind(typeKind: IterationTypeKind) {
  switch (typeKind) {
    case IterationTypeKind.Yield:
      return 'yieldType';
    case IterationTypeKind.Return:
      return 'returnType';
    case IterationTypeKind.Next:
      return 'nextType';
  }
}

/*
export interface TypeCheckerOld {
  qf.get.typeOfSymbolAtLocation(symbol: qt.Symbol, node: Node): qt.Type;
  getDeclaredTypeOfSymbol(symbol: qt.Symbol): qt.Type;
  getPrivateIdentifierPropertyOfType(leftType: qt.Type, name: string, location: Node): qt.Symbol | undefined;
  qf.get.typeOfPropertyOfType(type: qt.Type, propertyName: string): qt.Type | undefined;
  qf.get.indexInfoOfType(type: qt.Type, kind: qt.IndexKind): qt.IndexInfo | undefined;
  getBaseTypeOfLiteralType(type: qt.Type): qt.Type;
  qf.get.widenedType(type: qt.Type): qt.Type;
  getPromisedTypeOfPromise(promise: qt.Type, errorNode?: Node): qt.Type | undefined;
  getAwaitedType(type: qt.Type): qt.Type | undefined;
  getParamType(signature: qt.Signature, paramIndex: number): qt.Type;
  getNullableType(type: qt.Type, flags: qt.TypeFlags): qt.Type;
  typeToTypeNode(type: qt.Type, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): qt.Typing | undefined;
  typeToTypeNode(type: qt.Type, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined, tracker?: qt.SymbolTracker): qt.Typing | undefined;
  signatureToSignatureDeclaration(
    signature: qt.Signature,
    kind: Syntax,
    enclosingDeclaration: Node | undefined,
    flags: qt.NodeBuilderFlags | undefined
  ): (SignatureDeclaration & { typeArgs?: Nodes<qt.Typing> }) | undefined;
  signatureToSignatureDeclaration(
    signature: qt.Signature,
    kind: Syntax,
    enclosingDeclaration: Node | undefined,
    flags: qt.NodeBuilderFlags | undefined,
    tracker?: qt.SymbolTracker
  ): (SignatureDeclaration & { typeArgs?: Nodes<qt.Typing> }) | undefined;
  indexInfoToIndexSignatureDeclaration(indexInfo: qt.IndexInfo, kind: qt.IndexKind, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): qt.IndexSignatureDeclaration | undefined;
  indexInfoToIndexSignatureDeclaration(
    indexInfo: qt.IndexInfo,
    kind: qt.IndexKind,
    enclosingDeclaration: Node | undefined,
    flags: qt.NodeBuilderFlags | undefined,
    tracker?: qt.SymbolTracker
  ): qt.IndexSignatureDeclaration | undefined;
  symbolToEntityName(symbol: qt.Symbol, meaning: qt.SymbolFlags, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): qt.EntityName | undefined;
  symbolToExpression(symbol: qt.Symbol, meaning: qt.SymbolFlags, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): qt.Expression | undefined;
  symbolToTypeParamDeclarations(symbol: qt.Symbol, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): Nodes<qt.TypeParamDeclaration> | undefined;
  symbolToParamDeclaration(symbol: qt.Symbol, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): qt.ParamDeclaration | undefined;
  typeParamToDeclaration(param: qt.TypeParam, enclosingDeclaration: Node | undefined, flags: qt.NodeBuilderFlags | undefined): qt.TypeParamDeclaration | undefined;
  getSymbolsInScope(location: Node, meaning: qt.SymbolFlags): qt.Symbol[];
  getSymbolAtLocation(node: Node): qt.Symbol | undefined;
  getSymbolsOfParamPropertyDeclaration(param: qt.ParamDeclaration, paramName: string): qt.Symbol[];
  getShorthandAssignmentValueSymbol(location: Node): qt.Symbol | undefined;
  getExportSpecifierLocalTargetSymbol(location: qt.ExportSpecifier): qt.Symbol | undefined;
  getExportSymbolOfSymbol(symbol: qt.Symbol): qt.Symbol;
  getPropertySymbolOfDestructuringAssignment(location: qt.Identifier): qt.Symbol | undefined;
  getTypeOfAssignmentPattern(pattern: qt.AssignmentPattern): qt.Type;
  qf.get.typeFromTypeNode(node: qt.Typing): qt.Type;
  signatureToString(signature: qt.Signature, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags, kind?: qt.SignatureKind): string;
  typeToString(type: qt.Type, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags): string;
  symbolToString(s: qt.Symbol, decl?: Node, meaning?: qt.SymbolFlags, flags?: qt.SymbolFormatFlags): string;
  typePredicateToString(predicate: qt.TypePredicate, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags): string;
  writeSignature(signature: qt.Signature, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags, kind?: qt.SignatureKind, writer?: qt.EmitTextWriter): string;
  writeType(type: qt.Type, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags, writer?: qt.EmitTextWriter): string;
  writeSymbol(symbol: qt.Symbol, enclosingDeclaration?: Node, meaning?: qt.SymbolFlags, flags?: qt.SymbolFormatFlags, writer?: qt.EmitTextWriter): string;
  writeTypePredicate(predicate: qt.TypePredicate, enclosingDeclaration?: Node, flags?: qt.TypeFormatFlags, writer?: qt.EmitTextWriter): string;
  qf.get.fullyQualifiedName(symbol: qt.Symbol): string;
  getRootSymbols(symbol: qt.Symbol): readonly qt.Symbol[];
  getContextualType(node: qt.Expression): qt.Type | undefined;
  getContextualType(node: qt.Expression, contextFlags?: qt.ContextFlags): qt.Type | undefined;
  getContextualTypeForObjectLiteralElem(elem: qt.ObjectLiteralElemLike): qt.Type | undefined;
  getContextualTypeForArgAtIndex(call: qt.CallLikeExpression, argIndex: number): qt.Type | undefined;
  getContextualTypeForJsxAttribute(attribute: qt.JsxAttribute | qt.JsxSpreadAttribute): qt.Type | undefined;
  qf.is.contextSensitive(node: qt.Expression | qt.MethodDeclaration | qt.ObjectLiteralElemLike | qt.JsxAttributeLike): boolean;
  getResolvedSignature(node: qt.CallLikeExpression, candidatesOutArray?: qt.Signature[], argCount?: number): qt.Signature | undefined;
  getResolvedSignatureForSignatureHelp(node: qt.CallLikeExpression, candidatesOutArray?: qt.Signature[], argCount?: number): qt.Signature | undefined;
  getExpandedParams(sig: qt.Signature): readonly (readonly qt.Symbol[])[];
  hasEffectiveRestParam(sig: qt.Signature): boolean;
  qf.get.signatureFromDeclaration(declaration: qt.SignatureDeclaration): qt.Signature | undefined;
  isImplementationOfOverload(node: qt.SignatureDeclaration): boolean | undefined;
  isUndefinedSymbol(symbol: qt.Symbol): boolean;
  isArgsSymbol(symbol: qt.Symbol): boolean;
  isUnknownSymbol(symbol: qt.Symbol): boolean;
  qf.get.mergedSymbol(symbol: qt.Symbol): qt.Symbol;
  getConstantValue(node: qt.EnumMember | qt.PropertyAccessExpression | qt.ElemAccessExpression): string | number | undefined;
  isValidPropertyAccess(node: qt.PropertyAccessExpression | qt.QualifiedName | qt.ImportTyping, propertyName: string): boolean;
  isValidPropertyAccessForCompletions(node: qt.PropertyAccessExpression | qt.ImportTyping | qt.QualifiedName, type: qt.Type, property: qt.Symbol): boolean;
  getImmediateAliasedSymbol(symbol: qt.Symbol): qt.Symbol | undefined;
  qf.get.exportsOfModule(moduleSymbol: qt.Symbol): qt.Symbol[];
  getExportsAndPropertiesOfModule(moduleSymbol: qt.Symbol): qt.Symbol[];
  getJsxIntrinsicTagNamesAt(location: Node): qt.Symbol[];
  isOptionalParam(node: qt.ParamDeclaration): boolean;
  getAmbientModules(): qt.Symbol[];
  tryGetMemberInModuleExports(memberName: string, moduleSymbol: qt.Symbol): qt.Symbol | undefined;
  tryGetMemberInModuleExportsAndProperties(memberName: string, moduleSymbol: qt.Symbol): qt.Symbol | undefined;
  getApparentType(type: qt.Type): qt.Type;
  getSuggestedSymbolForNonexistentProperty(name: qt.Identifier | qt.PrivateIdentifier | string, containingType: qt.Type): qt.Symbol | undefined;
  getSuggestionForNonexistentProperty(name: qt.Identifier | qt.PrivateIdentifier | string, containingType: qt.Type): string | undefined;
  getSuggestedSymbolForNonexistentSymbol(location: Node, name: string, meaning: qt.SymbolFlags): qt.Symbol | undefined;
  getSuggestionForNonexistentSymbol(location: Node, name: string, meaning: qt.SymbolFlags): string | undefined;
  qf.get.suggestedSymbolForNonexistentModule(node: qt.Identifier, target: qt.Symbol): qt.Symbol | undefined;
  getSuggestionForNonexistentExport(node: qt.Identifier, target: qt.Symbol): string | undefined;
  getAnyType(): qt.Type;
  getStringType(): qt.Type;
  getNumberType(): qt.Type;
  getBooleanType(): qt.Type;
  getFalseType(fresh?: boolean): qt.Type;
  getTrueType(fresh?: boolean): qt.Type;
  getVoidType(): qt.Type;
  getUndefinedType(): qt.Type;
  getNullType(): qt.Type;
  getESSymbolType(): qt.Type;
  qf.get.unionType(types: qt.Type[], subtypeReduction?: qt.UnionReduction): qt.Type;
  createArrayType(elemType: qt.Type): qt.Type;
  getElemTypeOfArrayType(arrayType: qt.Type): qt.Type | undefined;
  createPromiseType(type: qt.Type): qt.Type;
  qf.is.typeAssignableTo(source: qt.Type, target: qt.Type): boolean;
  qf.create.anonymousType(
    symbol: qt.Symbol | undefined,
    members: qt.SymbolTable,
    callSignatures: qt.Signature[],
    constructSignatures: qt.Signature[],
    stringIndexInfo: qt.IndexInfo | undefined,
    numberIndexInfo: qt.IndexInfo | undefined
  ): qt.Type;
  qf.create.signature(
    declaration: qt.SignatureDeclaration,
    typeParams: qt.TypeParam[] | undefined,
    thisParam: qt.Symbol | undefined,
    params: qt.Symbol[],
    resolvedReturn: qt.Type,
    typePredicate: qt.TypePredicate | undefined,
    minArgCount: number,
    flags: qt.SignatureFlags
  ): qt.Signature;
  qf.create.indexInfo(type: qt.Type, isReadonly: boolean, declaration?: qt.SignatureDeclaration): qt.IndexInfo;
  tryFindAmbientModuleWithoutAugmentations(moduleName: string): qt.Symbol | undefined;
  getSymbolWalker(accept?: (symbol: qt.Symbol) => boolean): qt.SymbolWalker;
  getDiagnostics(sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): qd.Diagnostic[];
  getGlobalDiagnostics(): qd.Diagnostic[];
  getEmitResolver(sourceFile?: qt.SourceFile, cancellationToken?: qt.CancellationToken): qt.EmitResolver;
  getRelationCacheSizes(): { assignable: number; identity: number; subtype: number; strictSubtype: number };
  qf.is.arrayType(type: qt.Type): boolean;
  qf.is.tupleType(type: qt.Type): boolean;
  qf.is.arrayLikeType(type: qt.Type): boolean;
  isTypeInvalidDueToUnionDiscriminant(contextualType: qt.Type, obj: qt.ObjectLiteralExpression | qt.JsxAttributes): boolean;
  getAllPossiblePropertiesOfTypes(type: readonly qt.Type[]): qt.Symbol[];
  resolveName(name: string, location: Node | undefined, meaning: qt.SymbolFlags, excludeGlobals: boolean): qt.Symbol | undefined;
  getJsxNamespace(location?: Node): string;
  qf.get.accessibleSymbolChain(symbol: qt.Symbol, enclosingDeclaration: Node | undefined, meaning: qt.SymbolFlags, useOnlyExternalAliasing: boolean): qt.Symbol[] | undefined;
  getTypePredicateOfSignature(signature: qt.Signature): qt.TypePredicate | undefined;
  resolveExternalModuleName(moduleSpecifier: qt.Expression): qt.Symbol | undefined;
  resolveExternalModuleSymbol(symbol: qt.Symbol): qt.Symbol;
  tryGetThisTypeAt(node: Node, includeGlobalThis?: boolean): qt.Type | undefined;
  getTypeArgConstraint(node: qt.Typing): qt.Type | undefined;
  getSuggestionDiagnostics(file: qt.SourceFile, cancellationToken?: qt.CancellationToken): readonly qd.DiagnosticWithLocation[];
  runWithCancellationToken<T>(token: qt.CancellationToken, cb: (checker: qt.TypeChecker) => T): T;
  getLocalTypeParamsOfClassOrInterfaceOrTypeAlias(symbol: qt.Symbol): readonly qt.TypeParam[] | undefined;
  qf.is.declarationVisible(node: qt.Declaration | qt.AnyImportSyntax): boolean;
}
*/